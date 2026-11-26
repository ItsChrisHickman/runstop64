import type { CrackSpec, DragonSpec, FloatSpec, PulseSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { CHINA_SPRITE, DRAGON_POINTERS } from './china-pointers';
import { codeOf, decorIndex, fillCells, Grid, room, type Palette } from './layout';
import type { Placed } from './train';

/**
 * China, the third region of Do Svidaniya Monty (docs/dosvidaniya-china.md): ten rooms in a block four wide and three high at columns 8-11 of
 * the exit grid, entered from Siberia's border village (room G, column 7) and left east, low, from the junk's deck into Japan (japan.ts).
 *
 *            col 8                col 9               col 10                col 11
 *   row 0   C  MIND THE BATTLEMENTS     K  HEAVEN CAN WAIT     G  THE EMPEROR(S ROOFTOPS     H  WILLOW PATTERN
 *   row 1   T  THE WATCHTOWER    E  NOODLE MARKET    F  THE FORBIDDEN CITY  J  DOWN THE RIVER
 *   row 2   A  ALL WALL AND NO PLAY  D  BACK ALLEY BEIJING   L  DON(T ROCK THE BOAT   .        (L: a bonus room, added 2026-11-25)
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
export const CHI = { wall: 18, alley: 19, tower: 20, top: 21, market: 22, gate: 23, roofs: 24, willow: 25, junk: 26, heaven: 82, houhai: 96 } as const;

/** The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 18 on. */
const NAMES = [
  'ALL WALL AND NO PLAY', 'BACK ALLEY BEIJING', 'THE WATCHTOWER', 'MIND THE BATTLEMENTS', 'NOODLE MARKET', 'THE FORBIDDEN CITY', "THE EMPEROR'S ROOFTOPS", 'WILLOW PATTERN', 'DOWN THE RIVER',
] as const;
const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
export const CHINA_SECTORS: readonly Sector[] = NAMES.map(centred);
/**
 * Rooms added to China after it shipped: HEAVEN CAN WAIT (2026-11-24) and DON'T ROCK THE BOAT (2026-11-25), the bonus room east of the hutong. Their ids, sectors and table places come after every
 * region's (data.ts puts them last), so no room's coin or find moves; a later room's sector is its id (later-sectors.ts lays them out); the map's colour of each.
 */
export const CHINA_LATER_NAMES: Readonly<Record<number, string>> = { [CHI.heaven]: 'HEAVEN CAN WAIT', [CHI.houhai]: "DON'T ROCK THE BOAT" };
export const CHINA_LATER_COLOURS: Readonly<Record<number, number>> = { [CHI.heaven]: 7, [CHI.houhai]: 6 };
/** The map's colour of each (the wall grey, the hutong dark grey, the tower grey, the top light grey, the market red, the gate red, the roofs yellow, the garden light blue, the quay brown). */
export const CHINA_COLOURS: readonly number[] = [12, 11, 12, 15, 2, 2, 7, 14, 9];

// ---- the palettes --------------------------------------------------------------------------------------
const WALL_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 1], T: ['hillTurf', 5], E: ['hillEarth', 9], S: ['stoneStep', 3], R: ['rope', 13], L: ['brickSlit', 12],
} as const satisfies Palette;

const ALLEY_PALETTE = {
  B: ['hutongBrick', 10], P: ['wallPave', 8], S: ['shelf', 9], R: ['rope', 13], K: ['cracker', 2], X: ['crackerBang', 7], Y: ['crackerSpark', 1], E: ['redBeam', 2],
} as const satisfies Palette;

const TOWER_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 8], S: ['stoneStep', 3], T: ['trapdoor', 9], R: ['rope', 13], N: ['backBrick', 6], L: ['brickSlit', 12],
} as const satisfies Palette;

const TOP_PALETTE = {
  G: ['greatBrick', 12], P: ['wallPave', 1], L: ['stoneStep', 3], R: ['rope', 13], S: ['brickSlit', 12],
} as const satisfies Palette;

const MARKET_PALETTE = {
  B: ['hutongBrick', 10], P: ['wallPave', 8], A: ['awning', 2], Y: ['awning', 7], R: ['rope', 13], T: ['awningFrayed', 7], U: ['awningTorn', 7],
} as const satisfies Palette;

const GATE_PALETTE = {
  P: ['wallPave', 1], W: ['redWall', 2], D: ['gateDoor', 2], R: ['rope', 13], Y: ['roofTile', 7], E: ['redEave', 2],
} as const satisfies Palette;

const ROOFS_PALETTE = {
  Y: ['roofRidge', 7], B: ['roofBody', 8], E: ['roofTile', 7], R: ['rope', 13],
} as const satisfies Palette;

const HEAVEN_PALETTE = {
  Y: ['roofRidge', 7], B: ['roofBody', 8], E: ['roofTile', 7],
} as const satisfies Palette;

/** The garden is the plate's: its lattice border, the hatched banks, the river's waves, white stones, the giants' arms and hands, a rope. */
const WILLOW_PALETTE = {
  B: ['blueBank', 14], K: ['plateBank', 14], W: ['blueWave', 6], S: ['stoneRound', 13], A: ['arm', 14], H: ['hand', 5], R: ['rope', 14],
} as const satisfies Palette;

const JUNK_PALETTE = {
  E: ['hillEarth', 9], D: ['dock', 9], W: ['lakeWater', 6], R: ['rope', 13], H: ['junkHull', 2], Q: ['raft', 13], K: ['plankCracked', 9], L: ['plankSplit', 9],
} as const satisfies Palette;

/** A patch of the wall's face stamped a cell at a time behind him (a decoration of one character costs one character however many are placed): columns c0-c1, rows r0-r1. */
function faceCells(c0: number, r0: number, c1: number, r1: number): Placed[] {
  const cells: Placed[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.push(['wallCell', c, r]);
  return cells;
}

/** A back wall behind him: the character `backCell` on every cell the room's paint leaves empty in the rectangle (columns c0-c1, rows r0-r1), (a coin hangs on it: the engine draws the coin over the backdrop). */
function backWall(paint: (g: Grid) => void, c0: number, r0: number, c1: number, r1: number): Placed[] {
  return fillCells(paint, [], [c0, r0, c1, r1], 'backCell');
}

// ---- the timed strikes ----------------------------------------------------------------------------------
/**
 * The hutong's string of firecrackers: nine hung under the beam (cols 19-27, rows 7-8), lit from the left end and going off a cell every 6 frames (the fuse
 * flickering a cell ahead for 18 frames), each a bang for 12 frames, then a scrap of paper (nothing) until the string is hung again at the end of the
 * 450-frame period. The bang front moves faster than he walks (a cell in 8 frames), so he waits until the string has gone off and crosses while it is spent.
 */
const CRACKERS = { first: 19, count: 9, rows: [7, 8] as const, period: 450, lit: 170, lag: 6, warn: 18, live: 12 } as const;
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
const ARMS = { gaps: [13, 20, 25] as const, top: 8, hand: 14, period: 150, apart: 40, warn: 20, live: 36 } as const;
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
/**
 * The yellow awning over the street (row 9, columns 4-7), the rotten one of the market's awnings: each cell its own patch of crumbling cloth that frays after 14 frames under his feet, tears after 26 and is gone after
 * 34 (a walk over a cell is about 18), so he crosses it at his walk, picking up the coin on it as he goes, and a pause to look about drops him into the street. Whole again when he comes into the room.
 */
export const AWNING_CRACKS: readonly CrackSpec[] = Array.from({ length: 4 }, (_, k): CrackSpec => ({
  room: CHI.market, col: 4 + k, cols: 1, row: 9, codes: [codeOf(MARKET_PALETTE, 'Y'), codeOf(MARKET_PALETTE, 'T'), codeOf(MARKET_PALETTE, 'U')], crack: 14, wide: 26, gone: 34, away: 300,
}));
export const JUNK_RAFT_CODE = codeOf(JUNK_PALETTE, 'Q');
/**
 * The jetty's planks (row 17, columns 6-18), each cell its own patch of crumbling floor (Siberia's cracking ice, per cell): it shows cracks after 16 frames under his feet, splits after 34 and is gone
 * after 46, whatever is under it taking him (the river, the fish). His two-cell foot is over a cell for about 18 frames when he walks without stopping, so a steady run is safe with a margin of 28
 * frames (about half a second) for a hesitation; a long stop is not. It is whole again when he comes into the room.
 */
export const JUNK_CRACKS: readonly CrackSpec[] = Array.from({ length: 13 }, (_, k): CrackSpec => ({
  room: CHI.junk, col: 6 + k, cols: 1, row: 17, codes: [codeOf(JUNK_PALETTE, 'D'), codeOf(JUNK_PALETTE, 'K'), codeOf(JUNK_PALETTE, 'L')], crack: 16, wide: 34, gone: 46, away: 600,
}));

/** The paint of alley's room: its tiles. */
const paintAlley = (g: Grid): void => {
    g.box(0, 0, 1, 0, 'E').box(7, 0, 14, 0, 'E').box(7, 1, 13, 1, 'E').box(0, 1, 1, 1, 'E').box(0, 2, 1, 13, 'B'); // the house's eave over the rope's way up (five cells wide round it); the corner of a hutong house at the left, the lane open to the sky and running off to the right
    g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'B');
    g.box(4, 0, 4, 16, 'R');
    g.box(8, 15, 10, 15, 'S').box(11, 13, 13, 13, 'S').box(14, 11, 16, 11, 'S'); // the shelves
    g.box(17, 9, 29, 9, 'P'); // the roof ledge
    g.box(16, 1, 30, 1, 'E').box(17, 2, 29, 5, 'B').box(19, 6, 27, 6, 'E'); // the house over it, its eave, the beam
    for (let c = CRACKERS.first; c < CRACKERS.first + CRACKERS.count; c++) g.box(c, 7, c, 8, 'K'); // the crackers
};

/** The paint of market's room: its tiles. */
const paintMarket = (g: Grid): void => {
    g.box(0, 0, 1, 5, 'B').box(0, 9, 1, 13, 'B').box(30, 0, 31, 13, 'B'); // a house at each end running up off the screen, the street open to the sky between
    g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'B').clear(2, 17, 6, 19).box(4, 16, 4, 19, 'R');
    g.box(0, 9, 3, 9, 'A').box(4, 9, 7, 9, 'Y').box(8, 9, 10, 9, 'A'); // the awnings
    g.box(12, 9, 12, 16, 'R'); // the rope down from them
};

/** The paint of roofs's room: its tiles. The golden roofs are the floor: the hall's ridge along the bottom, the eaves stepping up, the high ridge. */
const paintRoofs = (g: Grid): void => {
    g.box(30, 0, 31, 5, 'B').box(30, 9, 31, 16, 'B'); // the next hall's gable at the top right and the high ridge's gable end, the sky open between them and running off the left edge
    g.box(0, 17, 22, 17, 'Y').box(0, 18, 22, 19, 'B').box(26, 17, 31, 17, 'Y').box(26, 18, 31, 19, 'B').box(24, 16, 24, 19, 'R'); // the hall's ridge and slope, the hatch in it and the rope up through it
    g.box(27, 15, 29, 15, 'E').box(24, 13, 26, 13, 'E').box(21, 11, 23, 11, 'E'); // the eaves
    g.box(24, 9, 31, 9, 'E'); // the ridge, starting past the top eave so he never stands under it
};

/** The paint of HEAVEN CAN WAIT: the last hall's ridge running on from the rooftops to its gable, and three glazed eaves stepping up to the coin. */
const paintHeaven = (g: Grid): void => {
    g.box(0, 0, 1, 16, 'B'); // the end hall's gable, up off the screen
    g.box(0, 17, 31, 17, 'Y').box(0, 18, 31, 19, 'B'); // the ridge and the hall's roof under it
    g.box(24, 15, 26, 15, 'E').box(19, 13, 21, 13, 'E').box(14, 11, 16, 11, 'E'); // the eaves
};

/** The paint of gate's room: its tiles. */
const paintGate = (g: Grid): void => {
    g.box(0, 3, 1, 13, 'W').box(0, 2, 2, 2, 'E').box(29, 7, 31, 16, 'W').box(29, 6, 31, 6, 'E'); g.box(14, 0, 22, 0, 'E').box(26, 0, 31, 0, 'E').box(16, 1, 21, 1, 'E'); // the roofs' eaves over the rope's way up // the palace's walls with their eaves, the court open to the sky
    g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'W');
    g.box(14, 5, 17, 10, 'W').box(14, 11, 17, 16, 'D'); // the gate tower and its doors
    g.box(24, 0, 24, 16, 'R');
    g.box(3, 9, 10, 9, 'Y').box(12, 9, 12, 16, 'R'); // the gallery over the outer court, and the rope up to it
};

/** Where the coins hang in the hutong and the market (the back walls leave them clear). */
const ALLEY_COINS = [[12, 11], [27, 15]] as const;
const MARKET_COINS = [[6, 7], [21, 15]] as const;

// ---- the rooms ----------------------------------------------------------------------------------------------

/**
 * DON'T ROCK THE BOAT (added 2026-11-25): Houhai, the lake the hutong opens onto, under the Drum Tower at dusk. Two pleasure boats ply it, each over its half (`HOUHAI_BOATS`, floats
 * that go there and back, as the mine cart does): the west one from the hutong's quay to the middle, the east one from the middle to the far bank. They set off together, meet in the
 * middle and wait there side by side (`BOATS.hold` cells' time), then go back to their banks and wait again. So the crossing is a change of boats while they wait together: ride the
 * west one out, step across, ride on; the lake (the room's water) is deadly. A coin hangs over the meeting place (a hop while both wait) and one is on the far bank. Back the same way.
 */
const BOATS = { row: 17, west: { from: 8, to: 16 }, east: { from: 17, to: 25 }, w: 4, step: 8, hold: 12 } as const;
const HOUHAI_PALETTE = {
  P: ['wallPave', 8], B: ['hutongBrick', 10], W: ['lakeWater', 6], H: ['boatHull', 2], D: ['redWall', 2],
} as const satisfies Palette;
const boat = (span: { readonly from: number; readonly to: number }, offset: number): FloatSpec => ({
  room: CHI.houhai, row: BOATS.row, span, dir: 1, step: BOATS.step, every: 0, w: BOATS.w, offset, deck: codeOf(HOUHAI_PALETTE, 'H'), decor: decorIndex('boatCanopy'), h: 3,
  home: [span.from, BOATS.row - 3], bounce: { hold: BOATS.hold },
});
/** The west boat sets off from the quay as the east one sets off back from the far bank (a leg's time on in its cycle), so they reach the middle together. */
export const HOUHAI_BOATS: readonly FloatSpec[] = [boat(BOATS.west, 0), boat(BOATS.east, BOATS.east.to - BOATS.east.from + 1 - BOATS.w + BOATS.hold)];
const paintHouhai = (g: Grid): void => {
  g.box(0, 17, 7, 17, 'P').box(0, 18, 7, 19, 'B'); // the hutong's lane, ending at its quay
  g.box(BOATS.west.from, 17, BOATS.east.to, 19, 'W'); // the lake
  g.box(26, 17, 31, 17, 'P').box(26, 18, 31, 19, 'B'); // the far bank
  g.box(30, 0, 31, 16, 'D'); // a temple's red wall closing the far bank, up off the screen (no walkway drawn to the edge)
};
/** Where the Drum Tower stands in the picture (its 7 x 6 characters' top left), over the far shore's line at row 11. */
const TOWER = { col: 12, row: 5 } as const;
const inTower = (c: number, r: number) => c >= TOWER.col && c < TOWER.col + 7 && r >= TOWER.row && r < TOWER.row + 6;
const HOUHAI_COINS: readonly (readonly [col: number, row: number])[] = [[16, 13], [28, 15]];

export const CHINA_ROOMS: readonly RoomSpec[] = [
  // A ALL WALL AND NO PLAY: the Great Wall's foot. In from Siberia, low. The wall is a block across the right of the room with a tunnel through its foot (the way east, low,
  // to the hutong) and a stair of three stone steps up its flank onto its top, along it to a rope at column 25 up through the sky into the tower (the dumplings at the wall's far end).
  room({
    id: CHI.wall, cell: [2, 8], sector: 18, palette: WALL_PALETTE,
    shut: [['left', 3, 7, 'E']], // the border post's wall beside it runs up to the sky
    paint(g) {
      g.box(14, 0, 23, 0, 'G').box(27, 0, 31, 0, 'G').box(16, 1, 22, 1, 'G'); // the tower's foot overhanging the rope's way up; the rest open sky
      g.box(0, 8, 1, 13, 'E').box(0, 8, 1, 8, 'T'); // the hillside at the left edge, the sky open above
      g.box(0, 17, 31, 17, 'T').box(0, 18, 31, 19, 'E');
      g.box(4, 15, 6, 15, 'S').box(7, 13, 9, 13, 'S').box(10, 11, 12, 11, 'S'); // the stair of steps
      g.box(13, 10, 31, 13, 'G').box(13, 9, 31, 9, 'P'); // the wall, its paved top
      g.box(30, 2, 31, 8, 'G').box(30, 4, 31, 4, 'L').box(30, 6, 31, 6, 'L'); // the tower's wall at the right, its slits
      g.box(25, 0, 25, 8, 'R');
      g.clear(15, 10, 21, 11).clear(17, 12, 21, 13).box(19, 10, 19, 16, 'R'); // a chamber in the wall's thickness, open to the tunnel through a gap in its roof (five cells round the rope) and the rope up into it: no item needed, a coin is no reason for a key
    },
    coins: [[8, 11], [15, 11]],
    item: { name: 'dumplings1', col: 28, row: 7, sprite: CHINA_SPRITE.dumplings },
    decor: [
      ['peakBrown', 2, 5], ['peakBrown', 8, 5], ['peakBrown', 14, 4], ['peakBrown', 19, 4], ['hillGreen', 1, 5], // the mountains behind the Wall, a range and the near hills in front of it
      ...[13, 15, 17, 19, 21, 23, 26, 28].map((c) => ['crenels', c, 8] as const), // its battlements
      ...[13, 20, 26].map((c) => ['arcadeBay', c, 14] as const), // the arched bays of its foot (a gap between the first two for the hatch's rope)
      ...faceCells(10, 12, 12, 16), ...faceCells(7, 14, 9, 16), ...faceCells(4, 16, 6, 16), // the flank stepping down with the stair
      ['wallFlag', 26, 6], ['bambooClump', 2, 13],
    ],
    creatures: [
      { who: 'panda', col: 7, row: 15, way: 'right', speed: 1, range: 16 },
      { who: 'kite', col: 19, row: 2, way: 'down', speed: 1, range: 20 },
    ],
  }),

  // D BACK ALLEY BEIJING: the hutong. In from the wall's tunnel, low; a rope at column 4 up to the market. The ground runs east to a dead end past a bicycle and a monk on a pogo stick; shelves
  // up the middle to a roof ledge under a beam and a string of firecrackers that go off in turn; the key at its end.
  room({
    id: CHI.alley, cell: [2, 9], sector: 19, palette: ALLEY_PALETTE,
    paint: paintAlley,
    coins: ALLEY_COINS,
    item: { name: 'key', col: 28, row: 7, sprite: CHINA_SPRITE.key },
    decor: [
      ...backWall(paintAlley, 2, 10, 31, 16), ...backWall(paintAlley, 2, 7, 16, 9), // the lane's wall behind him, running up under the washing
      ...[2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((c) => ['cord', c, 4] as const), ['laundry', 5, 5], ['laundryB', 9, 5], ['laundryC', 13, 5], // the clothesline from house to house, behind the rope, hung with washing of every colour
      ['hutongGate', 20, 13], ['boxes', 15, 15], ['latticeWindow', 20, 3], ['latticeWindow', 25, 3], ['hangingLantern', 12, 2], ['hangingLantern', 14, 2],
    ],
    creatures: [
      { who: 'bicycle', col: 6, row: 15, way: 'right', speed: 2, range: 28 },
      { who: 'monk', col: 24, row: 13, way: 'down', speed: 1, range: 20 },
    ],
  }),

  // T THE WATCHTOWER: the watchtower's hall. In by the rope from the wall (the floor gap at column 25); a stair of ledges up to a walkway over the hall; out east low or high. A rope
  // at column 16 under the trapdoor (shut until the key) climbs to the wall's top.
  room({
    id: CHI.tower, cell: [1, 8], sector: 20, palette: TOWER_PALETTE,
    paint(g) {
      g.box(2, 2, 29, 16, 'N'); // the hall's inner wall
      g.box(0, 0, 31, 1, 'G').box(15, 0, 17, 1, 'T');
      g.box(0, 2, 1, 16, 'G').box(30, 2, 31, 5, 'G').box(30, 9, 31, 13, 'G');
      g.box(0, 4, 1, 4, 'L').box(0, 10, 1, 10, 'L').box(30, 3, 31, 3, 'L').box(30, 11, 31, 11, 'L'); // slits in the outer walls
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'G').clear(24, 17, 26, 19).box(25, 16, 25, 19, 'R');
      g.box(3, 15, 5, 15, 'S').box(6, 13, 8, 13, 'S').box(9, 11, 11, 11, 'S'); // the stair of ledges
      g.box(12, 9, 31, 9, 'P'); // the walkway
      g.box(16, 2, 16, 8, 'R'); // the rope under the trapdoor
    },
    coins: [[7, 11], [24, 7]],
    decor: [['wallWindow', 5, 3], ['wallWindow', 23, 3], ['banner', 19, 3], ['rack', 13, 15], ['gong', 18, 14], ['drum', 28, 15], ['hangingLantern', 12, 2], ['hangingLantern', 27, 2]],
    creatures: [
      { who: 'warrior', col: 8, row: 15, way: 'right', speed: 1, range: 56 },
      { who: 'lantern', col: 22, row: 2, way: 'down', speed: 1, range: 16 },
      { who: 'cricket', col: 19, row: 2, way: 'down', speed: 1, range: 24, colour: 13 }, // hopping by the walkway east of the rope, light green over the banner: he walks under it when it is up, either way. (It paced the walkway, the only way to the top right door: passing it took a jump under the rope that cleared it about 1 try in 12 going east, 1 in 35 going west: the door seemed shut, Chris 2026-11-24)
    ],
  }),

  // C MIND THE BATTLEMENTS: the wall's top by night between two towers, a dead end. In by the floor gap from the tower; a winding climb: right up two steps from the floor to a long walkway back
  // west, up the left to the beacon's platform and east along it to the rice hat.
  room({
    id: CHI.top, cell: [0, 8], sector: 21, palette: TOP_PALETTE,
    paint(g) {
      g.box(0, 2, 1, 16, 'G').box(30, 2, 31, 16, 'G'); // a tower closing the wall at each end, the night sky open above (the right one shuts the join to HEAVEN CAN WAIT: a way there would go round the city gate)
      g.box(0, 5, 1, 5, 'S').box(0, 9, 1, 9, 'S').box(0, 13, 1, 13, 'S').box(30, 5, 31, 5, 'S').box(30, 9, 31, 9, 'S').box(30, 13, 31, 13, 'S'); // their slits
      g.box(0, 17, 31, 17, 'P').box(0, 18, 31, 19, 'G').clear(15, 17, 17, 19).box(16, 16, 16, 19, 'R');
      g.box(22, 15, 24, 15, 'L').box(25, 13, 27, 13, 'L'); // the steps up from the floor
      g.box(6, 11, 24, 11, 'L'); // the long walkway, ending short of the steps' top so he never stands under it
      g.box(3, 9, 5, 9, 'L').box(6, 7, 8, 7, 'L'); // the steps up the left
      g.box(9, 5, 29, 5, 'L'); // the beacon's platform
    },
    coins: [[23, 13], [14, 9]],
    item: { name: 'rice hat', col: 27, row: 3, sprite: CHINA_SPRITE.riceHat },
    decor: [
      ['moon', 4, 3], ...[[8, 2], [13, 3], [18, 2], [3, 7], [11, 8], [26, 8], [20, 9], [28, 11], [4, 13], [24, 13]].map(([c, r]) => ['star', c ?? 0, r ?? 0] as const), // the night
      ['peakNight', 2, 13], ['peakNight', 8, 13], ['peakNight', 14, 13], // the mountains in the dark
      ...[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28].filter((c) => c !== 16).map((c) => ['crenels', c, 16] as const), // the walk's battlements
      ...[6, 8, 10, 12, 14, 16, 18, 20, 22].map((c) => ['crenels', c, 10] as const), // the long walkway's battlements
      ...faceCells(6, 12, 24, 12), ...faceCells(9, 6, 29, 6), ...faceCells(3, 10, 5, 10), ...faceCells(6, 8, 8, 8), ...faceCells(25, 14, 27, 14), // the wall's face under each stretch
      ['brazier', 22, 3], ['rack', 14, 3], ['hangingLantern', 11, 2], ['hangingLantern', 19, 2],
    ],
    creatures: [
      { who: 'warrior', col: 3, row: 15, way: 'right', speed: 1, range: 64 },
      { who: 'kite', col: 14, row: 6, way: 'down', speed: 1, range: 24 },
      { who: 'monk', col: 19, row: 13, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // E NOODLE MARKET: the market at New Year. In from the tower's hall (low, the street) or its walkway (high, the awnings, a rope down to the street); a gap in the street with a rope
  // down into the hutong (col 4, under the hutong's rope); east, low, to the gate. The dragon loops through the right of the room.
  room({
    id: CHI.market, cell: [1, 9], sector: 22, palette: MARKET_PALETTE,
    paint: paintMarket,
    coins: MARKET_COINS,
    decor: [
      ['cityRoofs', 7, 6], ['cityRoofs', 15, 6], ['cityRoofs', 22, 6], // the city's roofs far off in the haze, the dragon over them
      ...backWall(paintMarket, 2, 10, 29, 16), // the shop fronts behind the stalls
      ['lanternString', 2, 2], ['lanternString', 7, 2], ['lanternString', 12, 2], ['latticeWindow', 8, 11], ['latticeWindow', 17, 11], ['latticeWindow', 26, 11],
      ['noodleStall', 7, 14], ['noodleStall', 13, 14], ['noodleStall', 22, 14], ['drum', 28, 15], ['banner', 3, 11], ['pottedPlant', 10, 15],
    ],
  }),

  // F THE FORBIDDEN CITY: the Forbidden City's gate. In from the market, low, into the outer court (a stone lion alive); the gate tower across the room with its doors across the court
  // (shut until the rice hat); a rope at column 12 up to a gallery over the outer court (a dead end with a coin); inside, a court with a guard (who steps aside for the rice
  // hat) and the rope up at column 24.
  room({
    id: CHI.gate, cell: [1, 10], sector: 23, palette: GATE_PALETTE,
    shut: [['right', 1, 5, 'W']], // the palace wall runs up the right edge: the quay beside it is a wall there
    paint: paintGate,
    coins: [[8, 15], [6, 7], [28, 15]],
    decor: [['lionStatue', 10, 15], ['lionStatue', 18, 15], ['gateRoof', 12, 2], ['hangingLantern', 5, 10], ['hangingLantern', 9, 10], ['hangingLantern', 19, 8], ['pottedPlant', 26, 15], ['cloudFrieze', 4, 2]],
    creatures: [
      { who: 'lion', col: 4, row: 15, way: 'right', speed: 1, range: 40 },
      { who: 'imperialGuard', col: 19, row: 15, way: 'right', speed: 1, range: 32 },
    ],
  }),

  // G THE EMPEROR(S ROOFTOPS: the palace roofs at dusk. In by the rope from the gate up through a hatch in a hall's ridge; west along the ridge a dead end with dumplings and a coin; east a stair of glazed eaves up to the high ridge, along it east.
  // Halls recede in tiers behind under a sky going from blue to red, lanterns hang under the eaves.
  room({
    id: CHI.roofs, cell: [0, 10], sector: 24, palette: ROOFS_PALETTE,
    paint: paintRoofs,
    coins: [[12, 15], [26, 7]],
    item: { name: 'dumplings2', col: 4, row: 15, sprite: CHINA_SPRITE.dumplings },
    decor: [
      ...fillCells(paintRoofs, [], [0, 0, 31, 4], 'duskBand'), ...fillCells(paintRoofs, [], [0, 5, 31, 12], 'duskGlow'), // the sky, blue overhead and red toward the halls
      ['moon', 26, 2], ...[[3, 1], [9, 2], [14, 1], [20, 3], [5, 4]].map(([c, r]) => ['star', c ?? 0, r ?? 0] as const),
      ['gateRoof', 2, 2], ['palaceHall', 12, 5], ['palaceHall', 0, 8], // the halls receding in tiers
      ['roofDragon', 24, 7], ['roofDragon', 20, 15], ['ridgeBeasts', 8, 16], ['lanternPost', 15, 14], // a dragon on each ridge's end, the beasts marching along the ridge
      ['eaveTip', 27, 14], ['eaveTip', 29, 14], ['eaveTip', 24, 12], ['eaveTip', 26, 12], ['eaveTip', 21, 10], ['eaveTip', 23, 10], // the curl of each eave
      ['hangingLantern', 22, 12], ['hangingLantern', 25, 14],
    ],
    creatures: [
      { who: 'lion', col: 7, row: 15, way: 'right', speed: 1, range: 56, colour: 1 },
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
      g.box(0, 9, 1, 19, 'K').box(3, 8, 3, 19, 'R'); // the entry bank, the well and its rope
      g.box(5, 11, 6, 19, 'K').box(7, 13, 8, 19, 'K').box(9, 15, 11, 19, 'K'); // the steps and the shore
      g.box(12, 16, 26, 19, 'W').box(12, 19, 26, 19, 'B'); // the river, the plate's border under it
      g.box(15, 15, 18, 16, 'S').box(22, 15, 24, 16, 'S'); // the stones
      g.box(27, 15, 31, 19, 'K'); // the island
    },
    coins: [[19, 13]],
    item: { name: 'bamboo', col: 29, row: 13, sprite: CHINA_SPRITE.bamboo },
    decor: [
      ['kissingDoves', 6, 2], ['cloud', 16, 2], ['cloud', 28, 2],
      ...[9, 16, 23].map((c) => ['archBridge', c, 6] as const), // the long arched bridge
      ['crouchFigure', 12, 3], ['crouchFigure', 19, 3], ['crouchFigure', 24, 3], // the three giants crouched on it, in front of it, their sleeves over the gaps the arms reach through
      ['willowTree', 4, 5], ['roundTree', 0, 7], ['pagoda', 27, 8], ['plateFence', 27, 14], ['plateFence', 29, 14],
    ],
    creatures: [
      { who: 'dove', col: 10, row: 7, way: 'right', speed: 1, range: 48 },
      { who: 'dove', col: 20, row: 9, way: 'right', speed: 1, range: 40 },
      { who: 'carp', col: 12, row: 18, way: 'right', speed: 1, range: 56 },
    ],
  }),

  // J DOWN THE RIVER: the quay and its rotten jetty. In by the rope from the garden's well; a short bank, then a jetty of old planks over the river that give way a few moments after he steps on them (he must keep
  // running; a fall is the fish); a crane's arm with a coin, up a rope; seven cells of river (the bamboo puts a raft across), a gull diving; the junk's deck, and the way east, low, into Japan's harbour.
  room({
    id: CHI.junk, cell: [1, 11], sector: 26, palette: JUNK_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 16, 'E'); // a cliff of the bank at the left running off the top: the sky open over the river, and on to the right
      g.box(0, 17, 5, 17, 'D').box(0, 18, 5, 19, 'E'); // the bank
      g.box(6, 17, 18, 17, 'D').box(6, 18, 18, 19, 'W'); // the jetty, over the river (JUNK_CRACKS take it from here)
      g.box(19, 17, 25, 19, 'W');
      g.box(26, 17, 31, 17, 'D').box(26, 18, 31, 19, 'H');
      g.box(3, 0, 3, 16, 'R');
      g.box(8, 11, 12, 11, 'D').box(13, 11, 13, 16, 'R'); // the crane's arm over the jetty, and the rope up to it
    },
    coins: [[10, 9]],
    decor: [['lanternPost', 9, 14], ['boxes', 15, 15], ['junk', 26, 11], ['hangingLantern', 18, 2], ['hangingLantern', 24, 2], ['peakNight', 14, 12], ['peakNight', 20, 12], ['hillLow', 5, 14]],
    creatures: [
      { who: 'cricket', col: 7, row: 15, way: 'right', speed: 1, range: 36, colour: 8 },
      { who: 'dove', col: 22, row: 6, way: 'down', speed: 1, range: 64 },
      { who: 'carp', col: 7, row: 18, way: 'right', speed: 1, range: 88 },
    ],
  }),

  // HEAVEN CAN WAIT: a nook at the west end of the palace roofs, a dead end (added 2026-11-24, Chris: the rooftops' open left side). In along the hall's ridge from the
  // rooftops; the Temple of Heaven far off over the city at dusk; three glazed eaves step up to a coin at the top (it tops the climb). The gable at the left closes it: the
  // battlements beyond are reached only by the trapdoor, and a way through here would go round the city gate.
  room({
    id: CHI.heaven, cell: [0, 9], sector: 82, palette: HEAVEN_PALETTE,
    paint: paintHeaven,
    coins: [[15, 9]],
    decor: [
      ...fillCells(paintHeaven, [], [0, 0, 31, 4], 'duskBand'), ...fillCells(paintHeaven, [], [0, 5, 31, 12], 'duskGlow'), // the rooftops' sky going on
      ...[[6, 1], [12, 3], [19, 1], [23, 4], [29, 2], [4, 5]].map(([c, r]) => ['star', c ?? 0, r ?? 0] as const),
      ['templeHeaven', 3, 8], // the Hall of Prayer for Good Harvests over the city, its terraces on the ridge's line
      ['ridgeBeasts', 19, 16], // the beasts marching along the ridge
      ['eaveTip', 24, 14], ['eaveTip', 26, 14], ['eaveTip', 19, 12], ['eaveTip', 21, 12], ['eaveTip', 14, 10], ['eaveTip', 16, 10],
    ],
  }),
  // DON'T ROCK THE BOAT: Houhai, the lake at the end of the hutong, a bonus room (Chris, 2026-11-25: "BACK ALLEY BEIJING... can have the same thing"; "an opportunity to try some new
  // things"). In along the lane from the hutong to its quay; the Drum Tower over the lake at dusk, willows on the banks. Two boats ply the lake's halves and wait together in the middle
  // (HOUHAI_BOATS): out on the west one, across to the east one while they wait, on to the far bank (a coin) under a temple's wall; a coin over the meeting place. Never needed: back the same way.
  room({
    id: CHI.houhai, cell: [2, 10], sector: CHI.houhai, palette: HOUHAI_PALETTE,
    paint: paintHouhai,
    coins: HOUHAI_COINS,
    decor: [
      ...fillCells(paintHouhai, HOUHAI_COINS, [0, 0, 31, 3], 'duskBand'), ...fillCells(paintHouhai, HOUHAI_COINS, [0, 4, 31, 10], 'duskGlow').filter(([, c, r]) => !inTower(c, r)),
      ...fillCells(paintHouhai, HOUHAI_COINS, [0, 11, 29, 11], 'farShore'),
      ['drumTower', TOWER.col, TOWER.row], ['houhaiWillow', 1, 11], // (the tower on the lake's far shore, the line of roofs and trees there under it)
      ['star', 5, 1], ['star', 22, 2], ['star', 14, 0],
      ['boatCanopy', BOATS.west.from, BOATS.row - 3], ['boatCanopy', BOATS.east.from, BOATS.row - 3],
    ],
    creatures: [], // (the boats are the room: China's creatures are each in two rooms already)
  }),
];
