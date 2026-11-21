import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { MontyData, RoomEffect } from '../../montyotr/src/montydata';
import { scrollerMessage } from '../../montyotr/src/title';
import {
  buildRooms, extendBank, extendEnemies, extendTiles, listSpecials, NO_ROOMS, roomCells, specialIndex, type BaseRooms,
} from '../../shared/monty/rooms';
import {
  CART, ICICLE_FULL, ICICLE_HALF, ICICLE_SHARDS, ICICLE_SMALL, MOSCOW_ITEMS, SIBERIA_ITEMS, WORLD_CREATURES, WORLD_DECOR, WORLD_TILE_LIST, HAT_COLOUR, ushankaWorn,
} from './art';
import { ESCALATORS, ICICLES, MOSCOW_ROOMS, STATION_ANIMS, ROOM, SECTOR_COLOURS, SECTORS, SPRITE } from './moscow';
import { CRACKS, LIFTS, TRAIN_ANIMS, SHAFT_CODE, SHAFT_LEDGES, SHAFT_STONE, SIB, SIB_SPRITE, SIBERIA_COLOURS, SIBERIA_ROOMS, SIBERIA_SECTORS, TUNNELS } from './siberia';
import { tuneForRoom } from './music/regions';
import { WORLD_REGIONS } from './regions';

/**
 * Do Svidaniya Monty's data, for the Monty engine (games/montyotr/src: `MontyData`). A second data set on the same code as Monty on the
 * Run: rooms of its own in runstop64's room format (shared/monty/rooms.ts), made of Monty on the Run's rules, music and what of its
 * tiles and sprites fit, and new tiles, decorations, creatures and items in its style (art/). So far Moscow, the first of its regions
 * (moscow.ts) and Siberia (siberia.ts): nine rooms each at the west end of a wide exit grid, the rest of the world to come a region at a time
 * (docs/dosvidaniya-plan.md).
 */

/** The exit grid: 50 columns for the world west to east (seven regions of about seven rooms), 3 rows for the ways up and down. */
export const WORLD_COLS = 50, WORLD_ROWS = 3;

/** Every region's rooms in the order they were made: a room's place in the tables, and so its items' numbers, never change once a region has shipped. */
const ROOMS = [...MOSCOW_ROOMS, ...SIBERIA_ROOMS];

// ---- the graphics: Monty on the Run's, with ours after them -----------------------------------------------------

const tiles = extendTiles(MOTR_LOOK, WORLD_TILE_LIST);
const creatures = Object.values(WORLD_CREATURES);
const enemies = extendEnemies(MOTR_LOOK, creatures, 35);

/** The ushanka: Monty's pictures with its place cleared, and the hat as sprites of its own (in the bank's free blocks, below). */
const WORN = ushankaWorn(bankImage);
/** Free blocks of the bank for the hat's pictures (the items' are $D0-$D6, Siberia's $C1-$C5). */
const HAT_BLOCKS: readonly number[] = [0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf, ...Array.from({ length: 21 }, (_, i) => 0xeb + i), ...Array.from({ length: 10 }, (_, i) => 0xc6 + i)];
/** The hat's pictures, the same ones shared between Monty's pictures that need no difference. */
const hatBlocks: { ptr: number; block: Uint8Array }[] = [];
const hatFrames = new Map<number, { ptr: number; dx: number; dy: number }>();
for (const h of WORN.hat) {
  let at = hatBlocks.find((b) => b.block.every((v, i) => v === h.block[i]));
  if (!at) {
    const ptr = HAT_BLOCKS[hatBlocks.length];
    if (ptr === undefined) throw new Error('no free blocks left for the hat');
    at = { ptr, block: h.block };
    hatBlocks.push(at);
  }
  hatFrames.set(h.ptr, { ptr: at.ptr, dx: h.dx, dy: h.dy });
}

/** The bank with Moscow's items and icicles at their pointers. */
const bank = extendBank(bankImage, [
  ...hatBlocks,
  { ptr: SPRITE.token, block: MOSCOW_ITEMS.metroToken.block },
  { ptr: SPRITE.ushanka, block: MOSCOW_ITEMS.ushanka.block },
  { ptr: SPRITE.pirozhok, block: MOSCOW_ITEMS.pirozhok.block },
  { ptr: SPRITE.iceFull, block: ICICLE_FULL },
  { ptr: SPRITE.iceHalf, block: ICICLE_HALF },
  { ptr: SPRITE.iceSmall, block: ICICLE_SMALL },
  { ptr: SPRITE.iceShards, block: ICICLE_SHARDS },
  { ptr: SIB_SPRITE.lamp, block: SIBERIA_ITEMS.lamp.block },
  { ptr: SIB_SPRITE.ticket, block: SIBERIA_ITEMS.ticket.block },
  { ptr: SIB_SPRITE.pelmeni, block: SIBERIA_ITEMS.pelmeni.block },
  { ptr: SIB_SPRITE.cartTop, block: CART.top },
  { ptr: SIB_SPRITE.cartBottom, block: CART.bottom },
]);

/** The key items' and the pirozhki's pointers, with the colour each is drawn in (the pirozhki as the cupcake is: white). */
const ITEM_COLOURS = new Map<number, number>([
  [SPRITE.token, MOSCOW_ITEMS.metroToken.colour], [SPRITE.ushanka, MOSCOW_ITEMS.ushanka.colour], [SPRITE.pirozhok, MOSCOW_ITEMS.pirozhok.colour],
  [SIB_SPRITE.lamp, SIBERIA_ITEMS.lamp.colour], [SIB_SPRITE.ticket, SIBERIA_ITEMS.ticket.colour], [SIB_SPRITE.pelmeni, SIBERIA_ITEMS.pelmeni.colour],
]);
const itemSprites: MontyData['itemSprites'] = {
  ...ITEM_SPRITES,
  collectable: (ptr) => ITEM_SPRITES.collectable(ptr) || ITEM_COLOURS.has(ptr),
  colour: (ptr) => ITEM_COLOURS.get(ptr) ?? ITEM_SPRITES.colour(ptr),
};

// ---- the rooms' tables ------------------------------------------------------------------------------------------

/** Moscow's decorations are the first decoration types. */
const BASE: BaseRooms = { ...NO_ROOMS, decorTypes: Object.values(WORLD_DECOR) };
const tables = buildRooms(BASE, ROOMS, [...SECTORS, ...SIBERIA_SECTORS], bankImage, SPRITE.pirozhok);

/** The special items by name (si_spawn_tbl's indexes), and the pirozhki (its cakes). */
const TOKEN = specialIndex(ROOMS, 'token');
const USHANKA = specialIndex(ROOMS, 'ushanka');
const PIROZHKI = listSpecials(ROOMS).filter((e) => e.item === null).map((e) => e.index);
const LAMP = specialIndex(ROOMS, 'lamp');
const TICKET = specialIndex(ROOMS, 'ticket');
/** The food in every region (the pause screen's SNACKS): Moscow's pirozhki, Siberia's pelmeni. */
const FOOD = [...PIROZHKI, specialIndex(ROOMS, 'pelmeni1'), specialIndex(ROOMS, 'pelmeni2')];

/** The playfield cells (row, column) of a rectangle, in the screen's cells (the playfield starts at column 4, row 3). */
function screenCells(c0: number, r0: number, c1: number, r1: number): [row: number, col: number][] {
  const out: [number, number][] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r + 3, c + 4]);
  return out;
}

const ROOM_EFFECTS: readonly RoomEffect[] = [
  { room: ROOM.hall, when: [{ taken: TOKEN }], clear: screenCells(28, 13, 29, 16) }, // the token opens the turnstile
  { room: ROOM.kremlin, when: [{ taken: USHANKA }], removeEnemy: 0 }, // in the fur hat, the guard steps aside
  { room: SIB.shaft, when: [{ taken: LAMP }], place: { code: SHAFT_CODE, cells: [...SHAFT_LEDGES, ...SHAFT_STONE].map(([row, col]) => [row + 3, col + 4] as const) } }, // the lamp shows the ledges
  { room: SIB.border, when: [{ taken: TICKET }], clear: screenCells(28, 13, 29, 16) }, // the ticket lifts the barrier
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
  lifts: LIFTS,
  escalators: ESCALATORS,
  icicles: ICICLES,
  tunnels: TUNNELS,
  cracks: CRACKS,
  charAnims: [...TRAIN_ANIMS, ...STATION_ANIMS],
  iceSprites: { full: SPRITE.iceFull, half: SPRITE.iceHalf, small: SPRITE.iceSmall, shards: SPRITE.iceShards },
  // the ushanka: once taken, Monty's pictures have it on
  costumes: [{ item: USHANKA, blocks: WORN.monty, over: { colour: HAT_COLOUR, frames: hatFrames } }],
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
      { item: LAMP, text: 'LAMP: SHOWS THE MINE\'S LEDGES' },
      { item: TICKET, text: 'TICKET: FOR THE BORDER BARRIER' },
    ],
    wanted: [
      { room: ROOM.hall, item: TOKEN, text: 'THE TURNSTILE WANTS A TOKEN' },
      { room: ROOM.kremlin, item: USHANKA, text: 'THE GUARD WANTS A FUR HAT' },
      { room: SIB.shaft, item: LAMP, text: 'TOO DARK TO SEE: FIND A LAMP' },
      { room: SIB.border, item: TICKET, text: 'THE BARRIER WANTS A TICKET' },
    ],
  },
  // the map shows a region's four columns while he is in them
  regions: WORLD_REGIONS.map(({ from, to }) => ({ from, to })),
  progress: { keyItems: [TOKEN, USHANKA, LAMP, TICKET], cakes: FOOD, sectorColours: [...SECTOR_COLOURS, ...SIBERIA_COLOURS], foodName: 'SNACKS' },
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
