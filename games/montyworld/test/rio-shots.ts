/**
 * Rio's eleven rooms as the real engine draws them (the game's own frame, Monty in it under the Andes' chullo until the headdress, the creatures, floats and skewers where they are a moment in), one picture each and a contact sheet; the cable
 * car on its way up; the floats through their cycle; the gauchos' skewers in their poses; the gates before the key and the headdress and after; and each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { RIO_ROOM } from '../src/rio';
import { AND } from '../src/andes';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, placed, savePng } from './shots-kit';
import { newPlay } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: RIO_ROOM.quay, name: '67-quay-to-the-city', col: 2, floor: 8, frames: 40, compare: 0x14 },
  { room: RIO_ROOM.lap, name: '68-the-lapa-arches', col: 4, floor: 18, frames: 40, compare: 0x13 },
  { room: RIO_ROOM.sugar, name: '69-sugar-rush', col: 4, floor: 18, frames: 40, compare: 0x04 },
  { room: RIO_ROOM.loaf, name: '70-loafing-about', col: 2, floor: 8, frames: 40, compare: 0x1c },
  { room: RIO_ROOM.arms, name: '71-open-arms', col: 1, floor: 8, frames: 40, compare: 0x0a },
  { room: RIO_ROOM.monkey, name: '72-monkey-business', col: 2, floor: 8, frames: 40, compare: 0x15 },
  { room: RIO_ROOM.colour, name: '73-house-of-colour', col: 3, floor: 8, frames: 40, compare: 0x07 },
  { room: RIO_ROOM.steak, name: '74-steak-your-claim', col: 24, floor: 18, frames: 40, compare: 0x0f },
  { room: RIO_ROOM.drum, name: '75-beat-the-drum', col: 1, floor: 18, frames: 40, compare: 0x1d },
  { room: RIO_ROOM.float, name: '76-float-your-boat', col: 1, floor: 18, frames: 40, compare: 0x1e },
  { room: RIO_ROOM.bust, name: '77-rio-or-bust', col: 2, floor: 18, frames: 40, compare: 0x1f },
];

const probe = newPlay().g;
const headdress = itemIndex(probe, RIO_ROOM.steak, 0);
const chullo = itemIndex(probe, AND.market, 0);
const key = itemIndex(probe, RIO_ROOM.lap, 0);
const hat = (room: number) => (room === RIO_ROOM.drum || room === RIO_ROOM.float || room === RIO_ROOM.bust ? headdress : chullo);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: hat(s.room) });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);
for (const s of SPOTS) compare(out, `compare-${s.name}.png`, placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: hat(s.room) }).px, motrRoom(s.compare));

// the floats through their cycle, the skewers through theirs
contactSheet(out, 'floats.png', [10, 90, 170, 250, 330, 410].map((frames) => placed({ room: RIO_ROOM.float, col: 1, floor: 18, frames, worn: headdress }).px));
contactSheet(out, 'skewers.png', [5, 30, 55, 80].map((frames) => placed({ room: RIO_ROOM.steak, col: 24, floor: 18, frames, worn: chullo }).px));
// the cable car's station before and after the key
savePng(out, 'gate-before.png', placed({ room: RIO_ROOM.sugar, col: 8, floor: 14, frames: 40, worn: chullo }).px);
savePng(out, 'gate-after.png', placed({ room: RIO_ROOM.sugar, col: 8, floor: 14, frames: 40, worn: chullo, items: [key] }).px);
console.log('ok');
