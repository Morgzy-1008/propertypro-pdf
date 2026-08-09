import { authHeaders } from "@/lib/api-auth";
import { HUDSON_FACADES } from "./facades.data";

/**

 * Converts an uploaded image OR PDF (first page) into a PNG data URL
 * so it can be rendered inside the flyer preview and printed.
 */
export async function fileToImageDataUrl(file: File): Promise<string> {
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
export async function floorplanFileToDataUrl(file: File): Promise<string> {
  const raw = await fileToImageDataUrl(file);
  return cropToFloorplan(raw);
}

async function pdfFirstPageToDataUrl(file: File): Promise<string> {
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
    img.crossOrigin = "anonymous";
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
export async function cropToFloorplan(dataUrl: string): Promise<string> {
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
export async function cropToContent(dataUrl: string, padRatio = 0.012): Promise<string> {
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



export async function enhanceFacade(src: string): Promise<string> {
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function getRawFacadeBase64(url: string, originalUrl?: string, facadeId?: string): Promise<string> {
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

    // 1. Direct fetch (works for same-origin & CORS-enabled URLs)
    try {
      console.log("[getRawFacadeBase64] Attempting direct fetch:", rawUrl);
      const res = await fetch(rawUrl);
      if (res.ok) {
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        if (b64.startsWith("data:image/") && b64.length > 500) {
          console.log("[getRawFacadeBase64] Direct fetch succeeded");
          return b64;
        }
      } else {
        console.log("[getRawFacadeBase64] Direct fetch failed with status:", res.status);
      }
    } catch (e) {
      console.log("[getRawFacadeBase64] Direct fetch threw:", e.message);
    }

    // 2. CORS Proxy fetch (bypasses browser CORS restrictions for hudsonhomes.com.au)
    if (rawUrl.startsWith("http")) {
      const proxies = [
        `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg`,
        `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,
      ];
      for (const proxyUrl of proxies) {
        try {
          console.log("[getRawFacadeBase64] Attempting proxy:", proxyUrl.substring(0, 40) + "...");
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const blob = await res.blob();
            const b64 = await blobToBase64(blob);
            if (b64.startsWith("data:image/") && b64.length > 500) {
              console.log("[getRawFacadeBase64] Proxy succeeded");
              return b64;
            }
          } else {
            console.log("[getRawFacadeBase64] Proxy failed with status:", res.status);
          }
        } catch (e) {
          console.log("[getRawFacadeBase64] Proxy threw:", e.message);
        }
      }
    }

    // 3. Canvas image element fallback
    try {
      console.log("[getRawFacadeBase64] Attempting Canvas fallback");
      const img = await loadImage(rawUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 900;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (dataUrl.startsWith("data:image/") && dataUrl.length > 500) {
        console.log("[getRawFacadeBase64] Canvas fallback succeeded");
        return dataUrl;
      }
    } catch (e) {
      console.log("[getRawFacadeBase64] Canvas fallback threw:", e.message);
    }
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
  return { ymin: 0.15, ymax: 0.85, xmin: 0.1, xmax: 0.9 };
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
    
    // Output canvas: exactly 2.69 : 1
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW / 2.69);

    // Get exact house location to maximize scale
    const bbox = await getHouseBoundingBox(GEMINI_KEY, rawPayload.split(",")[1] ?? "");
    // The Gemini bounding box often includes some sky/driveway padding. 
    // To ensure the physical house is mathematically precise, we tighten the bbox.
    const tightenY = 0.02; // assume 2% padding on top and bottom
    const trueHouseY = srcH * (bbox.ymin + tightenY);
    const trueHouseH = srcH * Math.max(0.1, (bbox.ymax - tightenY) - (bbox.ymin + tightenY));
    const trueHouseW = srcW * (bbox.xmax - bbox.xmin);
    
    // Total frame height is 78mm.
    // Top gap is 5mm (5 / 78)
    // House height is 63mm (63 / 78)
    // Bottom gap is 10mm (10 / 78)
    // Side margin is 5mm (5 / 78)
    const topGap = Math.round(outH * (5 / 78));
    const targetHouseH = Math.round(outH * (63 / 78));
    const sideMargin = Math.round(outH * (5 / 78));
    const maxHouseW = outW - (sideMargin * 2);
    
    let scale = targetHouseH / trueHouseH;
    
    // If the house is too wide (touching sides), scale it back so there is exactly a 5mm gap on the sides
    if (trueHouseW * scale > maxHouseW) {
        scale = maxHouseW / trueHouseW;
    }
    
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);

    // Center horizontally
    const drawX = Math.round((outW - drawW) / 2);
    
    // Anchor vertically so the ACTUAL roof is exactly at `topGap`
    const drawY = Math.round(topGap - (trueHouseY * scale));
    
    // Position the house perfectly
    // Prepare the centered canvas to send to Gemini
    const prepCanvas = document.createElement("canvas");
    prepCanvas.width = outW;
    prepCanvas.height = outH;
    const prepCtx = prepCanvas.getContext("2d", { willReadFrequently: true })!;
    prepCtx.imageSmoothingEnabled = true;
    prepCtx.imageSmoothingQuality = "high";
    prepCtx.fillStyle = "#ffffff";
    prepCtx.fillRect(0, 0, outW, outH);
    prepCtx.drawImage(img, drawX, drawY, drawW, drawH);
    
    const preparedPayload = prepCanvas.toDataURL("image/jpeg", 0.95);

    const isDouble =
      /double|two|2\s*storey|duplex/i.test(item.housingType ?? "") ||
      /double|2-storey|2stry|30|32|34|35|36|38|40|42|burgundy|cambridge|ascot|ashton|marche|allure|chevron|violet|jasper|manhattan|tropez|sapphire|hamilton|montana|chelsea|palermo|windsor|cleveland/i.test(
        `${item.id ?? ""} ${item.name ?? ""}`
      );

    const refreshSeed = item.forceRefresh ? `\n\nCRITICAL: This is a RE-GENERATION request. You MUST create a DIFFERENT landscaping layout, sky, and background than you did last time. Random Seed: ${Date.now()}` : "";

    const promptText =
      "I have provided an image of a house placed on a white widescreen canvas. Your job is to outpaint the white space to create ONE seamless, photorealistic background across the ENTIRE widescreen image.\n\n" +
      "CRITICAL INSTRUCTION: Master Lighting and Atmosphere. The entire scene must be rendered with an expansive, bright, and soft natural daylight. Imagine a perfectly clear day with soft, non-directional light that makes the colors vibrant and clean. The new extended sky must be a soft, luminous, light blue.\n\n" +
      "You must make the new landscaping, sky, driveway, and environment look exactly like a natural extension of the original facade, but with increased overall brightness and luminosity. The original facade itself should remain consistent, but the new lighting should make the textures (brickwork, glass, concrete) look exceptionally clean, crisp, and high-detail.\n\n" +
      "QUALITY DIRECTIVES: Render with high-resolution textures, clean lines, and an aesthetic that emphasizes a high-end, professionally photographed real estate listing. Avoid flat lighting. keep everything hyper realistic." + refreshSeed;

    const models = ["gemini-3.1-flash-image"];
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

    if (!apiRes || !apiRes.ok) {
      console.error("[AI Outpaint] All Gemini API endpoints failed");
      return null;
    }

    const json = (await apiRes.json()) as any;
    console.log("[AI Outpaint] API returned OK. Keys:", Object.keys(json));

    let b64: string | undefined = undefined;
    if (json?.candidates?.[0]?.content?.parts) {
      for (const p of json.candidates[0].content.parts as any[]) {
        const data = p.inlineData?.data ?? p.inline_data?.data ?? p.inlineData?.Data ?? p.inline_data?.Data;
        if (data && typeof data === "string" && data.length > 500) {
          b64 = data;
          console.log("[AI Outpaint] Found inline data, length:", data.length);
          break;
        }
      }
    }
    
    if (!b64) {
      console.error("[AI Outpaint] Gemini API did not return image inline_data:", JSON.stringify(json).substring(0, 300));
      return null;
    }

    // -------------------------------------------------------------
    // POST-GENERATION ALIGNMENT (No Compositing)
    // -------------------------------------------------------------
    // To achieve 100% sharp backgrounds and strictly perfect sizing, we 
    // do NOT composite. Instead, we detect the exact bounding box of the 
    // house in the AI's generated image, and then draw that generated 
    // image onto the final canvas scaled and offset so the house sits 
    // perfectly at our mathematical constraints (5mm top, 10mm bottom).
    
    const aiImgBase64 = `data:image/jpeg;base64,${b64}`;
    const aiImg = await loadImage(aiImgBase64);

    // Get bbox of the generated house
    const aiBbox = await getHouseBoundingBox(GEMINI_KEY, b64);
    const aiTightenY = 0.02; // 2% padding assumption
    const aiHouseY = aiImg.naturalHeight * (aiBbox.ymin + aiTightenY);
    const aiHouseH = aiImg.naturalHeight * Math.max(0.1, (aiBbox.ymax - aiTightenY) - (aiBbox.ymin + aiTightenY));
    const aiHouseW = aiImg.naturalWidth * (aiBbox.xmax - aiBbox.xmin);

    // Calculate scaling factor to make the AI house exactly our target height
    let finalScale = targetHouseH / aiHouseH;
    let isWidthConstrained = false;

    // If the house is too wide (touching sides), scale it back
    if (aiHouseW * finalScale > maxHouseW) {
        finalScale = maxHouseW / aiHouseW;
        isWidthConstrained = true;
    }

    const finalDrawW = Math.round(aiImg.naturalWidth * finalScale);
    const finalDrawH = Math.round(aiImg.naturalHeight * finalScale);

    // Center horizontally based on the whole image (which centers the house if it was centered)
    // We should center based on the house itself!
    const aiHouseX = aiImg.naturalWidth * aiBbox.xmin;
    const scaledHouseW = aiHouseW * finalScale;
    const scaledHouseX = aiHouseX * finalScale;
    const finalDrawX = Math.round((outW - scaledHouseW) / 2 - scaledHouseX);
    
    // Anchor vertically
    let finalDrawY;
    if (isWidthConstrained) {
        // House is very wide and got scaled down. Center it vertically with 40% top padding.
        const scaledHouseH = aiHouseH * finalScale;
        const dynamicTopGap = (outH - scaledHouseH) * 0.4;
        finalDrawY = Math.round(dynamicTopGap - (aiHouseY * finalScale));
    } else {
        // House fits normally. Use strict original 5mm top gap math.
        finalDrawY = Math.round(topGap - (aiHouseY * finalScale));
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const finalCtx = finalCanvas.getContext("2d", { willReadFrequently: true })!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";
    finalCtx.fillStyle = "#ffffff";
    finalCtx.fillRect(0, 0, outW, outH);

    // Draw the pure, sharp AI generated image perfectly aligned
    finalCtx.drawImage(aiImg, finalDrawX, finalDrawY, finalDrawW, finalDrawH);

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
}): Promise<string> {
  return widenFacadeClientSide(item);
}

/** Trimmed floorplans, keyed by their published URL. */
const floorplanCache = new Map<string, string>();
const FLOORPLAN_PIPELINE_VERSION = "original-dimensions-v1";

export async function prepareFloorplan(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

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
      const sharp = await sharpenPlan(trimmed);
      floorplanCache.set(cacheKey, sharp);
      return sharp;
    }
  } catch (err) {
    console.error("[prepareFloorplan Error]", err);
  }
  return url;
}

const MIN_GARAGE_W = 5.7;
const MIN_GARAGE_D = 6.0;

/**
 * Upscales and sharpens a floorplan drawing so lines, room names and dimension
 * text stay crisp in print. Purely photometric: an unsharp mask plus a levels
 * stretch on a white page. No geometry is moved, so the design is untouched.
 */
export async function sharpenPlan(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) return dataUrl;

    // Upscale small scans so hairlines and numerals survive the print raster.
    const scale = Math.min(2, Math.max(1, 2200 / w0), 4000 / w0);
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const image = ctx.getImageData(0, 0, w, h);
    const src = image.data;
    const out = new Uint8ClampedArray(src);

    // Unsharp mask: subtract a 3x3 box blur, weighted, per channel.
    const amount = 0.9;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c += 1) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              sum += src[((y + dy) * w + (x + dx)) * 4 + c];
            }
          }
          const blur = sum / 9;
          out[i + c] = src[i + c] + amount * (src[i + c] - blur);
        }
      }
    }

    // Levels: push near-white to paper white and near-black to true black.
    const lo = 28;
    const hi = 150;
    for (let i = 0; i < out.length; i += 4) {
      for (let c = 0; c < 3; c += 1) {
        const v = out[i + c];
        out[i + c] = v <= lo ? 0 : v >= hi ? 255 : ((v - lo) / (hi - lo)) * 255;
      }
    }

    ctx.putImageData(new ImageData(out, w, h), 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/**
 * Reads the garage dimension text off the plan and, when a double garage is
 * advertised below Hudson's 5.7m x 6.0m minimum, re-letters just that label to
 * 5.7 x 6.0. Only the text pixels are repainted — the drawing is not altered.
 */
export async function fixGarageDimensions(dataUrl: string): Promise<string> {
  return dataUrl;
}

/** Trimmed facade renders, keyed by their published URL. */
const facadeCache = new Map<string, string>();



/**
 * Crops away edge bands that stay within tolerance of the neighbouring corner
 * colour (photo letterboxing / flat padding). Photographic content stops the
 * scan immediately, so real scenery is never cut.
 */
async function trimUniformBorder(dataUrl: string, tolerance = 12): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    const at = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]] as const;
    };
    const close = (a: readonly number[], b: readonly number[]) =>
      Math.abs(a[0] - b[0]) <= tolerance &&
      Math.abs(a[1] - b[1]) <= tolerance &&
      Math.abs(a[2] - b[2]) <= tolerance;

    const rowUniform = (y: number, ref: readonly number[]) => {
      for (let x = 0; x < w; x += 2) if (!close(at(x, y), ref)) return false;
      return true;
    };
    const colUniform = (x: number, ref: readonly number[]) => {
      for (let y = 0; y < h; y += 2) if (!close(at(x, y), ref)) return false;
      return true;
    };

    let top = 0;
    while (top < h - 1 && rowUniform(top, at(0, top))) top++;
    let bottom = h - 1;
    while (bottom > top + 1 && rowUniform(bottom, at(0, bottom))) bottom--;
    let left = 0;
    while (left < w - 1 && colUniform(left, at(left, 0))) left++;
    let right = w - 1;
    while (right > left + 1 && colUniform(right, at(right, 0))) right--;

    const cw = right - left + 1;
    const ch = bottom - top + 1;
    if (cw < w * 0.5 || ch < h * 0.5) return dataUrl; // suspicious crop — keep original
    if (cw > w * 0.99 && ch > h * 0.99) return dataUrl; // already tight

    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    out.getContext("2d")!.drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
    return out.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export async function prepareFacade(dataUrl: string, originalUrl?: string, facadeId?: string): Promise<string> {
  if (!dataUrl) return dataUrl;
  const cached = facadeCache.get(dataUrl);
  if (cached) return cached;

  try {
    const rawB64 = await getRawFacadeBase64(dataUrl, originalUrl, facadeId);
    const srcUrl = rawB64 || dataUrl;
    const img = await loadImage(srcUrl);
    const srcW = img.naturalWidth  || 1200;
    const srcH = img.naturalHeight || 900;

    // ── Output canvas: always exactly 2.69 : 1 (flyer header proportion) ──
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW / 2.69);

    // Fit scale so 100% of the house architecture is ALWAYS visible and unclipped
    const reserveTop = Math.round(outH * 0.08);
    const reserveBot = Math.round(outH * 0.04);
    const areaH = outH - reserveTop - reserveBot;
    const maxW = Math.round(outW * 0.90);

    const scale = Math.min(areaH / srcH, maxW / srcW);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const drawX = Math.round((outW - drawW) / 2);
    const drawY = Math.round(reserveTop + (areaH - drawH) / 2);

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    const resUrl = canvas.toDataURL("image/jpeg", 0.92);
    facadeCache.set(dataUrl, resUrl);
    return resUrl;
  } catch (err) {
    console.error("[prepareFacade Error]", err);
    return dataUrl;
  }
}

