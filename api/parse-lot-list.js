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
      const parts = [
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
    developer: "",
    lots: [],
  };

  const cleanName = (filename || "").replace(/\.pdf$/i, "");
  const nameParts = cleanName.split(/[-–—_]/).map((p) => p.trim()).filter(Boolean);
  for (const part of nameParts) {
    if (/price\s*list/i.test(part) || /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(part) || /stage/i.test(part)) continue;
    if (!fallbackResult.estate) fallbackResult.estate = part;
    else if (!fallbackResult.suburb) fallbackResult.suburb = part;
  }

  if (rawText) {
    const lines = rawText.split(/\r?\n/);
    const seen = new Set();
    for (const line of lines) {
      const trimmed = line.trim();
      const priceMatch = trimmed.match(/\$?\s*([1-9]\d{2}(?:,\d{3})+|[2-9]\d{5})/);
      if (!priceMatch) continue;
      const priceNum = parseInt(priceMatch[1].replace(/,/g, ""), 10);
      if (isNaN(priceNum) || priceNum < 50000 || priceNum > 5000000) continue;

      const lotMatch = trimmed.match(/(?:Lot|LOT|#)?\s*([A-Za-z0-9\-\/]{1,10})/i);
      if (!lotMatch) continue;
      const lotNum = lotMatch[1].replace(/^Lot\s*/i, "").trim();
      if (!lotNum || /^(the|and|for|size|price|m2|sqm|date|stage)$/i.test(lotNum)) continue;
      if (seen.has(lotNum.toLowerCase())) continue;

      const sizeMatch = trimmed.match(/(\d{2,4}(?:\.\d+)?)\s*(?:m2|sqm|m²)/i) || trimmed.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
      const frontageMatch = trimmed.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|mtrs)(?!\d)/i);
      const titled = /registered|titled/i.test(trimmed);
      const regMatch = trimmed.match(/(?:Q[1-4]\s*\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4})/i);

      seen.add(lotNum.toLowerCase());
      fallbackResult.lots.push({
        lot_number: lotNum,
        address: null,
        land_size: sizeMatch ? parseFloat(sizeMatch[1]) : null,
        frontage: frontageMatch ? parseFloat(frontageMatch[1]) : null,
        land_price: priceNum,
        titled,
        registration_date: titled ? null : (regMatch ? regMatch[0].trim() : null),
        status: /hold|deposit/i.test(trimmed) ? "on_hold" : (/sold/i.test(trimmed) ? "sold" : "available"),
        notes: null,
      });
    }
  }

  return res.status(200).json(fallbackResult);
}
