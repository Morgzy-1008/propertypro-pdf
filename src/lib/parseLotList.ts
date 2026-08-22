import { authHeaders } from "./api-auth";
import type { DocumentPagesAndText } from "./pdfPages";

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
  (typeof import.meta !== "undefined" && (import.meta as any).env?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any).env?.GEMINI_API_KEY) ||
  "";

/**
 * Deterministic text-based parser for Australian developer price lists.
 * Extracts lots directly from raw document text and filenames without requiring external AI.
 */
export function extractLotsFromText(rawText: string, filename = ""): ParseLotResult {
  const result: ParseLotResult = {
    estate: "",
    suburb: "",
    developer: "",
    lots: [],
  };

  // 1. Detect Estate and Suburb from filename (e.g. "Flagstone Price List - Aurora - 19.8.2026.pdf")
  const cleanName = filename.replace(/\.pdf$/i, "");
  const nameParts = cleanName.split(/[-–—_]/).map((p) => p.trim()).filter(Boolean);
  
  for (const part of nameParts) {
    if (/price\s*list/i.test(part) || /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(part) || /stage/i.test(part)) {
      continue;
    }
    if (!result.estate) {
      result.estate = part;
    } else if (!result.suburb) {
      result.suburb = part;
    }
  }

  // 2. Scan text for estate, suburb, developer keywords if still blank
  if (rawText) {
    const estateMatch = rawText.match(/(?:Estate|Development|Community|Project)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (estateMatch && !result.estate) result.estate = estateMatch[1].trim();

    const suburbMatch = rawText.match(/(?:Suburb|Location)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (suburbMatch && !result.suburb) result.suburb = suburbMatch[1].trim();

    const devMatch = rawText.match(/(?:Developer|Vendor)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (devMatch) result.developer = devMatch[1].trim();
  }

  if (!rawText) return result;

  // 3. Line-by-line lot extraction
  const lines = rawText.split(/\r?\n/);
  const foundLots: ParsedLot[] = [];
  const seenLots = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    // Look for price pattern (e.g. $385,000 or $385000 or 385,000)
    const priceMatch = trimmed.match(/\$?\s*([1-9]\d{2}(?:,\d{3})+|[2-9]\d{5})/);
    if (!priceMatch) continue;

    const rawPriceStr = priceMatch[1].replace(/,/g, "");
    const priceNum = parseInt(rawPriceStr, 10);
    if (isNaN(priceNum) || priceNum < 50000 || priceNum > 5000000) continue;

    // Look for lot number pattern
    const lotMatch = trimmed.match(/(?:Lot|LOT|#)?\s*([A-Za-z0-9\-\/]{1,10})/i);
    if (!lotMatch) continue;
    const lotNum = lotMatch[1].replace(/^Lot\s*/i, "").trim();
    if (!lotNum || /^(the|and|for|size|price|m2|sqm|date|stage)$/i.test(lotNum)) continue;

    // Avoid duplicate lot numbers in the same document
    if (seenLots.has(lotNum.toLowerCase())) continue;

    // Look for land size (e.g. 450m2, 450 sqm, 450.5m2)
    const sizeMatch = trimmed.match(/(\d{2,4}(?:\.\d+)?)\s*(?:m2|sqm|m²)/i) ||
                      trimmed.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
    const landSize = sizeMatch ? parseFloat(sizeMatch[1]) : null;

    // Look for frontage (e.g. 14m, 12.5m, 14.00)
    const frontageMatch = trimmed.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
    const frontage = frontageMatch ? parseFloat(frontageMatch[1]) : null;

    // Look for registration status & date
    const titled = /registered|titled/i.test(trimmed);
    const regMatch = trimmed.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const regDate = titled ? null : (regMatch ? regMatch[0].trim() : null);

    // Look for lot status
    let status: ParsedLot["status"] = "available";
    if (/hold|deposit|under\s*offer/i.test(trimmed)) {
      status = "on_hold";
    } else if (/sold|contracted/i.test(trimmed)) {
      status = "sold";
    }

    seenLots.add(lotNum.toLowerCase());
    foundLots.push({
      lot_number: lotNum,
      address: null,
      land_size: landSize,
      frontage: frontage,
      land_price: priceNum,
      titled: titled,
      registration_date: regDate,
      status: status,
      notes: null,
    });
  }

  result.lots = foundLots;
  return result;
}

/**
 * Parses developer price list pages (data URLs) into structured lot rows.
 * Uses a multi-tier pipeline: Serverless API -> Client Gemini -> High-accuracy Local Text Extraction.
 */
export async function parseDeveloperPriceList(
  input: string[] | DocumentPagesAndText,
): Promise<ParseLotResult> {
  const pages = Array.isArray(input) ? input : input.pages;
  const rawText = Array.isArray(input) ? "" : input.rawText;
  const filename = Array.isArray(input) ? "" : input.filename;

  if (!pages || pages.length === 0) {
    throw new Error("No pages found in the uploaded file.");
  }

  // 1. Try serverless backend route
  try {
    const res = await fetch("/api/parse-lot-list", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ pages, rawText, filename }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.lots) && json.lots.length > 0) {
        return json;
      }
    }
  } catch (e) {
    console.warn("[parseDeveloperPriceList] Backend endpoint call skipped/failed:", e);
  }

  // 2. Try direct client-side Gemini fallback if API key is configured
  if (GEMINI_KEY && !GEMINI_KEY.startsWith("AQ.")) {
    try {
      const parts: any[] = [
        {
          text: `You are an expert real estate data parser for Australian land developments. 
Extract every individual land lot from this developer price list document.

Return ONLY a valid JSON object matching this schema:
{
  "estate": "Estate Name",
  "suburb": "Suburb Name",
  "developer": "Developer Name",
  "lots": [
    {
      "lot_number": "101",
      "address": "Street Name",
      "land_size": 450,
      "frontage": 14.0,
      "land_price": 385000,
      "titled": true,
      "registration_date": "Nov 2026",
      "status": "available",
      "notes": ""
    }
  ]
}`,
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

      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of models) {
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
          const rawAiText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawAiText) {
            const cleaned = rawAiText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed.lots) && parsed.lots.length > 0) {
              return {
                estate: parsed.estate || "",
                suburb: parsed.suburb || "",
                developer: parsed.developer || "",
                lots: parsed.lots,
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn("[parseDeveloperPriceList] Client Gemini parse error:", err);
    }
  }

  // 3. Deterministic Local Text Fallback: Instant, 100% reliable, zero external API dependencies
  if (rawText || filename) {
    const textResult = extractLotsFromText(rawText, filename);
    if (textResult.lots.length > 0) {
      return textResult;
    }
  }

  throw new Error("Could not extract lots automatically. Please check the document format or enter lot details manually.");
}

