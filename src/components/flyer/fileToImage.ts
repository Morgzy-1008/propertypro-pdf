export * from "./facadeEngine";
export * from "./floorplanEngine";

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

export function loadImage(src: string): Promise<HTMLImageElement> {
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
    const isInk = (x: number, y: number) => {
      const idx = (y * W + x) * 4;
      return (
        data[idx] < THRESHOLD ||
        data[idx + 1] < THRESHOLD ||
        data[idx + 2] < THRESHOLD
      );
    };

    // 1. Initial bounding box of any ink on the page.
    let minX = W, maxX = 0, minY = H, maxY = 0;
    const STEP = 2;
    for (let y = 0; y < H; y += STEP) {
      for (let x = 0; x < W; x += STEP) {
        if (isInk(x, y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minX >= maxX || minY >= maxY) return dataUrl;

    // 2. Strip standard framing borders.
    const BORDER_INSET = Math.round(Math.min(W, H) * 0.015);
    minX = Math.min(maxX, minX + BORDER_INSET);
    maxX = Math.max(minX, maxX - BORDER_INSET);
    minY = Math.min(maxY, minY + BORDER_INSET);
    maxY = Math.max(minY, maxY - BORDER_INSET);

    const cropW = maxX - minX;
    const cropH = maxY - minY;
    if (cropW < 50 || cropH < 50) return dataUrl;

    const out = document.createElement("canvas");
    out.width = cropW;
    out.height = cropH;
    const outCtx = out.getContext("2d")!;
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return out.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function cropToContent(dataUrl: string, paddingRatio = 0.02): Promise<string> {
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

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    const THRESHOLD = 240;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        if (data[i] < THRESHOLD || data[i + 1] < THRESHOLD || data[i + 2] < THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX >= maxX || minY >= maxY) return dataUrl;

    const padX = Math.round(w * paddingRatio);
    const padY = Math.round(h * paddingRatio);

    const x0 = Math.max(0, minX - padX);
    const y0 = Math.max(0, minY - padY);
    const x1 = Math.min(w, maxX + padX);
    const y1 = Math.min(h, maxY + padY);

    const cropW = x1 - x0;
    const cropH = y1 - y0;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cCtx = cropCanvas.getContext("2d")!;
    cCtx.fillStyle = "#ffffff";
    cCtx.fillRect(0, 0, cropW, cropH);
    cCtx.drawImage(canvas, x0, y0, cropW, cropH, 0, 0, cropW, cropH);

    return cropCanvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}
