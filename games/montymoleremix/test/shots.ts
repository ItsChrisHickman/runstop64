/**
 * The prototype's pictures: Wanted's rooms in Monty on the Run's tiles and colours, with Monty on his own engine standing in them,
 * and a walk and a jump drawn as a trail of his frames. Not a check (test/retile.ts is): a render to look at.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { indicesPng } from '../../../tools/probe/render';
import { must } from '../../shared/test/must';
import type { Game } from '../../montyotr/src/game';
import { retile } from '../src/retile';
import { ledgeEnd, NONE, PLAY_COL, picture, stage, standingSpot, step } from './stage';

const outDir = process.argv[2];
if (outDir === undefined) throw new Error('usage: shots.ts <out-dir>');
fs.mkdirSync(outDir, { recursive: true });
const W = 320, H = 200;

const png = (file: string, px: ArrayLike<number>, w = W, h = H, scale = 3) => indicesPng(path.join(outDir, file), px, w, h, scale);

/** The picture with Monty and every sprite left out. */
function backdrop(g: Game): Uint8Array {
  const shown = g.vic.enable;
  g.vic.enable = 0;
  const bg = picture(g);
  g.vic.enable = shown;
  return bg;
}

/** A window of a picture. */
function crop(px: Uint8Array, x: number, y: number, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = px[(y + j) * W + x + i] ?? 0;
  return out;
}

/** Monty's place on the 320 x 200 picture (the sprite's top left: x is the VIC's, less 24, y less 50). */
function montyAt(g: Game): { x: number; y: number } {
  const s = must(g.vic.sprites[3], 'sprite 3');
  return { x: s.x - 24, y: s.y - 50 };
}

for (const [id, near] of [[0, { col: 6, row: 4 }], [8, { col: 8, row: 15 }]] as const) {
  const room = retile(must(ROOMS[id], `room ${id}`));
  const spot = must(standingSpot(room, near.col, near.row), `a place to stand in room ${id}`);
  const g = stage(room, spot);
  for (let i = 0; i < 4; i++) step(g, NONE);
  const nn = String(id).padStart(2, '0');
  png(`remix-room${nn}.png`, picture(g));
  console.log(`room ${id}: Monty at cell (${spot.col}, ${spot.row}); ${room.slots.map((s) => `${s.role}${s.tile === null ? '' : ':$' + s.tile.toString(16)}`).join(' ')}; coal ${room.coal.length}`);
  if (id !== 0 && id !== 8) continue;

  // a walk right along the ledge to its end, a jump from the edge, and on: his frames as a trail on the room, and a strip of the jump
  const bg = backdrop(g);
  const trail = Uint8Array.from(bg);
  const shots: Uint8Array[] = [];
  const right = { ...NONE, right: true };
  const takeoff = 0x0c + (PLAY_COL + ledgeEnd(room, spot)) * 4 + 3;
  let n = 0, highest = 999, lowest = 0, from = montyAt(g).x, to = from, jumped = -1;
  const frame = (stick: typeof NONE) => {
    step(g, stick);
    const here = picture(g);
    if (n % 3 === 0) for (let k = 0; k < trail.length; k++) if (here[k] !== bg[k]) trail[k] = here[k] ?? 0;
    if (jumped >= 0 && (n - jumped) % 3 === 0 && shots.length < 12) shots.push(here);
    const m = montyAt(g);
    if (jumped >= 0) { highest = Math.min(highest, m.y); lowest = Math.max(lowest, m.y); }
    to = m.x;
    n++;
  };
  for (let i = 0; i < 200 && g.x2 < takeoff; i++) frame(right);
  jumped = n;
  const jumpFrom = montyAt(g);
  frame({ ...right, fire: true });
  for (let i = 0; i < 70; i++) frame(right);
  png(`remix-room${nn}-walk-jump.png`, trail);
  // the strip: every 3rd frame from the take-off, a window round Monty
  const win = { w: 80, h: 80 };
  const strip = new Uint8Array(win.w * shots.length * win.h);
  shots.forEach((f, k) => {
    const x = Math.max(0, Math.min(W - win.w, jumpFrom.x + 24 + k * 4 - win.w / 2));
    const y = Math.max(0, Math.min(H - win.h, jumpFrom.y - 44));
    const c = crop(f, x, y, win.w, win.h);
    for (let j = 0; j < win.h; j++) for (let i = 0; i < win.w; i++) strip[j * win.w * shots.length + k * win.w + i] = c[j * win.w + i] ?? 0;
  });
  png(`remix-room${nn}-jump-strip.png`, strip, win.w * shots.length, win.h, 3);
  console.log(`  walked from x ${from} to the edge, jumped at x ${jumpFrom.x}, landed at x ${to}; the jump rose to y ${highest} (from ${jumpFrom.y}) and lowest y ${lowest}`);
}
