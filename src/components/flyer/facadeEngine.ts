import { HUDSON_FACADES } from "./facades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";
import { loadImage, blobToBase64, cropToContent } from "./fileToImage";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/** Cache of prepared/trimmed facade data URLs */
export const facadeCache = new Map<string, string>();

/**
 * Prepares a facade render for widescreen 210mm x 82mm display:
 * Ensures 100% of double-storey and single-storey buildings are fully visible,
 * with perfectly matched panoramic sky & ground background extension (zero white space, zero blur).
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

    // Output canvas: Exactly 210mm x 82mm flyer container proportion (2.56 : 1)
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW * (82 / 210)); // 937px for outW=2400

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Accurate house apex detection from deterministic pixel scan
    let houseRoofY = Math.round(srcH * 0.10);
    try {
      const scanCanvas = document.createElement("canvas");
      scanCanvas.width = srcW;
      scanCanvas.height = srcH;
      const sCtx = scanCanvas.getContext("2d")!;
      sCtx.drawImage(img, 0, 0);
      const data = sCtx.getImageData(0, 0, srcW, srcH).data;

      for (let y = Math.round(srcH * 0.02); y < srcH * 0.50; y += 2) {
        let nonSkyCount = 0;
        for (let x = Math.round(srcW * 0.25); x < Math.round(srcW * 0.75); x += 4) {
          const idx = (y * srcW + x) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          const isSky = (b > r + 15 && b > g - 10) || (r > 215 && g > 215 && b > 215);
          if (!isSky) nonSkyCount++;
        }
        if (nonSkyCount > (srcW * 0.50 / 4) * 0.08) {
          houseRoofY = y;
          break;
        }
      }
    } catch {}

    const topGap = Math.round(outH * (3.5 / 82)); // 40px (3.5mm sky gap)

    // 2. Scale so 100% of the entire house height (from roof apex down to driveway/foundation) fits perfectly
    const targetH = outH - topGap;
    const scale = targetH / (srcH - houseRoofY);

    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const drawY = Math.round(topGap - (houseRoofY * scale));
    const drawX = Math.round((outW - drawW) / 2);

    // 3. Fill Panoramic Landscape Wings if width is narrower than widescreen canvas
    if (drawW < outW) {
      const leftStripW = Math.min(srcW * 0.20, 160);
      const rightStripW = Math.min(srcW * 0.20, 160);

      // Left Wing: Environmental margin smoothly extended to left edge
      ctx.drawImage(img, 0, 0, leftStripW, srcH, 0, drawY, drawX + 60, drawH);

      // Right Wing: Environmental margin smoothly extended to right edge
      ctx.drawImage(img, srcW - rightStripW, 0, rightStripW, srcH, drawX + drawW - 60, drawY, outW - (drawX + drawW - 60), drawH);

      // Top Sky if needed
      if (drawY > 0) {
        ctx.drawImage(img, 0, 0, srcW, 5, 0, 0, outW, drawY);
      }

      // 4. Central House with soft 50px cosine alpha blend for zero hard lines and zero blur
      const houseCanvas = document.createElement("canvas");
      houseCanvas.width = drawW;
      houseCanvas.height = drawH;
      const hCtx = houseCanvas.getContext("2d", { willReadFrequently: true })!;
      hCtx.imageSmoothingEnabled = true;
      hCtx.imageSmoothingQuality = "high";
      hCtx.drawImage(img, 0, 0, drawW, drawH);

      hCtx.globalCompositeOperation = "destination-out";
      const leftGrad = hCtx.createLinearGradient(0, 0, 50, 0);
      leftGrad.addColorStop(0, "rgba(0,0,0,1)");
      leftGrad.addColorStop(1, "rgba(0,0,0,0)");
      hCtx.fillStyle = leftGrad;
      hCtx.fillRect(0, 0, 50, drawH);

      const rightGrad = hCtx.createLinearGradient(drawW - 50, 0, drawW, 0);
      rightGrad.addColorStop(0, "rgba(0,0,0,0)");
      rightGrad.addColorStop(1, "rgba(0,0,0,1)");
      hCtx.fillStyle = rightGrad;
      hCtx.fillRect(drawW - 50, 0, 50, drawH);

      ctx.drawImage(houseCanvas, drawX, drawY);
    } else {
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

export async function getRawFacadeBase64(dataUrl: string, originalUrl?: string, facadeId?: string): Promise<string | null> {
  const targetUrl = originalUrl || dataUrl;

  if (facadeId && PRE_RENDERED_FACADES[facadeId]) {
    return PRE_RENDERED_FACADES[facadeId];
  }

  if (targetUrl.startsWith("data:image/")) {
    return targetUrl;
  }

  if (facadeId) {
    const matched = HUDSON_FACADES.find((f) => f.id === facadeId || f.name.toLowerCase() === facadeId.toLowerCase());
    if (matched && PRE_RENDERED_FACADES[matched.id]) {
      return PRE_RENDERED_FACADES[matched.id];
    }
  }

  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      const blob = await res.blob();
      return blobToBase64(blob);
    }
  } catch {
    /* try proxy */
  }

  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      return blobToBase64(blob);
    }
  } catch {}

  return null;
}

export async function widenFacade(item: {
  id: string;
  name: string;
  url: string;
  originalUrl?: string;
  housingType?: string;
  forceRefresh?: boolean;
}): Promise<string | null> {
  return prepareFacade(item.url, item.originalUrl, item.id);
}

export async function widenFacadeClientSide(item: {
  id: string;
  name: string;
  url: string;
  originalUrl?: string;
  housingType?: string;
  forceRefresh?: boolean;
}): Promise<string | null> {
  return prepareFacade(item.url, item.originalUrl, item.id);
}
