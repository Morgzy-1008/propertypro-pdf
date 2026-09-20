export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  let apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    try {
      const fs = await import("fs");
      if (fs.existsSync(".env")) {
        const envContent = fs.readFileSync(".env", "utf8");
        const match =
          envContent.match(/VITE_GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/) ||
          envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
        if (match) {
          apiKey = match[1].trim();
        }
      }
    } catch {}
  }

  const { pages = [], rawText = "", filename = "" } = req.body || {};

  // 1. Try Gemini 3.6 Flash AI parsing if apiKey is configured and pages or text exist
  if (apiKey && (pages.length > 0 || rawText.trim().length > 0)) {
    try {
      const promptText = `You are a Senior Australian Property Estimator and Master Data Extraction Specialist.
Your task is to accurately extract EVERY individual land lot from this developer price list document.

CRITICAL DISAMBIGUATION & ACCURACY RULES:
1. LOT NUMBER vs LAND SIZE (DO NOT CONFUSE OR SWAP):
   - LOT NUMBER: The individual allotment identifier found under columns "Lot", "Lot #", "Lot No.", "Allotment", "No." or preceded by "Lot" (e.g. "12", "101", "450", "12B", "Lot 304").
   - LAND SIZE: The total land area in square metres found under columns "Area", "Size", "SQM", "sq.m", "m2", "m²", "Land Area", "Area (m²)" (e.g. 350, 400, 450, 480, 510.5, 600).
   - EXAMPLE: If a table row has Lot: "450" and Area: "480m²", the lot_number is "450" and land_size is 480. NEVER set land_size to 450!
   - Land sizes are typically between 150m² and 3000m².

2. STAGE / RELEASE:
   - Found under columns "Stage", "Release", "Stg" or header banners across tables (e.g. "4", "4A", "Stage 5", "Aurora Release 2").
   - If a stage banner appears above a group of lots, apply that stage to all lots beneath it.

3. FRONTAGE:
   - Street frontage width in metres under columns "Frontage", "Width", "Meters", "m" (e.g. 10.0, 12.5, 14.0, 16.0).
   - Return clean decimal number (e.g. 14.0).

4. LAND PRICE:
   - Total purchase price under columns "Price", "List Price", "Amount", "$" (e.g. $385,000).
   - Strip currency symbols and commas. Return as numeric integer (e.g. 385000).

5. REGISTRATION / TITLE STATUS:
   - If marked "Registered", "Titled", "Immediate", "Reg'd", set "titled": true, "registration_date": null.
   - If an anticipated date or quarter is specified (e.g. "Nov 2026", "Q4 2026", "Late 2026", "Dec 26"), set "titled": false, "registration_date": "Nov 2026".

6. LOT STATUS:
   - Must be one of: "available", "on_hold", or "sold".
   - "available": Available, For Sale, Open, Available Now.
   - "on_hold": Deposit, Hold, Reserved, Under Offer, Expression of Interest (EOI).
   - "sold": Sold, Contracted, Unconditional, Settled.

7. METADATA:
   - Extract "estate" name (e.g. "Aurora", "Flagstone", "Willow", "Everleigh").
   - Extract "suburb" (e.g. "Greenbank", "Flagstone", "Box Hill").
   - Extract "developer" if present (e.g. "Peet", "Stockland", "Mirvac", "Lendlease").

${rawText ? `DOCUMENT EXTRACTED TEXT:\n"""\n${rawText.slice(0, 12000)}\n"""\n` : ""}
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

      const parts = [{ text: promptText }];

      // Attach rendered page images (up to 8 pages)
      for (const p of pages.slice(0, 8)) {
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const rawAiResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (rawAiResponse) {
          const cleaned = rawAiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed.lots) && parsed.lots.length > 0) {
            // Strict sanitization & validation
            const validatedLots = parsed.lots.map((l) => {
              let lotNum = String(l.lot_number || "").replace(/^Lot\s*/i, "").trim();
              let landSize = l.land_size != null ? Number(l.land_size) : null;
              let frontage = l.frontage != null ? Number(l.frontage) : null;
              let landPrice = l.land_price != null ? Number(l.land_price) : null;

              // Check for suspicious inversion:
              // If land_size < 100 and lotNum looks like a land size (> 150 without alpha chars)
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
                // Inverted lot number and land size -> correct them
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

            return res.status(200).json({
              estate: parsed.estate || "",
              suburb: parsed.suburb || "",
              stage: parsed.stage || "",
              developer: parsed.developer || "",
              lots: validatedLots.filter((l) => l.lot_number || l.land_price),
            });
          }
        }
      } else {
        const errText = await response.text();
        console.warn("[ParseLotList] Gemini 3.6 API returned error:", response.status, errText);
      }
    } catch (err) {
      console.warn("[ParseLotList] Gemini 3.6 API parsing exception:", err);
    }
  }

  // 2. High-Accuracy Deterministic Text Parser Fallback
  const fallbackResult = parseTextDeterministic(rawText, filename);
  return res.status(200).json(fallbackResult);
}

/**
 * Robust deterministic text parser with multi-column mapping & statistical column profiling
 */
function parseTextDeterministic(rawText = "", filename = "") {
  const result = {
    estate: "",
    suburb: "",
    stage: "",
    developer: "",
    lots: [],
  };

  const cleanName = (filename || "").replace(/\.(pdf|csv|xlsx|txt)$/i, "");
  const stageFileMatch = cleanName.match(/(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
  if (stageFileMatch) result.stage = stageFileMatch[1].trim();

  const nameParts = cleanName.split(/[-–—_]/).map((p) => p.trim()).filter(Boolean);
  for (const part of nameParts) {
    if (/price\s*list/i.test(part) || /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(part) || /stage/i.test(part) || /release/i.test(part)) continue;
    if (!result.estate) result.estate = part;
    else if (!result.suburb) result.suburb = part;
  }

  if (!rawText) return result;

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return result;

  // Metadata scanning from raw lines
  for (const line of lines.slice(0, 15)) {
    const estateMatch = line.match(/(?:Estate|Community|Project)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (estateMatch && !result.estate) result.estate = estateMatch[1].trim();

    const suburbMatch = line.match(/(?:Suburb|Location)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (suburbMatch && !result.suburb) result.suburb = suburbMatch[1].trim();

    const stageMatch = line.match(/(?:Stage|Release|Stg)\s*[:\-–]?\s*([A-Za-z0-9\.\-]+)/i);
    if (stageMatch && !result.stage) result.stage = stageMatch[1].trim();

    const devMatch = line.match(/(?:Developer|Vendor)\s*[:\-–]?\s*([A-Za-z0-9\s]{3,30})/i);
    if (devMatch && !result.developer) result.developer = devMatch[1].trim();
  }

  let colMap = null;
  let currentStage = result.stage || "";
  const candidateRows = [];

  // Pass 1: Check for explicit column header row
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
          if (/^stage|^release|^stg/i.test(tok)) colMap.stage = idx;
          else if (/^lot|^#|lot\s*no|allotment/i.test(tok)) colMap.lot = idx;
          else if (/size|sqm|sq\.m|m2|m²|area/i.test(tok)) colMap.size = idx;
          else if (/front|width/i.test(tok)) colMap.frontage = idx;
          else if (/price|list\s*price|amount|\$/i.test(tok)) colMap.price = idx;
          else if (/status|avail/i.test(tok)) colMap.status = idx;
          else if (/reg|title|date|antic/i.test(tok)) colMap.reg = idx;
          else if (/street|address/i.test(tok)) colMap.address = idx;
        });
        break;
      }
    }
  }

  const seenLots = new Set();

  // Pass 2: Extract rows
  for (const line of lines) {
    // Stage banner check
    const stageBannerMatch = line.match(/^(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
    if (stageBannerMatch && !/\$|[1-9]\d{5}/.test(line)) {
      currentStage = stageBannerMatch[1].trim();
      if (!result.stage) result.stage = currentStage;
      continue;
    }

    // Price check ($385,000 or 385000)
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

    let cells = line.split(/\t+| {2,}/).map((c) => c.trim()).filter(Boolean);
    if (cells.length <= 2) {
      cells = line.split(/[\t\s,;|]+/).map((c) => c.trim()).filter(Boolean);
    }

    let lotNum = "";
    let landSize = null;
    let frontage = null;
    let rowStage = currentStage;

    // 1. Explicit unit match for size (e.g. 450m2, 480 sqm)
    const sizeUnitMatch = line.match(/(\d{2,4}(?:\.\d+)?)\s*(?:m2|sqm|sq\.m|m²)/i);
    if (sizeUnitMatch) {
      landSize = parseFloat(sizeUnitMatch[1]);
    }

    // 2. Explicit Lot identifier (e.g. "Lot 101", "#101", "Lot 450")
    const lotPrefixMatch = line.match(/(?:Lot|LOT|#|L\.)\s*([A-Za-z0-9\-\/]{1,10})/i);
    if (lotPrefixMatch) {
      lotNum = lotPrefixMatch[1].replace(/^Lot\s*/i, "").trim();
    }

    // 3. Use Header Column Map if available
    if (colMap) {
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

      if (colMap.stage !== undefined && cells[colMap.stage]) {
        rowStage = cells[colMap.stage].replace(/^stage\s*/i, "").trim();
      }

      if (colMap.frontage !== undefined && cells[colMap.frontage]) {
        const val = parseFloat(cells[colMap.frontage].replace(/[^0-9.]/g, ""));
        if (val >= 7 && val <= 45) frontage = val;
      }
    }

    // 4. Token heuristics when not resolved by header map
    if (!lotNum || !landSize) {
      const candidates = [];
      for (let idx = 0; idx < cells.length; idx++) {
        const cell = cells[idx];
        const clean = cell.replace(/^Lot\s*/i, "").replace(/[^A-Za-z0-9.\-]/g, "");
        const num = parseFloat(clean.replace(/,/g, ""));
        if (
          /^(the|and|for|size|price|m2|sqm|date|stage|release|stg|aud|status|reg|sq)$/i.test(clean) ||
          /^stage\d*$/i.test(clean) ||
          clean === rowStage ||
          num === priceNum
        ) {
          continue;
        }
        candidates.push({ raw: cell, clean, num, idx });
      }

      if (!lotNum && candidates.length > 0) {
        if (landSize != null) {
          const nonSize = candidates.find((c) => c.num !== landSize && c.clean !== String(landSize));
          if (nonSize) lotNum = nonSize.clean;
        } else if (candidates.length >= 2) {
          // Disambiguate Lot vs Size:
          // In typical tables: [Lot, Size] or [Size, Lot]
          // If candidate 0 has typical lot format and candidate 1 is typical land area (>= 150 and <= 2500)
          const c0 = candidates[0];
          const c1 = candidates[1];

          // Check if c1 is land size
          if (!isNaN(c1.num) && c1.num >= 150 && c1.num <= 3500) {
            lotNum = c0.clean;
            landSize = c1.num;
          } else if (!isNaN(c0.num) && c0.num >= 150 && c0.num <= 3500 && (isNaN(c1.num) || c1.num < 150)) {
            // Inverted layout: [Size, Lot]
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
        const sizeCand = candidates.find((c) => c.clean !== lotNum && !isNaN(c.num) && c.num >= 120 && c.num <= 4000);
        if (sizeCand) landSize = sizeCand.num;
      }
    }

    // 5. Frontage detection (e.g. 14.0m, 12.5m or standalone decimal)
    if (!frontage) {
      const frontageMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
      if (frontageMatch) {
        frontage = parseFloat(frontageMatch[1]);
      }
    }

    // 6. Registration detection
    const titled = /registered|titled|reg'd|ready|immediate/i.test(line);
    const regMatch = line.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const regDate = titled ? null : (regMatch ? regMatch[0].trim() : null);

    // 7. Status detection
    let status = "available";
    if (/hold|deposit|under\s*offer|reserved|eoi/i.test(line)) status = "on_hold";
    else if (/sold|contracted|unconditional/i.test(line)) status = "sold";

    if (!lotNum) continue;

    // Disambiguation check for inverted Lot Number and Land Size:
    // E.g. lotNum is "450" (integer > 180) and landSize is 14 (small integer, actually lot 14)
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

    if (seenLots.has(lotNum.toLowerCase())) continue;
    seenLots.add(lotNum.toLowerCase());

    result.lots.push({
      lot_number: lotNum,
      stage: rowStage || null,
      address: null,
      land_size: landSize,
      frontage: frontage,
      land_price: priceNum,
      titled,
      registration_date: regDate,
      status,
      notes: rowStage ? `Stage ${rowStage}` : null,
    });
  }

  return result;
}
