/**
 * Preview sheets of Siberia's art: the tiles (each tiled 3 x 2, its class beside it), the decorations, and the creatures (all 8
 * frames at 4x, then the first four large at 8x) and items. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-sheets.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { CART, SIBERIA_ITEMS } from '../src/art/siberia-items';
import { SIBERIA_CREATURES } from '../src/art/siberia-creatures';
import { SIBERIA_DECOR } from '../src/art/siberia-decor';
import { SIBERIA_TILES } from '../src/art/siberia-tiles';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-sheets.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const CLASS_NAME = ['NONE', 'SOLID', 'FLOOR', 'ROPE', 'DEADLY'] as const;

{
  const tiles = Object.entries(SIBERIA_TILES);
  const cv = new Canvas(330, 30 + tiles.length * 20);
  label(cv, 'SIBERIA TILES (3 X 2 EACH) AND THEIR CLASS', 4, 4, 1);
  tiles.forEach(([name, t], i) => {
    const y = 14 + i * 20;
    for (let k = 0; k < 6; k++) cv.glyph(t.chr, 0, 4 + (k % 3) * 8, y + Math.floor(k / 3) * 8, t.colour);
    label(cv, `${name} ${CLASS_NAME[t.cls]}`, 34, y + 5, 1);
  });
  cv.png(path.join(out, 'tiles.png'), 4);
}
{
  const cv = new Canvas(480, 220);
  let x = 4, y = 12, rowH = 0;
  label(cv, 'SIBERIA DECORATIONS', 4, 3, 1);
  for (const [name, d] of Object.entries(SIBERIA_DECOR)) {
    if (x + d.w * 8 > 476) { x = 4; y += rowH + 12; rowH = 0; }
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      const n = r * d.w + c;
      cv.glyph(d.chr, n * 8, x + c * 8, y + r * 8, typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
    }
    label(cv, name, x, y + d.h * 8 + 2, 11);
    x += Math.max(d.w * 8, name.length * 4) + 10;
    rowH = Math.max(rowH, d.h * 8 + 6);
  }
  cv.png(path.join(out, 'decorations.png'), 4);
}
{
  const creatures = Object.entries(SIBERIA_CREATURES);
  const cv = new Canvas(8 * 20 + 10, creatures.length * 26 + 50);
  label(cv, 'CREATURES: FRAMES 0-3 GOING BACK, 4-7 GOING ON', 4, 3, 1);
  creatures.forEach(([name, c], i) => {
    const y = 12 + i * 26;
    label(cv, `${name} ${c.copy ? 'COPY' : ''}`, 4, y, 11);
    for (let f = 0; f < 8; f++) cv.enemyFrame(c.frames, f * 32, 4 + f * 20 + (f >= 4 ? 6 : 0), y + 7, c.colour);
  });
  const y = 12 + creatures.length * 26;
  label(cv, 'ITEMS AND THE CART', 4, y, 11);
  Object.values(SIBERIA_ITEMS).forEach((it, i) => cv.spriteBlock(it.block, 4 + i * 30, y + 7, it.colour));
  cv.spriteBlock(CART.top, 100, y + 7, CART.colour);
  cv.spriteBlock(CART.bottom, 130, y + 7, CART.colour);
  cv.png(path.join(out, 'sprites.png'), 4);
}
{
  const creatures = Object.entries(SIBERIA_CREATURES);
  const cv = new Canvas(4 * 19, creatures.length * 18 + 22);
  creatures.forEach(([, c], i) => {
    for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, 1 + f * 19, i * 18 + 1, c.colour);
  });
  Object.values(SIBERIA_ITEMS).forEach((it, k) => cv.spriteBlock(it.block, 1 + k * 28, creatures.length * 18, it.colour));
  cv.png(path.join(out, 'creatures-large.png'), 8);
}
