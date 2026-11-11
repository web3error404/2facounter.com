/* One-off: fontkit-based wordmark generation (replaces the opentype.js
   version whose WOFF parser emitted NaN coordinates past the first few
   glyphs). Produces a JSON file in the same shape:
     { text, viewBox, d }
   Usage:
     npm install --no-save fontkit playwright @fontsource/titan-one
     node tools/og/wordmark-gen.mjs "2FA COUNTER" .tmp-wordmark.json
   Then paste the d / viewBox into src/components/Wordmark.astro (a helper
   for that lives in git history: .tmp-wordmark-astro.mjs).
   The path is built glyph-by-glyph with layout() advance positions, scaled
   to a 48px em, flipped to y-down SVG coords, then the true bounds are
   measured in the browser (Playwright) and the viewBox is written from
   those. */
import { readFileSync, writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import { chromium } from 'playwright';

const text = process.argv[2] ?? '2FA COUNTER';
const outFile = process.argv[3] ?? '.tmp-wordmark.json';
const font = fontkit.openSync('node_modules/@fontsource/titan-one/files/titan-one-latin-400-normal.woff');

const SCALE = 48 / font.unitsPerEm; // em → 48px
const run = font.layout(text);
let d = '';
let x = 0; // pen position in font units
for (const [i, glyph] of run.glyphs.entries()) {
  const pos = run.positions[i];
  const g = glyph.path
    .toSVG() // y-up coordinates in font units
    .replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (m, a, b) => {
      // transform: x = (xFont + dx) * s ; y = -(yFont) * s  (y-down, baseline 0)
      const nx = (Number(a) + x + pos.xOffset) * SCALE;
      const ny = -(Number(b) + pos.yOffset) * SCALE;
      return `${nx.toFixed(2)} ${ny.toFixed(2)}`;
    });
  d += g;
  x += pos.xAdvance;
}

// Measure true rendered bounds in a browser, then write the viewBox from it.
const html = `<svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="0 -40 400 60" fill="none"><path d="${d}"/></svg>`;
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html);
const bb = await p.evaluate(() => {
  const r = document.getElementById('s').getBBox();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await b.close();

const round = (n) => Number(n.toFixed(2));
const viewBox = `${round(bb.x)} ${round(bb.y)} ${round(bb.w)} ${round(bb.h)}`;
const result = { text, viewBox, d: d.replace(/\s+/g, ' ') };
writeFileSync(outFile, JSON.stringify(result));
console.log('viewBox:', viewBox, '| d length:', result.d.length);
