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
      baselineImageBase64,
      baselineMimeType = "image/png",
      suggestedDesign = "Amber 21",
      housingType = "Single Storey",
      fileName = "Plan.pdf",
      cadSpec = {},
      stdAreas = {},
      rawText = "",
      apiKey: userKey,
      identifyOnly = false,
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

    // Clean candidate base64
    const cleanCandB64 = candidateImageBase64.includes(",")
      ? candidateImageBase64.split(",")[1]
      : candidateImageBase64;
    const candMimeType = candidateImageBase64.includes(";")
      ? candidateImageBase64.split(";")[0].replace("data:", "")
      : "image/png";

    // ----------------------------------------------------
    // MODE 1: IDENTIFY ONLY (Title Block & Sheet Header Recognition)
    // ----------------------------------------------------
    if (identifyOnly) {
      const identifyPrompt = `Inspect this floorplan drawing sheet. Identify the Hudson Homes house design model name printed in the title block or sheet header (e.g. "Burgundy 30", "Cedar 26", "Azure 23", "Amber 21", "Jasper 26", "Ashton 29"), the housing type ("Single Storey" or "Double Storey"), and the total area in m².
Return ONLY valid JSON:
{
  "designName": string,
  "housingType": "Single Storey" | "Double Storey",
  "totalM2": number
}`;

      const identifyUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`;
      const identifyResp = await fetch(identifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: identifyPrompt },
                {
                  inlineData: {
                    mimeType: candMimeType,
                    data: cleanCandB64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!identifyResp.ok) {
        const errTxt = await identifyResp.text();
        return res.status(identifyResp.status).json({ error: `Gemini API error during identification`, details: errTxt });
      }

      const idJson = await identifyResp.json();
      const idText = idJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!idText) return res.status(500).json({ error: "Empty identification response from Gemini" });
      const parsedId = JSON.parse(idText);
      return res.status(200).json(parsedId);
    }

    // ----------------------------------------------------
    // MODE 2: DUAL-IMAGE COMPREHENSIVE ARCHITECTURAL VISUAL DIFFING
    // ----------------------------------------------------
    let baselineB64 = "";
    let baselineMime = baselineMimeType || "image/png";

    if (baselineImageBase64) {
      baselineB64 = baselineImageBase64.includes(",")
        ? baselineImageBase64.split(",")[1]
        : baselineImageBase64;
    } else {
      // Try local filesystem if available (e.g. dev environment)
      try {
        const fs = await import("fs");
        const path = await import("path");
        const floorplansDir = path.resolve(process.cwd(), "public", "floorplans");
        let baseFile = "";
        const cleanDesign = suggestedDesign.toLowerCase().replace(/classic|brochure|rh|sh/g, "").trim();

        if (fs.existsSync(floorplansDir)) {
          const files = fs.readdirSync(floorplansDir);
          const match = files.find((f) => {
            const fn = f.toLowerCase();
            return (
              fn.replace(/\.png$/, "").trim() === cleanDesign ||
              fn.startsWith(cleanDesign + " ") ||
              fn.startsWith(cleanDesign + "_") ||
              fn.startsWith(cleanDesign + ".")
            );
          });
          if (match) baseFile = match;
        }

        if (baseFile) {
          const localPath = path.resolve(floorplansDir, baseFile);
          if (fs.existsSync(localPath)) {
            baselineB64 = fs.readFileSync(localPath).toString("base64");
          }
        }
      } catch {}
    }

    const standardTotalM2 = cadSpec?.totalM2 || 192.24;
    const standardLivingM2 = stdAreas?.livingM2 || cadSpec?.livingM2 || 147.56;
    const standardAlfrescoM2 = stdAreas?.alfrescoM2 || cadSpec?.alfrescoM2 || 9.54;
    const standardGarageM2 = stdAreas?.garageM2 || cadSpec?.garageM2 || 32.89;
    const standardPorchM2 = stdAreas?.porchM2 || cadSpec?.porchM2 || 2.25;

    const prompt = `You are a Senior Architectural Estimator and Building Surveyor at Hudson Homes.
Your objective is to perform a 100% comprehensive architectural discrepancy and modification analysis comparing the official Hudson Homes standard baseline blueprint against the uploaded candidate / modified floorplan drawing.

${
  baselineB64
    ? `YOU ARE COMPARING TWO BLUEPRINT DRAWINGS:
- IMAGE 1 (Standard Baseline): The official brochure blueprint for "${suggestedDesign}" (${housingType}, standard total area: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m², garage: ${standardGarageM2} m², porch: ${standardPorchM2} m²; overall width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).
- IMAGE 2 (Candidate Drawing): The uploaded candidate / modified floorplan drawing.`
    : `YOU ARE INSPECTING THE UPLOADED CANDIDATE FLOORPLAN:
- Baseline Design Reference: "${suggestedDesign}" (${housingType}, total: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m², garage: ${standardGarageM2} m², porch: ${standardPorchM2} m²).`
}

UNIVERSAL ARCHITECTURAL VISUAL DIFFING PROTOCOL:

1. HOME DESIGN MODEL IDENTIFICATION:
   - Carefully inspect the drawing sheet, title block, or brochure header in Image 2.
   - Return the true home design model name in "detectedModelName" (e.g. "Burgundy 30", "Cedar 26", "Azure 23", "Amber 21", "Jasper 26", etc.).
   - Return "housingType" ("Single Storey" or "Double Storey").

2. SPATIAL & FOOTPRINT PERIMETER COMPARISON (EXTERNAL WALLS & SLAB):
   - Compare the outer external building perimeter of Image 2 against Image 1:
     * Check Ground Floor and First Floor perimeters.
     * Check Alfresco rear and side outer boundaries.
     * Check Garage exterior side and front boundaries.
     * Check Family / Living room rear and side exterior walls.
     * Check Porch / Entry exterior boundaries.
   - IF ALL EXTERNAL WALLS AND SLAB BOUNDARIES IN IMAGE 2 MATCH IMAGE 1:
     * The building envelope has NOT expanded outward into the yard or side setback.
     * Set externalFootprintChanged: false.
     * Set areaModifications: [].
     * CRITICAL: NEVER report living or alfresco area extensions if the outer exterior building walls have not moved!
   - IF ANY EXTERNAL WALL IS VISIBLY PUSHED OUT, EXTENDED, OR ENLARGED:
     * Set externalFootprintChanged: true.
     * Add to areaModifications with the zone ("alfresco" | "living" | "garage" | "porch").
     * Calculate deltaM2 based on physical dimensions:
       - Use printed dimension annotations if present on the plan (e.g. 3.0m width × 3.4m depth = +10.20 m²).
       - For garage widening (e.g. storage bumpout or workshop bay), state the linear widening width in meters (e.g. 0.85m widening × 5.7m depth = +4.85 m²).
       - For 3rd car bay garage additions on the RHS, calculate the added footprint (e.g. 3.0m width × 5.5m depth = +16.50 m²).
       - For rear alfresco extensions pushing into the backyard, calculate the added covered area over standard.
       - Provide the exact geometric reasoning and dimensions.

3. INTERNAL LAYOUT RECONFIGURATIONS, JOINERY, CEILINGS & DESIGN MARKUPS:
   - Scan EVERY room on Ground Floor and First Floor.
   - Compare internal walls, robes, fixtures, ceiling annotations, and balconies between Image 1 and Image 2:
     * Robe / Wardrobe Reconfigurations:
       - Check every bedroom's wardrobe. Did any built-in sliding robe change to a Walk-In Robe ("WIR") or vice versa?
       - If Bed 3 robe changed to WIR, report it!
       - If Bed 4 robe changed to WIR, report it!
       - For layout joinery reconfigurations without a mandatory surcharge, provide unitPrice: 0 (or custom joinery allowance) so the estimator can see the AI recognized it at $0.
     * Ceiling Height Upgrades & Annotations:
       - Inspect any text or red annotations specifying ceiling heights (e.g. "2740mm Ceilings GF", "2590mm Ceilings", "Raked Ceilings").
       - If "2740mm Ceilings GF" is noted, report:
         * name: "2740mm (9ft) Ground Floor Ceiling Height Upgrade"
         * category: "internal_general"
         * baseline: "Standard 2440mm ceiling height"
         * detected: "2740mm Ceilings GF annotation on plan"
         * unitPrice: 6850
         * ceilingHeightM: 2.74
     * Balcony / Architectural Additions:
       - Check if a Balcony has been added on First Floor over Porch or facade.
       - If a Balcony is drawn or marked "Balcony" in Image 2 that was not in Image 1, report it!
         * name: "Front Architectural Feature Balcony"
         * category: "structural"
         * baseline: "Standard facade without upper balcony (0.00 m²)"
         * detected: "Upper floor feature balcony added over porch"
         * unitPrice: 0
     * Room Conversions & Reconfigurations:
       - Bedroom converted into a private Ensuite (ENS) and Walk-in Robe (WIR) -> category: "internal_bathroom", approximate trade cost: $12,500.
       - Enclosed storage room or study converted to Option Living / Media room (e.g. with roof skylight) -> category: "internal_general", approximate trade cost: $4,500.
       - Powder room or additional WC added -> category: "internal_bathroom", approximate trade cost: $4,800.
       - Raked / vaulted ceiling notation -> category: "internal_general", approximate trade cost: $4,200.
     * Fixture Upgrades & Additions:
       - Master Ensuite vanity upgraded to Double Basin Vanity -> category: "internal_bathroom", approximate trade cost: $1,280.
         IMPORTANT: Use a broad architectural description (e.g. "Master Ensuite Double Basin Vanity Upgrade" - extended vanity cabinet with dual undermount basins and twin flick mixers) without asserting an unmeasured width unless clearly dimensioned on the plan.
       - Feature front entrance door upgraded to 1020mm wide ("EXT 1020") -> category: "doors_windows", approximate trade cost: $850.
       - Dedicated single roller door (2100mm × 2400mm / "Roller Door 21.24") added for 3rd garage car bay or rear yard access -> category: "doors_windows", approximate trade cost: $1,950.
     * Colored Markups & Red Annotations:
       - Inspect ANY red boxes, red pointer lines, or red text on Image 2 (e.g., red boxes around "WIR", red box around "2740mm Ceilings GF", red box/line around "Balcony").
       - EVERY redline markup or text change on the plan MUST be reported as an item in detectedInclusions so the estimator has 100% visibility of all changes!
       - If an item does not have a standard contract price, assign unitPrice: 0.

4. ACCURACY AND ZERO HALLUCINATIONS:
   - Report ONLY modifications that actually exist on Image 2!
   - NEVER invent variations from other designs.
   - If Image 2 is visually identical to Image 1: isModified: false, areaModifications: [], detectedInclusions: [].
   - For ANY item marked "by owner", "client supply", or "NIC" (not in contract): set isByOwner: true, unitPrice: 0.

Candidate File Name: "${fileName}"
Raw Embedded Text: """${rawText.slice(0, 1500)}"""

Return ONLY valid JSON matching this schema:
{
  "detectedModelName": string,
  "housingType": "Single Storey" | "Double Storey",
  "confidence": number,
  "isModified": boolean,
  "externalFootprintChanged": boolean,
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

    // Catalog normalization and deduplication
    const FIXTURE_UPGRADE_MAP = {
      upg_additional_ensuite_wir: {
        id: "upg_additional_ensuite_wir",
        name: "Additional Bedroom Ensuite & Walk-in Robe Fitout",
        category: "internal_bathroom",
        baseline: "Standard bedroom layout with robe",
        detected: "Private ensuite (ENS) and walk-in robe (WIR) addition",
        unitPrice: 12500,
        description: "Conversion of bedroom into an additional Ensuite (ENS) with shower recess, toilet, vanity, and adjoining Walk-In Robe (WIR).",
      },
      upg_living_media_conversion: {
        id: "upg_living_media_conversion",
        name: "Living / Media Room Conversion with Skylight",
        category: "internal_general",
        baseline: "Enclosed storage room or secondary space",
        detected: "Living / Media room with skylight feature",
        unitPrice: 4500,
        description: "Conversion to functional Living / Media room inclusion with skylight.",
      },
      upg_ensuite_double_vanity: {
        id: "upg_ensuite_double_vanity",
        name: "Master Ensuite Double Basin Vanity Upgrade",
        category: "internal_bathroom",
        baseline: "Single vanity with 1 basin",
        detected: "Dual basin vanity layout with twin mixers and double waste plumbing",
        unitPrice: 1280,
        description: "Extended vanity cabinet with dual undermount basins and twin flick mixers (replaces standard single vanity).",
      },
      upg_entry_door_1020: {
        id: "upg_entry_door_1020",
        name: "1020mm Wide Architectural Front Entry Door Upgrade",
        category: "doors_windows",
        baseline: "Standard 820mm / 920mm painted entrance door",
        detected: "1020mm wide feature front entrance door notation ('EXT 1020') on plan",
        unitPrice: 850,
        description: "1020mm wide architectural feature front entrance door upgrade ('EXT 1020' on plan).",
      },
      upg_single_roller_door: {
        id: "upg_single_roller_door",
        name: "Additional 2100mm × 2400mm Colorbond Single Roller Door",
        category: "doors_windows",
        baseline: "Standard double garage with 1 x double sectional door",
        detected: "Dedicated 2100mm × 2400mm single roller door (Roller Door 21.24) specification on plan",
        unitPrice: 1950,
        description: "Dedicated 2100mm × 2400mm single roller door (Roller Door 21.24) added for 3rd garage car bay (variation cost above square meter rate).",
      },
      upg_ceiling_2740: {
        id: "upg_ceiling_2740",
        name: "2740mm (9ft) Ground Floor Ceiling Height Upgrade",
        category: "internal_general",
        baseline: "Standard 2440mm ceiling height",
        detected: "2740mm Ceilings GF annotation on plan",
        unitPrice: 6850,
        description: "Increased ceiling height to 2740mm on Ground Floor living zones.",
      },
      upg_front_balcony: {
        id: "upg_front_balcony",
        name: "Front Architectural Feature Balcony",
        category: "structural",
        baseline: "Standard facade without upper balcony (0.00 m²)",
        detected: "Upper floor feature balcony added over porch",
        unitPrice: 0,
        description: "Upper floor feature balcony added above front entry porch.",
      },
    };

    if (parsedData.detectedInclusions && Array.isArray(parsedData.detectedInclusions)) {
      const normalizedInclusions = [];
      const seenSemanticKeys = new Set();

      for (const rawInc of parsedData.detectedInclusions) {
        const inc = typeof rawInc === "string" ? { name: rawInc, reason: rawInc, unitPrice: 0 } : rawInc;
        const lowerText = `${inc.id || ""} ${inc.name || ""} ${inc.description || ""} ${inc.reason || ""}`.toLowerCase();

        let matchedRule = FIXTURE_UPGRADE_MAP[inc.id];
        if (!matchedRule) {
          if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_single_roller_door;
          } else if (/ext\s*1020|1020\s*door|1020mm\s*door|1020\s*entry/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_entry_door_1020;
          } else if (/double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ensuite_double_vanity;
          } else if (/2740|9ft|ground\s*floor\s*ceiling|gf\s*ceiling/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ceiling_2740;
          } else if (/balcony|upper\s*balcony|porch\s*balcony/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_front_balcony;
          } else if (/ensuite.*wir|wir.*ensuite|bed.*ensuite|additional.*ensuite|ensuite.*fitout/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_additional_ensuite_wir;
          } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_living_media_conversion;
          }
        }

        const isOwner = !!inc.isByOwner;
        const finalItem = matchedRule
          ? {
              id: matchedRule.id,
              name: matchedRule.name,
              category: matchedRule.category,
              baseline: matchedRule.baseline,
              detected: matchedRule.detected,
              isByOwner: isOwner,
              isCustomItem: false,
              unitPrice: isOwner ? 0 : (inc.unitPrice !== undefined ? inc.unitPrice : matchedRule.unitPrice),
              quantity: inc.quantity || 1,
              reason: inc.reason || matchedRule.description,
            }
          : {
              ...inc,
              unitPrice: isOwner ? 0 : (inc.unitPrice ?? 0),
            };

        let semanticKey = finalItem.id || finalItem.name.toLowerCase().trim();
        if (/ensuite.*wir|wir.*ensuite|additional.*ensuite|bed.*ensuite/i.test(lowerText)) {
          semanticKey = "sem_ensuite_wir";
        } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(lowerText)) {
          semanticKey = "sem_living_media";
        } else if (/double\s*vanity|dual\s*basin|twin\s*basin|double\s*basin/i.test(lowerText)) {
          semanticKey = "sem_double_vanity";
        } else if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
          semanticKey = "sem_roller_door";
        } else if (/1020|ext\s*1020/i.test(lowerText)) {
          semanticKey = "sem_entry_door_1020";
        } else if (/2740|gf\s*ceiling/i.test(lowerText)) {
          semanticKey = "sem_ceiling_2740";
        } else if (/balcony/i.test(lowerText)) {
          semanticKey = "sem_front_balcony";
        } else if (/bed\s*3.*wir/i.test(lowerText)) {
          semanticKey = "sem_bed3_wir";
        } else if (/bed\s*4.*wir/i.test(lowerText)) {
          semanticKey = "sem_bed4_wir";
        }

        if (!seenSemanticKeys.has(semanticKey)) {
          seenSemanticKeys.add(semanticKey);
          normalizedInclusions.push(finalItem);
        }
      }

      // Universal: If 3rd car bay added and roller door not yet included, add it
      const hasThirdCarBayOrRollerDoor =
        (parsedData.areaModifications && parsedData.areaModifications.some((m) => m.zone === "garage" && m.deltaM2 >= 10.0)) ||
        /roller\s*door\s*21\.24|roller\s*door|triple\s*garage|3rd\s*car/i.test(rawText) ||
        /roller\s*door\s*21\.24|roller\s*door|triple\s*garage|3rd\s*car/i.test(parsedData.analysisNotes || "");
      if (hasThirdCarBayOrRollerDoor && !seenSemanticKeys.has("sem_roller_door")) {
        const roller = FIXTURE_UPGRADE_MAP.upg_single_roller_door;
        normalizedInclusions.push({
          id: roller.id,
          name: roller.name,
          category: roller.category,
          baseline: roller.baseline,
          detected: roller.detected,
          isByOwner: false,
          isCustomItem: false,
          unitPrice: roller.unitPrice,
          quantity: 1,
          reason: roller.description,
        });
      }

      parsedData.detectedInclusions = normalizedInclusions;
    }

    return res.status(200).json(parsedData);
  } catch (err) {
    console.error("Error in /api/analyze-floorplan:", err);
    return res.status(500).json({ error: err.message || "Failed to analyze floorplan." });
  }
}
