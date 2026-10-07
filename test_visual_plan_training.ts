import { chromium } from "playwright";
import * as path from "path";

async function runVisualTest() {
  console.log("Launching Playwright browser...");
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject session credentials so _authenticated routes allow access
  await context.addInitScript(() => {
    sessionStorage.setItem("hudson_hub_unlocked", "true");
    localStorage.setItem("hudson_hub_unlocked", "true");
    (window as any).__HUDSON_HUB_UNLOCKED__ = true;
  });

  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173/plan-training ...");
  try {
    const response = await page.goto("http://localhost:5173/plan-training", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    console.log(`Page response status: ${response?.status()}`);

    // Wait a brief moment for canvas & UI state to render
    await page.waitForTimeout(2500);

    const studioScreenshotPath = path.resolve("visual_plan_training_studio.png");
    await page.screenshot({ path: studioScreenshotPath, fullPage: true });
    console.log(`Saved studio screenshot to: ${studioScreenshotPath}`);

    // Test switching handing or view mode
    const rhButton = page.locator('button:has-text("RH (Right Hand)")');
    if (await rhButton.isVisible()) {
      await rhButton.click();
      await page.waitForTimeout(500);
      console.log("Switched to RH handing");
    }

    // Capture with RH handing
    const studioRhScreenshotPath = path.resolve("visual_plan_training_rh.png");
    await page.screenshot({ path: studioRhScreenshotPath, fullPage: true });
    console.log(`Saved RH screenshot to: ${studioRhScreenshotPath}`);

    // Now visit Staff Hub to verify Portal 08 card
    console.log("Navigating to http://localhost:5173/hub ...");
    await page.goto("http://localhost:5173/hub", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);

    const hubScreenshotPath = path.resolve("visual_staff_hub_portal8.png");
    await page.screenshot({ path: hubScreenshotPath, fullPage: true });
    console.log(`Saved Hub screenshot to: ${hubScreenshotPath}`);

  } catch (err) {
    console.error("Visual test error:", err);
  } finally {
    await browser.close();
  }
}

runVisualTest().catch(console.error);
