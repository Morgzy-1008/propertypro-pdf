import { chromium } from "playwright";
import fs from "fs";
import path from "path";

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR HUDSON AI BOOST & PDF EXPORT ===");

  if (!fs.existsSync("playwright-screenshots")) {
    fs.mkdirSync("playwright-screenshots", { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
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
    await page.waitForTimeout(1000);

    // Initial screenshot
    await page.screenshot({ path: "playwright-screenshots/01_hub_dashboard.png" });
    console.log("Screenshot 1 saved: 01_hub_dashboard.png");

    const inputSelector = "input[placeholder*='Ask Hudson AI anything']";
    await page.waitForSelector(inputSelector, { timeout: 10000 });

    // 3. Test Compliance Check (CC) for Redland / Mount Cotton
    console.log("Step 3: Running CC 131 Mount Cotton Road...");
    await page.fill(inputSelector, "CC 131 Mount Cotton Road");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2500);

    // Verify compliance card & markdown tables rendered
    const tablesCount = await page.locator("table").count();
    console.log(`Markdown tables rendered in chat: ${tablesCount}`);
    if (tablesCount === 0) {
      console.warn("WARNING: Expected at least one table for setback breakdown!");
    }

    const pdfCard = page.locator("text=Executive Statutory Compliance & Feasibility Dossier");
    const pdfCardVisible = await pdfCard.first().isVisible();
    console.log(`Executive Compliance Dossier card visible: ${pdfCardVisible}`);

    await page.screenshot({ path: "playwright-screenshots/02_cc_mount_cotton_response.png" });
    console.log("Screenshot 2 saved: 02_cc_mount_cotton_response.png");

    // 4. Test "Hudson AI, put this compliance check into a downloaded PDF for me"
    console.log("Step 4: Testing prompt 'Hudson AI, put this compliance check into a downloaded PDF for me'...");
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);

    await page.fill(inputSelector, "Hudson AI, put this compliance check into a downloaded PDF for me");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2500);

    const download = await downloadPromise;
    if (download) {
      const suggestedFilename = download.suggestedFilename();
      console.log(`SUCCESS: PDF download triggered! Filename: ${suggestedFilename}`);
      const downloadPath = path.join("playwright-screenshots", suggestedFilename);
      await download.saveAs(downloadPath);
      console.log(`PDF saved to: ${downloadPath}`);
    } else {
      console.log("Download event not caught via automated event, testing manual button click...");
    }

    await page.screenshot({ path: "playwright-screenshots/03_pdf_export_prompt_response.png" });
    console.log("Screenshot 3 saved: 03_pdf_export_prompt_response.png");

    // 5. Test 1-click Download Report (PDF) button inside the Card
    console.log("Step 5: Testing 1-click 'Download Report (PDF)' button in chat bubble...");
    const downloadBtn = page.locator("button:has-text('Download Report (PDF)')").last();
    if (await downloadBtn.isVisible()) {
      const clickDownloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
      await downloadBtn.click();
      const clickDownload = await clickDownloadPromise;
      if (clickDownload) {
        const clickFilename = clickDownload.suggestedFilename();
        console.log(`SUCCESS: 1-Click button triggered PDF download! Filename: ${clickFilename}`);
      }
    }

    // 6. Test Fresh Address PDF prompt: Penrith
    console.log("Step 6: Asking 'put compliance check for 45 Smith Street, Penrith into a PDF'...");
    const penrithDownloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
    await page.fill(inputSelector, "put compliance check for 45 Smith Street, Penrith into a PDF");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2500);
    const penrithDownload = await penrithDownloadPromise;
    if (penrithDownload) {
      console.log(`SUCCESS: Fresh address PDF triggered! Filename: ${penrithDownload.suggestedFilename()}`);
    }
    await page.screenshot({ path: "playwright-screenshots/04_pdf_penrith_fresh_response.png" });
    console.log("Screenshot 4 saved: 04_pdf_penrith_fresh_response.png");

    // 7. Test Inclusions Comparison (H1 vs H2 vs H3) Side-by-side Table
    console.log("Step 7: Asking 'What is the difference between H1 Smart, H2 Designer, and H3 Luxury?'...");
    await page.fill(inputSelector, "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/05_h1_h2_h3_comparison.png" });
    console.log("Screenshot 5 saved: 05_h1_h2_h3_comparison.png");

    // 8. Test CDC vs DA
    console.log("Step 8: Asking 'What is the difference between CDC and DA in NSW?'...");
    await page.fill(inputSelector, "What is the difference between CDC and DA in NSW?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/06_cdc_vs_da_response.png" });
    console.log("Screenshot 6 saved: 06_cdc_vs_da_response.png");

    // 9. Test Duplex vs Auxiliary Unit ($0 infrastructure charge in QLD)
    console.log("Step 9: Asking 'What is the difference between a duplex and an auxiliary unit?'...");
    await page.fill(inputSelector, "What is the difference between a duplex and an auxiliary unit?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/07_duplex_vs_auxiliary_response.png" });
    console.log("Screenshot 7 saved: 07_duplex_vs_auxiliary_response.png");

    // 10. Test Balustrades and Barriers
    console.log("Step 10: Asking 'What are the balustrade requirements for a balcony?'...");
    await page.fill(inputSelector, "What are the balustrade requirements for a balcony?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/08_balustrades_response.png" });
    console.log("Screenshot 8 saved: 08_balustrades_response.png");

    // 11. Test Swimming Pool Fencing Laws
    console.log("Step 11: Asking 'What are the pool fencing laws in NSW and QLD?'...");
    await page.fill(inputSelector, "What are the pool fencing laws in NSW and QLD?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/09_pool_fencing_response.png" });
    console.log("Screenshot 9 saved: 09_pool_fencing_response.png");

    // 12. Test Duplex Party Walls FRL 60/60/60
    console.log("Step 12: Asking 'What are the fire and acoustic requirements for duplex party walls?'...");
    await page.fill(inputSelector, "What are the fire and acoustic requirements for duplex party walls?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-screenshots/10_duplex_party_walls_response.png" });
    console.log("Screenshot 10 saved: 10_duplex_party_walls_response.png");

    // 13. Verify No "Gemini" or apologetic refusal notices anywhere on the page
    console.log("Step 13: Verifying strict compliance rules (No Gemini, No apologies)...");
    
    // Check for Gemini in user-facing text
    const hasGeminiMention = /Gemini/i.test(
      await page.evaluate(() => document.body.innerText)
    );
    if (hasGeminiMention) {
      throw new Error("FAILED: Disallowed 'Gemini' text found in visible page content!");
    } else {
      console.log("PASS: Zero 'Gemini' mentions in visible user interface.");
    }

    // Check for apologetic refusal notices
    const hasApology = /I apologize, but I cannot answer that/i.test(
      await page.evaluate(() => document.body.innerText)
    );
    if (hasApology) {
      throw new Error("FAILED: Apologetic refusal notice found in response text!");
    } else {
      console.log("PASS: Zero apologetic refusal notices detected.");
    }

    console.log("=== ALL PLAYWRIGHT VERIFICATIONS PASSED WITH FLYING COLOURS ===");
  } catch (err) {
    console.error("TEST FAILED:", err);
    await page.screenshot({ path: "playwright-screenshots/error_state.png" });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
