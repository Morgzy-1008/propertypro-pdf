import { HUDSON_FACADES } from "./facades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";
import { loadImage, blobToBase64 } from "./fileToImage";

/** In-memory cache of prepared facade renders */
export const facadeCache = new Map<string, string>();

/** Wipes the in-memory facade cache */
export function clearFacadeMemoryCache(): void {
  facadeCache.clear();
}

/**
 * Extracts the bounding box of the house building envelope ONLY,
 * cropping away raw baked-in sky, driveway, and peripheral trees.
 */
export function findHouseBounds(
  img: HTMLImageElement | { width: number; height: number },
  data: Uint8ClampedArray
): {
  roofY: number;
  baseY: number;
  leftX: number;
  rightX: number;
} {
  const srcW = img.width;
  const srcH = img.height;

  // 1. Precise Roof Apex scan (scans central 25% to 75% region, ignoring sky AND perimeter tree foliage)
  let roofY = Math.round(srcH * 0.15);
  for (let y = 10; y < srcH * 0.70; y += 2) {
    let roofTileCount = 0;
    for (let x = Math.round(srcW * 0.25); x < Math.round(srcW * 0.75); x += 4) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      const isSky = (b > r + 12 && b > g - 10) || (r > 205 && g > 215 && b > 220) || (r > 235 && g > 235 && b > 235);
      const isFoliage = g > r + 15 && g > b + 10; // green tree leaves
      const isRoofOrBldg = !isSky && !isFoliage;

      if (isRoofOrBldg) roofTileCount++;
    }
    if (roofTileCount > (srcW * 0.50 / 4) * 0.08) {
      roofY = y;
      break;
    }
  }

  // 2. Precise House Base ground line scan (bottom of walls/garage/porch)
  let baseY = Math.round(srcH * 0.75);
  for (let y = Math.round(srcH * 0.88); y > Math.round(srcH * 0.40); y -= 2) {
    let structureCount = 0;
    for (let x = Math.round(srcW * 0.25); x < Math.round(srcW * 0.75); x += 4) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      const isTimber = r > 110 && g > 55 && b < 70 && (r - g) > 20;
      const isDarkBrickOrTrim = r < 70 && g < 70 && b < 70;
      const isRenderWall = r > 150 && g > 145 && b > 135 && Math.abs(r - g) < 25;

      if (isTimber || isDarkBrickOrTrim || isRenderWall) {
        structureCount++;
      }
    }

    if (structureCount > (srcW * 0.50 / 4) * 0.18) {
      baseY = y;
      break;
    }
  }

  // 3. Left and Right building walls
  let leftX = Math.round(srcW * 0.15);
  for (let x = 10; x < srcW * 0.45; x += 4) {
    let bldgCount = 0;
    for (let y = roofY + 10; y < baseY - 10; y += 8) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const isSky = (b > r + 15 && b > g - 10) || (r > 220 && g > 220 && b > 220);
      const isFoliage = g > r + 15 && g > b + 10;
      if (!isSky && !isFoliage) bldgCount++;
    }
    if (bldgCount > ((baseY - roofY) / 8) * 0.25) {
      leftX = x;
      break;
    }
  }

  let rightX = Math.round(srcW * 0.85);
  for (let x = srcW - 10; x > srcW * 0.55; x -= 4) {
    let bldgCount = 0;
    for (let y = roofY + 10; y < baseY - 10; y += 8) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const isSky = (b > r + 15 && b > g - 10) || (r > 220 && g > 220 && b > 220);
      const isFoliage = g > r + 15 && g > b + 10;
      if (!isSky && !isFoliage) bldgCount++;
    }
    if (bldgCount > ((baseY - roofY) / 8) * 0.25) {
      rightX = x;
      break;
    }
  }

  return { roofY, baseY, leftX, rightX };
}

/**
 * Pre-frames the house onto a widescreen 210mm x 82mm banner (2400 x 937 px):
 * - Single Storey: Hero proportion (2mm top gap, 5mm bottom gap) — 100% UNTOUCHED.
 * - Double Storey: Cleanly calibrated (6mm top gap, 8mm bottom gap, 68mm house height)
 *   with full background texture fill (ZERO black boxes or transparent voids).
 */
export async function preframeFacadeImage(
  rawB64: string,
  housingType = "single-storey"
): Promise<string> {
  try {
    const img = await loadImage(rawB64);
    const srcW = img.width;
    const srcH = img.height;

    const outW = 2400; // 210mm
    const outH = 937;  // 82mm
    const pxPerMm = outH / 82; // 11.4268 px/mm

    const scanCanvas = document.createElement("canvas");
    scanCanvas.width = srcW;
    scanCanvas.height = srcH;
    const sCtx = scanCanvas.getContext("2d");
    if (!sCtx) return rawB64;
    sCtx.drawImage(img, 0, 0);
    const imgData = sCtx.getImageData(0, 0, srcW, srcH);

    const { roofY, baseY, leftX, rightX } = findHouseBounds(img, imgData.data);
    const houseW = Math.max(100, rightX - leftX);
    const houseH = Math.max(100, baseY - roofY);

    const isDouble =
      housingType === "double-storey" ||
      housingType === "double" ||
      housingType === "Double Storey" ||
      housingType === "Double";

    // Calibrated physical millimeter geometry:
    // Single Storey: 2mm top gap, 5mm bottom gap (75mm house height) — UNTOUCHED
    // Double Storey: 6mm top gap, 8mm bottom gap (68mm house height) — Safe roof clearance
    const targetRoofApexY = Math.round((isDouble ? 6.0 : 2.0) * pxPerMm); // 69px (6mm) or 23px (2mm)
    const targetHouseBaseY = outH - Math.round((isDouble ? 8.0 : 5.0) * pxPerMm); // 846px (74mm) or 880px (77mm)
    const targetHouseH = targetHouseBaseY - targetRoofApexY; // 777px (68mm) or 857px (75mm)

    let scale = targetHouseH / houseH;
    const maxAllowedW = isDouble ? 2200 : 2360;
    if (houseW * scale > maxAllowedW) {
      scale = maxAllowedW / houseW;
    }

    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const drawY = Math.round(targetRoofApexY - (roofY * scale));

    // Center house horizontally
    const scaledLeft = leftX * scale;
    const scaledRight = rightX * scale;
    const scaledW = scaledRight - scaledLeft;
    const drawX = Math.round(((outW - scaledW) / 2) - scaledLeft);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawB64;

    // Fill background with realistic sky and lawn so there are ZERO black bars
    // 1. Sample sky and lawn colors from source image
    const sampleTopPixel = sCtx.getImageData(Math.round(srcW / 2), 4, 1, 1).data;
    const topSky = `rgb(${sampleTopPixel[0]}, ${sampleTopPixel[1]}, ${sampleTopPixel[2]})`;

    const sampleBtmPixel = sCtx.getImageData(Math.round(srcW / 2), srcH - 4, 1, 1).data;
    const btmGround = `rgb(${sampleBtmPixel[0]}, ${sampleBtmPixel[1]}, ${sampleBtmPixel[2]})`;

    // 2. Draw smooth natural sky & ground backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, outH);
    grad.addColorStop(0, topSky);
    grad.addColorStop(0.60, topSky);
    grad.addColorStop(1, btmGround);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, outW, outH);

    // 3. Draw blurred/expanded natural wings on left and right for seamless texture continuity
    if (drawX > 0) {
      // Left wing texture
      ctx.save();
      ctx.filter = "blur(18px)";
      ctx.drawImage(img, 0, 0, Math.round(srcW * 0.35), srcH, 0, drawY, drawX + 40, drawH);
      // Right wing texture
      ctx.drawImage(img, Math.round(srcW * 0.65), 0, Math.round(srcW * 0.35), srcH, drawX + drawW - 40, drawY, outW - (drawX + drawW) + 40, drawH);
      ctx.restore();
    }

    // 4. Draw the main sharp house photo centered
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.94);
  } catch (e) {
    console.warn("[preframeFacadeImage fallback]", e);
    return rawB64;
  }
}

/**
 * Enhances image micro-contrast, crispness, and edge definition without altering materials or colors.
 */
export async function enhanceImageCrispness(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const w = img.width;
    const h = img.height;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const src = imgData.data;

    const copyCanvas = document.createElement("canvas");
    copyCanvas.width = w;
    copyCanvas.height = h;
    const copyCtx = copyCanvas.getContext("2d");
    if (!copyCtx) return dataUrl;
    copyCtx.drawImage(img, 0, 0);
    const copyData = copyCtx.getImageData(0, 0, w, h).data;

    // True luminance/edge unsharp mask kernel preserving exact RGB color balance
    const c = 1.35;
    const s = -0.04375;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;

        for (let channel = 0; channel < 3; channel++) {
          const val =
            copyData[idx + channel] * c +
            (copyData[((y - 1) * w + x) * 4 + channel] +
             copyData[((y + 1) * w + x) * 4 + channel] +
             copyData[(y * w + (x - 1)) * 4 + channel] +
             copyData[(y * w + (x + 1)) * 4 + channel] +
             copyData[((y - 1) * w + (x - 1)) * 4 + channel] +
             copyData[((y - 1) * w + (x + 1)) * 4 + channel] +
             copyData[((y + 1) * w + (x - 1)) * 4 + channel] +
             copyData[((y + 1) * w + (x + 1)) * 4 + channel]) * s;

          src[idx + channel] = Math.min(255, Math.max(0, Math.round(val)));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.96);
  } catch {
    return dataUrl;
  }
}

/**
 * Calls Gemini AI Image Generation / Outpaint API directly using VITE_GEMINI_API_KEY.
 * Fast-path sub-20s latency.
 */
export async function callGeminiOutpaint(
  rawImageBase64: string,
  housingType = "single-storey"
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini AI] VITE_GEMINI_API_KEY is not configured.");
    return null;
  }

  const cleanB64 = rawImageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  const mimeType = rawImageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const isDouble =
    housingType === "double-storey" ||
    housingType === "double" ||
    housingType === "Double Storey" ||
    housingType === "Double";

  const prompt = isDouble
    ? `Task: High-end architectural rendering outpaint, resize and upscale to exact frame dimensions for a DOUBLE STOREY house.

Exact Dimensions & Aspect Ratio:
- Canvas Aspect Ratio: Strictly 210:82 (210mm x 82mm widescreen flyer banner frame, exactly 2400 x 937 px).
- Center the house horizontally within the 210:82 frame.
- Resize and fit the facade render so that:
  * Top Margin: Leave a consistent clearance (~6% of total height / 5mm) between the highest roof ridge/apex and the top canvas edge so the roof is 100% visible inside the frame.
  * Bottom Placement: Ground the garage base and ground line in the lower third with clean driveway space below.

Architectural Integrity:
- Preserve the exact architectural details, materials, roof tiles/Colorbond profile, brick mortar, timber stains, window frames, balcony railings, and geometry of the original house. Do not modify or hallucinate changes to the building.

Environment & Seamless Outpainting (FULL WIDESCREEN EDGE-TO-EDGE):
- Outpaint and seamlessly extend the left and right wings to fill the full 2400px width with matching residential surroundings: lush green manicured turf, garden beds with native shrubs/plants, gum trees, and authentic Colorbond or timber boundary fences.
- Extend the clear blue sky overhead with minimal soft wispy clouds, matching the natural midday daylight of the original photo.
- ZERO black bars, ZERO black boxes, ZERO empty borders, ZERO blur, zero sliced foliage. High-resolution 8K UHD architectural photography style with sharp textures.`
    : `Task: High-end architectural rendering outpaint, resize and upscale to exact frame dimensions.

Exact Dimensions & Aspect Ratio:
- Canvas Aspect Ratio: Strictly 210:82 (210mm x 82mm widescreen flyer banner frame, exactly 2400 x 937 px).
- Center the house horizontally within the 210:82 frame.
- Top Margin: Leave a narrow margin (~3mm) between the highest roof ridge and the top canvas edge.
- Bottom Placement: Ground the garage base in the lower third with clean driveway space below.

Architectural Integrity:
- Preserve the exact architectural details, materials, roof tiles/Colorbond profile, brick mortar, timber stains, window frames, and geometry of the original house. Do not modify or hallucinate changes to the building.

Environment & Seamless Outpainting (FULL WIDESCREEN EDGE-TO-EDGE):
- Outpaint and seamlessly extend the left and right wings to fill the full 2400px width with matching residential surroundings: lush green manicured turf, garden beds with native shrubs/plants, gum trees, and authentic Colorbond boundary fences.
- Extend the clear blue sky overhead with minimal soft wispy clouds.
- ZERO black bars, ZERO black boxes, ZERO empty borders, ZERO blur. High-resolution 8K UHD architectural photography style.`;

  const models = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: cleanB64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          temperature: 0.2,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s fast-path timeout

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Gemini API Error - ${model}]`, response.status, errText);
        continue;
      }

      const result = await response.json();
      const candidate = result?.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data
      );

      if (candidate?.inlineData?.data) {
        const outMime = candidate.inlineData.mimeType || "image/jpeg";
        const rawAiUrl = `data:${outMime};base64,${candidate.inlineData.data}`;
        return await enhanceImageCrispness(rawAiUrl);
      }
    } catch (e) {
      console.error(`[Gemini API Exception - ${model}]`, e);
    }
  }

  return null;
}

/**
 * Prepares facade:
 * 1. Checks pre-rendered catalogue.
 * 2. If Gemini AI key is available, calls Gemini AI Outpainting directly.
 * 3. Falls back to pre-framed render with natural background wings if API key is invalid/unavailable.
 */
export async function prepareFacade(
  dataUrl: string,
  originalUrl?: string,
  facadeId?: string,
  housingType?: string,
  forceRefresh?: boolean
): Promise<string | null> {
  if (!dataUrl) return dataUrl;

  const isDouble =
    housingType === "double-storey" ||
    housingType === "double" ||
    housingType === "Double Storey" ||
    housingType === "Double";

  const normId = (facadeId || "").toLowerCase().trim();
  if (!forceRefresh && normId && PRE_RENDERED_FACADES[normId] && !isDouble) {
    return PRE_RENDERED_FACADES[normId];
  }

  const cacheKey = `${dataUrl}::v22_edge_to_edge_${isDouble ? "double" : "single"}`;
  if (!forceRefresh) {
    const cached = facadeCache.get(cacheKey);
    if (cached) return cached;
  }

  const rawB64 = await getRawFacadeBase64(dataUrl, originalUrl, facadeId);
  const srcUrl = rawB64 || dataUrl;

  // Trigger Gemini AI Outpaint on raw source image
  try {
    const aiResult = await callGeminiOutpaint(srcUrl, housingType);
    if (aiResult && aiResult.startsWith("data:image/")) {
      facadeCache.set(cacheKey, aiResult);
      return aiResult;
    }
  } catch (err) {
    console.warn("[prepareFacade: Gemini AI outpaint failed, falling back]", err);
  }

  // Fallback: Generate pre-framed widescreen render with natural background fill (ZERO black boxes)
  try {
    const fallbackFramed = await preframeFacadeImage(srcUrl, housingType);
    facadeCache.set(cacheKey, fallbackFramed);
    return fallbackFramed;
  } catch {
    facadeCache.set(cacheKey, srcUrl);
    return srcUrl;
  }
}

export async function getRawFacadeBase64(
  dataUrl: string,
  originalUrl?: string,
  facadeId?: string
): Promise<string | null> {
  const targetUrl = originalUrl || dataUrl;

  if (targetUrl.startsWith("data:image/")) {
    return targetUrl;
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
  return prepareFacade(item.url, item.originalUrl, item.id, item.housingType, item.forceRefresh);
}

export async function widenFacadeClientSide(item: {
  id: string;
  name: string;
  url: string;
  originalUrl?: string;
  housingType?: string;
  forceRefresh?: boolean;
}): Promise<string | null> {
  return prepareFacade(item.url, item.originalUrl, item.id, item.housingType, item.forceRefresh);
}
