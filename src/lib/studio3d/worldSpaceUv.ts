/**
 * World-Space Box / Triplanar UV Mapping Utility
 * Calculates UV coordinates based on real-world vertex dimensions in meters
 * using face/vertex normals so textures never stretch across short vs. long
 * architectural walls, floors, roofs, or joinery surfaces.
 */

import * as THREE from "three";

/**
 * Applies world-space box-projected UV coordinates to a BufferGeometry.
 * A 10-meter wall and a 2-meter wall will display bricks, timber battens,
 * tiles, or floorboards at the exact same physical scale (`textureScaleMeters`).
 *
 * @param geometry The THREE.BufferGeometry to update in-place
 * @param textureScaleMeters Physical repeat size in meters (e.g. 1.5m)
 * @param meshScale Optional local mesh scale vector if geometry is unit-sized
 */
export function applyWorldSpaceUVs(
  geometry: THREE.BufferGeometry,
  textureScaleMeters: number,
  meshScale?: THREE.Vector3
): THREE.BufferGeometry {
  const scale = Math.max(0.05, textureScaleMeters || 1.5);
  const posAttr = geometry.getAttribute("position");
  if (!posAttr) return geometry;

  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }
  const normAttr = geometry.getAttribute("normal");
  if (!normAttr) return geometry;

  const sx = meshScale ? meshScale.x : 1;
  const sy = meshScale ? meshScale.y : 1;
  const sz = meshScale ? meshScale.z : 1;

  const count = posAttr.count;
  const uvs = new Float32Array(count * 2);

  // If geometry is indexed, compute per-vertex UVs using vertex normal dominant axis
  // (BoxGeometry, PlaneGeometry, ExtrudeGeometry, and custom BufferGeometries all have clean per-face vertex normals)
  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i) * sx;
    const vy = posAttr.getY(i) * sy;
    const vz = posAttr.getZ(i) * sz;

    const nx = Math.abs(normAttr.getX(i));
    const ny = Math.abs(normAttr.getY(i));
    const nz = Math.abs(normAttr.getZ(i));

    let u = 0;
    let v = 0;

    if (ny >= nx && ny >= nz) {
      // Horizontal or near-horizontal surface (floors, ceilings, benchtops, driveways, low-pitch roofs)
      u = vx / scale;
      v = vz / scale;
    } else if (nx >= ny && nx >= nz) {
      // East / West facing vertical or sloped surface (YZ plane)
      u = vz / scale;
      v = vy / scale;
    } else {
      // North / South facing vertical or sloped surface (XY plane)
      u = vx / scale;
      v = vy / scale;
    }

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const uvAttr = geometry.getAttribute("uv");
  if (uvAttr) {
    uvAttr.needsUpdate = true;
  }

  return geometry;
}

/**
 * Ensures a THREE.Texture uses RepeatWrapping on both S and T axes
 * with high-anisotropy filtering for crisp oblique walkthrough viewing angles.
 */
export function configureWorldSpaceTexture(
  texture: THREE.Texture,
  isColorMap = true
): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  if (isColorMap) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.colorSpace = THREE.NoColorSpace;
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
