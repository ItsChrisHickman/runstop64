import sidUrl from '../assets/monty_on_the_run.sid?url';
import {
  CORRECT_KIT, EXIT_COLS, EXIT_ROWS, exitGridImage, extensionGrid, isExtensionRoom, ITEM_SPRITES, MOTR_LOOK, MOTR_ROOMS, ROOM_COUNT,
} from './data';
import { CAST, SCENES } from './ending-scenes';
import { completion } from './finale';
import type { MontyData, RoomEffect } from './montydata';
import { MESSAGE } from './title';

/**
 * Monty on the Run's data, as the engine (Game and the rest of this folder) reads it: the original's tables and runstop64's
 * rooms after them (data.ts), and what is the game's own: its item effects on rooms, the jetpack rooms, the lifts, the rising
 * cloud, the C5 street, the finale (finale.ts), the ending's scenes (ending-scenes.ts). Room ids and item numbers are the
 * original's (item numbers are si_spawn_tbl indexes).
 */

/** The screen cells of a block: every row from `from` to `to`, in each of `cols`. */
function cells(from: number, to: number, cols: readonly number[]): [row: number, col: number][] {
  const out: [number, number][] = [];
  for (let row = from; row <= to; row++) for (const col of cols) out.push([row, col]);
  return out;
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** ApplyItemRoomEffects, in the original's order. */
const ROOM_EFFECTS: readonly RoomEffect[] = [
  { room: 0x0c, when: [{ taken: 0 }], clear: [...cells(13, 16, [2, 3, 4]), ...cells(17, 20, [2, 3, 4])] },
  { room: 0x14, when: [{ taken: 1 }], clear: cells(17, 20, [19]) },
  { room: 0x14, when: [{ taken: 2 }, { kit: 3 }], clear: cells(18, 20, [7]) },
  { room: 0x19, when: [{ taken: 3 }], removeEnemy: 3 }, // fly spray sees off the wasp
  { room: 0x1c, when: [{ notTaken: 5 }], clear: cells(18, 18, range(2, 27)) },
  { room: 0x2f, when: [{ taken: 10 }, { kit: 4 }], removeEnemy: 3 }, // key + rum: the queen steps aside
  { room: 0x22, when: [{ noKit: 1 }], clear: [...cells(3, 7, [17]), ...cells(8, 12, [18])] },
  { room: 0x08, removeEnemy: 3 },
  { room: 0x08, wake: { item: 13, slot: 3, x: 0x6f } }, // the teddy bear wakes the bubble
  { room: 0x26, openTiles: [3, 4] },
  { room: 0x2d, openTiles: [3, 4] },
];

export const MOTR: MontyData = {
  ...MOTR_ROOMS,
  ...MOTR_LOOK,
  music: { ...MOTR_LOOK.music, sidUrl },
  id: 'montyotr',

  exitGrid: { image: exitGridImage, cols: EXIT_COLS, rows: EXIT_ROWS },
  extensionGrid,
  isExtensionRoom,
  start: { mapRow: 2, exitCol: 0x15, x2: 0x86, y: 0xb0, facing: 0x81 },
  untravellable: [0x30], // the ending's dock

  kit: CORRECT_KIT,
  itemSprites: ITEM_SPRITES,
  cheatItem: 19, // the cake in room $01
  uncountedItems: [13, 16, 19], // the teddy bear (a trap), the smoke stack (fatal), the cheat-only cake
  treasure: { room: 0x2f, item: 8, x: 0x40, y: 0x9a }, // glows once the jerry can is found
  roomEffects: ROOM_EFFECTS,

  jetpackRooms: range(0x1d, 0x20),
  lifts: [
    { room: 0x05, x: 0x48, y: 0x5b, type: 1, speedDir: 0x82, sound: true },
    { room: 0x0d, x: 0x80, y: 0x53, type: 2, speedDir: 0x80, sound: false },
  ],
  escalators: [], icicles: [], tunnels: [], cracks: [], charAnims: [], pulses: [], swimRooms: [], swimGate: null, currents: [], arrivals: [], swimPictures: null, roomBlocks: [], risingLava: [], dragons: [], flights: [], canopy: null, planes: [], planeLook: null, boardings: [], tally: null, rollers: [], vines: [], cableCars: [], floats: [], skewers: [], pursuers: [], levers: [], cameos: [], iceSprites: { full: 0, half: 0, small: 0, shards: 0 }, costumes: [],
  flashingBases: { room: 0x1f, row: 0x11, cols: [8, 10, 12] },
  bollard: { room: 0x0c, row: 15, col: 0x1b },
  risingCloud: { room: 0x01, x: 0x3c, col: 0x0c },
  // the street's rooms ($24, $25, $31-$33): the original's "$31 and up" were its last rooms
  c5: { rooms: [0x24, 0x25, 0x31, 0x32, 0x33], first: 0x24, startCol: 0x08, last: 0x33, lastCell: { row: 2, col: 4 } },
  completion,

  assists: ['lives', 'cloud', 'jetpack', 'c5', 'rooms', 'respawn'],
  hints: { take: [], wanted: [] },
  regions: [],
  progress: {
    keyItems: [1, 3, 5, 8, 10], // the special items that open up the way to France
    cakes: [0, 2, 4, 6, 7, 9, 14, 15, 17, 18],
    sectorColours: [7, 13, 10, 14, 5, 4, 8, 3, 15, 1],
  },
  title: { message: MESSAGE },
  ending: { title: 'MONTY ON THE RUN', scenes: SCENES, cast: CAST, castRooms: range(0, ROOM_COUNT - 1), song: 2 }, // (song 2: the hi-score and ending tune)
};
