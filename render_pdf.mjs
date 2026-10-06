import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const pdfBytes = fs.readFileSync('test_juliana/media_1791240996688.pdf');
  const base64 = pdfBytes.toString('base64');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head>
  <body style="margin:0; padding:0; background:white;">
    <div id="canvases"></div>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      async function renderAll(b64) {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for(let i=0; i<raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
        const container = document.getElementById('canvases');
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.id = 'page-' + i;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          container.appendChild(canvas);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        return doc.numPages;
      }
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);
  const numPages = await page.evaluate(async (b64) => {
    return await window.renderAll(b64);
  }, base64);
  console.log('Pages rendered in browser:', numPages);

  for (let i = 1; i <= numPages; i++) {
    const el = await page.$('#page-' + i);
    if (el) {
      await el.screenshot({ path: 'test_juliana/page_' + i + '.png' });
      console.log('Saved page_' + i + '.png');
    }
  }
  await browser.close();
}

main().catch(console.error);
