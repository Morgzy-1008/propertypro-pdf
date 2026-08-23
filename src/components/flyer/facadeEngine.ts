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

  // 1. Precise Roof Apex scan (scans central 20% to 80% region, ignoring sky AND perimeter tree foliage)
  let roofY = Math.round(srcH * 0.05);
  for (let y = 2; y < srcH * 0.70; y += 2) {
    let roofTileCount = 0;
    for (let x = Math.round(srcW * 0.20); x < Math.round(srcW * 0.80); x += 4) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      const isSky = (b > r + 12 && b > g - 10) || (r > 205 && g > 215 && b > 220) || (r > 235 && g > 235 && b > 235);
      const isFoliage = g > r + 15 && g > b + 10; // green tree leaves
      const isRoofOrBldg = !isSky && !isFoliage;

      if (isRoofOrBldg) roofTileCount++;
    }
    if (roofTileCount > (srcW * 0.60 / 4) * 0.03) {
      roofY = Math.max(0, y - 4);
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
 * - Single Storey: Hero proportion (2mm top gap, 5mm bottom gap) — UNTOUCHED.
 * - Double Storey: Fully framed within the safe canvas, guaranteeing that the roof apex,
 *   upper gables, gutters, side walls and base stay completely within the frame with >= 5mm margin.
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

    const isDouble =
      housingType === "double-storey" ||
      housingType === "double" ||
      housingType === "Double Storey" ||
      housingType === "Double";

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawB64;

    if (isDouble) {
      // DOUBLE STOREY: Guarantees the entire house and roof are strictly inside the frame with >= 5mm (57px) clearance
      const minMarginPx = Math.round(5.0 * pxPerMm); // 57px (5mm)
      const maxAllowedH = outH - (minMarginPx * 2);  // 823px (72mm max house height)
      const maxAllowedW = outW - (minMarginPx * 2);  // 2286px (200mm max house width)

      // Fit the entire source photo so zero pixels of the roof/sky are cropped off
      const scale = Math.min(maxAllowedH / srcH, maxAllowedW / srcW);

      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);

      // Centered horizontally
      const drawX = Math.round((outW - drawW) / 2);
      // Position vertically so the top of the image has at least 5mm clear margin from the top border
      const drawY = Math.round(minMarginPx + (maxAllowedH - drawH) / 2);

      // Sample top sky and bottom grass to generate a natural seamless backdrop behind the photo
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = srcW;
      sampleCanvas.height = srcH;
      const sCtx = sampleCanvas.getContext("2d");
      if (sCtx) {
        sCtx.drawImage(img, 0, 0);
        const topPixel = sCtx.getImageData(Math.round(srcW / 2), 2, 1, 1).data;
        const topSkyColor = `rgb(${topPixel[0]}, ${topPixel[1]}, ${topPixel[2]})`;
        
        const bottomPixel = sCtx.getImageData(Math.round(srcW / 2), srcH - 4, 1, 1).data;
        const bottomColor = `rgb(${bottomPixel[0]}, ${bottomPixel[1]}, ${bottomPixel[2]})`;

        const grad = ctx.createLinearGradient(0, 0, 0, outH);
        grad.addColorStop(0, topSkyColor);
        grad.addColorStop(0.65, topSkyColor);
        grad.addColorStop(1, bottomColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, outW, outH);
      } else {
        ctx.fillStyle = "#a3c2e2";
        ctx.fillRect(0, 0, outW, outH);
      }

      // Draw the complete double-storey image intact
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      return canvas.toDataURL("image/jpeg", 0.94);
    } else {
      // SINGLE STOREY: 100% UNCHANGED
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

      const targetRoofApexY = Math.round(2.0 * pxPerMm); // 23px (2mm from top)
      const targetHouseBaseY = outH - Math.round(5.0 * pxPerMm); // 880px (5mm from bottom)
      const targetHouseH = targetHouseBaseY - targetRoofApexY; // 857px (75mm)

      let scale = targetHouseH / houseH;
      const maxAllowedW = 2360; // 206.5mm (leaves only 1.75mm side safety margins)
      if (houseW * scale > maxAllowedW) {
        scale = maxAllowedW / houseW;
      }

      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);
      const drawY = Math.round(targetRoofApexY - (roofY * scale));

      const scaledLeft = leftX * scale;
      const scaledRight = rightX * scale;
      const scaledW = scaledRight - scaledLeft;
      const drawX = Math.round(((outW - scaledW) / 2) - scaledLeft);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      return canvas.toDataURL("image/jpeg", 0.94);
    }
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

  const isDouble =
    housingType === "double-storey" ||
    housingType === "double" ||
    housingType === "Double Storey" ||
    housingType === "Double";

  // 1. Pre-frame the isolated house building onto the canvas at exact calibrated scale
  const preframeB64 = await preframeFacadeImage(rawImageBase64, housingType);
  const cleanB64 = preframeB64.replace(/^data:image\/[a-z]+;base64,/, "");
  const mimeType = preframeB64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const prompt = isDouble
    ? `Task: High-end architectural rendering outpaint, upscale, and ultra-realistic photograph enhancement for a DOUBLE STOREY house.

Output Frame Dimensions:
- Canvas Aspect Ratio: Strictly 210mm wide by 82mm high horizontal widescreen banner (2400 x 937 px).

Strict House Sizing & Framing (DOUBLE STOREY PROPORTIONS):
- Total Frame Height: 82mm (937 px).
- The entire 2-storey house must be completely visible without any part touching or cutting off at the border.
- The entire roof (apex, parapet, gutters, upper gables) must be 100% visible with at least 5mm of clear sky above it.
- Maintain at least 5mm (57px) of clean margin between the house (roof apex, gutters, upper balcony, side walls, and ground base) and all 4 outer borders.
- Maintain the entire house building intact with zero cut-offs.

ULTRA-REALISTIC PHOTOREALISTIC QUALITY & MATERIAL FIDELITY:
- 100% Architectural Authenticity: All original materials, wall render micro-texture, dark siding cladding, brick pillar mortar joints, timber/charcoal garage door woodgrain, window mullions, and roof tiles must remain 100% FAITHFUL to the source house with ultra-crisp 8K detail.
- Ultra-Realistic Landscaping: Lush manicured green grass with realistic micro-texture, authentic native Australian flowering shrubs, gum trees, and clean boundary Colorbond fencing.
- Top Sky: Vibrant clear blue Australian sky with subtle wispy clouds.
- Foreground: Natural aggregate concrete driveway connecting seamlessly to the garage door.
- 100% seamless continuity across the entire 2400px width with zero blur or hard cut seams.`
    : `Task: High-end architectural rendering outpaint, upscale, and ultra-realistic photograph enhancement.

Output Frame Dimensions:
- Canvas Aspect Ratio: Strictly 210mm wide by 82mm high horizontal widescreen banner (2400 x 937 px).

Strict House Sizing & Framing (HERO PROPORTIONS):
- Total Frame Height: 82mm (937 px).
- The house building is hero-shooted at MAXIMUM SIZE, filling ~90% of the vertical banner height.
- Roof ridge apex sits ~2mm to 3mm from the top border.
- Base of the house (garage door and entry porch) sits ~5mm from the bottom border with shortened driveway.
- Maintain the house at this exact large size.

ULTRA-REALISTIC PHOTOREALISTIC QUALITY & MATERIAL FIDELITY:
- 100% Architectural Authenticity: All original materials, wall render micro-texture, dark siding cladding, brick pillar mortar joints, timber/charcoal garage door woodgrain, window mullions, and roof tiles must remain 100% FAITHFUL to the source house with ultra-crisp 8K detail.
- Ultra-Realistic Landscaping: Lush manicured green grass with realistic micro-texture, authentic native Australian flowering shrubs, gum trees, and clean boundary Colorbond fencing.
- Top Sky: Vibrant clear blue Australian sky with subtle wispy clouds.
- Foreground: Natural aggregate concrete driveway connecting seamlessly to the garage door.
- 100% seamless continuity across the entire 2400px width with zero blur or hard cut seams.`;

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
          temperature: 0.1,
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

  return preframeB64;
}

/**
 * Prepares facade:
 * 1. Checks pre-rendered catalogue.
 * 2. If Gemini AI key is available, calls Gemini AI Outpainting directly.
 * 3. Falls back to pre-framed render if API key is invalid/unavailable.
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

  const cacheKey = `${dataUrl}::v18_framed_${isDouble ? "double_strict_roof_5mm" : "single_hero"}`;
  if (!forceRefresh) {
    const cached = facadeCache.get(cacheKey);
    if (cached) return cached;
  }

  const rawB64 = await getRawFacadeBase64(dataUrl, originalUrl, facadeId);
  const srcUrl = rawB64 || dataUrl;

  // Trigger Gemini AI Outpaint
  try {
    const aiResult = await callGeminiOutpaint(srcUrl, housingType);
    if (aiResult && aiResult.startsWith("data:image/")) {
      facadeCache.set(cacheKey, aiResult);
      return aiResult;
    }
  } catch (err) {
    console.warn("[prepareFacade: Gemini AI outpaint fallback]", err);
  }

  // Fallback: Generate clean pre-framed widescreen render immediately
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
