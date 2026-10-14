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
  BoundaryConfig,
  MaterialPaletteConfig,
  InteriorFitoutConfig,
  CustomFacadeConfig,
  FacadeType,
  FenceStyle,
} from "./studio3dTypes";
import { generateProceduralHipRoof } from "./parametricRoofEngine";
import { ensureCompleteWallNetwork } from "./wallNetworkEngine";
import {
  DEFAULT_BOUNDARY_CONFIG,
  DEFAULT_MATERIAL_CONFIG,
} from "./designs3dRegistry";
import {
  ensureOutdoorZonesOpenAndFurnished,
  DEFAULT_FITOUT_CONFIG,
  DEFAULT_CUSTOM_FACADE_CONFIG,
} from "./floorplanTo3dEngine";

export type CameraMode = "orbit" | "walkthrough";

export interface SceneManagerOptions {
  container: HTMLElement;
  design: BuildingDesign3D | null;
  onRoomChange?: (roomName: string) => void;
  isLight?: boolean;
}

export class ThreeStudioSceneManager {
  private container: HTMLElement;
  private design: BuildingDesign3D | null = null;
  private onRoomChange?: (roomName: string) => void;
  private emptyGrid: THREE.GridHelper | null = null;
  private isLight = false;

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
  private boundaryGroup = new THREE.Group();
  private buildingGroup = new THREE.Group();
  private roofGroup = new THREE.Group();
  private fixturesGroup = new THREE.Group();
  private facadeGroup = new THREE.Group();

  // Cached materials
  private materials: Record<string, THREE.Material> = {};

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.isLight = Boolean(options.isLight);
    this.design = options.design
      ? ensureOutdoorZonesOpenAndFurnished(ensureCompleteWallNetwork(options.design))
      : null;
    this.onRoomChange = options.onRoomChange;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      this.isLight ? (this.design ? "#dbeafe" : "#f1f5f9") : "#0b0f19"
    );

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
    this.scene.add(this.boundaryGroup);
    this.scene.add(this.buildingGroup);
    this.scene.add(this.fixturesGroup);
    this.scene.add(this.roofGroup);
    this.scene.add(this.facadeGroup);

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

  private createAustralBrickTexture(brickStyle?: string): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let brickColors = ["#6b7280", "#57534e", "#78716c", "#4b5563"]; // Urban One
    let mortarColor = "#cbd5e1";
    if (brickStyle === "austral_everyday_life") {
      brickColors = ["#9a3412", "#7c2d12", "#b45309", "#854d0e", "#a16207"];
      mortarColor = "#e2e8f0";
    } else if (brickStyle === "austral_whitsunday") {
      brickColors = ["#e7e5e4", "#d6d3d1", "#f5f5f4", "#a8a29e"];
      mortarColor = "#f8fafc";
    } else if (brickStyle === "monument_dark") {
      brickColors = ["#262626", "#1c1917", "#27272a", "#3f3f46"];
      mortarColor = "#0f172a";
    }

    ctx.fillStyle = mortarColor;
    ctx.fillRect(0, 0, 512, 512);

    const rowH = 32;
    const brickW = 64;
    const mortarGap = 3;

    for (let y = 0; y < 512; y += rowH) {
      const isShifted = (Math.round(y / rowH) % 2 === 1);
      const startX = isShifted ? -brickW / 2 : 0;
      for (let x = startX; x < 512 + brickW; x += brickW) {
        const colIdx = Math.floor(Math.random() * brickColors.length);
        ctx.fillStyle = brickColors[colIdx];
        ctx.fillRect(x + mortarGap, y + mortarGap, brickW - mortarGap * 2, rowH - mortarGap * 2);

        for (let n = 0; n < 8; n++) {
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
          ctx.fillRect(
            x + mortarGap + Math.random() * (brickW - mortarGap * 2),
            y + mortarGap + Math.random() * (rowH - mortarGap * 2),
            3,
            2
          );
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    return tex;
  }

  private createScyonCladdingTexture(): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 256, 256);

    const boardH = 32;
    for (let y = 0; y < 256; y += boardH) {
      const grad = ctx.createLinearGradient(0, y, 0, y + boardH);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.85, "#f1f5f9");
      grad.addColorStop(1, "#cbd5e1");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 256, boardH - 2);

      ctx.fillStyle = "#64748b";
      ctx.fillRect(0, y + boardH - 2, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  private createExposedAggregateTexture(): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, 0, 256, 256);

    const pebbleColors = ["#ffffff", "#cbd5e1", "#334155", "#1e293b", "#d97706", "#78716c"];
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
      const size = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  private createColorbondFenceTexture(colorHex: string): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 128, 128);

    const ribW = 32;
    for (let x = 0; x < 128; x += ribW) {
      const grad = ctx.createLinearGradient(x, 0, x + ribW, 0);
      grad.addColorStop(0, "rgba(0,0,0,0.45)");
      grad.addColorStop(0.3, "rgba(255,255,255,0.22)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.06)");
      grad.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ribW, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    return tex;
  }

  private createTimberFenceTexture(): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#92400e";
    ctx.fillRect(0, 0, 256, 256);

    const palingW = 32;
    for (let x = 0; x < 256; x += palingW) {
      ctx.fillStyle = (Math.floor(x / palingW) % 2 === 0) ? "#a16207" : "#b45309";
      ctx.fillRect(x + 1, 0, palingW - 2, 256);

      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = "rgba(69, 26, 3, 0.15)";
        ctx.fillRect(x + 3 + Math.random() * (palingW - 6), 0, 2, 256);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x, 0, 2, 256);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }

  private createSectionalGarageTexture(): THREE.CanvasTexture | null {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 256, 256);

    const panelH = 64;
    for (let y = 0; y < 256; y += panelH) {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, y + 6, 240, panelH - 12);

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, y + panelH - 3, 256, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  private setupMaterials(): void {
    let timberTexture: THREE.CanvasTexture | null = null;
    let carpetTexture: THREE.CanvasTexture | null = null;
    let tileTexture: THREE.CanvasTexture | null = null;
    const brickStyle = this.design?.materials?.brickStyle || "austral_urban_one";
    const brickTexture = this.createAustralBrickTexture(brickStyle);
    const claddingTexture = this.createScyonCladdingTexture();
    const aggregateDrivewayTexture = this.createExposedAggregateTexture();
    const colorbondFenceTexture = this.createColorbondFenceTexture("#2b2e35");
    const timberFenceTexture = this.createTimberFenceTexture();
    const garageDoorTexture = this.createSectionalGarageTexture();

    if (typeof document !== "undefined") {
      // 1. Procedural Oak Timber Floor Texture
      const timberCanvas = document.createElement("canvas");
      timberCanvas.width = 256;
      timberCanvas.height = 256;
      const tCtx = timberCanvas.getContext("2d");
      if (tCtx) {
        tCtx.fillStyle = "#b48455";
        tCtx.fillRect(0, 0, 256, 256);
        tCtx.strokeStyle = "#805229";
        tCtx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.lineTo(256, y);
          tCtx.stroke();
        }
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
        cCtx.fillStyle = "#8a8f98";
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
        tlCtx.fillStyle = "#e2e8f0";
        tlCtx.fillRect(0, 0, 128, 128);
        tlCtx.strokeStyle = "#94a3b8";
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

    // 6. Exterior Brick (Authentic Austral Stretcher Bond)
    this.materials.brick = new THREE.MeshStandardMaterial({
      ...(brickTexture ? { map: brickTexture } : { color: 0x6b7280 }),
      roughness: 0.75,
    });

    // 7. Scyon Linea Horizontal Cladding
    this.materials.cladding = new THREE.MeshStandardMaterial({
      ...(claddingTexture ? { map: claddingTexture } : { color: 0xf8fafc }),
      roughness: 0.55,
    });

    // 8. Exposed Aggregate Driveway
    this.materials.aggregateDriveway = new THREE.MeshStandardMaterial({
      ...(aggregateDrivewayTexture ? { map: aggregateDrivewayTexture } : { color: 0x64748b }),
      roughness: 0.7,
    });

    // 9. Boundary Fencing (Colorbond Monument & Treated Pine)
    this.materials.colorbondFence = new THREE.MeshStandardMaterial({
      ...(colorbondFenceTexture ? { map: colorbondFenceTexture } : { color: 0x2b2e35 }),
      roughness: 0.45,
      metalness: 0.25,
    });
    this.materials.timberFence = new THREE.MeshStandardMaterial({
      ...(timberFenceTexture ? { map: timberFenceTexture } : { color: 0xa16207 }),
      roughness: 0.75,
    });

    // 10. Sectional Garage Door
    this.materials.garageDoor = new THREE.MeshStandardMaterial({
      ...(garageDoorTexture ? { map: garageDoorTexture } : { color: 0x1e293b }),
      roughness: 0.4,
      metalness: 0.4,
    });

    // 11. Interior Wall Paint
    this.materials.interiorWall = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.6,
    });

    // 12. Glass & Windows
    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6f5,
      transmission: 0.85,
      opacity: 0.45,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });

    this.materials.frostedGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.65,
      opacity: 0.8,
      transparent: true,
      roughness: 0.35,
    });

    // 13. Window & Door Aluminium Frames (Monument)
    this.materials.frame = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
    });

    // 14. Facade Renders & Details
    this.materials.renderMonument = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
    });
    this.materials.renderWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
    });
    this.materials.stoneCap = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.4,
    });
    this.materials.cedarBatten = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.45,
    });
    this.materials.stainlessSteel = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });

    // 15. Cadastral Survey Boundary Pegs
    this.materials.surveyPeg = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    });
    this.materials.surveyPegTop = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4,
    });

    // 16. Architectural Timber Barn Door
    this.materials.barnDoorWood = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.55,
    });
    this.materials.barnDoorIron = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });
  }

  public rebuildScene(preserveCamera = false): void {
    if (!this.design) {
      this.buildEmptyStudio();
      return;
    }

    this.scene.background = new THREE.Color(this.isLight ? "#dbeafe" : "#0b0f19");

    if (this.emptyGrid) {
      this.scene.remove(this.emptyGrid);
      this.emptyGrid = null;
    }

    // Clear previous geometry
    while (this.boundaryGroup.children.length > 0) {
      this.boundaryGroup.remove(this.boundaryGroup.children[0]);
    }
    while (this.buildingGroup.children.length > 0) {
      this.buildingGroup.remove(this.buildingGroup.children[0]);
    }
    while (this.fixturesGroup.children.length > 0) {
      this.fixturesGroup.remove(this.fixturesGroup.children[0]);
    }
    while (this.roofGroup.children.length > 0) {
      this.roofGroup.remove(this.roofGroup.children[0]);
    }
    while (this.facadeGroup.children.length > 0) {
      this.facadeGroup.remove(this.facadeGroup.children[0]);
    }

    // Set orbit target to center of building and update camera
    const centerX = this.design.widthM / 2;
    const centerZ = this.design.lengthM / 2;
    this.orbitTarget.set(centerX, 1.2, centerZ);
    if (this.cameraMode === "orbit") {
      if (!preserveCamera) {
        const maxDim = Math.max(this.design.widthM, this.design.lengthM);
        this.orbitDistance = Math.max(16, maxDim * 1.35);
      }
      this.updateOrbitCamera();
    }

    // 1. Build Ground, Driveway, and Concrete Slab
    this.buildGroundAndSlab();

    // 2. Build Lot Boundaries, Cadastral Pegs, and 1.8m Australian Fencing
    this.buildBoundariesAndFences();

    // 3. Build Room Floors
    this.buildRoomFloors();

    // 4. Build Walls with accurate Door & Window cutouts
    this.buildWallsAndOpenings();

    // 5. Build Architectural Facade Features (Columns, Gables, Portico, Alfresco Piers)
    this.buildFacadeFeatures();

    // 6. Build Interior Fixtures (Kitchen island, benchtops, sinks, vanities, baths, furniture)
    this.buildFixtures();

    // 7. Build Parametric Hip Roof
    this.buildRoof();
  }

  private buildGroundAndSlab(): void {
    if (!this.design) return;
    const boundary = this.design.boundary || DEFAULT_BOUNDARY_CONFIG;
    const setbackFront = boundary.frontSetbackM || 4.5;
    const setbackRear = boundary.rearSetbackM || 3.5;
    const setbackLeft = boundary.leftSetbackM || 1.2;
    const setbackRight = boundary.rightSetbackM || 1.0;

    const lotLeft = -setbackLeft;
    const lotRight = this.design.widthM + setbackRight;
    const lotFront = -setbackFront;
    const lotRear = this.design.lengthM + setbackRear;
    const lotW = lotRight - lotLeft;
    const lotL = lotRear - lotFront;

    // Outer Regional Ground
    const groundGeom = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.isLight ? 0x65a30d : 0x1a331a,
      roughness: 0.95,
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.06;
    groundMesh.receiveShadow = true;
    this.buildingGroup.add(groundMesh);

    // Manicured Emerald Lot Turf Pad (exact lot boundary)
    const lotTurfGeom = new THREE.PlaneGeometry(lotW, lotL);
    const lotTurfMat = new THREE.MeshStandardMaterial({
      color: this.isLight ? 0x4d7c0f : 0x244e24,
      roughness: 0.9,
    });
    const lotTurfMesh = new THREE.Mesh(lotTurfGeom, lotTurfMat);
    lotTurfMesh.rotation.x = -Math.PI / 2;
    lotTurfMesh.position.set(lotLeft + lotW / 2, -0.02, lotFront + lotL / 2);
    lotTurfMesh.receiveShadow = true;
    this.buildingGroup.add(lotTurfMesh);

    // Concrete Slab Foundation (300mm FFL)
    const slabW = this.design.widthM;
    const slabL = this.design.lengthM;
    const slabGeom = new THREE.BoxGeometry(slabW, 0.30, slabL);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const slabMesh = new THREE.Mesh(slabGeom, slabMat);
    slabMesh.position.set(slabW / 2, 0.15, slabL / 2);
    slabMesh.receiveShadow = true;
    this.buildingGroup.add(slabMesh);

    // Exposed Aggregate Concrete Driveway to Garage
    const garageOpening = (this.design.openings || []).find((op) => op.type === "garage_door");
    const garageX = garageOpening ? garageOpening.position[0] : (slabW - 3.5);
    const driveW = garageOpening ? Math.max(5.4, garageOpening.width + 0.6) : 6.0;
    const driveL = Math.abs(lotFront) + 2.0; // extends to boundary line
    const drivewayGeom = new THREE.BoxGeometry(driveW, 0.05, driveL);
    const drivewayMesh = new THREE.Mesh(drivewayGeom, this.materials.aggregateDriveway);
    drivewayMesh.position.set(garageX, 0.025, lotFront / 2 - 1.0);
    drivewayMesh.receiveShadow = true;
    this.buildingGroup.add(drivewayMesh);

    // Paved Front Walkway to Porch
    const porch = (this.design.rooms || []).find((r) => r.name === "Porch");
    const pathX = porch ? porch.center[0] : 6.5;
    const pathL = Math.abs(lotFront) + 1.0;
    const pathGeom = new THREE.BoxGeometry(1.6, 0.06, pathL);
    const pathMesh = new THREE.Mesh(pathGeom, this.materials.stoneCap);
    pathMesh.position.set(pathX, 0.03, lotFront / 2 - 0.5);
    pathMesh.receiveShadow = true;
    this.buildingGroup.add(pathMesh);

    // Landscaped Garden Mulch Bed between Walkway and Driveway
    if (Math.abs(garageX - pathX) > 2.5) {
      const bedW = Math.abs(garageX - pathX) - (driveW / 2 + 0.8);
      if (bedW > 0.5) {
        const bedGeom = new THREE.BoxGeometry(bedW, 0.04, pathL - 1.5);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x3f2715, roughness: 0.95 }); // dark rich mulch
        const bedMesh = new THREE.Mesh(bedGeom, bedMat);
        bedMesh.position.set((pathX + garageX) / 2, 0.02, lotFront / 2);
        this.buildingGroup.add(bedMesh);
      }
    }
  }

  private buildBoundariesAndFences(): void {
    if (!this.design) return;
    const boundary = this.design.boundary || DEFAULT_BOUNDARY_CONFIG;
    const setbackFront = boundary.frontSetbackM || 4.5;
    const setbackRear = boundary.rearSetbackM || 3.5;
    const setbackLeft = boundary.leftSetbackM || 1.2;
    const setbackRight = boundary.rightSetbackM || 1.0;

    const lotLeft = -setbackLeft;
    const lotRight = this.design.widthM + setbackRight;
    const lotFront = -setbackFront;
    const lotRear = this.design.lengthM + setbackRear;
    const fenceH = boundary.fenceHeightM || 1.80;

    // 1. Cadastral Survey Boundary Pegs (4 lot corners)
    const corners = [
      [lotLeft, lotFront],
      [lotRight, lotFront],
      [lotLeft, lotRear],
      [lotRight, lotRear],
    ];
    corners.forEach(([cx, cz]) => {
      const pegGeom = new THREE.BoxGeometry(0.06, 0.35, 0.06);
      const pegMesh = new THREE.Mesh(pegGeom, this.materials.surveyPeg);
      pegMesh.position.set(cx, 0.175, cz);
      this.boundaryGroup.add(pegMesh);

      const topGeom = new THREE.BoxGeometry(0.065, 0.06, 0.065);
      const topMesh = new THREE.Mesh(topGeom, this.materials.surveyPegTop);
      topMesh.position.set(cx, 0.33, cz);
      this.boundaryGroup.add(topMesh);
    });

    // 2. Lot Boundary Perimeter Cadastral Line
    const linePoints = [
      new THREE.Vector3(lotLeft, 0.015, lotFront),
      new THREE.Vector3(lotRight, 0.015, lotFront),
      new THREE.Vector3(lotRight, 0.015, lotRear),
      new THREE.Vector3(lotLeft, 0.015, lotRear),
      new THREE.Vector3(lotLeft, 0.015, lotFront),
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2, transparent: true, opacity: 0.65 });
    const boundaryLine = new THREE.Line(lineGeom, lineMat);
    this.boundaryGroup.add(boundaryLine);

    if (!boundary.showFencing) return;

    // 3. Fencing Style Selection
    let fenceMat = this.materials.colorbondFence;
    let postMat = this.materials.frame;
    if (boundary.fenceStyle === "treated_pine") {
      fenceMat = this.materials.timberFence;
      postMat = this.materials.barnDoorWood;
    } else if (boundary.fenceStyle === "rendered_brick") {
      fenceMat = this.materials.brick;
      postMat = this.materials.renderMonument;
    }

    const addFenceRun = (x1: number, z1: number, x2: number, z2: number) => {
      const p1 = new THREE.Vector2(x1, z1);
      const p2 = new THREE.Vector2(x2, z2);
      const len = p1.distanceTo(p2);
      if (len < 0.1) return;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;

      const panelGeom = new THREE.BoxGeometry(len, fenceH - 0.08, 0.04);
      const panelMesh = new THREE.Mesh(panelGeom, fenceMat);
      panelMesh.position.set(midX, (fenceH - 0.08) / 2, midZ);
      panelMesh.rotation.y = -angle;
      panelMesh.castShadow = true;
      panelMesh.receiveShadow = true;
      this.boundaryGroup.add(panelMesh);

      const capGeom = new THREE.BoxGeometry(len, 0.06, 0.07);
      const capMesh = new THREE.Mesh(capGeom, postMat);
      capMesh.position.set(midX, fenceH - 0.03, midZ);
      capMesh.rotation.y = -angle;
      capMesh.castShadow = true;
      this.boundaryGroup.add(capMesh);

      const numPosts = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i <= numPosts; i++) {
        const t = i / numPosts;
        const postX = p1.x + Math.cos(angle) * (len * t);
        const postZ = p1.y + Math.sin(angle) * (len * t);
        const postGeom = new THREE.BoxGeometry(0.08, fenceH + 0.06, 0.08);
        const postMesh = new THREE.Mesh(postGeom, postMat);
        postMesh.position.set(postX, (fenceH + 0.06) / 2, postZ);
        postMesh.rotation.y = -angle;
        postMesh.castShadow = true;
        this.boundaryGroup.add(postMesh);
      }
    };

    // A. Rear Boundary Fence
    addFenceRun(lotLeft, lotRear, lotRight, lotRear);

    // B. Left Boundary Fence
    addFenceRun(lotLeft, lotRear, lotLeft, 0.0);

    // C. Right Boundary Fence
    addFenceRun(lotRight, lotRear, lotRight, 0.0);

    // D. Left Side Return Wing Fence with 900mm Pedestrian Gate
    const wingZ = 1.8;
    if (boundary.hasSideGates && Math.abs(lotLeft) >= 1.0) {
      const gateWidth = 0.90;
      const wingFenceEnd = -gateWidth;
      addFenceRun(lotLeft, wingZ, wingFenceEnd, wingZ);

      // 900mm Pedestrian Side Access Gate
      const gateMidX = wingFenceEnd + gateWidth / 2;
      const gateGeom = new THREE.BoxGeometry(gateWidth - 0.04, fenceH - 0.12, 0.035);
      const gateMesh = new THREE.Mesh(gateGeom, fenceMat);
      gateMesh.position.set(gateMidX, (fenceH - 0.12) / 2, wingZ);
      gateMesh.castShadow = true;
      this.boundaryGroup.add(gateMesh);

      const frameGeom = new THREE.BoxGeometry(gateWidth - 0.02, 0.05, 0.045);
      const topFrame = new THREE.Mesh(frameGeom, postMat);
      topFrame.position.set(gateMidX, fenceH - 0.12, wingZ);
      this.boundaryGroup.add(topFrame);
      const botFrame = new THREE.Mesh(frameGeom, postMat);
      botFrame.position.set(gateMidX, 0.06, wingZ);
      this.boundaryGroup.add(botFrame);

      const latchGeom = new THREE.BoxGeometry(0.04, 0.14, 0.08);
      const latchMesh = new THREE.Mesh(latchGeom, this.materials.barnDoorIron);
      latchMesh.position.set(wingFenceEnd + gateWidth - 0.08, 1.05, wingZ);
      this.boundaryGroup.add(latchMesh);
    } else {
      addFenceRun(lotLeft, wingZ, 0, wingZ);
    }

    // E. Right Side Return Wing Fence
    addFenceRun(this.design.widthM, wingZ, lotRight, wingZ);
  }

  private buildFacadeFeatures(): void {
    if (!this.design) return;
    const facade: FacadeType = this.design.facade || this.design.materials?.facade || "modern";
    const customFacade: CustomFacadeConfig = {
      ...DEFAULT_CUSTOM_FACADE_CONFIG,
      ...(this.design.customFacade || {}),
    };
    const ceilingH = this.design.ceilingHeightM;
    const ffl = 0.30;
    const porchH = ceilingH;

    const porch = (this.design.rooms || []).find((r) => r.name.toLowerCase().includes("porch"));
    const porchP1 = porch && porch.polygon && porch.polygon.length > 0 ? porch.polygon[0] : [5.6, 0.0];
    const porchP2 = porch && porch.polygon && porch.polygon.length > 1 ? porch.polygon[1] : [7.4, 0.0];
    const colX = porchP1[0];
    const colZ = porchP1[1];
    const porchMidX = (porchP1[0] + porchP2[0]) / 2;
    const porchSpanW = Math.max(1.6, Math.abs(porchP2[0] - porchP1[0]));
    const projDepth = Math.max(0.8, customFacade.porticoProjectionM || 1.4);

    // 1. FRONT ENTRY PORTICO & FACADE ARTICULATION
    if (facade === "hamptons" || customFacade.porticoStyle === "pitched_gable") {
      // HAMPTONS COASTAL / PITCHED GABLE FACADE
      const postGeom = new THREE.BoxGeometry(0.14, porchH, 0.14);
      const postMesh = new THREE.Mesh(postGeom, this.materials.renderWhite);
      postMesh.position.set(colX, ffl + porchH / 2, colZ);
      postMesh.castShadow = true;
      this.facadeGroup.add(postMesh);

      const capGeom = new THREE.BoxGeometry(0.20, 0.08, 0.20);
      const capMesh = new THREE.Mesh(capGeom, this.materials.renderWhite);
      capMesh.position.set(colX, ffl + porchH - 0.04, colZ);
      this.facadeGroup.add(capMesh);

      const plinthGeom = new THREE.BoxGeometry(0.24, 0.28, 0.24);
      const plinthMesh = new THREE.Mesh(plinthGeom, this.materials.renderWhite);
      plinthMesh.position.set(colX, ffl + 0.14, colZ);
      this.facadeGroup.add(plinthMesh);

      // Scyon Linea Cladding Front Gable Peak
      const gableW = Math.max(3.2, porchSpanW + 1.2);
      const gableH = 1.35;
      const gableGeom = new THREE.ConeGeometry(gableW / 2, gableH, 4);
      const gableMesh = new THREE.Mesh(gableGeom, this.materials.cladding);
      gableMesh.rotation.y = Math.PI / 4;
      gableMesh.position.set(porchMidX, ffl + porchH + gableH / 2, colZ - 0.05);
      gableMesh.scale.set(1, 1, 0.08);
      this.facadeGroup.add(gableMesh);

      const trimGeom = new THREE.BoxGeometry(gableW * 0.78, 0.09, 0.08);
      const trimMesh = new THREE.Mesh(trimGeom, this.materials.renderWhite);
      trimMesh.position.set(porchMidX, ffl + porchH + 0.04, colZ);
      this.facadeGroup.add(trimMesh);

    } else if (
      facade === "executive" ||
      facade === "acreage_homestead" ||
      customFacade.porticoStyle === "double_brick_piers"
    ) {
      // EXECUTIVE GRANDE / ACREAGE HOMESTEAD FACADE (Substantial 470x470 Twin/Corner Brick Piers)
      const pierGeom = new THREE.BoxGeometry(0.47, porchH, 0.47);
      const pierMesh = new THREE.Mesh(pierGeom, this.materials.brick);
      pierMesh.position.set(colX, ffl + porchH / 2, colZ);
      pierMesh.castShadow = true;
      this.facadeGroup.add(pierMesh);

      const stoneCapGeom = new THREE.BoxGeometry(0.54, 0.09, 0.54);
      const stoneCapMesh = new THREE.Mesh(stoneCapGeom, this.materials.stoneCap);
      stoneCapMesh.position.set(colX, ffl + porchH - 0.045, colZ);
      this.facadeGroup.add(stoneCapMesh);

      // Second matching pier on right side of portico
      const pier2Mesh = new THREE.Mesh(pierGeom, this.materials.brick);
      pier2Mesh.position.set(porchP2[0], ffl + porchH / 2, colZ);
      pier2Mesh.castShadow = true;
      this.facadeGroup.add(pier2Mesh);

      const stoneCap2Mesh = new THREE.Mesh(stoneCapGeom, this.materials.stoneCap);
      stoneCap2Mesh.position.set(porchP2[0], ffl + porchH - 0.045, colZ);
      this.facadeGroup.add(stoneCap2Mesh);

      const beamW = porchSpanW + 0.65;
      const beamGeom = new THREE.BoxGeometry(beamW, 0.30, 0.38);
      const beamMesh = new THREE.Mesh(beamGeom, this.materials.renderMonument);
      beamMesh.position.set(porchMidX, ffl + porchH - 0.15, colZ);
      beamMesh.castShadow = true;
      this.facadeGroup.add(beamMesh);

    } else if (facade === "contempo" || customFacade.porticoStyle === "cedar_batten_screen") {
      // CONTEMPO TIMBER / CEDAR BATTEN SCREEN FACADE
      const battenCount = 7;
      const screenW = 1.1;
      for (let i = 0; i < battenCount; i++) {
        const bx = colX - screenW / 2 + (i / (battenCount - 1)) * screenW;
        const battenGeom = new THREE.BoxGeometry(0.055, porchH, 0.045);
        const battenMesh = new THREE.Mesh(battenGeom, this.materials.cedarBatten);
        battenMesh.position.set(bx, ffl + porchH / 2, colZ);
        battenMesh.castShadow = true;
        this.facadeGroup.add(battenMesh);
      }

      const canopyW = porchSpanW + 0.9;
      const canopyGeom = new THREE.BoxGeometry(canopyW, 0.16, projDepth);
      const canopyMesh = new THREE.Mesh(canopyGeom, this.materials.renderMonument);
      canopyMesh.position.set(porchMidX, ffl + porchH, colZ + projDepth * 0.4);
      canopyMesh.castShadow = true;
      this.facadeGroup.add(canopyMesh);

    } else if (
      facade === "bronte" ||
      facade === "palm_springs_parapet" ||
      customFacade.rooflineStyle === "box_parapet"
    ) {
      // BRONTE DESIGNER / PALM SPRINGS BOX PARAPET FACADE
      const colGeom = new THREE.BoxGeometry(0.18, porchH, 0.18);
      const colMesh = new THREE.Mesh(colGeom, this.materials.renderWhite);
      colMesh.position.set(colX, ffl + porchH / 2, colZ);
      colMesh.castShadow = true;
      this.facadeGroup.add(colMesh);

      const slabW = porchSpanW + 0.8;
      const slabGeom = new THREE.BoxGeometry(slabW, 0.24, projDepth);
      const slabMesh = new THREE.Mesh(slabGeom, this.materials.renderWhite);
      slabMesh.position.set(porchMidX, ffl + porchH, colZ + projDepth * 0.35);
      slabMesh.castShadow = true;
      this.facadeGroup.add(slabMesh);

      // Architectural Box Parapet Fascia across front master & portico
      const parapetW = Math.min(this.design.widthM * 0.65, porchP2[0] + 0.5);
      const parapetGeom = new THREE.BoxGeometry(parapetW, 0.65, 0.28);
      const parapetMesh = new THREE.Mesh(parapetGeom, this.materials.renderWhite);
      parapetMesh.position.set(parapetW / 2, ffl + porchH + 0.32, colZ + 0.12);
      parapetMesh.castShadow = true;
      this.facadeGroup.add(parapetMesh);

    } else if (facade === "skillion" || customFacade.rooflineStyle === "skillion_mono") {
      // ARCHITECTURAL SKILLION MONO-PITCH FACADE
      const pierGeom = new THREE.BoxGeometry(0.32, porchH + 0.35, 0.32);
      const pierMesh = new THREE.Mesh(pierGeom, this.materials.renderMonument);
      pierMesh.position.set(colX, ffl + (porchH + 0.35) / 2, colZ);
      pierMesh.castShadow = true;
      this.facadeGroup.add(pierMesh);

      // Raked Skillion Canopy over Portico
      const canopyW = porchSpanW + 1.1;
      const canopyGeom = new THREE.BoxGeometry(canopyW, 0.18, projDepth + 0.4);
      const canopyMesh = new THREE.Mesh(canopyGeom, this.materials.renderMonument);
      canopyMesh.position.set(porchMidX, ffl + porchH + 0.22, colZ + 0.35);
      canopyMesh.rotation.z = 0.14; // Raked 8-degree skillion tilt
      canopyMesh.castShadow = true;
      this.facadeGroup.add(canopyMesh);

    } else {
      // MODERN METRO / CANTILEVER PORTICO FACADE
      const pierGeom = new THREE.BoxGeometry(0.36, porchH, 0.36);
      const pierMesh = new THREE.Mesh(pierGeom, this.materials.renderMonument);
      pierMesh.position.set(colX, ffl + porchH / 2, colZ);
      pierMesh.castShadow = true;
      this.facadeGroup.add(pierMesh);

      const beamW = porchSpanW + 0.55;
      const beamGeom = new THREE.BoxGeometry(beamW, 0.24, 0.28);
      const beamMesh = new THREE.Mesh(beamGeom, this.materials.renderWhite);
      beamMesh.position.set(porchMidX, ffl + porchH - 0.12, colZ);
      beamMesh.castShadow = true;
      this.facadeGroup.add(beamMesh);
    }

    // 2. CUSTOM DESIGN-TAILORED FEATURE BLADE WALL & GARAGE ARTICULATION
    if (customFacade.featureBladeWall) {
      const bladeH = porchH + 0.45;
      const bladeGeom = new THREE.BoxGeometry(0.28, bladeH, projDepth * 0.85);
      const bladeMat =
        customFacade.accentMaterial === "austral_face_brick"
          ? this.materials.brick
          : customFacade.accentMaterial === "cedar_timber_batten"
          ? this.materials.cedarBatten
          : this.materials.renderMonument;
      const bladeMesh = new THREE.Mesh(bladeGeom, bladeMat);
      bladeMesh.position.set(porchP1[0] - 0.18, ffl + bladeH / 2, colZ + 0.25);
      bladeMesh.castShadow = true;
      this.facadeGroup.add(bladeMesh);
    }

    if (customFacade.garageArticulation === "cantilever_brow") {
      const garOp = (this.design.openings || []).find((op) => op.type === "garage_door");
      if (garOp) {
        const browW = garOp.width + 0.9;
        const browGeom = new THREE.BoxGeometry(browW, 0.16, 0.65);
        const browMesh = new THREE.Mesh(browGeom, this.materials.renderWhite);
        browMesh.position.set(garOp.position[0], ffl + garOp.headHeight + 0.15, garOp.position[1] - 0.25);
        browMesh.castShadow = true;
        this.facadeGroup.add(browMesh);
      }
    }

    // 3. REAR OPEN COVERED ALFRESCO STRUCTURAL CORNER PIER & LINTEL BEAMS
    // Ensures every Alfresco zone is rendered as an open covered pavilion with a corner pier!
    const alfresco = (this.design.rooms || []).find((r) => r.name.toLowerCase().includes("alfresco"));
    if (alfresco && alfresco.polygon && alfresco.polygon.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const pt of alfresco.polygon) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minZ) minZ = pt[1];
        if (pt[1] > maxZ) maxZ = pt[1];
      }
      // Determine outer open corner of Alfresco (furthest towards building perimeter)
      const isLeftSide = minX <= 0.6;
      const outerCornerX = isLeftSide ? minX + 0.19 : maxX - 0.19;
      const outerCornerZ = maxZ - 0.19;
      const houseSideX = isLeftSide ? maxX : minX;
      const houseSideZ = minZ;

      // 350mm x 350mm Structural Corner Brick/Render Pier supporting Alfresco Roof
      const alfPierGeom = new THREE.BoxGeometry(0.36, porchH, 0.36);
      const alfPierMat =
        facade === "modern" || facade === "contempo" || facade === "skillion"
          ? this.materials.renderMonument
          : this.materials.brick;
      const alfPierMesh = new THREE.Mesh(alfPierGeom, alfPierMat);
      alfPierMesh.position.set(outerCornerX, ffl + porchH / 2, outerCornerZ);
      alfPierMesh.castShadow = true;
      alfPierMesh.receiveShadow = true;
      this.facadeGroup.add(alfPierMesh);

      // Rear Horizontal Overhead Lintel Beam (from house corner to Alfresco corner pier)
      const rearSpanW = Math.abs(houseSideX - outerCornerX) + 0.36;
      const rearBeamGeom = new THREE.BoxGeometry(rearSpanW, 0.24, 0.28);
      const rearBeamMesh = new THREE.Mesh(rearBeamGeom, this.materials.renderWhite);
      rearBeamMesh.position.set((houseSideX + outerCornerX) / 2, ffl + porchH - 0.12, outerCornerZ);
      rearBeamMesh.castShadow = true;
      this.facadeGroup.add(rearBeamMesh);

      // Side Overhead Lintel Beam (from house rear wall out to Alfresco corner pier)
      const sideSpanD = Math.abs(outerCornerZ - houseSideZ) + 0.36;
      const sideBeamGeom = new THREE.BoxGeometry(0.28, 0.24, sideSpanD);
      const sideBeamMesh = new THREE.Mesh(sideBeamGeom, this.materials.renderWhite);
      sideBeamMesh.position.set(outerCornerX, ffl + porchH - 0.12, (houseSideZ + outerCornerZ) / 2);
      sideBeamMesh.castShadow = true;
      this.facadeGroup.add(sideBeamMesh);
    }
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

    const facade: FacadeType = this.design?.facade || this.design?.materials?.facade || "modern";

    if (op.type === "barn_door") {
      // High-Detail Timber Barn Door with Top Black Steel Roller Track
      const trackGeom = new THREE.CylinderGeometry(0.015, 0.015, op.width * 1.8, 16);
      const trackMesh = new THREE.Mesh(trackGeom, this.materials.barnDoorIron);
      trackMesh.rotation.z = Math.PI / 2;
      trackMesh.position.set(0, op.headHeight + 0.08, 0.06);
      group.add(trackMesh);

      const slabGeom = new THREE.BoxGeometry(op.width, op.height, 0.04);
      const slabMesh = new THREE.Mesh(slabGeom, this.materials.barnDoorWood);
      slabMesh.position.set(0, op.height / 2, 0.06);
      slabMesh.castShadow = true;
      group.add(slabMesh);

      const roller1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller1.position.set(-op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller1);
      const roller2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller2.position.set(op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller2);

    } else if (op.type === "garage_door") {
      // High-Detail 4-Panel Sectional Garage Door
      const doorGeom = new THREE.BoxGeometry(op.width, op.height, 0.05);
      const doorMesh = new THREE.Mesh(doorGeom, this.materials.garageDoor);
      doorMesh.position.set(0, op.height / 2, 0);
      doorMesh.castShadow = true;
      group.add(doorMesh);

      // Perimeter Weatherstrip Trim
      const trimTopGeom = new THREE.BoxGeometry(op.width + 0.06, 0.04, 0.07);
      const trimTopMesh = new THREE.Mesh(trimTopGeom, this.materials.frame);
      trimTopMesh.position.set(0, op.height + 0.02, 0.01);
      group.add(trimTopMesh);

    } else if (op.type === "stacker_door" || op.type === "sliding_door") {
      // 2-Panel or 3-Panel Stacker / Sliding Glass Door with Floor Track
      const frameGeom = new THREE.BoxGeometry(op.width, op.height, 0.12);
      const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
      frameMesh.position.set(0, op.height / 2, 0);
      group.add(frameMesh);

      // Recessed Floor Track
      const trackGeom = new THREE.BoxGeometry(op.width + 0.04, 0.03, 0.14);
      const trackMesh = new THREE.Mesh(trackGeom, this.materials.frame);
      trackMesh.position.set(0, 0.015, 0);
      group.add(trackMesh);

      // Multiple Glazed Sliding Sashes
      const isStacker = op.type === "stacker_door" || op.width >= 3.0;
      const panelCount = isStacker ? 3 : 2;
      const panelW = (op.width - 0.08) / panelCount;
      for (let p = 0; p < panelCount; p++) {
        const pX = -((op.width - 0.08) / 2) + panelW / 2 + p * panelW;
        const pZ = (p % 2 === 0 ? 0.02 : -0.02);

        const glassGeom = new THREE.BoxGeometry(panelW - 0.04, op.height - 0.10, 0.015);
        const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
        glassMesh.position.set(pX, op.height / 2, pZ);
        group.add(glassMesh);

        // Stile frame bar
        const stileGeom = new THREE.BoxGeometry(0.04, op.height - 0.06, 0.035);
        const stileMesh = new THREE.Mesh(stileGeom, this.materials.frame);
        stileMesh.position.set(pX + panelW / 2 - 0.02, op.height / 2, pZ);
        group.add(stileMesh);
      }

    } else if (op.type === "window") {
      // Architectural Window with Projecting 50mm Sill Ledge
      const sillGeom = new THREE.BoxGeometry(op.width + 0.08, 0.05, 0.09);
      const sillMesh = new THREE.Mesh(sillGeom, this.materials.stoneCap);
      sillMesh.position.set(0, op.sillHeight - 0.025, 0.06);
      sillMesh.castShadow = true;
      group.add(sillMesh);

      // Outer Perimeter Aluminium Frame
      const frameGeom = new THREE.BoxGeometry(op.width, op.height, 0.10);
      const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
      frameMesh.position.set(0, op.sillHeight + op.height / 2, 0);
      group.add(frameMesh);

      // Glazing Pane
      const glassGeom = new THREE.BoxGeometry(op.width - 0.08, op.height - 0.08, 0.02);
      const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
      glassMesh.position.set(0, op.sillHeight + op.height / 2, 0);
      group.add(glassMesh);

      // Center Sash Mullion
      const mullionGeom = new THREE.BoxGeometry(0.035, op.height - 0.06, 0.035);
      const mullionMesh = new THREE.Mesh(mullionGeom, this.materials.frame);
      mullionMesh.position.set(0, op.sillHeight + op.height / 2, 0.015);
      group.add(mullionMesh);

      // Hamptons Colonial Glazing Bars (Crisp White Cross Grid)
      if (facade === "hamptons") {
        const barMat = this.materials.renderWhite;
        [-op.height * 0.22, op.height * 0.22].forEach((offsetY) => {
          const hBarGeom = new THREE.BoxGeometry(op.width - 0.08, 0.018, 0.018);
          const hBarMesh = new THREE.Mesh(hBarGeom, barMat);
          hBarMesh.position.set(0, op.sillHeight + op.height / 2 + offsetY, 0.018);
          group.add(hBarMesh);
        });
      }

    } else if (op.type === "archway") {
      return;

    } else {
      // HINGED DOORS: Front Entry vs Standard Hinged
      const isFrontEntry = op.isExterior && (op.code.includes("EXT") || op.label.toLowerCase().includes("entry"));

      if (isFrontEntry) {
        // Grand Front Entry Door (1020mm Pivot Door with Frosted Sidelight)
        const frameGeom = new THREE.BoxGeometry(op.width, op.height, 0.12);
        const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
        frameMesh.position.set(0, op.height / 2, 0);
        group.add(frameMesh);

        const hasSidelight = op.width >= 1.0;
        const doorSlabW = hasSidelight ? 0.82 : op.width - 0.06;
        const sidelightW = hasSidelight ? op.width - 0.88 : 0;
        const doorSlabX = hasSidelight ? (op.width / 2 - doorSlabW / 2) : 0;

        // Front Door Slab
        let doorMat = this.materials.renderMonument;
        if (facade === "hamptons") doorMat = this.materials.renderWhite;
        if (facade === "contempo") doorMat = this.materials.cedarBatten;

        const doorGeom = new THREE.BoxGeometry(doorSlabW, op.height - 0.06, 0.045);
        const doorMesh = new THREE.Mesh(doorGeom, doorMat);
        doorMesh.position.set(doorSlabX, op.height / 2, 0.01);
        doorMesh.castShadow = true;
        group.add(doorMesh);

        // Frosted Sidelight Window Panel
        if (hasSidelight) {
          const sideX = -op.width / 2 + sidelightW / 2 + 0.03;
          const sideGeom = new THREE.BoxGeometry(sidelightW, op.height - 0.08, 0.02);
          const sideMesh = new THREE.Mesh(sideGeom, this.materials.frostedGlass);
          sideMesh.position.set(sideX, op.height / 2, 0);
          group.add(sideMesh);
        }

        // Architectural 1200mm Vertical Stainless Steel Pull Handle
        const handleX = doorSlabX - doorSlabW / 2 + 0.10;
        const handleGeom = new THREE.CylinderGeometry(0.014, 0.014, 1.20, 16);
        const handleMesh = new THREE.Mesh(handleGeom, this.materials.stainlessSteel);
        handleMesh.position.set(handleX, 1.05, 0.065);
        group.add(handleMesh);

        // Standoff mount brackets
        [-0.50, 0.50].forEach((offsetY) => {
          const mountGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.04, 16);
          const mountMesh = new THREE.Mesh(mountGeom, this.materials.stainlessSteel);
          mountMesh.rotation.x = Math.PI / 2;
          mountMesh.position.set(handleX, 1.05 + offsetY, 0.04);
          group.add(mountMesh);
        });

      } else {
        // Standard Hinged Door (Internal or Garage External)
        const doorGeom = new THREE.BoxGeometry(op.width, op.height, 0.04);
        const doorMat = op.isExterior ? this.materials.renderMonument : this.materials.interiorWall;
        const doorMesh = new THREE.Mesh(doorGeom, doorMat);
        doorMesh.position.set(0, op.height / 2, 0);
        group.add(doorMesh);

        // Chrome Door Lever Handle
        const leverGeom = new THREE.BoxGeometry(0.12, 0.02, 0.05);
        const leverMesh = new THREE.Mesh(leverGeom, this.materials.stainlessSteel);
        leverMesh.position.set(op.width * 0.35, 1.0, 0.03);
        group.add(leverMesh);
      }
    }

    group.position.set(x, ffl, z);
    group.rotation.y = -angle;
    this.buildingGroup.add(group);
  }

  private buildFixtures(): void {
    if (!this.design) return;
    const ffl = 0.30;
    const fitout: InteriorFitoutConfig = {
      ...DEFAULT_FITOUT_CONFIG,
      ...(this.design.fitout || {}),
    };

    // Material helpers driven by InteriorFitoutConfig
    const stoneHex =
      fitout.stoneColor === "carrara_marble"
        ? 0xf1f5f9
        : fitout.stoneColor === "concrete_grey"
        ? 0x94a3b8
        : fitout.stoneColor === "empirical_black"
        ? 0x1e293b
        : 0xf8fafc; // calacatta_white
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneHex,
      roughness: 0.14,
      metalness: 0.08,
    });

    const cabHex =
      fitout.cabinetryFinish === "natural_oak"
        ? 0xb45309
        : fitout.cabinetryFinish === "florentine_walnut"
        ? 0x5c3a21
        : fitout.cabinetryFinish === "botanic_sage"
        ? 0x4d6b53
        : fitout.cabinetryFinish === "matte_white"
        ? 0xf8fafc
        : 0x334155; //polytec_charcoal
    const cabMat = new THREE.MeshStandardMaterial({
      color: cabHex,
      roughness: 0.38,
      metalness: 0.05,
    });

    const tapHex =
      fitout.tapwareFinish === "matte_black"
        ? 0x0f172a
        : fitout.tapwareFinish === "brushed_brass"
        ? 0xd97706
        : fitout.tapwareFinish === "brushed_nickel"
        ? 0x94a3b8
        : 0xe2e8f0; // chrome
    const tapMat = new THREE.MeshStandardMaterial({
      color: tapHex,
      roughness: 0.12,
      metalness: 0.92,
    });

    const sinkBowlMat = new THREE.MeshStandardMaterial({
      color: fitout.sinkStyle === "matte_black_granite" ? 0x18181b : 0x64748b,
      roughness: 0.2,
      metalness: 0.85,
    });

    const stoneThicknessM = fitout.benchtopThicknessMm === 40 ? 0.045 : 0.022;

    (this.design.fixtures || []).forEach((fix) => {
      const isJoineryType =
        fix.type === "kitchen_island" ||
        fix.type === "kitchen_cabinetry" ||
        fix.type === "butler_pantry" ||
        fix.type === "vanity_double" ||
        fix.type === "vanity_single" ||
        fix.type === "shower" ||
        fix.type === "bath" ||
        fix.type === "toilet";
      const isFurnitureType = !isJoineryType;

      if (isJoineryType && fitout.showJoineryAndSinks === false) return;
      if (isFurnitureType && fitout.showFurniture === false) return;

      const group = new THREE.Group();

      if (fix.type === "kitchen_island") {
        // 1. Base Cabinetry Carcass
        const carcassH = fix.height - stoneThicknessM;
        const carcassGeom = new THREE.BoxGeometry(fix.width - 0.08, carcassH, fix.depth - 0.06);
        const carcassMesh = new THREE.Mesh(carcassGeom, cabMat);
        carcassMesh.position.y = carcassH / 2;
        carcassMesh.castShadow = true;
        carcassMesh.receiveShadow = true;
        group.add(carcassMesh);

        // 2. Caesarstone Benchtop Slab (20mm or 40mm)
        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        group.add(topMesh);

        // 3. Optional 40mm Waterfall Stone Ends (Left & Right Vertical Stone Drops)
        if (fitout.waterfallEnds) {
          const wfGeom = new THREE.BoxGeometry(stoneThicknessM, fix.height, fix.depth);
          const wfLeft = new THREE.Mesh(wfGeom, stoneMat);
          wfLeft.position.set(-fix.width / 2 + stoneThicknessM / 2, fix.height / 2, 0);
          wfLeft.castShadow = true;
          group.add(wfLeft);

          const wfRight = new THREE.Mesh(wfGeom, stoneMat);
          wfRight.position.set(fix.width / 2 - stoneThicknessM / 2, fix.height / 2, 0);
          wfRight.castShadow = true;
          group.add(wfRight);
        }

        // 4. Undermount Double or Single Sink Bowls + Drain + Gooseneck Mixer Tap
        const isDoubleSink = fitout.sinkStyle !== "single_wide_bowl";
        if (isDoubleSink) {
          [-0.22, 0.22].forEach((offsetX) => {
            const bowlGeom = new THREE.BoxGeometry(0.38, 0.02, 0.42);
            const bowlMesh = new THREE.Mesh(bowlGeom, sinkBowlMat);
            bowlMesh.position.set(offsetX, fix.height + 0.004, 0.05);
            group.add(bowlMesh);
          });
        } else {
          const bowlGeom = new THREE.BoxGeometry(0.76, 0.02, 0.44);
          const bowlMesh = new THREE.Mesh(bowlGeom, sinkBowlMat);
          bowlMesh.position.set(0, fix.height + 0.004, 0.05);
          group.add(bowlMesh);
        }

        // Gooseneck Mixer Tap Stem + Spout Arch
        const tapStemGeom = new THREE.CylinderGeometry(0.016, 0.018, 0.34, 16);
        const tapStem = new THREE.Mesh(tapStemGeom, tapMat);
        tapStem.position.set(0, fix.height + 0.17, -0.22);
        group.add(tapStem);

        const spoutGeom = new THREE.BoxGeometry(0.025, 0.025, 0.20);
        const spoutMesh = new THREE.Mesh(spoutGeom, tapMat);
        spoutMesh.position.set(0, fix.height + 0.33, -0.13);
        group.add(spoutMesh);

        // 5. Three Breakfast Bar Stools on Dining Side of Island
        if (fitout.showFurniture !== false) {
          [-fix.width * 0.28, 0, fix.width * 0.28].forEach((stoolX) => {
            const legGeom = new THREE.CylinderGeometry(0.02, 0.16, 0.64, 12);
            const legMesh = new THREE.Mesh(legGeom, tapMat);
            legMesh.position.set(stoolX, 0.32, fix.depth / 2 + 0.28);
            group.add(legMesh);

            const seatGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
            const seatMesh = new THREE.Mesh(seatGeom, cabMat);
            seatMesh.position.set(stoolX, 0.65, fix.depth / 2 + 0.28);
            group.add(seatMesh);
          });
        }

      } else if (fix.type === "kitchen_cabinetry") {
        // Rear Kitchen Benchtop + Base Cabinetry + 900mm Induction Cooktop & Underbench Oven + Overhead Cupboards
        const carcassH = fix.height - stoneThicknessM;
        const baseGeom = new THREE.BoxGeometry(fix.width, carcassH, fix.depth);
        const baseMesh = new THREE.Mesh(baseGeom, cabMat);
        baseMesh.position.y = carcassH / 2;
        baseMesh.castShadow = true;
        group.add(baseMesh);

        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth + 0.02);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        group.add(topMesh);

        // 900mm Ceramic Black Glass Cooktop
        const cooktopGeom = new THREE.BoxGeometry(0.90, 0.015, 0.50);
        const cooktopMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.08, metalness: 0.6 });
        const cooktopMesh = new THREE.Mesh(cooktopGeom, cooktopMat);
        cooktopMesh.position.set(0, fix.height + 0.008, 0);
        group.add(cooktopMesh);

        // 900mm Underbench Oven Front Fascia
        const ovenGeom = new THREE.BoxGeometry(0.88, 0.58, 0.03);
        const ovenMesh = new THREE.Mesh(ovenGeom, cooktopMat);
        ovenMesh.position.set(0, 0.45, fix.depth / 2 + 0.01);
        group.add(ovenMesh);

        // Overhead Wall Cupboards (mounted at 1.50m to 2.15m)
        const ohGeom = new THREE.BoxGeometry(fix.width, 0.65, 0.36);
        const ohMesh = new THREE.Mesh(ohGeom, cabMat);
        ohMesh.position.set(0, 1.82, -fix.depth / 2 + 0.18);
        ohMesh.castShadow = true;
        group.add(ohMesh);

      } else if (fix.type === "butler_pantry") {
        // Walk-In / Butler's Pantry Joinery Benchtop + Prep Sink & Mixer
        const carcassH = fix.height - stoneThicknessM;
        const baseGeom = new THREE.BoxGeometry(fix.width, carcassH, fix.depth);
        const baseMesh = new THREE.Mesh(baseGeom, cabMat);
        baseMesh.position.y = carcassH / 2;
        group.add(baseMesh);

        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        group.add(topMesh);

        const bowlGeom = new THREE.BoxGeometry(0.42, 0.02, 0.38);
        const bowlMesh = new THREE.Mesh(bowlGeom, sinkBowlMat);
        bowlMesh.position.set(0, fix.height + 0.005, 0);
        group.add(bowlMesh);

        const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12), tapMat);
        tapStem.position.set(0, fix.height + 0.14, -0.18);
        group.add(tapStem);

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
        // Floating Bathroom Vanity Cabinet + Stone Top + Ceramic Basin(s) + Mixer Tap(s) + Frameless Mirror
        const vanityW =
          fix.roomName.toLowerCase().includes("ensuite") && fitout.ensuiteVanityStyle === "double_1800"
            ? Math.max(fix.width, 1.75)
            : fix.width;
        const cabH = 0.52;
        const vanityGeom = new THREE.BoxGeometry(vanityW, cabH, fix.depth);
        const vanityMesh = new THREE.Mesh(vanityGeom, cabMat);
        vanityMesh.position.y = 0.28 + cabH / 2; // Floating 280mm off floor
        vanityMesh.castShadow = true;
        group.add(vanityMesh);

        const vTopGeom = new THREE.BoxGeometry(vanityW + 0.02, stoneThicknessM, fix.depth + 0.02);
        const vTopMesh = new THREE.Mesh(vTopGeom, stoneMat);
        vTopMesh.position.y = fix.height - stoneThicknessM / 2;
        group.add(vTopMesh);

        // Ceramic Above-Counter Vessel Basin(s) + Mixer Taps
        const basinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const isDouble =
          fix.type === "vanity_double" ||
          (fix.roomName.toLowerCase().includes("ensuite") && fitout.ensuiteVanityStyle !== "single_1200");
        const offsets = isDouble ? [-vanityW * 0.26, vanityW * 0.26] : [0];
        offsets.forEach((bx) => {
          const basinGeom = new THREE.CylinderGeometry(0.19, 0.15, 0.12, 24);
          const basinMesh = new THREE.Mesh(basinGeom, basinMat);
          basinMesh.position.set(bx, fix.height + 0.06, 0.02);
          group.add(basinMesh);

          const vTapGeom = new THREE.CylinderGeometry(0.012, 0.014, 0.22, 12);
          const vTapMesh = new THREE.Mesh(vTapGeom, tapMat);
          vTapMesh.position.set(bx, fix.height + 0.11, -0.16);
          group.add(vTapMesh);
        });

        // Large Polished Vanity Mirror
        const mirrorGeom = new THREE.BoxGeometry(vanityW * 0.94, 0.92, 0.025);
        const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.04, metalness: 0.94 });
        const mirrorMesh = new THREE.Mesh(mirrorGeom, mirrorMat);
        mirrorMesh.position.set(0, fix.height + 0.62, -fix.depth / 2 + 0.02);
        group.add(mirrorMesh);

      } else if (fix.type === "shower") {
        // Semi-Frameless Glass Shower Enclosure + Tiled Base Hob + Rain Shower Rail
        const baseGeom = new THREE.BoxGeometry(fix.width, 0.05, fix.depth);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = 0.025;
        group.add(baseMesh);

        const showerGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const showerMesh = new THREE.Mesh(showerGeom, this.materials.glass);
        showerMesh.position.y = fix.height / 2;
        group.add(showerMesh);

        // Shower Rail & Overhead Rain Rose
        const railGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.1, 12);
        const railMesh = new THREE.Mesh(railGeom, tapMat);
        railMesh.position.set(0, 1.45, -fix.depth / 2 + 0.06);
        group.add(railMesh);

        const roseGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.015, 20);
        const roseMesh = new THREE.Mesh(roseGeom, tapMat);
        roseMesh.position.set(0, 1.98, -fix.depth / 2 + 0.22);
        group.add(roseMesh);

      } else if (fix.type === "bath") {
        // Freestanding Oval Acrylic Bathtub OR Inset Tiled Podium Bath
        const bathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        if (fitout.bathStyle === "inset_tiled") {
          const hobGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
          const hobMesh = new THREE.Mesh(hobGeom, stoneMat);
          hobMesh.position.y = fix.height / 2;
          group.add(hobMesh);

          const innerGeom = new THREE.BoxGeometry(fix.width - 0.18, 0.04, fix.depth - 0.18);
          const innerMesh = new THREE.Mesh(innerGeom, bathMat);
          innerMesh.position.y = fix.height + 0.01;
          group.add(innerMesh);
        } else {
          const bathGeom = new THREE.CylinderGeometry(fix.depth / 2, fix.depth / 2.2, fix.height, 32);
          const bathMesh = new THREE.Mesh(bathGeom, bathMat);
          bathMesh.scale.set(fix.width / fix.depth, 1, 1);
          bathMesh.position.y = fix.height / 2;
          bathMesh.castShadow = true;
          group.add(bathMesh);
        }

        // Floor-mounted Bath Filler Spout
        const spoutStand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, fix.height + 0.18, 12), tapMat);
        spoutStand.position.set(0, (fix.height + 0.18) / 2, -fix.depth / 2 - 0.06);
        group.add(spoutStand);

      } else if (fix.type === "toilet") {
        // Back-to-Wall Dual Flush Toilet Suite (Pan + Cistern)
        const toiletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
        const cisternGeom = new THREE.BoxGeometry(fix.width, fix.height, 0.18);
        const cisternMesh = new THREE.Mesh(cisternGeom, toiletMat);
        cisternMesh.position.set(0, fix.height / 2, -fix.depth / 2 + 0.09);
        group.add(cisternMesh);

        const panGeom = new THREE.CylinderGeometry(fix.width * 0.46, fix.width * 0.38, 0.42, 20);
        const panMesh = new THREE.Mesh(panGeom, toiletMat);
        panMesh.position.set(0, 0.21, 0.08);
        group.add(panMesh);

      } else if (fix.type === "bed_queen" || fix.type === "bed_double") {
        // Timber Bed Base + Upholstered Headboard + Mattress + Pillows
        const baseGeom = new THREE.BoxGeometry(fix.width, 0.28, fix.depth);
        const baseMesh = new THREE.Mesh(baseGeom, cabMat);
        baseMesh.position.y = 0.14;
        baseMesh.castShadow = true;
        group.add(baseMesh);

        const mattGeom = new THREE.BoxGeometry(fix.width - 0.06, 0.26, fix.depth - 0.08);
        const mattMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
        const mattMesh = new THREE.Mesh(mattGeom, mattMat);
        mattMesh.position.set(0, 0.41, 0.02);
        group.add(mattMesh);

        const headGeom = new THREE.BoxGeometry(fix.width, 1.05, 0.10);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
        const headMesh = new THREE.Mesh(headGeom, headMat);
        headMesh.position.set(0, 0.525, -fix.depth / 2 + 0.05);
        group.add(headMesh);

        // Two Pillows
        [-fix.width * 0.24, fix.width * 0.24].forEach((px) => {
          const pilGeom = new THREE.BoxGeometry(0.55, 0.12, 0.34);
          const pilMesh = new THREE.Mesh(pilGeom, mattMat);
          pilMesh.position.set(px, 0.60, -fix.depth / 2 + 0.32);
          group.add(pilMesh);
        });

      } else if (fix.type === "sofa_sectional") {
        // L-Shaped Plush Sectional Sofa + Timber Coffee Table
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 });
        const seatBaseGeom = new THREE.BoxGeometry(fix.width, 0.42, 0.92);
        const seatBase = new THREE.Mesh(seatBaseGeom, sofaMat);
        seatBase.position.set(0, 0.21, -fix.depth / 2 + 0.46);
        seatBase.castShadow = true;
        group.add(seatBase);

        const backRestGeom = new THREE.BoxGeometry(fix.width, 0.44, 0.22);
        const backRest = new THREE.Mesh(backRestGeom, sofaMat);
        backRest.position.set(0, 0.62, -fix.depth / 2 + 0.11);
        group.add(backRest);

        // Chaise Return
        const chaiseGeom = new THREE.BoxGeometry(0.95, 0.42, fix.depth);
        const chaiseMesh = new THREE.Mesh(chaiseGeom, sofaMat);
        chaiseMesh.position.set(fix.width / 2 - 0.475, 0.21, 0);
        group.add(chaiseMesh);

        // Coffee Table
        const ctGeom = new THREE.BoxGeometry(1.10, 0.36, 0.65);
        const ctMesh = new THREE.Mesh(ctGeom, cabMat);
        ctMesh.position.set(-0.35, 0.18, 0.35);
        group.add(ctMesh);

      } else if (fix.type === "tv_entertainment_unit") {
        // Lowline Timber Entertainment Joinery + 75" Wall-Mounted Flatscreen TV
        const unitGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const unitMesh = new THREE.Mesh(unitGeom, cabMat);
        unitMesh.position.y = fix.height / 2;
        unitMesh.castShadow = true;
        group.add(unitMesh);

        const tvGeom = new THREE.BoxGeometry(Math.min(1.85, fix.width * 0.82), 1.05, 0.04);
        const tvMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.12, metalness: 0.5 });
        const tvMesh = new THREE.Mesh(tvGeom, tvMat);
        tvMesh.position.set(0, fix.height + 0.72, -fix.depth / 2 + 0.06);
        group.add(tvMesh);

      } else if (fix.type === "dining_table") {
        // Solid Timber Dining Table + 4 Legs + 6 Dining Chairs
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.38 });
        const tableGeom = new THREE.BoxGeometry(fix.width, 0.06, fix.depth);
        const tableMesh = new THREE.Mesh(tableGeom, tableMat);
        tableMesh.position.y = fix.height;
        tableMesh.castShadow = true;
        group.add(tableMesh);

        const legOffsets = [
          [-fix.width / 2 + 0.12, -fix.depth / 2 + 0.12],
          [fix.width / 2 - 0.12, -fix.depth / 2 + 0.12],
          [-fix.width / 2 + 0.12, fix.depth / 2 - 0.12],
          [fix.width / 2 - 0.12, fix.depth / 2 - 0.12],
        ];
        legOffsets.forEach(([lx, lz]) => {
          const legGeom = new THREE.BoxGeometry(0.07, fix.height, 0.07);
          const legMesh = new THREE.Mesh(legGeom, tableMat);
          legMesh.position.set(lx, fix.height / 2, lz);
          group.add(legMesh);
        });

        // 6 Dining Chairs (3 each side)
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        [-fix.width * 0.3, 0, fix.width * 0.3].forEach((cx) => {
          [-fix.depth / 2 - 0.28, fix.depth / 2 + 0.28].forEach((cz) => {
            const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.44), chairMat);
            cSeat.position.set(cx, 0.23, cz);
            group.add(cSeat);
          });
        });

      } else {
        // Generic Joinery / Cabinetry
        const genGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const genMesh = new THREE.Mesh(genGeom, cabMat);
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

  public setElevationView(view: "north" | "south" | "east" | "west" | "perspective" | "dollhouse"): void {
    this.cameraMode = "orbit";
    if (view === "dollhouse") {
      this.setRoofMode(true, true);
      this.setPresetView("isometric");
      return;
    }
    if (view === "perspective") {
      this.setRoofMode(true, false);
      this.setPresetView("isometric");
      return;
    }
    // Direct Elevation View (orthographic angle)
    this.setRoofMode(true, false);
    const center = this.design
      ? new THREE.Vector3(this.design.widthM / 2, (this.design.ceilingHeightM + 1.2) / 2, this.design.lengthM / 2)
      : new THREE.Vector3(0, 1.2, 0);
    this.orbitTarget.copy(center);

    const maxDim = this.design ? Math.max(this.design.widthM, this.design.lengthM) : 22;
    this.orbitDistance = maxDim * 1.55;

    switch (view) {
      case "north": // Front (street side looking South at Front Facade)
        this.orbitTheta = Math.PI;
        this.orbitPhi = Math.PI / 2 - 0.001;
        break;
      case "south": // Rear (backyard looking North at Rear Wall)
        this.orbitTheta = 0;
        this.orbitPhi = Math.PI / 2 - 0.001;
        break;
      case "west": // Left
        this.orbitTheta = -Math.PI / 2;
        this.orbitPhi = Math.PI / 2 - 0.001;
        break;
      case "east": // Right
        this.orbitTheta = Math.PI / 2;
        this.orbitPhi = Math.PI / 2 - 0.001;
        break;
    }
    this.updateOrbitCamera();
  }

  public updateFacade(facade: FacadeType): void {
    if (!this.design) return;
    this.design.facade = facade;
    if (this.design.materials) {
      this.design.materials.facade = facade;
    }
    this.setupMaterials();
    this.rebuildScene(true);
  }

  public updateBoundary(boundary: Partial<BoundaryConfig>): void {
    if (!this.design) return;
    this.design.boundary = {
      ...(this.design.boundary || DEFAULT_BOUNDARY_CONFIG),
      ...boundary,
    };
    this.setupMaterials();
    this.rebuildScene(true);
  }

  public updateMaterials(materials: Partial<MaterialPaletteConfig>): void {
    if (!this.design) return;
    this.design.materials = {
      ...(this.design.materials || DEFAULT_MATERIAL_CONFIG),
      ...materials,
    };
    this.setupMaterials();
    this.rebuildScene(true);
  }

  public updateFitout(fitout: Partial<InteriorFitoutConfig>): void {
    if (!this.design) return;
    this.design.fitout = {
      ...DEFAULT_FITOUT_CONFIG,
      ...(this.design.fitout || {}),
      ...fitout,
    };
    this.rebuildScene(true);
  }

  public updateCustomFacade(customFacade: Partial<CustomFacadeConfig>): void {
    if (!this.design) return;
    this.design.customFacade = {
      ...DEFAULT_CUSTOM_FACADE_CONFIG,
      ...(this.design.customFacade || {}),
      ...customFacade,
    };
    this.setupMaterials();
    this.rebuildScene(true);
  }

  public setLightMode(isLight: boolean): void {
    if (this.isLight === isLight) return;
    this.isLight = isLight;
    if (this.design) {
      this.rebuildScene(true);
    } else {
      this.buildEmptyStudio();
    }
  }

  public buildEmptyStudio(): void {
    while (this.boundaryGroup.children.length > 0) {
      this.boundaryGroup.remove(this.boundaryGroup.children[0]);
    }
    while (this.buildingGroup.children.length > 0) {
      this.buildingGroup.remove(this.buildingGroup.children[0]);
    }
    while (this.fixturesGroup.children.length > 0) {
      this.fixturesGroup.remove(this.fixturesGroup.children[0]);
    }
    while (this.roofGroup.children.length > 0) {
      this.roofGroup.remove(this.roofGroup.children[0]);
    }
    while (this.facadeGroup.children.length > 0) {
      this.facadeGroup.remove(this.facadeGroup.children[0]);
    }

    if (this.emptyGrid) {
      this.scene.remove(this.emptyGrid);
    }
    this.scene.background = new THREE.Color(this.isLight ? "#f1f5f9" : "#090d16");
    this.emptyGrid = new THREE.GridHelper(
      36,
      36,
      this.isLight ? 0xd97706 : 0xf59e0b,
      this.isLight ? 0xcbd5e1 : 0x334155
    );
    this.emptyGrid.position.y = 0;
    this.scene.add(this.emptyGrid);

    this.orbitTarget.set(0, 0.5, 0);
    this.orbitDistance = 22;
    this.orbitTheta = Math.PI / 4;
    this.orbitPhi = Math.PI / 3;
    this.updateOrbitCamera();
  }

  public updateDesign(newDesign: BuildingDesign3D | null): void {
    const isNewPlan = !this.design || !newDesign || this.design.id !== newDesign.id;
    this.design = newDesign
      ? ensureOutdoorZonesOpenAndFurnished(ensureCompleteWallNetwork(newDesign))
      : null;
    if (this.design) {
      const centerX = this.design.widthM / 2;
      const centerZ = this.design.lengthM / 2;
      this.orbitTarget.set(centerX, 1.2, centerZ);
      if (isNewPlan) {
        const maxDim = Math.max(this.design.widthM, this.design.lengthM);
        this.orbitDistance = Math.max(16, maxDim * 1.35);
        this.orbitTheta = Math.PI / 4;
        this.orbitPhi = Math.PI / 3.2;
      }
      this.setupMaterials();
      this.rebuildScene(!isNewPlan);
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
