/**
 * The swimmer's four pictures at 1x and 4x (the crown over the first), to look at: nice -n 15 node tools/test.mjs games/montyworld/test/swim-shots.ts <out.png>
 */
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { SWIM_CROWN, SWIM_LEFT, SWIM_RIGHT } from '../src/art/pacific-swim';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: swim-shots.ts <out.png>');
const SCALE = 4, PAD = 2, CELL = 16 + PAD;
const sets = [SWIM_RIGHT, SWIM_LEFT];
const W = CELL * 5 * SCALE, H = (CELL * sets.length + CELL) * SCALE + 18;
const px = new Uint8Array(W * H);
const put = (rows: readonly string[], ox: number, oy: number, scale: number, colour: number) => {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) px[(oy + y * scale + dy) * W + ox + x * scale + dx] = colour;
  }));
};
sets.forEach((set, r) => set.forEach((rows, i) => {
  put(rows, i * CELL * SCALE, r * CELL * SCALE, SCALE, 1);
  put(rows, 4 * CELL * SCALE + i * 18, r * CELL * SCALE, 1, 1); // 1x
}));
put(SWIM_CROWN.right, 0, 2 * CELL * SCALE, SCALE, 10);
put(SWIM_CROWN.left, CELL * SCALE, 2 * CELL * SCALE, SCALE, 10);
rgbPng(out, indicesToRgb(px), W, H, 1);
