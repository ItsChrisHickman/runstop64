/**
 * The game's data as typed tables, from the generated hex (data/awm-data.ts, made by
 * re/rooms.ts from the original running).
 */
import { hexBytes } from 'c64kit';
import {
  ARCS_HEX, RANDOM_HEX, CHARSET_HEX, ENEMY_COLOURS_HEX, ENEMY_ROOM_HEX, ITEM_COLOURS_HEX, ITEM_GFX_HEX, ITEM_LIST_HEX, ROOM_HEX, SPRITE_FRAMES_HEX, SPECIAL_ROOM_HEX, TILE_GFX_HEX, WORLD_GRID_HEX,
} from './data/awm-data';
import { itemEntries, parseRoom, type Room, type RoomTables } from './room';

/** The 80 rooms in the game's numbering, and room $63's picture. */
export const ROOMS: readonly Room[] = ROOM_HEX.map((h) => parseRoom(hexBytes(h)));
export const SPECIAL = parseRoom(hexBytes(SPECIAL_ROOM_HEX));

export const TABLES: RoomTables = {
  tileGfx: hexBytes(TILE_GFX_HEX),
  charset: hexBytes(CHARSET_HEX),
  itemGfx: hexBytes(ITEM_GFX_HEX),
  itemColours: hexBytes(ITEM_COLOURS_HEX),
  items: itemEntries(hexBytes(ITEM_LIST_HEX)),
};

/** The world: 16 columns, row by row; a room number, or `NO_ROOM`. */
export const WORLD_GRID = hexBytes(WORLD_GRID_HEX);
export const GRID_COLS = 16;
export const NO_ROOM = 0x63;
export const ENEMY_ROOMS = hexBytes(ENEMY_ROOM_HEX);
export const ENEMY_COLOURS = hexBytes(ENEMY_COLOURS_HEX);

/** The sprite frames: 256 of 32 bytes. */
export const SPRITE_FRAMES = hexBytes(SPRITE_FRAMES_HEX);

/** Signed vertical steps of Monty's jumps and falls from $4F8A: index 0 is $4F8A, the jump of state 1 starts at index 0x2B ($4FB5). */
export const ARCS = hexBytes(ARCS_HEX);
/** The 256 numbers behind the random generator ($3300). */
export const RANDOM = hexBytes(RANDOM_HEX);
