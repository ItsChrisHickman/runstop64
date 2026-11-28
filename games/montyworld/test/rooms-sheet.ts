/**
 * Any rooms as the real engine draws them, each with the paths of everything that moves in it traced over a few seconds (white dots, a
 * yellow one where each starts), and a line per creature: its speed, range and the length of its patrol. One tool for every pass that has
 * to look at rooms (2026-11-27: thirty region- and feature-specific shot scripts had grown, one per pass). Monty stands where he is put
 * and is untouchable (the engine's grace hook), so nothing kills him and the picture is of the room. Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rooms-sheet.ts <out-dir> --room 41,42,waikiki [--frames 400] [--at 90,120]
 *
 * Writes <out-dir>/room-<id>.png for each and <out-dir>/sheet.png (three across), and prints the creature lines. `--at` also saves the room as it is at those frames
 * (room-<id>-at<frame>.png, no trails): a mechanism seen mid-move (a whale breaching, a car on a bridge).
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { ALL_ROOMS, scopedRooms } from './scope';
import { contactSheet, H, newPlay, savePng, settle, shot, standing, W } from './shots-kit';

const [out, ...rest] = process.argv.slice(2);
if (!out || !process.env.MONTY_ROOMS) {
  console.error('usage: node tools/test.mjs games/montyworld/test/rooms-sheet.ts <out-dir> --room <ids or names> [--frames n]');
  process.exit(1);
}
const at = rest.indexOf('--frames');
const FRAMES = at >= 0 ? Number(rest[at + 1]) || 400 : 400;
const atArg = rest.indexOf('--at');
const SNAPS = new Set(atArg >= 0 ? (rest[atArg + 1] ?? '').split(',').map(Number).filter((n) => n > 0 && n <= FRAMES) : []);
fs.mkdirSync(out, { recursive: true });

/** Where he is tried, in turn, until he settles in the room asked for (the floor, then the left and right edges, then high up). */
const SPOTS: readonly (readonly [col: number, floor: number])[] = [[1, 19], [30, 19], [16, 19], [1, 13], [30, 13], [16, 9], [1, 5], [30, 5]];

const LIGHT = new Set([1, 3, 7, 13, 15]);
type Point = readonly [x: number, y: number];
/** The middle of each sprite showing, on the picture. */
const sprites = (s: State): Point[] => s.g.vic.sprites.flatMap((r, n): Point[] => (s.g.vic.enable & (1 << n) ? [[(r.x >= 504 ? r.x - 504 : r.x) - 24 + 12, r.y - 50 + 10]] : []));

/** He put in the room, settled and staying there, or null. */
function placedIn(room: number): State | null {
  for (const [col, floor] of SPOTS) {
    const t = newPlay();
    t.g.graceActive = () => true;
    const p = standing(col, floor);
    enterRoom(t.g, room, p.x2, p.y);
    settle(t);
    for (let n = 0; n < 25; n++) frame(t, NONE);
    if (t.g.roomId === room) return t;
  }
  return null;
}

const sheet: Uint8Array[] = [];
for (const spec of scopedRooms(ALL_ROOMS)) {
  const s = placedIn(spec.id);
  if (!s) { console.log(`room ${spec.id}: no spot he stays in (tried ${SPOTS.length})`); continue; }
  const lines = s.g.enemies.map((e, i) => `  creature ${i}: type ${e.type}, speed ${e.speed} px a step, range ${e.range} steps, patrol ${e.speed * e.range} px${e.driven ? ' (driven by a mechanism)' : ''}`);
  const starts = sprites(s), trail: Point[] = [];
  for (let f = 0; f < FRAMES && s.g.roomId === spec.id; f++) {
    frame(s, NONE); trail.push(...sprites(s));
    if (SNAPS.has(f + 1)) savePng(out, `room-${spec.id}-at${f + 1}.png`, shot(s.g));
  }
  const px = shot(s.g), ground = px.slice(); // (each dot's colour from the picture as drawn, not from the dots before it)
  const dot = (x: number, y: number, c: number) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = x + dx, yy = y + dy;
      // (white on a dark ground, black on a light one: C64 white, yellow, light green, light grey, cyan)
      if (xx >= 0 && xx < W && yy >= 0 && yy < H) px[yy * W + xx] = c === 1 && LIGHT.has(ground[yy * W + xx] ?? 0) ? 0 : c;
    }
  };
  trail.forEach(([x, y]) => dot(x, y, 1));
  starts.forEach(([x, y]) => dot(x, y, 7));
  savePng(out, `room-${spec.id}.png`, px);
  sheet.push(px);
  console.log(`room ${spec.id}: ${s.g.enemies.length} creature(s), traced ${FRAMES} frames\n${lines.join('\n')}`);
}
if (sheet.length) contactSheet(out, 'sheet.png', sheet);
