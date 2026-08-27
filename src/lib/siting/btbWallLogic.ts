import { EstatePodRule, QUEENSLAND_ESTATE_POD_PRESETS } from "./estatePodPresets";

export interface SitingLotDimensions {
  frontageM: number; // Block width (e.g. 14.0m, 16.0m)
  depthM: number; // Block length (e.g. 30.0m, 32.0m)
  totalLotM2: number; // Total lot area (e.g. 448m², 500m²)
  lotNumber?: string;
  streetName?: string;
  estateName?: string;
  isCornerLot?: boolean;
}

export interface SitingHouseDimensions {
  designName: string;
  totalWidthM: number; // e.g. 10.8m, 11.5m
  totalDepthM: number; // e.g. 19.4m, 21.2m
  totalBuildingFootprintM2: number; // Ground floor envelope footprint
  garageSide: "RHS" | "LHS";
  hasBtbGarageWall: boolean; // Built to Boundary garage (steps out 600-1000mm)
  btbStepoutM: number; // Protrusion amount (e.g. 0.6m to 1.0m)
}

export interface SitingCalculationResult {
  // Clearances
  frontSetbackOmpM: number;
  frontSetbackGarageM: number;
  rearSetbackM: number;
  leftSideSetbackM: number;
  rightSideSetbackM: number;
  btbSide: "RHS" | "LHS" | "none";
  btbClearanceM: number; // strictly 0.20m (200mm) when active

  // Site Metrics
  totalLotAreaM2: number;
  buildingFootprintM2: number;
  siteCoveragePct: number;
  maxAllowableCoveragePct: number;
  isCoverageCompliant: boolean;
  privateOpenSpaceM2: number; // Backyard & side yards (excluding front driveway/setback)

  // Driveway & Porch Path
  drivewayWidthM: number; // Typically 4.8m to 5.8m (double garage) or 3.0m (single)
  drivewayAreaM2: number;
  porchPathSelected: boolean;
  porchPathWidthM: number; // default 1.0m
  porchPathLengthM: number;
  porchPathAreaM2: number;
  totalExposedAggAreaM2: number;

  // Validation
  warnings: string[];
  isCompliant: boolean;
}

/**
 * Calculates optimal, compliant house placement on a Queensland estate block
 * with Built-To-Boundary (BTB) 200mm garage offset logic.
 */
export function calculateHouseSiting({
  lot,
  house,
  podRule,
  includePorchPath = true,
}: {
  lot: SitingLotDimensions;
  house: SitingHouseDimensions;
  podRule?: EstatePodRule;
  includePorchPath?: boolean;
}): SitingCalculationResult {
  const rule = podRule || QUEENSLAND_ESTATE_POD_PRESETS[0];
  const warnings: string[] = [];

  const totalLotArea = lot.totalLotM2 || lot.frontageM * lot.depthM;
  const buildingFootprint = house.totalBuildingFootprintM2 || house.totalWidthM * house.totalDepthM * 0.85;

  // 1. Calculate Front Setbacks
  const frontOmp = rule.frontSetbackOmpM;
  const frontGarage = Math.max(rule.frontSetbackGarageM, frontOmp + 1.0); // Garage set back further than porch/OMP

  // 2. Calculate Side Setbacks based on BTB wall
  let leftSide = rule.sideSetbackStandardM;
  let rightSide = rule.sideSetbackStandardM;
  let btbSide: "RHS" | "LHS" | "none" = "none";
  let btbClearance = 0;

  if (house.hasBtbGarageWall) {
    if (house.garageSide === "RHS") {
      btbSide = "RHS";
      rightSide = 0.2; // 200mm clearance from boundary to garage external wall
      btbClearance = 0.2;
      leftSide = Math.max(0.9, Number((lot.frontageM - house.totalWidthM - 0.2).toFixed(2)));
    } else {
      btbSide = "LHS";
      leftSide = 0.2; // 200mm clearance on left
      btbClearance = 0.2;
      rightSide = Math.max(0.9, Number((lot.frontageM - house.totalWidthM - 0.2).toFixed(2)));
    }
  } else {
    // Non-BTB: Place garage side close to boundary (standard setback) or centre
    const remainingWidth = lot.frontageM - house.totalWidthM;
    if (remainingWidth < rule.sideSetbackStandardM * 2) {
      warnings.push(`Block frontage (${lot.frontageM}m) is tight for design width (${house.totalWidthM}m). Minimum 1.0m side clearances require relaxed approval.`);
    }
    // Centre or place garage at standard setback
    leftSide = Number((remainingWidth / 2).toFixed(2));
    rightSide = Number((remainingWidth / 2).toFixed(2));
  }

  // 3. Calculate Rear Setback
  const rearSetback = Number((lot.depthM - (house.totalDepthM + frontOmp)).toFixed(2));
  if (rearSetback < rule.rearSetbackM) {
    warnings.push(`Rear setback (${rearSetback}m) is less than estate POD guideline (${rule.rearSetbackM}m).`);
  }

  // 4. Calculate Site Coverage & POS
  const siteCoveragePct = Number(((buildingFootprint / totalLotArea) * 100).toFixed(1));
  const isCoverageCompliant = siteCoveragePct <= rule.maxSiteCoveragePct;
  if (!isCoverageCompliant) {
    warnings.push(`Site coverage (${siteCoveragePct}%) exceeds estate POD maximum (${rule.maxSiteCoveragePct}%).`);
  }

  const frontYardM2 = lot.frontageM * frontOmp;
  const privateOpenSpaceM2 = Math.max(0, Number((totalLotArea - buildingFootprint - frontYardM2).toFixed(1)));

  // 5. Calculate Driveway & Porch Path SQM
  const isDoubleGarage = house.totalWidthM >= 10.0;
  const drivewayWidth = isDoubleGarage ? 5.5 : 3.0; // 5.5m double, 3.0m single
  const councilCrossoverM2 = 6.0; // Standard council apron / crossover
  const drivewayMainArea = Number((frontGarage * drivewayWidth + councilCrossoverM2).toFixed(1));

  // Porch path extension: distance from garage side edge to porch entry
  const porchPathWidth = 1.0;
  const porchPathLength = Math.max(2.5, Number((house.totalWidthM * 0.35).toFixed(1))); // ~3.5m length to entry door
  const porchPathArea = includePorchPath ? Number((porchPathWidth * porchPathLength).toFixed(1)) : 0;
  const totalExposedAggArea = Number((drivewayMainArea + porchPathArea).toFixed(1));

  return {
    frontSetbackOmpM: frontOmp,
    frontSetbackGarageM: frontGarage,
    rearSetbackM: Math.max(0.5, rearSetback),
    leftSideSetbackM: Math.max(0.2, leftSide),
    rightSideSetbackM: Math.max(0.2, rightSide),
    btbSide,
    btbClearanceM: btbClearance,
    totalLotAreaM2: totalLotArea,
    buildingFootprintM2: buildingFootprint,
    siteCoveragePct,
    maxAllowableCoveragePct: rule.maxSiteCoveragePct,
    isCoverageCompliant,
    privateOpenSpaceM2,
    drivewayWidthM: drivewayWidth,
    drivewayAreaM2: drivewayMainArea,
    porchPathSelected: includePorchPath,
    porchPathWidthM: porchPathWidth,
    porchPathLengthM: porchPathLength,
    porchPathAreaM2: porchPathArea,
    totalExposedAggAreaM2: totalExposedAggArea,
    warnings,
    isCompliant: warnings.length === 0,
  };
}
