import type { CableCarSpec, CharAnim, FloatSpec, LeverSpec, PursuerSpec, SkewerSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { GRILL_ANIM, RIO_DECOR } from './art/rio-decor';
import { SKEWER_POSES } from './art/rio-items';
import type { WorldDecor } from './art/world';
import { asBackdrop, codeOf, decorIndex, fillCells, type Grid, room, type Palette } from './layout';
import { AGENT_POINTERS, CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from './rio-pointers';

/**
 * Rio, the seventh and last region of Do Svidaniya Monty (docs/dosvidaniya-reset.md, "Rio (the last level)"): six rooms and the beach, at night on black, in a block at columns 33-38 of the exit grid (rows 6-7), entered from the
 * Amazon's last bank (the Andes' column 32, floor 8) and ending on the beach, where the game ends.
 *
 *            col 33             34                  35                   36              37                 38
 *   row 6                                         W STEAK YOUR CLAIM
 *   row 7   C OPEN ARMS        F HOUSE OF COLOUR   L THE LAPA ARCHES    S SUGAR RUSH    D THE SAMBADROME   B RIO OR BUST
 *
 * The route: up the Redeemer and off his east hand (C); down through the favela, the region's tightest room (F); along Lapa's street under the arches, the tram's track high above and out of reach (L); the cable car's winch
 * dead behind its bars at Sugarloaf's foot (S); up the climbers' rope and west onto the track, across its gap on the tram, up the ladder into the churrascaria at the top of the arches, past the gauchos' skewers to the
 * spit's crank and back past them (W); down through the gap to the street (one way) and back to Sugarloaf, where the crank works the winch: the car up to the top station (S); the showdown in the Sambadrome, the agent on
 * his trail (D); and the beach (B). The crank is used twice: the winch, then the Sambadrome's control booth, which makes the float's lever live.
 *
 * Playfield cells as in moscow.ts; a floor "F" is the row he stands on (his body is on rows F-2 and F-1). Each room is painted from its rows of palette letters ('.' empty). The tram (floats.ts, over the track's gap), the
 * cable car (cablecars.ts), the gauchos' skewers (skewers.ts), the agent (pursuers.ts) and the float's lever and its held head (levers.ts, mechanisms.ts) are data of the engine.
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
const NAMES = ['', 'THE LAPA ARCHES', 'SUGAR RUSH', '', 'OPEN ARMS', '', 'HOUSE OF COLOUR', 'STEAK YOUR CLAIM', 'THE SAMBADROME', '', 'RIO OR BUST'] as const;
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
  J: ['jungleLeaf', 5], G: ['mossGround', 5], W: ['soapstone', 1], P: ['pedestal', 12], L: ['woodLadder', 8], R: ['granite', 11], K: ['graniteBack', 11],
} as const satisfies Palette;

export const HILL_PALETTE = {
  P: ['facade', 10], Y: ['facade', 7], B: ['facade', 14], G: ['facade', 13], R: ['favelaTile', 2], L: ['woodLadder', 8], S: ['paradeStreet', 8],
} as const satisfies Palette;

export const LAPA_PALETTE = {
  F: ['facade', 8], T: ['aqueductTop', 1], D: ['floatDeck', 7], L: ['woodLadder', 8], W: ['quayStone', 12],
} as const satisfies Palette;

export const STEAK_PALETTE = {
  B: ['restBrick', 2], F: ['restTile', 2], S: ['barrel', 9], L: ['woodLadder', 8],
} as const satisfies Palette;

export const SUGAR_PALETTE = {
  N: ['sand', 7], G: ['granite', 12], H: ['stationFloor', 1], T: ['stationGate', 2], V: ['vine', 8], L: ['woodLadder', 8], K: ['graniteBack', 6], E: ['seaSwell', 6],
} as const satisfies Palette;

export const DRUM_PALETTE = {
  S: ['riser', 4], A: ['paradeStreet', 8], E: ['stationFloor', 1], F: ['floatDeck', 7], B: ['stationGate', 2], V: ['vine', 8], L: ['woodLadder', 8], Y: ['graniteBack', 7],
} as const satisfies Palette;

export const BEACH_PALETTE = {
  W: ['wavePavement', 1], S: ['sand', 7], E: ['seaSwell', 6], T: ['tableTop', 1], U: ['palmTrunk', 9], L: ['palmLeft', 5], R: ['palmRight', 5],
} as const satisfies Palette;

// ---- C OPEN ARMS ----------------------------------------------------------------------------------------
/** Corcovado, Tijuca's forest at its foot: in high on the canopy at the west (floor 8), down to the forest floor (14), east through the chapel in the Redeemer's pedestal, the maintenance ladder on his east side (col 20) to his east arm (floor 4) and off the hand onto the ledge (8), out east. A second ladder (col 11) climbs to the west arm, the snack on its hand. */
const ARMS = rows([
    'JJ..............................', // 0
    'JJ.............WW...............', // 1
    'JJ.............WW...............', // 2
    'JJ.............WW...............', // 3
    'JJ..WWWWWW.L.WWWWWW.L.WWWWWWW...', // 4
    'JJ.....WWW.L..WWWW..L.WWW.......', // 5
    '...........L..WWWW..L...........', // 6
    '...........L..WWWW..L...........', // 7
    'JJJJJJJ....L..WWWW..L.......RRRR', // 8
    'JJJJJJ.....L.PPPPPP.L.......RRRR', // 9
    'JJJ........L.PPPPPP.L.......RRRR', // 10
    'JJJ........L.PPPPPP.L.......RRRR', // 11
    'JJ.........L.KKKKKK.L.......RRRR', // 12
    'JJ.........L.KKKKKK.L.......RRRR', // 13
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 14
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 15
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 16
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 17
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 18
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRR', // 19
]);
const ARMS_SNACK: Cell = [4, 2];
const ARMS_COINS: readonly Cell[] = [[4, 13], [28, 3]];

// ---- F HOUSE OF COLOUR ----------------------------------------------------------------------------------
/** The favela, the tightest room: in high on the pink roof (floor 8), down the gap between the houses to the alley (14) under the yellow houses, back west to the ladder's hole (col 6) and down to the lane (18), east under the houses and out low. The snack beside the water tank at the alley's west end (a jump over the ladder's hole), the coin at the foot of the light well where the football bounces. */
const HILL = rows([
    '..........................BBBBBB', // 0
    '..........................BBBBBB', // 1
    '..........................BBBBBB', // 2
    '..........................BBBBBB', // 3
    '..........................BBBBBB', // 4
    '..........................BBBBBB', // 5
    '..........................BBBBBB', // 6
    '..........................BBBBBB', // 7
    'RRRRRRRRR.................BBBBBB', // 8
    'PPPPPPPPP...............GG...GGG', // 9
    'P...........RRRRRRRRRRRRGG...GGG', // 10
    'P...........YYYYYYYYYYYYGG...GGG', // 11
    'P.......................GG...GGG', // 12
    'P.......................GG...GGG', // 13
    'GGGGG.L.GGGGGGGGGGGGGGGGGG...GGG', // 14
    'GGGGG.L.GGGGGGGGGGGGGGGGGG...GGG', // 15
    'GGGG..L.........................', // 16
    'GGGG..L.........................', // 17
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 18
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 19
]);
const HILL_SNACK: Cell = [3, 12];
const HILL_COINS: readonly Cell[] = [[27, 17]];

// ---- L THE LAPA ARCHES ----------------------------------------------------------------------------------
/** The aqueduct: the street (floor 18) under its arches, the tram's track on top (floor 8) with a gap at cols 12-17 the tram crosses; the ladder (col 5) from the track's west part up into the churrascaria. */
const LAPA = rows([
    'FF...L..........................', // 0
    'FF...L..........................', // 1
    'FF...L..........................', // 2
    'FF...L..........................', // 3
    'FF...L..........................', // 4
    'FF...L..........................', // 5
    'FF...L..........................', // 6
    'FF...L..........................', // 7
    'FFTTTTTTTTTT......TTTTTTTTTTTTTT', // 8
    'FF..............................', // 9
    'FF..............................', // 10
    'FF..............................', // 11
    'FF..............................', // 12
    'FF..............................', // 13
    'FF..............................', // 14
    'FF..............................', // 15
    '................................', // 16
    '................................', // 17
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 18
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 19
]);
const LAPA_COINS: readonly Cell[] = [[7, 7], [21, 17]];

// ---- W STEAK YOUR CLAIM ---------------------------------------------------------------------------------
/** The churrascaria at the top of the arches, a dead end: in up the ladder through the floor (col 5) onto the dining floor (18), the first gaucho's lane, the steps (16, 14) up to the grill's platform (12), the second gaucho's lane by the grill, the spit's crank at the end. */
const STEAK = rows([
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // 0
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // 1
    'BB............................BB', // 2
    'BB............................BB', // 3
    'BB............................BB', // 4
    'BB............................BB', // 5
    'BB............................BB', // 6
    'BB............................BB', // 7
    'BB............................BB', // 8
    'BB............................BB', // 9
    'BB............................BB', // 10
    'BB............................BB', // 11
    'BB....................SSSSSSSSBB', // 12
    'BB....................SSSSSSSSBB', // 13
    'BB..................SSSSSSSSSSBB', // 14
    'BB..................SSSSSSSSSSBB', // 15
    'BB................SSSSSSSSSSSSBB', // 16
    'BB................SSSSSSSSSSSSBB', // 17
    'FFFF.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 18
    'FFFF.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 19
]);
const STEAK_CRANK: Cell = [28, 10];
const STEAK_COINS: readonly Cell[] = [[17, 17]];

// ---- S SUGAR RUSH ---------------------------------------------------------------------------------------
/** Praia Vermelha at Sugarloaf's foot: in low on the sand (18), the ladder (col 10) to the lower station's shelf (14) behind its bars (the winch, dead without its crank), the climbers' rope (col 4) up to the granite ledge (8) and out west onto Lapa's track; the car to the top station (8) and out east. */
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
    '....V.......TT...KKKK......GGGGG', // 9
    '....V.......TT...KK........GGGGG', // 10
    '....V.......TT.............GGGGG', // 11
    '....V.......TT.............GGGGG', // 12
    '....V.......TT.............GGGGG', // 13
    '....V.....L.HHHHHHH........GGGGG', // 14
    '....V.....L.HHHHHHH........GGGGG', // 15
    'EEEEVEEEEELEEEEEEEEEEEEEEEEGGGGG', // 16
    'EEEEVEEEEELEEEEEEEEEEEEEEEEGGGGG', // 17
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN', // 18
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN', // 19
]);
const SUGAR_COINS: readonly Cell[] = [[7, 7]];

// ---- D THE SAMBADROME -----------------------------------------------------------------------------------
/** The showdown: in high on the stand's ledge (8) from the cable car's top station, the headdress on the drum riser; the rope (col 13) down to the avenue (18), under the float's held head (cols 15-20) to its lever (col 23), the ladder (col 25) up to the control booth (4, the crank's socket), west along the lighting gantry and down the rope again, under the head, and the lever when the agent is under it. The bars (cols 28-29) lift and the avenue runs on east to the beach. */
const DRUM = rows([
    '................................', // 0
    '...........................SSSS.', // 1
    '..............................S.', // 2
    '..............................S.', // 3
    '.............V.EEEEEEEEE.L.EEES.', // 4
    '.............V...........L....S.', // 5
    '.......SSS...V...........L....S.', // 6
    '.......SSS...V...........L....S.', // 7
    'EEEEEEEEEEEE.V...........L....S.', // 8
    'SS...........V.FFFFFF....L....S.', // 9
    'SS...........V...........L....S.', // 10
    'SS...........V...........L....S.', // 11
    'SS...........V...........L....S.', // 12
    'SS...........V...........L....S.', // 13
    'SS...........V...........L..BB..', // 14
    'SS...........V...........L..BB..', // 15
    'SS...........V...........L..BB..', // 16
    'SS...........V...........L..BB..', // 17
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 18
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 19
]);
const DRUM_HEADDRESS: Cell = [7, 4];
const DRUM_COINS: readonly Cell[] = [[18, 8]];

// ---- B RIO OR BUST --------------------------------------------------------------------------------------
/** Copacabana at night: in low on the promenade (18), the bowl on its little table a few steps in, the deckchair beside it, two palms, the sea, the Redeemer and Sugarloaf floodlit across the bay. No coins, no creatures: the finale's stage. */
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
    '................................', // 9
    '...................LUR..........', // 10
    '....................U......LUR..', // 11
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEUEEE', // 12
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEUEEE', // 13
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEUEEE', // 14
    '....................U.......U...', // 15
    '....................U.......U...', // 16
    '..........TTT.......U.......U...', // 17
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 18
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 19
]);
const BEACH_BOWL: Cell = [10, 15];
/** Where the finale's parts are on the beach (playfield cells): the Redeemer and Sugarloaf across the bay (it floodlights them), the deckchair Monty sits in, and the fireworks over the bay. */
const FIREWORKS: readonly Cell[] = [[4, 1], [13, 3], [26, 1]];
export const BEACH_VIEW = {
  redeemer: { col: 22, row: 6, w: 4, h: 3 }, sugarloaf: { col: 3, row: 7, w: 8, h: 5 }, chair: { col: 14, row: 17 },
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
/** The sign CLOSED over the bars (a board of the word between a space each side: cols 10-17, row 2): it comes down with them. */
export const CLOSED_SIGN = { text: 'CLOSED', col: 10, row: 2 } as const;
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

/** The churrascaria's grill: the meat turns, the flames flicker. */
export const RIO_ANIMS: readonly CharAnim[] = [
  { kind: 'cycle', room: RIO_ROOM.steak, chars: GRILL_ANIM.cells.map((cell) => ({ decor: decorIndex('rioGrill'), cell })), frames: GRILL_ANIM.frames, every: 12 },
];

/**
 * The gauchos' skewers (W): a skewer swings every 96 frames through four poses a 24 frames each (down, forward and low, straight out, up): the middle two deadly. The grill's gaucho (slot 0) and the dining floor's (slot 1) are
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
  { room: RIO_ROOM.steak, slot: 0, sprite: 2, cycle: 96, offset: 0, colour: 8, poses },
  { room: RIO_ROOM.steak, slot: 1, sprite: 1, cycle: 96, offset: 48, colour: 8, poses },
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
/** The agent (the room's third creature, slot 2: sprite 6) on Monty's path 150 frames behind, from when he leaves the stand's ledge and the riser (cols 0-11, rows 0-8); gone once squashed. His hat pops off on sprite 1. */
export const pursuerOf = (squashed: number): PursuerSpec => ({
  room: RIO_ROOM.drum, slot: 2, delay: 150, calm: { col0: 0, row0: 0, col1: 11, row1: 8 }, until: squashed, flat: AGENT_POINTERS.flat, hat: AGENT_POINTERS.hat, hatSprite: 1,
});

// ---- the rooms ----------------------------------------------------------------------------------------------

/** Lapa's arches standing on the street: an upper storey (rows 9-12) on a lower (rows 13-17), every four columns, out to the picture's edge. */
const arches = (): Placed[] => [
  ...[2, 6, 10, 14, 18, 22, 26, 30].flatMap((col): Placed[] => [[ARCH_UPPER, col, 9], [ARCH_BASE, col, 13]]),
  ...fillCells(LAPA, [], [0, 16, 1, 17], 'rioShade'), // (the street's dark under the townhouse, to the picture's edge)
];

export const RIO_ROOMS: readonly RoomSpec[] = [
  // L THE LAPA ARCHES: crossed twice, the street first (the track seen, out of reach), then the track on the tram
  room({
    id: RIO_ROOM.lap, cell: [7, 35], sector: 68, palette: LAPA_PALETTE, paint: LAPA,
    coins: LAPA_COINS,
    decor: [...arches(), ['rioTram', TRAM_HOME[0], TRAM_HOME[1]]],
    creatures: [{ who: 'capoeirista', col: 6, row: 16, way: 'right', speed: 1, range: 150 }, { who: 'rioBat', col: 20, row: 9, way: 'down', speed: 1, range: 64 }],
  }),

  // S SUGAR RUSH: visited twice, the sand and the climbers' rope, then the car
  room({
    id: RIO_ROOM.sugar, cell: [7, 36], sector: 69, palette: SUGAR_PALETTE, paint: SUGAR,
    coins: SUGAR_COINS,
    decor: [['cableStation', 15, 11], ['cableStation', 26, 5], ...cableLine(), [{ text: CLOSED_SIGN.text, colour: 2 }, CLOSED_SIGN.col, CLOSED_SIGN.row]],
    creatures: [{ who: 'vulture', col: 20, row: 2, way: 'down', speed: 1, range: 80 }, { who: 'marmoset', col: 28, row: 6, way: 'left', speed: 2, range: 14 }],
  }),

  // C OPEN ARMS: the climb over the landmark, the highest place in the game
  room({
    id: RIO_ROOM.arms, cell: [7, 33], sector: 71, palette: ARMS_PALETTE, paint: ARMS,
    coins: ARMS_COINS,
    item: { name: 'skewer1', col: ARMS_SNACK[0], row: ARMS_SNACK[1], sprite: RIO_SPRITE.skewer },
    creatures: [{ who: 'vulture', col: 25, row: 0, way: 'down', speed: 1, range: 90 }, { who: 'marmoset', col: 2, row: 12, way: 'right', speed: 2, range: 10 }],
  }),

  // F HOUSE OF COLOUR: the switchbacks down through the favela
  room({
    id: RIO_ROOM.colour, cell: [7, 34], sector: 73, palette: HILL_PALETTE, paint: HILL,
    coins: HILL_COINS,
    item: { name: 'skewer2', col: HILL_SNACK[0], row: HILL_SNACK[1], sprite: RIO_SPRITE.skewer },
    decor: [['rioTank', 1, 12], ...[12, 14, 16, 18, 20, 22].map((col): Placed => ['rioWash', col, 12])],
    creatures: [{ who: 'rioKite', col: 9, row: 0, way: 'down', speed: 1, range: 64 }, { who: 'macaw', col: 20, row: 12, way: 'left', speed: 2, range: 30 }, { who: 'football', col: 26, row: 9, way: 'down', speed: 1, range: 56 }],
  }),

  // W STEAK YOUR CLAIM: the gauchos' skewers, read there and back
  room({
    id: RIO_ROOM.steak, cell: [6, 35], sector: 74, palette: STEAK_PALETTE, paint: STEAK,
    coins: STEAK_COINS,
    item: { name: 'crank', col: STEAK_CRANK[0], row: STEAK_CRANK[1], sprite: RIO_SPRITE.crank },
    decor: [
      [{ text: 'CHURRASCO', colour: 7 }, 11, 4], ['lampRed', 10, 2], ['lampRed', 20, 2], ['restTable', 9, 16], ['restTable', 13, 16], ['rioGrill', 22, 8],
    ],
    creatures: [{ who: 'gaucho', col: 26, row: 10, way: 'left', speed: 1, range: 32 }, { who: 'gaucho', col: 8, row: 16, way: 'right', speed: 1, range: 64 }],
  }),

  // D THE SAMBADROME: the showdown (the agent, the float's head, the lever, the booth)
  room({
    id: RIO_ROOM.drum, cell: [7, 37], sector: 75, palette: DRUM_PALETTE, paint: DRUM,
    coins: DRUM_COINS,
    item: { name: 'headdress', col: DRUM_HEADDRESS[0], row: DRUM_HEADDRESS[1], sprite: RIO_SPRITE.headdress },
    decor: [['rioArch', 1, 0], ['rioFloat', 15, 10], ['rioLever', 23, 16], ['rioBooth', 27, 2]],
    creatures: [{ who: 'drummer', col: 8, row: 0, way: 'down', speed: 1, range: 18 }, { who: 'dancer', col: 22, row: 2, way: 'left', speed: 2, range: 26 }, { who: 'agent', col: 0, row: 6, way: 'right', speed: 1, range: 1 }],
    crushers: FLOAT_HEAD.cols.map((col) => ({ col, row: FLOAT_HEAD.row, height: FLOAT_HEAD.height })),
  }),

  // B RIO OR BUST: the beach, the finale's stage (the troupe is the room's creatures, off the beach until the finale walks them on)
  room({
    id: RIO_ROOM.bust, cell: [7, 38], sector: 77, palette: BEACH_PALETTE, paint: BEACH,
    item: { name: 'bowl', col: BEACH_BOWL[0], row: BEACH_BOWL[1], sprite: RIO_SPRITE.bowl },
    decor: [
      ['sugarloaf', BEACH_VIEW.sugarloaf.col, BEACH_VIEW.sugarloaf.row], ['christFar', BEACH_VIEW.redeemer.col, BEACH_VIEW.redeemer.row], ['deckchair', BEACH_VIEW.chair.col, BEACH_VIEW.chair.row],
      ...BEACH_VIEW.fireworks.map(([col, row]): Placed => ['rioFirework', col, row]),
    ],
    creatures: [{ who: 'dancer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }, { who: 'drummer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }],
  }),
];
