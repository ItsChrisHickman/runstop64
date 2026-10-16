/**
 * Draw every room in the original and in the port, from the same state, and
 * compare the screens (bitmap, colours, attributes, items) and the state the
 * drawing leaves (random numbers, objects found, items placed).
 *
 *   node rooms.mjs <game.state> [outdir for PNGs of differing rooms] [first-last]
 */
import fs from 'node:fs';
import path from 'node:path';
import { reference, call } from './ref';
import { syncFrom, compare, screenPng } from './sync';
import { Game } from '../src/game';
import { drawRoom } from '../src/room';

const [stateFile, outDir = '', range = '0-511'] = process.argv.slice(2);
const [first, last] = range.split('-').map(Number);
const m = reference(stateFile);
const g = new Game();
let same = 0;
const bad: number[] = [];
if (outDir) fs.mkdirSync(outDir, { recursive: true });
for (let room = first; room <= last; room++) {
  m.ram[0xb9] = room & 0xff;
  m.ram[0xba] = room >> 8;
  syncFrom(m, g);
  call(m, 0x0e7b);
  drawRoom(g);
  const d = compare(m, g);
  if (outDir && (process.env.DUMP ?? '').split(',').includes(String(room))) {
    screenPng(path.join(outDir, `room${room}-port.png`), g.scr.bank.subarray(0x2000, 0x3f40), g.scr.bank.subarray(0x1c00, 0x1fe8));
  }
  if (!d.length) { same++; continue; }
  bad.push(room);
  if (bad.length <= 8) console.log(`room ${room}:\n  ${d.slice(0, 12).join('\n  ')}`);
  if (outDir && bad.length <= 8) {
    screenPng(path.join(outDir, `room${room}-orig.png`), m.ram.subarray(0x6000, 0x7f40), m.ram.subarray(0x5c00, 0x5fe8));
    screenPng(path.join(outDir, `room${room}-port.png`), g.scr.bank.subarray(0x2000, 0x3f40), g.scr.bank.subarray(0x1c00, 0x1fe8));
  }
}
console.log(`${same} of ${last - first + 1} rooms identical${bad.length ? `; differ: ${bad.slice(0, 40).join(' ')}${bad.length > 40 ? ' ...' : ''}` : ''}`);
