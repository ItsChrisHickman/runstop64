import type { DragonSpec, PulseSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { CHINA_SPRITE, DRAGON_POINTERS } from './china-pointers';
import { codeOf, room, type Palette } from './layout';

/**
 * China, the third region of Do Svidaniya Monty (docs/dosvidaniya-china.md): nine rooms in a block four wide and three high at columns 8-11 of
 * the exit grid, entered from Siberia's border village (room G, column 7) and left east into Japan (not yet built).
 *
 *            col 8                col 9               col 10                col 11
 *   row 0   C  WALL YOU NEED     .                   G  ROOF AND READY     H  WILLOW PATTERN
 *   row 1   T  TOWER OF POWER    E  STALL IN LOVE    F  GATE EXPECTATIONS  J  JUNK FOOD
 *   row 2   A  ALL WALL AND NO PLAY  D  ALLEY OOP        .                     .
 *
 * Playfield cells as in moscow.ts. The firecracker string (D) and the three figures' arms (H) are `pulses`; the dragon (E) is a `dragon`; the tower's
 * trapdoor (T) is opened by the key (D), the city gate (F) by the rice hat (C), the junk's raft (J) by the bamboo (H).
 *
 * The joins wind: the wall's foot has a tunnel under the wall (to the hutong) and a stair up its flank and along its top (to the tower); the hutong's rope
 * climbs into the market, the market's two ways west go to the tower's hall and walkway, the tower's rope drops to the wall's foot: A D E T A is a loop. Beyond
 * the gate the way runs on: the palace's courtyard and roofs, the garden's stones, the quay.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from Siberia's (9-17): they never change once the region has shipped. */
export const CHI = { wall: 18, alley: 19, tower: 20, top: 21, market: 22, gate: 23, roofs: 24, willow: 25, junk: 26 } as const;

/** The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 18 on. */
const NAMES = [
  'ALL WALL AND NO PLAY', 'ALLEY OOP', 'TOWER OF POWER', 'WALL YOU NEED', 'STALL IN LOVE', 'GATE EXPECTATIONS', 'ROOF AND READY', 'WILLOW PATTERN', 'JUNK FOOD',
] as const;
export const CHINA_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the wall grey, the hutong dark grey, the tower grey, the top light grey, the market red, the gate red, the roofs yellow, the garden light blue, the quay brown). */
export const CHINA_COLOURS: readonly number[] = [12, 11, 12, 15, 2, 2, 7, 14, 9];
/** Where China's sectors begin in the world's list. */
export const FIRST_SECTOR = 18;

// ---- the palettes --------------------------------------------------------------------------------------
const WALL_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 15], M: ['merlon', 15], T: ['hillTurf', 5], E: ['hillEarth', 9], S: ['stoneStep', 15], R: ['rope', 13],
} as const satisfies Palette;

const ALLEY_PALETTE = {
  B: ['hutongBrick', 11], P: ['wallPave', 12], S: ['shelf', 9], R: ['rope', 13], K: ['cracker', 2], X: ['crackerBang', 7], Y: ['crackerSpark', 1], E: ['redBeam', 2],
} as const satisfies Palette;

const TOWER_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 15], S: ['stoneStep', 15], T: ['trapdoor', 9], R: ['rope', 13],
} as const satisfies Palette;

const TOP_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 15], L: ['stoneStep', 15], M: ['merlon', 15], R: ['rope', 13],
} as const satisfies Palette;

const MARKET_PALETTE = {
  B: ['hutongBrick', 11], P: ['wallPave', 12], A: ['awning', 2], Y: ['awning', 7], R: ['rope', 13],
} as const satisfies Palette;

const GATE_PALETTE = {
  P: ['wallPave', 15], W: ['redWall', 2], D: ['gateDoor', 2], R: ['rope', 13], Y: ['roofTile', 7], E: ['redEave', 2],
} as const satisfies Palette;

const ROOFS_PALETTE = {
  P: ['wallPave', 15], W: ['redWall', 2], Y: ['roofTile', 7], E: ['redEave', 2], R: ['rope', 13],
} as const satisfies Palette;

/** The garden is all blue and white, as the plate: porcelain, the river's waves, white stones, the figures' arms and hands, a rope. */
const WILLOW_PALETTE = {
  B: ['blueBank', 14], W: ['blueWave', 6], S: ['stoneRound', 1], A: ['arm', 1], H: ['hand', 1], R: ['rope', 14],
} as const satisfies Palette;

const JUNK_PALETTE = {
  E: ['hillEarth', 9], D: ['dock', 9], W: ['lakeWater', 6], R: ['rope', 13], H: ['junkHull', 2], Q: ['raft', 13],
} as const satisfies Palette;

// ---- the timed strikes ----------------------------------------------------------------------------------
/**
 * The hutong's string of firecrackers: nine hung under the beam (cols 19-27, rows 7-8), lit from the left end and going off a cell every 6 frames (the fuse
 * flickering a cell ahead for 18 frames), each a bang for 12 frames, then a scrap of paper (nothing) until the string is hung again at the end of the
 * 300-frame period. The bang front moves faster than he walks (a cell in 8 frames), so he waits until the string has gone off and crosses while it is spent.
 */
const CRACKERS = { first: 19, count: 9, rows: [7, 8] as const, period: 300, lit: 30, lag: 6, warn: 18, live: 12 } as const;
export const CRACKER_PULSES: readonly PulseSpec[] = Array.from({ length: CRACKERS.count }, (_, k): PulseSpec => ({
  room: CHI.alley, col: CRACKERS.first + k, row: CRACKERS.rows[0], cols: 1, rows: 2,
  period: CRACKERS.period, start: CRACKERS.lit + k * CRACKERS.lag, warn: CRACKERS.warn, live: CRACKERS.live,
  idle: codeOf(ALLEY_PALETTE, 'K'), warnCode: codeOf(ALLEY_PALETTE, 'Y'), liveCode: codeOf(ALLEY_PALETTE, 'X'), spent: 0,
}));

/**
 * The willow garden's three figures on the bridge, each reaching down with both arms over one of the river's gaps (the arm 2 cells wide from the bridge's
 * underside, row 6, to the water, the hand at row 14): the arm twitches for 20 frames, reaches for 36, and is gone, a third of the 150-frame period
 * apart from the next figure's.
 */
const ARMS = { gaps: [13, 20, 25] as const, top: 6, hand: 14, period: 150, apart: 40, warn: 20, live: 36 } as const;
export const ARM_PULSES: readonly PulseSpec[] = ARMS.gaps.flatMap((col, k): PulseSpec[] => {
  const common = { room: CHI.willow, col, cols: 2, period: ARMS.period, start: k * ARMS.apart, warn: ARMS.warn, live: ARMS.live, idle: 0, spent: 0 };
  return [
    { ...common, row: ARMS.top, rows: ARMS.hand - ARMS.top, warnCode: codeOf(WILLOW_PALETTE, 'A'), liveCode: codeOf(WILLOW_PALETTE, 'A') },
    { ...common, row: ARMS.hand, rows: 1, warnCode: codeOf(WILLOW_PALETTE, 'H'), liveCode: codeOf(WILLOW_PALETTE, 'H') },
  ];
});
export const PULSES: readonly PulseSpec[] = [...CRACKER_PULSES, ...ARM_PULSES];

// ---- the dragon ------------------------------------------------------------------------------------------
/**
 * The New Year dragon: a head, four body pieces and a tail on sprites 0, 1, 2, 4, 5 and 6, round a closed path that goes over the top of the market, comes down the
 * right side, runs back along the street and rises in the middle (the corners are the top left of the head's 24 by 21 picture, in playfield cells).
 */
export const DRAGON: DragonSpec = {
  room: CHI.market,
  path: [[13, 2.5], [19, 1.5], [25, 2.5], [27.5, 7], [27, 12.2], [24, 13.6], [20, 12.4], [17.5, 8.5], [15, 4.5]],
  speed: 1, gap: 18,
  pieces: [
    { sprite: 0, colour: 2, frames: [DRAGON_POINTERS.headLeftOpen, DRAGON_POINTERS.headLeftShut, DRAGON_POINTERS.headRightOpen, DRAGON_POINTERS.headRightShut] },
    { sprite: 1, colour: 7, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 2, colour: 2, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 4, colour: 7, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 5, colour: 2, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 6, colour: 7, frames: [DRAGON_POINTERS.tailLeft, DRAGON_POINTERS.tailRight] },
  ],
};

// ---- the key items' places -------------------------------------------------------------------------------
/** The trapdoor's plug in the tower's ceiling (cols 15-17, rows 0-1) and the rope's last two cells that take its place (col 16): playfield cells (row, column). */
export const TRAPDOOR_CELLS: readonly (readonly [row: number, col: number])[] = [0, 1].flatMap((row) => [15, 16, 17].map((col) => [row, col] as const));
export const TRAPDOOR_ROPE: readonly (readonly [row: number, col: number])[] = [[0, 16], [1, 16]];
/** The gate's doors (cols 14-17, rows 11-16). */
export const DOOR_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: 6 }, (_, i) => 11 + i).flatMap((row) => [14, 15, 16, 17].map((col) => [row, col] as const));
/** Where the bamboo puts the raft: the river's cells at the quay's floor (row 17, cols 19-25). */
export const RAFT_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: 7 }, (_, i) => [17, 19 + i] as const);
export const TOWER_ROPE_CODE = codeOf(TOWER_PALETTE, 'R');
export const JUNK_RAFT_CODE = codeOf(JUNK_PALETTE, 'Q');

// ---- the rooms ----------------------------------------------------------------------------------------------

export const CHINA_ROOMS: readonly RoomSpec[] = [
  // A ALL WALL AND NO PLAY: the Great Wall's foot. In from Siberia, low. The wall is a block across the right of the room with a tunnel through its foot (the way east, low,
  // to the hutong) and a stair of three stone steps up its flank onto its top, along it to a rope at column 25 up through the sky into the tower (the dumplings at the wall's far end).
  room({
    id: CHI.wall, cell: [2, 8], sector: 18, palette: WALL_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'E').clear(24, 0, 26, 1);
      g.box(0, 2, 1, 13, 'E');
      g.box(0, 17, 31, 17, 'T').box(0, 18, 31, 19, 'E');
      g.box(4, 15, 6, 15, 'S').box(7, 13, 9, 13, 'S').box(10, 11, 12, 11, 'S'); // the stair of steps
      g.box(13, 10, 31, 13, 'G').box(13, 9, 31, 9, 'P'); // the wall, its paved top
      g.box(30, 2, 31, 8, 'G'); // the tower's wall at the right
      for (const c of [14, 20]) g.box(c, 8, c + 1, 8, 'M'); // the merlons
      g.box(25, 0, 25, 8, 'R');
    },
    coins: [[8, 11], [21, 7]],
    item: { name: 'dumplings1', col: 28, row: 7, sprite: CHINA_SPRITE.dumplings },
    decor: [['bambooClump', 2, 13], ['bambooClump', 9, 13], ['wallFlag', 16, 6], ['hangingLantern', 17, 14], ['hangingLantern', 23, 14], ['hangingLantern', 29, 14], ['rockery', 10, 15]],
    creatures: [
      { who: 'panda', col: 3, row: 15, way: 'right', speed: 1, range: 48 },
      { who: 'kite', col: 19, row: 2, way: 'down', speed: 1, range: 20 },
    ],
  }),

  // D ALLEY OOP: the hutong. In from the wall's tunnel, low; a rope at column 4 up to the market. The ground runs east to a dead end past a bicycle and a monk on a pogo stick; shelves
  // up the middle to a roof ledge under a beam and a string of firecrackers that go off in turn; the key at its end.
  room({
    id: CHI.alley, cell: [2, 9], sector: 19, palette: ALLEY_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'B').clear(3, 0, 5, 1);
      g.box(0, 2, 1, 13, 'B').box(30, 2, 31, 16, 'B');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'B');
      g.box(4, 0, 4, 16, 'R');
      g.box(8, 15, 10, 15, 'S').box(11, 13, 13, 13, 'S').box(14, 11, 16, 11, 'S'); // the shelves
      g.box(17, 9, 29, 9, 'P'); // the roof ledge
      g.box(17, 2, 29, 5, 'B').box(19, 6, 27, 6, 'E'); // the house over it, the beam
      for (let c = CRACKERS.first; c < CRACKERS.first + CRACKERS.count; c++) g.box(c, 7, c, 8, 'K'); // the crackers
    },
    coins: [[12, 11], [27, 15]],
    item: { name: 'key', col: 28, row: 7, sprite: CHINA_SPRITE.key },
    decor: [['laundry', 6, 5], ['hutongDoor', 20, 14], ['boxes', 15, 15], ['latticeWindow', 20, 3], ['latticeWindow', 25, 3], ['hangingLantern', 12, 2], ['hangingLantern', 14, 2]],
    creatures: [
      { who: 'bicycle', col: 6, row: 15, way: 'right', speed: 2, range: 28 },
      { who: 'monk', col: 24, row: 13, way: 'down', speed: 1, range: 20 },
    ],
  }),

  // T TOWER OF POWER: the watchtower's hall. In by the rope from the wall (the floor gap at column 25); a stair of ledges up to a walkway over the hall; out east low or high. A rope
  // at column 16 under the trapdoor (shut until the key) climbs to the wall's top.
  room({
    id: CHI.tower, cell: [1, 8], sector: 20, palette: TOWER_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'G').box(15, 0, 17, 1, 'T');
      g.box(0, 2, 1, 16, 'G').box(30, 2, 31, 5, 'G').box(30, 9, 31, 13, 'G');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'G').clear(24, 17, 26, 19).box(25, 16, 25, 19, 'R');
      g.box(3, 15, 5, 15, 'S').box(6, 13, 8, 13, 'S').box(9, 11, 11, 11, 'S'); // the stair of ledges
      g.box(12, 9, 31, 9, 'P'); // the walkway
      g.box(16, 2, 16, 8, 'R'); // the rope under the trapdoor
    },
    coins: [[7, 11], [24, 7]],
    decor: [['arrowSlit', 5, 5], ['arrowSlit', 9, 5], ['banner', 20, 3], ['rack', 13, 15], ['gong', 18, 14], ['drum', 28, 15], ['hangingLantern', 12, 2], ['hangingLantern', 27, 2]],
    creatures: [
      { who: 'warrior', col: 8, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'lantern', col: 22, row: 2, way: 'down', speed: 1, range: 16 },
      { who: 'cricket', col: 18, row: 7, way: 'right', speed: 1, range: 32 },
    ],
  }),

  // C WALL YOU NEED: the wall's top by night, a dead end. In by the floor gap from the tower; a winding climb: right up two steps from the floor to a long walkway back
  // west, up the left to the beacon's platform and east along it to the rice hat.
  room({
    id: CHI.top, cell: [0, 8], sector: 21, palette: TOP_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'G');
      g.box(0, 2, 1, 16, 'G').box(30, 2, 31, 16, 'G');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'G').clear(15, 17, 17, 19).box(16, 16, 16, 19, 'R');
      g.box(22, 15, 24, 15, 'L').box(25, 13, 27, 13, 'L'); // the steps up from the floor
      g.box(6, 11, 29, 11, 'L'); // the long walkway
      g.box(3, 9, 5, 9, 'L').box(6, 7, 8, 7, 'L'); // the steps up the left
      g.box(9, 5, 29, 5, 'L'); // the beacon's platform
      for (const c of [2, 5, 8, 11]) g.box(c, 16, c, 16, 'M');
    },
    coins: [[23, 13], [14, 9]],
    item: { name: 'rice hat', col: 27, row: 3, sprite: CHINA_SPRITE.riceHat },
    decor: [['brazier', 22, 3], ['wallFlag', 4, 3], ['rack', 14, 3], ['hangingLantern', 11, 2], ['hangingLantern', 19, 2], ['rockery', 10, 15]],
    creatures: [
      { who: 'warrior', col: 3, row: 15, way: 'right', speed: 1, range: 64 },
      { who: 'kite', col: 14, row: 6, way: 'down', speed: 1, range: 24 },
      { who: 'monk', col: 19, row: 13, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // E STALL IN LOVE: the market at New Year. In from the tower's hall (low, the street) or its walkway (high, the awnings, a rope down to the street); a gap in the street with a rope
  // down into the hutong (col 4, under the hutong's rope); east, low, to the gate. The dragon loops through the right of the room.
  room({
    id: CHI.market, cell: [1, 9], sector: 22, palette: MARKET_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'B');
      g.box(0, 2, 1, 5, 'B').box(0, 9, 1, 13, 'B').box(30, 2, 31, 13, 'B');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'B').clear(3, 17, 5, 19).box(4, 16, 4, 19, 'R');
      g.box(0, 9, 3, 9, 'A').box(4, 9, 7, 9, 'Y').box(8, 9, 10, 9, 'A'); // the awnings
      g.box(12, 9, 12, 16, 'R'); // the rope down from them
    },
    coins: [[6, 7], [21, 15]],
    decor: [['lanternString', 2, 2], ['lanternString', 7, 2], ['lanternString', 12, 2], ['stall', 6, 14], ['stall', 13, 14], ['stall', 23, 14], ['drum', 28, 15], ['banner', 3, 11], ['pottedPlant', 10, 15]],
  }),

  // F GATE EXPECTATIONS: the Forbidden City's gate. In from the market, low, into the outer court (a stone lion alive); the gate tower across the room with its doors across the court
  // (shut until the rice hat); inside, a court with a guard and the rope up at column 24.
  room({
    id: CHI.gate, cell: [1, 10], sector: 23, palette: GATE_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').clear(23, 0, 25, 1);
      g.box(0, 2, 1, 13, 'W').box(30, 2, 31, 16, 'W');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'W');
      g.box(14, 5, 17, 10, 'W').box(14, 11, 17, 16, 'D'); // the gate tower and its doors
      g.box(12, 4, 19, 4, 'Y').box(13, 5, 18, 5, 'E').box(14, 2, 17, 3, 'W'); // its swept roof and the second storey over it
      g.box(24, 0, 24, 16, 'R');
    },
    coins: [[8, 15], [28, 15]],
    decor: [['lionStatue', 11, 15], ['lionStatue', 18, 15], [{ text: 'FORBIDDEN CITY', colour: 7 }, 0, 6], ['hangingLantern', 12, 8], ['hangingLantern', 19, 8], ['pottedPlant', 26, 15], ['cloudFrieze', 4, 2]],
    creatures: [
      { who: 'lion', col: 3, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'imperialGuard', col: 19, row: 15, way: 'right', speed: 1, range: 32 },
    ],
  }),

  // G ROOF AND READY: the palace. In by the rope from the gate onto the courtyard; west a dead end with dumplings and a coin; east a stair of glazed eaves up to the ridge, along it east.
  room({
    id: CHI.roofs, cell: [0, 10], sector: 24, palette: ROOFS_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W');
      g.box(0, 2, 1, 16, 'W').box(30, 2, 31, 5, 'W').box(30, 9, 31, 16, 'W');
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'W').clear(23, 17, 25, 19).box(24, 16, 24, 19, 'R');
      g.box(27, 15, 29, 15, 'E').box(24, 13, 26, 13, 'E').box(21, 11, 23, 11, 'E'); // the eaves
      g.box(18, 9, 31, 9, 'Y'); // the ridge
    },
    coins: [[12, 15], [26, 7]],
    item: { name: 'dumplings2', col: 4, row: 15, sprite: CHINA_SPRITE.dumplings },
    decor: [['roofDragon', 18, 7], ['lanternPost', 20, 14], ['banner', 8, 11], ['cloudFrieze', 2, 3], ['cloudFrieze', 8, 3], ['cloudFrieze', 14, 3], ['rockery', 13, 15], ['pottedPlant', 2, 15]],
    creatures: [
      { who: 'lion', col: 7, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'lantern', col: 16, row: 9, way: 'down', speed: 1, range: 32 },
    ],
  }),

  // H WILLOW PATTERN: the garden, all blue and white. In from the palace's ridge, high, onto the bank; a well in the bank (a rope down to the quay); steps down to the shore and the stepping
  // stones over the river to the island, under three figures on the bridge who reach down over the gaps; the bamboo on the island.
  room({
    id: CHI.willow, cell: [0, 11], sector: 25, palette: WILLOW_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'B');
      g.box(0, 2, 1, 5, 'B').box(31, 2, 31, 14, 'B');
      g.box(0, 9, 1, 19, 'B').box(3, 8, 3, 19, 'R'); // the entry bank, the well and its rope
      g.box(5, 11, 6, 19, 'B').box(7, 13, 8, 19, 'B').box(9, 15, 11, 19, 'B'); // the steps and the shore
      g.box(12, 16, 26, 19, 'W'); // the river
      g.box(15, 15, 18, 16, 'S').box(22, 15, 24, 16, 'S'); // the stones
      g.box(27, 15, 31, 19, 'B'); // the island
    },
    coins: [[19, 13]],
    item: { name: 'bamboo', col: 29, row: 13, sprite: CHINA_SPRITE.bamboo },
    decor: [['willowTree', 4, 5], ['archBridge', 11, 4], ['archBridge', 19, 4], ['crouchFigure', 13, 2], ['crouchFigure', 20, 2], ['crouchFigure', 25, 2], ['pagoda', 27, 6]],
    creatures: [
      { who: 'dove', col: 10, row: 7, way: 'right', speed: 1, range: 48 },
      { who: 'dove', col: 20, row: 9, way: 'right', speed: 1, range: 40 },
      { who: 'carp', col: 12, row: 18, way: 'right', speed: 1, range: 56 },
    ],
  }),

  // J JUNK FOOD: the quay. In by the rope from the garden's well; the quay runs east (a bicycle) to the river, seven cells of water; across it the junk and the way east, shut with
  // a sign until Japan is built. The bamboo puts a raft across.
  room({
    id: CHI.junk, cell: [1, 11], sector: 26, palette: JUNK_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'E').clear(2, 0, 4, 1);
      g.box(0, 2, 1, 16, 'E').box(30, 2, 31, 13, 'E').box(30, 14, 31, 16, 'D');
      g.box(0, 17, 18, 17, 'D').box(0, 18, 18, 19, 'E');
      g.box(19, 17, 25, 19, 'W');
      g.box(26, 17, 31, 17, 'D').box(26, 18, 31, 19, 'H');
      g.box(3, 0, 3, 16, 'R');
    },
    coins: [[29, 15]],
    decor: [['lanternPost', 9, 14], ['boxes', 16, 15], ['junk', 23, 10], ['hangingLantern', 12, 2], ['hangingLantern', 18, 2], ['hangingLantern', 24, 2], [{ text: 'JAPAN COMING SOON', colour: 7 }, 8, 4]],
    creatures: [
      { who: 'bicycle', col: 5, row: 15, way: 'right', speed: 2, range: 28 },
      { who: 'cricket', col: 12, row: 15, way: 'right', speed: 1, range: 24 },
      { who: 'carp', col: 19, row: 18, way: 'right', speed: 1, range: 40 },
    ],
  }),
];
