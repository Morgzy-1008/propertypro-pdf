import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure worker source to match the exact bundled pdfjs version
if (typeof window !== "undefined") {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn("[pdfPages] Could not initialize pdf.worker.min.mjs:", e);
  }
}

export interface DocumentPagesAndText {
  pages: string[];
  rawText: string;
  filename: string;
}

/** Extracts both rendered page images and embedded text from a PDF or image file. */
export async function pdfDocumentToPagesAndText(file: File, maxPages = 12): Promise<DocumentPagesAndText> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { pages: [url], rawText: "", filename: file.name };
  }

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  });

  const doc = await loadingTask.promise;
  const pages: string[] = [];
  const textChunks: string[] = [];

  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i += 1) {
    const page = await doc.getPage(i);
    
    // Extract text content from page
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      if (pageText.trim()) {
        textChunks.push(pageText);
      }
    } catch {}

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
    pages.push(canvas.toDataURL("image/jpeg", 0.85));
  }

  return {
    pages,
    rawText: textChunks.join("\n\n"),
    filename: file.name,
  };
}

/** Renders every page of a PDF (or a plain image file) to PNG/JPEG data URLs. */
export async function pdfPagesToDataUrls(file: File, maxPages = 12): Promise<string[]> {
  const result = await pdfDocumentToPagesAndText(file, maxPages);
  return result.pages;
}

