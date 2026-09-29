// Regenerate static/og-image.png (1200x630 link-preview image) from design/og-image.html.
//   npm i -D playwright   (or use a global install)
//   node design/render-og.js
// The page loads Jua / Black Han Sans from Google Fonts, so it needs network access.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'og-image.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, '..', 'static', 'og-image.png') });
  await browser.close();
})();
