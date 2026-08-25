import { CATEGORY_LABELS } from "./quoteCatalogue";
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
export function calculateCustomFloorplanPrice(spec: CustomFloorplanSpec): number {
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
export function calculateCustomTotalM2(spec: CustomFloorplanSpec): number {
  const isDouble = spec.storeys === "double";
  const ground = Number(spec.groundLivingM2) || 0;
  const upper = isDouble ? Number(spec.firstLivingM2) || 0 : 0;
  const garage = Number(spec.garageM2) || 0;
  const alfresco = Number(spec.alfrescoM2) || 0;
  const porch = Number(spec.porchM2) || 0;
  const balcony = Number(spec.balconyM2) || 0;
  return Number((ground + upper + garage + alfresco + porch + balcony).toFixed(2));
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
  if (design.housingType === "Double Storey") {
    return Number(((design.designM2 || 200) * 0.62).toFixed(2));
  }
  return Number((design.designM2 || 192).toFixed(2));
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
 * Calculates comprehensive estimated pricing breakdown for Builders Estimate.
 */
export function calculateQuotePricing(
  design: QuoteDesignSelection,
  site: SiteConditions,
  lineItems: QuoteSelectedLineItem[],
  initialDepositAmount: number,
): QuotePricingSummary {
  let baseHousePrice = 0;
  let customFloorplanPrice = 0;

  if (design.mode === "custom_floorplan") {
    customFloorplanPrice = calculateCustomFloorplanPrice(design.customSpec);
    baseHousePrice = customFloorplanPrice;
  } else {
    baseHousePrice = Number(design.basePrice) || 0;
  }

  const isDouble =
    design.mode === "custom_floorplan"
      ? design.customSpec.storeys === "double"
      : design.housingType === "Double Storey";

  const isSplit =
    design.mode === "custom_floorplan"
      ? design.customSpec.storeys === "split"
      : design.housingType === "Split Level";

  const facadePrice = Number(design.facadePrice) || 0;
  const promotionName = design.promotionName || "Builder Promotion / Special Savings";
  const promotionsDiscount = Number(design.promotionsDiscount) || 0;
  const gfaM2 = calculateDesignGFA(design);

  // Dynamic Site & Statutory Calculations
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost = Math.round(soilRate * gfaM2);
  const fallTotalCost = calculateTopographyFallCost(site.fallMeters, gfaM2, isSplit);
  const bushfireCost = getBushfireCost(site.bushfireBal, isDouble);
  const acousticCost = getAcousticCost(site.acousticTier, isDouble);

  // Dedicated Site & Engineering items
  const concrete32Cost = site.concrete32MpaRequired ? (Number(site.concrete32MpaCost) || Math.round(gfaM2 * 14)) : 0;
  const floodCost = site.floodOverlayRequired ? (Number(site.floodOverlayCost) || 4800) : 0;
  const councilDaCost = site.councilDaRequired ? (Number(site.councilDaCost) || 3500) : 0;
  const trafficCost = site.trafficControlRequired ? (Number(site.trafficControlCost) || 2850) : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const pieringCost = Number(site.pieringCost) || (Number(site.pieringAllowanceMeters) || 0) * 110;
  const retainingCost = Number(site.retainingWallAllowance) || 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  const siteCostsSubtotal =
    soilTotalCost +
    fallTotalCost +
    bushfireCost +
    acousticCost +
    concrete32Cost +
    floodCost +
    trafficCost +
    rockCost +
    pieringCost +
    retainingCost +
    sedimentCost;

  const councilStatutorySubtotal = (Number(site.councilFee) || 0) + councilDaCost;

  // Group line items by category
  const categoryGroups: Record<CatalogueCategory, QuoteSelectedLineItem[]> = {
    external: [],
    internal_bathroom: [],
    internal_kitchen: [],
    internal_bedrooms: [],
    internal_laundry: [],
    structural: [],
    doors_windows: [],
    colour_upgrades: [],
    site_earthworks: [],
    council_statutory: [],
  };

  for (const item of lineItems) {
    if (!item.isIncluded) continue;
    if (item.isClientSelectable && item.clientSelected === false) continue;
    if (categoryGroups[item.category]) {
      categoryGroups[item.category].push(item);
    }
  }

  // Calculate category subtotals
  const categorySubtotals: CategorySubtotal[] = [];
  let variationsSubtotal = 0;

  const categoryOrder: CatalogueCategory[] = [
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
    facadePrice -
    promotionsDiscount +
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
    promotionName,
    promotionsDiscount,
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
