import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

  console.log("Navigating to app...");
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // We exposed prepareFloorplan to window in FlyerForm.tsx
  // We'll call it directly via evaluate to bypass UI complexities.

  const artifactsDir = "C:\\Users\\morga\\.gemini\\antigravity\\brain\\e7db7d94-bd0f-4fcf-90d2-8106e093b42f";

  // Test Burgundy 27
  console.log("Extracting Burgundy 27 via prepareFloorplan...");
  const burgundyUrl = '/floorplans_pdf/Burgundy 27_Classic_RH_01.06.2020.pdf';
  const burgundyDataUrl = await page.evaluate(async (url) => {
    // @ts-ignore
    return await window.prepareFloorplan(url);
  }, burgundyUrl);

  const burgundyBuffer = Buffer.from(burgundyDataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(artifactsDir, 'burgundy_27_ai_crop.png'), burgundyBuffer);
  console.log("Saved burgundy_27_ai_crop.png");

  // Test Raven 55
  console.log("Extracting Raven 55 via prepareFloorplan...");
  const ravenUrl = '/floorplans_pdf/Raven 55 Classic_Brochure_05.06.26.pdf';
  const ravenDataUrl = await page.evaluate(async (url) => {
    // @ts-ignore
    return await window.prepareFloorplan(url);
  }, ravenUrl);

  const ravenBuffer = Buffer.from(ravenDataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(artifactsDir, 'raven_55_ai_crop.png'), ravenBuffer);
  console.log("Saved raven_55_ai_crop.png");

  console.log("Done!");
  await browser.close();
}

run().catch(console.error);
