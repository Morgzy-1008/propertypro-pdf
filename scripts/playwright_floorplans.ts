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
      
      let bbox = null;
      const cell = 10;
      const cols = Math.floor(W / cell);
      const rows = Math.floor(H / cell);
      
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
          
          if (hasInk) {
            if (!bbox) bbox = [c, r, c, r];
            else {
              bbox[0] = Math.min(bbox[0], c);
              bbox[1] = Math.min(bbox[1], r);
              bbox[2] = Math.max(bbox[2], c);
              bbox[3] = Math.max(bbox[3], r);
            }
          }
        }
      }
      
      if (!bbox) return inCanvas;
      
      const pad = Math.round(cell * 1.5);
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
    
    // We REMOVED sharpenLineArt completely because it was forcing anti-aliased
    // and light-grey lines to pure white (making them disappear) and making edges jagged.

    return finalCanvas.toDataURL('image/png', 1.0);
  };
`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
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
