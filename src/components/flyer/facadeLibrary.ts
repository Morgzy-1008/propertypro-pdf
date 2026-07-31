import { HUDSON_FACADES } from "./facades.data";
import { facadePriceForDesign, type FacadeStorey } from "./facadePricing";

export interface FacadeItem {
  id: string;
  name: string;
  range: string;
  tags: string[];
  url: string;
}

/** The full Hudson Homes facade catalogue, scraped from the facade galleries. */
export const BUILT_IN_FACADES: FacadeItem[] = HUDSON_FACADES;

const STORAGE_KEY = "hudson-facade-library";
const UPLIFT_KEY = "hudson-facade-uplifts";
const ENHANCED_KEY = "hudson-facade-enhanced";

export function loadCustomFacades(): FacadeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FacadeItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomFacades(items: FacadeItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — library stays in-memory for this session */
  }
}

/* ---- Facade price uplifts -------------------------------------------------
 * The QLD price list is quoted on the Classic Façade, so every other facade
 * carries an upgrade cost. Those uplifts are maintained here and persisted
 * locally so the team can keep them current without a code change.
 * ------------------------------------------------------------------------ */

export const BASE_FACADE_ID = "classic";

function readMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function loadFacadeUplifts(): Record<string, number> {
  return readMap(UPLIFT_KEY);
}

export function saveFacadeUplift(id: string, amount: number) {
  const next = { ...loadFacadeUplifts(), [id]: amount };
  try {
    window.localStorage.setItem(UPLIFT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * Facade upgrade cost: a manually saved override wins, otherwise the QLD
 * retail facade price list is used automatically.
 */
export function facadeUpliftFor(
  id: string,
  name?: string,
  storey?: FacadeStorey,
  designName?: string,
): number {
  if (!id) return 0;
  const override = loadFacadeUplifts()[id];
  if (override !== undefined) return override;
  if (id === BASE_FACADE_ID) return 0;
  return (
    facadePriceForDesign(name ?? id.replace(/-/g, " "), storey ?? "single", designName) ?? 0
  );
}

/* ---- AI-enhanced render cache -------------------------------------------- */

export function loadEnhanced(id: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${ENHANCED_KEY}:${id}`);
  } catch {
    return null;
  }
}

export function saveEnhanced(id: string, dataUrl: string) {
  try {
    window.localStorage.setItem(`${ENHANCED_KEY}:${id}`, dataUrl);
  } catch {
    /* cache is best-effort */
  }
}

export function searchFacades(items: FacadeItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((f) => [f.name, f.range, ...f.tags].join(" ").toLowerCase().includes(q));
}
