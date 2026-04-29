// Icon creation script for InvoiceGenerator
// Creates a professional 256x256 invoice icon → build/icon.ico
// Pure JavaScript — no native compilation required

const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// Custom ICO writer — embeds PNG frames directly (Windows Vista+ supports PNG inside ICO)
function buildIco(frames) {
  // frames: [{ size: number, buffer: Buffer }]
  const count = frames.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataStart = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  let offset = dataStart;
  const dirs = frames.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...dirs, ...frames.map((f) => f.buffer)]);
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function rgb(r, g, b, a = 255) {
  return Jimp.rgbaToInt(r, g, b, a);
}
function hex(h, a = 255) {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return rgb(r, g, b, a);
}

// ─── Drawing primitives ───────────────────────────────────────────────────────
function fillRect(img, x1, y1, w, h, color) {
  for (let y = y1; y < y1 + h; y++)
    for (let x = x1; x < x1 + w; x++)
      img.setPixelColor(color, x, y);
}

function fillRoundedRect(img, x1, y1, w, h, radius, color) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      const lx = x - x1, ly = y - y1;
      // Check if pixel is inside the rounded rectangle
      const nearLeft   = lx < radius;
      const nearRight  = lx >= w - radius;
      const nearTop    = ly < radius;
      const nearBottom = ly >= h - radius;

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

function fillCircle(img, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        img.setPixelColor(color, x, y);
}

// ─── Main icon drawing ────────────────────────────────────────────────────────
async function drawIcon(size) {
  const img = new Jimp(size, size, 0x00000000); // transparent

  const s = size / 256; // scale factor

  // Colors
  const BG     = hex('#1E293B');       // dark slate (sidebar color)
  const PRIMARY = hex('#2563EB');       // brand blue
  const PRIMARY_D = hex('#1D4ED8');    // darker blue
  const WHITE  = hex('#FFFFFF');
  const OFF_WHITE = hex('#EFF6FF');    // very light blue
  const FOLD_BG = hex('#DBEAFE');      // light blue for dog-ear
  const LINE_FG = hex('#BFDBFE');      // blue line accent

  const pad = Math.round(0 * s);

  // 1. Rounded background square
  fillRoundedRect(img, pad, pad, size - pad * 2, size - pad * 2, Math.round(52 * s), BG);

  // 2. Subtle glow circle behind document
  const glowR = Math.round(88 * s);
  const glowCX = Math.round(128 * s);
  const glowCY = Math.round(128 * s);
  for (let y = glowCY - glowR; y <= glowCY + glowR; y++) {
    for (let x = glowCX - glowR; x <= glowCX + glowR; x++) {
      const d = Math.sqrt((x - glowCX) ** 2 + (y - glowCY) ** 2);
      if (d <= glowR) {
        const alpha = Math.round(30 * (1 - d / glowR));
        img.setPixelColor(rgb(37, 99, 235, alpha), x, y);
      }
    }
  }

  // 3. Document shape
  const dW  = Math.round(116 * s);
  const dH  = Math.round(148 * s);
  const dX  = Math.round((size - dW) / 2);
  const dY  = Math.round((size - dH) / 2);
  const ear = Math.round(30 * s); // dog-ear size

  // Document body (white), skip dog-ear area
  for (let y = dY; y < dY + dH; y++) {
    for (let x = dX; x < dX + dW; x++) {
      const lx = x - dX, ly = y - dY;
      // Skip dog-ear zone (top-right corner)
      if (ly < ear && lx >= dW - ear) continue;
      img.setPixelColor(WHITE, x, y);
    }
  }

  // Dog-ear fold (light blue triangle)
  for (let y = dY; y < dY + ear; y++) {
    for (let x = dX + dW - ear; x < dX + dW; x++) {
      const lx = x - (dX + dW - ear);
      const ly = y - dY;
      if (lx + ly >= ear) {
        img.setPixelColor(FOLD_BG, x, y);
      }
    }
  }

  // Dog-ear fold line (primary blue diagonal)
  for (let i = 0; i < ear; i++) {
    const px = dX + dW - ear + i;
    const py = dY + ear - 1 - i;
    img.setPixelColor(PRIMARY, px, py);
    if (i > 0) img.setPixelColor(PRIMARY_D, px - 1, py);
  }

  // 4. Content lines on document
  const lX  = dX + Math.round(12 * s);
  const lW0 = Math.round(60 * s);  // title bar (short, tight)
  const lW1 = Math.round((dW - 24 - ear / 1.2) * s / s); // wide lines
  const lW2 = Math.round(lW1 * 0.72);
  const lW3 = Math.round(lW1 * 0.55);
  const lH  = Math.max(4, Math.round(5 * s));
  let   lY  = dY + Math.round(20 * s);

  // Header label
  fillRect(img, lX, lY, Math.round(40 * s), Math.max(3, Math.round(4 * s)), rgb(148, 163, 184, 180));
  lY += Math.round(12 * s);

  // Invoice number block
  fillRect(img, lX, lY, Math.round(lW1 * 0.6), lH + 2, PRIMARY);
  lY += Math.round(16 * s);

  // Divider
  fillRect(img, lX, lY, dW - Math.round(16 * s), 1, rgb(226, 232, 240, 200));
  lY += Math.round(10 * s);

  // Item lines (3 rows)
  fillRect(img, lX, lY, lW1, lH, rgb(226, 232, 240, 255));
  lY += Math.round(12 * s);
  fillRect(img, lX, lY, lW2, lH, rgb(226, 232, 240, 255));
  lY += Math.round(12 * s);
  fillRect(img, lX, lY, lW3, lH, rgb(226, 232, 240, 200));
  lY += Math.round(16 * s);

  // Divider
  fillRect(img, lX, lY, dW - Math.round(16 * s), 1, rgb(226, 232, 240, 200));
  lY += Math.round(10 * s);

  // Total bar (blue block at bottom of doc)
  const totalH = Math.max(14, Math.round(20 * s));
  const totalY = dY + dH - Math.round(8 * s) - totalH;
  fillRoundedRect(img, dX + Math.round(8 * s), totalY, dW - Math.round(16 * s), totalH, Math.round(4 * s), PRIMARY);

  // White amount indicator inside total bar
  const amtW = Math.round(50 * s);
  const amtH = Math.max(3, Math.round(5 * s));
  const amtX = dX + dW - Math.round(8 * s) - amtW - Math.round(8 * s);
  const amtY = totalY + Math.round((totalH - amtH) / 2);
  fillRect(img, amtX, amtY, amtW, amtH, WHITE);

  // Small ₹ dot indicator
  fillCircle(img, dX + Math.round(20 * s), totalY + Math.round(totalH / 2), Math.max(2, Math.round(3 * s)), WHITE);

  return img;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  console.log('Creating InvoiceGenerator icon...');

  const buildDir = path.resolve('build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [16, 32, 48, 64, 128, 256];
  const frames = [];

  for (const size of sizes) {
    process.stdout.write(`  Drawing ${size}x${size}...`);
    const img = await drawIcon(size);
    // Get PNG buffer directly from Jimp
    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    frames.push({ size, buffer });
    console.log(' done');
  }

  console.log('  Bundling multi-resolution ICO...');
  const icoBuffer = buildIco(frames);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

  // Save 256px PNG as icon.png for reference
  fs.writeFileSync(path.join(buildDir, 'icon.png'), frames[frames.length - 1].buffer);

  console.log('\n✓ build/icon.ico created (16, 32, 48, 64, 128, 256 px)');
  console.log('✓ build/icon.png (256px reference copy)');
}

main().catch((err) => {
  console.error('Icon creation failed:', err.message);
  process.exit(1);
});
