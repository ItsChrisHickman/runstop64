/**
 * MOUNT FUJI and the ice cave at its foot (GONE WITH THE WIND), as the real engine draws them: the mountainside a few moments apart (the snow slides), the drop off it into the
 * cave, the cave as the tengu flies in, and Monty walking into the tengu's gust and set down at the top of the climb. Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/fuji-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { frame, NONE } from '../../montyotr/test/play';
import { RIGHT } from './mech-kit';
import { CAVE, FUJI, JP } from '../src/japan';
import { contactSheet, placed, savePng, shot } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: fuji-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

// the mountainside: in on the ledge, a snowball coming down the climb
const fuji = [40, 200, 300, 420].map((frames) => placed({ room: JP.fuji, col: 1, floor: FUJI.floor, frames }).px);
fuji.forEach((px, i) => savePng(out, `fuji-${i}.png`, px));
contactSheet(out, 'fuji-sheet.png', fuji);

// off the entry ledge into the gap: the fall into the cave, and the tengu flying in as he drops into the tube
const fall = placed({ room: JP.fuji, col: FUJI.entry.col1 - 1, floor: FUJI.floor, frames: 0 });
const drop: Uint8Array[] = [];
for (let f = 0; f < 260; f++) {
  const g = fall.s.g, inCave = g.roomId === JP.cave;
  frame(fall.s, !inCave && !g.falling ? RIGHT : inCave && !g.falling && g.montyCol - 4 > CAVE.hole.col0 ? { ...NONE, left: true } : NONE);
  if ([10, 24, 40, 70, 120, 250].includes(f)) drop.push(shot(fall.s.g));
}
drop.forEach((px, i) => savePng(out, `drop-${i}.png`, px));
contactSheet(out, 'drop-sheet.png', drop);

// the gust: from the mound by the tengu, a step east into it, and where it sets him down
const gust = placed({ room: JP.cave, col: CAVE.mound.col0, floor: CAVE.mound.floor, frames: 60 });
const lift: Uint8Array[] = [shot(gust.s.g)];
for (let f = 0; f < 120; f++) {
  frame(gust.s, f < 30 ? RIGHT : NONE);
  if ([8, 14, 20, 40, 119].includes(f)) lift.push(shot(gust.s.g));
}
console.log(`after the gust: room ${gust.s.g.roomId}, column ${gust.s.g.montyCol - 4}, y ${gust.s.g.y}`);
lift.forEach((px, i) => savePng(out, `gust-${i}.png`, px));
contactSheet(out, 'gust-sheet.png', lift);
