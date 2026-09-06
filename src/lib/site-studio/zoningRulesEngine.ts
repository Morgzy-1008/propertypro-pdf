import {
  CadastreParcel,
  SetbackRules,
  SitedHouse,
  ComplianceReport,
  LiveSetbacks,
} from "@/components/site-studio/siteStudioTypes";

export const ESTATE_ZONING_PRESETS: Record<string, SetbackRules> = {
  flagstone: {
    councilName: "Logan City Council",
    zoningCode: "Low Density Residential (Flagstone POD)",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 1.0,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Flagstone Estate (Peet POD)",
  },
  yarrabilba: {
    councilName: "Logan City Council",
    zoningCode: "Mixed Density (Lendlease POD)",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 0.9,
    rightSetback: 0.9,
    rearSetback: 1.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Yarrabilba (Lendlease POD)",
  },
  everleigh: {
    councilName: "Logan City Council",
    zoningCode: "Low Density (Mirvac Everleigh POD)",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.0,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Everleigh Greenbank (Mirvac)",
  },
  covella: {
    councilName: "Logan City Council",
    zoningCode: "Low Density Residential (AVID)",
    lotCategory: "standard-lot",
    frontSetback: 4.0,
    garageSetback: 5.4,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 55,
    minPosM2: 16,
    presetName: "Covella Greenbank (AVID)",
  },
  shoreline: {
    councilName: "Redland City Council",
    zoningCode: "Emerging Community (Shoreline POD)",
    lotCategory: "standard-lot",
    frontSetback: 4.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 55,
    minPosM2: 16,
    presetName: "Shoreline Redland Bay (Lendlease)",
  },
  springfield: {
    councilName: "Ipswich City Council",
    zoningCode: "Springfield Structure Plan",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 1.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Springfield Rise / Spring Mountain",
  },
  providence: {
    councilName: "Ipswich City Council",
    zoningCode: "Ripley Valley PDA POD",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.0,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Providence South Ripley (Stockland)",
  },
  "north-harbour": {
    councilName: "City of Moreton Bay",
    zoningCode: "General Residential (North Harbour POD)",
    lotCategory: "standard-lot",
    frontSetback: 4.0,
    garageSetback: 5.4,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 55,
    minPosM2: 16,
    presetName: "North Harbour Burpengary",
  },
  aura: {
    councilName: "Sunshine Coast Council",
    zoningCode: "Caloundra South Priority Dev Area",
    lotCategory: "small-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 0.9,
    rightSetback: 0.9,
    rearSetback: 1.5,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 65,
    minPosM2: 16,
    presetName: "Aura Baringa (Stockland)",
  },
  harmony: {
    councilName: "Sunshine Coast Council",
    zoningCode: "Palmview Structure Plan",
    lotCategory: "standard-lot",
    frontSetback: 3.0,
    garageSetback: 5.0,
    leftSetback: 1.0,
    rightSetback: 1.0,
    rearSetback: 2.0,
    btbSideSetback: 0.2,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.0,
    maxSiteCoverage: 60,
    minPosM2: 16,
    presetName: "Harmony Palmview (AVID)",
  },
};

/**
 * Resolves setback rules based on council, zoning, address, and land size.
 * Handles QDC MP 1.1 (<450m²), QDC MP 1.2 (>=450m²), and Acreage (>2000m²).
 */
export function resolveZoningRules({
  council = "",
  suburb = "",
  areaM2 = 450,
  estateName = "",
}: {
  council?: string;
  suburb?: string;
  areaM2?: number;
  estateName?: string;
}): SetbackRules {
  const combined = `${estateName} ${suburb} ${council}`.toLowerCase();

  // Check estate presets first
  for (const [key, preset] of Object.entries(ESTATE_ZONING_PRESETS)) {
    if (combined.includes(key)) {
      // Adjust lotCategory dynamically
      const category = areaM2 < 450 ? "small-lot" : areaM2 >= 2000 ? "acreage" : "standard-lot";
      return {
        ...preset,
        lotCategory: category,
      };
    }
  }

  // Acreage Lots (> 2,000m²)
  if (areaM2 >= 2000) {
    return {
      councilName: council || "Queensland Regional Council",
      zoningCode: "Rural Residential / Large Lot",
      lotCategory: "acreage",
      frontSetback: 10.0,
      garageSetback: 10.0,
      leftSetback: 5.0,
      rightSetback: 5.0,
      rearSetback: 5.0,
      btbSideSetback: 5.0,
      eaveWidthM: 0.45,
      btbEaveWidthM: 0.45,
      maxSiteCoverage: 30,
      minPosM2: 80,
      presetName: "Acreage / Rural Residential Code",
    };
  }

  // Small Lots (< 450m²): QDC MP 1.1
  if (areaM2 < 450) {
    return {
      councilName: council || "Logan City Council",
      zoningCode: "Low-Medium Density / Small Lot Code (QDC MP 1.1)",
      lotCategory: "small-lot",
      frontSetback: 3.0,
      garageSetback: 5.0,
      leftSetback: 1.0,
      rightSetback: 1.0,
      rearSetback: 1.5,
      btbSideSetback: 0.2, // 200mm to wall
      eaveWidthM: 0.45,
      btbEaveWidthM: 0.0,
      maxSiteCoverage: 60,
      minPosM2: 16,
      presetName: "QDC MP 1.1 Small Lot Code (<450m²)",
    };
  }

  // Standard Lots (>= 450m²): QDC MP 1.2
  return {
    councilName: council || "Queensland Standard Guidelines",
    zoningCode: "Low Density Residential (QDC MP 1.2)",
    lotCategory: "standard-lot",
    frontSetback: 4.5,
    garageSetback: 5.4,
    leftSetback: 1.5,
    rightSetback: 1.5,
    rearSetback: 1.5,
    btbSideSetback: 1.5,
    eaveWidthM: 0.45,
    btbEaveWidthM: 0.45,
    maxSiteCoverage: 50,
    minPosM2: 24,
    presetName: "QDC MP 1.2 Standard Lot Code (≥450m²)",
  };
}

/**
 * Checks if the parcel boundaries and title block fit on an A3 page at 1:100 scale.
 * An A3 page is 420mm x 297mm.
 * Printable area with margins and Hudson title block is approx 360mm x 240mm.
 * At 1:100 scale: 10mm = 1.0m.
 * Thus: Max allowable parcel length = ~36.0m, width = ~24.0m.
 */
export function canFitA3At1to100(frontageM: number, depthM: number): boolean {
  const maxDimension = Math.max(frontageM, depthM);
  const minDimension = Math.min(frontageM, depthM);
  // 36m max length, 24m max width allows full 1:100 scale fit on A3
  return maxDimension <= 37.0 && minDimension <= 25.0;
}

/**
 * Computes live compliance report:
 * Evaluates wall setbacks, eave offsets, site coverage %, and POS m².
 */
export function computeComplianceReport({
  parcel,
  rules,
  sitedHouse,
}: {
  parcel: CadastreParcel;
  rules: SetbackRules;
  sitedHouse: SitedHouse;
}): ComplianceReport {
  const lotW = parcel.frontageM || 14.0;
  const lotL = parcel.depthM || 32.0;
  const lotArea = parcel.areaM2 || lotW * lotL;

  const houseW = sitedHouse.widthM;
  const houseL = sitedHouse.lengthM;
  const houseArea = sitedHouse.totalM2;

  // Actual wall setbacks based on house position (posX, posY from front-left origin)
  const frontWall = Math.max(0, Math.round(sitedHouse.posY * 100) / 100);
  const leftWall = Math.max(0, Math.round(sitedHouse.posX * 100) / 100);
  const rightWall = Math.max(0, Math.round((lotW - houseW - sitedHouse.posX) * 100) / 100);
  const rearWall = Math.max(0, Math.round((lotL - houseL - sitedHouse.posY) * 100) / 100);

  // Garage wall setback: Garage is typically recessed 1.2m behind porch/front room
  const garageStepBack = 1.2;
  const garageWall = Math.round((frontWall + garageStepBack) * 100) / 100;

  // 450mm Eaves calculations (Wall setback - 0.45m)
  // On BTB side, eave is 0mm (parapet / zero-lot gutter)
  const isLeftBtb = sitedHouse.isBtb && sitedHouse.btbSide === "left";
  const isRightBtb = sitedHouse.isBtb && sitedHouse.btbSide === "right";

  const leftEave = isLeftBtb ? leftWall : Math.max(0, Math.round((leftWall - rules.eaveWidthM) * 100) / 100);
  const rightEave = isRightBtb ? rightWall : Math.max(0, Math.round((rightWall - rules.eaveWidthM) * 100) / 100);
  const frontEave = Math.max(0, Math.round((frontWall - rules.eaveWidthM) * 100) / 100);
  const garageEave = Math.max(0, Math.round((garageWall - rules.eaveWidthM) * 100) / 100);
  const rearEave = Math.max(0, Math.round((rearWall - rules.eaveWidthM) * 100) / 100);

  const liveSetbacks: LiveSetbacks = {
    frontWallSetback: frontWall,
    frontEaveSetback: frontEave,
    garageWallSetback: garageWall,
    garageEaveSetback: garageEave,
    leftWallSetback: leftWall,
    leftEaveSetback: leftEave,
    rightWallSetback: rightWall,
    rightEaveSetback: rightEave,
    rearWallSetback: rearWall,
    rearEaveSetback: rearEave,
  };

  // Site coverage calculation
  const siteCoveragePercent = Math.round((houseArea / lotArea) * 1000) / 10;
  const isSiteCoveragePassed = siteCoveragePercent <= rules.maxSiteCoverage;

  // Private Open Space (POS): rear yard area
  const privateOpenSpaceM2 = Math.round((rearWall * lotW) * 10) / 10;
  const isPosPassed = privateOpenSpaceM2 >= rules.minPosM2;

  // Compliance checks against statutory rules
  const requiredLeft = isLeftBtb ? rules.btbSideSetback : rules.leftSetback;
  const requiredRight = isRightBtb ? rules.btbSideSetback : rules.rightSetback;

  const isFrontCompliant = frontWall >= rules.frontSetback - 0.05;
  const isGarageCompliant = garageWall >= rules.garageSetback - 0.05;
  const isLeftCompliant = leftWall >= requiredLeft - 0.05;
  const isRightCompliant = rightWall >= requiredRight - 0.05;
  const isRearCompliant = rearWall >= rules.rearSetback - 0.05;

  const violations: string[] = [];
  if (!isFrontCompliant) {
    violations.push(`Front wall setback (${frontWall}m) is below council minimum (${rules.frontSetback}m)`);
  }
  if (!isGarageCompliant) {
    violations.push(`Garage door setback (${garageWall}m) is below minimum driveway length (${rules.garageSetback}m)`);
  }
  if (!isLeftCompliant) {
    violations.push(`Left side wall setback (${leftWall}m) is below minimum (${requiredLeft}m)`);
  }
  if (!isRightCompliant) {
    violations.push(`Right side wall setback (${rightWall}m) is below minimum (${requiredRight}m)`);
  }
  if (!isRearCompliant) {
    violations.push(`Rear wall setback (${rearWall}m) is below council minimum (${rules.rearSetback}m)`);
  }
  if (!isSiteCoveragePassed) {
    violations.push(`Site coverage (${siteCoveragePercent}%) exceeds statutory limit (${rules.maxSiteCoverage}%)`);
  }
  if (!isPosPassed) {
    violations.push(`Private Open Space (${privateOpenSpaceM2}m²) is below required minimum (${rules.minPosM2}m²)`);
  }

  return {
    siteCoveragePercent,
    maxSiteCoveragePercent: rules.maxSiteCoverage,
    isSiteCoveragePassed,
    houseFootprintM2: houseArea,
    lotAreaM2: lotArea,
    privateOpenSpaceM2,
    minPosM2: rules.minPosM2,
    isPosPassed,
    liveSetbacks,
    isFrontCompliant,
    isGarageCompliant,
    isLeftCompliant,
    isRightCompliant,
    isRearCompliant,
    allCompliant: violations.length === 0,
    violations,
  };
}
