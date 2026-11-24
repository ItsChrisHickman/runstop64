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
 * Playfield cells as in moscow.ts. The puzzle is the train. Its two lanes, the roof and the cars' insides, meet in the dining car (its hatches) but that car's inside is a
 * dead end: its east gangway is bolted. The roof ends at the tender's coal (B's east end), and the way on is the sleeper's corridor under it, seen from the roof
 * (cut away) with the inspector in its far gangway, under the luggage closet's bolted floor. The closet is where he shelters from the mountain on the way
 * to the pine, standing on that floor. The ticket is off the train, up the pine, in the yeti's cave. With it the provodnitsa unbolts the closet's floor and the
 * inspector steps aside: back along the roof under the mountain to the closet, down through its floor into the corridor, past the inspector, up the tender's coal
 * to the tipple, through the mine's hairpin (the gantry east, the cart west) and across the frozen Amur to China.
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

/** The tunnel's brick lining in the train rooms: grey stone, a colour no car uses (the cars are maroon and brown), so the mountain never reads as more car; its portal light grey. */
const TUNNEL_STONE = 12, PORTAL_STONE = 15;

/** The dining car's palette: the passenger car's, its far wall one dark brown (calm behind where he plays), the tunnel in stone. */
const GRAVY_PALETTE = { ...TRAIN_PALETTE, E: ['carWall', 9], X: ['tunnelFace', PORTAL_STONE], M: ['tunnelBrick', TUNNEL_STONE] } as const satisfies Palette;

/**
 * The sleeper's palette: the passenger car's with the floor's code given to the tender's coal (its bunker ends the roof), the floor drawn in the car's maroon side,
 * and the pine's trunk the eighth. The tunnel's granite and rock keep their codes (5 and 7: the mountain's picture is drawn in them).
 */
const SLEEPER_PALETTE = {
  D: ['roofDeck', 14], E: ['carWall', 9], K: ['coal', 11], T: ['trainSide', 2], X: ['tunnelFace', PORTAL_STONE], R: ['ironLadder', 7], M: ['tunnelBrick', TUNNEL_STONE], P: ['pineTrunk', 9],
} as const satisfies Palette;

/**
 * The tender and the locomotive: the coal (the bunker at the front, the heap in steps, the wagon's floor under it), the cab's roof, its back plate and the
 * wagon's end in green, the boiler, the tipple's legs (a dark picture behind), the tipple's timber deck, its ladder and the hill's rock.
 */
const TENDER_PALETTE = {
  D: ['roofDeck', 14], K: ['coal', 11], T: ['trainSide', 2], B: ['boilerPlate', 5], E: ['carWall', 9], W: ['timber', 8], R: ['ironLadder', 7], M: ['mineRock', 9],
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

/**
 * The luggage closet under the sleeper's one hatch: a ladder well three wide (columns 9-11) down to its floor at row 13, walled at 8 and 12. Its walls rise through the roof's
 * walkway (the hatch's frame), so a jump off the ladder cannot carry him sideways under the walkway and down into the car. Its floor is bolted, over the corridor's far wall;
 * with the ticket the provodnitsa unbolts it (`TRAPDOOR`): the floor's side cells open and the ladder runs on through it down to the corridor's floor, both ways. (No ladder
 * stands under the bolted floor: one he could take hold of but not climb is a broken ladder, not a lock; coming back down the pine with the ticket he sees it run through.)
 */
export const CLOSET = { hatch: 10, floor: 13, left: 8, right: 12 } as const;
function closet(g: Grid) {
  g.clear(CLOSET.hatch - 1, CAR.roof, CLOSET.hatch + 1, CLOSET.floor - 1).box(CLOSET.hatch, CAR.roof, CLOSET.hatch, CLOSET.floor - 1, 'R'); // (the well open under the eaves)
  g.box(CLOSET.left, CAR.roof, CLOSET.left, CLOSET.floor, 'T').box(CLOSET.right, CAR.roof, CLOSET.right, CLOSET.floor, 'T').box(CLOSET.left, CLOSET.floor, CLOSET.right, CLOSET.floor, 'T');
}
/** The closet's bolted floor (playfield row, column): the two cells the ticket clears, and the ladder it puts through the floor's middle down to the corridor's floor, in the sleeper's code for the ladder. */
export const TRAPDOOR = {
  clear: [[CLOSET.floor, CLOSET.hatch - 1], [CLOSET.floor, CLOSET.hatch + 1]],
  ladder: Array.from({ length: CAR.floor - CLOSET.floor }, (_, i): readonly [number, number] => [CLOSET.floor + i, CLOSET.hatch]),
  code: codeOf(SLEEPER_PALETTE, 'R'),
} as const;

/** The pine by the line: its trunk at columns 20-21, from the sleeper's roof up through its sky into the yeti's cave. */
export const PINE = { cols: [20, 21] } as const;

// ---- the tunnels ------------------------------------------------------------------------------------------

/** The portal's dressed stone and the tunnel's brick lining, in the train rooms' palette. */
const PORTAL = codeOf(TRAIN_PALETTE, 'X'), BRICK = codeOf(TRAIN_PALETTE, 'M');
/**
 * How many cells long the tunnel is: longer than the screen is wide (the playfield and its margins, 40 cells), so while it passes it fills the band
 * from edge to edge with nothing of the backdrop beside it.
 */
const MASS = 44;
/** How far the portal's stone ring reaches into the brick at each end, row by row from the top (the arch's curve: thickest at the crown). */
const ARCH = [4, 3, 2, 2, 2, 2, 2] as const;
/**
 * The tunnel as the room has it, rows 2 to 8 (the roof's walkway is row 9: what stands on it is inside): a solid lining of brick in clean courses, with the arch of dressed stone at
 * its leading end and the one the train comes out of at its far end.
 */
export const MOUNTAIN: readonly (readonly number[])[] = ARCH.map((reach) => Array.from({ length: MASS }, (_, c) => (Math.min(c, MASS - 1 - c) < reach ? PORTAL : BRICK)));
/**
 * The tunnel mountain, from the front of the train (the right: the train runs east, the scenery goes west). A wait, a warning of the portal flashing at the entry, then it comes
 * a cell every ten frames; what is on the roof or up the pine when it reaches him is lost, what is under the roof (a hatch's ladder, the closet, the car) is safe. A room's cycle
 * starts when he comes into it.
 */
const MOUTH = { code: PORTAL, cols: MASS, top: 2, bottom: 8, step: 10, warn: 48, picture: MOUNTAIN, coversClimbs: true, bleed: true } as const;
/**
 * The dining car teaches it (a long wait first: he sees it come and goes down a hatch). The sleeper tests it, faster (a cell every six frames, so the shelter is a short wait, not
 * a long one): it flashes soon after he comes onto the roof, so a run straight to the pine is caught at it, and a wait in the closet for one sweep is the way: the
 * next comes so soon after that he must go at once (going as the tail passes the closet, he is up the pine about 40 frames before the next arch reaches it;
 * siberia-mechanisms.ts measures both). Coming down the pine (the cycle starts afresh) he has time to run west along the roof, taking the coin over it with a jump.
 */
export const SLEEPER_MOUTH = { rest: 28, offset: 24, step: 6 } as const;
export const TUNNELS: readonly TunnelSpec[] = [
  { room: SIB.gravy, from: 'right', rest: 130, offset: 40, ...MOUTH },
  { room: SIB.sleeper, from: 'right', ...MOUTH, ...SLEEPER_MOUTH },
];

/** What moves in the train's rooms: the dining car's and the sleeper's windows and the tender's rail and wheels (train.ts), and the sleeper's horizon (smoke only over the tender). */
export const TRAIN_ANIMS: readonly CharAnim[] = [
  ...trainAnims(SIB.gravy, true), ...trainAnims(SIB.sleeper, true), ...trainAnims(SIB.coal, false),
  ...skyAnims(SIB.gravy, false, undefined, true, false), ...skyAnims(SIB.sleeper, false, undefined, true), ...skyAnims(SIB.coal, true, undefined, true, false),
];

/**
 * The night above each train room (train.ts, art/siberia-sky.ts): the moon, a few stars and the dark horizon (blue mountains over dark pines, no poles); smoke only at the tender,
 * where the chimney is. The spans keep clear of the room's tiles: the sleeper's banks and pine, the tender's bunker and tipple.
 */
const SKY_GRAVY: SkySpec = { dark: true, spans: [[-2, 33]], horizon: [], moon: [25, 0], stars: [['star', 6, 0], ['starDim', 13, 1], ['star', 19, 0], ['starDim', 30, 1]] }; // (no horizon: the roof lane, where the mountain is dodged, has only the night behind it)
const SKY_SLEEPER: SkySpec = { dark: true, spans: [[-2, 19], [22, 29]], moon: [9, 0], stars: [['star', 15, 1], ['starDim', 26, 0]] };
const SKY_TENDER: SkySpec = { dark: true, spans: [[4, 15]], horizon: [], smoke: [[4, 15]], moon: [8, 0], stars: [['starDim', 12, 1]] };

// ---- the cave, the mine and the river ----------------------------------------------------------------------

const YETI_PALETTE = {
  K: ['mineRock', 6], S: ['snowGround', 1], F: ['snowFill', 15], L: ['snowLedge', 1], I: ['iceFall', 3], P: ['pineTrunk', 9],
} as const satisfies Palette;
const MINE_PALETTE = {
  K: ['mineRock', 9], B: ['timber', 8], R: ['ironLadder', 7], C: ['cartDeck', 8], W: ['lakeWater', 6], P: ['rope', 13],
} as const satisfies Palette;
const RIVER_PALETTE = {
  S: ['snowGround', 1], F: ['hillEarth', 9], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6], R: ['rope', 13], E: ['carWall', 6],
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
 * The yeti: four sprites moving as one (a rigid dragon, dragons.ts) round a closed loop: west along the floor, up the left side, east along the whole ice bridge to its east end,
 * and down again (its top left corner in playfield cells; it is 6 cells wide and 5.25 tall, standing on the floor (row 17) or the bridge (row 9)). On the floor it never comes east
 * of column 16, so the pine's gap (columns 19-22) and the stair up from it are never in its way: he arrives safe. But the way to the ticket crosses its bridge lane twice (the
 * bridge's east end where the stair comes up, and the stash's ledge over it), so he must read it from the stair's top and go while it is down on the floor. It never turns: a
 * figure seen from the front. The sprites 4, 5, 6 and 2 (1 is the icicle's, 0 the ticket's, 3 Monty's, 7 his hat's).
 */
export const YETI: DragonSpec = {
  room: SIB.yeti, speed: 0.8, gap: 0,
  // at the ends of the floor lane (corners 0, 2) and of the ice bridge (4, 6) it chooses from the game's random source: carry on at a new pace (half the time), stand and roar then rest, roar and turn back, or roar and charge (a stretch
  // of 90 frames at 1.7 times its pace). It always roars first (36 frames: the body shakes where it stands), so it never heads his way without a readable warning; whatever it chooses it stays on its loop, west of the pine.
  moods: { stops: [0, 2, 4, 6], pace: 0.15, roar: 36, rest: 50, charge: { speed: 1.7, frames: 90 }, weights: { pause: 56, back: 40, charge: 32 } },
  path: [[9.5, 11.75], [7, 11.75], [4.3, 11.75], [3, 7.75], [4.3, 3.75], [10.3, 3.75], [16.3, 3.75], [14.3, 7.75]],
  pieces: [
    { sprite: 4, colour: YETI_COLOUR, frames: [YETI_POINTERS.topLeft, YETI_POINTERS.topLeft], rigid: [0, 0], facing: 'front' },
    { sprite: 5, colour: YETI_COLOUR, frames: [YETI_POINTERS.topRight, YETI_POINTERS.topRight], rigid: [24, 0], facing: 'front' },
    { sprite: 6, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomLeft, rigid: [0, 21], facing: 'front' },
    { sprite: 2, colour: YETI_COLOUR, frames: YETI_POINTERS.bottomRight, rigid: [24, 21], facing: 'front' },
  ],
};

/** The mine's west dock: the gap (columns 4-6) with the rope down to the river at column 5. */
export const MINE_ROPE = { col: 5, gap: [4, 6] } as const;
/** The left columns of the mine's two air shafts (three wide), each with a bat going up and down it from the gantry's lane to the cart's. */
export const MINE_SHAFTS = [10, 17] as const;
/** The mine's ladder from the gantry's end (its gap, columns 26-28) down to the east dock. */
export const MINE_LADDER = { col: 27, gap: [26, 28] } as const;

// ---- the rooms ----------------------------------------------------------------------------------------------

export const SIBERIA_ROOMS: readonly RoomSpec[] = [
  // A THE GRAVY TRAIN: the dining car, where the roof run is taught. Along the roof from Moscow's carriage; the mountain comes from the front, with time to see it and go down
  // a hatch (two, a coin two rungs down the first: where he waits while the rock goes over). Inside, a dead end: the west pocket's pelmeni (Moscow's carriage shuts the car's
  // west end) behind the conductor's long slow walk, the samovar hopping on the counter by the second hatch's foot, and the gangway east bolted (the way under the sleeper is not
  // from here). Up the other hatch and on along the roof.
  room({
    id: SIB.gravy, cell: [1, 4], sector: 9, palette: GRAVY_PALETTE,
    shut: [['left', 15, 16, 'T'], ['right', 15, 16, 'T']], // the station's carriage beside it is a wall there; the gangway into the sleeper is bolted
    paint(g) { carriage(g, [12, 25]); },
    coins: [[13, 11]],
    item: { name: 'pelmeni1', col: 3, row: 15, sprite: SIB_SPRITE.pelmeni },
    decor: [
      ...skyDecor(SKY_GRAVY), windowAt(4), ['carLamp', 10, 11], ['carLamp', 22, 11], ['diningTable', 15, 15], ['diningTable', 27, 15],
      [{ text: 'RESTAURANT', colour: 7 }, 13, 10], ['roofVent', 5, 8], ['stovepipe', 19, 6], ['roofVent', 28, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 5, row: 15, way: 'right', speed: 1, range: 96, colour: 10 },
      { who: 'samovar', col: 27, row: 11, way: 'down', speed: 1, range: 32, colour: 15 },
    ],
  }),

  // B SLEEPER HIT: the sleeper: the set piece and the puzzle. The roof again, ending at the tender's coal bunker (the roof's way on is shut); one hatch, into the luggage closet
  // (it shelters him from one sweep; he stands on its bolted floor); the pine by the line at 20-21, rising from behind the car up to the yeti's cave. Below, cut away, the
  // corridor, shut at both ends (the dining car's gangway bolted, the inspector in the east one: he wants a ticket), the closet's bolted floor over it, the provodnitsa pacing
  // from the berth to the coin. With the ticket the closet's floor opens: the roof is crossed twice under the mountain, east to the pine and back west to the closet. A coin in
  // each lane: over the roof between the closet and the pine (a jump, on the run back west from the pine), and in front of the inspector below.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: SLEEPER_PALETTE,
    shut: [['left', 15, 16, 'T']], // the dining car's bolted gangway
    paint(g) {
      g.box(0, CAR.roof, 29, CAR.roof, 'D');
      farWall(g, 2, 29);
      g.box(2, CAR.roof + 1, 29, CAR.roof + 1, 'T'); // the car's eaves under the walkway, solid: nothing on the roof (off the pine's foot, off the closet's ladder) slips under it into the car
      g.box(0, 10, 1, 14, 'T').box(30, 10, 31, 14, 'T');
      g.box(0, CAR.floor, 31, CAR.floor, 'T');
      g.box(30, 3, 31, CAR.roof, 'K'); // the tender's coal bunker, standing over the end of the roof
      inspectors(g, SIB.sleeper);
      closet(g);
      g.box(PINE.cols[0], 0, PINE.cols[1], CAR.roof - 1, 'P'); // the pine's trunk up through the sky to the cave
    },
    coins: [[16, 5], [27, 15]],
    decor: [
      ...skyDecor(SKY_SLEEPER), windowAt(2), windowAt(14), windowAt(23), ['bunk', 16, 15],
      ['roofVent', 6, 8], ['roofVent', 15, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 16, row: 15, way: 'right', speed: 1, range: 64, colour: 10 },
      { who: 'inspector', col: 30, row: 15, way: 'down', speed: 0, range: 8, colour: 1 },
      { who: 'agent', col: 0, row: 7, way: 'right', speed: 1, range: 1 }, // Viktor Vole, onto the roof behind him (viktor.ts `trainPursuer`: he walks Monty's path, not a patrol)
    ],
  }),

  // C COAL COMFORT: the tender and the locomotive. In from the sleeper's corridor through the gangway to the pocket under the bunker; the coal heaped in steps to its crest (the
  // coin on it), over the trough where the tipple's chute comes down from the deck's west end, the stoker riding up and down it (a jump from the crest while he is up), up again
  // to the cab's roof (a bat flitting along it to the ladder's foot); the ladder from the cab's roof up through the tipple's deck, and east along the deck into the mine. The
  // boiler, the chimney's smoke and the big driving wheels beyond; the night behind the coal is plain black.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11, palette: TENDER_PALETTE,
    shut: [['right', 17, 19, 'M']], // (the mine's rock beside it, under the line)
    paint(g) {
      g.box(0, 3, 1, 9, 'K').box(2, 5, 2, 9, 'K').box(3, 7, 3, 9, 'K'); // the bunker, coal heaped high at the tender's front (the sleeper's roof ends against it)
      g.box(0, 10, 1, 14, 'T'); // the wagon's end, its gangway below
      inspectors(g, SIB.coal);
      g.box(0, CAR.floor, 18, CAR.floor, 'K'); // the wagon's floor, coal (the locomotive has none: its wheels stand under it)
      g.box(6, 15, 7, 16, 'K').box(8, 13, 9, 16, 'K').box(10, 11, 12, 16, 'K'); // the coal in steps to the crest
      g.box(13, 15, 15, 16, 'K').box(16, 13, 17, 16, 'K'); // down into the trough and up again
      g.box(18, 11, 26, 11, 'D').box(19, 12, 25, 16, 'T'); // the cab's roof and its back plate
      g.box(26, 12, 31, 16, 'B'); // the boiler
      g.clear(21, 13, 22, 14).clear(21, 15, 22, 16).clear(24, 13, 25, 14); // the holes the window, the firebox door and the gauge show in
      g.box(30, 5, 31, 11, 'M'); // the hillside the mine is in, beyond the smokebox
      g.box(16, 5, 16, 12, 'E').box(29, 5, 29, 11, 'E'); // the tipple's legs (behind the line), standing on the coal and on the boiler
      g.box(13, 5, 14, 14, 'E'); // the chute from the deck's west end down into the trough (behind him: the stoker rides it)
      g.box(13, 4, 31, 4, 'W').clear(23, 4, 25, 4).box(24, 4, 24, 10, 'R'); // the tipple's deck over the chute, its gap and ladder
    },
    coins: [[11, 10]],
    decor: [
      ...skyDecor(SKY_TENDER), ['chimney', 27, 10], ['cabWindow', 21, 13], ['cabFire', 21, 15], ['cabGauge', 24, 13],
      ...underCar(0, 30, TENDER_BOGIES), ['drivingWheel', 19, 17], ['drivingWheel', 23, 17], ['drivingWheel', 27, 17],
    ],
    creatures: [
      { who: 'miner', col: 13, row: 9, way: 'down', speed: 1, range: 24, colour: 7 }, // the stoker, riding the chute up and down over the trough: jump it from the crest when he is up
      { who: 'bat', col: 18, row: 9, way: 'right', speed: 1, range: 32 }, // a bat flitting along the cab's roof to the ladder's foot
    ],
  }),

  // Y YETI OR NOT: the dead end that holds the ticket, a cave above the line. Up the pine through the floor's gap at the east, clear of the yeti's floor lane, but not of its
  // loop (along the floor, up its left side, along the whole ice bridge to its east end, down again): a stair of ice ledges at the east up to the bridge's end, where the yeti
  // walks, then the ledges up over its lane to the high stash and the ticket under the icicle; the coin out on the bridge in the middle of its lane. All four edges are rock: the
  // only way out is back down the pine.
  room({
    id: SIB.yeti, cell: [0, 5], sector: 13, palette: YETI_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'K').box(0, 2, 1, 19, 'K').box(30, 2, 31, 19, 'K'); // the cave's roof and walls
      g.box(2, 2, 3, 2, 'K').box(12, 2, 14, 2, 'K').box(24, 2, 27, 2, 'K'); // the roof, ragged
      g.box(2, 17, 29, 17, 'S').box(2, 18, 29, 19, 'F').clear(19, 17, 22, 19).box(PINE.cols[0], 15, PINE.cols[1], 19, 'P'); // the floor, the gap and the pine's top in it
      g.box(28, 3, 29, 12, 'I'); // the frozen waterfall down the east wall
      // the stair up to the bridge and down again: no ledge under another's end, so a walk off each end lands on the next (a ledge is a floor from above only)
      g.box(23, 15, 25, 15, 'L').box(26, 13, 27, 13, 'L').box(22, 11, 25, 11, 'L');
      g.box(4, 9, 20, 9, 'L'); // the ice bridge (its east end in the yeti's lane: no standing beyond it)
      g.box(22, 7, 24, 7, 'L').box(17, 5, 21, 5, 'L'); // the ledges up to the high stash
    },
    coins: [[13, 8]],
    item: { name: 'ticket', col: 18, row: 3, sprite: SIB_SPRITE.ticket },
  }),

  // M MINE ALL MINE: the hairpin, the region's most enclosed room: two tight tunnels, one over the other, with the hill's rock between them. In along the tipple's gantry under
  // the rock; the ladder down from its end to the east dock (a miner pacing its foot), timber ledges up to a coin (Monty Mole's coal bucket on the low one); the cart west along the low gallery
  // over the flooded working to the west dock, its coin seen from the gantry on the way in; and the rope down through the dock's gap to the river. Two air shafts through the rock
  // join the tunnels, a bat going up and down each, across the gantry and down over the cart.
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
      g.box(1, 5, 25, 11, 'K').box(8, 12, 22, 12, 'K'); // the rock between the gantry and the gallery: the gallery's low ceiling
      g.clear(MINE_SHAFTS[0], 5, MINE_SHAFTS[0] + 2, 12).clear(MINE_SHAFTS[1], 5, MINE_SHAFTS[1] + 2, 12); // the air shafts, three wide
    },
    coins: [[2, 16], [24, 12]],
    decor: [
      ['coalBucket', 21, 14], // (on the low timber ledge, off the miner's beat)
      ...Array.from({ length: CART.span.to - CART.span.from + 1 }, (_, i): Placed => ['rail', CART.span.from + i, CART.row]), ['mineCart', CART.span.from, CART.row - 1],
    ],
    creatures: [
      { who: 'bat', col: MINE_SHAFTS[0], row: 1, way: 'down', speed: 1, range: 104 },
      { who: 'bat', col: MINE_SHAFTS[1], row: 14, way: 'up', speed: 1, range: 104 },
      { who: 'miner', col: 24, row: 16, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // G BORDER LINE CASE: the frozen Amur, the border itself, the release after the mine. Down the rope onto the village bank (a cabin); the river's ice cracks under whoever stops
  // on it, so on across it to the sandbar (the coin: the only place to stop), wait there for the reindeer pacing the far bank and the guard on the watchtower's ladder, on across
  // the second stretch, and past the raised barrier east into China.
  room({
    id: SIB.border, cell: [2, 7], sector: 17, palette: RIVER_PALETTE,
    shut: [['right', 4, 13, 'F']], // the hillside China's wall stands on, its earth as China draws it, down to the road's opening (the sky open above, as on China's side)
    paint(g) {
      g.box(MINE_ROPE.col, 0, MINE_ROPE.col, 16, 'R'); // the rope from the mine
      g.box(0, 17, 8, 17, 'S').box(0, 18, 8, 19, 'F'); // the village bank
      for (const [from, to] of RIVER.ice) g.box(from, 17, to, 17, 'I').box(from, 18, to, 19, 'W'); // the ice over the river
      g.box(RIVER.bar[0], 17, RIVER.bar[1], 17, 'S').box(RIVER.bar[0], 18, RIVER.bar[1], 19, 'F'); // the sandbar
      g.box(24, 17, 31, 17, 'S').box(24, 18, 31, 19, 'F'); // the far bank
      g.box(30, 3, 31, 3, 'S').box(30, 4, 31, 13, 'F'); // the hillside at the right edge, snow on its top
      g.box(23, 7, 28, 8, 'E').box(24, 9, 24, 16, 'E').box(27, 9, 27, 16, 'E'); // the watchtower (a dark picture behind him, the guard and the reindeer bright on it): its hut and legs
    },
    coins: [[16, 15]],
    decor: [['cabin', 0, 13], ['boomUp', 29, 10], ['star', 9, 2], ['starDim', 20, 1], ['star', 30, 0]],
    creatures: [
      { who: 'reindeer', col: 24, row: 15, way: 'right', speed: 1, range: 24 },
      { who: 'guard', col: 25, row: 9, way: 'down', speed: 1, range: 48 },
    ],
  }),
];
