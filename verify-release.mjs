import { readFileSync, existsSync, readdirSync } from 'node:fs';

// 1. full sitemap URL list
const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap has ${urls.length} URLs`);

// Released locales (must match RELEASED_LOCALES in src/layouts/Layout.astro —
// the two lists must stay in sync; astro.config.mjs's sitemap filter relies
// on that). Locale URLs belong in the sitemap; only the dev-only /preview/
// page must stay out, and every sitemap URL must resolve to a built page.
const RELEASED_LOCALES = [
  'vi', 'zh-cn', 'zh-tw', 'es', 'ja', 'fr', 'de', 'pt', 'ko', 'it',
  'hi', 'ar', 'bn', 'ru',
];

let failed = false;
for (const u of urls) {
  const { pathname } = new URL(u);
  const parts = pathname.split('/').filter(Boolean);
  if (parts.includes('preview')) {
    console.log('!! DEV URL IN SITEMAP:', u);
    failed = true;
    continue;
  }
  if (parts.length > 1 && !RELEASED_LOCALES.includes(parts[0]) && parts[0] !== 'guides') {
    console.log('!! UNRELEASED LOCALE IN SITEMAP:', u);
    failed = true;
  }
  // every sitemap URL must exist as a built page
  const file = `dist/${pathname === '/' ? '' : pathname}index.html`;
  if (!existsSync(file)) {
    console.log('!! SITEMAP URL NOT BUILT:', u);
    failed = true;
  }
}

// every released locale dir must be represented in the sitemap
for (const loc of RELEASED_LOCALES) {
  const home = `https://2facounter.com/${loc === 'en' ? '' : loc}/`;
  if (!urls.includes(home)) {
    console.log('!! RELEASED LOCALE MISSING FROM SITEMAP:', loc);
    failed = true;
  }
}

// unreleased language dirs must not exist as built pages — top-level content
// dirs like /guides/, /about/ are English pages, so only flag two-letter /
// BCP-shaped segments that aren't released locales
for (const dir of readdirSync('dist', { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const looksLikeLocale = /^[a-z]{2}(-[a-z]{2,4})?$/.test(dir.name);
  if (looksLikeLocale && !RELEASED_LOCALES.includes(dir.name) && existsSync(`dist/${dir.name}/index.html`)) {
    console.log('!! UNRELEASED LOCALE PAGE BUILT:', dir.name);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('sitemap checks OK');
console.log(urls.join('\n'));

// 2. English homepage <head>: alternates + canonical snapshot
const home = readFileSync('dist/index.html', 'utf8');
const headLinks = (home.match(/<link rel="(?:alternate|canonical)"[^>]*>/g) ?? []).join('\n');
console.log('\nHomepage head links:');
console.log(headLinks.replace(/></g, '>\n<'));

// 3. one locale head snapshot (Spanish homepage): robots + absence of canonical cluster
const es = readFileSync('dist/es/index.html', 'utf8');
console.log('\nes/ robots:', es.match(/<meta name="robots"[^>]*>/)?.[0]);
console.log('es/ googlebot:', es.match(/<meta name="googlebot"[^>]*>/)?.[0]);
console.log('es/ head links:', (es.match(/<link rel="alternate"[^>]*>/g) ?? []).length, 'alternates',
  (es.match(/<link rel="canonical"[^>]*>/g) ?? []).length, 'canonical');
