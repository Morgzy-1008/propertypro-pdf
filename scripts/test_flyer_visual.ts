import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/');
  
  // Wait for the flyer to load
  await page.waitForTimeout(5000); // give it time to render images
  
  const outPath = path.join(process.cwd(), 'flyer_screenshot.png');
  await page.screenshot({ path: outPath, fullPage: true });
  
  console.log(`Screenshot saved to ${outPath}`);
  await browser.close();
}

main().catch(console.error);
