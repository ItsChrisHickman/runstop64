import { ROOM_COLS, ROOM_ROWS, ROOM_TOP_ROW, type RoomData, type Tile } from '../../montymole/src/room';
import { tileLibrary } from '../../montyotr/src/data';
import { coalOf, waterBeds } from './fixes';

/**
 * Wanted: Monty Mole's rooms redrawn with Monty on the Run's tiles (prototype of docs/montymole-remix-plan.md, "The mapping").
 *
 * A Wanted room is 32 x 20 cells of 8 x 8, the same grid as Monty on the Run's playfield, so a cell is a cell: no scaling. What a cell
 * *is* to the physics is read from the Wanted data (its class attribute, and whether it has pixels on its top row), put into a role,
 * and each role is drawn with a tile of Monty on the Run's library in the colour the Wanted tile has on the Spectrum (as a C64 colour).
 * Each room comes out as the eight tiles and the 32 x 20 codes (0 empty, 1-8 a tile) Monty on the Run's rooms are made of.
 */

/** What a cell is to Monty: the classes of the shared physics (montyotr/src/data.ts `tileProperty`). */
export type Role = 'solid' | 'platform' | 'rope' | 'deadly' | 'decor';

/** The collision class of each role in Monty on the Run's physics (0 none, 1 solid, 2 platform (holds from above), 3 rope, 4 hazard). */
export const PROP: Readonly<Record<Role, number>> = { solid: 1, platform: 2, rope: 3, deadly: 4, decor: 0 };

/** One of a room's eight tiles: eight rows of pixels, a C64 colour (hires: 0-7), and the role it plays. */
export interface Slot {
  readonly role: Role;
  readonly rows: Uint8Array;
  readonly colour: number;
  readonly prop: number;
  /** Monty on the Run's tile it is (the library index), or null for decor drawn with Wanted's own pixels. */
  readonly tile: number | null;
}

export interface Coal { readonly id: number; readonly col: number; readonly row: number }

export interface RemixRoom {
  readonly id: number;
  /** 32 x 20 codes: 0 empty, 1-8 the slot (code - 1) */
  readonly cells: Uint8Array;
  readonly slots: readonly Slot[];
  /** the coal's cells, in playfield coordinates (row 0 is the first row of the room) */
  readonly coal: readonly Coal[];
  /** the room's theme animation (Monty on the Run's roomMeta byte: bit 7 turns the rows of the tile in slot `flags & 7` upwards): its water */
  readonly theme: number;
  /** the code (1-8) of the platform tile the retractable floor is made of; 0 where the room has no floor */
  readonly floorCode: number;
}

// ---- colours ---------------------------------------------------------------------------------

/**
 * Spectrum colour (0-7) to C64 colour. A character in hires mode has colours 0-7 (bit 3 of colour RAM makes it multicolour, a
 * different tile format), which is what Monty on the Run's tiles are drawn in, so bright and normal are one colour.
 */
export const C64_OF = [0, 6, 2, 4, 5, 3, 7, 1] as const;

/** A Spectrum ink (0-7) as the C64 colour of a thing drawn on the remix's black: Wanted's black ink (on its coloured paper) is white here, or it would not be seen. */
export const inkOnBlack = (ink: number): number => (ink === 0 ? 1 : C64_OF[ink] ?? 1);

/** A tile's colour: its paper where it has one (a brick on yellow is a yellow brick), else its ink. */
function colourOf(attr: number): number {
  const paper = (attr >> 3) & 7;
  return C64_OF[paper !== 0 ? paper : attr & 7] ?? 1;
}

// ---- roles -----------------------------------------------------------------------------------

const popcount = (rows: readonly number[]): number => rows.reduce((n, r) => n + [...r.toString(2)].filter((b) => b === '1').length, 0);

/**
 * The class a tile's attribute has in this room (RoomData.classes: floor, deadly, rope, and a fourth that is a floor too), or null.
 * (Wanted finds these by colour in the screen's attributes, so what is solid is a colour.)
 */
function classOf(room: RoomData, tile: Tile): 'floor' | 'deadly' | 'rope' | null {
  const at = room.classes.indexOf(tile.attr);
  if (at < 0) return null;
  return at === 1 ? 'deadly' : at === 2 ? 'rope' : 'floor';
}

/** The role of one Wanted tile; null for a blank one (nothing drawn, no class). */
export function roleOf(room: RoomData, tile: Tile): Role | null {
  const pixels = popcount(tile.rows);
  const cls = classOf(room, tile);
  if (cls === 'floor') return pixels === 0 ? null : 'solid';
  if (cls === 'deadly') return 'deadly';
  if (cls === 'rope') return 'rope';
  if (pixels === 0) return null;
  // Not a class: what is drawn holds Monty from above when it has pixels on its top row (the original's floor is the picture
  // under his feet), and is scenery otherwise.
  return (tile.rows[0] ?? 0) !== 0 ? 'platform' : 'decor';
}

// ---- Monty on the Run's tiles for each role --------------------------------------------------

/** The library tiles the roles are drawn with (montyotr tile library; the look of its rooms: bricks, thin ledges, ropes, water). */
export const LIBRARY = {
  brick: 0x01,
  rock: 0x08,
  ledge: 0x3a,
  toothed: 0x3b,
  rope: 0x5f,
  chain: 0x60,
  waves: 0x53,
  /** Monty on the Run's lava and water: its rooms turn it a row a step */
  water: 0x4f,
} as const;

export function libraryRows(tile: number): Uint8Array {
  return tileLibrary.subarray(tile * 8, tile * 8 + 8);
}

function pick(role: Role, tile: Tile, order: number): number | null {
  const pixels = popcount(tile.rows);
  switch (role) {
    case 'solid': return pixels >= 36 && order % 2 === 0 ? LIBRARY.brick : LIBRARY.rock;
    case 'platform': return pixels >= 24 ? LIBRARY.toothed : LIBRARY.ledge;
    case 'rope': return order % 2 === 0 ? LIBRARY.rope : LIBRARY.chain;
    case 'deadly': return LIBRARY.water;
    case 'decor': return null;
  }
}

/** The rooms already made (a room is made once: the game loads one every time Monty comes into it, and the bot copies the game millions of times). */
const MADE = new WeakMap<RoomData, RemixRoom>();

/** A Wanted room as Monty on the Run's tiles and codes. */
export function retile(room: RoomData): RemixRoom {
  const made = MADE.get(room);
  if (made !== undefined) return made;
  const out = build(room);
  MADE.set(room, out);
  return out;
}

function build(room: RoomData): RemixRoom {
  const slots: Slot[] = [];
  const code: (number | null)[] = [];
  const seen: Record<Role, number> = { solid: 0, platform: 0, rope: 0, deadly: 0, decor: 0 };
  const used = new Set(room.map.join(''));
  room.tiles.forEach((tile, i) => {
    const role = i === 0 || !used.has(String(i)) ? null : roleOf(room, tile);
    if (role === null) { code.push(null); return; }
    const lib = pick(role, tile, seen[role]++);
    const rows = lib === null ? Uint8Array.from(tile.rows) : libraryRows(lib);
    code.push(slots.length + 1);
    slots.push({ role, rows, colour: colourOf(tile.attr), prop: PROP[role], tile: lib });
  });
  const cells = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  for (let r = 0; r < ROOM_ROWS; r++) {
    const line = room.map[r] ?? '';
    for (let c = 0; c < ROOM_COLS; c++) cells[r * ROOM_COLS + c] = code[line.charCodeAt(c) - 48] ?? 0;
  }
  // the bed of the water is water (fixes.ts)
  const classOf = (code: number): number => (code >= 1 && code <= 8 ? slots[code - 1]?.prop ?? 0 : 0);
  const was = cells.slice();
  for (const bed of waterBeds(was, classOf)) cells[bed] = deadlyAbove(was, bed, classOf);
  // the retractable floor is drawn with a platform tile: the room's own, or a thin ledge of its own in the next slot
  let floorCode = 0;
  if (room.floor.some((b) => b !== 0)) {
    const own = slots.findIndex((k) => k.role === 'platform');
    if (own >= 0) floorCode = own + 1;
    else {
      slots.push({ role: 'platform', rows: libraryRows(LIBRARY.ledge), colour: 1, prop: PROP.platform, tile: LIBRARY.ledge });
      floorCode = slots.length;
    }
  }
  if (slots.length > 8) throw new Error(`room ${room.id}: ${slots.length} kinds of cell, Monty on the Run's rooms have eight`);
  const water = slots.findIndex((k) => k.role === 'deadly');
  const theme = water >= 0 ? 0x80 | water : 0;
  const coal = coalOf(room, ROOM_TOP_ROW);
  return { id: room.id, cells, slots, coal, theme, floorCode };
}

/** The deadly tile over a cell: the code of the first deadly cell up its column. */
function deadlyAbove(cells: Uint8Array, at: number, classOf: (code: number) => number): number {
  for (let k = at - ROOM_COLS; k >= 0; k -= ROOM_COLS) if (classOf(cells[k] ?? 0) === 4) return cells[k] ?? 0;
  return 0;
}

/** The role of the cell at (col, row): what the shared physics will see. */
export function roleAt(room: RemixRoom, col: number, row: number): Role | null {
  const code = room.cells[row * ROOM_COLS + col] ?? 0;
  return code === 0 ? null : room.slots[code - 1]?.role ?? null;
}
