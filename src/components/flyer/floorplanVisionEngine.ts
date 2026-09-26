/**
 * Architectural Floorplan Vision & CAD Vectorization Engine
 *
 * Scans floorplan image pixels, separates disconnected option boxes (e.g. Bed 4 option),
 * isolates Ground Floor for double-storey designs, and tightly crops to the true primary house footprint.
 */

import { getHudsonDimensions } from "@/lib/hudsonDimensions.data";

export interface Point2D {
  x: number;
  y: number;
}

export interface RoomAreaBreakdown {
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  livingM2: number;
  totalM2: number;
  garageDimensions: string;
  alfrescoDimensions: string;
  porchDimensions: string;
}

export interface WallVectorAnalysis {
  croppedUrl?: string;
  houseWidthM: number;
  houseLengthM: number;
  wallPolygon: Point2D[];

  garageDoorStart: Point2D;
  garageDoorEnd: Point2D;
  garageDoorThresholdY: number;
  
  frontLivingWallPoint: Point2D;
  rearMasterWallPoint: Point2D;
  familyRearWallPoint: Point2D;
  
  lhsWallPoint: Point2D;
  rhsGarageSideWallPoint: Point2D;
  rhsBehindGaragePoint: Point2D;

  roomAreas: RoomAreaBreakdown;
  isBtbCapable: boolean;
  garageStepOutM: number;
  garageStepBackM: number;
}

export const HUDSON_CAD_REGISTRY: Record<string, {
  width: number;
  length: number;
  totalM2: number;
  garageM2: number;
  garageDims: string;
  alfrescoM2: number;
  alfrescoDims: string;
  porchM2: number;
  porchDims: string;
  livingM2: number;
  garageStepOutM: number;
  garageStepBackM: number;
  garageDoorX1: number;
  garageDoorX2: number;
  garageDoorY: number;
  frontLivingY: number;
  rearMasterY: number;
  familyRearY: number;
  familyRearX: number;
  rhsMainWallX: number;
}> = {
  "Coral 19": {
    width: 10.55,
    length: 19.50,
    totalM2: 181.02,
    garageM2: 33.73,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 9.54,
    alfrescoDims: "2.6m × 3.6m",
    porchM2: 2.50,
    porchDims: "1.6m × 1.5m",
    livingM2: 135.25,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Coral 21": {
    width: 10.55,
    length: 20.80,
    totalM2: 197.08,
    garageM2: 34.73,
    garageDims: "5.5m × 5.8m",
    alfrescoM2: 11.23,
    alfrescoDims: "3.5m × 3.2m",
    porchM2: 2.84,
    porchDims: "1.8m × 1.6m",
    livingM2: 148.28,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Coral 23": {
    width: 11.20,
    length: 21.50,
    totalM2: 215.20,
    garageM2: 34.80,
    garageDims: "5.8m × 5.6m",
    alfrescoM2: 12.10,
    alfrescoDims: "3.8m × 3.2m",
    porchM2: 2.90,
    porchDims: "1.8m × 1.6m",
    livingM2: 165.40,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Coral 26": {
    width: 11.20,
    length: 23.20,
    totalM2: 241.56,
    garageM2: 35.10,
    garageDims: "5.8m × 5.7m",
    alfrescoM2: 14.50,
    alfrescoDims: "4.5m × 3.2m",
    porchM2: 3.46,
    porchDims: "2.0m × 1.7m",
    livingM2: 188.50,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Amber 21": {
    width: 10.55,
    length: 20.27,
    totalM2: 192.24,
    garageM2: 32.89,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 9.54,
    alfrescoDims: "2.6m × 3.6m",
    porchM2: 2.25,
    porchDims: "1.4m × 1.5m",
    livingM2: 147.56,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Amber 23": {
    width: 11.20,
    length: 21.00,
    totalM2: 210.63,
    garageM2: 32.40,
    garageDims: "5.9m × 5.5m",
    alfrescoM2: 12.60,
    alfrescoDims: "4.2m × 3.0m",
    porchM2: 2.40,
    porchDims: "1.6m × 1.5m",
    livingM2: 163.23,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Amber 26": {
    width: 11.20,
    length: 20.15,
    totalM2: 241.56,
    garageM2: 35.20,
    garageDims: "5.9m × 5.7m",
    alfrescoM2: 14.50,
    alfrescoDims: "4.8m × 3.0m",
    porchM2: 3.46,
    porchDims: "1.8m × 1.5m",
    livingM2: 188.40,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.22,
    familyRearX: 0.82,
    rhsMainWallX: 1.0,
  },
  "Azure 19": {
    width: 10.55,
    length: 18.50,
    totalM2: 174.50,
    garageM2: 30.25,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 9.00,
    alfrescoDims: "3.0m × 3.0m",
    porchM2: 2.10,
    porchDims: "1.4m × 1.5m",
    livingM2: 133.15,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Azure 23": {
    width: 10.55,
    length: 21.47,
    totalM2: 208.71,
    garageM2: 34.27,
    garageDims: "5.5m × 5.7m",
    alfrescoM2: 11.40,
    alfrescoDims: "3.0m × 3.8m",
    porchM2: 1.73,
    porchDims: "1.4m × 1.2m",
    livingM2: 161.31,
    garageStepOutM: 0.0,
    garageStepBackM: 0.0,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Cedar 26": {
    width: 15.23,
    length: 19.43,
    totalM2: 242.35,
    garageM2: 33.52,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 9.63,
    alfrescoDims: "3.5m × 2.7m",
    porchM2: 3.86,
    porchDims: "2.0m × 1.9m",
    livingM2: 195.34,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.58,
    garageDoorX2: 0.98,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Cedar 28": {
    width: 15.23,
    length: 20.80,
    totalM2: 259.32,
    garageM2: 33.52,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 11.20,
    alfrescoDims: "4.0m × 2.8m",
    porchM2: 4.10,
    porchDims: "2.0m × 2.0m",
    livingM2: 210.50,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.58,
    garageDoorX2: 0.98,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Cedar 31": {
    width: 16.00,
    length: 22.00,
    totalM2: 288.90,
    garageM2: 35.10,
    garageDims: "5.8m × 5.7m",
    alfrescoM2: 13.50,
    alfrescoDims: "4.5m × 3.0m",
    porchM2: 4.50,
    porchDims: "2.2m × 2.0m",
    livingM2: 235.80,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.58,
    garageDoorX2: 0.98,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Cedar 34": {
    width: 16.50,
    length: 23.50,
    totalM2: 314.00,
    garageM2: 35.20,
    garageDims: "5.8m × 5.7m",
    alfrescoM2: 15.60,
    alfrescoDims: "5.0m × 3.1m",
    porchM2: 4.80,
    porchDims: "2.4m × 2.0m",
    livingM2: 258.40,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.58,
    garageDoorX2: 0.98,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Burgundy 27": {
    width: 10.91,
    length: 17.15,
    totalM2: 254.73,
    garageM2: 33.81,
    garageDims: "5.5m × 5.5m",
    alfrescoM2: 11.88,
    alfrescoDims: "3.9m × 3.0m",
    porchM2: 3.88,
    porchDims: "2.1m × 2.0m",
    livingM2: 205.16,
    garageStepOutM: 0.0,
    garageStepBackM: 0.0,
    garageDoorX1: 0.50,
    garageDoorX2: 0.95,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Burgundy 30": {
    width: 11.80,
    length: 18.20,
    totalM2: 283.43,
    garageM2: 34.80,
    garageDims: "5.5m × 5.7m",
    alfrescoM2: 15.20,
    alfrescoDims: "4.2m × 3.6m",
    porchM2: 4.13,
    porchDims: "2.2m × 2.0m",
    livingM2: 229.30,
    garageStepOutM: 0.0,
    garageStepBackM: 0.0,
    garageDoorX1: 0.50,
    garageDoorX2: 0.95,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Burgundy 32": {
    width: 12.00,
    length: 18.90,
    totalM2: 298.13,
    garageM2: 35.10,
    garageDims: "5.8m × 5.7m",
    alfrescoM2: 14.10,
    alfrescoDims: "4.0m × 3.5m",
    porchM2: 4.23,
    porchDims: "2.2m × 2.0m",
    livingM2: 244.70,
    garageStepOutM: 0.0,
    garageStepBackM: 0.0,
    garageDoorX1: 0.50,
    garageDoorX2: 0.95,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Burgundy 34": {
    width: 12.20,
    length: 19.80,
    totalM2: 319.48,
    garageM2: 35.20,
    garageDims: "5.8m × 5.7m",
    alfrescoM2: 13.90,
    alfrescoDims: "4.0m × 3.5m",
    porchM2: 4.38,
    porchDims: "2.3m × 2.0m",
    livingM2: 266.00,
    garageStepOutM: 0.0,
    garageStepBackM: 0.0,
    garageDoorX1: 0.50,
    garageDoorX2: 0.95,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Jasper 26": {
    width: 11.09,
    length: 22.50,
    totalM2: 241.82,
    garageM2: 33.60,
    garageDims: "5.9m × 5.7m",
    alfrescoM2: 14.50,
    alfrescoDims: "4.8m × 3.0m",
    porchM2: 2.80,
    porchDims: "1.8m × 1.5m",
    livingM2: 190.92,
    garageStepOutM: 0.60,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.98,
    garageDoorY: 0.95,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.24,
    familyRearX: 0.78,
    rhsMainWallX: 0.946,
  },
  "Maroon 26": {
    width: 11.10,
    length: 14.50,
    totalM2: 244.42,
    garageM2: 33.60,
    garageDims: "5.9m × 5.7m",
    alfrescoM2: 12.00,
    alfrescoDims: "4.0m × 3.0m",
    porchM2: 2.50,
    porchDims: "1.6m × 1.5m",
    livingM2: 196.32,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.48,
    garageDoorX2: 0.96,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Hazel 14": {
    width: 8.27,
    length: 16.66,
    totalM2: 125.80,
    garageM2: 18.93,
    garageDims: "3.0m × 5.5m",
    alfrescoM2: 6.70,
    alfrescoDims: "3.1m × 2.1m",
    porchM2: 1.54,
    porchDims: "1.4m × 1.0m",
    livingM2: 98.63,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.55,
    garageDoorX2: 0.95,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Hazel 15": {
    width: 8.27,
    length: 18.71,
    totalM2: 142.05,
    garageM2: 18.80,
    garageDims: "3.0m × 5.5m",
    alfrescoM2: 8.58,
    alfrescoDims: "3.8m × 2.1m",
    porchM2: 1.71,
    porchDims: "1.5m × 1.1m",
    livingM2: 112.96,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.55,
    garageDoorX2: 0.95,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Hazel 17": {
    width: 8.27,
    length: 20.87,
    totalM2: 158.08,
    garageM2: 18.80,
    garageDims: "3.0m × 5.5m",
    alfrescoM2: 9.36,
    alfrescoDims: "4.2m × 2.1m",
    porchM2: 1.88,
    porchDims: "1.6m × 1.1m",
    livingM2: 128.04,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.55,
    garageDoorX2: 0.95,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
  "Hazel 19": {
    width: 8.27,
    length: 22.91,
    totalM2: 173.20,
    garageM2: 18.80,
    garageDims: "3.0m × 5.5m",
    alfrescoM2: 9.73,
    alfrescoDims: "4.4m × 2.1m",
    porchM2: 2.05,
    porchDims: "1.7m × 1.2m",
    livingM2: 142.62,
    garageStepOutM: 0.0,
    garageStepBackM: 1.20,
    garageDoorX1: 0.55,
    garageDoorX2: 0.95,
    garageDoorY: 0.94,
    frontLivingY: 1.0,
    rearMasterY: 0.0,
    familyRearY: 0.20,
    familyRearX: 0.80,
    rhsMainWallX: 1.0,
  },
};

export function generateWallVectorAnalysis(
  designName = "",
  croppedUrl?: string,
  housingType = "",
  customWidth?: number,
  customLength?: number
): WallVectorAnalysis {
  const dim = getHudsonDimensions(designName);

  let matchedKey = "";
  for (const k of Object.keys(HUDSON_CAD_REGISTRY)) {
    if (designName.toLowerCase().includes(k.toLowerCase())) {
      matchedKey = k;
      break;
    }
  }

  const cad = matchedKey ? HUDSON_CAD_REGISTRY[matchedKey] : HUDSON_CAD_REGISTRY["Amber 21"];
  const defaultW = dim ? dim.width : (cad ? cad.width : 10.55);
  const defaultL = dim ? dim.length : (cad ? cad.length : 20.15);
  const W = customWidth && customWidth > 0 ? customWidth : defaultW;
  const L = customLength && customLength > 0 ? customLength : defaultL;

  return {
    croppedUrl,
    houseWidthM: W,
    houseLengthM: L,
    wallPolygon: [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: L },
      { x: 0, y: L },
    ],
    garageDoorStart: { x: cad.garageDoorX1 * W, y: cad.garageDoorY * L },
    garageDoorEnd: { x: cad.garageDoorX2 * W, y: cad.garageDoorY * L },
    garageDoorThresholdY: cad.garageDoorY * L,
    frontLivingWallPoint: { x: 0.28 * W, y: cad.frontLivingY * L },
    rearMasterWallPoint: { x: 0.28 * W, y: cad.rearMasterY * L },
    familyRearWallPoint: { x: cad.familyRearX * W, y: cad.familyRearY * L },
    lhsWallPoint: { x: 0.0, y: 0.50 * L },
    rhsGarageSideWallPoint: { x: W, y: 0.75 * L },
    rhsBehindGaragePoint: { x: cad.rhsMainWallX * W, y: 0.35 * L },
    roomAreas: {
      garageM2: cad.garageM2,
      alfrescoM2: cad.alfrescoM2,
      porchM2: cad.porchM2,
      livingM2: cad.livingM2,
      totalM2: cad.totalM2,
      garageDimensions: cad.garageDims,
      alfrescoDimensions: cad.alfrescoDims,
      porchDimensions: cad.porchDimensions || cad.porchDims,
    },
    isBtbCapable: cad.garageStepOutM > 0,
    garageStepOutM: cad.garageStepOutM,
    garageStepBackM: cad.garageStepBackM,
  };
}

const scanCache = new Map<string, WallVectorAnalysis>();

export async function scanAndVectorizeFloorplan(
  imageUrl: string,
  designName = "",
  housingType = "",
  customWidth?: number,
  customLength?: number
): Promise<WallVectorAnalysis> {
  const cacheKey = `${imageUrl}_${designName}_${housingType}_${customWidth || ""}_${customLength || ""}`;
  if (scanCache.has(cacheKey)) {
    return scanCache.get(cacheKey)!;
  }

  const baseAnalysis = generateWallVectorAnalysis(designName, undefined, housingType, customWidth, customLength);

  if (typeof window === "undefined" || !imageUrl) {
    return baseAnalysis;
  }

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < 50 || h < 50) return baseAnalysis;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return baseAnalysis;

    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Column ink density analysis to separate disconnected optional layout callout boxes / double storey right floor
    const colInk = new Float32Array(w);
    const threshold = 230;

    for (let x = 0; x < w; x++) {
      let count = 0;
      for (let y = 0; y < h; y += 2) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (alpha > 50 && (r < threshold || g < threshold || b < threshold)) {
          count++;
        }
      }
      colInk[x] = count;
    }

    // Find horizontal contiguous blocks of ink
    interface Block { start: number; end: number; ink: number }
    const blocks: Block[] = [];
    let inBlock = false;
    let bStart = 0;
    let bInk = 0;

    for (let x = 0; x < w; x++) {
      if (colInk[x] > 4) {
        if (!inBlock) {
          inBlock = true;
          bStart = x;
          bInk = 0;
        }
        bInk += colInk[x];
      } else if (inBlock) {
        // Check if gap is wide enough (> 12px)
        let gapWidth = 0;
        for (let gx = x; gx < Math.min(w, x + 25); gx++) {
          if (colInk[gx] <= 4) gapWidth++;
          else break;
        }
        if (gapWidth > 12 || x === w - 1) {
          blocks.push({ start: bStart, end: x, ink: bInk });
          inBlock = false;
        }
      }
    }
    if (inBlock) {
      blocks.push({ start: bStart, end: w - 1, ink: bInk });
    }

    // Pick the primary block (the leftmost largest block which is the ground floorplan)
    let selectedBlock = blocks[0];
    if (blocks.length > 1) {
      // Sort or filter: The ground floorplan is the main block on the left
      selectedBlock = blocks.reduce((prev, curr) => (curr.ink > prev.ink * 1.5 ? curr : prev), blocks[0]);
      // If the selected block is on the right, preference the left main block
      if (blocks[0].ink > selectedBlock.ink * 0.3) {
        selectedBlock = blocks[0];
      }
    }

    const minScanX = selectedBlock ? selectedBlock.start : 0;
    const maxScanX = selectedBlock ? selectedBlock.end : w;

    let minX = maxScanX, maxX = minScanX, minY = h, maxY = 0;

    for (let y = 0; y < h; y += 2) {
      for (let x = minScanX; x <= maxScanX; x += 2) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (alpha > 50 && (r < threshold || g < threshold || b < threshold)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX >= maxX || minY >= maxY) return baseAnalysis;

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext("2d");
    if (croppedCtx) {
      croppedCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    }
    const croppedUrl = croppedCanvas.toDataURL("image/png");

    const result = generateWallVectorAnalysis(designName, croppedUrl, housingType);
    scanCache.set(cacheKey, result);
    return result;
  } catch {
    return baseAnalysis;
  }
}
