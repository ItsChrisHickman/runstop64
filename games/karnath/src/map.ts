import { COL, drawPickName, isNumbers, isRecord, isRecordOf, isStrings, screenText, statusNumber, type Box, type FoundCodec, type PauseMap } from '../../shared/native/pause';
import { STRIPS } from './strips';
import { LOCATION, go as travel, location } from './travel';
import { PIECES, carrying, deposited } from './hints';
import { PLACES } from './places';

/**
 * The Staff of Karnath's map, for the pause screen: the castle as the game keeps it (see
 * re/README.md, "Travel back"): each level a strip of three screen-wide blocks of its char map
 * ($400 apart, a level every $C00), scrolled under the pointers $7FE6/$7FE7. The lower floor
 * (mode 0) has three levels from $7000, the upper floor (mode 1, $2E33 moves the pointers up
 * $2400) three more, the dungeons (mode $FF, $1199) and Karn's abode (mode $FE, $12E1) are
 * swapped in over the first. Each is drawn at its real length, one under another, the upper
 * floor at the top; the columns he's walked are lit, the rooms he's come into marked where he
 * came in (picked, a room's name shows under the map), and the ways between levels he's taken
 * (the stairs, $2B7B/$2CE4; up to the upper floor and back, $2E33/$2EF6 with $37B0; the
 * dungeons, $1199; the abode, $12E1) drawn where they are. Travel: back to where he came into
 * any room (travel.ts).
 */

/** Columns in a strip: three blocks of 40. */
const COLUMNS = 120;
/** Rooms the game names ($2F8E: 25 of them, $3235 1-$19). */
const NAMED = 0x19;
/** THE CRYPT: the 23rd name. */
export const CRYPT = 0x17;
/**
 * The two names no walk shows (test/reach.ts, re/README.md "Reach"): THE LAUNDRY ROOM ($07), the second level's right chamber behind the
 * guard at the first level's right tower door, and THE CRYPT ($17), which is no chamber at all. The room count ($3235) is moved by the doors
 * as they close and can put either on the status line, but neither is a room to be found: not counted, so the pause screen can say all.
 */
export const NO_WAY: readonly number[] = [0x07, CRYPT];
/** The rooms the pause screen counts. */
export const ROOMS = NAMED - NO_WAY.length;
/** How many of a list of rooms are among them (a save may hold the others, from a count that drifted). */
export const roomsSeen = (rooms: readonly number[]) => rooms.filter((n) => n >= 1 && n <= NAMED && !NO_WAY.includes(n)).length;

const stripIndex = (mode: number, level: number) => STRIPS.findIndex((s) => s.mode === mode && (s.level === level || s.level < 0));
/** Where he is: the strip, and the column along it (the view's left edge, $7FE6/$7FE7, and his sprite on screen). */
function placeOf(mode: number, level: number, page: number, col: number, spriteX: number) {
  const i = stripIndex(mode, level);
  if (i < 0) return null;
  const at = ((page - 4 - STRIPS[i].base) >> 2) * 40 + col + Math.floor((spriteX - 12) / 8);
  return { strip: i, col: Math.max(0, Math.min(COLUMNS - 1, at)) };
}
const here = (ram: Uint8Array, vic: Uint8Array) => placeOf(ram[0x3219], ram[0xb3e1], ram[0x7fe7], ram[0x7fe6], vic[4] | ((vic[0x10] & 4) << 6));
/** Where a noted location (travel.ts) puts him. */
const at = (loc: number[]) => {
  const v = (a: number) => loc[LOCATION.indexOf(a)];
  return placeOf(v(0x3219), v(0xb3e1), v(0x7fe7), v(0x7fe6), v(0x7ff4) | (loc[LOCATION.length] ? 256 : 0));
};

/** What's been found in the castle. */
interface Seen {
  /** Columns walked, in eighths ("strip" -> cells of 8 columns). */
  cells: Record<string, number[]>;
  /** Rooms he's been in. */
  rooms: number[];
  /** Where he came into each room (travel.ts `location`), by room. */
  at: Record<string, number[]>;
  /** The ways between levels he's taken: "strip-strip-column". */
  ways: string[];
  /** Where he was last settled (strip, column, frames since), or none after travel. */
  last: number[];
}
/** What the map keeps of the player's progress. */
export interface KarnathFound { castle: Seen }
const FOUND: FoundCodec<KarnathFound> = {
  empty: () => ({ castle: { cells: {}, rooms: [], at: {}, ways: [], last: [] } }),
  parse: (kept) => {
    const empty = FOUND.empty();
    const v = isRecord(kept) ? kept.castle : undefined;
    if (!isRecord(v)) return empty;
    const { cells, rooms, at, ways, last } = v;
    return isRecordOf(cells, isNumbers) && isNumbers(rooms) && isRecordOf(at, isNumbers) && isStrings(ways) && isNumbers(last) ? { castle: { cells, rooms, at, ways, last } } : empty;
  },
};

/** The places he can be taken back to (rooms), and where he came into each (for tests). */
export const travelPlaces = (found: KarnathFound) => found.castle.at;

function layout(box: Box) {
  const x0 = box.x + 20, scale = (box.w - 22) / COLUMNS, rowH = 16;
  return {
    x: (col: number) => x0 + Math.floor(col * scale),
    y: (strip: number) => box.y + 2 + strip * rowH + (strip >= 3 ? 4 : 0) + (strip >= 6 ? 4 : 0),
    cell: Math.ceil(8 * scale),
  };
}
/**
 * Where each room he can go back to is marked: where he came in; rooms the game counted at the
 * same place (a door held open moves its count on, see re/README.md) side by side, 4 pixels apart.
 */
/** The place far left of Karn's abode where the pieces are laid (the obelisk), reached the game's own way from the abode as noted (places.ts); on the map once he has been in the abode. */
const OBELISK = 'obelisk';
const obeliskAt = (s: Seen) => (s.at[ABODE_ROOM] ? [...PLACES['254/obelisk']] : undefined);
const ABODE_ROOM = '25';

function marks(s: Seen, L: ReturnType<typeof layout>) {
  const taken = new Map<string, number>();
  const wanted = obeliskAt(s);
  const where = Object.entries(s.at).concat(wanted ? [[OBELISK, wanted]] : []);
  return where.flatMap(([room, loc]) => {
    const p = at(loc);
    if (!p) return [];
    const x = L.x(p.col), y = L.y(p.strip) + 4, key = `${p.strip}:${x >> 2}`, n = taken.get(key) ?? 0;
    taken.set(key, n + 1);
    return [{ room, x: x + 4 * n, y }];
  });
}
const roomName = (ram: Uint8Array, room: number) => {
  let t = '';
  for (let i = 0; i < 17; i++) t += String.fromCharCode(ram[0x0e2e + 0x11 * (room - 1) + i] & 0x7f);
  return t.trim().replace(/\s+/g, ' ');
};

export const karnathMap: PauseMap<Uint8Array, KarnathFound> = {
  found: FOUND,
  observe(ram, { castle: s }, vic) {
    const room = ram[0x3235], p = here(ram, vic), loc = location(ram, vic);
    if (room >= 1 && room <= NAMED && !s.rooms.includes(room)) s.rooms.push(room);
    if (loc && room >= 1 && room <= NAMED && !s.at[room]) s.at[room] = loc;
    if (s.last.length === 3) s.last[2]++;
    if (!p || !loc) return; // (only where he's settled: a change of level draws for frames, and a door open drifts the room)
    const list = (s.cells[STRIPS[p.strip].label] ??= []), c = p.col >> 3;
    if (!list.includes(c)) list.push(c);
    // a way between levels: he was settled on another strip moments ago, about here (the ways keep his place along), and didn't travel
    const [ls, lc, age] = s.last;
    if (ls !== undefined && ls !== p.strip && age < 100 && Math.abs(lc - p.col) < 16) {
      const a = Math.min(ls, p.strip), b = Math.max(ls, p.strip), col = Math.round((lc + p.col) / 2);
      if (!s.ways.some((w) => { const [wa, wb, wc] = w.split('-').map(Number); return wa === a && wb === b && Math.abs(wc - col) < 6; })) s.ways.push([a, b, col].join('-'));
    }
    s.last = [p.strip, p.col, 0];
  },
  title: (ram) => screenText(ram, 21, 4, 30) || 'THE CASTLE',
  draw(sf, box, ram, { castle: s }, blink, _page, font, pick) {
    const L = layout(box);
    STRIPS.forEach((st, i) => {
      const y = L.y(i), cells = new Set(s.cells[st.label] ?? []);
      font?.draw(sf, st.label, box.x, y, COL.grey);
      // (a stretch no way leads into, st.closed, is a thin line, not a to-do: lit, if ever walked)
      for (let c = 0; c < COLUMNS / 8; c++) {
        const lit = cells.has(c), shut = !lit && st.closed.includes(c);
        sf.fillRect(L.x(c * 8), shut ? y + 4 : y + 2, L.cell - 1, shut ? 1 : 4, lit ? COL.yellow : COL.dgrey);
      }
      // where one block of the char map ends and the next starts (a screen's width)
      for (const b of [1, 2]) sf.fillRect(L.x(b * 40), y + 6, 1, 2, COL.dgrey);
    });
    // the ways between levels he's taken
    for (const w of s.ways) {
      const [a, b, c] = w.split('-').map(Number), x = L.x(c);
      if (!STRIPS[a] || !STRIPS[b]) continue;
      const colour = STRIPS[a].mode === STRIPS[b].mode ? COL.green : COL.purple;
      sf.fillRect(x, L.y(a) + 6, 1, L.y(b) - L.y(a) - 4, colour);
    }
    // the rooms, where he came in (dark: been in, but no place to come back to)
    for (const m of marks(s, L)) sf.fillRect(m.x - 1, m.y - 4, 3, 8, COL.lblue);
    drawPickName(sf, box, font, pick ? (pick === OBELISK ? 'THE OBELISK' : roomName(ram, Number(pick))) : null);
    if (blink && s.last.length === 3) sf.fillRect(L.x(s.last[1]) - 1, L.y(s.last[0]) + 1, 3, 6, COL.white);
  },
  info: (ram, found, assist) => [
    `ENERGY ${String(statusNumber(ram, 0x07dc)).padStart(3)}%`,
    `${screenText(ram, 24, 5, 5)} ${screenText(ram, 24, 11, 2)}`, // the castle clock
    `ROOMS ${String(roomsSeen(found.castle.rooms)).padStart(2)}/${ROOMS}`,
    // the pieces of the pentacle laid at the obelisk, and one carried (ENHANCED's hints): short, the legend and the options stand under the lines
    ...(assist?.hints ? [`PIECES ${Math.min(deposited(ram), PIECES)}/${PIECES}`, ...(carrying(ram) ? ['CARRYING 1'] : [])] : []),
  ],
  legend: [{ colour: COL.lblue, text: 'ROOM' }, { colour: COL.green, text: 'STAIRS' }, { colour: COL.purple, text: 'FLOORS' }],
  places(box, ram, found) {
    return marks(found.castle, layout(box)).map((m) => ({ id: m.room, x: m.x, y: m.y, here: m.room === String(ram[0x3235]) }));
  },
  go(id, ram, found) {
    const s = found.castle, to = id === OBELISK ? obeliskAt(s) : s.at[id];
    if (!to || !travel(ram, to)) return false;
    s.last = []; // (not walked: no way between the two to draw)
    return true;
  },
};
