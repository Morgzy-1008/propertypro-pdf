/**
 * Foresight Home Planning - Concept Floorplan Editor Bridge
 * Reference: https://concept-floor-plan-editor.web.app/
 * 
 * Deep architectural intelligence for recognizing and quoting plans edited
 * with Foresight Concept Floorplan Editor, including:
 * 1. Recognition of editor element tags, stamps, and dimension notations.
 * 2. Strict 80% Trade Credit Replacement logic for doors and windows.
 * 3. Standard brochure opening preservation ($0 if unannotated).
 * 4. Wet area extensions with explicit $150/m² base cost + tile/waterproofing finishes.
 * 5. Full internal sweep identifying rooms, furniture stamps, and $0 non-structural wall adjustments.
 */

import type {
  OpeningReplacementItem,
  InternalRoomChange,
  CatalogueCategory,
} from "./quoteTypes";

/**
 * Standard baseline brochure costs for Hudson Homes openings before credit.
 */
export const BASELINE_OPENING_COSTS = {
  standard_hinged_door_820: 350,
  standard_robe_door_720_820: 300,
  standard_front_entry_door_820: 450,
  standard_garage_ext_door_820: 450,
  standard_sliding_window_1218: 450,
  standard_sliding_window_1818: 580,
  standard_obscure_window_0906: 350,
  standard_sliding_door_2121: 1450,
  standard_sliding_door_2124: 1450,
  standard_sliding_door_2127: 1650,
};

/**
 * New upgrade items placed by Foresight Floorplan Editor with their full retail costs.
 */
export interface EditorOpeningSpecification {
  code: string;
  type: "door" | "window";
  name: string;
  fullRetailCost: number;
  defaultReplaces: keyof typeof BASELINE_OPENING_COSTS;
  description: string;
  category: CatalogueCategory;
}

export const FORESIGHT_EDITOR_OPENINGS: Record<string, EditorOpeningSpecification> = {
  // Sliding Glass Doors
  "21-21SD": {
    code: "21-21SD",
    type: "door",
    name: "21-21SD Aluminium Sliding Glass Door (2100h × 2100w)",
    fullRetailCost: 1450,
    defaultReplaces: "standard_hinged_door_820",
    description: "2100mm × 2100mm 2-panel powder-coated aluminium sliding glass door (21-21SD) with keyed latch.",
    category: "doors_windows",
  },
  "21-24SD": {
    code: "21-24SD",
    type: "door",
    name: "21-24SD Aluminium Sliding Glass Door (2100h × 2400w)",
    fullRetailCost: 1650,
    defaultReplaces: "standard_hinged_door_820",
    description: "2100mm × 2400mm 2-panel powder-coated aluminium sliding glass door (21-24SD) providing garden/alfresco access.",
    category: "doors_windows",
  },
  "21-27SD": {
    code: "21-27SD",
    type: "door",
    name: "21-27SD Wide Aluminium Sliding Glass Door (2100h × 2700w)",
    fullRetailCost: 1850,
    defaultReplaces: "standard_sliding_door_2124",
    description: "Extended 2100mm × 2700mm 2-panel sliding glass door (21-27SD) for panoramic living integration.",
    category: "doors_windows",
  },
  "STACKER 21-36": {
    code: "STACKER 21-36",
    type: "door",
    name: "3-Panel Aluminium Stacker Sliding Door (2100h × 3600w)",
    fullRetailCost: 2850,
    defaultReplaces: "standard_sliding_door_2124",
    description: "Premium 3-panel architectural aluminium stacking sliding door (2100mm × 3600mm) opening up to outdoor entertaining.",
    category: "doors_windows",
  },
  "STACKER 21-48": {
    code: "STACKER 21-48",
    type: "door",
    name: "4-Panel Aluminium Stacker Sliding Door (2100h × 4800w)",
    fullRetailCost: 3850,
    defaultReplaces: "standard_sliding_door_2124",
    description: "Grand 4-panel aluminium stacker door (2100mm × 4800mm) with dual opening panels.",
    category: "doors_windows",
  },

  // Cavity Sliding Pocket Doors (CSD)
  "CSD 820": {
    code: "CSD 820",
    type: "door",
    name: "820mm Flush Cavity Sliding Pocket Door (CSD)",
    fullRetailCost: 680,
    defaultReplaces: "standard_hinged_door_820",
    description: "Flush cavity sliding pocket door recessed into stud wall framing (CSD 820) to maximize room circulation space.",
    category: "doors_windows",
  },
  "CSD 720": {
    code: "CSD 720",
    type: "door",
    name: "720mm Flush Cavity Sliding Pocket Door (CSD)",
    fullRetailCost: 640,
    defaultReplaces: "standard_robe_door_720_820",
    description: "720mm cavity sliding door recessed into stud frame (CSD 720) for robe or ensuite privacy.",
    category: "doors_windows",
  },
  "CSD 920": {
    code: "CSD 920",
    type: "door",
    name: "920mm Wide Cavity Sliding Pocket Door (CSD)",
    fullRetailCost: 720,
    defaultReplaces: "standard_hinged_door_820",
    description: "920mm accessible cavity sliding pocket door (CSD 920) with heavy-duty overhead track.",
    category: "doors_windows",
  },

  // Architectural Front Entry Doors
  "EXT 1020": {
    code: "EXT 1020",
    type: "door",
    name: "1020mm Wide Architectural Front Entry Door Upgrade",
    fullRetailCost: 1210,
    defaultReplaces: "standard_front_entry_door_820",
    description: "1020mm wide contemporary solid architectural entrance door ('EXT 1020') with pull handle and weather seal.",
    category: "doors_windows",
  },
  "EXT 1200": {
    code: "EXT 1200",
    type: "door",
    name: "1200mm Grand Feature Front Entry Door Upgrade",
    fullRetailCost: 1610,
    defaultReplaces: "standard_front_entry_door_820",
    description: "Grand 1200mm wide pivot/hinged entrance door ('EXT 1200') with translucent glass inlays and architectural lockset.",
    category: "doors_windows",
  },

  // Garage Personal Access & Roller Doors
  "EXT 820": {
    code: "EXT 820",
    type: "door",
    name: "Garage Weatherproof External Personal Access Door (EXT 820)",
    fullRetailCost: 950,
    defaultReplaces: "standard_garage_ext_door_820",
    description: "Solid core external weatherproof personal access door (2040mm × 820mm) fitted to garage perimeter with deadbolt.",
    category: "doors_windows",
  },
  "RD 21.24": {
    code: "RD 21.24",
    type: "door",
    name: "Additional 2100h × 2400w Single Roller Door (RD 21.24)",
    fullRetailCost: 1950,
    defaultReplaces: "standard_garage_ext_door_820",
    description: "Dedicated 2100mm × 2400mm single roller door (RD 21.24) added for 3rd garage car bay or drive-through rear access.",
    category: "doors_windows",
  },

  // Windows & Splashbacks
  "PW 0630": {
    code: "PW 0630",
    type: "window",
    name: "Kitchen Panoramic Picture Splashback Window (PW 0630)",
    fullRetailCost: 720,
    defaultReplaces: "standard_sliding_window_1218",
    description: "Panoramic fixed picture window splashback (600mm × 3000mm) located behind kitchen cooktop.",
    category: "doors_windows",
  },
  "PW 0624": {
    code: "PW 0624",
    type: "window",
    name: "Kitchen Picture Splashback Window (PW 0624)",
    fullRetailCost: 680,
    defaultReplaces: "standard_sliding_window_1218",
    description: "Fixed picture window splashback (600mm × 2400mm) behind kitchen cooktop.",
    category: "doors_windows",
  },
  "AWN 1218": {
    code: "AWN 1218",
    type: "window",
    name: "Awning Window Upgrade (1200h × 1810w)",
    fullRetailCost: 680,
    defaultReplaces: "standard_sliding_window_1218",
    description: "Upgrade from standard sliding window to chain-winder awning window with weather resistance.",
    category: "doors_windows",
  },
  "AWN 1818": {
    code: "AWN 1818",
    type: "window",
    name: "Grand Awning Window Upgrade (1800h × 1810w)",
    fullRetailCost: 850,
    defaultReplaces: "standard_sliding_window_1818",
    description: "1800mm × 1810mm architectural awning window with dual winders.",
    category: "doors_windows",
  },
  "SW 1218": {
    code: "SW 1218",
    type: "window",
    name: "Standard Residential Sliding Window (1200h × 1810w)",
    fullRetailCost: 450,
    defaultReplaces: "standard_sliding_window_1218",
    description: "Standard brochure residential aluminium sliding window.",
    category: "doors_windows",
  },
};

/**
 * Calculates replacement cost with 80% trade credit for the replaced item.
 * Formula:
 *   credit = Math.round(baselineCost * 0.80)
 *   net = newItemCost - credit
 */
export function calculateOpeningReplacement(
  code: string,
  locationHint?: string,
  customReplaces?: keyof typeof BASELINE_OPENING_COSTS
): OpeningReplacementItem {
  // Normalize code
  const normCode = code.toUpperCase().replace(/\s+/g, " ").trim();
  let spec: EditorOpeningSpecification | undefined;

  // Exact match
  if (FORESIGHT_EDITOR_OPENINGS[normCode]) {
    spec = FORESIGHT_EDITOR_OPENINGS[normCode];
  } else {
    // Pattern matches
    if (/21[-.]?21\s*SD|SD\s*21[-.]?21/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["21-21SD"];
    } else if (/21[-.]?24\s*SD|SD\s*21[-.]?24/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["21-24SD"];
    } else if (/21[-.]?27\s*SD|SD\s*21[-.]?27/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["21-27SD"];
    } else if (/STACKER\s*21[-.]?36|21[-.]?36\s*STACKER/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["STACKER 21-36"];
    } else if (/STACKER\s*21[-.]?48|21[-.]?48\s*STACKER/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["STACKER 21-48"];
    } else if (/CSD\s*820|\bCSD\b/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["CSD 820"];
    } else if (/CSD\s*720/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["CSD 720"];
    } else if (/CSD\s*920/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["CSD 920"];
    } else if (/EXT\s*1020/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["EXT 1020"];
    } else if (/EXT\s*1200/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["EXT 1200"];
    } else if (/EXT\s*820|EXT\s*920/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["EXT 820"];
    } else if (/RD\s*21\.?24|ROLLER\s*DOOR/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["RD 21.24"];
    } else if (/PW\s*0?630/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["PW 0630"];
    } else if (/PW\s*0?624/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["PW 0624"];
    } else if (/AWN\s*1218/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["AWN 1218"];
    } else if (/AWN\s*1818/i.test(normCode)) {
      spec = FORESIGHT_EDITOR_OPENINGS["AWN 1818"];
    }
  }

  if (!spec) {
    // Fallback generic door/window replacement
    const isDoor = /sd|door|csd|stacker|ext/i.test(normCode);
    const cost = isDoor ? 1200 : 650;
    const baseKey: keyof typeof BASELINE_OPENING_COSTS = isDoor
      ? "standard_hinged_door_820"
      : "standard_sliding_window_1218";
    const baseline = BASELINE_OPENING_COSTS[baseKey];
    const credit = Math.round(baseline * 0.80);
    const net = cost - credit;

    return {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      openingType: isDoor ? "door" : "window",
      annotationCode: normCode,
      location: locationHint || "Living / Perimeter",
      replacedItemName: isDoor ? "Standard 820 Hinged Door" : "Standard 1218 Window",
      replacedItemBaselineCost: baseline,
      creditPercent: 80,
      creditAmount: -credit,
      newItemName: `${normCode} Opening Specification`,
      newItemCost: cost,
      netCost: net,
      description: `Replace standard ${isDoor ? "820 hinged door" : "1218 window"} with ${normCode}. Builder credit of 80% (-$${credit.toFixed(2)}) applied against full cost of $${cost.toFixed(2)}.`,
      accepted: true,
      confidence: 0.92,
    };
  }

  const replaceKey = customReplaces || spec.defaultReplaces;
  const baselineCost = BASELINE_OPENING_COSTS[replaceKey] || 350;
  const creditAmount = Math.round(baselineCost * 0.80);
  const netCost = spec.fullRetailCost - creditAmount;

  // Pretty name for replaced item
  let replacedPrettyName = "Standard 820 Hinged Door";
  if (replaceKey === "standard_front_entry_door_820") replacedPrettyName = "Standard 820 Front Entrance Door";
  else if (replaceKey === "standard_garage_ext_door_820") replacedPrettyName = "Standard External Garage Door";
  else if (replaceKey === "standard_robe_door_720_820") replacedPrettyName = "Standard Robe/Linen Door";
  else if (replaceKey === "standard_sliding_door_2124") replacedPrettyName = "Standard 21-24SD Sliding Glass Door";
  else if (replaceKey === "standard_sliding_window_1218") replacedPrettyName = "Standard 1218 Sliding Window";
  else if (replaceKey === "standard_sliding_window_1818") replacedPrettyName = "Standard 1818 Sliding Window";

  return {
    id: `rep_${spec.code.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    openingType: spec.type,
    annotationCode: spec.code,
    location: locationHint || (spec.type === "door" ? "Living / External Opening" : "Window Opening"),
    replacedItemName: replacedPrettyName,
    replacedItemBaselineCost: baselineCost,
    creditPercent: 80,
    creditAmount: -creditAmount,
    newItemName: spec.name,
    newItemCost: spec.fullRetailCost,
    netCost,
    description: `Replace ${replacedPrettyName} with ${spec.name}. Credit of 80% (-$${creditAmount.toFixed(2)}) applied against $${spec.fullRetailCost.toFixed(2)} (Net: +$${netCost.toFixed(2)}).`,
    accepted: true,
    confidence: 0.98,
  };
}

/**
 * Evaluates wet area extension pricing per user specification:
 * - Base structural wet area cost: $150.00/m²
 * - Wet-area Class III waterproofing, screeding to fall, floor/wall tiling, and plumbing rough-in: $870.00/m²
 * Total: $1,020.00/m²
 */
export function calculateWetAreaExtension(
  roomName: string,
  deltaM2: number,
  isEnvelopeExtension: boolean = false
): InternalRoomChange {
  const roundedM2 = Math.round(deltaM2 * 100) / 100;
  const baseRate = 150; // Exact $150/sqm base requested by user
  const finishesRate = 870; // Differential for tiling, waterproofing, screed & plumbing
  const totalUnitRate = isEnvelopeExtension ? 1480 + baseRate + finishesRate : baseRate + finishesRate;
  const subtotal = Math.round(roundedM2 * totalUnitRate);

  return {
    id: `wet_ext_${roomName.toLowerCase().replace(/\s+/g, "_")}`,
    roomName,
    roomType: roomName.toLowerCase().includes("ensuite") ? "ensuite" : "bathroom",
    furnitureDetected: ["Shower Recess", "Vanity Basin", "Toilet Suite", "Class III Waterproofing"],
    deltaM2: roundedM2,
    description: `${roomName} expanded by +${roundedM2.toFixed(2)} m². Includes $${baseRate}/m² structural wet-area base + $${finishesRate}/m² waterproofing, screed bed, tiling, and rough-in plumbing (Total $${totalUnitRate}/m²).`,
    isZeroCost: false,
    category: "wet_area",
    baseRatePerM2: baseRate,
    finishesRatePerM2: finishesRate,
    unitRate: totalUnitRate,
    subtotal,
    accepted: true,
  };
}

/**
 * Creates a zero-cost internal layout modification item.
 * As requested: "I want every change to be noted with a brief description even if it doesn't cost any amount more $"
 */
export function createZeroCostInternalChange(
  roomName: string,
  deltaM2: number,
  description: string,
  furnitureDetected: string[] = []
): InternalRoomChange {
  const roundedM2 = Math.round(deltaM2 * 100) / 100;
  return {
    id: `layout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roomName,
    roomType: inferRoomType(roomName),
    furnitureDetected,
    deltaM2: roundedM2,
    description: `${description} [No additional charge — $0.00 Internal Variation]`,
    isZeroCost: true,
    category: "zero_cost_layout",
    baseRatePerM2: 0,
    finishesRatePerM2: 0,
    unitRate: 0,
    subtotal: 0,
    accepted: true,
  };
}

/**
 * Maps room names or detected furniture to canonical room types
 */
function inferRoomType(name: string): InternalRoomChange["roomType"] {
  const n = name.toLowerCase();
  if (n.includes("ensuite")) return "ensuite";
  if (n.includes("bath")) return "bathroom";
  if (n.includes("powder") || n.includes("pdr") || n.includes("wc")) return "powder";
  if (n.includes("bed")) return "bedroom";
  if (n.includes("kitchen")) return "kitchen";
  if (n.includes("living") || n.includes("family") || n.includes("media") || n.includes("theatre")) return "living";
  if (n.includes("dining") || n.includes("meals")) return "dining";
  if (n.includes("laundry")) return "laundry";
  if (n.includes("study") || n.includes("office")) return "study";
  if (n.includes("wir") || n.includes("robe")) return "robe";
  if (n.includes("pantry") || n.includes("wip")) return "pantry";
  if (n.includes("garage")) return "garage";
  if (n.includes("alfresco")) return "alfresco";
  return "other";
}
