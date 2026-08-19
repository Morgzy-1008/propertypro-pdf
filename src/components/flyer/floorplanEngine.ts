import { loadImage, cropToContent, blobToBase64 } from "./fileToImage";

/** Trimmed floorplans, keyed by their published URL. */
export const floorplanCache = new Map<string, string>();
const FLOORPLAN_PIPELINE_VERSION = "original-dimensions-v1";

export async function prepareFloorplan(plan: import("./floorplans.data").FloorplanRecord | string): Promise<string | null> {
  const url = typeof plan === "string" ? plan : plan.url;
  if (!url || url.startsWith("data:")) return url;

  if (typeof plan !== "string" && plan.cropBoxes && plan.cropBoxes.length > 0) {
    const cacheKey = `${plan.label}::pdf_crop_v4_vector_crisp`;
    const cached = floorplanCache.get(cacheKey);
    if (cached) return cached;
    try {
      const dataUrl = await cropPdfFloorplan(plan);
      if (dataUrl) floorplanCache.set(cacheKey, dataUrl);
      return dataUrl || url;
    } catch (e) {
      console.error("PDF crop failed, falling back to image", e);
    }
  }

  // Local pre-processed high-quality floorplans don't need fetching/cropping/sharpening
  if (url.startsWith("/floorplans/")) {
    return url;
  }

  const cacheKey = `${url}::${FLOORPLAN_PIPELINE_VERSION}`;
  const cached = floorplanCache.get(cacheKey);
  if (cached) return cached;

  try {
    let b64 = "";
    // 1. Try direct fetch
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        b64 = await blobToBase64(blob);
      }
    } catch {
      /* try CORS proxy */
    }

    // 2. Try CORS proxy if direct fetch failed
    if (!b64 || !b64.startsWith("data:image/")) {
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      ];
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const blob = await res.blob();
            b64 = await blobToBase64(blob);
            if (b64.startsWith("data:image/")) break;
          }
        } catch {
          /* try next proxy */
        }
      }
    }

    if (b64 && b64.startsWith("data:image/")) {
      const trimmed = await cropToContent(b64, 0.008);
      const enhanced = await enhanceFloorplan(trimmed);
      if (enhanced) floorplanCache.set(cacheKey, enhanced);
      return enhanced;
    }
  } catch (err) {
    console.error("[prepareFloorplan Error]", err);
  }
  return url;
}

export async function cropPdfFloorplan(plan: import("./floorplans.data").FloorplanRecord): Promise<string | null> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const crops = plan.cropBoxes!;
  
  let pdfUrl = plan.pdfUrl;
  if (!pdfUrl) {
    pdfUrl = `/floorplans_pdf/${plan.label.toUpperCase()}.pdf`;
  }
  
  // Fetch as ArrayBuffer for reliability with special characters in filenames
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error("Failed to fetch PDF: " + pdfUrl);
  const pdfData = new Uint8Array(await res.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: pdfData }).promise;
  
  // SCALE 5.0 renders ultra-high resolution vector Bézier curves & text
  const SCALE = 5.0;
  
  const croppedCanvases: HTMLCanvasElement[] = [];
  
  for (const crop of crops) {
    const page = await doc.getPage(crop.page);
    const viewport = page.getViewport({ scale: SCALE });
    
    // Render the page to a temporary canvas
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = viewport.width;
    pageCanvas.height = viewport.height;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    let cropCanvas: HTMLCanvasElement;
    
    if (crop.points && crop.points.length >= 3) {
      // ─── Polygon crop ───
      const pts = crop.points.map(p => ({
        px: Math.floor(p.x * viewport.width),
        py: Math.floor(p.y * viewport.height),
      }));
      
      // Compute bounding box of the polygon
      const minX = Math.max(0, Math.min(...pts.map(p => p.px)));
      const minY = Math.max(0, Math.min(...pts.map(p => p.py)));
      const maxX = Math.min(viewport.width, Math.max(...pts.map(p => p.px)));
      const maxY = Math.min(viewport.height, Math.max(...pts.map(p => p.py)));
      const cw = maxX - minX;
      const ch = maxY - minY;
      
      cropCanvas = document.createElement("canvas");
      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.fillStyle = "#ffffff";
      cropCtx.fillRect(0, 0, cw, ch);
      
      // Create clipping path from polygon
      cropCtx.beginPath();
      cropCtx.moveTo(pts[0].px - minX, pts[0].py - minY);
      for (let i = 1; i < pts.length; i++) {
        cropCtx.lineTo(pts[i].px - minX, pts[i].py - minY);
      }
      cropCtx.closePath();
      cropCtx.clip();
      
      // Draw the page region into the clipped area
      cropCtx.drawImage(pageCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
      
    } else if (crop.x != null && crop.y != null && crop.w != null && crop.h != null) {
      // ─── Rectangle crop ───
      const cx = Math.floor(crop.x * viewport.width);
      const cy = Math.floor(crop.y * viewport.height);
      const cw = Math.floor(crop.w * viewport.width);
      const ch = Math.floor(crop.h * viewport.height);
      
      cropCanvas = document.createElement("canvas");
      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.fillStyle = "#ffffff";
      cropCtx.fillRect(0, 0, cw, ch);
      cropCtx.drawImage(pageCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    } else {
      continue; // skip invalid crop
    }
    
    // 1. PRE-ENHANCEMENT: Enhance each floor's individual canvas before resizing/combining
    const preEnhancedData = await enhanceFloorplan(cropCanvas.toDataURL("image/png"));
    const preImg = await loadImage(preEnhancedData);
    const cleanCropCanvas = document.createElement("canvas");
    cleanCropCanvas.width = preImg.naturalWidth;
    cleanCropCanvas.height = preImg.naturalHeight;
    const cleanCtx = cleanCropCanvas.getContext("2d")!;
    cleanCtx.drawImage(preImg, 0, 0);

    croppedCanvases.push(cleanCropCanvas);
  }
  
  if (croppedCanvases.length === 0) return null;

  let rawDataUrl: string;
  if (croppedCanvases.length === 1) {
    rawDataUrl = croppedCanvases[0].toDataURL("image/png");
  } else {
    // 2. RESIZING & LAYOUT: Place storeys horizontally side-by-side to scale
    // Both floors are rendered at the exact same physical scale (1:1), preserving real proportions without distortion
    const minWidth = Math.min(...croppedCanvases.map(c => c.width));
    const gap = Math.max(40, Math.round(minWidth * 0.05));
    const totalWidth = croppedCanvases.reduce((sum, c) => sum + c.width, 0) + gap * (croppedCanvases.length - 1);
    const maxHeight = Math.max(...croppedCanvases.map(c => c.height));

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = totalWidth;
    finalCanvas.height = maxHeight;
    const fCtx = finalCanvas.getContext("2d")!;
    fCtx.fillStyle = "#ffffff";
    fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    let currentX = 0;
    for (const c of croppedCanvases) {
      const dy = Math.floor((maxHeight - c.height) / 2);
      fCtx.drawImage(c, currentX, dy);
      currentX += c.width + gap;
    }
    rawDataUrl = finalCanvas.toDataURL("image/png");
  }

  // 3. POST-ENHANCEMENT: Final enhancement pass after layout to guarantee ultra-crisp lines and readable text
  const postEnhanced = await enhanceFloorplan(rawDataUrl);
  return postEnhanced || rawDataUrl;
}

/**
 * Enhanced floorplan processing:
 * Purely photometric level calibration and smooth anti-aliasing curve.
 * Pushes scanner/paper background to pure white while deepening black architectural lines
 * and preserving sub-pixel font anti-aliasing so thin lines and text never become pixelated or jagged.
 */
export async function enhanceFloorplan(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Smoothstep levels:
    // Background noise (lum >= 244) -> pure white (255)
    // Dark ink (lum <= 38) -> rich black (0)
    // Intermediate anti-aliasing curves smoothly preserved via sigmoidal interpolation
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum >= 244) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      } else if (lum <= 38) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      } else {
        const norm = (lum - 38) / (244 - 38);
        const smooth = norm * norm * (3 - 2 * norm);
        const val = Math.round(smooth * 255);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export async function sharpenPlan(dataUrl: string): Promise<string | null> {
  return enhanceFloorplan(dataUrl);
}

export async function fixGarageDimensions(dataUrl: string): Promise<string | null> {
  return dataUrl;
}
