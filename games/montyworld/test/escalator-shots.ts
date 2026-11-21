/**
 * Moscow's escalators as the real engine draws them: each ridden from its foot (a few frames into the ride, the treads moving) and
 * walked onto from the wrong end (the treads turning him back). Pictures only: nothing is checked (mechanisms.ts does).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/escalator-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game, Input as Stick } from '../../montyotr/src/game';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { newGame } from './bot';
import { standY } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: escalator-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const W = 320, H = 200;
const RIGHT: Stick = { ...NONE, right: true };
const LEFT: Stick = { ...NONE, left: true };

function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

function start(room: number, col: number, floor: number): State {
  const s = newGame(WORLD, true);
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
  s.g.enemies = [];
  s.g.enable &= 0x0f;
  s.g.vic.enable &= 0x0f;
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
  return s;
}

/** The room after each of `at` frames of holding `stick` (a picture of it each, side by side in a sheet, a column of them a row). */
function film(name: string, s: State, stick: Stick, at: readonly number[], scale: number) {
  const pics: Uint8Array[] = [];
  let f = 0;
  for (const when of at) {
    while (f < when) { frame(s, stick); f++; }
    pics.push(shot(s.g));
  }
  const cols = Math.min(2, pics.length), rows = Math.ceil(pics.length / cols);
  const sheet = new Uint8Array(W * cols * H * rows);
  pics.forEach((px, i) => {
    for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W, y * W + W), ((Math.floor(i / cols) * H + y) * cols + (i % cols)) * W);
  });
  rgbPng(path.join(out, `${name}.png`), indicesToRgb(sheet), W * cols, H * rows, scale);
}

film('hall-ride-from-the-foot', start(ROOM.hall, 11, 9), RIGHT, [20, 40, 60, 75], 2);
film('hall-wrong-end-from-the-terrace', start(ROOM.hall, 19, 14), LEFT, [1, 8, 16, 24], 2);
film('platform-ride-from-the-foot', start(ROOM.platform, 17, 17), RIGHT, [30, 55, 80, 110], 2);
film('platform-wrong-end-from-the-head', start(ROOM.platform, 29, 9), LEFT, [1, 8, 16, 24], 2);

/** A close look at a band: the part of the room, many times the size, at two places of the steps. */
function zoom(name: string, room: number, col: number, floor: number, box: { x: number; y: number; w: number; h: number }) {
  const s = start(room, col, floor);
  const a = shot(s.g);
  const crop = new Uint8Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) crop.set(a.subarray((box.y + y) * W + box.x, (box.y + y) * W + box.x + box.w), y * box.w);
  rgbPng(path.join(out, `${name}.png`), indicesToRgb(crop), box.w, box.h, 8);
}
zoom('zoom-hall-band', ROOM.hall, 3, 9, { x: 120, y: 72, w: 96, h: 84 });
zoom('zoom-platform-band', ROOM.platform, 3, 9, { x: 150, y: 70, w: 110, h: 100 });
console.log('ok');
