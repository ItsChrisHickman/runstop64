/**
 * The fatal fall, settled on the original (re/README.md, "Monty"): Monty set falling from many heights above the floors of every room,
 * pressing nothing, in the original with its world emptied (test/lockstep-core.ts). Every pass is read from the original's memory:
 * while he falls the counter `$8D58` goes up 2 a pass (he falls 2 pixels a pass); when the floor holds him the pass is a landing, and
 * it kills him exactly when the counter has reached 32 (`CP $20`), that is when he has fallen 16 passes, 32 pixels, four rows of
 * the screen. Nothing else counts: the counter is 0 at take-off and at every landing, and a jump does not touch it.
 * The rebuilt game is run beside each fall (the same lockstep as test/lockstep.ts) so the rule is the rebuilt game's too.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/falls.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import type { Spectrum } from '../../../tools/zx/spectrum';
import { ROOMS } from '../src/data/rooms-data';
import { FATAL_FALL } from '../src/monty';
import { A, Run, Tally, type Keep } from './lockstep-core';

const STATE = 'games/montymole/build/room0.state';
/** Everything the rebuilt game has is kept in the original, so every pass can be compared; a death is classed by the rebuilt game's own account of it (proved equal). */
const KEEP: Keep = { coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true };
const tally = new Tally();
/** Landings (the counter the landing pass had) and deaths by falling (the same), over every fall. */
const landed: number[] = [];
const died: number[] = [];
let deadly = 0, other = 0, falls = 0;

function drop(room: number, x: number, y: number): void {
  const place = (m: Spectrum): void => {
    const mem = m.mem;
    mem[A.room] = room; mem[A.x] = x; mem[A.y] = y; mem[A.arrival] = x; mem[A.arrival + 1] = y;
    mem[A.input] = 4; mem[A.flags] = 1; mem[A.flags2] = 0x80; mem[A.fallen] = 0; mem[A.jumpDir] = 0; mem[A.jumpCount] = 0;
    mem[A.arc] = 0x9c; mem[A.arc + 1] = 0x86; mem[A.pitch] = 0xfa; mem[A.pitch + 1] = 0;
    m.cpu.pc = 0x940c;
    m.cpu.halted = false;
  };
  const run = new Run(tally, STATE, `drop room ${room} x ${x} y ${y}`, 1, false, place, KEEP);
  let before = { falling: false, fallen: 0, lives: 3 };
  let fell = false;
  run.hooks.start = (mem) => { before = { falling: ((mem[A.flags] ?? 0) & 1) !== 0, fallen: mem[A.fallen] ?? 0, lives: mem[A.lives] ?? 0 }; };
  run.hooks.passEnd = (_outcome, mem) => {
    const now = { falling: ((mem[A.flags] ?? 0) & 1) !== 0, fallen: mem[A.fallen] ?? 0, lives: mem[A.lives] ?? 0 };
    if (before.falling) { // this pass was a fall pass: the counter went up two, and then the cells were looked at
      fell = true;
      const counter = before.fallen + 2;
      if (now.lives < before.lives) {
        if (run.game.lastDeath !== 'cell') other++; // the crusher, an enemy: not the fall
        else if ([0, 1, 2, 3].some((i) => mem[A.cells + i] === 1)) deadly++;
        else died.push(counter);
      } else if (!now.falling && now.fallen === 0) landed.push(counter);
    }
    before = now;
    if (now.lives < 3 || (!now.falling && fell)) run.done = true; // (landed or dead: this fall is over)
  };
  run.play({ choose: () => undefined }, 80);
  if (fell) falls++;
}

for (const room of ROOMS) {
  for (let x = 16; x <= 0xe0; x += 16) {
    for (const y of [0xa8, 0x8a, 0x6c, 0x4e]) drop(room.id, x, y);
  }
}

console.log(`   ${falls} falls from ${ROOMS.length * 14 * 4} places: ${landed.length} landings (counter ${Math.min(...landed)} to ${Math.max(...landed)}), ${died.length} deaths by the fall (counter ${Math.min(...died)} to ${Math.max(...died)}), ${deadly} on deadly cells, ${other} by something else`);
check(`the rebuilt game equals the original on every pass of every fall (${tally.mismatches} of ${tally.passes} differ)`, tally.mismatches === 0);
check(`every landing the original survived had a counter under ${FATAL_FALL} (the most: ${Math.max(...landed)})`, landed.length > 50 && landed.every((c) => c < FATAL_FALL));
check(`every landing it died in had a counter of ${FATAL_FALL} or more (the least: ${Math.min(...died)})`, died.length > 50 && died.every((c) => c >= FATAL_FALL));
check('both sides of the limit were met exactly: a landing with the counter 30 (15 passes, 30 pixels) and one with 32 (16 passes) or more', landed.includes(FATAL_FALL - 2) && died.includes(FATAL_FALL));
finish();
