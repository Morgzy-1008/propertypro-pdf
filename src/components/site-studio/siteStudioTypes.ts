export type BasemapMode = "satellite-hybrid" | "esri-aerial" | "blueprint-cadastre";

export type DrawingScale = "1:200" | "1:100";

export interface BoundarySegment {
  startIndex: number;
  endIndex: number;
  lengthM: number;
  bearingStr: string; // e.g. "89°42'15\""
  type: "front" | "rear" | "left" | "right" | "truncation";
}

export interface CadastreParcel {
  lotNumber: string;
  planNumber: string;
  standardLotPlan: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  council: string;
  zoning: string;
  areaM2: number;
  frontageM: number;
  depthM: number;
  rearWidthM: number;
  shape: "rectangular" | "irregular" | "corner" | "battleaxe";
  latitude: number;
  longitude: number;
  isRegistered: boolean;
  boundaryCoordinates: [number, number][]; // [lat, lng] or local metre polygon [x, y]
  boundarySegments: BoundarySegment[];
  naturalFallM: number;
  slopeDirection: string;
  statutoryLandValuation?: number;
  valuationYear?: string;
}

export interface SetbackRules {
  councilName: string;
  zoningCode: string;
  lotCategory: "small-lot" | "standard-lot" | "acreage";
  frontSetback: number; // Minimum distance to front wall (m)
  garageSetback: number; // Minimum distance to garage door/wall (m)
  leftSetback: number; // Minimum distance to left wall (m)
  rightSetback: number; // Minimum distance to right wall (m)
  rearSetback: number; // Minimum distance to rear wall (m)
  btbSideSetback: number; // Built to boundary setback (typically 0.20m or 0.00m)
  eaveWidthM: number; // Hudson standard eave width (0.45m / 450mm)
  btbEaveWidthM: number; // Eave width on BTB garage side (0.00m)
  maxSiteCoverage: number; // Maximum allowable site coverage percentage (%)
  minPosM2: number; // Minimum Private Open Space (m²)
  presetName: string;
}

export interface HudsonDesignPreset {
  id: string;
  name: string;
  category: "single-storey" | "double-storey" | "acreage" | "duplex";
  bedrooms: number;
  bathrooms: number;
  cars: number;
  totalM2: number;
  widthM: number;
  lengthM: number;
  minLotFrontageM: number;
  garageSide: "left" | "right";
  hasBtbOption: boolean;
  rooms: {
    name: string;
    xPct: number; // percentage of width (0..100)
    yPct: number; // percentage of length (0..100)
    wPct: number;
    hPct: number;
  }[];
}

export interface SitedHouse {
  designId: string;
  designName: string;
  source: "hudson-catalog" | "custom-upload";
  totalM2: number;
  widthM: number;
  lengthM: number;
  posX: number; // X coordinate on lot coordinate space (metres from origin)
  posY: number; // Y coordinate on lot coordinate space (metres from origin)
  rotationDeg: number; // 0..360 degrees
  isMirrored: boolean; // LH vs RH garage flip
  isBtb: boolean;
  btbSide: "none" | "left" | "right";
  customPlanUrl?: string;
  customScalePxPerM?: number;
}

export interface LiveSetbacks {
  frontWallSetback: number;
  frontEaveSetback: number;
  garageWallSetback: number;
  garageEaveSetback: number;
  leftWallSetback: number;
  leftEaveSetback: number;
  rightWallSetback: number;
  rightEaveSetback: number;
  rearWallSetback: number;
  rearEaveSetback: number;
}

export interface ComplianceReport {
  siteCoveragePercent: number;
  maxSiteCoveragePercent: number;
  isSiteCoveragePassed: boolean;
  houseFootprintM2: number;
  lotAreaM2: number;
  privateOpenSpaceM2: number;
  minPosM2: number;
  isPosPassed: boolean;
  liveSetbacks: LiveSetbacks;
  isFrontCompliant: boolean;
  isGarageCompliant: boolean;
  isLeftCompliant: boolean;
  isRightCompliant: boolean;
  isRearCompliant: boolean;
  allCompliant: boolean;
  violations: string[];
}

export interface SolarAngles {
  morningWinterAzimuthDeg: number;
  middayWinterAzimuthDeg: number;
  afternoonWinterAzimuthDeg: number;
  orientationNotes: string;
}
