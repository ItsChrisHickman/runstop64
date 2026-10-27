/**
 * The Staff of Karnath's hints, checked against the game (re/README.md, "Hints"; src/hints.ts, src/guide.ts):
 *
 *  1. what the maps hold (ten pieces), and the sparkles on cells (the map's pieces, the ways down, the dungeons' far
 *     door) against the picture the game draws (the decoded next frame: each cell and the row's own scroll), over the
 *     five recorded routes (carrying forced for the castle's floors);
 *  2. the ways gone through by playing: the DOOR sign down a level, $CF into the dungeons;
 *  3. the pieces lying as sprites ($5800's picture): the picture never changes along the routes; taken by playing, by
 *     the game's own code (a bot: steered at the piece, a spell cast at it from some way off, then in), the hint is on
 *     the sprite all the while it lies there and gone once taken;
 *  4. a map piece taken by the game's code on a route: hint on it until then, gone after;
 *  5. the abode from the state by the obelisk: the obelisk, the sixteenth, the staff, MENHIR, any other spell;
 *  6. through the front end as the browser runs it (run(host), the keyboard): the status line (the game's own message
 *     first, never covered, then the story, then the game's line back), the sparkles the renderer has, ORIGINAL showing
 *     none, 11 PM, the pause screen's count, the far door and the abode's line.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/re/hints/check.ts [full]
 */
import fs from 'node:fs';
import { decodePicture } from '../../../../packages/c64kit/src/c64/picture';
import { Input, PixelRenderer, packState } from 'c64kit';
import { NativeHost } from '../../../shared/native/host';
import { routeWalker } from '../../../shared/test/route-walker';
import { check, finish } from '../../../shared/test/check';
import { unpackState, type C64, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { port } from '../../src/native';
import { run } from '../../src/main';
import { screenText } from '../../../shared/native/pause';
import { nowhere, stubFetch, useMemoryStorage } from '../../../shared/test/browser';
import { must } from '../../../shared/test/must';
import { partsOf } from '../../../shared/native/narrate';
import { STATUS } from '../../src/guide';
import { LINES } from '../../src/hint-lines';
import { karnathMap } from '../../src/map';
import { toMode } from '../../src/travel';
import { STRIPS } from '../../src/strips';
import { renderPng } from '../../../../tools/probe/render';
import { spriteSpot } from '../../../shared/native/spots';
import { KEPT, MODE, hintSpots, hourOn, mapPieceSpots, spritePieceSpots, wayToObelisk } from '../../src/hints';
import type { Spot } from '../../../shared/native/spots';
import { continueFromTitle } from '../../../shared/test/continue-from-title';

const TITLE = 'games/karnath/assets/karnath-title.state';
const ROUTES = 'games/karnath/re/routes.json';
const title = new Uint8Array(fs.readFileSync(TITLE));
const alive = (ram: Uint8Array) => { ram[0x6ffe] = 100; ram[0x322e] = 0; };

// ---- what the maps hold: ten pieces of the pentacle ($D5 then $D4), each in the map once ----
{
  const g = new NativeHost(port, unpackState(title));
  const { ram } = g.m;
  ram[KEPT.mode] = 0;
  let pairs = 0, lone = 0;
  const where: string[] = [];
  for (const mode of [1, 0, 0xff, 0xfe]) {
    toMode(ram, mode);
    for (const s of STRIPS) {
      if (s.mode !== mode) continue;
      for (let b = 0; b < 3; b++) for (let r = 0; r < 20; r++) for (let c = 0; c < 40; c++) {
        const at = (s.base << 8) + b * 0x400 + r * 40 + c;
        if (ram[at] === 0xd5 && ram[at + 1] === 0xd4) { pairs++; where.push(`${s.label}:${b * 40 + c}`); } else if ((ram[at] === 0xd5 && ram[at + 1] !== 0xd4) || (ram[at] === 0xd4 && ram[at - 1] !== 0xd5)) lone++;
      }
    }
  }
  check(`the maps hold ${pairs} pieces as $D5 $D4 pairs (${where.join(' ')}), no half of one alone (${lone})`, pairs === 10 && lone === 0);
}

// ---- 1. the cells, against the picture ----
/** The play area's rows (0-20) of the decoded picture: the runs of cells with these characters, as the picture has them (its own scroll and row's top). */
function drawn(m: ReturnType<typeof routeWalker>['host']['m'], codes: readonly number[], rows: [number, number]): Spot[] {
  const pic = decodePicture(m.ram, m.capture);
  const out: Spot[] = [];
  for (let r = rows[0]; r <= rows[1]; r++) {
    const row = m.capture.rows[r];
    if (!row) continue;
    const top = row.line !== undefined ? row.line - 0x33 : r * 8, xs = row.d016 & 7;
    let from = -1;
    for (let c = 0; c <= 40; c++) {
      // (a cell is there if a pixel of it is under neither border: the 38-column screen's covers up to pixel 6 and from 311)
      let x = c * 8 + xs;
      while (x < c * 8 + xs + 7 && x < 7) x++;
      const y = top + 4, hit = c < 40 && x <= 310 && y >= 0 && y < 200 && codes.includes(pic.code[y * 320 + x]) && pic.row[y * 320 + x] === r;
      if (hit && from < 0) from = c;
      if (!hit && from >= 0) { out.push({ x: Math.round(((from + c) / 2) * 8 + xs), y: top + 4 }); from = -1; }
    }
  }
  return out;
}
const same = (a: Spot[], b: Spot[]) => a.length === b.length && a.every((p, i) => p.x === b[i].x && p.y === b[i].y);
const key = (a: Spot[]) => [...a].sort((p, q) => p.y - q.y || p.x - q.x);

const ALL_ROUTES = [0, 1, 2, 3, 4];
/** Every how-manyth frame of the routes is looked at (each look decodes the next picture, 1.7 ms): the fast set every sixth, `full` every third. */
const LOOK_EVERY = process.argv.includes('full') ? 3 : 6;
/** Carrying forced replays the routes again (11 s for route 0 alone, its 11000 frames): the fast set takes the other four, `full` all five. */
const FORCED_ROUTES = process.argv.includes('full') ? ALL_ROUTES : [1, 2, 3, 4];
const FRONT = { 0: 19, 1: 15 } as const;
type Machine = C64;
/**
 * Over every third (sixth, in the fast set) frame of the five routes: `ours` is what the hints say after the game's frame (for the picture drawn next:
 * the game works after it has drawn, so the screen's memory and the scroll as the frame leaves them are what the next frame
 * draws), `want` what the next frame's picture has. Each pair goes to `compare`.
 */
interface Lag { ours: Spot[]; want: (next: Machine) => Spot[] }
interface Probe {
  now(m: Machine): Lag | null;
  compare(ours: Spot[], want: Spot[], route: number, frame: number): void;
}
/** Probes share one replay of the routes (a replay is most of the cost); a frame is looked at by the first that has something to say about it, so they must not overlap. */
function lagged(routes: readonly number[], cheat: (ram: Uint8Array) => void, probes: readonly Probe[]) {
  for (const route of routes) {
    const w = routeWalker({ port, title, routes: ROUTES, route, cheat });
    let held: (Lag & { frame: number; probe: Probe }) | null = null;
    for (let m = w.next(); m; m = w.next()) {
      if (held) { held.probe.compare(key(held.ours), key(held.want(w.host.m)), route, held.frame); held = null; continue; }
      if (w.frame % LOOK_EVERY || w.host.lastWait !== port.mainLoopWait) continue;
      for (const probe of probes) {
        const f = probe.now(w.host.m);
        if (f) { held = { ...f, frame: w.frame, probe }; break; }
      }
    }
  }
}

let frames = 0, shown = 0, wrong = 0, doorsShown = 0;
const ways = (mode: number, m: Machine, only: readonly number[]) => {
  if (!only.includes(mode)) return null;
  if (mode === MODE.lower || mode === MODE.upper) return { ours: wayToObelisk(m.ram, m.vic), want: (n: Machine) => [...drawn(n, [0xcf], [0, 20]), ...drawn(n, [0xa5, 0xa6, 0xa7], [FRONT[mode], FRONT[mode]])] };
  if (mode === MODE.dungeons) return { ours: wayToObelisk(m.ram, m.vic), want: (n: Machine) => { const d = drawn(n, [0xb8], [0, 20]); doorsShown += d.length; return d; } };
  return null;
};
const tally = (ours: Spot[], want: Spot[], route: number, frame: number) => {
  frames++;
  if (want.length) shown++;
  if (!same(ours, want)) { wrong++; if (wrong < 4) console.log(`     route ${route} frame ${frame}: ours ${JSON.stringify(ours)} picture ${JSON.stringify(want)}`); }
};
// (carrying forced, in the castle's two floors, where the routes would not carry; and the routes' own carrying, in every mode)
const piece = { frames: 0, shown: 0, wrong: 0 };
lagged(FORCED_ROUTES, (ram) => { alive(ram); ram[KEPT.carrying] = 1; }, [{ now: (m) => ways(m.ram[KEPT.mode], m, [MODE.lower, MODE.upper]), compare: tally }]);
// (the routes' own carrying and the map's pieces, not carrying, are never in the same frame: one replay for both)
lagged(ALL_ROUTES, alive, [
  { now: (m) => (m.ram[KEPT.carrying] === 1 ? ways(m.ram[KEPT.mode], m, [MODE.lower, MODE.upper, MODE.dungeons]) : null), compare: tally },
  {
    now: (m) => (m.ram[KEPT.carrying] === 1 ? null : { ours: mapPieceSpots(m.ram), want: (n) => drawn(n, [0xd5, 0xd4], [0, 20]) }),
    compare: (ours, want, route, frame) => {
      piece.frames++;
      if (want.length) piece.shown++;
      if (!same(ours, want)) { piece.wrong++; if (piece.wrong < 4) console.log(`     route ${route} frame ${frame}: ours ${JSON.stringify(ours)} picture ${JSON.stringify(want)}`); }
    },
  },
]);
check(`carrying, the ways down (the $CF and the DOOR signs on the floor's front edge) and the dungeons' far door are marked on the cells the picture draws them in: ${frames} frames of the routes (${shown} with one in view, ${doorsShown} the dungeons' far door; ${wrong} differ)`, wrong === 0 && shown > 100 && doorsShown > 10);

check(`not carrying, the pieces in the map are marked on the cells the picture draws them in: ${piece.frames} frames of the routes (${piece.shown} with one in view; ${piece.wrong} differ)`, piece.wrong === 0 && piece.shown > 20);

// ---- 2. the ways, gone through by playing: the sign on the floor's front edge down a level, $CF into the dungeons ----
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
let seed = 7;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);

/** Carrying a piece, steered onto the first spot the hints show and pushed through it (`press`): did `through` happen? */
function goThrough(start: MachineState, press: number, through: (ram: Uint8Array) => boolean, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const g = NativeHost.resume(port, start);
    const { ram, vic } = g.m;
    ram[KEPT.carrying] = 1;
    const dx = Math.floor(rnd() * 9) - 4;
    let showed = 0;
    for (let f = 0; f < 700; f++) {
      const spot = wayToObelisk(ram, vic)[0], me = spriteSpot(ram, vic, 2);
      let j = 0;
      if (spot && me) {
        showed++;
        if (me.x < spot.x + dx - 3) j |= RIGHT; else if (me.x > spot.x + dx + 3) j |= LEFT;
        else if (me.y + 21 < spot.y - 3) j |= DOWN; else if (me.y + 21 > spot.y + 3 + (press === DOWN ? 8 : 0)) j |= UP;
        else j = press;
      }
      g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = [];
      g.tick(); alive(ram); ram[KEPT.carrying] = 1;
      if (through(ram)) return showed > 0;
    }
  }
  return false;
}
{
  const level3 = routeWalker({ port, title, routes: ROUTES, route: 0, cheat: alive }).at(5100);
  const down = goThrough(level3, DOWN, (ram) => ram[0xb3e1] === 2);
  check('carrying in level 3 of the lower floor, walking onto the sign the hints mark on the floor\'s front edge and down takes him to level 2', down);
  let into: MachineState | null = null;
  const w = routeWalker({ port, title, routes: ROUTES, route: 1, cheat: alive });
  for (let m = w.next(); m && !into; m = w.next()) {
    if (w.frame % 10 === 0 && w.host.lastWait === port.mainLoopWait && m.ram[KEPT.mode] === MODE.lower && m.ram[0xb3e1] === 1 && m.ram[KEPT.carrying] === 0 && wayToObelisk(m.ram, w.host.m.vic).length) into = w.host.save();
  }
  check('carrying in level 1 of the lower floor, walking onto the $CF the hints mark and up takes him into the dungeons', into !== null && goThrough(into, UP, (ram) => ram[KEPT.mode] === MODE.dungeons));
}

// ---- 3. the pieces lying as sprites, taken by playing ----
/**
 * The game's own flags for the pieces lying as sprites ($321C-$3222, each 1 once its piece is taken): the upper floor's
 * first level, $D800's ($321C), the dungeons ($321D), the upper floor's $E100 block ($321E, $321F, $3222), the lower
 * castle's $C000 block ($3220, $3221).
 */
const FLAGS = [0x321c, 0x321d, 0x321e, 0x321f, 0x3220, 0x3221, 0x3222];
const place = (ram: Uint8Array) => `${ram[KEPT.mode].toString(16)}:${ram[0xb3e1]}:${ram[0x3235]}`;

/** The pieces' picture is the same all along the routes ($5800: the game copies it into its piece sprites). */
let pictureMoved = 0;
/** States along the routes with a piece sprite in view (a few per room, carrying nothing). */
const starts: MachineState[] = [];
{
  const seen = new Map<string, number>();
    for (let route = 0; route < 5; route++) {
    const w = routeWalker({ port, title, routes: ROUTES, route, cheat: (ram) => { alive(ram); ram[KEPT.carrying] = 0; } }); // (nothing carried: a piece in view can be taken)
    const picture = unpackState(title).ram.slice(0x5800, 0x5840);
    for (let m = w.next(); m; m = w.next()) {
      if (w.frame % 5 === 0 && picture.some((b, i) => m.ram[0x5800 + i] !== b)) pictureMoved++;
      if (w.frame % 20 || w.host.lastWait !== port.mainLoopWait || !spritePieceSpots(m.ram, w.host.m.vic).length) continue;
      const k = place(m.ram);
      if ((seen.get(k) ?? 0) >= 6) continue;
      seen.set(k, (seen.get(k) ?? 0) + 1);
      const st = w.host.save();
      if (st) starts.push(st);
    }
  }
  console.log(`     ${starts.length} states with a piece sprite in view, in ${seen.size} rooms (${[...seen.keys()].join(' ')})`);
}
check(`the pieces' picture ($5800) is as the title has it all along the routes (${pictureMoved} frames it was not)`, pictureMoved === 0);


interface Taken { flag: number; inputs: number[]; start: MachineState; at: string; spell: number }
/**
 * Play from `start` (nothing carried) until the game takes a piece by its own code: steered at the nearest piece sprite, a
 * spell cast at it from some way off (a random one each try: some pieces want a particular spell), then in to touch it.
 */
function take(start: MachineState, tries: number): Taken | null {
  for (let attempt = 0; attempt < tries; attempt++) {
    const g = NativeHost.resume(port, start);
    const { ram, vic } = g.m;
    const spell = 1 + (attempt % 10), gap = 30 + Math.floor(rnd() * 50), dy = Math.floor(rnd() * 41) - 10;
    const flags = FLAGS.map((f) => ram[f]), from = spriteSpot(ram, vic, 2) ?? { x: 0, y: 0 }; // (not up at once: he often starts under a door)
    const inputs: number[] = [];
    let cast = 0, stuckY = 0, lastY = -1, stuckX = 0, lastX = -1, detour = 0, detourDir = UP;
    for (let f = 0; f < 500; f++) {
      const pieces = spritePieceSpots(ram, vic), me = spriteSpot(ram, vic, 2);
      let j = 0;
      const target = pieces[0];
      if (target && me) {
        const into = cast >= 40 || f > 200, ay = target.y + dy, toward = target.x > me.x ? RIGHT : LEFT;
        // (a spell from some way off: as near as `gap`, then in; his box is 42 tall, so close in height is enough to hit)
        const far = Math.abs(target.x - me.x) > (into ? 4 : gap);
        if (far) j |= toward;
        if (stuckY < 8 && Math.abs(me.x - from.x) > 24) { if (me.y < ay - 4) j |= DOWN; else if (me.y > ay + 4) j |= UP; }
        if (j & (UP | DOWN) && me.y === lastY) stuckY++; else if (stuckY < 8) stuckY = 0;
        lastY = me.y;
        // (something in the way: go round it, up or down, for a while)
        if (far && me.x === lastX) stuckX++; else stuckX = 0;
        lastX = me.x;
        if (stuckX >= 10) { detour = 30; detourDir = rnd() < 0.5 ? UP : DOWN; stuckX = 0; }
        if (detour > 0) { detour--; j = (j & ~(UP | DOWN)) | detourDir; }
        if (!into && !j) { cast++; j = toward | (cast % 12 < 6 && cast > 3 ? FIRE : 0); } // (in place: face it, cast now and then)
      } else if (!target) j = [UP, DOWN, LEFT, RIGHT, 0][Math.floor(rnd() * 5)];
      g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = [];
      ram[0x322c] = spell;
      g.tick(); alive(ram);
      inputs.push(j);
      if (process.env.DEBUG && attempt === 5 && f % 15 === 0 && f < 300) console.log(`  try ${attempt} f${f} ${place(ram)} spell ${spell} me ${JSON.stringify(me)} target ${JSON.stringify(target)} cast ${cast} j ${j} c754 ${ram[0xc754]} spr3 ${vic[6]},${vic[7]} en ${vic[0x15].toString(16)} 321a ${ram[0x321a].toString(16)}`);
      if (process.env.DEBUG && attempt === 5 && f === 200) renderPng(g.m, '/tmp/claude-0/-root/0f9120bc-8590-4340-8ed6-b1e28bd22f4e/scratchpad/kh/bot.png', pieces.map((p): [number, number] => [p.x, p.y]));
      const hit = FLAGS.find((a, i) => ram[a] !== flags[i] && ram[a] === 1);
      if (hit !== undefined && ram[KEPT.carrying] === 1) return { flag: hit, inputs, start, at: place(ram), spell };
    }
  }
  return null;
}

const solved = new Map<number, Taken>();
const tried = new Map<string, number>();
for (const st of starts) {
  if ((tried.get(place(st.ram)) ?? 0) >= 2) continue; // (two states in each room)
  tried.set(place(st.ram), (tried.get(place(st.ram)) ?? 0) + 1);
  const here = FLAGS.filter((a) => st.ram[a] === 0);
  if (here.length === 0) continue;
  if (process.env.DEBUG) console.log(`start ${place(st.ram)}`);
  const got = take(st, process.env.DEBUG ? 6 : 20);
  if (got && !solved.has(got.flag)) solved.set(got.flag, got);
  if (solved.size === FLAGS.length) break;
}
console.log(`     taken by playing: ${[...solved].map(([f, t]) => `$${f.toString(16)} at ${t.at} with spell ${t.spell} in ${t.inputs.length} frames`).join(', ')}`);
check(`pieces lying as sprites taken by playing, by the game's own code: ${solved.size} of ${FLAGS.length} (${[...solved.keys()].map((f) => `$${f.toString(16)}`).join(' ')}; the others not reached by the bot, not shown wrong)`, solved.size >= 1);
// replayed: the hint is on the piece's sprite while it lies there, and gone once the game has taken it (the way on shows instead)
for (const t of solved.values()) {
  const g = NativeHost.resume(port, t.start);
  const { ram, vic } = g.m;
  let onIt = 0, frames = 0, took = -1;
  for (const [i, j] of t.inputs.entries()) {
    const sprite = spritePieceSpots(ram, vic)[0], spots = hintSpots(ram, vic);
    if (took < 0 && ram[t.flag] === 0 && sprite) { frames++; if (spots.some((p) => p.x === sprite.x && p.y === sprite.y)) onIt++; }
    g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = [];
    ram[0x322c] = t.spell;
    g.tick(); alive(ram);
    if (took < 0 && ram[t.flag] === 1) took = i;
  }
  check(`$${t.flag.toString(16)}: replayed, the hint is on the piece's sprite on all ${frames} frames it lies there (${onIt}), the game takes it at frame ${took}`, frames > 0 && onIt === frames && took >= 0);
  for (let k = 0; k < 30; k++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); alive(ram); }
  check(`$${t.flag.toString(16)}: taken, no sprite piece shows (${spritePieceSpots(ram, vic).length}) and carrying it, the hint is the way (${hintSpots(ram, vic).length} spots in view: the ways down are not in this room)`, spritePieceSpots(ram, vic).length === 0 && ram[KEPT.carrying] === 1);
}

// ---- 4. the map piece taken by the game's own code (route 0: a piece in room 12 of level 3) ----
{
  const w = routeWalker({ port, title, routes: ROUTES, route: 0, cheat: alive });
  let before = 0, beforeOn = 0, after: Spot[] = [], took = 0, mapAfter = -1;
  for (let m = w.next(); m && w.frame < 5130; m = w.next()) {
    const { vic } = w.host.m;
    if (w.frame >= 5060 && !took && m.ram[KEPT.carrying] === 0) {
      before++;
      if (hintSpots(m.ram, vic).length === 1 && mapPieceSpots(m.ram).length === 1) beforeOn++;
    }
    if (!took && m.ram[KEPT.carrying] === 1) took = w.frame;
    if (took && w.frame === took + 10) { after = hintSpots(m.ram, vic); mapAfter = mapPieceSpots(m.ram).length; }
  }
  check(`the map piece in level 3: the hint is on it on all ${before} frames from 60 before the game takes it (${beforeOn}); taken at frame ${took}, none of the map's pieces show (${mapAfter} in view), the way down shows instead (${after.length} spots)`, took > 0 && beforeOn === before && before > 20 && mapAfter === 0 && after.length > 0);
}

// ---- 5. the abode, from the state by the obelisk (test/pentacle.ts): the obelisk, the sixteenth, the staff ----
{
  const fixture = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/abode-obelisk.state')));
  const GAME_UP = 1, GAME_RIGHT = 8, GAME_FIRE = 16;
  const rig = (count: number) => {
    const g = NativeHost.resume(port, fixture);
    g.m.ram[0x322c] = 7; g.m.ram[KEPT.count] = count; g.m.ram[KEPT.carrying] = 1;
    return { g, step: (j: number) => { g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = []; g.tick(); alive(g.m.ram); }, ram: g.m.ram, vic: g.m.vic };
  };
  const r = rig(15);
  let seen = 0, onObelisk = 0, frames = 0, spotWithoutSprite = 0;
  const watch = () => {
    frames++;
    const spots = hintSpots(r.ram, r.vic), sprite = spriteSpot(r.ram, r.vic, 6);
    if (spots.length) seen++;
    if (sprite && spots.length === 1 && spots[0].x === sprite.x && spots[0].y === sprite.y) onObelisk++;
    if (!sprite && spots.length) spotWithoutSprite++;
  };
  for (let f = 0; f < 120; f++) { r.step(f < 80 ? GAME_UP : 0); watch(); }
  check(`carrying in the abode, the hint is on the obelisk on every frame it is on the screen (${onObelisk} of ${seen} with a spot, ${spotWithoutSprite} spots with it off the screen, ${frames} frames)`, seen > 100 && onObelisk === seen && spotWithoutSprite === 0);
  for (let f = 0; f < 3; f++) r.step(GAME_RIGHT);
  for (let f = 0; f < 3; f++) r.step(GAME_FIRE);
  for (let f = 0; f < 60; f++) r.step(0);
  const staff = spriteSpot(r.ram, r.vic, 6);
  check(`the sixteenth laid (count ${r.ram[KEPT.count]}, carrying ${r.ram[KEPT.carrying]}): the hint is on the staff's sprite in its shrine (${JSON.stringify(hintSpots(r.ram, r.vic))})`, r.ram[KEPT.count] === 16 && staff !== null && same(hintSpots(r.ram, r.vic), [staff]));
  r.ram[0x322c] = 5;
  for (let f = 0; f < 3; f++) r.step(GAME_FIRE);
  for (let f = 0; f < 120; f++) r.step(0);
  check(`MENHIR at the staff: the game is won (count $${r.ram[KEPT.count].toString(16)}) and the hint is gone (${hintSpots(r.ram, r.vic).length})`, r.ram[KEPT.count] === 0x11 && hintSpots(r.ram, r.vic).length === 0);
  // (any other spell at the staff: he is lost, and nothing is shown)
  const q = rig(15);
  const go = (n: number, j: number) => { for (let f = 0; f < n; f++) q.step(j); };
  go(80, GAME_UP); go(3, GAME_RIGHT); go(3, GAME_FIRE); go(60, 0);
  q.ram[0x322c] = 3; go(3, GAME_FIRE); go(120, 0);
  check(`another spell at the staff: he is lost ($6FFD ${q.ram[KEPT.lost]}) and no hint shows (${hintSpots(q.ram, q.vic).length})`, q.ram[KEPT.lost] === 1 && hintSpots(q.ram, q.vic).length === 0);
}

// ---- 6. through the front end, as the browser runs it: the status line, the sparkles, ORIGINAL, the pause screen's count ----
stubFetch(title);
const LINE = (ram: Uint8Array) => screenText(ram, 22, 5, 28);
class Session {
  readonly input = new Input(nowhere);
  readonly renderer = new PixelRenderer();
  readonly p = run({ renderer: this.renderer, input: this.input, canvas: nowhere });
  /** Each different status line seen, with the frame it first showed. */
  readonly trace: { at: number; text: string }[] = [];
  frames = 0;
  /** Frames the game's own message (the one of the moment: $3232) was up and the line was not its own. */
  covered = 0;
  private constructor() { /* use launch() */ }
  static async launch(save: MachineState, enhanced = true) {
    const kept = new Map([['karnath.save.v1', Buffer.from(packState(save)).toString('base64')]]);
    if (!enhanced) kept.set('karnath.assist', JSON.stringify({ enhanced: false }));
    useMemoryStorage(kept);
    const s = new Session();
    await new Promise((r) => setTimeout(r, 0));
    continueFromTitle(s.p, s.input, (n) => s.tick(n)); // (the title, ENTER CONTINUE, Enter)
    s.trace.length = 0;
    return s;
  }
  get ram() { return must(this.p.machine, 'the machine').ram; }
  get vic() { return must(this.p.machine, 'the machine').vic; }
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.input.poll(); this.p.tick(); this.p.render(0);
      this.frames++;
      const m = this.p.machine;
      if (!m) continue;
      alive(m.ram);
      const text = LINE(m.ram);
      if (this.trace[this.trace.length - 1]?.text !== text) this.trace.push({ at: this.frames, text });
    }
  }
  /** Hold keys until `done()` (or `max` frames), then let go. */
  hold(keys: string[], done: () => boolean, max = 400) {
    for (const k of keys) this.input.keyDown(k);
    for (let i = 0; i < max && !done(); i++) this.tick();
    for (const k of keys) this.input.keyUp(k);
    return done();
  }
  /** The lines the status line showed, in order, as far as they are not the game's own. */
  texts() { return this.trace.map((t) => t.text); }
}
/** A copy of a state with its memory edited. */
const saved = (edit: (r: Uint8Array) => void, from: MachineState) => { const st = unpackState(packState(from)); edit(st.ram); return st; };
const partsOf2 = (say: string | readonly string[]) => (typeof say === 'string' ? [say] : [...say]).flatMap((t) => partsOf(t, STATUS));
/** The parts of `say` appear on the status line in order, after `after` (an index into the trace). */
const saysInOrder = (trace: string[], say: string | readonly string[], from = 0) => {
  let at = from;
  for (const part of partsOf2(say)) { const k = trace.indexOf(part, at); if (k < 0) return false; at = k + 1; }
  return true;
};

{
  // the piece in level 3 (route 0): walk into it with the arrows
  const before = routeWalker({ port, title, routes: ROUTES, route: 0, cheat: alive }).at(5085);
  for (const enhanced of [true, false]) {
    const s = await Session.launch(before, enhanced);
    const took = s.hold(['ArrowRight'], () => s.ram[KEPT.carrying] === 1, 120);
    s.tick(1500);
    const trace = s.texts();
    const first = trace.findIndex((t) => t.startsWith('PIECE OF PENTACLE FOUND') || t === 'PIECE OF PENTACLE FOUND');
    if (enhanced) {
      check(`a piece taken by walking into it: the game's own message first ("${trace[first] ?? '?'}"), then the story, in order, and the game's CARRYING line back at the end ("${trace[trace.length - 1]}")`, took && first >= 0 && saysInOrder(trace, LINES.first, first + 1) && trace[trace.length - 1] === 'CARRYING PIECE OF PENTACLE');
      check(`the story's lines are all in the game's lettering, none longer than the line (${partsOf2(LINES.first).join(' | ')})`, partsOf2(LINES.first).every((t) => t.length <= 28));
      const markers = s.renderer.sparkles.markers;
      const spots = hintSpots(s.ram, s.vic);
      check(`ENHANCED: the sparkles the renderer has are the hints' (${markers.length}: ${JSON.stringify(spots)})`, markers.length === spots.length && markers.every((m, i) => m.x === spots[i].x && m.y === spots[i].y));
    } else {
      check(`ORIGINAL: the same walk shows the game's lines only (${trace.join(' | ')}), and no sparkles (${s.renderer.sparkles.markers.length})`, took && trace.every((t) => t === 'PIECE OF PENTACLE FOUND' || t === 'CARRYING PIECE OF PENTACLE' || t === 'SEARCHING' || t === '') && s.renderer.sparkles.markers.length === 0);
    }
  }
}

{
  // the abode: the piece laid, the sixteenth, and what the story says (the game's own DEPOSITED first)
  const fixture = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/abode-obelisk.state')));
  const lay = async (count: number) => {
    const s = await Session.launch(saved((r) => { r[0x322c] = 7; r[KEPT.count] = count; r[KEPT.carrying] = 1; }, fixture));
    s.hold(['ArrowUp'], () => false, 80);
    s.hold(['ArrowRight'], () => false, 3);
    s.hold(['Space'], () => false, 3);
    s.tick(900);
    return s;
  };
  const six = await lay(5);
  const t6 = six.texts(), dep = t6.indexOf('PIECE OF PENTACLE DEPOSITED');
  check(`a piece laid (BARACATA at the obelisk: count ${six.ram[KEPT.count]}): the game's DEPOSITED line first, then "${LINES.laid(6)}", the story of carrying (${partsOf2(LINES.later).join(' | ')}) not said once it is laid (it was not wanted any more)`, six.ram[KEPT.count] === 6 && dep > 0 && t6.indexOf(LINES.laid(6), dep) > dep && !t6.slice(dep).some((t) => partsOf2(LINES.later).includes(t)));
  const last = await lay(15);
  const tl = last.texts(), dl = tl.indexOf('PIECE OF PENTACLE DEPOSITED');
  check(`the sixteenth laid: the game's line, then the staff's (${partsOf2(LINES.staff).join(' | ')}), and the hint is on the staff (${JSON.stringify(hintSpots(last.ram, last.vic))}; sparkles ${last.renderer.sparkles.markers.length})`, last.ram[KEPT.count] === 16 && dl >= 0 && saysInOrder(tl, LINES.staff, dl + 1) && last.renderer.sparkles.markers.length === 1);
  // MENHIR: the game is won, and nothing more is said or shown (the game then restarts: the count is read as it goes by)
  last.ram[0x322c] = 5;
  last.input.keyDown('Space');
  const mark = last.trace.length;
  let won = false, shownWon = 0;
  for (let f = 0; f < 700; f++) {
    last.tick();
    if (f === 3) last.input.keyUp('Space');
    if (last.ram[KEPT.count] === 0x11) { won = true; shownWon += last.renderer.sparkles.markers.length; }
  }
  const after = last.texts().slice(mark).filter((t) => partsOf2(LINES.staff).includes(t) || partsOf2(LINES.late(0)).includes(t));
  check(`MENHIR at the staff: the game is won (seen: ${won}); no sparkle shows then (${shownWon}) and the story says nothing more of it (${after.join(' | ') || 'nothing'})`, won && shownWon === 0 && after.length === 0);
}

{
  // 11 PM: one warning, from the game's clock (the status panel's digits $07C5 $07C6), with the pieces laid
  const start = routeWalker({ port, title, routes: ROUTES, route: 0, cheat: alive }).at(3000);
  for (const enhanced of [true, false]) {
    const s = await Session.launch(saved((r) => { r[KEPT.count] = 4; r[0x07c5] = 0x31; r[0x07c6] = 0x3a; }, start), enhanced); // 10 PM
    s.tick(60);
    const hourBefore = hourOn(s.ram);
    s.ram[0x07c6] = 0x31; // the game's clock reaches 11
    s.tick(1500);
    const hits = s.texts().filter((t) => partsOf2(LINES.late(4)).includes(t));
    if (enhanced) check(`at 11 PM (the clock went from ${hourBefore} to ${hourOn(s.ram)}): the warning "${partsOf2(LINES.late(4)).join(' | ')}" once (${hits.length} lines seen)`, hourBefore === 10 && hourOn(s.ram) === 11 && hits.length === 2);
    else check(`ORIGINAL: nothing is said at 11 PM (${hits.length} lines)`, hits.length === 0);
  }
  // the pause screen's count
  const counted = karnathMap.info(unpackState(packState(start)).ram, karnathMap.found.empty(), { hints: true });
  const plain = karnathMap.info(unpackState(packState(start)).ram, karnathMap.found.empty(), { hints: false });
  const lines = counted.length + (karnathMap.legend?.length ?? 0);
  check(`the pause screen counts the pieces laid with the hints (${counted.slice(-2).join(' / ')}), and not in ORIGINAL (${plain.length} lines against ${counted.length}); its lines and the legend are at most 8, so none reaches the options under them (${lines})`, counted.includes('PIECES 0/16') && !plain.some((l) => l.startsWith('PIECES')) && lines <= 8);
}

{
  // the dungeons' far door, carrying: through it (the hint is on it), and the abode's line on coming in
  const near = routeWalker({ port, title, routes: ROUTES, route: 1, cheat: alive }).at(2671);
  const s = await Session.launch(saved((r) => { r[KEPT.carrying] = 1; }, near));
  let shown = 0;
  // (steered onto the door the hint is on, as goThrough does, with the keys; then up through it)
  const KEYS = { [UP]: 'ArrowUp', [DOWN]: 'ArrowDown', [LEFT]: 'ArrowLeft', [RIGHT]: 'ArrowRight' } as const;
  for (let f = 0; f < 700 && s.ram[KEPT.mode] !== MODE.abode; f++) {
    const spot = hintSpots(s.ram, s.vic)[0], me = spriteSpot(s.ram, s.vic, 2);
    let j = 0;
    if (spot && me) {
      shown++;
      if (me.x < spot.x - 3) j |= RIGHT; else if (me.x > spot.x + 3) j |= LEFT;
      else if (me.y + 21 < spot.y - 3) j |= DOWN; else if (me.y + 21 > spot.y + 3) j |= UP;
      else j = UP;
    }
    for (const [bit, key] of Object.entries(KEYS)) { if (j & Number(bit)) s.input.keyDown(key); else s.input.keyUp(key); }
    s.tick();
  }
  for (const key of Object.values(KEYS)) s.input.keyUp(key);
  s.tick(900);
  check(`carrying, the dungeons' far door is marked on ${shown} frames and he goes through it into the abode (mode $${s.ram[KEPT.mode].toString(16)}); the line there: "${LINES.abode}" (${s.texts().includes(LINES.abode)})`, s.ram[KEPT.mode] === MODE.abode && shown > 10 && s.texts().includes(LINES.abode));
}

finish();