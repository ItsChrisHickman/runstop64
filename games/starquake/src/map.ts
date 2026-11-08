import { COL, drawPickName, foundCodec, S, type Box, type PauseMap } from '../../shared/native/pause';
import { CORE_ROOM, MAP_H, MAP_W } from './data';
import type { Game } from './game';
import * as Inventory from './inventory';
import { CORE_PIECES, DOOR_SYMBOLS, kindsOf, lyingHere, passRooms, pieceRooms, piecesPlaced, PYRAMID_SYMBOLS, pyramidShown, teleportName, TELEPORT_ROOMS } from './places';

/**
 * The planet's map, for the pause screen: 16 rooms across, 32 down, in two
 * pages (the top half, the depths). Rooms appear as BLOB visits them (the
 * game's own table of visited rooms, $0400); the core, the teleports, the
 * security doors and the Cheops pyramids he has met are marked, with the goal
 * under the map and, for the room picked, what it has (places.ts says what the
 * game is). ENHANCED (the `guide` assist) also marks where the core's pieces
 * lie, the access card and the key, and says what a door or pyramid wants.
 * Places to go back to: the rooms visited, arriving where BLOB first
 * stood in each (kept with the saves).
 */
const spot = S.tuple(S.number, S.number); // column, row
/**
 * What the map keeps of the player's progress: where BLOB first stood in each room, the teleports whose booth he has stood in (a booth
 * shows its own name, which is what to type to come to it) and the rooms where he has met a Cheops pyramid (they turn up as he comes in).
 */
const found = S.object({ entry: S.record(spot), booths: S.array(S.number), pyramids: S.array(S.number) });
export type StarquakeFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ entry: {}, booths: [], pyramids: [] }));

/** The first page that is not the map: what BLOB carries. */
export const INVENTORY = 2;

const visited = (g: Game, room: number) => !!(g.lo[room >> 3] & (0x80 >> (room & 7)));
const ROWS_PER_PAGE = 16;

/** The map's own box: the foot of the pause map's box holds the goal and what the picked room has. */
const mapBox = (box: Box): Box => ({ ...box, h: box.h - 22 });

function layout(box: Box) {
  const cw = Math.floor(box.w / MAP_W), ch = Math.floor(box.h / ROWS_PER_PAGE);
  const ox = box.x + Math.floor((box.w - cw * MAP_W) / 2), oy = box.y + Math.floor((box.h - ch * ROWS_PER_PAGE) / 2);
  return { cw, ch, at: (room: number) => ({ x: ox + (room & 15) * cw, y: oy + ((room >> 4) % ROWS_PER_PAGE) * ch }) };
}

/** Marks on a room: doors and pyramids always; ENHANCED's are the help (where the core's pieces and the pass lie). */
const MARK = { piece: COL.lgreen, pass: COL.pink, door: COL.orange, pyramid: COL.purple } as const;

/** The goal, in the map's words. */
export const goalLine = (g: Game) => `REBUILD THE CORE: ${piecesPlaced(g)} OF ${CORE_PIECES}`;

/** The letters a line under the map has room for. */
export const LINE_LETTERS = 24;

/** What the picked room has, as much as fits in a line (ENHANCED says more: what is lying there, what a door or pyramid wants). */
export function roomLine(g: Game, f: StarquakeFound, room: number, help: boolean): string {
  const k = kindsOf(room, f.pyramids), here = lyingHere(g, room);
  const parts: string[] = [];
  if (k.core) parts.push('THE CORE');
  if (help && here.piece) parts.push('A CORE PIECE');
  if (help && here.card) parts.push('THE ACCESS CARD');
  if (help && here.key) parts.push('THE KEY');
  if (k.door) parts.push(help ? `DOOR: ${DOOR_SYMBOLS} SYMBOLS/CARD` : 'SECURITY DOOR');
  if (k.teleport >= 0) parts.push(f.booths.includes(k.teleport) ? `TELEPORT ${teleportName(k.teleport)}` : 'TELEPORT');
  if (k.pyramid) parts.push(help ? `PYRAMID: ${PYRAMID_SYMBOLS} SYMBOLS/CARD` : 'CHEOPS PYRAMID');
  // (as many, in that order, as the line holds)
  let line = '';
  for (const part of parts) {
    const next = line ? `${line}, ${part}` : part;
    if (next.length > LINE_LETTERS) break;
    line = next;
  }
  return line || (parts[0] ?? 'NOTHING MARKED').slice(0, LINE_LETTERS);
}

/** A booth stood in: its name is known now. */
export function noteBooth(f: StarquakeFound, teleport: number) {
  if (teleport >= 0 && teleport < TELEPORT_ROOMS.length && !f.booths.includes(teleport)) f.booths.push(teleport);
}

export const starquakeMap = {
  found: FOUND,
  observe(g, { entry, pyramids }) {
    const key = String(g.room);
    // where BLOB first stood in each room (his place as he arrived)
    if (!entry[key]) entry[key] = [g.col, g.row];
    if (pyramidShown(g) && !pyramids.includes(g.room)) pyramids.push(g.room);
  },
  // (the map's two pages, then what BLOB carries: one page, more when there are more than it holds)
  pages: (g) => ({ list: [0, 1, ...Array.from({ length: Inventory.pageCount(g) }, (_, i) => INVENTORY + i)], current: g.room >> 8 }),
  title(g, page = 0) {
    if (page < INVENTORY) return page ? 'THE DEPTHS' : 'THE SURFACE';
    const n = Inventory.pageCount(g);
    return n > 1 ? `CARRYING ${page - INVENTORY + 1}/${n}` : 'CARRYING';
  },
  draw(s, box, g, f, blink, page = 0, font, pick, assist) {
    if (page >= INVENTORY) { Inventory.draw(s, box, g, font, page - INVENTORY); return; }
    const help = assist?.guide === true;
    const { cw, ch, at } = layout(mapBox(box));
    const pieces = help ? pieceRooms(g) : new Set<number>(), passes = help ? passRooms(g) : new Set<number>();
    for (let r = page * 256; r < page * 256 + 256; r++) {
      const p = at(r), mark = (colour: number) => s.fillRect(p.x + ((cw - 1 - 6) >> 1), p.y + ((ch - 1 - 3) >> 1), 6, 3, colour);
      const ahead = pieces.has(r) ? MARK.piece : passes.has(r) ? MARK.pass : null;
      if (r === g.room) { s.fillRect(p.x, p.y, cw - 1, ch - 1, blink ? COL.white : COL.yellow); continue; }
      const k = kindsOf(r, f.pyramids);
      if (!visited(g, r)) {
        s.fillRect(p.x + (cw >> 1), p.y + (ch >> 1), 1, 1, COL.dgrey);
        if (ahead !== null) mark(ahead); // (ENHANCED: where the game put it, before BLOB has been there)
        continue;
      }
      s.fillRect(p.x, p.y, cw - 1, ch - 1, k.core ? COL.red : k.teleport >= 0 ? COL.cyan : COL.grey);
      const on = ahead ?? (k.door ? MARK.door : k.pyramid ? MARK.pyramid : null);
      if (on !== null) mark(on);
    }
    if (page === (CORE_ROOM >> 8) && !visited(g, CORE_ROOM) && g.room !== CORE_ROOM) {
      const p = at(CORE_ROOM);
      s.fillRect(p.x + 2, p.y + 2, cw - 5, ch - 5, COL.red); // the core: where the pieces go
    }
    // under the map: the goal, and (the shared picked place's name line) what the picked room has
    if (font) {
      const goal = goalLine(g);
      font.draw(s, goal, box.x + ((box.w - goal.length * 8) >> 1), box.y + box.h - 18, COL.white);
      drawPickName(s, { ...box, h: box.h + 2 }, font, pick === null || pick === undefined ? null : roomLine(g, f, Number(pick), help));
    }
  },
  legend: (_g, assist, page = 0) => page >= INVENTORY ? [] : [
    { colour: COL.cyan, text: 'TELEPORT' }, { colour: COL.red, text: 'THE CORE' },
    { colour: MARK.door, text: 'DOOR' }, { colour: MARK.pyramid, text: 'PYRAMID' },
    ...(assist?.guide ? [{ colour: MARK.piece, text: 'PIECE' }, { colour: MARK.pass, text: 'CARD, KEY' }] : []),
  ],
  places(box, g, f, page = 0) {
    const { cw, ch, at } = layout(mapBox(box));
    return Object.keys(f.entry).map(Number)
      .filter((r) => r >> 8 === page && visited(g, r))
      .map((r) => { const p = at(r); return { id: String(r), x: p.x + (cw >> 1), y: p.y + (ch >> 1), here: r === g.room }; });
  },
  // The front end takes BLOB there (flow.travel) between frames; nothing to do in the game here.
  go: (id: string, g: Game, f: StarquakeFound) => !!f.entry[id] && visited(g, Number(id)),
  info(g) {
    let rooms = 0;
    for (let r = 0; r < MAP_W * MAP_H; r++) if (visited(g, r)) rooms++;
    const lives = g.lives[0] * 10 + g.lives[1];
    return [`ROOMS   ${String(rooms).padStart(3)}`, `LIVES    ${String(lives).padStart(2)}`];
  },
} satisfies PauseMap<Game, StarquakeFound>;

/** Where BLOB first stood in a room (for travel), if he's been there. */
export const entryOf = (f: StarquakeFound, room: number) => f.entry[String(room)];
