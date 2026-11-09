// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://2facounter.com',
  trailingSlash: 'ignore',
  i18n: {
    // English (no prefix) + translated homepages at /vi/, /zh-cn/, /zh-tw/,
    // /es/, /ja/, /fr/, /de/, /pt/, /ko/, /it/.
    // hreflang values: en, vi, zh-Hans, zh-Hant, es, ja, fr, de, pt, ko, it
    // (see src/components/SEO.astro and the homeAlternates cluster per page).
    defaultLocale: 'en',
    locales: ['en', 'vi', 'zh-cn', 'zh-tw', 'es', 'ja', 'fr', 'de', 'pt', 'ko', 'it'],
  },
  integrations: [
    sitemap({
      // Exclude the noindexed dev-only preview page from the sitemap
      filter: (page) => !page.includes('/preview/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
