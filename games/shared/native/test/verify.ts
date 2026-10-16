/**
 * Differential check of a native port's translated routines while the original
 * plays (random but repeatable joystick input): each routine is patched into
 * the running original, and on every call the native version and the original
 * run from the same state and must leave identical memory, registers and flags.
 *
 *   node /tmp/verify.mjs <game> [frames] [seed] [start.state]
 *   (GENERATORS=1: routines that wait too; CYCLES=1: the cycles they take must match too)
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { C64_KEYS } from '../../../../packages/c64kit/src/c64/keyboard';
import { findOverlayRoutine, isRoutine, type Routine } from '../host';
import { verifyInto } from '../patch';
import { GAMES, setJoy } from './games';

const [gameId, framesArg = '3000', seedArg = '1', startPath] = process.argv.slice(2);
const game = GAMES[gameId];
const port = game.port;
const m = new C64();
m.loadState(unpackState(new Uint8Array(fs.readFileSync(startPath ?? game.title))));
// START_PC: begin at this routine instead (e.g. the title's own entry, to check its setup code)
if (process.env.START_PC) { m.cpu.pc = parseInt(process.env.START_PC, 16); m.cpu.sp = 0xff; }
const routines: Record<string, Routine> = {};
for (const [name, fn] of Object.entries(port.engine)) if (isRoutine(fn)) routines[name] = fn;
// overlay entries: whichever version is loaded
for (const o of port.overlays) for (const v of o.versions) for (const name of Object.keys(v.code)) {
  const addr = parseInt(name.slice(2), 16);
  routines[name] = () => {
    const fn = findOverlayRoutine(o.versions, m.ram, addr);
    if (!fn) throw new Error(`no translated version of $${name.slice(2)} matches the loaded code`);
    fn();
  };
}
const bad = new Map<number, string[]>();
const irqAddr = Object.entries(port.engine).find(([, f]) => f === port.irq)?.[0];
// CIA timer reads (games use them as random numbers) come out the same in both runs of a call.
let timerReads = 0, runs = 0; // two runs per call: native, then the original
const onRead = m.cpu.onRead;
m.cpu.onRead = (a) => (m.ioVisible && (a & 0xff0f) === 0xdc04 ? (((runs - 1) >> 1) * 97 + timerReads++ * 151) & 0xff : onRead(a));
// An overlay entry whose loaded version waits for frames (a generator) can't be run as a plain call:
// those calls aren't checked (as the engine's generators aren't, without GENERATORS).
const waitingOverlay = new Set<number>();
const isWaitingOverlay = (a: number) => port.overlays.some((o) => a >= o.lo && a <= o.hi && findOverlayRoutine(o.versions, m.ram, a)?.constructor.name === 'GeneratorFunction');
const counts = verifyInto(m, routines, (a, d) => { if (isWaitingOverlay(a)) waitingOverlay.add(a); else if (!bad.has(a)) bad.set(a, d); }, (a) => `r_${a.toString(16).padStart(4, '0')}` !== irqAddr && !(game.interrupts ?? []).includes(a), () => { timerReads = 0; runs++; }, !!process.env.GENERATORS, !!process.env.CYCLES);
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let joy = 0x1f;
const t0 = performance.now();
for (let f = 0; f < Number(framesArg); f++) {
  if (f % 25 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8, 16]) if (rnd() < 0.3) joy &= ~b; }
  setJoy(m, game, !startPath && f < 40 ? (f >= 30 ? 0x0f : 0x1f) : joy);
  m.keys = f % 300 === 200 ? [C64_KEYS.KeyA] : [];
  game.cheat?.(m);
  if (!m.runFrame()) { console.log('CPU stopped at frame', f); break; }
}
const h = (a: number) => `$${a.toString(16).padStart(4, '0')}`;
if (process.env.LIST) console.log([...counts].map(([a, n]) => `${h(a)}×${n}`).join(" "));
if (waitingOverlay.size) console.log(`not checked (the loaded block's version waits for frames): ${[...waitingOverlay].map(h).join(' ')}`);
if (counts.skipped.size) console.log(`skipped (they wait for an interrupt): ${[...counts.skipped].map(h).join(' ')}`);
console.log(`${gameId}: ${Number(framesArg)} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s; ${counts.size} routines called at the top level, ${bad.size} differ`);
for (const [a, d] of bad) console.log(`\n${h(a)} (${counts.get(a)} calls): ${d.length} differences\n  ${d.slice(0, 12).join('\n  ')}`);
if (bad.size) process.exit(1);
