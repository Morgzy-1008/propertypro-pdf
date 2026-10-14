/**
 * Architectural Wall Network & Scale Recognition Engine
 * 
 * Automatically analyzes room polygons, structural partitions, and boundary edges
 * to ensure that ALL internal walls are completely recognized, scaled, and constructed
 * in true 3D (90mm internal stud partitions, 250mm garage/external barriers).
 * Seamlessly integrates with the modified floorplan engine and CAD area schedules.
 */

import {
  BuildingDesign3D,
  Room3D,
  WallSegment,
  Opening3D,
} from "./studio3dTypes";

const EPSILON = 0.08; // 80mm tolerance for coordinate matching

/**
 * Checks if two line segments overlap or coincide within architectural tolerance.
 * Accurately measures 1D overlap on the collinear line rather than just boundary proximity.
 */
export function isSegmentCoincident(
  s1Start: [number, number],
  s1End: [number, number],
  s2Start: [number, number],
  s2End: [number, number]
): boolean {
  const dForward =
    pointDist(s1Start, s2Start) + pointDist(s1End, s2End);
  const dReverse =
    pointDist(s1Start, s2End) + pointDist(s1End, s2Start);

  if (dForward < EPSILON * 2 || dReverse < EPSILON * 2) {
    return true;
  }

  const len1 = pointDist(s1Start, s1End);
  const len2 = pointDist(s2Start, s2End);
  if (len1 < 0.1 || len2 < 0.1) return false;

  // Vector angles
  const a1 = Math.atan2(s1End[1] - s1Start[1], s1End[0] - s1Start[0]);
  const a2 = Math.atan2(s2End[1] - s2Start[1], s2End[0] - s2Start[0]);
  const diffAngle = Math.abs(normalizeAngle(a1 - a2));
  const isParallel = diffAngle < 0.08 || Math.abs(diffAngle - Math.PI) < 0.08;

  if (!isParallel) return false;

  // Distance from both points of s1 to infinite line of s2
  const d1 = distPointToLine(s1Start, s2Start, s2End);
  const d2 = distPointToLine(s1End, s2Start, s2End);

  if (d1 < EPSILON && d2 < EPSILON) {
    // Check projection overlap along s2
    const tStart = projectPointOnLine(s1Start, s2Start, s2End);
    const tEnd = projectPointOnLine(s1End, s2Start, s2End);
    const minT = Math.min(tStart, tEnd);
    const maxT = Math.max(tStart, tEnd);

    // Overlap interval of [minT, maxT] with [0, 1] on s2
    const overlapStart = Math.max(0, minT);
    const overlapEnd = Math.min(1, maxT);
    const overlapFraction = overlapEnd - overlapStart;

    if (overlapFraction <= 0.02) {
      return false; // Zero or negligible touching at end point
    }

    const overlapMeters = overlapFraction * len2;
    const minLen = Math.min(len1, len2);
    // Requires significant overlap (at least 20cm or 60% of shorter segment)
    return overlapMeters >= 0.20 || overlapMeters >= minLen * 0.6;
  }

  return false;
}

function pointDist(p1: [number, number], p2: [number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeAngle(rad: number): number {
  let a = rad % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function distPointToLine(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  if (l2 === 0) return pointDist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2));
  const proj: [number, number] = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return pointDist(p, proj);
}

function projectPointOnLine(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  if (l2 === 0) return 0;
  return ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
}

/**
 * Normalizes a segment so that its coordinates are ordered deterministically.
 */
function canonicalSegmentKey(p1: [number, number], p2: [number, number]): string {
  const [x1, y1] = [Math.round(p1[0] * 100) / 100, Math.round(p1[1] * 100) / 100];
  const [x2, y2] = [Math.round(p2[0] * 100) / 100, Math.round(p2[1] * 100) / 100];
  if (x1 < x2 || (x1 === x2 && y1 <= y2)) {
    return `${x1},${y1}-${x2},${y2}`;
  }
  return `${x2},${y2}-${x1},${y1}`;
}

/**
 * Algorithmically derives all internal partition walls from room boundary polygons
 * where an explicit wall was not already supplied.
 * Guarantees no duplicate overlapping walls and enforces 90mm stud scale.
 */
export function deriveInternalWallsFromRooms(
  rooms: Room3D[],
  existingWalls: WallSegment[],
  ceilingHeightM: number,
  buildingWidthM: number,
  buildingLengthM: number
): WallSegment[] {
  const derivedWalls: WallSegment[] = [];
  const processedKeys = new Set<string>();
  const allCurrentWalls = [...existingWalls];

  // Collect all edges from all rooms
  const edges: {
    start: [number, number];
    end: [number, number];
    room: Room3D;
    length: number;
  }[] = [];

  rooms.forEach((room) => {
    const poly = room.polygon;
    if (!poly || poly.length < 3) return;

    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const len = pointDist(p1, p2);
      if (len >= 0.25) {
        edges.push({ start: p1, end: p2, room, length: len });
      }
    }
  });

  edges.forEach((edge, idx) => {
    const key = canonicalSegmentKey(edge.start, edge.end);
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const s = edge.start;
    const e = edge.end;

    // Check if already covered by an existing or previously derived wall
    const alreadyCovered = allCurrentWalls.some((w) =>
      isSegmentCoincident(s, e, w.start, w.end)
    );

    if (alreadyCovered) {
      return;
    }

    // Find all rooms that border this edge
    const neighborRooms = rooms.filter((r) => {
      if (!r.polygon || r.polygon.length < 3) return false;
      for (let i = 0; i < r.polygon.length; i++) {
        const p1 = r.polygon[i];
        const p2 = r.polygon[(i + 1) % r.polygon.length];
        if (isSegmentCoincident(s, e, p1, p2)) return true;
      }
      return false;
    });

    const isShared = neighborRooms.length > 1;
    const isPerimeter = !isShared;

    const isOutdoorRoom = edge.room.name === "Porch" || edge.room.name === "Alfresco";
    const bordersOutdoorRoom = neighborRooms.some((r) => r.name === "Porch" || r.name === "Alfresco");
    const bordersGarage = neighborRooms.some((r) => r.name === "Garage");

    // Outdoor perimeter edges (e.g. open sides of Porch/Alfresco) do not need solid walls
    if (isOutdoorRoom && isPerimeter) {
      return;
    }

    // Wall thickness & properties:
    // - 0.25m (250mm) for exterior envelope and garage separation barriers
    // - 0.09m (90mm) for standard Australian residential interior timber stud partitions
    const isExteriorBarrier = isPerimeter || bordersGarage || (bordersOutdoorRoom && !isOutdoorRoom);
    const thickness = isExteriorBarrier ? 0.25 : 0.09;
    const material = isExteriorBarrier ? "brick_austral" : "plaster_white";

    const newWall: WallSegment = {
      id: `derived_int_${edge.room.id}_${idx}`,
      start: [Number(s[0].toFixed(2)), Number(s[1].toFixed(2))],
      end: [Number(e[0].toFixed(2)), Number(e[1].toFixed(2))],
      thickness,
      height: edge.room.ceilingHeight || ceilingHeightM,
      isExterior: isExteriorBarrier,
      material,
    };

    allCurrentWalls.push(newWall);
    derivedWalls.push(newWall);
  });

  return derivedWalls;
}

/**
 * Ensures a BuildingDesign3D has a 100% complete, fully-scaled internal wall network.
 * If any internal walls separating bedrooms, bathrooms, hallways, or living spaces
 * are missing, this function algorithmically populates them with millimeter precision.
 */
export function ensureCompleteWallNetwork(design: BuildingDesign3D): BuildingDesign3D {
  if (!design || !design.rooms) return design;
  if (design.exactStructuralWalls) {
    return design;
  }

  const currentWalls = [...(design.walls || [])];
  const derived = deriveInternalWallsFromRooms(
    design.rooms,
    currentWalls,
    design.ceilingHeightM || 2.59,
    design.widthM || 14.8,
    design.lengthM || 16.62
  );

  if (derived.length === 0) {
    return design;
  }

  return {
    ...design,
    walls: [...currentWalls, ...derived],
  };
}

/**
 * Calculates wall network metrics (linear meters of 90mm internal stud walls,
 * 250mm perimeter face brick masonry, and 90mm dashed open hampers)
 * for structural validation and CAD reporting.
 */
export function calculateWallNetworkMetrics(design: BuildingDesign3D): {
  internalWallLinearM: number;
  externalWallLinearM: number;
  openHamperLinearM: number;
  internalWallCount: number;
  externalWallCount: number;
  openHamperCount: number;
  totalWallCount: number;
  roomCount: number;
} {
  const completeDesign = ensureCompleteWallNetwork(design);
  const walls = completeDesign.walls || [];
  const hampers = completeDesign.openHampers || [];

  let internalM = 0;
  let externalM = 0;
  let internalCount = 0;
  let externalCount = 0;
  let hamperM = 0;

  walls.forEach((w) => {
    const len = pointDist(w.start, w.end);
    if (w.isExterior) {
      externalM += len;
      externalCount++;
    } else {
      internalM += len;
      internalCount++;
    }
  });

  hampers.forEach((h) => {
    hamperM += pointDist(h.start, h.end);
  });

  return {
    internalWallLinearM: Number(internalM.toFixed(2)),
    externalWallLinearM: Number(externalM.toFixed(2)),
    openHamperLinearM: Number(hamperM.toFixed(2)),
    internalWallCount: internalCount,
    externalWallCount: externalCount,
    openHamperCount: hampers.length,
    totalWallCount: walls.length,
    roomCount: completeDesign.rooms?.length || 0,
  };
}
