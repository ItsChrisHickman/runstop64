/**
 * The Pacific's seventeen rooms as the real engine draws them (the game's own frame, Monty in it, the creatures, torches, cars and lava where they are a moment in), one picture each
 * and a contact sheet; the luau's torches through their cycle; the road's car warning and crossing; the volcano's lava rising; the sea open and shut; the guard and the lei; and each
 * room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { PAC } from '../src/pacific';
import { itemIndex } from './route';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: PAC.stern, name: '38-stern-warning', col: 1, floor: 13, frames: 40, compare: 0x1d },
  { room: PAC.box, name: '39-box-clever', col: 2, floor: 11, frames: 40, compare: 0x14 },
  { room: PAC.pier, name: '40-pier-pressure', col: 1, floor: 11, frames: 40, compare: 0x1c },
  { room: PAC.surf, name: '41-surf-and-turf', col: 3, floor: 18, frames: 40, compare: 0x04 },
  { room: PAC.lei, name: '42-lei-of-the-land', col: 2, floor: 12, frames: 40, compare: 0x13 },
  { room: PAC.feast, name: '78-the-feast', col: 24, floor: 18, frames: 40, compare: 0x13 },
  { room: PAC.diamond, name: '79-diamond-head', col: 8, floor: 18, frames: 40, compare: 0x0a },
  { room: PAC.lookout, name: '80-the-lookout', col: 4, floor: 10, frames: 40, compare: 0x0a },
  { room: PAC.clam, name: '43-clam-down', col: 3, floor: 19, frames: 40, compare: 0x07 },
  { room: PAC.mole, name: '44-mole-okai', col: 2, floor: 19, frames: 40, compare: 0x0a },
  { room: PAC.kelp, name: '45-kelp-wanted', col: 3, floor: 19, frames: 40, compare: 0x07 },
  { room: PAC.whale, name: '46-whale-of-a-time', col: 12, floor: 18, frames: 40, compare: 0x1d },
  { room: PAC.road, name: '47-the-road-to-hana', col: 3, floor: 18, frames: 40, compare: 0x17 },
  { room: PAC.cave, name: '48-the-sea-cave', col: 3, floor: 19, frames: 40, compare: 0x07 },
  { room: PAC.hana, name: '49-hana-banana', col: 2, floor: 8, frames: 40, compare: 0x06 },
  { room: PAC.fish, name: '50-fish-out-of-water', col: 4, floor: 19, frames: 40, compare: 0x07 },
  { room: PAC.coffee, name: '51-coffee-break', col: 3, floor: 19, frames: 40, compare: 0x15 },
  { room: PAC.mauna, name: '52-mauna-kea-os', col: 2, floor: 19, frames: 40, compare: 0x0f },
  { room: PAC.hilo, name: '53-hilo-goodbye', col: 2, floor: 9, frames: 40, compare: 0x03 },
  { room: PAC.hold, name: '54-hold-your-horses', col: 2, floor: 7, frames: 40, compare: 0x1b },
];

const probe = newPlay().g;
const lei = itemIndex(probe, PAC.lei, 0), snorkel = itemIndex(probe, PAC.surf, 0);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: lei });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// the luau: the torches through their cycle (low, flickering, tall, settling)
contactSheet(out, 'torches.png', [10, 70, 95, 140, 200, 260].map((frames) => placed({ room: PAC.feast, col: 24, floor: 18, frames, worn: lei }).px));
// the road: the cars waiting, flashing, on the bridges
contactSheet(out, 'cars.png', [20, 160, 185, 220, 260, 320, 400, 480, 560].map((frames) => placed({ room: PAC.road, col: 3, floor: 18, frames, worn: lei }).px));
// the volcano: the lava rising, held, draining
contactSheet(out, 'lava.png', [10, 150, 300, 450, 620, 760].map((frames) => placed({ room: PAC.mauna, col: 2, floor: 19, frames, worn: lei }).px));
// the sea shut and open at Waikiki and Hana
savePng(out, 'dive-shut.png', placed({ room: PAC.lei, col: 24, floor: 12, frames: 20, worn: lei }).px);
savePng(out, 'dive-open.png', placed({ room: PAC.lei, col: 24, floor: 12, frames: 20, worn: lei, items: [snorkel] }).px);
contactSheet(out, 'rocks.png', [10, 60, 120, 180, 240, 300].map((frames) => placed({ room: PAC.lookout, col: 4, floor: 10, frames, worn: lei }).px));
contactSheet(out, 'fire-knife.png', [10, 30, 50, 70, 90, 110].map((frames) => placed({ room: PAC.lei, col: 2, floor: 12, frames, worn: lei }).px));
savePng(out, 'hana-shut.png', placed({ room: PAC.hana, col: 17, floor: 18, frames: 20, worn: lei }).px);
savePng(out, 'hana-open.png', placed({ room: PAC.hana, col: 17, floor: 18, frames: 20, worn: lei, items: [snorkel] }).px);
// the chain on the ramp, cut
savePng(out, 'chain.png', placed({ room: PAC.box, col: 24, floor: 11, frames: 20, worn: lei }).px);
// the guard at Hilo, before the lei and after
savePng(out, 'guard.png', placed({ room: PAC.hilo, col: 9, floor: 17, frames: 20 }).px);
savePng(out, 'guard-gone.png', placed({ room: PAC.hilo, col: 9, floor: 17, frames: 20, worn: lei, items: [lei] }).px);
// him in the lei, standing on a plain floor
savePng(out, 'lei.png', placed({ room: PAC.surf, col: 3, floor: 18, frames: 20, worn: lei }).px);

// each room beside one of Monty on the Run's
SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
