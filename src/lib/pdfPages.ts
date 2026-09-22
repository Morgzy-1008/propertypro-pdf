import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";

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
  primaryFloorplanIndex?: number;
  primaryFloorplanDataUrl?: string;
  compositeFloorplanDataUrl?: string;
}

/** Scores a page's text content to determine if it is a genuine architectural floorplan drawing. */
export function scoreFloorplanPage(text: string): { score: number; isGround: boolean; isFirst: boolean } {
  const lower = text.toLowerCase();
  let score = 0;
  if (lower.includes("floor plan") || lower.includes("floorplan")) score += 15;
  if (lower.includes("ground floor") || lower.includes("ground floor plan")) score += 20;
  if (lower.includes("first floor") || lower.includes("first floor plan") || lower.includes("upper floor")) score += 20;
  if (lower.includes("living") || lower.includes("family")) score += 6;
  if (lower.includes("kitchen") || lower.includes("meals")) score += 6;
  if (lower.includes("alfresco") || lower.includes("patio")) score += 6;
  if (lower.includes("bed 1") || lower.includes("master bed") || lower.includes("bed 2")) score += 6;
  if (lower.includes("garage")) score += 5;
  if (lower.includes("ensuite") || lower.includes("bath")) score += 5;
  if (lower.includes("wir") || lower.includes("robe")) score += 4;

  // Negative indicators for sheets that are NOT floorplans
  if (lower.includes("perspective") || lower.includes("perspectives")) score -= 25;
  if (lower.includes("site plan") || lower.includes("cdc") || lower.includes("complying development")) score -= 20;
  if (lower.includes("roof plan") || lower.includes("roof area")) score -= 25;
  if (lower.includes("elevations") || lower.includes("elevation")) score -= 20;
  if (lower.includes("slab platform") || lower.includes("drainage plan") || lower.includes("hydraulic")) score -= 20;
  if (lower.includes("window schedule") || lower.includes("basix requirements")) score -= 15;
  if (lower.includes("section a-a") || lower.includes("section b-b") || lower.includes("section c-c")) score -= 20;
  if (lower.includes("construction notes") && !lower.includes("bed 1")) score -= 15;
  if (lower.includes("sediment control") || lower.includes("landscape plan")) score -= 20;

  const isGround = lower.includes("ground floor") || (!lower.includes("first floor") && (lower.includes("alfresco") || lower.includes("porch") || lower.includes("garage")));
  const isFirst = lower.includes("first floor") || lower.includes("upper floor");
  return { score, isGround, isFirst };
}

/** Compresses an image or Data URL down to a target size/quality using HTML Canvas. */
export async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 1800,
  maxHeight = 1800,
  quality = 0.88
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Extracts both rendered page images and embedded text from a PDF or image file. */
export async function pdfDocumentToPagesAndText(file: File, maxPages = 12): Promise<DocumentPagesAndText> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    // Automatically optimize image size to ensure no Vercel payload limits
    const optimized = await compressImageDataUrl(rawDataUrl, 1800, 1800, 0.88);
    return {
      pages: [optimized],
      rawText: "",
      filename: file.name,
      primaryFloorplanIndex: 0,
      primaryFloorplanDataUrl: optimized,
    };
  }

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  }

  let doc: any = null;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    });
    doc = await loadingTask.promise;
  } catch (loadErr) {
    console.warn("[pdfPages] Failed to load PDF via worker, attempting fallback:", loadErr);
    // Fallback: load without worker or with CDN worker
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const data = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      doc = await loadingTask.promise;
    } catch (fallbackErr) {
      throw new Error(`Could not parse PDF document: ${(loadErr as any)?.message || "Invalid or encrypted PDF file"}`);
    }
  }

  if (!doc) {
    throw new Error("Could not initialize PDF document reader.");
  }

  const pages: string[] = [];
  const textChunks: string[] = [];
  const pageScores: Array<{ index: number; score: number; isGround: boolean; isFirst: boolean }> = [];

  // Check embedded metadata for stored JSON
  try {
    const meta = await doc.getMetadata();
    if (meta && meta.info) {
      const infoAny = meta.info as any;
      const possibleJson = infoAny.Subject || infoAny.Keywords || infoAny.Custom || "";
      if (typeof possibleJson === "string" && possibleJson.includes("pricing") && possibleJson.includes("client")) {
        textChunks.push(possibleJson);
      }
    }
  } catch {
    // ignore
  }

  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i += 1) {
    try {
      const page = await doc.getPage(i);
      let pageText = "";

      // Extract structured text content from page using Y/X coordinates for table rows
      try {
        const textContent = await page.getTextContent();
        const items = (textContent.items || []).filter(
          (it: any) => it && typeof it.str === "string" && it.str.trim() !== ""
        );

        if (items.length > 0) {
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
            pageText = lines.join("\n");
            textChunks.push(pageText);
          }
        }
      } catch (e) {
        console.warn(`[pdfPages] Page ${i} text extraction warning:`, e);
      }

      // Record floorplan suitability score for this page
      const scored = scoreFloorplanPage(pageText);
      pageScores.push({ index: i - 1, ...scored });

      // Render crisp JPEG image (max 1800px width, 0.88 quality for optimal size & AI clarity)
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1800 / base.width, 2.5);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(canvas.toDataURL("image/jpeg", 0.88));
    } catch (pageRenderErr) {
      console.warn(`[pdfPages] Page ${i} rendering skipped due to error:`, pageRenderErr);
    }
  }

  let extractedRawText = textChunks.join("\n\n").trim();

  // If text is empty/sparse (e.g. rasterized PDF), run OCR on the most likely floorplan page
  if (extractedRawText.length < 50 && pages.length > 0) {
    try {
      const worker = await createWorker("eng");
      const ocrPages = Math.min(pages.length, 3);
      const ocrTexts: string[] = [];
      for (let i = 0; i < ocrPages; i++) {
        const ret = await worker.recognize(pages[i]);
        if (ret && ret.data && ret.data.text) {
          ocrTexts.push(ret.data.text);
        }
      }
      await worker.terminate();
      if (ocrTexts.length > 0) {
        extractedRawText = ocrTexts.join("\n\n");
      }
    } catch (ocrErr) {
      console.warn("[pdfPages] OCR fallback error:", ocrErr);
    }
  }

  // Determine the primary floorplan page based on architectural scoring
  let bestPageIndex = 0;
  let highestScore = -999;
  for (const p of pageScores) {
    if (p.score > highestScore) {
      highestScore = p.score;
      bestPageIndex = p.index;
    }
  }

  // Check if this is a double storey home with Ground Floor and First Floor on separate pages
  let compositeFloorplanDataUrl: string | undefined = undefined;
  const gfPage = pageScores.find((p) => p.isGround && p.score >= 10);
  const ffPage = pageScores.find((p) => p.isFirst && p.score >= 10 && p.index !== gfPage?.index);

  if (gfPage && ffPage && pages[gfPage.index] && pages[ffPage.index]) {
    try {
      // Create a unified side-by-side composite canvas
      const imgGF = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = pages[gfPage.index];
      });
      const imgFF = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = pages[ffPage.index];
      });

      const compWidth = imgGF.width + imgFF.width;
      const compHeight = Math.max(imgGF.height, imgFF.height);
      const compCanvas = document.createElement("canvas");
      compCanvas.width = compWidth;
      compCanvas.height = compHeight;
      const compCtx = compCanvas.getContext("2d");
      if (compCtx) {
        compCtx.fillStyle = "#ffffff";
        compCtx.fillRect(0, 0, compWidth, compHeight);
        compCtx.drawImage(imgGF, 0, 0);
        compCtx.drawImage(imgFF, imgGF.width, 0);
        compositeFloorplanDataUrl = compCanvas.toDataURL("image/jpeg", 0.88);
      }
    } catch (compErr) {
      console.warn("[pdfPages] Failed to create double-storey composite sheet:", compErr);
    }
  }

  const primaryDataUrl = compositeFloorplanDataUrl || pages[bestPageIndex] || pages[0] || "";

  return {
    pages,
    rawText: extractedRawText,
    filename: file.name,
    primaryFloorplanIndex: bestPageIndex,
    primaryFloorplanDataUrl: primaryDataUrl,
    compositeFloorplanDataUrl,
  };
}

/** Renders every page of a PDF (or a plain image file) to PNG/JPEG data URLs. */
export async function pdfPagesToDataUrls(file: File, maxPages = 12): Promise<string[]> {
  const result = await pdfDocumentToPagesAndText(file, maxPages);
  return result.pages;
}
