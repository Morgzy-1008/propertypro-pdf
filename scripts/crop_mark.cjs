const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const imgB64 = fs.readFileSync('public/hudson-homes-logo.png').toString('base64');
  
  await page.setContent(`
    <img id="orig" src="data:image/png;base64,${imgB64}" />
    <canvas id="c"></canvas>
  `);

  const croppedB64 = await page.evaluate(() => {
    const img = document.getElementById('orig');
    const c = document.getElementById('c');
    // The house icon is in the top 60% of the image (0 to 226px out of 376px)
    // Width is 352px, icon is horizontally centered from 0 to 352px
    const iconW = img.naturalWidth;
    const iconH = Math.round(img.naturalHeight * 0.605); // exactly crops the house icon
    c.width = iconW;
    c.height = iconH;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, iconW, iconH, 0, 0, iconW, iconH);
    return c.toDataURL('image/png');
  });

  const base64Data = croppedB64.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('public/hudson-homes-mark.png', base64Data, 'base64');
  console.log('Saved clean emblem to public/hudson-homes-mark.png');

  await browser.close();
})();
