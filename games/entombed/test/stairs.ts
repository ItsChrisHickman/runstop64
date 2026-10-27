/**
 * Entombed's stairs: the gates to the other floors.
 *
 * Down a floor: corridor cells with a stairway in the back wall (the character $3E, walked up
 * into: $2719 takes the floor down one and puts him at the foot of the stairs, in a chamber).
 * Up a floor: the gate in that chamber ($AC, walked up into: $26FA takes the floor up one and puts
 * him back in the cell). The chambers with stairs are 3, 5, 7, 12, 15 and 17. In 3, 7 and 12 the
 * gate is free. In 5, 15 and 17 something stands in front of it that pushes him back (the chamber's
 * own code reads the sprite collision $3214, him and that sprite, and adds 1 to his y): a stone in 5
 * (it moves right for each of 41 jumps on the stone at the back on the left: $37FD), an altar in 15
 * (it clears once the small idol from chamber 10 is offered: $322D), a statue in 17 (the whip moves
 * it: $37FC). That is the original's: the stairs are not impassable once that is done.
 *
 * What is checked:
 * - the original game (the translated game with a joystick, and the original's own 6502 on the
 *   same snapshot): every stairs cell and the free gates lead to the next floor, with no 6502
 *   fallbacks; the three guarded gates lead nowhere until their puzzle is done, and to the next
 *   floor after it;
 * - through the front end as the browser runs it (play.ts), by keyboard, ORIGINAL and ENHANCED:
 *   he gets through every one (a walk does), and the guarded gates stay shut until the puzzle;
  * - ENHANCED's 8-way controls: from just before the stairs, up+left and up+right go through too.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/stairs.ts
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { C64Machine, Input, PixelRenderer, packState, unpackState, type MachineState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { EightWay } from '../../shared/native/controls';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { entombedControls } from '../src/combat';
import { run } from '../src/main';
import { chamberState } from '../re/hints/chambers';
import { replay } from '../re/hints/play';
import { readSolved } from '../re/hints/solved';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
stubFetch(titleBytes);


function gameStart(): MachineState {
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  return must(g.save(), 'a save');
}
const start = gameStart();

/** A corridor cell (travel, as the pause map does it). */
function cell(id: string): MachineState {
  const g = NativeHost.resume(port, start);
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    entombedMap.go(id, g.m.ram, entombedMap.found.empty());
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 6; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  return must(g.save(), 'a save');
}

type Key = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
/** A walk: the keys held, for this many frames. */
type Step = { keys: Key[]; frames: number };
const BITS: Record<Key, number> = { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 4, ArrowRight: 8 };
const bitsOf = (keys: Key[]) => keys.reduce((a, k) => a | BITS[k], 0);
const FLOOR = 0x37f7;

/** The game alone, a joystick and nothing else: the floor he comes to after a walk, and in which frame (null: he stays on his). */
function plain(state: MachineState, walk: Step[]): { floor: number; frame: number; fallbacks: number } | null {
  const g = NativeHost.resume(port, state);
  const r = g.m.ram, from = r[FLOOR];
  let n = 0;
  for (const s of walk) {
    const bits = bitsOf(s.keys);
    for (let f = 0; f < s.frames; f++, n++) {
      g.m.joy1 = g.m.joy2 = 0x1f & ~bits; g.tick(); r[0x37f6] = 0; r[0x323d] = 0;
      if (r[FLOOR] !== from) return { floor: r[FLOOR], frame: n, fallbacks: g.fallbacks.size };
    }
  }
  return null;
}

/** The original's own 6502 from the same snapshot, the same walk: the floor he comes to. */
function original(state: MachineState, walk: Step[]): number | null {
  const m = new C64Machine();
  m.loadState(state);
  const from = m.ram[FLOOR];
  for (const s of walk) {
    const bits = bitsOf(s.keys);
    for (let f = 0; f < s.frames; f++) {
      m.joy1 = m.joy2 = 0x1f & ~bits;
      if (!m.runFrame()) throw new Error('the original stopped');
      m.ram[0x37f6] = 0; m.ram[0x323d] = 0;
      if (m.ram[FLOOR] !== from) return m.ram[FLOOR];
    }
  }
  return null;
}

/** Walks to try from where he comes in: down first or not, sideways a while, then up into the wall. */
const walks: Step[][] = [];
for (const down of [0, 150]) for (const side of ['ArrowLeft', 'ArrowRight'] as const) for (let k = 0; k <= 80; k += 8) {
  const w: Step[] = [];
  if (down) w.push({ keys: ['ArrowDown'], frames: down });
  if (k) w.push({ keys: [side], frames: k });
  w.push({ keys: ['ArrowUp'], frames: 120 });
  walks.push(w);
}
/** A few of them, to show a gate stays shut. */
const fewWalks = walks.filter((_, i) => i % 6 === 0);
/** Two of those, for the slower ways of looking (the original's 6502, the front end), where a gate that stays shut costs every frame of every walk. */
const twoWalks = fewWalks.filter((_, i) => i % 4 === 0);

interface Way { name: string; state: MachineState; walk: Step[]; to: number; frame: number }
/** The first walk that takes him to another floor. */
function through(name: string, state: MachineState): Way | null {
  for (const walk of walks) {
    const res = plain(state, walk);
    if (res) {
      check(`${name}: the stairs run no 6502 fallback (${res.fallbacks})`, res.fallbacks === 0);
      return { name, state, walk, to: res.floor, frame: res.frame };
    }
  }
  return null;
}
const shut = (state: MachineState) => fewWalks.every((w) => plain(state, w) === null);

// The ways found by playing the game
const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
const TILES = new Set([0x3e, 0xac]);
const hasStairs = (state: MachineState) => {
  const g = NativeHost.resume(port, state);
  for (let f = 0; f < 3; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  for (let i = 0; i < 1000; i++) if (TILES.has(g.m.ram[0x400 + i])) return true;
  return false;
};
const downs: Way[] = [], gates: Way[] = [];
for (let floor = 1; floor <= 7; floor++) {
  for (const p of entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, start.ram, entombedMap.found.parse({ cells: { [floor]: all } }))) {
    const state = cell(p.id);
    if (!hasStairs(state)) continue;
    const way = through(`floor ${floor} cell ${p.id.split(':')[1]}`, state);
    if (way) downs.push(way);
  }
}
check(`stairs down in the corridors: one on each of the 7 floors (${downs.map((w) => w.name.replace(/ cell.*/, '')).join(', ')})`, downs.length === 7 && downs.every((w, i) => w.to === i));

// The chambers the stairs lead to: 3, 7 and 12 have a free gate; 5, 15 and 17 are guarded
const FREE = [3, 7, 12], GUARDED = [5, 15, 17];
for (const n of FREE) {
  const way = through(`chamber ${n}`, chamberState(n, {}, start));
  check(`chamber ${n}: the gate leads up a floor (to ${way?.to})`, !!way && way.to === way.state.ram[FLOOR] + 1);
  if (way) gates.push(way);
}
/** The guarded gates, with their puzzle done (what the game keeps for each). */
const opened = new Map<number, MachineState>();
opened.set(5, chamberState(5, { 0x37fd: 0x29 }, start)); // the stone moved ($37FD = 41 jumps)
opened.set(15, chamberState(15, { 0x322d: 1 }, start)); // the small idol in hand: the altar clears
{
  const solved = readSolved(pathToFileURL('games/entombed/re/hints/solved/chamber-17.json'));
  const given: Record<number, number> = {};
  for (const [a, v] of Object.entries(solved.given)) given[Number(a)] = v;
  opened.set(17, must(replay(chamberState(17, given, start), solved.steps[0].path).save(), 'the statue whipped')); // ($37FC = $20)
}
for (const n of GUARDED) {
  const shutNow = shut(chamberState(n, {}, start));
  const way = through(`chamber ${n} (puzzle done)`, must(opened.get(n), 'a state'));
  check(`chamber ${n}: the gate is shut as it comes, open once its puzzle is done (to floor ${way?.to})`, shutNow && !!way && way.to === way.state.ram[FLOOR] + 1);
  if (way) gates.push(way);
}

// The original's own 6502 does the same
{
  let same = 0, total = 0;
  for (const way of [...downs, ...gates]) { total++; if (original(way.state, way.walk) === way.to) same++; }
  check(`the original's 6502 takes each of the ${total} walks to the same floor (${same})`, same === total);
  let closed = 0;
  for (const n of GUARDED) if (twoWalks.every((w) => original(chamberState(n, {}, start), w) === null)) closed++;
  check(`  and keeps the guarded gates shut (${closed} of ${GUARDED.length}): it is the original's`, closed === GUARDED.length);
}

/** The front end, continued from a state, ORIGINAL or ENHANCED. */
async function session(state: MachineState, enhanced: boolean) {
  store.clear();
  state.ram[0x322e] = 1; // (the whip)
  store.set('entombed.save.v1', Buffer.from(packState(state)).toString('base64'));
  store.set('entombed.assist', JSON.stringify({ enhanced }));
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const ram = () => must(p.machine, 'the machine').ram;
  const tick = () => { input.poll(); p.tick(); p.render(0); const r = ram(); r[0x37f6] = 0; r[0x323d] = 0; };
  continueFromTitle(p, input, (n) => { for (let i = 0; i < n; i++) tick(); }); // (launched with a save: the title, then Enter)
  return { ram, tick, input };
}
/** Hold a walk's keys through the front end; the floor he comes to and the frame (null: he stays on his floor). */
async function through2(state: MachineState, walk: Step[], enhanced: boolean): Promise<{ floor: number; frame: number } | null> {
  const s = await session(state, enhanced), from = s.ram()[FLOOR];
  let n = 0;
  for (const step of walk) {
    for (const k of step.keys) s.input.keyDown(k);
    for (let f = 0; f < step.frames; f++, n++) { s.tick(); if (s.ram()[FLOOR] !== from) return { floor: s.ram()[FLOOR], frame: n }; }
    for (const k of step.keys) s.input.keyUp(k);
    s.tick(); s.tick(); n += 2;
  }
  return null;
}
/** The floor he comes to, by keyboard (null: he stays on his). */
async function keyboard(state: MachineState, walk: Step[], enhanced: boolean): Promise<number | null> {
  return (await through2(state, walk, enhanced))?.floor ?? null;
}
/** Does a walk (the one that works in the game first, then some others) take him through, from the state, in this mode? */
async function anyWalk(way: Way, enhanced: boolean) {
  for (const walk of [way.walk, ...walks.filter((w) => w !== way.walk)]) {
    const to = await keyboard(way.state, walk, enhanced);
    if (to !== null) return to;
  }
  return null;
}
for (const way of [...downs, ...gates]) {
  const orig = await anyWalk(way, false), enh = await anyWalk(way, true);
  check(`${way.name}: by keyboard, ORIGINAL goes to floor ${way.to} (${orig}), ENHANCED too (${enh})`, orig === way.to && enh === way.to);
}
for (const n of GUARDED) {
  let got = 0;
  for (const enhanced of [false, true]) for (const walk of twoWalks) if (await keyboard(chamberState(n, {}, start), walk, enhanced) !== null) got++;
  check(`chamber ${n}: by keyboard the gate stays shut until its puzzle is done, in ORIGINAL and ENHANCED (${got} walks through)`, got === 0);
}

// ENHANCED's 8-way: from just before the stairs, up with left or right held goes through
{
  const harness = (state: MachineState, bits: number, frames: number) => {
    const g = NativeHost.resume(port, state);
    const ew = new EightWay(entombedControls);
    let held = 0;
    g.onWait = (site) => {
      if (site !== port.mainLoopWait) return;
      ew.beforeFrame(g.m.ram, held, { call: (fn) => { const r = { ...cpu }; fn(); Object.assign(cpu, r); } });
    };
    const from = g.m.ram[FLOOR];
    for (let i = 0; i < frames; i++) {
      held = bits;
      g.m.joy1 = g.m.joy2 = 0x1f & ~ew.input(g.m.ram, bits);
      g.tick(); g.m.ram[0x37f6] = 0; g.m.ram[0x323d] = 0;
      if (g.m.ram[FLOOR] !== from) return g.m.ram[FLOOR];
    }
    return null;
  };
  let tried = 0, ok = 0, edge = 0;
  for (const way of [...downs, ...gates]) {
    // (four frames before he goes through: the walk run again to there)
    const g = NativeHost.resume(port, way.state);
    const until = Math.max(0, way.frame - 4);
    let n = 0;
    for (const s of way.walk) for (let f = 0; f < s.frames && n < until; f++, n++) {
      g.m.joy1 = g.m.joy2 = 0x1f & ~bitsOf(s.keys); g.tick(); g.m.ram[0x37f6] = 0; g.m.ram[0x323d] = 0;
    }
    const near = must(g.save(), 'a save');
    for (const side of [4, 8]) {
      tried++;
      const to = harness(near, 1 | side, 60);
      if (to === way.to) ok++;
      else if (way.name.includes('puzzle done')) edge++; // (beside the thing the puzzle moved: the sideways step meets it; the other side must go through)
      else console.log(`   ${way.name}: up+${side === 4 ? 'left' : 'right'} from just before the stairs: ${to}`);
    }
  }
  check(`ENHANCED: up+left and up+right held just before the stairs go through (${ok} of ${tried}; the other ${edge}, beside what the puzzle moved, meet it)`, tried > 0 && ok + edge === tried && edge <= 3);
}

finish();
