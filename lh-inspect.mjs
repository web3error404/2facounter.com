// Inspect Lighthouse run details: LCP element, long tasks, mainthread work.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const d = JSON.parse(readFileSync(file, 'utf8'));
const a = d.audits;

const lcpEl = a['largest-contentful-paint-element'];
const item = lcpEl?.details?.items?.[0]?.items?.[0]?.node;
console.log('LCP element:', item?.selector ?? 'n/a', '|', (item?.nodeLabel ?? '').slice(0, 60));

const boot = a['mainthread-work-breakdown'];
if (boot?.details?.items) {
  console.log('\nMain-thread work:');
  for (const it of boot.details.items.slice(0, 6)) console.log(`  ${it.groupLabel}: ${Math.round(it.duration)}ms`);
}

const lt = a['long-tasks'];
if (lt?.details?.items?.length) {
  console.log('\nLong tasks:');
  for (const t of lt.details.items.slice(0, 6)) console.log(`  ${Math.round(t.duration)}ms @${Math.round(t.startTime)}ms — ${t.url?.slice(0, 80) || '(inline)'}`);
}

const crux = a['network-dependency-tree-insight'];
console.log('\nnetwork-dependency-tree-insight score:', crux?.score, crux?.displayValue ?? '');

const rb = a['render-blocking-insight'];
console.log('render-blocking-insight score:', rb?.score, '|', rb?.displayValue ?? '');
if (rb?.details?.items) for (const it of rb.details.items) console.log('  blocking:', it.url?.slice(0, 90));

const ci = a['cache-insight'];
console.log('cache-insight score:', ci?.score, '|', ci?.displayValue ?? '');
if (ci?.details?.items) for (const it of ci.details.items) console.log('  cache:', it.url?.slice(0, 90), it.wastedBytes ?? '');
