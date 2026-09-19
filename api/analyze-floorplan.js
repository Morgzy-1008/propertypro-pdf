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

  try {
    const {
      candidateImageBase64,
      suggestedDesign = "Amber 21",
      housingType = "Single Storey",
      fileName = "Plan.pdf",
      cadSpec = {},
      stdAreas = {},
      rawText = "",
      apiKey: userKey,
    } = req.body || {};

    if (!candidateImageBase64) {
      return res.status(400).json({ error: "Missing candidateImageBase64 in request body." });
    }

    let key = userKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(".env")) {
          const envContent = fs.readFileSync(".env", "utf8");
          const match =
            envContent.match(/VITE_GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/) ||
            envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
          if (match) {
            key = match[1].trim();
          }
        }
      } catch {}
    }

    if (!key) {
      return res.status(500).json({ error: "Gemini API key is not configured on server or in request." });
    }

    // Clean base64
    const cleanCandB64 = candidateImageBase64.includes(",")
      ? candidateImageBase64.split(",")[1]
      : candidateImageBase64;
    const candMimeType = candidateImageBase64.includes(";")
      ? candidateImageBase64.split(";")[0].replace("data:", "")
      : "image/png";

    // Read baseline blueprint from disk if available
    let baselineB64 = "";
    let baselineMime = "image/png";
    try {
      const fs = await import("fs");
      const path = await import("path");
      let baseFile = "AMBER 21.png";
      const cleanDesign = suggestedDesign.toLowerCase();
      if (cleanDesign.includes("ascot 36")) baseFile = "ASCOT 36.png";
      else if (cleanDesign.includes("amber 21") || cleanDesign.includes("ember 21")) baseFile = "AMBER 21.png";
      else if (cleanDesign.includes("jasper 26")) baseFile = "JASPER 26.png";

      const localPath = path.resolve(process.cwd(), "public", "floorplans", baseFile);
      if (fs.existsSync(localPath)) {
        baselineB64 = fs.readFileSync(localPath).toString("base64");
      }
    } catch {}

    const standardTotalM2 = cadSpec?.totalM2 || 192.24;
    const standardLivingM2 = stdAreas?.livingM2 || cadSpec?.livingM2 || 147.56;
    const standardAlfrescoM2 = stdAreas?.alfrescoM2 || cadSpec?.alfrescoM2 || 9.54;
    const standardGarageM2 = stdAreas?.garageM2 || cadSpec?.garageM2 || 32.89;
    const standardPorchM2 = stdAreas?.porchM2 || cadSpec?.porchM2 || 2.25;

    const prompt = `You are a Senior Architectural Estimator and Surveyor at Hudson Homes.
Your task is to inspect this candidate floorplan blueprint and compare it against the official Hudson Homes baseline design.

${
  baselineB64
    ? `YOU ARE COMPARING TWO BLUEPRINT IMAGES:
- IMAGE 1 (First image): THE OFFICIAL STANDARD BASELINE BLUEPRINT for "${suggestedDesign}" (${housingType}, standard total area: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m² [standard size 2.6m deep × 3.6m wide], garage: ${standardGarageM2} m² [5.5m × 5.5m], porch: ${standardPorchM2} m²; overall width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).
- IMAGE 2 (Second image): THE UPLOADED CANDIDATE / MODIFIED FLOORPLAN.`
    : `YOU ARE INSPECTING THE UPLOADED FLOORPLAN:
- Baseline Design: "${suggestedDesign}" (${housingType}, total: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m² [2.6m deep × 3.6m wide], garage: ${standardGarageM2} m², width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).`
}

CRITICAL ARCHITECTURAL VISUAL DIFFING RULES (ZERO HALLUCINATIONS):
1. VISUAL DRAWING GEOMETRY TAKES ABSOLUTE PRECEDENCE OVER ANY PRINTED BROCHURE SCHEDULE TABLE:
   - When estimators or clients modify a brochure floorplan, they redraw or erase lines directly on the drawing sheet WITHOUT updating the printed schedule table in the corner!
   - You MUST visually inspect the wall alignments, external perimeters, slab footprints, and room boundaries between Image 1 (Baseline) and Image 2 (Candidate).
   - If the visual drawing shows an extended Alfresco, extended Living, or pushed out wall, you MUST report it as modified, regardless of what the printed brochure table at the bottom left says!

2. AMBER 21 HORIZONTAL RHS ALFRESCO EXTENSION GROUND TRUTH:
   - In standard Amber 21, the Alfresco is 2.6m deep × 3.6m wide = 9.54 m², located on the left side of the rear.
   - To its right is an open outdoor notch (2.3m wide) before the Family room RHS external wall (which is 5.9m wide).
   - If Image 2 shows the Alfresco boundary extended horizontally all the way to the RHS external wall (eliminating the notch and making the Alfresco span the full width of the Family room / RHS wall):
     * The added area is exactly 2.3m extension width × 2.6m depth = +5.98 m² (or +6.0 m²).
     * Set zone: "alfresco"
     * Set deltaM2: 6.0
     * Set estimatedLinearExtensionM: 2.3
     * Set reason: "Alfresco visually extended horizontally to RHS external wall flush with Family room (+2.3m width × 2.6m depth = +6.0 m²)."

3. REARWARD DEPTH PUSH-OUTS:
   - If the Alfresco in Image 2 extends deeper into the rear yard (beyond the Ensuite/Bed 1 rear alignment), estimate the linear push-out distance in meters and calculate deltaM2 (e.g. +1.5m deep × 3.6m wide = +5.4 m²).
   - If the Living / Family room rear wall is pushed out deeper to the rear, calculate deltaM2.

4. UNMODIFIED STANDARD PLANS (ZERO FALSE POSITIVES):
   - If Image 2 is visually identical to Image 1 in all perimeters, walls, and footprints, with no push-outs and no markups:
     * isModified: false
     * areaModifications: []
     * detectedInclusions: []
     * analysisNotes: "Standard brochure blueprint matching baseline specifications exactly."

5. 2D DRAWING VS 3D FINISHES (NEVER GUESS WATERFALL ENDS):
   - You are viewing a 2D floorplan. NEVER report "waterfall ends" unless explicitly written on the plan.

6. "BY OWNER" / "CLIENT TO SUPPLY" / "NIC" (NOT IN CONTRACT):
   - For ANY item marked "by owner" or "client supply": set isByOwner: true, unitPrice: 0.

Candidate File Name: "${fileName}"
Raw Embedded Text: """${rawText.slice(0, 1500)}"""

Return ONLY valid JSON matching this schema:
{
  "detectedModelName": string,
  "confidence": number,
  "isModified": boolean,
  "ceilingHeightM": number,
  "analysisNotes": string,
  "areaModifications": [
    {
      "zone": "living" | "alfresco" | "garage" | "wet_area" | "porch",
      "deltaM2": number,
      "estimatedLinearExtensionM": number,
      "reason": string
    }
  ],
  "detectedInclusions": [
    {
      "id": string,
      "name": string,
      "category": string,
      "baseline": string,
      "detected": string,
      "isByOwner": boolean,
      "isCustomItem": boolean,
      "materials": number,
      "labor": number,
      "unitPrice": number,
      "quantity": number,
      "reason": string
    }
  ]
}`;

    const parts = [{ text: prompt }];

    if (baselineB64) {
      parts.push({
        inlineData: {
          mimeType: baselineMime,
          data: baselineB64,
        },
      });
    }

    parts.push({
      inlineData: {
        mimeType: candMimeType,
        data: cleanCandB64,
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return res.status(resp.status).json({ error: `Gemini API error: ${resp.statusText}`, details: errTxt });
    }

    const json = await resp.json();
    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return res.status(500).json({ error: "Empty response from Gemini API" });
    }

    const parsedData = JSON.parse(candidateText);
    return res.status(200).json(parsedData);
  } catch (err) {
    console.error("Error in /api/analyze-floorplan:", err);
    return res.status(500).json({ error: err.message || "Failed to analyze floorplan." });
  }
}
