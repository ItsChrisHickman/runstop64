import type { CharAnim, CrackSpec, LiftSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { codeOf, Grid, room, type Palette } from './layout';
import { bogieBars, buffersAt, CAR, farWall, gangwayAt, hatch, TRAIN_PALETTE, trainAnims, undercarriage, windowAt } from './train';

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
 *
 * The joins wind: the train is two lanes, the roof and, under it, the cars joined by gangways (A-B-C; the roof's hatches go down to them); C's rope
 * climbs through the mine's floor, M's gantry goes west to the forest and the forest's rope drops to the sleeper (B-C-M-F-B is a loop); the shaft and the
 * lake are joined by a rope both ways.
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

/** The bogies of a car's rooms (the wheels' first columns: each bogie two wheels, an axle bar between). */
const BOGIES = [4, 25] as const;

/**
 * A passenger car (train.ts): the roof's walkway at row 9 with its curved edge under it and the hatches (a gap of three with a rope each), the
 * car's two ends, shut but for the gangway at an end that joins the next car, the floor, the bogies' wheels and the rail. The sky above is open:
 * the tunnels sweep it.
 */
function carriage(g: Grid, hatches: readonly number[], gangways: { left: boolean; right: boolean }) {
  g.box(0, CAR.roof, 31, CAR.roof, 'D');
  farWall(g, 2, 29);
  g.box(0, 10, 1, 16, 'T').box(30, 10, 31, 16, 'T');
  if (gangways.left) g.clear(0, CAR.gangwayTop, 1, CAR.gangwayBottom);
  if (gangways.right) g.clear(30, CAR.gangwayTop, 31, CAR.gangwayBottom);
  undercarriage(g, 0, 31, BOGIES);
  for (const h of hatches) hatch(g, h);
}

/** The tender's rooms: the passenger car's characters, in the same places (the wheels 4 and the rail 5), with coal and the mine's rock for the two it has no use for. */
const TENDER_PALETTE = {
  D: ['roofDeck', 12], K: ['coal', 12], F: ['carFloor', 9], W: ['wheel', 2], L: ['rail', 12], T: ['trainSide', 5], M: ['mineRock', 12], R: ['ironLadder', 7],
} as const satisfies Palette;
const TENDER_BOGIES = [4, 24] as const;

/** What goes on every car's roof and under it: a vent or two up top, the bogies' axle bars. */
const CAR_FITTINGS = [...bogieBars(BOGIES), ...buffersAt(0, 31)] as const;

// ---- the tunnels, ice and cart ------------------------------------------------------------------------

/** The portal's tile in the train rooms' palette. */
const TUNNEL_CODE = codeOf(TRAIN_PALETTE, 'X');
const MOUTH = { code: TUNNEL_CODE, cols: 6, wall: 2, top: 2, bottom: 8, step: 10, rest: 130, warn: 48 } as const;
/**
 * The tunnel mouths: the dining car's from the front of the train (the right); the sleeper's two, one from each end, a pause apart (they run at
 * the same pace, 190 frames apart in a fixed phase, so they cross each other over the same cells every cycle: harmless, the roof is what they sweep).
 */
export const TUNNELS: readonly TunnelSpec[] = [
  { room: SIB.gravy, from: 'right', offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'right', offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'left', offset: 230, ...MOUTH },
];

const LAKE_PALETTE = {
  S: ['snowGround', 1], K: ['mineRock', 12], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6], R: ['rope', 13], C: ['snowCrust', 3],
} as const satisfies Palette;
const ICE = { row: 12, codes: [codeOf(LAKE_PALETTE, 'I'), codeOf(LAKE_PALETTE, 'J'), codeOf(LAKE_PALETTE, 'H')], crack: 56, wide: 88, gone: 120, away: 240 } as const;
/**
 * The lake's two patches of ice: six cells each. His two-cell body is over a patch for about 56 frames when he walks across without stopping
 * (measured: 71 frames over 8 cells, the patch showing its lines as he leaves), so crossing at his walk is safe by a hair and waiting is not.
 */
export const CRACKS: readonly CrackSpec[] = [
  { room: SIB.lake, col: 16, cols: 6, ...ICE }, { room: SIB.lake, col: 7, cols: 6, ...ICE },
];

/**
 * The mine cart: Monty on the Run's lift (a ride down when stood on: type 2), with a picture of its own. It hangs from its cable in a gap at the
 * west end of the high shelf (cell 20, floor 12), clear of the way along the gantry, and sets him down in the gallery (floor 18) beside the way on.
 */
export const CART_COL = 20;
export const CART_FLOOR = 12;
export const LIFTS: readonly LiftSpec[] = [
  { room: SIB.mine, x: 26 + 4 * CART_COL, y: 0x32 + (CART_FLOOR - 2 + 3) * 8 - 0x17, type: 2, speedDir: 0x80, sound: false, look: { top: SIB_SPRITE.cartTop, bottom: SIB_SPRITE.cartBottom, colour: 8 } },
];

/** What moves in the train's rooms: the dining car's and the sleeper's windows and the tender's rail and wheels (train.ts). */
export const TRAIN_ANIMS: readonly CharAnim[] = [
  ...trainAnims(SIB.gravy, TRAIN_PALETTE, true), ...trainAnims(SIB.sleeper, TRAIN_PALETTE, true), ...trainAnims(SIB.coal, TENDER_PALETTE, false),
];

// ---- the dark shaft's ledges ---------------------------------------------------------------------------
/** The shaft is dark: its rock is a dim blue, and the ledges are only felt (dots) until the lamp is taken. */
const SHAFT_PALETTE = {
  K: ['mineRock', 6], B: ['timber', 8], W: ['lakeWater', 14], G: ['ledgeGhost', 11], Q: ['coalSeam', 6], R: ['rope', 6],
} as const satisfies Palette;
/** The ledges the lamp shows: playfield cells (row, column). */
export const SHAFT_LEDGES: readonly (readonly [row: number, col: number])[] = [
  ...[6, 7, 8, 9].map((c) => [15, c] as const), ...[10, 11, 12, 13].map((c) => [13, c] as const),
];
/** The stepping stone in the pit the lamp shows (over the water, so no ghost of it stands there before). */
export const SHAFT_STONE: readonly (readonly [row: number, col: number])[] = [[18, 22], [18, 23]];
export const SHAFT_CODE = codeOf(SHAFT_PALETTE, 'B');

// ---- the rooms ----------------------------------------------------------------------------------------------

export const SIBERIA_ROOMS: readonly RoomSpec[] = [
  // A THE GRAVY TRAIN: the dining car. Along the roof from Moscow's carriage, a tunnel mouth sweeping it from the front; two hatches with a
  // rope each into the car, whose floor runs between them (a pocket at the left: a pelmeni; the inspector between) and on out through the gangway
  // at the right into the sleeper's corridor. Two windows with the snow going by, tables, lamps and the samovar; RESTAURANT on a board along its side.
  room({
    id: SIB.gravy, cell: [1, 4], sector: 9, palette: TRAIN_PALETTE,
    paint(g) {
      carriage(g, [12, 25], { left: false, right: true });
    },
    coins: [[28, 15]],
    item: { name: 'pelmeni1', col: 3, row: 15, sprite: SIB_SPRITE.pelmeni },
    decor: [
      windowAt(3), windowAt(15), ['carLamp', 9, 11], ['carLamp', 21, 11], ['diningTable', 14, 15], ['diningTable', 19, 15], ['diningSamovar', 22, 14],
      [{ text: 'RESTAURANT', colour: 7 }, 13, 10], gangwayAt(30), ['roofVent', 4, 8], ['stovepipe', 19, 6], ['roofVent', 28, 8], ...CAR_FITTINGS,
    ],
    creatures: [{ who: 'inspector', col: 14, row: 15, way: 'right', speed: 1, range: 56 }],
  }),

  // B SLEEPER HIT: the sleeper. The roof again, two mouths, one from each end a pause apart; two hatches into the corridor of berths (an
  // inspector in its right half, a coin each end), a gangway at each end to the cars either side; a rope at column 22 climbs out of the ceiling to the forest.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: TRAIN_PALETTE,
    paint(g) {
      carriage(g, [7, 15], { left: true, right: true });
      g.box(22, 0, 22, 8, 'R'); // the rope up through the sky to the forest
    },
    coins: [[3, 15], [27, 15]],
    decor: [
      windowAt(9), windowAt(17), windowAt(24), ['bunk', 10, 15], ['bunk', 20, 15], gangwayAt(0), gangwayAt(30), ['roofVent', 3, 8], ['roofVent', 12, 8], ['roofVent', 26, 8], ...CAR_FITTINGS,
    ],
    creatures: [{ who: 'inspector', col: 19, row: 15, way: 'right', speed: 1, range: 56 }],
  }),

  // C COAL COMFORT: the tender. In from the roof along the rim; a hatch down to the pocket under it (the gangway from the sleeper's corridor comes in
  // at its left); the coal in steps down to the trough (the stoker paces it) and up the heaps on the far side to the locomotive's cab (its roof, a gauge
  // and the firebox door in its back plate, the boiler's end rising behind), where the ticket lies; a rope from the heap climbs through the ceiling into the mine's floor.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11, palette: TENDER_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'M').clear(7, 0, 9, 1).box(8, 0, 8, 10, 'R'); // the mine's floor over it, and the rope up into the mine
      g.box(30, 2, 31, 8, 'T').box(0, 10, 1, 14, 'T'); // the boiler's end, and the tender's end (its gangway open below)
      g.box(0, 9, 5, 9, 'D').clear(1, 9, 3, 9).box(2, 9, 2, 16, 'R'); // the rim, with its hatch and rope
      g.box(6, 11, 8, 16, 'K').box(9, 13, 11, 16, 'K').box(12, 15, 19, 16, 'K').box(20, 13, 22, 16, 'K').box(23, 11, 25, 16, 'K'); // the coal in steps
      g.box(26, 9, 31, 9, 'D').box(26, 10, 31, 16, 'T'); // the cab (its roof the heap's last step)
      g.clear(27, 11, 28, 12).clear(27, 14, 28, 15); // the holes the gauge and the firebox door show in
      undercarriage(g, 0, 31, TENDER_BOGIES);
    },
    coins: [[15, 13]],
    item: { name: 'ticket', col: 28, row: 7, sprite: SIB_SPRITE.ticket },
    decor: [['coalBucket', 13, 13], gangwayAt(0), ['cabGauge', 27, 11], ['cabFire', 27, 14], ...bogieBars(TENDER_BOGIES)],
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
    decor: [['pineTall', 3, 11], ['pineTall', 24, 11], ['pineSmall', 8, 14], ['pineSmall', 19, 14]],
    creatures: [
      { who: 'wolf', col: 3, row: 15, way: 'right', speed: 2, range: 24 },
      { who: 'brownBear', col: 14, row: 15, way: 'right', speed: 1, range: 40 },
      { who: 'owl', col: 18, row: 3, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // O YETI OR NOT: a dead end. In from the forest's ground; the yeti paces the floor; a stair of ledges up the left wall to a pelmeni.
  room({
    id: SIB.yeti, cell: [0, 4], sector: 13,
    palette: { K: ['mineRock', 12], S: ['snowGround', 1], F: ['snowFill', 1], L: ['snowLedge', 3], Q: ['coalSeam', 11], B: ['pineBark', 9] },
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 16, 'K').box(30, 3, 31, 13, 'K');
      g.box(0, 3, 3, 7, 'K').box(26, 3, 31, 6, 'K').box(6, 3, 9, 4, 'K').box(16, 3, 22, 3, 'K'); // the cave's roof, ragged
      g.box(0, 10, 1, 13, 'Q').box(30, 7, 31, 9, 'Q').box(7, 3, 8, 3, 'Q').box(27, 4, 29, 5, 'Q'); // seams of coal
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(8, 15, 10, 15, 'L').box(5, 13, 7, 13, 'L').box(2, 11, 4, 11, 'L'); // the stair up the wall
      g.box(14, 3, 15, 6, 'B'); // a root hanging from the roof
    },
    coins: [[6, 11]],
    item: { name: 'pelmeni2', col: 2, row: 9, sprite: SIB_SPRITE.pelmeni },
    decor: [['stalactites', 11, 3], ['stalactites', 23, 3], ['boulders', 18, 15], ['boulders', 26, 15]],
    creatures: [
      { who: 'yeti', col: 14, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'owl', col: 4, row: 6, way: 'right', speed: 1, range: 80 },
    ],
  }),

  // M MINE ALL MINE: the mine's mouth, lit. In by the gantry; the rope at its end down to the gallery; left along it (over the gap of the tender's
  // rope) a pocket with the lamp, right the way on to the shaft; timber ledges up to a shelf with a coin, at whose end the cart hangs and takes him
  // back down. The tender's rope climbs through the gallery's floor.
  room({
    id: SIB.mine, cell: [0, 6], sector: 14,
    palette: { K: ['mineRock', 12], Q: ['coalSeam', 11], B: ['timber', 8], R: ['rope', 13] },
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 3, 'K').box(0, 8, 1, 17, 'K').box(30, 3, 31, 14, 'K');
      g.box(16, 3, 20, 4, 'K').box(26, 3, 29, 5, 'K').box(6, 3, 9, 3, 'K'); // rock hanging from the roof
      g.box(17, 4, 19, 4, 'Q').box(27, 4, 28, 4, 'Q').box(30, 8, 31, 11, 'Q'); // a seam of coal
      g.box(0, 7, 12, 7, 'B').box(14, 7, 14, 17, 'R'); // the gantry, and the rope in its gap
      g.box(0, 18, 31, 19, 'K').clear(7, 18, 9, 19).box(8, 17, 8, 19, 'R'); // the gallery's floor, the gap and the tender's rope
      g.box(22, 16, 24, 16, 'B').box(25, 14, 27, 14, 'B').box(21, 12, 24, 12, 'B'); // timber ledges up to the shelf (the cart hangs off its west end)
    },
    coins: [[22, 10]],
    item: { name: 'lamp', col: 3, row: 16, sprite: SIB_SPRITE.lamp },
    decor: [['minePortal', 0, 0], ['stalactites', 11, 3], ['stalactites', 26, 6], ['pitProp', 11, 15], ['pitProp', 17, 15], ['coalBucket', 5, 16], ['boulders', 27, 16]],
    creatures: [
      { who: 'bat', col: 16, row: 5, way: 'right', speed: 2, range: 28 },
      { who: 'bat', col: 6, row: 12, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // S SHAFT OF DARKNESS: dark (its rock a dim blue). In low; a rock step one row high, then a stair of two ledges up to the top of a rock wall and a stepping stone
  // over the water, felt only as dots until the lamp is taken (M), when they are there; the miner paces the wall's top; out through the floor at
  // the right, a rope in the gap that goes down to the lake and up again.
  room({
    id: SIB.shaft, cell: [0, 7], sector: 15,
    palette: SHAFT_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 14, 'K').box(30, 3, 31, 17, 'K');
      g.box(0, 3, 6, 4, 'K').box(22, 3, 29, 5, 'K').box(10, 3, 12, 3, 'K'); // the roof's lumps
      g.box(0, 18, 31, 19, 'K').clear(27, 18, 29, 19).box(28, 16, 28, 19, 'R'); // the floor, the shaft's gap (the lake below) and the rope in it
      g.box(3, 17, 5, 17, 'K'); // a rock step by the way in
      g.box(14, 11, 19, 17, 'K').box(15, 13, 16, 14, 'Q').box(17, 15, 18, 16, 'Q'); // the wall, a seam of coal in it
      g.box(21, 18, 25, 19, 'W'); // the water of the pit
      for (const [row, col] of SHAFT_LEDGES) g.box(col, row, col, row, 'G'); // the ledges, felt only
    },
    coins: [[15, 9]],
    decor: [['stalactites', 7, 3], ['stalactites', 17, 3]],
    creatures: [
      { who: 'miner', col: 17, row: 9, way: 'right', speed: 1, range: 16 },
      { who: 'bat', col: 22, row: 10, way: 'right', speed: 2, range: 20 },
    ],
  }),

  // L BAIKAL TO BASICS: the lake. In at the right on the shore by the rope from the shaft; the ice westward in two patches of six either side of a
  // rock island, each cracking if he stands on it too long, a seal on the first and a reindeer on the second; the left shore's gap and its rope go
  // down to the village.
  room({
    id: SIB.lake, cell: [1, 7], sector: 16, palette: LAKE_PALETTE,
    paint(g) {
      sky(g, 2, []);
      g.clear(27, 0, 29, 1).box(28, 0, 28, 11, 'R'); // the shaft above, and its rope
      g.box(0, 2, 1, 11, 'K').box(30, 2, 31, 11, 'K');
      g.box(22, 12, 31, 12, 'S').box(22, 13, 31, 19, 'K'); // the right shore
      g.box(13, 12, 15, 12, 'S').box(13, 13, 15, 19, 'K'); // the island
      g.box(0, 12, 3, 12, 'S').box(0, 13, 3, 19, 'K').clear(4, 12, 6, 19).box(5, 12, 5, 19, 'R'); // the left shore, then the gap and its rope down
      g.box(16, 12, 21, 12, 'I').box(7, 12, 12, 12, 'I'); // the ice
      g.box(7, 13, 12, 19, 'W').box(16, 13, 21, 19, 'W'); // the water
    },
    coins: [[14, 10], [25, 10]],
    decor: [['pineSmall', 2, 9], ['fishHut', 22, 10]],
    creatures: [
      { who: 'nerpa', col: 16, row: 10, way: 'right', speed: 1, range: 32 },
      { who: 'reindeer', col: 7, row: 10, way: 'right', speed: 1, range: 32 },
    ],
  }),

  // G BORDER LINE CASE: the village. Down the rope onto the snow; cabins, a woodpile to climb, a wolf and a reindeer about; the barrier at
  // the right (the ticket lifts it) and beyond it the way east, to China.
  room({
    id: SIB.border, cell: [2, 7], sector: 17,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], S: ['snowGround', 1], F: ['snowFill', 1], L: ['logWall', 9], B: ['barrier', 2], P: ['planks', 8], R: ['rope', 13] },
    paint(g) {
      sky(g, 2, [[0, 5], [14, 20]]);
      g.clear(4, 0, 6, 1).box(5, 0, 5, 16, 'R'); // the rope from the lake
      g.box(0, 2, 1, 16, 'F').box(30, 2, 31, 13, 'F');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(11, 15, 13, 16, 'L').box(14, 13, 16, 16, 'L'); // the woodpile
      g.box(28, 13, 29, 16, 'B'); // the barrier
    },
    coins: [[12, 13], [24, 15]],
    decor: [['cabin', 6, 13], ['cabin', 18, 13], [{ text: 'ROAD TO CHINA', colour: 7 }, 9, 6], ['pole', 26, 13], ['pineSmall', 2, 14]],
    creatures: [
      { who: 'reindeer', col: 19, row: 15, way: 'right', speed: 1, range: 32 },
      { who: 'wolf', col: 6, row: 15, way: 'right', speed: 2, range: 20 },
    ],
  }),
];
