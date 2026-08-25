import { CURRENT_DATABASE_PACKAGES } from "@/lib/public-listings.functions";

export interface Lot {
  id: string;
  estate: string;
  suburb: string;
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
  status: "live" | "draft" | "sold" | "nhc_exclusive";
  exclusive_consultants: string[] | null;
  flyer_json: Record<string, unknown> | null;
  needs_review: boolean | null;
  updated_at: string | null;
}

const STORAGE_KEY_LOTS = "hudson_qld_database_lots_v2";
const STORAGE_KEY_PACKAGES = "hudson_qld_database_packages_v2";

/** Generates a complete default seed dataset of Lots and Packages from CURRENT_DATABASE_PACKAGES */
export function generateSeedData(): { lots: Lot[]; packages: Pkg[] } {
  const lotMap = new Map<string, Lot>();
  const pkgs: Pkg[] = [];

  CURRENT_DATABASE_PACKAGES.forEach((item, idx) => {
    const estate = item.estate || "Hudson Estate";
    const suburb = item.suburb || "South East QLD";
    const lotNum = item.name.includes("Lot ")
      ? item.name.split("Lot ")[1]?.split(" ")[0]?.replace(/[^0-9]/g, "") || `10${idx + 1}`
      : `${100 + idx + 1}`;
    const lotKey = `${estate.toLowerCase()}-${suburb.toLowerCase()}-${lotNum}`;

    let lotId = `lot-${lotKey}`;
    if (!lotMap.has(lotKey)) {
      const newLot: Lot = {
        id: lotId,
        estate,
        suburb,
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
      id: item.id || `pkg-${idx + 1}`,
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
      status: "live",
      exclusive_consultants: null,
      flyer_json: flyerParsed,
      needs_review: false,
      updated_at: new Date().toISOString(),
    });
  });

  return { lots: Array.from(lotMap.values()), packages: pkgs };
}

export function getLocalLots(): Lot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[databaseStorage] getLocalLots read error:", e);
  }
  const seed = generateSeedData();
  saveLocalLots(seed.lots);
  saveLocalPackages(seed.packages);
  return seed.lots;
}

export function saveLocalLots(lots: Lot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOTS, JSON.stringify(lots));
  } catch (e) {
    console.warn("[databaseStorage] saveLocalLots write error:", e);
  }
}

export function getLocalPackages(): Pkg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PACKAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[databaseStorage] getLocalPackages read error:", e);
  }
  const seed = generateSeedData();
  saveLocalLots(seed.lots);
  saveLocalPackages(seed.packages);
  return seed.packages;
}

export function saveLocalPackages(packages: Pkg[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(packages));
  } catch (e) {
    console.warn("[databaseStorage] saveLocalPackages write error:", e);
  }
}

export function upsertLocalLot(lot: Lot): Lot[] {
  const current = getLocalLots();
  const idx = current.findIndex((l) => l.id === lot.id);
  let updated: Lot[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...lot, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...lot, updated_at: new Date().toISOString() }, ...current];
  }
  saveLocalLots(updated);
  return updated;
}

export function deleteLocalLot(id: string): Lot[] {
  const current = getLocalLots();
  const updated = current.filter((l) => l.id !== id);
  saveLocalLots(updated);
  return updated;
}

export function upsertLocalPackage(pkg: Pkg): Pkg[] {
  const current = getLocalPackages();
  const idx = current.findIndex((p) => p.id === pkg.id);
  let updated: Pkg[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...pkg, updated_at: new Date().toISOString() };
  } else {
    updated = [{ ...pkg, updated_at: new Date().toISOString() }, ...current];
  }
  saveLocalPackages(updated);
  return updated;
}

export function deleteLocalPackage(id: string): Pkg[] {
  const current = getLocalPackages();
  const updated = current.filter((p) => p.id !== id);
  saveLocalPackages(updated);
  return updated;
}
