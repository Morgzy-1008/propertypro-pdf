import { DEFAULT_CATALOGUE, DEFAULT_CUSTOM_RATES } from "./quoteCatalogue";
import { calculateQuotePricing, generateQuoteNumber, resolveItemCategory } from "./quoteEngine";
import { plansForDesign } from "@/components/flyer/floorplans";
import { SINGLE_STOREY_PRICES } from "@/lib/pricelist.data";
import type {
  CatalogueItem,
  FullQuote,
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  SiteConditions,
} from "./quoteTypes";

const STORAGE_KEY_QUOTES = "hudson_builders_estimate_quotes_v9";
const STORAGE_KEY_CATALOGUE = "hudson_builders_estimate_catalogue_v11";
const STORAGE_KEY_CUSTOM_RATES = "hudson_builders_estimate_custom_rates_v8";

export function loadCatalogue(): CatalogueItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_CATALOGUE.map((it) => ({ ...it, category: resolveItemCategory(it) }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOGUE);
    if (!raw) {
      return DEFAULT_CATALOGUE.map((it) => ({ ...it, category: resolveItemCategory(it) }));
    }
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : DEFAULT_CATALOGUE;
    return items.map((it: CatalogueItem) => ({ ...it, category: resolveItemCategory(it) }));
  } catch {
    return DEFAULT_CATALOGUE.map((it) => ({ ...it, category: resolveItemCategory(it) }));
  }
}

export function saveCatalogue(items: CatalogueItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CATALOGUE, JSON.stringify(items));
}

export function resetCatalogueToDefault(): CatalogueItem[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CATALOGUE);
  }
  return DEFAULT_CATALOGUE.map((it) => ({ ...it, category: resolveItemCategory(it) }));
}

export function loadCustomRates() {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_RATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_RATES);
    if (!raw) return DEFAULT_CUSTOM_RATES;
    return { ...DEFAULT_CUSTOM_RATES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CUSTOM_RATES;
  }
}

export function saveCustomRates(rates: typeof DEFAULT_CUSTOM_RATES): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CUSTOM_RATES, JSON.stringify(rates));
}

export function convertCatalogueToLineItems(catalogue: CatalogueItem[]): QuoteSelectedLineItem[] {
  return catalogue.map((cat) => {
    const resolvedCat = resolveItemCategory(cat);
    return {
      id: `item_${cat.id}_${Math.random().toString(36).slice(2, 7)}`,
      catalogueItemId: cat.id,
      category: resolvedCat,
      name: cat.name,
      description: cat.description,
      unitType: cat.unitType,
      unitRate: cat.unitRate,
      quantity: cat.defaultQty ?? 1,
      subtotal: (cat.defaultQty ?? 1) * cat.unitRate,
      isIncluded: false, // Fresh clean canvas: zero pre-selected variations
      isClientSelectable: !!cat.isClientSelectable,
      clientSelected: false,
    };
  });
}

export function createNewBlankQuote(): FullQuote {
  const catalogue = loadCatalogue();
  const rates = loadCustomRates();
  const lineItems = convertCatalogueToLineItems(catalogue);

  const defaultDesign: QuoteDesignSelection = {
    mode: "standard",
    housingType: "Single Storey",
    designName: "",
    designM2: 0,
    facadeName: "",
    facadePrice: 0,
    isCustomFacade: false,
    customFacadeDescription: "",
    specTier: "H2 Design Inclusions",
    basePrice: 0,
    floorplanUrl: "",
    beds: "",
    baths: "",
    cars: "",
    widthM: "",
    lengthM: "",
    promotionName: "Hudson Special Builder Promotion",
    promotionsDiscount: 0,
    landscapingSelected: false,
    landscapingLandSize: 450,
    landscapingCost: 0,
    exposedDrivewaySelected: false,
    exposedDrivewayM2: 55,
    exposedDrivewayCost: 0,
    customSpec: {
      groundLivingM2: 0,
      firstLivingM2: 0,
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      balconyM2: 0,
      storeys: "single",
      groundRateM2: rates.singleGroundLivingM2Rate,
      upperRateM2: rates.doubleUpperLivingM2Rate,
      ancillaryRateM2: rates.ancillaryM2Rate,
      scaffoldingAllowance: rates.doubleScaffoldingAllowance,
    },
  };

  const defaultSite: SiteConditions = {
    soilClass: "Class M",
    soilCostSqm: 0,
    soilTotalCost: 0,
    concrete32MpaRequired: false,
    concrete32MpaCost: undefined,
    flexibleConnectionsRequired: false,
    flexibleConnectionsCost: 1800,
    fallMeters: 0.5,
    fallTotalCost: 0,

    bushfireReportRequired: false,
    bushfireReportCost: 850,
    floodReportRequired: false,
    floodReportCost: 7600,
    hydraulicReportRequired: false,
    hydraulicReportCost: 2600,
    landslideReportRequired: false,
    landslideReportCost: 7000,
    acousticReportRequired: false,
    acousticReportCost: 1200,
    arboristReportRequired: false,
    arboristReportCost: 1100,
    cctvSewerReportRequired: false,
    cctvSewerReportCost: 3300,

    bushfireBal: "None",
    bushfireCost: 0,
    floodOverlayRequired: false,
    slabElevationMeters: 0.3,
    floodOverlayCost: undefined,
    acousticTier: "None",
    acousticCost: 0,

    councilRegion: "Logan City Council",
    councilFee: 2227,
    councilDaRequired: false,
    councilDaCost: 8000,
    trafficControlRequired: false,
    trafficControlCost: 10000,
    dualLivingInfrastructureRequired: false,
    dualLivingInfrastructureCost: 23000,
    sedimentAssetProtectionCost: 0,

    screwPieringRequired: false,
    screwPieringCost: 0,
    rockExcavationAllowance: 0,
    retainingWallAllowance: 0,
    materialHandlingRequired: false,
    materialHandlingAllowance: 0,
  };

  const defaultDeposit = 1650;
  const pricing = calculateQuotePricing(defaultDesign, defaultSite, lineItems, defaultDeposit);
  const estimateNo = generateQuoteNumber();

  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber: estimateNo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    client: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      hasClient2: false,
      client2Name: "",
      client2Email: "",
      client2Phone: "",
      siteAddress: "",
      lotNumber: "",
      suburb: "",
      estate: "",
      postcode: "",
      estimateNumber: estimateNo,
      estimateVersion: 1,
      depositType: "greenfield",
      depositAmount: defaultDeposit,
      quoteValidityDays: 14,
      consultantId: "morgan-hales",
      consultantName: "Morgan Hales",
      consultantPhone: "0417 571 864",
      consultantEmail: "Morgan.hales@hudsonhomes.com.au",
      consultantOffice: "Flagstone Display Home",
      notes: "",
    },
    design: defaultDesign,
    siteConditions: defaultSite,
    lineItems,
    pricing,
  };
}

export function loadAllQuotes(): FullQuote[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY_QUOTES);
    if (!raw) {
      // Fallback check for v8 quotes
      raw = localStorage.getItem("hudson_builders_estimate_quotes_v8");
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((q: FullQuote) => {
      const normalizedLineItems = (q.lineItems || []).map((it) => ({
        ...it,
        category: resolveItemCategory(it),
      }));

      // If depositType is brownfield, ensure screw piering is active
      const isBrownfield = q.client?.depositType === "brownfield";
      const updatedSite = {
        ...q.siteConditions,
        screwPieringRequired: isBrownfield ? true : (q.siteConditions?.screwPieringRequired ?? false),
      };

      return {
        ...q,
        siteConditions: updatedSite,
        lineItems: normalizedLineItems,
      };
    });
  } catch {
    return [];
  }
}

export function getQuoteById(id: string): FullQuote | null {
  const all = loadAllQuotes();
  return all.find((q) => q.id === id || q.quoteNumber === id) ?? null;
}

export function saveQuote(quote: FullQuote): void {
  if (typeof window === "undefined") return;
  const all = loadAllQuotes();
  const index = all.findIndex((q) => q.id === quote.id);
  const updated: FullQuote = {
    ...quote,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    all[index] = updated;
  } else {
    all.unshift(updated);
  }
  localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(all));
}

export function deleteQuote(id: string): void {
  if (typeof window === "undefined") return;
  const all = loadAllQuotes().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(all));
}
