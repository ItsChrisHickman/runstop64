/**
 * Preview sheets of the Pacific's art: the tiles (each tiled 3 x 2, its class beside it), the decorations, the creatures (all 8 frames
 * at 4x, then the first four large at 8x), the items, and Monty in the lei. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-sheets.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { PACIFIC_CREATURES } from '../src/art/pacific-creatures';
import { PACIFIC_DECOR } from '../src/art/pacific-decor';
import { PACIFIC_ITEMS } from '../src/art/pacific-items';
import { LEI_COLOUR, leiWorn } from '../src/art/pacific-lei';
import { PACIFIC_TILES } from '../src/art/pacific-tiles';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-sheets.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const CLASS_NAME = ['NONE', 'SOLID', 'FLOOR', 'ROPE', 'DEADLY'] as const;

{
  const tiles = Object.entries(PACIFIC_TILES);
  const half = Math.ceil(tiles.length / 2);
  const cv = new Canvas(330, 30 + half * 20);
  label(cv, 'PACIFIC TILES (3 X 2 EACH) AND THEIR CLASS', 4, 4, 1);
  tiles.forEach(([name, t], i) => {
    const x0 = i < half ? 0 : 165, y = 14 + (i % half) * 20;
    for (let k = 0; k < 6; k++) cv.glyph(t.chr, 0, x0 + 4 + (k % 3) * 8, y + Math.floor(k / 3) * 8, t.colour);
    label(cv, `${name.slice(3)} ${CLASS_NAME[t.cls]}`, x0 + 34, y + 5, 1);
  });
  cv.png(path.join(out, 'tiles.png'), 4);
}
{
  const cv = new Canvas(640, 360);
  let x = 4, y = 12, rowH = 0;
  label(cv, 'PACIFIC DECORATIONS', 4, 3, 1);
  for (const [name, d] of Object.entries(PACIFIC_DECOR)) {
    if (x + d.w * 8 > 636) { x = 4; y += rowH + 10; rowH = 0; }
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      const n = r * d.w + c;
      cv.glyph(d.chr, n * 8, x + c * 8, y + r * 8, typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
    }
    label(cv, name.slice(3), x, y + d.h * 8 + 2, 11);
    x += Math.max(d.w * 8, name.length * 4) + 8;
    rowH = Math.max(rowH, d.h * 8 + 6);
  }
  cv.png(path.join(out, 'decorations.png'), 3);
}
{
  const creatures = Object.entries(PACIFIC_CREATURES);
  const cv = new Canvas(8 * 20 + 10, creatures.length * 26 + 50);
  label(cv, 'CREATURES: FRAMES 0-3 GOING BACK, 4-7 GOING ON', 4, 3, 1);
  creatures.forEach(([name, c], i) => {
    const y = 12 + i * 26;
    label(cv, `${name.slice(3)} ${c.copy ? 'COPY' : ''}`, 4, y, 11);
    for (let f = 0; f < 8; f++) cv.enemyFrame(c.frames, f * 32, 4 + f * 20 + (f >= 4 ? 6 : 0), y + 7, c.colour);
  });
  const y = 12 + creatures.length * 26;
  label(cv, 'ITEMS', 4, y, 11);
  Object.values(PACIFIC_ITEMS).forEach((it, i) => cv.spriteBlock(it.block, 4 + i * 30, y + 7, it.colour));
  cv.png(path.join(out, 'sprites.png'), 4);
}
{
  const creatures = Object.entries(PACIFIC_CREATURES);
  const cv = new Canvas(4 * 19, creatures.length * 18 + 22);
  creatures.forEach(([, c], i) => {
    for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, 1 + f * 19, i * 18 + 1, c.colour);
  });
  Object.values(PACIFIC_ITEMS).forEach((it, k) => cv.spriteBlock(it.block, 1 + k * 28, creatures.length * 18, it.colour));
  cv.png(path.join(out, 'creatures-large.png'), 8);
}
{
  // Monty with and without the lei: the walk's pictures, the rope and a somersault, at 6x
  const worn = leiWorn(bankImage);
  const ptrs = [0x50, 0x51, 0x52, 0x54, 0x55, 0x58, 0x5a, 0x60, 0x6c];
  const cv = new Canvas(ptrs.length * 30 + 4, 2 * 34);
  ptrs.forEach((ptr, i) => {
    const x = 4 + i * 30;
    cv.spriteBlock(bankImage.subarray(ptr * 64, ptr * 64 + 63), x, 4, 9);
    const m = worn.monty.find((w) => w.ptr === ptr);
    if (m !== undefined) cv.spriteBlock(m.block, x, 38, 9);
    const o = worn.hat.find((w) => w.ptr === ptr);
    if (o !== undefined) cv.spriteBlock(o.block, x + o.dx, 38 + o.dy, LEI_COLOUR);
  });
  cv.png(path.join(out, 'lei.png'), 6);
}
