import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_ROOT = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS';

const BROWSER_INJECT_SCRIPT = `
(async () => {
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

  window.__extractFloorplan = async (pdfBase64) => {
    const results = [];
    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const textContent = await page.getTextContent();

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const originalDrawImage = ctx.drawImage;
      ctx.drawImage = function(...args) {
        if (args[0] instanceof HTMLImageElement || args[0] instanceof ImageBitmap) {
          return; 
        }
        return originalDrawImage.apply(this, args);
      };

      await page.render({ canvasContext: ctx, viewport }).promise;

      const getCanvasRect = (item) => {
        const pdfX = item.transform[4];
        const pdfY = item.transform[5];
        const pdfW = item.width;
        const pdfH = item.height || item.transform[3];
        const [cvsX1, cvsY1] = viewport.convertToViewportPoint(pdfX, pdfY);
        const [cvsX2, cvsY2] = viewport.convertToViewportPoint(pdfX + pdfW, pdfY + pdfH);
        return {
          x: Math.min(cvsX1, cvsX2),
          y: Math.min(cvsY1, cvsY2),
          w: Math.abs(cvsX2 - cvsX1),
          h: Math.abs(cvsY2 - cvsY1),
          text: item.str
        };
      };

      const rects = textContent.items.map(getCanvasRect);
      
      const fillWhite = (rect, margin) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rect.x - margin, rect.y - margin, rect.w + margin * 2, rect.h + margin * 2);
      };

      const totalAreaText = rects.find(r => r.text.toLowerCase().includes('total area'));
      if (totalAreaText) {
        let chartMinX = totalAreaText.x, chartMaxX = totalAreaText.x + totalAreaText.w;
        let chartMinY = totalAreaText.y, chartMaxY = totalAreaText.y + totalAreaText.h;
        rects.forEach(r => {
          if (Math.abs(r.x - totalAreaText.x) < 250 && Math.abs(r.y - totalAreaText.y) < 400) {
            chartMinX = Math.min(chartMinX, r.x);
            chartMaxX = Math.max(chartMaxX, r.x + r.w);
            chartMinY = Math.min(chartMinY, r.y);
            chartMaxY = Math.max(chartMaxY, r.y + r.h);
          }
        });
        fillWhite({ x: chartMinX, y: chartMinY, w: chartMaxX - chartMinX, h: chartMaxY - chartMinY }, 80);
      }

      const logoText = rects.find(r => r.text.toLowerCase().includes('hudson') || r.text.toLowerCase().includes('homes'));
      if (logoText) {
        let logoMinX = logoText.x, logoMaxX = logoText.x + logoText.w;
        let logoMinY = logoText.y, logoMaxY = logoText.y + logoText.h;
        rects.forEach(r => {
          if (Math.abs(r.x - logoText.x) < 200 && Math.abs(r.y - logoText.y) < 200) {
            logoMinX = Math.min(logoMinX, r.x);
            logoMaxX = Math.max(logoMaxX, r.x + r.w);
            logoMinY = Math.min(logoMinY, r.y);
            logoMaxY = Math.max(logoMaxY, r.y + r.h);
          }
        });
        fillWhite({ x: logoMinX, y: logoMinY, w: logoMaxX - logoMinX, h: logoMaxY - logoMinY }, 80);
      }

      const titleText = rects.find(r => r.text.toLowerCase().includes('brochure') || r.text.toLowerCase().includes('classic') || r.text.toLowerCase().includes('copyright'));
      if (titleText) {
        fillWhite(titleText, 100);
      }

      // Erase Options
      const optionsTexts = rects.filter(r => r.text.toLowerCase().includes('option'));
      optionsTexts.forEach(opt => {
        let optMinX = opt.x, optMaxX = opt.x + opt.w;
        let optMinY = opt.y, optMaxY = opt.y + opt.h;
        rects.forEach(r => {
          if (Math.abs(r.x - opt.x) < 400 && Math.abs(r.y - opt.y) < 400) {
            optMinX = Math.min(optMinX, r.x);
            optMaxX = Math.max(optMaxX, r.x + r.w);
            optMinY = Math.min(optMinY, r.y);
            optMaxY = Math.max(optMaxY, r.y + r.h);
          }
        });
        fillWhite({ x: optMinX, y: optMinY, w: optMaxX - optMinX, h: optMaxY - optMinY }, 120);
      });

      const W = canvas.width;
      const H = canvas.height;

      // Find the bounds of the actual floorplan text
      let fpMinX = W, fpMaxX = 0, fpMinY = H, fpMaxY = 0;
      const dimRegex = /^\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?$/i;
      rects.forEach(r => {
        let isFp = false;
        // Floorplan text is usually room names and dimensions
        if (dimRegex.test(r.text.trim()) || /^(Bed|Kitchen|Dining|Family|Lounge|Living|Garage|Alfresco|Porch|Balcony|Robe|WIR|Ens|Bath|L'dry|Study|Entry|Meals|Theatre|Games|Void|Store|Pantry|Gallery|Nook|Scullery|Office)/i.test(r.text.trim())) {
          isFp = true;
        }
        // Exclude text that belongs to the details chart
        const totalAreaText = rects.find(rt => rt.text.toLowerCase().includes('total area'));
        if (totalAreaText && Math.abs(r.x - totalAreaText.x) < 300 && Math.abs(r.y - totalAreaText.y) < 500) isFp = false;

        // Exclude text that belongs to Options
        if (optionsTexts.some(opt => Math.abs(r.x - opt.x) < 400 && Math.abs(r.y - opt.y) < 400)) isFp = false;
        
        if (isFp) {
          fpMinX = Math.min(fpMinX, r.x);
          fpMaxX = Math.max(fpMaxX, r.x + r.w);
          fpMinY = Math.min(fpMinY, r.y);
          fpMaxY = Math.max(fpMaxY, r.y + r.h);
        }
      });

      if (fpMinX > fpMaxX) {
        console.log('No floorplan found on this page.');
        continue;
      }

      // We have the rough bounds of the text. Expand by a generous margin to capture the walls and roofs.
      // But ensure we don't go out of canvas bounds.
      const margin = 200; // 200 pixels at 2.0x scale
      const cropX = Math.max(0, fpMinX - margin);
      const cropY = Math.max(0, fpMinY - margin);
      const cropW = Math.min(W - cropX, (fpMaxX - fpMinX) + margin * 2);
      const cropH = Math.min(H - cropY, (fpMaxY - fpMinY) + margin * 2);

      // Create a new canvas just for the cropped floorplan
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      // Fill with white background
      croppedCtx.fillStyle = '#ffffff';
      croppedCtx.fillRect(0, 0, cropW, cropH);
      
      // Draw the cropped portion from the original canvas
      croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      results.push(croppedCanvas.toDataURL('image/png'));
    }
    
    return results;
  };
  
  console.log('__extractFloorplan ready');
})();
`;

async function processPdf(page: Page, pdfPath: string, outFilename: string) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const results = await page.evaluate(
    async ({ base64 }: { base64: string }) => {
      return await (window as any).__extractFloorplan(base64);
    },
    { base64: pdfBase64 }
  ) as string[];

  results.forEach((res, i) => {
    const base64Data = res.includes(',') ? res.split(',')[1] : res;
    fs.writeFileSync(`${outFilename}_page${i + 1}.png`, base64Data, 'base64');
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log('[Browser]', msg.text());
  });

  await page.goto('about:blank');
  await page.evaluate(BROWSER_INJECT_SCRIPT);
  await page.waitForTimeout(1000);

  console.log('Browser ready, running tests...');

  try {
    const testFiles = [
      '02 - DOUBLE STOREY/BURGUNDY 27/Burgundy 27_Classic_RH_01.06.2020.pdf',
      'Raven 55 Classic_Brochure_05.06.26.pdf'
    ];
    for (const file of testFiles) {
      const pdfPath = file.includes('Raven') ? path.join(__dirname, '../public/floorplans_pdf', file) : path.join(INPUT_ROOT, file);
      const baseName = file.includes('Raven') ? 'raven55_text' : 'burgundy27_text';
      console.log(`Processing ${baseName}...`);
      await processPdf(page, pdfPath, baseName);
    }
  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
