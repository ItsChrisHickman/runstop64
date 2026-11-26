/**
 * The bonus rooms off the path (Chris, 2026-11-25: "little rooms with some sort of cool background design"), each beside the room it opens off, as the real engine draws them:
 * one picture each and a contact sheet. Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siderooms-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { SIB } from '../src/siberia';
import { contactSheet, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siderooms-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number }[] = [
  { room: SIB.taiga, name: 'off-the-beaten-path', col: 28, floor: 17, frames: 40 },
  { room: SIB.border, name: 'border-line-case', col: 3, floor: 17, frames: 40 },
  { room: CHI.alley, name: 'back-alley-beijing', col: 26, floor: 17, frames: 40 },
  { room: CHI.houhai, name: 'dont-rock-the-boat', col: 3, floor: 17, frames: 40 },
  { room: JP.grove, name: 'shoot-for-the-moon', col: 28, floor: 14, frames: 40 },
  { room: JP.mole, name: 'the-last-mole', col: 3, floor: 14, frames: 40 },
];

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames });
  savePng(out, `room-${s.room}-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);
// the boats through their cycle: setting off from the banks, meeting and waiting in the middle, going back
contactSheet(out, 'boats.png', [10, 30, 50, 80, 110, 140].map((frames) => placed({ room: CHI.houhai, col: 3, floor: 17, frames, noEnemies: true }).px));
