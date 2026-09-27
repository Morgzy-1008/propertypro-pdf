/**
 * Australian Address Autocomplete & Structured Parsing Service
 * Designed for Hudson Homes Quoting Engine, Flyer Studio & Tender Portal.
 */

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
const MAX_CACHE_ENTRIES = 80;

const KNOWN_ESTATES = [
  { name: "Flagstone Estate (Peet)", suburb: "Flagstone", council: "Logan City Council", state: "QLD", postcode: "4280", keywords: ["flagstone", "peet"] },
  { name: "Yarrabilba (Lendlease)", suburb: "Yarrabilba", council: "Logan City Council", state: "QLD", postcode: "4207", keywords: ["yarrabilba", "lendlease"] },
  { name: "Covella (AVID)", suburb: "Greenbank", council: "Logan City Council", state: "QLD", postcode: "4124", keywords: ["covella", "greenbank"] },
  { name: "Everleigh (Mirvac)", suburb: "Greenbank", council: "Logan City Council", state: "QLD", postcode: "4124", keywords: ["everleigh"] },
  { name: "Springfield Rise (Lendlease)", suburb: "Spring Mountain", council: "Ipswich City Council", state: "QLD", postcode: "4300", keywords: ["springfield", "spring mountain"] },
  { name: "South Ripley / Providence", suburb: "South Ripley", council: "Ipswich City Council", state: "QLD", postcode: "4306", keywords: ["ripley", "providence"] },
  { name: "Harmony (AVID)", suburb: "Palmview", council: "Sunshine Coast Council", state: "QLD", postcode: "4553", keywords: ["harmony", "palmview"] },
  { name: "Pelican Waters", suburb: "Pelican Waters", council: "Sunshine Coast Council", state: "QLD", postcode: "4551", keywords: ["pelican waters"] },
  { name: "North Harbour", suburb: "Burpengary East", council: "City of Moreton Bay", state: "QLD", postcode: "4505", keywords: ["north harbour", "burpengary"] },
  { name: "The Gables", suburb: "Box Hill", council: "The Hills Shire", state: "NSW", postcode: "2765", keywords: ["gables", "box hill"] },
  { name: "Elara (Stockland)", suburb: "Marsden Park", council: "Blacktown City Council", state: "NSW", postcode: "2765", keywords: ["elara", "marsden park"] },
  { name: "Oran Park Town", suburb: "Oran Park", council: "Camden Council", state: "NSW", postcode: "2570", keywords: ["oran park"] },
  { name: "Austral Estate", suburb: "Austral", council: "Liverpool City Council", state: "NSW", postcode: "2179", keywords: ["austral"] },
  { name: "Leppington Living", suburb: "Leppington", council: "Camden Council", state: "NSW", postcode: "2179", keywords: ["leppington"] },
];

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
  const s = String(rawState).toLowerCase();
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
 * Searches Australian addresses using the serverless autocomplete API with client-side fallback.
 */
export async function searchAustralianAddresses(
  query: string,
  options?: { limit?: number; state?: string }
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const limit = options?.limit || 10;
  const stateFilter = options?.state || "";
  const cacheKey = `${trimmed.toLowerCase()}_${limit}_${stateFilter}`;

  if (IN_MEMORY_CACHE.has(cacheKey)) {
    return IN_MEMORY_CACHE.get(cacheKey)!;
  }

  // Detect Lot Number
  const lotMatch = trimmed.match(/lot\s*([0-9A-Za-z]+)/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

  // 1. Try local serverless / Vercel API endpoint
  try {
    const url = `/api/address-autocomplete?q=${encodeURIComponent(trimmed)}&limit=${limit}${stateFilter ? `&state=${encodeURIComponent(stateFilter)}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setCache(cacheKey, data.suggestions);
        return data.suggestions;
      }
    }
  } catch {
    // API endpoint skipped or unavailable, proceed to client fallback
  }

  // 2. Client-side Direct OpenStreetMap Nominatim Fallback
  try {
    let cleanQuery = trimmed
      .replace(/lot\s*[0-9A-Za-z]+,?\s*/gi, "")
      .replace(/#\s*[0-9A-Za-z]+,?\s*/gi, "")
      .trim();
    if (!cleanQuery) cleanQuery = trimmed;

    const searchAddress = /australia/i.test(cleanQuery) ? cleanQuery : `${cleanQuery}, Australia`;
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&countrycodes=au&addressdetails=1&limit=${limit}`;
    const res = await fetch(nomUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const suggestions: AddressSuggestion[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const addr = item.address || {};
          const streetNumFromQuery = trimmed.match(/^(\d+[A-Za-z]?)\b/)?.[1] || "";
          const streetNum = addr.house_number || streetNumFromQuery;
          const road = addr.road || "";
          const fullStreet = streetNum && road ? `${streetNum} ${road}` : (road || item.name || "");
          const suburb = addr.suburb || addr.city_district || addr.neighbourhood || addr.town || addr.village || addr.locality || addr.city || "";
          const postcode = addr.postcode || "";
          const itemState = normalizeState(addr.state, postcode);

          if (stateFilter && itemState.toUpperCase() !== stateFilter.toUpperCase()) {
            continue;
          }

          const council = addr.county || addr.city || "";
          const estate = matchEstate(suburb, fullStreet, trimmed);
          const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
          const formattedAddress = `${lotPrefix}${fullStreet ? `${fullStreet}, ` : ""}${suburb} ${itemState} ${postcode}`.trim();

          const key = `${fullStreet.toLowerCase()}_${suburb.toLowerCase()}_${postcode}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              id: `cli_${item.place_id}`,
              formattedAddress,
              lotNumber: detectedLot || undefined,
              streetNumber: streetNum || undefined,
              streetName: road || fullStreet,
              fullStreet: fullStreet || undefined,
              suburb,
              state: itemState,
              postcode,
              council: council || undefined,
              estate: estate || undefined,
              lat: item.lat ? parseFloat(item.lat) : undefined,
              lon: item.lon ? parseFloat(item.lon) : undefined,
            });
          }
        }

        if (suggestions.length > 0) {
          setCache(cacheKey, suggestions);
          return suggestions;
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Fallback: match known estates directly
  const queryLower = trimmed.toLowerCase();
  const estateMatches: AddressSuggestion[] = [];
  for (const est of KNOWN_ESTATES) {
    if (est.keywords.some((k) => queryLower.includes(k) || k.includes(queryLower))) {
      const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
      estateMatches.push({
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

  setCache(cacheKey, estateMatches);
  return estateMatches;
}

function setCache(key: string, data: AddressSuggestion[]) {
  if (IN_MEMORY_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = IN_MEMORY_CACHE.keys().next().value;
    if (firstKey) IN_MEMORY_CACHE.delete(firstKey);
  }
  IN_MEMORY_CACHE.set(key, data);
}
