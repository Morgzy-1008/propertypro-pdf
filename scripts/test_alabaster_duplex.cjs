const { chromium } = require('playwright');
const path = require('path');

async function testAlabasterDuplex() {
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

  // 1. Select Dual-Oc housing type
  console.log('1. Selecting Dual-Oc housing type...');
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Dual-Oc")').first().click();
  await page.waitForTimeout(800);

  // 2. Select Alabaster 31
  console.log('2. Selecting Alabaster 31...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Alabaster")').first().click();
  await page.waitForTimeout(1500);

  // 3. Open Facade Library
  console.log('3. Opening Facade Library for Alabaster...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '../media_alabaster_dialog.png') });

  // 4. Click Classic facade
  console.log('4. Selecting Classic facade...');
  await page.locator('[role="dialog"] button:has-text("Classic")').first().click();
  await page.waitForTimeout(2500);

  // 5. Take screenshot of rendered flyer
  await page.screenshot({ path: path.join(__dirname, '../media_alabaster_duplex_rendered.png'), fullPage: true });

  await browser.close();
  console.log('Alabaster duplex test completed successfully!');
}

testAlabasterDuplex().catch((e) => {
  console.error(e);
  process.exit(1);
});
