/**
 * The two clocks (re/README.md): the original's interrupt routine runs 50 times a second and its main loop 25, so two interrupts fall in each pass: one as the
 * `HALT` ends, one somewhere inside the pass, where depends on how long the pass is (which test/lockstep.ts and re/timing.ts show is anywhere in it). The rebuilt game
 * runs its interrupt before the pass and before Monty's routine, and the lockstep proves it equal to the original called that way. This test asks how far that
 * schedule is from the original's own: the same random player plays the original twice from the same place, once with the original's own interrupts and once with the
 * routine called at the rebuilt game's two points, and the runs are compared pass by pass (the room, Monty's place and flags, the lives, the score). The
 * difference is a matter of when a floor or a crusher is a step on or behind at the moment he looks: it shows up as a pass or two of difference in a run in which Monty
 * stands where that matters, and as none in the many in which he does not. The test fails if more than a tenth of the runs differ (a run of 60 passes: 4 in 150 do).
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/schedule.ts [runs] [passes]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { A, mulberry, neutralise, PASS_AFTER, PASS_START, ROOM_ENTRY, Run, Tally, type Keep } from './lockstep-core';
import { RandomPlayer } from './random-player';
import { ROOMS } from '../src/data/rooms-data';
import type { Control } from '../src/input';

const [runsArg = '300', passesArg = '60'] = process.argv.slice(2);
const RUNS = Number(runsArg), PASSES = Number(passesArg);
const STATE = 'games/montymole/build/room0.state';
const KEEP_ALL: Keep = { coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true };
const rom = readRom('games/montymole/build/48.rom');

/** What the comparison looks at after a pass. */
function vector(mem: Uint8Array): string {
  const bytes = [A.room, A.lives, A.x, A.y, A.flags, A.flags2, A.fallen, A.score, A.score + 1, A.score + 2];
  return bytes.map((a) => mem[a] ?? 0).join(',');
}

/** Put the original in a room at a place (a jump or a fall in it, as test/lockstep.ts does it). */
function place(m: Spectrum, room: number, x: number, y: number, falling: boolean): void {
  const mem = m.mem;
  mem[A.room] = room; mem[A.x] = x; mem[A.y] = y; mem[A.arrival] = x; mem[A.arrival + 1] = y;
  mem[A.input] = 4; mem[A.flags] = falling ? 1 : 0; mem[A.flags2] = falling ? 0x80 : 0; mem[A.fallen] = 0; mem[A.jumpDir] = 0; mem[A.jumpCount] = 0;
  mem[A.arc] = 0x9c; mem[A.arc + 1] = 0x86; mem[A.pitch] = 0xfa; mem[A.pitch + 1] = 0;
  m.cpu.pc = 0x940c;
  m.cpu.halted = false;
}

/** The original with its own interrupts: a vector for each pass. */
function realRun(seed: number, control: Control, room: number, x: number, y: number, falling: boolean): string[] {
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(STATE)));
  m.cpu.iff1 = true;
  m.cpu.iff2 = true;
  m.mem[A.control] = control;
  m.kempstonPlugged = control === 2;
  neutralise(m.mem, { ...KEEP_ALL, real: true });
  place(m, room, x, y, falling);
  const rnd = mulberry(seed);
  const player = new RandomPlayer(rnd, control);
  const out: string[] = [];
  let armed = true, started = false;
  m.onStep = (pc) => {
    if (pc === PASS_AFTER || pc === ROOM_ENTRY) armed = true;
    else if (pc === PASS_START) {
      if (!armed) return;
      armed = false;
      if (started) out.push(vector(m.mem));
      started = true;
      player.choose(m);
    }
  };
  for (let f = 0; f < PASSES * 5 + 400 && out.length < PASSES; f++) m.runFrame();
  return out;
}

/** The original with the rebuilt game's schedule (test/lockstep-core.ts). */
function scheduledRun(seed: number, control: Control, room: number, x: number, y: number, falling: boolean): string[] {
  const tally = new Tally();
  const out: string[] = [];
  const run = new Run(tally, STATE, 'schedule', control, control === 2, (m) => place(m, room, x, y, falling), KEEP_ALL);
  run.hooks.passEnd = (_outcome, mem) => { out.push(vector(mem)); };
  run.play(new RandomPlayer(mulberry(seed), control), PASSES);
  return out;
}

let differ = 0, same = 0;
let firstDiffs: number[] = [];
let passesCompared = 0;
for (let k = 0; k < RUNS; k++) {
  const rnd = mulberry(600000 + k);
  const room = Math.floor(rnd() * ROOMS.length);
  const x = 8 + 2 * Math.floor(rnd() * 108), y = 0x25 + Math.floor(rnd() * 0x84);
  const control: Control = rnd() < 0.7 ? 1 : 3;
  const falling = rnd() < 0.5;
  const a = realRun(900000 + k, control, room, x, y, falling);
  const b = scheduledRun(900000 + k, control, room, x, y, falling);
  const n = Math.min(a.length, b.length);
  let first = -1;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) { first = i; break; }
  passesCompared += n;
  if (first >= 0) { differ++; firstDiffs.push(first); } else same++;
}
firstDiffs = firstDiffs.sort((p, q) => p - q);
console.log(`   ${RUNS} runs of ${PASSES} passes: ${same} the same all the way, ${differ} differ (first at passes ${firstDiffs.slice(0, 20).join(', ')}${firstDiffs.length > 20 ? ' ...' : ''}); ${passesCompared} passes compared`);
check(`the rebuilt game's schedule of the interrupt keeps the original's own: ${same} of ${RUNS} runs of ${PASSES} passes are the same pass for pass (${differ} part company, usually after a pass in which a floor or a crusher decided a step)`, differ * 100 <= RUNS * 10);
finish();
