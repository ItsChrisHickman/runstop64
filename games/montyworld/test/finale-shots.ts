/**
 * Pictures of Do Svidaniya Monty's finale on the beach, to look at: he walks east to the acai bowl in his headdress, the finale runs to GAME OVER, a frame saved every `every` frames (default 30) and strips of
 * them at 1x, four across (strip-0.png, strip-1.png...). Pictures only: rio-mechanisms.ts checks the beats.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/finale-shots.ts <out-dir> [every]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { RIO_ROOM as R } from '../src/rio';
import { at } from './mech-kit';
import { RIGHT } from './mech-kit';
import { itemIndex } from './route';
import { H, savePng, shot, W } from './shots-kit';

const out = process.argv[2];
if (!out) throw new Error('usage: finale-shots.ts <out-dir> [every]');
const every = Number(process.argv[3] ?? 30);
fs.mkdirSync(out, { recursive: true });

const s = at(R.bust, 3, 18, [[R.steak, 0], [R.drum, 0]], false, true);
wear(s.g, itemIndex(s.g, R.drum, 0));
const pics: Uint8Array[] = [];
pics.push(shot(s.g));
for (let f = 0; f < 200 && !s.g.completionActive; f++) frame(s, RIGHT);
let over = -1;
/** The beats: a picture the first time each of Monty's pictures shows (the walk, each spoonful's pose, each dance pose), and the troupe on. */
const beats: Uint8Array[] = [], seen = new Set<number>();
for (let f = 0; f < 3000 && (over < 0 || f < over + 60); f++) {
  frame(s, NONE);
  if (s.g.gameOverActive && over < 0) over = f;
  if (f % every === 0) pics.push(shot(s.g));
  const ptr = s.g.vic.sprites[3]?.ptr ?? 0, troupe = (s.g.vic.enable & 0x72) === 0x72;
  const key = ptr + (troupe ? 0x100 : 0);
  if (!seen.has(key) && s.g.vic.expandX & 0x08) { seen.add(key); beats.push(shot(s.g)); }
}
pics.forEach((px, i) => { if (i % 4 === 0) savePng(out, `finale-${String(i).padStart(3, '0')}.png`, px); });
const cols = 4, perStrip = 16;
for (let k = 0; k * perStrip < pics.length; k++) {
  const some = pics.slice(k * perStrip, (k + 1) * perStrip), rows = Math.ceil(some.length / cols);
  const big = new Uint8Array(W * cols * H * rows);
  some.forEach((px, i) => { for (let y = 0; y < H; y++) big.set(px.subarray(y * W, y * W + W), ((Math.floor(i / cols) * H + y) * cols + (i % cols)) * W); });
  rgbPng(path.join(out, `strip-${k}.png`), indicesToRgb(big), W * cols, H * rows, 1);
}
{
  const rows = Math.ceil(beats.length / 4), big = new Uint8Array(W * 4 * H * rows);
  beats.forEach((px, i) => { for (let y = 0; y < H; y++) big.set(px.subarray(y * W, y * W + W), ((Math.floor(i / 4) * H + y) * 4 + (i % 4)) * W); });
  rgbPng(path.join(out, 'beats.png'), indicesToRgb(big), W * 4, H * rows, 1);
}
console.log(`${beats.length} beats, ${pics.length} frames of the finale (GAME OVER at ${over}) in ${out}`);
