/**
 * Presight Floorplan Editor Syntax & Master Schedule Diffing Parser
 * 
 * Tokenizes NHC Presight window codes (e.g. SW12.09, AWN18.18, FP, CSD, STACKER, EXT 1020)
 * and compares them against ground-truth Master Window/Door schedules with Inclusion Tier awareness (H1/H2/H3).
 */

import type { DetectedInclusionUpgrade, OpeningReplacementItem } from "./quoteTypes";
import { calculateOpeningReplacement } from "./conceptFloorplanEditorBridge";

export interface PresightOpeningTag {
  rawTag: string;
  category: "window" | "door" | "special";
  typeCode: "SW" | "AWN" | "FP" | "PW" | "SD" | "STACKER" | "CSD" | "EXT_DOOR" | "EXT_GARAGE_DOOR" | "ROLLER_DOOR" | "UNKNOWN";
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
  "Carmine 23": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W5: { code: "W5", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W6: { code: "W6", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W9: { code: "W9", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W10: { code: "W10", type: "AS 1216", heightMm: 1200, widthMm: 1570, glazing: "Luminamist" },
      W11: { code: "W11", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "ASDI 2122", heightMm: 2100, widthMm: 2170, glazing: "Clear" },
      D3: { code: "D3", type: "Laundry/Garage", heightMm: 2040, widthMm: 820, glazing: "Solid" },
    },
  },
  "Carmine 23 MK2": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W5: { code: "W5", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W6: { code: "W6", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W9: { code: "W9", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W10: { code: "W10", type: "AS 1216", heightMm: 1200, widthMm: 1570, glazing: "Luminamist" },
      W11: { code: "W11", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "ASDI 2122", heightMm: 2100, widthMm: 2170, glazing: "Clear" },
      D3: { code: "D3", type: "Laundry/Garage", heightMm: 2040, widthMm: 820, glazing: "Solid" },
    },
  },
  "Carmine 23 MKII": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W5: { code: "W5", type: "AST 1809", heightMm: 1800, widthMm: 850, glazing: "Clear" },
      W6: { code: "W6", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W9: { code: "W9", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W10: { code: "W10", type: "AS 1216", heightMm: 1200, widthMm: 1570, glazing: "Luminamist" },
      W11: { code: "W11", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "ASDI 2122", heightMm: 2100, widthMm: 2170, glazing: "Clear" },
      D3: { code: "D3", type: "Laundry/Garage", heightMm: 2040, widthMm: 820, glazing: "Solid" },
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
  "Coral 21": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W5: { code: "W5", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W6: { code: "W6", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "Garage Internal Access", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D3: { code: "D3", type: "ASDI 2124", heightMm: 2100, widthMm: 2410, glazing: "Clear" },
    },
  },
  "Azure 25": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W3: { code: "W3", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W4: { code: "W4", type: "AS 0906", heightMm: 860, widthMm: 610, glazing: "Luminamist" },
      W5: { code: "W5", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W6: { code: "W6", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W7: { code: "W7", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W8: { code: "W8", type: "AS 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "Garage Internal Access", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D3: { code: "D3", type: "ASDI 2124", heightMm: 2100, widthMm: 2410, glazing: "Clear" },
    },
  },
  "Crimson 24": {
    windows: {
      W1: { code: "W1", type: "AST 1818", heightMm: 1800, widthMm: 1810, glazing: "Clear" },
      W2: { code: "W2", type: "AS 1818", heightMm: 860, widthMm: 610, glazing: "Clear" },
      W3: { code: "W3", type: "AS 1806", heightMm: 1800, widthMm: 610, glazing: "Clear" },
      W4: { code: "W4", type: "AS 0906", heightMm: 1800, widthMm: 610, glazing: "Clear" },
      W5: { code: "W5", type: "AAT 1816", heightMm: 1800, widthMm: 1570, glazing: "Clear" },
      W6: { code: "W6", type: "AS 1806", heightMm: 1800, widthMm: 2170, glazing: "Clear" },
      W7: { code: "W7", type: "AAT 1216", heightMm: 1200, widthMm: 1570, glazing: "Clear" },
      W8: { code: "W8", type: "AS 1806", heightMm: 860, widthMm: 610, glazing: "Clear" },
      W9: { code: "W9", type: "AST 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W10: { code: "W10", type: "AS 1816", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
      W11: { code: "W11", type: "AST 1218", heightMm: 1200, widthMm: 1810, glazing: "Clear" },
    },
    doors: {
      D1: { code: "D1", type: "Front Door", heightMm: 2040, widthMm: 820, glazing: "Solid" },
      D2: { code: "D2", type: "Laundry/Garage", heightMm: 2040, widthMm: 820, glazing: "Solid" },
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

  // 3. Picture / Splashback Windows: PW06.30, PW 06.24, PW0630, etc.
  const pwRegex = /\bPW\s*(\d{2})\.?(\d{2})\b/gi;
  while ((match = pwRegex.exec(rawText)) !== null) {
    const h = parseInt(match[1], 10) * 100;
    const w = parseInt(match[2], 10) * 100;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "window",
      typeCode: "PW",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 4. Sliding Glass Doors: SD 21.27, SD 21.24, 21-21SD, 21-24SD, 21.21SD, 2121SD, etc.
  const sdRegex = /\b(?:SD\s*(\d{2})\.?(\d{2})|(\d{2})[-.]?(\d{2})\s*SD)\b/gi;
  while ((match = sdRegex.exec(rawText)) !== null) {
    const rawH = match[1] || match[3];
    const rawW = match[2] || match[4];
    const h = parseInt(rawH, 10) * 100;
    const w = parseInt(rawW, 10) * 100;
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "SD",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 5. Fixed Pane Windows: FP06.18, FP12.18, etc.
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

  // 0. Door Schedule Table Parser (Row-by-row or transposed CAD schedules e.g. Sheet 8)
  const rowTableRegex = /\b(D\d+)[\t\s]+([^\t\n]+?)[\t\s]+([\d,]+)[\t\s]+([\d,]+)[\t\s]+([^\t\n]+)/gi;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowTableRegex.exec(rawText)) !== null) {
    const doorNo = rowM[1].toUpperCase();
    const zone = rowM[2].trim().toUpperCase();
    const height = parseInt(rowM[3].replace(/,/g, ""), 10);
    const width = parseInt(rowM[4].replace(/,/g, ""), 10);
    const doorType = rowM[5].trim().toUpperCase();

    if (doorNo === "D1" && (width === 1020 || width === 1200)) {
      tags.push({
        rawTag: `EXT ${width}`,
        category: "door",
        typeCode: "EXT_DOOR",
        heightMm: height || 2040,
        widthMm: width,
        isObscure: false,
        locationHint: `Front Entry Door (${doorNo} - ${zone})`,
      });
    } else if (/STACKER/i.test(doorType) || ((doorNo === "D2" || doorNo === "D3") && width >= 2600 && width <= 3200)) {
      const nomW = width >= 2900 ? "30" : "27";
      const nomH = height >= 2300 ? "24" : "21";
      tags.push({
        rawTag: `STACKER ${nomH}-${nomW}`,
        category: "door",
        typeCode: "STACKER",
        heightMm: height || 2100,
        widthMm: parseInt(nomW, 10) * 100,
        isObscure: false,
        locationHint: `${zone} Stacker Door (${doorNo})`,
      });
    }
  }

  // 6. Stacker Doors: STACKER 21.36, 21-36 STACKER, STACKER, STACKER SLM, 21-30 542 STACKER, 21/27 542 STACKER, 24-30, 24-27
  const stackerRegex = /\b(?:STACKER(?:\s*(\d{2})[\s\.\-\/]?(\d{2}))?|(\d{2})[\s\.\-\/]+(\d{2})(?:[^\w\n\r]*\d{3})?[^\w\n\r]*STACKER)\b/gi;
  while ((match = stackerRegex.exec(rawText)) !== null) {
    const rawH = match[1] || match[3];
    const rawW = match[2] || match[4];
    const h = rawH ? parseInt(rawH, 10) * 100 : 2100;
    const w = rawW ? parseInt(rawW, 10) * 100 : 3000;
    const tagCode = rawH && rawW ? `STACKER ${rawH}-${rawW}` : match[0].toUpperCase();
    tags.push({
      rawTag: tagCode,
      category: "door",
      typeCode: "STACKER",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 7. Cavity Sliding Doors: CSD, CSD 820, CSD 920
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

  // 8. Front Entry Doors: EXT 1020, EXT 1200, Entry 1,020, Entry 1020, 1,020 D1, etc.
  const extDoorRegex = /\b(?:EXT\s*(1020|1200)|ENTRY[\s\r\n]*[:\s-]?[\s\r\n]*(1[,.]?020|1[,.]?200)|(1[,.]?020|1[,.]?200)[\s\r\n]*(?:ENTRY|FRONT\s*DOOR|D1)|D1[\s\r\n]*(1[,.]?020|1[,.]?200))\b/gi;
  while ((match = extDoorRegex.exec(rawText)) !== null) {
    const rawVal = (match[1] || match[2] || match[3] || match[4] || "").replace(/[,.]/g, "");
    const w = parseInt(rawVal, 10);
    if (w === 1020 || w === 1200) {
      tags.push({
        rawTag: `EXT ${w}`,
        category: "door",
        typeCode: "EXT_DOOR",
        heightMm: 2040,
        widthMm: w,
        isObscure: false,
      });
    }
  }

  // 9. Garage External Personal Access Door: EXT 820, EXT 920
  const extGarageRegex = /\bEXT\s*(820|920)\b/gi;
  while ((match = extGarageRegex.exec(rawText)) !== null) {
    const w = parseInt(match[1], 10);
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "EXT_GARAGE_DOOR",
      heightMm: 2040,
      widthMm: w,
      isObscure: false,
    });
  }

  // 10. Roller Door & Sectional Panel Lift Doors: PANEL LIFT 21.48, PANEL DOOR 21.48, etc.
  const rollerRegex = /\b(?:ROLLER\s*DOOR(?:\s*(?:21\.?48|21\.?24))?|RD\s*(?:21\.?48|21\.?24)|PANEL\s*(?:LIFT|DOOR)(?:\s*(?:21\.?48|21\.?24))?)\b/gi;
  while ((match = rollerRegex.exec(rawText)) !== null) {
    const isDouble = /48/i.test(match[0]);
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "ROLLER_DOOR",
      heightMm: 2100,
      widthMm: isDouble ? 4800 : 2400,
      isObscure: false,
    });
  }

  // 11. Corner Stacker & Bifold Doors
  const bifoldRegex = /\b(?:CORNER\s*STACKER|STACKER\s*CORNER|BIFOLD(?:\s*21[-.]?24)?)\b/gi;
  while ((match = bifoldRegex.exec(rawText)) !== null) {
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "door",
      typeCode: "STACKER",
      heightMm: 2100,
      widthMm: 2400,
      isObscure: false,
    });
  }

  // 12. Barn Door / Face Hung
  const barnRegex = /\b(?:BARN\s*(?:DOOR\s*)?(\d{3,4})?|FACE[- ]HUNG(?:\s*820)?)\b/gi;
  while ((match = barnRegex.exec(rawText)) !== null) {
    const w = match[1] ? parseInt(match[1], 10) : 820;
    tags.push({
      rawTag: w >= 1000 ? `BARN ${w}` : match[0].toUpperCase(),
      category: "door",
      typeCode: "CSD",
      heightMm: 2040,
      widthMm: w,
      isObscure: false,
    });
  }

  // 13. Fixed Picture Windows: FW 06.12, FW 0612, etc.
  const fwRegex = /\bFW\s*(\d{2})\.?(\d{2})\b/gi;
  while ((match = fwRegex.exec(rawText)) !== null) {
    const h = parseInt(match[1], 10) * 100;
    const w = parseInt(match[2], 10) * 100;
    tags.push({
      rawTag: `FW ${match[1]}.${match[2]}`,
      category: "window",
      typeCode: "FP",
      heightMm: h,
      widthMm: w,
      isObscure: false,
    });
  }

  // 13. Corner Window
  const cornerWinRegex = /\b(?:CORNER\s*WINDOW|CW\s*12\.?18)\b/gi;
  while ((match = cornerWinRegex.exec(rawText)) !== null) {
    tags.push({
      rawTag: match[0].toUpperCase(),
      category: "window",
      typeCode: "SW",
      heightMm: 1200,
      widthMm: 1810,
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
    } else if (tag.typeCode === "EXT_GARAGE_DOOR") {
      upgrades.push({
        id: "upg_garage_access_door",
        category: "doors_windows",
        name: `External Weatherproof Personal Access Door to Garage (${tag.rawTag})`,
        description: `Solid external weatherproof personal access door (2040mm × ${tag.widthMm}mm) fitted to garage with lockset and weatherseal.`,
        baseline: "Solid external garage wall without secondary pedestrian door",
        detected: `${tag.rawTag} external personal access door`,
        unitPrice: 950,
        quantity: 1,
        subtotal: 950,
        accepted: true,
        confidence: 0.98,
      });
    } else if (tag.typeCode === "SD") {
      upgrades.push({
        id: "upg_window_to_sliding_door",
        category: "doors_windows",
        name: `Window Upgraded to Sliding Glass Door (${tag.rawTag})`,
        description: `Convert standard window opening to ${tag.heightMm}mm × ${tag.widthMm}mm powder-coated aluminum sliding glass door providing direct access onto Alfresco.`,
        baseline: "Standard residential window opening",
        detected: `${tag.rawTag} (${tag.heightMm}mm × ${tag.widthMm}mm) sliding glass door`,
        unitPrice: 1650,
        quantity: 1,
        subtotal: 1650,
        accepted: true,
        confidence: 0.98,
      });
    } else if (tag.typeCode === "PW") {
      upgrades.push({
        id: "upg_kitchen_splashback_window",
        category: "doors_windows",
        name: `Kitchen Picture Splashback Window (${tag.rawTag})`,
        description: `Extended panoramic fixed glass picture window splashback (${tag.heightMm}mm × ${tag.widthMm}mm) behind cooktop.`,
        baseline: "Standard kitchen splashback window",
        detected: `${tag.rawTag} (${tag.heightMm}mm × ${tag.widthMm}mm) picture splashback window`,
        unitPrice: 720,
        quantity: 1,
        subtotal: 720,
        accepted: true,
        confidence: 0.98,
      });
    } else if (tag.typeCode === "STACKER") {
      const dimLabel = tag.widthMm ? ` (${tag.widthMm}mm)` : "";
      upgrades.push({
        id: `upg_alfresco_stacker_door_${tag.widthMm || "std"}`,
        category: "doors_windows",
        name: `3-Panel Aluminum Stacker Sliding Door to Alfresco${dimLabel}`,
        description: `Commercial-grade 3-panel aluminum stacker sliding door (${tag.rawTag}) replacing standard 2-panel sliding door (ASDI 2124).`,
        baseline: "Standard 2-panel 2100mm × 2410mm sliding door (ASDI 2124)",
        detected: `Wide multi-panel aluminum stacking door (${tag.rawTag})`,
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
        continue;
      }
      // If a window is enlarged from standard 1218 (1200 x 1810) to wider/taller format (e.g. SW 12.24)
      if (tag.widthMm > 1850 || tag.heightMm > 1250) {
        upgrades.push({
          id: `upg_window_enlarge_${tag.heightMm}_${tag.widthMm}`,
          category: "doors_windows",
          name: `Enlarged Window Upgrade (${tag.rawTag})`,
          description: `Window enlarged to ${tag.heightMm}mm × ${tag.widthMm}mm format with reinforced structural lintel.`,
          baseline: "Standard 1200mm × 1810mm residential window",
          detected: `${tag.rawTag} (${tag.heightMm}mm × ${tag.widthMm}mm)`,
          unitPrice: 480,
          quantity: 1,
          subtotal: 480,
          accepted: true,
          confidence: 0.95,
        });
      }
    }
  }

  return upgrades;
}

/**
 * Parses tags and generates detailed opening replacement records with exact 80% trade credit calculations.
 * Used by the modified plan review breakdown.
 */
export function diffOpeningsWithReplacementCredits(
  parsedTags: PresightOpeningTag[],
  designName?: string
): OpeningReplacementItem[] {
  const replacements: OpeningReplacementItem[] = [];
  const seenCodes = new Set<string>();

  // Pre-filter: Check presence of specific tags to avoid duplicates
  const rawList = parsedTags.map((t) => t.rawTag.toUpperCase().trim());
  const hasSpecificStacker = rawList.some((r) => /STACKER/.test(r) && /\d{2}/.test(r));
  const hasRollerDoor = rawList.some((r) => /ROLLER\s*DOOR|RD\s*21\.?48|PANEL\s*LIFT/.test(r));
  const hasBarn1200 = rawList.some((r) => /BARN\s*1200|1200\s*BARN/.test(r));

  for (const tag of parsedTags) {
    const raw = tag.rawTag.trim();
    if (!raw || /standard|unannotated/i.test(raw)) continue;

    const upper = raw.toUpperCase();

    // 1. If a specific dimensioned stacker exists, drop generic or spurious un-dimensioned stacker tags (e.g. STACKER, STACKER SLM)
    if (hasSpecificStacker && (upper === "STACKER" || upper === "STACKER SLM" || upper === "STACKER DOOR")) {
      continue;
    }

    // 2. Drop spurious or misread 06.18 tags
    if (/0?6[-.]?18/i.test(upper)) {
      continue;
    }

    // 3. If a double garage roller door 21.48 is present, drop false "STACKER 21-48"
    if (hasRollerDoor && /STACKER\s*(?:21[-.]?48|48)/.test(upper)) {
      continue;
    }

    // 4. Drop BARN doors from perimeter opening replacements (handled as internal room layout variation)
    if (/BARN/i.test(upper)) {
      continue;
    }

    // 4b. Exclude standard double garage door (e.g. 4810mm panel lift, standard panel lift) from opening replacement charges
    if (/PANEL\s*LIFT|ROLLER\s*DOOR\s*21\.?48|RD\s*21\.?48/i.test(upper) || /4810|4800|5400|DOUBLE\s*GARAGE/i.test(upper)) {
      continue;
    }

    // 5. Normalize code for deduplication
    const normKey = upper.replace(/[-.\s]+/g, " ").trim();
    if (seenCodes.has(normKey)) continue;
    seenCodes.add(normKey);

    const rep = calculateOpeningReplacement(raw, tag.locationHint);
    const absCredit = Math.abs(rep.creditAmount || Math.round(rep.replacedItemBaselineCost * 0.8));
    rep.creditAmount = -absCredit;
    rep.netCost = rep.newItemCost - absCredit;

    replacements.push(rep);
  }

  return replacements;
}
