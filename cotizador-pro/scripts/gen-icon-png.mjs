import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const W = 512;
const H = 512;
const raw = Buffer.alloc(W * H * 4);

// Fill solid dark (#060e20) with a subtle "N" letter in center
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const isN = (
      (x > 200 && x < 220 && y > 150 && y < 362) ||                        // left vertical
      (x > 292 && x < 312 && y > 150 && y < 362) ||                        // right vertical
      (Math.abs((y - 150) - (x - 200)) < 16 && x > 200 && x < 312 && y < 362) // diagonal
    );

    if (isN) {
      raw[i] = 0; raw[i+1] = 224; raw[i+2] = 254; raw[i+3] = 255;      // cyan #00e0fe
    } else {
      raw[i] = 6; raw[i+1] = 14; raw[i+2] = 32; raw[i+3] = 255;        // dark #060e20
    }
  }
}

// Build PNG manually (requires zlib for IDAT)
function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let cn = n;
    for (let k = 0; k < 8; k++) cn = cn & 1 ? 0xedb88320 ^ (cn >>> 1) : cn >>> 1;
    table[n] = cn;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([t, data]);
  const crcV = Buffer.alloc(4);
  crcV.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, t, data, crcV]);
}

// Signature
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);  // width
ihdr.writeUInt32BE(H, 4);  // height
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // color type RGBA
ihdr[10] = 0;  // compression
ihdr[11] = 0;  // filter
ihdr[12] = 0;  // interlace

// IDAT — raw data with filter byte (0 = None) per row
const scanlines = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  scanlines[y * (1 + W * 4)] = 0; // filter None
  raw.copy(scanlines, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = deflateSync(scanlines);

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync('build/icon.png', png);
console.log(`✓ build/icon.png created (${png.length} bytes)`);
