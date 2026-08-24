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
    // Single Storey: 2.5mm top gap, 5mm bottom gap — maximum hero size with safe roof & boundary clearance
    // Double Storey: 6mm top gap, 8mm bottom gap (68mm house height) — Safe roof clearance
    const targetRoofApexY = Math.round((isDouble ? 6.0 : 2.5) * pxPerMm); // 69px (6mm) or 29px (2.5mm)
    const targetHouseBaseY = outH - Math.round((isDouble ? 8.0 : 5.0) * pxPerMm); // 846px (74mm) or 880px (77mm)
    const targetHouseH = targetHouseBaseY - targetRoofApexY; // 777px (68mm) or 851px (74.5mm)

    let scale = targetHouseH / houseH;
    const maxAllowedW = isDouble ? 2180 : 2300;
    if (houseW * scale > maxAllowedW) {
      scale = maxAllowedW / houseW;
    }

    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    let drawY = Math.round(targetRoofApexY - (roofY * scale));

    // Ensure roof apex never crosses or gets clipped by the top border
    const minTopMargin = Math.round((isDouble ? 5.0 : 2.0) * pxPerMm);
    if (drawY + (roofY * scale) < minTopMargin) {
      drawY = minTopMargin - Math.round(roofY * scale);
    }

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

    // Fill background with realistic continuous landscape backdrop so there are ZERO empty boxes
    // 1. Draw full-bleed landscape background texture with subtle atmospheric blur to seamlessly fill left & right wings
    ctx.save();
    ctx.filter = "blur(16px)";
    // Cover the full widescreen canvas with proportional landscape background
    const bgScale = Math.max(outW / srcW, outH / srcH) * 1.08;
    const bgW = Math.round(srcW * bgScale);
    const bgH = Math.round(srcH * bgScale);
    const bgX = Math.round((outW - bgW) / 2);
    const bgY = Math.round((outH - bgH) / 2);
    ctx.drawImage(img, bgX, bgY, bgW, bgH);
    ctx.restore();

    // 2. Soft natural light overlay to match daytime exposure
    const grad = ctx.createLinearGradient(0, 0, 0, outH);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, outW, outH);

    // 3. Draw the main razor-sharp house photo centered with clean edge-to-edge blending
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
 * Calls Gemini AI Image Generation / Outpaint API:
 * 1. First tries serverless /api/redo-ai endpoint (handles server-side proxying & keys).
 * 2. Fallbacks to client-side direct API call using VITE_GEMINI_API_KEY.
 */
export async function callGeminiOutpaint(
  rawImageBase64: string,
  housingType = "single-storey"
): Promise<string | null> {
  console.log("[callGeminiOutpaint] Starting outpaint for housingType:", housingType);
  let srcData = rawImageBase64;

  // If input is a URL or relative path, convert to full base64 dataUrl first
  if (!srcData.startsWith("data:image/")) {
    console.log("[callGeminiOutpaint] Resolving base64 from URL/path:", srcData.substring(0, 60));
    const fetched = await getRawFacadeBase64(srcData);
    if (fetched) {
      srcData = fetched;
      console.log("[callGeminiOutpaint] Base64 resolved successfully, bytes:", srcData.length);
    } else {
      console.warn("[callGeminiOutpaint] Failed to resolve base64 for:", srcData.substring(0, 60));
    }
  }

  // 1. Try serverless backend route first
  try {
    const serverPayload = srcData.startsWith("data:image/")
      ? { imageBase64: srcData, housingType }
      : { imageUrl: srcData, housingType };

    console.log("[callGeminiOutpaint] Calling /api/redo-ai endpoint...");
    const serverRes = await fetch("/api/redo-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverPayload),
    });

    console.log("[callGeminiOutpaint] /api/redo-ai response status:", serverRes.status);
    if (serverRes.ok) {
      const json = await serverRes.json();
      console.log("[callGeminiOutpaint] /api/redo-ai result success:", json.success);
      if (json.success && json.widenedUrl) {
        return await enhanceImageCrispness(json.widenedUrl);
      }
    } else {
      const errTxt = await serverRes.text();
      console.warn("[callGeminiOutpaint] /api/redo-ai error response:", serverRes.status, errTxt);
    }
  } catch (err) {
    console.warn("[callGeminiOutpaint: /api/redo-ai fallback to client]", err);
  }

  // 2. Direct client-side fallback
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini AI] VITE_GEMINI_API_KEY is not configured.");
    return null;
  }

  if (!srcData.startsWith("data:image/")) {
    console.warn("[Gemini AI] Could not resolve base64 data for image.");
    return null;
  }

  const cleanB64 = srcData.replace(/^data:image\/[a-z]+;base64,/, "");
  const mimeType = srcData.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const isDouble =
    housingType === "double-storey" ||
    housingType === "double" ||
    housingType === "Double Storey" ||
    housingType === "Double";

  const prompt = isDouble
    ? `Task: High-end architectural rendering outpaint, upscale, and hero framing for a DOUBLE STOREY house.

Canvas & Framing Specifications:
- Canvas Aspect Ratio: Strictly 210:82 widescreen (2400 x 937 px).
- House Scale & Position: The double-storey house must be LARGE, PROMINENT, and HEROIC, occupying ~85% of the total canvas height.
- Roofline Clearance: Ensure the highest roof ridge/apex, gutters, and upper eaves are 100% visible inside the frame with a clean 4mm to 5mm margin between the roof and the top canvas edge.
- Grounding: Ground the base of the garage and front porch in the lower third with 5mm to 6mm of clean driveway visible at the bottom.
- Center the house horizontally.

STRICT ARCHITECTURAL INTEGRITY (DO NOT MODIFY ROOF OR BUILDING STRUCTURE):
- Preserve the exact architectural geometry, facade materials, roof shape, roof pitch, parapets, and structural design of the original house 100% faithfully.
- DO NOT alter the roof structure, roof pitch, flat roof parapets, or roof ridges.
- Do NOT modify brick mortar, timber battens, window frames, balcony glass, or garage doors.

Seamless Ultra-Realistic Outpainting:
- Outpaint the entire background to create ONE SEAMLESS, ULTRA-REALISTIC architectural photograph across the full 2400px widescreen canvas.
- Extend the left and right wings with authentic Australian residential surroundings: lush manicured turf, flowering native garden beds, gum trees, and matching Colorbond boundary fencing.
- Seamlessly extend the clear blue sky overhead.
- ZERO blur, ZERO blurred edges, ZERO visual artifacts, ZERO seams. Render every detail with razor-sharp 8K UHD architectural photography clarity.`
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
  if (!forceRefresh && normId && PRE_RENDERED_FACADES[normId]) {
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

  try {
    const img = await loadImage(targetUrl);
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/jpeg", 0.95);
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
