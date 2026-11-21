import type { EscalatorSpec, IcicleSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { Grid, room } from './layout';

/**
 * Moscow, the first region of Do Svidaniya Monty (docs/dosvidaniya-moscow.md): nine rooms in a block four wide and three high
 * on the exit grid's west end, laid out in Monty on the Run's manner: each its own shape and way through, openings at different
 * heights and in the floor and ceiling, two lanes crossed in turn, a dead end with an item.
 *
 *            col 0       col 1        col 2         col 3
 *   row 0      .       F  GUM        D  ONION      K  KREMLIN
 *   row 1   A  START   B  STREETS    C  SQUARE     I  STATION OUT
 *   row 2      .       G  HALL       H  PLATFORM      .
 *
 * Everything is in playfield cells (column 0-31, row 0-19). Monty stands on a floor at row r with his top at row r - 2; a way
 * out of a room at a side is open at the same rows as the way into the next (his height is kept across); a way up or down is
 * open at the same columns in both rooms (his column is). The metro token (F) takes the turnstile's bars away (G); the ushanka (H)
 * sends the Kremlin guard off (K) and Monty wears it from then on.
 */

// ---- the ids -----------------------------------------------------------------------------------------
export const ROOM = { start: 0, streets: 1, square: 2, domes: 3, kremlin: 4, station: 5, gum: 6, hall: 7, platform: 8 } as const;

/** The sprite pointers (in the bank) of Moscow's items and icicles. $C0 is the death sequence's scratch. */
export const SPRITE = { token: 0xd0, ushanka: 0xd1, pirozhok: 0xd2, iceFull: 0xd3, iceHalf: 0xd4, iceSmall: 0xd5, iceShards: 0xd6 } as const;

/** The names (a pun on the place, in Monty on the Run's manner), centred in the row under the playfield. */
const NAMES = [
  'MOSCOW MOLE', 'SNOW PLACE LIKE HOME', 'SEEING RED', 'ONION DOME SWEET DOME', 'KREMLIN GREMLINS',
  'SIBERIA YOU LATER', 'STUCK LIKE GUM', 'ESCALATING TENSIONS', 'UNDERGROUND MOVEMENT',
] as const;
/** Sector order is the ids': room n is sector n. */
export const SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the street rooms red, the roofs yellow, the metro light blue, the way out white). */
export const SECTOR_COLOURS: readonly number[] = [2, 2, 2, 7, 7, 1, 8, 14, 14];

// ---- shared bits ---------------------------------------------------------------------------------------

/**
 * A ceiling of `rows` rows of crust across the room with a ragged edge under it: at each of the column ranges `drips` says, a
 * fringe of drips under the crust, and in every second one the crust itself comes a row lower first (so the edge steps).
 */
function roof(g: Grid, rows: number, drips: readonly (readonly [number, number])[], crust = 'C', drip = 'D') {
  g.box(0, 0, 31, rows - 1, crust);
  drips.forEach(([a, b], i) => {
    if (i % 2 === 1 && b - a >= 2) { g.box(a + 1, rows, b - 1, rows, crust); g.box(a + 1, rows + 1, b - 1, rows + 1, drip); } else g.box(a, rows, b, rows, drip);
  });
}

/** An escalator's slope: its treads two cells thick along the line his feet follow, from the foot to the far landing. */
function slope(g: Grid, letter: string, spec: Pick<EscalatorSpec, 'col' | 'row' | 'dx' | 'dy' | 'cols' | 'rows'>, from: number, to: number) {
  for (let i = from; i <= to; i++) {
    const feet = spec.row + spec.dy * Math.round((i * spec.rows) / spec.cols);
    const c = spec.col + spec.dx * i;
    if (feet < 17) g.box(c, feet, c, Math.min(feet + 1, 16), letter);
  }
}

// ---- the escalators and icicles ---------------------------------------------------------------------------
/** Hall's: down from the concourse, 12 cells along and 8 down in 96 frames (2 seconds), to the lower floor. */
const DOWN: EscalatorSpec = { room: ROOM.hall, col: 13, row: 9, dx: 1, dy: 1, cols: 12, rows: 8, frames: 96 };
/** The platform's: up from the lane's foot to the gallery's head. */
const UP: EscalatorSpec = { room: ROOM.platform, col: 16, row: 17, dx: 1, dy: -1, cols: 12, rows: 8, frames: 96 };
export const ESCALATORS: readonly EscalatorSpec[] = [DOWN, UP];

export const ICICLES: readonly IcicleSpec[] = [
  { room: ROOM.streets, col: 11, row: 9, floor: 17 }, { room: ROOM.streets, col: 15, row: 9, floor: 17 },
  { room: ROOM.domes, col: 15, row: 7, floor: 17 }, { room: ROOM.domes, col: 21, row: 7, floor: 17 },
  { room: ROOM.kremlin, col: 4, row: 2, floor: 6 },
];

// ---- the rooms ----------------------------------------------------------------------------------------------

export const MOSCOW_ROOMS: readonly RoomSpec[] = [
  // A MOSCOW MOLE: the platform he arrives on. A parked train fills the floor: climb the luggage, cross its roof, jump to the
  // signal gantry and out, high at the right.
  room({
    id: ROOM.start, cell: [1, 0], sector: 0,
    palette: { S: ['snowGround', 1], C: ['snowCrust', 3], D: ['snowDrip', 3], X: ['crate', 9], T: ['trainSide', 5], G: ['girder', 12], P: ['planks', 8], K: ['kremlinBrick', 2] },
    paint(g) {
      roof(g, 2, [[0, 3], [7, 10], [15, 17], [24, 27]]);
      g.box(0, 2, 1, 16, 'P').box(30, 2, 31, 3, 'K').box(28, 8, 31, 16, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'K');
      g.box(5, 15, 6, 16, 'X').box(7, 13, 8, 16, 'X').box(9, 11, 11, 16, 'X'); // the luggage, a step each
      g.box(12, 9, 27, 9, 'G').box(12, 10, 27, 16, 'T'); // the train
      g.box(22, 7, 31, 7, 'G'); // the gantry
    },
    coins: [[20, 8]],
    decor: [[{ text: 'MOSKVA', colour: 1 }, 4, 4], ['stationClock', 13, 4], ['lampStreet', 3, 13]],
    creatures: [{ who: 'pigeon', col: 17, row: 3, way: 'down', speed: 1, range: 24 }],
  }),

  // B SNOW PLACE LIKE HOME: the hub. In by the awning; the street under a sign beam hung with two icicles, a manhole (a drop to the
  // hall) and a grating with a rope (up and down to it), a rope up to the gum arcade, crates and a ladder up to a walkway
  // that leaves high at the right, the street itself leaving low.
  room({
    id: ROOM.streets, cell: [1, 1], sector: 1,
    palette: { S: ['snowGround', 1], C: ['snowCrust', 3], D: ['snowDrip', 3], X: ['crate', 9], W: ['awning', 2], R: ['rope', 13], L: ['ironLadder', 7], G: ['girder', 12] },
    paint(g) {
      roof(g, 2, [[0, 5], [8, 12], [24, 31]]);
      g.clear(19, 0, 21, 1); // the way up, to the arcade
      g.box(0, 2, 1, 3, 'C').box(0, 8, 1, 16, 'X').box(30, 7, 31, 12, 'X');
      g.box(0, 7, 9, 7, 'W'); // the awning he lands on
      g.box(0, 17, 31, 19, 'S').clear(3, 17, 4, 19).clear(6, 17, 8, 19); // the grating, the manhole
      g.box(3, 17, 3, 19, 'R').box(20, 0, 20, 16, 'R');
      g.box(10, 8, 17, 8, 'G'); // the sign beam, the icicles hang under it
      g.box(22, 15, 23, 16, 'X').box(24, 13, 25, 16, 'X').box(26, 15, 27, 16, 'X').box(26, 6, 27, 12, 'L').box(22, 6, 25, 6, 'G').box(28, 6, 31, 6, 'G');
    },
    coins: [[13, 15], [28, 4]],
    decor: [[{ text: 'METRO', colour: 2 }, 4, 9], ['shopWindow', 2, 12], ['shopWindow', 6, 12], ['lampStreet', 9, 13], ['firTree', 28, 14]],
    creatures: [
      { who: 'babushka', col: 12, row: 6, way: 'right', speed: 1, range: 24 },
      { who: 'snowball', col: 9, row: 15, way: 'right', speed: 2, range: 14 },
    ],
  }),

  // C SEEING RED: two lanes that never meet. Low: along the cobbles past two matryoshkas to an open drain, a drop into the
  // platform. High: along the Kremlin wall's terrace to a flagpole rope that climbs to the domes.
  room({
    id: ROOM.square, cell: [1, 2], sector: 2,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], K: ['kremlinBrick', 2], B: ['battlement', 2], O: ['cobbles', 10], R: ['rope', 13], S: ['snowGround', 1], F: ['snowFill', 1] },
    paint(g) {
      roof(g, 2, [[0, 3], [16, 19], [29, 31]]);
      g.clear(25, 0, 26, 1).clear(9, 0, 10, 1); // the flagpole's way up, and the chimney the bear dances in
      g.box(0, 0, 1, 2, 'C').box(0, 9, 1, 12, 'K').box(30, 2, 31, 16, 'K');
      g.box(0, 6, 29, 6, 'B').box(0, 7, 29, 8, 'K'); // the terrace on top of the wall
      g.box(25, 0, 25, 5, 'R'); // the flagpole rope
      g.box(0, 17, 31, 17, 'O').box(0, 18, 31, 19, 'F').clear(20, 17, 22, 19); // the drain
    },
    coins: [[14, 4], [26, 15]],
    decor: [['stBasils', 10, 9], ['lampStreet', 6, 13], ['lampStreet', 28, 13], ['redStar', 3, 3], ['domeSmall', 8, 3]],
    creatures: [
      { who: 'matryoshka', col: 4, row: 15, way: 'right', speed: 2, range: 26 },
      { who: 'matryoshka', col: 12, row: 15, way: 'right', speed: 2, range: 26 },
      { who: 'bear', col: 9, row: 0, way: 'down', speed: 1, range: 32 },
    ],
  }),

  // D ONION DOME SWEET DOME: arrive through the floor on a rope; go left along the street under the domes' eaves (two icicles), up a
  // stair of domes at the left, then right across the dome tops (gaps to jump) to the way out, above the rope.
  room({
    id: ROOM.domes, cell: [0, 2], sector: 3,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], M: ['domeScale', 7], K: ['kremlinBrick', 2], S: ['snowGround', 1], F: ['snowFill', 1], R: ['rope', 13] },
    paint(g) {
      roof(g, 2, [[0, 3], [9, 12], [20, 22]]);
      g.box(0, 2, 1, 16, 'K').box(30, 2, 31, 2, 'D').box(30, 7, 31, 16, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F').clear(25, 17, 26, 19).box(25, 16, 25, 19, 'R');
      g.box(10, 15, 13, 15, 'M').box(6, 13, 9, 13, 'M').box(2, 11, 5, 11, 'M').box(6, 9, 9, 9, 'M').box(10, 7, 13, 7, 'M'); // the stair
      g.box(14, 6, 17, 6, 'M').box(20, 6, 23, 6, 'M').box(26, 6, 31, 6, 'M'); // the dome tops
    },
    coins: [[7, 11], [19, 4]],
    cake: [28, 4],
    decor: [['domeMedium', 14, 2], ['domeSmall', 21, 3], ['domeSmall', 30, 3]],
    creatures: [
      { who: 'pigeon', col: 8, row: 3, way: 'down', speed: 1, range: 40 },
      { who: 'egg', col: 3, row: 3, way: 'down', speed: 1, range: 18 },
    ],
  }),

  // K KREMLIN GREMLINS: along the wall's top through a low arch the guard paces (he fills it: no jumping him), past a gorge
  // that drops to the station, to a stub with a coin.
  room({
    id: ROOM.kremlin, cell: [0, 3], sector: 4,
    palette: { K: ['kremlinBrick', 2], B: ['battlement', 2], C: ['snowCrust', 3], D: ['snowDrip', 3], A: ['rock', 12], F: ['snowFill', 1] },
    paint(g) {
      roof(g, 2, [[19, 24]]);
      g.box(6, 2, 13, 3, 'A').box(30, 2, 31, 5, 'K');
      // the wall's top, two slabs over the gorge, each a short face of brick on piers with the undercroft open (black) between them
      for (const [from, to] of [[0, 14], [19, 31]] as const) {
        g.box(from, 6, to, 6, 'B').box(from, 7, to, 9, 'K');
        for (let c = from; c <= to; c += 6) g.box(c, 10, Math.min(c + 2, to), 17, 'K');
        g.box(from, 18, to, 19, 'F');
      }
    },
    coins: [[25, 4]],
    decor: [['redStar', 21, 3], ['lampStreet', 28, 2]],
    creatures: [
      { who: 'guard', col: 6, row: 4, way: 'right', speed: 2, range: 24 },
    ],
  }),

  // I SIBERIA YOU LATER: drop in onto the roof of a long carriage; along it to the way out at the right, which is shut for now with a
  // sign. A pocket at the left (steps down off the roof's end, luggage to climb back) holds a coin.
  room({
    id: ROOM.station, cell: [1, 3], sector: 5,
    palette: { K: ['kremlinBrick', 2], C: ['snowCrust', 3], D: ['snowDrip', 3], G: ['girder', 12], T: ['trainSide', 5], X: ['crate', 9], P: ['planks', 8] },
    paint(g) {
      roof(g, 2, [[0, 5], [20, 27]]);
      g.clear(15, 0, 18, 1);
      g.box(0, 2, 1, 16, 'P').box(30, 3, 31, 8, 'P');
      g.box(0, 17, 31, 19, 'K');
      g.box(3, 15, 4, 16, 'X').box(5, 13, 6, 16, 'X').box(7, 11, 8, 16, 'X'); // the luggage back up
      g.box(9, 9, 31, 9, 'G').box(9, 10, 31, 16, 'T'); // the carriage
    },
    coins: [[2, 16]],
    decor: [[{ text: 'SIBERIA COMING SOON', colour: 7 }, 9, 4], ['stationClock', 4, 4]],
    creatures: [
      { who: 'balalaika', col: 10, row: 7, way: 'right', speed: 1, range: 24 },
      { who: 'samovar', col: 22, row: 7, way: 'right', speed: 1, range: 40 },
    ],
  }),

  // F STUCK LIKE GUM: a dead end. A rope up through the floor; along the ground past a Mole Crusher to a stair of ledges up to a gallery
  // with the metro token, and back the same way.
  room({
    id: ROOM.gum, cell: [0, 1], sector: 6,
    palette: { C: ['snowCrust', 3], D: ['snowDrip', 3], K: ['kremlinBrick', 2], S: ['snowGround', 1], R: ['rope', 13], L: ['snowLedge', 3], G: ['girder', 12] },
    paint(g) {
      roof(g, 2, [[3, 8], [14, 17], [24, 28]]);
      g.box(0, 2, 1, 16, 'K').box(30, 2, 31, 16, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'K').clear(19, 17, 21, 19).box(20, 16, 20, 19, 'R');
      g.box(7, 15, 9, 15, 'L').box(4, 13, 6, 13, 'L').box(2, 11, 4, 11, 'L'); // the stair
      g.box(5, 9, 14, 9, 'G'); // the gallery
    },
    coins: [[26, 15], [8, 13]],
    item: { name: 'token', col: 12, row: 7, sprite: SPRITE.token },
    decor: [['gumArch', 14, 13], ['gumArch', 22, 13], ['chandelier', 8, 3]],
    creatures: [
      { who: 'matryoshka', col: 23, row: 15, way: 'right', speed: 1, range: 24 },
      { who: 'samovar', col: 5, row: 7, way: 'right', speed: 1, range: 36 },
    ],
    crushers: [{ col: 10, row: 11, height: 6, chr: 0x10 }],
  }),

  // G ESCALATING TENSIONS: the concourse, high at the left (in by the manhole, a rope up to the street), a gap in it that holds the
  // escalator down to the lower floor, a stub high at the right (in from the platform's gallery). The lower floor runs the
  // width, out at the right through the turnstile.
  room({
    id: ROOM.hall, cell: [2, 1], sector: 7,
    palette: { V: ['vault', 14], M: ['metroTile', 3], P: ['pillar', 1], F: ['arcadeFloor', 1], E: ['escalatorFoot', 7], R: ['rope', 13], Z: ['turnstile', 7], T: ['escalator', 15] },
    treads: { letter: 'T', way: 'down' },
    paint(g) {
      g.box(0, 0, 31, 2, 'V').clear(3, 0, 4, 2).clear(6, 0, 8, 2);
      g.box(0, 3, 1, 8, 'P').box(0, 9, 1, 19, 'M').box(30, 3, 31, 5, 'M').box(30, 9, 31, 12, 'M');
      g.box(0, 9, 12, 9, 'F').box(26, 9, 31, 9, 'F').box(13, 9, 14, 9, 'E'); // the concourse, the stub, the foot
      g.box(0, 17, 31, 19, 'F').box(28, 13, 29, 16, 'Z');
      g.box(3, 0, 3, 16, 'R').box(4, 9, 4, 9, 'R'); // the rope up through the concourse (a gap two wide: he is two cells across)
      slope(g, 'T', DOWN, 2, 12);
    },
    coins: [[10, 15]],
    decor: [['stationClock', 16, 3], ['chandelier', 21, 3], ['metroSign', 10, 12], ['bench', 5, 15], ['bench', 20, 15], ['poster', 25, 5]],
    creatures: [
      { who: 'cossack', col: 9, row: 7, way: 'right', speed: 1, range: 24 },
      { who: 'tram', col: 6, row: 15, way: 'right', speed: 2, range: 36 },
    ],
  }),

  // H UNDERGROUND MOVEMENT: two lanes. Low: in through the turnstile, past a Mole Crusher, a shelf with the ushanka, to the up escalator's
  // foot (a ride you cannot leave). High: the gallery (in from the square's drain or the hall's stub), a cake on a high ledge, the
  // escalator's head. The lane's only way out is the ride.
  room({
    id: ROOM.platform, cell: [2, 2], sector: 8,
    palette: { V: ['vault', 14], M: ['metroTile', 3], F: ['arcadeFloor', 1], E: ['escalatorFoot', 7], G: ['girder', 12], Q: ['platformEdge', 7], P: ['pillar', 1], T: ['escalator', 15] },
    treads: { letter: 'T', way: 'up' },
    paint(g) {
      g.box(0, 0, 31, 2, 'V').clear(20, 0, 22, 2);
      g.box(0, 3, 1, 5, 'P').box(0, 12, 1, 12, 'M').box(30, 3, 31, 16, 'M');
      g.box(0, 9, 15, 9, 'F').box(0, 10, 15, 11, 'M').box(16, 9, 25, 9, 'G').box(28, 9, 31, 9, 'F'); // the gallery over the lane
      g.box(0, 17, 31, 19, 'F').box(16, 17, 17, 17, 'E');
      g.box(8, 7, 10, 7, 'Q').box(12, 5, 14, 5, 'Q').box(11, 15, 13, 15, 'Q'); // the ledges, the shelf
      slope(g, 'T', UP, 2, 11);
    },
    coins: [[22, 15], [4, 7]],
    cake: [13, 3],
    item: { name: 'ushanka', col: 12, row: 13, sprite: SPRITE.ushanka },
    decor: [['metroSign', 3, 13], ['bench', 14, 15], ['chandelier', 6, 3], ['stationClock', 24, 3]],
    creatures: [{ who: 'babushka', col: 14, row: 7, way: 'right', speed: 1, range: 36 }],
    crushers: [{ col: 6, row: 12, height: 5, chr: 0x22 }],
  }),
];
