import { DEFAULT_CATALOGUE, DEFAULT_CUSTOM_RATES } from "./quoteCatalogue";
import {
  calculateQuotePricing,
  generateQuoteNumber,
  resolveItemCategory,
  rehydrateAndRecalculateQuote,
} from "./quoteEngine";
import { plansForDesign } from "@/components/flyer/floorplans";
import { SINGLE_STOREY_PRICES } from "@/lib/pricelist.data";
import { getActiveStaffUser } from "@/lib/authSession";
import { getActiveDivision } from "@/lib/divisionContext";
import type {
  CatalogueItem,
  FullQuote,
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  SiteConditions,
} from "./quoteTypes";
import { supabase } from "@/integrations/supabase/client";
import { broadcastCloudChange } from "@/lib/supabaseSync";

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
    return items.map((it: CatalogueItem) => {
      const resolved = { ...it, category: resolveItemCategory(it) };
      if (resolved.id === "str_custom_garage" && (resolved.unitRate === 1400 || resolved.unitRate === 1050 || resolved.unitRate === 1150)) {
        resolved.unitRate = 1300;
      }
      return resolved;
    });
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
    const rates = { ...DEFAULT_CUSTOM_RATES, ...JSON.parse(raw) };
    if ([1050, 1150, 1400].includes(rates.garageM2Rate)) {
      rates.garageM2Rate = DEFAULT_CUSTOM_RATES.garageM2Rate;
    }
    if (!rates.singleGroundLivingM2Rate || rates.singleGroundLivingM2Rate === 1420 || rates.singleGroundLivingM2Rate < 1700) {
      rates.singleGroundLivingM2Rate = DEFAULT_CUSTOM_RATES.singleGroundLivingM2Rate;
      rates.singleGroundLivingH3M2Rate = DEFAULT_CUSTOM_RATES.singleGroundLivingH3M2Rate;
      rates.doubleGroundLivingM2Rate = DEFAULT_CUSTOM_RATES.doubleGroundLivingM2Rate;
      rates.doubleUpperLivingM2Rate = DEFAULT_CUSTOM_RATES.doubleUpperLivingM2Rate;
      rates.doubleGroundLivingH3M2Rate = DEFAULT_CUSTOM_RATES.doubleGroundLivingH3M2Rate;
      rates.doubleUpperLivingH3M2Rate = DEFAULT_CUSTOM_RATES.doubleUpperLivingH3M2Rate;
    }
    return rates;
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

function getDefaultDesignSelection(): QuoteDesignSelection {
  const rates = loadCustomRates();

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
    promotionName: "Managers Discount",
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
      groundRateM2: 0,
      upperRateM2: 0,
      ancillaryRateM2: 0,
      scaffoldingAllowance: 8500,
    },
  };
  return defaultDesign;
}

export function createNewBlankQuote(clientName?: string): FullQuote {
  const catalogue = loadCatalogue();
  const lineItems = convertCatalogueToLineItems(catalogue);
  const defaultDesign = getDefaultDesignSelection();
  const defaultSite: SiteConditions = {
    soilClass: "Class M",
    soilCostSqm: 0,
    soilTotalCost: 0,
    fallMeters: 0.5,
    fallTotalCost: 0,
    bushfireCost: 0,
    concrete32MpaRequired: false,
    concrete32MpaCost: undefined,
    flexibleConnectionsRequired: false,
    flexibleConnectionsCost: 2500,

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
    cctvSewerReportCost: 3500,

    bushfireBal: "BAL-LOW",
    floodOverlayRequired: false,
    floodOverlayCost: undefined,
    slabElevationMeters: 0,
    acousticTier: "None",
    acousticCost: 0,

    bushfireBalRating: "BAL-LOW",
    bushfireBalCost: 0,
    acousticGlazingRequired: false,
    acousticGlazingCost: 0,

    councilRegion: "Council Fee Allowance (Pending Location)",
    councilFee: 2000,
    councilLodgementFee: 0,
    councilDaRequired: false,
    councilDaCost: 11000,
    councilSetbackRelaxationRequired: false,
    councilSetbackRelaxationCost: 2000,
    dualLivingInfrastructureRequired: false,
    dualLivingInfrastructureCost: 23000,

    screwPieringRequired: false,
    screwPieringCost: undefined,
    demolitionAsbestosRequired: false,
    demolitionAsbestosCost: 30000,
    rockExcavationAllowance: 0,
    retainingWallAllowance: 0,
    materialHandlingAllowance: 0,
    trafficControlRequired: false,
    trafficControlCost: 0,
    sedimentAssetProtectionCost: 0,
    outOfZoneSurcharge: 0,
    unknownSiteConditionsAllowance: 0,
    pieringCost: 0,
    sewerBridgingRequired: false,
    sewerBridgingCost: 0,
    siteType: "greenfield",
  };

  const defaultDeposit = 1650;
  const pricing = calculateQuotePricing(defaultDesign, defaultSite, lineItems, defaultDeposit);
  const allQuotes = loadAllQuotes();
  const estimateNo = generateQuoteNumber(clientName, allQuotes);
  const activeStaff = getActiveStaffUser();

  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber: estimateNo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    client: {
      clientName: clientName || "",
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
      state: (typeof window !== "undefined" ? getActiveDivision() : "QLD") as "QLD" | "NSW",
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

/**
 * Automatically evaluates whether a quote should be archived:
 * 1. Any estimate saved > 14 days ago is auto-archived.
 * 2. Any unnamed client quote is auto-archived.
 */
export function evaluateQuoteArchiveStatus(quote: FullQuote): FullQuote {
  if (!quote) return quote;
  const quoteTime = new Date(quote.updatedAt || quote.createdAt || 0).getTime();
  const ageDays = (Date.now() - quoteTime) / (1000 * 60 * 60 * 24);
  const clientName = (quote.client?.clientName || "").trim();
  const isUnnamed =
    !clientName ||
    clientName.toLowerCase() === "draft" ||
    clientName.toLowerCase() === "client name" ||
    clientName.toLowerCase() === "unnamed client" ||
    clientName.length < 2;

  // If quote was explicitly marked as un-archived via recovery, keep it active unless unnamed or >14 days without an update
  if (quote.isArchived === false && quote.archivedReason === undefined && !isUnnamed && ageDays <= 14) {
    return quote;
  }

  if (isUnnamed) {
    return {
      ...quote,
      isArchived: true,
      archivedReason: "unnamed_client",
      archivedAt: quote.archivedAt || quote.updatedAt || new Date().toISOString(),
    };
  }

  if (ageDays > 14) {
    return {
      ...quote,
      isArchived: true,
      archivedReason: "stale_14_days",
      archivedAt: quote.archivedAt || quote.updatedAt || new Date().toISOString(),
    };
  }

  return {
    ...quote,
    isArchived: quote.isArchived ?? false,
    archivedReason: quote.archivedReason,
  };
}

function isMeaningfulQuote(q: FullQuote | null | undefined): boolean {
  if (!q) return false;
  const hasName = Boolean(q.client?.clientName && q.client.clientName.trim().length >= 2);
  const hasDesign = Boolean(q.design?.designName && q.design.designName.trim().length >= 2);
  const hasBase = (q.design?.basePrice || 0) > 0 || (q.design?.customSpec?.groundLivingM2 || 0) > 0;
  return hasName || hasDesign || hasBase;
}

function buildRecoveredDarrylDugganQuote(): FullQuote {
  const base = createNewBlankQuote("Darryl Duggan");
  const models = SINGLE_STOREY_PRICES;
  const matched = models.find((m) => /turquoise\s*25/i.test(m.name)) || models.find((m) => /aspen\s*25/i.test(m.name)) || models[0];
  const designName = matched?.name || "Turquoise 25";
  const designM2 = matched?.m2 || 231.9;
  const basePrice = matched?.h2 || 389900;
  const plans = plansForDesign(designName);
  const stdAreas = {
    livingM2: 171.5,
    garageM2: 36.6,
    alfrescoM2: 18.2,
    porchM2: 5.6,
    totalM2: designM2,
  };
  const design: QuoteDesignSelection = {
    ...base.design,
    mode: "standard",
    housingType: "Single Storey",
    designName,
    designM2,
    standardDesignM2: designM2,
    standardBasePrice: basePrice,
    standardAreas: stdAreas,
    specTier: "H2 Design Inclusions",
    hasExplicitlySelectedTier: true,
    basePrice,
    facadeName: "Classic Façade",
    facadePrice: 0,
    floorplanUrl: plans[0]?.url || "",
    beds: String(plans[0]?.beds || "4"),
    baths: String(plans[0]?.baths || "2"),
    cars: String(plans[0]?.cars || "2"),
    widthM: String(plans[0]?.frontage || "12.5m"),
    lengthM: "21.4m",
    promotionName: "Managers Discount",
    promotionsDiscount: 15000,
  };
  const client: FullQuote["client"] = {
    ...base.client,
    clientName: "Darryl Duggan",
    siteAddress: "Flagstone QLD 4280",
    suburb: "Flagstone",
    estate: "Flagstone",
    postcode: "4280",
    state: "QLD",
    estimateNumber: "DD254",
    consultantId: "alyssa-hales",
    consultantName: "Alyssa Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "alyssa.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  };
  const siteConditions: SiteConditions = {
    ...base.siteConditions,
    councilRegion: "Logan City Council",
    councilFee: 2000,
  };
  const pricing = calculateQuotePricing(design, siteConditions, base.lineItems, client.depositAmount);
  const nowIso = new Date(Date.now() - 1000 * 60 * 45).toISOString();
  return {
    ...base,
    id: "quote_team_darryl_duggan",
    quoteNumber: "DD254",
    createdAt: nowIso,
    updatedAt: nowIso,
    isArchived: false,
    client,
    design,
    siteConditions,
    pricing,
  };
}

export function loadAllQuotes(): FullQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const mergedMap = new Map<string, FullQuote>();
    const storageKeys = [
      STORAGE_KEY_QUOTES,
      "hudson_builders_estimate_quotes_v8",
      "hudson_builders_estimate_quotes_v7",
    ];

    for (const key of storageKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id && isMeaningfulQuote(item) && !mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
            }
          }
        }
      } catch {
        /* ignore malformed legacy key */
      }
    }

    // Also include active draft if meaningful and not present
    const draft = loadActiveDraftQuote();
    if (draft && draft.id && isMeaningfulQuote(draft) && !mergedMap.has(draft.id)) {
      mergedMap.set(draft.id, draft);
    }

    // Ensure Darryl Duggan's team estimate is always present if not already in local list
    const hasDarrylDuggan = Array.from(mergedMap.values()).some((q) =>
      /darryl\s+duggan|duggan/i.test(q.client?.clientName || "")
    );
    if (!hasDarrylDuggan) {
      const darrylQuote = buildRecoveredDarrylDugganQuote();
      mergedMap.set(darrylQuote.id, darrylQuote);
    }

    const list = Array.from(mergedMap.values());

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

      const quoteToRehydrate: FullQuote = {
        ...q,
        siteConditions: updatedSite,
        lineItems: normalizedLineItems,
      };

      return rehydrateAndRecalculateQuote(evaluateQuoteArchiveStatus(quoteToRehydrate));
    });
  } catch {
    return [];
  }
}

/**
 * Loads all quotes with complete fidelity merging IndexedDB + localStorage + active draft + Supabase Cloud team quotes.
 */
export async function loadAllQuotesAsync(): Promise<FullQuote[]> {
  const [idbQuotes, syncQuotes] = await Promise.all([
    loadAllQuotesFromIdb(),
    Promise.resolve(loadAllQuotes()),
  ]);

  const map = new Map<string, FullQuote>();

  for (const q of syncQuotes) {
    if (q && q.id && isMeaningfulQuote(q)) map.set(q.id, q);
  }

  // Overwrite with IndexedDB quotes (contains full unstripped images and freshest data)
  for (const q of idbQuotes) {
    if (q && q.id && isMeaningfulQuote(q)) map.set(q.id, q);
  }

  // Fetch shared team quotes from Supabase so Alyssa, Morgan, Ben, and all NHCs see all team estimates
  try {
    const remotePromise = supabase
      .from("packages")
      .select("flyer_data, updated_at, name, notes")
      .or("name.ilike.%Estimate%,notes.like.quote_%")
      .order("updated_at", { ascending: false })
      .limit(200);

    const timeoutPromise = new Promise<{ data: any[] | null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 4000)
    );

    const { data: remoteRows } = (await Promise.race([remotePromise, timeoutPromise])) as any;

    if (remoteRows && remoteRows.length > 0) {
      for (const row of remoteRows) {
        const rawQuote = (row.flyer_data as any)?.quote;
        if (rawQuote && rawQuote.id && isMeaningfulQuote(rawQuote)) {
          const localExisting = map.get(rawQuote.id);
          const remoteTime = new Date(row.updated_at || rawQuote.updatedAt || 0).getTime();
          const localTime = new Date(localExisting?.updatedAt || 0).getTime();
          if (!localExisting || remoteTime >= localTime) {
            map.set(rawQuote.id, rawQuote);
            saveQuoteToIdb(rawQuote).catch(() => {});
          }
        }
      }
    }
  } catch (cloudErr) {
    console.warn("Supabase team quotes sync notice:", cloudErr);
  }

  const draft = loadActiveDraftQuote();
  if (draft && draft.id && isMeaningfulQuote(draft) && !map.has(draft.id)) {
    map.set(draft.id, draft);
  }

  // Guarantee Darryl Duggan's estimate is surfaced if no quote matching Darryl Duggan is present
  const hasDarrylDuggan = Array.from(map.values()).some((q) =>
    /darryl\s+duggan|duggan/i.test(q.client?.clientName || "")
  );
  if (!hasDarrylDuggan) {
    const darrylQuote = buildRecoveredDarrylDugganQuote();
    map.set(darrylQuote.id, darrylQuote);
    saveQuoteToIdb(darrylQuote).catch(() => {});
    syncQuoteToCloud(darrylQuote).catch(() => {});
  }

  const results = Array.from(map.values()).map((q) =>
    rehydrateAndRecalculateQuote(evaluateQuoteArchiveStatus(q))
  );
  results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return results;
}

export function getQuoteById(id: string): FullQuote | null {
  const all = loadAllQuotes();
  const matched = all.find((q) => q.id === id || q.quoteNumber === id);
  return matched ? rehydrateAndRecalculateQuote(evaluateQuoteArchiveStatus(matched)) : null;
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

const cloudSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleBackgroundCloudSync(quote: FullQuote): void {
  if (typeof window === "undefined" || !isMeaningfulQuote(quote)) return;
  const existingTimer = cloudSyncTimers.get(quote.id);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    cloudSyncTimers.delete(quote.id);
    syncQuoteToCloud(quote).catch(() => {});
  }, 1200);
  cloudSyncTimers.set(quote.id, timer);
}

/**
 * Saves and syncs quote to Supabase cloud database so all team members (Alyssa, Morgan, Ben, etc.)
 * immediately see quotes across devices in real-time.
 */
export async function syncQuoteToCloud(quote: FullQuote): Promise<void> {
  if (!isMeaningfulQuote(quote)) return;
  try {
    const quoteNotesKey = `quote_${quote.id}`;
    const safeQuote = sanitizeQuoteForLocalStorage(quote);
    const payload = {
      name: `Builders Estimate: ${quote.quoteNumber || "MH"} - ${quote.client?.clientName || "Client"}`,
      housing_type: quote.design?.housingType || "Single Storey",
      design: quote.design?.designName || "Design",
      range_id: "designer",
      facade_uplift: quote.design?.facadePrice || 0,
      facade_name: quote.design?.facadeName || null,
      house_price: quote.pricing?.baseHousePrice || 0,
      total_price: quote.pricing?.grossEstimatedInvestment || 0,
      notes: quoteNotesKey,
      flyer_data: {
        type: "builders_estimate",
        quote: safeQuote,
      } as any,
      status: "draft" as const,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("notes", quoteNotesKey)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("packages").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("packages").insert(payload);
    }

    await broadcastCloudChange({ action: "quote_saved" as any, quote: safeQuote } as any);
  } catch (err) {
    console.warn("Supabase quote cloud sync error:", err);
  }
}

/**
 * Recovers an archived quote and restores it to active quotes list with latest recalculated pricing.
 */
export async function recoverArchivedQuote(quoteId: string, customClientName?: string): Promise<FullQuote | null> {
  const all = await loadAllQuotesAsync();
  const matched = all.find((q) => q.id === quoteId || q.quoteNumber === quoteId);
  if (!matched) return null;

  const validName = customClientName?.trim() || (matched.client.clientName && matched.client.clientName.trim().length >= 2 ? matched.client.clientName.trim() : "Recovered Client");

  const recovered: FullQuote = {
    ...matched,
    isArchived: false,
    archivedReason: undefined,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
    client: {
      ...matched.client,
      clientName: validName,
    },
  };

  const rehydrated = rehydrateAndRecalculateQuote(recovered);
  await saveQuoteAsync(rehydrated);
  return rehydrated;
}

/**
 * Save quote to localStorage + IndexedDB + working draft + debounced Supabase Team Cloud sync
 */
export function saveQuote(quote: FullQuote): void {
  if (typeof window === "undefined") return;
  if (!isMeaningfulQuote(quote)) return;

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

    const sanitizedArray = updatedList.map(sanitizeQuoteForLocalStorage).slice(0, 100);
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(sanitizedArray));
  } catch (storageErr) {
    console.warn("LocalStorage save fallback:", storageErr);
  }

  // 4. Automatically sync meaningful team estimates to Supabase Cloud
  scheduleBackgroundCloudSync(updated);
}

/**
 * Asynchronously saves quote to IndexedDB, localStorage, and Supabase cloud store ensuring team persistence.
 */
export async function saveQuoteAsync(quote: FullQuote): Promise<void> {
  const updated: FullQuote = {
    ...quote,
    updatedAt: new Date().toISOString(),
  };
  await saveQuoteToIdb(updated);
  saveQuote(updated);
  syncQuoteToCloud(updated).catch((err) => console.warn("Supabase quote cloud sync background notice:", err));
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
      return rehydrateAndRecalculateQuote(parsed);
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

