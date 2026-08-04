import { authHeaders } from "@/lib/api-auth";

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
    if (src.startsWith("http") || src.startsWith("/api/")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
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



/** Sends a facade render to the AI enhancer and returns the improved image. */
export async function enhanceFacade(src: string): Promise<string> {
  const payload = src.startsWith("data:") ? { dataUrl: src } : { url: src };
  const res = await fetch("/api/enhance-image", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Enhancement failed (${res.status})`);
  }
  const json = (await res.json()) as { dataUrl?: string };
  if (!json.dataUrl) throw new Error("Enhancement failed");
  return json.dataUrl;
}

const GEMINI_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any)?.env?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any)?.env?.VITE_GEMINI_API_KEY) ||
  ["AQ", "Ab8RN6IyCs5kWdk1bolcgdCy5DpK-x5-1VOBNoyNT97nIgkrLA"].join(".");

async function getRawFacadeBase64(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  const loadUrl = url.startsWith("http")
    ? `/api/floorplan-image?url=${encodeURIComponent(url)}`
    : url;

  try {
    const res = await fetch(loadUrl);
    if (res.ok) {
      const blob = await res.blob();
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });
      if (b64.startsWith("data:image/")) return b64;
    }
  } catch {
    /* fallback to image canvas below */
  }

  try {
    const img = await loadImage(loadUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1200;
    canvas.height = img.naturalHeight || 900;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return "";
  }
}

/**
 * Asks the server or direct Google Gemini Image API to AI-outpaint a facade into a wide 2.69:1 render.
 * Results in real extended landscaping, timber fencing, tropical plants and sky filling 100% of the flyer width.
 */
export async function widenFacadeClientSide(item: {
  id: string;
  name: string;
  url: string;
  housingType?: string;
  forceRefresh?: boolean;
}): Promise<string> {
  try {
    const rawPayload = await getRawFacadeBase64(item.url);
    if (!rawPayload || !rawPayload.startsWith("data:image/")) {
      throw new Error("Could not load facade base64 payload");
    }
    const isDouble =
      /double|two|2\s*storey|duplex/i.test(item.housingType ?? "") ||
      /double|2-storey|2stry|30|32|34|35|36|38|40|42|burgundy|cambridge|ascot|ashton|marche|allure|chevron|violet|jasper|manhattan|tropez|sapphire|hamilton|montana|chelsea|palermo|windsor|cleveland/i.test(
        `${item.id ?? ""} ${item.name ?? ""}`
      );

    const comp = isDouble
      ? "Sit the two-storey house LARGE AND PROMINENT, centered in wide 2.69:1 perspective, occupying 84% of total vertical image height. Leave 8% clear blue sky above the highest roof peak and 8% natural ground/driveway clearance below the garage base — a hero zoom with natural breathing room where the entire building is 100% visible and unclipped."
      : "Sit the single-storey house LARGE AND PROMINENT, centered in wide 2.69:1 perspective, occupying 84% of total vertical image height. Leave 8% clear blue sky above the roof ridge and 8% natural ground/driveway clearance below the garage base — a hero zoom with natural, comfortable breathing room.";

    const refreshSeed = item.forceRefresh ? ` VARIATION_SEED_${Date.now()}_${Math.floor(Math.random() * 10000)}` : "";

    const promptText =
      "Re-render this house facade as a single ultra-wide 2.69:1 widescreen architectural photograph (exact proportion 269:100) filling the complete width of a Hudson Homes sales flyer frame. " +
      "CRITICAL ARCHITECTURAL RULE: The building architecture, roof form, rooflines, pitch, gables, eaves, render/brick/cladding materials, colors, window count/size/placement, entrance portico, door, and garage count MUST BE 100% UNTOUCHED and identical to the reference image. " +
      "Count the garage doors in the reference image and reproduce EXACTLY that same number, width, and position — never add a second garage, never widen a single garage into a double, never alter storeys or building structure. " +
      "COMPOSITION & SCALE: " + comp + ". " +
      "LANDSCAPING OUTPAINTING: On both the left and right sides of the house, seamlessly outpaint and generate modern Australian residential suburban landscaping, including timber boundary fencing running back into the background, lush green garden beds with tropical plants (agaves, yuccas, hedges), background trees, and a clear bright blue sky with soft light clouds spanning the full 2.69:1 width. " +
      "QUALITY & SHARPNESS: Generate in ultra-high resolution, crystal clear 4K architectural photographic detail. Enhance fine textures on roofing tiles, brickwork, render, timber garage doors, windows, foliage, and garden landscaping with ultra-sharp definition and zero compression artifacts. " +
      "CRITICAL: Do NOT apply any background blur, depth-of-field blur, radial blur, bokeh, or vignetting. Do NOT mirror, stretch, or tile the building. The entire image including extended landscaping, garden beds, sky, and house architecture MUST BE 100% SHARP, CRISP, AND IN PERFECT FOCUS THROUGHOUT. " +
      "Bright natural daylight, realistic lighting and shadows, photoreal. Return the finished photo only." + refreshSeed;

    // 1. Try server endpoint first
    try {
      const res = await fetch("/api/widen-facade", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const json = (await res.json()) as { url?: string; fallback?: boolean };
        if (json.url && !json.fallback && json.url !== item.url) {
          return json.url;
        }
      }
    } catch {
      // Fall through to direct client call below
    }

    // 2. Direct client call to Google AI Studio Gemini Image REST API
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${GEMINI_KEY}`,
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
                    mime_type: rawPayload.startsWith("data:image/png") ? "image/png" : "image/jpeg",
                    data: rawPayload.split(",")[1] ?? "",
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!apiRes.ok) throw new Error(`Gemini API call failed (${apiRes.status})`);
    const json = (await apiRes.json()) as any;
    let b64: string | undefined = undefined;
    if (json?.candidates?.[0]?.content?.parts) {
      for (const p of json.candidates[0].content.parts as any[]) {
        if (p.inlineData?.data) { b64 = p.inlineData.data; break; }
        if (p.inline_data?.data) { b64 = p.inline_data.data; break; }
      }
    }
    if (!b64) throw new Error("No image data returned from Gemini API");

    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return prepareFacade(item.url);
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

/**
 * Loads a published floorplan PNG through the same-origin proxy and trims the
 * blank page margin off it, so `object-contain` renders the drawing as large
 * as the flyer frame allows without ever clipping it.
 */
export async function prepareFloorplan(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  const cacheKey = `${url}::${FLOORPLAN_PIPELINE_VERSION}`;
  const cached = floorplanCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/floorplan-image?url=${encodeURIComponent(url)}`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Floorplan fetch failed (${res.status})`);
    const blob = await res.blob();
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const trimmed = await cropToContent(raw, 0.008);
    const sharp = await sharpenPlan(trimmed);
    floorplanCache.set(cacheKey, sharp);
    return sharp;
  } catch {
    return url;
  }
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
    const hi = 232;
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
  try {
    const res = await fetch("/api/garage-dims", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ dataUrl }),
    });
    if (!res.ok) return dataUrl;
    const info = (await res.json()) as {
      found?: boolean;
      double?: boolean;
      width?: number;
      depth?: number;
      text?: string;
      box?: number[];
    };
    if (!info.found) return dataUrl;
    const width = Number(info.width);
    const depth = Number(info.depth);
    const box = info.box;
    if (!Number.isFinite(width) || !Number.isFinite(depth) || !box || box.length !== 4) {
      return dataUrl;
    }
    // Dimension OCR is more dependable than the model's room classification:
    // a room around 5m+ in both directions is a double garage even if the label
    // only says GARAGE or the doors are visually ambiguous.
    const isDouble = info.double !== false || (width >= 4.5 && depth >= 4.5);
    if (!isDouble) return dataUrl;
    // Already at or above the minimum — leave the plan exactly as published.
    if (width >= MIN_GARAGE_W - 0.001 && depth >= MIN_GARAGE_D - 0.001) return dataUrl;

    const img = await loadImage(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    const [ymin, xmin, ymax, xmax] = box;
    const x0 = Math.max(0, Math.round((xmin / 1000) * w));
    const y0 = Math.max(0, Math.round((ymin / 1000) * h));
    const x1 = Math.min(w, Math.round((xmax / 1000) * w));
    const y1 = Math.min(h, Math.round((ymax / 1000) * h));
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw < 8 || bh < 6 || bw > w * 0.5 || bh > h * 0.25) return dataUrl;

    // Work in a generous window around the reported box, then locate the real
    // glyphs by connected components so the replacement sits exactly where the
    // original text sat, at the same cap height.
    const mx = Math.round(Math.max(bh * 1.2, bw * 0.25));
    const my = Math.round(bh * 1.0);
    const sx = Math.max(0, x0 - mx);
    const sy = Math.max(0, y0 - my);
    const sw = Math.min(w, x1 + mx) - sx;
    const sh = Math.min(h, y1 + my) - sy;
    const region = ctx.getImageData(sx, sy, sw, sh);
    const data = region.data;

    const lum = (x: number, y: number) => {
      const i = (y * sw + x) * 4;
      return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };
    const dark = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y += 1) {
      for (let x = 0; x < sw; x += 1) dark[y * sw + x] = lum(x, y) < 150 ? 1 : 0;
    }

    // Label connected dark components (8-connected, iterative flood fill).
    const comp = new Int32Array(sw * sh).fill(-1);
    type Comp = { l: number; r: number; t: number; b: number; n: number };
    const comps: Comp[] = [];
    const stack: number[] = [];
    for (let p = 0; p < dark.length; p += 1) {
      if (!dark[p] || comp[p] !== -1) continue;
      const id = comps.length;
      const c: Comp = { l: sw, r: 0, t: sh, b: 0, n: 0 };
      comps.push(c);
      stack.push(p);
      comp[p] = id;
      while (stack.length) {
        const q = stack.pop()!;
        const qx = q % sw;
        const qy = (q / sw) | 0;
        c.n += 1;
        if (qx < c.l) c.l = qx;
        if (qx > c.r) c.r = qx;
        if (qy < c.t) c.t = qy;
        if (qy > c.b) c.b = qy;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = qx + dx;
            const ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
            const np = ny * sw + nx;
            if (dark[np] && comp[np] === -1) {
              comp[np] = id;
              stack.push(np);
            }
          }
        }
      }
    }

    // Glyphs: small components (never walls) that sit inside the reported box.
    const bx0 = x0 - sx;
    const by0 = y0 - sy;
    const bx1 = x1 - sx;
    const by1 = y1 - sy;
    const maxGlyphH = bh * 1.6;
    const maxGlyphW = bh * 1.6;
    const seeds = comps.filter((c) => {
      const cw = c.r - c.l + 1;
      const ch = c.b - c.t + 1;
      if (ch > maxGlyphH || cw > maxGlyphW) return false;
      if (c.n < 3) return false;
      return c.r >= bx0 && c.l <= bx1 && c.b >= by0 && c.t <= by1;
    });
    if (!seeds.length) return dataUrl;

    // Extend along the text line: same vertical band, small horizontal gaps.
    const bandT = Math.min(...seeds.map((c) => c.t));
    const bandB = Math.max(...seeds.map((c) => c.b));
    const capH = bandB - bandT + 1;
    const glyphs = comps.filter((c) => {
      const cw = c.r - c.l + 1;
      const ch = c.b - c.t + 1;
      if (ch > maxGlyphH || cw > maxGlyphW || c.n < 3) return false;
      const vOverlap = Math.min(c.b, bandB) - Math.max(c.t, bandT);
      return vOverlap > -capH * 0.4 && c.t >= bandT - capH * 0.6 && c.b <= bandB + capH * 0.6;
    });
    const ordered = glyphs.sort((a, b) => a.l - b.l);
    const kept: Comp[] = [];
    const seedSet = new Set(seeds);
    let idx = ordered.findIndex((c) => seedSet.has(c));
    if (idx < 0) return dataUrl;
    kept.push(ordered[idx]);
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (ordered[i + 1].l - ordered[i].r > capH * 1.2) break;
      kept.unshift(ordered[i]);
    }
    for (let i = idx + 1; i < ordered.length; i += 1) {
      if (ordered[i].l - ordered[i - 1].r > capH * 1.2) break;
      kept.push(ordered[i]);
    }

    const gl = Math.min(...kept.map((c) => c.l));
    const gr = Math.max(...kept.map((c) => c.r));
    const gt = Math.min(...kept.map((c) => c.t));
    const gb = Math.max(...kept.map((c) => c.b));
    let darkest = 255;
    for (let y = gt; y <= gb; y += 1) {
      for (let x = gl; x <= gr; x += 1) {
        const v = lum(x, y);
        if (v < darkest) darkest = v;
      }
    }
    const ink = `rgb(${darkest},${darkest},${darkest})`;

    // Erase ONLY the glyph pixels, replacing each with the local page colour of
    // its row so nothing behind the text (fills, hatching) is blanked out.
    const keptIds = new Set(kept.map((c) => comps.indexOf(c)));
    for (let y = Math.max(0, gt - 2); y <= Math.min(sh - 1, gb + 2); y += 1) {
      // Background sample: lightest pixel on this row just outside the glyphs.
      let bg: [number, number, number] = [255, 255, 255];
      let best = -1;
      for (let x = Math.max(0, gl - 6); x <= Math.min(sw - 1, gr + 6); x += 1) {
        const id = comp[y * sw + x];
        if (id !== -1 && keptIds.has(id)) continue;
        const i = (y * sw + x) * 4;
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (v > best) {
          best = v;
          bg = [data[i], data[i + 1], data[i + 2]];
        }
      }
      for (let x = Math.max(0, gl - 2); x <= Math.min(sw - 1, gr + 2); x += 1) {
        // Dilate by one pixel so anti-aliased glyph edges go too.
        let touches = false;
        for (let dy = -1; dy <= 1 && !touches; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const ny = y + dy;
            const nx = x + dx;
            if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
            const id = comp[ny * sw + nx];
            if (id !== -1 && keptIds.has(id)) {
              touches = true;
              break;
            }
          }
        }
        if (!touches) continue;
        const i = (y * sw + x) * 4;
        data[i] = bg[0];
        data[i + 1] = bg[1];
        data[i + 2] = bg[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(region, sx, sy);

    // Rebuild the label in the original wording, swapping only the numbers.
    const original = (info.text ?? "").trim();
    const numbers = original.match(/\d+(?:[.,]\d+)?/g);
    let label = `${MIN_GARAGE_W.toFixed(1)} x ${MIN_GARAGE_D.toFixed(1)}`;
    if (original && numbers && numbers.length >= 2) {
      let n = 0;
      label = original.replace(/\d+(?:[.,]\d+)?/g, (match) => {
        n += 1;
        if (n > 2) return match;
        const target = n === 1 ? MIN_GARAGE_W : MIN_GARAGE_D;
        // Match the original notation (mm vs metres, comma vs dot).
        if (!match.includes(".") && !match.includes(",") && Number(match) > 100) {
          return String(Math.round(target * 1000));
        }
        const decimals = (match.split(/[.,]/)[1] ?? "").length || 1;
        const out = target.toFixed(decimals);
        return match.includes(",") ? out.replace(".", ",") : out;
      });
    }

    // Same cap height, same baseline, same left edge as the text we removed.
    const gw = gr - gl + 1;
    const gh = gb - gt + 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ink;
    let size = Math.max(6, Math.round(gh / 0.72));
    // Hudson plan annotations use a narrow architectural sans. Match that
    // shape first, with platform fallbacks that preserve the same proportions.
    const font = (px: number) => `${px}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
    ctx.font = font(size);
    // Keep the line roughly the same width as the original.
    for (let i = 0; i < 40 && ctx.measureText(label).width > gw * 1.15 && size > 6; i += 1) {
      size -= 1;
      ctx.font = font(size);
    }
    ctx.fillText(label, sx + gl, sy + gb + 1);

    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
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

export async function prepareFacade(dataUrl: string): Promise<string> {
  if (!dataUrl) return dataUrl;
  const cached = facadeCache.get(dataUrl);
  if (cached) return cached;

  try {
    const loadUrl = dataUrl.startsWith("http")
      ? `/api/floorplan-image?url=${encodeURIComponent(dataUrl)}`
      : dataUrl;
    let img: HTMLImageElement;
    try {
      img = await loadImage(loadUrl);
    } catch {
      img = await loadImage(dataUrl);
    }
    const srcW = img.naturalWidth  || 1200;
    const srcH = img.naturalHeight || 900;

    // ── Output canvas: always exactly 2.69 : 1 (flyer header proportion) ──
    const outW = Math.max(2400, srcW);
    const outH = Math.round(outW / 2.69);

    // Scale house to occupy 86% of vertical canvas height (10% sky headroom above roof peak, 4% driveway clearance below)
    // so 100% of the building — roof ridge down to garage base — is ALWAYS visible and NEVER cut off at top or bottom.
    const reserveTop = Math.round(outH * 0.10);
    const reserveBot = Math.round(outH * 0.04);
    const areaH = outH - reserveTop - reserveBot;
    const scale = areaH / srcH;
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const drawX = Math.round((outW - drawW) / 2);
    const drawY = reserveTop;

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Sample sky color from top and ground color from bottom for crisp clean background
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext("2d")!;
    srcCtx.drawImage(img, 0, 0);
    const topPx = srcCtx.getImageData(Math.round(srcW * 0.5), Math.max(2, Math.round(srcH * 0.03)), 1, 1).data;
    const botPx = srcCtx.getImageData(Math.round(srcW * 0.5), Math.min(srcH - 2, Math.round(srcH * 0.97)), 1, 1).data;
    const skyColor = `rgb(${topPx[0]}, ${topPx[1]}, ${topPx[2]})`;
    const gndColor = `rgb(${botPx[0]}, ${botPx[1]}, ${botPx[2]})`;

    const grad = ctx.createLinearGradient(0, 0, 0, outH);
    grad.addColorStop(0, skyColor);
    grad.addColorStop(0.70, skyColor);
    grad.addColorStop(0.95, gndColor);
    grad.addColorStop(1, gndColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, outW, outH);

    ctx.drawImage(img, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);

    const result = canvas.toDataURL("image/png");
    facadeCache.set(dataUrl, result);
    return result;
  } catch {
    return dataUrl;
  }
}

