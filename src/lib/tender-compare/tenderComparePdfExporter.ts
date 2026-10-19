import { jsPDF } from "jspdf";
import { type TenderComparisonSession, type BuilderExtractedData } from "./tenderCompareTypes";

/**
 * Sanitizes any string for jsPDF standard Helvetica font so Unicode symbols,
 * emojis, or smart punctuation never trigger garbled glyphs or wide kerning bugs.
 */
function cleanPdfText(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  return String(input)
    .replace(/m²/gi, "m2")
    .replace(/[×✕]/g, "x")
    .replace(/[–—―]/g, "-")
    .replace(/[•∙·]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/★/g, " Star")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTenderComparisonJsPdf(session: TenderComparisonSession): jsPDF {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm
  const bottomLimit = pageHeight - 16;

  const builders = session.builders.slice(0, 3);
  const winningBuilder =
    builders.find((b) => b.id === session.winningBuilderId) ||
    builders.find((b) => b.isBestValue) ||
    builders[0];

  // Brand Palette
  const navyHeader: [number, number, number] = [15, 23, 42];
  const goldAccent: [number, number, number] = [217, 119, 6];
  const emeraldDark: [number, number, number] = [5, 122, 85];
  const emeraldBg: [number, number, number] = [236, 253, 245];
  const roseDark: [number, number, number] = [190, 18, 60];
  const roseBg: [number, number, number] = [255, 241, 242];
  const amberDark: [number, number, number] = [180, 83, 9];
  const amberBg: [number, number, number] = [254, 243, 199];
  const slateText: [number, number, number] = [51, 65, 85];
  const slateMuted: [number, number, number] = [100, 116, 139];
  const borderLight: [number, number, number] = [226, 232, 240];

  let currentSectionSubtitle = "Executive Value Verdict & True Cost Breakdown";
  let y = 26;

  const drawPageChrome = (subtitle: string) => {
    // Top Navy Banner
    pdf.setFillColor(navyHeader[0], navyHeader[1], navyHeader[2]);
    pdf.rect(0, 0, pageWidth, 17, "F");

    // Gold Accent Line
    pdf.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    pdf.rect(0, 17, pageWidth, 1.2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text("HUDSON HOMES  |  TENDER COMPARE AUDIT", margin, 11);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(cleanPdfText(subtitle).toUpperCase(), pageWidth - margin, 11, { align: "right" });
  };

  const ensureSpace = (neededMm: number, nextPageSubtitle?: string) => {
    if (y + neededMm > bottomLimit) {
      pdf.addPage();
      if (nextPageSubtitle) currentSectionSubtitle = nextPageSubtitle;
      drawPageChrome(currentSectionSubtitle);
      y = 25;
    }
  };

  const drawSectionHeading = (num: string, title: string, subtitle: string) => {
    ensureSpace(18, title);
    y += 2;
    pdf.setFillColor(navyHeader[0], navyHeader[1], navyHeader[2]);
    pdf.roundedRect(margin, y, 6.5, 6.5, 1.2, 1.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(cleanPdfText(num), margin + 3.25, y + 4.6, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11.5);
    pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
    pdf.text(cleanPdfText(title), margin + 9, y + 4.8);

    y += 8.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const subLines = pdf.splitTextToSize(cleanPdfText(subtitle), contentWidth);
    pdf.text(subLines, margin, y);
    y += subLines.length * 3.8 + 2.5;
  };

  /**
   * Draws a multi-column comparison table where every cell automatically wraps text
   * and row heights dynamically expand to prevent any text collision or clipping.
   */
  const drawComparisonTable = (
    labelHeader: string,
    labelColWidth: number,
    rows: Array<{
      label: string;
      subLabel?: string;
      cells: Array<{
        primary: string;
        secondary?: string;
        tone?: "good" | "warn" | "bad" | "neutral" | "bold";
      }>;
    }>
  ) => {
    const builderColWidth = (contentWidth - labelColWidth) / builders.length;

    const renderTableHeader = () => {
      pdf.setFillColor(navyHeader[0], navyHeader[1], navyHeader[2]);
      pdf.rect(margin, y, contentWidth, 8.5, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(cleanPdfText(labelHeader), margin + 2.5, y + 5.6);

      builders.forEach((b, idx) => {
        const cx = margin + labelColWidth + idx * builderColWidth;
        const headerLabel = cleanPdfText(`${b.builderName} (${b.modelName})`);
        const clipped = pdf.splitTextToSize(headerLabel, builderColWidth - 10)[0] || cleanPdfText(b.builderName);
        pdf.text(clipped, cx + 2.5, y + 5.6);
      });
      y += 8.5;
    };

    ensureSpace(22);
    renderTableHeader();

    rows.forEach((row, rIdx) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      const labelLines = pdf.splitTextToSize(cleanPdfText(row.label), labelColWidth - 10);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.4);
      const subLabelLines = row.subLabel
        ? pdf.splitTextToSize(cleanPdfText(row.subLabel), labelColWidth - 10)
        : [];
      const labelHeight = labelLines.length * 3.6 + (subLabelLines.length > 0 ? subLabelLines.length * 3.2 + 1 : 0);

      const cellLayouts = row.cells.map((c) => {
        pdf.setFont("helvetica", c.tone === "neutral" ? "normal" : "bold");
        pdf.setFontSize(7.2);
        const pLines = pdf.splitTextToSize(cleanPdfText(c.primary), builderColWidth - 11);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.4);
        const sLines = c.secondary ? pdf.splitTextToSize(cleanPdfText(c.secondary), builderColWidth - 10) : [];
        const h = pLines.length * 3.6 + (sLines.length > 0 ? sLines.length * 3.2 + 1 : 0);
        return { pLines, sLines, h, tone: c.tone || "neutral" };
      });

      const maxCellH = Math.max(labelHeight, ...cellLayouts.map((cl) => cl.h));
      const rowHeight = Math.max(8.5, maxCellH + 4.5);

      if (y + rowHeight > bottomLimit) {
        pdf.addPage();
        drawPageChrome(currentSectionSubtitle);
        y = 25;
        renderTableHeader();
      }

      // Row Background
      if (rIdx % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(248, 250, 252);
      }
      pdf.rect(margin, y, contentWidth, rowHeight, "F");
      pdf.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      pdf.setLineWidth(0.25);
      pdf.rect(margin, y, contentWidth, rowHeight, "D");

      // Vertical column dividers
      builders.forEach((_, idx) => {
        const cx = margin + labelColWidth + idx * builderColWidth;
        pdf.line(cx, y, cx, y + rowHeight);
      });

      // Render Label Column
      let ly = y + 4.2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
      pdf.text(labelLines, margin + 2.5, ly);
      if (subLabelLines.length > 0) {
        ly += labelLines.length * 3.6 + 0.5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.4);
        pdf.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        pdf.text(subLabelLines, margin + 2.5, ly);
      }

      // Render Builder Cells
      cellLayouts.forEach((cl, idx) => {
        const cx = margin + labelColWidth + idx * builderColWidth;
        let cy = y + 4.2;

        if (cl.tone === "good") {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
        } else if (cl.tone === "bad") {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(roseDark[0], roseDark[1], roseDark[2]);
        } else if (cl.tone === "warn") {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
        } else if (cl.tone === "bold") {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(slateText[0], slateText[1], slateText[2]);
        }

        pdf.setFontSize(7.2);
        pdf.text(cl.pLines, cx + 2.5, cy);

        if (cl.sLines.length > 0) {
          cy += cl.pLines.length * 3.6 + 0.5;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.4);
          pdf.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
          pdf.text(cl.sLines, cx + 2.5, cy);
        }
      });

      y += rowHeight;
    });

    y += 4;
  };

  // ============================================================================
  // PAGE 1: EXECUTIVE VERDICT, TRUE COST TABLE & "WHY WINNER WINS" BREAKDOWN
  // ============================================================================
  drawPageChrome(currentSectionSubtitle);

  // Report Title & Metadata Bar
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
  pdf.text("Forensic Builder Tender, Design & Inclusions Audit", margin, y);

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const metaLine = cleanPdfText(
    `Client: ${session.clientName || "Valued Client"}   |   Site: ${session.siteAddress || "Proposed Building Lot"}   |   Division: ${session.division}   |   Date: ${new Date(session.createdAt).toLocaleDateString("en-AU")}`
  );
  pdf.text(metaLine, margin, y);
  y += 5;

  // Executive Winner Verdict Banner (Dynamic Height)
  const execSummaryText = cleanPdfText(session.executiveSummary || winningBuilder?.executiveSummary);
  const execLines = pdf.splitTextToSize(execSummaryText, contentWidth - 12);
  const bannerHeight = 20 + execLines.length * 3.8;

  pdf.setFillColor(emeraldBg[0], emeraldBg[1], emeraldBg[2]);
  pdf.roundedRect(margin, y, contentWidth, bannerHeight, 2.5, 2.5, "F");
  pdf.setDrawColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(margin, y, contentWidth, bannerHeight, 2.5, 2.5, "D");

  // Winner Badge Pill
  pdf.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  pdf.roundedRect(margin + 5, y + 4, 48, 6, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("BEST OVERALL VALUE WINNER", margin + 29, y + 8.1, { align: "center" });

  // Score Badge on Right
  pdf.setFillColor(navyHeader[0], navyHeader[1], navyHeader[2]);
  pdf.roundedRect(pageWidth - margin - 42, y + 4, 37, 6.5, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`AUDIT SCORE: ${winningBuilder?.overallScore || 95}/100`, pageWidth - margin - 23.5, y + 8.3, {
    align: "center",
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
  pdf.text(
    cleanPdfText(
      `${winningBuilder?.builderName} - ${winningBuilder?.modelName} (${winningBuilder?.inclusionTierName || "Turnkey Specification"})`
    ),
    margin + 5,
    y + 15.5
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(slateText[0], slateText[1], slateText[2]);
  pdf.text(execLines, margin + 5, y + 21);

  y += bannerHeight + 5;

  // Section 1: Apples-to-Apples Financial & Size Normalization Table
  drawSectionHeading(
    "1",
    "Apples-to-Apples Price & Size Normalization Summary",
    "Normalizing initial brochure prices by adding omitted turnkey essentials, provisional site cost exposure, and floorplan m2 parity."
  );

  drawComparisonTable("FINANCIAL & SIZE METRIC", 52, [
    {
      label: "Floorplan Design & Tier",
      subLabel: "Submitted model & inclusion range",
      cells: builders.map((b) => ({
        primary: `${b.modelName} (${b.housingType})`,
        secondary: b.inclusionTierName || "Standard Inclusions",
        tone: b.isBestValue ? "good" : "bold",
      })),
    },
    {
      label: "Total Floor Area (m2 / sq)",
      subLabel: "Includes garage, porch & alfresco",
      cells: builders.map((b) => ({
        primary: `${b.totalAreaM2} m2 (${b.totalAreaSquares} sq)`,
        secondary:
          b.areaDifferenceFromBenchmarkM2 === 0
            ? "Benchmark reference size"
            : `${b.areaDifferenceFromBenchmarkM2 && b.areaDifferenceFromBenchmarkM2 > 0 ? "+" : ""}${b.areaDifferenceFromBenchmarkM2} m2 vs benchmark`,
        tone: "bold",
      })),
    },
    {
      label: "Stated Tender Total Price",
      subLabel: "Headline figure on submitted estimate",
      cells: builders.map((b) => ({
        primary: `$${b.statedTotalPrice.toLocaleString()} ($${b.statedPricePerM2.toLocaleString()}/m2)`,
        secondary: `Base: $${b.basePrice.toLocaleString()} | Site: $${b.siteCosts.toLocaleString()}`,
        tone: "neutral",
      })),
    },
    {
      label: "Omitted Turnkey Inclusions",
      subLabel: "Cost to add missing AC, flooring, stone, etc.",
      cells: builders.map((b) => ({
        primary: b.omissionsCost === 0 ? "$0 (100% Turnkey Included)" : `+$${b.omissionsCost.toLocaleString()} Extra`,
        secondary:
          b.omissionsCost === 0
            ? "All 32 core items included"
            : "Required at colour/electrical studio",
        tone: b.omissionsCost === 0 ? "good" : "bad",
      })),
    },
    {
      label: "Provisional Site Cost Risk",
      subLabel: "Soil reactivity, extra piering & rock exposure",
      cells: builders.map((b) => ({
        primary:
          b.siteCostContingency === 0
            ? "$0 (100% Fixed Site Price)"
            : `+$${b.siteCostContingency.toLocaleString()} Est. Variation`,
        secondary:
          b.siteCostCertainty === "fixed"
            ? "100m piering & rock included"
            : `${b.siteCostCertainty.replace("_", " ")} (${b.contractClauses.pieringAllowanceMeters}m pier cap)`,
        tone: b.siteCostContingency === 0 ? "good" : "warn",
      })),
    },
    {
      label: "TRUE TURNKEY COMPLETION COST",
      subLabel: "Real move-in price on identical footing",
      cells: builders.map((b) => {
        const diff = b.normalizedTruePrice - winningBuilder.normalizedTruePrice;
        return {
          primary: `$${b.normalizedTruePrice.toLocaleString()} ($${b.normalizedPricePerM2.toLocaleString()}/m2)`,
          secondary:
            diff <= 0
              ? `BEST VALUE (${b.overallScore}/100 Score)`
              : `+$${diff.toLocaleString()} MORE than ${winningBuilder.builderName}`,
          tone: b.isBestValue ? "good" : "bad",
        };
      }),
    },
  ]);

  // Section 2: Full Breakdown on Exactly Why the Winner Wins
  const whyPillars = session.whyWinnerDetailedBreakdown || [];
  if (whyPillars.length > 0) {
    drawSectionHeading(
      "2",
      `Full Breakdown: Exactly Why ${winningBuilder.builderName} Delivers the Best Value`,
      "Detailed forensic justification across bottom-line cost, home design & room sizes, website promotions, contract safety, and build speed."
    );

    whyPillars.forEach((pillar) => {
      const expLines = pdf.splitTextToSize(cleanPdfText(pillar.detailedExplanation), contentWidth - 10);
      const cardH = 14 + expLines.length * 3.6;
      ensureSpace(cardH + 3, "Why Winner Wins - Forensic Breakdown");

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, contentWidth, cardH, 2, 2, "F");
      pdf.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      pdf.roundedRect(margin, y, contentWidth, cardH, 2, 2, "D");

      // Left gold bar accent
      pdf.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      pdf.rect(margin, y, 2.2, cardH, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
      pdf.text(cleanPdfText(pillar.pillarTitle), margin + 5, y + 5.2);

      // Dollar impact pill on right
      const impactText = cleanPdfText(pillar.quantifiedDollarImpact);
      if (impactText) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
        pdf.text(impactText, pageWidth - margin - 4, y + 5.2, { align: "right" });
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
      pdf.text(cleanPdfText(pillar.winnerHighlight), margin + 5, y + 9.8);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(slateText[0], slateText[1], slateText[2]);
      pdf.text(expLines, margin + 5, y + 14);

      y += cardH + 2.8;
    });
  }

  // ============================================================================
  // SECTION 3: HOME DESIGN, FLOORPLAN SIZES & ROOM DIMENSIONS AUDIT
  // ============================================================================
  currentSectionSubtitle = "Home Design, Room Dimensions & Website Promotions";
  drawSectionHeading(
    "3",
    "Home Design, Overall Size (m2) & Room Dimensions Audit",
    "Comparing floorplan spatial distribution, bedroom sizes, kitchen/pantry layout, bathrooms, and distinct living zones."
  );

  drawComparisonTable("ARCHITECTURAL DESIGN METRIC", 52, [
    {
      label: "Area Breakdown (m2)",
      subLabel: "Internal vs Garage & Alfresco",
      cells: builders.map((b) => {
        const d = b.designArchitecture;
        return {
          primary: d
            ? `Internal: ${((d.groundFloorInternalM2 ?? 0) + (d.firstFloorInternalM2 ?? 0)).toFixed(1)} m2 | Total: ${b.totalAreaM2} m2`
            : `${b.totalAreaM2} m2 Total`,
          secondary: d
            ? `GF: ${d.groundFloorInternalM2 ?? 0}m2 | FF: ${d.firstFloorInternalM2 ?? 0}m2 | Gar: ${d.garageM2}m2 | Alf: ${d.alfrescoM2}m2`
            : "",
          tone: "bold",
        };
      }),
    },
    {
      label: "Minimum Lot Width & Footprint",
      subLabel: "Required block frontage & house dimensions",
      cells: builders.map((b) => {
        const d = b.designArchitecture;
        return {
          primary: d ? `Min Lot Width: ${d.minLotWidthMeters}m` : "Standard Lot",
          secondary: d ? `House: ${d.houseWidthMeters}m W x ${d.houseDepthMeters}m D` : "",
        };
      }),
    },
    {
      label: "Master Suite Dimensions",
      subLabel: "Main bedroom size, robe & ensuite",
      cells: builders.map((b) => ({
        primary: b.designArchitecture?.masterSuiteDimensions || "4.1m x 3.7m + WIR + Ensuite",
        tone: b.isBestValue ? "good" : "neutral",
      })),
    },
    {
      label: "Secondary Bedroom Sizes",
      subLabel: "Bedrooms 2, 3 & 4 dimensions",
      cells: builders.map((b) => ({
        primary: b.designArchitecture?.secondaryBedroomsAverageSize || "3.0m x 3.0m average",
        secondary: (b.designArchitecture?.bedroomSizesDetail || []).slice(1).join(" | "),
        tone: /2\.9m|compact|tight/i.test(b.designArchitecture?.secondaryBedroomsAverageSize || "") ? "warn" : "good",
      })),
    },
    {
      label: "Bathrooms, Ensuites & Powder",
      subLabel: "Total wet rooms included in plan",
      cells: builders.map((b) => {
        const d = b.designArchitecture;
        return {
          primary: d
            ? `${d.bathroomsCount} Bathrooms (${d.ensuitesCount} Ensuite, ${d.powderRoomsCount} Powder Room)`
            : "2.5 Bathrooms",
          tone: "bold",
        };
      }),
    },
    {
      label: "Kitchen & Butler's Pantry / WIP",
      subLabel: "Main kitchen layout & pantry joinery",
      cells: builders.map((b) => ({
        primary: b.designArchitecture?.kitchenDimensionsAndLayout || "Island Kitchen",
        secondary: b.designArchitecture?.butlersPantryOrWip || "Standard Pantry",
        tone: /stone/i.test(b.designArchitecture?.butlersPantryOrWip || "") ? "good" : "neutral",
      })),
    },
    {
      label: "Living Zones & Study Nook",
      subLabel: "Separate family, media, retreat & study rooms",
      cells: builders.map((b) => {
        const d = b.designArchitecture;
        return {
          primary: d
            ? `${d.livingZonesCount} Living Zones ${d.studyOrOfficeIncluded ? "+ Dedicated Study" : "(No Separate Study)"}`
            : "2 Living Zones",
          secondary: (d?.livingZonesList || []).join(" + "),
          tone: (d?.livingZonesCount || 2) >= 3 ? "good" : "warn",
        };
      }),
    },
  ]);

  // ============================================================================
  // SECTION 4: WEBSITE PROMOTIONS, INCLUSION RANGE & FINE PRINT AUDIT
  // ============================================================================
  drawSectionHeading(
    "4",
    "Builder Website Promotions, Standard Inclusions & Fine Print Audit",
    "Auditing each builder's advertised website promotions and brochure claims against what is actually included in the estimate."
  );

  drawComparisonTable("PROMOTION & WEBSITE AUDIT", 52, [
    {
      label: "Inclusion Range & Website",
      subLabel: "Audited tier & source URL",
      cells: builders.map((b) => ({
        primary: b.promotionAudit?.inclusionRangeTier || b.inclusionTierName || "Standard Tier",
        secondary: b.promotionAudit?.websiteUrlChecked || "",
        tone: "bold",
      })),
    },
    {
      label: "Advertised Promo Claim vs Reality",
      subLabel: "Brochure headline vs assessed trade value",
      cells: builders.map((b) => ({
        primary: `Claim: ${b.promotionAudit?.advertisedValueClaim || "Standard Promo"}`,
        secondary: `Assessed Trade Value: ${b.promotionAudit?.realAssessedValue || "Standard"}`,
        tone: b.isBestValue ? "good" : "warn",
      })),
    },
    {
      label: "Promotion Fine Print Traps",
      subLabel: "Conditions hidden in website/brochure fine print",
      cells: builders.map((b) => ({
        primary: (b.promotionAudit?.promotionFinePrintTraps || ["None"]).join(" | "),
        tone: b.isBestValue ? "good" : "bad",
      })),
    },
    {
      label: "Website vs Estimate Discrepancy",
      subLabel: "Display home photos vs quoted specification",
      cells: builders.map((b) => ({
        primary: (b.promotionAudit?.websiteVsEstimateDiscrepancies || ["Matches tender"]).join(" "),
        tone: b.isBestValue ? "good" : "warn",
      })),
    },
  ]);

  // ============================================================================
  // SECTION 5: COMPLETE 32-POINT TRADE-BY-TRADE INCLUSIONS MATRIX
  // ============================================================================
  currentSectionSubtitle = "32-Point Trade-by-Trade Inclusions Matrix";
  drawSectionHeading(
    "5",
    "Complete 32-Point Trade-by-Trade Inclusions & Omissions Matrix",
    "Line-by-line audit across all 9 construction categories showing exact specifications and cost to upgrade omitted items."
  );

  const referenceInclusions = builders[0]?.inclusions || [];
  const inclusionRows = referenceInclusions.map((refItem, idx) => ({
    label: `${idx + 1}. ${refItem.featureName}`,
    subLabel: refItem.categoryLabel,
    cells: builders.map((b) => {
      const item =
        b.inclusions.find(
          (inc) =>
            inc.featureName.toLowerCase() === refItem.featureName.toLowerCase() ||
            inc.id.endsWith(refItem.id.split("-").slice(-2).join("-"))
        ) || b.inclusions[idx];

      if (!item) {
        return { primary: "Not Specified", tone: "warn" as const };
      }
      const statusTag =
        item.status === "included"
          ? "INCLUDED ($0 Extra)"
          : item.status === "provisional_sum"
            ? `PROVISIONAL (+$${item.estimatedOmissionCost.toLocaleString()} Risk)`
            : item.status === "upgrade_required"
              ? `UPGRADE EXTRA (+$${item.estimatedOmissionCost.toLocaleString()})`
              : `EXCLUDED (+$${item.estimatedOmissionCost.toLocaleString()})`;

      return {
        primary: statusTag,
        secondary: item.specification,
        tone:
          item.status === "included"
            ? ("good" as const)
            : item.status === "provisional_sum" || item.status === "upgrade_required"
              ? ("warn" as const)
              : ("bad" as const),
      };
    }),
  }));

  drawComparisonTable("TRADE SPECIFICATION ITEM", 52, inclusionRows);

  // ============================================================================
  // SECTION 6: CONTRACT CLAUSES, BUILDER CONCERNS, REPUTATION & BUILD TIMES
  // ============================================================================
  currentSectionSubtitle = "Contract Clauses, Reputation & Build Times";
  drawSectionHeading(
    "6",
    "Contract Clauses, Builder Concerns, Online Reputation & Build Times",
    "Auditing price lock periods, escalation clauses, variation margins, customer review ratings, and end-to-end build durations."
  );

  drawComparisonTable("CLAUSE / REPUTATION METRIC", 52, [
    {
      label: "Price Lock Period & Escalation",
      subLabel: "Protection against approval/registration delays",
      cells: builders.map((b) => ({
        primary: `${b.contractClauses.priceLockMonths} Months Price Freeze (${b.contractClauses.escalationClauseRisk.toUpperCase()} Risk)`,
        secondary: b.contractClauses.priceLockNotes,
        tone: b.contractClauses.priceLockMonths >= 12 ? "good" : "bad",
      })),
    },
    {
      label: "Piering & Rock Excavation",
      subLabel: "Foundation underground risk coverage",
      cells: builders.map((b) => ({
        primary: `${b.contractClauses.pieringAllowanceMeters}m Piering Allowance`,
        secondary: b.contractClauses.rockExcavationCoverage,
        tone: b.contractClauses.pieringAllowanceMeters >= 80 ? "good" : "warn",
      })),
    },
    {
      label: "Variation Margin & Liquidated Damages",
      subLabel: "Post-contract markup vs late build compensation",
      cells: builders.map((b) => ({
        primary: `${b.contractClauses.provisionalVariationMarginPercent || 20}% Variation Margin | $${b.contractClauses.liquidatedDamagesPerWeek}/wk Damages`,
        secondary: `Defects Liability Period: ${b.contractClauses.defectsPeriodMonths} Months`,
        tone: b.isBestValue ? "good" : "neutral",
      })),
    },
    {
      label: "Structural Warranty & Fine Print",
      subLabel: "Duration & transferability conditions",
      cells: builders.map((b) => ({
        primary: `${b.contractClauses.structuralWarrantyYears}-Year Structural Warranty`,
        secondary: b.contractClauses.structuralWarrantyFinePrint || "",
        tone: b.contractClauses.structuralWarrantyYears >= 50 ? "good" : "warn",
      })),
    },
    {
      label: "Total Build Time Breakdown",
      subLabel: "Pre-construction admin + site construction",
      cells: builders.map((b) => ({
        primary: `${b.reputation.averageBuildTimeMonths} Months Total End-to-End`,
        secondary: `Pre-Construction Admin: ${b.reputation.preConstructionAdminMonths || 3.5}m + Construction: ${b.reputation.constructionDurationMonths || 6.5}m`,
        tone: b.reputation.averageBuildTimeMonths <= 9.5 ? "good" : "warn",
      })),
    },
    {
      label: "Online Reputation & Reviews",
      subLabel: "ProductReview.com.au & Google ratings",
      cells: builders.map((b) => ({
        primary: `${b.reputation.rating} / 5.0 Stars (${b.reputation.reviewCount.toLocaleString()} Reviews)`,
        secondary: b.reputation.sentimentSummary,
        tone: b.reputation.rating >= 4.5 ? "good" : "neutral",
      })),
    },
    {
      label: "General Builder Concerns Flagged",
      subLabel: "Key operational or contractual risks to note",
      cells: builders.map((b) => ({
        primary: (b.contractClauses.generalBuilderConcerns || b.contractClauses.finePrintWarnings || ["Low risk"]).join(
          " | "
        ),
        tone: b.isBestValue ? "good" : "bad",
      })),
    },
  ]);

  // Final Auditor Sign-off Card
  const certText = cleanPdfText(
    `AUDITOR CERTIFICATION: Based on this 32-point forensic evaluation of base pricing, omitted turnkey items, room dimensions, website promotion fine print, contract escalation clauses, and build-time track records, ${winningBuilder.builderName} (${winningBuilder.modelName}) is certified as the BEST OVERALL VALUE option ($${winningBuilder.normalizedTruePrice.toLocaleString()} True Turnkey Cost, ${winningBuilder.overallScore}/100 Audit Score).`
  );
  const certLines = pdf.splitTextToSize(certText, contentWidth - 10);
  const certH = 12 + certLines.length * 3.8;
  ensureSpace(certH + 4);

  pdf.setFillColor(amberBg[0], amberBg[1], amberBg[2]);
  pdf.roundedRect(margin, y, contentWidth, certH, 2, 2, "F");
  pdf.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, certH, 2, 2, "D");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
  pdf.text("FINAL FORENSIC AUDITOR RECOMMENDATION", margin + 5, y + 5.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(navyHeader[0], navyHeader[1], navyHeader[2]);
  pdf.text(certLines, margin + 5, y + 10.5);

  // Stamp accurate page numbers across all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(241, 245, 249);
    pdf.rect(0, pageHeight - 11, pageWidth, 11, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    pdf.text(
      cleanPdfText(
        `Hudson Homes Forensic Tender Compare Report  |  Client: ${session.clientName || "Valued Client"}  |  ${session.division} Division`
      ),
      margin,
      pageHeight - 4.2
    );
    pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 4.2, { align: "right" });
  }

  return pdf;
}

export function generateTenderComparisonPdfDataUrl(session: TenderComparisonSession): string {
  const pdf = buildTenderComparisonJsPdf(session);
  return pdf.output("datauristring");
}

export function exportTenderComparisonPdf(session: TenderComparisonSession): void {
  const pdf = buildTenderComparisonJsPdf(session);
  const safeClient = cleanPdfText(session.clientName || "Client-Report").replace(/[^a-zA-Z0-9]+/g, "-");
  const fileName = `Hudson-Tender-Comparison-${safeClient}-${session.division}.pdf`;
  pdf.save(fileName);
}
