/**
 * The swimmer beside Monty walking, to look at: each row his walking picture (east, then west) and then the four swim pictures that way, at 4x in his grey on the sea's blue; the first two rows
 * bare, the next two with the lei (on land as worn, in the water the crown); the bare ones at 1x along the bottom. nice -n 15 node tools/test.mjs games/montyworld/test/swim-shots.ts <out.png>
 */
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { bankImage } from '../../montyotr/src/data';
import { swimCrown, swimPictures } from '../src/art/pacific-swim';
import { LEI_COLOUR, leiWorn } from '../src/art/pacific-lei';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: swim-shots.ts <out.png>');
const MONTY = 15, SEA = 6, SCALE = 4, CELL = 26, TOP = 16;
const swim = swimPictures(bankImage), crown = swimCrown(bankImage);
/** His walking picture (pointer `ptr`) as rows. */
const walk = (ptr: number) => Array.from({ length: 21 }, (_, y) => Array.from({ length: 24 }, (_, x) => (((bankImage[ptr * 64 + y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) ? '#' : '.')).join(''));
const sets = [
  { walk: walk(0x54), swim: swim.right, crown: crown.right, lei: false }, { walk: walk(0x50), swim: swim.left, crown: crown.left, lei: false },
  { walk: walk(0x54), swim: swim.right, crown: crown.right, lei: true }, { walk: walk(0x50), swim: swim.left, crown: crown.left, lei: true },
];
/** His walking picture with the lei on (the costume as worn on land: his picture under it cleared, the lei over it). */
const lei = leiWorn(bankImage);
const rowsOf = (block: Uint8Array, w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (((block[y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) ? '#' : '.')).join(''));
const W = CELL * 5 * SCALE, H = CELL * sets.length * SCALE + CELL * 2;
const px = new Uint8Array(W * H).fill(SEA);
const put = (rows: readonly string[], ox: number, oy: number, scale: number, colour: number) => {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) px[(oy + y * scale + dy) * W + ox + x * scale + dx] = colour;
  }));
};
sets.forEach((set, r) => {
  const oy = r * CELL * SCALE + TOP;
  if (set.lei) {
    const ptr = r % 2 ? 0x50 : 0x54;
    const body = lei.monty.find((m) => m.ptr === ptr), over = lei.hat.find((o) => o.ptr === ptr);
    if (body) put(rowsOf(body.block, 24, 21), 8, oy, SCALE, MONTY);
    if (over) put(rowsOf(over.block, 24, 21), 8 + over.dx * SCALE, oy + over.dy * SCALE, SCALE, LEI_COLOUR);
  } else put(set.walk, 8, oy, SCALE, MONTY);
  set.swim.forEach((rows, k) => {
    const i = k + 1;
    put(rows, i * CELL * SCALE + 8, oy, SCALE, MONTY);
    if (set.lei) put(set.crown, i * CELL * SCALE + 8, oy + crown.dy * SCALE, SCALE, LEI_COLOUR);
  });
  if (r < 2) [set.walk, ...set.swim].forEach((rows, i) => put(rows, i * CELL + 4, CELL * sets.length * SCALE + r * CELL + 2, 1, MONTY));
});
rgbPng(out, indicesToRgb(px), W, H, 1);
