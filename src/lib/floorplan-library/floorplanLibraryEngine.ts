import { HUDSON_FLOORPLANS, type FloorplanRecord } from "@/components/flyer/floorplans.data";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
} from "@/lib/pricelist.nsw.data";
import { getHousingTypeForDesign } from "@/lib/quoting/quoteEngine";
import { HUDSON_DESIGNS_CATALOG } from "@/lib/site-studio/hudsonDesignCatalog";
import { HUDSON_CAD_REGISTRY } from "@/components/flyer/floorplanVisionEngine";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";

export type HouseTypeFilter =
  | "All"
  | "Single Storey"
  | "Double Storey"
  | "Dual Living"
  | "Split Level"
  | "Granny Flat";

export type InclusionsTier = "H1" | "H2" | "H3" | "HBS" | "SS";

export type SortOption =
  | "size-desc"
  | "size-asc"
  | "price-asc"
  | "price-desc"
  | "width-asc"
  | "width-desc"
  | "name-asc";

export type ViewMode = "grid-3" | "grid-2" | "feed";

export interface FloorplanPrices {
  h1: number;
  h2: number;
  h3: number;
  hbs: number;
  ss: number;
}

export interface FloorplanVariantItem {
  id: string; // e.g. "amber-21"
  label: string; // e.g. "Amber 21"
  sizeLabel: string; // e.g. "21"
  beds: number;
  baths: number;
  cars: number;
  totalM2: number;
  squares: number;
  widthM: number;
  lengthM: number;
  frontageM: number;
  url: string;
  pdfUrl?: string;
  cropBoxes?: Array<{ page?: number; x?: number; y?: number; w?: number; h?: number; points?: Array<{ x: number; y: number }> }>;
  isBtbReady: boolean;
  btbDescription?: string;
  facadeUrl?: string;
  prices: FloorplanPrices;
  matchedPriceName?: string;
}

export interface FloorplanLibraryItem {
  id: string; // e.g. "amber"
  designName: string; // e.g. "Amber"
  label: string; // Default or active variant label, e.g. "Amber 21"
  design: string;
  housingType: "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | "Granny Flat";
  defaultVariantIndex: number;
  variants: FloorplanVariantItem[];
  cropBoxes?: Array<{ page?: number; x?: number; y?: number; w?: number; h?: number; points?: Array<{ x: number; y: number }> }>;
  // Bounds across variants for quick filtering
  minM2: number;
  maxM2: number;
  minSquares: number;
  maxSquares: number;
  minWidthM: number;
  maxWidthM: number;
  minFrontageM: number;
  maxFrontageM: number;
  // Default variant fields for backwards-compatibility:
  beds: number;
  baths: number;
  cars: number;
  totalM2: number;
  squares: number;
  widthM: number;
  lengthM: number;
  frontageM: number;
  url: string;
  pdfUrl?: string;
  isBtbReady: boolean;
  btbDescription?: string;
  facadeUrl?: string;
  prices: FloorplanPrices;
  matchedPriceName?: string;
}

export interface FloorplanFiltersState {
  searchQuery: string;
  houseType: HouseTypeFilter;
  inclusionsTier: InclusionsTier;
  division: "QLD" | "NSW";
  btbOnly: boolean;
  bedrooms: number | null; // null = all, 1, 2, 3, 4, 5 (for 5+)
  bathrooms: number | null;
  cars: number | null;
  minWidth: number;
  maxWidth: number;
  lotWidthPreset: string; // "all", "10m", "12.5m", "14m", "16m+"
  sizePreset: string; // "all", "under-20", "20-25", "25-30", "30-35", "35-plus"
  minLength: number;
  maxLength: number;
  minSize: number;
  maxSize: number;
  minPrice: number;
  maxPrice: number;
  pricePreset: string; // "all", "under-350", "350-450", "450-550", "550-plus"
  exactMaxWidth?: string;
  exactMaxLength?: string;
  sortBy: SortOption;
}

const DESIGN_ALIASES: Record<string, string> = {
  cayene: "cayenne",
};

export function planKey(name: string): string {
  const m = /^\s*([a-z]+)[^0-9]*(\d+)/i.exec(name.replace(/[^a-z0-9 ]+/gi, " "));
  if (!m) return name.trim().toLowerCase();
  const family = m[1].toLowerCase();
  return `${DESIGN_ALIASES[family] ?? family} ${m[2]}`;
}

/** Builds a lookup table for PriceRow by canonical planKey */
function buildPriceMap(priceRows: PriceRow[]): Map<string, PriceRow> {
  const map = new Map<string, PriceRow>();
  for (const row of priceRows) {
    const k = planKey(row.name);
    if (!map.has(k)) {
      map.set(k, row);
    }
    // Also store normalized alphanumeric key for fallback
    const norm = row.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!map.has(norm)) {
      map.set(norm, row);
    }
  }
  return map;
}

/**
 * Complete audited registry of Hudson Homes design families where ALL variants
 * feature an engineered BTB (Build-to-Boundary / Zero-Lot) garage step-out wall.
 */
const BTB_ALL_VARIANTS_FAMILIES = new Set([
  // Single Storey & Split Level BTB Step-Out Families
  "jasper",
  "onyx",
  "charcoal",
  "hazel",
  "coral",
  "carolina",
  "lime",
  "mint",
  "ruby",
  "quartz",
  "ivory",
  "cedar",
  "olive",
  "kobi",
  "sage",
  "eton",
  "celeste",
  "auburn",
  "cerise",
  // Double Storey, Split Level & Dual Living BTB Step-Out Families
  "marigold",
  "maroon",
  "turquoise",
  "sabel",
  "sable",
  "orchid",
  "viridian",
  "rosewood",
  "cinnamon",
  "tangerine",
  "violet",
  "burgundy",
  "mauve",
  "rose",
  "raven",
  "amaranth",
]);

/**
 * Specific size variants with an engineered BTB garage step-out wall in families
 * where other variants have a flush garage wall (e.g. Iris 21, Emerald 39+, Terracotta 23).
 */
const BTB_SPECIFIC_VARIANTS = new Set([
  "iris 15",
  "iris 17",
  "iris 18",
  "emerald 28",
  "terracotta 25",
  "terracotta 30",
  "terracotta 36",
]);

/**
 * Check if design is compatible with Built-to-Boundary (BTB).
 * Strictly requires an engineered garage step-out wall (audited across all Hudson Homes floorplans)
 * or explicit BTB architectural classification.
 */
export function isFloorplanBtb(plan: FloorplanRecord): { isBtb: boolean; reason?: string } {
  const normLabel = plan.label.toLowerCase().trim();
  const normDesign = plan.design.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
  const canonicalKey = planKey(plan.label);

  // 1. Explicit BTB naming in plan or brochure
  if (
    normLabel.includes("btb") ||
    normLabel.includes("zero lot") ||
    normLabel.includes("zero-lot") ||
    normDesign.includes("btb")
  ) {
    return { isBtb: true, reason: "Engineered BTB Zero-Lot Design with Stepped Garage" };
  }

  // 2. Variant-specific BTB step-out designs (Iris 15/17/18, Emerald 28, Terracotta 25/30/36)
  if (BTB_SPECIFIC_VARIANTS.has(canonicalKey) || BTB_SPECIFIC_VARIANTS.has(normLabel)) {
    return { isBtb: true, reason: "Engineered BTB garage step-out for zero-lot boundary wall" };
  }
  if (normDesign === "iris" || normDesign === "emerald" || normDesign === "terracotta") {
    return { isBtb: false };
  }

  // 3. Audited Hudson Homes design families with engineered BTB garage step-out
  if (
    BTB_ALL_VARIANTS_FAMILIES.has(normDesign) ||
    Array.from(BTB_ALL_VARIANTS_FAMILIES).some((fam) => normLabel.startsWith(fam + " "))
  ) {
    return { isBtb: true, reason: "Engineered BTB garage step-out for zero-lot boundary wall" };
  }

  // 4. Check CAD registry for positive garageStepOutM
  const cad = HUDSON_CAD_REGISTRY[plan.label];
  if (cad && cad.garageStepOutM > 0) {
    return {
      isBtb: true,
      reason: `Engineered ${(cad.garageStepOutM * 1000).toFixed(0)}mm garage step-out for zero-lot boundary wall`,
    };
  }

  return { isBtb: false };
}

/** Fallback pricing for auxiliary dwellings (Granny Flats) */
const GRANNY_FLAT_PRICES: Record<string, FloorplanPrices> = {
  "aqua 1": { h1: 154000, h2: 159000, h3: 167000, hbs: 154000, ss: 156000 },
  "aqua 2": { h1: 156000, h2: 161000, h3: 169000, hbs: 156000, ss: 158000 },
  "aqua 3": { h1: 154000, h2: 159000, h3: 167000, hbs: 154000, ss: 156000 },
  "aqua 4": { h1: 155000, h2: 160000, h3: 168000, hbs: 155000, ss: 157000 },
  "aqua 5": { h1: 153000, h2: 158000, h3: 166000, hbs: 153000, ss: 155000 },
};

/** Extracts clean size variant label (e.g. "Amber 21" -> "21") */
export function extractSizeVariantLabel(label: string, design: string): string {
  const escaped = design.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let s = label.replace(new RegExp(`^${escaped}`, "i"), "").trim();
  if (!s) {
    const m = label.match(/\d+.*$/);
    if (m) s = m[0];
    else s = label;
  }
  return s.replace(/^[-_ ]+/, "") || label;
}

/**
 * Loads all 221 Hudson floorplans and groups them into 58 Standard Design Plans
 * with interactive size variants.
 */
export function loadAllFloorplanLibraryItems(division: "QLD" | "NSW" = "QLD"): FloorplanLibraryItem[] {
  const isNsw = division === "NSW";

  const allPriceRows: PriceRow[] = isNsw
    ? [
        ...NSW_SINGLE_STOREY_PRICES,
        ...NSW_DOUBLE_STOREY_PRICES,
        ...NSW_SPLIT_LEVEL_PRICES,
        ...NSW_DUAL_OC_PRICES,
      ]
    : [
        ...SINGLE_STOREY_PRICES,
        ...DOUBLE_STOREY_PRICES,
        ...SPLIT_LEVEL_PRICES,
        ...DUAL_OC_PRICES,
      ];

  const priceMap = buildPriceMap(allPriceRows);

  // 1. Process all 221 raw floorplans into variant items
  const rawVariants: (FloorplanVariantItem & { designName: string; housingType: "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | "Granny Flat" })[] =
    HUDSON_FLOORPLANS.map((plan) => {
      const rawDesign = (plan.design || "").trim();
      const rawLabel = (plan.label || rawDesign).trim();
      const housingType = getHousingTypeForDesign(rawLabel || rawDesign);

      // Dimensions
      let widthM = parseFloat(String(plan.houseWidth || plan.width || "0"));
      let lengthM = parseFloat(String(plan.houseLength || plan.depth || "0"));
      let frontageM = parseFloat(String(plan.frontage || "0"));

      // Patch known missing dimension for Sabel 28
      if (rawLabel.includes("Sabel") && (!widthM || !lengthM)) {
        widthM = 8.5;
        lengthM = 20.5;
        frontageM = 10.0;
      }

      let rawM2 = parseFloat(String(plan.size || "0")) || 0;
      if (rawM2 > 1000) rawM2 = rawM2 / 100;
      const totalM2 = rawM2;
      const squares = Math.round((totalM2 / 9.2903) * 10) / 10;
      const beds = parseInt(String(plan.beds || "0"), 10) || 0;
      const baths = parseFloat(String(plan.baths || "0")) || 0;
      const cars = parseInt(String(plan.cars || "0"), 10) || 0;

      // BTB check
      const btb = isFloorplanBtb(plan);

      // Facade render lookup
      const isDouble = housingType === "Double Storey";
      const facadeItem = findFacadeForDesign("Classic", isDouble, housingType, rawLabel);
      const facadeUrl = facadeItem?.url || "/facades/classic-double-garage.jpg";

      // Pricing lookup
      const key = planKey(rawLabel);
      const norm = rawLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
      let priceRow = priceMap.get(key) || priceMap.get(norm);

      if (!priceRow) {
        const strippedKey = planKey(rawLabel.replace(/[AB]$/, ""));
        priceRow = priceMap.get(strippedKey);
      }

      let prices: FloorplanPrices;
      let matchedPriceName: string | undefined;

      if (priceRow) {
        matchedPriceName = priceRow.name;
        const baseH1 = priceRow.h1 || priceRow.hbs || 0;
        const baseH2 = priceRow.h2 || baseH1;
        const baseH3 = priceRow.h3 || baseH2;
        prices = {
          h1: baseH1,
          h2: baseH2,
          h3: baseH3,
          hbs: priceRow.hbs || baseH1,
          ss: priceRow.ss || baseH1,
        };
      } else {
        const lowerLabel = rawLabel.toLowerCase();
        if (GRANNY_FLAT_PRICES[lowerLabel]) {
          prices = GRANNY_FLAT_PRICES[lowerLabel];
          matchedPriceName = "Standard Auxiliary Dwelling";
        } else {
          const baseRate = housingType === "Double Storey" ? 1750 : 1600;
          const estH1 = Math.round((totalM2 * baseRate) / 100) * 100;
          prices = {
            h1: estH1,
            h2: Math.round(estH1 * 1.085),
            h3: Math.round(estH1 * 1.185),
            hbs: Math.round(estH1 * 0.94),
            ss: Math.round(estH1 * 0.97),
          };
          matchedPriceName = "Estimated Base Rate";
        }
      }

      const sizeLabel = extractSizeVariantLabel(rawLabel, rawDesign);

      return {
        id: rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: rawLabel,
        sizeLabel,
        designName: rawDesign,
        housingType,
        beds,
        baths,
        cars,
        totalM2,
        squares,
        widthM,
        lengthM,
        frontageM,
        url: plan.url,
        pdfUrl: plan.pdfUrl,
        cropBoxes: plan.cropBoxes,
        isBtbReady: btb.isBtb,
        btbDescription: btb.reason,
        facadeUrl,
        prices,
        matchedPriceName,
      };
    });

  // 2. Group into standard design plans (keep Aqua 1..5 as 5 distinct floorplans)
  const designGroups = new Map<string, typeof rawVariants>();
  for (const v of rawVariants) {
    const d = v.designName.toLowerCase() === "aqua" ? v.label : v.designName;
    if (!designGroups.has(d)) {
      designGroups.set(d, []);
    }
    designGroups.get(d)!.push(v);
  }

  // 3. Construct Standard Plan objects with sorted size variants
  const standardPlans: FloorplanLibraryItem[] = [];
  for (const [designName, variants] of designGroups.entries()) {
    // Sort variants by size/squares ascending
    variants.sort((a, b) => a.totalM2 - b.totalM2);

    const first = variants[0];
    const housingType = first.housingType;

    // Bounds across variants
    let minM2 = Infinity, maxM2 = 0;
    let minSquares = Infinity, maxSquares = 0;
    let minWidthM = Infinity, maxWidthM = 0;
    let minFrontageM = Infinity, maxFrontageM = 0;

    for (const v of variants) {
      if (v.totalM2 < minM2) minM2 = v.totalM2;
      if (v.totalM2 > maxM2) maxM2 = v.totalM2;
      if (v.squares < minSquares) minSquares = v.squares;
      if (v.squares > maxSquares) maxSquares = v.squares;
      if (v.widthM > 0) {
        if (v.widthM < minWidthM) minWidthM = v.widthM;
        if (v.widthM > maxWidthM) maxWidthM = v.widthM;
      }
      if (v.frontageM > 0) {
        if (v.frontageM < minFrontageM) minFrontageM = v.frontageM;
        if (v.frontageM > maxFrontageM) maxFrontageM = v.frontageM;
      }
    }

    // Default variant is the baseline (first) size variant
    const defaultIndex = 0;
    const def = variants[defaultIndex];

    standardPlans.push({
      id: designName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      designName,
      label: def.label,
      design: designName,
      housingType,
      defaultVariantIndex: defaultIndex,
      variants,
      minM2: minM2 === Infinity ? def.totalM2 : minM2,
      maxM2: maxM2 === 0 ? def.totalM2 : maxM2,
      minSquares: minSquares === Infinity ? def.squares : minSquares,
      maxSquares: maxSquares === 0 ? def.squares : maxSquares,
      minWidthM: minWidthM === Infinity ? def.widthM : minWidthM,
      maxWidthM: maxWidthM === 0 ? def.widthM : maxWidthM,
      minFrontageM: minFrontageM === Infinity ? def.frontageM : minFrontageM,
      maxFrontageM: maxFrontageM === 0 ? def.frontageM : maxFrontageM,
      // Default variant fields:
      beds: def.beds,
      baths: def.baths,
      cars: def.cars,
      totalM2: def.totalM2,
      squares: def.squares,
      widthM: def.widthM,
      lengthM: def.lengthM,
      frontageM: def.frontageM,
      url: def.url,
      pdfUrl: def.pdfUrl,
      cropBoxes: def.cropBoxes,
      isBtbReady: variants.some((v) => v.isBtbReady),
      btbDescription: def.btbDescription || variants.find((v) => v.isBtbReady)?.btbDescription,
      facadeUrl: def.facadeUrl,
      prices: def.prices,
      matchedPriceName: def.matchedPriceName,
    });
  }

  return standardPlans;
}

/** Get price of an item or variant for the chosen tier */
export function getActiveTierPrice(
  item: { prices: FloorplanPrices },
  tier: InclusionsTier
): number {
  switch (tier) {
    case "H1":
      return item.prices.h1;
    case "H2":
      return item.prices.h2;
    case "H3":
      return item.prices.h3;
    case "HBS":
      return item.prices.hbs;
    case "SS":
      return item.prices.ss;
    default:
      return item.prices.h2;
  }
}

/**
 * Filter and sort standard design library items based on user filters
 */
export function filterAndSortFloorplans(
  items: FloorplanLibraryItem[],
  filters: FloorplanFiltersState
): FloorplanLibraryItem[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const parsedExactMaxW = parseFloat(String(filters.exactMaxWidth || "").trim());
  const hasExactMaxW = !Number.isNaN(parsedExactMaxW) && parsedExactMaxW > 0;
  const parsedExactMaxL = parseFloat(String(filters.exactMaxLength || "").trim());
  const hasExactMaxL = !Number.isNaN(parsedExactMaxL) && parsedExactMaxL > 0;

  const filtered: FloorplanLibraryItem[] = (items
    .map((item) => {
      // Find matching variants for this standard plan
      const matchingVariantIndices: number[] = [];

      for (let idx = 0; idx < item.variants.length; idx++) {
        const v = item.variants[idx];
        let matches = true;

        // 1. Text Search
        if (query) {
          const matchDesign = item.designName.toLowerCase().includes(query);
          const matchLabel = v.label.toLowerCase().includes(query);
          const matchSize = v.sizeLabel.toLowerCase().includes(query);
          const matchType = item.housingType.toLowerCase().includes(query);
          if (!matchDesign && !matchLabel && !matchSize && !matchType) {
            matches = false;
          }
        }

        // 2. House Type
        if (filters.houseType !== "All") {
          if (filters.houseType === "Dual Living") {
            if (item.housingType !== "Dual Living") matches = false;
          } else if (item.housingType !== filters.houseType) {
            matches = false;
          }
        }

        // 3. BTB Only Filter
        if (filters.btbOnly && !v.isBtbReady) {
          matches = false;
        }

        // 4. Bedrooms
        if (filters.bedrooms !== null) {
          if (filters.bedrooms >= 5) {
            if (v.beds < 5) matches = false;
          } else if (v.beds !== filters.bedrooms) {
            matches = false;
          }
        }

        // 5. Bathrooms
        if (filters.bathrooms !== null) {
          if (filters.bathrooms >= 3) {
            if (v.baths < 3) matches = false;
          } else if (Math.floor(v.baths) !== filters.bathrooms) {
            matches = false;
          }
        }

        // 6. Cars
        if (filters.cars !== null) {
          if (filters.cars >= 3) {
            if (v.cars < 3) matches = false;
          } else if (v.cars !== filters.cars) {
            matches = false;
          }
        }

        // 7. Width & Lot Frontage Filter
        if (filters.lotWidthPreset && filters.lotWidthPreset !== "all") {
          const w = v.widthM;
          const f = v.frontageM;
          if (filters.lotWidthPreset === "10m") {
            const fits = (w > 0 && w <= 8.85) || (f > 0 && f <= 10.5);
            if (!fits) matches = false;
          } else if (filters.lotWidthPreset === "12.5m") {
            const fits = (w > 8.85 && w <= 11.45) || (f > 10.5 && f <= 12.8);
            if (!fits) matches = false;
          } else if (filters.lotWidthPreset === "14m") {
            const fits = (w > 11.45 && w <= 12.85) || (f > 12.8 && f <= 14.5);
            if (!fits) matches = false;
          } else if (filters.lotWidthPreset === "16m+") {
            const fits = w > 12.85 || f >= 15.0;
            if (!fits) matches = false;
          }
        } else if (v.widthM > 0) {
          if (v.widthM < filters.minWidth || v.widthM > filters.maxWidth) {
            matches = false;
          }
        }

        // 8. Size Preset (Squares)
        if (filters.sizePreset && filters.sizePreset !== "all") {
          const sq = v.squares;
          if (filters.sizePreset === "under-20" && sq >= 20) matches = false;
          if (filters.sizePreset === "20-25" && (sq < 20 || sq >= 25)) matches = false;
          if (filters.sizePreset === "25-30" && (sq < 25 || sq >= 30)) matches = false;
          if (filters.sizePreset === "30-35" && (sq < 30 || sq >= 35)) matches = false;
          if (filters.sizePreset === "35-plus" && sq < 35) matches = false;
        } else if (v.totalM2 > 0) {
          if (v.totalM2 < filters.minSize || v.totalM2 > filters.maxSize) {
            matches = false;
          }
        }

        // 9. Length Range
        if (v.lengthM > 0) {
          if (v.lengthM < filters.minLength || v.lengthM > filters.maxLength) {
            matches = false;
          }
        }

        // 9b. Exact Size Filter (Max Width & Max Length)
        if (hasExactMaxW) {
          if (!v.widthM || v.widthM > parsedExactMaxW) {
            matches = false;
          }
        }
        if (hasExactMaxL) {
          if (!v.lengthM || v.lengthM > parsedExactMaxL) {
            matches = false;
          }
        }

        // 10. Price Range for Selected Inclusion Tier
        const currentPrice = getActiveTierPrice(v, filters.inclusionsTier);
        if (currentPrice > 0) {
          if (filters.pricePreset && filters.pricePreset !== "all") {
            if (filters.pricePreset === "under-350" && currentPrice > 350000) matches = false;
            if (filters.pricePreset === "350-450" && (currentPrice < 350000 || currentPrice > 450000)) matches = false;
            if (filters.pricePreset === "450-550" && (currentPrice < 450000 || currentPrice > 550000)) matches = false;
            if (filters.pricePreset === "550-plus" && currentPrice < 550000) matches = false;
          } else {
            if (currentPrice < filters.minPrice || currentPrice > filters.maxPrice) {
              matches = false;
            }
          }
        }

        if (matches) {
          matchingVariantIndices.push(idx);
        }
      }

      // If at least one variant matches, return the plan with best matching variant pre-selected
      if (matchingVariantIndices.length > 0) {
        const bestIndex = matchingVariantIndices[0];
        const bestVariant = item.variants[bestIndex];
        return {
          ...item,
          defaultVariantIndex: bestIndex,
          label: bestVariant.label,
          beds: bestVariant.beds,
          baths: bestVariant.baths,
          cars: bestVariant.cars,
          totalM2: bestVariant.totalM2,
          squares: bestVariant.squares,
          widthM: bestVariant.widthM,
          lengthM: bestVariant.lengthM,
          frontageM: bestVariant.frontageM,
          url: bestVariant.url,
          pdfUrl: bestVariant.pdfUrl,
          isBtbReady: bestVariant.isBtbReady,
          btbDescription: bestVariant.btbDescription,
          facadeUrl: bestVariant.facadeUrl,
          prices: bestVariant.prices,
          matchedPriceName: bestVariant.matchedPriceName,
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null) as unknown as FloorplanLibraryItem[]);

  // Sort
  return filtered.sort((a, b) => {
    const priceA = getActiveTierPrice(a, filters.inclusionsTier);
    const priceB = getActiveTierPrice(b, filters.inclusionsTier);

    switch (filters.sortBy) {
      case "size-desc":
        return b.totalM2 - a.totalM2;
      case "size-asc":
        return a.totalM2 - b.totalM2;
      case "price-asc":
        return priceA - priceB;
      case "price-desc":
        return priceB - priceA;
      case "width-asc":
        return a.widthM - b.widthM;
      case "width-desc":
        return b.widthM - a.widthM;
      case "name-asc":
        return a.designName.localeCompare(b.designName);
      default:
        return b.totalM2 - a.totalM2;
    }
  });
}

/** Compute overall stats for slider bounds */
export function getFilterBounds(items: FloorplanLibraryItem[]) {
  let minW = 100, maxW = 0;
  let minL = 100, maxL = 0;
  let minS = 1000, maxS = 0;
  let minP = 1000000, maxP = 0;

  for (const item of items) {
    if (item.minWidthM > 0 && item.minWidthM < minW) minW = item.minWidthM;
    if (item.maxWidthM > maxW) maxW = item.maxWidthM;
    if (item.lengthM > 0) {
      if (item.lengthM < minL) minL = item.lengthM;
      if (item.lengthM > maxL) maxL = item.lengthM;
    }
    if (item.minM2 > 0 && item.minM2 < minS) minS = item.minM2;
    if (item.maxM2 > maxS) maxS = item.maxM2;

    const p = item.prices.h2 || item.prices.h1 || item.prices.hbs;
    if (p > 0) {
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    }
  }

  return {
    minWidth: Math.floor(minW) || 5,
    maxWidth: Math.ceil(maxW) || 30,
    minLength: Math.floor(minL) || 5,
    maxLength: Math.ceil(maxL) || 35,
    minSize: Math.floor(minS) || 50,
    maxSize: Math.ceil(maxS) || 590,
    minPrice: 0,
    maxPrice: Math.ceil(maxP / 10000) * 10000 || 1200000,
  };
}

