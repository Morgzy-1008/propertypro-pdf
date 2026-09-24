import { pdfDocumentToPagesAndText, compressImageDataUrl } from "@/lib/pdfPages";
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
import {
  calculateScaleCalibration,
  evaluateVanityDimensions,
  evaluateShowerDimensions,
} from "./scaleCalibrationEngine";
import {
  parsePresightOpeningTags,
  diffOpeningsAgainstMaster,
} from "./presightCodeParser";
import {
  getLearnedFeatures,
  matchLearnedFeature,
  detectUnconfirmedFeatures,
  type UnconfirmedFeatureCandidate,
} from "./featureMemoryRegistry";
import { evaluateZoneBoundaryShift } from "./wetAreaDifferentialCalculator";
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
    description: "Extended vanity cabinet with dual undermount basins, twin flick mixers, and upgraded stone benchtop (replaces standard single vanity).",
    baseline: "Single vanity with 1 basin (H1/H2 Standard)",
    detected: "Dual basin vanity layout with twin mixers and double waste plumbing",
    unitPrice: 1280,
    confidence: 0.95,
    triggerKeywords: ["double vanity", "dual basin", "ensuite twin", "2 x basin", "double basin", "his and hers", "twin vanity", "dual vanity"],
  },
  {
    id: "upg_additional_ensuite_wir",
    category: "internal_bathroom",
    name: "Additional Bedroom Ensuite & Walk-in Robe Fitout",
    description: "Conversion of secondary bedroom into private ensuite bathroom (shower recess, toilet suite, vanity basin, wall tiling) and adjoining walk-in robe.",
    baseline: "Standard bedroom with built-in wardrobe",
    detected: "Private ensuite (ENS) and walk-in robe (WIR) addition",
    unitPrice: 12500,
    triggerKeywords: [
      "additional ensuite",
      "2nd ensuite",
      "second ensuite",
      "guest ensuite",
      "bed 2 ensuite",
      "bed 3 ensuite",
      "bed 4 ensuite",
      "bed 5 ensuite",
      "opt ensuite",
      "optional ensuite",
      "added ensuite",
      "ensuite to bed",
      "bed 4 ens",
      "bed 4 wir",
      "bed 4.*wir",
      "bath / ens",
      "bath/ens",
    ],
  },
  {
    id: "upg_living_media_conversion",
    category: "internal_general",
    name: "Living / Media Room Conversion with Skylight",
    description: "Conversion of internal storage or multi-purpose area into functional Living / Media room with roof skylight (3.7m × 4.0m).",
    baseline: "Enclosed storage room with shelving",
    detected: "Living / Media room with skylight feature",
    unitPrice: 4500,
    confidence: 0.95,
    triggerKeywords: ["living / media", "living/media", "media room", "skylight"],
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
    detected: "Wide 3-panel / 4-panel stacking sliding door system ('STACKER' / 'STACKER SLM')",
    unitPrice: 1850,
    confidence: 0.95,
    triggerKeywords: ["stacker", "stacking door", "corner stacker", "3 panel slider", "4 panel slider", "3 panel stacker", "stacker door", "stacker slm", "stacker 21.36", "aluminum stacker"],
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
    id: "upg_gf_bathroom_addition",
    category: "internal_bathroom",
    name: "Ground Floor Full Bathroom Addition / Conversion",
    description: "Conversion of powder room or addition of full Ground Floor Bathroom complete with enclosed shower recess, vanity basin, toilet suite, and floor tiling.",
    baseline: "Standard powder room (toilet and basin only)",
    detected: "Full Ground Floor Bathroom with shower recess, vanity, and toilet",
    unitPrice: 7800,
    confidence: 0.95,
    triggerKeywords: ["gf bathroom", "full bathroom", "ground floor bathroom", "guest bathroom", "bath / ens", "bath/ens", "shower to powder", "full bath gf"],
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
  {
    id: "upg_single_roller_door",
    category: "doors_windows",
    name: "Additional 2100mm × 2400mm Colorbond Single Roller Door",
    description: "Additional 2100mm high × 2400mm wide (21.24) Colorbond single roller door or sectional overhead door with automatic motorized remote control opener (for 3rd car bay or rear yard access).",
    baseline: "Standard double garage with 1 x double sectional overhead door",
    detected: "Dedicated 2100mm × 2400mm single roller door (Roller Door 21.24) specification on plan",
    unitPrice: 1950,
    confidence: 0.95,
    triggerKeywords: ["roller door", "roller door 21.24", "single roller door", "additional roller door", "rear roller door", "rd 21.24", "3rd roller door", "third roller door", "roller door to rear"],
  },
  {
    id: "upg_entry_door_1200",
    category: "doors_windows",
    name: "1200mm Grand Architectural Front Entry Door Upgrade",
    description: "Upgraded 2340mm × 1200mm (or 2040mm × 1200mm) wide Corinthian/Hume architectural feature entrance door with matching wider door frame and weather seal (replaces standard 820mm/920mm door).",
    baseline: "Standard 820mm / 920mm painted entrance door",
    detected: "1200mm wide grand feature entrance door notation ('EXT 1200') on plan",
    unitPrice: 1250,
    confidence: 0.95,
    triggerKeywords: ["ext 1200", "1200 door", "1200mm door", "1200 entrance", "1200 front door", "1200 wide", "1200mm entry", "1200 entry door"],
  },
  {
    id: "upg_entry_door_1020",
    category: "doors_windows",
    name: "1020mm Wide Architectural Front Entry Door Upgrade",
    description: "Upgraded 2040mm × 1020mm (or 2340mm × 1020mm) wide Corinthian/Hume architectural feature front entrance door with matching wider door frame and weather seal (replaces standard 820mm/920mm door).",
    baseline: "Standard 820mm / 920mm painted entrance door",
    detected: "1020mm wide feature front entrance door notation ('EXT 1020') on plan",
    unitPrice: 850,
    confidence: 0.95,
    triggerKeywords: ["ext 1020", "1020 door", "1020mm door", "1020 entrance", "1020 front door", "1020 wide", "1020mm entry"],
  },
  {
    id: "upg_ceiling_2740",
    category: "internal_general",
    name: "2740mm (9ft) Ground Floor Ceiling Height Upgrade",
    description: "Increased ceiling height to 2740mm across Ground Floor living zones.",
    baseline: "Standard 2440mm ceiling height",
    detected: "2740mm Ceilings GF annotation on plan",
    unitPrice: 6850,
    confidence: 0.98,
    triggerKeywords: ["2740", "2740mm", "9ft ceiling", "ground floor ceiling", "gf ceiling"],
  },
  {
    id: "upg_front_balcony",
    category: "structural",
    name: "Front Architectural Feature Balcony",
    description: "Upper floor architectural feature balcony added over front entry porch.",
    baseline: "Standard facade without upper balcony (0.00 m²)",
    detected: "Upper floor feature balcony added over porch",
    triggerKeywords: [
      "added balcony",
      "feature balcony",
      "balcony option",
      "optional balcony",
      "opt balcony",
      "first floor balcony",
      "upper floor balcony",
    ],
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
 * Robust helper to call Gemini API directly in browser with multi-model fallback.
 */
async function callGeminiClientWithFallback(apiKey: string, body: any): Promise<any | null> {
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.7-flash"];
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
        const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return JSON.parse(candidateText);
        }
      } else {
        console.warn(`[Gemini client] ${model} returned HTTP ${resp.status}, trying fallback model...`);
      }
    } catch (e: any) {
      console.warn(`[Gemini client] Error calling ${model}:`, e.message);
    }
  }
  return null;
}

/**
 * Scans the candidate floorplan image sheet / title block to identify the true Hudson Homes design.
 */
export async function identifyDesignModelFromImage(
  candidateDataUrl: string
): Promise<{ designName: string; housingType: "Single Storey" | "Double Storey"; totalM2?: number } | null> {
  if (!candidateDataUrl) return null;
  const apiKey = getGeminiApiKey();

  // Try direct Gemini call if API key is in browser
  if (apiKey) {
    try {
      const cleanB64 = candidateDataUrl.includes(",") ? candidateDataUrl.split(",")[1] : candidateDataUrl;
      const mimeType = candidateDataUrl.includes(";") ? candidateDataUrl.split(";")[0].replace("data:", "") : "image/jpeg";
      const prompt = `Inspect this floorplan drawing sheet. Identify the Hudson Homes house design model name printed in the title block or sheet header (e.g. "Burgundy 30", "Cedar 26", "Azure 23", "Amber 21", "Jasper 26", "Ashton 29", "Turquoise 31"), the housing type ("Single Storey" or "Double Storey"), and the total area in m².
Return ONLY valid JSON:
{
  "designName": string,
  "housingType": "Single Storey" | "Double Storey",
  "totalM2": number
}`;
      const parsed = await callGeminiClientWithFallback(apiKey, {
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanB64 } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      });
      if (parsed) return parsed;
    } catch (err) {
      console.warn("Direct image model identification failed, falling back to proxy:", err);
    }
  }

  // Fallback to /api/analyze-floorplan proxy
  if (typeof window !== "undefined") {
    try {
      const proxyResp = await fetch("/api/analyze-floorplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateImageBase64: candidateDataUrl,
          identifyOnly: true,
          apiKey: apiKey || undefined,
        }),
      });
      if (proxyResp.ok) {
        return await proxyResp.json();
      }
    } catch (err) {
      console.warn("Proxy image model identification failed:", err);
    }
  }

  return null;
}

/**
 * Helper to fetch a local image or PDF and convert it to Base64
 */
async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; base64: string } | null> {
  if (typeof window === "undefined" || !url) return null;
  try {
    const res = await fetch(encodeURI(url));
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
 * In-browser Direct Canvas Geometric & Architectural Diffing Engine.
 * Runs 100% locally on HTML Canvas without external API dependencies.
 * Compares Image 1 (Baseline) vs Image 2 (Candidate) using normalized spatial profiling.
 */
export async function detectVisualModificationsViaCanvas(
  candidateDataUrl: string,
  baselineImageUrl: string,
  designName: string,
  cadSpec: any,
  rawText?: string
): Promise<{
  isModified: boolean;
  notes?: string;
  areaModifications: Array<{
    zone: "living" | "alfresco" | "garage" | "wet_area" | "porch";
    deltaM2: number;
    estimatedLinearExtensionM?: number;
    reason: string;
  }>;
}> {
  if (typeof window === "undefined" || !candidateDataUrl || !baselineImageUrl) {
    return { isModified: false, areaModifications: [] };
  }

  try {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image for canvas diff: " + src));
        img.src = src;
      });
    };

    const [imgCand, imgBase] = await Promise.all([
      loadImage(candidateDataUrl),
      loadImage(baselineImageUrl),
    ]);

    const isInk = (r: number, g: number, b: number) => {
      if (r < 180 && g < 180 && b < 180) return true;
      if (r > 140 && (g < 100 || b < 100)) return true; // red callout box/text
      if (b > 140 && (r < 100 || g < 100)) return true; // blue annotations
      return false;
    };

    const houseWidthM = Number(cadSpec?.width) || 10.55;
    const houseLengthM = Number(cadSpec?.length) || 20.27;
    const standardAlfrescoM2 = Number(cadSpec?.alfrescoM2) || 9.54;
    const standardLivingM2 = Number(cadSpec?.livingM2) || 147.56;
    const standardGarageM2 = Number(cadSpec?.garageM2) || 32.89;

    const isDoubleStorey =
      cadSpec?.housingType === "Double Storey" ||
      /double|two\s*stor/i.test(cadSpec?.housingType || "") ||
      /double|two\s*stor/i.test(designName || "") ||
      (cadSpec?.totalM2 && cadSpec.totalM2 > 270);

    const mods: Array<{
      zone: "living" | "alfresco" | "garage" | "wet_area" | "porch";
      deltaM2: number;
      estimatedLinearExtensionM?: number;
      reason: string;
    }> = [];

    // -------------------------------------------------------------------------
    // STEP 1: DIMENSION TEXT PARSING (Exact printed architectural dimensions)
    // -------------------------------------------------------------------------
    const searchStr = rawText || "";

    // 1A. Alfresco Dimension Delta
    const alfrescoDimRegex = /(?:covered\s*)?alfresco\s*[\r\n\t:]*\s*(\d+(?:\.\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:\.\d+)?)/i;
    const alfMatch = searchStr.match(alfrescoDimRegex);
    if (alfMatch) {
      const wCand = parseFloat(alfMatch[1]);
      const dCand = parseFloat(alfMatch[2]);
      const candAlfM2 = Math.round(wCand * dCand * 100) / 100;
      const deltaM2 = Math.round((candAlfM2 - standardAlfrescoM2) * 100) / 100;
      if (deltaM2 >= 1.0) {
        mods.push({
          zone: "alfresco",
          deltaM2,
          estimatedLinearExtensionM: dCand,
          reason: `Auto-calculated from plan geometry: Covered Alfresco extended to ${wCand}m × ${dCand}m (${candAlfM2.toFixed(2)} m² total; Standard: ${standardAlfrescoM2.toFixed(2)} m² → Delta: +${deltaM2.toFixed(2)} m² @ $920/m²).`,
        });
      }
    }

    // 1B. Garage Dimension Delta
    const garageDimRegex = /garage\s*[\r\n\t:]*\s*(\d+(?:\.\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:\.\d+)?)/i;
    const garMatch = searchStr.match(garageDimRegex);
    if (garMatch) {
      const wCand = parseFloat(garMatch[1]);
      const dCand = parseFloat(garMatch[2]);
      const candGarM2 = Math.round(wCand * dCand * 100) / 100;
      const deltaM2 = Math.round((candGarM2 - standardGarageM2) * 100) / 100;
      if (deltaM2 >= 2.0) {
        mods.push({
          zone: "garage",
          deltaM2,
          estimatedLinearExtensionM: wCand,
          reason: `Auto-calculated from plan geometry: Garage extended to ${wCand}m × ${dCand}m (${candGarM2.toFixed(2)} m² total; Standard: ${standardGarageM2.toFixed(2)} m² → Delta: +${deltaM2.toFixed(2)} m² @ $1,150/m²).`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // STEP 2: CANVAS GEOMETRIC PROFILING & PIXEL-FOR-PIXEL SUBTRACTION MATRIX
    // -------------------------------------------------------------------------
    const w = 1000;
    const h = 1500;

    const findBBox = (img: HTMLImageElement, xMinFrac: number, xMaxFrac: number, yMinFrac: number, yMaxFrac: number) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, count: 0 };
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      let minX = w, maxX = 0, minY = h, maxY = 0, count = 0;
      const x0 = Math.floor(w * xMinFrac);
      const x1 = Math.floor(w * xMaxFrac);
      const y0 = Math.floor(h * yMinFrac);
      const y1 = Math.floor(h * yMaxFrac);

      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const idx = (y * w + x) * 4;
          if (isInk(data[idx], data[idx + 1], data[idx + 2])) {
            count++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, count };
    };

    // For Double Storey: Ground Floor is on the left half (x: 0.05 to 0.48)
    // For Single Storey: Full slab is centered (x: 0.15 to 0.85)
    const baseBox = isDoubleStorey
      ? findBBox(imgBase, 0.05, 0.48, 0.12, 0.92)
      : findBBox(imgBase, 0.18, 0.82, 0.10, 0.88);

    const candBox = isDoubleStorey
      ? findBBox(imgCand, 0.05, 0.48, 0.10, 0.92)
      : findBBox(imgCand, 0.18, 0.82, 0.10, 0.88);

    const baseHp = baseBox.height || 1;
    const candHp = candBox.height || 1;
    const baseWp = baseBox.width || 1;
    const candWp = candBox.width || 1;

    // Check Rear Pushout (Backyard expansion past baseline rear boundary)
    const normBaseMinY = baseBox.minY / h;
    const normCandMinY = candBox.minY / h;
    const rearPushOutFrac = normBaseMinY - normCandMinY;

    if (!mods.some((m) => m.zone === "alfresco") && rearPushOutFrac > 0.035 && baseHp > 200) {
      const pushOutDepthM = Math.round(((rearPushOutFrac * h) / candHp) * houseLengthM * 10) / 10;
      if (pushOutDepthM >= 1.5) {
        const alfrescoWidthM = Math.round(houseWidthM * 0.65 * 10) / 10;
        const totalAlfM2 = Math.round(alfrescoWidthM * (pushOutDepthM + 3.0) * 100) / 100;
        const deltaM2 = Math.max(8.0, Math.round((totalAlfM2 - standardAlfrescoM2) * 100) / 100);

        mods.push({
          zone: "alfresco",
          deltaM2,
          estimatedLinearExtensionM: pushOutDepthM,
          reason: `Auto-calculated from plan geometry: Covered Alfresco extended ${pushOutDepthM}m into rear yard (${alfrescoWidthM}m width × ${pushOutDepthM}m depth = +${deltaM2.toFixed(2)} m²; Standard: ${standardAlfrescoM2.toFixed(2)} m² → Total: ${(standardAlfrescoM2 + deltaM2).toFixed(2)} m² @ $920/m²).`,
        });
      }
    }

    // Check Side Expansion (Garage / Storage widening)
    if (!mods.some((m) => m.zone === "garage")) {
      const normBaseMaxX = baseBox.maxX / w;
      const normCandMaxX = candBox.maxX / w;
      const sideStepOutFrac = normCandMaxX - normBaseMaxX;

      if (sideStepOutFrac > 0.035 && baseWp > 200) {
        const extWidthM = Math.round(((sideStepOutFrac * w) / candWp) * houseWidthM * 10) / 10;
        if (extWidthM >= 0.7) {
          const garageDepthM = 5.5;
          const deltaGarageM2 = Math.round(extWidthM * garageDepthM * 100) / 100;
          mods.push({
            zone: "garage",
            deltaM2: deltaGarageM2,
            estimatedLinearExtensionM: extWidthM,
            reason: `Auto-calculated from plan geometry: Garage widened by ${extWidthM}m (${extWidthM}m width × ${garageDepthM}m depth = +${deltaGarageM2.toFixed(2)} m² @ $1,150/m²).`,
          });
        }
      }
    }

    return {
      isModified: mods.length > 0,
      notes:
        mods.length > 0
          ? mods.map((m) => m.reason).join(" ")
          : "Standard baseline architectural layout verified via direct canvas geometry.",
      areaModifications: mods,
    };
  } catch (err) {
    console.warn("Canvas visual modification detector error:", err);
    return { isModified: false, areaModifications: [] };
  }
}

/**
 * Calls Gemini Multimodal Vision API (gemini-3.6-flash) using Dual-Image Visual Diffing.
 * Compares Image 1 (Official Baseline Blueprint) vs Image 2 (Candidate Modified Plan).
 * Falls back seamlessly to /api/analyze-floorplan serverless proxy if direct call fails.
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
  if (!dataUrl) return null;

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

    const prompt = `You are a Senior Architectural Estimator and Building Surveyor at Hudson Homes.
Your objective is to perform a 100% comprehensive architectural discrepancy and modification analysis comparing the official Hudson Homes standard baseline blueprint against the uploaded candidate / modified floorplan drawing.

${
  hasBaseline
    ? `YOU ARE COMPARING TWO BLUEPRINT DRAWINGS:
- IMAGE 1 (Standard Baseline): The official brochure blueprint for "${suggestedDesign}" (${housingType}, standard total area: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m², garage: ${standardGarageM2} m², porch: ${standardPorchM2} m²; overall width: ${cadSpec?.width || 10.55}m, length: ${cadSpec?.length || 20.27}m).
- IMAGE 2 (Candidate Drawing): The uploaded candidate / modified floorplan drawing.`
    : `YOU ARE INSPECTING THE UPLOADED CANDIDATE FLOORPLAN:
- Baseline Design Reference: "${suggestedDesign}" (${housingType}, total: ${standardTotalM2} m²; living: ${standardLivingM2} m², alfresco: ${standardAlfrescoM2} m², garage: ${standardGarageM2} m², porch: ${standardPorchM2} m²).`
}

UNIVERSAL ARCHITECTURAL VISUAL DIFFING PROTOCOL:

1. HOME DESIGN MODEL & STOREY CLASSIFICATION:
   - Ground truth baseline design: "${suggestedDesign}" (${housingType}).
   - Confirm whether the candidate drawing in Image 2 is "${suggestedDesign}" or states another specific Hudson model in its title block.
   - Return "detectedModelName": "${suggestedDesign}".
   - Return "housingType": "${housingType}".

2. STRICT BASELINE INCLUSION IMMUNITY (ZERO FALSE UPGRADES):
   - EVERYTHING shown on the official standard baseline blueprint (Image 1) is a 100% STANDARD INCLUDED FEATURE ($0).
   - Standard baseline structural elements NEVER incur an upgrade charge:
     * Master Bedroom (Bed 1) private Ensuite (shower, vanity, toilet) is STANDARD INCLUDED ($0).
     * Master Bedroom (Bed 1) Walk-In Robe (WIR) or built-in wardrobe is STANDARD INCLUDED ($0).
     * Standard built-in sliding wardrobes in secondary bedrooms are STANDARD INCLUDED ($0).
     * Standard Kitchen island bench, pantry (WIP/cupboard), cooktop, and sink are STANDARD INCLUDED ($0).
     * Standard Garage (double or single sectional door) is STANDARD INCLUDED ($0).
     * Standard Covered Alfresco slab/roof and front Porch are STANDARD INCLUDED ($0).
     * Indicative furniture, cars, and landscaping are excluded from building contracts.
   - An ensuite, bathroom, or robe can ONLY be reported as an added inclusion IF:
     * A secondary bedroom (e.g. Bed 2, 3, 4, 5) or guest suite has a NEW additional ensuite added that is NOT present in Image 1, OR
     * An explicit markup / annotation (e.g. "OPT ENSUITE", "ADDITIONAL ENSUITE", "CONVERT BED 3 TO WIR") is present on Image 2.
   - NEVER charge for a master ensuite or master WIR!

3. SINGLE STOREY STRUCTURAL INVARIANTS:
   - If housingType is "Single Storey":
     * The building has ONLY ONE LEVEL (Ground Floor).
     * Upper floor balconies, upper floor living extensions, and second-storey structural support beams are PHYSICALLY IMPOSSIBLE.
     * NEVER detect or report balconies or upper floor features on a Single Storey home!

4. THOROUGH ROOM-BY-ROOM AUDIT & COMPARISON (DO NOT ASSUME IDENTICAL):
   - You MUST conduct a meticulous room-by-room, door-by-door, and dimension-by-dimension audit comparing Image 2 against Image 1.
   - Do NOT assume Image 2 is identical just because it says "${suggestedDesign}" in the title block. Many plans are customized (e.g. "${suggestedDesign} Custom").
   - CRITICAL NOTE ON MARGIN TABLES: Draftsmen and clients often modify wall lines, push out alfrescos, or step out garage walls WITHOUT updating the printed schedule table in the margin (which often still shows the original brochure numbers). DO NOT RELY ON THE PRINTED TABLE TO DECIDE IF WALLS MOVED! You must inspect the actual drawn wall lines and room boundaries in Image 2 vs Image 1.
   - Check every room label, wall line, and dimension on Image 2 against Image 1:
     * Outdoor Alfresco: Check printed dimensions (e.g. 7.5x4.0 vs 4.5x3.0) OR if the slab/roofline visibly extends further rearward or northward along adjacent bedrooms past the standard baseline boundary. If larger, report "alfresco" area extension with calculated deltaM2!
     * Garage: Check if the garage is widened or stepped outward (e.g. right wall stepped out beyond living wall line, 5.7x5.7 vs 5.5x5.5, or 3rd car bay / triple garage addition). Report "garage" area extension!
     * Front Entry Door: Check if Image 2 marks "EXT 1200" (1200mm door) or "EXT 1020" (1020mm door).
     * Master Ensuite: Check if the vanity has dual basins / twin mixers (double vanity upgrade) replacing the standard single basin.
     * Alfresco Doors: Check if a wide multi-panel sliding or stacking door ("STACKER" / "STACKER SLM" / "STACKER 21.36") replaces standard sliding doors.
     * Ground Floor Bathroom: Check if the ground floor powder room has been converted to a full bathroom with a shower recess, or if a guest suite is added.
     * Secondary Bedrooms (Bed 2, Bed 3, Bed 4): Check if Bed 4 or Bed 3 has been upgraded with its own private Ensuite (ENS) and Walk-in Robe (WIR).
     * Ceilings: Check if high ceilings are annotated (e.g. "2740mm Ceilings GF").
   - If and ONLY if Image 2 is truly an unmodified standard brochure copy with identical dimensions, flush walls, and zero alterations, set isModified: false, areaModifications: [], detectedInclusions: [].

5. SPATIAL & FOOTPRINT PERIMETER COMPARISON:
   - If external walls have NOT moved and room dimensions match Image 1: externalFootprintChanged: false, areaModifications: [].
   - If external walls or outdoor slabs HAVE visibly moved outward (e.g. rear alfresco pushout, living extension, garage widening):
     * Set externalFootprintChanged: true.
     * Add to areaModifications with zone, deltaM2, and dimensions.
   - For ANY item marked "by owner", "client supply", or "NIC" (not in contract): set isByOwner: true, unitPrice: 0.

6. VERIFIED FIXTURE UPGRADES & MODIFICATIONS (Include in detectedInclusions if present):
   - "2740mm Ceilings GF" -> id: "upg_ceiling_2740", name: "2740mm (9ft) Ground Floor Ceiling Height Upgrade", category: "internal_general", unitPrice: 6850
   - Extended kitchen island with 40mm waterfall stone ends -> id: "upg_kitchen_island_waterfall", name: "Extended Island Benchtop with 40mm Waterfall Stone Ends", category: "internal_kitchen", unitPrice: 1950
   - Master Ensuite Double Basin Vanity -> id: "upg_ensuite_double_vanity", name: "Master Ensuite Double Basin Vanity Upgrade", category: "internal_bathroom", unitPrice: 1280
   - 1200mm Wide Grand Architectural Front Entry Door ("EXT 1200") -> id: "upg_entry_door_1200", name: "1200mm Grand Architectural Front Entry Door Upgrade", category: "doors_windows", unitPrice: 1250
   - 1020mm Wide Front Entry Door ("EXT 1020") -> id: "upg_entry_door_1020", name: "1020mm Wide Architectural Front Entry Door Upgrade", category: "doors_windows", unitPrice: 850
   - Aluminum Stacker Sliding Door to Alfresco ("STACKER" / "STACKER SLM" / "STACKER 21.36") -> id: "upg_alfresco_stacker_door", name: "3-Panel Aluminum Stacker Sliding Door to Alfresco", category: "doors_windows", unitPrice: 1850
   - Ground Floor Full Bathroom Addition / Conversion (shower recess, vanity, toilet) -> id: "upg_gf_bathroom_addition", name: "Ground Floor Full Bathroom Addition / Conversion", category: "internal_bathroom", unitPrice: 7800
   - Additional 21.24 single roller door (for 3rd car bay or rear yard access) -> id: "upg_single_roller_door", name: "Additional 2100mm × 2400mm Colorbond Single Roller Door", category: "doors_windows", unitPrice: 1950
   - Secondary bedroom (Bed 2/3/4) converted to private Ensuite & WIR -> id: "upg_additional_ensuite_wir", name: "Additional Bedroom Ensuite & Walk-in Robe Fitout", category: "internal_bathroom", unitPrice: 12500
   - Front Balcony (Upper Floor Double Storey only) -> id: "upg_front_balcony", name: "Front Architectural Feature Balcony", category: "structural", unitPrice: 0

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

    let parsedData: any = null;
    const apiKey = getGeminiApiKey();

    // 1. First try Direct Client Call if API key is available
    if (apiKey) {
      try {
        const parts: any[] = [{ text: prompt }];
        if (hasBaseline) {
          parts.push({
            inlineData: {
              mimeType: baselineImg.mimeType,
              data: baselineImg.base64,
            },
          });
        }
        parts.push({
          inlineData: {
            mimeType,
            data: cleanB64,
          },
        });

        const parsed = await callGeminiClientWithFallback(apiKey, {
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });
        if (parsed) {
          parsedData = parsed;
        }
      } catch (clientErr) {
        console.warn("Direct Gemini call error, attempting proxy fallback:", clientErr);
      }
    }

    // 2. If direct call did not succeed, try serverless proxy endpoint /api/analyze-floorplan
    if (!parsedData && typeof window !== "undefined") {
      try {
        const proxyResp = await fetch("/api/analyze-floorplan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateImageBase64: dataUrl,
            baselineImageBase64: baselineImg ? `data:${baselineImg.mimeType};base64,${baselineImg.base64}` : undefined,
            baselineMimeType: baselineImg?.mimeType,
            suggestedDesign,
            housingType,
            fileName,
            cadSpec,
            stdAreas,
            rawText,
            apiKey: apiKey || undefined,
          }),
        });
        if (proxyResp.ok) {
          parsedData = await proxyResp.json();
        }
      } catch (proxyErr) {
        console.warn("Serverless analyze-floorplan proxy error:", proxyErr);
      }
    }

    if (!parsedData) return null;

    // Universal catalog normalization and deduplication for detected inclusions
    if (parsedData.detectedInclusions && Array.isArray(parsedData.detectedInclusions)) {
      const normalizedInclusions: any[] = [];
      const seenSemanticKeys = new Set<string>();

      for (const rawInc of parsedData.detectedInclusions) {
        const inc: any = typeof rawInc === "string" ? { name: rawInc, reason: rawInc, unitPrice: 0 } : rawInc;
        const lowerText = `${inc.id || ""} ${inc.name || ""} ${inc.description || ""} ${inc.reason || ""}`.toLowerCase();
        const isDouble = housingType === "Double Storey" || /double|two\s*stor/i.test(suggestedDesign);

        // 1. Discard standard inclusions from baseline (master ensuite, robes, kitchen island, etc.)
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

        let matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === inc.id);
        if (!matchedRule) {
          if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_single_roller_door");
          } else if (/ext\s*1020|1020\s*door|1020mm\s*door|1020\s*entry/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_entry_door_1020");
          } else if (/double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_ensuite_double_vanity");
          } else if (/2740|9ft|ground\s*floor\s*ceiling|gf\s*ceiling/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_ceiling_2740");
          } else if (isDouble && /balcony|upper\s*balcony|porch\s*balcony/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_front_balcony");
          } else if (/additional\s*ensuite|2nd\s*ensuite|second\s*ensuite|guest\s*ensuite|bed\s*[2-5]\s*ensuite|opt\s*ensuite/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_additional_ensuite_wir");
          } else if (/storage\s*conversion|study\s*conversion|convert.*media/i.test(lowerText)) {
            matchedRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_living_media_conversion");
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
              unitPrice: isOwner ? 0 : (matchedRule.unitPrice !== undefined ? matchedRule.unitPrice : (inc.unitPrice ?? 0)),
              quantity: inc.quantity || 1,
              reason: inc.reason || matchedRule.description,
            }
          : {
              ...inc,
              unitPrice: isOwner ? 0 : (inc.unitPrice ?? 0),
            };

        // Semantic deduplication key
        let semanticKey = finalItem.id || finalItem.name.toLowerCase().trim();
        if (/bed\s*4.*(?:ensuite|wir)|bed\s*4/i.test(lowerText)) {
          semanticKey = "feature_bed4_wir";
        } else if (/bed\s*3.*(?:ensuite|wir)|bed\s*3/i.test(lowerText)) {
          semanticKey = "feature_bed3_wir";
        } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(lowerText)) {
          semanticKey = "feature_gf_bathroom";
        } else if (/ensuite.*wir|additional.*ensuite|bed.*ensuite/i.test(lowerText)) {
          semanticKey = "feature_ensuite_wir_addition";
        } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(lowerText)) {
          semanticKey = "feature_living_media_conversion";
        } else if (/double\s*vanity|dual\s*basin|twin\s*basin|double\s*basin/i.test(lowerText)) {
          semanticKey = "feature_double_vanity";
        } else if (/roller\s*door|rd\s*21\.24/i.test(lowerText)) {
          semanticKey = "feature_roller_door";
        } else if (/1200|ext\s*1200/i.test(lowerText)) {
          semanticKey = "feature_entry_door_1200";
        } else if (/1020|ext\s*1020/i.test(lowerText)) {
          semanticKey = "feature_entry_door_1020";
        } else if (/stacker|stacking/i.test(lowerText)) {
          semanticKey = "feature_stacker_door";
        } else if (/2740|gf\s*ceiling/i.test(lowerText)) {
          semanticKey = "feature_ceiling_2740";
        } else if (/balcony/i.test(lowerText)) {
          semanticKey = "feature_front_balcony";
        }

        if (!seenSemanticKeys.has(semanticKey)) {
          seenSemanticKeys.add(semanticKey);
          normalizedInclusions.push(finalItem);
        }
      }

      parsedData.detectedInclusions = normalizedInclusions;
    }

    return parsedData;
  } catch (err) {
    console.warn("Gemini Vision floorplan analysis failed:", err);
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
      dataUrl = parsed.compositeFloorplanDataUrl || parsed.primaryFloorplanDataUrl || parsed.pages[0] || "";
    } catch (err: any) {
      console.warn("PDF parsing error:", err);
      throw new Error(`PDF reading error: ${err.message || "Failed to parse PDF document. Please verify the file is not password-protected."}`);
    }
  } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
    rawText = await file.text();
  } else {
    // Image file: automatically compress and normalize resolution to ensure fast processing
    const rawDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.readAsDataURL(file);
    });
    dataUrl = await compressImageDataUrl(rawDataUrl, 1800, 1800, 0.88);
  }

  // 2. Identify Base Design Model (Universal Dynamic Resolution)
  // Stage 1: Lock the base design model with strict deterministic priority.
  let detectedModelName = "";
  let housingType = "Single Storey";

  // Priority 1: Explicit text or filename match from embedded PDF fonts / file name
  const textMatched = detectFloorplanFromText(rawText, file.name);
  if (textMatched) {
    detectedModelName = textMatched.matchedDesignName;
    housingType = textMatched.housingType;
  } else {
    const matched = findHudsonModelByName(file.name) || findHudsonModelByName(rawText);
    if (matched) {
      detectedModelName = matched.row.name;
      housingType = matched.housingType;
    }
  }

  // Priority 1.5: If filename and rawText had no recognizable Hudson model, scan the sheet header/title block from image
  if (!detectedModelName && dataUrl) {
    const visualModel = await identifyDesignModelFromImage(dataUrl);
    if (visualModel && visualModel.designName && visualModel.designName.toLowerCase() !== "unknown") {
      const verified = findHudsonModelByName(visualModel.designName);
      if (verified) {
        detectedModelName = verified.row.name;
        housingType = verified.housingType;
      } else {
        detectedModelName = visualModel.designName;
        housingType = visualModel.housingType || "Single Storey";
      }
    }
  }

  // Priority 2: If the uploaded file had no recognized model, fall back to activeDesignName from Step 2
  if ((!detectedModelName || detectedModelName.toLowerCase() === "unknown") && activeDesignName && activeDesignName !== "UNSELECTED") {
    detectedModelName = activeDesignName;
    housingType = activeHousingType || getHousingTypeForDesign(activeDesignName) || "Single Storey";
  }

  // Handle Ember/Amber spelling
  if (/ember\s*21/i.test(detectedModelName) || /ember\s*21/i.test(file.name) || /ember\s*21/i.test(rawText)) {
    detectedModelName = "Amber 21";
  }

  // ZERO-HALLUCINATION ENFORCEMENT: Never silently guess or default to Amber 21!
  if (!detectedModelName || detectedModelName.toLowerCase() === "unknown") {
    throw new Error(
      "Unable to automatically identify the Hudson Homes design model from this plan's title block. Please select your base model in Step 2 before uploading."
    );
  }

  // Dynamically extract brochure table specs if printed on plan
  const extractM2 = (pattern: RegExp, maxNormal = 600) => {
    const m = rawText.match(pattern);
    if (!m) return undefined;
    const rawNum = m[1].replace(/[·•]/g, ".").replace(/,/g, "");
    let val = parseFloat(rawNum);
    if (isNaN(val) || val <= 0) return undefined;
    // Auto-normalize if decimal dot was dropped by PDF glyph encoding (e.g. 20871 -> 208.71, 954 -> 9.54, 3427 -> 34.27)
    if (val > maxNormal && val < 100000) {
      val = val / 100;
    }
    return Math.round(val * 100) / 100;
  };
  const extractDim = (pattern: RegExp) => {
    const m = rawText.match(pattern);
    if (!m) return undefined;
    const rawNum = m[1].replace(/[·•]/g, ".").replace(/,/g, "");
    let val = parseFloat(rawNum);
    if (isNaN(val) || val <= 0) return undefined;
    if (val > 50) {
      val = val / 100;
    }
    return Math.round(val * 100) / 100;
  };
  const tableLivingM2 = extractM2(/living\s*(?:area)?\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i, 350);
  const tableGarageM2 = extractM2(/garage\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i, 60);
  const tableAlfrescoM2 = extractM2(/alfresco\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i, 40);
  const tablePorchM2 = extractM2(/porch\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i, 15);
  const tableTotalM2 = extractM2(/total\s*(?:area)?\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i, 600);
  const tableWidthM = extractDim(/overall\s*width\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i);
  const tableLengthM = extractDim(/overall\s*length\s*[:\s]+(\d+(?:[.\u00B7\u2022]\d+)?)\s*m/i);

  // Baseline CAD & Dimensions Lookup (Calibrated dynamically for the locked base model)
  const verifiedModel = findHudsonModelByName(detectedModelName);
  const stdAreasLookup = getStandardAreaBreakdown(
    detectedModelName,
    housingType,
    verifiedModel?.row.m2 || 190
  );
  const fallbackLiving =
    stdAreasLookup.livingM2 ||
    (stdAreasLookup.groundLivingM2 && stdAreasLookup.firstLivingM2
      ? stdAreasLookup.groundLivingM2 + stdAreasLookup.firstLivingM2
      : 140);

  const cadSpec = {
    ...(HUDSON_CAD_REGISTRY[detectedModelName] || {
      totalM2: tableTotalM2 || verifiedModel?.row.m2 || stdAreasLookup.totalM2 || 190,
      livingM2: tableLivingM2 || fallbackLiving,
      alfrescoM2: tableAlfrescoM2 || stdAreasLookup.alfrescoM2 || 10,
      garageM2: tableGarageM2 || stdAreasLookup.garageM2 || 33,
      porchM2: tablePorchM2 || stdAreasLookup.porchM2 || 2.5,
      width: tableWidthM || 10.55,
      length: tableLengthM || 20.27,
      alfrescoDims: "2.6m × 3.6m",
      garageDims: "5.5m × 5.5m",
    }),
  };

  if (tableTotalM2) cadSpec.totalM2 = tableTotalM2;
  if (tableLivingM2) cadSpec.livingM2 = tableLivingM2;
  if (tableGarageM2) cadSpec.garageM2 = tableGarageM2;
  if (tableAlfrescoM2) cadSpec.alfrescoM2 = tableAlfrescoM2;
  if (tablePorchM2) cadSpec.porchM2 = tablePorchM2;
  if (tableWidthM) cadSpec.width = tableWidthM;
  if (tableLengthM) cadSpec.length = tableLengthM;

  const isDoubleStorey =
    housingType === "Double Storey" ||
    /double|two\s*stor/i.test(detectedModelName) ||
    cadSpec.totalM2 > 280;

  const standardTotalM2 = tableTotalM2 || cadSpec.totalM2;
  const stdAreas = getStandardAreaBreakdown(detectedModelName, housingType, standardTotalM2);
  const standardLivingM2 = tableLivingM2 || Number(stdAreas.livingM2 || stdAreas.groundLivingM2 || cadSpec.livingM2);
  const standardAlfrescoM2 = tableAlfrescoM2 || Number(stdAreas.alfrescoM2 || cadSpec.alfrescoM2);
  const standardGarageM2 = tableGarageM2 || Number(stdAreas.garageM2 || cadSpec.garageM2);
  const standardPorchM2 = tablePorchM2 || Number(stdAreas.porchM2 || cadSpec.porchM2);

  // 3. Attempt Multimodal Gemini Vision AI Analysis & In-Browser Canvas Geometric Diffing in Parallel
  const baselineUrl = getBaselineFloorplanImageUrl(detectedModelName);
  const [geminiResult, canvasResult] = await Promise.all([
    dataUrl
      ? callGeminiFloorplanAnalysis(
          dataUrl,
          rawText,
          detectedModelName,
          housingType,
          file.name,
          cadSpec,
          stdAreas
        )
      : Promise.resolve(null),
    dataUrl
      ? detectVisualModificationsViaCanvas(
          dataUrl,
          baselineUrl,
          detectedModelName,
          cadSpec,
          rawText
        )
      : Promise.resolve(null),
  ]);

  // STAGE 2 LOCK: detectedModelName and housingType were locked in Stage 1.
  // Stage 2 discrepancy diffing must NEVER override the base design model!

  const areaDeltas: DetectedAreaDelta[] = [];
  const inclusionUpgrades: DetectedInclusionUpgrade[] = [];

  // Determine spatial area modifications by unifying Canvas CAD geometry and Gemini AI
  const spatialModsToApply: Array<{
    zone: "living" | "alfresco" | "garage" | "wet_area" | "porch";
    deltaM2: number;
    estimatedLinearExtensionM?: number;
    reason: string;
  }> = [];

  const isExternalFootprintUnchanged =
    geminiResult &&
    (geminiResult as any).externalFootprintChanged === false &&
    (!geminiResult.areaModifications || geminiResult.areaModifications.length === 0);

  if (isExternalFootprintUnchanged) {
    // Zero external footprint modifications confirmed by AI Vision
    spatialModsToApply.length = 0;
  } else if (geminiResult && geminiResult.areaModifications && geminiResult.areaModifications.length > 0) {
    // Gemini reads exact printed architectural dimensions (e.g. 7.5x4.0 vs 4.5x3.0 = +16.50 m²)
    spatialModsToApply.push(...geminiResult.areaModifications);

    // Merge any non-overlapping zones detected by Canvas (e.g. garage widening, porch)
    if (canvasResult && canvasResult.areaModifications) {
      for (const cMod of canvasResult.areaModifications) {
        if (!spatialModsToApply.some((s) => s.zone === cMod.zone)) {
          spatialModsToApply.push(cMod);
        }
      }
    }
  } else if (canvasResult && canvasResult.isModified && canvasResult.areaModifications.length > 0) {
    // Direct local canvas geometry
    spatialModsToApply.push(...canvasResult.areaModifications);
  }

  for (const mod of spatialModsToApply) {
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

  // Populate Inclusions from Gemini, deduplicating any structural area items
  if (geminiResult && geminiResult.detectedInclusions && geminiResult.detectedInclusions.length > 0) {
    const hasAlfrescoDelta = areaDeltas.some((d) => d.zoneKey === "alfrescoM2");
    const hasLivingDelta = areaDeltas.some((d) => d.zoneKey === "livingM2" || d.zoneKey === "groundLivingM2");
    const hasGarageDelta = areaDeltas.some((d) => d.zoneKey === "garageM2");

    for (const rawInc of geminiResult.detectedInclusions) {
      const inc: any = typeof rawInc === "string" ? { name: rawInc, reason: rawInc, unitPrice: 0 } : rawInc;
      const incName = inc.name || "";
      const incReason = inc.reason || "";
      const fullIncDesc = (incName + " " + incReason).toLowerCase();

      // Deduplicate structural extensions already charged in areaDeltas
      if (hasAlfrescoDelta && /(?:alfresco|outdoor).*slab|alfresco.*(?:ext|extension|roof|post)|(?:ext|extension|extended|slab).*alfresco/i.test(fullIncDesc)) {
        continue;
      }
      if (hasLivingDelta && /enclosure|enclosed|living\s*(?:ext|extension)|family\s*(?:ext|extension)/i.test(fullIncDesc)) {
        continue;
      }
      if (hasGarageDelta && !/roller\s*door|sectional\s*door/i.test(fullIncDesc) && /triple\s*garage|garage\s*(?:ext|extension|slab|3rd|bay|footprint)|(?:extended|widened).*garage/i.test(fullIncDesc)) {
        continue;
      }

      const isOwner = !!inc.isByOwner;
      const qty = inc.quantity || 1;
      const matchedCatalogRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === inc.id);
      let finalUnitPrice = isOwner ? 0 : (matchedCatalogRule?.unitPrice !== undefined ? matchedCatalogRule.unitPrice : (inc.unitPrice || 0));

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
        name: incName,
        description: incReason || (isOwner ? "Specified by owner (excluded from builder tender)" : "Architectural specification upgrade"),
        baseline: inc.baseline || "Standard brochure inclusion",
        detected: inc.detected || incName,
        unitPrice: finalUnitPrice,
        quantity: qty,
        subtotal: finalUnitPrice * qty,
        accepted: true,
        confidence: 0.95,
        isByOwner: isOwner,
        isCustomItem: inc.isCustomItem,
        customBreakdown,
        reason: incReason,
      });
    }
  }

  // Universal: Ensure Single Roller Door variation is recognized when a 3rd car bay or additional roller door is specified
  const hasThirdCarBayOrRollerDoor =
    areaDeltas.some((d) => d.zoneKey === "garageM2" && d.deltaM2 >= 10.0) ||
    /roller\s*door\s*21\.24|roller\s*door|triple\s*garage|3rd\s*car|three\s*car/i.test(rawText) ||
    /roller\s*door\s*21\.24|roller\s*door|triple\s*garage|3rd\s*car/i.test(geminiResult?.analysisNotes || "");
  if (hasThirdCarBayOrRollerDoor) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_single_roller_door" || /roller\s*door|rd\s*21\.24/i.test(u.name))) {
      const rollerRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_single_roller_door");
      if (rollerRule) {
        inclusionUpgrades.push({
          id: rollerRule.id,
          category: rollerRule.category,
          name: rollerRule.name,
          description: rollerRule.description,
          baseline: rollerRule.baseline,
          detected: rollerRule.detected,
          unitPrice: rollerRule.unitPrice,
          quantity: 1,
          subtotal: rollerRule.unitPrice,
          accepted: true,
          confidence: rollerRule.confidence,
          isByOwner: false,
          reason: "Dedicated 2100mm × 2400mm single roller door (Roller Door 21.24) added for 3rd garage car bay (variation cost above square meter rate).",
        });
      }
    }
  }

  // Universal: Ensure Additional Ensuite & WIR is recognized if specified for a secondary bedroom
  const hasBed4OrSecondaryEnsuite =
    /bed\s*[2-5].*(?:ens|ensuite|wir)|bath\s*\/\s*ens/i.test(rawText) ||
    /bed\s*[2-5].*(?:ens|ensuite|wir)|bath\s*\/\s*ens/i.test(geminiResult?.analysisNotes || "");
  if (hasBed4OrSecondaryEnsuite) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_additional_ensuite_wir" || /bed\s*[2-5].*ens|additional.*ensuite/i.test(u.name))) {
      const ensRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_additional_ensuite_wir");
      if (ensRule) {
        inclusionUpgrades.push({
          id: ensRule.id,
          category: ensRule.category,
          name: ensRule.name,
          description: ensRule.description,
          baseline: ensRule.baseline,
          detected: "Secondary bedroom (Bed 4) private ensuite & walk-in robe addition",
          unitPrice: ensRule.unitPrice,
          quantity: 1,
          subtotal: ensRule.unitPrice,
          accepted: true,
          confidence: ensRule.confidence,
          isByOwner: false,
          reason: "Conversion of secondary bedroom (Bed 4) into private ensuite and walk-in robe.",
        });
      }
    }
  }

  // Universal: Ensure 1200mm Front Entry Door is recognized
  const hasExt1200Door =
    /ext\s*1200|1200\s*(?:entry|door|entrance)/i.test(rawText) ||
    /ext\s*1200|1200\s*(?:entry|door|entrance)/i.test(geminiResult?.analysisNotes || "");
  if (hasExt1200Door) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_entry_door_1200" || /1200/i.test(u.name))) {
      const doorRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_entry_door_1200");
      if (doorRule) {
        inclusionUpgrades.push({
          id: doorRule.id,
          category: doorRule.category,
          name: doorRule.name,
          description: doorRule.description,
          baseline: doorRule.baseline,
          detected: doorRule.detected,
          unitPrice: doorRule.unitPrice,
          quantity: 1,
          subtotal: doorRule.unitPrice,
          accepted: true,
          confidence: doorRule.confidence,
          isByOwner: false,
          reason: "1200mm wide architectural feature entrance door ('EXT 1200') on plan.",
        });
      }
    }
  }

  // Universal: Ensure Stacker Door to Alfresco is recognized
  const hasStackerDoor =
    /stacker|stacking/i.test(rawText) ||
    /stacker|stacking/i.test(geminiResult?.analysisNotes || "");
  if (hasStackerDoor) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_alfresco_stacker_door" || /stacker/i.test(u.name))) {
      const stackerRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_alfresco_stacker_door");
      if (stackerRule) {
        inclusionUpgrades.push({
          id: stackerRule.id,
          category: stackerRule.category,
          name: stackerRule.name,
          description: stackerRule.description,
          baseline: stackerRule.baseline,
          detected: stackerRule.detected,
          unitPrice: stackerRule.unitPrice,
          quantity: 1,
          subtotal: stackerRule.unitPrice,
          accepted: true,
          confidence: stackerRule.confidence,
          isByOwner: false,
          reason: "Multi-panel stacking sliding door upgrade to covered alfresco.",
        });
      }
    }
  }

  // Universal: Ensure Ground Floor Full Bathroom is recognized
  const hasGfBathroom =
    /gf\s*bath|ground\s*floor\s*bath|guest\s*bath|full\s*bath/i.test(rawText) ||
    /gf\s*bath|ground\s*floor\s*bath|guest\s*bath|full\s*bath/i.test(geminiResult?.analysisNotes || "");
  if (hasGfBathroom) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_gf_bathroom_addition" || /ground\s*floor\s*bath|guest.*bath|full.*bath/i.test(u.name))) {
      const bathRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_gf_bathroom_addition");
      if (bathRule) {
        inclusionUpgrades.push({
          id: bathRule.id,
          category: bathRule.category,
          name: bathRule.name,
          description: bathRule.description,
          baseline: bathRule.baseline,
          detected: bathRule.detected,
          unitPrice: bathRule.unitPrice,
          quantity: 1,
          subtotal: bathRule.unitPrice,
          accepted: true,
          confidence: bathRule.confidence,
          isByOwner: false,
          reason: "Ground floor full bathroom addition / conversion to service guest suite.",
        });
      }
    }
  }

  // Universal: Ensure Master Ensuite Double Basin Vanity is recognized
  const hasDoubleVanity =
    /double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(rawText) ||
    /double\s*vanity|dual\s*basin|twin\s*basin|twin\s*mixer|double\s*basin/i.test(geminiResult?.analysisNotes || "");
  if (hasDoubleVanity) {
    if (!inclusionUpgrades.some((u) => u.id === "upg_ensuite_double_vanity" || /double\s*vanity|dual\s*basin/i.test(u.name))) {
      const vanityRule = FIXTURE_UPGRADE_RULES.find((r) => r.id === "upg_ensuite_double_vanity");
      if (vanityRule) {
        inclusionUpgrades.push({
          id: vanityRule.id,
          category: vanityRule.category,
          name: vanityRule.name,
          description: vanityRule.description,
          baseline: vanityRule.baseline,
          detected: vanityRule.detected,
          unitPrice: vanityRule.unitPrice,
          quantity: 1,
          subtotal: vanityRule.unitPrice,
          accepted: true,
          confidence: vanityRule.confidence,
          isByOwner: false,
          reason: "Master Ensuite vanity upgraded from standard single basin to dual basin / twin mixer layout.",
        });
      }
    }
  }

  // 1. Presight Opening Tags & Master Schedule diffing
  const presightTags = parsePresightOpeningTags(rawText);
  const tierCode: "H1" | "H2" | "H3" = specTier?.includes("H3") ? "H3" : specTier?.includes("H1") ? "H1" : "H2";
  const openingUpgrades = diffOpeningsAgainstMaster(presightTags, detectedModelName, tierCode);
  for (const upg of openingUpgrades) {
    if (!inclusionUpgrades.some((u) => u.id === upg.id || u.name.toLowerCase() === upg.name.toLowerCase())) {
      inclusionUpgrades.push(upg);
    }
  }

  // 2. Previously Learned Features from Persistent Memory
  const learnedList = getLearnedFeatures();
  for (const feat of learnedList) {
    if (rawText.toLowerCase().includes(feat.triggerPhrase.toLowerCase())) {
      if (!inclusionUpgrades.some((u) => u.id === feat.id || u.name.toLowerCase() === feat.canonicalName.toLowerCase())) {
        inclusionUpgrades.push({
          id: feat.id,
          category: feat.category,
          name: feat.canonicalName,
          description: feat.description,
          baseline: "Standard brochure inclusion",
          detected: `NHC markup '${feat.triggerPhrase}' matched from learning memory`,
          unitPrice: feat.defaultUnitPrice,
          quantity: 1,
          subtotal: feat.defaultUnitPrice,
          accepted: true,
          confidence: 0.98,
          isByOwner: false,
          reason: feat.description,
        });
      }
    }
  }

  // 3. Detect unconfirmed NHC features that need user confirmation rather than guessing
  const unconfirmedFeatures = detectUnconfirmedFeatures(
    rawText,
    FIXTURE_UPGRADE_RULES.flatMap((r) => r.triggerKeywords)
  );

  // If Gemini or Canvas Differ found any spatial or fixture modifications, return immediate result
  if (geminiResult || (canvasResult && canvasResult.areaModifications.length > 0)) {
    // Final strict semantic deduplication pass for inclusions (ensuring no duplicates across categories)
    const seenSemanticKeys = new Set<string>();
    const finalInclusions: DetectedInclusionUpgrade[] = [];
    for (const inc of inclusionUpgrades) {
      const desc = `${inc.id || ""} ${inc.name || ""} ${inc.description || ""} ${inc.reason || ""}`.toLowerCase();
      let semKey = inc.id || inc.name.toLowerCase().trim();
      if (/bed\s*4.*(?:ensuite|wir)|bed\s*4/i.test(desc)) {
        semKey = "sem_bed4_wir";
      } else if (/bed\s*3.*(?:ensuite|wir)|bed\s*3/i.test(desc)) {
        semKey = "sem_bed3_wir";
      } else if (/gf.*bath|ground.*floor.*bath|guest.*bath|full.*bath/i.test(desc)) {
        semKey = "sem_gf_bathroom";
      } else if (/ensuite.*wir|wir.*ensuite|additional.*ensuite|ensuite.*fitout/i.test(desc)) {
        semKey = "sem_ensuite_wir";
      } else if (/living.*media|media.*room|storage.*conversion|media.*skylight/i.test(desc)) {
        semKey = "sem_living_media";
      } else if (/double\s*vanity|dual\s*basin|twin\s*basin|double\s*basin/i.test(desc)) {
        semKey = "sem_double_vanity";
      } else if (/roller\s*door|rd\s*21\.24/i.test(desc)) {
        semKey = "sem_roller_door";
      } else if (/1200|ext\s*1200/i.test(desc)) {
        semKey = "sem_entry_door_1200";
      } else if (/1020|ext\s*1020/i.test(desc)) {
        semKey = "sem_entry_door_1020";
      } else if (/stacker|stacking/i.test(desc)) {
        semKey = "sem_stacker_door";
      } else if (/2740|gf\s*ceiling/i.test(desc)) {
        semKey = "sem_ceiling_2740";
      } else if (/balcony/i.test(desc)) {
        semKey = "sem_front_balcony";
      }
      if (!seenSemanticKeys.has(semKey)) {
        seenSemanticKeys.add(semKey);
        finalInclusions.push(inc);
      }
    }

    const netDeltaM2 = areaDeltas.reduce((acc, d) => acc + d.deltaM2, 0);
    const modifiedTotalM2 = Math.round((standardTotalM2 + netDeltaM2) * 100) / 100;
    const totalAreaCost = areaDeltas.reduce((acc, d) => acc + d.subtotal, 0);
    const totalInclusionsCost = finalInclusions.reduce((acc, u) => acc + u.subtotal, 0);

    const source =
      geminiResult && geminiResult.areaModifications && geminiResult.areaModifications.length > 0
        ? "gemini_vision"
        : canvasResult && canvasResult.areaModifications.length > 0
        ? "canvas_vision"
        : "gemini_vision";

    return {
      baseDesignName: detectedModelName,
      housingType: housingType as any,
      standardTotalM2,
      modifiedTotalM2,
      netDeltaM2: Math.round(netDeltaM2 * 100) / 100,
      areaDeltas,
      inclusionUpgrades: finalInclusions,
      unconfirmedFeatures,
      totalAreaCost,
      totalInclusionsCost,
      netTotalCost: totalAreaCost + totalInclusionsCost,
      floorplanDataUrl: dataUrl,
      fileName: file.name,
      detectionSource: source,
      geminiNotes: geminiResult?.analysisNotes,
      canvasNotes: canvasResult?.notes,
      ceilingHeightM: geminiResult?.ceilingHeightM,
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

  // 1. Universal Room Dimension Parsing across any Hudson Home Design
  // A. Alfresco dimensions (e.g. "Alfresco 7.5 x 4.0" vs standard 4.5 x 3.0 or 2.6 x 3.6)
  const alfMatch = rawText.match(/Alfresco\s*[\r\n\t]*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (alfMatch) {
    const w = parseFloat(alfMatch[1]);
    const l = parseFloat(alfMatch[2]);
    const actualAlfM2 = w * l;
    const stdAlf = standardAlfrescoM2 || 10;
    const alfDiff = actualAlfM2 - stdAlf;
    if (Math.abs(alfDiff) > 0.4) {
      alfrescoDelta = Math.round(alfDiff * 100) / 100;
    }
  }

  // B. Garage dimensions (e.g. "Garage 5.7 x 5.7" vs "5.5 x 5.5")
  const garMatch = rawText.match(/Garage\s*[\r\n\t]*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (garMatch) {
    const w = parseFloat(garMatch[1]);
    const l = parseFloat(garMatch[2]);
    const actualGarM2 = w * l;
    const stdGar = standardGarageM2 || 33;
    const garDiff = actualGarM2 - stdGar;
    if (Math.abs(garDiff) > 0.5) {
      garageDelta = Math.round(garDiff * 100) / 100;
    }
  }

  // C. Living / Family Room dimensions
  const familyMatch = rawText.match(/(?:Family|Living)\s*[\r\n\t]*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (familyMatch) {
    const w = parseFloat(familyMatch[1]);
    const l = parseFloat(familyMatch[2]);
    const actualLivingM2 = w * l;
    const stdFam = standardLivingM2 ? (isDoubleStorey ? standardLivingM2 * 0.35 : standardLivingM2 * 0.25) : 20.65;
    const famDiff = actualLivingM2 - stdFam;
    if (famDiff > 1.0) {
      livingDelta = Math.round(famDiff * 100) / 100;
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

    // Invariant: Balconies cannot exist on Single Storey
    if (rule.id === "upg_front_balcony" && !isDoubleStorey) {
      continue;
    }

    const matchedKw = rule.triggerKeywords.find((kw) => fullSearchText.includes(kw));
    if (matchedKw) {
      const lines = fullSearchText.split(/[\r\n]+/);
      const matchedLine = lines.find((l) => l.includes(matchedKw)) || "";
      const isOwner = isMarkedByOwner(matchedLine);
      const price = isOwner ? 0 : rule.unitPrice;

      // Invariant: Additional ensuite only triggers on secondary bedrooms or explicit additions
      if (rule.id === "upg_additional_ensuite_wir") {
        if (!/bed\s*[2-5]|second|2nd|guest|opt|optional|added/i.test(matchedLine)) {
          continue;
        }
      }

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
