export interface EstatePreset {
  id: string;
  name: string;
  suburb: string;
  council: string;
  developer?: string;
  frontSetback: number; // Minimum Front Building line (m)
  garageSetback: number; // Minimum Garage door setback (m)
  sideSetback: number; // Minimum Standard side setback for single storey (m)
  doubleStoreySideSetback?: number; // Minimum side setback for double storey (m)
  btbSideSetback: number; // Minimum Built-to-Boundary garage setback (m)
  rearSetback: number; // Minimum Rear boundary setback (m)
  doubleStoreyRearSetback?: number; // Minimum Rear setback for double storey (m)
  maxSiteCoverage: number; // Max allowable site coverage (%)
  keywords: string[];
}

export const ESTATE_PRESETS: EstatePreset[] = [
  {
    id: "flagstone",
    name: "Flagstone Estate (Peet)",
    suburb: "Flagstone / Jimboomba",
    council: "Logan City Council",
    developer: "Peet",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 1.0,
    doubleStoreyRearSetback: 2.0,
    maxSiteCoverage: 60,
    keywords: ["flagstone", "jimboomba", "peet", "undullah", "flagstone central"],
  },
  {
    id: "yarrabilba",
    name: "Yarrabilba (Lendlease)",
    suburb: "Yarrabilba",
    council: "Logan City Council",
    developer: "Lendlease",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 0.9,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 1.5,
    doubleStoreyRearSetback: 2.0,
    maxSiteCoverage: 60,
    keywords: ["yarrabilba", "lendlease", "logan reserve", "chambers flat"],
  },
  {
    id: "covella",
    name: "Covella (AVID)",
    suburb: "Greenbank",
    council: "Logan City Council",
    developer: "AVID Property Group",
    frontSetback: 4.0,
    garageSetback: 5.4,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.5,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 55,
    keywords: ["covella", "greenbank", "avid"],
  },
  {
    id: "everleigh",
    name: "Everleigh (Mirvac)",
    suburb: "Greenbank",
    council: "Logan City Council",
    developer: "Mirvac",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.0,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 60,
    keywords: ["everleigh", "mirvac", "pub lane"],
  },
  {
    id: "shoreline",
    name: "Shoreline (Lendlease)",
    suburb: "Redland Bay",
    council: "Redland City Council",
    developer: "Lendlease",
    frontSetback: 4.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.5,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 55,
    keywords: ["shoreline", "redland bay", "redland", "victoria point"],
  },
  {
    id: "springfield",
    name: "Springfield Rise / Spring Mountain",
    suburb: "Springfield / Spring Mountain",
    council: "Ipswich City Council",
    developer: "Lendlease",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 1.5,
    doubleStoreyRearSetback: 2.0,
    maxSiteCoverage: 60,
    keywords: ["springfield", "spring mountain", "springfield rise", "springfield lakes", "orion"],
  },
  {
    id: "providence",
    name: "Providence (Stockland)",
    suburb: "South Ripley",
    council: "Ipswich City Council",
    developer: "Stockland",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.0,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 60,
    keywords: ["providence", "south ripley", "ripley", "stockland"],
  },
  {
    id: "north-harbour",
    name: "North Harbour",
    suburb: "Burpengary East",
    council: "City of Moreton Bay",
    frontSetback: 4.0,
    garageSetback: 5.4,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.5,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 55,
    keywords: ["north harbour", "burpengary", "burpengary east", "moreton bay", "caboolture"],
  },
  {
    id: "harmony",
    name: "Harmony (AVID)",
    suburb: "Palmview",
    council: "Sunshine Coast Council",
    developer: "AVID",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.0,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 60,
    keywords: ["harmony", "palmview", "sunshine coast", "sippy downs"],
  },
  {
    id: "aura",
    name: "Aura (Stockland)",
    suburb: "Caloundra South / Baringa",
    council: "Sunshine Coast Council",
    developer: "Stockland",
    frontSetback: 3.0,
    garageSetback: 5.0,
    sideSetback: 0.9,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 1.5,
    doubleStoreyRearSetback: 2.0,
    maxSiteCoverage: 65,
    keywords: ["aura", "baringa", "nyam", "caloundra south", "caloundra"],
  },
  {
    id: "pebble-creek",
    name: "Pebble Creek",
    suburb: "South Maclean",
    council: "Logan City Council",
    frontSetback: 4.0,
    garageSetback: 5.0,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 2.0,
    doubleStoreyRearSetback: 2.5,
    maxSiteCoverage: 60,
    keywords: ["pebble creek", "south maclean", "maclean", "jimboomba"],
  },
  {
    id: "plainland",
    name: "Plainland Crossing",
    suburb: "Plainland",
    council: "Lockyer Valley Regional Council",
    frontSetback: 6.0,
    garageSetback: 6.0,
    sideSetback: 1.5,
    doubleStoreySideSetback: 2.0,
    btbSideSetback: 1.5,
    rearSetback: 3.0,
    doubleStoreyRearSetback: 3.0,
    maxSiteCoverage: 50,
    keywords: ["plainland", "lockyer", "gatton", "laidley"],
  },
  {
    id: "standard",
    name: "Standard QLD Default",
    suburb: "General Queensland",
    council: "Queensland Standard Guidelines",
    frontSetback: 3.0, // 3m to front room
    garageSetback: 5.0, // 5m to garage
    sideSetback: 1.0, // 1m side setback
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2, // 200mm BTB
    rearSetback: 1.0, // 1m rear setback
    doubleStoreyRearSetback: 2.0,
    maxSiteCoverage: 60,
    keywords: ["standard", "default", "rescode", "brisbane", "qld", "general"],
  },
  {
    id: "custom",
    name: "Custom Setbacks",
    suburb: "Custom",
    council: "Custom Plan of Development (POD)",
    frontSetback: 4.5,
    garageSetback: 5.5,
    sideSetback: 1.0,
    doubleStoreySideSetback: 1.5,
    btbSideSetback: 0.2,
    rearSetback: 3.0,
    doubleStoreyRearSetback: 3.0,
    maxSiteCoverage: 50,
    keywords: ["custom"],
  },
];

export function matchEstatePreset(estateName: string, suburbName: string): EstatePreset {
  const combined = `${estateName || ""} ${suburbName || ""}`.toLowerCase().trim();
  if (!combined) return ESTATE_PRESETS.find((p) => p.id === "standard")!;

  for (const preset of ESTATE_PRESETS) {
    if (preset.id === "standard" || preset.id === "custom") continue;
    if (preset.keywords.some((kw) => combined.includes(kw))) {
      return preset;
    }
  }

  return ESTATE_PRESETS.find((p) => p.id === "standard")!;
}

/**
 * Exact Blueprint Dimensions Registry for Hudson Homes CAD Floorplans.
 */
const HUDSON_EXACT_DIMENSIONS: Record<string, { width: number; length: number; stepOut?: number }> = {
  "Amber 21": { width: 10.55, length: 20.15, stepOut: 0.0 },
  "Amber 23": { width: 11.20, length: 21.00, stepOut: 0.0 },
  "Amber 26": { width: 11.90, length: 22.40, stepOut: 0.0 },
  "Amber 30": { width: 12.60, length: 24.50, stepOut: 0.0 },
  "Amaranth 23": { width: 10.80, length: 21.20, stepOut: 0.0 },
  "Amaranth 23A": { width: 10.80, length: 21.20, stepOut: 0.0 },
  "Amaranth 23B": { width: 10.80, length: 21.20, stepOut: 0.0 },
  "Charcoal 24": { width: 11.10, length: 22.00, stepOut: 0.0 },
  "Jasper 24": { width: 10.89, length: 21.50, stepOut: 0.60 },
  "Jasper 26": { width: 11.09, length: 22.50, stepOut: 0.60 },
  "Mulberry 35": { width: 27.50, length: 15.20, stepOut: 0.0 },
};

export interface DesignGeometry {
  houseWidth: number; // meters (wall to wall width)
  houseLength: number; // meters (overall length)
  garageStepOut: number; // meters: how far garage steps out from main side wall (0.0 for straight wall, 0.60 for BTB)
  garageStepBack: number; // meters: distance between front porch/building line and garage door line (e.g. 1.20m)
  alfrescoRecess: number; // meters: distance alfresco is recessed in front of master rear wall (e.g. 3.00m)
  garageSide: "left" | "right";
  hasStepOut: boolean;
}

export function getDesignGeometry(
  designName: string,
  floorplanSizeM2: number,
  minLotFrontage = 12.5,
  housingType = "single-storey"
): DesignGeometry {
  const isAcreage = /mulberry|ranch|acreage/i.test(designName) || housingType === "acreage";
  const isDouble = housingType === "double-storey" || housingType === "double" || /double/i.test(designName);

  // Check exact blueprint dimensions registry first
  for (const [key, val] of Object.entries(HUDSON_EXACT_DIMENSIONS)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(designName) || designName.toLowerCase() === key.toLowerCase()) {
      const isLeft = /left|lh\b/i.test(designName) || designName.charCodeAt(0) % 2 === 0;
      return {
        houseWidth: val.width,
        houseLength: val.length,
        garageStepOut: val.stepOut || 0.0,
        garageStepBack: 1.20,
        alfrescoRecess: 3.00,
        garageSide: isLeft ? "left" : "right",
        hasStepOut: (val.stepOut || 0.0) > 0,
      };
    }
  }

  // Fallback parametric calculation if design is not in explicit registry
  let width = Math.max(7.5, minLotFrontage > 0 ? minLotFrontage - 1.4 : 10.55);
  const groundArea = isDouble ? floorplanSizeM2 * 0.58 : floorplanSizeM2;
  const eff = 0.86;
  let length = Math.max(12.0, groundArea / (width * eff));

  width = Math.round(width * 100) / 100;
  length = Math.round(length * 100) / 100;

  const isLeft = /left|lh\b/i.test(designName) || designName.charCodeAt(0) % 2 === 0;
  const garageSide: "left" | "right" = isLeft ? "left" : "right";

  let garageStepOut = 0.0;
  if (/jasper|azure|btb|step/i.test(designName)) {
    garageStepOut = 0.6;
  }

  const garageStepBack = 1.2;
  const alfrescoRecess = 3.0;

  return {
    houseWidth: width,
    houseLength: length,
    garageStepOut,
    garageStepBack,
    alfrescoRecess,
    garageSide,
    hasStepOut: garageStepOut > 0,
  };
}

export interface SitingCalculations {
  landFrontage: number;
  landDepth: number;
  landArea: number;
  houseWidth: number;
  houseLength: number;
  houseArea: number;
  garageStepOut: number;
  garageStepBack: number;

  frontRoomSetback: number;
  garageFrontSetback: number;
  garageSideSetback: number;
  behindGarageWallSetback: number;
  lhsWallSetback: number;
  rhsWallSetback: number;
  familyRearSetback: number;
  rearMasterSetback: number;

  // Preset Minimum Requirements:
  minFrontSetback: number;
  minGarageSetback: number;
  minSideSetback: number;
  minBtbSetback: number;
  minRearSetback: number;
  maxSiteCoverage: number;

  frontSetback: number;
  garageSetback: number;
  leftSetback: number;
  rightSetback: number;
  rearSetback: number;

  siteCoveragePercent: number;
  privateOpenSpaceM2: number;
  garageSide: "left" | "right";
  isBtb: boolean;
  hasStepOut: boolean;
  isDoubleStorey: boolean;
  canFit: boolean;
  estateName: string;
}

export function computeSitingPlan({
  landSizeM2,
  landFrontageM,
  houseAreaM2,
  designName = "",
  estateName = "",
  suburbName = "",
  housingType = "single-storey",
  estateId,
  houseWidthM,
  houseLengthM,
  customFrontSetback,
  customGarageSetback,
  customSideSetback,
  customLeftSetback,
  customRightSetback,
  customBtb,
  customGarageSide,
}: {
  landSizeM2: number;
  landFrontageM: number;
  houseAreaM2: number;
  designName?: string;
  estateName?: string;
  suburbName?: string;
  housingType?: string;
  estateId?: string;
  houseWidthM?: number;
  houseLengthM?: number;
  customFrontSetback?: number;
  customGarageSetback?: number;
  customSideSetback?: number;
  customLeftSetback?: number;
  customRightSetback?: number;
  customBtb?: boolean;
  customGarageSide?: "left" | "right";
}): SitingCalculations {
  const isDoubleStorey = housingType === "double-storey" || housingType === "double" || /double/i.test(housingType);

  const matchedPreset = estateId && estateId !== "standard" && estateId !== "custom"
    ? (ESTATE_PRESETS.find((p) => p.id === estateId) || matchEstatePreset(estateName, suburbName))
    : matchEstatePreset(estateName, suburbName);

  const preset = estateId === "custom"
    ? ESTATE_PRESETS.find((p) => p.id === "custom")!
    : matchedPreset;

  const frontage = Math.max(6.0, landFrontageM || 14.0);
  const landArea = Math.max(150, landSizeM2 || 450);
  const depth = Math.round((landArea / frontage) * 100) / 100;

  const geometry = getDesignGeometry(designName, houseAreaM2, frontage, housingType);
  const hWidth = houseWidthM && houseWidthM > 0 ? houseWidthM : geometry.houseWidth;
  const hLength = houseLengthM && houseLengthM > 0 ? houseLengthM : geometry.houseLength;
  const hArea = houseAreaM2 || Math.round(hWidth * hLength * (isDoubleStorey ? 0.58 : 0.86) * 100) / 100;

  const garageSide = customGarageSide || geometry.garageSide;
  const isBtb = customBtb !== undefined ? customBtb : false;
  const hasStepOut = geometry.hasStepOut;
  const stepOut = hasStepOut ? geometry.garageStepOut : 0;
  const stepBack = geometry.garageStepBack;

  // 1. FRONT SETBACK RULES:
  // User input overrides estate preset directly
  // Guarantee garage setback is ALWAYS at least 5.00m by default
  const minGarageReq = Math.max(preset.garageSetback, 5.00);
  let garageFrontSetback = minGarageReq;
  let frontRoomSetback = Math.max(preset.frontSetback, Math.round((garageFrontSetback - stepBack) * 100) / 100);

  if (customGarageSetback !== undefined && customGarageSetback >= 0) {
    garageFrontSetback = Math.max(minGarageReq, customGarageSetback);
    frontRoomSetback = Math.max(preset.frontSetback, Math.round((garageFrontSetback - stepBack) * 100) / 100);
  } else if (customFrontSetback !== undefined && customFrontSetback >= 0) {
    frontRoomSetback = customFrontSetback;
    garageFrontSetback = Math.max(minGarageReq, Math.round((frontRoomSetback + stepBack) * 100) / 100);
  }

  // 2. SIDE SETBACK & BTB RULES (WHEN BTB IS SELECTED, GARAGE WALL IS ALWAYS 200mm / 0.20m):
  const baseSideSetback = isDoubleStorey && preset.doubleStoreySideSetback
    ? preset.doubleStoreySideSetback
    : preset.sideSetback;

  const reqSide = customSideSetback !== undefined && customSideSetback >= 0 ? customSideSetback : baseSideSetback;

  let lhsWallSetback = reqSide;
  let rhsWallSetback = reqSide;
  let garageSideSetback = reqSide;
  let behindGarageWallSetback = reqSide;

  if (isBtb) {
    // Garage side wall is ALWAYS positioned exactly 200mm (0.20m) from its side boundary!
    garageSideSetback = 0.20;
    behindGarageWallSetback = Math.round((0.20 + stepOut) * 100) / 100;
    
    if (garageSide === "right") {
      rhsWallSetback = 0.20; // right garage wall is 0.20m from right boundary
      lhsWallSetback = Math.max(0.20, Math.round((frontage - hWidth - 0.20) * 100) / 100);
    } else {
      lhsWallSetback = 0.20; // left garage wall is 0.20m from left boundary
      rhsWallSetback = Math.max(0.20, Math.round((frontage - hWidth - 0.20) * 100) / 100);
    }
  } else {
    // Non-BTB standard placement
    if (customLeftSetback !== undefined && customLeftSetback >= 0) {
      lhsWallSetback = customLeftSetback;
      rhsWallSetback = Math.round((frontage - hWidth - lhsWallSetback) * 100) / 100;
    } else if (customRightSetback !== undefined && customRightSetback >= 0) {
      rhsWallSetback = customRightSetback;
      lhsWallSetback = Math.round((frontage - hWidth - rhsWallSetback) * 100) / 100;
    } else if (customSideSetback !== undefined && customSideSetback >= 0) {
      lhsWallSetback = customSideSetback;
      rhsWallSetback = Math.round((frontage - hWidth - customSideSetback) * 100) / 100;
    } else {
      // Center cleanly on lot
      const sideBuffer = Math.max(0, frontage - hWidth);
      lhsWallSetback = Math.round((sideBuffer / 2) * 100) / 100;
      rhsWallSetback = Math.round((sideBuffer - lhsWallSetback) * 100) / 100;
    }
    garageSideSetback = rhsWallSetback;
    behindGarageWallSetback = rhsWallSetback;
  }

  // 3. REAR SETBACKS:
  const rearMasterSetback = Math.max(0, Math.round((depth - hLength - frontRoomSetback) * 100) / 100);
  const familyRearSetback = Math.round((rearMasterSetback + geometry.alfrescoRecess) * 100) / 100;

  // 4. METRICS:
  const siteCoveragePercent = Math.round((hArea / landArea) * 1000) / 10;
  const privateOpenSpaceM2 = Math.round((rearMasterSetback * frontage) * 10) / 10;
  const canFit = (frontage >= hWidth + 0.8) && (depth >= hLength + frontRoomSetback + 0.8);

  return {
    landFrontage: frontage,
    landDepth: depth,
    landArea,
    houseWidth: hWidth,
    houseLength: hLength,
    houseArea: hArea,
    garageStepOut: stepOut,
    garageStepBack: stepBack,

    frontRoomSetback,
    garageFrontSetback,
    garageSideSetback,
    behindGarageWallSetback,
    lhsWallSetback,
    rhsWallSetback,
    familyRearSetback,
    rearMasterSetback,

    frontSetback: frontRoomSetback,
    garageSetback: garageFrontSetback,
    leftSetback: lhsWallSetback,
    rightSetback: rhsWallSetback,
    rearSetback: rearMasterSetback,

    siteCoveragePercent,
    privateOpenSpaceM2,
    garageSide,
    isBtb,
    hasStepOut,
    isDoubleStorey,
    canFit,
    minFrontSetback: preset.frontSetback,
    minGarageSetback: preset.garageSetback,
    minSideSetback: isDoubleStorey && preset.doubleStoreySideSetback ? preset.doubleStoreySideSetback : preset.sideSetback,
    minBtbSetback: preset.btbSideSetback,
    minRearSetback: isDoubleStorey && preset.doubleStoreyRearSetback ? preset.doubleStoreyRearSetback : preset.rearSetback,
    maxSiteCoverage: preset.maxSiteCoverage,
    estateName: preset.name,
  };
}
