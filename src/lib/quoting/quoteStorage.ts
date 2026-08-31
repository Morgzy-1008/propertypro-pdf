import { DEFAULT_CATALOGUE, DEFAULT_CUSTOM_RATES } from "./quoteCatalogue";
import { calculateQuotePricing, generateQuoteNumber, resolveItemCategory } from "./quoteEngine";
import { plansForDesign } from "@/components/flyer/floorplans";
import { SINGLE_STOREY_PRICES } from "@/lib/pricelist.data";
import { getActiveStaffUser } from "@/lib/authSession";
import type {
  CatalogueItem,
  FullQuote,
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  SiteConditions,
} from "./quoteTypes";

const STORAGE_KEY_QUOTES = "hudson_builders_estimate_quotes_v9";
const STORAGE_KEY_ACTIVE_DRAFT = "hudson_active_draft_quote_v9";
const STORAGE_KEY_CATALOGUE = "hudson_builders_estimate_catalogue_v11";
const STORAGE_KEY_CUSTOM_RATES = "hudson_builders_estimate_custom_rates_v8";

const IDB_DB_NAME = "PropertyProQuotesDB";
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = "quotes";

function openQuoteDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Asynchronously saves full quote to IndexedDB (no 5MB limit).
 */
export async function saveQuoteToIdb(quote: FullQuote): Promise<void> {
  try {
    const db = await openQuoteDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.put(quote);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB save fallback:", e);
  }
}

/**
 * Asynchronously loads all quotes from IndexedDB.
 */
export async function loadAllQuotesFromIdb(): Promise<FullQuote[]> {
  try {
    const db = await openQuoteDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as FullQuote[]) || [];
        results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        resolve(results);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Asynchronously deletes a quote from IndexedDB.
 */
export async function deleteQuoteFromIdb(id: string): Promise<void> {
  try {
    const db = await openQuoteDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

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
      isIncluded: false, // Fresh clean canvas
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
    fallMeters: 0,
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

    floodOverlayRequired: false,
    floodOverlayCost: undefined,
    slabElevationMeters: 0,
    bushfireBalRating: "BAL-LOW",
    bushfireBalCost: 0,
    acousticGlazingRequired: false,
    acousticGlazingCost: 4500,

    councilRegion: "",
    councilFee: 0,
    councilLodgementFee: 0,
    councilDaRequired: false,
    councilDaCost: 11000,
    councilSetbackRelaxationRequired: false,
    councilSetbackRelaxationCost: 2000,
    trafficControlRequired: false,
    trafficControlCost: 10000,
    dualLivingInfrastructureRequired: false,
    dualLivingInfrastructureCost: 23000,

    screwPieringRequired: false,
    screwPieringCost: undefined,
    demolitionAsbestosRequired: false,
    demolitionAsbestosCost: 30000,
    rockExcavationAllowance: 0,
    retainingWallAllowance: 0,
    materialHandlingAllowance: 0,
    sedimentAssetProtectionCost: 0,
  };

  const defaultDeposit = 1650;
  const pricing = calculateQuotePricing(defaultDesign, defaultSite, lineItems, defaultDeposit);
  const estimateNo = generateQuoteNumber();
  const activeStaff = getActiveStaffUser();

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
      custom3dTourSelected: false,
      quoteValidityDays: 14,
      consultantId: activeStaff?.id || "morgan-hales",
      consultantName: activeStaff?.name || "Morgan Hales",
      consultantPhone: activeStaff?.phone || "0417 571 864",
      consultantEmail: activeStaff?.email || "Morgan.hales@hudsonhomes.com.au",
      consultantOffice: activeStaff?.displayCentre || "Flagstone Display Home",
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
      raw = localStorage.getItem("hudson_builders_estimate_quotes_v8");
    }
    const parsed = raw ? JSON.parse(raw) : [];
    const list: FullQuote[] = Array.isArray(parsed) ? parsed : [];

    // Also include active draft if not present
    const draft = loadActiveDraftQuote();
    if (draft && draft.id && !list.some((q) => q.id === draft.id)) {
      list.unshift(draft);
    }

    return list.map((q: FullQuote) => {
      const normalizedLineItems = (q.lineItems || []).map((it) => ({
        ...it,
        category: resolveItemCategory(it),
      }));

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

/**
 * Loads all quotes with complete fidelity merging IndexedDB + localStorage + active draft.
 */
export async function loadAllQuotesAsync(): Promise<FullQuote[]> {
  const [idbQuotes, syncQuotes] = await Promise.all([
    loadAllQuotesFromIdb(),
    Promise.resolve(loadAllQuotes()),
  ]);

  const map = new Map<string, FullQuote>();

  for (const q of syncQuotes) {
    if (q && q.id) map.set(q.id, q);
  }

  // Overwrite with IndexedDB quotes (contains full unstripped images and freshest data)
  for (const q of idbQuotes) {
    if (q && q.id) map.set(q.id, q);
  }

  const draft = loadActiveDraftQuote();
  if (draft && draft.id && !map.has(draft.id)) {
    map.set(draft.id, draft);
  }

  const results = Array.from(map.values());
  results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return results;
}

export function getQuoteById(id: string): FullQuote | null {
  const all = loadAllQuotes();
  return all.find((q) => q.id === id || q.quoteNumber === id) ?? null;
}

function sanitizeQuoteForLocalStorage(quote: FullQuote): FullQuote {
  const hasHeavyFloorplan = quote.design.floorplanUrl && quote.design.floorplanUrl.length > 500;
  return {
    ...quote,
    design: {
      ...quote.design,
      floorplanUrl: hasHeavyFloorplan ? "" : quote.design.floorplanUrl,
    },
  };
}

/**
 * Save quote to localStorage + IndexedDB + working draft
 */
export function saveQuote(quote: FullQuote): void {
  if (typeof window === "undefined") return;
  const updated: FullQuote = {
    ...quote,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save complete 100% fidelity quote to IndexedDB
  saveQuoteToIdb(updated).catch(() => {});

  // 2. Save active working draft to localStorage
  try {
    const safeDraft = sanitizeQuoteForLocalStorage(updated);
    localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(safeDraft));
  } catch (draftErr) {
    console.warn("Draft save fallback:", draftErr);
  }

  // 3. Save sanitized quote array to localStorage
  try {
    const currentList = loadAllQuotes();
    const safeUpdated = sanitizeQuoteForLocalStorage(updated);
    const existingIndex = currentList.findIndex((q) => q.id === quote.id || q.quoteNumber === quote.quoteNumber);

    let updatedList: FullQuote[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = safeUpdated;
    } else {
      updatedList = [safeUpdated, ...currentList];
    }

    const sanitizedArray = updatedList.map(sanitizeQuoteForLocalStorage).slice(0, 50);
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(sanitizedArray));
  } catch (storageErr) {
    console.warn("LocalStorage save fallback:", storageErr);
  }
}

/**
 * Asynchronously saves quote to both IndexedDB and localStorage ensuring persistence.
 */
export async function saveQuoteAsync(quote: FullQuote): Promise<void> {
  const updated: FullQuote = {
    ...quote,
    updatedAt: new Date().toISOString(),
  };
  await saveQuoteToIdb(updated);
  saveQuote(updated);
}

/**
 * Deep historical recovery utility: Scans all IndexedDB entries and all localStorage keys to recover any lost estimate.
 */
export async function recoverAllHistoricalQuotes(): Promise<FullQuote[]> {
  const found: FullQuote[] = [];
  const seenIds = new Set<string>();

  // 1. IndexedDB
  const idbQuotes = await loadAllQuotesFromIdb();
  for (const q of idbQuotes) {
    if (q && q.id && !seenIds.has(q.id)) {
      seenIds.add(q.id);
      found.push(q);
    }
  }

  // 2. Scan every single key in localStorage
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("hudson_") ||
        key.startsWith("quote_") ||
        key.startsWith("draft_") ||
        key.includes("estimate") ||
        key.includes("quote")
      ) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const candidates = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of candidates) {
            if (item && typeof item === "object" && (item.pricing || item.client || item.design)) {
              const id = item.id || item.quoteNumber || `recovered_${Math.random().toString(36).slice(2, 7)}`;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const defBlank = createNewBlankQuote();
                const reconstructed: FullQuote = {
                  id,
                  quoteNumber: item.quoteNumber || item.client?.estimateNumber || defBlank.quoteNumber,
                  createdAt: item.createdAt || new Date().toISOString(),
                  updatedAt: item.updatedAt || new Date().toISOString(),
                  status: item.status || "draft",
                  client: { ...defBlank.client, ...(item.client || {}) },
                  design: { ...defBlank.design, ...(item.design || {}) },
                  siteConditions: { ...defBlank.siteConditions, ...(item.siteConditions || {}) },
                  lineItems: Array.isArray(item.lineItems) ? item.lineItems : defBlank.lineItems,
                  pricing:
                    item.pricing ||
                    calculateQuotePricing(
                      item.design || defBlank.design,
                      item.siteConditions || defBlank.siteConditions,
                      item.lineItems || defBlank.lineItems,
                      item.client?.depositAmount || 1650
                    ),
                };
                found.push(reconstructed);
                saveQuoteToIdb(reconstructed).catch(() => {});
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  found.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return found;
}

/**
 * Load the active working draft from localStorage if available
 */
export function loadActiveDraftQuote(): FullQuote | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FullQuote;
    if (parsed && parsed.pricing && parsed.design && parsed.client) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteQuotesAsync(ids: string[]): Promise<void> {
  if (typeof window === "undefined" || ids.length === 0) return;
  const idSet = new Set(ids);

  // 1. Delete from IndexedDB in single transaction
  try {
    const db = await openQuoteDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (e) {
    console.warn("IndexedDB bulk delete error:", e);
  }

  // 2. Clear from active working draft if matches
  try {
    const rawDraft = localStorage.getItem(STORAGE_KEY_ACTIVE_DRAFT);
    if (rawDraft) {
      const parsedDraft = JSON.parse(rawDraft);
      if (idSet.has(parsedDraft?.id) || idSet.has(parsedDraft?.quoteNumber)) {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_DRAFT);
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Purge from current and legacy storage lists
  try {
    const rawQuotes = localStorage.getItem(STORAGE_KEY_QUOTES);
    if (rawQuotes) {
      const parsed = JSON.parse(rawQuotes);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((q: any) => !idSet.has(q.id) && !idSet.has(q.quoteNumber));
        localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(filtered));
      }
    }

    const rawV8 = localStorage.getItem("hudson_builders_estimate_quotes_v8");
    if (rawV8) {
      const parsedV8 = JSON.parse(rawV8);
      if (Array.isArray(parsedV8)) {
        const filteredV8 = parsedV8.filter((q: any) => !idSet.has(q.id) && !idSet.has(q.quoteNumber));
        localStorage.setItem("hudson_builders_estimate_quotes_v8", JSON.stringify(filteredV8));
      }
    }
  } catch {
    /* ignore */
  }
}

export function deleteQuotes(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  deleteQuotesAsync(ids).catch(() => {});
}

export async function deleteQuoteAsync(id: string): Promise<void> {
  return deleteQuotesAsync([id]);
}

export function deleteQuote(id: string): void {
  return deleteQuotes([id]);
}

