export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  try {
    const { pages } = req.body || {};
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: "No document pages provided." });
    }

    const parts = [
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
      "land_size": 450, // number in m² (integer or float)
      "frontage": 14.0, // number in meters
      "land_price": 385000, // integer price in AUD (no dollar sign or commas)
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

    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let rawText = "";

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        console.warn(`[ParseLotList] Model ${model} failed:`, err);
      }
    }

    if (!rawText) {
      return res.status(500).json({ error: "Failed to extract lot data from the document." });
    }

    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[ParseLotList Exception]", err);
    return res.status(500).json({ error: err.message || "Failed to parse price list." });
  }
}
