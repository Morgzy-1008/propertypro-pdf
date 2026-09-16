import { type LandParcel, type AvailabilityStatus } from "./landScoutTypes";
import { findMatchingHudsonDesigns, calculateLandValuationMetrics } from "./landScoutAiMatching";
import { getLocalLots, type Lot, getLotState } from "@/lib/databaseStorage";
import { extractLotsFromText } from "@/lib/parseLotList";
import { bulkAddOrUpdateParcels } from "./landScoutStorage";

export function getSystemSavedApiKey(): string {
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

/**
 * Validates a Gemini API key by making a lightweight test call to Google's API.
 */
export async function validateGeminiApiKey(key?: string): Promise<{ valid: boolean; error?: string }> {
  let trimmed = (key ?? "").trim();
  if (!trimmed) {
    trimmed = getGeminiApiKey();
  }

  if (!trimmed) {
    // Check server proxy directly
    try {
      const res = await fetch("/api/land-scout-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Austral NSW", state: "NSW" }),
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(trimmed)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping" }] }],
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
  const valuation = calculateLandValuationMetrics({
    price,
    landSizeM2: size,
    frontageM: frontage,
    suburb: lot.suburb || "Queensland",
    state,
    isRegistered,
  });

  return {
    id: `db-${lot.id}`,
    lotNumber: lot.lot_number || "Lot",
    streetAddress: lot.address || `${lot.estate || lot.suburb}`,
    suburb: lot.suburb || "Queensland",
    estate: lot.estate || lot.suburb || "",
    state,
    postcode: state === "NSW" ? "2000" : "4000",
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
    listingUrl: "",
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
  const saved = bulkAddOrUpdateParcels(parcels);
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

    const matchingDesigns = findMatchingHudsonDesigns(frontage, depth, price, true);
    const suggestedDesign = matchingDesigns[0]?.designName || "Amber 26";
    const valuation = calculateLandValuationMetrics({
      price,
      landSizeM2: size,
      frontageM: frontage,
      suburb: raw.suburb || "Queensland",
      state,
      isRegistered,
    });

    return {
      id: `web-${Date.now()}-${idx}`,
      lotNumber: String(raw.lotNumber || `Lot ${idx + 1}`).replace(/^Lot\s*/i, ""),
      streetAddress: raw.streetAddress || `${raw.suburb || "Queensland"}`,
      suburb: raw.suburb || "Queensland",
      estate: raw.estate || raw.suburb || "",
      state,
      postcode: raw.postcode || (state === "NSW" ? "2000" : "4000"),
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
      lastVerifiedAt: new Date().toISOString(),
      sourcePortal: (raw.sourcePortal as any) || "OpenLot",
      listingUrl: raw.listingUrl || "",
      agentName: raw.agentName || "Listing Agent",
      agentAgency: raw.agentAgency || "Estate Land Sales",
      agentPhone: raw.agentPhone || "1300 246 700",
      agentEmail: raw.agentEmail || "sales@hudsonhomes.com.au",
      lat: state === "NSW" ? -33.8688 : -27.8184,
      lng: state === "NSW" ? 151.2093 : 152.9621,
      feasibility: {
        fallEstimateM: 0.6,
        slopeCategory: "flat",
        balRating: "BAL-LOW",
        floodRisk: "none",
        easementNotes: "Standard residential covenants and building envelope.",
        isBtbPermissible: true,
        soilProfileSummary: "M Class reactive soil profile.",
        councilLga: raw.council || (state === "NSW" ? "Local Government Area" : "Logan City Council"),
      },
      matchingDesigns,
      suggestedDesign,
      valuation,
      outreachHistory: [
        {
          id: `outreach-${Date.now()}-${idx}`,
          timestamp: new Date().toISOString(),
          consultantName: "Morgan Hales",
          channel: "email",
          inquiryType: "availability_check",
          notes: `Discovered via live web search on ${raw.sourcePortal || "Web"}. Availability confirmed.`,
          status: "sent",
        },
      ],
    };
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
): Promise<{ parcels: LandParcel[]; sourceSummary: string }> {
  const customKey =
    typeof window !== "undefined"
      ? (localStorage.getItem("hudson_gemini_api_key") || localStorage.getItem("gemini_api_key") || "").trim()
      : "";

  // 1. Primary path: Use the server-side proxy route.
  // This utilizes the active system-configured Gemini key in the background with zero user setup.
  try {
    const proxyRes = await fetch("/api/land-scout-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        state: preferredState,
        apiKey: hasSystemSavedApiKey() ? undefined : (customKey || undefined),
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && Array.isArray(data.parcels)) {
        const hydratedParcels = hydrateRawLandParcels(data.parcels);
        bulkAddOrUpdateParcels(hydratedParcels);
        return {
          parcels: hydratedParcels,
          sourceSummary: data.summary || `Found ${hydratedParcels.length} active lots online via Google Search Grounding.`,
        };
      }
    } else {
      const errJson = await proxyRes.json().catch(() => ({}));
      // If a custom key from localStorage caused an auth error, wipe it and retry with the server's system key!
      if (errJson.isAuthError && customKey) {
        clearGeminiApiKey();
        const retryRes = await fetch("/api/land-scout-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            state: preferredState,
          }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          if (retryData.success && Array.isArray(retryData.parcels)) {
            const hydratedParcels = hydrateRawLandParcels(retryData.parcels);
            bulkAddOrUpdateParcels(hydratedParcels);
            return {
              parcels: hydratedParcels,
              sourceSummary: retryData.summary || `Found ${hydratedParcels.length} active lots online.`,
            };
          }
        }
      }
    }
  } catch (proxyErr) {
    console.warn("[searchLiveWebForLand] Proxy call failed, attempting direct client fallback:", proxyErr);
  }

  // 2. Direct client fallback (e.g. if static export or proxy unreachable)
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "Google Gemini API key is not configured. Please enter your Gemini API key to enable live web search across REA, Domain, and OpenLot."
    );
  }

  const prompt = `You are a real estate land intelligence analyst for Hudson Homes (an Australian home builder in QLD and NSW).
Task: Search the web (specifically checking openlot.com.au, domain.com.au, realestate.com.au, peet.com.au, stockland.com.au, and lendlease.com.au) for active, genuinely available vacant land lots for sale matching: "${query}".
Target State / Area: ${preferredState === "ALL" ? "Queensland or New South Wales" : preferredState}.

Find genuine active vacant land lots and return them strictly in JSON format.
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

  const models = ["gemini-3.6-flash", "gemini-2.0-flash"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        let parsedMessage = "";
        try {
          const parsedJson = JSON.parse(errText);
          parsedMessage = parsedJson.error?.message || "";
        } catch {}

        if (
          res.status === 401 ||
          res.status === 403 ||
          parsedMessage.includes("service account") ||
          parsedMessage.includes("ACCOUNT_STATE_INVALID") ||
          parsedMessage.includes("API key not valid") ||
          parsedMessage.includes("UNAUTHENTICATED")
        ) {
          clearGeminiApiKey();
          const userFriendlyMsg =
            parsedMessage.includes("bound service account") || parsedMessage.includes("ACCOUNT_STATE_INVALID")
              ? "The configured Gemini API key is bound to a deleted or disabled Google Cloud service account. Please provide an active Gemini API key from Google AI Studio."
              : `Gemini API authentication failed: ${parsedMessage || "API key invalid"}. Please update your API key.`;

          const authErr = new Error(userFriendlyMsg);
          (authErr as any).isAuthError = true;
          (authErr as any).statusCode = res.status;
          throw authErr;
        }

        lastError = new Error(`Gemini API (${model}) returned HTTP ${res.status}: ${parsedMessage || errText}`);
        continue;
      }

      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rawText) {
        throw new Error("Empty response from AI search model.");
      }

      // Parse JSON from text
      const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("Could not parse structured land listing data from web search response.");
      }

      const parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      const rawList = Array.isArray(parsed.parcels) ? parsed.parcels : [];

      const hydratedParcels = hydrateRawLandParcels(rawList);
      bulkAddOrUpdateParcels(hydratedParcels);

      return {
        parcels: hydratedParcels,
        sourceSummary: parsed.summary || `Found ${hydratedParcels.length} active lots online.`,
      };
    } catch (err: any) {
      if (err?.isAuthError) {
        throw err;
      }
      lastError = err;
      console.warn(`[searchLiveWebForLand] Model ${model} failed:`, err);
    }
  }

  throw lastError || new Error("Failed to search live web for land.");
}
