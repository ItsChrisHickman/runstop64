import type { CrackSpec, FlightSpec, PulseSpec, RollerSpec, VineSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { ANDES_SPRITE, BOULDER_POINTERS, LEAP_POINTERS } from './andes-pointers';
import { codeOf, room, type Grid, type Palette } from './layout';

/**
 * The Andes and the Amazon, the sixth region of Do Svidaniya Monty (docs/dosvidaniya-reset.md, "the Andes and the Amazon: the plan"): eight rooms at columns 30-32 of the exit grid (rows 2-6), entered from the
 * cargo plane's hold (the Pacific, [2,29]) and left east out of the Amazon's last room under the kapok's roots (Rio, [6,33]).
 *
 *            col 30                    31                       32
 *   row 2   F1 JUMP FOR JOY                                                        (the parachute drop: two flight rooms, one under the other)
 *   row 3   F2 CONDOR COUNTRY
 *   row 4   MP1 NO PROBLLAMA         MP2 MACHU PICCHU
 *   row 5                            A1 THE AMAZON (the canopy) A2 THE AMAZON (the kapok)       (the Amazon: an open block of four, joined at nearly the full width,
 *   row 6                            A3 THE AMAZON (the river)  A4 THE AMAZON (the roots)        as Monty on the Run's sewer is, straight after the region's tightest room)
 *
 * Playfield cells as in moscow.ts; a floor "F" is the row he stands on (his body is on rows F-2 and F-1). The route: fly the drop and land on the guardhouse's roof or the terraces (the chullo in the
 * guardhouse); see the empanada on MP1's high ledge, out of reach; down the terraces past the cuy and the llamas, east along the lane under Machu Picchu to the spitting llama at the tunnel's mouth (a wall
 * until the panpipes); up the ladder, over the condor's gap and up the hill against the boulders to the Intihuatana, where the panpipes are (a dead end); back by the ladder, or west from the plateau onto
 * MP1's high ledge for the empanada and down the terraces again (a loop); past the calmed llama through the tunnel and down the well into the canopy (tight into open); down the long liana to the sandbar
 * (the pocket west over the rotten logs); east over the vines to see the tangle in the kapok's root arch and the machete on a bough 8 rows up, out of reach; back over the vines and up the lattice to the
 * walkway, east under the anaconda to the kapok's crown, down its hollow trunk to the bough (the machete), off the bough onto the bank, the tangle cut, and out under the roots on the launch to Rio.
 *
 * The flight rooms are `flights` (flight.ts), the boulders of MP2 and the leaping piranhas `rollers`, the vines of A3 and A4 `vines`, the spit at the tunnel's mouth a pulse calmed by the panpipes, the
 * rotten logs `cracks`.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped (the tables are built by id: buildRooms). The rebuild keeps 55, 57, 58 and 59 for the drop and Machu Picchu and 62, 63, 66 and 65 for the Amazon's
 * four rooms; 56, 60, 61, 64 and 78 (OUT OF THIN AIR, MARKET FORCES, MIST OPPORTUNITY, THE RIVER QUEEN and LLAMA DRAMA) are retired, and no room has them.
 */
export const AND = {
  jump: 55, gorge: 57, terraces: 58, picchu: 59, canopy: 62, kapok: 63, roots: 65, sandbar: 66,
} as const;

/**
 * The sectors' names by their place from 55 (Rio's sectors follow at 67, so the list keeps twelve places: the retired rooms' are empty). The Amazon's four rooms share one name (62), as all six of Monty on
 * the Run's sewer rooms show SEWERAGE WORKS: THE RAINFOREST (the plan's THE AMAZON has a Z, and the room-name font has no good Z).
 */
const NAMES = ['JUMP FOR JOY', '', 'CONDOR COUNTRY', 'NO PROBLLAMA', 'MACHU PICCHU', '', '', 'THE RAINFOREST', '', '', '', ''] as const;
const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
export const ANDES_SECTORS: readonly Sector[] = NAMES.map(centred);
/** The sector of the Amazon's four rooms. */
const AMAZON = 62;
/** The map's colour of each (the sky's light blue, the terraces' green, Machu Picchu's orange, the forest's green). */
export const ANDES_COLOURS: readonly number[] = [14, 0, 14, 13, 8, 0, 0, 5, 0, 0, 0, 0];

// ---- the palettes --------------------------------------------------------------------------------------
/** The sky: the plane's tail and its ramp, rock, snow. Nothing behind (black, as Monty on the Run draws every room). */
export const SKY_PALETTE = {
  K: ['hullPlate', 14], R: ['mountainRock', 9], S: ['snowCap', 1],
} as const satisfies Palette;

/** The terraces (MP1): green grass lips on ochre Inca stone, the guardhouse's thatch, the brown rock of the cliff and the high ledge. */
export const TERRACE_PALETTE = {
  G: ['terraceGrass', 5], W: ['incaWall', 8], T: ['thatch', 7], K: ['mountainRock', 9], P: ['stallPost', 9],
} as const satisfies Palette;

/**
 * Machu Picchu (MP2): the terraces' tiles, the ladder, the well's liana (the canopy's orange), the tunnel's dressed stone, the rock the tunnel ends in, the llama's spit, and Huayna Picchu, the one
 * backdrop: a single dark blue silhouette (scenery: he walks in front of it).
 */
export const PICCHU_PALETTE = {
  G: ['terraceGrass', 5], W: ['incaWall', 8], L: ['woodLadder', 7], V: ['vine', 8], T: ['tunnelStone', 9], K: ['mountainRock', 9], S: ['spitGob', 5], Q: ['hpRock', 6],
} as const satisfies Palette;

/** The canopy (A1): the leaf fringe and the low leaves, the lianas (orange: a colour of their own, nothing else in the Amazon is drawn in it), the boughs and the walkway's planks. */
export const CANOPY_PALETTE = {
  J: ['jungleLeaf', 5], V: ['vine', 8], B: ['plankBridge', 9],
} as const satisfies Palette;

/** The kapok (A2): leaves, the walkway's planks, the trunk's bark. */
export const KAPOK_PALETTE = {
  J: ['jungleLeaf', 5], B: ['plankBridge', 9], K: ['mud', 9],
} as const satisfies Palette;

/** The river (A3): leaves, the sandbar's and the pocket's sand, the water, the logs whole, cracked and split, a vine, the fig's trunk. */
export const SANDBAR_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 7], W: ['riverWater', 6], P: ['deckBoards', 9], Q: ['plankCracked', 9], S: ['plankSplit', 9], V: ['vine', 8], K: ['mud', 9],
} as const satisfies Palette;

/** The roots (A4): leaves, sand, water, the log and the jetty, the vines, the kapok's bark, the bough, and the tangle in the root arch. */
export const ROOTS_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 7], W: ['riverWater', 6], L: ['deckBoards', 9], V: ['vine', 8], K: ['mud', 9], B: ['plankBridge', 9], T: ['tangle', 13],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/** The flight rooms (the parachute drop): an updraft three cells wide from its `top` row to the bottom, one a room. */
export const FLIGHTS: readonly FlightSpec[] = [
  { room: AND.jump, updrafts: [{ col: 9, cols: 3, top: 6 }] },
  { room: AND.gorge, updrafts: [{ col: 13, cols: 3, top: 4 }] },
];

/** The boulders' colour: a grey rock, to stand off the green and ochre terraces and the blue Huayna Picchu behind them. */
const BOULDER_COLOUR = 12;

/**
 * MP2's boulders: from the hill's top at the east edge (floor 4) west along it, a fall of two rows onto the step (floor 6), along it, a fall onto the plateau (floor 8), along it into the condor's gap,
 * where they end; a pixel a frame, `every` 360 frames, three a third of that apart: one every 120 frames rolls down at him as he climbs to the Intihuatana. (A point is a boulder's top left cell: its
 * floor's row less two.)
 */
export const BOULDER_PATH: readonly (readonly [col: number, row: number])[] = [[30, 2], [24.4, 2], [23.2, 4], [20.4, 4], [19.2, 6], [16.2, 6], [14.6, 8]];
export const BOULDERS_OF_PICCHU: readonly RollerSpec[] = [0, 120, 240].map((start, i): RollerSpec => ({
  room: AND.picchu, sprite: [1, 2, 6][i] ?? 1, path: BOULDER_PATH, speed: 1, every: 360, start, frames: BOULDER_POINTERS, colour: BOULDER_COLOUR,
}));

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
/** A3's piranha: in the channel between the second log and the sandbar. */
export const SANDBAR_LEAPS: readonly RollerSpec[] = [leap(AND.sandbar, 1, 16.5, 11, 170, 40)];
/** A4's two: under the first vine's swing, and between the second vine and the east bank, at periods of their own (none a multiple of the other or of the vines' 96). */
export const ROOTS_LEAPS: readonly RollerSpec[] = [leap(AND.roots, 1, 6.5, 10.5, 190, 30), leap(AND.roots, 2, 15.5, 10.5, 230, 120)];

/** Every roller of the region: the boulders and the leaping piranhas. */
export const ROLLERS: readonly RollerSpec[] = [...BOULDERS_OF_PICCHU, ...SANDBAR_LEAPS, ...ROOTS_LEAPS];

/**
 * The vines (VINE AND DANDY's, now crossed twice with a reason): A3's one, from the fig's crown at column 7 over the water between the pocket and the first log; A4's two, from the leaves under the
 * kapok's low boughs at columns 7 and 13, over the water between the sandbar, the log and the east bank. Each swings five cells either way at its tip every 96 frames; he takes hold by walking into one
 * as it swings over the edge he stands on (a jump does not take a rope: Monty on the Run's rule) and steps off as it swings over the far side.
 */
export const VINES: readonly VineSpec[] = [
  { room: AND.sandbar, col: 7, top: 2, length: 12, period: 96, amplitude: 4, phase: 0, code: codeOf(SANDBAR_PALETTE, 'V') },
  { room: AND.roots, col: 7, top: 1, length: 13, period: 96, amplitude: 5, phase: 0, code: codeOf(ROOTS_PALETTE, 'V') },
  { room: AND.roots, col: 13, top: 1, length: 13, period: 96, amplitude: 5, phase: 48, code: codeOf(ROOTS_PALETTE, 'V') },
];

/**
 * The spit at the tunnel's mouth (a pulse): a gob of spit flickers at the llama's lips in front of the tunnel (cols 8-10, rows 16-17) for 30 frames, then flies for 24, and 106 are quiet, so the approach
 * to the llama is a timing as well as the llama itself; a tune (the panpipes) calms it.
 */
export const spitPulses = (panpipes: number): readonly PulseSpec[] => [{
  room: AND.picchu, col: 8, row: 16, cols: 3, rows: 2, period: 160, start: 70, warn: 30, live: 24, idle: 0, warnCode: codeOf(PICCHU_PALETTE, 'S'), liveCode: codeOf(PICCHU_PALETTE, 'S'), spent: 0, calmedBy: panpipes,
}];

/** The logs of A3 (floor 16): the first at cols 10-11, the second at cols 13-15. */
export const LOGS: readonly (readonly [from: number, to: number])[] = [[10, 11], [13, 15]];
/**
 * The rotten logs (cracks, a cell each): each cell shows cracks after 40 frames under his feet, splits after 62 and is gone after 80 (he is over a cell for about 18 frames when he crosses at his walk),
 * so a steady crossing is safe and a pause to look at the piranha or wait for the vine drops him into the river. Whole again 400 frames later, and when he comes into the room: the set-up trap.
 */
export const LOG_CRACKS: readonly CrackSpec[] = LOGS.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k): CrackSpec => ({
  room: AND.sandbar, col: a + k, cols: 1, row: 16, codes: [codeOf(SANDBAR_PALETTE, 'P'), codeOf(SANDBAR_PALETTE, 'Q'), codeOf(SANDBAR_PALETTE, 'S')], crack: 40, wide: 62, gone: 80, away: 400,
})));

// ---- the key items' places -------------------------------------------------------------------------
/** The tangle in the kapok's root arch over the jetty (A4: cols 24-25, rows 12-14, the way out to Rio): the machete cuts it away. */
export const TANGLE_CELLS: readonly (readonly [row: number, col: number])[] = [12, 13, 14].flatMap((row) => [24, 25].map((col) => [row, col] as const));

// ---- the rooms ----------------------------------------------------------------------------------------------

/**
 * Huayna Picchu, the steep peak behind Machu Picchu, one silhouette of scenery tiles (he walks in front of it), painted first so that the terraces overwrite its foot: from its tip (`col`, row `top`)
 * down to row `bottom`, `half` cells either side at the foot, its west flank steeper than its east.
 */
function huaynaPicchu(g: Grid, col: number, top: number, bottom: number, half: number): void {
  for (let r = top; r <= bottom; r++) {
    const reach = ((r - top) * half) / (bottom - top);
    g.box(col - Math.round(reach * 0.7), r, col + Math.round(reach), r, 'Q');
  }
}

const SIGN = { text: 'PERU', colour: 7 } as const;

const PAINT = {
  jump(g: Grid) {
    g.box(0, 0, 1, 13, 'K').box(0, 16, 3, 19, 'K'); // the plane's tail and its ramp (floor 16: the hold's door is rows 14-15)
    g.box(17, 14, 22, 19, 'R').box(18, 13, 21, 13, 'S').box(19, 12, 20, 12, 'S'); // the spire, its snowy tip (floor 12)
    g.box(23, 12, 31, 19, 'R').box(23, 11, 31, 11, 'S'); // the mountain's shoulder: the gorge below is open only west of the spire
  },
  gorge(g: Grid) {
    // the gorge: cliffs close in from 24 cells at the top (cols 4-27) to 15 at the foot (cols 3-17), split there by a pinnacle into two throats, the narrow west one over the guardhouse's roof
    g.box(0, 0, 3, 13, 'R').box(0, 14, 2, 19, 'R');
    g.box(28, 0, 31, 19, 'R').box(21, 0, 27, 3, 'R'); // the east cliff and the overhang
    g.box(22, 8, 27, 8, 'S').box(22, 9, 31, 12, 'R').box(20, 13, 31, 19, 'R').box(20, 12, 21, 12, 'S'); // the shelf under the overhang, the cliff below it
    g.box(8, 15, 10, 19, 'R').box(8, 14, 10, 14, 'S'); // the pinnacle
    g.box(15, 16, 19, 19, 'R').box(15, 15, 19, 15, 'S'); // a spur: the east throat is cols 11-14, over the broad terrace's west end
  },
  terraces(g: Grid) {
    g.box(0, 8, 8, 8, 'G').box(0, 9, 8, 19, 'W'); // the top terrace (floor 8)
    g.box(1, 5, 7, 5, 'T').box(1, 6, 1, 7, 'W').box(7, 6, 7, 7, 'P'); // the guardhouse: its thatched roof (floor 5) on its back wall and a post, open to the east
    g.box(9, 10, 10, 10, 'G').box(9, 11, 10, 19, 'W'); // a step (floor 10)
    g.box(11, 12, 17, 12, 'G').box(11, 13, 17, 19, 'W'); // the broad terrace (floor 12)
    g.box(18, 14, 21, 14, 'G').box(18, 15, 21, 19, 'W'); // the last step (floor 14), then a drop to the low path
    g.box(22, 18, 31, 18, 'G').box(22, 19, 31, 19, 'W'); // the low path (floor 18), east under the cliff to Machu Picchu's lane
    g.box(22, 8, 31, 9, 'K').box(28, 10, 31, 14, 'K'); // the high ledge (floor 8) on Machu Picchu's cliff
  },
  picchu(g: Grid) {
    huaynaPicchu(g, 17, 0, 7, 9);
    g.box(0, 8, 12, 8, 'G').box(0, 9, 12, 14, 'W').clear(4, 8, 6, 14).box(5, 8, 5, 17, 'L'); // the plateau (floor 8), its ladder down to the lane in a shaft three wide
    g.box(13, 10, 15, 10, 'G').box(13, 11, 15, 14, 'W'); // the condor's gap (floor 10)
    g.box(16, 8, 19, 8, 'G').box(16, 9, 19, 14, 'W'); // the plateau beyond it
    g.box(20, 6, 23, 6, 'G').box(20, 7, 23, 14, 'W').box(24, 4, 31, 4, 'G').box(24, 5, 31, 14, 'W'); // the hill's step (floor 6) and its top (floor 4), the Intihuatana's
    g.box(11, 13, 24, 14, 'T'); // the tunnel's lintel
    g.box(25, 13, 31, 17, 'K'); // the rock the tunnel ends in
    g.box(0, 18, 31, 18, 'G').box(0, 19, 31, 19, 'W').clear(19, 18, 21, 19).box(20, 18, 20, 19, 'V'); // the lane (floor 18) and the well, its liana down into the canopy
  },
  canopy(g: Grid) {
    g.box(0, 0, 18, 0, 'J').box(22, 0, 31, 0, 'J').box(0, 1, 3, 1, 'J').box(9, 1, 14, 1, 'J').box(26, 1, 31, 1, 'J'); // the leaf fringe (the well comes in at cols 19-21)
    g.box(4, 2, 4, 17, 'V').box(12, 2, 12, 17, 'V').box(20, 0, 20, 19, 'V'); // the lianas: two, and the long one from the well down to the sandbar
    g.box(5, 7, 19, 7, 'V').box(5, 12, 19, 12, 'V'); // the cross lianas
    g.box(22, 4, 31, 4, 'B'); // the walkway (floor 4), east to the kapok
    g.box(5, 6, 9, 6, 'B').box(13, 10, 18, 10, 'B').box(21, 14, 26, 14, 'B'); // the boughs (floors 6, 10 and 14), each off a liana
    g.box(0, 18, 12, 19, 'J').box(16, 18, 17, 19, 'J').box(30, 16, 31, 19, 'J'); // the low leaves: open below only over the sandbar and the second log
  },
  kapok(g: Grid) {
    g.box(0, 0, 31, 0, 'J').box(16, 1, 31, 1, 'J'); // the leaf fringe and the kapok's crown (above his head: the walkway is clear at rows 2-3)
    g.box(0, 4, 21, 4, 'B'); // the walkway to the crown
    g.box(22, 4, 25, 4, 'K').box(29, 4, 31, 4, 'K').box(24, 5, 25, 19, 'K').box(29, 5, 31, 19, 'K').box(22, 5, 23, 6, 'K'); // the trunk, its hollow (cols 26-28) open at the crown
    g.box(0, 16, 23, 19, 'J'); // the low boughs: the floor is closed but for the hollow
  },
  sandbar(g: Grid) {
    g.box(0, 0, 12, 1, 'J').box(0, 2, 1, 9, 'K').box(0, 10, 2, 11, 'K'); // the fig: its crown, its trunk, the root that roofs the pocket
    g.box(0, 15, 3, 19, 'M'); // the pocket's floor (floor 15)
    g.box(4, 16, 17, 19, 'W'); // the river
    for (const [a, b] of LOGS) g.box(a, 16, b, 16, 'P'); // the rotten logs (floor 16)
    g.box(18, 15, 31, 19, 'M'); // the sandbar (floor 15), east into the roots' room
    g.box(20, 0, 20, 14, 'V'); // the long liana down to the sandbar
  },
  roots(g: Grid) {
    g.box(0, 0, 23, 0, 'J').box(0, 1, 4, 1, 'J').box(9, 1, 11, 1, 'J').box(17, 1, 23, 1, 'J'); // the leaves under the kapok's low boughs
    g.box(24, 0, 25, 11, 'K').box(29, 0, 31, 11, 'K').box(26, 7, 28, 11, 'K').clear(24, 4, 25, 6); // the trunk: its hollow (cols 26-28) down to rows 4-6, open west onto the bough
    g.box(22, 7, 25, 7, 'B'); // the bough (floor 7): five cells and more from the nearest a vine swings, so it is reached only down the hollow
    g.box(22, 9, 23, 11, 'K').box(23, 8, 23, 8, 'K'); // a buttress
    g.box(0, 15, 4, 19, 'M'); // the sandbar (floor 15)
    g.box(5, 16, 17, 19, 'W').box(9, 16, 11, 16, 'L'); // the river and its log
    g.box(18, 15, 23, 19, 'M').box(24, 15, 31, 15, 'L').box(24, 16, 31, 19, 'W'); // the east bank and the jetty over the water
    for (const [row, col] of TANGLE_CELLS) g.box(col, row, col, row, 'T'); // the tangle in the root arch
  },
} as const;

/** MP1's high ledge's empanada (the sprite's top left cell). */
const LEDGE_EMPANADA = [27, 6] as const;

export const ANDES_ROOMS: readonly RoomSpec[] = [
  // F1 JUMP FOR JOY: out of the plane's tail. In at the left on the ramp (floor 16: the hold's door, rows 14-15); off the ramp's end the canopy opens. An updraft (cols 9-11) lifts him to glide to the
  // spire, the coin on its snowy tip: the first thing the new move is for. The bottom is open west of the spire: he sinks out of it into the gorge. No creature, nothing falling.
  room({
    id: AND.jump, cell: [2, 30], sector: 55, palette: SKY_PALETTE, paint: PAINT.jump,
    coins: [[19, 10]],
    decor: [['mistCloud', 4, 4], ['mistCloud', 24, 6], ['updraft', 9, 12], ['updraft', 9, 8]],
  }),

  // F2 CONDOR COUNTRY: the gorge, its cliffs closing in. An updraft (cols 13-15) lifts him to the overhang, where he steers onto the shelf (floor 8) for the empanada; two condors dive, one in the updraft's
  // column, one in the neck; the coin hangs between their dives. A pinnacle splits the foot into two throats: the narrow west one lands on the guardhouse's roof, the wide east one on the terraces.
  room({
    id: AND.gorge, cell: [3, 30], sector: 57, palette: SKY_PALETTE, paint: PAINT.gorge,
    coins: [[16, 9]],
    item: { name: 'empanada1', col: 24, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['mistCloud', 6, 2], ['updraft', 13, 10], ['updraft', 13, 6]],
    creatures: [{ who: 'condor', col: 13, row: 3, way: 'down', speed: 1, range: 96 }, { who: 'condor', col: 20, row: 4, way: 'down', speed: 1, range: 48 }],
  }),

  // MP1 NO PROBLLAMA: Machu Picchu's terraces. The guardhouse on the top terrace (floor 8) holds the chullo; its roof's coin is for the west landing. The terraces step down east (floors 10, 12, 14), the
  // cuy hopping over the last step, then a drop to the low path (floor 18), where two llamas graze and wink, and east under the cliff into Machu Picchu's lane. The high ledge on the cliff (floor 8) holds
  // an empanada in plain sight, out of reach from here: it is Machu Picchu's plateau that runs out onto it, and off its west end the drop is onto the last step, so the terraces climb back to the top.
  room({
    id: AND.terraces, cell: [4, 30], sector: 58, palette: TERRACE_PALETTE, paint: PAINT.terraces,
    coins: [[4, 3]],
    cake: LEDGE_EMPANADA, cakeSprite: ANDES_SPRITE.empanada,
    item: { name: 'chullo', col: 3, row: 6, sprite: ANDES_SPRITE.chullo },
    decor: [[SIGN, 1, 4]],
    creatures: [{ who: 'cuy', col: 19, row: 7, way: 'down', speed: 1, range: 40 }, { who: 'llama', col: 15, row: 10, way: 'right', speed: 1, range: 8 }, { who: 'llama', col: 22, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // MP2 MACHU PICCHU: the plateau, Huayna Picchu behind. The lane (floor 18) runs east from the terraces under the plateau into the tunnel (cols 11-24, rows 15-17 under the lintel), where the spitting
  // llama paces the mouth: a wall until the panpipes. The ladder (col 5) climbs to the plateau (floor 8); a condor dives into the gap (cols 13-15); the hill steps up (floors 6, 4) to the Intihuatana, the
  // panpipes by it, the boulders rolling down at him every 120 frames. The plateau runs out west onto the terraces' high ledge. In the tunnel the well (cols 19-21) drops into the canopy.
  room({
    id: AND.picchu, cell: [4, 31], sector: 59, palette: PICCHU_PALETTE, paint: PAINT.picchu,
    coins: [[30, 2], [21, 4]],
    item: { name: 'panpipes', col: 25, row: 2, sprite: ANDES_SPRITE.panpipes },
    decor: [['intihuatana', 28, 2], ['torch', 22, 16], ['torch', 24, 16]],
    creatures: [{ who: 'spitter', col: 11, row: 16, way: 'right', speed: 1, range: 40 }, { who: 'condor', col: 13, row: 1, way: 'down', speed: 1, range: 56 }],
  }),

  // A1 THE AMAZON, the canopy: the open block's first room, straight out of the tunnel's squeeze. The long liana from the well runs down through the walkway's gap and out at the bottom to the sandbar;
  // two more lianas and two cross lianas make a lattice to climb in any direction, boughs (floors 6, 10, 14) in it; the walkway (floor 4) runs east to the kapok. The coin hangs at a crossing. A sloth
  // and a toucan climb up and down. Below, the low leaves are open only over the sandbar and the second log.
  room({
    id: AND.canopy, cell: [5, 31], sector: AMAZON, palette: CANOPY_PALETTE, paint: PAINT.canopy,
    coins: [[13, 11]],
    creatures: [{ who: 'sloth', col: 3, row: 3, way: 'down', speed: 1, range: 88, colour: 15 }, { who: 'toucan', col: 16, row: 3, way: 'down', speed: 1, range: 64 }],
  }),

  // A2 THE AMAZON, the kapok: the walkway runs east to the kapok's crown (floor 4), the anaconda hanging from the canopy over it (its coin at the foot of the patrol), the jaguar pacing the crown; the
  // hollow trunk (cols 26-28) is the only way down, and a one-way drop. Under the walkway the low boughs close the floor (floor 16): a fall off it walks west into the canopy and down to the sandbar.
  room({
    id: AND.kapok, cell: [5, 32], sector: AMAZON, palette: KAPOK_PALETTE, paint: PAINT.kapok,
    coins: [[17, 2]],
    creatures: [{ who: 'anaconda', col: 16, row: 2, way: 'down', speed: 1, range: 64, colour: 13 }, { who: 'jaguar', col: 26, row: 2, way: 'right', speed: 1, range: 24 }],
  }),

  // A3 THE AMAZON, the river: the long liana comes down to the sandbar (floor 15); west over the channel (a piranha leaping in it), two rotten logs that give way under a pause, and the vine from the fig
  // to the pocket under the fig's root, where the coin and the empanada are (off the route). A dolphin leaps under the vine. East along the sandbar into the roots' room.
  room({
    id: AND.sandbar, cell: [6, 31], sector: AMAZON, palette: SANDBAR_PALETTE, paint: PAINT.sandbar,
    coins: [[3, 14]],
    item: { name: 'empanada2', col: 0, row: 13, sprite: ANDES_SPRITE.empanada },
    creatures: [{ who: 'dolphin', col: 5, row: 17, way: 'up', speed: 1, range: 40 }],
  }),

  // A4 THE AMAZON, the roots: two vines and a log over the river (cols 5-17), two piranhas leaping; the coin on the log between the vines. The east bank (floor 15) and the jetty under the kapok's root arch,
  // the tangle filling the arch (THE UNDERGROWTH IS TOO THICK); the machete in sight on the bough 8 rows up, reached only down the hollow trunk from the crown. Out east under the roots on the launch to Rio.
  room({
    id: AND.roots, cell: [6, 32], sector: AMAZON, palette: ROOTS_PALETTE, paint: PAINT.roots,
    coins: [[10, 14]],
    item: { name: 'machete', col: 22, row: 5, sprite: ANDES_SPRITE.machete },
    decor: [['launch', 26, 12]],
  }),
];

/** Every room of the region, for the tests that look at them all. */
export const ANDES_ALL_ROOMS: readonly RoomSpec[] = ANDES_ROOMS;
