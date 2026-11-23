import type { CableCarSpec, CharAnim, FloatSpec, SkewerSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { FLOAT_DANCERS, GRILL_ANIM, RIO_DECOR } from './art/rio-decor';
import { SKEWER_POSES } from './art/rio-items';
import { WORLD_DECOR, type WorldDecor } from './art/world';
import { codeOf, decorIndex, fillCells, Grid, room, type Palette } from './layout';
import { CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from './rio-pointers';

/**
 * Rio, the seventh and last region of Do Svidaniya Monty (docs/dosvidaniya-rio.md): eleven rooms in a block of seven columns and two rows at columns 33-39 of the exit grid (rows 6-7), entered from the Amazon's last bank (the
 * Andes' column 32) and ending on the beach, where the game ends.
 *
 *            col 33              34               35               36               37              38               39
 *   row 6   W STEAK YOUR CLAIM  S SUGAR RUSH     U SUGARLOAF SUMMIT  C OPEN ARMS   T MONKEY BUSINESS
 *   row 7   H QUAY TO THE CITY  L THE LAPA ARCHES                  F HOUSE OF COLOUR P BEAT THE DRUM  Q FLOAT YOUR BOAT  B RIO OR BUST
 *
 * (The letters are the design's.) Playfield cells as in moscow.ts. Rio is outdoors: open sky to the top of every room (blue bands, clouds, the sun), hills, sea and sand behind, edges that run off the screen or close with the place's own things
 * (a house, the hill, a gate's lintel); walls only in the churrascaria (a building). A way out at a side is open on rows 16-17 (floor 18) or 6-7 (floor 8) and meets the next room's; where two rooms join, both sides are open at the same
 * rows. Floors ("F"): the quay and every low way 18; the gangway 8 and its steps 11, 14; the pier 14; Lapa's tram track 7 and the shelters' roofs 4; the cable's lower shelf 14 and upper platform 8; the summit's 8 and its dome 6; Corcovado's
 * shoulders 8, its valley 14 and its summit 6; the forest's boughs 8 and 14; the hillside's roofs 8, 9; the parade's risers 15, 12, 9; the restaurant's mezzanine 10 and stairs 12, 15; the avenue's floats 18 and 14; the beach 18. The cable
 * car (S), the floats (Q) and the gauchos' skewers (W) are data of the engine (cablecars.ts, floats.ts, skewers.ts); the ropes join L to S, C to F and T to P.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from the Andes' (55-66): they never change once the region has shipped. */
export const RIO_ROOM = { quay: 67, lap: 68, sugar: 69, loaf: 70, arms: 71, monkey: 72, colour: 73, steak: 74, drum: 75, float: 76, bust: 77 } as const;

const NAMES = [
  'QUAY TO THE CITY', 'THE LAPA ARCHES', 'SUGAR RUSH', 'SUGARLOAF SUMMIT', 'OPEN ARMS', 'MONKEY BUSINESS', 'HOUSE OF COLOUR', 'STEAK YOUR CLAIM', 'BEAT THE DRUM', 'FLOAT YOUR BOAT', 'RIO OR BUST',
] as const;
export const RIO_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the quay's warm stone, Lapa's white, the granite blues, the summit's, the Redeemer's greens, the forest greens, the favela's lights, the restaurant's reds, the carnival's yellows, the beach's sand). */
export const RIO_COLOURS: readonly number[] = [8, 1, 15, 13, 5, 5, 14, 2, 10, 7, 7];

// ---- the palettes --------------------------------------------------------------------------------------
export const QUAY_PALETTE = {
  Q: ['quayStone', 8], P: ['pierPlanks', 9], W: ['wavePavement', 1], L: ['woodLadder', 9], F: ['facade', 7], B: ['facade', 1],
} as const satisfies Palette;

export const LAPA_PALETTE = {
  W: ['wavePavement', 1], T: ['aqueductTop', 1], L: ['woodLadder', 9], V: ['vine', 5], F: ['facade', 10], K: ['hillBack', 5],
} as const satisfies Palette;

export const SUGAR_PALETTE = {
  N: ['sand', 7], G: ['granite', 15], L: ['woodLadder', 9], V: ['vine', 5], B: ['graniteBack', 15], T: ['stationGate', 2], E: ['seaSwell', 14], R: ['facade', 2],
} as const satisfies Palette;

export const SUMMIT_PALETTE = {
  G: ['granite', 15], M: ['mossGround', 13], B: ['graniteBack', 9], V: ['vine', 5],
} as const satisfies Palette;

export const ARMS_PALETTE = {
  K: ['hillBack', 5], M: ['mossGround', 13], T: ['trail', 9], L: ['woodLadder', 9], V: ['vine', 5],
} as const satisfies Palette;

export const FOREST_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mossGround', 13], G: ['rockLedge', 9], V: ['vine', 5], W: ['riverWater', 6], K: ['hillBack', 5],
} as const satisfies Palette;

export const HILL_PALETTE = {
  R: ['favelaTile', 2], S: ['paradeStreet', 10], V: ['vine', 5], L: ['woodLadder', 9], K: ['hillBack', 5],
} as const satisfies Palette;

export const STEAK_PALETTE = {
  F: ['restTile', 2], B: ['restBrick', 2], M: ['pierPlanks', 9], R: ['barrel', 9], L: ['woodLadder', 9],
} as const satisfies Palette;

export const DRUM_PALETTE = {
  S: ['paradeStreet', 10], R: ['riser', 14], T: ['riser', 10], V: ['vine', 5],
} as const satisfies Palette;

export const FLOAT_PALETTE = {
  S: ['paradeStreet', 10], R: ['riser', 14], W: ['bayWater', 6], D: ['floatDeck', 7], T: ['riser', 10],
} as const satisfies Palette;

export const BEACH_PALETTE = {
  W: ['wavePavement', 1], S: ['sand', 7], B: ['sandBack', 7], T: ['tableTop', 1], L: ['palmLeft', 5], K: ['palmKnot', 5], R: ['palmRight', 5], U: ['palmTrunk', 9],
} as const satisfies Palette;

// ---- scenery helpers -----------------------------------------------------------------------------------

type Cell = readonly [col: number, row: number];
type Piece = WorldDecor | { text: string; colour: number };
type Placed = readonly [Piece, col: number, row: number];

/** The cells a backdrop leaves alone: an item's two by two (a coin's cell has the backdrop: the engine draws the coin over it). */
const itemCells = (item?: Cell, ...more: readonly Cell[]): Cell[] => keepOf([], item, ...more);

/** The cells the other pieces leave alone: the coins' and an item's (the item's two by two). */
const keepOf = (coins: readonly Cell[], item?: Cell, ...more: readonly Cell[]): Cell[] => [
  ...coins, ...(item ? ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([dx, dy]): Cell => [item[0] + dx, item[1] + dy]) : []), ...more,
];

/** The blue sky over the empty cells of rows `from` to `to`: flecks at the zenith, dashes lower, lines at the horizon. */
function sky(paint: (g: Grid) => void, keep: readonly Cell[], from: number, to: number): Placed[] {
  const third = Math.max(1, Math.floor((to - from + 1) / 3));
  return [
    ...fillCells(paint, keep, [0, from, 31, from + third - 1], 'rioSkyHi'),
    ...fillCells(paint, keep, [0, from + third, 31, from + 2 * third - 1], 'rioSkyMid'),
    ...fillCells(paint, keep, [0, from + 2 * third, 31, to], 'rioSkyLow'),
  ];
}

/** The sea (short waves) over the empty cells of rows `from` to `to`. */
const sea = (paint: (g: Grid) => void, keep: readonly Cell[], from: number, to: number): Placed[] => fillCells(paint, keep, [0, from, 31, to], 'pacSeaWave');

/** A filled ellipse of cells (centre `cx`, `cy` in cells, radii in cells) of a palette letter. */
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, letter: string) {
  for (let r = 0; r < 20; r++) {
    const dy = (r + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const hw = rx * Math.sqrt(1 - dy * dy);
    g.box(Math.round(cx - hw), r, Math.round(cx + hw) - 1, r, letter);
  }
}

/** Pieces that fit: each over empty cells (or cells of the backdrop letters `over`) that no coin or item uses (the rest are dropped), so a row of houses leaves its gaps where the way goes. */
function fitting(paint: (g: Grid) => void, keep: readonly Cell[], list: readonly Placed[], over = ''): Placed[] {
  const g = new Grid();
  paint(g);
  const used = new Set(keep.map(([c, r]) => `${c},${r}`));
  const claimed = new Set<string>();
  return list.filter(([piece, col, row]) => {
    if (typeof piece !== 'string') return true;
    const { w, h } = WORLD_DECOR[piece];
    const cells = Array.from({ length: w * h }, (_, i) => `${col + (i % w)},${row + Math.floor(i / w)}`);
    if (cells.some((k) => used.has(k) || claimed.has(k))) return false;
    for (let i = 0; i < w * h; i++) { const there = g.at(col + (i % w), row + Math.floor(i / w)); if (there !== '.' && !over.includes(there)) return false; }
    for (const k of cells) claimed.add(k);
    return true;
  });
}

/** A row of `piece` cells side by side, `count` of them `step` apart from (col, row). */
const run = (piece: WorldDecor, col: number, row: number, count: number, step: number): Placed[] => Array.from({ length: count }, (_, i): Placed => [piece, col + i * step, row]);

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * Sugarloaf's cable car: one car on the cable from the lower shelf's foot (cols 12-13, floor 14) to the upper platform's (cols 24-25, floor 8), 160 frames across (a slow lift: 96 pixels over and 48 up). The car rests at the station
 * he last rode to, or where he came in. The roof of the car is behind him (VIC sprite 6) and its floor and rail in front (sprite 2). The room has two creatures (sprites 4 and 5), no item.
 */
export const CABLE_CAR: CableCarSpec = {
  room: RIO_ROOM.sugar, low: { col: 12, row: 14 }, high: { col: 24, row: 8 }, frames: 160,
  roof: { ptr: CAR_POINTERS.roof, sprite: 6 }, floor: { ptr: CAR_POINTERS.floor, sprite: 2 }, colour: 1,
  dx: -4, roofDy: -17, floorDy: 4,
};
/** The gate on the shelf (cols 10-11, rows 8-13) that the key to the city takes away; behind it the bay's sea (rows 10-13) shows again. */
export const GATE_CELLS: readonly (readonly [row: number, col: number])[] = [8, 9, 10, 11, 12, 13].flatMap((row) => [10, 11].map((col) => [row, col] as const));
export const GATE_SEA_CELLS: readonly (readonly [row: number, col: number])[] = GATE_CELLS.filter(([row]) => row >= 10);
/** The sign CLOSED over the station hut (a board of the word between a space each side: cols 2-9, row 10): it comes down with the gate. */
export const CLOSED_SIGN = { text: 'CLOSED', col: 2, row: 10 } as const;
export const CLOSED_CELLS: readonly (readonly [row: number, col: number])[] = Array.from({ length: CLOSED_SIGN.text.length + 2 }, (_, k) => [CLOSED_SIGN.row, CLOSED_SIGN.col + k] as const);

/**
 * The carnival's floats on the avenue (Q): the floor of the channel is deep water from col 6 to col 24; lane A (deck row 18, the street's height) carries three floats left to right, a cell every 8 frames (he is carried a cell at a time),
 * 30 cells to their round and 10 apart; lane B (deck row 14) two the other way. The decorations are the painted pieces (the room lists each once, at its `home`, for its characters); a dancer dances on each.
 */
/** Where the room lists each float's picture (the top left corner of the sky: the engine clears it as the floats begin to run). */
const HOME = { galleon: [0, 0], sun: [6, 0], bird: [12, 0] } as const;
const float = (decor: 'floatGalleon' | 'floatBird' | 'floatSun', row: number, dir: 1 | -1, offset: number, home: readonly [number, number]): FloatSpec => ({
  room: RIO_ROOM.float, row, span: { from: 6, to: 24 }, dir, step: 8, every: 30, w: RIO_DECOR[decor].w, h: RIO_DECOR[decor].h, offset, deck: codeOf(FLOAT_PALETTE, 'D'), decor: decorIndex(decor), home,
});
export const FLOATS: readonly FloatSpec[] = [
  float('floatGalleon', 18, 1, 0, HOME.galleon), float('floatSun', 18, 1, 10, HOME.sun), float('floatBird', 18, 1, 20, HOME.bird),
  float('floatBird', 14, -1, 0, HOME.bird), float('floatGalleon', 14, -1, 15, HOME.galleon),
];

/** What moves in the rooms by changing pictures: the carnival's dancers (each float's four dancer characters swap between arms up and arms out every ten frames) and the churrascaria's grill (the meat turns, the flames flicker). */
export const RIO_ANIMS: readonly CharAnim[] = [
  ...FLOAT_DANCERS.map((d): CharAnim => ({ kind: 'cycle', room: RIO_ROOM.float, chars: d.cells.map((cell) => ({ decor: decorIndex(d.decor), cell })), frames: d.frames, every: 5 })),
  { kind: 'cycle', room: RIO_ROOM.steak, chars: GRILL_ANIM.cells.map((cell) => ({ decor: decorIndex('rioGrill'), cell })), frames: GRILL_ANIM.frames, every: 12 },
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

// ---- H QUAY TO THE CITY ---------------------------------------------------------------------------------
const QUAY_COINS: readonly Cell[] = [[3, 6], [7, 8], [11, 12], [24, 12], [28, 16]];
const QUAY_ITEM: Cell = [25, 12];
const paintQuay = (g: Grid): void => {
  g.box(0, 0, 2, 5, 'B'); // the riverboat's white cabin at the left edge, over its gangway
  g.box(0, 8, 5, 19, 'Q').box(6, 10, 7, 19, 'Q').box(8, 12, 9, 19, 'Q').box(10, 14, 11, 19, 'Q').box(12, 16, 13, 19, 'Q'); // the wharf's steps
  g.box(14, 18, 31, 18, 'W').box(14, 19, 31, 19, 'Q'); // the quay
  g.box(27, 0, 31, 15, 'F'); // a warehouse in the colour of the city, running off the top
  g.box(16, 14, 26, 14, 'P').clear(19, 14, 21, 14).box(20, 14, 20, 17, 'L'); // the pier, and the ladder up to it
};

// ---- L THE LAPA ARCHES ----------------------------------------------------------------------------------
const LAPA_COINS: readonly Cell[] = [[7, 5], [14, 5], [23, 5], [4, 16], [25, 16], [27, 16]];
const LAPA_ITEM: Cell = [13, 2];
const paintLapa = (g: Grid): void => {
  ellipse(g, 32, 21, 8, 11, 'K'); // the hill beyond the aqueduct's end
  g.box(0, 0, 1, 15, 'F'); // a townhouse at the left edge, running off the top
  g.box(0, 18, 31, 19, 'W'); // the street
  g.box(5, 7, 24, 7, 'T').clear(18, 7, 20, 7).box(3, 7, 3, 17, 'L').box(26, 0, 26, 17, 'V').box(19, 4, 19, 7, 'L'); // the tram's track, the ladders and the rope
  g.box(11, 4, 17, 4, 'T').box(21, 4, 24, 4, 'T'); // the roofs of two tram shelters on the track
};

// ---- S SUGAR RUSH ---------------------------------------------------------------------------------------
const SUGAR_COINS: readonly Cell[] = [[6, 16], [16, 16], [9, 12], [18, 10], [30, 6]];
const paintSugar = (g: Grid): void => {
  g.box(0, 10, 31, 17, 'E'); // the bay behind
  g.box(19, 16, 27, 17, 'B'); // the foot of Sugarloaf (its rounded rock above is a picture)
  g.box(0, 0, 1, 15, 'R'); // the churrascaria's wall at the left edge (its door is the beach's way in)
  g.box(0, 18, 31, 19, 'N').clear(25, 18, 27, 19).box(26, 18, 26, 19, 'V'); // the beach and the gap the rope comes up through
  g.box(6, 14, 15, 15, 'G').clear(6, 14, 8, 15).box(7, 14, 7, 17, 'L'); // the lower station's shelf and the ladder up to it
  g.box(10, 8, 11, 13, 'T'); // the station's gate
  g.box(24, 8, 31, 8, 'G').box(28, 9, 31, 17, 'G'); // the summit station's platform and the cliff under it
};
/** The cable: a line of pairs (a row up every two cells) from the lower station's roof to the summit station's. */
const cableLine = (): Placed[] => {
  const cells: Placed[] = [];
  for (let c = 13; c <= 24; c++) cells.push([(c - 13) % 2 === 0 ? 'rioCableLow' : 'rioCableHigh', c, 10 - Math.floor((c - 13) / 2)]);
  return cells;
};

// ---- U SUGARLOAF SUMMIT ---------------------------------------------------------------------------------
const SUMMIT_COINS: readonly Cell[] = [[1, 6], [9, 4], [24, 6], [30, 6], [17, 12]];
const SUMMIT_ITEM: Cell = [22, 12];
const paintSummit = (g: Grid): void => {
  g.box(0, 8, 31, 10, 'G').box(6, 7, 12, 10, 'G').box(6, 6, 12, 6, 'M').box(13, 8, 31, 8, 'M'); // the summit's rock, the dome and the green on top
  g.box(0, 11, 1, 19, 'G').box(30, 11, 31, 19, 'G').box(2, 14, 29, 19, 'G'); // the cave's walls and floor (the rock under it is solid)
  g.clear(19, 8, 21, 10).box(20, 8, 20, 13, 'V'); // the cleft, and the rope down it
};

// ---- C OPEN ARMS ----------------------------------------------------------------------------------------
const ARMS_COINS: readonly Cell[] = [[2, 6], [6, 6], [15, 12], [19, 12], [25, 4], [29, 6]];
const ARMS_ITEM: Cell = [27, 6];
const paintArms = (g: Grid): void => {
  ellipse(g, 20, 21, 17, 15, 'K'); // Corcovado's green peak behind
  g.box(0, 8, 3, 19, 'M').box(27, 8, 31, 19, 'M'); // the shoulders
  g.box(5, 8, 5, 19, 'V'); // the rope down into the favela
  g.box(7, 8, 9, 8, 'T').box(10, 8, 10, 13, 'L'); // the ledge, and the ladder down to the valley
  g.box(7, 14, 26, 14, 'T'); // the valley's trail
  g.box(14, 6, 26, 6, 'T').clear(22, 6, 22, 6).box(22, 6, 22, 13, 'L'); // the summit's trail and the ladder up to it
};

// ---- T MONKEY BUSINESS ----------------------------------------------------------------------------------
const FOREST_COINS: readonly Cell[] = [[4, 6], [9, 6], [18, 6], [24, 6], [11, 12], [10, 14], [26, 16]];
const FOREST_ITEM: Cell = [7, 12];
const paintForest = (g: Grid): void => {
  ellipse(g, 6, 22, 9, 10, 'K'); ellipse(g, 21, 23, 12, 11, 'K'); ellipse(g, 31, 22, 8, 9, 'K'); // the hills of the forest behind the boughs
  g.clear(7, 12, 8, 13); // (the skewer's cells left clear)
  g.box(0, 9, 1, 17, 'J').box(0, 18, 31, 19, 'M');
  g.box(0, 8, 13, 8, 'G').box(17, 8, 20, 8, 'G').box(24, 8, 31, 8, 'G').box(5, 14, 14, 14, 'G');
  g.box(8, 18, 12, 19, 'W').clear(21, 18, 23, 19).box(22, 8, 22, 19, 'V').box(15, 8, 15, 17, 'V');
};

// ---- F HOUSE OF COLOUR ----------------------------------------------------------------------------------
const HILL_COINS: readonly Cell[] = [[4, 6], [18, 7], [29, 6], [8, 16], [16, 16], [24, 16], [13, 12]];
const HILL_ITEM: Cell = [15, 7];
const paintHill = (g: Grid): void => {
  g.box(0, 8, 31, 17, 'K'); // the green hill behind the houses
  g.box(0, 18, 31, 19, 'S');
  g.box(0, 8, 10, 8, 'R').box(15, 9, 22, 9, 'R').box(25, 8, 29, 8, 'R');
  g.box(5, 0, 5, 7, 'V').box(12, 8, 12, 17, 'L');
  g.box(15, 7, 16, 8, '.');
};
/** The houses, a storey a row of three-character fronts under each roof, in turn pink, yellow, blue and green. */
const houses = (): Placed[] => {
  const kinds = ['rioHousePink', 'rioHouseYellow', 'rioHouseBlue', 'rioHouseGreen'] as const;
  const out: Placed[] = [];
  let n = 0;
  for (const [cols, rows] of [[[0, 5], [9, 12, 15]], [[15, 18], [10, 13]], [[25, 28], [9, 12, 15]]] as const) for (const row of rows) for (const col of cols) out.push([kinds[n++ % 4] ?? 'rioHousePink', col, row]);
  return out;
};
/** The washing: lines strung between the poles on the roofs and across every alley between the houses (the ladder is a post too), hung at several heights, in four sets of colours. */
const washing = (): Placed[] => {
  const kinds = ['rioWashA', 'rioWashB', 'rioWashC', 'rioWashD'] as const;
  let n = 0;
  const line = (row: number, cols: readonly number[]): Placed[] => cols.map((col): Placed => [kinds[n++ % 4] ?? 'rioWashA', col, row]);
  return [
    ['rioPole', 10, 5], ['rioPole', 21, 6], ['rioPole', 25, 5],
    ...line(6, [11, 13, 15, 17, 19, 23]),
    ...line(10, [3, 8, 10, 13]), ...line(12, [3, 8, 10]), ...line(14, [3, 8, 10, 13]), ...line(9, [8, 10, 21, 23]), ...line(11, [8, 10, 21, 23]), ...line(13, [8, 10, 21, 23]), ...line(15, [8, 10, 21, 23]),
    ...line(16, [8, 10]),
  ];
};

// ---- W STEAK YOUR CLAIM ---------------------------------------------------------------------------------
const STEAK_COINS: readonly Cell[] = [[5, 8], [9, 8], [11, 8], [17, 10], [4, 16], [15, 16], [23, 16]];
const STEAK_ITEM: Cell = [6, 8];
const paintSteak = (g: Grid): void => {
  g.box(0, 0, 31, 3, 'B').box(0, 4, 1, 17, 'B').box(30, 4, 31, 15, 'B').box(0, 18, 31, 19, 'F');
  g.box(5, 10, 15, 10, 'M').box(3, 10, 3, 17, 'L').box(16, 12, 17, 17, 'R').box(18, 14, 19, 17, 'R').box(20, 16, 21, 17, 'R');
};

// ---- P BEAT THE DRUM ------------------------------------------------------------------------------------
const DRUM_COINS: readonly Cell[] = [[8, 14], [12, 12], [15, 12], [19, 14], [23, 16]];
const paintDrum = (g: Grid): void => {
  g.box(0, 18, 31, 19, 'S').box(24, 14, 31, 15, 'T').box(28, 5, 31, 13, 'T'); // the street, and the gate's lintel and tower over the steward's lane
  g.box(6, 16, 10, 17, 'R').box(11, 14, 16, 17, 'R').box(17, 16, 21, 17, 'R');
  g.box(22, 0, 22, 17, 'V');
};

// ---- Q FLOAT YOUR BOAT ----------------------------------------------------------------------------------
const FLOAT_COINS: readonly Cell[] = [[8, 16], [14, 16], [20, 16], [10, 12], [18, 12], [28, 16]];
const FLOAT_ITEM: Cell = [29, 16];
const paintFloat = (g: Grid): void => {
  g.box(0, 18, 5, 19, 'S').box(6, 18, 24, 19, 'W').box(25, 18, 31, 19, 'R').box(25, 16, 26, 17, 'R').box(0, 14, 5, 15, 'T').box(0, 5, 3, 13, 'T');
};

// ---- B RIO OR BUST --------------------------------------------------------------------------------------
const BEACH_COINS: readonly Cell[] = [[5, 16], [11, 16], [20, 16]];
const BEACH_ITEM: Cell = [26, 15];
/** The palms: their trunks' columns and how many cells tall they stand from the sand (their crowns are the cells above). */
const PALMS: readonly (readonly [col: number, height: number])[] = [[12, 7], [15, 5], [17, 6], [23, 5], [30, 6]];
const paintBeach = (g: Grid): void => {
  g.box(0, 15, 31, 17, 'B'); // the sand behind the walkway
  g.box(26, 15, 27, 16, '.');
  g.box(0, 18, 31, 18, 'W').box(0, 19, 31, 19, 'S').box(26, 17, 28, 17, 'T');
  for (const [c, h] of PALMS) {
    g.box(c, 17 - h + 1, c, 17, 'U');
    g.box(c - 1, 17 - h, c - 1, 17 - h, 'L').box(c, 17 - h, c, 17 - h, 'K').box(c + 1, 17 - h, c + 1, 17 - h, 'R');
  }
};
/** The beach's sky and sea: the horizon is row 11 (the finale's sun sets into it). */
export const BEACH_HORIZON = 11;
/** Where the finale lights the beach's far shore: the Redeemer on Corcovado's green and Sugarloaf (playfield cells). */
export const BEACH_VIEW = { redeemer: { col: 22, row: 5, w: 4, h: 3 }, sugarloaf: { col: 2, row: 6, w: 8, h: 5 } } as const;

// ---- the rooms ----------------------------------------------------------------------------------------------

export const RIO_ROOMS: readonly RoomSpec[] = [
  // H QUAY TO THE CITY: in off the riverboat's gangway at the left (floor 8, rows 6-7), down the wharf's steps (floors 10, 12, 14, 16: two rows each, so he climbs them back to the gangway) to the quay (floor 18), which runs east out low into Lapa. A pier (floor 14) on crates holds a skewer; the bay and Sugarloaf behind.
  room({
    id: RIO_ROOM.quay, cell: [7, 33], sector: 67, palette: QUAY_PALETTE,
    paint: paintQuay,
    coins: QUAY_COINS,
    item: { name: 'skewer1', col: QUAY_ITEM[0], row: QUAY_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintQuay, itemCells(QUAY_ITEM), 0, 9), ...sea(paintQuay, itemCells(QUAY_ITEM), 10, 17),
      ['skyCloud', 6, 1], ['skyCloudBig', 21, 2], ['sugarloaf', 13, 5], [{ text: 'BEM-VINDO', colour: 7 }, 8, 3], ['fishingBoat', 22, 8], ['lampPost', 25, 15], ['coconutStand', 22, 15],
    ],
    creatures: [{ who: 'capoeirista', col: 16, row: 12, way: 'right', speed: 1, range: 12 }, { who: 'football', col: 12, row: 12, way: 'up', speed: 1, range: 10 }],
  }),

  // L THE LAPA ARCHES: the aqueduct's two storeys of arches standing on the street, the tram's track on top. In at the left on the street (floor 18, under the arches); a ladder (col 3) goes up to the track (floor 7) which runs the room with the yellow
  // tram on it; a second ladder (col 19) climbs from the track to the roofs of the tram shelters (floor 4) with the key to the city; a rope (col 26) climbs from the street, past the aqueduct's end, through to Sugarloaf above.
  room({
    id: RIO_ROOM.lap, cell: [7, 34], sector: 68, palette: LAPA_PALETTE,
    paint: paintLapa,
    coins: LAPA_COINS,
    item: { name: 'cityKey', col: LAPA_ITEM[0], row: LAPA_ITEM[1], sprite: RIO_SPRITE.key },
    decor: [
      ...sky(paintLapa, itemCells(LAPA_ITEM), 0, 17),
      ['skyCloud', 8, 1], ['skyCloudBig', 22, 0], ['rioPost', 11, 5], ['rioPost', 17, 5], ['rioPost', 21, 5], ['rioPost', 24, 5],
      ...[5, 9, 13, 17, 21].flatMap((col): Placed[] => [['lapaUpper', col, 8], ['lapaBase', col, 12]]),
    ],
    creatures: [{ who: 'bonde', col: 5, row: 5, way: 'right', speed: 1, range: 90 }, { who: 'drummer', col: 15, row: 14, way: 'up', speed: 1, range: 20 }],
  }),

  // S SUGAR RUSH: Sugarloaf's base. In at the left on the beach (floor 18); a ladder (col 7) up to the cable's lower station (floor 14, the shelf) whose gate (cols 10-11) is shut until the key to the city; the car on the cable climbs to the summit
  // station (floor 8, cols 24-31) at the right, on the crown of the granite peak, which runs out east into the summit. The rope (col 26) from Lapa comes up through the beach's gap under the platform.
  room({
    id: RIO_ROOM.sugar, cell: [6, 34], sector: 69, palette: SUGAR_PALETTE,
    paint: paintSugar,
    coins: SUGAR_COINS,
    decor: [
      ...sky(paintSugar, itemCells(), 0, 9),
      ['rioPeak', 19, 9], ...Array.from({ length: 9 }, (_, i): Placed => ['pacLawn', 19 + i, 16]), ['cableStation', 12, 11], ['cableStation', 25, 5], ...cableLine(), ['rioStilts', 9, 16], ['rioStilts', 14, 16], [{ text: CLOSED_SIGN.text, colour: 2 }, CLOSED_SIGN.col, CLOSED_SIGN.row],
    ],
    creatures: [{ who: 'crab', col: 3, row: 16, way: 'right', speed: 1, range: 16 }, { who: 'vulture', col: 16, row: 1, way: 'down', speed: 1, range: 24 }],
  }),

  // U SUGARLOAF SUMMIT: the top of the loaf. In at the left from the cable's platform (floor 8), over the granite dome (floor 6, green on top) and along the saddle (floor 8), out east to Corcovado, tourists' deckchairs and viewer on it; a cleft
  // (a rope, col 20) down through the rock to a cave with a skewer. Corcovado's green peak and the bay far off.
  room({
    id: RIO_ROOM.loaf, cell: [6, 35], sector: 70, palette: SUMMIT_PALETTE,
    paint: paintSummit,
    coins: SUMMIT_COINS,
    item: { name: 'skewer2', col: SUMMIT_ITEM[0], row: SUMMIT_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintSummit, itemCells(SUMMIT_ITEM), 0, 7), ...fillCells(paintSummit, itemCells(SUMMIT_ITEM), [0, 11, 31, 11], 'rioSkyLow'), ...sea(paintSummit, itemCells(SUMMIT_ITEM), 12, 13),
      ['skyCloud', 3, 1], ['pacDiamondHead', 14, 3], ['pacDiamondHead', 23, 3], [{ text: 'SUGARLOAF', colour: 7 }, 12, 2],
      ['rioScope', 13, 6], ['parasol', 15, 6], ['deckchair', 23, 7], ['rioRail', 22, 7], ['rioFlag', 26, 5],
      ['restTable', 8, 12], ['rioDinerRed', 7, 12], ['rioDinerBlue', 11, 12], ['restTable', 13, 12], ['rioDinerBlue', 12, 12], ['saladBar', 24, 12],
    ],
    creatures: [{ who: 'marmoset', col: 7, row: 4, way: 'right', speed: 1, range: 32 }, { who: 'marmoset', col: 28, row: 1, way: 'down', speed: 1, range: 24 }],
  }),

  // C OPEN ARMS: Corcovado, the climb to the Redeemer. In at the left (floor 8, rows 6-7) on the shoulder; a rope (col 5) down through the gap into the favela; over the gap to a ledge, a ladder (col 10) down to the valley's trail (floor 14), along it and a long
  // ladder (col 22) up to the summit (floor 6) where Christ the Redeemer stands, the highest point of Rio, arms out; down the east side (floor 8) to the forest.
  room({
    id: RIO_ROOM.arms, cell: [6, 36], sector: 71, palette: ARMS_PALETTE,
    paint: paintArms,
    coins: ARMS_COINS,
    item: { name: 'skewer5', col: ARMS_ITEM[0], row: ARMS_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintArms, itemCells(ARMS_ITEM), 0, 11),
      ['christ', 16, 0], ['skyCloud', 3, 1], ['skyCloudBig', 24, 2], ['pacPalm', 7, 2],
    ],
    creatures: [{ who: 'vulture', col: 11, row: 1, way: 'down', speed: 1, range: 40 }],
  }),

  // T MONKEY BUSINESS: the Tijuca forest. In at the left on the upper bough (floor 8), which runs east to a gap with a rope (col 22) that hangs through to the carnival below; a rope (col 15) from the ground climbs to the bough, past a middle bough (floor 14) with
  // a skewer; a stream pool on the ground (floor 18). The bough runs on east to the edge of the screen with a coin.
  room({
    id: RIO_ROOM.monkey, cell: [6, 37], sector: 72, palette: FOREST_PALETTE,
    paint: paintForest,
    coins: FOREST_COINS,
    item: { name: 'skewer3', col: FOREST_ITEM[0], row: FOREST_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintForest, itemCells(FOREST_ITEM), 0, 17),
      ['giantTree', 26, 2], ['fern', 2, 15], ['bromeliad', 19, 7], ['hangingVines', 5, 2], ['hangingVines', 19, 2], ['giantTree', 11, 2],
    ],
    creatures: [{ who: 'marmoset', col: 3, row: 6, way: 'right', speed: 1, range: 32 }, { who: 'macaw', col: 18, row: 2, way: 'right', speed: 1, range: 50 }],
  }),

  // F HOUSE OF COLOUR: the hillside. Corcovado's rope (col 5) comes down to the roofs at the left (floor 8) which step across (floor 9) to the church tower; the colourful houses stand under the roofs on the green hill, washing hung between them at every
  // height; below, the lane (floor 18) runs in front of them east out low to the parade.
  room({
    id: RIO_ROOM.colour, cell: [7, 36], sector: 73, palette: HILL_PALETTE,
    paint: paintHill,
    coins: HILL_COINS,
    item: { name: 'skewer6', col: HILL_ITEM[0], row: HILL_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintHill, itemCells(HILL_ITEM), 0, 7),
      ['skyCloud', 8, 1], ['skyCloudBig', 17, 0], ['church', 26, 4], ['dish', 4, 7],
      ...fitting(paintHill, keepOf(HILL_COINS, HILL_ITEM), [...houses(), ...washing()], 'K'),
    ],
    creatures: [{ who: 'capoeirista', col: 9, row: 16, way: 'right', speed: 1, range: 36 }, { who: 'macaw', col: 13, row: 1, way: 'down', speed: 1, range: 44 }],
  }),

  // W STEAK YOUR CLAIM: the churrascaria, a dead end. In from Sugarloaf's beach at the right (floor 18). Diners at their tables, the grill with the meat turning over the fire, two gauchos pace the dining floor with skewers that swing from table to table;
  // the stairs of crates (floors 16, 14, 12) climb at the middle to the mezzanine's stage (floor 10) under a COSTUMES sign, where the headdress hangs on a curtain: nothing walks the stage, the way up is the stairs in plain sight, and each gaucho keeps to his own lane.
  room({
    id: RIO_ROOM.steak, cell: [6, 33], sector: 74, palette: STEAK_PALETTE,
    paint: paintSteak,
    coins: STEAK_COINS,
    item: { name: 'headdress', col: STEAK_ITEM[0], row: STEAK_ITEM[1], sprite: RIO_SPRITE.headdress },
    decor: [
      [{ text: 'COSTUMES', colour: 7 }, 5, 6], ['rioWineRack', 18, 5], ['rioWineRack', 20, 5], ['lampRed', 8, 4], ['lampRed', 16, 4], ['curtain', 2, 7], ['curtain', 13, 7],
      ['lampRed', 22, 4], ['lampRed', 26, 4], ['lampRed', 29, 4], [{ text: 'CHURRASCO', colour: 7 }, 21, 7], ['rioPlumes', 22, 9], ['rioPlumes', 28, 9], ['rioWineRack', 24, 10], ['rioWineRack', 26, 10],
      ['restTable', 6, 16], ['rioDinerRed', 5, 16], ['rioDinerBlue', 9, 16], ['restTable', 11, 16], ['rioDinerBlue', 10, 16], ['rioDinerRed', 14, 16],
      ['rioGrill', 24, 14],
    ],
    creatures: [{ who: 'gaucho', col: 26, row: 16, way: 'left', speed: 1, range: 24 }, { who: 'gaucho', col: 5, row: 16, way: 'right', speed: 1, range: 60 }],
  }),

  // P BEAT THE DRUM: the carnival's first room. In from the hillside at the left (floor 18); the stepped risers of the bateria (floors 16, 14, 16) up and down the middle with drummers; Tijuca's rope (col 22) comes down to the street; the steward at the right in a
  // low lane (rows 16-17 only) under the sambadrome's gate lets him by only in the headdress.
  room({
    id: RIO_ROOM.drum, cell: [7, 37], sector: 75, palette: DRUM_PALETTE,
    paint: paintDrum,
    coins: DRUM_COINS,
    decor: [
      ...sky(paintDrum, itemCells(), 0, 11),
      [{ text: 'SAMBA', colour: 7 }, 9, 5], ['bunting', 3, 2], ['bunting', 8, 2], ['bunting', 13, 2], ['bunting', 18, 2], ['rioBalloons', 1, 5], ['rioBalloons', 27, 3],
      ['stands', 0, 12], ['rioStandsGold', 0, 14], ['stands', 0, 16], ['rioStandsGold', 24, 12], ['stands', 24, 10], ['rioStandsGold', 24, 8],
      ['surdo', 6, 14], ['surdo', 20, 14], ['rioPlumes', 13, 10], ['rioPlumes', 9, 12], ['rioPlumes', 17, 12], ['lampPost', 3, 15],
    ],
    creatures: [{ who: 'steward', col: 26, row: 16, way: 'left', speed: 1, range: 8 }, { who: 'drummer', col: 13, row: 12, way: 'up', speed: 1, range: 20 }, { who: 'dancer', col: 0, row: 10, way: 'right', speed: 1, range: 16 }],
  }),

  // Q FLOAT YOUR BOAT: the avenue. In at the left on the street (floor 18) under the gate's lintel; the channel (deep water, cols 6-24) is crossed on the floats that come along it with a dancer dancing on each: lane A (the street's height) three of them
  // left to right, lane B (floor 14) two the other way; the stage at the right (floor 18) with a skewer leads east out low to the beach.
  room({
    id: RIO_ROOM.float, cell: [7, 38], sector: 76, palette: FLOAT_PALETTE,
    paint: paintFloat,
    coins: FLOAT_COINS,
    item: { name: 'skewer4', col: FLOAT_ITEM[0], row: FLOAT_ITEM[1], sprite: RIO_SPRITE.skewer },
    decor: [
      ...sky(paintFloat, itemCells(FLOAT_ITEM), 0, 4),
      ...[0, 4, 8, 12, 16, 20, 24, 28].flatMap((col, i): Placed[] => [[i % 2 === 0 ? 'stands' : 'rioStandsGold', col, 6], [i % 2 === 0 ? 'rioStandsGold' : 'stands', col, 8]]).filter(([, col]) => col > 3),
      ...run('bunting', 4, 5, 7, 4), ['rioBalloons', 19, 0], ['rioBalloons', 24, 1], ['rioBalloons', 29, 0], [{ text: 'CARNAVAL', colour: 7 }, 12, 10],
      ['floatGalleon', HOME.galleon[0], HOME.galleon[1]], ['floatSun', HOME.sun[0], HOME.sun[1]], ['floatBird', HOME.bird[0], HOME.bird[1]], ['rioPlumes', 4, 10],
    ],
  }),

  // B RIO OR BUST: the beach. In at the left on the promenade's wave pavement (floor 18); palms standing in the sand, the sea and sky behind, Sugarloaf across the bay at the left, Christ the Redeemer small on Corcovado at the right, the sun low over the sea,
  // and the acai bowl on its table at the right end. Touching it is the end.
  room({
    id: RIO_ROOM.bust, cell: [7, 39], sector: 77, palette: BEACH_PALETTE,
    paint: paintBeach,
    coins: BEACH_COINS,
    item: { name: 'bowl', col: BEACH_ITEM[0], row: BEACH_ITEM[1], sprite: RIO_SPRITE.bowl },
    decor: [
      ...sky(paintBeach, itemCells(BEACH_ITEM), 0, BEACH_HORIZON - 1), ...sea(paintBeach, itemCells(BEACH_ITEM), BEACH_HORIZON, 14),
      ['sugarloaf', BEACH_VIEW.sugarloaf.col, BEACH_VIEW.sugarloaf.row], ['pacDiamondHead', 20, 8], ['christFar', BEACH_VIEW.redeemer.col, BEACH_VIEW.redeemer.row], ['parasol', 14, 16], ['deckchair', 15, 17],
    ],
  }),
];
