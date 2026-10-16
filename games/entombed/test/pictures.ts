/**
 * Entombed's rooms as pieces (src/pictures.ts, decoded by re/pictures.ts) against the running game: along
 * the corridors (every junction of the seven floors, walked each way along its corridors, travel as the pause
 * map does) and in all 25 chambers (walked to and fro, on through the doors), every 5th frame the play band's
 * characters are one of the decoded pictures (or two side by side, in the corridors, scrolling; or a chamber
 * scrolled a few columns either way), cell for cell but where the game draws something of its own (a torch's
 * flame, a thing moved, the walls round the room's end): the cells that differ are counted, and none may be
 * more than a few. Says which pictures were seen, how often and the most cells any differed by. And each
 * picture's pieces stand in the room (what Blackwyche's and Karnath's tests check of theirs): every wall
 * between the floor's front and its back, every side wall on a floor, every part of a thing standing apart
 * on its own foot.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/pictures.ts [out-dir: the frames with the most differing, as PNGs]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { entombedHd } from '../src/hd';
import { entombedMap, maze } from '../src/map';
import { port } from '../src/native';
import { PICTURES } from '../src/pictures';
import { chamberState } from '../re/hints/chambers';
import { must } from '../../shared/test/must';
import { decodePicture } from '../../../packages/c64kit/src/c64/picture';
import { placePictures } from '../../../packages/c64kit/src/hd/placed';
import { pixelPieces } from '../../../packages/c64kit/src/pendragon/room';
import { renderPng } from '../../../tools/probe/render';

const title = new Uint8Array(fs.readFileSync('games/entombed/assets/entombed-title.state'));
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const { band } = entombedHd, W = 320;
/** The pages of the corridors' pictures (the maze tables hold them). */
const CORRIDORS = [0x70, 0x73, 0x76, 0x79, 0x7c, 0x7f, 0x82, 0x85, 0x88];
const label = (id: number) => `$${id.toString(16)}`;

// Each picture's pieces stand where the room has them:
// - every wall between the floor's front edge and its back (none in front of the room, none behind
//   where the floor ends);
// - every side wall on its own foot: a floor right under its pixels somewhere;
// - every part of a thing standing apart from the rest of it (its pixels joined, a floor under some of
//   them, no part of it over or under another) on its own foot: the thing stands no more than a
//   character row in front of the floor under that part.
{
  let walls = 0, sides = 0, parts = 0, tops = 0;
  const bad: string[] = [];
  for (const p of PICTURES.pictures) {
    const px = pixelPieces(p), PW = p.cols * 8, PH = p.rows * 8, name = label(p.id);
    const floorAt = p.pieces.findIndex((q) => q.kind === 'floor'), fl = p.pieces[floorAt];
    const height = fl.kind === 'floor' ? fl.height : 0, bottom = PH;
    const isFloor = (n: number) => p.pieces[n].kind === 'floor';
    /** The height of the floor piece n. */
    const heightOf = (n: number) => { const q = p.pieces[n]; return q.kind === 'floor' ? q.height : height; };
    // (the floor's depth range over all its levels: a top's pixel at its height is as deep as the ground's that much lower down)
    let deepest = -Infinity, nearest = Infinity;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const n = px[y * PW + x];
      if (!isFloor(n)) continue;
      const z = bottom - (y + 0.5) - heightOf(n);
      deepest = Math.max(deepest, z); nearest = Math.min(nearest, z);
    }
    const front = Math.min(...p.pieces.flatMap((q) => (q.kind === 'wall' ? [q.depth] : [])));
    tops += p.pieces.filter((q) => q.kind === 'floor').length - 1;
    for (const [k, q] of p.pieces.entries()) {
      if (q.kind === 'wall') { walls++; if (q.depth < front || q.depth > deepest + 1) bad.push(`${name} wall ${k} at ${q.depth} (floor ${nearest.toFixed(0)}-${deepest.toFixed(0)})`); }
      if (q.kind === 'side') {
        sides++;
        let foot = 0;
        for (let y = 0; y + 1 < PH; y++) for (let x = 0; x < PW; x++) if (px[y * PW + x] === k && isFloor(px[(y + 1) * PW + x])) foot++;
        if (!foot) bad.push(`${name} side wall ${k}: no foot on a floor`);
      }
      if (q.kind !== 'thing') continue;
      // its parts: pixels joined (corner to corner too)
      const seen = new Uint8Array(PW * PH), groups: { lo: number; hi: number; foot: number; n: number }[] = [];
      for (let s = 0; s < PW * PH; s++) {
        if (px[s] !== k || seen[s]) continue;
        const g = [s];
        seen[s] = 1;
        let lo = PW, hi = -1, low = -1, under = floorAt;
        for (let i = 0; i < g.length; i++) {
          const j = g[i], x = j % PW, y = (j - x) / PW;
          lo = Math.min(lo, x); hi = Math.max(hi, x);
          if (y + 1 < PH && isFloor(px[j + PW]) && y + 1 >= low) { low = y + 1; under = px[j + PW]; }
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy, n = Y * PW + X;
            if (X >= 0 && Y >= 0 && X < PW && Y < PH && px[n] === k && !seen[n]) { seen[n] = 1; g.push(n); }
          }
        }
        if (low >= 0 && g.length >= 32) groups.push({ lo, hi, foot: bottom - low - heightOf(under), n: g.length });
      }
      for (const g of groups) {
        if (groups.some((o) => o !== g && o.lo <= g.hi && g.lo <= o.hi)) continue;
        parts++;
        if (g.foot - q.depth > 8) bad.push(`${name} thing ${k} at ${q.depth}: a part of it (x ${g.lo / 2}-${g.hi / 2}) stands at ${g.foot}`);
      }
    }
  }
  check(`the ${PICTURES.pictures.length} pictures' pieces stand in the room: ${walls} walls between the floor's front and back, ${sides} side walls each on its foot, ${tops} tops standing above the ground, ${parts} parts of things standing apart each on its own foot${bad.length ? `; not: ${bad.join(', ')}` : ''}`, bad.length === 0);
}

// ---- along the game ----
const g0 = new NativeHost(port, unpackState(title));
for (let f = 0; f < 200; f++) { g0.m.joy1 = g0.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g0.tick(); }
const start = must(g0.save(), 'a save at the start of a game');
/** A junction of a floor, travelled to as the pause map does (every junction of it: the places the map lists). */
function junction(floor: number, k: number): MachineState | null {
  const g = NativeHost.resume(port, start);
  let done = false, found = true;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const all = [...Array(256).keys()].map((n) => `${n & 15},${n >> 4}`);
    const places = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, { cells: { [floor]: all } });
    if (k < places.length) entombedMap.go(places[k].id, g.m.ram, {}); else found = false;
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 30; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  return found ? must(g.save(), 'a save at a junction') : null;
}

const seen = new Map<string, number>(), shifts = new Map<number, Set<number>>();
let frames = 0, placed = 0, worst = 0, cellsDiffering = 0;
const negatives: string[] = [], unplaced: string[] = [], shown: { differ: number; where: string }[] = [];
/** One frame of play, looked at. */
function look(g: NativeHost, where: string) {
  const m = g.m, pic = decodePicture(m.ram, m.capture), a = band.y * W, b = (band.y + band.h) * W;
  const p = placePictures(PICTURES, band, { code: pic.code.slice(a, b), colour: pic.colour.slice(a, b), pair: pic.pair.slice(a, b), row: pic.row.slice(a, b), column: pic.column.slice(a, b) });
  frames++;
  if (!p) {
    if (unplaced.length < 12) {
      unplaced.push(where);
      if (outDir) renderPng(m, `${outDir}/unplaced-${unplaced.length}.png`);
    }
    return;
  }
  placed++;
  const s = p.shows, key = s.left === s.right ? label(s.left.id) : `${label(s.left.id)}|${label(s.right.id)}`;
  seen.set(key, (seen.get(key) ?? 0) + 1);
  const set = shifts.get(s.left.id) ?? new Set<number>();
  shifts.set(s.left.id, set);
  set.add(s.from);
  if (s.from < 0 && CORRIDORS.includes(s.left.id) && negatives.length < 10) negatives.push(`${where}: ${key} from ${s.from}, ${s.differ} differ`);
  cellsDiffering += s.differ;
  if (s.differ > worst) {
    worst = s.differ;
    shown.push({ differ: s.differ, where: `${where}: ${key} from column ${s.from}, ${s.differ} of ${s.cells} cells drawn differently` });
    if (outDir) renderPng(m, `${outDir}/differ-${s.differ}-${key.replace('|', '-').replace(/\$/g, '')}.png`);
  }
}

// the corridors: each junction of every floor, then along each way, as far as a cell (330 frames)
const WAYS = [0x17, 0x1b, 0x1d, 0x1e];
let junctions = 0, stray = 0;
for (let floor = 1; floor <= 7; floor++) {
  for (let k = 0; ; k++) {
    const s = junction(floor, k);
    if (!s) break;
    // (a cell whose byte in the maze tables is no corridor picture is none: floor 2's (0, 1) holds $80, a byte of
    // the tables' own layout, drawn from the middle of two pictures: no way to it, nor along it)
    const m = maze(s.ram, floor), at = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, s.ram, { cells: { [floor]: [...Array(256).keys()].map((n) => `${n & 15},${n >> 4}`) } })[k].id.split(/[:,]/).map(Number);
    if (!CORRIDORS.includes(m.row(at[1], at[2])) && !CORRIDORS.includes(m.col(at[1], at[2]))) { stray++; continue; }
    junctions++;
    // (only along the corridors the cell has: pressing a way it hasn't turns him into no corridor, and the game draws the table's next bytes as one)
    for (const way of WAYS.filter((w) => (w === 0x17 || w === 0x1b ? m.row(at[1], at[2]) : m.col(at[1], at[2])) !== 0)) {
      const g = NativeHost.resume(port, s);
      for (let f = 0; f < 360; f++) {
        g.m.joy1 = g.m.joy2 = f < 3 ? 0x1f : way;
        g.tick();
        // (the game's health and air kept up)
        g.m.ram[0x3223] = 100;
        if (f % 9 === 4) look(g, `floor ${floor} junction ${k} (${at[1]},${at[2]}: row ${m.row(at[1], at[2]).toString(16)}, column ${m.col(at[1], at[2]).toString(16)}) way ${way.toString(16)} frame ${f}`);
      }
    }
  }
}
console.log(`     ${junctions} junctions walked (${stray} are stray bytes of the tables)`);
// the chambers: walked about in, through their doors
for (let n = 1; n <= 25; n++) {
  const g = NativeHost.resume(port, n === 1 ? start : chamberState(n, {}, start));
  // (right to the edge and back, so the wide ones scroll each way, then about)
  const pattern = [0x17, 0x17, 0x17, 0x1b, 0x1b, 0x1b, 0x17, 0x1d, 0x1e, 0x1b, 0x1d, 0x17, 0x0f, 0x1b];
  const block = g.m.ram[0x6001] | (g.m.ram[0x6002] << 8);
  for (let f = 0; f < 1400; f++) {
    g.m.joy1 = g.m.joy2 = pattern[Math.floor(f / 100)];
    g.tick();
    // (out through a door into the corridors: they're walked above, and a way pressed there that the cell hasn't draws the tables' next bytes)
    if ((g.m.ram[0x6001] | (g.m.ram[0x6002] << 8)) !== block) break;
    if (f % 5 === 4) look(g, `chamber ${n} frame ${f}`);
  }
}
for (const s of shown) console.log(`     ${s.where}`);
for (const s of negatives) console.log(`     negative: ${s}`);
const all = PICTURES.pictures.map((p) => label(p.id));
check(`${frames} frames looked at: ${placed} are one of the game's pictures, or two side by side (${unplaced.length ? `not: ${unplaced.join(', ')}` : 'all'})`, placed >= frames * 0.995 && frames > 5000);
check(`the cells the game draws differently from its picture: ${(cellsDiffering / Math.max(1, placed)).toFixed(2)} a frame on average, ${worst} at most (of 680)`, worst <= 60);
console.log(`     seen (frames): ${[...seen.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`     scrolled: ${[...shifts.entries()].map(([id, s]) => `${label(id)} from ${Math.min(...s)} to ${Math.max(...s)}`).join(', ')}`);
const singles = new Set([...seen.keys()].flatMap((k) => k.split('|')));
check(`every picture is seen in play (${all.filter((k) => !singles.has(k)).join(', ') || 'none missing'}), ${seen.size} windows, ${PICTURES.beside.length} pairs listed`, all.every((k) => singles.has(k)));
console.log(failures ? `${failures} FAILED` : 'all ok');
process.exit(failures ? 1 : 0);
