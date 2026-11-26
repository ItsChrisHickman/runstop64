import type { CableCarSpec, CharAnim, FloatSpec, LeverSpec, PursuerSpec, RollerSpec, SkewerSpec } from '../../montyotr/src/montydata';
import { BOULDER_POINTERS } from './andes-pointers';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { GRILL_ANIM, RIO_DECOR } from './art/rio-decor';
import { SKEWER_POSES } from './art/rio-items';
import type { WorldDecor } from './art/world';
import { asBackdrop, codeOf, decorIndex, fillCells, type Grid, room, type Palette } from './layout';
import { CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS, SPLIT_POINTERS } from './rio-pointers';

/**
 * Rio, the seventh and last region of Do Svidaniya Monty (docs/dosvidaniya-reset.md, "Rio (the last level)"): six rooms and the beach, at night on black, in a block at columns 23-28 of the exit grid (rows 4-5), entered from the
 * Amazon's kapok (the Andes' [5,22]: off the crown's branch, floor 8) and ending on the beach, where the game ends.
 *
 *            col 23             24                  25                   26              27                 28
 *   row 4                                         W STEAK YOUR CLAIM
 *   row 5   C OPEN ARMS        F HOUSE OF COLOUR   L THE LAPA ARCHES    S SUGAR RUSH    D SPY VERSUS MOLE  B RIO OR BUST
 *
 * The route: up the Redeemer and off his east hand (C); down through the favela, the region's tightest room (F); along Lapa's street under the arches, the tram's track high above and out of reach (L); the cable car's winch
 * dead behind its bars at Sugarloaf's foot (S); up the climbers' rope and west onto the track, across its gap on the tram, up the ladder into the churrascaria at the top of the arches, past the gauchos' skewers to the
 * spit's crank and back past them (W); down through the gap to the street (one way) and back to Sugarloaf, where the crank works the winch: the car up to the top station (S); the showdown in the Sambadrome, the agent on
 * his trail (D); and the beach (B). The crank is used twice: the winch, then the Sambadrome's control booth, which makes the float's lever live.
 *
 * Playfield cells as in moscow.ts; a floor "F" is the row he stands on (his body is on rows F-2 and F-1). Each room is painted from its rows of palette letters ('.' empty). The tram (floats.ts, over the track's gap), the
 * cable car (cablecars.ts), the gauchos' skewers (skewers.ts), the stones falling from Lapa's broken span (rollers.ts), the agent (pursuers.ts) and the float's lever and its held head (levers.ts, mechanisms.ts) are data of the engine.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped (the tables are built by id). The rebuild keeps 68, 69, 71, 73, 74, 75 and 77; 67 (QUAY TO THE CITY), 70 (SUGARLOAF SUMMIT), 72 (MONKEY BUSINESS) and 76 (FLOAT YOUR BOAT)
 * are retired (save-migrate.ts carries a save in one on in a kept room).
 */
export const RIO_ROOM = { lap: 68, sugar: 69, arms: 71, colour: 73, steak: 74, drum: 75, bust: 77 } as const;
/** The first room of the region (the way in from the Amazon). */
export const RIO_FIRST = RIO_ROOM.arms;
/** Whether a room is one of Rio's (its ids run 67-77, the retired ones among them). */
export const isRio = (room: number): boolean => room >= 67 && room <= 77;

/** The sectors' names by their place from 67 (as the ids: the retired rooms' places are empty, so no later sector moves). */
const NAMES = ['', 'THE LAPA ARCHES', 'SUGAR RUSH', '', 'OPEN ARMS', '', 'HOUSE OF COLOUR', 'STEAK YOUR CLAIM', 'SPY VERSUS MOLE', '', 'RIO OR BUST'] as const;
export const RIO_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (Lapa's white, Sugarloaf's blue, the Redeemer's white, the favela's pink, the restaurant's red, the carnival's yellow, the beach's sand; the retired rooms' unused). */
export const RIO_COLOURS: readonly number[] = [0, 1, 14, 0, 1, 0, 10, 2, 7, 0, 8];

// ---- painting ------------------------------------------------------------------------------------------

/** A room's rows of palette letters, painted ('.' empty). Each is 32 letters and there are 20. */
function rows(r: readonly string[]): (g: Grid) => void {
  if (r.length !== 20 || r.some((line) => line.length !== 32)) throw new Error('a Rio room is 20 rows of 32 letters');
  return (g) => r.forEach((line, row) => [...line].forEach((ch, col) => { if (ch !== '.') g.box(col, row, col, row, ch); }));
}

type Cell = readonly [col: number, row: number];
type Placed = readonly [WorldDecor | { text: string; colour: number }, col: number, row: number];

// Lapa's arches and Sugarloaf seen from the beach are backdrops: a coin in them keeps them round it
const ARCH_UPPER = asBackdrop('lapaUpper'), ARCH_BASE = asBackdrop('lapaBase');

// ---- the palettes --------------------------------------------------------------------------------------

export const ARMS_PALETTE = {
  J: ['jungleLeaf', 5], G: ['mossGround', 5], W: ['soapstone', 1], P: ['pedestal', 12], L: ['woodLadder', 8], R: ['granite', 11], K: ['graniteBack', 11], V: ['vine', 13],
} as const satisfies Palette;

export const HILL_PALETTE = {
  P: ['plaster', 10], Y: ['plaster', 7], B: ['facade', 14], G: ['plaster', 13], R: ['favelaTile', 2], L: ['woodLadder', 8], S: ['paradeStreet', 8],
} as const satisfies Palette;

export const LAPA_PALETTE = {
  B: ['restBrick', 2], T: ['aqueductTop', 1], D: ['floatDeck', 7], L: ['woodLadder', 8], W: ['quayStone', 12],
} as const satisfies Palette;

export const STEAK_PALETTE = {
  B: ['restBrick', 2], F: ['restTile', 2], S: ['barrel', 9], L: ['woodLadder', 8],
} as const satisfies Palette;

export const SUGAR_PALETTE = {
  N: ['sand', 7], G: ['granite', 12], H: ['stationFloor', 1], T: ['stationGate', 2], V: ['vine', 8], L: ['woodLadder', 8], K: ['graniteBack', 6],
} as const satisfies Palette;

export const DRUM_PALETTE = {
  S: ['riser', 4], A: ['paradeStreet', 8], E: ['stationFloor', 1], F: ['floatDeck', 7], B: ['stationGate', 2], V: ['vine', 8], L: ['woodLadder', 8], Y: ['graniteBack', 7],
} as const satisfies Palette;

export const BEACH_PALETTE = {
  W: ['wavePavement', 1], S: ['sand', 7], E: ['seaSwell', 6], T: ['tableTop', 1], U: ['palmTrunk', 9], L: ['palmLeft', 5], R: ['palmRight', 5], K: ['graniteBack', 6],
} as const satisfies Palette;

// ---- C OPEN ARMS ----------------------------------------------------------------------------------------
/**
 * Corcovado, Tijuca's forest at its foot: in high on the canopy at the west (floor 8), down to the forest floor (14) beside the liana that climbs back up to the canopy (the way back to the Amazon); east through the chapel
 * under the pedestal, up the maintenance ladder on the Redeemer's east side (col 20) to his east arm (floor 4), along it under the vulture's dive and the bat flitting at the hand, and off the hand onto the ledge (8),
 * out east. A second ladder (col 11) climbs to the west arm, where a marmoset scampers to and fro by the snack on its hand (jump him or time him).
 */
const ARMS = rows([
    'JJ..............................', // 0
    'JJ.............WW...............', // 1
    'JJ.............WW...............', // 2
    'JJ.............WW...............', // 3
    'JJ..WWWWWW.L.WWWWWW.L.WWWWWWWW..', // 4
    'JJ.....WWW.L..WWWW..L.WWW.......', // 5
    '...........L..WWWW..L...........', // 6
    '...........L..WWWW..L...........', // 7
    'JJJJJJJ.V..L..WWWW..L.......RRRR', // 8
    'JJ......V..L.PPPPPP.L.......RRRR', // 9
    'JJ......V..L.PPPPPP.L.......RRRR', // 10
    'JJ......V..L.PPPPPP.L.......RRRR', // 11
    'JJ......V..L.KKKKKK.L.......RRRR', // 12
    'JJ......V..L.KKKKKK.L.......RRRR', // 13
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 14
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 15
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 16
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 17
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 18
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 19
]);
const ARMS_SNACK: Cell = [4, 2];
const ARMS_COINS: readonly Cell[] = [[3, 13], [28, 3]];

// ---- F HOUSE OF COLOUR ----------------------------------------------------------------------------------
/**
 * The favela, the tightest room, a switchback down: in high on the pink roof (floor 8), east over the light well (cols 11-13, the football bouncing up out of it: a jump) onto the yellow roof, off its east end down the
 * open lane where the kite dips (to floor 14), back west along the alley under the houses past the macaw to the ladder's hole (col 4), down to the lane (18), east under the houses and out low. The houses are plain
 * plaster; only the blue house on the yellow roof has windows. The snack is in the tank's pocket past the ladder's hole, the coin in the macaw's alley.
 */
const HILL = rows([
    '................................', // 0
    '................................', // 1
    '..............................GG', // 2
    '..............................GG', // 3
    '..............................GG', // 4
    '..............................GG', // 5
    '..............................GG', // 6
    '..............................GG', // 7
    'RRRRRRRRRRR.....RRRRRRRRRR....GG', // 8
    'PPPPPPPPPPP.....YYY...BBBB....GG', // 9
    'PPPPPPPPPPPPPPPPYYY...BBBB....GG', // 10
    'PPPPPPPPPPPPPPPPYYY...BBBB....GG', // 11
    'G.............................GG', // 12
    'G.............................GG', // 13
    'GGG.L.GGGGGGGGGGGGGGGGGGGGGGGGGG', // 14
    'GGG.L.GGGGGGGGGGGGGGGGGGGGGGGGGG', // 15
    'GG..L...........................', // 16
    'GG..L...........................', // 17
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 18
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 19
]);
const HILL_SNACK: Cell = [1, 12];
const HILL_COINS: readonly Cell[] = [[20, 13]];

// ---- L THE LAPA ARCHES ----------------------------------------------------------------------------------
/**
 * The aqueduct: the street (floor 18) under its arches, the tram's track on top (floor 8) with a gap at cols 12-17 the tram crosses; stones work loose from the broken span and fall through the gap onto the street,
 * rolling west along it. The churrascaria's red brick building stands at the west edge, its ladder (col 5) up from the track's west part into its floor.
 */
const LAPA = rows([
    'BBBB.L..........................', // 0
    'BBBB.L..........................', // 1
    'BBBB.L..........................', // 2
    'BBBB.L..........................', // 3
    'BBBB.L..........................', // 4
    'BBBB.L..........................', // 5
    'BBBB.L..........................', // 6
    'BBBB.L..........................', // 7
    'BBBBTTTTTTTT......TTTTTTTTTTTTTT', // 8
    'BBBB............................', // 9
    'BBBB............................', // 10
    'BBBB............................', // 11
    'BBBB............................', // 12
    'BBBB............................', // 13
    'BBBB............................', // 14
    'BBBB............................', // 15
    '................................', // 16
    '................................', // 17
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 18
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 19
]);
const LAPA_COINS: readonly Cell[] = [[8, 7], [21, 17]];

// ---- W STEAK YOUR CLAIM ---------------------------------------------------------------------------------
/**
 * The churrascaria at the top of the arches, a dead end: in up the ladder through the floor (col 5) onto the dining floor (18), the first gaucho's lane between the tables, the step (16), the ladder (col 18) up beside the
 * grill's platform (8) where the second gaucho's skewer swings over the ladder's head, the spit's crank at its end.
 */
const STEAK = rows([
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // 0
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // 1
    'BB............................BB', // 2
    'BB............................BB', // 3
    'BB............................BB', // 4
    'BB............................BB', // 5
    'BB............................BB', // 6
    'BB............................BB', // 7
    'BB................L.SSSSSSSSSSBB', // 8
    'BB................L.SSSSSSSSSSBB', // 9
    'BB................L.SSSSSSSSSSBB', // 10
    'BB................L.SSSSSSSSSSBB', // 11
    'BB................L.SSSSSSSSSSBB', // 12
    'BB................L.SSSSSSSSSSBB', // 13
    'BB................L.SSSSSSSSSSBB', // 14
    'BB................L.SSSSSSSSSSBB', // 15
    'BB..............SSSSSSSSSSSSSSBB', // 16
    'BB..............SSSSSSSSSSSSSSBB', // 17
    'FFFF.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 18
    'FFFF.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 19
]);
const STEAK_CRANK: Cell = [28, 6];
const STEAK_COINS: readonly Cell[] = [[14, 17]];

// ---- S SUGAR RUSH ---------------------------------------------------------------------------------------
/**
 * Praia Vermelha at Sugarloaf's foot: in low on the sand (18) under the climbers' rock, the ladder (col 10) to the lower station's shelf (14) behind its bars (the winch, dead without its crank), the climbers' rope (col 4)
 * up its cleft between two granite pillars to the ledge (8) and out west onto Lapa's track (the ledge's west end overhangs its pillar by a cell, open under it as Lapa's arches are at the join); the car to the top station (8), where a marmoset leaps down off the rock, and out east.
 */
const SUGAR = rows([
    '....................KKK.........', // 0
    '...................KKKKK........', // 1
    '..................KKKKKKK.......', // 2
    '..................KKKKKKKK......', // 3
    '............TT...KKKKKKKKK......', // 4
    '............TT...KKKKKKKKK......', // 5
    '............TT...KKKKKKKKK......', // 6
    '............TT...KKKKKKKK.......', // 7
    'GGG.V.GG....TT...KKKKKK.GGGGGGGG', // 8
    '.GG.V.GG....TT...KKKK......GGGGG', // 9
    '.GG.V.GG....TT...KK........GGGGG', // 10
    '.GG.V.GG....TT.............GGGGG', // 11
    '.GG.V.GG....TT.............GGGGG', // 12
    '.GG.V.GG....TT.............GGGGG', // 13
    '.GG.V.GG..L.HHHHHHH........GGGGG', // 14
    '.GG.V.GG..L.HHHHHHH........GGGGG', // 15
    '....V.....L................GGGGG', // 16
    '....V.....L................GGGGG', // 17
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN', // 18
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN', // 19
]);
const SUGAR_COINS: readonly Cell[] = [[7, 7]];

// ---- D SPY VERSUS MOLE (the Sambadrome) --------------------------------------------------------------------
/** The showdown: in high on the stand's ledge (8) from the cable car's top station, over the drum riser where the drummer beats (he stands on it at the bottom of each bounce); the rope (col 13) down to the avenue (18), under the float's held head (cols 15-20) to its lever (col 23), the ladder (col 25) up to the control booth (4, the crank's socket), west along the lighting gantry past the dancer to the headdress at its west end (taken with the agent already on his trail) and down the rope again; then the puzzle (levers.ts): a walker is out from under the head before it lands, so Monty stands under it himself, goes to the lever, and pulls as Viktor, walking his path, stops there too. The booth stands on its column (col 29) over the bars (cols 28-29); they lift and the avenue runs on east to the beach. The float hangs from the gantry by two chains. */
const DRUM = rows([
    '................................', // 0
    '...........................SSSS.', // 1
    '..............................S.', // 2
    '..............................S.', // 3
    '.............V.EEEEEEEEE.L.EEES.', // 4
    '.............V...........L...S..', // 5
    '.......SSS...V...........L...S..', // 6
    '.......SSS...V...........L...S..', // 7
    'EEEEEEEEEEEE.V...........L...S..', // 8
    'SS...........V.FFFFFF....L...S..', // 9
    'SS...........V...........L...S..', // 10
    'SS...........V...........L...S..', // 11
    'SS...........V...........L...S..', // 12
    'SS...........V...........L...S..', // 13
    'SS...........V...........L..BB..', // 14
    'SS...........V...........L..BB..', // 15
    'SS...........V...........L..BB..', // 16
    'SS...........V...........L..BB..', // 17
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 18
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 19
]);
const DRUM_HEADDRESS: Cell = [16, 2];
const DRUM_COINS: readonly Cell[] = [[18, 8]];

// ---- B RIO OR BUST --------------------------------------------------------------------------------------
/** Copacabana at night: in low on the promenade (18), the bowl on its little table a few steps in, a beach umbrella at the east end, a palm, the sea, the Redeemer on Corcovado's dark hill and Sugarloaf floodlit across the bay. No coins, no creatures: the finale's stage (finale.ts shows it in close-up: the table, the palms and the near sea cleared, the sand plain, the deckchair under the umbrella). */
const BEACH = rows([
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '................................', // 3
    '................................', // 4
    '................................', // 5
    '................................', // 6
    '................................', // 7
    '................................', // 8
    '...............KK...............', // 9
    '..............KKKK.LUR..........', // 10
    '.............KKKKKK.U...........', // 11
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEEEE', // 12
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEEEE', // 13
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEEEE', // 14
    '....................U...........', // 15
    '....................U...........', // 16
    '..........TTT.......U...........', // 17
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 18
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 19
]);
const BEACH_BOWL: Cell = [10, 15];
/** Where the finale's parts are on the beach (playfield cells): the Redeemer and Sugarloaf across the bay (it floodlights them), the umbrella (its canopy and its pole) the deckchair stands under, and the fireworks over the bay. */
const FIREWORKS: readonly Cell[] = [[1, 2], [10, 0], [18, 1], [26, 1]];
export const BEACH_VIEW = {
  redeemer: { col: 14, row: 6, w: 4, h: 3 }, sugarloaf: { col: 3, row: 7, w: 8, h: 5 }, umbrella: { col: 23, row: 10 }, pole: { col: 26, row: 12 },
  fireworks: FIREWORKS,
} as const;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/** Sugarloaf's cable car: one car on the cable from the lower station's foot (cols 15-16, floor 14) to the top station's (cols 25-26, floor 8), 160 frames across. The roof behind him on sprite 6, the floor and rail in front on sprite 2. */
export const CABLE_CAR: CableCarSpec = {
  room: RIO_ROOM.sugar, low: { col: 15, row: 14 }, high: { col: 25, row: 8 }, frames: 160,
  roof: { ptr: CAR_POINTERS.roof, sprite: 6 }, floor: { ptr: CAR_POINTERS.floor, sprite: 2 }, colour: 1,
  dx: -4, roofDy: -17, floorDy: 4,
};
/** The bars of the winch house on the shelf (cols 12-13, rows 4-13): the crank takes them away. */
export const GATE_CELLS: readonly (readonly [row: number, col: number])[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13].flatMap((row) => [12, 13].map((col) => [row, col] as const));
/** The sign CLOSED over the bars (a board of the word between a space each side: cols 10-17, row 3, on the bars' tops): it comes down with them. */
export const CLOSED_SIGN = { text: 'CLOSED', col: 10, row: 3 } as const;
export const CLOSED_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: CLOSED_SIGN.text.length + 2 }, (_, k) => [CLOSED_SIGN.row, CLOSED_SIGN.col + k] as const);

/** The cable's line: a row up every two cells, from the lower station's roof (col 19, row 10) to the top station's platform (col 23, row 8), under Sugarloaf's dome. */
const cableLine = (): Placed[] => Array.from({ length: 5 }, (_, k): Placed => [k % 2 === 0 ? 'rioCableLow' : 'rioCableHigh', 19 + k, 10 - Math.floor(k / 2)]);

/**
 * Santa Teresa's tram on the track (L): a float (floats.ts) that goes there and back over the track's gap, its deck at the track's height (row 8), from the east part (its right end on cols 18-21) to the west part (its
 * left end on cols 8-11), a cell every 8 frames, resting at each end. He boards it on the east part and steps off on the west. Where the room lists its picture: the sky at the top right.
 */
const TRAM_HOME = [26, 0] as const;
export const TRAM: FloatSpec = {
  room: RIO_ROOM.lap, row: 8, span: { from: 8, to: 21 }, dir: -1, step: 8, every: 0, w: RIO_DECOR.rioTram.w, h: RIO_DECOR.rioTram.h, offset: 0,
  deck: codeOf(LAPA_PALETTE, 'D'), decor: decorIndex('rioTram'), home: TRAM_HOME, bounce: { hold: 10 },
};

/**
 * The broken span's loose stones (L; `rollers`, sprite 1: the room's two creatures have 4 and 5): a block of the aqueduct's white limestone works loose at the track's gap, falls through it to the street and rolls west
 * along it and out of the picture, every 200 frames. Read on the first crossing (it comes at him; a hop clears it), and again when he drops through the gap. The Andes' boulder's pictures, in Lapa's white.
 */
export const LAPA_STONE: RollerSpec = { room: RIO_ROOM.lap, sprite: 1, path: [[14, 8], [14, 16], [-3, 16]], speed: 2, every: 200, start: 40, frames: BOULDER_POINTERS, colour: 1 };

/** The churrascaria's grill: the meat turns, the flames flicker. */
export const RIO_ANIMS: readonly CharAnim[] = [
  { kind: 'cycle', room: RIO_ROOM.steak, chars: GRILL_ANIM.cells.map((cell) => ({ decor: decorIndex('rioGrill'), cell })), frames: GRILL_ANIM.frames, every: 12 },
];

/**
 * The gauchos' skewers (W): a skewer swings every 80 frames through four poses a 20 frames each (a step quicker than any timing before Rio) (down, forward and low, straight out, up): the middle two deadly. The grill's gaucho (slot 0) and the dining floor's (slot 1) are
 * half a cycle apart, each on a sprite of his own (2 and 1: the crank takes 0).
 */
const poses = SKEWER_POSES.left.map((left, i) => {
  const right = SKEWER_POSES.right[i], leftPtr = SKEWER_POINTERS.left[i], rightPtr = SKEWER_POINTERS.right[i];
  if (!right || leftPtr === undefined || rightPtr === undefined) throw new Error('a skewer pose without its mirror or its pointer');
  return {
    left: { ptr: leftPtr, dx: left.dx, dy: left.dy, hit: left.hit },
    right: { ptr: rightPtr, dx: right.dx, dy: right.dy, hit: right.hit },
    deadly: i === 1 || i === 2,
  };
});
export const SKEWERS: readonly SkewerSpec[] = [
  { room: RIO_ROOM.steak, slot: 0, sprite: 2, cycle: 80, offset: 0, colour: 8, poses },
  { room: RIO_ROOM.steak, slot: 1, sprite: 1, cycle: 80, offset: 40, colour: 8, poses },
];

/** The Sambadrome's float: its two crusher shafts (cols 15-17 and 18-20, rows 12-17: one head), the lever (col 23, rows 16-17), the booth's socket (cols 27-29, rows 2-3), the bars (cols 28-29, rows 14-17), the booth's window lit. */
export const FLOAT_HEAD = { cols: [15, 18], row: 12, height: 6 } as const;
export const BARS_CELLS: readonly (readonly [row: number, col: number])[] = [14, 15, 16, 17].flatMap((row) => [28, 29].map((col) => [row, col] as const));
export const BOOTH_LIGHT: readonly (readonly [row: number, col: number])[] = [[2, 27], [2, 28], [2, 29]];
export const LIT_CODE = codeOf(DRUM_PALETTE, 'Y');
/** The lever and the booth, keyed by the finds' numbers (data.ts gives them: the crank, and the two hidden finds that say the crank is fitted and the agent squashed). */
export const leverOf = (crank: number, fitted: number, squashed: number): LeverSpec => ({
  room: RIO_ROOM.drum, lever: { col: 23, row: 16 }, booth: { col0: 27, row0: 2, col1: 29, row1: 3 }, key: crank, armed: fitted, done: squashed,
});
/**
 * Viktor Vole (the room's third creature, slot 2: sprite 6) on Monty's path 125 frames (two and a half seconds) behind, from when he leaves the stand's ledge and the riser (cols 0-11, rows 0-8). As Monty comes in
 * he walks on at the avenue's far end beyond the bars (col 30, floor 18), looks across at him while the room's name flashes, and walks off; the chase starts as Monty leaves the ledge. He is escaped only by the
 * float's head, and only standing under it (levers.ts: a walker under it is out before it lands): he goes in Monty's four-way split, on sprites 6, 1 and 2 and the dancer's 5 (back, on, up, down).
 */
export const SHOWDOWN = { delay: 125, intro: { from: 33, at: { col: 30, row: 18 }, to: 33, pose: 'look', hold: 60 } } as const;
export const pursuerOf = (squashed: number): PursuerSpec => ({
  room: RIO_ROOM.drum, slot: 2, delay: SHOWDOWN.delay, calm: { col0: 0, row0: 0, col1: 11, row1: 8 }, until: squashed,
  split: { sprites: [6, 1, 2, 5], pictures: SPLIT_POINTERS }, intro: SHOWDOWN.intro,
});

// ---- the rooms ----------------------------------------------------------------------------------------------

/** Lapa's arches standing on the street: an upper storey (rows 9-12) on a lower (rows 13-17), every four columns, out to the picture's edge. */
const arches = (): Placed[] => [
  ...[4, 8, 12, 16, 20, 24, 28, 32].flatMap((col): Placed[] => [[ARCH_UPPER, col, 9], [ARCH_BASE, col, 13]]),
  ...fillCells(LAPA, [], [0, 16, 1, 17], 'rioShade'), // (the street's dark under the townhouse, to the picture's edge)
];

export const RIO_ROOMS: readonly RoomSpec[] = [
  // L THE LAPA ARCHES: crossed twice, the street first (the track seen, out of reach), then the track on the tram
  room({
    id: RIO_ROOM.lap, cell: [5, 30], sector: 68, palette: LAPA_PALETTE, paint: LAPA,
    coins: LAPA_COINS,
    decor: [...arches(), ['rioTram', TRAM_HOME[0], TRAM_HOME[1]]],
    creatures: [{ who: 'capoeirista', col: 24, row: 16, way: 'left', speed: 1, range: 150 }, { who: 'rioBat', col: 20, row: 9, way: 'down', speed: 1, range: 56 }],
  }),

  // S SUGAR RUSH: visited twice, the sand and the climbers' rope, then the car
  room({
    id: RIO_ROOM.sugar, cell: [5, 31], sector: 69, palette: SUGAR_PALETTE, paint: SUGAR,
    coins: SUGAR_COINS,
    decor: [['cableStation', 15, 11], ['cableStation', 26, 5], ...cableLine(), [{ text: CLOSED_SIGN.text, colour: 2 }, CLOSED_SIGN.col, CLOSED_SIGN.row]],
    creatures: [
      { who: 'vulture', col: 20, row: 1, way: 'down', speed: 1, range: 88 }, { who: 'marmoset', col: 29, row: 1, way: 'down', speed: 1, range: 40 },
      { who: 'macaw', col: 7, row: 1, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // C OPEN ARMS: the climb over the landmark, the highest place in the game
  room({
    id: RIO_ROOM.arms, cell: [5, 28], sector: 71, palette: ARMS_PALETTE, paint: ARMS,
    coins: ARMS_COINS,
    item: { name: 'skewer1', col: ARMS_SNACK[0], row: ARMS_SNACK[1], sprite: RIO_SPRITE.skewer },
    creatures: [
      { who: 'vulture', col: 23, row: 0, way: 'down', speed: 1, range: 96 }, { who: 'rioBat', col: 28, row: 0, way: 'down', speed: 1, range: 16 },
      { who: 'marmoset', col: 5, row: 2, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // F HOUSE OF COLOUR: the switchbacks down through the favela
  room({
    id: RIO_ROOM.colour, cell: [5, 29], sector: 73, palette: HILL_PALETTE, paint: HILL,
    coins: HILL_COINS,
    item: { name: 'skewer2', col: HILL_SNACK[0], row: HILL_SNACK[1], sprite: RIO_SPRITE.skewer },
    decor: fillCells(HILL, HILL_COINS, [3, 12, 29, 13], 'rioShade'), // (the houses' dark ground floor over the alley, from the ladder's hole east; the snack's pocket past it is open)
    creatures: [
      { who: 'football', col: 12, row: 4, way: 'down', speed: 1, range: 32 }, { who: 'rioKite', col: 27, row: 1, way: 'down', speed: 1, range: 80 },
      { who: 'macaw', col: 19, row: 9, way: 'down', speed: 1, range: 24 },
    ],
  }),

  // W STEAK YOUR CLAIM: the gauchos' skewers, read there and back
  room({
    id: RIO_ROOM.steak, cell: [4, 30], sector: 74, palette: STEAK_PALETTE, paint: STEAK,
    coins: STEAK_COINS,
    item: { name: 'crank', col: STEAK_CRANK[0], row: STEAK_CRANK[1], sprite: RIO_SPRITE.crank },
    decor: [
      ['lampRed', 8, 2], ['lampRed', 14, 2], ['restTable', 7, 16], ['restTable', 11, 16], ['rioGrill', 21, 4],
    ],
    creatures: [{ who: 'gaucho', col: 24, row: 6, way: 'left', speed: 1, range: 24 }, { who: 'gaucho', col: 8, row: 16, way: 'right', speed: 1, range: 56 }],
  }),

  // D SPY VERSUS MOLE, the Sambadrome: the showdown (the agent, the float's head, the lever, the booth)
  room({
    id: RIO_ROOM.drum, cell: [5, 32], sector: 75, palette: DRUM_PALETTE, paint: DRUM,
    coins: DRUM_COINS,
    item: { name: 'headdress', col: DRUM_HEADDRESS[0], row: DRUM_HEADDRESS[1], sprite: RIO_SPRITE.headdress },
    decor: [['rioArch', 1, 5], ['rioFloat', 15, 10], ...[5, 6, 7, 8].flatMap((row): Placed[] => [['chain', 15, row], ['chain', 20, row]]), ['rioLever', 23, 16], ['rioBooth', 27, 2]],
    creatures: [{ who: 'drummer', col: 7, row: 1, way: 'down', speed: 1, range: 24 }, { who: 'dancer', col: 22, row: 2, way: 'left', speed: 2, range: 26 }, { who: 'agent', col: 0, row: 6, way: 'right', speed: 1, range: 1 }],
    crushers: FLOAT_HEAD.cols.map((col) => ({ col, row: FLOAT_HEAD.row, height: FLOAT_HEAD.height })),
  }),

  // B RIO OR BUST: the beach, the finale's stage (the troupe is the room's creatures, off the beach until the finale walks them on)
  room({
    id: RIO_ROOM.bust, cell: [5, 33], sector: 77, palette: BEACH_PALETTE, paint: BEACH,
    item: { name: 'bowl', col: BEACH_BOWL[0], row: BEACH_BOWL[1], sprite: RIO_SPRITE.bowl },
    decor: [
      ['sugarloaf', BEACH_VIEW.sugarloaf.col, BEACH_VIEW.sugarloaf.row], ['christFar', BEACH_VIEW.redeemer.col, BEACH_VIEW.redeemer.row], ['rioUmbrella', BEACH_VIEW.umbrella.col, BEACH_VIEW.umbrella.row], ['rioPole', BEACH_VIEW.pole.col, BEACH_VIEW.pole.row],
      ...BEACH_VIEW.fireworks.map(([col, row]): Placed => ['rioFirework', col, row]),
    ],
    creatures: [{ who: 'dancer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }, { who: 'drummer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }],
  }),
];
