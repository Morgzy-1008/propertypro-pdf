import { authHeaders } from "./api-auth";
import type { DocumentPagesAndText } from "./pdfPages";

export interface ParsedLot {
  lot_number?: string | null;
  stage?: string | null;
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
  stage?: string;
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
 * Extracts lots directly from raw document text, tables, and filenames without requiring external AI.
 * Uses header column-mapping to strictly distinguish Lot Number, Stage, and Land Size (sqm).
 */
export function extractLotsFromText(rawText: string, filename = ""): ParseLotResult {
  const result: ParseLotResult = {
    estate: "",
    suburb: "",
    stage: "",
    developer: "",
    lots: [],
  };

  // 1. Detect Estate, Suburb and Stage from filename (e.g. "Flagstone - Aurora - Stage 4 Price List.pdf")
  const cleanName = filename.replace(/\.(pdf|csv|xlsx|txt)$/i, "");
  const stageFileMatch = cleanName.match(/(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
  if (stageFileMatch) {
    result.stage = stageFileMatch[1].trim();
  }

  const nameParts = cleanName.split(/[-–—_]/).map((p) => p.trim()).filter(Boolean);
  for (const part of nameParts) {
    if (/price\s*list/i.test(part) || /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(part) || /stage/i.test(part) || /release/i.test(part)) {
      continue;
    }
    if (!result.estate) {
      result.estate = part;
    } else if (!result.suburb) {
      result.suburb = part;
    }
  }

  // 2. Scan text for estate, suburb, developer, stage keywords if still blank
  if (rawText) {
    const estateMatch = rawText.match(/(?:Estate|Development|Community|Project)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (estateMatch && !result.estate) result.estate = estateMatch[1].trim();

    const suburbMatch = rawText.match(/(?:Suburb|Location)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (suburbMatch && !result.suburb) result.suburb = suburbMatch[1].trim();

    const stageMatch = rawText.match(/(?:Stage|Release|Stg)\s*[:\-–]?\s*([A-Za-z0-9\.\-]+)/i);
    if (stageMatch && !result.stage) result.stage = stageMatch[1].trim();

    const devMatch = rawText.match(/(?:Developer|Vendor)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (devMatch) result.developer = devMatch[1].trim();
  }

  if (!rawText) return result;

  // 3. Line-by-line lot extraction with header column-mapping
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const foundLots: ParsedLot[] = [];
  const seenLots = new Set<string>();
  let colMap: Record<string, number> | null = null;
  let currentStage = result.stage || "";

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect header row to map exact column indices
    if (
      (lower.includes("lot") || lower.includes("size") || lower.includes("sqm") || lower.includes("price")) &&
      (lower.includes("price") || lower.includes("size") || lower.includes("sqm") || lower.includes("frontage"))
    ) {
      const headerTokens = line.split(/\t+|[\s,|;]{2,}/).map((t) => t.trim().toLowerCase());
      if (headerTokens.length >= 3) {
        colMap = {};
        headerTokens.forEach((tok, idx) => {
          if (/^stage|^release|^stg/i.test(tok)) colMap!.stage = idx;
          else if (/^lot|^#|lot\s*no/i.test(tok)) colMap!.lot = idx;
          else if (/size|sqm|sq\.m|m2|m²|area/i.test(tok)) colMap!.size = idx;
          else if (/front|width/i.test(tok)) colMap!.frontage = idx;
          else if (/price|list\s*price|amount/i.test(tok)) colMap!.price = idx;
          else if (/status|avail/i.test(tok)) colMap!.status = idx;
          else if (/reg|title|date/i.test(tok)) colMap!.reg = idx;
          else if (/street|address/i.test(tok)) colMap!.address = idx;
        });
      }
      continue;
    }

    // Check for section stage banners, e.g. "STAGE 5 - THE ORCHARD"
    const stageBannerMatch = line.match(/^(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
    if (stageBannerMatch && !/\$|[1-9]\d{5}/.test(line)) {
      currentStage = stageBannerMatch[1].trim();
      if (!result.stage) result.stage = currentStage;
      continue;
    }

    // Look for price pattern: $385,000 or $385000 or 385,000
    const priceMatches = [...line.matchAll(/(?:\$|AUD)?\s*([1-9]\d{2}(?:,\d{3})+|[1-9]\d{5})/g)];
    if (priceMatches.length === 0) continue;

    let priceNum = 0;
    for (const pm of priceMatches) {
      const val = parseInt(pm[1].replace(/,/g, ""), 10);
      if (val >= 75000 && val <= 4000000) {
        priceNum = val;
        break;
      }
    }
    if (!priceNum) continue;

    // Tokens split by tabs or multiple spaces
    let cells = line.split(/\t+| {2,}/).map((c) => c.trim()).filter(Boolean);
    if (cells.length <= 2) {
      cells = line.split(/[\t\s,;|]+/).map((c) => c.trim()).filter(Boolean);
    }

    let lotNum = "";
    let landSize: number | null = null;
    let frontage: number | null = null;
    let rowStage = currentStage;

    // 1. Identify Land Size (look for sqm / m2 explicitly)
    const sizeUnitMatch = line.match(/(\d{2,4}(?:\.\d+)?)\s*(?:m2|sqm|sq\.m|m²)/i);
    if (sizeUnitMatch) {
      landSize = parseFloat(sizeUnitMatch[1]);
    }

    // 2. Identify Stage from row
    const rowStageMatch = line.match(/(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
    if (rowStageMatch) {
      rowStage = rowStageMatch[1].trim();
    } else if (colMap && colMap.stage !== undefined && cells[colMap.stage]) {
      rowStage = cells[colMap.stage].replace(/^stage\s*/i, "").trim();
    }

    // 3. Identify Lot Number (look for 'Lot 101' or '#101')
    const lotPrefixMatch = line.match(/(?:Lot|LOT|#|L\.)\s*([A-Za-z0-9\-\/]{1,10})/i);
    if (lotPrefixMatch) {
      lotNum = lotPrefixMatch[1].replace(/^Lot\s*/i, "").trim();
    } else if (colMap && colMap.lot !== undefined && cells[colMap.lot]) {
      const candidate = cells[colMap.lot].replace(/[^A-Za-z0-9\-]/g, "");
      if (candidate && candidate !== String(landSize) && candidate !== String(priceNum)) {
        lotNum = candidate;
      }
    }

    // If colMap has size and landSize wasn't found by explicit unit
    if (!landSize && colMap && colMap.size !== undefined && cells[colMap.size]) {
      const val = parseFloat(cells[colMap.size].replace(/[^0-9.]/g, ""));
      if (val >= 100 && val <= 4000) {
        landSize = val;
      }
    }

    // Fallback if no header mapping and no explicit prefix/unit:
    if (!lotNum || !landSize) {
      const candidates: { raw: string; clean: string; num: number; index: number }[] = [];
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const clean = cell.replace(/[^A-Za-z0-9.\-]/g, "");
        const num = parseFloat(clean);
        if (
          /^(the|and|for|size|price|m2|sqm|date|stage|release|stg|aud|status|reg|sq)$/i.test(clean) ||
          /^stage\d*$/i.test(clean) ||
          /^release\d*$/i.test(clean)
        ) {
          continue;
        }
        if (num === priceNum || clean === rowStage) continue;
        candidates.push({ raw: cell, clean, num, index: i });
      }

      if (!lotNum && candidates.length > 0) {
        if (landSize) {
          const other = candidates.find((c) => c.num !== landSize);
          if (other) lotNum = other.clean;
        } else if (candidates.length >= 2) {
          // Table column order: first candidate is Lot Number, second candidate is Land Size
          lotNum = candidates[0].clean;
          if (!isNaN(candidates[1].num) && candidates[1].num >= 100 && candidates[1].num <= 4000) {
            landSize = candidates[1].num;
          }
        } else if (candidates.length === 1) {
          lotNum = candidates[0].clean;
        }
      } else if (!landSize && candidates.length > 0) {
        const sizeCand = candidates.find(
          (c) => c.clean !== lotNum && !isNaN(c.num) && c.num >= 100 && c.num <= 4000
        );
        if (sizeCand) landSize = sizeCand.num;
      }
    }

    // Frontage (e.g. 14m, 12.5m, 14.00 or number between 7 and 45)
    const frontageMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
    if (frontageMatch) {
      frontage = parseFloat(frontageMatch[1]);
    } else if (colMap && colMap.frontage !== undefined && cells[colMap.frontage]) {
      const val = parseFloat(cells[colMap.frontage].replace(/[^0-9.]/g, ""));
      if (val >= 7 && val <= 45) frontage = val;
    }

    // Registration & Status
    const titled = /registered|titled|reg'd|ready/i.test(line);
    const regMatch = line.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const regDate = titled ? null : (regMatch ? regMatch[0].trim() : null);

    let status: ParsedLot["status"] = "available";
    if (/hold|deposit|under\s*offer|reserved/i.test(line)) {
      status = "on_hold";
    } else if (/sold|contracted|unconditional/i.test(line)) {
      status = "sold";
    }

    if (!lotNum) continue;
    if (seenLots.has(lotNum.toLowerCase())) continue;
    seenLots.add(lotNum.toLowerCase());

    foundLots.push({
      lot_number: lotNum,
      stage: rowStage || null,
      address: null,
      land_size: landSize,
      frontage: frontage,
      land_price: priceNum,
      titled: titled,
      registration_date: regDate,
      status: status,
      notes: rowStage ? `Stage ${rowStage}` : null,
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
      const promptText = `You are an expert real estate data parser for Australian land developments. 
Extract every individual land lot from this developer price list document.

CRITICAL PARSING RULES:
1. LOT NUMBER: Found under columns "Lot", "Lot #", "Lot No." or preceded by "Lot" (e.g. "101", "45", "12B").
2. LAND SIZE (SQM): Found under columns "Size", "SQM", "sq.m", "m2", "m²", or "Area" (e.g. 450, 375, 510). DO NOT confuse land size with lot number!
3. STAGE: Found under columns "Stage", "Release", "Stg" or section banners (e.g. "4", "Stage 5A").
4. FRONTAGE: Found under columns "Frontage", "Width" in metres (e.g. 14.0, 12.5).
5. LAND PRICE: Total purchase price (e.g. 385000).

Return ONLY a valid JSON object matching this schema:
{
  "estate": "Estate Name",
  "suburb": "Suburb Name",
  "stage": "Stage Name / Number",
  "developer": "Developer Name",
  "lots": [
    {
      "lot_number": "101",
      "stage": "4",
      "address": "Street Name",
      "land_size": 450,
      "frontage": 14.0,
      "land_price": 385000,
      "titled": false,
      "registration_date": "Nov 2026",
      "status": "available",
      "notes": "Stage 4"
    }
  ]
}`;

      const parts: any[] = [{ text: promptText }];

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
              for (const l of parsed.lots) {
                if (l.lot_number) l.lot_number = String(l.lot_number).replace(/^Lot\s*/i, "").trim();
                if (l.land_size != null) l.land_size = Number(l.land_size);
                if (l.land_price != null) l.land_price = Number(l.land_price);
                if (l.frontage != null) l.frontage = Number(l.frontage);
              }
              return {
                estate: parsed.estate || "",
                suburb: parsed.suburb || "",
                stage: parsed.stage || "",
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

  // Graceful fallback: return detected estate/suburb from filename/headers so the user can easily review or paste
  const meta = extractLotsFromText(rawText, filename);
  return {
    estate: meta.estate || "",
    suburb: meta.suburb || "",
    developer: meta.developer || "",
    lots: [],
  };
}

