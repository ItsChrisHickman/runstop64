/**
 * Where the original's 50 Hz interrupt lands in its 25 Hz main loop (re/README.md, "The two clocks"): the original runs from a state
 * in a room with a random player pressing keys, and every interrupt is counted with the address it interrupted (the word on the
 * stack as the routine at `$5B5B` starts) and the pass it fell in (a pass is counted from the instruction after the loop's `HALT`,
 * `$943D`). Prints how many interrupts there are in a pass, and in which part of the pass they fall: waiting at the `HALT`, in the
 * enemies' routine, in Monty's, in the sound, or elsewhere.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/re/timing.ts [room] [passes] [seed]
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { mulberry } from '../test/lockstep-core';
import { RandomPlayer } from '../test/random-player';

const [roomArg = '0', passesArg = '400', seedArg = '1'] = process.argv.slice(2);
const m = new Spectrum(readRom('games/montymole/build/48.rom'));
unpackState(m, new Uint8Array(fs.readFileSync('games/montymole/build/room0.state')));
m.cpu.iff1 = true;
m.cpu.iff2 = true;
const rnd = mulberry(Number(seedArg));
const player = new RandomPlayer(rnd, 1);
if (roomArg !== '0') {
  m.mem[0x9649] = Number(roomArg);
  m.mem[0x5c7b] = 0x60; m.mem[0x5c7c] = 0x61;
  m.mem[0x964b] = 0x60; m.mem[0x964c] = 0x61;
  m.mem[0x964a] = 200;
  m.cpu.pc = 0x940c;
  m.cpu.halted = false;
}

const REGIONS: readonly { name: string; from: number; to: number }[] = [
  { name: 'HALT', from: 0x943c, to: 0x943d },
  { name: 'enemies', from: 0x8751, to: 0x89d4 }, { name: 'enemies helpers (fb/fc)', from: 0xfb00, to: 0xfd00 },
  { name: 'monty', from: 0x89d4, to: 0x8d52 }, { name: 'monty (probes, $8d5f)', from: 0x8d5f, to: 0x8d7d },
  { name: 'blitter', from: 0xebe0, to: 0xece0 },
  { name: 'beeper/ROM', from: 0x0000, to: 0x4000 },
  { name: 'touch/coal/object/exits', from: 0x9148, to: 0x9440 },
  { name: 'loop', from: 0x9440, to: 0x9460 }, { name: 'room entry', from: 0x940c, to: 0x943c },
  { name: 'drawing a room', from: 0x9460, to: 0x9700 }, { name: 'room routines', from: 0xfd00, to: 0xff00 },
  { name: 'the interrupt routine itself', from: 0x8d7f, to: 0x9148 },
];
const where = (pc: number): string => REGIONS.find((r) => pc >= r.from && pc < r.to)?.name ?? `$${pc.toString(16)}`;

const perPass: number[] = [];
const hits = new Map<string, number>();
let current = 0;
let passes = 0;
let armed = true;
const total = Number(passesArg);
m.onStep = (pc) => {
  if (pc === 0x9440) armed = true;
  else if (pc === 0x943d && armed) {
    armed = false;
    if (passes > 0) perPass.push(current);
    current = 0;
    passes++;
    player.choose(m);
  } else if (pc === 0x5b5b) {
    current++;
    const sp = m.cpu.sp;
    const at = (m.mem[sp] ?? 0) | ((m.mem[sp + 1] ?? 0) << 8);
    const name = process.env.EXACT !== undefined ? `$${at.toString(16)}` : where(at);
    hits.set(name, (hits.get(name) ?? 0) + 1);
  }
};
for (let f = 0; f < total * 4 + 200 && passes <= total; f++) m.runFrame();
const dist = new Map<number, number>();
for (const n of perPass) dist.set(n, (dist.get(n) ?? 0) + 1);
console.log(`${perPass.length} passes; interrupts a pass: ${[...dist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k} x${v}`).join(', ')}`);
console.log(`interrupted: ${[...hits].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
