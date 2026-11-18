// IndexNow submission for 2facounter.com.
//
// The public/<key>.txt file is the IndexNow ownership proof; this script
// finds that key, reads the freshly built sitemap, and pushes changed URLs to
// api.indexnow.org (which fans out to Bing, Yandex, Seznam and Naver). Google
// does not participate in IndexNow — it still discovers pages via the sitemap.
//
// Usage:
//   node scripts/indexnow.mjs          submit new/changed/removed URLs only
//   node scripts/indexnow.mjs --all    submit every URL in the sitemap
//
// State lives in .indexnow-state.json (gitignored, local to the deploy
// machine). A first run has no state and therefore submits every URL once.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const HOST = '2facounter.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP = new URL('../dist/sitemap-0.xml', import.meta.url);
const PUBLIC_DIR = new URL('../public/', import.meta.url);
const STATE = new URL('../.indexnow-state.json', import.meta.url);

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

/** @type {Record<string, string>} */
let previous = {};
try {
  if (existsSync(STATE)) previous = JSON.parse(readFileSync(STATE, 'utf8'));
} catch {
  previous = {};
}

const urls = submitAll
  ? entries.map((entry) => entry.loc)
  : entries
      .filter((entry) => previous[entry.loc] !== entry.lastmod)
      .map((entry) => entry.loc);

// URLs that disappeared from the sitemap are eligible for removal notices.
const removed = submitAll
  ? []
  : Object.keys(previous).filter((url) => !entries.some((entry) => entry.loc === url));

const urlList = [...new Set([...urls, ...removed])];
if (!urlList.length) {
  console.log('IndexNow: no changed URLs since the last submission — nothing to do.');
  process.exit(0);
}

const payload = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${keyFile}`,
  urlList,
};

console.log(`IndexNow: submitting ${urlList.length} URL(s) to ${ENDPOINT}…`);
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
  const next = submitAll
    ? Object.fromEntries(entries.map((entry) => [entry.loc, entry.lastmod]))
    : { ...previous };
  if (!submitAll) {
    for (const entry of entries) next[entry.loc] = entry.lastmod;
    for (const url of removed) delete next[url];
  }
  writeFileSync(STATE, `${JSON.stringify(next, null, 2)}\n`);
} else {
  const body = await response.text().catch(() => '');
  console.warn(`IndexNow: HTTP ${response.status} ${body.slice(0, 300)} — deploy is unaffected.`);
}
