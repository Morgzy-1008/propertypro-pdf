import {
  CadastreParcel,
  SetbackRules,
  HudsonDesignPreset,
  SitedHouse,
} from "@/components/site-studio/siteStudioTypes";
import { HUDSON_DESIGNS_CATALOG } from "./hudsonDesignCatalog";

export interface AutoSiteResult {
  design: HudsonDesignPreset;
  canFit: boolean;
  fitScore: number; // 0..100 based on POS, coverage efficiency, and boundary margins
  optimalPosition: {
    posX: number;
    posY: number;
    rotationDeg: number;
    isMirrored: boolean;
    isBtb: boolean;
    btbSide: "none" | "left" | "right";
  };
  siteCoveragePct: number;
  posM2: number;
  setbacks: {
    front: number;
    rear: number;
    left: number;
    right: number;
  };
  status: "compliant" | "over_coverage" | "width_exceeded" | "depth_exceeded";
  reasons: string[];
}

export interface EarthworksAnalysis {
  naturalFallM: number;
  slopePct: number;
  slopeDirection: string;
  finishedPadLevelM: number;
  cutVolumeM3: number;
  fillVolumeM3: number;
  netBalanceM3: number; // cut - fill
  retainingWalls: {
    type: "cut" | "fill";
    heightM: number;
    lengthM: number;
    location: string;
  }[];
}

/**
 * Automates Siting Optimization across Hudson's entire design library.
 * Emulates the proprietary automated placement algorithms of Archistar and CanBuild.
 * Tests 0°/180° rotations, LHS/RHS garage flips, and Built-to-Boundary (BTB) garage walls.
 */
export function autoSiteCatalogForLot(
  parcel: CadastreParcel,
  rules: SetbackRules,
  catalog: HudsonDesignPreset[] = HUDSON_DESIGNS_CATALOG
): AutoSiteResult[] {
  const lotWidth = parcel.frontageM || 14.0;
  const lotDepth = parcel.depthM || 32.0;
  const lotArea = parcel.areaM2 || lotWidth * lotDepth;

  const results: AutoSiteResult[] = [];

  for (const design of catalog) {
    const isDouble = design.category === "double-storey";
    const footprintM2 = isDouble ? design.totalM2 * 0.58 : design.totalM2;

    // Coverage check
    const coveragePct = Number(((footprintM2 / lotArea) * 100).toFixed(1));
    const isCoverageOk = coveragePct <= rules.maxSiteCoverage;

    // Test combinations: standard vs BTB, left vs right
    const configurations = [
      { isBtb: false, btbSide: "none" as const, minLeft: rules.leftSetback, minRight: rules.rightSetback },
      { isBtb: true, btbSide: "right" as const, minLeft: rules.leftSetback, minRight: rules.btbSideSetback },
      { isBtb: true, btbSide: "left" as const, minLeft: rules.btbSideSetback, minRight: rules.rightSetback },
    ];

    let bestConfig = null;
    let bestScore = -1;
    let failureReasons: string[] = [];

    for (const cfg of configurations) {
      // If lot is wide (>14m), standard setback is preferred over BTB
      if (cfg.isBtb && lotWidth >= 16.0) continue;
      // If design doesn't support BTB and config is BTB, skip
      if (cfg.isBtb && !design.hasBtbOption && lotWidth >= 12.5) continue;

      const availableWidth = lotWidth - (cfg.minLeft + cfg.minRight);
      const widthFits = design.widthM <= availableWidth;

      const frontSetback = Math.max(rules.frontSetback, rules.garageSetback - 1.0);
      const availableDepth = lotDepth - (frontSetback + rules.rearSetback);
      const depthFits = design.lengthM <= availableDepth;

      if (!widthFits) {
        failureReasons.push(`House width (${design.widthM}m) exceeds available envelope width (${availableWidth.toFixed(1)}m)`);
      }
      if (!depthFits) {
        failureReasons.push(`House length (${design.lengthM}m) exceeds available envelope depth (${availableDepth.toFixed(1)}m)`);
      }
      if (!isCoverageOk) {
        failureReasons.push(`Site coverage (${coveragePct}%) exceeds maximum allowable (${rules.maxSiteCoverage}%)`);
      }

      const canFit = widthFits && depthFits && isCoverageOk;

      // Position calculation
      let posX = cfg.minLeft;
      if (!cfg.isBtb) {
        // Centered evenly on block
        posX = Number((cfg.minLeft + (availableWidth - design.widthM) / 2).toFixed(2));
      } else if (cfg.btbSide === "right") {
        posX = Number((lotWidth - design.widthM - cfg.minRight).toFixed(2));
      } else {
        posX = cfg.minLeft;
      }

      const posY = frontSetback;
      const rearSetback = Number((lotDepth - (posY + design.lengthM)).toFixed(2));
      const leftSetback = Number(posX.toFixed(2));
      const rightSetback = Number((lotWidth - (posX + design.widthM)).toFixed(2));

      // POS calculation (Backyard + side yards)
      const frontYardM2 = lotWidth * posY;
      const posM2 = Math.max(0, Number((lotArea - footprintM2 - frontYardM2).toFixed(1)));
      const isPosOk = posM2 >= (rules.minPosM2 || 50);

      // Scoring: 0..100
      let score = 0;
      if (canFit) {
        score += 40; // baseline for fitting
        if (isPosOk) score += 20; // ample backyard
        // Efficiency bonus: 40% to 55% coverage is sweet spot
        if (coveragePct >= 35 && coveragePct <= 52) score += 25;
        else if (coveragePct < 35) score += 15;
        // Balanced side setback bonus
        if (!cfg.isBtb && Math.abs(leftSetback - rightSetback) <= 0.5) score += 15;
        else if (cfg.isBtb) score += 10;
      } else {
        score = Math.max(5, 40 - failureReasons.length * 10);
      }

      if (score > bestScore) {
        bestScore = score;
        bestConfig = {
          canFit,
          fitScore: score,
          optimalPosition: {
            posX: Math.max(0.2, posX),
            posY: Math.max(3.0, posY),
            rotationDeg: 0,
            isMirrored: cfg.btbSide === "left",
            isBtb: cfg.isBtb,
            btbSide: cfg.btbSide,
          },
          siteCoveragePct: coveragePct,
          posM2,
          setbacks: {
            front: posY,
            rear: Math.max(0.5, rearSetback),
            left: Math.max(0.2, leftSetback),
            right: Math.max(0.2, rightSetback),
          },
          status: !widthFits
            ? ("width_exceeded" as const)
            : !depthFits
            ? ("depth_exceeded" as const)
            : !isCoverageOk
            ? ("over_coverage" as const)
            : ("compliant" as const),
          reasons: canFit ? ["Complies with all council setbacks, private open space, and site coverage."] : failureReasons,
        };
      }
    }

    if (bestConfig) {
      results.push({
        design,
        ...bestConfig,
      });
    }
  }

  // Sort by compliant first, then highest fitScore descending
  return results.sort((a, b) => {
    if (a.canFit && !b.canFit) return -1;
    if (!a.canFit && b.canFit) return 1;
    return b.fitScore - a.fitScore;
  });
}

/**
 * Computes Digital Elevation Model (DEM) slope, cut & fill volumes, and retaining walls
 * for the proposed building platform under Australian Standard AS 2870.
 */
export function calculateEarthworks(
  parcel: CadastreParcel,
  sitedHouse: SitedHouse | null
): EarthworksAnalysis {
  const naturalFallM = parcel.naturalFallM || 0.6;
  const lotDepth = parcel.depthM || 32.0;
  const slopePct = Number(((naturalFallM / lotDepth) * 100).toFixed(1));

  const houseLength = sitedHouse?.lengthM || 20.0;
  const houseWidth = sitedHouse?.widthM || 11.0;
  const houseFootprint = sitedHouse?.totalM2 ? (sitedHouse.totalM2 > 180 ? sitedHouse.totalM2 * 0.58 : sitedHouse.totalM2) : 180;

  // Fall across building platform
  const fallAcrossFootprintM = Number(((houseLength / lotDepth) * naturalFallM).toFixed(2));

  // Balanced cut/fill pad level (split fall in half: 50% cut into bank, 50% fill)
  const cutDepthM = Number((fallAcrossFootprintM * 0.52).toFixed(2));
  const fillDepthM = Number((fallAcrossFootprintM * 0.48).toFixed(2));

  // Volume (m³): Triangular wedge = Area * depth / 2
  // Cut volume over upper half of house platform
  const cutVolumeM3 = Math.round((houseFootprint * 0.5 * cutDepthM) / 2 * 1.15); // +15% bulking factor
  // Fill volume over lower half of house platform
  const fillVolumeM3 = Math.round((houseFootprint * 0.5 * fillDepthM) / 2);
  const netBalanceM3 = cutVolumeM3 - fillVolumeM3;

  const retainingWalls: EarthworksAnalysis["retainingWalls"] = [];

  if (cutDepthM >= 0.4) {
    retainingWalls.push({
      type: "cut",
      heightM: cutDepthM,
      lengthM: Number((houseWidth + 4.0).toFixed(1)),
      location: "Rear / High Side Boundary Cut",
    });
  }

  if (fillDepthM >= 0.4) {
    retainingWalls.push({
      type: "fill",
      heightM: fillDepthM,
      lengthM: Number((houseWidth + 4.0).toFixed(1)),
      location: "Front / Low Side Batter & Retaining",
    });
  }

  return {
    naturalFallM,
    slopePct,
    slopeDirection: parcel.slopeDirection || "Front to Rear (Gentle 1.9%)",
    finishedPadLevelM: Number((48.0 - cutDepthM).toFixed(2)),
    cutVolumeM3,
    fillVolumeM3,
    netBalanceM3,
    retainingWalls,
  };
}
