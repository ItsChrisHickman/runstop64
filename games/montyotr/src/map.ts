import type { Surface } from 'c64kit';
import { COL, foundCodec, S, shimmerColour, type Box, type MapPlace, type PauseMap } from '../../shared/native/pause';
import { cellOf, sectorIndex, sectorName, type MontyData } from './montydata';
import type { Game } from './game';
import { roomProgress } from './items';
import { regionAt } from './regions';
import { c5Arrive, c5LastCell, c5Street } from './mechanisms';
import type { MontySave } from './save';

/**
 * Monty's map for the shared pause screen (games/shared/frontend.ts): the whole
 * world as the original lays it out (23 × 6 screens), every room shown, dark
 * grey until visited, then its area's colour; rooms with everything collected
 * shimmer in the coin colours; Monty's room flashes. Under it, the picked
 * room's name and what's left there, the freedom kit and the key items found.
 * Places to go back to: every room visited, arriving where Monty first came in,
 * with the original teleport effect. The C5 street's rooms too, each one as the
 * C5 came into it furthest along the drive (its stage, speed, direction, a jump
 * under way), so a crash can be tried again from any room reached. Not the
 * ending ($30, the boat to France). In the original, driving out of the street
 * puts it and the rooms before it behind him for good (room $33's cell off the
 * grid: nothing leads back east); travel takes him back across it with the
 * street as the game has it on that side (`go`, mechanisms.ts `c5Street`): before
 * it and in it, as before the drive (so it's driven again as ever), after it, as
 * the drive leaves it. The map shows the world as travel has it: $33 always on it.
 *
 * The map reads everything of the game it shows from the Game's data (`g.data`: the exit grid, whatever its size, the
 * sectors and their colours, the kit, the key items, the cakes); a wide grid is drawn in smaller cells to fit the box. A world in
 * regions (Do Svidaniya Monty's countries, `data.regions`) is drawn whole in bigger cells and scrolls between them: the view
 * shows the picked room's country (Monty's until one is picked), and travel goes to any room visited, whichever country.
 * The cells are the exit grid as the game has it, so rooms a rebuild cut are not on it, and a kept entry for a room no
 * longer in its cell is no place to go.
 *
 * In both modes, runstop64's rooms (data/runstop64-rooms.ts) are on the map too, in their own
 * colour (RUNSTOP64 in the legend), and travel goes to them like any other; they aren't
 * counted in the original's rooms.
 */
/** Where Monty came into a room: x2, y, mapRow, exitCol; a C5 room's entry also has the C5's as it came in (C5State, in order: fallStage, speed, dir, bounce). */
const entry = S.union(S.tuple(S.number, S.number, S.number, S.number), S.tuple(S.number, S.number, S.number, S.number, S.number, S.number, S.number, S.number));
type Entry = S.Infer<typeof entry>;
/** What the map keeps of the player's progress: where Monty came into each room. */
const found = S.object({ rooms: S.record(entry) });
export type MontyFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ rooms: {} }));

/** What NEW GAME+ is called on the pause screen and in the saves' summaries. */
export const PLUS_NAME = 'NEW GAME+';

/** runstop64's rooms, seen (the dev room's lettering). */
const RUNSTOP64_COLOUR = COL.blue;
/** No travel to or save in the ending's room (Monty on the Run's $30: the completion's, not on the grid). */
export const noTravel = (data: MontyData, id: number) => data.untravellable.includes(id);
/** A cell of the map, in pixels at most (a wider grid than the box takes gets smaller ones). */
const CELL = 8;

/**
 * The room in a cell of the exit grid with the street driven or not (room $33's cell; the rest
 * as the game has it now: runstop64's rooms there while they're open).
 */
const roomIn = (g: Game, row: number, col: number, driven = false) => {
  const street = g.data.c5;
  return street && row === street.lastCell.row && col === street.lastCell.col ? c5LastCell(g.data, street, driven) : g.roomAt(row, col);
};

/**
 * The rooms the game's own ways lead to from a cell: its room's exits (to any neighbouring cell
 * of the exit grid with a room in it, as LookupRoomExitDest allows) and its teleporters (each
 * room's to its fixed destination), and so on from those.
 */
function reachable(data: MontyData, at: (row: number, col: number) => number, from: [row: number, col: number]) {
  const { teleporterCfg, teleporterDests } = data;
  const cols = data.exitGrid.cols;
  const rooms = new Set<number>();
  const cells = [from];
  const seen = new Set<number>();
  for (let next = cells.pop(); next; next = cells.pop()) {
    const [row, col] = next;
    const id = at(row, col);
    if (id === 0xff || seen.has(row * cols + col)) continue;
    seen.add(row * cols + col);
    rooms.add(id);
    cells.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
    for (let t = 0; t * 5 < teleporterCfg.length && teleporterCfg[t * 5] !== 0xff; t++) {
      if (teleporterCfg[t * 5] === id) cells.push([teleporterDests[t * 4 + 3], teleporterDests[t * 4 + 2]]);
    }
  }
  return rooms;
}

/**
 * The rooms after the street: those the game's ways lead to from the room the drive comes out
 * into (west of $33's cell) once it's driven. Driving out takes $33's cell off the grid and
 * then nothing leads back east (in the original too: no exit or teleporter there does, and the
 * C5's own exits, which don't check the grid, only run in the street).
 */
const afterStreet = (g: Game) => {
  const street = g.data.c5;
  return street ? reachable(g.data, (row, col) => roomIn(g, row, col, true), [street.lastCell.row, street.lastCell.col - 1]) : new Set<number>();
};

/** Whether travel goes to a room visited (its entry's cell): any on the map but the ending. */
const canGo = (g: Game, id: number, e: Entry) => !noTravel(g.data, id) && roomIn(g, e[2], e[3]) === id;

/**
 * A room Monty has just come into (Game.onRoomLoaded): where he came in, for travel.
 * True if that's new: a room's first time, or a C5 room reached further along the drive.
 */
export function noteRoom(g: Game, { rooms }: MontyFound) {
  const was = rooms[g.roomId];
  if (!g.c5.active) {
    if (was) return false;
    rooms[g.roomId] = [g.x2, g.y, g.mapRow, g.exitCol];
    return true;
  }
  const a = g.c5Arrival;
  if (was?.length === 8 && was[4] > a.fallStage) return false;
  rooms[g.roomId] = [g.x2, g.y, g.mapRow, g.exitCol, a.fallStage, a.speed, a.dir, a.bounce];
  return true;
}

const visited = (found: MontyFound, id: number) => !!found.rooms[id];

/** The icons of the freedom kit and the key items are 16 wide and 16 high; wrapped, a row of them takes 20 (a gap of 4, so two rows don't crowd). */
const ICON = 16, ICON_ROW = 20;
/** Between the map's cells and what is under them: the gap, the picked room's name (two lines at most) and what is left there, and a gap again. */
const NAMES = 8 + 28 + 4;

/** The largest a cell of a world in regions gets. */
const REGION_CELL = 16;

/**
 * Where the rows under the map's names go: the kit's label and the key items' (their icons 10 under each), and the top of the
 * first. Monty on the Run's: the kit, then the items under it. A game with no kit has the items' rows at the box's foot, and
 * the kit's room goes to the map.
 */
function below(box: Box, data: MontyData) {
  const extra = (iconRows(box, data.progress.keyItems.length) - 1) * ICON_ROW;
  const items = data.kit.length ? box.y + box.h - 22 - extra : box.y + box.h - 10 - ICON - extra;
  return { kit: items - 30, items, top: data.kit.length ? items - 30 : items };
}

/** The cells a game's regions cover together: its world (columns and rows, first and last). */
function worldOf(data: MontyData) {
  const { regions } = data, last = data.exitGrid.rows - 1;
  return {
    from: Math.min(...regions.map((r) => r.from)), to: Math.max(...regions.map((r) => r.to)),
    rowFrom: Math.min(...regions.map((r) => r.rows?.from ?? 0)), rowTo: Math.max(...regions.map((r) => r.rows?.to ?? last)),
  };
}

/** Whether a column of the exit grid has no room in any row. */
function emptyColumn(data: MontyData, col: number): boolean {
  const { image, cols, rows } = data.exitGrid;
  return Array.from({ length: rows }, (_, row) => image[row * cols + col]).every((id) => id === undefined || id === 0xff);
}

/**
 * Where a column of a world in regions starts, in cells from the world's first: its place, and a cell more for each flight before it (a region reached by
 * plane, `MapRegion.flown`: the map leaves a cell of space before its first column, as the journey there is a flight, not one room over; where the grid
 * already leaves the column before it empty, that is the space).
 */
export function columnAt(data: MontyData, col: number): number {
  const world = worldOf(data);
  const flights = new Set(data.regions.filter((r) => r.flown && r.from > world.from && !emptyColumn(data, r.from - 1)).map((r) => r.from));
  let at = col;
  for (const c of flights) if (c <= col) at++;
  return at;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The view of a world in regions follows the pick like a camera (Chris, 2026-11-24: a view that jumped a whole country when the
 * pick crossed a border was confusing): it moves only when the pick comes within `MARGIN` cells of the box's edge (rows: `MARGIN_ROWS`),
 * just far enough, and slides there `SLIDE` pixels a frame. When the pause screen opens it starts on the player's region, centred.
 * `to`: where the view is going (the places are placed there, so a pick is always inside the box); `shown`: where it is drawn now.
 */
interface Camera { to: { x: number; y: number }; shown: { x: number; y: number }; fresh: boolean }
const cameras = new WeakMap<Game, Camera>();
const MARGIN = 2, MARGIN_ROWS = 1, SLIDE = 4;
/** Where the view of `g`'s map is drawn now, and where it is going (pixels into the world), for the tests; none before it is first drawn. */
export function mapView(g: Game): { shown: { x: number; y: number }; to: { x: number; y: number } } | undefined {
  const c = cameras.get(g);
  return c ? { shown: { ...c.shown }, to: { ...c.to } } : undefined;
}
/** Opening the pause screen: the next view starts afresh, on the player. */
function freshCamera(g: Game) {
  const c = cameras.get(g);
  if (c) c.fresh = true;
}
/** Moves `at` (a view's offset along one axis) just enough that the cells `from`..`to` (pixels) are `margin` inside the view `size`, within `lo`..`hi`. */
function follow(at: number, from: number, to: number, margin: number, size: number, lo: number, hi: number): number {
  let v = at;
  if (from - margin < v) v = from - margin;
  if (to + margin > v + size) v = to + margin - size;
  return clamp(v, lo, hi);
}

/**
 * Where the cells are, and the window they're seen through (`view`: cells are drawn only inside it). The whole grid, in cells
 * that fit the box; or, a game with `regions` (a world too wide for the box), the whole world in cells as big as its largest
 * region allows, seen through the camera (above) on `focus` (the picked room's cell, else Monty's): opened on its region centred
 * where the world runs on past the box's sides (Moscow's view takes in Japan; Rio's the Pacific), then following the pick.
 * `draw`: the frame is being drawn (the view slides a step towards where it is going, and is drawn where it is now).
 */
function layout(box: Box, g: Game, focus: readonly [row: number, col: number], draw = false) {
  const { data } = g;
  const top = box.y + 2, spare = below(box, data).top - NAMES - top;
  if (!data.regions.length) {
    const { cols, rows } = data.exitGrid;
    const cell = Math.min(CELL, Math.floor(box.w / cols), Math.floor(spare / rows));
    const ox = box.x + Math.floor((box.w - cols * cell) / 2);
    return { cell, view: { x: ox, y: top, w: cols * cell, h: rows * cell }, at: (row: number, col: number) => ({ x: ox + col * cell, y: top + row * cell }) };
  }
  const world = worldOf(data), rows = world.rowTo - world.rowFrom + 1;
  // (columns as the map lays them out: a flight's gap counts as a column of nothing)
  const x = (col: number) => columnAt(data, col), cols = x(world.to) - x(world.from) + 1;
  const cell = Math.min(REGION_CELL, ...data.regions.map((r) => Math.floor(box.w / (x(r.to) - x(r.from) + 1))),
    ...data.regions.map((r) => Math.floor(spare / (r.rows ? r.rows.to - r.rows.from + 1 : rows))));
  const w = Math.min(box.w, cols * cell), h = Math.min(rows, Math.floor(spare / cell)) * cell;
  const lo = { x: x(world.from) * cell, y: world.rowFrom * cell }, hi = { x: (x(world.to) + 1) * cell - w, y: (world.rowTo + 1) * cell - h };
  let cam = cameras.get(g);
  if (!cam || cam.fresh) {
    // opened: the focus's region centred (sideways to the pixel, the edges' cells cut; up and down in whole rows)
    const region = regionAt(data.regions, focus[0], focus[1]);
    const span = { from: region?.from ?? world.from, to: region?.to ?? world.to, rowFrom: region?.rows?.from ?? world.rowFrom, rowTo: region?.rows?.to ?? world.rowTo };
    const cx = clamp(Math.round((x(span.from) + x(span.to) + 1) * cell / 2 - w / 2), lo.x, hi.x);
    const cy = clamp(Math.round(((span.rowFrom + span.rowTo + 1) / 2 - h / cell / 2)) * cell, lo.y, hi.y);
    cam = { to: { x: cx, y: cy }, shown: { x: cx, y: cy }, fresh: false };
    cameras.set(g, cam);
  }
  // following the focus: just far enough to keep it MARGIN cells inside (up and down in whole rows)
  cam.to.x = follow(cam.to.x, x(focus[1]) * cell, (x(focus[1]) + 1) * cell, MARGIN * cell, w, lo.x, hi.x);
  cam.to.y = follow(cam.to.y, focus[0] * cell, (focus[0] + 1) * cell, MARGIN_ROWS * cell, h, lo.y, hi.y);
  if (draw) for (const k of ['x', 'y'] as const) cam.shown[k] += clamp(cam.to[k] - cam.shown[k], -SLIDE, SLIDE);
  const { x: ox, y: oy } = draw ? cam.shown : cam.to;
  const vx = box.x + Math.floor((box.w - w) / 2);
  return { cell, view: { x: vx, y: top, w, h }, at: (row: number, col: number) => ({ x: vx + x(col) * cell - ox, y: top + row * cell - oy }) };
}

/** The cell the map is scrolled to: the picked room's (where he came into it), else Monty's. */
function focusOf(g: Game, found: MontyFound, pick: string | null | undefined): [row: number, col: number] {
  const e = pick !== null && pick !== undefined && pick !== String(g.roomId) ? found.rooms[pick] : undefined;
  return e ? [e[2], e[3]] : [g.mapRow, g.exitCol];
}

/** The rooms on the map, and how many of them Monty has been in. */
function count(g: Game, found: MontyFound) {
  let all = 0, seen = 0;
  const { cols, rows } = g.data.exitGrid;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const id = roomIn(g, r, c);
    if (id === 0xff || g.data.isExtensionRoom(id)) continue; // (the original's rooms)
    all++;
    if (visited(found, id)) seen++;
  }
  return { all, seen };
}
/** Frames the map has been drawn (the shimmer's step). */
let shimmer = 0;

/** One line of the pause screen's panel (11 characters): the name, and its number right-aligned so the numbers make one column. */
export const statLine = (name: string, value: string) => name.padEnd(6) + value.padStart(5);

/** The progress the pause panel and THE END both show, as label and value (one owner: THE END once re-read the panel's text, and "SNACKS13/13", no space at 10 or more, came out garbled). */
export function progressRows(g: Game, found: MontyFound): (readonly [label: string, value: string])[] {
  const rooms = count(g, found);
  const { keyItems, cakes: allCakes } = g.data.progress;
  const cakes = allCakes.filter((i) => g.siCollected[i]).length;
  const items = keyItems.filter((i) => g.siCollected[i]).length;
  const food = g.data.progress.foodName ?? 'CAKES';
  return [
    // (the lives in HARD only: EASY has none to count)
    ...(g.livesShown ? [['LIVES', String(g.lives)] as const] : []), ['ROOMS', `${rooms.seen}/${rooms.all}`],
    ['ITEMS', `${items}/${keyItems.length}`], [food, `${cakes}/${allCakes.length}`],
  ];
}

export const montyMap = {
  found: FOUND,
  // (rooms are noted as Monty comes into them: noteRoom)
  observe() {},
  opened: freshCamera,
  /** The heading: the name of the region in view (the picked room's, else Monty's: the view follows the pick); a map with no regions (Monty on the Run's) is THE MAP. */
  title(g, _page, pick) {
    const { data } = g;
    const id = pick !== null && pick !== undefined ? Number(pick) : g.roomId;
    const cell = cellOf(data, id) ?? { row: g.mapRow, col: g.exitCol };
    return regionAt(data.regions, cell.row, cell.col)?.name ?? 'THE MAP';
  },
  draw(s, box, g, found, blink, _page, font, pick) {
    const data = g.data;
    const { progress } = data;
    const { at, cell, view } = layout(box, g, focusOf(g, found, pick), true);
    const tick = shimmer++;
    const { cols, rows } = data.exitGrid;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = roomIn(g, r, c);
        if (id === 0xff) continue;
        // (only what the view takes in: rows whole, the cells at its sides cut where the world runs on past them)
        const p = at(r, c), x0 = Math.max(p.x, view.x), x1 = Math.min(p.x + cell - 1, view.x + view.w);
        if (x1 <= x0 || p.y < view.y || p.y + cell > view.y + view.h) continue;
        const here = r === g.mapRow && c === g.exitCol;
        const seen = visited(found, id);
        const colour = here ? (blink ? COL.white : COL.yellow)
          : !seen ? COL.dgrey
          : roomProgress(g, id).complete ? shimmerColour(tick, r + c)
          : data.isExtensionRoom(id) ? RUNSTOP64_COLOUR
          : progress.sectorColours[sectorIndex(data, id)] ?? COL.white;
        s.fillRect(x0, p.y, x1 - x0, cell - 1, colour);
      }
    }
    if (!font) return;
    // the picked room: its name, and what's left there
    const id = pick !== null && pick !== undefined ? Number(pick) : g.roomId;
    let y = view.y + view.h + 8;
    wrap(sectorName(data, id).text.toUpperCase(), 24).slice(0, 2).forEach((line) => { font.draw(s, line, box.x, y, COL.white); y += 10; });
    const p = roomProgress(g, id), left: string[] = [];
    if (p.coinsLeft) left.push(`${p.coinsLeft} COIN${p.coinsLeft > 1 ? 'S' : ''}`);
    if (p.itemsLeft) left.push(`${p.itemsLeft} ITEM${p.itemsLeft > 1 ? 'S' : ''}`);
    const state = p.coins + p.items === 0 ? 'NOTHING TO COLLECT' : left.length ? `${left.join(' AND ')} LEFT` : 'ALL COLLECTED';
    font.draw(s, state, box.x, y, left.length ? COL.lgrey : COL.lgreen);
    // the freedom kit, and the key items (dark until found); a game with none has no row for them
    const under = below(box, data);
    if (data.kit.length) {
      y = under.kit;
      font.draw(s, 'FREEDOM KIT', box.x, y, COL.yellow);
      data.kit.forEach((fk, i) => { const at = iconAt(box, data.kit.length, i); icon(s, g.mem.subarray(0x3800 + fk * 32, 0x3800 + fk * 32 + 32), box.x + at.x, y + 10 + at.y, COL.white); });
    }
    y = under.items;
    if (progress.keyItems.length) {
      font.draw(s, 'ITEMS FOUND', box.x, y, COL.yellow);
      progress.keyItems.forEach((item, i) => { const at = iconAt(box, progress.keyItems.length, i); icon(s, spriteIcon(g, (data.specialItems[item * 4 + 3] + 0x8e) & 0xff), box.x + at.x, y + 10 + at.y, g.siCollected[item] ? COL.white : COL.dgrey); });
    }
  },
  info: (g, found) => progressRows(g, found).map(([label, value]) => statLine(label, value)),
  /** NEW GAME+ (plus.ts), in yellow, the heading's colour. */
  badge: (g) => (g.plus ? { text: PLUS_NAME, colour: COL.yellow } : null),
  legend: (g) => [
    { colour: COL.dgrey, text: 'NOT SEEN' }, { colour: 7, text: 'ALL FOUND' },
    ...(g.extensionOpen ? [{ colour: RUNSTOP64_COLOUR, text: 'RUNSTOP64' }] : []),
  ],
  /**
   * Every room visited, the whole world over, where the view scrolled to `pick` has it (those of countries out of the view
   * too: an arrow goes on to the next country's, and the view follows; a tap at the box's edge picks one just past it).
   */
  places(box: Box, g: Game, found: MontyFound, _page?: number, pick?: string | null): MapPlace[] {
    const { at, cell } = layout(box, g, focusOf(g, found, pick));
    const mid = Math.floor(cell / 2) - 1; // (3 in a cell of 8: the dot's place in it)
    const list = Object.entries(found.rooms)
      .filter(([id, e]) => canGo(g, Number(id), e) && Number(id) !== g.roomId)
      .map(([id, e]) => { const p = at(e[2], e[3]); return { id, x: p.x + mid, y: p.y + mid }; });
    const p = at(g.mapRow, g.exitCol);
    return [{ id: String(g.roomId), x: p.x + mid, y: p.y + mid, here: true }, ...list];
  },
  /**
   * Travel: Monty leaves this room and comes into that one where he did, through the teleport
   * effect, the street as the game has it on that side of it (mechanisms.ts `c5Street`): after
   * it, as the drive out leaves it; before it and in it, as before the drive. Into a C5 room,
   * the C5 then comes as it did, and straight in as the drive does (no teleport effect: the game
   * moves its enemies on through one, so the room wouldn't be as it was when he drove in; the
   * C5's sprites would cover the effect anyway).
   */
  go(id, g, found) {
    const e = found.rooms[id];
    if (!e || !canGo(g, Number(id), e)) return false;
    const driven = afterStreet(g).has(Number(id));
    c5Street(g, driven);
    [g.x2, g.y, g.mapRow, g.exitCol] = e;
    const c5 = e.length === 8;
    if (c5) c5Arrive(g, { fallStage: e[4], speed: e[5], dir: e[6], bounce: e[7] });
    g.montyAction = 0;
    g.falling = 0;
    g.arcIdx = 0;
    g.gameMode = 0;
    g.lift.riding = 0;
    g.pd.ride = 0;
    g.roomExit = 1;
    g.freeze = 1; // (as RoomLoop does at once for a room exit: nothing moves before the room changes)
    g.dissolvePending = c5 ? 0 : 1;
    g.sfx(g.data.sfx.warp);
    return true;
  },
} satisfies PauseMap<Game, MontyFound>;

/** A 16×16 icon from 32 bytes (top-left, top-right, bottom-left, bottom-right characters). */
function icon(s: Surface, bytes: ArrayLike<number>, x: number, y: number, colour: number) {
  for (let q = 0; q < 4; q++) s.drawChar(Array.from({ length: 8 }, (_, i) => bytes[q * 8 + i]), x + (q & 1) * 8, y + (q >> 1) * 8, colour);
}

/** How many icons fit along the box (they are 16 wide, side by side at the closest). */
const iconsPerRow = (box: Box): number => Math.floor(box.w / ICON);

/** How many rows `n` icons take: one, until more than fit along the box (past it are the divider and the panel beyond it). */
const iconRows = (box: Box, n: number): number => Math.max(1, Math.ceil(n / iconsPerRow(box)));

/**
 * Where the `i`th of `n` icons goes from the row's start: 24 apart as in Monty on the Run, closer (down to 16) when more would
 * run past the box; past that over as many rows as it takes, as evenly as they share them (17: nine and eight), each row
 * spread as the one row is.
 */
export function iconAt(box: Box, n: number, i: number): { x: number; y: number } {
  const perRow = Math.ceil(n / iconRows(box, n));
  return { x: (i % perRow) * Math.min(24, Math.floor(box.w / perRow)), y: Math.floor(i / perRow) * ICON_ROW };
}

/** An item's sprite (24×21) cropped to its 16×16 content (left- and bottom-aligned), as an icon's 32 bytes. */
function spriteIcon(g: Game, ptr: number) {
  const src = ptr * 64, out = new Uint8Array(32);
  const row = (r: number) => (g.mem[src + r * 3] << 16) | (g.mem[src + r * 3 + 1] << 8) | g.mem[src + r * 3 + 2];
  let minX = 23, maxY = 0;
  for (let r = 0; r < 21; r++) {
    const v = row(r);
    if (!v) continue;
    maxY = r;
    for (let x = 0; x < 24; x++) if (v & (0x800000 >> x)) { minX = Math.min(minX, x); break; }
  }
  minX = Math.min(minX, 8);
  for (let y = 0; y < 16; y++) {
    const r = maxY - 15 + y;
    const bits = r < 0 ? 0 : ((row(r) << minX) >> 8) & 0xffff;
    const half = y < 8 ? 0 : 16;
    out[half + (y & 7)] = bits >> 8;
    out[half + 8 + (y & 7)] = bits & 0xff;
  }
  return out;
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > width) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A save described for the save manager (ContinueFlow `describe`): the area Monty is in (the
 * map's names for them), then his lives (in HARD: `lives`), the key items and cupcakes found, the rooms seen, the score.
 */
export function describeSave(data: MontyData, save: MontySave, found: MontyFound, lives = true): string[] {
  const { keyItems, cakes: allCakes } = data.progress;
  const items = keyItems.filter((i) => save.items[i]).length, cakes = allCakes.filter((i) => save.items[i]).length;
  const rooms = Object.keys(found.rooms).filter((id) => !data.isExtensionRoom(Number(id))).length;
  // (NEW GAME+ in place of the items: every key item is his in it)
  return [sectorName(data, save.roomId).text, ...(lives ? [`LIVES ${save.lives}`] : []), save.plus ? PLUS_NAME : `ITEMS ${items}/${keyItems.length}`, `${data.progress.foodName ?? 'CAKES'} ${cakes}/${allCakes.length}`, `ROOMS ${rooms}`, `SCORE ${save.score}`];
}
