/**
 * Contact sheets of the original's graphics, for looking at (never committed): the 16 x 16 sprite frames at $C000
 * (32 bytes each: 16 rows of the left byte, then 16 rows of the right byte), and the 8 x 8 tiles at $D800 and $F800.
 * Each cell is numbered in rows of 16: frame f is at column f % 16, row f / 16.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/sheets.ts games/moley/build/code.ram /tmp/moley-sheets
 */
import fs from 'node:fs';
import path from 'node:path';
import { palettePng } from '../../../tools/png';

const [ramFile, outDir = '/tmp/moley-sheets'] = process.argv.slice(2);
if (!ramFile) throw new Error('usage: sheets.ts <64K dump> [outdir]');
const mem = new Uint8Array(fs.readFileSync(ramFile));
fs.mkdirSync(outDir, { recursive: true });
const PALETTE = [0x202020, 0xffffff, 0x404060];

/** `count` images of `size` pixels, `perRow` to a row, with a one-pixel grid (value 2) between them. */
function sheet(file: string, count: number, size: number, perRow: number, pixel: (n: number, x: number, y: number) => boolean) {
  const cell = size + 1, rows = Math.ceil(count / perRow);
  const w = perRow * cell + 1, h = rows * cell + 1;
  const px = new Uint8Array(w * h).fill(2);
  for (let n = 0; n < count; n++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    px[(Math.floor(n / perRow) * cell + 1 + y) * w + (n % perRow) * cell + 1 + x] = pixel(n, x, y) ? 1 : 0;
  }
  palettePng(file, px, w, h, PALETTE, 4);
}

const frames = 0xc0;
sheet(path.join(outDir, 'sprites.png'), frames, 16, 16, (n, x, y) => (mem[0xc000 + n * 32 + y + (x >> 3) * 16] & (0x80 >> (x & 7))) !== 0);
const tile = (base: number) => (n: number, x: number, y: number) => (mem[base + (n - 1) * 8 + y] & (0x80 >> x)) !== 0 && n > 0;
sheet(path.join(outDir, 'tiles.png'), 256, 8, 16, tile(0xd800));
sheet(path.join(outDir, 'tiles-ending.png'), 224, 8, 16, tile(0xf800));
console.log(`sheets in ${outDir}`);
