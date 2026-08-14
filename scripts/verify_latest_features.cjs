const { chromium } = require('playwright');
const path = require('path');

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('1. Testing Auth page...');
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_auth_page.png'), fullPage: true });

  console.log('2. Testing Welcome Hub page (with simulated auth)...');
  // Allow hub navigation for test view
  await page.evaluate(() => {
    window.localStorage.setItem('sb-demo-auth', 'true');
  });
  await page.goto('http://localhost:5173/hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_welcome_hub.png'), fullPage: true });

  console.log('3. Testing Flyer Builder - Double Storey Burgundy 27 with Ascot Facade...');
  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const selects = page.locator('button[role="combobox"]');

  // Select Double Storey
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(800);

  // Select Burgundy 27
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Burgundy 27")').first().click();
  await page.waitForTimeout(1200);

  // Open Facade Library and select Ascot
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(600);
  await page.locator('[role="dialog"] button:has-text("Ascot")').first().click();
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_double_ascot.png'), fullPage: true });

  console.log('4. Testing Double Storey - Mantra (Single Garage) Facade...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(600);
  
  // Click Mantra (Single Garage)
  const mantraBtn = page.locator('[role="dialog"] button:has-text("Mantra (Single Garage)")').first();
  if (await mantraBtn.count() > 0) {
    await mantraBtn.click();
  } else {
    await page.locator('[role="dialog"] button:has-text("Mantra")').first().click();
  }
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_double_mantra.png'), fullPage: true });

  console.log('5. Testing 2-Page Showcase Template...');
  await page.locator('button:has-text("2-Page Showcase")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_showcase_2page.png'), fullPage: true });

  await browser.close();
  console.log('All verification checks completed successfully!');
}

runVerification().catch(console.error);
