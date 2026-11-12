// One-off: capture README screenshots of the production build served by
// `astro preview` (port 4322). Desktop hero + mobile view of the generator.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4322';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

// RFC 4226 Appendix D test key — public example secret, safe to show.
const KEY = 'JBSWY3DPEHPK3PXP';

const browser = await chromium.launch();

// Desktop hero: tool with a live code + recent-keys row
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await desktop.goto(BASE, { waitUntil: 'networkidle' });
const input = desktop.locator('#secret-key-input');
await input.click();
await input.fill(KEY);
await desktop.waitForSelector('#token-value .digit');
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: `${OUT}/desktop-tool.png` });
await desktop.close();

// Mobile view
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mobile.goto(BASE, { waitUntil: 'networkidle' });
const minput = mobile.locator('#secret-key-input');
await minput.click();
await minput.fill(KEY);
await mobile.waitForSelector('#token-value .digit');
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: `${OUT}/mobile-tool.png` });
await mobile.close();

await browser.close();
console.log('Saved docs/screenshots/desktop-tool.png + mobile-tool.png');
