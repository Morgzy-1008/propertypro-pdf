const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });

  const svgContent = `
    <svg viewBox="0 0 352 220" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 52px; width: auto; display: block;">
      <!-- Yellow / Gold (Left Foundation & Roof Angle) -->
      <polygon points="12,142 54,100 78,124 78,215 48,215 48,178 12,142" fill="#ECA72C" />
      <!-- Lime Green (Left Tower Wall) -->
      <polygon points="56,50 106,50 118,215 84,215" fill="#8CB82B" />
      <!-- Terracotta / Dark Red (Upper Left Roof Beam) -->
      <polygon points="120,54 186,0 200,28 136,88" fill="#9E2A2B" />
      <!-- Cyan Blue (Center Body & Main Roof Slope) -->
      <polygon points="148,96 210,38 272,98 226,215 124,215" fill="#00A3E0" />
      <!-- Magenta Pink (Right Facet) -->
      <polygon points="278,106 312,156 288,215 234,215" fill="#D62578" />
      <!-- Purple (Right Accent Arrow) -->
      <polygon points="318,148 350,175 318,205" fill="#6E2A8D" />
    </svg>
  `;

  await page.setContent(`
    <div style="padding: 40px; background: #faf9f6; display: flex; flex-direction: column; gap: 30px;">
      <div style="display: flex; align-items: center; gap: 30px;">
        <div style="text-align: center;">
          <div style="font-size: 12px; margin-bottom: 5px; color: #888;">Original:</div>
          <img src="data:image/png;base64,${fs.readFileSync('public/hudson-homes-mark.png').toString('base64')}" style="height: 52px;" />
        </div>
        <div style="text-align: center;">
          <div style="font-size: 12px; margin-bottom: 5px; color: #888;">Vector SVG:</div>
          ${svgContent}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 15px;">
        ${svgContent}
        <div style="border-left: 2px solid rgba(25, 35, 60, 0.2); padding-left: 15px; font-family: 'Barlow', sans-serif;">
          <div style="font-size: 22px; font-weight: 700; color: #18223c; letter-spacing: 0.16em; line-height: 1;">HUDSON HOMES</div>
          <div style="font-size: 9.5px; font-weight: 600; color: #b8860b; letter-spacing: 0.32em; margin-top: 5px; line-height: 1;">ZERO SURPRISES</div>
        </div>
      </div>
      <!-- Dark Background Preview -->
      <div style="background: #111a2e; padding: 25px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
        ${svgContent}
        <div style="border-left: 2px solid rgba(255, 255, 255, 0.25); padding-left: 15px; font-family: 'Barlow', sans-serif;">
          <div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.16em; line-height: 1;">HUDSON HOMES</div>
          <div style="font-size: 9.5px; font-weight: 600; color: #e6b144; letter-spacing: 0.32em; margin-top: 5px; line-height: 1;">ZERO SURPRISES</div>
        </div>
      </div>
    </div>
  `);

  await page.screenshot({ path: 'test_logo_vector.png' });
  await browser.close();
  console.log('Saved test_logo_vector.png');
})();
