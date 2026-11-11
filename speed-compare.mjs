// Mobile speed comparison for 2facounter.com vs competitor sites.
//
// Usage: node speed-compare.mjs [url ...]
//        (defaults: 2facounter.com, 2fa.co.com, 2fa.cn)
//
// For each site, launches fresh browser contexts (no cache) at an
// iPhone-class mobile viewport and reports:
//   - 3 cold loads: TTFB / FCP / LCP / DOMContentLoaded / load event
//   - 1 refresh (reload with cache available): same timings + retransferred KB
//   - page weight: request count, transfer + decoded KB, protocol, encoding
import { chromium } from 'playwright';

const SITES = (process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://2facounter.com/',
  'https://2fa.co.com/',
  'https://2fa.cn/',
]).map((u) => ({ label: u.replace(/^https?:\/\/|\/$/g, ''), url: u }));

const VIEWPORT = { width: 390, height: 844 };
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const fmt = (ms) => (ms == null || Number.isNaN(ms) ? 'n/a' : `${Math.round(ms)}ms`);

async function collect(page, settleMs) {
  await page.waitForTimeout(settleMs);
  return page.evaluate(() => new Promise((resolve) => {
    let lcp = null;
    try {
      const po = new PerformanceObserver((list) => {
        const e = list.getEntries();
        if (e.length) lcp = e[e.length - 1].startTime;
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* LCP unsupported */ }
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((p) => p.name === 'first-contentful-paint');
      const res = performance.getEntriesByType('resource');
      resolve({
        ttfb: nav ? nav.responseStart : null,
        fcp: fcp ? fcp.startTime : null,
        lcp,
        dcl: nav ? nav.domContentLoadedEventEnd : null,
        load: nav ? nav.loadEventEnd : null,
        htmlKB: nav ? (nav.encodedBodySize || 0) / 1024 : null,
        requests: res.length,
        transferKB: res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024,
        decodedKB: res.reduce((s, r) => s + (r.decodedBodySize || 0), 0) / 1024,
      });
    }, 200);
  }));
}

const browser = await chromium.launch();

for (const site of SITES) {
  console.log(`\n### ${site.label}`);

  // Cold loads: fresh context (empty cache) each run.
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      viewport: VIEWPORT, userAgent: UA,
      isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US',
    });
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const m = await collect(page, 3000);
      console.log(`  cold ${i + 1}: TTFB ${fmt(m.ttfb)} | FCP ${fmt(m.fcp)} | LCP ${fmt(m.lcp)} | DCL ${fmt(m.dcl)} | Load ${fmt(m.load)}`);
      if (i === 0) console.log(`         html ${(m.htmlKB || 0).toFixed(1)}KB | requests ${m.requests} | transfer ${m.transferKB.toFixed(0)}KB | decoded ${m.decodedKB.toFixed(0)}KB`);
    } catch (e) {
      console.log(`  cold ${i + 1}: FAILED ${String(e).slice(0, 100)}`);
    }
    await context.close();
  }

  // Refresh: reload the same page with cache available.
  const context = await browser.newContext({
    viewport: VIEWPORT, userAgent: UA,
    isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US',
  });
  const page = await context.newPage();
  try {
    await page.goto(site.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    const t0 = Date.now();
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    const wall = Date.now() - t0;
    const m = await collect(page, 1500);
    console.log(`  refresh: TTFB ${fmt(m.ttfb)} | FCP ${fmt(m.fcp)} | DCL ${fmt(m.dcl)} | Load ${fmt(m.load)} | wall ${fmt(wall)} | retransferred ${m.transferKB.toFixed(0)}KB`);
  } catch (e) {
    console.log(`  refresh: FAILED ${String(e).slice(0, 100)}`);
  }
  await context.close();
}

await browser.close();
