/* Auto-generated from the QLD Retail Facade price lists (2026).
 * Prices are the facade upgrade cost over the standard Classic facade,
 * keyed by the facade's base name (lower case, parentheticals removed). */

export type FacadeStorey = "single" | "double" | "split" | "acreage";

export const FACADE_PRICES: Record<FacadeStorey, Record<string, number>> = {
  split: {},
  single: {
    aspen: 21300,
    avalon: 25900,
    avoca: 7200,
    banksia: 9900,
    bayside: 7200,
    breeze: 7200,
    chateaux: 21300,
    "classic plus": 4700,
    coastal: 21300,
    contemporary: 9900,
    crest: 7200,
    eden: 9900,
    elite: 15300,
    executive: 7200,
    hamptons: 15300,
    harmony: 7200,
    havanna: 25900,
    hillsdale: 21300,
    imperial: 28400,
    infinity: 9900,
    majestic: 9900,
    merlot: 28400,
    "modern barn": 28400,
    "modern box": 28400,
    "modern classical option a": 41900,
    "modern classical option b": 41900,
    "modern coastal": 15300,
    "modern farmhouse option b": 28400,
    newport: 25900,
    nuvo: 28400,
    pavillion: 21300,
    regal: 28400,
    riviera: 15300,
    savoy: 15300,
    serenity: 9900,
    sovereign: 21300,
    statesman: 21300,
    veinna: 28400,
    vibe: 37700,
    visage: 37700,
    vogue: 28400,
  },
  double: {
    allure: 14000,
    ascot: 53400,
    ashton: 24700,
    aspen: 32700,
    breeze: 12300,
    cambridge: 24800,
    centro: 53400,
    chateaux: 24800,
    clarence: 89200,
    "classic plus": 5900,
    como: 53400,
    contemporary: 16300,
    deco: 12300,
    delta: 38900,
    deluxe: 39000,
    flair: 53400,
    grande: 39000,
    hamptons: 27400,
    madison: 32700,
    majestic: 16300,
    mantra: 16300,
    marina: 16300,
    meridian: 53400,
    metro: 53500,
    "mocha hamptons": 32700,
    "modern barn": 34900,
    "modern box": 32700,
    "modern classical": 50900,
    "modern coastal": 32700,
    "modern farmhouse option b": 41900,
    monash: 24800,
    mondo: 24700,
    novare: 14000,
    nuvo: 53500,
    oxford: 12300,
    reed: 86100,
    regal: 53500,
    riviera: 38900,
    royale: 39000,
    saville: 39000,
    sierra: 38900,
    soho: 53400,
    statesman: 32700,
    tempo: 53500,
    vista: 24700,
    vogue: 53500,
    windsor: 12300,
  },
  acreage: {
    chateaux: 21600,
    classic: 0,
    eden: 14400,
    elite: 21600,
    hamptons: 21500,
    harmony: 15400,
    infinity: 27000,
    nuvo: 41000,
    vogue: 41400,
  },
};

/** Library names that differ in spelling from the price lists. */
const ALIASES: Record<string, string> = {
  havana: "havanna",
  vienna: "veinna",
  "infinity mkii": "infinity",
  pavilion: "pavillion",
};

/** "Chateaux (No Balcony)" / "Deco (Double Garage)" -> "chateaux" / "deco" */
export function facadeBaseName(name: string): string {
  const base = name
    .replace(/\(.*?\)/g, "")
    .split(" - ")[0]
    .trim()
    .toLowerCase();
  return ALIASES[base] ?? base;
}

/** Classify a facade from its render: MULBERRY renders are the acreage range,
 *  any two-storey render ("2 Stry" / "Double Storey") is double, else single. */
export function facadeCategory(item: { url: string; name: string; range?: string; tags?: string[] }): FacadeStorey {
  const src = `${item.url} ${item.name} ${item.range ?? ""} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
  if (/mulberry|ranch|acreage/i.test(src)) return "acreage";
  if (/2-?\s?stry|double[-\s]?storey|garage2/i.test(src)) return "double";
  return "single";
}

/** Facade upgrade cost for a facade name in a given storey category. */
export function facadePriceFor(name: string, storey: FacadeStorey): number | null {
  const base = facadeBaseName(name);
  const exact = FACADE_PRICES[storey][base];
  if (exact !== undefined) return exact;
  for (const s of ["single", "double", "acreage"] as FacadeStorey[]) {
    const v = FACADE_PRICES[s][base];
    if (v !== undefined) return v;
  }
  return null;
}

/* ---- Duplex / dual-occupancy facades (QLD Dual Living list, 13/6/26) ------ */

const DUPLEX_PREMIUM = {
  brixton: 80900,
  bronte: 105600,
  cranbrook: 96400,
  mayfield: 113800,
  modena: 86100,
  woodlands: 105600,
};

/** Magnolia / Maize style families price Madison, Marina and Vista differently. */
const DUPLEX_FACADE_PRICES: Record<string, Record<string, number>> = {
  magnolia: { ...DUPLEX_PREMIUM, madison: 12100, marina: 16100, vista: 24500 },
  maize: { ...DUPLEX_PREMIUM, madison: 28600, marina: 28600, vista: 33600 },
  // Cayenne and Raven share the Maize facade gallery and pricing.
  cayenne: { ...DUPLEX_PREMIUM, madison: 28600, marina: 28600, vista: 33600 },
  cayene: { ...DUPLEX_PREMIUM, madison: 28600, marina: 28600, vista: 33600 },
  raven: { ...DUPLEX_PREMIUM, madison: 28600, marina: 28600, vista: 33600 },
  wisteria: {
    avoca: 7100,
    bayside: 7100,
    breeze: 7100,
    crest: 7100,
    executive: 7100,
    harmony: 7100,
    banksia: 9800,
    contemporary: 9800,
    eden: 9800,
    infinity: 9800,
    majestic: 9800,
    serenity: 9800,
  },
  lavender: { bayside: 7100, contemporary: 7100, eden: 9800, infinity: 9800 },
  teal: { "teal 45 façade": 68900, "teal 45 facade": 68900 },
  alabaster: {},
};

/** Classic Plus on a duplex: single-porch rates for single / double storey. */
const DUPLEX_CLASSIC_PLUS: Record<"single" | "double", number> = {
  single: 4700,
  double: 5800,
};

/* ---- Mulberry (acreage) facades (QLD Mulberry list, 13/6/26) -------------- */

const MULBERRY_SMALL: Record<string, number> = {
  eden: 29400,
  statesman: 57000,
  metro: 57000,
  hamptons: 57000,
  urban: 66500,
  imperial: 66500,
  vogue: 158900,
};

const MULBERRY_LARGE: Record<string, number> = {
  eden: 33200,
  statesman: 64400,
  metro: 64400,
  hamptons: 64400,
  urban: 75300,
  imperial: 75300,
  vogue: 180200,
};

/** "Wisteria 24- MK2 - SD Single Story" -> "wisteria" */
export function designFamily(designName: string): string {
  return (designName.trim().split(/[^A-Za-z]/)[0] ?? "").toLowerCase();
}

function designSize(designName: string): number {
  const m = designName.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

/**
 * Facade upgrade cost with the selected design taken into account: duplex and
 * Mulberry acreage facades are priced off their own QLD lists.
 */
export function facadePriceForDesign(
  name: string,
  storey: FacadeStorey,
  designName?: string,
): number | null {
  const base = facadeBaseName(name);
  if (base === "classic") return 0;

  const family = designName ? designFamily(designName) : "";

  if (family === "mulberry") {
    if (base === "classic plus") return DUPLEX_CLASSIC_PLUS.single;
    const table = designSize(designName!) >= 33 ? MULBERRY_LARGE : MULBERRY_SMALL;
    return table[base] ?? facadePriceFor(name, "acreage");
  }

  const duplex = DUPLEX_FACADE_PRICES[family];
  if (duplex) {
    if (base === "classic plus")
      return DUPLEX_CLASSIC_PLUS[storey === "double" ? "double" : "single"];
    return duplex[base] ?? facadePriceFor(name, storey);
  }

  return facadePriceFor(name, storey);
}

/* ---- Garage matching ------------------------------------------------------
 * Facades are rendered either with a single or a double garage. Base facades
 * like Classic and Classic Plus can adapt to both 1-car and 2-car floorplans.
 * ------------------------------------------------------------------------ */

export type FacadeGarage = 1 | 2 | "both";

export function facadeGarage(item: { name: string; url: string; tags?: string[] }): FacadeGarage {
  const src = `${item.name} ${item.url} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
  if (/single[-\s]?garage/i.test(src)) return 1;
  if (/double[-\s]?garage/i.test(src)) return 2;
  // Base facades without explicit garage labels fit both 1-car and 2-car designs
  return "both";
}

/** How many garage spaces a floorplan's car count implies (2+ car = double). */
export function garageFromCars(cars: string | number | undefined): 1 | 2 | null {
  const n = Number(String(cars ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n >= 2 ? 2 : 1;
}
