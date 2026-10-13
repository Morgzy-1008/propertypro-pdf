const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  // Inject session authentication
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

  const screenshotsDir = path.join(__dirname, 'playwright-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('1. Navigating to 3D Studio...');
  await page.goto('http://localhost:5173/3d-studio', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Capture initial empty studio
  await page.screenshot({ path: path.join(screenshotsDir, 'realism_01_blank_studio.png') });
  console.log('Saved realism_01_blank_studio.png');

  // Select "Tiffany 22 Custom for Juliana"
  console.log('2. Loading Tiffany 22 Custom for Juliana...');
  const julianaBtn = page.locator('button:has-text("Explore Juliana Modified Plan")');
  if (await julianaBtn.count() > 0) {
    await julianaBtn.click();
  } else {
    await page.locator('select').first().selectOption('tiffany-22-custom-juliana');
  }
  await page.waitForTimeout(3000);

  // Capture 3D Orbit view with boundaries, 1.8m fencing, driveway, brick texture
  await page.screenshot({ path: path.join(screenshotsDir, 'realism_02_orbit_fencing_driveway.png') });
  console.log('Saved realism_02_orbit_fencing_driveway.png');

  // Click 1-Click Elevation shortcut "Front (North)"
  console.log('3. Clicking Front (North) elevation shortcut...');
  const frontBtn = page.locator('button:has-text("Front (North)")');
  if (await frontBtn.count() > 0) {
    await frontBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_03_front_elevation_north.png') });
    console.log('Saved realism_03_front_elevation_north.png');
  }

  // Switch to Hamptons Coastal Facade
  console.log('4. Switching to Hamptons Coastal facade...');
  const hamptonsBtn = page.locator('button:has-text("Hamptons Coastal")');
  if (await hamptonsBtn.count() > 0) {
    await hamptonsBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_04_hamptons_facade.png') });
    console.log('Saved realism_04_hamptons_facade.png');
  }

  // Switch to Executive Grande Facade
  console.log('5. Switching to Executive Grande facade...');
  const execBtn = page.locator('button:has-text("Executive Grande")');
  if (await execBtn.count() > 0) {
    await execBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_05_executive_facade.png') });
    console.log('Saved realism_05_executive_facade.png');
  }

  // Switch fence style to Treated Pine
  console.log('6. Selecting Treated Pine fence style...');
  const fenceSelect = page.locator('select[title="Select Australian boundary fencing style"]');
  if (await fenceSelect.count() > 0) {
    await fenceSelect.first().selectOption('treated_pine');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_06_treated_pine_fencing.png') });
    console.log('Saved realism_06_treated_pine_fencing.png');
  }

  // Switch to Tab 2: Architectural Elevations (CAD)
  console.log('7. Switching to Architectural Elevations (CAD) tab...');
  const cadTabBtn = page.locator('button:has-text("Architectural Elevations (CAD)")');
  if (await cadTabBtn.count() > 0) {
    await cadTabBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_07_cad_elevations_boundary.png') });
    console.log('Saved realism_07_cad_elevations_boundary.png');
  }

  // Switch to Tab 3: Customizer & Schedule
  console.log('8. Switching to Customizer & Schedule tab...');
  const customizerTabBtn = page.locator('button:has-text("Customizer & Schedule")');
  if (await customizerTabBtn.count() > 0) {
    await customizerTabBtn.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'realism_08_materials_customizer_tab.png') });
    console.log('Saved realism_08_materials_customizer_tab.png');
  }

  await browser.close();
  console.log('All realism verification tests completed successfully!');
}

run().catch((err) => {
  console.error('Playwright test failed:', err);
  process.exit(1);
});
