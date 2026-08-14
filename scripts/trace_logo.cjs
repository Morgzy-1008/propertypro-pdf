const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const imgB64 = fs.readFileSync('public/hudson-homes-logo.png').toString('base64');
  await page.setContent(`
    <canvas id="c" width="352" height="376"></canvas>
    <script>
      const img = new Image();
      img.src = 'data:image/png;base64,${imgB64}';
      img.onload = () => {
        const c = document.getElementById('c');
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Find where the house icon ends and text starts
        let textStartY = 376;
        for (let y = 0; y < 376; y++) {
          let hasDark = false;
          for (let x = 0; x < 352; x++) {
            const p = ctx.getImageData(x, y, 1, 1).data;
            if (p[3] > 100 && p[0] < 50 && p[1] < 50 && p[2] < 50) {
              hasDark = true;
              break;
            }
          }
          if (hasDark && y > 150) {
            textStartY = y;
            break;
          }
        }
        console.log('House icon bounding box is approximately 0 to Y:', textStartY);
      };
    </script>
  `);
  page.on('console', msg => console.log(msg.text()));
  await page.waitForTimeout(1000);
  await browser.close();
})();
