// One-shot repair of accidentally double-encoded (mojibake) source files.
// Applies ONLY to the 4 affected files — the whole rest of the site is clean.
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/pages/es/what-is-2fa.astro',
  'src/pages/es/how-to-get-2fa-code.astro',
  'src/pages/de/what-is-2fa.astro',
  'src/pages/de/how-to-get-2fa-code.astro',
];

// cp1252-misdecoded UTF-8Bytes → correct text. Sorted longest-first so
// compound runs (â€œÂ¿, Ã¤ÃŸ) collapse correctly.
const map = Object.entries({
  'â€œÂ¿': '\u201C\u00BF', // “¿
  'Ã¤ÃŸ': '\u00E4\u00DF',  // äß
  'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã': '¿'.replace('', ''), // placeholder removed below
  'Â¿': '¿', 'Â¡': '¡',
  'Ã¼': 'ü', 'Ãœ': 'Ü', 'Ã¤': 'ä', 'Ã¶': 'ö', 'Ã–': 'Ö', 'ÃŸ': 'ß', 'Ã„': 'Ä',
  'â€œ': '“', 'â€\u009D': '”', 'â€\u009C': '“', 'â€ž': '„',
  'â€”': '—', 'â€“': '–',
  'â†’': '→', 'â†\u0090': '←',
})
  // remove the accidental placeholder entry
  .filter(([k]) => k && k !== 'Ã')
  .sort(([a], [b]) => b.length - a.length);

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  let out = text;
  let fixed = 0;
  for (const [bad, good] of map) {
    const n = out.split(bad).length - 1;
    if (n) { out = out.split(bad).join(good); fixed += n; }
  }
  writeFileSync(f, out, 'utf8');
  console.log(`${f}: ${fixed} sequences repaired`);
}
