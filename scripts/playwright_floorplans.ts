import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'floorplans');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getPdfFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await getPdfFiles(filePath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

const BROWSER_SCRIPT = `
  window.processBase64Pdf = async (base64Data) => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const doc = await loadingTask.promise;
    
    const numPages = Math.min(doc.numPages, 2);
    const croppedPages = [];

    // --- HELPER LOGIC (SAME AS fileToImage.ts) ---
    function cropToFloorplanCanvas(inCanvas) {
      const W = inCanvas.width;
      const H = inCanvas.height;
      
      const ctx = inCanvas.getContext('2d');
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
      
      console.log('Grid WxH:', cols, 'x', rows, 'Max Count:', maxCount, 'Valid Comps:', validComps.length, 'BBox:', bbox);
      
      if (!bbox) return inCanvas;
      
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
      
      const out = document.createElement('canvas');
      out.width = sw;
      out.height = sh;
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, sw, sh);
      
      const croppedImageData = ctx.getImageData(sx, sy, sw, sh);
      octx.putImageData(croppedImageData, 0, 0);
      
      return out;
    }

    function sharpenLineArt(imageData, w, h) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 200) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; 
        } else {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; 
        }
      }
    }

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      // Increase scale for ultra crisp lines (approx 4800px width)
      const scale = Math.min(4800 / base.width, 8);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const cropped = cropToFloorplanCanvas(canvas);
      croppedPages.push(cropped);
    }

    let finalCanvas;
    if (croppedPages.length === 1) {
      finalCanvas = croppedPages[0];
    } else {
      const p1 = croppedPages[0];
      const p2 = croppedPages[1];
      const gap = 200; 
      const finalW = p1.width + gap + p2.width;
      const finalH = Math.max(p1.height, p2.height);
      
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const fctx = finalCanvas.getContext('2d');
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, finalW, finalH);
      
      const y1 = Math.floor((finalH - p1.height) / 2);
      fctx.drawImage(p1, 0, y1);
      
      const y2 = Math.floor((finalH - p2.height) / 2);
      fctx.drawImage(p2, p1.width + gap, y2);
    }
    
    // Apply contrast enhancement to make light grey lines darker and crisper
    const fctx2 = finalCanvas.getContext('2d');
    const fData = fctx2.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
    const data = fData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      if (avg < 240) {
        // Significantly darken grey lines to almost black
        const factor = 0.4;
        data[i] = Math.max(0, data[i] * factor);
        data[i+1] = Math.max(0, data[i+1] * factor);
        data[i+2] = Math.max(0, data[i+2] * factor);
        if (data[i+3] > 0) data[i+3] = Math.min(255, data[i+3] + 100);
      }
    }
    fctx2.putImageData(fData, 0, 0);

    return finalCanvas.toDataURL('image/png', 1.0);
  };
`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage(); page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('about:blank');
  
  // Inject PDF.js
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js' });
  await page.evaluate(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  });

  // Inject our processing function
  await page.addScriptTag({ content: BROWSER_SCRIPT });

  const files = await getPdfFiles(INPUT_DIR);
  console.log(`Found ${files.length} PDFs to process.`);
  
  let count = 0;
  for (const file of files) {
    const basename = path.basename(file, '.pdf');
    // Extract base name for website linking (e.g. Amber 21)
    const match = basename.match(/^([a-zA-Z\s]+\d+)\b/i);
    const finalName = match ? match[1].trim().toUpperCase() : basename.toUpperCase();
    
    const outPath = path.join(OUTPUT_DIR, finalName + '.png');
    
    try {
      const buffer = fs.readFileSync(file);
      const base64 = buffer.toString('base64');
      
      const dataUrl = await page.evaluate(async (b64) => {
        return await (window as any).processBase64Pdf(b64);
      }, base64);
      
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
      
      count++;
      console.log(`[${count}/${files.length}] Processed ${finalName} -> ${basename}.pdf`);
    } catch (e: any) {
      console.error(`Error processing ${basename}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("Done!");
}

main().catch(console.error);
