// Build-time icon + splash asset generator.
//
// One vector source → every raster the app needs (launcher icon, Android adaptive
// foreground + monochrome, splash mark, web favicon). Run: `node scripts/generate-icons.mjs`.
// Dev-only; @resvg/resvg-js is a devDependency and nothing here ships in the app bundle.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'assets');
mkdirSync(assets, { recursive: true });

// Design system v5 "Sapphire & Gold" — deep ocean-navy → sapphire, with a gold spark.
const SAPPHIRE_DARK = '#153E7A';
const SAPPHIRE_LITE = '#2E68CF';
const GOLD = '#F2C879';
const WHITE = '#FFFFFF';

// A four-point "spark" — the captured-thought mark. Smooth concave sides via cubic
// béziers whose control points sit near the centre (waist ~ fraction of the radius).
function spark(cx, cy, r, { waist = 0.12, fill = WHITE, opacity = 1 } = {}) {
  const w = r * waist;
  const d = [
    `M ${cx} ${cy - r}`,
    `C ${cx + w} ${cy - w} ${cx + w} ${cy - w} ${cx + r} ${cy}`,
    `C ${cx + w} ${cy + w} ${cx + w} ${cy + w} ${cx} ${cy + r}`,
    `C ${cx - w} ${cy + w} ${cx - w} ${cy + w} ${cx - r} ${cy}`,
    `C ${cx - w} ${cy - w} ${cx - w} ${cy - w} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
  return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}" />`;
}

// mode: 'icon' | 'adaptive' | 'monochrome' | 'splash' | 'spark-lg' | 'spark-gold' | 'spark-sm'
function buildSvg(mode) {
  const S = 1024;
  const parts = [];

  // Single centred sparks on a transparent canvas — layered + independently animated
  // by the JS splash. Sized to leave headroom so motion never clips.
  if (mode === 'spark-lg') return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${spark(512, 512, 300, { waist: 0.11 })}</svg>`;
  if (mode === 'spark-gold') return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${spark(512, 512, 300, { waist: 0.1, fill: GOLD })}</svg>`;
  if (mode === 'spark-sm') return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${spark(512, 512, 300, { waist: 0.13, opacity: 0.92 })}</svg>`;

  if (mode === 'icon') {
    parts.push(`
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${SAPPHIRE_DARK}" />
          <stop offset="1" stop-color="${SAPPHIRE_LITE}" />
        </linearGradient>
        <radialGradient id="sheen" cx="0.32" cy="0.28" r="0.9">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16" />
          <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.03" />
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="${S}" height="${S}" rx="229" ry="229" fill="url(#bg)" />
      <rect x="0" y="0" width="${S}" height="${S}" rx="229" ry="229" fill="url(#sheen)" />
      <circle cx="500" cy="500" r="332" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="10" />
      ${spark(500, 476, 296, { waist: 0.11 })}
      ${spark(716, 700, 120, { waist: 0.1, fill: GOLD })}
      ${spark(330, 300, 46, { waist: 0.12, opacity: 0.9 })}
    `);
  } else if (mode === 'adaptive') {
    // Transparent; content kept inside the ~66% safe circle of the adaptive mask.
    parts.push(`
      <defs>
        <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.10" />
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="512" cy="500" r="300" fill="url(#halo)" />
      ${spark(512, 492, 250, { waist: 0.11 })}
      ${spark(686, 664, 96, { waist: 0.1, fill: GOLD })}
      ${spark(360, 352, 38, { waist: 0.12, opacity: 0.9 })}
    `);
  } else if (mode === 'monochrome') {
    // Android 13+ themed icon: single-colour silhouette, safe-zone scaled.
    parts.push(`
      ${spark(512, 500, 250, { waist: 0.11, fill: '#FFFFFF' })}
      ${spark(690, 668, 92, { waist: 0.1, fill: '#FFFFFF' })}
    `);
  } else if (mode === 'splash') {
    // Transparent mark shown centred on the sapphire splash background.
    parts.push(`
      ${spark(512, 512, 300, { waist: 0.11 })}
      ${spark(742, 300, 108, { waist: 0.1, fill: GOLD })}
      ${spark(300, 724, 60, { waist: 0.12, opacity: 0.92 })}
    `);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${parts.join('')}</svg>`;
}

function render(svg, size, outfile) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(resolve(assets, outfile), png);
  console.log(`  ✓ ${outfile} (${size}px)`);
}

console.log('Generating brand assets →');
render(buildSvg('icon'), 1024, 'icon.png');
render(buildSvg('adaptive'), 1024, 'adaptive-icon.png');
render(buildSvg('monochrome'), 1024, 'monochrome-icon.png');
render(buildSvg('splash'), 1024, 'splash-icon.png');
render(buildSvg('spark-lg'), 512, 'spark-lg.png');
render(buildSvg('spark-gold'), 512, 'spark-gold.png');
render(buildSvg('spark-sm'), 512, 'spark-sm.png');
render(buildSvg('icon'), 48, 'favicon.png');
console.log('Done.');
