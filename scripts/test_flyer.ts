import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  console.log('Navigating to flyer builder...');
  await page.goto('http://localhost:5173/flyer', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000); // Wait for load
  
  // Select Design (e.g., Cobalt)
  console.log('Selecting Single Storey...');
  // The first combobox is Housing Type (Single Storey)
  const designTrigger = page.getByRole('combobox').filter({ hasText: 'Select design' });
  await designTrigger.click();
  await page.waitForTimeout(1000);
  await page.getByRole('option', { name: 'Cobalt', exact: true }).click();
  await page.waitForTimeout(1000);

  // Third combobox is Floorplan (Select a floorplan)
  const floorplanTrigger = page.getByRole('combobox').filter({ hasText: 'Select a floorplan' });
  await floorplanTrigger.click();
  await page.waitForTimeout(1000);
  await page.getByRole('option', { name: 'Cobalt 22', exact: true }).click();
  await page.waitForTimeout(2000); // wait for image to load

  await page.screenshot({ path: 'scripts/screenshot_ss_form.png' });
  console.log('Saved screenshot_ss_form.png');

  // Let's do a double storey: Wisteria 32
  console.log('Selecting Double Storey...');
  const housingTypeTrigger = page.getByRole('combobox').filter({ hasText: 'Single Storey' });
  await housingTypeTrigger.click();
  await page.waitForTimeout(1000);
  await page.getByRole('option', { name: 'Double Storey', exact: true }).click();
  await page.waitForTimeout(1000);

  // Click Design combobox again
  await page.getByRole('combobox').filter({ hasText: 'Select design' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('option', { name: 'Wisteria', exact: true }).click();
  await page.waitForTimeout(1000);

  // Click Floorplan combobox
  await page.getByRole('combobox').filter({ hasText: 'Select a floorplan' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('option', { name: 'Wisteria 32', exact: true }).click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'scripts/screenshot_ds_form.png' });
  console.log('Saved screenshot_ds_form.png');
  
  await browser.close();
})();
