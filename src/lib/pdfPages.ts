import * as pdfjs from "pdfjs-dist";

// Configure worker source statically so dynamic chunk fetching never fails
if (typeof window !== "undefined") {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  } catch (e) {
    console.warn("[pdfPages] Could not initialize pdf.worker.min.mjs:", e);
  }
}

/** Renders every page of a PDF (or a plain image file) to PNG/JPEG data URLs. */
export async function pdfPagesToDataUrls(file: File, maxPages = 12): Promise<string[]> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return [url];
  }

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: "https://unpkg.com/pdfjs-dist@6.1.200/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "https://unpkg.com/pdfjs-dist@6.1.200/standard_fonts/",
  });

  const doc = await loadingTask.promise;
  const out: string[] = [];

  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i += 1) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1600 / base.width, 2.5);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.85));
  }

  return out;
}

