const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function createLightLogo() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logoPath = path.join(__dirname, '../public/hudson-homes-logo.png');
  const base64Logo = fs.readFileSync(logoPath).toString('base64');
  const dataUrl = `data:image/png;base64,${base64Logo}`;

  const resultBase64 = await page.evaluate(async (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // The colorful house mark is on top (~55% of height), text is on bottom (~45% of height)
        // For pixels in the bottom half that are dark, turn them white
        const textStartY = Math.floor(canvas.height * 0.52);

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 30) {
              // If in the text region and dark charcoal/black/navy
              if (y >= textStartY) {
                if (r < 100 && g < 100 && b < 100) {
                  data[idx] = 255;
                  data[idx + 1] = 255;
                  data[idx + 2] = 255;
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = src;
    });
  }, dataUrl);

  fs.writeFileSync(path.join(__dirname, '../public/hudson-homes-logo-light.png'), Buffer.from(resultBase64, 'base64'));
  console.log('Created public/hudson-homes-logo-light.png successfully!');
  await browser.close();
}

createLightLogo().catch(console.error);
