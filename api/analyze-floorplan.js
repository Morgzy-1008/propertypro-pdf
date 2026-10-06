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
  const models = [
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];
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
    // MODE 1: IDENTIFY ONLY (Title Block, Cursive Script & Schedule Recognition)
    // ----------------------------------------------------
    if (identifyOnly) {
      const identifyPrompt = `Inspect this floorplan drawing sheet.
1. Identify the Hudson Homes house design model name printed anywhere on the sheet:
   - Look in the title block, sheet header, drawing notes, or custom project title (e.g. "Haidyn & Kristen's New Residence / Azure 19 Modified").
   - CAREFULLY READ cursive, handwriting, or script fonts (such as 'Dancing Script' commonly rendered by Foresight Concept Floorplan Editor).
   - Strip suffixes like "Modified", "Concept", "Rev A", "Rev 1", "Custom" to return the exact master Hudson model name (e.g. "Azure 19 Modified" -> "Azure 19", "Amber 21 Concept" -> "Amber 21", "Burgundy 30 Rev A" -> "Burgundy 30").
   - Common Hudson models: Azure 19, Azure 21, Azure 23, Azure 25, Azure 26, Amber 21, Amber 24, Jasper 26, Ashton 29, Burgundy 30, Cedar 26, Turquoise 31, etc.
2. Identify the housing type: "Single Storey" or "Double Storey".
3. Extract the printed Area Schedule specifications table:
   - Locate and transcribe the printed Area Schedule table anywhere on the sheet (title block, margin notes, drawing header, corner schedule), regardless of font style, handwriting, or cursive script.
   - Living Area (m²)
   - Ground Floor Living Area (m²)
   - First Floor Living Area (m²)
   - Garage Area (m²)
   - Alfresco Area (m²)
   - Porch Area (m²)
   - Total Area (m²)
   - Overall Width (m)
   - Overall Length (m)

Return ONLY valid JSON:
{
  "designName": string,
  "housingType": "Single Storey" | "Double Storey",
  "totalM2": number,
  "scheduleTable": {
    "livingM2": number,
    "groundLivingM2": number,
    "firstLivingM2": number,
    "garageM2": number,
    "alfrescoM2": number,
    "porchM2": number,
    "totalM2": number,
    "widthM": number,
    "lengthM": number
  },
  "rawTitleFound": string
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
      if (parsedId.designName) {
        // Strip suffixes
        parsedId.designName = parsedId.designName.replace(/\s*(?:modified|concept|rev(?:ision)?\s*[a-z0-9.]*|custom)\b/gi, "").trim();
      }
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
        const coreDesign = cleanDesign.replace(/\s*mk\s*(?:2|ii|\d+)/g, "").replace(/\s*custom|\s*modified/g, "").trim();

        if (fs.existsSync(floorplansDir)) {
          const files = fs.readdirSync(floorplansDir);
          const match = files.find((f) => {
            const fn = f.toLowerCase().replace(/\.png$/, "").trim();
            const coreFn = fn.replace(/classic|brochure|rh|sh/g, "").replace(/\s*mk\s*(?:2|ii|\d+)/g, "").trim();
            return (
              fn === cleanDesign ||
              fn === coreDesign ||
              coreFn === coreDesign ||
              fn.startsWith(cleanDesign + " ") ||
              fn.startsWith(coreDesign + " ") ||
              fn.startsWith(coreDesign + "_") ||
              coreDesign.startsWith(fn)
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
   - CRITICAL: SCHEDULE TABLE EXTRACTION (EXCLUSIVELY FROM IMAGE 2):
     * You MUST extract "scheduleTable" ONLY from IMAGE 2 (the candidate drawing). NEVER copy or transcribe the table from Image 1! Image 1 is strictly for visual geometric baseline reference.
     * Locate and transcribe the printed Area Schedule table on Image 2 (commonly bottom-left corner, title block, or margin notes):
       Living Area (m²), Garage Area (m²), Alfresco Area (m²), Porch Area (m²), Total Area (m²).
     * If an Area Schedule table exists on Image 2, transcribe its exact numbers into "scheduleTable".

   - FOR PLANS WITHOUT A PRINTED AREA SCHEDULE TABLE (DIMENSION-BASED DERIVATION):
     * If Image 2 does NOT have a printed area schedule table (or only has room dimension callouts):
       - Read the room callouts and dimensions printed on Image 2:
         * Outdoor Alfresco (e.g. "Alfresco 5.3 x 3.6" -> 5.3 × 3.6 = 19.08 m²). Compare to standard baseline ${standardAlfrescoM2} m².
         * Garage (e.g. "Garage 5.7 x 6.0" -> 34.20 m² internal, ~38.4 m² slab). Compare to standard baseline ${standardGarageM2} m².
         * Front Porch (e.g. "Porch 2.0 x 4.3" -> 8.60 m² or slab footprint). Compare to standard baseline ${standardPorchM2} m².
         * Living/Family/Dining/Bedrooms: read internal room sizes, sum habitable spaces, and compare to standard baseline ${standardLivingM2} m².
       - Populate "scheduleTable" with these derived m² values!
       - Explicitly output "areaModifications" showing the exact zone deltas!

   - Check every room label, wall line, and dimension on Image 2 against Image 1:
     * Outdoor Alfresco: Check printed dimensions (e.g. 5.3x3.6 vs 3.8x2.2 or 7.5x4.0 vs 4.5x3.0) OR if the concrete slab and roofline visibly extends further rearward or northward along adjacent bedrooms (Bed 3, Children's Activity) past the standard baseline boundary out to the rear building line. If extended, report "alfresco" area extension with calculated deltaM2!
     * Garage: Check if the garage is widened or stepped outward (e.g. right wall stepped out beyond living/laundry wall line, 5.7x5.7 vs 5.5x5.5, or dedicated storage/workshop bay addition). If extended, report "garage" area extension with calculated deltaM2!
     * Kitchen Island Sinks: Compare the kitchen island sink fixture. Standard is a 1.5 bowl top-mount / drop-in sink with a drainer tray. If upgraded to a DOUBLE UNDERMOUNT SINK (two equal square/rectangular bowls seamlessly undermounted with NO drainer board), report this as an inclusion upgrade!
     * Butler's Pantry / Walk-In Pantry (WIP): Check inside the Walk-In Pantry. Standard has dry perimeter shelving with NO sink. If a secondary prep sink, tapware, and water/drainage plumbing is added to the bench, report this as an inclusion upgrade!
     * Window to Sliding Door Conversions: Check if an external window (e.g. in the Children's Activity room or secondary bedroom) has been replaced with an aluminum sliding glass door ('SD' or sliding door line/arrow symbol) providing direct access onto the Alfresco.
     * Kitchen Splashback Window: Check if the fixed glass picture splashback window behind the cooktop is enlarged or panoramic ('PW 06.30').
     * Bedroom & Living Window Size Upgrades: Check if any bedroom window (e.g. Bed 4) is enlarged or scheduled with upgraded glazing dimensions (e.g. 'SW 12.24' vs standard).
     * Garage External Personal Access Door: Check if a weatherproof pedestrian door ('EXT 820' or 'EXT 920') has been added to the rear or side of the garage.
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
   - For ANY item marked "by owner", "client supply", or "NIC" (not in contract): set isByOwner: true, unitPrice: 0.

5. VERIFIED FIXTURE UPGRADES & MODIFICATIONS (Include in detectedInclusions if present):
   - Kitchen Island Double Undermount Sink -> id: "upg_kitchen_double_undermount_sink", name: "Kitchen Island Double Undermount Sink Upgrade", category: "internal_kitchen", unitPrice: 850
   - Kitchen Island Single Undermount Sink -> id: "upg_kitchen_single_undermount_sink", name: "Kitchen Island Single Large Undermount Sink Upgrade", category: "internal_kitchen", unitPrice: 650
   - Butler's Pantry (WIP) Prep Sink & Plumbing Rough-In -> id: "upg_butlers_prep_sink", name: "Butler's Pantry / WIP Prep Sink & Plumbing Rough-In", category: "internal_kitchen", unitPrice: 1250
   - Window to Sliding Door Conversion (e.g. Children's Activity SD 21.27) -> id: "upg_window_to_sliding_door", name: "Window Upgraded to Sliding Glass Door (SD)", category: "doors_windows", unitPrice: 1650
   - Kitchen Extended Picture Splashback Window (PW 06.30) -> id: "upg_kitchen_splashback_window", name: "Kitchen Extended Picture Splashback Window (PW)", category: "doors_windows", unitPrice: 720
   - Enlarged Bedroom Window (e.g. Bed 4 SW 12.24) -> id: "upg_window_size_upgrade", name: "Enlarged Bedroom / Living Window Size Upgrade", category: "doors_windows", unitPrice: 480
   - Garage External Personal Access Door (EXT 820) -> id: "upg_garage_access_door", name: "External Weatherproof Personal Access Door to Garage (EXT 820)", category: "doors_windows", unitPrice: 950
    - "2740mm Ceilings GF" -> id: "upg_ceiling_2740", name: "2740mm (9ft) Ground Floor Ceiling Height Upgrade", category: "internal_general", unitPrice: 6850
    - 2900mm Raised Living Ceiling Height Feature Upgrade -> id: "upg_ceiling_2900_living", name: "2900mm Raised Living Ceiling Height Feature Upgrade", category: "internal_general", unitPrice: 2450
    - Extended kitchen island with 40mm waterfall stone ends -> id: "upg_kitchen_island_waterfall", name: "Extended Island Benchtop with 40mm Waterfall Stone Ends", category: "internal_kitchen", unitPrice: 1950
    - Master Ensuite Double Basin Vanity -> id: "upg_ensuite_double_vanity", name: "Master Ensuite Double Basin Vanity Upgrade", category: "internal_bathroom", unitPrice: 1280
    - 1200mm Wide Grand Architectural Front Entry Door ("EXT 1200") -> id: "upg_entry_door_1200", name: "1200mm Grand Architectural Front Entry Door Upgrade", category: "doors_windows", unitPrice: 1250
    - 1020mm Wide Front Entry Door ("EXT 1020") -> id: "upg_entry_door_1020", name: "1020mm Wide Architectural Front Entry Door Upgrade", category: "doors_windows", unitPrice: 850
    - Aluminum Stacker Sliding Door to Alfresco ("STACKER" / "STACKER SLM" / "STACKER 21.36" / "STACKER 21.30") -> id: "upg_alfresco_stacker_door", name: "3-Panel Aluminum Stacker Sliding Door to Alfresco", category: "doors_windows", unitPrice: 1850
    - Ground Floor Full Bathroom Addition / Conversion (shower recess, vanity, toilet) -> id: "upg_gf_bathroom_addition", name: "Ground Floor Full Bathroom Addition / Conversion", category: "internal_bathroom", unitPrice: 7800
    - Additional 21.24 single roller door (ONLY for 3rd car bay or rear yard access, NOT for standard double garage roller door 21.48) -> id: "upg_single_roller_door", name: "Additional 2100mm × 2400mm Colorbond Single Roller Door", category: "doors_windows", unitPrice: 1950
    - Dedicated Study Room / Home Office Addition -> id: "upg_study_addition", name: "Dedicated Home Office / Study Addition", category: "internal_general", unitPrice: 2850
    - Mudroom / Mud Nook Joinery Fit-Out -> id: "upg_mudroom_fitout", name: "Mudroom / Mud Nook Joinery Fit-Out", category: "internal_general", unitPrice: 1250
    - Grand 3.5m Servery / Preparation Island Benchtop -> id: "upg_kitchen_island_prep", name: "Grand 3.5m Servery / Preparation Island Benchtop", category: "internal_kitchen", unitPrice: 2450
    - Separate Powder Room ("PDR" / WC + basin) Addition -> id: "upg_powder_room_addition", name: "Ground Floor Powder Room / Additional WC Addition", category: "internal_bathroom", unitPrice: 2450
    - Secondary bedroom (Bed 2/3/4) converted to private Ensuite & WIR -> id: "upg_additional_ensuite_wir", name: "Additional Bedroom Ensuite & Walk-in Robe Fitout", category: "internal_bathroom", unitPrice: 12500
    - Front Balcony (Upper Floor Double Storey only) -> id: "upg_front_balcony", name: "Front Architectural Feature Balcony", category: "structural", unitPrice: 0
    - Enlarged Master Ensuite Shower Recess (1200x900 or walk-in) -> id: "upg_ensuite_larger_shower", name: "Enlarged Master Ensuite Shower Recess Upgrade", category: "internal_bathroom", unitPrice: 650
    - Ground Floor Powder Room Conversion with Vanity Basin (separate WC converted to private Powder Room with vanity) -> id: "upg_powder_room_vanity_conversion", name: "Ground Floor Powder Room Conversion with Vanity Basin & Tapware", category: "internal_bathroom", unitPrice: 1850
    - Butler's Pantry Joinery & Prep Sink Package (LHS of Kitchen) -> id: "upg_butlers_pantry_lhs_sink", name: "Butler's Pantry Joinery & Prep Sink Package (LHS of Kitchen)", category: "internal_kitchen", unitPrice: 2450
    - Cornerless 90-Degree Stacker Sliding Door System with Steel Lintel Framing -> id: "upg_cornerless_stacker_door", name: "Cornerless 90-Degree Stacker Sliding Door System with Steel Lintel", category: "doors_windows", unitPrice: 5027
    - Freestanding Luxury Acrylic Bath (e.g. Urbane II 1775mm) -> id: "upg_freestanding_bath", name: "Freestanding Acrylic Bath Upgrade (e.g. Urbane II 1775mm)", category: "internal_bathroom", unitPrice: 1650
    - Double Walk-In Shower with Dual Rainwater Heads & Full-Length Channel Grate (Bath Removed) -> id: "upg_double_shower_dual_heads", name: "Double Walk-In Shower with Dual Overhead Rainwater Heads & Full-Length Channel Grate", category: "internal_bathroom", unitPrice: 1450
    - Full Height Floor-to-Ceiling Wall Tiling ("FULL HT. TILING") -> id: "upg_full_height_wall_tiling", name: "Full Height Floor-to-Ceiling Ceramic/Porcelain Wall Tiling", category: "internal_bathroom", unitPrice: 3250
    - Architectural Square Set Ceiling Cornice ("SQ. SET") -> id: "upg_square_set_ceilings", name: "Architectural Square Set Ceiling Cornice Upgrade", category: "internal_general", unitPrice: 1850
    - Architectural Feature Sliding Barn Door with Exposed Track -> id: "upg_feature_barn_door", name: "Architectural Feature Sliding Barn Door with Exposed Track", category: "doors_windows", unitPrice: 850
    - Laundry 20mm Engineered Stone Benchtop Extension -> id: "upg_laundry_stone_benchtop", name: "Laundry 20mm Engineered Stone Benchtop Extension", category: "internal_laundry", unitPrice: 1107
    - Laundry Overhead Wall Storage Cupboards Package -> id: "upg_laundry_overhead_cupboards", name: "Laundry Overhead Cupboards Joinery Package", category: "internal_laundry", unitPrice: 1471
    - Scullery / Walk-In Pantry 20mm Stone Benchtop Fitout -> id: "upg_scullery_stone_extension", name: "Scullery / Walk-In Pantry 20mm Engineered Stone Benchtop Fitout", category: "internal_kitchen", unitPrice: 2450
    - Architectural Feature Front Gable Roof Pitch Feature -> id: "upg_facade_front_gable", name: "Architectural Feature Front Gable Roof Pitch Feature", category: "structural", unitPrice: 819
    - Dual 18-09 Large Format Glazing Windows -> id: "upg_dual_1809_windows", name: "Dual 18-09 Large Format Glazing in lieu of Standard Opening", category: "doors_windows", unitPrice: 319

6. INTERNAL ROOM CHANGES & ZERO-COST LAYOUT VARIATIONS (Include in internalRoomChanges if present):
   - Cinema room (3.3 × 2.6) with BARN 1200 sliding barn door -> id: "mod_room_cinema_barn", roomName: "Cinema room (3.3 × 2.6) with BARN 1200 sliding barn door", roomType: "cinema", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Formal living area enclosed to create private Cinema (3.3m x 2.6m) with feature BARN 1200 sliding barn door ($0.00 Dry Variation)."
   - Central Core Reconfiguration: Study / WIL combination room & circulation -> id: "mod_room_core_study_wil", roomName: "Central Core Reconfiguration: Study / WIL combination room & circulation", roomType: "study", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Central study nook and linen store reconfigured into enclosed Study/WIL room with Mud Nook bench joinery framing ($0.00 Dry Variation)."
   - Mud Nook with bench joinery framing -> id: "mod_room_mud_nook", roomName: "Mud Nook with bench joinery framing", roomType: "other", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Mud Nook transition zone with custom bench joinery and drop zone framing ($0.00 Dry Variation)."
   - Butler's Pantry ("Butlers") with CSD 820 pocket slider framing -> id: "mod_room_butlers_csd", roomName: "Butler's Pantry (\"Butlers\") with CSD 820 pocket slider framing", roomType: "kitchen", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Butler's Pantry created with CSD 820 pocket slider framing ($0.00 Dry Variation)."
   - Realigned partition walls around Bed 1, WIR, Ensuite CSD 820, hallway, and Bed 3 -> id: "mod_room_dry_framing", roomName: "Realigned partition walls around Bed 1, WIR, Ensuite CSD 820, hallway, and Bed 3", roomType: "other", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Internal timber stud partition framing realigned between Bed 1, WIR, Ensuite CSD 820, hallway, Bed 3, Linen, and Mud Nook ($0.00 Dry Variation)."
   - Master Bed 1 Relocated to Rear Wing -> if Bed 1 / Master Suite is repositioned to rear private garden wing:
     id: "mod_room_bed1_rear", roomName: "Master Bedroom (Bed 1), Ensuite & WIR Relocated to Rear Wing", roomType: "bedroom", deltaM2: 0, isZeroCost: true, subtotal: 0, description: "Master bedroom suite, private ensuite, and walk-in robe repositioned from front facade elevation to rear private garden wing for enhanced privacy and noise isolation. Internal dry partition wall realignment ($0.00 Dry Variation)."
   - Master Ensuite & Wet Area Footprint Expansion -> if Ensuite or wet areas expanded in m²:
     id: "mod_room_wet_ext_master_ensuite", roomName: "Master Ensuite & Wet Area Footprint Expansion", roomType: "ensuite", deltaM2: 2.6, isZeroCost: false, baseRatePerM2: 150, unitRate: 150, subtotal: 390, description: "Master Ensuite expanded by +2.60 m². Includes $150.00/m² base wet area preparation (waterproofing membrane, screed bed to fall, sub-floor plumbing rough-in)."

8. DOORS & WINDOWS SCHEDULE AUDIT (Include in openingTags list):
   - Transcribe every explicit door and window callout text printed on Image 2 (e.g. "STACKER 21.36", "STACKER 21.30", "SD 21.12", "CSD 820", "EXT 1020", "EXT 1200", "BARN 1200", "RD 21.48", "SW 12.21", "SW 12.24", "FW 06.12", "PW 06.30").
   - If an opening code or tag is visible, add it to "openingTags": ["STACKER 21.30", "CSD 820", "EXT 1020", "RD 21.48", "BARN 1200", "SW 12.21", "SW 12.24", "FW 06.12"]

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
  "openingTags": string[],
  "scheduleTable": {
    "livingM2": number,
    "groundLivingM2": number,
    "firstLivingM2": number,
    "garageM2": number,
    "alfrescoM2": number,
    "porchM2": number,
    "totalM2": number,
    "widthM": number,
    "lengthM": number
  },
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
  ],
  "internalRoomChanges": [
    {
      "id": string,
      "roomName": string,
      "roomType": string,
      "furnitureDetected": string[],
      "deltaM2": number,
      "description": string,
      "isZeroCost": boolean,
      "category": string,
      "baseRatePerM2": number,
      "finishesRatePerM2": number,
      "unitRate": number,
      "subtotal": number,
      "accepted": boolean
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

    let cleanJson = (geminiRes.text || "").trim();
    if (cleanJson.includes("```")) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      cleanJson = match ? match[1].trim() : cleanJson.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    }
    const parsedData = JSON.parse(cleanJson);

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
      upg_ceiling_2900_living: {
        id: "upg_ceiling_2900_living",
        name: "2900mm Raised Living Ceiling Height Feature Upgrade",
        category: "internal_general",
        baseline: "Standard flat 2440mm / 2590mm ceiling height throughout",
        detected: "2900mm raised ceiling height specification over living zone",
        unitPrice: 2450,
        description: "Architectural 2900mm raised ceiling height feature over the main living/dining domain, including raised window headers and bulkheads.",
      },
      upg_kitchen_double_undermount_sink: {
        id: "upg_kitchen_double_undermount_sink",
        name: "Kitchen Island Double Undermount Sink Upgrade",
        category: "internal_kitchen",
        baseline: "Standard 1.5 bowl drop-in stainless steel sink with drainer",
        detected: "Double bowl undermount stainless steel / granite sink seamless stone cutouts",
        unitPrice: 850,
        description: "Seamless double bowl undermount sink installation to island bench with polished cutouts.",
      },
      upg_kitchen_single_undermount_sink: {
        id: "upg_kitchen_single_undermount_sink",
        name: "Kitchen Island Single Large Undermount Sink Upgrade",
        category: "internal_kitchen",
        baseline: "Standard 1.5 bowl drop-in stainless steel sink with drainer",
        detected: "Single large undermount sink with polished stone cutout",
        unitPrice: 650,
        description: "Large single bowl undermount sink installation to island bench.",
      },
      upg_butlers_prep_sink: {
        id: "upg_butlers_prep_sink",
        name: "Butler's Pantry / WIP Prep Sink & Plumbing Rough-In",
        category: "internal_kitchen",
        baseline: "Dry Walk-In Pantry joinery shelves without plumbing or water",
        detected: "Secondary undermount prep sink, designer tapware, and water/drainage rough-in inside Butler's Pantry",
        unitPrice: 1250,
        description: "Secondary food preparation sink, tapware, and drainage rough-in to Butler's Pantry (WIP).",
      },
      upg_window_to_sliding_door: {
        id: "upg_window_to_sliding_door",
        name: "Window Upgraded to Sliding Glass Door (SD)",
        category: "doors_windows",
        baseline: "Standard fixed/sliding window glazing unit",
        detected: "Window opening upgraded to external aluminum sliding door ('SD' / SD 21.27) onto alfresco",
        unitPrice: 1650,
        description: "Conversion of window unit to external sliding door (e.g. Children's Activity to Alfresco).",
      },
      upg_kitchen_splashback_window: {
        id: "upg_kitchen_splashback_window",
        name: "Kitchen Extended Picture Splashback Window (PW)",
        category: "doors_windows",
        baseline: "Standard splashback tiling or short splashback window",
        detected: "Panoramic picture splashback window (e.g. PW 06.30) behind cooktop",
        unitPrice: 720,
        description: "Fixed picture splashback window unit providing natural light across kitchen workspace.",
      },
      upg_window_size_upgrade: {
        id: "upg_window_size_upgrade",
        name: "Enlarged Bedroom / Living Window Size Upgrade",
        category: "doors_windows",
        baseline: "Standard brochure scheduled window dimension",
        detected: "Window enlarged (e.g. SW 12.24 in Bed 4) providing increased natural light and airflow",
        unitPrice: 480,
        description: "Enlarged architectural window frame and glazing upgrade to bedroom or living zone.",
      },
      upg_garage_access_door: {
        id: "upg_garage_access_door",
        name: "External Weatherproof Personal Access Door to Garage (EXT 820)",
        category: "doors_windows",
        baseline: "Solid external garage perimeter wall without secondary pedestrian door",
        detected: "820mm external weatherproof personal access door ('EXT 820') on garage",
        unitPrice: 950,
        description: "External weatherproof personal access pedestrian door to rear/side yard.",
      },
      upg_study_addition: {
        id: "upg_study_addition",
        name: "Dedicated Home Office / Study Addition",
        category: "internal_general",
        baseline: "Standard open circulation space or secondary bedroom",
        detected: "Dedicated Study room layout incorporated into plan",
        unitPrice: 2850,
        description: "Dedicated Study room addition incorporated into floorplan.",
      },
      upg_mudroom_fitout: {
        id: "upg_mudroom_fitout",
        name: "Mudroom / Mud Nook Joinery Fit-Out",
        category: "internal_general",
        baseline: "Direct garage entry corridor without dedicated mudroom joinery",
        detected: "Dedicated Mudroom / Mud Nook joinery zone adjoining garage internal access",
        unitPrice: 1250,
        description: "Integrated mudroom transition zone with bench seating and joinery.",
      },
      upg_kitchen_island_prep: {
        id: "upg_kitchen_island_prep",
        name: "Grand 3.5m Servery / Preparation Island Benchtop",
        category: "internal_kitchen",
        baseline: "Standard 2400mm × 900mm island benchtop",
        detected: "Extended 3.5m × 1.0m island servery/prep benchtop notation on plan",
        unitPrice: 2450,
        description: "Grand extended 3.5m × 1.0m kitchen servery & preparation island benchtop.",
      },
      upg_powder_room_addition: {
        id: "upg_powder_room_addition",
        name: "Ground Floor Powder Room / Additional WC Addition",
        category: "internal_bathroom",
        baseline: "Standard floorplan without separate guest powder room",
        detected: "Separate Powder Room (PDR) addition with basin and toilet suite",
        unitPrice: 2450,
        description: "Dedicated guest powder room (PDR) added to floorplan layout.",
      },
      upg_kitchen_island_waterfall: {
        id: "upg_kitchen_island_waterfall",
        name: "Extended Island Benchtop with 40mm Waterfall Stone Ends",
        category: "internal_kitchen",
        baseline: "Standard 20mm edge island benchtop with laminate/panel ends",
        detected: "Extended island bench with 40mm edge profile and twin waterfall stone end drops",
        unitPrice: 1950,
        description: "40mm stone waterfall ends to kitchen island benchtop.",
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
      upg_ensuite_larger_shower: {
        id: "upg_ensuite_larger_shower",
        name: "Enlarged Master Ensuite Walk-In Shower Recess (1800mm × 900mm)",
        category: "internal_bathroom",
        baseline: "Standard 900mm × 900mm framed shower recess",
        detected: "Enlarged 1800mm × 900mm walk-in shower recess layout in Master Ensuite",
        unitPrice: 850,
        description: "Shower recess extended from standard 900mm × 900mm to 1800mm × 900mm (+900mm length)",
      },
      upg_powder_room_vanity_conversion: {
        id: "upg_powder_room_vanity_conversion",
        name: "Ground Floor Powder Room Conversion with Vanity Basin & Tapware",
        category: "internal_bathroom",
        baseline: "Standard separate WC compartment (toilet suite only, no vanity basin)",
        detected: "Dedicated guest Powder Room (Pdr) layout with integrated hand vanity basin & mixer",
        unitPrice: 1850,
        description: "Powder Room (Pdr) conversion with vanity basin and mixer tapware",
      },
      upg_butlers_pantry_lhs_sink: {
        id: "upg_butlers_pantry_lhs_sink",
        name: "Butler's Pantry with 2.1m Benchtop & Prep Sink (LHS)",
        category: "internal_kitchen",
        baseline: "Standard Walk-in / cupboard pantry with dry melamine shelving",
        detected: "Butler's Pantry layout to LHS of Kitchen with prep sink and 2.1m stone bench",
        unitPrice: 2450,
        description: "Butler's Pantry added to LHS of Kitchen with 2.1m benchtop and prep sink",
      },
      upg_cornerless_stacker_door: {
        id: "upg_cornerless_stacker_door",
        name: "Cornerless 90-Degree Stacker Sliding Door System with Steel Lintel",
        category: "doors_windows",
        baseline: "Standard 90° external corner wall or 2-panel sliding doors meeting at brick pier",
        detected: "Cornerless 90° stacking sliding door system connecting living and alfresco",
        unitPrice: 5027,
        description: "Cornerless 90° stacking sliding door system opening seamlessly without a corner column, including 400 joist structural steel lintel framing",
      },
      upg_freestanding_bath: {
        id: "upg_freestanding_bath",
        name: "Freestanding Acrylic Bath Upgrade (e.g. Urbane II 1775mm)",
        category: "internal_bathroom",
        baseline: "Standard inset acrylic bath in tiled hob surround",
        detected: "Freestanding 1775mm luxury bathtub specification on bathroom details",
        unitPrice: 1650,
        description: "Freestanding architectural luxury acrylic bath (e.g. Caroma Urbane II 1775mm) with floor-mounted bath mixer and smart tile waste",
      },
      upg_double_shower_dual_heads: {
        id: "upg_double_shower_dual_heads",
        name: "Double Walk-In Shower with Dual Overhead Rainwater Heads & Full-Length Channel Grate",
        category: "internal_bathroom",
        baseline: "Standard single 900mm × 900mm shower recess and bath",
        detected: "Double shower layout with dual rainwater heads and full length smart drain",
        unitPrice: 1450,
        description: "Master ensuite double walk-in shower conversion (bath deleted) with twin overhead rainwater shower heads, dual wall mixers, and full-length stainless steel tile insert channel grate",
      },
      upg_full_height_wall_tiling: {
        id: "upg_full_height_wall_tiling",
        name: "Full Height Floor-to-Ceiling Ceramic/Porcelain Wall Tiling",
        category: "internal_bathroom",
        baseline: "Standard 2000mm skirting / shower-height tiling with painted drywall above",
        detected: "Full height floor-to-ceiling tiling ('FULL HT. TILING' / 'F.G FULL HT.')",
        unitPrice: 3250,
        description: "Full height floor-to-ceiling tiling throughout bathroom or ensuite walls with polished aluminium edge trims and square corners",
      },
      upg_square_set_ceilings: {
        id: "upg_square_set_ceilings",
        name: "Architectural Square Set Ceiling Cornice Upgrade",
        category: "internal_general",
        baseline: "Standard 90mm Cove plasterboard cornice throughout",
        detected: "Architectural square set (SQ. SET) ceiling edge finish in lieu of cove cornice",
        unitPrice: 1850,
        description: "Architectural square set (SQ. SET) ceiling perimeter finish throughout living or wet areas in lieu of standard 90mm cove cornice",
      },
      upg_feature_barn_door: {
        id: "upg_feature_barn_door",
        name: "Architectural Feature Sliding Barn Door with Exposed Track",
        category: "doors_windows",
        baseline: "Standard hollow-core hinged internal door",
        detected: "Feature sliding barn door with exposed architectural track",
        unitPrice: 850,
        description: "Solid feature timber-look surface mounted barn sliding door with exposed black powder-coated top-hung track hardware",
      },
      upg_laundry_stone_benchtop: {
        id: "upg_laundry_stone_benchtop",
        name: "Laundry 20mm Engineered Stone Benchtop Extension",
        category: "internal_laundry",
        baseline: "Standard laminate laundry benchtop or freestanding metal tub",
        detected: "20mm engineered stone benchtop extended across laundry joinery run",
        unitPrice: 1107,
        description: "20mm engineered stone benchtop extended across full laundry joinery run with polished edges and undermount/drop-in sink cutout",
      },
      upg_laundry_overhead_cupboards: {
        id: "upg_laundry_overhead_cupboards",
        name: "Laundry Overhead Cupboards Joinery Package",
        category: "internal_laundry",
        baseline: "Open painted drywall above laundry benchtop (no overhead storage)",
        detected: "Full run overhead wall storage cupboards above laundry benchtop",
        unitPrice: 1471,
        description: "Full run overhead wall storage cupboards above laundry benchtop with soft-close hinges and concealed finger-pull lip",
      },
      upg_scullery_stone_extension: {
        id: "upg_scullery_stone_extension",
        name: "Scullery / Walk-In Pantry 20mm Engineered Stone Benchtop Fitout",
        category: "internal_kitchen",
        baseline: "Standard melamine shelving in Walk-In Pantry",
        detected: "Scullery / Walk-In Pantry joinery fitout with 20mm stone benchtop extension",
        unitPrice: 2450,
        description: "Custom scullery joinery fit-out with 20mm engineered stone benchtop extension, tiled splashback, and under-bench cupboards",
      },
      upg_facade_front_gable: {
        id: "upg_facade_front_gable",
        name: "Architectural Feature Front Gable Roof Pitch Feature",
        category: "structural",
        baseline: "Standard hip/valley roof truss profile",
        detected: "Accent front gable apex with feature cladding / batten lining",
        unitPrice: 819,
        description: "Accent architectural front gable feature apex with horizontal cladding / vertical batten infill lining",
      },
      upg_dual_1809_windows: {
        id: "upg_dual_1809_windows",
        name: "Dual 18-09 Large Format Glazing in lieu of Standard Opening",
        category: "doors_windows",
        baseline: "Standard single brochure window opening",
        detected: "Dual 1800mm × 900mm (18-09) feature sliding window pairing",
        unitPrice: 319,
        description: "Pair of 1800mm high × 900mm wide (18-09) architectural sliding windows with matching flyscreens in lieu of single standard opening",
      },
    };

    if (suggestedDesign && suggestedDesign !== "UNSELECTED") {
      parsedData.detectedModelName = suggestedDesign;
      parsedData.housingType = housingType || "Single Storey";
    }

    // Mathematical Identity Solver for Candidate Schedule Table: Total = Living + Garage + Alfresco + Porch
    if (parsedData.scheduleTable && parsedData.scheduleTable.totalM2 && parsedData.scheduleTable.totalM2 > 50) {
      const tot = parsedData.scheduleTable.totalM2;
      const liv = parsedData.scheduleTable.livingM2;
      const gar = parsedData.scheduleTable.garageM2;
      const alf = parsedData.scheduleTable.alfrescoM2;
      const por = parsedData.scheduleTable.porchM2;

      if (!alf && liv && gar && por) {
        const derivedAlf = Math.round((tot - (liv + gar + por)) * 100) / 100;
        if (derivedAlf > 2 && derivedAlf < 80) {
          parsedData.scheduleTable.alfrescoM2 = derivedAlf;
        }
      } else if (!por && liv && gar && alf) {
        const derivedPor = Math.round((tot - (liv + gar + alf)) * 100) / 100;
        if (derivedPor > 0.5 && derivedPor < 30) {
          parsedData.scheduleTable.porchM2 = derivedPor;
        }
      } else if (!gar && liv && alf && por) {
        const derivedGar = Math.round((tot - (liv + alf + por)) * 100) / 100;
        if (derivedGar > 10 && derivedGar < 120) {
          parsedData.scheduleTable.garageM2 = derivedGar;
        }
      } else if (!liv && gar && alf && por) {
        const derivedLiv = Math.round((tot - (gar + alf + por)) * 100) / 100;
        if (derivedLiv > 50 && derivedLiv < 500) {
          parsedData.scheduleTable.livingM2 = derivedLiv;
        }
      }
    }

    // Ensure alfresco modification is included if candidate table shows alfresco extension
    if (parsedData.scheduleTable?.alfrescoM2 && standardAlfrescoM2) {
      const alfDelta = Math.round((parsedData.scheduleTable.alfrescoM2 - standardAlfrescoM2) * 100) / 100;
      if (Math.abs(alfDelta) >= 0.1 && (!parsedData.areaModifications || !parsedData.areaModifications.some((m) => m.zone === "alfresco"))) {
        if (!parsedData.areaModifications) parsedData.areaModifications = [];
        parsedData.areaModifications.push({
          zone: "alfresco",
          deltaM2: alfDelta,
          reason: alfDelta > 0
            ? `Covered Alfresco extended from ${standardAlfrescoM2} m² to ${parsedData.scheduleTable.alfrescoM2} m² (+${alfDelta.toFixed(2)} m²)`
            : `Covered Alfresco reduced from ${standardAlfrescoM2} m² to ${parsedData.scheduleTable.alfrescoM2} m² (${alfDelta.toFixed(2)} m²)`,
        });
      }
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
          !/waterfall|40mm|stone\s*ends|mitred|undermount|double\s*sink|prep\s*sink|sink\s*upgrade/i.test(lowerText);

        const isStandardGarage =
          /double\s*garage|std\s*garage|2\s*car\s*garage/i.test(lowerText) &&
          !/ext|extension|widened|widening|3rd\s*car|triple|roller\s*door|access\s*door/i.test(lowerText);

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
          } else if (/ext\s*820|ext\s*920|garage.*access\s*door|personal.*access/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_garage_access_door;
          } else if (/undermount.*(?:double|dual)|double.*undermount/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_kitchen_double_undermount_sink;
          } else if (/undermount/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_kitchen_single_undermount_sink;
          } else if (/butler.*lhs|lhs.*butler|butlers\s*pantry\s*lhs|butler.*prep\s*sink|prep\s*sink.*pantry|butler's\s*pantry\s*added\s*to\s*lhs|pantry.*lhs/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_butlers_pantry_lhs_sink;
          } else if (/larger\s*shower|large\s*shower|1200\s*shower|1200x900|1500\s*shower|walk[\s-]in\s*shower|extended\s*shower|shower.*ensuite.*(?:larger|1200|1500)|ensuite.*larger\s*shower|shower\s*in\s*the\s*ensuite/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ensuite_larger_shower;
          } else if (/powder.*vanity|pdr.*vanity|separate\s*toilet.*(?:powder|pdr|vanity)|seperated\s*th\s*etoilet|seperated\s*the\s*toilet|made\s*a\s*pdr|powder\s*with\s*vanity|toilet\s*converted\s*into\s*a\s*private\s*powder/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_powder_room_vanity_conversion;
          } else if (/butler.*sink|wip.*sink|prep\s*sink|sink.*butler/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_butlers_prep_sink;
          } else if (/sliding\s*door.*(?:activity|alfresco)|sd\s*21|window.*to.*sliding|activity.*sliding/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_window_to_sliding_door;
          } else if (/splashback.*window|pw\s*06|picture.*splashback/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_kitchen_splashback_window;
          } else if (/sw\s*12\.24|sw\s*12|bedroom.*window|bed.*4.*window|enlarged.*window/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_window_size_upgrade;
          } else if (/stacker|stacking/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_alfresco_stacker_door;
          } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_gf_bathroom_addition;
          } else if (/double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ensuite_double_vanity;
          } else if (/2900|2\.9m|raised.*living.*ceiling|raised.*ceiling/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ceiling_2900_living;
          } else if (/2740|9ft|ground\s*floor\s*ceiling|gf\s*ceiling/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_ceiling_2740;
          } else if (isDouble && /balcony|upper\s*balcony|porch\s*balcony/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_front_balcony;
          } else if (/additional\s*ensuite|2nd\s*ensuite|second\s*ensuite|guest\s*ensuite|bed\s*[2-5]\s*ensuite|opt\s*ensuite/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_additional_ensuite_wir;
          } else if (/study/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_study_addition;
          } else if (/mud/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_mudroom_fitout;
          } else if (/3\.5m|servery|prep\s*isl/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_kitchen_island_prep;
          } else if (/powder|\bpdr\b/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_powder_room_addition;
          } else if (/storage\s*conversion|study\s*conversion|convert.*media/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_living_media_conversion;
          } else if (/cornerless/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_cornerless_stacker_door;
          } else if (/freestanding.*bath|urbane.*bath|1775.*bath/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_freestanding_bath;
          } else if (/double\s*shower|dual\s*shower|rain.*head|full\s*length\s*drain|twin\s*shower/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_double_shower_dual_heads;
          } else if (/full\s*h(?:eigh)?t.*tiling|f\.g\s*full\s*ht/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_full_height_wall_tiling;
          } else if (/sq(?:\.|uare)?\s*set/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_square_set_ceilings;
          } else if (/barn\s*door/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_feature_barn_door;
          } else if (/laundry.*(?:stone|20mm)/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_laundry_stone_benchtop;
          } else if (/laundry.*(?:overhead|cupboard)/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_laundry_overhead_cupboards;
          } else if (/scullery.*stone|pantry.*stone/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_scullery_stone_extension;
          } else if (/front\s*gable|feature\s*gable/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_facade_front_gable;
          } else if (/dual\s*18-?09|18-?09.*media/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_MAP.upg_dual_1809_windows;
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
        if (/bed\s*4.*(?:ensuite|wir)|bed\s*4\s*ens/i.test(lowerText)) {
          semanticKey = "sem_bed4_wir";
        } else if (/bed\s*3.*(?:ensuite|wir)|bed\s*3\s*ens/i.test(lowerText)) {
          semanticKey = "sem_bed3_wir";
        } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(lowerText)) {
          semanticKey = "sem_gf_bathroom";
        } else if (/ensuite.*wir|wir.*ensuite|additional.*ensuite|bed.*ensuite/i.test(lowerText)) {
          semanticKey = "sem_ensuite_wir";
        } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(lowerText)) {
          semanticKey = "sem_living_media";
        } else if (/double\s*vanity|dual\s*basin|twin\s*basin|double\s*basin/i.test(lowerText)) {
          semanticKey = "sem_double_vanity";
        } else if (/undermount.*(?:double|dual)|double.*undermount/i.test(lowerText)) {
          semanticKey = "sem_kitchen_double_undermount_sink";
        } else if (/undermount/i.test(lowerText)) {
          semanticKey = "sem_kitchen_single_undermount_sink";
        } else if (/butler.*sink|wip.*sink|prep\s*sink|sink.*butler/i.test(lowerText)) {
          semanticKey = "sem_butlers_prep_sink";
        } else if (/sliding\s*door|sd\s*21/i.test(lowerText)) {
          semanticKey = "sem_window_to_sliding_door";
        } else if (/splashback|pw\s*06/i.test(lowerText)) {
          semanticKey = "sem_kitchen_splashback_window";
        } else if (/sw\s*12|window\s*size|enlarged\s*window|bedroom.*window|bed.*4.*window/i.test(lowerText)) {
          semanticKey = "sem_window_size_upgrade";
        } else if (/ext\s*820|ext\s*920|garage\s*personal|garage\s*access/i.test(lowerText)) {
          semanticKey = "sem_garage_access_door";
        } else if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
          semanticKey = "sem_roller_door";
        } else if (/1200|ext\s*1200/i.test(lowerText)) {
          semanticKey = "sem_entry_door_1200";
        } else if (/1020|ext\s*1020/i.test(lowerText)) {
          semanticKey = "sem_entry_door_1020";
        } else if (/stacker|stacking/i.test(lowerText)) {
          semanticKey = "sem_stacker_door";
        } else if (/study/i.test(lowerText)) {
          semanticKey = "sem_study_addition";
        } else if (/mud/i.test(lowerText)) {
          semanticKey = "sem_mudroom_fitout";
        } else if (/3\.5m|servery|prep\s*isl/i.test(lowerText)) {
          semanticKey = "sem_kitchen_island_prep";
        } else if (/butler.*lhs|lhs.*butler/i.test(lowerText)) {
          semanticKey = "sem_butler_lhs";
        } else if (/larger\s*shower|1200\s*shower|1200x900/i.test(lowerText)) {
          semanticKey = "sem_ensuite_larger_shower";
        } else if (/powder.*vanity|pdr.*vanity/i.test(lowerText)) {
          semanticKey = "sem_powder_vanity";
        } else if (/powder|\bpdr\b/i.test(lowerText)) {
          semanticKey = "sem_powder_room";
        } else if (/2900|raised.*living.*ceiling/i.test(lowerText)) {
          semanticKey = "sem_ceiling_2900";
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

    // Ensure internalRoomChanges array exists
    if (!Array.isArray(parsedData.internalRoomChanges)) {
      parsedData.internalRoomChanges = [];
    }
    const combinedNotes = `${parsedData.detectedModelName || ""} ${suggestedDesign || ""} ${rawText || ""} ${parsedData.analysisNotes || ""}`.toLowerCase();
    const hasBed1Rear = /bed\s*1.*(?:rear|back|wing)|master.*(?:rear|back)|relocat.*bed\s*1|bed\s*1.*relocat|moving\s*to\s*the\s*rear|bed\s*1\s*to\s*rear/i.test(combinedNotes);
    if (hasBed1Rear && !parsedData.internalRoomChanges.some(r => /bed\s*1|master/i.test(r.roomName))) {
      parsedData.internalRoomChanges.push({
        id: "room_bed1_rear_relocation",
        roomName: "Master Bedroom (Bed 1), Ensuite & WIR Relocated to Rear Wing",
        roomType: "bedroom",
        furnitureDetected: ["King Bed", "Private Ensuite", "WIR Robe Fitout", "Bedside Tables"],
        deltaM2: 0.0,
        description: "Master Bedroom (Bed 1), Ensuite & WIR relocated to rear wing ($0.00 Variation)",
        isZeroCost: true,
        category: "zero_cost_layout",
        baseRatePerM2: 0,
        finishesRatePerM2: 0,
        unitRate: 0,
        subtotal: 0,
        accepted: true
      });
    }
    const wetDeltaMatch = combinedNotes.match(/(?:more\s*wet\s*area|wet\s*area\s*(?:delta|increase|ext|expansion|sqm)?|ensuite\s*footprint\s*expansion)[^\d]*([0-9]+(?:\.[0-9]+)?)\s*m/i);
    const parsedWetM2 = wetDeltaMatch ? parseFloat(wetDeltaMatch[1]) : 0;
    const hasWetAreaIncrease = parsedWetM2 > 0 || /more\s*wet\s*area|wet\s*area\s*sqm/i.test(combinedNotes);
    const effectiveWetDelta = parsedWetM2 > 0 ? parsedWetM2 : 2.6;
    if (hasWetAreaIncrease && !parsedData.internalRoomChanges.some(r => /wet\s*area/i.test(r.roomName))) {
      parsedData.internalRoomChanges.push({
        id: "wet_ext_master_ensuite",
        roomName: "Master Ensuite & Wet Area Footprint Expansion",
        roomType: "ensuite",
        furnitureDetected: ["Shower Recess", "Vanity Basin", "Toilet Suite", "Class III Waterproofing"],
        deltaM2: effectiveWetDelta,
        description: `Ensuite wet area extended by +${effectiveWetDelta.toFixed(2)} m² (+${effectiveWetDelta.toFixed(2)} m² @ $150/m² base wet area preparation)`,
        isZeroCost: false,
        category: "wet_area",
        baseRatePerM2: 150,
        finishesRatePerM2: 0,
        unitRate: 150,
        subtotal: Math.round(effectiveWetDelta * 150),
        accepted: true
      });
    }
    const hasInternalChanges = parsedData.internalRoomChanges.length > 0 || (parsedData.detectedInclusions && parsedData.detectedInclusions.length > 0);
    const hasExplicitDryFraming = /dry\s*partition|non-structural|framing\s*realignment|dry\s*layout/i.test(combinedNotes);
    if ((hasInternalChanges || hasExplicitDryFraming) && !parsedData.internalRoomChanges.some(r => /dry\s*partition|non-structural/i.test(r.roomName))) {
      parsedData.internalRoomChanges.push({
        id: "layout_dry_framing_realignment",
        roomName: "Internal Dry Partition Framing Realignment & Circulation Flow",
        roomType: "other",
        furnitureDetected: ["Internal Stud Framing", "Plasterboard Lining", "Door Clearances"],
        deltaM2: 0.0,
        description: "Internal dry partition framing realigned ($0.00 Variation)",
        isZeroCost: true,
        category: "zero_cost_layout",
        baseRatePerM2: 0,
        finishesRatePerM2: 0,
        unitRate: 0,
        subtotal: 0,
        accepted: true
      });
    }

    return res.status(200).json(parsedData);
  } catch (err) {
    console.error("Error in /api/analyze-floorplan:", err);
    return res.status(500).json({ error: err.message || "Failed to analyze floorplan." });
  }
}
