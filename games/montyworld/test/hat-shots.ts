/**
 * Monty in the ushanka, close up and four times the size: walking, a jump to the right and to the left (the somersault), and on a rope
 * (a strip of the real engine's frames each, cropped round him). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/hat-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game, Input as Stick } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { newGame } from '../../shared/monty/test/bot';
import { itemIndex, standY } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: hat-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const W = 320, H = 200, CROP = 40, PER_ROW = 8;

const RIGHT: Stick = { ...NONE, right: true };
const LEFT: Stick = { ...NONE, left: true };
const JUMP_RIGHT: Stick = { ...NONE, right: true, fire: true };
const JUMP_LEFT: Stick = { ...NONE, left: true, fire: true };
const UP: Stick = { ...NONE, up: true };

function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

/** A game with Monty (in the hat or not) standing in a room, its creatures gone. */
function start(hat: boolean, room: number, col: number, floor: number): State {
  const s = newGame(WORLD, true);
  if (hat) wear(s.g, itemIndex(s.g, ROOM.platform, 1));
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
  s.g.enemies = [];
  s.g.enable &= 0x0f;
  s.g.vic.enable &= 0x0f;
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
  return s;
}

/** The crop round Monty's sprite, as C64 colour indices. */
function around(g: Game): Uint8Array {
  const px = shot(g), v = g.vic.sprites[3];
  const x0 = Math.max(0, Math.min(W - CROP, (v.x >= 504 ? v.x - 504 : v.x) - 24 - 8)), y0 = Math.max(0, Math.min(H - CROP, v.y - 50 - 12));
  const crop = new Uint8Array(CROP * CROP);
  for (let y = 0; y < CROP; y++) crop.set(px.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + CROP), y * CROP);
  return crop;
}

/** A strip of crops: `count` of them, `every` frames apart, with `stick(n)` held. */
function strip(s: State, count: number, every: number, stick: (n: number) => Stick): Uint8Array[] {
  const crops: Uint8Array[] = [];
  let f = 0;
  for (let n = 0; n < count; n++) {
    for (let k = 0; k < every; k++) frame(s, stick(f++));
    crops.push(around(s.g));
  }
  return crops;
}

function sheet(name: string, rows: readonly (readonly Uint8Array[])[], scale: number) {
  const img = new Uint8Array(CROP * PER_ROW * CROP * rows.length);
  rows.forEach((row, r) => row.forEach((c, i) => {
    for (let y = 0; y < CROP; y++) img.set(c.subarray(y * CROP, y * CROP + CROP), (r * CROP + y) * CROP * PER_ROW + i * CROP);
  }));
  rgbPng(path.join(out, name), indicesToRgb(img), CROP * PER_ROW, CROP * rows.length, scale);
}

for (const hat of [true, false]) {
  const tag = hat ? 'hat' : 'plain';
  sheet(`${tag}-walk.png`, [
    strip(start(hat, ROOM.streets, 12, 17), PER_ROW, 3, () => RIGHT),
    strip(start(hat, ROOM.streets, 18, 17), PER_ROW, 3, () => LEFT),
  ], 4);
  sheet(`${tag}-jump.png`, [
    strip(start(hat, ROOM.streets, 10, 17), PER_ROW, 5, (n) => (n === 0 ? JUMP_RIGHT : RIGHT)),
    strip(start(hat, ROOM.streets, 18, 17), PER_ROW, 5, (n) => (n === 0 ? JUMP_LEFT : LEFT)),
    strip(start(hat, ROOM.streets, 10, 17), PER_ROW, 5, (n) => (n === 0 ? { ...NONE, fire: true } : NONE)),
  ], 4);
  sheet(`${tag}-rope.png`, [strip(start(hat, ROOM.streets, 19, 17), PER_ROW, 4, () => UP)], 4);
}
// at the real size, in the room (1x and 4x of the whole picture)
const s = start(true, ROOM.streets, 12, 17);
for (let n = 0; n < 6; n++) frame(s, RIGHT);
const px = shot(s.g);
rgbPng(path.join(out, 'room-1x.png'), indicesToRgb(px), W, H, 1);
rgbPng(path.join(out, 'room-3x.png'), indicesToRgb(px), W, H, 3);
console.log('ok');
