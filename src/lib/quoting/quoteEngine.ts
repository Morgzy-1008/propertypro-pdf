import { CATEGORY_LABELS, DEFAULT_CATALOGUE } from "./quoteCatalogue";
import { landscapingPriceFor } from "@/lib/landscaping";
import type {
  CategorySubtotal,
  CatalogueCategory,
  CustomFloorplanSpec,
  QuoteDesignSelection,
  QuotePricingSummary,
  QuoteSelectedLineItem,
  SiteConditions,
  SoilClass,
} from "./quoteTypes";

/**
 * Calculates base price for custom floorplan based on area dimensions and tiered rates.
 */
export function calculateCustomFloorplanPrice(spec?: CustomFloorplanSpec): number {
  if (!spec) return 0;
  const isDouble = spec.storeys === "double";
  const groundLivingArea = Number(spec.groundLivingM2) || 0;
  const firstLivingArea = Number(spec.firstLivingM2) || 0;
  const garageArea = Number(spec.garageM2) || 0;
  const alfrescoArea = Number(spec.alfrescoM2) || 0;
  const porchArea = Number(spec.porchM2) || 0;
  const balconyArea = Number(spec.balconyM2) || 0;

  const groundRate = Number(spec.groundRateM2) || (isDouble ? 1720 : 1580);
  const upperRate = Number(spec.upperRateM2) || 2050;
  const ancillaryRate = Number(spec.ancillaryRateM2) || 1050;
  const scaffold = isDouble ? Number(spec.scaffoldingAllowance) || 8500 : 0;

  const groundLivingCost = groundLivingArea * groundRate;
  const upperLivingCost = isDouble ? firstLivingArea * upperRate : 0;
  const ancillaryCost = (garageArea + alfrescoArea + porchArea + balconyArea) * ancillaryRate;

  return Math.round(groundLivingCost + upperLivingCost + ancillaryCost + scaffold);
}

/**
 * Calculates total m2 area for custom spec
 */
export function calculateCustomTotalM2(spec?: CustomFloorplanSpec): number {
  if (!spec) return 0;
  const isDouble = spec.storeys === "double";
  const ground = Number(spec.groundLivingM2) || 0;
  const upper = isDouble ? Number(spec.firstLivingM2) || 0 : 0;
  const garage = Number(spec.garageM2) || 0;
  const alfresco = Number(spec.alfrescoM2) || 0;
  const porch = Number(spec.porchM2) || 0;
  const balcony = isDouble ? Number(spec.balconyM2) || 0 : 0;
  return Number((ground + upper + garage + alfresco + porch + balcony).toFixed(2));
}

/**
 * Automatically maps line items to the correct category based on keywords (e.g. ceiling, extension).
 */
export function resolveItemCategory(item: { name: string; description?: string; category?: CatalogueCategory }): CatalogueCategory {
  const text = `${item.name} ${item.description || ""}`.toLowerCase();

  if (
    text.includes("ceiling") ||
    text.includes("ceilings") ||
    text.includes("raked") ||
    text.includes("cathedral") ||
    text.includes("square set") ||
    text.includes("cornice") ||
    (item.category as any) === "ceiling_heights"
  ) {
    return "structural";
  }

  if (
    text.includes("floorplan extension") ||
    text.includes("footprint extension") ||
    text.includes("extending") ||
    text.includes("extension") ||
    text.includes("additional ground floor living") ||
    text.includes("additional first floor living") ||
    text.includes("additional alfresco") ||
    text.includes("additional porch") ||
    text.includes("custom single storey living") ||
    text.includes("custom double storey living") ||
    text.includes("custom garage floor") ||
    text.includes("custom porch") ||
    text.includes("uncovered balcony") ||
    text.includes("covered balcony") ||
    text.includes("balcony structure") ||
    text.includes("drop edge beam") ||
    text.includes("integral concrete slab to alfresco") ||
    text.includes("additional wet area surcharge") ||
    text.includes("add floor space") ||
    text.includes("adding floor space") ||
    text.includes("extend floor area")
  ) {
    return "floorplan_extensions";
  }

  return item.category || "structural";
}

/**
 * Standard SQM Additional Rates as specified:
 * Single Storey:
 *  - Living Area: $1,420 / m²
 *  - Alfresco & Porch: $870 / m²
 *  - Garage: $1,300 / m²
 * Double Storey:
 *  - Ground Floor Living: $1,480 / m²
 *  - First Floor Living: $1,780 / m²
 *  - Alfresco and Porch: $870 / m²
 *  - Balcony (if added): $2,000 / m²
 *  - Garage: $1,300 / m²
 * Duplex and Split Level:
 *  - Lower Ground and Ground Floor Living: $1,480 / m²
 *  - First Floor or Upper Level Living: $1,780 / m²
 *  - Alfresco and Porch: $870 / m²
 *  - Balcony (if added): $2,000 / m²
 *  - Garage: $1,300 / m²
 * Reductions are discounted at 80% (i.e. deduction = deltaM2 * rate * 0.8)
 */
export const MODIFIED_SQM_RATES = {
  "Single Storey": {
    livingM2: 1420,
    garageM2: 1300,
    alfrescoM2: 870,
    porchM2: 870,
  },
  "Double Storey": {
    groundLivingM2: 1480,
    firstLivingM2: 1780,
    garageM2: 1300,
    alfrescoM2: 870,
    porchM2: 870,
    balconyM2: 2000,
  },
  "Split Level": {
    groundLivingM2: 1480,
    firstLivingM2: 1780,
    garageM2: 1300,
    alfrescoM2: 870,
    porchM2: 870,
    balconyM2: 2000,
  },
  "Dual Living": {
    groundLivingM2: 1480,
    firstLivingM2: 1780,
    garageM2: 1300,
    alfrescoM2: 870,
    porchM2: 870,
    balconyM2: 2000,
  },
} as const;

/**
 * Standard Area Breakdown catalog for Hudson Homes designs.
 */
export const HUDSON_STANDARD_AREAS: Record<string, FloorplanAreaBreakdown> = {
  "Coral 19": { livingM2: 135.25, garageM2: 33.73, alfrescoM2: 9.54, porchM2: 2.50, totalM2: 181.02 },
  "Coral 21": { livingM2: 148.28, garageM2: 34.73, alfrescoM2: 11.23, porchM2: 2.84, totalM2: 197.08 },
  "Coral 23": { livingM2: 165.40, garageM2: 34.80, alfrescoM2: 12.10, porchM2: 2.90, totalM2: 215.20 },
  "Coral 26": { livingM2: 188.50, garageM2: 35.10, alfrescoM2: 14.50, porchM2: 3.46, totalM2: 241.56 },
  "Azure 19": { livingM2: 132.80, garageM2: 33.50, alfrescoM2: 8.50, porchM2: 2.28, totalM2: 177.08 },
  "Azure 21": { livingM2: 148.28, garageM2: 34.73, alfrescoM2: 11.23, porchM2: 2.84, totalM2: 197.08 },
  "Azure 23": { livingM2: 158.40, garageM2: 34.90, alfrescoM2: 12.50, porchM2: 2.91, totalM2: 208.71 },
  "Azure 25": { livingM2: 178.60, garageM2: 35.20, alfrescoM2: 16.40, porchM2: 3.25, totalM2: 233.45 },
  "Amber 21": { livingM2: 143.50, garageM2: 34.10, alfrescoM2: 11.80, porchM2: 2.84, totalM2: 192.24 },
  "Amber 23": { livingM2: 160.20, garageM2: 34.60, alfrescoM2: 12.80, porchM2: 3.03, totalM2: 210.63 },
  "Amber 26": { livingM2: 188.40, garageM2: 35.20, alfrescoM2: 14.50, porchM2: 3.46, totalM2: 241.56 },
  "Amber 30": { groundLivingM2: 112.50, firstLivingM2: 118.20, garageM2: 34.80, alfrescoM2: 14.10, porchM2: 3.36, balconyM2: 0, totalM2: 282.96 },
  "Alabaster 31": { groundLivingM2: 110.80, firstLivingM2: 119.50, garageM2: 35.20, alfrescoM2: 15.80, porchM2: 3.56, balconyM2: 0, totalM2: 284.86 },
  "Alabaster 36": { groundLivingM2: 130.40, firstLivingM2: 142.60, garageM2: 36.10, alfrescoM2: 17.50, porchM2: 4.06, balconyM2: 0, totalM2: 330.66 },
  "Alabaster 40": { groundLivingM2: 148.20, firstLivingM2: 161.50, garageM2: 36.80, alfrescoM2: 21.80, porchM2: 4.72, balconyM2: 0, totalM2: 373.02 },
  "Charcoal 24": { livingM2: 169.50, garageM2: 35.10, alfrescoM2: 14.80, porchM2: 3.16, totalM2: 222.56 },
  "Maroon 26": { groundLivingM2: 98.40, firstLivingM2: 96.50, garageM2: 34.80, alfrescoM2: 11.80, porchM2: 2.92, balconyM2: 0, totalM2: 244.42 },
  "Blanc 27": { groundLivingM2: 102.50, firstLivingM2: 93.80, garageM2: 34.60, alfrescoM2: 12.80, porchM2: 3.06, balconyM2: 0, totalM2: 246.76 },
  "Cinnamon 23": { livingM2: 164.20, garageM2: 34.50, alfrescoM2: 11.20, porchM2: 2.80, totalM2: 212.70 },
  "Cinnamon 26": { livingM2: 187.80, garageM2: 35.20, alfrescoM2: 15.10, porchM2: 3.46, totalM2: 241.56 },
  "Cinnamon 30": { groundLivingM2: 118.20, firstLivingM2: 112.40, garageM2: 35.00, alfrescoM2: 13.80, porchM2: 3.56, balconyM2: 0, totalM2: 282.96 },
  "Cinnamon 36": { groundLivingM2: 145.20, firstLivingM2: 138.60, garageM2: 36.00, alfrescoM2: 18.20, porchM2: 4.20, balconyM2: 0, totalM2: 342.20 },
  "Cobalt 22": { livingM2: 155.40, garageM2: 34.20, alfrescoM2: 11.50, porchM2: 2.80, totalM2: 203.90 },
  "Cobalt 26": { livingM2: 186.20, garageM2: 35.10, alfrescoM2: 14.80, porchM2: 3.46, totalM2: 239.56 },
  "Cobalt 30": { groundLivingM2: 116.40, firstLivingM2: 114.20, garageM2: 34.80, alfrescoM2: 14.20, porchM2: 3.36, balconyM2: 0, totalM2: 282.96 },
  "Cobalt 36": { groundLivingM2: 142.80, firstLivingM2: 140.20, garageM2: 36.20, alfrescoM2: 18.50, porchM2: 4.10, balconyM2: 0, totalM2: 341.80 },
  "Carmine 17": { livingM2: 118.20, garageM2: 33.20, alfrescoM2: 8.40, porchM2: 2.20, totalM2: 162.00 },
  "Carmine 19": { livingM2: 134.50, garageM2: 33.60, alfrescoM2: 9.50, porchM2: 2.40, totalM2: 180.00 },
  "Carmine 21 MKII": { livingM2: 150.20, garageM2: 34.50, alfrescoM2: 11.80, porchM2: 2.80, totalM2: 199.30 },
  "Carmine 23 MKII": { livingM2: 166.40, garageM2: 34.80, alfrescoM2: 12.60, porchM2: 3.10, totalM2: 216.90 },
  "Carolina 22": { livingM2: 158.20, garageM2: 34.50, alfrescoM2: 11.40, porchM2: 2.80, totalM2: 206.90 },
  "Carolina 24": { livingM2: 172.50, garageM2: 35.00, alfrescoM2: 13.20, porchM2: 3.20, totalM2: 223.90 },
  "Carolina 26": { livingM2: 188.40, garageM2: 35.20, alfrescoM2: 14.50, porchM2: 3.46, totalM2: 241.56 },
  "Carolina 29": { groundLivingM2: 114.50, firstLivingM2: 110.20, garageM2: 34.80, alfrescoM2: 13.60, porchM2: 3.40, balconyM2: 0, totalM2: 276.50 },
  "Cayenne 42": { groundLivingM2: 172.40, firstLivingM2: 180.20, garageM2: 37.00, alfrescoM2: 24.50, porchM2: 5.20, balconyM2: 0, totalM2: 419.30 },
  "Cayenne 45": { groundLivingM2: 185.00, firstLivingM2: 192.50, garageM2: 37.50, alfrescoM2: 26.00, porchM2: 5.50, balconyM2: 0, totalM2: 446.50 },
  "Cayenne 47": { groundLivingM2: 196.20, firstLivingM2: 204.80, garageM2: 38.00, alfrescoM2: 28.00, porchM2: 5.80, balconyM2: 0, totalM2: 472.80 },
  "Cayenne 56": { groundLivingM2: 235.00, firstLivingM2: 245.00, garageM2: 39.00, alfrescoM2: 32.00, porchM2: 6.50, balconyM2: 0, totalM2: 557.50 },
};

/**
 * Returns standard baseline area breakdown for any design.
 */
export function getStandardAreaBreakdown(
  designName?: string,
  housingType: string = "Single Storey",
  totalM2: number = 198.08,
): FloorplanAreaBreakdown {
  if (designName && HUDSON_STANDARD_AREAS[designName]) {
    return { ...HUDSON_STANDARD_AREAS[designName] };
  }

  const isDoubleOrSplit =
    housingType === "Double Storey" ||
    housingType === "Split Level" ||
    housingType === "Dual Living";

  const tot = totalM2 > 0 ? totalM2 : 200;

  if (isDoubleOrSplit) {
    const garage = Math.min(36, +(tot * 0.15).toFixed(2));
    const alfresco = +(tot * 0.055).toFixed(2);
    const porch = +(tot * 0.025).toFixed(2);
    const balcony = 0;
    const remainingLiving = +(tot - garage - alfresco - porch - balcony).toFixed(2);
    const groundLiving = +(remainingLiving * 0.49).toFixed(2);
    const firstLiving = +(remainingLiving - groundLiving).toFixed(2);

    return {
      groundLivingM2: groundLiving,
      firstLivingM2: firstLiving,
      garageM2: garage,
      alfrescoM2: alfresco,
      porchM2: porch,
      balconyM2: balcony,
      totalM2: Number((groundLiving + firstLiving + garage + alfresco + porch + balcony).toFixed(2)),
    };
  } else {
    const garage = Math.min(35, +(tot * 0.175).toFixed(2));
    const alfresco = +(tot * 0.06).toFixed(2);
    const porch = +(tot * 0.025).toFixed(2);
    const living = +(tot - garage - alfresco - porch).toFixed(2);

    return {
      livingM2: living,
      garageM2: garage,
      alfrescoM2: alfresco,
      porchM2: porch,
      totalM2: Number((living + garage + alfresco + porch).toFixed(2)),
    };
  }
}

export interface ZoneVarianceResult {
  key: string;
  label: string;
  standardM2: number;
  modifiedM2: number;
  deltaM2: number;
  ratePerM2: number;
  isReduced: boolean;
  costAdjustment: number;
}

export interface ModifiedBreakdownCalculation {
  standardTotalM2: number;
  modifiedTotalM2: number;
  netDeltaM2: number;
  totalCostAdjustment: number;
  standardBasePrice: number;
  modifiedBasePrice: number;
  zones: ZoneVarianceResult[];
}

export function calculateModifiedFloorplanPricing(
  design?: QuoteDesignSelection,
): ModifiedBreakdownCalculation {
  const stdTotal = Number(design?.standardDesignM2) || Number(design?.designM2) || 198.08;
  const housingType = design?.housingType || "Single Storey";
  const stdAreas =
    design?.standardAreas && Object.keys(design.standardAreas).length > 0
      ? (design.standardAreas as FloorplanAreaBreakdown)
      : getStandardAreaBreakdown(design?.designName, housingType, stdTotal);

  const modAreas = design?.modifiedAreas || {};
  const isDoubleOrSplit =
    housingType === "Double Storey" ||
    housingType === "Split Level" ||
    housingType === "Dual Living";

  const rateConfig = (MODIFIED_SQM_RATES[housingType as keyof typeof MODIFIED_SQM_RATES] ||
    MODIFIED_SQM_RATES["Single Storey"]) as Record<string, number>;

  const zones: ZoneVarianceResult[] = [];

  if (isDoubleOrSplit) {
    const zoneDefs: { key: string; label: string; std: number; mod: number; rate: number }[] = [
      {
        key: "groundLivingM2",
        label: housingType === "Split Level" ? "Lower/Ground Living" : "Ground Floor Living",
        std: stdAreas.groundLivingM2 ?? 0,
        mod: modAreas.groundLivingM2 !== undefined ? Number(modAreas.groundLivingM2) : (stdAreas.groundLivingM2 ?? 0),
        rate: rateConfig.groundLivingM2 || 1480,
      },
      {
        key: "firstLivingM2",
        label: housingType === "Split Level" ? "Upper Level Living" : "First Floor Living",
        std: stdAreas.firstLivingM2 ?? 0,
        mod: modAreas.firstLivingM2 !== undefined ? Number(modAreas.firstLivingM2) : (stdAreas.firstLivingM2 ?? 0),
        rate: rateConfig.firstLivingM2 || 1780,
      },
      {
        key: "garageM2",
        label: "Garage Area",
        std: stdAreas.garageM2 ?? 0,
        mod: modAreas.garageM2 !== undefined ? Number(modAreas.garageM2) : (stdAreas.garageM2 ?? 0),
        rate: rateConfig.garageM2 || 1300,
      },
      {
        key: "alfrescoM2",
        label: "Alfresco Area",
        std: stdAreas.alfrescoM2 ?? 0,
        mod: modAreas.alfrescoM2 !== undefined ? Number(modAreas.alfrescoM2) : (stdAreas.alfrescoM2 ?? 0),
        rate: rateConfig.alfrescoM2 || 870,
      },
      {
        key: "porchM2",
        label: "Porch Area",
        std: stdAreas.porchM2 ?? 0,
        mod: modAreas.porchM2 !== undefined ? Number(modAreas.porchM2) : (stdAreas.porchM2 ?? 0),
        rate: rateConfig.porchM2 || 870,
      },
      {
        key: "balconyM2",
        label: "Balcony",
        std: stdAreas.balconyM2 ?? 0,
        mod: modAreas.balconyM2 !== undefined ? Number(modAreas.balconyM2) : (stdAreas.balconyM2 ?? 0),
        rate: rateConfig.balconyM2 || 2000,
      },
    ];

    for (const def of zoneDefs) {
      const delta = Number((def.mod - def.std).toFixed(2));
      let cost = 0;
      if (delta > 0) {
        cost = Math.round(delta * def.rate);
      } else if (delta < 0) {
        // 80% discount on reduction
        cost = Math.round(delta * def.rate * 0.8);
      }
      zones.push({
        key: def.key,
        label: def.label,
        standardM2: def.std,
        modifiedM2: def.mod,
        deltaM2: delta,
        ratePerM2: def.rate,
        isReduced: delta < 0,
        costAdjustment: cost,
      });
    }
  } else {
    const zoneDefs: { key: string; label: string; std: number; mod: number; rate: number }[] = [
      {
        key: "livingM2",
        label: "Living Area",
        std: stdAreas.livingM2 ?? 0,
        mod: modAreas.livingM2 !== undefined ? Number(modAreas.livingM2) : (stdAreas.livingM2 ?? 0),
        rate: rateConfig.livingM2 || 1420,
      },
      {
        key: "garageM2",
        label: "Garage Area",
        std: stdAreas.garageM2 ?? 0,
        mod: modAreas.garageM2 !== undefined ? Number(modAreas.garageM2) : (stdAreas.garageM2 ?? 0),
        rate: rateConfig.garageM2 || 1300,
      },
      {
        key: "alfrescoM2",
        label: "Alfresco Area",
        std: stdAreas.alfrescoM2 ?? 0,
        mod: modAreas.alfrescoM2 !== undefined ? Number(modAreas.alfrescoM2) : (stdAreas.alfrescoM2 ?? 0),
        rate: rateConfig.alfrescoM2 || 870,
      },
      {
        key: "porchM2",
        label: "Porch Area",
        std: stdAreas.porchM2 ?? 0,
        mod: modAreas.porchM2 !== undefined ? Number(modAreas.porchM2) : (stdAreas.porchM2 ?? 0),
        rate: rateConfig.porchM2 || 870,
      },
    ];

    for (const def of zoneDefs) {
      const delta = Number((def.mod - def.std).toFixed(2));
      let cost = 0;
      if (delta > 0) {
        cost = Math.round(delta * def.rate);
      } else if (delta < 0) {
        // 80% discount on reduction
        cost = Math.round(delta * def.rate * 0.8);
      }
      zones.push({
        key: def.key,
        label: def.label,
        standardM2: def.std,
        modifiedM2: def.mod,
        deltaM2: delta,
        ratePerM2: def.rate,
        isReduced: delta < 0,
        costAdjustment: cost,
      });
    }
  }

  const standardTotalM2 = Number(zones.reduce((sum, z) => sum + z.standardM2, 0).toFixed(2));
  const modifiedTotalM2 = Number(zones.reduce((sum, z) => sum + z.modifiedM2, 0).toFixed(2));
  const netDeltaM2 = Number((modifiedTotalM2 - standardTotalM2).toFixed(2));
  const totalCostAdjustment = zones.reduce((sum, z) => sum + z.costAdjustment, 0);

  const standardBasePrice = Number(design?.standardBasePrice) || Number(design?.basePrice) || 0;
  const modifiedBasePrice = Math.max(0, standardBasePrice + totalCostAdjustment);

  return {
    standardTotalM2,
    modifiedTotalM2,
    netDeltaM2,
    totalCostAdjustment,
    standardBasePrice,
    modifiedBasePrice,
    zones,
  };
}

/**
 * Returns the customer/consultant facing floorplan design name.
 * If modified floorplan is enabled, appends "Modified" (e.g. "Coral 21 Modified").
 */
export function getEffectiveDesignName(design?: QuoteDesignSelection): string {
  if (!design) return "Home Design";
  if (design.mode === "custom_floorplan") {
    return `Custom Architectural Plan (${design.customSpec?.storeys === "double" ? "Two" : "Single"} Storey)`;
  }
  const raw = design.designName || "Standard Design";
  if (design.isModifiedFloorplan) {
    if (!raw.toLowerCase().includes("modified")) {
      return `${raw} Modified`;
    }
  }
  return raw;
}

/**
 * Returns the effective total m² area for the selected design.
 * If modified floorplan is enabled with a custom sqm, returns that modified sqm.
 */
export function getEffectiveDesignM2(design?: QuoteDesignSelection): number {
  if (!design) return 0;
  if (design.mode === "custom_floorplan") {
    return calculateCustomTotalM2(design.customSpec);
  }
  if (design.isModifiedFloorplan) {
    if (design.modifiedAreas && Object.keys(design.modifiedAreas).length > 0) {
      return calculateModifiedFloorplanPricing(design).modifiedTotalM2;
    }
    if (Number(design.modifiedDesignM2) > 0) {
      return Number(design.modifiedDesignM2);
    }
  }
  return Number(design.designM2) || 0;
}

/**
 * Calculates automated builder promotion discount based on house size in Squares (sq):
 * - <= 42 sq (<= 42.99 sq): $25,000
 * - 43 sq to 52 sq (<= 52.99 sq): $30,000
 * - 53 sq to 62 sq (<= 62.99 sq): $35,000
 * - 63 sq and over: $42,000
 */
export function getAutomatedPromotionDiscount(designM2: number): number {
  if (!designM2 || designM2 <= 0) return 0;
  const sq = designM2 * 0.107639;
  if (sq <= 42.99) {
    return 25000;
  } else if (sq <= 52.99) {
    return 30000;
  } else if (sq <= 62.99) {
    return 35000;
  } else {
    return 42000;
  }
}

/**
 * Calculates GFA (Ground Floor Area = Ground living + Porch + Garage + Alfresco).
 */
export function calculateDesignGFA(design: QuoteDesignSelection): number {
  if (design.mode === "custom_floorplan") {
    const spec = design.customSpec;
    return Number(
      (
        (Number(spec.groundLivingM2) || 0) +
        (Number(spec.garageM2) || 0) +
        (Number(spec.alfrescoM2) || 0) +
        (Number(spec.porchM2) || 0)
      ).toFixed(2),
    );
  }
  if (design.isModifiedFloorplan) {
    const calc = calculateModifiedFloorplanPricing(design);
    const isDoubleOrSplit =
      design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      design.housingType === "Dual Living";
    if (isDoubleOrSplit) {
      const gLiving = calc.zones.find((z) => z.key === "groundLivingM2")?.modifiedM2 || 0;
      const garage = calc.zones.find((z) => z.key === "garageM2")?.modifiedM2 || 0;
      const alfresco = calc.zones.find((z) => z.key === "alfrescoM2")?.modifiedM2 || 0;
      const porch = calc.zones.find((z) => z.key === "porchM2")?.modifiedM2 || 0;
      return Number((gLiving + garage + alfresco + porch).toFixed(2));
    }
    return Number(calc.modifiedTotalM2.toFixed(2));
  }
  const totalM2 = Number(design.designM2) || 192;
  if (design.housingType === "Double Storey") {
    return Number(((totalM2 || 200) * 0.62).toFixed(2));
  }
  return Number((totalM2 || 192).toFixed(2));
}

/**
 * Calculates soil cost rate per m2 of GFA (Engineered Soil Classification Multiplier)
 * Class S: -$30, Class M: $0, Class H1: +$30, Class H2: +$55, Class E1: +$80, Class E2: +$100, Class P: +$150
 */
export function getSoilRatePerM2(soilClass: SoilClass): number {
  switch (soilClass) {
    case "Class S":
      return -30;
    case "Class M":
      return 0;
    case "Class H1":
      return 30;
    case "Class H2":
      return 55;
    case "Class E1":
      return 80;
    case "Class E2":
    case "Class E":
      return 100;
    case "Class P":
      return 150;
    default:
      return 0;
  }
}

/**
 * Calculates topography fall cost:
 * - Base allowance covers up to 1.0m fall ($0 included).
 * - For fall between 1.0m and 2.0m: Standard = $15 per 0.1m / m² GFA; Split Level = $12.50 per 0.1m / m² GFA.
 * - For fall above 2.0m: Standard = $20 per 0.1m / m² GFA; Split Level = $15.00 per 0.1m / m² GFA.
 */
export function calculateTopographyFallCost(
  fallMeters: number,
  gfaM2: number,
  isSplitLevel: boolean = false,
): number {
  if (fallMeters <= 1.0) return 0;

  const excessMeters = Math.max(0, fallMeters - 1.0);
  const under2mMeters = Math.min(excessMeters, 1.0); // portion between 1.0m and 2.0m (max 1.0m)
  const above2mMeters = Math.max(0, fallMeters - 2.0); // portion above 2.0m

  const under2mTenths = Math.round(under2mMeters * 10);
  const above2mTenths = Math.round(above2mMeters * 10);

  const rateUnder2m = isSplitLevel ? 12.5 : 15;
  const rateAbove2m = isSplitLevel ? 15 : 20;

  const costPerM2 = under2mTenths * rateUnder2m + above2mTenths * rateAbove2m;
  return Math.round(costPerM2 * gfaM2);
}

/**
 * Calculates Bushfire Attack Level (BAL) cost based on design storeys (Single vs Double).
 */
export function getBushfireCost(
  bal: "None" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40",
  isDoubleStorey: boolean,
): number {
  if (bal === "None") return 0;
  if (isDoubleStorey) {
    switch (bal) {
      case "BAL-12.5":
        return 10000;
      case "BAL-19":
        return 12000;
      case "BAL-29":
        return 14000;
      case "BAL-40":
        return 19000;
      default:
        return 0;
    }
  } else {
    switch (bal) {
      case "BAL-12.5":
        return 6500;
      case "BAL-19":
        return 8000;
      case "BAL-29":
        return 10000;
      case "BAL-40":
        return 15000;
      default:
        return 0;
    }
  }
}

/**
 * Calculates Acoustic Attenuation Requirements cost based on design storeys (Single vs Double).
 */
export function getAcousticCost(
  tier: "None" | "Category 1" | "Category 2" | "Category 3",
  isDoubleStorey: boolean,
): number {
  if (tier === "None") return 0;
  if (isDoubleStorey) {
    switch (tier) {
      case "Category 1":
        return 10000;
      case "Category 2":
        return 20000;
      case "Category 3":
        return 40000;
      default:
        return 0;
    }
  } else {
    switch (tier) {
      case "Category 1":
        return 5000;
      case "Category 2":
        return 10000;
      case "Category 3":
        return 20000;
      default:
        return 0;
    }
  }
}

/**
 * Computes line item subtotal based on quantity and rate.
 */
export function computeLineItemSubtotal(item: QuoteSelectedLineItem): number {
  if (!item.isIncluded) return 0;
  const qty = Number(item.quantity) || 1;
  const rate = Number(item.unitRate) || 0;
  return Math.round(qty * rate);
}

/**
 * Calculates complete pricing summary for the quote.
 */
export function calculateQuotePricing(
  design: QuoteDesignSelection,
  site: SiteConditions,
  lineItems: QuoteSelectedLineItem[],
  initialDepositAmount?: number,
): QuotePricingSummary {
  const isDouble = design.housingType === "Double Storey" || design.customSpec.storeys === "double";
  const isSplit = design.housingType === "Split Level" || design.customSpec.storeys === "split";

  let baseHousePrice = 0;
  let customFloorplanPrice = 0;

  if (design.mode === "custom_floorplan") {
    customFloorplanPrice = calculateCustomFloorplanPrice(design.customSpec);
    baseHousePrice = customFloorplanPrice;
  } else if (design.isModifiedFloorplan) {
    const modCalc = calculateModifiedFloorplanPricing(design);
    baseHousePrice = Number(modCalc.modifiedBasePrice) || Number(design.basePrice) || 0;
  } else {
    baseHousePrice = Number(design.basePrice) || 0;
  }

  const facadePrice = Number(design.facadePrice) || 0;
  const promotionName = design.promotionName || "Hudson Special Promotion";
  const promotionsDiscount = Number(design.promotionsDiscount) || 0;

  // 2nd Dwelling or Granny Flat Calculation
  let secondDwellingPrice = 0;
  if (design.hasSecondDwelling && design.secondDwelling && design.secondDwelling.enabled) {
    const sd = design.secondDwelling;
    let sdBase = Number(sd.basePrice) || 0;
    if (sd.isModifiedFloorplan && sd.modifiedAreas && sd.standardAreas) {
      const livingDelta = (Number(sd.modifiedAreas.livingM2) || 0) - (Number(sd.standardAreas.livingM2) || 0);
      const garageDelta = (Number(sd.modifiedAreas.garageM2) || 0) - (Number(sd.standardAreas.garageM2) || 0);
      const alfrescoDelta = (Number(sd.modifiedAreas.alfrescoM2) || 0) - (Number(sd.standardAreas.alfrescoM2) || 0);
      const porchDelta = (Number(sd.modifiedAreas.porchM2) || 0) - (Number(sd.standardAreas.porchM2) || 0);

      const livingCost = livingDelta >= 0 ? livingDelta * 1420 : livingDelta * 1420 * 0.8;
      const garageCost = garageDelta >= 0 ? garageDelta * 1300 : garageDelta * 1300 * 0.8;
      const alfrescoCost = alfrescoDelta >= 0 ? alfrescoDelta * 870 : alfrescoDelta * 870 * 0.8;
      const porchCost = porchDelta >= 0 ? porchDelta * 870 : porchDelta * 870 * 0.8;

      sdBase += Math.round(livingCost + garageCost + alfrescoCost + porchCost);
    }
    const sdFacade = Number(sd.facadePrice) || 0;
    secondDwellingPrice = Math.max(0, sdBase + sdFacade);
  }

  // Calculate GFA (m2) of building footprint on slab
  const gfaM2 = calculateDesignGFA(design);

  // Landscaping and Driveway Packages
  const landscapingCost = design.landscapingSelected
    ? (Number(design.landscapingCost) > 0 ? Number(design.landscapingCost) : landscapingPriceFor(design.landscapingLandSize || 450))
    : 0;

  const exposedDrivewayCost = design.exposedDrivewaySelected
    ? (Number(design.exposedDrivewayCost) > 0 ? Number(design.exposedDrivewayCost) : Math.round((Number(design.exposedDrivewayM2) || 55) * 230))
    : 0;

  // Dynamic Site & Statutory Calculations
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost = Math.round(soilRate * gfaM2);
  const fallTotalCost = calculateTopographyFallCost(site.fallMeters, gfaM2, isSplit);

  // Dedicated Site & Soil Engineering items
  const concrete32Cost = site.concrete32MpaRequired
    ? (Number(site.concrete32MpaCost) > 0 ? Number(site.concrete32MpaCost) : Math.round(gfaM2 * 14))
    : 0;
  const flexibleConnectionsCost = site.flexibleConnectionsRequired ? (Number(site.flexibleConnectionsCost) || 1800) : 0;

  // Site Overlay Reports (LHS)
  const bushfireReportCost = site.bushfireReportRequired ? (Number(site.bushfireReportCost) || 850) : 0;
  const floodReportCost = site.floodReportRequired ? (Number(site.floodReportCost) || 7600) : 0;
  const hydraulicReportCost = site.hydraulicReportRequired ? (Number(site.hydraulicReportCost) || 2600) : 0;
  const landslideReportCost = site.landslideReportRequired ? (Number(site.landslideReportCost) || 7000) : 0;
  const acousticReportCost = site.acousticReportRequired ? (Number(site.acousticReportCost) || 1200) : 0;
  const arboristReportCost = site.arboristReportRequired ? (Number(site.arboristReportCost) || 1100) : 0;
  const cctvSewerReportCost = site.cctvSewerReportRequired ? (Number(site.cctvSewerReportCost) || 3300) : 0;

  // Site Overlay Physical Allowances (RHS)
  const bushfireCost = getBushfireCost(site.bushfireBal, isDouble);
  const slabElevationCost = site.floodOverlayRequired
    ? (site.floodOverlayCost !== undefined && site.floodOverlayCost !== null && !isNaN(Number(site.floodOverlayCost)) && site.floodOverlayCost > 0
        ? Number(site.floodOverlayCost)
        : Math.round((Number(site.slabElevationMeters) || 0.3) * 270 * gfaM2))
    : 0;
  const acousticCost = getAcousticCost(site.acousticTier, isDouble);

  // Council & Statutory
  const councilDaCost = site.councilDaRequired ? (Number(site.councilDaCost) || 11000) : 0;
  const councilSetbackRelaxationCost = site.councilSetbackRelaxationRequired
    ? (Number(site.councilSetbackRelaxationCost) || 2000)
    : 0;
  const trafficCost = site.trafficControlRequired ? (Number(site.trafficControlCost) || 10000) : 0;
  const dualLivingCost = site.dualLivingInfrastructureRequired ? (Number(site.dualLivingInfrastructureCost) || 23000) : 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  // Geotechnical & Site Allowances
  const screwPieringCost = site.screwPieringRequired ? (Number(site.screwPieringCost) || Math.round(gfaM2 * 90)) : 0;
  const demolitionAsbestosCost = site.demolitionAsbestosRequired
    ? (Number(site.demolitionAsbestosCost) !== undefined && !isNaN(Number(site.demolitionAsbestosCost))
        ? Number(site.demolitionAsbestosCost)
        : (isDouble ? 40000 : 30000))
    : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const retainingCost = Number(site.retainingWallAllowance) || 0;
  const materialHandlingCost = Number(site.materialHandlingAllowance) || 0;

  const siteCostsSubtotal =
    soilTotalCost +
    concrete32Cost +
    flexibleConnectionsCost +
    fallTotalCost +
    bushfireReportCost +
    bushfireCost +
    floodReportCost +
    hydraulicReportCost +
    landslideReportCost +
    slabElevationCost +
    acousticReportCost +
    acousticCost +
    arboristReportCost +
    cctvSewerReportCost +
    trafficCost +
    screwPieringCost +
    demolitionAsbestosCost +
    rockCost +
    retainingCost +
    materialHandlingCost +
    sedimentCost;

  const councilStatutorySubtotal =
    (Number(site.councilFee) || 0) +
    councilDaCost +
    councilSetbackRelaxationCost +
    dualLivingCost;

  // Group line items by category
  const categoryGroups: Record<CatalogueCategory, QuoteSelectedLineItem[]> = {
    floorplan_extensions: [],
    structural: [],
    doors_windows: [],
    external: [],
    internal_kitchen: [],
    internal_bathroom: [],
    internal_bedrooms: [],
    internal_laundry: [],
    colour_upgrades: [],
    site_earthworks: [],
    council_statutory: [],
  };

  for (const item of lineItems) {
    if (!item.isIncluded) continue;
    if (item.isClientSelectable && item.clientSelected === false) continue;
    const cat = resolveItemCategory(item);
    if (categoryGroups[cat]) {
      categoryGroups[cat].push({ ...item, category: cat });
    }
  }

  // Calculate category subtotals
  const categorySubtotals: CategorySubtotal[] = [];
  let variationsSubtotal = 0;

  const categoryOrder: CatalogueCategory[] = [
    "floorplan_extensions",
    "structural",
    "doors_windows",
    "external",
    "internal_kitchen",
    "internal_bathroom",
    "internal_bedrooms",
    "internal_laundry",
    "colour_upgrades",
    "site_earthworks",
    "council_statutory",
  ];

  for (const cat of categoryOrder) {
    const items = categoryGroups[cat] || [];
    const catAmount = items.reduce((sum, it) => sum + computeLineItemSubtotal(it), 0);
    if (catAmount > 0) {
      categorySubtotals.push({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        amount: catAmount,
        items,
      });
      variationsSubtotal += catAmount;
    }
  }

  const totalVariations =
    facadePrice +
    secondDwellingPrice -
    promotionsDiscount +
    landscapingCost +
    exposedDrivewayCost +
    siteCostsSubtotal +
    councilStatutorySubtotal +
    variationsSubtotal;

  const grossEstimatedInvestment = Math.max(0, baseHousePrice + totalVariations);
  const netContractPriceExGst = Math.round(grossEstimatedInvestment / 1.1);
  const gstAmount = grossEstimatedInvestment - netContractPriceExGst;

  const deposit = Number(initialDepositAmount) || 1650;
  const balanceDueOnContract = Math.max(0, grossEstimatedInvestment - deposit);

  return {
    baseHousePrice,
    facadePrice,
    secondDwellingPrice,
    promotionName,
    promotionsDiscount,
    landscapingCost,
    exposedDrivewayCost,
    customFloorplanPrice,
    gfaM2,
    siteCostsSubtotal,
    councilStatutorySubtotal,
    categorySubtotals,
    totalVariations,
    netContractPriceExGst,
    gstAmount,
    grossEstimatedInvestment,
    initialDepositAmount: deposit,
    balanceDueOnContract,
  };
}

/**
 * Generates an architectural Estimate Reference ID (e.g. MH139)
 */
export function generateQuoteNumber(): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `MH${rand}`;
}

export interface CouncilInfo {
  region: string;
  fee: number;
}

/**
 * Automatically detects the appropriate QLD council and statutory fee from an address, suburb, or postcode.
 * If no location is provided or land is not purchased yet, defaults to $2,200 Council Fee Allowance (No Location Mentioned).
 */
export function detectCouncilFromLocation(suburbOrLocation?: string, addressOrEstate?: string, postcode?: string): CouncilInfo {
  const suburbClean = (suburbOrLocation || "").toLowerCase().trim();
  const text = `${suburbOrLocation || ""} ${addressOrEstate || ""} ${postcode || ""}`.toLowerCase().trim();
  
  if (!text) {
    return { region: "Council Fee Allowance (No Location Mentioned)", fee: 2200 };
  }

  // Check if "no address", "tba", or "land not purchased"
  if (
    text.includes("no address") ||
    text.includes("tba") ||
    text.includes("land not") ||
    text.includes("no location") ||
    text.includes("to be advised")
  ) {
    return { region: "Council Fee Allowance (No Location Mentioned)", fee: 2200 };
  }

  // Gold Coast City Council ($2,950)
  const goldCoastKeywords = [
    "gold coast", "coomera", "pimpama", "ormeau", "helensvale", "hope island", "sanctuary cove",
    "pacific pines", "oxenford", "gaven", "maudsland", "nerang", "robina", "southport", "surfers paradise",
    "broadbeach", "mermaid beach", "miami", "burleigh", "palm beach", "currumbin", "tugun", "bilinga",
    "coolangatta", "varsity lakes", "mudgeeraba", "tallai", "worongary", "carrara", "ashmore", "benowa",
    "bundall", "molendinar", "arundel", "parkwood", "labrador", "runaway bay", "hollywell", "paradise point",
    "willow vale", "yatala", "jacobs well", "4208", "4209", "4210", "4211", "4212", "4213", "4214", "4215",
    "4216", "4217", "4218", "4220", "4221", "4223", "4224", "4225", "4226", "4227", "4228"
  ];
  if (goldCoastKeywords.some((k) => text.includes(k))) {
    return { region: "Gold Coast City Council", fee: 2950 };
  }

  // Sunshine Coast / Noosa ($2,950)
  const sunshineKeywords = [
    "sunshine coast", "noosa", "maroochydore", "caloundra", "birtinya", "baringa", "nirimba", "aura",
    "palmview", "harmony", "sippy downs", "buderim", "mooloolaba", "kawana", "pelican waters", "currimundi",
    "coolum", "peregian", "tewantin", "4551", "4556", "4557", "4558", "4567", "4575"
  ];
  if (sunshineKeywords.some((k) => text.includes(k))) {
    return { region: "Sunshine Coast Council", fee: 2950 };
  }

  // Logan City Council ($2,227)
  const loganKeywords = [
    "logan", "flagstone", "jimboomba", "yarrabilba", "greenbank", "springwood", "loganholme", "logan central",
    "park ridge", "browns plains", "crestmead", "marsden", "daisy hill", "shailer park", "rochedale south",
    "underwood", "slacks creek", "woodridge", "kingston", "beenleigh", "holmview", "bahrs scrub", "windaroo",
    "eagleby", "mount warren park", "edens landing", "waterford", "waterford west", "bethania", "meadowbrook",
    "tanah merah", "cornubia", "logan village", "munruben", "new beith", "north maclean", "south maclean",
    "chambers flat", "stockleigh", "cedar vale", "cedar creek", "undullah", "belivah", "buccan", "tamborine",
    "glenlogan", "veresdale", "boronia heights", "hillcrest", "forestdale", "heritage park", "regents park",
    "berrinba", "priestdale", "4114", "4117", "4118", "4119", "4123", "4127", "4128", "4129", "4130", "4131",
    "4132", "4133", "4207", "4280", "4285"
  ];
  if (loganKeywords.some((k) => text.includes(k))) {
    return { region: "Logan City Council", fee: 2227 };
  }

  // Ipswich City Council ($2,227)
  const ipswichKeywords = [
    "ipswich", "ripley", "south ripley", "deebing heights", "redbank plains", "redbank", "springfield",
    "springfield lakes", "springfield central", "spring mountain", "augustine heights", "brookwater",
    "bellbird park", "brassall", "karalee", "collingwood park", "goodna", "gailes", "camira", "carole park",
    "bundamba", "booval", "silkstone", "newtown", "raceview", "flinders view", "yamanto", "churchill",
    "leichhardt", "one mile", "sadliers crossing", "west ipswich", "coalfalls", "woodend", "tivoli",
    "north ipswich", "basin pocket", "east ipswich", "north booval", "riverview", "dinmore", "swanbank",
    "white rock", "goolman", "peak crossing", "willowbank", "ebenezer", "rosewood", "marburg", "walloon",
    "thagoona", "amberley", "wulkuraka", "4300", "4301", "4303", "4304", "4305", "4306"
  ];
  if (ipswichKeywords.some((k) => text.includes(k))) {
    return { region: "Ipswich City Council", fee: 2227 };
  }

  // Moreton Bay Regional Council ($2,227)
  const moretonKeywords = [
    "moreton bay", "caboolture", "caboolture south", "morayfield", "north lakes", "mango hill", "strathpine",
    "redcliffe", "burpengary", "burpengary east", "narangba", "warner", "griffin", "petrie", "kallangur",
    "murrumba downs", "dakabin", "lawnton", "bray park", "brendale", "cashmere", "eatons hill", "albany creek",
    "arana hills", "ferny hills", "everton hills", "bribie island", "bongaree", "bellara", "banksia beach",
    "sandstone point", "ningi", "beachmere", "upper caboolture", "bellmere", "elimbah", "wamuran", "d'aguilar",
    "woodford", "dayboro", "samford", "samford valley", "clontarf", "scarborough", "margate", "woody point",
    "newport", "rothwell", "deception bay", "4500", "4501", "4502", "4503", "4504", "4505", "4506", "4507",
    "4508", "4509", "4510", "4511", "4512", "4520", "4019", "4020", "4021", "4022", "4037", "4053", "4054", "4055"
  ];
  if (moretonKeywords.some((k) => text.includes(k))) {
    return { region: "Moreton Bay Regional Council", fee: 2227 };
  }

  // Brisbane City Council ($0 Standard)
  const brisbaneKeywords = [
    "brisbane", "chermside", "carindale", "indooroopilly", "sunnybank", "calamvale", "parkinson", "algester",
    "stretton", "drewvale", "kuraby", "runcorn", "eight mile plains", "mount gravatt", "mansfield", "wishart",
    "rochedale", "coorparoo", "camp hill", "carina", "cannon hill", "wynnum", "manly", "tingalpa", "belmont",
    "chandler", "gumdale", "wakerley", "the gap", "ashgrove", "paddington", "milton", "toowong", "taringa",
    "st lucia", "kenmore", "chapel hill", "brookfield", "pullenvale", "bellbowrie", "moggill", "annerley",
    "yeronga", "fairfield", "moorooka", "salisbury", "rocklea", "archerfield", "acacia ridge", "coopers plains",
    "macgregor", "robertson", "tarragindi", "holland park", "greenslopes", "dutton park", "south brisbane",
    "west end", "highgate hill", "kangaroo point", "east brisbane", "new farm", "teneriffe", "newstead",
    "fortitude valley", "spring hill", "bowen hills", "herston", "kelvin grove", "red hill", "bardon",
    "auchenflower", "grange", "wilston", "windsor", "albion", "wooloowin", "lutwyche", "kedron", "stafford",
    "everton park", "mitchelton", "gaythorne", "enoggera", "keperra", "ferny grove", "bridgeman downs",
    "mcdowall", "carseldine", "aspley", "zillmere", "geebung", "wavell heights", "nundah", "northgate",
    "banyo", "virginia", "hendra", "clayfield", "ascot", "hamilton", "pinkenba", "bracken ridge", "bald hills",
    "fitzgibbon", "taigum", "boondall", "sandgate", "shorncliffe", "brighton", "deagon"
  ];
  if (brisbaneKeywords.some((k) => text.includes(k))) {
    return { region: "Brisbane City Council", fee: 0 };
  }

  // Redland / Scenic Rim / Other SEQ ($2,227)
  const otherSeqKeywords = ["redland", "capalaba", "cleveland", "victoria point", "scenic rim", "beaudesert", "boonah", "toowoomba", "lockyer"];
  if (otherSeqKeywords.some((k) => text.includes(k))) {
    return { region: `${text.split(" ")[0].toUpperCase()} Regional Council`, fee: 2227 };
  }

  // If a location is provided but council not matched, flag as unrecognized for consultant review
  if (text.length > 2) {
    return { region: "Other / Unlisted Council (Approval Required)", fee: 2200, isUnrecognized: true };
  }

  return { region: "Council Fee Allowance (No Location Mentioned)", fee: 2200 };
}

