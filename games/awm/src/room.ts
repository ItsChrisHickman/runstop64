/**
 * Auf Wiedersehen Monty's rooms as data: decoding a room the way the original's room routines do
 * (re/README.md: $58D4 the RLE unpacker, $694F the items, $570D the screen and colour draw), and
 * drawing the play area as the VIC shows it (characters, ECM backgrounds), for checking against
 * the original. Pure: no machine, no DOM.
 */

/** The play area: 32 × 18 characters, at screen columns 4-35, rows 0-17. */
export const COLS = 32;
export const ROWS = 18;
export const CELLS = COLS * ROWS;
/** Screen column of the play area's first character. */
export const SCREEN_COL = 4;
export const ROOM_COUNT = 80;

/** The 15 tiles' names (header bytes 0-14) and attributes (15-29), then the RLE of the 576 cells. */
export interface Room {
  /** Tile n (1-15) is drawn from the tile graphics at name[n-1] (8 bytes each); $D2-$DA are animated tiles. */
  readonly names: readonly number[];
  /** Tile n's attribute: bits 0-2 colour (through `COLOUR_OF`), bits 4-5 the ECM background. */
  readonly attrs: readonly number[];
  /** The run-length-coded cells: a byte is (tile << 4) | count (a count of 0 is 256). */
  readonly rle: readonly number[];
  /** What follows the cells up to the next room's pointer: the $00 that ends a room, and in rooms 76-79 more (re/README.md). */
  readonly extra: readonly number[];
}

/** Colour index (attribute bits 0-2) to colour RAM value ($579A). */
export const COLOUR_OF = [0, 6, 2, 4, 5, 3, 7, 1] as const;
/** The VIC's background colours in play ($D021-$D024, set at $5650). */
export const BACKGROUNDS = [0, 0, 2, 5, 1] as const;

/** Names from here to $DA mark animated tiles (the unpacker keeps them as codes $6D-$75). */
const ANIMATED_FIRST = 0xd2;
const ANIMATED_END = 0xdb;

/** Parse a room from its bytes (30-byte header, RLE until it has made 576 cells, the last run may run past the end; whatever follows). */
export function parseRoom(bytes: Uint8Array): Room {
  if (bytes.length < 30) throw new Error('room data shorter than its header');
  let cells = 0, at = 30;
  while (cells < CELLS) {
    if (at >= bytes.length) throw new Error('room data ends inside its RLE');
    cells += bytes[at] & 15 || 256;
    at++;
  }
  return { names: Array.from(bytes.subarray(0, 15)), attrs: Array.from(bytes.subarray(15, 30)), rle: Array.from(bytes.subarray(30, at)), extra: Array.from(bytes.subarray(at)) };
}

/**
 * The cells the unpacker ($58D4) leaves at $0800: rows of 32, the even rows left to right, the odd
 * ones right to left. A cell is the tile (0 empty, 1-15), or $6D-$75 where the tile's name is an
 * animated one ($D2-$DA: the code is the name less $65).
 */
export function unpackCells(room: Room): Uint8Array {
  const cells = new Uint8Array(CELLS);
  let at = 0, run = 0, tile = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let i = 0; i < COLS; i++) {
      if (run === 0) {
        const b = room.rle[at++];
        if (b === undefined) throw new Error('RLE ends early');
        run = b & 15 || 256;
        tile = b >> 4;
        const name = tile === 0 ? 0 : room.names[tile - 1] ?? 0;
        if (tile !== 0 && name >= ANIMATED_FIRST && name < ANIMATED_END) tile = name - 0x65;
      }
      cells[row * COLS + (row & 1 ? COLS - 1 - i : i)] = tile;
      run--;
    }
  }
  return cells;
}

/** An item the room holds ($6D7B table: 3 bytes each: room; type | cell low bits << 5; cell high bits). */
interface ItemEntry { readonly room: number; readonly type: number; readonly cell: number }

/** The item list's entries ($6D7B, 236 of 3 bytes: room, type (bits 0-4) with the cell's low 3 bits in 5-7, the cell's high bits). */
export function itemEntries(bytes: Uint8Array): ItemEntry[] {
  const out: ItemEntry[] = [];
  for (let i = 0; i + 2 < bytes.length; i += 3) {
    out.push({ room: bytes[i] & 0x7f, type: bytes[i + 1] & 0x1f, cell: (bytes[i + 2] << 3) | (bytes[i + 1] >> 5) });
  }
  return out;
}

/** The first four items of a room put into its cells ($694F), as 2 × 2 characters from $2F + 4 × slot. */
function itemsOf(entries: readonly ItemEntry[], room: number): ItemEntry[] {
  return entries.filter((e) => e.room === room).slice(0, 4);
}

/** The game's shared tables an image of a room needs. */
export interface RoomTables {
  /** Tile graphics: 8 bytes per name, from $2A40. */
  readonly tileGfx: Uint8Array;
  /** The character set at $3800 (256 characters in the VIC's bank; only the first 64 are used in ECM). */
  readonly charset: Uint8Array;
  /** The items' graphics: 32 types of 4 characters, in the order the game copies them ($2640, 32 bytes a type). */
  readonly itemGfx: Uint8Array;
  /** The items' colours: 4 bytes per type ($597C). */
  readonly itemColours: Uint8Array;
  readonly items: readonly ItemEntry[];
}

/** What a room puts on the screen: per cell the screen code (with the ECM background in bits 6-7) and colour RAM, and the 64 characters it uses. */
interface RoomScreen {
  readonly codes: Uint8Array;
  readonly colours: Uint8Array;
  readonly chars: Uint8Array;
}

/**
 * The room as the game's room draw makes it ($5581 on: the tile graphics into characters 1-15, the
 * items into 47-62, the cells to the screen at $570D with colour RAM from the tiles' attributes).
 */
export function drawRoom(room: Room, t: RoomTables, roomNo: number): RoomScreen {
  const cells = unpackCells(room);
  const items = itemsOf(t.items, roomNo);
  items.forEach((e, slot) => {
    const c = 0x2f + 4 * slot;
    cells[e.cell] = c;
    cells[e.cell + 1] = c + 2;
    cells[e.cell + COLS] = c + 1;
    cells[e.cell + COLS + 1] = c + 3;
  });
  return drawCells(room, t, cells, items);
}

/**
 * The same from cells already made (the game's own, with the items put in, or taken): `items` are the room's four
 * slots' entries, in slot order. The cells are put into the screen as they are; the items' graphics go into their characters.
 */
export function drawCells(room: Room, t: RoomTables, cellsIn: Uint8Array, items: readonly ItemEntry[]): RoomScreen {
  const cells = cellsIn;
  const chars = t.charset.slice(0, 64 * 8);
  chars.fill(0, 0, 8);
  room.names.forEach((name, i) => chars.set(t.tileGfx.subarray(name * 8, name * 8 + 8), (i + 1) * 8));
  const itemColour: number[] = new Array<number>(16).fill(0);
  items.forEach((e, slot) => {
    // ($6A09: the type's 32 bytes, two interleaved bytes a character-pair, into characters 47 + 4 × slot ...)
    for (let k = 0; k < 16; k++) {
      chars[(0x2f + 4 * slot) * 8 + k] = t.itemGfx[e.type * 32 + k * 2] ?? 0;
      chars[(0x2f + 4 * slot) * 8 + 16 + k] = t.itemGfx[e.type * 32 + k * 2 + 1] ?? 0;
    }
    for (let k = 0; k < 4; k++) itemColour[slot * 4 + k] = t.itemColours[e.type * 4 + k] ?? 0;
  });
  const codes = new Uint8Array(CELLS), colours = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    let c = cells[i];
    if (c >= 0x3f) {
      // an animated tile's code: the highest tile of that name (the loop at $5718 counts down)
      const name = c + 0x65;
      let x = 15;
      while (x >= 0 && (x === 0 ? 0 : room.names[x - 1]) !== name) x--;
      c = x >= 0 ? x : c;
    }
    if (c === 0) continue;
    let attr: number;
    if (c >= 0x2f && c < 0x3f) attr = itemColour[c - 0x2f];
    else attr = room.attrs[c - 1] ?? 0;
    codes[i] = c | ((attr << 2) & 0xc0);
    colours[i] = COLOUR_OF[attr & 7];
  }
  return { codes, colours, chars };
}

/** The play area as C64 colour indexes (256 × 144), drawn as the VIC does in extended colour mode with hires characters. */
export function renderRoom(s: RoomScreen): Uint8Array {
  const W = COLS * 8, px = new Uint8Array(W * ROWS * 8);
  for (let i = 0; i < CELLS; i++) {
    const code = s.codes[i], ch = code & 0x3f, bg = BACKGROUNDS[(code >> 6) + 1] ?? 0, fg = s.colours[i] & 15;
    const cx = (i % COLS) * 8, cy = Math.floor(i / COLS) * 8;
    for (let y = 0; y < 8; y++) {
      const bits = s.chars[ch * 8 + y];
      for (let x = 0; x < 8; x++) px[(cy + y) * W + cx + x] = bits & (0x80 >> x) ? fg : bg;
    }
  }
  return px;
}
