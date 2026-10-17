/**
 * The seven beeper effects: each is called as the game does ($A017, A = effect number) from a snapshot of play, run until it
 * returns, and its speaker writes (the beeper log) are measured: how many toggles, how long in T-states and seconds, and
 * the first few half-period lengths. The effects are blocking loops (the game stops while they play).
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/sounds.ts games/moley/build/play.state [out-file]
 *
 * With an out-file it writes the toggle durations of every effect as JSON: { "<n>": [T-states between toggles...] }.
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { FRAME_T, Spectrum } from '../../../tools/zx/spectrum';

const [stateFile, outFile] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: sounds.ts <state> [out.json]');
const state = new Uint8Array(fs.readFileSync(stateFile));
const rom = readRom();
const RETURN = 0x822b; // the main loop's HALT: where the effect returns to
const result: Record<string, number[]> = {};

for (let effect = 0; effect < 7; effect++) {
  const m = new Spectrum(rom);
  unpackState(m, state);
  const cpu = m.cpu;
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = RETURN & 255; m.mem[cpu.sp + 1] = RETURN >> 8;
  cpu.regs[7] = effect;
  cpu.pc = 0xa017;
  const start = m.frame * FRAME_T + cpu.t;
  let end = -1;
  m.onStep = (pc) => { if (pc === RETURN && end < 0) end = m.frame * FRAME_T + cpu.t; };
  m.beeper.length = 0;
  for (let f = 0; f < 400 && end < 0; f++) m.runFrame();
  const times = m.beeper.map((b) => b.frame * FRAME_T + b.t);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  result[String(effect)] = gaps;
  const ms = (end - start) / 3500;
  console.log(`effect ${effect}: ${m.beeper.length} toggles over ${((end - start) / 3500000).toFixed(3)} s (${ms.toFixed(0)} ms); first half-periods ${gaps.slice(0, 8).join(' ')}; shortest ${Math.min(...gaps)}, longest ${Math.max(...gaps)}`);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(result));
