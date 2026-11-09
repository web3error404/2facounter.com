// Validate hreflang alternates & canonical targets across dist HTML
import { readdirSync, readFileSync } from 'node:fs';

const htmls = {};
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name.endsWith('.html')) htmls[prefix + '/' + e.name] = readFileSync(p, 'utf8');
  }
})('dist');

const exists = (path) =>
  htmls[path] !== undefined ||
  path === '/' ||
  (htmls[path + 'index.html'] ?? false) !== undefined && htmls[path + 'index.html'] !== undefined;

let bad = 0;
for (const [file, html] of Object.entries(htmls)) {
  const rels = [...html.matchAll(/<link rel="(alternate|canonical)" hreflang="([^"]*)" href="([^"]+)"/g)];
  for (const [, rel, hreflang, href] of rels) {
    const path = new URL(href, 'https://2facounter.com').pathname === '/'
      ? '/'
      : new URL(href, 'https://2facounter.com').pathname.replace(/\/$/, '') + '/';
    const target = path === '/' ? '/index.html' : path + 'index.html';
    if (rel === 'canonical' && !htmls[path + '/index.html'] && path !== '/') {
      bad++;
      console.log(`CANONICAL BROKEN in ${file}: ${href}`);
    }
    if (rel === 'alternate') {
      let ok = true;
      try { ok = Boolean(htmls[target]); } catch { ok = false; }
      if (!ok) {
        bad++;
        console.log(`HREFLANG BROKEN in ${file}: ${hreflang} → ${href}`);
      }
    }
  }
}
console.log(bad === 0 ? 'All canonical + hreflang targets resolve' : `${bad} broken links`);
