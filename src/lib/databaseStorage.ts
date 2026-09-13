import { CURRENT_DATABASE_PACKAGES } from "@/lib/public-listings.functions";
import { toValidUuid, isValidUuid, generateUuid } from "@/lib/uuid";

export interface Lot {
  id: string;
  estate: string;
  suburb: string;
  state?: "QLD" | "NSW";
  developer: string | null;
  developer_contact_name: string | null;
  developer_contact_phone: string | null;
  developer_contact_email: string | null;
  lot_number: string | null;
  address: string | null;
  land_size: number | null;
  frontage: number | null;
  land_price: number | null;
  titled: boolean | null;
  registration_date: string | null;
  status: "available" | "on_hold" | "sold" | "nhc_exclusive";
  exclusive_consultants: string[] | null;
  deadline: string | null;
  notes: string | null;
  updated_at: string | null;
}

export interface Pkg {
  id: string;
  lot_id: string | null;
  name: string | null;
  housing_type: string;
  design: string;
  range_id: string;
  facade_name: string | null;
  house_price: number | null;
  land_price: number | null;
  total_price: number | null;
  beds: string | null;
  baths: string | null;
  cars: string | null;
  floorplan_size: string | null;
  state?: "QLD" | "NSW";
  status: "live" | "draft" | "sold" | "nhc_exclusive";
  exclusive_consultants: string[] | null;
  flyer_json: Record<string, unknown> | null;
  flyer_data?: unknown;
  notes?: string | null;
  needs_review: boolean | null;
  updated_at: string | null;
}

const STORAGE_KEY_LOTS = "hudson_qld_database_lots_v3";
const STORAGE_KEY_PACKAGES = "hudson_qld_database_packages_v3";
const STORAGE_KEY_INITIALIZED = "hudson_qld_database_initialized_v3";

export const DB_SYNC_CHANNEL_NAME = "hudson_qld_database_sync";

export function broadcastDatabaseChange(action: string, payload?: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(DB_SYNC_CHANNEL_NAME);
    channel.postMessage({ action, payload, timestamp: Date.now() });
    channel.close();
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("hudson_database_change", { detail: { action, payload } }));
  } catch {}
}

export function getLotState(lot: { state?: "QLD" | "NSW"; suburb?: string | null; address?: string | null; estate?: string | null }): "QLD" | "NSW" {
  if (lot.state === "NSW" || lot.state === "QLD") return lot.state;
  const text = `${lot.suburb || ""} ${lot.address || ""} ${lot.estate || ""}`.toLowerCase();
  if (
    text.includes("nsw") ||
    text.includes("oran park") ||
    text.includes("watagan") ||
    text.includes("warnervale") ||
    text.includes("parramatta") ||
    text.includes("box hill") ||
    text.includes("marsden park") ||
    text.includes("calderwood") ||
    text.includes("austral") ||
    text.includes("menangle") ||
    text.includes("leppington") ||
    text.includes("the gables") ||
    text.includes("elara")
  ) {
    return "NSW";
  }
  return "QLD";
}

/** Generates a complete default seed dataset of Lots and Packages for both QLD and NSW */
export function generateSeedData(): { lots: Lot[]; packages: Pkg[] } {
  const lotMap = new Map<string, Lot>();
  const pkgs: Pkg[] = [];

  // 1. Seed QLD lots & packages
  CURRENT_DATABASE_PACKAGES.forEach((item, idx) => {
    const estate = item.estate || "Hudson Estate";
    const suburb = item.suburb || "South East QLD";
    const lotNum = item.name.includes("Lot ")
      ? item.name.split("Lot ")[1]?.split(" ")[0]?.replace(/[^0-9]/g, "") || `10${idx + 1}`
      : `${100 + idx + 1}`;
    const lotKey = `qld-${estate.toLowerCase()}-${suburb.toLowerCase()}-${lotNum}`;

    let lotId = toValidUuid(lotKey) || generateUuid();
    if (!lotMap.has(lotKey)) {
      const newLot: Lot = {
        id: lotId,
        estate,
        suburb,
        state: "QLD",
        developer: estate.includes("Flagstone") ? "Peet" : estate.includes("Lilywood") ? "Stockland" : "Hudson Developments",
        developer_contact_name: "Sales Team",
        developer_contact_phone: "1300 246 700",
        developer_contact_email: "sales@hudsonhomes.com.au",
        lot_number: lotNum,
        address: item.address || `${estate}, ${suburb} QLD`,
        land_size: item.landSize || 450,
        frontage: item.frontage || 14,
        land_price: item.landPrice || 350000,
        titled: idx % 3 === 0,
        registration_date: idx % 3 === 0 ? null : "2026-06-30",
        status: "available",
        exclusive_consultants: null,
        deadline: null,
        notes: `Standard premium allotment in ${estate}`,
        updated_at: new Date().toISOString(),
      };
      lotMap.set(lotKey, newLot);
    }

    let flyerParsed: Record<string, unknown> | null = null;
    if (item.flyerJson) {
      try {
        flyerParsed = typeof item.flyerJson === "string" ? JSON.parse(item.flyerJson) : item.flyerJson;
      } catch {
        flyerParsed = null;
      }
    }

    pkgs.push({
      id: toValidUuid(item.id || `pkg-${idx + 1}`) || generateUuid(),
      lot_id: lotId,
      name: item.name || `${item.design} · ${estate}`,
      housing_type: item.housingType || "Single Storey",
      design: item.design,
      range_id: item.rangeLabel?.toLowerCase() || "value",
      facade_name: item.facadeName || "Classic",
      house_price: item.housePrice || (item.totalPrice ? item.totalPrice - (item.landPrice || 0) : null),
      land_price: item.landPrice || null,
      total_price: item.totalPrice || null,
      beds: item.beds || "4",
      baths: item.baths || "2",
      cars: item.cars || "2",
      floorplan_size: item.homeSize || "200",
      state: "QLD",
      status: "live",
      exclusive_consultants: null,
      flyer_json: flyerParsed,
      needs_review: false,
      updated_at: new Date().toISOString(),
    });
  });

  // 1b. Seed Alyssa's & QLD consultant lots
  const ALYSSA_LOTS_DATA = [
    { estate: "Brookhaven", suburb: "Bahrs Scrub", lot_number: "1487", size: 300, frontage: 10, price: 516000, dev: "Frasers Property" },
    { estate: "Brookhaven", suburb: "Bahrs Scrub", lot_number: "1493", size: 361, frontage: 13, price: 549998, dev: "Frasers Property" },
    { estate: "Brookhaven", suburb: "Bahrs Scrub", lot_number: "1496", size: 565, frontage: 15, price: 622000, dev: "Frasers Property" },
    { estate: "Brookhaven", suburb: "Bahrs Scrub", lot_number: "1485", size: 724, frontage: 18, price: 675000, dev: "Frasers Property" },
    { estate: "Brookhaven", suburb: "Bahrs Scrub", lot_number: "1481", size: 566, frontage: 10.36, price: 631000, dev: "Frasers Property" },
    { estate: "Highland Walloon", suburb: "Walloon", lot_number: "264", size: 375, frontage: 12.5, price: 400000, dev: "Highland Walloon" },
    { estate: "Highland Walloon", suburb: "Walloon", lot_number: "275", size: 400, frontage: 14, price: 424998, dev: "Highland Walloon" },
    { estate: "Highland Walloon", suburb: "Walloon", lot_number: "282", size: 448, frontage: 14, price: 468000, dev: "Highland Walloon" },
    { estate: "Highland Walloon", suburb: "Walloon", lot_number: "256", size: 505, frontage: 15, price: 470000, dev: "Highland Walloon" },
  ];

  ALYSSA_LOTS_DATA.forEach((item) => {
    const lotKey = `qld-${item.estate.toLowerCase()}-${item.suburb.toLowerCase()}-${item.lot_number}`;
    const lotId = toValidUuid(lotKey) || generateUuid();
    if (!lotMap.has(lotKey)) {
      const newLot: Lot = {
        id: lotId,
        estate: item.estate,
        suburb: item.suburb,
        state: "QLD",
        developer: item.dev,
        developer_contact_name: "Sales Team",
        developer_contact_phone: "1300 246 700",
        developer_contact_email: "sales@hudsonhomes.com.au",
        lot_number: item.lot_number,
        address: `Lot ${item.lot_number} ${item.estate}, ${item.suburb} QLD`,
        land_size: item.size,
        frontage: item.frontage,
        land_price: item.price,
        titled: false,
        registration_date: "2026-08-30",
        status: "available",
        exclusive_consultants: null,
        deadline: null,
        notes: `Queensland package allotment in ${item.estate}`,
        updated_at: new Date().toISOString(),
      };
      lotMap.set(lotKey, newLot);
    }
  });

  // 1c. Seed Alyssa's QLD packages
  const ALYSSA_PKGS_DATA = [
    { design: "Orchid 23 (s/g)", estate: "Brookhaven", suburb: "Bahrs Scrub", lotNum: "1487", housePrice: 413900, landPrice: 516000, totalPrice: 929900, beds: "4", baths: "2", cars: "2", size: "226.7", facade: "Classic Plus" },
    { design: "Quartz 23", estate: "Highland Walloon", suburb: "Walloon", lotNum: "275", housePrice: 394900, landPrice: 424998, totalPrice: 819898, beds: "4", baths: "2", cars: "2", size: "226.7", facade: "Classic Plus" },
    { design: "Ivory 23", estate: "Highland Walloon", suburb: "Walloon", lotNum: "264", housePrice: 392900, landPrice: 400000, totalPrice: 792900, beds: "4", baths: "2", cars: "2", size: "226.7", facade: "Classic Plus" },
    { design: "Quartz 21", estate: "Highland Walloon", suburb: "Walloon", lotNum: "264", housePrice: 385100, landPrice: 400000, totalPrice: 785100, beds: "4", baths: "2", cars: "2", size: "199.69", facade: "Classic Plus" },
    { design: "Ivory 23", estate: "Brookhaven", suburb: "Bahrs Scrub", lotNum: "1493", housePrice: 392900, landPrice: 549998, totalPrice: 942898, beds: "4", baths: "2", cars: "2", size: "226.7", facade: "Classic Plus" },
  ];

  ALYSSA_PKGS_DATA.forEach((ap, idx) => {
    const lotKey = `qld-${ap.estate.toLowerCase()}-${ap.suburb.toLowerCase()}-${ap.lotNum}`;
    const matchedLot = lotMap.get(lotKey);
    const lotId = matchedLot ? matchedLot.id : toValidUuid(lotKey) || generateUuid();

    pkgs.push({
      id: toValidUuid(`alyssa-pkg-${ap.design.toLowerCase()}-${ap.lotNum}`) || generateUuid(),
      lot_id: lotId,
      name: `${ap.design} · ${ap.estate}`,
      housing_type: "Single Storey",
      design: ap.design,
      range_id: "designer",
      facade_name: ap.facade,
      house_price: ap.housePrice,
      land_price: ap.landPrice,
      total_price: ap.totalPrice,
      beds: ap.beds,
      baths: ap.baths,
      cars: ap.cars,
      floorplan_size: ap.size,
      state: "QLD",
      status: "live",
      exclusive_consultants: null,
      flyer_json: {
        designName: ap.design,
        estate: ap.estate,
        suburb: ap.suburb,
        lotNumber: ap.lotNum,
        price: `$${ap.totalPrice.toLocaleString()}`,
        contactName: "Alyssa Hales",
        contactEmail: "alyssa.hales@hudsonhomes.com.au",
        contactPhone: "0480 893 290",
      },
      needs_review: false,
      updated_at: new Date().toISOString(),
    });
  });

  // 2. Seed NSW estates and lots
  const NSW_ESTATES = [
    { estate: "Watagan Park", suburb: "Cooranbong", dev: "Johnson Property Group", price: 420000, size: 512, frontage: 16 },
    { estate: "HomeWorld Warnervale", suburb: "Warnervale", dev: "HomeWorld", price: 445000, size: 480, frontage: 15 },
    { estate: "Oran Park Town", suburb: "Oran Park", dev: "Greenfields Development", price: 565000, size: 450, frontage: 14 },
    { estate: "The Gables", suburb: "Box Hill", dev: "Stockland", price: 620000, size: 450, frontage: 15 },
    { estate: "Calderwood Valley", suburb: "Calderwood", dev: "Lendlease", price: 475000, size: 500, frontage: 16 },
    { estate: "Austral Estate", suburb: "Austral", dev: "Leppington Pastoral", price: 540000, size: 400, frontage: 13 },
    { estate: "Elara", suburb: "Marsden Park", dev: "Stockland", price: 590000, size: 420, frontage: 14 },
  ];

  NSW_ESTATES.forEach((nsw, i) => {
    for (let l = 1; l <= 3; l++) {
      const lotNum = `${200 + i * 10 + l}`;
      const lotKey = `nsw-${nsw.estate.toLowerCase()}-${nsw.suburb.toLowerCase()}-${lotNum}`;
      const lotId = toValidUuid(lotKey) || generateUuid();

      const newLot: Lot = {
        id: lotId,
        estate: nsw.estate,
        suburb: nsw.suburb,
        state: "NSW",
        developer: nsw.dev,
        developer_contact_name: "NSW Sales Team",
        developer_contact_phone: "1300 246 700",
        developer_contact_email: "nswsales@hudsonhomes.com.au",
        lot_number: lotNum,
        address: `Lot ${lotNum} ${nsw.estate}, ${nsw.suburb} NSW`,
        land_size: nsw.size + (l - 1) * 30,
        frontage: nsw.frontage,
        land_price: nsw.price + (l - 1) * 15000,
        titled: l === 1,
        registration_date: l === 1 ? null : "2026-09-30",
        status: "available",
        exclusive_consultants: null,
        deadline: null,
        notes: `NSW display release allotment in ${nsw.estate}`,
        updated_at: new Date().toISOString(),
      };
      lotMap.set(lotKey, newLot);

      // Add a representative NSW package
      const designNames = ["Amber 23", "Azure 21", "Burgundy 27", "Emerald 28"];
      const chosenDesign = designNames[(i + l) % designNames.length];
      const isDouble = chosenDesign.includes("Burgundy") || chosenDesign.includes("Emerald");

      pkgs.push({
        id: toValidUuid(`pkg-nsw-${i}-${l}`) || generateUuid(),
        lot_id: lotId,
        name: `${chosenDesign} · ${nsw.estate}`,
        housing_type: isDouble ? "Double Storey" : "Single Storey",
        design: chosenDesign,
        range_id: "designer",
        facade_name: "Classic Plus",
        house_price: isDouble ? 485900 : 358900,
        land_price: newLot.land_price,
        total_price: (newLot.land_price || 0) + (isDouble ? 485900 : 358900),
        beds: "4",
        baths: "2",
        cars: "2",
        floorplan_size: isDouble ? "260" : "210",
        state: "NSW",
        status: "live",
        exclusive_consultants: null,
        flyer_json: null,
        needs_review: false,
        updated_at: new Date().toISOString(),
      });
    }
  });

  return { lots: Array.from(lotMap.values()), packages: pkgs };
}

let inMemoryLots: Lot[] | null = null;
let inMemoryPackages: Pkg[] | null = null;

export function sanitizePackageForStorage(p: Pkg): Pkg {
  let flyer = p.flyer_data || p.flyer_json;
  if (flyer && typeof flyer === "object") {
    const copy = { ...(flyer as Record<string, unknown>) };
    for (const [k, v] of Object.entries(copy)) {
      if (typeof v === "string" && (v.startsWith("data:") || (v.length > 600 && !v.startsWith("http")))) {
        delete copy[k];
      }
    }
    flyer = copy;
  }
  const facadeUrl = (p as any).facade_url;
  return {
    ...p,
    id: isValidUuid(p.id) ? p.id : (toValidUuid(p.id) || generateUuid()),
    lot_id: p.lot_id ? (isValidUuid(p.lot_id) ? p.lot_id : toValidUuid(p.lot_id)) : null,
    facade_name: p.facade_name || null,
    facade_url: typeof facadeUrl === "string" && facadeUrl.startsWith("data:") ? null : facadeUrl,
    flyer_data: flyer,
    flyer_json: null, // do not duplicate flyer_data into flyer_json in local storage
  } as Pkg;
}

export function getLocalLots(): Lot[] {
  if (inMemoryLots && inMemoryLots.length > 0) {
    return inMemoryLots;
  }
  const seed = generateSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = mergeLots(seed.lots, parsed);
        inMemoryLots = merged;
        return merged;
      }
    }
  } catch (e) {
    console.warn("[databaseStorage] getLocalLots read error:", e);
  }
  inMemoryLots = seed.lots;
  saveLocalLots(seed.lots);
  return seed.lots;
}

export function saveLocalLots(lots: Lot[]): void {
  const cleanLots = lots.map((l) => ({
    ...l,
    id: isValidUuid(l.id) ? l.id : (toValidUuid(l.id) || generateUuid()),
  }));
  inMemoryLots = cleanLots;
  try {
    localStorage.setItem(STORAGE_KEY_LOTS, JSON.stringify(cleanLots));
    localStorage.setItem(STORAGE_KEY_INITIALIZED, "true");
  } catch (e) {
    console.warn("[databaseStorage] saveLocalLots write notice:", e);
  }
  broadcastDatabaseChange("lots_updated", { count: cleanLots.length });
}

export function getLocalPackages(): Pkg[] {
  if (inMemoryPackages && inMemoryPackages.length > 0) {
    return inMemoryPackages;
  }
  const seed = generateSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PACKAGES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized: Pkg[] = parsed.map(sanitizePackageForStorage);
        const merged = mergePackages(seed.packages, sanitized);
        inMemoryPackages = merged;
        return merged;
      }
    }
  } catch (e) {
    console.warn("[databaseStorage] getLocalPackages read error:", e);
  }
  inMemoryPackages = seed.packages;
  saveLocalPackages(seed.packages);
  return seed.packages;
}

export function saveLocalPackages(packages: Pkg[]): void {
  const cleanPackages = packages.map(sanitizePackageForStorage);
  inMemoryPackages = cleanPackages;
  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(cleanPackages));
    localStorage.setItem(STORAGE_KEY_INITIALIZED, "true");
  } catch (e) {
    console.warn("[databaseStorage] saveLocalPackages storage notice (in-memory preserved):", e);
  }
  broadcastDatabaseChange("packages_updated", { count: cleanPackages.length });
}

export function upsertLocalLot(lot: Lot): Lot[] {
  const normalizedLot: Lot = {
    ...lot,
    id: isValidUuid(lot.id) ? lot.id : (toValidUuid(lot.id) || generateUuid()),
  };
  const current = getLocalLots();
  const idx = current.findIndex((l) => l.id === normalizedLot.id);
  let updated: Lot[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...normalizedLot, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...normalizedLot, updated_at: new Date().toISOString() }, ...current];
  }
  saveLocalLots(updated);
  return updated;
}

export function deleteLocalLot(id: string): Lot[] {
  const current = getLocalLots();
  const normalizedId = isValidUuid(id) ? id : (toValidUuid(id) || id);
  const updated = current.filter((l) => l.id !== id && l.id !== normalizedId);
  saveLocalLots(updated);
  return updated;
}

export function upsertLocalPackage(pkg: Pkg): Pkg[] {
  const normalizedPkg: Pkg = {
    ...pkg,
    id: isValidUuid(pkg.id) ? pkg.id : (toValidUuid(pkg.id) || generateUuid()),
    lot_id: pkg.lot_id ? (isValidUuid(pkg.lot_id) ? pkg.lot_id : toValidUuid(pkg.lot_id)) : null,
  };
  const current = getLocalPackages();
  const idx = current.findIndex((p) => p.id === normalizedPkg.id);
  let updated: Pkg[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...normalizedPkg, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...normalizedPkg, updated_at: new Date().toISOString() }, ...current];
  }
  saveLocalPackages(updated);
  return updated;
}

export function deleteLocalPackage(id: string): Pkg[] {
  const current = getLocalPackages();
  const normalizedId = isValidUuid(id) ? id : (toValidUuid(id) || id);
  const updated = current.filter((p) => p.id !== id && p.id !== normalizedId);
  saveLocalPackages(updated);
  return updated;
}

/**
 * Merges two arrays of lots non-destructively.
 * Retains all unique lots from both sources, prioritizing newer updates when IDs or keys match.
 */
export function mergeLots(existingLots: Lot[], incomingLots: Lot[]): Lot[] {
  const map = new Map<string, Lot>();
  const keyMap = new Map<string, string>(); // estate-suburb-lot -> id

  const processLot = (lot: Lot) => {
    if (!lot) return;
    const normalizedId = isValidUuid(lot.id) ? lot.id : (toValidUuid(lot.id) || generateUuid());
    const cleanLot: Lot = {
      ...lot,
      id: normalizedId,
      state: lot.state || getLotState(lot),
    };
    const naturalKey = `${(cleanLot.estate || "").toLowerCase()}-${(cleanLot.suburb || "").toLowerCase()}-${cleanLot.lot_number || ""}`;

    // If matching natural key exists with a different ID, merge into the existing ID
    const existingId = map.has(cleanLot.id) ? cleanLot.id : keyMap.get(naturalKey);
    if (existingId && map.has(existingId)) {
      const prev = map.get(existingId)!;
      // Merge properties non-destructively, favoring incoming if updated_at is newer or non-null
      const prevTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const currTime = cleanLot.updated_at ? new Date(cleanLot.updated_at).getTime() : 0;
      if (currTime >= prevTime) {
        map.set(existingId, { ...prev, ...cleanLot, id: existingId });
      } else {
        map.set(existingId, { ...cleanLot, ...prev, id: existingId });
      }
    } else {
      map.set(cleanLot.id, cleanLot);
      if (cleanLot.lot_number) {
        keyMap.set(naturalKey, cleanLot.id);
      }
    }
  };

  existingLots.forEach(processLot);
  incomingLots.forEach(processLot);
  return Array.from(map.values());
}

/**
 * Merges two arrays of packages non-destructively.
 * Retains all unique packages from all consultants, prioritizing newer updates when IDs match.
 */
export function mergePackages(existingPkgs: Pkg[], incomingPkgs: Pkg[]): Pkg[] {
  const map = new Map<string, Pkg>();
  const keyMap = new Map<string, string>(); // name/design -> id

  const processPkg = (pkg: Pkg) => {
    if (!pkg) return;
    // Don't include raw tender requests in packages catalog
    if (pkg.name && pkg.name.startsWith("Tender Request:")) return;

    const normalizedId = isValidUuid(pkg.id) ? pkg.id : (toValidUuid(pkg.id) || generateUuid());
    const cleanPkg: Pkg = {
      ...pkg,
      id: normalizedId,
      state: pkg.state || "QLD",
    };
    const naturalKey = `${(cleanPkg.name || cleanPkg.design || "").toLowerCase().trim()}-${cleanPkg.lot_id || ""}`;

    const existingId = map.has(cleanPkg.id) ? cleanPkg.id : (keyMap.get(naturalKey) || null);
    if (existingId && map.has(existingId)) {
      const prev = map.get(existingId)!;
      const prevTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const currTime = cleanPkg.updated_at ? new Date(cleanPkg.updated_at).getTime() : 0;
      if (currTime >= prevTime) {
        map.set(existingId, { ...prev, ...cleanPkg, id: existingId });
      } else {
        map.set(existingId, { ...cleanPkg, ...prev, id: existingId });
      }
    } else {
      map.set(cleanPkg.id, cleanPkg);
      if (cleanPkg.name || cleanPkg.design) {
        keyMap.set(naturalKey, cleanPkg.id);
      }
    }
  };

  existingPkgs.forEach(processPkg);
  incomingPkgs.forEach(processPkg);
  return Array.from(map.values());
}

