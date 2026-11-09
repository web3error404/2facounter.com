// Heading hierarchy + image alt + sitemap check across dist HTML
import { readdirSync, readFileSync, existsSync } from 'node:fs';
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

let issues = 0;
for (const { path, file } of pages) {
  const html = readFileSync(file, 'utf8');
  const noindex = /noindex/.test(html);
  const body = html.slice(html.indexOf('<body'));
  const heads = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  // multiple h1?
  if (heads.filter((h) => h === 1).length !== 1) {
    console.log(`${path}: ${heads.filter((h) => h === 1).length} <h1> elements`);
    issues++;
  }
  if (heads[0] !== 1) {
    console.log(`${path}: first heading is h${heads[0]}, not h1`);
    issues++;
  }
  // skipped levels
  let prev = heads[0];
  for (const h of heads.slice(1)) {
    if (h > prev + 1) {
      console.log(`${path}: heading jump h${prev} → h${h}`);
      issues++;
      prev = h;
      continue;
    }
    prev = h;
  }
  // imgs without alt
  const imgs = [...body.matchAll(/<img\b[^>]*?>/g)];
  for (const [, tag] of imgs) {
    if (!/\salt=/.test(tag)) {
      console.log(`${path}: <img> without alt: ${tag.slice(0, 100)}`);
      issues++;
    } else if (/\salt="\s*"/.test(tag)) {
      console.log(`${path}: <img> empty alt (decorative?): ${tag.slice(0, 100)}`);
    }
  }
}

// sitemap sanity
if (existsSync('dist/sitemap-0.xml')) {
  const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
  const urls = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  console.log(`\nsitemap-0.xml: ${urls.length} URLs`);
  const nonexistent = urls.filter(
    (u) =>
      !pages.some(
        (p) => p.path === '/' ? u === 'https://2facounter.com/' : u.replace('https://2facounter.com', '').endsWith(p.path),
      ),
  );
  if (nonexistent.length) {
    console.log('Sitemap URLs that have no matching built page:');
    nonexistent.forEach((u) => console.log('  ' + u));
    issues += nonexistent.length;
  } else console.log('All sitemap URLs resolve to built pages.');
}

console.log(`\n${pages.length} pages, ${issues} issues`);
process.exit(issues ? 1 : 0);
