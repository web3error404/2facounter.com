// Full-site audit: crawls every page at desktop + mobile viewports.
// Collects: JS/console errors, broken internal/external links, horizontal
// overflow on mobile, 404s, unclickable/oversized interactive elements.
import { chromium } from 'playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:4322/';

// Discover every page from dist/ (index.html → /)
const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push(prefix + '/');
  }
})('dist');

pages.sort();
console.log(`Crawling ${pages.length} pages…\n`);

const problems = [];
const externalLinks = new Map(); // url → [pages]
const failedRequests = [];

const browser = await chromium.launch();

async function crawl(urlPath, viewport, label) {
  const ctx = await browser.newContext({ viewport, permissions: [] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text());
  });
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(BASE)) failedRequests.push(`${urlPath} → ${r.url()} (${r.failure()?.errorText})`);
  });

  const resp = await page.goto(BASE.slice(0, -1) + urlPath, { waitUntil: 'networkidle', timeout: 30000 });
  if (!resp || resp.status() !== 200) {
    problems.push(`[${label}] ${urlPath} returned HTTP ${resp?.status() ?? '?'}`);
  }

  await page.waitForTimeout(400);

  // horizontal overflow
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
    document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`[${label}] ${urlPath} horizontal overflow ${overflow}px`);

  // elements wider than viewport (find offender)
  if (overflow > 1) {
    const widest = await page.evaluate(() => {
      let best = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > document.documentElement.clientWidth + 4 && !best) best = el;
      }
      return best ? `${best.tagName}#${best.id}.${String(best.className).slice(0, 80)}` : 'unknown';
    });
    problems.push(`[${label}] ${urlPath} overflow source: ${widest}`);
  }

  // collect internal links for link checking
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'))
  );
  const seen = new Set();
  for (const href of links) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue;
    if (href.startsWith('http')) {
      if (!href.startsWith(BASE)) {
        try {
          const origin = new URL(href).origin;
          const key = href.replace(/[#?].*$/, '');
          if (!externalLinks.has(key)) {
            externalLinks.set(key, []);
            externalLinks.get(key).push(urlPath);
          }
        } catch { /* ignore */ }
      }
      continue;
    }
    const resolved = new URL(href, BASE.slice(0, -1) + urlPath).pathname;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    // verify via fetch against the dev server
    const r = await fetch(BASE.slice(0, -1) + resolved, { method: 'HEAD' }).catch(() => null);
    if (!r || r.status >= 400) {
      problems.push(`[${label}] ${urlPath} → BROKEN INTERNAL LINK ${href} (HTTP ${r?.status ?? 'network-error'})`);
    }
  }

  // interactive sanity: every visible <button> is clickable without throwing
  const buttons = await page.locator('button:visible').count();
  for (let i = 0; i < buttons; i++) {
    try {
      await page.locator('button:visible').nth(i).click({ timeout: 1500, trial: false });
      await page.waitForTimeout(80);
      // close anything that opened (modals/menus)
      await page.keyboard.press('Escape');
    } catch (e) {
      const msg = String(e.message).split('\n')[0];
      if (!/element is not stable|intercepted|detached|takes capture|non-intersecting|force-events/i.test(msg)) {
        problems.push(`[${label}] ${urlPath} button#${i} click issue: ${msg}`);
      }
    }
  }

  if (errs.length) problems.push(`[${label}] ${urlPath} JS errors:\n  ` + errs.join('\n  '));
  await ctx.close();
  return buttons;
}

// Pass 1 — desktop
let totalButtons = 0;
for (const p of pages) totalButtons += await crawl(p, { width: 1280, height: 800 }, 'DESKTOP');

// Pass 2 — mobile (375 and narrow 320) on a representative subset + all localized homes
const mobileSet = pages.filter((p) =>
  ['/', '/guides/', '/guides/google/', '/what-is-2fa/', '/privacy/', '/contact/',
   '/zh-cn/', '/zh-tw/', '/es/', '/ja/', '/fr/', '/de/', '/pt/', '/ko/', '/it/', '/vi/',
   '/how-to-get-2fa-code/', '/404/'].includes(p)
);
for (const p of mobileSet) {
  await crawl(p, { width: 375, height: 667 }, 'MOBILE-375');
  await crawl(p, { width: 320, height: 568 }, 'MOBILE-320');
}

// external link status (HEAD with UA)
console.log(`Checking ${externalLinks.size} unique external links…`);
for (const [url] of externalLinks) {
  try {
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (site-audit)' },
      signal: AbortSignal.timeout(12000),
    });
    if (r.status >= 400) problems.push(`EXTERNAL LINK BAD (HTTP ${r.status}): ${url}`);
  } catch (e) {
    problems.push(`EXTERNAL LINK UNREACHABLE: ${url} (${String(e.message).split('\n')[0]})`);
  }
}
if (failedRequests.length) problems.push('FAILED REQUESTS:\n  ' + failedRequests.join('\n  '));

console.log('\n=== PROBLEMS ===');
console.log(problems.length ? problems.join('\n') : '(none)');
console.log(`\nDesktop buttons exercised: ${totalButtons}`);
await browser.close();
process.exit(problems.length ? 1 : 0);
