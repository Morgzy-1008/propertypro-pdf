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
 * Uses header column-mapping and statistical disambiguation to strictly distinguish Lot Number and Land Size (m²).
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
    const linesSlice = rawText.split(/\r?\n/).slice(0, 20);
    for (const line of linesSlice) {
      const estateMatch = line.match(/(?:Estate|Community|Project)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
      if (estateMatch && !result.estate) result.estate = estateMatch[1].trim();

      const suburbMatch = line.match(/(?:Suburb|Location)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
      if (suburbMatch && !result.suburb) result.suburb = suburbMatch[1].trim();

      const stageMatch = line.match(/(?:Stage|Release|Stg)\s*[:\-–]?\s*([A-Za-z0-9\.\-]+)/i);
      if (stageMatch && !result.stage) result.stage = stageMatch[1].trim();

      const devMatch = line.match(/(?:Developer|Vendor)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
      if (devMatch && !result.developer) result.developer = devMatch[1].trim();
    }
  }

  if (!rawText) return result;

  // 3. Line-by-line lot extraction with header column-mapping
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const foundLots: ParsedLot[] = [];
  const seenLots = new Set<string>();
  let colMap: Record<string, number> | null = null;
  let currentStage = result.stage || "";

  // Pass 1: Detect header row to map exact column indices
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      (lower.includes("lot") || lower.includes("size") || lower.includes("sqm") || lower.includes("area") || lower.includes("price")) &&
      (lower.includes("price") || lower.includes("size") || lower.includes("sqm") || lower.includes("area") || lower.includes("frontage"))
    ) {
      const headerTokens = line.split(/\t+|[\s,|;]{2,}/).map((t) => t.trim().toLowerCase());
      if (headerTokens.length >= 3) {
        colMap = {};
        headerTokens.forEach((tok, idx) => {
          if (/^stage|^release|^stg/i.test(tok)) colMap!.stage = idx;
          else if (/^lot|^#|lot\s*no|allotment/i.test(tok)) colMap!.lot = idx;
          else if (/size|sqm|sq\.m|m2|m²|area/i.test(tok)) colMap!.size = idx;
          else if (/front|width/i.test(tok)) colMap!.frontage = idx;
          else if (/price|list\s*price|amount|\$/i.test(tok)) colMap!.price = idx;
          else if (/status|avail/i.test(tok)) colMap!.status = idx;
          else if (/reg|title|date|antic/i.test(tok)) colMap!.reg = idx;
          else if (/street|address/i.test(tok)) colMap!.address = idx;
        });
        break;
      }
    }
  }

  // Pass 2: Parse table rows
  for (const line of lines) {
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

    // Split line into cells
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

    // 2. Identify Lot Number (look for 'Lot 101' or '#101')
    const lotPrefixMatch = line.match(/(?:Lot|LOT|#|L\.)\s*([A-Za-z0-9\-\/]{1,10})/i);
    if (lotPrefixMatch) {
      lotNum = lotPrefixMatch[1].replace(/^Lot\s*/i, "").trim();
    }

    // 3. Use Header Column Map if matched
    if (colMap) {
      if (rowStage === currentStage && colMap.stage !== undefined && cells[colMap.stage]) {
        rowStage = cells[colMap.stage].replace(/^stage\s*/i, "").trim();
      }

      if (!lotNum && colMap.lot !== undefined && cells[colMap.lot]) {
        const candidate = cells[colMap.lot].replace(/^Lot\s*/i, "").replace(/[^A-Za-z0-9\-]/g, "");
        if (candidate && candidate !== String(landSize) && candidate !== String(priceNum)) {
          lotNum = candidate;
        }
      }

      if (!landSize && colMap.size !== undefined && cells[colMap.size]) {
        const val = parseFloat(cells[colMap.size].replace(/[^0-9.]/g, ""));
        if (val >= 100 && val <= 4000) {
          landSize = val;
        }
      }

      if (!frontage && colMap.frontage !== undefined && cells[colMap.frontage]) {
        const val = parseFloat(cells[colMap.frontage].replace(/[^0-9.]/g, ""));
        if (val >= 7 && val <= 45) frontage = val;
      }
    }

    // 4. Token heuristics when not resolved by header map or explicit prefixes
    if (!lotNum || !landSize) {
      const candidates: { raw: string; clean: string; num: number; index: number }[] = [];
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const clean = cell.replace(/^Lot\s*/i, "").replace(/[^A-Za-z0-9.\-]/g, "");
        const num = parseFloat(clean.replace(/,/g, ""));
        if (
          /^(the|and|for|size|price|m2|sqm|date|stage|release|stg|aud|status|reg|sq)$/i.test(clean) ||
          /^stage\d*$/i.test(clean) ||
          /^release\d*$/i.test(clean) ||
          clean === rowStage ||
          num === priceNum
        ) {
          continue;
        }
        candidates.push({ raw: cell, clean, num, index: i });
      }

      if (!lotNum && candidates.length > 0) {
        if (landSize != null) {
          const other = candidates.find((c) => c.num !== landSize && c.clean !== String(landSize));
          if (other) lotNum = other.clean;
        } else if (candidates.length >= 2) {
          const c0 = candidates[0];
          const c1 = candidates[1];

          // Check if c1 is standard land size range (150 - 3500 sqm)
          if (!isNaN(c1.num) && c1.num >= 150 && c1.num <= 3500) {
            lotNum = c0.clean;
            landSize = c1.num;
          } else if (!isNaN(c0.num) && c0.num >= 150 && c0.num <= 3500 && (isNaN(c1.num) || c1.num < 150)) {
            // Inverted table layout [Area, Lot]
            landSize = c0.num;
            lotNum = c1.clean;
          } else {
            lotNum = c0.clean;
            if (!isNaN(c1.num) && c1.num >= 100 && c1.num <= 4000) landSize = c1.num;
          }
        } else if (candidates.length === 1) {
          lotNum = candidates[0].clean;
        }
      } else if (!landSize && candidates.length > 0) {
        const sizeCand = candidates.find(
          (c) => c.clean !== lotNum && !isNaN(c.num) && c.num >= 120 && c.num <= 4000
        );
        if (sizeCand) landSize = sizeCand.num;
      }
    }

    // 5. Disambiguate Lot Number and Land Size:
    // If lotNum is 450 (or > 180) and landSize is 12 (or < 80), they are inverted!
    const lotParsed = parseInt(lotNum, 10);
    if (
      landSize != null &&
      landSize > 0 &&
      landSize < 80 &&
      !isNaN(lotParsed) &&
      lotParsed >= 180 &&
      lotParsed <= 3500 &&
      String(lotParsed) === lotNum
    ) {
      const temp = String(landSize);
      landSize = lotParsed;
      lotNum = temp;
    }

    // 6. Frontage (e.g. 14m, 12.5m, 14.00 or number between 7 and 45)
    if (!frontage) {
      const frontageMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
      if (frontageMatch) {
        frontage = parseFloat(frontageMatch[1]);
      }
    }

    // 7. Registration & Status
    const titled = /registered|titled|reg'd|ready|immediate/i.test(line);
    const regMatch = line.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const regDate = titled ? null : (regMatch ? regMatch[0].trim() : null);

    let status: ParsedLot["status"] = "available";
    if (/hold|deposit|under\s*offer|reserved|eoi/i.test(line)) {
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
 * Parses developer price list pages (data URLs) and text into structured lot rows.
 * Multi-tier ingestion: Serverless API -> Client Gemini 3.6 Flash -> Deterministic Text Parser.
 */
export async function parseDeveloperPriceList(
  input: string[] | DocumentPagesAndText,
): Promise<ParseLotResult> {
  const pages = Array.isArray(input) ? input : input.pages;
  const rawText = Array.isArray(input) ? "" : input.rawText;
  const filename = Array.isArray(input) ? "" : input.filename;

  if ((!pages || pages.length === 0) && !rawText.trim()) {
    throw new Error("No pages or text found in the uploaded file.");
  }

  // 1. Try serverless backend route (now enabled on localhost & Vercel)
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

  // 2. Direct client-side Gemini 3.6 Flash fallback
  if (GEMINI_KEY) {
    try {
      const promptText = `You are a Senior Australian Property Estimator.
Extract every individual land lot from this developer price list document.

CRITICAL DISAMBIGUATION & ACCURACY RULES:
1. LOT NUMBER vs LAND SIZE (DO NOT CONFUSE OR SWAP):
   - LOT NUMBER: Allotment number under "Lot", "Lot #", "Lot No.", "No." (e.g. "12", "101", "450", "12B").
   - LAND SIZE: Land area in square metres under "Area", "Size", "SQM", "sq.m", "m2", "m²", "Area (m²)" (e.g. 350, 400, 450, 480, 510.5, 600).
   - If Lot is "450" and Area is "480m²", lot_number="450" and land_size=480. NEVER swap them!
2. FRONTAGE: Linear metres under "Frontage" or "Width" (e.g. 14.0).
3. LAND PRICE: Purchase price as clean integer (e.g. 385000).
4. REGISTRATION: Titled ("registered": true) or anticipated date ("Nov 2026", "Q4 2026").
5. STATUS: "available" | "on_hold" | "sold".

${rawText ? `DOCUMENT EXTRACTED TEXT:\n"""\n${rawText.slice(0, 10000)}\n"""\n` : ""}
${filename ? `FILENAME: "${filename}"\n` : ""}

Return ONLY valid JSON matching this schema:
{
  "estate": string,
  "suburb": string,
  "stage": string,
  "developer": string,
  "lots": [
    {
      "lot_number": string,
      "stage": string,
      "address": string,
      "land_size": number,
      "frontage": number,
      "land_price": number,
      "titled": boolean,
      "registration_date": string,
      "status": "available" | "on_hold" | "sold",
      "notes": string
    }
  ]
}`;

      const parts: any[] = [{ text: promptText }];

      for (const p of (pages || []).slice(0, 8)) {
        if (typeof p === "string" && p.startsWith("data:")) {
          const [meta, b64] = p.split(",");
          const mimeType = meta.match(/:(.*?);/)?.[1] || "image/png";
          parts.push({
            inlineData: {
              mimeType,
              data: b64,
            },
          });
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
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
            const validatedLots = parsed.lots.map((l: any) => {
              let lotNum = String(l.lot_number || "").replace(/^Lot\s*/i, "").trim();
              let landSize = l.land_size != null ? Number(l.land_size) : null;
              let frontage = l.frontage != null ? Number(l.frontage) : null;
              let landPrice = l.land_price != null ? Number(l.land_price) : null;

              const lotNumParsed = parseInt(lotNum, 10);
              if (
                landSize != null &&
                landSize > 0 &&
                landSize < 80 &&
                !isNaN(lotNumParsed) &&
                lotNumParsed >= 180 &&
                lotNumParsed <= 3500 &&
                String(lotNumParsed) === lotNum
              ) {
                const temp = String(landSize);
                landSize = lotNumParsed;
                lotNum = temp;
              }

              return {
                lot_number: lotNum || null,
                stage: l.stage ? String(l.stage).replace(/^Stage\s*/i, "").trim() : (parsed.stage || null),
                address: l.address ? String(l.address).trim() : null,
                land_size: landSize,
                frontage: frontage,
                land_price: landPrice,
                titled: Boolean(l.titled),
                registration_date: l.titled ? null : (l.registration_date ? String(l.registration_date).trim() : null),
                status: (l.status === "on_hold" || l.status === "sold") ? l.status : "available",
                notes: l.notes ? String(l.notes).trim() : null,
              };
            });

            return {
              estate: parsed.estate || "",
              suburb: parsed.suburb || "",
              stage: parsed.stage || "",
              developer: parsed.developer || "",
              lots: validatedLots.filter((l: any) => l.lot_number || l.land_price),
            };
          }
        }
      }
    } catch (err) {
      console.warn("[parseDeveloperPriceList] Client Gemini parse error:", err);
    }
  }

  // 3. Deterministic Local Text Fallback
  if (rawText || filename) {
    const textResult = extractLotsFromText(rawText, filename);
    if (textResult.lots.length > 0) {
      return textResult;
    }
  }

  const meta = extractLotsFromText(rawText, filename);
  return {
    estate: meta.estate || "",
    suburb: meta.suburb || "",
    developer: meta.developer || "",
    lots: [],
  };
}
