// Tablet + narrow sweep across EVERY dist page: horizontal overflow, JS errors.
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4322';
const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push(prefix + '/');
  }
})('dist');
pages.sort();

const problems = [];
const browser = await chromium.launch();

async function check(path, viewport, label) {
  const ctx = await browser.newContext({ viewport, permissions: [] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  const resp = await page.goto(BASE + (path === '/404/' ? '/zzz-404-test/' : path), { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(350);
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
    document.documentElement.clientWidth
  );
  if (overflow > 1) {
    const widest = await page.evaluate(() => {
      let best = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > document.documentElement.clientWidth + 4 && !best) best = el;
      }
      return best ? `${best.tagName}#${best.id}.${String(best.className).slice(0, 100)}` : 'unknown';
    });
    problems.push(`[${label}] ${path} overflow ${overflow}px — source: ${widest}`);
  }
  if (errs.length) problems.push(`[${label}] ${path} JS errors: ${errs.join(' | ')}`);
  if (resp?.status() !== 200) problems.push(`[${label}] ${path} HTTP ${resp?.status()}`);
  await ctx.close();
}

// Tablet sweep: ALL pages at 768 and 834 (iPad portrait/landscape)
for (const p of pages) {
  await check(p, { width: 768, height: 1024 }, 'TABLET-768');
  await check(p, { width: 834, height: 1112 }, 'TABLET-834');
}
// Narrow sweep: remaining pages (not in the full-audit mobile subset)
const mobileSubset = new Set(['/', '/guides/', '/guides/google/', '/what-is-2fa/', '/privacy/', '/contact/', '/zh-cn/', '/zh-tw/', '/es/', '/ja/', '/fr/', '/de/', '/pt/', '/ko/', '/it/', '/vi/', '/how-to-get-2fa-code/', '/404/']);
for (const p of pages) {
  if (!mobileSubset.has(p)) {
    await check(p, { width: 375, height: 667 }, 'MOBILE-375');
    await check(p, { width: 320, height: 568 }, 'MOBILE-320');
  }
}
console.log(`Swept ${pages.length} pages at tablet widths + ${pages.filter((p) => !mobileSubset.has(p)).length} at mobile widths (2 viewports each).`);

console.log('\n=== PROBLEMS ===');
console.log(problems.length ? problems.join('\n') : '(none)');
await browser.close();
process.exit(problems.length ? 1 : 0);
