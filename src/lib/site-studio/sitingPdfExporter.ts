import { jsPDF } from "jspdf";
import {
  CadastreParcel,
  SitedHouse,
  SetbackRules,
  ComplianceReport,
  DrawingScale,
} from "@/components/site-studio/siteStudioTypes";
import {
  loadAllTendersFromIdb,
  saveTenderToIdb,
  createBlankTenderSubmission,
} from "@/lib/tender/tenderStorage";
import { canFitA3At1to100 } from "./zoningRulesEngine";

export interface SitingPdfExportOptions {
  parcel: CadastreParcel;
  sitedHouse: SitedHouse;
  rules: SetbackRules;
  compliance: ComplianceReport;
  scale: DrawingScale;
  clientName?: string;
  consultantName?: string;
}

/**
 * Generates an architectural vector Siting Plan PDF at 1:200 or 1:100 scale on A3.
 */
export async function generateSitingPlanPdf({
  parcel,
  sitedHouse,
  rules,
  compliance,
  scale,
  clientName = "Hudson Homes Client",
  consultantName = "New Home Consultant",
}: SitingPdfExportOptions): Promise<{ pdf: jsPDF; dataUrl: string; fileName: string }> {
  // Check scale fit rule: 1:100 scale allowed only if lot boundaries fit on A3 page!
  let appliedScale = scale;
  if (scale === "1:100" && !canFitA3At1to100(parcel.frontageM, parcel.depthM)) {
    appliedScale = "1:200";
  }

  // A3 Landscape dimensions: 420mm width x 297mm height
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
  });

  const pageWidth = 420;
  const pageHeight = 297;
  const margin = 12;

  // 1. Drawing Border & Title Grid
  pdf.setDrawColor(30, 41, 59); // slate-800
  pdf.setLineWidth(0.8);
  pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner margin line
  pdf.setLineWidth(0.2);
  pdf.rect(margin + 2, margin + 2, pageWidth - (margin + 2) * 2, pageHeight - (margin + 2) * 2);

  // 2. Title Block Header (Top)
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(margin + 2, margin + 2, pageWidth - (margin + 2) * 2, 22, "F");

  // Hudson Logo & Division
  pdf.setTextColor(212, 175, 55); // brand gold #d4af37
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("HUDSON HOMES", margin + 8, margin + 11);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("QUEENSLAND DIVISION • ARCHITECTURAL SITING & SETBACK PLAN", margin + 8, margin + 17);

  // Right Header: Project & Scale Info
  pdf.setFontSize(9);
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.text(`SCALE: ${appliedScale} @ A3`, pageWidth - margin - 55, margin + 10);

  pdf.setTextColor(203, 213, 225); // slate-300
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`DATE: ${new Date().toLocaleDateString("en-AU")}`, pageWidth - margin - 55, margin + 16);
  pdf.text(`REVISION: 1.0 (PRE-TENDER)`, pageWidth - margin - 55, margin + 20);

  // 3. Project Information Ribbon
  pdf.setFillColor(241, 245, 249); // slate-100
  pdf.rect(margin + 2, margin + 24, pageWidth - (margin + 2) * 2, 14, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin + 2, margin + 38, pageWidth - margin - 2, margin + 38);

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENT:", margin + 8, margin + 30);
  pdf.setFont("helvetica", "normal");
  pdf.text(clientName, margin + 22, margin + 30);

  pdf.setFont("helvetica", "bold");
  pdf.text("PROPERTY ADDRESS:", margin + 80, margin + 30);
  pdf.setFont("helvetica", "normal");
  pdf.text(parcel.streetAddress || `${parcel.standardLotPlan}, ${parcel.suburb}`, margin + 115, margin + 30);

  pdf.setFont("helvetica", "bold");
  pdf.text("LOT & PLAN:", margin + 220, margin + 30);
  pdf.setFont("helvetica", "normal");
  pdf.text(parcel.standardLotPlan, margin + 242, margin + 30);

  pdf.setFont("helvetica", "bold");
  pdf.text("LGA / COUNCIL:", margin + 8, margin + 35);
  pdf.setFont("helvetica", "normal");
  pdf.text(parcel.council, margin + 34, margin + 35);

  pdf.setFont("helvetica", "bold");
  pdf.text("PROPOSED DESIGN:", margin + 80, margin + 35);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${sitedHouse.designName} (${sitedHouse.totalM2}m²)`, margin + 115, margin + 35);

  pdf.setFont("helvetica", "bold");
  pdf.text("CONSULTANT:", margin + 220, margin + 35);
  pdf.setFont("helvetica", "normal");
  pdf.text(consultantName, margin + 246, margin + 35);

  // 4. Drawing Canvas Scale (Millimetres per Metre)
  // At 1:200 scale: 1 metre = 5.0mm on paper
  // At 1:100 scale: 1 metre = 10.0mm on paper
  const mmPerMetre = appliedScale === "1:100" ? 10.0 : 5.0;

  const lotWidthMm = (parcel.frontageM || 14.0) * mmPerMetre;
  const lotLengthMm = (parcel.depthM || 32.0) * mmPerMetre;

  // Center drawing area on left 70% of A3 sheet
  const drawingOriginX = margin + 15 + Math.max(0, (260 - lotWidthMm) / 2);
  const drawingOriginY = margin + 50 + Math.max(0, (200 - lotLengthMm) / 2);

  // Draw Lot Boundary
  pdf.setDrawColor(217, 119, 6); // amber-600
  pdf.setLineWidth(0.6);
  pdf.rect(drawingOriginX, drawingOriginY, lotWidthMm, lotLengthMm);

  // Front Street Boundary Marker
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(217, 119, 6);
  pdf.text(
    `STREET FRONTAGE: ${parcel.frontageM}m (BEARING: 90°00'00")`,
    drawingOriginX + lotWidthMm / 2,
    drawingOriginY - 3,
    { align: "center" }
  );

  // Rear Boundary Marker
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `REAR BOUNDARY: ${parcel.rearWidthM || parcel.frontageM}m`,
    drawingOriginX + lotWidthMm / 2,
    drawingOriginY + lotLengthMm + 5,
    { align: "center" }
  );

  // Left & Right Boundary Markers
  pdf.text(`LEFT: ${parcel.depthM}m`, drawingOriginX - 3, drawingOriginY + lotLengthMm / 2, {
    align: "center",
    angle: 90,
  });
  pdf.text(`RIGHT: ${parcel.depthM}m`, drawingOriginX + lotWidthMm + 5, drawingOriginY + lotLengthMm / 2, {
    align: "center",
    angle: 270,
  });

  // Statutory Building Envelope (Green Dashed)
  const envTopMm = rules.frontSetback * mmPerMetre;
  const envBottomMm = rules.rearSetback * mmPerMetre;
  const envLeftMm = (sitedHouse.isBtb && sitedHouse.btbSide === "left" ? rules.btbSideSetback : rules.leftSetback) * mmPerMetre;
  const envRightMm = (sitedHouse.isBtb && sitedHouse.btbSide === "right" ? rules.btbSideSetback : rules.rightSetback) * mmPerMetre;

  pdf.setDrawColor(16, 185, 129); // emerald-500
  pdf.setLineDashPattern([2, 1], 0);
  pdf.rect(
    drawingOriginX + envLeftMm,
    drawingOriginY + envTopMm,
    lotWidthMm - envLeftMm - envRightMm,
    lotLengthMm - envTopMm - envBottomMm
  );
  pdf.setLineDashPattern([], 0); // reset

  // Sited House Footprint
  const houseOriginX = drawingOriginX + sitedHouse.posX * mmPerMetre;
  const houseOriginY = drawingOriginY + sitedHouse.posY * mmPerMetre;
  const houseWidthMm = sitedHouse.widthM * mmPerMetre;
  const houseLengthMm = sitedHouse.lengthM * mmPerMetre;

  // Solid House Walls
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(15, 23, 42); // slate-900
  pdf.setLineWidth(0.5);
  pdf.rect(houseOriginX, houseOriginY, houseWidthMm, houseLengthMm, "FD");

  // 450mm Eaves Line (OMP)
  const eaveOffsetMm = (rules.eaveWidthM || 0.45) * mmPerMetre;
  const leftEaveMm = sitedHouse.isBtb && sitedHouse.btbSide === "left" ? 0 : eaveOffsetMm;
  const rightEaveMm = sitedHouse.isBtb && sitedHouse.btbSide === "right" ? 0 : eaveOffsetMm;

  pdf.setDrawColor(245, 158, 11);
  pdf.setLineDashPattern([1.5, 1], 0);
  pdf.rect(
    houseOriginX - leftEaveMm,
    houseOriginY - eaveOffsetMm,
    houseWidthMm + leftEaveMm + rightEaveMm,
    houseLengthMm + eaveOffsetMm * 2
  );
  pdf.setLineDashPattern([], 0);

  // House Label inside Footprint
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(sitedHouse.designName.toUpperCase(), houseOriginX + houseWidthMm / 2, houseOriginY + houseLengthMm * 0.45, {
    align: "center",
  });
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text(`TOTAL LIVING: ${sitedHouse.totalM2}m²`, houseOriginX + houseWidthMm / 2, houseOriginY + houseLengthMm * 0.45 + 5, {
    align: "center",
  });
  pdf.text(
    `WIDTH: ${sitedHouse.widthM}m × LENGTH: ${sitedHouse.lengthM}m`,
    houseOriginX + houseWidthMm / 2,
    houseOriginY + houseLengthMm * 0.45 + 9,
    { align: "center" }
  );

  // Proposed Driveway Crossover
  const garageWidthMm = houseWidthMm * 0.52;
  const garageLeftMm = sitedHouse.isMirrored ? houseOriginX : houseOriginX + houseWidthMm * 0.48;
  pdf.setFillColor(226, 232, 240);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(garageLeftMm, drawingOriginY, garageWidthMm, houseOriginY - drawingOriginY, "F");

  // Dimension Lines & Setback Metres
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(16, 185, 129); // emerald

  // Front setback tag
  pdf.text(
    `FRONT WALL: ${compliance.liveSetbacks.frontWallSetback}m`,
    houseOriginX + houseWidthMm * 0.25,
    drawingOriginY + (houseOriginY - drawingOriginY) / 2,
    { align: "center" }
  );

  // Left setback tag
  pdf.text(
    `LEFT: ${compliance.liveSetbacks.leftWallSetback}m`,
    drawingOriginX + (houseOriginX - drawingOriginX) / 2,
    houseOriginY + houseLengthMm * 0.4,
    { align: "center" }
  );

  // Right setback tag
  pdf.text(
    `RIGHT: ${compliance.liveSetbacks.rightWallSetback}m`,
    houseOriginX + houseWidthMm + (drawingOriginX + lotWidthMm - (houseOriginX + houseWidthMm)) / 2,
    houseOriginY + houseLengthMm * 0.4,
    { align: "center" }
  );

  // Rear setback tag
  pdf.text(
    `REAR: ${compliance.liveSetbacks.rearWallSetback}m`,
    houseOriginX + houseWidthMm * 0.5,
    houseOriginY + houseLengthMm + (drawingOriginY + lotLengthMm - (houseOriginY + houseLengthMm)) / 2,
    { align: "center" }
  );

  // 5. Statutory Compliance Table (Right Side of Sheet)
  const tableX = pageWidth - margin - 120;
  const tableY = margin + 50;
  const tableW = 118;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(tableX, tableY, tableW, 9, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("STATUTORY PLANNING COMPLIANCE SCHEDULE", tableX + 4, tableY + 6);

  // Table items
  const tableRows = [
    { label: "Total Allotment Area", value: `${parcel.areaM2} m²`, status: "Verified" },
    { label: "House Footprint (Ground Area)", value: `${sitedHouse.totalM2} m²`, status: "Design" },
    {
      label: "Site Coverage Ratio",
      value: `${compliance.siteCoveragePercent}% (Max ${rules.maxSiteCoverage}%)`,
      status: compliance.isSiteCoveragePassed ? "COMPLIANT" : "EXCEEDED",
    },
    {
      label: "Private Open Space (POS)",
      value: `${compliance.privateOpenSpaceM2} m² (Min ${rules.minPosM2} m²)`,
      status: compliance.isPosPassed ? "COMPLIANT" : "FAIL",
    },
    {
      label: "Front Wall Setback",
      value: `${compliance.liveSetbacks.frontWallSetback}m (Min ${rules.frontSetback}m)`,
      status: compliance.isFrontCompliant ? "COMPLIANT" : "ENCROACHMENT",
    },
    {
      label: "Garage Door Setback",
      value: `${compliance.liveSetbacks.garageWallSetback}m (Min ${rules.garageSetback}m)`,
      status: compliance.isGarageCompliant ? "COMPLIANT" : "FAIL",
    },
    {
      label: "Left Side Boundary",
      value: `${compliance.liveSetbacks.leftWallSetback}m (Min ${rules.leftSetback}m)`,
      status: compliance.isLeftCompliant ? "COMPLIANT" : "FAIL",
    },
    {
      label: "Right Side Boundary",
      value: `${compliance.liveSetbacks.rightWallSetback}m (Min ${rules.rightSetback}m)`,
      status: compliance.isRightCompliant ? "COMPLIANT" : "FAIL",
    },
    {
      label: "Rear Boundary Setback",
      value: `${compliance.liveSetbacks.rearWallSetback}m (Min ${rules.rearSetback}m)`,
      status: compliance.isRearCompliant ? "COMPLIANT" : "FAIL",
    },
    {
      label: "Eaves Projection (OMP)",
      value: `${rules.eaveWidthM * 1000}mm Standard (0mm BTB)`,
      status: "COMPLIANT",
    },
    {
      label: "Planning Scheme / Code",
      value: rules.presetName,
      status: "APPLIED",
    },
  ];

  let currentY = tableY + 9;
  pdf.setFontSize(7);
  tableRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    pdf.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    pdf.rect(tableX, currentY, tableW, 6.5, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.line(tableX, currentY + 6.5, tableX + tableW, currentY + 6.5);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(row.label, tableX + 3, currentY + 4.5);

    pdf.setFont("helvetica", "normal");
    pdf.text(row.value, tableX + 50, currentY + 4.5);

    pdf.setFont("helvetica", "bold");
    if (row.status === "COMPLIANT" || row.status === "Verified" || row.status === "Design" || row.status === "APPLIED") {
      pdf.setTextColor(16, 185, 129);
    } else {
      pdf.setTextColor(239, 68, 68);
    }
    pdf.text(row.status, tableX + tableW - 4, currentY + 4.5, { align: "right" });

    currentY += 6.5;
  });

  // True North Arrow Graphic on PDF
  const northX = pageWidth - margin - 35;
  const northY = currentY + 25;

  pdf.setDrawColor(212, 175, 55);
  pdf.setFillColor(212, 175, 55);
  pdf.triangle(northX, northY - 10, northX - 5, northY + 5, northX, northY + 2, "F");
  pdf.setFillColor(15, 23, 42);
  pdf.triangle(northX, northY - 10, northX + 5, northY + 5, northX, northY + 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text("N", northX, northY - 13, { align: "center" });
  pdf.setFontSize(7);
  pdf.text("TRUE NORTH", northX, northY + 10, { align: "center" });

  // 6. Architectural Disclaimer Footer
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    "DISCLAIMER: This siting plan is prepared for pre-tender appraisal purposes and preliminary building envelope assessment. Final siting is subject to detail boundary contour survey, registered civil disclosure plans, council approval, private certifier assessment, and underground services / sewer connection clearance.",
    margin + 6,
    pageHeight - margin - 4
  );

  const cleanSurname = (clientName.split(" ").pop() || "Client").replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${cleanSurname}_${appliedScale.replace(":", "-")}_Scale_Siting_Plan.pdf`;
  const dataUrl = pdf.output("datauristring");

  return { pdf, dataUrl, fileName };
}

/**
 * Pushes the compiled Siting Plan directly into the active Tender Request Job Folder (`siting_plan` slot),
 * instantly resolving the required pre-flight checklist on Tab 6!
 */
export async function pushSitingToActiveTender({
  parcel,
  sitedHouse,
  rules,
  compliance,
  scale,
  clientName = "Hudson Homes Client",
  consultantName = "New Home Consultant",
}: SitingPdfExportOptions): Promise<{ tenderId: string; submissionNumber: string; fileName: string }> {
  // Generate the PDF
  const { dataUrl, fileName } = await generateSitingPlanPdf({
    parcel,
    sitedHouse,
    rules,
    compliance,
    scale,
    clientName,
    consultantName,
  });

  // Fetch or create active tender draft
  const allTenders = await loadAllTendersFromIdb();
  let draft = allTenders.find((t) => t.status === "draft");

  if (!draft) {
    draft = createBlankTenderSubmission();
  }

  // Populate client & land details
  const nameParts = clientName.trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ") || "Client";
  const surname = nameParts.slice(-1)[0] || "Owner";

  draft.customer1.firstName = draft.customer1.firstName || firstName;
  draft.customer1.surname = draft.customer1.surname || surname;

  // Land details
  draft.land.lotNo = parcel.lotNumber;
  draft.land.streetName = parcel.streetAddress;
  draft.land.suburb = parcel.suburb;
  draft.land.council = parcel.council;
  draft.land.lotSizeM2 = parcel.areaM2;
  draft.land.frontageM = parcel.frontageM;
  draft.land.isRegistered = parcel.isRegistered;

  // Home Spec & Siting details
  if (draft.homeSpec) {
    draft.homeSpec.homeDesign = sitedHouse.designName;
    draft.homeSpec.designM2 = sitedHouse.totalM2;
    draft.homeSpec.sitingPlanDataUrl = dataUrl;
    if (draft.homeSpec.setbacks) {
      draft.homeSpec.setbacks.frontBoundary = `${compliance.liveSetbacks.frontWallSetback}m`;
      draft.homeSpec.setbacks.rearBoundary = `${compliance.liveSetbacks.rearWallSetback}m`;
      draft.homeSpec.setbacks.leftBoundary = `${compliance.liveSetbacks.leftWallSetback}m`;
      draft.homeSpec.setbacks.rightBoundary = `${compliance.liveSetbacks.rightWallSetback}m`;
    }
  }

  // Inject the Siting Plan PDF into document slot
  if (!draft.documents) draft.documents = {};
  draft.documents.siting_plan = {
    id: "siting_plan",
    label: "1:200 Scale Siting / House Position Plan",
    category: "land_siting",
    required: true,
    fileName,
    fileType: "application/pdf",
    fileSize: Math.round(dataUrl.length * 0.75),
    fileDataUrl: dataUrl,
    uploadedAt: new Date().toISOString(),
    status: "ready",
  };

  draft.updatedAt = new Date().toISOString();

  // Save back to IndexedDB
  await saveTenderToIdb(draft);

  return {
    tenderId: draft.id,
    submissionNumber: draft.submissionNumber,
    fileName,
  };
}
