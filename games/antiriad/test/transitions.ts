/**
 * How long a room takes to draw: the original (its main program draws a room between
 * interrupts; the game stands still meanwhile) and the port, into every room from the same
 * moment, counting the frames until the game goes on.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/transitions.ts games/antiriad/test/original.state
 *   nice -n 15 node tools/test.mjs games/antiriad/test/transitions.ts games/antiriad/test/armour.state [message|quiet]
 *
 * (In the armour the panel's interrupts take the original more time while a message scrolls:
 * `message` starts each room change with one scrolling, `quiet` with none.)
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { ROOMS } from '../src/data';
import { Game } from '../src/game';
import { roomName } from '../src/map';

const [stateFile, message] = process.argv.slice(2);
const load = () => { const m = new C64Machine(); m.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile)))); m.collisionsPerLine = true; return m; };
let same = 0, one = 0, more = 0;
const off: string[] = [];
for (let room = 0; room < ROOMS; room++) {
  const o = load();
  if (room === o.ram[0x5b]) continue;
  o.ram[0xf25a + o.ram[0x5b] * 4] = room; // (the way right leads there)
  const g = new Game(load(), true);
  g.ram.set(o.ram.subarray(0xf25a, 0xf25a + ROOMS * 4), 0xf25a);
  if (message) for (const r of [o.ram, g.ram]) {
    if (message === 'quiet') r[0x54] &= 0x7f;
    else r[0x54] |= 0x80;
  }
  o.ram[0x6b] = g.ram[0x6b] = 0x80;
  let a = 0, b = 0;
  while (o.ram[0x6b] & 0x80 && a < 60) { o.runFrame(); a++; }
  while (g.ram[0x6b] & 0x80 && b < 60) { g.tick(); b++; }
  if (a === b) same++; else { if (Math.abs(a - b) === 1) one++; else more++; off.push(`${roomName(room)} ${a}/${b}`); }
}
console.log(`${same + one + more} room changes: ${same} take as many frames as the original's, ${one} one frame more or less, ${more} more than that${off.length ? ` (${off.join(', ')}: original/port)` : ''}`);
process.exit(more ? 1 : 0);
