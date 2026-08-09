import fs from 'fs';
import path from 'path';
import { createCanvas, Canvas, CanvasRenderingContext2D, Image, ImageData } from 'canvas';

// Polyfill for pdfjs to be able to render embedded raster images
(global as any).Image = Image;
(global as any).ImageData = ImageData;

// Require pdfjs after polyfills since ES6 imports are hoisted
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const INPUT_DIR = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'floorplans');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sharpenLineArt(image: any, w: number, h: number) {
  const p = image.data;
  const WHITE = 232;
  const BLACK = 70;
  for (let i = 0; i < p.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = p[i + c];
      if (v >= WHITE) p[i + c] = 255;
      else if (v <= BLACK) p[i + c] = 0;
      else p[i + c] = Math.round(((v - BLACK) / (WHITE - BLACK)) ** 1.25 * 255);
    }
    p[i + 3] = 255;
  }
}

function cropToFloorplanCanvas(inCanvas: Canvas): Canvas {
  const W = inCanvas.width;
  const H = inCanvas.height;
  
  const ctx = inCanvas.getContext('2d');
  const image = ctx.getImageData(0, 0, W, H);
  const data = image.data;

  const THRESHOLD = 242;
  const ink = new Uint8Array(W * H);
  const rowInk = new Uint32Array(H);
  const colInk = new Uint32Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 16) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < THRESHOLD) {
        ink[y * W + x] = 1;
        rowInk[y]++;
        colInk[x]++;
      }
    }
  }

  // Drop full-page rules
  for (let y = 0; y < H; y++) {
    if (rowInk[y] > W * 0.55) for (let x = 0; x < W; x++) ink[y * W + x] = 0;
  }
  for (let x = 0; x < W; x++) {
    if (colInk[x] > H * 0.55) for (let y = 0; y < H; y++) ink[y * W + x] = 0;
  }

  // Block grid + dilation
  const cell = Math.max(4, Math.round(Math.min(W, H) / 260));
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const mass = new Uint32Array(gw * gh);
  for (let y = 0; y < H; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < W; x++) {
      if (ink[y * W + x]) mass[gy * gw + Math.floor(x / cell)]++;
    }
  }
  const minCell = Math.max(2, Math.round(cell * cell * 0.004));
  const filled = new Uint8Array(gw * gh);
  for (let i = 0; i < mass.length; i++) filled[i] = mass[i] >= minCell ? 1 : 0;

  const r = Math.max(2, Math.round(gw * 0.018));
  const dil = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!filled[gy * gw + gx]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = gy + dy;
        if (ny < 0 || ny >= gh) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx;
          if (nx < 0 || nx >= gw) continue;
          dil[ny * gw + nx] = 1;
        }
      }
    }
  }

  const seen = new Uint8Array(gw * gh);
  let bestMass = -1;
  let bbox: [number, number, number, number] | null = null;
  const stack: number[] = [];
  for (let s = 0; s < dil.length; s++) {
    if (!dil[s] || seen[s]) continue;
    stack.length = 0;
    stack.push(s);
    seen[s] = 1;
    let m = 0;
    let x0 = gw;
    let x1 = -1;
    let y0 = gh;
    let y1 = -1;
    while (stack.length) {
      const c = stack.pop()!;
      const cx = c % gw;
      const cy = Math.floor(c / gw);
      if (filled[c]) {
        m += mass[c];
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy;
        if (cy > y1) y1 = cy;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const n = ny * gw + nx;
          if (dil[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    if (m > bestMass && x1 >= x0) {
      bestMass = m;
      bbox = [x0, y0, x1, y1];
    }
  }
  if (!bbox) return inCanvas;

  const pad = Math.round(cell * 1.5);
  const sx = Math.max(0, bbox[0] * cell - pad);
  const sy = Math.max(0, bbox[1] * cell - pad);
  const sw = Math.min(W - sx, (bbox[2] + 1) * cell - sx + pad);
  const sh = Math.min(H - sy, (bbox[3] + 1) * cell - sy + pad);
  if (sw < W * 0.05 || sh < H * 0.05) return inCanvas;

  const out = createCanvas(sw, sh);
  const octx = out.getContext('2d');
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, sw, sh);
  
  const croppedImageData = ctx.getImageData(sx, sy, sw, sh);
  octx.putImageData(croppedImageData, 0, 0);
  
  const oImageData = octx.getImageData(0, 0, sw, sh);
  sharpenLineArt(oImageData, sw, sh);
  octx.putImageData(oImageData, 0, 0);
  
  return out;
}

const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  },
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

async function processPdf(filePath: string, outPath: string) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ 
    data,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    disableFontFace: true
  }).promise;

  const numPages = doc.numPages;
  const croppedPages = [];

  for (let i = 1; i <= Math.min(numPages, 2); i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3600 / base.width, 5);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ 
      canvasContext: ctx as any, 
      viewport,
      canvasFactory: NodeCanvasFactory 
    }).promise;
    
    const cropped = cropToFloorplanCanvas(canvas);
    croppedPages.push(cropped);
  }

  let finalCanvas: Canvas;
  if (croppedPages.length === 1) {
    finalCanvas = croppedPages[0];
  } else {
    const p1 = croppedPages[0];
    const p2 = croppedPages[1];
    const gap = 200; 
    const finalW = p1.width + gap + p2.width;
    const finalH = Math.max(p1.height, p2.height);
    
    finalCanvas = createCanvas(finalW, finalH);
    const fctx = finalCanvas.getContext('2d');
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, finalW, finalH);
    
    try {
      const y1 = Math.floor((finalH - p1.height) / 2);
      fctx.putImageData(p1.getContext('2d').getImageData(0,0,p1.width,p1.height), 0, y1);
      const y2 = Math.floor((finalH - p2.height) / 2);
      fctx.putImageData(p2.getContext('2d').getImageData(0,0,p2.width,p2.height), p1.width + gap, y2);
    } catch (e: any) {
      console.error('Error drawing p1 or p2: ' + e.message);
      throw e;
    }
  }
  
  // Sharpen Plan using levels stretch to ensure good print contrast (like `sharpenPlan` in fileToImage)
  const finalCtx = finalCanvas.getContext('2d');
  const imgData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const outData = new Uint8ClampedArray(imgData.data);
  const w = finalCanvas.width;
  const h = finalCanvas.height;
  
  const amount = 0.9;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            sum += imgData.data[((y + dy) * w + (x + dx)) * 4 + c];
          }
        }
        const blur = sum / 9;
        outData[i + c] = imgData.data[i + c] + amount * (imgData.data[i + c] - blur);
      }
    }
  }

  const lo = 28;
  const hi = 150;
  for (let i = 0; i < outData.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = outData[i + c];
      outData[i + c] = v <= lo ? 0 : v >= hi ? 255 : ((v - lo) / (hi - lo)) * 255;
    }
  }

  // Use the raw canvas context to create an ImageData and put it back
  const newImgData = finalCtx.createImageData(w, h);
  newImgData.data.set(outData);
  finalCtx.putImageData(newImgData, 0, 0);

  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
}

function getAllPdfs(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllPdfs(filePath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

async function main() {
  const files = getAllPdfs(INPUT_DIR);
  console.log(`Found ${files.length} PDFs to process.`);
  
  let count = 0;
  for (const filePath of files) {
    const basename = path.basename(filePath, '.pdf');
    const outPath = path.join(OUTPUT_DIR, `${basename}.png`);
    
    try {
      await processPdf(filePath, outPath);
      count++;
      console.log(`[${count}/${files.length}] Processed ${basename}`);
    } catch (err: any) {
      console.error(`Error processing ${basename}: ${err.stack}`);
    }
  }
  
  console.log('Done!');
}

main().catch(console.error);
