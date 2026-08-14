import { authHeaders } from "./api-auth";

export interface ParsedLot {
  lot_number?: string | null;
  address?: string | null;
  land_size?: number | null;
  frontage?: number | null;
  land_price?: number | null;
  titled?: boolean | null;
  registration_date?: string | null;
  status?: "available" | "on_hold" | "sold";
  notes?: string | null;
}

export interface ParseLotResult {
  estate?: string;
  suburb?: string;
  developer?: string;
  lots: ParsedLot[];
}

const GEMINI_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any).env?.VITE_GEMINI_API_KEY) ||
  "";

/**
 * Parses developer price list pages (data URLs) into structured lot rows.
 * Tries serverless API endpoint first, and seamlessly falls back to direct Gemini client API.
 */
export async function parseDeveloperPriceList(pages: string[]): Promise<ParseLotResult> {
  if (!pages || pages.length === 0) {
    throw new Error("No pages found in the uploaded file.");
  }

  // 1. Try serverless backend route
  try {
    const res = await fetch("/api/parse-lot-list", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ pages }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.lots)) {
        return json;
      }
    }
  } catch (e) {
    console.warn("[parseDeveloperPriceList] Backend endpoint failed, using client fallback:", e);
  }

  // 2. Direct client-side Gemini fallback
  if (!GEMINI_KEY) {
    throw new Error("Could not parse price list: Gemini API key is missing.");
  }

  const parts: any[] = [
    {
      text: `You are an expert real estate data parser for Australian land developments. 
Extract every individual land lot from this developer price list document.

Return ONLY a valid JSON object matching this schema:
{
  "estate": "Estate Name (if visible, else empty string)",
  "suburb": "Suburb Name (if visible, else empty string)",
  "developer": "Developer Name (if visible, else empty string)",
  "lots": [
    {
      "lot_number": "Lot number as string (e.g. '101' or '45')",
      "address": "Street address / street name (e.g. 'Parkland Way')",
      "land_size": 450, // number in m²
      "frontage": 14.0, // number in meters
      "land_price": 385000, // integer price in AUD
      "titled": true, // boolean (true if titled/registered/ready, false if unregistered)
      "registration_date": "Registration or titling date (e.g. 'Nov 2026' or null if titled)",
      "status": "available", // 'available', 'on_hold', or 'sold'
      "notes": "Any easements, BAL rating, or notes mentioned"
    }
  ]
}

Parse all rows accurately. If a value is unknown or not on the price list, use null or 0.`,
    },
  ];

  for (const p of pages.slice(0, 8)) {
    if (typeof p === "string" && p.startsWith("data:")) {
      const [meta, b64] = p.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: b64,
        },
      });
    }
  }

  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
  let rawText = "";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (rawText) break;
      }
    } catch (err) {
      console.warn(`[parseDeveloperPriceList] Model ${model} failed:`, err);
    }
  }

  if (!rawText) {
    throw new Error("Could not extract lot data from this price list document.");
  }

  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    estate: parsed.estate || "",
    suburb: parsed.suburb || "",
    developer: parsed.developer || "",
    lots: Array.isArray(parsed.lots) ? parsed.lots : [],
  };
}
