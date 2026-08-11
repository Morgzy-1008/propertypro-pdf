import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('FAILED:', request.url(), request.failure()?.errorText));
    page.on('response', response => {
      if (response.url().includes('.pdf') || response.url().includes('worker')) {
        console.log('RESPONSE:', response.url(), response.status());
      }
    });
    
    await page.goto('http://localhost:5173/cropper', { waitUntil: 'networkidle' });
    
    // Click Alabaster 31
    await page.locator('button', { hasText: 'Alabaster 31' }).first().click();
    
    // Wait for PDF to load
    await page.waitForTimeout(10000);
    
    // Take screenshot
    await page.screenshot({ path: 'cropper_test_alabaster31.png' });
    console.log("Screenshot saved to cropper_test_alabaster31.png");
    
    // Check if there are any alerts (like "Could not load PDF")
    page.on('dialog', async dialog => {
      console.log('Dialog opened:', dialog.message());
      await dialog.dismiss();
    });
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
})();
