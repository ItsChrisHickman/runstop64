/**
 * Travel check (the pause map's "go back to a screen"), headless, against walking.
 *
 * Walking: the ways between screens found by playing (re/ways.json, re/ways.ts), each replayed
 * from its start (a screen entered at one end, re/play.ts makeStarts) until Thing walks into the
 * next screen: the walked arrival. And the lift: from level I's first corridor into the lift,
 * riding it, out onto the next level (scripted), for each level.
 *
 * Travel: from sources (each walked arrival, a moment's play on, and states along a real game
 * from the title), to every screen and end walked into, `go` at the main loop's wait (registers
 * kept, as play.ts does), and checks, at the first settled moment there:
 * - where he is (screen, level, room, its length, scroll, his x and y, which way he faces) is
 *   the walked arrival's, and so is the screen's map ($E000-$F4FF: built from the level's data)
 *   and what's on the picture;
 * - nothing the game keeps is changed: the oil, the score, pieces, oil cans and switches taken,
 *   the switches' effects, the lift;
 * - he's on his feet (no jump or fall carried in);
 * - round trips (there and on to another screen) hold up the same way;
 * - it's refused where travel isn't offered (mid-bounce, a tube, between screens), with memory untouched;
 * - the game plays on: 300 frames of random play after, with no 6502 fallbacks or hangs.
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/travel.ts
 */
import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { canTravel, go } from '../src/travel';
import { allOn, frames, INPUTS, joyOf, makeStarts, newGame, replayFrom, resumeSnap, snapper, step, type Snap } from '../re/play';
import { isArray, isArrayOf, isNumber, isRecord, isRecordOf, isString } from '../../shared/guards';
import { readJsonFile } from '../../shared/test/data';

interface Way { start: string; path: [number, number][] }
const isStep = (v: unknown): v is [number, number] => isArray(v) && v.length === 2 && isNumber(v[0]) && isNumber(v[1]);
const isWay = (v: unknown): v is Way => isRecord(v) && isString(v.start) && isArrayOf(v.path, isStep);
/** re/ways.json, checked: the ways between screens, each a start and the steps (joystick, frames). */
function readWays(file: string): Record<string, Way> {
  const v = readJsonFile(file);
  if (!isRecord(v) || !isRecordOf(v.ways, isWay)) throw new Error(`${file}: not { ways: { name: { start, path } } }`);
  return v.ways;
}
const ways = readWays('games/thingonaspring/re/ways.json');
let failures = 0;
const kinds = new Map<string, number>();
const fail = (msg: string) => {
  failures++;
  const kind = msg.replace(/^[^:]*: /, '').replace(/[$0-9a-f]{2,}.*$/, '').trim();
  kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  if ((kinds.get(kind) ?? 0) <= 3) console.log('FAIL', msg);
};
const hex = (n: number) => n.toString(16);
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Where he is. */
const PLACE = [0x5e, 0x5f, 0x20, 0x61, 0x0d, 0xca, 0x19];
/**
 * His x and y: as walking in put him, give or take what a frame's moving does
 * (walking in, he carries on as he was: a bounce, a fall; travelled, he comes in on his feet; and
 * the main loop's pass that builds a screen takes longer or shorter, so the first settled moment
 * comes a frame sooner or later).
 */
const NEAR: [number, number][] = [[0x1d, 2], [0x1e, 10]];
/** What the game keeps: oil (and oil to come), score, pieces, oil cans, switches (taken, and on), the lift. */
const PROGRESS = [0x8f, 0x90, ...range(0x364, 0x369), ...range(0x39f, 0x3be), ...range(0x5850, 0x585e), ...range(0x370, 0x375), 0x9d, 0x9e, 0xcc, 0x39d];
const screenOf = (ram: Uint8Array) => `${ram[0x5f]}.${ram[0x5e]}`;

// ---- 1. walking ----
const t0 = performance.now();
const starts = makeStarts();
const startOf = (id: string) => { const s = starts.get(id); if (!s) throw new Error(`no start ${id}`); return s; };
type Side = 'L' | 'R';
const isSide = (x: unknown): x is Side => x === 'L' || x === 'R';
/** "level.screen" and the end, from a key like "0.5L". */
function parseKey(key: string) {
  const m = key.match(/^(\d)\.(\d)([LR])$/), side = m?.[3];
  if (!m || !isSide(side)) throw new Error(`not a screen end: ${key}`);
  return { level: Number(m[1]), screen: Number(m[2]), side };
}
interface Arrival { key: string; side: Side; state: MachineState }
const arrivals = new Map<string, Arrival>(); // "level.screen" + side
const sources: MachineState[] = [];
/** Play on from a host until it settles in another screen; its snap there. */
function walk(g: NativeHost, inputs: () => number, frames: number, from: string) {
  let f = 0;
  const latest = snapper(g, () => f);
  for (; f < frames; f++) {
    step(g, inputs()); allOn(g.m.ram);
    const s = latest();
    if (s && screenOf(s.state.ram) !== from) return s;
  }
  return null;
}
/** Replay a way from its start (the start's own frame first): its first settled moment in the screen it goes to. */
function arrive(w: { start: string; path: [number, number][] }, to: string): Snap | null {
  const inputs = frames(w.path);
  const g = resumeSnap(startOf(w.start), INPUTS[inputs[0]].joy);
  allOn(g.m.ram);
  let f = 0;
  const latest = snapper(g, () => f);
  for (f = 1; f < inputs.length + 50; f++) {
    step(g, INPUTS[inputs[Math.min(f, inputs.length - 1)]].joy); allOn(g.m.ram);
    const sn = latest();
    if (sn && screenOf(sn.state.ram) === to) return sn;
  }
  return null;
}
let walked = 0;
for (const [way, w] of Object.entries(ways)) {
  const to = way.match(/^\d\.\d+>(\d\.\d+):[LR]$/)?.[1];
  if (!to) { fail(`way ${way}: not a way`); continue; }
  const [level, screen] = to.split('.').map(Number);
  if (screen < 1 || screen > 8) continue; // (past the eighth: not on the map)
  const arrived = arrive(w, to);
  if (!arrived) { fail(`way ${way}: replayed, didn't arrive`); continue; }
  walked++;
  // (which end: where the game put him, $4C1F: the left end, unscrolled, or the right)
  const st = arrived.state.ram, side: Side = st[0x19] === 0 && st[0x1d] < 0x54 ? 'L' : 'R';
  const key = `${level}.${screen}${side}`;
  if (!arrivals.has(key)) arrivals.set(key, { key, side, state: arrived.state });
  sources.push(arrived.state);
}
// the lift: from each level's first corridor, in, up a level, out
for (let level = 0; level < 3; level++) {
  const g = replayFrom(startOf(`${level}.1L`), [[0, 1]]);
  const J = joyOf;
  const run = (joy: number, n: number, until: () => boolean) => { for (let k = 0; k < n; k++) { step(g, joy); allOn(g.m.ram); if (until()) return true; } return false; };
  const r = g.m.ram;
  const ok = run(J('left'), 600, () => r[0x0d] === 2) && run(0x1f, 20, () => false) || true;
  run(J('fire'), 5, () => false);
  run(0x1f, 3000, () => r[0xa9] === 1);
  run(0x1f, 3000, () => r[0x5f] === level + 1);
  run(J('right'), 5, () => false);
  run(0x1f, 3000, () => r[0xa9] === 0);
  const s = walk(g, () => J('right'), 600, `${level + 1}.0`);
  if (!ok || !s || screenOf(s.state.ram) !== `${level + 1}.1`) { fail(`the lift from level ${level}: didn't get out on level ${level + 1}`); continue; }
  arrivals.set(`${level + 1}.1L`, { key: `${level + 1}.1L`, side: 'L', state: s.state });
  sources.push(s.state);
  walked++;
}
// a real game from the title: states along it
{
  const g = newGame(false);
  let f = 0;
  const latest = snapper(g, () => f);
  let seed = 3, joy = 0x1f;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
  for (; f < 3000; f++) {
    if (f % 30 === 0) joy = INPUTS[Math.floor(rnd() * INPUTS.length)].joy;
    step(g, joy, false);
    const sn = latest();
    if (f % 500 === 499 && sn) sources.push(sn.state);
  }
}
console.log(`${walked} ways walked (and ridden), ${arrivals.size} screen ends arrived at, ${sources.length} sources, in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

// ---- 2. travel ----
/** At a source, `go` at the next main loop wait; then the first settled snap in the screen gone to. */
function travel(from: MachineState, key: string) {
  const g = NativeHost.resume(port, from);
  const { level, screen, side } = parseKey(key);
  /** The moment of going: whether it went, and memory just before and after. */
  const going: { ok: boolean; before: Uint8Array; after: Uint8Array }[] = [];
  let f = 0;
  const latest = snapper(g, () => f);
  const snapWait = g.onWait;
  g.onWait = (site) => {
    if (!going.length && site === port.mainLoopWait) {
      const regs = { ...cpu };
      const before = g.m.ram.slice(), ok = go(g.m.ram, level, screen, side);
      going.push({ ok, before, after: g.m.ram.slice() });
      Object.assign(cpu, regs);
    }
    snapWait?.(site);
  };
  let at: Snap | null = null;
  for (; f < 400 && !at; f++) {
    step(g, 0x1f, false);
    const sn = latest(), went = going[0];
    if (went && !went.ok) break;
    if (went?.ok && sn && screenOf(sn.state.ram) === `${level}.${screen}` && f > 0) at = sn;
  }
  return { going: going.length ? going[0] : null, at, g };
}

let travels = 0, refused = 0, roundTrips = 0, played = 0, sameScreen = 0;
let seed = 11;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
const keys = [...arrivals.keys()];
function check(label: string, src: MachineState, key: string, deep: boolean) {
  const A = arrivals.get(key);
  if (!A) throw new Error(`no arrival at ${key}`);
  const T = travel(src, key), G = T.going;
  if (!G) { fail(`${label}: never at the main loop's wait`); return null; }
  if (!canTravel(src.ram)) {
    if (G.ok) fail(`${label}: went where travel isn't offered`);
    else if (G.before.some((v, i) => v !== G.after[i])) fail(`${label}: refused but changed memory`);
    else refused++;
    return null;
  }
  travels++;
  if (!G.ok) { fail(`${label}: refused`); return null; }
  if (!T.at) { fail(`${label}: never settled there`); return null; }
  const t = T.at.state.ram, a = A.state.ram;
  for (const x of PLACE) if (t[x] !== a[x]) fail(`${label}: place $${hex(x)} ${hex(t[x])} (walked ${hex(a[x])})`);
  for (const [x, d] of NEAR) if (Math.abs(t[x] - a[x]) > d) fail(`${label}: place $${hex(x)} ${hex(t[x])} (walked ${hex(a[x])})`);
  // going changes nothing the game keeps (between the moment before and after it)
  const b = G.before, g = G.after;
  for (const x of PROGRESS) if (b[x] !== g[x]) fail(`${label}: progress $${hex(x)} ${hex(g[x])} (was ${hex(b[x])})`);
  for (const x of [0x53, 0x55, 0x87, 0x83, 0x7a]) if (g[x]) fail(`${label}: not on his feet ($${hex(x)} ${g[x]})`);
  // the screen's map: a room's is built from its data, the same; a corridor's has its decorations
  // at random ($4D3E), but its floor, ceiling and doorways at both ends ($4CBA) are the same
  if (t[0x0d] === 0) { for (let x = 0xe000; x < 0xf500; x++) if (t[x] !== a[x]) { fail(`${label}: map $${hex(x)} ${hex(t[x])} (walked ${hex(a[x])})`); break; } }
  else for (const row of [9, 10, 11]) for (const col of [1, t[0xca]]) if (t[0xe000 + row * 256 + col] !== 0x32) fail(`${label}: corridor doorway missing at ${row},${col}`);
  if (deep) {
    // and the game plays on
    const g = NativeHost.resume(port, T.at.state);
    const before = g.fallbacks.size;
    let joy = 0x1f;
    try {
      for (let f = 0; f < 300; f++) { if (f % 20 === 0) joy = INPUTS[Math.floor(rnd() * INPUTS.length)].joy; step(g, joy); played++; }
    } catch (e) { fail(`${label}: playing on: ${e instanceof Error ? e.message : String(e)}`); }
    if (g.fallbacks.size > before) fail(`${label}: 6502 fallbacks playing on`);
  }
  return T.at.state;
}
const t1 = performance.now();
for (const [si, S] of sources.entries()) {
  const label = `source ${si} (${screenOf(S.ram)})`;
  for (const key of keys) {
    if (`${screenOf(S.ram)}` === key.slice(0, -1)) { sameScreen++; continue; }
    const there = check(`${label} -> ${key}`, S, key, si % 4 === 0);
    if (there && si % 5 === 0) {
      const other = keys[Math.floor(rnd() * keys.length)];
      if (other.slice(0, -1) !== key.slice(0, -1)) { check(`${label} -> ${key} -> ${other}`, there, other, false); roundTrips++; }
    }
  }
}
// refused where it isn't offered: between screens, in a tube, on a spring, at the end (go changes nothing)
for (const [si, S] of sources.entries()) {
  const unsettled: [string, number, number][] = [['between screens', 0x5d, 1], ['in a tube', 0x87, 1], ['on a spring', 0x83, 1], ['at the end', 0x1c, 1], ['in the lift', 0x0d, 2]];
  for (const [what, x, v] of unsettled) {
    const ram = S.ram.slice();
    ram[x] = v;
    const copy = ram.slice();
    if (go(ram, 0, (si % 8) + 1, 'L') !== false) fail(`${what}: went`);
    else if (ram.some((b, i) => b !== copy[i])) fail(`${what}: refused but changed memory`);
    else refused++;
  }
}
console.log(`${travels} travels (${roundTrips} round trips) in ${((performance.now() - t1) / 1000).toFixed(1)}s; ${refused} refused where travel isn't offered (memory untouched); ${played} frames played on`);
if (failures) console.log(`${failures} FAILURES:`, [...kinds].map(([k, n]) => `${k} x${n}`).join('; '));
else console.log('all good');
process.exit(failures ? 1 : 0);
