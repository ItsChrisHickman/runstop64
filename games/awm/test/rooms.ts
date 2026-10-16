/**
 * Every room, decoded from the data (src/data.ts) and drawn by src/room.ts, against the original
 * entering it (its room routine $5581 on the 6502, in c64kit's C64 model, with the room variable
 * $402B poked): the 32 x 18 play area, pixel for pixel (without sprites; the game's main loop is
 * kept out of it after the room is drawn, so animated tiles, lifts and Monty's touch aren't in it).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/rooms.ts games/awm/build/play.state [out-dir for PNGs of any that differ]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { ROOMS, TABLES } from '../src/data';
import { COLS, drawRoom, renderRoom, ROWS, SCREEN_COL } from '../src/room';

const [stateFile, outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: rooms.ts <play.state> [out-dir]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const load = () => { const m = new C64Machine(); m.loadState(state); return m; };

const W = COLS * 8, H = ROWS * 8;
let same = 0;
const bad: string[] = [];
for (let room = 0; room < ROOMS.length; room++) {
  const o = load();
  o.ram[0x402b] = room;
  o.call(0x5581);
  // the main loop stays out of it (animated tiles, lifts, Monty touching things): the CPU spins in a loop of its own while the interrupts draw frames
  o.ram.set([0x4c, 0x34, 0x03], 0x334);
  o.cpu.pc = 0x334;
  for (let f = 0; f < 40; f++) o.runFrame(); // (the room took the original some frames to draw: the machine catches up)
  const keep = o.capture.sprites;
  o.capture.sprites = [];
  const theirs = renderPixels(o);
  o.capture.sprites = keep;
  const mine = renderRoom(drawRoom(ROOMS[room], TABLES, room));
  let diff = 0;
  const shown = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    shown[y * W + x] = theirs[y * 320 + SCREEN_COL * 8 + x];
    if (shown[y * W + x] !== mine[y * W + x]) diff++;
  }
  if (diff === 0) same++;
  else {
    bad.push(`${room}: ${diff} of ${W * H} pixels differ`);
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      indicesPng(path.join(outDir, `room${room}-original.png`), shown, W, H);
      indicesPng(path.join(outDir, `room${room}-decoded.png`), mine, W, H);
    }
  }
}
console.log(`${same} of ${ROOMS.length} rooms identical to the original`);
for (const b of bad) console.log('  ' + b);
if (same !== ROOMS.length) process.exit(1);
