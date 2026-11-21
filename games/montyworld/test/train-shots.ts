/**
 * The Trans-Siberian as the real engine draws it: Moscow's platform (the train standing, then with him aboard and rolling), the dining car, the
 * sleeper and the tender, one picture each, and a strip of one car's frames a few steps apart (the landscape in its windows and the sleepers
 * under it going by, the wheels turning). Pictures only: nothing is checked (train.ts's mechanisms are in siberia-mechanisms.ts).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/train-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { itemIndex } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: train-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const W = 320, H = 200;

const standing = (col: number, floor: number) => ({ x2: 0x0c + (col + 4) * 4, y: 0x32 + (floor - 2 + 3) * 8 });

function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

/** A game with Monty (in the ushanka) standing in a room, the room's creatures cleared when asked: after each of the `frames` the picture is taken. */
function session(room: number, col: number, floor: number, frames: readonly number[], clear = false): Uint8Array[] {
  const g = new Game(WORLD);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  const s: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  wear(g, itemIndex(g, ROOM.platform, 1));
  const at = standing(col, floor);
  enterRoom(g, room, at.x2, at.y);
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  if (clear) g.enemies = [];
  const pics: Uint8Array[] = [];
  let done = 0;
  for (const f of frames) {
    for (; done < f; done++) frame(s, NONE);
    pics.push(shot(g));
  }
  return pics;
}

const save = (name: string, px: Uint8Array, w = W, h = H) => rgbPng(path.join(out, name), indicesToRgb(px), w, h, 3);
const first = (pics: Uint8Array[]): Uint8Array => pics[0] ?? new Uint8Array(W * H);

// the platform: standing on it (the train stands), then in the car (it rolls)
save('0-platform-standing.png', first(session(ROOM.station, 17, 17, [60])));
save('1-platform-aboard.png', first(session(ROOM.station, 24, 17, [60], true)));
save('2-dining-car.png', first(session(SIB.gravy, 8, 17, [60], true)));
save('3-sleeper.png', first(session(SIB.sleeper, 3, 17, [60], true)));
save('4-tender.png', first(session(SIB.coal, 3, 9, [60])));
// (the roofs, with a mouth under way)
save('5-dining-car-roof.png', first(session(SIB.gravy, 8, 9, [40 + 130 + 48 + 150])));

// the strip: one car, frames 12 steps (24 frames) apart
const frames = [60, 84, 108, 132];
const strip = session(SIB.gravy, 8, 17, frames, true);
const sheet = new Uint8Array(W * strip.length * H);
strip.forEach((px, i) => { for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W, y * W + W), y * W * strip.length + i * W); });
rgbPng(path.join(out, 'strip-dining-car.png'), indicesToRgb(sheet), W * strip.length, H, 2);
// and the window and rail alone, many steps (a crop of rows 11-14 and 17-19 of the playfield) to see the scenery slide
const crops = session(SIB.gravy, 8, 17, [60, 66, 72, 78, 84, 90], true);
const cw = 8 * 10, ch = 8 * 4;
const cropSheet = new Uint8Array(cw * crops.length * ch);
crops.forEach((px, i) => {
  for (let y = 0; y < ch; y++) cropSheet.set(px.subarray((8 * 14 + y) * W + 8 * 6, (8 * 14 + y) * W + 8 * 6 + cw), y * cw * crops.length + i * cw);
});
rgbPng(path.join(out, 'strip-window.png'), indicesToRgb(cropSheet), cw * crops.length, ch, 4);

// the sky: the sleeper (two mouths) and the tender, the dining car's edge flashing as the mouth is about to come, and the backdrop moving (rows 2-8 of the
// playfield, frames 64 apart: the mountains shift a pixel every 8 frames, the pines every 4, the poles and smoke every 2)
save('6-dining-car-warning.png', first(session(SIB.gravy, 8, 9, [40 + 130 + 12])));
save('7-dining-car-mouth.png', first(session(SIB.gravy, 8, 9, [40 + 130 + 48 + 200])));
save('8-sleeper-roof.png', first(session(SIB.sleeper, 3, 9, [60])));
const skyFrames = session(SIB.gravy, 8, 17, [60, 124, 188, 252], true);
const sy = 8 * 5, sh = 8 * 8;
const skySheet = new Uint8Array(W * skyFrames.length * sh);
skyFrames.forEach((px, i) => skySheet.set(px.subarray(sy * W, (sy + sh) * W), i * W * sh));
rgbPng(path.join(out, 'strip-sky.png'), indicesToRgb(skySheet), W, sh * skyFrames.length, 3);
