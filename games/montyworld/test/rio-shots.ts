/**
 * Rio's eight rooms as the real engine draws them (the game's own frame, Monty in it under the Andes' chullo until the headdress, the creatures, the tram, the floats and the skewers where they are a moment in), one picture
 * each and a contact sheet; the tram through its run; the carnival's crowds and floats through their dance; the Sambadrome's booth lit; and each room beside one of Monty on the Run's (compare-*.png). Pictures
 * only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { RIO_ROOM } from '../src/rio';
import { AND } from '../src/andes';
import { WORLD } from '../src/data';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, placed, savePng } from './shots-kit';
import { newPlay } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: RIO_ROOM.arms, name: '71-open-arms', col: 1, floor: 8, frames: 40, compare: 0x0a },
  { room: RIO_ROOM.colour, name: '73-house-of-colour', col: 2, floor: 8, frames: 40, compare: 0x07 },
  { room: RIO_ROOM.lap, name: '68-the-lapa-arches', col: 2, floor: 18, frames: 40, compare: 0x13 },
  { room: RIO_ROOM.steak, name: '74-steak-your-claim', col: 2, floor: 18, frames: 30, compare: 0x0f },
  { room: RIO_ROOM.beat, name: '70-beat-the-drum', col: 1, floor: 18, frames: 40, compare: 0x1d },
  { room: RIO_ROOM.float, name: '76-float-your-boat', col: 1, floor: 18, frames: 90, compare: 0x1d },
  { room: RIO_ROOM.drum, name: '75-spy-versus-mole', col: 1, floor: 8, frames: 40, compare: 0x1d },
  { room: RIO_ROOM.bust, name: '77-rio-or-bust', col: 2, floor: 18, frames: 40, compare: 0x1f },
];

const probe = newPlay().g;
const headdress = itemIndex(probe, RIO_ROOM.drum, 0);
const chullo = itemIndex(probe, AND.terraces, 1);
const crank = itemIndex(probe, RIO_ROOM.float, 0);
const hat = (room: number) => (room === RIO_ROOM.bust ? headdress : chullo);
const fitted = WORLD.levers[0]?.armed ?? 0;

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: hat(s.room) });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);
for (const s of SPOTS) compare(out, `compare-${s.name}.png`, placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: hat(s.room) }).px, motrRoom(s.compare));

// the tram through its run, the skewers through their cycle
contactSheet(out, 'tram.png', [10, 60, 110, 160, 210, 260].map((frames) => placed({ room: RIO_ROOM.lap, col: 2, floor: 18, frames, worn: chullo }).px));
contactSheet(out, 'skewers.png', [5, 30, 55, 80].map((frames) => placed({ room: RIO_ROOM.steak, col: 2, floor: 18, frames, worn: chullo }).px));
// the carnival through its dance: the crowds out of step and back, the floats along the canal
contactSheet(out, 'carnival.png', [40, 47, 54, 90, 130, 170].map((frames) => placed({ room: frames < 60 ? RIO_ROOM.beat : RIO_ROOM.float, col: 1, floor: 18, frames, worn: chullo }).px));
// the Sambadrome with the crank fitted (the booth lit), and from the avenue
savePng(out, 'sambadrome-fitted.png', placed({ room: RIO_ROOM.drum, col: 21, floor: 18, frames: 40, worn: headdress, items: [crank, fitted, headdress] }).px);
console.log('ok');
