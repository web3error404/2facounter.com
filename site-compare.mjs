// Head-to-head live-site performance: 2facounter.com vs 2fa.co.com
// Mobile emulation (Lighthouse-style): 1.6 Mbps down / 750 kbps up, 150 ms RTT, 4x CPU throttle.
import { chromium } from 'playwright';

const SITES = [
  { name: '2facounter.com (yours)', url: 'https://2facounter.com/' },
  { name: '2fa.co.com (competitor)', url: 'https://2fa.co.com/' },
];

const browser = await chromium.launch();

async function sweep(site, { runs = 2 } = {}) {
  for (let i = 1; i <= runs; i++) {
    const label = i === 1 ? 'cold (first load from this client)' : 'warm (repeat visit)';
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 866 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.addInitScript(`
      window.__cwv = { lcp: 0, cls: 0, tbt: 0, fcp: 0 };
      new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) window.__cwv.lcp = e[e.length-1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries().filter(e => !e.hadRecentInput)) window.__cwv.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { const t = e.duration - 50; if (t > 0) window.__cwv.tbt += t; } }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.name === 'first-contentful-paint') window.__cwv.fcp = e.startTime; } }).observe({ type: 'paint', buffered: true });
    `);
    let bytes = 0;
    let reqs = 0;
    page.on('response', async (res) => {
      reqs++;
      try { bytes += (await res.body()).length; } catch {}
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 120)); });

    // Lighthouse-style network + CPU throttling
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto(site.url, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(2500); // let observers settle
    const m = await page.evaluate(() => {
      const w = window.__cwv;
      w.dom = document.getElementsByTagName('*').length;
      w.ttfb = (performance.getEntriesByType('navigation')[0] || {}).responseStart || 0;
      return w;
    });
    console.log(`${site.name} [mobile, throttled, ${label}]`);
    console.log(`  LCP=${Math.round(m.lcp)}ms FCP=${Math.round(m.fcp)}ms TTFB=${Math.round(m.ttfb)}ms CLS=${m.cls.toFixed(3)} TBT=${Math.round(m.tbt)}ms`);
    console.log(`  requests=${reqs} transferred=${(bytes / 1024).toFixed(0)}KB DOM=${m.dom} nodes`);
    if (errors.length) console.log(`  console/JS errors: ${errors.length} (${errors[0]})`);
    else console.log('  console/JS errors: 0');
    await ctx.close();
  }
}

for (const s of SITES) await sweep(s);
await browser.close();
