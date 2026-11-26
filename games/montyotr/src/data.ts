import raw from './data/motr.json';
import { hexBytes, type SfxName } from 'c64kit';
import { PLAY_COLS, PLAY_ROWS } from '../../shared/monty/screen';
import { buildRooms, checkFree, roomCells, roomDecorTypes, type BaseRooms, type DecorType, type RoomDef } from '../../shared/monty/rooms';
import { ROOMS as EXT_ROOMS, SECTORS as EXT_SECTORS } from './data/runstop64-rooms';
import type { MontyData, MontyLook, Sfx } from './montydata';

/**
 * Original Monty on the Run data (see tools/extract-motr.mjs), decoded into
 * friendly shapes. Room IDs, coordinates and tables match the original game. `motr.ts` makes the engine's
 * value (`MontyData`) of these; the names here stay for what reads the original's tables directly (the remix, the tests).
 */

export const ROOM_COUNT = raw.rooms;
export const tileLibrary = hexBytes(raw.tileLibrary); // 121 × 8 bytes
/** VIC bank 1 ($4000-$7FFF) as the game loads it: charset at $4000, sprites by pointer. */
export const bankImage = hexBytes(raw.bank);
export const jumpArc = hexBytes(raw.jumpArc);
const roomDefs = hexBytes(raw.roomDefs);
const enemyCopyFlags = hexBytes(raw.enemyCopyFlags);
export const enemyColours = hexBytes(raw.enemyColours);
export const enemyDirFlags = hexBytes(raw.enemyDirFlags);
export const exitGridImage = hexBytes(raw.exitGrid);
/** The original's exit grid: 23 columns, 6 rows. */
export const EXIT_COLS = 23, EXIT_ROWS = 6;
export const fkLayout = hexBytes(raw.fkLayout);
const originalDecorTypes: DecorType[] = raw.decorTypes.map((t) => ({
  w: t.w,
  h: t.h,
  chr: hexBytes(t.chr),
  colour: typeof t.colour === 'number' ? t.colour : hexBytes(t.colour),
}));
export const piledriverGlyphs = hexBytes(raw.piledriverGlyphs);
export const teleporterColours = hexBytes(raw.teleporterColours);
export const flameMasks = hexBytes(raw.flameMasks);
export const greyPulse = hexBytes(raw.greyPulse);
export const cloudFrames = hexBytes(raw.cloudFrames);
export const arrestedText = hexBytes(raw.arrestedText);
export const gameOverPtrs = hexBytes(raw.gameOverPtrs);

export { PLAY_COLS, PLAY_ROWS };

/** Collision class for a tile library index (original SetTileProperty). */
export function tileProperty(tile: number): number {
  if ((tile >= 0x47 && tile < 0x4e) || tile < 0x27) return 1;
  if (tile < 0x47) return 2;
  if (tile < 0x56) return 4;
  if (tile < 0x77) return 3;
  return 0;
}

/** 32 packed bytes per enemy frame, 8 frames per type (see Game.setupEnemies). */
export function enemyBank(type: number): Uint8Array {
  return hexBytes(raw.enemyBanks[type - 8]);
}

export function enemyCopyFlag(type: number) {
  return enemyCopyFlags[type - 8];
}

/** The five items that actually get Monty to France (jet pack, rope, passport, gas mask, rum). */
export const CORRECT_KIT = [1, 3, 11, 12, 15];

/** Original SFX numbers (Music.PlaySFX). */
export const SFX = {
  warp: 0, jump: 1, piledriverDescend: 2, jetpack: 3, liftAscend: 4, liftDescend: 5, coin: 7, item: 8,
} as const satisfies Sfx;
/** SFX per death/completion event (original event_sfx_tbl). */
export const EVENT_SFX = [9, 10, 14, 12, 13, 0, 14];

/**
 * The kit's effects (packages/c64kit/src/sid/sfx.ts, on a SID of their own mixed over the tune) that stand in for the original's
 * while another .sid plays (Do Svidaniya Monty's flight: Auf Wiedersehen Monty's theme), by the original's number: a coin or an
 * item taken, the warp (the frigatebird's screech, a roller's `sound`), the jump's rattle (a pursuer knocked back), and every
 * death's crunch (Viktor's clip at the bail-out is one too). The jetpack's and the jump's own are only without the music.
 */
const OVER_OTHER = {
  [SFX.coin]: 'coin', [SFX.item]: 'coin', [SFX.warp]: 'screech', [SFX.jump]: 'hit',
  ...Object.fromEntries(EVENT_SFX.filter((id) => id !== 0).map((id) => [id, 'kill'] as const)),
} satisfies Readonly<Partial<Record<number, SfxName>>>;

/** Entry points inside the original music driver (present in the HVSC .sid). */
export const MUSIC = { init: 0x9554, stop: 0x957d, playSfx: 0x9591, overOther: OVER_OTHER } as const;

/**
 * The sprites the item pickup knows (HandleSICollision): the first aid kit ($8E: an extra life), the smoke stack ($92: fatal), the
 * treasure ($9B), and the pointers that are items ($8E-$97 and $BF). They are Monty on the Run's bank's: a game on its bank has them.
 */
export const ITEM_SPRITES: MontyData['itemSprites'] = {
  treasure: 0x9b, extraLife: 0x8e, fatal: 0x92, collectable: (ptr) => ptr === 0xbf || (ptr >= 0x8e && ptr < 0x98), colour: () => 1,
};

/** What every game on the engine can take as it is: Monty on the Run's graphics, tables and sound (the .sid's address is the game's own: `music.sidUrl`). */
export const MOTR_LOOK: Omit<MontyLook, 'music'> & { music: Omit<MontyLook['music'], 'sidUrl'> } = {
  bankImage, tileLibrary, tileProperty, jumpArc, enemyColours, enemyDirFlags, enemyBank, enemyCopyFlag, piledriverGlyphs,
  teleporterColours, flameMasks, greyPulse, cloudFrames, gameOverPtrs, sfx: SFX, eventSfx: EVENT_SFX, music: MUSIC,
};

// ---- the original's rooms ----------------------------------------------------------------------

/** One of the original's rooms (the tables as the extractor read them). */
function originalRoomDef(id: number): RoomDef {
  const def = roomDefs.subarray(id * 16, id * 16 + 16);
  const cells = new Uint8Array(PLAY_COLS * PLAY_ROWS);
  // RLE: high nibble = run length - 1, low nibble = char code.
  let n = 0;
  for (const b of hexBytes(raw.tilemaps[id])) {
    for (let i = 0; i <= b >> 4 && n < cells.length; i++) cells[n++] = b & 0x0f;
  }
  return { id, tiles: [...def.subarray(0, 8)], colours: [...def.subarray(8, 16)], cells };
}

const ORIGINAL: BaseRooms = {
  count: ROOM_COUNT,
  roomDef: originalRoomDef,
  enemyRecords: (id) => hexBytes(raw.enemies[id]),
  specialItems: hexBytes(raw.specialItems),
  coinTable: hexBytes(raw.coins),
  decorRooms: hexBytes(raw.decorRooms),
  decorTypes: originalDecorTypes,
  piledriverCfg: hexBytes(raw.piledrivers),
  teleporterCfg: hexBytes(raw.teleporters),
  teleporterDests: hexBytes(raw.teleporterDests),
  roomMeta: hexBytes(raw.roomMeta),
  sectorNames: raw.sectorNames,
  sectorIdx: hexBytes(raw.sectorIdx),
};

// ---- runstop64's rooms (data/runstop64-rooms.ts), merged in ------------------------------------
//
// Every table keyed by room id takes runstop64's rooms after the original's own entries, in the original's formats
// (shared/monty/rooms.ts `buildRooms`); the original's rooms ($00-$33) read exactly what they did. The new rooms' ids ($34 on)
// are on no cell of the original's exit grid, so nothing of the original reaches them: only `extensionGrid` does (Game.roomAt,
// with the assist on).

const extIds = new Set(EXT_ROOMS.map((r) => r.id));
/** One of runstop64's rooms (not the original's). */
export const isExtensionRoom = (id: number) => extIds.has(id);

checkFree(exitGridImage, EXIT_COLS, EXT_ROOMS);
/** The exit grid's cells for runstop64's rooms ($FF elsewhere: the original's cells and the empty ones). */
export const extensionGrid = roomCells(exitGridImage.length, EXIT_COLS, EXT_ROOMS);

/** The tables of the original's rooms and runstop64's after them (`RoomTables`). */
export const MOTR_ROOMS = buildRooms(ORIGINAL, EXT_ROOMS, EXT_SECTORS, bankImage);

export const { roomDef, enemyRecords, coinTable, decorRooms, piledriverCfg, teleporterCfg, teleporterDests, warpFound, roomMeta, sectorNames, sectorIdx } = MOTR_ROOMS;
/** The decoration kinds (Monty on the Run's one list: the original's, then runstop64's signs). */
export const decorTypes = roomDecorTypes(MOTR_ROOMS, 0);
/** si_spawn_tbl: the original's 20 items, then a piece of cake in each of runstop64's rooms that has one. */
export const specialItems = MOTR_ROOMS.specialItems;

export function sectorIndex(roomId: number) {
  return sectorIdx[roomId] ?? 0;
}

export function sectorName(roomId: number): { col: number; text: string } {
  return sectorNames[sectorIndex(roomId)];
}
