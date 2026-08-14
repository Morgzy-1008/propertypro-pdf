const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Helper to select design
  async function selectHousingAndDesign(housingTypeLabel, designName) {
    console.log(`Selecting Housing Type: ${housingTypeLabel}, Design: ${designName}...`);
    // Click housing type select
    const selects = page.locator('button[role="combobox"]');
    
    // Housing type is the first or second combobox
    const housingSelect = selects.nth(0);
    await housingSelect.click();
    await page.waitForTimeout(300);
    const housingOption = page.locator(`div[role="option"]:has-text("${housingTypeLabel}")`);
    if (await housingOption.count() > 0) {
      await housingOption.first().click();
      await page.waitForTimeout(600);
    }

    // Design is the second combobox
    const designSelect = page.locator('button[role="combobox"]').nth(1);
    await designSelect.click();
    await page.waitForTimeout(300);
    const designOption = page.locator(`div[role="option"]:has-text("${designName}")`);
    if (await designOption.count() > 0) {
      await designOption.first().click();
      await page.waitForTimeout(3500); // allow PDF render + enhanceFloorplan
    }
  }

  // 1. Test Amber 21
  await selectHousingAndDesign('Single Storey', 'Amber 21');
  const flyer1 = page.locator('.aspect-\\[210\\/297\\], [data-testid="flyer-preview"], .bg-white.shadow-2xl').first();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_amber21_full.png'), fullPage: true });

  // 2. Test Burgundy 27 (Double Storey)
  await selectHousingAndDesign('Double Storey', 'Burgundy 27');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_burgundy27_full.png'), fullPage: true });

  // 3. Test Raven 45 (Double Storey from newest batch)
  await selectHousingAndDesign('Double Storey', 'Raven 45');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_raven45_full.png'), fullPage: true });

  await browser.close();
  console.log('Verification finished! Screenshots captured.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
