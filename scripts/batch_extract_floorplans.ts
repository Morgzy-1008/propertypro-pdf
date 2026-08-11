/**
 * Batch Floorplan Extractor
 * Processes all PDF floorplans in a folder, removes borders, logos and
 * dimension tables, and saves a clean PNG next to each PDF.
 *
 * Usage: npx.cmd tsx scripts/batch_extract_floorplans.ts
 */
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const INPUT_ROOT = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS';
const OUTPUT_ROOT = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS - EXTRACTED';

interface PDFEntry {
  pdfPath: string;
  outputPng: string;
  isDoubleStorey: boolean;
}

function isDoubleStoreyDir(dirPath: string): boolean {
  const upper = dirPath.toUpperCase();
  return (
    upper.includes('02 - DOUBLE STOREY') ||
    upper.includes('DOUBLE STOREY') ||
    upper.includes('TWO STOREY') ||
    upper.includes('SPLIT LEVEL')
  );
}

function collectPdfs(rootDir: string): PDFEntry[] {
  const entries: PDFEntry[] = [];

  function walk(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        const isDoubleStorey = isDoubleStoreyDir(dir);
        const relative = path.relative(rootDir, fullPath);
        const outputPath = path.join(
          OUTPUT_ROOT,
          path.dirname(relative),
          path.basename(item.name, '.pdf') + '_FLOORPLAN.png'
        );
        entries.push({ pdfPath: fullPath, outputPng: outputPath, isDoubleStorey });
      }
    }
  }

  walk(rootDir);
  return entries;
}

// This entire block is evaluated inside the browser via page.evaluate()
// It defines window.__extractFloorplan() which does all the heavy lifting
const BROWSER_INJECT_SCRIPT = `
(async () => {
  // Load PDF.js from CDN if not already present
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function cropToFloorplanCanvas(inCanvas, isDoubleStorey) {
    const W = inCanvas.width;
    const H = inCanvas.height;
    const ctx = inCanvas.getContext('2d', { willReadFrequently: true });
    
    // Get raw pixel data
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;
    
    // ── Step 1: Whittle out colored pixels (the Hudson logo uses red/green/blue)
    // and replace them with white so they don't pollute ink detection
    for (let i = 0; i < data.length; i += 4) {
      const R = data[i], G = data[i+1], B = data[i+2];
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      const saturation = max === 0 ? 0 : (max - min) / max;
      // If it has meaningful color saturation AND is not dark → it's part of the logo
      if (saturation > 0.25 && max > 80) {
        data[i] = 255; data[i+1] = 255; data[i+2] = 255; // whiten it
      }
    }
    ctx.putImageData(imageData, 0, 0);
    
    // ── Step 2: Build a boolean ink map (any pixel darker than 210 in all channels)
    const inkMap = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i] < 210 && data[i+1] < 210 && data[i+2] < 210) {
          inkMap[y * W + x] = 1;
        }
      }
    }
    
    // ── Step 3: Build row and column ink-density profiles
    // These tell us how many dark pixels are in each row/column
    const rowInk = new Float32Array(H);
    const colInk = new Float32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (inkMap[y * W + x]) {
          rowInk[y]++;
          colInk[x]++;
        }
      }
    }
    
    // ── Step 4: Detect the outer page border rectangle
    // The outer border is nearly full-width / full-height lines near the edges.
    // We want to find them and skip them, focusing on the inner content.
    // Strategy: find the first row/col from each edge that has VERY high ink density
    // (full-width horizontal or full-height vertical lines = border), then skip inward.
    
    // A row is a "full border line" if its ink count > 80% of width
    // A col is a "full border line" if its ink count > 80% of height
    const BORDER_THRESH_ROW = W * 0.4;
    const BORDER_THRESH_COL = H * 0.4;
    
    // Scan from top: find last border-like row in top 15% of page
    let topBorder = 0;
    for (let y = 0; y < H * 0.2; y++) {
      if (rowInk[y] > BORDER_THRESH_ROW) topBorder = y;
    }
    
    // Scan from bottom: find first border-like row in bottom 15% of page
    let bottomBorder = H;
    for (let y = H - 1; y > H * 0.8; y--) {
      if (rowInk[y] > BORDER_THRESH_ROW) { bottomBorder = y; break; }
    }
    
    // Scan from left: find last border-like col in left 10% of page
    let leftBorder = 0;
    for (let x = 0; x < W * 0.15; x++) {
      if (colInk[x] > BORDER_THRESH_COL) leftBorder = x;
    }
    
    // Scan from right: find first border-like col in right 10% of page
    let rightBorder = W;
    for (let x = W - 1; x > W * 0.85; x--) {
      if (colInk[x] > BORDER_THRESH_COL) { rightBorder = x; break; }
    }
    
    // Add a margin of 5px to move past the border line itself
    topBorder = Math.min(topBorder + 5, H * 0.25);
    bottomBorder = Math.max(bottomBorder - 5, H * 0.75);
    leftBorder = Math.min(leftBorder + 5, W * 0.15);
    rightBorder = Math.max(rightBorder - 5, W * 0.85);
    
    // ── Step 5: Within the inner region (past the outer border),
    // Find the tight bounding box of all ink content.
    // But exclude: top 20% of inner region (logo area) and bottom 25% of inner region (dimension table)
    const innerH = bottomBorder - topBorder;
    const innerW = rightBorder - leftBorder;
    const excludeTop = topBorder + innerH * 0.0; // We already cut border; logo is above
    const excludeBottom = bottomBorder - innerH * 0.0; // table is below border
    
    // However the logo is typically ABOVE the floorplan and the table BELOW.
    // After removing the outer border area, the content region should be:
    // logo in the top ~20% of inner region, floorplan in middle, table in bottom ~30%
    // Find content region that spans from FIRST significant ink row to LAST,
    // skipping the logo zone (top 20% of inner) and the table zone (bottom 25% of inner)
    
    // For double storeys: top 48% has logo + title + dimension table + option snippet.
    // The two main floor plans (Ground + First) occupy bottom ~48-95% of inner region.
    // For single storeys: top 22% has logo, bottom 28% has dimension table.
    const logoEndRow = isDoubleStorey
      ? topBorder + Math.round(innerH * 0.48)   // DS: skip top half (logo+table+snippet)
      : topBorder + Math.round(innerH * 0.22);  // SS: skip logo only
    const tableStartRow = isDoubleStorey
      ? bottomBorder - Math.round(innerH * 0.08) // DS: cut notes/copyright at bottom
      : topBorder + Math.round(innerH * 0.72);  // SS: skip dimension table
    
    // Find tight bbox of floorplan ink within the non-logo, non-table zone
    let minX = rightBorder, maxX = leftBorder;
    let minY = tableStartRow, maxY = logoEndRow;
    
    for (let y = logoEndRow; y < tableStartRow; y++) {
      for (let x = leftBorder; x < rightBorder; x++) {
        if (inkMap[y * W + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    // If we found no ink in that region, fall back to the full inner region
    if (minX >= maxX || minY >= maxY) {
      minX = leftBorder; maxX = rightBorder;
      minY = topBorder; maxY = bottomBorder;
    }
    
    // ── Step 6: Generously expand the crop box to ensure we don't cut off
    // any part of the floorplan (Alfresco areas, detached garages, etc.)
    // Expand symmetrically by 2% of the page
    const expandX = Math.round(W * 0.02);
    const expandY = Math.round(H * 0.02);
    
    // Do NOT expand beyond the border region (don't re-include the logo/table)
    minX = Math.max(leftBorder, minX - expandX);
    minY = Math.max(topBorder, minY - expandY);
    maxX = Math.min(rightBorder, maxX + expandX);
    maxY = Math.min(bottomBorder, maxY + expandY);
    
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    
    if (cropW <= 10 || cropH <= 10) {
      // Fallback: return inner region without logo/table
      const fbCanvas = document.createElement('canvas');
      const fbW = Math.round(rightBorder - leftBorder);
      const fbH = Math.round(bottomBorder - topBorder);
      fbCanvas.width = fbW; fbCanvas.height = fbH;
      const fbCtx = fbCanvas.getContext('2d');
      fbCtx.fillStyle = '#ffffff';
      fbCtx.fillRect(0, 0, fbW, fbH);
      fbCtx.drawImage(inCanvas, leftBorder, topBorder, fbW, fbH, 0, 0, fbW, fbH);
      return fbCanvas.toDataURL('image/png');
    }
    
    // ── Step 7: Render the final cropped canvas
    const cropped = document.createElement('canvas');
    cropped.width = Math.round(cropW);
    cropped.height = Math.round(cropH);
    const cctx = cropped.getContext('2d', { willReadFrequently: true });
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, cropW, cropH);
    cctx.drawImage(inCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropped.toDataURL('image/png');
  }

  async function combineFloorplans(url1, url2) {
    const img1 = await loadImage(url1);
    const img2 = await loadImage(url2);
    const GAP = 100;
    const MAX_WIDTH = 8000;
    const totalW = img1.naturalWidth + GAP + img2.naturalWidth;

    let w1 = img1.naturalWidth, h1 = img1.naturalHeight;
    let w2 = img2.naturalWidth, h2 = img2.naturalHeight;

    if (totalW > MAX_WIDTH) {
      const scale = (MAX_WIDTH - GAP) / (w1 + w2);
      w1 = Math.round(w1 * scale); h1 = Math.round(h1 * scale);
      w2 = Math.round(w2 * scale); h2 = Math.round(h2 * scale);
    }

    const finalW = w1 + GAP + w2;
    const finalH = Math.max(h1, h2);
    const c = document.createElement('canvas');
    c.width = finalW; c.height = finalH;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalW, finalH);
    ctx.drawImage(img1, 0, Math.floor((finalH - h1) / 2), w1, h1);
    ctx.drawImage(img2, w1 + GAP, Math.floor((finalH - h2) / 2), w2, h2);
    return c.toDataURL('image/png');
  }

  window.__extractFloorplan = async (pdfBase64, isDoubleStorey) => {
    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    // Double storey PDFs have BOTH floors on page 1 (side by side).
    // We do NOT try to combine multiple pages; instead the DS crop zone handles it.
    const pagesToProcess = 1;

    const croppedUrls = [];
    for (let p = 1; p <= pagesToProcess; p++) {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(6000 / base.width, 10);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const url = await cropToFloorplanCanvas(canvas, isDoubleStorey);
      croppedUrls.push(url);
    }

    if (croppedUrls.length === 1) return croppedUrls[0];
    return await combineFloorplans(croppedUrls[0], croppedUrls[1]);
  };
  
  console.log('__extractFloorplan ready');
})();
`;

async function processPdf(page: Page, entry: PDFEntry, injected: boolean): Promise<boolean> {
  const { pdfPath, outputPng, isDoubleStorey } = entry;

  fs.mkdirSync(path.dirname(outputPng), { recursive: true });

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const resultDataUrl = await page.evaluate(
    async ({ base64, isDouble }: { base64: string; isDouble: boolean }) => {
      return await (window as any).__extractFloorplan(base64, isDouble);
    },
    { base64: pdfBase64, isDouble: isDoubleStorey }
  );

  if (!resultDataUrl || !resultDataUrl.startsWith('data:image/png')) {
    throw new Error('Invalid output from __extractFloorplan');
  }

  const buf = Buffer.from(resultDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(outputPng, buf);
  return true;
}

async function main() {
  const entries = collectPdfs(INPUT_ROOT);
  console.log(`Found ${entries.length} PDFs to process.`);
  console.log(`Output root: ${OUTPUT_ROOT}\n`);

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture browser console for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[Browser Error]', msg.text());
  });

  // Load a blank page and inject our PDF.js + processing helpers
  await page.goto('about:blank');
  
  // Wait for PDF.js script injection by evaluating the setup script
  await page.evaluate(BROWSER_INJECT_SCRIPT);
  
  // Wait for PDF.js worker to load
  await page.waitForTimeout(3000);

  let done = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const label = path.basename(entry.pdfPath);
    const outLabel = path.basename(entry.outputPng);
    try {
      process.stdout.write(`[${done + 1}/${entries.length}] ${label} → ${outLabel} ... `);
      await processPdf(page, entry, true);
      console.log('OK');
      done++;
    } catch (err: any) {
      console.log('FAILED:', err.message);
      errors.push(`${entry.pdfPath}: ${err.message}`);
    }
  }

  await browser.close();

  console.log('\n=== COMPLETE ===');
  console.log(`Successfully processed: ${done}/${entries.length}`);
  if (errors.length > 0) {
    console.log(`\nFailed (${errors.length}):`);
    errors.forEach(e => console.log('  - ' + e));
    const errFile = path.join(OUTPUT_ROOT, 'errors.txt');
    fs.writeFileSync(errFile, errors.join('\n'));
    console.log(`\nError log saved to: ${errFile}`);
  }
}

main().catch(console.error);

