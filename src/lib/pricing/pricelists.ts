// Official Hudson Homes 2026 First Home Buyers (FHB) Price Lists (Issue: 28/09/2026)
// Complete Turnkey FHB specifications with site costs and turnkey landscaping allowances.

export interface FhbPriceRow {
  name: string;
  division: "NSW" | "QLD";
  housingType: "Single Storey" | "Double Storey" | "Granny Flat";
  groundM2: number;
  firstM2?: number;
  totalM2: number;
  fhbPrice: number;
  bedrooms?: number;
  isSingleGarage?: boolean;
}

export interface FhbLandscapeAllowance {
  upToM2: number;
  label: string;
  allowance: number; // 0 for included, negative for credit, positive for surcharge
}

export const FHB_LANDSCAPE_PACKAGES: FhbLandscapeAllowance[] = [
  { upToM2: 300, label: "LP up to 300m²", allowance: -6000 },
  { upToM2: 450, label: "LP up to 450m²", allowance: 0 },
  { upToM2: 600, label: "LP up to 600m²", allowance: 8000 },
  { upToM2: 700, label: "LP up to 700m²", allowance: 12000 },
  { upToM2: 800, label: "LP up to 800m²", allowance: 17000 },
  { upToM2: 900, label: "LP up to 900m²", allowance: 22000 },
];

/**
 * NSW - Single Storey - First Home Buyers Price List 2026 (Issue: 28/09/2026)
 * Total: 55 designs including Aqua Granny Flats.
 */
export const NSW_FHB_SINGLE_STOREY_PRICES: FhbPriceRow[] = [
  { name: "Amber 21", division: "NSW", housingType: "Single Storey", groundM2: 192.24, totalM2: 192.24, fhbPrice: 388900 },
  { name: "Amber 23", division: "NSW", housingType: "Single Storey", groundM2: 210.63, totalM2: 210.63, fhbPrice: 401900 },
  { name: "Auburn 22", division: "NSW", housingType: "Single Storey", groundM2: 206.28, totalM2: 206.28, fhbPrice: 395900 },
  { name: "Azure 19 - (3 Bedrooms)", division: "NSW", housingType: "Single Storey", groundM2: 177.08, totalM2: 177.08, fhbPrice: 375900, bedrooms: 3 },
  { name: "Azure 19 - (4 Bedrooms)", division: "NSW", housingType: "Single Storey", groundM2: 177.08, totalM2: 177.08, fhbPrice: 380900, bedrooms: 4 },
  { name: "Azure 21", division: "NSW", housingType: "Single Storey", groundM2: 197.08, totalM2: 197.08, fhbPrice: 392900 },
  { name: "Azure 23", division: "NSW", housingType: "Single Storey", groundM2: 210.63, totalM2: 210.63, fhbPrice: 406900 },
  { name: "Carmine 17", division: "NSW", housingType: "Single Storey", groundM2: 162.11, totalM2: 162.11, fhbPrice: 364900 },
  { name: "Carmine 19", division: "NSW", housingType: "Single Storey", groundM2: 180.02, totalM2: 180.02, fhbPrice: 379900 },
  { name: "Carmine 21 MK2", division: "NSW", housingType: "Single Storey", groundM2: 193.57, totalM2: 193.57, fhbPrice: 396900 },
  { name: "Carmine 23 MK2", division: "NSW", housingType: "Single Storey", groundM2: 215.19, totalM2: 215.19, fhbPrice: 411900 },
  { name: "Celeste 24", division: "NSW", housingType: "Single Storey", groundM2: 225.37, totalM2: 225.37, fhbPrice: 422900 },
  { name: "Coral 19", division: "NSW", housingType: "Single Storey", groundM2: 181.12, totalM2: 181.12, fhbPrice: 382900 },
  { name: "Coral 21", division: "NSW", housingType: "Single Storey", groundM2: 198.08, totalM2: 198.08, fhbPrice: 395900 },
  { name: "Coral 23", division: "NSW", housingType: "Single Storey", groundM2: 217.68, totalM2: 217.68, fhbPrice: 412900 },
  { name: "Eton 15", division: "NSW", housingType: "Single Storey", groundM2: 143.23, totalM2: 143.23, fhbPrice: 350900 },
  { name: "Eton 17", division: "NSW", housingType: "Single Storey", groundM2: 159.49, totalM2: 159.49, fhbPrice: 363900 },
  { name: "Hazel 14", division: "NSW", housingType: "Single Storey", groundM2: 125.80, totalM2: 125.80, fhbPrice: 338900, isSingleGarage: true },
  { name: "Hazel 15", division: "NSW", housingType: "Single Storey", groundM2: 142.05, totalM2: 142.05, fhbPrice: 355900, isSingleGarage: true },
  { name: "Hazel 17", division: "NSW", housingType: "Single Storey", groundM2: 158.08, totalM2: 158.08, fhbPrice: 373900, isSingleGarage: true },
  { name: "Hazel 19", division: "NSW", housingType: "Single Storey", groundM2: 173.20, totalM2: 173.20, fhbPrice: 387900, isSingleGarage: true },
  { name: "Indigo 15 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 144.97, totalM2: 144.97, fhbPrice: 344900, isSingleGarage: true },
  { name: "Indigo 17 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 162.18, totalM2: 162.18, fhbPrice: 367900, isSingleGarage: true },
  { name: "Indigo 19 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 174.92, totalM2: 174.92, fhbPrice: 377900, isSingleGarage: true },
  { name: "Indigo 22 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 206.17, totalM2: 206.17, fhbPrice: 404900, isSingleGarage: true },
  { name: "Iris 15 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 138.21, totalM2: 138.21, fhbPrice: 342900, isSingleGarage: true },
  { name: "Iris 17 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 159.99, totalM2: 159.99, fhbPrice: 369900, isSingleGarage: true },
  { name: "Iris 18 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 168.58, totalM2: 168.58, fhbPrice: 374900, isSingleGarage: true },
  { name: "Iris 21 (s/g)", division: "NSW", housingType: "Single Storey", groundM2: 195.59, totalM2: 195.59, fhbPrice: 398900, isSingleGarage: true },
  { name: "Ivory 21", division: "NSW", housingType: "Single Storey", groundM2: 202.17, totalM2: 202.17, fhbPrice: 405900 },
  { name: "Ivory 23", division: "NSW", housingType: "Single Storey", groundM2: 211.51, totalM2: 211.51, fhbPrice: 410900 },
  { name: "Ivory 25", division: "NSW", housingType: "Single Storey", groundM2: 232.90, totalM2: 232.90, fhbPrice: 428900 },
  { name: "Jade 21", division: "NSW", housingType: "Single Storey", groundM2: 196.98, totalM2: 196.98, fhbPrice: 396900 },
  { name: "Jade 23", division: "NSW", housingType: "Single Storey", groundM2: 216.11, totalM2: 216.11, fhbPrice: 413900 },
  { name: "Jasper 17", division: "NSW", housingType: "Single Storey", groundM2: 161.70, totalM2: 161.70, fhbPrice: 368900 },
  { name: "Jasper 20", division: "NSW", housingType: "Single Storey", groundM2: 185.15, totalM2: 185.15, fhbPrice: 388900 },
  { name: "Jasper 24", division: "NSW", housingType: "Single Storey", groundM2: 219.83, totalM2: 219.83, fhbPrice: 425900 },
  { name: "Olive 23", division: "NSW", housingType: "Single Storey", groundM2: 210.86, totalM2: 210.86, fhbPrice: 414900 },
  { name: "Onyx 17", division: "NSW", housingType: "Single Storey", groundM2: 160.38, totalM2: 160.38, fhbPrice: 374900 },
  { name: "Onyx 19", division: "NSW", housingType: "Single Storey", groundM2: 180.82, totalM2: 180.82, fhbPrice: 387900 },
  { name: "Onyx 21", division: "NSW", housingType: "Single Storey", groundM2: 198.23, totalM2: 198.23, fhbPrice: 403900 },
  { name: "Onyx 24", division: "NSW", housingType: "Single Storey", groundM2: 227.27, totalM2: 227.27, fhbPrice: 427900 },
  { name: "Quartz 21", division: "NSW", housingType: "Single Storey", groundM2: 199.69, totalM2: 199.69, fhbPrice: 395900 },
  { name: "Quartz 23", division: "NSW", housingType: "Single Storey", groundM2: 209.70, totalM2: 209.70, fhbPrice: 404900 },
  { name: "Quartz 25", division: "NSW", housingType: "Single Storey", groundM2: 228.39, totalM2: 228.39, fhbPrice: 425900 },
  { name: "Sage 12", division: "NSW", housingType: "Single Storey", groundM2: 128.72, totalM2: 128.72, fhbPrice: 327900 },
  { name: "Tiffany 22", division: "NSW", housingType: "Single Storey", groundM2: 203.97, totalM2: 203.97, fhbPrice: 393900 },
  { name: "Tiffany 24", division: "NSW", housingType: "Single Storey", groundM2: 222.53, totalM2: 222.53, fhbPrice: 419900 },
  { name: "Topaz 21", division: "NSW", housingType: "Single Storey", groundM2: 199.37, totalM2: 199.37, fhbPrice: 399900 },
  { name: "Topaz 23", division: "NSW", housingType: "Single Storey", groundM2: 213.92, totalM2: 213.92, fhbPrice: 405900 },
  { name: "Aqua 1", division: "NSW", housingType: "Granny Flat", groundM2: 59.96, totalM2: 59.96, fhbPrice: 159900 },
  { name: "Aqua 2", division: "NSW", housingType: "Granny Flat", groundM2: 60.00, totalM2: 60.00, fhbPrice: 159900 },
  { name: "Aqua 3", division: "NSW", housingType: "Granny Flat", groundM2: 59.90, totalM2: 59.90, fhbPrice: 159900 },
  { name: "Aqua 4", division: "NSW", housingType: "Granny Flat", groundM2: 59.94, totalM2: 59.94, fhbPrice: 159900 },
  { name: "Aqua 5", division: "NSW", housingType: "Granny Flat", groundM2: 59.14, totalM2: 59.14, fhbPrice: 159900 },
];

/**
 * QLD - Double Storey - First Home Buyers Price List 2026 (Issue: 28/09/2026)
 * Total: 22 designs.
 */
export const QLD_FHB_DOUBLE_STOREY_PRICES: FhbPriceRow[] = [
  { name: "Carolina 22", division: "QLD", housingType: "Double Storey", groundM2: 119.23, firstM2: 83.37, totalM2: 202.60, fhbPrice: 494900 },
  { name: "Carolina 24", division: "QLD", housingType: "Double Storey", groundM2: 122.62, firstM2: 99.87, totalM2: 222.49, fhbPrice: 513900 },
  { name: "Cerise 20", division: "QLD", housingType: "Double Storey", groundM2: 105.13, firstM2: 79.85, totalM2: 184.98, fhbPrice: 474900 },
  { name: "Lime 19", division: "QLD", housingType: "Double Storey", groundM2: 102.94, firstM2: 73.52, totalM2: 176.46, fhbPrice: 478900 },
  { name: "Lime 21", division: "QLD", housingType: "Double Storey", groundM2: 106.87, firstM2: 88.21, totalM2: 195.08, fhbPrice: 498900 },
  { name: "Lime 23", division: "QLD", housingType: "Double Storey", groundM2: 117.63, firstM2: 97.97, totalM2: 215.60, fhbPrice: 507900 },
  { name: "Lime 25", division: "QLD", housingType: "Double Storey", groundM2: 134.16, firstM2: 100.71, totalM2: 234.87, fhbPrice: 536900 },
  { name: "Mint 17", division: "QLD", housingType: "Double Storey", groundM2: 94.06, firstM2: 64.68, totalM2: 158.74, fhbPrice: 463900 },
  { name: "Mint 19", division: "QLD", housingType: "Double Storey", groundM2: 100.98, firstM2: 76.99, totalM2: 177.97, fhbPrice: 474900 },
  { name: "Mint 21", division: "QLD", housingType: "Double Storey", groundM2: 109.40, firstM2: 81.93, totalM2: 191.33, fhbPrice: 487900 },
  { name: "Mint 24", division: "QLD", housingType: "Double Storey", groundM2: 124.48, firstM2: 96.16, totalM2: 220.64, fhbPrice: 521900 },
  { name: "Mocha 24 (Attached Garage)", division: "QLD", housingType: "Double Storey", groundM2: 136.76, firstM2: 89.17, totalM2: 225.93, fhbPrice: 511900 },
  { name: "Mocha 24 (Detached Garage)", division: "QLD", housingType: "Double Storey", groundM2: 129.16, firstM2: 89.86, totalM2: 219.02, fhbPrice: 514900 },
  { name: "Mocha 25", division: "QLD", housingType: "Double Storey", groundM2: 155.13, firstM2: 77.13, totalM2: 232.26, fhbPrice: 516900 },
  { name: "Orchid 23 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 115.65, firstM2: 95.56, totalM2: 211.21, fhbPrice: 497900, isSingleGarage: true },
  { name: "Orchid 25 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 123.89, firstM2: 105.61, totalM2: 229.50, fhbPrice: 516900, isSingleGarage: true },
  { name: "Ruby 19 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 87.52, firstM2: 85.26, totalM2: 172.78, fhbPrice: 461900, isSingleGarage: true },
  { name: "Ruby 21 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 99.94, firstM2: 95.46, totalM2: 195.40, fhbPrice: 476900, isSingleGarage: true },
  { name: "Ruby 23 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 114.03, firstM2: 100.11, totalM2: 214.14, fhbPrice: 485900, isSingleGarage: true },
  { name: "Sabel 28", division: "QLD", housingType: "Double Storey", groundM2: 141.86, firstM2: 115.53, totalM2: 257.39, fhbPrice: 539900 },
  { name: "Terracotta 23 (s/g)", division: "QLD", housingType: "Double Storey", groundM2: 114.18, firstM2: 96.02, totalM2: 210.20, fhbPrice: 488900, isSingleGarage: true },
  { name: "Terracotta 25", division: "QLD", housingType: "Double Storey", groundM2: 138.39, firstM2: 92.30, totalM2: 230.69, fhbPrice: 514900 },
];

export const ALL_FHB_PRICES: FhbPriceRow[] = [
  ...NSW_FHB_SINGLE_STOREY_PRICES,
  ...QLD_FHB_DOUBLE_STOREY_PRICES,
];

export function cleanDesignNameForFhb(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*\((?:single|two|double)\s*stor(?:y|ey)[^)]*\)/gi, "")
    .replace(/\bmk\s*ii\b|\bmkii\b/gi, "mk2")
    .replace(/\s*\(?[sSdD]\/[gG]\)?/gi, "")
    .replace(/\b(?:single|double)?\s*garage\b/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Exact matching lookup for official FHB Spec price.
 */
export function findFhbPrice(
  name: string,
  division?: "NSW" | "QLD" | string,
  housingType?: string,
  options?: { bedrooms?: number | string; garage?: string },
): number | null {
  if (!name) return null;
  const rawTrimmed = name.trim().toLowerCase();

  // Determine lists to search
  const divUpper = (division || "").toUpperCase();
  let candidateLists: FhbPriceRow[][] = [];
  if (divUpper === "NSW") {
    candidateLists = [NSW_FHB_SINGLE_STOREY_PRICES, ALL_FHB_PRICES];
  } else if (divUpper === "QLD") {
    candidateLists = [QLD_FHB_DOUBLE_STOREY_PRICES, ALL_FHB_PRICES];
  } else {
    // If division is not provided or ALL, search all
    candidateLists = [ALL_FHB_PRICES];
  }

  // Handle Azure 19 bedrooms explicitly
  const isAzure19 = /azure\s*19\b/i.test(name);
  if (isAzure19) {
    const is3Bed =
      /3\s*(?:bed|bedroom)/i.test(name) ||
      options?.bedrooms === 3 ||
      options?.bedrooms === "3";
    const targetName = is3Bed ? "Azure 19 - (3 Bedrooms)" : "Azure 19 - (4 Bedrooms)";
    const match = ALL_FHB_PRICES.find((r) => r.name === targetName);
    if (match) return match.fhbPrice;
  }

  // Handle Mocha 24 garage explicitly
  const isMocha24 = /mocha\s*24\b/i.test(name);
  if (isMocha24) {
    const isDetached = /detach/i.test(name) || /detach/i.test(options?.garage || "");
    const targetName = isDetached ? "Mocha 24 (Detached Garage)" : "Mocha 24 (Attached Garage)";
    const match = ALL_FHB_PRICES.find((r) => r.name === targetName);
    if (match) return match.fhbPrice;
  }

  // Handle Carmine MK2 explicitly if searched as Carmine 21 or Carmine 23
  if (/^carmine\s*21(?:\s*(?:mk\s*2|mkii|mk2))?$/i.test(rawTrimmed)) {
    const match = ALL_FHB_PRICES.find((r) => r.name.toLowerCase().startsWith("carmine 21"));
    if (match) return match.fhbPrice;
  }
  if (/^carmine\s*23(?:\s*(?:mk\s*2|mkii|mk2))?$/i.test(rawTrimmed)) {
    const match = ALL_FHB_PRICES.find((r) => r.name.toLowerCase().startsWith("carmine 23"));
    if (match) return match.fhbPrice;
  }

  for (const list of candidateLists) {
    // 1. Direct exact match
    const exact = list.find((r) => r.name.toLowerCase() === rawTrimmed);
    if (exact) return exact.fhbPrice;

    // 2. Normalized alphanumeric match
    const cleanInput = cleanDesignNameForFhb(name);
    const norm = list.find((r) => cleanDesignNameForFhb(r.name) === cleanInput);
    if (norm) return norm.fhbPrice;
  }

  return null;
}

/**
 * Calculates FHB Landscaping Package allowance:
 * - LP up to 300m²: -$6,000 credit
 * - LP up to 450m²: Included ($0)
 * - LP up to 600m²: +$8,000
 * - LP up to 700m²: +$12,000
 * - LP up to 800m²: +$17,000
 * - LP up to 900m²: +$22,000
 */
export function getFhbLandscapeAllowance(landSize: number | string): number {
  const size = Number(String(landSize).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(size) || size <= 0) return 0; // Default to standard block (included)
  const matched = FHB_LANDSCAPE_PACKAGES.find((tier) => size <= tier.upToM2);
  return matched ? matched.allowance : 22000;
}
