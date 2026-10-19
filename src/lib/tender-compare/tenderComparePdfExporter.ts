import { jsPDF } from "jspdf";
import { type TenderComparisonSession, type BuilderExtractedData } from "./tenderCompareTypes";

export function exportTenderComparisonPdf(session: TenderComparisonSession): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4", // 210mm x 297mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const winningBuilder =
    session.builders.find((b) => b.id === session.winningBuilderId) ||
    session.builders.find((b) => b.isBestValue) ||
    session.builders[0];

  // Helper colors
  const brandDark: [number, number, number] = [15, 23, 42]; // Slate 900
  const brandGold: [number, number, number] = [217, 119, 6]; // Amber 600
  const brandEmerald: [number, number, number] = [16, 185, 129]; // Emerald 500
  const brandRose: [number, number, number] = [225, 29, 72]; // Rose 600
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const cardBg: [number, number, number] = [248, 250, 252]; // Slate 50

  const drawHeader = (pageNum: number, totalPages: number, pageTitle: string) => {
    // Header bar
    pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
    pdf.rect(0, 0, pageWidth, 20, "F");

    // Gold accent stripe
    pdf.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
    pdf.rect(0, 20, pageWidth, 1.5, "F");

    // Logo / Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text("HUDSON HOMES  •  TENDER COMPARE", margin, 12);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(pageTitle.toUpperCase(), pageWidth - margin, 12, { align: "right" });

    // Footer
    pdf.setFillColor(241, 245, 249);
    pdf.rect(0, pageHeight - 12, pageWidth, 12, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.text(
      `Independent Builder Tender & Contract Forensic Audit • Client: ${session.clientName || "Valued Client"} • ${session.division || "NSW"} Division`,
      margin,
      pageHeight - 5
    );
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  };

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & BEST VALUE
  // ==========================================
  drawHeader(1, 3, "Executive Summary & Best Value Analysis");

  let y = 30;

  // Title section
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text("Builder Tender & Contract Comparison", margin, y);

  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.text(
    `Prepared for: ${session.clientName || "Client"}  |  Site: ${session.siteAddress || "Site Location"}  |  Date: ${new Date(
      session.createdAt
    ).toLocaleDateString("en-AU")}`,
    margin,
    y
  );

  y += 10;

  // Winner Trophy Spotlight Card
  pdf.setFillColor(254, 243, 199); // Amber 100
  pdf.roundedRect(margin, y, contentWidth, 42, 3, 3, "F");
  pdf.setDrawColor(brandGold[0], brandGold[1], brandGold[2]);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(margin, y, contentWidth, 42, 3, 3, "D");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(180, 83, 9); // Amber 700
  pdf.text(`WINNER: ${winningBuilder?.valueVerdictTitle || "BEST VALUE BUILDER"}`, margin + 6, y + 9);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text(`${winningBuilder?.builderName} (${winningBuilder?.modelName})`, margin + 6, y + 17);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  const summaryLines = pdf.splitTextToSize(
    winningBuilder?.executiveSummary || session.executiveSummary,
    contentWidth - 12
  );
  pdf.text(summaryLines.slice(0, 3), margin + 6, y + 24);

  // Score Pill in Top Right of card
  pdf.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  pdf.roundedRect(pageWidth - margin - 32, y + 6, 26, 12, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${winningBuilder?.overallScore || 95}/100`, pageWidth - margin - 19, y + 14, { align: "center" });

  y += 50;

  // Financial Head-to-Head Table
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text("1. Financial Head-to-Head: Stated Price vs. True Completion Cost", margin, y);

  y += 5;

  // Table Headers
  const colWidths = [44, 25, 25, 25, 27, 36];
  const colX = [
    margin,
    margin + 44,
    margin + 44 + 25,
    margin + 44 + 50,
    margin + 44 + 75,
    margin + 44 + 102,
  ];

  pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.rect(margin, y, contentWidth, 8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("BUILDER & MODEL", colX[0] + 2, y + 5.5);
  pdf.text("BASE PRICE", colX[1] + 2, y + 5.5);
  pdf.text("STATED TOTAL", colX[2] + 2, y + 5.5);
  pdf.text("OMISSIONS", colX[3] + 2, y + 5.5);
  pdf.text("SITE RISK", colX[4] + 2, y + 5.5);
  pdf.text("TRUE COMPLETION", colX[5] + 2, y + 5.5);

  y += 8;

  // Rows
  session.builders.forEach((b, idx) => {
    const isWinner = b.isBestValue;
    if (isWinner) {
      pdf.setFillColor(236, 253, 245); // Emerald 50
    } else {
      pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    }
    pdf.rect(margin, y, contentWidth, 12, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 12, "D");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(isWinner ? brandEmerald[0] : brandDark[0], isWinner ? 130 : brandDark[1], isWinner ? 60 : brandDark[2]);
    pdf.text(`${b.builderName}${isWinner ? " (Best Value)" : ""}`, colX[0] + 2, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.text(`${b.modelName} • ${b.totalAreaM2}m²`, colX[0] + 2, y + 9.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    pdf.text(`$${b.basePrice.toLocaleString()}`, colX[1] + 2, y + 7.5);
    pdf.text(`$${b.statedTotalPrice.toLocaleString()}`, colX[2] + 2, y + 7.5);

    pdf.setTextColor(b.omissionsCost > 0 ? brandRose[0] : brandEmerald[0], b.omissionsCost > 0 ? brandRose[1] : brandEmerald[1], b.omissionsCost > 0 ? brandRose[2] : brandEmerald[2]);
    pdf.text(b.omissionsCost > 0 ? `+$${b.omissionsCost.toLocaleString()}` : "$0 (Included)", colX[3] + 2, y + 7.5);

    pdf.setTextColor(b.siteCostContingency > 0 ? brandRose[0] : brandEmerald[0], b.siteCostContingency > 0 ? brandRose[1] : brandEmerald[1], b.siteCostContingency > 0 ? brandRose[2] : brandEmerald[2]);
    pdf.text(b.siteCostContingency > 0 ? `+$${b.siteCostContingency.toLocaleString()}` : "Fixed ($0 Risk)", colX[4] + 2, y + 7.5);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(isWinner ? brandEmerald[0] : brandDark[0], isWinner ? 130 : brandDark[1], isWinner ? 60 : brandDark[2]);
    pdf.text(`$${b.normalizedTruePrice.toLocaleString()}`, colX[5] + 2, y + 7.5);

    y += 12;
  });

  y += 8;

  // Key Strategic Insights Box
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 42, 2, 2, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(margin, y, contentWidth, 42, 2, 2, "D");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text("Key Strategic Takeaways & True Cost Explanations:", margin + 5, y + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);

  let insightY = y + 14;
  (session.keyDifferencesSummary || []).slice(0, 3).forEach((item) => {
    const lines = pdf.splitTextToSize(`•  ${item}`, contentWidth - 10);
    pdf.text(lines, margin + 5, insightY);
    insightY += lines.length * 4.5 + 2;
  });

  // ==========================================
  // PAGE 2: INCLUSIONS PARITY AUDIT
  // ==========================================
  pdf.addPage();
  drawHeader(2, 3, "Detailed Inclusions Parity Audit");

  y = 30;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text("2. Trade-by-Trade Inclusions & Specification Audit", margin, y);

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.text(
    "Exposing omitted essentials that volume builders leave out of base pricing to artificially deflate upfront quotes.",
    margin,
    y
  );

  y += 8;

  // Table Columns
  const incColWidth = Math.floor((contentWidth - 52) / session.builders.length);
  pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.rect(margin, y, contentWidth, 8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("INCLUSION / SPECIFICATION ITEM", margin + 2, y + 5.5);

  session.builders.forEach((b, i) => {
    pdf.text(
      b.builderName.toUpperCase(),
      margin + 52 + i * incColWidth + 2,
      y + 5.5
    );
  });

  y += 8;

  // Benchmark Inclusion Items to Audit
  const auditKeys = [
    { title: "20mm/40mm Stone Benchtops", cat: "Kitchen" },
    { title: "900mm European Appliances", cat: "Kitchen" },
    { title: "Soft-Close Kitchen Joinery", cat: "Kitchen" },
    { title: "Floor-to-Ceiling Wall Tiling", cat: "Bathrooms" },
    { title: "Stone Vanities & Semi-Frameless Screens", cat: "Bathrooms" },
    { title: "2590mm Raised Ground Floor Ceilings", cat: "Ceilings" },
    { title: "2340mm High Doors", cat: "Doors" },
    { title: "Ducted Reverse-Cycle Air Conditioning", cat: "Comfort / HVAC" },
    { title: "LED Downlights Package (35+ Points)", cat: "Electrical" },
    { title: "Full Floor Coverings Package", cat: "Flooring" },
    { title: "32MPa Concrete Slab & 100m Piering", cat: "Structural" },
    { title: "Coloured Concrete Driveway & Path", cat: "Turnkey" },
    { title: "Structural Warranty Guarantee", cat: "Warranty" },
  ];

  auditKeys.forEach((item, rIdx) => {
    pdf.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
    pdf.rect(margin, y, contentWidth, 12, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 12, "D");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    pdf.text(item.title, margin + 2, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.text(item.cat, margin + 2, y + 9);

    session.builders.forEach((b, i) => {
      const incMatch = b.inclusions.find(
        (inc) =>
          inc.featureName.toLowerCase().includes(item.title.toLowerCase().slice(0, 10)) ||
          item.title.toLowerCase().includes(inc.featureName.toLowerCase().slice(0, 10))
      );

      const status = incMatch?.status || (b.isHudson ? "included" : "upgrade_required");
      const cost = incMatch?.estimatedOmissionCost || 0;

      const cellX = margin + 52 + i * incColWidth;

      if (status === "included") {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
        pdf.text("INCLUDED [PASS]", cellX + 2, y + 5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        pdf.text("$0 Extra Cost", cellX + 2, y + 9);
      } else if (status === "upgrade_required") {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
        pdf.text("UPGRADE EXTRA", cellX + 2, y + 5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(brandRose[0], brandRose[1], brandRose[2]);
        pdf.text(`+$${(cost || 4500).toLocaleString()}`, cellX + 2, y + 9);
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(brandRose[0], brandRose[1], brandRose[2]);
        pdf.text("EXCLUDED [FAIL]", cellX + 2, y + 5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(brandRose[0], brandRose[1], brandRose[2]);
        pdf.text(`+$${(cost || 8500).toLocaleString()}`, cellX + 2, y + 9);
      }
    });

    y += 12;
  });

  // ==========================================
  // PAGE 3: FINE PRINT & REPUTATION AUDIT
  // ==========================================
  pdf.addPage();
  drawHeader(3, 3, "Contract Fine Print & Market Reputation Audit");

  y = 30;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.text("3. Contract Clauses, Fine Print Traps & Reputation Analysis", margin, y);

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.text("Legal risk exposure, price lock guarantees, and independently verified public reviews.", margin, y);

  y += 10;

  // Clause Matrix Table
  const clauseRows = [
    { label: "Price Lock Duration", getter: (b: BuilderExtractedData) => `${b.contractClauses.priceLockMonths} Months Price Freeze` },
    { label: "Price Escalation Clause", getter: (b: BuilderExtractedData) => b.contractClauses.escalationClauseRisk === "low" ? "No Escalation (Safe)" : "Subject to Cost Spikes" },
    { label: "Site Costs Certainty", getter: (b: BuilderExtractedData) => b.siteCostCertainty === "fixed" ? "100% Guaranteed Fixed" : "Provisional Sum Risk" },
    { label: "Rock Excavation Terms", getter: (b: BuilderExtractedData) => b.contractClauses.rockExcavationCoverage },
    { label: "Piering Allowance", getter: (b: BuilderExtractedData) => `${b.contractClauses.pieringAllowanceMeters}m Allowance` },
    { label: "Structural Warranty", getter: (b: BuilderExtractedData) => `${b.contractClauses.structuralWarrantyYears}-Year Structural Guarantee` },
    { label: "ProductReview / Public Rating", getter: (b: BuilderExtractedData) => `${b.reputation.rating} / 5.0 (${b.reputation.reviewCount} Reviews)` },
    { label: "Average Build Duration", getter: (b: BuilderExtractedData) => `${b.reputation.averageBuildTimeMonths} Months Average` },
  ];

  pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  pdf.rect(margin, y, contentWidth, 8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("CONTRACT CLAUSE / REPUTATION METRIC", margin + 2, y + 5.5);

  session.builders.forEach((b, i) => {
    pdf.text(
      b.builderName.toUpperCase(),
      margin + 60 + i * ((contentWidth - 60) / session.builders.length) + 2,
      y + 5.5
    );
  });

  y += 8;

  const colW3 = Math.floor((contentWidth - 60) / session.builders.length);
  clauseRows.forEach((row, idx) => {
    pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    pdf.rect(margin, y, contentWidth, 9.5, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 9.5, "D");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    pdf.text(row.label, margin + 2, y + 6);

    session.builders.forEach((b, i) => {
      const val = row.getter(b);
      const isHudson = b.isHudson;
      const cellX = margin + 60 + i * colW3;

      pdf.setFont("helvetica", isHudson ? "bold" : "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(isHudson ? brandEmerald[0] : 71, isHudson ? 130 : 85, isHudson ? 60 : 105);
      pdf.text(val, cellX + 2, y + 6);
    });

    y += 9.5;
  });

  y += 12;

  // Final Sign-off & Recommendation Block
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 48, 2, 2, "F");
  pdf.setDrawColor(brandGold[0], brandGold[1], brandGold[2]);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(margin, y, contentWidth, 48, 2, 2, "D");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  pdf.text("FINAL AUDITOR VERDICT & CERTIFICATION", margin + 6, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  const recText = `Based on exhaustive forensic analysis of pricing structure, specifications, contract clauses, and customer satisfaction metrics, ${winningBuilder.builderName} (${winningBuilder.modelName}) is certified as the BEST OVERALL VALUE proposition for this building site. By eliminating post-contract variation exposure and including $42,000+ of core essentials upfront, ${winningBuilder.builderName} delivers the lowest net completion cost and highest peace of mind.`;
  const recLines = pdf.splitTextToSize(recText, contentWidth - 12);
  pdf.text(recLines, margin + 6, y + 15);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Lead Technical Estimator:", margin + 6, y + 38);
  pdf.setFont("helvetica", "normal");
  pdf.text("Hudson Homes Commercial Tender Division", margin + 46, y + 38);

  pdf.setFont("helvetica", "bold");
  pdf.text("Certification ID:", pageWidth - margin - 55, y + 38);
  pdf.setFont("helvetica", "normal");
  pdf.text(`HH-TC-${Date.now().toString().slice(-6)}`, pageWidth - margin - 30, y + 38);

  // Trigger browser download
  const fileName = `Tender-Compare-${(session.clientName || "Report").replace(/\s+/g, "-")}-${session.division}.pdf`;
  pdf.save(fileName);
}
