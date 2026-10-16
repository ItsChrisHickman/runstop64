/**
 * The shovel, with travel (re/README.md, "The shovel"): it lies in room 18 (cell 4,2, block $EF20) as
 * sprite 6; a stone thrown facing up that meets it ($6235) takes it ($342F = 1, the sprite gone).
 *
 * Walks a recorded route (re/routes.json) into its room, the map noting places as the front end does,
 * then arrives there again every way the map offers, from where the route ends there:
 *
 * - from each place as walking came onto it, travel there; travel to each other place noted and back; chains of two places and back; travel next door (4,1)
 *   and walk in from there; travel away and back after walking about there a while;
 *
 * and checks, for each arrival, that the shovel and the two ants either side of it are as walking in
 * left them (shown, where, its image and how it's drawn, not taken) and that a stone takes it (played:
 * steered below it and thrown facing up); that once the ants have closed in round it, none does;
 * that the original (on the C64, from the same state) takes it with the same play, from the walked
 * arrival and the travelled ones; that taken, it stays taken after travel and coming back; and that in
 * the original, walking out and back in leaves it there to take.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/shovel.ts
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { cpu } from '../../shared/native/cpu';
import { isNumbers, isRecordOf, type Found } from '../../shared/native/pause';
import { must } from '../../shared/test/must';
import { port } from '../src/native';
import { dragonskulleMap } from '../src/map';
import { playing } from '../src/travel';

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const ROOM = 18, CELL = '4,2', BELOW = '4,1';
/** Kept alive along the way, as the routes were found. */
const keep = (r: Uint8Array) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; };
/** A machine to play: the native port or the original. */
interface Player { ram: Uint8Array; vic: Uint8Array; step(joy: number): void }
const native = (s: MachineState): Player & { g: NativeHost } => {
  const g = NativeHost.resume(port, s);
  return { g, ram: g.m.ram, vic: g.m.vic, step: (joy) => { g.m.joy1 = g.m.joy2 = joy; g.m.keys = []; g.tick(); keep(g.m.ram); } };
};
const original = (s: MachineState): Player => {
  const m = new C64();
  m.loadState(s);
  return { ram: m.ram, vic: m.vic, step: (joy) => { m.joy1 = m.joy2 = joy; m.keys = []; if (!m.runFrame()) throw new Error('the original stopped'); keep(m.ram); } };
};
const saved = (g: NativeHost) => must(g.save(), 'a save at the main loop wait');
const cell = (r: Uint8Array) => `${r[0x20a8]},${r[0x20a9]}`;

/** The shovel as it's shown: sprite 6 (on or off, where, its image's pointer and bytes, how it's drawn). */
const shovel = (p: { ram: Uint8Array; vic: Uint8Array }) => {
  const v = p.vic, r = p.ram, bit = 0x40;
  let image = 0;
  for (let i = 0; i < 64; i++) image = (Math.imul(image, 31) + r[r[0x07fe] * 64 + i]) >>> 0;
  const ant = (n: number) => (v[0x15] & (1 << n) && !(v[0x10] & (1 << n)) ? `${v[2 * n]},${v[2 * n + 1]}` : 'off the screen');
  return `ants ${ant(4)} ${ant(5)}; on ${v[0x15] & bit ? 1 : 0} x ${v[12] + (v[0x10] & bit ? 256 : 0)} y ${v[13]} image ${r[0x07fe].toString(16)}:${image.toString(16)} multicolour ${v[0x1c] & bit ? 1 : 0} expanded ${v[0x17] & bit ? 1 : 0}${v[0x1d] & bit ? 1 : 0} behind ${v[0x1b] & bit ? 1 : 0} taken ${r[0x342f]}`;
};

/**
 * Take it with a stone, played: the hand on the stone (action 3), walked below and to the left of it
 * (a stone thrown facing up flies up and to the right, and must meet it within 8 pixels across while
 * high enough, $6235), then thrown facing up. Frames until it's taken, or -1.
 */
function take(start: () => Player, seed = 3): number {
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let attempt = 0; attempt < 20; attempt++) {
    const p = start();
    let dx = 0, dy = 0;
    for (let f = 0; f < 900; f++) {
      const r = p.ram;
      r[0x12eb] = 3;
      if (f % 100 === 0) { dx = Math.floor(rnd() * 33) - 16; dy = Math.floor(rnd() * 17) - 8; }
      const x = r[0x341d] + (p.vic[0x10] & 4 ? 256 : 0), y = r[0x341e];
      const tx = r[0x3408] - 0x38 + (dx >> 2), ty = 0x8a + (dy >> 2);
      let j = y > ty + 1 ? 1 : x < tx - 1 ? 8 : x > tx + 1 ? 4 : y < ty - 1 ? 2 : 0;
      if (!j) j = f % 30 < 3 ? 1 : f % 30 < 7 ? 16 : 0;
      p.step(0x1f & ~j);
      if (r[0x342f] === 1) return attempt * 900 + f;
      if (r[0x341c] !== ROOM) break;
    }
  }
  return -1;
}

// ---- walk the route into the shovel's room ----------------------------------------------------------
const routes: unknown = JSON.parse(fs.readFileSync('games/dragonskulle/re/routes.json', 'utf8'));
const title = unpackState(new Uint8Array(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state')));
let walked: MachineState | null = null, end: MachineState | null = null;
let belowX = -1; // where he went up out of the screen below into the shovel's room
const found: Found = {};
const walkedAt = new Map<string, MachineState>(); // each place as walking came onto it
if (Array.isArray(routes)) for (const route of routes) {
  if (!Array.isArray(route) || walked) continue;
  const rle = route.filter((n): n is number => typeof n === 'number');
  const g = new NativeHost(port, title);
  const noted: Found = {};
  let frame = 0;
  for (let i = 0; i < rle.length; i += 2) for (let k = 0; k < rle[i + 1]; k++) {
    g.m.joy1 = g.m.joy2 = rle[i] & 0x1f; g.m.keys = rle[i] & 32 ? [[1, 2]] : [];
    g.tick(); keep(g.m.ram); frame++;
    if (frame <= 300 || g.lastWait !== port.mainLoopWait) continue;
    const before = Object.keys(isRecordOf(noted.at, isNumbers) ? noted.at : {}).length;
    dragonskulleMap.observe(g.m.ram, noted, g.m.vic);
    if (!walked && Object.keys(isRecordOf(noted.at, isNumbers) ? noted.at : {}).length > before) walkedAt.set(cell(g.m.ram), saved(g));
    if (cell(g.m.ram) === BELOW && g.m.ram[0x341c] !== ROOM) belowX = g.m.ram[0x341d] + (g.m.vic[0x10] & 4 ? 256 : 0);
    if (!walked && g.m.ram[0x341c] === ROOM) walked = saved(g);
  }
  if (walked) { end = saved(g); Object.assign(found, noted); }
}
const W = must(walked, `a route into the shovel's room (${CELL})`), E = must(end, 'the route\'s end');
const at = isRecordOf(found.at, isNumbers) ? found.at : {};
const places = Object.keys(at).filter((k) => k !== CELL);
check(`walked into its room (${CELL}, block ${W.ram[0x341c]}); places noted on the way: ${Object.keys(at).join(' ')}`, !!at[CELL] && places.includes(BELOW));
const want = shovel(native(W));
check(`walking in: the shovel's there, the ants either side of it (${want})`, want.includes('on 1') && want.endsWith('taken 0') && !want.includes('off the screen'));

/** Travel to a place by the map, at the main loop's wait as the front end does; the state a frame later. */
function travel(s: MachineState, id: string): MachineState {
  const g = NativeHost.resume(port, s);
  let done = false, ok = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true;
    const regs = { ...cpu };
    ok = dragonskulleMap.go?.(id, g.m.ram, JSON.parse(JSON.stringify(found))) ?? false;
    Object.assign(cpu, regs);
  };
  g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); keep(g.m.ram);
  if (!ok || cell(g.m.ram) !== id) throw new Error(`travel to ${id} from ${cell(s.ram)} didn't go`);
  return saved(g);
}
/** Walk about a while (random, seeded), until he can travel again. */
function wander(s: MachineState, seed: number): MachineState {
  const p = native(s);
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
  let joy = 0x1f;
  for (let f = 0; f < 200 || !playing(p.ram); f++) {
    if (f % 20 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8]) if (rnd() < 0.3) joy &= ~b; }
    p.step(f < 200 ? joy : 0x1f);
    if (f > 600) break;
  }
  return saved(p.g);
}

// ---- every way back -----------------------------------------------------------------------------------
const arrivals: { how: string; state: MachineState }[] = [];
// from each place as walking came onto it (what the screens before left behind, as it was)
for (const [a, state] of walkedAt) if (a !== CELL) arrivals.push({ how: `${a} (walked in) -> ${CELL}`, state: travel(state, CELL) });
for (const a of places) arrivals.push({ how: `${CELL} -> ${a} -> ${CELL}`, state: travel(travel(E, a), CELL) });
for (const a of places) for (const b of places) if (a !== b && (a === BELOW || b === BELOW || a < b)) arrivals.push({ how: `-> ${a} -> ${b} -> ${CELL}`, state: travel(travel(travel(E, a), b), CELL) });
places.forEach((a, i) => arrivals.push({ how: `-> ${a}, walking about there -> ${CELL}`, state: travel(wander(travel(E, a), 17 + i), CELL) }));
// travel next door and walk in (up from where the route went up)
for (const from of [E, travel(E, places[0])]) {
  const p = native(travel(from, BELOW));
  for (let f = 0; f < 1500 && p.ram[0x341c] !== ROOM; f++) {
    const x = p.ram[0x341d] + (p.vic[0x10] & 4 ? 256 : 0);
    p.step(0x1f & ~(x < belowX - 1 ? 8 : x > belowX + 1 ? 4 : 1));
  }
  if (p.ram[0x341c] === ROOM) arrivals.push({ how: `-> ${BELOW} (from ${cell(from.ram)}), walked in`, state: saved(p.g) });
  else check(`-> ${BELOW}: walked in`, false);
}

let same = 0, taken = 0;
for (const { how, state } of arrivals) {
  const got = shovel(native(state));
  if (got !== want) check(`${how}: the shovel as walking in left it (${got})`, false); else same++;
  if (take(() => native(state)) >= 0) taken++; else check(`${how}: a stone takes it`, false);
}
check(`${arrivals.length} arrivals by travel (and walking in after travel): the shovel as walking in left it in ${same}, a stone takes it in ${taken}`, same === arrivals.length && taken === arrivals.length);

// ---- the original, from the same states ----------------------------------------------------------------
const walkedTake = take(() => original(W));
check(`the original, walked in: a stone takes it (${walkedTake} frames)`, walkedTake >= 0);
let origTaken = 0;
const some = arrivals.filter((_, i) => i % 4 === 0);
for (const { how, state } of some) if (take(() => original(state)) >= 0) origTaken++; else check(`the original, ${how}: a stone takes it`, false);
check(`the original from ${some.length} travelled arrivals: a stone takes it in ${origTaken}`, origTaken === some.length);

// ---- the ants close in: then it can't be taken (the original's way) ----------------------------------
// (every 16 frames each ant takes a step towards it, 36 steps, $6110; a stone that touches an ant as it
// meets the shovel doesn't take it, $6257: from about 9 seconds in, every throw does)
{
  const p = native(W);
  for (let f = 0; f < 600; f++) p.step(0x1f);
  const late = saved(p.g);
  check(`the ants closed in (${shovel(native(late))}): no stone takes it`, take(() => native(late)) < 0);
}

// ---- taken, it stays taken -------------------------------------------------------------------------------
{
  const p = native(W);
  const frames = take(() => p);
  for (let f = 0; f < 50; f++) p.step(0x1f);
  const after = saved(p.g);
  const back = native(travel(travel(after, BELOW), CELL));
  check(`taken (${frames} frames), then travel away and back: still taken, not shown (${shovel(back)})`, frames >= 0 && back.ram[0x342f] === 1 && back.vic[13] === 0);
}
// ---- the original: out and back in by walking ---------------------------------------------------------
{
  const p = original(W);
  let left = false, back = false;
  for (let f = 0; f < 1500 && !back; f++) {
    if (!left) { p.step(0x1f & ~2); left = p.ram[0x341c] !== ROOM; continue; }
    const x = p.ram[0x341d] + (p.vic[0x10] & 4 ? 256 : 0);
    p.step(0x1f & ~(x < belowX - 1 ? 8 : x > belowX + 1 ? 4 : 1));
    back = p.ram[0x341c] === ROOM;
  }
  for (let f = 0; f < 30; f++) p.step(0x1f); // (the original takes frames to draw the screen)
  check(`the original: out (down, ${left}) and back in by walking (${back}, at ${cell(p.ram)}): the shovel's there (${shovel(p)})`, back && shovel(p).split('; ')[1] === want.split('; ')[1] && !shovel(p).includes('off the screen'));
}

console.log(failures ? `${failures} failures` : 'all passed');
process.exit(failures ? 1 : 0);
