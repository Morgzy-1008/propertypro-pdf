const { chromium } = require('playwright');
const path = require('path');

async function testAlabasterAi() {
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

  // Select Dual-Oc
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Dual-Oc")').first().click();
  await page.waitForTimeout(800);

  // Select Alabaster 31
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Alabaster")').first().click();
  await page.waitForTimeout(1500);

  // Open Facade Library
  console.log('Opening Facade Library...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(600);

  // Click the Classic facade card
  console.log('Selecting Classic facade for Alabaster...');
  await page.locator('[role="dialog"] button:has-text("Classic")').first().click();

  // Wait for AI generation or facade loading to complete (up to 20s)
  console.log('Waiting for AI outpaint or image load...');
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(__dirname, '../media_alabaster_ai_success.png'), fullPage: true });
  await browser.close();
  console.log('Done!');
}

testAlabasterAi().catch(console.error);
