import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { MontyData, RoomEffect } from '../../montyotr/src/montydata';
import { scrollerMessage } from '../../montyotr/src/title';
import {
  buildRooms, extendBank, extendEnemies, extendTiles, listSpecials, NO_ROOMS, roomCells, specialIndex, type BaseRooms,
} from '../../shared/monty/rooms';
import {
  ICICLE_FULL, ICICLE_HALF, ICICLE_SHARDS, ICICLE_SMALL, MOSCOW_CREATURES, MOSCOW_DECOR, MOSCOW_ITEMS, MOSCOW_TILE_LIST, ushankaFrames,
} from './art';
import { ESCALATORS, ICICLES, MOSCOW_ROOMS, ROOM, SECTOR_COLOURS, SECTORS, SPRITE } from './moscow';
import { tuneForRoom } from './music/regions';

/**
 * Do Svidaniya Monty's data, for the Monty engine (games/montyotr/src: `MontyData`). A second data set on the same code as Monty on the
 * Run: rooms of its own in runstop64's room format (shared/monty/rooms.ts), made of Monty on the Run's rules, music and what of its
 * tiles and sprites fit, and new tiles, decorations, creatures and items in its style (art/). So far Moscow, the first of its regions
 * (moscow.ts): nine rooms at the west end of a wide exit grid, the rest of the world to come a region at a time
 * (docs/dosvidaniya-plan.md).
 */

/** The exit grid: 50 columns for the world west to east (seven regions of about seven rooms), 3 rows for the ways up and down. */
export const WORLD_COLS = 50, WORLD_ROWS = 3;

const ROOMS = MOSCOW_ROOMS;

// ---- the graphics: Monty on the Run's, with ours after them -----------------------------------------------------

const tiles = extendTiles(MOTR_LOOK, MOSCOW_TILE_LIST);
const creatures = Object.values(MOSCOW_CREATURES);
const enemies = extendEnemies(MOTR_LOOK, creatures, 35);

/** The bank with Moscow's items and icicles at their pointers. */
const bank = extendBank(bankImage, [
  { ptr: SPRITE.token, block: MOSCOW_ITEMS.metroToken.block },
  { ptr: SPRITE.ushanka, block: MOSCOW_ITEMS.ushanka.block },
  { ptr: SPRITE.pirozhok, block: MOSCOW_ITEMS.pirozhok.block },
  { ptr: SPRITE.iceFull, block: ICICLE_FULL },
  { ptr: SPRITE.iceHalf, block: ICICLE_HALF },
  { ptr: SPRITE.iceSmall, block: ICICLE_SMALL },
  { ptr: SPRITE.iceShards, block: ICICLE_SHARDS },
]);

/** The key items' and the pirozhki's pointers, with the colour each is drawn in (the pirozhki as the cupcake is: white). */
const ITEM_COLOURS = new Map<number, number>([
  [SPRITE.token, MOSCOW_ITEMS.metroToken.colour], [SPRITE.ushanka, MOSCOW_ITEMS.ushanka.colour], [SPRITE.pirozhok, MOSCOW_ITEMS.pirozhok.colour],
]);
const itemSprites: MontyData['itemSprites'] = {
  ...ITEM_SPRITES,
  collectable: (ptr) => ITEM_SPRITES.collectable(ptr) || ITEM_COLOURS.has(ptr),
  colour: (ptr) => ITEM_COLOURS.get(ptr) ?? ITEM_SPRITES.colour(ptr),
};

// ---- the rooms' tables ------------------------------------------------------------------------------------------

/** Moscow's decorations are the first decoration types. */
const BASE: BaseRooms = { ...NO_ROOMS, decorTypes: Object.values(MOSCOW_DECOR) };
const tables = buildRooms(BASE, ROOMS, SECTORS, bankImage, SPRITE.pirozhok);

/** The special items by name (si_spawn_tbl's indexes), and the pirozhki (its cakes). */
const TOKEN = specialIndex(ROOMS, 'token');
const USHANKA = specialIndex(ROOMS, 'ushanka');
const PIROZHKI = listSpecials(ROOMS).filter((e) => e.item === null).map((e) => e.index);

/** The playfield cells (row, column) of a rectangle, in the screen's cells (the playfield starts at column 4, row 3). */
function screenCells(c0: number, r0: number, c1: number, r1: number): [row: number, col: number][] {
  const out: [number, number][] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r + 3, c + 4]);
  return out;
}

const ROOM_EFFECTS: readonly RoomEffect[] = [
  { room: ROOM.hall, when: [{ taken: TOKEN }], clear: screenCells(28, 13, 29, 16) }, // the token opens the turnstile
  { room: ROOM.kremlin, when: [{ taken: USHANKA }], removeEnemy: 0 }, // in the fur hat, the guard steps aside
];

export const WORLD: MontyData = {
  ...tables,
  ...MOTR_LOOK,
  ...tiles,
  ...enemies,
  bankImage: bank,
  // (Hubbard's tune, a version of it for each region: music/regions.ts)
  music: { ...MOTR_LOOK.music, sidUrl, tuneFor: (roomId) => tuneForRoom(WORLD.exitGrid, roomId) },
  id: 'montyworld',

  exitGrid: { image: roomCells(WORLD_COLS * WORLD_ROWS, WORLD_COLS, ROOMS), cols: WORLD_COLS, rows: WORLD_ROWS },
  extensionGrid: new Uint8Array(WORLD_COLS * WORLD_ROWS).fill(0xff),
  isExtensionRoom: () => false,
  // he starts on the platform at the left, facing right, on the floor (row 17)
  start: { mapRow: 1, exitCol: 0, x2: 0x28, y: 0xc2, facing: 0x01 },
  untravellable: [],

  kit: [],
  itemSprites,
  cheatItem: null,
  uncountedItems: [],
  treasure: null,
  roomEffects: ROOM_EFFECTS,

  jetpackRooms: [],
  lifts: [],
  escalators: ESCALATORS,
  icicles: ICICLES,
  iceSprites: { full: SPRITE.iceFull, half: SPRITE.iceHalf, small: SPRITE.iceSmall, shards: SPRITE.iceShards },
  // the ushanka: once taken, Monty's pictures have it on
  costumes: [{ item: USHANKA, blocks: ushankaFrames(bankImage) }],
  flashingBases: null,
  bollard: null,
  risingCloud: null,
  c5: null,
  completion: null,

  assists: ['lives', 'respawn', 'hints'],
  hints: {
    take: [
      { item: TOKEN, text: 'TOKEN: FOR THE METRO TURNSTILE' },
      { item: USHANKA, text: 'FUR HAT: PAST THE KREMLIN GUARD' },
    ],
    wanted: [
      { room: ROOM.hall, item: TOKEN, text: 'THE TURNSTILE WANTS A TOKEN' },
      { room: ROOM.kremlin, item: USHANKA, text: 'THE GUARD WANTS A FUR HAT' },
    ],
  },
  // the map shows Moscow's four columns while he is in them
  regions: [{ from: 0, to: 3 }],
  progress: { keyItems: [TOKEN, USHANKA], cakes: PIROZHKI, sectorColours: SECTOR_COLOURS, foodName: 'PIROZHKI' },
  title: {
    message: scrollerMessage([
      [0xfe, 1], 'MONTY MOLE: ', [0xfe, 7], 'WORLD TOUR. ',
      [0xfe, 1], 'A NEW GAME BY ', [0xfe, 13], 'CHRISTOPHER HICKMAN WITH CLAUDE. ',
      [0xfe, 1], 'AFTER ', [0xfe, 7], 'PETER HARRAP. ',
      [0xfe, 1], 'MUSIC BY ', [0xfe, 14], 'ROB HUBBARD. ',
      [0xfe, 1], 'A TRIBUTE: ', [0xfe, 10], 'RUNSTOP64.          ',
    ]),
  },
  ending: null,
};
