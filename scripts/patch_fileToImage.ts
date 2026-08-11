import fs from 'fs';
import path from 'path';

const fileToImage = path.join(process.cwd(), 'src', 'components', 'flyer', 'fileToImage.ts');
let content = fs.readFileSync(fileToImage, 'utf-8');

// Add import for getIdbFloorplan, saveIdbFloorplan
if (!content.includes('saveIdbFloorplan')) {
  content = 'import { getIdbFloorplan, saveIdbFloorplan } from "./idbFloorplanCache";\n' + content;
}

const prepareFloorplanOld = `export async function prepareFloorplan(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  // Local pre-processed high-quality floorplans don't need fetching/cropping/sharpening
  if (url.startsWith("/floorplans/")) {
    return url;
  }

  const cacheKey = \`\${url}::\${FLOORPLAN_PIPELINE_VERSION}\`;
  const cached = floorplanCache.get(cacheKey);
  if (cached) return cached;

  try {
    let b64 = "";
    // 1. Try direct fetch
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        b64 = await blobToBase64(blob);
      }
    } catch {
      /* try CORS proxy */
    }

    // 2. Try CORS proxy if direct fetch failed
    if (!b64 || !b64.startsWith("data:image/")) {
      const proxies = [
        \`https://corsproxy.io/?\${encodeURIComponent(url)}\`,
        \`https://api.allorigins.win/raw?url=\${encodeURIComponent(url)}\`,
      ];
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const blob = await res.blob();
            b64 = await blobToBase64(blob);
            if (b64.startsWith("data:image/")) break;
          }
        } catch {
          /* try next proxy */
        }
      }
    }

    if (b64 && b64.startsWith("data:image/")) {
      const trimmed = await cropToContent(b64, 0.008);
      const sharp = await sharpenPlan(trimmed);
      floorplanCache.set(cacheKey, sharp);
      return sharp;
    }
  } catch (err) {
    console.error("[prepareFloorplan Error]", err);
  }
  return url;
}`;

const prepareFloorplanNew = `export async function prepareFloorplan(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  const cacheKey = \`\${url}::\${FLOORPLAN_PIPELINE_VERSION}\`;
  
  // 1. Check memory cache
  const cachedMem = floorplanCache.get(cacheKey);
  if (cachedMem) return cachedMem;

  // 2. Check IndexedDB cache
  const cachedIdb = await getIdbFloorplan(cacheKey);
  if (cachedIdb) {
    floorplanCache.set(cacheKey, cachedIdb);
    return cachedIdb;
  }

  try {
    let b64 = "";
    
    // If it is a PDF file, we must render it locally using pdfjs
    if (url.toLowerCase().endsWith(".pdf")) {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], "floorplan.pdf", { type: "application/pdf" });
        b64 = await dynamicPdfFloorplanToDataUrl(file);
      }
    } else {
      // 1. Try direct fetch for images
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          b64 = await blobToBase64(blob);
        }
      } catch {
        /* try CORS proxy */
      }
  
      // 2. Try CORS proxy if direct fetch failed
      if (!b64 || !b64.startsWith("data:image/")) {
        const proxies = [
          \`https://corsproxy.io/?\${encodeURIComponent(url)}\`,
          \`https://api.allorigins.win/raw?url=\${encodeURIComponent(url)}\`,
        ];
        for (const proxyUrl of proxies) {
          try {
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const blob = await res.blob();
              b64 = await blobToBase64(blob);
              if (b64.startsWith("data:image/")) break;
            }
          } catch {
            /* try next proxy */
          }
        }
      }
      
      if (b64 && b64.startsWith("data:image/")) {
        b64 = await cropToFloorplan(b64);
      }
    }

    if (b64 && b64.startsWith("data:image/")) {
      const sharp = await sharpenPlan(b64);
      floorplanCache.set(cacheKey, sharp);
      await saveIdbFloorplan(cacheKey, sharp);
      return sharp;
    }
  } catch (err) {
    console.error("[prepareFloorplan Error]", err);
  }
  return url;
}`;

const cropToFloorplanOldStart = `export async function cropToFloorplan(dataUrl: string): Promise<string> {`;
const cropToFloorplanOldRegex = new RegExp('export async function cropToFloorplan\\(dataUrl: string\\): Promise<string> \\{[\\s\\S]*?\\n\\}\\n');

const newCropToFloorplan = `export async function cropToFloorplan(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (!W || !H) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    return await cropToFloorplanCanvas(canvas);
  } catch {
    return dataUrl;
  }
}

async function cropToFloorplanCanvas(inCanvas: HTMLCanvasElement): Promise<string> {
  try {
    const W = inCanvas.width;
    const H = inCanvas.height;
    
    const ctx = inCanvas.getContext("2d", { willReadFrequently: true })!;
    const image = ctx.getImageData(0, 0, W, H);
    const data = image.data;
    
    const cell = 10;
    const cols = Math.floor(W / cell);
    const rows = Math.floor(H / cell);
    
    const grid = new Uint8Array(rows * cols);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let hasInk = false;
        let rSum = 0, gSum = 0, bSum = 0;
        
        for (let y = 0; y < cell; y++) {
          for (let x = 0; x < cell; x++) {
            const px = (c * cell + x);
            const py = (r * cell + y);
            if (px >= W || py >= H) continue;
            
            const idx = (py * W + px) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            const a = data[idx + 3];
            
            if (a > 100 && (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240)) {
              hasInk = true;
            }
          }
        }
        
        if (!hasInk && (rSum / (cell * cell) < 240 || gSum / (cell * cell) < 240 || bSum / (cell * cell) < 240)) {
          hasInk = true; 
        }
        
        // Clear ink on the extreme outer 5% margin to ensure borders are disconnected from the center
        if (c < cols * 0.05 || c > cols * 0.95 || r < rows * 0.05 || r > rows * 0.95) {
           hasInk = false;
        }
        
        if (hasInk) {
          grid[r * cols + c] = 1;
        }
      }
    }
    
    const dilated = new Uint8Array(rows * cols);
    const DILATE = 6; 
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r * cols + c]) {
          const rMin = Math.max(0, r - DILATE);
          const rMax = Math.min(rows - 1, r + DILATE);
          const cMin = Math.max(0, c - DILATE);
          const cMax = Math.min(cols - 1, c + DILATE);
          for (let rr = rMin; rr <= rMax; rr++) {
            for (let cc = cMin; cc <= cMax; cc++) {
              dilated[rr * cols + cc] = 1;
            }
          }
        }
      }
    }
    
    const visited = new Uint8Array(rows * cols);
    let maxCount = 0;
    const comps = [];
    
    // Destroy any borders by erasing the outer 200 pixels (roughly 20 cells) of the grid
    const marginCells = 20;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < marginCells || r >= rows - marginCells || c < marginCells || c >= cols - marginCells) {
           grid[r * cols + c] = 0;
           dilated[r * cols + c] = 0;
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (dilated[r * cols + c] && !visited[r * cols + c]) {
          let count = 0;
          const comp = [];
          const q = [[r, c]];
          visited[r * cols + c] = 1;
          let head = 0;
          
          while (head < q.length) {
            const [currR, currC] = q[head++];
            if (grid[currR * cols + currC]) {
              comp.push([currR, currC]);
              count++;
            }
            
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            for (const [dr, dc] of dirs) {
              const nr = currR + dr;
              const nc = currC + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (dilated[nr * cols + nc] && !visited[nr * cols + nc]) {
                  visited[nr * cols + nc] = 1;
                  q.push([nr, nc]);
                }
              }
            }
          }
          
          if (count > 0) {
            comps.push({ count, comp });
            if (count > maxCount) maxCount = count;
          }
        }
      }
    }
    
    let bbox = null;
    // Keep all components that have at least 2% of the max component size
    const validComps = comps.filter(c => c.count > maxCount * 0.02);
    
    if (validComps.length > 0) {
      bbox = [validComps[0].comp[0][1], validComps[0].comp[0][0], validComps[0].comp[0][1], validComps[0].comp[0][0]];
      for (const vc of validComps) {
        for (let i = 0; i < vc.comp.length; i++) {
          const [r, c] = vc.comp[i];
          bbox[0] = Math.min(bbox[0], c);
          bbox[1] = Math.min(bbox[1], r);
          bbox[2] = Math.max(bbox[2], c);
          bbox[3] = Math.max(bbox[3], r);
        }
      }
    }
    
    if (!bbox) return inCanvas.toDataURL("image/png");
    
    // Create a heavily dilated mask to erase everything that isn't the floorplan
    const maskGrid = new Uint8Array(rows * cols);
    for (const vc of validComps) {
      for (let i = 0; i < vc.comp.length; i++) {
        const [r, c] = vc.comp[i];
        maskGrid[r * cols + c] = 1;
      }
    }
    
    const dilatedMask = new Uint8Array(rows * cols);
    const MASK_DILATE = 12; // roughly 120 pixels buffer around the floorplan lines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (maskGrid[r * cols + c]) {
          const rMin = Math.max(0, r - MASK_DILATE);
          const rMax = Math.min(rows - 1, r + MASK_DILATE);
          const cMin = Math.max(0, c - MASK_DILATE);
          const cMax = Math.min(cols - 1, c + MASK_DILATE);
          for (let rr = rMin; rr <= rMax; rr++) {
            for (let cc = cMin; cc <= cMax; cc++) {
              dilatedMask[rr * cols + cc] = 1;
            }
          }
        }
      }
    }
    
    const hrImageData = ctx.getImageData(0, 0, W, H);
    const hrData = hrImageData.data;
    for (let y = 0; y < H; y++) {
      const r = Math.floor(y / cell);
      for (let x = 0; x < W; x++) {
        const c = Math.floor(x / cell);
        if (r < rows && c < cols && !dilatedMask[r * cols + c]) {
          const idx = (y * W + x) * 4;
          hrData[idx] = 255;
          hrData[idx+1] = 255;
          hrData[idx+2] = 255;
          hrData[idx+3] = 255;
        }
      }
    }
    ctx.putImageData(hrImageData, 0, 0);

    const pad = Math.round(cell * 4); // Add a 40px padding around the isolated floorplan
    const sx = Math.max(0, bbox[0] * cell - pad);
    const sy = Math.max(0, bbox[1] * cell - pad);
    const sw = Math.min(W - sx, (bbox[2] + 1) * cell - sx + pad);
    const sh = Math.min(H - sy, (bbox[3] + 1) * cell - sy + pad);
    
    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d", { willReadFrequently: true })!;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, sw, sh);
    
    const croppedImageData = ctx.getImageData(sx, sy, sw, sh);
    octx.putImageData(croppedImageData, 0, 0);
    
    return out.toDataURL("image/png");
  } catch {
    return inCanvas.toDataURL("image/png");
  }
}

async function dynamicPdfFloorplanToDataUrl(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  
  const numPages = Math.min(doc.numPages, 2);
  const croppedPages: string[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    // Increase scale for ultra crisp lines (approx 4800px width)
    const scale = Math.min(4800 / base.width, 8);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const cropped = await cropToFloorplanCanvas(canvas);
    croppedPages.push(cropped);
  }
  
  if (croppedPages.length === 1) {
    return croppedPages[0];
  }
  
  const img1 = await loadImage(croppedPages[0]);
  const img2 = await loadImage(croppedPages[1]);
  
  const gap = 200; 
  const finalW = img1.naturalWidth + gap + img2.naturalWidth;
  const finalH = Math.max(img1.naturalHeight, img2.naturalHeight);
  
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = finalW;
  finalCanvas.height = finalH;
  const fctx = finalCanvas.getContext("2d", { willReadFrequently: true })!;
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, finalW, finalH);
  
  const y1 = Math.floor((finalH - img1.naturalHeight) / 2);
  fctx.drawImage(img1, 0, y1);
  
  const y2 = Math.floor((finalH - img2.naturalHeight) / 2);
  fctx.drawImage(img2, img1.naturalWidth + gap, y2);
  
  return finalCanvas.toDataURL("image/png");
}
`;

content = content.replace(prepareFloorplanOld, prepareFloorplanNew);
content = content.replace(cropToFloorplanOldRegex, newCropToFloorplan + '\n');

fs.writeFileSync(fileToImage, content);
console.log('Patched fileToImage.ts successfully.');
