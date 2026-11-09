// Detect double-encoded UTF-8 (mojibake) fingerprints and per-page stats.
import { readdirSync, readFileSync } from 'node:fs';

// Common mojibake byte sequences (UTF-8 re-encoded as Latin-1)
const seqs = ['Ã©','Ã¡','Ã­','Ã³','Ãº','Ã¹','Ã±','ÃŸ','Ã¼','Ã¶','Ã¤','Ã„','Ã–','Ãœ',
              'Â¿','Â¡','Ã‰','Ã€','Ã¨','Ã§','Ã¢','Ã®','Ã¯','Ã«','Ã£','Ã¥','Ã¸',
              'â€"','â€˜','â€™','â€œ','â€','â€¦','Â«','Â»','Â®' ];
const found = new Map();
const sampleLines = [];
(function walk(dir, prefix = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, prefix + '/' + e.name);
    else if (e.name === 'index.html') {
      const html = readFileSync(p, 'utf8');
      let n = 0;
      for (const s of seqs) {
        const m = html.split(s).length - 1;
        if (m) {
          n += m;
          if (sampleLines.length < 12) sampleLines.push(`${prefix} :: ${s} x${m} :: ...${html.slice(Math.max(0,html.indexOf(s)-40), html.indexOf(s)+60)}...`);
        }
      }
      if (n) found.set(prefix + '/', n);
    }
  }
})('dist');

if (!found.size) console.log('NO mojibake fingerprints found in any page.');
else {
  for (const [p, n] of [...found].sort((a, b) => b[1] - a[1])) console.log(`${p}: ${n}`);
  console.log('\nSamples:');
  sampleLines.forEach((l) => console.log('  ' + l.replace(/\s+/g, ' ')));
}
