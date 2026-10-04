export interface PartnerDeveloperPreset {
  id: string;
  name: string;
  logoUrl: string;
  darkLogoUrl?: string;
  defaultEstate?: string;
  matchedEstates: string[];
  tagline?: string;
  defaultTitleFormat?: (estateName: string) => string;
}

export const PARTNER_DEVELOPERS: PartnerDeveloperPreset[] = [
  {
    id: "peet",
    name: "PEET",
    logoUrl: "/partners/peet-logo-rgb.jpg",
    darkLogoUrl: "/partners/peet-logo.png",
    defaultEstate: "Flagstone",
    matchedEstates: ["flagstone", "eden's crossing", "edens crossing", "googong", "peet", "foliage", "riverstone"],
    tagline: "Where You Belong",
    defaultTitleFormat: (estate) => `${estate || "Flagstone"} by PEET`,
  },
  {
    id: "stockland",
    name: "Stockland",
    logoUrl: "/partners/stockland-logo.svg",
    defaultEstate: "Aura",
    matchedEstates: ["aura", "newport", "pallara", "highlands", "elmslea", "cloverton", "mt atkinson", "stockland", "providence"],
    tagline: "Building Communities",
    defaultTitleFormat: (estate) => `${estate || "Aura"} by Stockland`,
  },
  {
    id: "lendlease",
    name: "Lendlease",
    logoUrl: "/partners/lendlease-logo.svg",
    defaultEstate: "Yarrabilba",
    matchedEstates: ["yarrabilba", "alkimos", "jordan springs", "calderwood valley", "springfield lakes", "lendlease", "elliot springs"],
    tagline: "Creating Places People Love",
    defaultTitleFormat: (estate) => `${estate || "Yarrabilba"} by Lendlease`,
  },
  {
    id: "mirvac",
    name: "Mirvac",
    logoUrl: "/partners/mirvac-logo.svg",
    defaultEstate: "Everleigh",
    matchedEstates: ["everleigh", "gainsborough greens", "woodlea", "gooromon", "mirvac", "waterford"],
    tagline: "Reimagining Urban Life",
    defaultTitleFormat: (estate) => `${estate || "Everleigh"} by Mirvac`,
  },
  {
    id: "frasers",
    name: "Frasers Property",
    logoUrl: "https://p3.aprimocdn.net/frasersproperty/dc7d83cb-5bb6-44f6-aa49-b111000c7439/FPY0147_Frasers_100YR_Website%20v3_Original%20file.gif",
    defaultEstate: "Brookhaven",
    matchedEstates: ["brookhaven", "the grove", "minnippi quarter", "fairwater", "frasers", "hamilton reach"],
    tagline: "Creating Proud Communities",
    defaultTitleFormat: (estate) => `${estate || "Brookhaven"} by Frasers Property`,
  },
  {
    id: "avid",
    name: "AVID Property Group",
    logoUrl: "/partners/avid-logo.svg",
    defaultEstate: "Harmony",
    matchedEstates: ["harmony", "brentwood forest", "covella", "chambers ridge", "avid", "savannah"],
    tagline: "Bringing People Together",
    defaultTitleFormat: (estate) => `${estate || "Harmony"} by AVID`,
  },
  {
    id: "sekisui",
    name: "Sekisui House",
    logoUrl: "/partners/sekisui-logo.png",
    defaultEstate: "Ripley Valley",
    matchedEstates: ["ripley valley", "ecco ripley", "gledswood hills", "shawood", "sekisui"],
    tagline: "Homes for Life",
    defaultTitleFormat: (estate) => `${estate || "Ripley Valley"} by Sekisui House`,
  },
  {
    id: "villawood",
    name: "Villawood Properties",
    logoUrl: "/partners/villawood-logo.svg",
    defaultEstate: "Armstrong",
    matchedEstates: ["armstrong", "redstone", "alamora", "villawood", "sunbury", "rhodd"],
    tagline: "A More Meaningful Place",
    defaultTitleFormat: (estate) => `${estate || "Community"} by Villawood`,
  },
];

/**
 * Intelligent helper to auto-detect a developer partner based on estate or suburb name.
 */
export function findPartnerForEstate(estateName?: string, suburbName?: string): PartnerDeveloperPreset | null {
  const query = `${estateName || ""} ${suburbName || ""}`.toLowerCase().trim();
  if (!query) return null;

  for (const p of PARTNER_DEVELOPERS) {
    if (p.matchedEstates.some((keyword) => query.includes(keyword))) {
      return p;
    }
  }
  return null;
}

export function getPartnerPreset(id?: string): PartnerDeveloperPreset | null {
  if (!id) return null;
  return PARTNER_DEVELOPERS.find((p) => p.id === id) || null;
}
