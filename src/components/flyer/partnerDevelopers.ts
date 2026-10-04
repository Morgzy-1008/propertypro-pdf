export interface PartnerDeveloperPreset {
  id: string;
  name: string;
  logoUrl: string;
  darkLogoUrl?: string;
  state?: "NSW" | "QLD" | "ALL";
  defaultEstate?: string;
  matchedEstates: string[];
  tagline?: string;
  isCustom?: boolean;
  isOverridden?: boolean;
}

export const BASE_PARTNER_DEVELOPERS: PartnerDeveloperPreset[] = [
  // --- National / Shared Developers (NSW & QLD) ---
  {
    id: "stockland",
    name: "Stockland",
    logoUrl: "/partners/stockland-logo.svg",
    state: "ALL",
    defaultEstate: "Aura",
    matchedEstates: [
      "aura", "newport", "pallara", "highlands", "elmslea",
      "cloverton", "mt atkinson", "stockland", "providence", "the gables"
    ],
    tagline: "Building Communities",
  },
  {
    id: "lendlease",
    name: "Lendlease",
    logoUrl: "/partners/lendlease-logo.svg",
    state: "ALL",
    defaultEstate: "Yarrabilba",
    matchedEstates: [
      "yarrabilba", "alkimos", "jordan springs", "calderwood valley",
      "calderwood", "springfield lakes", "lendlease", "elliot springs", "shoreline"
    ],
    tagline: "Creating Places People Love",
  },
  {
    id: "mirvac",
    name: "Mirvac",
    logoUrl: "/partners/mirvac-logo.svg",
    state: "ALL",
    defaultEstate: "Everleigh",
    matchedEstates: [
      "everleigh", "gainsborough greens", "woodlea", "gooromon",
      "mirvac", "waterford", "georges cove"
    ],
    tagline: "Reimagining Urban Life",
  },
  {
    id: "frasers",
    name: "Frasers Property",
    // Standard crisp vector logo (no animated GIF for printing & high-res production)
    logoUrl: "/partners/frasers-property-logo.svg",
    state: "ALL",
    defaultEstate: "Brookhaven",
    matchedEstates: [
      "brookhaven", "the grove", "minnippi quarter", "fairwater",
      "frasers", "hamilton reach", "waterfront shell cove", "shell cove"
    ],
    tagline: "Creating Proud Communities",
  },
  {
    id: "sekisui",
    name: "Sekisui House",
    logoUrl: "/partners/sekisui-logo.png",
    state: "ALL",
    defaultEstate: "Ripley Valley",
    matchedEstates: [
      "ripley valley", "ecco ripley", "gledswood hills", "shawood", "sekisui", "the hermitage"
    ],
    tagline: "Homes for Life",
  },
  {
    id: "villawood",
    name: "Villawood Properties",
    logoUrl: "/partners/villawood-logo.svg",
    state: "ALL",
    defaultEstate: "Armstrong",
    matchedEstates: [
      "armstrong", "redstone", "alamora", "villawood", "sunbury", "rhodd"
    ],
    tagline: "A More Meaningful Place",
  },

  // --- Queensland Specific Developers ---
  {
    id: "peet",
    name: "PEET",
    logoUrl: "/partners/peet-logo-rgb.jpg",
    darkLogoUrl: "/partners/peet-logo.png",
    state: "QLD",
    defaultEstate: "Flagstone",
    matchedEstates: ["flagstone", "eden's crossing", "edens crossing", "googong", "peet", "foliage", "riverstone"],
    tagline: "Where You Belong",
  },
  {
    id: "avid",
    name: "AVID Property Group",
    logoUrl: "/partners/avid-logo.svg",
    state: "QLD",
    defaultEstate: "Harmony",
    matchedEstates: ["harmony", "brentwood forest", "covella", "chambers ridge", "avid", "savannah"],
    tagline: "Bringing People Together",
  },
  {
    id: "pelican_waters",
    name: "Pelican Waters",
    logoUrl: "/partners/pelican-waters-logo.svg",
    state: "QLD",
    defaultEstate: "Pelican Waters",
    matchedEstates: ["pelican waters", "pelican"],
    tagline: "Sunshine Coast Living",
  },
  {
    id: "north_harbour",
    name: "North Harbour",
    logoUrl: "/partners/north-harbour-logo.svg",
    state: "QLD",
    defaultEstate: "North Harbour",
    matchedEstates: ["north harbour", "burpengary"],
    tagline: "A Community to Grow In",
  },
  {
    id: "urbex",
    name: "Urbex",
    logoUrl: "/partners/urbex-logo.svg",
    state: "QLD",
    defaultEstate: "Capestone",
    matchedEstates: ["capestone", "urbex", "minimbah"],
    tagline: "Creating Communities",
  },

  // --- New South Wales Specific Developers ---
  {
    id: "greenfields",
    name: "Greenfields Development",
    logoUrl: "/partners/greenfields-logo.svg",
    state: "NSW",
    defaultEstate: "Oran Park",
    matchedEstates: ["oran park", "greenfields", "oran"],
    tagline: "The Town of Tomorrow",
  },
  {
    id: "harrington",
    name: "Harrington Estates",
    logoUrl: "/partners/harrington-logo.svg",
    state: "NSW",
    defaultEstate: "Harrington Grove",
    matchedEstates: ["harrington grove", "catherine park", "harrington estates", "harrington park"],
    tagline: "Exceptional Living",
  },
  {
    id: "dahua",
    name: "Dahua Group",
    logoUrl: "/partners/dahua-logo.svg",
    state: "NSW",
    defaultEstate: "Bingara Gorge",
    matchedEstates: ["bingara gorge", "menangle park", "dahua", "bingara"],
    tagline: "Creating Vibrant Communities",
  },
  {
    id: "lwp",
    name: "LWP Property Group",
    logoUrl: "/partners/lwp-logo.svg",
    state: "NSW",
    defaultEstate: "Huntlee",
    matchedEstates: ["huntlee", "lwp"],
    tagline: "Communities by Design",
  },
];

export const PARTNER_DEVELOPERS = BASE_PARTNER_DEVELOPERS;

const CUSTOM_PARTNERS_KEY = "hudson_custom_partner_developers";
const OVERRIDDEN_PARTNERS_KEY = "hudson_overridden_partner_developers";

/** Get customized developer overrides from localStorage */
export function getOverriddenPartners(): Record<string, Partial<PartnerDeveloperPreset>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDDEN_PARTNERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get custom developer partners created by user */
export function getCustomPartners(): PartnerDeveloperPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PARTNERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Loads all active developer partners merging base presets + custom overrides + custom additions.
 * Can filter by state (e.g. "NSW", "QLD", "ALL").
 */
export function loadAllPartnerDevelopers(stateFilter?: "NSW" | "QLD" | "ALL"): PartnerDeveloperPreset[] {
  const overrides = getOverriddenPartners();
  const customList = getCustomPartners();

  const standardWithOverrides = BASE_PARTNER_DEVELOPERS.map((base) => {
    const ov = overrides[base.id];
    if (ov) {
      return { ...base, ...ov, isOverridden: true };
    }
    return base;
  });

  const merged = [...standardWithOverrides, ...customList];

  if (!stateFilter || stateFilter === "ALL") {
    return merged;
  }

  return merged.filter((dev) => dev.state === "ALL" || dev.state === stateFilter);
}

/** Save a newly added developer partner created by the user */
export function saveCustomPartner(dev: Omit<PartnerDeveloperPreset, "id"> & { id?: string }): PartnerDeveloperPreset {
  const customList = getCustomPartners();
  const id = dev.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: PartnerDeveloperPreset = {
    ...dev,
    id,
    isCustom: true,
  };

  const next = [...customList.filter((item) => item.id !== id), record];
  if (typeof window !== "undefined") {
    localStorage.setItem(CUSTOM_PARTNERS_KEY, JSON.stringify(next));
  }
  return record;
}

/** Update or customize an existing developer preset (either standard or custom) */
export function updatePartnerPreset(id: string, updates: Partial<PartnerDeveloperPreset>): void {
  if (typeof window === "undefined") return;

  const customList = getCustomPartners();
  const customIndex = customList.findIndex((item) => item.id === id);

  if (customIndex !== -1) {
    customList[customIndex] = { ...customList[customIndex], ...updates };
    localStorage.setItem(CUSTOM_PARTNERS_KEY, JSON.stringify(customList));
    return;
  }

  // Standard preset override
  const overrides = getOverriddenPartners();
  overrides[id] = { ...(overrides[id] || {}), ...updates };
  localStorage.setItem(OVERRIDDEN_PARTNERS_KEY, JSON.stringify(overrides));
}

/** Reset a standard developer preset to its factory defaults */
export function resetPartnerPreset(id: string): void {
  if (typeof window === "undefined") return;
  const overrides = getOverriddenPartners();
  delete overrides[id];
  localStorage.setItem(OVERRIDDEN_PARTNERS_KEY, JSON.stringify(overrides));
}

/** Delete a custom developer partner */
export function deleteCustomPartner(id: string): void {
  if (typeof window === "undefined") return;
  const customList = getCustomPartners();
  const next = customList.filter((item) => item.id !== id);
  localStorage.setItem(CUSTOM_PARTNERS_KEY, JSON.stringify(next));
}

/**
 * Intelligent helper to auto-detect a developer partner based on estate or suburb name.
 */
export function findPartnerForEstate(
  estateName?: string,
  suburbName?: string,
  stateFilter?: "NSW" | "QLD" | "ALL"
): PartnerDeveloperPreset | null {
  const query = `${estateName || ""} ${suburbName || ""}`.toLowerCase().trim();
  if (!query) return null;

  const candidates = loadAllPartnerDevelopers(stateFilter);

  for (const p of candidates) {
    if (p.matchedEstates.some((keyword) => query.includes(keyword))) {
      return p;
    }
  }
  return null;
}

export function getPartnerPreset(id?: string): PartnerDeveloperPreset | null {
  if (!id) return null;
  const all = loadAllPartnerDevelopers();
  return all.find((p) => p.id === id) || null;
}
