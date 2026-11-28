import type { Arrival, CrackSpec, FlightSpec, PulseSpec, RollerSpec, VineSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { ANDES_SPRITE, BOULDER_POINTERS } from './andes-pointers';
import { leap } from './leaps';
import { codeOf, fillCells, fillWhere, room, type Grid, type Palette } from './layout';
import { rollerTrain } from '../../montyotr/src/rollers';

/**
 * The Andes and the Amazon, the sixth region of Do Svidaniya Monty (docs/dosvidaniya-back-half-plan.md: the back half rebuilt longer, the rooms the 2026-11-23 reset cut brought back): thirteen rooms at
 * columns 25-28 of the exit grid (rows 2-7), entered from the flight's bail-out (sky.ts: he parachutes into JUMP FOR JOY's top) and left east off BRANCHING OUT's crown into Rio's first room, OPEN ARMS
 * ([6,28], entered west at rows 6-7 on floor 8).
 *
 *            col 25                    26                       27                       28
 *   row 2   JUMP FOR JOY                                                                                      (the parachute drop: three flight rooms, one under another, a course)
 *   row 3   OUT OF THIN AIR
 *   row 4   CONDOR COUNTRY
 *   row 5   NO PROBLLAMA             MACHU PICCHU             THE INCA BRIDGE                                  (the bridge: the scenic dead end off Machu Picchu's top)
 *   row 6   CLOUD NINE               THE CANOPY               BRANCHING OUT            (Rio: OPEN ARMS)        (the Amazon: a U, the canopy west along the top,
 *   row 7   VINE AND DANDY           UP THE CREEK             THE ROOTS                THE RIVER QUEEN          the river east along the bottom, the boat off it,
 *                                                                                               and at [7,29] THE RIVER ENDS: the last bank, east of her stern)
 *
 * Playfield cells as in moscow.ts; a floor "F" is the row he stands on (his body is on rows F-2 and F-1). The route: the drop (an updraft to the spire's coin; the canyon threaded past two condors, the coin
 * over its ridge; the gorge's shelf and its two throats) onto the guardhouse's roof or the terraces (the chullo in the guardhouse); down the terraces past the llamas and the cuy, east along the lane under
 * Machu Picchu to the spitting llama at the tunnel's mouth (a wall until the panpipes); up the ladder, over the gap and up the hill to the Intihuatana against the boulders tumbling down it, the panpipes at
 * its top; east along the top onto the Inca trail, over the logs across the gap to its end (an empanada) and back; west from the plateau onto the terraces' high ledge (a loop); past the calmed llama down the
 * well into the canopy. The Amazon goes round as a U: west along the canopy's lattice into the cloud forest, down its liana, over the stream's stones and down the west liana to the river; east over the
 * vines of VINE AND DANDY, the rotten logs of the creek and the roots' vines to the east bank under the kapok; up the liana to the kapok's crown, where the tangle chokes the branch to Rio. The machete is on
 * the river: aboard THE RIVER QUEEN, moored east of the roots, whose captain lets only a local aboard (the chullo) and walks off aft. Past her stern the bank goes on east to THE RIVER ENDS (off the route:
 * the muddy stair up past the anaconda to the high bank, where the forest closes in). Back up the liana, the tangle cut, east into Rio.
 *
 * The flight rooms are `flights` (flight.ts), the boulders and the leaping piranhas `rollers`, the vines `vines`, the spit at the tunnel's mouth a pulse calmed by the panpipes, the rotten logs `cracks`.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped (the tables are built by id: buildRooms). The drop, Machu Picchu and the Amazon's first four keep 55-59 and 62, 63, 65, 66; OUT OF THIN AIR and THE RIVER
 * QUEEN come back as their own 56 and 64; the rooms new since the reset take the ids kept for the back half's returns after the sky's (83 THE INCA BRIDGE, 84 CLOUD NINE, 85 VINE AND DANDY: their format 1
 * ids 62 and 65 are the canopy's and the roots' now), and THE RIVER ENDS the first after Hawaii's (94: its format 1 id 66 is the creek's). 60, 61 and 78 (MARKET FORCES, MIST OPPORTUNITY, LLAMA DRAMA) are
 * no room's.
 */
export const AND = {
  jump: 55, thin: 56, gorge: 57, terraces: 58, picchu: 59, canopy: 62, kapok: 63, boat: 64, roots: 65, sandbar: 66, bridge: 83, cloud: 84, vine: 85, ends: 94,
} as const;

/** The sectors' names by their place from 55 (Rio's sectors follow at 67, so the list keeps twelve places: the retired rooms' are empty). Every room has a name of its own. */
const NAMES = ['JUMP FOR JOY', 'OUT OF THIN AIR', 'CONDOR COUNTRY', 'NO PROBLLAMA', 'MACHU PICCHU', '', '', 'THE CANOPY', 'BRANCHING OUT', 'THE RIVER QUEEN', 'THE ROOTS', 'UP THE CREEK'] as const;
export const centredSector = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
export const ANDES_SECTORS: readonly Sector[] = NAMES.map(centredSector);
/** The map's colour of each (the sky's light blue, the terraces' green, Machu Picchu's orange, the forest's greens, the boat's white, the river's blues). */
export const ANDES_COLOURS: readonly number[] = [14, 14, 14, 13, 8, 0, 0, 5, 13, 1, 3, 6];
/** The names and map colours of the rooms whose sectors are after the sky's (later-sectors.ts lays them out with the other regions'). */
export const ANDES_LATER_NAMES: Readonly<Record<number, string>> = { [AND.bridge]: 'THE INCA BRIDGE', [AND.cloud]: 'CLOUD NINE', [AND.vine]: 'VINE AND DANDY', [AND.ends]: 'THE RIVER ENDS' };
export const ANDES_LATER_COLOURS: Readonly<Record<number, number>> = { [AND.bridge]: 12, [AND.cloud]: 5, [AND.vine]: 7, [AND.ends]: 10 };

// ---- the palettes --------------------------------------------------------------------------------------
/** The drop: rock and snow (the far ranges are a decoration on the horizon, `andPeaks`). */
export const SKY_PALETTE = {
  R: ['mountainRock', 9], S: ['snowCap', 1],
} as const satisfies Palette;

/** The terraces (MP1): green grass lips on ochre Inca dry-stone walls, the guardhouse's thatch, the brown rock of the cliff and the high ledge (the far range: `andPeaks` on the horizon). */
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

/** THE INCA BRIDGE: the rock the trail is cut in, its tread, the logs over the gap, the forest of the valley far below (a backdrop; the far ranges: `andPeaks` on the horizon, the night over the trail). */
export const BRIDGE_PALETTE = {
  K: ['mountainRock', 9], L: ['rockLedge', 12], B: ['plankBridge', 8], D: ['andLeaves', 5],
} as const satisfies Palette;

/** The canopy (A1): the leaf fringe and the low leaves, the lianas hanging and slung across (orange: a colour of their own, nothing else in the Amazon is drawn in it), the bough, a trunk's bark, the crowns behind. */
export const CANOPY_PALETTE = {
  J: ['jungleLeaf', 5], V: ['vine', 8], H: ['lianaAcross', 8], B: ['plankBridge', 9], K: ['mud', 9], D: ['andLeaves', 11],
} as const satisfies Palette;

/** CLOUD NINE: leaves, the moss of the forest floor, the stream's stones, the lianas, the water, a trunk, the misty crowns behind (dark grey: the cloud in the forest). */
export const CLOUD_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mossGround', 13], G: ['rockLedge', 9], V: ['vine', 8], H: ['lianaAcross', 8], W: ['riverWater', 6], K: ['mud', 9], D: ['andLeaves', 11],
} as const satisfies Palette;

/** The kapok (BRANCHING OUT): leaves, the walkway's, the boughs' and the branch's planks, the liana up its flank, the tangle on the crown's branch, the crown's leaves over all (a backdrop: THE INCA BRIDGE's valley is over it). */
export const KAPOK_PALETTE = {
  J: ['jungleLeaf', 5], B: ['plankBridge', 9], V: ['vine', 8], T: ['tangle', 13], D: ['andLeaves', 5],
} as const satisfies Palette;

/** VINE AND DANDY (as it was): the canopy, the banks' mud, the wide brown river, the logs, the vines, the forest behind. */
export const VINE_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], L: ['deckBoards', 9], V: ['vine', 8], D: ['andLeaves', 11],
} as const satisfies Palette;

/** The creek (A3): leaves (the fig over the niche is leaves, as VINE AND DANDY's trees at the join are), the sandbar's and the pocket's sand, the water, the logs whole, cracked and split, a vine, the forest behind. */
export const SANDBAR_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 7], W: ['riverWater', 6], P: ['deckBoards', 9], Q: ['plankCracked', 9], S: ['plankSplit', 9], V: ['vine', 8], D: ['andLeaves', 11],
} as const satisfies Palette;

/** The roots: leaves, sand, water, the log, the vines and the liana up the kapok, the forest behind (the kapok's trunk is a backdrop: `kapokBark`). */
export const ROOTS_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 7], W: ['riverWater', 6], L: ['deckBoards', 9], V: ['vine', 8], D: ['andLeaves', 11],
} as const satisfies Palette;

/** THE RIVER ENDS (as it was): the leaves, the bank's and the stair's mud, the pool, the forest behind. */
export const ENDS_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], D: ['andLeaves', 11],
} as const satisfies Palette;

/** THE RIVER QUEEN: the white hull and cabin, the deck's boards, the ladder, the bank's mud, the leaves, the river, the far bank's forest behind. */
export const BOAT_PALETTE = {
  H: ['hullPlate', 1], D: ['deckBoards', 9], L: ['woodLadder', 7], M: ['mud', 9], J: ['jungleLeaf', 5], W: ['riverWater', 6], E: ['andLeaves', 11],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * The flight rooms (the parachute drop, a short course): an updraft three cells wide from its `top` row to the bottom. JUMP FOR JOY teaches the updraft (to the spire's coin); OUT OF THIN AIR has one in
 * each canyon (the left one tall: a line that sinks too soon is lifted back up for the coin on the crest; the right canyon has a floor, and its updraft lifts him back over the ridge); CONDOR COUNTRY's lifts him to the overhang's shelf.
 */
export const FLIGHTS: readonly FlightSpec[] = [
  { room: AND.jump, updrafts: [{ col: 9, cols: 3, top: 6 }] },
  { room: AND.thin, updrafts: [{ col: 5, cols: 3, top: 3 }, { col: 22, cols: 3, top: 6 }] },
  { room: AND.gorge, updrafts: [{ col: 13, cols: 3, top: 4 }] },
];

/** The boulders' colour: a grey rock, to stand off the green and ochre terraces and the blue Huayna Picchu behind them. */
const BOULDER_COLOUR = 12;

/**
 * MP2's boulders: tumbling down off the mountain above onto the lip of the hill's top (floor 4, col 24), then down the way he climbs to the Intihuatana: a fall of two rows onto the step (floor 6), along
 * it, a fall onto the plateau (floor 8), along it into the cuy's gap, where they end. Each is seen falling from the top of the screen before it lands; none crosses the top east of the lip, the way on to
 * the Inca bridge. A pixel a frame, `every` 360 frames, three a third of that apart: one every 120 frames rolls down at him as he climbs. (A point is a boulder's top left cell: its floor's row less two.)
 */
export const BOULDER_PATH: readonly (readonly [col: number, row: number])[] = [[24.2, -2], [24.2, 2], [23.2, 4], [20.4, 4], [19.2, 6], [16.2, 6], [14.6, 8]];
export const BOULDERS_OF_PICCHU: readonly RollerSpec[] = rollerTrain(
  { room: AND.picchu, path: BOULDER_PATH, speed: 1, every: 360, frames: BOULDER_POINTERS, colour: BOULDER_COLOUR },
  [{ sprite: 1, start: 0 }, { sprite: 2, start: 120 }, { sprite: 6, start: 240 }],
);

/** VINE AND DANDY's two, where its piranhas were: under the first vine's swing and between the logs, at periods of their own (none a multiple of the other or of the vines' 96). */
export const VINE_LEAPS: readonly RollerSpec[] = [leap(AND.vine, 1, 10.5, 11, 170, 20), leap(AND.vine, 2, 18.5, 11, 210, 100)];
/** The creek's piranha: in the channel between the second log and the sandbar. */
export const SANDBAR_LEAPS: readonly RollerSpec[] = [leap(AND.sandbar, 1, 16.5, 11, 170, 40)];
/** The roots' two: under the first vine's swing, three cells clear of the west bank, and between the second vine and the east bank, at periods of their own. */
export const ROOTS_LEAPS: readonly RollerSpec[] = [leap(AND.roots, 1, 9.5, 10.5, 190, 30), leap(AND.roots, 2, 18.5, 10.5, 230, 120)];

/** Every roller of the region: the boulders and the leaping piranhas. */
export const ROLLERS: readonly RollerSpec[] = [...BOULDERS_OF_PICCHU, ...VINE_LEAPS, ...SANDBAR_LEAPS, ...ROOTS_LEAPS];

/**
 * The vines. VINE AND DANDY's three, as they were: from the canopy at columns 8, 16 and 24, thirteen cells long (to the height of his middle on the banks), five cells either way at the tip every 96 frames,
 * a third of a swing apart. The creek's one, from the canopy at column 9 over the water between the west bank and the first log. The roots' two, from the leaves at columns 10 and 17, over the water
 * between the west bank (eight cells wide: the run-up, the take and the landing all in the room), the log and the east bank. He takes hold by walking into one as it swings over the edge he stands on
 * (a jump does not take a rope: Monty on the Run's rule) and steps off as it swings over the far side.
 */
export const VINES: readonly VineSpec[] = [
  ...[8, 16, 24].map((col, i): VineSpec => ({ room: AND.vine, col, top: 3, length: 13, period: 96, amplitude: 5, phase: i * 32, code: codeOf(VINE_PALETTE, 'V') })),
  { room: AND.sandbar, col: 9, top: 2, length: 13, period: 96, amplitude: 4, phase: 0, code: codeOf(SANDBAR_PALETTE, 'V') },
  { room: AND.roots, col: 10, top: 1, length: 14, period: 96, amplitude: 5, phase: 0, code: codeOf(ROOTS_PALETTE, 'V') },
  { room: AND.roots, col: 17, top: 1, length: 14, period: 96, amplitude: 5, phase: 48, code: codeOf(ROOTS_PALETTE, 'V') },
];

/**
 * The spit at the tunnel's mouth (a pulse): a gob of spit flickers at the llama's lips in front of the tunnel (cols 8-10, rows 16-17) for 30 frames, then flies for 24, and 106 are quiet, so the approach
 * to the llama is a timing as well as the llama itself; a tune (the panpipes) calms it.
 */
export const spitPulses = (panpipes: number): readonly PulseSpec[] => [{
  room: AND.picchu, col: 8, row: 16, cols: 3, rows: 2, period: 160, start: 70, warn: 30, live: 24, idle: 0, warnCode: codeOf(PICCHU_PALETTE, 'S'), liveCode: codeOf(PICCHU_PALETTE, 'S'), spent: 0, calmedBy: panpipes,
}];

/** The logs of the creek (floor 16): the first at cols 10-11, the second at cols 13-15. */
export const LOGS: readonly (readonly [from: number, to: number])[] = [[10, 11], [13, 15]];
/**
 * The rotten logs (cracks, a cell each): each cell shows cracks after 40 frames under his feet, splits after 62 and is gone after 80 (he is over a cell for about 18 frames when he crosses at his walk),
 * so a steady crossing is safe and a pause to look at the piranha or wait for the vine drops him into the river. Whole again 400 frames later, and when he comes into the room: the set-up trap.
 */
export const LOG_CRACKS: readonly CrackSpec[] = LOGS.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k): CrackSpec => ({
  room: AND.sandbar, col: a + k, cols: 1, row: 16, codes: [codeOf(SANDBAR_PALETTE, 'P'), codeOf(SANDBAR_PALETTE, 'Q'), codeOf(SANDBAR_PALETTE, 'S')], crack: 40, wide: 62, gone: 80, away: 400,
})));

// ---- the key items' places -------------------------------------------------------------------------
/** The tangle on the kapok's crown branch (BRANCHING OUT: cols 25-26, rows 5-7, the way out east to Rio): the machete cuts it away. */
export const TANGLE_CELLS: readonly (readonly [row: number, col: number])[] = [5, 6, 7].flatMap((row) => [25, 26].map((col) => [row, col] as const));
/** THE RIVER QUEEN's captain: the room's first creature, the one the chullo sends off (data.ts's room effect). */
export const CAPTAIN_SLOT = 0;

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

/**
 * Trees seen behind in a backdrop letter, painted first so everything solid overwrites them: each a round crown (col, row, radius in cells, drawn a little wider than tall) on a trunk down to row
 * `foot`, only into empty cells. Separate shapes with black between, never a band across the room.
 */
function trees(g: Grid, letter: string, crowns: readonly (readonly [col: number, row: number, radius: number])[], foot: number): void {
  for (const [cc, cr, rad] of crowns) {
    for (let r = Math.max(0, cr - rad); r <= Math.min(19, cr + rad); r++) for (let c = Math.max(0, Math.floor(cc - rad * 1.4)); c <= Math.min(31, Math.ceil(cc + rad * 1.4)); c++) {
      if (((c - cc) / (rad * 1.4)) ** 2 + ((r - cr) / rad) ** 2 <= 1 && g.at(c, r) === '.') g.box(c, r, c, r, letter);
    }
    for (let r = cr + rad; r <= foot; r++) if (g.at(cc, r) === '.') g.box(cc, r, cc, r, letter);
  }
}

/** The banner on coming out of the plane into the Andes' sky, on the name line (the country, as each region's arrival says it). One name row: 32 letters. */
export const ANDES_ARRIVALS: readonly Arrival[] = [{ rooms: [AND.jump], text: 'PERU' }];

/** The Inca tunnel's mouth (MP2): the lane under the lintel, cols 12-24, rows 15-17, the well (cols 19-21) in it; the torches standing on its floor against the back wall. */
const TUNNEL = [12, 15, 24, 17] as const;
const TORCHES: readonly (readonly [col: number, row: number])[] = [[18, 16], [23, 16]];
/** The kapok's trunk (BRANCHING OUT), a backdrop he climbs in front of: cols 14-16 from the crown down to the low boughs. */
const KAPOK_TRUNK = [14, 1, 16, 15] as const;
/** The kapok's foot in THE ROOTS: the trunk running up out of the room at the east, its buttress roots flaring down to the bank (a backdrop, `kapokBark`). */
const KAPOK_FOOT = (col: number, row: number): boolean => row <= 14 && col >= 27 - Math.max(0, row - 9);

const PAINT = {
  jump(g: Grid) {
    g.box(0, 0, 0, 19, 'R').box(0, 16, 3, 19, 'R'); // the mountainside closing the west, and its foot (over the canyon's west cliff below); he drops in from the top: the mail plane's bail-out, sky.ts
    g.box(17, 14, 22, 19, 'R').box(18, 13, 22, 13, 'S').box(19, 12, 22, 12, 'S'); // the spire, its snowy tip (floor 12) run on to the shoulder (no pocket between them to be stuck in: he walks off the tip westward and the canopy takes him)
    g.box(23, 12, 31, 19, 'R').box(23, 11, 31, 11, 'S'); // the mountain's shoulder: the canyon below is open only west of the spire
  },
  thin(g: Grid) {
    // the canyon, as it was before the reset: the cliffs step in at each side, a ridge rises mid-room with a snowy crest (floor 9), the right canyon has a floor (row 18), the left one is the way down
    g.box(0, 0, 2, 19, 'R').box(3, 8, 3, 19, 'R').box(4, 13, 4, 19, 'R').box(29, 0, 31, 19, 'R').box(28, 7, 28, 19, 'R').box(27, 12, 27, 19, 'R');
    g.box(11, 14, 20, 19, 'R').box(21, 18, 26, 19, 'R').box(12, 12, 19, 13, 'R').box(14, 10, 17, 11, 'R').box(14, 10, 17, 10, 'S').box(15, 9, 16, 9, 'S');
  },
  gorge(g: Grid) {
    // the gorge: cliffs close in from 24 cells at the top (cols 4-27) to 15 at the foot (cols 3-17), split there by a pinnacle into two throats, the narrow west one over the guardhouse's roof
    g.box(0, 0, 3, 13, 'R').box(0, 14, 2, 19, 'R');
    g.box(28, 0, 31, 19, 'R').box(21, 2, 27, 2, 'S').box(21, 3, 27, 3, 'R'); // the east cliff and the overhang jutting from it, snow on its top, the far range over it (no rock along the top: no ceiling)
    g.box(22, 8, 27, 8, 'S').box(22, 9, 31, 12, 'R').box(20, 13, 31, 19, 'R').box(20, 12, 21, 12, 'S'); // the shelf under the overhang, the cliff below it
    g.box(8, 15, 10, 19, 'R').box(8, 14, 10, 14, 'S'); // the pinnacle
    g.box(15, 16, 19, 19, 'R').box(15, 15, 19, 15, 'S'); // a spur: the east throat is cols 11-14, over the broad terrace's west end
  },
  terraces(g: Grid) {
    g.box(0, 0, 1, 7, 'K'); // the mountainside the top terrace ends at (the gorge's west cliff come down): the terrace leads nowhere west, and looks it
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
    g.box(13, 10, 15, 10, 'G').box(13, 11, 15, 14, 'W'); // the gap (floor 10)
    g.box(16, 8, 19, 8, 'G').box(16, 9, 19, 14, 'W'); // the plateau beyond it
    g.box(20, 6, 23, 6, 'G').box(20, 7, 23, 14, 'W').box(24, 4, 31, 4, 'G').box(24, 5, 31, 14, 'W'); // the hill's step (floor 6) and its top (floor 4), the Intihuatana's, open east onto the Inca trail
    g.box(11, 13, 24, 13, 'T').box(12, 14, 24, 14, 'T'); // the tunnel's lintel, its mouth narrowing as an Inca doorway does
    g.box(25, 13, 31, 17, 'K'); // the rock the tunnel ends in
    g.box(0, 18, 31, 18, 'G').box(0, 19, 31, 19, 'W').clear(19, 18, 21, 19).box(20, 18, 20, 19, 'V'); // the lane (floor 18) and the well, its liana down into the canopy
  },
  bridge(g: Grid) {
    // the valley far below behind him, to the west: the citadel on its saddle, the forest of the valley floor; the far ranges on the horizon, the night over the trail and the drop under it
    g.box(2, 18, 15, 19, 'D');
    g.clear(16, 7, 18, 19); // the cleft under the logs, black all the way down
    g.box(0, 4, 1, 19, 'K'); // the spur of Machu Picchu's mountain the trail leaves from (its east side is solid from the top's floor down)
    g.box(0, 4, 9, 4, 'L').box(2, 5, 9, 6, 'K'); // the trail along the top's floor (floor 4), the rock it is cut in under its tread
    g.box(10, 6, 15, 6, 'L').box(10, 7, 15, 8, 'K'); // a step down (floor 6)
    g.box(16, 6, 18, 6, 'B'); // the logs across the gap
    g.box(19, 6, 23, 6, 'L').box(19, 7, 23, 8, 'K'); // on along the face
    g.box(24, 4, 29, 4, 'L').box(24, 5, 29, 8, 'K'); // a step up (floor 4) to the trail's end
    g.box(30, 0, 31, 8, 'K'); // where the trail ends: the rock fallen across it
  },
  canopy(g: Grid) {
    g.box(0, 0, 18, 0, 'J').box(22, 0, 31, 0, 'J').box(0, 1, 3, 1, 'J').box(9, 1, 14, 1, 'J').box(26, 1, 30, 1, 'J'); // the leaf fringe (the well comes in at cols 19-21)
    g.box(31, 0, 31, 19, 'J'); // the canopy closes east (the kapok's room is reached from the river)
    g.box(20, 0, 20, 6, 'V').box(17, 7, 30, 7, 'B'); // the well's liana, ending on a bough (floor 7) that grows from the leaves east
    g.box(0, 9, 16, 9, 'H').box(8, 14, 16, 14, 'H'); // the lianas slung across: under the bough's west end and on west into the cloud forest, and lower
    g.box(12, 2, 12, 17, 'V').box(8, 10, 8, 13, 'V').box(16, 10, 16, 13, 'V'); // the hanging lianas through them, the long one from the leaves
    g.box(3, 10, 3, 17, 'V'); // and the one at the west, down to the canopy's floor
    g.box(6, 11, 7, 19, 'K'); // a trunk
    g.box(0, 18, 30, 19, 'J'); // the low leaves (floor 18): the canopy's floor, closed (the way down is west, through the cloud forest)
    trees(g, 'D', [[4, 4, 3], [26, 4, 3], [16, 12, 3], [27, 13, 3]], 17); // the crowns behind, misty
  },
  cloud(g: Grid) {
    g.box(0, 0, 31, 0, 'J').box(0, 1, 8, 1, 'J').box(12, 1, 19, 1, 'J').box(24, 1, 31, 1, 'J').box(1, 2, 4, 2, 'J').box(26, 2, 31, 2, 'J'); // the canopy's ragged leaves
    g.box(0, 1, 0, 17, 'K'); // a great trunk at the west: the forest floor ends at it
    g.box(20, 2, 20, 17, 'V').box(21, 9, 31, 9, 'H'); // the liana down from the leaves to the floor, and the canopy's liana slung across to it
    g.box(0, 18, 31, 19, 'M').clear(1, 18, 3, 19).box(2, 16, 2, 19, 'V'); // the forest floor (floor 18), open at the west round the liana down to the river
    g.box(5, 18, 12, 19, 'W').box(6, 17, 7, 17, 'G').box(10, 17, 11, 17, 'G'); // the stream and its stepping stones (floor 17)
    trees(g, 'D', [[6, 5, 3], [14, 6, 3], [27, 5, 3], [25, 13, 3]], 17); // the cloud forest's crowns in the mist behind
  },
  kapok(g: Grid) {
    g.box(0, 0, 31, 0, 'D').box(0, 1, 1, 19, 'J'); // the crown's leaves over the kapok (a backdrop: the Inca bridge's valley is over it), the leaves west
    g.box(18, 1, 31, 1, 'J').box(30, 2, 31, 5, 'J').box(30, 9, 31, 19, 'J'); // the crown's leaves, east round the branch's way out (rows 6-7)
    g.box(2, 6, 15, 6, 'B'); // the walkway (floor 6), from the trunk west to its end
    g.box(10, 14, 15, 14, 'B').box(15, 12, 20, 12, 'B').box(10, 10, 15, 10, 'B'); // the buttress boughs either side of the trunk (floors 14, 12, 10)
    g.box(15, 8, 31, 8, 'B'); // the crown's branch (floor 8), from the trunk east to Rio
    g.box(2, 16, 22, 19, 'J').box(26, 16, 29, 19, 'J'); // the low boughs (floor 16), open only round the liana
    g.box(24, 14, 24, 19, 'V'); // the liana up the kapok's flank from the river (its head over the low boughs)
    for (const [row, col] of TANGLE_CELLS) g.box(col, row, col, row, 'T'); // the tangle on the branch
  },
  vine(g: Grid) {
    // VINE AND DANDY as it was before the reset; the west bank now takes CLOUD NINE's liana down (cols 1-3 open in the canopy)
    g.box(0, 0, 31, 1, 'J').box(7, 2, 9, 2, 'J').box(15, 2, 17, 2, 'J').box(23, 2, 25, 2, 'J').box(0, 2, 0, 2, 'J').box(28, 2, 31, 2, 'J'); // the canopy the vines hang from, ragged
    g.clear(1, 0, 3, 11).box(2, 0, 2, 14, 'V'); // the liana down from the cloud forest to the west bank
    g.box(0, 15, 4, 19, 'M').box(28, 15, 31, 19, 'M').box(5, 16, 27, 19, 'W').box(13, 16, 15, 16, 'L').box(20, 16, 22, 16, 'L'); // the banks, the river, the logs
    g.box(0, 3, 0, 14, 'J').box(30, 0, 31, 12, 'J'); // the trees at each side (the west closed down to the bank: no room is west of it; the east bank opens into the creek, rows 13-14)
  },
  sandbar(g: Grid) {
    g.box(0, 0, 31, 0, 'J').box(0, 1, 14, 1, 'J').box(19, 1, 23, 1, 'J').box(28, 1, 31, 1, 'J'); // the canopy over the river and the sandbar, ragged
    g.box(0, 2, 1, 12, 'J'); // the fig's leaves down to the niche under them (rows 13-14: the way in from VINE AND DANDY)
    g.box(0, 15, 4, 19, 'M'); // the west bank (floor 15)
    g.box(5, 16, 17, 19, 'W'); // the river
    for (const [a, b] of LOGS) g.box(a, 16, b, 16, 'P'); // the rotten logs (floor 16)
    g.box(18, 15, 31, 19, 'M'); // the sandbar (floor 15), east into the roots' room
    trees(g, 'D', [[21, 5, 3], [28, 6, 2]], 14); // the forest behind the sandbar, misty (clear of the vine's swing)
  },
  roots(g: Grid) {
    g.box(0, 0, 22, 0, 'J').box(26, 0, 31, 0, 'J').box(0, 1, 7, 1, 'J').box(12, 1, 15, 1, 'J').box(19, 1, 21, 1, 'J'); // the leaves the vines hang from (the liana goes up at cols 23-25)
    g.box(24, 0, 24, 14, 'V'); // the liana up the kapok's flank, its foot on the east bank
    g.box(0, 15, 7, 19, 'M'); // the west bank (floor 15), eight cells: the run-up and the take are in this room
    g.box(8, 16, 20, 19, 'W').box(12, 16, 14, 16, 'L'); // the river and its log
    g.box(21, 15, 31, 19, 'M'); // the east bank (floor 15), on east under the kapok's roots to the riverboat
    trees(g, 'D', [[3, 5, 3]], 14); // a tree behind the west bank
  },
  boat(g: Grid) {
    g.box(0, 0, 31, 0, 'J'); // the leaves over the river
    g.box(0, 15, 3, 19, 'M'); // the bank she is moored at (floor 15)
    g.box(4, 15, 31, 15, 'D').box(4, 16, 31, 17, 'H').box(4, 18, 31, 19, 'W'); // the cargo deck (floor 15), the hull, the river under her
    g.box(6, 8, 28, 8, 'D').box(6, 9, 25, 12, 'H'); // the top deck (floor 8) over the cabin: the cargo deck under it is a lane two rows high
    for (const c of [9, 14, 19]) g.clear(c, 10, c + 1, 10); // the cabin's windows
    g.box(27, 8, 27, 14, 'L'); // the ladder from the cargo deck's stern end up to the top deck
    trees(g, 'E', [[2, 5, 3], [29, 4, 3], [21, 3, 2]], 14); // the far bank's trees behind the boat (the bank goes on east past her stern: THE RIVER ENDS)
  },
  ends(g: Grid) {
    // THE RIVER ENDS, as it was: in from the riverboat's stern onto the last bank (floor 15); over a pool the muddy stair climbs (floors 13, 11, 9) to the high bank (floor 8) under the boughs, where the
    // forest closes in: the river ends here (no way east: the trees come down to the bank)
    g.box(0, 0, 31, 0, 'J').box(8, 1, 14, 1, 'J').box(19, 1, 26, 1, 'J'); // the leaves (open at the west under them, as the boat's stern is)
    g.box(30, 0, 31, 7, 'J'); // the forest closing the east
    g.box(0, 15, 5, 19, 'M').box(6, 16, 9, 19, 'W'); // the bank and the pool
    g.box(10, 13, 13, 19, 'M').box(14, 11, 17, 19, 'M').box(18, 9, 21, 19, 'M').box(22, 8, 31, 19, 'M'); // the muddy stair, up to the high bank
    trees(g, 'D', [[4, 6, 3], [15, 5, 2], [25, 3, 2]], 14); // the forest behind
  },
} as const;

/** MP1's high ledge's empanada (the sprite's top left cell). */
const LEDGE_EMPANADA = [27, 6] as const;

export const ANDES_ROOMS: readonly RoomSpec[] = [
  // JUMP FOR JOY: bailed out of the mail plane (sky.ts), he comes in at the top under the canopy. No creatures: the room teaches the drop. An updraft (cols 9-11) lifts him to glide to the spire, the coin on
  // its snowy tip (the first thing the new move is for). The bottom is open west of the spire: he sinks out of it into the canyon.
  room({
    id: AND.jump, cell: [2, 25], sector: 55, palette: SKY_PALETTE, paint: PAINT.jump,
    coins: [[19, 10]],
    decor: [['andPeaks', 11, 3], ['mistCloud', 4, 4], ['mistCloud', 24, 6], ['updraft', 9, 12], ['updraft', 9, 8]],
  }),

  // OUT OF THIN AIR: the canyon, as it was. In from above; the cliffs close in at each side and a ridge rises mid-room, its snowy crest (floor 9) with the coin over it: a line chosen from the top. A condor
  // crosses the whole room high (as before the reset, from the east end, at a glide: at its old speed a fall in from the top met it blind), and one dives in the right canyon. Out at the foot of the left canyon (cols 5-10); the right canyon has a floor, and its updraft lifts him back over the ridge.
  room({
    id: AND.thin, cell: [3, 25], sector: 56, palette: SKY_PALETTE, paint: PAINT.thin,
    coins: [[15, 7]],
    decor: [['andPeaks', 15, 3], ['mistCloud', 3, 3], ['mistCloud', 20, 0], ['mistCloud', 10, 1], ['updraft', 5, 16], ['updraft', 5, 12], ['updraft', 5, 8], ['updraft', 5, 4], ['updraft', 22, 12], ['updraft', 22, 8]],
    creatures: [{ who: 'condor', col: 26, row: 4, way: 'left', speed: 1, range: 176 }, { who: 'condor', col: 25, row: 8, way: 'down', speed: 2, range: 36 }],
  }),

  // CONDOR COUNTRY: the gorge, its cliffs closing in. An updraft (cols 13-15) lifts him to the overhang, where he steers onto the shelf (floor 8) for the empanada; two condors dive, one in the updraft's
  // column, one in the neck; the coin hangs between their dives. A pinnacle splits the foot into two throats: the narrow west one lands on the guardhouse's roof, the wide east one on the terraces.
  room({
    id: AND.gorge, cell: [4, 25], sector: 57, palette: SKY_PALETTE, paint: PAINT.gorge,
    coins: [[16, 9]],
    item: { name: 'empanada1', col: 24, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['andPeaks', 9, 3], ['mistCloud', 5, 1], ['updraft', 13, 10], ['updraft', 13, 6]],
    creatures: [{ who: 'condor', col: 13, row: 3, way: 'down', speed: 1, range: 96 }, { who: 'condor', col: 20, row: 4, way: 'down', speed: 1, range: 48 }],
  }),

  // MP1 NO PROBLLAMA: Machu Picchu's terraces, dry-stone walls under their grass. The guardhouse on the top terrace (floor 8), its thatch roof clear, holds the chullo; the roof's coin is for the west landing.
  // The terraces step down east (floors 10, 12, 14): a llama grazes on the broad terrace (jumped), the cuy hops over the last step, and the second llama paces the low path (floor 18) where he drops onto it; east under
  // the cliff into Machu Picchu's lane. The high ledge on the cliff (floor 8) holds an empanada in plain sight, out of reach from here: it is Machu Picchu's plateau that runs out onto it, and off its west
  // end the drop is onto the last step, so the terraces climb back to the top.
  room({
    id: AND.terraces, cell: [5, 25], sector: 58, palette: TERRACE_PALETTE, paint: PAINT.terraces,
    coins: [[4, 3]],
    decor: [['andPeaks', 17, 3]],
    cake: LEDGE_EMPANADA, cakeSprite: ANDES_SPRITE.empanada,
    item: { name: 'chullo', col: 3, row: 6, sprite: ANDES_SPRITE.chullo },
    creatures: [{ who: 'cuy', col: 19, row: 7, way: 'down', speed: 1, range: 40 }, { who: 'llama', col: 15, row: 10, way: 'right', speed: 1, range: 8 }, { who: 'llama', col: 22, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // MP2 MACHU PICCHU: the plateau, Huayna Picchu behind. The lane (floor 18) runs east from the terraces under the plateau into the tunnel (cols 12-24, rows 15-17 under the lintel, its back wall in the dark
  // with two torches), where the spitting llama paces the mouth: a wall until the panpipes. The ladder (col 5) climbs to the plateau (floor 8); a cuy hops out of the gap (cols 13-15); the hill steps up (floors
  // 6, 4) to the Intihuatana, the boulders tumbling off the mountain onto its lip and down at him every 120 frames; the panpipes at the top, by the carved stone. The top runs on east onto the Inca trail; the
  // plateau runs out west onto the terraces' high ledge. In the tunnel the well (cols 19-21) drops into the canopy.
  room({
    id: AND.picchu, cell: [5, 26], sector: 59, palette: PICCHU_PALETTE, paint: PAINT.picchu,
    coins: [[30, 2], [21, 4]],
    item: { name: 'panpipes', col: 26, row: 2, sprite: ANDES_SPRITE.panpipes },
    decor: [['intihuatana', 28, 2], ...TORCHES.map(([c, r]) => ['torch', c, r] as const), ...fillCells(PAINT.picchu, TORCHES.flatMap(([c, r]) => [[c, r], [c, r + 1]] as const), TUNNEL, 'tunnelBack')],
    creatures: [{ who: 'spitter', col: 11, row: 16, way: 'right', speed: 1, range: 40 }, { who: 'cuy', col: 13, row: 8, way: 'up', speed: 1, range: 40 }],
  }),

  // THE INCA BRIDGE: the real dead-end trail cut into the cliff beside Machu Picchu (Chris: "a simple scenic room ... a single item ... double back"). Out of Machu Picchu's top along the narrow trail on the
  // granite face, down a step, over the logs laid across the gap (the cleft black all the way down under them), on past a vizcacha and up to the trail's end, where the rock has fallen across it: an empanada.
  // Behind him to the west the valley far below, the citadel small on its saddle under Huayna Picchu. Then back.
  room({
    id: AND.bridge, cell: [5, 27], sector: AND.bridge, palette: BRIDGE_PALETTE, paint: PAINT.bridge,
    item: { name: 'empanada3', col: 27, row: 2, sprite: ANDES_SPRITE.empanada },
    decor: [['andPeaks', 3, 1], ['andCitadelFar', 5, 13]],
    creatures: [{ who: 'andVizcacha', col: 20, row: 4, way: 'right', speed: 1, range: 16 }],
  }),

  // THE CANOPY: straight out of the tunnel's squeeze down the well's liana onto a bough. The only way on is the lattice: off the bough onto the liana slung across, west along it past the toucan and the sloth
  // and on west out of the room into the cloud forest. The canopy's floor is closed. The coin is at the head of the middle liana, the sloth's (a climb off the way).
  room({
    id: AND.canopy, cell: [6, 26], sector: AND.canopy, palette: CANOPY_PALETTE, paint: PAINT.canopy,
    coins: [[13, 4]],
    creatures: [{ who: 'sloth', col: 12, row: 5, way: 'down', speed: 1, range: 64, colour: 15 }, { who: 'toucan', col: 9, row: 3, way: 'down', speed: 1, range: 88 }],
  }),

  // CLOUD NINE: the cloud forest (the old room's way, west and down). In along the canopy's liana slung across (row 9) to the liana that hangs from the leaves to the floor: a climb up it to the coin at its head,
  // or down past the spectacled bear on the forest floor; west over the stream on its stepping stones (a coin over the gap between them) under the cock-of-the-rock's dives, and down the liana at the west,
  // through the floor, to VINE AND DANDY's bank.
  room({
    id: AND.cloud, cell: [6, 25], sector: AND.cloud, palette: CLOUD_PALETTE, paint: PAINT.cloud,
    coins: [[21, 3], [8, 14]],
    creatures: [{ who: 'andSpectacledBear', col: 13, row: 16, way: 'right', speed: 1, range: 32 }, { who: 'andCockOfTheRock', col: 8, row: 8, way: 'down', speed: 1, range: 48 }],
  }),

  // BRANCHING OUT: the kapok. In from the roots up the liana on its flank onto the low boughs. The crown's branch, the way east into Rio, is choked by the tangle (THE UNDERGROWTH IS TOO THICK): the machete is
  // on the river, aboard the boat. Up the buttress boughs either side of the trunk, the anaconda coiling up and down it across every jump, onto the branch; up from its root onto the walkway and west past the
  // jaguar to the coin at its end. With the machete, the tangle cut and east into Rio. A fall off the walkway lands on the low boughs, from where the climb starts again.
  room({
    id: AND.kapok, cell: [6, 27], sector: AND.kapok, palette: KAPOK_PALETTE, paint: PAINT.kapok,
    coins: [[3, 4]],
    decor: fillCells(PAINT.kapok, [], KAPOK_TRUNK, 'kapokBark'),
    creatures: [{ who: 'anaconda', col: 14, row: 7, way: 'down', speed: 1, range: 56, colour: 13 }, { who: 'jaguar', col: 5, row: 4, way: 'right', speed: 1, range: 40 }],
  }),

  // VINE AND DANDY: the old vine room, as it was. Down CLOUD NINE's liana onto the west bank; three vines hang from the canopy and swing over the wide brown river, two logs float between, piranhas leap,
  // a sloth hangs in the canopy, the giant tree stands on the west bank. Vine to log to vine to log to vine to the east bank, a coin on each log, the empanada on the bank; east into the creek.
  room({
    id: AND.vine, cell: [7, 25], sector: AND.vine, palette: VINE_PALETTE, paint: PAINT.vine,
    coins: [[14, 14], [21, 14]],
    item: { name: 'empanada4', col: 29, row: 13, sprite: ANDES_SPRITE.empanada },
    decor: [['giantTree', 3, 9]], // the giant tree on the west bank, as it was (a column east of where it stood: CLOUD NINE's liana comes down at column 2)
    creatures: [{ who: 'sloth', col: 12, row: 3, way: 'right', speed: 1, range: 30 }],
  }),

  // UP THE CREEK: in from VINE AND DANDY through the niche under the fig (the empanada) onto the west bank (floor 15); east over the river: the vine, the two rotten logs that give way under a pause, the channel
  // where a piranha leaps, onto the sandbar and east into the roots. The coin on the second log. A dolphin rises by the bank, where he takes the vine.
  room({
    id: AND.sandbar, cell: [7, 26], sector: AND.sandbar, palette: SANDBAR_PALETTE, paint: PAINT.sandbar,
    coins: [[14, 14]],
    item: { name: 'empanada2', col: 0, row: 13, sprite: ANDES_SPRITE.empanada },
    creatures: [{ who: 'dolphin', col: 5, row: 17, way: 'up', speed: 1, range: 40 }],
  }),

  // THE ROOTS: two vines and a log over the river (cols 8-20), two piranhas leaping; the coin on the log between the vines. The west bank is eight cells wide, so the wait for the vine and the take are in the
  // room. The east bank (floor 15) under the kapok's buttress roots, the liana up its flank into BRANCHING OUT, and on east to the riverboat.
  room({
    id: AND.roots, cell: [7, 27], sector: AND.roots, palette: ROOTS_PALETTE, paint: PAINT.roots,
    coins: [[13, 14]],
    decor: fillWhere(PAINT.roots, [], KAPOK_FOOT, 'kapokBark'),
  }),

  // THE RIVER QUEEN: the riverboat moored east of the roots, as she was (side view: the cargo deck, the cabin, the top deck, the pilot house, the funnel, the lifebuoy, the paddle wheel, a palm on the bank).
  // The captain paces the cargo deck under the cabin (a lane two rows high: no way past him) and lets only a local aboard (THE CAPTAIN CARRIES LOCALS ONLY): in the chullo he walks off aft. Past him along
  // the cargo deck (a coin), up the ladder to the top deck and west past the macaw (a coin, an empanada) to the machete by the pilot house. Off her stern the bank goes on east: THE RIVER ENDS.
  room({
    id: AND.boat, cell: [7, 28], sector: AND.boat, palette: BOAT_PALETTE, paint: PAINT.boat,
    coins: [[23, 13], [19, 6]],
    item: { name: 'machete', col: 12, row: 6, sprite: ANDES_SPRITE.machete },
    item2: { name: 'empanada5', col: 22, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['andPilotHouse', 7, 5], ['andFunnel', 15, 5], ['pacLifeRing', 24, 6], ['andPaddleWheel', 28, 10], ['pacPalmSmall', 0, 11]],
    creatures: [{ who: 'andCaptain', col: 7, row: 13, way: 'right', speed: 1, range: 128 }, { who: 'toucan', col: 17, row: 6, way: 'right', speed: 1, range: 64, colour: 2 }],
  }),

  // THE RIVER ENDS: the last bank, as it was (off the route: what the bank past the riverboat's stern leads to). In from the stern onto the bank; a dolphin rises in the pool; the muddy stair climbs from it
  // past the anaconda coiled on the middle step to the high bank under the boughs, where the forest closes in: a coin on the stair's first step over the pool, one on its top, an empanada under the palm.
  room({
    id: AND.ends, cell: [7, 29], sector: AND.ends, palette: ENDS_PALETTE, paint: PAINT.ends,
    coins: [[13, 11], [19, 7]],
    item: { name: 'empanada6', col: 28, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['pacPalmSmall', 23, 4]],
    creatures: [{ who: 'anaconda', col: 15, row: 9, way: 'right', speed: 1, range: 8, colour: 13 }, { who: 'dolphin', col: 6, row: 17, way: 'up', speed: 1, range: 24 }],
  }),
];

/** Every room of the region, for the tests that look at them all. */
export const ANDES_ALL_ROOMS: readonly RoomSpec[] = ANDES_ROOMS;
