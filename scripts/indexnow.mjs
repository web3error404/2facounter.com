// IndexNow submission for 2facounter.com.
//
// The public/<key>.txt file is the IndexNow ownership proof; this script
// finds that key, reads the freshly built sitemap, and pushes changed URLs to
// api.indexnow.org (which fans out to Bing, Yandex, Seznam and Naver). Google
// does not participate in IndexNow — it still discovers pages via the sitemap.
//
// Change detection hashes the built HTML for every sitemap URL, so editing a
// page without bumping its editorial date still counts as a change. The
// sitemap <lastmod> is kept alongside the hash as a cheap secondary signal.
//
// Usage:
//   node scripts/indexnow.mjs           submit new/changed/removed URLs only
//   node scripts/indexnow.mjs --all     submit every URL in the sitemap
//   node scripts/indexnow.mjs --dry-run show what would be sent, send nothing
//
// State lives in .indexnow-state.json (gitignored, local to the deploy
// machine). A first run has no state and therefore submits every URL once.
// State written by older versions (url → lastmod) is migrated automatically;
// because the old format stored no hashes, that first run falls back to
// comparing lastmod and records the current hashes for future runs.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const HOST = '2facounter.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP = new URL('../dist/sitemap-0.xml', import.meta.url);
const DIST = new URL('../dist/', import.meta.url);
const PUBLIC_DIR = new URL('../public/', import.meta.url);
const STATE = new URL('../.indexnow-state.json', import.meta.url);
const STATE_VERSION = 2;

const submitAll = process.argv.includes('--all');
const dryRun = process.argv.includes('--dry-run');

// Ownership key: the 32-hex filename served at https://host/<key>.txt
const keyFile = readdirSync(PUBLIC_DIR).find((name) => /^[a-f0-9]{32}\.txt$/.test(name));
if (!keyFile) {
  console.error('IndexNow: no <32-hex>.txt key file found in public/ — nothing submitted.');
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, '');

if (!existsSync(SITEMAP)) {
  console.error('IndexNow: dist/sitemap-0.xml not found — run a build first.');
  process.exit(1);
}

const xml = readFileSync(SITEMAP, 'utf8');
const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map(
  ([, loc, lastmod]) => ({ loc, lastmod: lastmod ?? '' }),
);
if (!entries.length) {
  console.error('IndexNow: sitemap contained no URLs — nothing submitted.');
  process.exit(1);
}

/** Hash the built HTML for a sitemap URL, or null when it is not a page. */
function pageHash(loc) {
  const path = decodeURIComponent(new URL(loc).pathname);
  const file = path.endsWith('/') ? new URL(`${path.slice(1)}index.html`, DIST) : new URL(path.slice(1), DIST);
  if (!existsSync(file)) return null;
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const current = new Map();
for (const entry of entries) {
  const hash = pageHash(entry.loc);
  if (!hash) {
    console.warn(`IndexNow: skipping ${entry.loc} — no built file found.`);
    continue;
  }
  current.set(entry.loc, { hash, lastmod: entry.lastmod });
}

/** @type {Map<string, { hash: string | null, lastmod: string }>} */
let previous = new Map();
try {
  if (existsSync(STATE)) {
    const parsed = JSON.parse(readFileSync(STATE, 'utf8'));
    if (parsed && parsed.version === STATE_VERSION && parsed.urls) {
      previous = new Map(Object.entries(parsed.urls));
    } else if (parsed && typeof parsed === 'object') {
      // Legacy format: url → lastmod. No hashes, so compare dates this once.
      previous = new Map(
        Object.entries(parsed).map(([url, lastmod]) => [
          url,
          { hash: null, lastmod: typeof lastmod === 'string' ? lastmod : '' },
        ]),
      );
    }
  }
} catch {
  previous = new Map();
}

const changed = [];
let added = 0;
let edited = 0;

for (const [url, meta] of current) {
  const old = previous.get(url);
  if (submitAll || !old) {
    changed.push(url);
    if (!old) added++;
    continue;
  }
  const contentChanged = old.hash ? old.hash !== meta.hash : false;
  const dateChanged = (old.lastmod ?? '') !== (meta.lastmod ?? '');
  if (contentChanged || dateChanged) {
    changed.push(url);
    if (contentChanged) edited++;
  }
}

// URLs that disappeared from the sitemap are eligible for removal notices.
const removed = submitAll ? [] : [...previous.keys()].filter((url) => !current.has(url));

const urlList = [...new Set([...changed, ...removed])];

if (!urlList.length) {
  // Persist the new-format state (including first-run hash seeding) even when
  // there is nothing to submit, so the next deploy sees a stable baseline.
  if (!dryRun) {
    const next = {
      version: STATE_VERSION,
      urls: Object.fromEntries([...current].map(([url, meta]) => [url, meta])),
    };
    writeFileSync(STATE, `${JSON.stringify(next, null, 2)}\n`);
  }
  console.log('IndexNow: no changed URLs since the last submission — nothing to do.');
  process.exit(0);
}

const payload = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${keyFile}`,
  urlList,
};

const summary = submitAll
  ? `${urlList.length} URL(s), full submission`
  : `${urlList.length} URL(s): ${added} new, ${edited} edited, ${removed.length} removed`;
console.log(`IndexNow: submitting ${summary} to ${ENDPOINT}…`);
if (dryRun) {
  for (const url of urlList.slice(0, 10)) console.log(`  ${url}`);
  if (urlList.length > 10) console.log(`  … and ${urlList.length - 10} more`);
  console.log('IndexNow: --dry-run — nothing sent.');
  process.exit(0);
}
let response;
try {
  response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  console.warn(`IndexNow: network error (${error.message}) — deploy is unaffected.`);
  process.exit(0);
}

// 200 = accepted, 202 = accepted but key pending validation.
if (response.ok) {
  console.log(`IndexNow: accepted (HTTP ${response.status}) — ${urlList.length} URL(s).`);
  const next = {
    version: STATE_VERSION,
    urls: Object.fromEntries([...current].map(([url, meta]) => [url, meta])),
  };
  writeFileSync(STATE, `${JSON.stringify(next, null, 2)}\n`);
} else {
  const body = await response.text().catch(() => '');
  console.warn(`IndexNow: HTTP ${response.status} ${body.slice(0, 300)} — deploy is unaffected.`);
}
