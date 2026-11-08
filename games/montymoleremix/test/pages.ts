/**
 * The room pager: all 21 rooms of Wanted: Monty Mole Remix drawn as pictures (Monty on the Run's picture, a room per file) and a
 * contact sheet, to look at. Not a check (test/retile.ts is).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/pages.ts <out-dir> [room...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { indicesPng } from '../../../tools/probe/render';
import { must } from '../../shared/test/must';
import { retile } from '../src/retile';
import { newGame, NONE, picture, place, standingSpot, step } from './harness';

const [outDir, ...only] = process.argv.slice(2);
if (outDir === undefined) throw new Error('usage: pages.ts <out-dir> [room...]');
fs.mkdirSync(outDir, { recursive: true });
const W = 320, H = 200;

const FRAMES = Number(process.env.FRAMES ?? 40);
const wanted = only.length ? only.map(Number) : ROOMS.map((r) => r.id);
const pictures: Uint8Array[] = [];
for (const id of wanted) {
  const room = retile(must(ROOMS[id], `room ${id}`));
  const spot = must(standingSpot(room, 16, 10), `a place to stand in room ${id}`);
  const p = newGame();
  const at = place(spot.col, spot.row);
  p.g.enterAt(id, at.x2, at.y);
  for (let i = 0; i < FRAMES; i++) step(p, NONE);
  const px = picture(p.g);
  pictures.push(px);
  indicesPng(path.join(outDir, `remix-room${String(id).padStart(2, '0')}.png`), px, W, H, 3);
}

// the contact sheet: four across
const across = 4;
const rows = Math.ceil(pictures.length / across);
const sheet = new Uint8Array(across * W * rows * H);
pictures.forEach((px, n) => {
  const ox = (n % across) * W, oy = Math.floor(n / across) * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sheet[(oy + y) * across * W + ox + x] = px[y * W + x] ?? 0;
});
indicesPng(path.join(outDir, 'remix-rooms.png'), sheet, across * W, rows * H, 1);
console.log(`${pictures.length} rooms in ${outDir}`);
