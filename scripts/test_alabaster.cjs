const { chromium } = require('playwright');
const path = require('path');

async function testAlabaster() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const selects = page.locator('button[role="combobox"]');

  // Select Single Storey (default) and Alabaster
  console.log('Selecting Alabaster design...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  
  // Search or click Alabaster
  await page.locator('div[role="option"]:has-text("Alabaster")').first().click();
  await page.waitForTimeout(1500);

  // Open Facade Library
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);

  // Take screenshot of Facade Library open
  await page.screenshot({ path: path.join(__dirname, '../media_alabaster_library.png') });

  // Click Classic facade
  console.log('Selecting Classic facade for Alabaster...');
  await page.locator('[role="dialog"] button:has-text("Classic")').first().click();
  await page.waitForTimeout(2500);

  // Capture rendered flyer
  await page.screenshot({ path: path.join(__dirname, '../media_alabaster_rendered.png'), fullPage: true });

  await browser.close();
  console.log('Alabaster test completed!');
}

testAlabaster().catch((e) => {
  console.error(e);
  process.exit(1);
});
