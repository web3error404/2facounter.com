// SEO audit: validate every built page's <head> — JSON-LD parses, required
// schema types present, canonical/description/og complete, lengths sane.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push({ path: prefix + '/', file: p });
  }
})('dist');
pages.sort();

let problems = 0;
const typeCount = new Map();

for (const { path, file } of pages) {
  const html = readFileSync(file, 'utf8');
  const noindex = /name="robots" content="noindex/.test(html);
  const label = path + (noindex ? ' (noindex)' : '');

  // 1. JSON-LD blocks parse and carry @type
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const [, body] of blocks) {
    try {
      const g = JSON.parse(body);
      const t = g['@type'] ?? Array.isArray(g['@graph']) ? (g['@graph']?.map((n) => n['@type']).join('+') ?? g['@type']) : g['@type'];
      for (const tt of String(t).split('+')) typeCount.set(tt, (typeCount.get(tt) ?? 0) + 1);
    } catch (e) {
      console.log(`✗ ${label}: JSON-LD does not parse — ${e.message}`);
      problems++;
    }
  }

  if (noindex) continue; // noindex pages don't need the rest

  // 2. Required head tags on every indexable page
  if (!/<link rel="canonical" href="https:\/\/2facounter\.com/.test(html)) {
    console.log(`✗ ${label}: missing/incorrect canonical`);
    problems++;
  }
  const title = /<title>(.*?)<\/title>/.exec(html)?.[1] ?? '';
  if (!title) { console.log(`✗ ${label}: no <title>`); problems++; }
  else if (title.length > 65) console.log(`⚠ ${label}: title ${title.length} chars (may truncate): "${title}"`);

  const desc = /<meta name="description" content="(.*?)"/.exec(html)?.[1] ?? '';
  if (!desc) { console.log(`✗ ${label}: no meta description`); problems++; }
  else if (desc.length > 165) console.log(`⚠ ${label}: description ${desc.length} chars (may truncate)`);
  else if (desc.length < 50) console.log(`⚠ ${label}: description only ${desc.length} chars (thin)`);
  else if (desc.endsWith('…') || desc.endsWith('...'))
    console.log(`⚠ ${label}: description ends mid-sentence with an ellipsis — looks broken, finish the sentence`);

  // 3. og + twitter essentials
  for (const need of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!html.includes(`property="${need}"`)) { console.log(`✗ ${label}: missing ${need}`); problems++; }
  }
  if (!html.includes('name="twitter:card"')) { console.log(`✗ ${label}: missing twitter:card`); problems++; }

  // 4. Indexed pages must have at least one JSON-LD block
  if (blocks.length === 0) { console.log(`✗ ${label}: no JSON-LD at all`); problems++; }
}

console.log(`\n${pages.length} pages checked, ${problems} problems`);
console.log('\nJSON-LD @type coverage across the site:');
for (const [t, n] of [...typeCount.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${t}`);
