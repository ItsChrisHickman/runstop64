/**
 * The 8-way controls assist (games/shared/native/controls.ts) for The Staff of Karnath and
 * Blackwyche, headless, as play.ts runs it (the stick each frame; the step at the main loop's
 * wait), from states along each game's recorded routes (re/routes.json):
 *
 * - the original: each diagonal goes as one of the four ways (the same as holding that way);
 * - with the assist, a diagonal moves both ways at once;
 * - walls: wherever a diagonal steps him into (or out of) the picture, straight up (or down),
 *   the game's own move, from that moment (just before the step) moves him that way too;
 * - fire with a direction turns him that way first;
 * - doors, stairs and corners: a diagonal towards one (what the floor check, faced that way,
 *   acts on: it takes him through, or starts something) goes where walking straight there goes,
 *   the game's own way (the extra step never runs the floor check on one, outside the main loop);
 * - no frame of the 6502 safety net.
 * (Entombed's: games/entombed/test/controls.ts, through the front end.)
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/controls.ts karnath|blackwyche|dragonskulle [states]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../host';
import { cpu } from '../cpu';
import { EightWay, type ControlsSpec, type Runner } from '../controls';
import { GAMES, setJoy } from './games';
import { karnathControls } from '../../../karnath/src/combat';
import { blackwycheControls } from '../../../blackwyche/src/combat';
import { dragonskulleControls } from '../../../dragonskulle/src/combat';
import { readRoutes } from '../../test/data';
import { check, finish } from '../../test/check';

interface Spec {
  controls: ControlsSpec;
  /** Where he is: x, depth (y), how far along (scrolling), the room. */
  where(ram: Uint8Array): { x: number; y: number; along: number; room: number };
  keep(ram: Uint8Array): void;
}
const SPECS: Record<string, Spec> = {
  karnath: {
    controls: karnathControls,
    where: (r) => ({ x: r[0x7ff4] | (r[0x7fed] << 8), y: r[0x3238], along: r[0x7fe6] | (r[0x7fe7] << 8), room: r[0x3235] | (r[0x3219] << 8) }),
    keep: (r) => { r[0x6ffe] = 100; r[0x322e] = 0; },
  },
  blackwyche: {
    controls: blackwycheControls,
    where: (r) => ({ x: r[0x341f] | (r[0x1543] << 8), y: r[0x3420], along: r[0x1531] | (r[0x1532] << 8) | (r[0x1f88] << 16), room: r[0x341c] | (r[0x1ecd] << 8) | (r[0x9d78] << 16) }),
    keep: (r) => { r[0x9d77] = 100; r[0x3417] = 0; },
  },
  dragonskulle: {
    controls: dragonskulleControls,
    // (the room: the row and the block; along a scrolling row, how far it's scrolled)
    where: (r) => ({ x: r[0x341d], y: r[0x341e], along: r[0x20a7] | (r[0x1277] << 8) | (r[0x127d] << 16), room: r[0x20a9] | (r[0x341c] << 8) }),
    keep: (r) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; },
  },
};

const [gameId, statesArg = '24'] = process.argv.slice(2);
const game = GAMES[gameId], S = SPECS[gameId], port = game.port;
if (!port) throw new Error(`${gameId}: no native port`);
const quiet = (what: string, ok: boolean) => check(what, ok, true);

const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const states: MachineState[] = [];
/** States where the floor check, faced up or down, would act on what's there (a door, stairs, a corner): one each per place and code. */
const doors: { state: MachineState; up: boolean; what: string }[] = [];
const doorsSeen = new Set<string>();
const routes = readRoutes(`games/${gameId}/re/routes.json`);
const total = routes.reduce((n, r) => n + r.filter((_, i) => i % 2).reduce((a, b) => a + b, 0), 0), every = Math.max(150, Math.floor(total / Number(statesArg)));
for (const route of routes) {
  const g = new NativeHost(port, title);
  let f = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); S.keep(g.m.ram); f++;
    if (f > 250 && f % every === 0) { const s = g.save(); if (s) states.push(s); }
    if (f > 250 && g.lastWait === port.mainLoopWait && S.controls.state(g.m.ram) === 'walk') for (const up of [true, false]) {
      if (S.controls.ahead(g.m.ram, up) !== 'acts') continue;
      const p = S.where(g.m.ram), what = `room ${p.room.toString(16)} ${up ? 'up' : 'down'} at ${p.x},${p.y} (code $${S.controls.tile(g.m.ram, up).toString(16)})`, key = `${p.room}/${up}/${p.x >> 4}`;
      if (doorsSeen.has(key)) continue;
      const s = g.save();
      if (s) { doorsSeen.add(key); doors.push({ state: s, up, what }); }
    }
  }
}

function harness(state: MachineState, on: boolean) {
  const g = NativeHost.resume(port, state);
  const ew = new EightWay(S.controls);
  let held = 0;
  const steps: MachineState[] = [];
  const runner: Runner = { call(fn) { const r = { ...cpu }; fn(); Object.assign(cpu, r); } };
  g.onWait = (site) => {
    if (site !== port.mainLoopWait || !on) return;
    // (steps on foot: in a jump straight up or down doesn't step, the jump goes on as it began)
    const pre = S.controls.state(g.m.ram) === 'walk' ? g.save() : null, y = S.where(g.m.ram).y;
    ew.beforeFrame(g.m.ram, held, runner);
    if (pre && S.where(g.m.ram).y !== y && steps.length < 300) steps.push(pre);
  };
  return {
    g, steps,
    run(bits: number, n: number) {
      for (let i = 0; i < n; i++) {
        held = bits;
        const to = on ? ew.input(g.m.ram, bits) : bits;
        setJoy(g.m, game, 0x1f & ~to); g.m.keys = [];
        g.tick(); S.keep(g.m.ram);
      }
    },
  };
}

const DIAGS: [number, number, number][] = [[1 | 8, 1, 8], [1 | 4, 1, 4], [2 | 8, 2, 8], [2 | 4, 2, 4]]; // up+right, up+left, down+right, down+left
const MAPPED = [1, 4, 8, 2]; // the original: up, left, right, down
let same = 0, sameOf = 0, both = 0, bothOf = 0, steps = 0, past = 0, fallbacks = 0, turned = 0, turnOf = 0;
states.forEach((st) => {
  DIAGS.forEach(([bits, v], i) => {
    // the original
    const a = harness(st, false); a.run(bits, 30);
    const b = harness(st, false); b.run(MAPPED[i], 30);
    const pa = S.where(a.g.m.ram), pb = S.where(b.g.m.ram);
    sameOf++; if (JSON.stringify(pa) === JSON.stringify(pb)) same++;
    // the assist
    const w = harness(st, true), w0 = S.where(w.g.m.ram);
    w.run(bits, 24);
    const w1 = S.where(w.g.m.ram);
    bothOf++;
    if (w1.room === w0.room && (w1.x !== w0.x || w1.along !== w0.along) && (v === 1 ? w1.y < w0.y : w1.y > w0.y)) both++;
    w.run(bits, 150);
    for (const pre of w.steps) {
      steps++;
      const p0 = S.where(pre.ram), o = harness(pre, false);
      // (straight there: the first frames, while he's in the same room: any step that way; Blackwyche's deck rocks him a little as it goes)
      const ys: number[] = [];
      let moved = false;
      for (let k = 0; k < 10; k++) {
        o.run(v, 1);
        const p1 = S.where(o.g.m.ram);
        ys.push(p1.y);
        if (p1.room !== p0.room || Math.abs(p1.y - p0.y) > 8 || (v === 1 ? p1.y < p0.y : p1.y > p0.y)) moved = true; // (or somewhere else: a door)
      }
      if (!moved) { past++; if (process.env.DEBUG) console.log(`   at ${JSON.stringify(p0)} the diagonal stepped ${v === 1 ? 'up' : 'down'}; straight: ${ys.join(',')}`); }
    }
    if (w.g.fallbacks.size) fallbacks++;
  });
  // fire with left while facing right: turned first
  const f = S.controls.facing, t = harness(st, true);
  t.run(8, 6);
  for (let k = 0; k < 100 && S.controls.state(t.g.m.ram) !== 'walk'; k++) t.run(8, 1); // (not in the middle of a jump or a stroke)
  if (t.g.m.ram[f.addr] === f.right && S.controls.state(t.g.m.ram) === 'walk') { turnOf++; t.run(4 | 16, 3); if (t.g.m.ram[f.addr] === f.left) turned++; }
});
quiet(`the original: each diagonal goes as one of the four ways (${same} of ${sameOf})`, same === sameOf);
quiet(`8-way: diagonals move both ways at once (${both} of ${bothOf}, the rest against a wall or out of the room)`, both >= bothOf / 2);
quiet(`8-way: each of ${steps} steps into or out of the picture is one straight up or down takes too (${past} not)`, steps > 50 && past === 0);
quiet(`fire+left facing right turns him left (${turned} of ${turnOf})`, turnOf > 0 && turned >= turnOf * 0.8);
// doors, stairs, corners: a diagonal towards one does what straight that way does
let doorsSame = 0, through = 0;
const crashes: string[] = [];
for (const d of doors) for (const h of [4, 8]) {
  const v = d.up ? 1 : 2, rooms = (o: ReturnType<typeof harness>, bits: number) => {
    const seen = [S.where(o.g.m.ram).room];
    for (let k = 0; k < 40 && seen.length < 2; k++) { o.run(bits, 1); const r = S.where(o.g.m.ram).room; if (seen[seen.length - 1] !== r) seen.push(r); }
    return seen.join('>'); // (where he starts, and the first place he goes to: once through, a diagonal goes on, so later places differ)
  };
  const straight = rooms(harness(d.state, false), v);
  let diagonal = '';
  const w = harness(d.state, true);
  try { diagonal = rooms(w, v | h); } catch (e) { crashes.push(`${d.what}: ${e instanceof Error ? e.message : String(e)}`); continue; }
  if (w.g.fallbacks.size) crashes.push(`${d.what}: fallbacks ${[...w.g.fallbacks.keys()].map((a) => a.toString(16))}`);
  if (diagonal === straight) doorsSame++;
  else if (process.env.DEBUG) console.log(`   ${d.what} ${h === 4 ? 'left' : 'right'}: straight ${straight}, diagonal ${diagonal}`);
  if (straight.includes('>')) through++;
  if (process.env.VERBOSE) console.log(`   ${d.what} ${h === 4 ? 'left' : 'right'}: straight ${straight}`);
}
for (const c of crashes.slice(0, 5)) console.log(`   ${c}`);
quiet(`doors, stairs, corners: a diagonal towards each of ${doors.length} goes where straight that way goes (${doorsSame} of ${doors.length * 2}; ${through} through to another place), no crash (${crashes.length})`, doors.length > 0 && through > 0 && crashes.length === 0 && doorsSame === doors.length * 2);
quiet(`no 6502 fallbacks (${fallbacks} walks with them)`, fallbacks === 0);
console.log(`${gameId}: ${states.length} states`);
finish();
