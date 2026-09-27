/**
 * Vercel Serverless Function: Australian Address Autocomplete & Geocoding
 * Endpoint: GET /api/address-autocomplete?q=...&limit=10&state=...
 */

const KNOWN_ESTATES = [
  { name: "Flagstone Estate (Peet)", suburb: "Flagstone", council: "Logan City Council", state: "QLD", postcode: "4280", keywords: ["flagstone", "peet"] },
  { name: "Yarrabilba (Lendlease)", suburb: "Yarrabilba", council: "Logan City Council", state: "QLD", postcode: "4207", keywords: ["yarrabilba", "lendlease"] },
  { name: "Covella (AVID)", suburb: "Greenbank", council: "Logan City Council", state: "QLD", postcode: "4124", keywords: ["covella", "greenbank"] },
  { name: "Everleigh (Mirvac)", suburb: "Greenbank", council: "Logan City Council", state: "QLD", postcode: "4124", keywords: ["everleigh"] },
  { name: "Springfield Rise (Lendlease)", suburb: "Spring Mountain", council: "Ipswich City Council", state: "QLD", postcode: "4300", keywords: ["springfield", "spring mountain"] },
  { name: "South Ripley / Providence", suburb: "South Ripley", council: "Ipswich City Council", state: "QLD", postcode: "4306", keywords: ["ripley", "providence"] },
  { name: "Harmony (AVID)", suburb: "Palmview", council: "Sunshine Coast Council", state: "QLD", postcode: "4553", keywords: ["harmony", "palmview"] },
  { name: "Pelican Waters", suburb: "Pelican Waters", council: "Sunshine Coast Council", state: "QLD", postcode: "4551", keywords: ["pelican waters"] },
  { name: "Aura (Stockland)", suburb: "Baringa", council: "Sunshine Coast Council", state: "QLD", postcode: "4551", keywords: ["aura", "baringa"] },
  { name: "North Harbour", suburb: "Burpengary East", council: "City of Moreton Bay", state: "QLD", postcode: "4505", keywords: ["north harbour", "burpengary"] },
  { name: "Capestone", suburb: "Mango Hill", council: "City of Moreton Bay", state: "QLD", postcode: "4509", keywords: ["capestone", "mango hill"] },
  { name: "Gainsborough Greens", suburb: "Pimpama", council: "City of Gold Coast", state: "QLD", postcode: "4209", keywords: ["gainsborough", "pimpama"] },
  { name: "The Gables", suburb: "Box Hill", council: "The Hills Shire", state: "NSW", postcode: "2765", keywords: ["gables", "box hill"] },
  { name: "Elara (Stockland)", suburb: "Marsden Park", council: "Blacktown City Council", state: "NSW", postcode: "2765", keywords: ["elara", "marsden park"] },
  { name: "Oran Park Town", suburb: "Oran Park", council: "Camden Council", state: "NSW", postcode: "2570", keywords: ["oran park"] },
  { name: "Austral Estate", suburb: "Austral", council: "Liverpool City Council", state: "NSW", postcode: "2179", keywords: ["austral"] },
  { name: "Leppington Living", suburb: "Leppington", council: "Camden Council", state: "NSW", postcode: "2179", keywords: ["leppington"] },
  { name: "Calderwood Valley", suburb: "Calderwood", council: "Shellharbour City Council", state: "NSW", postcode: "2527", keywords: ["calderwood"] },
];

const COMMON_GROWTH_SUBURBS = {
  "flagstone": { suburb: "Flagstone", postcode: "4280", state: "QLD", council: "Logan City Council" },
  "greenbank": { suburb: "Greenbank", postcode: "4124", state: "QLD", council: "Logan City Council" },
  "yarrabilba": { suburb: "Yarrabilba", postcode: "4207", state: "QLD", council: "Logan City Council" },
  "jimboomba": { suburb: "Jimboomba", postcode: "4280", state: "QLD", council: "Logan City Council" },
  "park ridge": { suburb: "Park Ridge", postcode: "4125", state: "QLD", council: "Logan City Council" },
  "spring mountain": { suburb: "Spring Mountain", postcode: "4300", state: "QLD", council: "Ipswich City Council" },
  "springfield": { suburb: "Springfield", postcode: "4300", state: "QLD", council: "Ipswich City Council" },
  "springfield lakes": { suburb: "Springfield Lakes", postcode: "4300", state: "QLD", council: "Ipswich City Council" },
  "south ripley": { suburb: "South Ripley", postcode: "4306", state: "QLD", council: "Ipswich City Council" },
  "ripley": { suburb: "Ripley", postcode: "4306", state: "QLD", council: "Ipswich City Council" },
  "redbank plains": { suburb: "Redbank Plains", postcode: "4301", state: "QLD", council: "Ipswich City Council" },
  "palmview": { suburb: "Palmview", postcode: "4553", state: "QLD", council: "Sunshine Coast Council" },
  "pelican waters": { suburb: "Pelican Waters", postcode: "4551", state: "QLD", council: "Sunshine Coast Council" },
  "baringa": { suburb: "Baringa", postcode: "4551", state: "QLD", council: "Sunshine Coast Council" },
  "pimpama": { suburb: "Pimpama", postcode: "4209", state: "QLD", council: "City of Gold Coast" },
  "coomera": { suburb: "Coomera", postcode: "4209", state: "QLD", council: "City of Gold Coast" },
  "upper coomera": { suburb: "Upper Coomera", postcode: "4209", state: "QLD", council: "City of Gold Coast" },
  "burpengary": { suburb: "Burpengary", postcode: "4505", state: "QLD", council: "City of Moreton Bay" },
  "burpengary east": { suburb: "Burpengary East", postcode: "4505", state: "QLD", council: "City of Moreton Bay" },
  "mango hill": { suburb: "Mango Hill", postcode: "4509", state: "QLD", council: "City of Moreton Bay" },
  "marsden park": { suburb: "Marsden Park", postcode: "2765", state: "NSW", council: "Blacktown City Council" },
  "box hill": { suburb: "Box Hill", postcode: "2765", state: "NSW", council: "The Hills Shire" },
  "schofields": { suburb: "Schofields", postcode: "2762", state: "NSW", council: "Blacktown City Council" },
  "oran park": { suburb: "Oran Park", postcode: "2570", state: "NSW", council: "Camden Council" },
  "leppington": { suburb: "Leppington", postcode: "2179", state: "NSW", council: "Camden Council" },
  "austral": { suburb: "Austral", postcode: "2179", state: "NSW", council: "Liverpool City Council" },
  "parramatta": { suburb: "Parramatta", postcode: "2150", state: "NSW", council: "City of Parramatta" },
  "gregory hills": { suburb: "Gregory Hills", postcode: "2557", state: "NSW", council: "Camden Council" },
  "menangle park": { suburb: "Menangle Park", postcode: "2563", state: "NSW", council: "Campbelltown City Council" },
  "wilton": { suburb: "Wilton", postcode: "2571", state: "NSW", council: "Wollondilly Shire Council" },
  "calderwood": { suburb: "Calderwood", postcode: "2527", state: "NSW", council: "Shellharbour City Council" },
};

const METRO_AREAS = new Set(["sydney", "greater sydney", "brisbane", "greater brisbane", "melbourne", "australia"]);

function normalizeState(rawState, postcode) {
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

function matchEstate(suburb, street, query) {
  const text = `${query || ""} ${street || ""} ${suburb || ""}`.toLowerCase();
  for (const est of KNOWN_ESTATES) {
    if (est.keywords.some((k) => text.includes(k))) {
      return est.name;
    }
  }
  return "";
}

function resolveKnownGrowthSuburb(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(COMMON_GROWTH_SUBURBS)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(lower)) {
      return val;
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { q = "", limit = "10", state = "" } = req.query || {};
  const queryStr = String(q).trim();

  if (!queryStr || queryStr.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  // 1. Detect and extract Lot Number
  const lotMatch = queryStr.match(/\blot\s*([0-9A-Za-z]+)\b/i);
  const detectedLot = lotMatch ? lotMatch[1] : "";

  // Clean query for geocoder
  let cleanQuery = queryStr
    .replace(/\blot\s*[0-9A-Za-z]+,?\s*/gi, "")
    .replace(/#\s*[0-9A-Za-z]+,?\s*/gi, "")
    .trim();
  if (!cleanQuery) cleanQuery = queryStr;

  // Append Australia if not present
  const searchAddress = /australia/i.test(cleanQuery) ? cleanQuery : `${cleanQuery}, Australia`;

  const maxResults = Math.min(15, Math.max(1, parseInt(limit, 10) || 10));
  const suggestions = [];
  const seenKeys = new Set();

  try {
    // 2. Fetch from OpenStreetMap Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&countrycodes=au&addressdetails=1&limit=${maxResults}`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "HudsonHomesAddressAutocomplete/1.0",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (nomRes.ok) {
      const items = await nomRes.json();
      if (Array.isArray(items)) {
        for (const item of items) {
          const addr = item.address || {};
          const streetNumFromQuery = queryStr.match(/^(\d+[A-Za-z]?)\b/)?.[1] || "";
          const streetNum = addr.house_number || streetNumFromQuery;
          const road = addr.road || "";
          const fullStreet = streetNum && road ? `${streetNum} ${road}` : (road || item.name || "");
          
          let suburb = addr.suburb || addr.city_district || addr.neighbourhood || addr.town || addr.village || addr.locality || "";
          let postcode = addr.postcode || "";
          let itemState = normalizeState(addr.state, postcode);

          // If suburb is empty or generic metro, attempt growth suburb extraction
          if (!suburb || METRO_AREAS.has(suburb.toLowerCase())) {
            const growthMatch = resolveKnownGrowthSuburb(queryStr) || resolveKnownGrowthSuburb(item.display_name);
            if (growthMatch) {
              suburb = growthMatch.suburb;
              itemState = growthMatch.state;
              if (!postcode) postcode = growthMatch.postcode;
            } else if (addr.city && !METRO_AREAS.has(addr.city.toLowerCase())) {
              suburb = addr.city;
            }
          }

          // If postcode still empty, check growth match
          if (!postcode && suburb) {
            const growthMatch = resolveKnownGrowthSuburb(suburb);
            if (growthMatch) {
              postcode = growthMatch.postcode;
              itemState = growthMatch.state;
            }
          }

          // Skip if state filter was supplied and doesn't match
          if (state && itemState.toUpperCase() !== state.toUpperCase()) {
            continue;
          }

          const growthRec = resolveKnownGrowthSuburb(suburb);
          const council = growthRec?.council || addr.county || "";
          const estate = matchEstate(suburb, fullStreet, queryStr);
          const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
          const formattedAddress = `${lotPrefix}${fullStreet ? `${fullStreet}, ` : ""}${suburb ? `${suburb} ` : ""}${itemState} ${postcode}`.trim();

          const key = `${fullStreet.toLowerCase()}_${suburb.toLowerCase()}_${postcode}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            suggestions.push({
              id: `nom_${item.place_id}`,
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
      }
    }
  } catch (err) {
    console.warn("Nominatim autocomplete error:", err.message);
  }

  // 3. Fallback: If fewer than 3 results, query Photon
  if (suggestions.length < 3) {
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=10&lang=en`;
      const pRes = await fetch(photonUrl, { signal: AbortSignal.timeout(3000) });
      if (pRes.ok) {
        const pData = await pRes.json();
        const features = pData.features || [];
        for (const feat of features) {
          const props = feat.properties || {};
          if (props.countrycode && props.countrycode.toUpperCase() !== "AU") continue;
          
          const streetNumFromQuery = queryStr.match(/^(\d+[A-Za-z]?)\b/)?.[1] || "";
          const streetNum = props.housenumber || streetNumFromQuery;
          const road = props.street || "";
          const fullStreet = streetNum && road ? `${streetNum} ${road}` : (road || props.name || "");
          let suburb = props.district || props.locality || "";
          let postcode = props.postcode || "";
          let itemState = normalizeState(props.state, postcode);

          if (!suburb || METRO_AREAS.has(suburb.toLowerCase())) {
            const growthMatch = resolveKnownGrowthSuburb(queryStr) || resolveKnownGrowthSuburb(props.name);
            if (growthMatch) {
              suburb = growthMatch.suburb;
              itemState = growthMatch.state;
              if (!postcode) postcode = growthMatch.postcode;
            } else if (props.city && !METRO_AREAS.has(props.city.toLowerCase())) {
              suburb = props.city;
            }
          }

          if (state && itemState.toUpperCase() !== state.toUpperCase()) continue;

          const growthRec = resolveKnownGrowthSuburb(suburb);
          const council = growthRec?.council || "";
          const estate = matchEstate(suburb, fullStreet, queryStr);
          const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
          const formattedAddress = `${lotPrefix}${fullStreet ? `${fullStreet}, ` : ""}${suburb ? `${suburb} ` : ""}${itemState} ${postcode}`.trim();

          const key = `${fullStreet.toLowerCase()}_${suburb.toLowerCase()}_${postcode}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            suggestions.push({
              id: `pho_${props.osm_id || Math.random().toString(36).slice(2, 7)}`,
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
              lat: feat.geometry?.coordinates?.[1],
              lon: feat.geometry?.coordinates?.[0],
            });
          }
        }
      }
    } catch (err) {
      console.warn("Photon autocomplete fallback error:", err.message);
    }
  }

  // 4. Enrich with matching known estates if query matches an estate name directly
  const queryLower = queryStr.toLowerCase();
  for (const est of KNOWN_ESTATES) {
    if (est.keywords.some((k) => queryLower.includes(k) || k.includes(queryLower))) {
      const key = `estate_${est.name.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const lotPrefix = detectedLot ? `Lot ${detectedLot}, ` : "";
        suggestions.unshift({
          id: `estate_${est.suburb.toLowerCase()}`,
          formattedAddress: `${lotPrefix}${est.name}, ${est.suburb} ${est.state} ${est.postcode}`,
          lotNumber: detectedLot || undefined,
          streetNumber: undefined,
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
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({
    suggestions: suggestions.slice(0, maxResults),
  });
}
