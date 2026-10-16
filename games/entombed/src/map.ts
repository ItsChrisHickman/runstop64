import type { Surface } from 'c64kit';
import { isNumber, isNumbers, isRecord, isRecordOf, isString, isStrings } from '../../shared/guards';
import { COL, type Box, type Found, type PauseMap } from '../../shared/native/pause';
import * as engine from './gen/engine';
import { rd, wr } from '../../shared/native/cpu';

/**
 * Entombed's map, for the pause screen. Each of the tomb's seven floors is a grid
 * of corridors, stored as two tables: the east-west rows and the north-south
 * columns, one byte per cell (0: no corridor; else which corridor picture is
 * drawn there). Pendragon's place is ($217E, $217F) on floor $37F7, along the axis
 * $2181 (1: east-west) at a distance $180A:$1809 (0-330) through the cell: the
 * junction is at 144 (where he turns), and the game moves to the next cell when the
 * distance wraps, half a cell from either junction. All seven floors are drawn at once
 * (`tomb`: one scale, each by its number), dark until visited; chambers and stairs show
 * once found; any junction he's been to on any floor is a place to travel to (Chris: the
 * map is there so the hallways needn't be walked again). At 8 pixels a cell all seven fit.
 */
const FLOORS: Record<number, { w: number; h: number; rows: number; cols: number }> = {
  1: { w: 6, h: 6, rows: 0x1606, cols: 0x162a },
  2: { w: 9, h: 7, rows: 0x1648, cols: 0x166c },
  3: { w: 7, h: 3, rows: 0x1696, cols: 0x169d },
  4: { w: 7, h: 6, rows: 0x16a9, cols: 0x16d0 },
  5: { w: 7, h: 6, rows: 0x170e, cols: 0x1728 },
  6: { w: 15, h: 5, rows: 0x1744, cols: 0x1771 },
  7: { w: 7, h: 4, rows: 0x17b7, cols: 0x17be },
};
/**
 * The tables hold only the rows and columns the floor has: a row's line is found at
 * rows + y * w and a column's at cols + x * h, so a row (or column) number past the end of
 * its table would read the next table (the game never goes there).
 */
const TABLE_END: Record<number, number> = { 1: 0x1648, 2: 0x1696, 3: 0x16a9, 4: 0x170e, 5: 0x1744, 6: 0x17b7, 7: 0x17be + 7 * 4 };
const realRows = (f: number) => Math.min(FLOORS[f].h, Math.floor((FLOORS[f].cols - FLOORS[f].rows) / FLOORS[f].w));
const realCols = (f: number) => Math.min(FLOORS[f].w, Math.floor((TABLE_END[f] - FLOORS[f].cols) / FLOORS[f].h));
/** The pictures at a corridor's ends: a wall where the corridor stops halfway to that cell. */
const END_AFTER = 0x7c, END_BEFORE = 0x7f;
const CORRIDORS = 0x60f8; // the corridor code's block is loaded at $6000 (else Pendragon is in a chamber)

interface Seen {
  cells: Record<string, string[]>; // floor -> ["x,y"]
  chambers: Record<string, Record<string, number>>; // floor -> "x,y" -> chamber number
  /** Where each chamber's door is along its corridor (floor -> chamber -> [x, y, axis]), from where he went in. */
  doors?: Record<string, Record<string, Door>>;
  /** Where he was last in the corridors, exactly. */
  lastPlace?: { floor: number; x: number; y: number; axis: number };
  stairs: Record<string, Record<string, 'up' | 'down'>>;
  /** Where he was last (a junction, or the door of the chamber he's in), to mark stairs at both ends. */
  last?: { floor: number; at: string };
  /** Set by travel on the map: the next change of floor isn't stairs. */
  warped?: boolean;
  /** The chambers he's gone through since the corridors, in order (to leave them again). */
  chain?: number[];
}
type Door = [x: number, y: number, axis: number];
const isDoor = (v: unknown): v is Door => isNumbers(v) && v.length === 3;
const isWay = (v: unknown): v is 'up' | 'down' => v === 'up' || v === 'down';
const isPlace = (v: unknown): v is NonNullable<Seen['lastPlace']> => isRecord(v) && isNumber(v.floor) && isNumber(v.x) && isNumber(v.y) && isNumber(v.axis);
const isLast = (v: unknown): v is NonNullable<Seen['last']> => isRecord(v) && isNumber(v.floor) && isString(v.at);
const recordsOf = <T>(item: (x: unknown) => x is T) => (v: unknown): v is Record<string, T> => isRecordOf(v, item);
/**
 * What's been found, read back (it's JSON kept in the browser: each part checked). The containers
 * are found's own (changes to them are kept); a change of a whole part is kept by writing it back
 * into found (observe does, with all of it).
 */
const seen = (f: Found): Seen => ({
  cells: isRecordOf(f.cells, isStrings) ? f.cells : {},
  chambers: isRecordOf(f.chambers, recordsOf(isNumber)) ? f.chambers : {},
  doors: isRecordOf(f.doors, recordsOf(isDoor)) ? f.doors : undefined,
  lastPlace: isPlace(f.lastPlace) ? f.lastPlace : undefined,
  stairs: isRecordOf(f.stairs, recordsOf(isWay)) ? f.stairs : {},
  last: isLast(f.last) ? f.last : undefined,
  warped: typeof f.warped === 'boolean' ? f.warped : undefined,
  chain: isNumbers(f.chain) ? f.chain : undefined,
});
const floorOf = (ram: Uint8Array) => ram[0x37f7];
const inCorridor = (ram: Uint8Array) => (ram[0x6001] | (ram[0x6002] << 8)) === CORRIDORS;
/** Where Pendragon is, in cells (fractional along the corridor he's in). */
const place = (ram: Uint8Array) => {
  const along = ((ram[0x180a] << 8 | ram[0x1809]) - 144) / 331;
  return ram[0x2181] === 1 ? { x: ram[0x217e] + along, y: ram[0x217f] } : { x: ram[0x217e], y: ram[0x217f] + along };
};
/** The junction he's nearest. */
const here = (ram: Uint8Array) => { const p = place(ram); return `${Math.round(p.x)},${Math.round(p.y)}`; };
/** At a junction (not just nearer it than the next): a quarter of a cell or less from it. */
const atJunction = (ram: Uint8Array) => Math.abs(((ram[0x180a] << 8 | ram[0x1809]) - 144) / 331) <= 0.25 || Math.abs(((ram[0x180a] << 8 | ram[0x1809]) - 144) / 331) >= 0.75;
/** The floor's corridors, as the game sees them: the picture in each cell's row and column (0: none). */
export function maze(ram: Uint8Array, f: number) {
  const F = FLOORS[f], R = realRows(f), C = realCols(f);
  const row = (x: number, y: number) => (x >= 0 && x < F.w && y >= 0 && y < R ? ram[F.rows + y * F.w + x] : 0);
  const col = (x: number, y: number) => (y >= 0 && y < F.h && x >= 0 && x < C ? ram[F.cols + x * F.h + y] : 0);
  const end = (v: number) => v === END_AFTER || v === END_BEFORE;
  /** A junction he can stand at: a corridor passes through, not just a wall at its end. */
  const junction = (x: number, y: number) => (row(x, y) !== 0 && !end(row(x, y))) || (col(x, y) !== 0 && !end(col(x, y)));
  // the cells the corridors are in (floor 6 uses three rows of its five, floors 4 and 5 six columns of seven)
  let x0 = F.w, y0 = F.h, x1 = 0, y1 = 0;
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (row(x, y) || col(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const extent = x0 > x1 ? { x: 0, y: 0, w: F.w, h: F.h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  return { F, row, col, end, junction, extent };
}

export const entombedMap = {
  observe(ram, found) {
    const s = seen(found), floor = floorOf(ram);
    if (!FLOORS[floor]) return;
    const corridor = inCorridor(ram), at = corridor ? here(ram) : `${ram[0x217e]},${ram[0x217f]}`;
    // came onto a new floor by stairs (they're in chambers): marked where he left and where he came
    if (s.last && s.last.floor !== floor && !s.warped) {
      const up = floor > s.last.floor;
      (s.stairs[s.last.floor] ??= {})[s.last.at] = up ? 'up' : 'down';
      (s.stairs[floor] ??= {})[at] = up ? 'down' : 'up';
    }
    s.last = { floor, at };
    s.warped = false;
    if (corridor) {
      const list = (s.cells[floor] ??= []);
      const [x, y] = at.split(',').map(Number);
      if (atJunction(ram) && maze(ram, floor).junction(x, y) && !list.includes(at)) list.push(at);
      s.chain = [];
      s.lastPlace = { floor, ...place(ram), axis: ram[0x2181] };
    } else {
      const chain = (s.chain ??= []), n = ram[0x321c];
      if (chain[chain.length - 1] !== n) { if (chain[chain.length - 2] === n) chain.pop(); else chain.push(n); }
      // straight in from the corridors: the door is where he was
      const lp = s.lastPlace;
      if (chain.length === 1 && lp && lp.floor === floor && !s.doors?.[floor]?.[n]) ((s.doors ??= {})[floor] ??= {})[n] = [lp.x, lp.y, lp.axis];
      // in a chamber: its door is where the map has him (the game's own place, as it chose the chamber by)
      (s.chambers[floor] ??= {})[`${ram[0x217e]},${ram[0x217f]}`] = ram[0x321c];
    }
    Object.assign(found, s);
  },
  title: (ram) => `FLOOR ${floorOf(ram)} OF 7`,
  // All seven floors at once, each by its number (his in yellow; one he's not been on dark)
  draw(sf, box, ram, found, blink, _page, font) {
    const T = tomb(box, ram), s = seen(found);
    for (const [f, at] of T.floors) {
      const been = f === floorOf(ram) || !!(s.cells[f]?.length || s.chambers[f] || s.stairs[f]);
      font?.draw(sf, String(f), at.ox - LABEL, at.oy, f === floorOf(ram) ? COL.yellow : been ? COL.lgrey : COL.dgrey);
      drawFloor(sf, at, T.u, ram, found, blink, f);
    }
  },
  // Places to go back to: the junctions he's been to, on any floor.
  places(box, ram, found) {
    const s = seen(found), T = tomb(box, ram), at = here(ram), r = (sizes(T.u).dot >> 1) + 2;
    return [...T.floors].flatMap(([floor, L]) => {
      const M = maze(ram, floor);
      return (s.cells[floor] ?? []).filter((k) => { const [x, y] = k.split(',').map(Number); return M.junction(x, y); }).map((k) => {
        const [x, y] = k.split(',').map(Number);
        return { id: `${floor}:${k}`, x: L.cx(x), y: L.cy(y), r, here: floor === floorOf(ram) && k === at && inCorridor(ram) };
      });
    });
  },
  // Going to a junction: as the game itself puts him back in the corridors (leaving a chamber, or a new floor).
  go(id, ram, found) {
    const [floor, x, y] = id.split(/[:,]/).map(Number), F = FLOORS[floor];
    if (!F) return false;
    const M = maze(ram, floor);
    if (!M.junction(x, y)) return false; // (a wall at a corridor's end, from an older map)
    if (!inCorridor(ram) && !leaveChambers(ram, seen(found).chain)) return false;
    Object.assign(found, { chain: [], warped: true });
    // The sprites shown, as the corridors' setup ($6003, run by leaving a chamber) left them: the
    // game's own ways back into the corridors don't turn the screen off after it, so the whip
    // (sprite 3) stays on; $C1A1 below turns them all off and $C1C9 only Pendragon back on.
    const shown = rd(0xd015);
    engine.r_c1a1(); // (screen off)
    ram[0x37f7] = floor; ram[0x17de] = F.w; ram[0x17df] = F.h;
    ram[0x2366] = 0; ram[0x17e3] = 0;
    ram[0x217e] = x; ram[0x217f] = y;
    // facing along the corridor through the junction ($2DA1 turns from the other way, and draws it)
    ram[0x2181] = M.row(x, y) && !M.end(M.row(x, y)) ? 2 : 1;
    engine.r_2da1();
    engine.r_9700(); // (the floor's colours)
    engine.r_c1c9(); // (screen on)
    wr(0xd015, rd(0xd015) | shown);
  },
  info(ram, found) {
    const s = seen(found);
    const air = 100 - ram[0x37f6], ankhs = 5 - ram[0x323d];
    const chambers = Object.values(s.chambers).reduce((n, c) => n + Object.keys(c).length, 0);
    // how much of the tomb he's seen: junctions, of all on the seven floors
    let all = 0, been = 0;
    for (let f = 1; f <= 7; f++) {
      const M = maze(ram, f), cells = new Set(s.cells[f] ?? []);
      for (let y = 0; y < M.F.h; y++) for (let x = 0; x < M.F.w; x++) if (M.junction(x, y)) { all++; if (cells.has(`${x},${y}`)) been++; }
    }
    return [`AIR    ${String(air).padStart(3)}%`, `ANKHS    ${ankhs}`, `CHAMBERS ${chambers}`, `SEEN ${been}/${all}`];
  },
  legend: [{ colour: COL.lblue, text: 'CHAMBER' }, { colour: COL.green, text: 'STAIRS' }],
} satisfies PauseMap;

/**
 * Out of the chambers, as the game would have left them: each chamber's code is swapped
 * into $6000 from where it's kept ($15B6, by the chamber number in $321C), over the block
 * before it (chambers lead into chambers), and the blocks overlap where they're kept, so
 * the swaps are undone newest first: the current chamber's, then that of each block that
 * comes back (known by its first instruction, a jump that's different in each), until the
 * corridors' block is back. The chambers' graphics swap with the corridors' ($10A8) for
 * some chambers: they're swapped back if they're out.
 */
function leaveChambers(ram: Uint8Array, chain: number[] = []) {
  const slotOf = (n: number) => ram[0x37c0 + (n - 1) * 2] | (ram[0x37c1 + (n - 1) * 2] << 8);
  const corridorGfx = (at: number) => GFX_PRINT.every(([o, v]) => ram[at + o] === v);
  const now = ram[0x321c], undone: number[] = [];
  // As the game leaves one: the graphics swapped back if they're out ($10A8, which first
  // stops the raster interrupt and maps the I/O chips out, $0DFF: the blocks are kept under
  // them), then the code; the last swap ($15B6) starts the interrupt again.
  if (!corridorGfx(0x3800) && corridorGfx(0xb800)) engine.r_10a8(); else engine.r_0dff();
  const swap = (n: number) => { ram[0x01] = 0x30; ram[0x321c] = n; engine.r_15b6(); undone.push(n); };
  if (chain.length && chain[chain.length - 1] === now) {
    // the way he came, newest first
    for (let i = chain.length - 1; i >= 0; i--) swap(chain[i]);
  } else {
    // (a save from before the way was kept) the current chamber, then each block that comes back
    let n: number | undefined = now;
    for (let i = 0; i < 8 && n !== undefined && !inCorridor(ram); i++) {
      swap(n);
      const home = BLOCK_HOMES[ram[0x6001] | (ram[0x6002] << 8)];
      n = home === undefined ? undefined : [...Array(25).keys()].map((k) => k + 1).find((k) => slotOf(k) === home);
    }
  }
  if (!inCorridor(ram)) { // couldn't: put it all back as it was
    for (let i = undone.length - 1; i >= 0; i--) { ram[0x01] = 0x30; ram[0x321c] = undone[i]; engine.r_15b6(); }
    ram[0x321c] = now;
    if (!corridorGfx(0x3800) && !corridorGfx(0xb800)) { /* (unchanged) */ }
    return false;
  }
  ram[0x321c] = undone[undone.length - 1];
  ram[0x3231] = 0;
  return true;
}
/** Each chamber block's first jump, and where it's kept (from the game as it starts). */
const BLOCK_HOMES: Record<number, number> = {
  0x610b: 0xc200, 0x6135: 0xc440, 0x6122: 0xc940, 0x613b: 0xcb60, 0x611d: 0xcec0, 0x614c: 0xd0f0, 0x612c: 0xd580,
  0x612f: 0xd850, 0x6160: 0xdaf0, 0x6178: 0xdf30, 0x6145: 0xe300, 0x617a: 0xe6f0, 0x6143: 0xec70, 0x6139: 0xf090,
  0x6138: 0xf290, 0x6126: 0xf5e0, 0x60fc: 0xf7a0, 0x619a: 0xfa90,
};
/** A few bytes of the corridors' graphics at $3800 (the chambers' differ there). */
const GFX_PRINT: [number, number][] = [[0x4a, 0xa0], [0x6f, 0x5f], [0x94, 0xaa], [0x128, 0xa1], [0x172, 0xaa], [0x197, 0x15], [0x1e1, 0xae], [0x206, 0xd5]];

/** One floor's map, where `tomb` put it: its corridors (lit where he's been), chambers and stairs found, and where he is. */
function drawFloor(sf: Surface, L: FloorAt, u: number, ram: Uint8Array, found: Found, blink: boolean, floor: number) {
  const s = seen(found), { cx, cy } = L;
  const { F, row, col, end, junction } = maze(ram, floor);
  const visited = new Set(s.cells[floor] ?? []);
  const lit = (x: number, y: number) => visited.has(`${x},${y}`);
  const { dot: d, line: t } = sizes(u);
  // Between neighbours in a row or column: a corridor, or (to a wall) half of one.
  const link = (a: number, b: number, from: [number, number], to: [number, number], horizontal: boolean) => {
    if (!a || !b || a === END_AFTER || b === END_BEFORE) return;
    const half = end(a) || end(b), [x0, y0] = end(a) ? to : from, [x1, y1] = end(a) ? from : to;
    const colour = lit(x0, y0) && (half || lit(x1, y1)) ? COL.yellow : COL.dgrey;
    const ex = half ? (cx(x0) + cx(x1)) >> 1 : cx(x1), ey = half ? (cy(y0) + cy(y1)) >> 1 : cy(y1);
    if (horizontal) hline(sf, cx(x0), ex, cy(y0), t, colour); else vline(sf, cx(x0), cy(y0), ey, t, colour);
  };
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
    link(row(x, y), row(x + 1, y), [x, y], [x + 1, y], true);
    link(col(x, y), col(x, y + 1), [x, y], [x, y + 1], false);
  }
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (junction(x, y)) dot(sf, cx(x), cy(y), d, lit(x, y) ? COL.yellow : COL.dgrey);
  // Chambers: a room beside the corridor where its door is (off to the side, joined to it)
  const doors = s.doors?.[floor] ?? {}, size = d;
  for (const [x, y, axis] of Object.values(doors)) {
    const px = Math.round(cx(x)), py = Math.round(cy(y));
    const off = Math.max((d >> 1) + (size >> 1) + 1, Math.round(u * 0.4));
    const [rx, ry] = axis === 1 ? [px, py - off] : [px + off, py];
    if (axis === 1) vline(sf, px, ry, py, 1, COL.lblue); else hline(sf, px, rx, py, 1, COL.lblue);
    dot(sf, rx, ry, size, COL.lblue);
  }
  for (const [at, n] of Object.entries(s.chambers[floor] ?? {})) {
    if (doors[n]) continue; // (found before doors were kept: at the cell)
    const [x, y] = at.split(',').map(Number);
    dot(sf, cx(x) + (d >> 1) + (size >> 1) + 1, cy(y) - (d >> 1) - (size >> 1) - 1, size, COL.lblue);
  }
  // Stairs: an arrow in place of the junction's square
  for (const [at, dir] of Object.entries(s.stairs[floor] ?? {})) {
    const [x, y] = at.split(',').map(Number);
    dot(sf, cx(x), cy(y), d, COL.black);
    arrow(sf, cx(x), cy(y), d, dir === 'up', COL.green);
  }
  if (blink && floor === floorOf(ram)) {
    const p = inCorridor(ram) ? place(ram) : { x: ram[0x217e], y: ram[0x217f] };
    dot(sf, Math.round(cx(p.x)), Math.round(cy(p.y)), d + 2, COL.white);
  }
}

/** Where a floor is drawn: its cells' middles (fractional places too), and its top left. */
interface FloorAt { ox: number; oy: number; cx: (x: number) => number; cy: (y: number) => number }
/** Room for a floor's number, left of it, and between floors. */
const LABEL = 9, GAP = 6;
/**
 * The seven floors laid out on the map in reading order, as many to a row as fit, all at one
 * scale (`u`, a cell's size): the biggest at which they fit the box (out to its edges' tap margin
 * sideways). Only the cells the corridors are in are drawn (`extent`).
 */
function tomb(box: Box, ram: Uint8Array) {
  const ext = [1, 2, 3, 4, 5, 6, 7].map((f) => ({ f, e: maze(ram, f).extent }));
  const width = box.w + 12;
  const rowsAt = (u: number) => {
    const rows: (typeof ext)[] = [[]];
    let w = 0;
    for (const x of ext) {
      const need = LABEL + x.e.w * u;
      if (rows[rows.length - 1].length && w + GAP + need > width) { rows.push([]); w = 0; }
      w += (rows[rows.length - 1].length ? GAP : 0) + need;
      rows[rows.length - 1].push(x);
    }
    return rows;
  };
  const rowW = (r: typeof ext, u: number) => r.reduce((n, x) => n + LABEL + x.e.w * u, GAP * (r.length - 1));
  const rowH = (r: typeof ext, u: number) => Math.max(...r.map((x) => x.e.h * u));
  const height = (u: number) => rowsAt(u).reduce((n, r) => n + rowH(r, u), GAP * (rowsAt(u).length - 1));
  let u = 24;
  while (u > 4 && height(u) > box.h) u--;
  const floors = new Map<number, FloorAt>();
  let y = box.y + ((box.h - height(u)) >> 1);
  for (const r of rowsAt(u)) {
    let x = box.x + ((box.w - rowW(r, u)) >> 1);
    for (const { f, e } of r) {
      const ox = x + LABEL, oy = y;
      floors.set(f, { ox, oy, cx: (cx) => ox + (cx - e.x) * u + (u >> 1), cy: (cy) => oy + (cy - e.y) * u + (u >> 1) });
      x = ox + e.w * u + GAP;
    }
    y += rowH(r, u) + GAP;
  }
  return { u, floors };
}
/** A junction's square and a corridor's width for a cell (both odd, so they share a middle). */
const sizes = (cell: number) => ({ dot: Math.max(5, Math.round(cell * 0.6)) | 1, line: Math.max(1, Math.round(cell * 0.15)) | 1 });

function hline(s: Surface, x0: number, x1: number, y: number, t: number, c: number) { s.fillRect(Math.min(x0, x1), y - (t >> 1), Math.abs(x1 - x0) + 1, t, c); }
function vline(s: Surface, x: number, y0: number, y1: number, t: number, c: number) { s.fillRect(x - (t >> 1), Math.min(y0, y1), t, Math.abs(y1 - y0) + 1, c); }
function dot(s: Surface, x: number, y: number, size: number, c: number) { s.fillRect(x - (size >> 1), y - (size >> 1), size, size, c); }
/** An arrow filling a square of `size`, pointing up or down. */
function arrow(s: Surface, x: number, y: number, size: number, up: boolean, c: number) {
  for (let i = 0; i < size; i++) {
    const w = (up ? i : size - 1 - i) >> 1;
    s.fillRect(x - w, y - (size >> 1) + i, w * 2 + 1, 1, c);
  }
}
