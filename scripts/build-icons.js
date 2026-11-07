#!/usr/bin/env node
'use strict';

/**
 * Generates the favicon set and app icons from the SVG sources in assets/brand/.
 * Run it only when the logo changes; the generated files are committed.
 *
 *   npm i --no-save sharp && npm run icons
 *
 * Sources
 *   assets/brand/logo.svg         main mark (rounded tile), used at 48px and up
 *   assets/brand/logo-small.svg   pixel-aligned mark for 16/32px favicons
 *   assets/brand/logo-square.svg  full-bleed mark for app icons (the OS rounds the corners)
 */

const fs   = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require(process.env.SHARP_PATH || 'sharp');
} catch {
  console.error('This script needs sharp. Install it without saving: npm i --no-save sharp');
  process.exit(1);
}

const ROOT  = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'assets', 'brand');
const ICONS = path.join(ROOT, 'assets', 'icons');

const src = name => path.join(BRAND, name);

/** Vector render: rasterise big, then scale down smoothly. */
function vector(file, size) {
  return sharp(src(file), { density: Math.ceil(72 * (size * 4) / 64) }).resize(size, size).png().toBuffer();
}

/** Pixel-art render: draw at 16px, then scale up with nearest-neighbour so pixels stay sharp. */
async function pixel(size) {
  const base = await sharp(src('logo-small.svg'), { density: 72 }).resize(16, 16).png().toBuffer();
  return size === 16 ? base : sharp(base).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
}

/** Minimal .ico writer: PNG-compressed entries, supported by all current browsers and Windows. */
function ico(entries) {
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...entries.map(e => e.png)]);
}

function write(rel, data) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  console.log(`  ✓  ${rel} (${(data.length / 1024).toFixed(1)} KB)`);
}

(async () => {
  console.log('\n🎨  Building icons…\n');

  const favicon = ico([
    { size: 16, png: await pixel(16) },
    { size: 32, png: await pixel(32) },
    { size: 48, png: await vector('logo.svg', 48) },
  ]);
  write('favicon.ico', favicon);
  write('assets/images/favicon.ico', favicon);

  // Browsers that support SVG favicons get the crisp pixel version
  write('favicon.svg', fs.readFileSync(src('logo-small.svg')));

  write('apple-touch-icon.png', await vector('logo-square.svg', 180));
  write('assets/icons/icon-192.png', await vector('logo.svg', 192));
  write('assets/icons/icon-512.png', await vector('logo.svg', 512));
  write('assets/icons/icon-maskable-512.png', await vector('logo-square.svg', 512));
  write('assets/images/logo.png', await vector('logo.svg', 512));

  const manifest = {
    name: 'coderator.dev',
    short_name: 'coderator',
    description: 'Majid Abarghooei: open-source projects and writing.',
    start_url: '/',
    display: 'browser',
    background_color: '#07070b',
    theme_color: '#07070b',
    icons: [
      { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/assets/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  write('site.webmanifest', JSON.stringify(manifest, null, 2) + '\n');

  console.log('\n✨  Done\n');
})().catch(err => {
  console.error('Icon build failed:', err);
  process.exit(1);
});
