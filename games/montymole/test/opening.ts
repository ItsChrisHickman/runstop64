/**
 * The opening scene (`$CD41`, the loop at `$CD98`, `src/opening.ts` and `Game.openingPass`) against the original running, pass by pass, the way test/lockstep.ts does the rooms
 * (test/lockstep-core.ts: the same `Run` with the scene's own layout, its interrupt routine called by the harness once a pass). The first comparison is of the scene as it begins
 * (the original's start from the options menu: `$CD41` on `build/opening.state`): the 6144 bytes of screen, the attributes, the picture buffer, Monty, the coal, the table's
 * enemy states and every one of the opening's variables; then every pass: the pot, the wife, the bird and the acorn, the water and the corner picture, the touch test, Monty,
 * the gift at x `$40` (the coal and room 0's enemies) and the way out at x `$E0` into room 0, where the original has not yet drawn the room (what it holds is compared).
 *
 * The random players of the rooms' lockstep play it from where the scene begins and from placements in it (anywhere along the ground, up in the air), making for the pot, the
 * pit and the way out; and from room 0, walking off its left edge into the scene (so the scene begins with what room 0 left: the record's classes, the coal mask, the opening's
 * variables as the last visit left them). Dying in it is where the rebuilt game parts from the original (which freezes for the whole death tune; QOL.md): the comparison stops there.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/opening.ts [runs-of-each-kind]
 */
import { check, finish } from '../../../games/shared/test/check';
import type { Spectrum } from '../../../tools/zx/spectrum';
import { A, mulberry, OPENING_LAYOUT, ROOM_LAYOUT, Run, Tally, type Keep } from './lockstep-core';
import { RandomPlayer, type Move } from './random-player';
import type { Control } from '../src/input';

const [scale = '1'] = process.argv.slice(2);
const SCALE = Number(scale);
const OPENING_STATE = 'games/montymole/build/opening.state', ROOM0_STATE = 'games/montymole/build/room0.state';
const KEEP: Keep = { opening: true, coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true };
const CONTROLS: readonly Control[] = [1, 1, 1, 2, 3];

const tally = new Tally();
const t0 = Date.now();
const phases: { name: string; passes: number }[] = [];
const phase = (name: string, from: number): void => { phases.push({ name, passes: tally.passes - from }); };

/** What the scene was doing, for the report of what was met. */
interface Look { readonly pot: number; readonly acornOut: number; readonly acornY: number; readonly way: number; readonly wife: number; readonly sun: number; readonly lives: number; readonly x: number }
function look(run: Run): Look {
  const o = run.game.opening;
  return { pot: o.potWaits, acornOut: o.acornOut, acornY: o.acornY, way: o.birdWay, wife: o.wifeX, sun: o.sunFrame, lives: run.game.lives, x: run.game.monty.x };
}

/** Watch what the scene does. */
function watch(run: Run): void {
  const seen = (what: string): void => tally.see(what);
  let before = look(run);
  run.hooks.passEnd = (_outcome, mem) => {
    if (process.env.TRACE !== undefined) console.log(`   pass ${run.passes} original x ${mem[A.x]} y ${mem[A.y]} flags ${mem[A.flags]?.toString(16)} fallen ${mem[A.fallen]} lives ${mem[A.lives]} room ${mem[A.room]}; rebuilt x ${run.game.monty.x} y ${run.game.monty.y}`);
    const g = run.game, o = g.opening;
    if (before.pot === 1 && o.potWaits === 0) seen('the pot passed');
    if (before.acornOut === 0 && o.acornOut === 1) seen('the acorn dropped');
    if (before.acornY > 0x4f && o.acornY === 0x4f) seen('the acorn landed');
    if (before.acornOut === 1 && o.acornOut === 0) seen('the acorn became the pot');
    if (before.way !== o.birdWay) seen(`the bird turned ${o.birdWay === 1 ? 'right' : 'left'}`);
    if (before.wife !== o.wifeX && o.potWaits === 0) seen('the wife walked');
    if (before.sun !== o.sunFrame) seen('the corner picture changed');
    if (g.exitedTo === 0) seen('left for room 0');
    if (g.monty.x >= 0xe0 && before.x < 0x20) seen('wrapped round the left edge');
    if (g.monty.jumpDir !== 0) seen('jumping in the scene');
    if ((g.monty.flags & 1) !== 0) seen('falling in the scene');
    before = look(run);
  };
}

/** Put Monty at a place in the scene, standing or falling, once it has begun. */
function placed(x: number, y: number, falling: boolean): (m: Spectrum) => void {
  return (m) => {
    const w = (a: number, v: number): void => { m.mem[a] = v & 255; };
    w(A.x, x); w(A.y, y); w(A.input, 4);
    if (falling) { w(A.flags, 1); w(A.flags2, 0x80); w(A.fallen, 0); }
  };
}

/** A run from the scene's start, with a placement once it has begun. */
function scene(label: string, seed: number, place: ((m: Spectrum) => void) | null, passes: number, bias: Move | null = null): void {
  if (process.env.ONLY !== undefined && !label.includes(process.env.ONLY)) return;
  const rnd = mulberry(seed);
  const control = CONTROLS[Math.floor(rnd() * CONTROLS.length)] ?? 1;
  const run = new Run(tally, OPENING_STATE, label, control, control === 2 || rnd() < 0.3, undefined, KEEP, OPENING_LAYOUT);
  run.afterSetup = place;
  watch(run);
  run.play(new RandomPlayer(rnd, control, 0.15, bias), passes);
}

/** A run from room 0 that walks off its left edge into the scene and goes on through it. */
function fromRoom0(label: string, seed: number, passes: number): void {
  if (process.env.ONLY !== undefined && !label.includes(process.env.ONLY)) return;
  const rnd = mulberry(seed);
  const control = CONTROLS[Math.floor(rnd() * CONTROLS.length)] ?? 1;
  const x = 4 + 2 * Math.floor(rnd() * 8);
  const run = new Run(tally, ROOM0_STATE, label, control, control === 2 || rnd() < 0.3, (m) => {
    m.mem[A.x] = x; m.mem[A.y] = 0x27; m.mem[A.input] = 4;
    m.cpu.pc = 0x940c; m.cpu.halted = false;
  }, KEEP, ROOM_LAYOUT);
  run.intoOpening = true;
  watch(run);
  run.play(new RandomPlayer(rnd, control, 0.15, 'left'), passes);
}

// ---- the runs -------------------------------------------------------------------------------------------------------

let from = tally.passes;
// the scene as it begins, and then played at random
for (let k = 0; k < 6 * SCALE; k++) scene(`from the start #${k}`, 100 + k, null, 700);
phase('the scene from its start, played at random', from);

from = tally.passes;
// from places along the ground and in the air
for (let k = 0; k < 60 * SCALE; k++) {
  const rnd = mulberry(5000 + k);
  const x = 8 + 2 * Math.floor(rnd() * 108);
  const air = rnd() < 0.2;
  scene(`placed #${k}`, 6000 + k, placed(x, air ? 0x4f + 2 * Math.floor(rnd() * 20) : 0x4f, air), 160);
}
phase('placements along the scene', from);

from = tally.passes;
// making for the pot (the gift at x $40), the pit and the way out to the left (x wraps round to $E0)
for (let k = 0; k < 30 * SCALE; k++) {
  const rnd = mulberry(7000 + k);
  const x = k % 3 === 0 ? 0x44 + 2 * Math.floor(rnd() * 4) : k % 3 === 1 ? 4 + 2 * Math.floor(rnd() * 12) : 0x20 + 2 * Math.floor(rnd() * 20);
  scene(`left #${k}`, 8000 + k, placed(x, 0x4f, false), 220, 'left');
}
for (let k = 0; k < 12 * SCALE; k++) {
  const rnd = mulberry(9000 + k);
  scene(`right #${k}`, 9500 + k, placed(0x30 + 2 * Math.floor(rnd() * 40), 0x4f, false), 160, 'right');
}
phase('making for the pot and the way out', from);

from = tally.passes;
// room 0 walked off its left edge into the scene
for (let k = 0; k < 16 * SCALE; k++) fromRoom0(`room 0 to the scene #${k}`, 12000 + k, 260);
phase('from room 0 into the scene and on', from);

const seconds = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`   ${tally.passes} passes compared (${phases.map((p) => `${p.passes} ${p.name}`).join(', ')}) in ${seconds} s`);
console.log(`   covered: ${[...tally.seen].sort().map(([k, n]) => `${k} ${n}`).join(', ')}`);
if (tally.diverged.size > 0) console.log(`   runs ended where the rebuilt game parts from the original on purpose: ${[...tally.diverged].join('; ')}`);
for (const f of tally.first) console.log(`   ${f.label} pass ${f.pass} room ${f.room}: ${f.what.join('; ')}`);
if (tally.byField.size > 0) console.log(`   differing: ${[...tally.byField].map(([k, n]) => `${k} ${n}`).join(', ')}`);
check(`the scene's input byte equals what $82A6 made on every pass (${tally.inputMismatches} differ)`, tally.inputMismatches === 0);
check(`every pass of the opening scene: Monty, the pot, the wife, the bird and the acorn, the water and the corner picture, the screen, the attributes and the buffers, the coal and the table's enemy states equal (${tally.mismatches} of ${tally.passes} passes differ)`, tally.mismatches === 0);
const need = ['the pot passed', 'the acorn dropped', 'the acorn landed', 'the acorn became the pot', 'the bird turned right', 'the bird turned left', 'the wife walked', 'the corner picture changed', 'left for room 0', 'died in the scene', 'wrapped round the left edge', 'jumping in the scene', 'falling in the scene'];
if ([...tally.diverged].some((d) => d.startsWith('he died in the opening'))) tally.see('died in the scene'); // (the pass of a death is where the comparison stops)
const missing = need.filter((n) => (tally.seen.get(n) ?? 0) === 0);
check(`every situation was met: ${need.join(', ')}${missing.length > 0 ? `; not met: ${missing.join(', ')}` : ''}`, missing.length === 0);
finish();
