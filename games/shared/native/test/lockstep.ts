/**
 * Lockstep check of a fully native game against the original
 * running on c64kit's C64 machine: same snapshot, same input script, and the
 * timing-dependent inputs (CIA timer reads, jiffy clock, keyboard scan, sprite
 * collisions) fed the same values. Both are stepped by the game's own frame
 * waits (each call of the wait routine at $2098); memory and colour RAM must
 * match at every pass of the main loop.
 *
 *   node /tmp/lockstep.mjs <game> [waits] [seed] [start.state|-] [keys]
 *   JOY="wait:dirs,..." (env) scripts the joystick (e.g. "0:down,300:right"), else it's random
 *   keys: "wait:KEY,..." e.g. "300:F7,340:,400:F7,440:" (key held from that wait on; empty = released)
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { C64_KEYS } from '../../../../packages/c64kit/src/c64/keyboard';
import { NativeHost } from '../host';
import { GAMES, setJoy } from './games';

const [gameId, waitsArg = '2000', seedArg = '1', startArg = '-', keysArg = ''] = process.argv.slice(2);
const game = GAMES[gameId];
const titlePath = game.title;
const WAITS = Number(waitsArg);
const START = game.start ?? [30, 34];
const FROM = startArg !== '-' ? 'mainLoop' : 'title';
const start = unpackState(new Uint8Array(fs.readFileSync(FROM === 'mainLoop' ? startArg : titlePath)));

let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const joyScript: number[] = [];
let joy = 0x1f;
// JOY="wait:dirs,..." (e.g. "0:down,200:left+fire") scripts the joystick instead of random input
const joyPlan = (process.env.JOY ?? '').split(',').filter(Boolean).map((s) => { const [w, d] = s.split(':'); return { w: Number(w), bits: d.split('+').reduce((j, k) => j & ~({ up: 1, down: 2, left: 4, right: 8, fire: 16 }[k] ?? 0), 0x1f) }; });
for (let i = 0; i < WAITS + 10; i++) {
  if (joyPlan.length) joy = [...joyPlan].reverse().find((p) => p.w <= i)?.bits ?? 0x1f;
  else if (i % 20 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8, 16]) if (rnd() < 0.3) joy &= ~b; }
  joyScript.push(joy);
}
const keyAt: { w: number; key: string }[] = keysArg.split(',').filter(Boolean).map((s) => { const [w, key] = s.split(':'); return { w: Number(w), key }; });
const keyFor = (w: number) => [...keyAt].reverse().find((k) => k.w <= w)?.key ?? '';

interface Side { m: C64; w: number; snaps: Uint8Array[]; collisions: Map<number, number[]> }
const collisionLog = new Map<number, number[]>();

// Per wait: input, jiffy and keyboard scan, done the same way on both sides.
function waitStart(s: Side) {
  s.w++;
  const m = s.m;
  setJoy(m, game, joyScript[s.w] ?? 0x1f);
  const key = keyFor(s.w);
  m.keys = key ? [C64_KEYS[key]] : [];
  m.ram[0xc5] = m.ram[0xcb];
  m.ram[0xcb] = key ? C64_KEYS[key][0] * 8 + C64_KEYS[key][1] : 64;
  m.ram[0xa2] = (m.ram[0xa2] + 1) & 0xff;
}
function determinise(s: Side, original: boolean) {
  const m = s.m;
  m.hooks.set(0xea31, () => 'continue');
  let reads = 0, last = -2, cidx = 0, clast = -2;
  const onRead = m.cpu.onRead;
  m.cpu.onRead = (a) => {
    if (m.ioVisible && (a & 0xff0f) === 0xdc04) { if (s.w !== last) { last = s.w; reads = 0; } return (s.w * 73 + reads++ * 151) & 0xff; }
    const v = onRead(a);
    if (m.ioVisible && a >= 0xd000 && a < 0xd400 && ((a & 0x3f) === 0x1e || (a & 0x3f) === 0x1f)) {
      if (original) { const log = collisionLog.get(s.w) ?? []; collisionLog.set(s.w, log); log.push(v ?? 0); return v; }
      if (s.w !== clast) { clast = s.w; cidx = 0; }
      return collisionLog.get(s.w)?.[cidx++] ?? v;
    }
    return v;
  };
}
const snap = (m: C64) => { const s = new Uint8Array(0x10400); s.set(m.ram); s.set(m.colour, 0x10000); return s; };

// A save the native port took (at its main loop's wait call, which the original then makes).
let nativeSave = FROM === 'mainLoop' && start.cpu.pc === game.mainLoopWait;
// A: the original.
const A: Side = { m: new C64(), w: -1, snaps: [], collisions: new Map() };
A.m.loadState(start);
determinise(A, true);
const step = A.m.cpu.step.bind(A.m.cpu);
A.m.cpu.step = () => {
  const pc = A.m.cpu.pc;
  if (pc === game.mainLoopWait) { if (nativeSave) nativeSave = false; else A.snaps.push(snap(A.m)); }
  if (pc === game.waitRoutine[0] && !game.inputAtScan) waitStart(A);
  return step();
};
// B: native.
const native = new NativeHost(game.port, start, FROM);
const B: Side = { m: native.m, w: -1, snaps: [], collisions: new Map() };
determinise(B, false);
if (game.inputAtScan) {
  for (const side of [A, B]) {
    const scan = side.m.scnkey.bind(side.m);
    side.m.scnkey = () => { waitStart(side); scan(); };
  }
}
if (FROM === 'mainLoop') { setJoy(A.m, game, 0x1f); setJoy(B.m, game, 0x1f); }
// (a save the native port took, at its main loop's wait call: the original starts by making that call,
// the native one is already in it; so the original's first pass isn't compared, and the native one takes that wait's input now)
if (nativeSave) waitStart(B);

const where = (k: number) => (k < 0x10000 ? `$${k.toString(16).padStart(4, '0')}` : `colour $${(k - 0x10000).toString(16)}`);
let frames = 0, compared = 0;
const t0 = performance.now();
let bWaiting = false; // native has reached its first frame wait (title fire handled by frame number before that)
native.onWait = (site) => {
  // (a native start from the title redraws it as the game's start does, waiting frames on the way:
  // those waits come before the original's first, as the snapshot was taken after them)
  if (game.titleSetupWaits && FROM === 'title' && A.w < 0 && site !== game.mainLoopWait) return;
  bWaiting = true;
  if (site === game.mainLoopWait) B.snaps.push(snap(B.m));
  if (!game.inputAtScan) waitStart(B);
};
while (A.w < WAITS && frames < WAITS * 4 + 500) {
  frames++;
  if (A.w < 0 && FROM === 'title') setJoy(A.m, game, frames >= START[0] && frames < START[1] ? 0x0f : 0x1f);
  if (!A.m.runFrame()) throw new Error('original stopped');
  // Native: tick until it has caught up with the original's waits (not past them: its collision reads are replayed).
  if (!bWaiting && FROM === 'title') setJoy(B.m, game, frames >= START[0] && frames < START[1] ? 0x0f : 0x1f);
  if (A.w < 0 || !bWaiting) native.tick(); // title: frame by frame
  else while (B.w + 2 < A.w) native.tick(); // a full wait behind: the original has logged that wait's collision reads
  while (A.snaps.length && B.snaps.length) {
    const a = A.snaps.shift(), b = B.snaps.shift();
    if (!a || !b) break; // (both there: just checked)
    const diffs: string[] = [];
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k] && !(k >= 0x100 && k < 0x200) && !(game.ignore ?? []).some(([lo, hi]) => k >= lo && k <= hi)) diffs.push(`${where(k)}: original ${a[k].toString(16)} native ${b[k].toString(16)}`);
    if (diffs.length) {
      console.log(`DIVERGED at pass ${compared} (wait ${A.w}, frame ${frames}, place ${game.place(A.m)}): ${diffs.length} differences\n  ${diffs.slice(0, 40).join('\n  ')}`);
      process.exit(1);
    }
    compared++;
  }
}
console.log(`OK: ${compared} passes identical over ${A.w} waits (${frames} frames, ${((performance.now() - t0) / 1000).toFixed(1)}s); place ${game.place(A.m)}; native waited last at $${native.lastWait.toString(16)}`);
