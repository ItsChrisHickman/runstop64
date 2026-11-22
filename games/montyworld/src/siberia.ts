import type { CharAnim, CrackSpec, DragonSpec, FloatSpec, IcicleSpec, PulseSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { YETI_COLOUR } from './art/siberia-yeti';
import { codeOf, decorIndex, Grid, room, type Palette } from './layout';
import { type Placed, buffersAt, CAR, farWall, gangwayAt, hatch, skyAnims, skyDecor, type SkySpec, TRAIN_PALETTE, trainAnims, undercarriage, underCar, windowAt } from './train';

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

/** The sprite pointers (in the bank) of Siberia's items and the yeti's four pieces (the first two are the head, the others the legs, one picture each way: the legs swap to step). */
export const SIB_SPRITE = { lamp: 0xc1, ticket: 0xc2, pelmeni: 0xc3 } as const;

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

/** The bogies of a car's rooms (the wheels' first columns: each bogie two wheels, an axle bar between). */
const BOGIES = [4, 25] as const;

/**
 * A passenger car (train.ts): the roof's walkway at row 9 with its curved edge under it and the hatches (a gap of three with a rope each), the
 * car's two ends, shut but for the gangway at an end that joins the next car, the floor. The sky above is open: the tunnels sweep it.
 */
function carriage(g: Grid, hatches: readonly number[], gangways: { left: boolean; right: boolean }) {
  g.box(0, CAR.roof, 31, CAR.roof, 'D');
  farWall(g, 2, 29);
  g.box(0, 10, 1, 16, 'T').box(30, 10, 31, 16, 'T');
  if (gangways.left) g.clear(0, CAR.gangwayTop, 1, CAR.gangwayBottom);
  if (gangways.right) g.clear(30, CAR.gangwayTop, 31, CAR.gangwayBottom);
  undercarriage(g, 0, 31);
  for (const h of hatches) hatch(g, h);
}

/**
 * The coal tender's rooms (the locomotive is at their east end): the passenger car's roof, floor and ladder, a trough of coal heaped in steps, the wagon's boards behind it
 * (brown planks), the cab's green sides, the boiler's plates and the mine's rock overhanging the rope.
 */
const TENDER_PALETTE = {
  D: ['roofDeck', 14], K: ['coal', 11], F: ['carFloor', 9], T: ['trainSide', 5], B: ['boilerPlate', 5], E: ['carWall', 9], M: ['mineRock', 9], R: ['ironLadder', 7],
} as const satisfies Palette;
const TENDER_BOGIES = [4, 12] as const;

/** What goes on every car's roof and under it: the buffers at each end, the rail and the bogies' wheels. */
const CAR_FITTINGS = [...underCar(0, 31, BOGIES), ...buffersAt(0, 31)] as const;

// ---- the tunnels, ice and cart ------------------------------------------------------------------------

/** The portal's granite and the mountain's rock, in the train rooms' palette. */
const PORTAL = codeOf(TRAIN_PALETTE, 'X'), ROCK = codeOf(TRAIN_PALETTE, 'M');
/** How many cells long the mountain is (more than the room is wide: it runs off the screen's edge as it comes in and as it goes). */
const MASS = 34;
/**
 * The mountain the line goes into, seen from the side as the room has it, rows 2 to 8 (the roof's walkway is row 9: what stands on it is inside the rock): a long mass of rock whose top
 * slopes up from the portal and runs on, the stone portal at its leading end (two courses of granite for a pier, a cap above them) and, at its far end, the portal the train comes out of.
 */
export const MOUNTAIN: readonly (readonly number[])[] = Array.from({ length: 7 }, (_, r) => Array.from({ length: MASS }, (_, c) => {
  const row = 2 + r, edge = Math.min(c, MASS - 1 - c);
  if (edge <= 1 && row >= 4) return PORTAL;
  if (edge <= 2 && row === 3) return PORTAL;
  return edge >= 2 && row >= (edge < 8 ? 3 : 2) ? ROCK : 0;
}));
/**
 * The tunnel mountain: in the dining car's roof and the sleeper's, from the front of the train (the right: the train runs east, the scenery goes west, so the tunnels come the way the train goes,
 * never from behind). The same pace as before: a wait, a warning of the portal flashing at the entry, then it comes a cell every ten frames; what is on the roof or up the tree when it reaches him is lost, what
 * is under the roof (a hatch's ladder, the car) is safe.
 */
const MOUTH = { code: PORTAL, cols: MASS, top: 2, bottom: 8, step: 10, rest: 130, warn: 48, picture: MOUNTAIN, coversClimbs: true } as const;
export const TUNNELS: readonly TunnelSpec[] = [
  { room: SIB.gravy, from: 'right', offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'right', offset: 40, ...MOUTH },
];

const LAKE_PALETTE = {
  S: ['snowGround', 1], K: ['mineRock', 9], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6], R: ['rope', 13],
} as const satisfies Palette;
const ICE = { row: 12, codes: [codeOf(LAKE_PALETTE, 'I'), codeOf(LAKE_PALETTE, 'J'), codeOf(LAKE_PALETTE, 'H')], crack: 56, wide: 88, gone: 120, away: 240 } as const;
/**
 * The lake's two patches of ice: six cells each. His two-cell body is over a patch for about 56 frames when he walks across without stopping
 * (measured: 71 frames over 8 cells, the patch showing its lines as he leaves), so crossing at his walk is safe by a hair and waiting is not.
 */
export const CRACKS: readonly CrackSpec[] = [
  { room: SIB.lake, col: 16, cols: 6, ...ICE }, { room: SIB.lake, col: 7, cols: 6, ...ICE },
];

/** What moves in the train's rooms: the dining car's and the sleeper's windows and the tender's rail and wheels (train.ts), and the sky above them. */
export const TRAIN_ANIMS: readonly CharAnim[] = [
  ...trainAnims(SIB.gravy, true), ...trainAnims(SIB.sleeper, true), ...trainAnims(SIB.coal, false),
  ...skyAnims(SIB.gravy, true), ...skyAnims(SIB.sleeper, false), ...skyAnims(SIB.coal, true),
];

/**
 * The night sky above each train room (train.ts, art/siberia-sky.ts): the moon and stars up top, smoke from the locomotive drifting over the cars (thickest
 * at the tender, where the chimney is), poles and wires and the horizon above the roof. The spans keep clear of the room's tiles: the sleeper's tree (columns 22-23)
 * and its banks, the tender's rope (column 24) and the locomotive (columns 19-31).
 */
const SKY_GRAVY: SkySpec = {
  spans: [[-2, 33]], smoke: [[-2, 33]], moon: [25, 0],
  stars: [['star', 4, 0], ['starDim', 9, 1], ['star', 14, 0], ['starDim', 19, 1], ['starDim', 2, 1], ['star', 30, 1], ['starDim', 12, 1]],
};
const SKY_SLEEPER: SkySpec = {
  spans: [[6, 21], [24, 25]], moon: [9, 0],
  stars: [['star', 14, 0], ['starDim', 7, 1], ['starDim', 12, 1], ['star', 18, 1], ['starDim', 27, 0]],
};
const SKY_TENDER: SkySpec = {
  spans: [[-2, 7], [9, 17]], horizon: [[-2, 7], [9, 17]], smoke: [[-2, 17]], moon: [10, 2],
  stars: [['star', 3, 2], ['starDim', 6, 3], ['starDim', 1, 3], ['star', 12, 3]],
};

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

const FOREST_PALETTE = {
  S: ['snowGround', 1], F: ['snowFill', 1], B: ['pineBark', 9], H: ['snowBough', 5], P: ['pineTrunk', 9], U: ['snowDust', 1], N: ['snowLump', 1],
} as const satisfies Palette;
const YETI_PALETTE = {
  K: ['mineRock', 14], S: ['snowGround', 1], F: ['snowFill', 1], L: ['snowLedge', 3], I: ['iceFall', 3], C: ['iceCurtain', 3],
} as const satisfies Palette;
const MINE_PALETTE = {
  K: ['mineRock', 9], Q: ['coalSeam', 6], B: ['timber', 8], R: ['rope', 13], W: ['lakeWater', 6], C: ['cartDeck', 8],
} as const satisfies Palette;

/**
 * The snow that slides off the forest's boughs: two falls, each a lump coming down the three stretches from a bough to the ground (the top one's flakes tremble first: the warning;
 * the next two follow at once, so the lump falls), harmless at rest. Strikes on the ground lane where it can hurt him.
 */
const FALL = { period: 260, warn: 40, idle: 0, spent: 0 } as const;
const snowFall = (col: number, offset: number): PulseSpec[] => [[8, 0, 40, 10], [11, 50, 1, 10], [14, 60, 1, 14]].map(([row, start, warn, live]): PulseSpec => ({
  room: SIB.pines, col, row: row ?? 0, cols: 2, rows: 3, period: FALL.period, start: start ?? 0, warn: warn ?? 1, live: live ?? 10, offset,
  idle: FALL.idle, warnCode: codeOf(FOREST_PALETTE, 'U'), liveCode: codeOf(FOREST_PALETTE, 'N'), spent: FALL.spent,
}));
export const SIBERIA_PULSES: readonly PulseSpec[] = [...snowFall(10, 0), ...snowFall(16, 130)];

/** The icicle over the high stash in the yeti's cave. */
export const SIBERIA_ICICLES: readonly IcicleSpec[] = [{ room: SIB.yeti, col: 8, row: 2, floor: 5 }];

/**
 * The mine cart: a float that shuttles over the flooded working, its bed (the room's `cartDeck` tile) a floor he stands on and is carried by, the piece over it the cart's wall and
 * its load. It rests at each end (the docks at the working's edges) and crosses in about 50 frames; starts resting at the east dock, where he comes down the rope.
 */
export const CART = { row: 18, span: { from: 5, to: 16 }, w: 4, step: 6, hold: 14 } as const;
export const MINE_CART: FloatSpec = {
  room: SIB.mine, row: CART.row, span: CART.span, dir: 1, step: CART.step, every: 0, w: CART.w, offset: CART.span.to - CART.span.from + 1 - CART.w,
  deck: codeOf(MINE_PALETTE, 'C'), decor: decorIndex('mineCart'), h: 1, home: [CART.span.from, CART.row - 1], bounce: { hold: CART.hold },
};

/** The yeti's pictures in the bank (the top two, then the two strides of the bottom two): the first two are the dragon's old bodies' neighbours in the free blocks. */
export const YETI_POINTERS = { topLeft: 0xc4, topRight: 0xc5, bottomLeft: [0xb0, 0xb2], bottomRight: [0xb1, 0xb3] } as const;
/**
 * The yeti: four sprites moving as one (a rigid dragon, dragons.ts) round a closed loop in the cave: west along the floor, up the left side, east along the ice bridge, down the right (its
 * top left corner in playfield cells; it is 6 cells wide and 5.25 tall, standing on the floor (row 17) or the bridge (row 9)). It never turns: a figure seen from the front. The sprites
 * 4, 5, 6 and 2 (0 is the pelmeni's, 1 the icicle's, 3 Monty's, 7 his hat's).
 */
export const YETI: DragonSpec = {
  room: SIB.yeti, speed: 0.8, gap: 0,
  path: [[18, 11.75], [14, 11.75], [10, 11.75], [8.7, 7.75], [10, 3.75], [14, 3.75], [18, 3.75], [19.3, 7.75]],
  pieces: [
    { sprite: 4, colour: YETI_COLOUR, frames: [YETI_POINTERS.topLeft, YETI_POINTERS.topLeft], rigid: [0, 0], facing: 'front' },
    { sprite: 5, colour: YETI_COLOUR, frames: [YETI_POINTERS.topRight, YETI_POINTERS.topRight], rigid: [24, 0], facing: 'front' },
    { sprite: 6, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomLeft, rigid: [0, 21], facing: 'front' },
    { sprite: 2, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomRight, rigid: [24, 21], facing: 'front' },
  ],
};

/** The sleeper's palette: the passenger car's, with the pine's trunk (the eighth code). */
const SLEEPER_PALETTE = { ...TRAIN_PALETTE, P: ['pineTrunk', 9] } as const satisfies Palette;

/** The banks of the cutting the sleeper runs through: the mountain's rock sloping up at both ends, under the pines of the wooded slope above (a picture behind him: he walks through). */
function cutting(g: Grid) {
  for (let c = 0; c < 6; c++) {
    g.box(c, 3 + (c >> 1), c, 8, 'M');
    g.box(31 - c, 3 + (c >> 1), 31 - c, 8, 'M');
  }
}

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
      ...skyDecor(SKY_GRAVY), windowAt(3), windowAt(15), ['carLamp', 9, 11], ['carLamp', 21, 11], ['diningTable', 14, 15], ['diningTable', 19, 15], ['diningSamovar', 22, 14],
      [{ text: 'RESTAURANT', colour: 7 }, 13, 10], gangwayAt(30), ['roofVent', 4, 8], ['stovepipe', 19, 6], ['roofVent', 28, 8], ...CAR_FITTINGS,
    ],
    creatures: [{ who: 'inspector', col: 14, row: 15, way: 'right', speed: 1, range: 56, colour: 1 }],
  }),

  // B SLEEPER HIT: the sleeper, in a cutting. The roof again, one mountain from the front; two hatches into the corridor of berths (an
  // inspector going up and down the first ladder, a coin each end), a gangway at each end to the cars either side. The banks of the cutting rise at both ends under pines;
  // at columns 22-23 a big pine's trunk climbs out of the line side, a bough hanging over the roof: up the tree to the forest.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: SLEEPER_PALETTE,
    paint(g) {
      carriage(g, [7, 15], { left: true, right: true });
      cutting(g);
      g.box(22, 0, 23, 8, 'P'); // the pine's trunk up through the sky to the forest
    },
    coins: [[3, 15], [27, 15]],
    decor: [
      ...skyDecor(SKY_SLEEPER), ['pineBough', 17, 0], ['pineBough', 24, 0], ['pineBough', 17, 5], windowAt(9), windowAt(17), windowAt(24), ['bunk', 10, 15], ['bunk', 20, 15], gangwayAt(0), gangwayAt(30),
      ['pineSmall', 0, 0], ['pineSmall', 2, 1], ['pineSmall', 28, 1], ['pineSmall', 30, 0], ['roofVent', 8, 8], ['roofVent', 24, 8], ...CAR_FITTINGS,
    ],
    creatures: [{ who: 'inspector', col: 6, row: 10, way: 'down', speed: 1, range: 24, colour: 1 }],
  }),

  // C COAL COMFORT: the coal tender behind the locomotive. In from the roof along the rim; a hatch down to the pocket under it (the gangway from the sleeper's corridor comes in
  // at its left); the open wagon's coal heaped in steps down to the trough (the stoker paces it) and up again to the locomotive's cab (its roof, a window, a gauge and the firebox
  // door in its back plate; the boiler, the chimney with its smoke and the big driving wheels beyond and under it), where the ticket lies; a rope from the cab's roof climbs
  // through the mine's loading shelf into the mine.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11, palette: TENDER_PALETTE,
    paint(g) {
      g.box(17, 0, 31, 1, 'M').clear(23, 0, 25, 1).box(24, 0, 24, 9, 'R'); // the mine's loading shelf overhanging the rope's way up; the rest open sky
      g.box(0, 10, 1, 14, 'T'); // the wagon's end (its gangway open below)
      g.box(2, 10, 16, 14, 'E'); // the wagon's boards behind the coal
      g.box(0, 9, 5, 9, 'D').clear(1, 9, 3, 9).box(2, 9, 2, 16, 'R'); // the rim, with its hatch and rope
      g.box(6, 12, 8, 16, 'K').box(9, 14, 10, 16, 'K').box(11, 16, 14, 16, 'K').box(15, 14, 16, 16, 'K').box(17, 12, 18, 16, 'K'); // the coal in steps: down to the trough and up again
      g.box(17, 10, 26, 10, 'D').box(19, 11, 25, 16, 'T'); // the cab (its roof the heap's last step) and its back plate
      g.box(26, 11, 31, 16, 'B'); // the boiler
      g.clear(21, 12, 22, 13).clear(21, 14, 22, 15).clear(24, 12, 25, 13); // the holes the window, the firebox door and the gauge show in
      g.box(0, CAR.floor, 18, CAR.floor, 'F'); // the wagon's floor (the locomotive has none: its wheels stand under it)
    },
    coins: [[16, 11]],
    item: { name: 'ticket', col: 20, row: 8, sprite: SIB_SPRITE.ticket },
    decor: [
      ...skyDecor(SKY_TENDER), ['chimney', 29, 9], ['smoke', 26, 7], ['coalBucket', 3, 15], gangwayAt(0), ['cabWindow', 21, 12], ['cabFire', 21, 14], ['cabGauge', 24, 12],
      ...underCar(0, 31, TENDER_BOGIES), ['drivingWheel', 19, 17], ['drivingWheel', 23, 17], ['drivingWheel', 27, 17],
    ],
    creatures: [{ who: 'miner', col: 11, row: 14, way: 'right', speed: 1, range: 16, colour: 7 }],
  }),

  // F PINE TO BE WILD: the forest. Up from the sleeper by the pine's trunk onto the ground; west past the wolf (and the snow that slides off the boughs: two falls, each warned by
  // the bough's dust) to the yeti's hollow; east a trunk, and a second great pine at the right to climb up to the boughs, out east, high, an owl diving across them.
  room({
    id: SIB.pines, cell: [0, 5], sector: 12, palette: FOREST_PALETTE,
    paint(g) {
      // the open forest: sky above, great trunks running up off the top at the edges, shut but for the ground's way and the boughs'
      g.box(0, 0, 1, 13, 'B').box(30, 0, 31, 3, 'B').box(30, 8, 31, 16, 'B');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F').clear(21, 17, 24, 19).box(22, 15, 23, 19, 'P'); // the ground, the gap and the sleeper's pine coming up through it
      g.box(11, 15, 13, 16, 'S'); // a drift to jump
      g.box(4, 7, 25, 7, 'H').box(29, 7, 31, 7, 'H').clear(26, 7, 28, 7).box(27, 7, 28, 16, 'P'); // the boughs, a great pine up to them
    },
    coins: [[14, 5], [17, 15]],
    decor: [['pineTall', 3, 11], ['pineTall', 24, 11], ['pineSmall', 8, 14], ['pineSmall', 19, 14]],
    creatures: [
      { who: 'wolf', col: 3, row: 15, way: 'right', speed: 2, range: 24 },
      { who: 'owl', col: 18, row: 3, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // O YETI OR NOT: a dead end under a frozen waterfall. In from the forest's ground at the right; the yeti prowls a loop (along the floor to the left, up the cave's left side, back along
  // the ice bridge, down the right): the floor is clear while it is on the bridge, the bridge while it is on the floor. A stair of ledges at the right up to the bridge, another at the left
  // down from it; the waterfall's foot at the left, a fringe of icicles hanging over the pelmeni behind it; ice ledges up its face to a high stash, an icicle hanging over it.
  room({
    id: SIB.yeti, cell: [0, 4], sector: 13, palette: YETI_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'K').box(0, 2, 1, 16, 'K').box(30, 2, 31, 13, 'K');
      g.box(2, 2, 5, 2, 'K').box(12, 2, 15, 2, 'K').box(20, 2, 24, 2, 'K'); // the cave's roof, ragged
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(2, 2, 4, 12, 'I').box(2, 13, 4, 16, 'C'); // the frozen waterfall, and the fringe of icicles over its foot
      g.box(27, 15, 29, 15, 'L').box(26, 13, 28, 13, 'L').box(27, 11, 29, 11, 'L'); // the stair at the right up to the bridge
      g.box(5, 9, 29, 9, 'L'); // the ice bridge
      g.box(6, 15, 8, 15, 'L').box(5, 13, 7, 13, 'L').box(6, 11, 8, 11, 'L'); // the stair at the left down from it
      g.box(6, 7, 8, 7, 'L').box(5, 5, 7, 5, 'L'); // the ice ledges up the waterfall's face to the high stash
    },
    coins: [[6, 3]],
    item: { name: 'pelmeni2', col: 3, row: 15, sprite: SIB_SPRITE.pelmeni },
    decor: [['stalactites', 7, 2], ['stalactites', 17, 2], ['stalactites', 26, 2]],
  }),

  // M MINE ALL MINE: the mine's mouth, lit. In by the gantry; the rope at its end down to the gallery; to the left a flooded working too wide to jump, a track
  // across it and a cart that shuttles over it, to the pocket with the lamp on the far side (there and back: it carries him both ways); right the way on to the shaft; timber
  // ledges up to a shelf with a coin. The tender's rope climbs through the gallery's floor.
  room({
    id: SIB.mine, cell: [0, 6], sector: 14, palette: MINE_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 2, 'K').box(0, 3, 1, 3, 'K').box(0, 8, 1, 17, 'K').box(30, 3, 31, 14, 'K');
      g.box(16, 3, 20, 4, 'K').box(26, 3, 29, 5, 'K').box(6, 3, 9, 3, 'K'); // rock hanging from the roof
      g.box(17, 4, 19, 4, 'Q').box(27, 4, 28, 4, 'Q').box(30, 8, 31, 11, 'Q'); // a seam of coal
      g.box(0, 7, 16, 7, 'B').box(18, 7, 18, 17, 'R'); // the gantry, and the rope in its gap
      g.box(0, 18, 31, 19, 'K').clear(5, 18, 16, 19).box(5, 19, 16, 19, 'W'); // the gallery's floor, the flooded working
      g.clear(23, 18, 25, 19).box(24, 17, 24, 19, 'R'); // the gap and the tender's rope
      g.box(27, 16, 29, 16, 'B').box(24, 14, 26, 14, 'B').box(27, 12, 29, 12, 'B'); // timber ledges up to the shelf
    },
    coins: [[28, 10]],
    item: { name: 'lamp', col: 3, row: 16, sprite: SIB_SPRITE.lamp },
    decor: [
      ['minePortal', 0, 0], ['stalactites', 11, 3], ['stalactites', 26, 6], ['pitProp', 20, 15], ['coalBucket', 21, 16],
      ...Array.from({ length: 12 }, (_, i): Placed => ['rail', 5 + i, 18]), ['mineCart', CART.span.from, CART.row - 1],
    ],
    creatures: [
      { who: 'bat', col: 10, row: 12, way: 'down', speed: 1, range: 28 },
      { who: 'bat', col: 16, row: 11, way: 'right', speed: 1, range: 32 },
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
      { who: 'bat', col: 23, row: 11, way: 'down', speed: 1, range: 24 },
    ],
  }),

  // L BAIKAL TO BASICS: the lake. In at the right on the shore by the rope from the shaft; the ice westward in two patches of six either side of a
  // rock island, each cracking if he stands on it too long, a seal on the first and an owl diving over the island; the left shore's gap and its rope go
  // down to the village.
  room({
    id: SIB.lake, cell: [1, 7], sector: 16, palette: LAKE_PALETTE,
    paint(g) {
      g.box(28, 0, 28, 11, 'R'); // the shaft above, and its rope
      g.box(18, 0, 26, 0, 'K').box(20, 1, 25, 1, 'K').box(30, 0, 31, 11, 'K'); // the shaft's rock overhanging the rope's way up
      g.box(0, 4, 1, 11, 'K').box(2, 8, 3, 11, 'K'); // the headlands either side, open sky over the lake
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
      { who: 'owl', col: 14, row: 3, way: 'down', speed: 1, range: 36 },
    ],
  }),

  // G BORDER LINE CASE: the village. Down the rope onto the snow; cabins, a woodpile to climb with a wolf pacing its top, a reindeer on the snow; the barrier at
  // the right (the ticket lifts it) and beyond it the way east, to China.
  room({
    id: SIB.border, cell: [2, 7], sector: 17,
    palette: { S: ['snowGround', 1], F: ['snowFill', 1], L: ['logWall', 9], B: ['barrier', 2], R: ['rope', 13] },
    paint(g) {
      g.box(5, 0, 5, 16, 'R'); // the rope from the lake
      g.box(0, 0, 3, 0, 'F').box(7, 0, 13, 0, 'F').box(8, 1, 12, 1, 'F'); // the lake shore's snowy overhang above the rope; the rest open sky
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F');
      g.box(11, 15, 13, 16, 'L').box(14, 13, 17, 16, 'L'); // the woodpile
      g.box(28, 13, 29, 16, 'B'); // the barrier
    },
    coins: [[12, 13], [24, 15]],
    decor: [['cabin', 6, 13], ['cabin', 19, 13], [{ text: 'ROAD TO CHINA', colour: 7 }, 9, 6], ['pole', 26, 13], ['pineSmall', 2, 14]],
    creatures: [
      { who: 'reindeer', col: 19, row: 15, way: 'right', speed: 1, range: 32 },
      { who: 'wolf', col: 14, row: 11, way: 'right', speed: 1, range: 16 },
    ],
  }),
];
