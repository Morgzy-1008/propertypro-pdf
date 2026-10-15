/**
 * Australian Address Autocomplete & Structured Parsing Service
 * Designed for Hudson Homes Quoting Engine, Flyer Studio & Tender Portal.
 * Uses official Australia Post delivery dataset + OSM geocoder + synthetic estate parser.
 */

import {
  lookupAustralianSuburb,
  lookupSuburbsByPostcode,
  detectCouncilForSuburb,
  searchAustralianSuburbs,
  KNOWN_ESTATES,
  type SuburbRecord,
} from "./australianSuburbsData";

export interface AddressSuggestion {
  id: string;
  formattedAddress: string;
  lotNumber?: string;
  streetNumber?: string;
  streetName?: string;
  fullStreet?: string;
  suburb: string;
  state: string;
  postcode: string;
  council?: string;
  estate?: string;
  lat?: number;
  lon?: number;
}

const IN_MEMORY_CACHE = new Map<string, AddressSuggestion[]>();
const MAX_CACHE_ENTRIES = 120;

const METRO_AREAS = new Set([
  "sydney",
  "greater sydney",
  "brisbane",
  "greater brisbane",
  "melbourne",
  "greater melbourne",
  "adelaide",
  "perth",
  "queensland",
  "new south wales",
  "australia",
]);

function normalizeState(rawState?: string, postcode?: string): string {
  if (!rawState) {
    if (postcode) {
      if (postcode.startsWith("2")) return "NSW";
      if (postcode.startsWith("4")) return "QLD";
      if (postcode.startsWith("3")) return "VIC";
      if (postcode.startsWith("5")) return "SA";
      if (postcode.startsWith("6")) return "WA";
      if (postcode.startsWith("0")) return "NT";
      if (postcode.startsWith("7")) return "TAS";
    }
    return "QLD";
  }
  const s = String(rawState).toLowerCase().trim();
  if (s.includes("queensland") || s === "qld") return "QLD";
  if (s.includes("new south wales") || s === "nsw") return "NSW";
  if (s.includes("victoria") || s === "vic") return "VIC";
  if (s.includes("south australia") || s === "sa") return "SA";
  if (s.includes("western australia") || s === "wa") return "WA";
  if (s.includes("australian capital territory") || s === "act") return "ACT";
  if (s.includes("tasmania") || s === "tas") return "TAS";
  if (s.includes("northern territory") || s === "nt") return "NT";
  return rawState.toUpperCase();
}

function matchEstate(suburb?: string, street?: string, query?: string): string {
  const text = `${query || ""} ${street || ""} ${suburb || ""}`.toLowerCase();
  for (const est of KNOWN_ESTATES) {
    if (est.keywords.some((k) => text.includes(k))) {
      return est.name;
    }
  }
  return "";
}

/**
 * Enriches and verifies an address suggestion against the official Australia Post database.
 * Corrects missing postcodes, resolves true suburb (prevents generic 'Sydney'/'Brisbane'),
 * and determines accurate council jurisdiction.
 */
export function enrichAndVerifySuggestion(
  suggestion: AddressSuggestion,
  rawQuery: string,
  preferredState?: string
): AddressSuggestion {
  let suburb = (suggestion.suburb || "").trim();
  let state = normalizeState(suggestion.state || preferredState, suggestion.postcode);
  let postcode = (suggestion.postcode || "").trim();

  // 1. Detect if the returned suburb is actually a generic metro area (e.g. Brisbane or Sydney)
  const isGenericMetro = !suburb || METRO_AREAS.has(suburb.toLowerCase());

  if (isGenericMetro) {
    // Try to extract real suburb from rawQuery or formattedAddress
    const candidateStrings = [
      rawQuery,
      suggestion.formattedAddress,
      suggestion.fullStreet || "",
    ];

    let foundSuburb: SuburbRecord | null = null;
    for (const str of candidateStrings) {
      if (!str) continue;
      // Split tokens by commas and whitespace
      const parts = str.split(/[,;\-]+/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        // Test single and multi-word parts
        const words = part.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          for (let j = i + 1; j <= words.length; j++) {
            const candidate = words.slice(i, j).join(" ").replace(/[^a-zA-Z\s]/g, "").trim();
            if (candidate.length >= 3 && !METRO_AREAS.has(candidate.toLowerCase())) {
              const match = lookupAustralianSuburb(candidate, preferredState || state);
              if (match) {
                foundSuburb = match;
                break;
              }
            }
          }
          if (foundSuburb) break;
        }
        if (foundSuburb) break;
      }
      if (foundSuburb) break;
    }

    if (foundSuburb) {
      suburb = foundSuburb.suburb;
      state = foundSuburb.state;
      if (!postcode || postcode.length !== 4) {
        postcode = foundSuburb.postcode;
      }
    }
  }

  // 2. Resolve missing or incomplete postcode via official Australia Post database
  if ((!postcode || postcode.length !== 4) && suburb) {
    const verified = lookupAustralianSuburb(suburb, state || preferredState);
    if (verified) {
      postcode = verified.postcode;
      state = verified.state;
    }
  }

  // 3. Resolve council jurisdiction
  const council = detectCouncilForSuburb(suburb, state, postcode) || suggestion.council || "";

  // 4. Resolve estate name
  const estate = matchEstate(suburb, suggestion.fullStreet || suggestion.streetName, rawQuery) || suggestion.estate || "";

  // 5. Build clean, professional formatted address
  const lotPrefix = suggestion.lotNumber ? `Lot ${suggestion.lotNumber}, ` : "";
  const streetPart = suggestion.fullStreet || suggestion.streetName || "";
  const cleanFormatted = `${lotPrefix}${streetPart ? `${streetPart}, ` : ""}${suburb ? `${suburb} ` : ""}${state} ${postcode}`.trim();

  return {
    ...suggestion,
    suburb,
    state,
    postcode,
    council: council || undefined,
    estate: estate || undefined,
    formattedAddress: cleanFormatted || suggestion.formattedAddress,
  };
}

/**
 * Synthesizes a valid Australian address suggestion directly from user input
 * when geocoders return 0 results (e.g. brand new estate streets or lot numbers).
 */
export function synthesizeAddressFromQuery(query: string, preferredState?: string): AddressSuggestion | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Extract lot number if present
  const lotMatch = trimmed.match(/\blot\s*([0-9A-Za-z]+)\b/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

  // Extract street number if present
  let cleanWorking = trimmed.replace(/\blot\s*[0-9A-Za-z]+,?\s*/gi, "").trim();
  const streetNumMatch = cleanWorking.match(/^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+/);
  const streetNum = streetNumMatch ? streetNumMatch[1] : "";
  if (streetNum && streetNumMatch) {
    cleanWorking = cleanWorking.slice(streetNumMatch[0].length).trim();
  }

  // Common Australian street suffixes
  const STREET_SUFFIXES = new Set([
    "street", "st", "road", "rd", "drive", "dr", "avenue", "ave", "way",
    "crescent", "cres", "circuit", "cct", "court", "ct", "close", "cl",
    "place", "pl", "parade", "pde", "boulevard", "blvd", "lane", "ln",
    "terrace", "tce", "esplanade", "esp", "rise", "grove", "gr", "track",
    "walk", "chase", "view", "vista", "loop", "glen", "ridge", "bend", "reach"
  ]);

  // Scan for known Australian suburb in query, prioritizing the trailing portion (where suburbs reside)
  const parts = cleanWorking.split(/[,;\-]+/).map((p) => p.trim()).filter(Boolean);
  let matchedSuburb: SuburbRecord | null = null;
  let suburbToken = "";

  // Check from the last comma-separated part backwards
  for (let pIdx = parts.length - 1; pIdx >= 0; pIdx--) {
    const part = parts[pIdx];
    const words = part.split(/\s+/);
    
    // First, check multi-word or single-word ending at the end of this part
    for (let len = Math.min(3, words.length); len >= 1; len--) {
      const candidate = words.slice(words.length - len).join(" ").replace(/[^a-zA-Z\s]/g, "").trim();
      if (candidate.length >= 3) {
        const match = lookupAustralianSuburb(candidate, preferredState);
        if (match) {
          // If preceded by a street suffix, or at the tail of the query, this is the true suburb
          const prevWord = words[words.length - len - 1]?.toLowerCase() || "";
          if (pIdx === parts.length - 1 || STREET_SUFFIXES.has(prevWord)) {
            matchedSuburb = match;
            suburbToken = candidate;
            break;
          } else if (!matchedSuburb) {
            matchedSuburb = match;
            suburbToken = candidate;
          }
        }
      }
    }
    if (matchedSuburb) break;
  }

  // Fallback: general scan backwards across all words
  if (!matchedSuburb) {
    const words = cleanWorking.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      for (let len = Math.min(3, words.length - i); len >= 1; len--) {
        const candidate = words.slice(i, i + len).join(" ").replace(/[^a-zA-Z\s]/g, "").trim();
        if (candidate.length >= 3) {
          const match = lookupAustralianSuburb(candidate, preferredState);
          if (match) {
            matchedSuburb = match;
            suburbToken = candidate;
            break;
          }
        }
      }
      if (matchedSuburb) break;
    }
  }

  // Check known estates if still not found
  if (!matchedSuburb) {
    for (const est of KNOWN_ESTATES) {
      if (est.keywords.some((k) => trimmed.toLowerCase().includes(k))) {
        matchedSuburb = {
          suburb: est.suburb,
          postcode: est.postcode,
          state: est.state,
          council: est.council,
        };
        suburbToken = est.name;
        break;
      }
    }
  }

  if (!matchedSuburb) return null;

  // Extract street name by stripping the suburb token and any trailing punctuation
  let streetName = cleanWorking;
  if (suburbToken) {
    const regex = new RegExp(`\\b${suburbToken}\\b.*$`, "i");
    streetName = streetName.replace(regex, "").trim();
  }
  streetName = streetName.replace(/[,;]+$/, "").trim();

  const fullStreet = streetNum && streetName ? `${streetNum} ${streetName}` : (streetName || streetNum || "");
  const estate = matchEstate(matchedSuburb.suburb, fullStreet, trimmed);
  const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
  const formattedAddress = `${lotPrefix}${fullStreet ? `${fullStreet}, ` : ""}${matchedSuburb.suburb} ${matchedSuburb.state} ${matchedSuburb.postcode}`.trim();

  return {
    id: `syn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    formattedAddress,
    lotNumber: detectedLot || undefined,
    streetNumber: streetNum || undefined,
    streetName: streetName || undefined,
    fullStreet: fullStreet || undefined,
    suburb: matchedSuburb.suburb,
    state: matchedSuburb.state,
    postcode: matchedSuburb.postcode,
    council: matchedSuburb.council || detectCouncilForSuburb(matchedSuburb.suburb, matchedSuburb.state, matchedSuburb.postcode),
    estate: estate || undefined,
  };
}

export interface MasterplannedStreet {
  streetName: string;
  suburb: string;
  state: "QLD" | "NSW";
  postcode: string;
  estate?: string;
  council: string;
}

export const MASTERPLANNED_STREETS: MasterplannedStreet[] = [
  // QLD - Moreton Bay
  { streetName: "Bottletree Circuit", suburb: "Narangba", state: "QLD", postcode: "4504", estate: "Ridgeview Estate", council: "City of Moreton Bay" },
  { streetName: "Sanctuary Boulevard", suburb: "North Lakes", state: "QLD", postcode: "4509", estate: "The Sanctuary", council: "City of Moreton Bay" },
  { streetName: "Endeavour Boulevard", suburb: "North Lakes", state: "QLD", postcode: "4509", estate: "North Lakes Central", council: "City of Moreton Bay" },
  { streetName: "Discovery Drive", suburb: "North Lakes", state: "QLD", postcode: "4509", estate: "North Lakes", council: "City of Moreton Bay" },
  { streetName: "Capestone Boulevard", suburb: "Mango Hill", state: "QLD", postcode: "4509", estate: "Capestone (Mango Hill)", council: "City of Moreton Bay" },
  { streetName: "North Harbour Drive", suburb: "Burpengary East", state: "QLD", postcode: "4505", estate: "North Harbour", council: "City of Moreton Bay" },
  { streetName: "Buckley Road", suburb: "Burpengary East", state: "QLD", postcode: "4505", estate: "North Harbour", council: "City of Moreton Bay" },
  { streetName: "Ridgeview Drive", suburb: "Narangba", state: "QLD", postcode: "4504", estate: "Ridgeview Estate", council: "City of Moreton Bay" },
  { streetName: "Golden Wattle Drive", suburb: "Narangba", state: "QLD", postcode: "4504", estate: "Narangba Heights", council: "City of Moreton Bay" },
  { streetName: "Boundary Road", suburb: "Narangba", state: "QLD", postcode: "4504", council: "City of Moreton Bay" },

  // QLD - Logan
  { streetName: "Trailblazer Drive", suburb: "Flagstone", state: "QLD", postcode: "4280", estate: "Flagstone Estate (Peet)", council: "Logan City Council" },
  { streetName: "Broad Axe Crescent", suburb: "Flagstone", state: "QLD", postcode: "4280", estate: "Flagstone Estate (Peet)", council: "Logan City Council" },
  { streetName: "Bushman Drive", suburb: "Flagstone", state: "QLD", postcode: "4280", estate: "Flagstone Estate", council: "Logan City Council" },
  { streetName: "Homestead Drive", suburb: "Flagstone", state: "QLD", postcode: "4280", estate: "Flagstone Rise", council: "Logan City Council" },
  { streetName: "Paradise Road", suburb: "South Maclean", state: "QLD", postcode: "4280", estate: "Lilywood Landings", council: "Logan City Council" },
  { streetName: "Lilywood Landings Boulevard", suburb: "South Maclean", state: "QLD", postcode: "4280", estate: "Lilywood Landings", council: "Logan City Council" },
  { streetName: "Haven Street", suburb: "Bahrs Scrub", state: "QLD", postcode: "4207", estate: "Haven Estate", council: "Logan City Council" },
  { streetName: "Everleigh Drive", suburb: "Greenbank", state: "QLD", postcode: "4124", estate: "Everleigh (Mirvac)", council: "Logan City Council" },
  { streetName: "Elegance Drive", suburb: "Greenbank", state: "QLD", postcode: "4124", estate: "Covella (AVID)", council: "Logan City Council" },
  { streetName: "Sovereign Drive", suburb: "Greenbank", state: "QLD", postcode: "4124", estate: "Covella", council: "Logan City Council" },
  { streetName: "Yarrabilba Drive", suburb: "Yarrabilba", state: "QLD", postcode: "4207", estate: "Yarrabilba (Lendlease)", council: "Logan City Council" },

  // QLD - Ipswich
  { streetName: "Spring Mountain Boulevard", suburb: "Spring Mountain", state: "QLD", postcode: "4300", estate: "Springfield Rise (Lendlease)", council: "Ipswich City Council" },
  { streetName: "Dublin Avenue", suburb: "Spring Mountain", state: "QLD", postcode: "4300", estate: "Springfield Rise", council: "Ipswich City Council" },
  { streetName: "Ripley Way", suburb: "South Ripley", state: "QLD", postcode: "4306", estate: "South Ripley / Providence", council: "Ipswich City Council" },
  { streetName: "Providence Parade", suburb: "South Ripley", state: "QLD", postcode: "4306", estate: "Providence", council: "Ipswich City Council" },
  { streetName: "Amity Way", suburb: "South Ripley", state: "QLD", postcode: "4306", estate: "South Ripley", council: "Ipswich City Council" },

  // QLD - Sunshine Coast & Gold Coast
  { streetName: "Harmony Boulevard", suburb: "Palmview", state: "QLD", postcode: "4553", estate: "Harmony (AVID)", council: "Sunshine Coast Council" },
  { streetName: "Baringa Drive", suburb: "Baringa", state: "QLD", postcode: "4551", estate: "Aura (Stockland)", council: "Sunshine Coast Council" },
  { streetName: "Steiner Crescent", suburb: "Baringa", state: "QLD", postcode: "4551", estate: "Aura", council: "Sunshine Coast Council" },
  { streetName: "Gainsborough Drive", suburb: "Pimpama", state: "QLD", postcode: "4209", estate: "Gainsborough Greens", council: "City of Gold Coast" },
  { streetName: "Bourne Street", suburb: "Pimpama", state: "QLD", postcode: "4209", estate: "Gainsborough Greens", council: "City of Gold Coast" },
  { streetName: "Bowen Street", suburb: "Brisbane City", state: "QLD", postcode: "4000", council: "Brisbane City Council" },
  { streetName: "Salisbury Road", suburb: "Salisbury", state: "QLD", postcode: "4107", council: "Brisbane City Council" },

  // NSW - The Hills / Box Hill
  { streetName: "Boundary Road", suburb: "Box Hill", state: "NSW", postcode: "2765", estate: "The Gables", council: "The Hills Shire" },
  { streetName: "Red Gables Drive", suburb: "Box Hill", state: "NSW", postcode: "2765", estate: "The Gables", council: "The Hills Shire" },
  { streetName: "Fontana Drive", suburb: "Box Hill", state: "NSW", postcode: "2765", estate: "The Gables", council: "The Hills Shire" },
  { streetName: "Slidey Rocks Way", suburb: "Box Hill", state: "NSW", postcode: "2765", estate: "The Gables", council: "The Hills Shire" },
  { streetName: "Sackville Street", suburb: "Box Hill", state: "NSW", postcode: "2765", council: "The Hills Shire" },

  // NSW - Blacktown / Marsden Park
  { streetName: "Elara Boulevard", suburb: "Marsden Park", state: "NSW", postcode: "2765", estate: "Elara (Stockland)", council: "Blacktown City Council" },
  { streetName: "Harvest Street", suburb: "Marsden Park", state: "NSW", postcode: "2765", estate: "Elara", council: "Blacktown City Council" },
  { streetName: "Frontier Avenue", suburb: "Marsden Park", state: "NSW", postcode: "2765", estate: "Elara", council: "Blacktown City Council" },

  // NSW - Camden & Liverpool
  { streetName: "Central Avenue", suburb: "Oran Park", state: "NSW", postcode: "2570", estate: "Oran Park Town", council: "Camden Council" },
  { streetName: "Oran Park Drive", suburb: "Oran Park", state: "NSW", postcode: "2570", estate: "Oran Park Town", council: "Camden Council" },
  { streetName: "Peter Brock Drive", suburb: "Oran Park", state: "NSW", postcode: "2570", estate: "Oran Park Town", council: "Camden Council" },
  { streetName: "Edmondson Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Gurner Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Rickard Road", suburb: "Leppington", state: "NSW", postcode: "2179", estate: "Leppington Living", council: "Camden Council" },
  { streetName: "Byron Road", suburb: "Leppington", state: "NSW", postcode: "2179", estate: "Leppington Living", council: "Camden Council" },
  { streetName: "Escarpment Drive", suburb: "Calderwood", state: "NSW", postcode: "2527", estate: "Calderwood Valley (Lendlease)", council: "Shellharbour City Council" },
  { streetName: "Macarthur Drive", suburb: "Wilton", state: "NSW", postcode: "2571", estate: "Wilton Greens", council: "Wollondilly Shire Council" },
  { streetName: "Catherine Fields Road", suburb: "Catherine Field", state: "NSW", postcode: "2557", estate: "Catherine Park", council: "Camden Council" },
  { streetName: "Lochinvar Downs Drive", suburb: "Lochinvar", state: "NSW", postcode: "2321", estate: "Lochinvar Downs", council: "Maitland City Council" },
  { streetName: "Cataract Road", suburb: "Box Hill", state: "NSW", postcode: "2765", estate: "The Gables", council: "The Hills Shire" },
  { streetName: "Terry Road", suburb: "Box Hill", state: "NSW", postcode: "2765", council: "The Hills Shire" },
  { streetName: "Mason Road", suburb: "Box Hill", state: "NSW", postcode: "2765", council: "The Hills Shire" },
  { streetName: "George Street", suburb: "Box Hill", state: "NSW", postcode: "2765", council: "The Hills Shire" },
  { streetName: "Richmond Road", suburb: "Marsden Park", state: "NSW", postcode: "2765", council: "Blacktown City Council" },
  { streetName: "Abell Road", suburb: "Marsden Park", state: "NSW", postcode: "2765", estate: "Elara", council: "Blacktown City Council" },
  { streetName: "Northbourne Drive", suburb: "Marsden Park", state: "NSW", postcode: "2765", estate: "Elara", council: "Blacktown City Council" },
  { streetName: "Alex Avenue", suburb: "Schofields", state: "NSW", postcode: "2762", council: "Blacktown City Council" },
  { streetName: "Pelican Road", suburb: "Schofields", state: "NSW", postcode: "2762", council: "Blacktown City Council" },
  { streetName: "The Ponds Boulevard", suburb: "The Ponds", state: "NSW", postcode: "2769", council: "Blacktown City Council" },
  { streetName: "Riverbank Drive", suburb: "The Ponds", state: "NSW", postcode: "2769", council: "Blacktown City Council" },
  { streetName: "Sixth Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Fourth Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Tenth Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Kelly Street", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Craik Avenue", suburb: "Austral", state: "NSW", postcode: "2179", estate: "Austral Estate", council: "Liverpool City Council" },
  { streetName: "Ingleburn Road", suburb: "Leppington", state: "NSW", postcode: "2179", estate: "Leppington Living", council: "Camden Council" },
  { streetName: "Heath Road", suburb: "Leppington", state: "NSW", postcode: "2179", estate: "Leppington Living", council: "Camden Council" },
  { streetName: "Denham Court Road", suburb: "Denham Court", state: "NSW", postcode: "2565", estate: "Willowdale (Stockland)", council: "Campbelltown City Council" },
  { streetName: "Village Circuit", suburb: "Gregory Hills", state: "NSW", postcode: "2557", estate: "Gregory Hills", council: "Camden Council" },
  { streetName: "Rodeo Road", suburb: "Gregory Hills", state: "NSW", postcode: "2557", estate: "Gregory Hills", council: "Camden Council" },
  { streetName: "Menangle Road", suburb: "Menangle Park", state: "NSW", postcode: "2563", estate: "Menangle Park", council: "Campbelltown City Council" },
  { streetName: "Cummins Road", suburb: "Menangle Park", state: "NSW", postcode: "2563", estate: "Menangle Park", council: "Campbelltown City Council" },
  { streetName: "Brushgrove Circuit", suburb: "Calderwood", state: "NSW", postcode: "2527", estate: "Calderwood Valley", council: "Shellharbour City Council" },
  { streetName: "Young Road", suburb: "Narangba", state: "QLD", postcode: "4504", council: "City of Moreton Bay" },
  { streetName: "Mumford Road", suburb: "Narangba", state: "QLD", postcode: "4504", council: "City of Moreton Bay" },
  { streetName: "Oakey Flat Road", suburb: "Morayfield", state: "QLD", postcode: "4506", council: "City of Moreton Bay" },
  { streetName: "Barrams Road", suburb: "South Ripley", state: "QLD", postcode: "4306", estate: "Providence", council: "Ipswich City Council" },
  { streetName: "Teviot Road", suburb: "Greenbank", state: "QLD", postcode: "4124", council: "Logan City Council" },
  { streetName: "Pub Lane", suburb: "Greenbank", state: "QLD", postcode: "4124", council: "Logan City Council" },
  { streetName: "Pebble Creek Way", suburb: "South Maclean", state: "QLD", postcode: "4280", estate: "Pebble Creek", council: "Logan City Council" },
  { streetName: "Chambers Flat Road", suburb: "Park Ridge", state: "QLD", postcode: "4125", council: "Logan City Council" },
  { streetName: "Clarke Road", suburb: "Park Ridge", state: "QLD", postcode: "4125", council: "Logan City Council" },
  { streetName: "Foxwell Road", suburb: "Coomera", state: "QLD", postcode: "4209", council: "City of Gold Coast" },
  { streetName: "Nirimba Drive", suburb: "Nirimba", state: "QLD", postcode: "4551", estate: "Aura (Stockland)", council: "Sunshine Coast Council" },
  { streetName: "Bourke Street", suburb: "Sydney", state: "NSW", postcode: "2000", council: "City of Sydney" },
  { streetName: "Botany Road", suburb: "Alexandria", state: "NSW", postcode: "2015", council: "City of Sydney" },
  { streetName: "Salisbury Road", suburb: "Camperdown", state: "NSW", postcode: "2050", council: "City of Sydney" },
];

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof (AbortSignal as any).any === "function") {
    return (AbortSignal as any).any(signals);
  }
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * Synchronous, zero-latency local search across masterplanned estate streets,
 * Australia Post suburbs dataset, synthetic parsed addresses, and known estates.
 * Renders instant (<1ms) suggestions on every keystroke without waiting on remote network calls.
 */
export function searchLocalInstantAddresses(
  query: string,
  options?: { limit?: number; state?: string }
): AddressSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const limit = options?.limit || 10;
  const stateFilter = options?.state ? normalizeState(options.state) : "";

  // Detect Lot Number
  const lotMatch = trimmed.match(/\blot\s*([0-9A-Za-z]+)\b/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

  // Extract street number if typed (e.g. "24 ", "42 ", "108 ")
  let cleanWorking = trimmed.replace(/\blot\s*[0-9A-Za-z]+,?\s*/gi, "").trim();
  const streetNumMatch = cleanWorking.match(/^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+/);
  const streetNum = streetNumMatch ? streetNumMatch[1] : "";
  const streetFrag = (streetNum && streetNumMatch ? cleanWorking.slice(streetNumMatch[0].length) : cleanWorking)
    .replace(/^lot\b\s*/i, "")
    .trim();

  const suggestions: AddressSuggestion[] = [];
  const seenKeys = new Set<string>();

  const addSuggestion = (s: AddressSuggestion, prepend = false) => {
    const enriched = enrichAndVerifySuggestion(s, trimmed, stateFilter);
    const key = `${(enriched.fullStreet || enriched.streetName || "").toLowerCase()}_${enriched.suburb.toLowerCase()}_${enriched.postcode}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      if (prepend) {
        suggestions.unshift(enriched);
      } else {
        suggestions.push(enriched);
      }
    }
  };

  // 1. Synthetic suggestion if the user input contains street/lot + known suburb
  const synthetic = synthesizeAddressFromQuery(trimmed, stateFilter);
  if (synthetic) {
    addSuggestion(synthetic, true);
  }

  // 2. Check Masterplanned Estate Streets matching the street fragment
  if (streetFrag.length >= 2) {
    const qLower = streetFrag.toLowerCase();
    const matchedList: { st: MasterplannedStreet; rank: number }[] = [];

    for (const st of MASTERPLANNED_STREETS) {
      if (stateFilter && st.state.toUpperCase() !== stateFilter.toUpperCase()) {
        continue;
      }
      const stNameLower = st.streetName.toLowerCase();
      const words = stNameLower.split(/\s+/);
      if (stNameLower.startsWith(qLower)) {
        matchedList.push({ st, rank: 1 });
      } else if (words.some((w) => w.startsWith(qLower))) {
        matchedList.push({ st, rank: 2 });
      } else if (stNameLower.includes(qLower)) {
        matchedList.push({ st, rank: 3 });
      }
    }

    matchedList.sort((a, b) => a.rank - b.rank);

    for (const { st } of matchedList) {
      const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
      const fullStreet = streetNum ? `${streetNum} ${st.streetName}` : st.streetName;
      const formatted = `${lotPrefix}${fullStreet}, ${st.suburb} ${st.state} ${st.postcode}`;
      addSuggestion({
        id: `mp_${st.suburb.toLowerCase()}_${st.streetName.replace(/\s+/g, '_').toLowerCase()}`,
        formattedAddress: formatted,
        lotNumber: detectedLot || undefined,
        streetNumber: streetNum || undefined,
        streetName: st.streetName,
        fullStreet: fullStreet,
        suburb: st.suburb,
        state: st.state,
        postcode: st.postcode,
        estate: st.estate,
        council: st.council,
      });
    }
  }

  // 3. Direct suburb match if the query looks like a suburb/estate lookup
  const suburbMatches = searchAustralianSuburbs(trimmed, 6, stateFilter);
  for (const sub of suburbMatches) {
    const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
    const est = matchEstate(sub.suburb, "", trimmed);
    const itemState = sub.state;
    const postcode = sub.postcode;
    const suburb = sub.suburb;
    const council = sub.council || detectCouncilForSuburb(suburb, itemState, postcode);

    addSuggestion({
      id: `sub_${suburb.toLowerCase()}_${postcode}`,
      formattedAddress: `${lotPrefix}${suburb} ${itemState} ${postcode}`,
      lotNumber: detectedLot || undefined,
      suburb,
      state: itemState,
      postcode,
      council,
      estate: est || undefined,
    });
  }

  // 4. Match known estates if query contains estate keyword
  const queryLower = trimmed.toLowerCase();
  for (const est of KNOWN_ESTATES) {
    if (stateFilter && est.state.toUpperCase() !== stateFilter.toUpperCase()) continue;
    if (est.keywords.some((k) => queryLower.includes(k) || k.includes(queryLower))) {
      const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
      addSuggestion({
        id: `est_${est.name.toLowerCase()}`,
        formattedAddress: `${lotPrefix}${est.name}, ${est.suburb} ${est.state} ${est.postcode}`,
        lotNumber: detectedLot || undefined,
        streetName: est.name,
        fullStreet: est.name,
        suburb: est.suburb,
        state: est.state,
        postcode: est.postcode,
        council: est.council,
        estate: est.name,
      });
    }
  }

  return suggestions.slice(0, limit);
}

/**
 * Searches Australian addresses using instant local datasets plus fast debounced
 * serverless geocoder and Nominatim fallback with cancellation support.
 */
export async function searchAustralianAddresses(
  query: string,
  options?: { limit?: number; state?: string; signal?: AbortSignal }
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const limit = options?.limit || 10;
  const stateFilter = options?.state ? normalizeState(options.state) : "";
  const cacheKey = `${trimmed.toLowerCase()}_${limit}_${stateFilter}`;

  if (IN_MEMORY_CACHE.has(cacheKey)) {
    return IN_MEMORY_CACHE.get(cacheKey)!;
  }

  // 1. Get instant local results immediately
  const localResults = searchLocalInstantAddresses(trimmed, { limit, state: stateFilter });
  const suggestions: AddressSuggestion[] = [...localResults];
  const seenKeys = new Set<string>(
    suggestions.map((s) => `${(s.fullStreet || s.streetName || "").toLowerCase()}_${s.suburb.toLowerCase()}_${s.postcode}`)
  );

  const lotMatch = trimmed.match(/\blot\s*([0-9A-Za-z]+)\b/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

  const addSuggestion = (s: AddressSuggestion, prepend = false) => {
    const enriched = enrichAndVerifySuggestion(s, trimmed, stateFilter);
    const key = `${(enriched.fullStreet || enriched.streetName || "").toLowerCase()}_${enriched.suburb.toLowerCase()}_${enriched.postcode}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      if (prepend) {
        suggestions.unshift(enriched);
      } else {
        suggestions.push(enriched);
      }
    }
  };

  if (options?.signal?.aborted) {
    return suggestions.slice(0, limit);
  }

  // 2. Try serverless / Vercel API endpoint with fast 700ms timeout
  if (suggestions.length < 5) {
    try {
      const url = `/api/address-autocomplete?q=${encodeURIComponent(trimmed)}&limit=${limit}${stateFilter ? `&state=${encodeURIComponent(stateFilter)}` : ""}`;
      const timeoutSignal = AbortSignal.timeout(700);
      const combinedSignal = options?.signal
        ? anySignal([options.signal, timeoutSignal])
        : timeoutSignal;

      const res = await fetch(url, { signal: combinedSignal });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          for (const item of data.suggestions) {
            addSuggestion(item);
          }
        }
      }
    } catch {
      // API endpoint skipped or unavailable, proceed to client fallback
    }
  }

  if (options?.signal?.aborted) {
    return suggestions.slice(0, limit);
  }

  // 3. Client-side Direct OpenStreetMap Nominatim Fallback with fast 850ms timeout
  if (suggestions.length < 5) {
    try {
      let cleanQuery = trimmed
        .replace(/lot\s*[0-9A-Za-z]+,?\s*/gi, "")
        .replace(/#\s*[0-9A-Za-z]+,?\s*/gi, "")
        .trim();
      if (!cleanQuery) cleanQuery = trimmed;

      const searchAddress = /australia/i.test(cleanQuery) ? cleanQuery : `${cleanQuery}, Australia`;
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&countrycodes=au&addressdetails=1&limit=${limit}`;
      const timeoutSignal = AbortSignal.timeout(850);
      const combinedSignal = options?.signal
        ? anySignal([options.signal, timeoutSignal])
        : timeoutSignal;

      const res = await fetch(nomUrl, {
        headers: { "Accept": "application/json" },
        signal: combinedSignal,
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            const addr = item.address || {};
            const streetNumFromQuery = trimmed.match(/^(\d+[A-Za-z]?)\b/)?.[1] || "";
            const streetNum = addr.house_number || streetNumFromQuery;
            const road = addr.road || "";
            const fullStreet = streetNum && road ? `${streetNum} ${road}` : (road || item.name || "");
            
            // Extract raw suburb candidate, ignoring generic cities
            let rawSub = addr.suburb || addr.city_district || addr.neighbourhood || addr.town || addr.village || addr.locality || "";
            if (!rawSub && addr.city && !METRO_AREAS.has(addr.city.toLowerCase())) {
              rawSub = addr.city;
            }

            const postcode = addr.postcode || "";
            const itemState = normalizeState(addr.state, postcode);

            if (stateFilter && itemState.toUpperCase() !== stateFilter.toUpperCase()) {
              continue;
            }

            const council = addr.county || "";
            const estate = matchEstate(rawSub, fullStreet, trimmed);
            const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
            const formattedAddress = `${lotPrefix}${fullStreet ? `${fullStreet}, ` : ""}${rawSub} ${itemState} ${postcode}`.trim();

            addSuggestion({
              id: `cli_${item.place_id}`,
              formattedAddress,
              lotNumber: detectedLot || undefined,
              streetNumber: streetNum || undefined,
              streetName: road || fullStreet,
              fullStreet: fullStreet || undefined,
              suburb: rawSub,
              state: itemState,
              postcode,
              council: council || undefined,
              estate: estate || undefined,
              lat: item.lat ? parseFloat(item.lat) : undefined,
              lon: item.lon ? parseFloat(item.lon) : undefined,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const finalResults = suggestions.slice(0, limit);
  setCache(cacheKey, finalResults);
  return finalResults;
}

function setCache(key: string, data: AddressSuggestion[]) {
  if (IN_MEMORY_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = IN_MEMORY_CACHE.keys().next().value;
    if (firstKey) IN_MEMORY_CACHE.delete(firstKey);
  }
  IN_MEMORY_CACHE.set(key, data);
}
