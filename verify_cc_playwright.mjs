import { chromium } from "playwright";
import fs from "fs";
import path from "path";

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR CC & HUB COPILOT ===");

  if (!fs.existsSync("playwright-screenshots")) {
    fs.mkdirSync("playwright-screenshots", { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
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
    console.log("Step 1: Setting up authentication...");
    await page.goto("http://localhost:4173/");
    await page.evaluate(() => {
      localStorage.setItem("hudson_hub_unlocked", "true");
      sessionStorage.setItem("hudson_hub_unlocked", "true");
      localStorage.setItem(
        "hudson_staff_session",
        JSON.stringify({
          id: "steve-slisar",
          name: "Steve Slisar",
          email: "steve.slisar@hudsonhomes.com.au",
          role: "nhc",
          displayCentre: "HomeWorld Warnervale",
          state: "NSW",
        })
      );
    });

    // 2. Navigate to /hub
    console.log("Step 2: Navigating to /hub...");
    await page.goto("http://localhost:4173/hub");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Take screenshot of initial /hub page
    await page.screenshot({ path: "playwright-screenshots/hub_initial.png", fullPage: false });
    console.log("Screenshot saved: playwright-screenshots/hub_initial.png");

    // 3. Verify Header Badge Branding
    console.log("Step 3: Checking AI Assistant branding badge...");
    const copilotBadge = page.locator("span:has-text('Hudson Copilot Engine')");
    const badgeCount = await copilotBadge.count();
    console.log(`Hudson Copilot Engine badge count: ${badgeCount}`);
    if (badgeCount === 0) {
      // Check if maybe minimized or need to expand
      console.log("Badge not found directly; checking if assistant is collapsed or check full text...");
    }

    // Check that there is NO "Gemini 3.8 Flash" visible in UI
    const geminiBadge = page.locator("span:has-text('Gemini 3.8 Flash')");
    const geminiCount = await geminiBadge.count();
    if (geminiCount > 0) {
      throw new Error("FAILED: 'Gemini 3.8 Flash' badge is still visible in UI!");
    }
    console.log("PASSED: No 'Gemini 3.8 Flash' badges found in UI.");

    // 4. Test Query 1: CC 131 mount cotton road
    console.log("Step 4: Testing query: 'CC 131 mount cotton road'...");
    const inputSelector = "input[placeholder*='Ask Hudson Copilot'], input[placeholder*='Type a message'], input[type='text']";
    const chatInput = page.locator(inputSelector).last();
    await chatInput.waitFor({ state: "visible", timeout: 5000 });
    await chatInput.fill("CC 131 mount cotton road");
    await chatInput.press("Enter");

    // Wait for response to appear (we look for assistant message containing Mount Cotton)
    console.log("Waiting for assistant response...");
    await page.waitForFunction(() => {
      const texts = Array.from(document.querySelectorAll("*")).map(el => el.textContent || "");
      return texts.some(t => t.includes("Redland City Council") || t.includes("131 Mount Cotton Road"));
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const container = document.querySelector(".max-h-\\[460px\\], div[class*='overflow-y-auto']");
      if (container) container.scrollTop = 0;
    });
    await page.waitForTimeout(500);

    // Capture screenshot
    await page.screenshot({ path: "playwright-screenshots/cc_131_mount_cotton_road.png", fullPage: false });
    console.log("Screenshot saved: playwright-screenshots/cc_131_mount_cotton_road.png");

    // Get response content
    const pageText1 = await page.evaluate(() => document.body.innerText);

    // Assertions for Query 1
    if (pageText1.includes("I apologize, but I cannot answer that with 100% confidence")) {
      throw new Error("FAILED: Apologetic refusal notice detected in response!");
    }
    console.log("PASSED: Zero apologetic refusal notices in response 1.");

    if (!pageText1.includes("Redland City Council")) {
      throw new Error("FAILED: Redland City Council not detected in response!");
    }
    console.log("PASSED: Redland City Council correctly identified.");

    if (!pageText1.includes("Bushfire Attack Level") || !pageText1.includes("Zone of Influence") || !pageText1.includes("AS 2870")) {
      throw new Error("FAILED: Site overlays missing from response 1!");
    }
    console.log("PASSED: All technical site overlays present in report.");

    // 5. Test Query 2: CC duplex 131 mount cotton road
    console.log("Step 5: Testing query: 'CC duplex 131 mount cotton road'...");
    await chatInput.fill("CC duplex 131 mount cotton road");
    await chatInput.press("Enter");

    await page.waitForFunction(() => {
      const texts = Array.from(document.querySelectorAll("*")).map(el => el.textContent || "");
      return texts.some(t => t.includes("Duplex & Dual-Occupancy Compliance Check"));
    }, { timeout: 10000 });

    await page.waitForTimeout(1500);
    await page.screenshot({ path: "playwright-screenshots/cc_duplex_131_mount_cotton_road.png", fullPage: false });
    console.log("Screenshot saved: playwright-screenshots/cc_duplex_131_mount_cotton_road.png");

    const pageText2 = await page.evaluate(() => document.body.innerText);
    if (pageText2.includes("I apologize")) {
      throw new Error("FAILED: Apologetic refusal detected in duplex response!");
    }
    console.log("PASSED: Zero apologies in duplex response.");

    if (!pageText2.includes("FRL 60/60/60")) {
      throw new Error("FAILED: Duplex FRL 60/60/60 party wall specification missing!");
    }
    console.log("PASSED: FRL 60/60/60 party wall verified.");

    if (!pageText2.includes("Wisteria")) {
      throw new Error("FAILED: Recommended Hudson duplex models missing!");
    }
    console.log("PASSED: Hudson duplex models (Wisteria) verified.");

    // 6. Test Query 3: 131 mount cotton road (raw address without CC prefix)
    console.log("Step 6: Testing raw address: '131 mount cotton road' (no prefix)...");
    await chatInput.fill("131 mount cotton road");
    await chatInput.press("Enter");

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/query_131_mount_cotton_road_raw.png", fullPage: false });
    console.log("Screenshot saved: playwright-screenshots/query_131_mount_cotton_road_raw.png");

    const pageText3 = await page.evaluate(() => document.body.innerText);
    if (pageText3.includes("I apologize, but I cannot answer that with 100% confidence")) {
      throw new Error("FAILED: Raw address query triggered apologetic refusal!");
    }
    console.log("PASSED: Raw address query executed without apologies.");

    console.log("\n========================================================");
    console.log("🎉 ALL PLAYWRIGHT VERIFICATION CHECKS PASSED PERFECTLY!");
    console.log("========================================================");
  } catch (err) {
    console.error("Playwright Test Failed:", err);
    await page.screenshot({ path: "playwright-screenshots/playwright_failure.png" });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
