/**
 * A room as the Spectrum shows it before any sprite: the tiles as 1 bit a pixel (32 bytes a row, 192 rows) and the attribute
 * byte of each 8 x 8 cell (ink, paper, bright), with the HUD panel under the six rooms. Made from the data alone (test/rooms.ts
 * proves the tiles and attributes against the original's own drawing; the panel is the original's bytes).
 */
import { ENDING_ROOM, ENDING_TILES, MAP_COLUMNS, PANEL_ATTRS, PANEL_BITMAP, TILES, roomAttrs, roomMap } from './data';

export const PICTURE_WIDTH = 256;
export const PICTURE_HEIGHT = 192;
/** The first pixel row of the HUD panel (cell row 18). */
export const PANEL_TOP = 144;

export interface Picture {
  readonly bits: Uint8Array;
  readonly attrs: Uint8Array;
}

export function roomPicture(room: number): Picture {
  const bits = new Uint8Array(PICTURE_HEIGHT * 32);
  const attrs = new Uint8Array(768);
  const ending = room === ENDING_ROOM;
  const rows = ending ? 24 : 18;
  const tiles = ending ? ENDING_TILES : TILES;
  const map = roomMap(room);
  attrs.set(roomAttrs(room).subarray(0, rows * MAP_COLUMNS));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) {
      let tile = map[row * MAP_COLUMNS + col];
      if (tile >= 0xf0 && tile <= 0xf3 && !ending) tile -= 4; // an item already taken is shown again on entry
      if (tile === 0) continue;
      for (let line = 0; line < 8; line++) bits[(row * 8 + line) * 32 + col] = tiles[(tile - 1) * 8 + line];
    }
  }
  if (!ending) {
    // the panel is the bottom third of the original's bitmap: cell rows 18-23, in the Spectrum's interleaved layout
    for (let y = PANEL_TOP; y < PICTURE_HEIGHT; y++) {
      for (let col = 0; col < 32; col++) bits[y * 32 + col] = PANEL_BITMAP[((y & 7) << 8) + (((y >> 3) & 7) << 5) + col];
    }
    attrs.set(PANEL_ATTRS, 18 * 32);
  }
  return { bits, attrs };
}

/** The Spectrum colour index (0-15) of a cell's ink and of its paper, bright included. */
export function cellInk(attr: number): number { return (attr & 7) | ((attr >> 3) & 8); }
export function cellPaper(attr: number): number { return ((attr >> 3) & 7) | ((attr >> 3) & 8); }
