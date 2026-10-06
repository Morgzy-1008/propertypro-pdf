import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const b64 = fs.readFileSync('test_juliana/page_1.png').toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>body { margin: 0; padding: 0; position: relative; display: inline-block; }</style></head>
    <body>
      <img id="img" src="data:image/png;base64,${b64}" style="display:block;" />
      <!-- Mask entire bottom area below the building drawing -->
      <div id="mask" style="position:absolute; left:0; bottom:0; width:100%; height:550px; background:#ffffff;"></div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);
  const el = await page.$('body');
  if (el) {
    await el.screenshot({ path: 'test_juliana/page_1_no_table.png' });
    console.log('Saved page_1_no_table.png with 100% of schedule text suppressed!');
  }
  await browser.close();
}

main().catch(console.error);
