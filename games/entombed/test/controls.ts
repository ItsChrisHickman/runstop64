/**
 * Entombed's 8-way controls assist (src/combat.ts entombedControls, games/shared/native/controls.ts),
 * headless through the front end (games/shared/native/play.ts, as the browser runs it), in the
 * corridors of every floor and in chambers:
 *
 * - the original: a diagonal is one of the four ways (up+right up, up+left left, down+right
 *   right, down+left down); with the assist: both ways at once, sideways at his walking pace
 *   and into or out of the picture at his own stepping pace (every other frame);
 * - walls: holding a diagonal for a long time never takes him past where straight up, down,
 *   left or right (the game's own moves) stop him (in depth: the y he reaches holding up or down);
 * - the corridors scroll as he goes (he walks on along them, from junction to junction);
 * - a jump with a diagonal held lands deeper or shallower than it took off, and further along;
 * - fire with a direction turns him that way first: the whip goes out on that side;
 * - he never takes a frame of the 6502 safety net.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/controls.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState, type MachineState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { entombedControls } from '../src/combat';
import { EightWay } from '../../shared/native/controls';
import { run } from '../src/main';
import { chamberState } from '../re/hints/chambers';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
stubFetch(titleBytes);

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

function gameStart(): MachineState {
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  return must(g.save(), 'a save');
}
const start = gameStart();
function corridor(floor: number, i: number): MachineState {
  const g = NativeHost.resume(port, start);
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
    const ps = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, { cells: { [floor]: all } });
    entombedMap.go(ps[i % ps.length].id, g.m.ram, {});
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 5; f++) g.tick();
  return must(g.save(), 'a save');
}

/** The front end, continued from a state, with the 8-way assist on or off. */
async function session(state: MachineState, eightWay: boolean) {
  store.clear();
  state.ram[0x322e] = 1; // (the whip)
  store.set('entombed.save.v1', Buffer.from(packState(state)).toString('base64'));
  store.set('entombed.assist', JSON.stringify({ enhanced: eightWay })); // (8-way comes with ENHANCED)
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); const r = must(p.machine, 'the machine').ram; r[0x37f6] = 0; r[0x323d] = 0; } };
  tick(141); // (launched with a save: straight back into play, no key)
  const hold = (keys: string[], n: number, each?: () => void) => { for (const k of keys) input.keyDown(k); for (let i = 0; i < n; i++) { tick(1); each?.(); } for (const k of keys) input.keyUp(k); tick(2); };
  return { p, tick, hold, ram: () => must(p.machine, 'the machine').ram, input };
}
/** Where he is: x as if the chamber hadn't scrolled ($3212/$3213), y his depth ($3220), and how far along the corridor ($217E/$217F, $1809/$180A). */
const where = (r: Uint8Array) => ({ x: r[0x3212] | (r[0x3213] << 8), y: r[0x3220], along: (r[0x217e] << 24) + (r[0x217f] << 16) + (r[0x180a] << 8) + r[0x1809], facing: r[0x2365] });

/** The game with the 8-way assist as play.ts runs it (the stick each frame, the step at the main loop's wait), without the front end. */
function harness(state: MachineState, on: boolean) {
  const g = NativeHost.resume(port, state);
  const ew = new EightWay(entombedControls);
  let held = 0;
  /** The states just before each step the assist made (when its step moved him in depth). */
  const steps: MachineState[] = [];
  g.onWait = (site) => {
    if (site !== port.mainLoopWait || !on) return;
    const pre = g.save(), y = g.m.ram[0x3220];
    ew.beforeFrame(g.m.ram, held, { call: (fn) => { const r = { ...cpu }; fn(); Object.assign(cpu, r); } });
    if (pre && g.m.ram[0x3220] !== y && g.m.ram[0x3227] === 0 && steps.length < 400) steps.push(pre);
  };
  return {
    g, steps,
    run(bits: number, n: number) {
      for (let i = 0; i < n; i++) {
        held = bits;
        const to = on ? ew.input(g.m.ram, bits) : bits;
        g.m.joy1 = g.m.joy2 = 0x1f & ~to;
        g.tick(); g.m.ram[0x37f6] = 0; g.m.ram[0x323d] = 0;
      }
    },
  };
}
let fallbacks = 0;

const places: { name: string; state: MachineState }[] = [];
for (let floor = 1; floor <= 7; floor++) places.push({ name: `floor ${floor} corridor`, state: corridor(floor, floor * 3) });
for (const n of [1, 4, 6, 10, 13, 19]) { try { places.push({ name: `chamber ${n}`, state: chamberState(n, {}, start) }); } catch { /* (no way in) */ } }

const DIAGS: [string, string[], 'up' | 'down', 'left' | 'right'][] = [['up+right', ['ArrowUp', 'ArrowRight'], 'up', 'right'], ['up+left', ['ArrowUp', 'ArrowLeft'], 'up', 'left'], ['down+right', ['ArrowDown', 'ArrowRight'], 'down', 'right'], ['down+left', ['ArrowDown', 'ArrowLeft'], 'down', 'left']];
for (const place of places) {
  // the original: each diagonal is one of the four ways (the same as holding that way)
  const same: string[] = [];
  for (const [name, keys, card] of [['up+right', ['ArrowUp', 'ArrowRight'], 'ArrowUp'], ['up+left', ['ArrowUp', 'ArrowLeft'], 'ArrowLeft'], ['down+right', ['ArrowDown', 'ArrowRight'], 'ArrowRight'], ['down+left', ['ArrowDown', 'ArrowLeft'], 'ArrowDown']] as const) {
    const a = await session(place.state, false); a.hold([...keys], 30);
    const b = await session(place.state, false); b.hold([card], 30);
    const pa = where(a.ram()), pb = where(b.ram());
    if (pa.x === pb.x && pa.y === pb.y && pa.along === pb.along) same.push(name);
  }
  check(`${place.name}, original: each diagonal goes as one of the four ways (${same.join(', ')})`, same.length === 4);
  // the assist: both ways at once
  let both = 0;
  for (const [, keys, v] of DIAGS) {
    const s = await session(place.state, true);
    s.hold(['ArrowDown'], 30); s.hold(['ArrowUp'], 14); // (into the middle of the floor's depth, where he can)
    const b = where(s.ram());
    s.hold(keys, 24);
    const a = where(s.ram());
    if ((a.x !== b.x || a.along !== b.along) && (v === 'up' ? a.y < b.y : a.y > b.y)) both++;
  }
  check(`${place.name}, 8-way: ${both} of 4 diagonals move both ways at once`, both >= 2);
  // walls: along long diagonal walks, wherever a diagonal steps him into (or out of) the picture,
  // straight up (or down), the game's own move, from the same moment (just before the step)
  // moves him that way too
  let steps = 0, past = 0;
  for (const [, , v, h] of [...DIAGS, ...DIAGS]) {
    const bits = (v === 'up' ? 1 : 2) | (h === 'left' ? 4 : 8);
    const w = harness(place.state, true);
    w.run(bits, 160);
    for (const pre of w.steps) {
      steps++;
      const a = where(pre.ram), o = harness(pre, false);
      o.run(bits & 3, 8);
      const oo = where(o.g.m.ram);
      if (!(v === 'up' ? oo.y < a.y : oo.y > a.y) && oo.along === a.along && o.g.m.ram[0x321c] === pre.ram[0x321c]) {
        past++;
        if (process.env.DEBUG) console.log(`   ${place.name} ${v}+${h}: at ${a.x},${a.y} (face ${a.facing}): straight to ${oo.x},${oo.y} face ${oo.facing}`);
      }
    }
    if (w.g.fallbacks.size) fallbacks++;
  }
  check(`${place.name}, 8-way: each of ${steps} steps into or out of the picture is one straight up or down takes too (${past} not)`, steps > 0 && past === 0);
}
// corners and the ways into chambers and up and down (what the floor check, faced up or down, acts
// on): walking along each floor's corridors at each depth, wherever there's one that way, a diagonal
// goes where straight that way goes first (the game's own way round or through), with no fallbacks
{
  const placeOf = (r: Uint8Array) => [r[0x37f7], r[0x321c], r[0x217e], r[0x217f], r[0x2181], r[0x3231], r[0x6001], r[0x6002]].join();
  const at: { state: MachineState; up: boolean }[] = [];
  const seen = new Set<string>();
  for (const place of places.slice(0, 7)) for (let up = 0; up <= 48; up += 4) for (const dir of [8, 4]) {
    const w = harness(place.state, false);
    w.run(2, 40); w.run(1, up); // (along the front, and each depth back from it)
    for (let f = 0; f < 300; f++) {
      w.run(dir, 1);
      const r = w.g.m.ram;
      if (w.g.lastWait !== port.mainLoopWait || entombedControls.state(r) !== 'walk') continue;
      for (const up of [true, false]) {
        const key = `${placeOf(r)}/${up}/${r[0x180a]},${r[0x1809] >> 4}`;
        if (entombedControls.ahead(r, up) !== 'acts' || seen.has(key)) continue;
        const s = w.g.save();
        if (s) { seen.add(key); at.push({ state: s, up }); }
      }
    }
  }
  const visits = (state: MachineState, on: boolean, bits: number) => {
    const w = harness(state, on), out: string[] = [];
    out.push(placeOf(w.g.m.ram));
    for (let k = 0; k < 60 && out.length < 2; k++) { w.run(bits, 1); const p = placeOf(w.g.m.ram); if (out[out.length - 1] !== p) out.push(p); }
    if (w.g.fallbacks.size) fallbacks++;
    return out.join(' > ');
  };
  let same = 0, through = 0;
  for (const { state, up } of at) for (const h of [4, 8]) {
    const v = up ? 1 : 2, straight = visits(state, false, v), diagonal = visits(state, true, v | h);
    if (straight === diagonal) same++;
    else if (process.env.DEBUG) console.log(`   ${up ? 'up' : 'down'}+${h === 4 ? 'left' : 'right'}: straight ${straight}; diagonal ${diagonal}`);
    if (straight.includes('>')) through++;
  }
  check(`corners, chambers, stairs: a diagonal towards each of ${at.length} goes where straight goes (${same} of ${at.length * 2}; ${through} round or through to another place)`, at.length > 0 && through > 0 && same === at.length * 2);
}
// the corridors scroll along as he goes diagonally
{
  const s = await session(places[0].state, true);
  const b = where(s.ram());
  s.hold(['ArrowUp', 'ArrowRight'], 400);
  s.hold(['ArrowDown', 'ArrowRight'], 400);
  const a = where(s.ram());
  check(`floor 1: walking on diagonally along the corridor (${b.along.toString(16)} -> ${a.along.toString(16)})`, a.along !== b.along);
  check(`no 6502 fallbacks on the walks (${fallbacks})`, fallbacks === 0);
}
// a diagonal jump, and turning to strike
{
  const s = await session(places[2].state, true);
  s.ram()[0x3215] = 1; // jump
  s.hold(['ArrowDown'], 40); s.hold(['ArrowUp'], 20); // (somewhere in the middle of the floor's depth)
  const b = where(s.ram());
  s.hold(['ArrowUp', 'ArrowRight', 'KeyZ'], 4);
  s.hold(['ArrowUp', 'ArrowRight'], 150);
  const a = where(s.ram());
  check(`a jump up+right lands deeper and along (y ${b.y} -> ${a.y}, x ${b.x} -> ${a.x}, along ${b.along.toString(16)} -> ${a.along.toString(16)})`, a.y < b.y && (a.x !== b.x || a.along !== b.along));
}
// fire with a direction turns him first: the strike is the game's own strike that way (the
// whip's frames, from his sprite, as when he has walked that way and strikes)
{
  const strike = async (eightWay: boolean, before: string[]) => {
    const s = await session(places[2].state, eightWay);
    s.ram()[0x3215] = 2;
    s.hold(['ArrowLeft'], 60); s.hold(before, 5);
    const facing = s.ram()[0x2365];
    const seq: number[] = [];
    s.hold(['ArrowLeft', 'KeyX'], 16, () => {
      const cap = must(s.p.machine, 'the machine').capture.sprites, w = cap.find((x) => x.n === 3), man = cap.find((x) => x.n === 2);
      if (w && man && s.ram()[0x20cf] === 1) seq.push(((w.x - man.x + 128) & 255) - 128); // (low bytes: the original's whip keeps a stale x high bit after the right edge)
    });
    return { facing, after: s.ram()[0x2365], seq: seq.join(',') };
  };
  const turned = await strike(true, ['ArrowRight']), walked = await strike(false, ['ArrowLeft']);
  check(`fire+left facing right: he turns and strikes left (facing ${turned.facing} -> ${turned.after}; whip ${turned.seq})`, turned.facing === 1 && turned.after === 2 && turned.seq.length > 0);
  // (its first frame shows the whip where it was left last time; then frame for frame the same, a frame later: the turn)
  const t = turned.seq.split(',').slice(1), w = walked.seq.split(',').slice(1, t.length + 1);
  check(`  the same strike as after walking left (whip ${walked.seq})`, t.length >= 10 && t.join() === w.join());
}
console.log(failures ? `${failures} failures` : 'all passed');
if (failures) process.exit(1);
