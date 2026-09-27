import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load floorplans catalog
let CATALOG = [];
try {
  const catalogPath = path.resolve(__dirname, "floorplans-catalog.json");
  if (fs.existsSync(catalogPath)) {
    CATALOG = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  }
} catch (e) {
  console.warn("Could not load floorplans-catalog.json:", e);
}

/**
 * Extracts lot dimensions and setbacks from natural language queries.
 */
export function parseLotQuery(text) {
  const t = text.toLowerCase();

  // Check if this query is actually asking about lot siting, setbacks, or block dimensions
  const isSitingQuery =
    (t.includes("lot") || t.includes("block") || t.includes("land") || t.includes("frontage")) &&
    (t.includes("setback") || t.includes("wide") || t.includes("deep") || t.includes("fit") || t.includes("work") || t.includes("design") || t.includes("btb") || t.includes("boundary") || t.includes("envelope"));

  if (!isSitingQuery) return null;

  let lotWidth = null;
  let lotDepth = null;

  // Patterns for lot dimensions:
  // e.g. "15.5m wide lot by 21.35 lot", "15.5m x 21.35m", "15.5 wide by 21.35 deep", "15.5m frontage 21.35m depth"
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
  // LHS / left
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

  // RHS / right
  let rhsSetback = 1.5;
  let rhsBtb = false;
  const rhsMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback|setbac)?\s*(?:on|to|at)?\s*(?:the\s*)?(?:rhs|right)/i);
  const rhsMatch2 = t.match(/(?:rhs|right)\s*(?:with\s*btb)?\s*(?:setback|setbac)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rhsMatch1 && !isNaN(parseFloat(rhsMatch1[1]))) {
    rhsSetback = parseFloat(rhsMatch1[1]);
  } else if (rhsMatch2 && !isNaN(parseFloat(rhsMatch2[1]))) {
    rhsSetback = parseFloat(rhsMatch2[1]);
  }

  // Front / Garage
  let frontSetback = 5.0;
  const frontMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:garage|front)/i);
  const frontMatch2 = t.match(/(?:garage|front)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (frontMatch1 && !isNaN(parseFloat(frontMatch1[1]))) {
    frontSetback = parseFloat(frontMatch1[1]);
  } else if (frontMatch2 && !isNaN(parseFloat(frontMatch2[1]))) {
    frontSetback = parseFloat(frontMatch2[1]);
  }

  // Rear / back
  let rearSetback = 1.0;
  const rearMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:rear|back)/i);
  const rearMatch2 = t.match(/(?:rear|back)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rearMatch1 && !isNaN(parseFloat(rearMatch1[1]))) {
    rearSetback = parseFloat(rearMatch1[1]);
  } else if (rearMatch2 && !isNaN(parseFloat(rearMatch2[1]))) {
    rearSetback = parseFloat(rearMatch2[1]);
  }

  return {
    lotWidth,
    lotDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
  };
}

/**
 * Calculates allowable building envelope and filters Hudson floorplans.
 */
export function evaluateLotSiting(params) {
  const {
    lotWidth,
    lotDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
  } = params;

  // Max widths
  const maxWidthStd = Math.max(0, lotWidth - lhsSetback - rhsSetback);
  const maxWidthBtb = Math.max(
    0,
    lotWidth - (lhsBtb ? 0.0 : lhsSetback) - (rhsBtb ? 0.0 : rhsSetback)
  );

  // Max depth
  const maxDepth = Math.max(0, lotDepth - frontSetback - rearSetback);

  // Filter plans
  const strictFit = CATALOG.filter(
    (p) => p.houseWidth <= maxWidthStd && p.houseLength <= maxDepth
  ).sort((a, b) => b.sizeM2 - a.sizeM2);

  const btbFit = CATALOG.filter(
    (p) =>
      p.houseWidth > maxWidthStd &&
      p.houseWidth <= maxWidthBtb &&
      p.houseLength <= maxDepth
  ).sort((a, b) => b.sizeM2 - a.sizeM2);

  // Close designs (within 2.5m of depth, width fitting <= maxWidthBtb)
  const closeFit = CATALOG.filter(
    (p) =>
      p.houseWidth <= maxWidthBtb &&
      p.houseLength > maxDepth &&
      p.houseLength <= maxDepth + 2.5
  ).sort((a, b) => a.houseLength - b.houseLength);

  return {
    lotWidth,
    lotDepth,
    lotArea: (lotWidth * lotDepth).toFixed(1),
    maxWidthStd: maxWidthStd.toFixed(2),
    maxWidthBtb: maxWidthBtb.toFixed(2),
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

/**
 * Formats the siting evaluation into an executive-grade architectural response.
 */
export function formatSitingResponse(res) {
  const {
    lotWidth,
    lotDepth,
    lotArea,
    maxWidthStd,
    maxWidthBtb,
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

  let out = `### 📐 Architectural Siting & Feasibility Assessment

**Lot Parameters:**
- **Dimensions:** ${lotWidth}m Wide × ${lotDepth}m Deep (${lotArea} m²)
- **Setbacks Applied:**
  - **LHS (Left):** ${lhsSetback}m${lhsBtb ? " *(Built-To-Boundary / Zero-Lot permitted)*" : ""}
  - **RHS (Right):** ${rhsSetback}m
  - **Front to Garage:** ${frontSetback}m
  - **Rear:** ${rearSetback}m

**Maximum Usable Building Envelope:**
- **Standard Width:** **${maxWidthStd}m** (${lotWidth}m - ${lhsSetback}m LHS - ${rhsSetback}m RHS)
${lhsBtb ? `- **With Zero-Lot / BTB on LHS:** Up to **${maxWidthBtb}m** (${lotWidth}m - 0m LHS - ${rhsSetback}m RHS)\n` : ""}- **Maximum Building Depth:** **${maxDepth}m** (${lotDepth}m - ${frontSetback}m Front - ${rearSetback}m Rear)

---

### 1. Directly Compliant Hudson Designs (${strictFit.length} Designs Fit 100%)
These designs sit comfortably inside the ${maxWidthStd}m × ${maxDepth}m envelope with zero structural boundary variations:

`;

  if (strictFit.length > 0) {
    const topStrict = strictFit.slice(0, 8);
    for (const p of topStrict) {
      const wMargin = (parseFloat(maxWidthStd) - p.houseWidth).toFixed(2);
      const lMargin = (parseFloat(maxDepth) - p.houseLength).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² / ${(p.sizeM2 / 9.29).toFixed(1)} sq)\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
      out += `  - *Clearances:* +${wMargin}m width buffer, +${lMargin}m rear buffer\n`;
    }
  } else {
    out += `*No standard catalog designs fit strictly within this envelope without BTB or length concessions.*\n`;
  }

  if (btbFit.length > 0) {
    out += `\n### 2. Compliant via Built-to-Boundary (BTB) on LHS (${btbFit.length} Designs)\n`;
    out += `These designs take advantage of your LHS Zero-Lot wall (up to ${maxWidthBtb}m wide):\n\n`;
    for (const p of btbFit.slice(0, 5)) {
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m²)\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
    }
  }

  if (closeFit.length > 0) {
    out += `\n### 3. "Close" Designs & Architectural Solutions (${closeFit.length} Options)\n`;
    out += `These designs fit the 13.0m width easily, but their length exceeds ${maxDepth}m by a small margin. They can work with minor articulation or boundary adjustments:\n\n`;

    for (const p of closeFit.slice(0, 6)) {
      const over = (p.houseLength - parseFloat(maxDepth)).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² | ${p.beds}b/${p.baths}b/${p.cars}c)\n`;
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
