// Icon creation script for BizDesk
// Creates a 2x2 grid icon representing a complete business suite
// Pure JavaScript — no native compilation required

const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

function buildIco(frames) {
  const count = frames.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataStart = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = dataStart;
  const dirs = frames.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...dirs, ...frames.map((f) => f.buffer)]);
}

function rgb(r, g, b, a = 255) {
  return Jimp.rgbaToInt(r, g, b, a);
}
function hex(h, a = 255) {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return rgb(r, g, b, a);
}

function fillRect(img, x1, y1, w, h, color) {
  for (let y = y1; y < y1 + h; y++)
    for (let x = x1; x < x1 + w; x++)
      img.setPixelColor(color, x, y);
}

function fillRoundedRect(img, x1, y1, w, h, radius, color) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      const lx = x - x1, ly = y - y1;
      const nearLeft = lx < radius, nearRight = lx >= w - radius;
      const nearTop = ly < radius, nearBottom = ly >= h - radius;
      if (nearLeft && nearTop) {
        const dx = lx - radius, dy = ly - radius;
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (nearRight && nearTop) {
        const dx = lx - (w - 1 - radius), dy = ly - radius;
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (nearLeft && nearBottom) {
        const dx = lx - radius, dy = ly - (h - 1 - radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (nearRight && nearBottom) {
        const dx = lx - (w - 1 - radius), dy = ly - (h - 1 - radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      img.setPixelColor(color, x, y);
    }
  }
}

async function drawIcon(size) {
  const img = new Jimp(size, size, 0x00000000);
  const s = size / 256;

  // Background — dark slate, rounded
  const BG = hex('#0F172A');
  fillRoundedRect(img, 0, 0, size, size, Math.round(52 * s), BG);

  // 4-quadrant grid colors (suite icons)
  const BLUE   = hex('#3B82F6'); // Invoices / Finance
  const GREEN  = hex('#10B981'); // Money / Revenue
  const PURPLE = hex('#8B5CF6'); // Legal documents
  const AMBER  = hex('#F59E0B'); // Projects / Tasks

  // Grid layout — 2x2 squares with a gap between them
  const pad  = Math.round(40 * s);  // outer padding
  const gap  = Math.round(14 * s);  // gap between tiles
  const half = Math.round((size - pad * 2 - gap) / 2);
  const r    = Math.round(12 * s);  // tile corner radius

  // Top-left: Blue (Invoices)
  fillRoundedRect(img, pad, pad, half, half, r, BLUE);

  // Top-right: Green (Finance)
  fillRoundedRect(img, pad + half + gap, pad, half, half, r, GREEN);

  // Bottom-left: Purple (Legal)
  fillRoundedRect(img, pad, pad + half + gap, half, half, r, PURPLE);

  // Bottom-right: Amber (Projects)
  fillRoundedRect(img, pad + half + gap, pad + half + gap, half, half, r, AMBER);

  // White accent lines inside each tile (represents document lines / activity)
  const lineH = Math.max(2, Math.round(3 * s));
  const lp    = Math.round(8 * s); // inner padding within tile
  const WHITE = hex('#FFFFFF', 200);
  const W2    = hex('#FFFFFF', 130);

  // Blue tile — 3 lines (invoice)
  const bx = pad + lp, bw1 = Math.round(half * 0.65), bw2 = Math.round(half * 0.45);
  let by = pad + lp + Math.round(4 * s);
  fillRect(img, bx, by, bw1, lineH, WHITE); by += Math.round(7 * s);
  fillRect(img, bx, by, bw2, lineH, W2);   by += Math.round(7 * s);
  fillRect(img, bx, by, Math.round(half * 0.55), lineH, W2);

  // Green tile — rising bars (finance chart)
  const gx = pad + half + gap + lp;
  const gy = pad + half - lp - lineH;
  const barW = Math.round(6 * s), barGap = Math.round(5 * s);
  const barHeights = [Math.round(10 * s), Math.round(18 * s), Math.round(13 * s), Math.round(22 * s)];
  barHeights.forEach((bh, i) => {
    fillRect(img, gx + i * (barW + barGap), gy - bh + lineH, barW, bh, WHITE);
  });

  // Purple tile — stacked document icon
  const px = pad + lp + Math.round(8 * s);
  const py = pad + half + gap + lp;
  const dw = Math.round(half * 0.6), dh = Math.round(half * 0.7);
  fillRoundedRect(img, px + Math.round(4 * s), py, dw, dh, Math.round(3 * s), hex('#FFFFFF', 60));
  fillRoundedRect(img, px, py + Math.round(4 * s), dw, dh, Math.round(3 * s), hex('#FFFFFF', 120));
  // Small lines on top doc
  fillRect(img, px + lp / 2, py + Math.round(10 * s), Math.round(dw * 0.6), lineH, WHITE);
  fillRect(img, px + lp / 2, py + Math.round(17 * s), Math.round(dw * 0.4), lineH, W2);

  // Amber tile — grid dots (projects)
  const ax = pad + half + gap + lp;
  const ay = pad + half + gap + lp;
  const dotR = Math.max(2, Math.round(4 * s));
  const dotGap = Math.round(12 * s);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 2) continue; // skip corner for asymmetry
      const cx = ax + col * dotGap + dotR;
      const cy = ay + row * dotGap + dotR;
      for (let dy = cy - dotR; dy <= cy + dotR; dy++)
        for (let dx = cx - dotR; dx <= cx + dotR; dx++)
          if ((dx - cx) ** 2 + (dy - cy) ** 2 <= dotR * dotR)
            img.setPixelColor(WHITE, dx, dy);
    }
  }

  return img;
}

async function main() {
  console.log('Creating BizDesk icon (2x2 suite grid)...');

  const buildDir = path.resolve('build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [16, 32, 48, 64, 128, 256];
  const frames = [];

  for (const size of sizes) {
    process.stdout.write(`  Drawing ${size}x${size}...`);
    const img = await drawIcon(size);
    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    frames.push({ size, buffer });
    // Save individual PNGs
    fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), buffer);
    console.log(' done');
  }

  console.log('  Bundling multi-resolution ICO...');
  const icoBuffer = buildIco(frames);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(buildDir, 'icon.png'), frames[frames.length - 1].buffer);

  console.log('\n✓ build/icon.ico created (16, 32, 48, 64, 128, 256 px)');
  console.log('✓ build/icon.png (256px reference)');
}

main().catch((err) => {
  console.error('Icon creation failed:', err.message);
  process.exit(1);
});
