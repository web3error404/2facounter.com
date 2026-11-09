/**
 * Single source of truth for the languages this site offers.
 * Shared by the header switcher and the footer language column.
 *
 * Coverage per locale: the homepage plus the two articles ("what-is-2fa",
 * "how-to-get-2fa-code") exist in every language. Everything else (guides,
 * legal pages, long-form articles) is English-only — so the footer keeps
 * linking at homepages and the header switcher only rewrites the URL when
 * a translated equivalent of the current page is guaranteed to exist.
 */
export interface LanguageOption {
  /** Site root for this language, e.g. — '/' or '/zh-cn/' */
  href: string;
  /** Native-language label (never translated) */
  label: string;
  /** BCP 47 / hreflang value */
  hreflang: string;
}

/** Non-home page slugs (without leading locale dir) that exist in every locale. */
export const TRANSLATED_PAGES = ['what-is-2fa/', 'how-to-get-2fa-code/'];

/* Ordered by global popularity / international user reach (English first).
   繁體中文 stays grouped right after 简体中文. */
export const LANGUAGES: LanguageOption[] = [
  { href: '/', label: 'English', hreflang: 'en' },
  { href: '/es/', label: 'Español', hreflang: 'es' },
  { href: '/pt/', label: 'Português', hreflang: 'pt' },
  { href: '/zh-cn/', label: '简体中文', hreflang: 'zh-Hans' },
  { href: '/hi/', label: 'हिन्दी', hreflang: 'hi' },
  { href: '/ar/', label: 'العربية', hreflang: 'ar' },
  { href: '/fr/', label: 'Français', hreflang: 'fr' },
  { href: '/bn/', label: 'বাংলা', hreflang: 'bn' },
  { href: '/ru/', label: 'Русский', hreflang: 'ru' },
  { href: '/ja/', label: '日本語', hreflang: 'ja' },
  { href: '/de/', label: 'Deutsch', hreflang: 'de' },
  { href: '/ko/', label: '한국어', hreflang: 'ko' },
  { href: '/vi/', label: 'Tiếng Việt', hreflang: 'vi' },
  { href: '/it/', label: 'Italiano', hreflang: 'it' },
  { href: '/zh-tw/', label: '繁體中文', hreflang: 'zh-Hant' },
];

export const LANG_BY_HREF = new Map(LANGUAGES.map((l) => [l.href, l]));

/**
 * Build the switcher list for a page, marking the current language.
 * `locale` is the page's URL directory ('' for English, 'zh-cn', …).
 * `pageSlug` is the current page path without the locale dir ('' for the
 * homepage, 'what-is-2fa/', …). When the slug is translated in every locale,
 * each option points at the language's own version; otherwise it falls back
 * to the language's homepage, which always exists.
 */
export function languageOptions(
  locale: string,
  pageSlug = '',
): Array<LanguageOption & { current: boolean }> {
  const currentHref = LANGUAGES.find((l) => l.href.replace(/\//g, '') === locale)?.href ?? '/';
  const translated = pageSlug === '' || TRANSLATED_PAGES.includes(pageSlug);
  return LANGUAGES.map((l) => ({
    ...l,
    href: translated ? (l.href === '/' ? `/${pageSlug}` : `${l.href}${pageSlug}`) : l.href,
    current: l.href === currentHref,
  }));
}
