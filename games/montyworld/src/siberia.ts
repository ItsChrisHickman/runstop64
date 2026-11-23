import type { CharAnim, CrackSpec, DragonSpec, FloatSpec, IcicleSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { YETI_COLOUR } from './art/siberia-yeti';
import { codeOf, decorIndex, Grid, room, type Palette } from './layout';
import { type Placed, buffersAt, CAR, farWall, hatch, skyAnims, skyDecor, type SkySpec, TRAIN_PALETTE, trainAnims, underCar, windowAt } from './train';

/**
 * Siberia, the second region of Do Svidaniya Monty: the Trans-Siberian and the way off it to the Chinese border (docs/dosvidaniya-reset.md, "Siberia (the
 * Trans-Siberian)"). Six rooms at columns 4-7 of the exit grid, entered from Moscow's carriage roof (room I, column 3) and left east into China's wall.
 *
 *            col 4              col 5               col 6               col 7
 *   row 0      .              Y  YETI OR NOT          .                   .
 *   row 1   A  GRAVY TRAIN    B  SLEEPER HIT      C  COAL COMFORT     M  MINE ALL MINE
 *   row 2      .                 .                    .               G  BORDER LINE CASE
 *
 * Playfield cells as in moscow.ts. The puzzle is the train: "the way under the sleeper starts in the dining car". The train is two lanes, the roof and the cars'
 * insides, and they meet only through the dining car's hatches. The roof ends at the tender's coal (B's east end); the corridor under it is shut by the inspector
 * in the sleeper's far gangway, who wants a ticket; the ticket is off the train, up the pine from the sleeper's roof (under the mountain, sheltering once in the
 * luggage closet), in the yeti's cave. With it: back along the roof, down a hatch in the dining car, through the open gangway into the sleeper's corridor, past
 * the inspector, up the tender's coal to the tipple, through the mine's hairpin (the gantry east, the cart west) and across the frozen Amur to China.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids go on from Moscow's (0-8); China's start at 18 and never move. The reset cut three of Siberia's nine rooms (12, 15 and 16: the forest, the dark
 * shaft and the lake); their ids are retired, not reused (the tables are by id: buildRooms leaves the gaps), so nothing after them moves.
 */
export const SIB = { gravy: 9, sleeper: 10, coal: 11, yeti: 13, mine: 14, border: 17 } as const;

/** The sprite pointers (in the bank) of Siberia's items. */
export const SIB_SPRITE = { ticket: 0xc2, pelmeni: 0xc3 } as const;

/**
 * The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 9 on (Moscow's are 0-8). The sectors of the retired rooms keep their places
 * (China's sectors are 18 on); no room shows them.
 */
const NAMES = [
  'THE GRAVY TRAIN', 'SLEEPER HIT', 'COAL COMFORT', 'PINE TO BE WILD', 'YETI OR NOT', 'MINE ALL MINE', 'SHAFT OF DARKNESS',
  'BAIKAL TO BASICS', 'BORDER LINE CASE',
] as const;
export const SIBERIA_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the train green, the cave light blue, the mine grey, the river white; the retired ones' as they were). */
export const SIBERIA_COLOURS: readonly number[] = [5, 5, 12, 13, 15, 12, 11, 14, 1];
/** Where Siberia's sectors begin in the world's list. */
export const FIRST_SECTOR = 9;

// ---- the train ------------------------------------------------------------------------------------------

/** The bogies of a car's rooms (the wheels' first columns: each bogie two wheels, an axle bar between). */
const BOGIES = [4, 25] as const;
/** What goes under every car: the buffers at each end, the rail and the bogies' wheels. */
const CAR_FITTINGS = [...underCar(0, 31, BOGIES), ...buffersAt(0, 31)] as const;

/** The dining car's palette: the passenger car's, its far wall one dark brown (calm behind where he plays). */
const GRAVY_PALETTE = { ...TRAIN_PALETTE, E: ['carWall', 9] } as const satisfies Palette;

/**
 * The sleeper's palette: the passenger car's with the floor's code given to the tender's coal (its bunker ends the roof), the floor drawn in the car's maroon side,
 * and the pine's trunk the eighth. The tunnel's granite and rock keep their codes (5 and 7: the mountain's picture is drawn in them).
 */
const SLEEPER_PALETTE = {
  D: ['roofDeck', 14], E: ['carWall', 9], K: ['coal', 11], T: ['trainSide', 2], X: ['tunnelFace', 15], R: ['ironLadder', 7], M: ['tunnelRock', 9], P: ['pineTrunk', 9],
} as const satisfies Palette;

/**
 * The tender and the locomotive: the coal (the bunker at the front, the heap in steps, the wagon's floor under it), the cab's roof, its back plate and the
 * wagon's end in green, the boiler, the wagon's boards and the tipple's legs (a dark picture behind), the tipple's timber deck, its ladder and the hill's rock.
 */
const TENDER_PALETTE = {
  D: ['roofDeck', 14], K: ['coal', 11], T: ['trainSide', 5], B: ['boilerPlate', 5], E: ['carWall', 9], W: ['timber', 8], R: ['ironLadder', 7], M: ['mineRock', 9],
} as const satisfies Palette;
const TENDER_BOGIES = [4, 12] as const;

/** The roof's walkway, the far wall behind, the car's two ends (their gangways below), the floor in `floor`, the hatches. */
function carriage(g: Grid, hatches: readonly number[], floor = 'F') {
  g.box(0, CAR.roof, 31, CAR.roof, 'D');
  farWall(g, 2, 29);
  g.box(0, 10, 1, 14, 'T').box(30, 10, 31, 14, 'T');
  g.box(0, CAR.floor, 31, CAR.floor, floor);
  for (const h of hatches) hatch(g, h);
}

/**
 * The gangways an inspector keeps shut until he has seen the ticket: the sleeper's far one, where he stands, and the tender's side of it. One cell in from the
 * room's edge (a room's way out stays open), rows 15-16: a wall until the ticket.
 */
export const GANGWAYS: readonly { readonly room: number; readonly cols: readonly [number, number] }[] = [
  { room: SIB.sleeper, cols: [30, 30] }, { room: SIB.coal, cols: [1, 1] },
];
/** The inspector's slot in the sleeper's creatures (the second: the provodnitsa is the first); the ticket sends him off. */
export const INSPECTOR_SLOT = 1;

/** Shut the gangways of a room. */
function inspectors(g: Grid, room: number) {
  for (const w of GANGWAYS) if (w.room === room) g.box(w.cols[0], CAR.gangwayTop, w.cols[1], CAR.gangwayBottom, 'T');
}

/** The luggage closet under the sleeper's one hatch: a ladder well three wide (columns 9-11) down to its floor at row 13, walled at 8 and 12. Sealed from the corridor under it. */
export const CLOSET = { hatch: 10, floor: 13, left: 8, right: 12 } as const;
function closet(g: Grid) {
  g.clear(CLOSET.hatch - 1, CAR.roof, CLOSET.hatch + 1, CAR.roof).box(CLOSET.hatch, CAR.roof, CLOSET.hatch, CLOSET.floor - 1, 'R');
  g.box(CLOSET.left, CAR.roof + 1, CLOSET.left, CLOSET.floor, 'T').box(CLOSET.right, CAR.roof + 1, CLOSET.right, CLOSET.floor, 'T').box(CLOSET.left, CLOSET.floor, CLOSET.right, CLOSET.floor, 'T');
}

/** The banks of the cutting the sleeper runs through: the hillside's rock sloping up at both ends (a picture behind him: he walks through). */
function cutting(g: Grid) {
  for (let c = 0; c < 6; c++) {
    g.box(c, 3 + (c >> 1), c, 8, 'M');
    if (31 - c < 30) g.box(31 - c, 3 + (c >> 1), 31 - c, 8, 'M');
  }
}

/** The pine by the line: its trunk at columns 20-21, from the sleeper's roof up through its sky into the yeti's cave. */
export const PINE = { cols: [20, 21] } as const;

// ---- the tunnels ------------------------------------------------------------------------------------------

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
 * The tunnel mountain, from the front of the train (the right: the train runs east, the scenery goes west). A wait, a warning of the portal flashing at the entry, then it comes
 * a cell every ten frames; what is on the roof or up the pine when it reaches him is lost, what is under the roof (a hatch's ladder, the closet, the car) is safe. A room's cycle
 * starts when he comes into it.
 */
const MOUTH = { code: PORTAL, cols: MASS, top: 2, bottom: 8, step: 10, warn: 48, picture: MOUNTAIN, coversClimbs: true } as const;
/**
 * The dining car teaches it (a long wait first: he sees it come and goes down a hatch). The sleeper tests it: it flashes almost as he comes onto the roof, so a run straight to the
 * pine is caught on the trunk (the mountain is at the pine about 170 frames in, his walk and climb take about 250), and a wait in the closet for one sweep is the way: the next comes
 * so soon after that he must go at once (siberia-mechanisms.ts measures both).
 */
export const SLEEPER_MOUTH = { rest: 4, offset: 8 } as const;
export const TUNNELS: readonly TunnelSpec[] = [
  { room: SIB.gravy, from: 'right', rest: 130, offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'right', ...SLEEPER_MOUTH, ...MOUTH },
];

/** What moves in the train's rooms: the dining car's and the sleeper's windows and the tender's rail and wheels (train.ts), and the dark sky above them (smoke only over the tender). */
export const TRAIN_ANIMS: readonly CharAnim[] = [
  ...trainAnims(SIB.gravy, true), ...trainAnims(SIB.sleeper, true), ...trainAnims(SIB.coal, false),
  ...skyAnims(SIB.gravy, false, undefined, true), ...skyAnims(SIB.sleeper, false, undefined, true), ...skyAnims(SIB.coal, true, undefined, true),
];

/**
 * The night above each train room (train.ts, art/siberia-sky.ts): the moon, a few stars and the dark horizon (blue mountains over dark pines, no poles); smoke only at the tender,
 * where the chimney is. The spans keep clear of the room's tiles: the sleeper's banks and pine, the tender's bunker and tipple.
 */
const SKY_GRAVY: SkySpec = { dark: true, spans: [[-2, 33]], moon: [25, 0], stars: [['star', 6, 0], ['starDim', 13, 1], ['star', 19, 0], ['starDim', 30, 1]] };
const SKY_SLEEPER: SkySpec = { dark: true, spans: [[6, 19], [22, 25]], moon: [9, 0], stars: [['star', 15, 1], ['starDim', 26, 0]] };
const SKY_TENDER: SkySpec = { dark: true, spans: [[5, 12]], smoke: [[5, 12]], moon: [8, 0], stars: [['starDim', 12, 1]] };

// ---- the cave, the mine and the river ----------------------------------------------------------------------

const YETI_PALETTE = {
  K: ['mineRock', 6], S: ['snowGround', 1], F: ['snowFill', 15], L: ['snowLedge', 1], I: ['iceFall', 3], P: ['pineTrunk', 9],
} as const satisfies Palette;
const MINE_PALETTE = {
  K: ['mineRock', 9], B: ['timber', 8], R: ['ironLadder', 7], C: ['cartDeck', 8], W: ['lakeWater', 6], P: ['rope', 13],
} as const satisfies Palette;
const RIVER_PALETTE = {
  S: ['snowGround', 1], F: ['snowFill', 15], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6], R: ['rope', 13], E: ['carWall', 11],
} as const satisfies Palette;

/** The icicle over the ticket in the yeti's cave. */
export const SIBERIA_ICICLES: readonly IcicleSpec[] = [{ room: SIB.yeti, col: 18, row: 2, floor: 5 }];

/**
 * The frozen Amur's two stretches of ice: six cells each on the river's row 17, either side of the sandbar. His two-cell body is over a stretch for about 56 frames when he walks
 * across without stopping, so crossing at his walk is safe by a hair and waiting is not: he stops only on the sandbar.
 */
const ICE = { row: 17, codes: [codeOf(RIVER_PALETTE, 'I'), codeOf(RIVER_PALETTE, 'J'), codeOf(RIVER_PALETTE, 'H')], crack: 56, wide: 88, gone: 120, away: 240 } as const;
export const RIVER = { ice: [[9, 14], [18, 23]], bar: [15, 17] } as const;
export const CRACKS: readonly CrackSpec[] = RIVER.ice.map(([from, to]) => ({ room: SIB.border, col: from, cols: to - from + 1, ...ICE }));

/**
 * The mine cart: a float that shuttles over the flooded working (columns 8-20), its bed (the room's `cartDeck` tile) a floor he stands on and is carried by, the piece over it the
 * cart's wall and its load. It rests at each end (the docks) and crosses in about 50 frames; it starts resting at the east dock, under the ladder's foot.
 */
export const CART = { row: 18, span: { from: 8, to: 20 }, w: 4, step: 6, hold: 14 } as const;
export const MINE_CART: FloatSpec = {
  room: SIB.mine, row: CART.row, span: CART.span, dir: 1, step: CART.step, every: 0, w: CART.w, offset: CART.span.to - CART.span.from + 1 - CART.w,
  deck: codeOf(MINE_PALETTE, 'C'), decor: decorIndex('mineCart'), h: 1, home: [CART.span.from, CART.row - 1], bounce: { hold: CART.hold },
};

/** The yeti's pictures in the bank (the top two, then the two strides of the bottom two). */
export const YETI_POINTERS = { topLeft: 0xc4, topRight: 0xc5, bottomLeft: [0xb0, 0xb2], bottomRight: [0xb1, 0xb3] } as const;
/**
 * The yeti: four sprites moving as one (a rigid dragon, dragons.ts) round a closed loop in the west of the cave: west along the floor, up the left side, east along the ice bridge, down
 * the right (its top left corner in playfield cells; it is 6 cells wide and 5.25 tall, standing on the floor (row 17) or the bridge (row 9)). It never comes east of column 16, so
 * the pine's gap (columns 19-22) and the stair up from it are never in its way. It never turns: a figure seen from the front. The sprites 4, 5, 6 and 2 (1 is the icicle's, 0 the
 * ticket's, 3 Monty's, 7 his hat's).
 */
export const YETI: DragonSpec = {
  room: SIB.yeti, speed: 0.8, gap: 0,
  path: [[9.5, 11.75], [7, 11.75], [4.3, 11.75], [3, 7.75], [4.3, 3.75], [7, 3.75], [9.5, 3.75], [10.8, 7.75]],
  pieces: [
    { sprite: 4, colour: YETI_COLOUR, frames: [YETI_POINTERS.topLeft, YETI_POINTERS.topLeft], rigid: [0, 0], facing: 'front' },
    { sprite: 5, colour: YETI_COLOUR, frames: [YETI_POINTERS.topRight, YETI_POINTERS.topRight], rigid: [24, 0], facing: 'front' },
    { sprite: 6, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomLeft, rigid: [0, 21], facing: 'front' },
    { sprite: 2, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomRight, rigid: [24, 21], facing: 'front' },
  ],
};

/** The mine's west dock: the gap (columns 4-6) with the rope down to the river at column 5. */
export const MINE_ROPE = { col: 5, gap: [4, 6] } as const;
/** The mine's ladder from the gantry's end (its gap, columns 26-28) down to the east dock. */
export const MINE_LADDER = { col: 27, gap: [26, 28] } as const;

// ---- the rooms ----------------------------------------------------------------------------------------------

export const SIBERIA_ROOMS: readonly RoomSpec[] = [
  // A THE GRAVY TRAIN: the dining car, where the roof run is taught. Along the roof from Moscow's carriage; the mountain comes from the front, with time to see it and go down
  // a hatch (two, a coin two rungs down the first: where he waits while the rock goes over). Inside, the west pocket's pelmeni (Moscow's carriage shuts the car's west end),
  // the conductor's long slow walk, the samovar hopping on the counter by the second hatch's foot, and the gangway east into the sleeper's corridor, open.
  room({
    id: SIB.gravy, cell: [1, 4], sector: 9, palette: GRAVY_PALETTE,
    shut: [['left', 15, 16, 'T']], // the station's carriage beside it is a wall there
    paint(g) { carriage(g, [12, 25]); },
    coins: [[13, 11]],
    item: { name: 'pelmeni1', col: 3, row: 15, sprite: SIB_SPRITE.pelmeni },
    decor: [
      ...skyDecor(SKY_GRAVY), windowAt(4), windowAt(16), ['carLamp', 10, 11], ['carLamp', 22, 11], ['diningTable', 15, 15], ['diningTable', 19, 15], ['diningTable', 27, 15],
      [{ text: 'RESTAURANT', colour: 7 }, 13, 10], ['roofVent', 5, 8], ['stovepipe', 19, 6], ['roofVent', 28, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 5, row: 15, way: 'right', speed: 1, range: 96, colour: 10 },
      { who: 'samovar', col: 27, row: 11, way: 'down', speed: 1, range: 32, colour: 15 },
    ],
  }),

  // B SLEEPER HIT: the sleeper, in a cutting: the set piece's test. The roof again, ending at the tender's coal bunker (the roof's way on is shut); one hatch, into the luggage
  // closet (it shelters him from one sweep and does not reach the corridor); the pine by the line at 20-21, up to the yeti's cave. Below, cut away, the corridor from the open west
  // gangway to the inspector in the east one (he wants a ticket), the provodnitsa hurrying by the berth. A coin in each lane in column 27: by the bunker on the roof, in front of
  // the inspector below.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: SLEEPER_PALETTE,
    paint(g) {
      g.box(0, CAR.roof, 29, CAR.roof, 'D');
      farWall(g, 2, 29);
      g.box(0, 10, 1, 14, 'T').box(30, 10, 31, 14, 'T');
      g.box(0, CAR.floor, 31, CAR.floor, 'T');
      cutting(g);
      g.box(30, 3, 31, CAR.roof, 'K'); // the tender's coal bunker, standing over the end of the roof
      inspectors(g, SIB.sleeper);
      closet(g);
      g.box(PINE.cols[0], 0, PINE.cols[1], CAR.roof - 1, 'P'); // the pine's trunk up through the sky to the cave
    },
    coins: [[27, 7], [27, 15]],
    decor: [
      ...skyDecor(SKY_SLEEPER), windowAt(2), windowAt(14), windowAt(23), ['bunk', 16, 15], ['pineBough', 15, 2], ['pineBough', 22, 3],
      ['pineSmall', 0, 1], ['pineSmall', 2, 2], ['pineSmall', 26, 2], ['pineSmall', 28, 1], ['roofVent', 4, 8], ['roofVent', 15, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 21, row: 15, way: 'right', speed: 2, range: 20, colour: 10 },
      { who: 'inspector', col: 30, row: 15, way: 'down', speed: 0, range: 8, colour: 1 },
    ],
  }),

  // C COAL COMFORT: the tender and the locomotive. In from the sleeper's corridor through the gangway to the pocket under the bunker; the coal heaped in steps to its crest (the
  // stoker going up and down over it, the coin on it), down to the trough and up again to the cab's roof; the ladder from the cab's roof up through the tipple's deck, and east
  // along the deck into the mine. The boiler, the chimney's smoke and the big driving wheels beyond.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11, palette: TENDER_PALETTE,
    shut: [['right', 17, 19, 'M']], // (the mine's rock beside it, under the line)
    paint(g) {
      g.box(0, 3, 1, 9, 'K').box(2, 5, 2, 9, 'K').box(3, 7, 3, 9, 'K'); // the bunker, coal heaped high at the tender's front (the sleeper's roof ends against it)
      g.box(0, 10, 1, 14, 'T'); // the wagon's end, its gangway below
      inspectors(g, SIB.coal);
      g.box(2, 10, 17, 14, 'E'); // the wagon's boards behind the coal
      g.box(0, CAR.floor, 18, CAR.floor, 'K'); // the wagon's floor, coal (the locomotive has none: its wheels stand under it)
      g.box(6, 15, 7, 16, 'K').box(8, 13, 9, 16, 'K').box(10, 11, 12, 16, 'K'); // the coal in steps to the crest
      g.box(13, 15, 15, 16, 'K').box(16, 13, 17, 16, 'K'); // down into the trough and up again
      g.box(18, 11, 26, 11, 'D').box(19, 12, 25, 16, 'T'); // the cab's roof and its back plate
      g.box(26, 12, 31, 16, 'B'); // the boiler
      g.clear(21, 13, 22, 14).clear(21, 15, 22, 16).clear(24, 13, 25, 14); // the holes the window, the firebox door and the gauge show in
      g.box(30, 5, 31, 11, 'M'); // the hillside the mine is in, beyond the smokebox
      g.box(17, 5, 17, 10, 'E').box(29, 5, 29, 10, 'E'); // the tipple's legs (behind the line)
      g.box(14, 4, 31, 4, 'W').clear(23, 4, 25, 4).box(24, 4, 24, 10, 'R'); // the tipple's deck, its gap and ladder
    },
    coins: [[11, 10]],
    decor: [
      ...skyDecor(SKY_TENDER), ['chimney', 27, 10], ['cabWindow', 21, 13], ['cabFire', 21, 15], ['cabGauge', 24, 13],
      ...underCar(0, 30, TENDER_BOGIES), ['drivingWheel', 19, 17], ['drivingWheel', 23, 17], ['drivingWheel', 27, 17],
    ],
    creatures: [{ who: 'miner', col: 10, row: 2, way: 'down', speed: 1, range: 56, colour: 7 }],
  }),

  // Y YETI OR NOT: the dead end that holds the ticket, a cave above the line. Up the pine through the floor's gap at the east, clear of the yeti, which prowls a loop in the west
  // (along the floor, up its left side, along the ice bridge, down its right): a stair of ice ledges at the east up to the bridge, the coin out on the bridge in the yeti's lane,
  // ledges up to the high stash and the ticket under the icicle. All four edges are rock: the only way out is back down the pine.
  room({
    id: SIB.yeti, cell: [0, 5], sector: 13, palette: YETI_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'K').box(0, 2, 1, 19, 'K').box(30, 2, 31, 19, 'K'); // the cave's roof and walls
      g.box(2, 2, 3, 2, 'K').box(12, 2, 14, 2, 'K').box(24, 2, 27, 2, 'K'); // the roof, ragged
      g.box(2, 17, 29, 17, 'S').box(2, 18, 29, 19, 'F').clear(19, 17, 22, 19).box(PINE.cols[0], 15, PINE.cols[1], 19, 'P'); // the floor, the gap and the pine's top in it
      g.box(28, 3, 29, 12, 'I'); // the frozen waterfall down the east wall
      g.box(25, 15, 27, 15, 'L').box(22, 13, 24, 13, 'L').box(25, 11, 27, 11, 'L'); // the stair up to the bridge
      g.box(4, 9, 26, 9, 'L'); // the ice bridge
      g.box(22, 7, 24, 7, 'L').box(17, 5, 21, 5, 'L'); // the ledges up to the high stash
    },
    coins: [[13, 8]],
    item: { name: 'ticket', col: 18, row: 3, sprite: SIB_SPRITE.ticket },
    decor: [['stalactites', 8, 2], ['stalactites', 20, 2]],
  }),

  // M MINE ALL MINE: the hairpin, the region's most enclosed room. In along the tipple's gantry under the rock (a bat crossing it); the ladder down from its end to the east dock
  // (a miner pacing its foot), timber ledges up to a coin; the cart west over the flooded working (a bat over it) to the west dock, its coin seen from the gantry on the way in;
  // and the rope down through the dock's gap to the river.
  room({
    id: SIB.mine, cell: [1, 7], sector: 14, palette: MINE_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 0, 'K').box(29, 0, 31, 19, 'K'); // the rock over the gantry; the east wall (China's tower is beyond)
      g.box(0, 5, 0, 17, 'K').box(1, 5, 7, 7, 'K'); // the west wall under the gantry, and the rock it is cut through
      g.box(0, 4, 25, 4, 'B'); // the gantry
      g.box(MINE_LADDER.col, 4, MINE_LADDER.col, 17, 'R'); // the ladder from its end
      g.box(0, 18, 28, 19, 'K'); // the gallery's floor
      g.clear(MINE_ROPE.gap[0], 18, MINE_ROPE.gap[1], 19).box(MINE_ROPE.col, 18, MINE_ROPE.col, 19, 'P'); // the west dock's gap and the rope
      g.clear(CART.span.from, 18, CART.span.to, 19).box(CART.span.from, 19, CART.span.to, 19, 'W'); // the flooded working
      g.box(21, 16, 23, 16, 'B').box(23, 14, 25, 14, 'B'); // timber ledges up from the east dock
    },
    coins: [[2, 16], [24, 12]],
    decor: [
      ['stalactites', 14, 1], ['coalBucket', 19, 2],
      ...Array.from({ length: CART.span.to - CART.span.from + 1 }, (_, i): Placed => ['rail', CART.span.from + i, CART.row]), ['mineCart', CART.span.from, CART.row - 1],
    ],
    creatures: [
      { who: 'bat', col: 10, row: 1, way: 'down', speed: 1, range: 48 },
      { who: 'bat', col: 15, row: 9, way: 'down', speed: 1, range: 48 },
      { who: 'miner', col: 24, row: 16, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // G BORDER LINE CASE: the frozen Amur, the border itself, the release after the mine. Down the rope onto the village bank (a cabin); the river's ice cracks under whoever stops
  // on it, so on across it to the sandbar (the coin: the only place to stop), wait there for the reindeer pacing the far bank and the guard on the watchtower's ladder, on across
  // the second stretch, and past the raised barrier east into China.
  room({
    id: SIB.border, cell: [2, 7], sector: 17, palette: RIVER_PALETTE,
    shut: [['right', 0, 13, 'F']], // the Wall's hillside beside it is a wall there, down to the road's opening
    paint(g) {
      g.box(MINE_ROPE.col, 0, MINE_ROPE.col, 16, 'R'); // the rope from the mine
      g.box(0, 17, 8, 17, 'S').box(0, 18, 8, 19, 'F'); // the village bank
      for (const [from, to] of RIVER.ice) g.box(from, 17, to, 17, 'I').box(from, 18, to, 19, 'W'); // the ice over the river
      g.box(RIVER.bar[0], 17, RIVER.bar[1], 17, 'S').box(RIVER.bar[0], 18, RIVER.bar[1], 19, 'F'); // the sandbar
      g.box(24, 17, 31, 17, 'S').box(24, 18, 31, 19, 'F'); // the far bank
      g.box(23, 7, 28, 8, 'E').box(24, 9, 24, 16, 'E').box(27, 9, 27, 16, 'E'); // the watchtower (a picture behind him): its hut and legs
    },
    coins: [[16, 15]],
    decor: [['cabin', 0, 13], ['boomUp', 29, 10], [{ text: 'ROAD TO CHINA', colour: 7 }, 14, 3], ['star', 9, 2], ['starDim', 20, 1], ['star', 30, 0]],
    creatures: [
      { who: 'reindeer', col: 24, row: 15, way: 'right', speed: 1, range: 24 },
      { who: 'guard', col: 25, row: 9, way: 'down', speed: 1, range: 48 },
    ],
  }),
];
