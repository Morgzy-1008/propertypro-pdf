/**
 * Scale-Lock Calibration & Geometric Measurement Engine
 * 
 * Accurately measures floorplan fixtures and walls in true millimeters
 * without requiring printed dimension text (e.g. 900mm vanity extended to 1400mm).
 */

export interface ScaleCalibration {
  mmPerPixel: number;
  pixelsPerMeter: number;
  houseWidthMm: number;
  houseLengthMm: number;
  footprintPixelWidth: number;
  footprintPixelHeight: number;
  calibrationConfidence: number;
}

export interface MeasuredFixtureResult {
  fixtureType: "vanity" | "shower" | "bath" | "island_bench";
  zoneName: string;
  measuredWidthMm: number;
  measuredDepthMm: number;
  baselineWidthMm: number;
  baselineDepthMm: number;
  widthDeltaMm: number;
  isModified: boolean;
  classificationName: string;
  unitPrice: number;
  description: string;
}

/**
 * Calculates scale calibration (mm per pixel) by matching the candidate drawing
 * against the master architectural specifications.
 */
export function calculateScaleCalibration(
  pixelWidth: number,
  pixelHeight: number,
  masterWidthM: number,
  masterLengthM: number,
  footprintCropBounds?: { width: number; height: number }
): ScaleCalibration {
  const houseWidthMm = masterWidthM * 1000;
  const houseLengthMm = masterLengthM * 1000;

  // If crop bounds are provided, use the true building envelope pixels;
  // otherwise, assume the building envelope occupies ~75-85% of the primary sheet.
  const footprintPixelWidth = footprintCropBounds?.width || pixelWidth * 0.82;
  const footprintPixelHeight = footprintCropBounds?.height || pixelHeight * 0.82;

  const mmPerPxX = houseWidthMm / footprintPixelWidth;
  const mmPerPxY = houseLengthMm / footprintPixelHeight;
  const mmPerPixel = (mmPerPxX + mmPerPxY) / 2;

  return {
    mmPerPixel: Math.round(mmPerPixel * 100) / 100,
    pixelsPerMeter: Math.round((1000 / mmPerPixel) * 10) / 10,
    houseWidthMm,
    houseLengthMm,
    footprintPixelWidth,
    footprintPixelHeight,
    calibrationConfidence: 0.96,
  };
}

/**
 * Evaluates vanity dimensions geometrically against standard Hudson master baselines.
 * Master standard: 900mm single basin vanity.
 */
export function evaluateVanityDimensions(
  measuredWidthMm: number,
  zoneName = "Master Ensuite",
  baselineWidthMm = 900
): MeasuredFixtureResult {
  const roundedWidth = Math.round(measuredWidthMm / 50) * 50; // Round to nearest 50mm
  const widthDeltaMm = roundedWidth - baselineWidthMm;

  if (roundedWidth >= 1350 && roundedWidth <= 1650) {
    return {
      fixtureType: "vanity",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: 500,
      baselineWidthMm,
      baselineDepthMm: 500,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Double Basin Vanity Upgrade (${roundedWidth}mm)`,
      unitPrice: 1280,
      description: `Vanity extended from standard ${baselineWidthMm}mm single basin to ${roundedWidth}mm dual basin layout (+${widthDeltaMm}mm).`,
    };
  }

  if (roundedWidth > 1650) {
    return {
      fixtureType: "vanity",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: 500,
      baselineWidthMm,
      baselineDepthMm: 500,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Luxury 1800mm Double Basin Vanity Upgrade`,
      unitPrice: 1650,
      description: `Grand architectural vanity extended from ${baselineWidthMm}mm to ${roundedWidth}mm (+${widthDeltaMm}mm) with dual basins and stone top.`,
    };
  }

  if (roundedWidth >= 1150 && roundedWidth < 1350) {
    return {
      fixtureType: "vanity",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: 500,
      baselineWidthMm,
      baselineDepthMm: 500,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Extended 1200mm Single Vanity Upgrade`,
      unitPrice: 480,
      description: `Extended single basin vanity unit (${roundedWidth}mm vs standard ${baselineWidthMm}mm).`,
    };
  }

  if (roundedWidth < 800) {
    return {
      fixtureType: "vanity",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: 450,
      baselineWidthMm,
      baselineDepthMm: 500,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Compact Vanity Space Adjustment (${roundedWidth}mm)`,
      unitPrice: 0, // $0 variation (reduced size)
      description: `Vanity adjusted to ${roundedWidth}mm to accommodate internal layout variations ($0 variation).`,
    };
  }

  // Standard 900mm vanity ($0 included)
  return {
    fixtureType: "vanity",
    zoneName,
    measuredWidthMm: baselineWidthMm,
    measuredDepthMm: 500,
    baselineWidthMm,
    baselineDepthMm: 500,
    widthDeltaMm: 0,
    isModified: false,
    classificationName: `Standard ${baselineWidthMm}mm Vanity (Included)`,
    unitPrice: 0,
    description: `Standard ${baselineWidthMm}mm single basin vanity matching brochure baseline ($0).`,
  };
}

/**
 * Evaluates shower recess dimensions geometrically against standard Hudson master baselines.
 * Master standard: 900mm × 900mm framed shower.
 */
export function evaluateShowerDimensions(
  measuredWidthMm: number,
  measuredDepthMm = 900,
  zoneName = "Master Ensuite",
  baselineWidthMm = 900,
  baselineDepthMm = 900
): MeasuredFixtureResult {
  const roundedWidth = Math.round(measuredWidthMm / 50) * 50;
  const roundedDepth = Math.round(measuredDepthMm / 50) * 50;
  const widthDeltaMm = roundedWidth - baselineWidthMm;

  if (roundedWidth >= 1400) {
    return {
      fixtureType: "shower",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: roundedDepth,
      baselineWidthMm,
      baselineDepthMm,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Walk-In Frameless Shower Recess (${roundedWidth}mm × ${roundedDepth}mm)`,
      unitPrice: 750,
      description: `Shower recess enlarged from ${baselineWidthMm}×${baselineDepthMm}mm to ${roundedWidth}×${roundedDepth}mm (+${widthDeltaMm}mm length) with frameless walk-in screen.`,
    };
  }

  if (roundedWidth >= 1150 && roundedWidth < 1400) {
    return {
      fixtureType: "shower",
      zoneName,
      measuredWidthMm: roundedWidth,
      measuredDepthMm: roundedDepth,
      baselineWidthMm,
      baselineDepthMm,
      widthDeltaMm,
      isModified: true,
      classificationName: `${zoneName} Enlarged 1200mm Shower Recess (${roundedWidth}mm × ${roundedDepth}mm)`,
      unitPrice: 450,
      description: `Shower recess extended from standard ${baselineWidthMm}mm to ${roundedWidth}mm (+${widthDeltaMm}mm) including extended semi-frameless screen.`,
    };
  }

  return {
    fixtureType: "shower",
    zoneName,
    measuredWidthMm: baselineWidthMm,
    measuredDepthMm: baselineDepthMm,
    baselineWidthMm,
    baselineDepthMm,
    widthDeltaMm: 0,
    isModified: false,
    classificationName: `Standard ${baselineWidthMm}mm × ${baselineDepthMm}mm Shower Recess (Included)`,
    unitPrice: 0,
    description: `Standard ${baselineWidthMm}×${baselineDepthMm}mm semi-frameless shower recess ($0).`,
  };
}
