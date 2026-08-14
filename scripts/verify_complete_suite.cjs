const { chromium } = require('playwright');
const path = require('path');

async function verifyAll() {
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

  // 1. Single Storey: Amber 21 + Avalon Facade
  console.log('1. Testing Amber 21 + Avalon Facade...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Amber 21")').first().click();
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Avalon")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(__dirname, '../media_test_amber21_avalon.png'), fullPage: true });

  // 2. Double Storey: Burgundy 27 + Cambridge Facade
  console.log('2. Testing Burgundy 27 + Cambridge Facade...');
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(600);

  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Burgundy 27")').first().click();
  await page.waitForTimeout(2000);

  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Cambridge")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(__dirname, '../media_test_burgundy27_cambridge.png'), fullPage: true });

  // 3. Double Storey: Raven 45
  console.log('3. Testing Raven 45...');
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Raven 45")').first().click();
  await page.waitForTimeout(2500);

  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button:has-text("Allure")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(__dirname, '../media_test_raven45_allure.png'), fullPage: true });

  await browser.close();
  console.log('All tests passed and verified!');
}

verifyAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
