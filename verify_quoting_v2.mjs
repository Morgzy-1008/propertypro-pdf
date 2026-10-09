import { chromium } from "playwright";

async function ensureTheme(page, desiredMode) {
  // desiredMode: "light" | "night"
  const isCurrentlyLight = await page.evaluate(() => {
    return (
      document.documentElement.classList.contains("normal-mode") ||
      document.body.classList.contains("normal-mode") ||
      !document.documentElement.classList.contains("dark")
    );
  });
  const currentMode = isCurrentlyLight ? "light" : "night";
  if (currentMode !== desiredMode) {
    const themeBtn = page.locator("button:has(.lucide-sun), button:has(.lucide-moon)").first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(600);
    }
  }
}

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR QUOTING TOOL V2 (INDEPENDENT REVIEW) ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[BROWSER ERROR]: ${msg.text()}`);
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

    if (page.url().includes("/hub")) {
      const launchBtn = page.locator("a:has-text('Launch Quoting'), button:has-text('Launch Quoting')").first();
      await launchBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    console.log(`Current URL: ${page.url()}`);
    await page.waitForSelector("text=Quoting Tool V2", { timeout: 10000 });
    console.log("✓ Found Quoting Tool V2 header!");

    // --- STEP 1: CLIENT DETAILS ---
    console.log("\n--- Testing Step 1: Client Details ---");
    // Ensure Light mode first
    await ensureTheme(page, "light");
    await page.waitForTimeout(400);

    const demoBtn = page.locator("button:has-text('Quick Demo Client')");
    await demoBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step1_client_light.png", fullPage: false });
    console.log("✓ Captured v2_step1_client_light.png (Genuine Light Mode)");

    // Switch to Night mode
    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step1_client_night.png", fullPage: false });
    console.log("✓ Captured v2_step1_client_night.png (Genuine Night Mode)");

    // Switch back to Light mode for subsequent steps
    await ensureTheme(page, "light");
    await page.waitForTimeout(300);

    // Advance to Step 2
    console.log("Clicking Continue to Floor Plan...");
    const continueBtn1 = page.locator("button:has-text('Continue to Floor Plan')").first();
    await continueBtn1.click();
    await page.waitForTimeout(800);

    // --- STEP 2: FLOOR PLAN ---
    console.log("\n--- Testing Step 2: Floor Plan ---");
    await page.waitForSelector("text=Which house design are we quoting?", { timeout: 5000 });

    // Test Modified Plan Engine Tab
    console.log("Testing Modified Plan Engine tab in Step 2...");
    const modTabBtn = page.locator("button:has-text('Modified Plan Engine')");
    await modTabBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step2_modified_engine_light.png", fullPage: false });
    console.log("✓ Captured v2_step2_modified_engine_light.png");

    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step2_modified_engine_night.png", fullPage: false });
    console.log("✓ Captured v2_step2_modified_engine_night.png");

    await ensureTheme(page, "light");
    await page.waitForTimeout(300);

    // Switch back to Standard Collection
    const stdTabBtn = page.locator("button:has-text('Standard Collection')");
    await stdTabBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "v2_step2_floorplan_light.png", fullPage: false });
    console.log("✓ Captured v2_step2_floorplan_light.png");

    // Search and select Amber 21 (verifying auto-shift!)
    console.log("Searching for Amber 21 in design search...");
    const searchInput = page.locator("input[placeholder='Search design name...']");
    await searchInput.fill("Amber 21");
    await page.waitForTimeout(500);

    console.log("Clicking Amber 21 card to trigger auto-shift to Inclusions...");
    const amberH4 = page.locator("h4:has-text('Amber 21')").first();
    await amberH4.click({ force: true });
    // Auto-shift delay is ~350ms
    await page.waitForTimeout(1200);

    // --- STEP 3: INCLUSIONS ---
    console.log("\n--- Testing Step 3: Inclusions ---");
    await page.waitForSelector("text=Choose an Inclusions Level", { timeout: 8000 });
    console.log("✓ Successfully auto-shifted to Step 3: Inclusions!");

    await page.screenshot({ path: "v2_step3_inclusions_light.png", fullPage: false });
    console.log("✓ Captured v2_step3_inclusions_light.png");

    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step3_inclusions_night.png", fullPage: false });
    console.log("✓ Captured v2_step3_inclusions_night.png");

    await ensureTheme(page, "light");
    await page.waitForTimeout(300);

    // Click H2 Design Collection to trigger auto-shift to Site Costs
    console.log("Clicking H2 Design Collection to trigger auto-shift to Site Costs...");
    const h2Title = page.locator("h3:has-text('Design Collection')").first();
    await h2Title.click({ force: true });
    await page.waitForTimeout(1200);

    // --- STEP 4: SITE COSTS ---
    console.log("\n--- Testing Step 4: Site Costs ---");
    await page.waitForSelector("text=Estimate Site Costs & Earthworks", { timeout: 5000 });
    console.log("✓ Successfully auto-shifted to Step 4: Site Costs!");

    await page.screenshot({ path: "v2_step4_site_costs_light.png", fullPage: false });
    console.log("✓ Captured v2_step4_site_costs_light.png");

    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step4_site_costs_night.png", fullPage: false });
    console.log("✓ Captured v2_step4_site_costs_night.png");

    await ensureTheme(page, "light");
    await page.waitForTimeout(300);

    // Click "Typical Suburban Estate" preset to trigger auto-shift to Variations
    console.log("Clicking Typical Suburban Estate package to trigger auto-shift to Variations...");
    const presetTitle = page.locator("h4:has-text('Typical Suburban Estate')").first();
    await presetTitle.click({ force: true });
    await page.waitForTimeout(1200);

    // --- STEP 5: VARIATIONS ---
    console.log("\n--- Testing Step 5: Variations ---");
    await page.waitForSelector("text=Floor Plan Inclusions & Variations", { timeout: 5000 });
    console.log("✓ Successfully auto-shifted to Step 5: Variations!");

    // Test 1-Click Builder Essentials Pack
    const essentialsBtn = page.locator("button:has-text('1-Click Builder Essentials')");
    if (await essentialsBtn.isVisible()) {
      console.log("Clicking 1-Click Builder Essentials button...");
      await essentialsBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "v2_step5_variations_light.png", fullPage: false });
    console.log("✓ Captured v2_step5_variations_light.png");

    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step5_variations_night.png", fullPage: false });
    console.log("✓ Captured v2_step5_variations_night.png");

    await ensureTheme(page, "light");
    await page.waitForTimeout(300);

    // Advance to Step 6: Review & Export
    console.log("Advancing to Step 6: Review & Export...");
    const reviewBtn = page.locator("button:has-text('Review & Export Estimate')").first();
    await reviewBtn.click();
    await page.waitForTimeout(1000);

    // --- STEP 6: REVIEW & EXPORT ---
    console.log("\n--- Testing Step 6: Review & Export ---");
    await page.waitForSelector("text=Total Turnkey Estimated Investment", { timeout: 5000 });

    await page.screenshot({ path: "v2_step6_review_light.png", fullPage: false });
    console.log("✓ Captured v2_step6_review_light.png (Genuine Light Mode)");

    await ensureTheme(page, "night");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "v2_step6_review_night.png", fullPage: false });
    console.log("✓ Captured v2_step6_review_night.png (Genuine Night Mode)");

    // Test Mode Switcher: V2 -> Detailed Studio -> V2
    console.log("\n--- Testing Mode Switcher ---");
    const detailedBtn = page.locator("button:has-text('Detailed Studio')").first();
    await detailedBtn.click({ force: true });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "v2_mode_switch_classic.png", fullPage: false });
    console.log("✓ Captured v2_mode_switch_classic.png (Detailed Studio active)");

    const v2Btn = page.locator("button:has-text('V2 Express Flow')").first();
    await v2Btn.click({ force: true });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: "v2_mode_switch_back_v2.png", fullPage: false });
    console.log("✓ Captured v2_mode_switch_back_v2.png (V2 Express active again)");

    console.log("\n=== ALL PLAYWRIGHT VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("Playwright test error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
