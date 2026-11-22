/**
 * Room recipe statistics: measures every room of Monty on the Run (its 52 original rooms) and of Do Svidaniya Monty (every region)
 * from the engine's data (`MontyData`), and prints Markdown tables: per room, the MOTR recipe (medians and ranges, the sewers set
 * aside), and Do Svidaniya Monty's rooms flagged against it. Not a check: it feeds docs/dosvidaniya-room-audit.md.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/room-stats.ts
 */
import { MOTR } from '../../montyotr/src/motr';
import { ROOM_COUNT } from '../../montyotr/src/data';
import type { MontyData } from '../../montyotr/src/montydata';
import { regionAt } from '../../montyotr/src/regions';
import { PLAY_COLS, PLAY_ROWS } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { WORLD_REGIONS } from '../src/regions';

// ---- what is measured ---------------------------------------------------------------------------------------

type Move = 'walk' | 'fly' | 'up-down';
interface Creature {
  move: Move;
  /** Patrol length in cells. */
  cells: number;
  /** Pixels per step. */
  speed: number;
  /** The floor row it walks (its feet's row), or -1 for one in the air or moving vertically. */
  floor: number;
}
interface Ledge { row: number; from: number; to: number }
interface Stats {
  id: number;
  name: string;
  creatures: Creature[];
  ledges: Ledge[];
  /** Distinct rows of ledges (the room's levels). */
  levels: number;
  /** Ledges that are not the room's bottom level. */
  upper: number;
  ropes: number;
  ropeCells: number;
  hazardCells: number;
  solidPct: number;
  coins: number;
  items: number;
  crushers: number;
  teleporters: number;
  decor: number;
  /** Mechanisms by name (a lift, a tunnel, ice...). */
  mechanisms: string[];
  /** A room effect: an item changes the room (a gate, a guard). */
  gated: boolean;
  /** What the room is about. */
  one: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The tile classes (0 nothing, 1 solid, 2 a floor, 3 a rope, 4 deadly) of a room's playfield. */
function classes(data: MontyData, id: number): Uint8Array {
  const def = data.roomDef(id);
  return Uint8Array.from(def.cells, (code) => {
    const tile = code === 0 ? undefined : def.tiles[code - 1];
    return tile === undefined ? 0 : data.tileProperty(tile);
  });
}

const cellAt = (cls: Uint8Array, row: number, col: number) => (row < 0 || row >= PLAY_ROWS || col < 0 || col >= PLAY_COLS ? 1 : cls[row * PLAY_COLS + col] ?? 0);
const isFloor = (c: number) => c === 1 || c === 2;

/** The ledges: runs of at least three cells of floor with nothing solid on them, a row of cells to stand on. */
function findLedges(cls: Uint8Array): Ledge[] {
  const out: Ledge[] = [];
  for (let row = 0; row < PLAY_ROWS; row++) {
    let start = -1;
    for (let col = 0; col <= PLAY_COLS; col++) {
      const stand = col < PLAY_COLS && isFloor(cellAt(cls, row, col)) && !isFloor(cellAt(cls, row - 1, col));
      if (stand && start < 0) start = col;
      if (!stand && start >= 0) {
        if (col - start >= 3) out.push({ row, from: start, to: col - 1 });
        start = -1;
      }
    }
  }
  return out;
}

/** Rope or ladder pieces: connected groups of rope cells, and the cells they hold. */
function findRopes(cls: Uint8Array): { count: number; cells: number } {
  const seen = new Set<number>();
  let count = 0, cells = 0;
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] !== 3 || seen.has(i)) continue;
    count++;
    const stack = [i];
    seen.add(i);
    for (let at = stack.pop(); at !== undefined; at = stack.pop()) {
      cells++;
      const row = Math.floor(at / PLAY_COLS), col = at % PLAY_COLS;
      for (const [r, c] of [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]] as const) {
        const n = r * PLAY_COLS + c;
        if (r < 0 || r >= PLAY_ROWS || c < 0 || c >= PLAY_COLS || cls[n] !== 3 || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return { count, cells };
}

/** The creatures of a room, from its enemy records (7 bytes: colour, x, y, direction, type, speed, range). */
function findCreatures(data: MontyData, id: number, cls: Uint8Array): Creature[] {
  const rec = data.enemyRecords(id);
  const out: Creature[] = [];
  for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff; i += 7) {
    const x = rec[i + 1] ?? 0, y = rec[i + 2] ?? 0, dir = rec[i + 3] ?? 0, speed = rec[i + 5] ?? 0, range = rec[i + 6] ?? 0;
    const col = Math.round(x / 8), row = Math.round((0xf9 - y - 0x32) / 8) - 3;
    if (dir === 3 || dir === 4) {
      out.push({ move: 'up-down', cells: Math.round((range * speed) / 8), speed, floor: -1 });
      continue;
    }
    const cells = Math.round((range * speed) / 16);
    const from = dir === 1 ? col - cells : col;
    let supported = false;
    for (let c = from; c <= from + cells + 1 && !supported; c++) supported = isFloor(cellAt(cls, row + 2, c));
    out.push({ move: supported ? 'walk' : 'fly', cells, speed, floor: supported ? row + 2 : -1 });
  }
  return out;
}

/** The mechanisms the data names in a room, by kind. */
function mechanismsOf(data: MontyData, id: number): string[] {
  const named: readonly (readonly [string, readonly { room: number }[]])[] = [
    ['lift', data.lifts], ['escalator', data.escalators], ['icicle', data.icicles], ['tunnel', data.tunnels], ['cracking ice', data.cracks],
    ['timed strike', data.pulses], ['dragon', data.dragons], ['rising lava', data.risingLava], ['flight', data.flights], ['boulder', data.rollers],
    ['vine', data.vines], ['cable car', data.cableCars], ['float', data.floats], ['skewer', data.skewers],
  ];
  const out = named.flatMap(([name, specs]) => specs.filter((s) => s.room === id).map(() => name));
  if (data.swimRooms.includes(id)) out.push('swim');
  if (data.risingCloud?.room === id) out.push('cloud');
  if (data.jetpackRooms.includes(id)) out.push('jetpack');
  if (data.c5?.rooms.includes(id)) out.push('c5 street');
  if (data.flashingBases?.room === id) out.push('flashing bases');
  if (data.bollard?.room === id) out.push('bollard');
  return out;
}

function table(bytes: Uint8Array, stride: number, room: number): number {
  let n = 0;
  for (let i = 0; i + stride <= bytes.length; i += stride) if (bytes[i] === room) n++;
  return n;
}

function measure(data: MontyData, id: number): Stats {
  const cls = classes(data, id);
  const ledges = findLedges(cls);
  const rows = [...new Set(ledges.map((l) => l.row))];
  const bottom = Math.max(-1, ...rows);
  const ropes = findRopes(cls);
  const creatures = findCreatures(data, id, cls);
  const mechanisms = mechanismsOf(data, id);
  const crushers = table(data.piledriverCfg, 5, id);
  const teleporters = table(data.teleporterCfg, 5, id);
  if (crushers > 0) mechanisms.push(crushers > 1 ? 'crusher pair' : 'crusher');
  if (teleporters > 0) mechanisms.push('teleporter');
  const hazardCells = cls.filter((c) => c === 4).length;
  const items = table(data.specialItems, 4, id);
  const gated = data.roomEffects.some((e) => e.room === id);
  const vertical = creatures.some((c) => c.move === 'up-down');
  const upper = ledges.filter((l) => l.row !== bottom).length;
  const climb = ropes.cells >= 8 || rows.length >= 5;
  let one = 'none';
  const first = mechanisms[0];
  if (first !== undefined) one = first;
  else if (hazardCells >= 8) one = 'hazard crossing';
  else if (gated) one = 'item gate';
  else if (vertical) one = 'vertical creature';
  else if (items > 0 && data.specialItems.length > 0) one = 'item stash';
  else if (climb) one = 'climb';
  const sector = data.sectorNames[data.sectorIdx[id] ?? 0];
  return {
    id, name: sector?.text ?? `$${id.toString(16)}`, creatures, ledges, levels: rows.length, upper, ropes: ropes.count, ropeCells: ropes.cells,
    hazardCells, solidPct: Math.round((100 * cls.filter(isFloor).length) / cls.length), coins: table(data.coinTable, 3, id), items, crushers, teleporters,
    decor: (() => { let n = 0; for (let i = 0; i + 4 <= data.decorRooms.length; i += 4) if (data.decorRooms[i] === id) n++; return n; })(),
    mechanisms, gated, one,
  };
}

// ---- summaries -----------------------------------------------------------------------------------------------

function quantile(values: readonly number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const at = clamp((s.length - 1) * q, 0, s.length - 1), lo = Math.floor(at), hi = Math.ceil(at);
  return (s[lo] ?? 0) + ((s[hi] ?? 0) - (s[lo] ?? 0)) * (at - lo);
}
const summary = (values: readonly number[]) => `${quantile(values, 0.5)} (${quantile(values, 0.25)}-${quantile(values, 0.75)}; ${Math.min(...values)}-${Math.max(...values)})`;

const hasUpDown = (s: Stats) => s.creatures.some((c) => c.move === 'up-down');
const horizontalOnly = (s: Stats) => s.creatures.length > 0 && s.creatures.every((c) => c.move === 'walk');
const describe = (cs: readonly Creature[]) => {
  const parts = cs.map((c) => (c.move === 'up-down' ? `up/down ${c.cells}` : c.move === 'fly' ? `air ${c.cells}` : `walk ${c.cells}@${c.floor}`));
  return parts.join(', ') || '-';
};

const mechs = (s: Stats) => {
  const m = new Map<string, number>();
  for (const k of s.mechanisms) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(', ') || '-';
};

function perRoom(rows: readonly Stats[], withName = true): void {
  console.log(`| room | ${withName ? 'name | ' : ''}creatures (kind length@floor row) | ledges | levels | ropes | hazard | solid% | coins | items | mechanisms | one thing |`);
  console.log(`|---|${withName ? '---|' : ''}---|---|---|---|---|---|---|---|---|---|`);
  for (const s of rows) {
    console.log(`| $${s.id.toString(16)} | ${withName ? `${s.name} | ` : ''}${describe(s.creatures)} | ${s.ledges.length} | ${s.levels} | ${s.ropes} | ${s.hazardCells} | ${s.solidPct} | ${s.coins} | ${s.items} | ${mechs(s)} | ${s.one} |`);
  }
}

// ---- Monty on the Run's recipe -------------------------------------------------------------------------------

const SEWER = 4;
const motr = Array.from({ length: ROOM_COUNT }, (_, id) => measure(MOTR, id));
const isSewer = (s: Stats) => MOTR.sectorIdx[s.id] === SEWER;
const recipe = motr.filter((s) => !isSewer(s) && !s.mechanisms.some((m) => m === 'c5 street' || m === 'jetpack'));
const sewers = motr.filter(isSewer);

console.log('# Monty on the Run: every room\n');
perRoom(motr);
console.log(`\nSewers (set aside): ${sewers.length} rooms; C5 street and jetpack rooms also set aside from the recipe: ${motr.length - sewers.length - recipe.length}. Recipe rooms: ${recipe.length}.\n`);

console.log('## The recipe (median (quartiles; min-max))\n');
const stat = (label: string, f: (s: Stats) => number) => console.log(`| ${label} | ${summary(recipe.map(f))} | ${summary(sewers.map(f))} |`);
console.log('| per room | recipe rooms | sewers |\n|---|---|---|');
stat('creatures', (s) => s.creatures.length);
stat('walkers', (s) => s.creatures.filter((c) => c.move === 'walk').length);
stat('up-down creatures', (s) => s.creatures.filter((c) => c.move === 'up-down').length);
stat('air creatures', (s) => s.creatures.filter((c) => c.move === 'fly').length);
stat('ledges (3+ cells)', (s) => s.ledges.length);
stat('upper ledges (not the bottom level)', (s) => s.upper);
stat('levels (distinct ledge rows)', (s) => s.levels);
stat('ropes and ladders', (s) => s.ropes);
stat('rope cells', (s) => s.ropeCells);
stat('hazard cells', (s) => s.hazardCells);
stat('solid %', (s) => s.solidPct);
stat('coins', (s) => s.coins);
stat('special items', (s) => s.items);
stat('mechanisms (crushers, lifts, teleporters...)', (s) => s.mechanisms.length);
stat('decorations', (s) => s.decor);
const walkerCells = recipe.flatMap((s) => s.creatures.filter((c) => c.move === 'walk').map((c) => c.cells));
const verticalCells = recipe.flatMap((s) => s.creatures.filter((c) => c.move === 'up-down').map((c) => c.cells));
console.log(`\nWalker patrol length (cells): ${summary(walkerCells)}; vertical patrol length: ${summary(verticalCells)}`);
console.log(`Creature speeds (px a step): ${summary(recipe.flatMap((s) => s.creatures.map((c) => c.speed)))}`);
const share = (f: (s: Stats) => boolean) => `${recipe.filter(f).length}/${recipe.length}`;
console.log(`Rooms with: a vertical creature ${share(hasUpDown)}; walkers only ${share(horizontalOnly)}; a mechanism ${share((s) => s.mechanisms.length > 0)}; 2+ levels ${share((s) => s.levels >= 2)}; 3+ levels ${share((s) => s.levels >= 3)}; a rope ${share((s) => s.ropes > 0)}; hazard ${share((s) => s.hazardCells > 0)}; an item ${share((s) => s.items > 0)}; coins ${share((s) => s.coins > 0)}; no creature ${share((s) => s.creatures.length === 0)}; a creature on 2+ different floors ${share((s) => new Set(s.creatures.map((c) => c.floor)).size >= 2)}.`);

const tally = (rows: readonly Stats[], f: (s: Stats) => readonly string[]) => {
  const m = new Map<string, number>();
  for (const s of rows) for (const k of new Set(f(s))) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
};
console.log(`\nOne thing (recipe rooms): ${tally(recipe, (s) => [s.one])}`);
console.log(`Every mechanism present (recipe rooms): ${tally(recipe, (s) => s.mechanisms)}`);

// ---- Do Svidaniya Monty, flagged against it -------------------------------------------------------------------

const thinLevels = Math.floor(quantile(recipe.map((s) => s.levels), 0.1)), thinLedges = Math.floor(quantile(recipe.map((s) => s.ledges.length), 0.1));
console.log(`\n# Do Svidaniya Monty\n\nThin = fewer levels than ${thinLevels} or fewer ledges than ${thinLedges} (MOTR's lowest tenth). Light = one creature or none and no mechanism. H-only = every creature a horizontal walker and no mechanism. Repeat = the same one thing as the room before.\n`);

interface Flagged extends Stats { flags: string[] }
function flag(s: Stats): Flagged {
  const flags: string[] = [];
  if (s.levels < thinLevels || s.ledges.length < thinLedges) flags.push('thin');
  if (s.creatures.length <= 1 && s.mechanisms.length === 0) flags.push('light');
  if (horizontalOnly(s) && s.mechanisms.length === 0 && !s.gated && s.items === 0 && s.creatures.length <= 3) flags.push('walkers and run');
  if (horizontalOnly(s) && s.mechanisms.length === 0) flags.push('h-only');
  if (s.one === 'none') flags.push('no one thing');
  return { ...s, flags };
}

const world = Array.from({ length: WORLD.exitGrid.image.length }, (_, cell) => WORLD.exitGrid.image[cell] ?? 0xff)
  .map((id, cell) => ({ id, row: Math.floor(cell / WORLD.exitGrid.cols), col: cell % WORLD.exitGrid.cols }))
  .filter((c) => c.id !== 0xff);
const byRegion = WORLD_REGIONS.map((r) => ({ r, rooms: world.filter((c) => regionAt(WORLD_REGIONS, c.row, c.col)?.name === r.name).sort((a, b) => a.id - b.id).map((c) => flag(measure(WORLD, c.id))) }));

const totals = { rooms: 0, thin: 0, light: 0, repeat: 0, walkers: 0, none: 0 };
for (const { r, rooms } of byRegion) {
  console.log(`\n## ${r.name}\n`);
  console.log('| room | name | creatures | ledges | levels | ropes | hazard | coins | items | mechanisms | one thing | flags |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  let previous = '';
  for (const s of rooms) {
    const run = s.one === previous && s.one !== 'none' ? ' (repeat)' : '';
    if (run) s.flags.push('repeat');
    previous = s.one;
    console.log(`| $${s.id.toString(16)} | ${s.name} | ${describe(s.creatures)} | ${s.ledges.length} | ${s.levels} | ${s.ropes} | ${s.hazardCells} | ${s.coins} | ${s.items} | ${mechs(s)} | ${s.one}${run} | ${s.flags.join(', ') || '-'} |`);
    totals.rooms++;
    if (s.flags.includes('thin')) totals.thin++;
    if (s.flags.includes('light')) totals.light++;
    if (s.flags.includes('repeat')) totals.repeat++;
    if (s.flags.includes('walkers and run')) totals.walkers++;
    if (s.flags.includes('no one thing')) totals.none++;
  }
  const all = rooms;
  console.log(`\nMedians: creatures ${quantile(all.map((s) => s.creatures.length), 0.5)}, ledges ${quantile(all.map((s) => s.ledges.length), 0.5)}, levels ${quantile(all.map((s) => s.levels), 0.5)}; with a vertical creature ${all.filter(hasUpDown).length}/${all.length}; with a mechanism ${all.filter((s) => s.mechanisms.length > 0).length}/${all.length}. One thing: ${tally(all, (s) => [s.one])}.`);
}
console.log(`\nWorld totals: ${totals.rooms} rooms; thin ${totals.thin}; light ${totals.light}; repeat ${totals.repeat}; walkers and run ${totals.walkers}; no one thing ${totals.none}.`);
const all = byRegion.flatMap((g) => g.rooms);
console.log(`World medians: creatures ${quantile(all.map((s) => s.creatures.length), 0.5)}, ledges ${quantile(all.map((s) => s.ledges.length), 0.5)}, levels ${quantile(all.map((s) => s.levels), 0.5)}, upper ledges ${quantile(all.map((s) => s.upper), 0.5)}, ropes ${quantile(all.map((s) => s.ropes), 0.5)}, coins ${quantile(all.map((s) => s.coins), 0.5)}; vertical creature in ${all.filter(hasUpDown).length}; walkers-only in ${all.filter(horizontalOnly).length}; mechanisms in ${all.filter((s) => s.mechanisms.length > 0).length}.`);
