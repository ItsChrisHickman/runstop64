/**
 * Preview sheets of Japan's art (pre-production): the tiles (each tiled 3 x 2, its class beside it), the decorations, the creatures (all
 * 8 frames at 4x, then the first four large) with the items, and Monty in the ninja hood. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-sheets.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { JAPAN_CREATURES } from '../src/art/japan-creatures';
import { JAPAN_DECOR } from '../src/art/japan-decor';
import { HOOD_COLOUR, hoodWorn } from '../src/art/japan-hood';
import { JAPAN_ITEMS } from '../src/art/japan-items';
import { JAPAN_TILES } from '../src/art/japan-tiles';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: japan-sheets.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const CLASS_NAME = ['NONE', 'SOLID', 'FLOOR', 'ROPE', 'DEADLY'] as const;
const MONTY = 15;

{
  const tiles = Object.entries(JAPAN_TILES);
  const half = Math.ceil(tiles.length / 2);
  const cv = new Canvas(330, 14 + half * 20);
  label(cv, 'JAPAN TILES (3 X 2 EACH) AND THEIR CLASS', 4, 4, 1);
  tiles.forEach(([name, t], i) => {
    const x0 = i < half ? 0 : 165, y = 14 + (i % half) * 20;
    for (let k = 0; k < 6; k++) cv.glyph(t.chr, 0, x0 + 4 + (k % 3) * 8, y + Math.floor(k / 3) * 8, t.colour);
    label(cv, `${name.slice(2)} ${CLASS_NAME[t.cls]}`, x0 + 32, y + 5, 1);
  });
  cv.png(path.join(out, 'tiles.png'), 4);
}
{
  const cv = new Canvas(520, 330);
  let x = 4, y = 12, rowH = 0;
  label(cv, 'JAPAN DECORATIONS', 4, 3, 1);
  for (const [name, d] of Object.entries(JAPAN_DECOR)) {
    if (x + d.w * 8 > 516) { x = 4; y += rowH + 12; rowH = 0; }
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      const n = r * d.w + c;
      cv.glyph(d.chr, n * 8, x + c * 8, y + r * 8, typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
    }
    label(cv, name.slice(2), x, y + d.h * 8 + 2, 11);
    x += Math.max(d.w * 8, name.length * 4) + 8;
    rowH = Math.max(rowH, d.h * 8 + 6);
  }
  cv.png(path.join(out, 'decorations.png'), 3);
}
{
  const creatures = Object.entries(JAPAN_CREATURES);
  const cv = new Canvas(8 * 20 + 10, creatures.length * 26 + 50);
  label(cv, 'CREATURES: FRAMES 0-3 GOING BACK, 4-7 GOING ON', 4, 3, 1);
  creatures.forEach(([name, c], i) => {
    const y = 12 + i * 26;
    label(cv, `${name.slice(2)} ${c.copy ? 'COPY' : ''}`, 4, y, 11);
    for (let f = 0; f < 8; f++) cv.enemyFrame(c.frames, f * 32, 4 + f * 20 + (f >= 4 ? 6 : 0), y + 7, c.colour);
  });
  const y = 12 + creatures.length * 26;
  label(cv, 'ITEMS', 4, y, 11);
  Object.values(JAPAN_ITEMS).forEach((it, i) => cv.spriteBlock(it.block, 4 + i * 30, y + 7, it.colour));
  cv.png(path.join(out, 'creatures.png'), 4);
}
{
  const creatures = Object.entries(JAPAN_CREATURES);
  const cv = new Canvas(4 * 19, creatures.length * 18 + 22);
  creatures.forEach(([, c], i) => {
    for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, 1 + f * 19, i * 18 + 1, c.colour);
  });
  Object.values(JAPAN_ITEMS).forEach((it, k) => cv.spriteBlock(it.block, 1 + k * 28, creatures.length * 18, it.colour));
  cv.png(path.join(out, 'creatures-large.png'), 8);
}
{
  // Monty plain and in the hood: his walk (left, right), the rope and a somersault picture each way
  const worn = hoodWorn(bankImage);
  const ptrs = [0x50, 0x52, 0x54, 0x56, 0x58, 0x5a, 0x60, 0x6c];
  const cv = new Canvas(ptrs.length * 34, 76);
  ptrs.forEach((ptr, i) => {
    const x = 4 + i * 34;
    cv.spriteBlock(bankImage.subarray(ptr * 64, ptr * 64 + 63), x, 8, MONTY);
    const w = worn.monty.find((m) => m.ptr === ptr), h = worn.hat.find((o) => o.ptr === ptr);
    if (w === undefined || h === undefined) throw new Error(`no costume picture for ${ptr}`);
    cv.spriteBlock(w.block, x, 44, MONTY);
    cv.spriteBlock(h.block, x + h.dx, 44 + h.dy, HOOD_COLOUR);
  });
  cv.png(path.join(out, 'hood.png'), 5);
}
