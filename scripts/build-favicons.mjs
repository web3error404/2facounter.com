// Rebuild public/ favicon set from the original logo PNG.
// Usage: node scripts/build-favicons.mjs <path-to-original-png>
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(process.argv[2] ?? 'tools/logo-source.png');
const out = 'public';

const png = (size, path, extra = {}) =>
  sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10, ...extra })
    .toFile(`${out}/${path}`);

// --- Build sized PNGs -------------------------------------------------------
await png(96, 'favicon-96x96.png');
await png(180, 'apple-touch-icon.png'); // no palette: iOS prefers full color
await png(192, 'web-app-manifest-192x192.png');
await png(512, 'web-app-manifest-512x512.png');

// --- favicon.svg: SVG wrapper around a compact 256px PNG --------------------
const png256 = await sharp(src)
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
  .toBuffer();
writeFileSync(
  `${out}/favicon.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${png256.toString('base64')}"/></svg>`,
);

// --- favicon.ico: ICO container embedding PNG-compressed 256/48/32/16 -------
async function sizedPng(size) {
  return sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
}
const icoEntries = await Promise.all([256, 48, 32, 16].map(async (size) => ({ size, data: await sizedPng(size) })));

// ICO format: 6-byte header, then one 16-byte directory entry per image, then image data.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoEntries.length, 4);

let offset = 6 + icoEntries.length * 16;
const dirEntries = [];
const blobs = [];
for (const { size, data } of icoEntries) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  dirEntries.push(entry);
  blobs.push(data);
  offset += data.length;
}
writeFileSync(`${out}/favicon.ico`, Buffer.concat([header, ...dirEntries, ...blobs]));

console.log('favicon set rebuilt from', src);
