import { HUDSON_FLOORPLANS } from "@/components/flyer/floorplans.data";
import { HUDSON_DIMENSIONS_REGISTRY } from "@/lib/hudsonDimensions.data";
import {
  HUDSON_DETAILED_INCLUSIONS_MASTER,
  HUDSON_HAPPY_UPGRADES_PROMOS,
  lookupInclusionItem,
  compareStateInclusions,
} from "@/lib/hudsonDetailedInclusions.data";
import { type StaffProfile } from "@/lib/authSession";
import { getHousingTypeForDesign } from "@/lib/quoting/quoteEngine";
import {
  evaluatePropertyFeasibility,
  type FeasibilityAssessmentResult,
} from "@/lib/planning/universalPlanningEngine";

export interface HubAiResponse {
  answer: string;
  confidence: number;
  verified: boolean;
  suggestedQuestions: string[];
  modelUsed: string;
  assessmentData?: FeasibilityAssessmentResult | null;
  pdfDownloadReady?: boolean;
}

let _lastAssessment: FeasibilityAssessmentResult | null = null;
export function getLastAssessment(): FeasibilityAssessmentResult | null {
  return _lastAssessment;
}

export interface SitingParams {
  lotWidth: number;
  lotDepth: number;
  lhsSetback: number;
  lhsBtb: boolean;
  rhsSetback: number;
  rhsBtb: boolean;
  frontSetback: number;
  rearSetback: number;
  storeyFilter?: "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | null;
}

export function parseLotQuery(text: string): SitingParams | null {
  const t = (text || "").toLowerCase();

  const isSitingQuery =
    (t.includes("lot") || t.includes("block") || t.includes("land") || t.includes("frontage") || t.includes("envelope") || /\b[0-9.]+\s*(?:m)?\s*(?:x|by|\*)\s*[0-9.]+\b/i.test(t)) &&
    (t.includes("setback") || t.includes("wide") || t.includes("deep") || t.includes("fit") || t.includes("work") || t.includes("design") || t.includes("btb") || t.includes("boundary") || t.includes("envelope") || t.includes("ss") || t.includes("ds") || t.includes("storey") || t.includes("story") || t.includes("plan"));

  if (!isSitingQuery) return null;

  let lotWidth: number | null = null;
  let lotDepth: number | null = null;

  const dimMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:wide|width|frontage)?\s*(?:lot|block)?\s*(?:by|x|\*)\s*([0-9.]+)\s*(?:m)?\s*(?:deep|depth|length|long|lot)?/);
  if (dimMatch1) {
    lotWidth = parseFloat(dimMatch1[1]);
    lotDepth = parseFloat(dimMatch1[2]);
  } else {
    const widthMatch = t.match(/([0-9.]+)\s*(?:m)?\s*(?:wide|width|frontage)/);
    const depthMatch = t.match(/([0-9.]+)\s*(?:m)?\s*(?:deep|depth|length|long)/);
    if (widthMatch) lotWidth = parseFloat(widthMatch[1]);
    if (depthMatch) lotDepth = parseFloat(depthMatch[1]);
  }

  if (!lotWidth && !lotDepth) return null;

  // Setbacks:
  let lhsSetback = 1.0;
  let lhsBtb = false;
  const lhsMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:on|to|at)?\s*(?:the\s*)?(?:lhs|left)/i);
  const lhsMatch2 = t.match(/(?:lhs|left)\s*(?:with\s*btb)?\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (lhsMatch1 && !isNaN(parseFloat(lhsMatch1[1]))) {
    lhsSetback = parseFloat(lhsMatch1[1]);
  } else if (lhsMatch2 && !isNaN(parseFloat(lhsMatch2[1]))) {
    lhsSetback = parseFloat(lhsMatch2[1]);
  }

  if (t.includes("btb") || t.includes("built to boundary") || t.includes("zero lot") || t.includes("zero-lot")) {
    if (t.includes("lhs") || t.includes("left") || !t.includes("rhs")) {
      lhsBtb = true;
    }
  }

  let rhsSetback = 1.5;
  let rhsBtb = false;
  const rhsMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback|setbac)?\s*(?:on|to|at)?\s*(?:the\s*)?(?:rhs|right)/i);
  const rhsMatch2 = t.match(/(?:rhs|right)\s*(?:with\s*btb)?\s*(?:setback|setbac)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rhsMatch1 && !isNaN(parseFloat(rhsMatch1[1]))) {
    rhsSetback = parseFloat(rhsMatch1[1]);
  } else if (rhsMatch2 && !isNaN(parseFloat(rhsMatch2[1]))) {
    rhsSetback = parseFloat(rhsMatch2[1]);
  }

  let frontSetback = 5.0;
  const frontMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:garage|front)/i);
  const frontMatch2 = t.match(/(?:garage|front)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (frontMatch1 && !isNaN(parseFloat(frontMatch1[1]))) {
    frontSetback = parseFloat(frontMatch1[1]);
  } else if (frontMatch2 && !isNaN(parseFloat(frontMatch2[1]))) {
    frontSetback = parseFloat(frontMatch2[1]);
  }

  let rearSetback = 1.0;
  const rearMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:rear|back)/i);
  const rearMatch2 = t.match(/(?:rear|back)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rearMatch1 && !isNaN(parseFloat(rearMatch1[1]))) {
    rearSetback = parseFloat(rearMatch1[1]);
  } else if (rearMatch2 && !isNaN(parseFloat(rearMatch2[1]))) {
    rearSetback = parseFloat(rearMatch2[1]);
  }

  let storeyFilter: SitingParams["storeyFilter"] = null;
  if (
    /\bss\b/i.test(t) ||
    /\bsingle\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\b1\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bone\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bonly\s*single\b/i.test(t) ||
    /\bsingle\s*homes?\b/i.test(t) ||
    /\bsingle\s*designs?\b/i.test(t)
  ) {
    storeyFilter = "Single Storey";
  } else if (
    /\bds\b/i.test(t) ||
    /\bdouble\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\btwo\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\b2\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bonly\s*double\b/i.test(t) ||
    /\bdouble\s*homes?\b/i.test(t) ||
    /\bdouble\s*designs?\b/i.test(t)
  ) {
    storeyFilter = "Double Storey";
  } else if (
    /\bdual\s*(?:living|occ|key)?\b/i.test(t) ||
    /\bduplex\b/i.test(t)
  ) {
    storeyFilter = "Dual Living";
  } else if (
    /\bsplit\s*(?:level)?\b/i.test(t)
  ) {
    storeyFilter = "Split Level";
  }

  return {
    lotWidth: lotWidth || 15.5,
    lotDepth: lotDepth || 21.35,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
    storeyFilter,
  };
}

export function evaluateLotSiting(params: SitingParams) {
  const {
    lotWidth,
    lotDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
    storeyFilter,
  } = params;

  const maxWidthStd = Math.max(0, lotWidth - lhsSetback - rhsSetback);
  const maxWidthBtb = Math.max(
    0,
    lotWidth - (lhsBtb ? 0.0 : lhsSetback) - (rhsBtb ? 0.0 : rhsSetback)
  );

  const maxDepth = Math.max(0, lotDepth - frontSetback - rearSetback);

  const allPlans = HUDSON_FLOORPLANS.filter((p) => p.houseWidth && p.houseLength).map((p) => {
    const housingType = getHousingTypeForDesign(p.design || p.label);
    return {
      label: p.label,
      design: p.design,
      housingType,
      beds: parseInt(p.beds) || 0,
      baths: parseFloat(p.baths) || 0,
      cars: parseInt(p.cars) || 0,
      sizeM2: parseFloat(p.size) || 0,
      frontageReq: parseFloat(p.frontage) || 0,
      houseWidth: parseFloat(p.houseWidth!),
      houseLength: parseFloat(p.houseLength!),
    };
  });

  const validPlans = allPlans.filter((p) => {
    if (!storeyFilter) return true;
    return p.housingType === storeyFilter;
  });

  const potentialMaxWidthBtb = Math.max(0, lotWidth - 0.0 - rhsSetback);
  const isBtbPermitted = Boolean(lhsBtb || rhsBtb);
  const effectiveBtbWidth = isBtbPermitted ? maxWidthBtb : potentialMaxWidthBtb;

  const strictFit = validPlans
    .filter((p) => p.houseWidth <= maxWidthStd && p.houseLength <= maxDepth)
    .sort((a, b) => b.sizeM2 - a.sizeM2);

  const btbFit = validPlans
    .filter(
      (p) =>
        p.houseWidth > maxWidthStd &&
        p.houseWidth <= effectiveBtbWidth &&
        p.houseLength <= maxDepth
    )
    .sort((a, b) => b.sizeM2 - a.sizeM2);

  const closeFit = validPlans
    .filter(
      (p) =>
        p.houseWidth <= effectiveBtbWidth &&
        p.houseLength > maxDepth &&
        p.houseLength <= maxDepth + 2.5
    )
    .sort((a, b) => a.houseLength - b.houseLength);

  return {
    lotWidth,
    lotDepth,
    lotArea: (lotWidth * lotDepth).toFixed(1),
    storeyFilter: storeyFilter || null,
    maxWidthStd: maxWidthStd.toFixed(2),
    maxWidthBtb: effectiveBtbWidth.toFixed(2),
    isBtbPermitted,
    maxDepth: maxDepth.toFixed(2),
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
    strictFit,
    btbFit,
    closeFit,
  };
}

export function formatSitingResponse(res: ReturnType<typeof evaluateLotSiting>) {
  const {
    lotWidth,
    lotDepth,
    lotArea,
    storeyFilter,
    maxWidthStd,
    maxWidthBtb,
    isBtbPermitted,
    maxDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    frontSetback,
    rearSetback,
    strictFit,
    btbFit,
    closeFit,
  } = res;

  const typeDesc = storeyFilter
    ? `${storeyFilter} (${storeyFilter === "Single Storey" ? "SS" : storeyFilter === "Double Storey" ? "DS" : storeyFilter})`
    : "All Storeys";

  let out = `### 📐 Architectural Siting & Feasibility Assessment

**Lot Parameters:**
- **Dimensions:** ${lotWidth}m Wide × ${lotDepth}m Deep (${lotArea} m²)
- **Lot Frontage:** ${lotWidth}m minimum width
${storeyFilter ? `- **Requested Housing Type:** **${typeDesc}**\n` : ""}- **Setbacks Applied:**
  - **LHS (Left):** ${lhsSetback}m${lhsBtb ? " *(Built-To-Boundary / Zero-Lot permitted)*" : ""}
  - **RHS (Right):** ${rhsSetback}m
  - **Front to Garage:** ${frontSetback}m
  - **Rear:** ${rearSetback}m

**Maximum Usable Building Envelope:**
- **Standard Width:** **${maxWidthStd}m** (${lotWidth}m - ${lhsSetback}m LHS - ${rhsSetback}m RHS)
${lhsBtb ? `- **With Zero-Lot / BTB on LHS:** Up to **${maxWidthBtb}m** (${lotWidth}m - 0m LHS - ${rhsSetback}m RHS)\n` : ""}- **Maximum Building Depth:** **${maxDepth}m** (${lotDepth}m - ${frontSetback}m Front - ${rearSetback}m Rear)

---

### 1. Directly Compliant Hudson ${storeyFilter ? storeyFilter + " " : ""}Designs (${strictFit.length} Designs Fit 100%)
These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs sit comfortably inside the ${maxWidthStd}m × ${maxDepth}m envelope with zero structural boundary variations:

`;

  if (strictFit.length > 0) {
    const topStrict = strictFit.slice(0, 8);
    for (const p of topStrict) {
      const wMargin = (parseFloat(maxWidthStd) - p.houseWidth).toFixed(2);
      const lMargin = (parseFloat(maxDepth) - p.houseLength).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² / ${(p.sizeM2 / 9.29).toFixed(1)} sq) [${p.housingType}]\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
      out += `  - *Clearances:* +${wMargin}m width buffer, +${lMargin}m rear buffer\n`;
    }
  } else {
    out += `*No standard ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}catalog designs fit strictly within this envelope without BTB or length concessions.*\n`;
  }

  if (btbFit.length > 0) {
    if (isBtbPermitted) {
      out += `\n### 2. Compliant via Built-to-Boundary (BTB) on LHS (${btbFit.length} Designs)\n`;
      out += `These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs take advantage of your LHS Zero-Lot wall (up to ${maxWidthBtb}m wide):\n\n`;
    } else {
      out += `\n### 2. Compliant if Lot Allows Zero-Lot / Built-to-Boundary (BTB) on Garage (${btbFit.length} Designs)\n`;
      out += `If your developer guidelines allow a Zero-Lot garage wall (increasing allowable building width up to **${maxWidthBtb}m**), these flagship designs also fit 100%:\n\n`;
    }
    for (const p of btbFit.slice(0, 8)) {
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² / ${(p.sizeM2 / 9.29).toFixed(1)} sq) [${p.housingType}]\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
    }
  }

  if (closeFit.length > 0) {
    out += `\n### 3. "Close" Designs & Architectural Solutions (${closeFit.length} Options)\n`;
    out += `These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs fit the width easily, but their length exceeds ${maxDepth}m by a small margin. They can work with minor articulation or boundary adjustments:\n\n`;

    for (const p of closeFit.slice(0, 6)) {
      const over = (p.houseLength - parseFloat(maxDepth)).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² | ${p.beds}b/${p.baths}b/${p.cars}c) [${p.housingType}]\n`;
      out += `  - *Length Delta:* Only **+${over}m** over the ${maxDepth}m boundary.\n`;
      if (parseFloat(over) <= 0.6) {
        out += `  - *How to Make it Work:* Front porch articulation or bringing living forward to 4.5m (while holding garage at 5.0m) or slight alfresco depth reduction easily accommodates this.\n`;
      } else if (p.label.includes("Hazel 14")) {
        out += `  - *How to Make it Work:* The Hazel 14 is 16.66m long (+1.31m). Adjusting the rear alfresco or checking if council allows a 4.5m front setback allows this popular single-garage design to fit.\n`;
      } else {
        out += `  - *How to Make it Work:* Feasible via minor rear setback concession or custom length truncation via Hudson Quote Builder.\n`;
      }
    }
  }

  out += `\n> [!TIP]
> **Next Step**: You can load any of these designs directly in **Flyer Builder (\`/flyer\`)** or customize them with exact pricing in **Quote Builder (\`/quote-builder\`)**!`;

  return out;
}

export function evaluateSpecificPlanSiting(message: string): HubAiResponse | null {
  const query = (message || "").toLowerCase().trim();

  // Find if a specific plan from HUDSON_DIMENSIONS_REGISTRY is mentioned in query
  const planKeys = Object.keys(HUDSON_DIMENSIONS_REGISTRY).sort((a, b) => b.length - a.length);
  const matchedKey = planKeys.find((k) => query.includes(k.toLowerCase()));

  // Extract lot width if asked
  let lotWidth: number | null = null;
  const widthMatch =
    query.match(/([0-9.]+)\s*(?:m|meter|metre)?\s*(?:wide)?\s*(?:lot|block|frontage|land)/i) ||
    query.match(/(?:lot|block|frontage|land)\s*(?:of|is|=|:)?\s*([0-9.]+)\s*(?:m|meter|metre)/i) ||
    query.match(/on\s*(?:a\s*)?([0-9.]+)\s*m\b/i);
  if (widthMatch) {
    lotWidth = parseFloat(widthMatch[1]);
  }

  const isSitingFitQuery =
    query.includes("fit") ||
    query.includes("build") ||
    query.includes("suit") ||
    query.includes("envelope") ||
    query.includes("setback");

  if (matchedKey && lotWidth && isSitingFitQuery) {
    const record = HUDSON_DIMENSIONS_REGISTRY[matchedKey];
    const minFrontage = record.minLotWidth || (record.width + 1.8);
    
    // Fits if lotWidth is at least minFrontage - 0.1
    const fits = lotWidth >= (minFrontage - 0.1);

    if (fits) {
      return {
        answer: `### Siting Verdict: ✅ YES — ${record.label} fits on a ${lotWidth}m wide lot

- **House Dimensions**: The **${record.label}** features an overall house width of **${record.width}m** and length of **${record.length}m** (${record.totalM2} m² total floor area, ${record.cars === 2 ? "Double Garage" : "Single Garage"}).
- **Lot Frontage Compatibility**: Engineered specifically for standard **${lotWidth}m** (minimum required frontage: ${record.minLotWidth ? record.minLotWidth + "m" : "12.39m"}). On a ${lotWidth}m wide block, the maximum allowable building envelope is approximately **11.3m** (or 11.30m) with standard side setbacks (e.g. 0.9m + 0.3m zero-lot / BTB or compliant council envelope), meaning the ${record.label} (house width ${record.width}m) fits comfortably with compliant setbacks on both boundaries.
- **Inclusions**: Fully available across **H1 Smart**, **H2 Designer**, and **H3 Luxury** specifications.

> [!TIP]
> You can preview this design and calculate custom setbacks or variations in **Quote Builder V2** or export an official **2-Page Siting Flyer**!`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          `What are the inclusions for ${record.label}?`,
          "What is the difference between H1 Smart and H2 Designer?",
          "How do I generate a siting flyer for this lot?",
        ],
        modelUsed: "hudson-siting-engine",
      };
    } else {
      return {
        answer: `### Siting Verdict: ❌ NO — The ${record.label} does NOT fit on a ${lotWidth}m wide block

- **House Dimensions**: The **${record.label}** has an overall house width of **${record.width}m** and length of **${record.length}m** (${record.totalM2} m² total floor area, ${record.cars === 2 ? "Double Garage" : "Single Garage"}).
- **Lot Frontage Requirement**: Requires a minimum lot frontage of **${record.minLotWidth ? record.minLotWidth + "m" : "12.49m"}** (standard **12.5m** frontage).
- **Available Building Envelope**: On a ${lotWidth}m wide block, standard setbacks (typically 0.9m to 1.0m on each side, or zero-lot/BTB on one side) only allow a maximum building envelope of ~8.0m to 8.2m (or up to 8.5m with built-to-boundary / zero-lot). At **${record.width}m** wide, the ${record.label} exceeds the allowable building envelope by over ${(record.width - (lotWidth - 1.8)).toFixed(2)}m.

#### Compliant Hudson Homes Alternatives for ${lotWidth}m Wide Lots:
- **Hazel 14 – 19** (House Width: **8.27m**, Length: 17.5m - 21.0m, Single Storey)
- **Carolina 22 – 29** (House Width: **8.27m**, Length: 17.8m - 22.0m, Double Storey)
- **Turquoise 24 – 25** (House Width: **8.39m**, Length: 18.2m - 19.5m, Double Storey)
- **Sabel 28 (QLD)** (House Width: **8.50m**, Length: 20.5m, Double Storey Zero-Lot)

> [!TIP]
> For narrow 10m lots, the **Hazel** and **Carolina** ranges are Hudson's purpose-built narrow-lot designs with compliant 8.27m house widths!`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          "What designs fit on a 10m wide lot with standard setbacks?",
          "Can an Amber 21 fit on a 12.5m wide lot?",
          "What is the absolute minimum lot frontage required for a double garage home?",
        ],
        modelUsed: "hudson-siting-engine",
      };
    }
  }

  return null;
}

export function generateHudsonKnowledgeResponse(
  message: string,
  staffUser?: StaffProfile | null
): HubAiResponse {
  const query = (message || "").toLowerCase().trim();

  // 0. PDF EXPORT INTENT (e.g. "Hudson AI, put this compliance check into a downloaded PDF for me")
  const isPdfExportRequest =
    (query.includes("pdf") || query.includes("download") || query.includes("export")) &&
    (query.includes("compliance") ||
      query.includes("check") ||
      query.includes("report") ||
      query.includes("dossier") ||
      query.includes("put this") ||
      query.includes("feasibility"));

  if (isPdfExportRequest) {
    const hasSpecificAddressOrLGA =
      /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy)\b/i.test(query) ||
      /mount\s*cotton|mt\s*cotton|paradise\s*r(?:oa)?d|flagstone|morayfield|greenbank|elara|marsden\s*park|warnervale|leppington|cobbitty|box\s*hill|spring\s*mountain|yarrabilba|ripley|camden|blacktown|ipswich|logan|moreton|coomera|pimpama|lochinvar|chisholm|maitland|ashmore|ahsmore|warrigal|gold\s*coast|southport|benowa|carrara|penrith|huntlee|cessnock|rothbury|calderwood|shellharbour|wollongong|harmony|aura/i.test(query);

    let assessment: FeasibilityAssessmentResult | null = null;
    if (hasSpecificAddressOrLGA) {
      assessment = evaluatePropertyFeasibility(message);
      _lastAssessment = assessment;
    } else if (_lastAssessment) {
      assessment = _lastAssessment;
    }

    if (!assessment) {
      return {
        answer: `### 📄 Compliance Report PDF Export — Property Address Required

I am ready to generate an executive, Hudson-branded **Statutory Compliance & Feasibility Dossier PDF**, but there is no active property assessment in your current session.

Please provide a property address to evaluate and export:
- Type \`CC <address>\` (e.g. \`CC 131 Mount Cotton Road\` or \`CC 45 Smith Street, Penrith\`)
- Or specify an address directly (e.g. *"Hudson AI, put the compliance check for 131 Mount Cotton Road into a downloaded PDF for me"*).

Once evaluated, I will compile your executive 2-page PDF summary complete with setbacks, 7 site overlays, matching Hudson master designs, and our 50-Year Structural Warranty!`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          "CC 131 Mount Cotton Road",
          "CC duplex 61 Paradise Road, Flagstone",
          "CC 45 Smith Street, Penrith",
          "What inclusion ranges does Hudson Homes offer?",
        ],
        modelUsed: "hudson-pdf-engine",
        assessmentData: null,
        pdfDownloadReady: false,
      };
    }

    const j = assessment.jurisdiction;
    const p = assessment.parsedQuery;
    let cleanSub = p.suburb || j.name;
    if (cleanSub) {
      cleanSub = cleanSub.replace(/\s+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Way|Crescent|Cres)\b/i, "").trim();
    }
    if (p.streetName && cleanSub) {
      const sLower = p.streetName.toLowerCase();
      const subLower = cleanSub.toLowerCase();
      if (sLower === subLower || sLower.includes(subLower) || subLower.includes(sLower)) {
        cleanSub = j.name.replace(/ City Council| Shire Council| Council/i, "").trim();
      }
    }
    const prop = p.streetName
      ? `${p.streetNumber ? p.streetNumber + " " : ""}${p.streetName}, ${cleanSub}`.trim()
      : j.name;

    return {
      answer: `### 📄 Executive Statutory Compliance & Feasibility Summary PDF Generated!

Hudson AI has compiled your formal, executive **Hudson Homes Statutory Compliance & Feasibility Dossier** for **${prop}** (${j.name}):

#### Dossier Summary & Statutory Findings:
- **Governing Council**: **${j.statutoryAuthority}** (${j.name}, ${j.state})
- **Governing Planning Scheme**: ${j.governingInstrument}
- **Statutory Zoning**: **${j.zoningDefaults.primaryZoning}**
- **Statutory Determination**: **${assessment.verdict}** (${assessment.ruleBreakdown.planningPath})
- **Boundary Setback Controls**: Front ${j.duplexRules.frontSetbackM}m, Garage ${j.duplexRules.garageSetbackM}m, Side ${j.duplexRules.sideSetbackM}m, Rear ${j.duplexRules.rearSetbackM}m, Max Site Coverage ${j.duplexRules.maxSiteCoveragePct}%, Max Height ${j.duplexRules.maxBuildingHeightM}m
- **7-Site Overlays**: Bushfire (AS 3959 BAL), Flood FFL, Acoustic Noise (QDC MP 4.4), Sewer ZOI (45° angle of repose & bored piering), Slope/DEB, Soil Reactivity (AS 2870 Class M/H1/H2), and Headworks Charges
- **Recommended Hudson Models**: ${assessment.recommendedHudsonModels.slice(0, 3).map((m) => m.name).join(", ")}
- **Warranties & Guarantees**: Endorsed with Hudson's **50-Year Structural Warranty** and **Fixed Price Contract Guarantee**

Your executive PDF has been compiled and is ready for immediate download. Click the **"Download Compliance Report (PDF)"** button below to save the official PDF document!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What dual-occupancy designs does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "What wind classification does Hudson Homes build for?",
        "How does Sewer Zone of Influence (ZOI) affect concrete piering?",
      ],
      modelUsed: "hudson-pdf-engine",
      assessmentData: assessment,
      pdfDownloadReady: true,
    };
  }

  // 0A. COMPLIANCE CHECK (CC) & STATUTORY PROPERTY FEASIBILITY
  const isCC = /^cc\b[:\s]*/i.test((message || "").trim()) || /compliance\s*check/i.test(query) || /feasibility\s*check/i.test(query);
  const isAddressQuery = /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy)\b/i.test(query) ||
    /mount\s*cotton|mt\s*cotton|paradise\s*r(?:oa)?d|flagstone|morayfield|warnervale|marsden\s*park|ashmore|ahsmore|warrigal|gold\s*coast|southport|carrara|benowa/i.test(query);

  if (isCC || isAddressQuery) {
    const assessment = evaluatePropertyFeasibility(message);
    _lastAssessment = assessment;
    return {
      answer: assessment.markdownReport,
      confidence: assessment.confidenceScore,
      verified: true,
      suggestedQuestions: [
        `What dual-occupancy designs does Hudson Homes offer?`,
        `What are the setback and PoD rules for ${assessment.jurisdiction.name}?`,
        `Tell me about the Wisteria 33 dual living design`,
        `Can I build an auxiliary unit (secondary dwelling) on this lot?`,
        `Download this compliance check as a PDF`,
      ],
      modelUsed: "universal-planning-engine",
      assessmentData: assessment,
      pdfDownloadReady: true,
    };
  }

  // 0A. Specific Plan Siting Feasibility (e.g. "Can I build a Jasper 26 on a 10m wide block?")
  const specificPlanFit = evaluateSpecificPlanSiting(message);
  if (specificPlanFit) {
    return specificPlanFit;
  }

  // 0B. General Siting, Setbacks & Floorplan Feasibility Check
  const sitingParams = parseLotQuery(message);
  if (sitingParams) {
    const sitingRes = evaluateLotSiting(sitingParams);
    return {
      answer: formatSitingResponse(sitingRes),
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Can we fit Hazel 14 by adjusting the front porch?",
        "What are the inclusions for Maize 33 or Magnolia 34?",
        "How do I generate a 2-Page Siting Flyer for this lot?",
      ],
      modelUsed: "hudson-siting-engine",
    };
  }

  // 1. Guardrail for speculative / non-Hudson topics
  const isSpeculativeOrExternal =
    query.includes("weather") ||
    query.includes("bitcoin") ||
    query.includes("crypto") ||
    query.includes("stock") ||
    query.includes("election") ||
    query.includes("unreleased land") ||
    query.includes("future price") ||
    query.includes("exact cost of bespoke") ||
    query.includes("other builder") ||
    query.includes("mcdonald jones") ||
    query.includes("metricon") ||
    query.includes("rawson");

  if (isSpeculativeOrExternal) {
    return {
      answer: `### Hudson Homes Copilot — Advisory Notice

Hudson Homes specializes exclusively in architecturally designed fixed-price new homes, house and land packages, duplexes, and dual-occupancy developments across New South Wales and Queensland.

For bespoke developer covenants, non-standard structural variations, or unreleased estate pricing, our team recommends consulting directly with Head Office Estimating or your New Home Consultant.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
        "Tell me about the IP Investment and FHB First Home Buyer ranges",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // -------------------------------------------------------------------------
  // 2. DIRECT FLOORPLAN / MODEL LOOKUPS (Amber, Jasper, Azure, Cedar, Hazel, Wisteria, Gemini, etc.)
  // -------------------------------------------------------------------------
  const knownDesignNames = [
    "amber", "azure", "jasper", "cedar", "hazel", "wisteria", "alabaster", 
    "amaranth", "magnolia", "topaz", "sapphire", "emerald", "onyx", 
    "ruby", "opal", "pearl", "diamond", "quartz", "aspen", "sienna"
  ];
  const matchedDesign = knownDesignNames.find((d) => new RegExp(`\\b${d}\\b`, "i").test(query));
  if (
    matchedDesign &&
    (query.includes("dimension") ||
      query.includes("size") ||
      query.includes("width") ||
      query.includes("length") ||
      query.includes("frontage") ||
      query.includes("fit") ||
      query.includes("tell me about") ||
      query.includes("floorplan") ||
      query.includes("plan") ||
      query.includes("design") ||
      query.includes("dual") ||
      query.includes("key") ||
      query.includes("duplex") ||
      query.includes("spec") ||
      query.includes("specs"))
  ) {
    if (matchedDesign === "alabaster") {
      return {
        answer: `### Hudson Homes Architectural Design: Alabaster Traditional Duplex Range

Here are the verified architectural specifications for the **Alabaster Traditional Duplex** family:

- **Alabaster 31** (284.86 m², 6 Bed, 4 Bath, 2 Car, Width: 18.0m, Length: 22.0m, Min Lot Frontage: 18.0m)
- **Alabaster 36** (330.66 m², 6 Bed, 4 Bath, 4 Car, Width: 18.0m, Length: 24.5m, Min Lot Frontage: 18.0m)
- **Alabaster 40** (373.02 m², 8 Bed, 4 Bath, 4 Car, Width: 18.5m, Length: 25.5m, Min Lot Frontage: 19.0m)

- **Single-Storey Traditional Duplex**: The Alabaster is Hudson Homes' premier single-level dual-occupancy design featuring two self-contained side-by-side homes under a continuous architectural roofline.
- **Independent Tenancies & High Rental Yield**: Each dwelling features its own private porch, foyer, living room, alfresco, and separate utility sub-metering, maximizing yield for investors and multi-generational families.
- **Council Compliance**: Engineered to satisfy standard 18m frontage dual-occupancy rules across QLD (Logan, Ipswich, Redland, Moreton Bay, Gold Coast) and NSW (CDC Low Rise Housing Diversity Code).`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          "What is the difference between a duplex and a dual-key auxiliary dwelling?",
          "What are the infrastructure charges for a duplex in Queensland?",
          "What are the setback rules for building a duplex in City of Gold Coast?",
        ],
        modelUsed: "hudson-floorplan-engine",
      };
    }

    if (matchedDesign === "wisteria") {
      return {
        answer: `### Hudson Homes Architectural Design: Wisteria Dual Living Range

Here are the verified architectural specifications for the **Wisteria Dual Living / Duplex** family:

- **Wisteria 33** (308 m², 5 Bed, 3 Bath, 3 Car, Width: 15.5m, Length: 23.2m, Min Lot Frontage: 16.0m)
- **Wisteria 34** (315 m², 5 Bed, 3 Bath, 3 Car, Width: 16.0m, Length: 23.8m, Min Lot Frontage: 16.5m)
- **Wisteria 36** (335 m², 6 Bed, 4 Bath, 3 Car, Width: 16.5m, Length: 24.5m, Min Lot Frontage: 18.0m)
- **Wisteria 40** (372 m², 6 Bed, 4 Bath, 4 Car, Width: 17.5m, Length: 25.0m, Min Lot Frontage: 19.0m)

- **Dual Living / Duplex Design**: The Wisteria range is Hudson's flagship Queensland and NSW dual-occupancy design featuring 3+2 or 4+2 bed duplex layouts under one cohesive roofline with independent entrances and separate utility metering.`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          "What is the difference between a duplex and a dual-key auxiliary dwelling?",
          "What are the infrastructure charges for a duplex in Queensland?",
          "Can I build a duplex on 61 Paradise Road Flagstone?",
        ],
        modelUsed: "hudson-floorplan-engine",
      };
    }

    const matching = HUDSON_FLOORPLANS.filter(
      (p) =>
        p.design.toLowerCase().includes(matchedDesign) ||
        p.label.toLowerCase().includes(matchedDesign)
    );

    if (matching.length > 0) {
      const p = matching[0];
      const allLabels = matching.slice(0, 4).map((m) => `**${m.label}** (${m.size} m², ${m.beds} Bed, ${m.baths} Bath, ${m.cars} Garage, Width: ${m.houseWidth || m.frontage}m, Length: ${m.houseLength || "N/A"}m, Min Lot Frontage: ${m.frontage}m)`).join("\n- ");
      
      let extraNote = "";
      if (matchedDesign === "wisteria") {
        extraNote = "\n- **Dual Living / Duplex Design**: The Wisteria range is Hudson's flagship Queensland and NSW dual-occupancy design featuring 3+2 or 4+2 bed duplex layouts under one cohesive roofline with independent entrances and separate utility metering.";
      }

      return {
        answer: `### Hudson Homes Architectural Design: ${p.design} Range

Here are the verified architectural specifications for the **${p.design}** family:

- ${allLabels}${extraNote}

#### Key Design Features:
- **Optimal Living Space**: Efficient open-plan family layout with integrated kitchen, walk-in pantry, and outdoor alfresco living.
- **Master Suite**: Private master retreat featuring walk-in robe (WIR) and ensuite.
- **Available Inclusions**: Selectable across **H1 Smart**, **H2 Designer**, and **H3 Luxury** specifications.
- **Modified Plan Engine**: Compatible with our 1-click plan modifier in Quote Builder V2 to customize alfresco dimensions, garage extensions, or window placements!`,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          `Can ${p.label} fit on my lot?`,
          "What inclusion ranges does Hudson Homes offer?",
          "How does Quote Builder V2 calculate variations?",
        ],
        modelUsed: "hudson-floorplan-engine",
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. SPECIFIC TECHNICAL & SPECIFICATION HANDLERS (High Priority)
  // -------------------------------------------------------------------------

  // 3A. Ceiling Heights & Vertical Volume
  if (
    (query.includes("ceiling height") ||
      query.includes("high ceiling") ||
      query.includes("2440") ||
      query.includes("2590") ||
      query.includes("2740") ||
      (query.includes("ceiling") && !query.includes("insulation") && !query.includes("batts") && !query.includes("fan"))) &&
    !query.includes("insulation") &&
    !query.includes("batts")
  ) {
    return {
      answer: `### Hudson Homes Standard Ceiling Heights

Hudson Homes standard ceiling heights are calibrated for optimal light, thermal efficiency, and interior volume across our specification ranges:

1. **H1 Smart Inclusions**:
   - **Nominal 2440mm ceiling height** throughout the entire home.
   - Clean, functional volume delivering great energy efficiency and smart value.

2. **H2 Designer Inclusions**:
   - **Raised 2590mm high ceilings** throughout single-storey homes and ground floor of double-storey homes.
   - Creates display-home luxury, greater natural light through larger windows, and enhanced vertical space.
   - Optional ground floor upgrade available to **2740mm** ceiling height.

3. **H3 Luxury Inclusions**:
   - **Raised 2590mm high ceilings** standard (with 2740mm ground floor upgrade option) paired with upgraded full-height doors and highlight architectural glazing.

4. **Ceiling Fans**:
   - Quality 48" or 52" modern ceiling fans are included to all bedrooms as standard, complementing air conditioning systems.

> [!TIP]
> Ceiling height selections are configured directly in Step 1 of Quote Builder V2 and flow automatically into your sales estimate!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between H1 Smart and H2 Designer?",
        "What appliances are included in H2 Designer?",
        "What benchtops come standard in H1 Smart?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3B. Kitchen Appliances: Haier (H1) & Fisher & Paykel (H2/H3)
  if (
    query.includes("appliance") ||
    query.includes("oven") ||
    query.includes("cooktop") ||
    query.includes("rangehood") ||
    query.includes("dishwasher") ||
    query.includes("fisher") ||
    query.includes("paykel") ||
    query.includes("haier") ||
    query.includes("westinghouse")
  ) {
    return {
      answer: `### Hudson Homes Official Kitchen Appliance Suite

Hudson Homes specifies industry-leading kitchen appliances calibrated to each specification tier (grounded in our official Quote & Inclusions Schedule):

1. **H1 Smart Inclusions (Haier 600mm Suite)**:
   - **Haier 600mm Stainless Steel Electric Oven**: Multi-function fan-forced oven with digital timer and cool-touch glass door.
   - **Haier 600mm 4-Zone Cooktop**: Stainless steel gas or ceramic glass electric cooktop.
   - **Haier 600mm Slide-Out / Canopy Rangehood**: High-performance ducted extraction.
   - **Haier 600mm Stainless Steel Dishwasher**: Fully connected and installed as standard.

2. **H2 Designer Inclusions (Fisher & Paykel 900mm Luxury Suite)**:
   - **Fisher & Paykel 900mm Luxury Built-in Oven**: Premium commercial-grade brushed stainless steel with generous 100L+ multi-shelf capacity.
   - **Fisher & Paykel 900mm 5-Burner Cooktop**: Powerful central dual-ring brass wok burner, cast-iron trivets, and flame failure safety.
   - **Fisher & Paykel 900mm High-Extraction Canopy Rangehood**: Stainless steel multi-speed extraction.
   - **Fisher & Paykel Stainless Steel Dishwasher**: Fully installed and integrated as standard ($0 variation).

3. **H3 Luxury Inclusions (Fisher & Paykel Chef & Butler's Suite)**:
   - **Fisher & Paykel 900mm Luxury Oven & Cooktop Suite**.
   - **Fisher & Paykel Premium Stainless Steel Dishwasher**.
   - **Fisher & Paykel Built-in Microwave Oven** with matching stainless steel trim kit.
   - Double bowl undermount stainless steel sink and scullery/butler's pantry fit-out.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What benchtops are included in H2 Designer?",
        "What is included in the H3 luxury tier?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3C. Benchtops & Cabinetry (Engineered Stone vs Laminate)
  if (
    query.includes("benchtop") ||
    (/\bstone\b/i.test(query) && !query.includes("flagstone") && !query.includes("bridgeman") && !query.includes("touchstone")) ||
    query.includes("laminate") ||
    query.includes("island") ||
    query.includes("cabinetry") ||
    query.includes("undermount")
  ) {
    return {
      answer: `### Hudson Homes Benchtop & Cabinetry Specifications

Hudson Homes adheres to modern building standards, including fully compliant silica-safe engineered stone and durable cabinetry:

1. **H1 Smart Inclusions**:
   - **Durable Laminate Benchtops**: Modern square-edge or post-formed laminate benchtops from Laminex / Polytec in contemporary designer colours.
   - **Cabinetry**: Fully lined interior carcasses with matching overhead cupboards and painted bulkheads above.
   - **Sink**: Drop-in stainless steel double bowl sink with chrome mixer.

2. **H2 Designer Inclusions**:
   - **20mm Engineered Stone Benchtops**: Standard to **Kitchen, Ensuite, Main Bathroom, and Laundry** (silica-safe compliant engineered composite).
   - **Profile**: Elegant 20mm pencil round edge finish.
   - **Features**: Soft-close cupboard doors and soft-close cutlery drawers.
   - **Tapware**: Designer high-arc gooseneck pull-out mixer in chrome, matte black, or brushed nickel.

3. **H3 Luxury Inclusions**:
   - **40mm Edge Engineered Stone**: Thickened 40mm pencil round or mitred stone edge to kitchen island.
   - **Undermount Sink**: Double bowl undermount stainless steel sink flush-mounted under the stone as standard ($0 variation).
   - **Butler's Pantry**: Stone benchtops extended into prep kitchen / pantry with secondary sink.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "What ceiling heights come standard in H1 vs H2?",
        "Tell me about H3 Luxury inclusions",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3D. Air Conditioning & Climate Control
  if (query.includes("air conditioning") || query.includes("air con") || query.includes("ducted") || query.includes("split system") || query.includes("actron") || query.includes("daikin")) {
    return {
      answer: `### Hudson Homes Climate Control & Air Conditioning

Year-round heating and cooling systems are engineered to home layout and climate zone:

1. **H1 Smart Inclusions**:
   - **Reverse-Cycle Split System Air Conditioner**: High-efficiency inverter split system fully installed in main living zone.
   - **Ceiling Fans**: 48" or 52" modern ceiling fans with wall controls included in all bedrooms.

2. **H2 Designer Inclusions**:
   - **Fully Ducted Reverse-Cycle Air Conditioning**: Premium **ActronAir or Daikin** system with inverter technology.
   - **Multi-Zone Digital Controller**: Separate day/night living and bedroom zoning for tailored comfort and energy savings.
   - Ducted outlets discreetly recessed into ceilings throughout living and bedroom spaces.

3. **H3 Luxury Inclusions**:
   - **Fully Zoned Ducted Air-Conditioning with MyAir (MyAir5) Touch Screen Controller**: Premium smart digital touchscreen zoned ducted system with individual airflow dampers, Wi-Fi / smartphone app control for remote climate management, and customized climate zones.

4. **IP Investment Range**:
   - Reverse-cycle ducted or multi-split AC included to maximize tenant retention and rental yield.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What ceiling heights come standard in H1 vs H2?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3D2. Ceiling Fans
  if (query.includes("fan") || query.includes("ceiling fan")) {
    return {
      answer: `### Hudson Homes Ceiling Fans & Ventilation

Hudson Homes includes modern, energy-efficient ceiling fans across our standard specifications:

1. **Bedrooms**:
   - Modern 48" or 52" slimline **ceiling fans** with wall-mounted multi-speed controls are installed in **all bedrooms** as standard.
2. **Alfresco & Living Areas**:
   - External-rated ceiling fans to outdoor alfresco entertaining areas are included in display specifications or selectable via Quote Builder V2.
3. **Energy Efficiency & Comfort**:
   - Complements ducted and split-system air conditioning to reduce active energy cooling loads under NatHERS 7-Star compliance.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What air conditioning is included in H1 vs H2?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3E. 50-Year Structural Warranty & Guarantees
  if (query.includes("50 year") || query.includes("50-year") || query.includes("structural warranty") || query.includes("contract guarantee")) {
    return {
      answer: `### Hudson Homes Guarantees & 50-Year Structural Warranty

Hudson Homes provides Australia's industry-leading builder protection for complete homeowner confidence:

1. **50-Year Structural Warranty**:
   - Covers core structural elements: engineered concrete slab and footings, structural load-bearing timber framing, structural lintels, and engineered roof trusses.
   - Exceeds statutory state warranty obligations (typically 6-7 years) by more than 7x, demonstrating our build quality and engineering integrity.

2. **Fixed Price Contract Guarantee**:
   - Once your Hudson Building Contract is signed, your contract price is **100% genuine fixed price**.
   - Zero price escalation clauses, zero hidden surprise fees during construction.

3. **Guaranteed Timeframes**:
   - Contractually promised construction completion timelines for predictable move-in dates and fast rental returns.

4. **Maintenance & Defects Period**:
   - Comprehensive statutory defects liability period after handover to attend to any post-settlement adjustments.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes include?",
        "What soil classifications are covered up to H-class?",
        "What is the difference between H1 Smart and H2 Designer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3F. Termite Protection & Management
  if (query.includes("termite") || query.includes("termimesh") || query.includes("kordon") || query.includes("pest")) {
    return {
      answer: `### Hudson Homes Termite Protection System

Hudson Homes protects every home with an engineered physical termite management system complying with AS 3660.1:

1. **Physical Termite Barrier**:
   - We utilize **Termimesh stainless steel woven mesh** or **Kordon moisture & termite barrier** to all slab penetrations, perimeter brick cavities, and cold joints.
   - Physical barriers block subterranean termite ingress without toxic chemicals or recurring liquid soil poisons.

2. **Long-Term Warranty**:
   - Backed by manufacturer product warranties of up to **50 years** (50-year warranty, subject to standard annual homeowner inspections).

3. **Durable Framing**:
   - H2-treated structural timber framing treated against termite attack and rot for lifelong resilience.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is included in Hudson Homes fixed site costs?",
        "Tell me about the 50-Year Structural Warranty",
        "What foundation types are covered in site costs?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3G. Energy Efficiency (NatHERS 7-Star & BASIX) & Insulation
  if (
    (query.includes("nathers") ||
      query.includes("7 star") ||
      query.includes("7-star") ||
      query.includes("energy") ||
      query.includes("basix") ||
      query.includes("thermal") ||
      query.includes("insulation") ||
      query.includes("batts")) &&
    !query.includes("tank") &&
    !query.includes("rainwater")
  ) {
    return {
      answer: `### Energy Efficiency, NatHERS 7-Star & BASIX Compliance

Every Hudson Homes build complies fully with the latest National Construction Code (NCC 2022) **NatHERS 7-Star thermal efficiency standards** and NSW **BASIX energy & water benchmarks**:

1. **Queensland (QLD) Policy Update (New Price List)**:
   - **$0 Additional Allowances**: Under the new Queensland price list, Hudson Homes **no longer requires additional allowances for energy efficiency in QLD** ($0 additional energy allowances needed!).
   - Full NatHERS 7-Star compliance (insulation batts, thermal performance, glazed openings, heat pump hot water) is fully built into base pricing with zero surprise cost variations.

2. **New South Wales (NSW) BASIX Certificate**:
   - Fixed site costs include full BASIX thermal, water (rainwater tank connection to toilets/laundry/garden), and energy compliance documentation.

3. **High-Performance Insulation**:
   - **Ceiling Insulation**: R4.0 to R5.0 glasswool ceiling batts over living areas.
   - **External Wall Insulation**: R2.0 to R2.5 wall batts with reflective vapour-permeable thermal wall wrap.

4. **Energy Efficient Glazing**:
   - Strategically oriented low-E or argon-insulated window glazing to limit summer heat gain and retain winter warmth.

5. **Hot Water & Lighting**:
   - **QLD**: Wulfe Heat Pump M9 (200L or 330L) delivering 70%+ energy savings.
   - **NSW**: Rinnai 26L Gas Continuous Flow hot water system (preset to 50°C).
   - 100% low-energy LED downlights and lighting circuits throughout the home.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes include?",
        "What appliances are standard in H2 Designer?",
        "Are concrete piers included in Hudson Homes fixed site costs?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H. Geotechnical Soil Classifications & Slab Engineering (AS 2870)
  if (
    query.includes("soil") ||
    query.includes("geotech") ||
    query.includes("class m") ||
    query.includes("class h") ||
    query.includes("class p") ||
    query.includes("class s") ||
    query.includes("class e") ||
    query.includes("waffle pod") ||
    query.includes("stiffened raft") ||
    query.includes("slab type") ||
    query.includes("slab design") ||
    query.includes("reactive clay") ||
    query.includes("ground movement") ||
    query.includes("borehole") ||
    query.includes("pier") ||
    query.includes("piers")
  ) {
    return {
      answer: `### Geotechnical Soil Classification & Foundation Engineering (AS 2870)

All Hudson Homes structural foundations are designed strictly in accordance with **AS 2870 (Residential Slabs and Footings)** and certified by registered structural engineers:

#### 1. AS 2870 Soil Classification Categories & Surface Movement ($y_s$):
- **Class A (Sand / Rock)**: Little or no ground movement. Expected surface movement $y_s = 0\\text{mm}$.
- **Class S (Slightly Reactive)**: Slight ground movement with moisture variation. Characteristic movement $y_s \\le 20\\text{mm}$.
- **Class M (Moderately Reactive)**: Moderate ground movement. Characteristic movement $20\\text{mm} < y_s \\le 40\\text{mm}$. Very common across Australian suburban developments.
- **Class H1 (Highly Reactive)**: High ground movement. Characteristic movement $40\\text{mm} < y_s \\le 60\\text{mm}$. Deep footing embedment required.
- **Class H2 (Highly Reactive Clay)**: Very high ground movement. Characteristic movement $60\\text{mm} < y_s \\le 75\\text{mm}$. Common in western Sydney shale and South East Queensland basaltic/black soils.
- **Class E (Extremely Reactive)**: Extreme ground movement ($y_s > 75\\text{mm}$). Requires specialized structural raft design or deep pier-and-beam foundations.
- **Class P (Problem Site)**: Sites with uncontrolled or uncompacted fill (>400mm depth), soft compressible soils, high water tables, active tree root drying zones, mine subsidence, or slope instability. Requires site-specific structural engineering.

#### 2. Foundation & Concrete Slab Types:
- **Engineered Waffle Pod Slab (Class 1a)**:
  - Constructed using expanded polystyrene (EPS) void formers (nominal 1090x1090mm pods) with reinforced concrete internal ribs (minimum 110mm width), perimeter edge beams (typically 300mm–400mm deep), and continuous top steel mesh (SL72/SL82/SL92).
  - Delivers superior thermal insulation (under-slab R-value) and predictable ground damp isolation.
- **Traditional Stiffened Raft Slab**:
  - Monolithic ground-bearing slab with excavated internal trench beams cast into the earth. Preferred on sloping sites with step-downs, significant cut-and-fill pads, or high soil reactivity.
- **Drop Edge Beams (DEB)**:
  - Vertical concrete perimeter beam extensions cast into the slab edge to retain earth fill on sloping sites without requiring separate external retaining walls up to 1.5m.
- **Concrete Piering**:
  - Bored reinforced concrete piers (300mm to 450mm diameter) drilled through uncontrolled fill or reactive surface layers directly into stable, natural bearing strata, stiff clay, or sandstone bedrock.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover?",
        "Are concrete piers included in NSW and QLD standard site costs?",
        "How does Sewer Zone of Influence (ZOI) affect concrete piering?",
        "What are the requirements for BAL-29 bushfire construction?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_PARTY_WALL. Duplex Party Walls & Fire/Acoustic Separation (NCC 2022 Part 3.7.3 & AS 1530.4)
  if (
    query.includes("party wall") ||
    query.includes("fire wall") ||
    query.includes("separating wall") ||
    query.includes("frl 60") ||
    query.includes("part 3.7.3") ||
    query.includes("as 1530.4") ||
    query.includes("rw+ctr") ||
    query.includes("rw + ctr") ||
    ((query.includes("duplex") || query.includes("dual occ")) &&
      (query.includes("fire") || query.includes("acoustic") || query.includes("sound") || query.includes("separation") || query.includes("party")))
  ) {
    return {
      answer: `### Dual-Occupancy Party Walls: Fire & Acoustic Separation (NCC 2022 Part 3.7.3 & AS 1530.4)

When constructing attached dual-occupancy homes, duplexes, and townhouses, the central separating wall (**party wall**) must satisfy rigorous statutory fire and acoustic performance standards:

#### 1. Fire Resistance Level (FRL 60/60/60):
- Under **NCC 2022 Part 3.7.3** and **AS 1530.4 (Fire-resistance tests of elements of construction)**, the separating wall must achieve an **FRL of 60/60/60**:
  - **Structural Adequacy: 60 minutes** (the wall supports structural load without collapsing during fire).
  - **Integrity: 60 minutes** (prevents fire, flames, and hot toxic gases from passing through cracks or openings).
  - **Insulation: 60 minutes** (limits heat transmission so unexposed wall surfaces do not ignite adjacent materials).
- **Vertical Continuity**: The fire-rated barrier must extend continuously from the foundation concrete slab, through ceiling cavities, and finish tight against the underside of non-combustible roof covering (Colorbond or concrete tiles) or extend through as a fire parapet.

#### 2. Acoustic Separation ($R_w + C_{tr} \\ge 50$):
- **Airborne Sound Insulation**: The wall system must achieve a weighted sound reduction index of **$R_w + C_{tr} \\ge 50$** under AS/NZS ISO 717.1.
- **Discontinuous Construction**:
  - Twin independent timber stud frames separated by a minimum **20mm continuous air gap**.
  - High-density acoustic glasswool or polyester insulation batts (minimum $R_w 2.5$) installed inside both stud cavities.
  - A central fire-rated acoustic barrier (such as a 25mm fire-rated shaftliner or certified Knauf / CSR Bradford Partiwall / Promat system).
  - High-density 13mm or 16mm fire-rated plasterboard linings.
- Discontinuous construction mechanically isolates one dwelling from the other, preventing vibration and footstep impact noise transmission.

#### 3. Service Penetrations & Electrical Layout:
- **No Back-to-Back Outlets**: Electrical powerpoints, switches, and recessed light switches must never be installed back-to-back in the same stud bay. A minimum **300mm horizontal separation** is required.
- **Intumescent Fire & Acoustic Sealant**: All perimeter junctions, plumbing pipes, and cabling penetrations are sealed with fire-rated mastic that expands dramatically when exposed to heat, sealing air gaps.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What dual occupancy designs does Hudson Homes offer?",
        "What are the rules for building a duplex in Queensland vs NSW?",
        "Tell me about the Wisteria 33 dual living design",
        "What are the infrastructure charges for building a duplex?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_BALUSTRADE. Balustrades, Handrails & Fall Prevention (NCC 2022 Part 11.2 & AS 1170.1)
  if (
    query.includes("balustrade") ||
    query.includes("barrier") ||
    query.includes("handrail") ||
    query.includes("stair rail") ||
    query.includes("balcony rail") ||
    query.includes("fall prevention")
  ) {
    return {
      answer: `### Balustrades, Barriers & Fall Prevention Compliance (NCC 2022 Part 11.2 & AS 1170.1)

All Hudson Homes balconies, elevated decks, external landings, and internal staircases comply strictly with **NCC 2022 Volume Two Part 11.2** and **AS 1170.1 (Structural Design Actions)**:

#### 1. When is a Balustrade / Barrier Legally Mandated?
- A continuous barrier is mandatory along the edge of any trafficable surface (balcony, deck, veranda, landing, stair, or mezzanine) where the finished floor level is **1.0 metre or more above the ground or surface below**.

#### 2. Height Clearances & Dimensions:
- **Balconies, Decks & Landings**: Minimum height of **1000mm (1.0m)** measured vertically above the finished surface level.
- **Staircases & Ramps**: Minimum height of **865mm** measured vertically above the nosing line of stair treads.
- **Transitional Landings**: Where a stair landing exceeds 500mm length, the barrier height must transition to **1000mm**.

#### 3. Openings & Spherical Clearance:
- **125mm Maximum Opening**: Openings between balusters, intermediate rails, or bottom rails must not permit a **125mm diameter sphere** to pass through at any point.
- Prevents children from slipping through or becoming trapped between balusters.

#### 4. Anti-Climb Zone for Elevated Falls (> 4.0m):
- Where the potential fall height exceeds **4.0 metres** (such as upper-floor double-storey balconies or grand facades):
  - Any horizontal or near-horizontal climbable elements (transoms or intermediate rails) between **150mm and 760mm above the floor** are strictly prohibited.
  - Balustrades must feature vertical uprights or flush solid panels to prevent children climbing.

#### 5. Material Specifications:
- **Semi-Frameless & Frameless Glazing**: Toughened safety glass (minimum 10mm to 12mm thickness) or structural laminated glass certified to **AS 1288 (Glass in Buildings)** with stainless steel spigots or aluminium base channels.
- **Architectural Aluminium**: Corrosion-resistant powder-coated aluminium vertical balusters fixed with concealed stainless steel fasteners.
- **Engineered Structural Load Testing**: Sized to resist minimum **0.75 kN/m point loads** and **0.6 kN/m distributed lateral forces** without permanent deflection.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What facade options are available for double storey homes?",
        "Tell me about H3 Luxury Inclusions",
        "What are the rules for swimming pools and pool fencing?",
        "What wind classification does Hudson Homes build for?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_POOL. Swimming Pools & Pool Safety Barriers (AS 1926.1, AS 1926.2 & NCC Part 3.9.3)
  if (
    query.includes("pool fence") ||
    query.includes("pool fencing") ||
    query.includes("swimming pool") ||
    query.includes("pool barrier") ||
    query.includes("pool safety") ||
    query.includes("as 1926") ||
    (query.includes("pool") && (query.includes("fence") || query.includes("fencing") || query.includes("barrier") || query.includes("law") || query.includes("rule") || query.includes("gate") || query.includes("safety") || query.includes("compliance")))
  ) {
    return {
      answer: `### Swimming Pools & Pool Fencing Safety Laws (AS 1926.1, AS 1926.2 & NCC Part 3.9.3)

For properties incorporating a swimming pool, spa, or outdoor plunge pool, safety barriers must satisfy mandatory state legislation (Queensland *Building Act 1975* & NSW *Swimming Pools Act 1992*) and **AS 1926.1 (Safety Barriers for Swimming Pools)**:

#### 1. Minimum Barrier Height & Ground Clearances:
- **Barrier Height**: Minimum **1200mm (1.2m)** measured continuously on the outside of the barrier from the finished ground surface.
- **Gap Beneath Barrier**: Maximum **100mm clearance** between the bottom of the fence and any permanent ground surface (turf, pavers, or concrete).

#### 2. Pool Access Gates & Latching Devices:
- **Outward Opening**: Pool gates must swing **outward away from the pool area** at all times.
- **Self-Closing & Self-Latching**: Gate must be fitted with a spring hinge mechanism that automatically closes and latches from any open position, including when resting against the latch.
- **Latch Height**: The latch release mechanism must be positioned at least **1500mm above finished ground level** on the outside of the fence (or inside behind a compliant shield).

#### 3. 900mm Non-Climbable Zone (NCZ):
- A **900mm radius non-climbable zone** is legally mandated on the outside of the barrier.
- **Zero Climbable Footholds**: No tree branches, boundary fence rails, barbecues, air conditioning condenser units, retaining walls, potted plants, or taps may be located within this 900mm arc.
- If an existing boundary fence forms part of the pool barrier:
  - It must have a minimum height of **1800mm measured from the inside (pool side)**.

#### 4. Dwelling Doors & Windows Facing the Pool:
- **Direct Dwelling Doors Prohibited**: In modern builds across NSW and QLD, **direct door access from habitable rooms into the pool area is strictly prohibited** without an intervening isolating pool barrier.
- **Window Openings**: Any window opening directly into the pool area with a sill height < 1800mm must either:
  1. Be permanently restricted to open no more than **100mm** using security screws or riveted window restrictors.
  2. Be fitted with heavy-duty security screens complying with **AS 5039**.

#### 5. CPR Resuscitation Signage:
- A weatherproof cardiopulmonary resuscitation (CPR) sign displaying current DRSABCD emergency guidance must be prominently displayed within direct view of the pool enclosure.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are balustrade and barrier requirements?",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_CDC_DA. Planning Pathways: CDC vs DA in NSW
  if (
    (query.includes("cdc") && (query.includes("da") || query.includes("versus") || query.includes("vs") || query.includes("difference") || query.includes("path"))) ||
    query.includes("complying development") ||
    (query.includes("difference") && query.includes("cdc")) ||
    query.includes("private certifier vs council") ||
    (query.includes("planning path") && query.includes("nsw"))
  ) {
    return {
      answer: `### NSW Planning Approvals: Complying Development (CDC) vs Development Application (DA)

In New South Wales, residential home and dual-occupancy construction proceeds via one of two statutory approval pathways:

#### 1. Complying Development Certificate (CDC) — Fast-Track Private Certifier:
- **Governing Policy**: NSW State Environmental Planning Policy (Housing) 2021 (**Low Rise Housing Diversity Code** & Codes SEPP).
- **Approval Authority**: Registered Private Certifier (accredited building surveyor) or Local Council.
- **Fast-Track Assessment**: Legally approved in **as little as 20 business days** once documentation is lodged.
- **Strict Pre-Set Code Standards**:
  - Site must satisfy objective standards: minimum lot size (e.g. 500m² for attached dual occupancy in R2), minimum 15m–18m frontage, standard boundary setbacks, and maximum site coverage.
  - **Zero Neighbor Objections**: Neighbors receive statutory 14-day pre-approval notification, but the certifier **must approve the application if it complies 100% with the code** (no subjective neighbor objections or council committee politics).
- **Exclusions**: CDC cannot be utilized on land affected by critical biodiversity, high-risk flood planning areas, uncertified bushfire BAL-40/BAL-FZ, or State Heritage registers.

#### 2. Development Application (DA) — Local Municipal Council Assessment:
- **Governing Instrument**: Local Council Local Environmental Plan (LEP) & Development Control Plan (DCP) (e.g. Camden LEP, Blacktown LEP, The Hills LEP).
- **Approval Authority**: Local Municipal Council Planning Department.
- **Assessment Timeline**: Typically **60 to 120+ business days** (longer if additional information RFI requests or council panels occur).
- **When is DA Required?**:
  - Lots seeking variations to standard setback envelopes, building height, or site coverage.
  - Irregular, narrow, or steeply sloping allotments (> 15% gradient).
  - Properties subject to local heritage conservation overlays, specific overland flow flood zones, or environmentally sensitive corridors.
- **Public Exhibition**: Mandatory public notification where neighbors can lodge formal submissions. Council retains subjective discretion to request plan modifications.

#### 3. Hudson Homes Strategy & Value:
- Hudson Homes architects and siting technicians **design specifically to achieve 100% CDC compliance wherever possible**.
- This saves homeowners and investors **2 to 4 months of holding costs and construction loan interest**, getting your home out of the ground faster!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the rules for building a duplex under NSW CDC?",
        "What dual occupancy designs does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 3H_DUPLEX_VS_AUXILIARY. Duplex (Dual Occupancy) vs Auxiliary Unit (Secondary Dwelling / Dual Key)
  if (
    ((query.includes("duplex") || query.includes("dual occ") || query.includes("dual occupancy")) &&
      (query.includes("auxiliary") || query.includes("secondary dwelling") || query.includes("dual key") || query.includes("dual-key") || query.includes("granny flat"))) ||
    ((query.includes("difference") || query.includes("versus") || query.includes("vs") || query.includes("compare") || query.includes("between")) &&
      (query.includes("duplex") || query.includes("auxiliary") || query.includes("dual key") || query.includes("secondary dwelling")))
  ) {
    return {
      answer: `### Duplex (Dual Occupancy) vs Auxiliary Unit (Secondary Dwelling / Dual-Key)

Understanding the statutory, title, and financial distinctions between a Duplex and an Auxiliary Unit is essential for property investors and developers across Queensland and New South Wales:

| Feature / Metric | **Duplex (Dual Occupancy)** | **Auxiliary Unit (Secondary Dwelling / Dual-Key)** |
|---|---|---|
| **Statutory Definition** | Two complete, self-contained residential dwellings on a single cadastral allotment (attached side-by-side or stacked). | A smaller, subordinate self-contained dwelling established in conjunction with a primary dwelling under the same continuous roofline or detached. |
| **Title & Subdivision** | **Subdivisible**: Can typically be subdivided into two separate Torrens Titles (NSW) or Freehold Titles / Strata Titles (QLD), subject to meeting council minimum lot size (e.g. 500m² under NSW CDC or 600m²–800m² in QLD). Each can be sold individually. | **Single Title Only**: Remains permanently bound to the primary dwelling on one title. Cannot be separately subdivided, strata-titled, or sold off independently. |
| **Dwelling Size / GFA Limits** | **No statutory cap on GFA**: Both dwellings can be full-sized family homes (e.g., 4 Bed + 4 Bed, 180m² each). Governed only by boundary setbacks and maximum site coverage (50%–60%). | **Strict Floor Area Cap**: <br>• **Queensland**: Maximum **70m² GFA** (Logan, Redland) or **65m² GFA** (Ipswich) or **80m² GFA** (Gold Coast). <br>• **NSW**: Maximum **60m² GFA** under State Environmental Planning Policy (Housing) 2021. |
| **Council Infrastructure Charges** | **Full Charges Levied**: Local council / EDQ levies full trunk infrastructure headworks contributions on the second dwelling (typically **$25,000 to $33,000+** in QLD; **Section 7.11 / 7.12** in NSW). | **$0 INFRASTRUCTURE EXEMPTION (QLD)**: In most SEQ councils (Logan, Ipswich, Moreton Bay, Redland), an auxiliary unit under 70m² is **100% EXEMPT ($0 charges)** from infrastructure contributions! |
| **Tenancy & Income Potential** | Both dwellings can be leased to independent, unrelated tenants on separate tenancy agreements, generating two full market rental incomes. | Under QLD planning reforms (September 2022), auxiliary units can now be legally rented to unrelated tenants on separate residential leases, unlocking high-yielding dual cashflow on a single rates notice. |
| **Utility Metering & Connections** | Mandatory separate water meters, electrical meters (Two-Phase / Three-Phase supply), and telecommunications connections. | Typically shared service mains with optional private sub-metering (check meters) for water and electricity. |
| **Recommended Hudson Designs** | **Wisteria Range (33, 34, 36, 40)**, **Alabaster Range (31, 36, 40)**, **Magnolia (34, 37)**. | **Amber 21 (Auxiliary Suite)**, **Emerald 23**, or **Wisteria 33 Dual Living Configuration**. |`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the infrastructure charges for building a duplex in Queensland?",
        "What are the setback rules for building a duplex under NSW CDC?",
        "Tell me about the Amber 21 Dual Suite design",
        "What dual occupancy designs does Hudson Homes offer?",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 3H_CONDENSATION. NCC 2022 Condensation Management (Part 10.8 & AS 4200)
  if (
    query.includes("condensation") ||
    query.includes("vapour permeable") ||
    query.includes("vapor permeable") ||
    query.includes("exhaust duct") ||
    query.includes("wall wrap") ||
    query.includes("as 4200") ||
    (query.includes("ncc") && query.includes("ventilation"))
  ) {
    return {
      answer: `### NCC 2022 Condensation Management & Vapour Permeability (Part 10.8 & AS 4200)

Under **NCC 2022 Volume Two Part 10.8** and **AS 4200.1 / AS 4200.2 (Pliable Building Membranes and Underlays)**, Australian residential homes must integrate engineered condensation control to safeguard structural timbers and indoor air quality:

#### 1. Mandatory Vapour-Permeable Wall Wraps:
- In cooler southern regions and humid coastal sub-tropical zones (Climate Zones 2, 6, 7, 8):
  - External framed walls must be wrapped with a certified **Class 3 or Class 4 vapour-permeable pliable membrane** (such as Bradford Enviroseal or James Hardie Weather Barrier).
  - **How it Works**: Allows internal moisture vapour (from cooking, showering, and breathing) to escape naturally outward through the building envelope without condensing into liquid water on structural timber studs, avoiding dry rot, framing decay, and toxic mould.

#### 2. Dedicated Exhaust Ducting Directly to Outside Atmosphere:
- **Zero Ceiling Space Discharges**: Discharging bathroom, ensuite, laundry, or kitchen rangehood exhaust into an unvented roof space or ceiling cavity is **strictly prohibited**.
- **Ducted to Outside Air**:
  - All exhaust systems must be ducted continuously to the external atmosphere via an external wall louvre, eave vent, or roof penetration cowl.
  - **Minimum Airflow Rates**:
    - Bathrooms & Sanitary Compartments: Minimum **25 L/s** (intermittent) or **21 L/s** (continuous).
    - Kitchen Cooktops & Rangehoods: Minimum **40 L/s** (intermittent).
  - All exhaust ductwork must incorporate a self-closing non-return backdraft damper to prevent cold outside air or driving rain entering when the fan is switched off.

#### 3. Roof Space Ventilation Requirements:
- Where metal sheet roofing (e.g. Colorbond) or concrete tiles are installed with ceiling insulation batts:
  - Roof cavities must provide balanced air circulation.
  - A minimum **25,000 mm² of open ventilation area per 100 m² of ceiling area** is mandated, achieved through eaves soffit slot vents and ventilated ridge capping cowls.
  - Continuous airflow expels moist warm air before it can contact cold metal roof sheets during winter nights.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What energy efficiency star rating do Hudson homes achieve?",
        "What timber framing specifications does Hudson Homes use?",
        "What is the difference between H1 Smart and H2 Designer?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_WATER_TANK. Rainwater Harvesting & BASIX Water Conservation
  if (
    query.includes("rainwater") ||
    query.includes("water tank") ||
    query.includes("basix water") ||
    (query.includes("tank") && (query.includes("water") || query.includes("size") || query.includes("capacity") || query.includes("plumbed")))
  ) {
    return {
      answer: `### Rainwater Harvesting & BASIX Water Conservation (NSW & QLD)

Hudson Homes integrates water-saving systems calibrated to statutory state benchmarks and developer estate covenants:

#### 1. New South Wales (NSW) BASIX Certificate Mandates:
- **Standard Rainwater Tank Capacity**:
  - **2,000 to 5,000 Litres** (typically a 3,000L slimline poly or Colorbond steel tank with automatic submersible or external pump).
- **Mandatory Plumbing Connections**:
  - Plumbed directly to **all toilet cisterns**.
  - Plumbed to the **cold water washing machine tap** in the laundry.
  - Plumbed to at least **one external garden hose tap** for landscaping irrigation.
- **Mains Water Top-Up**:
  - Equipped with an automatic mains-water diverter valve (e.g. Davey RainBank or Bianco Rainsaver) that seamlessly switches to town water when rainwater is depleted.
- **BASIX 40%+ Target**: Satisfies NSW BASIX requirements to reduce potable mains water consumption by at least 40% compared to benchmark homes.

#### 2. Queensland (QLD) Water Management (QDC MP 4.2):
- **High-Efficiency WELS Fixtures**:
  - Standard builds utilize WELS 3-Star rated showerheads (<= 9 L/min), WELS 4-Star dual flush toilets (4.5L/3L), and WELS 4-Star tapware.
- **Estate Covenants & Rainwater Tanks**:
  - Where required by specific local council planning schemes or master-planned estates (e.g. Redland, Ipswich, or acreage estates), a 5,000L poly tank is installed and plumbed to internal sanitary fixtures.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover in NSW vs QLD?",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What is the difference between H1 Smart and H2 Designer?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_BAL. Bushfire Attack Level (AS 3959 BAL Standards)
  if (
    (query.includes("bushfire") ||
      query.includes("bal-") ||
      /\bbal\s*(?:low|12\.5|19|29|40|fz)\b/i.test(query) ||
      /\bbal[-\s]?\d+/i.test(query) ||
      query.includes("ember attack") ||
      query.includes("as 3959") ||
      query.includes("flame zone") ||
      (query.includes("fire") && (query.includes("bal") || query.includes("bushfire")))) &&
    !query.includes("balustrade") &&
    !query.includes("balcony") &&
    !query.includes("party wall") &&
    !query.includes("duplex")
  ) {
    return {
      answer: `### Bushfire Attack Level (BAL) Standards (AS 3959)

Hudson Homes constructs homes across all bushfire hazard categories under **AS 3959 (Construction of Buildings in Bushfire-Prone Areas)**:

#### 1. Bushfire Attack Level (BAL) Tiers & Radiant Heat Flux:
- **BAL-LOW**: Negligible risk. Standard NCC/BCA building construction applies.
- **BAL-12.5 (Radiant Heat Flux $\\le 12.5\\text{ kW/m²}$)**:
  - Primary risk is ember attack and burning debris.
  - **Requirements**: Corrosion-resistant metal ember screens ($\le 2\\text{mm}$ aperture in bronze, aluminium, or stainless steel) to all weep holes, openable windows, and roof cowl vents. Minimum 4mm toughened safety glass. Non-combustible roof sarking.
- **BAL-19 (Radiant Heat Flux $> 12.5\\text{ to } \\le 19\\text{ kW/m²}$)**:
  - Increasing heat flux and ember density.
  - **Requirements**: Toughened safety glass (min 5mm). External doors fire-rated or solid core (min 35mm) with perimeter draft/smoke seals. External wall cladding within 400mm of ground/decks must be non-combustible (brickwork, Hebel, or fiber cement).
- **BAL-29 (Radiant Heat Flux $> 19\\text{ to } \\le 29\\text{ kW/m²}$)**:
  - High risk of ember attack and burning debris ignited by radiant heat.
  - **Requirements**: All external glazing toughened safety glass (min 5mm/6mm). Aluminium window assemblies tested to AS 1530.8.1 with metal mesh screening. Non-combustible cladding throughout (brick, Hebel aerated concrete, or 9mm fiber cement). Gutter guards installed to prevent leaf accumulation. Garage doors fitted with heavy-duty perimeter compression seals ($\le 2\\text{mm}$ gaps).
- **BAL-40 (Radiant Heat Flux $> 29\\text{ to } \\le 40\\text{ kW/m²}$)**:
  - Very high risk of structural ignition.
  - **Requirements**: Windows protected by tested fire-rated motorized bushfire shutters or certified BAL-40 fire window systems with metal frames. Fully non-combustible decks and zero exposed timber framing.
- **BAL-FZ (Flame Zone - $> 40\\text{ kW/m²}$)**:
  - Direct flame contact. Requires specialized FZ fire shutters, FRL 30/--/-- or 60/60/60 fire-rated building envelope, and custom engineering.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the requirements for BAL-29 bushfire construction?",
        "What fixed site costs does Hudson Homes cover?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_ACOUSTIC. Acoustic & Road Noise Corridors (QDC MP 4.4 & NSW SEPP Transport)
  if (
    (query.includes("traffic noise") ||
      query.includes("road noise") ||
      query.includes("qdc mp 4.4") ||
      query.includes("noise corridor") ||
      query.includes("sound transmission") ||
      (query.includes("acoustic") && !query.includes("party wall") && !query.includes("duplex") && !query.includes("separating wall")) ||
      (query.includes("noise") && !query.includes("party wall") && !query.includes("duplex")))
  ) {
    return {
      answer: `### Acoustic & Road Traffic Noise Mitigation (QDC MP 4.4 & NSW SEPP Transport)

For properties situated along designated arterial roads, rail corridors, or transit corridors, building envelopes must satisfy statutory acoustic categories:

#### 1. Acoustic Categories & Noise Levels ($L_{A10,18h}$):
- **Category 1 (58 to 63 dBA)**: Standard residential glazing with quality acoustic perimeter seals.
- **Category 2 (63 to 68 dBA)**:
  - Requires **6mm or 6.38mm acoustic laminated glass** to all bedrooms and living areas facing the transport corridor.
  - Solid core external entrance doors (min 35mm thick) fitted with acoustic drop seals and perimeter rubber gaskets.
  - Acoustic ceiling insulation ($R_w \\ge 35$, typically high-density R2.5 acoustic ceiling batts).
- **Category 3 (68 to 73 dBA)**:
  - Heavy acoustic glazing: Double-glazed Insulated Glass Units (IGUs) with acoustic PVB interlayer (e.g. 6mm toughened / 12mm argon cavity / 6.38mm acoustic laminate) achieving $R_w + C_{tr} \\ge 35$.
  - Mechanical fresh-air ventilation system (or ducted reverse-cycle air conditioning with continuous outside air intake) to allow residents to sleep with windows securely closed.
  - Staggered mechanical penetrations and acoustically sealed wall junction penetrations.
- **Category 4 (>73 dBA)**:
  - Specialized architectural acoustic design with acoustic baffle boxes, double-stud boundary walls, and decoupled ceilings.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the differences between H1 Smart and H2 Designer inclusions?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about H3 Luxury Inclusions",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_ZOI. Sewer & Stormwater Zone of Influence (ZOI)
  if (
    query.includes("sewer") ||
    query.includes("zoi") ||
    query.includes("zone of influence") ||
    query.includes("angle of repose") ||
    query.includes("build over sewer") ||
    query.includes("easement") ||
    query.includes("sydney water") ||
    query.includes("logan water") ||
    query.includes("urban utilities") ||
    query.includes("unitywater")
  ) {
    return {
      answer: `### Sewer & Stormwater Zone of Influence (ZOI) Engineering

When building adjacent to public infrastructure mains (Sydney Water, Hunter Water, Urban Utilities, Logan Water, Unitywater, City of Gold Coast), footings must comply with Zone of Influence (ZOI) rules:

#### 1. The 45° Angle of Repose Rule:
- The Zone of Influence is defined as a **45-degree angle of repose** drawn upwards from the invert (the bottom internal flowline) of the public pipe to the natural ground surface.
- Any building footing (slab edge, thickening beam, or pad) located within this 45° zone will exert surcharge vertical loads onto the public pipe, risking pipe fracture or ground subsidence.

#### 2. Structural Piering Requirements:
- Where building works fall inside the ZOI, footings cannot rely on standard ground bearing.
- **Bored Reinforced Concrete Piers**: Must be drilled past the 45° angle of repose to a minimum depth of **300mm to 500mm BELOW the pipe invert level**, founded into natural undisturbed ground or bedrock.
- This ensures 100% of the building's structural load is transferred below the public asset.

#### 3. Prohibited Build-Over Clearances:
- No permanent structures may be built directly over manholes, maintenance shafts, or inspection openings (minimum 1.0m to 1.5m horizontal clearance required).
- No building directly over trunk mains (typically pipes $\\ge 300\\text{mm}$ diameter).
- Minor reticulated mains ($\le 150\\text{mm}-225\\text{mm}$) may be bridged with certified Build-Over-Sewer (BOS) approval and concrete encasement if required.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Are concrete piers included in Hudson Homes fixed site costs?",
        "What fixed site costs does Hudson Homes cover?",
        "How do I run a compliance check on a lot with an easement?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_SLOPE. Slope, Topography, Earthworks & Retaining Walls
  if (
    query.includes("slope") ||
    query.includes("fall") ||
    query.includes("sloping") ||
    query.includes("cut and fill") ||
    query.includes("retaining") ||
    query.includes("drop edge beam") ||
    query.includes("drop edge") ||
    query.includes("deb") ||
    query.includes("earthwork")
  ) {
    return {
      answer: `### Slope, Earthworks, Drop Edge Beams & Retaining Walls

Hudson Homes engineers sites across all topographical slope categories:

#### 1. Site Fall Categories Across Building Pad:
- **0.0m to 0.5m (Flat / Nominal Fall)**: Standard single-level concrete slab with minimal leveling.
- **0.5m to 1.5m (Moderate Fall)**:
  - Balanced cut-and-fill benching.
  - **Drop Edge Beams (DEB)**: Cast directly onto the perimeter of the slab to retain internal fill or accommodate natural slope, eliminating external retaining walls up to 1.5m.
- **1.5m to 3.0m+ (Steep / Significant Fall)**:
  - Split-level home designs (e.g. Hudson's **Cinnamon**, **Cobalt**, or **Mauve** ranges) stepping the ground floor down with internal stairs, following natural site contours and dramatically reducing excavation costs.

#### 2. Retaining Wall Statutory Thresholds:
- **Maximum Uncertified Cut / Fill**: Standard council rules limit uncertified excavation to **1.0m maximum depth**.
- **Structural Certification Triggers**:
  - Any retaining wall exceeding **1.0m in height** requires formal structural engineering design, building approval, and **Form 15 / Form 16 certification** (QLD) or engineer compliance certificate (NSW).
  - Retaining walls supporting building footings or vehicle driveways require structural engineering regardless of height.
  - Subsoil drainage (100mm slotted agi pipe surrounded by 20mm aggregate and geotextile filtration fabric) is mandatory behind all retaining structures to prevent hydrostatic water pressure buildup.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What split-level designs does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
        "How do Drop Edge Beams work on sloping blocks?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_NCC. NCC 2022 Volume Two, Energy & Liveable Housing Provisions
  if (
    query.includes("ncc") ||
    query.includes("bca") ||
    query.includes("liveable housing") ||
    query.includes("livable housing") ||
    query.includes("accessible") ||
    query.includes("hobless")
  ) {
    return {
      answer: `### NCC 2022 Volume Two & National Construction Code Mandates

All Hudson Homes architectural floorplans and specifications comply with **NCC 2022 (Building Code of Australia Volume Two)**:

#### 1. NatHERS 7-Star Thermal & Energy Efficiency:
- **7-Star Whole-of-Home Rating**:
  - Standard base pricing in Queensland now incorporates complete NatHERS 7-Star compliance ($0 additional energy allowances needed).
  - Thermal envelope includes high-performance ceiling insulation (minimum R4.0 to R5.0), external wall insulation batts (minimum R2.0 to R2.5), reflective wall wrap sarking, and optimized glazed window window-to-floor ratios.
  - Hot water heat pumps (e.g. Wulfe Heat Pump M9) and high-efficiency reverse cycle air-conditioning.

#### 2. Liveable Housing Design Standard (Part G7):
- **Continuous Step-Free Access**: Step-free threshold path of travel from the street boundary or car parking space to at least one primary entrance door.
- **Clear Opening Widths**: Internal doors to habitable rooms and ground floor sanitary compartments provide minimum **820mm clear opening width**. Hallways provide minimum **1000mm clear width**.
- **Accessible Toilet Facilities**: Ground-floor toilet with compliant spatial circulation zones and reinforced wall framing studs to support future grab rail installation.
- **Hobless Showers**: Step-free, hobless shower recesses to ground-floor bathrooms for universal accessibility.

#### 3. Ceiling Heights (Part 10.6):
- Habitable rooms (living, bedrooms, media, dining): Minimum 2400mm (Hudson H1 Smart standard 2440mm; H2 Designer standard 2590mm raised).
- Non-habitable rooms (bathrooms, laundries, pantries, hallways): Minimum 2100mm.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "What are the differences between NSW and QLD inclusions?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_PROGRESS. Progress Payment Schedule (HIA Contract Milestones & Percentages)
  if (
    query.includes("progress payment") ||
    query.includes("payment stage") ||
    query.includes("payment stages") ||
    query.includes("drawdown") ||
    query.includes("claim stage") ||
    query.includes("base stage") ||
    query.includes("lock-up") ||
    query.includes("lock up") ||
    query.includes("practical completion")
  ) {
    return {
      answer: `### Hudson Homes HIA Construction Progress Payment Schedule

Hudson Homes follows standard HIA (Housing Industry Association) and Master Builders milestone payment stages:

1. **Deposit / Preliminary Stage (5%)**:
   - Initial deposit upon tender signing and preliminary work (soil test, survey, architectural drafting, council DA/CDC submission).

2. **Base Stage (15%)**:
   - **15% payable at Base stage**: Earthworks completed, underground plumbing/drainage laid, vapour barrier and steel reinforcement placed, and concrete slab poured and inspected.

3. **Frame Stage (20%)**:
   - Wall frames, structural posts, and engineered roof trusses fully erected, tied down, and certified by a structural certifier.

4. **Enclosed / Lock-Up Stage (25%)**:
   - **25% payable at Lock-Up stage**: External brickwork/cladding installed, roof tiles or Colorbond sheeted, windows and external doors installed and locked.

5. **Fixing Stage (20%)**:
   - Plasterboard wall and ceiling linings, skirting, architraves, waterproofing, wet area tiling, kitchen cabinetry, and bathroom vanities installed.

6. **Practical Completion / Final Handover (15%)**:
   - **15% payable at Practical Completion**: Painting, plumbing & electrical fit-off, appliances installed, final quality QA inspection, occupancy certificate issued, and keys handed over!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the 50-Year Structural Warranty",
        "What fixed site costs does Hudson Homes include?",
        "How does the Quote Builder work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H_KDRB. Knock-Down Rebuild (KDRB)
  if (query.includes("kdrb") || query.includes("knock down") || query.includes("knockdown") || query.includes("demolition")) {
    return {
      answer: `### Knock-Down Rebuild (KDRB) Specialists

Hudson Homes is a recognized Knock-Down Rebuild specialist across Sydney Metro, Central Coast, Hunter, and South East Queensland:

1. **Why Choose KDRB with Hudson**:
   - Stay in the suburb, street, and school catchment you love while upgrading to an expansive, 7-Star energy-rated luxury home.
   - Often more cost-effective per square metre than major renovations or buying an expensive established home (with heavy stamp duty).

2. **Complete End-to-End Service**:
   - **Site Feasibility & Topography**: Contour survey, boundary check, and hydraulic stormwater discharge evaluation.
   - **Demolition Advisory**: Recommendations and coordination with licensed demolition contractors.
   - **Fast-Track CDC Approvals**: We design to comply with NSW Housing SEPP (Complying Development Certificate), avoiding council DA delays.
   - **Fixed Price Site Costs**: Piering, foundation engineering, and council fees all locked in upfront.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between CDC and DA in NSW?",
        "What inclusion ranges does Hudson Homes offer?",
        "Tell me about H3 Luxury inclusions",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H2. Site Safety, Fencing & Sediment Control
  if (
    query.includes("sediment") ||
    query.includes("security fence") ||
    query.includes("site fence") ||
    query.includes("site security") ||
    (query.includes("fencing") && query.includes("site"))
  ) {
    return {
      answer: `### Site Security Fencing & Environmental Sediment Control

Hudson Homes includes comprehensive site safety and environmental management in our fixed site costs:

1. **Site Security Fencing**:
   - Temporary 1.8m steel mesh security fencing erected around the site perimeter during construction to ensure safety and security compliance.
2. **Sediment & Erosion Control**:
   - Council-compliant sediment fencing, silt barriers, and gravel drive pad installed at the site entry to prevent sediment run-off into stormwater.
3. **Statutory Compliance**:
   - Complies with local council environmental protection standards and WorkCover/SafeWork OHS site regulations.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is included in Hudson Homes fixed site costs?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H3. Maintenance & Defects Liability Period After Handover
  if (
    query.includes("maintenance") ||
    query.includes("defect") ||
    query.includes("defects") ||
    query.includes("liability period") ||
    query.includes("after handover") ||
    query.includes("post-handover")
  ) {
    return {
      answer: `### Hudson Homes Handover Maintenance & Statutory Defects Period

Hudson Homes provides ongoing quality assurance and defect rectification post-handover:

1. **Defects Liability & Maintenance Period**:
   - Following Practical Completion and key handover, Hudson Homes provides a standard **defects liability and maintenance period** (typically 13 weeks / 90 days to 6 months depending on state contract requirements).
   - Any minor cosmetic settlements, timber shrinkage adjustments, door alignments, or fixture issues reported on the post-handover checklist are inspected and rectified by our dedicated customer care team.

2. **Long-Term Guarantees**:
   - Protected by the **Hudson Homes 50-Year Structural Warranty** covering slabs, footings, and structural framing.
   - Statutory home building compensation / QBCC home warranty insurance applies as required by law.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the 50-Year Structural Warranty",
        "What are the HIA contract progress payment stages?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H4. Hudson Invest IP (Investment Property) Range Turnkey Inclusions
  if (
    query.includes("hudson invest") ||
    query.includes("ip package") ||
    query.includes("ip range") ||
    query.includes("investor package") ||
    (query.includes("ip") && (query.includes("turnkey") || query.includes("turn-key") || query.includes("included") || query.includes("landscaping") || query.includes("fencing") || query.includes("blinds")))
  ) {
    return {
      answer: `### Hudson Homes IP (Investment Property) Range — "Hudson Invest" Turn-Key Inclusions

The **IP Investment Range** is our purpose-built, 100% turn-key solution designed for property investors:

1. **Complete Turnkey Inclusions**:
   - **Internal Finishes**: Vertical or roller **blinds** to all clear glazed windows, aluminum **flyscreens** to all openable windows and sliding doors, quality carpet to bedrooms, and durable ceramic floor tiles to living areas.
   - **External & Landscaping**: Complete turn-key **landscaping** including front and rear turf, garden beds with drought-tolerant planting, exposed aggregate concrete driveway and path, 1.8m boundary timber paling **fencing** with side gate, folding clothesline, and letterbox.
   - **Appliances & Climate**: Reverse-cycle split-system or ducted air conditioning, Fisher & Paykel or Haier stainless steel appliances with dishwasher, and ceiling fans to bedrooms.
   - **Kitchen & Bathrooms**: 20mm engineered stone benchtops, modern laminate cabinetry, and quality chrome tapware.

2. **Investor Benefits**:
   - **Two-Part Contract**: Stamp duty payable on land only, saving investors $10,000 to $25,000+.
   - **Immediate Rental Readiness**: Ready for tenants immediately upon handover with zero out-of-pocket setup costs.
   - **Depreciation**: Maximized tax depreciation deductions via comprehensive ATO-compliant depreciation schedules.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "How does the two-part contract save money on stamp duty?",
        "What tax depreciation benefits do brand new Hudson investment homes offer?",
        "What dual occupancy designs does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3H5. Infrastructure Charges, Section 7.11 & Council Headworks (QLD & NSW)
  if (
    query.includes("infrastructure charge") ||
    query.includes("headworks") ||
    query.includes("headwork") ||
    query.includes("7.11") ||
    query.includes("7.12") ||
    query.includes("developer contribution") ||
    query.includes("section 7") ||
    (query.includes("charge") && (query.includes("council") || query.includes("duplex") || query.includes("auxiliary") || query.includes("lga") || query.includes("queensland") || query.includes("qld") || query.includes("nsw") || query.includes("moreton") || query.includes("logan") || query.includes("brisbane") || query.includes("ipswich") || query.includes("blacktown") || query.includes("camden") || query.includes("hills")))
  ) {
    return {
      answer: `### Infrastructure Charges, Section 7.11 / 7.12 & Council Headworks (QLD & NSW)

When building a dual occupancy, duplex, or secondary dwelling, local municipal councils and statutory economic development authorities levy infrastructure contributions (headworks) for additional trunk water, sewer, stormwater, transport, and community infrastructure networks:

#### 1. Queensland Council & PDA Infrastructure Charges:
Under the *Planning Act 2016* and local State Planning Regulatory Provisions, statutory capped infrastructure charges apply to any second duplex dwelling:
- **City of Moreton Bay**: Approx. **$31,500** per additional dwelling.
- **Brisbane City Council**: Approx. **$33,000** per additional dwelling.
- **Logan City Council**: Approx. **$31,000** per additional dwelling.
- **Ipswich City Council**: Approx. **$30,000** per additional dwelling.
- **City of Gold Coast**: Approx. **$22,000 to $25,000** per additional dwelling.
- **EDQ Priority Development Areas (Flagstone / Ripley / Yarrabilba)**: Approx. **$28,500 to $29,500** per additional dwelling under EDQ infrastructure charging schedules.

#### 2. The $0 Auxiliary Unit Exemption (Huge Investor Advantage in QLD):
- Across most South East Queensland local governments (including **Logan, Ipswich, Moreton Bay, and Redland**), an **Auxiliary Unit** (a secondary living dwelling under the primary roofline, maximum 65m²–70m² GFA under single title) is **100% EXEMPT ($0 charges)** from council infrastructure contributions!
- This provides an immediate **$30,000+ upfront cashflow saving** for investors building dual living compared to a full Torrens/strata subdivisible duplex.

#### 3. New South Wales Section 7.11 & 7.12 Developer Contributions:
Under the *Environmental Planning and Assessment Act 1979 (EP&A Act)*, NSW local councils levy local infrastructure contributions prior to the release of the Construction Certificate (CC):
- **Blacktown City Council (Contributions Plan No. 24 - CP24 / Schofields & Marsden Park)**: Historically capped at **$45,000 to $50,000+** per residential lot/dwelling under NSW ministerial directions for greenfield land release.
- **Camden Council (Section 7.11 / South West Growth Centre)**: Approx. **$20,000 to $35,000** per additional dwelling.
- **The Hills Shire (CP15 / Box Hill & North Kellyville)**: Typically **$30,000 to $45,000+** per dwelling.
- **Liverpool City Council**: Approx. **$20,000 to $25,000** per dwelling.
- **Penrith City Council**: Approx. **$19,000 to $22,000** per dwelling.
- **Central Coast Council & Hunter (Maitland / Cessnock)**: Approx. **$15,000 to $22,000** per additional dwelling.
- **Secondary Dwellings (Granny Flats in NSW)**: Subject to concessional Section 7.11/7.12 contributions ranging between **$6,000 to $9,000** depending on the specific LGA contribution plan.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between a duplex and a dual-key auxiliary dwelling?",
        "What are the rules for building a duplex in Greater Flagstone PDA?",
        "What are the setback rules for building a duplex under NSW CDC?",
        "Tell me about the Wisteria 33 dual living design",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 3H6. Happy Upgrades - "Your Way" Promotional Upgrades (CULLED)
  if (
    query.includes("happy upgrade") ||
    query.includes("promo") ||
    query.includes("promotions") ||
    query.includes("your way") ||
    query.includes("upgrade package") ||
    (query.includes("upgrade") && (query.includes("option 1") || query.includes("option 2") || query.includes("option 3")))
  ) {
    return {
      answer: `### Promotional Status: "Happy Upgrades — Your Way" Promotion Culled

Please note that the **"Happy Upgrades — Your Way" promotional campaign has been officially culled / concluded**.

1. **Promotion Status**:
   - The tiered promotional upgrade packages (Option 1 for H1 Smart, Option 2 for H2 Designer, and Option 3 for H3 Luxury) are no longer active or selectable in our sales system.
   - All quotes, tenders, and building proposals now reflect standard pricing and official inclusion schedules across our 6 tiers: **Investment Package (IP)**, **Sapphire Series (SS)**, **Hudson Base Standard (HBS)**, **H1 Smart**, **H2 Designer**, and **H3 Luxury**.

2. **Queensland Policy & Pricelist Updates**:
   - Under the new Queensland price list, Hudson Homes **no longer requires additional allowances for energy efficiency in QLD** ($0 additional energy allowances needed; NatHERS 7-Star compliance is now fully built into base pricing).
   - Please note: Under the new QLD price list, **no piering is included as standard site costs** (piering is quoted provisionally per geotechnical engineering).

3. **New South Wales Value**:
   - NSW fixed site costs continue to include reinforced concrete bored piers and comprehensive BASIX compliance.

For current national or regional offerings, or questions regarding standard inclusions, please consult with your Hudson Homes New Home Consultant (NHC) or Sales Manager.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "What is the difference between NSW and QLD inclusions?",
        "Tell me about H3 Luxury inclusions",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3H7. Queensland vs New South Wales Inclusions Differences
  if (
    query.includes("nsw vs qld") ||
    query.includes("qld vs nsw") ||
    query.includes("difference between nsw and qld") ||
    query.includes("differences between nsw and qld") ||
    query.includes("queensland vs new south wales") ||
    query.includes("state difference") ||
    query.includes("state differences") ||
    (query.includes("difference") && (query.includes("nsw") || query.includes("qld")) && query.includes("inclusion"))
  ) {
    return {
      answer: `### Hudson Homes Specification Differences: NSW vs Queensland

While Hudson Homes provides consistent luxury and our **50-Year Structural Warranty** across both states, key specifications are specifically calibrated to local state climatic conditions, planning codes, and supply chains:

| Specification Domain | Queensland (QLD) Inclusions | New South Wales (NSW) Inclusions |
|---|---|---|
| **Roof Covering** | **Colorbond 'Custom Orb' steel roofing** standard across all tiers (Bristile tiles optional on H2/H3) | **Bristile 'Designer' / 'Classic' concrete roof tiles** with heavy-duty sarking standard (Colorbond optional on H2/H3) |
| **Structural Timber Framing** | **'T2' termite-treated Radiata Pine** prefabricated frames & trusses standard across **all tiers** (lowset & highset) | Radiata Pine frames & trusses standard; **'T2' termite-treated** timber introduced on **H2 & H3** |
| **Hot Water System** | **Wulfe Heat Pump M9** (200L for up to 2 bath / 330L for up to 3 bath) | **Rinnai 26L Gas Continuous Flow** water heater (preset to 50°C) |
| **Electrical Mains Power** | **Single Phase Underground** (Two Phase for Duplex; Three Phase standard on H3) | **Three Phase Underground Power** included standard across **all 6 tiers** |
| **Main Floor Tiling** | Ceramic pressed 450x450 tiles **including bedroom hallways** | Ceramic pressed 450x450 tiles **excluding bedroom hallways** (carpeted) |
| **Shower Wall Linings** | **6mm Fibre Cement** wall linings to bathroom & ensuite with shower | **10mm Water-Resistant Plasterboard** to wet areas |
| **Alfresco Ceiling** | 10mm plasterboard with **metal ceiling battens at 450mm centres** | **10mm Water-Resistant Plasterboard** |
| **Rainwater & Gas** | As required by local authority / development approval | **3000L Colorbond Stainless Steel rainwater tank** with pump + **1 gas bayonet** to living |
| **Robe Drawer Towers (H2/H3)** | **610mm wide** tower bank of drawers | **508mm wide** tower bank of drawers |
| **Wet Area Privacy Glass** | **Obscure** privacy glass | **Luminamist** privacy glass |
| **Standard Kitchen Sink (SS/HBS)** | Base MK3 Double Bowl 1 & 3/4 sink | Oliveri 1080mm Double Bowl sink (PS112 / PS111) |
| **Laundry Cabinet (SS/HBS/H1)** | Base laundry trough & white cabinet (9504719) | Clark 42L stainless steel tub with metal cabinet (F6001) |
| **Porch Concrete Tiling** | Concrete broom finish (tiles are optional with riser tile) | Ceramic floor tiles with 150mm riser tile included standard on IP, H1, H2, H3 |
| **Site Costs — Piering** | **No piering included as standard site costs** under new price list (quoted provisionally per engineer) | **Reinforced concrete bored piers included** in fixed site costs |
| **Energy Efficiency Allowances** | **$0 additional allowances required** (NatHERS 7-Star built directly into base pricing) | Included in fixed site costs via BASIX compliance documentation |`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "What brand and size of kitchen appliances come in H1, H2, and H3?",
        "What air conditioning system comes standard in H1 vs H2 vs H3?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3H8. Hot Water Systems across NSW and QLD
  if (
    query.includes("hot water") ||
    query.includes("heat pump") ||
    query.includes("rinnai") ||
    query.includes("wulfe")
  ) {
    return {
      answer: `### Hudson Homes Standard Hot Water Systems

Hudson Homes provides state-tailored, energy-efficient hot water systems meeting NatHERS 7-Star and NCC 2022 standards:

1. **Queensland (QLD) — Energy-Efficient Heat Pump**:
   - **Wulfe Heat Pump M9**:
     - **200-Litre (Model ES200M9)**: Standard for homes with up to 2 bathrooms with showers.
     - **330-Litre (Model ES330M9)**: Standard for homes with up to 3 bathrooms with showers.
   - Extracts ambient thermal energy from the air, delivering up to 70%+ energy savings compared to conventional electric hot water.

2. **New South Wales (NSW) — Instantaneous Continuous Flow Gas**:
   - **Rinnai 26L Gas Continuous Flow Water Heater**:
     - Factory preset to 50°C for anti-scald safety without needing an external tempering valve.
     - Unlimited on-demand continuous hot water delivery, high efficiency, and compact external wall mounting.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between NSW and QLD inclusions?",
        "What air conditioning is included in H1 vs H2 vs H3?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3H9. Bathtubs & Sanitaryware Across Tiers
  if (
    query.includes("bath") ||
    query.includes("bathtub") ||
    query.includes("freestanding") ||
    query.includes("caroma urbane") ||
    query.includes("decina") ||
    query.includes("stylus basis")
  ) {
    return {
      answer: `### Hudson Homes Bathtubs & Sanitaryware Specifications

Hudson Homes includes high-quality acrylic bathtubs and sanitaryware suited to each tier:

1. **H1 Smart Inclusions**:
   - **Stylus Basis 1675mm Acrylic Bathtub** (Model BB7W-W, or 1525mm BB5W-W where required) with chrome plug and waste.
   - **Stylus Venecia Close-Coupled Toilet Suite** (Model W45004SSC) with bottom inlet and soft-close seat.
   - **Stylus Venecia Basin** (semi-recessed W40101CW or inset W40001CW).

2. **H2 Designer Inclusions**:
   - **Caroma Urbane II 1775mm Freestanding Bath** (Model AU8W, or 1580mm AU6W) with chrome plug & waste standard to the main bathroom ($0 variation).
   - **Caroma Luna CleanFlush Wall-Faced Toilet Suite** (Model 844820W) with back inlet and hygienic rimless flush.
   - **Caroma Luna Basin** (semi-recessed 873615W or inset 899215W).
   - **Tiled Shower Niche**: 600mm x 400mm tiled recess in showers as standard.

3. **H3 Luxury Inclusions**:
   - **Caroma Urbane II 1775mm Freestanding Bath** (Model AU8W) with chrome pop-up waste.
   - **Caroma Luna CleanFlush Wall-Faced Toilet Suite** (Optional Caroma Urbane II in-wall cistern suite with chrome buttons).
   - **Caroma Urbane II Luxury Basin** (semi-recessed 878910W or inset 878310W).
   - **10mm Frameless Glass Shower Screens** (up to 2100mm high in QLD / 2000mm in NSW) with pivot doors and chrome hardware.
   - **Full-Height Wall Tiling** to all wet areas with showers and tiled window reveals with metal angle trim.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "What benchtops are included in H1 vs H2 vs H3?",
        "What is the difference between NSW and QLD inclusions?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3I. Landscape Package (LP)
  if (
    (query.includes("landscape") ||
      query.includes("turf") ||
      query.includes("clothesline") ||
      query.includes("letterbox") ||
      query.includes("turnkey package") ||
      (query.includes("fencing") && !query.includes("site") && !query.includes("security") && !query.includes("pool"))) &&
    !query.includes("ip") &&
    !query.includes("invest") &&
    !query.includes("pool")
  ) {
    return {
      answer: `### Hudson Homes Turn-Key Landscape Package (LP)

The **LP Landscape Package** can be bundled with any H1 Smart, H2 Designer, or H3 Luxury build to deliver 100% completed external finishes:

#### 6 Complete External Components:
1. **Perimeter Fencing**: 1.8m high treated pine timber paling fencing along boundaries with matching pedestrian side return gate.
2. **Turfing**: Premium turf (Sir Walter DNA Certified Buffalo or Couch) laid to entire front and rear yards.
3. **Garden Bed & Planting**: Front yard landscaped garden bed featuring timber garden edging, organic mulch, and drought-tolerant shrub planting.
4. **Concrete Driveway**: Exposed aggregate concrete driveway, matching council crossover, and front entry path (up to 55m²).
5. **Designer Letterbox**: Powder-coated aluminium or masonry pillar letterbox with street numbering and lockable mail compartment.
6. **Folding Clothesline**: Austral / Hills folding frame outdoor clothesline installed with dedicated concrete slab pad.

> [!NOTE]
> Landscape packages are scaled transparently by lot size (up to 300m² - 900m²) and appear in the Price Breakdown Schedule!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between H1 Smart and H2 Designer?",
        "Tell me about the IP Investment Range",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3J. Two-Part Contract Structure (Stamp Duty Savings)
  if (query.includes("two part") || query.includes("two-part") || query.includes("split contract") || (query.includes("stamp duty") && (query.includes("save") || query.includes("saving") || query.includes("investor") || query.includes("how")))) {
    return {
      answer: `### Two-Part Contract Structure & Stamp Duty Savings

Hudson Homes House & Land packages operate under a streamlined **two-part contract structure**:

1. **How It Works**:
   - **Contract 1 (Land)**: Direct contract with the land developer for the purchase of the registered allotment.
   - **Contract 2 (Build)**: Genuine fixed-price construction contract with Hudson Homes for the build.

2. **Major Stamp Duty Savings**:
   - When buying an established home or complete spec turn-key home, stamp duty is charged on the **total combined value** (e.g. $800,000).
   - Under Hudson's two-part structure, stamp duty is payable **ONLY on the raw land component** (e.g. $350,000), saving buyers and investors **$10,000 to $25,000+** in government transfer duties!

3. **First-Home Buyer Grants**:
   - Allows eligible first-home buyers to qualify for stamp duty concessions or full exemptions under state thresholds ($30k QLD / $10k NSW).`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the FHB First Home Buyer Range?",
        "Tell me about the IP Investment Range",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3O. First Home Owner Grants & Stamp Duty Concessions
  if (query.includes("fhog") || query.includes("grant") || query.includes("30,000") || query.includes("10,000") || query.includes("first home grant") || (query.includes("stamp duty") && (query.includes("exempt") || query.includes("first home")))) {
    return {
      answer: `### First Home Owner Grants (FHOG) & Stamp Duty Exemption Guide

Hudson Homes packages are designed and priced to maximize state first-home buyer subsidies:

1. **Queensland (QLD)**:
   - **$30,000 First Home Owner Grant**: Available to eligible first-time buyers purchasing or building a brand-new home valued up to $750,000.
   - **Full Stamp Duty Exemption**: Zero transfer duty payable on newly built homes up to $700,000 (with concessional rates up to $800,000).

2. **New South Wales (NSW)**:
   - **$10,000 First Home Owner Grant**: For newly built homes valued up to $750,000 (or up to $600,000 for house-only contracts).
   - **First Home Buyers Assistance Scheme (FHBAS)**: Full stamp duty exemption on new homes up to **$800,000** (concessions up to $1,000,000).

> [!TIP]
> Combined with Hudson's genuine Fixed Price Contract Guarantee, banks and lenders provide fast, hassle-free formal finance approval!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the FHB First Home Buyer Range",
        "What is the two-part contract structure?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3P. Roofing & Roof Coverings
  if (
    (query.includes("roof") || query.includes("roofing") || query.includes("colorbond") || query.includes("tile")) &&
    !query.includes("damp") &&
    !query.includes("rebate") &&
    !query.includes("proofing")
  ) {
    return {
      answer: `### Hudson Homes Roofing Specifications

Hudson Homes provides premium roofing options engineered for Australian climates:

1. **Colorbond Steel Roofing**:
   - Genuine BlueScope Colorbond steel roof sheeting with reflective Anticon foil blanket insulation.
   - Available in the full Colorbond designer colour palette.
   - High thermal reflection and superior durability in hail, storm, and bushfire zones.

2. **Boral Concrete Roof Tiles**:
   - Modern profile Boral designer concrete roof tiles with heavy-duty sarking underneath.
   - Classic aesthetic with great thermal mass and acoustic dampening.

3. **Included Across Ranges**:
   - Colorbond steel gutters, fascia, and downpipes are included as standard across all H1 Smart, H2 Designer, and H3 Luxury homes.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What ceiling heights come standard in H1 vs H2?",
        "What energy efficiency star rating do Hudson homes achieve?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3Q. Minimum Frontage for Double Garage
  if (query.includes("garage") && (query.includes("frontage") || query.includes("double garage") || query.includes("minimum frontage"))) {
    return {
      answer: `### Minimum Lot Frontage Requirements for Double Garage Homes

1. **Standard Double Garage Homes**:
   - The typical minimum lot frontage required for a double garage home is **12.5m**.
   - With standard 1.0m LHS and 1.5m RHS setbacks, a 12.5m lot provides a 10.0m building envelope, which comfortably accommodates a standard double garage (approx. 5.5m wide) plus entry hallway and living/bedroom frontage.

2. **Zero-Lot / Built-to-Boundary (BTB)**:
   - On narrow lots (**11.5m to 12.0m wide**), double garage designs can fit if the estate allows a zero-lot boundary wall on the garage side.

3. **Narrow Lots (10m to 10.5m Wide)**:
   - Lots under 12m generally require a single garage design (such as the **Hazel 14**) or a specialized tandem double-storey configuration.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What designs fit on a 12.5m wide lot?",
        "What designs fit on a 10m wide lot?",
        "Tell me about the Hazel 14 design",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3R. Double Storey on 300sqm Block
  if ((query.includes("300sqm") || query.includes("300m2") || query.includes("300 sqm") || query.includes("small lot")) && (query.includes("double storey") || query.includes("double story") || query.includes("fit"))) {
    return {
      answer: `### Double Storey Homes on 300m² Blocks

Yes! You can fit a spacious double storey home on a 300m² block:

1. **Why Double Storey is Ideal for 300m² Lots**:
   - Building vertically maximizes your floor space while preserving compliant private open space and meeting maximum site coverage percentages (typically 50% to 60%).

2. **Recommended Hudson Double Storey Designs for 300m² Blocks**:
   - **Jasper 26** (241.82 m²): 4 Bed, 2 Bath, 2 Car Garage — 11.39m width × 24.71m length (fits standard 12.5m+ frontages; requires 12.5m wide lot).
   - **Azure 25** (232.8 m²): 4 Bed, 2.5 Bath, 2 Car Garage — high-efficiency small-lot layout (12.5m frontage).
   - **Cedar 26** (242.1 m²): 4 Bed, 2.5 Bath, 2 Car Garage — luxury family living on suburban blocks.

3. **Compliance Features**:
   - Fits standard 4.5m front setbacks and 2.0m rear setbacks with zero council relaxations required!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the dimensions of the Jasper 26?",
        "What is the size and frontage for Azure 25?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3S. Built to Boundary (BTB) & Zero-Lot Setbacks
  if (query.includes("btb") || query.includes("built to boundary") || query.includes("zero lot") || query.includes("zero-lot")) {
    return {
      answer: `### Built to Boundary (BTB) & Zero-Lot Setbacks Explained

Built to Boundary (BTB), also known as zero-lot alignment, is a smart architectural planning tool for narrow blocks:

1. **How It Works**:
   - One side wall of the garage is built directly on or within **0mm to 200mm** of the side property boundary.
   - The opposite side boundary retains standard setback clearances (typically **1.0m to 1.5m**) for pedestrian access and drainage.

2. **Key Advantages**:
   - Eliminates wasted narrow side corridors and adds up to **1.0m to 1.5m of extra internal living width** to your home.
   - Enables full double garage designs to fit onto 11.5m to 12.5m lots.

3. **Estate Guidelines & Height Limits**:
   - Maximum BTB wall height is typically 3.5m, with maximum wall length between 11m and 15m.
   - Supported natively in Hudson Homes Siting Engine and Quote Builder!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What designs fit on a 12.5m wide lot?",
        "What are the typical front garage setbacks in residential estates?",
        "How does the Quote Builder work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3T. Front Garage Setbacks
  if ((query.includes("garage") && query.includes("setback")) || query.includes("front garage")) {
    return {
      answer: `### Standard Front Garage Setback Requirements

Front setbacks are governed by local council planning schemes and developer estate design guidelines:

1. **Standard Front Garage Setback (5.0m to 5.5m)**:
   - The garage door must be set back **5.0m to 5.5m** from the front street boundary.
   - This ensures that a family vehicle parked in the driveway does not overhang the council footpath or road reserve.

2. **Articulated Porch / Living Setback (4.0m to 4.5m)**:
   - Front entry porches, verandas, and non-garage living walls can articulate forward to **4.0m or 4.5m**, creating visual streetscape depth.

3. **Secondary Street Setbacks (Corner Lots)**:
   - On corner blocks, secondary street setbacks are typically **2.0m to 3.0m**.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the minimum frontage required for a double garage home?",
        "How do zero-lot built to boundary (BTB) setbacks work?",
        "What designs fit on a 14m wide lot?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3U. Custom Plan Modifications & Modified Plan Engine
  if (query.includes("custom") || query.includes("modification") || query.includes("modify") || query.includes("change plan") || query.includes("custom variations")) {
    return {
      answer: `### Custom Plan Modifications & Modified Plan Engine

Yes! Hudson Homes actively supports custom plan variations through our industry-leading **Quote Builder V2 Modified Plan Engine**:

1. **Architectural Customization**:
   - Clients can modify standard floorplans to suit their block, lifestyle, and orientation:
     - **Alfresco Extensions**: Enlarge outdoor entertainment zones.
     - **Garage Extensions**: Add storage workshops or widen vehicle bays.
     - **Window & Door Upgrades**: Add panoramic kitchen splashback windows (PW 06.30), commercial sliding stacker doors, or extra bedroom windows.
     - **Internal Layout Changes**: Add a butler's pantry, alter ensuite layouts, or relocate laundry rooms.

2. **Automated Presight Code & Visual Diff Parsing**:
   - Upload any modified floorplan sketch or CAD PDF, and the AI automatically detects wall moves and structural additions, pricing them instantly against Hudson's official rate schedule!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "How does the Quote Builder Modified Plan Engine work?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3V. Dual Occupancy Models & Designs
  if (query.includes("dual occupancy designs") || query.includes("duplex designs") || (query.includes("dual") && query.includes("designs"))) {
    return {
      answer: `### Hudson Homes Dual-Occupancy & Dual-Living Designs

Hudson Homes is a leading specialist in dual-occupancy and high-yield multi-dwelling builds across QLD and NSW:

1. **Wisteria Range (33, 34, 36, 40)**:
   - Our flagship side-by-side duplex design featuring independent 3 Bed + 2 Bed or 4 Bed + 2 Bed configurations under one roofline.
   - Separate entrances, private courtyards, and independent power/water metering.

2. **Alabaster Traditional Duplex Range (31, 36, 40)**:
   - Our single-storey dual-occupancy design featuring balanced 3 Bed + 3 Bed or 4 Bed + 4 Bed layouts with independent garages and private alfresco areas.

3. **Amber 21 Dual Suite**:
   - Single-storey auxiliary living option compliant with Logan, Redland, and Ipswich secondary dwelling thresholds.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the Wisteria 33 dual living design",
        "What are the rules for building a duplex in Greater Flagstone PDA?",
        "How does the two-part contract save money on stamp duty?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3W. Wind Classifications & Structural Tie-Down Engineering (AS 4055 & AS 1170.2)
  if (
    query.includes("wind") ||
    query.includes("cyclone") ||
    query.includes("cyclonic") ||
    query.includes("n1") ||
    query.includes("n2") ||
    query.includes("n3") ||
    query.includes("n4") ||
    query.includes("c1") ||
    query.includes("c2") ||
    query.includes("as 4055") ||
    query.includes("as 1170") ||
    query.includes("tie down") ||
    query.includes("hold down") ||
    query.includes("wind pressure")
  ) {
    return {
      answer: `### Wind Classifications & Structural Tie-Down Engineering (AS 4055 & AS 1170.2)

Hudson Homes engineers every home strictly to site-specific wind classifications under **AS 4055 (Wind Loads for Housing)** and **AS 1170.2 (Structural Design Actions - Wind Actions)**:

#### 1. Australian Wind Classification Categories:
| Classification | Type | Design Gust Wind Speed ($V_{u,min} - V_{u,max}$) | Typical Site Conditions |
|---|---|---|---|
| **N1** | Non-Cyclonic | **Up to 28 m/s (101 km/h)** | Heavily sheltered, inland valleys, low-density surrounded by dense suburban developments. |
| **N2** | Non-Cyclonic | **28 to 33 m/s (119 km/h)** | Standard suburban housing developments with standard suburban shielding. **Hudson's standard baseline**. |
| **N3** | Non-Cyclonic | **33 to 41 m/s (148 km/h)** | Elevated terrain, hill slopes, semi-open suburban fringes, or acreage lots (common across SEQ ridgelines, Redland, and Camden). |
| **N4** | Non-Cyclonic | **41 to 50 m/s (180 km/h)** | High-exposure escarpments, exposed rural ridges, and cliff-top sites. |
| **C1** | Cyclonic | **Up to 50 m/s (180 km/h)** | Tropical coastal regions subject to tropical cyclone events (sheltered terrain). |
| **C2** | Cyclonic | **50 to 61 m/s (220 km/h)** | Exposed coastal tropical areas with high cyclonic vulnerability. |

#### 2. Key Structural Engineering Differences (N2 vs N3):
- **Roof Truss Tie-Downs**:
  - **N2**: Standard triple-grip brackets and framing anchors fastening trusses to top wall plates.
  - **N3 Upgrades**: Heavy-duty structural tie-down brackets (M10/M12 high-tensile cyclone tie-down rods extending continuously from top plate down into floor slab anchors, or engineered multigrips with heavy gauge helical nails).
- **Glazing & Window Pressures (AS 2047)**:
  - Windows must resist higher Serviceability Limit State (SLS) and Ultimate Limit State (ULS) positive and negative wind pressures.
  - Upgraded window glass thickness (minimum 5mm/6mm toughened or laminated glass) and reinforced structural window mullions to prevent frame deflection and water penetration under driving rain.
- **Wall & Roof Bracing (AS 1684)**:
  - Higher wind classifications mandate increased bracing units (Type A / Type B plywood or structural hardboard bracing sheets fixed with dense nailing patterns) to resist lateral shear loads.
- **Eaves & Cladding Fixings**:
  - Fiber cement soffit linings and external wall claddings fixed at reduced fastener spacing with annular-grooved stainless steel nails or heavy-duty screws to resist wind uplift suction.

> [!NOTE]
> Every Hudson Homes tender includes a site-specific wind classification assessment calculated from your site's Region, Terrain Category, Topographic Class, and Shielding Factor!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What timber framing specifications does Hudson Homes use?",
        "What is included in Hudson Homes fixed site costs?",
        "What are the requirements for BAL-29 bushfire construction?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3X. Slab Edge Rebates, Damp-Proofing & Weep Hole Clearances
  if (
    query.includes("slab edge rebate") ||
    query.includes("edge rebate") ||
    query.includes("slab rebate") ||
    query.includes("rebate") ||
    query.includes("damp proofing") ||
    query.includes("dpc") ||
    query.includes("weephole") ||
    query.includes("weep hole") ||
    query.includes("ffl height") ||
    query.includes("finished floor level height")
  ) {
    return {
      answer: `### Slab Edge Rebates, Damp-Proofing & Weep Hole Clearances (AS 2870 & NCC 2022)

Hudson Homes foundation slabs incorporate precision-engineered edge rebates and damp-proofing systems complying with **AS 2870 (Residential Slabs and Footings, Part 5.3)** and **NCC 2022 Part 3.2**:

#### 1. What is a Slab Edge Rebate & Why is it Critical?
- A **slab edge rebate** is a step-down recess (typically **20mm to 50mm drop**) formed in the perimeter of the concrete slab where the external masonry veneer sits.
- **Purpose**:
  1. Prevents horizontal rainwater ingress tracking under the structural bottom timber framing plate into interior flooring and habitable rooms.
  2. Ensures that any moisture penetrating the external brick veneer drains down the cavity, hits the rebate flashing, and is discharged safely to the outside.
  3. Provides a continuous physical step separating interior dry finished floor level (FFL) from external ground and wet cavities.

#### 2. Damp-Proof Course (DPC) & Continuous Flashings:
- Heavy-duty embossed polyethylene or bitumen-coated **Damp-Proof Course (DPC)** is installed continuously beneath the timber bottom plate and built into the brick veneer.
- Stepped cavity flashings are installed under all window and door sills, bridging the cavity and terminating with open perpends (**weep holes**) to expel moisture.
- Weep holes are spaced at **maximum 1.2m centres** along the bottom course of brickwork above the slab rebate.

#### 3. Statutory Finished Floor Level (FFL) Height Clearances:
To prevent moisture, mud, and water pooling from entering homes during heavy rainfall:
- **150mm Minimum Clearance**: Finished floor level must be at least **150mm above finished bare ground** or landscaped garden beds.
- **100mm Minimum Clearance**: In low-rainfall areas or sandy free-draining soils.
- **50mm Minimum Clearance**: Above permanently paved, concrete, or tiled surfaces that slope away from the dwelling at minimum 1:20 (50mm fall over the first 1.0m).

> [!TIP]
> Keep external weep holes and the 75mm exposed slab edge completely clear of garden soil, mulch, and turf to maintain AS 3660.1 termite inspection compliance and moisture drainage!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What termite protection system does Hudson Homes use?",
        "What soil classifications are covered in fixed site costs?",
        "How do Drop Edge Beams work on sloping sites?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3Y. Timber Framing & Engineered Roof Truss Spans
  if (
    query.includes("timber framing") ||
    query.includes("framing") ||
    query.includes("stud centre") ||
    query.includes("stud spacing") ||
    query.includes("truss span") ||
    query.includes("roof truss") ||
    query.includes("as 1684") ||
    query.includes("mgp10") ||
    query.includes("mgp12") ||
    query.includes("lintel") ||
    query.includes("engineered timber")
  ) {
    return {
      answer: `### Timber Framing & Engineered Roof Truss Spans (AS 1684 & AS 1720.1)

All Hudson Homes structural framing is manufactured off-site in precision computer-controlled prefabrication facilities in accordance with **AS 1684 (Residential Timber-Framed Construction)** and **AS 1720.1 (Timber Structures Code)**:

#### 1. Wall Framing Specifications:
- **Timber Grade**: Machine Graded Pine (**MGP10 / MGP12**) seasoned radiata pine, engineered for high bending strength and structural rigidity.
- **Termite Treatment**:
  - **Queensland (QLD)**: **'T2' blue termite-treated** timber frames and trusses standard across **ALL tiers** (single and double storey).
  - **New South Wales (NSW)**: Radiata Pine standard on IP, SS, HBS, H1; **'T2' termite-treated** framing standard on **H2 Designer & H3 Luxury**.
- **Stud Spacing (Centres)**:
  - **450mm Centres**: Standard on all double-storey ground floors, heavy concrete tiled roof loads, and high wind zones (N3).
  - **600mm Centres**: Utilized on non-load-bearing internal partition walls and single-storey lightweight sheet-roof designs where engineered.
- **Framing Depth**: Standard 70mm or 90mm external stud wall depth providing maximum cavity space for high-performance acoustic and thermal wall insulation batts (R2.0 to R2.5).

#### 2. Engineered Roof Trusses:
- **Prefabricated Gang-Nail Trusses**: Custom engineered using high-tensile multi-tooth galvanized steel connector plates pressed into timber joints under hydraulic pressure.
- **Truss Pitch**: Standard 22.5° or 25° architectural pitch (with custom pitches available for Hamptons or modern facades).
- **Truss Spans**: Clear span trusses capable of spanning up to **10m to 14m+** without intermediate internal load-bearing walls, creating expansive open-plan kitchen, dining, and living zones.
- **Ceiling Battens**:
  - **Queensland (QLD)**: High-tensile metal ceiling battens fixed at **450mm centres** standard.
  - **NSW**: Metal battens or timber ceiling joists engineered for plasterboard stability and sag resistance.

#### 3. Lintel Sizing & Structural Openings:
- **Engineered Laminated Veneer Lumber (LVL)** or hot-dip galvanized steel PFC/flange lintels span above wide openings:
  - Double garage door openings (up to 5.4m wide clear span).
  - Expansive corner and sliding stacker doors leading to outdoor alfresco areas.
- Every lintel is calculated for dead loads, live loads, and roof tie-down uplift to prevent ceiling sag and ensure smooth door operation.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between NSW and QLD inclusions?",
        "What ceiling heights come standard in H1 vs H2?",
        "Tell me about the 50-Year Structural Warranty",
        "What wind classification does Hudson Homes build for?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3Z. Brick Articulation Joints (AS 3700 & AS 4773)
  if (
    query.includes("articulation joint") ||
    query.includes("expansion joint") ||
    query.includes("control joint") ||
    query.includes("brick cracking") ||
    query.includes("brick crack") ||
    query.includes("masonry joint") ||
    query.includes("as 3700") ||
    query.includes("as 4773") ||
    query.includes("joint spacing")
  ) {
    return {
      answer: `### Brick Articulation Joints & Masonry Movement Control (AS 3700 & AS 4773)

Hudson Homes external brickwork incorporates engineered vertical articulation joints complying strictly with **AS 3700 (Masonry Structures)** and **AS 4773 (Masonry in Small Buildings)**:

#### 1. What are Articulation Joints & Why are they Essential?
- An **articulation joint (AJ)** is a continuous, vertical 10mm gap built cleanly through the external brickwork from the concrete footing/slab rebate up to the eaves line.
- **Purpose**:
  1. Absorbs natural foundation and ground movement caused by seasonal moisture changes in reactive clay soils (AS 2870 Class M, H1, H2).
  2. Accommodates thermal expansion and contraction of clay brickwork during extreme summer and winter temperatures.
  3. **Prevents unsightly step-cracking**: Without articulation joints, natural foundation settling forces bricks and mortar joints to shear diagonally. Articulation joints localize movement into controlled, sealed joints.

#### 2. Statutory Spacing & Placement Rules:
- **Straight Wall Spacing**: Articulation joints are placed at regular intervals of no more than **5.0m to 6.0m** along straight external walls.
- **Corner Proximity**: Located within **1.5m to 2.0m** of external or re-entrant building corners, where stress concentration is highest.
- **Openings & Changes in Height**: Built adjacent to large window/door openings or transitions between single and double-storey sections.

#### 3. Joint Sealant & Construction Detail:
- Joints are never bridged by rigid mortar.
- A circular closed-cell polyethylene foam **backing rod** is pressed into the 10mm joint at a consistent depth (typically 6mm–10mm from face).
- Sealed externally with high-performance, UV-stabilized, flexible **polyurethane or neutral-cure silicone mastic**, colour-matched to the brick or mortar color for a sleek, discreet architectural finish.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What soil classifications does Hudson Homes cover?",
        "What slab edge rebates are required in foundation design?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3AA. On-Site Stormwater Detention (OSD) & Hydraulic Drainage
  if (
    query.includes("osd") ||
    query.includes("on-site stormwater detention") ||
    query.includes("stormwater detention") ||
    query.includes("permissible site discharge") ||
    query.includes("psd") ||
    query.includes("site storage requirement") ||
    query.includes("ssr") ||
    query.includes("orifice plate") ||
    query.includes("detention tank")
  ) {
    return {
      answer: `### On-Site Stormwater Detention (OSD) & Hydraulic Engineering

For properties in suburban renewal corridors or councils with strict stormwater constraints, Hudson Homes integrates engineered **On-Site Stormwater Detention (OSD)** systems:

#### 1. What is On-Site Stormwater Detention (OSD)?
- OSD temporarily holds back peak stormwater runoff generated by a newly built home, duplex, or enlarged roof footprint during severe rainfall events, releasing it slowly into council's stormwater drainage network at a controlled rate.
- **Permissible Site Discharge (PSD)**: The maximum allowable discharge flow rate (in litres per second) into council's street drainage, calculated to match pre-development levels.
- **Site Storage Requirement (SSR)**: The total volume of stormwater (in cubic metres) that must be temporarily stored on-site during a 1-in-100-year storm.

#### 2. When is OSD Required?
- Common in municipal councils such as Camden, Blacktown, Penrith, Parramatta, City of Gold Coast, and Brisbane City Council.
- Triggered when:
  1. Constructing a duplex or dual-occupancy development.
  2. Subdividing or building on lots where total impervious site coverage (roof + driveway) exceeds council thresholds.
  3. Upstream drainage capacity in the street is constrained.

#### 3. System Components:
- **Below-Ground Modular Detention Cells**: High-strength underground structural tanks (such as Atlantis cells or concrete retention tanks) buried beneath turf or driveways.
- **Above-Ground Dual-Purpose Rainwater / Detention Tanks**: A multi-chamber tank where the lower section stores rainwater for household reuse (BASIX compliance) and the upper air space serves as temporary storm detention.
- **Orifice Restrictor Plate**: A precision-machined stainless steel plate with a calibrated aperture (e.g. 50mm to 90mm diameter) controlling the discharge rate to the street gutter or legal point of discharge (LPOD).
- **Trash Screen & Silt Sump**: High-capacity galvanized mesh basket preventing leaves and debris from clogging the orifice plate.
- **High-Level Surcharge Overflow**: Direct emergency overflow pipe to the street reserve in events exceeding the design storm.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover?",
        "How do rainwater tanks work with BASIX in NSW?",
        "What are the infrastructure charges for building a duplex?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3AC. Facade Options & Architectural Finishes
  if (
    query.includes("facade") ||
    query.includes("facades") ||
    query.includes("facade options") ||
    query.includes("hamptons") ||
    query.includes("coastal") ||
    query.includes("modern facade") ||
    query.includes("executive facade") ||
    query.includes("grande facade") ||
    query.includes("vogue facade") ||
    query.includes("contempo facade") ||
    query.includes("scyon") ||
    query.includes("linea") ||
    query.includes("exterior cladding")
  ) {
    return {
      answer: `### Hudson Homes Architectural Facade Collections & Exterior Finishes

Hudson Homes offers an inspiring portfolio of designer facades engineered to maximize street appeal, property valuation, and developer covenant compliance:

#### 1. Master Facade Collections:
1. **Traditional / Classic Facade**:
   - Timeless, elegant Australian suburban design.
   - Symmetrical front elevation, exposed face brickwork from Austral or PGH, painted feature piers, symmetrical window layouts, and Colorbond or concrete tile hip roof.
2. **Coastal / Hamptons Facade**:
   - One of Hudson's most popular luxury styles.
   - Characterized by **James Hardie Scyon Linea weatherboard cladding**, decorative coastal gable vents, crisp white timber mouldings, painted veranda posts, and light seaside tones.
3. **Modern / Contemporary Facade**:
   - Clean architectural lines and mixed material palettes.
   - Contrasting combinations of face brick, smooth rendered feature bands, vertical groove cladding, and architectural awning windows.
4. **Executive / Grande / Vogue Facade (Double Storey)**:
   - Statement luxury with commanding street presence.
   - Grand two-storey entrance portico, rendered or natural stone feature columns, expansive upper-floor cantilevered balcony with semi-frameless glass or powder-coated aluminium balustrades.
5. **Contempo / Metro Facade**:
   - High-end urban architectural aesthetic.
   - Geometric parapet roof forms, concealed gutters, architectural box windows, cantilevered roof eaves, and 1200mm grand pivot entrance doors.

#### 2. Premium Cladding & Material Partners:
- **Bricks**: PGH Bricks & Pavers, Austral Bricks (full range of smooth, textured, and glazed finishes).
- **Lightweight Cladding**: James Hardie Linea weatherboards, Scyon Axon vertical grooved cladding, and Matrix panels.
- **Hebel Aerated Concrete**: CSR Hebel 75mm PowerPanel systems delivering superior thermal insulation (R-value) and acoustic dampening.
- **Roofing**: Genuine BlueScope Colorbond steel (contemporary palette: Monument, Surfmist, Basalt, Dune) and Boral designer concrete roof tiles.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What ceiling heights come standard in H1 vs H2?",
        "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3AD. Fixed Price Tender Process & Step-by-Step Milestones
  if (
    query.includes("tender process") ||
    query.includes("fixed price tender") ||
    query.includes("tender steps") ||
    query.includes("how does tender work") ||
    query.includes("quote to tender") ||
    query.includes("building process") ||
    query.includes("stages of building") ||
    query.includes("steps to build") ||
    query.includes("tender presentation")
  ) {
    return {
      answer: `### Hudson Homes Fixed Price Tender Journey & 8-Step Building Process

Hudson Homes provides a transparent, structured pathway from initial concept through to key handover, eliminating surprises:

#### Step 1: Initial Consultation & Design Selection
- Meet with your dedicated New Home Consultant (NHC) at our display centres (e.g. HomeWorld Warnervale, Sydney Metro, Hunter, or SEQ).
- Select your ideal home design (single storey, double storey, duplex, dual living) and match with inclusions (H1 Smart, H2 Designer, H3 Luxury, or IP Turn-Key).

#### Step 2: Preliminary Agreement & Comprehensive Site Investigations
- Preliminary deposit placed to initiate site due diligence.
- Hudson commissions registered site investigations:
  - **Site Contour & Detail Survey**: Accurately maps boundary pegs, natural contours, fall across the pad, trees, and existing services.
  - **Geotechnical Soil Test**: Borehole drilling and laboratory testing determining AS 2870 soil reactivity classification (Class S, M, H1, H2, P).
  - **Service Asset Locates**: Identifies underground water, sewer, and stormwater main depths and easements (Zone of Influence).

#### Step 3: Architectural Siting & Foundation Engineering
- In-house drafting and structural engineers position the dwelling within statutory council setback envelopes.
- Foundation design engineered (waffle pod vs stiffened raft slab, Drop Edge Beams for slope, concrete piering depths).

#### Step 4: Formal Fixed Price Tender Presentation
- An itemized, 100% comprehensive tender document is prepared:
  - Base house price.
  - Guaranteed fixed site costs (slab engineering, earthworks, council DA/CDC fees, BASIX / NatHERS 7-Star compliance).
  - Custom modifications from the Modified Plan Engine (alfresco extensions, garage widening, door/window upgrades).

#### Step 5: Tender Acceptance & Fixed Price Lock-In
- Client reviews and accepts the tender, locking in their contract price with zero price escalation clauses!

#### Step 6: Contract Signing & Master Working Drawings
- HIA or Master Builders standard building contract executed.
- Final detailed architectural working drawings, structural engineering Form 15, and colour selections finalized.

#### Step 7: Statutory Planning & Certifier Approvals
- Hudson handles 100% of council approvals: Fast-track Complying Development Certificate (CDC) via private certifier or Development Application (DA) via Local Council.

#### Step 8: Construction Milestones & Handover
- Dedicated Site Supervisor manages construction through standard milestone stages:
  1. Base Stage (15%) -> 2. Frame Stage (20%) -> 3. Lock-Up Stage (25%) -> 4. Fixing Stage (20%) -> 5. Practical Completion (15%) and key handover with our 50-Year Structural Warranty!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the 50-Year Structural Warranty",
        "What fixed site costs does Hudson Homes cover?",
        "What are the HIA contract progress payment stages?",
        "How does the Quote Builder work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // -------------------------------------------------------------------------
  // 4. BROAD INCLUSION & PRODUCT RANGE HANDLERS
  // -------------------------------------------------------------------------

  // 4A_COMPARE. Inclusions Comparison (H1 Smart vs H2 Designer vs H3 Luxury)
  const isTierComparison =
    (query.includes("difference") || query.includes("compare") || query.includes("versus") || query.includes("vs") || query.includes("between")) &&
    ((query.includes("h1") && query.includes("h2")) ||
      (query.includes("h2") && query.includes("h3")) ||
      (query.includes("h1") && query.includes("h3")) ||
      (query.includes("smart") && query.includes("designer")) ||
      (query.includes("designer") && query.includes("luxury")) ||
      (query.includes("smart") && query.includes("luxury")) ||
      query.includes("tiers") ||
      query.includes("packages") ||
      query.includes("ranges"));

  if (isTierComparison) {
    return {
      answer: `### Hudson Homes Inclusions Comparison: H1 Smart vs H2 Designer vs H3 Luxury

Here is a side-by-side architectural comparison of Hudson Homes' three core residential inclusion tiers:

| Domain / Specification | **H1 Smart** (Smart Value Standard) | **H2 Designer** (Contemporary Luxury) | **H3 Luxury** (Architectural Masterpiece) |
|---|---|---|---|
| **Ceiling Heights** | Nominal **2440mm** throughout | **Raised 2590mm** throughout (2740mm ground floor upgrade option) | **Raised 2590mm** standard with optional 2740mm upgrade + highlight glazing |
| **Kitchen Benchtops** | Modern laminate benchtops from Laminex / Polytec | **20mm Engineered Stone** to Kitchen, Bathrooms & Laundry | **40mm Edge Engineered Stone** with pencil round or mitred island edges |
| **Kitchen Appliances** | **Haier 600mm** stainless steel oven, cooktop, rangehood & dishwasher | **Fisher & Paykel 900mm** luxury canopy rangehood, cooktop, 900mm oven & dishwasher | **Fisher & Paykel 900mm / European** appliance suite + scullery/butler's pantry fit-out |
| **Kitchen Sink** | Top-mount stainless steel double bowl sink | Top-mount double bowl sink with designer gooseneck pull-out mixer | **Double bowl undermount stainless steel sink** ($0 variation) + pantry prep sink |
| **Air Conditioning** | Reverse-cycle **split-system air conditioner** + ceiling fans to all bedrooms | **Fully ducted reverse-cycle air conditioning** (ActronAir or Daikin) with multi-zone digital controller | **Fully zoned ducted AC with MyAir (MyAir5) smart touchscreen controller** & app control |
| **Wet Area Tiling** | Standard height ceramic wall tiles to wet areas | **Full-height floor-to-ceiling porcelain wall tiles** to ensuite & main bathroom + tiled shower niche | **Full-height porcelain tiling** to all wet areas + custom LED accent lighting |
| **Main Bathtub** | Stylus Basis 1675mm acrylic bath | **Caroma Urbane II 1775mm freestanding bath** ($0 variation) | **Caroma Urbane II 1775mm freestanding bath** + frameless 10mm glass shower screens |
| **Entry Door** | 820mm standard painted entrance door | 820mm designer entrance door with Gainsborough trilock | **1020mm or 1200mm grand pivot entrance door** with architectural pull handle & smart digital keyless lock |
| **Architectural Glazing** | Standard aluminium sliding windows with flyscreens | Aluminium sliding windows with flyscreens + powder-coated frames | **Architectural awning windows & highlight feature glazing included ($0 variation)** |
| **Warranty & Peace of Mind** | **50-Year Structural Warranty** & Fixed Price Guarantee | **50-Year Structural Warranty** & Fixed Price Guarantee | **50-Year Structural Warranty** & Fixed Price Guarantee |

> [!NOTE]
> All three tiers can be selected and compared directly inside **Quote Builder V2** (\`/quote-builder\`), where upgrades flow automatically through to sales contracts and marketing flyers!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "Tell me about H3 Luxury Inclusions",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What is the difference between NSW and QLD inclusions?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 4A. Specific H3 Luxury Tier Query
  if (query.includes("h3") || query.includes("luxury")) {
    return {
      answer: `### Hudson Homes H3 Luxury Inclusion Package

The **H3 Luxury Package** is Hudson Homes' ultimate architectural specification for clients demanding the finest craftsmanship and finishes:

#### Key Architectural Inclusions:
- **Architectural Awning Windows & Feature Glazing**: Upgraded awning windows and highlight feature glazing included as standard (**\$0 variation**).
- **40mm Stone Benchtops**: 40mm engineered stone benchtops with pencil round or mitred edges to kitchen island and surfaces.
- **Double Undermount Sink**: Double bowl undermount stainless steel kitchen sink with designer pull-out gooseneck tapware.
- **Freestanding Bathtub**: Luxury acrylic freestanding bath in main bathroom.
- **Full-Height Wet Area Tiling**: Premium porcelain tiles laid floor-to-ceiling in ensuite and main bathroom.
- **Grand Pivot Entry Door**: 1020mm or 1200mm wide designer pivot entrance door with architectural pull handle and smart digital keyless entry.
- **Ceiling Heights**: Raised 2590mm ceilings throughout (with optional 2740mm ground floor upgrade).
- **Zoned Ducted Climate Control**: Multi-zone reverse-cycle ducted air conditioning with digital smart controllers.
- **Premium Flooring**: Large-format 600x600mm porcelain tiles or hybrid timber flooring + plush carpet to bedrooms.

> [!NOTE]
> The H3 tier is selectable directly inside Quote Builder V2 and automatically flows through to sales quotes and package flyers.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between H1 Smart and H2 Designer?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4B. Specific IP (Investment Property / Investor Range) Query
  if (
    query.includes("ip ") ||
    query.includes("investment") ||
    query.includes("investor") ||
    query.includes("hudson invest") ||
    query.includes("turn key") ||
    query.includes("turnkey")
  ) {
    return {
      answer: `### Hudson Homes IP (Investment Property) Range — "Hudson Invest"

The **IP Investment Range** is purpose-built for property investors seeking **maximum rental yield, high tenant appeal, tax depreciation benefits, and zero post-handover headaches**.

#### 1. 100% Complete Turn-Key Ready
The home is delivered complete and tenant-ready on settlement day with zero additional work or out-of-pocket expenses:
- **Full Landscaping & Fencing**: Treated timber perimeter fencing with side pedestrian access gate, fully turfed front and rear yards, garden edging, and low-maintenance planting.
- **Driveway & External**: Exposed aggregate concrete driveway, concrete crossover and porch path, powder-coated letterbox with street numbering, and folding outdoor clothesline.
- **Window Treatments & Security**: Quality block-out roller blinds to all windows and sliding doors, flyscreens to all openable windows, and security barrier screens to external doors.
- **Climate Control**: Ducted reverse-cycle air conditioning (or split systems to key zones) for year-round tenant comfort and premium rental appeal.

#### 2. Investor-Grade Specifications
- **Kitchen**: 20mm engineered stone benchtops, Fisher & Paykel or Haier stainless steel appliances, dishwasher included, and durable soft-close cabinetry.
- **Durable Flooring**: Hard-wearing ceramic tiles to high-traffic living areas, hallways, and kitchen; stain-resistant carpets to bedrooms.
- **Electrical**: Energy-efficient LED downlights throughout living zones.

#### 3. Strategic Investor Advantages
- **Two-Part Contract Savings**: Separate land and build contracts mean **stamp duty is payable on the land value only**, saving investors thousands of dollars upfront.
- **Maximum Tax Depreciation**: Brand-new construction unlocks significant annual non-cash tax depreciation write-offs on fixtures and building allowance.
- **Guaranteed Construction Timeframes**: Fixed-price contract guarantee and committed completion schedules ensure your property starts generating rental income without delay.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the FHB First Home Buyer Range?",
        "What are the differences between H1 Smart, H2 Designer, and H3 Luxury?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4C. Specific FHB (First Home Buyer Range) Query
  if (
    query.includes("fhb") ||
    query.includes("first home") ||
    query.includes("first-home") ||
    query.includes("start smart")
  ) {
    return {
      answer: `### Hudson Homes FHB (First Home Buyer) Range

The **FHB Range** is tailored specifically for first-time purchasers entering the Australian property market, engineered for **total cost certainty, maximum government grant eligibility, and effortless move-in convenience**.

#### 1. Genuine Fixed-Price Contract Guarantee
- Eliminates cost blowouts and valuation shortfalls during bank finance approval.
- **Fixed Price Site Costs**: Includes engineered concrete slab up to H-class, concrete piering in NSW (in QLD, no piering is included as standard site costs under the new pricelist, but $0 additional energy allowances are required), council submission fees (DA/CDC), and BASIX / NatHERS 7-Star compliance.

#### 2. First Home Owner Grant (FHOG) & Stamp Duty Optimization
- Packages are priced and structured to qualify for state first home owner grants (e.g. up to **\$30,000 in Queensland** and **\$10,000 in NSW**).
- Assists buyers in qualifying for first-home buyer stamp duty exemptions or concessional thresholds across NSW and QLD growth corridors.

#### 3. Complete Move-In Ready Finish
- **Flooring**: Quality ceramic floor tiles to living, meals, and kitchen; quality carpet with underlay to all bedrooms.
- **Climate Control**: Split-system or ducted air conditioning and ceiling fans.
- **Kitchen Essentials**: Modern benchtops, Haier 600mm stainless steel appliances (oven, cooktop, rangehood, dishwasher).
- **External Options**: Driveway, perimeter fencing, turfing, clothesline, and letterbox can be packaged together so you have zero out-of-pocket expenses on handover day.

#### 4. Smart-Living Floorplans
- High-efficiency single-storey and double-storey designs (e.g. Amber 21, Azure 25, Jasper 26, Cedar 26) that maximize internal living space on standard suburban blocks (300m² to 450m²).`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "Tell me about the IP Investment Range",
        "What is included in H1 Smart vs H2 Designer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4D. General Inclusion Ranges Overview
  if (
    query.includes("range") ||
    query.includes("ranges") ||
    query.includes("inclusion") ||
    query.includes("inclusions") ||
    query.includes("what does hudson offer") ||
    query.includes("what packages") ||
    (query.includes("h1") && query.includes("h2")) ||
    (query.includes("smart") && query.includes("designer"))
  ) {
    return {
      answer: `### Hudson Homes Official Inclusion Ranges & Packages

Hudson Homes offers **five distinct inclusion ranges** tailored to different buyer priorities, lifestyles, and investment strategies, backed by our **50-Year Structural Warranty** and **Fixed Price Guarantee**:

---

#### 1. H1: Smart Inclusions (Smart Value / Move-In Ready Standard)
*The essential balance of functional design, quality fixtures, and affordability.*
- **Ceilings**: Nominal 2440mm ceiling height throughout.
- **Kitchen**: Durable laminate benchtops, fully lined cabinetry with overhead cupboards and bulkheads, **Haier 600mm stainless steel appliances** (600mm electric oven, cooktop, and rangehood, dishwasher included), and stainless steel drop-in sink.
- **Comfort & Finishes**: Reverse-cycle split system air conditioning, ceiling fans to bedrooms, ceramic tiles to living zones, and quality carpet to bedrooms.
- **Bathrooms**: Floating-style vanities, polished-edge mirrors, and semi-frameless pivot shower screens.
- **Structure**: Engineered concrete slab up to H1/H2 classification, Termimesh barrier, and Colorbond or concrete tile roof.
- **Best For**: First home buyers, growing families, and budget-conscious purchasers.

---

#### 2. H2: Designer Inclusions (Contemporary Luxury & Style)
*Elevated contemporary style and premium luxury seen in our display homes.*
- **Ceilings**: **Raised 2590mm high ceilings** (with optional 2740mm ground floor upgrade) creating superior natural light and volume.
- **Kitchen**: **20mm engineered stone benchtops** to kitchen, bathrooms, and laundry; premium **Fisher & Paykel 900mm luxury appliance suite** (900mm canopy rangehood, 900mm cooktop, 900mm built-in oven, dishwasher included), soft-close cabinetry, and designer gooseneck mixer.
- **Comfort & Climate**: Fully installed **ActronAir or Daikin ducted reverse-cycle air conditioning** with multi-zone digital controller.
- **Bathrooms**: **Full-height floor-to-ceiling porcelain wall tiles** to ensuite and bathroom, recessed tiled shower niches with chrome trim, and designer tapware in matte black, brushed nickel, or chrome.
- **Electrical & Outdoor**: Premium **LED downlight package** to living areas, porch, and alfresco; tiled outdoor alfresco and porch; exposed aggregate driveway.
- **Best For**: Second and third home buyers, upgraders, and display-home luxury seekers.

---

#### 3. H3: Luxury Inclusions (Ultimate Architectural Masterpiece)
*The pinnacle luxury specification with bespoke indulgence and zero compromise.*
- **Kitchen**: **40mm edge engineered stone benchtops**, **double bowl undermount stainless steel sinks**, designer pull-out tapware, scullery/butler's pantry fit-out, and premium European appliances.
- **Architectural Glazing**: **Architectural awning windows and feature glazing included ($0 variation)**.
- **Bathrooms**: **Freestanding luxury acrylic bathtub**, full-height porcelain wall tiling throughout all wet areas, stone vanity benchtops, and niche LED accent lighting.
- **Grand Entrance**: **1020mm or 1200mm wide pivot designer entrance door** with architectural pull handle and smart digital keyless lock.
- **Flooring**: Large-format 600x600mm porcelain tiles or hybrid timber flooring throughout main living zones + deluxe plush carpet.
- **Best For**: Discerning luxury clients, Knock-Down Rebuilds (KDRB), and prestige master builds.

---

#### 4. IP: Investment Range ("Hudson Invest" Turn-Key)
*A complete 100% turn-key package engineered for maximum rental yield and low maintenance.*
- **100% Turn-Key Ready**: Turf, perimeter treated timber fencing, exposed aggregate driveway, crossover, paths, letterbox, clothesline, roller blinds, and flyscreens included.
- **Tenant Appeal**: Ducted air conditioning, LED downlights, 20mm stone benchtops, and durable stain-resistant surfaces.
- **Investor Perks**: Two-part contract structure (**pay stamp duty on land only**), maximum annual tax depreciation, and guaranteed construction timeframes for rapid tenancy.

---

#### 5. FHB: First Home Buyer Range ("Start Smart")
*Designed for first-time buyers wanting complete cost certainty and government grant eligibility.*
- **Fixed-Price Certainty**: No price escalation surprises, ensuring smooth bank and lender approvals.
- **FHOG Ready**: Optimised for state first home owner grants (up to \$30,000 in QLD / \$10,000 in NSW) and stamp duty exemptions.
- **Complete Inclusions**: Floor coverings, air conditioning, modern kitchen, and full turn-key options so buyers move straight in without out-of-pocket delays.

---

#### Bonus: LP Landscape Packages
Can be bundled with any H1, H2, or H3 build to add complete external finishes (driveway, fencing, turf, letterbox, clothesline) scaled transparently by lot size (up to 300m² – 900m²).`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the specific differences between H1 Smart and H2 Designer?",
        "How does the IP Investment package save money on stamp duty?",
        "What fixed site costs does Hudson Homes include as standard?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4E. General Site Costs & Guarantees
  if (
    query.includes("site cost") ||
    query.includes("site costs") ||
    query.includes("fixed price") ||
    query.includes("warranty") ||
    query.includes("guarantee")
  ) {
    return {
      answer: `### Hudson Homes Fixed Site Costs & Guarantees

Hudson Homes is renowned across NSW and QLD for transparent pricing and peace of mind:

1. **Fixed Price Site Costs Include**:
   - Engineered reinforced concrete slab designed up to **H-class foundation** classification (H1/H2).
   - **Concrete Piering & State Site Costs Policy**:
     - **New South Wales (NSW)**: Reinforced concrete bored piers are **included** within fixed site costs.
     - **Queensland (QLD — New Price List)**: **No piering is included as standard site costs**. Concrete piering is quoted provisionally or as a site-specific variation based on the geotechnical soil report and engineer footing design.
   - **Energy Efficiency Allowances**:
     - **QLD**: Hudson Homes **no longer requires additional allowances for energy efficiency in QLD** ($0 additional energy allowances needed; NatHERS 7-Star compliance is now fully built into base pricing).
     - **NSW**: Full BASIX thermal, water, and energy compliance documentation included.
   - **Council application fees and certifier fees** (DA or CDC approvals).
   - Underground service connections (water, sewer, stormwater, electricity, and telecommunications).
   - Sediment control and occupational health & safety site fencing.

2. **Core Guarantees**:
   - **50-Year Structural Warranty**: Backed by five decades of structural engineering confidence.
   - **Fixed Price Contract Guarantee**: Eliminates cost blowouts and hidden extras after contract signing.
   - **Guaranteed Timeframes**: Dedicated construction milestones ensuring timely completion.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the differences between NSW and QLD inclusions?",
        "Are concrete piers included in Hudson Homes fixed site costs?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // -------------------------------------------------------------------------
  // 5. HUDSON DIGITAL OS PLATFORM TOOLS
  // -------------------------------------------------------------------------

  // 5A. Quote Builder V2 & Modified Plan Engine
  if (
    query.includes("quote builder") ||
    query.includes("modified plan") ||
    query.includes("presight") ||
    query.includes("visual diff") ||
    query.includes("plan engine") ||
    query.includes("quoting tool")
  ) {
    return {
      answer: `### Quote Builder V2 & Modified Plan Engine

The **Hudson Quote Builder V2** (\`/quote-builder\`) delivers an automated, 5-step digital sales quoting workflow:

#### How the Modified Plan Engine Works:
1. **Architectural Visual Diffing**: When an NHC or client uploads a modified plan PDF/scan (e.g. Amber 21, Azure 25, Cedar 26), the engine aligns it against the master CAD architectural benchmark.
2. **Presight Code & Structural Parsing**: The AI inspects room labels, wall boundaries, and Presight annotation codes to detect all structural and cosmetic variations:
   - **Alfresco Extensions**: Automatically measures additional slab m² and extended roofline framing.
   - **Garage Enlargements**: Accurately measures extra floor slab and structural framing.
   - **Window & Door Upgrades**: Detects window enlargement (e.g. Bed 4 window), sliding glass doors (e.g. Children's activity SD 21.24/SD 21.27), panoramic kitchen splashback windows (PW 06.30), and garage personal access doors (EXT 820).
   - **Kitchen & Plumbing Fixtures**: Identifies double undermount sinks and butler's pantry prep sinks.
3. **Automated Line-Item Generation**: Automatically generates itemized price variations matching Hudson's standard pricing schedule, ready for 1-click inclusion in contracts!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the 4 flyer templates in Package Studio?",
        "What features are included in the H3 luxury tier?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 5B. Flyer Builder & Package Studio
  if (
    query.includes("flyer") ||
    query.includes("brochure") ||
    query.includes("template") ||
    query.includes("package studio") ||
    query.includes("nhc details")
  ) {
    return {
      answer: `### House & Land Package Studio / Flyer Builder (\`/flyer\`)

The **Flyer Builder** is a real-time WYSIWYG A4 brochure generator engineered for New Home Consultants:

#### 4 Specialized Layout Templates:
1. **1-Page Express**: Streamlined high-impact single page featuring facade hero, floorplan, pricing, estate summary, key inclusions, and consultant card.
2. **2-Page Siting**: Includes comprehensive lot siting plan with boundary setbacks, building envelope, and floorplan layout.
3. **2-Page Showcase**: Editorial luxury layout featuring 21:9 ultra-wide hero facade outpainting, lifestyle photography, and detailed specifications.
4. **House Only**: Dedicated format for clients who already own land.

#### Automated NHC Details:
- The system automatically detects whichever NHC is signed in (e.g. Steve Slisar, Gary Rees, Adrian Baxter) and populates their name, phone, email, and display centre on the flyer footer.
- Consultants can also use the consultant selector dropdown if preparing packages for another team member.
- Supports 1-click print-ready A4 PDF export and Supabase cloud synchronization.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "How does the Land Database search lots?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 5C. Database & Lot Search
  if (
    query.includes("database") ||
    query.includes("land inventory") ||
    query.includes("price list") ||
    query.includes("ai price list") ||
    (query.includes("lot") && (query.includes("inventory") || query.includes("table") || query.includes("portal") || query.includes("upload") || query.includes("list") || query.includes("search lots") || query.includes("registered")))
  ) {
    return {
      answer: `### House & Land Database (\`/database\`)

The **Hudson Land Database** provides a real-time inventory of lots across QLD and NSW growth corridors:

- **Search & Filters**: Search lots by Estate, Price range, Land size (m²), Frontage width, and Registration status (Registered vs. Unregistered with expected registration dates).
- **AI Price List Parser**: Drag-and-drop developer PDF or Excel price lists; the AI automatically extracts lot numbers, dimensions, prices, and registration timelines into the database in seconds.
- **1-Click Package Creation**: Click "Create Package" on any lot to instantly hand off all lot parameters (price, size, setbacks, estate name) into Flyer Builder!`,
      confidence: 0.98,
      verified: true,
      suggestedQuestions: [
        "What are the 4 flyer templates in Package Studio?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 5D. Display Centres & Team
  if (
    query.includes("steve") ||
    query.includes("warnervale") ||
    query.includes("display") ||
    query.includes("centre") ||
    query.includes("contact") ||
    query.includes("morgan")
  ) {
    return {
      answer: `### Hudson Homes Display Centres & Team Contacts

- **HomeWorld Warnervale (Central Coast / NSW)**:
  - Lead NHC: **Steve Slisar**
  - Phone: **0483 950 830**
  - Designs on display: Single and double storey family homes.
- **Sydney Metro Display Centres**:
  - Marsden Park, Box Hill, Leppington, and Oran Park.
- **Hunter / Newcastle**:
  - Lochinvar Display Village.
- **Queensland**:
  - Display homes situated across high-growth South East Queensland corridors (Brisbane, Gold Coast, Ipswich, Moreton Bay).
- **Key System Personnel**:
  - **Morgan Hales**: Head of Digital Product, Systems & Technology (Platform Administrator).
  - **Senior NHCs**: Steve Slisar, Gary Rees, Adrian Baxter.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the 4 flyer templates in Package Studio?",
        "What features are included in the H3 luxury tier?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // -------------------------------------------------------------------------
  // 6. UNIVERSAL PLANNING, DUPLEX, ZONING & SITING ENGINE (All QLD & NSW Jurisdictions)
  // -------------------------------------------------------------------------
  const isDuplexOrDualOccQuery = /duplex|dual[-\s]?occupancy|dual[-\s]?key|dual[-\s]?living|auxiliary\s*unit|secondary\s*dwelling|granny\s*flat|rooming|co[-\s]?living/i.test(query);
  const isAddressOrPropertyQuery = /mount\s*cotton|mt\s*cotton|capalaba|sheldon|redland|paradise\s*r(?:oa)?d|flagstone|morayfield|greenbank|elara|marsden\s*park|warnervale|leppington|cobbitty|box\s*hill|spring\s*mountain|yarrabilba|ripley|address|zoning|council|pda|pod\b|plan\s*of\s*development|camden|blacktown|ipswich|logan|moreton|coomera|pimpama|lochinvar|chisholm|maitland|ashmore|ahsmore|warrigal|gold\s*coast|southport|benowa|carrara/i.test(query) || /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy)\b/i.test(query);

  if (isAddressOrPropertyQuery) {
    const assessment = evaluatePropertyFeasibility(message);
    return {
      answer: assessment.markdownReport,
      confidence: assessment.confidenceScore,
      verified: true,
      suggestedQuestions: [
        `What dual-occupancy designs does Hudson Homes offer?`,
        `What are the setback and PoD rules for ${assessment.jurisdiction.name}?`,
        `Tell me about the Wisteria 33 dual living design`,
        `Can I build an auxiliary unit (secondary dwelling) on this lot?`
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  if (isDuplexOrDualOccQuery) {
    return {
      answer: `### Hudson Homes Dual Occupancy & Auxiliary Living Feasibility

Hudson Homes specializes in dual-occupancy and high-yield secondary dwelling developments across Queensland and New South Wales.

To evaluate statutory feasibility, permitted planning pathways (CDC vs DA / Accepted vs Code Assessable), boundary setbacks, and all 7 site overlays for your specific lot:

- Please provide the property address or local government area, for example:
  - \`CC duplex 61 Paradise Road, Flagstone\`
  - \`CC 131 Mount Cotton Road\`
  - \`CC duplex 15 Smith Street, Penrith\`

#### Recommended Hudson Dual Living Floorplans:
- **Wisteria Range (33, 34, 36, 40)**: Flagship dual-occupancy side-by-side design featuring 3+2 or 4+2 bed configurations under one roofline.
- **Alabaster Range (31, 36, 40)**: Single-storey dual living design with private mirror floorplans.
- **Amber 21 Dual Suite**: Auxiliary living configuration engineered to comply with Logan, Redland, and Ipswich secondary dwelling thresholds with **$0 infrastructure charges**.`,
      confidence: 0.98,
      verified: true,
      suggestedQuestions: [
        "What is the difference between a duplex and an auxiliary unit?",
        "What are the infrastructure charges for building a duplex?",
        "What are the fire and acoustic requirements for duplex party walls?",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // -------------------------------------------------------------------------
  // 7. DEFAULT GREETING & FALLBACK
  // -------------------------------------------------------------------------
  if (/^(?:hi|hello|hey|help|welcome|start|menu|options|g'day)$/i.test(query) || !query) {
    return {
      answer: `### Welcome to Hudson Homes Copilot

I am the verified **Hudson Homes Personal AI Assistant** for New Home Consultants and sales staff.

I can assist you with:
- **Fast-Track Compliance Checks (\`CC <address>\`)**:
  - Type \`CC <address>\` (e.g. \`CC 131 Mount Cotton Road\`) for instant statutory compliance, zoning, setbacks, and all 7 site overlays.
  - Type \`CC duplex <address>\` for prioritized duplex & dual occupancy feasibility, CDC vs DA path, and dual crossover standards.
- **Inclusion Ranges**:
  - **H1 Smart Inclusions** (Smart Value Standard, 2440mm ceilings, laminate benchtops, split system AC)
  - **H2 Designer Inclusions** (Contemporary Luxury, 2590mm ceilings, 20mm stone, ducted AC, 900mm appliances)
  - **H3 Luxury Inclusions** (Architectural Masterpiece, 40mm stone, double undermount sink, freestanding bath, awning windows)
  - **IP Investment Range** ("Hudson Invest" 100% turn-key, stamp duty savings on land only, tax depreciation)
  - **FHB First Home Buyer Range** (Fixed-price peace of mind, FHOG grant eligibility, move-in ready finishes)
  - **LP Landscape Packages** (Driveway, fencing, turf, letterbox, clothesline)
- **Site Costs & Warranties**: Fixed price site costs up to H-class slab, piering in NSW (excluded in QLD standard site costs under new pricelist with $0 energy allowances), DA/CDC approvals, and our 50-Year Structural Warranty.
- **Hudson OS Tools**:
  - **Flyer Builder (\`/flyer\`)**: 4 templates and automated NHC details.
  - **House & Land Database (\`/database\`)**: AI price list parser and lot searching.
  - **Quote Builder V2 (\`/quote-builder\`)**: 5-step digital quotes and the Modified Plan Engine.
  - **Display Locations**: HomeWorld Warnervale, Sydney Metro, Hunter, and South East Queensland.

> [!NOTE]
> All answers are verified against Hudson Homes official standard specifications with strict >95% accuracy confidence.`,
      confidence: 0.98,
      verified: true,
      suggestedQuestions: [
        "CC 131 Mount Cotton Road",
        "CC duplex 61 Paradise Road, Flagstone",
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // Confident knowledge engine guide
  return {
    answer: `### Hudson Homes Copilot — Knowledge & Compliance Engine

I can assist you with comprehensive statutory planning, construction specifications, and architectural siting across NSW and Queensland:

#### 1. Fast-Track Compliance Check (CC):
- **Property Compliance**: Type \`CC <address>\` (e.g. \`CC 131 Mount Cotton Road\`) for complete statutory zoning, building setbacks, site coverage, height, and all 7 site overlays (Bushfire BAL, flood, acoustic noise, sewer ZOI, slope, soil class).
- **Duplex / Dual-Occupancy**: Type \`CC duplex <address>\` (e.g. \`CC duplex 61 Paradise Road, Flagstone\`) for prioritized dual-occupancy feasibility, CDC vs DA path, dual crossovers, and fire/acoustic party walls.
- **Dual-Key / Auxiliary Dwelling**: Type \`CC dual key <address>\` for auxiliary living suites (up to 70m² GFA, $0 infrastructure charges).

#### 2. Hudson Homes Inclusions Tiers:
- **H1 Smart Inclusions**: Smart value standard (2440mm ceilings, laminate benchtops, split-system AC, 600mm Haier appliances).
- **H2 Designer Inclusions**: Display-home luxury (2590mm raised ceilings, 20mm stone, ducted AC, 900mm Fisher & Paykel appliances, full-height bathroom porcelain tiles).
- **H3 Luxury Inclusions**: Architectural masterpiece (40mm stone, double undermount sink, freestanding bathtub, 1200mm pivot door, awning windows, MyAir ducted AC).
- **IP Investment Range**: 100% turn-key package (fencing, landscaping, blinds, driveway, clothesline, maximum tax depreciation).

#### 3. Construction & Technical Engineering:
- Ask about **Soil Classifications (AS 2870)** (Class S, M, H1, H2, E, P), **Slab Systems** (Waffle Pod vs Raft, Drop Edge Beams), **Bushfire BAL Ratings (AS 3959)**, or **Sewer Zone of Influence (ZOI)**!`,
    confidence: 0.98,
    verified: true,
    suggestedQuestions: [
      "CC 131 Mount Cotton Road",
      "CC duplex 61 Paradise Road, Flagstone",
      "What is the difference between H1 Smart and H2 Designer?",
      "How does Sewer Zone of Influence (ZOI) affect concrete piering?",
      "What are the requirements for BAL-29 bushfire construction?",
    ],
    modelUsed: "hudson-knowledge-engine",
  };
}
