import type { CableCarSpec, FloatSpec, SkewerSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { RIO_DECOR } from './art/rio-decor';
import { SKEWER_POSES } from './art/rio-items';
import { codeOf, decorIndex, room, type Palette } from './layout';
import { CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from './rio-pointers';

/**
 * Rio, the seventh and last region of Do Svidaniya Monty (docs/dosvidaniya-rio.md): eleven rooms in a block of seven columns and two rows at columns 33-39 of the exit grid (rows 6-7), entered from the Amazon's last bank (the
 * Andes' column 32) and ending on the beach, where the game ends.
 *
 *            col 33              34               35               36               37              38               39
 *   row 6   W STEAK YOUR CLAIM  S SUGAR RUSH     U LOAFING ABOUT  C OPEN ARMS      T MONKEY BUSINESS
 *   row 7   H QUAY TO THE CITY  L THE LAPA ARCHES                  F HOUSE OF COLOUR P BEAT THE DRUM  Q FLOAT YOUR BOAT  B RIO OR BUST
 *
 * (The letters are the design's.) Playfield cells as in moscow.ts. Floors ("F"): the quay and every low way 18; the gangway 8 and its steps 11, 14; the pier 14; Lapa's tram track 7 and the key's ledge 4; the cable's lower shelf 14 and
 * upper platform 8; the summit's 8 and its dome 6; the Redeemer's terrace 8, 11 and viewing platform 14; the forest's boughs 8 and 14; the hillside's roofs 8, 9; the parade's risers 15, 12, 9; the restaurant's mezzanine 10 and stairs 12,
 * 15; the avenue's floats 18 and 14; the beach 18. A way out at a side is open on rows 16-17 (floor 18) or 6-7 (floor 8) and meets the next room's. The cable car (S), the floats (Q) and the gauchos' skewers (W) are data of the engine
 * (cablecars.ts, floats.ts, skewers.ts); the ropes join L to S, C to F and T to P.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from the Andes' (55-66): they never change once the region has shipped. */
export const RIO_ROOM = { quay: 67, lap: 68, sugar: 69, loaf: 70, arms: 71, monkey: 72, colour: 73, steak: 74, drum: 75, float: 76, bust: 77 } as const;

const NAMES = [
  'QUAY TO THE CITY', 'THE LAPA ARCHES', 'SUGAR RUSH', 'LOAFING ABOUT', 'OPEN ARMS', 'MONKEY BUSINESS', 'HOUSE OF COLOUR', 'STEAK YOUR CLAIM', 'BEAT THE DRUM', 'FLOAT YOUR BOAT', 'RIO OR BUST',
] as const;
export const RIO_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the quay's greys, Lapa's white, the granite blues, the forest greens, the favela's lights, the restaurant's reds, the carnival's yellows, the beach's sand). */
export const RIO_COLOURS: readonly number[] = [12, 1, 15, 12, 7, 5, 14, 2, 10, 7, 7];

// ---- the palettes --------------------------------------------------------------------------------------
export const QUAY_PALETTE = {
  Q: ['quayStone', 12], P: ['pierPlanks', 9], B: ['barrel', 9], S: ['seaSwell', 14], W: ['wavePavement', 1], L: ['woodLadder', 9],
} as const satisfies Palette;

export const LAPA_PALETTE = {
  S: ['quayStone', 12], T: ['aqueductTop', 1], L: ['woodLadder', 9], V: ['vine', 5], W: ['wavePavement', 1], A: ['limestone', 1],
} as const satisfies Palette;

export const SUGAR_PALETTE = {
  N: ['sand', 7], G: ['granite', 12], F: ['stationFloor', 15], C: ['cableLow', 15], D: ['cableHigh', 15], L: ['woodLadder', 9], V: ['vine', 5],
} as const satisfies Palette;

export const SUMMIT_PALETTE = {
  G: ['granite', 12], E: ['graniteLedge', 12], F: ['stationFloor', 15], M: ['mossGround', 13], V: ['vine', 5],
} as const satisfies Palette;

export const ARMS_PALETTE = {
  G: ['granite', 12], E: ['graniteLedge', 12], P: ['pedestal', 15], V: ['vine', 5], M: ['mossGround', 13],
} as const satisfies Palette;

export const FOREST_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mossGround', 13], G: ['rockLedge', 9], V: ['vine', 5], W: ['riverWater', 6],
} as const satisfies Palette;

export const HILL_PALETTE = {
  P: ['plaster', 14], Y: ['plaster', 7], K: ['plaster', 10], G: ['plaster', 13], R: ['favelaTile', 2], S: ['paradeStreet', 10], V: ['vine', 5], L: ['woodLadder', 9],
} as const satisfies Palette;

export const STEAK_PALETTE = {
  F: ['restTile', 2], B: ['restBrick', 2], M: ['pierPlanks', 9], R: ['barrel', 9], L: ['woodLadder', 9],
} as const satisfies Palette;

export const DRUM_PALETTE = {
  S: ['paradeStreet', 10], R: ['riser', 14], V: ['vine', 5], Q: ['quayStone', 12],
} as const satisfies Palette;

export const FLOAT_PALETTE = {
  S: ['paradeStreet', 10], R: ['riser', 14], W: ['bayWater', 6], D: ['floatDeck', 7], Q: ['quayStone', 12],
} as const satisfies Palette;

export const BEACH_PALETTE = {
  W: ['wavePavement', 1], S: ['sand', 7], E: ['seaSwell', 14], T: ['tableTop', 1], L: ['palmLeft', 5], K: ['palmKnot', 5], R: ['palmRight', 5], U: ['palmTrunk', 9],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * Sugarloaf's cable car: two cars on the cable from the lower shelf's foot (cols 12-13, floor 14) to the upper platform's (cols 24-25, floor 8), 160 frames across (a slow lift: 96 pixels over and 48 up). The roof of the car
 * is behind him (VIC sprite 6) and its floor and rail in front (sprite 2), the passing car on sprites 1 and 0. The room has two creatures (sprites 4 and 5), no item.
 */
export const CABLE_CAR: CableCarSpec = {
  room: RIO_ROOM.sugar, low: { col: 12, row: 14 }, high: { col: 24, row: 8 }, frames: 160,
  roof: { ptr: CAR_POINTERS.roof, sprite: 6 }, floor: { ptr: CAR_POINTERS.floor, sprite: 2 }, passing: { roof: 1, floor: 0 }, colour: 1,
  dx: -4, roofDy: -17, floorDy: 4, bypass: { dy: 56, ramp: 0.3 },
};
/** The gate on the shelf (cols 10-11, rows 8-13) that the key to the city takes away. */
export const GATE_CELLS: readonly (readonly [row: number, col: number])[] = [8, 9, 10, 11, 12, 13].flatMap((row) => [10, 11].map((col) => [row, col] as const));
/** The sign CLOSED over the station hut (a board of the word between a space each side: cols 2-9, row 10): it comes down with the gate. */
export const CLOSED_SIGN = { text: 'CLOSED', col: 2, row: 10 } as const;
export const CLOSED_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: CLOSED_SIGN.text.length + 2 }, (_, k) => [CLOSED_SIGN.row, CLOSED_SIGN.col + k] as const);

/**
 * The carnival's floats on the avenue (Q): the floor of the channel is deep water from col 4 to col 26; lane A (deck row 18, the street's height) carries three floats left to right, a cell every 8 frames (he is carried a cell at a time),
 * 30 cells to their round and 10 apart; lane B (deck row 14) two the other way. The decorations are the painted pieces (the room lists each once, at its `home`, for its characters).
 */
const float = (decor: 'floatGalleon' | 'floatBird' | 'floatSun', row: number, dir: 1 | -1, offset: number, home: readonly [number, number]): FloatSpec => ({
  room: RIO_ROOM.float, row, span: { from: 6, to: 24 }, dir, step: 8, every: 30, w: RIO_DECOR[decor].w, h: RIO_DECOR[decor].h, offset, deck: codeOf(FLOAT_PALETTE, 'D'), decor: decorIndex(decor), home,
});
export const FLOATS: readonly FloatSpec[] = [
  float('floatGalleon', 18, 1, 0, [3, 5]), float('floatSun', 18, 1, 10, [11, 5]), float('floatGalleon', 18, 1, 20, [3, 5]),
  float('floatBird', 14, -1, 0, [18, 5]), float('floatGalleon', 14, -1, 15, [3, 5]),
];

/**
 * The gauchos' skewers (W): a skewer swings every 96 frames through four poses a 24 frames each (down, forward and low, straight out, up): the middle two deadly. The east gaucho (slot 0) and the west one (slot 1) are half a
 * cycle apart, and each has a sprite of his own (2 and 1: the room's item takes 0, its third creature 6).
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

// ---- the rooms ----------------------------------------------------------------------------------------------

export const RIO_ROOMS: readonly RoomSpec[] = [
  // H QUAY TO THE CITY: in off the riverboat's gangway at the left (floor 8, rows 6-7), down the wharf's steps (floors 10, 12, 14, 16: two rows each, so he climbs them back to the gangway) to the quay (floor 18), which runs east out low into Lapa. A pier (floor 14) on crates holds a skewer; the bay behind.
  room({
    id: RIO_ROOM.quay, cell: [7, 33], sector: 67, palette: QUAY_PALETTE,
    paint(g) {
      g.box(6, 8, 31, 10, 'S'); // the bay behind (the wharf's steps are drawn over it)
      g.box(0, 0, 1, 5, 'Q').box(0, 8, 5, 19, 'Q').box(6, 10, 7, 19, 'Q').box(8, 12, 9, 19, 'Q').box(10, 14, 11, 19, 'Q').box(12, 16, 13, 19, 'Q').box(14, 18, 31, 19, 'Q');
      g.box(30, 0, 31, 15, 'Q');
      g.box(16, 14, 28, 14, 'P').clear(19, 14, 21, 14).box(20, 14, 20, 17, 'L'); // the pier, and the ladder up to it
    },
    coins: [[3, 6], [7, 8], [11, 12], [24, 12], [28, 16]],
    item: { name: 'skewer1', col: 25, row: 12, sprite: RIO_SPRITE.skewer },
    decor: [[{ text: 'BEM-VINDO', colour: 7 }, 10, 3], ['fishingBoat', 18, 6], ['lampPost', 13, 13], ['lampPost', 29, 15], ['coconutStand', 22, 15]],
    creatures: [{ who: 'capoeirista', col: 24, row: 16, way: 'right', speed: 1, range: 16 }, { who: 'football', col: 15, row: 12, way: 'up', speed: 1, range: 10 }],
  }),

  // L THE LAPA ARCHES: the aqueduct's two storeys of arches across the room. In at the left on the street (floor 18, under the arches), which runs east to the wall; a ladder (col 3) goes up through the tram track (floor 7) which runs the room
  // with the yellow tram on it; a second ladder (col 19) climbs from the track to a ledge (floor 4) with the key to the city; a rope (col 26) climbs from the street through the track to Sugarloaf above.
  room({
    id: RIO_ROOM.lap, cell: [7, 34], sector: 68, palette: LAPA_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 15, 'S').box(30, 0, 31, 19, 'S').box(0, 18, 31, 19, 'W');
      g.box(2, 7, 29, 7, 'T').clear(2, 7, 4, 7).box(3, 7, 3, 17, 'L').clear(25, 7, 27, 7).box(26, 0, 26, 17, 'V').clear(18, 7, 20, 7).box(19, 4, 19, 7, 'L');
      g.box(11, 4, 17, 4, 'T').box(21, 4, 24, 4, 'T');
    },
    coins: [[7, 5], [14, 5], [23, 5], [8, 16], [14, 16], [22, 16]],
    item: { name: 'cityKey', col: 13, row: 2, sprite: RIO_SPRITE.key },
    decor: [['lapaArches', 4, 8], ['lapaArches', 8, 8], ['lapaArches', 12, 8], ['lapaArches', 16, 8], ['lapaArches', 20, 8],
      ['lapaArches', 4, 12], ['lapaArches', 8, 12], ['lapaArches', 12, 12], ['lapaArches', 16, 12], ['lapaArches', 20, 12]],
    creatures: [{ who: 'bonde', col: 5, row: 5, way: 'right', speed: 1, range: 90 }],
  }),

  // S SUGAR RUSH: Sugarloaf's base. In at the left on the beach (floor 18); a ladder (col 7) up to the cable's lower shelf (floor 14, cols 9-13) whose gate (cols 10-11) is shut until the key to the city; the cars on the cable climb to the upper
  // platform (floor 8, cols 24-31) at the right, which runs out east into the summit. The rope (col 26) from Lapa comes up through the beach's gap under the platform.
  room({
    id: RIO_ROOM.sugar, cell: [6, 34], sector: 69, palette: SUGAR_PALETTE,
    paint(g) {
      g.box(0, 18, 31, 19, 'N').clear(25, 18, 27, 19).box(26, 18, 26, 19, 'V');
      g.box(0, 0, 1, 15, 'G').box(6, 14, 13, 15, 'F').clear(6, 14, 8, 15).box(7, 14, 7, 17, 'L').box(14, 11, 14, 15, 'G');
      g.box(10, 8, 11, 13, 'G');
      g.box(24, 8, 31, 8, 'F').box(28, 9, 31, 19, 'G').box(30, 0, 31, 5, 'G');
      // the cable up to the platform, and below it (the car passing his hangs from it: the bypass, 7 rows down) the passing car's own, over the middle
      for (let c = 12; c <= 29; c++) g.box(c, 10 - Math.floor((c - 13) / 2), c, 10 - Math.floor((c - 13) / 2), (c - 13) % 2 === 0 ? 'C' : 'D');
      for (let c = 16; c <= 23; c++) g.box(c, 17 - Math.floor((c - 13) / 2), c, 17 - Math.floor((c - 13) / 2), (c - 13) % 2 === 0 ? 'C' : 'D');
    },
    coins: [[6, 16], [16, 16], [9, 12], [18, 10], [28, 6]],
    decor: [['sugarloaf', 15, 1], ['sugarloaf', 21, 0], ['cableStation', 2, 15], ['pylon', 19, 8], ['pylon', 19, 12], [{ text: CLOSED_SIGN.text, colour: 2 }, CLOSED_SIGN.col, CLOSED_SIGN.row]],
    creatures: [{ who: 'crab', col: 3, row: 16, way: 'right', speed: 1, range: 16 }, { who: 'vulture', col: 14, row: 2, way: 'right', speed: 2, range: 50 }],
  }),

  // U LOAFING ABOUT: the summit. In at the left from the cable's platform (floor 8), over granite domes (floor 6) and a stretch of rock with a cleft (a rope, col 20, to a hollow with a skewer), out east (floor 8) on the saddle to Corcovado.
  room({
    id: RIO_ROOM.loaf, cell: [6, 35], sector: 70, palette: SUMMIT_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 5, 'G').box(0, 8, 5, 10, 'G').box(6, 6, 12, 10, 'G').box(13, 8, 31, 10, 'G').box(30, 0, 31, 5, 'G');
      g.box(0, 11, 1, 19, 'G').box(30, 11, 31, 19, 'G').box(2, 18, 29, 19, 'G'); // the cliffs, and the chasm's floor far below
      g.clear(19, 8, 21, 10).box(20, 8, 20, 17, 'V');
    },
    coins: [[1, 6], [9, 4], [24, 6], [28, 6], [17, 16]],
    item: { name: 'skewer2', col: 22, row: 16, sprite: RIO_SPRITE.skewer },
    decor: [['christ', 14, 0], ['cableStation', 2, 5], ['house', 3, 15], ['house', 6, 15], ['house', 9, 15], ['house', 12, 15], ['house', 25, 15], ['sugarloaf', 3, 12], ['sugarloaf', 24, 12]],
    creatures: [{ who: 'marmoset', col: 7, row: 4, way: 'right', speed: 1, range: 32 }, { who: 'marmoset', col: 23, row: 6, way: 'left', speed: 1, range: 24 }],
  }),

  // C OPEN ARMS: Corcovado. In at the left (floor 8, rows 6-7), a rope (col 5) down the hillside through a gap, the terrace's steps down (floors 10, 12, 14) to the viewing platform at the foot of the Redeemer, and up again (floors 12, 10, 8) to the way out east.
  room({
    id: RIO_ROOM.arms, cell: [6, 36], sector: 71, palette: ARMS_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 5, 'G').box(30, 0, 31, 5, 'G');
      g.box(0, 8, 3, 19, 'G').box(7, 8, 8, 19, 'G').box(9, 10, 10, 19, 'G').box(11, 12, 11, 19, 'G').box(12, 14, 19, 19, 'P').box(20, 12, 20, 19, 'G').box(21, 10, 22, 19, 'G').box(23, 8, 31, 19, 'G');
      g.box(5, 8, 5, 19, 'V');
    },
    coins: [[2, 6], [6, 6], [10, 8], [21, 8], [26, 6], [29, 6]],
    item: { name: 'skewer5', col: 27, row: 6, sprite: RIO_SPRITE.skewer },
    decor: [['christ', 12, 7], ['stands', 24, 3], [{ text: 'CORCOVADO', colour: 7 }, 10, 3]],
    creatures: [{ who: 'vulture', col: 4, row: 1, way: 'right', speed: 2, range: 60 }],
  }),

  // T MONKEY BUSINESS: the Tijuca forest. In at the left on the upper bough (floor 8), which runs east to a gap with a rope (col 22) that hangs through to the carnival below; a rope (col 15) from the ground climbs to the bough, past a middle bough (floor 14) with
  // a skewer; a stream pool on the ground (floor 18). The bough ends east in a dead end with a coin.
  room({
    id: RIO_ROOM.monkey, cell: [6, 37], sector: 72, palette: FOREST_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 5, 'J').box(30, 0, 31, 19, 'J').box(0, 9, 1, 17, 'J').box(0, 18, 31, 19, 'M');
      g.box(0, 8, 13, 8, 'G').box(17, 8, 20, 8, 'G').box(24, 8, 29, 8, 'G').box(5, 14, 14, 14, 'G');
      g.box(8, 18, 12, 19, 'W').clear(21, 18, 23, 19).box(22, 8, 22, 19, 'V').box(15, 8, 15, 17, 'V');
    },
    coins: [[4, 6], [9, 6], [18, 6], [24, 6], [11, 12], [10, 14], [26, 16]],
    item: { name: 'skewer3', col: 7, row: 12, sprite: RIO_SPRITE.skewer },
    decor: [['giantTree', 26, 2], ['fern', 2, 15], ['bromeliad', 19, 7], ['hangingVines', 5, 2], ['hangingVines', 19, 2]],
    creatures: [{ who: 'marmoset', col: 3, row: 6, way: 'right', speed: 1, range: 32 }, { who: 'macaw', col: 18, row: 2, way: 'right', speed: 1, range: 50 }],
  }),

  // F HOUSE OF COLOUR: the hillside. Corcovado's rope (col 5) comes down to the roofs at the left (floor 8) which step across (floor 9) with gaps to the church tower; below, the lane (floor 18) runs under the houses east out low to the parade.
  room({
    id: RIO_ROOM.colour, cell: [7, 36], sector: 73, palette: HILL_PALETTE,
    paint(g) {
      g.box(0, 18, 31, 19, 'S').box(0, 0, 1, 17, 'G').box(30, 0, 31, 15, 'K');
      g.box(2, 8, 10, 8, 'R').box(2, 9, 10, 13, 'P').box(14, 9, 21, 9, 'R').box(14, 10, 21, 13, 'Y').box(25, 8, 29, 8, 'R').box(25, 9, 29, 13, 'K');
      g.box(5, 0, 5, 7, 'V').box(12, 8, 12, 17, 'L'); // the rope down from Corcovado, and a ladder from the lane up to the roofs
    },
    coins: [[4, 6], [18, 7], [29, 6], [8, 16], [16, 16], [24, 16], [13, 12]],
    item: { name: 'skewer6', col: 15, row: 7, sprite: RIO_SPRITE.skewer },
    decor: [['house', 8, 5], ['house', 19, 6], ['church', 26, 4], ['dish', 4, 7], ['washing', 3, 14], ['washing', 22, 14]],
    creatures: [{ who: 'capoeirista', col: 9, row: 16, way: 'right', speed: 1, range: 36 }, { who: 'macaw', col: 12, row: 3, way: 'right', speed: 1, range: 50 }],
  }),

  // W STEAK YOUR CLAIM: the churrascaria, a dead end. In from Sugarloaf's beach at the right (floor 18); two gauchos pace the dining floor, each with a skewer that swings; the stairs of crates (floors 16, 14, 12) climb at the middle to the
  // mezzanine's stage (floor 10) where the headdress hangs on a curtain; .
  room({
    id: RIO_ROOM.steak, cell: [6, 33], sector: 74, palette: STEAK_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 3, 'B').box(0, 4, 1, 17, 'B').box(30, 4, 31, 15, 'B').box(0, 18, 31, 19, 'F');
      g.box(5, 10, 15, 10, 'M').box(3, 10, 3, 17, 'L').box(16, 12, 17, 17, 'R').box(18, 14, 19, 17, 'R').box(20, 16, 21, 17, 'R');
    },
    coins: [[5, 8], [9, 8], [11, 8], [17, 10], [5, 16], [13, 16], [28, 16]],
    item: { name: 'headdress', col: 6, row: 8, sprite: RIO_SPRITE.headdress },
    decor: [['saladBar', 6, 16], ['restTable', 10, 16], ['restTable', 22, 16], ['rotisserie', 25, 15], ['lampRed', 8, 4], ['lampRed', 16, 4], ['lampRed', 24, 4], ['curtain', 2, 7], ['curtain', 13, 7]],
    creatures: [{ who: 'gaucho', col: 26, row: 16, way: 'left', speed: 1, range: 24 }, { who: 'gaucho', col: 4, row: 16, way: 'right', speed: 1, range: 80 }, { who: 'dancer', col: 13, row: 8, way: 'left', speed: 1, range: 8 }],
  }),

  // P BEAT THE DRUM: the carnival's first room. In from the hillside at the left (floor 18); the stepped risers of the bateria (floors 16, 14, 16) up and down the middle with drummers; Tijuca's rope (col 22) comes down to the street; the steward at the right in a low
  // lane (rows 16-17 only) lets him by only in the headdress.
  room({
    id: RIO_ROOM.drum, cell: [7, 37], sector: 75, palette: DRUM_PALETTE,
    paint(g) {
      g.box(0, 18, 31, 19, 'S').box(0, 0, 1, 15, 'Q').box(30, 0, 31, 15, 'Q').box(24, 14, 29, 15, 'Q'); // (the low lane at the right has a roof of rows 14-15; above it the stands)
      g.box(6, 16, 10, 17, 'R').box(11, 14, 16, 17, 'R').box(17, 16, 21, 17, 'R');
      g.box(22, 0, 22, 17, 'V');
    },
    coins: [[8, 14], [12, 12], [15, 12], [19, 14], [23, 16]],
    decor: [[{ text: 'SAMBA', colour: 7 }, 9, 5], ['bunting', 3, 2], ['bunting', 8, 2], ['bunting', 13, 2], ['bunting', 18, 2], ['stands', 2, 10], ['stands', 2, 12], ['stands', 24, 8], ['stands', 24, 10], ['stands', 24, 12], ['surdo', 6, 14], ['surdo', 20, 14], ['lampPost', 2, 15]],
    creatures: [{ who: 'steward', col: 26, row: 16, way: 'left', speed: 1, range: 8 }, { who: 'drummer', col: 13, row: 12, way: 'right', speed: 1, range: 4 }, { who: 'dancer', col: 17, row: 14, way: 'left', speed: 1, range: 8 }],
  }),

  // Q FLOAT YOUR BOAT: the avenue. In at the left on the street (floor 18); the channel (deep water, cols 6-24) is crossed on the floats that come along it: lane A (the street's height) three of them left to right, lane B (floor 14) two the other
  // way; the stage at the right (floor 18) with a skewer leads east out low to the beach.
  room({
    id: RIO_ROOM.float, cell: [7, 38], sector: 76, palette: FLOAT_PALETTE,
    paint(g) {
      g.box(0, 18, 5, 19, 'S').box(6, 18, 24, 19, 'W').box(25, 18, 31, 19, 'R').box(25, 16, 26, 17, 'R').box(0, 0, 31, 1, 'Q').box(0, 2, 1, 15, 'Q').box(30, 2, 31, 15, 'Q');
    },
    coins: [[8, 16], [14, 16], [20, 16], [10, 12], [18, 12], [28, 16]],
    item: { name: 'skewer4', col: 29, row: 16, sprite: RIO_SPRITE.skewer },
    decor: [['stands', 2, 2], ['stands', 6, 2], ['stands', 10, 2], ['stands', 14, 2], ['stands', 18, 2], ['stands', 22, 2], ['stands', 26, 2], [{ text: 'CARNAVAL', colour: 7 }, 10, 9],
      ['floatGalleon', 3, 5], ['floatSun', 11, 5], ['floatBird', 18, 5]],
  }),

  // B RIO OR BUST: the beach. In at the left on the promenade's wave pavement (floor 18); Sugarloaf across the bay at the left, Christ the Redeemer over Corcovado at the right, the sun low over the sea, and the acai bowl on its table
  // at the right end. Touching it is the end.
  room({
    id: RIO_ROOM.bust, cell: [7, 39], sector: 77, palette: BEACH_PALETTE,
    paint(g) {
      g.box(0, 18, 31, 18, 'W').box(0, 19, 31, 19, 'S').box(0, 0, 1, 15, 'S').box(30, 0, 31, 17, 'S').box(2, 10, 29, 13, 'E').box(26, 17, 28, 17, 'T');
      for (const c of [8, 15, 23]) g.box(c - 1, 15, c - 1, 15, 'L').box(c, 15, c, 15, 'K').box(c + 1, 15, c + 1, 15, 'R').box(c, 16, c, 17, 'U'); // the palms
    },
    coins: [[5, 16], [11, 16], [20, 16]],
    item: { name: 'bowl', col: 26, row: 15, sprite: RIO_SPRITE.bowl },
    decor: [['christ', 19, 2], ['sugarloaf', 5, 7], [{ text: 'INTERMOLE: EUROPE ONLY', colour: 2 }, 2, 14]],
  }),
];
