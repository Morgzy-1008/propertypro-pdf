const { chromium } = require('playwright');
const path = require('path');

async function testDoubleStorey() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const selects = page.locator('button[role="combobox"]');

  // Select Double Storey -> Burgundy 27
  console.log('Selecting Double Storey -> Burgundy 27...');
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(600);

  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Burgundy 27")').first().click();
  await page.waitForTimeout(1500);

  // Open Facade Library
  console.log('Opening Facade Library...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);

  // Click Ascot
  console.log('Clicking Ascot facade...');
  await page.locator('[role="dialog"] button:has-text("Ascot")').first().click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_burgundy27_ascot.png'), fullPage: true });

  // Select Raven 45
  console.log('Selecting Raven 45...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Raven 45")').first().click();
  await page.waitForTimeout(2000);

  // Open Facade Library and select Cambridge
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Cambridge")').first().click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_raven45_cambridge.png'), fullPage: true });

  await browser.close();
  console.log('Double Storey test completed successfully!');
}

testDoubleStorey().catch((e) => {
  console.error(e);
  process.exit(1);
});
