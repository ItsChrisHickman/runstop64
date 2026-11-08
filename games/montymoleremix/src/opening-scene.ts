import { OPENING_ATTRS, OPENING_COLS, OPENING_GLYPHS, OPENING_MAP } from '../../montymole/src/data';
import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';
import { C64_OF, LIBRARY, libraryRows, PROP, type RemixRoom, type Slot } from './retile';

/**
 * The opening scene (the house, the pit head, the oak, the water: Wanted's pseudo-room `$2C`) redrawn as Monty on the Run's rooms are: black
 * sky, flat colours, Monty on the Run's rock and ledge and water for what Monty stands on and what kills him, and Wanted's own pictures,
 * recoloured for a C64 character (one colour and the black beyond it), for what is only to look at. The scene's 28 x 20 cells are the room's
 * columns 2 to 29, as in the original (a house's wall and a stretch of ground are added at the two ends: the original has no wall, and Monty
 * falls off the ends of it).
 *
 * What is solid, what holds from above and what kills is set here by place (the way the rooms' cells are classes), not read from the
 * picture: the earth under the path (rows 14 to 19), the pool in it (a hazard to the bottom, as every lake of the rooms is), the footbridge's two
 * ends over the pool, the house's wall, and the gate on the right, which stays shut until Monty has the bucket.
 */

/** The scene's columns in the room's: the scene's first cell is the room's third. */
export const SCENE_LEFT = 2;
/** The path Monty walks on is the top of the earth: row 14 (the original's y `$4F` is his top line, a box of rows 12 and 13 over it). */
const EARTH_ROW = 14;
/** The row of his box's top line on the path. */
export const SCENE_PATH_ROW = EARTH_ROW - 2;
/** The gate, closing the way on at the right: one column, five cells high from the path up. */
export const GATE = { col: 28, top: 9, cells: 5 } as const;
/** The house's wall at the left, solid from the roof's foot down to the path (its right edge is the original's x 44). */
const WALL = { cols: 5, top: 9 } as const;
/** Monty's way in at the left, by the house (the pixel x of his box: the wall ends at 40), and the first character code the scene's own pictures take. */
export const SCENE_START_X = 40;
/**
 * The characters the scene's own pictures may use: blank in Monty on the Run's set. The crusher's (`$10-$2F`) are among them: no room
 * of the scene has a crusher, and a room loaded after it draws its own over them; the coal's (`$0A`) is too.
 */
const span = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const FREE_CHARS: readonly number[] = [...span(0x0a, 0x33), ...span(0x38, 0x3b), ...span(0x9b, 0xcc), ...span(0xd0, 0xff)];

/** A picture the scene draws a cell with. */
export interface SceneChar { readonly rows: Uint8Array; readonly colour: number }

export interface SceneArt {
  /** 32 x 20 codes: 0 empty, 1-8 a tile slot, more a character of `chars` */
  readonly cells: Uint8Array;
  readonly slots: readonly Slot[];
  /** the characters the scene needs, by code */
  readonly chars: ReadonlyMap<number, SceneChar>;
  /** the room's theme byte: the water turns */
  readonly theme: number;
  /** what is behind each cell of the gate, by its place in the room's cells (the code it has when the gate is open) */
  readonly behind: ReadonlyMap<number, number>;
}

const SLOT = { earth: 1, water: 2, bed: 3, ledge: 4, wall: 5, gate: 6 } as const;

const slots: readonly Slot[] = [
  { role: 'solid', rows: libraryRows(LIBRARY.rock), colour: C64_OF[2] ?? 2, prop: PROP.solid, tile: LIBRARY.rock },
  { role: 'deadly', rows: libraryRows(LIBRARY.water), colour: C64_OF[5] ?? 3, prop: PROP.deadly, tile: LIBRARY.water },
  { role: 'deadly', rows: libraryRows(LIBRARY.rock), colour: C64_OF[2] ?? 2, prop: PROP.deadly, tile: LIBRARY.rock },
  { role: 'platform', rows: libraryRows(LIBRARY.ledge), colour: C64_OF[6] ?? 7, prop: PROP.platform, tile: LIBRARY.ledge },
  { role: 'solid', rows: libraryRows(LIBRARY.brick), colour: C64_OF[7] ?? 1, prop: PROP.solid, tile: LIBRARY.brick },
  { role: 'solid', rows: libraryRows(LIBRARY.rock), colour: C64_OF[3] ?? 4, prop: PROP.solid, tile: LIBRARY.rock },
];

/** The colour of the water in the original's scene (cyan ink on yellow). */
const WATER_ATTR = 0x75;
/** The trunk's colour (the C64's red: the hires colours have no brown). */
const TRUNK = C64_OF[2] ?? 2;
/** The Spectrum's sky: the cyan paper. A cell of it is black in the remix. */
const SKY = 5;

/**
 * A scene cell as a C64 character: one colour on black. Black ink over a paper (the ground, the grass) is the paper's colour with the ink's
 * pixels as holes; over the sky it is the sky left out and the pixels drawn white; a coloured ink is drawn as it is and its paper left out.
 */
export function look(glyph: Uint8Array, attr: number): SceneChar | null {
  const ink = attr & 7, paper = (attr >> 3) & 7;
  const blank = glyph.every((b) => b === 0);
  const solid = new Uint8Array(8).fill(0xff);
  const as = (rows: Uint8Array, colour: number): SceneChar | null => (rows.every((b) => b === 0) ? null : { rows, colour });
  if (ink === paper) return as(solid, C64_OF[paper] ?? 1);
  // (a cell with no pixel over a black paper is the oak's trunk, which the original paints black: red here, since black is the sky)
  if (paper === 0) return blank ? as(solid, TRUNK) : as(Uint8Array.from(glyph), C64_OF[ink] ?? 1);
  if (ink === 0) return paper === SKY ? as(Uint8Array.from(glyph), 1) : as(glyph.map((b) => ~b & 0xff), C64_OF[paper] ?? 1);
  return as(Uint8Array.from(glyph), C64_OF[ink] ?? 1);
}

/** The scene's cell at the room's (col, row), as scene data (the ends beyond the original's columns take the nearest). */
function sceneCell(col: number, row: number): { glyph: Uint8Array; attr: number } {
  const c = Math.min(OPENING_COLS - 1, Math.max(0, col - SCENE_LEFT));
  const at = row * OPENING_COLS + c;
  const g = ((OPENING_MAP[at] ?? 0x80) - 0x80) * 8;
  return { glyph: OPENING_GLYPHS.subarray(g, g + 8), attr: OPENING_ATTRS[at] ?? 0 };
}

function build(): SceneArt {
  const cells = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  const behind = new Map<number, number>();
  const chars = new Map<number, SceneChar>();
  const known = new Map<string, number>();
  const free = [...FREE_CHARS];
  const decor = (col: number, row: number): number => {
    const { glyph, attr } = sceneCell(col, row);
    const c = look(glyph, attr);
    if (c === null) return 0;
    const key = `${c.colour}:${c.rows.join(',')}`;
    let code = known.get(key);
    if (code === undefined) {
      code = free.shift();
      if (code === undefined) throw new Error('the opening scene needs more characters than Monty on the Run leaves free');
      known.set(key, code);
      chars.set(code, c);
    }
    return code;
  };
  // the pool: the cells of the original drawn in the water's colours (`$75`: the colour the original makes deadly), from the path down
  const pool = new Set<number>();
  for (let col = SCENE_LEFT; col < SCENE_LEFT + OPENING_COLS; col++) for (let row = EARTH_ROW; row < ROOM_ROWS; row++) if (sceneCell(col, row).attr === WATER_ATTR) pool.add(row * ROOM_COLS + col);
  const poolCols = new Set([...pool].map((at) => at % ROOM_COLS));
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const at = row * ROOM_COLS + col;
      const { glyph } = sceneCell(col, row);
      let code: number;
      if (row >= EARTH_ROW) {
        code = pool.has(at) ? SLOT.water : poolCols.has(col) ? SLOT.bed : SLOT.earth;
      } else if (row === EARTH_ROW - 1 && col >= WALL.cols + 3 && col < SCENE_LEFT + OPENING_COLS && glyph.some((b) => b !== 0)) {
        code = SLOT.ledge; // (the footbridge's two ends: what is drawn on the path's row, away from the house's step)
      } else if (col === GATE.col && row >= GATE.top && row < GATE.top + GATE.cells) {
        behind.set(at, decor(col, row));
        code = SLOT.gate;
      } else if (col < WALL.cols && row >= WALL.top) {
        code = SLOT.wall;
      } else {
        code = decor(col, row);
      }
      cells[at] = code;
    }
  }
  return { cells, slots, chars, theme: 0x80 | (SLOT.water - 1), behind };
}

/** The scene, made once. */
export const SCENE: SceneArt = build();

/** The scene as a room, for what loads a room's tiles and cells. */
export const SCENE_ROOM: RemixRoom = { id: 0x2c, cells: SCENE.cells, slots: SCENE.slots, coal: [], theme: SCENE.theme, floorCode: 0 };
