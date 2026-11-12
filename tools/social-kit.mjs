// Social media logo kit generator for 2facounter.com
// Sources: src/components/ShieldLogo.astro (tile) + src/components/Wordmark.astro (vector wordmark)
// Outputs to C:\Users\web3e\Documents\2facounter-social-kit\
import sharp from 'sharp';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';

const OUT = 'C:/Users/web3e/Documents/2facounter-social-kit';
mkdirSync(OUT, { recursive: true });

// --- brand palette (from src/styles/global.css) ---
const ORANGE = '#e87a35';
const INK = '#2a1f1a';
const CREAM = '#f4ebe1';
const GREEN = '#6ca632';

// --- extract the wordmark paths from the Astro component ---
const wmSource = readFileSync('src/components/Wordmark.astro', 'utf8');
const pathTags = [...wmSource.matchAll(/<path\s+([^>]+?)\/?>/g)].map(m => m[1]);
const attrs = pathTags.map(tag => {
  const d = (tag.match(/d="([^"]+)"/) || [])[1];
  const fill = (tag.match(/fill="([^"]+)"/) || [])[1];
  return { d, fill };
});
console.log('wordmark paths found:', attrs.length, '| fills:', attrs.map(a => a.fill ?? '(none)'));

// The wordmark svg: viewBox "1.44 -34.61 334.66 35.04"
const WM = { x: 1.44, y: -34.61, w: 334.66, h: 35.04 };

// Wordmark paths as one group with a chosen fill (first path is shadow layer on site,
// but we re-draw deliberately: cream hard-offset shadow + ink top, matching the brand's
// "deli hard-offset" style used across the site).
const wmPath = attrs.map(a => a.d).join(' ');

// --- ShieldLogo tile as an SVG string (stroke pinned to ink for standalone use) ---
function tileSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" fill="none">
  <rect x="14" y="14" width="484" height="484" rx="106" fill="${ORANGE}" stroke="${INK}" stroke-width="28"/>
  <g transform="translate(56.8 46) scale(16.6)">
    <path fill="${INK}" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <circle cx="12" cy="11.6" r="1.75" fill="${GREEN}"/>
  </g>
</svg>`;
}

// --- 1. Full-bleed master logo 1024x1024 (transparent corners) ---
const tile1024 = await sharp(Buffer.from(tileSvg(1024))).png().toBuffer();
await sharp(tile1024).toFile(`${OUT}/logo-1024-fullbleed.png`);

// --- 2. Circular-crop-safe profile master (logo at 72% on transparent canvas) ---
const PAD = 1024, LOGO = 730, OFF = Math.round((PAD - LOGO) / 2);
const tileResized = await sharp(tile1024).resize(LOGO, LOGO).png().toBuffer();
const profileMaster = await sharp({ create: { width: PAD, height: PAD, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: tileResized, left: OFF, top: OFF }])
  .png().toBuffer();
for (const size of [400, 512, 800]) {
  await sharp(profileMaster).resize(size, size).png().toFile(`${OUT}/profile-${size}x${size}.png`);
}

// --- 3. X/Twitter header banner 1500x500 ---
// Composition: orange field, shield tile + "2FA COUNTER" wordmark with cream hard-offset shadow, centered as a group.
{
  const BANNER_W = 1500, BANNER_H = 500;
  const logoSize = 300;
  const logoY = Math.round((BANNER_H - logoSize) / 2); // 100
  const gap = 64;
  const wmScale = 2.2;                       // wordmark height ≈ 77px
  const wmW = Math.round(WM.w * wmScale);    // ≈ 736
  const groupW = logoSize + gap + wmW;
  const groupX = Math.round((BANNER_W - groupW) / 2); // ≈ 200
  const tileSvgStr = tileSvg(logoSize);
  const tileBuf = await sharp(Buffer.from(tileSvgStr)).png().toBuffer();

  // wordmark placed so its glyph box centers on the logo's vertical center
  const wmBottom = 250 + Math.round((WM.h * wmScale) / 2); // baseline y so glyphs are vertically centered
  const wmTopY = wmBottom - Math.round(WM.h * wmScale);
  const wmTx = groupX + logoSize + gap - Math.round(WM.x * wmScale);
  const wmTy = wmTopY - Math.round(WM.y * wmScale) - Math.round(WM.h * wmScale);
  // note: glyph space y runs from -34.61 (top) to 0.43 (bottom); translate so that
  // scaled glyph top lands at wmTopY: ty + (-34.61*s) = wmTopY  →  ty = wmTopY + 34.61*s
  const ty = wmTopY + Math.round(-WM.y * wmScale);
  const tx = wmTx;

  const shadowOffset = 7;
  // Transparent layer holding ONLY the wordmark glyphs — the orange field is the
  // create-canvas below. (A bg rect here would paint over the tile composite.)
  const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER_W}" height="${BANNER_H}">
  <g transform="translate(${tx + shadowOffset} ${ty + shadowOffset}) scale(${wmScale})" fill="${CREAM}" opacity="0.65">
    <path d="${wmPath}"/>
  </g>
  <g transform="translate(${tx} ${ty}) scale(${wmScale})" fill="${INK}">
    <path d="${wmPath}"/>
  </g>
</svg>`;

  const wmLayer = await sharp(Buffer.from(bannerSvg)).png().toBuffer();
  await sharp({ create: { width: BANNER_W, height: BANNER_H, channels: 4, background: { r: 232, g: 122, b: 53, alpha: 1 } } })
    .composite([
      { input: tileBuf, left: groupX, top: logoY },
      { input: wmLayer, left: 0, top: 0 },
    ])
    .png().toFile(`${OUT}/banner-x-twitter-1500x500.png`);
}

// --- 4. Share card (og image) copy for convenience ---
copyFileSync('public/og.webp', `${OUT}/share-card-2400x1260.webp`);

console.log('done → files written to', OUT);
