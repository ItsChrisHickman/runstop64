import type { PulseSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { JAPAN_SPRITE } from './japan-pointers';
import { codeOf, room, type Palette } from './layout';

/**
 * Japan, the fourth region of Do Svidaniya Monty (docs/dosvidaniya-japan.md): eleven rooms (ten and the hidden one) in a block five wide and three high at columns
 * 12-16 of the exit grid, entered from China's junk (column 11) and left east, over the cargo ship's gangway, into the Pacific (not yet built).
 *
 *             col 12                col 13              col 14                 col 15               col 16
 *   row 0       .                     .                   .                 L  THE LAST MOLE     H  THE CASTLE
 *   row 1   A  THE FISH MARKET   B  NEON STREET      D  THE CROSSING    G  KOI POLLOI        I  THE SHOGUN'S HALL
 *   row 2       .                 C  PACHINKO PARLOUR   E  BULLET POINT       F  MOUNT FUJI         J  SAYONARA SAILOR
 *
 * Playfield cells as in moscow.ts. Floors: the harbour, streets, parlour, crossing and port are on row 17 ("low"), the rooftops and the overpass on row 7 ("high"), the platform,
 * the mountain, the garden and the hall on row 14 ("mid"). The bullet trains (E) are `tunnels` with a picture, the paper doors (I) `pulses` whose spent look is a wall; the daruma (C)
 * rolls the platform's shutter up (E), the fish food (D) sends the koi off (G), the ninja hood (L, THE LAST MOLE) lets him by the castle's guard (I).
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from China's (18-26): they never change once the region has shipped. */
export const JP = { harbour: 27, street: 28, parlour: 29, crossing: 30, platform: 31, fuji: 32, garden: 33, mole: 34, tiers: 35, hall: 36, port: 37 } as const;

/** The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 27 on. */
const NAMES = [
  'THE FISH MARKET', 'NEON STREET', 'PACHINKO PARLOUR', 'THE CROSSING', 'BULLET POINT', 'MOUNT FUJI', 'KOI POLLOI', 'THE LAST MOLE', 'THE CASTLE', "THE SHOGUN'S HALL", 'SAYONARA SAILOR',
] as const;
export const JAPAN_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the harbour light blue, the street and parlour reds, the crossing grey, the platform blue, the mountain white, the garden green, the hidden room purple, the roofs yellow, the hall orange, the port brown). */
export const JAPAN_COLOURS: readonly number[] = [14, 2, 10, 12, 6, 1, 5, 4, 7, 8, 9];

// ---- the palettes --------------------------------------------------------------------------------------
export const HARBOUR_PALETTE = {
  Q: ['jpQuay', 9], P: ['jpPier', 6], W: ['jpWater', 14], H: ['jpJunkHull', 2], T: ['jpCrateTop', 8], K: ['jpKawara', 14], B: ['jpRoofBody', 6], F: ['jpWarehouse', 9],
} as const satisfies Palette;

export const STREET_PALETTE = {
  A: ['jpAsphalt', 6], O: ['jpLitA', 7], P: ['jpLitB', 3], Q: ['jpLitA', 10], K: ['jpKawara', 14], R: ['jpPipe', 5],
} as const satisfies Palette;

export const PARLOUR_PALETTE = {
  P: ['jpCarpet', 4], W: ['jpOffice', 2], K: ['jpTimber', 9], M: ['jpPachinko', 10], L: ['jpPlank', 2], R: ['jpBamboo', 5],
} as const satisfies Palette;

export const CROSSING_PALETTE = {
  A: ['jpAsphalt', 6], Z: ['jpZebra', 1], S: ['jpSteel', 14], O: ['jpLitA', 7], Q: ['jpLitB', 3], R: ['jpPipe', 5],
} as const satisfies Palette;

/** The platform's eight: the tiled concrete (walls, deck, the pillar), the shutter, the stairs' rope, and the five a train is drawn in (its body, windows, blue band, wheels and the half cell of its nose). */
export const PLATFORM_PALETTE = {
  W: ['jpTiled', 14], H: ['jpShutter', 12], R: ['jpBamboo', 5], B: ['jpTrainBody', 1], N: ['jpTrainWin', 1], S: ['jpTrainBand', 6], L: ['jpTrainWheel', 12], E: ['jpTrainHalf', 1],
} as const satisfies Palette;

/** The mountain's five: the scree (frame and foot), the trail's ledges, the chain, and the mountain's own body (snow above, slope below) as scenery behind the trail. */
export const FUJI_PALETTE = {
  S: ['jpScree', 9], T: ['jpTrail', 7], R: ['jpChain', 12], N: ['jpSnow', 1], M: ['jpSlope', 6], D: ['jpSlopeL', 6], Y: ['jpSlopeR', 6],
} as const satisfies Palette;

export const GARDEN_PALETTE = {
  M: ['jpMoss', 5], G: ['jpGravel', 7], W: ['jpWater', 14], P: ['jpPlank', 2], R: ['jpBamboo', 5], L: ['jpPlaster', 1], K: ['jpKawara', 14], T: ['jpTimber', 9],
} as const satisfies Palette;

export const MOLE_PALETTE = {
  M: ['jpMoss', 5], W: ['jpWater', 14], S: ['jpStone', 12], T: ['jpTimber', 9], R: ['jpBamboo', 5], L: ['jpPlaster', 1], K: ['jpKawara', 14],
} as const satisfies Palette;

export const TIERS_PALETTE = {
  S: ['jpStoneWall', 9], E: ['jpEave', 6], R: ['jpBamboo', 5], M: ['jpMoss', 5], P: ['jpKeepWall', 1], N: ['jpKeepWindow', 1], B: ['jpKeepBase', 9],
} as const satisfies Palette;

/** The hall's eight: the timber, tatami, plaster, the gallery's eave, the paper door shut, shaking and open, and the rope. */
export const HALL_PALETTE = {
  T: ['jpTimber', 9], A: ['jpTatami', 7], E: ['jpEave', 14], S: ['jpShojiShut', 1], N: ['jpShojiWarn', 7], O: ['jpShojiOpen', 9], R: ['jpBamboo', 5],
} as const satisfies Palette;

export const PORT_PALETTE = {
  S: ['jpSteel', 14], C: ['jpContainer', 2], H: ['jpShipHull', 2], K: ['jpCrateTop', 8], D: ['jpCrate', 8], R: ['jpBamboo', 5], W: ['jpWater', 14], P: ['jpPorthole', 2],
} as const satisfies Palette;

// ---- the bullet trains ------------------------------------------------------------------------------------
/**
 * The bullet trains (E): a train 24 cells long and 6 tall (rows 8-13, on the platform's lane: taller than any jump) sweeps the room a cell every 3 frames, so across the 32 columns
 * and its own length in 171 frames. Its edge flashes at the end it comes in at for 100 frames first (the warning), then it comes on. The two trains take turns, so the room's cycle is
 * 656 frames: the up train from the right (its edge flashes from frame 185 and again every 656), 328 frames later the down train from the left, and between one train's going and the other's
 * flash 57 frames in which nothing is on the platform and no edge flashes: the quiet moment. No flash and no train is "go": a dash from the stairs to the way out (about 100 frames) started
 * then is clear, since the next train is a flash (100 frames) and its run in away. A flash means a train is coming from that end. The platform is unsafe while one is on it; the underpass
 * and the stairs' ropes below the platform are safe. Drawn in the room's own characters: a stepped nose (4 cells) and five cars (4 cells each) of white with a row of windows and a blue band
 * over wheels, going into the tiled wall at the ends as into a tunnel (it is not drawn over a wall).
 */
export const TRAIN = { rows: 6, top: 8, cols: 24, nose: 8, step: 3, warn: 100, sweep: 171, quiet: 57, first: 185 } as const;
/** A train's cycle (rest, warning, sweep) and the frames between the two trains' warnings: two trains with a quiet moment after each. */
const TRAIN_CYCLE = 2 * (TRAIN.warn + TRAIN.sweep + TRAIN.quiet);
export const TRAIN_REST = TRAIN_CYCLE - TRAIN.warn - TRAIN.sweep;
export const TRAIN_APART = TRAIN_CYCLE / 2;

/** The nose's height in pixels above the bogies, column by column from the tip: it rises half a cell at a time, then a cell, to the roof: the long shinkansen nose. */
const NOSE_HEIGHTS = [4, 8, 12, 16, 20, 24, 32, 40] as const;

/** The picture of a train, its nose at the leading end (`noseLeft`: the up train, going left). */
function trainPicture(noseLeft: boolean): number[][] {
  const code = (letter: string) => codeOf(PLATFORM_PALETTE, letter);
  const half = code('E'), wheel = code('L');
  const car = [code('B'), code('N'), code('B'), code('S'), code('B')]; // roof, windows, body, blue band, body (top to bottom) over the bogies
  const column = (height: number): number[] => [
    ...car.map((tile, r) => {
      const fromFoot = 4 - r, have = height - 8 * fromFoot; // pixels of this row that are body
      return have >= 8 ? tile : have >= 4 ? half : 0;
    }),
    wheel,
  ];
  const nose = NOSE_HEIGHTS.map(column);
  const columns = [...nose, ...Array.from({ length: TRAIN.cols - TRAIN.nose }, () => column(40))];
  const ordered = noseLeft ? columns : [...columns].reverse();
  return Array.from({ length: TRAIN.rows }, (_, r) => ordered.map((c) => c[r] ?? 0));
}

export const TRAINS: readonly TunnelSpec[] = [
  { room: JP.platform, from: 'right', code: codeOf(PLATFORM_PALETTE, 'B'), cols: TRAIN.cols, top: TRAIN.top, bottom: TRAIN.top + TRAIN.rows - 1, step: TRAIN.step, rest: TRAIN_REST, warn: TRAIN.warn, offset: TRAIN.first - TRAIN_REST, picture: trainPicture(true) },
  { room: JP.platform, from: 'left', code: codeOf(PLATFORM_PALETTE, 'B'), cols: TRAIN.cols, top: TRAIN.top, bottom: TRAIN.top + TRAIN.rows - 1, step: TRAIN.step, rest: TRAIN_REST, warn: TRAIN.warn, offset: TRAIN.first + TRAIN_APART - TRAIN_REST, picture: trainPicture(false) },
];

// ---- the paper doors ----------------------------------------------------------------------------------------
/**
 * The hall's three pairs of sliding paper doors (I; `pulses`): a doorway 2 cells wide and 3 tall (rows 11-13) open for 80 frames, its lattice shaking for 24 (the warning), shut over a
 * panel's leading edge for 8 (deadly to what is in the doorway) and then a wall of paper until the 160-frame period is round. The doors shut 40 frames after one another from the first (the offsets run backwards in the period: 0, 120, 80), so a walker who passes the first as it opens finds the next open as he comes. A shut door
 * is a wall, not a trap: waiting at one is safe, stepping in as it shakes is not.
 */
export const DOORS = { cols: [6, 12, 18] as const, row: 11, rows: 3, period: 160, open: 80, warn: 24, live: 8, apart: 40 } as const;
export const DOOR_PULSES: readonly PulseSpec[] = DOORS.cols.map((col, k): PulseSpec => ({
  room: JP.hall, col, row: DOORS.row, cols: 2, rows: DOORS.rows, period: DOORS.period, start: DOORS.open, warn: DOORS.warn, live: DOORS.live, offset: (DOORS.period - k * DOORS.apart) % DOORS.period,
  idle: codeOf(HALL_PALETTE, 'O'), warnCode: codeOf(HALL_PALETTE, 'N'), liveCode: codeOf(HALL_PALETTE, 'S'), spent: codeOf(HALL_PALETTE, 'S'),
}));

/** The pond's other two planks (cols 19-20 on row 13, cols 22-23 on row 14): not there until the fish food, which brings them up as the koi come to feed. Without them the far bank is seven cells off. */
export const PLANK_CELLS: readonly (readonly [row: number, col: number])[] = [[13, 19], [13, 20], [14, 22], [14, 23]];
export const PLANK_CODE = codeOf(GARDEN_PALETTE, 'P');

// ---- the key items' places -------------------------------------------------------------------------------
/** The shutter's cells (col 29, rows 10-13: one cell wide, so the train runs on past it as past a post) that the daruma rolls up. */
export const SHUTTER_CELLS: readonly (readonly [row: number, col: number])[] = [10, 11, 12, 13].map((row) => [row, 29] as const);

/** The platform's scenery: the skyline beyond the station, a sign and a clock, the overhead wire across the whole room (but where a rope climbs through it) on its masts, the safety line along the deck's edge. */
const WIRE_COLS = Array.from({ length: 32 }, (_, c) => c).filter((c) => c !== 23 && c !== 29);
const EDGE_COLS = [1, 2, 3, 4, 5, 6, 7, 11, 12, 15, 16, 17, 18, 22, 24, 25, 28, 30, 31];
const PLATFORM_DECOR = [
  ['jpTowerGreen', 1, 3], ['jpTowerYellow', 26, 2], ['jpStars', 10, 1], ['jpStationSign', 6, 4], ['jpClock', 20, 4], ['jpBoard', 15, 3], ['jpVending', 3, 11],
  ...WIRE_COLS.map((col) => ['jpWire', col, 7] as const), ['jpMast', 13, 8], ['jpMast', 26, 8],
  ...EDGE_COLS.map((col) => ['jpEdge', col, 13] as const),
] as const;

// ---- the rooms ----------------------------------------------------------------------------------------------

export const JAPAN_ROOMS: readonly RoomSpec[] = [
  // A THE FISH MARKET: the fishing harbour at dawn. In from China's junk (low, its deck at the left); the quay runs east, with the market on it, past an inlet and a crate stack to the way out (low) to the street.
  // A stair of crates climbs through the market's roof (the way out high, to the rooftops); the roof's west end is a dead end with a sushi.
  room({
    id: JP.harbour, cell: [1, 12], sector: 27, palette: HARBOUR_PALETTE,
    paint(g) {
      g.box(30, 7, 31, 7, 'K').box(30, 8, 31, 14, 'F'); // (open sea to the left and open sky: the junk sails in; the market's warehouse closes the right between its two lanes)
      g.box(0, 17, 9, 19, 'H').box(10, 17, 12, 19, 'W').box(13, 17, 31, 17, 'Q').box(13, 18, 31, 19, 'P');
      g.box(8, 7, 29, 7, 'K').box(26, 8, 29, 9, 'B'); // the market's roof
      g.box(14, 15, 16, 15, 'T').box(17, 13, 19, 13, 'T').box(20, 11, 22, 11, 'T').box(23, 9, 25, 9, 'T'); // the stair of crates
    },
    coins: [[15, 13], [28, 5]],
    item: { name: 'sushi1', col: 9, row: 5, sprite: JAPAN_SPRITE.sushi },
    decor: [['jpHorizon', 14, 2], ['jpGulls', 5, 3], ['jpGulls', 26, 5], ['jpJunkSail', 1, 9], ['jpAwningRed', 9, 8], ['jpAwningBlue', 13, 8], ['jpAwningYellow', 17, 8], ['jpAwningRed', 21, 8], ['jpStall', 17, 14], ['jpFishCrate', 26, 15], ['jpFishCrate', 29, 15]],
    creatures: [
      { who: 'jpKappa', col: 21, row: 15, way: 'right', speed: 1, range: 20 },
      { who: 'jpSushiRoll', col: 14, row: 5, way: 'right', speed: 1, range: 40 },
    ],
  }),

  // B NEON STREET: Tokyo's street and its rooftops. In from the harbour low (the street) or high (the roofs); out to the crossing low or high. The shop fronts seal the lanes from each other but for a
  // drainpipe at the left; two pits between the roofs; a gap in the street with a rope down to the parlour.
  room({
    id: JP.street, cell: [1, 13], sector: 28, palette: STREET_PALETTE,
    paint(g) {
      g.box(0, 8, 1, 14, 'O').box(30, 8, 31, 14, 'Q'); // (open sky: the buildings run off the screen's edges)
      g.box(0, 17, 31, 19, 'A').clear(20, 17, 22, 19).box(21, 16, 21, 19, 'R'); // the street, the stairs' gap and its rope
      g.box(6, 8, 13, 13, 'O').box(14, 8, 23, 13, 'P').box(24, 8, 29, 13, 'Q').clear(11, 8, 13, 8).clear(24, 8, 26, 8); // the shop fronts, a pit between two roofs at each gap
      g.box(0, 7, 2, 7, 'K').box(6, 7, 10, 7, 'K').box(14, 7, 23, 7, 'K').box(27, 7, 31, 7, 'K'); // the roofs
      g.box(4, 7, 4, 16, 'R'); // the drainpipe
    },
    coins: [[12, 5], [14, 15]],
    decor: [['jpTowerYellow', 3, 2], ['jpNeonPink', 7, 3], ['jpTowerCyan', 10, 1], ['jpTowerRed', 15, 3], ['jpScreen', 19, 3], ['jpTowerGreen', 26, 3], ['jpNeonRamen', 9, 14], ['jpVending', 26, 14], ['jpCrowdBlue', 5, 15]],
    creatures: [
      { who: 'jpSushiRoll', col: 6, row: 5, way: 'right', speed: 1, range: 24 },
      { who: 'jpLuckyCat', col: 15, row: 5, way: 'right', speed: 1, range: 48 },
    ],
  }),

  // C PACHINKO PARLOUR: a pachinko parlour. In by the rope from the street's stairs; out east, low, to the underpass. West a prize counter: a stair of steps up to the shelf with the daruma, behind the
  // claw machine's crusher (crossed on the way in and the way out).
  room({
    id: JP.parlour, cell: [2, 13], sector: 29, palette: PARLOUR_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').clear(20, 0, 22, 1);
      g.box(0, 2, 1, 16, 'W').box(30, 2, 31, 14, 'W');
      g.box(0, 17, 31, 19, 'P');
      g.box(21, 0, 21, 16, 'R');
      g.box(11, 2, 14, 11, 'K'); // the claw machine's housing
      g.box(8, 15, 10, 15, 'L').box(5, 13, 7, 13, 'L').box(2, 11, 4, 11, 'L').box(2, 9, 6, 9, 'L'); // the counter's stair and the prize shelf
    },
    coins: [[22, 14], [6, 7]],
    item: { name: 'daruma', col: 3, row: 7, sprite: JAPAN_SPRITE.daruma },
    decor: [['jpClawMachine', 7, 2], ['jpMachineYellow', 15, 12], ['jpMachineCyan', 18, 12], ['jpMachineRed', 23, 12], ['jpMachineGreen', 26, 12], ['jpMachineCyan', 15, 7], ['jpMachineYellow', 18, 7], ['jpMachineGreen', 23, 7], ['jpMachineRed', 26, 7], ['jpNeonRamen', 24, 3]],
    creatures: [
      { who: 'jpDaruma', col: 15, row: 15, way: 'right', speed: 1, range: 32 },
      { who: 'jpLanternGhost', col: 24, row: 2, way: 'right', speed: 1, range: 32 },
      { who: 'jpLuckyCat', col: 24, row: 15, way: 'right', speed: 1, range: 32 },
    ],
    crushers: [{ col: 12, row: 12, height: 5 }],
  }),

  // D THE CROSSING: the crossing. In from the street low or on the overpass (high). The street runs between the zebra and the crowd to the subway's gap (the rope down to the platform); the overpass runs
  // along over it to the fish food and a rope down to the street east of the gap.
  room({
    id: JP.crossing, cell: [1, 14], sector: 30, palette: CROSSING_PALETTE,
    paint(g) {
      g.box(0, 9, 1, 14, 'O').box(30, 0, 31, 16, 'Q'); // (open sky; a tower runs up the right edge, the crossing's buildings at the left)
      g.box(0, 7, 27, 8, 'S'); // the overpass
      g.box(0, 17, 31, 19, 'A').box(8, 17, 15, 17, 'Z').clear(22, 17, 24, 19).box(23, 16, 23, 19, 'R');
      g.box(29, 7, 29, 16, 'R');
    },
    coins: [[16, 5], [25, 15], [19, 14]],
    item: { name: 'fishFood', col: 24, row: 5, sprite: JAPAN_SPRITE.fishFood },
    decor: [['jpTowerRed', 2, 3], ['jpScreen', 9, 2], ['jpTowerYellow', 17, 2], ['jpTowerCyan', 22, 1], ['jpNeonPink', 25, 3], ['jpTrafficLight', 6, 14], ['jpTrafficLight', 15, 14], ['jpCrowdRed', 2, 15], ['jpCrowdBlue', 17, 15], ['jpHachiko', 26, 14]],
    creatures: [
      { who: 'jpSumo', col: 9, row: 15, way: 'right', speed: 1, range: 72 },
      { who: 'jpDaruma', col: 8, row: 5, way: 'right', speed: 1, range: 64 },
      { who: 'jpKarakasa', col: 21, row: 10, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // E BULLET POINT: the bullet-train platform. Two lanes: the underpass (low; in from the parlour) and the platform over it, joined by two stairs (ropes through the deck). The rope from the crossing lands on the
  // platform. The platform's east end is shut by a roller shutter until the daruma; two trains sweep the platform lane in turn.
  room({
    id: JP.platform, cell: [2, 14], sector: 31, palette: PLATFORM_PALETTE,
    paint(g) {
      g.box(0, 8, 0, 13, 'W').box(14, 0, 31, 0, 'W').clear(22, 0, 24, 0).box(29, 1, 29, 9, 'W'); // (open sky: the line runs through the room's edges; a station pillar at the left, the train goes behind it; a canopy's edge over the rope's top and a gantry post over the gate, so that no one jumps off the rope's top over the gate or out of the room)
      g.box(0, 14, 31, 14, 'W').clear(8, 14, 10, 14).clear(19, 14, 21, 14);
      g.box(0, 17, 31, 19, 'W').box(30, 15, 31, 16, 'W');
      g.box(9, 13, 9, 16, 'R').box(20, 13, 20, 16, 'R').box(23, 0, 23, 13, 'R');
      g.box(29, 10, 29, 13, 'H');
    },
    coins: [[27, 15], [22, 12]],
    decor: [...PLATFORM_DECOR],
  }),

  // F MOUNT FUJI: Mount Fuji's foot and slope. In from the platform past the shutter (mid); the mountain stands over the trail, a snowy cone on a slope of rock (scenery he climbs in front of), and the pilgrim's
  // trail winds up its face in switchbacks: east along the first ledge, up two steps on the flank, back west along the second ledge, up a step to the chain at the left that climbs through the ceiling to the garden.
  room({
    id: JP.fuji, cell: [2, 15], sector: 32, palette: FUJI_PALETTE,
    paint(g) {
      for (let r = 2; r <= 13; r++) { // the cone: a flat crater top, steep, then flaring at its foot at 45 degrees (the classic curve), the snow line, its edges cut on the diagonal
        const hw = [4, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13][r - 2] ?? 13;
        g.box(17 - hw, r, 16 + hw, r, r <= 6 ? 'N' : 'M');
        if (r >= 7) { g.box(16 - hw, r, 16 - hw, r, 'D'); g.box(17 + hw, r, 17 + hw, r, 'Y'); }
      }
      g.box(11, 7, 12, 7, 'N').box(15, 7, 16, 7, 'N').box(20, 7, 21, 7, 'N').box(24, 7, 24, 7, 'N').box(17, 8, 17, 8, 'N'); // the snow's drips below its line
      g.box(0, 0, 3, 1, 'S').box(7, 0, 12, 1, 'S'); // (the rock the chain hangs from)
      g.box(30, 4, 31, 13, 'S').box(29, 8, 29, 13, 'S'); // (open sky; the rock of the mountain's flank closes the right, the line of the platform open at the left)
      g.box(0, 14, 22, 14, 'T').box(23, 14, 31, 14, 'S').box(0, 15, 31, 19, 'S');
      g.box(23, 12, 25, 12, 'T').box(26, 10, 28, 10, 'T'); // the steps
      g.box(10, 8, 26, 8, 'T'); // the second ledge
      g.box(7, 6, 9, 6, 'T'); // the last step
      g.box(5, 0, 5, 5, 'R'); // the chain
    },
    coins: [[17, 12], [24, 10], [12, 6]],
    decor: [['jpSun', 24, 2], ['jpCloud', 7, 3], ['jpCloud', 25, 6]],
    creatures: [
      { who: 'jpTanuki', col: 6, row: 12, way: 'right', speed: 1, range: 40 },
      { who: 'jpCrane', col: 12, row: 4, way: 'right', speed: 1, range: 80 },
    ],
  }),

  // G KOI POLLOI: the temple garden on the mountain's shoulder. In by the chain through the floor at the left; the bank runs right past the temple and the cherry tree to the koi pond: a zig-zag of planks over the
  // water with two koi leaping out of it (once they are fed they are gone and the planks float up). The far bank has the castle gate on the right and a pergola up to a bamboo rope through the ceiling to THE LAST MOLE.
  room({
    id: JP.garden, cell: [1, 15], sector: 33, palette: GARDEN_PALETTE,
    paint(g) {
      g.box(0, 10, 1, 13, 'L').box(0, 9, 1, 9, 'K'); // (open sky; a temple wall with its tiled cap at the left, the castle gatehouse at the right)
      g.box(30, 6, 31, 11, 'L').box(29, 5, 31, 5, 'K');
      g.box(22, 0, 31, 0, 'T').clear(27, 0, 29, 0); // a pergola's beam over the rope's top (no jumping out of the room off it)
      g.box(0, 14, 15, 19, 'M').box(7, 14, 15, 14, 'G').clear(4, 14, 6, 19).box(5, 13, 5, 19, 'R');
      g.box(16, 15, 24, 19, 'W').box(16, 14, 17, 14, 'P'); // the pond and the first plank (the others float up when the koi are fed: PLANK_CELLS)
      g.box(25, 14, 31, 19, 'M');
      g.box(28, 12, 29, 12, 'P').box(25, 10, 27, 10, 'P'); // the pergola
      g.box(28, 0, 28, 9, 'R');
    },
    coins: [[16, 12], [19, 11]],
    decor: [['jpPagoda', 12, 2], ['jpSakura', 6, 8], ['jpTorii', 11, 10], ['jpToro', 26, 11]],
    creatures: [
      { who: 'jpKoi', col: 17, row: 17, way: 'up', speed: 1, range: 56 },
      { who: 'jpKoi', col: 20, row: 10, way: 'down', speed: 1, range: 56 },
      { who: 'jpTanuki', col: 9, row: 12, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // L THE LAST MOLE: hidden, off the garden's pergola. In by the rope through the floor; a moonlit pond crossed on six stepping stones, a bonsai garden on a shelf and a stone dragon behind it, the shrine
  // on its plinth with the ninja hood. A koi leaps out of the water between two stones.
  room({
    id: JP.mole, cell: [0, 15], sector: 34, palette: MOLE_PALETTE,
    paint(g) {
      g.box(30, 10, 31, 13, 'L').box(30, 9, 31, 9, 'K'); // (the night sky open above; a garden wall at the right)
      g.box(0, 14, 2, 19, 'M').box(3, 15, 26, 19, 'W').box(30, 14, 31, 19, 'M').clear(27, 14, 29, 19);
      g.box(28, 13, 28, 19, 'R');
      for (const [c, r] of [[24, 14], [20, 13], [16, 14], [12, 12], [8, 13], [4, 14]] as const) g.box(c, r, c + 1, r, 'S'); // the stones
      g.box(1, 10, 8, 10, 'T'); // the bonsai shelf
    },
    coins: [[14, 10]],
    item: { name: 'hood', col: 1, row: 12, sprite: JAPAN_SPRITE.hood },
    decor: [['jpMoon', 20, 2], ['jpDragon', 10, 4], ['jpShrine', 1, 11], ['jpBonsai', 1, 8], ['jpBonsai', 3, 8], ['jpBonsai', 5, 8], ['jpBonsai', 7, 8]],
    creatures: [
      { who: 'jpKoi', col: 18, row: 17, way: 'up', speed: 2, range: 20 },
      { who: 'jpCrane', col: 22, row: 4, way: 'right', speed: 1, range: 80 },
    ],
  }),

  // H THE CASTLE: the castle's roofs, a dead end. In by the rope from the hall's ceiling; a staircase of tiers' eaves zig-zags up (each overlaps the last, so he jumps up through it); two ninjas pace the
  // middle tiers; the top tier has a sushi between the golden shachi.
  room({
    id: JP.tiers, cell: [0, 16], sector: 35, palette: TIERS_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 16, 'S'); // (the castle's outer rampart at the left; open sky and the grounds running off at the right)
      g.box(8, 10, 27, 16, 'P').box(10, 6, 25, 9, 'P').box(16, 2, 21, 4, 'P').box(8, 15, 27, 16, 'B'); // the keep behind the eaves: a white plaster tower of three tiers on its stone base
      for (const [c, r] of [[12, 7], [16, 7], [20, 7], [24, 7], [18, 3], [12, 11], [18, 11], [24, 11], [12, 14], [24, 14]] as const) g.box(c, r, c, r, 'N');
      g.box(0, 17, 31, 19, 'M').clear(3, 17, 5, 19).box(4, 16, 4, 19, 'R');
      g.box(8, 15, 17, 15, 'E').box(14, 13, 23, 13, 'E').box(20, 11, 29, 11, 'E').box(14, 9, 23, 9, 'E').box(8, 7, 17, 7, 'E').box(14, 5, 23, 5, 'E');
    },
    coins: [[12, 13], [26, 9], [10, 5]],
    item: { name: 'sushi2', col: 18, row: 3, sprite: JAPAN_SPRITE.sushi },
    decor: [['jpCloud', 4, 2], ['jpSun', 26, 2], ['jpShachi', 14, 3], ['jpShachi', 22, 3], ['jpBanner', 2, 12], ['jpHedge', 5, 16], ['jpPineBig', 28, 13]],
    creatures: [
      { who: 'jpNinja', col: 15, row: 11, way: 'right', speed: 1, range: 32 },
      { who: 'jpNinja', col: 24, row: 9, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // I THE SHOGUN'S HALL: inside the castle, the gate hall. In from the garden's gate (mid); two ways on: the floor, through three pairs of paper doors that open and shut in turn, or the gallery over the first
  // two (up the rope at the left, along the eaves through holes in the partitions, down at its end into the space before the third door, with a coin on it and the lantern ghost bobbing over it). At the far end a low corridor
  // where the guard paces, so no one can pass him (the ninja hood sends him off) to the floor gap and the rope down to the port. The rope's top goes on to the roofs.
  room({
    id: JP.hall, cell: [1, 16], sector: 36, palette: HALL_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'T').clear(3, 0, 5, 1);
      g.box(0, 2, 1, 11, 'S');
      g.box(0, 14, 23, 14, 'A').box(0, 15, 31, 19, 'T').clear(24, 14, 26, 19).box(27, 2, 31, 14, 'T');
      for (const c of DOORS.cols) g.box(c, 2, c + 1, 10, 'S').box(c, DOORS.row, c + 1, DOORS.row + DOORS.rows - 1, 'O'); // the partitions and the doorways
      for (const c of DOORS.cols.slice(0, 2)) g.clear(c, 5, c + 1, 7).box(c, 8, c + 1, 8, 'E'); // the first two have a hole through them for the gallery
      g.box(5, 8, 14, 8, 'E'); // the gallery's eaves (they end at col 14: the three cells before the third door are the way down)
      g.box(20, 2, 26, 11, 'T'); // the corridor's low ceiling
      g.box(4, 0, 4, 13, 'R').box(25, 13, 25, 19, 'R');
    },
    coins: [[13, 6]],
    decor: [['jpScroll', 9, 5], ['jpScroll', 15, 5], ['jpScroll', 2, 5], ['jpLantern', 10, 2], ['jpLantern', 16, 2], ['jpAndon', 9, 11], ['jpAndon', 15, 11]],
    creatures: [
      { who: 'jpSamurai', col: 20, row: 12, way: 'right', speed: 1, range: 16 },
      { who: 'jpLanternGhost', col: 9, row: 4, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // J SAYONARA SAILOR: the port, the way out. In by the rope from the hall; a quay (a sumo dockworker and a crab on it) and the container stair at the west end with a coin; at the east the cargo ship moored at the quay's end: its
  // hull with its portholes standing in the water, a foremast with its pennant, and the gangway of two steps up to the deck, whose way east is shut with crates and a sign until the Pacific is built.
  room({
    id: JP.port, cell: [2, 16], sector: 37, palette: PORT_PALETTE,
    paint(g) {
      g.box(0, 14, 2, 16, 'C').box(0, 11, 2, 13, 'D').box(0, 8, 2, 10, 'C').box(0, 5, 2, 7, 'D'); // (open sky; a stack of four containers closes the left, the ship goes on off the right)
      g.box(18, 0, 31, 0, 'S').clear(24, 0, 26, 0); // the gantry's girder over the rope's top
      g.box(0, 17, 27, 19, 'S');
      g.box(25, 0, 25, 16, 'R');
      g.box(9, 15, 11, 16, 'C').box(6, 13, 8, 16, 'C').box(3, 11, 5, 16, 'C'); // the container stair, up to the west
      g.box(26, 15, 27, 15, 'K'); // the gangway's step
      g.box(28, 18, 31, 19, 'W'); // the water at the ship's side
      g.box(28, 14, 31, 17, 'H').box(29, 15, 29, 15, 'P').box(31, 15, 31, 15, 'P'); // the ship's hull with its portholes, afloat
      g.box(28, 13, 31, 13, 'K'); // the deck
    },
    coins: [[4, 9], [23, 15]],
    decor: [['jpCloud', 5, 2], ['jpGulls', 16, 3], ['jpGulls', 22, 6], ['jpGantry', 13, 11], ['jpShipBridge', 28, 6]],
    creatures: [
      { who: 'jpSumo', col: 12, row: 15, way: 'right', speed: 1, range: 40 },
      { who: 'jpKappa', col: 18, row: 15, way: 'right', speed: 1, range: 24 },
    ],
  }),
];
