import { chromium } from "playwright";
import fs from "fs";

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR QUOTING TOOL V2 ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[BROWSER ERROR]: ${msg.text()}`);
    } else {
      console.log(`[BROWSER]: ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[PAGE EXCEPTION]: ${err.message}`);
  });

  try {
    // 1. Setup Auth credentials
    console.log("Setting up authentication in browser...");
    await page.goto("http://localhost:5173/");
    await page.evaluate(() => {
      localStorage.setItem("hudson_hub_unlocked", "true");
      sessionStorage.setItem("hudson_hub_unlocked", "true");
      localStorage.setItem("hudson_quoting_mode", "v2");
      localStorage.setItem(
        "hudson_staff_session",
        JSON.stringify({
          id: "morgan-hales",
          name: "Morgan Hales",
          email: "morgan.hales@hudsonhomes.com.au",
          role: "admin",
          division: "QLD",
          state: "QLD",
        })
      );
    });

    // 2. Navigate to quote-builder
    console.log("Navigating to http://localhost:5173/quote-builder...");
    await page.goto("http://localhost:5173/quote-builder");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // If redirected to /hub, click "Launch Quoting"
    if (page.url().includes("/hub")) {
      console.log("At /hub, clicking Launch Quoting...");
      const launchBtn = page.locator("a:has-text('Launch Quoting'), button:has-text('Launch Quoting')").first();
      await launchBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    console.log(`Current URL: ${page.url()}`);

    // Verify V2 Express mode is active
    console.log("Checking for V2 Express Flow header...");
    await page.waitForSelector("text=Quoting Tool V2", { timeout: 10000 });
    console.log("✓ Found Quoting Tool V2 header!");

    // --- STEP 1: CLIENT DETAILS (NIGHT MODE) ---
    console.log("Testing Step 1: Client Details (Night mode)...");
    const demoBtn = page.locator("button:has-text('Quick Demo Client')");
    await demoBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step1_client_night.png", fullPage: false });
    console.log("✓ Captured v2_step1_client_night.png");

    // Toggle Light Mode
    console.log("Toggling Light mode for Step 1...");
    const themeBtn = page.locator("button:has(.lucide-sun), button:has(.lucide-moon)").first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "v2_step1_client_light.png", fullPage: false });
      console.log("✓ Captured v2_step1_client_light.png");
      // Toggle back to Night mode
      await themeBtn.click();
      await page.waitForTimeout(500);
    }

    // Advance to Step 2: Floor Plan
    console.log("Clicking Continue to Floor Plan...");
    const continueBtn1 = page.locator("button:has-text('Continue to Floor Plan')").first();
    await continueBtn1.click();
    await page.waitForTimeout(800);

    // --- STEP 2: FLOOR PLAN ---
    console.log("Testing Step 2: Floor Plan...");
    await page.waitForSelector("text=Which house design are we quoting?", { timeout: 5000 });

    // Test Modified Plan Tab first to verify UI
    console.log("Testing Modified Plan Engine tab in Step 2...");
    const modTabBtn = page.locator("button:has-text('Modified Plan Engine')");
    await modTabBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "v2_step2_modified_engine_night.png", fullPage: false });
    console.log("✓ Captured v2_step2_modified_engine_night.png");

    // Switch back to Standard collection tab
    const stdTabBtn = page.locator("button:has-text('Standard Collection')");
    await stdTabBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step2_floorplan_night.png", fullPage: false });
    console.log("✓ Captured v2_step2_floorplan_night.png");

    // Search and Select Amber 21
    console.log("Searching for Amber 21 in design search...");
    const searchInput = page.locator("input[placeholder='Search design name...']");
    await searchInput.fill("Amber 21");
    await page.waitForTimeout(500);

    console.log("Selecting Amber 21 design card...");
    const amberH4 = page.locator("h4:has-text('Amber 21')").first();
    await amberH4.click({ force: true });
    await page.waitForTimeout(1000);

    // --- STEP 3: INCLUSIONS ---
    console.log("Testing Step 3: Inclusions...");
    await page.waitForSelector("text=Choose an Inclusions Level", { timeout: 8000 });

    // Select H2 Design Inclusions
    const h2Title = page.locator("h3:has-text('Design Collection')").first();
    await h2Title.click({ force: true });
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step3_inclusions_night.png", fullPage: false });
    console.log("✓ Captured v2_step3_inclusions_night.png");

    // Advance to Step 4: Site Costs
    console.log("Advancing to Step 4: Site Costs...");
    const continueBtn3 = page.locator("button:has-text('Continue to Site Costs')").first();
    await continueBtn3.click();
    await page.waitForTimeout(800);

    // --- STEP 4: SITE COSTS ---
    console.log("Testing Step 4: Site Costs...");
    await page.waitForSelector("text=Estimate Site Costs & Earthworks", { timeout: 5000 });

    // Click "Typical Suburban Estate" preset
    const presetTitle = page.locator("h4:has-text('Typical Suburban Estate')").first();
    await presetTitle.click({ force: true });
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step4_site_costs_night.png", fullPage: false });
    console.log("✓ Captured v2_step4_site_costs_night.png");

    // Advance to Step 5: Variations
    console.log("Advancing to Step 5: Variations...");
    const continueBtn4 = page.locator("button:has-text('Continue to Variations')").first();
    await continueBtn4.click();
    await page.waitForTimeout(800);

    // --- STEP 5: VARIATIONS ---
    console.log("Testing Step 5: Variations...");
    await page.waitForSelector("text=Floor Plan Inclusions & Variations", { timeout: 5000 });

    // Toggle 2740mm ceilings and Ducted AC
    const ceilingCard = page.locator("h4:has-text('2740mm Ground Floor')").first();
    if (await ceilingCard.isVisible()) {
      await ceilingCard.click({ force: true });
      await page.waitForTimeout(400);
    }

    const acCard = page.locator("h4:has-text('Ducted Inverter Air Conditioning')").first();
    if (await acCard.isVisible()) {
      await acCard.click({ force: true });
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: "v2_step5_variations_night.png", fullPage: false });
    console.log("✓ Captured v2_step5_variations_night.png");

    // Advance to Step 6: Review & Export
    console.log("Advancing to Step 6: Review & Export...");
    const reviewBtn = page.locator("button:has-text('Review & Export Estimate')").first();
    await reviewBtn.click();
    await page.waitForTimeout(800);

    // --- STEP 6: REVIEW & EXPORT ---
    console.log("Testing Step 6: Review & Export...");
    await page.waitForSelector("text=Total Turnkey Estimated Investment", { timeout: 5000 });

    await page.screenshot({ path: "v2_step6_review_night.png", fullPage: false });
    console.log("✓ Captured v2_step6_review_night.png");

    // Light mode review screenshot
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "v2_step6_review_light.png", fullPage: false });
      console.log("✓ Captured v2_step6_review_light.png");
      await themeBtn.click();
      await page.waitForTimeout(500);
    }

    // --- STEP 7: TEST MODE SWITCHER (V2 <-> CLASSIC DETAILED STUDIO) ---
    console.log("Testing toggle to Detailed Studio...");
    const detailedBtn = page.locator("button:has-text('Detailed Studio')").first();
    await detailedBtn.click({ force: true });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "v2_mode_switch_classic.png", fullPage: false });
    console.log("✓ Captured v2_mode_switch_classic.png (Detailed Studio active)");

    // Switch back to V2 Express Flow
    console.log("Switching back to V2 Express Flow...");
    const v2Btn = page.locator("button:has-text('V2 Express Flow')").first();
    await v2Btn.click({ force: true });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "v2_mode_switch_back_v2.png", fullPage: false });
    console.log("✓ Captured v2_mode_switch_back_v2.png (V2 Express active again)");

    console.log("=== ALL PLAYWRIGHT VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("Playwright test error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
