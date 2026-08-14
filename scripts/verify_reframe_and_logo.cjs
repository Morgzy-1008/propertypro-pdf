const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('1. Loading flyer page...');
  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const selects = page.locator('button[role="combobox"]');

  // Select Double Storey
  await selects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Double Storey")').first().click();
  await page.waitForTimeout(600);

  // Select Burgundy 27
  await selects.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('div[role="option"]:has-text("Burgundy 27")').first().click();
  await page.waitForTimeout(600);

  // Click Browse facade library
  console.log('Opening Facade Library...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(800);

  // Click Ascot facade
  console.log('Selecting Ascot facade...');
  await page.locator('[role="dialog"] button:has-text("Ascot")').first().click();

  // Wait for AI generation
  console.log('Waiting for AI generation...');
  for (let i = 0; i < 25; i++) {
    const isBusy = await page.locator('text=GENERATING AI FACADE RENDER').count();
    const isReBusy = await page.locator('text=RE-GENERATING AI RENDER').count();
    if (isBusy === 0 && isReBusy === 0 && i >= 3) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(__dirname, '../media_verify_ascot_reframe.png'), fullPage: true });

  // Open Facade Library again and choose Mantra (Single Garage) or Mantra
  console.log('Selecting Mantra facade...');
  await page.locator('button:has-text("Browse facade library")').click();
  await page.waitForTimeout(800);

  // Untick filter if needed or click any Mantra button
  const mantraBtn = page.locator('[role="dialog"] button:has-text("Mantra")').first();
  if (await mantraBtn.count() > 0) {
    await mantraBtn.click();
    for (let i = 0; i < 25; i++) {
      const isBusy = await page.locator('text=GENERATING AI FACADE RENDER').count();
      const isReBusy = await page.locator('text=RE-GENERATING AI RENDER').count();
      if (isBusy === 0 && isReBusy === 0 && i >= 3) break;
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '../media_verify_mantra_reframe.png'), fullPage: true });
  }

  console.log('Testing 2-Page Showcase template...');
  await page.locator('button:has-text("2-Page Showcase")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_showcase_reframe.png'), fullPage: true });

  console.log('Testing Welcome Hub page...');
  await page.goto('http://localhost:5173/hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_hub_logo.png'), fullPage: true });

  console.log('Testing Auth page...');
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_auth_logo.png'), fullPage: true });

  await browser.close();
  console.log('All tests completed successfully!');
}

run().catch(console.error);
