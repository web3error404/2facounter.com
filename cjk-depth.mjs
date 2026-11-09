// Fair depth metric for CJK pages: count actual characters/ideographs,
// not space-separated words (CJK has almost none).
import { readdirSync, readFileSync } from 'node:fs';

const pages = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') pages.push(prefix + '/');
  }
})('dist');

const vis = (h) =>
  h.replace(/<script[\s\S]*?<\/script>/gi, ' ')
   .replace(/<style[\s\S]*?<\/style>/gi, ' ')
   .replace(/<[^>]+>/g, ' ');

const targets = ['/zh-cn/', '/zh-tw/', '/ja/', '/ko/', '/vi/', '/', '/fr/',
                 '/ja/what-is-2fa/', '/ja/how-to-get-2fa-code/', '/ko/how-to-get-2fa-code/'];
for (const p of targets) {
  const t = vis(readFileSync('dist' + p + 'index.html', 'utf8'));
  const nonascii = (t.match(/[^\x00-\x7f]/g) ?? []).length;
  const hanzi = (t.match(/[\u2e80-\u9fff]/g) ?? []).length;
  const kana = (t.match(/[\u3040-\u30ff]/g) ?? []).length;
  const hangul = (t.match(/[\uac00-\ud7af]/g) ?? []).length;
  console.log(`${p}  hanzi=${hanzi}  kana=${kana}  hangul=${hangul}  total-nonasciichars=${nonascii}`);
}
