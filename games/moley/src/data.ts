/**
 * The game's data as typed tables, from the generated hex (data/*.ts, made by re/extract.ts from the original; test/data.ts
 * proves it against the original running).
 */
import { ATTRS_HEX, ENDING_TILES_HEX, MAPS_HEX, TILES_HEX } from './data/rooms-data';
import { CREDITS_HEX, GAUGE_HEX, PANEL_ATTRS_HEX, PANEL_BITMAP_HEX, SPRITES_HEX } from './data/graphics-data';
import { CREDITS_TEXT, ENDING_TEXT, GAME_OVER_TEXT, GLYPHS as GLYPH_HEX } from './data/texts-data';
import { JUMP_FRAMES_HEX, JUMP_STEPS_HEX } from './data/tables-data';
import { EFFECTS as EFFECT_DATA } from './data/sounds-data';

export function fromHex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Rooms 0-5 are the six screens (32 x 18 cells); room 6 is the Christmas card (32 x 24). */
export const ROOM_COUNT = 7;
export const ENDING_ROOM = 6;
export const MAP_COLUMNS = 32;
export const ROOM_ROWS = 18;
/** Bytes a play room takes in the map and attribute tables ($6000 + room * 576, $7080 + room * 576). */
export const ROOM_SIZE = MAP_COLUMNS * ROOM_ROWS;

const MAPS = fromHex(MAPS_HEX);
const ATTRS = fromHex(ATTRS_HEX);

/**
 * The maps and the attribute tables as the original lays them out in memory, $6000-$80FF: the maps, then the attributes. A
 * lookup below a room's last row reads on into whatever follows it, as the original's does, so Monty's probes need this layout
 * and not seven separate rooms. Each call gives a fresh copy: room 2 rewrites its map as it plays.
 */
export function mapMemory(): Uint8Array {
  const mem = new Uint8Array(MAPS.length + ATTRS.length);
  mem.set(MAPS, 0);
  mem.set(ATTRS, MAPS.length);
  return mem;
}
/** Where the attribute tables start in `mapMemory()` ($7080 - $6000). */
export const ATTRS_OFFSET = MAPS.length;

/** One room's tile numbers, row by row (a copy). */
export function roomMap(room: number): Uint8Array {
  const at = room * ROOM_SIZE;
  return MAPS.slice(at, at + (room === ENDING_ROOM ? MAP_COLUMNS * 24 : ROOM_SIZE));
}
/** One room's attribute bytes, row by row (a copy). */
export function roomAttrs(room: number): Uint8Array {
  const at = room * ROOM_SIZE;
  return ATTRS.slice(at, at + (room === ENDING_ROOM ? MAP_COLUMNS * 24 : ROOM_SIZE));
}

/** The tile sets, 8 bytes a tile; tile n is at (n - 1) * 8, tile 0 is empty. The ending has its own. */
export const TILES = fromHex(TILES_HEX);
export const ENDING_TILES = fromHex(ENDING_TILES_HEX);

/** The 192 sprite frames: 32 bytes each, 16 rows of the left byte then 16 rows of the right byte. */
export const SPRITE_FRAMES = fromHex(SPRITES_HEX);
export const SPRITE_COUNT = 192;
export const BLANK_FRAME = 0xbf;
/** The energy gauge images: 8 levels of two frames, 32 bytes each. */
export const GAUGE_FRAMES = fromHex(GAUGE_HEX);

/** The HUD panel (screen rows 18-23): 2048 bitmap bytes in the Spectrum's screen layout, and 192 attribute bytes. */
export const PANEL_BITMAP = fromHex(PANEL_BITMAP_HEX);
export const PANEL_ATTRS = fromHex(PANEL_ATTRS_HEX);
/** The credits picture as the game packs it: 768 attribute bytes (bit 7: this cell has a bitmap), then 8 bytes for each such cell. */
export const CREDITS_PICTURE = fromHex(CREDITS_HEX);

export { CREDITS_TEXT, ENDING_TEXT, GAME_OVER_TEXT };

/** The ROM glyphs the game prints, by character code (8 bytes each). */
export const GLYPHS: ReadonlyMap<number, Uint8Array> = new Map(GLYPH_HEX.map((g) => [g.char, fromHex(g.hex)]));

/** The beeper effects by id (0 death, 1 time-out, 2 pickup, 3 energy hit, 5 mechanism): see data/sounds-data.ts. */
export const EFFECTS = EFFECT_DATA;

/** Monty's jump: the vertical step of each of its 24 passes (signed bytes, $8E12), and the sprite frame shown for each phase ($9129). */
export const JUMP_STEPS = fromHex(JUMP_STEPS_HEX);
export const JUMP_FRAMES = fromHex(JUMP_FRAMES_HEX);
