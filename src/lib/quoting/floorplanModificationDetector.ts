import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { findHudsonModelByName, detectFloorplanFromText } from "@/lib/floorplan/floorplanDetector";
import { HUDSON_CAD_REGISTRY } from "@/components/flyer/floorplanVisionEngine";
import { HUDSON_FLOORPLANS } from "@/components/flyer/floorplans.data";
import {
  getStandardAreaBreakdown,
  getHousingTypeForDesign,
  HUDSON_STANDARD_AREAS,
} from "@/lib/quoting/quoteEngine";
import { getGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";
import { LOCAL_FLOORPLAN_MAP } from "./localFloorplanMap.data";
import type {
  DetectedAreaDelta,
  DetectedInclusionUpgrade,
  PlanModificationAnalysis,
  InclusionTier,
} from "./quoteTypes";

/**
 * High-confidence Databuild Recipe Unit Rates ($/m²)
 */
export const DATABUILD_RECIPE_RATES = {
  living_ss_m2: 1480,
  living_ds_ground_m2: 1520,
  living_ds_upper_m2: 1650,
  alfresco_m2: 920,
  garage_m2: 1150,
  wet_area_m2: 2350,
  porch_m2: 850,
  structural_beam_ds: 1850,
  ceiling_2590_living_m2: 24, // lump sum ~$3,650
  ceiling_2740_living_m2: 46, // lump sum ~$6,850
};

/**
 * Standard brochure fixtures vs upgrade definitions across H1, H2, H3 tiers.
 */
export interface FixtureUpgradeRule {
  id: string;
  category: any;
  name: string;
  description: string;
  baseline: string;
  detected: string;
  unitPrice: number;
  confidence: number;
  triggerKeywords: string[];
}

export const FIXTURE_UPGRADE_RULES: FixtureUpgradeRule[] = [
  {
    id: "upg_ensuite_double_vanity",
    category: "internal_bathroom",
    name: "Master Ensuite Double Basin Vanity Upgrade",
    description: "Extended 1800mm vanity cabinet with dual undermount basins, twin flick mixers, and upgraded stone benchtop (replaces standard single vanity).",
    baseline: "Single 900mm–1200mm vanity with 1 basin (H1/H2 Standard)",
    detected: "Dual 1800mm twin basin vanity layout with double waste plumbing",
    unitPrice: 1280,
    confidence: 0.95,
    triggerKeywords: ["double vanity", "dual basin", "ensuite twin", "2 x basin", "double basin", "his and hers", "twin vanity", "dual vanity"],
  },
  {
    id: "upg_kitchen_island_waterfall",
    category: "internal_kitchen",
    name: "Extended Island Benchtop with 40mm Waterfall Stone Ends",
    description: "Grand extended kitchen island preparation bench with 40mm engineered stone edge and twin mitred waterfall gable ends down to floor.",
    baseline: "Standard 2400mm × 900mm island with 20mm stone & laminate ends",
    detected: "Extended island footprint with twin waterfall stone gables",
    unitPrice: 1950,
    confidence: 0.95,
    // CRITICAL: NEVER include generic "island bench" here. Only explicit waterfall terms!
    triggerKeywords: ["waterfall", "waterfall ends", "waterfall end", "waterfall gables", "waterfall gable", "40mm waterfall", "mitred waterfall"],
  },
  {
    id: "upg_laundry_full_fitout",
    category: "internal_laundry",
    name: "Custom Full Laundry Cabinetry Fit-Out",
    description: "Built-in custom laminate base cabinetry, 45L drop-in stainless steel sink, overhead wall cupboards, and tall linen/broom storage.",
    baseline: "Freestanding 45L metal tub with cabinet under (H1/H2 Standard)",
    detected: "Built-in laminate joinery run with drop-in sink & overhead cupboards",
    unitPrice: 2850,
    confidence: 0.94,
    triggerKeywords: ["laundry fitout", "overhead cupboards", "drop in tub", "built in laundry", "custom laundry cabinetry"],
  },
  {
    id: "upg_butlers_pantry_fitout",
    category: "internal_kitchen",
    name: "Butler's Pantry Joinery & Secondary Prep Sink Package",
    description: "Complete Butler's Pantry conversion with 20mm stone benchtop, under-bench storage drawers, stainless prep sink, mixer tap, and tile splashback.",
    baseline: "Standard Walk-in Pantry with 4 tiers of melamine shelving",
    detected: "Butler's pantry with integrated prep sink, stone bench & power points",
    unitPrice: 3400,
    confidence: 0.92,
    triggerKeywords: ["butler's pantry", "butlers pantry", "pantry sink", "butler sink", "wip sink", "secondary sink"],
  },
  {
    id: "upg_alfresco_stacker_door",
    category: "doors_windows",
    name: "3-Panel Aluminum Stacker Sliding Door to Alfresco",
    description: "Upgraded 2100mm × 3600mm 3-panel commercial-grade aluminum stacker door opening out to the covered alfresco.",
    baseline: "Standard 2-panel 2100mm × 2410mm sliding door",
    detected: "Wide 3-panel / 4-panel stacking sliding door system",
    unitPrice: 1850,
    confidence: 0.95,
    triggerKeywords: ["stacker", "stacking door", "corner stacker", "3 panel slider", "4 panel slider", "3 panel stacker", "stacker door"],
  },
  {
    id: "upg_wir_custom_joinery",
    category: "internal_bedrooms",
    name: "Master Walk-in Robe (WIR) Custom Joinery Fit-Out",
    description: "Architectural built-in master robe fit-out with dual drawer banks, open shoe shelving, and double hanging rails.",
    baseline: "Single melamine top shelf and chrome hanging rail",
    detected: "Full custom joinery robe fit-out with drawers and shelving",
    unitPrice: 1600,
    confidence: 0.90,
    triggerKeywords: ["wir fitout", "robe joinery", "robe drawers", "master robe fitout", "custom wir"],
  },
  {
    id: "upg_powder_room_addition",
    category: "internal_bathroom",
    name: "Ground Floor Powder Room / Additional WC Addition",
    description: "Dedicated guest powder room addition including wall-hung basin, vitreous china toilet suite, plumbing rough-in, and floor tiling.",
    baseline: "Standard floorplan without separate ground floor guest powder room",
    detected: "Additional powder room / WC compartment added to living zone",
    unitPrice: 2450,
    confidence: 0.92,
    triggerKeywords: ["extra powder", "powder room addition", "extra wc", "additional powder room", "powder addition"],
  },
  {
    id: "upg_structural_beam_gf_ext",
    category: "structural",
    name: "Ground Floor Structural Steel Beam for Living Push-Out",
    description: "Engineered universal steel beam (UB) and column supports to carry upper storey brickwork/framing above extended ground floor living area.",
    baseline: "Standard upper floor alignment supported on standard framing",
    detected: "Ground floor pushed out under upper floor requiring structural beam",
    unitPrice: 1850,
    confidence: 0.93,
    triggerKeywords: ["structural beam", "steel beam", "gf extension beam", "upper floor cantilever", "load bearing beam"],
  },
  {
    id: "upg_ceiling_height_2590",
    category: "internal_general",
    name: "2590mm (8ft 6in) High Ceilings Upgrade Throughout",
    description: "Increase standard ceiling heights throughout from standard 2440mm (8ft) to 2590mm (8ft 6in) including taller wall framing and door frames.",
    baseline: "Standard 2440mm (8ft) ceiling height throughout",
    detected: "2590mm / 2.6m elevated ceiling height specification",
    unitPrice: 3650,
    confidence: 0.95,
    triggerKeywords: ["2590mm", "2590 high", "2590 ceiling", "2.6m ceiling", "2.59m ceiling", "8ft 6in"],
  },
  {
    id: "upg_ceiling_height_2740",
    category: "internal_general",
    name: "2740mm (9ft) High Ceilings Upgrade Throughout",
    description: "Luxury 2740mm (9ft) high ceilings throughout ground floor living areas with extra tall internal door openings and window headers.",
    baseline: "Standard 2440mm (8ft) ceiling height throughout",
    detected: "2740mm / 2.7m luxury ceiling height specification",
    unitPrice: 6850,
    confidence: 0.95,
    triggerKeywords: ["2740mm", "2740 high", "2740 ceiling", "2.7m ceiling", "2.74m ceiling", "9ft ceiling"],
  },
  {
    id: "upg_cavity_slider",
    category: "doors_windows",
    name: "Architectural Cavity Sliding Pocket Door",
    description: "Flush cavity sliding pocket door recessed into stud wall framing to save floor space in ensuite, pantry, or media room.",
    baseline: "Standard hinged internal door",
    detected: "Cavity sliding pocket door notation on plan",
    unitPrice: 480,
    confidence: 0.92,
    triggerKeywords: ["cavity slider", "cavity sliding door", "csd", "pocket door"],
  },
  {
    id: "upg_raked_ceiling",
    category: "internal_general",
    name: "Raked / Cathedral Ceiling to Open Plan Living Zone",
    description: "Vaulted architectural raked scissor-truss ceiling to family and dining areas with painted plasterboard lining.",
    baseline: "Standard flat 2440mm ceiling throughout",
    detected: "Raked / vaulted ceiling notation across family room",
    unitPrice: 4200,
    confidence: 0.94,
    triggerKeywords: ["raked ceiling", "cathedral ceiling", "vaulted ceiling", "high raked"],
  },
];

/**
 * Checks if a phrase is qualified with "by owner", "client to supply", "NIC" (not in contract).
 */
export function isMarkedByOwner(textSnippet: string): boolean {
  if (!textSnippet) return false;
  const lower = textSnippet.toLowerCase();
  return (
    lower.includes("by owner") ||
    lower.includes("by client") ||
    lower.includes("client supply") ||
    lower.includes("client to supply") ||
    lower.includes("owner supply") ||
    lower.includes("owner to supply") ||
    lower.includes("not in contract") ||
    /\bnic\b/i.test(lower) ||
    lower.includes("client to provide")
  );
}

/**
 * Returns the baseline floorplan image URL for any Hudson design.
 */
export function getBaselineFloorplanImageUrl(designName: string): string {
  const clean = (designName || "")
    .toLowerCase()
    .replace(/classic|brochure|rh|sh/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Handle Ember/Amber synonym
  const normalized = clean.replace(/\bember\b/i, "amber");

  if (normalized && LOCAL_FLOORPLAN_MAP[normalized]) {
    return LOCAL_FLOORPLAN_MAP[normalized];
  }

  for (const [key, url] of Object.entries(LOCAL_FLOORPLAN_MAP)) {
    if (normalized && (key === normalized || key.startsWith(normalized) || normalized.startsWith(key))) {
      return url;
    }
  }

  // Fallback to Amber 21 benchmark
  return "/floorplans/AMBER 21.png";
}

/**
 * Helper to fetch a local image or PDF and convert it to Base64
 */
async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; base64: string } | null> {
  if (typeof window === "undefined" || !url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const mimeType = blob.type || (url.endsWith(".pdf") ? "application/pdf" : "image/png");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const str = String(reader.result);
        resolve(str.includes(",") ? str.split(",")[1] : str);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { mimeType, base64 };
  } catch (err) {
    console.warn("Failed to fetch baseline floorplan image:", url, err);
    return null;
  }
}

/**
 * Calls Gemini Multimodal Vision API (gemini-3.6-flash) using Dual-Image Visual Diffing.
 * Compares Image 1 (Official Baseline Blueprint) vs Image 2 (Candidate Modified Plan).
 * Even if NO dimensions are written, it compares the visual perimeter to detect push-outs!
 */
async function callGeminiFloorplanAnalysis(
  dataUrl: string,
  rawText: string,
  suggestedDesign: string,
  housingType: string,
  fileName: string,
  cadSpec: any,
  stdAreas: any
): Promise<{
  detectedModelName: string;
  confidence: number;
  isModified: boolean;
  ceilingHeightM?: number;
  analysisNotes?: string;
  areaModifications: Array<{
    zone: "living" | "alfresco" | "garage" | "wet_area" | "porch";
    deltaM2: number;
    estimatedLinearExtensionM?: number;
    reason: string;
  }>;
  detectedInclusions: Array<{
    id?: string;
    name: string;
    category?: string;
    isByOwner?: boolean;
    isCustomItem?: boolean;
    materials?: number;
    labor?: number;
    unitPrice: number;
    quantity: number;
    reason: string;
    baseline?: string;
    detected?: string;
  }>;
} | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || !dataUrl) return null;

  try {
    const cleanB64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const mimeType = dataUrl.includes(";") ? dataUrl.split(";")[0].replace("data:", "") : "image/png";

    // 1. Fetch the Official Baseline Blueprint image for side-by-side visual diffing
    const baselineUrl = getBaselineFloorplanImageUrl(suggestedDesign);
    const baselineImg = await fetchImageAsBase64(baselineUrl);
    const hasBaseline = !!baselineImg && !!baselineImg.base64;

    const standardTotalM2 = cadSpec?.totalM2 || 192.24;
    const standardLivingM2 = stdAreas?.livingM2 || cadSpec?.livingM2 || 147.56;
    const standardAlfrescoM2 = stdAreas?.alfrescoM2 || cadSpec?.alfrescoM2 || 9.54;
    const standardGarageM2 = stdAreas?.garageM2 || cadSpec?.garageM2 || 32.89;
    const standardPorchM2 = stdAreas?.porchM2 || cadSpec?.porchM2 || 2.25;

    const prompt = `You are a Senior Architectural Estimator and Surveyor at Hudson Homes.
Your task is to inspect this floorplan blueprint and compare it against the official Hudson Homes baseline design.

${
  hasBaseline
    ? `YOU ARE COMPARING TWO BLUEPRINT IMAGES:
- IMAGE 1 (First image): THE OFFICIAL STANDARD BASELINE BLUEPRINT for "${suggestedDesign}" (${housingType}, standard total area: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m² [standard size ${cadSpec?.alfrescoDims || '2.6m deep × 3.6m wide'}], garage: ${standardGarageM2} m² [standard size ${cadSpec?.garageDims || '5.5m × 5.5m'}], porch: ${standardPorchM2} m²; overall width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).
- IMAGE 2 (Second image): THE UPLOADED CANDIDATE / MODIFIED FLOORPLAN.`
    : `YOU ARE INSPECTING THE UPLOADED FLOORPLAN:
- Baseline Design: "${suggestedDesign}" (${housingType}, total: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m² [${cadSpec?.alfrescoDims || '2.6m deep × 3.6m wide'}], garage: ${standardGarageM2} m², width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).`
}

CRITICAL ARCHITECTURAL VISUAL DIFFING RULES (ZERO HALLUCINATIONS):
1. VISUAL PUSH-OUT RECOGNITION (EVEN IF NO NUMERICAL DIMENSIONS ARE WRITTEN):
   - Estimators and clients frequently draw an extended alfresco, extended living room, or widened garage WITHOUT writing any numbers or dimensions on the extension!
   - You MUST visually inspect the wall alignments, external perimeters, slab footprints, and room boundaries between Image 1 (Baseline) and Image 2 (Candidate):
     a) ALFRESCO EXTENSION:
        - Check if the Alfresco in Image 2 extends further back (deeper into the rear yard) or wider across the rear of the home than the standard Alfresco in Image 1.
        - Notice if the alfresco boundary extends beyond the living room rear wall alignment, or if the covered slab covers more area.
        - If the Alfresco is visually extended:
          * Set zone: "alfresco"
          * Estimate the linear push-out distance in meters (e.g. +1.2m, +1.5m, +2.0m, +2.5m, +3.0m) using the known house scale (overall width ${cadSpec?.width || 10.55}m, baseline alfresco width ~3.6m).
          * Calculate the square meterage increase (deltaM2, e.g. 5.4 m², 7.2 m², 9.0 m², 12.0 m²).
          * State clearly in "reason" that an extended alfresco slab/perimeter was detected.
     b) LIVING / FAMILY / DINING EXTENSION:
        - Check if the rear or side external wall of the living zone has been pushed out compared to Image 1.
        - If extended, calculate deltaM2 and note the estimated push-out distance.
     c) GARAGE EXTENSION:
        - Check if the garage footprint is visibly widened (e.g. workshop bay or triple garage) or lengthened compared to Image 1.
     d) PORCH OR BATHROOM EXTENSIONS:
        - Check for any other extended internal or outdoor slabs.

2. UNMODIFIED STANDARD PLANS (ZERO FALSE POSITIVES):
   - If Image 2 is visually identical to Image 1 in all perimeters, walls, and footprints, with no push-outs and no markups:
     * isModified: false
     * areaModifications: []
     * detectedInclusions: []
     * analysisNotes: "Standard brochure blueprint matching baseline specifications exactly."

3. 2D DRAWING VS 3D FINISHES (NEVER GUESS WATERFALL ENDS):
   - You are viewing a 2D floorplan.
   - 2D lines of an island bench are simply a standard benchtop.
   - NEVER report "waterfall ends" unless the word "waterfall", "40mm waterfall", or "waterfall gables" is EXPLICITLY WRITTEN on the drawing or in annotations.

4. "BY OWNER" / "CLIENT TO SUPPLY" / "NIC" (NOT IN CONTRACT):
   - Estimators and clients frequently mark items as "By Owner", "Client Supply", "NIC", or "Client to provide" (e.g., "Air Conditioning by Owner", "Flooring by Owner", "Dishwasher by client").
   - For ANY item marked "by owner" or "client supply":
     - Set isByOwner: true
     - Set unitPrice: 0 ($0 cost to builder contract).

5. CEILING HEIGHT SPECIFICATIONS:
   - Check text for ceiling heights: e.g. "2590mm", "2.6m", "2740mm", "9ft".
   - If 2590mm (8ft 6in) is specified, standard upgrade is $3,650.
   - If 2740mm (9ft) is specified, standard upgrade is $6,850.

6. BESPOKE / CUSTOM NON-CATALOG ITEMS:
   - If the user marked or drew a custom item not in standard catalog (e.g. recessed gas fireplace, built-in study cabinetry, raked ceiling, extra cavity sliding door):
     - Estimate realistic trade Material cost and Trade Labor cost in AUD.
     - Add Hudson's standard 20% builder margin:
       unitPrice = Math.round((materials + labor) * 1.20)
     - Set isCustomItem: true

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

    const parts: any[] = [{ text: prompt }];

    // If we have the baseline blueprint image, send it as Image 1
    if (hasBaseline) {
      parts.push({
        inlineData: {
          mimeType: baselineImg.mimeType,
          data: baselineImg.base64,
        },
      });
    }

    // Send the uploaded candidate floorplan as Image 2
    parts.push({
      inlineData: {
        mimeType,
        data: cleanB64,
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      console.warn("Gemini Vision HTTP error:", resp.status, resp.statusText);
      return null;
    }

    const json = await resp.json();
    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsedData = JSON.parse(candidateText);
    return parsedData;
  } catch (err) {
    console.warn("Gemini Vision floorplan analysis failed, falling back to deterministic parser:", err);
    return null;
  }
}

/**
 * Scans an uploaded file (PDF or Image) and detects spatial and fixture modifications.
 * Universal engine supporting all Hudson Homes designs, calibrated with Amber 21 Classic.
 */
export async function analyzeModifiedFloorplanFile(
  file: File,
  activeDesignName?: string,
  activeHousingType?: string,
  specTier: InclusionTier = "H2 Design Inclusions"
): Promise<PlanModificationAnalysis> {
  let rawText = "";
  let dataUrl = "";

  // 1. File Ingestion
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const parsed = await pdfDocumentToPagesAndText(file);
      rawText = parsed.rawText || "";
      dataUrl = parsed.pages[0] || ""; // First page rendered as crisp PNG data URL
    } catch (err) {
      console.warn("PDF parsing error:", err);
    }
  } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
    rawText = await file.text();
  } else {
    // Image file
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.readAsDataURL(file);
    });
  }

  // 2. Identify Base Design Model (Deterministic Pre-check)
  let detectedModelName = activeDesignName && activeDesignName !== "UNSELECTED" ? activeDesignName : "";
  let housingType = activeHousingType || "Single Storey";

  // Handle Ember/Amber spelling
  if (/ember\s*21/i.test(detectedModelName) || /ember\s*21/i.test(file.name) || /ember\s*21/i.test(rawText)) {
    detectedModelName = "Amber 21";
  }

  if (!detectedModelName) {
    const textMatched = detectFloorplanFromText(rawText, file.name);
    if (textMatched) {
      detectedModelName = textMatched.matchedDesignName;
      housingType = textMatched.housingType;
    } else {
      const matched = findHudsonModelByName(file.name) || findHudsonModelByName(rawText);
      if (matched) {
        detectedModelName = matched.row.name;
        housingType = matched.housingType;
      } else {
        if (/amber\s*21/i.test(rawText) || /amber\s*21/i.test(file.name)) {
          detectedModelName = "Amber 21";
          housingType = "Single Storey";
        } else {
          detectedModelName = "Amber 21"; // Default calibrated benchmark
          housingType = "Single Storey";
        }
      }
    }
  }

  // Normalize model name
  if (/amber\s*21/i.test(detectedModelName)) {
    detectedModelName = "Amber 21";
  }

  // Baseline CAD & Dimensions Lookup
  const cadSpec = HUDSON_CAD_REGISTRY[detectedModelName] || {
    totalM2: 192.24,
    livingM2: 147.56,
    alfrescoM2: 9.54,
    garageM2: 32.89,
    porchM2: 2.25,
    width: 10.55,
    length: 20.27,
    alfrescoDims: "2.6m × 3.6m",
    garageDims: "5.5m × 5.5m",
  };

  const isDoubleStorey =
    housingType === "Double Storey" ||
    /double|two\s*stor/i.test(detectedModelName) ||
    cadSpec.totalM2 > 280;

  const standardTotalM2 = cadSpec.totalM2;
  const stdAreas = getStandardAreaBreakdown(detectedModelName, housingType, standardTotalM2);
  const standardLivingM2 = Number(stdAreas.livingM2 || stdAreas.groundLivingM2 || cadSpec.livingM2);
  const standardAlfrescoM2 = Number(stdAreas.alfrescoM2 || cadSpec.alfrescoM2);
  const standardGarageM2 = Number(stdAreas.garageM2 || cadSpec.garageM2);
  const standardPorchM2 = Number(stdAreas.porchM2 || cadSpec.porchM2);

  // 3. Attempt Multimodal Gemini Vision AI Analysis with Dual-Image Diffing
  let geminiResult: Awaited<ReturnType<typeof callGeminiFloorplanAnalysis>> = null;
  if (dataUrl) {
    geminiResult = await callGeminiFloorplanAnalysis(
      dataUrl,
      rawText,
      detectedModelName,
      housingType,
      file.name,
      cadSpec,
      stdAreas
    );
  }

  if (geminiResult && geminiResult.detectedModelName) {
    let aiModel = geminiResult.detectedModelName.replace(/Classic/i, "").trim();
    if (/amber\s*21/i.test(aiModel) || /ember\s*21/i.test(aiModel)) aiModel = "Amber 21";
    if (aiModel) detectedModelName = aiModel;
  }

  const areaDeltas: DetectedAreaDelta[] = [];
  const inclusionUpgrades: DetectedInclusionUpgrade[] = [];

  if (geminiResult) {
    // ----------------------------------------------------
    // GEMINI VISION PIPELINE (Dual-Image Diffing with Visual Push-Out Detection)
    // ----------------------------------------------------
    if (geminiResult.areaModifications && geminiResult.areaModifications.length > 0) {
      for (const mod of geminiResult.areaModifications) {
        const delta = Math.round(mod.deltaM2 * 100) / 100;
        if (delta <= 0) continue;

        if (mod.zone === "living") {
          const rate = isDoubleStorey ? DATABUILD_RECIPE_RATES.living_ds_ground_m2 : DATABUILD_RECIPE_RATES.living_ss_m2;
          areaDeltas.push({
            zoneKey: isDoubleStorey ? "groundLivingM2" : "livingM2",
            zoneLabel: isDoubleStorey ? "Ground Floor Living Extension" : "Living & Family Room Extension",
            standardM2: standardLivingM2,
            modifiedM2: Math.round((standardLivingM2 + delta) * 100) / 100,
            deltaM2: delta,
            recipeId: "recipe_living_ss_m2",
            unitRate: rate,
            subtotal: Math.round(delta * rate),
            accepted: true,
          });
        } else if (mod.zone === "alfresco") {
          const rate = DATABUILD_RECIPE_RATES.alfresco_m2;
          areaDeltas.push({
            zoneKey: "alfrescoM2",
            zoneLabel: "Covered Alfresco Extension",
            standardM2: standardAlfrescoM2,
            modifiedM2: Math.round((standardAlfrescoM2 + delta) * 100) / 100,
            deltaM2: delta,
            recipeId: "recipe_alfresco_m2",
            unitRate: rate,
            subtotal: Math.round(delta * rate),
            accepted: true,
          });
        } else if (mod.zone === "garage") {
          const rate = DATABUILD_RECIPE_RATES.garage_m2;
          areaDeltas.push({
            zoneKey: "garageM2",
            zoneLabel: "Garage Footprint Extension",
            standardM2: standardGarageM2,
            modifiedM2: Math.round((standardGarageM2 + delta) * 100) / 100,
            deltaM2: delta,
            recipeId: "recipe_garage_ext_m2",
            unitRate: rate,
            subtotal: Math.round(delta * rate),
            accepted: true,
          });
        } else if (mod.zone === "wet_area") {
          const rate = DATABUILD_RECIPE_RATES.wet_area_m2;
          areaDeltas.push({
            zoneKey: "wetAreaM2",
            zoneLabel: "Master Ensuite / Bathroom Extension",
            standardM2: 8.5,
            modifiedM2: Math.round((8.5 + delta) * 100) / 100,
            deltaM2: delta,
            recipeId: "recipe_bath_ext_m2",
            unitRate: rate,
            subtotal: Math.round(delta * rate),
            accepted: true,
          });
        }
      }
    }

    if (geminiResult.detectedInclusions && geminiResult.detectedInclusions.length > 0) {
      for (const inc of geminiResult.detectedInclusions) {
        const isOwner = !!inc.isByOwner;
        const qty = inc.quantity || 1;
        let finalUnitPrice = isOwner ? 0 : inc.unitPrice || 0;

        let customBreakdown: DetectedInclusionUpgrade["customBreakdown"] = undefined;
        if (!isOwner && inc.isCustomItem && (inc.materials || inc.labor)) {
          const mat = inc.materials || 0;
          const lab = inc.labor || 0;
          const marginCost = Math.round((mat + lab) * 0.20);
          finalUnitPrice = (mat + lab) + marginCost;
          customBreakdown = {
            materials: mat,
            labor: lab,
            marginPercent: 20,
            marginCost,
          };
        }

        inclusionUpgrades.push({
          id: inc.id || `custom_inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: (inc.category as any) || "internal_general",
          name: inc.name,
          description: inc.reason || (isOwner ? "Specified by owner (excluded from builder tender)" : "Architectural specification upgrade"),
          baseline: inc.baseline || "Standard brochure inclusion",
          detected: inc.detected || inc.name,
          unitPrice: finalUnitPrice,
          quantity: qty,
          subtotal: finalUnitPrice * qty,
          accepted: true,
          confidence: 0.95,
          isByOwner: isOwner,
          isCustomItem: inc.isCustomItem,
          customBreakdown,
          reason: inc.reason,
        });
      }
    }

    const netDeltaM2 = areaDeltas.reduce((acc, d) => acc + d.deltaM2, 0);
    const modifiedTotalM2 = Math.round((standardTotalM2 + netDeltaM2) * 100) / 100;
    const totalAreaCost = areaDeltas.reduce((acc, d) => acc + d.subtotal, 0);
    const totalInclusionsCost = inclusionUpgrades.reduce((acc, u) => acc + u.subtotal, 0);

    return {
      baseDesignName: detectedModelName,
      housingType: housingType as any,
      standardTotalM2,
      modifiedTotalM2,
      netDeltaM2: Math.round(netDeltaM2 * 100) / 100,
      areaDeltas,
      inclusionUpgrades,
      totalAreaCost,
      totalInclusionsCost,
      netTotalCost: totalAreaCost + totalInclusionsCost,
      floorplanDataUrl: dataUrl,
      fileName: file.name,
      detectionSource: "gemini_vision",
      geminiNotes: geminiResult.analysisNotes,
      ceilingHeightM: geminiResult.ceilingHeightM,
    };
  }

  // ----------------------------------------------------
  // DETERMINISTIC PARSER FALLBACK (Offline / Non-AI Mode)
  // ----------------------------------------------------
  const lowerText = rawText.toLowerCase();
  const fileNameLower = file.name.toLowerCase();
  const fullSearchText = `${fileNameLower} ${lowerText}`;

  let livingDelta = 0;
  let alfrescoDelta = 0;
  let garageDelta = 0;
  let wetAreaDelta = 0;

  // 1. Room Dimension Parsing (Benchmark: Amber 21)
  if (detectedModelName === "Amber 21") {
    // Amber 21 standard: Family 5.9 x 3.5 = 20.65 m²
    const familyMatch = rawText.match(/Family\s*[\r\n\t]*(\d+\.\d+)\s*x\s*(\d+\.\d+)/i);
    if (familyMatch) {
      const w = parseFloat(familyMatch[1]);
      const l = parseFloat(familyMatch[2]);
      const actualLivingM2 = w * l;
      const standardFamM2 = 5.9 * 3.5;
      const famDiff = actualLivingM2 - standardFamM2;
      if (Math.abs(famDiff) > 0.4) {
        livingDelta = Math.round(famDiff * 100) / 100;
      }
    }

    // Amber 21 standard: Alfresco 2.6 x 3.6 = 9.36 m²
    const alfMatch = rawText.match(/Alfresco\s*[\r\n\t]*(\d+\.\d+)\s*x\s*(\d+\.\d+)/i);
    if (alfMatch) {
      const w = parseFloat(alfMatch[1]);
      const l = parseFloat(alfMatch[2]);
      const actualAlfM2 = w * l;
      const standardAlfM2 = 2.6 * 3.6;
      const alfDiff = actualAlfM2 - standardAlfM2;
      if (Math.abs(alfDiff) > 0.4) {
        alfrescoDelta = Math.round(alfDiff * 100) / 100;
      }
    }

    // Amber 21 standard: Garage 5.5 x 5.5 = 30.25 m²
    const garMatch = rawText.match(/Garage\s*[\r\n\t]*(\d+\.\d+)\s*x\s*(\d+\.\d+)/i);
    if (garMatch) {
      const w = parseFloat(garMatch[1]);
      const l = parseFloat(garMatch[2]);
      const actualGarM2 = w * l;
      const standardGarM2 = 5.5 * 5.5;
      const garDiff = actualGarM2 - standardGarM2;
      if (Math.abs(garDiff) > 0.5) {
        garageDelta = Math.round(garDiff * 100) / 100;
      }
    }
  }

  // 2. Printed Area Table Delta Verification
  const livingTableMatch = rawText.match(/Living(?:\s+Area)?\s*[:\t\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (livingTableMatch) {
    const printedLiving = parseFloat(livingTableMatch[1]);
    const diff = printedLiving - standardLivingM2;
    if (Math.abs(diff) > 0.3) {
      livingDelta = Math.round(diff * 100) / 100;
    } else {
      livingDelta = 0;
    }
  }

  // Explicit keyword annotations
  if (livingDelta === 0) {
    if (lowerText.includes("living ext +") || lowerText.includes("living extended") || lowerText.includes("family ext")) {
      const numMatch = lowerText.match(/(?:living|family)\s*(?:ext|extended)\s*[:\+]?\s*(\d+(?:\.\d+)?)/i);
      livingDelta = numMatch ? parseFloat(numMatch[1]) : 7.2;
    }
  }

  if (alfrescoDelta === 0) {
    if (lowerText.includes("alfresco ext") || lowerText.includes("grand alfresco") || lowerText.includes("extended alfresco") || fileNameLower.includes("alfresco")) {
      const numMatch = lowerText.match(/alfresco\s*(?:ext|extended)\s*[:\+]?\s*(\d+(?:\.\d+)?)/i);
      alfrescoDelta = numMatch ? parseFloat(numMatch[1]) : 8.0;
    }
  }

  if (garageDelta === 0) {
    if (lowerText.includes("triple garage") || lowerText.includes("garage ext")) {
      garageDelta = 14.0;
    }
  }

  if (lowerText.includes("ensuite ext") || lowerText.includes("bath ext")) {
    wetAreaDelta = 3.2;
  }

  // Populate Area Deltas (Only non-zero!)
  if (livingDelta > 0) {
    const rate = isDoubleStorey ? DATABUILD_RECIPE_RATES.living_ds_ground_m2 : DATABUILD_RECIPE_RATES.living_ss_m2;
    areaDeltas.push({
      zoneKey: isDoubleStorey ? "groundLivingM2" : "livingM2",
      zoneLabel: isDoubleStorey ? "Ground Floor Living Extension" : "Living & Family Room Extension",
      standardM2: standardLivingM2,
      modifiedM2: Math.round((standardLivingM2 + livingDelta) * 100) / 100,
      deltaM2: livingDelta,
      recipeId: "recipe_living_ss_m2",
      unitRate: rate,
      subtotal: Math.round(livingDelta * rate),
      accepted: true,
    });
  }

  if (alfrescoDelta > 0) {
    const rate = DATABUILD_RECIPE_RATES.alfresco_m2;
    areaDeltas.push({
      zoneKey: "alfrescoM2",
      zoneLabel: "Covered Alfresco Extension",
      standardM2: standardAlfrescoM2,
      modifiedM2: Math.round((standardAlfrescoM2 + alfrescoDelta) * 100) / 100,
      deltaM2: alfrescoDelta,
      recipeId: "recipe_alfresco_m2",
      unitRate: rate,
      subtotal: Math.round(alfrescoDelta * rate),
      accepted: true,
    });
  }

  if (garageDelta > 0) {
    const rate = DATABUILD_RECIPE_RATES.garage_m2;
    areaDeltas.push({
      zoneKey: "garageM2",
      zoneLabel: "Garage Footprint Extension",
      standardM2: standardGarageM2,
      modifiedM2: Math.round((standardGarageM2 + garageDelta) * 100) / 100,
      deltaM2: garageDelta,
      recipeId: "recipe_garage_ext_m2",
      unitRate: rate,
      subtotal: Math.round(garageDelta * rate),
      accepted: true,
    });
  }

  if (wetAreaDelta > 0) {
    const rate = DATABUILD_RECIPE_RATES.wet_area_m2;
    areaDeltas.push({
      zoneKey: "wetAreaM2",
      zoneLabel: "Master Ensuite / Bathroom Extension",
      standardM2: 8.5,
      modifiedM2: Math.round((8.5 + wetAreaDelta) * 100) / 100,
      deltaM2: wetAreaDelta,
      recipeId: "recipe_bath_ext_m2",
      unitRate: rate,
      subtotal: Math.round(wetAreaDelta * rate),
      accepted: true,
    });
  }

  // 3. Strict Fixture Upgrade Triggering
  for (const rule of FIXTURE_UPGRADE_RULES) {
    if (rule.id === "upg_structural_beam_gf_ext") {
      if (isDoubleStorey && livingDelta > 0) {
        inclusionUpgrades.push({
          id: rule.id,
          category: rule.category,
          name: rule.name,
          description: rule.description,
          baseline: rule.baseline,
          detected: rule.detected,
          unitPrice: rule.unitPrice,
          quantity: 1,
          subtotal: rule.unitPrice,
          accepted: true,
          confidence: rule.confidence,
        });
      }
      continue;
    }

    const matchedKw = rule.triggerKeywords.find((kw) => fullSearchText.includes(kw));
    if (matchedKw) {
      const lines = fullSearchText.split(/[\r\n]+/);
      const matchedLine = lines.find((l) => l.includes(matchedKw)) || "";
      const isOwner = isMarkedByOwner(matchedLine);
      const price = isOwner ? 0 : rule.unitPrice;

      inclusionUpgrades.push({
        id: rule.id,
        category: rule.category,
        name: rule.name,
        description: isOwner ? `${rule.description} (Marked by owner / client supply)` : rule.description,
        baseline: rule.baseline,
        detected: rule.detected,
        unitPrice: price,
        quantity: 1,
        subtotal: price,
        accepted: true,
        confidence: rule.confidence,
        isByOwner: isOwner,
        reason: `Matched text token: "${matchedKw}"`,
      });
    }
  }

  const netDeltaM2 = areaDeltas.reduce((acc, d) => acc + d.deltaM2, 0);
  const modifiedTotalM2 = Math.round((standardTotalM2 + netDeltaM2) * 100) / 100;
  const totalAreaCost = areaDeltas.reduce((acc, d) => acc + d.subtotal, 0);
  const totalInclusionsCost = inclusionUpgrades.reduce((acc, u) => acc + u.subtotal, 0);

  return {
    baseDesignName: detectedModelName,
    housingType: housingType as any,
    standardTotalM2,
    modifiedTotalM2,
    netDeltaM2: Math.round(netDeltaM2 * 100) / 100,
    areaDeltas,
    inclusionUpgrades,
    totalAreaCost,
    totalInclusionsCost,
    netTotalCost: totalAreaCost + totalInclusionsCost,
    floorplanDataUrl: dataUrl,
    fileName: file.name,
    detectionSource: "deterministic",
  };
}
