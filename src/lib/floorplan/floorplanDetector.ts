import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import { HUDSON_FLOORPLANS, type FloorplanRecord } from "@/components/flyer/floorplans.data";
import { HUDSON_CAD_REGISTRY } from "@/components/flyer/floorplanVisionEngine";
import { findFloorplanUrl } from "@/lib/tender/tenderStorage";

import {
  HUDSON_STANDARD_AREAS,
  getStandardAreaBreakdown,
  calculateModifiedFloorplanPricing,
  getHousingTypeForDesign,
} from "@/lib/quoting/quoteEngine";

export interface ExtractedAreaTable {
  livingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2?: number;
  alfrescoM2?: number;
  porchM2?: number;
  balconyM2?: number;
  totalM2?: number;
}

export interface DetectedFloorplan {
  matchedDesignName: string;
  family: string;
  size: number;
  housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
  isHudsonDesign: boolean;
  hasSqmVariance: boolean;
  totalM2: number;
  standardTotalM2: number;
  deltaM2: number;
  costAdjustment: number;
  basePriceH2: number;
  basePriceH1: number;
  basePriceHBS: number;
  effectiveBasePrice: number;
  priceRow?: PriceRow;
  floorplanRecord?: FloorplanRecord;
  floorplanUrl: string;
  widthM: number;
  lengthM: number;
  standardAreas: {
    livingM2?: number;
    groundLivingM2?: number;
    firstLivingM2?: number;
    garageM2?: number;
    alfrescoM2?: number;
    porchM2?: number;
    balconyM2?: number;
    totalM2?: number;
  };
  roomAreas: {
    livingM2: number;
    groundLivingM2?: number;
    firstLivingM2?: number;
    garageM2: number;
    alfrescoM2: number;
    porchM2: number;
    balconyM2?: number;
    totalM2?: number;
  };
  confidence: number;
  rawMatchedText?: string;
  extractedTable?: ExtractedAreaTable;
}

const ALL_PRICE_ROWS: { row: PriceRow; housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living" }[] = [
  ...SINGLE_STOREY_PRICES.map((r) => ({ row: r, housingType: "Single Storey" as const })),
  ...DOUBLE_STOREY_PRICES.map((r) => ({ row: r, housingType: "Double Storey" as const })),
  ...SPLIT_LEVEL_PRICES.map((r) => ({ row: r, housingType: "Split Level" as const })),
  ...DUAL_OC_PRICES.map((r) => ({ row: r, housingType: "Dual Living" as const })),
];

export function extractAreaTableFromText(rawText: string): ExtractedAreaTable | null {
  if (!rawText) return null;
  const table: ExtractedAreaTable = {};
  let foundAny = false;

  const patterns: { key: keyof ExtractedAreaTable; regex: RegExp }[] = [
    {
      key: "groundLivingM2",
      regex: /(?:ground(?:\s+floor)?|lower)(?:\s+living|\s+area)?\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "firstLivingM2",
      regex: /(?:first(?:\s+floor)?|upper)(?:\s+living|\s+area)?\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "livingM2",
      regex: /(?:^|[^\w])living(?:\s+area)?\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "garageM2",
      regex: /(?:double\s*)?garage(?:\s+area)?\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "alfrescoM2",
      regex: /(?:alfresco|outdoor(?:\s+living)?|patio)\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "porchM2",
      regex: /(?:entry\s*)?porch\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "balconyM2",
      regex: /balcony\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      key: "totalM2",
      regex: /(?:total(?:\s+(?:floor\s*)?area)?|grand\s*total)\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
  ];

  for (const { key, regex } of patterns) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val < 1000) {
        table[key] = Math.round(val * 100) / 100;
        foundAny = true;
      }
    }
  }

  return foundAny ? table : null;
}

export function findHudsonModelByName(name?: string): { row: PriceRow; housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living" } | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  
  // 1. Exact match
  for (const item of ALL_PRICE_ROWS) {
    if (item.row.name.toLowerCase() === clean) {
      return item;
    }
  }

  // 2. Fuzzy match (e.g. "Amber 21 (Modified Concept)" or "Amber 21 - Rev A")
  for (const item of ALL_PRICE_ROWS) {
    const parts = item.row.name.toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const family = parts[0];
      const size = parts[1];
      if (clean.includes(family) && clean.includes(size)) {
        return item;
      }
    }
  }

  return null;
}

export function isKnownHudsonDesign(name?: string): boolean {
  return findHudsonModelByName(name) !== null;
}

export function detectFloorplanFromText(rawText: string, filename?: string): DetectedFloorplan | null {
  const combinedText = `${filename || ""} ${rawText}`.replace(/[\r\n\t]+/g, " ");
  const lower = combinedText.toLowerCase();

  let bestMatch: DetectedFloorplan | null = null;
  let highestScore = 0;

  for (const { row, housingType } of ALL_PRICE_ROWS) {
    const designName = row.name;
    const nameLower = designName.toLowerCase();
    const parts = nameLower.split(/\s+/);
    const familyName = parts[0] || "";
    const sizeNumber = parts[1] || "";

    let score = 0;

    const exactRegex = new RegExp(`\\b${escapeRegex(nameLower)}\\b`, "i");
    if (exactRegex.test(lower)) {
      score += 100;
    } else if (familyName && sizeNumber) {
      const flexibleRegex = new RegExp(`\\b${escapeRegex(familyName)}[\\s_\\-]*${escapeRegex(sizeNumber)}\\b`, "i");
      if (flexibleRegex.test(lower)) {
        score += 85;
      } else {
        const hasFamily = new RegExp(`\\b${escapeRegex(familyName)}\\b`, "i").test(lower);
        const hasSize = new RegExp(`\\b${escapeRegex(sizeNumber)}\\b`, "i").test(lower);
        if (hasFamily && hasSize) {
          score += 60;
        } else if (hasFamily) {
          score += 20;
        }
      }
    }

    if (row.m2 > 0) {
      const m2Str = row.m2.toFixed(2);
      const m2Short = row.m2.toFixed(1);
      if (lower.includes(m2Str) || lower.includes(m2Short)) {
        score += 30;
      }
    }

    if (score > highestScore && score >= 50) {
      highestScore = score;

      const cad = HUDSON_CAD_REGISTRY[designName];
      const planRec = HUDSON_FLOORPLANS.find(
        (p) => p.label.toLowerCase() === nameLower || p.design.toLowerCase() === familyName
      );
      const standardUrl = findFloorplanUrl(designName) || planRec?.url || "";

      const standardTotalM2 = row.m2 || 200;
      const stdAreas = getStandardAreaBreakdown(designName, housingType, standardTotalM2);

      // Extract area table from text if present
      const extractedTable = extractAreaTableFromText(rawText);

      // Check for variances
      let livingM2 = extractedTable?.livingM2 || extractedTable?.groundLivingM2 || cad?.livingM2 || stdAreas.livingM2 || (standardTotalM2 > 230 ? 160 : 135);
      let groundLivingM2 = extractedTable?.groundLivingM2 ?? stdAreas.groundLivingM2;
      let firstLivingM2 = extractedTable?.firstLivingM2 ?? stdAreas.firstLivingM2;
      let garageM2 = extractedTable?.garageM2 || cad?.garageM2 || stdAreas.garageM2 || (standardTotalM2 > 230 ? 38.0 : 34.0);
      let alfrescoM2 = extractedTable?.alfrescoM2 || cad?.alfrescoM2 || stdAreas.alfrescoM2 || 14.5;
      let porchM2 = extractedTable?.porchM2 || cad?.porchM2 || stdAreas.porchM2 || 3.0;
      let balconyM2 = extractedTable?.balconyM2 ?? stdAreas.balconyM2;

      let effectiveTotalM2 = extractedTable?.totalM2 || (livingM2 + garageM2 + alfrescoM2 + porchM2 + (balconyM2 || 0));
      effectiveTotalM2 = Math.round(effectiveTotalM2 * 100) / 100;

      // Determine if there is an area variance from standard Hudson specs
      const isVariance =
        Math.abs(effectiveTotalM2 - standardTotalM2) > 0.1 ||
        (extractedTable?.livingM2 !== undefined && Math.abs(extractedTable.livingM2 - (stdAreas.livingM2 || 0)) > 0.1) ||
        (extractedTable?.garageM2 !== undefined && Math.abs(extractedTable.garageM2 - (stdAreas.garageM2 || 0)) > 0.1) ||
        (extractedTable?.alfrescoM2 !== undefined && Math.abs(extractedTable.alfrescoM2 - (stdAreas.alfrescoM2 || 0)) > 0.1);

      const widthM = cad?.width || (standardTotalM2 > 240 ? 12.5 : 11.2);
      const lengthM = cad?.length || (standardTotalM2 > 240 ? 22.0 : 19.8);

      const basePriceH2 = row.h2 || row.h1 || row.hbs || 0;
      const basePriceH1 = row.h1 || row.hbs || 0;
      const basePriceHBS = row.hbs || 0;

      let costAdjustment = 0;
      let effectiveBasePrice = basePriceH2;

      if (isVariance) {
        const modCalc = calculateModifiedFloorplanPricing({
          housingType,
          designName,
          standardDesignM2: standardTotalM2,
          standardBasePrice: basePriceH2,
          standardAreas: stdAreas,
          modifiedAreas: {
            livingM2,
            groundLivingM2,
            firstLivingM2,
            garageM2,
            alfrescoM2,
            porchM2,
            balconyM2,
            totalM2: effectiveTotalM2,
          },
        } as any);
        costAdjustment = modCalc.totalCostAdjustment;
        effectiveBasePrice = modCalc.modifiedBasePrice;
      }

      bestMatch = {
        matchedDesignName: designName,
        family: familyName.charAt(0).toUpperCase() + familyName.slice(1),
        size: parseInt(sizeNumber, 10) || Math.round(standardTotalM2 / 9.29),
        housingType,
        isHudsonDesign: true,
        hasSqmVariance: isVariance,
        totalM2: effectiveTotalM2,
        standardTotalM2,
        deltaM2: Math.round((effectiveTotalM2 - standardTotalM2) * 100) / 100,
        costAdjustment,
        basePriceH2,
        basePriceH1,
        basePriceHBS,
        effectiveBasePrice,
        priceRow: row,
        floorplanRecord: planRec,
        floorplanUrl: standardUrl,
        widthM,
        lengthM,
        standardAreas: stdAreas,
        roomAreas: {
          livingM2: Math.round(livingM2 * 10) / 10,
          groundLivingM2: groundLivingM2 ? Math.round(groundLivingM2 * 10) / 10 : undefined,
          firstLivingM2: firstLivingM2 ? Math.round(firstLivingM2 * 10) / 10 : undefined,
          garageM2: Math.round(garageM2 * 10) / 10,
          alfrescoM2: Math.round(alfrescoM2 * 10) / 10,
          porchM2: Math.round(porchM2 * 10) / 10,
          balconyM2: balconyM2 ? Math.round(balconyM2 * 10) / 10 : undefined,
          totalM2: effectiveTotalM2,
        },
        confidence: Math.min(100, score),
        rawMatchedText: `Detected ${designName} (${housingType}, ${effectiveTotalM2} m²${isVariance ? " [Modified]" : ""}) with ${score}% confidence`,
        extractedTable: extractedTable || undefined,
      };
    }
  }

  return bestMatch;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
