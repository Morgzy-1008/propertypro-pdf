import fs from "fs";

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
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const { query, state = "ALL", apiKey: clientKey } = req.body || {};

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Query parameter is required." });
  }

  let key = clientKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    try {
      if (fs.existsSync(".env")) {
        const envContent = fs.readFileSync(".env", "utf8");
        const match = envContent.match(/VITE_GEMINI_API_KEY\s*=\s*(.+)/) || envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
        if (match) {
          key = match[1].trim().replace(/["']/g, "");
        }
      }
    } catch {}
  }

  if (!key) {
    return res.status(401).json({
      error: "Google Gemini API key is not configured on server or in request.",
      isAuthError: true,
    });
  }

  const prompt = `You are a real estate land intelligence analyst for Hudson Homes (an Australian home builder in QLD and NSW).
Task: Search the web (specifically checking openlot.com.au, domain.com.au, realestate.com.au, peet.com.au, stockland.com.au, and lendlease.com.au) for active, genuinely available vacant land lots for sale matching: "${query.trim()}".
Target State / Area: ${state === "ALL" ? "Queensland or New South Wales" : state}.

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

  const model = "gemini-3.6-flash";
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      let parsedMsg = "";
      try {
        const json = JSON.parse(errText);
        parsedMsg = json.error?.message || "";
      } catch {}

      if (
        upstream.status === 401 ||
        upstream.status === 403 ||
        parsedMsg.includes("service account") ||
        parsedMsg.includes("ACCOUNT_STATE_INVALID") ||
        parsedMsg.includes("API key not valid") ||
        parsedMsg.includes("UNAUTHENTICATED")
      ) {
        return res.status(401).json({
          error: parsedMsg || "Unauthorized API key.",
          isAuthError: true,
        });
      }

      return res.status(upstream.status).json({
        error: parsedMsg || `Google API error (status ${upstream.status})`,
      });
    }

    const data = await upstream.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return res.status(502).json({ error: "Empty response from Gemini web search." });
    }

    const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(502).json({ error: "Invalid structured JSON response from web search." });
    }

    const parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
    return res.status(200).json({
      success: true,
      summary: parsed.summary || "Active land releases discovered via live Google Search.",
      parcels: Array.isArray(parsed.parcels) ? parsed.parcels : [],
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Internal server error during Land Scout web search.",
    });
  }
}
