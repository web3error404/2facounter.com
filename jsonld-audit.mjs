// One-off sanity check: every JSON-LD block in dist must parse as JSON.
import { readdirSync, readFileSync } from 'node:fs';

const files = [];
(function w(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) w(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})('dist');

let bad = 0, total = 0;
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, b] of blocks) {
    total++;
    try { JSON.parse(b.trim()); } catch { console.log('BAD JSON-LD:', f); bad++; }
  }
}
console.log(files.length + ' pages, ' + total + ' JSON-LD blocks, ' + bad + ' invalid');
