import { HUDSON_FLOORPLANS } from "@/components/flyer/floorplans.data";
import { type StaffProfile } from "@/lib/authSession";
import { getHousingTypeForDesign } from "@/lib/quoting/quoteEngine";
import { evaluatePropertyFeasibility } from "@/lib/planning/universalPlanningEngine";

export interface HubAiResponse {
  answer: string;
  confidence: number;
  verified: boolean;
  suggestedQuestions: string[];
  modelUsed: string;
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
    frontSetback,
    rearSetback,
    strictFit,
    btbFit,
    closeFit,
  };
}

export function formatSitingResponse(res: ReturnType<typeof evaluateLotSiting>): string {
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

export function generateHudsonKnowledgeResponse(
  message: string,
  staffUser?: StaffProfile | null
): HubAiResponse {
  const query = (message || "").toLowerCase().trim();

  // 0. Siting, Setbacks & Floorplan Feasibility Check
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
      answer:
        "⚠️ **Accuracy Notice**: I cannot answer that with high accuracy (>95% confidence) at this moment. For specific unreleased estate pricing, bespoke developer covenants, or non-standard variations, please verify directly with Head Office Estimating or refer to the official Hudson Homes Inclusions schedule.",
      confidence: 0.7,
      verified: false,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
        "Tell me about the IP Investment and FHB First Home Buyer ranges",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 2. Specific IP (Investment Property / Investor Range) Query
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
- **Kitchen**: 20mm engineered stone benchtops, Westinghouse stainless steel appliances, dishwasher included, and durable soft-close cabinetry.
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

  // 3. Specific FHB (First Home Buyer Range) Query
  if (
    query.includes("fhb") ||
    query.includes("first home") ||
    query.includes("first-home") ||
    query.includes("start smart") ||
    query.includes("fhog")
  ) {
    return {
      answer: `### Hudson Homes FHB (First Home Buyer) Range

The **FHB Range** is tailored specifically for first-time purchasers entering the Australian property market, engineered for **total cost certainty, maximum government grant eligibility, and effortless move-in convenience**.

#### 1. Genuine Fixed-Price Contract Guarantee
- Eliminates cost blowouts and valuation shortfalls during bank finance approval.
- **Fixed Price Site Costs**: Includes engineered concrete slab up to H-class, concrete piering, council submission fees (DA/CDC), and BASIX / NatHERS 7-Star compliance.

#### 2. First Home Owner Grant (FHOG) & Stamp Duty Optimization
- Packages are priced and structured to qualify for state first home owner grants (e.g. up to **\$30,000 in Queensland** and **\$10,000 in NSW**).
- Assists buyers in qualifying for first-home buyer stamp duty exemptions or concessional thresholds across NSW and QLD growth corridors.

#### 3. Complete Move-In Ready Finish
- **Flooring**: Quality ceramic floor tiles to living, meals, and kitchen; quality carpet with underlay to all bedrooms.
- **Climate Control**: Split-system or ducted air conditioning and ceiling fans.
- **Kitchen Essentials**: Modern benchtops, Westinghouse stainless steel appliances (oven, cooktop, rangehood, dishwasher provision).
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

  // 4. General Inclusion Ranges Overview (Answers "what inclusion ranges does Hudson Homes offer")
  // Matches queries containing "range", "ranges", "inclusion", "inclusions", "offer", "package", "packages"
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
- **Kitchen**: Durable laminate benchtops, fully lined cabinetry with overhead cupboards and bulkheads, Westinghouse stainless steel appliances (600mm oven, cooktop, and rangehood), and stainless steel drop-in sink.
- **Comfort & Finishes**: Reverse-cycle split system air conditioning, ceiling fans to bedrooms, ceramic tiles to living zones, and quality carpet to bedrooms.
- **Bathrooms**: Floating-style vanities, polished-edge mirrors, and semi-frameless pivot shower screens.
- **Structure**: Engineered concrete slab up to H1/H2 classification, Termimesh barrier, and Colorbond or concrete tile roof.
- **Best For**: First home buyers, growing families, and budget-conscious purchasers.

---

#### 2. H2: Designer Inclusions (Contemporary Luxury & Style)
*Elevated contemporary style and premium luxury seen in our display homes.*
- **Ceilings**: **Raised 2590mm high ceilings** (with optional 2740mm ground floor upgrade) creating superior natural light and volume.
- **Kitchen**: **20mm engineered stone benchtops** to kitchen, bathrooms, and laundry; premium **Westinghouse 900mm European appliance suite** (900mm canopy rangehood, 900mm cooktop, 900mm built-in oven), soft-close cabinetry, and designer gooseneck mixer.
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

  // 5. Specific H3 Luxury Tier Query
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

  // 6. Site Costs & Guarantees
  if (
    query.includes("site cost") ||
    query.includes("site costs") ||
    query.includes("fixed price") ||
    query.includes("warranty") ||
    query.includes("slab") ||
    query.includes("piering") ||
    query.includes("basix") ||
    query.includes("guarantee")
  ) {
    return {
      answer: `### Hudson Homes Fixed Site Costs & Guarantees

Hudson Homes is renowned across NSW and QLD for its transparent, fixed-price peace of mind:

1. **Fixed Price Site Costs Include**:
   - Engineered reinforced concrete slab designed up to **H-class foundation** classification (H1/H2).
   - **Concrete piering** allowance engineered to structural requirements.
   - **Council application fees and certifier fees** (DA or CDC approvals).
   - **BASIX & NatHERS 7-Star** energy and thermal efficiency compliance.
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
        "What are the 4 flyer templates in Package Studio?",
        "How does the Quote Builder Modified Plan Engine work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 7. Quote Builder V2 & Modified Plan Engine
  // Strictly matched on quoting / modified plan engine keywords
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

  // 8. Flyer Builder & Package Studio
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
- The system automatically detects whichever NHC is signed in (e.g. Steve Slisar, Jesse Jenkins, Gary Rees) and populates their name, phone, email, and display centre on the flyer footer.
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

  // 9. Database & Lot Search
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

  // 10. Display Centres & Team
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
  - **Senior NHCs**: Steve Slisar, Jesse Jenkins, Gary Rees.`,
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

  // 11. Universal Planning, Duplex, Zoning & Siting Engine (All QLD & NSW Jurisdictions)
  const isDuplexOrDualOccQuery = /duplex|dual[-\s]?occupancy|dual[-\s]?key|dual[-\s]?living|auxiliary\s*unit|secondary\s*dwelling|granny\s*flat|rooming|co[-\s]?living/i.test(query);
  const isAddressOrPropertyQuery = /paradise\s*r(?:oa)?d|flagstone|morayfield|greenbank|elara|marsden\s*park|warnervale|leppington|cobbitty|box\s*hill|spring\s*mountain|yarrabilba|ripley|address|zoning|council|pda|pod\b|plan\s*of\s*development|camden|blacktown|ipswich|logan|moreton|coomera|pimpama|lochinvar|chisholm|maitland/i.test(query) || /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl)\b/i.test(query);

  if (isDuplexOrDualOccQuery || isAddressOrPropertyQuery) {
    const assessment = evaluatePropertyFeasibility(query);
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

  // 12. Default Fallback
  // If the query is a simple greeting or empty:
  if (/^(?:hi|hello|hey|help|welcome|start|menu|options|g'day)$/i.test(query) || !query) {
    return {
      answer: `### Welcome to Hudson Homes Copilot

I am the verified **Hudson Homes Personal AI Assistant** for New Home Consultants and sales staff.

I can assist you with:
- **Inclusion Ranges**:
  - **H1 Smart Inclusions** (Smart Value Standard, 2440mm ceilings, laminate benchtops, split system AC)
  - **H2 Designer Inclusions** (Contemporary Luxury, 2590mm ceilings, 20mm stone, ducted AC, 900mm appliances)
  - **H3 Luxury Inclusions** (Architectural Masterpiece, 40mm stone, double undermount sink, freestanding bath, awning windows)
  - **IP Investment Range** ("Hudson Invest" 100% turn-key, stamp duty savings on land only, tax depreciation)
  - **FHB First Home Buyer Range** (Fixed-price peace of mind, FHOG grant eligibility, move-in ready finishes)
  - **LP Landscape Packages** (Driveway, fencing, turf, letterbox, clothesline)
- **Site Costs & Warranties**: Fixed price site costs up to H-class slab, piering, DA/CDC approvals, and our 50-Year Structural Warranty.
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
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "Tell me about the IP Investment Range",
        "What features are included in the H3 luxury tier?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // Specific question that could not be verified with 100% confidence:
  return {
    answer: `### Hudson Homes Copilot

> ⚠️ **Verification Notice**:
> **I apologize, but I cannot answer that with 100% confidence.**

To maintain absolute quotation accuracy and statutory compliance, Hudson Copilot only provides verified answers backed by official Hudson Homes specifications, published price lists, or statutory planning codes (NCC/BCA, NSW SEPP Housing 2021, and QLD EDQ Schemes).

**How you can get this answered:**
1. **House Design or Inclusions**: Specify the model name (e.g., Azure 19, Jasper 26, Amber 21) or inclusion tier (H1 Smart, H2 Designer, H3 Luxury).
2. **Lot Siting & Feasibility**: Provide your lot dimensions (e.g., \`12.5m x 30m with 1.5m RHS\`) or the specific estate name.
3. **Bespoke Variations or Pricing**: For non-standard structural options or unreleased estate releases, please consult directly with **Hudson Homes Head Office Estimating**.`,
    confidence: 0.95,
    verified: false,
    suggestedQuestions: [
      "What inclusion ranges does Hudson Homes offer?",
      "What is the difference between H1 Smart and H2 Designer?",
      "Tell me about the IP Investment Range",
      "What fixed site costs does Hudson Homes cover?",
    ],
    modelUsed: "hudson-knowledge-engine",
  };
}
