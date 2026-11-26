/**
 * Hawaii's nineteen rooms as the real engine draws them (the game's own frame, Monty in it, the creatures and mechanisms a moment in), one picture each and a contact sheet; the luau's torches through their
 * cycle; the surf shut and open; FISH OUT OF WATER's surge and the moray; Mauna Loa's lava rising, the crust cracking and the vent; Hana's wave; the road's cars; the biplane at Hilo. Pictures only: nothing
 * is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { PAC } from '../src/pacific';
import { itemIndex } from './route';
import { contactSheet, newPlay, placed, savePng } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const probe = newPlay().g;
const snorkel = itemIndex(probe, PAC.lookout, 0), lei = itemIndex(probe, PAC.luau, 0), parachute = itemIndex(probe, PAC.summit, 0), coffee = itemIndex(probe, PAC.coffee, 0);
const swim = { worn: lei, items: [lei, snorkel] } as const;

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; worn?: number; items?: readonly number[] }[] = [
  { room: PAC.ship, name: '38-the-cargo-ship', col: 1, floor: 13, frames: 40 },
  { room: PAC.waikiki, name: '41-waikiki', col: 1, floor: 19, frames: 40 },
  { room: PAC.luau, name: '42-lei-of-the-land', col: 22, floor: 19, frames: 40 },
  { room: PAC.diamond, name: '88-diamond-head', col: 1, floor: 19, frames: 40 },
  { room: PAC.lookout, name: '89-the-lookout', col: 18, floor: 9, frames: 40 },
  { room: PAC.clam, name: '43-clam-down', col: 27, floor: 11, frames: 40, ...swim },
  { room: PAC.kelp, name: '45-kelp-wanted', col: 1, floor: 18, frames: 40, ...swim },
  { room: PAC.lahaina, name: '46-whale-of-a-time', col: 17, floor: 18, frames: 40, ...swim },
  { room: PAC.road, name: '47-the-road-to-hana', col: 2, floor: 18, frames: 40, ...swim },
  { room: PAC.cave, name: '48-the-sea-cave', col: 2, floor: 18, frames: 40, ...swim },
  { room: PAC.hana, name: '87-hana', col: 2, floor: 8, frames: 40, ...swim },
  { room: PAC.fish, name: '49-fish-out-of-water', col: 26, floor: 5, frames: 40, ...swim },
  { room: PAC.kona, name: '90-kona', col: 2, floor: 19, frames: 40, ...swim },
  { room: PAC.kea, name: '91-mauna-kea', col: 22, floor: 16, frames: 40, ...swim },
  { room: PAC.summit, name: '92-the-summit', col: 9, floor: 16, frames: 40, ...swim },
  { room: PAC.falls, name: '93-akaka-falls', col: 1, floor: 8, frames: 40, ...swim },
  { room: PAC.loa, name: '52-mauna-loa', col: 3, floor: 19, frames: 40, ...swim },
  { room: PAC.coffee, name: '51-coffee-break', col: 1, floor: 5, frames: 40, ...swim },
  { room: PAC.hilo, name: '53-hilo-goodbye', col: 2, floor: 19, frames: 40, ...swim },
];

const only = process.argv[3];
const pics = SPOTS.filter((s) => only === undefined || s.name.includes(only)).map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: s.worn ?? null, items: s.items ?? [] });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
if (only === undefined) {
  contactSheet(out, 'sheet.png', pics);
  contactSheet(out, 'torches.png', [10, 50, 75, 100, 130, 160].map((frames) => placed({ room: PAC.luau, col: 13, floor: 19, frames }).px));
  savePng(out, 'surf-open.png', placed({ room: PAC.waikiki, col: 23, floor: 19, frames: 20, ...swim }).px);
  contactSheet(out, 'surge.png', [60, 95, 130, 170, 200, 215].map((frames) => placed({ room: PAC.fish, col: 11, floor: 18, frames, ...swim }).px));
  contactSheet(out, 'lava.png', [10, 120, 240, 360, 480, 620].map((frames) => placed({ room: PAC.loa, col: 3, floor: 19, frames, ...swim }).px));
  contactSheet(out, 'wave.png', [90, 110, 130, 150].map((frames) => placed({ room: PAC.hana, col: 16, floor: 18, frames, ...swim }).px));
  contactSheet(out, 'cars.png', [100, 160, 200, 240].map((frames) => placed({ room: PAC.road, col: 2, floor: 18, frames, ...swim }).px));
  savePng(out, 'biplane.png', placed({ room: PAC.hilo, col: 18, floor: 19, frames: 30, worn: lei, items: [lei, snorkel, parachute, coffee] }).px);
}
