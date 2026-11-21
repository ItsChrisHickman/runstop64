/**
 * Moscow's nine rooms as the real engine draws them (the game's own frame, Monty in it, the creatures and icicles where they are a
 * moment in), one picture each, a contact sheet of all nine, and each beside one of Monty on the Run's rooms (compare-*.png) for judging
 * the art (the mix of textures, open black, ragged ceilings) against the original's. Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/moscow-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { wear } from '../../montyotr/src/items';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { itemIndex } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: moscow-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const W = 320, H = 200;

/** Monty standing on a floor: his left cell and the floor's row. */
const standing = (col: number, floor: number) => ({ x2: 0x0c + (col + 4) * 4, y: 0x32 + (floor - 2 + 3) * 8 });

/** The spots he is shown at. */
const SPOTS: readonly { room: number; name: string; col: number; floor: number; wearing?: boolean; compare: number }[] = [
  { room: ROOM.start, name: '0-moscow-mole', col: 3, floor: 17, compare: 0x02 },
  { room: ROOM.streets, name: '1-snow-place', col: 2, floor: 7, compare: 0x03 },
  { room: ROOM.square, name: '2-seeing-red', col: 3, floor: 17, compare: 0x06 },
  { room: ROOM.domes, name: '3-onion-dome', col: 22, floor: 17, compare: 0x0a },
  { room: ROOM.kremlin, name: '4-kremlin-gremlins', col: 1, floor: 6, wearing: true, compare: 0x0e },
  { room: ROOM.station, name: '5-siberia-you-later', col: 16, floor: 9, compare: 0x13 },
  { room: ROOM.gum, name: '6-stuck-like-gum', col: 22, floor: 17, compare: 0x15 },
  { room: ROOM.hall, name: '7-escalating-tensions', col: 8, floor: 9, compare: 0x17 },
  { room: ROOM.platform, name: '8-underground-movement', col: 22, floor: 9, compare: 0x1b },
];

function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

function placed(data: typeof WORLD, room: number, col: number, floor: number, frames: number, hat = false): Uint8Array {
  const g = new Game(data);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  const s: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  const at = standing(col, floor);
  if (hat) wear(g, itemIndex(g, ROOM.platform, 1));
  enterRoom(g, room, at.x2, at.y);
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE); // (the arrival's sparkle over)
  for (let n = 0; n < frames; n++) frame(s, NONE);
  return shot(g);
}

const sheet = new Uint8Array(W * 3 * H * 3);
SPOTS.forEach((s, i) => {
  const px = placed(WORLD, s.room, s.col, s.floor, 90, s.wearing === true);
  rgbPng(path.join(out, `room-${s.name}.png`), indicesToRgb(px), W, H, 3);
  for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W, y * W + W), ((Math.floor(i / 3) * H + y) * 3 + (i % 3)) * W);
});
rgbPng(path.join(out, 'sheet.png'), indicesToRgb(sheet), W * 3, H * 3, 1);

// the same rooms beside Monty on the Run's
for (const s of SPOTS) {
  const mine = placed(WORLD, s.room, s.col, s.floor, 90, s.wearing === true);
  const g = new Game(MOTR);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false };
  g.start();
  const st: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(st, NONE);
  enterRoom(g, s.compare, 0x40, 0xb2);
  for (let n = 0; n < 30; n++) frame(st, NONE);
  const theirs = shot(g);
  const both = new Uint8Array(W * 2 * H);
  for (let y = 0; y < H; y++) { both.set(mine.subarray(y * W, y * W + W), y * W * 2); both.set(theirs.subarray(y * W, y * W + W), y * W * 2 + W); }
  rgbPng(path.join(out, `compare-${s.name}.png`), indicesToRgb(both), W * 2, H, 2);
}
