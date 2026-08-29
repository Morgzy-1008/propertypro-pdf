export interface Point2D {
  x: number;
  y: number;
}

export interface BoundarySegment {
  id: string;
  type: "front" | "rear" | "left" | "right" | "splay" | "custom";
  name: string;
  start: Point2D;
  end: Point2D;
  lengthM: number;
}

export interface LotPolygon {
  vertices: Point2D[];
  frontageM: number;
  depthM: number;
  totalAreaM2: number;
  isCustomPolygon: boolean;
  segments: BoundarySegment[];
}

export interface SitedHouseState {
  designName: string;
  widthM: number;
  lengthM: number;
  totalM2: number;
  centerX: number;
  centerY: number;
  rotationDeg: number;
  isFlipped: boolean;
  garageSide: "LHS" | "RHS";
  isBtbActive: boolean;
  hasDriveway: boolean;
  drivewayWidthM: number;
}

export interface LiveSetbacks {
  frontSetbackM: number;
  garageSetbackM: number;
  rearSetbackM: number;
  leftSetbackM: number;
  rightSetbackM: number;
  minSetbackM: number;
  siteCoveragePct: number;
  privateOpenSpaceM2: number;
  isCompliant: boolean;
}

export function distanceBetween(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function calculatePolygonAreaM2(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function createStandardLotPolygon(frontageM: number, depthM: number): LotPolygon {
  const vertices: Point2D[] = [
    { x: 0, y: 0 },
    { x: frontageM, y: 0 },
    { x: frontageM, y: depthM },
    { x: 0, y: depthM },
  ];

  const segments: BoundarySegment[] = [
    { id: "rear", type: "rear", name: "Rear Boundary (" + frontageM.toFixed(1) + "m)", start: vertices[0], end: vertices[1], lengthM: frontageM },
    { id: "right", type: "right", name: "Right Boundary (" + depthM.toFixed(1) + "m)", start: vertices[1], end: vertices[2], lengthM: depthM },
    { id: "front", type: "front", name: "Street Frontage (" + frontageM.toFixed(1) + "m)", start: vertices[2], end: vertices[3], lengthM: frontageM },
    { id: "left", type: "left", name: "Left Boundary (" + depthM.toFixed(1) + "m)", start: vertices[3], end: vertices[0], lengthM: depthM },
  ];

  return {
    vertices,
    frontageM,
    depthM,
    totalAreaM2: frontageM * depthM,
    isCustomPolygon: false,
    segments,
  };
}

export function getHouseCornerVertices(house: SitedHouseState): Point2D[] {
  const halfW = house.widthM / 2;
  const halfL = house.lengthM / 2;
  const rad = (house.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners: Point2D[] = [
    { x: -halfW, y: -halfL },
    { x: halfW, y: -halfL },
    { x: halfW, y: halfL },
    { x: -halfW, y: halfL },
  ];

  return localCorners.map((pt) => ({
    x: house.centerX + pt.x * cos - pt.y * sin,
    y: house.centerY + pt.x * sin + pt.y * cos,
  }));
}

export function distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distanceBetween(p, a);

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const proj: Point2D = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return distanceBetween(p, proj);
}

export function distancePolygonToSegment(houseCorners: Point2D[], a: Point2D, b: Point2D): number {
  let minD = Infinity;
  for (const c of houseCorners) {
    const d = distancePointToSegment(c, a, b);
    if (d < minD) minD = d;
  }
  return minD;
}

export function calculateLiveSetbacks(
  lot: LotPolygon,
  house: SitedHouseState,
  maxAllowableCoveragePct = 60
): LiveSetbacks {
  const houseCorners = getHouseCornerVertices(house);
  const houseFootprintM2 = house.widthM * house.lengthM;

  let frontSetbackM = 4.5;
  let rearSetbackM = 3.0;
  let leftSetbackM = 1.2;
  let rightSetbackM = 1.2;

  for (const seg of lot.segments) {
    const d = distancePolygonToSegment(houseCorners, seg.start, seg.end);
    if (seg.type === "front") frontSetbackM = d;
    else if (seg.type === "rear") rearSetbackM = d;
    else if (seg.type === "left") leftSetbackM = d;
    else if (seg.type === "right") rightSetbackM = d;
  }

  if (house.isBtbActive) {
    if (house.garageSide === "RHS") {
      rightSetbackM = 0.2;
    } else {
      leftSetbackM = 0.2;
    }
  }

  const garageSetbackM = Math.max(frontSetbackM + 0.5, 5.0);
  const siteCoveragePct = Math.round((houseFootprintM2 / Math.max(1, lot.totalAreaM2)) * 1000) / 10;
  const privateOpenSpaceM2 = Math.max(0, Math.round((lot.totalAreaM2 - houseFootprintM2 - 40) * 10) / 10);
  const isCompliant = siteCoveragePct <= maxAllowableCoveragePct && frontSetbackM >= 3.0 && leftSetbackM >= 0.9 && rightSetbackM >= 0.9;

  return {
    frontSetbackM: Math.round(frontSetbackM * 100) / 100,
    garageSetbackM: Math.round(garageSetbackM * 100) / 100,
    rearSetbackM: Math.round(rearSetbackM * 100) / 100,
    leftSetbackM: Math.round(leftSetbackM * 100) / 100,
    rightSetbackM: Math.round(rightSetbackM * 100) / 100,
    minSetbackM: Math.min(frontSetbackM, rearSetbackM, leftSetbackM, rightSetbackM),
    siteCoveragePct,
    privateOpenSpaceM2,
    isCompliant,
  };
}
