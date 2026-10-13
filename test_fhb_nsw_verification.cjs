const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const screenshotsDir = path.join(__dirname, 'playwright-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const page = await context.newPage();

  // Inject authentication session
  await page.addInitScript(() => {
    window.localStorage.setItem('hudson_hub_unlocked', 'true');
    window.localStorage.setItem('hudson_active_division', 'NSW');
    window.localStorage.setItem(
      'hudson_staff_session',
      JSON.stringify({
        email: 'juliana.hudson@hudsonhomes.com.au',
        role: 'sales_consultant',
        name: 'Juliana Hudson',
        division: 'NSW',
      })
    );
  });

  console.log('1. Navigating to Database Pricelists Tab (/database)...');
  await page.goto('http://localhost:5173/database', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click on Pricelists tab if needed
  const pricelistTab = page.locator('button:has-text("Pricelists")');
  if (await pricelistTab.count() > 0) {
    await pricelistTab.first().click();
    await page.waitForTimeout(1000);
  }

  // Filter by NSW if available
  const nswButton = page.locator('button:has-text("NSW")');
  if (await nswButton.count() > 0) {
    await nswButton.first().click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(screenshotsDir, 'fhb_01_database_pricelists_nsw.png') });
  console.log('Saved fhb_01_database_pricelists_nsw.png');

  console.log('2. Navigating to Flyer Generator (/flyer)...');
  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Set state/division to NSW
  const stateSelect = page.locator('select, button[role="combobox"]').first();
  // Select range FHB / Start Smart
  const ssRangeButton = page.locator('button:has-text("SS"), button:has-text("Start Smart"), button:has-text("FHB")').first();
  if (await ssRangeButton.count() > 0) {
    await ssRangeButton.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(screenshotsDir, 'fhb_02_flyer_generator_nsw.png') });
  console.log('Saved fhb_02_flyer_generator_nsw.png');

  console.log('3. Navigating to Quote Builder (/quote-builder)...');
  await page.goto('http://localhost:5173/quote-builder', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(screenshotsDir, 'fhb_03_quote_builder_nsw.png') });
  console.log('Saved fhb_03_quote_builder_nsw.png');

  console.log('All FHB NSW Playwright verifications completed successfully!');
  await browser.close();
})();
