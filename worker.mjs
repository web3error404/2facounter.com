// Cloudflare Worker for 2facounter.com.
//
// Custom domains 2facounter.com and www.2facounter.com both point at this
// Worker. The apex is the canonical host (matches `site` in
// astro.config.mjs, sitemap.xml, canonical tags and hreflang alternates), so
// any non-apex host (www, *.workers.dev) gets a permanent redirect with
// path/query preserved; everything else is served from dist/ static assets
// (html_handling / not_found_handling behaviors from wrangler.jsonc still
// apply through env.ASSETS.fetch).
//
// The redirect carries no-store so zone-level caches don't hold on to it and
// a future host decision only takes one deploy.
//
// Plain-HTTP requests are also permanently redirected to https:// (the same
// 301 carries both fixes in one hop). This guarantees the site is only ever
// served over TLS even if the zone's "Always Use HTTPS" toggle is off — the
// Worker sees the raw http:// request because run_worker_first routes every
// request through this script.
//
// Security headers are set here (not only in dist/_headers) because
// run_worker_first routes every request through this script; applying them at
// the edge guarantees nosniff / referrer-policy / frame-deny / permissions
// rules on EVERY response, including 404s, regardless of whether the asset
// layer applies public/_headers through the ASSETS binding. Existing headers
// are never overwritten, so the _headers file remains authoritative where it
// applies; the other header values below mirror it.
//
// The CSP below is imported rather than written out: `astro build` computes a
// SHA-256 for every inline script in the built HTML and writes the finished
// policy to csp.generated.mjs (see the csp-hashes integration in
// astro.config.mjs). That keeps this fallback byte-identical to the policy
// _headers serves — script-src has no 'unsafe-inline' in either place.
import { CONTENT_SECURITY_POLICY } from './csp.generated.mjs';

const APEX_HOST = '2facounter.com';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(self), geolocation=(), microphone=()',
  'strict-transport-security': 'max-age=31536000',
  /* The only scripts are first-party inline ones, allowed by hash, plus
     first-party modules and Astro's own page styles. Every tracker (GTM/GA
     and the Cloudflare Insights beacon) was removed in 2026-11: the site
     ships zero third-party scripts and makes no third-party requests —
     script-src and connect-src are 'self'-only, matching the claims on
     /privacy/. */
  'content-security-policy': CONTENT_SECURITY_POLICY,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const needsHttps = url.protocol === 'http:';
    const needsApex = url.hostname !== APEX_HOST;
    if (needsHttps || needsApex) {
      url.protocol = 'https:';
      url.hostname = APEX_HOST;
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString(), 'cache-control': 'no-store' },
      });
    }

    // Path-traversal guard: Cloudflare's asset layer normalizes encoded
    // dot-segments, but if anything slips through (a mirror, a future asset
    // config change) it must fail closed with a real 404, never 200.
    // IMPORTANT: inspect the RAW url string — `new URL()` already resolves
    // /%2e%2e/ into a parent segment before .pathname exposes it.
    const rawPath = request.url.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+/, '').split(/[?#]/)[0];
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      return new Response(null, { status: 400, headers: { ...SECURITY_HEADERS } });
    }
    if (decodedPath.includes('\0') || decodedPath.includes('\\')) {
      return new Response(null, { status: 404, headers: { ...SECURITY_HEADERS } });
    }
    const segments = decodedPath.toLowerCase().split('/');
    if (segments.includes('..')) {
      return new Response(null, { status: 404, headers: { ...SECURITY_HEADERS } });
    }

    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(name)) headers.set(name, value);
    }
    // Belt and braces for the two cache-critical routes from public/_headers:
    // hashed assets are immutable, the service worker must always revalidate.
    if (!headers.has('cache-control')) {
      if (url.pathname.startsWith('/_astro/')) headers.set('cache-control', 'public, max-age=31536000, immutable');
      else if (url.pathname === '/sw.js') headers.set('cache-control', 'no-cache');
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
