/**
 * Parametric Australian Hip Roof Generator
 * Builds high-fidelity 3D WebGL geometries for Colorbond and Tile hip roofs
 * with 450mm eaves overhang, 22.5° pitch, fascia boards, and quad gutters.
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

/**
 * Procedurally generates 3D Australian Hip Roof meshes.
 */
export function generateProceduralHipRoof(
  design: BuildingDesign3D,
  customConfig?: Partial<RoofConfig>
): RoofGeometryResult {
  const config: RoofConfig = {
    ...design.roof,
    ...customConfig,
  };

  const ceilingH = design.ceilingHeightM;
  const eavesOverhang = config.eavesOverhangM || 0.45;
  const pitchRad = ((config.pitchDeg || 22.5) * Math.PI) / 180;

  // 1. Calculate building perimeter bounding box
  let minX = 0;
  let maxX = design.widthM;
  let minZ = 0;
  let maxZ = design.lengthM;

  if (design.walls && design.walls.length > 0) {
    const xs = design.walls.flatMap((w) => [w.start[0], w.end[0]]);
    const zs = design.walls.flatMap((w) => [w.start[1], w.end[1]]);
    minX = Math.min(...xs);
    maxX = Math.max(...xs);
    minZ = Math.min(...zs);
    maxZ = Math.max(...zs);
  }

  // Eaves perimeter (bounding box + 450mm overhang)
  const eMinX = minX - eavesOverhang;
  const eMaxX = maxX + eavesOverhang;
  const eMinZ = minZ - eavesOverhang;
  const eMaxZ = maxZ + eavesOverhang;

  const width = eMaxX - eMinX;
  const length = eMaxZ - eMinZ;

  const eavesH = ceilingH + 0.12; // Wall top plate + truss seating
  const halfSpan = Math.min(width, length) / 2;
  const rise = halfSpan * Math.tan(pitchRad);
  const ridgeH = eavesH + rise;

  // 2. Ridge endpoints
  let r1: [number, number, number];
  let r2: [number, number, number];

  const centerX = (eMinX + eMaxX) / 2;
  const centerZ = (eMinZ + eMaxZ) / 2;

  if (length >= width) {
    // Ridge runs parallel to Z (front to back)
    const ridgeMinZ = eMinZ + halfSpan;
    const ridgeMaxZ = eMaxZ - halfSpan;
    r1 = [centerX, ridgeH, ridgeMinZ];
    r2 = [centerX, ridgeH, ridgeMaxZ];
  } else {
    // Ridge runs parallel to X (side to side)
    const ridgeMinX = eMinX + halfSpan;
    const ridgeMaxX = eMaxX - halfSpan;
    r1 = [ridgeMinX, ridgeH, centerZ];
    r2 = [ridgeMaxX, ridgeH, centerZ];
  }

  // 3. Eaves 4 Corners
  const cFL: [number, number, number] = [eMinX, eavesH, eMinZ]; // Front-Left
  const cFR: [number, number, number] = [eMaxX, eavesH, eMinZ]; // Front-Right
  const cRR: [number, number, number] = [eMaxX, eavesH, eMaxZ]; // Rear-Right
  const cRL: [number, number, number] = [eMinX, eavesH, eMaxZ]; // Rear-Left

  // 4. Construct 3D Roof Triangles & Quads (BufferGeometry)
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

  if (length >= width) {
    // 4 Facets for Z-parallel ridge:
    // Front Hip (Triangle): cFL, cFR, r1
    addTriangle(cFL, cFR, r1);
    // Rear Hip (Triangle): cRR, cRL, r2
    addTriangle(cRR, cRL, r2);
    // Right Slope (Trapezoid): cFR, cRR, r2, r1
    addQuad(cFR, cRR, r2, r1);
    // Left Slope (Trapezoid): cRL, cFL, r1, r2
    addQuad(cRL, cFL, r1, r2);
  } else {
    // 4 Facets for X-parallel ridge:
    // Left Hip (Triangle): cRL, cFL, r1
    addTriangle(cRL, cFL, r1);
    // Right Hip (Triangle): cFR, cRR, r2
    addTriangle(cFR, cRR, r2);
    // Front Slope (Trapezoid): cFL, cFR, r2, r1
    addQuad(cFL, cFR, r2, r1);
    // Rear Slope (Trapezoid): cRR, cRL, r1, r2
    addQuad(cRR, cRL, r1, r2);
  }

  const roofGeom = new THREE.BufferGeometry();
  roofGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  roofGeom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  roofGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  // Procedural corrugated Colorbond texture canvas
  let roofTexture: THREE.CanvasTexture | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = config.colorHex || "#2b2e35";
      ctx.fillRect(0, 0, 128, 128);
      // Fine Colorbond rib profile shadows
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
    roughness: 0.65,
    metalness: 0.25,
    side: THREE.DoubleSide,
    transparent: config.transparency > 0,
    opacity: 1.0 - (config.transparency || 0),
  });

  const roofMesh = new THREE.Mesh(roofGeom, roofMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  // 5. Fascia board band (180mm height around the eaves perimeter)
  const fasciaGeom = new THREE.BufferGeometry();
  const fasciaPositions: number[] = [];
  const fBottom = eavesH - 0.18;
  const fTop = eavesH;

  const fPts: [number, number][] = [
    [eMinX, eMinZ],
    [eMaxX, eMinZ],
    [eMaxX, eMaxZ],
    [eMinX, eMaxZ],
    [eMinX, eMinZ],
  ];

  for (let i = 0; i < 4; i++) {
    const pA = fPts[i];
    const pB = fPts[i + 1];
    // Quad from pA to pB between fBottom and fTop
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

  // 6. Colorbond Quad Gutter (slight outward extrusion hugging fascia top)
  const gutterGeom = new THREE.BufferGeometry();
  const gutterPositions: number[] = [];
  const gTop = eavesH + 0.05;
  const gBot = eavesH - 0.12;
  const gOffset = 0.04;

  const gPts: [number, number][] = [
    [eMinX - gOffset, eMinZ - gOffset],
    [eMaxX + gOffset, eMinZ - gOffset],
    [eMaxX + gOffset, eMaxZ + gOffset],
    [eMinX - gOffset, eMaxZ + gOffset],
    [eMinX - gOffset, eMinZ - gOffset],
  ];

  for (let i = 0; i < 4; i++) {
    const pA = gPts[i];
    const pB = gPts[i + 1];
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
    ridgeHeightM: ridgeH,
    eavesHeightM: eavesH,
    ridgeEndpoints: { p1: r1, p2: r2 },
  };
}
