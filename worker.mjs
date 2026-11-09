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
const APEX_HOST = '2facounter.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== APEX_HOST) {
      url.hostname = APEX_HOST;
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString(), 'cache-control': 'no-store' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
