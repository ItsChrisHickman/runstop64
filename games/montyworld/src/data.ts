import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { MontyData } from '../../montyotr/src/montydata';
import { scrollerMessage } from '../../montyotr/src/title';
import { buildRooms, NO_ROOMS, roomCells, type RoomSpec, type Sector } from '../../shared/monty/rooms';
import { tuneForRoom } from './music/regions';

/**
 * Do Svidaniya Monty's data, for the Monty engine (games/montyotr/src: `MontyData`). A second data set on the same code as
 * Monty on the Run: rooms of its own in runstop64's room format (shared/monty/rooms.ts), made of Monty on the Run's tiles,
 * sprites, music and rules. For now a skeleton: three placeholder rooms in a row (Moscow's station and the square beyond it),
 * a coin or two and a piece of cake, to prove the engine runs a second game (docs/dosvidaniya-plan.md, step 1). The world proper
 * (5 regions of about 10 rooms, west to east: Moscow, Siberia, China, Japan, the Pacific and Hawaii) comes a region at a time.
 */

/** The exit grid: 50 columns for the world west to east (5 regions of about 10 rooms), 3 rows for the ways up and down. */
export const WORLD_COLS = 50, WORLD_ROWS = 3;

const SECTORS: readonly Sector[] = [
  { col: 7, text: 'MOSCOW STATION' },
  { col: 8, text: 'RED SQUARE' },
];

/** A floor all along (the playfield's rows 15-19) and a ceiling: Monty walks in at one side and out at the other. */
const FLAT = [
  '11111111111111111111111111111111',
  ...Array.from({ length: 14 }, () => '.'.repeat(32)),
  ...Array.from({ length: 5 }, () => '3'.repeat(32)),
];
/** The same with a ledge to jump up to, 4 rows over the floor. */
const withLedge = (from: number, to: number) => FLAT.map((row, i) => (i === 11 ? row.slice(0, from) + '5'.repeat(to - from) + row.slice(to) : row));

// (tiles: 1 a wall, 3 the floor, 5 a thin ledge: Monty on the Run's tile library; colours: grey, white snow, red brick)
const TILES = [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0] as const;

const ROOMS: readonly RoomSpec[] = [
  // $00: the station where he arrives, in the world's first cell
  {
    id: 0, row: 1, col: 0, sector: 0, tiles: TILES, colours: [11, 0, 1, 15, 2, 0, 0, 0],
    map: FLAT,
    coins: [[28, 13]], // (right of where he starts: he walks out through it)
  },
  // $01: snowy streets: a ledge, and a piece of cake on the floor
  {
    id: 1, row: 1, col: 1, sector: 0, tiles: TILES, colours: [11, 0, 1, 15, 2, 0, 0, 0],
    map: withLedge(10, 18),
    cake: [15, 15],
  },
  // $02: Red Square, the last of the three
  {
    id: 2, row: 1, col: 2, sector: 1, tiles: TILES, colours: [2, 0, 1, 15, 2, 0, 0, 0],
    map: FLAT,
    coins: [[16, 13]],
  },
];

const tables = buildRooms(NO_ROOMS, ROOMS, SECTORS, bankImage);

export const WORLD: MontyData = {
  ...tables,
  ...MOTR_LOOK,
  // (Hubbard's tune, a version of it for each region: music/regions.ts)
  music: { ...MOTR_LOOK.music, sidUrl, tuneFor: (roomId) => tuneForRoom(WORLD.exitGrid, roomId) },
  id: 'montyworld',

  exitGrid: { image: roomCells(WORLD_COLS * WORLD_ROWS, WORLD_COLS, ROOMS), cols: WORLD_COLS, rows: WORLD_ROWS },
  extensionGrid: new Uint8Array(WORLD_COLS * WORLD_ROWS).fill(0xff),
  isExtensionRoom: () => false,
  // Monty's start place (his x2, y and way as in Monty on the Run's start room), in the first room
  start: { mapRow: 1, exitCol: 0, x2: 0x86, y: 0xb2, facing: 0x01 },
  untravellable: [],

  kit: [],
  itemSprites: ITEM_SPRITES,
  cheatItem: null,
  uncountedItems: [],
  treasure: null,
  roomEffects: [],

  jetpackRooms: [],
  lifts: [],
  flashingBases: null,
  bollard: null,
  risingCloud: null,
  c5: null,
  completion: null,

  assists: ['lives', 'respawn'],
  progress: { keyItems: [], cakes: [0], sectorColours: [7, 2] },
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
