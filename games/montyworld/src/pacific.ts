import type { Arrival, CharAnim, CrackSpec, DragonSpec, EscalatorSpec, LavaSpec, PulseSpec, RollerSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import type { WorldDecor } from './art/world';
import { BOULDER_POINTERS } from './andes-pointers';
import { DRAGON_POINTERS } from './china-pointers';
import { BUBBLE_FRAMES, SPLASH_FRAMES, STREAK_FRAMES } from './art/pacific-falls';
import { codeOf, decorIndex, fillCells, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty (docs/dosvidaniya-pacific.md): seventeen rooms in a block thirteen wide and two high at columns 17-29 of the exit grid
 * (rows 1-2), entered from Japan's cargo ship (column 16) and left east out of the cargo plane's hold (the Andes).
 *
 *            col 17      18      19      20        21       22        23       24       25        26       27       28       29
 *   row 1      .         .       .    E LEI OF    .         .      I WHALE  J ROAD   K HANA      .        .        .        .
 *                                       THE LAND                    OF A TIME  TO HANA BANANA
 *   row 2   A STERN   B BOX   C PIER  D SURF   F CLAM     G MOLE   H KELP    L SEA    M FISH    N COFFEE  O MAUNA  P HILO   Q HOLD YOUR
 *           WARNING   CLEVER  PRESSURE AND TURF DOWN      -OKAI    WANTED   CAVE     OUT OF    BREAK     KEA-OS   GOODBYE  HORSES
 *                                                                                      WATER
 *
 * (The letters are the design's.) Playfield cells as in moscow.ts. Floors ("F"): the ship's deck 11 (its landing from Japan's gangway 13, the engine room's grating 18), the quays 11 and 18,
 * the roofs 7, the road's three levels 18, 13 and 8, the sea's floor 19. The three reef rooms and the cave (swim rooms) are open water: Monty swims there (swim.ts), and the sea
 * is open only once the snorkel is taken (the waves at Waikiki and Hana kill before). The torches of the luau are `pulses`, the road's cars `tunnels` over one bridge each (`span`),
 * the volcano's `risingLava`, the loader an upward `escalators` ride, the crane's swinging cargo creatures on their rails.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from Japan's (27-37): they never change once the region has shipped. */
export const PAC = {
  stern: 38, box: 39, pier: 40, surf: 41, lei: 42, clam: 43, mole: 44, kelp: 45, whale: 46, road: 47, cave: 48, hana: 49, fish: 50, coffee: 51, mauna: 52, hilo: 53, hold: 54,
  // (the second pass's rooms go on from Rio's last, 77, so no id and no table place ever changes: the luau is two rooms now, `feast` and `lei` (the show, with its stage and the lei), and Diamond Head has two)
  feast: 78, diamond: 79, lookout: 80,
} as const;

/** The rooms of open water (swim.ts): Monty swims in them. */
export const SWIM_ROOMS: readonly number[] = [PAC.clam, PAC.kelp, PAC.cave, PAC.fish];

/** The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($8F-$91, $93, $94; $8E is the first aid kit, $92 the smoke stack, $9B the treasure). */
export const PAC_SPRITE = { cutters: 0x8f, snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94 } as const;

/** The names (plain and evocative, a pun where it lands, no Z, no Bond), the sectors from 38 on. */
const NAMES = [
  'STERN WARNING', 'BOX CLEVER', 'PIER PRESSURE', 'SURF AND TURF', 'LEI OF THE LAND', 'CLAM DOWN', 'MOLE-OKAI', 'KELP WANTED', 'WHALE OF A TIME', 'THE ROAD TO HANA',
  'THE SEA CAVE', 'HANA BANANA', 'FISH OUT OF WATER', 'COFFEE BREAK', 'MAUNA KEA-OS', 'HILO GOODBYE', 'HOLD YOUR HORSES',
] as const;
export const PACIFIC_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The second pass's rooms' names, the sectors from 78 on (after Rio's: appended last in the world's list). */
const EXTRA_NAMES = ['THE FEAST', 'DIAMOND HEAD', 'THE LOOKOUT'] as const;
export const PACIFIC_EXTRA_SECTORS: readonly Sector[] = EXTRA_NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
export const PACIFIC_EXTRA_COLOURS: readonly number[] = [10, 5, 1];
/** The map's colour of each (the ship red, the harbour and beach yellows, the luau pink, the reefs blues, Molokai green, Maui light green, Hana grey, the farm brown, the volcano white, the airport grey). */
export const PACIFIC_COLOURS: readonly number[] = [2, 8, 14, 7, 10, 6, 5, 14, 3, 13, 6, 11, 6, 9, 1, 12, 15];

// ---- the palettes --------------------------------------------------------------------------------------
export const STERN_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], G: ['pacGrating', 3], C: ['pacCrate', 9], L: ['pacSteelLadder', 7], W: ['pacWaves', 6],
} as const satisfies Palette;

export const BOX_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], T: ['pacContainer', 8], N: ['pacContainer', 5], G: ['pacGrating', 3], L: ['pacSteelLadder', 7], K: ['pacChainGate', 1], W: ['pacWaves', 6],
} as const satisfies Palette;

export const PIER_PALETTE = {
  B: ['pacBoardwalk', 9], H: ['pacHullPlate', 2], S: ['pacPile', 9], M: ['pacContainer', 8], R: ['pacBamboo', 13], X: ['pacPlankCracked', 9], Y: ['pacPlankSplit', 9], P: ['pacRoad', 11],
} as const satisfies Palette;

export const SURF_PALETTE = {
  A: ['pacSand', 7], F: ['pacSandFill', 7], B: ['pacBoardwalk', 9], R: ['pacBamboo', 13], T: ['pacThatch', 9], H: ['pacHotelWall', 1], S: ['pacSeaWall', 8],
} as const satisfies Palette;

/** The feast's eight: the sand, the crates, the rope, the deck's boards and the torches' embers, small and tall flames. */
export const FEAST_PALETTE = {
  A: ['pacSand', 7], C: ['pacCrate', 9], R: ['pacBamboo', 13], Y: ['pacEmber', 7], Z: ['pacFlameWarn', 7], F: ['pacFlame', 2], B: ['pacBoardwalk', 9],
} as const satisfies Palette;

/** The show's: the lawn's and the stage's boards, the crate steps, the rope the snorkel hangs, the lagoon's and the dive's deadly waves, the sand. */
export const LEI_PALETTE = {
  B: ['pacBoardwalk', 9], C: ['pacCrate', 9], R: ['pacBamboo', 13], W: ['pacWaves', 6], A: ['pacSand', 7],
} as const satisfies Palette;

/** Diamond Head's trail and the bunker's: the stone steps, the concrete, the rope up from the feast. */
export const DIAMOND_PALETTE = {
  T: ['pacTrailStone', 1], R: ['pacBamboo', 13], C: ['pacConcrete', 12],
} as const satisfies Palette;

/** A swim room's tiles: the sea, its surface, the seabed (the floor), the reef's rock and coral, the walls. */
export const SEA_PALETTE = {
  S: ['pacSea', 6], U: ['pacSeaSurface', 14], B: ['pacSand', 7], F: ['pacSandFill', 7], R: ['pacReefRock', 4], C: ['pacCoral', 10], K: ['pacReefRock', 9],
} as const satisfies Palette;

/** The second reef's: the sea, the reef's rock and coral, and the moray's hole, its eyes in the hole (the warning) and its body lunging (a pulse draws them). The room's top is the sea's surface (no ceiling). */
export const KELP_PALETTE = {
  S: ['pacSea', 6], K: ['pacReefRock', 9], C: ['pacCoral', 10], H: ['pacMorayHole', 4], E: ['pacMorayEyes', 10], M: ['pacMorayBody', 10],
} as const satisfies Palette;

/** The third reef's: the sea, its surface, the seabed, the cliffs' and the reef's rock, coral, and the plates of a wreck's hull. */
export const FISH_PALETTE = {
  S: ['pacSea', 6], U: ['pacSeaSurface', 14], B: ['pacSand', 7], K: ['pacReefRock', 9], R: ['pacReefRock', 4], C: ['pacCoral', 10], H: ['pacHullPlate', 2],
} as const satisfies Palette;

export const MOLE_PALETTE = {
  S: ['pacWallStone', 9], W: ['pacWaves', 6], A: ['pacSand', 7], F: ['pacSandFill', 7], G: ['pacTurf', 5],
} as const satisfies Palette;

export const WHALE_PALETTE = {
  Q: ['pacWallStone', 9], W: ['pacWaves', 6], H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], R: ['pacBamboo', 13], C: ['pacCrate', 9], F: ['pacSandFill', 7],
} as const satisfies Palette;

/** The road's eight: the road, the bridge's deck, the cliff, the turf verge, the bamboo to climb, and the red car's cabin and body. */
export const ROAD_PALETTE = {
  R: ['pacRoad', 11], B: ['pacBridgeDeck', 8], S: ['pacBasalt', 5], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

export const HANA_PALETTE = {
  B: ['pacBasalt', 9], K: ['pacBlackSand', 11], T: ['pacTurf', 5], R: ['pacBamboo', 13], W: ['pacWaves', 6], P: ['pacSwash', 6],
} as const satisfies Palette;

export const COFFEE_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], S: ['pacSoil', 2], R: ['pacBamboo', 13], A: ['pacSand', 7],
} as const satisfies Palette;

export const MAUNA_PALETTE = {
  S: ['pacSnow', 1], M: ['pacMagma', 8], C: ['pacMagmaCrest', 7], B: ['pacBasalt', 2], K: ['pacCrust', 9], R: ['pacBamboo', 13],
} as const satisfies Palette;

export const HILO_PALETTE = {
  W: ['pacHotelWall', 7], P: ['pacRoad', 11], J: ['pacBridgeDeck', 8], R: ['pacBamboo', 13], G: ['pacFuselage', 1], C: ['pacCrate', 9],
} as const satisfies Palette;

export const HOLD_PALETTE = {
  U: ['pacFuselage', 14], F: ['pacHoldFloor', 8], N: ['pacNet', 13], C: ['pacCrate', 9], I: ['pacRib', 3], D: ['pacContainerDoor', 8],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * The luau's three torches (E; `pulses`): a flame two cells wide and two tall (rows 16-17: Monty's own) in the lane. It burns low (a small flame, safe to walk through) for 60 frames, flickers for 30 (the
 * warning: it grows and shrinks), is full height and deadly for 48 and settles for 12, a 150-frame period. The torches go off 40 frames after one another, left to right (the offsets run backwards in the period),
 * so a walker who goes as one dies down finds the next low as he comes; between two torches is a gap of three cells to wait in.
 */
export const TORCHES = { cols: [22, 17, 12] as const, row: 16, rows: 2, period: 150, idle: 60, warn: 30, live: 48, apart: 40 } as const;
/** A torch is two groups on one timing (a pulse draws one character over its cells): the foot (the row Monty's feet are in), an ember that flickers into a small flame, and the head (the row above), empty until the tall flame fills both. */
const torch = (col: number, k: number, row: number, idle: number, warnCode: number): PulseSpec => ({
  room: PAC.feast, col, row, cols: 2, rows: 1, period: TORCHES.period, start: TORCHES.idle, warn: TORCHES.warn, live: TORCHES.live, offset: (TORCHES.period - k * TORCHES.apart) % TORCHES.period,
  idle, warnCode, liveCode: codeOf(FEAST_PALETTE, 'F'), spent: idle,
});
export const TORCH_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row + 1, codeOf(FEAST_PALETTE, 'Y'), codeOf(FEAST_PALETTE, 'Z')));
export const TORCH_HEAD_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row, 0, 0));

/**
 * The Road to Hana's one-lane bridges (J; `tunnels` with a `span`): a red rental car, four cells long and two tall (the lane's own two rows), drives over each bridge, always the way Monty is going: it waits
 * 150 frames off the bridge, flashes its headlamps at the bridge's near end for 32 (the warning: the edge of the bridge lights), then drives over a cell every 4 frames (a bridge is 12 cells: 64 frames to be gone).
 * Monty takes 16 frames a cell, so a crossing that starts as the car clears the far end is a clear one (192 frames against the 182 the car waits and flashes, and it only gains from behind a little after);
 * stepping on as it flashes is not. The three bridges' cars are 70 frames apart so they come round in turn.
 */
export const BRIDGES = [
  { level: 18, from: 'left', first: 8, last: 19, offset: 0 },
  { level: 13, from: 'right', first: 12, last: 23, offset: 70 },
  { level: 8, from: 'left', first: 11, last: 22, offset: 140 },
] as const;
export const CAR = { cols: 4, step: 4, rest: 150, warn: 32 } as const;
export const BRIDGE_CARS: readonly TunnelSpec[] = BRIDGES.map((b): TunnelSpec => ({
  room: PAC.road, from: b.from, code: codeOf(ROAD_PALETTE, 'Z'), cols: CAR.cols, top: b.level - 2, bottom: b.level - 1, step: CAR.step, rest: CAR.rest, warn: CAR.warn, offset: b.offset, span: { from: b.first, to: b.last },
  picture: [[0, codeOf(ROAD_PALETTE, 'Y'), codeOf(ROAD_PALETTE, 'Y'), 0], [codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z')]],
}));

/** The volcano's lava (N): it starts at row 19 when he comes in and rises a row every 56 frames to row 11, holds 150 and drains a row every 12. Ledges at row 11 and above are always clear. */
export const LAVA: LavaSpec = {
  room: PAC.mauna, col: 5, cols: 23, baseRow: 19, topRow: 11, stepFrames: 56, holdFrames: 150, drainFrames: 12, code: codeOf(MAUNA_PALETTE, 'M'), crest: codeOf(MAUNA_PALETTE, 'C'),
};

/**
 * The moray (KELP WANTED; `pulses`): in its hole in the rock's far face (col 26, row 16) the eyes appear and blink for 45 frames (the warning), then it lunges out across the way to the cave, a body three cells long and two rows tall (cols 27-29,
 * rows 15-16), deadly for 30 frames, and draws back into the hole. A 150-frame period, 60 of them at rest: seen before it springs, beaten by timing.
 */
export const MORAY = { hole: [26, 16], body: { col: 27, row: 15, cols: 3, rows: 2 }, period: 150, start: 60, warn: 45, live: 30 } as const;
export const MORAY_PULSES: readonly PulseSpec[] = [
  { room: PAC.kelp, col: MORAY.hole[0], row: MORAY.hole[1], cols: 1, rows: 1, period: MORAY.period, start: MORAY.start, warn: MORAY.warn, live: MORAY.live, idle: codeOf(KELP_PALETTE, 'H'), warnCode: codeOf(KELP_PALETTE, 'E'), liveCode: codeOf(KELP_PALETTE, 'H'), spent: codeOf(KELP_PALETTE, 'H') },
  { room: PAC.kelp, ...MORAY.body, period: MORAY.period, start: MORAY.start + MORAY.warn, warn: 15, live: MORAY.live, idle: 0, warnCode: codeOf(KELP_PALETTE, 'M'), liveCode: codeOf(KELP_PALETTE, 'M'), spent: 0 },
];

/**
 * The waterfalls move (charAnims cycles, charanim.ts): the streaks of the cascade's three middle rows (cells 2-7) fall, a roll of 3 pixels a frame, and the splash at its foot (cells 8-9) throws up spray and mist, in the Road to Hana (its two
 * cascades down the cliff) and in the sea cave (the pool's fall into it).
 */
export const FALLS_ANIMS: readonly CharAnim[] = [PAC.road, PAC.cave].flatMap((room): CharAnim[] => {
  const cells = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ decor: decorIndex('pacWaterfall'), cell: from + i }));
  return [
    { kind: 'cycle', room, chars: cells(2, 7), frames: STREAK_FRAMES, every: 1 },
    { kind: 'cycle', room, chars: cells(8, 9), frames: SPLASH_FRAMES, every: 2 },
  ];
});

/**
 * Hana's wave (`pulses`): the surf's wave sweeps up the black sand from the cove: three groups of cells two rows tall (rows 16-17, the height of him) start one after another from the cove (cols 18-19, 16-17, 15), spray for 16 frames (the warning), the wave
 * is across the beach for 40 (deadly: jump it or wait on the rope's foot), and it draws back the way it came. A 220-frame period.
 */
export const WAVE = { period: 220, start: 100, warn: 16, live: 40, rows: 2, row: 16, groups: [{ col: 18, cols: 2 }, { col: 16, cols: 2 }, { col: 15, cols: 1 }], apart: 14 } as const;
export const WAVE_PULSES: readonly PulseSpec[] = WAVE.groups.map((g, k): PulseSpec => ({
  room: PAC.hana, col: g.col, row: WAVE.row, cols: g.cols, rows: WAVE.rows, period: WAVE.period, start: WAVE.start + k * WAVE.apart, warn: WAVE.warn, live: WAVE.live - k * 4,
  idle: 0, warnCode: codeOf(HANA_PALETTE, 'P'), liveCode: codeOf(HANA_PALETTE, 'P'), spent: 0,
}));

/** The bubbles rise in every underwater room (a `charAnims` cycle over the decoration's two characters: the rings climb 2 pixels a step and come round again at the foot). */
export const BUBBLE_ANIMS: readonly CharAnim[] = SWIM_ROOMS.map((room): CharAnim => ({
  kind: 'cycle', room, chars: [0, 1].map((cell) => ({ decor: decorIndex('pacBubbles'), cell })), frames: BUBBLE_FRAMES, every: 1,
}));

/** The arrival banners: Honolulu's harbour welcomes him off the ship, and each island names itself on coming ashore (the sea rooms between are no island's). One name row: 32 letters. */
export const ARRIVALS: readonly Arrival[] = [
  { rooms: [PAC.pier], from: [PAC.box], text: 'WELCOME TO HAWAII: OAHU' },
  { rooms: [PAC.mole], text: 'HAWAII: MOLOKAI' },
  { rooms: [PAC.whale, PAC.road, PAC.hana, PAC.cave], text: 'HAWAII: MAUI' },
  { rooms: [PAC.coffee, PAC.mauna, PAC.hilo], text: 'HAWAII: THE BIG ISLAND' },
];

/**
 * The rotten planks on the roofs (PIER PRESSURE; `cracks`, as Lake Baikal's ice): six cells of the warehouses' roof over the alley between them, whole boards at first that crack, split and fall away after 56, 88 and 120 frames of standing on
 * them (crossing at his walk is safe by a hair and waiting is not), the planks back 240 frames after; what is under them is the street, and the guard.
 */
export const PIER_CRACKS: readonly CrackSpec[] = [{ room: PAC.pier, col: 14, cols: 6, row: 7, codes: [codeOf(PIER_PALETTE, 'B'), codeOf(PIER_PALETTE, 'X'), codeOf(PIER_PALETTE, 'Y')], crack: 56, wide: 88, gone: 120, away: 240 }];

/** The cargo loader (P): the conveyor truck's foot on the apron at columns 14-15 carries him up its slope, three cells along and five rows up, to the gantry along the plane's back (the landing at col 17, floor 12). */
export const LOADER: EscalatorSpec = { room: PAC.hilo, col: 14, row: 17, dx: 1, dy: -1, cols: 3, rows: 5, frames: 50 };

// ---- the key items' places -------------------------------------------------------------------------
/** The ramp's chain across BOX CLEVER's bow (cols 30-31, rows 9-10, and the two gutter columns 32-33 that mirror the edge): the bolt cutters take it away. */
export const CHAIN_CELLS: readonly (readonly [row: number, col: number])[] = [9, 10].flatMap((row) => [30, 31, 32, 33].map((col) => [row, col] as const));
/** The show's dive (cols 27-29, row 12: the lawn's last boards at the stage's far end are deadly waves until the snorkel; then they are gone, a drop into the first reef, with a rope hung down col 28 to climb back). */
export const DIVE_CELLS: readonly (readonly [row: number, col: number])[] = [27, 28, 29].map((col) => [12, col] as const);
export const DIVE_ROPE: readonly (readonly [row: number, col: number])[] = Array.from({ length: 10 }, (_, i) => [10 + i, 28] as const);
export const DIVE_ROPE_CODE = codeOf(LEI_PALETTE, 'R');
/** Hana's cove pool (cols 20-22, rows 18-19): the waves the snorkel takes away, and the rope that hangs into it then (not before: a rope over the surf would let him walk across it). */
export const COVE_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [20, 21, 22].map((col) => [row, col] as const));
export const COVE_ROPE: readonly (readonly [row: number, col: number])[] = [15, 16, 17, 18, 19].map((row) => [row, 21] as const);
export const COVE_ROPE_CODE = codeOf(HANA_PALETTE, 'R');
/** The plane's rear door (cols 30-31, rows 14-15, and the two gutter columns 32-33 that mirror the edge): the parachute opens it, onto the Andes' sky. */
export const PLANE_DOOR_CELLS: readonly (readonly [row: number, col: number])[] = [14, 15].flatMap((row) => [30, 31, 32, 33].map((col) => [row, col] as const));

// ---- the luau at sunset -------------------------------------------------------------------------------------
/** The feast's paint: the lane's sand under a long deck on stilts, the rope from Waikiki through the lane's floor, a bamboo ladder up through the deck; the rest is backdrop (decorations). */
const paintFeast = (g: Grid): void => {
  g.box(0, 18, 26, 19, 'A').box(30, 18, 31, 19, 'A'); // the lane, the rope's gap (cols 27-29)
  g.box(28, 16, 28, 19, 'R');
  g.box(0, 12, 31, 12, 'B').clear(4, 12, 6, 12); // the deck over the lane, the opening for the ladder
  g.box(5, 11, 5, 17, 'R'); // the ladder up to the deck
  g.box(14, 0, 14, 11, 'R'); // the rope up the hillside to Diamond Head's trail
};
export const FEAST_COINS = [[25, 15], [20, 16], [15, 16], [23, 10]] as const;
/** The cells the backdrop leaves clear: the coins, the torches' (the fire jets' cells). */
const FEAST_CLEAR: readonly (readonly [col: number, row: number])[] = [
  ...FEAST_COINS,
  ...TORCHES.cols.flatMap((col) => [[col, 16], [col + 1, 16], [col, 17], [col + 1, 17]] as const),
];
const feastBackdrop = (r0: number, r1: number, piece: WorldDecor) => fillCells(paintFeast, FEAST_CLEAR, [0, r0, 31, r1], piece);

/** The show's paint: the lawn at the left (floor 12), crate steps up to the stage (floor 8) over the lagoon, steps down to the far lawn whose last boards are the dive's waves; the lagoon's deadly waves under the stage. */
const paintShow = (g: Grid): void => {
  g.box(0, 12, 8, 12, 'B').box(9, 10, 10, 12, 'C'); // the lawn and the first step
  g.box(11, 8, 22, 8, 'B'); // the stage
  g.box(23, 10, 24, 12, 'C').box(25, 12, 31, 12, 'B'); // the step down and the far lawn
  g.box(27, 12, 29, 12, 'W'); // the dive: deadly waves until the snorkel
  g.box(8, 18, 26, 19, 'W'); // the lagoon under the stage
  g.box(0, 18, 7, 19, 'A').box(30, 18, 31, 19, 'A'); // the shore each side of the lagoon (the left one joins the feast's lane; the dive's drop, cols 27-29, is open to the reef)
};
const SHOW_COINS = [[11, 6], [20, 6], [24, 8], [8, 10]] as const;
/** The cells the backdrop leaves clear: the coins, the lei's two by two. */
const SHOW_CLEAR: readonly (readonly [col: number, row: number])[] = [...SHOW_COINS, [17, 6], [18, 6], [17, 7], [18, 7]];
const showBackdrop = (r0: number, r1: number, piece: WorldDecor) => fillCells(paintShow, SHOW_CLEAR, [0, r0, 31, r1], piece);

const paintDiamond = (g: Grid): void => {
    g.box(0, 18, 12, 18, 'T').box(16, 18, 27, 18, 'T'); // the first ledge, the rope's opening (cols 13-15); it ends at the first step and the lower ledges end short of the right edge
    g.box(14, 14, 14, 19, 'R');
    g.box(28, 16, 29, 16, 'T'); // the first step
    g.box(4, 14, 29, 14, 'T'); // the second ledge
    g.box(2, 12, 3, 12, 'T'); // the second step
    g.box(4, 10, 31, 10, 'T'); // the third ledge, out of the room at the right
};
const DIAMOND_COINS = [[20, 16], [8, 12], [24, 8], [12, 8]] as const;
const diamondBackdrop = (r0: number, r1: number, piece: WorldDecor) => fillCells(paintDiamond, DIAMOND_COINS, [0, r0, 31, r1], piece);
const paintLookout = (g: Grid): void => {
    g.box(2, 4, 12, 5, 'C').box(0, 10, 13, 10, 'C'); // the tunnel's roof and floor (a concrete tube open at the left to the trail)
    g.box(14, 8, 17, 8, 'T').box(18, 6, 21, 6, 'T').box(22, 4, 31, 4, 'T'); // the stairs and the summit
};
const LOOKOUT_COINS = [[23, 2], [26, 2], [6, 8]] as const;
const lookoutBackdrop = (r0: number, r1: number, piece: WorldDecor) => fillCells(paintLookout, [...LOOKOUT_COINS, [24, 2], [25, 2], [24, 3], [25, 3]], [0, r0, 31, r1], piece);

/**
 * The tumbling rocks of THE LOOKOUT (rollers; the Andes' boulders' pictures): two, half a period apart, from the crater rim above the summit's lookout (col 28, falling in at the top of the room) along the summit (floor 4), down the stairs (floors 6, 8) a pixel a frame, a fall of two rows at each
 * edge, and gone at the tunnel's mouth (col 13): the tunnel is where to wait, the rocks never come into it. `every` 400 frames; a rock is on the path about 170 of them, so one at a time.
 */
export const ROCK_PATH: readonly (readonly [col: number, row: number])[] = [[28, 0], [28, 2], [22.4, 2], [21.4, 4], [18.2, 4], [17.4, 6], [14.2, 6], [13.4, 8], [13.4, 8]];
export const ROCKS: readonly RollerSpec[] = [0, 200].map((start, i): RollerSpec => ({
  room: PAC.lookout, sprite: [0, 1][i] ?? 0, path: ROCK_PATH, speed: 1, every: 400, start, frames: BOULDER_POINTERS, colour: 9,
}));

/** The sea cave's rock and water: a roof with the pool's gap (cols 23-25) at the top right, short stalactites, humps on the seabed (the serpent's loop is clear of them), the doorway to the reef at the left (rows 14-18). */
const paintCave = (g: Grid): void => {
  g.box(0, 0, 31, 3, 'K').clear(23, 0, 25, 3).box(0, 4, 1, 13, 'K').box(30, 4, 31, 19, 'K');
  g.box(2, 4, 29, 18, 'S').box(0, 14, 1, 18, 'S').box(2, 4, 22, 4, 'U').box(26, 4, 29, 4, 'U'); // (the surface leaves the waterfall pool's gap open)
  g.box(0, 19, 31, 19, 'B');
  g.box(4, 4, 6, 6, 'K').box(10, 4, 12, 5, 'K').box(16, 4, 18, 5, 'K'); // stalactites
  g.box(8, 17, 10, 18, 'R').box(14, 17, 16, 18, 'R').box(20, 17, 23, 18, 'C');
};

/**
 * The sea serpent: a head, four body pieces and a tail on sprites 0, 1, 2, 4, 5 and 6, round a closed path that circles the cavern's left and middle above the seabed's lane, leaving the right-hand side and the top rows clear (the corners are the top left of the head's 24 by 21 picture, in playfield cells); its pictures
 * are the blocks China's dragon has in China, put in while the cave is loaded (`roomBlocks`).
 */
export const SERPENT: DragonSpec = {
  room: PAC.cave,
  path: [[7, 11], [11, 7.5], [16, 7], [20, 8.5], [22, 11], [20, 12.5], [16, 13.5], [11, 13]],
  speed: 1, gap: 18,
  pieces: [
    { sprite: 0, colour: 13, frames: [DRAGON_POINTERS.headLeftOpen, DRAGON_POINTERS.headLeftShut, DRAGON_POINTERS.headRightOpen, DRAGON_POINTERS.headRightShut] },
    { sprite: 1, colour: 5, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 2, colour: 13, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 4, colour: 5, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 5, colour: 13, frames: [DRAGON_POINTERS.body, DRAGON_POINTERS.body] },
    { sprite: 6, colour: 5, frames: [DRAGON_POINTERS.tailLeft, DRAGON_POINTERS.tailRight] },
  ],
};

// ---- the rooms ----------------------------------------------------------------------------------------------

const ALL_ROOMS: readonly RoomSpec[] = [
  // A STERN WARNING: the ship's stern in section. In from Japan's gangway on the landing at the left (floor 13); a jump up onto the main deck (floor 11) with the funnel and the bridge on it, out right on the deck.
  // A hatch (cols 27-29) with a ladder down into the engine room: the grating (floor 18), two crushers and a bilge gap between the ladder and the pocket at the left where the bolt cutters lie. Out right, low.
  room({
    id: PAC.stern, cell: [2, 17], sector: 38, palette: STERN_PALETTE,
    paint(g) {
      g.box(0, 13, 1, 19, 'H').box(2, 14, 3, 18, 'H').box(0, 13, 3, 13, 'D'); // the hull's side and the landing
      g.box(30, 12, 31, 15, 'H').box(30, 18, 31, 19, 'H');
      g.box(4, 11, 31, 11, 'D').box(4, 12, 31, 12, 'H').clear(27, 11, 29, 12); // the main deck, its belly and the hatch
      g.box(4, 18, 29, 18, 'G').clear(16, 18, 17, 18).box(0, 19, 31, 19, 'H').box(16, 19, 17, 19, 'W'); // the grating, the bilge
      g.box(4, 16, 7, 17, 'C').box(8, 17, 9, 17, 'C'); // the pocket's crates and the step to them
      g.box(28, 10, 28, 17, 'L'); // the ladder
    },
    coins: [[20, 10], [15, 16], [7, 14]],
    item: { name: 'musubi1', col: 5, row: 14, sprite: PAC_SPRITE.musubi },
    decor: [['pacFunnel', 9, 7], ['pacBridge', 14, 8], ['pacAnchor', 5, 9], ['pacLifeRing', 25, 9], ['pacEngineBlock', 23, 15], ['pacGauge', 22, 14]],
    creatures: [{ who: 'pacParrot', col: 6, row: 5, way: 'right', speed: 1, range: 130 }],
    crushers: [{ col: 11, row: 13, height: 5 }, { col: 19, row: 13, height: 5 }],
  }),

  // B BOX CLEVER: the bow in section. Two lanes in at the left (the deck, floor 11; the hold, floor 18). The deck is a canyon of containers (floors 9, 7, 9), the crane's crate sweeping the deck past them to the bow, where the ramp is chained
  // until the cutters. The hold's gantries cross the flooded bilge (a shark in it) and a cargo shelf off the ladder holds a musubi; a ladder (col 3) joins the two lanes.
  room({
    id: PAC.box, cell: [2, 18], sector: 39, palette: BOX_PALETTE,
    paint(g) {
      g.box(0, 12, 1, 15, 'H').box(0, 18, 1, 19, 'H').box(30, 12, 31, 19, 'H');
      g.box(0, 11, 31, 11, 'D').box(0, 12, 31, 12, 'H').clear(2, 11, 4, 12); // the deck, the hold's roof, the hatch
      g.box(3, 10, 3, 17, 'L');
      g.box(6, 9, 9, 10, 'T').box(12, 7, 15, 10, 'N').box(18, 9, 21, 10, 'T'); // the stacks of containers
      g.box(30, 0, 31, 8, 'T').box(30, 4, 31, 5, 'N').box(30, 9, 31, 10, 'K'); // the bow's tall stack of containers to the top of the sky and the chain across the gangway under it: no way over it
      g.box(0, 18, 9, 18, 'G').box(10, 18, 27, 19, 'W').box(28, 18, 29, 18, 'G').box(0, 19, 9, 19, 'H').box(28, 19, 29, 19, 'H'); // the hold's floor and the bilge
      g.box(4, 15, 7, 15, 'G'); // the cargo shelf over the lane, off the ladder: a pocket
      g.box(12, 16, 14, 16, 'G').box(17, 16, 19, 16, 'G').box(22, 16, 24, 16, 'G').box(27, 16, 29, 16, 'G'); // the gantries
    },
    coins: [[7, 7], [13, 5], [19, 7], [27, 9], [13, 14], [23, 14], [28, 15]],
    item: { name: 'cutters', col: 5, row: 13, sprite: PAC_SPRITE.cutters },
    decor: [['pacCraneMast', 28, 3], ['pacCraneJib', 21, 7], ['pacPorthole', 11, 14], ['pacPorthole', 21, 14]],
    creatures: [
      { who: 'pacSwingCrate', col: 22, row: 9, way: 'right', speed: 1, range: 32 },
      { who: 'pacSharkFin', col: 11, row: 17, way: 'right', speed: 1, range: 120 },
    ],
  }),

  // C PIER PRESSURE: Honolulu harbour. In down the ship's ramp on the pier's stub (floor 11). Two ways on: down the pier's steps (floors 13, 15, 17) to the dock yard's street under the warehouses (floor 18, the customs guard
  // pacing it), or up a rope from the first step onto the roofs (floor 7: Aloha Tower, palms and the coconut). Out right, low or high.
  room({
    id: PAC.pier, cell: [2, 19], sector: 40, palette: PIER_PALETTE,
    paint(g) {
      g.box(0, 11, 3, 11, 'B').box(0, 12, 3, 19, 'H').box(0, 0, 1, 8, 'M').box(30, 0, 31, 4, 'M').box(30, 13, 31, 15, 'M'); // the gangway's planks lowered off the ship's bow (its hull under them, its tall stack of containers over them: as the bow of BOX CLEVER), the warehouses' walls at the edge (the ways on are the roofs and the street)
      g.box(4, 13, 5, 13, 'B').box(4, 14, 5, 19, 'S').box(6, 15, 7, 15, 'B').box(6, 16, 7, 19, 'S').box(8, 17, 9, 17, 'B').box(8, 18, 9, 19, 'S'); // the steps
      g.box(10, 18, 31, 19, 'P'); // the street
      g.box(12, 8, 13, 12, 'M').box(20, 8, 31, 12, 'M'); // the warehouses, an alley between them (cols 14-19) under the roofs' rotten planks
      g.box(6, 7, 31, 7, 'B'); // their roofs
      g.box(4, 6, 4, 12, 'R'); // the rope up
    },
    coins: [[2, 9], [14, 5], [24, 5], [18, 15], [25, 15]],
    decor: [['pacGangwayRail', 0, 10], ['pacAlohaTower', 9, 1], ['pacPalm', 18, 1], ['pacPalmSmall', 27, 3], ['pacPallet', 12, 16], ['pacPallet', 26, 16]],
    creatures: [
      { who: 'pacGuard', col: 11, row: 16, way: 'right', speed: 1, range: 90 },
      { who: 'pacCoconut', col: 12, row: 5, way: 'right', speed: 1, range: 90 },
    ],
  }),

  // D SURF AND TURF: Waikiki. Two lanes in at the left: the beach (floor 18) and the promenade (floor 7), joined by a rope (col 14) through a gap in the promenade; the snorkel shop's loft at the left (a rope, col 8, up from the beach) holds
  // the snorkel; a rope (col 28) up from the promenade through the top climbs the hillside to the luau's feast. Diamond Head stands behind whole, hotel towers at each end and over the beach, a sea wall closing the beach at the right.
  room({
    id: PAC.surf, cell: [2, 20], sector: 41, palette: SURF_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 4, 'H').box(0, 8, 1, 15, 'H').box(30, 0, 31, 13, 'H').box(30, 14, 31, 17, 'S'); // a hotel tower at each end running up off the screen, the beach open to the sky between; a sea wall at the beach's end
      g.box(0, 18, 31, 18, 'A').box(0, 19, 31, 19, 'F'); // the beach
      g.box(0, 7, 31, 7, 'B').clear(13, 7, 15, 7); // the promenade
      g.box(14, 6, 14, 17, 'R').box(28, 0, 28, 6, 'R'); // the ropes
      g.box(22, 8, 29, 15, 'H'); // the hotel on the promenade's far end, over the beach
      g.box(2, 13, 7, 13, 'T').box(8, 12, 8, 17, 'R'); // the shop's loft and its rope
    },
    coins: [[15, 5], [17, 5], [12, 15], [19, 15], [6, 11]],
    item: { name: 'snorkel', col: 4, row: 11, sprite: PAC_SPRITE.snorkel },
    decor: [['pacDiamondHeadBig', 8, 1], ['pacPalmSmall', 3, 3], ['pacSnorkelShop', 2, 14], ['pacSurfboards', 10, 16], ['pacUmbrella', 24, 16]],
    creatures: [
      { who: 'pacSurfer', col: 11, row: 16, way: 'right', speed: 1, range: 70 },
      { who: 'pacHula', col: 22, row: 5, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // E LEI OF THE LAND: the luau's show, the way on from the feast (a room above Clam Down). In from the feast's deck at the left (floor 12): up the crate step onto the stage (floor 8) over the lagoon, past the drummers, the hula
  // dancers and the fire-knife dancer's leaps (the timing), the lei the prize on its stand at the stage's middle; down the far step to the lawn whose last boards are deadly waves until the snorkel, then a dive into the reef (a rope back).
  room({
    id: PAC.lei, cell: [1, 21], sector: 42, palette: LEI_PALETTE,
    paint: paintShow,
    coins: SHOW_COINS,
    item: { name: 'lei', col: 17, row: 6, sprite: PAC_SPRITE.lei },
    decor: [
      // the sunset behind (back to front): the sky's bands, the sun on the sea's edge, the ocean
      ...showBackdrop(0, 1, 'pacSkyPurple'), ...showBackdrop(2, 4, 'pacSkyRed'), ...showBackdrop(5, 7, 'pacSkyOrange'), ...showBackdrop(8, 10, 'pacSkyGold'),
      ['pacSun', 16, 9], ...showBackdrop(11, 13, 'pacSeaWave'), ...showBackdrop(14, 15, 'pacLawn'),
      // the stage's fringe, its drums and drummers, the dancers, the palms, the torches and the lei's arch
      ...Array.from({ length: 12 }, (_, i) => ['pacStageBoard', 11 + i, 9] as const), ['pacDrums', 23, 14], ['pacDrummer', 4, 10], ['pacDrummer', 6, 10],
      ['pacHulaDancer', 12, 5], ['pacHulaDancer', 21, 5], ['pacPalm', 1, 6], ['pacPalm', 29, 6],
      ['pacArchTop', 16, 4], ['pacArchLeg', 16, 6], ['pacArchLeg', 19, 6],
    ],
    creatures: [{ who: 'pacFireKnife', col: 14, row: 6, way: 'up', speed: 1, range: 40 }],
  }),

  // THE FEAST: the luau before the show, a dead end no more: in by the rope up the cliff from Waikiki (through the lane's floor, col 28), along the lane under the long deck past three torches whose flames take turns (a three-cell gap
  // between them to wait in), to the ladder (col 5) up onto the deck, where the earth oven steams and the pig turns, the table of coconut shrimp is spread (a coin on it) and a hula dancer sways; east along the deck into the show. A rope
  // (col 14) goes up the hillside to Diamond Head's trail.
  room({
    id: PAC.feast, cell: [1, 20], sector: 78, palette: FEAST_PALETTE,
    paint: paintFeast,
    coins: FEAST_COINS,
    decor: [
      ...feastBackdrop(0, 1, 'pacSkyPurple'), ...feastBackdrop(2, 4, 'pacSkyRed'), ...feastBackdrop(5, 7, 'pacSkyOrange'), ...feastBackdrop(8, 10, 'pacSkyGold'), ...feastBackdrop(11, 11, 'pacSeaWave'),
      ['pacPalm', 26, 6],
      ['pacEarthOven', 8, 10], ['pacRoastPig', 12, 10], ['pacFeast', 17, 10], ['pacHulaDancer', 30, 9],
      ['pacTikiTorch', 21, 15], ['pacTikiTorch', 26, 15], ['pacTikiTorch', 16, 15], ['pacTikiTorch', 10, 15],
    ],
    creatures: [{ who: 'pacHula', col: 24, row: 10, way: 'left', speed: 1, range: 60 }],
  }),

  // DIAMOND HEAD: the crater trail, an optional climb up from the feast. In by the rope up the hillside (col 14, the floor's opening); the trail switches back up the crater wall: the first ledge (floor 18) east to a step up (cols 28-29), the second
  // (floor 14) west to a step (cols 2-3), the third (floor 10) east out of the room to the bunker. A tern dives along the second ledge.
  room({
    id: PAC.diamond, cell: [0, 20], sector: 79, palette: DIAMOND_PALETTE,
    paint: paintDiamond,
    coins: DIAMOND_COINS,
    decor: [
      ...diamondBackdrop(0, 1, 'pacSkyPurple'), ...diamondBackdrop(2, 3, 'pacSkyRed'), ...diamondBackdrop(4, 5, 'pacSkyOrange'), ...diamondBackdrop(6, 7, 'pacSkyGold'),
      ['pacLavaRocks', 18, 17], ['pacLavaRocks', 8, 13],
    ],
    creatures: [{ who: 'pacTern', col: 18, row: 7, way: 'down', speed: 1, range: 40 }],
  }),

  // THE LOOKOUT: the old bunker's tunnel and the stairs to the summit. In from the trail at the left (floor 10, the tunnel's mouth at col 13); the stairs climb to the summit lookout (floor 4) where a stash waits (a musubi and coins), seen from
  // the feast below as the glint on the crater's rim. Rocks tumble down the stairs from the summit and vanish at the tunnel's mouth: the tunnel is the place to wait.
  room({
    id: PAC.lookout, cell: [0, 21], sector: 80, palette: DIAMOND_PALETTE,
    paint: paintLookout,
    coins: LOOKOUT_COINS,
    item: { name: 'musubi4', col: 24, row: 2, sprite: PAC_SPRITE.musubi },
    decor: [
      ...lookoutBackdrop(0, 1, 'pacSkyPurple'), ...lookoutBackdrop(2, 3, 'pacSkyRed'), ...lookoutBackdrop(4, 5, 'pacSkyOrange'), ...lookoutBackdrop(6, 7, 'pacSkyGold'),
      ['pacLookout', 28, 1],
    ],
  }),

  room({
    id: PAC.clam, cell: [2, 21], sector: 43, palette: SEA_PALETTE,
    paint(g) {
      g.box(0, 3, 31, 18, 'S').box(2, 3, 26, 3, 'U').box(26, 0, 26, 2, 'K'); // the sea, its surface a wavy waterline (the show's dive through the gap at cols 27-29, a sea stack at its left, the cliff at its right) with the sky above it
      g.box(0, 0, 1, 13, 'K').box(30, 0, 31, 13, 'K'); // the reef's sea cliffs rising off the top
      g.box(0, 19, 31, 19, 'B');
      g.box(8, 14, 12, 18, 'R').box(9, 12, 11, 13, 'R').clear(9, 15, 10, 16); // a rock with an arch
      g.box(16, 16, 18, 18, 'C').box(22, 11, 26, 18, 'R').box(23, 9, 25, 10, 'R').box(13, 4, 16, 7, 'K'); // coral, a tall rock, a rock hanging from the surface
    },
    coins: [[10, 11], [20, 13], [14, 9], [24, 7], [5, 9]],
    decor: [['pacKelp', 14, 15], ['pacKelp', 20, 15], ['pacSeaFan', 27, 16], ['pacBubbles', 18, 5], ['pacSeaFan', 5, 16]],
    creatures: [
      { who: 'pacTurtle', col: 4, row: 5, way: 'right', speed: 1, range: 110 },
      { who: 'pacEel', col: 18, row: 11, way: 'left', speed: 1, range: 60 },
    ],
  }),

  // G MOLE-OKAI: Molokai, the quiet room. In from the reef onto a stone landing (floor 19); the old fishponds' walls curve out in arcs (tops 17, 15, 13, 15) with the ponds' water between them (deadly), the south shore's tall sea
  // cliffs standing behind. Out right onto the far shore. A crab on one wall: nothing else.
  room({
    id: PAC.mole, cell: [2, 22], sector: 44, palette: MOLE_PALETTE,
    paint(g) {
      g.box(0, 19, 4, 19, 'A').box(27, 19, 31, 19, 'A').box(5, 18, 26, 19, 'W');
      g.box(5, 17, 8, 19, 'S').box(10, 15, 15, 19, 'S').box(17, 13, 20, 19, 'S').box(22, 15, 25, 19, 'S');
      g.box(0, 2, 1, 13, 'G').box(30, 2, 31, 13, 'G');
    },
    coins: [[6, 15], [14, 13], [18, 11], [23, 13], [29, 17]],
    decor: [['pacSeaCliff', 2, 2], ['pacSeaCliffB', 7, 1], ['pacSeaCliff', 13, 2], ['pacSeaCliffB', 20, 1], ['pacSeaCliff', 25, 2]],
    creatures: [{ who: 'pacTern', col: 12, row: 5, way: 'down', speed: 1, range: 48 }],
  }),

  // H KELP WANTED: the second reef, between Molokai and Maui; its top is the sea's surface (open water to the very top, no ceiling). In from the landing at the left; out right into the sea cave, and up through the top (cols 14-16) to Lahaina's slipway.
  // A moray lives in a hole in the rock's far face: its eyes appear in the hole and blink, then it lunges out across the way to the cave (a pulse: a set-up trap he learns by watching). Molokai's sea cliffs behind it; a manta and a turtle.
  room({
    id: PAC.kelp, cell: [2, 23], sector: 45, palette: KELP_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 18, 'S'); // the sea to the very top
      g.box(0, 0, 1, 13, 'K').box(30, 0, 31, 13, 'K'); // the sea cliffs at each side, rising off the top
      g.box(0, 19, 31, 19, 'K');
      g.box(21, 11, 26, 18, 'K').box(22, 9, 25, 10, 'K').clear(22, 14, 24, 17).box(26, 16, 26, 16, 'H'); // a rock with a cave under it and the moray's hole in its far face
      g.box(10, 16, 12, 18, 'C').box(17, 14, 19, 18, 'C');
    },
    coins: [[11, 14], [23, 8], [4, 11], [28, 14], [15, 6]],
    decor: [['pacSeaCliff', 5, 5], ['pacSeaCliffB', 9, 5], ['pacSeaCliff', 17, 5], ['pacKelp', 8, 16], ['pacKelp', 14, 15], ['pacSeaFan', 28, 16], ['pacBubbles', 4, 12], ['pacBubbles', 29, 10]],
    creatures: [
      { who: 'pacManta', col: 8, row: 5, way: 'right', speed: 1, range: 100 },
      { who: 'pacTurtle', col: 12, row: 11, way: 'right', speed: 1, range: 60 },
    ],
  }),

  // I WHALE OF A TIME: Lahaina's whaling harbour. In by the mooring rope up through the slipway (cols 14-16). The old brig lies in the harbour water at the left: crates up to its deck, a mast's rope to the spar and the rigging (a dead end
  // with coins); the quay runs east past an outrigger canoe to the road. A whale's tail breaches behind.
  room({
    id: PAC.whale, cell: [1, 23], sector: 46, palette: WHALE_PALETTE,
    paint(g) {
      g.box(0, 18, 9, 19, 'W').box(3, 15, 9, 17, 'H').box(4, 14, 9, 14, 'D'); // the brig in the water, its deck
      g.box(10, 16, 11, 17, 'C').box(10, 18, 13, 19, 'Q').box(17, 18, 31, 19, 'Q'); // the crates, the landing and the quay
      g.box(5, 6, 5, 13, 'R').box(6, 7, 12, 7, 'D'); // the mast's rope and the spar
      g.box(15, 12, 15, 19, 'R'); // the mooring rope
      g.box(30, 2, 31, 15, 'Q');
    },
    coins: [[6, 12], [9, 5], [22, 15], [29, 15]],
    decor: [['pacWhaleTail', 0, 16], ['pacOutrigger', 19, 16], ['pacPalm', 24, 12]],
    creatures: [
      { who: 'pacTiki', col: 0, row: 9, way: 'down', speed: 1, range: 24 },
    ],
  }),

  // J THE ROAD TO HANA: the road winds up the cliff in three levels (floors 18, 13, 8) joined by bamboo at the bends (cols 28 and 3), over three one-lane bridges (a red car crosses each, the way Monty goes) with a yield sign at each end;
  // waterfalls down the cliff behind. In at the left on the lowest level, out at the right on the highest. A gap (cols 23-25) in the lowest level is a pool under a waterfall with a rope hanging in it: the way down into the sea cave, and back up.
  room({
    id: PAC.road, cell: [1, 24], sector: 47, palette: ROAD_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 15, 'S').box(0, 18, 1, 19, 'S').box(30, 0, 31, 5, 'S').box(30, 8, 31, 19, 'S'); // the cliff rising off the top at each end, the sky open over the road
      g.box(2, 18, 29, 19, 'R').clear(23, 18, 25, 19).box(8, 18, 19, 18, 'B').clear(8, 19, 19, 19).box(24, 16, 24, 19, 'V'); // the first level and its bridge, the pool (cols 23-25) with a rope hanging in it to the cave
      g.box(2, 13, 29, 14, 'R').clear(27, 13, 29, 14).box(12, 13, 23, 13, 'B').clear(12, 14, 23, 14); // the second level, its bridge, the bend's gap
      g.box(5, 8, 29, 9, 'R').box(11, 8, 22, 8, 'B').clear(11, 9, 22, 9); // the third level and its bridge
      g.box(28, 12, 28, 17, 'V').box(3, 7, 3, 12, 'V'); // the bends' bamboo
    },
    coins: [[14, 15], [27, 15], [18, 10], [6, 10], [16, 5], [27, 5]],
    decor: [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 25, 4], ['pacBambooClump', 7, 4],
      ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]],
    creatures: [{ who: 'pacCoconut', col: 23, row: 6, way: 'right', speed: 1, range: 16 }],
  }),

  // L THE SEA CAVE: under the road, a dead end of open water and the Pacific's big creature. In from the reef at the left (rows 14-18), and from above through the waterfall pool's gap (cols 23-25, a rope hanging in it from the road): the way up is at the top right.
  // A sea serpent winds round the cavern in one long loop (dragons.ts, as China's dragon does in its market): it kills where it touches, the seabed's lane under it is clear, and the coins are in the loop and beyond it; to leave by the top he must
  // cross the loop's right-hand side when its body has passed.
  room({
    id: PAC.cave, cell: [2, 24], sector: 48, palette: SEA_PALETTE,
    paint: paintCave,
    coins: [[12, 11], [20, 12], [28, 8], [4, 9]],
    decor: [['pacWaterfall', 24, 4], ['pacKelp', 12, 16], ['pacSeaFan', 27, 15], ['pacBubbles', 5, 11], ['pacBubbles', 29, 14]],
  }),

  // K HANA BANANA: Hana, the road's end. In at the left on the headland (floor 8), where the banana-bread stand stands by the road (a musubi on its table); the bamboo rope (col 14) down the cliff to Waianapanapa's black sand beach (floor 18), a nook
  // the surf's wave sweeping up the beach from the cove on a timing (a pulse: spray, then the wave across the beach, then it draws back), a crab on the sand, steps to a ledge over the cave. The way on is the sea: the cove's pool
  // (cols 20-22) is deadly surf until the snorkel, then open water you drop into, with a rope to climb back. The right edge is the cliff.
  room({
    id: PAC.hana, cell: [1, 25], sector: 49, palette: HANA_PALETTE,
    paint(g) {
      g.box(0, 8, 13, 19, 'B').box(0, 0, 1, 5, 'B').box(0, 8, 13, 8, 'T');
      g.box(14, 18, 19, 19, 'K').box(20, 18, 22, 19, 'W').box(23, 18, 29, 19, 'K').box(30, 0, 31, 17, 'B').box(30, 18, 31, 19, 'K'); // the beach and the pool, the cliff closing the right edge
      g.box(14, 7, 14, 17, 'R');
      g.box(24, 16, 25, 17, 'B').box(27, 14, 29, 15, 'B'); // the steps to the ledge over the cave
    },
    coins: [[12, 6], [17, 15], [24, 14], [28, 11]],
    item: { name: 'musubi2', col: 6, row: 6, sprite: PAC_SPRITE.musubi },
    decor: [['pacBreadStand', 2, 5], ['pacPalmSmall', 9, 4], ['pacLavaRocks', 17, 17], ['pacLavaRocks', 26, 17]],
    creatures: [{ who: 'pacCrab', col: 15, row: 16, way: 'right', speed: 1, range: 24 }],
  }),

  // M FISH OUT OF WATER: the third reef, between Maui and the Big Island. In through the ceiling from Hana's cove (cols 20-22, the rope hanging); out right to the coast. The deep channel: a wreck lies on the seabed at the left, its hull
  // a hold he swims into through the bow's doorway for the coin in it; a giant clam on the sand with a pearl (a coin) over it, a shark's patrol, reef and a sunken anchor; bubbles rise through the water.
  room({
    id: PAC.fish, cell: [2, 25], sector: 50, palette: FISH_PALETTE,
    paint(g) {
      g.box(0, 3, 31, 18, 'S').box(2, 3, 19, 3, 'U').box(23, 3, 29, 3, 'U'); // the sea, its surface a wavy waterline (the cove's rope through the gap) with the sky above it
      g.box(0, 0, 1, 18, 'K').box(30, 0, 31, 13, 'K').box(19, 0, 19, 2, 'K').box(23, 0, 23, 2, 'K'); // the sea cliffs rising off the top; a sea stack either side of the cove's rope
      g.box(0, 19, 31, 19, 'B');
      g.box(3, 14, 11, 18, 'H').clear(4, 15, 10, 17).clear(11, 15, 11, 17).box(7, 10, 7, 13, 'H'); // the wreck: its deck, hull and a mast, the bow's doorway at the right into the hold
      g.box(14, 16, 17, 18, 'C').box(22, 12, 26, 18, 'R').box(23, 10, 25, 11, 'R');
    },
    coins: [[7, 16], [19, 15], [24, 8], [12, 6]],
    decor: [['pacAnchor', 12, 17], ['pacClam', 18, 17], ['pacKelp', 21, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 14, 5], ['pacBubbles', 28, 9], ['pacBubbles', 16, 11], ['pacBubbles', 12, 8]],
    creatures: [{ who: 'pacSharkFin', col: 4, row: 8, way: 'right', speed: 1, range: 150 }],
  }),

  // N COFFEE BREAK: Kona. In from the reef at the left on the lava-rock shore (floor 19); the coast runs east under the farm's slope (a parrot over it), or a rope (col 3) up through the hill onto the coffee terraces (floors 11, 9, 7) and
  // the shed's ledge (a musubi); a magma blob from the volcano on the terraces. Out right, low or high.
  room({
    id: PAC.coffee, cell: [2, 26], sector: 51, palette: COFFEE_PALETTE,
    paint(g) {
      g.box(0, 19, 31, 19, 'B').box(0, 2, 1, 13, 'B').box(30, 2, 31, 4, 'B').box(30, 8, 31, 16, 'B');
      g.box(2, 11, 31, 14, 'S').clear(2, 11, 4, 14);
      g.box(5, 11, 12, 11, 'T').box(13, 9, 19, 10, 'S').box(13, 9, 19, 9, 'T').box(20, 7, 31, 10, 'S').box(20, 7, 31, 7, 'T');
      g.box(3, 7, 3, 18, 'R').box(4, 8, 8, 8, 'T');
    },
    coins: [[10, 16], [24, 16], [8, 9], [18, 7], [26, 5]],
    item: { name: 'musubi3', col: 5, row: 6, sprite: PAC_SPRITE.musubi },
    decor: [['pacCoffeeTree', 10, 8], ['pacCoffeeTree', 15, 6], ['pacCoffeeTree', 22, 4], ['pacSacks', 7, 6], ['pacSacks', 27, 5], ['pacLavaRocks', 10, 18], ['pacLavaRocks', 22, 18]],
    creatures: [
      { who: 'pacMagma', col: 14, row: 7, way: 'right', speed: 1, range: 32 },
      { who: 'pacParrot', col: 12, row: 15, way: 'right', speed: 1, range: 120 },
    ],
  }),

  // O MAUNA KEA-OS: the volcano's crater, the climb. In low at the left (floor 19) or high on the snow shelf (floor 7, a rope down to the second ledge); lava rises in the basin (cols 5-27) a row every 56 frames from row 19 to 11, and the
  // ledges climb ahead of it (floors 17, 15, 13, 11) to the rim at the right (floor 9). Snow on Mauna Kea behind; a magma blob on the snow shelf.
  room({
    id: PAC.mauna, cell: [2, 27], sector: 52, palette: MAUNA_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 4, 'S').box(0, 8, 1, 16, 'K').box(30, 0, 31, 6, 'S').box(30, 10, 31, 19, 'K'); // the snow slopes at each end, the sky open over the crater
      g.box(0, 19, 4, 19, 'B').box(5, 19, 29, 19, 'B'); // the floor under the lava
      g.box(4, 17, 7, 17, 'K').box(9, 15, 13, 15, 'K').box(16, 13, 19, 13, 'K').box(22, 11, 25, 11, 'K').box(28, 9, 31, 9, 'K'); // the ledges
      g.box(0, 7, 10, 7, 'S').box(11, 6, 11, 14, 'R'); // the snow shelf and the rope down
    },
    coins: [[6, 15], [11, 13], [17, 11], [23, 9], [4, 5]],
    decor: [['pacMaunaKea', 12, 2], ['pacLavaFountain', 27, 15], ['pacLavaRocks', 8, 18], ['pacLavaRocks', 20, 18]],
    creatures: [{ who: 'pacMagma', col: 2, row: 5, way: 'right', speed: 1, range: 56 }],
  }),

  // P HILO GOODBYE: Hilo airport, redesigned. In at the left on the terminal's roof (floor 9, the control tower on it); the roof's rope (col 7) down to the apron (floor 17). The departure gate is a gatehouse straddling the apron (cols 8-10, its wall
  // to the top of the room, a corridor 2 cells high through it): the lei guard patrols the corridor, so there is no way to the plane past him (nothing over the gatehouse, nothing under it) until he is in a lei (departing travellers wear one). Beyond it the
  // tarmac: the cargo plane drawn whole (nose, fuselage, wing, tail with its fin, wheels, the open cargo door at its tail) and, in front of it, the cargo loader's conveyor truck: its belt rises on the slope to the gantry over the plane's tail, and he
  // rides it (the foot at cols 14-15, the landing at col 17, floor 12), walks the gantry and into the plane (the right edge, rows 10-11).
  room({
    id: PAC.hilo, cell: [2, 28], sector: 53, palette: HILO_PALETTE,
    paint(g) {
      g.box(0, 9, 5, 19, 'W').box(0, 0, 1, 6, 'W').box(6, 17, 31, 19, 'P').box(6, 8, 6, 16, 'R'); // the terminal, its roof's rope, the apron
      g.box(8, 0, 10, 14, 'W'); // the gatehouse, its corridor (rows 15-16) at the apron's level
      g.box(17, 12, 31, 12, 'J'); // the gantry along the plane's back: the loader's landing at col 17, the way into the plane at the right edge (rows 10-11)
      g.box(31, 0, 31, 9, 'G').box(31, 13, 31, 16, 'G'); // the plane's nose walling the end of the apron, the way in open at rows 10-11
    },
    coins: [[4, 7], [7, 15], [21, 10], [27, 10]],
    decor: [['pacControlTower', 2, 3], ['pacCargoPlane', 16, 13], ['pacConveyor', 11, 13]],
    creatures: [{ who: 'pacGuard', col: 8, row: 15, way: 'right', speed: 1, range: 8 }],
  }),

  // Q HOLD YOUR HORSES: the cargo plane's hold, a fuselage drawn from inside. In from the catwalk onto the door's sill at the left (floor 7); a cargo net down to the roller floor (floor 16); crates swing from their tracks over the lane and the
  // pallets; the parachute lies on the high pallet at the right. The rear door in the right wall opens with it: the way on is the drop into the Andes.
  room({
    id: PAC.hold, cell: [2, 29], sector: 54, palette: HOLD_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'U').box(0, 2, 3, 3, 'U').box(28, 2, 31, 3, 'U').box(12, 2, 13, 3, 'I').box(20, 2, 21, 3, 'I');
      g.box(0, 2, 1, 9, 'U').box(0, 12, 1, 19, 'U').box(30, 2, 31, 13, 'U').box(30, 14, 31, 15, 'D').box(30, 16, 31, 19, 'U');
      g.box(2, 16, 29, 16, 'F').box(0, 17, 31, 19, 'U');
      g.box(0, 12, 6, 12, 'F').box(8, 11, 9, 15, 'N');
      g.box(17, 14, 22, 15, 'C').box(24, 12, 27, 15, 'C'); // (the first pallet's top is six cells for a two-cell crate to swing on)
    },
    coins: [[4, 10], [9, 12], [14, 14], [20, 12], [27, 10]],
    item: { name: 'parachute', col: 25, row: 10, sprite: PAC_SPRITE.parachute },
    decor: [['pacJumpLamp', 28, 12], ['pacPallet', 12, 14], ['pacPorthole', 4, 5]],
    creatures: [
      { who: 'pacSwingCrate', col: 11, row: 14, way: 'right', speed: 1, range: 40 },
      { who: 'pacSwingCrate', col: 19, row: 12, way: 'right', speed: 1, range: 16 },
    ],
  }),
];

/** The seventeen rooms of the first build in their tables' order (never changed), and the second pass's three, appended after Rio's (data.ts): the feast and Diamond Head's two. */
export const PACIFIC_ROOMS: readonly RoomSpec[] = ALL_ROOMS.filter((r) => r.id <= PAC.hold);
export const PACIFIC_EXTRA_ROOMS: readonly RoomSpec[] = ALL_ROOMS.filter((r) => r.id > PAC.hold);
