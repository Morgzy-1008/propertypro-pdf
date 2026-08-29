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

export interface DetectedFloorplan {
  matchedDesignName: string;
  family: string;
  size: number;
  housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
  totalM2: number;
  basePriceH2: number;
  basePriceH1: number;
  basePriceHBS: number;
  priceRow: PriceRow;
  floorplanRecord?: FloorplanRecord;
  floorplanUrl: string;
  widthM: number;
  lengthM: number;
  roomAreas: {
    livingM2: number;
    garageM2: number;
    alfrescoM2: number;
    porchM2: number;
    balconyM2?: number;
  };
  confidence: number;
  rawMatchedText?: string;
}

const ALL_PRICE_ROWS: { row: PriceRow; housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living" }[] = [
  ...SINGLE_STOREY_PRICES.map((r) => ({ row: r, housingType: "Single Storey" as const })),
  ...DOUBLE_STOREY_PRICES.map((r) => ({ row: r, housingType: "Double Storey" as const })),
  ...SPLIT_LEVEL_PRICES.map((r) => ({ row: r, housingType: "Split Level" as const })),
  ...DUAL_OC_PRICES.map((r) => ({ row: r, housingType: "Dual Living" as const })),
];

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

      const totalM2 = row.m2 || 200;
      const garageM2 = cad?.garageM2 || (totalM2 > 230 ? 38.0 : 32.0);
      const alfrescoM2 = cad?.alfrescoM2 || 14.5;
      const porchM2 = cad?.porchM2 || 3.0;
      const livingM2 = cad?.livingM2 || Math.max(100, totalM2 - garageM2 - alfrescoM2 - porchM2);

      const widthM = cad?.width || (totalM2 > 240 ? 12.5 : 11.2);
      const lengthM = cad?.length || (totalM2 > 240 ? 22.0 : 19.8);

      bestMatch = {
        matchedDesignName: designName,
        family: familyName.charAt(0).toUpperCase() + familyName.slice(1),
        size: parseInt(sizeNumber, 10) || Math.round(totalM2 / 9.29),
        housingType,
        totalM2,
        basePriceH2: row.h2 || row.h1 || row.hbs || 0,
        basePriceH1: row.h1 || row.hbs || 0,
        basePriceHBS: row.hbs || 0,
        priceRow: row,
        floorplanRecord: planRec,
        floorplanUrl: standardUrl,
        widthM,
        lengthM,
        roomAreas: {
          livingM2: Math.round(livingM2 * 10) / 10,
          garageM2: Math.round(garageM2 * 10) / 10,
          alfrescoM2: Math.round(alfrescoM2 * 10) / 10,
          porchM2: Math.round(porchM2 * 10) / 10,
        },
        confidence: Math.min(100, score),
        rawMatchedText: `Detected ${designName} (${housingType}, ${totalM2} m²) with ${score}% confidence`,
      };
    }
  }

  return bestMatch;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
