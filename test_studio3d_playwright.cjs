const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runStudio3dVerification() {
  const screenshotsDir = path.join(__dirname, 'playwright-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  // Inject session auth before load
  await page.addInitScript(() => {
    localStorage.setItem('hudson_hub_unlocked', 'true');
    localStorage.setItem(
      'hudson_staff_session',
      JSON.stringify({
        staffId: 'HUD-MGR-01',
        name: 'Morgan',
        role: 'Managing Director & Design Architect',
        department: 'Executive Design Studio',
        unlockedAt: new Date().toISOString(),
      })
    );
  });

  console.log('1. Navigating to http://localhost:5173/3d-studio...');
  await page.goto('http://localhost:5173/3d-studio', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: Blank Aesthetic State
  const shot1 = path.join(screenshotsDir, '01_blank_studio_aesthetic.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved: ${shot1}`);

  // 2. Click Tiffany 22 Standard Master Floorplan
  console.log('2. Clicking Tiffany 22 floorplan card...');
  const tiffanyBtn = page.locator('button:has-text("Tiffany 22")').first();
  await tiffanyBtn.click();
  await page.waitForTimeout(2500);

  // Screenshot 2: Tiffany 22 3D Model with internal walls & centered camera
  const shot2 = path.join(screenshotsDir, '02_tiffany22_loaded_internal_walls.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved: ${shot2}`);

  // 3. Switch to Jasper 26 via design dropdown
  console.log('3. Selecting Jasper 26 (Executive Master)...');
  await page.locator('select').first().selectOption('jasper-26');
  await page.waitForTimeout(2500);

  // Screenshot 2b: Jasper 26 with all 4 bedrooms and theatre
  const shot2b = path.join(screenshotsDir, '02b_jasper26_all_bedrooms_theatre.png');
  await page.screenshot({ path: shot2b, fullPage: false });
  console.log(`Saved: ${shot2b}`);

  // 4. Click "Change Plan" to test reset back to blank
  console.log('4. Clicking Change Plan to verify reset to blank state...');
  const changePlanBtn = page.locator('button:has-text("Change Plan")');
  await changePlanBtn.click();
  await page.waitForTimeout(1500);

  // Screenshot 3: Returned to Blank State
  const shot3 = path.join(screenshotsDir, '03_returned_to_blank_state.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved: ${shot3}`);

  // 5. Load Juliana Modified Plan
  console.log('5. Loading Juliana Modified Floorplan (Cinema + Barn Door)...');
  const julianaBtn = page.locator('button:has-text("Explore Juliana Modified Plan")');
  await julianaBtn.click();
  await page.waitForTimeout(2500);

  // Screenshot 4: Juliana Custom Plan in 3D (Centered)
  const shot4 = path.join(screenshotsDir, '04_juliana_custom_cinema_barndoor.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log(`Saved: ${shot4}`);

  // 6. Switch to CAD Architectural Elevations Tab
  console.log('6. Switching to Architectural Elevations (CAD) tab...');
  const elevationsTab = page.locator('button:has-text("Architectural Elevations (CAD)")');
  await elevationsTab.click();
  await page.waitForTimeout(1500);

  // Screenshot 5: Architectural Elevations CAD drawings
  const shot5 = path.join(screenshotsDir, '05_cad_architectural_elevations.png');
  await page.screenshot({ path: shot5, fullPage: false });
  console.log(`Saved: ${shot5}`);

  // 7. Switch to Customizer & Schedule Tab
  console.log('7. Switching to Customizer & Schedule tab...');
  const customizerTab = page.locator('button:has-text("Customizer & Schedule")');
  await customizerTab.click();
  await page.waitForTimeout(1500);

  // Screenshot 6: Customizer, Schedules & Wall Network Verification Banner
  const shot6 = path.join(screenshotsDir, '06_schedule_and_customizer.png');
  await page.screenshot({ path: shot6, fullPage: false });
  console.log(`Saved: ${shot6}`);

  console.log('All Playwright tests completed successfully!');
  await browser.close();
}

runStudio3dVerification().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});
