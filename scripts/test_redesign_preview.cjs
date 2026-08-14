const { chromium } = require('playwright');
const path = require('path');

async function testAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Capture 1-Page Express
  await page.screenshot({ path: path.join(__dirname, '../media_test_express_current.png'), fullPage: true });

  // 2. Switch to 2-Page Showcase
  await page.locator('button:has-text("2-Page Showcase")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_test_showcase_current.png'), fullPage: true });

  await browser.close();
  console.log('Current screenshots captured.');
}

testAll().catch(console.error);
