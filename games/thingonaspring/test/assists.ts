/**
 * ENHANCED (src/assists.ts), checked by playing (headless): each part's trace against the
 * original's from the same state with the same joystick (the original's play up to the moment,
 * then the part on), and long random play with ENHANCED on.
 *
 * - air: in the air, the joystick turns him (the original goes on the way he left the ground);
 *   a wall stops him instead of throwing him back.
 * - grace: a bounce asked for 2 frames after walking off an edge goes; one asked for (and let go)
 *   4 frames before landing goes on landing. The original: neither.
 * - landing: a bounce that catches a ledge's edge (the wall in his lowest row only, room above)
 *   lands on it; the original throws him back and he falls.
 * - fall: never more than 4 pixels a frame (the original: 8).
 * - drain: the same play takes half the oil.
 * - Safety, with ENHANCED (and each part alone), over long random play from every screen: no
 *   more frames inside a wall or floor than the original's own play has, no 6502 fallbacks, no
 *   hangs, and he still gets from screen to screen. (That ENHANCED still gets everywhere the
 *   original does: re/ways.ts with ENHANCED=1, see re/README.md.)
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/assists.ts
 */
import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { makeEnhanced, PARTS, type Part } from '../src/assists';
import { allOn, INPUTS, joyOf, makeStarts, step } from '../re/play';

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const J = joyOf;
const NONE = 0x1f;

/** A game resumed from a state, with ENHANCED's parts `on`: each frame, then ENHANCED after it (and at its hooks), as main.ts has it. */
function player(state: MachineState, on: readonly Part[], cheat = true) {
  const g = NativeHost.resume(port, state);
  const a = makeEnhanced();
  const p: { g: NativeHost; frame: (joy: number) => void; ram: Uint8Array; on: readonly Part[] } = { g, frame: (joy: number) => {
    step(g, joy, cheat); allOn(g.m.ram);
    a.afterFrame(g.m.ram, (x) => p.on.includes(x));
  }, ram: g.m.ram, on };
  g.onHook = (pc) => a.hook(pc, g.m.ram, (x) => p.on.includes(x));
  p.frame(NONE); // (the snap's frame)
  return p;
}
const y = (r: Uint8Array) => r[0x1e];
const xOf = (r: Uint8Array) => r[0x19] * 4 + r[0x1d];
/** (DEBUG=name: the traces of the first few that didn't go as they should) */
let shown = 0;
const show = (what: string, ev: Ev, off: Uint8Array[], on: Uint8Array[]) => {
  if (process.env.DEBUG !== what || shown++ >= 3) return;
  const line = (r: Uint8Array) => `y=${r[0x1e]} x=${r[0x19] * 4 + r[0x1d]} 53=${r[0x53]} 55=${r[0x55]} 56=${r[0x56]} 5b=${r[0x5b].toString(16)} 5c=${r[0x5c].toString(16)} 7a=${r[0x7a]} 76=${r[0x76]} 72=${r[0x72]} 83=${r[0x83]} 87=${r[0x87]} j=${r[7].toString(16)}/${r[8].toString(16)}/${r[0xb].toString(16)}`;
  console.log(`-- ${what} ${ev.start} ${ev.frame} ${ev.kind}`);
  for (let i = 0; i < Math.max(off.length, on.length); i++) console.log(`${i}  ${off[i] ? line(off[i]) : ''}   |   ${on[i] ? line(on[i]) : ''}`);
};
const ALL = PARTS;

/** The characters around Thing as the movement code reads them (column, page: $462E). */
function charAt(ram: Uint8Array, dc: number, dr: number) {
  const col = ((ram[0x1d] - 0x0c) >> 2) + ram[0x19] + (ram[0x1d] < 0x54 ? 1 : 0) + dc;
  const page = (((ram[0x1e] - ram[0x64]) & 0xff) >> 3) + 0xe0 + dr;
  return ram[((page & 0xff) << 8) | (col & 0xff)];
}
const SOLID = (c: number) => !(c === 0x20 || c < 3 || (c >= 0x0a && c < 0x12) || c === 0x2b || c === 0x32 || c === 0x33 || c === 0x2e || c === 0x31 || c === 0x6a || c === 0x6b);
/** Inside something solid: a wall or floor character in his middle (the column and row the checks never let him into). */
const inside = (ram: Uint8Array) => ram[0x0d] !== 2 && !ram[0x63] && SOLID(charAt(ram, 1, 1));

const starts = makeStarts();
const startOf = (id: string) => { const s = starts.get(id); if (!s) throw new Error(`no start ${id}`); return s.state; };
const roomStarts = [...starts.entries()].filter(([id]) => Number(id.split('.')[1].replace(/[LR]/, '')) % 2 === 0 && !id.endsWith('9L') && !id.endsWith('9R'));

// ---- air control -------------------------------------------------------------------------------------
{
  // in the first corridor: a bounce to the right, then left held in the air
  const s = startOf('0.5L');
  const trace = (on: readonly Part[]) => {
    const p = player(s, on);
    for (let f = 0; f < 40; f++) p.frame(J('right'));
    p.frame(J('fire+right'));
    const x0 = p.ram[0x19] * 4 + p.ram[0x1d];
    let xs = 0;
    for (let f = 0; f < 12 && (p.ram[0x55] || p.ram[0x53]); f++) { p.frame(J('left')); xs = p.ram[0x19] * 4 + p.ram[0x1d]; }
    return xs - x0;
  };
  const off = trace([]), on = trace(['air']);
  check(`air control: bouncing right, left held in the air: the original goes on right (${off > 0 ? '+' : ''}${off}), with the assist he turns back (${on})`, off > 0 && on < 0);
}

// ---- random play from every room: events, and the same input with the assists ---------------------
interface Ev { start: string; frame: number; kind: string }
let seed = 5;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
const script = (n: number) => { const out: number[] = []; let j = NONE; for (let f = 0; f < n; f++) { if (f % 12 === 0 || rnd() < 0.03) j = INPUTS[Math.floor(rnd() * INPUTS.length)].joy; out.push(j); } return out; };
const FRAMES = 900;
const scripts = new Map(roomStarts.map(([id]) => [id, script(FRAMES)]));
const scriptOf = (id: string) => { const s = scripts.get(id); if (!s) throw new Error(`no script ${id}`); return s; };
/** Play a script from a start, noting each frame's state. */
function play(id: string, on: readonly Part[], frames = FRAMES, each?: (ram: Uint8Array, f: number, prev: Uint8Array) => void) {
  const p = player(startOf(id), on), js = scriptOf(id);
  let prev = p.ram.slice();
  for (let f = 0; f < frames; f++) { p.frame(js[f]); each?.(p.ram, f, prev); prev = p.ram.slice(); }
  return p;
}

// walls throwing him back (the original): airborne, the way he goes reversed by a wall in a frame
const throws: Ev[] = [];
const edges: Ev[] = [];
const landings: Ev[] = [];
let maxFall = 0, insideOff = 0;
for (const [id] of roomStarts) {
  play(id, [], FRAMES, (r, f, q) => {
    // (a moment on the same screen: not a change of screen, a tube or a spring's ride)
    if (r[0x5e] !== q[0x5e] || r[0x5f] !== q[0x5f] || r[0x63] || q[0x63] || Math.abs(xOf(r) - xOf(q)) > 4 || Math.abs(r[0x1e] - q[0x1e]) > 9) return;
    const air = (r[0x55] || r[0x53]) && !r[0x7a] && !r[0x76] && !r[0x72] && !r[0x83] && !r[0x87];
    if (air && !r[0x63] && ((q[0x5c] & 0x80 && r[0x5b] & 0x80) || (q[0x5b] & 0x80 && r[0x5c] & 0x80)) && r[0x5e] === q[0x5e]) throws.push({ start: id, frame: f, kind: q[0x5c] & 0x80 ? 'right' : 'left' });
    if (r[0x53] && !r[0x55] && !q[0x53] && !q[0x55] && !q[0x7a] && !q[0x76] && !q[0x83] && !q[0x87] && r[0x5e] === q[0x5e]) edges.push({ start: id, frame: f, kind: 'edge' });
    if (!r[0x53] && !r[0x55] && q[0x53] && !r[0x7a] && !r[0x76] && !r[0x87] && !r[0x83] && !r[0x72] && r[0x5e] === q[0x5e]) landings.push({ start: id, frame: f, kind: 'land' });
    if (r[0x53] && r[0x1e] > q[0x1e] && r[0x5e] === q[0x5e] && Math.abs(xOf(r) - xOf(q)) <= 4 && !r[0x63] && !q[0x63]) maxFall = Math.max(maxFall, r[0x1e] - q[0x1e]);
    if (inside(r)) insideOff++;
  });
}
console.log(`the original, ${roomStarts.length} rooms x ${FRAMES} frames of random play: ${throws.length} throws back by a wall in the air, ${edges.length} walks off an edge, ${landings.length} landings; falls up to ${maxFall} pixels a frame; ${insideOff} frames inside a wall`);

/**
 * The original, playing the same script up to `before` frames before the event; from there, `then`
 * (frames of input) with these assists on (the original's play up to there is the same either way).
 * The trace from there.
 */
function variant(ev: Ev, on: readonly Part[], then: number[], before = 0) {
  const p = player(startOf(ev.start), []), js = scriptOf(ev.start);
  for (let f = 0; f < ev.frame - before; f++) p.frame(js[f]);
  p.on = on;
  const trace: Uint8Array[] = [];
  for (const j of then) { p.frame(j); trace.push(p.ram.slice()); }
  return trace;
}

// ---- air control: a wall stops him (no throw back) ------------------------------------------------------
{
  let stopped = 0, tried = 0, thrown = 0;
  for (const ev of throws) {
    // from the frame of the throw, the joystick held towards the wall (or let go)
    const wasRight = ev.kind === 'right';
    const toWall = J(wasRight ? 'right' : 'left');
    const then = Array<number>(10).fill(toWall);
    const off = variant(ev, [], then, 1), on = variant(ev, ['air'], then, 1);
    if (off.some((r) => !(r[0x55] || r[0x53]) || r[0x63])) continue; // (only while still in the air)
    tried++;
    // (from the frame after: the joystick the game reads is the last frame's)
    const away = (t: Uint8Array[]) => Math.max(...t.slice(2).map((r) => (wasRight ? xOf(t[1]) - xOf(r) : xOf(r) - xOf(t[1]))));
    if (away(off) > 2) thrown++;
    if (away(on) <= 1) stopped++; else show('air', ev, off, on);
  }
  check(`air control: a wall in the air: the original throws him back (${thrown} of ${tried}), with the assist he stops (${stopped} of ${tried})`, tried > 10 && stopped === tried && thrown >= tried * 0.8);
}

// ---- jump grace -------------------------------------------------------------------------------------------
{
  let ok = 0, tried = 0, origJumped = 0;
  for (const ev of edges) {
    const js = scriptOf(ev.start), walk = js[ev.frame];
    const dir = (walk & 8) === 0 ? 'right' : (walk & 4) === 0 ? 'left' : null; // (low bits: held)
    if (!dir) continue;
    // walking off as he did, then fire with the same way 2 frames into the fall
    const ask = [walk, walk, J(`fire+${dir}`), J(`fire+${dir}`), J(dir), J(dir), J(dir), J(dir), J(dir), J(dir)];
    const off = variant(ev, [], ask, 1), on = variant(ev, ['grace'], ask, 1);
    if (!off[1][0x53] || off[1][0x63]) continue;
    tried++;
    const rose = (t: Uint8Array[]) => t.some((r) => r[0x55]);
    if (rose(off)) origJumped++;
    if (rose(on) && !rose(off)) ok++; else show('coyote', ev, off, on);
  }
  check(`jump grace: a bounce asked for 2 frames after walking off an edge: the original falls, with the assist he bounces (${ok} of ${tried}; the original bounced ${origJumped})`, tried > 10 && ok === tried && origJumped === 0);
}
{
  let ok = 0, tried = 0, orig = 0;
  for (const ev of landings) {
    // fire with a direction for 2 frames, let go, 4 frames before landing (falling all the while)
    const ask = [J('fire+right'), J('fire+right'), NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE];
    const off = variant(ev, [], ask, 6), on = variant(ev, ['grace'], ask, 6);
    if (!off.slice(0, 5).every((r) => r[0x53] && !r[0x55] && !r[0x63]) || off[6][0x53]) continue;
    tried++;
    const bounced = (t: Uint8Array[]) => t.some((r) => r[0x55]);
    if (bounced(off)) orig++;
    if (bounced(on)) ok++; else show('buffer', ev, off, on);
  }
  check(`jump grace: a bounce asked for (and let go) 4 frames before landing: with the assist it goes on landing (${ok} of ${tried}; the original: ${orig})`, tried > 10 && ok === tried && orig === 0);
}

// ---- landing help -------------------------------------------------------------------------------------------
{
  let landed = 0, tried = 0;
  let caught = 0;
  for (const ev of throws) {
    const js = scriptOf(ev.start);
    const then = js.slice(ev.frame, ev.frame + 30);
    const off = variant(ev, [], then, 0), on = variant(ev, ['landing'], then, 0);
    if (off.length < 30) continue;
    // where the assist took him up onto a ledge: from the frame of the throw, he goes on (not back), and lands
    if (on[0][0x1e] >= off[0][0x1e]) continue;
    caught++;
    // landed (on his feet, or on a spring) within 15 frames, higher than where the wall stopped him
    const fOn = on.findIndex((r) => (!r[0x53] && !r[0x55]) || r[0x83]);
    if (fOn >= 0 && fOn <= 15 && y(on[fOn]) < y(off[0])) landed++; else show('landing', ev, off, on);
  }
  tried = caught;
  check(`landing help: bounces that caught a ledge's edge (the wall in his lowest row only): where the original threw him back, with the assist he landed on it (higher than where the wall stopped him) within 15 frames (${landed} of ${tried})`, tried > 3 && landed === tried);
}

// ---- gentler falls ---------------------------------------------------------------------------------------------
{
  let max = 0;
  for (const [id] of roomStarts.slice(0, 12)) play(id, ['fall'], FRAMES, (r, _f, q) => { if (r[0x53] && r[0x1e] > q[0x1e] && r[0x5e] === q[0x5e] && Math.abs(xOf(r) - xOf(q)) <= 4 && !r[0x63] && !q[0x63]) max = Math.max(max, r[0x1e] - q[0x1e]); });
  check(`gentler falls: up to ${max} pixels a frame (the original: ${maxFall})`, max <= 4 && maxFall === 8);
}

// ---- slow oil -------------------------------------------------------------------------------------------------
{
  // the same play from a room with creatures, oil not topped up: used with and without
  const used = (on: readonly Part[]) => {
    let total = 0;
    for (const [id] of roomStarts.slice(0, 16)) {
      const p = player(startOf(id), on, false), js = scriptOf(id);
      p.ram[0x8f] = 200; p.ram[0x90] = 0;
      for (let f = 0; f < FRAMES; f++) p.frame(js[f]);
      total += 200 - p.ram[0x8f];
    }
    return total;
  };
  const off = used([]), on = used(['drain']);
  check(`slow oil: the same play took ${off} units of oil in the original, ${on} with the assist`, off > 20 && Math.abs(on - off / 2) <= off * 0.1 + 2);
}

// ---- ENHANCED (and each part alone): long random play from every start ------------------------------------
// (3000 frames from each of the starts, the same joystick for each; inside: frames with a wall or
// floor in his middle, which the original's own play has too: a part mustn't add to them)
let originalInside = -1;
for (const on of [[], ...ALL.map((x) => [x]), ALL] satisfies (readonly Part[])[]) {
  if (process.env.ONLY_ALL && on.length && on.length !== ALL.length) continue;
  let inWall = 0, frames = 0, hangs = 0, fallbacks = 0, moves = 0;
  const screens = new Set<string>();
  const t0 = performance.now();
  seed = 99;
  for (const [id] of [...starts.entries()]) {
    const p = player(startOf(id), on);
    const js = script(3000);
    try {
      for (let f = 0; f < 3000; f++) {
        p.frame(js[f]); frames++;
        if (inside(p.ram)) inWall++;
        screens.add(`${p.ram[0x5f]}.${p.ram[0x5e]}`);
      }
    } catch { hangs++; }
    fallbacks += p.g.fallbacks.size;
    if (`${p.ram[0x5f]}.${p.ram[0x5e]}` !== id.slice(0, -1)) moves++;
  }
  const label = on.length === ALL.length ? 'ENHANCED' : on.length ? on[0] : 'the original';
  const line = `${label}: ${frames} frames of random play, ${inWall} frames inside a wall, ${hangs} hangs, ${fallbacks} 6502 fallbacks, ${screens.size} screens reached, ${moves} plays ended on another screen (${((performance.now() - t0) / 1000).toFixed(0)}s)`;
  if (!on.length) { originalInside = inWall; console.log(line); }
  else check(line, inWall <= originalInside * 1.02 && hangs === 0 && fallbacks === 0 && moves > 0);
}

console.log(failures ? `${failures} FAILED` : 'all passed');
process.exit(failures ? 1 : 0);
