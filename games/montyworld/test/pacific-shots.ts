/**
 * The Pacific's five rooms as the real engine draws them (the game's own frame, Monty in it, the creatures and mechanisms a moment in), one picture each and a contact sheet; the torches through their
 * cycle; the surf shut and open; Hana's surge and the moray; Hilo's lava rising, the crust cracking and the vent; the hold's loose crate rolling and the door open; and each room beside one of Monty on
 * the Run's (compare-*.png). Pictures only: nothing is checked.
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

const probe = newPlay().g;
const snorkel = itemIndex(probe, PAC.waikiki, 0), lei = itemIndex(probe, PAC.waikiki, 1), parachute = itemIndex(probe, PAC.plane, 0);

const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number; worn?: number; items?: readonly number[] }[] = [
  { room: PAC.ship, name: '38-the-cargo-ship', col: 1, floor: 13, frames: 40, compare: 0x1d },
  { room: PAC.waikiki, name: '41-waikiki', col: 1, floor: 19, frames: 40, compare: 0x04 },
  { room: PAC.hana, name: '49-hana', col: 27, floor: 3, frames: 40, compare: 0x15, worn: lei, items: [lei, snorkel] },
  { room: PAC.hilo, name: '52-hilo', col: 1, floor: 19, frames: 40, compare: 0x0f, worn: lei, items: [lei, snorkel] },
  { room: PAC.plane, name: '54-the-cargo-plane', col: 7, floor: 16, frames: 40, compare: 0x1b, worn: lei, items: [lei, snorkel] },
];

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn: s.worn ?? null, items: s.items ?? [] });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// Waikiki: the torches through their cycle; the surf shut and open
contactSheet(out, 'torches.png', [10, 50, 75, 100, 130, 160].map((frames) => placed({ room: PAC.waikiki, col: 18, floor: 7, frames }).px));
savePng(out, 'surf-open.png', placed({ room: PAC.waikiki, col: 23, floor: 19, frames: 20, worn: lei, items: [lei, snorkel] }).px);
// Hana: the surge's streaks off and on, the moray at rest, warning and lunging
contactSheet(out, 'surge.png', [60, 95, 130, 170, 200, 215].map((frames) => placed({ room: PAC.hana, col: 11, floor: 18, frames, worn: lei, items: [lei, snorkel] }).px));
contactSheet(out, 'moray.png', [20, 70, 100, 115, 125, 140].map((frames) => placed({ room: PAC.hana, col: 3, floor: 11, frames, worn: lei, items: [lei, snorkel] }).px));
// Hilo: the lava rising, held and draining; the vent
contactSheet(out, 'lava.png', [10, 120, 240, 360, 480, 620].map((frames) => placed({ room: PAC.hilo, col: 1, floor: 19, frames, worn: lei, items: [lei, snorkel] }).px));
contactSheet(out, 'crust.png', [2, 12, 20, 30].map((frames) => placed({ room: PAC.hilo, col: 10, floor: 14, frames, worn: lei, items: [lei, snorkel], noEnemies: true }).px));
contactSheet(out, 'vent.png', [80, 100, 125, 140].map((frames) => placed({ room: PAC.hilo, col: 13, floor: 9, frames, worn: lei, items: [lei, snorkel] }).px));
// the hold: the loose crate rolling, the door open with the parachute
contactSheet(out, 'crate.png', [140, 160, 190, 220, 250, 280].map((frames) => placed({ room: PAC.plane, col: 15, floor: 6, frames, worn: lei, items: [lei, snorkel] }).px));
savePng(out, 'door-open.png', placed({ room: PAC.plane, col: 25, floor: 16, frames: 20, worn: lei, items: [lei, snorkel, parachute] }).px);

// each room beside one of Monty on the Run's
SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
