// Print Lighthouse JSON summary: category scores + key metrics.
// Usage: node lh-summary.mjs <path-to-lighthouse.json> [label]
import { readFileSync } from 'node:fs';

const [file, label] = process.argv.slice(2);
const d = JSON.parse(readFileSync(file, 'utf8'));
const c = d.categories;
const a = d.audits;
const pct = (x) => Math.round(x.score * 100);
console.log(`${label ? label + ' — ' : ''}${d.configSettings.formFactor} | LH ${d.lighthouseVersion} | ${d.finalDisplayedUrl}`);
console.log(
  `Performance: ${pct(c.performance)} | Accessibility: ${pct(c.accessibility)} | ` +
  `Best Practices: ${pct(c['best-practices'])} | SEO: ${pct(c.seo)}`
);
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'server-response-time']) {
  if (a[id]) console.log(`  ${id}: ${a[id].displayValue} (score ${a[id].score})`);
}
