import { chromium } from 'playwright';

async function run() {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[Browser]', msg.text()));
  page.on('pageerror', err => console.log('[Browser Error]', err));
  
  // Navigate to local dev server
  await page.goto('http://localhost:5176/flyer');
  
  console.log('Waiting for the page to load...');
  // Wait for the combobox for single storey designs
  await page.waitForSelector('text=Select design');
  
  console.log('Selecting a single storey floorplan (ArrowDown)...');
  await page.click('text=Select design');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  
  console.log('Waiting for the floorplan to process and load...');
  // Wait a few seconds for the IDB logic, pdf.js extraction, and canvas manipulation to happen
  await page.waitForTimeout(10000);
  
  console.log('Taking a screenshot of the single storey flyer...');
  await page.screenshot({ path: 'test_flyer_single.png' });
  
  console.log('Now selecting a double storey floorplan (ArrowDown)...');
  // Change housing type first
  await page.click('text=Single Storey');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000);
  await page.click('text=Select design');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  
  console.log('Waiting for the double storey floorplan to process and load (both floors!)...');
  // Wait for processing
  await page.waitForTimeout(10000);
  
  console.log('Taking a screenshot of the double storey flyer...');
  await page.screenshot({ path: 'test_flyer_double.png' });
  
  console.log('Done! Check test_flyer_single.png and test_flyer_double.png');
  await browser.close();
}

run().catch(console.error);
