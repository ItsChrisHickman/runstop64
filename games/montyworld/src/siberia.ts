import type { CrackSpec, LiftSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { codeOf, Grid, room, type Palette } from './layout';

/**
 * Siberia, the second region of Do Svidaniya Monty (docs/dosvidaniya-siberia.md): nine rooms in a block four wide and three high at
 * columns 4-7 of the exit grid, entered from Moscow's carriage roof (room I, column 3) and left east into China (not yet built).
 *
 *            col 4              col 5               col 6               col 7
 *   row 0   O  YETI OR NOT   F  PINE TO BE WILD   M  MINE ALL MINE    S  SHAFT OF DARKNESS
 *   row 1   A  GRAVY TRAIN   B  SLEEPER HIT       C  COAL COMFORT      L  BAIKAL TO BASICS
 *   row 2      .                .                    .                G  BORDER LINE CASE
 *
 * Playfield cells as in moscow.ts. The tunnel mouths (A, B) sweep the carriage roofs, the ice (L) cracks, the mine cart (M) is a lift, the
 * ledges of the dark shaft (S) are placed by the miner's lamp (M), the border barrier (G) is lifted by the ticket (C).
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from Moscow's (0-8): they never change once the region has shipped. */
export const SIB = { gravy: 9, sleeper: 10, coal: 11, pines: 12, yeti: 13, mine: 14, shaft: 15, lake: 16, border: 17 } as const;

/** The sprite pointers (in the bank) of Siberia's items and the mine cart. */
export const SIB_SPRITE = { lamp: 0xc1, ticket: 0xc2, pelmeni: 0xc3, cartTop: 0xc4, cartBottom: 0xc5 } as const;

/** The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 9 on (Moscow's are 0-8). */
const NAMES = [
  'THE GRAVY TRAIN', 'SLEEPER HIT', 'COAL COMFORT', 'PINE TO BE WILD', 'YETI OR NOT', 'MINE ALL MINE', 'SHAFT OF DARKNESS',
  'BAIKAL TO BASICS', 'BORDER LINE CASE',
] as const;
export const SIBERIA_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the train green, the forest light green, the mine grey, the ice light blue, the village white). */
export const SIBERIA_COLOURS: readonly number[] = [5, 5, 12, 13, 15, 12, 11, 14, 1];
/** Where Siberia's sectors begin in the world's list. */
export const FIRST_SECTOR = 9;

// ---- shared bits ---------------------------------------------------------------------------------------

/** A ceiling of `rows` rows of crust with a ragged fringe under it at the column ranges `drips` gives. */
function sky(g: Grid, rows: number, drips: readonly (readonly [number, number])[], crust = 'C', drip = 'D') {
  g.box(0, 0, 31, rows - 1, crust);
  for (const [a, b] of drips) g.box(a, rows, b, rows, drip);
}

/** Palette of the train rooms (a roof, a hatch, the car inside). */
const TRAIN_PALETTE = {
  C: ['snowCrust', 3], D: ['snowDrip', 3], G: ['girder', 12], T: ['trainSide', 5], F: ['carFloor', 9], W: ['bogie', 11], R: ['rope', 13], X: ['tunnelFace', 12],
} as const satisfies Palette;

/** A carriage seen cut open: the roof walkway at row 9 with the hatches (floor gaps of three, a rope each), the car's ends and floor. */
function carriage(g: Grid, hatches: readonly number[]) {
  sky(g, 2, [[0, 3], [10, 14], [22, 27]]);
  g.box(0, 2, 1, 5, 'T').box(30, 2, 31, 5, 'T'); // (the ends above the roof, shut over the open rows 6-8)
  g.box(0, 9, 31, 9, 'G');
  g.box(0, 10, 1, 16, 'T').box(30, 10, 31, 16, 'T');
  g.box(0, 17, 31, 17, 'F').box(0, 18, 31, 19, 'W');
  for (const h of hatches) g.clear(h - 1, 9, h + 1, 9).box(h, 9, h, 16, 'R');
}

// ---- the tunnels, ice and cart ------------------------------------------------------------------------

/** The portal's tile in the train rooms' palette. */
const TUNNEL_CODE = codeOf(TRAIN_PALETTE, 'X');
const MOUTH = { code: TUNNEL_CODE, cols: 4, top: 2, bottom: 8, step: 10, rest: 130, warn: 48 } as const;
/** The tunnel mouths: the dining car's from the front of the train (the right), the sleeper's two, one from each end, a pause apart. */
export const TUNNELS: readonly TunnelSpec[] = [
  { room: SIB.gravy, from: 'right', offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'right', offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'left', offset: 230, ...MOUTH },
];

const LAKE_PALETTE = {
  S: ['snowGround', 1], K: ['mineRock', 12], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6], R: ['rope', 13], C: ['snowCrust', 3],
} as const satisfies Palette;
const ICE = { row: 12, codes: [codeOf(LAKE_PALETTE, 'I'), codeOf(LAKE_PALETTE, 'J'), codeOf(LAKE_PALETTE, 'H')], crack: 56, wide: 88, gone: 120, away: 240 } as const;
/** The lake's two patches of ice: six cells each, so crossing at his walk (48 frames) is safe and waiting is not. */
export const CRACKS: readonly CrackSpec[] = [
  { room: SIB.lake, col: 16, cols: 6, ...ICE }, { room: SIB.lake, col: 7, cols: 6, ...ICE },
];

/**
 * The mine cart: Monty on the Run's lift (a ride down when stood on: type 2), with a picture of its own. It waits at the gantry's end
 * (cell 8, floor 7) and sets him down in the gallery.
 */
export const CART_COL = 8;
export const LIFTS: readonly LiftSpec[] = [
  { room: SIB.mine, x: 26 + 4 * CART_COL, y: 0x5b, type: 2, speedDir: 0x80, sound: false, look: { top: SIB_SPRITE.cartTop, bottom: SIB_SPRITE.cartBottom, colour: 8 } },
];

// ---- the dark shaft's ledges ---------------------------------------------------------------------------
const SHAFT_PALETTE = { K: ['mineRock', 12], B: ['timber', 8], W: ['lakeWater', 6], L: ['mineRail', 11] } as const satisfies Palette;
/** The ledges and the stepping stone the lamp shows: playfield cells (row, column). */
export const SHAFT_LEDGES: readonly (readonly [row: number, col: number])[] = [
  ...[2, 3, 4, 5].map((c) => [16, c] as const), ...[6, 7, 8, 9].map((c) => [14, c] as const), ...[10, 11, 12, 13].map((c) => [12, c] as const),
  [18, 22], [18, 23],
];
export const SHAFT_CODE = codeOf(SHAFT_PALETTE, 'B');

// ---- the rooms ----------------------------------------------------------------------------------------------

export const SIBERIA_ROOMS: readonly RoomSpec[] = [
  // A THE GRAVY TRAIN: the dining car. Along the roof from Moscow's carriage, a tunnel mouth sweeping it from the front; two hatches with a
  // rope each into the car, whose floor runs between them (a pocket at each end: a pelmeni to the left, a coin to the right; the inspector between).
  room({
    id: SIB.gravy, cell: [1, 4], sector: 9, palette: TRAIN_PALETTE,
    paint(g) {
      carriage(g, [12, 25]);
    },
    coins: [[28, 15]],
    item: { name: 'pelmeni1', col: 3, row: 15, sprite: SIB_SPRITE.pelmeni },
    decor: [['carWindow', 5, 11], ['carWindow', 17, 11], ['carWindow', 21, 11], ['diningTable', 15, 15], ['diningTable', 19, 15], [{ text: 'RESTAURANT', colour: 7 }, 8, 13]],
    creatures: [{ who: 'inspector', col: 14, row: 15, way: 'right', speed: 1, range: 56 }],
  }),

  // B SLEEPER HIT: the sleeper. The roof again, two mouths, one from each end a pause apart; two hatches into the corridor of berths (an
  // inspector in its right half, a coin each end); a pine beside the track whose rope climbs out of the ceiling to the forest.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: TRAIN_PALETTE,
    paint(g) {
      carriage(g, [7, 15]);
      g.clear(21, 0, 23, 1).box(22, 0, 22, 8, 'R'); // the pine's rope, up through the ceiling
    },
    coins: [[3, 15], [27, 15]],
    decor: [['bunk', 10, 15], ['bunk', 20, 15], ['carWindow', 22, 11], ['carWindow', 27, 11], ['pole', 28, 5]],
    creatures: [{ who: 'inspector', col: 19, row: 15, way: 'right', speed: 1, range: 56 }],
  }),

  // C COAL COMFORT: the tender, a dead end. From the roof's rim down the coal in steps to the trough (the stoker paces it) and up the heaps
  // on the far side to the locomotive's cab, where the ticket lies; and back.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], G: ['girder', 12], K: ['coal', 12], T: ['trainSide', 5], F: ['carFloor', 9], W: ['bogie', 11] },
    paint(g) {
      sky(g, 2, [[0, 3], [12, 18], [26, 29]]);
      g.box(0, 2, 1, 5, 'T').box(30, 2, 31, 16, 'T');
      g.box(0, 9, 5, 9, 'G').box(0, 10, 5, 16, 'T'); // the rim, with the car's side under it
      g.box(6, 11, 8, 16, 'K').box(9, 13, 11, 16, 'K').box(12, 15, 19, 16, 'K').box(20, 13, 22, 16, 'K').box(23, 11, 25, 16, 'K'); // the coal in steps
      g.box(26, 9, 31, 16, 'K'); // the cab's roof (the heap's last step)
      g.box(0, 17, 31, 17, 'F').box(0, 18, 31, 19, 'W');
    },
    coins: [[15, 13]],
    item: { name: 'ticket', col: 28, row: 7, sprite: SIB_SPRITE.ticket },
    decor: [['pineSmall', 17, 1], ['pole', 3, 5]],
    creatures: [{ who: 'miner', col: 12, row: 13, way: 'right', speed: 1, range: 48 }],
  }),

  // F PINE TO BE WILD: the forest. Up from the sleeper by the rope onto the ground; west past the wolves to the yeti's hollow; east a
  // trunk, and a rope at the right up to the boughs, out east, high.
  room({
    id: SIB.pines, cell: [0, 5], sector: 12,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], S: ['snowGround', 1], F: ['snowFill', 1], B: ['pineBark', 9], H: ['snowBough', 5], R: ['rope', 13] },
    paint(g) {
      sky(g, 2, [[0, 5], [8, 13], [20, 26]]);
      g.box(0, 2, 1, 13, 'B').box(30, 2, 31, 3, 'B').box(30, 8, 31, 16, 'B'); // the trunks at the edges, shut but for the ground's way and the boughs'
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F').clear(21, 17, 23, 19).box(22, 16, 22, 19, 'R'); // the ground, the gap and the rope from the sleeper
      g.box(11, 15, 13, 16, 'S'); // a drift to jump
      g.box(4, 7, 25, 7, 'H').box(29, 7, 31, 7, 'H').clear(26, 7, 28, 7).box(27, 7, 27, 16, 'R'); // the boughs, a rope up to them
    },
    coins: [[14, 5], [17, 15]],
    decor: [['pineTall', 3, 11], ['pineTall', 24, 11], ['pineSmall', 8, 14]],
    creatures: [
      { who: 'wolf', col: 3, row: 15, way: 'right', speed: 2, range: 24 },
      { who: 'brownBear', col: 14, row: 15, way: 'right', speed: 1, range: 40 },
      { who: 'owl', col: 18, row: 3, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // O YETI OR NOT: a dead end. In from the forest's ground; the yeti paces the floor; a stair of ledges up the left wall to a pelmeni.
  room({
    id: SIB.yeti, cell: [0, 4], sector: 13,
    palette: { K: ['mineRock', 12], S: ['snowGround', 1], F: ['snowFill', 1], L: ['snowLedge', 3], B: ['pineBark', 9] },
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 16, 'K').box(30, 3, 31, 13, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(8, 15, 10, 15, 'L').box(5, 13, 7, 13, 'L').box(2, 11, 4, 11, 'L'); // the stair up the wall
      g.box(14, 3, 15, 6, 'B'); // a root hanging from the roof
    },
    coins: [[6, 11]],
    item: { name: 'pelmeni2', col: 2, row: 9, sprite: SIB_SPRITE.pelmeni },
    decor: [['stalactites', 5, 3], ['stalactites', 20, 3], ['pineSmall', 24, 14]],
    creatures: [
      { who: 'yeti', col: 14, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'owl', col: 4, row: 6, way: 'right', speed: 1, range: 80 },
    ],
  }),

  // M MINE ALL MINE: the mine's mouth, lit. In by the gantry; the cart waits at its end and takes him down to the gallery; left along it a
  // pocket with the lamp, right the way on; a rope back up from the gallery to the gantry.
  room({
    id: SIB.mine, cell: [0, 6], sector: 14,
    palette: { K: ['mineRock', 12], B: ['timber', 8], L: ['mineRail', 11], R: ['rope', 13], S: ['snowGround', 1] },
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 3, 'K').box(0, 8, 1, 17, 'K').box(30, 3, 31, 14, 'K');
      g.box(0, 7, 15, 7, 'B').clear(13, 7, 15, 7).box(14, 7, 14, 17, 'R'); // the gantry, the rope's gap
      g.box(0, 18, 31, 19, 'K');
      g.box(24, 16, 26, 16, 'B').box(21, 14, 23, 14, 'B').box(18, 12, 20, 12, 'B'); // timber ledges up to a coin
    },
    coins: [[19, 10]],
    item: { name: 'lamp', col: 3, row: 16, sprite: SIB_SPRITE.lamp },
    decor: [['minePortal', 0, 0], ['mineLamp', 11, 4], ['mineLamp', 27, 14], ['stalactites', 17, 3]],
    creatures: [
      { who: 'bat', col: 16, row: 5, way: 'right', speed: 2, range: 28 },
      { who: 'bat', col: 6, row: 12, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // S SHAFT OF DARKNESS: dark. In low; a stair of ledges up to the top of a rock wall and a stepping stone over the water, none of which is shown
  // (or there) until the lamp is taken; the miner paces the wall's top; out through the floor at the right, into the lake.
  room({
    id: SIB.shaft, cell: [0, 7], sector: 15,
    palette: SHAFT_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 14, 'K').box(30, 3, 31, 17, 'K');
      g.box(0, 18, 31, 19, 'K').clear(27, 18, 29, 19); // the floor, the shaft's gap (the lake below)
      g.box(14, 10, 19, 17, 'K'); // the wall
      g.box(21, 18, 25, 19, 'W'); // the water of the pit
    },
    coins: [[16, 8]],
    decor: [['stalactites', 4, 3], ['stalactites', 22, 3], ['mineLamp', 8, 4]],
    creatures: [
      { who: 'miner', col: 14, row: 8, way: 'right', speed: 1, range: 24 },
      { who: 'bat', col: 22, row: 10, way: 'right', speed: 2, range: 20 },
    ],
  }),

  // L BAIKAL TO BASICS: the lake. Dropped in at the right on the shore; the ice westward in two patches of six either side of a rock island,
  // each cracking if he stands on it too long, a seal on the first and a reindeer on the second; the left shore's gap and its rope go down to the village.
  room({
    id: SIB.lake, cell: [1, 7], sector: 16, palette: LAKE_PALETTE,
    paint(g) {
      sky(g, 2, []);
      g.clear(27, 0, 29, 1); // the shaft above
      g.box(0, 2, 1, 11, 'K').box(30, 2, 31, 11, 'K');
      g.box(22, 12, 31, 12, 'S').box(22, 13, 31, 19, 'K'); // the right shore
      g.box(13, 12, 15, 12, 'S').box(13, 13, 15, 19, 'K'); // the island
      g.box(0, 12, 3, 12, 'S').box(0, 13, 3, 19, 'K').clear(4, 12, 6, 19).box(5, 12, 5, 19, 'R'); // the left shore, then the gap and its rope down
      g.box(16, 12, 21, 12, 'I').box(7, 12, 12, 12, 'I'); // the ice
      g.box(7, 13, 12, 19, 'W').box(16, 13, 21, 19, 'W'); // the water
    },
    coins: [[14, 10], [25, 10]],
    decor: [['pineSmall', 23, 9], ['pineTall', 27, 6], ['pole', 1, 8]],
    creatures: [
      { who: 'nerpa', col: 16, row: 10, way: 'right', speed: 1, range: 32 },
      { who: 'reindeer', col: 7, row: 10, way: 'right', speed: 1, range: 32 },
    ],
  }),

  // G BORDER LINE CASE: the village. Down the rope onto the snow; cabins, a woodpile to climb, a wolf and a reindeer about; the barrier at
  // the right (the ticket lifts it) and beyond it the way east, shut for now with a sign.
  room({
    id: SIB.border, cell: [2, 7], sector: 17,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], S: ['snowGround', 1], F: ['snowFill', 1], L: ['logWall', 9], B: ['barrier', 2], P: ['planks', 8], R: ['rope', 13] },
    paint(g) {
      sky(g, 2, [[0, 5], [14, 20]]);
      g.clear(4, 0, 6, 1).box(5, 0, 5, 16, 'R'); // the rope from the lake
      g.box(0, 2, 1, 16, 'F').box(30, 2, 31, 13, 'F').box(30, 14, 31, 16, 'P');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(11, 15, 13, 16, 'L').box(14, 13, 16, 16, 'L'); // the woodpile
      g.box(28, 13, 29, 16, 'B'); // the barrier
    },
    coins: [[10, 15], [24, 15]],
    decor: [['cabin', 6, 13], ['cabin', 18, 13], [{ text: 'CHINA COMING SOON', colour: 7 }, 9, 6], ['pole', 25, 11]],
    creatures: [
      { who: 'reindeer', col: 19, row: 15, way: 'right', speed: 1, range: 32 },
      { who: 'wolf', col: 6, row: 15, way: 'right', speed: 2, range: 20 },
    ],
  }),
];
