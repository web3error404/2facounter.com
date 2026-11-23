// Claim audit: the checks that caught real errors on this site, kept so the
// same class of error cannot come back unnoticed.
//
//   1. Every external link a page sends a reader to still resolves. A citation
//      that 404s, or that silently redirects to a homepage, discredits the rest.
//   2. Phrases that were wrong once and could be copied again.
//   3. A verification byline is only allowed where the page also lists an
//      official source — the claim and the evidence must travel together.
//   4. An "unverified" byline must carry the date of the failed attempt.
//   5. Claims about what vendor support can do must sit on a page that cites
//      the vendor.
//   6. A documented absence is not invented back into existence: if a vendor's
//      help centre says a feature (e.g. recovery codes) does not exist, no
//      sentence on the site may promise it.
//
// Run: node claim-audit.mjs            (all checks)
//      node claim-audit.mjs --no-links (skip the network pass)
//      CLAIM_AUDIT_ROOT=<dir> node claim-audit.mjs   (audit a fixture instead)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_LINKS = process.argv.includes('--no-links');
const ROOT = process.env.CLAIM_AUDIT_ROOT || 'dist';

const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push({ path: prefix + '/' || '/', file: p });
  }
})(ROOT);

const decoded = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Block boundaries end a sentence in rendered text, so they must end one
    // here too. Without this, a byline followed by a list followed by a
    // paragraph reads as one giant sentence, and a claim in the last block
    // inherits vocabulary from the first.
    .replace(/<\/(p|li|h[1-6]|div|section|td|th|summary|details|blockquote|figcaption)>/gi, '. ')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    // A block ending in a full stop now gets a second one from the boundary
    // rule; collapse runs so messages read cleanly.
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ');

let problems = 0;
const viaCounts = new Map();
const fail = (msg) => {
  console.log(`✗ ${msg}`);
  problems++;
};

// Phrases that were factually wrong on a page at some point. None of them is
// legitimate copy, so a hit means the error has been reintroduced.
const banned = [
  /nine times out of ten/i,
  /does not (issue|have) (static )?backup codes/i,
  /no( static)? backup codes (exist|are issued)/i,
  /NIST (has )?(rejected|downgraded|deprecated|excluded) SMS/i,
  /SMS (was |is )?(rejected|downgraded|deprecated) .{0,20}(authentication|NIST)/i,
];

// Link results are shared across pages: a source cited on 15 pages is checked once.
const external = new Map(); // url -> Set(page paths)

// Features a vendor's own documentation says do not exist, with the evidence
// that says so. A guide may report the absence; it must never promise the
// feature — that is how the PayPal page once told readers to download a
// recovery-code list PayPal does not document.
//
// The rule is deliberately three-part, because co-mention is not a claim:
// either party in a comparison can name PayPal and recovery codes without
// asserting that PayPal has them ("Unlike PayPal, Discord issues recovery
// codes"). So a sentence must name the vendor, name the topic, AND use an
// issuance verb — and must not be a denial or a comparison — before it is
// treated as contradicting the record.
const ABSENT = [
  {
    name: 'PayPal',
    vendor: /PayPal/i,
    topic: /\brecovery[\s-]?codes?\b/i,
    asserts: /\b(issues?|issued|provides?|provided|offers?|offered|gives?|given|hands?|downloads?|printed|prints?|saves?|generates?|includes?|come[s]? with|available)\b/i,
    denies: /\b(no|none|not|never|without|doesn't|does not|isn't|aren't|no longer|unlike|whereas|instead|rather than|compared)\b/i,
    because: 'PayPal documents no recovery-code list for 2-step verification',
    // The evidence behind the entry. Kept beside the rule so the next person
    // can re-read the source rather than trusting the table.
    source: 'https://www.paypal.com/us/cshelp/article/what-is-2-step-verification-help167',
    checked: '2026-11-23',
    proposition: 'PayPal 2-step verification issues no recovery codes and documents no recovery-code list.',
  },
];

const sentences = (t) => t.split(/(?<=[.!?])\s+/);

// Internal links resolve against what was actually built, so a guide that links
// to a page someone later deleted fails here rather than 404ing for a reader.
// External links are checked live further down; these need no network.
const builtFiles = new Set();
(function walkFiles(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const url = `${prefix}/${e.name}`;
    if (e.isDirectory()) walkFiles(p, url);
    else builtFiles.add(url);
  }
})(ROOT);
const routeExists = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return true;
  const base = clean.replace(/\/$/, '');
  if (builtFiles.has(clean)) return true;
  if (builtFiles.has(`${base}/index.html`)) return true;
  if (builtFiles.has(`${base}.html`)) return true;
  return false;
};

for (const { path, file } of pages) {
  const html = readFileSync(file, 'utf8');
  const text = decoded(html);
  const noindex = /name="robots" content="noindex/.test(html);

  // The byline is the only place a review claim may live. Prose that explains
  // the three states (on /methodology/) is not a claim about this page.
  const byline = decoded(
    [...html.matchAll(/<p class="[^"]*font-mono text-\[13px\][^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) => m[1])
      .join(' '),
  );

  // ---- 1. collect links
  const sourcesBlock = (html.match(/id="guide-sources"[\s\S]{0,12000}?<\/section>/g) || []).join(' ');
  const allLinks = [...html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  for (const u of allLinks) {
    const clean = u.replace(/&amp;/g, '&');
    if (!external.has(clean)) external.set(clean, new Set());
    external.get(clean).add(path);
  }

  // ---- 1b. internal links must point at something that was built
  for (const m of html.matchAll(/<a\b[^>]*href="(\/(?!\/)[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/#')) continue;
    if (!routeExists(href)) fail(`${path}: internal link "${href}" is not a built page`);
  }

  // ---- 2. banned phrasing
  for (const re of banned) {
    const hit = text.match(re);
    if (hit) fail(`${path}: banned phrasing "${hit[0]}"`);
  }

  // ---- 3. byline must be backed by an official source on the same page
  const claimsCheck = /Fact-checked against/i.test(byline);
  if (claimsCheck && sourcesBlock && !/official/i.test(decoded(sourcesBlock))) {
    fail(`${path}: claims "Fact-checked against" but the Sources block lists no official source`);
  }
  if (claimsCheck && !sourcesBlock) {
    fail(`${path}: claims "Fact-checked against" but has no Sources block`);
  }

  // ---- 4. unverified byline must be dated
  if (/\bunverified\b/i.test(byline) && !/last reviewed \d{1,2} \w+ \d{4}/i.test(byline)) {
    fail(`${path}: says "unverified" without a dated "last reviewed" line`);
  }

  // ---- 5. vendor-support claims need the vendor cited
  const supportClaim = text.match(/\bsupport\b[^.]{0,60}\b(cannot|can ?not|is unable to|are unable to)\b[^.]{0,60}\b(remove|disable|bypass|change|reset)\b/i);
  if (supportClaim && !/official/i.test(decoded(sourcesBlock || ''))) {
    fail(`${path}: claim about support ("${supportClaim[0].slice(0, 70)}…") without a cited vendor source`);
  }

  // ---- 5b. documented absences stay absent
  for (const s of sentences(text)) {
    for (const a of ABSENT) {
      if (!a.vendor.test(s) || !a.topic.test(s)) continue;
      if (!a.asserts.test(s) || a.denies.test(s)) continue;
      // Quote from whichever half of the claim comes first, so the message
      // shows the assertion rather than whatever vendor name precedes it.
      const at = Math.min(...[s.search(a.vendor), s.search(a.topic)].filter((i) => i >= 0));
      fail(
        `${path}: promises a ${a.name} feature the vendor does not document ` +
          `("${s.slice(at, at + 90).trim()}") — ${a.because} ` +
          `(checked ${a.checked}: ${a.source})`,
      );
    }
  }

  // ---- 6. a review claim must record how the source was read
  // The byline says what was checked; data-review-via says through which pipe.
  // Keeping it in the markup makes the provenance checkable without trusting
  // the prose, and makes a browser check distinguishable from a reader check.
  if (claimsCheck) {
    const via = html.match(/data-review-via="([^"]+)"/)?.[1];
    const reviewedOn = html.match(/data-review-date="([^"]+)"/)?.[1];
    if (!via) fail(`${path}: claims a review but carries no data-review-via metadata`);
    else if (!['browser', 'text-reader', 'unspecified'].includes(via)) {
      fail(`${path}: unknown data-review-via="${via}"`);
    } else viaCounts.set(via, (viaCounts.get(via) || 0) + 1);
    // Reviews from 24 November 2026 onward must name the route. Older claims
    // keep 'unspecified' rather than being retro-labelled.
    if (via === 'unspecified' && reviewedOn && reviewedOn >= '2026-11-24') {
      fail(`${path}: review dated ${reviewedOn} does not record how the source was read`);
    }
  }

  // ---- 7. noindex pages still must not ship banned phrasing (checked above)
  if (noindex) continue;
}

// A refused script is not proof of a dead page. Meta, Cloudflare and Salesforce
// all answer a bare fetch with 400/403 while serving the article to a browser.
// So every suspicious result is escalated: launch a real browser, read what a
// person would see, and only then decide. If Playwright is unavailable the
// check degrades to a warning rather than inventing a verdict.
let browser = null;
const getBrowser = async () => {
  if (browser === null) {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  }
  return browser;
};

// Pages behind a bot challenge can end on this interstitial instead of the
// article. That is an access problem, not evidence the page is gone — the
// audit says so rather than failing the link or quietly passing it.
const CHALLENGE =
  /performing security verification|just a moment|attention required|verify you are (a )?human|enable javascript and cookies to continue|checking your browser/i;

async function browserCheck(url) {
  let ctx;
  try {
    const b = await getBrowser();
    ctx = await b.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1366, height: 900 },
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const read = async () =>
      (await page.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ');
    let text = await read();
    await page.waitForTimeout(8000);
    text = await read();
    // Cloudflare interstitials sometimes clear on their own; give them a chance.
    for (let i = 0; i < 3 && CHALLENGE.test(text) && text.length < 2000; i++) {
      await page.waitForTimeout(5000);
      text = await read();
    }
    const final = page.url();
    const title = await page.title();
    const soft = SOFT_404.find((re) => re.test(text.slice(0, 4000)));
    const rooted = /^https?:\/\/[^/]+\/?$/.test(final) && new URL(url).pathname.replace(/\/$/, '').length > 1;
    if (CHALLENGE.test(text) && text.length < 2000) return { challenge: true, title };
    if (text.length < 400) return { error: `only ${text.length} characters rendered` };
    if (soft) return { error: `rendered a soft 404 ("${soft.source.slice(0, 40)}…")` };
    if (rooted) return { error: 'the browser ended on the site root' };
    return { ok: true, status: res?.status(), final, title, length: text.length };
  } catch (e) {
    return { error: String(e.message || e).split('\n')[0].slice(0, 120) };
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

// Final fallback: some hosts refuse this machine outright (PayPal answers 403
// with an empty body even to a browser). A text reader fetches from elsewhere,
// so it can still show whether the URL is alive and what it says.
async function readerCheck(url) {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { accept: 'text/plain' },
      signal: AbortSignal.timeout(60000),
    });
    const t = (await r.text()).replace(/\s+/g, ' ');
    const title = (t.match(/Title:\s*(.+?)\s*URL Source:/) || [])[1] || '';
    const soft = SOFT_404.find((re) => re.test(t.slice(0, 4000)));
    if (CHALLENGE.test(t.slice(0, 2000))) return { error: 'the text reader hit a bot challenge' };
    if (t.length < 600) return { error: `the text reader returned ${t.length} characters` };
    if (soft) return { error: 'the text reader showed a soft 404' };
    return { ok: true, title, length: t.length };
  } catch (e) {
    return { error: String(e.message || e).split('\n')[0].slice(0, 120) };
  }
}

async function judge(url, r) {
  if (r.error) return { dead: `dead link (${r.error})` };
  if (r.status === 404 || r.status === 410) return { dead: `dead link (HTTP ${r.status})` };
  const suspicious = r.status >= 400 || r.soft || r.redirectedToRoot;
  if (!suspicious) return null;
  const scripted = r.status >= 400 ? `HTTP ${r.status}` : r.soft ? 'soft 404' : 'redirect to root';
  let b;
  try {
    b = await browserCheck(url);
  } catch (e) {
    console.log(`… ${url} — ${scripted} to a script; browser not available (${String(e).slice(0, 60)})`);
    return null;
  }
  if (b.ok) {
    console.log(`… ${url} — ${scripted} to a script, but rendered in a browser (${b.length} chars: "${b.title.slice(0, 70)}")`);
    return null;
  }
  const reason = b.challenge ? 'a browser reached only a bot challenge' : b.error;
  const reader = await readerCheck(url);
  if (reader.ok) {
    console.log(`… ${url} — ${scripted} to a script, ${reason}; readable through a text reader (${reader.length} chars: "${reader.title.slice(0, 70)}")`);
    return null;
  }
  // A challenge the audit cannot get past is an access limit, not proof of
  // death. It is reported separately so "unverified" never reads as "broken".
  return { unverified: `${scripted}; ${reason}; ${reader.error}` };
}

// ---- link check
const SOFT_404 = [
  /this article doesn't exist or has been unpublished/i,
  /page not found/i,
  /no longer available/i,
  /we couldn'?t find that page/i,
  /the web address you entered is not a functioning page/i,
  /article (is )?not found/i,
];

async function check(url) {
  const attempt = async () => {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    return { status: res.status, final: res.url, body };
  };
  try {
    const r = await attempt();
    const soft = SOFT_404.find((re) => re.test(r.body.slice(0, 4000)));
    const redirectedToRoot =
      r.status === 200 &&
      /^https?:\/\/[^/]+\/?$/.test(r.final) &&
      new URL(url).pathname.replace(/\/$/, '').length > 1;
    return { ...r, soft, redirectedToRoot };
  } catch (e) {
    return { error: String(e.cause?.code || e.name || e) };
  }
}

if (!SKIP_LINKS) {
  const urls = [...external.keys()];
  const results = new Map();
  let i = 0;
  const CONCURRENCY = 6;
  console.log(`Checking ${urls.length} external links…`);
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < urls.length) {
        const u = urls[i++];
        results.set(u, await check(u));
      }
    }),
  );
  const unverifiedLinks = [];
  for (const [url, r] of results) {
    const where = [...(external.get(url) || [])].slice(0, 3).join(', ');
    const verdict = await judge(url, r);
    if (!verdict) continue;
    if (verdict.unverified) {
      unverifiedLinks.push(`${url} — ${verdict.unverified} (cited by ${where})`);
      continue;
    }
    fail(`${verdict.dead} ${url} — cited by ${where}`);
  }
  if (unverifiedLinks.length) {
    console.log(`\n${unverifiedLinks.length} link(s) could not be verified by script, browser or reader (bot challenge) — not counted as dead:`);
    for (const l of unverifiedLinks) console.log(`  ? ${l}`);
  }
}

if (browser) await browser.close();

console.log(
  problems === 0
    ? `claim audit: ${pages.length} pages checked, 0 problems`
    : `claim audit: ${pages.length} pages checked, ${problems} problem(s)`,
);
if (viaCounts.size) {
  const order = ['browser', 'text-reader', 'unspecified'];
  const parts = order.filter((k) => viaCounts.has(k)).map((k) => `${viaCounts.get(k)} ${k}`);
  console.log(`review metadata: ${parts.join(', ')}`);
}
process.exit(problems === 0 ? 0 : 1);
