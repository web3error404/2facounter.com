// @ts-check
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { GUIDES } from './src/data/guides.ts';

import tailwindcss from '@tailwindcss/vite';

/* ── Real lastmod dates for the sitemap ────────────────────────────────
   Google ignores a <lastmod> that simply equals the build time, so instead
   of stamping `new Date()` on every URL we read the dateModified /
   datePublished values that each page already declares in its frontmatter.
   Pages without an editorial date fall back to the file's last git commit
   date (a real "last modified" signal, not the build clock). If git is
   unavailable — e.g. a shallow CI checkout — those pages simply get no
   lastmod; an absent value is better than a false one.

   The map is built at config-load time (once per build):
   src/pages/guides/google.astro → /guides/google/ */

// One git call for every page file: newest commit first, so the first date
// seen for a path is its last modification.
/** @type {Map<string, string>} */
const gitDates = new Map();
try {
  const log = execFileSync(
    'git',
    ['log', '--format=__DATE__%cs', '--name-only', '--no-renames', '--', 'src/pages'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  let currentDate = '';
  for (const line of log.split(/\r?\n/)) {
    if (line.startsWith('__DATE__')) {
      currentDate = line.slice('__DATE__'.length).trim();
    } else if (line.trim()) {
      const path = line.trim().replace(/\\/g, '/');
      if (!gitDates.has(path)) gitDates.set(path, currentDate);
    }
  }
} catch {
  // No git / no history: dates come from frontmatter only.
}

function collectPageDates() {
  const dates = new Map();
  const walk = (/** @type {URL} */ dirUrl, relative = '') => {
    for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, dirUrl), `${relative}${entry.name}/`);
        continue;
      }
      if (!entry.name.endsWith('.astro')) continue;

      const file = new URL(entry.name, dirUrl);
      let route = `/${relative}${entry.name.replace(/\.astro$/, '')}`;
      if (route.endsWith('/index')) route = route.slice(0, -'index'.length);
      else if (!route.endsWith('/')) route = `${route}/`;
      if (route === '/404/' || route === '/preview/') continue;

      const source = readFileSync(file, 'utf8');
      const found = [...source.matchAll(
        /date(?:Modified|Published)\s*[:=]\s*['"](\d{4}-\d{2}-\d{2})['"]/g,
      )].map((match) => match[1]);
      const date = found.length
        ? found.sort().at(-1)
        : gitDates.get(`src/pages/${relative}${entry.name}`);
      if (date) dates.set(route, date);
    }
  };
  walk(new URL('./src/pages/', import.meta.url));
  return dates;
}

const pageDates = collectPageDates();

// https://astro.build/config
export default defineConfig({
  site: 'https://2facounter.com',
  trailingSlash: 'ignore',
  i18n: {
    // English (no prefix) + translated homepages at /es/, /pt/, /zh-cn/,
    // /hi/, /ar/, /fr/, /bn/, /ru/, /ja/, /de/, /ko/, /vi/, /it/, /zh-tw/.
    // hreflang values: en, es, pt, zh-Hans, hi, ar, fr, bn, ru, ja, de, ko,
    // vi, it, zh-Hant
    // (see src/components/SEO.astro and the homeAlternates cluster per page).
    defaultLocale: 'en',
    locales: [
      'en', 'es', 'pt', 'zh-cn', 'hi', 'ar', 'fr', 'bn', 'ru',
      'ja', 'de', 'ko', 'vi', 'it', 'zh-tw',
    ],
  },
  integrations: [
    sitemap({
      // The dev-only preview page is removed from the build entirely (see
      // the dev-only-preview-route integration below), so this filter is
      // belt and braces for any host that still serves a cached copy.
      // Locale dirs are included because they are released in Layout.astro
      // (RELEASED_LOCALES). When a language is rolled back there, remove its
      // dir from this list too — the two lists must stay in sync.
      filter: (page) => !page.includes('/preview/'),
      // Emit <lastmod> only where the page declares a real editorial date
      // (parsed from frontmatter above), never the build timestamp.
      serialize: (item) => {
        const date = pageDates.get(new URL(item.url).pathname);
        return date ? { ...item, lastmod: `${date}T00:00:00.000Z` } : item;
      },
    }),
    {
      // /preview is a design-QA canvas (timer at 600×350), useful in `astro
      // dev` but not something a public site should serve — audit check 3.6
      // forbids test routes in production. This strips it from `astro build`
      // while leaving it reachable in dev.
      name: 'dev-only-preview-route',
      hooks: {
        'astro:build:setup': ({ pages }) => {
          for (const key of [...pages.keys()]) {
            if (key.replace(/\.html$/, '').startsWith('/preview')) pages.delete(key);
          }
        },
      },
    },
    {
      // ── sitemap-priority.xml (generated, never hand-edited) ────────────
      // A short sitemap of only the core English pages, submitted separately
      // in Search Console so its report filter can scope "Validate fix" /
      // "Request indexing" to the most important URLs:
      // https://support.google.com/webmasters/answer/7440203
      //
      // It is generated at build time from the same sources the site uses
      // (the page list below + src/data/guides.ts) and stamped with the same
      // real editorial/git dates as sitemap-0.xml. This replaces the old
      // hand-maintained public/sitemap-priority.xml, which silently drifted
      // whenever a guide shipped (2026-11: it lagged the 9 pages added in
      // e2fc435). Not referenced from robots.txt — sitemap-index.xml stays
      // the canonical discovery feed.
      name: 'priority-sitemap',
      hooks: {
        'astro:build:done': async ({ dir, logger }) => {
          const SITE = 'https://2facounter.com';
          const CORE = [
            '/',
            '/what-is-2fa/',
            '/how-to-get-2fa-code/',
            '/authenticator-for-pc/',
            '/authenticator-cloud-sync/',
            '/2fa-backup-codes/',
            '/verify/',
          ];
          const COMPARISONS = [
            '/authenticator-apps/',
            '/totp-vs-google-authenticator/',
            '/totp-vs-authy/',
            '/totp-vs-passkeys/',
            '/sim-swap-attacks/',
          ];
          const paths = [...CORE, ...COMPARISONS, '/guides/', ...GUIDES.map((g) => g.path)];
          const entries = paths.map((path) => {
            const date = pageDates.get(path);
            const lastmod = date ? `<lastmod>${date}T00:00:00.000Z</lastmod>` : '';
            return `  <url><loc>${SITE}${path}</loc>${lastmod}</url>`;
          });
          const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<!-- Priority sitemap: core canonical English pages only. Generated at build',
            '     time by the priority-sitemap integration in astro.config.mjs from the page',
            '     list + src/data/guides.ts. Do not edit dist/ by hand.',
            '     Purpose: submit separately in Search Console (Sitemaps report) and use the',
            "     report's sitemap filter to scope \"Validate fix\" / \"Request indexing\" to the",
            '     most important URLs, per the Page indexing report pro tip:',
            '     https://support.google.com/webmasters/answer/7440203',
            '     Not referenced from robots.txt — sitemap-index.xml stays the canonical feed',
            '     for discovery; this file is a GSC-validation aid only. -->',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...entries,
            '</urlset>',
            '',
          ].join('\n');
          await writeFile(new URL('sitemap-priority.xml', dir), xml, 'utf8');
          logger.info(`priority sitemap: ${paths.length} URLs`);
        },
      },
    },
    {
      // ── Hash-based CSP (generated, never hand-edited) ──────────────────
      // public/_headers carries the literal token __CSP_SCRIPT_HASHES__ where
      // script-src would otherwise need 'unsafe-inline'. After the build, this
      // hook hashes every executable inline <script> in dist/**.html and
      // substitutes them in, so the page's own three scripts (mirror-host
      // noindex guard, service-worker registration, mobile-menu handler) keep
      // running while any injected inline script does not.
      //
      // The finished policy is also written to csp.generated.mjs, which
      // worker.mjs imports for its fallback header — so the edge fallback and
      // the asset layer's authoritative _headers can never diverge. If this
      // hook stops running, the token survives into the served header and the
      // build fails loudly; it can never silently fall back to unsafe-inline.
      //
      // JSON-LD (application/ld+json) and the generator's JSON data island are
      // data blocks, not scripts: they are not subject to script-src and must
      // not be hashed.
      name: 'csp-hashes',
      hooks: {
        'astro:build:done': async ({ dir, logger }) => {
          const TOKEN = '__CSP_SCRIPT_HASHES__';
          const DATA_TYPES = /^(application\/(ld\+)?json|text\/(plain|template))$/i;

          /** @param {URL} url @returns {URL[]} */
          const walk = (url) => {
            const out = [];
            for (const entry of readdirSync(url, { withFileTypes: true })) {
              const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
              if (entry.isDirectory()) out.push(...walk(child));
              else if (entry.name.endsWith('.html')) out.push(child);
            }
            return out;
          };

          const pages = walk(dir);
          const hashes = new Set();
          for (const page of pages) {
            const html = readFileSync(page, 'utf8');
            for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
              if (/\bsrc\s*=/i.test(script[1])) continue;
              const type = script[1].match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1].trim() ?? 'text/javascript';
              if (DATA_TYPES.test(type)) continue;
              hashes.add(createHash('sha256').update(script[2], 'utf8').digest('base64'));
            }
          }

          const headersPath = new URL('_headers', dir);
          const original = readFileSync(headersPath, 'utf8');
          if (!original.includes(TOKEN)) {
            throw new Error(`csp-hashes: ${TOKEN} missing from dist/_headers — refusing to ship an unhashed policy`);
          }

          const sources = [...hashes].sort().map((hash) => `'sha256-${hash}'`).join(' ');
          const patched = original.split(TOKEN).join(sources);
          if (patched.includes(TOKEN)) {
            throw new Error('csp-hashes: token still present after substitution');
          }
          await writeFile(headersPath, patched, 'utf8');

          // Single source of truth for the Worker fallback: the exact value
          // that _headers now serves.
          const policy = /^\s*Content-Security-Policy:[ \t]*(.+)$/im.exec(patched)?.[1].trim();
          if (!policy) throw new Error('csp-hashes: no Content-Security-Policy line found in dist/_headers');

          const module = [
            '// GENERATED by the csp-hashes integration in astro.config.mjs.',
            '// Do not edit: it is derived from the built HTML and dist/_headers on',
            '// every `astro build`, so worker.mjs cannot drift from the headers file.',
            `export const CONTENT_SECURITY_POLICY = ${JSON.stringify(policy)};`,
            '',
          ].join('\n');
          await writeFile(new URL('../csp.generated.mjs', dir), module, 'utf8');

          logger.info(`csp hashes: ${hashes.size} inline script(s) across ${pages.length} pages`);
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
