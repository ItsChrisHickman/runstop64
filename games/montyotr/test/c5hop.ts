/**
 * The C5's hop on the street ("DRIVE SIR CLIVE(S C5": rooms $24, $25, $31, $32, $33), headless
 * on the game itself (no front end), ORIGINAL and ENHANCED (fire held past the top of a hop
 * holds it there: mechanisms.ts C5_HOLD).
 *
 * The street is driven three times: out (stage 0, left along the top road, from the tree in
 * $24 to the drop in $33), the return (stage 1, right along the middle road, to the drop in
 * $24) and out again (stage 2, left along the bottom road, out through $33). Each pass is
 * driven at each speed (accelerating to it from the start as a player does, then held), with
 * no hops and the crash check off: that finds the holes (each a run of frames with a hole
 * under the wheels) on the frames the drive reaches them. A hop doesn't change how the C5
 * moves along (once at speed), only its height, and how a hop goes doesn't depend on where it
 * is: so each press (its frame's parity, and how long fire is held) is measured once (the
 * frames it's in the air, the frame it can hop again), and the drives with hops are worked
 * out from that:
 *
 *  - a hole's window alone ("alone"): the frames a press clears it (in the air all through it);
 *  - its window on a route ("route"): the frames a press clears it on some way through the
 *    whole pass (every other hole cleared too: the hop before it landed in time, the next
 *    one can still go). The street's holes come in sets about a hop apart, so this is what
 *    the player has: the return's sets ($33's big hole then a pair, $32's two pairs) leave
 *    the original only 2 frames at top speed.
 *
 * Checked: ORIGINAL's windows are as measured (the table below); in ENHANCED a tap is the
 * original's hop and fire held gives 2 * C5_HOLD frames more in the air; ENHANCED's windows
 * are never smaller, with a way through wherever ORIGINAL has one, and on the return at top
 * speed at least double; a route found for each pass is driven for real (crash check on) and
 * gets through. And the enemy rooms ($24, $25): at full speed with no hop he's through every
 * pass in both modes, and a hop held as long as it goes is hit by an enemy only where a tap is
 * too, but for a hop in the first frames from the tree (where none is needed).
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/c5hop.ts
 */
import { PixelRenderer, VicView } from 'c64kit';
import { Game } from '../src/game';
import { C5_HOLD, c5Arrive } from '../src/mechanisms';
import { check, finish } from '../../shared/test/check';

/** Each pass from where it starts: the tree; the foot of each drop (the C5 still going the old way at full speed). */
const PASSES = [
  { stage: 0, name: 'out', room: 0x24, x2: 0x8f, y: 0x7a, speed: 0, dir: 0x01, right: false },
  { stage: 1, name: 'the return', room: 0x33, x2: 0x14, y: 0xa2, speed: 4, dir: 0x01, right: true },
  { stage: 2, name: 'out again', room: 0x24, x2: 0x94, y: 0xca, speed: 4, dir: 0x81, right: false },
] as const;
type Pass = typeof PASSES[number];
const SPEEDS = [1, 2, 3, 4];
const hex = (n: number) => n.toString(16);


/** A hole under the wheels, as the C5's crash check sees it. */
const overHole = (g: Game) => { const b = g.montyChr; return g.chr(b + 0x50) === 2 || g.chr(b + 0x54) === 2; };

/** A new game, the C5 at a pass's start (the game's own way into a room: an exit pointed at it). */
function street(p: Pass | { stage: number; room: number; x2: number; y: number; speed: number; dir: number }, enhanced: boolean, cheat: boolean) {
  const g = new Game();
  g.assist = { cloud: false, jetpack: false, c5: enhanced, rooms: false, respawn: false };
  g.start();
  g.cheatMode = cheat ? 0x80 : 0;
  const col = [...Array(23).keys()].find((c) => g.roomAt(2, c) === p.room);
  if (col === undefined) throw new Error(`room ${hex(p.room)} isn't on the grid`);
  g.mapRow = 2; g.exitCol = col; g.x2 = p.x2; g.y = p.y;
  c5Arrive(g, { fallStage: p.stage, speed: p.speed, dir: p.dir, bounce: 0 });
  g.roomExit = 1;
  return g;
}

interface Frame { hole: boolean; air: boolean; free: boolean; atSpeed: boolean; room: number; x2: number }
/**
 * A pass at speed s (the direction held until it's reached), fire held k frames from each press.
 * The crash check off (cheat): every frame noted; on: stops at a crash (`crashed`).
 */
function drive(p: Pass, s: number, enhanced: boolean, presses: Map<number, number>, cheat: boolean, frames = 3000) {
  const g = street(p, enhanced, cheat);
  g.frame(0); // (the room comes in)
  g.frameToggle = 0; g.stepGate = 0;
  const fr: Frame[] = [];
  let held = 0, crashed = -1;
  for (let f = 0; f < frames; f++) {
    if (g.c5.fall || g.c5.fallStage !== p.stage || !g.c5.active) break;
    const atSpeed = g.c5.speed === s && ((g.c5.dir & 0x80) !== 0) === p.right;
    // (a press can start a hop this frame: none under way, or the last one ends this frame)
    const free = g.c5.bounce === 0 || (g.c5.bounce === 9 && g.frameToggle === 0);
    fr.push({ hole: !g.freeze && overHole(g), air: g.y < p.y, free, atSpeed, room: g.roomId, x2: g.x2 });
    held = presses.get(f) ?? held;
    const fire = held > 0;
    if (held > 0) held--;
    g.input = { left: !p.right && !atSpeed, right: p.right && !atSpeed, up: false, down: false, fire };
    g.inputFire = fire;
    g.frame(0);
    if (g.actionCounter === 7) { crashed = f; break; }
  }
  return { fr, crashed, through: crashed < 0 && (g.c5.fall !== 0 || g.c5.fallStage !== p.stage || !g.c5.active) };
}

/** A press: fire held k frames; the frames after it that it's in the air, and when it can hop again. */
interface Hop { k: number; air: number[]; next: number }
/** Each way a press can go, by its frame's parity: measured on the first road ($24, no holes there), at speed. */
function hops(enhanced: boolean): Hop[][] {
  return [40, 41].map((t) => {
    const list: Hop[] = [];
    for (let k = 1; k <= 60; k++) {
      const d = drive(PASSES[0], 4, enhanced, new Map([[t, k]]), true, t + 80);
      const air: number[] = [];
      let next = -1;
      for (let f = t + 1; f < d.fr.length; f++) {
        if (d.fr[f].air) air.push(f - t);
        if (d.fr[f].free) { next = f - t; break; }
      }
      if (next < 0 || k > next) break; // (fire still held as it lands: it hops again, another press)
      if (!list.some((h) => h.next === next && h.air.join() === air.join())) list.push({ k, air, next });
    }
    return list;
  });
}

interface Hole { room: number; from: number; to: number; a: number; b: number }
interface Windows { hole: Hole; alone: number[]; route: number[] }
/** The holes of a pass at a speed, each one's windows, and a way through (presses) if there is one. */
function analyse(p: Pass, s: number, enhanced: boolean, kinds: Hop[][]) {
  const base = drive(p, s, enhanced, new Map(), true).fr;
  const N = base.length;
  const H = base.map((x) => x.hole);
  const holes: Hole[] = [];
  base.forEach((x, f) => {
    if (!x.hole) return;
    const last = holes[holes.length - 1];
    if (last && last.b === f - 1) { last.b = f; last.to = x.x2; } else holes.push({ room: x.room, from: x.x2, to: x.x2, a: f, b: f });
  });
  /** The presses that can go at frame t (at speed, and not over a hole: that's a crash). */
  const at = (t: number) => (t < N && base[t].atSpeed && base[t].free && !H[t] ? kinds[t & 1] : []);
  /** A press at t clears every hole frame till it can hop again. */
  const clears = (t: number, h: Hop) => {
    for (let f = t + 1; f < Math.min(t + h.next, N); f++) if (H[f] && !h.air.includes(f - t)) return false;
    return true;
  };
  // forward: on the road, free to hop, every hole before cleared; backward: a way on from there
  const F = new Array<boolean>(N + 200).fill(false);
  F[0] = true;
  for (let t = 0; t < N; t++) {
    if (!F[t]) continue;
    if (!H[t]) F[t + 1] = true;
    for (const h of at(t)) if (clears(t, h)) F[t + h.next] = true;
  }
  const B = new Array<boolean>(N + 200).fill(true);
  for (let t = N - 1; t >= 0; t--) B[t] = (!H[t] && B[t + 1]) || at(t).some((h) => clears(t, h) && B[t + h.next]);
  const windows: Windows[] = holes.map((hole) => {
    const over = (t: number, h: Hop) => { for (let f = hole.a; f <= hole.b; f++) if (!h.air.includes(f - t)) return false; return true; };
    const alone: number[] = [], route: number[] = [];
    for (let t = Math.max(0, hole.a - 100); t < hole.a; t++) {
      if (base[t].atSpeed && kinds[t & 1].some((h) => over(t, h))) alone.push(t - hole.a); // (other holes left out)
      if (F[t] && at(t).some((h) => over(t, h) && clears(t, h) && B[t + h.next])) route.push(t - hole.a);
    }
    return { hole, alone, route };
  });
  // a way through: on along the road while that still leads through, else the first press that does
  let presses: Map<number, number> | null = null;
  if (B[0]) {
    presses = new Map();
    for (let t = 0; t < N;) {
      if (!H[t] && B[t + 1]) { t++; continue; }
      const h = at(t).find((x) => clears(t, x) && B[t + x.next]);
      if (!h) { presses = null; break; }
      presses.set(t, h.k);
      t += h.next;
    }
  }
  return { windows, presses };
}

// ---- the hop, by press -----------------------------------------------------------------------
const kindsO = hops(false), kindsE = hops(true);
const airLong = (k: Hop[][]) => Math.max(...k.flat().map((h) => h.air.length));
{
  console.log('-- the hop');
  const same = (a: Hop, b: Hop) => a.next === b.next && a.air.join() === b.air.join();
  check(`ORIGINAL: holding fire changes nothing (one hop each parity: ${airLong(kindsO)} frames in the air)`,
    kindsO.every((k) => k.length === 1));
  check('ENHANCED: a tap is the original\'s hop', kindsE.every((k, i) => same(k[0], kindsO[i][0]) && k[0].k === 1));
  check(`ENHANCED: fire held holds it at the top for up to 2 * C5_HOLD (${2 * C5_HOLD}) frames: ${airLong(kindsO)} -> ${airLong(kindsE)} frames in the air, every length between`,
    airLong(kindsE) === airLong(kindsO) + 2 * C5_HOLD && kindsE.every((k) => k.length === C5_HOLD + 1));
}

// ---- the windows -----------------------------------------------------------------------------
/**
 * ORIGINAL's windows, as measured: per pass, speed and hole (its room, the x2 it starts at),
 * frames alone and on a route.
 */
const ORIGINAL: Record<string, string> = {
  's0 1': '31@83 12/0, 31@73 12/0, 31@2b 12/0, 31@1b 12/0, 32@63 0/0',
  's0 2': '31@83 20/0, 31@73 20/0, 31@2b 20/0, 31@1b 20/0, 32@63 0/0',
  's0 3': '31@83 22/14, 31@72 22/14, 31@2a 22/14, 31@1b 22/14, 32@63 2/2',
  's0 4': '31@83 24/18, 31@73 24/18, 31@2b 24/14, 31@1b 22/14, 32@63 10/10',
  's1 1': '33@38 0/0, 33@68 10/0, 33@78 10/0, 32@20 10/0, 32@30 10/0, 32@64 10/0, 32@74 10/0, 31@34 0/0, 25@38 0/0, 25@68 10/0, 25@78 10/0',
  's1 2': '33@38 0/0, 33@68 20/0, 33@78 20/0, 32@20 20/0, 32@30 20/0, 32@64 20/0, 32@74 20/0, 31@34 0/0, 25@38 0/0, 25@68 20/0, 25@78 20/0',
  's1 3': '33@38 4/4, 33@68 20/6, 33@78 22/6, 32@20 22/12, 32@31 22/12, 32@64 20/12, 32@74 22/12, 31@34 2/2, 25@38 6/6, 25@68 22/8, 25@79 22/8',
  's1 4': '33@38 12/2, 33@68 24/2, 33@78 24/2, 32@20 22/2, 32@30 22/2, 32@64 22/6, 32@74 22/6, 31@34 10/10, 25@38 10/4, 25@68 22/4, 25@78 22/4',
  's2 1': '24@53 0/0, 31@8b 12/0, 31@7b 12/0, 31@53 12/0, 31@43 12/0, 32@7f 0/0',
  's2 2': '24@53 0/0, 31@8b 18/0, 31@7b 18/0, 31@53 18/0, 31@43 18/0, 32@7f 0/0',
  's2 3': '24@53 4/4, 31@8a 22/10, 31@7b 20/10, 31@53 22/12, 31@42 22/12, 32@7e 6/6',
  's2 4': '24@52 8/8, 31@8b 24/14, 31@7b 24/14, 31@53 24/14, 31@43 24/14, 32@7f 12/12',
};
const ok = (cond: boolean, msg: string) => { if (!cond) console.log(`     ${msg}`); return cond; };
const table: string[] = [];
const measured: Record<string, string> = {};
let allNoWorse = true, returnDouble = true, routesOk = true;
for (const p of PASSES) {
  for (const s of SPEEDS) {
    const o = analyse(p, s, false, kindsO), e = analyse(p, s, true, kindsE);
    measured[`s${p.stage} ${s}`] = o.windows.map((w) => `${hex(w.hole.room)}@${hex(w.hole.from)} ${w.alone.length}/${w.route.length}`).join(', ');
    const span = (v: number[]) => (v.length ? `${String(v.length).padStart(2)} (${v[0]}..${v[v.length - 1]})` : ' 0         ');
    o.windows.forEach((w, i) => {
      const we = e.windows[i];
      table.push(`  ${p.name.padEnd(10)} speed ${s}  room ${hex(w.hole.room)} x2 ${hex(w.hole.from)}-${hex(w.hole.to)} (${String(w.hole.b - w.hole.a + 1).padStart(2)} frames)   alone ${span(w.alone)} -> ${span(we.alone)}   route ${span(w.route)} -> ${span(we.route)}`);
      allNoWorse = ok(we.alone.length >= w.alone.length && we.route.length >= w.route.length, `smaller in ENHANCED: ${p.name} speed ${s} room ${hex(w.hole.room)} x2 ${hex(w.hole.from)}`) && allNoWorse;
      if (p.stage === 1 && s === 4) returnDouble = ok(we.route.length >= 2 * w.route.length, `not double on the return: room ${hex(w.hole.room)} x2 ${hex(w.hole.from)}`) && returnDouble;
    });
    allNoWorse = ok(!o.presses || !!e.presses, `no way through in ENHANCED: ${p.name} speed ${s}`) && allNoWorse;
    // the ways through found, driven for real (the crash check on)
    for (const [mode, r, en] of [['ORIGINAL', o, false], ['ENHANCED', e, true]] as const) {
      if (!r.presses) continue;
      const d = drive(p, s, en, r.presses, false);
      routesOk = ok(d.through, `${mode} ${p.name} speed ${s}: the route (${[...r.presses].map(([t, k]) => (k > 1 ? `${t}+${k}` : t)).join(' ')}) crashed at frame ${d.crashed}`) && routesOk;
    }
  }
}
console.log('-- windows: the frames (before the hole) a press clears it, ORIGINAL -> ENHANCED');
console.log(table.join('\n'));
const differ = Object.keys(measured).filter((k) => ORIGINAL[k] !== measured[k]);
if (differ.length) console.log(differ.map((k) => `  '${k}': '${measured[k]}',`).join('\n'));
check(`ORIGINAL's windows as measured (${Object.keys(measured).length - differ.length}/${Object.keys(measured).length} passes and speeds)`, differ.length === 0);
check('ENHANCED: no window smaller, a way through wherever ORIGINAL has one', allNoWorse);
check('ENHANCED: on the return at top speed every hole\'s window on a route at least double', returnDouble);
check('the ways through found (both modes, every pass and speed that has one) get through, driven for real', routesOk);

// ---- the enemy rooms -------------------------------------------------------------------------
/** Rooms $24 and $25 on each pass, at full speed from where he comes in (sprite collisions on, the holes left out). */
const ROOMS = [
  { name: '24 out (from the tree)', stage: 0, room: 0x24, x2: 0x8f, y: 0x7a, speed: 0, dir: 0x01, right: false },
  { name: '25 out', stage: 0, room: 0x25, x2: 0x93, y: 0x7a, speed: 4, dir: 0x01, right: false },
  { name: '25 the return', stage: 1, room: 0x25, x2: 0x16, y: 0xa2, speed: 4, dir: 0x81, right: true },
  { name: '24 the return', stage: 1, room: 0x24, x2: 0x16, y: 0xa2, speed: 4, dir: 0x81, right: true },
  { name: '24 out again (from the drop)', stage: 2, room: 0x24, x2: 0x94, y: 0xca, speed: 4, dir: 0x81, right: false },
  { name: '25 out again', stage: 2, room: 0x25, x2: 0x93, y: 0xca, speed: 4, dir: 0x01, right: false },
] as const;
type Room = typeof ROOMS[number];
/** Through the room ('.'), or hit by an enemy ('E'), with a press at frame t (fire held k frames). */
function enemies(r: Room, toggle: number, enhanced: boolean, t: number, k: number) {
  const g = street(r, enhanced, true);
  const view = new VicView(new PixelRenderer(), g.vic);
  g.frame(0);
  view.update();
  g.frameToggle = toggle; g.stepGate = 0;
  let col = view.collisions(g.uncounted), held = 0;
  for (let f = 0; f < 400; f++) {
    if (g.roomId !== r.room || g.c5.fall || !g.c5.active) return { hit: false, frames: f };
    held = f === t ? k : held;
    const fire = held > 0;
    if (held > 0) held--;
    g.input = { left: !r.right, right: r.right, up: false, down: false, fire };
    g.inputFire = fire;
    g.frame(col);
    view.update();
    col = view.collisions(g.uncounted);
    if (g.actionCounter === 7 && g.collisionStore & 0xf0) return { hit: true, frames: f };
  }
  return { hit: false, frames: 400 };
}
{
  console.log('-- the enemy rooms at full speed: a hop pressed at each frame, tapped (ORIGINAL) / held (ENHANCED), E an enemy');
  const HELD = 60; // (as long as it goes: let go as it lands)
  let clear = true, noNew = true;
  for (const r of ROOMS) {
    for (const toggle of [0, 1]) {
      const o = enemies(r, toggle, false, -1, 0), e = enemies(r, toggle, true, -1, 0);
      clear = ok(!o.hit && !e.hit, `${r.name}: hit with no hop`) && clear;
      let tap = '', held = '';
      for (let t = 0; t < o.frames; t++) {
        tap += enemies(r, toggle, false, t, 1).hit ? 'E' : '.';
        // (fire held as long as the hop goes, but let go before it lands: kindsE's longest)
        held += enemies(r, toggle, true, t, Math.min(HELD, Math.max(...kindsE[(t + toggle) & 1].map((h) => h.k)))).hit ? 'E' : '.';
      }
      const worse = [...held].map((c, i) => (c === 'E' && tap[i] !== 'E' ? i : -1)).filter((i) => i >= 0);
      console.log(`  ${r.name.padEnd(28)} parity ${toggle}: no hop through (${o.frames} frames)\n     tapped ${tap}\n     held   ${held}${worse.length ? `   (held, not tapped: ${worse.join(',')})` : ''}`);
      noNew = ok(worse.every((t) => r.stage === 0 && r.room === 0x24 && t < 10), `${r.name}: an enemy hits a held hop where a tap gets by, at ${worse.join(',')}`) && noNew;
    }
  }
  check('full speed with no hop: no enemy hits him in rooms 24 and 25 on any pass, either mode', clear);
  check('a held hop is hit by an enemy only where a tapped one is, but for a hop in the first frames from the tree (none needed there)', noNew);
}

finish();
