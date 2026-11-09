/* ────────────────────────────────────────────────────────────
   2facounter.com service worker (PWA offline support)
   Pages: network-first — fresh content when online, cached page
   when offline (falls back to the home page shell).
   /_astro/ assets: cache-first — hashed, immutable filenames.
   The generator itself is pure client-side Web Crypto, so a
   cached page keeps generating codes with zero connectivity.
   ──────────────────────────────────────────────────────────── */

const VERSION = '2fac-v1';
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;

/* Core offline shell: every first-level page + brand icons.
   Guide pages are cached on first visit via the navigation handler. */
const CORE = [
  '/',
  '/guides/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Navigations: network-first with cached fallback (offline). */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match('/')),
        ),
    );
    return;
  }

  /* Hashed build assets: cache-first — content-addressed, never stale. */
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
