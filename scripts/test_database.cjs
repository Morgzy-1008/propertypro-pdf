const { chromium } = require('playwright');
const path = require('path');

async function testDatabase() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

  await page.goto('http://localhost:5173/database', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // If redirected to auth, authenticate
  if (page.url().includes('/auth')) {
    await page.fill('input[type="email"]', 'morgan.hales@hudsonhomes.com.au');
    await page.fill('input[type="password"]', 'MorganHales2025!');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:5173/database', { waitUntil: 'networkidle' });
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../media_verify_database.png'), fullPage: true });

  // Click on Import Lot List button if present
  const importBtn = page.locator('button:has-text("Import")');
  if (await importBtn.count() > 0) {
    await importBtn.first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, '../media_verify_database_import_dialog.png') });
  }

  await browser.close();
  console.log('Database test complete!');
}

testDatabase().catch(console.error);
