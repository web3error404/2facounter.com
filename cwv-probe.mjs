// Production probe: 404 status, edge URLs, security headers + Core Web Vitals.
// Run against the astro preview server (dist build).
import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const problems = [];
const info = [];

const browser = await chromium.launch();

/* 1. Status codes for edge URLs */
const edgeUrls = ['/', '/404-nothing-here/', '/guides/nope/', '/es//', '/%2e%2e/', '/toTp-Is-Google-AuthentiCator/'];
for (const path of edgeUrls) {
  const res = await fetch(BASE + path, { redirect: 'follow' });
  const is404ish = res.status === 404 || res.status === 403 || res.status === 301 || res.status === 308 || res.status === 300;
  info.push(`${path} → HTTP ${res.status} (final: ${res.url})`);
  if (path.includes('nope') || path.includes('404-nothing') || path.includes('%2e')) {
    if (res.status === 200) problems.push(`${path} returns 200 for a missing page (soft 404)`);
    else info.push(`  ✅ missing page correctly not-200`);
  }
}

/* 2. Security headers present in the built response */
const homeRes = await fetch(BASE + '/');
const headers = Object.fromEntries(homeRes.headers.entries());
for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy']) {
  if (!headers[h]) problems.push(`Missing security header: ${h}`);
  else info.push(`header ${h}: ${headers[h]}`);
}
if (!headers['cache-control']) info.push('note: no cache-control header (host adds it in prod config?)');

/* 3. CWV probe on key pages, mobile + desktop */
const pages = ['/', '/guides/github/', '/what-is-2fa/', '/404.html'];
const ctxMobile = await browser.newContext({
  viewport: { width: 412, height: 866 },
  userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  permissions: [],
});
for (const path of pages) {
  const url = BASE + `/`; // will navigate below
  const page = await ctxMobile.newPage();
  await page.addInitScript(`
    window.__cwv = { lcp: 0, cls: 0, tbt: 0, fcp: 0, ttfb: 0, longTasks: [] };
    new PerformanceObserver((l) => {
      const e = l.getEntries(); if (e.length) window.__cwv.lcp = e[e.length-1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries().filter(e => !e.hadRecentInput)) window.__cwv.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const t = e.duration - 50; if (t > 0) window.__cwv.tbt += t;
        if (e.duration > 100) window.__cwv.longTasks.push(Math.round(e.duration));
      }
    }).observe({ type: 'longtask', buffered: true });
    const nav = performance.getEntriesByType('navigation')[0];
  `);
  const resp = await (path === '/404.html'
    ? page.goto(BASE + '/missing-page-for-404-test/', { waitUntil: 'load', timeout: 30000 }).catch(() => null)
    : page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 }));
  if (!resp || resp.status() !== 200) {
    // 404 test page: Chrome DevTools shows the 404 html
    info.push(`${path} → HTTP ${resp?.status()}`);
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcpEntry = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint');
    return {
      lcp: Math.round(window.__cwv.lcp),
      cls: +window.__cwv.cls.toFixed(3),
      tbt: Math.round(window.__cwv.tbt),
      fcp: fcpEntry ? Math.round(fcpEntry.startTime) : -1,
      ttfb: nav ? Math.round(nav.responseStart) : -1,
      transferSize: nav ? nav.transferSize : -1,
      domNodes: document.querySelectorAll('*').length,
    };
  });
  const bad = m.lcp > 2500 || m.cls > 0.1 || m.tbt > 200;
  info.push(`${path} [mobile] ${bad ? '❌' : '✅'} LCP=${m.lcp}ms CLS=${m.cls} TBT=${m.tbt}ms FCP=${m.fcp}ms TTFB=${m.ttfb}ms transfer=${m.transferSize}B DOM=${m.domNodes}`);
  if (bad) problems.push(`${path} mobile CWV out of range: ${JSON.stringify(m)}`);
  await page.close();
}
await ctxMobile.close();

/* 4. Desktop spot-check of homepage */
const ctxDesk = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] });
{
  const page = await ctxDesk.newPage();
  await page.addInitScript(`
    window.__cwv = { lcp: 0, cls: 0, tbt: 0 };
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) window.__cwv.lcp = e[e.length-1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries().filter(e => !e.hadRecentInput)) window.__cwv.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { const t = e.duration - 50; if (t > 0) window.__cwv.tbt += t; } }).observe({ type: 'longtask', buffered: true });
  `);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => window.__cwv);
  const bad = m.lcp > 2500 || m.cls > 0.1 || m.tbt > 200;
  info.push(`/ [desktop] ${bad ? '❌' : '✅'} LCP=${Math.round(m.lcp)}ms CLS=${+m.cls.toFixed(3)} TBT=${Math.round(m.tbt)}ms`);
  if (bad) problems.push(`/ desktop CWV out of range: ${JSON.stringify(m)}`);
}
await ctxDesk.close();

console.log('=== PROBE RESULTS ===');
console.log(info.join('\n'));
console.log('\n=== PROBLEMS ===');
console.log(problems.length ? problems.join('\n') : '(none)');
await browser.close();
process.exit(problems.length ? 1 : 0);
