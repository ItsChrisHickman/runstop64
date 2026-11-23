import { gameText, textCode } from './lettering';
import { PLAY_COLS, PLAY_ROWS } from './screen';

/**
 * Rooms in runstop64's own format (written by hand, in the original's terms: a playfield map, tiles from the tile library,
 * coins, decorations, crushers, a teleporter, enemies), and what turns a list of them into the tables a Monty game's engine reads
 * (the original's formats: coin table, si_spawn_tbl, decoration list, piledriver and teleporter tables, enemy records...). Used
 * by Monty on the Run (runstop64's rooms after the original's, `montyotr/src/data.ts`) and by every game made of rooms like
 * these (Do Svidaniya Monty's, `montyworld/src/data.ts`). See `montyotr/src/data/runstop64-rooms.ts` for the format at work.
 *
 * Coordinates are the original's:
 * - `map`: the room's 32 × 20 playfield, one string per row, a character per cell: '.' empty, '1'-'8' the room's character codes
 *   (each takes `tiles[n-1]` from the tile library, coloured `colours[n-1]`, and the tile's collision class with it);
 * - coins: playfield column and row (as the coin table's);
 * - decorations, crushers, teleporters, enemies: screen column and row (the playfield starts at column 4, row 3);
 * - enemies: where the sprite starts (screen column and row of its top left), its colour (the game's colour table index), how
 *   it moves (an index into the direction flags: 0 right, 1 left, 3 up, 4 down), its type (graphics, 8-34), speed (pixels a
 *   step) and range (steps before it turns: they move on every other frame);
 * - teleporters: where they send Monty (as the teleporter destination table: his x2 and y, and the exit grid cell, which the
 *   room transition loads as if he walked in).
 */

/** An enemy: where it starts (screen column, row) and the original's record fields. */
interface EnemySpec {
  col: number; row: number;
  /** Index into the game's enemy colour table (0 black, 1 blue, 2 red, 3 purple, 4 green, 5 cyan, 6 yellow, 7 white, 8-15 the colours 8-15). */
  colour: number;
  /** Index into the direction flags: 0 right, 1 left (starting at the far end), 3 up (from the bottom), 4 down. */
  dir: 0 | 1 | 3 | 4;
  type: number; speed: number; range: number;
}

/** A sign, in the game's own lettering (its charset's capitals), on a board like MPL ST.'s. */
export interface Sign { text: string; colour: number }

/** A decoration: one of the original's types (a number), or a sign. */
interface DecorSpec { col: number; row: number; type: number | Sign }

export interface RoomSpec {
  id: number;
  /** Its cell in the exit grid. */
  row: number; col: number;
  /** Index into the game's sector names. */
  sector: number;
  /** Tile library index for room codes 1-8. */
  tiles: readonly number[];
  /** C64 colour for room codes 1-8. */
  colours: readonly number[];
  map: readonly string[];
  /** room_metadata_tbl: a code whose character animates (water, lava), 0 for none. */
  theme?: number;
  /** At most two (fun, not a high score from one room: Chris). */
  coins?: readonly (readonly [col: number, row: number])[];
  /** A piece of cake (the original's cupcake, as Monty finds them: 200 points): screen column and row of its sprite's top left. */
  cake?: readonly [col: number, row: number];
  /**
   * A special item of the game's own (a key item): which one (its name, for `specialIndex` finds it by), where
   * its sprite's top left is (screen column and row) and its sprite pointer in the game's bank. At most one with a cake, the
   * cake first.
   */
  item?: { name: string; col: number; row: number; sprite: number };
  decor?: readonly DecorSpec[];
  enemies?: readonly EnemySpec[];
  /** Mole Crushers (up to two): screen column and row of the shaft's top and its height (the first is drawn in the glyph bank at $10, the second at $22: `crusherChars`). */
  crushers?: readonly { col: number; row: number; height: number }[];
  /** The room's teleporter (one, as in the original's rooms). */
  teleporter?: {
    col: number; row: number; height: number; colour: number;
    to: { x2: number; y: number; mapRow: number; exitCol: number };
    /**
     * Special items (si_spawn_tbl indexes) the original's only way into the destination has taken, and the rooms there are
     * built on: the warp lands him with them found, so the rooms round it are as walking in leaves them (no score: they're the
     * way in's, not a find).
     */
    found?: readonly number[];
  };
}

/** A sector name (shown under the playfield): column, text (as the original's). */
export interface Sector { readonly col: number; readonly text: string }

/** One room as the engine draws it: the tiles and colours of its codes 1-8 and its 32 × 20 cells of codes. */
export interface RoomDef {
  id: number;
  tiles: number[]; // tile library index for room char codes 1-8
  colours: number[]; // C64 colour for room char codes 1-8
  cells: Uint8Array; // 32 × 20 char codes
}

/** A decoration type: w × h characters (8 bytes each) and their colour(s). */
export interface DecorType { w: number; h: number; chr: Uint8Array; colour: number | Uint8Array }

/** The tables of a game's own rooms, in the original's formats (what `buildRooms` adds to, and returns). */
export interface RoomTables {
  roomDef(id: number): RoomDef;
  /** The enemy records (7 bytes each, $FF after them), as SetupRoom reads the original's. */
  enemyRecords(id: number): Uint8Array;
  /** si_spawn_tbl: 4 bytes an item (room, sprite x halved, sprite y, frame base: pointer - $8E). */
  specialItems: Uint8Array;
  /** 3 bytes a coin: room, playfield column, row. */
  coinTable: Uint8Array;
  /** 4 numbers a decoration: room, column, row, type (an index into `decorTypes`, which may pass 255: a Uint16Array). */
  decorRooms: Uint16Array;
  decorTypes: readonly DecorType[];
  /** 5 bytes a crusher: room, column, row, height, characters. */
  piledriverCfg: Uint8Array;
  /** 5 bytes a teleporter: room, column, row, height, colour. */
  teleporterCfg: Uint8Array;
  /** 4 bytes a teleporter (the same order): x2, y, exit column, map row. */
  teleporterDests: Uint8Array;
  /** The special items a room's warp has taken (by the room the warp is in). */
  warpFound: ReadonlyMap<number, readonly number[]>;
  /** room_metadata_tbl, by room id. */
  roomMeta: Uint8Array;
  sectorNames: readonly Sector[];
  /** By room id: an index into `sectorNames`. */
  sectorIdx: Uint8Array;
}

/** The tables of a game's rooms before ours: the original's, for a game that has some (`NO_ROOMS` for one that has none). */
export interface BaseRooms {
  /** How many rooms there are (their ids are 0 to count - 1: the tables indexed by room id keep that many entries). */
  count: number;
  roomDef(id: number): RoomDef;
  enemyRecords(id: number): Uint8Array;
  specialItems: Uint8Array;
  coinTable: Uint8Array;
  decorRooms: Uint16Array;
  decorTypes: readonly DecorType[];
  piledriverCfg: Uint8Array;
  teleporterCfg: Uint8Array;
  teleporterDests: Uint8Array;
  roomMeta: Uint8Array;
  sectorNames: readonly Sector[];
  sectorIdx: Uint8Array;
}

const none = new Uint8Array(0);
/** No rooms of its own before ours. */
export const NO_ROOMS: BaseRooms = {
  count: 0,
  roomDef(id) { throw new Error(`no room $${id.toString(16)}`); },
  enemyRecords: () => Uint8Array.of(0xff),
  specialItems: none, coinTable: none, decorRooms: new Uint16Array(0), decorTypes: [], piledriverCfg: none, teleporterCfg: none,
  teleporterDests: none, roomMeta: none, sectorNames: [], sectorIdx: none,
};

/** The frame base of the cupcake in si_spawn_tbl (sprite pointer $91). */
/**
 * The characters a room's nth crusher is drawn in. The engine animates the first crusher on the glyph bank at 0x10 and, only when a room
 * has two, the second on the bank at 0x22 (`piledriverAnimate`): a lone crusher drawn in 0x22 never moves. So the data does not choose.
 */
const crusherChars = (nth: number): 0x10 | 0x22 => (nth === 0 ? 0x10 : 0x22);
const CUPCAKE_FRAME = 3;
/** si_spawn_tbl's frame base for a sprite pointer (the table adds $8E). */
const frameBase = (sprite: number) => (sprite - 0x8e) & 0xff;

/**
 * The special items our rooms add, in si_spawn_tbl's order (the rooms' order; a room's cake, then its item), after the
 * `first` the base has: each as the cake it is or the name of the item. A game finds the number of an item (the index
 * `roomEffects`, `progress` and the costumes use) here.
 */
export function listSpecials(rooms: readonly RoomSpec[], first = 0): readonly { room: number; index: number; item: string | null }[] {
  return rooms.flatMap((r) => [...(r.cake ? [null] : []), ...(r.item ? [r.item.name] : [])].map((item) => ({ room: r.id, item })))
    .map((e, i) => ({ ...e, index: first + i }));
}

/** The index of a named special item. */
export function specialIndex(rooms: readonly RoomSpec[], name: string, first = 0): number {
  const at = listSpecials(rooms, first).find((e) => e.item === name);
  if (!at) throw new Error(`no special item '${name}'`);
  return at.index;
}
const MAP_CODES = '.12345678';
const hex = (id: number) => id.toString(16);

function roomDefOf(r: RoomSpec): RoomDef {
  if (r.map.length !== PLAY_ROWS || r.map.some((l) => l.length !== PLAY_COLS)) throw new Error(`room $${hex(r.id)}: its map isn't ${PLAY_COLS} × ${PLAY_ROWS}`);
  const cells = Uint8Array.from(r.map.join(''), (c) => {
    const code = MAP_CODES.indexOf(c);
    if (code < 0) throw new Error(`room $${hex(r.id)}: '${c}' in its map`);
    return code;
  });
  return { id: r.id, tiles: [...r.tiles], colours: [...r.colours], cells };
}

function enemyRecordsOf(r: RoomSpec): Uint8Array {
  const out: number[] = [];
  for (const e of r.enemies ?? []) {
    const sx = e.col * 4 + 0x0c, sy = e.row * 8 + 0x32; // the sprite's x (halved) and y at that screen cell
    out.push(e.colour, (sx - 0x1c) * 2, 0xf9 - sy, e.dir, e.type, e.speed, e.range);
  }
  out.push(0xff);
  return Uint8Array.from(out);
}

/** A sign as a decoration type: the game's capitals (screen codes $40-$7F of its charset) cut out of a board, its ends rounded, as MPL ST. is. */
function signType(sign: Sign, bank: Uint8Array): DecorType {
  const text = ` ${gameText(sign.text)} `;
  const chr = new Uint8Array(text.length * 8);
  for (let i = 0; i < text.length; i++) {
    const code = textCode(text.charAt(i));
    for (let y = 0; y < 8; y++) chr[i * 8 + y] = ~bank[code * 8 + y] & 0xff;
  }
  const last = (text.length - 1) * 8;
  chr[0] &= 0x7f; chr[7] &= 0x7f; chr[last] &= 0xfe; chr[last + 7] &= 0xfe;
  return { w: text.length, h: 1, chr, colour: sign.colour };
}

/**
 * The tables with `rooms` added after the base's own entries, in the original's formats (the base's rooms read exactly what they
 * did). `sectors` are added after the base's sector names (a room's `sector` indexes them); `bank` is the VIC bank the signs'
 * letters are cut from; `cakeSprite` is the sprite pointer a room's `cake` is drawn with (the cupcake's by default: a game with a food of its own gives its own).
 */
export function buildRooms(base: BaseRooms, rooms: readonly RoomSpec[], sectors: readonly Sector[], bank: Uint8Array, cakeSprite = CUPCAKE_FRAME + 0x8e): RoomTables {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const merged = (original: Uint8Array, entries: (r: RoomSpec) => number[][]) => Uint8Array.from([...original, ...rooms.flatMap((r) => entries(r).flat())]);
  /** A table indexed by room id, our rooms' entries put in at their ids (past the base's rooms: bytes no room read). */
  const byRoom = (original: Uint8Array, value: (r: RoomSpec) => number) => {
    const out = new Uint8Array(Math.max(original.length, ...rooms.map((r) => r.id + 1)));
    out.set(original.subarray(0, base.count));
    for (const r of rooms) out[r.id] = value(r);
    return out;
  };

  const signs: Sign[] = [];
  const signIndex = (s: Sign) => {
    const at = signs.findIndex((t) => t.text === s.text && t.colour === s.colour);
    return base.decorTypes.length + (at >= 0 ? at : signs.push(s) - 1);
  };
  const decorRooms = Uint16Array.from([...base.decorRooms, ...rooms.flatMap((r) => (r.decor ?? []).map((d) => [r.id, d.col, d.row, typeof d.type === 'number' ? d.type : signIndex(d.type)]).flat())]);
  const tele = rooms.flatMap((r) => (r.teleporter ? [{ id: r.id, t: r.teleporter }] : []));

  return {
    roomDef(id) {
      const r = byId.get(id);
      return r ? roomDefOf(r) : base.roomDef(id);
    },
    enemyRecords(id) {
      const r = byId.get(id);
      return r ? enemyRecordsOf(r) : base.enemyRecords(id);
    },
    // the cake: the original's cupcake (frame base 3, pointer $91, 200 points), in each room that has one
    specialItems: merged(base.specialItems, (r) => [
      ...(r.cake ? [[r.id, r.cake[0] * 4 + 0x0c, r.cake[1] * 8 + 0x32, frameBase(cakeSprite)]] : []),
      ...(r.item ? [[r.id, r.item.col * 4 + 0x0c, r.item.row * 8 + 0x32, frameBase(r.item.sprite)]] : []),
    ]),
    coinTable: merged(base.coinTable, (r) => (r.coins ?? []).map(([c, row]) => [r.id, c, row])),
    decorRooms,
    decorTypes: [...base.decorTypes, ...signs.map((s) => signType(s, bank))],
    piledriverCfg: merged(base.piledriverCfg, (r) => (r.crushers ?? []).map((p, i) => [r.id, p.col, p.row, p.height, crusherChars(i)])),
    teleporterCfg: Uint8Array.from([...base.teleporterCfg, ...tele.flatMap(({ id, t }) => [id, t.col, t.row, t.height, t.colour])]),
    teleporterDests: Uint8Array.from([...base.teleporterDests, ...tele.flatMap(({ t }) => [t.to.x2, t.to.y, t.to.exitCol, t.to.mapRow])]),
    warpFound: new Map(tele.map(({ id, t }) => [id, t.found ?? []])),
    roomMeta: byRoom(base.roomMeta, (r) => r.theme ?? 0),
    sectorNames: [...base.sectorNames, ...sectors],
    sectorIdx: byRoom(base.sectorIdx, (r) => base.sectorNames.length + r.sector),
  };
}

/** An exit grid of `size` cells ($FF: no room) with `rooms` in their cells. */
export function roomCells(size: number, cols: number, rooms: readonly RoomSpec[]): Uint8Array {
  const grid = new Uint8Array(size).fill(0xff);
  for (const r of rooms) {
    const at = r.row * cols + r.col;
    if (grid[at] !== 0xff) throw new Error(`room $${hex(r.id)}: its cell is another room's`);
    grid[at] = r.id;
  }
  return grid;
}

/** Throws if one of `rooms` stands in a cell of a grid that already has a room (the original's). */
export function checkFree(grid: Uint8Array, cols: number, rooms: readonly RoomSpec[]): void {
  for (const r of rooms) if (grid[r.row * cols + r.col] !== 0xff) throw new Error(`room $${hex(r.id)}: its cell is the original's`);
}

// ---- a game's own graphics on top of Monty on the Run's -------------------------------------------------------------

/** A tile of a game's own: its 8 bytes and its collision class (0 nothing, 1 solid, 2 a floor, 3 a rope, 4 deadly). */
export interface TileArt { readonly chr: Uint8Array; readonly cls: number }

/**
 * A tile library with tiles of a game's own after the base's (their indexes follow the base's: 121 and up for Monty on the Run's),
 * and the collision class of each: the base's rule for its own tiles, the tile's `cls` for ours.
 */
export function extendTiles(base: { tileLibrary: Uint8Array; tileProperty(tile: number): number }, tiles: readonly TileArt[]) {
  const first = base.tileLibrary.length / 8;
  const tileLibrary = Uint8Array.from([...base.tileLibrary, ...tiles.flatMap((t) => [...t.chr])]);
  return {
    tileLibrary,
    tileProperty: (tile: number) => (tile >= first ? tiles[tile - first]?.cls ?? 0 : base.tileProperty(tile)),
  };
}

/** A creature of a game's own: 8 frames of 32 bytes, and whether frames 0-3 stand for 4-7. */
export interface CreatureArt { readonly frames: Uint8Array; readonly copy: boolean }

/** The enemy bank with creatures of a game's own after the base's: types from `firstType` up (Monty on the Run's are 8-34, so 35). */
export function extendEnemies(
  base: { enemyBank(type: number): Uint8Array; enemyCopyFlag(type: number): number },
  creatures: readonly CreatureArt[],
  firstType: number,
) {
  const own = (type: number) => (type >= firstType ? creatures[type - firstType] : undefined);
  return {
    enemyBank: (type: number) => own(type)?.frames ?? base.enemyBank(type),
    enemyCopyFlag: (type: number) => { const c = own(type); return c ? (c.copy ? 1 : 0) : base.enemyCopyFlag(type); },
  };
}

/** A VIC bank with sprite blocks of a game's own put in at their pointers (63 bytes each: the tables point at them: items, icicles). */
export function extendBank(base: Uint8Array, blocks: readonly { ptr: number; block: Uint8Array }[]): Uint8Array {
  const out = Uint8Array.from(base);
  for (const { ptr, block } of blocks) out.set(block, ptr * 64);
  return out;
}
