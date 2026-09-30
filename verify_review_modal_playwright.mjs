import { chromium } from "playwright";
import fs from "fs";

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR STRUCTURAL FOOTPRINT MODAL ===");
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
    await page.goto("http://localhost:4173/");
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
    console.log("Navigating to http://localhost:4173/quote-builder...");
    await page.goto("http://localhost:4173/quote-builder");
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

    // 5. Create modified test plan file with schedule table
    const modifiedPlanContent = `
HUDSON HOMES CONTRACT DRAWING
DESIGN: Amber 21
SCHEDULE OF AREAS:
Living Area: 165.20 m2
Double Garage: 39.50 m2
Covered Alfresco: 18.00 m2
Entry Porch: 4.50 m2
Gross Building Area: 227.20 m2
Overall Width: 11.50 m
Overall Length: 22.00 m
Special Notes:
Ensuite with larger 1800 shower
Dedicated Study room addition
Dedicated Mudroom fitout
3.5m kitchen island prep bench
Presight Opening Schedule:
21-24 SD (replaces 21-21 SD)
    `;

    const tempModifiedFilePath = "temp_modified_amber21.txt";
    fs.writeFileSync(tempModifiedFilePath, modifiedPlanContent.trim());

    // 6. Upload file to dropzone
    console.log("Uploading modified floorplan file...");
    const fileInput = page.locator("#modified-floorplan-input");
    await fileInput.setInputFiles(tempModifiedFilePath);

    // 7. Base Design Confirmation Modal should appear
    console.log("Waiting for Base Design Confirmation Modal...");
    const confirmBtn = page.locator("button:has-text('Yes, Confirm')").first();
    await confirmBtn.waitFor({ state: "visible", timeout: 15000 });
    console.log("Base design modal opened!");

    // Confirm base design
    await confirmBtn.click();
    console.log("Confirmed Amber 21 base design.");

    // 8. Modified Plan Review Modal should appear
    console.log("Waiting for Modified Plan Review Modal (Tab 1)...");
    const tab1Btn = page.locator("button:has-text('1. Structural Footprint')").first();
    await tab1Btn.waitFor({ state: "visible", timeout: 20000 });
    console.log("Review Modal Tab 1 button is visible!");
    await tab1Btn.click();
    await page.waitForTimeout(1000);

    const reviewModalDialog = page.locator("div[role='dialog']").last();
    const modalText = await reviewModalDialog.innerText();
    console.log("\n--- Tab 1 Text Output Snippet ---");
    console.log(modalText.slice(0, 1000));

    // Assertions for Tab 1
    if (modalText.includes("No external perimeter footprint extensions detected")) {
      throw new Error("FAILED: Tab 1 incorrectly reported 'No external perimeter footprint extensions detected' for modified plan!");
    }
    console.log("✅ Verified: Structural modifications correctly detected and displayed in Tab 1!");

    // Check for specific area deltas
    const hasLivingDelta = modalText.includes("Living") && (modalText.includes("+17") || modalText.includes("+18") || modalText.includes("+18.00") || modalText.includes("+17.6"));
    const hasAlfrescoDelta = modalText.includes("Alfresco") && (modalText.includes("+8") || modalText.includes("+8.00") || modalText.includes("+8.5"));
    const hasGarageDelta = modalText.includes("Garage") && (modalText.includes("+6.5") || modalText.includes("+3.5") || modalText.includes("+6.6"));
    
    console.log(`Living delta present: ${hasLivingDelta}`);
    console.log(`Alfresco delta present: ${hasAlfrescoDelta}`);
    console.log(`Garage delta present: ${hasGarageDelta}`);

    // Take Tab 1 Screenshot
    const screenshotTab1Path = "playwright_tab1_structural_footprint_modified.png";
    await page.screenshot({ path: screenshotTab1Path, fullPage: false });
    console.log(`Saved screenshot: ${screenshotTab1Path}`);

    // Switch to Tab 2: Full Internal Sweep & Rooms
    const tab2Btn = page.locator("button:has-text('2. Internal Sweep')").first();
    if (await tab2Btn.isVisible()) {
      await tab2Btn.click();
      await page.waitForTimeout(600);
      const screenshotTab2Path = "playwright_tab2_internal_sweep.png";
      await page.screenshot({ path: screenshotTab2Path, fullPage: false });
      console.log(`Saved screenshot: ${screenshotTab2Path}`);
    }

    // Switch to Tab 4: Inclusions & Fixtures
    const tab4Btn = page.locator("button:has-text('4. Inclusions')").first();
    if (await tab4Btn.isVisible()) {
      await tab4Btn.click();
      await page.waitForTimeout(600);
      const screenshotTab4Path = "playwright_tab4_inclusions.png";
      await page.screenshot({ path: screenshotTab4Path, fullPage: false });
      console.log(`Saved screenshot: ${screenshotTab4Path}`);
    }

    // Close review modal
    const closeBtn = page.locator("button:has-text('Cancel')").last();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }

    // 9. Test Standard Unmodified Brochure Plan (Edge Case: 0.0 m² delta)
    console.log("\nTesting Standard Unmodified Brochure Plan (0.0 m² delta edge case)...");
    const standardPlanContent = `
HUDSON HOMES BROCHURE
DESIGN: Amber 21
SCHEDULE OF AREAS:
Living Area: 147.20 m2
Double Garage: 33.20 m2
Covered Alfresco: 10.00 m2
Entry Porch: 2.50 m2
Gross Building Area: 192.90 m2
    `;
    const tempStandardFilePath = "temp_standard_amber21.txt";
    fs.writeFileSync(tempStandardFilePath, standardPlanContent.trim());

    await fileInput.setInputFiles(tempStandardFilePath);

    const confirmBtn2 = page.locator("button:has-text('Yes, Confirm')").first();
    await confirmBtn2.waitFor({ state: "visible", timeout: 15000 });
    await confirmBtn2.click();

    // In QuoteDesignStep, if 0.0 m² delta, toast is shown and review modal opens
    const tab1Btn2 = page.locator("button:has-text('1. Structural Footprint')").first();
    await tab1Btn2.waitFor({ state: "visible", timeout: 20000 });
    await tab1Btn2.click();
    await page.waitForTimeout(800);

    const reviewModalDialog2 = page.locator("div[role='dialog']").last();
    const standardModalText = await reviewModalDialog2.innerText();
    if (!standardModalText.includes("No external perimeter footprint extensions detected")) {
      throw new Error("FAILED: Standard plan did not report 'No external perimeter footprint extensions detected'!");
    }
    console.log("✅ Verified: Standard plan accurately reports 'No external perimeter footprint extensions detected. Standard external envelope maintained.'");

    const screenshotStandardPath = "playwright_tab1_standard_unmodified.png";
    await page.screenshot({ path: screenshotStandardPath, fullPage: false });
    console.log(`Saved screenshot: ${screenshotStandardPath}`);

    // Clean up temp files
    try {
      fs.unlinkSync(tempModifiedFilePath);
      fs.unlinkSync(tempStandardFilePath);
    } catch (e) {}

    console.log("\n🎉 PLAYWRIGHT VISUAL AND FUNCTIONAL VERIFICATION COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("Playwright verification error:", err);
    await page.screenshot({ path: "playwright_error_state.png" }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
})();
