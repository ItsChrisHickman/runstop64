import { COL, foundCodec, S, shimmerColour, type Box, type MapPlace, type PauseMap } from '../../shared/native/pause';
import { BANNERS } from './data/awm-data';
import { GRID_COLS, NO_ROOM, TABLES, WORLD_GRID } from './data';
import type { Surface } from 'c64kit';
import { carryingPages, carryingTitle } from '../../shared/carrying';
import * as Carrying from './carrying';
import { destination } from './flight';
import { isTrap } from './items';
import { placeName } from './wants';
import type { Entry, Game } from './game';
import type { Program } from './program';
import type { AwmSave } from './save';
import { State } from './tiles';

/**
 * The map for the shared pause screen (games/shared/frontend.ts): the world as the game lays it out (80 rooms in a grid
 * 16 wide), a room dark grey until Monty has stood in it, then its country's colour; rooms with everything in them
 * taken shimmer in the colours of the coins on Monty on the Run's map; his room flashes; every room with a plane he has stood
 * in has a badge in its top left corner, in the colour of the badge in the bottom right corner of where it flies. Under it the
 * picked room's name (the banner the game prints over it), what is left there to take, and where its plane goes.
 *
 * Places to go back to: every room he has stood in, arriving where he first came in, as through an exit
 * (`Program.travel`: the game's own room entry).
 */

/** Where he came into a room. */
const seen = S.tuple(S.number, S.number, S.number, S.number); // x, y, state, step
/** What the map keeps of the player's progress: the rooms he has come into, and where. */
const found = S.object({ rooms: S.record(seen) });
export type AwmFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ rooms: {} }));

/** The room he first came into, from what has been found. */
export function entryOf(found: AwmFound, room: number): Entry | null {
  const e = found.rooms[room];
  return e ? { room, x: e[0], y: e[1], state: e[2], step: e[3] } : null;
}

/** A room Monty is in (the front end looks every frame): its first time is noted. True if that is new. */
export function noteRoom(game: { readonly world: { readonly room: number }; readonly entry: Entry }, { rooms }: AwmFound): boolean {
  const room = game.world.room;
  if (rooms[room]) return false;
  const e = game.entry;
  rooms[room] = [e.x, e.y, e.state, e.step];
  return true;
}

/** Where travel must not take him: the room was entered with a script running, or the ending is on. */
const SCRIPTED: readonly number[] = [State.Script10, State.Intro, State.Ending];

const COLS = GRID_COLS;
const ROWS = WORLD_GRID.length / GRID_COLS;
/** A room's cell on the map: 12 x 8 pixels, drawn 11 x 7 (the rooms are 32 x 18 characters). */
const CELL_W = 12, CELL_H = 8;

const rooms: readonly number[] = Array.from(WORLD_GRID).filter((r) => r !== NO_ROOM);

/** The country each room is in (the banner's first part), and a colour for each. */
const country = (room: number) => (BANNERS[room] ?? '').split('|')[0] ?? '';
const COUNTRY_COLOURS = [COL.lgreen, COL.pink, COL.lblue, COL.green, COL.purple, COL.orange, COL.cyan, COL.red, COL.brown];
const countries = [...new Set(rooms.map(country))];
export const colourOf = (room: number) => COUNTRY_COLOURS[countries.indexOf(country(room)) % COUNTRY_COLOURS.length] ?? COL.white;

/** The name of a room as the game prints it over the room: the place, then the country (a place of a space is left out). */
export function roomName(room: number): string {
  const [land = '', place = ''] = (BANNERS[room] ?? '').split('|');
  return [place.trim(), land.trim()].filter((p) => p !== '').join(', ');
}

/** What a room holds to take (the list's entries there, the death trap left out), and how many of them are taken. */
const prizes = (room: number) => TABLES.items.flatMap((e, i) => (e.room === room && !isTrap(e) ? [i] : []));
const PRIZES: ReadonlyMap<number, readonly number[]> = new Map(rooms.map((r) => [r, prizes(r)]));

function left(program: Program, room: number) {
  const list = PRIZES.get(room) ?? [];
  const taken = program.game?.items.collected;
  const open = list.filter((i) => !taken?.[i]).length;
  return { total: list.length, open };
}

/** Everything in the room taken (a room with nothing to take is not one of them). */
const complete = (program: Program, room: number) => {
  const l = left(program, room);
  return l.total > 0 && l.open === 0;
};

/** The flights (flight.ts): a plane's room and where it flies. Only Copenhagen and Byorn fly both ways. */
const FLIGHTS: readonly { readonly from: number; readonly to: number }[] = rooms.flatMap((from) => {
  const to = destination(from);
  return to === null ? [] : [{ from, to }];
});
/**
 * Each landing room's colour, for its badges: a room with a plane has one in its top left corner in the colour of where it flies, and
 * the room it lands in has one in its bottom right corner in its own (Chris, 2026-11-15: lines were hard to follow). Chosen so no two
 * near each other look alike, and none is the colour of a room it sits on; the two used twice are seven rooms or more apart
 * (test/flights.ts).
 */
export const LANDING_COLOURS: ReadonlyMap<number, number> = new Map([
  [0x01, COL.orange], [0x00, COL.lgrey], [0x28, COL.yellow], [0x13, COL.white], [0x0e, COL.lgreen], [0x31, COL.lblue], [0x0a, COL.purple],
  [0x05, COL.cyan], [0x0d, COL.red], [0x39, COL.green], [0x11, COL.pink], [0x3d, COL.lgrey], [0x4b, COL.yellow], [0x1a, COL.grey],
]);
/** A badge: a quarter of the cell (5 x 3 pixels), with a black edge on the cell's side so it reads apart from the room's colour. */
const BADGE_W = 5, BADGE_H = 3;

/** A badge in a cell's top left (a plane's room) or bottom right (where one lands) corner. */
function drawBadge(s: Surface, cell: { x: number; y: number }, corner: 'plane' | 'landing', colour: number): void {
  const plane = corner === 'plane';
  const x = plane ? cell.x : cell.x + CELL_W - 1 - BADGE_W, y = plane ? cell.y : cell.y + CELL_H - 1 - BADGE_H;
  const edgeX = plane ? x + BADGE_W : x - 1, edgeY = plane ? y + BADGE_H : y - 1;
  s.fillRect(Math.min(x, edgeX), edgeY, BADGE_W + 1, 1, COL.black);
  s.fillRect(edgeX, Math.min(y, edgeY), 1, BADGE_H + 1, COL.black);
  s.fillRect(x, y, BADGE_W, BADGE_H, colour);
}

/** A room's cell on the map, by its room. */
function cellOf(at: (row: number, col: number) => { x: number; y: number }, room: number): { x: number; y: number } {
  const i = WORLD_GRID.indexOf(room);
  return at(Math.floor(i / COLS), i % COLS);
}

/** The flights whose plane he has seen: from a room he has stood in. */
export const flightsSeen = (found: AwmFound): readonly { readonly from: number; readonly to: number }[] => FLIGHTS.filter((f) => found.rooms[f.from] !== undefined);

function layout(box: Box) {
  const ox = box.x + Math.floor((box.w - COLS * CELL_W) / 2), oy = box.y + 2;
  return { at: (row: number, col: number) => ({ x: ox + col * CELL_W, y: oy + row * CELL_H }) };
}

/** The room in a cell of the grid, or null. */
function roomAt(row: number, col: number): number | null {
  const r = WORLD_GRID[row * COLS + col];
  return r === undefined || r === NO_ROOM ? null : r;
}

/** How he is doing, as the pause screen shows it (and THE END, ending.ts): lives, rooms seen, items taken, how far to the goal. */
export function progressLines(game: Game, found: AwmFound): string[] {
  const seen = Object.keys(found.rooms).length;
  const taken = game.items.collected.filter((c, i) => c && PRIZES.get(TABLES.items[i]?.room ?? NO_ROOM)?.includes(i)).length;
  const goal = Math.min(100, Math.floor((game.progress * 100) / 0xc3));
  return [`LIVES ${String(game.lives & 0x7f).padStart(5)}`, `ROOMS ${String(seen).padStart(2)}/${rooms.length}`, `ITEMS ${String(taken).padStart(5)}`, `GOAL ${String(goal).padStart(4)}%`];
}

/**
 * The pause screen's pages: the world, and with ENHANCED's carry anything the CARRYING pages after it (1, 2...: a page for each
 * eight things). The page being shown, as the map has it: 0 for the world, also when the pages are not there (ORIGINAL).
 */
function shownPage(program: Program, page: number): number {
  const g = program.game;
  return g && g.unlimitedCarry() && page >= 1 && page <= Carrying.pages(g) ? page : 0;
}

/** Frames the map has been drawn (the shimmer's step). */
let shimmer = 0;

export const awmMap = {
  found: FOUND,
  // (rooms are noted as Monty comes into them: noteRoom)
  observe() {},
  pages(program) {
    const g = program.game;
    return { list: g?.unlimitedCarry() ? carryingPages(1, g.items.list().length) : [0], current: 0 };
  },
  title(program, page = 0) {
    const p = shownPage(program, page);
    return p && program.game ? carryingTitle(p - 1, Carrying.pages(program.game)) : 'THE WORLD';
  },
  draw(s, box, program, found, blink, page = 0, font, pick) {
    const game = program.game;
    if (!game) return;
    const carrying = shownPage(program, page);
    if (carrying) return Carrying.draw(s, box, game, font, carrying - 1, roomName);
    const { at } = layout(box);
    const tick = shimmer++;
    const seen = found.rooms;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const room = roomAt(r, c);
        if (room === null) continue;
        const p = at(r, c);
        const colour = room === game.world.room ? (blink ? COL.white : COL.yellow)
          : !seen[room] ? COL.dgrey
          : complete(program, room) ? shimmerColour(tick, r + c)
          : colourOf(room);
        s.fillRect(p.x, p.y, CELL_W - 1, CELL_H - 1, colour);
      }
    }
    for (const f of flightsSeen(found)) {
      const colour = LANDING_COLOURS.get(f.to) ?? COL.white;
      drawBadge(s, cellOf(at, f.from), 'plane', colour);
      drawBadge(s, cellOf(at, f.to), 'landing', colour);
    }
    if (!font) return;
    // the picked room: its name, and what is left there
    const room = pick !== null && pick !== undefined ? Number(pick) : game.world.room;
    const y = box.y + 2 + ROWS * CELL_H + 8;
    font.draw(s, roomName(room).slice(0, 24), box.x, y, COL.white);
    const l = left(program, room);
    const state = l.total === 0 ? 'NOTHING TO TAKE' : l.open === 0 ? 'ALL TAKEN' : `${l.open} OF ${l.total} LEFT TO TAKE`;
    font.draw(s, state, box.x, y + 10, l.open ? COL.lgrey : COL.lgreen);
    // a plane seen there: where it flies, in its badge's colour
    const to = found.rooms[room] ? destination(room) : null;
    if (to !== null) font.draw(s, `PLANE TO ${placeName(to)}`, box.x, y + 20, LANDING_COLOURS.get(to) ?? COL.white);
  },
  info: (program, found) => (program.game ? progressLines(program.game, found) : []),
  legend: (program, _assist, page = 0) => (shownPage(program, page) ? [] : [{ colour: COL.dgrey, text: 'NOT SEEN' }, { colour: COL.yellow, text: 'ALL TAKEN' }]),
  places(box: Box, program: Program, found: AwmFound, page = 0): MapPlace[] {
    const game = program.game;
    if (!game || shownPage(program, page)) return [];
    const { at } = layout(box);
    const out: MapPlace[] = [];
    const seen = found.rooms;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const room = roomAt(r, c);
        if (room === null) continue;
        const p = at(r, c), here = room === game.world.room;
        if (here || seen[room]) out.push({ id: String(room), x: p.x + 5, y: p.y + 3, r: 4, rx: 6, ...(here ? { here } : {}) });
      }
    }
    return out;
  },
  /** Travel: he leaves this room and comes into that one where he first did, as through an exit. */
  go(id, program, found) {
    const at = entryOf(found, Number(id));
    const game = program.game;
    if (!at || !game || SCRIPTED.includes(game.monty.state) || game.ended) return false;
    return program.travel(at);
  },
} satisfies PauseMap<Program, AwmFound>;

/** A save described for the save manager (ContinueFlow `describe`): the place, then lives, how far he has got and the score. */
export function describeSave(save: AwmSave, found: AwmFound): string[] {
  const seen = Object.keys(found.rooms).length;
  const goal = Math.min(100, Math.floor((save.progress * 100) / 0xc3));
  const score = save.score.reduceRight((n, d) => n * 10 + d, 0);
  return [roomName(save.room) || country(save.room), `LIVES ${save.lives & 0x7f}`, `GOAL ${goal}%`, `ROOMS ${seen}`, `SCORE ${score}`];
}
