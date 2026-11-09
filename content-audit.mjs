// Content audit for AdSense/SEO policies: per-page word count (visible text),
// noindex status, authorship signals, ad code presence, uniqueness between
// language variants.
import { readdirSync, readFileSync } from 'node:fs';

const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push(prefix + '/');
    else if (e.name === '404.html') pages.push('/404');
  }
})('dist');

const rows = pages.map((p) => {
  const path = 'dist' + (p === '/404' ? '/404.html' : p + 'index.html');
  const html = readFileSync(path, 'utf8');
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ');
  const words = bodyText.trim().split(' ').filter(Boolean).length;
  const noindex = /noindex/.test(html);
  const author = /byline|wrote this|reviewed by|edited by|our methodology| methodologies/i.test(bodyText) ? 'Y' : '-';
  const adcode = /adsbygoogle|googletag|ad-unit/i.test(html) ? 'ADCODE' : '-';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '-';
  return { p, words, noindex, author, adcode, title: title.slice(0, 70) };
});

rows.sort((a, b) => b.words - a.words);
console.log('WORDS | NOINDEX | AUTHOR | ADCODE | PAGE | TITLE');
for (const r of rows)
  console.log(`${r.words} | ${r.noindex ? 'noindex' : '-'} | ${r.author} | ${r.adcode} | ${r.p} | ${r.title}`);
