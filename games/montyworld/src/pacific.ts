import type { EscalatorSpec, LavaSpec, PulseSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { codeOf, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty (docs/dosvidaniya-pacific.md): seventeen rooms in a block thirteen wide and two high at columns 17-29 of the exit grid
 * (rows 1-2), entered from Japan's cargo ship (column 16) and left east out of the cargo plane's hold (the Andes, not yet built).
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
} as const;

/** The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($8F-$91, $93, $94; $8E is the first aid kit, $92 the smoke stack, $9B the treasure). */
export const PAC_SPRITE = { cutters: 0x8f, snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94 } as const;

/** The names (plain and evocative, a pun where it lands, no Z, no Bond), the sectors from 38 on. */
const NAMES = [
  'STERN WARNING', 'BOX CLEVER', 'PIER PRESSURE', 'SURF AND TURF', 'LEI OF THE LAND', 'CLAM DOWN', 'MOLE-OKAI', 'KELP WANTED', 'WHALE OF A TIME', 'THE ROAD TO HANA',
  'THE SEA CAVE', 'HANA BANANA', 'FISH OUT OF WATER', 'COFFEE BREAK', 'MAUNA KEA-OS', 'HILO GOODBYE', 'HOLD YOUR HORSES',
] as const;
export const PACIFIC_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the ship red, the harbour and beach yellows, the luau pink, the reefs blues, Molokai green, Maui light green, Hana grey, the farm brown, the volcano white, the airport grey). */
export const PACIFIC_COLOURS: readonly number[] = [2, 8, 14, 7, 10, 6, 5, 14, 3, 13, 6, 11, 6, 9, 1, 12, 15];

// ---- the palettes --------------------------------------------------------------------------------------
export const STERN_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 12], G: ['pacGrating', 11], C: ['pacCrate', 9], L: ['pacSteelLadder', 12], W: ['pacWaves', 6],
} as const satisfies Palette;

export const BOX_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 12], T: ['pacContainer', 8], N: ['pacContainer', 5], G: ['pacGrating', 11], L: ['pacSteelLadder', 12], K: ['pacChainGate', 15], W: ['pacWaves', 6],
} as const satisfies Palette;

export const PIER_PALETTE = {
  B: ['pacBoardwalk', 9], W: ['pacWaves', 6], S: ['pacWallStone', 12], M: ['pacContainer', 8], R: ['pacBamboo', 13], C: ['pacCrate', 9], P: ['pacRoad', 11],
} as const satisfies Palette;

export const SURF_PALETTE = {
  A: ['pacSand', 7], F: ['pacSandFill', 7], W: ['pacWaves', 6], S: ['pacSea', 6], B: ['pacBoardwalk', 9], M: ['pacWallStone', 12], R: ['pacBamboo', 13], T: ['pacThatch', 9],
} as const satisfies Palette;

/** The luau's eight: the sand, thatch, wall posts, crates, the rope, and the torches' small and tall flames. */
export const LEI_PALETTE = {
  A: ['pacSand', 7], F: ['pacSandFill', 7], W: ['pacWallStone', 12], T: ['pacThatch', 9], C: ['pacCrate', 9], R: ['pacBamboo', 13], Y: ['pacFlameWarn', 7], Z: ['pacFlame', 8],
} as const satisfies Palette;

/** A swim room's tiles: the sea, its surface, the seabed (the floor), the reef's rock and coral, the walls. */
export const SEA_PALETTE = {
  S: ['pacSea', 6], U: ['pacSeaSurface', 14], B: ['pacSand', 8], F: ['pacSandFill', 8], R: ['pacReefRock', 11], C: ['pacCoral', 10], W: ['pacWallStone', 12], K: ['pacReefRock', 12],
} as const satisfies Palette;

export const MOLE_PALETTE = {
  S: ['pacWallStone', 12], W: ['pacWaves', 6], A: ['pacSand', 7], F: ['pacSandFill', 7], G: ['pacTurf', 5],
} as const satisfies Palette;

export const WHALE_PALETTE = {
  Q: ['pacWallStone', 12], W: ['pacWaves', 6], H: ['pacHullPlate', 2], D: ['pacDeckPlate', 12], R: ['pacBamboo', 13], C: ['pacCrate', 9], F: ['pacSandFill', 12],
} as const satisfies Palette;

/** The road's eight: the road, the bridge's deck, the cliff, the turf verge, the bamboo to climb, and the red car's cabin and body. */
export const ROAD_PALETTE = {
  R: ['pacRoad', 11], B: ['pacBridgeDeck', 12], S: ['pacBasalt', 11], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

export const HANA_PALETTE = {
  B: ['pacBasalt', 11], K: ['pacBlackSand', 12], T: ['pacTurf', 5], R: ['pacBamboo', 13], W: ['pacWaves', 6], S: ['pacSoil', 2],
} as const satisfies Palette;

export const COFFEE_PALETTE = {
  B: ['pacBasalt', 11], T: ['pacTurf', 5], S: ['pacSoil', 2], R: ['pacBamboo', 13], A: ['pacSand', 7],
} as const satisfies Palette;

export const MAUNA_PALETTE = {
  S: ['pacSnow', 1], M: ['pacMagma', 8], C: ['pacMagmaCrest', 7], B: ['pacBasalt', 11], K: ['pacCrust', 12], R: ['pacBamboo', 13],
} as const satisfies Palette;

export const HILO_PALETTE = {
  W: ['pacWallStone', 12], P: ['pacRoad', 11], J: ['pacBridgeDeck', 12], R: ['pacBamboo', 13], G: ['pacFuselage', 15], C: ['pacCrate', 9],
} as const satisfies Palette;

export const HOLD_PALETTE = {
  U: ['pacFuselage', 15], F: ['pacHoldFloor', 15], N: ['pacNet', 13], C: ['pacCrate', 9], I: ['pacRib', 12], D: ['pacContainerDoor', 8],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * The luau's three torches (E; `pulses`): a flame two cells wide and two tall (rows 16-17: Monty's own) in the lane. It burns low (a small flame, safe to walk through) for 60 frames, flickers for 30 (the
 * warning: it grows and shrinks), is full height and deadly for 48 and settles for 12, a 150-frame period. The torches go off 40 frames after one another, left to right (the offsets run backwards in the period),
 * so a walker who goes as one dies down finds the next low as he comes; between two torches is a gap of three cells to wait in.
 */
export const TORCHES = { cols: [22, 17, 12] as const, row: 16, rows: 2, period: 150, idle: 60, warn: 30, live: 48, apart: 40 } as const;
export const TORCH_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k): PulseSpec => ({
  room: PAC.lei, col, row: TORCHES.row, cols: 2, rows: TORCHES.rows, period: TORCHES.period, start: TORCHES.idle, warn: TORCHES.warn, live: TORCHES.live, offset: (TORCHES.period - k * TORCHES.apart) % TORCHES.period,
  idle: codeOf(LEI_PALETTE, 'Y'), warnCode: codeOf(LEI_PALETTE, 'Z'), liveCode: codeOf(LEI_PALETTE, 'Z'), spent: codeOf(LEI_PALETTE, 'Y'),
}));

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

/** The cargo loader (O): its foot on the apron at columns 15-16 carries him up ten rows to the catwalk over the plane. */
export const LOADER: EscalatorSpec = { room: PAC.hilo, col: 15, row: 17, dx: 1, dy: -1, cols: 0, rows: 10, frames: 100 };

// ---- the key items' places -------------------------------------------------------------------------
/** The ramp's chain across BOX CLEVER's bow (cols 30-31, rows 9-10): the bolt cutters take it away. */
export const CHAIN_CELLS: readonly (readonly [row: number, col: number])[] = [[9, 30], [9, 31], [10, 30], [10, 31]];
/** Waikiki's pool (cols 22-31, row 18): the waves, which the snorkel turns to open water. */
export const POOL_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: 10 }, (_, i) => [18, 22 + i] as const);
export const POOL_SEA = codeOf(SURF_PALETTE, 'S');
/** Hana's cove pool (cols 20-22, rows 18-19): the waves the snorkel takes away, and the rope that hangs into it then. */
export const COVE_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [20, 21, 22].map((col) => [row, col] as const));
export const COVE_ROPE: readonly (readonly [row: number, col: number])[] = [[18, 21], [19, 21]];
export const COVE_ROPE_CODE = codeOf(HANA_PALETTE, 'R');
/** The plane's rear door (cols 30-31, rows 14-15): the parachute opens it. */
export const PLANE_DOOR_CELLS: readonly (readonly [row: number, col: number])[] = [14, 15].flatMap((row) => [30, 31].map((col) => [row, col] as const));

// ---- the rooms ----------------------------------------------------------------------------------------------

export const PACIFIC_ROOMS: readonly RoomSpec[] = [
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
    item: { name: 'cutters', col: 5, row: 14, sprite: PAC_SPRITE.cutters },
    decor: [['pacFunnel', 9, 7], ['pacBridge', 14, 8], ['pacAnchor', 5, 9], ['pacLifeRing', 25, 9], ['pacEngineBlock', 23, 15], ['pacGauge', 22, 14], ['pacPorthole', 2, 15]],
    creatures: [{ who: 'pacParrot', col: 6, row: 5, way: 'right', speed: 1, range: 130 }],
    crushers: [{ col: 11, row: 13, height: 5, chr: 0x22 }, { col: 19, row: 13, height: 5, chr: 0x22 }],
  }),

  // B BOX CLEVER: the bow in section. Two lanes in at the left (the deck, floor 11; the hold, floor 18). The deck is a canyon of containers (floors 9, 7, 9), the crane's crate sweeping the deck past them to the bow, where the ramp is chained
  // until the cutters. The hold's gantries cross the flooded bilge (a shark in it) and a cargo stack at the left holds a musubi; a ladder (col 3) joins the two lanes.
  room({
    id: PAC.box, cell: [2, 18], sector: 39, palette: BOX_PALETTE,
    paint(g) {
      g.box(0, 12, 1, 15, 'H').box(0, 18, 1, 19, 'H').box(30, 12, 31, 19, 'H');
      g.box(0, 11, 31, 11, 'D').box(0, 12, 31, 12, 'H').clear(2, 11, 4, 12); // the deck, the hold's roof, the hatch
      g.box(3, 10, 3, 17, 'L');
      g.box(6, 9, 9, 10, 'T').box(12, 7, 15, 10, 'N').box(18, 9, 21, 10, 'T'); // the stacks of containers
      g.box(30, 9, 31, 10, 'K'); // the chain on the ramp
      g.box(0, 18, 9, 18, 'G').box(10, 18, 27, 19, 'W').box(28, 18, 29, 18, 'G').box(0, 19, 9, 19, 'H').box(28, 19, 29, 19, 'H'); // the hold's floor and the bilge
      g.box(4, 15, 6, 17, 'T').box(7, 17, 8, 17, 'T'); // the cargo stack and its step
      g.box(12, 16, 14, 16, 'G').box(17, 16, 19, 16, 'G').box(22, 16, 24, 16, 'G').box(27, 16, 29, 16, 'G'); // the gantries
    },
    coins: [[7, 7], [13, 5], [19, 7], [27, 9], [13, 14], [23, 14], [28, 15]],
    item: { name: 'musubi1', col: 5, row: 13, sprite: PAC_SPRITE.musubi },
    decor: [['pacCrane', 24, 3], ['pacLifeRing', 28, 6], ['pacPorthole', 11, 14], ['pacPorthole', 21, 14]],
    creatures: [
      { who: 'pacSwingCrate', col: 23, row: 9, way: 'right', speed: 1, range: 40 },
      { who: 'pacSharkFin', col: 11, row: 17, way: 'right', speed: 1, range: 120 },
    ],
  }),

  // C PIER PRESSURE: Honolulu harbour. In down the ship's ramp on the pier's stub (floor 11). Two ways on: down the pier's steps (floors 13, 15, 17) to the dock yard's street under the warehouses (floor 18, the customs guard
  // pacing it), or up a rope from the first step onto the roofs (floor 7: Aloha Tower, palms and the coconut). Out right, low or high.
  room({
    id: PAC.pier, cell: [2, 19], sector: 40, palette: PIER_PALETTE,
    paint(g) {
      g.box(0, 11, 3, 11, 'B').box(0, 12, 3, 19, 'S'); // the pier's stub
      g.box(4, 13, 5, 13, 'B').box(4, 14, 5, 19, 'S').box(6, 15, 7, 15, 'B').box(6, 16, 7, 19, 'S').box(8, 17, 9, 17, 'B').box(8, 18, 9, 19, 'S'); // the steps
      g.box(10, 18, 31, 19, 'P'); // the street
      g.box(12, 8, 31, 14, 'M'); // the warehouses
      g.box(6, 7, 31, 7, 'B'); // their roofs
      g.box(4, 6, 4, 12, 'R'); // the rope up
      g.box(15, 17, 16, 17, 'C').box(21, 17, 22, 17, 'C');
    },
    coins: [[2, 9], [14, 5], [24, 5], [18, 15], [25, 15]],
    decor: [['pacAlohaTower', 9, 1], ['pacPalm', 18, 1], ['pacPalmSmall', 27, 3], ['pacPallet', 12, 16], ['pacPallet', 26, 16]],
    creatures: [
      { who: 'pacGuard', col: 11, row: 16, way: 'right', speed: 1, range: 90 },
      { who: 'pacCoconut', col: 12, row: 5, way: 'right', speed: 1, range: 90 },
    ],
  }),

  // D SURF AND TURF: Waikiki. Two lanes in at the left: the beach (floor 18) and the promenade (floor 7), joined by a rope (col 14) through a gap in the promenade; the snorkel shop's loft at the left (a rope, col 8, up from the beach)
  // holds the snorkel; a rope (col 20) up through the ceiling from the promenade to the luau. At the right the beach ends in deadly surf (cols 22-31) until the snorkel opens it: the way on, wading along the sea floor into the reef.
  room({
    id: PAC.surf, cell: [2, 20], sector: 41, palette: SURF_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'M').clear(19, 0, 21, 1);
      g.box(0, 2, 1, 4, 'M').box(0, 8, 1, 15, 'M').box(30, 2, 31, 16, 'M');
      g.box(0, 18, 21, 18, 'A').box(0, 19, 31, 19, 'F').box(22, 18, 31, 18, 'W'); // the beach and the pool
      g.box(2, 7, 31, 7, 'B').clear(13, 7, 15, 7); // the promenade
      g.box(14, 6, 14, 17, 'R').box(20, 0, 20, 6, 'R'); // the ropes
      g.box(22, 8, 29, 15, 'M'); // the hotel
      g.box(2, 13, 7, 13, 'T').box(8, 12, 8, 17, 'R'); // the shop's loft and its rope
    },
    coins: [[10, 5], [17, 5], [12, 16], [19, 16], [6, 11]],
    item: { name: 'snorkel', col: 4, row: 11, sprite: PAC_SPRITE.snorkel },
    decor: [['pacDiamondHead', 8, 4], ['pacHotel', 24, 1], ['pacPalm', 3, 1], ['pacSnorkelShop', 2, 14], ['pacSurfboards', 10, 16], ['pacUmbrella', 16, 16]],
    creatures: [
      { who: 'pacSurfer', col: 11, row: 16, way: 'right', speed: 1, range: 70 },
      { who: 'pacHula', col: 20, row: 5, way: 'left', speed: 1, range: 40 },
    ],
  }),

  // E LEI OF THE LAND: the luau, a dead end above Waikiki. In by the rope up through the floor at the right (col 28); along the long house's stage past three torches whose flames take turns (a three-cell gap between them to wait in), the
  // roast pig at the entrance, to the steps up at the left (crates, floors 16, 14, 12) and the lei on the high shelf. Hula dancers sway on the stage over the lane.
  room({
    id: PAC.lei, cell: [1, 20], sector: 42, palette: LEI_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'T');
      g.box(0, 2, 1, 19, 'W').box(30, 2, 31, 19, 'W');
      g.box(2, 18, 26, 18, 'A').box(0, 19, 31, 19, 'F').box(27, 18, 29, 19, '.'); // the floor and the gap the rope comes up through
      g.box(28, 16, 28, 19, 'R');
      g.box(8, 16, 9, 17, 'C').box(6, 14, 7, 17, 'C').box(2, 12, 5, 17, 'C'); // the steps to the shelf
    },
    coins: [[25, 16], [20, 16], [15, 16], [9, 14]],
    item: { name: 'lei', col: 3, row: 10, sprite: PAC_SPRITE.lei },
    decor: [['pacRoastPig', 24, 16], ['pacTotem', 20, 15], ['pacTotem', 15, 15], ['pacHibiscus', 11, 16], ['pacPalmSmall', 22, 2]],
    creatures: [
      { who: 'pacHula', col: 14, row: 11, way: 'right', speed: 1, range: 60 },
      { who: 'pacTiki', col: 22, row: 6, way: 'left', speed: 1, range: 60 },
    ],
  }),

  // F CLAM DOWN: the first reef, a swim room. In from Waikiki's sea floor at the left (rows 17-18), out to Molokai's landing at the right. Coral heads and a rock arch to weave among; a turtle and an eel.
  room({
    id: PAC.clam, cell: [2, 21], sector: 43, palette: SEA_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').box(0, 2, 1, 16, 'W').box(30, 2, 31, 16, 'W').box(0, 2, 31, 2, 'W');
      g.box(2, 3, 29, 18, 'S').box(0, 17, 1, 18, 'S').box(30, 17, 31, 18, 'S').box(2, 3, 29, 3, 'U');
      g.box(0, 19, 31, 19, 'B');
      g.box(8, 14, 12, 18, 'R').box(9, 12, 11, 13, 'R').clear(9, 15, 10, 16); // a rock with an arch
      g.box(16, 16, 18, 18, 'C').box(22, 11, 26, 18, 'R').box(23, 9, 25, 10, 'R').box(13, 3, 16, 7, 'K'); // coral, a tall rock, a rock hanging from the ceiling
    },
    coins: [[10, 12], [20, 13], [14, 9], [24, 7], [5, 9]],
    decor: [['pacKelp', 14, 15], ['pacKelp', 20, 15], ['pacSeaFan', 27, 16], ['pacBubbles', 18, 5], ['pacSeaFan', 5, 16]],
    creatures: [
      { who: 'pacTurtle', col: 4, row: 5, way: 'right', speed: 1, range: 110 },
      { who: 'pacEel', col: 18, row: 11, way: 'left', speed: 1, range: 60 },
    ],
  }),

  // G MOLE-OKAI: Molokai, the quiet room. In from the reef onto a stone landing (floor 19); the old fishponds' walls curve out in arcs (tops 17, 15, 13, 15, 17) with the ponds' water between them (deadly), the south shore's tall sea
  // cliffs standing behind. Out right onto the far shore. A crab on one wall: nothing else.
  room({
    id: PAC.mole, cell: [2, 22], sector: 44, palette: MOLE_PALETTE,
    paint(g) {
      g.box(0, 19, 4, 19, 'A').box(28, 19, 31, 19, 'A').box(5, 18, 27, 19, 'W');
      g.box(5, 17, 8, 19, 'S').box(10, 15, 13, 19, 'S').box(15, 13, 18, 19, 'S').box(20, 15, 23, 19, 'S').box(25, 17, 27, 19, 'S');
      g.box(0, 2, 1, 16, 'G').box(30, 2, 31, 16, 'G');
    },
    coins: [[6, 15], [11, 13], [16, 11], [21, 13], [26, 15]],
    decor: [['pacSeaCliff', 2, 2], ['pacSeaCliffB', 7, 1], ['pacSeaCliff', 13, 2], ['pacSeaCliffB', 20, 1], ['pacSeaCliff', 25, 2]],
    creatures: [{ who: 'pacCrab', col: 10, row: 13, way: 'right', speed: 1, range: 16 }],
  }),

  // H KELP WANTED: the second reef, between Molokai and Maui. In from the landing at the left; out right into the sea cave, and up through the ceiling (cols 14-16) to Lahaina's slipway. Molokai's sea cliffs behind it over the water; a manta and a turtle.
  room({
    id: PAC.kelp, cell: [2, 23], sector: 45, palette: SEA_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').clear(14, 0, 16, 1).box(0, 2, 1, 16, 'W').box(30, 2, 31, 16, 'W');
      g.box(2, 2, 29, 18, 'S').box(0, 17, 1, 18, 'S').box(30, 17, 31, 18, 'S').box(2, 2, 29, 2, 'U');
      g.box(0, 19, 31, 19, 'B');
      g.box(21, 11, 26, 18, 'R').box(22, 9, 25, 10, 'R').clear(22, 14, 24, 17); // a rock with a cave under it
      g.box(10, 16, 12, 18, 'C').box(17, 14, 19, 18, 'C');
    },
    coins: [[11, 14], [23, 8], [4, 11], [28, 14], [15, 6]],
    decor: [['pacSeaCliff', 2, 3], ['pacSeaCliffB', 6, 3], ['pacKelp', 8, 16], ['pacKelp', 14, 15], ['pacSeaFan', 28, 16], ['pacBubbles', 23, 5], ['pacBubbles', 4, 12]],
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
      g.box(0, 18, 9, 19, 'W').box(2, 15, 9, 17, 'H').box(3, 14, 9, 14, 'D'); // the brig in the water, its deck
      g.box(10, 16, 11, 17, 'C').box(10, 18, 13, 19, 'Q').box(17, 18, 31, 19, 'Q'); // the crates, the landing and the quay
      g.box(5, 6, 5, 13, 'R').box(6, 7, 12, 7, 'D'); // the mast's rope and the spar
      g.box(15, 12, 15, 19, 'R'); // the mooring rope
      g.box(30, 2, 31, 15, 'Q');
    },
    coins: [[6, 12], [9, 5], [22, 15], [27, 15]],
    decor: [['pacWhaleTail', 24, 11], ['pacOutrigger', 19, 16], ['pacPalm', 26, 10]],
    creatures: [
      { who: 'pacTiki', col: 4, row: 12, way: 'right', speed: 1, range: 40 },
      { who: 'pacSurfer', col: 22, row: 16, way: 'right', speed: 1, range: 50 },
    ],
  }),

  // J THE ROAD TO HANA: the road winds up the cliff in three levels (floors 18, 13, 8) joined by bamboo at the bends (cols 28 and 3), over three one-lane bridges (a red car crosses each, the way Monty goes) with a yield sign at each end;
  // waterfalls down the cliff behind. In at the left on the lowest level, out at the right on the highest. A gap (cols 24-25) in the lowest level is a pool under a waterfall: a drop into the sea cave.
  room({
    id: PAC.road, cell: [1, 24], sector: 47, palette: ROAD_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'S').box(0, 2, 1, 15, 'S').box(0, 18, 1, 19, 'S').box(30, 2, 31, 5, 'S').box(30, 8, 31, 19, 'S');
      g.box(2, 18, 29, 19, 'R').clear(24, 18, 25, 19).box(8, 18, 19, 18, 'B').clear(8, 19, 19, 19); // the first level and its bridge, the pool
      g.box(2, 13, 29, 14, 'R').clear(27, 13, 29, 14).box(12, 13, 23, 13, 'B').clear(12, 14, 23, 14); // the second level, its bridge, the bend's gap
      g.box(5, 8, 29, 9, 'R').box(11, 8, 22, 8, 'B').clear(11, 9, 22, 9); // the third level and its bridge
      g.box(28, 12, 28, 17, 'V').box(3, 7, 3, 12, 'V'); // the bends' bamboo
    },
    coins: [[14, 15], [27, 15], [18, 10], [6, 10], [16, 5], [27, 5]],
    decor: [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 24, 15], ['pacBambooClump', 4, 15], ['pacBambooClump', 26, 10], ['pacBambooClump', 8, 10],
      ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]],
    creatures: [{ who: 'pacCoconut', col: 25, row: 6, way: 'right', speed: 1, range: 40 }],
  }),

  // L THE SEA CAVE: under the road, a dead end of open water. In from the reef at the left, and from above where the waterfall's pool drops into it (the ceiling gap, cols 22-27). Rock ceiling and walls, a floor of rubble; an eel and a manta.
  room({
    id: PAC.cave, cell: [2, 24], sector: 48, palette: SEA_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 3, 'K').clear(22, 0, 27, 3).box(0, 4, 1, 16, 'K').box(30, 4, 31, 19, 'K');
      g.box(2, 4, 29, 18, 'S').box(0, 17, 1, 18, 'S').box(2, 4, 29, 4, 'U');
      g.box(0, 19, 31, 19, 'B');
      g.box(4, 0, 6, 6, 'K').box(10, 0, 12, 8, 'K').box(16, 0, 18, 5, 'K'); // stalactites
      g.box(7, 15, 10, 18, 'R').box(14, 13, 17, 18, 'R').box(20, 16, 24, 18, 'C');
    },
    coins: [[8, 13], [15, 11], [22, 14], [28, 16]],
    decor: [['pacWaterfall', 24, 4], ['pacKelp', 12, 15], ['pacSeaFan', 27, 16], ['pacBubbles', 19, 8]],
    creatures: [
      { who: 'pacEel', col: 6, row: 11, way: 'right', speed: 1, range: 80 },
      { who: 'pacManta', col: 20, row: 6, way: 'left', speed: 1, range: 70 },
    ],
  }),

  // K HANA BANANA: Hana, the road's end. In at the left on the headland (floor 8); the bamboo rope (col 14) down the cliff to Waianapanapa's black sand beach (floor 18), a crab on it, a ledge in the sea cave at the right with a musubi. The way on is the
  // sea: the cove's pool (cols 20-22) is deadly surf until the snorkel, then open water you drop into, with a rope to climb back.
  room({
    id: PAC.hana, cell: [1, 25], sector: 49, palette: HANA_PALETTE,
    paint(g) {
      g.box(0, 8, 13, 19, 'B').box(0, 8, 13, 8, 'T').box(30, 0, 31, 19, 'B');
      g.box(14, 18, 19, 19, 'K').box(20, 18, 22, 19, 'W').box(23, 18, 29, 19, 'K'); // the beach and the pool
      g.box(14, 7, 14, 17, 'R'); g.box(21, 15, 21, 17, 'R');
      g.box(24, 16, 25, 17, 'B').box(27, 14, 29, 15, 'B'); // the steps to the cave's ledge
    },
    coins: [[8, 6], [16, 16], [24, 14], [28, 11]],
    item: { name: 'musubi2', col: 28, row: 12, sprite: PAC_SPRITE.musubi },
    decor: [['pacPalm', 4, 2], ['pacPalmSmall', 9, 4], ['pacLavaRocks', 17, 17], ['pacLavaRocks', 26, 17]],
    creatures: [{ who: 'pacCrab', col: 15, row: 16, way: 'right', speed: 1, range: 24 }],
  }),

  // M FISH OUT OF WATER: the third reef, between Maui and the Big Island. In through the ceiling from Hana's cove (cols 20-22, the rope hanging); out right to the coast. The deep channel: reef on the floor, a shark's patrol, a sunken anchor.
  room({
    id: PAC.fish, cell: [2, 25], sector: 50, palette: SEA_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').clear(20, 0, 22, 1).box(0, 2, 1, 16, 'W').box(30, 2, 31, 16, 'W');
      g.box(2, 2, 29, 18, 'S').box(0, 17, 1, 18, 'S').box(30, 17, 31, 18, 'S');
      g.box(0, 19, 31, 19, 'B');
      g.box(5, 15, 9, 18, 'R').box(6, 13, 8, 14, 'R').box(14, 16, 17, 18, 'C').box(24, 12, 28, 18, 'R').box(25, 10, 27, 11, 'R');
    },
    coins: [[7, 11], [16, 13], [26, 8], [12, 6]],
    decor: [['pacAnchor', 11, 17], ['pacKelp', 20, 16], ['pacSeaFan', 30, 15], ['pacBubbles', 14, 5]],
    creatures: [{ who: 'pacSharkFin', col: 4, row: 8, way: 'right', speed: 1, range: 150 }],
  }),

  // N COFFEE BREAK: Kona. In from the reef at the left on the lava-rock shore (floor 19); the coast runs east under the farm's slope (a parrot over it), or a rope (col 3) up through the hill onto the coffee terraces (floors 11, 9, 7) and
  // the shed's ledge (a musubi); a magma blob from the volcano on the terraces. Out right, low or high.
  room({
    id: PAC.coffee, cell: [2, 26], sector: 51, palette: COFFEE_PALETTE,
    paint(g) {
      g.box(0, 19, 31, 19, 'B').box(0, 2, 1, 16, 'B').box(30, 2, 31, 4, 'B').box(30, 8, 31, 16, 'B');
      g.box(2, 11, 31, 14, 'S').clear(2, 11, 4, 14);
      g.box(5, 11, 12, 11, 'T').box(13, 9, 19, 10, 'S').box(13, 9, 19, 9, 'T').box(20, 7, 31, 10, 'S').box(20, 7, 31, 7, 'T');
      g.box(3, 7, 3, 18, 'R').box(4, 8, 8, 8, 'T');
    },
    coins: [[10, 16], [24, 16], [8, 9], [16, 7], [26, 5]],
    item: { name: 'musubi3', col: 6, row: 6, sprite: PAC_SPRITE.musubi },
    decor: [['pacCoffeeTree', 10, 8], ['pacCoffeeTree', 15, 6], ['pacCoffeeTree', 22, 4], ['pacSacks', 5, 6], ['pacSacks', 27, 5], ['pacLavaRocks', 10, 18], ['pacLavaRocks', 22, 18]],
    creatures: [
      { who: 'pacMagma', col: 14, row: 7, way: 'right', speed: 1, range: 32 },
      { who: 'pacParrot', col: 12, row: 15, way: 'right', speed: 1, range: 120 },
    ],
  }),

  // O MAUNA KEA-OS: the volcano's crater, the climb. In low at the left (floor 19) or high on the snow shelf (floor 7, a rope down to the second ledge); lava rises in the basin (cols 5-27) a row every 56 frames from row 19 to 11, and the
  // ledges climb ahead of it (floors 17, 15, 13, 11) to the rim at the right (floor 9). Snow on Mauna Kea behind; a magma blob on a ledge.
  room({
    id: PAC.mauna, cell: [2, 27], sector: 52, palette: MAUNA_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'S').box(0, 2, 1, 4, 'S').box(0, 8, 1, 16, 'K').box(30, 2, 31, 6, 'S').box(30, 10, 31, 19, 'K');
      g.box(0, 19, 4, 19, 'B').box(5, 19, 29, 19, 'B'); // the floor under the lava
      g.box(4, 17, 7, 17, 'K').box(9, 15, 13, 15, 'K').box(16, 13, 19, 13, 'K').box(22, 11, 25, 11, 'K').box(28, 9, 31, 9, 'K'); // the ledges
      g.box(0, 7, 10, 7, 'S').box(11, 6, 11, 14, 'R'); // the snow shelf and the rope down
    },
    coins: [[6, 15], [11, 13], [17, 11], [23, 9], [4, 5]],
    decor: [['pacMaunaKea', 12, 2], ['pacLavaFountain', 27, 15], ['pacLavaRocks', 8, 18], ['pacLavaRocks', 20, 18]],
    creatures: [{ who: 'pacMagma', col: 16, row: 11, way: 'right', speed: 1, range: 16 }],
  }),

  // P HILO GOODBYE: Hilo airport. In at the left on the terminal's roof (floor 9, the control tower on it); the roof's rope (col 7) down to the apron (floor 17), a customs shed over the way (cols 8-13) with the guard pacing it, who lets him by
  // in the lei; then the cargo loader (cols 15-16) carries him up to the catwalk over the cargo plane, which stands on the apron behind. Out along the catwalk, high, into the plane.
  room({
    id: PAC.hilo, cell: [2, 28], sector: 53, palette: HILO_PALETTE,
    paint(g) {
      g.box(0, 9, 6, 19, 'W').box(7, 17, 31, 19, 'P').box(8, 14, 13, 14, 'G').box(7, 8, 7, 16, 'R');
      g.box(15, 7, 31, 7, 'J').box(30, 8, 31, 16, 'W');
    },
    coins: [[4, 7], [10, 15], [20, 5], [26, 5]],
    decor: [['pacControlTower', 2, 3], ['pacCargoPlane', 17, 12], ['pacLoader', 13, 14]],
    creatures: [{ who: 'pacGuard', col: 9, row: 15, way: 'right', speed: 1, range: 36 }],
  }),

  // Q HOLD YOUR HORSES: the cargo plane's hold, a fuselage drawn from inside. In from the catwalk onto the door's sill at the left (floor 7); a cargo net down to the roller floor (floor 16); crates swing from their tracks over the lane and the
  // pallets; the parachute lies on the high pallet at the right. The rear door in the right wall opens with it: the way on, the drop into the Andes, is shut with a sign until they are built.
  room({
    id: PAC.hold, cell: [2, 29], sector: 54, palette: HOLD_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'U').box(0, 2, 3, 3, 'U').box(28, 2, 31, 3, 'U').box(12, 2, 13, 3, 'I').box(20, 2, 21, 3, 'I');
      g.box(0, 2, 1, 4, 'U').box(0, 8, 1, 19, 'U').box(30, 2, 31, 13, 'U').box(30, 14, 31, 15, 'D').box(30, 16, 31, 19, 'U');
      g.box(2, 16, 29, 16, 'F').box(0, 17, 31, 19, 'U');
      g.box(0, 7, 6, 7, 'F').box(8, 6, 9, 15, 'N');
      g.box(19, 14, 22, 15, 'C').box(24, 12, 27, 15, 'C');
    },
    coins: [[4, 5], [9, 11], [14, 14], [20, 12], [26, 10]],
    item: { name: 'parachute', col: 25, row: 10, sprite: PAC_SPRITE.parachute },
    decor: [[{ text: 'THE ANDES COMING SOON', colour: 7 }, 8, 3], ['pacJumpLamp', 28, 12], ['pacPallet', 12, 14], ['pacStrap', 16, 2], ['pacStrap', 24, 2], ['pacPorthole', 4, 10]],
    creatures: [
      { who: 'pacSwingCrate', col: 11, row: 14, way: 'right', speed: 1, range: 40 },
      { who: 'pacSwingCrate', col: 19, row: 12, way: 'right', speed: 1, range: 16 },
    ],
  }),
];
