import { CATEGORY_LABELS, DEFAULT_CATALOGUE, getItemRateForInclusion, EXTENSION_RATES_BY_TIER, normalizeInclusionTier } from "./quoteCatalogue";
import { isSingleGarageDesign } from "./facadeLookup";
import { landscapingPriceFor } from "@/lib/landscaping";
import {
  DOUBLE_STOREY_PRICES,
  SINGLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import {
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SINGLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
} from "@/lib/pricelist.nsw.data";
import { findFhbPrice } from "@/lib/pricing/pricelists";
import { facadePriceForDesign, type FacadeStorey } from "@/components/flyer/facadePricing";
import { HUDSON_CAD_REGISTRY } from "@/components/flyer/floorplanVisionEngine";
import { getActiveDivision, type Division } from "@/lib/divisionContext";
import {
  calculateTailoredBushfireCost,
  getBushfireCost as getTailoredBushfireCost,
  resolveDesignSchedule,
  type BushfireCostBreakdown,
} from "./bushfireEngine";
import {
  calculateTailoredAcousticCost,
  getAcousticCost as getTailoredAcousticCost,
  type AcousticCostBreakdown,
  type AcousticTierLevel,
} from "./acousticEngine";
import {
  calculateDuctedAcUpgrade,
  type DuctedAcUpgradeSpec,
  type CalculateDuctedAcOptions,
} from "./ductedAcEngine";
import type {
  CategorySubtotal,
  CatalogueCategory,
  CustomFloorplanSpec,
  FloorplanAreaBreakdown,
  FullQuote,
  QuoteDesignSelection,
  QuotePricingSummary,
  QuoteSelectedLineItem,
  SiteConditions,
  SoilClass,
} from "./quoteTypes";

/**
 * Automatically determines the housing type (Single Storey, Double Storey, Split Level, Dual Living)
 * based on the selected Hudson Homes model name.
 */
export function getHousingTypeForDesign(
  designName?: string,
  fallbackType?: QuoteDesignSelection["housingType"],
): "Single Storey" | "Double Storey" | "Split Level" | "Dual Living" | "Granny Flat" {
  if (!designName) return fallbackType || "Single Storey";
  const raw = designName.trim().toLowerCase();
  const clean = raw.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  // 0. Granny Flat / Secondary Dwelling detection
  if (
    /^aqua\b/i.test(clean) ||
    /granny|auxiliary|secondary\s*dwelling/i.test(clean) ||
    ["acacia 60", "banksia 60", "coral 65", "myrtle 70"].includes(clean)
  ) {
    return "Granny Flat";
  }

  // 1. Dual Living / Duplex detection
  if (
    DUAL_OC_PRICES.some((m) => m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim() === clean) ||
    NSW_DUAL_OC_PRICES.some((m) => m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim() === clean) ||
    / - td\b| - sd\b|\bdual[-\s]?oc|\bduplex\b|\bdual living\b/i.test(raw) ||
    ["alabaster", "cayenne", "cayene", "teal", "wisteria", "magnolia", "maize", "raven", "lavender"].some((f) =>
      clean.startsWith(f)
    )
  ) {
    return "Dual Living";
  }

  // 2. Split Level detection
  if (
    SPLIT_LEVEL_PRICES.some((m) => m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim() === clean) ||
    NSW_SPLIT_LEVEL_PRICES.some((m) => m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim() === clean) ||
    /split/i.test(clean)
  ) {
    return "Split Level";
  }

  // 3. Single Storey detection (explicit match in Single Storey price lists wins)
  const isExplicitSingle =
    SINGLE_STOREY_PRICES.some((m) => {
      const mn = m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim();
      return mn === clean || mn.startsWith(clean + " ") || clean.startsWith(mn.split(" ")[0] + " ");
    }) ||
    NSW_SINGLE_STOREY_PRICES.some((m) => {
      const mn = m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim();
      return mn === clean || mn.startsWith(clean + " ") || clean.startsWith(mn.split(" ")[0] + " ");
    }) ||
    ["amber", "auburn", "azure", "blanc", "canary", "carmine", "cedar", "celeste", "charcoal", "coral", "crimson", "ebony", "eton", "hazel", "indigo", "iris", "ivory", "jade", "jasper", "kobi", "magenta", "mulberry", "olive", "onyx", "quartz", "saffron", "sage", "sienna", "tiffany", "topaz"].some((f) =>
      clean.startsWith(f)
    );

  if (isExplicitSingle) {
    return "Single Storey";
  }

  // 4. Double Storey detection
  if (
    DOUBLE_STOREY_PRICES.some((m) => {
      const mn = m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim();
      return mn === clean || mn.startsWith(clean + " ") || clean.startsWith(mn.split(" ")[0] + " ");
    }) ||
    NSW_DOUBLE_STOREY_PRICES.some((m) => {
      const mn = m.name.toLowerCase().replace(/\s*\([^)]*\)/g, " ").trim();
      return mn === clean || mn.startsWith(clean + " ") || clean.startsWith(mn.split(" ")[0] + " ");
    }) ||
    ["violet", "mahogany", "pearl", "carolina", "turquoise", "sabel", "sable", "burgundy", "diamond", "emerald", "garnet", "sardonyx", "tanzanite", "tourmaline", "alexandrite", "aston", "rose", "rosewood", "tangerine"].some((f) =>
      clean.startsWith(f)
    )
  ) {
    return "Double Storey";
  }

  return fallbackType || "Single Storey";
}

export function getHousingTypePrices(division: string = getActiveDivision()): Record<string, PriceRow[]> {
  const isNsw = division === "NSW";
  const dual = isNsw ? NSW_DUAL_OC_PRICES : DUAL_OC_PRICES;
  return {
    "Single Storey": isNsw ? NSW_SINGLE_STOREY_PRICES : SINGLE_STOREY_PRICES,
    "Double Storey": isNsw ? NSW_DOUBLE_STOREY_PRICES : DOUBLE_STOREY_PRICES,
    "Split Level": isNsw ? NSW_SPLIT_LEVEL_PRICES : SPLIT_LEVEL_PRICES,
    "Dual Living": dual,
    "Granny Flat": [
      { name: "Acacia 60", m2: 60, h1: 154000, h2: 159000, h3: 167000, hbs: 154000, ss: 154000 },
      { name: "Banksia 60", m2: 60, h1: 156000, h2: 161000, h3: 169000, hbs: 156000, ss: 156000 },
      { name: "Coral 65", m2: 65, h1: 168000, h2: 174000, h3: 182000, hbs: 168000, ss: 168000 },
      { name: "Myrtle 70", m2: 70, h1: 178000, h2: 184000, h3: 193000, hbs: 178000, ss: 178000 },
      ...dual,
    ],
  };
}

export function getTierPrice(
  model: PriceRow,
  tier: string = "H2",
  housingType?: string,
  division?: string,
): number {
  if (!model) return 0;
  const norm = String(tier || "H2").toUpperCase();
  const isH3 = norm.includes("H3") || norm.includes("LUXURY");
  const isH1 = norm.includes("H1") || norm.includes("SMART LIVING");
  const isHBS = norm.includes("HBS") || norm.includes("HOME BUILDER");
  const isSS = norm.includes("SS") || norm.includes("SMART SERIES") || norm.includes("SMART STYLE") || norm.includes("FHB") || norm.includes("START SMART") || norm.includes("FIRST HOME");
  const isIP = norm.includes("IP") || norm.includes("INVEST");
  const effectiveDiv = (division || (model as any).division || getActiveDivision() || "").toUpperCase();

  // The investment package pricing should be the exact same price as the first home buyer range for those particular designs
  if (isSS || isIP) {
    const fhb = findFhbPrice(model.name, effectiveDiv, housingType);
    if (fhb !== null) return fhb;
    if (model.fhb) return model.fhb;
    if (model.ss) return model.ss;
    return model.h2 || model.h1 || 0;
  }

  if (housingType === "Dual Living") {
    if (isHBS) return (model as any).hbs || model.h1 || 0;
    if (isH1) return model.h1 || (model as any).hbs || 0;
    if (isH3) return (model as any).h3 || model.h2 || 0;
    return model.h2 || model.h1 || 0;
  }
  if (isHBS) return (model as any).hbs || model.h1 || 0;
  if (isH1) return model.h1 || (model as any).hbs || 0;
  if (isH3) return (model as any).h3 || model.h2 || 0;
  return model.h2 || model.h1 || 0;
}

export interface CustomAreaRates {
  groundLivingRate: number;
  firstLivingRate: number;
  garageRate: number;
  alfrescoRate: number;
  porchRate: number;
  balconyRate: number;
  scaffoldingAllowance: number;
  blendedRate: number;
  totalM2: number;
}

/**
 * Calculates dynamic area rates for a custom design based on total size (smooth exponential gradient decay),
 * house storeys, and inclusion range tier (QLD pricelist calibration).
 *
 * Rules:
 * - Seamless gradient scaling: as floorplan size increases, $/m² smoothly decreases to reflect economies of scale.
 * - Custom premium: approx +$100/m² over standard Hudson production models.
 * - Asymptotic floor at >= 500m²:
 *    * Single Storey H2: minimum rate of $1,500/m²
 *    * Double Storey H2: minimum rate of $1,600/m²
 * - Alfresco: base $850/m² ($870/m² in H2 ceiling lining; +$30/m² in H3 for 600x600 tiling = $900/m²).
 */
export function getCustomAreaRates(
  spec?: CustomFloorplanSpec,
  tier: string = "H2 Design Inclusions",
): CustomAreaRates {
  const isDouble = spec?.storeys === "double";
  const totalM2 = calculateCustomTotalM2(spec);

  // Normalize tier
  const tierStr = String(tier || "H2").toUpperCase();
  const isH3 = tierStr.includes("H3");
  const isH1 = tierStr.includes("H1");
  const isHBS = tierStr.includes("HBS") || tierStr.includes("HOME BUILDER");
  const isSS =
    tierStr.includes("SS") ||
    tierStr.includes("SMART SERIES") ||
    tierStr.includes("SMART STYLE") ||
    tierStr.includes("FHB") ||
    tierStr.includes("START SMART") ||
    tierStr.includes("FIRST HOME");

  // Non-habitable area rates
  // Calibrated rates:
  // H1/FHB: Porch $700, Alfresco $870, Balcony $2000, Garage $1300
  // H2: Porch $740, Alfresco $920, Balcony $2050, Garage $1330
  // H3: Porch $870, Alfresco $1050, Balcony $2150, Garage $1370
  const garageRate = spec?.ancillaryRateM2 && spec.ancillaryRateM2 > 0 && spec.ancillaryRateM2 !== 869 && spec.ancillaryRateM2 !== 1050 && spec.ancillaryRateM2 !== 1150 && spec.ancillaryRateM2 !== 1400 
    ? spec.ancillaryRateM2 
    : (isH3 ? 1370 : (isH1 || isSS || isHBS) ? 1300 : 1330);
  const porchRate = spec?.ancillaryRateM2 && spec.ancillaryRateM2 > 0 && spec.ancillaryRateM2 !== 869 
    ? spec.ancillaryRateM2 
    : (isH3 ? 870 : (isH1 || isSS || isHBS) ? 700 : 740);
  const balconyRate = spec?.ancillaryRateM2 && spec.ancillaryRateM2 > 0 && spec.ancillaryRateM2 !== 869 
    ? spec.ancillaryRateM2 
    : (isH3 ? 2150 : (isH1 || isSS || isHBS) ? 2000 : 2050);

  let alfrescoRate = isH3 ? 1050 : (isH1 || isSS || isHBS) ? 870 : 920;
  if (spec?.ancillaryRateM2 && spec.ancillaryRateM2 > 0 && spec.ancillaryRateM2 !== 869) {
    alfrescoRate = spec.ancillaryRateM2;
  }

  // Living rate decay:
  // Single Storey H2 living rate decays from $2,530/m² at ~120m² down to $1,780/m² at >=500m²
  // Calibrated so a typical 200m² SS custom (~145m² living + garage/alfresco/porch) is ~$31,000 above standard project homes (~$389k vs ~$358k)
  const floorLivingSS = 1780;
  const startLivingSS = 2530;

  // Double Storey H2 living rates decay: GF from $2,560 down to $1,790; FF from $2,850 down to $1,980
  // Calibrated so a 300m² DS custom is ~$48,000 above standard project homes (~$613k vs ~$565k)
  const floorGfLivingDS = 1790;
  const startGfLivingDS = 2560;
  const floorFfLivingDS = 1980;
  const startFfLivingDS = 2850;

  const effectiveM2 = totalM2 > 0 ? totalM2 : 200;
  const decayRateSS = Math.exp(-Math.max(0, effectiveM2 - 120) / 160);
  const decayRateDS = Math.exp(-Math.max(0, effectiveM2 - 140) / 170);

  // Tier adjustments on living rate
  let tierAdj = 0;
  if (isHBS) tierAdj = -250;
  else if (isSS) tierAdj = -150;
  else if (isH1) tierAdj = -80;
  else if (isH3) tierAdj = 150;

  let groundLivingRate = 0;
  let firstLivingRate = 0;
  const scaffoldingAllowance = isDouble
    ? (spec?.scaffoldingAllowance && spec.scaffoldingAllowance > 0 ? spec.scaffoldingAllowance : 8500)
    : 0;

  if (!isDouble) {
    groundLivingRate = Math.round(floorLivingSS + (startLivingSS - floorLivingSS) * decayRateSS + tierAdj);
  } else {
    groundLivingRate = Math.round(floorGfLivingDS + (startGfLivingDS - floorGfLivingDS) * decayRateDS + tierAdj);
    firstLivingRate = Math.round(floorFfLivingDS + (startFfLivingDS - floorFfLivingDS) * decayRateDS + tierAdj * 1.08);
  }

  // Respect manual overrides ONLY if explicitly flagged or genuine non-placeholder override,
  // and ALWAYS preserve tier adjustments (+150 for H3, -80 for H1) so switching inclusions works properly.
  const isLegacyPlaceholderRate = (rate?: number) => {
    if (!rate || rate <= 0) return true;
    const legacyValues = [1660, 1580, 1720, 1500, 1800, 2050, 1620, 2360, 2380, 2650, 2065, 1917, 2132];
    return legacyValues.includes(rate);
  };

  if (spec?.isManualRateOverride) {
    if (spec.groundRateM2 && spec.groundRateM2 > 0) {
      groundLivingRate = Math.round(spec.groundRateM2 + tierAdj);
    }
    if (spec.upperRateM2 && spec.upperRateM2 > 0) {
      firstLivingRate = Math.round(spec.upperRateM2 + tierAdj * 1.08);
    }
  } else {
    if (spec?.groundRateM2 && spec.groundRateM2 > 0 && !isLegacyPlaceholderRate(spec.groundRateM2)) {
      groundLivingRate = Math.round(spec.groundRateM2 + tierAdj);
    }
    if (spec?.upperRateM2 && spec.upperRateM2 > 0 && !isLegacyPlaceholderRate(spec.upperRateM2)) {
      firstLivingRate = Math.round(spec.upperRateM2 + tierAdj * 1.08);
    }
  }

  // Compute preliminary total to check >= 500m² floor guarantee
  const groundLivingArea = Number(spec?.groundLivingM2) || 0;
  const firstLivingArea = isDouble ? (Number(spec?.firstLivingM2) || 0) : 0;
  const garageArea = Number(spec?.garageM2) || 0;
  const alfrescoArea = Number(spec?.alfrescoM2) || 0;
  const porchArea = Number(spec?.porchM2) || 0;
  const balconyArea = isDouble ? (Number(spec?.balconyM2) || 0) : 0;

  const totalCost = Math.round(
    groundLivingArea * groundLivingRate +
    firstLivingArea * firstLivingRate +
    garageArea * garageRate +
    alfrescoArea * alfrescoRate +
    porchArea * porchRate +
    balconyArea * balconyRate +
    scaffoldingAllowance
  );

  const blendedRate = totalM2 > 0 ? Math.round(totalCost / totalM2) : (!isDouble ? groundLivingRate : Math.round((groundLivingRate + firstLivingRate) / 2));

  return {
    groundLivingRate,
    firstLivingRate,
    garageRate,
    alfrescoRate,
    porchRate,
    balconyRate,
    scaffoldingAllowance,
    blendedRate,
    totalM2,
  };
}

/**
 * Calculates base price for custom floorplan based on area dimensions, dynamic gradient decay, and tier.
 */
export function calculateCustomFloorplanPrice(
  spec?: CustomFloorplanSpec,
  tier: string = "H2 Design Inclusions",
): number {
  if (!spec) return 0;
  const isDouble = spec.storeys === "double";
  const rates = getCustomAreaRates(spec, tier);

  const groundLivingArea = Number(spec.groundLivingM2) || 0;
  const firstLivingArea = isDouble ? (Number(spec.firstLivingM2) || 0) : 0;
  const garageArea = Number(spec.garageM2) || 0;
  const alfrescoArea = Number(spec.alfrescoM2) || 0;
  const porchArea = Number(spec.porchM2) || 0;
  const balconyArea = isDouble ? (Number(spec.balconyM2) || 0) : 0;
  const totalM2 = calculateCustomTotalM2(spec);

  let rawCost = Math.round(
    groundLivingArea * rates.groundLivingRate +
    firstLivingArea * rates.firstLivingRate +
    garageArea * rates.garageRate +
    alfrescoArea * rates.alfrescoRate +
    porchArea * rates.porchRate +
    balconyArea * rates.balconyRate +
    rates.scaffoldingAllowance
  );

  // Enforce >= 500m² asymptotic floor rates for H2/SS builds
  const tierStr = String(tier || "H2").toUpperCase();
  const isH2OrSS = !tierStr.includes("HBS");
  if (totalM2 >= 500 && isH2OrSS) {
    const floorRate = !isDouble ? 1500 : 1600;
    const floorTotal = Math.round(totalM2 * floorRate);
    if (rawCost < floorTotal) {
      rawCost = floorTotal;
    }
  }

  return rawCost;
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
  if (item.category) {
    return item.category;
  }

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
 *  - Alfresco: $870 / m²
 *  - Porch: $700 / m²
 *  - Garage: $1,300 / m²
 * Double Storey:
 *  - Ground Floor Living: $1,480 / m²
 *  - First Floor Living: $1,780 / m²
 *  - Alfresco: $870 / m²
 *  - Porch: $700 / m²
 *  - Balcony (if added): $2,000 / m²
 *  - Garage: $1,300 / m²
 * Duplex and Split Level:
/**
 * Dynamic spatial modification rates per housing type according to the active specification tier (H1, H2, H3).
 * Calibrated rates:
 *  - H1: GF: $1370, FF: $1580, Porch: $700, Alfresco: $870, Balcony: $2000, Garage: $1300
 *  - H2: GF: $1420, FF: $1630, Porch: $740, Alfresco: $920, Balcony: $2050, Garage: $1330
 *  - H3: GF: $1550, FF: $1760, Porch: $870, Alfresco: $1050, Balcony: $2150, Garage: $1370
 * Reductions are discounted at 80% (i.e. deduction = deltaM2 * rate * 0.8)
 */
export function getModifiedSqmRates(specTier?: string) {
  const norm = normalizeInclusionTier(specTier);
  const t = EXTENSION_RATES_BY_TIER[norm];
  return {
    "Single Storey": {
      livingM2: t.gf,
      garageM2: t.garage,
      alfrescoM2: t.alfresco,
      porchM2: t.porch,
    },
    "Double Storey": {
      groundLivingM2: t.gf,
      firstLivingM2: t.ff,
      garageM2: t.garage,
      alfrescoM2: t.alfresco,
      porchM2: t.porch,
      balconyM2: t.balcony,
    },
    "Split Level": {
      groundLivingM2: t.gf,
      firstLivingM2: t.ff,
      garageM2: t.garage,
      alfrescoM2: t.alfresco,
      porchM2: t.porch,
      balconyM2: t.balcony,
    },
    "Dual Living": {
      groundLivingM2: t.gf,
      firstLivingM2: t.ff,
      garageM2: t.garage,
      alfrescoM2: t.alfresco,
      porchM2: t.porch,
      balconyM2: t.balcony,
    },
  };
}

export const MODIFIED_SQM_RATES = getModifiedSqmRates("H2");

/**
 * Detects whether a design is a double storey design, including standard Double Storey,
 * custom double storey, and Two Story duplexes (TD Two Story, SD Two Story).
 */
export function isDoubleStoreyDesign(
  designName?: string,
  housingType?: string,
  storeys?: string,
): boolean {
  if (
    housingType === "Double Storey" ||
    storeys === "double" ||
    storeys === "2" ||
    storeys === "two"
  ) {
    return true;
  }
  const dn = (designName || "").toLowerCase();
  const ht = (housingType || "").toLowerCase();

  // Explicit single-storey checks (e.g. Alabaster, Single Storey, Granny Flat)
  if (
    housingType === "Single Storey" ||
    housingType === "Granny Flat" ||
    storeys === "single" ||
    storeys === "1" ||
    storeys === "one" ||
    dn.includes("alabaster")
  ) {
    return false;
  }

  if (
    dn.includes("two story") ||
    dn.includes("two storey") ||
    dn.includes("2 story") ||
    dn.includes("2 storey") ||
    dn.includes("2-storey") ||
    dn.includes("2stry") ||
    dn.includes("double storey") ||
    dn.includes("double-storey") ||
    (dn.includes(" - sd") && (dn.includes("two") || dn.includes("2")))
  ) {
    return true;
  }

  // Dual Living / Duplex models that are strictly two-storey
  if (
    dn.includes("cayene") ||
    dn.includes("cayenne") ||
    dn.includes("magnolia") ||
    dn.includes("maize") ||
    dn.includes("raven") ||
    dn.includes("teal 45") ||
    dn.includes("teal 48") ||
    dn.includes("teal 37") ||
    dn.includes("wisteria")
  ) {
    return true;
  }

  if (
    ht.includes("double") ||
    ht.includes("two") ||
    ((ht.includes("duplex") || ht.includes("dual")) &&
      (dn.includes("two") || dn.includes("2") || storeys === "double" || storeys === "2"))
  ) {
    return true;
  }

  return false;
}

/**
 * Standard Area Breakdown catalog for Hudson Homes designs.
 */
export const HUDSON_STANDARD_AREAS: Record<string, FloorplanAreaBreakdown> = {
  "Aqua 1": {"livingM2":55.9,"garageM2":0,"alfrescoM2":0,"porchM2":4.06,"totalM2":59.96},
  "Aqua 2": {"livingM2":56.0,"garageM2":0,"alfrescoM2":0,"porchM2":4.0,"totalM2":60.0},
  "Aqua 3": {"livingM2":55.9,"garageM2":0,"alfrescoM2":0,"porchM2":4.0,"totalM2":59.9},
  "Aqua 4": {"livingM2":55.94,"garageM2":0,"alfrescoM2":0,"porchM2":4.0,"totalM2":59.94},
  "Aqua 5": {"livingM2":55.14,"garageM2":0,"alfrescoM2":0,"porchM2":4.0,"totalM2":59.14},
  "Alabaster 31": {"livingM2":229.06,"garageM2":38.52,"alfrescoM2":13.82,"porchM2":3.44,"totalM2":284.86},
  "Alabaster 36": {"livingM2":268.12,"garageM2":40.78,"alfrescoM2":18.6,"porchM2":3.16,"totalM2":330.66},
  "Alabaster 40": {"livingM2":309.64,"garageM2":40.78,"alfrescoM2":19.44,"porchM2":3.16,"totalM2":373.02},
  "Amber 21": {"livingM2":147.56,"garageM2":36,"alfrescoM2":9.54,"porchM2":2.25,"totalM2":195.35},
  "Amber 23": {"livingM2":164.26,"garageM2":36,"alfrescoM2":11.23,"porchM2":2.25,"totalM2":213.74},
  "Amber 26": {"livingM2":194.14,"garageM2":36,"alfrescoM2":12.11,"porchM2":2.14,"totalM2":244.39},
  "Amber 30": {"livingM2":231.69,"garageM2":36,"alfrescoM2":16.16,"porchM2":2.14,"totalM2":285.99},
  "Azure 19": {"livingM2":132.4,"garageM2":32.89,"alfrescoM2":10.11,"porchM2":1.68,"totalM2":177.08},
  "Azure 21": {"livingM2":148.28,"garageM2":36,"alfrescoM2":11.23,"porchM2":2.84,"totalM2":198.35},
  "Azure 23": {"livingM2":161.31,"garageM2":34.27,"alfrescoM2":11.4,"porchM2":1.73,"totalM2":208.71},
  "Azure 25": {"livingM2":187.12,"garageM2":36,"alfrescoM2":11.76,"porchM2":2.18,"totalM2":237.06},
  "Blanc 27": {"livingM2":199.46,"garageM2":36,"alfrescoM2":12.24,"porchM2":1.98,"totalM2":249.68},
  "Burgundy 27": {"groundLivingM2":101.54,"firstLivingM2":103.62,"garageM2":36,"alfrescoM2":11.88,"porchM2":3.88,"balconyM2":0,"totalM2":256.92},
  "Burgundy 30": {"groundLivingM2":115.35,"firstLivingM2":113.61,"garageM2":36,"alfrescoM2":14.73,"porchM2":4.37,"balconyM2":0,"totalM2":284.06},
  "Burgundy 32": {"groundLivingM2":124.76,"firstLivingM2":123.65,"garageM2":36,"alfrescoM2":14.73,"porchM2":4.37,"balconyM2":0,"totalM2":303.51},
  "Burgundy 34": {"groundLivingM2":133.91,"firstLivingM2":131.5,"garageM2":36.67,"alfrescoM2":15.68,"porchM2":4.37,"balconyM2":0,"totalM2":322.13},
  "Canary 1": {"livingM2":88.73,"garageM2":18.56,"alfrescoM2":8.93,"porchM2":1.42,"totalM2":117.64},
  "Canary 2": {"livingM2":84.99,"garageM2":18.56,"alfrescoM2":8.06,"porchM2":1.42,"totalM2":113.03},
  "Canary 3": {"livingM2":97.86,"garageM2":18.56,"alfrescoM2":9.36,"porchM2":1.42,"totalM2":127.2},
  "Canary 4": {"livingM2":88.02,"garageM2":18.56,"alfrescoM2":9.36,"porchM2":1.42,"totalM2":117.36},
  "Carmine 17": {"livingM2":120.48,"garageM2":36,"alfrescoM2":7.25,"porchM2":1.38,"totalM2":165.11},
  "Carmine 19": {"livingM2":138.13,"garageM2":36,"alfrescoM2":7.51,"porchM2":1.38,"totalM2":183.02},
  "Carmine 21 MKII": {"livingM2":150.82,"garageM2":36,"alfrescoM2":7.51,"porchM2":2.24,"totalM2":196.57},
  "Carmine 21 MK2": {"livingM2":150.82,"garageM2":36,"alfrescoM2":7.51,"porchM2":2.24,"totalM2":196.57},
  "Carmine 21": {"livingM2":150.82,"garageM2":36,"alfrescoM2":7.51,"porchM2":2.24,"totalM2":196.57},
  "Carmine 23 MKII": {"livingM2":172.09,"garageM2":32.89,"alfrescoM2":8.79,"porchM2":1.42,"totalM2":215.19},
  "Carmine 23 MK2": {"livingM2":172.09,"garageM2":32.89,"alfrescoM2":8.79,"porchM2":1.42,"totalM2":215.19},
  "Carmine 23": {"livingM2":172.09,"garageM2":32.89,"alfrescoM2":8.79,"porchM2":1.42,"totalM2":215.19},
  "Carolina 22": {"groundLivingM2":72.48,"firstLivingM2":83.37,"garageM2":36,"alfrescoM2":9,"porchM2":4.56,"balconyM2":0,"totalM2":205.41},
  "Carolina 24": {"groundLivingM2":99.87,"firstLivingM2":75.16,"garageM2":36,"alfrescoM2":9.72,"porchM2":4.56,"balconyM2":0,"totalM2":225.31},
  "Carolina 26": {"groundLivingM2":84.88,"firstLivingM2":109.59,"garageM2":36,"alfrescoM2":10.43,"porchM2":4.56,"balconyM2":0,"totalM2":245.46},
  "Carolina 29": {"groundLivingM2":97.79,"firstLivingM2":121.73,"garageM2":36,"alfrescoM2":9.45,"porchM2":4.56,"balconyM2":0,"totalM2":269.53},
  "Cayenne 42": {"groundLivingM2":155.46,"firstLivingM2":170.52,"garageM2":39.48,"alfrescoM2":19.74,"porchM2":4.16,"balconyM2":0,"totalM2":389.36},
  "Cayenne 45": {"groundLivingM2":169.64,"firstLivingM2":182.82,"garageM2":39.62,"alfrescoM2":23.62,"porchM2":4.58,"balconyM2":0,"totalM2":420.28},
  "Cayenne 47": {"groundLivingM2":156.48,"firstLivingM2":209.4,"garageM2":39.48,"alfrescoM2":27.3,"porchM2":4.28,"balconyM2":0,"totalM2":436.94},
  "Cayenne 56": {"groundLivingM2":208.26,"firstLivingM2":228.2,"garageM2":42.6,"alfrescoM2":39.62,"porchM2":4.58,"balconyM2":0,"totalM2":523.26},
  "Cedar 26": {"livingM2":195.33,"garageM2":36,"alfrescoM2":9.63,"porchM2":3.86,"totalM2":244.82},
  "Cedar 28": {"livingM2":214.28,"garageM2":36,"alfrescoM2":10.05,"porchM2":3.49,"totalM2":263.82},
  "Cedar 31": {"livingM2":240.39,"garageM2":36,"alfrescoM2":13.51,"porchM2":4,"totalM2":293.9},
  "Cedar 34": {"livingM2":262.07,"garageM2":36,"alfrescoM2":18.47,"porchM2":4.33,"totalM2":320.87},
  "Charcoal 24": {"livingM2":175.57,"garageM2":36,"alfrescoM2":11.23,"porchM2":2.3,"totalM2":225.1},
  "Cinnamon 23": {"groundLivingM2":99.91,"firstLivingM2":72.11,"garageM2":36,"alfrescoM2":9.5,"porchM2":2.79,"balconyM2":0,"totalM2":220.31},
  "Cobalt 22": {"groundLivingM2":90.13,"firstLivingM2":65.17,"garageM2":36,"alfrescoM2":11.9,"porchM2":2.26,"balconyM2":0,"totalM2":205.46},
  "Cobalt 26": {"livingM2":190.73,"garageM2":36,"alfrescoM2":15.01,"porchM2":2.4,"totalM2":244.14},
  "Cobalt 30": {"livingM2":229.38,"garageM2":36,"alfrescoM2":13.16,"porchM2":2.4,"totalM2":280.94},
  "Coral 19": {"livingM2":131.27,"garageM2":37.2,"alfrescoM2":9.02,"porchM2":3.63,"totalM2":181.12},
  "Coral 21": {"livingM2":147.52,"garageM2":37.97,"alfrescoM2":10.8,"porchM2":1.79,"totalM2":198.08},
  "Coral 23": {"livingM2":167.2,"garageM2":37.22,"alfrescoM2":11.26,"porchM2":2,"totalM2":217.68},
  "Coral 26": {"livingM2":188.14,"garageM2":38.2,"alfrescoM2":12.23,"porchM2":2.36,"totalM2":240.93},
  "Crimson 24": { "livingM2": 177.36, "garageM2": 33.32, "alfrescoM2": 10.63, "porchM2": 3.25, "totalM2": 224.56 },
  "Crimson 26": {"livingM2":196.35,"garageM2":33.35,"alfrescoM2":11.61,"porchM2":3.73,"totalM2":245.04},
  "Crimson 29": {"livingM2":221.57,"garageM2":36,"alfrescoM2":15.54,"porchM2":3.68,"totalM2":276.79},
  "Crimson 33": {"livingM2":240.54,"garageM2":36,"alfrescoM2":24.73,"porchM2":4.12,"totalM2":305.39},
  "Ebony 24": {"livingM2":179.37,"garageM2":36,"alfrescoM2":10.72,"porchM2":1.73,"totalM2":227.82},
  "Ebony 27": {"livingM2":200.89,"garageM2":36,"alfrescoM2":13.04,"porchM2":1.99,"totalM2":251.92},
  "Ebony 29": {"livingM2":221.28,"garageM2":36,"alfrescoM2":10.99,"porchM2":2.81,"totalM2":271.08},
  "Ebony 32": {"livingM2":239.9,"garageM2":36,"alfrescoM2":14.45,"porchM2":4.61,"totalM2":294.96},
  "Hazel 14": {"livingM2":98.63,"garageM2":18.93,"alfrescoM2":6.7,"porchM2":1.54,"totalM2":125.8},
  "Hazel 15": {"livingM2":112.96,"garageM2":18.8,"alfrescoM2":8.58,"porchM2":1.71,"totalM2":142.05},
  "Hazel 17": {"livingM2":128.04,"garageM2":18.8,"alfrescoM2":9.36,"porchM2":1.88,"totalM2":158.08},
  "Hazel 19": {"livingM2":142.62,"garageM2":18.8,"alfrescoM2":9.73,"porchM2":2.05,"totalM2":173.2},
  "Indigo 15": {"livingM2":111.61,"garageM2":21.43,"alfrescoM2":9.5,"porchM2":2.43,"totalM2":144.97},
  "Indigo 17": {"livingM2":128.41,"garageM2":21.43,"alfrescoM2":9.72,"porchM2":2.62,"totalM2":162.18},
  "Indigo 19": {"livingM2":141.34,"garageM2":21.43,"alfrescoM2":9.72,"porchM2":2.43,"totalM2":174.92},
  "Indigo 22": {"livingM2":170.96,"garageM2":21.43,"alfrescoM2":11.16,"porchM2":2.62,"totalM2":206.17},
  "Iris 15": {"livingM2":110.69,"garageM2":19.09,"alfrescoM2":7.56,"porchM2":1.73,"totalM2":139.07},
  "Iris 17": {"livingM2":132.69,"garageM2":19.09,"alfrescoM2":6.48,"porchM2":1.73,"totalM2":159.99},
  "Iris 18": {"livingM2":138.9,"garageM2":19.88,"alfrescoM2":7.92,"porchM2":1.88,"totalM2":168.58},
  "Iris 21": {"livingM2":160.19,"garageM2":19.35,"alfrescoM2":13.82,"porchM2":2.23,"totalM2":195.59},
  "Ivory 21": {"livingM2":151.69,"garageM2":36,"alfrescoM2":9.98,"porchM2":2.87,"totalM2":200.54},
  "Ivory 23": {"livingM2":167.37,"garageM2":36,"alfrescoM2":7.26,"porchM2":3.18,"totalM2":213.81},
  "Ivory 25": {"livingM2":186.69,"garageM2":36,"alfrescoM2":8.87,"porchM2":3.18,"totalM2":234.74},
  "Ivory 27": {"livingM2":201.42,"garageM2":36,"alfrescoM2":16.75,"porchM2":3.04,"totalM2":257.21},
  "Ivory 29": {"livingM2":222.9,"garageM2":36,"alfrescoM2":14.49,"porchM2":3.18,"totalM2":276.57},
  "Jade 21": {"livingM2":152.09,"garageM2":36,"alfrescoM2":10.08,"porchM2":1.75,"totalM2":199.92},
  "Jade 23": {"livingM2":166.88,"garageM2":36,"alfrescoM2":13.39,"porchM2":2.04,"totalM2":218.31},
  "Jasper 17": {"livingM2":118.81,"garageM2":36,"alfrescoM2":8.06,"porchM2":1.55,"totalM2":164.42},
  "Jasper 20": {"livingM2":139.63,"garageM2":36,"alfrescoM2":10.55,"porchM2":1.68,"totalM2":187.86},
  "Jasper 24": {"livingM2":171,"garageM2":36,"alfrescoM2":13.82,"porchM2":1.81,"totalM2":222.63},
  "Jasper 26": {"livingM2":190.91,"garageM2":36,"alfrescoM2":15.81,"porchM2":1.81,"totalM2":244.53},
  "Lime 19": {"groundLivingM2":72.52,"firstLivingM2":78.57,"garageM2":18.91,"alfrescoM2":9,"porchM2":2.07,"balconyM2":0,"totalM2":181.07},
  "Lime 21": {"groundLivingM2":82.96,"firstLivingM2":86.35,"garageM2":18.91,"alfrescoM2":9,"porchM2":2.07,"balconyM2":0,"totalM2":199.29},
  "Lime 23": {"groundLivingM2":86.62,"firstLivingM2":97.97,"garageM2":18.91,"alfrescoM2":9.69,"porchM2":2.41,"balconyM2":0,"totalM2":215.6},
  "Lime 25": {"groundLivingM2":100.4,"firstLivingM2":103.95,"garageM2":18.63,"alfrescoM2":10,"porchM2":2.59,"balconyM2":0,"totalM2":235.57},
  "Magenta 26": {"livingM2":194.51,"garageM2":36,"alfrescoM2":13.1,"porchM2":3.3,"totalM2":246.91},
  "Magenta 29": {"livingM2":217.78,"garageM2":36,"alfrescoM2":16.7,"porchM2":3.46,"totalM2":273.94},
  "Magenta 33": {"livingM2":240.6,"garageM2":36,"alfrescoM2":25.92,"porchM2":3.46,"totalM2":305.98},
  "Magenta 36": {"livingM2":269.02,"garageM2":36.34,"alfrescoM2":25.27,"porchM2":3.46,"totalM2":334.09},
  "Magnolia 34": {"groundLivingM2":55.2,"firstLivingM2":73.67,"garageM2":18.46,"alfrescoM2":6.74,"porchM2":1.94,"balconyM2":0,"totalM2":156.01},
  "Magnolia 37": {"groundLivingM2":59.11,"firstLivingM2":84.5,"garageM2":18.45,"alfrescoM2":9.47,"porchM2":1.94,"balconyM2":0,"totalM2":173.47},
  "Magnolia 43": {"groundLivingM2":76.87,"firstLivingM2":89.3,"garageM2":19,"alfrescoM2":9.35,"porchM2":3.12,"balconyM2":0,"totalM2":197.64},
  "Magnolia 45": {"groundLivingM2":78.42,"firstLivingM2":97.7,"garageM2":18.8,"alfrescoM2":11.56,"porchM2":3.06,"balconyM2":0,"totalM2":209.54},
  "Magnolia 47 MKII": {"groundLivingM2":90.47,"firstLivingM2":93.52,"garageM2":18.74,"alfrescoM2":10.89,"porchM2":2.63,"balconyM2":0,"totalM2":216.25},
  "Magnolia 53 MKII": {"groundLivingM2":90.53,"firstLivingM2":120.5,"garageM2":19.2,"alfrescoM2":13.37,"porchM2":3.52,"balconyM2":0,"totalM2":247.12},
  "Mahogany 38": {"groundLivingM2":147.43,"firstLivingM2":148.71,"garageM2":36,"alfrescoM2":16.32,"porchM2":3.03,"balconyM2":0,"totalM2":351.49},
  "Mahogany 43": {"groundLivingM2":169.54,"firstLivingM2":175.13,"garageM2":36,"alfrescoM2":15.32,"porchM2":3.03,"balconyM2":0,"totalM2":399.02},
  "Mahogany 48": {"groundLivingM2":190.21,"firstLivingM2":199.17,"garageM2":36,"alfrescoM2":20.51,"porchM2":3.03,"balconyM2":0,"totalM2":448.92},
  "Mahogany 56": {"groundLivingM2":209.35,"firstLivingM2":230.59,"garageM2":50.4,"alfrescoM2":22.46,"porchM2":3.03,"balconyM2":0,"totalM2":515.83},
  "Marigold 35": {"groundLivingM2":129.72,"firstLivingM2":143.31,"garageM2":36,"alfrescoM2":15.17,"porchM2":3.51,"balconyM2":0,"totalM2":327.71},
  "Mauve 24": {"lowerLivingM2":34.12,"groundLivingM2":64.16,"firstLivingM2":76.03,"garageM2":33.46,"alfrescoM2":13.83,"porchM2":2.64,"balconyM2":0,"totalM2":224.24},
  "Mauve 24 Classic": {"lowerLivingM2":34.12,"groundLivingM2":64.16,"firstLivingM2":76.03,"garageM2":33.46,"alfrescoM2":13.83,"porchM2":2.64,"balconyM2":0,"totalM2":224.24},
  "Mauve 28": {"lowerLivingM2":58.89,"groundLivingM2":53.91,"firstLivingM2":96.56,"garageM2":33.99,"alfrescoM2":13.24,"porchM2":2.65,"balconyM2":0,"totalM2":259.24},
  "Mauve 28 Classic": {"lowerLivingM2":58.89,"groundLivingM2":53.91,"firstLivingM2":96.56,"garageM2":33.99,"alfrescoM2":13.24,"porchM2":2.65,"balconyM2":0,"totalM2":259.24},
  "Mauve 28 (qld)": {"lowerLivingM2":58.89,"groundLivingM2":53.91,"firstLivingM2":96.56,"garageM2":33.99,"alfrescoM2":13.24,"porchM2":2.65,"balconyM2":0,"totalM2":259.24},
  "Mauve 32": {"lowerLivingM2":71.98,"groundLivingM2":65.03,"firstLivingM2":109.55,"garageM2":33.86,"alfrescoM2":15.00,"porchM2":2.65,"balconyM2":0,"totalM2":298.07},
  "Mauve 32 Classic": {"lowerLivingM2":71.98,"groundLivingM2":65.03,"firstLivingM2":109.55,"garageM2":33.86,"alfrescoM2":15.00,"porchM2":2.65,"balconyM2":0,"totalM2":298.07},
  "Mauve 35": {"lowerLivingM2":77.73,"groundLivingM2":79.44,"firstLivingM2":115.72,"garageM2":34.40,"alfrescoM2":18.72,"porchM2":2.65,"balconyM2":0,"totalM2":328.66},
  "Mauve 35 Classic": {"lowerLivingM2":77.73,"groundLivingM2":79.44,"firstLivingM2":115.72,"garageM2":34.40,"alfrescoM2":18.72,"porchM2":2.65,"balconyM2":0,"totalM2":328.66},
  "Mauve 35 (qld)": {"lowerLivingM2":77.73,"groundLivingM2":79.44,"firstLivingM2":115.72,"garageM2":34.40,"alfrescoM2":18.72,"porchM2":2.65,"balconyM2":0,"totalM2":328.66},
  "Mint 17": {"groundLivingM2":64.68,"firstLivingM2":67.16,"garageM2":18.63,"alfrescoM2":7.2,"porchM2":2.07,"balconyM2":0,"totalM2":159.74},
  "Mint 19": {"groundLivingM2":71.64,"firstLivingM2":76.99,"garageM2":18.63,"alfrescoM2":8.64,"porchM2":2.07,"balconyM2":0,"totalM2":177.97},
  "Mint 21": {"groundLivingM2":75.72,"firstLivingM2":81.93,"garageM2":18.63,"alfrescoM2":12.64,"porchM2":2.41,"balconyM2":0,"totalM2":191.33},
  "Mint 24": {"groundLivingM2":90.62,"firstLivingM2":96.16,"garageM2":18.63,"alfrescoM2":12.64,"porchM2":2.59,"balconyM2":0,"totalM2":220.64},
  "Mocha 24 Attached Garage": {"groundLivingM2":85.71,"firstLivingM2":89.17,"garageM2":36.78,"alfrescoM2":10.59,"porchM2":3.68,"balconyM2":0,"totalM2":225.93},
  "Mocha 24 Detached Garage": {"groundLivingM2":81.54,"firstLivingM2":89.86,"garageM2":36,"alfrescoM2":8.06,"porchM2":3.68,"balconyM2":0,"totalM2":219.14},
  "Mocha 25": {"groundLivingM2":77.13,"firstLivingM2":104.42,"garageM2":36,"alfrescoM2":12.1,"porchM2":4.49,"balconyM2":0,"totalM2":234.14},
  "Mocha 31": {"groundLivingM2":119.1,"firstLivingM2":117.42,"garageM2":36,"alfrescoM2":12.88,"porchM2":3.84,"balconyM2":0,"totalM2":289.24},
  "Mocha 35": {"groundLivingM2":124.45,"firstLivingM2":138.24,"garageM2":36,"alfrescoM2":18.89,"porchM2":3.84,"balconyM2":0,"totalM2":321.42},
  "Mulberry 22": {"livingM2":160.29,"garageM2":36,"alfrescoM2":10.28,"porchM2":3.83,"totalM2":210.4},
  "Mulberry 25": {"livingM2":184.34,"garageM2":36,"alfrescoM2":12.6,"porchM2":3.83,"totalM2":236.77},
  "Mulberry 28": {"livingM2":207.04,"garageM2":36,"alfrescoM2":13.3,"porchM2":3.83,"totalM2":260.17},
  "Mulberry 33": {"livingM2":246.64,"garageM2":36,"alfrescoM2":14.26,"porchM2":12.2,"totalM2":309.1},
  "Mulberry 39": {"livingM2":286.79,"garageM2":38.31,"alfrescoM2":27.04,"porchM2":13.09,"totalM2":365.23},
  "Olive 23": {"livingM2":164.43,"garageM2":36,"alfrescoM2":11.16,"porchM2":2.21,"totalM2":213.8},
  "Onyx 17": {"livingM2":116.7,"garageM2":36,"alfrescoM2":8.52,"porchM2":1.9,"totalM2":163.12},
  "Onyx 19": {"livingM2":134.55,"garageM2":36,"alfrescoM2":10.77,"porchM2":2.24,"totalM2":183.56},
  "Onyx 21": {"livingM2":151.24,"garageM2":36,"alfrescoM2":11.49,"porchM2":2.24,"totalM2":200.97},
  "Onyx 24": {"livingM2":180.15,"garageM2":36,"alfrescoM2":11.27,"porchM2":2.59,"totalM2":230.01},
  "Orchid 23": {"groundLivingM2":81.77,"firstLivingM2":93.87,"garageM2":18.86,"alfrescoM2":10.8,"porchM2":4.22,"balconyM2":0,"totalM2":209.52},
  "Orchid 25": {"groundLivingM2":88.64,"firstLivingM2":104.85,"garageM2":18.89,"alfrescoM2":12.24,"porchM2":4.32,"balconyM2":0,"totalM2":228.94},
  "Orchid 29": {"groundLivingM2":98.87,"firstLivingM2":117,"garageM2":36,"alfrescoM2":14.01,"porchM2":4.81,"balconyM2":0,"totalM2":270.69},
  "Orchid 34": {"groundLivingM2":119.44,"firstLivingM2":135.6,"garageM2":36,"alfrescoM2":20,"porchM2":4.43,"balconyM2":0,"totalM2":315.47},
  "Quartz 21": {"livingM2":153.96,"garageM2":36,"alfrescoM2":10.11,"porchM2":2.38,"totalM2":202.45},
  "Quartz 25": {"livingM2":181.77,"garageM2":36,"alfrescoM2":11.29,"porchM2":2.38,"totalM2":231.44},
  "Quartz 27": {"livingM2":203.19,"garageM2":36,"alfrescoM2":11.29,"porchM2":2.38,"totalM2":252.86},
  "Raven 45": {"groundLivingM2":85.28,"firstLivingM2":88.6,"garageM2":23.66,"alfrescoM2":9.78,"porchM2":1.94,"balconyM2":0,"totalM2":209.26},
  "Raven 55": {"groundLivingM2":109.53,"firstLivingM2":111.81,"garageM2":20.32,"alfrescoM2":12.42,"porchM2":2.42,"balconyM2":0,"totalM2":256.5},
  "Robin 5": {"groundLivingM2":80.38,"firstLivingM2":41.46,"garageM2":18.56,"alfrescoM2":6.48,"porchM2":2.52,"balconyM2":0,"totalM2":149.4},
  "Robin 6": {"groundLivingM2":65.85,"firstLivingM2":83.89,"garageM2":36,"alfrescoM2":7.2,"porchM2":3.24,"balconyM2":0,"totalM2":196.18},
  "Robin 7": {"groundLivingM2":75.26,"firstLivingM2":59.04,"garageM2":36,"alfrescoM2":7.2,"porchM2":2.98,"balconyM2":0,"totalM2":180.48},
  "Robin 8": {"groundLivingM2":62.6,"firstLivingM2":78.86,"garageM2":21.52,"alfrescoM2":7.2,"porchM2":2.85,"balconyM2":0,"totalM2":173.03},
  "Rose 34": {"groundLivingM2":129.81,"firstLivingM2":136.69,"garageM2":36,"alfrescoM2":13.5,"porchM2":4.95,"balconyM2":0,"totalM2":320.95},
  "Rose 38": {"groundLivingM2":146.89,"firstLivingM2":151.32,"garageM2":36.98,"alfrescoM2":15,"porchM2":4.72,"balconyM2":0,"totalM2":354.91},
  "Rose 43": {"groundLivingM2":171.28,"firstLivingM2":174.9,"garageM2":36.59,"alfrescoM2":15,"porchM2":3.74,"balconyM2":0,"totalM2":401.51},
  "Rosewood 30": {"groundLivingM2":37.23,"firstLivingM2":185.19,"garageM2":38.88,"alfrescoM2":16.89,"porchM2":7.31,"balconyM2":0,"totalM2":285.5},
  "Ruby 19": {"groundLivingM2":60.86,"firstLivingM2":85.34,"garageM2":18.35,"alfrescoM2":8.32,"porchM2":2.06,"balconyM2":0,"totalM2":174.93},
  "Ruby 21": {"groundLivingM2":69.31,"firstLivingM2":95.55,"garageM2":18.74,"alfrescoM2":9.85,"porchM2":2.06,"balconyM2":0,"totalM2":195.51},
  "Ruby 23": {"groundLivingM2":83.12,"firstLivingM2":100.12,"garageM2":18.7,"alfrescoM2":9.79,"porchM2":2.44,"balconyM2":0,"totalM2":214.17},
  "Ruby 26": {"groundLivingM2":78.29,"firstLivingM2":110.71,"garageM2":37.78,"alfrescoM2":13.57,"porchM2":2.44,"balconyM2":0,"totalM2":242.79},
  "Ruby 28": {"groundLivingM2":98.06,"firstLivingM2":128.9,"garageM2":19.88,"alfrescoM2":13.82,"porchM2":2.71,"balconyM2":0,"totalM2":263.37},
  "Sabel 28": {"groundLivingM2":90.11,"firstLivingM2":115.39,"garageM2":38.72,"alfrescoM2":10.62,"porchM2":2.45,"balconyM2":0,"totalM2":257.29},
  "Sabel 28 (qld)": {"groundLivingM2":90.11,"firstLivingM2":115.39,"garageM2":38.72,"alfrescoM2":10.62,"porchM2":2.45,"balconyM2":0,"totalM2":257.29},
  "Saffron 23": {"livingM2":167.1,"garageM2":36,"alfrescoM2":11.34,"porchM2":2.09,"totalM2":216.53},
  "Saffron 26": {"livingM2":194.8,"garageM2":36,"alfrescoM2":14.69,"porchM2":2.46,"totalM2":247.95},
  "Saffron 30": {"livingM2":232.91,"garageM2":36,"alfrescoM2":13.22,"porchM2":3.56,"totalM2":285.69},
  "Saffron 35": {"livingM2":259.38,"garageM2":36,"alfrescoM2":23.04,"porchM2":4.75,"totalM2":323.17},
  "Sienna 28": {"livingM2":209.6,"garageM2":36,"alfrescoM2":12.5,"porchM2":2.37,"totalM2":260.47},
  "Sienna 30": {"livingM2":232.47,"garageM2":36,"alfrescoM2":14.39,"porchM2":2.97,"totalM2":285.83},
  "Sienna 33": {"livingM2":247.35,"garageM2":36,"alfrescoM2":26.61,"porchM2":3.14,"totalM2":313.1},
  "Sienna 36": {"livingM2":264.01,"garageM2":36,"alfrescoM2":33.41,"porchM2":3.14,"totalM2":336.56},
  "Tangerine 37": {"groundLivingM2":146.47,"firstLivingM2":150.66,"garageM2":36,"alfrescoM2":13.5,"porchM2":2.98,"balconyM2":0,"totalM2":349.61},
  "Tangerine 41": {"groundLivingM2":163.15,"firstLivingM2":166.14,"garageM2":36,"alfrescoM2":11.99,"porchM2":3.15,"balconyM2":3.15,"totalM2":383.58},
  "Tangerine 44": {"groundLivingM2":177.45,"firstLivingM2":177.49,"garageM2":36.88,"alfrescoM2":17.5,"porchM2":3.15,"balconyM2":0,"totalM2":412.47},
  "Tangerine 49": {"groundLivingM2":185.54,"firstLivingM2":207.72,"garageM2":36.88,"alfrescoM2":19.87,"porchM2":3.15,"balconyM2":0,"totalM2":453.16},
  "Teal 45": {"groundLivingM2":78.97,"firstLivingM2":92.86,"garageM2":18.74,"alfrescoM2":10.68,"porchM2":2.62,"balconyM2":0,"totalM2":203.87},
  "Teal 48": {"groundLivingM2":47.73,"firstLivingM2":84.65,"garageM2":17.43,"alfrescoM2":14.29,"porchM2":4.8,"balconyM2":22.19,"totalM2":191.09},
  "Terracotta 23": {"groundLivingM2":79.9,"firstLivingM2":96.84,"garageM2":19.9,"alfrescoM2":10.86,"porchM2":4.08,"balconyM2":0,"totalM2":211.58},
  "Terracotta 30": {"groundLivingM2":107.13,"firstLivingM2":124.95,"garageM2":36,"alfrescoM2":12.95,"porchM2":3.83,"balconyM2":0,"totalM2":284.86},
  "Terracotta 36": {"groundLivingM2":130.32,"firstLivingM2":152.67,"garageM2":36,"alfrescoM2":16.13,"porchM2":3.83,"balconyM2":0,"totalM2":338.95},
  "Tiffany 22": {"livingM2":155.29,"garageM2":36,"alfrescoM2":12.05,"porchM2":2.7,"totalM2":206.04},
  "Tiffany 24": {"livingM2":173.86,"garageM2":36,"alfrescoM2":10.87,"porchM2":2.93,"totalM2":223.66},
  "Tiffany 27": {"livingM2":203.19,"garageM2":36,"alfrescoM2":10.86,"porchM2":2.79,"totalM2":252.84},
  "Tiffany 29": {"livingM2":221.29,"garageM2":36,"alfrescoM2":12.96,"porchM2":2.35,"totalM2":272.6},
  "Topaz 21": {"livingM2":153.45,"garageM2":36,"alfrescoM2":10.48,"porchM2":2.04,"totalM2":201.97},
  "Topaz 23": {"livingM2":166.11,"garageM2":36,"alfrescoM2":11.98,"porchM2":2.39,"totalM2":216.48},
  "Topaz 26": {"livingM2":190.2,"garageM2":36,"alfrescoM2":12.42,"porchM2":1.99,"totalM2":240.61},
  "Topaz 29": {"livingM2":214.38,"garageM2":37.12,"alfrescoM2":13.71,"porchM2":2.84,"totalM2":268.05},
  "Turquoise 24": {"groundLivingM2":79.28,"firstLivingM2":95.82,"garageM2":36,"alfrescoM2":9.72,"porchM2":3.07,"balconyM2":0,"totalM2":223.89},
  "Turquoise 25": {"groundLivingM2":85.79,"firstLivingM2":103.09,"garageM2":36,"alfrescoM2":9.27,"porchM2":3.16,"balconyM2":0,"totalM2":237.31},
  "Turquoise 26": {"groundLivingM2":88.36,"firstLivingM2":108.52,"garageM2":36,"alfrescoM2":11.16,"porchM2":2.81,"balconyM2":0,"totalM2":246.85},
  "Turquoise 28": {"groundLivingM2":99.97,"firstLivingM2":114.09,"garageM2":36,"alfrescoM2":12.24,"porchM2":2.81,"balconyM2":0,"totalM2":265.11},
  "Turquoise 31": {"groundLivingM2":115.59,"firstLivingM2":123.86,"garageM2":36,"alfrescoM2":13.5,"porchM2":2.81,"balconyM2":0,"totalM2":291.76},
  "Violet 33": {"groundLivingM2":129.13,"firstLivingM2":128.77,"garageM2":36,"alfrescoM2":14.37,"porchM2":3.66,"balconyM2":0,"totalM2":311.93},
  "Violet 40": {"groundLivingM2":142.08,"firstLivingM2":173.74,"garageM2":36,"alfrescoM2":18.97,"porchM2":3.9,"balconyM2":0,"totalM2":374.69},
  "Violet 45": {"groundLivingM2":161.17,"firstLivingM2":194.58,"garageM2":36,"alfrescoM2":18.97,"porchM2":4.54,"balconyM2":0,"totalM2":415.26},
  "Violet 48": {"groundLivingM2":184.67,"firstLivingM2":194.58,"garageM2":36,"alfrescoM2":22.54,"porchM2":4.54,"balconyM2":0,"totalM2":442.33},
  "Viridian 28": {"groundLivingM2":102.7,"firstLivingM2":111.93,"garageM2":36,"alfrescoM2":12,"porchM2":2.98,"balconyM2":0,"totalM2":265.61},
  "Viridian 32": {"groundLivingM2":113.73,"firstLivingM2":137.42,"garageM2":36,"alfrescoM2":16.69,"porchM2":3.22,"balconyM2":0,"totalM2":307.06},
  "Viridian 39": {"groundLivingM2":149.68,"firstLivingM2":152.6,"garageM2":36.39,"alfrescoM2":17.24,"porchM2":4.94,"balconyM2":0,"totalM2":360.85},
  "Viridian 43": {"groundLivingM2":151.89,"firstLivingM2":190.2,"garageM2":36,"alfrescoM2":19.01,"porchM2":4.18,"balconyM2":0,"totalM2":401.28},
  "Wisteria 22": {"livingM2":100.64,"garageM2":18.1,"alfrescoM2":6.05,"porchM2":1.58,"totalM2":126.37},
  "Wisteria 32": {"groundLivingM2":83.24,"firstLivingM2":95.97,"garageM2":36,"alfrescoM2":11.8,"porchM2":3.76,"balconyM2":0,"totalM2":230.77},
};

/**
 * Returns the standard area breakdown for a given Hudson Homes model.
 * If model is not explicitly defined, calculates realistic default proportions based on total m2.
 */
export function getStandardAreaBreakdown(
  designName?: string,
  housingType: string = "Single Storey",
  totalM2: number = 198.08,
): FloorplanAreaBreakdown {
  if (designName && HUDSON_STANDARD_AREAS[designName]) {
    return { ...HUDSON_STANDARD_AREAS[designName] };
  }

  // Check normalized clean name (strip - TD / - SD / Single/Two Story / parentheses)
  const cleanName = (designName || "")
    .replace(/\s*-\s*(TD|SD)\s*.*$/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();

  if (cleanName && HUDSON_STANDARD_AREAS[cleanName]) {
    return { ...HUDSON_STANDARD_AREAS[cleanName] };
  }

  const altName = cleanName.replace(/Cayene/i, "Cayenne");
  if (altName && HUDSON_STANDARD_AREAS[altName]) {
    return { ...HUDSON_STANDARD_AREAS[altName] };
  }

  // Case-insensitive lookup across HUDSON_STANDARD_AREAS
  const lowerTarget = (designName || "").toLowerCase().trim();
  const lowerClean = cleanName.toLowerCase();
  const lowerAlt = altName.toLowerCase();
  const foundAreaKey = Object.keys(HUDSON_STANDARD_AREAS).find((k) => {
    const lk = k.toLowerCase();
    return lk === lowerTarget || lk === lowerClean || lk === lowerAlt;
  });
  if (foundAreaKey) {
    return { ...HUDSON_STANDARD_AREAS[foundAreaKey] };
  }

  // Check official architectural CAD registry
  const cadEntry =
    (designName && HUDSON_CAD_REGISTRY[designName]) ||
    (cleanName && HUDSON_CAD_REGISTRY[cleanName]) ||
    (altName && HUDSON_CAD_REGISTRY[altName]);
  if (cadEntry) {
    return {
      livingM2: cadEntry.livingM2,
      garageM2: cadEntry.garageM2,
      alfrescoM2: cadEntry.alfrescoM2,
      porchM2: cadEntry.porchM2,
      totalM2: cadEntry.totalM2,
    };
  }

  const tot = totalM2 > 0 ? totalM2 : 200;

  if (housingType === "Granny Flat" || /^aqua\b/i.test(designName || "")) {
    const porch = 4.0;
    const living = Number((tot - porch).toFixed(2));
    return {
      livingM2: living,
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: porch,
      totalM2: tot,
    };
  }

  const isDouble = isDoubleStoreyDesign(designName, housingType);
  const isSplit = housingType === "Split Level";
  const isSingle = isSingleGarageDesign(designName, housingType) || totalM2 < 140;

  if (isDouble || isSplit) {
    const garage = isSingle
      ? Math.min(22, +(tot * 0.10).toFixed(2))
      : Math.max(36.0, Math.min(42, +(tot * 0.15).toFixed(2)));
    const alfresco = +(tot * 0.055).toFixed(2);
    const porch = +(tot * 0.025).toFixed(2);
    const balcony = 0;
    const remainingLiving = Math.max(0, +(tot - garage - alfresco - porch - balcony).toFixed(2));
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
    const garage = isSingle
      ? Math.min(22, +(tot * 0.12).toFixed(2))
      : Math.max(36.0, Math.min(40, +(tot * 0.175).toFixed(2)));
    const alfresco = +(tot * 0.06).toFixed(2);
    const porch = +(tot * 0.025).toFixed(2);
    const living = Math.max(0, +(tot - garage - alfresco - porch).toFixed(2));

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
    isDoubleStoreyDesign(design?.designName, housingType);

  const isQld =
    (design as any)?.state === "QLD" ||
    (design as any)?.division === "QLD" ||
    getActiveDivision() === "QLD";

  const tierKey = normalizeInclusionTier(design?.specTier);
  const activeTierRates = EXTENSION_RATES_BY_TIER[tierKey];
  const tierRatesConfig = getModifiedSqmRates(design?.specTier);
  const rateConfig = (tierRatesConfig[housingType as keyof typeof tierRatesConfig] ||
    tierRatesConfig["Single Storey"]) as Record<string, number>;

  const zones: ZoneVarianceResult[] = [];

  const rawStdGarage = stdAreas.garageM2 ?? 0;
  const modGarage = modAreas.garageM2 !== undefined ? Number(modAreas.garageM2) : rawStdGarage;
  const isSingle = isSingleGarageDesign(design?.designName, housingType) || rawStdGarage < 25;
  const effectiveStdGarage = rawStdGarage;
  const STANDARD_DOUBLE_GARAGE_COVERED_M2 = 34.2; // 5.7m x 6.0m covered as standard

  const computeZoneCost = (def: { key: string; label: string; std: number; mod: number; rate: number }): number => {
    const delta = Number((def.mod - def.std).toFixed(2));
    if (def.key === "garageM2" && !isSingle) {
      // Standard coverage up to 5.7x6.0 (34.20 m²). If changed to 5.7x6.0 exactly, or extended up to 5.7x6.0, charge $0!
      if (Math.abs(def.mod - STANDARD_DOUBLE_GARAGE_COVERED_M2) <= 0.05) {
        return 0;
      }
      if (delta > 0) {
        if (def.mod <= STANDARD_DOUBLE_GARAGE_COVERED_M2 + 0.05) {
          return 0;
        }
        const chargeableBase = Math.max(def.std, STANDARD_DOUBLE_GARAGE_COVERED_M2);
        const chargeableDelta = Math.max(0, Number((def.mod - chargeableBase).toFixed(2)));
        return Math.round(chargeableDelta * def.rate);
      } else if (delta < 0) {
        return Math.round(delta * def.rate * 0.8);
      }
      return 0;
    }
    if (delta > 0) {
      return Math.round(delta * def.rate);
    } else if (delta < 0) {
      // 80% discount on reduction
      return Math.round(delta * def.rate * 0.8);
    }
    return 0;
  };

  if (isDoubleOrSplit) {
    const hasLowerLiving =
      stdAreas.lowerLivingM2 !== undefined ||
      modAreas.lowerLivingM2 !== undefined ||
      housingType === "Split Level" ||
      Boolean(design?.designName && /mauve|split/i.test(design.designName));

    const zoneDefs: { key: string; label: string; std: number; mod: number; rate: number }[] = [
      ...(hasLowerLiving
        ? [
            {
              key: "lowerLivingM2",
              label: "Lower Ground Living",
              std: stdAreas.lowerLivingM2 ?? 0,
              mod: modAreas.lowerLivingM2 !== undefined ? Number(modAreas.lowerLivingM2) : (stdAreas.lowerLivingM2 ?? 0),
              rate: rateConfig.groundLivingM2 || activeTierRates.gf,
            },
          ]
        : []),
      {
        key: "groundLivingM2",
        label: "Ground Floor Living",
        std: stdAreas.groundLivingM2 ?? 0,
        mod: modAreas.groundLivingM2 !== undefined ? Number(modAreas.groundLivingM2) : (stdAreas.groundLivingM2 ?? 0),
        rate: rateConfig.groundLivingM2 || activeTierRates.gf,
      },
      {
        key: "firstLivingM2",
        label: hasLowerLiving ? "Upper Level Living" : "First Floor Living",
        std: stdAreas.firstLivingM2 ?? 0,
        mod: modAreas.firstLivingM2 !== undefined ? Number(modAreas.firstLivingM2) : (stdAreas.firstLivingM2 ?? 0),
        rate: rateConfig.firstLivingM2 || activeTierRates.ff,
      },
      {
        key: "garageM2",
        label: "Garage Area",
        std: effectiveStdGarage,
        mod: modGarage,
        rate: rateConfig.garageM2 || activeTierRates.garage,
      },
      {
        key: "alfrescoM2",
        label: "Alfresco Area",
        std: stdAreas.alfrescoM2 ?? 0,
        mod: modAreas.alfrescoM2 !== undefined ? Number(modAreas.alfrescoM2) : (stdAreas.alfrescoM2 ?? 0),
        rate: rateConfig.alfrescoM2 || activeTierRates.alfresco,
      },
      {
        key: "porchM2",
        label: "Porch Area",
        std: stdAreas.porchM2 ?? 0,
        mod: modAreas.porchM2 !== undefined ? Number(modAreas.porchM2) : (stdAreas.porchM2 ?? 0),
        rate: rateConfig.porchM2 || activeTierRates.porch,
      },
      {
        key: "balconyM2",
        label: "Balcony",
        std: stdAreas.balconyM2 ?? 0,
        mod: modAreas.balconyM2 !== undefined ? Number(modAreas.balconyM2) : (stdAreas.balconyM2 ?? 0),
        rate: rateConfig.balconyM2 || activeTierRates.balcony,
      },
    ];

    for (const def of zoneDefs) {
      const delta = Number((def.mod - def.std).toFixed(2));
      const cost = computeZoneCost(def);
      zones.push({
        key: def.key,
        label: def.label,
        standardM2: def.std,
        modifiedM2: def.mod,
        deltaM2: delta,
        ratePerM2: def.rate,
        isReduced: delta < 0 && cost < 0,
        costAdjustment: cost,
      });
    }
  } else {
    const hasBalcony =
      (stdAreas.balconyM2 && stdAreas.balconyM2 > 0) ||
      (modAreas.balconyM2 !== undefined && Number(modAreas.balconyM2) > 0);

    const zoneDefs: { key: string; label: string; std: number; mod: number; rate: number }[] = [
      {
        key: "livingM2",
        label: "Living Area",
        std: stdAreas.livingM2 ?? 0,
        mod: modAreas.livingM2 !== undefined ? Number(modAreas.livingM2) : (stdAreas.livingM2 ?? 0),
        rate: rateConfig.livingM2 || activeTierRates.gf,
      },
      {
        key: "garageM2",
        label: "Garage Area",
        std: effectiveStdGarage,
        mod: modGarage,
        rate: rateConfig.garageM2 || activeTierRates.garage,
      },
      {
        key: "alfrescoM2",
        label: "Alfresco Area",
        std: stdAreas.alfrescoM2 ?? 0,
        mod: modAreas.alfrescoM2 !== undefined ? Number(modAreas.alfrescoM2) : (stdAreas.alfrescoM2 ?? 0),
        rate: rateConfig.alfrescoM2 || activeTierRates.alfresco,
      },
      {
        key: "porchM2",
        label: "Porch Area",
        std: stdAreas.porchM2 ?? 0,
        mod: modAreas.porchM2 !== undefined ? Number(modAreas.porchM2) : (stdAreas.porchM2 ?? 0),
        rate: rateConfig.porchM2 || activeTierRates.porch,
      },
      ...(hasBalcony
        ? [
            {
              key: "balconyM2",
              label: "Balcony",
              std: stdAreas.balconyM2 ?? 0,
              mod: modAreas.balconyM2 !== undefined ? Number(modAreas.balconyM2) : (stdAreas.balconyM2 ?? 0),
              rate: rateConfig.balconyM2 || activeTierRates.balcony,
            },
          ]
        : []),
    ];

    for (const def of zoneDefs) {
      const delta = Number((def.mod - def.std).toFixed(2));
      const cost = computeZoneCost(def);
      zones.push({
        key: def.key,
        label: def.label,
        standardM2: def.std,
        modifiedM2: def.mod,
        deltaM2: delta,
        ratePerM2: def.rate,
        isReduced: delta < 0 && cost < 0,
        costAdjustment: cost,
      });
    }
  }

  // Process any custom floor areas dynamically added by the estimator / user
  const customAreasList = modAreas.customAreas || (design as any)?.areas?.customAreas;
  if (Array.isArray(customAreasList)) {
    for (const ca of customAreasList) {
      const caM2 = Number(ca.m2) || 0;
      if (ca && caM2 > 0) {
        const rate = Number(ca.ratePerM2) || (activeTierRates as any).ancillary || activeTierRates.alfresco || 780;
        const cost = Math.round(caM2 * rate);
        zones.push({
          key: `custom_${ca.id || ca.name}`,
          label: ca.name || "Custom Floor Area",
          standardM2: 0,
          modifiedM2: caM2,
          deltaM2: caM2,
          ratePerM2: rate,
          isReduced: false,
          costAdjustment: cost,
        });
      }
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
 * Shortens and aesthetically beautifies design model names by removing internal price-list codes
 * like "- TD - (Old Design) Two Story", "- TD - (New Design)", "- TD Single Story", etc.
 * Example: "Maize 33 - TD - (Old Design) Two Story" -> "Maize 33"
 */
export function cleanDesignName(name?: string): string {
  if (!name) return "";
  let clean = name;
  // Remove parenthetical internal design markers e.g. (Old Design), (New Design), (Updated Design)
  clean = clean.replace(/\s*\((?:Old|New|Updated)\s+Design\)/gi, "");
  // Remove technical TD / SD / Duplex markers
  clean = clean.replace(/\s*-\s*T[D|d](?:\s*-\s*)?/gi, " ");
  clean = clean.replace(/\s*-\s*S[D|d](?:\s*-\s*)?/gi, " ");
  // Remove trailing "Two Story", "Single Story", "2-Storey", etc.
  clean = clean.replace(/\s+(?:Two|Single)\s+Stor(?:y|ey)\b/gi, "");
  // Standardize multiple spaces or leftover hyphens
  clean = clean.replace(/\s*-\s*$/g, "").replace(/\s{2,}/g, " ").trim();
  return clean;
}

/**
 * Returns the customer/consultant facing floorplan design name.
 * If modified floorplan is enabled, appends "Modified" (e.g. "Coral 21 Modified").
 */
export function getEffectiveDesignName(design?: QuoteDesignSelection): string {
  if (!design) return "No Design Selected";
  if (design.mode === "custom_floorplan") {
    return `Custom Architectural Plan (${design.customSpec?.storeys === "double" ? "Two" : "Single"} Storey)`;
  }
  const raw = design.designName || "";
  if (!raw.trim()) {
    return "No Design Selected";
  }
  const cleaned = cleanDesignName(raw);
  if (design.isModifiedFloorplan) {
    if (!cleaned.toLowerCase().includes("modified")) {
      return `${cleaned} Modified`;
    }
  }
  return cleaned;
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
 * Automated promotion discount:
 * Previously tiered ($30,000 for <43sq, $35,000 for 43-53sq, $40,000 for 53-62sq, $47,000 for 63sq+),
 * now removed and directly built into base prices with a $10,000 buffer.
 * Automated promo is now $0, with discretionary 'Managers Discount' for sales consultants.
 */
export function getAutomatedPromotionDiscount(designM2: number): number {
  return 0;
}

/**
 * Calculates GFA (Ground Floor Area = Ground living + Porch + Garage + Alfresco).
 */
export function calculateDesignGFA(design: QuoteDesignSelection): number {
  if (design.mode === "custom_floorplan") {
    const spec = design.customSpec;
    const gLiving = Number(spec?.groundLivingM2) || 0;
    const garage = Number(spec?.garageM2) || 0;
    const alfresco = Number(spec?.alfrescoM2) || 0;
    const porch = Number(spec?.porchM2) || 0;
    const totalGround = gLiving + garage + alfresco + porch;
    if (totalGround > 0) {
      return Number(totalGround.toFixed(2));
    }
    return Number((Number(design.designM2) || 200).toFixed(2));
  }

  const isDouble = isDoubleStoreyDesign(
    design.designName,
    design.housingType,
    design.customSpec?.storeys,
  );
  const isSplit = design.housingType === "Split Level";

  const totalM2 = Number(design.designM2) || Number(design.standardDesignM2) || 192;

  // 1. Single Storey (including Single Storey Dual Occupancy / Duplexes like Alabaster)
  // The entire slab area is Ground Living + Garage + Porch + Alfresco = total plan area!
  if (!isDouble && !isSplit) {
    if (design.isModifiedFloorplan) {
      const calc = calculateModifiedFloorplanPricing(design);
      return Number(calc.modifiedTotalM2.toFixed(2));
    }
    const stdAreas = getStandardAreaBreakdown(
      design.designName,
      design.housingType,
      totalM2,
    );
    const living = stdAreas.livingM2 || stdAreas.groundLivingM2 || 0;
    const garage = stdAreas.garageM2 || 0;
    const alfresco = stdAreas.alfrescoM2 || 0;
    const porch = stdAreas.porchM2 || 0;
    const sum = living + garage + alfresco + porch;
    if (sum > 0) {
      return Number(sum.toFixed(2));
    }
    return Number((totalM2 || 192).toFixed(2));
  }

  // 2. Double Storey or Split Level:
  // Footprint is ground floor slab: Lower Ground Living + Ground Living + Garage + Porch + Alfresco
  if (design.isModifiedFloorplan) {
    const calc = calculateModifiedFloorplanPricing(design);
    const gLiving = calc.zones.find((z) => z.key === "groundLivingM2")?.modifiedM2 || 0;
    const lowerLiving = calc.zones.find((z) => z.key === "lowerLivingM2")?.modifiedM2 || 0;
    const garage = calc.zones.find((z) => z.key === "garageM2")?.modifiedM2 || 0;
    const alfresco = calc.zones.find((z) => z.key === "alfrescoM2")?.modifiedM2 || 0;
    const porch = calc.zones.find((z) => z.key === "porchM2")?.modifiedM2 || 0;
    if (gLiving > 0 || lowerLiving > 0) {
      return Number((lowerLiving + gLiving + garage + alfresco + porch).toFixed(2));
    }
    return Number(calc.modifiedTotalM2.toFixed(2));
  }

  const stdAreas = getStandardAreaBreakdown(
    design.designName,
    design.housingType,
    totalM2,
  );
  const gLiving = (stdAreas.lowerLivingM2 || 0) + (stdAreas.groundLivingM2 || 0);
  const garage = stdAreas.garageM2 || 0;
  const alfresco = stdAreas.alfrescoM2 || 0;
  const porch = stdAreas.porchM2 || 0;

  // If explicit ground living is provided and > 0
  if (gLiving > 0) {
    return Number((gLiving + garage + alfresco + porch).toFixed(2));
  }

  // If stdAreas only has livingM2 (not split into ground/first), DO NOT drop ground living to 0!
  if (stdAreas.livingM2 && stdAreas.livingM2 > 0) {
    if (!stdAreas.firstLivingM2) {
      return Number(((stdAreas.livingM2 || 0) + garage + alfresco + porch).toFixed(2));
    }
    const estimatedGroundLiving = +(stdAreas.livingM2 * 0.50).toFixed(2);
    return Number((estimatedGroundLiving + garage + alfresco + porch).toFixed(2));
  }

  return Number(((totalM2 || 200) * 0.58).toFixed(2));
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
 * Standard Wind Rating default allowances (AS 4055 / NCC):
 * - N1 / N2: $0 (Standard Included)
 * - N3: $4,000
 * - N4: $7,500
 * - C1: $11,000
 * - C2: $15,500
 */
export function getWindRatingDefaultCost(windRating?: string): number {
  switch (windRating) {
    case "N1":
    case "N2":
      return 0;
    case "N3":
      return 4000;
    case "N4":
      return 7500;
    case "C1":
      return 11000;
    case "C2":
      return 15500;
    default:
      return 0;
  }
}

/**
 * Calculates topography fall cost with smooth progressive gradient:
 * - Base allowance covers up to 1.0m fall ($0 included).
 * - Above 1.0m: Progressive gradient curve scaling smoothly from base rate up to a max capped rate of $20.
 * - Standard: scales smoothly from $15.00 up to $20.00 max per 0.1m / m² GFA.
 * - Split Level: scales smoothly from $12.50 up to $16.00 max per 0.1m / m² GFA.
 */
export function calculateTopographyFallCost(
  fallMeters: number | undefined | null,
  gfaM2: number,
  isSplitLevel: boolean = false,
): number {
  const fall = typeof fallMeters === "number" && !isNaN(fallMeters) ? fallMeters : Number(fallMeters) || 0;
  if (fall <= 1.0) return 0;

  const excessMeters = Math.max(0, fall - 1.0);
  const tenths = excessMeters * 10;

  const baseRate = isSplitLevel ? 12.5 : 15.0;
  const maxRate = isSplitLevel ? 16.0 : 20.0;

  // Progressive gradient curve scaling with depth, capping at maxRate
  const gradientProgress = Math.min(1.0, excessMeters / 1.0);
  const blendedRate = baseRate + gradientProgress * (maxRate - baseRate);
  const cappedRate = Math.min(maxRate, blendedRate);

  const costPerM2 = tenths * cappedRate;
  return Math.round(costPerM2 * (Number(gfaM2) || 0));
}

/**
 * Calculates Bushfire Attack Level (BAL) cost tailored to design selected, exact window/door schedules,
 * house size, and modified plan scaling under AS 3959.
 */
export function getBushfireCost(
  bal: "None" | "BAL-LOW" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40",
  isDoubleStorey: boolean = false,
  designOrName?: any,
  gfaM2?: number
): number {
  return getTailoredBushfireCost(bal, isDoubleStorey, designOrName, gfaM2);
}

export { calculateTailoredBushfireCost, resolveDesignSchedule, type BushfireCostBreakdown };


/**
 * Calculates Acoustic Attenuation Requirements cost tailored to design selected, exact window/door schedules,
 * house size, and modified plan scaling under AS/NZS 2107 & QDC MP 4.4.
 */
export function getAcousticCost(
  tier: "None" | "Category 1" | "Category 2" | "Category 3",
  isDoubleStorey: boolean = false,
  designOrName?: any,
  gfaM2?: number
): number {
  const validTiers = ["Category 1", "Category 2", "Category 3"];
  if (!tier || tier === "None" || !validTiers.includes(tier)) return 0;
  return getTailoredAcousticCost(tier, isDoubleStorey, designOrName, gfaM2);
}

export { calculateTailoredAcousticCost, type AcousticCostBreakdown, type AcousticTierLevel };
export { calculateDuctedAcUpgrade, type DuctedAcUpgradeSpec, type CalculateDuctedAcOptions };

/**
 * Computes line item subtotal based on quantity and rate, dynamically calibrated to the inclusion tier.
 * User rule: Doors and windows are strictly uniform across all inclusion tiers.
 */
export function computeLineItemSubtotal(item: QuoteSelectedLineItem, specTier?: string): number {
  if (!item.isIncluded) return 0;
  const qty = Number(item.quantity) || 1;
  const rate = getItemRateForInclusion(item, specTier);
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
  secondDwellingLineItems?: QuoteSelectedLineItem[],
): QuotePricingSummary {
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    design.housingType,
    design.customSpec?.storeys,
  );
  const isSplit = design.housingType === "Split Level" || design.customSpec?.storeys === "split";

  let baseHousePrice = 0;
  let customFloorplanPrice = 0;

  if (design.mode === "custom_floorplan") {
    customFloorplanPrice = calculateCustomFloorplanPrice(design.customSpec, design.specTier);
    baseHousePrice = customFloorplanPrice;
  } else if (design.isModifiedFloorplan) {
    const modCalc = calculateModifiedFloorplanPricing(design);
    // INVARIANT: Base house price strictly fixed at standard brochure baseline!
    baseHousePrice = Number(design.standardBasePrice) || Number(modCalc.standardBasePrice) || Number(design.basePrice) || 0;
  } else {
    baseHousePrice = Number(design.basePrice) || 0;
  }

  const facadePrice = Number(design.facadePrice) || 0;
  const promotionName = design.promotionName || "Managers Discount";
  const promotionsDiscount = Number(design.promotionsDiscount) || 0;

  // 2nd Dwelling or Granny Flat Calculation
  let secondDwellingPrice = 0;
  if (design.hasSecondDwelling && design.secondDwelling && design.secondDwelling.enabled) {
    const sd = design.secondDwelling;
    let sdBase = Number(sd.basePrice) || 0;
    if (sd.isModifiedFloorplan && sd.modifiedAreas && sd.standardAreas) {
      const livingDelta = (Number(sd.modifiedAreas.livingM2) || 0) - (Number(sd.standardAreas.livingM2) || 0);
      const sdStdGar = Number(sd.standardAreas.garageM2) || 0;
      const sdModGar = Number(sd.modifiedAreas.garageM2) || 0;
      const rawGarDelta = sdModGar - sdStdGar;
      const garageDelta = rawGarDelta > 0 && sdStdGar >= 25
        ? (sdModGar <= 34.25 ? 0 : Math.max(0, sdModGar - Math.max(sdStdGar, 34.2)))
        : rawGarDelta;
      const alfrescoDelta = (Number(sd.modifiedAreas.alfrescoM2) || 0) - (Number(sd.standardAreas.alfrescoM2) || 0);
      const porchDelta = (Number(sd.modifiedAreas.porchM2) || 0) - (Number(sd.standardAreas.porchM2) || 0);

      const sdTierKey = normalizeInclusionTier(design.specTier);
      const sdRates = EXTENSION_RATES_BY_TIER[sdTierKey];
      const livingCost = livingDelta >= 0 ? livingDelta * sdRates.gf : livingDelta * sdRates.gf * 0.8;
      const garageCost = garageDelta >= 0 ? garageDelta * sdRates.garage : garageDelta * sdRates.garage * 0.8;
      const alfrescoCost = alfrescoDelta >= 0 ? alfrescoDelta * sdRates.alfresco : alfrescoDelta * sdRates.alfresco * 0.8;
      const porchCost = porchDelta >= 0 ? porchDelta * sdRates.porch : porchDelta * sdRates.porch * 0.8;

      sdBase += Math.round(livingCost + garageCost + alfrescoCost + porchCost);
    }
    const sdFacade = Number(sd.facadePrice) || 0;
    secondDwellingPrice = Math.max(0, sdBase + sdFacade);
  }

  // Calculate GFA (m2) of building footprint on slab
  const gfaM2 = calculateDesignGFA(design);

  // Landscaping and Driveway Packages (FHB and IP Turnkey Packages)
  const isFhbTier =
    (design.specTier || "").toLowerCase().includes("fhb") ||
    (design.specTier || "").toLowerCase().includes("start smart") ||
    (design.specTier || "").toLowerCase().includes("ip") ||
    (design.specTier || "").toLowerCase().includes("invest") ||
    (design.specTier || "").toLowerCase() === "ss" ||
    (design.specTier || "").toLowerCase().includes("smart series");

  // In FHB turnkey spec, landscaping up to 450m² is included by default ($0),
  // with -$6,000 credit for <=300m² and published surcharges above 450m².
  const landscapingCost = (design.landscapingSelected || isFhbTier)
    ? (typeof design.landscapingCost === "number" && !isNaN(design.landscapingCost)
        ? design.landscapingCost
        : landscapingPriceFor(design.landscapingLandSize || 450, design.housingType, design.designName, (design as any).state || (site as any).state, design.specTier))
    : 0;

  const exposedDrivewayCost = design.exposedDrivewaySelected && !design.landscapingSelected && !isFhbTier
    ? (Number(design.exposedDrivewayCost) > 0 ? Number(design.exposedDrivewayCost) : Math.round((Number(design.exposedDrivewayM2) || 55) * 230))
    : 0;

  // Dynamic Site & Statutory Calculations
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost =
    typeof site.soilTotalCost === "number" && !isNaN(site.soilTotalCost) && site.soilTotalCost > 0
      ? site.soilTotalCost
      : Math.round(soilRate * gfaM2);
  const fallTotalCost =
    typeof site.fallTotalCost === "number" && !isNaN(site.fallTotalCost) && site.fallTotalCost > 0
      ? site.fallTotalCost
      : calculateTopographyFallCost(site.fallMeters ?? (site as any).fallM ?? 0, gfaM2, isSplit);

  // Dedicated Site & Soil Engineering items
  const concrete32Cost = site.concrete32MpaRequired
    ? (Number(site.concrete32MpaCost) > 0 ? Number(site.concrete32MpaCost) : Math.round(gfaM2 * 14))
    : 0;
  const flexibleConnectionsCost = site.flexibleConnectionsRequired ? (Number(site.flexibleConnectionsCost) || 2500) : 0;

  // Site Overlay Reports (LHS)
  const bushfireReportCost = site.bushfireReportRequired ? (Number(site.bushfireReportCost) || 850) : 0;
  const floodReportCost = site.floodReportRequired ? (Number(site.floodReportCost) || 7600) : 0;
  const hydraulicReportCost = site.hydraulicReportRequired ? (Number(site.hydraulicReportCost) || 2600) : 0;
  const landslideReportCost = site.landslideReportRequired ? (Number(site.landslideReportCost) || 7000) : 0;
  const acousticReportCost = site.acousticReportRequired ? (Number(site.acousticReportCost) || 1200) : 0;
  const arboristReportCost = site.arboristReportRequired ? (Number(site.arboristReportCost) || 1100) : 0;
  const cctvSewerReportCost = site.cctvSewerReportRequired ? (Number(site.cctvSewerReportCost) || 3500) : 0;

  // Site Overlay Physical Allowances (RHS)
  const bushfireCost =
    site.bushfireCost !== undefined && site.bushfireCost !== null && !isNaN(Number(site.bushfireCost)) && Number(site.bushfireCost) > 0
      ? Number(site.bushfireCost)
      : getBushfireCost(site.bushfireBal, isDouble, design, gfaM2);
  const slabElevationCost = site.floodOverlayRequired
    ? (site.floodOverlayCost !== undefined && site.floodOverlayCost !== null && !isNaN(Number(site.floodOverlayCost)) && site.floodOverlayCost > 0
        ? Number(site.floodOverlayCost)
        : Math.round((Number(site.slabElevationMeters) || 0.3) * 270 * gfaM2))
    : 0;
  const isAcousticSelected =
    Boolean(
      site.acousticTier &&
      site.acousticTier !== "None" &&
      ["Category 1", "Category 2", "Category 3"].includes(site.acousticTier)
    );

  const acousticCost = isAcousticSelected
    ? site.acousticCost !== undefined && site.acousticCost !== null && !isNaN(Number(site.acousticCost)) && Number(site.acousticCost) > 0
        ? Number(site.acousticCost)
        : getAcousticCost(site.acousticTier, isDouble, design, gfaM2)
    : 0;

  // Council & Statutory
  const councilDaCost = site.councilDaRequired ? (Number(site.councilDaCost) || 11000) : 0;
  const councilSetbackRelaxationCost = site.councilSetbackRelaxationRequired
    ? (Number(site.councilSetbackRelaxationCost) || 2000)
    : 0;
  const trafficCost = (site.trafficControlRequired || (Number(site.trafficControlCost) > 0))
    ? (site.trafficControlCost !== undefined && site.trafficControlCost !== null && !isNaN(Number(site.trafficControlCost))
        ? Number(site.trafficControlCost)
        : 6500)
    : 0;
  const dualLivingCost = site.dualLivingInfrastructureRequired ? (Number(site.dualLivingInfrastructureCost) || 23000) : 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  // Geotechnical & Site Allowances
  const windRatingCost =
    site.windRatingCost !== undefined && !isNaN(Number(site.windRatingCost))
      ? Number(site.windRatingCost)
      : getWindRatingDefaultCost(site.windRating);

  const pieringCost = (site.pieringCost !== undefined && !isNaN(Number(site.pieringCost)) && Number(site.pieringCost) > 0)
    ? Number(site.pieringCost)
    : (site.screwPieringRequired
        ? (site.screwPieringCost !== undefined && !isNaN(Number(site.screwPieringCost))
            ? Number(site.screwPieringCost)
            : Math.round(gfaM2 * (site.siteType === "kdrb" ? 50 : site.siteType === "brownfield" ? 30 : 25)))
        : 0);
  const existingIsDouble = site.existingDwellingStoreys === "double" || isDouble;
  const isBrick = site.existingDwellingMaterial === "brick";
  const defaultDemoCost = (existingIsDouble ? 40000 : 32500) + (isBrick ? 2000 : 0);

  const demolitionAsbestosCost = (site.demolitionAsbestosRequired && site.kdrbDemolitionOption !== "owner" && site.kdrbDemolitionOption !== "none")
    ? (Number(site.demolitionAsbestosCost) !== undefined && !isNaN(Number(site.demolitionAsbestosCost)) && Number(site.demolitionAsbestosCost) > 0
        ? Number(site.demolitionAsbestosCost)
        : defaultDemoCost)
    : 0;

  const postDemoContourCost = (site.demolitionAsbestosRequired && site.postDemoContourSoilTestRequired && site.kdrbDemolitionOption !== "none")
    ? (Number(site.postDemoContourSoilTestCost) || 2200)
    : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const retainingCost = Number(site.retainingWallAllowance) || 0;
  const materialHandlingCost = Number(site.materialHandlingAllowance) || 0;
  const outOfZoneCost = Number(site.outOfZoneSurcharge) || 0;
  const unknownConditionsCost = Number(site.unknownSiteConditionsAllowance) || 0;
  // Sewer Main Running Through Block options (Image 1)
  const sewerBosCost = site.sewerBosCouncilAppRequired
    ? (site.sewerBosCouncilAppCost !== undefined ? Number(site.sewerBosCouncilAppCost) : 1700)
    : 0;
  const sewerBridgingPiersCost = site.sewerBridgingPiersRequired
    ? (site.sewerBridgingPiersCost !== undefined ? Number(site.sewerBridgingPiersCost) : (Number(site.sewerBridgingPiersLm) || 1) * 1500)
    : 0;
  const sewerPotholingCost = site.sewerPotholingRequired
    ? (site.sewerPotholingCost !== undefined ? Number(site.sewerPotholingCost) : 4500)
    : 0;
  const isCctvActive = Boolean(site.sewerCctvInspectionRequired || site.cctvSewerReportRequired);
  const sewerCctvCost = isCctvActive
    ? (site.sewerCctvInspectionCost !== undefined ? Number(site.sewerCctvInspectionCost) : (site.cctvSewerReportCost !== undefined ? Number(site.cctvSewerReportCost) : 2500))
    : 0;
  const legacySewerBridgingCost = (!site.sewerBridgingPiersRequired && site.sewerBridgingRequired)
    ? (Number(site.sewerBridgingCost) || 4500)
    : 0;

  const siteCostsSubtotal =
    soilTotalCost +
    windRatingCost +
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
    trafficCost +
    pieringCost +
    demolitionAsbestosCost +
    postDemoContourCost +
    rockCost +
    retainingCost +
    materialHandlingCost +
    outOfZoneCost +
    unknownConditionsCost +
    sewerBosCost +
    sewerBridgingPiersCost +
    sewerPotholingCost +
    sewerCctvCost +
    legacySewerBridgingCost +
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
    internal_general: [],
    colour_upgrades: [],
    site_earthworks: [],
    council_statutory: [],
  };

  const hasAuthoritativeModifiedAreas = Boolean(
    design.isModifiedFloorplan && ((design.modifiedAreas && design.standardAreas) || design.areas)
  );

  for (const item of lineItems) {
    if (!item.isIncluded) continue;
    if (item.isClientSelectable && item.clientSelected === false) continue;
    // When modifiedAreas are managed via calculateModifiedFloorplanPricing, skip any legacy mod_area_* items in lineItems so they are never double-counted
    if (hasAuthoritativeModifiedAreas && item.id.startsWith("mod_area_")) continue;
    const cat = resolveItemCategory(item);
    const effectiveRate = getItemRateForInclusion(item, design?.specTier);
    const qty = Number(item.quantity) || 1;
    const subtotal = Math.round(qty * effectiveRate);
    const targetGroup = categoryGroups[cat] || categoryGroups.internal_general;
    targetGroup.push({
      ...item,
      category: cat in categoryGroups ? cat : "internal_general",
      unitRate: effectiveRate,
      subtotal,
    });
  }

  // Universal: If design is a modified floorplan and has area deltas, ensure structural footprint line items exist
  if (design.isModifiedFloorplan && ((design.modifiedAreas && design.standardAreas) || design.areas)) {
    if (!design.standardAreas && design.designName) {
      design.standardAreas = getStandardAreaBreakdown(
        design.designName,
        design.housingType,
        Number(design.standardDesignM2) || Number(design.designM2)
      );
    }
    if (!design.modifiedAreas && design.areas) {
      design.modifiedAreas = design.areas;
    }
    const modCalc = calculateModifiedFloorplanPricing(design);
    for (const z of modCalc.zones) {
      if (z.deltaM2 !== 0 && z.costAdjustment !== 0) {
        const hasExisting =
          categoryGroups.structural.some((it) => it.id === `mod_area_${z.key}`) ||
          categoryGroups.floorplan_extensions.some((it) => it.id === `mod_area_${z.key}`);
        if (!hasExisting) {
          const isReduction = z.deltaM2 < 0;
          const detailedDesc = isReduction
            ? `${z.label} Reduction (${z.deltaM2.toFixed(2)} m²)`
            : `${z.label} Extension (+${z.deltaM2.toFixed(2)} m²)`;

          categoryGroups.structural.push({
            id: `mod_area_${z.key}`,
            category: "structural",
            name: isReduction ? `${z.label} Reduction` : `${z.label} Extension`,
            description: detailedDesc,
            unitType: "fixed",
            unitRate: z.costAdjustment,
            quantity: 1,
            subtotal: z.costAdjustment,
            isIncluded: true,
            isClientSelectable: true,
            clientSelected: true,
            notes: `${z.label} from ${z.standardM2.toFixed(2)} m² standard to ${z.modifiedM2.toFixed(2)} m² (${z.deltaM2 > 0 ? `+${z.deltaM2.toFixed(2)}` : z.deltaM2.toFixed(2)} m²)`,
          });
        }
      }
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
    "internal_general",
    "colour_upgrades",
    "site_earthworks",
    "council_statutory",
  ];

  // Also collect any other category in categoryGroups that wasn't explicitly listed in categoryOrder
  for (const cat of Object.keys(categoryGroups) as CatalogueCategory[]) {
    if (!categoryOrder.includes(cat)) {
      categoryOrder.push(cat);
    }
  }

  for (const cat of categoryOrder) {
    const items = categoryGroups[cat] || [];
    const catAmount = items.reduce((sum, it) => sum + computeLineItemSubtotal(it, design?.specTier), 0);
    if (catAmount > 0 || items.length > 0) {
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
 * Generates an architectural Estimate Reference ID based on client initials and a 3-digit sequence starting at 001.
 * Format: [First letter of First Name][First letter of Last Name][001+]
 * Example: Steve Slisar -> SS001
 * If existing quotes for this client prefix exist, it increments: SS001 -> SS002, etc.
 * If clientName is empty or incomplete, falls back to "CL001".
 */
export function generateQuoteNumber(
  clientName?: string,
  existingQuotes: { quoteNumber?: string; client?: { estimateNumber?: string } }[] = []
): string {
  let prefix = "CL";
  const trimmed = (clientName || "").trim();

  if (trimmed) {
    // Remove common titles if present
    const clean = trimmed.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "").trim();
    // Split on spaces and ignore non-alphabetical conjunctions like '&', 'and', 'or'
    const words = clean
      .split(/\s+/)
      .filter((w) => !["&", "and", "or"].includes(w.toLowerCase()) && /[a-zA-Z]/.test(w));

    if (words.length >= 2) {
      const firstLetters = words[0].replace(/[^a-zA-Z]/g, "");
      const lastLetters = words[words.length - 1].replace(/[^a-zA-Z]/g, "");
      const firstInitial = (firstLetters[0] || "C").toUpperCase();
      const lastInitial = (lastLetters[0] || "L").toUpperCase();
      prefix = `${firstInitial}${lastInitial}`;
    } else if (words.length === 1) {
      const w = words[0];
      // Check if hyphenated single name (e.g. Jean-Luc, Mary-Jane)
      if (w.includes("-")) {
        const hyphenParts = w.split("-").map((p) => p.replace(/[^a-zA-Z]/g, "")).filter(Boolean);
        if (hyphenParts.length >= 2) {
          prefix = `${hyphenParts[0][0]}${hyphenParts[hyphenParts.length - 1][0]}`.toUpperCase();
        } else if (hyphenParts.length === 1 && hyphenParts[0].length >= 2) {
          prefix = hyphenParts[0].slice(0, 2).toUpperCase();
        } else if (hyphenParts.length === 1) {
          prefix = `${hyphenParts[0][0].toUpperCase()}X`;
        }
      } else {
        const letters = w.replace(/[^a-zA-Z]/g, "");
        if (letters.length >= 2) {
          prefix = letters.slice(0, 2).toUpperCase();
        } else if (letters.length === 1) {
          prefix = `${letters[0].toUpperCase()}X`;
        }
      }
    }
  }

  // Scan existing quotes to find highest number for this prefix
  let maxSeq = 0;
  const pattern = new RegExp(`^${prefix}[#-]?(\\d+)$`, "i");

  if (Array.isArray(existingQuotes)) {
    for (const q of existingQuotes) {
      const num = q.quoteNumber || q.client?.estimateNumber || "";
      const m = num.match(pattern);
      if (m) {
        const val = parseInt(m[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }
  }

  // The sequence starts at #101 increasing in number for that particular client for each quote created
  const nextSeq = maxSeq >= 101 ? maxSeq + 1 : 101;
  return `${prefix}${nextSeq}`;
}

/**
 * Standardized estimate PDF filename according to user specification:
 * Hudson Estimate_Client First Name_House Name (Or just "custom plan" if custom)_INclusion level
 * Example: Hudson Estimate_Ronald_custom plan_H2.pdf
 * Example: Hudson Estimate_Ronald_Jasper 26_H2.pdf
 */
export function formatEstimateFileName(quote: FullQuote): string {
  const clean1 = (quote.client?.clientName || "").trim().replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "");
  const client1First = clean1.split(/\s+/)[0] || "Client";
  const clean2 = (quote.client?.hasClient2 && quote.client?.client2Name ? quote.client.client2Name : "")
    .trim()
    .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "");
  const client2First = clean2 ? clean2.split(/\s+/)[0] : "";
  const clientPart = client2First ? `${client1First} & ${client2First}` : client1First;

  const isCustomPlan =
    quote.design?.mode === "custom_floorplan" ||
    Boolean(quote.design?.isModifiedFloorplan) ||
    Boolean(quote.design?.designName?.toLowerCase().includes("custom"));
  
  let effName = getEffectiveDesignName(quote.design) || "";
  if (!effName || effName.toLowerCase().includes("no design selected")) {
    effName = "Custom Plan";
  }
  const houseName = isCustomPlan ? "custom plan" : effName;

  const specTier = quote.design?.specTier || "";
  const tierUpper = String(specTier).toUpperCase();
  let inclusionCode = "H2";
  if (tierUpper.includes("FHB") || tierUpper.includes("START SMART") || tierUpper.includes("FIRST HOME") || tierUpper.includes("SS")) {
    inclusionCode = "FHB";
  } else if (tierUpper.includes("IP") || tierUpper.includes("INVEST")) {
    inclusionCode = "IP";
  } else if (tierUpper.includes("H3") || tierUpper.includes("LUXURY")) {
    inclusionCode = "H3";
  } else if (tierUpper.includes("H1") || tierUpper.includes("SMART") || tierUpper.includes("BASE")) {
    inclusionCode = "H1";
  } else {
    inclusionCode = "H2";
  }

  const rawFilename = `Hudson Estimate_${clientPart}_${houseName}_${inclusionCode}`;
  return rawFilename.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, " ").trim();
}

export interface CouncilInfo {
  region: string;
  fee: number;
  isUnrecognized?: boolean;
  state?: "QLD" | "NSW";
}

/**
 * Automatically detects the appropriate council and statutory fee from an address, suburb, postcode, and optional state.
 * If NSW is specified or detected, prioritizes NSW councils ($2,000 statutory fee).
 * If QLD is specified or detected, prioritizes QLD councils.
 * If no location is provided or land is not purchased yet, defaults to $2,200 Council Fee Allowance (No Location Mentioned).
 */
export function detectCouncilFromLocation(
  suburbOrLocation?: string,
  addressOrEstate?: string,
  postcode?: string,
  state?: string
): CouncilInfo {
  const suburbClean = (suburbOrLocation || "").toLowerCase().trim();
  const text = `${suburbOrLocation || ""} ${addressOrEstate || ""} ${postcode || ""} ${state || ""}`.toLowerCase().trim();
  
  if (!text) {
    return { region: "", fee: 0, state: state === "NSW" ? "NSW" : "QLD" };
  }

  // Check if "no address", "tba", or "land not purchased"
  if (
    text.includes("no address") ||
    text.includes("tba") ||
    text.includes("land not") ||
    text.includes("no location") ||
    text.includes("to be advised") ||
    text.includes("location tba")
  ) {
    if (state === "NSW") {
      return { region: "NSW Local Council (Standard Statutory Fee)", fee: 2000, state: "NSW" };
    }
    return { region: "Council Fee Allowance (No Location Mentioned)", fee: 2200, state: "QLD" };
  }

  const explicitNsw =
    state === "NSW" ||
    (postcode && postcode.trim().startsWith("2")) ||
    text.includes("nsw") ||
    text.includes("new south wales") ||
    /\b2\d{3}\b/.test(text);

  const explicitQld =
    state === "QLD" ||
    (postcode && postcode.trim().startsWith("4")) ||
    text.includes("qld") ||
    text.includes("queensland") ||
    /\b4\d{3}\b/.test(text);

  // Helper function for NSW councils matching
  const matchNswCouncil = (): CouncilInfo | null => {
    // Blacktown City Council ($2,000)
    const blacktownKeywords = [
      "blacktown", "marsden park", "schofields", "riverstone", "box hill", "the gables", "gables", "rouse hill",
      "colebee", "stanhope gardens", "the ponds", "glenwood", "kellyville ridge", "mount druitt", "rooty hill",
      "doonside", "marayong", "quakers hill", "tallawong", "acacia gardens", "bungarribee", "dean park",
      "glendenning", "hassall grove", "oakhurst", "plumpton", "woodcroft", "2765", "2768", "2763", "2762",
      "2767", "2769", "2761", "2766", "2770"
    ];
    if (blacktownKeywords.some((k) => text.includes(k))) {
      return { region: "Blacktown City Council", fee: 2000 };
    }

    // Camden Council ($2,000)
    const camdenKeywords = [
      "camden", "oran park", "gregory hills", "leppington", "gledswood hills", "catherine field", "harrington park",
      "spring farm", "mount annan", "elderslie", "narellan", "narellan vale", "cobbitty", "bringelly", "rossmore",
      "currans hill", "kirkham", "grasmere", "bickley vale", "cawdor", "2570", "2567", "2557", "2179"
    ];
    if (camdenKeywords.some((k) => text.includes(k))) {
      return { region: "Camden Council", fee: 2000 };
    }

    // Campbelltown City Council ($2,000)
    const campbelltownKeywords = [
      "campbelltown", "macarthur", "menangle park", "glenfield", "ingleburn", "minto", "leumeah", "raby",
      "st andrews", "rosemeadow", "ambarvale", "bradbury", "englorie park", "blairmount", "eagle vale",
      "denham court", "2560", "2564", "2565", "2566"
    ];
    if (campbelltownKeywords.some((k) => text.includes(k))) {
      return { region: "Campbelltown City Council", fee: 2000 };
    }

    // City of Penrith ($2,000)
    const penrithKeywords = [
      "penrith", "jordan springs", "cadence", "glenmore park", "mulgoa", "orchard hills", "st marys", "kingswood",
      "cranebrook", "werrington", "jamisontown", "eaglestone", "claremont meadows", "thornton", "emu plains",
      "2750", "2745", "2747", "2748", "2749"
    ];
    if (penrithKeywords.some((k) => text.includes(k))) {
      return { region: "Penrith City Council", fee: 2000 };
    }

    // The Hills Shire Council ($2,000)
    const hillsKeywords = [
      "the hills", "hills shire", "castle hill", "baulkham hills", "bella vista", "norwest", "kellyville",
      "north kellyville", "beaumont hills", "kenthurst", "annangrove", "glenhaven", "dural", "middle dural",
      "maraylya", "2153", "2154", "2155", "2156", "2158"
    ];
    if (hillsKeywords.some((k) => text.includes(k))) {
      return { region: "The Hills Shire Council", fee: 2000 };
    }

    // Liverpool City Council ($2,000)
    const liverpoolKeywords = [
      "liverpool", "austral", "edmondson park", "hoxton park", "casula", "prestons", "carnes hill", "middleton grange",
      "cecil hills", "green valley", "moorebank", "chipping norton", "warwick farm", "holsworthy", "wattle grove",
      "voyager point", "2170", "2171", "2168", "2174"
    ];
    if (liverpoolKeywords.some((k) => text.includes(k))) {
      return { region: "Liverpool City Council", fee: 2000 };
    }

    // City of Parramatta / Cumberland / Fairfield ($2,000)
    const parramattaKeywords = [
      "parramatta", "westmead", "northmead", "rydalmere", "dundas", "ermington", "granville", "auburn", "lidcombe",
      "merrylands", "greystanes", "pemulwuy", "fairfield", "cabramatta", "canley vale", "bossley park", "edensor park",
      "bonnyrigg", "wetherill park", "smithfield", "2150", "2151", "2152", "2142", "2141", "2160", "2145", "2165",
      "2166", "2176", "2164"
    ];
    if (parramattaKeywords.some((k) => text.includes(k))) {
      return { region: "City of Parramatta", fee: 2000 };
    }

    // Hawkesbury City Council ($2,000)
    const hawkesburyKeywords = [
      "hawkesbury", "windsor", "south windsor", "richmond", "north richmond", "pitt town", "glossodia", "kurrajong",
      "wilberforce", "freemans reach", "2756", "2753", "2754", "2758"
    ];
    if (hawkesburyKeywords.some((k) => text.includes(k))) {
      return { region: "Hawkesbury City Council", fee: 2000 };
    }

    // Wollondilly Shire Council ($2,000)
    const wollondillyKeywords = [
      "wollondilly", "picton", "tahmoor", "thirlmere", "wilton", "bingara gorge", "bargo", "appin", "douglas park",
      "silverdale", "warragamba", "the oaks", "oakdale", "2571", "2572", "2573", "2574", "2569"
    ];
    if (wollondillyKeywords.some((k) => text.includes(k))) {
      return { region: "Wollondilly Shire Council", fee: 2000 };
    }

    // Central Coast Council ($2,000)
    const centralCoastKeywords = [
      "central coast", "gosford", "wyong", "tuggerah", "warnervale", "woongarrah", "hamlyn terrace", "watanobbi",
      "wadalba", "terrigal", "avoca", "erina", "baview", "bateau bay", "the entrance", "toukley", "budgewoi",
      "gwandalan", "lake munmorah", "2250", "2251", "2259", "2260", "2261", "2262", "2263"
    ];
    if (centralCoastKeywords.some((k) => text.includes(k))) {
      return { region: "Central Coast Council", fee: 2000 };
    }

    // City of Newcastle ($2,000)
    const newcastleKeywords = [
      "newcastle", "merewether", "hamilton", "adamstown", "mayfield", "wallsend", "fletcher", "minmi",
      "lambton", "new lambton", "bar beach", "cooks hill", "wickham", "islington", "tighes hill",
      "waratah", "broadmeadow", "jesmond", "shortland", "birmingham gardens", "sandgate", "tarro",
      "beresfield", "hexham", "2300", "2302", "2303", "2304", "2305", "2307", "2308"
    ];
    if (newcastleKeywords.some((k) => text.includes(k))) {
      return { region: "City of Newcastle", fee: 2000 };
    }

    // Lake Macquarie City Council ($2,000)
    const lakeMacquarieKeywords = [
      "lake macquarie", "charlestown", "warners bay", "belmont", "cardiff", "glendale", "cameron park",
      "edgeworth", "morisset", "cooranbong", "watagan park", "dora creek", "toronto", "speers point",
      "swansea", "caves beach", "redhead", "whitebridge", "eleebana", "valentine", "mount hutton",
      "2280", "2281", "2282", "2283", "2284", "2285", "2287", "2289", "2290"
    ];
    if (lakeMacquarieKeywords.some((k) => text.includes(k))) {
      return { region: "Lake Macquarie City Council", fee: 2000 };
    }

    // Cessnock City Council ($2,000)
    const cessnockKeywords = [
      "cessnock", "huntlee", "kurri kurri", "bellbird", "neath", "nulkaba", "pokolbin", "lovedale",
      "branxton", "greta", "abermain", "weston", "pelaw main", "heddon greta", "mulbring", "kearsley",
      "millfield", "ellalong", "wollombi", "2325", "2326", "2327", "2335"
    ];
    if (cessnockKeywords.some((k) => text.includes(k))) {
      return { region: "Cessnock City Council", fee: 2000 };
    }

    // Maitland City Council ($2,000)
    const maitlandKeywords = [
      "maitland", "east maitland", "rutherford", "chisholm", "thornton", "gillieston heights", "lochinvar",
      "ashtonfield", "metford", "tenambit", "morpeth", "largs", "bolwarra", "bolwarra heights", "telarah",
      "farley", "woodberry", "2320", "2321", "2322", "2323"
    ];
    if (maitlandKeywords.some((k) => text.includes(k))) {
      return { region: "Maitland City Council", fee: 2000 };
    }

    // Shellharbour City Council ($2,000)
    const shellharbourKeywords = [
      "shellharbour", "shell cove", "calderwood", "tullimbar", "albion park", "albion park rail",
      "flinders", "warilla", "barrack heights", "barrack point", "lake illawarra", "mount warrigal",
      "oak flats", "croom", "blackbutt", "dunmore", "2527", "2528", "2529"
    ];
    if (shellharbourKeywords.some((k) => text.includes(k))) {
      return { region: "Shellharbour City Council", fee: 2000 };
    }

    // Wollongong City Council ($2,000)
    const wollongongKeywords = [
      "wollongong", "haywards bay", "horsley", "dapto", "west dapto", "kembla grange", "bulli", "corrimal",
      "figtree", "unanderra", "fairy meadow", "balgownie", "thirroul", "austinmer", "coledale", "wombarra",
      "scarborough", "clifton", "stanwell park", "helensburgh", "mount keira", "mount pleasant", "keiraville",
      "tarrawanna", "towradgi", "bellambi", "russell vale", "woonona", "cordeaux heights", "farmborough heights",
      "berkeley", "coniston", "mangerton", "gwynneville", "north wollongong", "2500", "2502", "2505", "2506",
      "2508", "2515", "2516", "2517", "2518", "2519", "2525", "2526", "2530"
    ];
    if (wollongongKeywords.some((k) => text.includes(k))) {
      return { region: "Wollongong City Council", fee: 2000 };
    }

    // Tweed Shire Council (NSW) ($2,000)
    const tweedKeywords = [
      "tweed", "tweed shire", "tweed heads", "kingscliff", "casuarina", "pottsville", "cabarita",
      "murwillumbah", "banora point", "terranora", "bilambil", "chinderah", "fingal head", "bogangar",
      "hastings point", "2485", "2486", "2487", "2488", "2489", "2490"
    ];
    if (tweedKeywords.some((k) => text.includes(k))) {
      return { region: "Tweed Shire Council (NSW)", fee: 2000 };
    }

    return null;
  };

  // Helper function for QLD councils matching
  // Helper function for QLD councils matching
  const matchQldCouncil = (): CouncilInfo | null => {
    // -------------------------------------------------------------------------
    // STEP 1: SPECIFIC SUBURB MATCHING (Takes Absolute Priority Over Postcodes)
    // -------------------------------------------------------------------------

    // Brisbane City Council Suburbs ($0 Standard Statutory / Certifier Baseline)
    const brisbaneSuburbs = [
      "mitchelton", "everton park", "gaythorne", "enoggera", "keperra", "ferny grove", "upper kedron",
      "mcdowall", "stafford", "stafford heights", "brookside", "brookside centre", "alderley", "grange", "wilston",
      "windsor", "newmarket", "ashgrove", "the gap", "paddington", "bardon", "red hill", "kelvin grove",
      "herston", "spring hill", "fortitude valley", "new farm", "teneriffe", "newstead", "bowen hills",
      "albion", "wooloowin", "lutwyche", "kedron", "wavell heights", "nundah", "northgate", "virginia",
      "banyo", "geebung", "zillmere", "aspley", "carseldine", "bald hills", "deagon", "sandgate",
      "shorncliffe", "brighton", "boondall", "taigum", "fitzgibbon", "bracken ridge", "bridgeman downs",
      "chermside", "chermside west", "carindale", "carina", "carina heights", "cannon hill", "murarrie",
      "tingalpa", "belmont", "chandler", "gumdale", "wakerley", "manly", "manly west", "wynnum", "wynnum west", "lota",
      "rochedale", "rochedale south", "eight mile plains", "runcorn", "kuraby", "stretton", "drewvale",
      "calamvale", "sunnybank", "sunnybank hills", "algester", "parkinson", "pallara", "heathwood",
      "doolandella", "forest lake", "richlands", "inala", "ellen grove", "oxley", "corinda", "sherwood",
      "graceville", "chelmer", "indooroopilly", "taringa", "toowong", "st lucia", "kenmore", "kenmore hills",
      "chapel hill", "brookfield", "upper brookfield", "pullenvale", "anstead", "bellbowrie", "moggill",
      "mount gravatt", "mount gravatt east", "upper mount gravatt", "mansfield", "wishart", "holland park",
      "holland park west", "tarragindi", "moorooka", "yeerongpilly", "yeronga", "fairfield", "annerley",
      "greenslopes", "coorparoo", "camp hill", "norman park", "east brisbane", "kangaroo point", "south brisbane",
      "west end", "highgate hill", "dutton park", "woolloongabba", "salisbury", "rocklea", "archerfield",
      "coopers plains", "macgregor", "robertson", "acacia ridge", "brisbane"
    ];

    // Moreton Bay Regional Council Suburbs ($2,227)
    const moretonSuburbs = [
      "moreton bay", "caboolture", "caboolture south", "morayfield", "north lakes", "mango hill", "strathpine",
      "redcliffe", "burpengary", "burpengary east", "narangba", "warner", "griffin", "petrie", "kallangur",
      "murrumba downs", "dakabin", "lawnton", "bray park", "brendale", "cashmere", "eatons hill", "albany creek",
      "arana hills", "ferny hills", "everton hills", "bunya", "samford", "samford valley", "dayboro",
      "woodford", "bribie island", "bongaree", "bellara", "banksia beach", "sandstone point", "ningi", "beachmere",
      "upper caboolture", "bellmere", "elimbah", "wamuran", "d'aguilar", "clontarf", "scarborough", "margate",
      "woody point", "newport", "rothwell", "deception bay", "north harbour"
    ];

    // Check specific suburb match (using word boundary)
    const matchedBrisbaneSuburbs = brisbaneSuburbs.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(text));
    const matchedMoretonSuburbs = moretonSuburbs.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(text));

    if (matchedBrisbaneSuburbs.length > 0 && matchedMoretonSuburbs.length === 0) {
      return { region: "Brisbane City Council", fee: 0 };
    }
    if (matchedMoretonSuburbs.length > 0 && matchedBrisbaneSuburbs.length === 0) {
      return { region: "Moreton Bay Regional Council", fee: 2227 };
    }
    if (matchedBrisbaneSuburbs.length > 0 && matchedMoretonSuburbs.length > 0) {
      // Pick the most specific match by length
      const maxB = Math.max(...matchedBrisbaneSuburbs.map((s) => s.length));
      const maxM = Math.max(...matchedMoretonSuburbs.map((s) => s.length));
      return maxB >= maxM
        ? { region: "Brisbane City Council", fee: 0 }
        : { region: "Moreton Bay Regional Council", fee: 2227 };
    }

    // Gold Coast City Council ($2,950)
    const goldCoastKeywords = [
      "gold coast", "coomera", "pimpama", "ormeau", "helensvale", "hope island", "sanctuary cove",
      "pacific pines", "oxenford", "gaven", "maudsland", "nerang", "robina", "southport", "surfers paradise",
      "broadbeach", "mermaid beach", "miami", "burleigh", "palm beach", "currumbin", "tugun", "bilinga",
      "coolangatta", "varsity lakes", "mudgeeraba", "tallai", "worongary", "carrara", "ashmore", "benowa",
      "bundall", "molendinar", "arundel", "parkwood", "labrador", "runaway bay", "hollywell", "paradise point",
      "willow vale", "yatala", "jacobs well"
    ];
    if (goldCoastKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
      return { region: "Gold Coast City Council", fee: 2950 };
    }

    // Sunshine Coast / Noosa ($2,950)
    const sunshineKeywords = [
      "sunshine coast", "noosa", "maroochydore", "caloundra", "birtinya", "baringa", "nirimba", "aura",
      "palmview", "harmony", "sippy downs", "buderim", "mooloolaba", "kawana", "pelican waters", "currimundi",
      "coolum", "peregian", "tewantin"
    ];
    if (sunshineKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
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
      "berrinba", "priestdale"
    ];
    if (loganKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
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
      "thagoona", "amberley", "wulkuraka"
    ];
    if (ipswichKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
      return { region: "Ipswich City Council", fee: 2227 };
    }

    // Redland City Council ($2,227)
    const redlandKeywords = [
      "redland", "redlands", "redland bay", "cleveland", "capalaba", "thornlands", "victoria point",
      "wellington point", "birkdale", "ormiston", "alexandra hills", "mount cotton", "sheldon"
    ];
    if (redlandKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
      return { region: "Redland City Council", fee: 2227 };
    }

    // Toowoomba Regional Council ($2,227)
    const toowoombaKeywords = [
      "toowoomba", "highfields", "kearneys spring", "middle ridge", "rangeville", "centenary heights",
      "darling heights", "drayton", "harristown", "glenvale", "wilsonton", "cotswold hills",
      "gowrie mountain", "kingsthorpe", "meringandan", "westbrook", "wyreema", "cambooya", "greenmount",
      "clifton", "oakey"
    ];
    if (toowoombaKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
      return { region: "Toowoomba Regional Council", fee: 2227 };
    }

    // Scenic Rim / Lockyer / Other SEQ ($2,227)
    const otherSeqKeywords = ["scenic rim", "beaudesert", "boonah", "lockyer", "gatton", "laidley", "plainland"];
    if (otherSeqKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text))) {
      return { region: `${text.split(" ")[0].toUpperCase()} Regional Council`, fee: 2227 };
    }

    // -------------------------------------------------------------------------
    // STEP 2: POSTCODE MATCHING (Only if no specific suburb matched)
    // -------------------------------------------------------------------------
    // Cross-border postcodes (4053, 4054, 4055) fallback to Brisbane City Council if no specific Moreton suburb was named
    if (/\b(4053|4054|4055)\b/.test(text)) {
      return { region: "Brisbane City Council", fee: 0 };
    }

    // Moreton Bay Postcodes
    if (/\b(4500|4501|4502|4503|4504|4505|4506|4507|4508|4509|4510|4511|4512|4520|4019|4020|4021|4022|4037)\b/.test(text)) {
      return { region: "Moreton Bay Regional Council", fee: 2227 };
    }

    // Gold Coast Postcodes
    if (/\b(4208|4209|4210|4211|4212|4213|4214|4215|4216|4217|4218|4220|4221|4223|4224|4225|4226|4227|4228)\b/.test(text)) {
      return { region: "Gold Coast City Council", fee: 2950 };
    }

    // Sunshine Coast Postcodes
    if (/\b(4551|4556|4557|4558|4567|4575)\b/.test(text)) {
      return { region: "Sunshine Coast Council", fee: 2950 };
    }

    // Logan Postcodes
    if (/\b(4114|4117|4118|4119|4123|4124|4127|4128|4129|4130|4131|4132|4133|4207|4280|4285)\b/.test(text)) {
      return { region: "Logan City Council", fee: 2227 };
    }

    // Ipswich Postcodes
    if (/\b(4300|4301|4303|4304|4305|4306)\b/.test(text)) {
      return { region: "Ipswich City Council", fee: 2227 };
    }

    // Redland Postcodes
    if (/\b(4157|4158|4159|4160|4161|4163|4164|4165)\b/.test(text)) {
      return { region: "Redland City Council", fee: 2227 };
    }

    // Toowoomba Postcodes
    if (/\b(4350|4352)\b/.test(text)) {
      return { region: "Toowoomba Regional Council", fee: 2227 };
    }

    // Brisbane Metro Postcodes Fallback
    if (/\b(4000|4005|4006|4007|4008|4009|4010|4011|4012|4013|4014|4017|4018|4030|4031|4032|4034|4035|4036|4051|4059|4060|4061|4064|4065|4066|4067|4068|4069|4070|4073|4074|4075|4076|4077|4078|4101|4102|4103|4104|4105|4106|4107|4108|4109|4110|4111|4112|4113|4115|4116|4120|4121|4122|4151|4152|4153|4154|4155|4156|4169|4170|4171|4172|4173|4174|4178|4179)\b/.test(text)) {
      return { region: "Brisbane City Council", fee: 0 };
    }

    return null;
  };

  // 1. If explicit NSW job, prioritize NSW councils
  if (explicitNsw && !explicitQld) {
    const matched = matchNswCouncil();
    if (matched) return { ...matched, state: "NSW" };
    return { region: "NSW Local Council (Standard Statutory Fee)", fee: 2000, state: "NSW" };
  }

  // 2. If explicit QLD job, prioritize QLD councils
  if (explicitQld && !explicitNsw) {
    const matched = matchQldCouncil();
    if (matched) return { ...matched, state: "QLD" };
    return { region: "Logan City Council", fee: 2227, state: "QLD" };
  }

  // 3. If state not explicit, check NSW first if address contains NSW indicators
  const nswCandidate = matchNswCouncil();
  if (nswCandidate) return { ...nswCandidate, state: "NSW" };

  const qldCandidate = matchQldCouncil();
  if (qldCandidate) return { ...qldCandidate, state: "QLD" };

  // General NSW Address Fallback ($2,000)
  if (explicitNsw) {
    return { region: "NSW Local Council (Standard Statutory Fee)", fee: 2000, state: "NSW" };
  }

  // If a location is provided but council not matched, flag as unrecognized
  if (text.length > 2) {
    return {
      region: "Other / Unlisted Council (Approval Required)",
      fee: 2200,
      isUnrecognized: true,
      state: state === "NSW" ? "NSW" : "QLD",
    };
  }

  return {
    region: "Council Fee Allowance (No Location Mentioned)",
    fee: 2200,
    state: state === "NSW" ? "NSW" : "QLD",
  };
}

/**
 * Detects whether an address or suburb text belongs to QLD or NSW based on postcodes, keywords, or known council areas.
 */
export function detectStateFromAddress(
  addressOrSuburb?: string,
  postcode?: string,
  fallbackState: "QLD" | "NSW" = "QLD"
): "QLD" | "NSW" {
  const text = `${addressOrSuburb || ""} ${postcode || ""}`.toLowerCase().trim();
  if (!text) return fallbackState;

  if (postcode && postcode.trim().startsWith("2")) return "NSW";
  if (postcode && postcode.trim().startsWith("4")) return "QLD";

  if (/\b2\d{3}\b/.test(text) || /\bnsw\b/.test(text) || text.includes("new south wales")) {
    return "NSW";
  }
  if (/\b4\d{3}\b/.test(text) || /\bqld\b/.test(text) || text.includes("queensland")) {
    return "QLD";
  }

  const detected = detectCouncilFromLocation(addressOrSuburb, "", postcode);
  if (detected && detected.state) {
    return detected.state;
  }

  return fallbackState;
}

/**
 * Automatically updates and recalculates a saved quote upon loading or hydration:
 * - Purges legacy placeholder overrides (1660, 1580, etc.) from customSpec so dynamic decay & H1/H2/H3 tiers apply
 * - Normalizes inclusion tiers to current H1 Smart, H2 Designer, H3 Luxury standards
 * - Updates base house price against official 2026 pricelists (standard) or dynamic decay engine (custom/modified)
 * - Updates standard facade prices if updated in the pricelist
 * - Recalculates all line item subtotals and complete gross & net financial summary
 */
export function rehydrateAndRecalculateQuote(rawQuote: FullQuote): FullQuote {
  if (!rawQuote || typeof rawQuote !== "object") return rawQuote;

  // Clone deeply
  const quote: FullQuote = JSON.parse(JSON.stringify(rawQuote));
  if (!quote.design) return quote;

  // Normalize tier to strict H1 Smart, H2 Designer, H3 Luxury, FHB Start Smart, or IP Investor Pack
  let tier = quote.design.specTier || "H2 Design Inclusions";
  const tierUpper = String(tier).toUpperCase();
  if (tierUpper.includes("H3")) {
    tier = "H3 Luxury Inclusions";
  } else if (tierUpper.includes("FHB") || tierUpper.includes("START SMART") || tierUpper.includes("FIRST HOME")) {
    tier = "FHB Start Smart";
  } else if (tierUpper === "IP" || tierUpper.includes("INVEST")) {
    tier = "IP Investor Pack";
  } else if (tierUpper.includes("H1")) {
    tier = "H1 Smart Inclusions";
  } else if (tierUpper.includes("H2") || tierUpper.includes("DESIGN")) {
    tier = "H2 Design Inclusions";
  } else if (tierUpper.includes("HBS") || tierUpper.includes("HOME BUILDER") || tierUpper.includes("SMART SERIES") || tierUpper.includes("SS")) {
    tier = "H1 Smart Inclusions";
  } else {
    tier = "H2 Design Inclusions";
  }
  quote.design.specTier = tier;
  if (tierUpper.includes("H3") || tierUpper.includes("H1") || tierUpper.includes("IP") || tierUpper.includes("FHB") || quote.design.hasExplicitlySelectedTier) {
    quote.design.hasExplicitlySelectedTier = true;
  }

  // Sanitize siteConditions acoustic attenuation allowance
  if (quote.siteConditions) {
    const validTiers = ["Category 1", "Category 2", "Category 3"];
    if (
      !quote.siteConditions.acousticTier ||
      quote.siteConditions.acousticTier === "None" ||
      (quote.siteConditions.acousticTier as string) === "Tier 1" ||
      !validTiers.includes(quote.siteConditions.acousticTier)
    ) {
      quote.siteConditions.acousticTier = "None";
      quote.siteConditions.acousticCost = 0;
    }

    // Clean legacy/bugged piering allowance that was calculated from the 55sqm bug
    const gfa = calculateDesignGFA(quote.design);
    const pRate = quote.siteConditions.siteType === "kdrb" ? 50 : quote.siteConditions.siteType === "brownfield" ? 30 : 25;
    const currentPCost = Number(quote.siteConditions.pieringCost ?? quote.siteConditions.screwPieringCost ?? 0);
    const isOldBuggedPiering = currentPCost > 0 && Math.abs(currentPCost - Math.round(55.78 * pRate)) <= 50;
    if (isOldBuggedPiering && gfa > 0) {
      const correctLump = Math.round(gfa * pRate);
      quote.siteConditions.pieringCost = correctLump;
      quote.siteConditions.screwPieringCost = correctLump;
    }
  }

  // 2. Clean legacy customSpec overrides so dynamic decay functions cleanly
  if (quote.design.customSpec) {
    const isDouble = quote.design.customSpec.storeys === "double";
    const legacyValues = [1660, 1580, 1720, 1500, 1800, 2050, 1620, 2360, 2380, 2650];
    if (legacyValues.includes(quote.design.customSpec.groundRateM2)) {
      quote.design.customSpec.groundRateM2 = 0;
    }
    if (legacyValues.includes(quote.design.customSpec.upperRateM2)) {
      quote.design.customSpec.upperRateM2 = 0;
    }
    if ([869, 1050, 1150, 1400].includes(quote.design.customSpec.ancillaryRateM2)) {
      quote.design.customSpec.ancillaryRateM2 = 0;
    }
    quote.design.customSpec.scaffoldingAllowance = isDouble ? 8500 : 0;

    const totalM2 = calculateCustomTotalM2(quote.design.customSpec);
    if (quote.design.mode === "custom_floorplan") {
      quote.design.designM2 = totalM2;
      quote.design.basePrice = calculateCustomFloorplanPrice(quote.design.customSpec, tier);
      quote.design.standardBasePrice = quote.design.basePrice;
    }
  }

  // 3. Update Base Price for Modified or Standard Designs
  if (quote.design.mode === "modified" || quote.design.isModifiedFloorplan) {
    const div = (quote.client?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
    const housingType = getHousingTypeForDesign(quote.design.designName, quote.design.housingType);
    quote.design.housingType = housingType;
    const models = getHousingTypePrices(div)[housingType] || [];
    const matched = models.find(
      (m) => m.name.toLowerCase() === (quote.design.designName || "").toLowerCase()
    );
    if (matched) {
      const stdPrice = getTierPrice(matched, tier, housingType, div);
      if (stdPrice > 0) {
        quote.design.standardBasePrice = stdPrice;
      }
    }
    const modCalc = calculateModifiedFloorplanPricing(quote.design);
    quote.design.basePrice = modCalc.modifiedBasePrice;
    quote.design.modifiedDesignM2 = modCalc.modifiedTotalM2;
    if (!quote.design.promotionsDiscount || quote.design.promotionsDiscount <= 0) {
      quote.design.promotionsDiscount = getAutomatedPromotionDiscount(modCalc.modifiedTotalM2);
    }
  } else if (quote.design.mode === "standard" || !quote.design.mode) {
    // Re-calibrate against official pricelists
    const div = (quote.client?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
    const housingType = getHousingTypeForDesign(quote.design.designName, quote.design.housingType);
    quote.design.housingType = housingType;
    const models = getHousingTypePrices(div)[housingType] || [];
    const matched = models.find(
      (m) => m.name.toLowerCase() === (quote.design.designName || "").toLowerCase()
    );
    if (matched) {
      const stdPrice = getTierPrice(matched, tier, housingType, div);
      if (stdPrice > 0) {
        quote.design.standardBasePrice = stdPrice;
        quote.design.basePrice = stdPrice;
        quote.design.designM2 = matched.m2;
      }
    }
  }

  // 4. Update standard facade uplift if not custom
  if (!quote.design.isCustomFacade && quote.design.facadeName) {
    try {
      const isDouble = isDoubleStoreyDesign(quote.design.designName, quote.design.housingType);
      const storey: FacadeStorey = isDouble ? "double" : "single";
      const facadePrice = facadePriceForDesign(
        quote.design.facadeName,
        storey,
        quote.design.designName
      );
      quote.design.facadePrice = facadePrice ?? 0;
    } catch {}
  }

  // 5. Ensure line item categorization and subtotal validity
  if (Array.isArray(quote.lineItems)) {
    const isH1 = tier.toUpperCase().includes("H1");
    const m2 = quote.design.isModifiedFloorplan && quote.design.modifiedDesignM2
      ? quote.design.modifiedDesignM2
      : quote.design.designM2 || 200;
    const isDouble =
      quote.design.customSpec?.storeys === "double" ||
      (quote.design.housingType || "").toLowerCase().includes("double") ||
      (quote.design.housingType || "").toLowerCase().includes("split");

    quote.lineItems = quote.lineItems.map((it) => {
      if (it.id.startsWith("pop_h1_ducted_ac") || it.id === "hvac_ducted_aircon") {
        if (!isH1) {
          // Ducted AC is already standard in H2 and H3 inclusions
          return {
            ...it,
            isIncluded: false,
            clientSelected: false,
            subtotal: 0,
          };
        } else if (it.isIncluded) {
          const acSpec = calculateDuctedAcUpgrade({
            m2,
            isDoubleStorey: isDouble,
            housingType: quote.design.housingType,
            designName: quote.design.designName,
          });
          return {
            ...it,
            name: acSpec.shortTitle,
            description: acSpec.description,
            unitRate: acSpec.upgradeCost,
            subtotal: (it.quantity || 1) * acSpec.upgradeCost,
            category: resolveItemCategory(it),
          };
        }
      }

      const tierRate = getItemRateForInclusion(it, tier);
      const unitRate =
        it.catalogueItemId === "str_custom_garage" && [1050, 1150, 1400].includes(tierRate)
          ? 1300
          : (tierRate ?? 0);
      return {
        ...it,
        unitRate,
        category: resolveItemCategory(it),
        subtotal: (it.quantity ?? 1) * unitRate,
      };
    });
  } else {
    quote.lineItems = [];
  }

  if (!quote.design.customSpec) {
    quote.design.customSpec = {
      groundLivingM2: 0,
      firstLivingM2: 0,
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      balconyM2: 0,
      storeys: "single",
      groundRateM2: 0,
      upperRateM2: 0,
      ancillaryRateM2: 0,
      scaffoldingAllowance: 0,
    };
  }

  // 6. Recalculate complete financial summary
  const depositAmount = quote.client?.depositAmount || 1650;
  quote.pricing = calculateQuotePricing(
    quote.design,
    quote.siteConditions,
    quote.lineItems,
    depositAmount,
    quote.secondDwellingLineItems
  );

  return quote;
}

