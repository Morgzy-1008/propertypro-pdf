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

const EPSILON = 0.22; // 220mm tolerance so room inner faces (0.25m) coincide with 250mm wall centerlines (0.125m)

/**
 * Checks if two line segments overlap or coincide within architectural tolerance.
 * Accurately measures 1D overlap on the collinear line rather than just boundary proximity.
 */
export function isSegmentCoincident(
  s1Start: [number, number],
  s1End: [number, number],
  s2Start: [number, number],
  s2End: [number, number],
  customTol = EPSILON
): boolean {
  const dForward =
    pointDist(s1Start, s2Start) + pointDist(s1End, s2End);
  const dReverse =
    pointDist(s1Start, s2End) + pointDist(s1End, s2Start);

  if (dForward < customTol * 2 || dReverse < customTol * 2) {
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

  if (d1 < customTol && d2 < customTol) {
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
    // Requires significant overlap (at least 18cm or 50% of shorter segment)
    return overlapMeters >= 0.18 || overlapMeters >= minLen * 0.5;
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
 * Deduplicates and merges any overlapping or parallel-adjacent wall segments
 * so no design can ever have double/overlapping walls.
 */
export function deduplicateWallSegments(walls: WallSegment[]): WallSegment[] {
  if (!walls || walls.length <= 1) return walls || [];

  // Sort so exterior / thicker / longer walls win priority when deduplicating
  const sorted = [...walls].sort((a, b) => {
    if (a.isExterior !== b.isExterior) return a.isExterior ? -1 : 1;
    if (Math.abs(b.thickness - a.thickness) > 0.02) return b.thickness - a.thickness;
    return pointDist(b.start, b.end) - pointDist(a.start, a.end);
  });

  const kept: WallSegment[] = [];
  for (const w of sorted) {
    const len = pointDist(w.start, w.end);
    if (len < 0.12) continue;

    let mergedIntoExisting = false;
    for (let i = 0; i < kept.length; i++) {
      const k = kept[i];
      if ((k.level ?? 0) !== (w.level ?? 0)) continue;
      const tol = k.isExterior || w.isExterior ? 0.22 : 0.16;
      if (isSegmentCoincident(w.start, w.end, k.start, k.end, tol)) {
        // If w extends beyond k along the same axis, expand k's span to cover both cleanly
        const isHoriz = Math.abs(k.end[1] - k.start[1]) <= Math.abs(k.end[0] - k.start[0]);
        if (isHoriz) {
          const minX = Math.min(k.start[0], k.end[0], w.start[0], w.end[0]);
          const maxX = Math.max(k.start[0], k.end[0], w.start[0], w.end[0]);
          const y = k.start[1];
          kept[i] = { ...k, start: [minX, y], end: [maxX, y] };
        } else {
          const minY = Math.min(k.start[1], k.end[1], w.start[1], w.end[1]);
          const maxY = Math.max(k.start[1], k.end[1], w.start[1], w.end[1]);
          const x = k.start[0];
          kept[i] = { ...k, start: [x, minY], end: [x, maxY] };
        }
        mergedIntoExisting = true;
        break;
      }
    }

    if (!mergedIntoExisting) {
      kept.push(w);
    }
  }

  return kept;
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
    const rLevel = edge.room.level ?? 0;
    const key = `L${rLevel}_${canonicalSegmentKey(edge.start, edge.end)}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const s = edge.start;
    const e = edge.end;

    // Check if already covered by an existing or previously derived wall on the same level
    const alreadyCovered = allCurrentWalls.some(
      (w) =>
        (w.level ?? 0) === rLevel &&
        isSegmentCoincident(s, e, w.start, w.end, w.isExterior ? 0.22 : 0.16)
    );

    if (alreadyCovered) {
      return;
    }

    // Find all rooms on the same level that border this edge
    const neighborRooms = rooms.filter((r) => {
      if ((r.level ?? 0) !== rLevel) return false;
      if (!r.polygon || r.polygon.length < 3) return false;
      for (let i = 0; i < r.polygon.length; i++) {
        const p1 = r.polygon[i];
        const p2 = r.polygon[(i + 1) % r.polygon.length];
        if (isSegmentCoincident(s, e, p1, p2, 0.12)) return true;
      }
      return false;
    });

    const isShared = neighborRooms.length > 1;
    const isPerimeter = !isShared;

    const isOutdoorRoom =
      edge.room.name === "Porch" ||
      edge.room.name === "Alfresco" ||
      edge.room.name === "Balcony";
    const bordersOutdoorRoom = neighborRooms.some(
      (r) => r.name === "Porch" || r.name === "Alfresco" || r.name === "Balcony"
    );

    // Outdoor perimeter edges (e.g. open sides of Porch/Alfresco/Balcony) do not need solid walls
    if (isOutdoorRoom && isPerimeter) {
      return;
    }

    // Wall thickness & properties:
    // - 0.25m (250mm) for exterior envelope and outdoor boundaries
    // - 0.09m (90mm) for standard Australian residential interior timber stud partitions (including painted internal garage walls)
    const isExteriorBarrier = isPerimeter || (bordersOutdoorRoom && !isOutdoorRoom);
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
      level: rLevel,
      elevationOffsetM: edge.room.elevationOffsetM ?? 0,
    };

    allCurrentWalls.push(newWall);
    derivedWalls.push(newWall);
  });

  return derivedWalls;
}

/**
 * Performs orthogonal rectification (< 4 deg tolerance), corner vertex welding (within 0.25m),
 * wall deduplication, and binds every Opening3D onto a parent `wallId` with a normalized
 * `positionAlongWallRatio` (0.0..1.0) so doors and windows never float away from walls.
 */
export function cleanAndSnapWallGraph(
  rawWalls: WallSegment[],
  rawOpenings: Opening3D[],
  widthM = 12.0,
  lengthM = 20.0
): { walls: WallSegment[]; openings: Opening3D[] } {
  // 1. Orthogonal rectification (< 4° ≈ tan(4°) = 0.07)
  const orthoWalls: WallSegment[] = (rawWalls || []).map((w) => {
    const dx = w.end[0] - w.start[0];
    const dz = w.end[1] - w.start[1];
    const len = Math.hypot(dx, dz);
    if (len > 0.1) {
      if (Math.abs(dz) / len < 0.07) {
        const z = Number(((w.start[1] + w.end[1]) / 2).toFixed(3));
        const x1 = Number(Math.min(w.start[0], w.end[0]).toFixed(3));
        const x2 = Number(Math.max(w.start[0], w.end[0]).toFixed(3));
        return { ...w, start: [x1, z], end: [x2, z] };
      }
      if (Math.abs(dx) / len < 0.07) {
        const x = Number(((w.start[0] + w.end[0]) / 2).toFixed(3));
        const z1 = Number(Math.min(w.start[1], w.end[1]).toFixed(3));
        const z2 = Number(Math.max(w.start[1], w.end[1]).toFixed(3));
        return { ...w, start: [x, z1], end: [x, z2] };
      }
    }
    return { ...w, start: [...w.start], end: [...w.end] };
  });

  // 2. Deduplicate collinear/overlapping segments
  const walls = deduplicateWallSegments(orthoWalls).map((w) => ({
    ...w,
    start: [...w.start] as [number, number],
    end: [...w.end] as [number, number],
    thickness: w.isExterior ? Math.max(0.24, w.thickness || 0.25) : 0.09,
  }));

  // 3. Weld orthogonal corner endpoints within 0.25m on the same level so corners meet cleanly
  const weldTol = 0.25;
  for (const w of walls) {
    const lvl = w.level ?? 0;
    const isHoriz = Math.abs(w.end[1] - w.start[1]) <= Math.abs(w.end[0] - w.start[0]);
    if (isHoriz) {
      const z = w.start[1];
      for (const other of walls) {
        if (other === w || (other.level ?? 0) !== lvl) continue;
        const otherVert = Math.abs(other.end[0] - other.start[0]) < Math.abs(other.end[1] - other.start[1]);
        if (!otherVert) continue;
        const ox = other.start[0];
        const minOZ = Math.min(other.start[1], other.end[1]) - weldTol;
        const maxOZ = Math.max(other.start[1], other.end[1]) + weldTol;
        if (z >= minOZ && z <= maxOZ) {
          if (Math.abs(w.start[0] - ox) <= weldTol && Math.abs(w.start[0] - ox) > 0.001) {
            w.start[0] = ox;
          }
          if (Math.abs(w.end[0] - ox) <= weldTol && Math.abs(w.end[0] - ox) > 0.001) {
            w.end[0] = ox;
          }
        }
      }
    } else {
      const x = w.start[0];
      for (const other of walls) {
        if (other === w || (other.level ?? 0) !== lvl) continue;
        const otherHoriz = Math.abs(other.end[1] - other.start[1]) <= Math.abs(other.end[0] - other.start[0]);
        if (!otherHoriz) continue;
        const oz = other.start[1];
        const minOX = Math.min(other.start[0], other.end[0]) - weldTol;
        const maxOX = Math.max(other.start[0], other.end[0]) + weldTol;
        if (x >= minOX && x <= maxOX) {
          if (Math.abs(w.start[1] - oz) <= weldTol && Math.abs(w.start[1] - oz) > 0.001) {
            w.start[1] = oz;
          }
          if (Math.abs(w.end[1] - oz) <= weldTol && Math.abs(w.end[1] - oz) > 0.001) {
            w.end[1] = oz;
          }
        }
      }
    }
  }

  // 4. Bind every Opening3D to a hosted WallSegment (`wallId` + `positionAlongWallRatio: 0..1`)
  // Drop any orphan opening that fails to anchor to a valid structural wall, and deduplicate overlapping openings on the same wall.
  const projectedOpenings: Opening3D[] = [];
  for (const rawOp of rawOpenings || []) {
    const anchored = projectOpeningOntoHostWall(rawOp, walls, widthM, lengthM);
    if (!anchored) continue;
    projectedOpenings.push(anchored);
  }

  // Deduplicate openings that overlap on the same host wall
  const openingPriority = (t: Opening3D["type"]): number => {
    if (t === "garage_door") return 6;
    if (t === "stacker_door" || t === "sliding_door") return 5;
    if (t === "door" || t === "barn_door") return 4;
    if (t === "cavity_slider") return 3;
    return 2; // window
  };

  const sortedOpenings = [...projectedOpenings].sort(
    (a, b) => openingPriority(b.type) - openingPriority(a.type) || b.width - a.width
  );
  const openings: Opening3D[] = [];
  for (const op of sortedOpenings) {
    const conflicts = openings.some((existing) => {
      if ((existing.level ?? 0) !== (op.level ?? 0)) return false;
      if (existing.wallId && op.wallId && existing.wallId === op.wallId) {
        const dist = pointDist(existing.position, op.position);
        return dist < (existing.width + op.width) / 2 + 0.08;
      }
      if (existing.wallOrientation === op.wallOrientation) {
        const dist = pointDist(existing.position, op.position);
        return dist < Math.min(existing.width, op.width) * 0.65;
      }
      return false;
    });
    if (!conflicts) {
      openings.push(op);
    }
  }

  return { walls, openings };
}

/**
 * Anchors an Opening3D onto its parent WallSegment (or finds the closest matching wall segment
 * on the same level) and computes `wallId`, `positionAlongWallRatio` (0.0..1.0), and world position.
 * Returns null if no valid host wall exists so floating/misplaced openings are eliminated.
 */
export function projectOpeningOntoHostWall(
  op: Opening3D,
  walls: WallSegment[],
  widthM = 12.0,
  lengthM = 20.0
): Opening3D | null {
  const opLevel = op.level ?? 0;
  const requiresExteriorWall =
    op.type === "window" ||
    op.type === "garage_door" ||
    op.type === "sliding_door" ||
    op.type === "stacker_door";

  let hostWall: WallSegment | undefined = op.wallId
    ? walls.find(
        (w) =>
          w.id === op.wallId &&
          (w.level ?? 0) === opLevel &&
          (!requiresExteriorWall || w.isExterior)
      )
    : undefined;

  if (!hostWall) {
    let bestScore = Infinity;
    for (const w of walls) {
      if ((w.level ?? 0) !== opLevel) continue;
      if (requiresExteriorWall && !w.isExterior) continue;
      const isHoriz = Math.abs(w.end[1] - w.start[1]) <= Math.abs(w.end[0] - w.start[0]);
      const orientMatch = op.wallOrientation
        ? (op.wallOrientation === "horizontal") === isHoriz
        : true;
      if (requiresExteriorWall && !orientMatch) continue;
      const d = distPointToLine(op.position, w.start, w.end);
      const score = d + (orientMatch ? 0 : 0.45) + (op.isExterior === w.isExterior ? 0 : 0.25);
      if (d <= 0.36 && score < bestScore) {
        bestScore = score;
        hostWall = w;
      }
    }
  }

  if (!hostWall) {
    return null;
  }

  const isHoriz = Math.abs(hostWall.end[1] - hostWall.start[1]) <= Math.abs(hostWall.end[0] - hostWall.start[0]);
  let effectiveWidth = op.width || 0.82;
  const minPier = 0.08;

  // Ensure hostWall spans wide enough to host this opening if it's within 0.45m of the wall end
  if (isHoriz) {
    const minX = Math.min(hostWall.start[0], hostWall.end[0]);
    const maxX = Math.max(hostWall.start[0], hostWall.end[0]);
    const halfW = effectiveWidth / 2;
    const reqMin = Math.max(0, Number((op.position[0] - halfW - minPier).toFixed(3)));
    const reqMax = Math.min(widthM, Number((op.position[0] + halfW + minPier).toFixed(3)));
    if (reqMin < minX && minX - reqMin <= 0.45) {
      if (hostWall.start[0] <= hostWall.end[0]) hostWall.start[0] = reqMin;
      else hostWall.end[0] = reqMin;
    }
    if (reqMax > maxX && reqMax - maxX <= 0.45) {
      if (hostWall.end[0] >= hostWall.start[0]) hostWall.end[0] = reqMax;
      else hostWall.start[0] = reqMax;
    }
  } else {
    const minZ = Math.min(hostWall.start[1], hostWall.end[1]);
    const maxZ = Math.max(hostWall.start[1], hostWall.end[1]);
    const halfW = effectiveWidth / 2;
    const reqMin = Math.max(0, Number((op.position[1] - halfW - minPier).toFixed(3)));
    const reqMax = Math.min(lengthM, Number((op.position[1] + halfW + minPier).toFixed(3)));
    if (reqMin < minZ && minZ - reqMin <= 0.45) {
      if (hostWall.start[1] <= hostWall.end[1]) hostWall.start[1] = reqMin;
      else hostWall.end[1] = reqMin;
    }
    if (reqMax > maxZ && reqMax - maxZ <= 0.45) {
      if (hostWall.end[1] >= hostWall.start[1]) hostWall.end[1] = reqMax;
      else hostWall.start[1] = reqMax;
    }
  }

  const wallLen = Math.max(0.1, pointDist(hostWall.start, hostWall.end));
  if (wallLen < 0.55) {
    return null;
  }
  if (effectiveWidth > wallLen - minPier * 2) {
    effectiveWidth = Number(Math.max(0.42, wallLen - minPier * 2).toFixed(2));
  }

  const halfW = effectiveWidth / 2;
  const rawT = projectPointOnLine(op.position, hostWall.start, hostWall.end);
  const marginT = Math.min(0.48, (halfW + minPier * 0.75) / wallLen);
  const clampedT = Math.max(marginT, Math.min(1 - marginT, rawT));

  const newX = Number((hostWall.start[0] + clampedT * (hostWall.end[0] - hostWall.start[0])).toFixed(3));
  const newZ = Number((hostWall.start[1] + clampedT * (hostWall.end[1] - hostWall.start[1])).toFixed(3));
  const dx = newX - op.position[0];
  const dz = newZ - op.position[1];

  return {
    ...op,
    width: effectiveWidth,
    wallId: hostWall.id,
    isExterior: hostWall.isExterior,
    positionAlongWallRatio: Number(clampedT.toFixed(4)),
    wallOrientation: isHoriz ? "horizontal" : "vertical",
    position: [newX, newZ],
    hingePoint: op.hingePoint
      ? [Number((op.hingePoint[0] + dx).toFixed(3)), Number((op.hingePoint[1] + dz).toFixed(3))]
      : undefined,
    closedPoint: op.closedPoint
      ? [Number((op.closedPoint[0] + dx).toFixed(3)), Number((op.closedPoint[1] + dz).toFixed(3))]
      : undefined,
    openPoint: op.openPoint
      ? [Number((op.openPoint[0] + dx).toFixed(3)), Number((op.openPoint[1] + dz).toFixed(3))]
      : undefined,
    bifoldPeak: op.bifoldPeak
      ? [Number((op.bifoldPeak[0] + dx).toFixed(3)), Number((op.bifoldPeak[1] + dz).toFixed(3))]
      : undefined,
  };
}

/**
 * Ensures a BuildingDesign3D has a 100% complete, fully-scaled internal wall network
 * with zero overlapping or duplicate walls and all openings anchored to host walls.
 */
export function ensureCompleteWallNetwork(design: BuildingDesign3D): BuildingDesign3D {
  if (!design || !design.rooms) return design;
  if (design.exactStructuralWalls) {
    const snapped = cleanAndSnapWallGraph(
      design.walls || [],
      design.openings || [],
      design.widthM || 14.8,
      design.lengthM || 16.62
    );
    return {
      ...design,
      walls: snapped.walls,
      openings: snapped.openings,
    };
  }

  const currentWalls = deduplicateWallSegments([...(design.walls || [])]);
  const derived = deriveInternalWallsFromRooms(
    design.rooms,
    currentWalls,
    design.ceilingHeightM || 2.59,
    design.widthM || 14.8,
    design.lengthM || 16.62
  );

  const snapped = cleanAndSnapWallGraph(
    [...currentWalls, ...derived],
    design.openings || [],
    design.widthM || 14.8,
    design.lengthM || 16.62
  );

  return {
    ...design,
    walls: snapped.walls,
    openings: snapped.openings,
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

