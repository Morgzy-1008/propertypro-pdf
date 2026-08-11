/**
 * Raw render: dumps all pages of a PDF as PNG without any cropping for layout analysis
 */
import { chromium } from 'playwright';
import * as fs from 'fs';

const RAW_SCRIPT = `
(async () => {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  window.__renderRaw = async (pdfBase64) => {
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const results = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, vp.width, vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      results.push({ page: p, width: vp.width, height: vp.height, data: canvas.toDataURL('image/png') });
    }
    return results;
  };
  console.log('raw render ready');
})();
`;

async function main() {
  const pdfPath = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS\\02 - DOUBLE STOREY\\BURGUNDY 27\\Burgundy 27_Classic_RH_01.06.2020.pdf';
  const buf = fs.readFileSync(pdfPath);
  const b64 = buf.toString('base64');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[Browser]', msg.type(), msg.text()));
  await page.goto('about:blank');
  await page.evaluate(RAW_SCRIPT);
  await page.waitForTimeout(4000);

  const results: Array<{ page: number; width: number; height: number; data: string }> = await page.evaluate(
    async (base64: string) => (window as any).__renderRaw(base64),
    b64
  );

  for (const r of results) {
    const fname = `burgundy27_raw_page${r.page}.png`;
    const outBuf = Buffer.from(r.data.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(fname, outBuf);
    console.log(`Page ${r.page}: ${r.width}x${r.height} → ${fname}`);
  }

  await browser.close();
}

main().catch(console.error);
