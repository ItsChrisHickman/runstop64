import fs from 'node:fs';
import zlib from 'node:zlib';

/**
 * Filtered scanlines (a 0 filter byte, then RGB, per row) as an 8-bit RGB PNG (the CRC is PNG's CRC-32).
 * The one PNG writer the tools share (tools/probe/render.ts for the C64, tools/zx/screen.ts for the Spectrum).
 */
export function writePng(file: string, raw: Buffer, w: number, h: number) {
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/** Palette indices (W x H, one per pixel) as a PNG in `palette` (0xRRGGBB per index), each pixel scaled S times. */
export function palettePng(file: string, px: ArrayLike<number>, W: number, H: number, palette: ArrayLike<number>, S = 2) {
  const w = W * S, h = H * S, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = palette[px[Math.floor(y / S) * W + Math.floor(x / S)]];
    const o = y * (w * 3 + 1) + 1 + x * 3;
    raw[o] = c >> 16; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
  }
  writePng(file, raw, w, h);
}
