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

  // Dedicated Site & Soil Engineering items
  const concrete32Cost = site.concrete32MpaRequired ? (Number(site.concrete32MpaCost) || Math.round(gfaM2 * 14)) : 0;
  const flexibleConnectionsCost = site.flexibleConnectionsRequired ? (Number(site.flexibleConnectionsCost) || 1800) : 0;

  // Site Overlay Reports (LHS)
  const bushfireReportCost = site.bushfireReportRequired ? (Number(site.bushfireReportCost) || 850) : 0;
  const floodReportCost = site.floodReportRequired ? (Number(site.floodReportCost) || 1500) : 0;
  const acousticReportCost = site.acousticReportRequired ? (Number(site.acousticReportCost) || 1200) : 0;

  // Site Overlay Physical Allowances (RHS)
  const bushfireCost = getBushfireCost(site.bushfireBal, isDouble);
  const floodCost = site.floodOverlayRequired ? (Number(site.floodOverlayCost) || 4800) : 0;
  const acousticCost = getAcousticCost(site.acousticTier, isDouble);

  // Council & Statutory
  const councilDaCost = site.councilDaRequired ? (Number(site.councilDaCost) || 8000) : 0;
  const trafficCost = site.trafficControlRequired ? (Number(site.trafficControlCost) || 10000) : 0;
  const dualLivingCost = site.dualLivingInfrastructureRequired ? (Number(site.dualLivingInfrastructureCost) || 23000) : 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  // Geotechnical & Site Allowances
  const screwPieringCost = site.screwPieringRequired ? (Number(site.screwPieringCost) || Math.round(gfaM2 * 85)) : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const retainingCost = Number(site.retainingWallAllowance) || 0;

  const siteCostsSubtotal =
    soilTotalCost +
    concrete32Cost +
    flexibleConnectionsCost +
    fallTotalCost +
    bushfireReportCost +
    bushfireCost +
    floodReportCost +
    floodCost +
    acousticReportCost +
    acousticCost +
    trafficCost +
    screwPieringCost +
    rockCost +
    retainingCost +
    sedimentCost;

  const councilStatutorySubtotal = (Number(site.councilFee) || 0) + councilDaCost + dualLivingCost;

  // Group line items by category
  const categoryGroups: Record<CatalogueCategory, QuoteSelectedLineItem[]> = {
    floorplan_extensions: [],
    ceiling_heights: [],
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
    if (categoryGroups[item.category]) {
      categoryGroups[item.category].push(item);
    }
  }

  // Calculate category subtotals
  const categorySubtotals: CategorySubtotal[] = [];
  let variationsSubtotal = 0;

  const categoryOrder: CatalogueCategory[] = [
    "floorplan_extensions",
    "ceiling_heights",
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

export interface CouncilInfo {
  region: string;
  fee: number;
}

/**
 * Automatically detects the appropriate QLD council and statutory fee from an address, suburb, or postcode.
 * If no location is provided or land is not purchased yet, defaults to $2,200 Council Fee Allowance (No Location Mentioned).
 */
export function detectCouncilFromLocation(addressOrSuburb?: string, postcode?: string): CouncilInfo {
  const text = `${addressOrSuburb || ""} ${postcode || ""}`.toLowerCase().trim();
  
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

  // If a location is provided but council not matched
  return { region: "Council Fee Allowance (No Location Mentioned)", fee: 2200 };
}

