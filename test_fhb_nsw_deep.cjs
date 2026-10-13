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

  // Inject authentication session for NSW
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

  console.log('1. Testing Database Pricelists Tab for NSW FHB...');
  await page.goto('http://localhost:5173/database', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click on "Price Lists (FHB & 2026)" tab
  const pricelistTab = page.locator('button:has-text("Price Lists")');
  if (await pricelistTab.count() > 0) {
    await pricelistTab.first().click();
    await page.waitForTimeout(1000);
  }

  // Click NSW pill
  const nswFilter = page.locator('button:has-text("NSW")');
  if (await nswFilter.count() > 0) {
    await nswFilter.first().click();
    await page.waitForTimeout(800);
  }

  // Search Amber 21
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.count() > 0) {
    await searchInput.fill('Amber 21');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'fhb_nsw_database_amber21.png') });
    console.log('Saved fhb_nsw_database_amber21.png');

    // Search Carolina 22
    await searchInput.fill('Carolina 22');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'fhb_nsw_database_carolina22.png') });
    console.log('Saved fhb_nsw_database_carolina22.png');
  }

  console.log('2. Testing Flyer Generator for Amber 21 NSW FHB...');
  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Select "FHB / Start Smart" inclusion range button
  const fhbRangeBtn = page.locator('button:has-text("FHB / Start Smart"), button:has-text("Start Smart")').first();
  if (await fhbRangeBtn.count() > 0) {
    await fhbRangeBtn.click();
    await page.waitForTimeout(800);
  }

  // Select design dropdown
  const designSelectTrigger = page.locator('button[role="combobox"]:has-text("Select design")').first();
  if (await designSelectTrigger.count() > 0) {
    await designSelectTrigger.click();
    await page.waitForTimeout(600);
    const amberOpt = page.locator('[role="option"]:has-text("Amber 21")').first();
    if (await amberOpt.count() > 0) {
      await amberOpt.click();
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: path.join(screenshotsDir, 'fhb_nsw_flyer_amber21.png') });
  console.log('Saved fhb_nsw_flyer_amber21.png');

  console.log('All detailed FHB Playwright tests completed!');
  await browser.close();
})();
