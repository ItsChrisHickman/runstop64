import type { CharAnim, EscalatorSpec, IcicleSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { bandFrames, BAND_ORDER } from './art/escalator';
import { codeOf, Grid, room, type Palette } from './layout';
import { underCar, buffersAt, CAR, farWall, hatch, skyAnims, skyDecor, type SkySpec, trainAnims, undercarriage, windowAt } from './train';

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
 * An escalator's band, painted on the three diagonals of cells it crosses (art/escalator.ts): the treads on the line his feet follow
 * (between the foot and the landing), the body under them and the handrail above, one cell down (or up) for every cell along.
 */
function band(g: Grid, tiles: { tread: string; body: string; rail: string }, spec: Pick<EscalatorSpec, 'col' | 'row' | 'dy' | 'cols'>) {
  const { col, row, dy, cols } = spec;
  const at = (c: number, r: number, letter: string) => g.box(c, r, c, r, letter);
  for (let j = 0; j <= cols; j++) {
    if (dy === 1) {
      if (j >= 1 && j <= cols - 1) at(col + 1 + j, row + j, tiles.tread);
      if (j <= cols - 2) at(col + 1 + j, row + 1 + j, tiles.body);
      if (j >= 1) at(col + 1 + j, row - 1 + j, tiles.rail); // (none over the landing: the handrail ends flush with the floor it meets)
    } else {
      if (j <= cols - 2) at(col + 1 + j, row - 1 - j, tiles.tread);
      if (j <= cols - 2) at(col + 2 + j, row - 1 - j, tiles.body);
      if (j <= cols - 1) at(col + j, row - 1 - j, tiles.rail);
    }
  }
}

/** An escalator's `treads`: the characters of a band's tiles in a room (the palette's codes) and the pictures they take in turn. */
const treadsOf = (palette: Palette, tiles: { tread: string; body: string; rail: string }, way: 'down' | 'up'): NonNullable<EscalatorSpec['treads']> => ({
  chars: BAND_ORDER.map((part) => codeOf(palette, tiles[part])), frames: bandFrames(way),
});

// ---- the escalators and icicles ---------------------------------------------------------------------------
/** The hall's and the platform's palettes: the three tiles of an escalator's band are three of the eight a room has. */
const HALL_PALETTE = {
  V: ['vault', 14], M: ['metroTile', 3], F: ['arcadeFloor', 1], R: ['rope', 13], Z: ['turnstile', 7],
  T: ['escalatorDownTread', 1], B: ['escalatorDownBody', 14], N: ['escalatorDownRail', 7],
} as const satisfies Palette;
const PLATFORM_PALETTE = {
  V: ['vault', 14], M: ['metroTile', 3], F: ['arcadeFloor', 1], G: ['girder', 8], Q: ['platformEdge', 7],
  T: ['escalatorUpTread', 1], B: ['escalatorUpBody', 14], N: ['escalatorUpRail', 7],
} as const satisfies Palette;
/** Their letters. */
const BAND = { tread: 'T', body: 'B', rail: 'N' } as const;

/** Hall's: down from the concourse's end, 5 cells along and 5 down in 60 frames (the pace of the up one) to a terrace over the lower floor. */
const DOWN: EscalatorSpec = { room: ROOM.hall, col: 13, row: 9, dx: 1, dy: 1, cols: 5, rows: 5, frames: 60, treads: treadsOf(HALL_PALETTE, BAND, 'down') };
/** The platform's: up from the lane's foot to the gallery's head, 8 along and 8 up in 96 frames (2 seconds). */
const UP: EscalatorSpec = { room: ROOM.platform, col: 20, row: 17, dx: 1, dy: -1, cols: 8, rows: 8, frames: 96, treads: treadsOf(PLATFORM_PALETTE, BAND, 'up') };
export const ESCALATORS: readonly EscalatorSpec[] = [DOWN, UP];

/**
 * The platform's car: the passenger car's characters (train.ts) in the same places, with the Kremlin's brick for the platform and the wall over it.
 * The train stands until he is aboard (from column 22, inside the door).
 */
const STATION_PALETTE = {
  D: ['roofDeck', 14], E: ['carWall', 8], F: ['carFloor', 9], T: ['trainSide', 2], K: ['kremlinBrick', 2], R: ['ironLadder', 7],
} as const satisfies Palette;
const STATION_BOGIES = [22, 27] as const;
/** What moves once he is aboard (from column 22): the windows, the sleepers, the wheels. */
export const STATION_ANIMS: readonly CharAnim[] = [...trainAnims(ROOM.station, true, 22), ...skyAnims(ROOM.station, false, 22)];
/** The night above the train (train.ts): the moon, a star or two, the poles and the horizon over the car, still until he is aboard. */
const STATION_SKY: SkySpec = { spans: [[20, 33]], moon: [24, 2], stars: [['star', 21, 3], ['starDim', 28, 2], ['star', 31, 3], ['starDim', 27, 3]] };

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
    palette: { S: ['snowGround', 1], X: ['crate', 9], T: ['trainSide', 5], G: ['girder', 3], K: ['kremlinBrick', 2], B: ['battlement', 2] },
    paint(g) {
      // open to the night: the platform runs off the left edge (no wall: the exit grid stops him, as at Monty on the Run's start) and the sky is open above; the Kremlin's wall closes the right (the street's edge is solid there), a passage through it at the gantry
      g.box(28, 8, 31, 16, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'K');
      g.box(5, 15, 6, 16, 'X').box(7, 13, 8, 16, 'X').box(9, 11, 11, 16, 'X'); // the luggage, a step each
      g.box(12, 9, 27, 9, 'G').box(12, 10, 27, 16, 'T'); // the train
      g.box(22, 7, 31, 7, 'G'); // the gantry
    },
    coins: [[20, 8]],
    decor: [['stationClock', 13, 4], ['lampStreet', 3, 13]],
    creatures: [{ who: 'pigeon', col: 17, row: 3, way: 'down', speed: 1, range: 24 }],
  }),

  // B SNOW PLACE LIKE HOME: the hub. In by the awning; the street under a sign beam hung with two icicles, a manhole (a drop to the
  // hall) and a grating with a rope (up and down to it), a rope up to the gum arcade, crates and a ladder up to a walkway
  // that leaves high at the right, the street itself leaving low.
  room({
    id: ROOM.streets, cell: [1, 1], sector: 1,
    palette: { S: ['snowGround', 1], X: ['crate', 9], W: ['awning', 2], R: ['rope', 13], L: ['ironLadder', 7], G: ['girder', 3], K: ['kremlinBrick', 2] },
    paint(g) {
      // an open street under the sky; only the arcade's overhanging floor above the rope's manhole (the way up) closes the sky
      g.box(12, 0, 18, 0, 'K').box(22, 0, 31, 0, 'K').box(14, 1, 18, 1, 'K').box(22, 1, 27, 1, 'K');
      g.box(0, 8, 1, 16, 'X').box(30, 7, 31, 12, 'X');
      g.box(0, 7, 9, 7, 'W'); // the awning he lands on
      g.box(0, 17, 31, 19, 'S').clear(2, 17, 8, 19); // the grating with its rope and the manhole, one opening
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
    palette: { K: ['kremlinBrick', 2], B: ['battlement', 2], O: ['cobbles', 10], R: ['rope', 13], S: ['snowGround', 1], F: ['snowFill', 1] },
    paint(g) {
      // the square under the open sky: the Kremlin's wall across the back with its terrace, a tower of it closing the right end
      g.box(0, 9, 1, 12, 'K').box(29, 2, 31, 2, 'B').box(29, 3, 31, 16, 'K');
      g.box(0, 6, 28, 6, 'B').box(0, 7, 28, 8, 'K'); // the terrace on top of the wall
      g.box(15, 0, 22, 0, 'K').box(17, 1, 22, 1, 'K').box(28, 0, 31, 1, 'K'); // the domes' stonework over the flagpole's way up (five cells round the rope); the rest open sky
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
    palette: { B: ['battlement', 2], M: ['domeScale', 7], K: ['kremlinBrick', 2], S: ['snowGround', 1], F: ['snowFill', 1], R: ['rope', 13] },
    paint(g) {
      // under the open sky: the arcade's roof edge at the left, the Kremlin's wall at the right
      g.box(0, 3, 1, 3, 'B').box(0, 4, 1, 16, 'K').box(30, 7, 31, 16, 'K');
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'F').clear(23, 17, 27, 19).box(25, 16, 25, 19, 'R');
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
    palette: { K: ['kremlinBrick', 2], B: ['battlement', 2], F: ['snowFill', 1] },
    paint(g) {
      // the wall's top under the open sky: a gate tower straddling it (the low arch), a watchtower closing the far end
      g.box(6, 0, 13, 0, 'B').box(6, 1, 13, 3, 'K').box(30, 1, 31, 1, 'B').box(30, 2, 31, 5, 'K');
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

  // I SIBERIA YOU LATER: the Trans-Siberian's platform. He drops in through the Kremlin's gorge onto the platform, a lamp and a bench on it, and the last
  // car of the train standing at its edge: the open door at its end, the windows (no scenery moves yet), the roof, the wheels on the rail. Through the door
  // he is aboard: the train starts to roll (the windows, the sleepers and the wheels) as he steps in; the hatch's rope in the car climbs to the roof, and the roof
  // goes on east to the dining car (siberia.ts). The car's other end is shut. A coin at the platform's far end.
  room({
    id: ROOM.station, cell: [1, 3], sector: 5, palette: STATION_PALETTE,
    paint(g) {
      g.box(0, 2, 1, 16, 'K'); // the Kremlin's tower closing the platform's west end; the night sky open above it and the gorge
      g.box(0, 17, 19, 19, 'K'); // the platform
      g.box(20, CAR.roof, 31, CAR.roof, 'D'); farWall(g, 22, 29); // the car's roof, the wall behind
      g.box(20, 10, 21, 14, 'T').box(30, 10, 31, 16, 'T'); // its rear wall (the door open below), its far end
      hatch(g, 28);
      undercarriage(g, 20, 31);
    },
    coins: [[2, 16]],
    decor: [
      [{ text: 'TRAIN TO SIBERIA', colour: 7 }, 2, 3], ['stationClock', 4, 6], ['lampStreet', 11, 13], ['bench', 6, 15],
      ...skyDecor(STATION_SKY), ['carDoor', 20, CAR.gangwayTop], windowAt(22), ['carLamp', 27, 11], ['roofVent', 21, 8], ['roofVent', 24, 8], ...underCar(20, 31, STATION_BOGIES), ...buffersAt(20, 31),
    ],
    creatures: [
      { who: 'balalaika', col: 13, row: 15, way: 'right', speed: 1, range: 24 },
      { who: 'samovar', col: 21, row: 7, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // F STUCK LIKE GUM: a dead end. A rope up through the floor; along the ground past a Mole Crusher to a stair of ledges up to a gallery
  // with the metro token, and back the same way.
  room({
    id: ROOM.gum, cell: [0, 1], sector: 6,
    palette: { K: ['kremlinBrick', 2], S: ['snowGround', 1], R: ['rope', 13], L: ['snowLedge', 3], G: ['girder', 3] },
    paint(g) {
      // inside the GUM arcade: its barrel vault (stepped up to the crown) over the gallery, the arcade's own end walls
      g.box(0, 0, 5, 2, 'K').box(26, 0, 31, 2, 'K').box(6, 0, 9, 1, 'K').box(22, 0, 25, 1, 'K').box(10, 0, 21, 0, 'K');
      g.box(0, 3, 1, 16, 'K').box(30, 3, 31, 16, 'K');
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
    crushers: [{ col: 10, row: 10, height: 7 }], // (hung from the gallery over it, as Monty on the Run's hang from their ceilings)
  }),

  // G ESCALATING TENSIONS: the concourse, high at the left (in by the manhole, a rope up to the street), ending at the down
  // escalator's foot; the escalator takes him down to a terrace over the lower floor (walking back the way he came, against it, the
  // treads turn him round), a stub high at the right (in from the platform's gallery). The lower floor runs the width under the
  // terrace, out at the right through the turnstile.
  room({
    id: ROOM.hall, cell: [2, 1], sector: 7,
    palette: HALL_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 2, 'V').clear(2, 0, 8, 2).clear(12, 2, 20, 2); // the vault, stepped up to its crown, open over the street's manhole
      g.box(0, 3, 1, 8, 'M').box(0, 9, 1, 19, 'M').box(30, 3, 31, 5, 'M').box(30, 9, 31, 12, 'M');
      g.box(0, 9, 14, 9, 'F').clear(2, 9, 6, 9).box(26, 9, 31, 9, 'F'); // the concourse with the foot at its end, a gap in it for the rope, the stub
      g.box(16, 14, 22, 14, 'F'); // the terrace (a floor over the walkway: two cells of headroom under it)
      g.box(0, 17, 31, 19, 'F').box(28, 13, 29, 16, 'Z');
      g.box(3, 0, 3, 16, 'R'); // the rope up through the concourse's gap (five cells: he is two or three across)
      band(g, BAND, DOWN);
    },
    coins: [[10, 15]],
    decor: [['stationClock', 16, 3], ['chandelier', 21, 3], ['metroSign', 12, 14], ['bench', 5, 15], ['bench', 20, 15], ['poster', 25, 5]],
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
    palette: PLATFORM_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 2, 'V').clear(20, 0, 22, 2).clear(7, 2, 18, 2); // the vault, stepped up to its crown
      g.box(0, 3, 1, 5, 'M').box(0, 12, 1, 12, 'M').box(30, 3, 31, 16, 'M');
      g.box(0, 9, 15, 9, 'F').box(0, 10, 15, 11, 'M').box(16, 9, 25, 9, 'G').box(28, 9, 31, 9, 'F'); // the gallery over the lane
      g.box(0, 17, 31, 19, 'F');
      g.box(8, 7, 10, 7, 'Q').box(12, 5, 14, 5, 'Q').box(11, 15, 13, 15, 'Q'); // the ledges, the shelf
      band(g, BAND, UP);
    },
    coins: [[26, 15], [4, 7]],
    cake: [13, 3],
    item: { name: 'ushanka', col: 12, row: 13, sprite: SPRITE.ushanka },
    decor: [['metroSign', 3, 14], ['bench', 14, 15], ['chandelier', 6, 3], ['stationClock', 24, 3]],
    creatures: [{ who: 'babushka', col: 14, row: 7, way: 'right', speed: 1, range: 36 }],
    crushers: [{ col: 6, row: 12, height: 5 }],
  }),
];
