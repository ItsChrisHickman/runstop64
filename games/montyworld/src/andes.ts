import type { FlightSpec, RollerSpec, VineSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { ANDES_SPRITE, BOULDER_POINTERS } from './andes-pointers';
import { codeOf, room, type Grid, type Palette } from './layout';

/**
 * The Andes and the Amazon, the sixth region of Do Svidaniya Monty (docs/dosvidaniya-andes.md): twelve rooms in a block four columns wide and six rows high at columns 30-33 of the exit grid (rows 2-7), entered from
 * the cargo plane's hold (the Pacific, column 29) and left east out of the river's end (Rio, not yet built).
 *
 *            col 30                31               32                 33
 *   row 2   F1 JUMP FOR JOY
 *   row 3   F2 OUT OF THIN AIR                                           (the parachute drop: a shaft of three flight rooms, one under another)
 *   row 4   F3 CONDOR COUNTRY
 *   row 5   T1 NO PROBLLAMA      T2 ROCK AND ROLL   V MARKET FORCES      M MIST OPPORTUNITY
 *   row 6   CF CLOUD NINE        X THE INCA TUNNEL
 *   row 7   B THE RIVER QUEEN    P VINE AND DANDY   R THE RIVER ENDS
 *
 * (The letters are the design's.) Playfield cells as in moscow.ts. Floors ("F"): T1's top terrace 6 and its low path 18; T2's plateau 6, its steps 8, 10 and its landing 12, its lane 18; the market's roofs 12, 14, 16, 9 and its
 * lane 18; the cave 18; the cloud forest's boughs 8, 12 and its ground 18; the tunnel 18; the boat's jetty 16, cargo deck 15 and top deck 8; the river's banks 15; the last bank's mud 15, 12, 9 and 8.
 * The flight rooms are `flights` (flight.ts), the boulders of T2 `rollers`, the vines of P `vines`.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from the Pacific's (38-54): they never change once the region has shipped. */
export const AND = {
  jump: 55, thin: 56, condor: 57, llama: 58, rock: 59, market: 60, mist: 61, cloud: 62, tunnel: 63, boat: 64, river: 65, bank: 66,
} as const;

const NAMES = [
  'JUMP FOR JOY', 'OUT OF THIN AIR', 'CONDOR COUNTRY', 'NO PROBLLAMA', 'ROCK AND ROLL', 'MARKET FORCES', 'MIST OPPORTUNITY', 'CLOUD NINE', 'THE INCA TUNNEL', 'THE RIVER QUEEN', 'VINE AND DANDY', 'THE RIVER ENDS',
] as const;
export const ANDES_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the sky's light blues, the terraces green and brown, the market's orange, the cave's purple, the forest's greens, the tunnel's grey, the river's browns and blues). */
export const ANDES_COLOURS: readonly number[] = [14, 14, 6, 13, 12, 8, 4, 5, 11, 9, 7, 10];

// ---- the palettes --------------------------------------------------------------------------------------
/** The sky rooms: the plane's tail and its ramp, rock, snow and cloud. */
export const SKY_PALETTE = {
  K: ['hullPlate', 14], R: ['mountainRock', 9], S: ['snowCap', 1], C: ['snowCap', 1], T: ['rockLedge', 8],
} as const satisfies Palette;

/** The terraces' seven: grass, wall, ladder, the well's rope, the rock, and Huayna Picchu's green slope and grey rock (scenery: he walks in front of it). */
export const TERRACE_PALETTE = {
  G: ['terraceGrass', 13], W: ['incaWall', 1], L: ['woodLadder', 7], V: ['vine', 5], K: ['mountainRock', 9], P: ['hpSlope', 5], Q: ['hpRock', 8],
} as const satisfies Palette;

export const MARKET_PALETTE = {
  A: ['adobe', 10], T: ['thatch', 7], G: ['terraceGrass', 13], R: ['woodLadder', 7], K: ['mountainRock', 9], C: ['snowCap', 1], W: ['incaWall', 1],
} as const satisfies Palette;

export const MIST_PALETTE = {
  K: ['mountainRock', 9], M: ['mistPit', 14], S: ['rockLedge', 8], G: ['mossGround', 13], R: ['woodLadder', 7], W: ['incaWall', 1], N: ['mistWisp', 14],
} as const satisfies Palette;

export const CLOUD_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mossGround', 13], G: ['rockLedge', 9], R: ['vine', 5], T: ['tangle', 13], W: ['riverWater', 6], K: ['mountainRock', 9],
} as const satisfies Palette;

export const TUNNEL_PALETTE = {
  S: ['tunnelStone', 1], W: ['incaWall', 1], R: ['vine', 5], G: ['terraceSlab', 7], K: ['mountainRock', 9],
} as const satisfies Palette;

export const BOAT_PALETTE = {
  H: ['hullPlate', 1], P: ['porthole', 1], D: ['deckBoards', 9], L: ['woodLadder', 7], M: ['mud', 9], J: ['jungleLeaf', 5], W: ['riverWater', 6], V: ['vine', 5],
} as const satisfies Palette;

export const RIVER_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], L: ['deckBoards', 9], V: ['vine', 5], K: ['mossGround', 13],
} as const satisfies Palette;

export const BANK_PALETTE = {
  J: ['jungleLeaf', 5], M: ['mud', 9], W: ['riverWater', 6], K: ['mossGround', 13], R: ['vine', 5], P: ['deckBoards', 9],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/** The flight rooms (the parachute drop): each updraft is three cells wide from its `top` row to the bottom. */
export const FLIGHTS: readonly FlightSpec[] = [
  { room: AND.jump, updrafts: [{ col: 9, cols: 3, top: 6 }] },
  { room: AND.thin, updrafts: [{ col: 5, cols: 3, top: 7 }, { col: 22, cols: 3, top: 6 }] },
  { room: AND.condor, updrafts: [{ col: 13, cols: 3, top: 6 }, { col: 19, cols: 3, top: 6 }] },
];

/**
 * T2's boulders: three, a third of a period apart, from the plateau's lip (col 13) along the plateau (floor 6) and down the steps (floors 8, 10, 12) a pixel a frame, a fall of two rows at each edge, along the landing into a heap of
 * rubble (cols 28-29: they end there, short of the doorway at cols 30-31 that he comes in by from the village), `every` 360 frames; a boulder is on the path about 170 of them, so a step has one passing now and then, seen from the plateau all the way.
 */
export const BOULDER_PATH: readonly (readonly [col: number, row: number])[] = [[13, 4], [15, 4], [16.4, 6], [19.2, 6], [20.4, 8], [24.2, 8], [25.4, 10], [27.6, 10]];
export const BOULDERS: readonly RollerSpec[] = [0, 120, 240].map((start, i): RollerSpec => ({
  room: AND.rock, sprite: [1, 2, 6][i] ?? 1, path: BOULDER_PATH, speed: 1, every: 360, start, frames: BOULDER_POINTERS, colour: 9,
}));

/**
 * P's vines: three, from the canopy at columns 8, 16 and 24, each thirteen cells long (down to row 15, the banks' floor), swinging through five cells either way at the tip every 96 frames, a third of a swing apart. Monty
 * takes hold of a rope by walking into it or falling onto it (a jump does not: Monty on the Run's rule), so a vine reaches the height of his body on the bank: it swings over the bank's edge and he steps onto it, rides it out over the
 * water and steps off onto a log (or the far bank) as it swings over.
 */
export const VINES: readonly VineSpec[] = [8, 16, 24].map((col, i): VineSpec => ({ room: AND.river, col, top: 3, length: 13, period: 96, amplitude: 5, phase: i * 32, code: codeOf(RIVER_PALETTE, 'V') }));

// ---- the key items' places -------------------------------------------------------------------------
/** CLOUD NINE's tangle over the jetty's rope (cols 4-7, rows 18-19: four wide, so that he standing anywhere on the rope has air under his three columns): the machete cuts it away. */
export const TANGLE_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [4, 5, 6, 7].map((col) => [row, col] as const));
/** The rope that hangs through that gap once it is clear (the jetty below): placed with the machete. */
export const TANGLE_ROPE: readonly (readonly [row: number, col: number])[] = [18, 19].map((row) => [row, 5] as const);
export const TANGLE_ROPE_CODE = codeOf(CLOUD_PALETTE, 'R');

// ---- the rooms ----------------------------------------------------------------------------------------------

/**
 * Huayna Picchu, the steep spire behind Machu Picchu, in scenery tiles (they are not walls: he walks in front of it), painted first so that the terraces overwrite its foot: from its tip (`col`, row `top`) down to row `bottom`,
 * `half` cells either side at the foot; bare grey rock for its two top rows and its shadowed right flank, the green terraced slope on the rest.
 */
function huaynaPicchu(g: Grid, col: number, top: number, bottom: number, half: number): void {
  for (let r = top; r <= bottom; r++) {
    const reach = Math.round(((r - top) * half) / (bottom - top));
    for (let c = col - reach; c <= col + reach; c++) g.box(c, r, c, r, r < top + 2 || c > col + reach * 0.35 ? 'Q' : 'P');
  }
}

export const ANDES_ROOMS: readonly RoomSpec[] = [
  // F1 JUMP FOR JOY: out of the plane's tail. In at the left on the ramp (floor 16: the hold's door, rows 14-15); the plane's tail is the wall; off the ramp's end the canopy opens. An updraft (cols 9-11) lifts him back up to glide
  // to a spire at the right (an empanada on its snowy tip), clouds under. The bottom is open (nothing solid is drawn in it): he sinks out of it into the next room.
  room({
    id: AND.jump, cell: [2, 30], sector: 55, palette: SKY_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 13, 'K').box(0, 16, 3, 17, 'K').box(0, 18, 1, 19, 'K');
      g.box(28, 0, 31, 19, 'R');
      g.box(19, 14, 24, 19, 'R').box(20, 13, 23, 13, 'S').box(21, 12, 22, 12, 'S'); // the spire
    },
    coins: [[7, 12], [13, 8], [16, 9], [19, 10], [26, 12]],
    item: { name: 'empanada1', col: 21, row: 10, sprite: ANDES_SPRITE.empanada },
    decor: [['skyCloudBig', 4, 4], ['skyCloud', 13, 2], ['skyCloud', 22, 5], ['skyCloud', 5, 9], ['skyCloudBig', 5, 16], ['skyCloud', 14, 17],
      ['updraft', 9, 12], ['updraft', 9, 8]],
  }),

  // F2 OUT OF THIN AIR: the canyon. In from above anywhere; the cliffs close in at each side, a ridge rises mid-room (coins on its crest), an updraft each side of it, two condors crossing at two heights. Out at the bottom.
  room({
    id: AND.thin, cell: [3, 30], sector: 56, palette: SKY_PALETTE,
    paint(g) {
      g.box(0, 0, 2, 19, 'R').box(3, 8, 3, 19, 'R').box(4, 13, 4, 19, 'R').box(29, 0, 31, 19, 'R').box(28, 7, 28, 19, 'R').box(27, 12, 27, 19, 'R');
      g.box(11, 14, 20, 19, 'R').box(21, 18, 26, 19, 'R').box(12, 12, 19, 13, 'R').box(14, 10, 17, 11, 'R').box(15, 9, 16, 9, 'S').box(14, 10, 17, 10, 'S');
    },
    coins: [[26, 13], [23, 7], [19, 6], [16, 8], [12, 10], [8, 12], [6, 7]],
    decor: [['skyCloudBig', 3, 3], ['skyCloud', 22, 2], ['skyCloud', 13, 3],
      ['updraft', 5, 16], ['updraft', 5, 12], ['updraft', 5, 8], ['updraft', 22, 12], ['updraft', 22, 8]],
    creatures: [{ who: 'condor', col: 4, row: 4, way: 'right', speed: 2, range: 88 }, { who: 'condor', col: 25, row: 8, way: 'down', speed: 2, range: 44 }],
  }),

  // F3 CONDOR COUNTRY: the climax of the drop. A rock overhang hangs at the right (an empanada on its lip), a ledge at each side, two updrafts, two condors on slow wide circuits; down through the gap between the ledges (cols 8-23)
  // onto Machu Picchu's terrace under it.
  room({
    id: AND.condor, cell: [4, 30], sector: 57, palette: SKY_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 19, 'R').box(30, 0, 31, 19, 'R').box(2, 16, 7, 19, 'R').box(24, 16, 29, 19, 'R').box(3, 14, 5, 15, 'R');
      g.box(18, 0, 29, 4, 'R').box(21, 5, 29, 5, 'R'); // the overhang
      g.box(22, 9, 27, 10, 'R').box(22, 8, 27, 8, 'S'); // the shelf under it
    },
    coins: [[5, 12], [10, 14], [14, 6], [17, 8], [27, 7], [27, 13]],
    item: { name: 'empanada2', col: 24, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['skyCloudBig', 3, 3], ['skyCloud', 13, 1], ['skyCloud', 22, 12], ['skyCloud', 9, 17], ['skyCloudBig', 15, 17],
      ['updraft', 13, 12], ['updraft', 13, 8], ['updraft', 19, 12], ['updraft', 19, 8]],
    creatures: [{ who: 'condor', col: 4, row: 5, way: 'right', speed: 2, range: 52 }, { who: 'condor', col: 24, row: 12, way: 'left', speed: 2, range: 56 }],
  }),

  // T1 NO PROBLLAMA: Machu Picchu's lower terraces. The drop lands on the top terrace (floor 6) through the gap in the mountain's rock roof (cols 8-23, open to F3's: nothing is drawn solid in it); the terrace runs east out high into the great room, and a
  // ladder (col 4, in a shaft three cells wide) goes down through the stepped walls to the low path (floor 18), which climbs three terraces (floors 16, 14, 16) where two llamas graze and wink on the flat, and runs east out low into the great room's lane.
  room({
    id: AND.llama, cell: [5, 30], sector: 58, palette: TERRACE_PALETTE,
    paint(g) {
      g.box(0, 0, 7, 2, 'K').box(24, 0, 31, 2, 'K'); // the mountain: F3's cliffs go on; the terraces run off the left edge
      g.box(0, 6, 31, 6, 'G').box(0, 7, 31, 10, 'W').box(8, 8, 31, 8, 'G').clear(3, 6, 5, 12).box(4, 6, 4, 17, 'L');
      g.box(0, 18, 31, 19, 'G');
      g.box(9, 16, 13, 16, 'G').box(9, 17, 13, 17, 'W').box(14, 14, 17, 14, 'G').box(14, 15, 17, 17, 'W').box(18, 16, 21, 16, 'G').box(18, 17, 21, 17, 'W'); // the terraces of the low path
      g.box(30, 7, 31, 15, 'W');
    },
    coins: [[11, 4], [16, 4], [22, 4], [28, 4], [11, 14], [15, 12], [27, 16]],
    decor: [['mountainRange', 3, 3], ['intihuatana', 12, 4], ['pots', 25, 4], ['incaGate', 22, 14]],
    creatures: [{ who: 'llama', col: 2, row: 16, way: 'right', speed: 1, range: 40 }, { who: 'llama', col: 24, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // T2 ROCK AND ROLL: Machu Picchu proper, Huayna Picchu rising behind it. In from T1 on the plateau at the left (floor 6: the temple gate and the sacred stone) or on the low lane (floor 18). A ladder (col 5, a shaft three wide) joins the plateau to the lane's west end
  // (a loop with T1's ladder). Boulders roll off the plateau's lip down the steps (floors 8, 10) to the landing (floor 12), the way out east high into the village. The lane runs under the terraces from T1's low path: a low tunnel (cols 11-22, two cells high) where a
  // spitting llama paces the mouth and a well (cols 19-21, a rope in it) falls into the Inca tunnel; the llama steps aside for a tune.
  room({
    id: AND.rock, cell: [5, 31], sector: 59, palette: TERRACE_PALETTE,
    paint(g) {
      huaynaPicchu(g, 20, 0, 9, 7);
      g.box(0, 6, 15, 6, 'G').box(0, 7, 15, 13, 'W').box(16, 8, 20, 8, 'G').box(16, 9, 20, 13, 'W').box(21, 10, 25, 10, 'G').box(21, 11, 25, 13, 'W').box(26, 12, 31, 12, 'G').box(26, 13, 31, 13, 'W');
      g.clear(4, 6, 6, 13).box(5, 6, 5, 17, 'L'); // the ladder down to the lane
      g.box(0, 18, 31, 19, 'G').clear(19, 18, 21, 19).box(20, 18, 20, 19, 'V').box(11, 14, 22, 15, 'W').box(23, 14, 31, 17, 'K'); // the lane, the well and its rope, the tunnel's lintel and the rock the tunnel ends in
      g.box(30, 0, 31, 9, 'K').box(0, 0, 1, 2, 'K').box(0, 14, 1, 15, 'W');
    },
    coins: [[7, 4], [10, 4], [18, 6], [23, 8], [27, 10], [3, 16]],
    item: { name: 'empanada3', col: 8, row: 16, sprite: ANDES_SPRITE.empanada },
    decor: [['incaGate', 2, 2], ['intihuatana', 8, 4], ['skyCloud', 9, 0], ['skyCloud', 25, 1], ['rubble', 28, 10]],
    creatures: [{ who: 'spitter', col: 12, row: 16, way: 'right', speed: 1, range: 40 }],
  }),

  // V MARKET FORCES: the mountain village. In from the terraces' landing on the first roof (floor 12) at the left; the roofs step down (floors 14, 16) to the lane (floor 18) under the market awnings, stalls and a guinea pig pen, which runs
  // east out low to the cave. A ladder (col 20) from the lane goes up to the hat stall's roof (floor 9): the chullo hangs there.
  room({
    id: AND.market, cell: [5, 32], sector: 60, palette: MARKET_PALETTE,
    paint(g) {
      g.box(0, 12, 9, 12, 'T').box(0, 13, 9, 17, 'A').box(10, 14, 14, 14, 'T').box(10, 15, 14, 17, 'A').box(15, 16, 18, 16, 'T').box(15, 17, 18, 17, 'A');
      g.box(0, 18, 31, 19, 'G').box(30, 0, 31, 15, 'K').box(0, 0, 1, 9, 'K');
      g.box(21, 9, 28, 9, 'T').box(20, 9, 20, 17, 'R');
    },
    coins: [[7, 10], [12, 12], [16, 14], [21, 16], [24, 7], [27, 16]],
    item: { name: 'chullo', col: 25, row: 7, sprite: ANDES_SPRITE.chullo },
    decor: [['marketStall', 22, 14], ['textile', 28, 14], ['pots', 8, 10], ['cuyPen', 17, 14], ['stoneHut', 2, 8], ['skyCloud', 12, 3], ['mountainRange', 14, 6]],
    creatures: [{ who: 'cuy', col: 20, row: 16, way: 'right', speed: 1, range: 30 }],
  }),

  // M MIST OPPORTUNITY: a cave in the cloud, a dead end. In low from the village at the left; mist rises from a pit (cols 9-13, deadly in its two rows, a drift of it over them) crossed on a stone pillar standing in its middle (cols 11-12); the cave's floor climbs in three steps (floors 16, 14, 12) to a ledge at the right where
  // the panpipes lie. Bats overhead. Out the way he came.
  room({
    id: AND.mist, cell: [5, 33], sector: 61, palette: MIST_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 3, 'K').box(0, 4, 1, 15, 'K').box(30, 4, 31, 19, 'K');
      g.box(0, 18, 8, 19, 'G').box(9, 18, 13, 19, 'M').box(14, 18, 31, 19, 'G').box(9, 16, 13, 17, 'N').box(11, 18, 12, 19, 'S'); // the pit, the mist rising over it, the stone standing in it
      g.box(19, 16, 22, 17, 'W').box(23, 14, 26, 17, 'W').box(27, 12, 29, 17, 'W');
    },
    coins: [[5, 16], [11, 15], [16, 16], [20, 14], [24, 12], [29, 9]],
    item: { name: 'panpipes', col: 28, row: 10, sprite: ANDES_SPRITE.panpipes },
    decor: [['torch', 3, 16], ['torch', 17, 16], ['idol', 21, 14]],
    creatures: [{ who: 'caveBat', col: 4, row: 6, way: 'right', speed: 2, range: 95 }, { who: 'cuy', col: 15, row: 16, way: 'right', speed: 1, range: 30, colour: 7 }],
  }),

  // CF CLOUD NINE: the cloud forest. In from the Inca tunnel at the right (low). The ground (floor 18) runs west over a stream (stepping logs) past a jaguar to a tangle over a gap at the left (cols 4-7: the machete cuts it, and a rope hangs
  // through to the riverboat); a rope (col 15) climbs from the ground to the boughs (floors 8, 13, 12) that run across above it, a sloth and a toucan on them. The topmost bough runs out east through a door (rows 6-7) into the Inca tunnel's high ledge: a loop with the low door.
  room({
    id: AND.cloud, cell: [6, 30], sector: 62, palette: CLOUD_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 0, 'J').box(0, 1, 8, 1, 'J').box(12, 1, 20, 1, 'J').box(24, 1, 31, 1, 'J').box(0, 2, 4, 2, 'J').box(15, 2, 17, 2, 'J').box(26, 2, 31, 2, 'J'); // the canopy's ragged leaves
      g.box(0, 18, 31, 19, 'M').box(4, 18, 7, 19, 'T').box(21, 18, 26, 19, 'W').box(22, 17, 23, 17, 'G').box(25, 17, 25, 17, 'G');
      g.box(3, 8, 13, 8, 'G').box(17, 8, 29, 8, 'G').box(18, 13, 27, 13, 'G').box(6, 12, 9, 12, 'G');
      g.box(15, 8, 15, 17, 'R');
      g.box(30, 0, 31, 5, 'J').box(30, 9, 31, 15, 'J').box(28, 8, 31, 8, 'G'); // the east wall has a door high, rows 6-7, onto the bough's end
    },
    coins: [[8, 6], [21, 6], [24, 11], [6, 10], [10, 16], [19, 16], [28, 14]],
    decor: [['giantTree', 2, 12], ['fern', 7, 15], ['fern', 27, 15], ['bromeliad', 10, 7], ['bromeliad', 22, 12], ['hangingVines', 23, 3], ['hangingVines', 9, 3]],
    creatures: [{ who: 'jaguar', col: 8, row: 16, way: 'right', speed: 1, range: 56 }, { who: 'toucan', col: 18, row: 6, way: 'right', speed: 1, range: 50 }, { who: 'sloth', col: 4, row: 6, way: 'right', speed: 1, range: 40 }],
  }),

  // X THE INCA TUNNEL: under the terraces, a dead end. In by the rope from the well (cols 19-21) which hangs to the floor; a tunnel of dressed stone lit by torches, golden idols in the niches, a Mole Crusher hanging from the ceiling between the rope and the stairs of blocks
  // up the east end (floors 16, 14, 12) to a shelf where the machete lies. Out west, low, into the cloud forest, or by the ledge at the west end (floor 8, from the forest's boughs: a drop to the floor).
  room({
    id: AND.tunnel, cell: [6, 31], sector: 63, palette: TUNNEL_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 3, 'S').clear(19, 0, 21, 3).box(30, 0, 31, 17, 'S').box(0, 4, 1, 15, 'S').clear(0, 6, 1, 7).box(0, 8, 6, 9, 'W'); // the west wall has a door high, rows 6-7, onto a ledge (floor 8)
      g.box(0, 18, 31, 19, 'W').box(22, 4, 23, 10, 'S'); // the stub of ceiling the crusher hangs from
      g.box(24, 16, 25, 17, 'W').box(26, 14, 27, 17, 'W').box(28, 12, 30, 17, 'W');
      g.box(20, 0, 20, 17, 'R');
    },
    coins: [[5, 16], [16, 16], [18, 16], [25, 14], [27, 12], [29, 9]],
    item: { name: 'machete', col: 28, row: 10, sprite: ANDES_SPRITE.machete },
    decor: [['torch', 7, 16], ['torch', 17, 16], ['idol', 3, 16], ['idol', 14, 16]],
    creatures: [{ who: 'caveBat', col: 12, row: 6, way: 'right', speed: 2, range: 50 }],
    crushers: [{ col: 22, row: 11, height: 7 }],
  }),

  // B THE RIVER QUEEN: the riverboat, a side view. In by the rope from the forest on the jetty at the left (floor 16), a plank across to the cargo deck (floor 15) under the cabin: a ladder at its foot (col 7) goes up to the top deck (floor 8:
  // the pilot house, the funnel, a macaw, the lifebuoy), which ends at the aft house (cols 24-25, up to row 4: no jumping onto it, no walking off the deck's end: the top deck is a dead end). The captain paces the cargo deck under the cabin (a lane two
  // cells high, shut from the top deck: no way past him) and steps aside for a local hat. Out east at the stern, low, under the paddle wheel.
  room({
    id: AND.boat, cell: [7, 30], sector: 64, palette: BOAT_PALETTE,
    paint(g) {
      g.box(0, 0, 3, 0, 'J').box(8, 0, 31, 0, 'J').box(10, 1, 16, 1, 'J').box(20, 1, 29, 1, 'J').box(11, 2, 13, 2, 'J').box(26, 2, 29, 2, 'J'); // the canopy over the river, ragged, leaving the rope's way up
      g.box(5, 0, 5, 15, 'V'); // the rope up to the cloud forest
      g.box(0, 16, 4, 19, 'M');
      g.box(5, 15, 31, 15, 'D').box(5, 16, 31, 17, 'H').box(5, 18, 31, 19, 'W'); // the deck, the hull, the river under it
      for (let c = 8; c <= 28; c += 4) g.box(c, 17, c, 17, 'P');
      g.box(8, 8, 23, 8, 'D').box(8, 9, 25, 12, 'H').box(12, 10, 12, 10, 'P').box(16, 10, 16, 10, 'P').box(20, 10, 20, 10, 'P').box(24, 4, 25, 8, 'H').box(24, 6, 24, 6, 'P').box(24, 10, 24, 10, 'P');
      g.box(7, 8, 7, 14, 'L');
      g.box(30, 0, 31, 12, 'J').box(30, 15, 31, 15, 'D'); // the far bank's trees
    },
    coins: [[6, 12], [15, 6], [19, 6], [23, 13], [27, 13], [29, 13]],
    item: { name: 'empanada4', col: 22, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['pilotHouse', 9, 5], ['funnel', 16, 5], ['lifebuoy', 20, 6], ['paddleWheel', 26, 9], ['palm', 2, 11], ['hammock', 9, 13]],
    creatures: [{ who: 'captain', col: 14, row: 13, way: 'right', speed: 1, range: 24 }, { who: 'toucan', col: 11, row: 6, way: 'right', speed: 1, range: 60, colour: 2 }],
  }),

  // P VINE AND DANDY: the boat runs aground. A wide brown river (the floor is water) from the stern's bank at the left (floor 15) to a mud bank at the right; three vines hang from the canopy and swing, two logs float between, piranhas leap.
  room({
    id: AND.river, cell: [7, 31], sector: 65, palette: RIVER_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'J').box(7, 2, 9, 2, 'J').box(15, 2, 17, 2, 'J').box(23, 2, 25, 2, 'J').box(0, 2, 3, 2, 'J').box(28, 2, 31, 2, 'J'); // the canopy the vines hang from, ragged
      g.box(0, 15, 4, 19, 'M').box(28, 15, 31, 19, 'M').box(5, 16, 27, 19, 'W').box(13, 16, 15, 16, 'L').box(20, 16, 22, 16, 'L');
      g.box(0, 3, 1, 12, 'J').box(30, 0, 31, 12, 'J');
    },
    coins: [[10, 11], [14, 14], [18, 10], [21, 14], [26, 11], [30, 13]],
    item: { name: 'empanada5', col: 29, row: 13, sprite: ANDES_SPRITE.empanada },
    decor: [['giantTree', 2, 9]],
    creatures: [{ who: 'piranha', col: 9, row: 18, way: 'up', speed: 1, range: 24 }, { who: 'piranha', col: 17, row: 18, way: 'up', speed: 1, range: 24 }, { who: 'sloth', col: 12, row: 3, way: 'right', speed: 1, range: 30 }],
  }),

  // R THE RIVER ENDS: the last bank. In from the river's mud bank at the left (floor 15); the bank climbs a muddy stair (floors 13, 11, 9) to a high bank (floor 8) under the boughs; an anaconda coils on the bank, piranhas snap in a pool.
  // The way east is open (rows 6-7) onto Rio's quay.
  room({
    id: AND.bank, cell: [7, 32], sector: 66, palette: BANK_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 12, 'J').box(28, 0, 31, 5, 'J').box(28, 8, 31, 19, 'M'); // a tree at the left running off the top, the trees at the right over the way east (rows 6-7), the mud running on to Rio's quay; the sky open
      g.box(0, 15, 5, 19, 'M').box(6, 16, 9, 19, 'W').box(10, 13, 13, 19, 'M').box(14, 11, 17, 19, 'M').box(18, 9, 21, 19, 'M').box(22, 8, 27, 19, 'M');
    },
    coins: [[3, 13], [13, 11], [15, 9], [19, 7], [22, 6]],
    item: { name: 'empanada6', col: 23, row: 6, sprite: ANDES_SPRITE.empanada },
    decor: [['palm', 25, 3], ['fern', 10, 10]],
    creatures: [{ who: 'anaconda', col: 15, row: 9, way: 'right', speed: 1, range: 8 }, { who: 'piranha', col: 8, row: 18, way: 'up', speed: 1, range: 16 }, { who: 'dolphin', col: 6, row: 17, way: 'up', speed: 1, range: 24 }],
  }),
];
