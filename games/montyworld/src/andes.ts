import type { CrackSpec, FlightSpec, FloatSpec, PulseSpec, RollerSpec, VineSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { ANDES_SPRITE, BOULDER_POINTERS, LEAP_POINTERS } from './andes-pointers';
import { codeOf, decorIndex, room, type Grid, type Palette } from './layout';

/**
 * The Andes and the Amazon, the sixth region of Do Svidaniya Monty (docs/dosvidaniya-andes.md): thirteen rooms in a block five columns wide and six rows high at columns 29-33 of the exit grid (rows 2-7), entered from
 * the cargo plane's hold (the Pacific, column 29) and left east out of the river's end (Rio).
 *
 *            col 29               30                31               32                 33
 *   row 2                      F1 JUMP FOR JOY
 *   row 3                      F2 OUT OF THIN AIR                                           (the parachute drop: a shaft of three flight rooms, one under another)
 *   row 4                      F3 CONDOR COUNTRY
 *   row 5   H LLAMA DRAMA      T1 NO PROBLLAMA   T2 ROCK AND ROLL   V MARKET FORCES      M MIST OPPORTUNITY
 *   row 6                      CF CLOUD NINE     X THE INCA TUNNEL
 *   row 7                      B THE RIVER QUEEN P VINE AND DANDY   R THE RIVER ENDS
 *
 * (The letters are the design's.) Playfield cells as in moscow.ts. Floors ("F"): T1's top terrace 6 and its low path 18; LLAMA DRAMA's two terraces 6, its llama platforms' decks 6 and its lane 18; T2's plateau 6, its steps 8, 10 and its landing 12, its lane 18;
 * the market's roofs 12, 14, 16, 9 and its lane 18; the cave 18; the cloud forest's boughs 8, 12, 13 and its ground 18; the tunnel 18; the boat's jetty 16, cargo deck 15 and top deck 8; the river's banks 15; the last bank's stones 16, stair 14, 12, 10
 * and the launch's deck 8. The flight rooms are `flights` (flight.ts), the boulders of T2 and the rockfall of the gorge `rollers`, the leaping piranhas of the river and the estuary `rollers` too, the vines of P `vines`, the llamas' rides `floats`.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from the Pacific's (38-54) and Rio's (67-77): they never change once the region has shipped. LLAMA DRAMA (`herd`) was added after Rio, so it is 78 and sits last in the tables. */
export const AND = {
  jump: 55, thin: 56, condor: 57, llama: 58, rock: 59, market: 60, mist: 61, cloud: 62, tunnel: 63, boat: 64, river: 65, bank: 66, herd: 78,
} as const;

const NAMES = [
  'JUMP FOR JOY', 'OUT OF THIN AIR', 'CONDOR COUNTRY', 'NO PROBLLAMA', 'ROCK AND ROLL', 'MARKET FORCES', 'MIST OPPORTUNITY', 'CLOUD NINE', 'THE INCA TUNNEL', 'THE RIVER QUEEN', 'VINE AND DANDY', 'THE RIVER ENDS',
] as const;
const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
export const ANDES_SECTORS: readonly Sector[] = NAMES.map(centred);
/** The sectors of the rooms added after Rio (their number is their place in the whole list of names): LLAMA DRAMA, 78. */
export const ANDES_EXTRA_SECTORS: readonly Sector[] = ['LLAMA DRAMA'].map(centred);
/** The map's colour of each (the sky's light blues, the terraces green and brown, the market's orange, the cave's purple, the forest's greens, the tunnel's brown, the river's browns and blues). */
export const ANDES_COLOURS: readonly number[] = [14, 14, 6, 13, 12, 8, 4, 5, 9, 9, 7, 10];
export const ANDES_EXTRA_COLOURS: readonly number[] = [13];

// ---- the palettes --------------------------------------------------------------------------------------
/** The sky rooms: the plane's tail and its ramp, rock, snow and cloud. */
export const SKY_PALETTE = {
  K: ['hullPlate', 14], R: ['mountainRock', 9], S: ['snowCap', 1], C: ['snowCap', 1], T: ['rockLedge', 8],
} as const satisfies Palette;

/** The terraces' (T1 and the herd's): green grass lips on ochre stone, brown rock, and the planks of a llama's ride. */
export const TERRACE_PALETTE = {
  G: ['terraceGrass', 5], W: ['incaWall', 8], L: ['woodLadder', 7], K: ['mountainRock', 9], D: ['plankBridge', 9],
} as const satisfies Palette;

/** Machu Picchu proper (T2): the terraces' tiles, the well's rope, Huayna Picchu's green slope and brown rock (scenery: he walks in front of it) and the llama's spit (drops, then the gob). */
export const ROCK_PALETTE = {
  G: ['terraceGrass', 5], W: ['incaWall', 8], L: ['woodLadder', 7], V: ['vine', 5], K: ['mountainRock', 9], P: ['hpSlope', 5], Q: ['hpRock', 9], S: ['spitGob', 5],
} as const satisfies Palette;

/** The market (V): adobe, thatch, the green lane, a ladder, and the awnings of the stalls (whole, fraying, torn) with their posts. */
export const MARKET_PALETTE = {
  A: ['adobe', 8], T: ['thatch', 7], G: ['terraceGrass', 5], R: ['woodLadder', 7], N: ['awning', 2], F: ['awningFrayed', 2], O: ['awningTorn', 2], P: ['stallPost', 9],
} as const satisfies Palette;

/** The hot spring's cave (M): rock, green ground, ledges and steps, the spring itself, and the steam (puffs, then the jet). */
export const MIST_PALETTE = {
  K: ['mountainRock', 9], G: ['mossGround', 5], S: ['rockLedge', 8], W: ['incaWall', 8], H: ['hotSpring', 14], P: ['steamPuff', 14], J: ['steamJet', 1],
} as const satisfies Palette;

export const CLOUD_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mossGround', 13], G: ['rockLedge', 9], R: ['vine', 5], T: ['tangle', 13], W: ['riverWater', 6], K: ['mountainRock', 9],
} as const satisfies Palette;

export const TUNNEL_PALETTE = {
  S: ['tunnelStone', 9], W: ['incaWall', 8], R: ['vine', 5], G: ['terraceSlab', 7], K: ['mountainRock', 9],
} as const satisfies Palette;

export const BOAT_PALETTE = {
  H: ['hullPlate', 1], P: ['porthole', 1], D: ['deckBoards', 9], L: ['woodLadder', 7], M: ['mud', 9], J: ['jungleLeaf', 5], W: ['riverWater', 6], V: ['vine', 5],
} as const satisfies Palette;

export const RIVER_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], L: ['deckBoards', 9], V: ['vine', 5], K: ['mossGround', 13],
} as const satisfies Palette;

export const BANK_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], P: ['deckBoards', 9], Q: ['plankCracked', 9], S: ['plankSplit', 9],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/** The flight rooms (the parachute drop): each updraft is three cells wide from its `top` row to the bottom. */
export const FLIGHTS: readonly FlightSpec[] = [
  { room: AND.jump, updrafts: [{ col: 9, cols: 3, top: 6 }] },
  { room: AND.thin, updrafts: [{ col: 9, cols: 3, top: 6 }, { col: 20, cols: 3, top: 6 }] },
  { room: AND.condor, updrafts: [{ col: 13, cols: 3, top: 6 }, { col: 19, cols: 3, top: 6 }] },
];

/** The boulders' colour: a grey rock, to stand off the brown rock and the green slope behind it (the first build's were brown on brown and read as going behind the mountain). */
const BOULDER_COLOUR = 12;

/**
 * T2's boulders: three, a third of a period apart, from the plateau's lip (col 13) along the plateau (floor 6) and down the steps (floors 8, 10, 12) a pixel a frame, a fall of two rows at each edge, along the landing into a heap of
 * rubble (cols 28-29: they end there, short of the doorway at cols 30-31 that he comes in by from the village), `every` 360 frames; a boulder is on the path about 170 of them, so a step has one passing now and then, seen from the plateau all the way.
 */
export const BOULDER_PATH: readonly (readonly [col: number, row: number])[] = [[13, 4], [15, 4], [16.4, 6], [19.2, 6], [20.4, 8], [24.2, 8], [25.4, 10], [27.6, 10]];
export const BOULDER_OF_ROCK: readonly RollerSpec[] = [0, 120, 240].map((start, i): RollerSpec => ({
  room: AND.rock, sprite: [1, 2, 6][i] ?? 1, path: BOULDER_PATH, speed: 1, every: 360, start, frames: BOULDER_POINTERS, colour: BOULDER_COLOUR,
}));

/**
 * OUT OF THIN AIR's rockfall: two boulders drop from above the top of the room down the gorge (cols 14 and 18) to below its bottom, two pixels a frame (about 80 frames), one every 200 frames and the other every 260,
 * so they are never together twice running and nobody can wait for a pattern: a dive, a steer or the updraft's lift carries him round them.
 */
const fall = (col: number, to: number): readonly (readonly [col: number, row: number])[] => [[col, -2.5], [col, to]];
export const ROCKFALL: readonly RollerSpec[] = [
  { room: AND.thin, sprite: 1, path: fall(14, 20), speed: 2, every: 200, start: 40, frames: BOULDER_POINTERS, colour: BOULDER_COLOUR },
  { room: AND.thin, sprite: 6, path: fall(18, 16.5), speed: 2, every: 260, start: 150, frames: BOULDER_POINTERS, colour: BOULDER_COLOUR },
];

/**
 * A piranha's leap: from under the water at `col` (row 17) up in an arc to its apex (row `apex`) and down into the water again three cells on, nose up, level and nose down as the three pictures follow it along (`spread`), `every` frames, the first `start` in.
 * Deadly on touch, as the boulders are; it is only in the air for part of each period.
 */
const LEAP_W = 3;
function leap(room: number, sprite: number, col: number, apex: number, every: number, start: number): RollerSpec {
  const path = Array.from({ length: 9 }, (_, i): readonly [number, number] => {
    const t = i / 8;
    return [col + (t - 0.5) * LEAP_W, 17.5 - 4 * (17.5 - apex) * t * (1 - t)];
  });
  return { room, sprite, path, speed: 2, every, start, frames: LEAP_POINTERS, colour: 2, spread: true };
}
/** P's piranhas: three, over the water between the vines' swings (cols 11, 19 and 26), at their own periods so the arcs never fall in step with the vines' 96 frames or with each other. */
export const RIVER_LEAPS: readonly RollerSpec[] = [leap(AND.river, 1, 11, 9.5, 190, 30), leap(AND.river, 2, 19, 9, 230, 120), leap(AND.river, 6, 26, 9.5, 170, 70)];
/** R's: one in the first gap between the stepping stones (a dolphin patrols the second). */
export const BANK_LEAPS: readonly RollerSpec[] = [leap(AND.bank, 1, 7.5, 9.5, 180, 20)];

/** Every roller of the region: the boulders, the rockfall and the leaping piranhas. */
export const BOULDERS: readonly RollerSpec[] = [...BOULDER_OF_ROCK, ...ROCKFALL, ...RIVER_LEAPS, ...BANK_LEAPS];

/**
 * P's vines: three, from the canopy at columns 8, 16 and 24, each thirteen cells long (down to row 15, the banks' floor), swinging through five cells either way at the tip every 96 frames, a third of a swing apart. Monty
 * takes hold of a rope by walking into it or falling onto it (a jump does not: Monty on the Run's rule), so a vine reaches the height of his body on the bank: it swings over the bank's edge and he steps onto it, rides it out over the
 * water and steps off onto a log (or the far bank) as it swings over.
 */
export const VINES: readonly VineSpec[] = [8, 16, 24].map((col, i): VineSpec => ({ room: AND.river, col, top: 3, length: 13, period: 96, amplitude: 5, phase: i * 32, code: codeOf(RIVER_PALETTE, 'V') }));

/**
 * LLAMA DRAMA's rides: two llamas carry a plank deck back and forth across the ravine (cols 9-22: the span, from the west terrace's edge to the east's), a cell every 8 frames (half his walking pace), resting four cells' time
 * at each end where he steps on, half a cycle apart so one is always about to arrive at either side.
 */
const RIDE = { room: AND.herd, row: 6, span: { from: 9, to: 22 }, dir: 1, step: 8, every: 30, w: 4, h: 2, deck: codeOf(TERRACE_PALETTE, 'D'), decor: decorIndex('llamaRide'), bounce: { hold: 4 } } as const;
export const RIDES: readonly FloatSpec[] = [{ ...RIDE, offset: 0, home: [12, 4] }, { ...RIDE, offset: 14, home: [16, 4] }];

/**
 * T2's tunnel-mouth spit (a pulse): a gob of spit flickers at the llama's lips in front of the tunnel (cols 8-10, rows 16-17) for 30 frames, then flies for 24, and 106 are quiet, so the approach to the llama is a timing as well as the llama itself; a tune (the panpipes) calms it.
 */
export const spitPulses = (panpipes: number): readonly PulseSpec[] => [{
  room: AND.rock, col: 8, row: 16, cols: 3, rows: 2, period: 160, start: 70, warn: 30, live: 24, idle: 0, warnCode: codeOf(ROCK_PALETTE, 'S'), liveCode: codeOf(ROCK_PALETTE, 'S'), spent: 0, calmedBy: panpipes,
}];

/**
 * The hot spring cave's geysers (pulses): three vents (cols 6-7, 11-12 and 15-16) take turns, 150 frames to a period, 50 apart: puffs of steam for 28 frames (the warning), a jet of it for 26 (deadly, five rows up from the vent), then quiet.
 * Three cells of cave floor lie between one vent and the next: he waits there for the next jet's lull and goes on.
 */
export const VENTS: readonly number[] = [6, 11, 15];
export const GEYSERS: readonly PulseSpec[] = VENTS.map((col, i): PulseSpec => ({
  room: AND.mist, col, row: 13, cols: 2, rows: 5, period: 150, start: 12, warn: 28, live: 26, offset: (150 - i * 50) % 150, idle: 0, warnCode: codeOf(MIST_PALETTE, 'P'), liveCode: codeOf(MIST_PALETTE, 'J'), spent: 0,
}));

/** The market's collapsing awning (cracks, a cell each): the hat stall's roof (row 9, cols 22-28) frays after 30 frames under his feet, tears after 48 and is gone after 60 (a walk over a cell is about 18 frames, so crossing at his walk is safe and stopping is not), whole again 300 frames later. */
export const MARKET_CRACKS: readonly CrackSpec[] = Array.from({ length: 7 }, (_, k): CrackSpec => ({
  room: AND.market, col: 22 + k, cols: 1, row: 9, codes: [codeOf(MARKET_PALETTE, 'N'), codeOf(MARKET_PALETTE, 'F'), codeOf(MARKET_PALETTE, 'O')], crack: 30, wide: 48, gone: 60, away: 300,
}));

/**
 * The estuary's stepping stones (logs, row 16: cols 5-6, 10-12 and 16-18) are rotten: each cell shows cracks after 40 frames under his feet, splits after 62 and is gone after 80 (he is over a cell for about 18 frames when he crosses at his walk, over a log for 48),
 * so a steady crossing is safe with a margin and a pause to look at the piranha and the dolphin drops him into the water. Whole again 400 frames later, and when he comes into the room: the set-up trap over the fish.
 */
export const STONE_CRACKS: readonly CrackSpec[] = [5, 6, 10, 11, 12, 16, 17, 18].map((col): CrackSpec => ({
  room: AND.bank, col, cols: 1, row: 16, codes: [codeOf(BANK_PALETTE, 'P'), codeOf(BANK_PALETTE, 'Q'), codeOf(BANK_PALETTE, 'S')], crack: 40, wide: 62, gone: 80, away: 400,
}));

// ---- the key items' places -------------------------------------------------------------------------
/** CLOUD NINE's tangle over the jetty's rope (cols 4-7, rows 18-19: four wide, so that he standing anywhere on the rope has air under his three columns): the machete cuts it away. */
export const TANGLE_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [4, 5, 6, 7].map((col) => [row, col] as const));
/** The rope that hangs through that gap once it is clear (the jetty below): placed with the machete. */
export const TANGLE_ROPE: readonly (readonly [row: number, col: number])[] = [18, 19].map((row) => [row, 5] as const);
export const TANGLE_ROPE_CODE = codeOf(CLOUD_PALETTE, 'R');

// ---- the rooms ----------------------------------------------------------------------------------------------

/**
 * Huayna Picchu, the steep spire behind Machu Picchu, in scenery tiles (they are not walls: he walks in front of it), painted first so that the terraces overwrite its foot: from its tip (`col`, row `top`) down to row `bottom`,
 * `half` cells either side at the foot; bare brown rock for its two top rows and its shadowed right flank, the green terraced slope on the rest.
 */
function huaynaPicchu(g: Grid, col: number, top: number, bottom: number, half: number): void {
  for (let r = top; r <= bottom; r++) {
    const reach = Math.round(((r - top) * half) / (bottom - top));
    for (let c = col - reach; c <= col + reach; c++) g.box(c, r, c, r, r < top + 2 || c > col + reach * 0.35 ? 'Q' : 'P');
  }
}

const SIGN = { text: 'PERU: THE ANDES', colour: 7 } as const;
const AMAZON = { text: 'THE AMAZON: AMAZONAS', colour: 7 } as const;
const RIO_SIGN = { text: 'RIO', colour: 7 } as const;

const PAINT = {
  jump(g: Grid) {
    g.box(0, 0, 1, 13, 'K').box(0, 16, 3, 17, 'K').box(0, 18, 3, 19, 'K');
    g.box(28, 0, 31, 19, 'R');
    g.box(19, 14, 24, 19, 'R').box(20, 13, 23, 13, 'S').box(21, 12, 22, 12, 'S'); // the spire
  },
  thin(g: Grid) {
    // the gorge: cliffs close in on both sides (24 wide at the top, 14 at the foot), snowy ledges on the outcrops, nothing in the middle but the boulders' fall
    g.box(0, 0, 3, 8, 'R').box(0, 9, 8, 19, 'R').box(4, 9, 8, 9, 'S').box(28, 0, 31, 11, 'R').box(23, 12, 31, 19, 'R').box(23, 12, 27, 12, 'S');
    g.box(18, 18, 22, 19, 'R').box(18, 17, 22, 17, 'S'); // a rock in the gorge's floor, snow-capped (the way down is cols 9-17: the room below has its overhang at the right)
  },
  condor(g: Grid) {
    g.box(0, 0, 1, 19, 'R').box(30, 0, 31, 19, 'R').box(2, 16, 7, 19, 'R').box(24, 16, 29, 19, 'R').box(3, 14, 5, 15, 'R');
    g.box(18, 0, 29, 4, 'R').box(21, 5, 29, 5, 'R'); // the overhang
    g.box(22, 9, 27, 10, 'R').box(22, 8, 27, 8, 'S'); // the shelf under it
  },
  llama(g: Grid) {
    g.box(0, 0, 6, 2, 'K').box(24, 0, 31, 2, 'K'); // the mountain: F3's cliffs go on; the terraces run off both edges
    g.box(0, 6, 31, 6, 'G').box(0, 7, 31, 10, 'W').box(8, 8, 31, 8, 'G').clear(3, 6, 5, 12).box(4, 6, 4, 17, 'L'); // (the ladder, in a shaft three cells wide, down to the low path)
    g.box(0, 18, 31, 19, 'G').box(0, 11, 2, 15, 'W');
    g.box(9, 16, 13, 16, 'G').box(9, 17, 13, 17, 'W').box(14, 14, 17, 14, 'G').box(14, 15, 17, 17, 'W').box(18, 16, 21, 16, 'G').box(18, 17, 21, 17, 'W'); // the terraces of the low path
    g.box(30, 7, 31, 15, 'W');
  },
  herd(g: Grid) {
    g.box(24, 0, 31, 2, 'K').box(0, 0, 6, 2, 'K');
    g.box(23, 6, 31, 6, 'G').box(23, 7, 31, 10, 'W').box(23, 8, 31, 8, 'G'); // the east terrace (where T1's runs out)
    g.box(0, 6, 8, 6, 'G').box(0, 7, 8, 10, 'W').box(0, 8, 8, 8, 'G'); // the west one, over the pocket
    g.box(0, 18, 31, 19, 'G');
    g.box(12, 16, 15, 16, 'G').box(12, 17, 15, 17, 'W'); // a terrace the drop lands on
    g.box(30, 7, 31, 15, 'W');
  },
  rock(g: Grid) {
    huaynaPicchu(g, 20, 0, 9, 7);
    g.box(0, 6, 15, 6, 'G').box(0, 7, 15, 13, 'W').clear(4, 6, 6, 13).box(5, 6, 5, 17, 'L').box(16, 8, 20, 8, 'G').box(16, 9, 20, 13, 'W').box(21, 10, 25, 10, 'G').box(21, 11, 25, 13, 'W').box(26, 12, 31, 12, 'G').box(26, 13, 31, 13, 'W');
    g.box(0, 18, 31, 19, 'G').clear(19, 18, 21, 19).box(20, 18, 20, 19, 'V').box(11, 14, 22, 15, 'W').box(23, 14, 31, 17, 'K'); // the lane, the well and its rope, the tunnel's lintel and the rock the tunnel ends in
    g.box(30, 0, 31, 9, 'K').box(0, 0, 1, 2, 'K').box(0, 14, 1, 15, 'W');
  },
  market(g: Grid) {
    g.box(0, 12, 9, 12, 'T').box(0, 13, 9, 17, 'A'); // the house, its thatched roof (floor 12)
    g.box(10, 14, 15, 14, 'N').box(10, 15, 10, 17, 'P').box(15, 15, 15, 17, 'P'); // the potato seller's awning (floor 14) on its posts
    g.box(16, 16, 19, 16, 'N').box(16, 17, 16, 17, 'P').box(19, 17, 19, 17, 'P'); // the low awning of the corn seller (floor 16)
    g.box(0, 18, 31, 19, 'G').box(30, 0, 31, 15, 'A').box(0, 0, 1, 9, 'A');
    g.box(21, 9, 21, 17, 'R'); // the ladder to the hat stall's roof
    g.box(22, 9, 28, 9, 'N'); // the hat stall's awning, its roof (the cracks fray it)
    g.box(22, 10, 22, 17, 'P').box(28, 10, 28, 17, 'P');
  },
  mist(g: Grid) {
    g.box(0, 0, 31, 3, 'K').box(0, 4, 1, 15, 'K').box(30, 4, 31, 19, 'K');
    g.box(0, 18, 31, 19, 'G');
    for (const v of VENTS) g.box(v, 18, v + 1, 19, 'H'); // the springs the steam comes out of
    g.box(19, 16, 22, 17, 'W').box(23, 14, 26, 17, 'W').box(27, 12, 29, 17, 'W');
  },
  cloud(g: Grid) {
    g.box(0, 0, 31, 0, 'J').box(0, 1, 8, 1, 'J').box(12, 1, 20, 1, 'J').box(24, 1, 31, 1, 'J').box(0, 2, 4, 2, 'J').box(15, 2, 17, 2, 'J').box(26, 2, 31, 2, 'J'); // the canopy's ragged leaves
    g.box(0, 18, 31, 19, 'M').box(4, 18, 7, 19, 'T').box(21, 18, 26, 19, 'W').box(22, 17, 23, 17, 'G').box(25, 17, 25, 17, 'G');
    g.box(8, 8, 13, 8, 'G').box(17, 8, 29, 8, 'G').box(16, 13, 27, 13, 'G').box(4, 12, 9, 12, 'G');
    g.box(15, 8, 15, 17, 'R');
    g.box(30, 0, 31, 5, 'J').box(30, 9, 31, 15, 'J').box(28, 8, 31, 8, 'G'); // the east wall has a door high, rows 6-7, onto the bough's end
  },
  tunnel(g: Grid) {
    g.box(0, 0, 31, 3, 'S').clear(19, 0, 21, 3).box(30, 0, 31, 17, 'S').box(0, 4, 1, 15, 'S').clear(0, 6, 1, 7).box(0, 8, 6, 9, 'W'); // the west wall has a door high, rows 6-7, onto a ledge (floor 8)
    g.box(0, 18, 31, 19, 'W');
    g.box(24, 16, 25, 17, 'W').box(26, 14, 27, 17, 'W').box(28, 12, 30, 17, 'W');
    g.box(20, 0, 20, 17, 'R');
  },
  boat(g: Grid) {
    g.box(0, 0, 3, 0, 'J').box(8, 0, 31, 0, 'J').box(10, 1, 16, 1, 'J').box(20, 1, 29, 1, 'J').box(11, 2, 13, 2, 'J').box(26, 2, 29, 2, 'J'); // the canopy over the river, ragged, leaving the rope's way up
    g.box(5, 0, 5, 15, 'V'); // the rope up to the cloud forest
    g.box(0, 16, 4, 19, 'M');
    g.box(5, 15, 31, 15, 'D').box(5, 16, 31, 17, 'H').box(5, 18, 31, 19, 'W'); // the deck, the hull, the river under it
    for (let c = 8; c <= 28; c += 4) g.box(c, 17, c, 17, 'P');
    g.box(8, 8, 23, 8, 'D').box(8, 9, 25, 12, 'H').box(12, 10, 12, 10, 'P').box(16, 10, 16, 10, 'P').box(20, 10, 20, 10, 'P').box(24, 4, 25, 8, 'H').box(24, 6, 24, 6, 'P').box(24, 10, 24, 10, 'P');
    g.box(7, 8, 7, 14, 'L');
    g.box(30, 0, 31, 12, 'J').box(30, 15, 31, 15, 'D'); // the far bank's trees
  },
  river(g: Grid) {
    g.box(0, 0, 31, 1, 'J').box(7, 2, 9, 2, 'J').box(15, 2, 17, 2, 'J').box(23, 2, 25, 2, 'J').box(0, 2, 3, 2, 'J').box(28, 2, 31, 2, 'J'); // the canopy the vines hang from, ragged
    g.box(0, 15, 4, 19, 'M').box(28, 15, 31, 19, 'M').box(5, 16, 27, 19, 'W').box(13, 16, 15, 16, 'L').box(20, 16, 22, 16, 'L');
    g.box(0, 3, 1, 12, 'J').box(30, 0, 31, 12, 'J');
  },
  bank(g: Grid) {
    g.box(0, 0, 1, 12, 'J').box(30, 0, 31, 5, 'J').box(30, 9, 31, 19, 'M').box(30, 8, 31, 8, 'P'); // a tree at the left running off the top; the launch's deck runs on east to Rio's quay (rows 6-7 open); the sky open
    g.box(0, 15, 3, 19, 'M'); // the near bank
    g.box(4, 16, 18, 19, 'W'); // the estuary
    g.box(5, 16, 6, 16, 'P').box(10, 16, 12, 16, 'P').box(16, 16, 18, 16, 'P'); // three stepping stones (logs)
    g.box(19, 14, 21, 19, 'M').box(22, 12, 23, 19, 'M').box(24, 10, 25, 19, 'M').box(26, 9, 29, 19, 'M').box(26, 8, 29, 8, 'P'); // the stair up from the water, and the launch's deck
  },
} as const;

export const ANDES_ROOMS: readonly RoomSpec[] = [
  // F1 JUMP FOR JOY: out of the plane's tail. In at the left on the ramp (floor 16: the hold's door, rows 14-15); the plane's tail is the wall; off the ramp's end the canopy opens. An updraft (cols 9-11) lifts him back up
  // to glide to a spire at the right (an empanada on its snowy tip), clouds under. The bottom is open (nothing solid is drawn in it): he sinks out of it into the next room. The lesson room: no creature, nothing falling.
  room({
    id: AND.jump, cell: [2, 30], sector: 55, palette: SKY_PALETTE, paint: PAINT.jump,
    coins: [[7, 12], [13, 8], [16, 9], [19, 10], [26, 12]],
    item: { name: 'empanada1', col: 21, row: 10, sprite: ANDES_SPRITE.empanada },
    decor: [['skyCloudBig', 4, 4], ['skyCloud', 13, 2], ['skyCloud', 22, 5], ['skyCloud', 5, 9], ['skyCloudBig', 5, 16], ['skyCloud', 14, 17],
      ['updraft', 9, 12], ['updraft', 9, 8]],
  }),

  // F2 OUT OF THIN AIR: the gorge. In from above anywhere; the cliffs close in (24 cells wide at the top, 14 at the foot) with ledges of snow on the outcrops, an updraft each side, and two boulders drop from above down the middle on their own periods (a rockfall).
  // The room's own hazard: dive, steer or ride the lift round them. Out at the bottom.
  room({
    id: AND.thin, cell: [3, 30], sector: 56, palette: SKY_PALETTE, paint: PAINT.thin,
    coins: [[16, 3], [10, 5], [21, 5], [16, 10], [12, 14], [19, 14]],
    decor: [['skyCloudBig', 8, 0], ['skyCloud', 19, 2], ['updraft', 9, 16], ['updraft', 9, 12], ['updraft', 9, 8], ['updraft', 20, 12], ['updraft', 20, 8]],
  }),

  // F3 CONDOR COUNTRY: the climax of the drop. A rock overhang hangs at the right (an empanada on its lip), a ledge at each side, two updrafts, two condors on slow wide circuits (the room's own hazard); down through the gap between the ledges (cols 8-23)
  // onto Machu Picchu's terrace under it.
  room({
    id: AND.condor, cell: [4, 30], sector: 57, palette: SKY_PALETTE, paint: PAINT.condor,
    coins: [[5, 12], [10, 14], [14, 6], [17, 8], [27, 7], [27, 13]],
    item: { name: 'empanada2', col: 24, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['skyCloudBig', 3, 3], ['skyCloud', 13, 1], ['skyCloud', 22, 12], ['skyCloud', 9, 17], ['skyCloudBig', 15, 17],
      ['updraft', 13, 12], ['updraft', 13, 8], ['updraft', 19, 12], ['updraft', 19, 8]],
    creatures: [{ who: 'condor', col: 4, row: 5, way: 'right', speed: 2, range: 52 }, { who: 'condor', col: 24, row: 12, way: 'left', speed: 2, range: 56 }],
  }),

  // T1 NO PROBLLAMA: Machu Picchu's lower terraces, the landing (PERU: THE ANDES, the flag). The drop lands on the top terrace (floor 6) through the gap in the mountain's rock roof (cols 7-23: nothing solid is drawn in it); the terrace runs east out high
  // into the great room and west out high onto LLAMA DRAMA's. The low path (floor 18) climbs three terraces (floors 16, 14, 16) where two llamas graze and wink on the flat, and runs east out low into the great room's lane and west out low into the herd's.
  room({
    id: AND.llama, cell: [5, 30], sector: 58, palette: TERRACE_PALETTE, paint: PAINT.llama,
    coins: [[11, 4], [16, 4], [22, 4], [28, 4], [11, 14], [15, 12], [27, 16]],
    decor: [['mountainRange', 3, 3], [SIGN, 7, 2], ['peruFlag', 26, 3], ['pots', 13, 4], ['incaGate', 22, 14]],
    creatures: [{ who: 'llama', col: 2, row: 16, way: 'right', speed: 1, range: 40 }, { who: 'llama', col: 24, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // T2 ROCK AND ROLL: Machu Picchu proper, Huayna Picchu rising behind it. In from T1 on the plateau at the left (floor 6: the temple gate and the sacred stone) or on the low lane (floor 18). Boulders roll off the plateau's lip down the steps (floors 8, 10) to the landing
  // (floor 12), the way out east high into the village. The lane runs under the terraces from T1's low path: a low tunnel (cols 11-22, two cells high) where a spitting llama paces the mouth, spitting on a timing, and a well (cols 19-21, a rope in it) falls into the Inca
  // tunnel; the llama steps aside for a tune.
  room({
    id: AND.rock, cell: [5, 31], sector: 59, palette: ROCK_PALETTE, paint: PAINT.rock,
    coins: [[7, 4], [10, 4], [18, 6], [23, 8], [27, 10], [3, 16]],
    item: { name: 'empanada3', col: 8, row: 16, sprite: ANDES_SPRITE.empanada },
    decor: [['incaGate', 2, 2], ['intihuatana', 8, 4], ['skyCloud', 9, 0], ['skyCloud', 25, 1], ['rubble', 28, 10]],
    creatures: [{ who: 'spitter', col: 12, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // V MARKET FORCES: the mountain village's market on market day. In from the terraces' landing on the house's thatched roof (floor 12), the church tower behind; the stalls' awnings are steps down (floors 14, 16) to the lane (floor 18) where women sell
  // potatoes and corn under them; a ladder (col 21) from the lane goes up to the hat stall's awning (floor 9), which frays under his feet: the empanada lies on it. The lane runs east out low to the cave.
  room({
    id: AND.market, cell: [5, 32], sector: 60, palette: MARKET_PALETTE, paint: PAINT.market,
    coins: [[9, 10], [12, 12], [17, 14], [20, 16], [23, 7], [29, 16]],
    item: { name: 'empanada4', col: 25, row: 7, sprite: ANDES_SPRITE.empanada },
    decor: [['churchTower', 2, 6], ['mountainRange', 14, 6], ['skyCloud', 12, 3], ['spuds', 11, 17], ['corn', 17, 17], ['villager', 13, 15], ['villager', 6, 9], ['hatStall', 23, 14]],
    creatures: [{ who: 'cuy', col: 26, row: 16, way: 'left', speed: 1, range: 30 }],
  }),

  // M MIST OPPORTUNITY: a cave in the cloud, a dead end: a hot spring cave. In low from the village at the left; three springs in the floor (cols 6-7, 11-12, 15-16) put up jets of steam in turn: puffs warn, then the jet scalds. Three cells of floor lie between
  // one vent and the next: he waits in them for the lull. The floor climbs in three steps (floors 16, 14, 12) to a ledge at the right where the panpipes lie. Out the way he came.
  room({
    id: AND.mist, cell: [5, 33], sector: 61, palette: MIST_PALETTE, paint: PAINT.mist,
    coins: [[4, 16], [9, 16], [14, 16], [20, 14], [24, 12], [29, 9]],
    item: { name: 'panpipes', col: 28, row: 10, sprite: ANDES_SPRITE.panpipes },
    decor: [['torch', 2, 16], ['torch', 18, 16], ['idol', 21, 14]],
    creatures: [{ who: 'cuy', col: 27, row: 10, way: 'right', speed: 1, range: 12, colour: 10 }],
  }),

  // CF CLOUD NINE: the cloud forest. In from the Inca tunnel at the right (low). The ground (floor 18) runs west over a stream (stepping logs) past a jaguar to a tangle over a gap at the left (cols 4-7: the machete cuts it, and a rope hangs
  // through to the riverboat); a rope (col 15) climbs from the ground to the boughs (floors 8, 13, 12) that run across above it, a sloth and a toucan on them. The topmost bough runs out east through a door (rows 6-7) into the Inca tunnel's high ledge: a loop with the low door.
  // The west bough's end is a step down onto the low one (floor 12), which he leaves west onto the ground.
  room({
    id: AND.cloud, cell: [6, 30], sector: 62, palette: CLOUD_PALETTE, paint: PAINT.cloud,
    coins: [[12, 6], [21, 6], [24, 11], [6, 10], [10, 16], [19, 16], [28, 14]],
    decor: [['giantTree', 0, 12], ['fern', 7, 15], ['fern', 27, 15], ['bromeliad', 10, 7], ['bromeliad', 22, 12], ['hangingVines', 23, 3], ['hangingVines', 9, 3]],
    creatures: [{ who: 'jaguar', col: 8, row: 16, way: 'right', speed: 1, range: 56 }, { who: 'toucan', col: 18, row: 6, way: 'right', speed: 1, range: 50 }, { who: 'sloth', col: 8, row: 6, way: 'right', speed: 1, range: 40 }],
  }),

  // X THE INCA TUNNEL: under the terraces, a dead end. In by the rope from the well (cols 19-21) which hangs to the floor; a tunnel of dressed stone lit by torches, golden idols in the niches, a bat that dives, a Mole Crusher hanging from the ceiling between
  // the rope and the stairs of blocks up the east end (floors 16, 14, 12) to a shelf where the machete lies (so the machete is behind the crusher, which comes down across the lane). Out west, low, into the forest, or by the ledge (floor 8, rows 6-7) in the west wall,
  // which the forest's boughs reach: two coins lie on it and he drops from it to the floor.
  room({
    id: AND.tunnel, cell: [6, 31], sector: 63, palette: TUNNEL_PALETTE, paint: PAINT.tunnel,
    coins: [[5, 16], [16, 16], [18, 16], [25, 14], [27, 12], [29, 9], [2, 6], [5, 6]],
    item: { name: 'machete', col: 28, row: 10, sprite: ANDES_SPRITE.machete },
    decor: [['torch', 7, 16], ['torch', 17, 16], ['idol', 3, 16], ['idol', 14, 16]],
    creatures: [{ who: 'caveBat', col: 11, row: 4, way: 'down', speed: 1, range: 96 }],
    crushers: [{ col: 22, row: 4, height: 14 }],
  }),

  // B THE RIVER QUEEN: the riverboat, a side view. In by the rope from the forest on the jetty at the left (floor 16), THE AMAZON's sign; a plank across to the cargo deck (floor 15) under the cabin: a ladder at its foot (col 7) goes up to the top deck (floor 8:
  // the pilot house, the funnel, a macaw, the lifebuoy, the chullo), which ends at the aft house (cols 24-25, up to row 4: no jumping onto it, no walking off the deck's end: the top deck is a dead end). The captain paces the cargo deck under the cabin (a lane two
  // cells high, shut from the top deck: no way past him) and steps aside for a local hat. Out east at the stern, low, under the paddle wheel.
  room({
    id: AND.boat, cell: [7, 30], sector: 64, palette: BOAT_PALETTE, paint: PAINT.boat,
    coins: [[6, 12], [15, 6], [19, 6], [23, 13], [27, 13], [29, 13]],
    item: { name: 'chullo', col: 22, row: 6, sprite: ANDES_SPRITE.chullo },
    decor: [['pilotHouse', 9, 5], ['funnel', 16, 5], ['lifebuoy', 20, 6], ['paddleWheel', 26, 9], ['palm', 2, 11], ['hammock', 9, 13], [AMAZON, 6, 3]],
    creatures: [{ who: 'captain', col: 14, row: 13, way: 'right', speed: 1, range: 24 }, { who: 'toucan', col: 11, row: 6, way: 'right', speed: 1, range: 60, colour: 10 }],
  }),

  // P VINE AND DANDY: the boat runs aground. A wide brown river (the floor is water) from the stern's bank at the left (floor 15) to a mud bank at the right; three vines hang from the canopy and swing, two logs float between, and piranhas leap from the water in
  // arcs on their own periods as he swings.
  room({
    id: AND.river, cell: [7, 31], sector: 65, palette: RIVER_PALETTE, paint: PAINT.river,
    coins: [[10, 11], [14, 14], [18, 10], [21, 14], [26, 11], [30, 13]],
    item: { name: 'empanada5', col: 29, row: 13, sprite: ANDES_SPRITE.empanada },
    decor: [['giantTree', 2, 9]],
    creatures: [{ who: 'sloth', col: 12, row: 3, way: 'right', speed: 1, range: 30 }],
  }),

  // R THE RIVER ENDS: the estuary, the last room before Rio. In from the river's mud bank at the left (floor 15); three stepping logs cross the mouth (floor 16) between a leaping piranha and a dolphin; the bank climbs a muddy stair (floors 14, 12, 10) where an anaconda
  // coils on the second step, which is its whole width (a tune settles it: jumping from the first step to the third is four rows) to the launch's deck (floor 8) that takes him down to Rio.
  room({
    id: AND.bank, cell: [7, 32], sector: 66, palette: BANK_PALETTE, paint: PAINT.bank,
    coins: [[9, 13], [30, 6]],
    item: { name: 'empanada6', col: 24, row: 8, sprite: ANDES_SPRITE.empanada },
    decor: [['fern', 2, 12], ['launch', 24, 5], [RIO_SIGN, 25, 3], ['skyCloud', 8, 2], ['skyCloudBig', 14, 4]],
    creatures: [{ who: 'anaconda', col: 22, row: 10, way: 'right', speed: 1, range: 4 }, { who: 'dolphin', col: 14, row: 16, way: 'up', speed: 1, range: 28 }],
  }),
];

/** The rooms added after Rio (their places in the tables follow Rio's, so what is saved of every room before them never moves): LLAMA DRAMA, west of T1. */
export const ANDES_EXTRA_ROOMS: readonly RoomSpec[] = [
  // H LLAMA DRAMA: the herd's terraces west of Machu Picchu. T1's top terrace runs out west high onto an east terrace (floor 6) over a ravine (cols 9-22) that two llamas ferry him across, one each way, on plank decks, to a west terrace (floor 6) with coins; the ravine's
  // floor is the lane (floor 18), a drop from either edge, where a winking herd runs the lane (the stampede) round a terrace the drop lands on, and where the lane runs out east low into T1's low path. West of the drop the lane is a pocket under the west terrace.
  room({
    id: AND.herd, cell: [5, 29], sector: 78, palette: TERRACE_PALETTE, paint: PAINT.herd,
    coins: [[2, 4], [6, 4], [15, 2], [20, 16], [5, 16]],
    decor: [['mountainRange', 24, 3], ['skyCloud', 18, 0], ['skyCloudBig', 9, 0], ['llamaRide', 12, 4], ['llamaRide', 16, 4]],
    creatures: [{ who: 'llama', col: 16, row: 16, way: 'right', speed: 3, range: 20 }, { who: 'llama', col: 23, row: 16, way: 'left', speed: 2, range: 28 }, { who: 'llama', col: 2, row: 16, way: 'right', speed: 2, range: 25 }],
  }),
];

/** Every room of the region, for the tests that look at them all. */
export const ANDES_ALL_ROOMS: readonly RoomSpec[] = [...ANDES_ROOMS, ...ANDES_EXTRA_ROOMS];
