export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  const { pages = [], rawText = "", filename = "" } = req.body || {};

  // Try Gemini AI parsing if apiKey is configured
  if (apiKey && pages.length > 0) {
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

      const parts = [{ text: promptText }];

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

      const isBearer = apiKey.startsWith("AQ.") || !apiKey.startsWith("AIza");
      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let rawAiResponse = "";

      for (const model of models) {
        try {
          const url = isBearer
            ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
            : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
          const headers = { "Content-Type": "application/json" };
          if (isBearer) {
            headers["Authorization"] = `Bearer ${apiKey}`;
          } else {
            headers["x-goog-api-key"] = apiKey;
          }

          const response = await fetch(url, {
            method: "POST",
            headers,
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
            rawAiResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawAiResponse) break;
          }
        } catch (err) {
          console.warn(`[ParseLotList] Model ${model} failed:`, err);
        }
      }

      if (rawAiResponse) {
        const cleaned = rawAiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleaned);
        if (Array.isArray(result.lots) && result.lots.length > 0) {
          // Double check lots to guarantee land_size and lot_number were not swapped
          for (const l of result.lots) {
            if (l.lot_number) l.lot_number = String(l.lot_number).replace(/^Lot\s*/i, "").trim();
            if (l.land_size != null) l.land_size = Number(l.land_size);
            if (l.land_price != null) l.land_price = Number(l.land_price);
            if (l.frontage != null) l.frontage = Number(l.frontage);
          }
          return res.status(200).json(result);
        }
      }
    } catch (err) {
      console.warn("[ParseLotList] AI extraction exception:", err);
    }
  }

  // Deterministic Text Fallback: Extract from rawText and filename
  const fallbackResult = {
    estate: "",
    suburb: "",
    stage: "",
    developer: "",
    lots: [],
  };

  const cleanName = (filename || "").replace(/\.(pdf|csv|xlsx|txt)$/i, "");
  const stageFileMatch = cleanName.match(/(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
  if (stageFileMatch) fallbackResult.stage = stageFileMatch[1].trim();

  const nameParts = cleanName.split(/[-–—_]/).map((p) => p.trim()).filter(Boolean);
  for (const part of nameParts) {
    if (/price\s*list/i.test(part) || /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(part) || /stage/i.test(part) || /release/i.test(part)) continue;
    if (!fallbackResult.estate) fallbackResult.estate = part;
    else if (!fallbackResult.suburb) fallbackResult.suburb = part;
  }

  if (rawText) {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const seen = new Set();
    let colMap = null;
    let currentStage = fallbackResult.stage || "";

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Header row column mapping
      if (
        (lower.includes("lot") || lower.includes("size") || lower.includes("sqm") || lower.includes("price")) &&
        (lower.includes("price") || lower.includes("size") || lower.includes("sqm") || lower.includes("frontage"))
      ) {
        const headerTokens = line.split(/\t+|[\s,|;]{2,}/).map((t) => t.trim().toLowerCase());
        if (headerTokens.length >= 3) {
          colMap = {};
          headerTokens.forEach((tok, idx) => {
            if (/^stage|^release|^stg/i.test(tok)) colMap.stage = idx;
            else if (/^lot|^#|lot\s*no/i.test(tok)) colMap.lot = idx;
            else if (/size|sqm|sq\.m|m2|m²|area/i.test(tok)) colMap.size = idx;
            else if (/front|width/i.test(tok)) colMap.frontage = idx;
            else if (/price|list\s*price|amount/i.test(tok)) colMap.price = idx;
            else if (/status|avail/i.test(tok)) colMap.status = idx;
            else if (/reg|title|date/i.test(tok)) colMap.reg = idx;
            else if (/street|address/i.test(tok)) colMap.address = idx;
          });
        }
        continue;
      }

      // Stage section banner
      const stageBannerMatch = line.match(/^(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
      if (stageBannerMatch && !/\$|[1-9]\d{5}/.test(line)) {
        currentStage = stageBannerMatch[1].trim();
        if (!fallbackResult.stage) fallbackResult.stage = currentStage;
        continue;
      }

      // Price extraction
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

      // 1. Identify Land Size under explicit unit (sqm / m2)
      const sizeUnitMatch = line.match(/(\d{2,4}(?:\.\d+)?)\s*(?:m2|sqm|sq\.m|m²)/i);
      if (sizeUnitMatch) {
        landSize = parseFloat(sizeUnitMatch[1]);
      }

      // 2. Identify Stage
      const rowStageMatch = line.match(/(?:Stage|Release|Stg)\s*([A-Za-z0-9\.\-]+)/i);
      if (rowStageMatch) {
        rowStage = rowStageMatch[1].trim();
      } else if (colMap && colMap.stage !== undefined && cells[colMap.stage]) {
        rowStage = cells[colMap.stage].replace(/^stage\s*/i, "").trim();
      }

      // 3. Identify Lot Number (explicit Lot prefix or colMap.lot)
      const lotPrefixMatch = line.match(/(?:Lot|LOT|#|L\.)\s*([A-Za-z0-9\-\/]{1,10})/i);
      if (lotPrefixMatch) {
        lotNum = lotPrefixMatch[1].replace(/^Lot\s*/i, "").trim();
      } else if (colMap && colMap.lot !== undefined && cells[colMap.lot]) {
        const candidate = cells[colMap.lot].replace(/[^A-Za-z0-9\-]/g, "");
        if (candidate && candidate !== String(landSize) && candidate !== String(priceNum)) {
          lotNum = candidate;
        }
      }

      // If colMap has size and landSize wasn't found by unit
      if (!landSize && colMap && colMap.size !== undefined && cells[colMap.size]) {
        const val = parseFloat(cells[colMap.size].replace(/[^0-9.]/g, ""));
        if (val >= 100 && val <= 4000) {
          landSize = val;
        }
      }

      // Fallback: search cells to find landSize and lotNum
      for (const tok of cells) {
        const cleanTok = tok.replace(/[^A-Za-z0-9\-]/g, "");
        const numVal = parseFloat(tok.replace(/,/g, ""));

        // Size: 180 - 3000 sqm
        if (!landSize && numVal >= 180 && numVal <= 3000 && numVal !== priceNum && cleanTok !== lotNum) {
          if (lotNum || cells.indexOf(tok) !== 0) {
            landSize = numVal;
            continue;
          }
        }

        // Lot: alphanumeric not equal to size or price
        if (!lotNum && cleanTok && !/^(the|and|for|size|price|m2|sqm|date|stage|release|aud)$/i.test(cleanTok)) {
          if (numVal !== landSize && numVal !== priceNum && cleanTok !== rowStage) {
            lotNum = cleanTok;
          }
        }
      }

      // Frontage
      const frontageMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
      if (frontageMatch) {
        frontage = parseFloat(frontageMatch[1]);
      } else if (colMap && colMap.frontage !== undefined && cells[colMap.frontage]) {
        const val = parseFloat(cells[colMap.frontage].replace(/[^0-9.]/g, ""));
        if (val >= 7 && val <= 45) frontage = val;
      }

      // Registration
      const titled = /registered|titled|reg'd|ready/i.test(line);
      const regMatch = line.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      const regDate = titled ? null : (regMatch ? regMatch[0].trim() : null);

      let status = "available";
      if (/hold|deposit|under\s*offer|reserved/i.test(line)) status = "on_hold";
      else if (/sold|contracted|unconditional/i.test(line)) status = "sold";

      if (!lotNum) continue;
      if (seen.has(lotNum.toLowerCase())) continue;
      seen.add(lotNum.toLowerCase());

      fallbackResult.lots.push({
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
  }

  return res.status(200).json(fallbackResult);
}
