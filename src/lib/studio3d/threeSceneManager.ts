/**
 * Three.js 3D WebGL Scene & Building Manager
 * Renders high-precision 3D architectural floorplans, structural walls,
 * openings with sill/head heights, materials, fixtures, and procedural hip roofs.
 * Supports Orbit / Dollhouse camera and First-Person Virtual Walkthrough modes.
 */

import * as THREE from "three";
import {
  BuildingDesign3D,
  Room3D,
  Opening3D,
  RoofConfig,
} from "./studio3dTypes";
import { generateProceduralHipRoof } from "./parametricRoofEngine";
import { ensureCompleteWallNetwork } from "./wallNetworkEngine";

export type CameraMode = "orbit" | "walkthrough";

export interface SceneManagerOptions {
  container: HTMLElement;
  design: BuildingDesign3D | null;
  onRoomChange?: (roomName: string) => void;
}

export class ThreeStudioSceneManager {
  private container: HTMLElement;
  private design: BuildingDesign3D | null = null;
  private onRoomChange?: (roomName: string) => void;
  private emptyGrid: THREE.GridHelper | null = null;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;

  // Camera & Interaction state
  private cameraMode: CameraMode = "orbit";
  private isMouseDown = false;
  private isRightMouseDown = false;
  private previousMousePosition = { x: 0, y: 0 };

  // Orbit parameters
  private orbitTarget = new THREE.Vector3(7, 1.2, 8);
  private orbitDistance = 24;
  private orbitTheta = Math.PI / 4; // 45 deg
  private orbitPhi = Math.PI / 3;   // 60 deg elevation

  // Walkthrough parameters
  private walkPosition = new THREE.Vector3(7, 1.65, 8);
  private walkYaw = 0;
  private walkPitch = 0;
  private keysPressed: Record<string, boolean> = {};

  // Groups
  private buildingGroup = new THREE.Group();
  private roofGroup = new THREE.Group();
  private fixturesGroup = new THREE.Group();

  // Cached materials
  private materials: Record<string, THREE.Material> = {};

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.design = options.design ? ensureCompleteWallNetwork(options.design) : null;
    this.onRoomChange = options.onRoomChange;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0b0f19"); // Premium architectural dark slate

    // 2. Camera
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.updateOrbitCamera();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting & Materials
    this.setupLighting();
    this.setupMaterials();

    // 5. Build Environment & Building
    this.scene.add(this.buildingGroup);
    this.scene.add(this.fixturesGroup);
    this.scene.add(this.roofGroup);

    if (this.design) {
      this.rebuildScene();
    } else {
      this.buildEmptyStudio();
    }

    // 6. Event listeners
    this.bindEvents();

    // 7. Start render loop
    this.startLoop();
  }

  private setupLighting(): void {
    // Ambient Skylight
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Warm Directional Sunlight
    const sunLight = new THREE.DirectionalLight(0xfff8ed, 1.4);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    fillLight.position.set(-20, 25, -20);
    this.scene.add(fillLight);
  }

  private setupMaterials(): void {
    let timberTexture: THREE.CanvasTexture | null = null;
    let carpetTexture: THREE.CanvasTexture | null = null;
    let tileTexture: THREE.CanvasTexture | null = null;

    if (typeof document !== "undefined") {
      // 1. Procedural Oak Timber Floor Texture
      const timberCanvas = document.createElement("canvas");
      timberCanvas.width = 256;
      timberCanvas.height = 256;
      const tCtx = timberCanvas.getContext("2d");
      if (tCtx) {
        tCtx.fillStyle = "#b48455"; // Warm natural oak
        tCtx.fillRect(0, 0, 256, 256);
        // Plank lines
        tCtx.strokeStyle = "#805229";
        tCtx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.lineTo(256, y);
          tCtx.stroke();
        }
        // Staggered butt joints
        for (let y = 0; y < 256; y += 32) {
          const offset = (y % 64 === 0) ? 64 : 128;
          for (let x = offset; x < 256; x += 128) {
            tCtx.beginPath();
            tCtx.moveTo(x, y);
            tCtx.lineTo(x, y + 32);
            tCtx.stroke();
          }
        }
      }
      timberTexture = new THREE.CanvasTexture(timberCanvas);
      timberTexture.wrapS = THREE.RepeatWrapping;
      timberTexture.wrapT = THREE.RepeatWrapping;
      timberTexture.repeat.set(2, 2);

      // 2. Bedroom Carpet Texture
      const carpetCanvas = document.createElement("canvas");
      carpetCanvas.width = 128;
      carpetCanvas.height = 128;
      const cCtx = carpetCanvas.getContext("2d");
      if (cCtx) {
        cCtx.fillStyle = "#8a8f98"; // Warm heather grey
        cCtx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 400; i++) {
          cCtx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
          cCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
        }
      }
      carpetTexture = new THREE.CanvasTexture(carpetCanvas);
      carpetTexture.wrapS = THREE.RepeatWrapping;
      carpetTexture.wrapT = THREE.RepeatWrapping;
      carpetTexture.repeat.set(4, 4);

      // 3. Wet Area Porcelain Tile Texture (600x600)
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = 128;
      tileCanvas.height = 128;
      const tlCtx = tileCanvas.getContext("2d");
      if (tlCtx) {
        tlCtx.fillStyle = "#e2e8f0"; // Bright porcelain
        tlCtx.fillRect(0, 0, 128, 128);
        tlCtx.strokeStyle = "#94a3b8"; // Grout line
        tlCtx.lineWidth = 3;
        tlCtx.strokeRect(0, 0, 128, 128);
      }
      tileTexture = new THREE.CanvasTexture(tileCanvas);
      tileTexture.wrapS = THREE.RepeatWrapping;
      tileTexture.wrapT = THREE.RepeatWrapping;
      tileTexture.repeat.set(3, 3);
    }

    this.materials.timber = new THREE.MeshStandardMaterial({
      ...(timberTexture ? { map: timberTexture } : { color: 0xb48455 }),
      roughness: 0.35,
      metalness: 0.05,
    });

    this.materials.carpet = new THREE.MeshStandardMaterial({
      ...(carpetTexture ? { map: carpetTexture } : { color: 0x8a8f98 }),
      roughness: 0.9,
    });

    this.materials.tiles = new THREE.MeshStandardMaterial({
      ...(tileTexture ? { map: tileTexture } : { color: 0xe2e8f0 }),
      roughness: 0.2,
      metalness: 0.1,
    });

    // 4. Garage Concrete
    this.materials.concrete = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.8,
    });

    // 5. Timber Decking (Alfresco / Porch)
    this.materials.decking = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.6,
    });

    // 6. Exterior Brick
    this.materials.brick = new THREE.MeshStandardMaterial({
      color: 0xa87a5b, // Classic Australian brick hue
      roughness: 0.75,
    });

    // 7. Interior Wall Paint
    this.materials.interiorWall = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Warm off-white alabaster
      roughness: 0.6,
    });

    // 8. Glass & Windows
    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6f5,
      transmission: 0.85,
      opacity: 0.45,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });

    // 9. Window & Door Aluminium Frames (Monument)
    this.materials.frame = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
    });

    // 10. Architectural Timber Barn Door
    this.materials.barnDoorWood = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Deep rustic walnut
      roughness: 0.55,
    });
    this.materials.barnDoorIron = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Matte black steel track
      roughness: 0.3,
      metalness: 0.8,
    });
  }

  public rebuildScene(): void {
    if (!this.design) {
      this.buildEmptyStudio();
      return;
    }

    if (this.emptyGrid) {
      this.scene.remove(this.emptyGrid);
      this.emptyGrid = null;
    }

    // Clear previous geometry
    while (this.buildingGroup.children.length > 0) {
      this.buildingGroup.remove(this.buildingGroup.children[0]);
    }
    while (this.fixturesGroup.children.length > 0) {
      this.fixturesGroup.remove(this.fixturesGroup.children[0]);
    }
    while (this.roofGroup.children.length > 0) {
      this.roofGroup.remove(this.roofGroup.children[0]);
    }

    // Set orbit target to center of building and update camera
    const centerX = this.design.widthM / 2;
    const centerZ = this.design.lengthM / 2;
    this.orbitTarget.set(centerX, 1.2, centerZ);
    if (this.cameraMode === "orbit") {
      const maxDim = Math.max(this.design.widthM, this.design.lengthM);
      this.orbitDistance = Math.max(16, maxDim * 1.35);
      this.updateOrbitCamera();
    }

    // 1. Build Ground, Driveway, and Concrete Slab
    this.buildGroundAndSlab();

    // 2. Build Room Floors
    this.buildRoomFloors();

    // 3. Build Walls with accurate Door & Window cutouts
    this.buildWallsAndOpenings();

    // 4. Build Interior Fixtures (Kitchen island, vanities, baths, cinema seats, mud nook)
    this.buildFixtures();

    // 5. Build Parametric Hip Roof
    this.buildRoof();
  }

  private buildGroundAndSlab(): void {
    if (!this.design) return;
    // Manicured Green Turf Ground
    const groundGeom = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.buildingGroup.add(groundMesh);

    // Concrete Slab Foundation (300mm FFL)
    const slabW = this.design.widthM;
    const slabL = this.design.lengthM;
    const slabGeom = new THREE.BoxGeometry(slabW, 0.30, slabL);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const slabMesh = new THREE.Mesh(slabGeom, slabMat);
    slabMesh.position.set(slabW / 2, 0.15, slabL / 2);
    slabMesh.receiveShadow = true;
    this.buildingGroup.add(slabMesh);

    // Concrete Driveway to Garage
    const drivewayGeom = new THREE.BoxGeometry(6.5, 0.05, 12);
    const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const drivewayMesh = new THREE.Mesh(drivewayGeom, drivewayMat);
    drivewayMesh.position.set(slabW - 3.5, 0.02, -6);
    drivewayMesh.receiveShadow = true;
    this.buildingGroup.add(drivewayMesh);

    // Paved Front Walkway to Porch
    const pathGeom = new THREE.BoxGeometry(1.8, 0.06, 8);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.6 });
    const pathMesh = new THREE.Mesh(pathGeom, pathMat);
    pathMesh.position.set(6.5, 0.03, -4);
    pathMesh.receiveShadow = true;
    this.buildingGroup.add(pathMesh);
  }

  private buildRoomFloors(): void {
    if (!this.design) return;
    (this.design.rooms || []).forEach((room) => {
      if (!room.polygon || room.polygon.length < 3) return;

      const shape = new THREE.Shape();
      const p0 = room.polygon[0];
      shape.moveTo(p0[0], p0[1]);
      for (let i = 1; i < room.polygon.length; i++) {
        shape.lineTo(room.polygon[i][0], room.polygon[i][1]);
      }
      shape.closePath();

      const floorGeom = new THREE.ShapeGeometry(shape);
      const floorMat = this.materials[room.floorFinish] || this.materials.timber;
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.rotation.x = Math.PI / 2;
      floorMesh.position.y = 0.305; // Slightly above foundation slab
      floorMesh.receiveShadow = true;
      this.buildingGroup.add(floorMesh);
    });
  }

  private buildWallsAndOpenings(): void {
    if (!this.design) return;
    const ceilingH = this.design.ceilingHeightM;
    const ffl = 0.30;
    const openings = this.design.openings || [];
    const walls = this.design.walls || [];

    // Walls
    walls.forEach((wall) => {
      const p1 = new THREE.Vector2(wall.start[0], wall.start[1]);
      const p2 = new THREE.Vector2(wall.end[0], wall.end[1]);
      const wallLen = p1.distanceTo(p2);
      if (wallLen < 0.1) return;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;

      // Find openings situated along this wall
      const wallOpenings = openings.filter((op) => {
        const opPos = new THREE.Vector2(op.position[0], op.position[1]);
        // Distance from point to line segment
        const dist = distToSegment(opPos, p1, p2);
        return dist < 0.35;
      });

      if (wallOpenings.length === 0) {
        // Continuous Wall (No openings)
        const wallH = wall.height || ceilingH;
        const geom = new THREE.BoxGeometry(wallLen, wallH, wall.thickness);
        const mat = wall.isExterior ? this.materials.brick : this.materials.interiorWall;
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(midX, ffl + wallH / 2, midZ);
        mesh.rotation.y = -angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.buildingGroup.add(mesh);
      } else {
        // Wall with Openings: Subdivide into piers, sill walls, and lintel headers!
        const wallH = wall.height || ceilingH;
        const mat = wall.isExterior ? this.materials.brick : this.materials.interiorWall;

        // Sort openings along the wall from start to end
        const sorted = wallOpenings.map((op) => {
          const opPos = new THREE.Vector2(op.position[0], op.position[1]);
          const d = p1.distanceTo(opPos);
          return { op, d };
        }).sort((a, b) => a.d - b.d);

        let curDist = 0;
        sorted.forEach(({ op, d }) => {
          const opHalfW = op.width / 2;
          const openStart = Math.max(0, d - opHalfW);
          const openEnd = Math.min(wallLen, d + opHalfW);

          // 1. Left pier before opening
          const pierLen = openStart - curDist;
          if (pierLen > 0.05) {
            const pierMid = curDist + pierLen / 2;
            const pierGeom = new THREE.BoxGeometry(pierLen, wallH, wall.thickness);
            const pierMesh = new THREE.Mesh(pierGeom, mat);
            // Translate along wall direction
            const posX = p1.x + Math.cos(angle) * pierMid;
            const posZ = p1.y + Math.sin(angle) * pierMid;
            pierMesh.position.set(posX, ffl + wallH / 2, posZ);
            pierMesh.rotation.y = -angle;
            pierMesh.castShadow = true;
            pierMesh.receiveShadow = true;
            this.buildingGroup.add(pierMesh);
          }

          // 2. Sill Wall under window (0 to sillHeight)
          if (op.sillHeight > 0.05) {
            const sillGeom = new THREE.BoxGeometry(openEnd - openStart, op.sillHeight, wall.thickness);
            const sillMesh = new THREE.Mesh(sillGeom, mat);
            const sillMid = (openStart + openEnd) / 2;
            const sX = p1.x + Math.cos(angle) * sillMid;
            const sZ = p1.y + Math.sin(angle) * sillMid;
            sillMesh.position.set(sX, ffl + op.sillHeight / 2, sZ);
            sillMesh.rotation.y = -angle;
            sillMesh.castShadow = true;
            sillMesh.receiveShadow = true;
            this.buildingGroup.add(sillMesh);
          }

          // 3. Top Header / Lintel wall (headHeight to ceilingHeight)
          const lintelH = wallH - op.headHeight;
          if (lintelH > 0.05) {
            const lintelGeom = new THREE.BoxGeometry(openEnd - openStart, lintelH, wall.thickness);
            const lintelMesh = new THREE.Mesh(lintelGeom, mat);
            const lintelMid = (openStart + openEnd) / 2;
            const lX = p1.x + Math.cos(angle) * lintelMid;
            const lZ = p1.y + Math.sin(angle) * lintelMid;
            lintelMesh.position.set(lX, ffl + op.headHeight + lintelH / 2, lZ);
            lintelMesh.rotation.y = -angle;
            lintelMesh.castShadow = true;
            lintelMesh.receiveShadow = true;
            this.buildingGroup.add(lintelMesh);
          }

          // 4. Build Opening Geometry (Window frame/glass or door panel)
          this.buildOpeningObject(op, angle, ffl);

          curDist = openEnd;
        });

        // Final pier after last opening
        const finalPierLen = wallLen - curDist;
        if (finalPierLen > 0.05) {
          const pierMid = curDist + finalPierLen / 2;
          const pierGeom = new THREE.BoxGeometry(finalPierLen, wallH, wall.thickness);
          const pierMesh = new THREE.Mesh(pierGeom, mat);
          const posX = p1.x + Math.cos(angle) * pierMid;
          const posZ = p1.y + Math.sin(angle) * pierMid;
          pierMesh.position.set(posX, ffl + wallH / 2, posZ);
          pierMesh.rotation.y = -angle;
          pierMesh.castShadow = true;
          pierMesh.receiveShadow = true;
          this.buildingGroup.add(pierMesh);
        }
      }
    });
  }

  private buildOpeningObject(op: Opening3D, angle: number, ffl: number): void {
    const group = new THREE.Group();
    const x = op.position[0];
    const z = op.position[1];

    if (op.type === "barn_door") {
      // High-Detail Timber Barn Door with Top Black Steel Roller Track
      // 1. Top Track Rail
      const trackGeom = new THREE.CylinderGeometry(0.015, 0.015, op.width * 1.8, 16);
      const trackMesh = new THREE.Mesh(trackGeom, this.materials.barnDoorIron);
      trackMesh.rotation.z = Math.PI / 2;
      trackMesh.position.set(0, op.headHeight + 0.08, 0.06);
      group.add(trackMesh);

      // 2. Door Slab (Warm Rustic Timber with cross bracing)
      const slabGeom = new THREE.BoxGeometry(op.width, op.height, 0.04);
      const slabMesh = new THREE.Mesh(slabGeom, this.materials.barnDoorWood);
      slabMesh.position.set(0, op.height / 2, 0.06);
      slabMesh.castShadow = true;
      group.add(slabMesh);

      // 3. Black Iron Rollers
      const roller1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller1.position.set(-op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller1);
      const roller2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller2.position.set(op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller2);
    } else if (op.type === "garage_door") {
      // 4-Panel Sectional Garage Door
      const doorGeom = new THREE.BoxGeometry(op.width, op.height, 0.05);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4 });
      const doorMesh = new THREE.Mesh(doorGeom, doorMat);
      doorMesh.position.set(0, op.height / 2, 0);
      group.add(doorMesh);
    } else if (op.type === "stacker_door" || op.type === "sliding_door") {
      // 2-Panel or 3-Panel Aluminium Stacker Sliding Glass Door
      const frameGeom = new THREE.BoxGeometry(op.width, op.height, 0.12);
      const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
      frameMesh.position.set(0, op.height / 2, 0);
      group.add(frameMesh);

      const glassGeom = new THREE.BoxGeometry(op.width - 0.08, op.height - 0.08, 0.02);
      const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
      glassMesh.position.set(0, op.height / 2, 0);
      group.add(glassMesh);
    } else if (op.type === "window") {
      // Glazed Aluminium Window with Frame and Sill
      const frameGeom = new THREE.BoxGeometry(op.width, op.height, 0.12);
      const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
      frameMesh.position.set(0, op.sillHeight + op.height / 2, 0);
      group.add(frameMesh);

      const glassGeom = new THREE.BoxGeometry(op.width - 0.08, op.height - 0.08, 0.02);
      const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
      glassMesh.position.set(0, op.sillHeight + op.height / 2, 0);
      group.add(glassMesh);
    } else if (op.type === "archway") {
      // Open architectural portal archway - no solid door panel
      return;
    } else {
      // Standard Hinged Door Panel
      const doorGeom = new THREE.BoxGeometry(op.width, op.height, 0.04);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
      const doorMesh = new THREE.Mesh(doorGeom, doorMat);
      doorMesh.position.set(0, op.height / 2, 0);
      group.add(doorMesh);
    }

    group.position.set(x, ffl, z);
    group.rotation.y = -angle;
    this.buildingGroup.add(group);
  }

  private buildFixtures(): void {
    if (!this.design) return;
    const ffl = 0.30;

    (this.design.fixtures || []).forEach((fix) => {
      const group = new THREE.Group();

      if (fix.type === "kitchen_island") {
        // Grand 40mm Waterfall Island Bench with Undermount Sink & Chrome Mixer
        const islandGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const islandMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.1 });
        const islandMesh = new THREE.Mesh(islandGeom, islandMat);
        islandMesh.position.y = fix.height / 2;
        islandMesh.castShadow = true;
        group.add(islandMesh);

        // Chrome Gooseneck Mixer Tap
        const tapGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 16);
        const tapMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.9 });
        const tapMesh = new THREE.Mesh(tapGeom, tapMat);
        tapMesh.position.set(0, fix.height + 0.18, 0);
        group.add(tapMesh);
      } else if (fix.type === "cinema_seating") {
        // Luxury Cinema Lounge
        const seatGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.8 });
        const seatMesh = new THREE.Mesh(seatGeom, seatMat);
        seatMesh.position.y = fix.height / 2;
        group.add(seatMesh);
      } else if (fix.type === "mud_nook_bench") {
        // Mud Nook Built-in Oak Bench
        const benchGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const benchMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.5 });
        const benchMesh = new THREE.Mesh(benchGeom, benchMat);
        benchMesh.position.y = fix.height / 2;
        group.add(benchMesh);
      } else if (fix.type === "vanity_double" || fix.type === "vanity_single") {
        // Floating Bathroom Vanity with Ceramic Basin & Mirror
        const vanityGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const vanityMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
        const vanityMesh = new THREE.Mesh(vanityGeom, vanityMat);
        vanityMesh.position.y = fix.height / 2;
        group.add(vanityMesh);

        // Large Mirror
        const mirrorGeom = new THREE.BoxGeometry(fix.width, 0.90, 0.02);
        const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.05, metalness: 0.95 });
        const mirrorMesh = new THREE.Mesh(mirrorGeom, mirrorMat);
        mirrorMesh.position.set(0, fix.height + 0.55, -fix.depth / 2 + 0.02);
        group.add(mirrorMesh);
      } else if (fix.type === "shower") {
        // Semi-Frameless Glass Shower Enclosure
        const showerGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const showerMesh = new THREE.Mesh(showerGeom, this.materials.glass);
        showerMesh.position.y = fix.height / 2;
        group.add(showerMesh);
      } else if (fix.type === "bath") {
        // Freestanding Oval Acrylic Bathtub
        const bathGeom = new THREE.CylinderGeometry(fix.depth / 2, fix.depth / 2.2, fix.height, 32);
        const bathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const bathMesh = new THREE.Mesh(bathGeom, bathMat);
        bathMesh.scale.set(fix.width / fix.depth, 1, 1);
        bathMesh.position.y = fix.height / 2;
        group.add(bathMesh);
      } else if (fix.type === "toilet") {
        // Back-to-Wall Toilet Suite
        const toiletGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const toiletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
        const toiletMesh = new THREE.Mesh(toiletGeom, toiletMat);
        toiletMesh.position.y = fix.height / 2;
        group.add(toiletMesh);
      } else if (fix.type === "bed_queen" || fix.type === "bed_double") {
        // Bed with Headboard and Pillows
        const bedGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
        const bedMesh = new THREE.Mesh(bedGeom, bedMat);
        bedMesh.position.y = fix.height / 2;
        group.add(bedMesh);
      } else if (fix.type === "sofa_sectional") {
        // Sectional Living Room Sofa
        const sofaGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const sofaMesh = new THREE.Mesh(sofaGeom, sofaMat);
        sofaMesh.position.y = fix.height / 2;
        group.add(sofaMesh);
      } else if (fix.type === "dining_table") {
        // Dining Table
        const tableGeom = new THREE.BoxGeometry(fix.width, 0.06, fix.depth);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
        const tableMesh = new THREE.Mesh(tableGeom, tableMat);
        tableMesh.position.y = fix.height;
        group.add(tableMesh);
      } else {
        // Generic Cabinetry
        const genGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const genMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
        const genMesh = new THREE.Mesh(genGeom, genMat);
        genMesh.position.y = fix.height / 2;
        group.add(genMesh);
      }

      group.position.set(fix.position[0], ffl, fix.position[2]);
      group.rotation.y = fix.rotationY;
      this.fixturesGroup.add(group);
    });
  }

  private buildRoof(): void {
    if (!this.design) return;
    if (!this.design.roof.showRoof || this.design.roof.cutawayMode) {
      this.roofGroup.visible = false;
      return;
    }

    const { roofMesh, fasciaMesh, gutterMesh } = generateProceduralHipRoof(
      this.design,
      this.design.roof
    );

    this.roofGroup.add(roofMesh);
    this.roofGroup.add(fasciaMesh);
    this.roofGroup.add(gutterMesh);
    this.roofGroup.visible = true;
  }

  // Camera & Mode Controls
  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    if (mode === "walkthrough") {
      // Place camera in living room or entrance at eye level
      const w = this.design ? this.design.widthM : 14;
      const l = this.design ? this.design.lengthM : 16;
      this.walkPosition.set(w / 2, 1.65 + 0.30, l / 2);
      this.walkYaw = 0;
      this.walkPitch = 0;
      this.camera.fov = 65; // wider FOV for interior immersion
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
      this.updateOrbitCamera();
    }
  }

  public teleportToRoom(roomName: string): void {
    if (!this.design) return;
    const room = (this.design.rooms || []).find((r) => r.name === roomName || r.customLabel === roomName);
    if (!room) return;

    if (this.cameraMode === "walkthrough") {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const p of room.polygon) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minZ) minZ = p[1];
        if (p[1] > maxZ) maxZ = p[1];
      }

      // Stand inside the room corner with natural diagonal perspective across the room
      const eyeX = minX + (maxX - minX) * 0.28;
      const eyeZ = minZ + (maxZ - minZ) * 0.28;
      this.walkPosition.set(eyeX, 1.65 + 0.30, eyeZ);

      const lookTargetX = minX + (maxX - minX) * 0.72;
      const lookTargetZ = minZ + (maxZ - minZ) * 0.72;
      const dx = lookTargetX - eyeX;
      const dz = lookTargetZ - eyeZ;
      this.walkYaw = Math.atan2(-dx, -dz);
      this.walkPitch = -0.16; // Slight downward gaze showcasing finishes and furniture
      this.camera.fov = 72; // Wide interior lens for immersive virtual tour
      this.camera.updateProjectionMatrix();
    } else {
      this.orbitTarget.set(room.center[0], 1.2, room.center[1]);
      this.orbitDistance = 14;
      this.orbitPhi = Math.PI / 3.4;
      this.updateOrbitCamera();
    }

    if (this.onRoomChange) {
      this.onRoomChange(room.customLabel || room.name);
    }
  }

  public setPresetView(preset: "isometric" | "top" | "front" | "rear" | "left" | "right"): void {
    this.cameraMode = "orbit";
    const center = this.design
      ? new THREE.Vector3(this.design.widthM / 2, 1.2, this.design.lengthM / 2)
      : new THREE.Vector3(0, 0.5, 0);
    this.orbitTarget.copy(center);

    switch (preset) {
      case "isometric":
        this.orbitDistance = 24;
        this.orbitTheta = Math.PI / 4;
        this.orbitPhi = Math.PI / 3;
        break;
      case "top":
        this.orbitDistance = 26;
        this.orbitTheta = 0;
        this.orbitPhi = 0.01; // almost directly overhead
        break;
      case "front": // North view
        this.orbitDistance = 22;
        this.orbitTheta = 0;
        this.orbitPhi = Math.PI / 2 - 0.05;
        break;
      case "rear": // South view
        this.orbitDistance = 22;
        this.orbitTheta = Math.PI;
        this.orbitPhi = Math.PI / 2 - 0.05;
        break;
      case "left": // West view
        this.orbitDistance = 22;
        this.orbitTheta = -Math.PI / 2;
        this.orbitPhi = Math.PI / 2 - 0.05;
        break;
      case "right": // East view
        this.orbitDistance = 22;
        this.orbitTheta = Math.PI / 2;
        this.orbitPhi = Math.PI / 2 - 0.05;
        break;
    }
    this.updateOrbitCamera();
  }

  public buildEmptyStudio(): void {
    while (this.buildingGroup.children.length > 0) {
      this.buildingGroup.remove(this.buildingGroup.children[0]);
    }
    while (this.fixturesGroup.children.length > 0) {
      this.fixturesGroup.remove(this.fixturesGroup.children[0]);
    }
    while (this.roofGroup.children.length > 0) {
      this.roofGroup.remove(this.roofGroup.children[0]);
    }

    if (this.emptyGrid) {
      this.scene.remove(this.emptyGrid);
    }
    this.scene.background = new THREE.Color("#090d16");
    this.emptyGrid = new THREE.GridHelper(36, 36, 0xf59e0b, 0x334155);
    this.emptyGrid.position.y = 0;
    this.scene.add(this.emptyGrid);

    this.orbitTarget.set(0, 0.5, 0);
    this.orbitDistance = 22;
    this.orbitTheta = Math.PI / 4;
    this.orbitPhi = Math.PI / 3;
    this.updateOrbitCamera();
  }

  public updateDesign(newDesign: BuildingDesign3D | null): void {
    this.design = newDesign ? ensureCompleteWallNetwork(newDesign) : null;
    if (this.design) {
      const centerX = this.design.widthM / 2;
      const centerZ = this.design.lengthM / 2;
      this.orbitTarget.set(centerX, 1.2, centerZ);
      const maxDim = Math.max(this.design.widthM, this.design.lengthM);
      this.orbitDistance = Math.max(16, maxDim * 1.35);
      this.orbitTheta = Math.PI / 4;
      this.orbitPhi = Math.PI / 3.2;
      this.rebuildScene();
      this.updateOrbitCamera();
    } else {
      this.buildEmptyStudio();
    }
  }

  public moveWalkthrough(direction: "forward" | "backward" | "left" | "right", step = 0.8): void {
    if (!this.design) return;
    if (this.cameraMode !== "walkthrough") {
      this.setCameraMode("walkthrough");
    }
    const forward = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
    const right = new THREE.Vector3(Math.cos(this.walkYaw), 0, -Math.sin(this.walkYaw));

    if (direction === "forward") this.walkPosition.addScaledVector(forward, step);
    if (direction === "backward") this.walkPosition.addScaledVector(forward, -step);
    if (direction === "left") this.walkPosition.addScaledVector(right, -step);
    if (direction === "right") this.walkPosition.addScaledVector(right, step);

    this.walkPosition.x = Math.max(0.5, Math.min(this.design.widthM - 0.5, this.walkPosition.x));
    this.walkPosition.z = Math.max(0.5, Math.min(this.design.lengthM - 0.5, this.walkPosition.z));
    this.walkPosition.y = 1.65 + 0.30;
    this.camera.position.copy(this.walkPosition);

    const target = new THREE.Vector3(
      this.walkPosition.x - Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
      this.walkPosition.y + Math.sin(this.walkPitch),
      this.walkPosition.z - Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
    );
    this.camera.lookAt(target);
    this.checkCurrentRoom();
  }

  public rotateWalkthrough(yawDelta: number, pitchDelta = 0): void {
    if (this.cameraMode !== "walkthrough") {
      this.setCameraMode("walkthrough");
    }
    this.walkYaw += yawDelta;
    this.walkPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.walkPitch + pitchDelta));

    const target = new THREE.Vector3(
      this.walkPosition.x - Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
      this.walkPosition.y + Math.sin(this.walkPitch),
      this.walkPosition.z - Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
    );
    this.camera.lookAt(target);
  }

  public setRoofMode(show: boolean, cutaway: boolean): void {
    if (!this.design) return;
    this.design.roof.showRoof = show;
    this.design.roof.cutawayMode = cutaway;
    while (this.roofGroup.children.length > 0) {
      this.roofGroup.remove(this.roofGroup.children[0]);
    }
    this.buildRoof();
  }

  public setCeilingHeight(h: number): void {
    if (!this.design) return;
    this.design.ceilingHeightM = h;
    this.rebuildScene();
  }

  // Keyboard and mouse navigation
  private bindEvents(): void {
    const el = this.renderer.domElement;

    el.addEventListener("mousedown", (e) => {
      this.isMouseDown = e.button === 0;
      this.isRightMouseDown = e.button === 2;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    });

    el.addEventListener("contextmenu", (e) => e.preventDefault());

    el.addEventListener("mousemove", (e) => {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.cameraMode === "orbit") {
        if (this.isMouseDown) {
          // Orbit rotate
          this.orbitTheta -= deltaX * 0.008;
          this.orbitPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, this.orbitPhi - deltaY * 0.008));
          this.updateOrbitCamera();
        } else if (this.isRightMouseDown) {
          // Orbit pan
          const panSpeed = 0.015 * (this.orbitDistance / 20);
          const right = new THREE.Vector3();
          this.camera.getWorldDirection(right);
          right.cross(this.camera.up).normalize();

          this.orbitTarget.addScaledVector(right, -deltaX * panSpeed);
          this.orbitTarget.y += deltaY * panSpeed;
          this.updateOrbitCamera();
        }
      } else if (this.cameraMode === "walkthrough") {
        if (this.isMouseDown) {
          this.walkYaw -= deltaX * 0.004;
          this.walkPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.walkPitch - deltaY * 0.004));
        }
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (this.cameraMode === "orbit") {
        this.orbitDistance = Math.max(4, Math.min(70, this.orbitDistance + e.deltaY * 0.02));
        this.updateOrbitCamera();
      }
    });

    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });

    window.addEventListener("resize", () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / (h || 1);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private updateOrbitCamera(): void {
    const x = this.orbitTarget.x + this.orbitDistance * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
    const y = this.orbitTarget.y + this.orbitDistance * Math.cos(this.orbitPhi);
    const z = this.orbitTarget.z + this.orbitDistance * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.orbitTarget);
  }

  private updateWalkthrough(delta: number): void {
    if (!this.design) return;
    const speed = 4.5 * delta; // 4.5 m/s walk speed

    const forward = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
    const right = new THREE.Vector3(Math.cos(this.walkYaw), 0, -Math.sin(this.walkYaw));

    if (this.keysPressed["w"] || this.keysPressed["arrowup"]) {
      this.walkPosition.addScaledVector(forward, speed);
    }
    if (this.keysPressed["s"] || this.keysPressed["arrowdown"]) {
      this.walkPosition.addScaledVector(forward, -speed);
    }
    if (this.keysPressed["a"] || this.keysPressed["arrowleft"]) {
      this.walkPosition.addScaledVector(right, -speed);
    }
    if (this.keysPressed["d"] || this.keysPressed["arrowright"]) {
      this.walkPosition.addScaledVector(right, speed);
    }

    // Keep camera within house boundaries
    this.walkPosition.x = Math.max(0.5, Math.min(this.design.widthM - 0.5, this.walkPosition.x));
    this.walkPosition.z = Math.max(0.5, Math.min(this.design.lengthM - 0.5, this.walkPosition.z));
    this.walkPosition.y = 1.65 + 0.30; // 1.65m eye level + slab height

    this.camera.position.copy(this.walkPosition);

    const target = new THREE.Vector3(
      this.walkPosition.x - Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
      this.walkPosition.y + Math.sin(this.walkPitch),
      this.walkPosition.z - Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
    );
    this.camera.lookAt(target);

    // Detect active room
    this.checkCurrentRoom();
  }

  private lastNotifiedRoom = "";
  private checkCurrentRoom(): void {
    if (!this.design) return;
    const p = new THREE.Vector2(this.walkPosition.x, this.walkPosition.z);
    for (const r of this.design.rooms || []) {
      if (pointInPolygon(p, r.polygon)) {
        const name = r.customLabel || r.name;
        if (name !== this.lastNotifiedRoom) {
          this.lastNotifiedRoom = name;
          if (this.onRoomChange) this.onRoomChange(name);
        }
        break;
      }
    }
  }

  private startLoop(): void {
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!this.design) {
        // Crisp ambient studio rotation when empty
        if (!this.isMouseDown && !this.isRightMouseDown) {
          this.orbitTheta += 0.001;
          this.updateOrbitCamera();
        }
      } else if (this.cameraMode === "walkthrough") {
        this.updateWalkthrough(delta);
      }

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Geometric utility helpers
function distToSegment(p: THREE.Vector2, v: THREE.Vector2, w: THREE.Vector2): number {
  const l2 = v.distanceToSquared(w);
  if (l2 === 0) return p.distanceTo(v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = new THREE.Vector2(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
  return p.distanceTo(projection);
}

function pointInPolygon(point: THREE.Vector2, vs: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
