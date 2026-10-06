import { chromium } from "playwright";
import fs from "fs";
import path from "path";

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR TIFFANY 22 CUSTOM (JULIANA) ===");
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

    // 3. Click "2. House Design" tab
    console.log("Switching to '2. House Design' step...");
    const houseDesignTab = page.locator("button:has-text('House Design')").first();
    await houseDesignTab.waitFor({ state: "visible", timeout: 10000 });
    await houseDesignTab.click();
    await page.waitForTimeout(800);

    // 4. Click "Modified Design" button
    console.log("Clicking 'Modified Design' mode...");
    const modifiedModeBtn = page.locator("button:has-text('Modified Design')").first();
    await modifiedModeBtn.waitFor({ state: "visible", timeout: 10000 });
    await modifiedModeBtn.click();
    await page.waitForTimeout(800);

    const fileInput = page.locator("#modified-floorplan-input");

    // 5. Upload test_juliana/page_1.png
    const julianaFilePath = path.resolve(process.cwd(), "test_juliana", "page_1.png");
    console.log(`Uploading ${julianaFilePath}...`);
    await fileInput.setInputFiles(julianaFilePath);

    // 6. Handle Base Design Confirmation Modal if prompted
    console.log("Checking for Base Design Confirmation Modal...");
    try {
      const confirmBtn = page.locator("button:has-text('Yes, Confirm')").first();
      await confirmBtn.waitFor({ state: "visible", timeout: 25000 });
      console.log("Confirming identified design...");
      await confirmBtn.click();
    } catch {
      console.log("No design confirmation modal prompt; directly progressing to analysis.");
    }

    // 7. Wait for Modified Plan Review Modal
    console.log("Waiting for Modified Plan Review Modal (Tab 1)...");
    const tab1Btn = page.locator("button:has-text('1. Structural Footprint')").first();
    await tab1Btn.waitFor({ state: "visible", timeout: 60000 });
    await tab1Btn.click();
    await page.waitForTimeout(1000);

    const reviewModalDialog = page.locator("div[role='dialog']").last();
    const modalText = await reviewModalDialog.innerText();
    console.log("\n--- Tab 1 Text Output Snippet ---");
    console.log(modalText.slice(0, 800));

    // Capture Tab 1 Screenshot
    const s1 = "playwright_juliana_tab1_footprint.png";
    await reviewModalDialog.screenshot({ path: s1 });
    console.log(`✅ Saved screenshot: ${s1}`);

    // Switch to Tab 2: Internal Sweep & Rooms
    console.log("\nSwitching to Tab 2: Internal Sweep & Rooms...");
    const tab2Btn = page.locator("button:has-text('2. Internal Sweep')").first();
    await tab2Btn.waitFor({ state: "visible", timeout: 10000 });
    await tab2Btn.click();
    await page.waitForTimeout(800);
    const tab2Text = await reviewModalDialog.innerText();
    console.log("--- Tab 2 Text Output Snippet ---");
    console.log(tab2Text.slice(0, 800));
    const s2 = "playwright_juliana_tab2_rooms.png";
    await reviewModalDialog.screenshot({ path: s2 });
    console.log(`✅ Saved screenshot: ${s2}`);

    // Switch to Tab 3: Doors & Windows (80% Credit Schedule)
    console.log("\nSwitching to Tab 3: Doors & Windows...");
    const tab3Btn = page.locator("button:has-text('3. Doors & Windows')").first();
    await tab3Btn.waitFor({ state: "visible", timeout: 10000 });
    await tab3Btn.click();
    await page.waitForTimeout(800);
    const tab3Text = await reviewModalDialog.innerText();
    console.log("--- Tab 3 Text Output Snippet ---");
    console.log(tab3Text.slice(0, 800));
    const s3 = "playwright_juliana_tab3_doors_windows.png";
    await reviewModalDialog.screenshot({ path: s3 });
    console.log(`✅ Saved screenshot: ${s3}`);

    // Switch to Tab 4: Inclusions & Fixtures
    console.log("\nSwitching to Tab 4: Inclusions & Fixtures...");
    const tab4Btn = page.locator("button:has-text('4. Inclusions')").first();
    await tab4Btn.waitFor({ state: "visible", timeout: 10000 });
    await tab4Btn.click();
    await page.waitForTimeout(800);
    const tab4Text = await reviewModalDialog.innerText();
    console.log("--- Tab 4 Text Output Snippet ---");
    console.log(tab4Text.slice(0, 800));
    const s4 = "playwright_juliana_tab4_inclusions.png";
    await reviewModalDialog.screenshot({ path: s4 });
    console.log(`✅ Saved screenshot: ${s4}`);

    console.log("\n=======================================================");
    console.log("🎉 PLAYWRIGHT SCREENSHOTS SUCCESSFULLY CAPTURED ACROSS ALL 4 TABS!");
    console.log("=======================================================");
  } catch (err) {
    console.error("Playwright verification error:", err);
    await page.screenshot({ path: "playwright_error_state.png", fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
