/**
 * A bug of the original that the rebuilt game does not copy (games/moley/re/README.md, "Where the rebuild differs"): in room 2, a
 * kill by the second half of the prize (`$9667`) calls the death routine with whatever HL holds, and the puzzle's routine
 * (`$9706`) leaves HL at the address of its counter, `$9904`, on every path but one. The death routine ends by jumping to HL, so
 * the room is not restarted: the original runs the bytes at `$9904` (two counters, then room 3's script, with IX pointing at the
 * wrong entity), Monty stays where he is, and loses a life on every pass he still touches the prize.
 *
 * This test shows the cause on the original: with the second half of the prize showing a deadly picture and Monty touching it, the
 * death jumps to `$9904` while the puzzle's counter is below 10 or at its top ($3C), and to the room's restart, `$9556`, from 10 to
 * $3B. The rebuilt game restarts the room (as the authors meant), and the lockstep runs stop at such a death (test/lockstep-core.ts).
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/stray.ts
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { Game } from '../src/game';
import { SeededRandom } from '../src/random';
import { A, take } from './lockstep-core';

const rom = readRom();
const DEATH = 0x9592, RESTART = 0x9556, COUNTER = 0x9904;

/** Where the death of the original jumps, with the puzzle's counter at `puzzle` and Monty touching the prize's second half. */
function whereTo(puzzle: number): { target: number; machine: Spectrum } | null {
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync('games/moley/build/room2.state')));
  const mem = m.mem;
  mem[COUNTER] = puzzle; mem[0x9905] = 0;
  mem.set([0x38, 0x38, 0x6f, 0], 0x8125); // the first reel, as the puzzle puts it
  mem.set([0xb8, 0x39, 0x6f, 0], 0x8129);
  mem.set([0xdc, 0x70, 0xbf, 0], 0x8131); // the first half of the prize: not shown
  mem.set([0xd0, 0x70, 0x22, 0], 0x8135); // the second: showing its second picture
  mem[A.x] = 0xc0; mem[A.y] = 0x70; mem[A.state] = 0;
  let target = -1;
  m.onStep = (pc) => { if (pc === DEATH && target < 0) target = m.cpu.hl; };
  for (let f = 0; f < 150 && target < 0; f++) m.runFrame();
  m.onStep = null;
  return target < 0 ? null : { target, machine: m };
}

let wrong = 0, strays = 0, restarts = 0;
const rebuiltRestarts: string[] = [];
for (const puzzle of [0, 1, 2, 5, 8, 9, 10, 11, 20, 30, 58, 59, 0x3c]) {
  const seen = whereTo(puzzle);
  // at $3C the cassette goes by (HL untouched); otherwise the counter goes up one and, from 10, the routine loads HL with the restart
  const stray = puzzle === 0 || puzzle === 0x3c || puzzle + 1 < 10;
  const expected = stray ? COUNTER : RESTART;
  if (seen === null || seen.target !== expected) wrong++;
  if (seen?.target === COUNTER) strays++;
  if (seen?.target === RESTART) restarts++;
  // the rebuilt game, from the same memory: the death restarts the room
  const g = new Game(new SeededRandom(1));
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync('games/moley/build/room2.state')));
  const mem = m.mem;
  mem[COUNTER] = puzzle; mem[0x9905] = 0;
  mem.set([0x38, 0x38, 0x6f, 0, 0xb8, 0x39, 0x6f, 0], 0x8125);
  mem.set([0xdc, 0x70, 0xbf, 0, 0xd0, 0x70, 0x22, 0], 0x8131);
  mem[A.x] = 0xc0; mem[A.y] = 0x70; mem[A.state] = 0;
  take(g, mem);
  const lives = g.lives;
  for (let k = 0; k < 8 && g.lives === lives; k++) g.pass(0);
  rebuiltRestarts.push(`${puzzle}:${g.lives < lives && g.monty.x === 4 ? 'restart' : 'no death'}`);
}
console.log(`   death jumped to $9904 ${strays} times, to the restart $9556 ${restarts} times; the rebuilt game: ${rebuiltRestarts.join(' ')}`);
check(`the original's death in room 2 jumps to $9904 (the puzzle's counter) when the counter is below 10 or at $3C and to the restart $9556 otherwise (${wrong} of 13 not as the rule says)`, wrong === 0);
check('the rebuilt game restarts the room in every one of those cases', rebuiltRestarts.every((r) => r.endsWith('restart')));
finish();
