const { chromium } = require('playwright');
const fs = require('fs');

async function testScan() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await page.evaluate(async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = 'https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Deco-Facade-Double-Garage2-Stry.jpg';
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Scan the top 40% of the image across the middle 70% of the width
    const minX = Math.floor(w * 0.15);
    const maxX = Math.floor(w * 0.85);
    
    // Sample top corner sky color to find sky baseline
    let skyR = 0, skyG = 0, skyB = 0, skyCount = 0;
    for (let y = 0; y < Math.min(20, h); y++) {
      for (let x = 0; x < Math.min(30, w); x++) {
        const idx = (y * w + x) * 4;
        skyR += data[idx];
        skyG += data[idx + 1];
        skyB += data[idx + 2];
        skyCount++;
      }
    }
    skyR /= skyCount;
    skyG /= skyCount;
    skyB /= skyCount;

    let roofApexY = h;
    // Scan downwards
    for (let y = 0; y < Math.floor(h * 0.5); y++) {
      let nonSkyInRow = 0;
      for (let x = minX; x < maxX; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Color difference from sky
        const diff = Math.abs(r - skyR) + Math.abs(g - skyG) + Math.abs(b - skyB);
        // If significantly darker or different from sky
        if (diff > 45 || (r < 140 && g < 140 && b < 140)) {
          nonSkyInRow++;
        }
      }
      // If at least 5 pixels in the row are roof/building
      if (nonSkyInRow >= 5) {
        roofApexY = y;
        break;
      }
    }

    // Also scan bottom up from 95% of height to find foundation/groundline
    let baseGroundY = Math.floor(h * 0.92);

    return {
      w,
      h,
      roofApexY,
      roofRatio: roofApexY / h,
      baseGroundY,
      baseRatio: baseGroundY / h
    };
  });

  console.log('Deco Double Garage Scan Result:', result);
  await browser.close();
}

testScan().catch(console.error);
