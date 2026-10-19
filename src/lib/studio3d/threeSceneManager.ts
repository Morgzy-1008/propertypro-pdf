/**
 * Three.js 3D WebGL Scene & Building Manager
 * Renders high-precision 3D architectural floorplans, structural walls,
 * openings with sill/head heights, materials, fixtures, and procedural hip roofs.
 * Supports Orbit / Dollhouse camera and First-Person Virtual Walkthrough modes.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
  SceneSelectedElement,
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
import { applyWorldSpaceUVs, configureWorldSpaceTexture } from "./worldSpaceUv";
import {
  useHouseMaterialStore,
  SemanticSurfaceId,
  SurfaceMaterialConfig,
  ALL_SEMANTIC_SURFACES,
  getOrGeneratePbrMaps,
} from "./houseMaterialStore";

export type CameraMode = "orbit" | "walkthrough";

export interface SceneManagerOptions {
  container: HTMLElement;
  design: BuildingDesign3D | null;
  onRoomChange?: (roomName: string) => void;
  onSurfaceSelect?: (surfaceId: SemanticSurfaceId) => void;
  onElementSelect?: (element: SceneSelectedElement | null) => void;
  isLight?: boolean;
}

export class ThreeStudioSceneManager {
  private container: HTMLElement;
  private design: BuildingDesign3D | null = null;
  private onRoomChange?: (roomName: string) => void;
  private onSurfaceSelect?: (surfaceId: SemanticSurfaceId) => void;
  private onElementSelect?: (element: SceneSelectedElement | null) => void;
  private emptyGrid: THREE.GridHelper | null = null;
  private isLight = false;
  private showCadDiagnosticCaps = false;
  private wallXrayMode = false;
  private l2Calibration = { offsetX: 0, offsetZ: 0, scale: 1.0 };
  private selectedElementId: string | null = null;
  private selectionBoxHelper: THREE.BoxHelper | null = null;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private envMapTexture: THREE.Texture | null = null;
  private animFrameId: number | null = null;
  private unsubscribeMaterialStore: (() => void) | null = null;
  private lastSyncedTimestamp = 0;

  // Camera & Interaction state
  private cameraMode: CameraMode = "orbit";
  private isMouseDown = false;
  private isRightMouseDown = false;
  private mouseDownStartPosition = { x: 0, y: 0 };
  private previousMousePosition = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();

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

  // Cached materials & Reactive Semantic Surface PBR Materials
  private materials: Record<string, THREE.Material> = {};
  private surfaceMaterials: Partial<Record<SemanticSurfaceId, THREE.MeshStandardMaterial>> = {};
  private textureLoader = new THREE.TextureLoader();

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.isLight = Boolean(options.isLight);
    this.design = options.design
      ? ensureOutdoorZonesOpenAndFurnished(ensureCompleteWallNetwork(options.design))
      : null;
    this.onRoomChange = options.onRoomChange;
    this.onSurfaceSelect = options.onSurfaceSelect;
    this.onElementSelect = options.onElementSelect;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      this.isLight ? (this.design ? "#dbeafe" : "#f1f5f9") : "#0b0f19"
    );

    // 2. Camera
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.updateOrbitCamera();

    // 3. Renderer (preserveDrawingBuffer: true for structure-locked AI viewport/depth capture)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting, HDRI Environment & Materials
    this.setupLighting();
    this.setupMaterials();
    this.initSemanticSurfaceMaterials();

    // 5. Subscribe to reactive PBR material store
    this.unsubscribeMaterialStore = useHouseMaterialStore.subscribe((state) => {
      if (state.lastUpdatedTimestamp !== this.lastSyncedTimestamp) {
        this.lastSyncedTimestamp = state.lastUpdatedTimestamp;
        this.syncPbrMaterialsFromStore(state.lastUpdatedSurfaceId || undefined);
      }
    });

    // 6. Build Environment & Building
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

    // 7. Event listeners
    this.bindEvents();

    // 8. Start render loop
    this.startLoop();
  }

  private setupLighting(): void {
    // Daytime HDRI / PMREM Environment Map for realistic PBR specular reflections & bounce light
    try {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envRT = this.pmremGenerator.fromScene(roomEnv, 0.04);
      this.envMapTexture = envRT.texture;
      this.scene.environment = this.envMapTexture;
      this.scene.environmentIntensity = 0.65;
      roomEnv.dispose();
    } catch {
      // Fallback if WebGL context does not support PMREM
    }

    // Ambient Skylight
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Warm Directional Sunlight with Soft Shadow Mapping
    const sunLight = new THREE.DirectionalLight(0xfff8ed, 1.45);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -28;
    sunLight.shadow.camera.right = 28;
    sunLight.shadow.camera.top = 28;
    sunLight.shadow.camera.bottom = -28;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.48);
    fillLight.position.set(-20, 25, -20);
    this.scene.add(fillLight);

    // Warm Interior Bounce Light for Virtual Walkthrough Realism
    const interiorBounceLight = new THREE.PointLight(0xfffbeb, 0.65, 28, 1.2);
    interiorBounceLight.position.set(6.5, 2.5, 10.5);
    this.scene.add(interiorBounceLight);
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
      // 1. Procedural European Oak Timber Floor Texture (High-Detail Plank Grain)
      const timberCanvas = document.createElement("canvas");
      timberCanvas.width = 512;
      timberCanvas.height = 512;
      const tCtx = timberCanvas.getContext("2d");
      if (tCtx) {
        const plankTones = ["#c08b5c", "#b47e4f", "#c89464", "#ad7647"];
        const plankH = 64;
        for (let y = 0; y < 512; y += plankH) {
          const offset = ((y / plankH) % 2 === 0) ? 96 : 224;
          tCtx.fillStyle = plankTones[(y / plankH) % plankTones.length];
          tCtx.fillRect(0, y, 512, plankH);

          // Subtle woodgrain fiber lines
          for (let g = 0; g < 18; g++) {
            tCtx.fillStyle = g % 2 === 0 ? "rgba(255,245,230,0.07)" : "rgba(70,35,10,0.08)";
            tCtx.fillRect(0, y + ((g * 3.5) % plankH), 512, 1.5);
          }

          // Plank bevel seams
          tCtx.strokeStyle = "#6e421c";
          tCtx.lineWidth = 2;
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.lineTo(512, y);
          tCtx.stroke();

          for (let x = offset; x < 512; x += 256) {
            tCtx.fillStyle = "rgba(0,0,0,0.04)";
            tCtx.fillRect(x, y, 128, plankH);
            tCtx.beginPath();
            tCtx.moveTo(x, y);
            tCtx.lineTo(x, y + plankH);
            tCtx.stroke();
          }
        }
      }
      timberTexture = new THREE.CanvasTexture(timberCanvas);
      timberTexture.wrapS = THREE.RepeatWrapping;
      timberTexture.wrapT = THREE.RepeatWrapping;
      timberTexture.repeat.set(2.5, 2.5);

      // 2. Bedroom Loop-Pile Plush Carpet Texture
      const carpetCanvas = document.createElement("canvas");
      carpetCanvas.width = 256;
      carpetCanvas.height = 256;
      const cCtx = carpetCanvas.getContext("2d");
      if (cCtx) {
        cCtx.fillStyle = "#949aa3";
        cCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1200; i++) {
          cCtx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
          cCtx.fillRect((i * 73) % 256, (i * 137) % 256, 2, 2);
        }
      }
      carpetTexture = new THREE.CanvasTexture(carpetCanvas);
      carpetTexture.wrapS = THREE.RepeatWrapping;
      carpetTexture.wrapT = THREE.RepeatWrapping;
      carpetTexture.repeat.set(5, 5);

      // 3. Wet Area Rectified Porcelain Tile Texture (600x600 with subtle marble veining)
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = 256;
      tileCanvas.height = 256;
      const tlCtx = tileCanvas.getContext("2d");
      if (tlCtx) {
        tlCtx.fillStyle = "#e8edf3";
        tlCtx.fillRect(0, 0, 256, 256);
        // Subtle diagonal porcelain veining
        tlCtx.strokeStyle = "rgba(148,163,184,0.28)";
        tlCtx.lineWidth = 2;
        tlCtx.beginPath();
        tlCtx.moveTo(18, 40);
        tlCtx.bezierCurveTo(90, 80, 140, 150, 235, 210);
        tlCtx.moveTo(60, 15);
        tlCtx.bezierCurveTo(130, 60, 180, 95, 245, 140);
        tlCtx.stroke();

        // Crisp 600x600 rectified grout border
        tlCtx.strokeStyle = "#94a3b8";
        tlCtx.lineWidth = 4;
        tlCtx.strokeRect(0, 0, 256, 256);
        tlCtx.strokeRect(128, 0, 128, 256);
        tlCtx.strokeRect(0, 128, 256, 128);
      }
      tileTexture = new THREE.CanvasTexture(tileCanvas);
      tileTexture.wrapS = THREE.RepeatWrapping;
      tileTexture.wrapT = THREE.RepeatWrapping;
      tileTexture.repeat.set(2.5, 2.5);
    }

    this.materials.timber = new THREE.MeshStandardMaterial({
      ...(timberTexture ? { map: timberTexture } : { color: 0xb48455 }),
      roughness: 0.28,
      metalness: 0.06,
    });

    this.materials.carpet = new THREE.MeshStandardMaterial({
      ...(carpetTexture ? { map: carpetTexture } : { color: 0x949aa3 }),
      roughness: 0.88,
    });

    this.materials.tiles = new THREE.MeshStandardMaterial({
      ...(tileTexture ? { map: tileTexture } : { color: 0xe8edf3 }),
      roughness: 0.16,
      metalness: 0.12,
    });

    // 4. Garage Smooth Trowelled Concrete Slab
    let concreteTex: THREE.CanvasTexture | null = null;
    if (typeof document !== "undefined") {
      const cCanvas = document.createElement("canvas");
      cCanvas.width = 256;
      cCanvas.height = 256;
      const cCtx = cCanvas.getContext("2d");
      if (cCtx) {
        cCtx.fillStyle = "#b0b8c4";
        cCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) {
          cCtx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(71,85,105,0.16)";
          cCtx.fillRect((i * 73) % 256, (i * 139) % 256, 3, 3);
        }
        // Saw-cut concrete expansion control joint lines
        cCtx.strokeStyle = "rgba(51,65,85,0.45)";
        cCtx.lineWidth = 2;
        cCtx.beginPath();
        cCtx.moveTo(128, 0);
        cCtx.lineTo(128, 256);
        cCtx.moveTo(0, 128);
        cCtx.lineTo(256, 128);
        cCtx.stroke();
      }
      concreteTex = new THREE.CanvasTexture(cCanvas);
      configureWorldSpaceTexture(concreteTex, true);
    }
    this.materials.concrete = new THREE.MeshStandardMaterial({
      ...(concreteTex ? { map: concreteTex } : {}),
      color: 0xb0b8c4,
      roughness: 0.52,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    // 5. Merbau / Spotted Gum Timber Decking (Alfresco / Porch)
    this.materials.decking = new THREE.MeshStandardMaterial({
      color: 0x9a4816,
      roughness: 0.48,
    });

    // 6. Exterior Brick (Authentic Austral Stretcher Bond)
    this.materials.brick = new THREE.MeshStandardMaterial({
      ...(brickTexture ? { map: brickTexture } : { color: 0x6b7280 }),
      roughness: 0.72,
    });

    // 7. Scyon Linea Horizontal Cladding
    this.materials.cladding = new THREE.MeshStandardMaterial({
      ...(claddingTexture ? { map: claddingTexture } : { color: 0xf8fafc }),
      roughness: 0.48,
    });

    // 8. Exposed Aggregate Driveway
    this.materials.aggregateDriveway = new THREE.MeshStandardMaterial({
      ...(aggregateDrivewayTexture ? { map: aggregateDrivewayTexture } : { color: 0x64748b }),
      roughness: 0.68,
    });

    // 9. Boundary Fencing (Colorbond Monument & Treated Pine)
    this.materials.colorbondFence = new THREE.MeshStandardMaterial({
      ...(colorbondFenceTexture ? { map: colorbondFenceTexture } : { color: 0x2b2e35 }),
      roughness: 0.38,
      metalness: 0.35,
    });
    this.materials.timberFence = new THREE.MeshStandardMaterial({
      ...(timberFenceTexture ? { map: timberFenceTexture } : { color: 0xa16207 }),
      roughness: 0.72,
    });

    // 10. Sectional Garage Door
    this.materials.garageDoor = new THREE.MeshStandardMaterial({
      ...(garageDoorTexture ? { map: garageDoorTexture } : { color: 0x1e293b }),
      roughness: 0.35,
      metalness: 0.45,
    });

    // 11. Interior Wall Paint (Dulux Natural White Low-Sheen Acrylic on Gyprock Plasterboard)
    let interiorPaintTex: THREE.CanvasTexture | null = null;
    if (typeof document !== "undefined") {
      const pCanvas = document.createElement("canvas");
      pCanvas.width = 128;
      pCanvas.height = 128;
      const pCtx = pCanvas.getContext("2d");
      if (pCtx) {
        pCtx.fillStyle = "#f8fafc";
        pCtx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 300; i++) {
          pCtx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.35)" : "rgba(226,232,240,0.25)";
          pCtx.fillRect((i * 53) % 128, (i * 97) % 128, 2, 2);
        }
      }
      interiorPaintTex = new THREE.CanvasTexture(pCanvas);
      interiorPaintTex.wrapS = THREE.RepeatWrapping;
      interiorPaintTex.wrapT = THREE.RepeatWrapping;
      interiorPaintTex.repeat.set(4, 2);
    }
    this.materials.interiorWall = new THREE.MeshStandardMaterial({
      ...(interiorPaintTex ? { map: interiorPaintTex } : {}),
      color: 0xf8fafc,
      roughness: 0.45,
      metalness: 0.02,
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

  private applyConfigToThreeMaterial(
    mat: THREE.MeshStandardMaterial,
    config: SurfaceMaterialConfig
  ): void {
    mat.roughness = config.roughness;
    mat.metalness = config.metalness;
    mat.userData.surfaceId = config.surfaceId;
    mat.userData.textureScaleMeters = config.textureScaleMeters || 1.5;

    const maps = getOrGeneratePbrMaps(config);
    const albedoUrl = config.albedoMapUrl || maps?.albedoDataUrl;
    const normalUrl = config.normalMapUrl || maps?.normalDataUrl;
    const roughUrl = config.roughnessMapUrl || maps?.roughnessDataUrl;

    if (albedoUrl && typeof document !== "undefined") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const tex = new THREE.Texture(img);
        configureWorldSpaceTexture(tex, true);
        mat.map = tex;
        mat.color.set("#ffffff");
        mat.needsUpdate = true;
      };
      img.src = albedoUrl;
    } else {
      mat.map = null;
      mat.color.set(config.baseColorHex || "#cccccc");
    }

    if (normalUrl && typeof document !== "undefined") {
      const nImg = new Image();
      nImg.crossOrigin = "anonymous";
      nImg.onload = () => {
        const nTex = new THREE.Texture(nImg);
        configureWorldSpaceTexture(nTex, false);
        mat.normalMap = nTex;
        const nStrength = Math.max(0.15, (config.bumpScale ?? 0.025) * 16);
        mat.normalScale.set(nStrength, nStrength);
        mat.needsUpdate = true;
      };
      nImg.src = normalUrl;
    }

    if (roughUrl && typeof document !== "undefined") {
      const rImg = new Image();
      rImg.crossOrigin = "anonymous";
      rImg.onload = () => {
        const rTex = new THREE.Texture(rImg);
        configureWorldSpaceTexture(rTex, false);
        mat.roughnessMap = rTex;
        mat.needsUpdate = true;
      };
      rImg.src = roughUrl;
    }

    mat.needsUpdate = true;
  }

  private initSemanticSurfaceMaterials(): void {
    const storeSurfaces = useHouseMaterialStore.getState().surfaces;
    for (const desc of ALL_SEMANTIC_SURFACES) {
      const sid = desc.surfaceId;
      const cfg = storeSurfaces[sid];
      let mat = this.surfaceMaterials[sid];
      if (!mat) {
        const useDoubleSide =
          sid === "roof_main" ||
          sid === "roof_fascia_gutter" ||
          sid === "interior_ceiling" ||
          sid === "interior_floor_living" ||
          sid === "interior_floor_bedrooms" ||
          sid === "interior_floor_wet_areas" ||
          sid === "driveway_paving";
        mat = new THREE.MeshStandardMaterial({
          side: useDoubleSide ? THREE.DoubleSide : THREE.FrontSide,
        });
        mat.userData.surfaceId = sid;
        this.surfaceMaterials[sid] = mat;
      }
      mat.userData.surfaceId = sid;
      if (cfg) {
        this.applyConfigToThreeMaterial(mat, cfg);
      }
    }

    // Bind legacy material aliases so multi-face walls and standard builders use reactive PBR instances
    this.materials.brick = this.getSurfaceMaterial("exterior_wall_main");
    this.materials.cladding = this.getSurfaceMaterial("exterior_cladding_feature");
    this.materials.renderMonument = this.getSurfaceMaterial("portico_facade");
    this.materials.garageDoor = this.getSurfaceMaterial("garage_door");
    this.materials.frame = this.getSurfaceMaterial("window_frames");
    this.materials.aggregateDriveway = this.getSurfaceMaterial("driveway_paving");
    this.materials.interiorWall = this.getSurfaceMaterial("interior_walls_main");
    this.materials.timber = this.getSurfaceMaterial("interior_floor_living");
    this.materials.carpet = this.getSurfaceMaterial("interior_floor_bedrooms");
    this.materials.tiles = this.getSurfaceMaterial("interior_floor_wet_areas");
  }

  public getSurfaceMaterial(surfaceId: SemanticSurfaceId): THREE.MeshStandardMaterial {
    let mat = this.surfaceMaterials[surfaceId];
    if (!mat) {
      const useDoubleSide =
        surfaceId === "roof_main" ||
        surfaceId === "roof_fascia_gutter" ||
        surfaceId === "interior_ceiling" ||
        surfaceId === "interior_floor_living" ||
        surfaceId === "interior_floor_bedrooms" ||
        surfaceId === "interior_floor_wet_areas" ||
        surfaceId === "driveway_paving";
      mat = new THREE.MeshStandardMaterial({
        side: useDoubleSide ? THREE.DoubleSide : THREE.FrontSide,
      });
      mat.userData.surfaceId = surfaceId;
      this.surfaceMaterials[surfaceId] = mat;
      const cfg = useHouseMaterialStore.getState().surfaces[surfaceId];
      if (cfg) {
        this.applyConfigToThreeMaterial(mat, cfg);
      }
    }
    return mat;
  }

  public syncPbrMaterialsFromStore(targetSurfaceId?: SemanticSurfaceId): void {
    const storeSurfaces = useHouseMaterialStore.getState().surfaces;
    const idsToSync: SemanticSurfaceId[] = targetSurfaceId
      ? [targetSurfaceId]
      : ALL_SEMANTIC_SURFACES.map((s) => s.surfaceId);

    for (const sid of idsToSync) {
      const cfg = storeSurfaces[sid];
      if (!cfg) continue;
      const mat = this.getSurfaceMaterial(sid);
      this.applyConfigToThreeMaterial(mat, cfg);
    }

    // Re-project world-space UVs for any meshes matching the updated surfaceId(s)
    this.applyPbrAndWorldSpaceUVsToScene(targetSurfaceId);

    // If any floor material was customized, ensure 3D PBR room floors are visible
    if (
      targetSurfaceId === "interior_floor_living" ||
      targetSurfaceId === "interior_floor_bedrooms" ||
      targetSurfaceId === "interior_floor_wet_areas"
    ) {
      this.buildingGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh && obj.userData.isBlueprintUnderlay) {
          obj.visible = false;
        }
      });
    }
  }

  private applyPbrAndWorldSpaceUVsToScene(filterSurfaceId?: SemanticSurfaceId): void {
    const storeSurfaces = useHouseMaterialStore.getState().surfaces;
    const groups = [
      this.buildingGroup,
      this.facadeGroup,
      this.fixturesGroup,
      this.roofGroup,
    ];

    for (const grp of groups) {
      grp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;

        const sid = mesh.userData.surfaceId as SemanticSurfaceId | undefined;
        const altSid = mesh.userData.hasInteriorSurfaceId as SemanticSurfaceId | undefined;
        if (!sid) return;
        if (filterSurfaceId && sid !== filterSurfaceId && altSid !== filterSurfaceId) return;

        const activeSid = filterSurfaceId === altSid && altSid ? altSid : sid;
        const cfg = storeSurfaces[activeSid];
        const scaleM = cfg?.textureScaleMeters || mesh.userData.defaultScaleMeters || 1.5;

        // Bind single-material mesh to reactive PBR material instance
        if (!Array.isArray(mesh.material)) {
          mesh.material = this.getSurfaceMaterial(sid);
        }

        // Apply world-space UV mapping (except on custom pre-parameterized hip roof slopes unless requested)
        if (sid !== "roof_main" || !mesh.userData.keepSlopeUVs) {
          applyWorldSpaceUVs(mesh.geometry, scaleM, mesh.scale);
        }
      });
    }
  }

  private blueprintTextureCache = new Map<string, THREE.CanvasTexture>();

  private disposeGroupChildren(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) {
          mesh.geometry.dispose();
        }
      });
    }
  }

  private clampPolygonToLevelExteriorWalls(
    polygon: [number, number][],
    levelNum: number
  ): [number, number][] {
    if (!this.design || !polygon || polygon.length < 3) return polygon;
    const lvlWalls = (this.design.walls || []).filter((w) => (w.level ?? 0) === levelNum);
    const extWalls = lvlWalls.filter((w) => w.isExterior);
    const refWalls = extWalls.length >= 3 ? extWalls : lvlWalls;
    if (refWalls.length === 0) return polygon;

    let globalMinX = Infinity,
      globalMaxX = -Infinity,
      globalMinZ = Infinity,
      globalMaxZ = -Infinity;
    for (const w of refWalls) {
      const x0 = Math.min(w.start[0], w.end[0]);
      const x1 = Math.max(w.start[0], w.end[0]);
      const z0 = Math.min(w.start[1], w.end[1]);
      const z1 = Math.max(w.start[1], w.end[1]);
      if (x0 < globalMinX) globalMinX = x0;
      if (x1 > globalMaxX) globalMaxX = x1;
      if (z0 < globalMinZ) globalMinZ = z0;
      if (z1 > globalMaxZ) globalMaxZ = z1;
    }
    if (!Number.isFinite(globalMinX) || !Number.isFinite(globalMinZ)) return polygon;

    return polygon.map(([px, pz]) => {
      const cz = Math.max(globalMinZ, Math.min(globalMaxZ, pz));
      const cx = Math.max(globalMinX, Math.min(globalMaxX, px));
      return [cx, cz] as [number, number];
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

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }

    // Clear previous geometry and free GPU buffers
    this.disposeGroupChildren(this.boundaryGroup);
    this.disposeGroupChildren(this.buildingGroup);
    this.disposeGroupChildren(this.fixturesGroup);
    this.disposeGroupChildren(this.roofGroup);
    this.disposeGroupChildren(this.facadeGroup);

    // Set orbit target to center of building and update camera
    const centerX = this.design.widthM / 2;
    const centerZ = this.design.lengthM / 2;
    if (!preserveCamera) {
      this.orbitTarget.set(centerX, 1.2, centerZ);
    }
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

    // 3. Build Room Floors, Ceilings, Skirting & Feature Wall
    this.buildRoomFloors();

    // 4. Build Walls with accurate Door & Window cutouts + 250mm/90mm structural caps
    this.buildWallsAndOpenings();

    // 4b. Build 90mm Dashed Open Hampers (Open walk-through portals, NOT doors or solid walls)
    this.buildOpenHampers();

    // 5. Build Architectural Facade Features (Columns, Gables, Portico, Alfresco Piers)
    this.buildFacadeFeatures();

    // 6. Build Interior Fixtures (Kitchen island, benchtops, splashback, sinks, vanities, baths, furniture)
    this.buildFixtures();

    // 7. Build Parametric Hip Roof
    this.buildRoof();

    // 8. Apply Semantic PBR Materials & World-Space UV Projection across all tagged meshes
    this.applyPbrAndWorldSpaceUVsToScene();

    // 9. Re-attach selection BoxHelper if an element remains selected after nudge/rotate
    if (this.selectedElementId) {
      let foundObj: THREE.Object3D | null = null;
      const searchGroups = [this.fixturesGroup, this.buildingGroup, this.facadeGroup];
      for (const grp of searchGroups) {
        grp.traverse((child) => {
          if (!foundObj && child.userData?.selectableElement?.id === this.selectedElementId) {
            foundObj = child;
          }
        });
      }
      if (foundObj) {
        this.selectionBoxHelper = new THREE.BoxHelper(foundObj, 0x06b6d4);
        this.scene.add(this.selectionBoxHelper);
      } else {
        this.selectedElementId = null;
      }
    }
  }

  private isFrontAtSouthEdge(): boolean {
    if (!this.design) return false;
    const garageOpening = (this.design.openings || []).find((op) => op.type === "garage_door");
    if (garageOpening) {
      return garageOpening.position[1] > this.design.lengthM * 0.5;
    }
    return Boolean(this.design.exactStructuralWalls);
  }

  private getLotBounds(): {
    lotLeft: number;
    lotRight: number;
    lotNorth: number;
    lotSouth: number;
    lotW: number;
    lotL: number;
    isSouthFront: boolean;
  } {
    const boundary = this.design?.boundary || DEFAULT_BOUNDARY_CONFIG;
    const houseW = this.design?.widthM || 12.5;
    const houseL = this.design?.lengthM || 21.0;
    const isSouthFront = this.isFrontAtSouthEdge();

    const defaultW = houseW + (boundary.leftSetbackM || 1.2) + (boundary.rightSetbackM || 1.0);
    const defaultL = houseL + (boundary.frontSetbackM || 4.5) + (boundary.rearSetbackM || 3.5);
    const targetLotW = Math.max(houseW + 1.2, boundary.lotWidthM || defaultW);
    const targetLotL = Math.max(houseL + 3.0, boundary.lotLengthM || defaultL);

    const totalSideMargin = Math.max(1.2, targetLotW - houseW);
    const baseLeft = boundary.leftSetbackM || 1.2;
    const baseRight = boundary.rightSetbackM || 1.0;
    const leftRatio = baseLeft / Math.max(0.1, baseLeft + baseRight);
    const setbackLeft = totalSideMargin * leftRatio;
    const setbackRight = totalSideMargin * (1 - leftRatio);

    const totalDepthMargin = Math.max(3.0, targetLotL - houseL);
    const setbackFront = Math.min(totalDepthMargin * 0.65, boundary.frontSetbackM || 4.5);
    const setbackRear = Math.max(1.0, totalDepthMargin - setbackFront);

    const lotLeft = -setbackLeft;
    const lotRight = houseW + setbackRight;
    const lotNorth = isSouthFront ? -setbackRear : -setbackFront;
    const lotSouth = isSouthFront ? houseL + setbackFront : houseL + setbackRear;

    return {
      lotLeft,
      lotRight,
      lotNorth,
      lotSouth,
      lotW: lotRight - lotLeft,
      lotL: lotSouth - lotNorth,
      isSouthFront,
    };
  }

  private buildGroundAndSlab(): void {
    if (!this.design) return;
    const { lotLeft, lotNorth, lotSouth, lotW, lotL, isSouthFront } = this.getLotBounds();

    // Outer Regional Ground
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.isLight ? 0x65a30d : 0x1a331a,
      roughness: 0.95,
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.06;
    groundMesh.receiveShadow = true;
    this.buildingGroup.add(groundMesh);

    // Manicured Emerald Lot Turf Pad (exact 1:100 lot boundary)
    const lotTurfGeom = new THREE.PlaneGeometry(lotW, lotL);
    const lotTurfMat = new THREE.MeshStandardMaterial({
      color: this.isLight ? 0x4d7c0f : 0x244e24,
      roughness: 0.9,
    });
    const lotTurfMesh = new THREE.Mesh(lotTurfGeom, lotTurfMat);
    lotTurfMesh.rotation.x = -Math.PI / 2;
    lotTurfMesh.position.set(lotLeft + lotW / 2, -0.02, lotNorth + lotL / 2);
    lotTurfMesh.receiveShadow = true;
    this.buildingGroup.add(lotTurfMesh);

    // Helper to extrude stepped slabs/plinths cleanly from room polygons on a level (clamped strictly to external walls, cutting out Stairwell Void holes)
    const addRoomPolygonSlabs = (
      levelRooms: Room3D[],
      baseY: number,
      slabDepth: number,
      mat: THREE.Material,
      padM = 0.0,
      levelNum = 0
    ) => {
      const voidRooms = levelRooms.filter(
        (vr) => vr.name === "Void" && vr.polygon && vr.polygon.length >= 3
      );
      for (const room of levelRooms) {
        if (room.name === "Void") continue;
        if (!room.polygon || room.polygon.length < 3) continue;
        const clampedPoly = this.clampPolygonToLevelExteriorWalls(room.polygon, levelNum);
        const rxs = clampedPoly.map((p) => p[0]);
        const rzs = clampedPoly.map((p) => p[1]);
        const rMinX = Math.min(...rxs);
        const rMaxX = Math.max(...rxs);
        const rMinZ = Math.min(...rzs);
        const rMaxZ = Math.max(...rzs);
        if (rMaxX - rMinX < 0.2 || rMaxZ - rMinZ < 0.2) continue;
        const cx =
          clampedPoly.reduce((acc, p) => acc + p[0], 0) / clampedPoly.length;
        const cz =
          clampedPoly.reduce((acc, p) => acc + p[1], 0) / clampedPoly.length;
        const shape = new THREE.Shape();
        clampedPoly.forEach(([px, pz], idx) => {
          const ex = px + (px >= cx ? padM : -padM);
          const ez = pz + (pz >= cz ? padM : -padM);
          if (idx === 0) shape.moveTo(ex, -ez);
          else shape.lineTo(ex, -ez);
        });
        shape.closePath();

        // Cut out Stairwell Void holes inside large upper-floor slab polygons
        if (baseY > 1.0 && voidRooms.length > 0 && (rMaxX - rMinX) * (rMaxZ - rMinZ) > 16) {
          for (const vr of voidRooms) {
            if (
              vr.center[0] >= rMinX &&
              vr.center[0] <= rMaxX &&
              vr.center[1] >= rMinZ &&
              vr.center[1] <= rMaxZ
            ) {
              const holePath = new THREE.Path();
              vr.polygon.forEach(([vx, vz], idx) => {
                if (idx === 0) holePath.moveTo(vx, -vz);
                else holePath.lineTo(vx, -vz);
              });
              holePath.closePath();
              shape.holes.push(holePath);
            }
          }
        }

        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: slabDepth,
          bevelEnabled: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = baseY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isSlabOrGround = true;
        this.buildingGroup.add(mesh);
      }
    };

    // Concrete Slab Foundation (300mm FFL on Level 0) — ALWAYS use exact stepped room polygons clamped to external walls!
    const slabW = this.design.widthM;
    const slabL = this.design.lengthM;
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const level0Rooms = (this.design.rooms || []).filter((r) => (r.level ?? 0) === 0);
    if (level0Rooms.length > 0) {
      addRoomPolygonSlabs(level0Rooms, 0.0, 0.30, slabMat, 0.0, 0);
    } else {
      const clampedBox = this.clampPolygonToLevelExteriorWalls(
        [
          [0, 0],
          [slabW, 0],
          [slabW, slabL],
          [0, slabL],
        ],
        0
      );
      const minX = Math.min(...clampedBox.map((p) => p[0]));
      const maxX = Math.max(...clampedBox.map((p) => p[0]));
      const minZ = Math.min(...clampedBox.map((p) => p[1]));
      const maxZ = Math.max(...clampedBox.map((p) => p[1]));
      const slabGeom = new THREE.BoxGeometry(Math.max(1, maxX - minX), 0.30, Math.max(1, maxZ - minZ));
      const slabMesh = new THREE.Mesh(slabGeom, slabMat);
      slabMesh.position.set((minX + maxX) / 2, 0.15, (minZ + maxZ) / 2);
      slabMesh.receiveShadow = true;
      slabMesh.userData.isSlabOrGround = true;
      this.buildingGroup.add(slabMesh);
    }

    // Multi-Level Structural Plinths (Split Level) & Suspended Upper-Storey Floor Slabs
    if (this.design.levels && this.design.levels.length > 1) {
      for (const lvl of this.design.levels) {
        if (lvl.elevationOffsetM <= 0.05) continue;
        if (this.activeLevelFilter !== "all" && this.activeLevelFilter < lvl.level) continue;
        const lvlRooms = (this.design.rooms || []).filter((r) => (r.level ?? 0) === lvl.level);
        const b = lvl.worldBounds;
        const lW = Math.max(1.0, b.widthM);
        const lL = Math.max(1.0, b.depthM);
        const cX = b.x + lW / 2;
        const cZ = b.z + lL / 2;

        if (lvl.elevationOffsetM < 1.5) {
          // Raised Split-Level Concrete Subfloor Plinth (e.g. +600mm rear split level)
          const plinthH = 0.30 + lvl.elevationOffsetM;
          const plinthMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72 });
          if (lvlRooms.length > 0) {
            addRoomPolygonSlabs(lvlRooms, 0.0, plinthH, plinthMat, 0.0, lvl.level);
          } else {
            const plinthGeom = new THREE.BoxGeometry(lW, plinthH, lL);
            const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
            plinthMesh.position.set(cX, plinthH / 2, cZ);
            plinthMesh.castShadow = true;
            plinthMesh.receiveShadow = true;
            plinthMesh.userData.isSlabOrGround = true;
            this.buildingGroup.add(plinthMesh);
          }
        } else {
          // Upper-Storey Suspended Concrete / Posi-Strut Floor Slab (300mm depth below upper FFL)
          const upperSlabH = 0.30;
          const upperFFL = 0.30 + lvl.elevationOffsetM;
          const upperSlabMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
          if (lvlRooms.length > 0) {
            addRoomPolygonSlabs(lvlRooms, upperFFL - upperSlabH, upperSlabH, upperSlabMat, 0.0, lvl.level);
          } else {
            const upperSlabGeom = new THREE.BoxGeometry(lW, upperSlabH, lL);
            const upperSlabMesh = new THREE.Mesh(upperSlabGeom, upperSlabMat);
            upperSlabMesh.position.set(cX, upperFFL - upperSlabH / 2, cZ);
            upperSlabMesh.castShadow = true;
            upperSlabMesh.receiveShadow = true;
            upperSlabMesh.userData.isSlabOrGround = true;
            this.buildingGroup.add(upperSlabMesh);
          }
        }
      }
    }

    // Exposed Aggregate Concrete Driveway to Garage (spans single, double, or triple garage bays)
    const garageOpenings = (this.design.openings || []).filter((op) => op.type === "garage_door");
    const garageOpening = garageOpenings[0];
    let garageX = garageOpening ? garageOpening.position[0] : (slabW - 3.5);
    const garageZ = garageOpening ? garageOpening.position[1] : (isSouthFront ? slabL : 0);
    let driveW = garageOpening ? Math.max(5.0, garageOpening.width + 0.4) : 5.5;
    if (garageOpenings.length > 1) {
      const minGarX = Math.min(...garageOpenings.map((g) => g.position[0] - g.width / 2));
      const maxGarX = Math.max(...garageOpenings.map((g) => g.position[0] + g.width / 2));
      garageX = (minGarX + maxGarX) / 2;
      driveW = Math.max(driveW, maxGarX - minGarX + 0.5);
    }

    if (isSouthFront) {
      const driveStartZ = garageZ;
      const driveEndZ = lotSouth + 1.5;
      const driveL = Math.max(2.0, driveEndZ - driveStartZ);
      const drivewayGeom = new THREE.BoxGeometry(driveW, 0.05, driveL);
      const drivewayMesh = new THREE.Mesh(drivewayGeom, this.materials.aggregateDriveway);
      drivewayMesh.position.set(garageX, 0.025, (driveStartZ + driveEndZ) / 2);
      drivewayMesh.receiveShadow = true;
      drivewayMesh.userData.surfaceId = "driveway_paving";
      drivewayMesh.userData.isSlabOrGround = true;
      this.buildingGroup.add(drivewayMesh);

      const porch = (this.design.rooms || []).find((r) => r.name === "Porch");
      const pathX = porch ? porch.center[0] : 4.27;
      const pathStartZ = porch ? Math.max(...porch.polygon.map((p) => p[1])) : slabL;
      const pathEndZ = lotSouth + 0.8;
      const pathL = Math.max(1.5, pathEndZ - pathStartZ);
      const pathGeom = new THREE.BoxGeometry(1.4, 0.06, pathL);
      const pathMesh = new THREE.Mesh(pathGeom, this.materials.aggregateDriveway);
      pathMesh.position.set(pathX, 0.03, (pathStartZ + pathEndZ) / 2);
      pathMesh.receiveShadow = true;
      pathMesh.userData.surfaceId = "driveway_paving";
      pathMesh.userData.isSlabOrGround = true;
      this.buildingGroup.add(pathMesh);
    } else {
      const driveL = Math.abs(lotNorth) + 2.0;
      const drivewayGeom = new THREE.BoxGeometry(driveW, 0.05, driveL);
      const drivewayMesh = new THREE.Mesh(drivewayGeom, this.materials.aggregateDriveway);
      drivewayMesh.position.set(garageX, 0.025, lotNorth / 2 - 1.0);
      drivewayMesh.receiveShadow = true;
      drivewayMesh.userData.surfaceId = "driveway_paving";
      drivewayMesh.userData.isSlabOrGround = true;
      this.buildingGroup.add(drivewayMesh);

      const porch = (this.design.rooms || []).find((r) => r.name === "Porch");
      const pathX = porch ? porch.center[0] : 6.5;
      const pathL = Math.abs(lotNorth) + 1.0;
      const pathGeom = new THREE.BoxGeometry(1.6, 0.06, pathL);
      const pathMesh = new THREE.Mesh(pathGeom, this.materials.aggregateDriveway);
      pathMesh.position.set(pathX, 0.03, lotNorth / 2 - 0.5);
      pathMesh.receiveShadow = true;
      pathMesh.userData.surfaceId = "driveway_paving";
      pathMesh.userData.isSlabOrGround = true;
      this.buildingGroup.add(pathMesh);
    }
  }

  private buildBoundariesAndFences(): void {
    if (!this.design) return;
    const boundary = this.design.boundary || DEFAULT_BOUNDARY_CONFIG;
    const { lotLeft, lotRight, lotNorth, lotSouth, isSouthFront } = this.getLotBounds();
    const fenceH = boundary.fenceHeightM || 1.80;

    // 1. Cadastral Survey Boundary Pegs (4 lot corners)
    const corners = [
      [lotLeft, lotNorth],
      [lotRight, lotNorth],
      [lotLeft, lotSouth],
      [lotRight, lotSouth],
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
      new THREE.Vector3(lotLeft, 0.015, lotNorth),
      new THREE.Vector3(lotRight, 0.015, lotNorth),
      new THREE.Vector3(lotRight, 0.015, lotSouth),
      new THREE.Vector3(lotLeft, 0.015, lotSouth),
      new THREE.Vector3(lotLeft, 0.015, lotNorth),
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

    const findHouseSideWallX = (targetZ: number) => {
      let minX = 0;
      let maxX = this.design!.widthM;
      const nearWalls = (this.design!.walls || []).filter((w) => {
        const z0 = Math.min(w.start[1], w.end[1]);
        const z1 = Math.max(w.start[1], w.end[1]);
        return targetZ >= z0 - 1.2 && targetZ <= z1 + 1.2;
      });
      if (nearWalls.length > 0) {
        const xs = nearWalls.flatMap((w) => [w.start[0], w.end[0]]);
        minX = Math.min(...xs);
        maxX = Math.max(...xs);
      }
      return { minX, maxX };
    };

    if (isSouthFront) {
      const wingZ = this.design.lengthM - 1.8;
      const { minX, maxX } = findHouseSideWallX(wingZ);
      // Rear Fence at North (lotNorth)
      addFenceRun(lotLeft, lotNorth, lotRight, lotNorth);
      // Left & Right Fences from Rear (lotNorth) to Wing Return (wingZ)
      addFenceRun(lotLeft, lotNorth, lotLeft, wingZ);
      addFenceRun(lotRight, lotNorth, lotRight, wingZ);
      // Side Return Wing Fences connecting to house walls
      addFenceRun(lotLeft, wingZ, minX, wingZ);
      addFenceRun(maxX, wingZ, lotRight, wingZ);
    } else {
      const wingZ = 1.8;
      const { minX, maxX } = findHouseSideWallX(wingZ);
      addFenceRun(lotLeft, lotSouth, lotRight, lotSouth);
      addFenceRun(lotLeft, lotSouth, lotLeft, wingZ);
      addFenceRun(lotRight, lotSouth, lotRight, wingZ);
      addFenceRun(lotLeft, wingZ, minX, wingZ);
      addFenceRun(maxX, wingZ, lotRight, wingZ);
    }
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
    const isSouthFront = this.isFrontAtSouthEdge();

    // 1. FRONT ENTRY PORTICO & FACADE ARTICULATION (for North-front templates)
    if (!isSouthFront) {
      if (facade === "hamptons" || customFacade.porticoStyle === "pitched_gable") {
        // HAMPTONS COASTAL / PITCHED GABLE FACADE
        const postGeom = new THREE.BoxGeometry(0.14, porchH, 0.14);
        const postMesh = new THREE.Mesh(postGeom, this.getSurfaceMaterial("portico_facade"));
        postMesh.position.set(colX, ffl + porchH / 2, colZ);
        postMesh.castShadow = true;
        postMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(postMesh);

        const capGeom = new THREE.BoxGeometry(0.20, 0.08, 0.20);
        const capMesh = new THREE.Mesh(capGeom, this.getSurfaceMaterial("portico_facade"));
        capMesh.position.set(colX, ffl + porchH - 0.04, colZ);
        capMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(capMesh);

        const plinthGeom = new THREE.BoxGeometry(0.24, 0.28, 0.24);
        const plinthMesh = new THREE.Mesh(plinthGeom, this.getSurfaceMaterial("portico_facade"));
        plinthMesh.position.set(colX, ffl + 0.14, colZ);
        plinthMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(plinthMesh);

        // Scyon Linea Cladding Front Gable Peak
        const gableW = Math.max(3.2, porchSpanW + 1.2);
        const gableH = 1.35;
        const gableGeom = new THREE.ConeGeometry(gableW / 2, gableH, 4);
        const gableMesh = new THREE.Mesh(gableGeom, this.getSurfaceMaterial("exterior_cladding_feature"));
        gableMesh.rotation.y = Math.PI / 4;
        gableMesh.position.set(porchMidX, ffl + porchH + gableH / 2, colZ - 0.05);
        gableMesh.scale.set(1, 1, 0.08);
        gableMesh.userData.surfaceId = "exterior_cladding_feature";
        this.facadeGroup.add(gableMesh);

        const trimGeom = new THREE.BoxGeometry(gableW * 0.78, 0.09, 0.08);
        const trimMesh = new THREE.Mesh(trimGeom, this.getSurfaceMaterial("portico_facade"));
        trimMesh.position.set(porchMidX, ffl + porchH + 0.04, colZ);
        trimMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(trimMesh);

      } else if (
        facade === "executive" ||
        facade === "acreage_homestead" ||
        customFacade.porticoStyle === "double_brick_piers"
      ) {
        // EXECUTIVE GRANDE / ACREAGE HOMESTEAD FACADE (Substantial 470x470 Twin/Corner Brick Piers)
        const pierGeom = new THREE.BoxGeometry(0.47, porchH, 0.47);
        const pierMesh = new THREE.Mesh(pierGeom, this.getSurfaceMaterial("exterior_wall_main"));
        pierMesh.position.set(colX, ffl + porchH / 2, colZ);
        pierMesh.castShadow = true;
        pierMesh.userData.surfaceId = "exterior_wall_main";
        this.facadeGroup.add(pierMesh);

        const stoneCapGeom = new THREE.BoxGeometry(0.54, 0.09, 0.54);
        const stoneCapMesh = new THREE.Mesh(stoneCapGeom, this.getSurfaceMaterial("portico_facade"));
        stoneCapMesh.position.set(colX, ffl + porchH - 0.045, colZ);
        stoneCapMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(stoneCapMesh);

        // Second matching pier on right side of portico
        const pier2Mesh = new THREE.Mesh(pierGeom, this.getSurfaceMaterial("exterior_wall_main"));
        pier2Mesh.position.set(porchP2[0], ffl + porchH / 2, colZ);
        pier2Mesh.castShadow = true;
        pier2Mesh.userData.surfaceId = "exterior_wall_main";
        this.facadeGroup.add(pier2Mesh);

        const stoneCap2Mesh = new THREE.Mesh(stoneCapGeom, this.getSurfaceMaterial("portico_facade"));
        stoneCap2Mesh.position.set(porchP2[0], ffl + porchH - 0.045, colZ);
        stoneCap2Mesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(stoneCap2Mesh);

        const beamW = porchSpanW + 0.65;
        const beamGeom = new THREE.BoxGeometry(beamW, 0.30, 0.38);
        const beamMesh = new THREE.Mesh(beamGeom, this.getSurfaceMaterial("portico_facade"));
        beamMesh.position.set(porchMidX, ffl + porchH - 0.15, colZ);
        beamMesh.castShadow = true;
        beamMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(beamMesh);

      } else if (facade === "contempo" || customFacade.porticoStyle === "cedar_batten_screen") {
        // CONTEMPO TIMBER / CEDAR BATTEN SCREEN FACADE
        const battenCount = 7;
        const screenW = 1.1;
        for (let i = 0; i < battenCount; i++) {
          const bx = colX - screenW / 2 + (i / (battenCount - 1)) * screenW;
          const battenGeom = new THREE.BoxGeometry(0.055, porchH, 0.045);
          const battenMesh = new THREE.Mesh(battenGeom, this.getSurfaceMaterial("exterior_cladding_feature"));
          battenMesh.position.set(bx, ffl + porchH / 2, colZ);
          battenMesh.castShadow = true;
          battenMesh.userData.surfaceId = "exterior_cladding_feature";
          this.facadeGroup.add(battenMesh);
        }

        const canopyW = porchSpanW + 0.9;
        const canopyGeom = new THREE.BoxGeometry(canopyW, 0.16, projDepth);
        const canopyMesh = new THREE.Mesh(canopyGeom, this.getSurfaceMaterial("portico_facade"));
        canopyMesh.position.set(porchMidX, ffl + porchH, colZ + projDepth * 0.4);
        canopyMesh.castShadow = true;
        canopyMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(canopyMesh);

      } else if (
        facade === "bronte" ||
        facade === "palm_springs_parapet" ||
        customFacade.rooflineStyle === "box_parapet"
      ) {
        // BRONTE DESIGNER / PALM SPRINGS BOX PARAPET FACADE
        const colGeom = new THREE.BoxGeometry(0.18, porchH, 0.18);
        const colMesh = new THREE.Mesh(colGeom, this.getSurfaceMaterial("portico_facade"));
        colMesh.position.set(colX, ffl + porchH / 2, colZ);
        colMesh.castShadow = true;
        colMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(colMesh);

        const slabW = porchSpanW + 0.8;
        const slabGeom = new THREE.BoxGeometry(slabW, 0.24, projDepth);
        const slabMesh = new THREE.Mesh(slabGeom, this.getSurfaceMaterial("portico_facade"));
        slabMesh.position.set(porchMidX, ffl + porchH, colZ + projDepth * 0.35);
        slabMesh.castShadow = true;
        slabMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(slabMesh);

        // Architectural Box Parapet Fascia across front master & portico
        const parapetW = Math.min(this.design.widthM * 0.65, porchP2[0] + 0.5);
        const parapetGeom = new THREE.BoxGeometry(parapetW, 0.65, 0.28);
        const parapetMesh = new THREE.Mesh(parapetGeom, this.getSurfaceMaterial("portico_facade"));
        parapetMesh.position.set(parapetW / 2, ffl + porchH + 0.32, colZ + 0.12);
        parapetMesh.castShadow = true;
        parapetMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(parapetMesh);

      } else if (facade === "skillion" || customFacade.rooflineStyle === "skillion_mono") {
        // ARCHITECTURAL SKILLION MONO-PITCH FACADE
        const pierGeom = new THREE.BoxGeometry(0.32, porchH + 0.35, 0.32);
        const pierMesh = new THREE.Mesh(pierGeom, this.getSurfaceMaterial("portico_facade"));
        pierMesh.position.set(colX, ffl + (porchH + 0.35) / 2, colZ);
        pierMesh.castShadow = true;
        pierMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(pierMesh);

        // Raked Skillion Canopy over Portico
        const canopyW = porchSpanW + 1.1;
        const canopyGeom = new THREE.BoxGeometry(canopyW, 0.18, projDepth + 0.4);
        const canopyMesh = new THREE.Mesh(canopyGeom, this.getSurfaceMaterial("portico_facade"));
        canopyMesh.position.set(porchMidX, ffl + porchH + 0.22, colZ + 0.35);
        canopyMesh.rotation.z = 0.14; // Raked 8-degree skillion tilt
        canopyMesh.castShadow = true;
        canopyMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(canopyMesh);

      } else {
        // MODERN METRO / CANTILEVER PORTICO FACADE
        const pierGeom = new THREE.BoxGeometry(0.36, porchH, 0.36);
        const pierMesh = new THREE.Mesh(pierGeom, this.getSurfaceMaterial("portico_facade"));
        pierMesh.position.set(colX, ffl + porchH / 2, colZ);
        pierMesh.castShadow = true;
        pierMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(pierMesh);

        const beamW = porchSpanW + 0.55;
        const beamGeom = new THREE.BoxGeometry(beamW, 0.24, 0.28);
        const beamMesh = new THREE.Mesh(beamGeom, this.getSurfaceMaterial("portico_facade"));
        beamMesh.position.set(porchMidX, ffl + porchH - 0.12, colZ);
        beamMesh.castShadow = true;
        beamMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(beamMesh);
      }
    }

    // 2. CUSTOM DESIGN-TAILORED FEATURE BLADE WALL & GARAGE ARTICULATION
    if (customFacade.featureBladeWall) {
      const bladeH = porchH + 0.45;
      const bladeGeom = new THREE.BoxGeometry(0.28, bladeH, projDepth * 0.85);
      const bladeMesh = new THREE.Mesh(bladeGeom, this.getSurfaceMaterial("exterior_cladding_feature"));
      bladeMesh.position.set(
        porchP1[0] - 0.18,
        ffl + bladeH / 2,
        isSouthFront ? this.design.lengthM - 0.25 : colZ + 0.25
      );
      bladeMesh.castShadow = true;
      bladeMesh.userData.surfaceId = "exterior_cladding_feature";
      this.facadeGroup.add(bladeMesh);
    }

    if (customFacade.garageArticulation === "cantilever_brow") {
      const garOp = (this.design.openings || []).find((op) => op.type === "garage_door");
      if (garOp) {
        const browW = garOp.width + 0.9;
        const browGeom = new THREE.BoxGeometry(browW, 0.16, 0.65);
        const browMesh = new THREE.Mesh(browGeom, this.getSurfaceMaterial("portico_facade"));
        browMesh.position.set(garOp.position[0], ffl + garOp.headHeight + 0.15, garOp.position[1] - 0.25);
        browMesh.castShadow = true;
        browMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(browMesh);
      }
    }

    // 3. REAR OPEN COVERED ALFRESCO STRUCTURAL CORNER PIER & LINTEL BEAMS
    const alfresco = (this.design.rooms || []).find((r) => r.name.toLowerCase().includes("alfresco"));
    if (alfresco && alfresco.polygon && alfresco.polygon.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const pt of alfresco.polygon) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minZ) minZ = pt[1];
        if (pt[1] > maxZ) maxZ = pt[1];
      }
      if (isSouthFront) {
        if (this.design.id === "amber-21") {
          return;
        }
        const openCorners: [number, number][] = [];
        const wM = this.design.widthM;
        if (maxX >= wM - 0.5 && minX > 0.5) {
          openCorners.push([maxX - 0.175, minZ + 0.175]);
        } else if (minX <= 0.5 && maxX < wM - 0.5) {
          openCorners.push([minX + 0.175, minZ + 0.175]);
        }

        openCorners.forEach(([cornerX, cornerZ]) => {
          const alfPierGeom = new THREE.BoxGeometry(0.35, porchH, 0.35);
          const alfPierMesh = new THREE.Mesh(alfPierGeom, this.getSurfaceMaterial("exterior_wall_main"));
          alfPierMesh.position.set(cornerX, ffl + porchH / 2, cornerZ);
          alfPierMesh.castShadow = true;
          alfPierMesh.receiveShadow = true;
          alfPierMesh.userData.surfaceId = "exterior_wall_main";
          this.facadeGroup.add(alfPierMesh);

          const pierCapGeom = new THREE.BoxGeometry(0.36, 0.025, 0.36);
          const pierCapMat = this.showCadDiagnosticCaps
            ? new THREE.MeshBasicMaterial({ color: 0xb91c1c })
            : this.materials.stoneCap;
          const pierCapMesh = new THREE.Mesh(pierCapGeom, pierCapMat);
          pierCapMesh.position.set(cornerX, ffl + porchH + 0.012, cornerZ);
          this.facadeGroup.add(pierCapMesh);
        });
      } else {
        const isLeftSide = minX <= 0.6;
        const outerCornerX = isLeftSide ? minX + 0.19 : maxX - 0.19;
        const outerCornerZ = maxZ - 0.19;
        const houseSideX = isLeftSide ? maxX : minX;
        const houseSideZ = minZ;

        const alfPierGeom = new THREE.BoxGeometry(0.36, porchH, 0.36);
        const alfPierSid: SemanticSurfaceId =
          facade === "modern" || facade === "contempo" || facade === "skillion"
            ? "portico_facade"
            : "exterior_wall_main";
        const alfPierMesh = new THREE.Mesh(alfPierGeom, this.getSurfaceMaterial(alfPierSid));
        alfPierMesh.position.set(outerCornerX, ffl + porchH / 2, outerCornerZ);
        alfPierMesh.castShadow = true;
        alfPierMesh.receiveShadow = true;
        alfPierMesh.userData.surfaceId = alfPierSid;
        this.facadeGroup.add(alfPierMesh);

        const rearSpanW = Math.abs(houseSideX - outerCornerX) + 0.36;
        const rearBeamGeom = new THREE.BoxGeometry(rearSpanW, 0.24, 0.28);
        const rearBeamMesh = new THREE.Mesh(rearBeamGeom, this.getSurfaceMaterial("portico_facade"));
        rearBeamMesh.position.set((houseSideX + outerCornerX) / 2, ffl + porchH - 0.12, outerCornerZ);
        rearBeamMesh.castShadow = true;
        rearBeamMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(rearBeamMesh);

        const sideSpanD = Math.abs(outerCornerZ - houseSideZ) + 0.36;
        const sideBeamGeom = new THREE.BoxGeometry(0.28, 0.24, sideSpanD);
        const sideBeamMesh = new THREE.Mesh(sideBeamGeom, this.getSurfaceMaterial("portico_facade"));
        sideBeamMesh.position.set(outerCornerX, ffl + porchH - 0.12, (houseSideZ + outerCornerZ) / 2);
        sideBeamMesh.castShadow = true;
        sideBeamMesh.userData.surfaceId = "portico_facade";
        this.facadeGroup.add(sideBeamMesh);
      }
    }
  }

  private showBlueprintUnderlay = true;
  private activeLevelFilter: "all" | number = "all";

  public setBlueprintUnderlay(show: boolean): void {
    this.showBlueprintUnderlay = show;
    this.rebuildScene(true);
  }

  public getBlueprintUnderlay(): boolean {
    return this.showBlueprintUnderlay;
  }

  public setWallXrayMode(enabled: boolean): void {
    this.wallXrayMode = enabled;
    this.rebuildScene(true);
  }

  public getWallXrayMode(): boolean {
    return this.wallXrayMode;
  }

  public setL2Calibration(cal: { offsetX?: number; offsetZ?: number; scale?: number }): void {
    if (!this.design) return;
    const newX = cal.offsetX !== undefined ? +cal.offsetX.toFixed(2) : this.l2Calibration.offsetX;
    const newZ = cal.offsetZ !== undefined ? +cal.offsetZ.toFixed(2) : this.l2Calibration.offsetZ;
    const newScale = cal.scale !== undefined ? +cal.scale.toFixed(3) : this.l2Calibration.scale;

    const dx = newX - this.l2Calibration.offsetX;
    const dz = newZ - this.l2Calibration.offsetZ;
    const scaleRatio = newScale / (this.l2Calibration.scale || 1.0);

    this.l2Calibration = { offsetX: newX, offsetZ: newZ, scale: newScale };

    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4 && Math.abs(scaleRatio - 1) < 1e-4) {
      return;
    }

    const l2Lvl = (this.design.levels || []).find((l) => l.level === 2);
    const pivotX = l2Lvl ? l2Lvl.worldBounds.x + l2Lvl.worldBounds.widthM / 2 : this.design.widthM / 2;
    const pivotZ = l2Lvl ? l2Lvl.worldBounds.z + l2Lvl.worldBounds.depthM / 2 : this.design.lengthM / 2;

    const transformPt = (pt: [number, number]): [number, number] => [
      +((pt[0] - pivotX) * scaleRatio + pivotX + dx).toFixed(3),
      +((pt[1] - pivotZ) * scaleRatio + pivotZ + dz).toFixed(3),
    ];

    if (l2Lvl) {
      const newW = +(l2Lvl.worldBounds.widthM * scaleRatio).toFixed(2);
      const newD = +(l2Lvl.worldBounds.depthM * scaleRatio).toFixed(2);
      l2Lvl.worldBounds = {
        x: +(pivotX - newW / 2 + dx).toFixed(2),
        z: +(pivotZ - newD / 2 + dz).toFixed(2),
        widthM: newW,
        depthM: newD,
      };
    }

    for (const w of this.design.walls || []) {
      if ((w.level ?? 0) === 2) {
        w.start = transformPt(w.start);
        w.end = transformPt(w.end);
      }
    }
    for (const op of this.design.openings || []) {
      if ((op.level ?? 0) === 2) {
        op.position = transformPt(op.position);
        op.width = +(op.width * scaleRatio).toFixed(3);
        if (op.hingePoint) op.hingePoint = transformPt(op.hingePoint);
        if (op.closedPoint) op.closedPoint = transformPt(op.closedPoint);
        if (op.openPoint) op.openPoint = transformPt(op.openPoint);
        if (op.bifoldPeak) op.bifoldPeak = transformPt(op.bifoldPeak);
      }
    }
    for (const h of this.design.openHampers || []) {
      if ((h.level ?? 0) === 2) {
        h.start = transformPt(h.start);
        h.end = transformPt(h.end);
      }
    }
    for (const r of this.design.rooms || []) {
      if ((r.level ?? 0) === 2) {
        r.polygon = r.polygon.map((p) => transformPt(p));
        r.center = transformPt(r.center);
      }
    }
    for (const f of this.design.fixtures || []) {
      if ((f.level ?? 0) === 2) {
        const tp = transformPt([f.position[0], f.position[2]]);
        f.position = [tp[0], f.position[1], tp[1]];
      }
    }

    this.rebuildScene(true);
  }

  public getL2Calibration(): { offsetX: number; offsetZ: number; scale: number } {
    return { ...this.l2Calibration };
  }

  public setLevelFilter(level: "all" | number): void {
    this.activeLevelFilter = level;
    this.rebuildScene(true);
  }

  public getLevelFilter(): "all" | number {
    return this.activeLevelFilter;
  }

  private createTransparentBlueprintTexture(
    img: HTMLImageElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    cacheKey: string
  ): THREE.CanvasTexture | null {
    const cached = this.blueprintTextureCache.get(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    try {
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > 210) {
          // Make white paper background 100% transparent so 3D floor finishes shine through and nothing sticks out past external walls
          data[i + 3] = 0;
        } else {
          data[i + 3] = Math.min(220, Math.round((225 - lum) * 1.45));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Cross-origin fallback if needed
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    this.blueprintTextureCache.set(cacheKey, tex);
    return tex;
  }

  private buildRoomFloors(): void {
    if (!this.design) return;

    const hasBlueprintUnderlay = Boolean(
      this.showBlueprintUnderlay &&
      this.design.floorplanImageUrl &&
      this.design.floorplanCrop
    );

    if (hasBlueprintUnderlay && this.design.floorplanImageUrl && this.design.floorplanCrop) {
      const wM = this.design.widthM;
      const lM = this.design.lengthM;
      const mainCrop = this.design.floorplanCrop;
      const url = encodeURI(this.design.floorplanImageUrl);
      const overlayOpacity = this.wallXrayMode ? 0.78 : 0.36;

      if (this.design.levels && this.design.levels.length > 1) {
        const levelEntries = this.design.levels.filter(
          (lvl) => this.activeLevelFilter === "all" || lvl.level === this.activeLevelFilter
        );
        const levelMats: {
          lvl: (typeof levelEntries)[number];
          mat: THREE.MeshBasicMaterial;
          mesh: THREE.Mesh;
        }[] = [];

        for (const lvl of levelEntries) {
          const b = lvl.worldBounds;
          const pW = Math.max(0.5, b.widthM);
          const pL = Math.max(0.5, b.depthM);
          const pX = b.x + pW / 2;
          const pZ = b.z + pL / 2;
          const pY = 0.319 + (lvl.elevationOffsetM || 0);

          const baseGeom = new THREE.PlaneGeometry(pW, pL);
          const baseMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: overlayOpacity,
            depthWrite: false,
          });
          const baseMesh = new THREE.Mesh(baseGeom, baseMat);
          baseMesh.rotation.x = -Math.PI / 2;
          baseMesh.position.set(pX, pY, pZ);
          baseMesh.visible = false;
          baseMesh.userData.isBlueprintUnderlay = true;
          this.buildingGroup.add(baseMesh);
          levelMats.push({ lvl, mat: baseMat, mesh: baseMesh });
        }

        if (typeof document !== "undefined" && levelMats.length > 0) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            for (const { lvl, mat, mesh } of levelMats) {
              const sx = lvl.floorplanCrop.minX;
              const sy = lvl.floorplanCrop.minY;
              const sw = Math.max(16, lvl.floorplanCrop.maxX - lvl.floorplanCrop.minX);
              const sh = Math.max(16, lvl.floorplanCrop.maxY - lvl.floorplanCrop.minY);
              const cacheKey = `${url}_${sx}_${sy}_${sw}_${sh}`;
              const tex = this.createTransparentBlueprintTexture(img, sx, sy, sw, sh, cacheKey);
              if (tex) {
                mat.map = tex;
                mat.needsUpdate = true;
                mesh.visible = this.cameraMode !== "walkthrough";
              }
            }
          };
          img.src = url;
        }
      } else {
        // Single-Level Transparent CAD Linework Overlay on Top of 3D Room Floors
        const baseGeom = new THREE.PlaneGeometry(wM, lM);
        const baseMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: overlayOpacity,
          depthWrite: false,
        });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.rotation.x = -Math.PI / 2;
        baseMesh.position.set(wM / 2, 0.319, lM / 2);
        baseMesh.visible = false;
        baseMesh.userData.isBlueprintUnderlay = true;
        this.buildingGroup.add(baseMesh);

        if (typeof document !== "undefined") {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const cropW = Math.max(16, mainCrop.maxX - mainCrop.minX);
            const cropH = Math.max(16, mainCrop.maxY - mainCrop.minY);
            const cacheKey = `${url}_${mainCrop.minX}_${mainCrop.minY}_${cropW}_${cropH}`;
            const tex = this.createTransparentBlueprintTexture(
              img,
              mainCrop.minX,
              mainCrop.minY,
              cropW,
              cropH,
              cacheKey
            );
            if (tex) {
              baseMat.map = tex;
              baseMat.needsUpdate = true;
              baseMesh.visible = this.cameraMode !== "walkthrough";
            }
          };
          img.src = url;
        }

        // Build Alfresco NE 350x350mm Brick Pier & Porch SE Twin 90x90mm Posts shown on Amber 21 floorplan
        if (this.design.id === "amber-21") {
          const ceilingH = this.design.ceilingHeightM || 2.44;
          const ffl = 0.30;
          const alfPierGeom = new THREE.BoxGeometry(0.35, ceilingH, 0.35);
          const alfPier = new THREE.Mesh(alfPierGeom, this.getSurfaceMaterial("exterior_wall_main"));
          alfPier.position.set(6.845, ffl + ceilingH / 2, 0.175);
          alfPier.castShadow = true;
          alfPier.userData.surfaceId = "exterior_wall_main";
          this.buildingGroup.add(alfPier);

          const alfPierCap = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.025, 0.36),
            this.showCadDiagnosticCaps
              ? new THREE.MeshBasicMaterial({ color: 0xb91c1c })
              : this.materials.stoneCap
          );
          alfPierCap.position.set(6.845, ffl + ceilingH + 0.012, 0.175);
          this.buildingGroup.add(alfPierCap);

          [4.59, 4.78].forEach((px) => {
            const post = new THREE.Mesh(
              new THREE.BoxGeometry(0.09, ceilingH, 0.09),
              this.getSurfaceMaterial("portico_facade")
            );
            post.position.set(px, ffl + ceilingH / 2, 19.91);
            post.castShadow = true;
            post.userData.surfaceId = "portico_facade";
            this.buildingGroup.add(post);
          });
        }
      }
    }

    // Always build semantic 3D PBR room floor meshes, ceiling soffits, skirting boards & feature wall
    const ceilingH = this.design.ceilingHeightM || 2.44;
    let featureWallAdded = false;
    const allRooms = this.design.rooms || [];

    allRooms.forEach((room) => {
      if (room.name === "Void") return; // Stairwell void is an open floor cutout
      const roomLevel = room.level ?? 0;
      if (this.activeLevelFilter !== "all" && roomLevel !== this.activeLevelFilter) return;
      if (!room.polygon || room.polygon.length < 3) return;

      const clampedPoly = this.clampPolygonToLevelExteriorWalls(room.polygon, roomLevel);

      // Floor shape uses (px, -pz) + rotation.x = -Math.PI/2 so face normal points straight UP (+Y)
      const floorShape = new THREE.Shape();
      const ceilingShape = new THREE.Shape();
      const p0 = clampedPoly[0];
      floorShape.moveTo(p0[0], -p0[1]);
      ceilingShape.moveTo(p0[0], p0[1]);
      for (let i = 1; i < clampedPoly.length; i++) {
        floorShape.lineTo(clampedPoly[i][0], -clampedPoly[i][1]);
        ceilingShape.lineTo(clampedPoly[i][0], clampedPoly[i][1]);
      }
      floorShape.closePath();
      ceilingShape.closePath();

      // Cut out Stairwell Void holes inside large upper-floor room floor meshes
      if (roomLevel >= 2 && room.areaM2 > 16) {
        const rxs = clampedPoly.map((p) => p[0]);
        const rzs = clampedPoly.map((p) => p[1]);
        const rMinX = Math.min(...rxs);
        const rMaxX = Math.max(...rxs);
        const rMinZ = Math.min(...rzs);
        const rMaxZ = Math.max(...rzs);
        const voidRooms = allRooms.filter(
          (vr) => (vr.level ?? 0) === roomLevel && vr.name === "Void" && vr.polygon?.length >= 3
        );
        for (const vr of voidRooms) {
          if (
            vr.center[0] >= rMinX &&
            vr.center[0] <= rMaxX &&
            vr.center[1] >= rMinZ &&
            vr.center[1] <= rMaxZ
          ) {
            const floorHole = new THREE.Path();
            const ceilHole = new THREE.Path();
            vr.polygon.forEach(([vx, vz], idx) => {
              if (idx === 0) {
                floorHole.moveTo(vx, -vz);
                ceilHole.moveTo(vx, vz);
              } else {
                floorHole.lineTo(vx, -vz);
                ceilHole.lineTo(vx, vz);
              }
            });
            floorHole.closePath();
            ceilHole.closePath();
            floorShape.holes.push(floorHole);
            ceilingShape.holes.push(ceilHole);
          }
        }
      }

      const rName = `${room.name || ""} ${room.customLabel || ""}`.toLowerCase();
      const isGarageZone = rName.includes("garage") || room.floorFinish === "concrete";
      const isTiledOutdoorZone =
        rName.includes("alfresco") || rName.includes("porch") || rName.includes("balcony");
      const isOutdoorZone = isGarageZone || isTiledOutdoorZone;

      const isBedroomOrCarpetRoom =
        !isOutdoorZone &&
        (room.floorFinish === "carpet" ||
          rName.includes("bed") ||
          rName.includes("master") ||
          rName.includes("wir") ||
          rName.includes("robe") ||
          rName.includes("media") ||
          rName.includes("cinema") ||
          rName.includes("theatre") ||
          rName.includes("lounge") ||
          rName.includes("study"));

      const isWetRoom =
        !isOutdoorZone &&
        !isBedroomOrCarpetRoom &&
        (rName.includes("bath") ||
          rName.includes("ensuite") ||
          rName.includes("wc") ||
          rName.includes("powder") ||
          rName.includes("laundry"));

      // Enforce user floor rules:
      // - Garage: Concreted (this.materials.concrete)
      // - Alfresco / Porch / Balcony: Tiled (interior_floor_wet_areas)
      // - Rooms (Bedrooms, Media, Cinema, Lounge, Study, WIR): Carpet (interior_floor_bedrooms)
      // - Living Area (Living, Family, Dining, Kitchen, Entry, Hallway) & Wet Areas: Tiled (interior_floor_living / interior_floor_wet_areas)
      let floorSurfaceId: SemanticSurfaceId | undefined = "interior_floor_living";
      if (isGarageZone) {
        floorSurfaceId = undefined;
      } else if (isTiledOutdoorZone || isWetRoom) {
        floorSurfaceId = "interior_floor_wet_areas";
      } else if (isBedroomOrCarpetRoom) {
        floorSurfaceId = "interior_floor_bedrooms";
      } else {
        floorSurfaceId = "interior_floor_living";
      }

      const floorGeom = new THREE.ShapeGeometry(floorShape);
      const floorMat = isGarageZone
        ? this.materials.concrete
        : this.getSurfaceMaterial(floorSurfaceId!);
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;

      const isBaseEnvelopePolygon =
        room.id === "r_main_core" ||
        room.id === "r_ff_living" ||
        room.id.includes("_split_rear") ||
        room.id.includes("_ground_front");
      const isSecondaryWingPolygon =
        room.id === "r_front_wing" || room.id === "r_north_wing";
      const isTertiaryCorridorPolygon =
        room.id === "r_entry" || room.id === "r_front_mid_room";
      const elevOffset = room.elevationOffsetM || 0;
      const baseFloorY = isBaseEnvelopePolygon
        ? 0.306
        : isSecondaryWingPolygon
        ? 0.309
        : isTertiaryCorridorPolygon
        ? 0.312
        : 0.315;
      floorMesh.position.y = baseFloorY + elevOffset;
      floorMesh.receiveShadow = true;
      if (floorSurfaceId) {
        floorMesh.userData.surfaceId = floorSurfaceId;
      } else {
        applyWorldSpaceUVs(floorGeom, 2.0, floorMesh.scale);
      }
      floorMesh.userData.isSemanticRoomFloor = true;
      floorMesh.userData.elevationOffsetM = elevOffset;
      this.buildingGroup.add(floorMesh);

      // Build Interior Ceiling Soffit Plane (visible in Virtual Walkthrough mode for realistic enclosed rooms)
      if (!isOutdoorZone) {
        const ceilingGeom = new THREE.ShapeGeometry(ceilingShape);
        const ceilingMesh = new THREE.Mesh(
          ceilingGeom,
          this.getSurfaceMaterial("interior_ceiling")
        );
        ceilingMesh.rotation.x = Math.PI / 2;
        ceilingMesh.position.y = 0.30 + ceilingH - 0.01 + elevOffset;
        ceilingMesh.visible = this.cameraMode === "walkthrough";
        ceilingMesh.userData.surfaceId = "interior_ceiling";
        ceilingMesh.userData.isInteriorCeiling = true;
        this.buildingGroup.add(ceilingMesh);

        // Build 67x18mm Interior Skirting Boards along room polygon edges
        for (let i = 0; i < clampedPoly.length; i++) {
          const a = clampedPoly[i];
          const b = clampedPoly[(i + 1) % clampedPoly.length];
          const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (edgeLen < 0.8) continue;
          const edgeAng = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const skirtGeom = new THREE.BoxGeometry(edgeLen - 0.2, 0.067, 0.018);
          const skirtMesh = new THREE.Mesh(
            skirtGeom,
            this.getSurfaceMaterial("interior_skirting_architraves")
          );
          skirtMesh.position.set(
            (a[0] + b[0]) / 2,
            0.312 + 0.0335 + elevOffset,
            (a[1] + b[1]) / 2
          );
          skirtMesh.rotation.y = -edgeAng;
          skirtMesh.userData.surfaceId = "interior_skirting_architraves";
          this.buildingGroup.add(skirtMesh);
        }

        // Build Architectural Interior Feature Wall panel in Master Suite or Living room
        if (!featureWallAdded && (rName.includes("master") || rName.includes("living"))) {
          featureWallAdded = true;
          const a = clampedPoly[0];
          const b = clampedPoly[1];
          const featLen = Math.max(1.8, Math.hypot(b[0] - a[0], b[1] - a[1]) - 0.3);
          const featAng = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const featGeom = new THREE.BoxGeometry(featLen, ceilingH - 0.08, 0.022);
          const featMesh = new THREE.Mesh(
            featGeom,
            this.getSurfaceMaterial("interior_feature_wall")
          );
          featMesh.position.set(
            (a[0] + b[0]) / 2,
            0.30 + ceilingH / 2 + elevOffset,
            (a[1] + b[1]) / 2 + 0.06
          );
          featMesh.rotation.y = -featAng;
          featMesh.castShadow = true;
          featMesh.receiveShadow = true;
          featMesh.userData.surfaceId = "interior_feature_wall";
          this.buildingGroup.add(featMesh);
        }
      }
    });
  }

  /**
   * Determines whether a world-space point (px, pz) lies inside the enclosed indoor
   * interior of the home on the given level (excluding open-air Alfresco, Porch, and Balcony zones).
   */
  private isPointIndoors(px: number, pz: number, level = 0): boolean {
    if (!this.design) return false;
    const W = this.design.widthM || 10.55;
    const L = this.design.lengthM || 20.27;
    if (px < 0.18 || px > W - 0.18 || pz < 0.18 || pz > L - 0.18) {
      return false;
    }

    const pt = new THREE.Vector2(px, pz);
    for (const room of this.design.rooms || []) {
      if ((room.level ?? 0) !== level) continue;
      const rName = (room.name || "").toLowerCase();
      if (rName.includes("alfresco") || rName.includes("porch") || rName.includes("balcony")) {
        if (room.polygon && room.polygon.length >= 3 && pointInPolygon(pt, room.polygon)) {
          return false;
        }
      }
    }

    const levelWalls = (this.design.walls || []).filter((w) => (w.level ?? 0) === level);
    const walls = levelWalls.length > 0 ? levelWalls : (this.design.walls || []);
    if (walls.length > 0) {
      let minXAtZ = Infinity;
      let maxXAtZ = -Infinity;
      let minZAtX = Infinity;
      let maxZAtX = -Infinity;

      for (const w of walls) {
        const x0 = Math.min(w.start[0], w.end[0]);
        const x1 = Math.max(w.start[0], w.end[0]);
        const z0 = Math.min(w.start[1], w.end[1]);
        const z1 = Math.max(w.start[1], w.end[1]);
        if (pz >= z0 - 0.35 && pz <= z1 + 0.35) {
          if (x0 < minXAtZ) minXAtZ = x0;
          if (x1 > maxXAtZ) maxXAtZ = x1;
        }
        if (px >= x0 - 0.35 && px <= x1 + 0.35) {
          if (z0 < minZAtX) minZAtX = z0;
          if (z1 > maxZAtX) maxZAtX = z1;
        }
      }

      if (minXAtZ < maxXAtZ && (px < minXAtZ + 0.15 || px > maxXAtZ - 0.15)) {
        return false;
      }
      if (minZAtX < maxZAtX && (pz < minZAtX + 0.15 || pz > maxZAtX - 0.15)) {
        return false;
      }
    }

    return true;
  }

  private classifyWallSides(
    isExterior: boolean,
    posX: number,
    posZ: number,
    angle: number,
    level = 0
  ): { bothIndoors: boolean; inSign: 1 | -1 } {
    if (!isExterior) {
      return { bothIndoors: true, inSign: 1 };
    }
    const nPlusX = -Math.sin(angle);
    const nPlusZ = Math.cos(angle);
    const sampleDist = 0.42;

    const plusIndoors = this.isPointIndoors(posX + nPlusX * sampleDist, posZ + nPlusZ * sampleDist, level);
    const minusIndoors = this.isPointIndoors(posX - nPlusX * sampleDist, posZ - nPlusZ * sampleDist, level);

    if (plusIndoors && minusIndoors) {
      return { bothIndoors: true, inSign: 1 };
    }
    if (plusIndoors && !minusIndoors) {
      return { bothIndoors: false, inSign: 1 };
    }
    if (!plusIndoors && minusIndoors) {
      return { bothIndoors: false, inSign: -1 };
    }

    const centerX = (this.design?.widthM || 10.55) / 2;
    const centerZ = (this.design?.lengthM || 20.27) / 2;
    const dotPlusZ = (centerX - posX) * nPlusX + (centerZ - posZ) * nPlusZ;
    return { bothIndoors: false, inSign: dotPlusZ >= 0 ? 1 : -1 };
  }

  /**
   * Returns a 6-face material array for exterior walls so that:
   * - Any wall with both sides indoors (or `!isExterior`) is painted white plaster on all sides (`this.materials.interiorWall`)
   * - The outside face of true exterior 250mm walls uses exterior face brick (`this.materials.brick`)
   * - The inside face of true exterior 250mm walls is painted white plaster (`this.materials.interiorWall`)
   */
  private getWallMaterials(
    isExterior: boolean,
    posX: number,
    posZ: number,
    angle: number,
    level = 0
  ): THREE.Material | THREE.Material[] {
    const withXray = (baseMat: THREE.Material): THREE.Material => {
      if (!this.wallXrayMode) return baseMat;
      const cloned = baseMat.clone();
      cloned.transparent = true;
      cloned.opacity = 0.65;
      cloned.userData = { ...baseMat.userData, isXrayClone: true };
      return cloned;
    };

    const { bothIndoors, inSign } = this.classifyWallSides(isExterior, posX, posZ, angle, level);
    if (bothIndoors) {
      return withXray(this.materials.interiorWall);
    }
    const extMat = level >= 2 ? this.materials.cladding : this.materials.brick;
    const plusZMat = inSign === 1 ? this.materials.interiorWall : extMat;
    const minusZMat = inSign === 1 ? extMat : this.materials.interiorWall;

    return [
      withXray(this.materials.interiorWall), // +X jamb reveal (painted)
      withXray(this.materials.interiorWall), // -X jamb reveal (painted)
      withXray(extMat),                      // +Y top
      withXray(extMat),                      // -Y bottom
      withXray(plusZMat),                    // +Z face
      withXray(minusZMat),                   // -Z face
    ];
  }

  /**
   * Builds a hollow 4-bar rectangular frame (top head, bottom sill, left jamb, right jamb)
   * so glass panels inside are truly see-through instead of occluded by a solid box.
   */
  private addHollowFrame(
    parent: THREE.Group,
    width: number,
    height: number,
    depth: number,
    barThick: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    mat: THREE.Material,
    surfaceId?: SemanticSurfaceId
  ): void {
    const topGeom = new THREE.BoxGeometry(width, barThick, depth);
    const topMesh = new THREE.Mesh(topGeom, mat);
    topMesh.position.set(centerX, centerY + height / 2 - barThick / 2, centerZ);
    if (surfaceId) topMesh.userData.surfaceId = surfaceId;
    parent.add(topMesh);

    const botGeom = new THREE.BoxGeometry(width, barThick, depth);
    const botMesh = new THREE.Mesh(botGeom, mat);
    botMesh.position.set(centerX, centerY - height / 2 + barThick / 2, centerZ);
    if (surfaceId) botMesh.userData.surfaceId = surfaceId;
    parent.add(botMesh);

    const sideH = Math.max(0.02, height - barThick * 2);
    const sideGeom = new THREE.BoxGeometry(barThick, sideH, depth);

    const leftMesh = new THREE.Mesh(sideGeom, mat);
    leftMesh.position.set(centerX - width / 2 + barThick / 2, centerY, centerZ);
    if (surfaceId) leftMesh.userData.surfaceId = surfaceId;
    parent.add(leftMesh);

    const rightMesh = new THREE.Mesh(sideGeom, mat);
    rightMesh.position.set(centerX + width / 2 - barThick / 2, centerY, centerZ);
    if (surfaceId) rightMesh.userData.surfaceId = surfaceId;
    parent.add(rightMesh);
  }

  /**
   * Renders a wall segment along with its structural top cross-section cap:
   * - External Walls (250mm Face Brick / Upper Cladding outside + Painted White Plaster inside)
   * - Internal Walls (90mm Total): 10mm white plaster + 70mm structural stud frame + 10mm white plaster
   */
  private addStructuralWallPiece(
    len: number,
    pieceH: number,
    yCenter: number,
    yTop: number,
    thickness: number,
    isExterior: boolean,
    posX: number,
    posZ: number,
    angle: number,
    level = 0,
    wallId?: string
  ): void {
    const { bothIndoors, inSign } = this.classifyWallSides(isExterior, posX, posZ, angle, level);
    const mat = this.getWallMaterials(isExterior, posX, posZ, angle, level);
    const geom = new THREE.BoxGeometry(len, pieceH, thickness);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(posX, yCenter, posZ);
    mesh.rotation.y = -angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.surfaceId =
      isExterior && !bothIndoors
        ? level >= 2
          ? "exterior_cladding_feature"
          : "exterior_wall_main"
        : "interior_walls_main";
    mesh.userData.hasInteriorSurfaceId = "interior_walls_main";
    if (wallId) {
      mesh.userData.selectableElement = {
        id: wallId,
        kind: "wall",
        elementType: isExterior && !bothIndoors ? "exterior_wall" : "interior_wall",
        label:
          isExterior && !bothIndoors
            ? "Exterior Structural Wall (240mm)"
            : "Internal Stud Partition Wall (90mm)",
        level,
        position: [posX, yCenter, posZ],
        rotationDeg: Math.round(((-angle * 180) / Math.PI + 360) % 360),
      } satisfies SceneSelectedElement;
    }
    this.buildingGroup.add(mesh);

    // Structural Top Cross-Section Cap (Realistic masonry/plaster by default; diagnostic CAD colors only if enabled)
    const capH = 0.012;
    const capY = yTop + capH / 2 + 0.001;

    if (isExterior && !bothIndoors) {
      const extCapGroup = new THREE.Group();
      const plasterThick = 0.015;
      const brickThick = Math.max(0.10, thickness - plasterThick);

      const coreGeom = new THREE.BoxGeometry(len, capH, brickThick);
      const extMat = level >= 2 ? this.materials.cladding : this.materials.brick;
      const coreMat = this.showCadDiagnosticCaps
        ? new THREE.MeshBasicMaterial({ color: 0xb91c1c })
        : extMat;
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      coreMesh.position.z = -inSign * (plasterThick / 2);
      extCapGroup.add(coreMesh);

      const innerPlasterGeom = new THREE.BoxGeometry(len, capH + 0.001, plasterThick);
      const innerPlasterMat = this.showCadDiagnosticCaps
        ? new THREE.MeshBasicMaterial({ color: 0xffffff })
        : this.materials.interiorWall;
      const innerPlasterMesh = new THREE.Mesh(innerPlasterGeom, innerPlasterMat);
      innerPlasterMesh.position.z = inSign * (brickThick / 2);
      extCapGroup.add(innerPlasterMesh);

      extCapGroup.position.set(posX, capY, posZ);
      extCapGroup.rotation.y = -angle;
      this.buildingGroup.add(extCapGroup);
    } else {
      const intCapGroup = new THREE.Group();
      if (this.showCadDiagnosticCaps) {
        const plasterThick = 0.012;
        const frameThick = Math.max(0.05, thickness - plasterThick * 2);

        const frameGeom = new THREE.BoxGeometry(len, capH + 0.002, frameThick);
        const frameMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
        intCapGroup.add(new THREE.Mesh(frameGeom, frameMat));

        const plasterGeom = new THREE.BoxGeometry(len, capH, plasterThick);
        const plasterMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const plasterSideA = new THREE.Mesh(plasterGeom, plasterMat);
        plasterSideA.position.z = -(frameThick / 2 + plasterThick / 2);
        intCapGroup.add(plasterSideA);

        const plasterSideB = new THREE.Mesh(plasterGeom, plasterMat);
        plasterSideB.position.z = frameThick / 2 + plasterThick / 2;
        intCapGroup.add(plasterSideB);
      } else {
        // Realistic painted plasterboard top cap
        const capGeom = new THREE.BoxGeometry(len, capH, thickness);
        const capMesh = new THREE.Mesh(capGeom, this.materials.interiorWall);
        intCapGroup.add(capMesh);
      }

      intCapGroup.position.set(posX, capY, posZ);
      intCapGroup.rotation.y = -angle;
      this.buildingGroup.add(intCapGroup);
    }
  }

  /**
   * Applies the 2740mm+ ceiling height upgrade option:
   * - All internal & external doors / stackers / sliders / cavity sliders -> 2340mm (2.34m)
   * - Sectional garage door -> 2400mm (2.40m)
   * - Windows with 2100mm heads -> aligned to 2340mm (2.34m) head height
   */
  private getEffectiveOpening(op: Opening3D): Opening3D {
    const ceilingH = this.design?.ceilingHeightM || 2.44;
    const upgradeHeights =
      ceilingH >= 2.70 && this.design?.fitout?.upgradeDoorJoineryHeights !== false;
    if (!upgradeHeights) return op;

    if (op.type === "garage_door") {
      const h = Math.min(ceilingH - 0.14, Math.max(op.height, 2.40));
      return { ...op, height: h, headHeight: h };
    }
    if (op.type !== "window") {
      const h = Math.min(ceilingH - 0.14, Math.max(op.height, 2.34));
      return { ...op, height: h, headHeight: h };
    }
    if (op.type === "window" && op.headHeight >= 2.04 && op.headHeight < 2.34) {
      const newHead = 2.34;
      const newH = Math.max(0.60, newHead - op.sillHeight);
      return { ...op, height: newH, headHeight: newHead };
    }
    return op;
  }

  private buildWallsAndOpenings(): void {
    if (!this.design) return;
    const ceilingH = this.design.ceilingHeightM;
    const openings = (this.design.openings || []).map((op) => this.getEffectiveOpening(op));
    const walls = this.design.walls || [];
    const wallIdsOnLevel = new Set(walls.map((w) => w.id));
    const renderedOpeningIds = new Set<string>();

    // Walls & Hosted Openings
    walls.forEach((wall) => {
      const wallLevel = wall.level ?? 0;
      if (this.activeLevelFilter !== "all" && wallLevel !== this.activeLevelFilter) return;

      const ffl = 0.30 + (wall.elevationOffsetM || 0);
      const p1 = new THREE.Vector2(wall.start[0], wall.start[1]);
      const p2 = new THREE.Vector2(wall.end[0], wall.end[1]);
      const wallLen = p1.distanceTo(p2);
      if (wallLen < 0.08) return;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;

      // Constraint B: Match openings primarily by hosted `op.wallId === wall.id`, with geometric fallback
      const isWallHorizontal = Math.abs(p1.y - p2.y) <= Math.abs(p1.x - p2.x);
      const wallOpenings = openings.filter((op) => {
        if (renderedOpeningIds.has(op.id)) return false;
        if ((op.level ?? 0) !== wallLevel) return false;
        const requiresExterior =
          op.type === "window" ||
          op.type === "garage_door" ||
          op.type === "sliding_door" ||
          op.type === "stacker_door";
        if (requiresExterior && !wall.isExterior) return false;
        if (op.wallId && wallIdsOnLevel.has(op.wallId)) {
          return op.wallId === wall.id;
        }
        if (op.wallOrientation) {
          const opHoriz = op.wallOrientation === "horizontal";
          if (opHoriz !== isWallHorizontal) return false;
        }
        const opPos = new THREE.Vector2(op.position[0], op.position[1]);
        const dist = distToSegment(opPos, p1, p2);
        return dist < 0.24;
      });

      const wallH = wall.height || ceilingH;

      if (wallOpenings.length === 0) {
        // Continuous Wall (No openings)
        this.addStructuralWallPiece(
          wallLen,
          wallH,
          ffl + wallH / 2,
          ffl + wallH,
          wall.thickness,
          wall.isExterior,
          midX,
          midZ,
          angle,
          wallLevel,
          wall.id
        );
      } else {
        // Constraint B: Multi-Opening Interval Slicing with minimum 0.08m pier guard
        const rawIntervals = wallOpenings
          .map((op) => {
            if (op.hingePoint && op.closedPoint) {
              const d1 = p1.distanceTo(new THREE.Vector2(op.hingePoint[0], op.hingePoint[1]));
              const d2 = p1.distanceTo(new THREE.Vector2(op.closedPoint[0], op.closedPoint[1]));
              const openStart = Math.max(0, Math.min(d1, d2));
              const openEnd = Math.min(wallLen, Math.max(d1, d2));
              return { op, d: (openStart + openEnd) / 2, openStart, openEnd };
            }
            const opPos = new THREE.Vector2(op.position[0], op.position[1]);
            const d =
              op.positionAlongWallRatio !== undefined && op.wallId === wall.id
                ? op.positionAlongWallRatio * wallLen
                : p1.distanceTo(opPos);
            const clampedW = Math.min(op.width, Math.max(0.20, wallLen - 0.12));
            const opHalfW = clampedW / 2;
            const openStart = Math.max(0.06, Math.min(wallLen - clampedW - 0.06, d - opHalfW));
            const openEnd = Math.min(wallLen - 0.06, openStart + clampedW);
            return {
              op,
              d: (openStart + openEnd) / 2,
              openStart,
              openEnd,
            };
          })
          .sort((a, b) => a.openStart - b.openStart);

        // Enforce non-overlapping opening intervals with at least 0.08m structural pier or clean abutment
        const sorted: typeof rawIntervals = [];
        for (const item of rawIntervals) {
          if (sorted.length === 0) {
            sorted.push(item);
            continue;
          }
          const prev = sorted[sorted.length - 1];
          if (item.openStart < prev.openEnd + 0.08) {
            const shiftedStart = Math.max(prev.openEnd, item.openStart);
            const w = item.openEnd - item.openStart;
            const shiftedEnd = Math.min(wallLen, shiftedStart + w);
            if (shiftedEnd - shiftedStart >= 0.25) {
              sorted.push({
                op: item.op,
                d: (shiftedStart + shiftedEnd) / 2,
                openStart: shiftedStart,
                openEnd: shiftedEnd,
              });
            }
          } else {
            sorted.push(item);
          }
        }

        let curDist = 0;
        sorted.forEach(({ op, openStart, openEnd }) => {
          renderedOpeningIds.add(op.id);
          // 1. Left pier before opening
          const pierLen = openStart - curDist;
          if (pierLen >= 0.06) {
            const pierMid = curDist + pierLen / 2;
            const posX = p1.x + Math.cos(angle) * pierMid;
            const posZ = p1.y + Math.sin(angle) * pierMid;
            this.addStructuralWallPiece(
              pierLen,
              wallH,
              ffl + wallH / 2,
              ffl + wallH,
              wall.thickness,
              wall.isExterior,
              posX,
              posZ,
              angle,
              wallLevel,
              wall.id
            );
          }

          const openMid = (openStart + openEnd) / 2;
          const oX = p1.x + Math.cos(angle) * openMid;
          const oZ = p1.y + Math.sin(angle) * openMid;
          const { bothIndoors } = this.classifyWallSides(wall.isExterior, oX, oZ, angle, wallLevel);
          const openMat = this.getWallMaterials(wall.isExterior, oX, oZ, angle, wallLevel);
          const wallSid: SemanticSurfaceId =
            wall.isExterior && !bothIndoors
              ? wallLevel >= 2
                ? "exterior_cladding_feature"
                : "exterior_wall_main"
              : "interior_walls_main";

          // 2. Sill Wall under window (0 to sillHeight)
          if (op.sillHeight > 0.05) {
            const sillGeom = new THREE.BoxGeometry(openEnd - openStart, op.sillHeight, wall.thickness);
            const sillMesh = new THREE.Mesh(sillGeom, openMat);
            sillMesh.position.set(oX, ffl + op.sillHeight / 2, oZ);
            sillMesh.rotation.y = -angle;
            sillMesh.castShadow = true;
            sillMesh.receiveShadow = true;
            sillMesh.userData.surfaceId = wallSid;
            sillMesh.userData.hasInteriorSurfaceId = "interior_walls_main";
            this.buildingGroup.add(sillMesh);
          }

          // 3. Top Header / Lintel wall (headHeight to ceilingHeight) on both exterior & interior walls
          const lintelH = wallH - op.headHeight;
          if (lintelH > 0.04) {
            const lintelGeom = new THREE.BoxGeometry(openEnd - openStart, lintelH, wall.thickness);
            const lintelMesh = new THREE.Mesh(lintelGeom, openMat);
            lintelMesh.position.set(oX, ffl + op.headHeight + lintelH / 2, oZ);
            lintelMesh.rotation.y = -angle;
            lintelMesh.castShadow = true;
            lintelMesh.receiveShadow = true;
            lintelMesh.userData.surfaceId = wallSid;
            lintelMesh.userData.hasInteriorSurfaceId = "interior_walls_main";
            this.buildingGroup.add(lintelMesh);
          }

          // 4. Build Opening Geometry anchored directly onto the host wall at (oX, oZ) with clamped width
          const anchoredOp: Opening3D = {
            ...op,
            position: [oX, oZ],
            width: Math.max(0.24, openEnd - openStart),
            wallId: wall.id,
          };
          this.buildOpeningObject(anchoredOp, angle, ffl);

          curDist = openEnd;
        });

        // Final pier after last opening
        const finalPierLen = wallLen - curDist;
        if (finalPierLen >= 0.06) {
          const pierMid = curDist + finalPierLen / 2;
          const posX = p1.x + Math.cos(angle) * pierMid;
          const posZ = p1.y + Math.sin(angle) * pierMid;
          this.addStructuralWallPiece(
            finalPierLen,
            wallH,
            ffl + wallH / 2,
            ffl + wallH,
            wall.thickness,
            wall.isExterior,
            posX,
            posZ,
            angle,
            wallLevel,
            wall.id
          );
        }
      }
    });
  }

  /**
   * Builds 90mm Dashed Open Hampers:
   * - Not a door and not a full-height wall (completely open walk-through portal from floor to 2.10m / 2.34m).
   */
  private buildOpenHampers(): void {
    if (!this.design || !this.design.openHampers) return;
    const ceilingH = this.design.ceilingHeightM;
    const upgradeHeights =
      ceilingH >= 2.70 && this.design.fitout?.upgradeDoorJoineryHeights !== false;

    this.design.openHampers.forEach((hamper) => {
      if (this.activeLevelFilter !== "all" && (hamper.level ?? 0) !== this.activeLevelFilter) return;
      const ffl = 0.30 + (hamper.elevationOffsetM || 0);
      const p1 = new THREE.Vector2(hamper.start[0], hamper.start[1]);
      const p2 = new THREE.Vector2(hamper.end[0], hamper.end[1]);
      const len = p1.distanceTo(p2);
      if (len < 0.1) return;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;
      const thickness = hamper.thickness || 0.09; // 90mm
      const baseClearH = hamper.bulkheadHeightM || 2.10;
      const clearH = upgradeHeights ? Math.max(baseClearH, 2.34) : baseClearH;
      const bulkheadH = Math.max(0.20, ceilingH - clearH);

      const group = new THREE.Group();

      // 1. Overhead Open Hamper Bulkhead Header (at ceiling height, open walk-through below!)
      const headerGeom = new THREE.BoxGeometry(len, bulkheadH, thickness);
      const headerMesh = new THREE.Mesh(headerGeom, this.materials.interiorWall);
      headerMesh.position.set(0, clearH + bulkheadH / 2, 0);
      headerMesh.userData.surfaceId = "interior_walls_main";
      group.add(headerMesh);

      // 2. Diagnostic dashes only if showCadDiagnosticCaps is enabled
      if (this.showCadDiagnosticCaps) {
        const dashLen = 0.11;
        const gapLen = 0.07;
        const step = dashLen + gapLen;
        const dashMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const edgeDashMat = new THREE.MeshBasicMaterial({ color: 0x047857 });

        for (let xOffset = -len / 2 + dashLen / 2; xOffset <= len / 2 - dashLen / 2 + 0.02; xOffset += step) {
          const clampedLen = Math.min(dashLen, len / 2 - (xOffset - dashLen / 2));
          if (clampedLen <= 0.02) continue;

          const topDashGeom = new THREE.BoxGeometry(clampedLen, 0.018, thickness);
          const topDash = new THREE.Mesh(topDashGeom, dashMat);
          topDash.position.set(xOffset, ceilingH + 0.009, 0);
          group.add(topDash);

          const floorLineGeom = new THREE.BoxGeometry(clampedLen, 0.008, 0.012);
          const floorLineA = new THREE.Mesh(floorLineGeom, edgeDashMat);
          floorLineA.position.set(xOffset, 0.015, -0.039);
          group.add(floorLineA);

          const floorLineB = new THREE.Mesh(floorLineGeom, edgeDashMat);
          floorLineB.position.set(xOffset, 0.015, 0.039);
          group.add(floorLineB);
        }
      }

      group.position.set(midX, ffl, midZ);
      group.rotation.y = -angle;
      this.buildingGroup.add(group);
    });
  }

  private buildOpeningObject(op: Opening3D, angle: number, ffl: number): void {
    const group = new THREE.Group();
    const x = op.position[0];
    const z = op.position[1];
    const ceilingH = this.design?.ceilingHeightM || 2.44;
    const opLevel = op.level ?? 0;

    const selectableMeta: SceneSelectedElement = {
      id: op.id,
      kind: "opening",
      elementType: op.type,
      label: op.label || op.code || op.type,
      level: opLevel,
      position: [x, ffl + op.height / 2, z],
      rotationDeg: Math.round(((-angle * 180) / Math.PI + 360) % 360),
      wallId: op.wallId,
    };
    group.userData.selectableElement = selectableMeta;

    const facade: FacadeType = this.design?.facade || this.design?.materials?.facade || "modern";

    // Transparent Architectural Glazing Material (depthWrite: false so interior & exterior are clearly visible through glass!)
    const clearGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.08,
      transmission: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    if (op.type === "open_hamper" || op.type === "archway") {
      return;
    }

    // 1. Exact Calibrated Bifold Door (e.g. Pantry Bifold d_pantry)
    if (op.bifoldPeak) {
      const halfW = op.width / 2;
      const startPt = new THREE.Vector2(x - Math.cos(angle) * halfW, z - Math.sin(angle) * halfW);
      const endPt = new THREE.Vector2(x + Math.cos(angle) * halfW, z + Math.sin(angle) * halfW);
      const peakPt = new THREE.Vector2(op.bifoldPeak[0], op.bifoldPeak[1]);

      const leafMat = this.getSurfaceMaterial("interior_skirting_architraves");

      [
        [startPt, peakPt],
        [peakPt, endPt],
      ].forEach(([pA, pB]) => {
        const len = pA.distanceTo(pB);
        const leafAngle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
        const midX = (pA.x + pB.x) / 2;
        const midZ = (pA.y + pB.y) / 2;

        const leafGeom = new THREE.BoxGeometry(len, op.height - 0.04, 0.032);
        const leafMesh = new THREE.Mesh(leafGeom, leafMat);
        leafMesh.position.set(midX, ffl + op.height / 2, midZ);
        leafMesh.rotation.y = -leafAngle;
        leafMesh.castShadow = true;
        leafMesh.userData.surfaceId = "interior_skirting_architraves";
        leafMesh.userData.selectableElement = selectableMeta;
        this.buildingGroup.add(leafMesh);

        if (this.showCadDiagnosticCaps) {
          const capMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
          const topCapGeom = new THREE.BoxGeometry(len, 0.018, 0.045);
          const topCapMesh = new THREE.Mesh(topCapGeom, capMat);
          topCapMesh.position.set(midX, ffl + op.height + 0.009, midZ);
          topCapMesh.rotation.y = -leafAngle;
          this.buildingGroup.add(topCapMesh);
        }
      });
      return;
    }

    // 2. Exact Calibrated Hinged Door with Hollow Frame, Glazed/Panel Leaf & Quarter-Circle Swing Arc
    if (op.type === "door" && op.hingePoint && op.closedPoint && op.openPoint) {
      const hinge = new THREE.Vector2(op.hingePoint[0], op.hingePoint[1]);
      const closed = new THREE.Vector2(op.closedPoint[0], op.closedPoint[1]);
      const open = new THREE.Vector2(op.openPoint[0], op.openPoint[1]);

      const leafLen = hinge.distanceTo(open);
      const leafAngle = Math.atan2(open.y - hinge.y, open.x - hinge.x);
      const leafMidX = (hinge.x + open.x) / 2;
      const leafMidZ = (hinge.y + open.y) / 2;

      const isExt = Boolean(op.isExterior);
      const frameSid: SemanticSurfaceId = isExt ? "window_frames" : "interior_skirting_architraves";
      const leafSid: SemanticSurfaceId = isExt ? "front_entry_door" : "interior_skirting_architraves";
      const doorFrameMat = this.getSurfaceMaterial(frameSid);
      const doorLeafMat = this.getSurfaceMaterial(leafSid);

      // Doorway Jamb Frame in the Wall Opening (Left Jamb, Right Jamb & Head Bar)
      const jambDepth = isExt ? 0.24 : 0.095;
      const jambThick = 0.032;
      const threshAngle = Math.atan2(closed.y - hinge.y, closed.x - hinge.x);
      const threshLen = hinge.distanceTo(closed);
      const doorwayGroup = new THREE.Group();
      doorwayGroup.userData.selectableElement = selectableMeta;
      const jL = new THREE.Mesh(new THREE.BoxGeometry(jambThick, op.height, jambDepth), doorFrameMat);
      jL.position.set(-threshLen / 2 + jambThick / 2, op.height / 2, 0);
      jL.userData.surfaceId = frameSid;
      doorwayGroup.add(jL);
      const jR = new THREE.Mesh(new THREE.BoxGeometry(jambThick, op.height, jambDepth), doorFrameMat);
      jR.position.set(threshLen / 2 - jambThick / 2, op.height / 2, 0);
      jR.userData.surfaceId = frameSid;
      doorwayGroup.add(jR);
      const jTop = new THREE.Mesh(new THREE.BoxGeometry(threshLen, jambThick, jambDepth), doorFrameMat);
      jTop.position.set(0, op.height - jambThick / 2, 0);
      jTop.userData.surfaceId = frameSid;
      doorwayGroup.add(jTop);
      doorwayGroup.position.set((hinge.x + closed.x) / 2, ffl, (hinge.y + closed.y) / 2);
      doorwayGroup.rotation.y = -threshAngle;
      this.buildingGroup.add(doorwayGroup);

      // Open 3D Door Leaf Group
      const leafGroup = new THREE.Group();
      leafGroup.userData.selectableElement = selectableMeta;
      const leafH = op.height - 0.03;
      const stileW = isExt ? 0.095 : 0.085;
      this.addHollowFrame(leafGroup, leafLen, leafH, 0.042, stileW, 0, leafH / 2, 0, doorLeafMat, leafSid);

      if (isExt) {
        // Mid Lock Rail + Transparent Glass Panels on External Hinged Doors
        const midRail = new THREE.Mesh(new THREE.BoxGeometry(leafLen - stileW * 2, 0.09, 0.04), doorLeafMat);
        midRail.position.set(0, 0.85, 0);
        midRail.userData.surfaceId = leafSid;
        leafGroup.add(midRail);

        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.1, leafLen - stileW * 2), Math.max(0.2, leafH - stileW * 2), 0.016),
          clearGlassMat
        );
        glassPane.position.set(0, leafH / 2, 0);
        leafGroup.add(glassPane);
      } else {
        // Internal Door Recessed Shaker Panel Infill
        const infill = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.1, leafLen - stileW * 2), Math.max(0.2, leafH - stileW * 2), 0.024),
          doorLeafMat
        );
        infill.position.set(0, leafH / 2, 0);
        infill.userData.surfaceId = leafSid;
        leafGroup.add(infill);
      }

      leafGroup.position.set(leafMidX, ffl, leafMidZ);
      leafGroup.rotation.y = -leafAngle;
      this.buildingGroup.add(leafGroup);

      // Lever Handle on Both Sides of Open Door Leaf
      const handleDist = Math.max(0.1, leafLen - 0.10);
      const hX = hinge.x + Math.cos(leafAngle) * handleDist;
      const hZ = hinge.y + Math.sin(leafAngle) * handleDist;
      const handleGeom = new THREE.BoxGeometry(0.11, 0.022, 0.09);
      const handleMesh = new THREE.Mesh(handleGeom, this.materials.stainlessSteel);
      handleMesh.position.set(hX, ffl + 1.02, hZ);
      handleMesh.rotation.y = -leafAngle;
      this.buildingGroup.add(handleMesh);

      if (this.showCadDiagnosticCaps) {
        const doorCapMat = new THREE.MeshBasicMaterial({
          color: isExt ? 0xea580c : 0xd97706,
        });
        const leafCapGeom = new THREE.BoxGeometry(leafLen, 0.02, 0.055);
        const leafCap = new THREE.Mesh(leafCapGeom, doorCapMat);
        leafCap.position.set(leafMidX, ffl + op.height + 0.01, leafMidZ);
        leafCap.rotation.y = -leafAngle;
        this.buildingGroup.add(leafCap);

        const a1 = Math.atan2(closed.y - hinge.y, closed.x - hinge.x);
        const a2 = Math.atan2(open.y - hinge.y, open.x - hinge.x);
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const steps = 18;
        const arcMat = new THREE.MeshBasicMaterial({ color: isExt ? 0xea580c : 0xd97706 });
        for (let i = 0; i < steps; i += 2) {
          const tA = a1 + (diff * i) / steps;
          const tB = a1 + (diff * (i + 1.2)) / steps;
          const pA = new THREE.Vector2(
            hinge.x + Math.cos(tA) * leafLen,
            hinge.y + Math.sin(tA) * leafLen
          );
          const pB = new THREE.Vector2(
            hinge.x + Math.cos(tB) * leafLen,
            hinge.y + Math.sin(tB) * leafLen
          );
          const segLen = pA.distanceTo(pB);
          const segAng = Math.atan2(pB.y - pA.y, pB.x - pA.x);
          const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.012, 0.024), arcMat);
          dashMesh.position.set((pA.x + pB.x) / 2, ffl + 0.016, (pA.y + pB.y) / 2);
          dashMesh.rotation.y = -segAng;
          this.buildingGroup.add(dashMesh);
        }
      }
      return;
    }

    if (op.type === "cavity_slider") {
      // Built-In Sliding Robe Doors (2-Panel Bypass Sliding Doors in Aluminium Frame & Track)
      const robeFrameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.7 });
      const robePanelMat = this.getSurfaceMaterial("interior_skirting_architraves");

      this.addHollowFrame(group, op.width, op.height, 0.085, 0.028, 0, op.height / 2, 0, robeFrameMat);

      const panelW = op.width / 2 + 0.025;
      const panelH = op.height - 0.05;
      [
        { offsetX: -op.width * 0.23, offsetZ: -0.016 },
        { offsetX: op.width * 0.23, offsetZ: 0.016 },
      ].forEach(({ offsetX, offsetZ }) => {
        this.addHollowFrame(group, panelW, panelH, 0.024, 0.028, offsetX, op.height / 2, offsetZ, robeFrameMat);
        const infill = new THREE.Mesh(
          new THREE.BoxGeometry(panelW - 0.05, panelH - 0.05, 0.014),
          robePanelMat
        );
        infill.position.set(offsetX, op.height / 2, offsetZ);
        infill.userData.surfaceId = "interior_skirting_architraves";
        group.add(infill);
      });

      if (this.showCadDiagnosticCaps) {
        const trackCapMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
        const trackCapA = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.018, 0.026), trackCapMat);
        trackCapA.position.set(-op.width * 0.23, op.height + 0.01, -0.018);
        group.add(trackCapA);

        const trackCapB = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.018, 0.026), trackCapMat);
        trackCapB.position.set(op.width * 0.23, op.height + 0.01, 0.018);
        group.add(trackCapB);
      }

      group.position.set(x, ffl, z);
      group.rotation.y = -angle;
      this.buildingGroup.add(group);
      return;
    } else if (op.type === "barn_door") {
      const trackGeom = new THREE.CylinderGeometry(0.015, 0.015, op.width * 1.8, 16);
      const trackMesh = new THREE.Mesh(trackGeom, this.materials.barnDoorIron);
      trackMesh.rotation.z = Math.PI / 2;
      trackMesh.position.set(0, op.headHeight + 0.08, 0.06);
      group.add(trackMesh);

      const slabGeom = new THREE.BoxGeometry(op.width, op.height, 0.04);
      const slabMesh = new THREE.Mesh(slabGeom, this.materials.barnDoorWood);
      slabMesh.position.set(0, op.height / 2, 0.06);
      slabMesh.castShadow = true;
      slabMesh.userData.surfaceId = "interior_skirting_architraves";
      group.add(slabMesh);

      const roller1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller1.position.set(-op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller1);
      const roller2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), this.materials.barnDoorIron);
      roller2.position.set(op.width * 0.35, op.headHeight + 0.08, 0.06);
      group.add(roller2);

    } else if (op.type === "garage_door") {
      // High-Detail 4-Panel Sectional Garage Door
      const doorGeom = new THREE.BoxGeometry(op.width, op.height, 0.06);
      const doorMesh = new THREE.Mesh(doorGeom, this.getSurfaceMaterial("garage_door"));
      doorMesh.position.set(0, op.height / 2, 0);
      doorMesh.castShadow = true;
      doorMesh.userData.surfaceId = "garage_door";
      group.add(doorMesh);

      // Perimeter Weatherstrip Trim
      const trimTopGeom = new THREE.BoxGeometry(op.width + 0.06, 0.04, 0.09);
      const trimTopMesh = new THREE.Mesh(trimTopGeom, this.getSurfaceMaterial("window_frames"));
      trimTopMesh.position.set(0, op.height + 0.02, 0.01);
      trimTopMesh.userData.surfaceId = "window_frames";
      group.add(trimTopMesh);

      if (this.showCadDiagnosticCaps) {
        const garCapGeom = new THREE.BoxGeometry(op.width, 0.02, 0.26);
        const garCapMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const garCap = new THREE.Mesh(garCapGeom, garCapMat);
        garCap.position.set(0, ceilingH + 0.016, 0);
        group.add(garCap);
      }

    } else if (op.type === "stacker_door" || op.type === "sliding_door") {
      const frameMat = this.getSurfaceMaterial("window_frames");
      this.addHollowFrame(group, op.width, op.height, 0.14, 0.048, 0, op.height / 2, 0, frameMat, "window_frames");

      const trackGeom = new THREE.BoxGeometry(op.width + 0.02, 0.028, 0.15);
      const trackMesh = new THREE.Mesh(trackGeom, frameMat);
      trackMesh.position.set(0, 0.014, 0);
      trackMesh.userData.surfaceId = "window_frames";
      group.add(trackMesh);

      const isStacker = op.type === "stacker_door" || op.width >= 3.0;
      const panelCount = isStacker ? 3 : 2;
      const innerW = op.width - 0.09;
      const panelW = innerW / panelCount + 0.02;
      const panelH = op.height - 0.09;

      for (let p = 0; p < panelCount; p++) {
        const pX = -innerW / 2 + (innerW / panelCount) * (p + 0.5);
        const pZ = p % 2 === 0 ? 0.022 : -0.022;

        this.addHollowFrame(group, panelW, panelH, 0.036, 0.038, pX, op.height / 2, pZ, frameMat, "window_frames");

        const glassGeom = new THREE.BoxGeometry(
          Math.max(0.1, panelW - 0.076),
          Math.max(0.2, panelH - 0.076),
          0.014
        );
        const glassMesh = new THREE.Mesh(glassGeom, clearGlassMat);
        glassMesh.position.set(pX, op.height / 2, pZ);
        group.add(glassMesh);
      }

      if (this.showCadDiagnosticCaps) {
        const slideCapMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const slideGlassCapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const slideCapA = new THREE.Mesh(new THREE.BoxGeometry(op.width, 0.018, 0.045), slideCapMat);
        slideCapA.position.set(0, ceilingH + 0.016, -0.05);
        group.add(slideCapA);
        const slideCapB = new THREE.Mesh(new THREE.BoxGeometry(op.width, 0.018, 0.045), slideCapMat);
        slideCapB.position.set(0, ceilingH + 0.016, 0.05);
        group.add(slideCapB);
        const slideCapGlass = new THREE.Mesh(new THREE.BoxGeometry(op.width - 0.06, 0.02, 0.04), slideGlassCapMat);
        slideCapGlass.position.set(0, ceilingH + 0.017, 0);
        group.add(slideCapGlass);
      }

    } else if (op.type === "window") {
      const sillGeom = new THREE.BoxGeometry(op.width + 0.06, 0.045, 0.26);
      const sillMesh = new THREE.Mesh(sillGeom, this.materials.stoneCap);
      sillMesh.position.set(0, op.sillHeight - 0.022, 0);
      sillMesh.castShadow = true;
      group.add(sillMesh);

      const centerY = op.sillHeight + op.height / 2;
      const barThick = 0.042;
      const frameMat = this.getSurfaceMaterial("window_frames");

      this.addHollowFrame(group, op.width, op.height, 0.12, barThick, 0, centerY, 0, frameMat, "window_frames");

      const innerH = Math.max(0.1, op.height - barThick * 2);
      const innerW = Math.max(0.1, op.width - barThick * 2);
      const mullionGeom = new THREE.BoxGeometry(0.036, innerH, 0.06);
      const mullionMesh = new THREE.Mesh(mullionGeom, frameMat);
      mullionMesh.position.set(0, centerY, 0);
      mullionMesh.userData.surfaceId = "window_frames";
      group.add(mullionMesh);

      const paneW = Math.max(0.08, (innerW - 0.036) / 2);
      [-paneW / 2 - 0.018, paneW / 2 + 0.018].forEach((paneX) => {
        const glassGeom = new THREE.BoxGeometry(paneW, innerH, 0.016);
        const glassMesh = new THREE.Mesh(glassGeom, clearGlassMat);
        glassMesh.position.set(paneX, centerY, 0);
        group.add(glassMesh);
      });

      if (this.showCadDiagnosticCaps) {
        const winFrameCapMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const winGlassCapMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const winCapOuter = new THREE.Mesh(new THREE.BoxGeometry(op.width, 0.016, 0.14), winFrameCapMat);
        winCapOuter.position.set(0, ceilingH + 0.015, 0);
        group.add(winCapOuter);
        const winCapGlass = new THREE.Mesh(new THREE.BoxGeometry(op.width - 0.08, 0.02, 0.06), winGlassCapMat);
        winCapGlass.position.set(0, ceilingH + 0.017, 0);
        group.add(winCapGlass);
      }

      if (facade === "hamptons") {
        const barMat = this.materials.renderWhite;
        [-op.height * 0.22, op.height * 0.22].forEach((offsetY) => {
          const hBarGeom = new THREE.BoxGeometry(op.width - 0.08, 0.018, 0.024);
          const hBarMesh = new THREE.Mesh(hBarGeom, barMat);
          hBarMesh.position.set(0, centerY + offsetY, 0);
          group.add(hBarMesh);
        });
      }

    } else {
      // HINGED DOORS (Fallback when exact hingePoint/openPoint not specified)
      const isFrontEntry = op.isExterior && (op.code.includes("EXT") || op.label.toLowerCase().includes("entry"));
      const frameSid: SemanticSurfaceId = op.isExterior ? "window_frames" : "interior_skirting_architraves";
      const doorFrameMat = this.getSurfaceMaterial(frameSid);

      this.addHollowFrame(group, op.width, op.height, 0.11, 0.04, 0, op.height / 2, 0, doorFrameMat, frameSid);

      if (isFrontEntry) {
        const hasSidelight = op.width >= 1.0;
        const doorSlabW = hasSidelight ? 0.82 : op.width - 0.08;
        const sidelightW = hasSidelight ? op.width - 0.88 : 0;
        const doorSlabX = hasSidelight ? op.width / 2 - doorSlabW / 2 - 0.04 : 0;

        const doorMat = this.getSurfaceMaterial("front_entry_door");

        this.addHollowFrame(group, doorSlabW, op.height - 0.08, 0.045, 0.11, doorSlabX, op.height / 2, 0.01, doorMat, "front_entry_door");
        const visionGlass = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.15, doorSlabW - 0.22), op.height - 0.30, 0.016),
          clearGlassMat
        );
        visionGlass.position.set(doorSlabX, op.height / 2, 0.01);
        group.add(visionGlass);

        if (hasSidelight) {
          const sideX = -op.width / 2 + sidelightW / 2 + 0.04;
          const sideGeom = new THREE.BoxGeometry(sidelightW, op.height - 0.08, 0.016);
          const sideMesh = new THREE.Mesh(sideGeom, clearGlassMat);
          sideMesh.position.set(sideX, op.height / 2, 0);
          group.add(sideMesh);
        }

        const handleX = doorSlabX - doorSlabW / 2 + 0.08;
        const handleGeom = new THREE.CylinderGeometry(0.014, 0.014, 1.20, 16);
        const handleMesh = new THREE.Mesh(handleGeom, this.materials.stainlessSteel);
        handleMesh.position.set(handleX, 1.05, 0.055);
        group.add(handleMesh);
      } else {
        const leafSid: SemanticSurfaceId = op.isExterior ? "front_entry_door" : "interior_skirting_architraves";
        const doorGeom = new THREE.BoxGeometry(op.width - 0.08, op.height - 0.06, 0.04);
        const doorMat = this.getSurfaceMaterial(leafSid);
        const doorMesh = new THREE.Mesh(doorGeom, doorMat);
        doorMesh.position.set(0, op.height / 2, 0);
        doorMesh.userData.surfaceId = leafSid;
        group.add(doorMesh);

        const leverGeom = new THREE.BoxGeometry(0.12, 0.02, 0.06);
        const leverMesh = new THREE.Mesh(leverGeom, this.materials.stainlessSteel);
        leverMesh.position.set(op.width * 0.32, 1.0, 0.03);
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
    const ceilingH = this.design.ceilingHeightM || 2.44;
    const fitout: InteriorFitoutConfig = {
      ...DEFAULT_FITOUT_CONFIG,
      ...(this.design.fitout || {}),
    };
    const upgradeJoineryH = ceilingH >= 2.70 && fitout.upgradeDoorJoineryHeights !== false;
    const joineryTopH = upgradeJoineryH ? 2.34 : 2.10;

    const isExactCalibrated = Boolean(this.design.exactStructuralWalls);
    const allFixtures = this.design.fixtures || [];
    const hasDedicatedSinkFixture = allFixtures.some((f) => f.type === "kitchen_sink");
    const hasDedicatedCooktopFixture = allFixtures.some((f) => f.type === "cooktop_oven");

    // Bind joinery and benchtops to reactive semantic PBR materials from useHouseMaterialStore
    const stoneMat = this.getSurfaceMaterial("kitchen_benchtop");
    const cabMat = this.getSurfaceMaterial("kitchen_cabinetry_lower");
    const cabUpperMat = this.getSurfaceMaterial("kitchen_cabinetry_upper");
    const splashbackMat = this.getSurfaceMaterial("kitchen_splashback");

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
      color: fitout.sinkStyle === "matte_black_granite" ? 0x334155 : 0x94a3b8,
      roughness: 0.25,
      metalness: 0.35,
    });

    const applianceSteelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.24,
      metalness: 0.45,
    });

    const ceramicWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.06,
    });

    const stoneThicknessM = fitout.benchtopThicknessMm === 40 ? 0.045 : 0.022;

    allFixtures.forEach((fix) => {
      const fixLevel = fix.level ?? 0;
      if (this.activeLevelFilter !== "all" && fixLevel !== this.activeLevelFilter) return;

      const isFurnitureType =
        fix.type === "bed_queen" ||
        fix.type === "bed_double" ||
        fix.type === "sofa_sectional" ||
        fix.type === "coffee_table" ||
        fix.type === "dining_table" ||
        fix.type === "cinema_seating" ||
        fix.type === "tv_console" ||
        fix.type === "tv_entertainment_unit";
      const isStructuralFeature = fix.type === "staircase" || fix.type === "balustrade";
      const isJoineryType = !isFurnitureType && !isStructuralFeature;

      if (isJoineryType && fitout.showJoineryAndSinks === false) return;
      if (isFurnitureType && fitout.showFurniture === false) return;

      const group = new THREE.Group();
      const fixElevY = ffl + (fix.elevationOffsetM || 0);
      group.userData.selectableElement = {
        id: fix.id,
        kind: "fixture",
        elementType: fix.type,
        label: fix.label || fix.type,
        roomName: fix.roomName,
        level: fixLevel,
        position: [fix.position[0], fixElevY, fix.position[2]],
        rotationDeg: Math.round((((fix.rotationY || 0) * 180) / Math.PI + 360) % 360),
      } satisfies SceneSelectedElement;

      if (fix.type === "kitchen_island") {
        const carcassH = fix.height - stoneThicknessM;
        const carcassGeom = new THREE.BoxGeometry(fix.width - 0.06, carcassH, fix.depth - 0.06);
        const carcassMesh = new THREE.Mesh(carcassGeom, cabMat);
        carcassMesh.position.y = carcassH / 2;
        carcassMesh.castShadow = true;
        carcassMesh.receiveShadow = true;
        carcassMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(carcassMesh);

        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        topMesh.userData.surfaceId = "kitchen_benchtop";
        group.add(topMesh);

        if (this.showCadDiagnosticCaps) {
          const edgeEdges = new THREE.EdgesGeometry(topGeom);
          const edgeLine = new THREE.LineSegments(
            edgeEdges,
            new THREE.LineBasicMaterial({ color: 0xd97706 })
          );
          edgeLine.position.y = fix.height - stoneThicknessM / 2;
          group.add(edgeLine);
        }

        if (fitout.waterfallEnds) {
          const wfGeom = new THREE.BoxGeometry(stoneThicknessM, fix.height, fix.depth);
          const wfLeft = new THREE.Mesh(wfGeom, stoneMat);
          wfLeft.position.set(-fix.width / 2 + stoneThicknessM / 2, fix.height / 2, 0);
          wfLeft.castShadow = true;
          wfLeft.userData.surfaceId = "kitchen_benchtop";
          group.add(wfLeft);

          const wfRight = new THREE.Mesh(wfGeom, stoneMat);
          wfRight.position.set(fix.width / 2 - stoneThicknessM / 2, fix.height / 2, 0);
          wfRight.castShadow = true;
          wfRight.userData.surfaceId = "kitchen_benchtop";
          group.add(wfRight);
        }

        if (!hasDedicatedSinkFixture) {
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

          const tapStemGeom = new THREE.CylinderGeometry(0.016, 0.018, 0.34, 16);
          const tapStem = new THREE.Mesh(tapStemGeom, tapMat);
          tapStem.position.set(0, fix.height + 0.17, -0.22);
          group.add(tapStem);
        }

        const stoolOffsets = [-fix.width * 0.34, -fix.width * 0.11, fix.width * 0.11, fix.width * 0.34];
        const stoolZ = isExactCalibrated ? (-fix.depth / 2 - 0.16) : (fix.depth / 2 + 0.24);
        stoolOffsets.forEach((stoolX) => {
          const seatGeom = new THREE.BoxGeometry(0.38, 0.04, 0.34);
          const seatMesh = new THREE.Mesh(seatGeom, cabMat);
          seatMesh.position.set(stoolX, 0.65, stoolZ);
          seatMesh.userData.surfaceId = "kitchen_cabinetry_lower";
          group.add(seatMesh);
        });

      } else if (fix.type === "kitchen_sink") {
        const plateGeom = new THREE.BoxGeometry(fix.width, 0.016, fix.depth);
        const basePlate = new THREE.Mesh(plateGeom, applianceSteelMat);
        basePlate.position.y = 0.908;
        group.add(basePlate);

        if (this.showCadDiagnosticCaps) {
          const sinkOutline = new THREE.LineSegments(
            new THREE.EdgesGeometry(plateGeom),
            new THREE.LineBasicMaterial({ color: 0x7c3aed })
          );
          sinkOutline.position.y = 0.912;
          group.add(sinkOutline);
        }

        const bowl1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.022, 0.36), sinkBowlMat);
        bowl1.position.set(0.04, 0.914, 0);
        group.add(bowl1);

        const bowl2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.022, 0.36), sinkBowlMat);
        bowl2.position.set(0.36, 0.914, 0);
        group.add(bowl2);

        for (let r = -0.12; r <= 0.12; r += 0.06) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.018, 0.014), sinkBowlMat);
          rib.position.set(-0.32, 0.913, r);
          group.add(rib);
        }

        const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.32, 16), tapMat);
        tapStem.position.set(0.20, 1.06, -0.18);
        group.add(tapStem);
        const spout = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.18), tapMat);
        spout.position.set(0.20, 1.21, -0.10);
        group.add(spout);

      } else if (fix.type === "dishwasher") {
        const dwGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const dwMesh = new THREE.Mesh(dwGeom, applianceSteelMat);
        dwMesh.position.y = fix.height / 2;
        group.add(dwMesh);

        const handleGeom = new THREE.BoxGeometry(fix.width * 0.75, 0.025, 0.03);
        const handleMesh = new THREE.Mesh(handleGeom, tapMat);
        handleMesh.position.set(0, fix.height - 0.10, fix.depth / 2 + 0.015);
        group.add(handleMesh);

      } else if (fix.type === "kitchen_cabinetry") {
        const carcassH = fix.height - stoneThicknessM;
        const baseGeom = new THREE.BoxGeometry(fix.width, carcassH, fix.depth);
        const baseMesh = new THREE.Mesh(baseGeom, cabMat);
        baseMesh.position.y = carcassH / 2;
        baseMesh.castShadow = true;
        baseMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(baseMesh);

        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        topMesh.userData.surfaceId = "kitchen_benchtop";
        group.add(topMesh);

        if (this.showCadDiagnosticCaps) {
          const edgeLine = new THREE.LineSegments(
            new THREE.EdgesGeometry(topGeom),
            new THREE.LineBasicMaterial({ color: 0xd97706 })
          );
          edgeLine.position.y = fix.height - stoneThicknessM / 2;
          group.add(edgeLine);
        }

        const ohBottom = 1.52;
        const splashH = Math.max(0.55, ohBottom - fix.height);
        const splashGeom = new THREE.BoxGeometry(fix.width, splashH, 0.024);
        const splashMesh = new THREE.Mesh(splashGeom, splashbackMat);
        splashMesh.position.set(0, fix.height + splashH / 2, -fix.depth / 2 + 0.015);
        splashMesh.receiveShadow = true;
        splashMesh.userData.surfaceId = "kitchen_splashback";
        group.add(splashMesh);

        const ohHeight = Math.max(0.55, joineryTopH - ohBottom);
        const ohDepth = Math.min(0.36, fix.depth * 0.58);
        const ohGeom = new THREE.BoxGeometry(fix.width, ohHeight, ohDepth);
        const ohMesh = new THREE.Mesh(ohGeom, cabUpperMat);
        ohMesh.position.set(0, ohBottom + ohHeight / 2, -fix.depth / 2 + ohDepth / 2);
        ohMesh.castShadow = true;
        ohMesh.userData.surfaceId = "kitchen_cabinetry_upper";
        group.add(ohMesh);

        if (!hasDedicatedCooktopFixture) {
          const cooktopGeom = new THREE.BoxGeometry(0.90, 0.015, 0.50);
          const cooktopMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.08, metalness: 0.6 });
          const cooktopMesh = new THREE.Mesh(cooktopGeom, cooktopMat);
          cooktopMesh.position.set(0, fix.height + 0.008, 0);
          group.add(cooktopMesh);
        }

      } else if (fix.type === "cooktop_oven") {
        const cooktopMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.65 });
        const burnerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.8 });

        const plateGeom = new THREE.BoxGeometry(fix.width, 0.02, fix.depth);
        const plateMesh = new THREE.Mesh(plateGeom, cooktopMat);
        plateMesh.position.y = 0.912;
        group.add(plateMesh);

        [
          [-fix.width * 0.26, -fix.depth * 0.22],
          [fix.width * 0.26, -fix.depth * 0.22],
          [-fix.width * 0.26, fix.depth * 0.22],
          [fix.width * 0.26, fix.depth * 0.22],
        ].forEach(([bx, bz]) => {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.026, 20), burnerMat);
          ring.position.set(bx, 0.916, bz);
          group.add(ring);
        });

        const ovenGeom = new THREE.BoxGeometry(fix.width - 0.04, 0.58, 0.03);
        const ovenMesh = new THREE.Mesh(ovenGeom, cooktopMat);
        ovenMesh.position.set(0, 0.45, fix.depth / 2 + 0.015);
        group.add(ovenMesh);

      } else if (fix.type === "fridge_space") {
        const fridgeH = fix.height || 1.85;
        const bodyGeom = new THREE.BoxGeometry(fix.width - 0.04, fridgeH, fix.depth - 0.04);
        const bodyMesh = new THREE.Mesh(bodyGeom, applianceSteelMat);
        bodyMesh.position.y = fridgeH / 2;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        const rightGable = new THREE.Mesh(new THREE.BoxGeometry(0.025, joineryTopH, fix.depth), cabUpperMat);
        rightGable.position.set(-fix.width / 2, joineryTopH / 2, 0);
        rightGable.userData.surfaceId = "kitchen_cabinetry_upper";
        group.add(rightGable);

        const overheadCupboardH = Math.max(0.18, joineryTopH - fridgeH - 0.04);
        const overheadFridgeCab = new THREE.Mesh(
          new THREE.BoxGeometry(fix.width, overheadCupboardH, fix.depth),
          cabUpperMat
        );
        overheadFridgeCab.position.set(0, joineryTopH - overheadCupboardH / 2, 0);
        overheadFridgeCab.userData.surfaceId = "kitchen_cabinetry_upper";
        group.add(overheadFridgeCab);

        if (this.showCadDiagnosticCaps) {
          const topOut = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(fix.width, 0.02, fix.depth)),
            new THREE.LineBasicMaterial({ color: 0x7c3aed })
          );
          topOut.position.y = joineryTopH + 0.01;
          group.add(topOut);
        }

      } else if (fix.type === "pantry_shelving") {
        const panH = Math.max(fix.height || 2.04, joineryTopH);
        const sideGable = new THREE.Mesh(new THREE.BoxGeometry(0.035, panH, fix.depth), cabUpperMat);
        sideGable.position.set(fix.width / 2 - 0.018, panH / 2, 0);
        sideGable.castShadow = true;
        sideGable.userData.surfaceId = "kitchen_cabinetry_upper";
        group.add(sideGable);

        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
        const shelfTiers = upgradeJoineryH ? [0.45, 0.90, 1.35, 1.75, 2.12] : [0.45, 0.90, 1.35, 1.75];
        shelfTiers.forEach((sy) => {
          const shelfGeom = new THREE.BoxGeometry(fix.width - 0.06, 0.025, fix.depth - 0.08);
          const shelfMesh = new THREE.Mesh(shelfGeom, shelfMat);
          shelfMesh.position.set(0, sy, -0.02);
          group.add(shelfMesh);
        });

      } else if (fix.type === "study_desk") {
        const deskTopGeom = new THREE.BoxGeometry(fix.width, 0.035, fix.depth);
        const deskTopMesh = new THREE.Mesh(deskTopGeom, cabMat);
        deskTopMesh.position.y = fix.height - 0.018;
        deskTopMesh.castShadow = true;
        deskTopMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(deskTopMesh);

        if (this.showCadDiagnosticCaps) {
          const deskEdge = new THREE.LineSegments(
            new THREE.EdgesGeometry(deskTopGeom),
            new THREE.LineBasicMaterial({ color: 0xb45309 })
          );
          deskEdge.position.y = fix.height - 0.018;
          group.add(deskEdge);
        }

      } else if (fix.type === "laundry_tub") {
        const cabH = fix.height - 0.04;
        const tubCabGeom = new THREE.BoxGeometry(fix.width, cabH, fix.depth);
        const tubCabMesh = new THREE.Mesh(tubCabGeom, cabMat);
        tubCabMesh.position.y = cabH / 2;
        tubCabMesh.castShadow = true;
        tubCabMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(tubCabMesh);

        const rimGeom = new THREE.BoxGeometry(fix.width + 0.01, 0.04, fix.depth + 0.01);
        const rimMesh = new THREE.Mesh(rimGeom, applianceSteelMat);
        rimMesh.position.y = fix.height - 0.02;
        group.add(rimMesh);

        const bowlGeom = new THREE.BoxGeometry(fix.width - 0.10, 0.025, fix.depth - 0.10);
        const bowlMesh = new THREE.Mesh(bowlGeom, sinkBowlMat);
        bowlMesh.position.y = fix.height + 0.004;
        group.add(bowlMesh);

        const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 16), tapMat);
        plug.position.set(0, fix.height + 0.008, 0);
        group.add(plug);

        const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 12), tapMat);
        tapStem.position.set(0, fix.height + 0.13, -fix.depth / 2 + 0.06);
        group.add(tapStem);

      } else if (fix.type === "washing_machine") {
        //Realistic Front-Loader Washing Machine Appliance
        const wmH = Math.max(0.84, fix.height || 0.85);
        const bodyGeom = new THREE.BoxGeometry(fix.width - 0.04, wmH, fix.depth - 0.04);
        const bodyMesh = new THREE.Mesh(bodyGeom, ceramicWhiteMat);
        bodyMesh.position.y = wmH / 2;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        const drumRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.19, 0.19, 0.03, 24),
          tapMat
        );
        drumRim.rotation.x = Math.PI / 2;
        drumRim.position.set(0, wmH * 0.48, (fix.depth - 0.04) / 2 + 0.01);
        group.add(drumRim);

      } else if (fix.type === "linen_joinery" || fix.type === "robe_joinery") {
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
        const heights =
          fix.type === "linen_joinery"
            ? upgradeJoineryH
              ? [0.45, 0.90, 1.35, 1.75, 2.08]
              : [0.45, 0.90, 1.35, 1.75]
            : upgradeJoineryH
            ? [1.96]
            : [1.72];
        heights.forEach((sy) => {
          const sGeom = new THREE.BoxGeometry(fix.width - 0.04, 0.022, fix.depth - 0.04);
          const sMesh = new THREE.Mesh(sGeom, shelfMat);
          sMesh.position.set(0, sy, 0);
          group.add(sMesh);
        });

        if (fix.type === "robe_joinery") {
          const railGeom = new THREE.CylinderGeometry(0.012, 0.012, fix.width - 0.06, 12);
          const railMesh = new THREE.Mesh(railGeom, this.materials.stainlessSteel);
          railMesh.rotation.z = Math.PI / 2;
          railMesh.position.set(0, upgradeJoineryH ? 1.88 : 1.64, 0.04);
          group.add(railMesh);
        }

      } else if (fix.type === "butler_pantry") {
        const carcassH = fix.height - stoneThicknessM;
        const baseGeom = new THREE.BoxGeometry(fix.width, carcassH, fix.depth);
        const baseMesh = new THREE.Mesh(baseGeom, cabMat);
        baseMesh.position.y = carcassH / 2;
        baseMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(baseMesh);

        const topGeom = new THREE.BoxGeometry(fix.width, stoneThicknessM, fix.depth);
        const topMesh = new THREE.Mesh(topGeom, stoneMat);
        topMesh.position.y = fix.height - stoneThicknessM / 2;
        topMesh.userData.surfaceId = "kitchen_benchtop";
        group.add(topMesh);

        const bowlGeom = new THREE.BoxGeometry(0.42, 0.02, 0.38);
        const bowlMesh = new THREE.Mesh(bowlGeom, sinkBowlMat);
        bowlMesh.position.set(0, fix.height + 0.005, 0);
        group.add(bowlMesh);

        const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12), tapMat);
        tapStem.position.set(0, fix.height + 0.14, -0.18);
        group.add(tapStem);

      } else if (fix.type === "cinema_seating") {
        const seatGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.8 });
        const seatMesh = new THREE.Mesh(seatGeom, seatMat);
        seatMesh.position.y = fix.height / 2;
        group.add(seatMesh);
      } else if (fix.type === "mud_nook_bench") {
        const benchGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const benchMesh = new THREE.Mesh(benchGeom, cabMat);
        benchMesh.position.y = fix.height / 2;
        benchMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(benchMesh);
      } else if (fix.type === "vanity_double" || fix.type === "vanity_single") {
        const vanityW =
          !isExactCalibrated &&
          fix.roomName.toLowerCase().includes("ensuite") &&
          fitout.ensuiteVanityStyle === "double_1800"
            ? Math.max(fix.width, 1.75)
            : fix.width;
        const cabH = 0.54;
        const vanityGeom = new THREE.BoxGeometry(vanityW, cabH, fix.depth);
        const vanityMesh = new THREE.Mesh(vanityGeom, cabMat);
        vanityMesh.position.y = 0.28 + cabH / 2;
        vanityMesh.castShadow = true;
        vanityMesh.userData.surfaceId = "kitchen_cabinetry_lower";
        group.add(vanityMesh);

        const vTopGeom = new THREE.BoxGeometry(vanityW, stoneThicknessM, fix.depth);
        const vTopMesh = new THREE.Mesh(vTopGeom, stoneMat);
        vTopMesh.position.y = fix.height - stoneThicknessM / 2;
        vTopMesh.userData.surfaceId = "kitchen_benchtop";
        group.add(vTopMesh);

        if (this.showCadDiagnosticCaps) {
          const vTopEdge = new THREE.LineSegments(
            new THREE.EdgesGeometry(vTopGeom),
            new THREE.LineBasicMaterial({ color: 0xdb2777 })
          );
          vTopEdge.position.y = fix.height - stoneThicknessM / 2;
          group.add(vTopEdge);
        }

        const isDouble =
          fix.type === "vanity_double" ||
          (!isExactCalibrated &&
            fix.roomName.toLowerCase().includes("ensuite") &&
            fitout.ensuiteVanityStyle !== "single_1200");
        const offsets = isDouble ? [-vanityW * 0.26, vanityW * 0.26] : [0];
        offsets.forEach((bx) => {
          const basinGeom = new THREE.CylinderGeometry(0.18, 0.14, 0.11, 24);
          const basinMesh = new THREE.Mesh(basinGeom, ceramicWhiteMat);
          basinMesh.scale.set(1.25, 1, 0.92);
          basinMesh.position.set(bx, fix.height + 0.055, 0.01);
          group.add(basinMesh);

          const drainDot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 16), tapMat);
          drainDot.position.set(bx, fix.height + 0.058, 0.01);
          group.add(drainDot);

          const vTapGeom = new THREE.CylinderGeometry(0.012, 0.014, 0.20, 12);
          const vTapMesh = new THREE.Mesh(vTapGeom, tapMat);
          vTapMesh.position.set(bx, fix.height + 0.10, -fix.depth / 2 + 0.08);
          group.add(vTapMesh);
        });

        const mirrorGeom = new THREE.BoxGeometry(vanityW * 0.94, 0.92, 0.025);
        const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.04, metalness: 0.94 });
        const mirrorMesh = new THREE.Mesh(mirrorGeom, mirrorMat);
        mirrorMesh.position.set(0, fix.height + 0.62, -fix.depth / 2 + 0.02);
        group.add(mirrorMesh);

      } else if (fix.type === "shower") {
        const baseGeom = new THREE.BoxGeometry(fix.width, 0.045, fix.depth);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = 0.0225;
        group.add(baseMesh);

        const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16), tapMat);
        grate.position.set(0, 0.026, 0);
        group.add(grate);

        const showerGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const showerMesh = new THREE.Mesh(showerGeom, this.materials.glass);
        showerMesh.position.y = fix.height / 2;
        group.add(showerMesh);

        if (this.showCadDiagnosticCaps) {
          const screenCap = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(fix.width, 0.02, fix.depth)),
            new THREE.LineBasicMaterial({ color: 0x0d9488 })
          );
          screenCap.position.y = fix.height;
          group.add(screenCap);
        }

        const railGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.1, 12);
        const railMesh = new THREE.Mesh(railGeom, tapMat);
        railMesh.position.set(0, 1.45, -fix.depth / 2 + 0.06);
        group.add(railMesh);

        const roseGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.015, 20);
        const roseMesh = new THREE.Mesh(roseGeom, tapMat);
        roseMesh.position.set(0, 1.98, -fix.depth / 2 + 0.22);
        group.add(roseMesh);

      } else if (fix.type === "bath") {
        if (fitout.bathStyle === "inset_tiled" || isExactCalibrated) {
          const hobGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
          const hobMesh = new THREE.Mesh(hobGeom, stoneMat);
          hobMesh.position.y = fix.height / 2;
          hobMesh.castShadow = true;
          group.add(hobMesh);

          if (this.showCadDiagnosticCaps) {
            const hobEdge = new THREE.LineSegments(
              new THREE.EdgesGeometry(hobGeom),
              new THREE.LineBasicMaterial({ color: 0x0d9488 })
            );
            hobEdge.position.y = fix.height / 2;
            group.add(hobEdge);
          }

          const innerGeom = new THREE.BoxGeometry(fix.width - 0.18, 0.03, fix.depth - 0.16);
          const innerMesh = new THREE.Mesh(innerGeom, ceramicWhiteMat);
          innerMesh.position.y = fix.height + 0.008;
          group.add(innerMesh);

          const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 16), tapMat);
          plug.position.set(-fix.width * 0.32, fix.height + 0.012, 0);
          group.add(plug);
        } else {
          const bathGeom = new THREE.CylinderGeometry(fix.depth / 2, fix.depth / 2.2, fix.height, 32);
          const bathMesh = new THREE.Mesh(bathGeom, ceramicWhiteMat);
          bathMesh.scale.set(fix.width / fix.depth, 1, 1);
          bathMesh.position.y = fix.height / 2;
          bathMesh.castShadow = true;
          group.add(bathMesh);
        }

        const spoutStand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, fix.height + 0.16, 12), tapMat);
        spoutStand.position.set(0, (fix.height + 0.16) / 2, -fix.depth / 2 + 0.06);
        group.add(spoutStand);

      } else if (fix.type === "toilet") {
        const cisternGeom = new THREE.BoxGeometry(fix.width, fix.height, 0.19);
        const cisternMesh = new THREE.Mesh(cisternGeom, ceramicWhiteMat);
        cisternMesh.position.set(0, fix.height / 2, -fix.depth / 2 + 0.095);
        cisternMesh.castShadow = true;
        group.add(cisternMesh);

        const flushBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 16), tapMat);
        flushBtn.position.set(0, fix.height + 0.008, -fix.depth / 2 + 0.095);
        group.add(flushBtn);

        const panGeom = new THREE.CylinderGeometry(fix.width * 0.44, fix.width * 0.36, 0.42, 24);
        const panMesh = new THREE.Mesh(panGeom, ceramicWhiteMat);
        panMesh.scale.set(1, 1, 1.25);
        panMesh.position.set(0, 0.21, 0.08);
        panMesh.castShadow = true;
        group.add(panMesh);

      } else if (fix.type === "bed_queen" || fix.type === "bed_double") {
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

        [-fix.width * 0.24, fix.width * 0.24].forEach((px) => {
          const pilGeom = new THREE.BoxGeometry(0.55, 0.12, 0.34);
          const pilMesh = new THREE.Mesh(pilGeom, mattMat);
          pilMesh.position.set(px, 0.60, -fix.depth / 2 + 0.32);
          group.add(pilMesh);
        });

      } else if (fix.type === "sofa_sectional") {
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

        const chaiseGeom = new THREE.BoxGeometry(0.95, 0.42, fix.depth);
        const chaiseMesh = new THREE.Mesh(chaiseGeom, sofaMat);
        chaiseMesh.position.set(fix.width / 2 - 0.475, 0.21, 0);
        group.add(chaiseMesh);

      } else if (fix.type === "coffee_table") {
        const ctGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const ctMesh = new THREE.Mesh(ctGeom, stoneMat);
        ctMesh.position.y = fix.height / 2;
        ctMesh.castShadow = true;
        group.add(ctMesh);

      } else if (fix.type === "tv_entertainment_unit") {
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

        const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        [-fix.width * 0.3, 0, fix.width * 0.3].forEach((cx) => {
          [-fix.depth / 2 - 0.28, fix.depth / 2 + 0.28].forEach((cz) => {
            const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.44), chairMat);
            cSeat.position.set(cx, 0.23, cz);
            group.add(cSeat);
          });
        });

      } else if (fix.type === "staircase") {
        // Architectural 3D Timber-Tread Staircase with Steel Stringers & Glass Balustrade
        const totalRise = Math.max(0.45, fix.height || 0.60);
        const stepCount = Math.max(3, Math.min(18, Math.round(totalRise / 0.175)));
        const stepRise = totalRise / stepCount;
        const stepRun = fix.depth / stepCount;
        const treadMat = new THREE.MeshStandardMaterial({ color: 0xb47e4f, roughness: 0.32 });
        const riserMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
        const stringerMat = this.materials.frame;

        for (let s = 0; s < stepCount; s++) {
          const yTop = (s + 1) * stepRise;
          const zCenter = fix.depth / 2 - (s + 0.5) * stepRun;

          const treadGeom = new THREE.BoxGeometry(fix.width - 0.04, 0.038, stepRun + 0.025);
          const treadMesh = new THREE.Mesh(treadGeom, treadMat);
          treadMesh.position.set(0, yTop - 0.019, zCenter);
          treadMesh.castShadow = true;
          treadMesh.receiveShadow = true;
          group.add(treadMesh);

          const riserGeom = new THREE.BoxGeometry(fix.width - 0.06, stepRise, 0.018);
          const riserMesh = new THREE.Mesh(riserGeom, riserMat);
          riserMesh.position.set(0, yTop - stepRise / 2, zCenter + stepRun / 2);
          group.add(riserMesh);
        }

        if (totalRise >= 1.2) {
          const flightSlopeLen = Math.hypot(fix.depth, totalRise);
          const slopeAngle = Math.atan2(totalRise, fix.depth);
          [-fix.width / 2 + 0.03, fix.width / 2 - 0.03].forEach((sx) => {
            const stringerGeom = new THREE.BoxGeometry(0.045, 0.22, flightSlopeLen);
            const stringerMesh = new THREE.Mesh(stringerGeom, stringerMat);
            stringerMesh.position.set(sx, totalRise / 2 - 0.06, 0);
            stringerMesh.rotation.x = slopeAngle;
            group.add(stringerMesh);

            const railGeom = new THREE.BoxGeometry(0.04, 0.04, flightSlopeLen);
            const railMesh = new THREE.Mesh(railGeom, stringerMat);
            railMesh.position.set(sx, totalRise / 2 + 0.92, 0);
            railMesh.rotation.x = slopeAngle;
            group.add(railMesh);
          });
        }

      } else if (fix.type === "balustrade") {
        const balH = fix.height || 1.05;
        const glassGeom = new THREE.BoxGeometry(fix.width, balH - 0.06, 0.024);
        const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
        glassMesh.position.set(0, (balH - 0.06) / 2 + 0.02, 0);
        group.add(glassMesh);

        const topRailGeom = new THREE.BoxGeometry(fix.width, 0.045, 0.065);
        const topRailMesh = new THREE.Mesh(topRailGeom, this.materials.frame);
        topRailMesh.position.set(0, balH - 0.022, 0);
        group.add(topRailMesh);

        const postCount = Math.max(2, Math.round(fix.width / 1.35) + 1);
        for (let p = 0; p < postCount; p++) {
          const px = -fix.width / 2 + (p / (postCount - 1)) * fix.width;
          const postGeom = new THREE.BoxGeometry(0.05, balH, 0.05);
          const postMesh = new THREE.Mesh(postGeom, this.materials.frame);
          postMesh.position.set(px, balH / 2, 0);
          group.add(postMesh);
        }

      } else {
        const genGeom = new THREE.BoxGeometry(fix.width, fix.height, fix.depth);
        const genMesh = new THREE.Mesh(genGeom, cabMat);
        genMesh.position.y = fix.height / 2;
        group.add(genMesh);
      }

      group.position.set(fix.position[0], fixElevY, fix.position[2]);
      group.rotation.y = fix.rotationY;
      this.fixturesGroup.add(group);
    });
  }

  private buildRoof(): void {
    if (!this.design) return;
    if (
      !this.design.roof.showRoof ||
      this.design.roof.cutawayMode ||
      this.activeLevelFilter !== "all"
    ) {
      this.roofGroup.visible = false;
      return;
    }

    if (this.design.levels && this.design.levels.length > 1) {
      const upperLvl = this.design.levels.find((l) => (l.elevationOffsetM || 0) >= 2.0);
      const upperMaxX = upperLvl
        ? upperLvl.worldBounds.x + upperLvl.worldBounds.widthM
        : Infinity;

      for (const lvl of this.design.levels) {
        let levelWalls = (this.design.walls || []).filter((w) => (w.level ?? 0) === lvl.level);
        let levelRooms = (this.design.rooms || []).filter((r) => (r.level ?? 0) === lvl.level);
        const levelOpenings = (this.design.openings || []).filter((o) => (o.level ?? 0) === lvl.level);

        // When an upper floor sits directly over the Ground Floor (lvl 0), only roof Ground Floor wings projecting outside the upper floor footprint (e.g. 3rd Garage Bay)
        if (lvl.level === 0 && upperLvl) {
          levelRooms = levelRooms.filter((r) => {
            const maxX = Math.max(...r.polygon.map((p) => p[0]));
            return maxX > upperMaxX + 0.5;
          });
          levelWalls = levelWalls.filter((w) => Math.max(w.start[0], w.end[0]) > upperMaxX - 0.3);
        }
        if (levelWalls.length === 0 && levelRooms.length === 0) continue;

        const tierDesign: BuildingDesign3D = {
          ...this.design,
          walls: levelWalls,
          rooms: levelRooms,
          openings: levelOpenings,
        };
        const { roofMesh, fasciaMesh, gutterMesh } = generateProceduralHipRoof(
          tierDesign,
          this.design.roof,
          lvl.elevationOffsetM || 0
        );
        this.roofGroup.add(roofMesh);
        this.roofGroup.add(fasciaMesh);
        this.roofGroup.add(gutterMesh);
      }
      this.roofGroup.visible = true;
      return;
    }

    const { roofMesh, fasciaMesh, gutterMesh } = generateProceduralHipRoof(
      this.design,
      this.design.roof,
      0
    );

    this.roofGroup.add(roofMesh);
    this.roofGroup.add(fasciaMesh);
    this.roofGroup.add(gutterMesh);
    this.roofGroup.visible = true;
  }

  // Camera & Mode Controls
  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    // Toggle interior ceiling visibility and PBR floor prominence between Orbit Blueprint & Walkthrough modes
    this.buildingGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.isInteriorCeiling) {
        mesh.visible = mode === "walkthrough";
      }
      if (mesh.userData.isBlueprintUnderlay) {
        mesh.visible = mode !== "walkthrough";
      }
      if (mesh.userData.isSemanticRoomFloor) {
        const elevOffset = mesh.userData.elevationOffsetM || 0;
        mesh.position.y = mode === "walkthrough" ? 0.312 + elevOffset : 0.305 + elevOffset;
      }
    });

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

    const elevOffset = room.elevationOffsetM || 0;

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
      this.walkPosition.set(eyeX, 1.65 + 0.30 + elevOffset, eyeZ);

      const lookTargetX = minX + (maxX - minX) * 0.72;
      const lookTargetZ = minZ + (maxZ - minZ) * 0.72;
      const dx = lookTargetX - eyeX;
      const dz = lookTargetZ - eyeZ;
      this.walkYaw = Math.atan2(-dx, -dz);
      this.walkPitch = -0.16; // Slight downward gaze showcasing finishes and furniture
      this.camera.fov = 72; // Wide interior lens for immersive virtual tour
      this.camera.updateProjectionMatrix();
    } else {
      this.orbitTarget.set(room.center[0], 1.2 + elevOffset, room.center[1]);
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

    if (preset === "top") {
      this.camera.fov = 14;
      this.camera.updateProjectionMatrix();
    } else if (this.camera.fov !== 50) {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    }

    switch (preset) {
      case "isometric":
        this.orbitDistance = 23;
        this.orbitTheta = Math.PI / 4;
        this.orbitPhi = Math.PI / 3.1;
        break;
      case "top":
        this.orbitDistance = 94;
        this.orbitTheta = 0;
        this.orbitPhi = 0.001; // directly overhead tele-orthographic 1:100 plan check
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
    if (this.camera.fov !== 50) {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    }
    if (view === "dollhouse") {
      this.setRoofMode(true, true);
      this.setPresetView("isometric");
      return;
    }
    if (view === "perspective") {
      this.setRoofMode(true, true);
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
    if (isNewPlan) {
      this.activeLevelFilter = "all";
    }
    this.design = newDesign
      ? ensureOutdoorZonesOpenAndFurnished(ensureCompleteWallNetwork(newDesign))
      : null;
    if (this.design) {
      const centerX = this.design.widthM / 2;
      const centerZ = this.design.lengthM / 2;
      const isMultiLevel = Boolean(this.design.levels && this.design.levels.length > 1);
      this.orbitTarget.set(centerX, isMultiLevel ? 2.2 : 1.2, centerZ);
      if (isNewPlan) {
        const maxDim = Math.max(this.design.widthM, this.design.lengthM);
        this.orbitDistance = Math.max(18, maxDim * (isMultiLevel ? 1.48 : 1.35));
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

  // Keyboard and mouse navigation + Click-to-Inspect Semantic Surface Raycasting
  private bindEvents(): void {
    const el = this.renderer.domElement;

    el.addEventListener("mousedown", (e) => {
      this.isMouseDown = e.button === 0;
      this.isRightMouseDown = e.button === 2;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.mouseDownStartPosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener("mouseup", (e) => {
      if (e.button === 0 && this.design) {
        const dragDist = Math.hypot(
          e.clientX - this.mouseDownStartPosition.x,
          e.clientY - this.mouseDownStartPosition.y
        );
        if (dragDist < 5) {
          this.handleCanvasSurfaceClick(e);
        }
      }
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

  public clearSelectedElement(): void {
    this.selectedElementId = null;
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
    if (this.onElementSelect) {
      this.onElementSelect(null);
    }
  }

  private setSelectedSceneObject(targetObj: THREE.Object3D | null, selectable: SceneSelectedElement | null): void {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
    this.selectedElementId = selectable?.id || null;
    if (targetObj && selectable) {
      this.selectionBoxHelper = new THREE.BoxHelper(targetObj, 0x06b6d4);
      this.scene.add(this.selectionBoxHelper);
    }
    if (this.onElementSelect) {
      this.onElementSelect(selectable);
    }
  }

  private handleCanvasSurfaceClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [
      this.fixturesGroup,
      this.buildingGroup,
      this.facadeGroup,
      this.roofGroup,
    ];
    const intersects = this.raycaster.intersectObjects(targets, true);

    let matchedSelectable: { obj: THREE.Object3D; data: SceneSelectedElement } | null = null;
    let matchedSurfaceId: SemanticSurfaceId | null = null;

    for (const hit of intersects) {
      const obj = hit.object as THREE.Mesh;
      if (!obj.visible) continue;

      // Skip blueprint underlay & invisible helpers for element selection
      let curCheck: THREE.Object3D | null = obj;
      let isUnderlayOrCeiling = false;
      let isFloorOrSlab = false;
      let foundSelectableObj: THREE.Object3D | null = null;
      let foundSelectableData: SceneSelectedElement | null = null;

      while (curCheck) {
        if (curCheck.userData?.isBlueprintUnderlay || curCheck.userData?.isInteriorCeiling) {
          isUnderlayOrCeiling = true;
        }
        if (curCheck.userData?.isSemanticRoomFloor || curCheck.userData?.isSlabOrGround) {
          isFloorOrSlab = true;
        }
        if (!foundSelectableData && curCheck.userData?.selectableElement) {
          foundSelectableObj = curCheck;
          foundSelectableData = curCheck.userData.selectableElement as SceneSelectedElement;
        }
        curCheck = curCheck.parent;
      }

      if (isUnderlayOrCeiling) continue;

      if (!matchedSelectable && foundSelectableObj && foundSelectableData && !isFloorOrSlab) {
        matchedSelectable = { obj: foundSelectableObj, data: foundSelectableData };
      }

      if (!matchedSurfaceId) {
        // Check face material surfaceId first (handles multi-material exterior walls where outer face is brick and inner face is interior plaster)
        if (Array.isArray(obj.material) && hit.face && hit.face.materialIndex !== undefined) {
          const faceMat = obj.material[hit.face.materialIndex];
          const faceSid = faceMat?.userData?.surfaceId as SemanticSurfaceId | undefined;
          if (faceSid) {
            matchedSurfaceId = faceSid;
          }
        }
        if (!matchedSurfaceId) {
          let cur: THREE.Object3D | null = obj;
          while (cur) {
            const sid = cur.userData?.surfaceId as SemanticSurfaceId | undefined;
            if (sid) {
              matchedSurfaceId = sid;
              break;
            }
            cur = cur.parent;
          }
        }
      }

      if (matchedSelectable && matchedSurfaceId) break;
    }

    if (matchedSelectable) {
      this.setSelectedSceneObject(matchedSelectable.obj, matchedSelectable.data);
    } else {
      this.clearSelectedElement();
    }

    if (matchedSurfaceId) {
      useHouseMaterialStore.getState().setSelectedSurfaceId(matchedSurfaceId);
      if (this.onSurfaceSelect) {
        this.onSurfaceSelect(matchedSurfaceId);
      }
    }
  }

  /**
   * Captures the exact 3D camera viewport (both RGB color pass and structure-locked depth pass)
   * as PNG data URLs for the Fal.ai Photorealistic Rendering pipeline (`fal-ai/flux-control-lora-depth` & `fal-ai/flux-pro/kontext`).
   */
  public captureViewportForAiRender(): {
    colorDataUrl: string;
    depthDataUrl: string;
    width: number;
    height: number;
    cameraMode: CameraMode;
  } {
    const canvas = this.renderer.domElement;
    const width = canvas.width || 1024;
    const height = canvas.height || 768;

    const prevHelperVisible = this.selectionBoxHelper ? this.selectionBoxHelper.visible : false;
    if (this.selectionBoxHelper) this.selectionBoxHelper.visible = false;

    // 1. Render crisp RGB color pass with ACES Filmic tone mapping and PBR lighting
    this.renderer.render(this.scene, this.camera);
    const colorDataUrl = canvas.toDataURL("image/png");

    // 2. Render structure-locked Depth Map pass fitted to the current camera frustum
    const prevOverride = this.scene.overrideMaterial;
    const prevBg = this.scene.background;
    const prevNear = this.camera.near;
    const prevFar = this.camera.far;

    if (this.cameraMode === "walkthrough") {
      this.camera.near = 0.25;
      this.camera.far = 16.0;
    } else {
      this.camera.near = Math.max(1.0, this.orbitDistance - 20.0);
      this.camera.far = this.orbitDistance + 24.0;
    }
    this.camera.updateProjectionMatrix();

    const depthMat = new THREE.MeshDepthMaterial({
      side: THREE.DoubleSide,
    });
    this.scene.overrideMaterial = depthMat;
    this.scene.background = new THREE.Color(0x000000);
    this.renderer.render(this.scene, this.camera);
    const depthDataUrl = canvas.toDataURL("image/png");
    depthMat.dispose();

    // Restore original camera & scene state and re-render seamlessly
    this.scene.overrideMaterial = prevOverride;
    this.scene.background = prevBg;
    this.camera.near = prevNear;
    this.camera.far = prevFar;
    if (this.selectionBoxHelper) this.selectionBoxHelper.visible = prevHelperVisible;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    return {
      colorDataUrl,
      depthDataUrl,
      width,
      height,
      cameraMode: this.cameraMode,
    };
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
    if (this.unsubscribeMaterialStore) {
      this.unsubscribeMaterialStore();
      this.unsubscribeMaterialStore = null;
    }
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
