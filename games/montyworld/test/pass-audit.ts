/**
 * The whole-game challenge pass's audit (docs/dosvidaniya-edges.md): every room's four edges against the exit grid, its creatures (patrol, speed,
 * whether each sweeps the way the region bot's recorded route takes through the room), and the colours its picture uses, beside Monty on the Run's.
 * Renders every room and a contact sheet of the edges it flags. A report, not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pass-audit.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import type { MontyData } from '../../montyotr/src/montydata';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, settled, type State } from '../../montyotr/test/play';
import { ACTIONS, diedIn, newGame, useRandomOf } from '../../shared/monty/test/bot';
import { readRecordedFile } from '../../shared/monty/test/legs';
import { readKept, thaw } from '../../shared/monty/test/states';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { WORLD_REGIONS } from '../src/regions';
import { regionAt } from '../../montyotr/src/regions';
import { Canvas, label } from './preview-kit';
import { ROUTES } from './routes-dir';
import { ALL_ROOMS, REGION_ROOMS, scopedRooms } from './scope';

/** `--room` narrows the audit to those rooms (a re-check after a region changes): their regions' routes, no Monty on the Run pass. */
const ROOMS = scopedRooms(ALL_ROOMS);
const whole = ROOMS.length === ALL_ROOMS.length;
import { shot } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pass-audit.ts <out-dir>');
fs.mkdirSync(path.join(out, 'rooms'), { recursive: true });

const hex = (n: number) => `$${n.toString(16)}`;
const nameOf = (data: MontyData, id: number) => data.sectorNames[data.sectorIdx[id] ?? 0]?.text ?? hex(id);
const grid = WORLD.exitGrid;
const roomAtCell = (row: number, col: number): number | null => {
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) return null;
  const v = grid.image[row * grid.cols + col] ?? 0xff;
  return v === 0xff ? null : v;
};

/** A game in a room with its creatures, Monty out of harm (the grace) and out of the picture. */
function entered(data: MontyData, room: number): State | null {
  const s = newGame(data, false);
  s.g.graceActive = () => true;
  if (!enterRoom(s.g, room, 0x30, 0x32 + 8 * 8)) return null;
  for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE);
  return s;
}

// ---- the edges ---------------------------------------------------------------------------------------------------------------------

type Side = 'W' | 'E' | 'N' | 'S';
interface Edge { side: Side; open: number; stand: number[]; deadly: number; rope: boolean; neighbour: number | null; mismatch: number[] }
/** The cell's collision class (0 nothing, 1 solid, 2 floor, 3 rope, 4 deadly), as the loaded room has it. */
const flag = (g: Game, c: number, r: number) => (c < 0 || c >= PLAY_COLS || r < 0 || r >= PLAY_ROWS ? 1 : g.flagAt(PLAY_ROW + r, PLAY_COL + c));
const passable = (f: number) => f === 0 || f === 3;
const floor = (f: number) => f === 1 || f === 2;

/** The rows at a side column where he can stand (open over a floor, room for him), the open rows and the deadly ones. */
function sideCells(g: Game, c: number): { stand: number[]; open: number; deadly: number; rope: boolean } {
  const stand: number[] = [];
  let open = 0, deadly = 0, rope = false;
  for (let r = 2; r < PLAY_ROWS; r++) {
    const f = flag(g, c, r);
    if (passable(f)) open++;
    if (f === 4) deadly++;
    if (f === 3) rope = true;
    if (r >= 3 && r < PLAY_ROWS - 1 && passable(f) && passable(flag(g, c, r - 1)) && floor(flag(g, c, r + 1))) stand.push(r); // (two rows of room: he walks a lane two rows tall; the bottom row has no floor in the room)
  }
  return { stand, open, deadly, rope };
}

function edgesOf(g: Game, row: number, col: number): Edge[] {
  const edges: Edge[] = [];
  for (const [side, c, dc] of [['W', 0, -1], ['E', PLAY_COLS - 1, 1]] as const) {
    const here = sideCells(g, c);
    const neighbour = roomAtCell(row, col + dc);
    const mismatch: number[] = [];
    if (neighbour !== null) {
      const t = entered(WORLD, neighbour);
      if (t) {
        const there = sideCells(t.g, side === 'W' ? PLAY_COLS - 1 : 0);
        for (const r of here.stand) if (!passable(flag(t.g, side === 'W' ? PLAY_COLS - 1 : 0, r))) mismatch.push(r);
        for (const r of there.stand) if (!passable(flag(g, c, r))) mismatch.push(-r); // (open there, shut here: negative rows)
      }
    }
    edges.push({ side, ...here, neighbour, mismatch });
  }
  for (const [side, r, dr] of [['N', 0, -1], ['S', PLAY_ROWS - 1, 1]] as const) {
    let open = 0, deadly = 0, rope = false;
    for (let c = 0; c < PLAY_COLS; c++) {
      const f = flag(g, c, r);
      if (passable(f)) open++;
      if (f === 4) deadly++;
      if (f === 3) rope = true;
    }
    edges.push({ side, open, stand: [], deadly, rope, neighbour: roomAtCell(row + dr, col), mismatch: [] });
  }
  return edges;
}

/** An edge worth a look: open to the side with no room there, or open on one side of a join and shut on the other. */
function flagged(e: Edge): string | null {
  if (e.side === 'W' || e.side === 'E') {
    if (e.neighbour === null && e.stand.length > 0) return `walkable to the edge (rows ${e.stand.join(',')}), no room`;
    if (e.neighbour === null && e.deadly >= 3) return `deadly cells run off (${e.deadly} rows), no room`;
    if (e.neighbour === null && e.open >= 12) return `${e.open} of 18 rows open, no room`;
    if (e.neighbour !== null && e.mismatch.length > 0) return `join to ${hex(e.neighbour)}: open one side, shut the other (rows ${e.mismatch.join(',')})`;
    return null;
  }
  if (e.side === 'N' && e.neighbour === null && e.rope) return 'a rope runs off the top, no room above';
  if (e.side === 'S' && e.neighbour === null && e.open >= 3) return `${e.open} open cells in the bottom row, no room below`;
  return null;
}

// ---- the colours -------------------------------------------------------------------------------------------------------------------

/** The colours of a room's playfield without sprites: those covering 64+ pixels (black left out), by area; `main` those over 8% of the coloured area; `black` the share of black. */
interface Colours { all: number[]; main: number[]; black: number }
function coloursOf(g: Game): Colours {
  g.enemies = []; g.enable = 0; g.vic.enable = 0;
  const px = shot(g);
  const count = new Array<number>(16).fill(0);
  for (let y = PLAY_ROW * 8; y < (PLAY_ROW + PLAY_ROWS) * 8; y++) for (let x = PLAY_COL * 8; x < (PLAY_COL + PLAY_COLS) * 8; x++) {
    const c = px[y * 320 + x] ?? 0;
    count[c] = (count[c] ?? 0) + 1;
  }
  const total = PLAY_ROWS * PLAY_COLS * 64, coloured = total - (count[0] ?? 0);
  const all = count.map((n, c) => ({ n, c })).filter((e) => e.c !== 0 && e.n >= 64).sort((a, b) => b.n - a.n);
  return { all: all.map((e) => e.c), main: all.filter((e) => e.n >= coloured * 0.08).map((e) => e.c), black: Math.round((100 * (count[0] ?? 0)) / total) };
}
const C64 = ['black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown', 'pink', 'dgrey', 'grey', 'lgreen', 'lblue', 'lgrey'] as const;
const colourNames = (cs: readonly number[]) => cs.map((c) => C64[c] ?? String(c)).join(' ');

// ---- the way: the region bots' recorded routes, replayed from their kept leg states ---------------------------------------------------

interface Sample { x2: number; y: number }
/** Per room: where he was on the way, and per creature slot the nearest its body came to his (pixels; 0: they met). */
const way = new Map<number, Sample[]>();
const nearest = new Map<number, number[]>();
const replayed: string[] = [];

const gap = (g: { x2: number; y: number }, e: { x: number; y: number }) => {
  const mx = ((g.x2 - 0x0c) & 0xff) * 2, my = (g.y - 0x32) & 0xff, ex = ((e.x - 0x0c) & 0xff) * 2, ey = (e.y - 0x32) & 0xff;
  const dx = Math.max(0, ex - (mx + 16), mx - (ex + 16)), dy = Math.max(0, ey - (my + 24), my - (ey + 16));
  return Math.max(dx, dy);
};
function sample(g: Game) {
  const list = way.get(g.roomId) ?? [];
  list.push({ x2: g.x2, y: g.y });
  way.set(g.roomId, list);
  const near = nearest.get(g.roomId) ?? [];
  g.enemies.forEach((e, i) => { if (e.x !== 0xff) near[i] = Math.min(near[i] ?? 999, gap(g, e)); });
  nearest.set(g.roomId, near);
}

for (const region of (['siberia', 'china', 'japan', 'pacific', 'andes', 'rio'] as const).filter((n) => whole || REGION_ROOMS.some((r) => r.name === n && r.specs.some((sp) => ROOMS.includes(sp))))) {
  const kept = readKept('montyworld', region, 'enhanced');
  const recorded = readRecordedFile(ROUTES, region, 'enhanced').routes;
  if (!kept) { replayed.push(`${region}: no kept states`); continue; }
  let legs = 0, deaths = 0, missing = 0;
  for (const st of kept.states) {
    const route = recorded.get(st.leg);
    if (!route) { missing++; continue; }
    const s = thaw(WORLD, st.bytes);
    legs++;
    let dead = false;
    for (const [name, frames] of route) {
      if (dead) break;
      const stick = ACTIONS.find(([n]) => n === name)?.[1] ?? NONE;
      useRandomOf(s.g);
      const room = s.g.roomId;
      for (let f = 0; f < frames; f++) {
        const before = s.g.actionCounter;
        frame(s, stick);
        const warped = s.g.tele.lift !== 0 || (s.g.roomId !== room && s.g.dissolvePending !== 0);
        if (!warped && (diedIn(before, s.g.actionCounter) || (s.g.actionCounter && !(s.g.actionCounter & 0x80)))) { dead = true; deaths++; break; }
        if (settled(s.g)) sample(s.g);
        if (s.g.roomId !== room) { for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE); break; }
      }
    }
  }
  replayed.push(`${region}: ${legs} legs replayed, ${deaths} died on the way (a kept state older than the room), ${missing} with no recorded route`);
}

// ---- creatures ----------------------------------------------------------------------------------------------------------------------

interface Beast { slot: number; kind: 'walk' | 'up-down' | 'driven'; cells: number; speed: number; covers: number; near: number | null }
function creaturesOf(room: number, data: MontyData = WORLD): Beast[] {
  const s = entered(data, room);
  if (!s) return [];
  const g = s.g;
  const n = g.enemies.length;
  const xs: number[][] = Array.from({ length: n }, () => []), ys: number[][] = Array.from({ length: n }, () => []);
  for (let f = 0; f < 900; f++) {
    frame(s, NONE);
    g.enemies.forEach((e, i) => { if (e.x !== 0xff) { xs[i]?.push(e.x); ys[i]?.push(e.y); } });
  }
  const path_ = data === WORLD ? way.get(room) ?? [] : [];
  return g.enemies.map((e, i) => {
    const x = xs[i] ?? [], y = ys[i] ?? [];
    const w = x.length ? (Math.max(...x) - Math.min(...x)) * 2 : 0, h = y.length ? Math.max(...y) - Math.min(...y) : 0;
    let moved = 0, moves = 0;
    for (let k = 1; k < x.length; k++) { const d = Math.abs((x[k] ?? 0) - (x[k - 1] ?? 0)) * 2 + Math.abs((y[k] ?? 0) - (y[k - 1] ?? 0)); if (d > 0) { moved += d; moves++; } }
    const pts = new Set<string>();
    for (let k = 0; k < x.length; k += 2) pts.add(`${x[k] ?? 0},${y[k] ?? 0}`);
    const body = [...pts].map((p) => { const [a, b] = p.split(',').map(Number); return { x: a ?? 0, y: b ?? 0 }; });
    let covers = 0;
    for (const p of path_) if (body.some((q) => gap(p, q) === 0)) covers++;
    const kind = e.driven ? 'driven' : e.flags & 1 ? 'up-down' : 'walk';
    return { slot: i, kind, cells: Math.round(Math.max(w, h) / 8), speed: moves ? Math.round((moved / moves) * 10) / 10 : 0, covers: path_.length ? Math.round((100 * covers) / path_.length) : -1, near: nearest.get(room)?.[i] ?? null };
  });
}

// ---- every room -------------------------------------------------------------------------------------------------------------------

interface Report { id: number; name: string; region: string; row: number; col: number; edges: Edge[]; flags: string[]; beasts: Beast[]; colours: Colours; px: Uint8Array; way: number }
const reports: Report[] = [];
for (const spec of ROOMS) {
  const s = entered(WORLD, spec.id);
  if (!s) continue;
  for (let n = 0; n < 40; n++) frame(s, NONE);
  s.g.enable &= 0xf0; s.g.vic.enable &= 0xf0; // (Monty out of the picture)
  const px = shot(s.g);
  const edges = edgesOf(s.g, spec.row, spec.col);
  const flags = edges.map((e) => { const f = flagged(e); return f === null ? '' : `${e.side}: ${f}`; }).filter((f) => f !== '');
  const region = regionAt(WORLD_REGIONS, spec.row, spec.col)?.name ?? '?';
  const colours = coloursOf(s.g);
  reports.push({ id: spec.id, name: nameOf(WORLD, spec.id), region, row: spec.row, col: spec.col, edges, flags, beasts: creaturesOf(spec.id), colours, px, way: way.get(spec.id)?.length ?? 0 });
}

// ---- Monty on the Run's colours ---------------------------------------------------------------------------------------------------
const motr: { id: number; name: string; colours: Colours }[] = [];
for (let id = 0; whole && id < 0x34; id++) {
  const s = newGame(MOTR, false);
  s.g.graceActive = () => true;
  if (!enterRoom(s.g, id, 0x40, 0xb2)) continue;
  for (let n = 0; n < 30; n++) frame(s, NONE);
  motr.push({ id, name: nameOf(MOTR, id), colours: coloursOf(s.g) });
}

// ---- pictures ------------------------------------------------------------------------------------------------------------------------
const TILE_H = 210;
function sheet(file: string, list: readonly Report[], marks: boolean) {
  const rows = Math.ceil(list.length / 3);
  const cv = new Canvas(960, Math.max(1, rows) * TILE_H);
  list.forEach((r, i) => {
    const ox = (i % 3) * 320, oy = Math.floor(i / 3) * TILE_H;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) cv.set(ox + x, oy + y, r.px[y * 320 + x] ?? 0);
    if (marks) for (const e of r.edges) {
      if (!flagged(e)) continue;
      const ink = e.neighbour === null ? 7 : 2;
      for (let k = 0; k < 160; k++) for (let t = 0; t < 3; t++) {
        if (e.side === 'W') cv.set(ox + 32 + t, oy + 24 + k, ink);
        if (e.side === 'E') cv.set(ox + 285 + t, oy + 24 + k, ink);
      }
      for (let k = 0; k < 256; k++) for (let t = 0; t < 3; t++) {
        if (e.side === 'N') cv.set(ox + 32 + k, oy + 24 + t, ink);
        if (e.side === 'S') cv.set(ox + 32 + k, oy + 181 + t, ink);
      }
    }
    label(cv, `${hex(r.id)} ${r.name} [${r.row},${r.col}] ${r.flags.map((f) => f.slice(0, 1)).join('')}`, ox + 2, oy + 202, 1);
  });
  cv.png(file, 1);
}
for (const r of reports) {
  const cv = new Canvas(320, 200);
  cv.px.set(r.px);
  cv.png(path.join(out, 'rooms', `${r.id.toString(16).padStart(2, '0')}.png`), 2);
}
for (const reg of WORLD_REGIONS) sheet(path.join(out, `all-${reg.name}.png`), reports.filter((r) => r.region === reg.name), true);
sheet(path.join(out, 'flagged.png'), reports.filter((r) => r.flags.length > 0), true);
/** The open edges the doc answers (docs/dosvidaniya-edges.md), with the sides it looks at: yellow, no room there; red, a join that reads wrong. */
const OPEN: readonly (readonly [number, string])[] = [
  [0x2a, 'W'], [0x5c, 'WE'], [0x33, 'E'], [0x2b, 'W'], [0x49, 'E'], [0x58, 'E'], [0x59, 'WE'], [0x35, 'E'], [0x23, 'E'], [0x37, 'E'], [0x53, 'E'], [0x4d, 'E'], [0x0, 'W'], [0x2d, 'E'], [0x5, 'S'],
];
{
  const list = OPEN.flatMap(([id]) => reports.filter((r) => r.id === id));
  const rows = Math.ceil(list.length / 3);
  const cv = new Canvas(960, rows * TILE_H);
  list.forEach((r, i) => {
    const sides = OPEN.find(([id]) => id === r.id)?.[1] ?? '';
    const ox = (i % 3) * 320, oy = Math.floor(i / 3) * TILE_H;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) cv.set(ox + x, oy + y, r.px[y * 320 + x] ?? 0);
    for (const e of r.edges) {
      if (!sides.includes(e.side)) continue;
      const ink = e.neighbour === null ? 7 : 2;
      for (let k = 0; k < 160; k++) for (let t = 0; t < 3; t++) {
        if (e.side === 'W') cv.set(ox + 32 + t, oy + 24 + k, ink);
        if (e.side === 'E') cv.set(ox + 285 + t, oy + 24 + k, ink);
      }
      for (let k = 0; k < 256; k++) for (let t = 0; t < 3; t++) if (e.side === 'S') cv.set(ox + 32 + k, oy + 181 + t, ink);
    }
    label(cv, `${i + 1}. ${hex(r.id)} ${r.name} [${r.row},${r.col}] ${sides}`, ox + 2, oy + 202, 1);
  });
  cv.png(path.join(out, 'sheet.png'), 1);
}

// ---- the report ---------------------------------------------------------------------------------------------------------------------
console.log('## Replays\n');
for (const r of replayed) console.log(`- ${r}`);
console.log('\n## Grid\n');
for (let row = 0; row < grid.rows; row++) {
  const cells: string[] = [];
  for (let col = 0; col < grid.cols; col++) { const v = roomAtCell(row, col); cells.push(v === null ? ' . ' : v.toString(16).padStart(3, ' ')); }
  console.log(`${String(row).padStart(2)} ${cells.join('')}`);
}
console.log(`   ${Array.from({ length: grid.cols }, (_, c) => String(c).padStart(3)).join('')}`);
const used = new Set([...ALL_ROOMS.map((r) => r.id), ...Array.from(grid.image).filter((v) => v !== 0xff)]);
console.log(`\nhighest room id used: ${hex(Math.max(...used))}; ids used: ${used.size}; free below it: ${Array.from({ length: Math.max(...used) }, (_, i) => i).filter((i) => !used.has(i)).map(hex).join(' ')}`);
console.log(`extension grid cells in use: ${Array.from(WORLD.extensionGrid).filter((v) => v !== 0xff).length}`);

console.log('\n## Edges\n\n| room | name | cell | W | E | N | S | flags |\n|---|---|---|---|---|---|---|---|');
const edgeText = (e: Edge) => `${e.neighbour === null ? '-' : hex(e.neighbour)} o${e.open}${e.stand.length ? ` s${e.stand.join('/')}` : ''}${e.deadly ? ` d${e.deadly}` : ''}${e.rope ? ' r' : ''}`;
for (const r of reports) console.log(`| ${hex(r.id)} | ${r.name} | [${r.row},${r.col}] | ${r.edges.map(edgeText).join(' | ')} | ${r.flags.join('; ') || '-'} |`);

console.log('\n## Creatures\n\n| room | name | way samples | creatures (kind cells@px/frame, way covered %, nearest px on the route) |\n|---|---|---|---|');
for (const r of reports) console.log(`| ${hex(r.id)} | ${r.name} | ${r.way} | ${r.beasts.map((b) => `${b.kind} ${b.cells}@${b.speed} ${b.covers < 0 ? 'no route' : `${b.covers}%`} ${b.near === null ? '' : `n${b.near}`}`).join('; ') || '-'} |`);

const sameMain = (a: Colours, b: Colours) => a.main.filter((c) => b.main.includes(c)).length;
console.log('\n## Colours\n\n| room | name | count | main colours (by area) | black % | main shared with grid neighbours |\n|---|---|---|---|---|---|');
const byId = new Map(reports.map((r) => [r.id, r]));
for (const r of reports) {
  const nb = r.edges.map((e) => e.neighbour).filter((n): n is number => n !== null).map((n) => byId.get(n)).filter((n): n is Report => n !== undefined);
  console.log(`| ${hex(r.id)} | ${r.name} | ${r.colours.all.length} | ${colourNames(r.colours.main)} | ${r.colours.black} | ${nb.map((n) => `${hex(n.id)} ${sameMain(r.colours, n.colours)}/${r.colours.main.length}`).join(', ')} |`);
}
const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] ?? 0 : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2; };
console.log('\nMOTR rooms:');
motr.forEach((m, i) => { const prev = motr[i - 1]; console.log(`| ${hex(m.id)} | ${m.name} | ${m.colours.all.length} | ${colourNames(m.colours.main)} | ${m.colours.black} | ${prev ? `${sameMain(m.colours, prev.colours)}/${m.colours.main.length} with ${hex(prev.id)}` : ''} |`); });
const recipe = motr.filter((m) => m.id <= 0x13 || (m.id >= 0x20 && m.id <= 0x23) || (m.id >= 0x26 && m.id <= 0x2f));
console.log(`\nMOTR recipe rooms (house, tunnel, stump, boat): count median ${median(recipe.map((m) => m.colours.all.length))}, main median ${median(recipe.map((m) => m.colours.main.length))}, black median ${median(recipe.map((m) => m.colours.black))}`);
console.log(`ours: count median ${median(reports.map((r) => r.colours.all.length))}, main median ${median(reports.map((r) => r.colours.main.length))}, black median ${median(reports.map((r) => r.colours.black))}`);
for (const reg of WORLD_REGIONS) { const rs = reports.filter((r) => r.region === reg.name); console.log(`  ${reg.name}: count median ${median(rs.map((r) => r.colours.all.length))}, main median ${median(rs.map((r) => r.colours.main.length))}, black median ${median(rs.map((r) => r.colours.black))}, main colours over the region ${new Set(rs.flatMap((r) => r.colours.main)).size}`); }

// ---- holes: black cells walled in by colour (a backdrop with a black box in it) ------------------------------------------------------
console.log('\n## Holes (black playfield cells with colour on all four sides, Monty and creatures out of the picture)\n');
for (const spec of ROOMS) {
  const r = reports.find((x) => x.id === spec.id);
  if (!r) continue;
  const s = entered(WORLD, spec.id);
  if (!s) continue;
  const px = (() => { s.g.enemies = []; s.g.enable = 0; s.g.vic.enable = 0; return shot(s.g); })();
  const ink = (c: number, row: number) => { let n = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((px[((PLAY_ROW + row) * 8 + y) * 320 + (PLAY_COL + c) * 8 + x] ?? 0) !== 0) n++; return n; };
  const holes: string[] = [];
  for (let row = 1; row < PLAY_ROWS - 1; row++) for (let c = 1; c < PLAY_COLS - 1; c++) {
    if (ink(c, row) !== 0) continue;
    const around = [ink(c - 1, row), ink(c + 1, row), ink(c, row - 1), ink(c, row + 1)];
    const runL = [1, 2, 3].map((k) => ink(c - k, row)).find((n) => n > 0) ?? 0, runR = [1, 2, 3].map((k) => ink(c + k, row)).find((n) => n > 0) ?? 0;
    const runU = [1, 2, 3].map((k) => ink(c, row - k)).find((n) => n > 0) ?? 0, runD = [1, 2, 3].map((k) => ink(c, row + k)).find((n) => n > 0) ?? 0;
    if (around.filter((n) => n >= 24).length >= 3 && runL >= 24 && runR >= 24 && runU >= 24 && runD >= 24) holes.push(`${c},${row}`);
  }
  const items = [spec.item, spec.item2].filter((i): i is NonNullable<typeof i> => i !== undefined).map((i) => `${i.name} at ${i.col - PLAY_COL},${i.row - PLAY_ROW}`);
  if (holes.length) console.log(`- ${hex(spec.id)} ${r.name}: ${holes.length} cells (${holes.slice(0, 12).join(' ')}${holes.length > 12 ? ' ...' : ''})${items.length ? `; items: ${items.join(', ')}` : ''}${spec.cake ? `; cake at ${spec.cake[0] - PLAY_COL},${spec.cake[1] - PLAY_ROW}` : ''}`);
}

console.log('\n## MOTR creatures, measured the same way (no route)\n');
for (let id = 0; whole && id < 0x30; id++) console.log(`| ${hex(id)} | ${nameOf(MOTR, id)} | ${creaturesOf(id, MOTR).map((b) => `${b.kind} ${b.cells}@${b.speed}`).join('; ')} |`);
