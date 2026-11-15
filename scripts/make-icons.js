const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Math helpers
function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function mix(c1, c2, t) {
  t = clamp(t, 0, 1);
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
    Math.round(c1[3] + (c2[3] - c1[3]) * t),
  ];
}

/**
 * Pixel renderer for Shaban Traditional Foods Billing icon
 * Maskable mode fills full square with background and respects 10-15% safe margin.
 */
function renderIconPixel(x, y, size, isMaskable) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Background colors:
  // Dark luxury slate background #0f1117
  const bgDark = [15, 17, 23, 255];
  // Warm orange/amber brand gradient: #c8521a to #e66a2c
  const orange1 = [200, 82, 26, 255];
  const orange2 = [230, 106, 44, 255];
  const white = [255, 255, 255, 255];
  const gold = [255, 214, 102, 255];

  // In maskable mode, the full canvas is filled with dark slate
  // Badge scale: in standard mode, badge radius is ~0.44 * size; in maskable mode, ~0.38 * size (inside safe zone)
  const badgeRadius = isMaskable ? size * 0.40 : size * 0.46;
  const cornerRadius = badgeRadius * 0.45;

  // Signed distance to rounded rectangle badge
  const nx = Math.abs(x - cx);
  const ny = Math.abs(y - cy);
  const bHalf = badgeRadius;
  const dx = Math.max(0, nx - (bHalf - cornerRadius));
  const dy = Math.max(0, ny - (bHalf - cornerRadius));
  const dDist = Math.hypot(dx, dy);
  const isInsideBadge = (nx <= bHalf - cornerRadius && ny <= bHalf) ||
                        (ny <= bHalf - cornerRadius && nx <= bHalf) ||
                        (dDist <= cornerRadius);

  // Default outside color
  let color = isMaskable ? [...bgDark] : [0, 0, 0, 0];

  if (isInsideBadge) {
    // Gradient inside badge from top-left orange2 to bottom-right orange1
    const gradT = ((x - cx + badgeRadius) + (y - cy + badgeRadius)) / (badgeRadius * 4);
    let badgeColor = mix(orange2, orange1, gradT);

    // Subtle dark badge border/shadow
    const distToEdge = Math.min(
      Math.abs(bHalf - nx),
      Math.abs(bHalf - ny),
      cornerRadius - dDist
    );
    if (distToEdge < size * 0.015) {
      badgeColor = mix(gold, badgeColor, 0.4);
    }

    color = badgeColor;

    // Center emblem: Stylized "STF" + Invoice Document / Grain
    // Let's draw clean geometric elements:
    // A) Central card / bill shape in pure white
    const cardW = size * (isMaskable ? 0.38 : 0.44);
    const cardH = size * (isMaskable ? 0.46 : 0.52);
    const cardCx = cx;
    const cardCy = cy;
    const cardX1 = cardCx - cardW / 2;
    const cardX2 = cardCx + cardW / 2;
    const cardY1 = cardCy - cardH / 2;
    const cardY2 = cardCy + cardH / 2;
    const cardRadius = size * 0.04;

    const inCard =
      x >= cardX1 && x <= cardX2 && y >= cardY1 && y <= cardY2 &&
      (Math.hypot(Math.max(0, Math.abs(x - cardCx) - (cardW / 2 - cardRadius)),
                  Math.max(0, Math.abs(y - cardCy) - (cardH / 2 - cardRadius))) <= cardRadius);

    if (inCard) {
      color = [...white];

      // Inner card graphics:
      // 1. Header banner on card (dark slate bar)
      const bannerH = cardH * 0.22;
      if (y >= cardY1 && y <= cardY1 + bannerH) {
        color = [15, 17, 23, 255]; // dark bar

        // Little gold crown / chef badge in top banner
        const iconCy = cardY1 + bannerH / 2;
        if (Math.hypot(x - cardCx, y - iconCy) < size * 0.025) {
          color = [...gold];
        }
      }

      // 2. Receipt item lines
      const lineX1 = cardX1 + cardW * 0.16;
      const lineX2 = cardX2 - cardW * 0.16;
      const lineH = size * 0.018;

      const lines = [
        { y: cardY1 + cardH * 0.35, w: 0.68, col: orange1 },
        { y: cardY1 + cardH * 0.48, w: 0.68, col: [140, 145, 155, 255] },
        { y: cardY1 + cardH * 0.60, w: 0.52, col: [140, 145, 155, 255] },
        { y: cardY1 + cardH * 0.76, w: 0.68, col: orange2 }, // Total bar
      ];

      for (const line of lines) {
        const lx2 = lineX1 + (lineX2 - lineX1) * line.w;
        if (x >= lineX1 && x <= lx2 && y >= line.y && y <= line.y + lineH) {
          color = line.col;
        }
      }

      // Checkmark / Rupee badge on bottom right of the card
      const badgeX = cardX2 - size * 0.02;
      const badgeY = cardY2 - size * 0.02;
      const badgeR = size * 0.08;
      if (dist(x, y, badgeX, badgeY) <= badgeR) {
        color = [34, 197, 94, 255]; // emerald green verified badge
        if (dist(x, y, badgeX, badgeY) <= badgeR * 0.35) {
          color = [...white];
        }
      }
    }
  }

  return color;
}

const outDir = path.join(__dirname, '..', 'frontend', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
  { name: 'favicon-32.png', size: 32, maskable: false },
];

for (const t of targets) {
  const buf = createPng(t.size, t.size, (x, y, w, h) => renderIconPixel(x, y, w, t.maskable));
  const fullPath = path.join(outDir, t.name);
  fs.writeFileSync(fullPath, buf);
  console.log(`✅ Generated ${t.name} (${t.size}x${t.size}, ${buf.length} bytes)`);
}

console.log('🎉 All PWA icons generated successfully in frontend/public/icons!');
