import { COL, isNumbers, isRecordOf, type Box, type Found, type PauseMap } from '../../shared/native/pause';
import { CORE_ROOM, MAP_H, MAP_W, rom } from './data';
import type { Game } from './game';

/**
 * The planet's map, for the pause screen: 16 rooms across, 32 down, in two
 * pages (the top half, the depths). Rooms appear as BLOB visits them (the
 * game's own table of visited rooms, $0400); the core and the teleports are
 * marked. Places to go back to: the rooms visited, arriving where BLOB first
 * stood in each (kept with the saves).
 */
type Spot = [col: number, row: number];
const isSpot = (v: unknown): v is Spot => isNumbers(v) && v.length === 2;
/** Where BLOB first stood in each room (`found.entry`, as kept: checked, as read back from storage). */
const entriesOf = (f: Found): Record<string, Spot> | undefined => (isRecordOf(f.entry, isSpot) ? f.entry : undefined);

const visited = (g: Game, room: number) => !!(g.lo[room >> 3] & (0x80 >> (room & 7)));
const ROWS_PER_PAGE = 16;

/** The 15 teleports' rooms ($112A/$1139). */
const TELEPORTS = new Set(Array.from({ length: 15 }, (_, i) => rom(0x112a + i) | (rom(0x1139 + i) << 8)));

function layout(box: Box) {
  const cw = Math.floor(box.w / MAP_W), ch = Math.floor(box.h / ROWS_PER_PAGE);
  const ox = box.x + Math.floor((box.w - cw * MAP_W) / 2), oy = box.y + Math.floor((box.h - ch * ROWS_PER_PAGE) / 2);
  return { cw, ch, at: (room: number) => ({ x: ox + (room & 15) * cw, y: oy + ((room >> 4) % ROWS_PER_PAGE) * ch }) };
}

export const starquakeMap = {
  observe(g, found) {
    let entry = entriesOf(found);
    if (!entry) found.entry = entry = {};
    const key = String(g.room);
    // where BLOB first stood in each room (his place as he arrived)
    if (!entry[key]) entry[key] = [g.col, g.row];
  },
  pages: (g) => ({ list: [0, 1], current: g.room >> 8 }),
  title: (_g, page = 0) => (page ? 'THE DEPTHS' : 'THE SURFACE'),
  draw(s, box, g, _found, blink, page = 0) {
    const { cw, ch, at } = layout(box);
    for (let r = page * 256; r < page * 256 + 256; r++) {
      const p = at(r);
      if (r === g.room) { s.fillRect(p.x, p.y, cw - 1, ch - 1, blink ? COL.white : COL.yellow); continue; }
      if (!visited(g, r)) { s.fillRect(p.x + (cw >> 1), p.y + (ch >> 1), 1, 1, COL.dgrey); continue; }
      const colour = r === CORE_ROOM ? COL.red : TELEPORTS.has(r) ? COL.cyan : COL.grey;
      s.fillRect(p.x, p.y, cw - 1, ch - 1, colour);
    }
    if (page === (CORE_ROOM >> 8) && !visited(g, CORE_ROOM) && g.room !== CORE_ROOM) {
      const p = at(CORE_ROOM);
      s.fillRect(p.x + 2, p.y + 2, cw - 5, ch - 5, COL.red); // the core: where the pieces go
    }
  },
  legend: [{ colour: COL.cyan, text: 'TELEPORT' }, { colour: COL.red, text: 'THE CORE' }],
  places(box, g, found, page = 0) {
    const { cw, ch, at } = layout(box);
    const entry = entriesOf(found) ?? {};
    return Object.keys(entry).map(Number)
      .filter((r) => r >> 8 === page && visited(g, r))
      .map((r) => { const p = at(r); return { id: String(r), x: p.x + (cw >> 1), y: p.y + (ch >> 1), here: r === g.room }; });
  },
  // The front end takes BLOB there (flow.travel) between frames; nothing to do in the game here.
  go: (id: string, g: Game, found: Found) => !!entriesOf(found)?.[id] && visited(g, Number(id)),
  info(g) {
    let rooms = 0;
    for (let r = 0; r < MAP_W * MAP_H; r++) if (visited(g, r)) rooms++;
    const lives = g.lives[0] * 10 + g.lives[1];
    return [`ROOMS   ${String(rooms).padStart(3)}`, `LIVES    ${String(lives).padStart(2)}`];
  },
} satisfies PauseMap<Game>;

/** Where BLOB first stood in a room (for travel), if he's been there. */
export const entryOf = (found: Found, room: number) => entriesOf(found)?.[String(room)];
