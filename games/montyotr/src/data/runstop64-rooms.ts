/**
 * runstop64's rooms for Monty on the Run: new rooms (ENHANCED only), in the original's own
 * formats, from its own parts. They sit in cells of the exit grid the original leaves empty
 * (right of the start room, and below it), with room ids after the original's ($00-$33).
 * data.ts merges them into the game's tables (each keyed by room id, so nothing of the
 * original's changes); Game.roomAt shows their cells only with the `rooms` assist on, and
 * that is the only way in. See games/montyotr/re/README.md ("runstop64's rooms").
 *
 * Coordinates are the original's:
 * - `map`: the room's 32 × 20 playfield, one string per row, a character per cell: '.' empty,
 *   '1'-'8' the room's character codes (the tilemaps' own codes: each takes `tiles[n-1]` from
 *   the tile library, coloured `colours[n-1]`, and the tile's collision class with it);
 * - coins: playfield column and row (as the coin table's);
 * - decorations, crushers, teleporters, enemies: screen column and row (the playfield starts
 *   at column 4, row 3), as the decoration list, the piledriver and teleporter tables have them;
 * - enemies: where the sprite starts (screen column and row of its top left), its colour (the
 *   game's colour table index), how it moves (an index into the direction flags: 0 right,
 *   1 left, 3 up, 4 down), its type (graphics, 8-34), speed (pixels a step) and range (steps
 *   before it turns: they move on every other frame);
 * - teleporters: where they send Monty (as the teleporter destination table: his x2 and y,
 *   and the exit grid cell, which the room transition loads as if he walked in).
 */

/** An enemy: where it starts (screen column, row) and the original's record fields. */
interface ExtEnemy {
  col: number; row: number;
  /** Index into the game's enemy colour table (0 black, 1 blue, 2 red, 3 purple, 4 green, 5 cyan, 6 yellow, 7 white, 8-15 the colours 8-15). */
  colour: number;
  /** Index into the direction flags: 0 right, 1 left (starting at the far end), 3 up (from the bottom), 4 down. */
  dir: 0 | 1 | 3 | 4;
  type: number; speed: number; range: number;
}

/** A sign, in the game's own lettering (its charset's capitals), on a board like MPL ST.'s. */
export interface Sign { text: string; colour: number }

/** A decoration: one of the original's types (a number), or a sign. */
interface ExtDecor { col: number; row: number; type: number | Sign }

export interface ExtRoom {
  id: number;
  /** Its cell in the exit grid. */
  row: number; col: number;
  /** Index into `SECTORS`. */
  sector: number;
  /** Tile library index for room codes 1-8. */
  tiles: readonly number[];
  /** C64 colour for room codes 1-8. */
  colours: readonly number[];
  map: readonly string[];
  /** room_metadata_tbl: a code whose character animates (water, lava), 0 for none. */
  theme?: number;
  /** At most two (fun, not a high score from one room: Chris). */
  coins?: readonly (readonly [col: number, row: number])[];
  /** A piece of cake (the original's cupcake, as Monty finds them: 200 points): screen column and row of its sprite's top left. */
  cake?: readonly [col: number, row: number];
  decor?: readonly ExtDecor[];
  enemies?: readonly ExtEnemy[];
  /** Mole Crushers (up to two): screen column and row of the shaft's top, its height, its characters ($10 or $22). */
  crushers?: readonly { col: number; row: number; height: number; chr: 0x10 | 0x22 }[];
  /** The room's teleporter (one, as in the original's rooms). */
  teleporter?: {
    col: number; row: number; height: number; colour: number;
    to: { x2: number; y: number; mapRow: number; exitCol: number };
    /**
     * Special items (si_spawn_tbl indexes) the original's only way into the destination has
     * taken, and the rooms there are built on: the warp lands him with them found, so the rooms
     * round it are as walking in leaves them (no score: they're the way in's, not a find).
     */
    found?: readonly number[];
  };
}

/** Sector names (shown under the playfield): column, text (as the original's). */
export const SECTORS = [
  { col: 7, text: 'RUNSTOP64 DEV ROOM' },
  { col: 6, text: 'RUNSTOP64 PLAYGROUND' },
  { col: 6, text: 'RUNSTOP64 WARP GATES' }, // (no Z: the game's small letters stop at Y, as its own names do)
] as const;

/**
 * The rooms. The exit grid (row, column), with the original's start room $00:
 *
 *            col 19  col 20  col 21  col 22
 *   row 2                    [$00]   [$34]   the dev room, right of the start
 *   row 3                            [$35]   the way down (rope)
 *   row 4    [$39]   [$38]   [$37]   [$36]   warp zone: Pie Are Square, the C5, the jetpack; the hub
 *   row 5    [$3D]   [$3C]   [$3B]   [$3A]   playground: the vault, the crushers, the pool; (rope up)
 *
 * A loop: the hub, left through the warp zone, down the rope in $39 to the vault, right through
 * the playground and up the rope in $3A to the hub. Every way between two rooms goes both ways
 * (floors meet at the same height, ropes run on through), so nobody is trapped.
 */
export const ROOMS: readonly ExtRoom[] = [
  // $34: the dev room: right of the start room
  {
    id: 0x34, row: 2, col: 22, sector: 0,
    tiles: [0x01, 0x77, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [14, 6, 11, 15, 3, 0, 0, 0],
    map: [
      '11111111111111111111111111111111',
      '...............................1',
      '..222.2.2.222.222.222.222.222..1',
      '..2.2.2.2.2.2.2....2..2.2.2.2..1',
      '..22..2.2.2.2.222..2..2.2.222..1',
      '..2.2.2.2.2.2...2..2..2.2.2....1',
      '..2.2.222.2.2.222..2..222.2....1',
      '...............................1',
      '...............................1',
      '.............555555............1',
      '...............................1',
      '.........5555........5555......1',
      '.......................4.......1',
      '...5555...........555..4...55551',
      '.......................4.......1',
      '333333333333333333333..4..333331',
      '333333333333333333333..4..333331',
      '333333333333333333333..4..333331',
      '333333333333333333333..4..333331',
      '333333333333333333333..4..333331',
    ],
    coins: [[15, 8], [29, 12]],
    cake: [13, 12], // on the ledge under A RUNSTOP64 TRIBUTE
    decor: [
      { col: 17, row: 16, type: 30 }, // a desk
      { col: 17, row: 13, type: 33 }, // its monitor
      { col: 9, row: 10, type: { text: 'A RUNSTOP64 TRIBUTE', colour: 14 } },
      { col: 19, row: 4, type: { text: 'HELLO MONTY!', colour: 7 } },
    ],
    enemies: [
      { col: 33, row: 4, colour: 7, dir: 3, type: 27, speed: 1, range: 3 }, // a hand, waving (out of reach)
    ],
  },
  // $35: the way down
  {
    id: 0x35, row: 3, col: 22, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [6, 0, 14, 15, 3, 0, 0, 0],
    map: [
      '111111111111111111111..4..111111',
      '1......................4.......1',
      '1......................4.......1',
      '1......................4.......1',
      '1......................4.......1',
      '1......................4.......1',
      '1......................4.......1',
      '1...........33333333333333333..1',
      '1..............................1',
      '1........5555..................1',
      '1..............................1',
      '1....5555......................1',
      '1........4.....................1',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
      '1333333..4..33333333333333333331',
    ],
    coins: [[10, 8], [26, 6]],
    enemies: [
      { col: 18, row: 14, colour: 6, dir: 0, type: 15, speed: 1, range: 96 }, // a bird, along the floor
    ],
  },
  // $36: the hub: the warp zone to the left, the playground below
  {
    id: 0x36, row: 4, col: 22, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [14, 0, 11, 15, 7, 0, 0, 0],
    map: [
      '1111111..4..11111111111111111111',
      '1........4.....................1',
      '1........4.....................1',
      '1........4.....................1',
      '1........4.....................1',
      '1........4.....................1',
      '1........4.....................1',
      '1........4.....................1',
      '1........4........55555........1',
      '1........4.....................1',
      '1........4...55555.............1',
      '1........4.....................1',
      '1........4........55555........1',
      '.........4.....................1',
      '.........4...55555.......4.....1',
      '.........4...............4.....1',
      '33333333333333333333333..4..3333',
      '33333333333333333333333..4..3333',
      '33333333333333333333333..4..3333',
      '33333333333333333333333..4..3333',
    ],
    coins: [[14, 9], [21, 7]],
    cake: [19, 15], // on the first step
    decor: [
      { col: 15, row: 5, type: { text: 'WARP ZONE', colour: 7 } },
      { col: 22, row: 16, type: { text: 'PLAYGROUND', colour: 13 } },
    ],
  },
  // $37: warp: The Ultimate Experience (the jetpack)
  {
    id: 0x37, row: 4, col: 21, sector: 2,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [6, 0, 14, 15, 3, 0, 0, 0],
    map: [
      '11111111111111111111111111111111',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1...........3333333333333......1',
      '1..............................1',
      '1.......5555...................1',
      '................................',
      '....55555.......................',
      '................................',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
    ],
    coins: [[9, 11], [20, 15]],
    decor: [
      { col: 9, row: 4, type: { text: 'THE ULTIMATE EXPERIENCE', colour: 7 } },
      { col: 23, row: 8, type: 88 }, // the jetpack's rocket, as in $1D
    ],
    // $1D, walking in from $1C: the only way there, and $1C's floor is only there once the joystick
    // ($1B, item 5) is found (items.ts applyRoomEffects): without it, a step back right fell into the
    // sewage, and every life went the same way
    teleporter: { col: 19, row: 6, height: 5, colour: 7, to: { x2: 0x9b, y: 0xb2, mapRow: 5, exitCol: 9 }, found: [5] },
  },
  // $38: warp: the C5 street (Sir Clive's C5)
  {
    id: 0x38, row: 4, col: 20, sector: 2,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [6, 0, 14, 15, 3, 0, 0, 0],
    map: [
      '11111111111111111111111111111111',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1......3333333333333...........1',
      '1..............................1',
      '1...................5555.......1',
      '................................',
      '.......................55555....',
      '................................',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
    ],
    coins: [[21, 11], [4, 15]],
    decor: [
      { col: 9, row: 4, type: { text: 'DRIVE SIR CLIVE(S C5', colour: 7 } },
      { col: 12, row: 11, type: 32 }, // the C5
    ],
    enemies: [
      { col: 8, row: 5, colour: 9, dir: 4, type: 8, speed: 2, range: 48 }, // a boot, stamping down to the floor and up: pass under it while it's up
    ],
    teleporter: { col: 18, row: 6, height: 5, colour: 5, to: { x2: 0x9b, y: 0x7a, mapRow: 2, exitCol: 8 } }, // $24 by the tree, walking in from $20
  },
  // $39: warp: Pie Are Square
  {
    id: 0x39, row: 4, col: 19, sector: 2,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [6, 0, 14, 15, 3, 0, 0, 0],
    map: [
      '11111111111111111111111111111111',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '133333333333333333333..........1',
      '1.........4....................1',
      '1.........4..........5555......1',
      '1.........4.....................',
      '1.........4..............5555...',
      '1.........4.....................',
      '13333333..4..3333333333333333333',
      '13333333..4..3333333333333333333',
      '13333333..4..3333333333333333333',
      '13333333..4..3333333333333333333',
    ],
    coins: [[16, 9], [26, 13]],
    decor: [
      { col: 6, row: 4, type: { text: 'PIE ARE SQUARE', colour: 7 } },
    ],
    teleporter: { col: 15, row: 6, height: 5, colour: 3, to: { x2: 0x9b, y: 0xca, mapRow: 1, exitCol: 19 } }, // $08, walking in from $09 (where Monty touches it, the dissolve shows in $08: clear of its enemies there)
  },
  // $3A: the playground: under the hub
  {
    id: 0x3a, row: 5, col: 22, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [14, 0, 12, 15, 5, 0, 0, 0],
    map: [
      '11111111111111111111111..4..1111',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '1........................4.....1',
      '15555....................4.....1',
      '1........................4.....1',
      '1.....55555..............4.....1',
      '1........................4.....1',
      '1...........55555........4.....1',
      '.........................4.....1',
      '...................5555..4.....1',
      '.........................4.....1',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
    ],
    coins: [[13, 12], [2, 8]],
    enemies: [
      { col: 21, row: 9, colour: 5, dir: 4, type: 10, speed: 1, range: 72 }, // an eye on a spring, bouncing down to the floor and up
    ],
  },
  // $3B: the playground: the pool
  {
    id: 0x3b, row: 5, col: 21, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0x4f],
    colours: [14, 0, 12, 15, 5, 0, 0, 6],
    theme: 0x87,
    map: [
      '11111111111111111111111111111111',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '................................',
      '..........33...33...33..........',
      '..........33...33...33..........',
      '33333338883388833888338883333333',
      '33333338883388833888338883333333',
      '33333338883388833888338883333333',
    ],
    coins: [[3, 16], [28, 16]],
    cake: [19, 16], // on the middle pillar, beside the fish's leap
    enemies: [
      { col: 16, row: 18, colour: 8, dir: 3, type: 32, speed: 1, range: 56 }, // a fish, leaping out of the pool
    ],
  },
  // $3C: the playground: the Mole Crushers
  {
    id: 0x3c, row: 5, col: 20, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [14, 0, 12, 15, 5, 0, 0, 0],
    map: [
      '11111111111111111111111111111111',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '1.....1111111.....1111111......1',
      '1.....1111111.....1111111......1',
      '1.....1111111.....1111111......1',
      '1..............................1',
      '1..............................1',
      '1..............................1',
      '................................',
      '................................',
      '................................',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
    ],
    coins: [[3, 16], [27, 16]],
    cake: [18, 18], // between the crushers
    crushers: [{ col: 12, row: 14, height: 6, chr: 0x10 }, { col: 24, row: 14, height: 6, chr: 0x22 }],
  },
  // $3D: the playground: the vault (up to the warp zone)
  {
    id: 0x3d, row: 5, col: 19, sector: 1,
    tiles: [0x01, 0, 0x15, 0x6b, 0x3a, 0, 0, 0],
    colours: [14, 0, 12, 15, 5, 0, 0, 0],
    map: [
      '11111111..4..1111111111111111111',
      '1.........4....................1',
      '1.........4....................1',
      '1.........4....................1',
      '1.........4....................1',
      '1.........4....................1',
      '1.........4....................1',
      '1.........4..55555.............1',
      '1.........4....................1',
      '1.........4.......55555........1',
      '1.........4....................1',
      '1.........4............55555...1',
      '1.........4....................1',
      '1.........4.......55555........1',
      '1.........4.....................',
      '1.........4..55555..............',
      '1.........4.....................',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
      '33333333333333333333333333333333',
    ],
    coins: [[15, 14], [21, 8]],
    cake: [19, 8], // the vault's prize, at the top
    enemies: [
      { col: 27, row: 12, colour: 10, dir: 0, type: 24, speed: 1, range: 24 }, // a teapot, along a shelf
    ],
  },
];
