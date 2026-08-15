import { HUDSON_FACADES } from "./facades.data";
import { facadePriceForDesign, type FacadeStorey } from "./facadePricing";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";
import { getIdbEnhanced, saveIdbEnhanced, clearIdbEnhanced } from "./idbFacadeCache";

export interface FacadeItem {
  id: string;
  name: string;
  range: string;
  tags: string[];
  url: string;
  originalUrl?: string;
}

/** The full Hudson Homes facade catalogue, using pre-rendered static assets where available. */
export const BUILT_IN_FACADES: FacadeItem[] = HUDSON_FACADES.map((f) => ({
  ...f,
  originalUrl: f.url,
  url: f.url,
}));

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

import { supabase } from "@/integrations/supabase/client";

export const AI_MARKER = "::AI_OUTPAINT_V4::";

export async function loadEnhancedAsync(id: string): Promise<string | null> {
  const tagged = await getIdbEnhanced(id);
  if (tagged && tagged.startsWith(AI_MARKER)) {
    const b64 = tagged.replace(AI_MARKER, "");
    if (b64.startsWith("data:image/") && b64.length > 1000) {
      return b64;
    }
  }

  // Local cache miss. Try Supabase for V4 global cache.
  try {
    const { data } = await supabase.from("facade_renders").select("widened_url").eq("id", `${id}_v4`).maybeSingle();
    if (data?.widened_url) {
        // Save it locally so we don't hit Supabase again next time
        const b64 = data.widened_url;
        if (b64.startsWith("data:image/") && b64.length > 1000) {
            const newTagged = `${AI_MARKER}${b64}`;
            void saveIdbEnhanced(id, newTagged);
            try {
                window.localStorage.setItem(`${ENHANCED_KEY}:${id}`, newTagged);
            } catch {}
            return b64;
        }
    }
  } catch (e) {
    console.error("Supabase load error", e);
  }

  return null;
}

export function loadEnhanced(id: string): string | null {
  try {
    const tagged = window.localStorage.getItem(`${ENHANCED_KEY}:${id}`);
    if (tagged && tagged.startsWith(AI_MARKER)) {
      const b64 = tagged.replace(AI_MARKER, "");
      if (b64.startsWith("data:image/") && b64.length > 1000) {
        return b64;
      }
    }
  } catch {}
  return null;
}

export async function saveEnhanced(id: string, dataUrl: string, facadeName?: string) {
  if (!id || !dataUrl) return;
  const cleanUrl = dataUrl.startsWith(AI_MARKER) ? dataUrl.replace(AI_MARKER, "") : dataUrl;
  if (!cleanUrl.startsWith("data:image/") || cleanUrl.length <= 1000) {
      console.warn(`[FacadeLibrary] Prevented saving invalid facade image for ${id}`);
      return;
  }
  
  const tagged = `${AI_MARKER}${cleanUrl}`;
  
  // Save locally
  const current = await getIdbEnhanced(id);
  if (current && current !== tagged) {
      await saveIdbEnhanced(`${id}_prev`, current);
  }

  void saveIdbEnhanced(id, tagged);
  try {
    window.localStorage.setItem(`${ENHANCED_KEY}:${id}`, tagged);
  } catch {
    /* localStorage quota exceeded — IndexedDB handles permanent storage */
  }

  // Save globally to Supabase with v4 key
  void supabase.from("facade_renders").upsert({
    id: `${id}_v4`,
    facade_name: facadeName || id,
    widened_url: cleanUrl,
  }).then(({ error }) => {
    if (error) {
      console.error("Failed to save facade to Supabase:", error);
    } else {
      console.log(`[FacadeLibrary] Permanently saved ${id}_v4 to Supabase.`);
    }
  });
}

export async function hasPreviousEnhanced(id: string): Promise<boolean> {
    const prev = await getIdbEnhanced(`${id}_prev`);
    return !!prev;
}

export async function revertEnhanced(id: string): Promise<string | null> {
    const prev = await getIdbEnhanced(`${id}_prev`);
    if (prev) {
        await saveIdbEnhanced(id, prev);
        await clearIdbEnhanced(`${id}_prev`);
        try {
            window.localStorage.setItem(`${ENHANCED_KEY}:${id}`, prev);
        } catch {}
        return prev.startsWith(AI_MARKER) ? prev.replace(AI_MARKER, "") : prev;
    }
    return null;
}

export { clearIdbEnhanced };

export function searchFacades(items: FacadeItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((f) => [f.name, f.range, ...f.tags].join(" ").toLowerCase().includes(q));
}
