/**
 * Japan's eleven rooms as the real engine draws them (the game's own frame, Monty in it, the creatures, trains and doors where they are a moment in), one picture each
 * and a contact sheet; the bullet trains' warning and sweep; the paper doors open, shaking and shut; the shutter shut and rolled up; the koi and the pond fed; the guard
 * and the hood; and each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: japan-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: JP.harbour, name: '27-the-fish-market', col: 3, floor: 17, frames: 40, compare: 0x1c },
  { room: JP.street, name: '28-neon-street', col: 2, floor: 17, frames: 40, compare: 0x13 },
  { room: JP.parlour, name: '29-pachinko-parlour', col: 22, floor: 17, frames: 40, compare: 0x0e },
  { room: JP.crossing, name: '30-the-crossing', col: 3, floor: 17, frames: 40, compare: 0x03 },
  { room: JP.platform, name: '31-bullet-point', col: 14, floor: 17, frames: 150, compare: 0x1b },
  { room: JP.fuji, name: '32-mount-fuji', col: 3, floor: 14, frames: 40, compare: 0x17 },
  { room: JP.garden, name: '33-koi-polloi', col: 8, floor: 14, frames: 40, compare: 0x06 },
  { room: JP.mole, name: '34-the-last-mole', col: 29, floor: 14, frames: 40, compare: 0x0a },
  { room: JP.hideout, name: '35-the-castle', col: 10, floor: 17, frames: 40, compare: 0x15 },
  { room: JP.hall, name: '36-the-shogun-s-hall', col: 3, floor: 14, frames: 40, compare: 0x0f },
  { room: JP.port, name: '37-sayonara-sailor', col: 22, floor: 17, frames: 40, compare: 0x1d },
];

const probe = newPlay().g;
const riceHat = itemIndex(probe, CHI.top, 0);
const daruma = itemIndex(probe, JP.parlour, 0), fish = itemIndex(probe, JP.crossing, 0), hood = itemIndex(probe, JP.mole, 0);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: s.room === JP.port || s.room === JP.hideout ? hood : riceHat, items: s.room === JP.port || s.room === JP.hideout ? [hood] : [] });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// the trains: quiet, the warning at the right, the up train coming on, over the platform, going; the quiet moment; then the down train's warning and the down train
const trains = [5, 200, 270, 310, 360, 430, 480, 560, 650, 700, 800].map((frames) => placed({ room: JP.platform, col: 14, floor: 17, frames, worn: riceHat }).px);
contactSheet(out, 'trains.png', trains);
// the paper doors: open, shaking, shut, a wall
const doors = [10, 70, 90, 110, 125, 150].map((frames) => placed({ room: JP.hall, col: 3, floor: 14, frames, worn: riceHat }).px);
contactSheet(out, 'doors.png', doors);
// the shutter shut and rolled up
savePng(out, 'shutter-shut.png', placed({ room: JP.platform, col: 14, floor: 17, frames: 20, worn: riceHat }).px);
savePng(out, 'shutter-up.png', placed({ room: JP.platform, col: 14, floor: 17, frames: 20, worn: riceHat, items: [daruma] }).px);
// the pond: koi leaping, then fed
const koi = [5, 30, 60, 90].map((frames) => placed({ room: JP.garden, col: 8, floor: 14, frames, worn: riceHat }).px);
contactSheet(out, 'koi.png', koi);
savePng(out, 'pond-fed.png', placed({ room: JP.garden, col: 8, floor: 14, frames: 20, worn: riceHat, items: [fish] }).px);
// the guard, and the guard gone
savePng(out, 'guard.png', placed({ room: JP.hall, col: 19, floor: 14, frames: 20, worn: riceHat }).px);
savePng(out, 'guard-gone.png', placed({ room: JP.hall, col: 19, floor: 14, frames: 20, worn: hood, items: [hood] }).px);
// him in the hood, standing still on a plain floor
savePng(out, 'hood.png', placed({ room: JP.fuji, col: 20, floor: 8, frames: 20, worn: hood }).px);

// each room beside one of Monty on the Run's
SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
