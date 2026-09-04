import { INCLUSION_RANGES, type FlyerData } from "@/components/flyer/types";

/**
 * Builds the standard PDF filename according to Hudson Homes specification:
 * "H+L - (Suburb) - (Floorplan Name) - (Facade Name) - (Inclusion Range)"
 */
export function buildFlyerPdfFilename(data: FlyerData): string {
  const suburb = data.suburb?.trim() || "Package";
  const plan = data.floorplanName?.trim() || data.designName?.trim() || "Design";
  const facade = data.facadeName?.trim() || "Facade";
  const rangeObj = INCLUSION_RANGES.find((r) => r.id === data.range);
  const rangeLabel = rangeObj ? rangeObj.label : "Designer Range";

  return `H+L - ${suburb} - ${plan} - ${facade} - ${rangeLabel}`;
}

function safeFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleaned || "H+L - Hudson Homes Flyer"}.pdf`;
}

/** Renders high-resolution print-ready A4 sheets and returns the jsPDF instance. */
export async function renderA4PdfDocument(root?: ParentNode) {
  // Support both House & Land flyers (.flyer-page) and Builders Estimate Quotes (.quote-page)
  let sheets: HTMLElement[] = [];
  
  if (root) {
    sheets = Array.from(root.querySelectorAll<HTMLElement>(".quote-page, .flyer-page"));
  }
  
  if (!sheets.length) {
    const visibleContainer = document.querySelector(
      ".quote-pdf-root:not(#quote-pdf-export-container), .flyer-preview-container, .tender-master-pdf-root"
    );
    if (visibleContainer) {
      sheets = Array.from(visibleContainer.querySelectorAll<HTMLElement>(".quote-page, .flyer-page"));
    }
  }

  if (!sheets.length) {
    const exportContainer = document.getElementById("quote-pdf-export-container");
    if (exportContainer) {
      sheets = Array.from(exportContainer.querySelectorAll<HTMLElement>(".quote-page, .flyer-page"));
    }
  }

  if (!sheets.length) {
    sheets = Array.from(document.querySelectorAll<HTMLElement>(".quote-page, .flyer-page"));
  }

  if (!sheets.length) throw new Error("No PDF printable pages found (.quote-page or .flyer-page)");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  let pagesAddedCount = 0;

  for (let index = 0; index < sheets.length; index += 1) {
    const originalSheet = sheets[index];

    // Create an isolated host container positioned offscreen with explicit A4 pixel dimensions
    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.top = "0";
    host.style.left = "0";
    host.style.zIndex = "-99999";
    host.style.opacity = "1";
    host.style.pointerEvents = "none";
    host.style.width = "794px"; // 210mm @ 96dpi
    host.style.minHeight = "1123px"; // 297mm @ 96dpi
    host.style.height = "1123px";
    host.style.overflow = "hidden";
    host.style.background = "#ffffff";
    host.style.boxSizing = "border-box";
    host.style.fontFamily = "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    (host.style as any).webkitFontSmoothing = "antialiased";
    (host.style as any).mozOsxFontSmoothing = "grayscale";

    const clone = originalSheet.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    clone.style.opacity = "1";
    clone.style.boxSizing = "border-box";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.width = "794px";
    clone.style.height = "1123px";
    clone.style.minHeight = "1123px";
    clone.style.maxHeight = "1123px";
    clone.style.overflow = "hidden";
    clone.style.fontFamily = "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    (clone.style as any).webkitFontSmoothing = "antialiased";
    (clone.style as any).mozOsxFontSmoothing = "grayscale";

    // Ensure all images inside clone retain 100% opacity and high-contrast rendering
    const cloneImages = Array.from(clone.querySelectorAll("img"));
    const origImages = Array.from(originalSheet.querySelectorAll("img"));

    cloneImages.forEach((img, i) => {
      img.style.opacity = "1";
      img.style.transition = "none";
      img.style.imageRendering = "-webkit-optimize-contrast";

      const origImg = origImages[i];
      if (origImg && origImg.src) {
        let rawSrc = origImg.src;
        // Strip WordPress thumbnail dimensions (-738x419, etc.) to load 3000px+ master original
        if (rawSrc.includes("wp-content/uploads")) {
          rawSrc = rawSrc.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))/gi, "$1");
        }
        img.src = rawSrc;
      }
    });

    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      // Wait for fonts and all images to settle
      await Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        ...cloneImages.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete && image.naturalWidth > 0) {
                resolve();
              } else {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }
            }),
        ),
      ]);

      // Render canvas at 2.4x scale (approx 250-300 DPI studio print resolution)
      const canvas = await html2canvas(clone, {
        backgroundColor: "#ffffff",
        scale: 2.4,
        useCORS: true,
        logging: false,
        windowWidth: 794,
        windowHeight: 1123,
        imageTimeout: 15000,
        allowTaint: false,
      });

      // Enforce strict ISO A4 page dimensions (210mm x 297mm)
      if (pagesAddedCount > 0) {
        pdf.addPage([210, 297], "portrait");
      }

      // Use high-quality JPEG with fallback for crystal-clear output
      try {
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        pagesAddedCount++;
      } catch (dataUrlErr) {
        console.warn("Retrying canvas dataURL with PNG format...", dataUrlErr);
        const imgDataPng = canvas.toDataURL("image/png");
        pdf.addImage(imgDataPng, "PNG", 0, 0, 210, 297, undefined, "FAST");
        pagesAddedCount++;
      }
    } catch (pageErr) {
      console.error(`Error rendering PDF page ${index + 1}:`, pageErr);
      // Fallback: render clone without image taint issues
      try {
        const fallbackCanvas = await html2canvas(clone, {
          backgroundColor: "#ffffff",
          scale: 2.0,
          useCORS: false,
          allowTaint: true,
          logging: false,
          windowWidth: 794,
          windowHeight: 1123,
        });
        if (pagesAddedCount > 0) {
          pdf.addPage([210, 297], "portrait");
        }
        const imgData = fallbackCanvas.toDataURL("image/jpeg", 0.90);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        pagesAddedCount++;
      } catch (fallbackErr) {
        console.error(`Fatal page render failure on page ${index + 1}:`, fallbackErr);
      }
    } finally {
      host.remove();
    }
  }

  return pdf;
}

/** Downloads high-resolution print-ready A4 sheets directly as a PDF. */
export async function downloadA4Pdf(root: ParentNode | undefined, filename: string) {
  const pdf = await renderA4PdfDocument(root);
  pdf.save(safeFilename(filename));
}

/** Renders high-resolution print-ready A4 sheets directly into a PDF Blob. */
export async function renderA4PdfBlob(root?: ParentNode): Promise<Blob> {
  const pdf = await renderA4PdfDocument(root);
  return pdf.output("blob");
}