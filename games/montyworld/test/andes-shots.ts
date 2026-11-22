/**
 * The Andes and the Amazon's twelve rooms as the real engine draws them (the game's own frame, Monty in it under his chullo, the creatures, boulders and vines where they are a moment in), one picture each and a contact
 * sheet; the flight (the canopy, an updraft); the boulders on the terraces through their cycle; the vines swinging; the llama and the captain before the panpipes and the chullo and after; the tangle before the machete and
 * after; and each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { AND } from '../src/andes';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: AND.jump, name: '55-jump-for-joy', col: 6, floor: 11, frames: 30, compare: 0x1d },
  { room: AND.thin, name: '56-out-of-thin-air', col: 8, floor: 9, frames: 30, compare: 0x1e },
  { room: AND.condor, name: '57-condor-country', col: 10, floor: 8, frames: 30, compare: 0x1f },
  { room: AND.llama, name: '58-no-probllama', col: 10, floor: 6, frames: 40, compare: 0x04 },
  { room: AND.rock, name: '59-rock-and-roll', col: 3, floor: 6, frames: 100, compare: 0x13 },
  { room: AND.market, name: '60-market-forces', col: 2, floor: 12, frames: 40, compare: 0x1c },
  { room: AND.mist, name: '61-mist-opportunity', col: 3, floor: 18, frames: 40, compare: 0x0a },
  { room: AND.cloud, name: '62-cloud-nine', col: 16, floor: 18, frames: 40, compare: 0x15 },
  { room: AND.tunnel, name: '63-the-inca-tunnel', col: 5, floor: 18, frames: 40, compare: 0x07 },
  { room: AND.boat, name: '64-the-river-queen', col: 2, floor: 16, frames: 40, compare: 0x14 },
  { room: AND.river, name: '65-vine-and-dandy', col: 1, floor: 15, frames: 40, compare: 0x07 },
  { room: AND.bank, name: '66-the-rivers-end', col: 2, floor: 15, frames: 40, compare: 0x0f },
];

const probe = newPlay().g;
const chullo = itemIndex(probe, AND.market, 0);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: chullo });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// the boulders on the terraces through their cycle
contactSheet(out, 'boulders.png', [10, 60, 120, 180, 240, 300].map((frames) => placed({ room: AND.rock, col: 3, floor: 6, frames, worn: chullo }).px));
// the vines swinging
contactSheet(out, 'vines.png', [5, 25, 45, 65, 85, 105].map((frames) => placed({ room: AND.river, col: 1, floor: 15, frames, worn: chullo }).px));
// the llama at the tunnel, the captain on the deck, before and after what sees them off
const panpipes = itemIndex(probe, AND.mist, 0), machete = itemIndex(probe, AND.tunnel, 0);
savePng(out, 'llama-before.png', placed({ room: AND.rock, col: 4, floor: 18, frames: 40, worn: chullo }).px);
savePng(out, 'llama-after.png', placed({ room: AND.rock, col: 4, floor: 18, frames: 40, worn: chullo, items: [panpipes] }).px);
savePng(out, 'captain-before.png', placed({ room: AND.boat, col: 9, floor: 15, frames: 40 }).px);
savePng(out, 'captain-after.png', placed({ room: AND.boat, col: 9, floor: 15, frames: 40, worn: chullo, items: [chullo] }).px);
savePng(out, 'tangle-before.png', placed({ room: AND.cloud, col: 9, floor: 18, frames: 40, worn: chullo }).px);
savePng(out, 'tangle-after.png', placed({ room: AND.cloud, col: 9, floor: 18, frames: 40, worn: chullo, items: [machete] }).px);

SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
