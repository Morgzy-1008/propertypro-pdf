const { chromium } = require('playwright');
const path = require('path');

async function testRaven45() {
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

  // Select Dual-Oc -> Raven 45
  console.log('Selecting Dual-Oc -> Raven 45...');
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Dual-Oc")').first().click();
  await page.waitForTimeout(600);

  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Raven 45")').first().click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_raven45_full.png'), fullPage: true });

  await browser.close();
  console.log('Raven 45 test completed successfully!');
}

testRaven45().catch((e) => {
  console.error(e);
  process.exit(1);
});
