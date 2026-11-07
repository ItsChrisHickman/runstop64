/**
 * A room of Wanted: Monty Mole as the original stores it (re/README.md, "Rooms"), and the picture the game draws from it.
 *
 * The original keeps 21 rooms of 512 bytes from $9A2A and copies the current one to $C42A. This is the same record, taken
 * apart. The map is 20 rows of 32 cells, a cell a tile number 0-7 (the room's own eight tiles: an attribute byte and 8
 * rows of pixels each); the picture the game draws from it is the room area of the Spectrum screen, below the two
 * rows of the score and above the two rows of the lives.
 */

/** An 8 x 8 tile: its colour attribute (bright, paper, ink) and its eight rows of pixels, top first. */
export interface Tile {
  readonly attr: number;
  readonly rows: readonly number[];
}

/** The four rooms a room leads to (its own number where there is no way out). */
export interface Exits {
  readonly up: number;
  readonly down: number;
  readonly left: number;
  readonly right: number;
}

/** A coal piece (or what the room has to collect): its number in the game-wide list and its cell. */
export interface Coal {
  readonly id: number;
  readonly col: number;
  readonly row: number;
}

export interface RoomData {
  readonly id: number;
  /** 20 rows of 32 digits, each a tile number 0-7 */
  readonly map: readonly string[];
  /** the room's eight tiles */
  readonly tiles: readonly Tile[];
  /** four colour attributes the physics looks for in the picture: floor, deadly, ladder-like, and a fourth (read, see re/README.md) */
  readonly classes: readonly number[];
  /** where the sprite frames of Monty are kept for this room ($849C in most rooms, $7800 in the castle) */
  readonly spriteBase: number;
  readonly exits: Exits;
  /** the room's one drawn object: a sprite frame number (0 = none) at x, y */
  readonly object: { readonly x: number; readonly y: number; readonly sprite: number };
  /** the crusher: x, y, lowest y, wait, direction, highest y (all 0 where the room has none) */
  readonly crusher: readonly number[];
  /** the 8 rows of the piece the room has to collect */
  readonly nugget: readonly number[];
  /** the (up to five) pieces of coal: entries with a zero cell are unused */
  readonly coal: readonly Coal[];
  /** six enemy records of 20 bytes each (read: re/README.md, "Enemies") */
  readonly enemies: readonly (readonly number[])[];
  /** the retractable floor: 7 bytes (read) */
  readonly floor: readonly number[];
}

export const ROOM_COLS = 32;
export const ROOM_ROWS = 20;
/** the room area starts at this character row of the screen */
export const ROOM_TOP_ROW = 2;

/** The screen's 6144-byte bitmap and 768 attribute bytes, as the game's own memory lays them out. */
export interface ScreenImage {
  readonly bitmap: Uint8Array;
  readonly attrs: Uint8Array;
}

/** The address of a pixel row's first byte in the bitmap, counted from $4000. */
export function bitmapRow(y: number): number {
  return ((y & 0xc0) << 5) + ((y & 7) << 8) + ((y & 0x38) << 2);
}

/** A tile number of a cell (0-7); a map that is not 20 x 32 digits 0-7 is a mistake in the data. */
export function tileAt(room: RoomData, col: number, row: number): number {
  const ch = room.map[row]?.charCodeAt(col);
  if (ch === undefined || ch < 48 || ch > 55) throw new Error(`room ${room.id}: no tile at column ${col}, row ${row}`);
  return ch - 48;
}

/**
 * The picture of a room made from its data alone: what the original's room drawing ($FDD5) leaves in its picture buffer
 * and its attribute buffer. Only the room's rows (2 to 21) are drawn; the rest is blank.
 */
export function drawRoom(room: RoomData): ScreenImage {
  const bitmap = new Uint8Array(6144);
  const attrs = new Uint8Array(768);
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const tile = room.tiles[tileAt(room, col, row)];
      if (tile === undefined) throw new Error(`room ${room.id}: the tile table is short`);
      const y = (ROOM_TOP_ROW + row) * 8;
      for (let line = 0; line < 8; line++) bitmap[bitmapRow(y + line) + col] = tile.rows[line] ?? 0;
      attrs[(ROOM_TOP_ROW + row) * 32 + col] = tile.attr;
    }
  }
  return { bitmap, attrs };
}
