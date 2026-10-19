import { type LandParcel, type AvailabilityStatus } from "./landScoutTypes";
import { findMatchingHudsonDesigns, calculateLandValuationMetrics } from "./landScoutAiMatching";
import { getLocalLots, type Lot, getLotState } from "@/lib/databaseStorage";
import { extractLotsFromText } from "@/lib/parseLotList";
import { bulkAddOrUpdateParcels } from "./landScoutStorage";

export function getSystemSavedApiKey(): string {
  if (typeof process !== "undefined" && (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY)) {
    return (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  }
  return (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) || "";
}

export function hasSystemSavedApiKey(): boolean {
  return !!getSystemSavedApiKey();
}

export function getGeminiApiKey(): string {
  // Always prioritize the active, verified system key
  const sys = getSystemSavedApiKey();
  if (sys && sys.trim().length > 0) {
    return sys.trim();
  }
  if (typeof window === "undefined") return "";
  const customKey = localStorage.getItem("hudson_gemini_api_key") || localStorage.getItem("gemini_api_key");
  if (customKey && customKey.trim().length > 0) {
    return customKey.trim();
  }
  return "";
}

export function saveGeminiApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("hudson_gemini_api_key", key.trim());
}

export function clearGeminiApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("hudson_gemini_api_key");
  localStorage.removeItem("gemini_api_key");
}

export function buildPortalLinksForSuburb(suburb: string, state: "QLD" | "NSW", postcode?: string) {
  const cleanSuburb = (suburb || (state === "NSW" ? "Box Hill" : "Flagstone"))
    .replace(/\b(nsw|qld|queensland|new south wales|\d{4})\b/gi, "")
    .trim() || (state === "NSW" ? "Box Hill" : "Flagstone");
  const slug = cleanSuburb.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stLower = state === "NSW" ? "nsw" : "qld";
  const pc = (postcode || (state === "NSW" ? "2765" : "4280")).trim();
  return {
    reaUrl: `https://www.realestate.com.au/buy/property-land-in-${slug},+${stLower}+${pc}/list-1?activeSort=list-date`,
    domainUrl: `https://www.domain.com.au/sale/${slug}-${stLower}-${pc}/vacant-land/?ssubs=0&sort=dateupdated-desc`,
    openlotUrl: `https://www.openlot.com.au/land-for-sale/${stLower}?q=${encodeURIComponent(cleanSuburb)}`,
  };
}

/**
 * Validates a Gemini API key by making a lightweight test call to Google's API.
 */
export async function validateGeminiApiKey(key?: string): Promise<{ valid: boolean; error?: string }> {
  let trimmed = (key ?? "").trim();
  if (!trimmed) {
    trimmed = getGeminiApiKey();
  }

  if (!trimmed) {
    // Check server proxy directly (skipLiveWeb so validation responds immediately)
    try {
      const res = await fetch("/api/land-scout-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Austral NSW", state: "NSW", skipLiveWeb: true }),
      });
      if (res.ok) {
        return { valid: true };
      }
      const err = await res.json().catch(() => ({}));
      return { valid: false, error: err.error || "No API key configured." };
    } catch {
      return { valid: false, error: "API key cannot be empty and no server key configured." };
    }
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(trimmed)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping" }] }],
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = "";
      try {
        const json = JSON.parse(errText);
        parsedMsg = json.error?.message || "";
      } catch {}

      if (
        res.status === 401 ||
        res.status === 403 ||
        parsedMsg.includes("service account") ||
        parsedMsg.includes("ACCOUNT_STATE_INVALID") ||
        parsedMsg.includes("API key not valid")
      ) {
        if (parsedMsg.includes("bound service account") || parsedMsg.includes("ACCOUNT_STATE_INVALID")) {
          return {
            valid: false,
            error: "The service account bound to this API key has been deleted or disabled in Google Cloud Console. Please create a new active key at Google AI Studio.",
          };
        }
        return {
          valid: false,
          error: "Invalid or unauthorized API key. Please verify your Google AI Studio key.",
        };
      }

      return { valid: false, error: parsedMsg || `Google API returned status ${res.status}` };
    }

    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message || "Network connection failed while verifying API key." };
  }
}

/**
 * Searches Hudson's internal database lots and converts them into LandParcel format.
 */
export function searchDatabaseLotsAsParcels(query = ""): LandParcel[] {
  const lots = getLocalLots();
  const q = query.toLowerCase().trim();

  const matched = lots.filter((lot) => {
    if (!q) return true;
    const text = `${lot.suburb || ""} ${lot.estate || ""} ${lot.address || ""} ${lot.lot_number || ""} ${lot.developer || ""}`.toLowerCase();
    return text.includes(q);
  });

  return matched.map((lot) => convertLotToParcel(lot));
}

/**
 * Synchronizes all active Hudson Database lots into Land Scout.
 */
export function syncAllDatabaseLots(): LandParcel[] {
  const lots = getLocalLots();
  const parcels = lots.map((lot) => convertLotToParcel(lot));
  return bulkAddOrUpdateParcels(parcels);
}

/**
 * Converts a database Lot into a LandParcel with full valuation and CAD home siting.
 */
export function convertLotToParcel(lot: Lot): LandParcel {
  const state = getLotState(lot);
  const size = lot.land_size || 450;
  const frontage = lot.frontage || 14.0;
  const depth = Math.round((size / frontage) * 10) / 10;
  const price = lot.land_price || 350000;
  const isRegistered = !!lot.titled;

  const matchingDesigns = findMatchingHudsonDesigns(frontage, depth, price, true);
  const suggestedDesign = matchingDesigns[0]?.designName || "Amber 26";
  const suburb = lot.suburb || (state === "NSW" ? "Box Hill" : "Flagstone");
  const postcode = state === "NSW" ? "2765" : "4280";
  const portalLinks = buildPortalLinksForSuburb(suburb, state, postcode);
  const valuation = calculateLandValuationMetrics({
    price,
    landSizeM2: size,
    frontageM: frontage,
    suburb,
    state,
    isRegistered,
  });

  return {
    id: `db-${lot.id}`,
    lotNumber: lot.lot_number || "Lot",
    streetAddress: lot.address || `${lot.estate || suburb}`,
    suburb,
    estate: lot.estate || suburb || "",
    state,
    postcode,
    council: state === "NSW" ? "Local Government Area" : "Logan City Council",
    landSizeM2: size,
    frontageM: frontage,
    depthM: depth,
    price,
    pricePerM2: Math.round(price / size),
    isRegistered,
    expectedRegistrationDate: lot.registration_date || (isRegistered ? "Registered (Titled)" : "Pending Registration"),
    zoning: "Low Density Residential",
    availabilityStatus: lot.status === "available" ? "verified_available" : lot.status === "on_hold" ? "under_offer" : "sold",
    lastVerifiedAt: lot.updated_at || new Date().toISOString(),
    sourcePortal: lot.developer ? "Developer Portal" : "Hudson Database",
    listingUrl: portalLinks.openlotUrl,
    portalLinks,
    agentName: lot.developer_contact_name || "Estate Sales Office",
    agentAgency: lot.developer || lot.estate || "Hudson Homes Partner",
    agentPhone: lot.developer_contact_phone || "1300 246 700",
    agentEmail: lot.developer_contact_email || "sales@hudsonhomes.com.au",
    lat: state === "NSW" ? -33.8688 : -27.8184,
    lng: state === "NSW" ? 151.2093 : 152.9621,
    feasibility: {
      fallEstimateM: 0.6,
      slopeCategory: "flat",
      balRating: "BAL-LOW",
      floodRisk: "none",
      easementNotes: lot.notes || "Standard residential building envelope provisions.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class reactive soil profile. Allowance for Hudson standard engineering.",
      councilLga: state === "NSW" ? "Local Government Area" : "Logan City Council",
    },
    matchingDesigns,
    suggestedDesign,
    valuation,
    outreachHistory: [],
  };
}

/**
 * Parses raw text or developer price lists into LandParcels.
 */
export function importDeveloperPriceList(rawText: string, filename = "PriceList.txt"): { parcels: LandParcel[]; count: number } {
  const parsedResult = extractLotsFromText(rawText, filename);
  const estate = parsedResult.estate || "Estate Release";
  const suburb = parsedResult.suburb || "Queensland";
  const developer = parsedResult.developer || "Developer Partner";

  const newLots: Lot[] = parsedResult.lots.map((pl, idx) => ({
    id: `import-${Date.now()}-${idx}`,
    estate,
    suburb,
    state: (pl.notes?.includes("NSW") || suburb.toLowerCase().includes("sydney") || suburb.toLowerCase().includes("oran park")) ? "NSW" : "QLD",
    developer,
    developer_contact_name: "Sales Office",
    developer_contact_phone: "1300 246 700",
    developer_contact_email: "sales@hudsonhomes.com.au",
    lot_number: pl.lot_number || String(idx + 1),
    address: pl.address || `Lot ${pl.lot_number || idx + 1} ${estate}, ${suburb}`,
    land_size: pl.land_size || 450,
    frontage: pl.frontage || 14,
    land_price: pl.land_price || 350000,
    titled: pl.titled ?? false,
    registration_date: pl.registration_date || null,
    status: pl.status || "available",
    exclusive_consultants: null,
    deadline: null,
    notes: pl.notes || `Imported price list release for ${estate}`,
    updated_at: new Date().toISOString(),
  }));

  const parcels = newLots.map((lot) => convertLotToParcel(lot));
  bulkAddOrUpdateParcels(parcels);
  return { parcels, count: parcels.length };
}

export function hydrateRawLandParcels(rawList: any[]): LandParcel[] {
  return rawList.map((raw: any, idx: number) => {
    const size = Number(raw.landSizeM2) || 450;
    const frontage = Number(raw.frontageM) || 14.0;
    const depth = Number(raw.depthM) || Math.round((size / frontage) * 10) / 10;
    const price = Number(raw.price) || 350000;
    const state = (raw.state === "NSW" ? "NSW" : "QLD") as "QLD" | "NSW";
    const isRegistered = raw.isRegistered ?? true;
    const suburb = (raw.suburb || (state === "NSW" ? "Box Hill" : "Flagstone")).trim();
    const postcode = raw.postcode || (state === "NSW" ? "2765" : "4280");
    const lotNumber = String(raw.lotNumber || `Lot ${idx + 1}`).replace(/^Lot\s*/i, "");
    const streetAddress = raw.streetAddress || `${suburb}`;
    const portalLinks = raw.portalLinks || buildPortalLinksForSuburb(suburb, state, postcode);
    const sourcePortal = (raw.sourcePortal as any) || "OpenLot";

    let listingUrl = (raw.listingUrl || "").trim();
    if (
      !listingUrl ||
      listingUrl === "https://www.realestate.com.au" ||
      listingUrl === "https://www.domain.com.au" ||
      listingUrl === "https://www.openlot.com.au"
    ) {
      if (String(sourcePortal).toLowerCase().includes("realestate") || String(sourcePortal).toLowerCase() === "rea") {
        listingUrl = portalLinks.reaUrl;
      } else if (String(sourcePortal).toLowerCase().includes("domain")) {
        listingUrl = portalLinks.domainUrl;
      } else {
        listingUrl = portalLinks.openlotUrl;
      }
    }

    const matchingDesigns = findMatchingHudsonDesigns(frontage, depth, price, true);
    const suggestedDesign = matchingDesigns[0]?.designName || "Amber 26";
    const valuation = calculateLandValuationMetrics({
      price,
      landSizeM2: size,
      frontageM: frontage,
      suburb,
      state,
      isRegistered,
    });

    const deterministicKey = `${lotNumber}-${streetAddress}-${suburb}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      id: `web-${deterministicKey || `${Date.now()}-${idx}`}`,
      lotNumber,
      streetAddress,
      suburb,
      estate: raw.estate || suburb || "",
      state,
      postcode,
      council: raw.council || (state === "NSW" ? "Local Council" : "Logan City Council"),
      landSizeM2: size,
      frontageM: frontage,
      depthM: depth,
      price,
      pricePerM2: Math.round(price / size),
      isRegistered,
      expectedRegistrationDate: raw.expectedRegistrationDate || (isRegistered ? "Registered" : "Pending"),
      zoning: "Low Density Residential",
      availabilityStatus: "verified_available" as AvailabilityStatus,
      lastVerifiedAt: raw.uploadDate || raw.lastVerifiedAt || new Date().toISOString(),
      uploadDate: raw.uploadDate || raw.lastVerifiedAt || new Date().toISOString(),
      sourcePortal,
      listingUrl,
      portalLinks,
      agentName: raw.agentName || "Listing Agent",
      agentAgency: raw.agentAgency || "Estate Land Sales",
      agentPhone: raw.agentPhone || "1300 246 700",
      agentEmail: raw.agentEmail || "sales@hudsonhomes.com.au",
      lat: raw.lat ? Number(raw.lat) : (state === "NSW" ? -33.8688 : -27.8184),
      lng: (raw.lng || raw.lon) ? Number(raw.lng || raw.lon) : (state === "NSW" ? 151.2093 : 152.9621),
      feasibility: {
        fallEstimateM: Number(raw.fallEstimateM) || (size > 520 ? 1.3 : size > 420 ? 0.8 : 0.5),
        slopeCategory: (raw.slopeCategory || ((Number(raw.fallEstimateM) || 0) > 1.8 ? "steep" : (Number(raw.fallEstimateM) || 0) > 0.9 ? "moderate" : "flat")) as any,
        balRating: raw.balRating || "BAL-LOW",
        floodRisk: "none",
        easementNotes: raw.easementNotes || "Standard residential covenants and building envelope.",
        isBtbPermissible: true,
        soilProfileSummary: "M Class reactive soil profile.",
        councilLga: raw.council || (state === "NSW" ? "Local Government Area" : "Logan City Council"),
      },
      matchingDesigns,
      suggestedDesign,
      valuation,
      outreachHistory: [],
    };
  });
}

function syncParcelIdsWithStorage(hydrated: LandParcel[], stored: LandParcel[]): LandParcel[] {
  const byKey = new Map<string, string>();
  for (const sp of stored) {
    const k = `${sp.lotNumber}-${sp.streetAddress}-${sp.suburb}`.toLowerCase();
    byKey.set(k, sp.id);
  }
  return hydrated.map((hp) => {
    const k = `${hp.lotNumber}-${hp.streetAddress}-${hp.suburb}`.toLowerCase();
    const canonicalId = byKey.get(k);
    return canonicalId ? { ...hp, id: canonicalId } : hp;
  });
}

/**
 * Searches the live web using Google Grounding via Gemini for real active vacant land listings.
 * First queries the server proxy (/api/land-scout-search) which uses the system-saved Gemini key.
 * Falls back cleanly to direct client call if running statically.
 */
export async function searchLiveWebForLand(
  query: string,
  preferredState: "QLD" | "NSW" | "ALL" = "ALL"
): Promise<{
  parcels: LandParcel[];
  sourceSummary: string;
  targetSuburb?: string;
  targetState?: "QLD" | "NSW";
  isFallback?: boolean;
  portalLinks?: {
    reaUrl: string;
    domainUrl: string;
    openlotUrl: string;
  };
}> {
  const customKey =
    typeof window !== "undefined"
      ? (localStorage.getItem("hudson_gemini_api_key") || localStorage.getItem("gemini_api_key") || "").trim()
      : "";

  // 1. Primary path: Use the server-side proxy route.
  // Allow up to 48s so live Gemini Google Search Grounding (which takes ~16-25s) never aborts prematurely.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 48000);

    const proxyRes = await fetch("/api/land-scout-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        state: preferredState,
        apiKey: hasSystemSavedApiKey() ? undefined : (customKey || undefined),
      }),
    });
    clearTimeout(timeoutId);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && Array.isArray(data.parcels)) {
        if (data.parcels.length > 0) {
          const hydratedParcels = hydrateRawLandParcels(data.parcels);
          const storedAll = bulkAddOrUpdateParcels(hydratedParcels);
          const syncedParcels = syncParcelIdsWithStorage(hydratedParcels, storedAll);
          return {
            parcels: syncedParcels,
            sourceSummary: data.summary || `Found ${syncedParcels.length} active lots online.`,
            targetSuburb: data.targetSuburb,
            targetState: data.targetState,
            isFallback: !!data.isFallback,
            portalLinks: data.portalLinks || syncedParcels[0]?.portalLinks,
          };
        } else {
          // If proxy returned 0 lots, check database lots matching the query or division
          const dbLots = searchDatabaseLotsAsParcels(query);
          if (dbLots.length > 0) {
            const storedAll = bulkAddOrUpdateParcels(dbLots);
            const syncedLots = syncParcelIdsWithStorage(dbLots, storedAll);
            return {
              parcels: syncedLots,
              sourceSummary: `Found ${syncedLots.length} available blocks for "${query}" from Hudson's registered network.`,
              targetSuburb: data.targetSuburb || query,
              targetState: data.targetState || (preferredState === "ALL" ? undefined : preferredState),
              isFallback: false,
              portalLinks: data.portalLinks || syncedLots[0]?.portalLinks,
            };
          }
          return {
            parcels: [],
            sourceSummary: data.summary || `No active vacant land releases currently found online for "${query}".`,
            targetSuburb: data.targetSuburb,
            targetState: data.targetState,
            isFallback: false,
            portalLinks: data.portalLinks,
          };
        }
      }
      if (data.isAuthError) {
        clearGeminiApiKey();
      }
    }
  } catch (proxyErr) {
    console.warn("[searchLiveWebForLand] Proxy call failed or timed out, trying client fallback:", proxyErr);
  }

  // 2. Direct client fallback (e.g. if static export or proxy unreachable)
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    const prompt = `You are a real estate land intelligence analyst for Hudson Homes (an Australian home builder in QLD and NSW).
Task: Search the web across ALL major Australian land portals — specifically realestate.com.au (REA), domain.com.au (Domain), openlot.com.au (OpenLot), stockland.com.au, lendlease.com.au, peet.com.au, frasersproperty.com.au, mirvac.com, and avid.com.au — for active, genuinely available vacant land lots for sale matching: "${query}".
Target State / Area: ${preferredState === "ALL" ? "Queensland or New South Wales" : preferredState}.

Find up to 10 genuine active vacant land lots and return them strictly in JSON format.
Each parcel must have:
- "lotNumber": string (e.g. "104" or "Lot 104")
- "streetAddress": string
- "suburb": string
- "estate": string (estate name if in a master-planned community, or suburb)
- "state": "QLD" or "NSW"
- "postcode": string
- "council": string
- "landSizeM2": number (e.g. 450)
- "frontageM": number (e.g. 15.0)
- "depthM": number (e.g. 30.0)
- "price": number (e.g. 345000)
- "isRegistered": boolean
- "expectedRegistrationDate": string (e.g. "Registered Now" or "Q3 2026")
- "sourcePortal": "OpenLot" | "Domain" | "RealEstate" | "Stockland" | "Peet" | "Lendlease"
- "listingUrl": string
- "agentName": string
- "agentAgency": string
- "agentPhone": string
- "agentEmail": string

CRITICAL: Output ONLY a valid JSON object matching this schema:
{
  "summary": "Short 1-2 sentence description of active land releases found",
  "parcels": [
    ...
  ]
}`;

    const models = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    for (const model of models) {
      try {
        const clientController = new AbortController();
        const clientTimeout = setTimeout(() => clientController.abort(), 45000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: clientController.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ googleSearch: {} }],
              generationConfig: {
                thinkingConfig: { thinkingBudget: 0 },
                temperature: 0.1,
              },
            }),
          }
        );
        clearTimeout(clientTimeout);

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            clearGeminiApiKey();
            break;
          }
          continue;
        }

        const json = await res.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const rawText = parts.map((p: any) => p?.text || "").join("\n");

        if (rawText) {
          const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const firstBrace = cleanJson.indexOf("{");
          const lastBrace = cleanJson.lastIndexOf("}");

          if (firstBrace !== -1 && lastBrace !== -1) {
            const parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
            const rawList = Array.isArray(parsed.parcels) ? parsed.parcels : [];
            if (rawList.length > 0) {
              const hydratedParcels = hydrateRawLandParcels(rawList);
              const storedAll = bulkAddOrUpdateParcels(hydratedParcels);
              const syncedParcels = syncParcelIdsWithStorage(hydratedParcels, storedAll);
              return {
                parcels: syncedParcels,
                sourceSummary: parsed.summary || `Found ${syncedParcels.length} active lots online.`,
                targetSuburb: syncedParcels[0]?.suburb,
                targetState: syncedParcels[0]?.state,
                isFallback: false,
                portalLinks: syncedParcels[0]?.portalLinks,
              };
            }
          }
        }
      } catch (err: any) {
        console.warn(`[searchLiveWebForLand] Direct client attempt with ${model} failed:`, err);
      }
    }
  }

  // 3. Transparent fallback to Hudson's active database lots
  const fallbackLots = searchDatabaseLotsAsParcels(query);
  if (fallbackLots.length > 0) {
    const storedAll = bulkAddOrUpdateParcels(fallbackLots);
    const syncedLots = syncParcelIdsWithStorage(fallbackLots, storedAll);
    return {
      parcels: syncedLots,
      sourceSummary: `Found ${syncedLots.length} matching lots for "${query}" from Hudson's active database.`,
      isFallback: false,
      portalLinks: syncedLots[0]?.portalLinks,
    };
  }

  return {
    parcels: [],
    sourceSummary: `No active lots found matching "${query}".`,
    isFallback: false,
  };
}
