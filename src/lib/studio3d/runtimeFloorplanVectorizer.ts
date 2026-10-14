/**
 * Universal Runtime 1:100 CAD Floorplan Vectorizer (Browser Canvas + IndexedDB Cache)
 *
 * Dynamically analyzes any Hudson Homes floorplan PNG (or uploaded custom plan image)
 * in the browser at runtime and extracts:
 *   1. Exact 1:100 main house footprint crop box (`floorplanCrop`), automatically
 *      ignoring left-hand schedule tables and "Option" inset diagrams.
 *   2. Exact `250mm–350mm` solid black exterior brick walls & corner articulation piers.
 *   3. Exact `90mm` solid black internal stud partition walls.
 *   4. Exact `90mm` parallel-dashed open hampers (`openHampers`, 2100mm bulkhead + 90mm side nibs).
 *   5. Exact internal & external `90°` hinged doors (`870mm` standard / `720mm` wet & linen / `820mm` external)
 *      and `45°` angled linen/cupboard doors with true hinge, closed, and open leaf points.
 *   6. Exact internal sliding robe doors (`cavity_slider`) from hollow double-line tracks.
 *   7. Exact exterior windows (`window`), patio sliding doors (`sliding_door`), and garage doors (`garage_door`).
 *   8. Exact Kitchen Sink (`1.07m × 0.48m` over ribbed drainer + twin bowls), Kitchen Island,
 *      Rear Bench + Cooktop, Showers, Bathtub, Vanities, Toilets, and Laundry Tub + Future WM provision.
 *   9. Stepped indoor/outdoor room polygons (`Alfresco`, `Porch`, `Garage`, `Living`, `Bedrooms`)
 *      so the 3D slab, ceiling, and stepped hip-and-valley roofline match the exact house silhouette.
 */

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  BuildingDesign3D,
  WallSegment,
  Opening3D,
  Fixture3D,
  Room3D,
} from "./studio3dTypes";
import { DEFAULT_FITOUT_CONFIG, DEFAULT_CUSTOM_FACADE_CONFIG } from "./floorplanTo3dEngine";
import { deduplicateWallSegments } from "./wallNetworkEngine";
import { resolveLocalFloorplanUrl } from "@/components/flyer/floorplans";
import { scoreFloorplanPage } from "@/lib/pdfPages";

const CACHE_VERSION = "v12_universal_zero_overlap";
const MEMORY_CACHE = new Map<string, VectorizedFloorplanPatch>();
const IDB_NAME = "hudson_studio3d_vectorizer_cache";
const IDB_STORE = "vectorized_plans";

/**
 * Converts any uploaded Floorplan File (PDF or PNG/JPG/WebP image) into a high-resolution
 * image URL suitable for 1:100 CAD vectorization in the browser.
 */
export async function renderFileToHighResFloorplanUrl(
  file: File,
  fallbackDataUrl?: string
): Promise<string | undefined> {
  if (typeof window === "undefined") return fallbackDataUrl;
  const isImage =
    file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
  if (isImage) {
    return URL.createObjectURL(file);
  }

  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return fallbackDataUrl;
  }

  try {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).href;
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    let bestPageNum = 1;
    let bestScore = -999;

    const maxCheck = Math.min(doc.numPages, 8);
    for (let i = 1; i <= maxCheck; i++) {
      try {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        const text = (tc.items || [])
          .map((it: any) => (it && typeof it.str === "string" ? it.str : ""))
          .join(" ");
        const { score } = scoreFloorplanPage(text);
        if (score > bestScore) {
          bestScore = score;
          bestPageNum = i;
        }
      } catch {
        // ignore text scoring error on page
      }
    }

    const page = await doc.getPage(bestPageNum);
    const baseVp = page.getViewport({ scale: 1 });
    const targetMaxDim = 4370;
    const scale = Math.min(
      3.5,
      Math.max(2.0, targetMaxDim / Math.max(baseVp.width, baseVp.height))
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallbackDataUrl;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("[RuntimeFloorplanVectorizer] High-res PDF render fallback:", err);
    return fallbackDataUrl;
  }
}

export interface VectorizedFloorplanPatch {
  floorplanImageUrl: string;
  floorplanCrop: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  widthM: number;
  lengthM: number;
  exactStructuralWalls: boolean;
  walls: WallSegment[];
  openings: Opening3D[];
  openHampers: Array<{
    id: string;
    start: [number, number];
    end: [number, number];
    thickness: number;
    bulkheadHeightM?: number;
    label: string;
  }>;
  rooms: Room3D[];
  fixtures: Fixture3D[];
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getCachedPatch(key: string): Promise<VectorizedFloorplanPatch | null> {
  if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key)!;
  const db = await openCacheDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        if (req.result) {
          MEMORY_CACHE.set(key, req.result);
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setCachedPatch(key: string, patch: VectorizedFloorplanPatch): Promise<void> {
  MEMORY_CACHE.set(key, patch);
  const db = await openCacheDb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(patch, key);
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Vectorizes a floorplan image URL at 1:100 scale and applies the exact structural
 * walls, doors, windows, hampers, rooms, and fixtures onto `baseDesign`.
 */
export async function vectorizeFloorplanForDesign(
  baseDesign: BuildingDesign3D,
  overrideImageUrl?: string
): Promise<BuildingDesign3D> {
  const imageUrl =
    overrideImageUrl ||
    resolveLocalFloorplanUrl(baseDesign.name, baseDesign.floorplanImageUrl);
  if (!imageUrl || typeof document === "undefined") {
    return baseDesign;
  }

  // If the design already has hand-verified exactStructuralWalls and matching crop, keep it fast
  if (
    baseDesign.exactStructuralWalls &&
    baseDesign.floorplanCrop &&
    !overrideImageUrl &&
    baseDesign.walls.length >= 25
  ) {
    return baseDesign;
  }

  const cacheKey = `${CACHE_VERSION}::${baseDesign.id}::${imageUrl.slice(0, 180)}::${baseDesign.widthM.toFixed(2)}x${baseDesign.lengthM.toFixed(2)}`;
  const cached = await getCachedPatch(cacheKey);
  if (cached) {
    return applyVectorizedPatch(baseDesign, cached);
  }

  try {
    const patch = await runCanvasFloorplanVectorizer(
      imageUrl,
      baseDesign.widthM,
      baseDesign.lengthM,
      baseDesign
    );
    if (patch && patch.walls.length >= 10) {
      await setCachedPatch(cacheKey, patch);
      return applyVectorizedPatch(baseDesign, patch);
    }
  } catch (err) {
    console.warn("[RuntimeFloorplanVectorizer] Fallback to base template:", err);
  }

  return baseDesign;
}

function applyVectorizedPatch(
  baseDesign: BuildingDesign3D,
  patch: VectorizedFloorplanPatch
): BuildingDesign3D {
  return {
    ...baseDesign,
    widthM: patch.widthM,
    lengthM: patch.lengthM,
    facade: "modern",
    floorplanImageUrl: patch.floorplanImageUrl,
    floorplanCrop: patch.floorplanCrop,
    exactStructuralWalls: true,
    walls: patch.walls,
    openings: patch.openings,
    openHampers: patch.openHampers,
    rooms: patch.rooms,
    fixtures: patch.fixtures,
    fitout: baseDesign.fitout || { ...DEFAULT_FITOUT_CONFIG },
    customFacade: {
      ...(baseDesign.customFacade || DEFAULT_CUSTOM_FACADE_CONFIG),
      mode: "tailored",
      facadePreset: "modern",
      rooflineStyle: "hip_22_5",
    },
  };
}

async function runCanvasFloorplanVectorizer(
  rawImageUrl: string,
  widthM: number,
  lengthM: number,
  baseDesign: BuildingDesign3D
): Promise<VectorizedFloorplanPatch | null> {
  const candidates: string[] = [];
  if (
    rawImageUrl.startsWith("blob:") ||
    rawImageUrl.startsWith("data:") ||
    rawImageUrl.startsWith("/floorplans/")
  ) {
    candidates.push(rawImageUrl);
  }
  const resolvedLocal = resolveLocalFloorplanUrl(baseDesign.name, baseDesign.floorplanImageUrl);
  if (!candidates.includes(resolvedLocal)) {
    candidates.push(resolvedLocal);
  }
  const cleanName = baseDesign.name.trim();
  candidates.push(`/floorplans/${cleanName.toUpperCase()}.png`);
  candidates.push(`/floorplans/${cleanName}.png`);
  if (!candidates.includes(rawImageUrl)) {
    candidates.push(rawImageUrl);
  }

  let img: HTMLImageElement | null = null;
  let imageUrl = rawImageUrl;
  for (const cand of candidates) {
    try {
      const candidateImg = new Image();
      candidateImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        candidateImg.onload = () => resolve();
        candidateImg.onerror = (e) => reject(e);
        candidateImg.src =
          cand.startsWith("blob:") || cand.startsWith("data:")
            ? cand
            : encodeURI(cand);
      });
      if (candidateImg.width >= 300 && candidateImg.height >= 300) {
        img = candidateImg;
        imageUrl = cand;
        break;
      }
    } catch {
      // try next candidate
    }
  }
  if (!img) return null;

  const W = img.width;
  const H = img.height;
  if (W < 300 || H < 300) return null;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  const getLum = (x: number, y: number): number => {
    if (x < 0 || x >= W || y < 0 || y >= H) return 255;
    const i = ((y | 0) * W + (x | 0)) * 4;
    if (data[i + 3] < 128) return 255;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // --- STEP 1: Universal White-Gutter-Aware Thick-Wall Bar Clustering & Footprint Detection ---
  const scaleRef = Math.max(0.35, Math.min(1.6, Math.max(W, H) / 4370));
  const minThick = Math.max(5, Math.round(9 * scaleRef));
  const maxThick = Math.max(24, Math.round(68 * scaleRef));
  const minLen = Math.max(22, Math.round(42 * scaleRef));
  const stepScan = Math.max(3, Math.round(6 * scaleRef));

  const isThickWallPixel = (x: number, y: number): boolean => {
    if (getLum(x, y) >= 75) return false;
    let hRun = 1;
    for (let dx = 1; dx <= maxThick && getLum(x + dx, y) < 85; dx++) hRun++;
    for (let dx = 1; dx <= maxThick && getLum(x - dx, y) < 85; dx++) hRun++;

    let vRun = 1;
    for (let dy = 1; dy <= maxThick && getLum(x, y + dy) < 85; dy++) vRun++;
    for (let dy = 1; dy <= maxThick && getLum(x, y - dy) < 85; dy++) vRun++;

    if (hRun >= minThick && hRun <= maxThick && vRun >= minLen) return true;
    if (vRun >= minThick && vRun <= maxThick && hRun >= minLen) return true;
    return false;
  };

  const marginX = Math.max(15, Math.round(W * 0.04));
  const marginYTop = Math.max(15, Math.round(H * 0.05));
  const marginYBot = Math.max(15, Math.round(H * 0.07));

  const wallPts: Array<{ x: number; y: number }> = [];
  for (let y = marginYTop; y <= H - marginYBot; y += stepScan) {
    for (let x = marginX; x <= W - marginX; x += stepScan) {
      if (isThickWallPixel(x, y)) {
        wallPts.push({ x, y });
      }
    }
  }

  interface WallCluster {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    pts: Array<{ x: number; y: number }>;
  }

  let minX = Math.round(W * 0.25);
  let maxX = Math.round(W * 0.85);
  let minY = Math.round(H * 0.15);
  let maxY = Math.round(H * 0.80);

  if (wallPts.length >= 20) {
    const cellPx = Math.max(60, Math.round(140 * scaleRef));
    const gridW = Math.ceil(W / cellPx);
    const gridH = Math.ceil(H / cellPx);
    const cells = new Map<number, Array<{ x: number; y: number }>>();
    for (const p of wallPts) {
      const k = Math.floor(p.y / cellPx) * gridW + Math.floor(p.x / cellPx);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k)!.push(p);
    }

    const visited = new Set<number>();
    const rawClusters: WallCluster[] = [];
    for (const [k] of cells.entries()) {
      if (visited.has(k) || cells.get(k)!.length < 2) continue;
      const queue = [k];
      visited.add(k);
      const cPts: Array<{ x: number; y: number }> = [];
      let cMinX = W,
        cMaxX = 0,
        cMinY = H,
        cMaxY = 0;
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const pts = cells.get(curr)!;
        for (const p of pts) {
          cPts.push(p);
          if (p.x < cMinX) cMinX = p.x;
          if (p.x > cMaxX) cMaxX = p.x;
          if (p.y < cMinY) cMinY = p.y;
          if (p.y > cMaxY) cMaxY = p.y;
        }
        const cy = Math.floor(curr / gridW);
        const cx = curr % gridW;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = cx + dx,
              ny = cy + dy;
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              const nk = ny * gridW + nx;
              if (!visited.has(nk) && cells.has(nk) && cells.get(nk)!.length >= 1) {
                visited.add(nk);
                queue.push(nk);
              }
            }
          }
        }
      }
      rawClusters.push({ minX: cMinX, maxX: cMaxX, minY: cMinY, maxY: cMaxY, pts: cPts });
    }

    // Split any cluster that spans across a wide vertical or horizontal white gutter (e.g. Double Storey GF + FF)
    const splitGapPx = Math.max(45, Math.round(90 * scaleRef));
    const splitByX = (cl: WallCluster): WallCluster[] => {
      const xs = cl.pts.map((p) => p.x).sort((a, b) => a - b);
      let maxGap = 0,
        splitVal = -1;
      for (let i = 1; i < xs.length; i++) {
        const g = xs[i] - xs[i - 1];
        if (g > maxGap) {
          maxGap = g;
          splitVal = (xs[i] + xs[i - 1]) / 2;
        }
      }
      if (maxGap >= splitGapPx) {
        const leftPts = cl.pts.filter((p) => p.x < splitVal);
        const rightPts = cl.pts.filter((p) => p.x >= splitVal);
        const out: WallCluster[] = [];
        for (const sub of [leftPts, rightPts]) {
          if (sub.length >= 15) {
            out.push(
              ...splitByX({
                minX: Math.min(...sub.map((p) => p.x)),
                maxX: Math.max(...sub.map((p) => p.x)),
                minY: Math.min(...sub.map((p) => p.y)),
                maxY: Math.max(...sub.map((p) => p.y)),
                pts: sub,
              })
            );
          }
        }
        if (out.length > 0) return out;
      }
      return [cl];
    };

    const splitByY = (cl: WallCluster): WallCluster[] => {
      const ys = cl.pts.map((p) => p.y).sort((a, b) => a - b);
      let maxGap = 0,
        splitVal = -1;
      for (let i = 1; i < ys.length; i++) {
        const g = ys[i] - ys[i - 1];
        if (g > maxGap) {
          maxGap = g;
          splitVal = (ys[i] + ys[i - 1]) / 2;
        }
      }
      if (maxGap >= splitGapPx) {
        const topPts = cl.pts.filter((p) => p.y < splitVal);
        const botPts = cl.pts.filter((p) => p.y >= splitVal);
        const out: WallCluster[] = [];
        for (const sub of [topPts, botPts]) {
          if (sub.length >= 15) {
            out.push(
              ...splitByY({
                minX: Math.min(...sub.map((p) => p.x)),
                maxX: Math.max(...sub.map((p) => p.x)),
                minY: Math.min(...sub.map((p) => p.y)),
                maxY: Math.max(...sub.map((p) => p.y)),
                pts: sub,
              })
            );
          }
        }
        if (out.length > 0) return out;
      }
      return [cl];
    };

    const finalClusters: WallCluster[] = [];
    for (const rc of rawClusters) {
      for (const sx of splitByX(rc)) {
        finalClusters.push(...splitByY(sx));
      }
    }

    if (finalClusters.length > 0) {
      finalClusters.sort((a, b) => {
        if (
          finalClusters.length >= 2 &&
          Math.min(a.pts.length, b.pts.length) > 150 &&
          Math.abs(a.minX - b.minX) > 700 * scaleRef
        ) {
          return a.minX - b.minX;
        }
        return b.pts.length - a.pts.length;
      });
      const main = finalClusters[0];
      minX = main.minX;
      maxX = main.maxX;
      minY = main.minY;
      maxY = main.maxY;

      // Expand into 350mm solid corner piers / Porch & Alfresco post piers, stopping at white gutters
      const rPier = Math.max(4, Math.round(7 * scaleRef));
      const isSolidBlock = (x: number, y: number): boolean => {
        if (getLum(x, y) >= 65) return false;
        for (let dy = -rPier; dy <= rPier; dy += 2) {
          for (let dx = -rPier; dx <= rPier; dx += 2) {
            if (getLum(x + dx, y + dy) >= 85) return false;
          }
        }
        return true;
      };

      const maxExpandY = Math.round(520 * scaleRef);
      const maxExpandX = Math.round(180 * scaleRef);
      const maxGutterRun = Math.max(16, Math.round(32 * scaleRef));

      let emptyRows = 0;
      for (let y = maxY + 1; y <= Math.min(H - marginYBot, maxY + maxExpandY); y++) {
        let rowHasPier = false;
        for (let x = minX - 20; x <= maxX + 20; x += 2) {
          if (isSolidBlock(x, y)) {
            rowHasPier = true;
            if (y > maxY) maxY = y;
          }
        }
        if (!rowHasPier) {
          emptyRows++;
          if (emptyRows >= maxGutterRun) break;
        } else {
          emptyRows = 0;
        }
      }

      emptyRows = 0;
      for (let y = minY - 1; y >= Math.max(marginYTop, minY - maxExpandY); y--) {
        let rowHasPier = false;
        for (let x = minX - 20; x <= maxX + 20; x += 2) {
          if (isSolidBlock(x, y)) {
            rowHasPier = true;
            if (y < minY) minY = y;
          }
        }
        if (!rowHasPier) {
          emptyRows++;
          if (emptyRows >= maxGutterRun) break;
        } else {
          emptyRows = 0;
        }
      }

      let emptyCols = 0;
      for (let x = minX - 1; x >= Math.max(marginX, minX - maxExpandX); x--) {
        let colHasPier = false;
        for (let y = minY; y <= maxY; y += 2) {
          if (isSolidBlock(x, y)) {
            colHasPier = true;
            if (x < minX) minX = x;
          }
        }
        if (!colHasPier) {
          emptyCols++;
          if (emptyCols >= maxGutterRun) break;
        } else {
          emptyCols = 0;
        }
      }

      emptyCols = 0;
      for (let x = maxX + 1; x <= Math.min(W - marginX, maxX + maxExpandX); x++) {
        let colHasPier = false;
        for (let y = minY; y <= maxY; y += 2) {
          if (isSolidBlock(x, y)) {
            colHasPier = true;
            if (x > maxX) maxX = x;
          }
        }
        if (!colHasPier) {
          emptyCols++;
          if (emptyCols >= maxGutterRun) break;
        } else {
          emptyCols = 0;
        }
      }

      // Fine outer edge walk across solid wall pixels (<75 lum)
      while (
        minX > marginX &&
        Array.from({ length: Math.ceil((maxY - minY) / 2) }, (_, i) =>
          getLum(minX - 1, minY + i * 2)
        ).some((l) => l < 75)
      )
        minX--;
      while (
        maxX < W - marginX &&
        Array.from({ length: Math.ceil((maxY - minY) / 2) }, (_, i) =>
          getLum(maxX + 1, minY + i * 2)
        ).some((l) => l < 75)
      )
        maxX++;
      while (
        minY > marginYTop &&
        Array.from({ length: Math.ceil((maxX - minX) / 2) }, (_, i) =>
          getLum(minX + i * 2, minY - 1)
        ).some((l) => l < 75)
      )
        minY--;
      while (
        maxY < H - marginYBot &&
        Array.from({ length: Math.ceil((maxX - minX) / 2) }, (_, i) =>
          getLum(minX + i * 2, maxY + 1)
        ).some((l) => l < 75)
      )
        maxY++;
    }
  }

  const cropW = Math.max(100, maxX - minX);
  const cropH = Math.max(100, maxY - minY);

  // Determine true 1:100 isotropic pxPerM scale
  const isStandardPortraitSheet = W >= 4200 && W <= 4500 && H >= 6000 && H <= 6450;
  const isStandardLandscapeSheet = W >= 4200 && W <= 4500 && H >= 3000 && H <= 3300;
  let pxPerM: number;
  if (isStandardPortraitSheet) {
    pxPerM = 161.85 * (W / 4370);
  } else if (isStandardLandscapeSheet) {
    pxPerM = 114.5 * (W / 4370);
  } else {
    pxPerM = cropW / Math.max(6.0, widthM);
  }

  widthM = +(cropW / pxPerM).toFixed(2);
  lengthM = +(cropH / pxPerM).toFixed(2);
  const pxPerMX = pxPerM;
  const pxPerMZ = pxPerM;

  const toMX = (px: number) => (px - minX) / pxPerMX;
  const toMZ = (py: number) => (py - minY) / pxPerMZ;
  const toPxX = (mx: number) => Math.round(minX + mx * pxPerMX);
  const toPxY = (mz: number) => Math.round(minY + mz * pxPerMZ);

  // --- STEP 2: Extract 250mm–350mm Exterior Brick Walls & 90mm Internal Solid Black Walls ---
  const minExtPx = Math.round(0.165 * pxPerM);
  const maxExtPx = Math.round(0.40 * pxPerM);
  const minIntPx = Math.max(8, Math.round(0.052 * pxPerM));
  const maxIntPx = Math.round(0.132 * pxPerM);

  interface SliceItem {
    xM: number;
    zM: number;
  }

  const vExtSlices: SliceItem[] = [];
  const vIntSlices: SliceItem[] = [];
  for (let py = minY; py <= maxY; py += 2) {
    const zM = toMZ(py);
    let runStart = -1;
    for (let px = minX - 2; px <= maxX + 2; px++) {
      const dark = getLum(px, py) < 75 && getLum(px, py - 1) < 90 && getLum(px, py + 1) < 90;
      if (dark && runStart === -1) runStart = px;
      else if (!dark && runStart !== -1) {
        const w = px - runStart;
        const midPx = Math.round(runStart + w / 2);
        const xM = toMX(runStart + w / 2);
        const solidCore = getLum(midPx, py - 3) < 80 && getLum(midPx, py + 3) < 80;
        if (solidCore) {
          if (w >= minExtPx && w <= maxExtPx) {
            vExtSlices.push({ xM, zM });
          } else if (w >= minIntPx && w <= maxIntPx) {
            if (getLum(runStart - 3, py) > 200 && getLum(px + 2, py) > 200) {
              vIntSlices.push({ xM, zM });
            }
          }
        }
        runStart = -1;
      }
    }
  }

  const hExtSlices: SliceItem[] = [];
  const hIntSlices: SliceItem[] = [];
  for (let px = minX; px <= maxX; px += 2) {
    const xM = toMX(px);
    let runStart = -1;
    for (let py = minY - 2; py <= maxY + 2; py++) {
      const dark = getLum(px, py) < 75 && getLum(px - 1, py) < 90 && getLum(px + 1, py) < 90;
      if (dark && runStart === -1) runStart = py;
      else if (!dark && runStart !== -1) {
        const h = py - runStart;
        const midPy = Math.round(runStart + h / 2);
        const zM = toMZ(runStart + h / 2);
        const solidCore = getLum(px - 3, midPy) < 80 && getLum(px + 3, midPy) < 80;
        if (solidCore) {
          if (h >= minExtPx && h <= maxExtPx) {
            hExtSlices.push({ xM, zM });
          } else if (h >= minIntPx && h <= maxIntPx) {
            if (getLum(px, runStart - 3) > 200 && getLum(px, py + 2) > 200) {
              hIntSlices.push({ xM, zM });
            }
          }
        }
        runStart = -1;
      }
    }
  }

  interface WallTrack {
    coord: number;
    intervals: Array<{ start: number; end: number }>;
    totalLen: number;
  }

  function buildTracks(
    slices: SliceItem[],
    coordKey: "xM" | "zM",
    posKey: "xM" | "zM",
    mergeTol: number,
    gapBridge: number,
    minSegLen: number
  ): WallTrack[] {
    const tracks: Array<{ coords: number[]; coord: number; positions: number[] }> = [];
    for (const s of slices) {
      const c = s[coordKey];
      let t = tracks.find((tr) => Math.abs(tr.coord - c) < mergeTol);
      if (!t) {
        t = { coords: [], coord: c, positions: [] };
        tracks.push(t);
      }
      t.coords.push(c);
      t.positions.push(s[posKey]);
      if (t.coords.length % 10 === 1) {
        const sortedC = [...t.coords].sort((a, b) => a - b);
        t.coord = sortedC[Math.floor(sortedC.length / 2)];
      }
    }
    const resultTracks: WallTrack[] = [];
    for (const t of tracks) {
      const sortedC = [...t.coords].sort((a, b) => a - b);
      t.coord = sortedC[Math.floor(sortedC.length / 2)];
      t.positions.sort((a, b) => a - b);
      const intervals: Array<{ start: number; end: number }> = [];
      let cur: { start: number; end: number; hits: number } | null = null;
      for (const pos of t.positions) {
        if (!cur) cur = { start: pos, end: pos, hits: 1 };
        else if (pos - cur.end <= gapBridge) {
          cur.end = pos;
          cur.hits++;
        } else {
          const len = cur.end - cur.start;
          if (len >= minSegLen && cur.hits >= len * 15) {
            intervals.push({
              start: Math.round(cur.start * 1000) / 1000,
              end: Math.round(cur.end * 1000) / 1000,
            });
          }
          cur = { start: pos, end: pos, hits: 1 };
        }
      }
      if (cur) {
        const len = cur.end - cur.start;
        if (len >= minSegLen && cur.hits >= len * 15) {
          intervals.push({
            start: Math.round(cur.start * 1000) / 1000,
            end: Math.round(cur.end * 1000) / 1000,
          });
        }
      }
      const totalLen = intervals.reduce((acc, iv) => acc + (iv.end - iv.start), 0);
      if (intervals.length > 0) {
        resultTracks.push({
          coord: Math.round(t.coord * 1000) / 1000,
          intervals,
          totalLen,
        });
      }
    }
    return resultTracks;
  }

  const vExtTracks = buildTracks(vExtSlices, "xM", "zM", 0.18, 0.08, 0.16);
  const hExtTracks = buildTracks(hExtSlices, "zM", "xM", 0.18, 0.08, 0.16);

  const vIntFiltered = vIntSlices.filter(
    (s) =>
      !vExtTracks.some(
        (t) =>
          Math.abs(t.coord - s.xM) < 0.22 &&
          t.intervals.some((iv) => s.zM >= iv.start - 0.16 && s.zM <= iv.end + 0.16)
      ) &&
      !hExtTracks.some(
        (t) =>
          Math.abs(t.coord - s.zM) < 0.22 &&
          t.intervals.some((iv) => s.xM >= iv.start - 0.16 && s.xM <= iv.end + 0.16)
      )
  );
  const hIntFiltered = hIntSlices.filter(
    (s) =>
      !hExtTracks.some(
        (t) =>
          Math.abs(t.coord - s.zM) < 0.22 &&
          t.intervals.some((iv) => s.xM >= iv.start - 0.16 && s.xM <= iv.end + 0.16)
      ) &&
      !vExtTracks.some(
        (t) =>
          Math.abs(t.coord - s.xM) < 0.22 &&
          t.intervals.some((iv) => s.zM >= iv.start - 0.16 && s.zM <= iv.end + 0.16)
      )
  );

  const vIntTracks = buildTracks(vIntFiltered, "xM", "zM", 0.11, 0.06, 0.10).filter(
    (t) => t.totalLen >= 0.16
  );
  const hIntTracks = buildTracks(hIntFiltered, "zM", "xM", 0.11, 0.06, 0.10).filter(
    (t) => t.totalLen >= 0.16
  );

  const hasSolidWallNear = (xPx: number, yPx: number, radPx = 12): boolean => {
    for (let dy = -radPx; dy <= radPx; dy += 2) {
      for (let dx = -radPx; dx <= radPx; dx += 2) {
        if (
          getLum(xPx + dx, yPx + dy) < 65 &&
          getLum(xPx + dx + 3, yPx + dy) < 75 &&
          getLum(xPx + dx - 3, yPx + dy) < 75 &&
          getLum(xPx + dx, yPx + dy + 3) < 75 &&
          getLum(xPx + dx, yPx + dy - 3) < 75
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // --- STEP 3: Direct Double-Line Band Scanner for 90mm Open Hampers & Sliding Robe Doors ---
  function scanDoubleLineBands(isHoriz: boolean) {
    const hampers: Array<{ coordM: number; startM: number; endM: number; lenM: number }> = [];
    const sliders: Array<{ coordM: number; startM: number; endM: number; lenM: number }> = [];
    const pMin = isHoriz ? minY + 12 : minX + 12;
    const pMax = isHoriz ? maxY - 12 : maxX - 12;
    const sMin = isHoriz ? minX : minY;
    const sMax = isHoriz ? maxX : maxY;
    const pxPerAlong = isHoriz ? pxPerMX : pxPerMZ;
    const pxPerCoord = isHoriz ? pxPerMZ : pxPerMX;

    for (let cPx = pMin; cPx <= pMax; cPx++) {
      for (const sep of [10, 11, 12, 13]) {
        const c1 = cPx,
          c2 = cPx + sep;
        let start = -1,
          lastHit = -1;
        for (let s = sMin; s <= sMax; s += 2) {
          const l1 = isHoriz
            ? Math.min(getLum(s, c1), getLum(s, c1 + 1))
            : Math.min(getLum(c1, s), getLum(c1 + 1, s));
          const l2 = isHoriz
            ? Math.min(getLum(s, c2), getLum(s, c2 - 1))
            : Math.min(getLum(c2, s), getLum(c2 - 1, s));
          const midC = Math.round((c1 + c2) / 2);
          const core = isHoriz
            ? Math.min(getLum(s, midC - 1), getLum(s, midC), getLum(s, midC + 1))
            : Math.min(getLum(midC - 1, s), getLum(midC, s), getLum(midC + 1, s));
          const f1 = isHoriz ? getLum(s, c1 - 4) : getLum(c1 - 4, s);
          const f2 = isHoriz ? getLum(s, c2 + 4) : getLum(c2 + 4, s);
          const ok = core > 220 && f1 > 200 && f2 > 200 && (l1 < 185 || l2 < 185);
          if (ok) {
            if (start === -1) start = s;
            lastHit = s;
          } else if (start !== -1 && s - lastHit > 30) {
            checkSeg(start, lastHit, c1, c2);
            start = -1;
          }
        }
        if (start !== -1) checkSeg(start, lastHit, c1, c2);
      }
    }

    function checkSeg(s1: number, s2: number, c1: number, c2: number) {
      const lenM = (s2 - s1) / pxPerAlong;
      if (lenM < 0.68 || lenM > 2.85) return;
      const midC = Math.round((c1 + c2) / 2);

      const startHasWall = isHoriz ? hasSolidWallNear(s1, midC, 16) : hasSolidWallNear(midC, s1, 16);
      const endHasWall = isHoriz ? hasSolidWallNear(s2, midC, 16) : hasSolidWallNear(midC, s2, 16);
      if (!startHasWall || !endHasWall) return;

      let d1 = 0,
        d2 = 0,
        t1 = 0,
        t2 = 0,
        last1 = false,
        last2 = false,
        coreDark = 0,
        flankDark = 0,
        tot = 0;
      for (let s = s1 + 6; s <= s2 - 6; s++) {
        tot++;
        const isD1 =
          (isHoriz
            ? Math.min(getLum(s, c1), getLum(s, c1 + 1))
            : Math.min(getLum(c1, s), getLum(c1 + 1, s))) < 185;
        const isD2 =
          (isHoriz
            ? Math.min(getLum(s, c2), getLum(s, c2 - 1))
            : Math.min(getLum(c2, s), getLum(c2 - 1, s))) < 185;
        if (isD1) d1++;
        if (isD2) d2++;
        if (isD1 !== last1) {
          t1++;
          last1 = isD1;
        }
        if (isD2 !== last2) {
          t2++;
          last2 = isD2;
        }
        const cMin = isHoriz
          ? Math.min(getLum(s, midC - 1), getLum(s, midC), getLum(s, midC + 1))
          : Math.min(getLum(midC - 1, s), getLum(midC, s), getLum(midC + 1, s));
        if (cMin < 200) coreDark++;
        const flMin = isHoriz
          ? Math.min(getLum(s, c1 - 4), getLum(s, c2 + 4))
          : Math.min(getLum(c1 - 4, s), getLum(c2 + 4, s));
        if (flMin < 190) flankDark++;
      }
      const r1 = d1 / tot,
        r2 = d2 / tot;
      if (coreDark / tot > 0.04 || flankDark / tot > 0.08) return;
      const coordM = +(((c1 + c2) / 2 - (isHoriz ? minY : minX)) / pxPerCoord).toFixed(3);
      const startM = +((s1 - (isHoriz ? minX : minY)) / pxPerAlong).toFixed(2);
      const endM = +((s2 - (isHoriz ? minX : minY)) / pxPerAlong).toFixed(2);

      if (r1 >= 0.9 && r2 >= 0.9 && t1 <= 4 && t2 <= 4 && lenM >= 0.92) {
        if (!sliders.some((x) => Math.abs(x.coordM - coordM) < 0.08 && Math.abs(x.startM - startM) < 0.2)) {
          sliders.push({ coordM, startM, endM, lenM: +lenM.toFixed(2) });
        }
      } else if (r1 >= 0.42 && r1 <= 0.85 && r2 >= 0.42 && r2 <= 0.85 && t1 >= 5 && t2 >= 5) {
        if (!hampers.some((x) => Math.abs(x.coordM - coordM) < 0.08 && Math.abs(x.startM - startM) < 0.2)) {
          hampers.push({ coordM, startM, endM, lenM: +lenM.toFixed(2) });
        }
      }
    }
    return { hampers, sliders };
  }

  const hBands = scanDoubleLineBands(true);
  const vBands = scanDoubleLineBands(false);

  const openHampers: Array<{
    id: string;
    start: [number, number];
    end: [number, number];
    thickness: number;
    bulkheadHeightM?: number;
    label: string;
  }> = [];
  for (const h of hBands.hampers) {
    openHampers.push({
      id: `hamper_h_${h.coordM}_${h.startM}`,
      start: [h.startM, h.coordM],
      end: [h.endM, h.coordM],
      thickness: 0.09,
      bulkheadHeightM: 2.1,
      label: "90mm Open Hamper",
    });
  }
  for (const h of vBands.hampers) {
    openHampers.push({
      id: `hamper_v_${h.coordM}_${h.startM}`,
      start: [h.coordM, h.startM],
      end: [h.coordM, h.endM],
      thickness: 0.09,
      bulkheadHeightM: 2.1,
      label: "90mm Open Hamper",
    });
  }

  interface RawOpening {
    id: string;
    type: Opening3D["type"];
    position: [number, number];
    wallOrientation: "horizontal" | "vertical";
    width: number;
    hingePoint?: [number, number];
    closedPoint?: [number, number];
    openPoint?: [number, number];
    isExterior: boolean;
  }

  const rawOpenings: RawOpening[] = [];

  for (const s of hBands.sliders) {
    const extTrack = hExtTracks.find((t) => Math.abs(t.coord - s.coordM) < 0.24);
    if (extTrack) {
      rawOpenings.push({
        id: `win_h_${extTrack.coord}_${s.startM}`,
        type: "window",
        position: [+((s.startM + s.endM) / 2).toFixed(2), extTrack.coord],
        wallOrientation: "horizontal",
        width: s.lenM,
        isExterior: true,
      });
    } else {
      rawOpenings.push({
        id: `robe_h_${s.coordM}_${s.startM}`,
        type: "cavity_slider",
        position: [+((s.startM + s.endM) / 2).toFixed(2), s.coordM],
        wallOrientation: "horizontal",
        width: s.lenM,
        isExterior: false,
      });
    }
  }
  for (const s of vBands.sliders) {
    const extTrack = vExtTracks.find((t) => Math.abs(t.coord - s.coordM) < 0.24);
    if (extTrack) {
      rawOpenings.push({
        id: `win_v_${extTrack.coord}_${s.startM}`,
        type: "window",
        position: [extTrack.coord, +((s.startM + s.endM) / 2).toFixed(2)],
        wallOrientation: "vertical",
        width: s.lenM,
        isExterior: true,
      });
    } else {
      rawOpenings.push({
        id: `robe_v_${s.coordM}_${s.startM}`,
        type: "cavity_slider",
        position: [s.coordM, +((s.startM + s.endM) / 2).toFixed(2)],
        wallOrientation: "vertical",
        width: s.lenM,
        isExterior: false,
      });
    }
  }

  // --- STEP 4: Analyze 250mm Exterior Wall Gaps (Windows, Sliding Doors, Garage Doors) ---
  function analyzeExteriorTrackGaps(
    tracks: WallTrack[],
    orientation: "horizontal" | "vertical",
    perpExtTracks: WallTrack[]
  ) {
    for (const tr of tracks) {
      const candidateGaps: Array<{ gStart: number; gEnd: number }> = [];
      for (let i = 0; i < tr.intervals.length - 1; i++) {
        candidateGaps.push({ gStart: tr.intervals[i].end, gEnd: tr.intervals[i + 1].start });
      }
      if (tr.intervals.length > 0) {
        const firstStart = tr.intervals[0].start;
        for (const pt of perpExtTracks) {
          const dist = firstStart - (pt.coord + 0.125);
          if (
            dist >= 0.65 &&
            dist <= 3.6 &&
            pt.intervals.some((iv) => tr.coord >= iv.start - 0.35 && tr.coord <= iv.end + 0.35)
          ) {
            candidateGaps.push({ gStart: pt.coord + 0.125, gEnd: firstStart });
          }
        }
        const lastEnd = tr.intervals[tr.intervals.length - 1].end;
        for (const pt of perpExtTracks) {
          const dist = pt.coord - 0.125 - lastEnd;
          if (
            dist >= 0.65 &&
            dist <= 3.6 &&
            pt.intervals.some((iv) => tr.coord >= iv.start - 0.35 && tr.coord <= iv.end + 0.35)
          ) {
            candidateGaps.push({ gStart: lastEnd, gEnd: pt.coord - 0.125 });
          }
        }
      }

      for (const { gStart, gEnd } of candidateGaps) {
        const gapLen = gEnd - gStart;
        if (gapLen < 0.42 || gapLen > 5.5) continue;
        const midPos = +((gStart + gEnd) / 2).toFixed(2);
        const pos2D: [number, number] =
          orientation === "vertical" ? [tr.coord, midPos] : [midPos, tr.coord];

        const existingIdx = rawOpenings.findIndex(
          (o) =>
            o.wallOrientation === orientation &&
            Math.hypot(o.position[0] - pos2D[0], o.position[1] - pos2D[1]) < 0.45
        );

        let lineCrossingsSum = 0;
        for (const frac of [0.25, 0.5, 0.75]) {
          const posM = gStart + gapLen * frac;
          let crossings = 0;
          let inDark = false;
          for (let dM = -0.14; dM <= 0.14; dM += 0.01) {
            const px = orientation === "vertical" ? toPxX(tr.coord + dM) : toPxX(posM);
            const py = orientation === "vertical" ? toPxY(posM) : toPxY(tr.coord + dM);
            const isDark = getLum(px, py) < 155;
            if (isDark && !inDark) {
              crossings++;
              inDark = true;
            } else if (!isDark) {
              inDark = false;
            }
          }
          lineCrossingsSum += crossings;
        }
        const avgCrossings = lineCrossingsSum / 3;

        if (gapLen >= 3.8 && gapLen <= 5.4 && pos2D[1] > lengthM * 0.55 && avgCrossings >= 0.8) {
          if (existingIdx !== -1) rawOpenings.splice(existingIdx, 1);
          rawOpenings.push({
            id: `gd_${orientation}_${tr.coord}_${gStart.toFixed(2)}`,
            type: "garage_door",
            position: pos2D,
            wallOrientation: orientation,
            width: Math.round(gapLen * 100) / 100,
            isExterior: true,
          });
        } else if (gapLen <= 3.75 && avgCrossings >= 1.3) {
          let hasSlidingArrow = false;
          for (let posM = gStart + 0.25; posM <= gEnd - 0.25; posM += 0.03) {
            for (const offM of [-0.22, -0.18, 0.18, 0.22]) {
              const px = orientation === "vertical" ? toPxX(tr.coord + offM) : toPxX(posM);
              const py = orientation === "vertical" ? toPxY(posM) : toPxY(tr.coord + offM);
              if (getLum(px, py) < 60 && getLum(px + 2, py) < 60 && getLum(px - 2, py) < 60) {
                hasSlidingArrow = true;
                break;
              }
            }
            if (hasSlidingArrow) break;
          }
          const isSliding = gapLen >= 1.75 && hasSlidingArrow;
          if (existingIdx !== -1) {
            if (isSliding) rawOpenings[existingIdx].type = "sliding_door";
          } else {
            rawOpenings.push({
              id: `${isSliding ? "sd" : "win"}_${orientation}_${tr.coord}_${gStart.toFixed(2)}`,
              type: isSliding ? "sliding_door" : "window",
              position: pos2D,
              wallOrientation: orientation,
              width: Math.round(gapLen * 100) / 100,
              isExterior: true,
            });
          }
        }
      }
    }
  }

  analyzeExteriorTrackGaps(vExtTracks, "vertical", hExtTracks);
  analyzeExteriorTrackGaps(hExtTracks, "horizontal", vExtTracks);

  // --- STEP 5: Multi-Radius Direct 90° Hinged Door Scanner (Score >= 0.91) ---
  function eval90Door(
    x: number,
    y: number,
    leafAxis: "v" | "h",
    dirLeaf: number,
    dirSwing: number,
    rM: number
  ) {
    const rPxLeaf = Math.round(rM * (leafAxis === "v" ? pxPerMZ : pxPerMX));
    const rPxSwing = Math.round(rM * (leafAxis === "v" ? pxPerMX : pxPerMZ));

    let leafHits = 0,
      leafThin = 0,
      solidWallCount = 0,
      leafTot = 0;
    for (let s = 16; s <= rPxLeaf - 8; s += 4) {
      leafTot++;
      const lx = leafAxis === "v" ? x : x + dirLeaf * s;
      const ly = leafAxis === "v" ? y + dirLeaf * s : y;
      const dMin =
        leafAxis === "v"
          ? Math.min(
              getLum(lx - 2, ly),
              getLum(lx - 1, ly),
              getLum(lx, ly),
              getLum(lx + 1, ly),
              getLum(lx + 2, ly)
            )
          : Math.min(
              getLum(lx, ly - 2),
              getLum(lx, ly - 1),
              getLum(lx, ly),
              getLum(lx, ly + 1),
              getLum(lx, ly + 2)
            );
      if (dMin < 175) leafHits++;
      const thickSolid =
        leafAxis === "v"
          ? getLum(lx - 5, ly) < 85 && getLum(lx, ly) < 85 && getLum(lx + 5, ly) < 85
          : getLum(lx, ly - 5) < 85 && getLum(lx, ly) < 85 && getLum(lx, ly + 5) < 85;
      if (thickSolid) solidWallCount++;
      const f1 = leafAxis === "v" ? getLum(lx - 8, ly) : getLum(lx, ly - 8);
      const f2 = leafAxis === "v" ? getLum(lx + 8, ly) : getLum(lx, ly + 8);
      if (f1 > 195 && f2 > 195) leafThin++;
    }
    if (solidWallCount > leafTot * 0.15) return null;
    if (leafHits / leafTot < 0.78 || leafThin / leafTot < 0.72) return null;

    if (!hasSolidWallNear(x, y, 12)) return null;
    const cX = leafAxis === "v" ? x + dirSwing * rPxSwing : x;
    const cY = leafAxis === "v" ? y : y + dirSwing * rPxSwing;
    if (!hasSolidWallNear(cX, cY, 16)) return null;

    let gapDark = 0,
      gapTot = 0;
    for (let s = 22; s <= rPxSwing - 22; s += 5) {
      gapTot++;
      const gx = leafAxis === "v" ? x + dirSwing * s : x;
      const gy = leafAxis === "v" ? y : y + dirSwing * s;
      let sliceDark = false;
      for (let d = -6; d <= 6; d += 3) {
        const px = leafAxis === "v" ? gx : gx + d;
        const py = leafAxis === "v" ? gy + d : gy;
        if (getLum(px, py) < 150) {
          sliceDark = true;
          break;
        }
      }
      if (sliceDark) gapDark++;
    }
    if (gapDark / gapTot > 0.32) return null;

    let arcHits = 0,
      arcFlankWhite = 0,
      arcTot = 0;
    for (let deg = 18; deg <= 72; deg += 4) {
      arcTot++;
      const rad = (deg * Math.PI) / 180;
      const cosA = Math.cos(rad),
        sinA = Math.sin(rad);
      let hit = false;
      for (let dr = -3; dr <= 3; dr++) {
        const ax = Math.round(
          x + (leafAxis === "v" ? dirSwing * (rPxSwing + dr) * cosA : dirLeaf * (rPxLeaf + dr) * sinA)
        );
        const ay = Math.round(
          y + (leafAxis === "v" ? dirLeaf * (rPxLeaf + dr) * sinA : dirSwing * (rPxSwing + dr) * cosA)
        );
        if (getLum(ax, ay) < 195) {
          hit = true;
          break;
        }
      }
      if (hit) arcHits++;
      const inX = Math.round(
        x + (leafAxis === "v" ? dirSwing * (rPxSwing - 9) * cosA : dirLeaf * (rPxLeaf - 9) * sinA)
      );
      const inY = Math.round(
        y + (leafAxis === "v" ? dirLeaf * (rPxLeaf - 9) * sinA : dirSwing * (rPxSwing - 9) * cosA)
      );
      const outX = Math.round(
        x + (leafAxis === "v" ? dirSwing * (rPxSwing + 9) * cosA : dirLeaf * (rPxLeaf + 9) * sinA)
      );
      const outY = Math.round(
        y + (leafAxis === "v" ? dirLeaf * (rPxLeaf + 9) * sinA : dirSwing * (rPxSwing + 9) * cosA)
      );
      if (getLum(inX, inY) > 185 && getLum(outX, outY) > 185) arcFlankWhite++;
    }
    const arcRatio = arcHits / arcTot;
    const flankRatio = arcFlankWhite / arcTot;
    if (arcRatio < 0.68 || flankRatio < 0.62) return null;

    const score = (leafHits / leafTot) * 0.4 + arcRatio * 0.4 + flankRatio * 0.2;
    if (score < 0.91) return null;

    const wallOrient: "horizontal" | "vertical" = leafAxis === "v" ? "horizontal" : "vertical";
    const hXM = +toMX(x).toFixed(2);
    const hZM = +toMZ(y).toFixed(2);
    const cXM = +toMX(cX).toFixed(2);
    const cZM = +toMZ(cY).toFixed(2);
    const oXM = +(leafAxis === "v" ? hXM : hXM + dirLeaf * rM).toFixed(2);
    const oZM = +(leafAxis === "v" ? hZM + dirLeaf * rM : hZM).toFixed(2);

    return {
      wallOrient,
      hPt: [hXM, hZM] as [number, number],
      cPt: [cXM, cZM] as [number, number],
      oPt: [oXM, oZM] as [number, number],
      pos: [+((hXM + cXM) / 2).toFixed(2), +((hZM + cZM) / 2).toFixed(2)] as [number, number],
      width: rM <= 0.7 ? 0.72 : 0.87,
      score,
    };
  }

  const raw90Doors: NonNullable<ReturnType<typeof eval90Door>>[] = [];
  const radii = [0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.88];
  for (let y = minY + 15; y <= maxY - 15; y += 3) {
    for (let x = minX + 15; x <= maxX - 15; x += 3) {
      if (getLum(x, y) >= 170) continue;
      for (const leafAxis of ["v", "h"] as const) {
        for (const dirLeaf of [-1, 1]) {
          const p1x = leafAxis === "v" ? x : x + dirLeaf * 35;
          const p1y = leafAxis === "v" ? y + dirLeaf * 35 : y;
          const p2x = leafAxis === "v" ? x : x + dirLeaf * 70;
          const p2y = leafAxis === "v" ? y + dirLeaf * 70 : y;
          if (getLum(p1x, p1y) >= 180 || getLum(p2x, p2y) >= 180) continue;
          for (const rM of radii) {
            for (const dirSwing of [-1, 1]) {
              const cand = eval90Door(x, y, leafAxis, dirLeaf, dirSwing, rM);
              if (cand) raw90Doors.push(cand);
            }
          }
        }
      }
    }
  }

  raw90Doors.sort((a, b) => b.score - a.score);
  for (const d of raw90Doors) {
    if (
      openHampers.some(
        (h) =>
          Math.hypot((h.start[0] + h.end[0]) / 2 - d.pos[0], (h.start[1] + h.end[1]) / 2 - d.pos[1]) <
          0.35
      )
    )
      continue;
    if (
      rawOpenings.some(
        (o) =>
          o.type === "cavity_slider" &&
          Math.hypot(o.position[0] - d.pos[0], o.position[1] - d.pos[1]) < 0.35
      )
    )
      continue;
    if (
      rawOpenings.some(
        (o) =>
          o.type === "door" &&
          o.hingePoint &&
          (Math.hypot(o.hingePoint[0] - d.hPt[0], o.hingePoint[1] - d.hPt[1]) < 0.45 ||
            Math.hypot(o.position[0] - d.pos[0], o.position[1] - d.pos[1]) < 0.42)
      )
    )
      continue;

    const winIdx = rawOpenings.findIndex(
      (o) =>
        o.type === "window" && Math.hypot(o.position[0] - d.pos[0], o.position[1] - d.pos[1]) < 0.48
    );
    const isExt =
      winIdx !== -1 ||
      (d.wallOrient === "vertical" && vExtTracks.some((t) => Math.abs(t.coord - d.pos[0]) < 0.25)) ||
      (d.wallOrient === "horizontal" && hExtTracks.some((t) => Math.abs(t.coord - d.pos[1]) < 0.25));
    if (winIdx !== -1) rawOpenings.splice(winIdx, 1);

    rawOpenings.push({
      id: `door90_${d.wallOrient}_${d.pos[0]}_${d.pos[1]}`,
      type: "door",
      position: d.pos,
      wallOrientation: d.wallOrient,
      width: isExt ? 0.82 : d.width,
      hingePoint: d.hPt,
      closedPoint: d.cPt,
      openPoint: d.oPt,
      isExterior: isExt,
    });
  }

  // --- STEP 5B: Detect 45° Linen / Cupboard Hinged Doors along Internal Wall Gaps ---
  function detect45CupboardDoors(tracks: WallTrack[], orientation: "horizontal" | "vertical") {
    for (const tr of tracks) {
      for (let i = 0; i < tr.intervals.length - 1; i++) {
        const gStart = tr.intervals[i].end;
        const gEnd = tr.intervals[i + 1].start;
        const gapLen = gEnd - gStart;
        if (gapLen < 0.45 || gapLen > 1.85) continue;
        const midPos = (gStart + gEnd) / 2;
        const pos2D: [number, number] =
          orientation === "vertical" ? [tr.coord, midPos] : [midPos, tr.coord];

        if (
          rawOpenings.some(
            (o) => Math.hypot(o.position[0] - pos2D[0], o.position[1] - pos2D[1]) < 0.35
          )
        )
          continue;
        if (
          openHampers.some(
            (h) =>
              Math.hypot(
                (h.start[0] + h.end[0]) / 2 - pos2D[0],
                (h.start[1] + h.end[1]) / 2 - pos2D[1]
              ) < 0.35
          )
        )
          continue;

        for (const rawJamb of [gStart, gEnd]) {
          const signAlong = rawJamb === gStart ? 1 : -1;
          let foundJamb = false;
          for (const da of [-0.03, 0, 0.03, 0.06]) {
            if (foundJamb) break;
            const jamb = rawJamb + signAlong * da;
            for (const leafLen of [0.48, 0.56, 0.65]) {
              if (foundJamb || leafLen > gapLen * 0.98) continue;
              for (const sideSign of [-1, 1]) {
                const rad = (45 * Math.PI) / 180;
                let hits = 0,
                  clearFlanks = 0,
                  tot = 0;
                for (let s = 0.1; s <= leafLen * 0.88; s += 0.025) {
                  tot++;
                  const aPos = jamb + signAlong * Math.cos(rad) * s;
                  const pPos = tr.coord + sideSign * Math.sin(rad) * s;
                  const px = orientation === "vertical" ? toPxX(pPos) : toPxX(aPos);
                  const py = orientation === "vertical" ? toPxY(aPos) : toPxY(pPos);
                  if (
                    getLum(px, py) < 175 ||
                    getLum(px + 1, py) < 175 ||
                    getLum(px - 1, py) < 175 ||
                    getLum(px, py + 1) < 175
                  ) {
                    hits++;
                  }
                  const nx = Math.round(-signAlong * Math.sin(rad) * 8);
                  const ny = Math.round(sideSign * Math.cos(rad) * 8);
                  if (getLum(px + nx, py + ny) > 215 && getLum(px - nx, py - ny) > 215) {
                    clearFlanks++;
                  }
                }
                let tipOpen = true;
                for (const sTip of [leafLen * 1.12, leafLen * 1.22]) {
                  const aPos = jamb + signAlong * Math.cos(rad) * sTip;
                  const pPos = tr.coord + sideSign * Math.sin(rad) * sTip;
                  const px = orientation === "vertical" ? toPxX(pPos) : toPxX(aPos);
                  const py = orientation === "vertical" ? toPxY(aPos) : toPxY(pPos);
                  if (getLum(px, py) < 210) tipOpen = false;
                }
                if (tipOpen && hits / tot >= 0.75 && clearFlanks / tot >= 0.78) {
                  const hPt: [number, number] =
                    orientation === "vertical"
                      ? [tr.coord, +jamb.toFixed(2)]
                      : [+jamb.toFixed(2), tr.coord];
                  const cPt: [number, number] =
                    orientation === "vertical"
                      ? [tr.coord, +(jamb + signAlong * leafLen).toFixed(2)]
                      : [+(jamb + signAlong * leafLen).toFixed(2), tr.coord];
                  const oPt: [number, number] =
                    orientation === "vertical"
                      ? [
                          +(tr.coord + sideSign * Math.sin(rad) * leafLen).toFixed(2),
                          +(jamb + signAlong * Math.cos(rad) * leafLen).toFixed(2),
                        ]
                      : [
                          +(jamb + signAlong * Math.cos(rad) * leafLen).toFixed(2),
                          +(tr.coord + sideSign * Math.sin(rad) * leafLen).toFixed(2),
                        ];
                  rawOpenings.push({
                    id: `door45_${orientation}_${tr.coord}_${jamb.toFixed(2)}`,
                    type: "door",
                    position:
                      orientation === "vertical"
                        ? [tr.coord, +((hPt[1] + cPt[1]) / 2).toFixed(2)]
                        : [+((hPt[0] + cPt[0]) / 2).toFixed(2), tr.coord],
                    wallOrientation: orientation,
                    width: 0.72,
                    hingePoint: hPt,
                    closedPoint: cPt,
                    openPoint: oPt,
                    isExterior: false,
                  });
                  foundJamb = true;
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  detect45CupboardDoors(vIntTracks, "vertical");
  detect45CupboardDoors(hIntTracks, "horizontal");

  // --- STEP 6: Build Continuous Structural WallSegments & Attach Openings ---
  // Merge track intervals separated ONLY by doors/windows/sliders into continuous WallSegments
  // so `threeSceneManager.ts` cuts exact lintels/sills/jambs for every opening!
  const walls: WallSegment[] = [];
  const mergeTrackIntervalsFor3D = (
    tracks: WallTrack[],
    orientation: "horizontal" | "vertical",
    isExterior: boolean
  ) => {
    for (const tr of tracks) {
      if (tr.intervals.length === 0) continue;
      const merged: Array<{ start: number; end: number }> = [];
      let cur = { ...tr.intervals[0] };
      for (let i = 1; i < tr.intervals.length; i++) {
        const next = tr.intervals[i];
        const gapMid = (cur.end + next.start) / 2;
        const pos2D: [number, number] =
          orientation === "vertical" ? [tr.coord, gapMid] : [gapMid, tr.coord];
        // Check if this gap is bridged by a detected opening (window, door, sliding_door, garage_door, cavity_slider)
        const hasOpeningInGap = rawOpenings.some(
          (op) =>
            op.wallOrientation === orientation &&
            Math.hypot(op.position[0] - pos2D[0], op.position[1] - pos2D[1]) <
              Math.max(0.65, (next.start - cur.end) * 0.65)
        );
        if (hasOpeningInGap || next.start - cur.end <= 0.15) {
          cur.end = next.end;
        } else {
          merged.push(cur);
          cur = { ...next };
        }
      }
      merged.push(cur);

      for (let idx = 0; idx < merged.length; idx++) {
        const iv = merged[idx];
        // Extend interval slightly if an opening at the end of the track extends to a perpendicular wall
        let sPos = iv.start;
        let ePos = iv.end;
        for (const op of rawOpenings) {
          if (op.wallOrientation !== orientation) continue;
          const opCoord = orientation === "vertical" ? op.position[0] : op.position[1];
          const opAlong = orientation === "vertical" ? op.position[1] : op.position[0];
          if (Math.abs(opCoord - tr.coord) < 0.22) {
            const opStart = opAlong - op.width / 2 - 0.08;
            const opEnd = opAlong + op.width / 2 + 0.08;
            if (Math.abs(opEnd - sPos) < 0.65 && opStart < sPos) sPos = Math.max(0, opStart);
            if (Math.abs(opStart - ePos) < 0.65 && opEnd > ePos)
              ePos = Math.min(orientation === "vertical" ? lengthM : widthM, opEnd);
          }
        }
        walls.push({
          id: `w_${isExterior ? "ext" : "int"}_${orientation[0]}_${tr.coord.toFixed(2)}_${idx}`,
          start: orientation === "vertical" ? [tr.coord, +sPos.toFixed(3)] : [+sPos.toFixed(3), tr.coord],
          end: orientation === "vertical" ? [tr.coord, +ePos.toFixed(3)] : [+ePos.toFixed(3), tr.coord],
          thickness: isExterior ? 0.25 : 0.09,
          isExterior,
        });
      }
    }
  };

  mergeTrackIntervalsFor3D(vExtTracks, "vertical", true);
  mergeTrackIntervalsFor3D(hExtTracks, "horizontal", true);
  mergeTrackIntervalsFor3D(vIntTracks, "vertical", false);
  mergeTrackIntervalsFor3D(hIntTracks, "horizontal", false);

  // Also ensure every opening has a host wall (if a door or robe slider sat between two perpendicular walls with no collinear track)
  const openings: Opening3D[] = [];
  for (const op of rawOpenings) {
    let bestWall: WallSegment | null = null;
    let bestDist = Infinity;
    for (const w of walls) {
      const isVert = Math.abs(w.start[0] - w.end[0]) < 0.05;
      const wOrient = isVert ? "vertical" : "horizontal";
      if (wOrient !== op.wallOrientation) continue;
      const wCoord = isVert ? w.start[0] : w.start[1];
      const wMin = Math.min(isVert ? w.start[1] : w.start[0], isVert ? w.end[1] : w.end[0]);
      const wMax = Math.max(isVert ? w.start[1] : w.start[0], isVert ? w.end[1] : w.end[0]);
      const opCoord = isVert ? op.position[0] : op.position[1];
      const opAlong = isVert ? op.position[1] : op.position[0];
      const dCoord = Math.abs(wCoord - opCoord);
      const dAlong =
        opAlong < wMin ? wMin - opAlong : opAlong > wMax ? opAlong - wMax : 0;
      const d = dCoord + dAlong * 0.5;
      if (dCoord < 0.26 && dAlong < 0.85 && d < bestDist) {
        bestDist = d;
        bestWall = w;
      }
    }

    if (!bestWall) {
      // Create a dedicated host wall segment spanning the doorway/slider + 80mm jambs
      const half = op.width / 2 + 0.08;
      const hostWall: WallSegment = {
        id: `w_host_${op.id}`,
        start:
          op.wallOrientation === "vertical"
            ? [op.position[0], +(op.position[1] - half).toFixed(2)]
            : [+(op.position[0] - half).toFixed(2), op.position[1]],
        end:
          op.wallOrientation === "vertical"
            ? [op.position[0], +(op.position[1] + half).toFixed(2)]
            : [+(op.position[0] + half).toFixed(2), op.position[1]],
        thickness: op.isExterior ? 0.25 : 0.09,
        isExterior: op.isExterior,
      };
      walls.push(hostWall);
      bestWall = hostWall;
    } else {
      // Ensure bestWall's span covers the opening
      const isVert = op.wallOrientation === "vertical";
      const opAlong = isVert ? op.position[1] : op.position[0];
      const half = op.width / 2 + 0.06;
      if (isVert) {
        const wMin = Math.min(bestWall.start[1], bestWall.end[1]);
        const wMax = Math.max(bestWall.start[1], bestWall.end[1]);
        bestWall.start[1] = Math.min(wMin, +(opAlong - half).toFixed(2));
        bestWall.end[1] = Math.max(wMax, +(opAlong + half).toFixed(2));
        op.position[0] = bestWall.start[0];
      } else {
        const wMin = Math.min(bestWall.start[0], bestWall.end[0]);
        const wMax = Math.max(bestWall.start[0], bestWall.end[0]);
        bestWall.start[0] = Math.min(wMin, +(opAlong - half).toFixed(2));
        bestWall.end[0] = Math.max(wMax, +(opAlong + half).toFixed(2));
        op.position[1] = bestWall.start[1];
      }
    }

    const hVal = op.type === "window" ? 1.2 : 2.1;
    const sillVal = op.type === "window" ? 0.9 : 0;
    openings.push({
      id: op.id,
      type: op.type,
      code: `${op.type.toUpperCase()} ${Math.round(op.width * 1000)}`,
      label:
        op.type === "garage_door"
          ? "Double Garage Sectional Door"
          : op.type === "sliding_door"
          ? "Alfresco Glass Sliding Door"
          : op.type === "cavity_slider"
          ? "Sliding Robe Door"
          : op.type === "window"
          ? "Aluminium Glazed Window"
          : `${Math.round(op.width * 1000)}mm Hinged Door`,
      position: op.position,
      wallOrientation: op.wallOrientation,
      width: op.width,
      height: hVal,
      sillHeight: sillVal,
      headHeight: +(sillVal + hVal).toFixed(2),
      hingePoint: op.hingePoint,
      closedPoint: op.closedPoint,
      openPoint: op.openPoint,
      isExterior: op.isExterior,
    });
  }

  const cleanWalls = deduplicateWallSegments(walls);

  // --- STEP 7: Derive Stepped Indoor & Outdoor Room Polygons for Roof, Slab & Ceiling ---
  const garageDoor = openings.find((o) => o.type === "garage_door");
  const entryDoor = openings.find(
    (o) => o.type === "door" && o.position[1] > lengthM * 0.65 && Math.abs(o.width - 0.82) < 0.05
  );
  const alfrescoSlider = openings.find(
    (o) =>
      (o.type === "sliding_door" || o.type === "window") &&
      o.position[1] > 1.8 &&
      o.position[1] < lengthM * 0.32 &&
      o.width >= 1.8
  );

  // Determine Garage bounds (South-Right or South-Left)
  const garOnRight = !garageDoor || garageDoor.position[0] >= widthM * 0.45;
  const garZMax = garageDoor ? garageDoor.position[1] : +(lengthM - 1.2).toFixed(2);
  const garZMin = +(garZMax - 5.65).toFixed(2);
  const garXMin = garOnRight ? +(widthM - 5.75).toFixed(2) : 0;
  const garXMax = garOnRight ? widthM : 5.75;

  // Determine leftmost vertical exterior wall in the South half (handles West step-in plans like Tiffany 22)
  const southLeftWalls = vExtTracks.filter(
    (t) => t.coord < widthM * 0.35 && t.intervals.some((iv) => iv.end > lengthM * 0.72)
  );
  const frontMinX =
    southLeftWalls.length > 0
      ? Math.max(0, +(Math.min(...southLeftWalls.map((t) => t.coord)) - 0.12).toFixed(2))
      : 0;
  const hasWestPorchStepIn = frontMinX >= 0.85;

  // Determine Porch bounds (either West step-in Porch or South recessed Porch)
  let porchXMin = 0;
  let porchXMax = 0;
  let porchZMin = garZMax;
  let porchZMax = lengthM;

  if (hasWestPorchStepIn) {
    // West-side Porch nestled in the left step-in (e.g. Tiffany 22)
    const northWestWall = vExtTracks.find((t) => t.coord < 0.35);
    const stepZ = northWestWall
      ? Math.max(...northWestWall.intervals.map((iv) => iv.end))
      : +(garZMin - 0.5).toFixed(2);
    porchXMin = 0;
    porchXMax = frontMinX;
    porchZMin = +stepZ.toFixed(2);
    porchZMax = +(stepZ + 2.95).toFixed(2);
  } else {
    porchZMin = entryDoor ? entryDoor.position[1] : garZMax;
    porchZMax = lengthM;
    porchXMin = entryDoor
      ? +(entryDoor.position[0] - 0.65).toFixed(2)
      : garOnRight
      ? +(garXMin - 1.65).toFixed(2)
      : garXMax;
    porchXMax = garOnRight ? garXMin : +(porchXMin + 1.65).toFixed(2);
  }

  // Determine Alfresco & North Wing bounds directly from North horizontal exterior wall tracks
  let northLeftEnd = 0;
  let northRightStart = widthM;
  for (const t of hExtTracks) {
    if (t.coord < 0.45) {
      for (const iv of t.intervals) {
        if (iv.start < 0.6 && iv.end > northLeftEnd) {
          northLeftEnd = iv.end;
        }
        if (iv.end > widthM - 0.6 && iv.start > 1.2 && iv.start < northRightStart) {
          northRightStart = iv.start;
        }
      }
    }
  }

  // Stepped-back horizontal exterior wall at the rear of the Alfresco (0.8m < z < lengthM * 0.35)
  const alfBackTrack = hExtTracks
    .filter((t) => t.coord >= 0.85 && t.coord <= lengthM * 0.35 && t.totalLen >= 1.8)
    .sort((a, b) => a.coord - b.coord)[0];

  const alfZMax = alfBackTrack
    ? alfBackTrack.coord
    : alfrescoSlider
    ? alfrescoSlider.position[1]
    : 3.4;

  let alfXMin = northLeftEnd > 0.5 ? northLeftEnd : 0;
  let alfXMax = widthM;
  if (northRightStart < widthM - 0.5 && northRightStart > alfXMin + 1.2) {
    alfXMax = northRightStart;
  } else if (alfXMin > 0.5) {
    let maxNorthDarkPx = minX;
    const bandMaxY = Math.min(maxY, minY + Math.round(0.55 * pxPerM));
    for (let py = minY; py <= bandMaxY; py += 2) {
      for (let px = maxX; px > maxNorthDarkPx; px -= 2) {
        if (getLum(px, py) < 185) {
          maxNorthDarkPx = px;
          break;
        }
      }
    }
    const maxNorthDarkM = toMX(maxNorthDarkPx);
    alfXMax =
      maxNorthDarkM > alfXMin + 1.5
        ? Math.min(widthM, +(maxNorthDarkM + 0.06).toFixed(2))
        : widthM;
  } else if (northRightStart < widthM - 0.5) {
    alfXMin = 0;
    alfXMax = northRightStart;
  }

  const hasNorthEastIndoorWing = northRightStart < widthM - 0.5 && northRightStart >= alfXMax - 0.1;

  // Front non-garage wing southernmost exterior wall Z
  const frontWingLeftX = garOnRight ? frontMinX : porchXMax;
  const frontWingRightX = garOnRight ? (hasWestPorchStepIn ? garXMin : porchXMin) : widthM;
  const frontSouthTracks = hExtTracks.filter(
    (t) =>
      t.coord > lengthM * 0.78 &&
      t.intervals.some(
        (iv) =>
          Math.min(iv.end, frontWingRightX) - Math.max(iv.start, frontWingLeftX) > 1.2
      )
  );
  const frontWingMaxZ =
    frontSouthTracks.length > 0
      ? Math.max(...frontSouthTracks.map((t) => t.coord))
      : lengthM;

  const rooms: Room3D[] = [
    {
      id: "r_alfresco",
      name: "Alfresco",
      polygon: [
        [alfXMin, 0],
        [alfXMax, 0],
        [alfXMax, alfZMax],
        [alfXMin, alfZMax],
      ],
      areaM2: +((alfXMax - alfXMin) * alfZMax).toFixed(1),
      floorFinish: "decking",
      center: [+((alfXMin + alfXMax) / 2).toFixed(2), +(alfZMax / 2).toFixed(2)],
    },
    {
      id: "r_porch",
      name: "Porch",
      polygon: [
        [porchXMin, porchZMin],
        [porchXMax, porchZMin],
        [porchXMax, porchZMax],
        [porchXMin, porchZMax],
      ],
      areaM2: +((porchXMax - porchXMin) * (porchZMax - porchZMin)).toFixed(1),
      floorFinish: "decking",
      center: [
        +((porchXMin + porchXMax) / 2).toFixed(2),
        +((porchZMin + porchZMax) / 2).toFixed(2),
      ],
    },
    {
      id: "r_garage",
      name: "Garage",
      polygon: [
        [garXMin, garZMin],
        [garXMax, garZMin],
        [garXMax, garZMax],
        [garXMin, garZMax],
      ],
      areaM2: +((garXMax - garXMin) * (garZMax - garZMin)).toFixed(1),
      floorFinish: "concrete",
      center: [+((garXMin + garXMax) / 2).toFixed(2), +((garZMin + garZMax) / 2).toFixed(2)],
    },
    ...(alfXMin > 1.2
      ? [
          {
            id: "r_north_wing",
            name: "Master Bed" as const,
            polygon: [
              [0, 0],
              [alfXMin, 0],
              [alfXMin, alfZMax],
              [0, alfZMax],
            ] as [number, number][],
            areaM2: +(alfXMin * alfZMax).toFixed(1),
            floorFinish: "carpet" as const,
            center: [+(alfXMin / 2).toFixed(2), +(alfZMax / 2).toFixed(2)] as [number, number],
          },
        ]
      : []),
    ...(hasNorthEastIndoorWing
      ? [
          {
            id: "r_north_east_wing",
            name: "Bed 4" as const,
            polygon: [
              [northRightStart, 0],
              [widthM, 0],
              [widthM, alfZMax],
              [northRightStart, alfZMax],
            ] as [number, number][],
            areaM2: +((widthM - northRightStart) * alfZMax).toFixed(1),
            floorFinish: "carpet" as const,
            center: [
              +((northRightStart + widthM) / 2).toFixed(2),
              +(alfZMax / 2).toFixed(2),
            ] as [number, number],
          },
        ]
      : []),
    {
      id: "r_main_core",
      name: "Living",
      customLabel: "Family / Dining / Kitchen",
      polygon: [
        [0, alfZMax],
        [widthM, alfZMax],
        [widthM, garZMin],
        [0, garZMin],
      ],
      areaM2: +(widthM * (garZMin - alfZMax)).toFixed(1),
      floorFinish: "timber",
      center: [+(widthM / 2).toFixed(2), +((alfZMax + garZMin) / 2).toFixed(2)],
    },
    {
      id: "r_front_wing",
      name: "Bed 2",
      polygon: [
        [frontWingLeftX, garZMin],
        [frontWingRightX, garZMin],
        [frontWingRightX, frontWingMaxZ],
        [frontWingLeftX, frontWingMaxZ],
      ],
      areaM2: +((frontWingRightX - frontWingLeftX) * (frontWingMaxZ - garZMin)).toFixed(1),
      floorFinish: "carpet",
      center: [
        +((frontWingLeftX + frontWingRightX) / 2).toFixed(2),
        +((garZMin + frontWingMaxZ) / 2).toFixed(2),
      ],
    },
    ...(!hasWestPorchStepIn
      ? [
          {
            id: "r_entry",
            name: "Entry" as const,
            polygon: [
              [porchXMin, garZMin],
              [porchXMax, garZMin],
              [porchXMax, porchZMin],
              [porchXMin, porchZMin],
            ] as [number, number][],
            areaM2: +((porchXMax - porchXMin) * (porchZMin - garZMin)).toFixed(1),
            floorFinish: "timber" as const,
            center: [
              +((porchXMin + porchXMax) / 2).toFixed(2),
              +((garZMin + porchZMin) / 2).toFixed(2),
            ] as [number, number],
          },
        ]
      : []),
  ];

  // --- STEP 8: Detect Kitchen Sink, Island, Rear Bench & Complete Bathroom/Ensuite/Laundry/Room Fixtures ---
  const fixtures: Fixture3D[] = [];
  let bestSink: { px: number; py: number; isHorizSink: boolean } | null = null;
  let maxRibScore = 0;

  for (let py = minY + 150; py <= maxY - 150; py += 8) {
    for (let px = minX + 150; px <= maxX - 150; px += 8) {
      let hTrans = 0,
        vTrans = 0,
        lastH = false,
        lastV = false;
      for (let d = -24; d <= 24; d++) {
        const dh = getLum(px + d, py) < 165;
        if (dh !== lastH) {
          hTrans++;
          lastH = dh;
        }
        const dv = getLum(px, py + d) < 165;
        if (dv !== lastV) {
          vTrans++;
          lastV = dv;
        }
      }
      const score = Math.max(hTrans, vTrans);
      if (score >= 12 && score > maxRibScore) {
        let confirm = 0;
        const isVertRibs = hTrans > vTrans;
        for (let off = -15; off <= 15; off += 5) {
          let tr = 0,
            lst = false;
          for (let d = -24; d <= 24; d++) {
            const dk = isVertRibs
              ? getLum(px + d, py + off) < 165
              : getLum(px + off, py + d) < 165;
            if (dk !== lst) {
              tr++;
              lst = dk;
            }
          }
          if (tr >= 10) confirm++;
        }
        if (confirm >= 4) {
          maxRibScore = score;
          bestSink = { px, py, isHorizSink: !isVertRibs };
        }
      }
    }
  }

  let sinkXM = +(widthM * 0.68).toFixed(2);
  let sinkZM = +(lengthM * 0.52).toFixed(2);

  if (bestSink) {
    const stepPx = Math.round(0.38 * pxPerM);
    let negDark = 0,
      posDark = 0;
    for (let d = -20; d <= 20; d += 4) {
      for (let s = 15; s <= stepPx + 20; s += 5) {
        const nx = bestSink.isHorizSink ? bestSink.px - s : bestSink.px + d;
        const ny = bestSink.isHorizSink ? bestSink.py + d : bestSink.py - s;
        const px = bestSink.isHorizSink ? bestSink.px + s : bestSink.px + d;
        const py = bestSink.isHorizSink ? bestSink.py + d : bestSink.py + s;
        if (getLum(nx, ny) < 160) negDark++;
        if (getLum(px, py) < 160) posDark++;
      }
    }
    const bowlDir = negDark > posDark ? 1 : -1;
    sinkXM = +(toMX(bestSink.px) + (bestSink.isHorizSink ? bowlDir * 0.22 : 0)).toFixed(2);
    sinkZM = +(toMZ(bestSink.py) + (bestSink.isHorizSink ? 0 : bowlDir * 0.22)).toFixed(2);
    const rotY = bestSink.isHorizSink ? 0 : Math.PI / 2;

    fixtures.push({
      id: "fx_kitchen_island",
      type: "kitchen_island",
      roomName: "Kitchen",
      position: [sinkXM, 0.45, sinkZM],
      rotationY: rotY,
      width: 2.35,
      depth: 0.85,
      height: 0.9,
      label: "40mm Stone Waterfall Island Bench",
    });
    fixtures.push({
      id: "fx_kitchen_sink",
      type: "kitchen_sink",
      roomName: "Kitchen",
      position: [sinkXM, 0.9, sinkZM],
      rotationY: rotY,
      width: 1.07,
      depth: 0.48,
      height: 0.04,
      label: "Double Bowl Undermount Sink & Drainer",
    });

    // Find backing wall perpendicular to the sink island within 1.25m..2.35m
    let rearXM = sinkXM;
    let rearZM = sinkZM;
    let foundRear = false;
    if (bestSink.isHorizSink) {
      const candidateZ = cleanWalls
        .filter(
          (w) =>
            Math.abs(w.start[1] - w.end[1]) < 0.05 &&
            sinkXM >= Math.min(w.start[0], w.end[0]) - 0.5 &&
            sinkXM <= Math.max(w.start[0], w.end[0]) + 0.5 &&
            Math.abs(w.start[1] - sinkZM) >= 1.25 &&
            Math.abs(w.start[1] - sinkZM) <= 2.35
        )
        .sort((a, b) => Math.abs(a.start[1] - sinkZM) - Math.abs(b.start[1] - sinkZM))[0];
      if (candidateZ) {
        const wallZ = candidateZ.start[1];
        const dir = wallZ > sinkZM ? -1 : 1;
        rearZM = +(wallZ + dir * 0.34).toFixed(2);
        foundRear = true;
      }
    } else {
      const candidateX = cleanWalls
        .filter(
          (w) =>
            Math.abs(w.start[0] - w.end[0]) < 0.05 &&
            sinkZM >= Math.min(w.start[1], w.end[1]) - 0.5 &&
            sinkZM <= Math.max(w.start[1], w.end[1]) + 0.5 &&
            Math.abs(w.start[0] - sinkXM) >= 1.25 &&
            Math.abs(w.start[0] - sinkXM) <= 2.35
        )
        .sort((a, b) => Math.abs(a.start[0] - sinkXM) - Math.abs(b.start[0] - sinkXM))[0];
      if (candidateX) {
        const wallX = candidateX.start[0];
        const dir = wallX > sinkXM ? -1 : 1;
        rearXM = +(wallX + dir * 0.34).toFixed(2);
        foundRear = true;
      }
    }

    if (foundRear) {
      fixtures.push({
        id: "fx_kitchen_rear",
        type: "kitchen_cabinetry",
        roomName: "Kitchen",
        position: [rearXM, 0.45, rearZM],
        rotationY: rotY,
        width: 2.35,
        depth: 0.62,
        height: 0.9,
        label: "Rear Kitchen Bench & Overhead Joinery",
      });
      fixtures.push({
        id: "fx_cooktop",
        type: "cooktop_oven",
        roomName: "Kitchen",
        position: [rearXM, 0.46, rearZM],
        rotationY: rotY,
        width: 0.62,
        depth: 0.56,
        height: 0.9,
        label: "900mm 4-Burner Cooktop & Underbench Oven",
      });
    }
  } else {
    fixtures.push({
      id: "fx_kitchen_island",
      type: "kitchen_island",
      roomName: "Kitchen",
      position: [sinkXM, 0.45, sinkZM],
      rotationY: 0,
      width: 2.35,
      depth: 0.85,
      height: 0.9,
      label: "40mm Stone Waterfall Island Bench",
    });
    fixtures.push({
      id: "fx_kitchen_sink",
      type: "kitchen_sink",
      roomName: "Kitchen",
      position: [sinkXM, 0.9, sinkZM],
      rotationY: 0,
      width: 1.07,
      depth: 0.48,
      height: 0.04,
      label: "Double Bowl Undermount Sink & Drainer",
    });
  }

  // --- STEP 8B: Detect Enclosed Indoor Room Bays (Ensuite, Main Bath, Laundry & Bedrooms) from Wall Network ---
  const cellM = 0.20;
  const gW = Math.max(10, Math.ceil(widthM / cellM));
  const gH = Math.max(10, Math.ceil(lengthM / cellM));
  const grid = new Uint8Array(gW * gH);

  // Mark outdoor/garage zones & exterior margins as blocked (1)
  for (let iz = 0; iz < gH; iz++) {
    const z = (iz + 0.5) * cellM;
    for (let ix = 0; ix < gW; ix++) {
      const x = (ix + 0.5) * cellM;
      const inAlf = x >= alfXMin - 0.1 && x <= alfXMax + 0.1 && z <= alfZMax + 0.1;
      const inPorch =
        x >= porchXMin - 0.1 && x <= porchXMax + 0.1 && z >= porchZMin - 0.1 && z <= porchZMax + 0.1;
      const inGar =
        x >= garXMin - 0.1 && x <= garXMax + 0.1 && z >= garZMin - 0.1 && z <= garZMax + 0.1;
      const outSouth = z > frontWingMaxZ && (x < garXMin || x > garXMax);
      const outWestStep = hasWestPorchStepIn && x < frontMinX && z > porchZMin;
      if (inAlf || inPorch || inGar || outSouth || outWestStep || x < 0.15 || x > widthM - 0.15 || z < 0.15 || z > lengthM - 0.15) {
        grid[iz * gW + ix] = 1;
      }
    }
  }

  // Rasterize all walls & open hampers onto the 0.20m grid
  const markSegmentOnGrid = (s: [number, number], e: [number, number], padM = 0.14) => {
    const minXSeg = Math.max(0, Math.floor((Math.min(s[0], e[0]) - padM) / cellM));
    const maxXSeg = Math.min(gW - 1, Math.floor((Math.max(s[0], e[0]) + padM) / cellM));
    const minZSeg = Math.max(0, Math.floor((Math.min(s[1], e[1]) - padM) / cellM));
    const maxZSeg = Math.min(gH - 1, Math.floor((Math.max(s[1], e[1]) + padM) / cellM));
    for (let iz = minZSeg; iz <= maxZSeg; iz++) {
      for (let ix = minXSeg; ix <= maxXSeg; ix++) {
        grid[iz * gW + ix] = 1;
      }
    }
  };

  for (const w of cleanWalls) {
    markSegmentOnGrid(w.start, w.end, w.isExterior ? 0.16 : 0.12);
  }
  for (const h of openHampers) {
    markSegmentOnGrid(h.start, h.end, 0.12);
  }

  interface RoomBay {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    cx: number;
    cz: number;
    w: number;
    l: number;
    areaM2: number;
    fixtureScore: number;
  }

  const bays: RoomBay[] = [];
  for (let iz = 0; iz < gH; iz++) {
    for (let ix = 0; ix < gW; ix++) {
      const startIdx = iz * gW + ix;
      if (grid[startIdx] !== 0) continue;
      const q = [startIdx];
      grid[startIdx] = 2;
      let cMinX = ix,
        cMaxX = ix,
        cMinZ = iz,
        cMaxZ = iz,
        count = 0;
      while (q.length > 0) {
        const cur = q.pop()!;
        count++;
        const cx = cur % gW;
        const cz = (cur / gW) | 0;
        if (cx < cMinX) cMinX = cx;
        if (cx > cMaxX) cMaxX = cx;
        if (cz < cMinZ) cMinZ = cz;
        if (cz > cMaxZ) cMaxZ = cz;
        const neighbors = [
          cx > 0 ? cur - 1 : -1,
          cx + 1 < gW ? cur + 1 : -1,
          cz > 0 ? cur - gW : -1,
          cz + 1 < gH ? cur + gW : -1,
        ];
        for (const nb of neighbors) {
          if (nb >= 0 && grid[nb] === 0) {
            grid[nb] = 2;
            q.push(nb);
          }
        }
      }
      const rMinX = +(cMinX * cellM).toFixed(2);
      const rMaxX = +((cMaxX + 1) * cellM).toFixed(2);
      const rMinZ = +(cMinZ * cellM).toFixed(2);
      const rMaxZ = +((cMaxZ + 1) * cellM).toFixed(2);
      const rw = +(rMaxX - rMinX).toFixed(2);
      const rl = +(rMaxZ - rMinZ).toFixed(2);
      const areaM2 = +(count * cellM * cellM).toFixed(2);

      // Ignore tinyrobe pockets or giant open-plan living halls
      if (rw < 1.15 || rl < 1.15 || areaM2 < 2.1 || areaM2 > 22.0) continue;
      // Ignore if this bay contains the Kitchen Sink
      if (sinkXM >= rMinX - 0.2 && sinkXM <= rMaxX + 0.2 && sinkZM >= rMinZ - 0.2 && sinkZM <= rMaxZ + 0.2) {
        continue;
      }

      // Measure CAD fixture linework density in the inner wall band (0.18m..0.68m from walls, avoiding center room label)
      let darkHits = 0,
        samples = 0;
      const pX1 = toPxX(rMinX + 0.16),
        pX2 = toPxX(rMaxX - 0.16);
      const pY1 = toPxY(rMinZ + 0.16),
        pY2 = toPxY(rMaxZ - 0.16);
      const midX1 = toPxX(rMinX + rw * 0.34),
        midX2 = toPxX(rMaxX - rw * 0.34);
      const midY1 = toPxY(rMinZ + rl * 0.34),
        midY2 = toPxY(rMaxZ - rl * 0.34);
      for (let py = pY1; py <= pY2; py += 4) {
        for (let px = pX1; px <= pX2; px += 4) {
          if (px >= midX1 && px <= midX2 && py >= midY1 && py <= midY2) continue;
          samples++;
          if (getLum(px, py) < 175) darkHits++;
        }
      }
      let fixtureScore = samples > 0 ? darkHits / samples : 0;

      // Bonus if bordered by a 720mm wet-area door or external side door
      const hasWetDoor = openings.some(
        (o) =>
          o.type === "door" &&
          (o.width <= 0.76 || (o.isExterior && o.position[1] < lengthM * 0.72)) &&
          o.position[0] >= rMinX - 0.35 &&
          o.position[0] <= rMaxX + 0.35 &&
          o.position[1] >= rMinZ - 0.35 &&
          o.position[1] <= rMaxZ + 0.35
      );
      if (hasWetDoor) fixtureScore += 0.06;

      bays.push({
        minX: rMinX,
        maxX: rMaxX,
        minZ: rMinZ,
        maxZ: rMaxZ,
        cx: +((rMinX + rMaxX) / 2).toFixed(2),
        cz: +((rMinZ + rMaxZ) / 2).toFixed(2),
        w: rw,
        l: rl,
        areaM2,
        fixtureScore,
      });
    }
  }

  // Classify wet-area bays (2.1..9.5 m²) vs Bedroom bays (7.8..21.5 m²)
  const wetCandidateBays = bays
    .filter((b) => b.areaM2 >= 2.1 && b.areaM2 <= 9.8 && Math.min(b.w, b.l) <= 3.3)
    .sort((a, b) => b.fixtureScore - a.fixtureScore);

  const selectedWetBays = wetCandidateBays.slice(0, 3);
  const usedWetSet = new Set(selectedWetBays);

  // Assign Ensuite (closest to North or South master corner), Main Bath (largest wet bay), and Laundry
  if (selectedWetBays.length > 0) {
    // Sort by area descending to pick Main Bath vs Ensuite vs Laundry
    const byZ = [...selectedWetBays].sort((a, b) => a.cz - b.cz);
    const ensBay = byZ[0];
    const remainingWet = selectedWetBays.filter((b) => b !== ensBay).sort((a, b) => b.areaM2 - a.areaM2);
    const bathBay = remainingWet[0];
    const ldryBay = remainingWet[1];

    if (ensBay) {
      rooms.push({
        id: "r_ensuite_auto",
        name: "Ensuite",
        polygon: [
          [ensBay.minX, ensBay.minZ],
          [ensBay.maxX, ensBay.minZ],
          [ensBay.maxX, ensBay.maxZ],
          [ensBay.minX, ensBay.maxZ],
        ],
        areaM2: ensBay.areaM2,
        floorFinish: "tiles",
        center: [ensBay.cx, ensBay.cz],
      });
      const shW = Math.min(0.90, +(ensBay.w * 0.42).toFixed(2));
      const shD = Math.min(0.90, +(ensBay.l * 0.42).toFixed(2));
      fixtures.push({
        id: "fx_ens_shower",
        type: "shower",
        roomName: "Ensuite",
        position: [+(ensBay.minX + shW / 2 + 0.08).toFixed(2), 1.0, +(ensBay.minZ + shD / 2 + 0.08).toFixed(2)],
        rotationY: 0,
        width: shW,
        depth: shD,
        height: 2.0,
        label: "Ensuite Walk-In Frameless Glass Shower",
      });
      fixtures.push({
        id: "fx_ens_vanity",
        type: ensBay.w >= 2.2 ? "vanity_double" : "vanity_single",
        roomName: "Ensuite",
        position: [+(ensBay.maxX - 0.30).toFixed(2), 0.43, ensBay.cz],
        rotationY: -Math.PI / 2,
        width: Math.min(1.2, +(ensBay.l * 0.55).toFixed(2)),
        depth: 0.46,
        height: 0.86,
        label: "Ensuite Stone-Top Vanity, Ceramic Basin & Mirror",
      });
      fixtures.push({
        id: "fx_ens_toilet",
        type: "toilet",
        roomName: "Ensuite",
        position: [+(ensBay.minX + 0.36).toFixed(2), 0.41, +(ensBay.maxZ - 0.36).toFixed(2)],
        rotationY: Math.PI / 2,
        width: 0.44,
        depth: 0.65,
        height: 0.82,
        label: "Ensuite Close-Coupled Toilet Suite",
      });
    }

    if (bathBay) {
      rooms.push({
        id: "r_bath_auto",
        name: "Bath",
        polygon: [
          [bathBay.minX, bathBay.minZ],
          [bathBay.maxX, bathBay.minZ],
          [bathBay.maxX, bathBay.maxZ],
          [bathBay.minX, bathBay.maxZ],
        ],
        areaM2: bathBay.areaM2,
        floorFinish: "tiles",
        center: [bathBay.cx, bathBay.cz],
      });
      const tubAlongZ = bathBay.l >= bathBay.w;
      fixtures.push({
        id: "fx_bath_tub",
        type: "bath",
        roomName: "Bath",
        position: [+(bathBay.minX + 0.46).toFixed(2), 0.28, bathBay.cz],
        rotationY: tubAlongZ ? Math.PI / 2 : 0,
        width: Math.min(1.65, +(Math.max(bathBay.w, bathBay.l) * 0.62).toFixed(2)),
        depth: 0.76,
        height: 0.56,
        label: "Main Bathroom 1700mm Bathtub",
      });
      fixtures.push({
        id: "fx_bath_shower",
        type: "shower",
        roomName: "Bath",
        position: [+(bathBay.maxX - 0.50).toFixed(2), 1.0, +(bathBay.minZ + 0.50).toFixed(2)],
        rotationY: 0,
        width: 0.88,
        depth: 0.88,
        height: 2.0,
        label: "Main Bathroom Glass Shower (900 × 900mm)",
      });
      fixtures.push({
        id: "fx_bath_vanity",
        type: "vanity_single",
        roomName: "Bath",
        position: [bathBay.cx, 0.43, +(bathBay.minZ + 0.28).toFixed(2)],
        rotationY: 0,
        width: Math.min(0.95, +(bathBay.w * 0.42).toFixed(2)),
        depth: 0.46,
        height: 0.86,
        label: "Main Bathroom Stone-Top Vanity & Mirror",
      });
      fixtures.push({
        id: "fx_bath_toilet",
        type: "toilet",
        roomName: "Bath",
        position: [+(bathBay.maxX - 0.36).toFixed(2), 0.41, +(bathBay.maxZ - 0.36).toFixed(2)],
        rotationY: -Math.PI / 2,
        width: 0.44,
        depth: 0.65,
        height: 0.82,
        label: "Main Bathroom Toilet Suite",
      });
    }

    if (ldryBay) {
      rooms.push({
        id: "r_laundry_auto",
        name: "Laundry",
        polygon: [
          [ldryBay.minX, ldryBay.minZ],
          [ldryBay.maxX, ldryBay.minZ],
          [ldryBay.maxX, ldryBay.maxZ],
          [ldryBay.minX, ldryBay.maxZ],
        ],
        areaM2: ldryBay.areaM2,
        floorFinish: "tiles",
        center: [ldryBay.cx, ldryBay.cz],
      });
      fixtures.push({
        id: "fx_ldry_tub",
        type: "laundry_tub",
        roomName: "Laundry",
        position: [+(ldryBay.minX + 0.40).toFixed(2), 0.45, +(ldryBay.maxZ - 0.32).toFixed(2)],
        rotationY: Math.PI,
        width: 0.60,
        depth: 0.48,
        height: 0.90,
        label: "Laundry 45L Stainless Tub & Cabinet",
      });
      fixtures.push({
        id: "fx_ldry_wm",
        type: "washing_machine",
        roomName: "Laundry",
        position: [+(ldryBay.minX + 1.10).toFixed(2), 0.02, +(ldryBay.maxZ - 0.36).toFixed(2)],
        rotationY: Math.PI,
        width: 0.72,
        depth: 0.65,
        height: 0.04,
        label: "Washing Machine Space Provision",
      });
    }
  }

  // Populate Bedroom beds cleanly inside the enclosed Bedroom bays (when showFurniture is toggled on)
  const bedBays = bays
    .filter((b) => !usedWetSet.has(b) && b.areaM2 >= 7.5 && b.w >= 2.5 && b.l >= 2.5)
    .sort((a, b) => b.areaM2 - a.areaM2)
    .slice(0, 4);

  const bedLabels: Array<"Master Bed" | "Bed 2" | "Bed 3" | "Bed 4"> = [
    "Master Bed",
    "Bed 2",
    "Bed 3",
    "Bed 4",
  ];
  for (let i = 0; i < bedBays.length; i++) {
    const bb = bedBays[i];
    const rName = bedLabels[i] || "Bed 2";
    const isMaster = i === 0;
    fixtures.push({
      id: `fx_bed_${i + 1}`,
      type: isMaster ? "bed_queen" : "bed_double",
      roomName: rName,
      position: [bb.cx, isMaster ? 0.35 : 0.32, bb.cz],
      rotationY: bb.w >= bb.l ? Math.PI / 2 : 0,
      width: isMaster ? 1.65 : 1.40,
      depth: isMaster ? 2.00 : 1.90,
      height: isMaster ? 0.68 : 0.62,
      label: isMaster ? "Master Queen Bed & Side Tables" : `${rName} Double Bed`,
    });
  }

  return {
    floorplanImageUrl: imageUrl,
    floorplanCrop: {
      minX,
      maxX,
      minY,
      maxY,
    },
    widthM,
    lengthM,
    exactStructuralWalls: true,
    walls: cleanWalls,
    openings,
    openHampers,
    rooms,
    fixtures,
  };
}
