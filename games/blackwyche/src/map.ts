import type { BitmapFont, Surface } from 'c64kit';
import { COL, drawPickName, isNumbers, isRecord, isRecordOf, isStrings, shimmerColour, statusNumber, type Box, type FoundCodec, type PauseMap } from '../../shared/native/pause';
import { held, ITEMS, itemsFound, roomThings, shortName, type Held } from './items';
import { parseSprung } from './trapdoors';
import { placeName } from './names';
import { CABINS, HALLS, PANELS, WAYS } from './ship';
import { followChain, go as travel, location, placeId, where } from './travel';

/**
 * Blackwyche's map, for the pause screen: the whole galleon, laid out from the game's own data
 * (src/ship.ts, built by re/ship.ts): its five decks one under another, each drawn as the game
 * keeps it, a ring: the hall at one end ($1ECD 3, two screens), the deck's first long part (nine
 * screens), the hall at the other end ($1ECD 2), the second long part, and round again (the
 * line under the deck). The cabins sit over their doors; a ladder (or a trapdoor) goes down
 * from a cabin to the one under it, at the same door. Some floors have holes the data doesn't
 * show (the game takes him down where the char under him is a space, $1360) into a place with
 * no cabin of its own, under the one above: those, and the way, are drawn once found. Dark grey until he's been there, lit where
 * he has; where he is blinks; places he's been but can't be travelled to (he never stood there)
 * are drawn dark. Travel: to any part, hall or cabin he's stood in (travel.ts). Places are named (names.ts); one
 * he's been to with everything in it found shimmers, and the picked one's name says what's left there.
 */

/** Where he has been aboard. */
interface Seen {
  /** Panels he's been on: "deck.part" (parts 2 and 3: the halls) -> panel numbers. */
  panels: Record<string, number[]>;
  /** Cabins he's been in ("C deck.part.door"). */
  cabins: string[];
  /** Where he first stood in each place (travel.ts `location`), by place id. */
  at: Record<string, number[]>;
  /** The chain of blocks swapped in over the decks' own (travel.ts `followChain`). */
  chain: number[];
  /** Ways between decks he's taken that the data doesn't show (a hole the game finds in a floor, to no cabin): "upper>lower" cabin ids. */
  ways: string[];
  /** The place he was in a frame ago ('' after travel). */
  last: string;
  /** The place he is settling into (travel.ts `location` is noted once he has stood in it `STAND` frames on his feet, see `observe`). */
  standing: { key: string; n: number };
}
function isStanding(v: unknown): v is Seen['standing'] {
  return typeof v === 'object' && v !== null && 'key' in v && 'n' in v && typeof v.key === 'string' && typeof v.n === 'number';
}
const emptyShip = (): Seen => ({ panels: {}, cabins: [], at: {}, chain: [], ways: [], last: '', standing: { key: '', n: 0 } });
function parseShip(v: unknown): Seen {
  if (!isRecord(v)) return emptyShip();
  const { panels, cabins, at, chain, ways, last, standing } = v;
  if (!isRecordOf(panels, isNumbers) || !isStrings(cabins) || !isRecordOf(at, isNumbers) || !isNumbers(chain) || !isStrings(ways) || typeof last !== 'string') return emptyShip();
  return { panels, cabins, at, chain, ways, last, standing: isStanding(standing) ? standing : { key: '', n: 0 } };
}

/**
 * What the map keeps of the player's progress (`ship`), and the trapdoors that have given way
 * (`trapdoors`, src/trapdoors.ts: the TRAPDOORS STAY OPEN assist keeps them here, and so with the saves).
 */
/** How much of the ship he has seen (the pause screen's SEEN, and the ending's): the parts and halls stood on, and the cabins stood in. */
export function shipSeen(found: BlackwycheFound): number {
  const s = found.ship;
  return Object.entries(s.panels).filter(([, l]) => l.length).length + s.cabins.filter((id) => DATA_CABINS.has(id)).length;
}
export interface BlackwycheFound{ ship: Seen; trapdoors: string[] }
const FOUND: FoundCodec<BlackwycheFound> = {
  empty: () => ({ ship: emptyShip(), trapdoors: [] }),
  parse: (kept) => ({ ship: parseShip(isRecord(kept) ? kept.ship : undefined), trapdoors: parseSprung(isRecord(kept) ? kept.trapdoors : undefined) }),
};

export const TOTAL = PANELS.length * 2 + HALLS.length + CABINS.length;

/** The map's second page: what he's collected (src/items.ts), the game's own names in two columns of twelve. */
const ITEMS_PAGE = 1;
/**
 * A thing's name in the list (12 letters at most, so the columns keep apart): the four pieces of map
 * numbered (MAP PIECE 1-4), the two lots of doubloons too.
 */
function listName(ram: Uint8Array, i: number) {
  const name = ITEMS[i].name, same = ITEMS.filter((it) => it.name === name);
  const short = shortName(ram, name).replace('PIECE OF MAP', 'MAP PIECE');
  return same.length > 1 ? `${short} ${same.indexOf(ITEMS[i]) + 1}` : short;
}
const ITEM_COLOURS: Record<Held, number> = { no: COL.dgrey, have: COL.white, used: COL.lgreen };
function drawItems(sf: Surface, box: Box, font: BitmapFont, ram: Uint8Array) {
  const rows = Math.ceil(ITEMS.length / 2);
  ITEMS.forEach((item, i) => font.draw(sf, listName(ram, i), box.x + (i < rows ? 0 : 100), box.y + (i % rows) * 12, ITEM_COLOURS[held(ram, item)]));
  // what the colours say, in the colours
  const y = box.y + rows * 12 + 2;
  font.draw(sf, 'HAVE', box.x, y, ITEM_COLOURS.have);
  font.draw(sf, 'USED', box.x + 40, y, ITEM_COLOURS.used);
  font.draw(sf, 'NOT YET', box.x + 80, y, ITEM_COLOURS.no);
}

// ---- layout: 22 columns of 8 pixels a deck (hall, nine panels, hall, nine panels), a deck every 28 pixels ----
const U = 8;
/** Which column a panel is drawn in: part 0 at 2-10, its end hall (2) at 11-12, part 1 at 13-21, the hall at its end (3) at 0-1. */
const column = (part: number, panel: number) => (part === 0 ? 2 + panel : part === 1 ? 13 + panel : part === 2 ? 10 + panel : panel - 1);
function layout(box: Box) {
  const x0 = box.x + 12, rowH = 28;
  const top = (deck: number) => box.y + (deck - 1) * rowH + 1;
  return {
    x0, top,
    x: (part: number, panel: number) => x0 + column(part, panel) * U,
    strip: (deck: number) => top(deck) + 11,
  };
}

/** Frames on his feet in a cabin before it is one to travel to. */
const STAND = 10;
const cabinId = (c: { deck: number; part: number; door: number }) => placeId({ kind: 'cabin', ...c });
/** A cabin's deck, part and door, from its id ("C2.0.5"). */
const cabinOf = (id: string) => { const [deck, part, door] = id.slice(1).split('.').map(Number); return { deck, part, door }; };
const DATA_CABINS = new Set(CABINS.map(cabinId));
const DATA_WAYS = new Set(WAYS.map((w) => `${cabinId(CABINS[w.from])}>${cabinId(CABINS[w.to])}`));
/**
 * Where a place is drawn: the cabin over its door, or the whole of the part or hall (every square of it is the one
 * place: travel puts him back where he stood in it), so the picked box goes round all its squares.
 */
function spot(L: ReturnType<typeof layout>, at: number[]) {
  const kind = at[0], deck = at[1], part = at[2];
  if (kind === 1) return { x: L.x(part, at[3]) + 3, y: L.top(deck) + 3, r: 5, rx: 4 };
  const squares = kind === 0 ? 9 : 2, first = kind === 0 ? 0 : 1;
  return { x: L.x(part, first) + (squares * U - 1) / 2, y: L.strip(deck) + 3, r: 5, rx: (squares * U) / 2 };
}

/** The room of a cabin or hall, by its id (none for a deck's part, or a place found under a cabin). */
function roomAt(id: string) {
  if (id[0] === 'C') return CABINS.find((c) => cabinId(c) === id)?.room;
  if (id[0] === 'H') return HALLS.find((h) => `H${h.deck}.${h.part}` === id)?.room;
  return undefined;
}
/** What's to find in a place: how many things, and how many are left (none: nothing there). */
const thingsIn = (ram: Uint8Array, id: string) => { const room = roomAt(id); return room === undefined ? { all: 0, left: 0 } : roomThings(ram, room); };
/** A place he's been where everything has been found: it shimmers (as Monty on the Run's rooms do). */
const cleared = (ram: Uint8Array, id: string) => { const t = thingsIn(ram, id); return t.all > 0 && t.left === 0; };
/** Under the map, the picked place's name and what's left there. */
function pickNote(ram: Uint8Array, id: string) {
  const t = thingsIn(ram, id);
  if (!t.all) return undefined;
  return t.left ? { text: `${t.left} LEFT`, colour: COL.lgrey } : { text: 'ALL FOUND', colour: COL.lgreen };
}
/** Frames the map has been drawn (the shimmer's step). */
let tick = 0;

/** The places he can be taken back to, by id, and where he first stood in each (for tests). */
export const travelPlaces = (found: BlackwycheFound) => found.ship.at;

export const blackwycheMap: PauseMap<Uint8Array, BlackwycheFound> = {
  found: FOUND,
  observe(ram, { ship: s }, vic) {
    followChain(ram, s.chain);
    const p = where(ram);
    if (!p) return;
    const id = placeId(p);
    // a way between decks, cabin to cabin, walked (the data's own, or one it doesn't show)
    if (p.kind === 'cabin' && s.last.startsWith('C') && s.last !== id) {
      const a = cabinOf(s.last), b = p, way = a.deck < b.deck ? `${s.last}>${id}` : `${id}>${s.last}`;
      if (Math.abs(a.deck - b.deck) === 1 && a.part === b.part && a.door === b.door && !DATA_WAYS.has(way) && !s.ways.includes(way)) s.ways.push(way);
    }
    s.last = id;
    if (p.kind === 'cabin') { if (!s.cabins.includes(id)) s.cabins.push(id); }
    else {
      const list = (s.panels[`${p.deck}.${p.part}`] ??= []), panel = ram[0x1f88];
      if (!list.includes(panel)) list.push(panel);
    }
    // A place to travel to is where he has stood on his feet (travel.ts `location`).
    const key = id;
    if (s.at[key]) return;
    const at = location(ram, vic);
    if (!at) { s.standing = { key: '', n: 0 }; return; }
    // (a cabin only once he has stayed on his feet in it: its trapdoor may open at once on the spot he comes in at)
    s.standing = s.standing.key === key ? { key, n: s.standing.n + 1 } : { key, n: 1 };
    if (s.standing.n >= (p.kind === 'cabin' ? STAND : 1)) { s.at[key] = at; s.standing = { key: '', n: 0 }; }
  },
  title(ram, page) {
    if (page === ITEMS_PAGE) return 'ITEMS';
    const p = where(ram);
    return p ? placeName(placeId(p)) : 'ABOARD THE BLACKWYCHE';
  },
  pages: () => ({ list: [0, ITEMS_PAGE], current: 0 }),
  draw(sf, box, ram, found, blink, page, font, pick) {
    if (page === ITEMS_PAGE) { if (font) drawItems(sf, box, font, ram); return; }
    const s = found.ship, L = layout(box), here = where(ram), t = tick++;
    const lit = (deck: number, part: number, panel: number) => (s.panels[`${deck}.${part}`] ?? []).includes(panel);
    // the ways down between cabins (drawn first, under the decks)
    for (const w of WAYS) {
      const a = CABINS[w.from], b = CABINS[w.to], x = L.x(a.part, a.door) + (U >> 1);
      const both = s.cabins.includes(cabinId(a)) && s.cabins.includes(cabinId(b));
      const colour = both ? COL.green : COL.dgrey;
      for (let y = L.top(a.deck) + 8; y < L.top(b.deck); y++) if (w.kind === 'ladder' || y % 2 === 0) sf.fillRect(x, y, 1, 1, colour);
    }
    for (const w of s.ways) {
      const [a, b] = w.split('>').map(cabinOf), x = L.x(a.part, a.door) + (U >> 1);
      sf.fillRect(x, L.top(a.deck) + 8, 1, L.top(b.deck) - L.top(a.deck) - 8, COL.green);
    }
    for (let deck = 1; deck <= PANELS.length; deck++) {
      const sy = L.strip(deck);
      font?.draw(sf, String(deck), box.x + 1, sy - 1, here?.deck === deck ? COL.yellow : COL.grey);
      // round the deck: from the second part's far end back to the hall at the first part's
      const wy = sy + 9, xa = L.x(3, 1) + 3, xb = L.x(1, 8) + U - 4;
      sf.fillRect(xa, wy, xb - xa + 1, 1, COL.dgrey); sf.fillRect(xa, sy + 6, 1, 3, COL.dgrey); sf.fillRect(xb, sy + 6, 1, 3, COL.dgrey);
      // the long parts' panels
      for (const part of [0, 1]) {
        const travel = !!s.at[placeId({ kind: 'deck', deck, part })];
        PANELS[deck - 1][part].forEach((_, panel) => {
          const on = lit(deck, part, panel);
          sf.fillRect(L.x(part, panel), sy, U - 1, 6, !on ? COL.dgrey : travel ? COL.yellow : COL.brown);
        });
      }
      // the halls at their ends
      for (const h of HALLS.filter((h) => h.deck === deck)) {
        const travel = !!s.at[placeId({ kind: 'hall', deck, part: h.part })];
        const done = cleared(ram, `H${deck}.${h.part}`);
        for (const panel of [1, 2]) {
          const on = lit(deck, h.part, panel);
          sf.fillRect(L.x(h.part, panel), sy - 1, U - 1, 8, !on ? COL.dgrey : done ? shimmerColour(t, column(h.part, panel)) : travel ? COL.cyan : COL.brown);
        }
      }
      // the cabins over their doors (a door the game hasn't opened yet only once he's been through it),
      // and any place he's found over or under a cabin with none of its own
      const extra = s.cabins.filter((id) => !DATA_CABINS.has(id)).map((id) => ({ ...cabinOf(id), hidden: false }));
      for (const c of [...CABINS, ...extra].filter((c) => c.deck === deck)) {
        const id = cabinId(c), been = s.cabins.includes(id);
        if (c.hidden && !been && ram[0x6e43 + 18 * (c.deck - 1) + 9 * c.part + c.door] !== 0x73) continue;
        const x = L.x(c.part, c.door), y = L.top(deck);
        sf.fillRect(x + 1, y, U - 3, 7, !been ? COL.dgrey : cleared(ram, id) ? shimmerColour(t, column(c.part, c.door) + deck) : s.at[id] ? COL.lblue : COL.brown);
        sf.fillRect(x + (U >> 1) - 1, y + 7, 1, sy - y - 7, been ? COL.grey : COL.dgrey);
      }
    }
    // where he is
    if (here && blink) {
      if (here.kind === 'cabin') sf.fillRect(L.x(here.part, here.door) + 1, L.top(here.deck), U - 3, 7, COL.white);
      else sf.fillRect(L.x(here.part, ram[0x1f88]), L.strip(here.deck) - (here.kind === 'hall' ? 1 : 0), U - 1, here.kind === 'hall' ? 8 : 6, COL.white);
    }
    drawPickName(sf, box, font, pick ? placeName(pick) : null, pick ? pickNote(ram, pick) : undefined);
  },
  info(ram, found) {
    return [`ENERGY ${String(statusNumber(ram, 0x07a2)).padStart(3)}%`, '', `ITEMS ${String(itemsFound(ram)).padStart(2)}/${ITEMS.length}`, `SEEN ${String(shipSeen(found)).padStart(2)}/${TOTAL}`];
  },
  legend: [{ colour: COL.cyan, text: 'HALL' }, { colour: COL.lblue, text: 'CABIN' }, { colour: COL.green, text: 'LADDER' }, { colour: COL.brown, text: 'NO TRAVEL' }],
  // Places to go back to: every part, hall and cabin he's stood in (yellow, cyan and blue, the picked box round the whole part; brown ones he has only passed), where he first stood.
  places(box, ram, found, page) {
    if (page === ITEMS_PAGE) return [];
    const s = found.ship, L = layout(box), here = where(ram), hereId = here ? placeId(here) : '';
    return Object.entries(s.at).map(([id, at]) => ({ id, ...spot(L, at), here: id === hereId }));
  },
  go(id, ram, found) {
    const s = found.ship, to = s.at[id];
    if (!to || !travel(ram, to, s.chain)) return false;
    s.chain = [];
    s.last = ''; // (not walked: no way between the two to draw)
    return true;
  },
};
