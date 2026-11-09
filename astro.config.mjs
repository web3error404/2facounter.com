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
      // Exclude the noindexed dev-only preview page. Locale dirs are included
      // because they are released in Layout.astro (RELEASED_LOCALES). When a
      // language is rolled back there, remove its dir from this list too —
      // the two lists must stay in sync.
      filter: (page) => !page.includes('/preview/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
