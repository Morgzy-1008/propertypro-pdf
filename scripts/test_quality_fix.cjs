const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. Check Amber 21 Single Storey Floorplan & Facade
  console.log('Selecting Amber 21...');
  await page.waitForSelector('input[placeholder*="Search designs"], input[placeholder*="Search"], select', { timeout: 10000 });
  
  // Try selecting design through UI
  const designSelect = page.locator('select').first();
  if (await designSelect.count() > 0) {
    // Fill form or click dropdowns
  }

  // Let's capture the main flyer view
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, '../media_test_initial_flyer.png'), fullPage: true });

  console.log('Testing floorplan rendering...');
  // Trigger Amber 21
  const searchInput = page.locator('input').first();
  await searchInput.fill('Amber 21');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, '../media_test_amber21.png'), fullPage: true });

  // Test Burgundy 27 (Double Storey)
  await searchInput.fill('Burgundy 27');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, '../media_test_burgundy27.png'), fullPage: true });

  await browser.close();
  console.log('Test completed successfully.');
})();
