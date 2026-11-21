/**
 * China's nine rooms as the real engine draws them (the game's own frame, Monty in it, the creatures, firecrackers, arms and dragon where they are a moment in),
 * one picture each and a contact sheet; the firecracker string going off; the three figures' arms; the dragon on its lap; the gate shut and open; the raft; and
 * each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { ROOM } from '../src/moscow';
import { CHI } from '../src/china';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: china-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: CHI.wall, name: '18-walls-well', col: 2, floor: 17, frames: 40, compare: 0x0a },
  { room: CHI.alley, name: '19-alley-oop', col: 2, floor: 17, frames: 40, compare: 0x0e },
  { room: CHI.tower, name: '20-tower-of-power', col: 20, floor: 17, frames: 40, compare: 0x1b },
  { room: CHI.top, name: '21-wall-you-need', col: 20, floor: 17, frames: 40, compare: 0x17 },
  { room: CHI.market, name: '22-stall-in-love', col: 2, floor: 17, frames: 120, compare: 0x13 },
  { room: CHI.gate, name: '23-gate-expectations', col: 3, floor: 17, frames: 40, compare: 0x03 },
  { room: CHI.roofs, name: '24-roof-and-ready', col: 22, floor: 17, frames: 40, compare: 0x15 },
  { room: CHI.willow, name: '25-willow-pattern', col: 1, floor: 9, frames: 40, compare: 0x06 },
  { room: CHI.junk, name: '26-junk-food', col: 4, floor: 17, frames: 40, compare: 0x1c },
];

const probe = newPlay().g;
const ushanka = itemIndex(probe, ROOM.platform, 1);
const key = itemIndex(probe, CHI.alley, 0), hat = itemIndex(probe, CHI.top, 0), bamboo = itemIndex(probe, CHI.willow, 0);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: s.room >= CHI.gate ? hat : ushanka });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// the firecrackers: hung, lit, going off, spent
const alley = [20, 60, 80, 100, 130, 200, 290].map((frames) => placed({ room: CHI.alley, col: 3, floor: 17, frames, worn: ushanka, noEnemies: true }).px);
alley.forEach((px, i) => savePng(out, `crackers-${i}.png`, px));
contactSheet(out, 'crackers.png', alley);
// the arms: at rest, twitching, reaching
const arms = [5, 40, 60, 80, 110, 140].map((frames) => placed({ room: CHI.willow, col: 10, floor: 15, frames, worn: hat, noEnemies: true }).px);
contactSheet(out, 'arms.png', arms);
// the dragon along its lap
const lap = [0, 60, 120, 180, 240, 300, 360, 420, 480].map((frames) => placed({ room: CHI.market, col: 3, floor: 17, frames, worn: ushanka }).px);
contactSheet(out, 'dragon.png', lap);
// the gate shut, and open (the rice hat taken: the hat he wears too)
savePng(out, 'gate-shut.png', placed({ room: CHI.gate, col: 10, floor: 17, frames: 20, worn: ushanka }).px);
savePng(out, 'gate-open.png', placed({ room: CHI.gate, col: 10, floor: 17, frames: 20, worn: hat, items: [hat] }).px);
// the trapdoor, shut and open
savePng(out, 'trapdoor-shut.png', placed({ room: CHI.tower, col: 14, floor: 9, frames: 20, worn: ushanka }).px);
savePng(out, 'trapdoor-open.png', placed({ room: CHI.tower, col: 14, floor: 9, frames: 20, worn: ushanka, items: [key] }).px);
// the river, with and without the raft
savePng(out, 'junk-no-raft.png', placed({ room: CHI.junk, col: 14, floor: 17, frames: 20, worn: hat }).px);
savePng(out, 'junk-raft.png', placed({ room: CHI.junk, col: 14, floor: 17, frames: 20, worn: hat, items: [bamboo] }).px);
// him in each hat, standing still on a plain floor
for (const [name, worn] of [['ushanka', ushanka], ['rice-hat', hat]] as const) {
  savePng(out, `hat-${name}.png`, placed({ room: CHI.wall, col: 20, floor: 9, frames: 20, worn }).px);
}

// each room beside one of Monty on the Run's
SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
