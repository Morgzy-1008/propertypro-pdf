/* Auto-generated from the QLD Retail Facade price lists (Issued 28/09/2026).
 * Prices are the facade upgrade cost over the standard Classic facade,
 * keyed by the facade's base name (lower case, parentheticals removed). */

export type FacadeStorey = "single" | "double" | "split" | "acreage";

export const FACADE_PRICES: Record<FacadeStorey, Record<string, number>> = {
  single: {
    classic: 0,
    "classic plus": 4600,
    avoca: 7200,
    bayside: 7200,
    breeze: 7200,
    crest: 7200,
    executive: 7200,
    harmony: 7200,
    banksia: 9900,
    contemporary: 9900,
    eden: 9900,
    infinity: 9900,
    "infinity mkii": 9900,
    majestic: 9900,
    serenity: 9900,
    elite: 15400,
    hamptons: 15400,
    "modern coastal": 15400,
    "modern coastal - new facade - (co-creation)": 15400,
    riviera: 15400,
    savoy: 15400,
    aspen: 21500,
    chateaux: 21500,
    coastal: 21500,
    hillsdale: 21500,
    pavillion: 21500,
    pavilion: 21500,
    sovereign: 21500,
    statesman: 21500,
    avalon: 26100,
    havanna: 26100,
    havana: 26100,
    newport: 26100,
    imperial: 28500,
    merlot: 28500,
    "modern barn": 28500,
    "modern barn - new facade - (co-creation)": 28500,
    "modern box": 28500,
    "modern box - new facade - (co-creation)": 28500,
    "modern farmhouse option b": 28500,
    "modern farmhouse option b - new facade - (co-creation)": 28500,
    "modern farmhouse": 28500,
    nuvo: 28500,
    regal: 28500,
    veinna: 28500,
    vienna: 28500,
    vogue: 28500,
    vibe: 37900,
    visage: 37900,
    "modern classical option a": 42400,
    "modern classical option a - new facade - (co-creation)": 42400,
    "modern classical option b": 42400,
    "modern classical option b - new facade - (co-creation)": 42400,
    "modern classical": 42400,
  },
  double: {
    classic: 0,
    "classic plus": 5800,
    breeze: 12500,
    deco: 12500,
    "deco (terracotta 23)": 12500,
    "deco (terracotta 23 )": 12500,
    oxford: 12500,
    windsor: 12500,
    allure: 14100,
    novare: 14100,
    contemporary: 16400,
    mantra: 16400,
    "mantra (terracotta 23)": 16400,
    marina: 16400,
    majestic: 16400,
    "majestic (terracotta 23)": 16400,
    ashton: 24900,
    cambridge: 25000,
    chateaux: 25000,
    "chateaux (no balcony)": 25000,
    "chateaux (with balcony)": 39100,
    monash: 25000,
    mondo: 24900,
    vista: 24900,
    "vista (with no balcony)": 24900,
    "vista (without balcony)": 24900,
    "vista (with balcony)": 53800,
    hamptons: 27500,
    "hamptons (front, no balcony)": 27500,
    "hamptons (front, with balcony)": 39100,
    aspen: 33000,
    madison: 33000,
    "madison (turquoise only)": 33000,
    "modern box": 33000,
    "modern box - new facade - (co-creation)": 33000,
    "modern coastal": 33000,
    "modern coastal - new facade - (co-creation)": 33000,
    "mocha hamptons": 33000,
    "mocha hamptons (corner lot, no balcony)": 33000,
    "mocha hamptons (corner lot, balcony)": 44700,
    "mocha hamptons (premium corner lot, balcony)": 53800,
    statesman: 33000,
    "modern barn": 35300,
    "modern barn - new facade - (co-creation)": 35300,
    delta: 39100,
    deluxe: 39200,
    grande: 39200,
    riviera: 39100,
    royale: 39200,
    saville: 39200,
    sierra: 39100,
    "modern farmhouse option b": 42400,
    "modern farmhouse option b - new facade - (co-creation)": 42400,
    "modern farmhouse": 42400,
    "modern classical": 51500,
    "modern classical - new facade - (co-creation)": 51500,
    ascot: 53800,
    centro: 53800,
    como: 53800,
    flair: 53800,
    meridian: 53800,
    metro: 53900,
    nuvo: 53900,
    regal: 53900,
    soho: 53800,
    tempo: 53900,
    vogue: 53900,
    reed: 86600,
    clarence: 89600,
  },
  split: {
    classic: 0,
    eden: 14700,
    harmony: 15700,
    hamptons: 22000,
    chateaux: 22100,
    elite: 22100,
    infinity: 27500,
    nuvo: 41800,
    vogue: 42200,
  },
  acreage: {
    classic: 0,
    "classic plus": 5300,
    eden: 29500,
    statesman: 57300,
    metro: 57300,
    hamptons: 57300,
    urban: 66900,
    imperial: 66900,
    vogue: 159700,
  },
};

/** Library names that differ in spelling from the price lists. */
const ALIASES: Record<string, string> = {
  havana: "havanna",
  vienna: "veinna",
  "infinity mkii": "infinity",
  pavilion: "pavillion",
  "modern farmhouse": "modern farmhouse option b",
  "modern classical": "modern classical option a",
  moderna: "modena",
};

/** "Chateaux (No Balcony)" / "Chateaux Narrow (Double Storey)" -> "chateaux" */
export function facadeBaseName(name: string): string {
  const base = name
    .replace(/\(.*?\)/g, "")
    .split(" - ")[0]
    .replace(/\bnarrow\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return ALIASES[base] ?? base;
}

export function facadeCategory(item: { url: string; name: string; range?: string; tags?: string[] }): FacadeStorey {
  if (item.range === "Double Storey" || item.range === "Narrow Double Storey") return "double";
  if (item.range === "Acreage & Split Level" || item.range === "Acreage" || item.range?.includes("Acreage") || item.range?.includes("Ranch")) return "acreage";
  if (item.range === "Split Level" || item.range?.includes("Split")) return "split";
  if (item.range === "Single Storey" || item.range === "Single Storey (Narrow Lot)") return "single";

  const src = `${item.url} ${item.name} ${item.range ?? ""} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
  if (/split|cobalt/i.test(src)) return "split";
  if (/mulberry|ranch|acreage/i.test(src)) return "acreage";
  if (/2-?\s?stry|double[-\s]?storey|garage2/i.test(src)) return "double";
  return "single";
}

/** Facade upgrade cost for a facade name in a given storey category. */
export function facadePriceFor(name: string, storey: FacadeStorey): number | null {
  const direct = name.trim().toLowerCase();
  const directMatch = FACADE_PRICES[storey]?.[direct];
  if (directMatch !== undefined) return directMatch;

  const base = facadeBaseName(name);
  if (base === "classic") return 0;
  const exact = FACADE_PRICES[storey]?.[base];
  if (exact !== undefined) return exact;

  for (const s of ["single", "double", "split", "acreage"] as FacadeStorey[]) {
    const vDirect = FACADE_PRICES[s]?.[direct];
    if (vDirect !== undefined) return vDirect;
    const vBase = FACADE_PRICES[s]?.[base];
    if (vBase !== undefined) return vBase;
  }

  // Fallback for duplex premium facades when browsing or selecting outside a design context
  if (base in DUPLEX_PREMIUM) {
    return DUPLEX_PREMIUM[base as keyof typeof DUPLEX_PREMIUM];
  }
  if (base === "madison" || base === "marina") return 28700;
  if (base === "vista") return 33900;

  return null;
}

/* ---- Duplex / dual-occupancy facades (QLD Dual Living list, Issued 28/09/2026) ------ */

const DUPLEX_PREMIUM = {
  brixton: 81400,
  bronte: 106200,
  cranbrook: 96900,
  mayfield: 114500,
  modena: 86600,
  moderna: 86600,
  woodlands: 106200,
};

/** Magnolia / Maize style families price Madison, Marina and Vista differently. */
const DUPLEX_FACADE_PRICES: Record<string, Record<string, number>> = {
  magnolia: { ...DUPLEX_PREMIUM, madison: 12300, marina: 16200, vista: 24700 },
  maize: { ...DUPLEX_PREMIUM, madison: 28700, marina: 28700, vista: 33900 },
  // Cayenne and Raven share the Maize facade gallery and pricing.
  cayenne: { ...DUPLEX_PREMIUM, madison: 28700, marina: 28700, vista: 33900 },
  cayene: { ...DUPLEX_PREMIUM, madison: 28700, marina: 28700, vista: 33900 },
  raven: { ...DUPLEX_PREMIUM, madison: 28700, marina: 28700, vista: 33900 },
  wisteria: {
    classic: 0,
    "classic plus": 4800,
    crest: 7100,
    serenity: 9800,
    madison: 28700,
    avoca: 7100,
    bayside: 7100,
    breeze: 7100,
    executive: 7100,
    harmony: 7100,
    banksia: 9800,
    contemporary: 9800,
    eden: 9800,
    infinity: 9800,
    majestic: 9800,
  },
  lavender: { bayside: 7100, contemporary: 7100, eden: 9800, infinity: 9800 },
  teal: { ...DUPLEX_PREMIUM, madison: 28700, marina: 28700, vista: 33900, "teal 45 façade": 68900, "teal 45 facade": 68900 },
  alabaster: { ...DUPLEX_PREMIUM, classic: 0 },
};

/** Classic Plus on a duplex: single-porch rates for single / double storey. */
const DUPLEX_CLASSIC_PLUS: Record<"single" | "double", number> = {
  single: 4800,
  double: 5900,
};

/* ---- Mulberry (acreage) facades (QLD Mulberry list, Issued 28/09/2026) -------------- */

const MULBERRY_SMALL: Record<string, number> = {
  eden: 29500,
  statesman: 57300,
  metro: 57300,
  hamptons: 57300,
  urban: 66900,
  imperial: 66900,
  vogue: 159700,
};

const MULBERRY_LARGE: Record<string, number> = {
  eden: 33500,
  statesman: 64800,
  metro: 64800,
  hamptons: 64800,
  urban: 75700,
  imperial: 75700,
  vogue: 181100,
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

  if (family === "mulberry" || storey === "acreage") {
    if (base === "classic plus") return 5300;
    const isLarge = designName ? designSize(designName) >= 33 : false;
    const table = isLarge ? MULBERRY_LARGE : MULBERRY_SMALL;
    return table[base] ?? FACADE_PRICES.acreage[base] ?? facadePriceFor(name, "acreage");
  }

  if (family === "cinnamon") {
    return facadePriceFor(name, "double");
  }

  if (storey === "split") {
    return FACADE_PRICES.split[base] ?? facadePriceFor(name, "split");
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
 * Facades are rendered either with a single or a double garage.
 * When a design is selected with a single car garage, ONLY single car garage
 * facades (with dedicated 1-car garage renders) must be shown.
 * ------------------------------------------------------------------------ */

export type FacadeGarage = 1 | 2 | "both";

export function isSingleGarageFacade(item: { id?: string; name: string; url?: string; range?: string; tags?: string[] }): boolean {
  const src = `${item.id ?? ""} ${item.name} ${item.url ?? ""} ${item.range ?? ""} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
  return (
    /single[-\s]?garage/i.test(src) ||
    item.range === "Single Storey (Narrow Lot)" ||
    Boolean(item.tags?.includes("single-garage")) ||
    Boolean(item.tags?.includes("single_garage")) ||
    Boolean(item.id?.endsWith("-single-garage"))
  );
}

export function facadeGarage(item: { id?: string; name: string; url?: string; range?: string; tags?: string[] }): FacadeGarage {
  if (isSingleGarageFacade(item)) return 1;
  return 2;
}

/** Checks if a design model is a single garage home */
export function isSingleGarageDesign(designName?: string, housingType?: string): boolean {
  if (!designName && !housingType) return false;
  const lower = `${designName || ""} ${housingType || ""}`.toLowerCase().trim();
  return (
    lower.includes("(s/g)") ||
    lower.includes("s/g") ||
    lower.includes("single garage") ||
    lower.includes("single-garage") ||
    lower.startsWith("hazel") ||
    lower.startsWith("canary") ||
    lower.startsWith("cerise 20") ||
    lower.startsWith("indigo (qld only)") ||
    lower.startsWith("iris") ||
    lower.startsWith("lime") ||
    lower.startsWith("mint") ||
    lower.startsWith("terracotta 23") ||
    lower.startsWith("ruby 19") ||
    lower.startsWith("ruby 21") ||
    lower.startsWith("ruby 23") ||
    lower.startsWith("ruby 28") ||
    lower.startsWith("orchid") ||
    lower.startsWith("robin")
  );
}

/** How many garage spaces a floorplan's car count implies (2+ car = double). */
export function garageFromCars(cars: string | number | undefined): 1 | 2 | null {
  const n = Number(String(cars ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n >= 2 ? 2 : 1;
}


