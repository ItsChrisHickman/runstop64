/**
 * A picture of each room as the original draws it: from a snapshot of the game in play, call the room-entry routine
 * ($854A: A = room) the way the game does, run a few frames, and save the screen.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/shots.ts games/moley/build/play.state /tmp/moley-rooms [rooms] [frames]
 *
 * `rooms` is a list such as 0,1,2 (default 0-6). STATES=dir also saves each room's state there (room0.state...). Monty is put at the room's start by the game's own handler when
 * he dies; here he stays where the snapshot had him unless X and Y (pixels) are given in the environment.
 * AT=addr (hex) enters at that address instead, as a room's own arrival routine does ($9C37 is room 5's: it puts Monty at
 * the room's start and runs the handler), returning into the main loop after its CALL $9234.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readRom } from '../../../tools/zx/boot';
import { screenPng } from '../../../tools/zx/screen';
import { packState, unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';

const [stateFile, outDir = '/tmp/moley-rooms', roomsArg = '0,1,2,3,4,5,6', framesArg = '30'] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: shots.ts <state> [outdir] [rooms] [frames]');
fs.mkdirSync(outDir, { recursive: true });
const rom = readRom();
const state = new Uint8Array(fs.readFileSync(stateFile));

for (const room of roomsArg.split(',').map(Number)) {
  const m = new Spectrum(rom);
  unpackState(m, state);
  const cpu = m.cpu;
  // enter the room the way the game does: CALL $854A from the main loop's HALT, returning to it
  cpu.sp = (cpu.sp - 2) & 0xffff;
  const arrive = process.env.AT ? parseInt(process.env.AT, 16) : null;
  const back = arrive === null ? 0x822b : 0x825e; // the main loop's HALT, or after its CALL $9234
  m.mem[cpu.sp] = back & 255; m.mem[cpu.sp + 1] = back >> 8;
  cpu.regs[7] = room;
  cpu.pc = arrive ?? 0x854a;
  if (process.env.X) m.mem[0x8121] = Number(process.env.X);
  if (process.env.Y) m.mem[0x8122] = Number(process.env.Y);
  m.run(Number(framesArg));
  const file = path.join(outDir, `room${room}.png`);
  screenPng(file, m.mem, m.border, m.flashPhase, 2);
  if (process.env.STATES) fs.writeFileSync(path.join(process.env.STATES, `room${room}.state`), packState(m));
  console.log(`room ${room}: ${file}`);
}
