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

async function callGeminiWithFallback(apiKey, body) {
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.7-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { ok: true, text, model };
        }
      } else {
        const errTxt = await resp.text();
        lastError = `Model ${model} returned HTTP ${resp.status}: ${errTxt}`;
        console.warn(`[analyze-floorplan] ${model} failed (${resp.status}), falling back to next model...`);
      }
    } catch (err) {
      lastError = err.message;
      console.warn(`[analyze-floorplan] Network error calling ${model}:`, err.message);
    }
  }

  return { ok: false, error: lastError || "All Gemini models failed to respond" };
}

    // ----------------------------------------------------
    // MODE 1: IDENTIFY ONLY (Title Block & Sheet Header Recognition)
    // ----------------------------------------------------
    if (identifyOnly) {
      const identifyPrompt = `Inspect this floorplan drawing sheet. Identify the Hudson Homes house design model name printed in the title block or sheet header (e.g. "Burgundy 30", "Cedar 26", "Azure 23", "Amber 21", "Jasper 26", "Ashton 29", "Turquoise 31"), the housing type ("Single Storey" or "Double Storey"), and the total area in m².
Return ONLY valid JSON:
{
  "designName": string,
  "housingType": "Single Storey" | "Double Storey",
  "totalM2": number
}`;

      const geminiRes = await callGeminiWithFallback(key, {
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
      });

      if (!geminiRes.ok) {
        return res.status(502).json({ error: "Gemini API error during identification", details: geminiRes.error });
      }

      const parsedId = JSON.parse(geminiRes.text);
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

CRITICAL ARCHITECTURAL GROUND TRUTH & IMMUNITY RULES:
1. STANDARD BROCHURE BASELINE IMMUNITY ($0 INCLUDED):
   - Every Hudson Homes design includes:
     * Master Bedroom (Bed 1) Ensuite (ENS) and Walk-in Robe (WIR) — STANDARD INCLUDED ($0).
     * Standard Kitchen Island Bench with 20mm stone — STANDARD INCLUDED ($0).
     * Built-in robes to Bedrooms 2, 3, 4 — STANDARD INCLUDED ($0).
     * Double Garage, Porch, and Alfresco as shown on standard plan — STANDARD INCLUDED ($0).
   - NEVER report Bed 1 Ensuite, Bed 1 WIR, Kitchen Island, or standard robes as modifications or upgrades!
   - Upgrades ONLY apply if an ADDITIONAL ensuite is created for a secondary bedroom (Bed 2, Bed 3, or Bed 4) or marked with explicit modification redlines.

2. SINGLE STOREY PHYSICAL INVARIANTS:
   - If the home is "Single Storey", there is physically NO upper floor, NO first floor living, NO upper balcony, and NO upper structural beam.
   - NEVER report balconies or upper floor beams for a Single Storey design!

3. THOROUGH ROOM-BY-ROOM AUDIT & COMPARISON (DO NOT ASSUME IDENTICAL):
   - You MUST conduct a meticulous room-by-room, door-by-door, and dimension-by-dimension audit comparing Image 2 against Image 1.
   - Do NOT assume Image 2 is identical just because it says "${suggestedDesign}" in the title block. Many plans are customized (e.g. "${suggestedDesign} Custom").
   - CRITICAL NOTE ON MARGIN TABLES: Draftsmen and clients often modify wall lines, push out alfrescos, or step out garage walls WITHOUT updating the printed schedule table in the margin (which often still shows the original brochure numbers). DO NOT RELY ON THE PRINTED TABLE TO DECIDE IF WALLS MOVED! You must inspect the actual drawn wall lines and room boundaries in Image 2 vs Image 1.
   - Check every room label, wall line, and dimension on Image 2 against Image 1:
     * Outdoor Alfresco: Check the printed dimensions (e.g. 7.5x4.0 vs standard 4.5x3.0) OR if the slab/roofline visibly extends further rearward or northward along adjacent bedrooms past the standard baseline boundary. If larger, report "alfresco" area extension with calculated deltaM2!
     * Garage: Check if the garage is widened or stepped outward (e.g. right wall stepped out beyond living wall line, 5.7x5.7 vs 5.5x5.5, or 3rd car bay / triple garage addition). Report "garage" area extension!
     * Front Entry Door: Check if Image 2 marks "EXT 1200" (1200mm door) or "EXT 1020" (1020mm door).
     * Master Ensuite: Check if the vanity has dual basins / twin mixers (double vanity upgrade) replacing the standard single basin.
     * Alfresco Doors: Check if a wide multi-panel sliding or stacking door ("STACKER" / "STACKER SLM" / "STACKER 21.36") replaces standard sliding doors.
     * Ground Floor Bathroom: Check if the ground floor powder room has been converted to a full bathroom with a shower recess, or if a guest suite is added.
     * Secondary Bedrooms (Bed 2, Bed 3, Bed 4): Check if Bed 4 or Bed 3 has been upgraded with its own private Ensuite (ENS) and Walk-in Robe (WIR).
     * Ceilings: Check if high ceilings are annotated (e.g. "2740mm Ceilings GF").
   - If and ONLY if Image 2 is truly an unmodified standard brochure copy with identical dimensions, flush walls, and zero alterations, set isModified: false, areaModifications: [], detectedInclusions: [].

4. SPATIAL & FOOTPRINT PERIMETER COMPARISON:
   - If external walls have NOT moved and room dimensions match Image 1: externalFootprintChanged: false, areaModifications: [].
   - If external walls or outdoor slabs HAVE visibly moved outward (e.g. rear alfresco pushout, living extension, garage widening):
     * Set externalFootprintChanged: true.
     * Add to areaModifications with zone, deltaM2, and dimensions.

5. VERIFIED FIXTURE UPGRADES & MODIFICATIONS (Only report if explicitly marked or changed):
   - "2740mm Ceilings GF" -> category: "internal_general", unitPrice: 6850, ceilingHeightM: 2.74
   - Extended kitchen island with 40mm waterfall stone ends -> category: "internal_kitchen", unitPrice: 1950
   - Master Ensuite Double Basin Vanity -> category: "internal_bathroom", unitPrice: 1280
   - 1200mm Wide Grand Architectural Front Entry Door ("EXT 1200") -> category: "doors_windows", unitPrice: 1250
   - 1020mm Wide Front Entry Door ("EXT 1020") -> category: "doors_windows", unitPrice: 850
   - Aluminum Stacker Sliding Door to Alfresco ("STACKER" / "STACKER SLM" / "STACKER 21.36") -> category: "doors_windows", unitPrice: 1850
   - Ground Floor Full Bathroom Addition / Conversion (shower recess, vanity, toilet) -> category: "internal_bathroom", unitPrice: 7800
   - Additional 21.24 single roller door (for 3rd car bay or rear yard access) -> category: "doors_windows", unitPrice: 1950
   - Secondary bedroom (Bed 2/3/4) converted to private Ensuite & WIR -> category: "internal_bathroom", unitPrice: 12500
   - For any items marked "by owner" / "NIC", set isByOwner: true, unitPrice: 0.

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

    const geminiRes = await callGeminiWithFallback(key, {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    if (!geminiRes.ok) {
      return res.status(502).json({ error: "Gemini API error during visual diffing", details: geminiRes.error });
    }

    const parsedData = JSON.parse(geminiRes.text);

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
      upg_entry_door_1200: {
        id: "upg_entry_door_1200",
        name: "1200mm Grand Architectural Front Entry Door Upgrade",
        category: "doors_windows",
        baseline: "Standard 820mm / 920mm painted entrance door",
        detected: "1200mm wide feature front entrance door notation ('EXT 1200') on plan",
        unitPrice: 1250,
        description: "1200mm wide architectural feature front entrance door upgrade ('EXT 1200' on plan).",
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
      upg_alfresco_stacker_door: {
        id: "upg_alfresco_stacker_door",
        name: "3-Panel Aluminum Stacker Sliding Door to Alfresco",
        category: "doors_windows",
        baseline: "Standard 2-panel sliding glass door",
        detected: "Multi-panel stacking sliding door system ('STACKER' / 'STACKER SLM')",
        unitPrice: 1850,
        description: "Multi-panel stacking sliding door upgrade to covered alfresco.",
      },
      upg_gf_bathroom_addition: {
        id: "upg_gf_bathroom_addition",
        name: "Ground Floor Full Bathroom Addition / Conversion",
        category: "internal_bathroom",
        baseline: "Standard powder room (toilet and basin only)",
        detected: "Full Ground Floor Bathroom with shower recess, vanity, and toilet",
        unitPrice: 7800,
        description: "Conversion of powder room or addition of full Ground Floor Bathroom with shower recess, vanity, and toilet.",
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

    if (suggestedDesign && suggestedDesign !== "UNSELECTED") {
      parsedData.detectedModelName = suggestedDesign;
      parsedData.housingType = housingType || "Single Storey";
    }

    if (parsedData.detectedInclusions && Array.isArray(parsedData.detectedInclusions)) {
      const normalizedInclusions = [];
      const seenSemanticKeys = new Set();
      const isDouble = housingType === "Double Storey" || /double|two\s*stor/i.test(suggestedDesign);

      for (const rawInc of parsedData.detectedInclusions) {
        const inc = typeof rawInc === "string" ? { name: rawInc, reason: rawInc, unitPrice: 0 } : rawInc;
        const lowerText = `${inc.id || ""} ${inc.name || ""} ${inc.description || ""} ${inc.reason || ""}`.toLowerCase();

        // 1. Discard standard baseline inclusions (master ensuite, robes, kitchen island, etc.)
        const isStandardBaseline =
          /standard\s*(?:master|suite|bedroom|ensuite|robe|wir|island|pantry|allocation|inclusion|layout|plan|feature|open\s*joinery)/i.test(lowerText) ||
          /standard\s*(?:facade|single|tub|sliding|door|garage|alfresco|porch)/i.test(lowerText) ||
          (inc.unitPrice === 0 && !inc.isCustomItem && /standard/i.test(inc.reason || "")) ||
          /standard\s*brochure/i.test(lowerText);

        const isBed1OrMasterEnsuiteWir =
          /bed\s*1\s*(?:ensuite|wir)|master\s*(?:ensuite|wir|suite|robe)|main\s*(?:ensuite|wir)|bed\s*1.*wir|ensuite\s*to\s*bed\s*1/i.test(lowerText) ||
          ((/ensuite/i.test(lowerText) || /wir/i.test(lowerText)) &&
            !/bed\s*[2-5]|second|2nd|guest|opt|optional|additional|added|conversion/i.test(lowerText) &&
            !/double\s*vanity|dual\s*basin/i.test(lowerText));

        const isStandardIsland =
          /island\s*bench|kitchen\s*island/i.test(lowerText) &&
          !/waterfall|40mm|stone\s*ends|mitred/i.test(lowerText);

        const isStandardGarage =
          /double\s*garage|std\s*garage|2\s*car\s*garage/i.test(lowerText) &&
          !/ext|extension|widened|widening|3rd\s*car|triple|roller\s*door/i.test(lowerText);

        const isStandardAlfrescoPorch =
          /standard\s*(?:alfresco|porch)|entry\s*porch|covered\s*alfresco/i.test(lowerText) &&
          !/ext|extension|push-out|extended|enclos/i.test(lowerText);

        if (
          (isStandardBaseline && !/upgrade|additional|added|extended|push-out|markup|custom/i.test(lowerText)) ||
          isBed1OrMasterEnsuiteWir ||
          isStandardIsland ||
          isStandardGarage ||
          isStandardAlfrescoPorch
        ) {
          continue; // Standard brochure inclusion - immune from extra charges!
        }

        // 2. Single Storey Invariants: No balconies or upper floor features
        if (!isDouble && /balcony|upper\s*floor|first\s*floor|structural\s*beam/i.test(lowerText)) {
          continue;
        }

        // 3. Discard pseudo-inclusions like model change
        if (/model\s*(?:design\s*)?change|model\s*swap/i.test(lowerText)) {
          continue;
        }

        let matchedRule = FIXTURE_UPGRADE_MAP[inc.id];
        if (!matchedRule) {
          if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_single_roller_door;
          } else if (/ext\s*1200|1200\s*door|1200mm\s*door|1200\s*entry|1200\s*front/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_entry_door_1200;
          } else if (/ext\s*1020|1020\s*door|1020mm\s*door|1020\s*entry|1020\s*front/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_entry_door_1020;
          } else if (/stacker|stacking/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_alfresco_stacker_door;
          } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_gf_bathroom_addition;
          } else if (/double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ensuite_double_vanity;
          } else if (/2740|9ft|ground\s*floor\s*ceiling|gf\s*ceiling/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ceiling_2740;
          } else if (isDouble && /balcony|upper\s*balcony|porch\s*balcony/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_front_balcony;
          } else if (/additional\s*ensuite|2nd\s*ensuite|second\s*ensuite|guest\s*ensuite|bed\s*[2-5]\s*ensuite|opt\s*ensuite/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_additional_ensuite_wir;
          } else if (/storage\s*conversion|study\s*conversion|convert.*media/i.test(lowerText)) {
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
        if (/bed\s*4.*(?:ensuite|wir)|bed\s*4/i.test(lowerText)) {
          semanticKey = "sem_bed4_wir";
        } else if (/bed\s*3.*(?:ensuite|wir)|bed\s*3/i.test(lowerText)) {
          semanticKey = "sem_bed3_wir";
        } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(lowerText)) {
          semanticKey = "sem_gf_bathroom";
        } else if (/ensuite.*wir|wir.*ensuite|additional.*ensuite|bed.*ensuite/i.test(lowerText)) {
          semanticKey = "sem_ensuite_wir";
        } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(lowerText)) {
          semanticKey = "sem_living_media";
        } else if (/double\s*vanity|dual\s*basin|twin\s*basin|double\s*basin/i.test(lowerText)) {
          semanticKey = "sem_double_vanity";
        } else if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
          semanticKey = "sem_roller_door";
        } else if (/1200|ext\s*1200/i.test(lowerText)) {
          semanticKey = "sem_entry_door_1200";
        } else if (/1020|ext\s*1020/i.test(lowerText)) {
          semanticKey = "sem_entry_door_1020";
        } else if (/stacker|stacking/i.test(lowerText)) {
          semanticKey = "sem_stacker_door";
        } else if (/2740|gf\s*ceiling/i.test(lowerText)) {
          semanticKey = "sem_ceiling_2740";
        } else if (/balcony/i.test(lowerText)) {
          semanticKey = "sem_front_balcony";
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
