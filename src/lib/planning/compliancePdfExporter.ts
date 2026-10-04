import { jsPDF } from "jspdf";
import {
  FeasibilityAssessmentResult,
  evaluatePropertyFeasibility,
} from "./universalPlanningEngine";
import { type StaffProfile } from "@/lib/authSession";

export interface CompliancePdfExportOptions {
  assessment: FeasibilityAssessmentResult;
  staffUser?: StaffProfile | null;
  customNotes?: string;
}

/**
 * Generates an executive, Hudson-branded multi-page Compliance & Feasibility Summary PDF.
 * Incorporates statutory authority, zoning, setbacks, 7 site overlays, recommended designs,
 * and 50-Year Structural Warranty endorsement.
 */
export function generateComplianceSummaryPdf({
  assessment,
  staffUser,
  customNotes,
}: CompliancePdfExportOptions): { pdf: jsPDF; fileName: string; dataUrl: string } {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const j = assessment.jurisdiction;
  const p = assessment.parsedQuery;
  const r = assessment.ruleBreakdown;
  let cleanSuburb = p.suburb || j.name;
  if (cleanSuburb) {
    cleanSuburb = cleanSuburb.replace(/\s+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Way|Crescent|Cres)\b/i, "").trim();
  }
  if (p.streetName && cleanSuburb) {
    const sLower = p.streetName.toLowerCase();
    const subLower = cleanSuburb.toLowerCase();
    if (sLower === subLower || sLower.includes(subLower) || subLower.includes(sLower)) {
      cleanSuburb = j.name.replace(/ City Council| Shire Council| Council/i, "").trim();
    }
  }
  const propertyLabel = p.streetName
    ? `${p.streetNumber ? p.streetNumber + " " : ""}${p.streetName}, ${cleanSuburb}`.trim()
    : p.rawQuery.replace(/^cc\s*(?:duplex|dual key)?\s*/i, "").trim() || "Target Property";

  const refId = `HH-CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateFormatted = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const consultantName = staffUser?.name || "Steve Slisar";
  const consultantCentre = staffUser?.displayCentre || "HomeWorld Warnervale / QLD Division";
  const consultantPhone = staffUser?.phone || "0483 950 830";

  // ==========================================================================
  // PAGE 1: STATUTORY PLANNING DETERMINATION, SETBACKS & 7 OVERLAYS
  // ==========================================================================

  // 1. Top Decorative Brand Bar
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 28, "F");

  // Gold accent line
  pdf.setFillColor(212, 175, 55); // brand gold
  pdf.rect(0, 27, pageWidth, 1.5, "F");

  // Header Title
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("HUDSON HOMES", margin, 11);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("STATUTORY PLANNING & COMPLIANCE ASSESSMENT DOSSIER", margin, 17);
  pdf.setTextColor(203, 213, 225);
  pdf.text(`AUTHORITY: ${j.statutoryAuthority.toUpperCase()} (${j.state}) • INSTRUMENT: ${j.governingInstrument.split("&")[0].trim()}`, margin, 22);

  // Reference & Date (Top Right)
  pdf.setFontSize(7.5);
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.text(`ASSESSMENT REF: ${refId}`, pageWidth - margin, 11, { align: "right" });
  pdf.setTextColor(226, 232, 240);
  pdf.setFont("helvetica", "normal");
  pdf.text(`DATE: ${dateFormatted}`, pageWidth - margin, 17, { align: "right" });
  pdf.text(`CONSULTANT: ${consultantName}`, pageWidth - margin, 22, { align: "right" });

  let y = 35;

  // 2. Executive Determination Banner
  const isAccepted = assessment.verdict.includes("ACCEPTED") || assessment.verdict.includes("HIGHLY") || assessment.verdict.includes("COMPLIANT");
  const bannerBg = isAccepted ? [16, 185, 129] : [217, 119, 6]; // emerald-500 vs amber-600
  pdf.setFillColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  pdf.roundedRect(margin, y, contentWidth, 13, 2, 2, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`STATUTORY DETERMINATION: ${assessment.verdict}`, margin + 6, y + 6);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Assessment Path: ${r.planningPath} | Accuracy Confidence: ${Math.round(assessment.confidenceScore * 100)}% Verified Framework`, margin + 6, y + 10.5);

  y += 18;

  // 3. Property & Authority Matrix (2-column box)
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.roundedRect(margin, y, contentWidth, 23, 2, 2, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text("SUBJECT PROPERTY & JURISDICTION", margin + 4, y + 5);

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Subject Address:`, margin + 4, y + 10);
  pdf.setFont("helvetica", "bold");
  pdf.text(propertyLabel.substring(0, 50), margin + 30, y + 10);

  pdf.setFont("helvetica", "normal");
  pdf.text(`Governing LGA:`, margin + 4, y + 15);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${j.name} (${j.state})`, margin + 30, y + 15);

  pdf.setFont("helvetica", "normal");
  pdf.text(`Planning Scheme:`, margin + 4, y + 20);
  pdf.setFont("helvetica", "bold");
  pdf.text(j.governingInstrument.substring(0, 52), margin + 30, y + 20);

  // Right Column
  const rightColX = margin + contentWidth / 2 + 4;
  pdf.setFont("helvetica", "normal");
  pdf.text(`Zoning:`, rightColX, y + 10);
  pdf.setFont("helvetica", "bold");
  pdf.text(j.zoningDefaults.primaryZoning.substring(0, 36), rightColX + 22, y + 10);

  pdf.setFont("helvetica", "normal");
  pdf.text(`Target Typology:`, rightColX, y + 15);
  pdf.setFont("helvetica", "bold");
  const typoLabel = p.targetTypology === "duplex"
    ? "Duplex / Dual-Occupancy"
    : p.targetTypology === "dual_key"
      ? "Dual-Key / Auxiliary Dwelling"
      : "Single / Multi-Dwelling Residential";
  pdf.text(typoLabel, rightColX + 22, y + 15);

  pdf.setFont("helvetica", "normal");
  pdf.text(`Assessment Code:`, rightColX, y + 20);
  pdf.setFont("helvetica", "bold");
  pdf.text(r.planningPath.substring(0, 36), rightColX + 22, y + 20);

  y += 28;

  // 4. Section: Building Envelope & Boundary Setbacks Table
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y, contentWidth, 6, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("1. STATUTORY PLANNING ENVELOPE & BOUNDARY SETBACK CONTROLS", margin + 3, y + 4.2);

  y += 6;

  // Table Headers
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, contentWidth, 5.5, "F");
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("PLANNING PARAMETER", margin + 3, y + 3.8);
  pdf.text("STATUTORY REQUIREMENT", margin + 65, y + 3.8);
  pdf.text("COMPLIANCE CRITERIA & HUDSON SPECIFICATION", margin + 115, y + 3.8);

  y += 5.5;

  const setbackRows = [
    {
      param: "Minimum Lot Size",
      req: `≥ ${j.duplexRules.minLotSizeM2} m² (Duplex) / ≥ ${j.auxiliaryUnitRules.minLotSizeM2} m² (Aux)`,
      note: "Accepted on conforming allotments; Code Assessable if below base threshold.",
    },
    {
      param: "Minimum Street Frontage",
      req: `≥ ${j.duplexRules.minFrontageM}m Frontage`,
      note: "Allows compliant dual crossover separation (min 1.0m to services & street trees).",
    },
    {
      param: "Maximum Site Coverage",
      req: `${j.duplexRules.maxSiteCoveragePct}% Maximum`,
      note: "Includes roofline footprint, garage, porch, and covered alfresco areas.",
    },
    {
      param: "Maximum Building Height",
      req: `${j.duplexRules.maxBuildingHeightM}m (Max 2 Storeys)`,
      note: "Complies with standard QDC MP 1.2 / NSW Housing SEPP residential envelope.",
    },
    {
      param: "Front Boundary Setback (OMP)",
      req: `${j.duplexRules.frontSetbackM}m Outer Projection`,
      note: "Measured to outermost projection (OMP); porch / verandah can articulate to 4.5m.",
    },
    {
      param: "Garage Door Setback",
      req: `${j.duplexRules.garageSetbackM}m to Garage Face`,
      note: "Prevents parked vehicles from overhanging council footpaths / road reserve.",
    },
    {
      param: "Side Boundary Setbacks",
      req: `${j.duplexRules.sideSetbackM}m Ground / 2.0m Upper`,
      note: "Built-to-boundary (0mm BTB) permitted on garage wall on lots < 15m wide.",
    },
    {
      param: "Rear Boundary Setback",
      req: `${j.duplexRules.rearSetbackM}m Ground / 3.0m Upper`,
      note: "Ensures private rear yard amenity and acoustic separation to rear neighbors.",
    },
    {
      param: "Private Open Space (POS)",
      req: "≥ 50 m² (Min 5.0m Dimension)",
      note: "Directly accessible from ground-floor main living / dining zones.",
    },
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  setbackRows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentWidth, 5, "F");
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + 5, margin + contentWidth, y + 5);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(row.param, margin + 3, y + 3.6);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 41, 59);
    pdf.text(row.req, margin + 65, y + 3.6);

    pdf.setTextColor(71, 85, 105);
    pdf.text(row.note.substring(0, 52), margin + 115, y + 3.6);

    y += 5;
  });

  y += 5;

  // 5. Section: Technical Site Overlays & Construction Engineering (All 7 Overlays)
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y, contentWidth, 6, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("2. SITE OVERLAYS & TECHNICAL CONSTRUCTION ENGINEERING (7 HAZARDS)", margin + 3, y + 4.2);

  y += 7;

  const overlays = [
    {
      title: "1. Bushfire Attack Level (AS 3959)",
      risk: j.overlayProfile.bushfireRisk,
      solution: "Corrosion-resistant ember screens (≤2mm), toughened glass, non-combustible sarking, and tight perimeter garage compression seals.",
    },
    {
      title: "2. Flooding & Overland Flow Freeboard",
      risk: j.overlayProfile.floodRisk,
      solution: "Finished Floor Level (FFL) must achieve min 300mm to 500mm freeboard above designated overland flow crest; site swales divert surface runoff.",
    },
    {
      title: "3. Acoustic Road Traffic Noise (QDC MP 4.4 / NSW SEPP)",
      risk: j.overlayProfile.acousticRisk,
      solution: "6.38mm acoustic laminated glass, solid core doors with perimeter acoustic drop seals, and R2.5 acoustic ceiling insulation batts.",
    },
    {
      title: "4. Sewer & Stormwater Zone of Influence (ZOI)",
      risk: `Governing: ${j.overlayProfile.sewerAuthority}`,
      solution: "45-degree angle of repose strictly applied: Footings within ZOI supported on bored concrete piers drilled min 300mm below pipe invert.",
    },
    {
      title: "5. Slope, Earthworks & Drop Edge Beams (DEB)",
      risk: "Topography & Cut/Fill Management",
      solution: "Uncertified cut/fill limited to 1.0m. Cross-fall managed via Hudson Drop Edge Beams (DEB) up to 1.5m. Form 15 cert required if > 1.0m.",
    },
    {
      title: "6. Geotechnical Soil Reactivity (AS 2870)",
      risk: `Soil Classification: ${j.overlayProfile.soilReactivity}`,
      solution: "Engineered reinforced concrete slab (Class M to H1/H2). Fixed site costs cover up to H-class; concrete piering as detailed by soil report.",
    },
    {
      title: "7. Council Infrastructure Trunk Charges (Headworks)",
      risk: `Duplex Levy: ${r.infrastructureChargesEst}`,
      solution: "Single dwelling: standard headworks in base. Duplex: headworks per council schedule. Auxiliary units (≤70m² GFA): $0 EXEMPT in QLD!",
    },
  ];

  overlays.forEach((o) => {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(o.title, margin + 3, y + 3.8);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(180, 83, 9); // amber-700
    pdf.text(`Risk Profile: ${o.risk.substring(0, 68)}`, margin + 65, y + 3.8);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Hudson Engineering: ${o.solution.substring(0, 120)}`, margin + 3, y + 7.8);

    y += 11.2;
  });

  // Page 1 Footer
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, pageHeight - 10, pageWidth, 10, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text("HUDSON HOMES 50-YEAR STRUCTURAL WARRANTY • FIXED PRICE CONTRACT GUARANTEE", margin, pageHeight - 4);
  pdf.setTextColor(203, 213, 225);
  pdf.text(`Page 1 of 2 • Assessment Ref: ${refId}`, pageWidth - margin, pageHeight - 4, { align: "right" });

  // ==========================================================================
  // PAGE 2: RECOMMENDED DESIGNS, ACTION CHECKLIST & GUARANTEES
  // ==========================================================================
  pdf.addPage();

  // Page 2 Header (Slimmer)
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 20, "F");
  pdf.setFillColor(212, 175, 55);
  pdf.rect(0, 19, pageWidth, 1, "F");

  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("HUDSON HOMES", margin, 9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text("RECOMMENDED ARCHITECTURAL DESIGNS & PRE-TENDER HANDOFF CHECKLIST", margin, 14.5);

  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text(`REF: ${refId} • ${propertyLabel.substring(0, 32)}`, pageWidth - margin, 12, { align: "right" });

  let y2 = 27;

  // 1. Recommended Hudson Homes Master Designs
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y2, contentWidth, 6, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("3. RECOMMENDED HUDSON HOMES ARCHITECTURAL MASTER DESIGNS", margin + 3, y2 + 4.2);

  y2 += 8;

  const designs = j.recommendedDesigns && j.recommendedDesigns.length > 0
    ? j.recommendedDesigns
    : [
        { name: "Wisteria 33 / 34 / 36 / 40", type: "Duplex" as const, minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Flagship QLD/NSW dual-occupancy design featuring 3+2 or 4+2 bed duplex layouts with independent entrances and metering." },
        { name: "Alabaster 31 / 36", type: "Duplex" as const, minLotWidthM: 18.0, minLotDepthM: 26.0, summary: "Single-storey traditional duplex with side-by-side configurations engineered for standard 18m frontage lots." },
        { name: "Amber 21 (Auxiliary Suite)", type: "Dual Key" as const, minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "Compliant with 70m² auxiliary threshold, exempt from council infrastructure charges." },
        { name: "Burgundy 27 / 30 / 32", type: "Double Storey" as const, minLotWidthM: 13.5, minLotDepthM: 22.0, summary: "Executive family double storey maximizing open living space and fitting standard 50% site coverage." },
      ];

  designs.slice(0, 4).forEach((d) => {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y2, contentWidth, 18, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(d.name, margin + 4, y2 + 5.5);

    pdf.setFontSize(7);
    pdf.setTextColor(212, 175, 55);
    pdf.text(`[${d.type.toUpperCase()}]`, margin + 65, y2 + 5.5);

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Min Lot Frontage: ${d.minLotWidthM}m | Min Lot Depth: ${d.minLotDepthM}m`, pageWidth - margin - 4, y2 + 5.5, { align: "right" });

    pdf.setTextColor(51, 65, 85);
    pdf.text(d.summary, margin + 4, y2 + 10.5, { maxWidth: contentWidth - 8 });

    y2 += 21;
  });

  y2 += 2;

  // 2. Section: Pre-Tender Action Checklist & Consultant Handoff
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y2, contentWidth, 6, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("4. PRE-TENDER ACTION CHECKLIST & NHC WORKFLOW", margin + 3, y2 + 4.2);

  y2 += 8;

  const checklistItems = [
    { step: "Step 1", title: "Order Geotechnical Soil Test & Contour Survey", desc: "Confirms bearing capacity, exact fall across the pad, and underground asset invert levels." },
    { step: "Step 2", title: "Select Specification Range (H1 / H2 / H3 / IP)", desc: "Choose between H1 Smart, H2 Designer (display-home luxury), H3 Luxury, or IP Turn-Key (investor ready)." },
    { step: "Step 3", title: "Modified Plan Engine Customization", desc: "Review in Quote Builder V2 to customize alfresco dimensions, garage extensions, or window packages." },
    { step: "Step 4", title: "Prepare Formal Fixed Price Tender", desc: "Issue Hudson Building Contract with locked-in fixed price site costs and zero price escalation." },
  ];

  checklistItems.forEach((c) => {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y2, contentWidth, 11, 1.5, 1.5, "FD");

    pdf.setFillColor(212, 175, 55);
    pdf.rect(margin, y2, 16, 11, "F");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(c.step, margin + 8, y2 + 6.5, { align: "center" });

    pdf.setTextColor(15, 23, 42);
    pdf.text(c.title, margin + 20, y2 + 4.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(6.5);
    pdf.text(c.desc, margin + 20, y2 + 8.5);

    y2 += 13.5;
  });

  y2 += 2;

  // 3. Hudson Structural Guarantees & Two-Part Contract Perks
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y2, contentWidth, 6, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("5. HUDSON HOMES STRUCTURAL GUARANTEES & CONTRACT ADVANTAGES", margin + 3, y2 + 4.2);

  y2 += 8;

  pdf.setFillColor(254, 252, 232); // amber-50
  pdf.setDrawColor(251, 191, 36); // amber-400
  pdf.roundedRect(margin, y2, contentWidth, 23, 2, 2, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(120, 53, 15);
  pdf.text("• 50-YEAR STRUCTURAL WARRANTY:", margin + 4, y2 + 5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(69, 26, 3);
  pdf.text("Exceeds standard 6-year statutory warranties by over 7x. Covers engineered concrete slabs, footings, load-bearing frames, and trusses.", margin + 48, y2 + 5);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(120, 53, 15);
  pdf.text("• FIXED PRICE CONTRACT GUARANTEE:", margin + 4, y2 + 10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(69, 26, 3);
  pdf.text("True fixed price peace of mind with zero escalation clauses and fixed contract terms after execution.", margin + 48, y2 + 10);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(120, 53, 15);
  pdf.text("• TWO-PART CONTRACT SAVINGS:", margin + 4, y2 + 15);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(69, 26, 3);
  pdf.text("Separate land and build contracts save buyers and investors $10,000 to $25,000+ in stamp duty (paid on land only!).", margin + 48, y2 + 15);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(120, 53, 15);
  pdf.text("• GUARANTEED TIMEFRAMES:", margin + 4, y2 + 20);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(69, 26, 3);
  pdf.text("Contractually promised construction timelines ensure timely occupancy and fast rental yields.", margin + 48, y2 + 20);

  y2 += 27;

  // 4. Consultant Signature & Disclaimer Block
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y2, margin + contentWidth, y2);
  y2 += 4;

  pdf.setFontSize(6);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    "STATUTORY DISCLAIMER: This assessment is prepared by the Hudson Homes Statutory Planning Engine for preliminary feasibility guidance based on current municipal planning instruments. Final siting and building approval are subject to a registered site contour survey, geotechnical soil test, and private certifier / council endorsement.",
    margin,
    y2,
    { maxWidth: contentWidth }
  );

  y2 += 8;

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Prepared By: ${consultantName}`, margin, y2);
  pdf.text(`Centre: ${consultantCentre}`, margin + 55, y2);
  pdf.text(`Phone: ${consultantPhone}`, margin + 115, y2);
  pdf.text(`Hudson OS Copilot Verified`, pageWidth - margin, y2, { align: "right" });

  // Page 2 Footer
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, pageHeight - 10, pageWidth, 10, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text("HUDSON HOMES • ARCHITECTURAL SITING & STATUTORY FEASIBILITY DIVISION", margin, pageHeight - 4);
  pdf.setTextColor(203, 213, 225);
  pdf.text(`Page 2 of 2 • Assessment Ref: ${refId}`, pageWidth - margin, pageHeight - 4, { align: "right" });

  const cleanFilenameAddress = propertyLabel
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 40);
  const fileName = `Hudson_Homes_Compliance_Report_${cleanFilenameAddress}_${refId}.pdf`;
  const dataUrl = pdf.output("dataurlstring");

  return { pdf, fileName, dataUrl };
}

/**
 * Convenience helper to generate and trigger the immediate browser download of the Compliance Report PDF.
 */
export function downloadComplianceReportPdf(
  assessment: FeasibilityAssessmentResult,
  staffUser?: StaffProfile | null,
  customNotes?: string
): string {
  const { pdf, fileName } = generateComplianceSummaryPdf({ assessment, staffUser, customNotes });
  pdf.save(fileName);
  return fileName;
}
