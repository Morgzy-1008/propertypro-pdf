const { chromium } = require('playwright');
const path = require('path');

async function testMantraSingle() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const selects = page.locator('button[role="combobox"]');

  // Select Double Storey
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(800);

  // Open Facade Library
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(600);

  // Click Mantra Single Garage
  console.log('Selecting Mantra (Single Garage)...');
  await page.locator('[role="dialog"] button:has-text("Mantra (Single Garage)")').first().click();

  // Wait for AI generation to complete
  console.log('Waiting for AI generation to complete...');
  for (let i = 0; i < 20; i++) {
    const isBusy = await page.locator('text=GENERATING AI FACADE RENDER').count();
    const isReBusy = await page.locator('text=RE-GENERATING AI RENDER').count();
    if (isBusy === 0 && isReBusy === 0 && i >= 3) {
      console.log('Done at iteration', i);
      break;
    }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_mantra_single_ai.png'), fullPage: true });
  await browser.close();
}

testMantraSingle().catch(console.error);
