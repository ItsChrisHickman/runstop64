/**
 * The Andes and the Amazon's eight rooms as the real engine draws them (the game's own frame, Monty in it under the lei until the terraces and in the chullo from there on, the creatures, boulders and vines where they are a
 * moment in), one picture each and a contact sheet; the flight (the canopy, an updraft); the boulders on the hill through their cycle; the vines swinging; the llama before the panpipes and after; the tangle on the kapok's branch before the
 * machete and after; and each room beside one of Monty on the Run's (compare-*.png: the canopy beside the sewer it is modelled on). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { AND } from '../src/andes';
import { PAC } from '../src/pacific';
import { itemIndex } from './route';
import { CHULLO } from './andes-route';
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng, settle, shot, standing } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: AND.jump, name: '55-jump-for-joy', col: 6, floor: 11, frames: 30, compare: 0x1d },
  { room: AND.thin, name: '56-out-of-thin-air', col: 8, floor: 6, frames: 30, compare: 0x1e },
  { room: AND.gorge, name: '57-condor-country', col: 6, floor: 8, frames: 30, compare: 0x1f },
  { room: AND.terraces, name: '58-no-probllama', col: 12, floor: 12, frames: 40, compare: 0x04 },
  { room: AND.picchu, name: '59-machu-picchu', col: 2, floor: 8, frames: 100, compare: 0x13 },
  { room: AND.bridge, name: '83-the-inca-bridge', col: 3, floor: 4, frames: 40, compare: 0x13 },
  { room: AND.canopy, name: '62-the-canopy', col: 20, floor: 7, frames: 40, compare: 0x15 },
  { room: AND.cloud, name: '84-cloud-nine', col: 24, floor: 18, frames: 40, compare: 0x15 },
  { room: AND.kapok, name: '63-branching-out', col: 16, floor: 16, frames: 40, compare: 0x18 },
  { room: AND.vine, name: '85-vine-and-dandy', col: 2, floor: 15, frames: 40, compare: 0x16 },
  { room: AND.sandbar, name: '66-up-the-creek', col: 2, floor: 15, frames: 40, compare: 0x16 },
  { room: AND.roots, name: '65-the-roots', col: 3, floor: 15, frames: 40, compare: 0x17 },
  { room: AND.boat, name: '64-the-river-queen', col: 1, floor: 15, frames: 40, compare: 0x17 },
  { room: AND.ends, name: '94-the-river-ends', col: 1, floor: 15, frames: 40, compare: 0x17 },
];

const probe = newPlay().g;
const chullo = itemIndex(probe, AND.terraces, CHULLO);
const lei = itemIndex(probe, PAC.luau, 0);
// what Monty wears: the Pacific's lei until the terraces' guardhouse, the chullo from Machu Picchu on
const hat = (room: number) => (room === AND.jump || room === AND.thin || room === AND.gorge || room === AND.terraces ? lei : chullo);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: hat(s.room) });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

contactSheet(out, 'boulders.png', [10, 60, 120, 180, 240, 300].map((frames) => placed({ room: AND.picchu, col: 2, floor: 8, frames, worn: chullo }).px));
contactSheet(out, 'vines.png', [5, 25, 45, 65, 85, 105].map((frames) => placed({ room: AND.roots, col: 2, floor: 15, frames, worn: chullo }).px));
const panpipes = itemIndex(probe, AND.picchu, 0), machete = itemIndex(probe, AND.boat, 0);
savePng(out, 'llama-before.png', placed({ room: AND.picchu, col: 4, floor: 18, frames: 40, worn: chullo }).px);
savePng(out, 'llama-after.png', placed({ room: AND.picchu, col: 4, floor: 18, frames: 40, worn: chullo, items: [panpipes] }).px);
contactSheet(out, 'llama-leaves.png', [3, 20, 40, 60].map((frames) => placed({ room: AND.picchu, col: 4, floor: 18, frames, worn: chullo, items: [panpipes] }).px));
contactSheet(out, 'captain-leaves.png', [3, 40, 80, 120].map((frames) => placed({ room: AND.boat, col: 2, floor: 15, frames, worn: chullo, items: [chullo] }).px));
savePng(out, 'tangle-before.png', placed({ room: AND.kapok, col: 20, floor: 8, frames: 40, worn: chullo }).px);
savePng(out, 'tangle-after.png', placed({ room: AND.kapok, col: 20, floor: 8, frames: 40, worn: chullo, items: [machete] }).px);

// the parachute: out of the plane's door, off the ramp, up the first updraft, gliding on to the spire
{
  const s = newPlay();
  wear(s.g, lei);
  const at = standing(2, 16);
  enterRoom(s.g, AND.jump, at.x2, at.y);
  settle(s);
  const pics: Uint8Array[] = [];
  for (const n of [40, 30, 40, 40, 40, 40]) {
    for (let f = 0; f < n; f++) frame(s, { ...NONE, right: true });
    pics.push(shot(s.g));
  }
  contactSheet(out, 'flight.png', pics);
}

SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
