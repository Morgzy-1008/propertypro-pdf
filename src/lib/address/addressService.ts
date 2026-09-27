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
  if (streetNum) {
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

/**
 * Searches Australian addresses using official suburbs dataset, serverless geocoder,
 * and intelligent synthesis fallback for new estate developments.
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
  const lotMatch = trimmed.match(/\blot\s*([0-9A-Za-z]+)\b/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

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

  // 2. Direct suburb match if the query looks like a suburb/estate lookup
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

  // 3. Try local serverless / Vercel API endpoint
  try {
    const url = `/api/address-autocomplete?q=${encodeURIComponent(trimmed)}&limit=${limit}${stateFilter ? `&state=${encodeURIComponent(stateFilter)}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
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

  // 4. Client-side Direct OpenStreetMap Nominatim Fallback if fewer than 5 results
  if (suggestions.length < 5) {
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

  // 5. Match known estates if query contains estate keyword
  const queryLower = trimmed.toLowerCase();
  for (const est of KNOWN_ESTATES) {
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
