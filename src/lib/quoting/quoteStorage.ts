import { DEFAULT_CATALOGUE, DEFAULT_CUSTOM_RATES } from "./quoteCatalogue";
import { calculateQuotePricing, generateQuoteNumber } from "./quoteEngine";
import { plansForDesign } from "@/components/flyer/floorplans";
import { SINGLE_STOREY_PRICES } from "@/lib/pricelist.data";
import type {
  CatalogueItem,
  FullQuote,
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  SiteConditions,
} from "./quoteTypes";

const STORAGE_KEY_QUOTES = "hudson_builders_estimate_quotes_v6";
const STORAGE_KEY_CATALOGUE = "hudson_builders_estimate_catalogue_v6";
const STORAGE_KEY_CUSTOM_RATES = "hudson_builders_estimate_custom_rates_v6";

export function loadCatalogue(): CatalogueItem[] {
  if (typeof window === "undefined") return DEFAULT_CATALOGUE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOGUE);
    if (!raw) return DEFAULT_CATALOGUE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_CATALOGUE;
  } catch {
    return DEFAULT_CATALOGUE;
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
  return DEFAULT_CATALOGUE;
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
  return catalogue.map((cat) => ({
    id: `item_${cat.id}_${Math.random().toString(36).slice(2, 7)}`,
    catalogueItemId: cat.id,
    category: cat.category,
    name: cat.name,
    description: cat.description,
    unitType: cat.unitType,
    unitRate: cat.unitRate,
    quantity: cat.defaultQty ?? 1,
    subtotal: (cat.defaultQty ?? 1) * cat.unitRate,
    isIncluded: cat.unitRate > 0,
    isClientSelectable: !!cat.isClientSelectable,
    clientSelected: true,
  }));
}

export function createNewBlankQuote(): FullQuote {
  const catalogue = loadCatalogue();
  const rates = loadCustomRates();
  const lineItems = convertCatalogueToLineItems(catalogue);

  const initialModel = SINGLE_STOREY_PRICES.find((m) => m.name === "Mulberry 33") || SINGLE_STOREY_PRICES[0];
  const plans = plansForDesign(initialModel.name);
  const floorplanUrl = plans[0]?.url || "/floorplans/MULBERRY 33.png";

  const defaultDesign: QuoteDesignSelection = {
    mode: "standard",
    housingType: "Single Storey",
    designName: initialModel.name,
    designM2: initialModel.m2,
    facadeName: "Classic Plus",
    facadePrice: 4700,
    isCustomFacade: false,
    customFacadeDescription: "",
    specTier: "H3 Inclusions (2025)",
    basePrice: initialModel.h3 || 530900,
    floorplanUrl,
    beds: plans[0]?.beds || "4",
    baths: plans[0]?.baths || "2.5",
    cars: plans[0]?.cars || "2",
    widthM: plans[0]?.width || "14.2m",
    lengthM: plans[0]?.depth || "23.5m",
    promotionName: "Hudson Special Builder Promotion",
    promotionsDiscount: 0,
    customSpec: {
      groundLivingM2: 185,
      firstLivingM2: 0,
      garageM2: 38,
      alfrescoM2: 18,
      porchM2: 6,
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
    fallMeters: 0.5,
    fallTotalCost: 0,
    councilRegion: "Logan City Council",
    councilFee: 2227,
    bushfireBal: "None",
    bushfireCost: 0,
    acousticTier: "None",
    acousticCost: 0,
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
      clientName: "Jordan Samuel Mitchell",
      clientEmail: "jordan.mitchell@example.com",
      clientPhone: "0417 555 123",
      hasClient2: true,
      client2Name: "Stephannie Ann Krause",
      client2Email: "stephannie.krause@example.com",
      client2Phone: "0418 777 888",
      siteAddress: "31 Broad Axe Crescent",
      lotNumber: "Lot 134",
      suburb: "New Beith",
      estate: "New Beith Estate",
      postcode: "4124",
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
      notes: "This Builders Estimate is valid for 14 days and has been prepared based on the Hudson Homes H3 Luxury Specification Range.",
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
    const raw = localStorage.getItem(STORAGE_KEY_QUOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
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
