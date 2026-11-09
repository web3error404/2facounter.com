// Renders tools/og/og-card.html to public/og.png with Playwright.
// Re-run any time the card design changes:  node tools/og/render.mjs
// For localized variants:                    node tools/og/build-cards.mjs
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const card = resolve('tools/og/og-card.html');
const output = resolve('public/og.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(card).href, { waitUntil: 'networkidle' });
// let variable fonts settle
await page.waitForTimeout(300);
await page.screenshot({ path: output, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log(`OG image written to ${output}`);
