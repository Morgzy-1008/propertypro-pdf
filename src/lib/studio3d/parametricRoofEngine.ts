/**
 * Parametric Australian Hip-and-Valley Roof Generator
 * Builds high-fidelity 3D WebGL geometries for Standard Hip-and-Valley Roofs
 * tailored to stepped residential floorplan footprints (including main body,
 * projecting front bedroom/garage/porch wings, and rear master/alfresco wings)
 * with 450mm eaves overhang, 22.5° pitch, hip/ridge capping, fascia boards, and quad gutters.
 */

import * as THREE from "three";
import { RoofConfig, BuildingDesign3D } from "./studio3dTypes";

export interface RoofGeometryResult {
  roofMesh: THREE.Mesh;
  fasciaMesh: THREE.Mesh;
  gutterMesh: THREE.Mesh;
  ridgeHeightM: number;
  eavesHeightM: number;
  ridgeEndpoints: {
    p1: [number, number, number];
    p2: [number, number, number];
  };
}

interface FootprintSpan {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * Extracts stepped horizontal footprint spans along the Z axis from rooms and exterior walls,
 * so the roof generator automatically tailors a multi-wing Hip-and-Valley roofline to any plan.
 */
function extractSteppedFootprintSpans(design: BuildingDesign3D): FootprintSpan[] {
  const sampleCount = 60;
  let globalMinX = 0;
  let globalMaxX = design.widthM;
  let globalMinZ = 0;
  let globalMaxZ = design.lengthM;

  if (design.walls && design.walls.length > 0) {
    const xs = design.walls.flatMap((w) => [w.start[0], w.end[0]]);
    const zs = design.walls.flatMap((w) => [w.start[1], w.end[1]]);
    globalMinX = Math.min(...xs);
    globalMaxX = Math.max(...xs);
    globalMinZ = Math.min(...zs);
    globalMaxZ = Math.max(...zs);
  }
  if (design.rooms && design.rooms.length > 0) {
    const rxs = design.rooms.flatMap((r) => r.polygon.map((p) => p[0]));
    const rzs = design.rooms.flatMap((r) => r.polygon.map((p) => p[1]));
    globalMinX = Math.min(globalMinX, ...rxs);
    globalMaxX = Math.max(globalMaxX, ...rxs);
    globalMinZ = Math.min(globalMinZ, ...rzs);
    globalMaxZ = Math.max(globalMaxZ, ...rzs);
  }

  const totalZ = Math.max(1, globalMaxZ - globalMinZ);
  const dz = totalZ / sampleCount;
  const rawSlices: FootprintSpan[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const zA = globalMinZ + i * dz;
    const zB = zA + dz;
    const zMid = (zA + zB) / 2;

    let sMinX = Infinity;
    let sMaxX = -Infinity;

    const useExactWallsOnlyForIndoors = Boolean(
      design.exactStructuralWalls && design.id !== "amber-21"
    );

    // 1. Check rooms covering zMid (for exact-wall vectorized designs, only outdoor roofed zones expand beyond exterior walls)
    for (const room of design.rooms || []) {
      if (
        useExactWallsOnlyForIndoors &&
        room.name !== "Alfresco" &&
        room.name !== "Porch"
      ) {
        continue;
      }
      const zs = room.polygon.map((p) => p[1]);
      const xs = room.polygon.map((p) => p[0]);
      const rMinZ = Math.min(...zs);
      const rMaxZ = Math.max(...zs);
      if (zMid >= rMinZ - 0.15 && zMid <= rMaxZ + 0.15) {
        sMinX = Math.min(sMinX, ...xs);
        sMaxX = Math.max(sMaxX, ...xs);
      }
    }

    // 2. Check all structural walls covering zMid (every wall in the house is under the roof!)
    for (const wall of design.walls || []) {
      const wMinZ = Math.min(wall.start[1], wall.end[1]);
      const wMaxZ = Math.max(wall.start[1], wall.end[1]);
      const halfT = (wall.thickness || 0.25) / 2;
      if (zMid >= wMinZ - 0.15 && zMid <= wMaxZ + 0.15) {
        sMinX = Math.min(sMinX, wall.start[0] - halfT, wall.end[0] - halfT);
        sMaxX = Math.max(sMaxX, wall.start[0] + halfT, wall.end[0] + halfT);
      }
    }

    // 3. Also check all openings covering zMid so windows/doors on vertical walls never indent the roof
    for (const op of design.openings || []) {
      const isVert = op.wallOrientation === "vertical";
      const halfSpan = (op.width || 1.2) / 2;
      const oMinZ = isVert ? op.position[1] - halfSpan : op.position[1] - 0.15;
      const oMaxZ = isVert ? op.position[1] + halfSpan : op.position[1] + 0.15;
      if (zMid >= oMinZ - 0.25 && zMid <= oMaxZ + 0.25) {
        sMinX = Math.min(sMinX, op.position[0] - 0.125);
        sMaxX = Math.max(sMaxX, op.position[0] + 0.125);
      }
    }

    if (sMinX < sMaxX) {
      rawSlices.push({ x0: sMinX, x1: sMaxX, z0: zA, z1: zB });
    }
  }

  if (rawSlices.length === 0) {
    return [{ x0: globalMinX, x1: globalMaxX, z0: globalMinZ, z1: globalMaxZ }];
  }

  // Merge adjacent slices with matching [x0, x1] within 0.35m tolerance
  const merged: FootprintSpan[] = [];
  for (const s of rawSlices) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      Math.abs(prev.x0 - s.x0) < 0.35 &&
      Math.abs(prev.x1 - s.x1) < 0.35
    ) {
      prev.x0 = Math.min(prev.x0, s.x0);
      prev.x1 = Math.max(prev.x1, s.x1);
      prev.z1 = s.z1;
    } else {
      merged.push({ ...s });
    }
  }

  // Filter out tiny sliver spans (< 0.8m in Z) by absorbing into neighbor
  const cleaned: FootprintSpan[] = [];
  for (let i = 0; i < merged.length; i++) {
    const cur = merged[i];
    if (cur.z1 - cur.z0 < 0.8 && cleaned.length > 0) {
      cleaned[cleaned.length - 1].z1 = cur.z1;
    } else {
      cleaned.push(cur);
    }
  }

  return cleaned;
}

/**
 * Procedurally generates 3D Standard Australian Hip-and-Valley Roof meshes
 * tailored to the stepped building footprint.
 */
export function generateProceduralHipRoof(
  design: BuildingDesign3D,
  customConfig?: Partial<RoofConfig>
): RoofGeometryResult {
  const config: RoofConfig = {
    ...design.roof,
    ...customConfig,
  };

  const ffl = 0.30; // Foundation slab top height
  const ceilingH = design.ceilingHeightM;
  const eavesOverhang = config.eavesOverhangM || 0.45;
  const pitchRad = ((config.pitchDeg || 22.5) * Math.PI) / 180;
  const eavesH = ffl + ceilingH + 0.04; // Sits directly on top of wall top plate

  // 1. Extract stepped footprint spans along Z
  const spans = extractSteppedFootprintSpans(design);
  const globalMinZ = spans[0].z0;
  const globalMaxZ = spans[spans.length - 1].z1;

  // Convert stepped spans into intersecting rectangular hip-roof wings.
  // Each wing extends inward into wider adjacent wings so its secondary hip ridge
  // terminates cleanly into the main roof slope to form true 45° valleys!
  const wings: FootprintSpan[] = spans.map((s) => {
    const spanW = s.x1 - s.x0;
    const embedDepth = Math.max(spanW * 0.85, 3.2);
    let wZ0 = s.z0;
    let wZ1 = s.z1;

    // Can we extend North (-Z) into a wider span that covers [s.x0, s.x1]?
    for (let j = 0; j < spans.length; j++) {
      const other = spans[j];
      if (other.z1 <= s.z0 + 0.05 && other.x0 <= s.x0 + 0.35 && other.x1 >= s.x1 - 0.35) {
        wZ0 = Math.max(other.z0, s.z0 - embedDepth);
      }
      if (other.z0 >= s.z1 - 0.05 && other.x0 <= s.x0 + 0.35 && other.x1 >= s.x1 - 0.35) {
        wZ1 = Math.min(other.z1, s.z1 + embedDepth);
      }
    }

    return {
      x0: s.x0 - eavesOverhang,
      x1: s.x1 + eavesOverhang,
      z0: wZ0 - eavesOverhang,
      z1: wZ1 + eavesOverhang,
    };
  });

  // Also ensure a primary full-length wing over the widest core span
  let widestSpan = spans[0];
  for (const s of spans) {
    if (s.x1 - s.x0 > widestSpan.x1 - widestSpan.x0) {
      widestSpan = s;
    }
  }

  // 2. Construct 3D Roof Facets + Hip/Ridge Capping for all wings
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  function addTriangle(
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) {
    const vA = new THREE.Vector3(...p1);
    const vB = new THREE.Vector3(...p2);
    const vC = new THREE.Vector3(...p3);
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();

    positions.push(...p1, ...p2, ...p3);
    normals.push(cb.x, cb.y, cb.z, cb.x, cb.y, cb.z, cb.x, cb.y, cb.z);
    uvs.push(p1[0], p1[2], p2[0], p2[2], p3[0], p3[2]);
  }

  function addQuad(
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    p4: [number, number, number]
  ) {
    addTriangle(p1, p2, p3);
    addTriangle(p1, p3, p4);
  }

  function addRidgeCapBar(pA: [number, number, number], pB: [number, number, number]) {
    const vA = new THREE.Vector3(...pA);
    const vB = new THREE.Vector3(...pB);
    const dir = new THREE.Vector3().subVectors(vB, vA);
    if (dir.length() < 0.05) return;
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.09);
    const lift = 0.032;

    const topA: [number, number, number] = [vA.x, vA.y + lift, vA.z];
    const topB: [number, number, number] = [vB.x, vB.y + lift, vB.z];
    const leftA: [number, number, number] = [vA.x + perp.x, vA.y - 0.01, vA.z + perp.z];
    const leftB: [number, number, number] = [vB.x + perp.x, vB.y - 0.01, vB.z + perp.z];
    const rightA: [number, number, number] = [vA.x - perp.x, vA.y - 0.01, vA.z - perp.z];
    const rightB: [number, number, number] = [vB.x - perp.x, vB.y - 0.01, vB.z - perp.z];

    addQuad(leftA, leftB, topB, topA);
    addQuad(topA, topB, rightB, rightA);
  }

  let maxRidgeH = eavesH;
  let mainR1: [number, number, number] = [design.widthM / 2, eavesH + 2.0, globalMinZ];
  let mainR2: [number, number, number] = [design.widthM / 2, eavesH + 2.0, globalMaxZ];

  for (const w of wings) {
    const eMinX = w.x0;
    const eMaxX = w.x1;
    const eMinZ = w.z0;
    const eMaxZ = w.z1;

    const width = eMaxX - eMinX;
    const length = eMaxZ - eMinZ;
    const halfSpan = Math.min(width, length) / 2;
    const rise = halfSpan * Math.tan(pitchRad);
    const ridgeH = eavesH + rise;

    const centerX = (eMinX + eMaxX) / 2;
    const centerZ = (eMinZ + eMaxZ) / 2;

    let r1: [number, number, number];
    let r2: [number, number, number];

    if (length >= width) {
      const ridgeMinZ = eMinZ + halfSpan;
      const ridgeMaxZ = eMaxZ - halfSpan;
      r1 = [centerX, ridgeH, ridgeMinZ];
      r2 = [centerX, ridgeH, ridgeMaxZ];
    } else {
      const ridgeMinX = eMinX + halfSpan;
      const ridgeMaxX = eMaxX - halfSpan;
      r1 = [ridgeMinX, ridgeH, centerZ];
      r2 = [ridgeMaxX, ridgeH, centerZ];
    }

    if (ridgeH >= maxRidgeH) {
      maxRidgeH = ridgeH;
      mainR1 = r1;
      mainR2 = r2;
    }

    const cFL: [number, number, number] = [eMinX, eavesH, eMinZ];
    const cFR: [number, number, number] = [eMaxX, eavesH, eMinZ];
    const cRR: [number, number, number] = [eMaxX, eavesH, eMaxZ];
    const cRL: [number, number, number] = [eMinX, eavesH, eMaxZ];

    if (length >= width) {
      addTriangle(cFL, cFR, r1);
      addTriangle(cRR, cRL, r2);
      addQuad(cFR, cRR, r2, r1);
      addQuad(cRL, cFL, r1, r2);
    } else {
      addTriangle(cRL, cFL, r1);
      addTriangle(cFR, cRR, r2);
      addQuad(cFL, cFR, r2, r1);
      addQuad(cRR, cRL, r1, r2);
    }

    // Add 3D Hip & Ridge Capping Bars along the 4 hips and central ridge of this wing
    addRidgeCapBar(r1, r2);
    if (length >= width) {
      addRidgeCapBar(cFL, r1);
      addRidgeCapBar(cFR, r1);
      addRidgeCapBar(cRL, r2);
      addRidgeCapBar(cRR, r2);
    } else {
      addRidgeCapBar(cFL, r1);
      addRidgeCapBar(cRL, r1);
      addRidgeCapBar(cFR, r2);
      addRidgeCapBar(cRR, r2);
    }
  }

  const roofGeom = new THREE.BufferGeometry();
  roofGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  roofGeom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  roofGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  // Procedural corrugated Colorbond / Tile texture canvas
  let roofTexture: THREE.CanvasTexture | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = config.colorHex || "#2b2e35";
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 128; i += 8) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(i, 0, 3, 128);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(i + 3, 0, 2, 128);
      }
    }
    roofTexture = new THREE.CanvasTexture(canvas);
    roofTexture.wrapS = THREE.RepeatWrapping;
    roofTexture.wrapT = THREE.RepeatWrapping;
    roofTexture.repeat.set(4, 4);
  }

  const roofMat = new THREE.MeshStandardMaterial({
    ...(roofTexture ? { map: roofTexture } : {}),
    color: new THREE.Color(config.colorHex || "#2b2e35"),
    roughness: 0.62,
    metalness: 0.25,
    side: THREE.DoubleSide,
    transparent: config.transparency > 0,
    opacity: 1.0 - (config.transparency || 0),
  });

  const roofMesh = new THREE.Mesh(roofGeom, roofMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  // 3. Build Stepped Eaves Perimeter Polygon (following the exact stepped building boundary!)
  const eavesLoop: [number, number][] = [];
  const eSpans = spans.map((s, idx) => ({
    x0: s.x0 - eavesOverhang,
    x1: s.x1 + eavesOverhang,
    z0: idx === 0 ? s.z0 - eavesOverhang : s.z0,
    z1: idx === spans.length - 1 ? s.z1 + eavesOverhang : s.z1,
  }));

  // Trace down Right side (North to South)
  for (let i = 0; i < eSpans.length; i++) {
    const s = eSpans[i];
    if (i === 0) {
      eavesLoop.push([s.x0, s.z0]);
      eavesLoop.push([s.x1, s.z0]);
    } else {
      const prev = eSpans[i - 1];
      const stepZ = s.x1 > prev.x1 ? s.z0 - eavesOverhang : s.z0 + eavesOverhang;
      eavesLoop.push([prev.x1, stepZ]);
      eavesLoop.push([s.x1, stepZ]);
    }
    if (i === eSpans.length - 1) {
      eavesLoop.push([s.x1, s.z1]);
    }
  }

  // Trace up Left side (South to North)
  for (let i = eSpans.length - 1; i >= 0; i--) {
    const s = eSpans[i];
    if (i === eSpans.length - 1) {
      eavesLoop.push([s.x0, s.z1]);
    } else {
      const next = eSpans[i + 1];
      const stepZ = s.x0 < next.x0 ? next.z0 + eavesOverhang : next.z0 - eavesOverhang;
      eavesLoop.push([next.x0, stepZ]);
      eavesLoop.push([s.x0, stepZ]);
    }
    if (i === 0) {
      eavesLoop.push([s.x0, s.z0]);
    }
  }

  // 4. Stepped Fascia Board Band (180mm height around stepped eaves perimeter)
  const fasciaGeom = new THREE.BufferGeometry();
  const fasciaPositions: number[] = [];
  const fBottom = eavesH - 0.18;
  const fTop = eavesH;

  for (let i = 0; i < eavesLoop.length - 1; i++) {
    const pA = eavesLoop[i];
    const pB = eavesLoop[i + 1];
    if (Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) < 0.01) continue;
    const v1: [number, number, number] = [pA[0], fBottom, pA[1]];
    const v2: [number, number, number] = [pB[0], fBottom, pB[1]];
    const v3: [number, number, number] = [pB[0], fTop, pB[1]];
    const v4: [number, number, number] = [pA[0], fTop, pA[1]];

    fasciaPositions.push(...v1, ...v2, ...v3);
    fasciaPositions.push(...v1, ...v3, ...v4);
  }

  fasciaGeom.setAttribute("position", new THREE.Float32BufferAttribute(fasciaPositions, 3));
  fasciaGeom.computeVertexNormals();

  const fasciaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.fasciaColorHex || "#dfe3e6"),
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const fasciaMesh = new THREE.Mesh(fasciaGeom, fasciaMat);

  // 5. Stepped Colorbond Quad Gutter
  const gutterGeom = new THREE.BufferGeometry();
  const gutterPositions: number[] = [];
  const gTop = eavesH + 0.04;
  const gBot = eavesH - 0.11;

  for (let i = 0; i < eavesLoop.length - 1; i++) {
    const pA = eavesLoop[i];
    const pB = eavesLoop[i + 1];
    if (Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) < 0.01) continue;
    const v1: [number, number, number] = [pA[0], gBot, pA[1]];
    const v2: [number, number, number] = [pB[0], gBot, pB[1]];
    const v3: [number, number, number] = [pB[0], gTop, pB[1]];
    const v4: [number, number, number] = [pA[0], gTop, pA[1]];

    gutterPositions.push(...v1, ...v2, ...v3);
    gutterPositions.push(...v1, ...v3, ...v4);
  }

  gutterGeom.setAttribute("position", new THREE.Float32BufferAttribute(gutterPositions, 3));
  gutterGeom.computeVertexNormals();

  const gutterMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.gutterColorHex || config.colorHex || "#2b2e35"),
    roughness: 0.4,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
  const gutterMesh = new THREE.Mesh(gutterGeom, gutterMat);

  return {
    roofMesh,
    fasciaMesh,
    gutterMesh,
    ridgeHeightM: maxRidgeH,
    eavesHeightM: eavesH,
    ridgeEndpoints: { p1: mainR1, p2: mainR2 },
  };
}
