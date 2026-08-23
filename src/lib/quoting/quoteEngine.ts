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
 * For every 0.1m above 1.0m, multiply amount by 10 (instead of 100), then by floorplan GFA.
 */
export function calculateTopographyFallCost(fallMeters: number, gfaM2: number): number {
  if (fallMeters <= 1.0) return 0;
  const excessMeters = Math.max(0, fallMeters - 1.0);
  const tenthsAbove1m = Math.round(excessMeters * 10);
  const fallRate = tenthsAbove1m * 10;
  return Math.round(fallRate * gfaM2);
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

  const facadePrice = Number(design.facadePrice) || 0;
  const promotionName = design.promotionName || "Builder Promotion / Special Savings";
  const promotionsDiscount = Number(design.promotionsDiscount) || 0;
  const gfaM2 = calculateDesignGFA(design);

  // Dynamic Site Calculations
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost = Math.round(soilRate * gfaM2);
  const fallTotalCost = calculateTopographyFallCost(site.fallMeters, gfaM2);
  const siteCostsSubtotal =
    soilTotalCost + fallTotalCost + (Number(site.bushfireCost) || 0) + (Number(site.acousticCost) || 0);

  const councilStatutorySubtotal = Number(site.councilFee) || 0;

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
