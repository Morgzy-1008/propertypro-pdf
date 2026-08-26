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
    
    // Extract structured text content from page using Y/X coordinates for table rows
    try {
      const textContent = await page.getTextContent();
      const items = (textContent.items || []).filter(
        (it: any) => it && typeof it.str === "string" && it.str.trim() !== ""
      );

      if (items.length > 0) {
        // Sort top to bottom (Y descending), then left to right (X ascending)
        items.sort((a: any, b: any) => {
          const yA = a.transform ? a.transform[5] : 0;
          const yB = b.transform ? b.transform[5] : 0;
          if (Math.abs(yA - yB) > 4) {
            return yB - yA;
          }
          const xA = a.transform ? a.transform[4] : 0;
          const xB = b.transform ? b.transform[4] : 0;
          return xA - xB;
        });

        const lines: string[] = [];
        let currentLine: string[] = [];
        let lastY: number | null = null;

        for (const it of items) {
          const y = it.transform ? it.transform[5] : 0;
          if (lastY !== null && Math.abs(y - lastY) > 4) {
            if (currentLine.length > 0) {
              lines.push(currentLine.join("\t"));
              currentLine = [];
            }
          }
          currentLine.push(it.str.trim());
          lastY = y;
        }
        if (currentLine.length > 0) {
          lines.push(currentLine.join("\t"));
        }

        if (lines.length > 0) {
          textChunks.push(lines.join("\n"));
        }
      }
    } catch (e) {
      console.warn("[pdfPages] Text extraction warning:", e);
    }

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
    pages.push(canvas.toDataURL("image/png"));
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

