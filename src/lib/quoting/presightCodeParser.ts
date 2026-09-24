/**
 * Presight Floorplan Editor Syntax & Master Schedule Diffing Parser
 * 
 * Tokenizes NHC Presight window codes (e.g. SW12.09, AWN18.18, FP, CSD, STACKER, EXT 1020)
 * and compares them against ground-truth Master Window/Door schedules with Inclusion Tier awareness (H1/H2/H3).
 */

import type { DetectedInclusionUpgrade } from "./quoteTypes";

export interface PresightOpeningTag {
  rawTag: string;
  category: "window" | "door" | "special";
  typeCode: "SW" | "AWN" | "FP" | "STACKER" | "CSD" | "EXT_DOOR" | "ROLLER_DOOR" | "UNKNOWN";
  heightMm: number;
  widthMm: number;
  isObscure: boolean;
  locationHint?: string;
}

export interface MasterOpeningDefinition {
  code: string; // e.g. "W1", "D1"
  type: string; // e.g. "AST 1818", "2040x820", "ASDI 2124"
  heightMm: number;
  widthMm: number;
  glazing: string;
}

/**
 * Standard Master Window & Door baseline schedules for Hudson designs.
 */
export const MASTER_OPENING_SCHEDULES: Record<string, {
  windows: Record<string, MasterOpeningDefinition>;
  doors: Record<string, MasterOpeningDefinition>;
}> = {
  "Amber 21": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W3: { code: "W3", type: "AS 1216", heightMm: 1200, widthMm: 1570, glazing: "Luminamist" },
      W4: { code: "W4", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W5: { code: "W5", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W6: { code: "W6", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W7: { code: "W7", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W9: { code: "W9", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "Laundry/Garage", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D3: { code: "D3", type: "ASDI 2124", heightMm: 2100, widthMm: 2410, glazing: "Clear" },
    },
  },
  "Azure 23": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W5: { code: "W5", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W6: { code: "W6", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "Garage Access", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D3: { code: "D3", type: "ASDI 2124", heightMm: 2100, widthMm: 2410, glazing: "Clear" },
    },
  },
};

/**
 * Extracts and tokenizes all Presight opening tags found in text or candidate annotations.
 */
export function parsePresightOpeningTags(rawText: string): PresightOpeningTag[] {
  if (!rawText) return [];
  const tags: PresightOpeningTag[] = [];

  // 1. Sliding Windows: SW12.09, SW18.18, SW1209, etc.
  const swRegex = /\bSW\s*(\d{2})\.?(\d{2})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = swRegex.exec(rawText)) !== null) {
    const h = parseInt(match[1], 10) * 100;
    const w = parseInt(match[2], 10) * 100;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "window",
      typeCode: "SW",
      heightMm: h,
      widthMm: w,
      isObscure: /obp|obscure|privacy/i.test(rawText.slice(Math.max(0, match.index - 30), match.index + 50)),
    });
  }

  // 2. Awning Windows: AWN12.18, AWN18.18, etc.
  const awnRegex = /\bAWN\s*(\d{2})\.?(\d{2})\b/gi;
  while ((match = awnRegex.exec(rawText)) !== null) {
    const h = parseInt(match[1], 10) * 100;
    const w = parseInt(match[2], 10) * 100;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "window",
      typeCode: "AWN",
      heightMm: h,
      widthMm: w,
      isObscure: /obp|obscure|privacy/i.test(rawText.slice(Math.max(0, match.index - 30), match.index + 50)),
    });
  }

  // 3. Fixed Pane Windows: FP06.18, FP12.18, etc.
  const fpRegex = /\bFP\s*(\d{2})\.?(\d{2})\b/gi;
  while ((match = fpRegex.exec(rawText)) !== null) {
    const h = parseInt(match[1], 10) * 100;
    const w = parseInt(match[2], 10) * 100;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "window",
      typeCode: "FP",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 4. Stacker Doors: STACKER 21.36, STACKER SLM, STACKER
  const stackerRegex = /\bSTACKER(?:\s*(\d{2})\.?(\d{2}))?\b/gi;
  while ((match = stackerRegex.exec(rawText)) !== null) {
    const h = match[1] ? parseInt(match[1], 10) * 100 : 2100;
    const w = match[2] ? parseInt(match[2], 10) * 100 : 3600;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "STACKER",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 5. Cavity Sliding Doors: CSD, CSD 820, CSD 920
  const csdRegex = /\bCSD(?:\s*(\d{3,4}))?\b/gi;
  while ((match = csdRegex.exec(rawText)) !== null) {
    const w = match[1] ? parseInt(match[1], 10) : 820;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "CSD",
      heightMm: 2040,
      widthMm: w,
      isObscure: false,
    });
  }

  // 6. Front Entry Doors: EXT 1020, EXT 1200
  const extDoorRegex = /\bEXT\s*(1020|1200)\b/gi;
  while ((match = extDoorRegex.exec(rawText)) !== null) {
    const w = parseInt(match[1], 10);
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "EXT_DOOR",
      heightMm: 2040,
      widthMm: w,
      isObscure: false,
    });
  }

  // 7. Roller Door 21.24
  const rollerRegex = /\b(?:ROLLER\s*DOOR(?:\s*21\.?24)?|RD\s*21\.?24)\b/gi;
  while ((match = rollerRegex.exec(rawText)) !== null) {
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "ROLLER_DOOR",
      heightMm: 2100,
      widthMm: 2400,
      isObscure: false,
    });
  }

  return tags;
}

/**
 * Cross-references parsed Presight tags against the design's Master Schedule
 * taking into account the active Inclusion Tier (H1 Smart vs H2 Comfort vs H3 Luxury).
 */
export function diffOpeningsAgainstMaster(
  parsedTags: PresightOpeningTag[],
  designName: string,
  inclusionTier: "H1" | "H2" | "H3" = "H1"
): DetectedInclusionUpgrade[] {
  const upgrades: DetectedInclusionUpgrade[] = [];
  const isH3 = inclusionTier === "H3";

  for (const tag of parsedTags) {
    if (tag.typeCode === "EXT_DOOR") {
      if (tag.widthMm === 1200) {
        upgrades.push({
          id: "upg_entry_door_1200",
          category: "doors_windows",
          name: "1200mm Grand Architectural Front Entry Door Upgrade",
          description: "1200mm wide architectural feature entrance door ('EXT 1200') replacing standard 820mm painted door.",
          baseline: "Standard 820mm painted entrance door (H1/H2 Baseline)",
          detected: "1200mm wide architectural entrance door ('EXT 1200')",
          unitPrice: 1250,
          quantity: 1,
          subtotal: 1250,
          accepted: true,
          confidence: 0.98,
        });
      } else if (tag.widthMm === 1020) {
        upgrades.push({
          id: "upg_entry_door_1020",
          category: "doors_windows",
          name: "1020mm Wide Architectural Front Entry Door Upgrade",
          description: "1020mm wide feature front entrance door ('EXT 1020') replacing standard 820mm painted door.",
          baseline: "Standard 820mm painted entrance door",
          detected: "1020mm wide feature front entrance door ('EXT 1020')",
          unitPrice: 850,
          quantity: 1,
          subtotal: 850,
          accepted: true,
          confidence: 0.98,
        });
      }
    } else if (tag.typeCode === "STACKER") {
      upgrades.push({
        id: "upg_alfresco_stacker_door",
        category: "doors_windows",
        name: "3-Panel Aluminum Stacker Sliding Door to Alfresco",
        description: "Commercial-grade 3-panel aluminum stacker sliding door replacing standard 2-panel sliding door (ASDI 2124).",
        baseline: "Standard 2-panel 2100mm × 2410mm sliding door (ASDI 2124)",
        detected: `Wide multi-panel aluminum stacking door (${tag.widthMm}mm)`,
        unitPrice: 1850,
        quantity: 1,
        subtotal: 1850,
        accepted: true,
        confidence: 0.98,
      });
    } else if (tag.typeCode === "CSD") {
      upgrades.push({
        id: "upg_cavity_slider",
        category: "doors_windows",
        name: "Architectural Cavity Sliding Pocket Door (CSD)",
        description: "Flush cavity sliding pocket door recessed into stud wall framing to save floor space.",
        baseline: "Standard hinged internal door",
        detected: `Cavity sliding pocket door ('CSD ${tag.widthMm}')`,
        unitPrice: 480,
        quantity: 1,
        subtotal: 480,
        accepted: true,
        confidence: 0.95,
      });
    } else if (tag.typeCode === "ROLLER_DOOR") {
      upgrades.push({
        id: "upg_single_roller_door",
        category: "doors_windows",
        name: "Additional 2100mm × 2400mm Colorbond Single Roller Door",
        description: "Additional 2100mm high × 2400mm wide Colorbond single roller door for 3rd car bay or rear yard access.",
        baseline: "Standard double garage with 1 x double sectional overhead door",
        detected: "Dedicated 2100mm × 2400mm single roller door (Roller Door 21.24) specification",
        unitPrice: 1950,
        quantity: 1,
        subtotal: 1950,
        accepted: true,
        confidence: 0.98,
      });
    } else if (tag.typeCode === "SW" || tag.typeCode === "AWN") {
      // Under H3 tier, taller windows are standard ($0 variation)
      if (isH3 && tag.heightMm > 1200) {
        // H3 standard included ($0)
        continue;
      }
      // If a window is enlarged from standard 1218 to 1818 in a bedroom, flag enlargement
      if (tag.heightMm >= 1800 && tag.widthMm >= 1800) {
        upgrades.push({
          id: `upg_window_enlarge_${tag.heightMm}_${tag.widthMm}`,
          category: "doors_windows",
          name: `Enlarged Architectural Feature Window (${tag.rawTag})`,
          description: `Window enlarged to ${tag.heightMm}mm × ${tag.widthMm}mm feature size.`,
          baseline: "Standard 1200mm high window (AS 1218)",
          detected: `${tag.rawTag} (${tag.heightMm}mm × ${tag.widthMm}mm)`,
          unitPrice: 380,
          quantity: 1,
          subtotal: 380,
          accepted: true,
          confidence: 0.92,
        });
      }
    }
  }

  return upgrades;
}
