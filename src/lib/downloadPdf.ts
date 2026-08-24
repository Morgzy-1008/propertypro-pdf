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

/** Downloads high-resolution print-ready A4 sheets directly as a PDF. */
export async function downloadA4Pdf(root: ParentNode, filename: string) {
  // Support both House & Land flyers (.flyer-page) and Builders Estimate Quotes (.quote-page)
  let sheets = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".flyer-preview-container .flyer-page, .quote-pdf-root .quote-page, #quote-pdf-export-container .quote-page, .quote-page, .flyer-page"
    ),
  );
  if (!sheets.length && root) {
    sheets = Array.from(root.querySelectorAll<HTMLElement>(".flyer-page, .quote-page"));
  }
  if (!sheets.length) {
    sheets = Array.from(document.querySelectorAll<HTMLElement>(".flyer-page, .quote-page"));
  }
  if (!sheets.length) throw new Error("No PDF printable pages found (.quote-page or .flyer-page)");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (let index = 0; index < sheets.length; index += 1) {
    const originalSheet = sheets[index];

    // Create an isolated host container positioned behind the page with explicit A4 pixel dimensions
    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.top = "0";
    host.style.left = "0";
    host.style.zIndex = "-99999";
    host.style.opacity = "1";
    host.style.pointerEvents = "none";
    host.style.width = "794px"; // 210mm @ 96dpi
    host.style.height = "1123px"; // 297mm @ 96dpi
    host.style.minHeight = "1123px";
    host.style.maxHeight = "1123px";
    host.style.overflow = "hidden";
    host.style.background = "#ffffff";
    host.style.boxSizing = "border-box";

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

    if (originalSheet.classList.contains("quote-page")) {
      clone.style.display = "flex";
      clone.style.flexDirection = "column";
      clone.style.justifyContent = "space-between";
    }

    // Ensure all images inside clone retain 100% opacity and high-contrast rendering
    const cloneImages = Array.from(clone.querySelectorAll("img"));
    const origImages = Array.from(originalSheet.querySelectorAll("img"));

    cloneImages.forEach((img, i) => {
      img.style.opacity = "1";
      img.style.transition = "none";
      img.style.imageRendering = "-webkit-optimize-contrast";

      let rawSrc = origImages[i] && origImages[i].src ? origImages[i].src : img.src;
      // Strip WordPress thumbnail dimensions (-738x419, -1170x657, etc.) to load 3000px+ master original
      if (rawSrc && rawSrc.includes("wp-content/uploads")) {
        rawSrc = rawSrc.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))/gi, "$1");
      }
      img.src = rawSrc;
      img.setAttribute("crossOrigin", "anonymous");
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

      // Render canvas at 2.5x scale (approx 250-300 DPI studio print resolution)
      const canvas = await html2canvas(clone, {
        backgroundColor: "#ffffff",
        scale: 2.5,
        useCORS: true,
        logging: false,
        windowWidth: 794,
        windowHeight: 1123,
        imageTimeout: 15000,
        allowTaint: true,
      });

      // Enforce strict ISO A4 page dimensions (210mm x 297mm)
      if (index > 0) {
        pdf.addPage([210, 297], "portrait");
      }

      // Use high-quality JPEG for fast generation and compact, crystal-clear output
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    } finally {
      host.remove();
    }
  }

  pdf.save(safeFilename(filename));
}