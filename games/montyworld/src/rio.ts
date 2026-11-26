import type { CharAnim, FloatSpec, LeverSpec, PursuerSpec, RollerSpec, SkewerSpec } from '../../montyotr/src/montydata';
import { BOULDER_POINTERS } from './andes-pointers';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { GRILL_ANIM, RIO_DECOR } from './art/rio-decor';
import { CROWD_DANCE, FLOAT_DANCERS } from './art/rio-streets';
import { SKEWER_POSES } from './art/rio-items';
import type { WorldDecor } from './art/world';
import { asBackdrop, codeOf, decorIndex, fillCells, type Grid, room, type Palette } from './layout';
import { RIO_SPRITE, SKEWER_POINTERS, SPLIT_POINTERS } from './rio-pointers';

/**
 * Rio, the seventh and last region of Do Svidaniya Monty (docs/dosvidaniya-back-half-plan.md, "Rio: down into the city, through the carnival, then the showdown"): the final rush downhill, at night on black, in a
 * block at columns 23-29 of the exit grid (rows 4-5), entered from the Amazon's kapok (the Andes' [5,22]: off the crown's branch, floor 8) and ending on the beach, where the game ends.
 *
 *            col 23             24                  25                   26               27                 28                 29
 *   row 4                                         W STEAK YOUR CLAIM
 *   row 5   C OPEN ARMS        F HOUSE OF COLOUR   L THE LAPA ARCHES    P BEAT THE DRUM   Q FLOAT YOUR BOAT  D SPY VERSUS MOLE  B RIO OR BUST
 *
 * The route: up the Redeemer and off his east hand (C); down through the favela (F); along Lapa's street under the arches, the tram's track high above (L); on into the carnival's street, where the Selaron steps
 * climb from the street to the aqueduct's end (P); up them and west onto Lapa's track, across its gap on the tram, up the ladder into the churrascaria at the top of the arches, past the gauchos' skewers to the
 * spit's crank and back past them (W); down through the gap to the street (one way) and east again into the carnival: over the bateria's risers past the dancers (P), across the canal on the parade's floats (Q),
 * the showdown in the Sambadrome, the agent on his trail (D), where the crank fits the control booth and makes the float's lever live; and the beach (B). SUGAR RUSH (69) and its cable car were cut (Chris,
 * 2026-11-25: "the Sugar thing... that's a wasted effort"); its coin is Lapa's third, at the same place in the tables.
 *
 * Playfield cells as in moscow.ts; a floor "F" is the row he stands on (his body is on rows F-2 and F-1). Each room is painted from its rows of palette letters ('.' empty). The tram and the carnival's floats
 * (floats.ts), the gauchos' skewers (skewers.ts), the stones falling from Lapa's broken span (rollers.ts), the agent (pursuers.ts) and the float's lever and its held head (levers.ts, mechanisms.ts) are data of the engine.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped (the tables are built by id). The rebuild keeps 68, 71, 73, 74, 75 and 77; the carnival's two rooms came back as 70 (BEAT THE DRUM, in the place of
 * SUGARLOAF SUMMIT's retired id: no other region's later ids move) and 76 (FLOAT YOUR BOAT, its own id), last in the tables (data.ts `ADDED`); 67 (QUAY TO THE CITY), 69 (SUGAR RUSH, cut 2026-11-25) and 72
 * (MONKEY BUSINESS) are retired (save-migrate.ts carries a save in one on in a kept room).
 */
export const RIO_ROOM = { lap: 68, beat: 70, arms: 71, colour: 73, steak: 74, drum: 75, float: 76, bust: 77 } as const;
/** SUGAR RUSH's id (69), cut: no room has it now; save-migrate.ts carries a save made there on in Lapa. */
export const SUGAR_RUSH_CUT = 69;
/** The first room of the region (the way in from the Amazon). */
export const RIO_FIRST = RIO_ROOM.arms;
/** Whether a room is one of Rio's (its ids run 67-77, the retired ones among them). */
export const isRio = (room: number): boolean => room >= 67 && room <= 77;

/** The sectors' names by their place from 67 (as the ids: the retired rooms' places are empty, so no later sector moves). */
const NAMES = ['', 'THE LAPA ARCHES', '', 'BEAT THE DRUM', 'OPEN ARMS', '', 'HOUSE OF COLOUR', 'STEAK YOUR CLAIM', 'SPY VERSUS MOLE', 'FLOAT YOUR BOAT', 'RIO OR BUST'] as const;
export const RIO_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (Lapa's white, the drum's pink, the Redeemer's white, the favela's pink, the restaurant's red, the carnival's yellow and green, the beach's sand; the retired rooms' unused). */
export const RIO_COLOURS: readonly number[] = [0, 1, 0, 10, 1, 0, 10, 2, 7, 13, 8];

// ---- painting ------------------------------------------------------------------------------------------

/** A room's rows of palette letters, painted ('.' empty). Each is 32 letters and there are 20. */
function rows(r: readonly string[]): (g: Grid) => void {
  if (r.length !== 20 || r.some((line) => line.length !== 32)) throw new Error('a Rio room is 20 rows of 32 letters');
  return (g) => r.forEach((line, row) => [...line].forEach((ch, col) => { if (ch !== '.') g.box(col, row, col, row, ch); }));
}

type Cell = readonly [col: number, row: number];
type Placed = readonly [WorldDecor | { text: string; colour: number }, col: number, row: number];

// Lapa's arches and Sugarloaf seen from the beach are backdrops: a coin in them keeps them round it
const ARCH_UPPER = asBackdrop('lapaUpper'), ARCH_BASE = asBackdrop('lapaBase'), ARCH_UPPER_END = asBackdrop('lapaUpperEnd'), ARCH_BASE_END = asBackdrop('lapaBaseEnd');

// ---- the palettes --------------------------------------------------------------------------------------

export const ARMS_PALETTE = {
  J: ['jungleLeaf', 5], G: ['mossGround', 5], W: ['soapstone', 1], P: ['pedestal', 12], L: ['woodLadder', 8], K: ['graniteBack', 11], V: ['vine', 13],
} as const satisfies Palette;

export const HILL_PALETTE = {
  R: ['favelaTile', 2], S: ['paradeStreet', 10], F: ['facade', 14], L: ['woodLadder', 8], K: ['hillBack', 5],
} as const satisfies Palette;

export const LAPA_PALETTE = {
  B: ['restBrick', 2], T: ['aqueductTop', 1], D: ['floatDeck', 7], L: ['woodLadder', 8], W: ['quayStone', 12],
} as const satisfies Palette;

export const STEAK_PALETTE = {
  B: ['restBrick', 2], F: ['restTile', 2], S: ['barrel', 9], L: ['woodLadder', 8],
} as const satisfies Palette;

export const DRUM_PALETTE = {
  S: ['riser', 4], A: ['paradeStreet', 8], E: ['stationFloor', 1], F: ['floatDeck', 7], B: ['stationGate', 2], V: ['vine', 8], L: ['woodLadder', 8], Y: ['graniteBack', 7],
} as const satisfies Palette;

export const BEAT_PALETTE = {
  T: ['aqueductTop', 1], Y: ['favelaTile', 7], G: ['favelaTile', 5], B: ['favelaTile', 14], R: ['favelaTile', 2], S: ['riser', 4], A: ['paradeStreet', 8],
} as const satisfies Palette;

export const FLOAT_PALETTE = {
  A: ['paradeStreet', 8], W: ['bayWater', 6], T: ['riser', 10], D: ['floatDeck', 7], L: ['woodLadder', 8],
} as const satisfies Palette;

export const BEACH_PALETTE = {
  W: ['wavePavement', 1], G: ['granite', 14], E: ['seaSwell', 6], T: ['tableTop', 1], U: ['palmTrunk', 9], L: ['palmLeft', 5], R: ['palmRight', 5], K: ['graniteBack', 6],
} as const satisfies Palette;

// ---- C OPEN ARMS ----------------------------------------------------------------------------------------
/**
 * Corcovado, Tijuca's forest at its foot: in high on the canopy at the west (floor 8), down to the forest floor (14) beside the liana that climbs back up to the canopy (the way back to the Amazon); east through the chapel
 * under the pedestal, up the maintenance ladder on the Redeemer's east side (col 20) to his east arm (floor 4), along it under the vulture's dive (the one timing), and off the hand down onto the forest's slope (8),
 * out east: a step off, no jump (Chris: "Open arms was frustrating and amounted to nothing but a really irritating jump": the bat that flitted at the hand is gone, and each arm runs to its ladder's head). A second ladder (col 11) climbs to the west arm, where a marmoset scampers to and fro by the snack on its hand (jump him or time him).
 */
const ARMS = rows([
    'JJ..............................', // 0
    'JJ.............WW...............', // 1
    'JJ.............WW...............', // 2
    'JJ.............WW...............', // 3
    'JJ..WWWWWW.L.WWWWWW.L.WWWWWWWW..', // 4 (each arm stops a cell short of its ladder: he steps off the ladder's head across onto it, no jump, and the ladder goes down from anywhere over its head)
    'JJ.....WWW.L..WWWW..L.WWW.......', // 5
    '...........L..WWWW..L...........', // 6
    '...........L..WWWW..L...........', // 7
    'JJJJJJJJV..L..WWWW..L.......GGGG', // 8 (the canopy runs to the liana: down it from the canopy's end, up it and off onto the canopy)
    'JJ......V..L.PPPPPP.L.......GGGG', // 9
    'JJ......V..L.PPPPPP.L.......GGGG', // 10
    'JJ......V..L.PPPPPP.L.......GGGG', // 11
    'JJ......V..L.KKKKKK.L.......GGGG', // 12
    'JJ......V..L.KKKKKK.L.......GGGG', // 13
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 14
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 15
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 16
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 17
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 18
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 19
]);
const ARMS_SNACK: Cell = [4, 2];
/** The guarana, on the east arm by its ladder's head, where Viktor is seen arriving behind him (the chase's cause): drunk, he runs the rest of the way down the hill (`RUN_ROOMS`). */
const ARMS_GUARANA: Cell = [25, 2];
const ARMS_COINS: readonly Cell[] = [[3, 13], [28, 3]];

// ---- F HOUSE OF COLOUR ----------------------------------------------------------------------------------
/**
 * The favela on the hill, a switchback down (the way through Chris liked, the look of the room before the reset: 44ea872): in high on the red tiled roofs (floor 8) over a storey of colourful house fronts, east over the
 * light well (cols 11-15, a lower roof on posts at floor 10, the football bouncing up out of it: a jump) onto the next roofs, off their east end down the lane between the houses where the kite dips (to floor 14), back west
 * along the alley under the houses on their stilts (posts, the green hill behind: no dark band) past the macaw to the ladder's hole (col 4), down to the lane (18) and east past the houses of the lane, out low into Lapa.
 * The tall blue house at the east with the church on top closes the lane above the alley. Washing on lines between the roofs' poles; a satellite dish; the sky over all. The snack is in the pocket west of the ladder's
 * hole, the coin in the macaw's alley.
 */
const HILL = rows([
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '................................', // 3
    '.............................FFF', // 4
    '.............................FFF', // 5
    '.............................FFF', // 6
    '.............................FFF', // 7
    'RRRRRRRRRRR.....RRRRRRRRRRKKKFFF', // 8
    'FKKKKKKKKKKKKKKKKKKKKKKKKKKKKFFF', // 9
    'FKKKKKKKKKKRRRRRKKKKKKKKKKKKKFFF', // 10
    'FKKKKKKKKKKKKKKKKKKKKKKKKKKKKFFF', // 11
    'F..KKKKKKKKKKKKKKKKKKKKKKKKKKFFF', // 12
    'F..KKKKKKKKKKKKKKKKK.KKKKKKKKFFF', // 13
    'SSS.L.SSSSSSSSSSSSSSSSSSSSSSSFFF', // 14
    'FF..LKKKKKKKKKKKKKKKKKKKKKKKKFFF', // 15
    'FF..LKKKKKKKKKKKKKKKKKKKKKKKKKKK', // 16
    'FF..LKKKKKKKKKKKKKKKKKKKKKKKKKKK', // 17
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 18
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 19
]);
const HILL_SNACK: Cell = [1, 12];
const HILL_COINS: readonly Cell[] = [[20, 13]];
/** The houses: fronts a storey (three rows) tall in turn pink, yellow, blue and green, under the roofs (rows 9-11) and along the lane (rows 15-17, the alley's floor on their roofs). */
const HOUSE_KINDS = ['rioHousePink', 'rioHouseYellow', 'rioHouseBlue', 'rioHouseGreen'] as const;
const hillHouses = (): Placed[] => [[1, 4, 7, 16, 19, 22].map((col) => [col, 9] as const), [6, 9, 12, 15, 18, 21, 24].map((col) => [col, 15] as const)]
  .flat().map(([col, row], i): Placed => [HOUSE_KINDS[i % HOUSE_KINDS.length] ?? 'rioHousePink', col, row]);
/** The washing: a line over the light well between two roofs' poles, one across the lane to the tall house, in four sets of colours. */
const hillWashing = (): Placed[] => [
  ['rioWashPole', 9, 5], ['rioWashPole', 16, 5], ['rioWashA', 10, 5], ['rioWashB', 12, 5], ['rioWashC', 14, 5],
  ['rioWashPole', 24, 5], ['rioWashD', 25, 5], ['rioWashA', 27, 5],
];
/** The posts the houses and the well's roof stand on over the alley (rows 12-13). */
const hillPosts = (): Placed[] => [6, 9, 11, 15, 18, 22, 25].map((col): Placed => ['rioPost', col, 12]);
/** The sky over the roofs (rows 0-7): flecks at the zenith, dashes lower, lines at the horizon. */
const hillSky = (): Placed[] => [
  ...fillCells(HILL, [], [0, 0, 31, 2], 'rioSkyHi'), ...fillCells(HILL, [], [0, 3, 31, 5], 'rioSkyMid'), ...fillCells(HILL, [], [0, 6, 31, 7], 'rioSkyLow'),
];

// ---- L THE LAPA ARCHES ----------------------------------------------------------------------------------
/**
 * The aqueduct: the street (floor 18) under its arches, the tram's track on top (floor 8) with a gap at cols 12-17 the tram crosses; stones work loose from the broken span and fall through the gap onto the street,
 * rolling west along it. The churrascaria's red brick building stands at the west edge, its ladder (col 5) up from the track's west part into its floor.
 */
const LAPA = rows([
    '.BBB.L..........................', // 0 (the townhouse's parapet stands back from the picture's edge: open at the top, as the favela's sky beyond it is)
    '.BBB.L..........................', // 1
    '.BBB.L..........................', // 2
    '.BBB.L..........................', // 3
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
/** The track's west end (seen from the street, reached on the tram), the street under the arches, and the track's east end where the steps come up from the carnival's street (SUGAR RUSH's coin, cut with it: last, so it keeps its place in the tables). */
const LAPA_COINS: readonly Cell[] = [[8, 7], [21, 17], [27, 7]];

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
    'BBBB.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 18 (west of the ladder's hole the floor is the wall's brick: Lapa's townhouse is solid under it, so the tiles' floor, which he can sink through, would put him inside it)
    'BBBB.L.FFFFFFFFFFFFFFFFFFFFFFFFF', // 19
]);
const STEAK_CRANK: Cell = [28, 6];
const STEAK_COINS: readonly Cell[] = [[14, 17]];

// ---- P BEAT THE DRUM -----------------------------------------------------------------------------------
/**
 * The carnival's street, where the samba school warms up (back from before the reset, with more dancers): in low at the west from Lapa's street, under the aqueduct's last arches; the Selaron steps (their tiles
 * yellow, green, blue and red, as Lapa's steps are) climb from the street to the aqueduct's end (floor 8), out west onto Lapa's track: the way to the tram and the churrascaria. East over the bateria's stepped
 * risers (floors 16, 14, 12) with the drummer bouncing on the top one (time the beat: he stands on it at the bottom of each bounce), a samba dancer in the street before them and a passista after, and out low east
 * to the canal. Behind, the grandstand's dark tiers with the crowd dancing along them in every colour, bunting and balloons. The snack on the risers' first step, a coin at the steps' head (tops a climb) and one
 * on the top riser under the drummer (tops a climb, guarded).
 */
const BEAT = rows([
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '................................', // 3
    '................................', // 4
    '................................', // 5
    '................................', // 6
    '................................', // 7
    'TTTT............................', // 8 (the aqueduct's end: Lapa's track runs on to here, where the steps come up)
    '................................', // 9
    '....GG..........................', // 10 (the Selaron steps: treads he jumps up through and lands on, two rows a step, in their tiles' colours)
    '................................', // 11
    '......BB............SSS.........', // 12 (the bateria's top riser: the drummer bounces on it)
    '....................SSS.........', // 13
    '........RR.........SSSSS........', // 14
    '...................SSSSS........', // 15
    '..........YY.....SSSSSSSSS......', // 16 (the risers' foot; the lowest tread over the street, which runs under the steps)
    '.................SSSSSSSSS......', // 17
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 18
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 19
]);
const BEAT_SNACK: Cell = [17, 14];
const BEAT_COINS: readonly Cell[] = [[1, 7], [21, 11]];
const BEAT_SNACK_CELLS: readonly Cell[] = [[17, 14], [18, 14], [17, 15], [18, 15]];
/** The steps' risers under their treads (a band of the tiles' mosaic, one row each), down to the street. */
const BEAT_RISERS: readonly Cell[] = [[4, 11], [6, 13], [8, 15], [10, 17]];
/** The crowd on the grandstand: two tiers of it dancing above the street (rows 3-4 and 6-7). */
const crowdRows = (cols: readonly number[], rowsAt: readonly number[]): Placed[] => rowsAt.flatMap((row) => cols.map((col): Placed => ['rioCrowd', col, row]));
/** The cells a run of crowds covers (8 x 2 each), kept out of the tiers' fill under them. */
const crowdCells = (cols: readonly number[], rowsAt: readonly number[]): Cell[] => rowsAt.flatMap((row) => cols.flatMap((col) => Array.from({ length: 16 }, (_, k): Cell => [col + (k % 8), row + Math.floor(k / 8)])));
const BEAT_CROWD = { cols: [8, 16, 24], rows: [3, 6] } as const;
const FLOAT_CROWD = { cols: [0, 8, 16], rows: [5, 8] } as const;

// ---- Q FLOAT YOUR BOAT ----------------------------------------------------------------------------------
/**
 * The parade's floats on the Canal do Mangue, beside the Sambadrome (back from before the reset): in low at the west on the street (floor 18); the canal (deadly water, cols 6-24) is crossed on the floats that come
 * along it with a samba dancer dancing on each, lane A (the street's height) three of them west to east, lane B (floor 14) two the other way. On the east, the stage (18) where a baiana spins, and the grandstand's
 * ladder (col 28) up to the stand's ledge (8) and out high into the Sambadrome. A balcony of the stand (floor 14, flush with the ladder) is where lane B is boarded: it carries him west over the canal's middle (a
 * coin taken on the ride) to the west stand's balcony (floor 14) and its coin; down to the street and back east on lane A. The grandstand's crowd dancing along its tiers in every colour, bunting, balloons, plumes.
 */
const FLOAT = rows([
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '................................', // 3
    '................................', // 4
    '................................', // 5
    '................................', // 6
    '................................', // 7
    '............................L.TT', // 8
    '............................L.TT', // 9
    '............................L.TT', // 10
    '............................L.TT', // 11
    '............................L.TT', // 12
    '............................L.TT', // 13
    '..TTTT...................TT.L.TT', // 14 (lane B's balcony, two wide: the ladder's foot stays clear)
    '..TTTT...................TT.L.TT', // 15
    '............................L.TT', // 16
    '............................L.TT', // 17
    'AAAAAAWWWWWWWWWWWWWWWWWWWAAAAAAA', // 18
    'AAAAAAWWWWWWWWWWWWWWWWWWWAAAAAAA', // 19
]);
const FLOAT_COINS: readonly Cell[] = [[14, 12], [3, 13]];

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
/** The grandstand under the stand's ledge: its dark tiers (rows 9-15, clear of the avenue he and the agent run along) and two rows of the crowd dancing on them. */
const DRUM_CROWD = { cols: [3], rows: [10, 13] } as const;
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
    '..............KKKK.LUR........KK', // 10
    '.............KKKKKK.U........KKK', // 11
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEEGG', // 12
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEGGG', // 13 (Pedra do Leme, the granite at Copacabana's east end, rises sheer from the sand: the beach's end, no way on)
    'EEEEEEEEEEEEEEEEEEEEUEEEEEEEEGGG', // 14
    '....................U........GGG', // 15
    '....................U........GGG', // 16
    '..........TTT.......U........GGG', // 17
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 18
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', // 19 (the promenade's mosaic to the picture's foot: the room's eight tiles are the wave, the granite, the sea, the table, the palm's three and the hill)
]);
const BEACH_BOWL: Cell = [10, 15];
/** Where the finale's parts are on the beach (playfield cells): the Redeemer and Sugarloaf across the bay (it floodlights them), the umbrella (its canopy and its pole) the deckchair stands under, and the fireworks over the bay. */
const FIREWORKS: readonly Cell[] = [[1, 2], [10, 0], [18, 1], [26, 1]];
export const BEACH_VIEW = {
  redeemer: { col: 14, row: 6, w: 4, h: 3 }, sugarloaf: { col: 3, row: 7, w: 8, h: 5 }, umbrella: { col: 23, row: 10 }, pole: { col: 26, row: 12 },
  fireworks: FIREWORKS,
} as const;

/**
 * Monty on the run (Chris, 2026-11-25: "we're not going to be recreating Sonic the Hedgehog speed-wise, but we're going to truly be making 'Monty on the Run'"): with the Redeemer's guarana drunk he walks half as fast
 * again (the data's `run`, monty.ts) down through the favela, Lapa and the churrascaria and the carnival's two rooms, his jump as it always was. The Sambadrome's showdown is a puzzle, not a race: there he walks.
 */
export const RUN_ROOMS: readonly number[] = [RIO_ROOM.colour, RIO_ROOM.lap, RIO_ROOM.steak, RIO_ROOM.beat, RIO_ROOM.float];

// ---- the mechanisms' data ------------------------------------------------------------------------------

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

/**
 * The carnival's floats on the canal (Q): lane A (deck row 18, the street's height) carries three west to east, lane B (deck row 14) two the other way, a cell every 8 frames (he is carried a cell at a time), over the
 * canal's cols 6-24, 30 cells to their round, 10 apart (lane B's 15). The pictures are the painted pieces (the room lists each once at its `home`, in the sky's top left, which the engine clears as they run); a dancer
 * dances on each (FLOAT_DANCERS).
 */
const FLOAT_HOME = { floatGalleon: [0, 0], floatSun: [6, 0], floatBird: [12, 0] } as const;
const carnivalFloat = (decor: keyof typeof FLOAT_HOME, row: number, dir: 1 | -1, offset: number): FloatSpec => ({
  room: RIO_ROOM.float, row, span: { from: 6, to: 24 }, dir, step: 8, every: 30, w: RIO_DECOR[decor].w, h: RIO_DECOR[decor].h, offset, deck: codeOf(FLOAT_PALETTE, 'D'), decor: decorIndex(decor), home: FLOAT_HOME[decor],
});
export const CARNIVAL_FLOATS: readonly FloatSpec[] = [
  carnivalFloat('floatGalleon', 18, 1, 0), carnivalFloat('floatSun', 18, 1, 10), carnivalFloat('floatBird', 18, 1, 20),
  carnivalFloat('floatBird', 14, -1, 0), carnivalFloat('floatGalleon', 14, -1, 15),
];

/** What moves by changing pictures: the floats' dancers (arms up, arms out, every five frames), the grandstands' crowds (out of step, every seven) and the churrascaria's grill (the meat turns, the flames flicker). */
export const RIO_ANIMS: readonly CharAnim[] = [
  ...[RIO_ROOM.beat, RIO_ROOM.float, RIO_ROOM.drum].map((room): CharAnim => ({ kind: 'cycle', room, chars: CROWD_DANCE.cells.map((cell) => ({ decor: decorIndex(CROWD_DANCE.decor), cell })), frames: CROWD_DANCE.frames, every: 7 })),
  ...FLOAT_DANCERS.map((d): CharAnim => ({ kind: 'cycle', room: RIO_ROOM.float, chars: d.cells.map((cell) => ({ decor: decorIndex(d.decor), cell })), frames: d.frames, every: 5 })),
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

/**
 * Lapa's arches standing on the street: an upper storey (rows 9-12) on a lower (rows 13-17), every four columns, out to the picture's edge: the last two columns in the margin the picture shows past the playfield
 * (32-33, where the street is drawn too) are a pier and half an arch, so nothing stands past the street's end.
 */
const arches = (): Placed[] => [
  ...[4, 8, 12, 16, 20, 24, 28].flatMap((col): Placed[] => [[ARCH_UPPER, col, 9], [ARCH_BASE, col, 13]]),
  [ARCH_UPPER_END, 32, 9], [ARCH_BASE_END, 32, 13],
  ...fillCells(LAPA, [], [0, 16, 1, 17], 'rioShade'), // (the street's dark under the townhouse, to the picture's edge)
];

export const RIO_ROOMS: readonly RoomSpec[] = [
  // L THE LAPA ARCHES: crossed twice, the street first (the track seen, out of reach), then the track on the tram
  room({
    id: RIO_ROOM.lap, cell: [5, 25], sector: 68, palette: LAPA_PALETTE, paint: LAPA,
    coins: LAPA_COINS,
    decor: [...arches(), ['rioTram', TRAM_HOME[0], TRAM_HOME[1]]],
    creatures: [{ who: 'capoeirista', col: 24, row: 16, way: 'left', speed: 1, range: 150 }, { who: 'rioBat', col: 20, row: 9, way: 'down', speed: 1, range: 56 }],
  }),

  // C OPEN ARMS: the climb over the landmark, the highest place in the game
  room({
    id: RIO_ROOM.arms, cell: [5, 23], sector: 71, palette: ARMS_PALETTE, paint: ARMS,
    coins: ARMS_COINS,
    item: { name: 'skewer1', col: ARMS_SNACK[0], row: ARMS_SNACK[1], sprite: RIO_SPRITE.skewer },
    item2: { name: 'guarana', col: ARMS_GUARANA[0], row: ARMS_GUARANA[1], sprite: RIO_SPRITE.guarana },
    creatures: [
      { who: 'vulture', col: 23, row: 0, way: 'down', speed: 1, range: 96 }, { who: 'marmoset', col: 5, row: 2, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // F HOUSE OF COLOUR: the switchbacks down through the favela
  room({
    id: RIO_ROOM.colour, cell: [5, 24], sector: 73, palette: HILL_PALETTE, paint: HILL,
    coins: HILL_COINS,
    item: { name: 'skewer2', col: HILL_SNACK[0], row: HILL_SNACK[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...hillSky(), ['cloud', 6, 1], ['cloud', 17, 0], ['church', 29, 0], ['dish', 4, 7],
      ...hillHouses(), ...hillPosts(), ...hillWashing(),
    ],
    creatures: [
      { who: 'football', col: 12, row: 4, way: 'down', speed: 1, range: 32 }, { who: 'rioKite', col: 27, row: 1, way: 'down', speed: 1, range: 80 },
      { who: 'macaw', col: 19, row: 9, way: 'down', speed: 1, range: 24 },
    ],
  }),

  // W STEAK YOUR CLAIM: the gauchos' skewers, read there and back
  room({
    id: RIO_ROOM.steak, cell: [4, 25], sector: 74, palette: STEAK_PALETTE, paint: STEAK,
    coins: STEAK_COINS,
    item: { name: 'crank', col: STEAK_CRANK[0], row: STEAK_CRANK[1], sprite: RIO_SPRITE.crank },
    decor: [
      ['lampRed', 8, 2], ['lampRed', 14, 2], ['restTable', 7, 16], ['restTable', 11, 16], ['rioGrill', 21, 4],
    ],
    creatures: [{ who: 'gaucho', col: 24, row: 6, way: 'left', speed: 1, range: 24 }, { who: 'gaucho', col: 8, row: 16, way: 'right', speed: 1, range: 56 }],
  }),


  // P BEAT THE DRUM: the carnival's street, the Selaron steps up to Lapa's track, the dancers and the bateria's risers
  room({
    id: RIO_ROOM.beat, cell: [5, 26], sector: 70, palette: BEAT_PALETTE, paint: BEAT,
    coins: BEAT_COINS,
    item: { name: 'skewer3', col: BEAT_SNACK[0], row: BEAT_SNACK[1], sprite: RIO_SPRITE.skewer },
    decor: [
      [ARCH_UPPER, 0, 9], [ARCH_BASE, 0, 13], ...BEAT_RISERS.map(([col, row]): Placed => ['rioSelaron', col, row]),
      ...fillCells(BEAT, [...BEAT_COINS, ...BEAT_SNACK_CELLS, ...BEAT_RISERS, ...crowdCells(BEAT_CROWD.cols, BEAT_CROWD.rows)], [8, 2, 31, 8], 'rioTiers'),
      ...fillCells(BEAT, [...BEAT_COINS, ...BEAT_SNACK_CELLS, ...BEAT_RISERS], [12, 9, 31, 17], 'rioTiers'),
      ...crowdRows(BEAT_CROWD.cols, BEAT_CROWD.rows),
      ...[0, 4, 8, 12, 16, 20, 24, 28].map((col): Placed => ['bunting', col, 0]), ['rioBalloons', 5, 3], ['rioBalloons', 1, 1],
    ],
    creatures: [
      { who: 'drummer', col: 20, row: 6, way: 'down', speed: 1, range: 32 },
      { who: 'dancer', col: 12, row: 16, way: 'right', speed: 1, range: 32, colour: 7 }, { who: 'passista', col: 26, row: 16, way: 'right', speed: 1, range: 8, colour: 13 },
    ],
  }),

  // Q FLOAT YOUR BOAT: the floats over the canal, the baiana's stage, the grandstand's ladder up to the stand
  room({
    id: RIO_ROOM.float, cell: [5, 27], sector: 76, palette: FLOAT_PALETTE, paint: FLOAT,
    coins: FLOAT_COINS,
    decor: [
      ...fillCells(FLOAT, [...FLOAT_COINS, ...crowdCells(FLOAT_CROWD.cols, FLOAT_CROWD.rows)], [0, 5, 24, 17], 'rioTiers'),
      ['floatGalleon', FLOAT_HOME.floatGalleon[0], FLOAT_HOME.floatGalleon[1]], ['floatSun', FLOAT_HOME.floatSun[0], FLOAT_HOME.floatSun[1]], ['floatBird', FLOAT_HOME.floatBird[0], FLOAT_HOME.floatBird[1]],
      ...crowdRows(FLOAT_CROWD.cols, FLOAT_CROWD.rows),
      ...[4, 8, 12, 16, 20, 24].map((col): Placed => ['bunting', col, 4]), ['rioBalloons', 19, 0], ['rioBalloons', 24, 1],       ['rioPlumes', 25, 10], ['rioPost', 2, 16], ['rioPost', 5, 16], ['rioPost', 25, 16], ['rioPost', 27, 16],
    ],
    creatures: [{ who: 'baiana', col: 25, row: 16, way: 'right', speed: 1, range: 16 }],
  }),

  // D SPY VERSUS MOLE, the Sambadrome: the showdown (the agent, the float's head, the lever, the booth)
  room({
    id: RIO_ROOM.drum, cell: [5, 28], sector: 75, palette: DRUM_PALETTE, paint: DRUM,
    coins: DRUM_COINS,
    item: { name: 'headdress', col: DRUM_HEADDRESS[0], row: DRUM_HEADDRESS[1], sprite: RIO_SPRITE.headdress },
    decor: [
      ...fillCells(DRUM, crowdCells(DRUM_CROWD.cols, DRUM_CROWD.rows), [2, 9, 12, 15], 'rioTiers'), ...crowdRows(DRUM_CROWD.cols, DRUM_CROWD.rows),
      ['rioArch', 1, 5], ['rioFloat', 15, 10], ...[5, 6, 7, 8].flatMap((row): Placed[] => [['chain', 15, row], ['chain', 20, row]]), ['rioLever', 23, 16], ['rioBooth', 27, 2]],
    creatures: [{ who: 'drummer', col: 7, row: 1, way: 'down', speed: 1, range: 24 }, { who: 'dancer', col: 22, row: 2, way: 'left', speed: 2, range: 26 }, { who: 'agent', col: 0, row: 6, way: 'right', speed: 1, range: 1 }],
    crushers: FLOAT_HEAD.cols.map((col) => ({ col, row: FLOAT_HEAD.row, height: FLOAT_HEAD.height })),
  }),

  // B RIO OR BUST: the beach, the finale's stage (the troupe is the room's creatures, off the beach until the finale walks them on)
  room({
    id: RIO_ROOM.bust, cell: [5, 29], sector: 77, palette: BEACH_PALETTE, paint: BEACH,
    item: { name: 'bowl', col: BEACH_BOWL[0], row: BEACH_BOWL[1], sprite: RIO_SPRITE.bowl },
    decor: [
      ['sugarloaf', BEACH_VIEW.sugarloaf.col, BEACH_VIEW.sugarloaf.row], ['christFar', BEACH_VIEW.redeemer.col, BEACH_VIEW.redeemer.row], ['rioUmbrella', BEACH_VIEW.umbrella.col, BEACH_VIEW.umbrella.row], ['rioPole', BEACH_VIEW.pole.col, BEACH_VIEW.pole.row],
      ...BEACH_VIEW.fireworks.map(([col, row]): Placed => ['rioFirework', col, row]),
    ],
    creatures: [{ who: 'dancer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }, { who: 'drummer', col: 0, row: 16, way: 'right', speed: 1, range: 1 }],
  }),
];
