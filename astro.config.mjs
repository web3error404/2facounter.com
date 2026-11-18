// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

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
