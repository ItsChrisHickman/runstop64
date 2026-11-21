/**
 * Siberia's nine rooms as the real engine draws them (the game's own frame, Monty in it, the creatures, mouths and ice where they are
 * a moment in), one picture each and a contact sheet; the dark shaft with and without the lamp; the cracking ice in its stages; the
 * tunnel mouth under way; and each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { itemIndex } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });
const W = 320, H = 200;

const standing = (col: number, floor: number) => ({ x2: 0x0c + (col + 4) * 4, y: 0x32 + (floor - 2 + 3) * 8 });

/** The spots he is shown at: the room, how many frames in, and the room of Monty on the Run to compare with. */
const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: SIB.gravy, name: '9-gravy-train', col: 2, floor: 9, frames: 150, compare: 0x13 },
  { room: SIB.sleeper, name: '10-sleeper-hit', col: 3, floor: 9, frames: 190, compare: 0x15 },
  { room: SIB.coal, name: '11-coal-comfort', col: 2, floor: 9, frames: 60, compare: 0x17 },
  { room: SIB.pines, name: '12-pine-to-be-wild', col: 22, floor: 17, frames: 60, compare: 0x0a },
  { room: SIB.yeti, name: '13-yeti-or-not', col: 26, floor: 17, frames: 60, compare: 0x0e },
  { room: SIB.mine, name: '14-mine-all-mine', col: 2, floor: 7, frames: 40, compare: 0x1b },
  { room: SIB.shaft, name: '15-shaft-of-darkness', col: 2, floor: 18, frames: 40, compare: 0x1c },
  { room: SIB.lake, name: '16-baikal-to-basics', col: 27, floor: 12, frames: 60, compare: 0x06 },
  { room: SIB.border, name: '17-border-line-case', col: 8, floor: 17, frames: 60, compare: 0x03 },
];

function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

/** The picture of Monty (in the ushanka) in a room after `frames` frames of standing, holding the items (their indexes in the table). */
function placed(room: number, col: number, floor: number, frames: number, items: readonly number[] = []): Uint8Array {
  const g = new Game(WORLD);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  const s: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  wear(g, itemIndex(g, ROOM.platform, 1));
  for (const i of items) g.siCollected[i] = 0x81;
  const at = standing(col, floor);
  enterRoom(g, room, at.x2, at.y);
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  for (let n = 0; n < frames; n++) frame(s, NONE);
  return shot(g);
}

const save = (name: string, px: Uint8Array) => rgbPng(path.join(out, name), indicesToRgb(px), W, H, 3);

const sheet = new Uint8Array(W * 3 * H * 3);
SPOTS.forEach((s, i) => {
  const px = placed(s.room, s.col, s.floor, s.frames);
  save(`room-${s.name}.png`, px);
  for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W, y * W + W), ((Math.floor(i / 3) * H + y) * 3 + (i % 3)) * W);
});
rgbPng(path.join(out, 'sheet.png'), indicesToRgb(sheet), W * 3, H * 3, 1);

// the shaft lit by the lamp
save('shaft-lit.png', placed(SIB.shaft, 2, 18, 40, [itemIndex(new Game(WORLD), SIB.mine)]));
// the tunnel mouths under way
save('tunnel-gravy.png', placed(SIB.gravy, 8, 17, 40 + 130 + 48 + 170));
save('tunnel-sleeper.png', placed(SIB.sleeper, 3, 17, 40 + 130 + 48 + 140));
// the ice in its stages (he stands on it)
for (const frames of [30, 70, 100]) {
  const g = new Game(WORLD);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  const s: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  const at = standing(19, 12);
  enterRoom(g, SIB.lake, at.x2, at.y);
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  g.enemies = [];
  for (let n = 0; n < frames; n++) frame(s, NONE);
  save(`ice-${frames}.png`, shot(g));
}

// each room beside one of Monty on the Run's
for (const s of SPOTS) {
  const mine = placed(s.room, s.col, s.floor, s.frames);
  const g = new Game(MOTR);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
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
