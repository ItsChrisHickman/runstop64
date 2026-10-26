import { hexBytes } from 'c64kit';
import { isRecord, isString } from '../../shared/guards';
import raw from './data/starquake.json';

/**
 * The original C64 Starquake's data (see tools/extract-starquake.mjs), at the
 * addresses the game keeps it. The port reads its tables by those addresses,
 * so each lookup can be checked against the disassembly line for line.
 */
export const ROM = new Uint8Array(0x10000);
for (const [at, hex] of Object.entries(raw.segments)) ROM.set(hexBytes(hex), parseInt(at, 16));

/** A byte of the original's data. */
export const rom = (addr: number) => ROM[addr & 0xffff];
/** A little-endian word of the original's data. */
export const romWord = (addr: number) => ROM[addr & 0xffff] | (ROM[(addr + 1) & 0xffff] << 8);

// ---- the map ------------------------------------------------------------------------------

/** 512 rooms (16 across, 32 down), each 4×3 big blocks, row by row. */
export const ROOMS = 0xe000;
/** Big blocks: 4 tiles each, [bottom right, bottom left, top right, top left]. */
export const BLOCKS = 0xf800;
/** Tile info: what a tile is besides its picture (a room colour, or an object). */
export const TILE_INFO = 0xfc00;
/** Tile graphics: a pointer per tile. */
export const TILE_PTRS = 0xa000;

export const ROOM_COUNT = 512;
export const MAP_W = 16;
export const MAP_H = 32;

/** The room the game starts in, and where on screen BLOB arrives (column, row). */
export const START = { room: 8, col: 0x15, row: 0x10 } as const;
/** The planet's core, where the pieces go. */
export const CORE_ROOM = 199;

// ---- pictures -------------------------------------------------------------------------------

const title: unknown = 'titlePicture' in raw ? raw.titlePicture : undefined; // (only in data extracted with the title)
export const titlePicture = isRecord(title) && isString(title.bitmap) && isString(title.screen)
  ? { bitmap: hexBytes(title.bitmap), screen: hexBytes(title.screen) }
  : null;
