const { chromium } = require('playwright');
const path = require('path');

async function verifyAll() {
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

  // 1. Amber 21 + Avalon Facade (1-Page Express)
  console.log('1. Testing Amber 21 + Avalon Facade (1-Page Express)...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Amber 21")').first().click();
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Avalon")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_1page_amber21.png'), fullPage: true });

  // 2. Double Storey Burgundy 27 + Ascot Facade (1-Page Express)
  console.log('2. Testing Burgundy 27 + Ascot Facade (1-Page Express)...');
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(600);

  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Burgundy 27")').first().click();
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Ascot")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_1page_burgundy27.png'), fullPage: true });

  // 3. 2-Page Showcase Booklet with Burgundy 27
  console.log('3. Testing 2-Page Showcase Booklet...');
  await page.locator('button:has-text("2-Page Showcase")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_2page_showcase.png'), fullPage: true });

  // 4. House Only Template
  console.log('4. Testing House Only Template...');
  await page.locator('button:has-text("House Only")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_house_only.png'), fullPage: true });

  await browser.close();
  console.log('Verification suite completed successfully!');
}

verifyAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
