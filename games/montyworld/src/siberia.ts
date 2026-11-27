import type { CellBox, CharAnim, CrackSpec, DragonSpec, FloatSpec, IcicleSpec, PulseSpec, SwitchSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { STEAM_FRAMES } from './art/siberia-decor';
import { YETI_COLOUR } from './art/siberia-yeti';
import { codeOf, decorIndex, fillCells, Grid, room, type Palette } from './layout';
import { type Placed, buffersAt, CAR, farWall, hatch, skyAnims, skyDecor, type SkySpec, TRAIN_PALETTE, trainAnims, underCar, windowAt } from './train';

/**
 * Siberia, the second region of Do Svidaniya Monty: the Trans-Siberian and the way off it to the Chinese border (docs/dosvidaniya-reset.md, "Siberia (the
 * Trans-Siberian)"). Six rooms at columns 4-7 of the exit grid, entered from Moscow's carriage roof (room I, column 3) and left east into China's wall.
 *
 *            col 4              col 5               col 6               col 7
 *   row 0      .              Y  YETI OR NOT          .                   .
 *   row 1   A  GRAVY TRAIN    B  SLEEPER HIT      C  COAL COMFORT     M  MINE ALL MINE
 *   row 2      .                 .                 T  OFF THE BEATEN PATH  G  BORDER LINE CASE      (T: a bonus room, added 2026-11-25)
 *
 * Playfield cells as in moscow.ts. The puzzle is the train, its two lanes, the roof and the cars' insides. They meet in the dining car (its hatches) but that car's inside is a
 * dead end: its east gangway is bolted. The sleeper's roof runs on east onto the tender's coal, where the locomotive's steam (STEAM) blows out of its pipe's top across the way to the
 * cab; the wheel that sends it out of the bottom instead is seen below, on the inside, out of reach. The inside is the sleeper's corridor under the roof (cut away), the inspector in its
 * far gangway, under the luggage closet's bolted floor, where he shelters from the mountain on the way to the pine. The ticket is off the train, up the pine, in the yeti's cave. With it
 * the provodnitsa unbolts the closet's floor and the inspector steps aside: down the closet, along the corridor into the tender's and to the wheel. Turned, the steam blows across the
 * inside's own way into the cab; the top is quiet, so the way on is back under the sleeper, up the closet, east along the roof under the mountain (the vestibule its shelter), over the
 * coal and the cab's roof and up the tipple. So each lane holds half the answer. Then the mine's hairpin (the gantry east, the cart west) and across the frozen Amur to China.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids go on from Moscow's (0-8); China's start at 18 and never move. The reset cut three of Siberia's nine rooms (12, 15 and 16: the forest, the dark
 * shaft and the lake); their ids are retired, not reused (the tables are by id: buildRooms leaves the gaps), so nothing after them moves.
 */
export const SIB = { gravy: 9, sleeper: 10, coal: 11, yeti: 13, mine: 14, border: 17, taiga: 95 } as const;

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
/** Rooms added to Siberia after it shipped (later-sectors.ts): OFF THE BEATEN PATH (2026-11-25), the bonus room west of the border village; the map's colour of each. */
export const SIBERIA_LATER_NAMES: Readonly<Record<number, string>> = { [SIB.taiga]: 'OFF THE BEATEN PATH' };
export const SIBERIA_LATER_COLOURS: Readonly<Record<number, number>> = { [SIB.taiga]: 5 };
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
 * The sleeper's palette: the passenger car's with the floor's code given to the tender's coal (kept, so the codes after it never move), the floor drawn in the car's maroon side,
 * and the pine's trunk the eighth. The tunnel's granite and rock keep their codes (5 and 7: the mountain's picture is drawn in them).
 */
const SLEEPER_PALETTE = {
  D: ['roofDeck', 14], E: ['carWall', 9], K: ['coal', 11], T: ['trainSide', 2], X: ['tunnelFace', PORTAL_STONE], R: ['ironLadder', 7], M: ['tunnelBrick', TUNNEL_STONE], P: ['pineTrunk', 9],
} as const satisfies Palette;

/**
 * The tender and the locomotive: the coal (the bunker over the tender's back, the heap in steps, the tender's floor), the tender's end and the cab's footplate in its maroon, the cab's roof,
 * the boiler, the tipple's timber deck, the ladders, the hill's rock and the steam (the Pacific's vent's column: drawn by the pulses, `STEAM`).
 */
const TENDER_PALETTE = {
  D: ['roofDeck', 14], K: ['coal', 11], T: ['trainSide', 2], B: ['boilerPlate', 5], W: ['timber', 8], R: ['ironLadder', 7], M: ['mineRock', 9], S: ['pacSteam', 1],
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
/**
 * The vestibule at the sleeper's east end: a second ladder well like the closet (columns 24-26, walled at 23 and 27, floored at row 13), but its floor is never opened. It is the
 * shelter on the way east along the roof to the tender's coal (Chris, 2026-11-26: the train as a path puzzle): from the closet, out as the mountain's tail goes by, to the vestibule
 * before the next, and out again after it to the tender. The corridor runs on under it to the inspector's gangway.
 */
export const VESTIBULE = { hatch: 25, floor: 13, left: 23, right: 27 } as const;
/** A ladder well down from the roof's hatch to a floor of its own, walled both sides: its walls rise through the roof's walkway, so a jump off the ladder cannot carry him under the walkway. */
function well(g: Grid, w: { readonly hatch: number; readonly floor: number; readonly left: number; readonly right: number }) {
  g.clear(w.hatch - 1, CAR.roof, w.hatch + 1, w.floor - 1).box(w.hatch, CAR.roof, w.hatch, w.floor - 1, 'R'); // (the well open under the eaves)
  g.box(w.left, CAR.roof, w.left, w.floor, 'T').box(w.right, CAR.roof, w.right, w.floor, 'T').box(w.left, w.floor, w.right, w.floor, 'T');
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
export const SLEEPER_MOUTH = { rest: 44, offset: 8, step: 6 } as const;
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
 * where the chimney is. The spans keep clear of the room's tiles: the sleeper's banks and pine, the tender's coal, the steam and the tipple.
 */
const SKY_GRAVY: SkySpec = { dark: true, spans: [[-2, 33]], horizon: [], moon: [25, 0], stars: [['star', 6, 0], ['starDim', 13, 1], ['star', 19, 0], ['starDim', 30, 1]] }; // (no horizon: the roof lane, where the mountain is dodged, has only the night behind it)
const SKY_SLEEPER: SkySpec = { dark: true, spans: [[-2, 19], [22, 33]], moon: [9, 0], stars: [['star', 15, 1], ['starDim', 26, 0]] };
const SKY_TENDER: SkySpec = { dark: true, spans: [[4, 12]], horizon: [], smoke: [[4, 12]], moon: [8, 0], stars: [['starDim', 12, 1]] };

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

/**
 * OFF THE BEATEN PATH (added 2026-11-25): the taiga west of the border village, off the trail. Its pines' snow-laden boughs zig-zag up from the trail to the eagle owl's nest, each
 * bough on the trunk across from the last, two rows up: `TAIGA.boughs` (column, floor row, width), the nest last. Each cell of a bough carries its own load of snow, which slides off
 * if he stands on it (`TAIGA_BOUGHS`: it breaks up after 20 frames, falls after 40 and is gone after 56, back 240 frames later), so the climb is a run of hops that never stops: land,
 * turn, jump. A fall is to the snow of the trail, nothing worse, and the boughs grow their snow back. One icicle hangs from the top bough over the east end of the bough below,
 * where the second coin is, dripping on its own clock (`period`): the dash out to it and back is timed to the drip.
 */
const TAIGA_BOUGH_LIST: readonly (readonly [col: number, floor: number, cols: number])[] = [[14, 15, 7], [7, 13, 5], [14, 11, 5], [7, 9, 5], [14, 7, 5]];
export const TAIGA = {
  boughs: TAIGA_BOUGH_LIST,
  nest: { col: 21, floor: 5, cols: 5 },
  trunks: [17, 9, 23] as const,
  icicle: { col: 17, row: 8, floor: 11, period: 120, phase: 50 }, // (it drips on its own clock: the dash along the cracking bough to the coin under it is timed to the drip, never a wait on the bough)
} as const;
const TAIGA_PALETTE = {
  S: ['snowGround', 1], F: ['hillEarth', 9], B: ['boughSnow', 1], C: ['boughSlide', 1], D: ['boughBare', 1], T: ['timber', 9],
} as const satisfies Palette;
export const TAIGA_BOUGHS: readonly CrackSpec[] = TAIGA.boughs.flatMap(([col, row, cols]) => Array.from({ length: cols }, (_, k): CrackSpec => ({
  room: SIB.taiga, col: col + k, cols: 1, row, codes: [codeOf(TAIGA_PALETTE, 'B'), codeOf(TAIGA_PALETTE, 'C'), codeOf(TAIGA_PALETTE, 'D')], crack: 20, wide: 40, gone: 56, away: 240,
})));
export const TAIGA_ICICLES: readonly IcicleSpec[] = [{ room: SIB.taiga, ...TAIGA.icicle }];
/** OFF THE BEATEN PATH's tiles: the trail and the crag that ends it, the boughs, the nest's sticks. */
const paintTaiga = (g: Grid): void => {
  g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F'); // the trail, beaten down in the snow
  g.box(0, 1, 2, 16, 'F'); // the crag the trail ends at, a cliff up to the sky's top (no walkway drawn to the edge; the coal car's floor above is open there)
  for (const [col, row, cols] of TAIGA.boughs) g.box(col, row, col + cols - 1, row, 'B');
  g.box(TAIGA.nest.col, TAIGA.nest.floor, TAIGA.nest.col + TAIGA.nest.cols - 1, TAIGA.nest.floor, 'T'); // the nest
};
/** The northern lights' curtain: a wave across the sky, its fringe, body and hem a row apart, kept off the coin's cell. */
const auroraCurtain = (keep: readonly (readonly [number, number])[]): Placed[] => Array.from({ length: 30 }, (_, i) => i + 3).flatMap((c) => {
  const y = Math.round(1.6 + 1.6 * Math.sin(c / 3.6) + 0.5 * Math.sin(c / 1.5));
  return ([[y, 'auroraTop'], [y + 1, 'auroraBody'], [y + 2, 'auroraHem']] as const).flatMap(([row, piece]) => (row >= 0 ? fillCells(paintTaiga, keep, [c, row, c, row], piece) : []));
});
const TAIGA_COINS: readonly (readonly [col: number, row: number])[] = [[23, 3], [18, 9]];
/** The pines' needles round their trunks, in tiers widening downward to the trail, on the cells the boughs leave empty: [trunk, top row, widest]. */
const TAIGA_PINES: readonly Placed[] = ([[17, 4, 4], [9, 6, 3], [23, 6, 2]] as const).flatMap(([t, top, widest]) => Array.from({ length: 16 - top + 1 }, (_, i) => top + i).flatMap((row) => {
  const w = Math.min(widest, Math.floor((row - top) / 3) + ((row - top) % 3));
  return fillCells(paintTaiga, TAIGA_COINS, [t - w, row, t + w, row], 'taigaNeedles').filter(([, c]) => c !== t);
}));

/** The icicle over the ticket in the yeti's cave: it shakes as he comes toward it (`lead`), so walking straight on meets its fall; he stops, lets it fall, and goes by while it grows back. */
export const SIBERIA_ICICLES: readonly IcicleSpec[] = [{ room: SIB.yeti, col: 18, row: 2, floor: 5, lead: 2 }];

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
/** The mine's ladder from the gantry's end (its gap, columns 25-27) down to the east dock, in a shaft of its own: the rock beside it comes down to row 15 at column 24 (`lip`), so the only way off it is at its foot. */
export const MINE_LADDER = { room: SIB.mine, col: 26, gap: [25, 27], lip: 24 } as const;
/**
 * The miner on the east dock, Monty on the Run's walker with a window (Chris, 2026-11-24: "that guard really deserves some timing"). He works a seam cut into the east wall
 * (columns 29-30, rows 16-17: Monty Mole's coal bucket stands in it) and walks from it west under the ladder to the ledges' foot and back: x 128 to 144 (`MINER.from`, `.to`, in the enemies' x), a lap of about
 * 140 frames. The ledges' foot (columns 21-23) and the cart's dock are never on his beat; the ladder's foot is. From the ladder (safe above his head) Monty watches him walk
 * under it into the seam; come down while he is past the ladder (a window of about a second) and walk west, and he follows at half Monty's pace and turns back short of the ledges.
 */
export const MINER = { room: SIB.mine, col: 25, range: 34, seam: [29, 30], from: 128, to: 144 } as const;

// ---- the locomotive's steam ---------------------------------------------------------------------------------

/**
 * The train's path puzzle ends in the locomotive (Chris, 2026-11-26: "there's really no puzzle to the train involving the paths"; the boiler room "was confusing and weird"). Its one idea is the
 * steam: one pipe up the gap between the tender and the cab, and a valve that sends the steam out of its top or its bottom, never both, never neither. Out of the top (`high`: the find untaken, as
 * the game starts) it blows up from the cab's roof, across the roof's lane where the tender's coal meets the cab, higher than any jump; out of the bottom (`low`: taken) it blows up from the
 * footplate across the inside lane, the way from the tender's corridor into the cab. The wheel (`wheel`, `box`) is in a niche over the corridor's end, on the inside: a jump turns it.
 * So the two lanes each have half the answer. The roof reaches the tender's coal from the sleeper's roof, but the steam stops it at the cab, and the wheel is seen below, out of reach (the
 * coal is solid down to the corridor). The inside reaches the wheel (with the ticket), but turning it puts the steam across the inside's own way on (the obvious move fails, seen). So: the
 * wheel turned from inside, back through the sleeper, up the closet, east along the roof under the mountain, over the coal and across the quiet top of the pipe to the cab's roof, the boiler
 * and the tipple. Never a trap: the wheel is reached only from the inside's west side, which is the way back west whichever way it is set; the roof's east side (the cab's roof, the boiler,
 * the tipple and the mine) is reached only while the top is quiet, and nothing there turns it back.
 */
const STEAM_BOX: CellBox = { col0: 10, row0: 12, col1: 11, row1: 13 };
export const STEAM = {
  high: { col: 13, row: 2, cols: 3, rows: 7 },
  low: { col: 13, row: 12, cols: 3, rows: 5 },
  wheel: [10, 12],
  box: STEAM_BOX,
} as const;
/**
 * The tender and the cab: the coal's top (row 9, a crest at row 7) is the roof's lane from the sleeper's roof; under it the corridor (rows 15-16), roofed by the tender's plate (row 14) and
 * ending at its front plate (column 12) with the niche over it; the gap (13-15) where the pipe blows; the cab's roof (row 9, over the gap too) and the cab under it (16-23) with the stoker at
 * its firebox; the boiler from 24 (its top at row 11); the tipple's deck at row 4 with its ladder at 28 down to the boiler's top.
 */
export const CAB = { front: 12, gapFrom: 13, cabFrom: 16, roof: 9, boiler: 24, boilerTop: 11, deck: 4, tippleLadder: 28 } as const;
const STEAM_CODE = codeOf(TENDER_PALETTE, 'S');
/** A blowing outlet: always deadly while it blows (a period of 8 frames, all of it live: nothing to time, only the valve), at rest nothing at all. */
const blowing = (at: { col: number; row: number; cols: number; rows: number }): PulseSpec => ({
  room: SIB.coal, ...at, period: 8, start: 0, warn: 0, live: 8, idle: 0, warnCode: STEAM_CODE, liveCode: STEAM_CODE, spent: 0,
});
/** The two outlets, keyed by the find the valve flips (data.ts gives it: untaken, the steam blows out of the top over the roof; taken, out of the bottom over the footplate). */
export const steamPulses = (low: number): readonly PulseSpec[] => [{ ...blowing(STEAM.high), calmedBy: low }, { ...blowing(STEAM.low), calmedUntil: low }];
/** The valve's wheel, a switch on that find. */
export const steamSwitches = (low: number): readonly SwitchSpec[] => [{ room: SIB.coal, box: STEAM.box, find: low }];
/** The steam billows (its character's two pictures in turn). */
export const STEAM_ANIM: CharAnim = { kind: 'cycle', room: SIB.coal, chars: [STEAM_CODE], frames: STEAM_FRAMES, every: 3 };

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
      ['roofVent', 5, 8], ['stovepipe', 19, 6], ['roofVent', 28, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 5, row: 15, way: 'right', speed: 1, range: 96, colour: 10 },
      { who: 'samovar', col: 27, row: 11, way: 'down', speed: 1, range: 32, colour: 15 },
    ],
  }),

  // B SLEEPER HIT: the sleeper: the set piece and the puzzle. The roof again, running on east onto the tender's coal; two hatches, into the luggage closet (it shelters him from one
  // sweep; he stands on its bolted floor) and the vestibule at the east end (the shelter on the way to the tender); the pine by the line at 20-21, rising from behind the car up to the yeti's cave. Below, cut away, the
  // corridor, shut at both ends (the dining car's gangway bolted, the inspector in the east one: he wants a ticket), the closet's bolted floor over it, the provodnitsa pacing
  // from the berth to the coin. With the ticket the closet's floor opens: the roof is crossed twice under the mountain, east to the pine and back west to the closet. A coin in
  // each lane: over the roof between the closet and the pine (a jump, on the run back west from the pine), and in front of the inspector below.
  room({
    id: SIB.sleeper, cell: [1, 5], sector: 10, palette: SLEEPER_PALETTE,
    shut: [['left', 15, 16, 'T']], // the dining car's bolted gangway
    paint(g) {
      g.box(0, CAR.roof, 31, CAR.roof, 'D'); // the roof's walkway, on east onto the tender's coal
      farWall(g, 2, 29);
      g.box(2, CAR.roof + 1, 29, CAR.roof + 1, 'T'); // the car's eaves under the walkway, solid: nothing on the roof (off the pine's foot, off the closet's ladder) slips under it into the car
      g.box(0, 10, 1, 14, 'T').box(30, 10, 31, 14, 'T');
      g.box(0, CAR.floor, 31, CAR.floor, 'T');
      inspectors(g, SIB.sleeper);
      well(g, CLOSET);
      well(g, VESTIBULE);
      g.box(PINE.cols[0], 0, PINE.cols[1], CAR.roof - 1, 'P'); // the pine's trunk up through the sky to the cave
    },
    coins: [[16, 5], [27, 15]],
    decor: [
      ...skyDecor(SKY_SLEEPER), windowAt(2), windowAt(13), windowAt(18), ['bunk', 16, 15],
      ['roofVent', 6, 8], ['roofVent', 15, 8], ...CAR_FITTINGS,
    ],
    creatures: [
      { who: 'inspector', col: 16, row: 15, way: 'right', speed: 1, range: 64, colour: 10 },
      { who: 'inspector', col: 30, row: 15, way: 'down', speed: 0, range: 8, colour: 1 },
      { who: 'agent', col: 0, row: 7, way: 'right', speed: 1, range: 1 }, // Viktor Vole, onto the roof behind him (viktor.ts `trainPursuer`: he walks Monty's path, not a patrol)
    ],
  }),

  // C COAL COMFORT: the tender and the locomotive, where the train's two lanes meet the steam (STEAM). The roof's lane comes in from the sleeper's roof over the tender's coal (its crest a
  // jump) to the gap where the pipe blows out of its top, higher than a jump; beyond, the cab's roof, the boiler's top and the tipple's ladder. The inside's lane comes in through the
  // gangway (the inspector's, the ticket) along the tender's corridor under the coal to the valve's wheel in its niche (a jump turns it) and on, while the steam is up top, across the
  // footplate into the cab, the stoker at the firebox and a coin by the gauge. Turned, the steam blows out of the bottom across that way: the roof's way is the one that is open now.
  // The boiler, its chimney and the big driving wheels beyond; the night behind is plain black but for the moon and the smoke trailing back.
  room({
    id: SIB.coal, cell: [1, 6], sector: 11, palette: TENDER_PALETTE,
    shut: [['right', 17, 19, 'M']], // (the mine's rock beside it, under the line)
    paint(g) {
      g.box(0, CAB.roof, CAB.front - 1, 13, 'K').box(4, 7, 7, 8, 'K'); // the coal, heaped to a crest, solid down to the corridor's roof
      g.box(0, 10, 1, 14, 'T').box(2, 14, CAB.front - 1, 14, 'T').box(CAB.front, CAB.roof, CAB.front, 14, 'T'); // the tender's end over its gangway, the corridor's roof and the front plate
      inspectors(g, SIB.coal);
      g.clear(STEAM.box.col0, STEAM.box.row0, STEAM.box.col1, 14); // the niche over the corridor's end, where the wheel is
      g.box(0, CAR.floor, CAB.boiler - 1, CAR.floor, 'T'); // the tender's floor and the cab's footplate
      g.box(CAB.gapFrom, CAB.roof, CAB.boiler - 1, CAB.roof, 'D'); // the cab's roof, reaching back over the gap to the tender
      g.box(CAB.cabFrom, CAB.roof + 1, CAB.cabFrom, 14, 'T').box(CAB.boiler - 1, CAB.roof + 1, CAB.boiler - 1, 14, 'T'); // the cab's back and front, carrying its roof, its doorway and the firebox under them
      g.box(CAB.boiler, CAB.boilerTop, 31, 16, 'B'); // the boiler (its top a step down from the cab's roof)
      g.box(31, 5, 31, CAB.boilerTop - 1, 'M'); // the hillside the mine is in, beyond the smokebox
      g.box(CAB.boiler, CAB.deck, 31, CAB.deck, 'W').clear(CAB.tippleLadder - 1, CAB.deck, CAB.tippleLadder + 1, CAB.deck).box(CAB.tippleLadder, CAB.deck, CAB.tippleLadder, CAB.boilerTop - 1, 'R'); // the tipple's deck, its gap and ladder
    },
    coins: [[20, 13]],
    decor: [
      ...skyDecor(SKY_TENDER), ['valveWheel', STEAM.wheel[0], STEAM.wheel[1]], ['steamPipe', CAB.gapFrom, 10], ['cabGauge', 21, 10], ['cabFire', 22, 15], ['chimney', 29, 9],
      ...Array.from({ length: CAB.boilerTop - CAB.deck - 1 }, (_, i): Placed => ['tippleLeg', CAB.boiler, CAB.deck + 1 + i]), // the tipple's leg, down behind the boiler (its east end is on the hill)
      ...underCar(0, CAB.boiler - 1, TENDER_BOGIES), ['drivingWheel', 25, 17], ['drivingWheel', 28, 17],
    ],
    creatures: [
      { who: 'miner', col: 18, row: 15, way: 'right', speed: 1, range: 24, colour: 7 }, // the stoker, to and from the firebox, clear of the cab's low doorway: over him to the coin and back
      { who: 'bat', col: 19, row: 2, way: 'down', speed: 1, range: 40 }, // a bat dropping over the cab's roof and up again: under it while it is up (a bat along the roof would close it, nowhere to pass)
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
  // the rock; the ladder down its shaft from the gantry's end to the east dock, where a miner walks from his seam in the east wall under the ladder and back (wait on the ladder
  // while he goes into the seam, then down and west: MINER); timber ledges up from the dock to a coin, off his beat (Monty Mole's coal bucket in the seam); the cart west along
  // the low gallery over the flooded working to the west dock, its coin seen from the gantry on the way in; and the rope down through the dock's gap to the river. Two air shafts
  // through the rock join the tunnels, a bat going up and down each, across the gantry and down over the cart.
  room({
    id: SIB.mine, cell: [1, 7], sector: 14, palette: MINE_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 0, 'K').box(29, 0, 31, 19, 'K'); // the rock over the gantry; the east wall (China's tower is beyond)
      g.clear(MINER.seam[0], 16, MINER.seam[1], 17); // the miner's seam, cut into the east wall at the dock
      g.box(0, 5, 0, 17, 'K').box(1, 5, 7, 7, 'K'); // the west wall under the gantry, and the rock it is cut through
      g.box(0, 4, MINE_LADDER.gap[0] - 1, 4, 'B'); // the gantry
      g.box(MINE_LADDER.col, 4, MINE_LADDER.col, 17, 'R'); // the ladder from its end
      g.box(0, 18, 28, 19, 'K'); // the gallery's floor
      g.clear(MINE_ROPE.gap[0], 18, MINE_ROPE.gap[1], 19).box(MINE_ROPE.col, 18, MINE_ROPE.col, 19, 'P'); // the west dock's gap and the rope
      g.clear(CART.span.from, 18, CART.span.to, 19).box(CART.span.from, 19, CART.span.to, 19, 'W'); // the flooded working
      g.box(21, 16, 23, 16, 'B').box(22, 14, 23, 14, 'B'); // timber ledges up from the east dock
      g.box(1, 5, MINE_LADDER.lip, 11, 'K').box(8, 12, MINE_SHAFTS[1] + 2, 12, 'K'); // the rock between the gantry and the gallery: the gallery's low ceiling, up to the east shaft (open over the ledges)
      g.box(MINE_LADDER.lip, 12, MINE_LADDER.lip, 15, 'K').box(MINE_LADDER.gap[1] + 1, 4, MINE_LADDER.gap[1] + 1, 15, 'K'); // the ladder's shaft, three wide down to the dock's headroom (no way off the ladder but at its foot)
      g.clear(MINE_SHAFTS[0], 5, MINE_SHAFTS[0] + 2, 12).clear(MINE_SHAFTS[1], 5, MINE_SHAFTS[1] + 2, 12); // the air shafts, three wide
    },
    coins: [[2, 16], [23, 12]],
    decor: [
      ['coalBucket', MINER.seam[0], 16], // (in the miner's seam: he walks in front of it to fill it)
      ...Array.from({ length: CART.span.to - CART.span.from + 1 }, (_, i): Placed => ['rail', CART.span.from + i, CART.row]), ['mineCart', CART.span.from, CART.row - 1],
    ],
    creatures: [
      { who: 'bat', col: MINE_SHAFTS[0], row: 1, way: 'down', speed: 1, range: 104 },
      { who: 'bat', col: MINE_SHAFTS[1], row: 14, way: 'up', speed: 1, range: 104 },
      { who: 'miner', col: MINER.col, row: 16, way: 'right', speed: 1, range: MINER.range }, // from the ledges' foot under the ladder into his seam and back
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
  // OFF THE BEATEN PATH: the taiga off the trail west of the border village, a bonus room (Chris, 2026-11-25: a room with "some sort of cool background design" where the bank ran off
  // into nothing; "an opportunity to try some new things"). In along the trail from the village; the northern lights over the pines. The snow-laden boughs zig-zag up the pines to the
  // eagle owl's nest (a coin: it tops the climb), and every bough sheds its snow under him if he stops (TAIGA_BOUGHS): a climb of hops that never stops. A second coin waits at the east
  // end of the third bough under the icicle. A crag ends the trail at the west. Never needed: back the way he came.
  room({
    id: SIB.taiga, cell: [2, 6], sector: SIB.taiga, palette: TAIGA_PALETTE,
    paint: paintTaiga,
    coins: TAIGA_COINS,
    decor: [
      ...auroraCurtain(TAIGA_COINS),
      ...TAIGA.trunks.flatMap((c) => fillCells(paintTaiga, TAIGA_COINS, [c, c === 23 ? 6 : 5, c, 16], 'taigaTrunk')),
      ...TAIGA_PINES, ['eagleOwl', 24, 3],
      ['star', 6, 1], ['starDim', 12, 0], ['star', 28, 6], ['starDim', 19, 5], ['starDim', 30, 1],
    ],
    creatures: [
      { who: 'reindeer', col: 3, row: 15, way: 'right', speed: 1, range: 32 }, // (between the crag and the second pine's trunk: never in front of a trunk's brown)
    ],
  }),
];
