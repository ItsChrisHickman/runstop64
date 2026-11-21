/**
 * Preview sheets of the Moscow art: the tiles (each tiled 3 x 2 so the repeat shows, its class beside it), the decorations, and the
 * creatures and items with all their frames at 4x. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/art-sheets.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { MOSCOW_CREATURES, MOSCOW_ITEMS } from '../src/art/creatures';
import { MOSCOW_DECOR } from '../src/art/decorations';
import { MOSCOW_TILES } from '../src/art/tiles';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: art-sheets.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const CLASS_NAME = ['NONE', 'SOLID', 'FLOOR', 'ROPE', 'DEADLY'] as const;

// ---- tiles and decorations
{
  const tiles = Object.entries(MOSCOW_TILES);
  const cv = new Canvas(330, 40 + tiles.length * 20 + 20);
  label(cv, 'MOSCOW TILES (3 X 2 EACH) AND THEIR CLASS', 4, 4, 1);
  tiles.forEach(([name, t], i) => {
    const y = 14 + i * 20;
    for (let k = 0; k < 6; k++) cv.glyph(t.chr, 0, 4 + (k % 3) * 8, y + Math.floor(k / 3) * 8, t.colour);
    label(cv, `${name} ${CLASS_NAME[t.cls]}`, 34, y + 5, 1);
  });
  cv.png(path.join(out, 'tiles.png'), 4);
}
{
  const entries = Object.entries(MOSCOW_DECOR);
  const cv = new Canvas(480, 200);
  let x = 4, y = 12, rowH = 0;
  label(cv, 'MOSCOW DECORATIONS', 4, 3, 1);
  for (const [name, d] of entries) {
    if (x + d.w * 8 > 476) { x = 4; y += rowH + 12; rowH = 0; }
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      const n = r * d.w + c;
      cv.glyph(d.chr, n * 8, x + c * 8, y + r * 8, typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
    }
    label(cv, name, x, y + d.h * 8 + 2, 11);
    x += Math.max(d.w * 8, name.length * 4) + 10;
    rowH = Math.max(rowH, d.h * 8 + 6);
  }
  cv.png(path.join(out, "decorations.png"), 4);
}

// ---- creatures and items
{
  const creatures = Object.entries(MOSCOW_CREATURES);
  const cv = new Canvas(8 * 20 + 10, creatures.length * 26 + 44);
  label(cv, 'CREATURES: FRAMES 0-3 GOING BACK, 4-7 GOING ON', 4, 3, 1);
  creatures.forEach(([name, c], i) => {
    const y = 12 + i * 26;
    label(cv, `${name} ${c.copy ? 'COPY' : ''}`, 4, y, 11);
    for (let f = 0; f < 8; f++) cv.enemyFrame(c.frames, f * 32, 4 + f * 20 + (f >= 4 ? 6 : 0), y + 7, c.colour);
  });
  const y = 12 + creatures.length * 26;
  label(cv, 'ITEMS', 4, y, 11);
  Object.values(MOSCOW_ITEMS).forEach((it, i) => cv.spriteBlock(it.block, 4 + i * 30, y + 7, it.colour));
  cv.png(path.join(out, 'sprites.png'), 4);
}

// ---- creatures large: the first four frames of each at 8x, and the items
{
  const creatures = Object.entries(MOSCOW_CREATURES);
  const cv = new Canvas(4 * 19, creatures.length * 18 + 22);
  creatures.forEach(([, c], i) => {
    for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, 1 + f * 19, i * 18 + 1, c.colour);
  });
  Object.values(MOSCOW_ITEMS).forEach((it, k) => cv.spriteBlock(it.block, 1 + k * 28, creatures.length * 18, it.colour));
  cv.png(path.join(out, 'creatures-large.png'), 8);
}
