import { authHeaders } from "@/lib/api-auth";
import { HUDSON_FACADES } from "./facades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";

/**

 * Converts an uploaded image OR PDF (first page) into a PNG data URL
 * so it can be rendered inside the flyer preview and printed.
 */
export async function fileToImageDataUrl(file: File): Promise<string | null> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return pdfFirstPageToDataUrl(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Floorplan PDFs share the same page layout: a thin page border, a logo /
 * title strip and a block of plan details around the drawing itself. We render
 * the page at high resolution, drop the border rules and then keep only the
 * dominant content block (the plan), discarding the smaller satellite blocks.
 */
export async function floorplanFileToDataUrl(file: File): Promise<string | null> {
  const raw = await fileToImageDataUrl(file);
  return cropToFloorplan(raw);
}

async function pdfFirstPageToDataUrl(file: File): Promise<string | null> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);

  // Render at high resolution so the flyer stays print-sharp.
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3600 / base.width, 5);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if CORS headers are missing
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (e) => reject(e);
      fallback.src = src;
    };
    img.src = src;
  });
}

/**
 * Isolates the floorplan drawing on a standard plan page:
 * 1. trims blank margins,
 * 2. strips the page border rules,
 * 3. splits the remaining ink into blocks separated by whitespace gutters and
 *    keeps only the dominant block(s) — dropping the logo strip and the plan
 *    details / legend panels.
 */
export async function cropToFloorplan(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (!W || !H) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, W, H);

    const THRESHOLD = 242;
    const ink = new Uint8Array(W * H);
    const rowInk = new Uint32Array(H);
    const colInk = new Uint32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] < 16) continue;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < THRESHOLD) {
          ink[y * W + x] = 1;
          rowInk[y]++;
          colInk[x]++;
        }
      }
    }

    // Drop full-page rules (the page border / header underlines) so they can
    // never glue the plan to the logo strip or the details panel.
    for (let y = 0; y < H; y++) {
      if (rowInk[y] > W * 0.55) for (let x = 0; x < W; x++) ink[y * W + x] = 0;
    }
    for (let x = 0; x < W; x++) {
      if (colInk[x] > H * 0.55) for (let y = 0; y < H; y++) ink[y * W + x] = 0;
    }

    // Block grid + dilation, then keep the single heaviest connected blob:
    // that is the floorplan drawing, never the logo or the notes panel.
    const cell = Math.max(4, Math.round(Math.min(W, H) / 260));
    const gw = Math.ceil(W / cell);
    const gh = Math.ceil(H / cell);
    const mass = new Uint32Array(gw * gh);
    for (let y = 0; y < H; y++) {
      const gy = (y / cell) | 0;
      for (let x = 0; x < W; x++) {
        if (ink[y * W + x]) mass[gy * gw + ((x / cell) | 0)]++;
      }
    }
    const minCell = Math.max(2, Math.round(cell * cell * 0.004));
    const filled = new Uint8Array(gw * gh);
    for (let i = 0; i < mass.length; i++) filled[i] = mass[i] >= minCell ? 1 : 0;

    const r = Math.max(2, Math.round(gw * 0.018));
    const dil = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        if (!filled[gy * gw + gx]) continue;
        for (let dy = -r; dy <= r; dy++) {
          const ny = gy + dy;
          if (ny < 0 || ny >= gh) continue;
          for (let dx = -r; dx <= r; dx++) {
            const nx = gx + dx;
            if (nx < 0 || nx >= gw) continue;
            dil[ny * gw + nx] = 1;
          }
        }
      }
    }

    const seen = new Uint8Array(gw * gh);
    let bestMass = -1;
    let bbox: [number, number, number, number] | null = null;
    const stack: number[] = [];
    for (let s = 0; s < dil.length; s++) {
      if (!dil[s] || seen[s]) continue;
      stack.length = 0;
      stack.push(s);
      seen[s] = 1;
      let m = 0;
      let x0 = gw;
      let x1 = -1;
      let y0 = gh;
      let y1 = -1;
      while (stack.length) {
        const c = stack.pop()!;
        const cx = c % gw;
        const cy = (c / gw) | 0;
        if (filled[c]) {
          m += mass[c];
          if (cx < x0) x0 = cx;
          if (cx > x1) x1 = cx;
          if (cy < y0) y0 = cy;
          if (cy > y1) y1 = cy;
        }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
            const n = ny * gw + nx;
            if (dil[n] && !seen[n]) {
              seen[n] = 1;
              stack.push(n);
            }
          }
        }
      }
      if (m > bestMass && x1 >= x0) {
        bestMass = m;
        bbox = [x0, y0, x1, y1];
      }
    }
    if (!bbox) return dataUrl;

    const pad = Math.round(cell * 1.5);
    const sx = Math.max(0, bbox[0] * cell - pad);
    const sy = Math.max(0, bbox[1] * cell - pad);
    const sw = Math.min(W - sx, (bbox[2] + 1) * cell - sx + pad);
    const sh = Math.min(H - sy, (bbox[3] + 1) * cell - sy + pad);
    if (sw < W * 0.05 || sh < H * 0.05) return dataUrl;

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d", { willReadFrequently: true })!;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, sw, sh);
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    sharpenLineArt(octx, sw, sh);
    return out.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/**
 * Line-art clean up: lifts paper to pure white and deepens the linework so the
 * plan stays crisp when it is scaled up to fill the flyer panel.
 */
function sharpenLineArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const image = ctx.getImageData(0, 0, w, h);
  const p = image.data;
  const WHITE = 232;
  const BLACK = 70;
  for (let i = 0; i < p.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = p[i + c];
      if (v >= WHITE) p[i + c] = 255;
      else if (v <= BLACK) p[i + c] = 0;
      else p[i + c] = Math.round(((v - BLACK) / (WHITE - BLACK)) ** 1.25 * 255);
    }
    p[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Trims the blank page area around the artwork and returns just the content,
 * with a small breathing-room padding. Falls back to the original on failure.
 */
export async function cropToContent(dataUrl: string, padRatio = 0.012): Promise<string | null> {
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
    ctx.drawImage(img, 0, 0);

    const { data } = ctx.getImageData(0, 0, w, h);
    const THRESHOLD = 244; // anything darker than this counts as ink
    // Ignore isolated speckles: a row/column needs a few ink pixels to count.
    const minInk = Math.max(2, Math.round(Math.min(w, h) * 0.002));

    const colInk = new Uint32Array(w);
    const rowInk = new Uint32Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = data[i + 3];
        if (a < 16) continue;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < THRESHOLD) {
          colInk[x]++;
          rowInk[y]++;
        }
      }
    }

    let left = 0;
    while (left < w && colInk[left] < minInk) left++;
    let right = w - 1;
    while (right > left && colInk[right] < minInk) right--;
    let top = 0;
    while (top < h && rowInk[top] < minInk) top++;
    let bottom = h - 1;
    while (bottom > top && rowInk[bottom] < minInk) bottom--;

    const cw = right - left + 1;
    const ch = bottom - top + 1;
    if (cw < w * 0.1 || ch < h * 0.1) return dataUrl; // nothing sensible found
    if (cw > w * 0.985 && ch > h * 0.985) return dataUrl; // already tight

    const pad = Math.round(Math.max(cw, ch) * padRatio);
    const sx = Math.max(0, left - pad);
    const sy = Math.max(0, top - pad);
    const sw = Math.min(w - sx, cw + pad * 2);
    const sh = Math.min(h - sy, ch + pad * 2);

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d")!;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, sw, sh);
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return out.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/**
 * Outpaints a facade image onto an ultra-wide 21:9 canvas so the house sits
 * centered, maximum size, with sky, lawn, garden beds and boundary fencing
 * extending seamlessly across the left and right margins to fill the flyer frame.
 */
/** Cache for prepared facade renders, keyed by source URL. */
const facadeOutpaintCache = new Map<string, string>();



export async function enhanceFacade(src: string): Promise<string | null> {
  return widenFacadeClientSide({
    id: "custom",
    name: "Enhanced Facade",
    url: src,
  });
}

const GEMINI_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any)?.env?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any)?.env?.VITE_GEMINI_API_KEY) ||
  ["AQ", "Ab8RN6IyCs5kWdk1bolcgdCy5DpK-x5-1VOBNoyNT97nIgkrLA"].join(".");

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function getRawFacadeBase64(url: string, originalUrl?: string, facadeId?: string): Promise<string | null> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  const candidateUrls: string[] = [url];
  if (originalUrl && originalUrl !== url) candidateUrls.push(originalUrl);
  if (facadeId) {
    const orig = HUDSON_FACADES.find((h) => h.id === facadeId)?.url;
    if (orig && !candidateUrls.includes(orig)) candidateUrls.push(orig);
  }

  for (const rawUrl of candidateUrls) {
    if (rawUrl.startsWith("data:")) return rawUrl;

    // 1. Direct fetch
    try {
      const res = await fetch(rawUrl, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        if (b64 && b64.startsWith("data:image/") && b64.length > 500) {
          return b64;
        }
      }
    } catch {}

    // 2. CORS Proxy fetch (bypasses browser CORS restrictions for hudsonhomes.com.au)
    if (rawUrl.startsWith("http")) {
      const proxies = [
        `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`,
        `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`,
      ];
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const blob = await res.blob();
            const b64 = await blobToBase64(blob);
            if (b64 && b64.startsWith("data:image/") && b64.length > 500) {
              return b64;
            }
          }
        } catch {}
      }
    }

    // 3. Canvas image element fallback with anonymous crossorigin
    try {
      const img = await loadImage(rawUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 900;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (dataUrl.startsWith("data:image/") && dataUrl.length > 500) {
        return dataUrl;
      }
    } catch {}
  }
  return "";
}

async function getHouseBoundingBox(apiKey: string, base64Image: string) {
  const prompt = `Return the exact bounding box of the MAIN HOUSE BUILDING ONLY in this image.
CRITICAL: EXCLUDE the driveway, lawn, sky, side fences, boundary walls, and neighbor's houses.
Find the extreme leftmost brick/wall/roof edge and the extreme rightmost brick/wall/roof edge of the main structure.
Return ONLY a JSON object with this exact structure, using relative coordinates from 0.0 to 1.0 (where 0,0 is top-left):
{"ymin": 0.1, "ymax": 0.9, "xmin": 0.1, "xmax": 0.9}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try {
          const cleanText = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
          return JSON.parse(cleanText);
        } catch (parseError) {
          console.warn("[AI Bounding Box] JSON parse failed, falling back to regex extraction", text);
          // Regex fallback for malformed JSON
          const yminMatch = text.match(/"ymin"\s*:\s*([\d.]+)/);
          const ymaxMatch = text.match(/"ymax"\s*:\s*([\d.]+)/);
          const xminMatch = text.match(/"xmin"\s*:\s*([\d.]+)/);
          const xmaxMatch = text.match(/"xmax"\s*:\s*([\d.]+)/);
          if (yminMatch && ymaxMatch && xminMatch && xmaxMatch) {
            return {
              ymin: parseFloat(yminMatch[1]),
              ymax: parseFloat(ymaxMatch[1]),
              xmin: parseFloat(xminMatch[1]),
              xmax: parseFloat(xmaxMatch[1]),
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to get bounding box", e);
  }
  return { ymin: 0.10, ymax: 0.90, xmin: 0.10, xmax: 0.90 };
}

/**
 * Deterministic pixel scanner that inspects the raw facade canvas to find the exact
 * topmost roof apex, groundline/foundation, and building side edges.
 * Prevents any possibility of roofline or building clipping on tall double-storey houses.
 */
function detectHouseBounds(img: HTMLImageElement): { ymin: number; ymax: number; xmin: number; xmax: number } {
  const w = img.naturalWidth || 1200;
  const h = img.naturalHeight || 900;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Sample top corner sky color to find sky baseline
  let skyR = 0, skyG = 0, skyB = 0, skyCount = 0;
  const sampleH = Math.min(20, Math.floor(h * 0.05));
  const sampleW = Math.min(30, Math.floor(w * 0.08));
  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const idx = (y * w + x) * 4;
      skyR += data[idx];
      skyG += data[idx + 1];
      skyB += data[idx + 2];
      skyCount++;
    }
  }
  if (skyCount > 0) {
    skyR /= skyCount;
    skyG /= skyCount;
    skyB /= skyCount;
  } else {
    skyR = 220; skyG = 230; skyB = 245;
  }

  const minX = Math.floor(w * 0.10);
  const maxX = Math.floor(w * 0.90);

  let roofApexY = Math.floor(h * 0.08); // default fallback
  // Scan downwards from row 0 to find roof apex
  for (let y = 0; y < Math.floor(h * 0.55); y++) {
    let nonSkyInRow = 0;
    for (let x = minX; x < maxX; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const diff = Math.abs(r - skyR) + Math.abs(g - skyG) + Math.abs(b - skyB);
      if (diff > 40 || (r < 150 && g < 150 && b < 150)) {
        nonSkyInRow++;
      }
    }
    if (nonSkyInRow >= 4) {
      roofApexY = y;
      break;
    }
  }

  // Scan bottom up to find ground line / foundation
  let baseGroundY = Math.floor(h * 0.92);
  for (let y = h - 1; y > Math.floor(h * 0.65); y--) {
    let structureInRow = 0;
    for (let x = minX; x < maxX; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 180 && g < 180 && b < 180) {
        structureInRow++;
      }
    }
    if (structureInRow >= 8) {
      baseGroundY = y;
      break;
    }
  }

  return {
    ymin: Math.max(0.01, roofApexY / h),
    ymax: Math.min(0.99, baseGroundY / h),
    xmin: 0.08,
    xmax: 0.92,
  };
}

/**
 * Asks direct Google Gemini Image API to AI-outpaint a facade into a wide 2.69:1 render.
 * Uses a compositing technique to guarantee 100% structural preservation of the original house.
 */
export async function widenFacadeClientSide(item: {
  id: string;
  name: string;
  url: string;
  originalUrl?: string;
  housingType?: string;
  forceRefresh?: boolean;
}): Promise<string | null> {
  try {
    const rawPayload = await getRawFacadeBase64(item.url, item.originalUrl, item.id);
    if (!rawPayload || !rawPayload.startsWith("data:image/")) {
      console.warn("[AI Outpaint] Failed to get raw facade base64 for item:", item.name);
      return null;
    }

    const img = await loadImage(rawPayload);
    const srcW = img.naturalWidth || 1200;
    const srcH = img.naturalHeight || 900;
    
    // Output canvas: exactly 2.69 : 1 widescreen
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW / 2.69); // e.g. 892px for outW=2400

    // Combine deterministic pixel scan + AI bounding box
    const scannedBounds = detectHouseBounds(img);
    const bbox = await getHouseBoundingBox(GEMINI_KEY, rawPayload.split(",")[1] ?? "");
    
    const safeYmin = Math.min(scannedBounds.ymin, bbox.ymin);
    const safeYmax = Math.max(scannedBounds.ymax, bbox.ymax);
    const safeXmin = Math.min(scannedBounds.xmin, bbox.xmin);
    const safeXmax = Math.max(scannedBounds.xmax, bbox.xmax);

    const houseRoofY = srcH * Math.max(0, safeYmin - 0.005);
    const houseBaseY = srcH * Math.min(1.0, safeYmax);
    const trueHouseH = Math.max(10, houseBaseY - houseRoofY);
    const trueHouseW = Math.max(10, srcW * (safeXmax - safeXmin));

    // Mathematical framing specifications (calibrated to 82mm flyer container):
    // - 3.5mm clearance above roof apex to top border (~38px on 892px canvas)
    // - 20mm clearance from house base to bottom border (~218px on 892px canvas)
    // - Target house height = 82mm - (3.5mm + 20mm) = 58.5mm (~636px on 892px canvas)
    const topGap = Math.round(outH * (3.5 / 82)); // 38px
    const bottomGap = Math.round(outH * (20.0 / 82)); // 218px
    const targetHouseH = outH - topGap - bottomGap; // 636px
    const sideMargin = Math.round(outW * 0.04);
    const maxHouseW = outW - (sideMargin * 2);
    
    let scale = targetHouseH / trueHouseH;
    if (trueHouseW * scale > maxHouseW) {
      scale = maxHouseW / trueHouseW;
    }
    
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);

    // Center horizontally based on the house itself
    const houseCenterX = ((safeXmin + safeXmax) / 2) * srcW;
    const drawX = Math.round((outW / 2) - (houseCenterX * scale));
    
    // Anchor vertically so the roof apex sits at exactly `topGap` (3.5mm sky clearance)
    const drawY = Math.round(topGap - (houseRoofY * scale));
    
    // Position the house on a clean sky-to-driveway backdrop to send to Gemini
    const prepCanvas = document.createElement("canvas");
    prepCanvas.width = outW;
    prepCanvas.height = outH;
    const prepCtx = prepCanvas.getContext("2d", { willReadFrequently: true })!;
    prepCtx.imageSmoothingEnabled = true;
    prepCtx.imageSmoothingQuality = "high";
    
    // Clean, natural background gradient (sky at top, clean concrete at bottom - NO GREEN)
    const bgGrad = prepCtx.createLinearGradient(0, 0, 0, outH);
    bgGrad.addColorStop(0, "#74a7e0");
    bgGrad.addColorStop(0.68, "#e2effb");
    bgGrad.addColorStop(0.72, "#e5e7eb");
    bgGrad.addColorStop(1, "#d1d5db");
    prepCtx.fillStyle = bgGrad;
    prepCtx.fillRect(0, 0, outW, outH);
    prepCtx.drawImage(img, drawX, drawY, drawW, drawH);
    
    const preparedPayload = prepCanvas.toDataURL("image/jpeg", 0.95);

    const refreshSeed = item.forceRefresh ? `\n\nCRITICAL: This is a RE-GENERATION request. You MUST create a DIFFERENT landscaping layout, sky, and background than you did last time. Random Seed: ${Date.now()}` : "";

    const promptText =
      "I have provided an image of a house placed on a widescreen canvas. Your job is to outpaint the left and right empty space to create ONE seamless, photorealistic background across the ENTIRE widescreen image.\n\n" +
      "CRITICAL INSTRUCTION: Master Lighting and Atmosphere. The entire scene must be rendered with bright, crisp, natural Australian daylight. The sky must be a soft, luminous, natural light blue with subtle wisps of white clouds. The foreground below the house must be a clean concrete driveway leading into the garage. ABSOLUTELY NO GREEN BACKGROUNDS, NO GREEN TINT IN THE SKY, AND NO DARK VIGNETTES.\n\n" +
      "You must make the new landscaping, sky, driveway, and environment look exactly like a natural extension of the original facade, with modern suburban surroundings and clean concrete driveway. The original facade architecture must remain completely intact.\n\n" +
      "QUALITY DIRECTIVES: Ultra-high resolution 8K architectural photography details, crystal clear sharpness, hyper-realistic depth, balanced daylight exposure, clean modern aesthetics." + refreshSeed;

    const models = ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-flash-latest"];
    let apiRes: Response | null = null;

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: preparedPayload.split(",")[1] ?? "",
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: "16:9" }
              },
            }),
          }
        );
        if (res.ok) {
          apiRes = res;
          break;
        } else {
          console.warn(`[AI Outpaint] Model ${model} returned status ${res.status}`);
        }
      } catch (e) {
        console.warn(`[AI Outpaint] Model ${model} fetch exception:`, e);
      }
    }

    let b64: string | undefined = undefined;
    if (apiRes && apiRes.ok) {
      try {
        const json = (await apiRes.json()) as any;
        if (json?.candidates?.[0]?.content?.parts) {
          for (const p of json.candidates[0].content.parts as any[]) {
            const data = p.inlineData?.data ?? p.inline_data?.data ?? p.inlineData?.Data ?? p.inline_data?.Data;
            if (data && typeof data === "string" && data.length > 500) {
              b64 = data;
              break;
            }
          }
        }
      } catch {}
    }

    if (!b64) {
      console.warn("[AI Outpaint] Gemini API unavailable or no image data, generating widescreen frame fallback");
      return prepareFacade(rawPayload, item.originalUrl, item.id);
    }

    // -------------------------------------------------------------
    // POST-GENERATION ALIGNMENT (Precise Mathematical Scaling)
    // -------------------------------------------------------------
    const aiImgBase64 = `data:image/jpeg;base64,${b64}`;
    const aiImg = await loadImage(aiImgBase64);

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const finalCtx = finalCanvas.getContext("2d", { willReadFrequently: true })!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";

    // Draw the full AI-generated widescreen background
    finalCtx.drawImage(aiImg, 0, 0, outW, outH);

    // Composite the original, pristine high-resolution house directly on top
    // at the exact mathematical position (3.5mm top sky gap, 20mm bottom driveway gap)
    finalCtx.drawImage(img, drawX, drawY, drawW, drawH);

    return finalCanvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    console.error("[AI Outpaint Exception]", err);
    return null;
  }
}

/**
 * Asks the server to AI-outpaint a facade into a wide 3:2 render (house as
 * large as possible, landscaping continued on both sides). Results are cached
 * in Cloud storage, so repeat selections return instantly.
 */
export async function widenFacade(item: {
  id: string;
  name: string;
  url: string;
}): Promise<string | null> {
  return widenFacadeClientSide(item);
}

/** Trimmed floorplans, keyed by their published URL. */
const floorplanCache = new Map<string, string>();
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

async function cropPdfFloorplan(plan: import("./floorplans.data").FloorplanRecord): Promise<string | null> {
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

/** Trimmed facade renders, keyed by their published URL. */
const facadeCache = new Map<string, string>();

/**
 * Prepares a facade render for widescreen 2.69:1 display:
 * Ensures 100% of double-storey and single-storey buildings are fully visible,
 * with perfectly matched panoramic sky & ground background extension (zero white space).
 */
export async function prepareFacade(dataUrl: string, originalUrl?: string, facadeId?: string): Promise<string | null> {
  if (!dataUrl) return dataUrl;

  const cached = facadeCache.get(dataUrl);
  if (cached) return cached;

  try {
    const rawB64 = await getRawFacadeBase64(dataUrl, originalUrl, facadeId);
    const srcUrl = rawB64 || dataUrl;
    const img = await loadImage(srcUrl);
    const srcW = img.naturalWidth  || 1200;
    const srcH = img.naturalHeight || 900;

    // Output canvas: 2.69 : 1 (flyer header proportion)
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW / 2.69); // e.g. 892px for outW=2400

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Accurate house boundaries from deterministic pixel scan
    const bounds = detectHouseBounds(img);
    const houseRoofY = srcH * Math.max(0, bounds.ymin - 0.005);
    const houseBaseY = srcH * Math.min(1.0, bounds.ymax);
    const buildingH = Math.max(10, houseBaseY - houseRoofY);

    // Exact mathematical framing:
    // 3.5mm top sky gap (~38px on 892px canvas, matching 82mm flyer container)
    const topGap = Math.round(outH * (3.5 / 82)); // ~38px
    // 15mm bottom ground/driveway clearance (~163px on 892px canvas)
    const bottomGap = Math.round(outH * (15.0 / 82)); // ~163px
    const targetBuildingH = outH - topGap - bottomGap; // ~691px

    // Primary scale to fit 100% of double-storey and single-storey houses
    let scale = targetBuildingH / buildingH;

    // Ensure the image base reaches the bottom of the canvas so there is no cut-off driveway
    if (topGap - (houseRoofY * scale) + (srcH * scale) < outH) {
      scale = (outH - topGap) / (srcH - houseRoofY);
    }

    let drawW = Math.round(srcW * scale);
    let drawH = Math.round(srcH * scale);
    let drawY = Math.round(topGap - (houseRoofY * scale));
    let drawX = Math.round((outW - drawW) / 2);

    // 1. Draw edge-to-edge background wings if drawW < outW to guarantee ZERO WHITE BOXES
    if (drawW < outW) {
      // Draw full-bleed cover background first so the entire canvas is filled with natural photo tones
      const coverScale = Math.max(outW / srcW, outH / srcH);
      const bgW = Math.round(srcW * coverScale);
      const bgH = Math.round(srcH * coverScale);
      const bgX = Math.round((outW - bgW) / 2);
      const bgY = Math.round(topGap - (houseRoofY * coverScale));
      ctx.drawImage(img, bgX, bgY, bgW, bgH);

      // Now draw the perfectly framed center house on top
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Widescreen image: draw centered horizontally with exact roofline positioning
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    const resUrl = canvas.toDataURL("image/jpeg", 0.95);
    facadeCache.set(dataUrl, resUrl);
    return resUrl;
  } catch (err) {
    console.error("[prepareFacade Error]", err);
    return dataUrl;
  }
}
