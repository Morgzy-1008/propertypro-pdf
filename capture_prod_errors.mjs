import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
      console.error(`[CONSOLE ERROR]: ${msg.text()}`);
    } else {
      console.log(`[CONSOLE]: ${msg.text()}`);
    }
  });
  
  page.on("pageerror", (err) => {
    errors.push(err.message);
    console.error(`[PAGE ERROR]: ${err.message}`);
  });

  try {
    await page.goto("https://propertypro-pdf.vercel.app/");
    await page.waitForLoadState("networkidle");

    await page.click("button:has-text('Select design')");
    const firstDesign = page.locator(".grid > button").first();
    await firstDesign.waitFor({ state: "visible" });
    await firstDesign.click({ force: true });

    await page.click("button:has-text('Browse facade library')", { force: true });
    const firstFacade = page.locator(".grid > button").first();
    await firstFacade.waitFor({ state: "visible" });
    await firstFacade.click({ force: true });

    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return !spans.some(span => span.textContent?.includes('GENERATING AI FACADE RENDER'));
    }, { timeout: 30000 });

    console.log("Clicking 'Re-do AI Enhance'...");
    await page.click("button:has-text('Re-do AI')", { force: true });
    
    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return !spans.some(span => span.textContent?.includes('GENERATING AI FACADE RENDER'));
    }, { timeout: 30000 });

    console.log("Done waiting. Checking for facade image update...");
    const img = await page.locator(".h-\\[78mm\\] img").first();
    if (img) {
      console.log("Image src:", await img.getAttribute("src"));
    }
    
    if (errors.length > 0) {
      console.log("Found errors:", errors);
    } else {
      console.log("No errors found!");
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
