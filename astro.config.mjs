// @ts-check
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
