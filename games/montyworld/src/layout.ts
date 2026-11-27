import { enemyColours } from '../../montyotr/src/data';
import { decorChars } from '../../montyotr/src/decor-chars';
import type { MontyData } from '../../montyotr/src/montydata';
import type { RoomSpec } from '../../shared/monty/rooms';
import { standX2, standY } from '../../montyotr/src/way-in';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, SCREEN_MARGIN } from '../../shared/monty/screen';
import { WORLD_CREATURES, WORLD_DECOR, worldTileIndex, type WorldCreature, type WorldDecor, type WorldTile } from './art/world';

/**
 * Rooms written the way they are drawn: a playfield of 32 by 20 cells painted with rectangles of a tile (each tile a letter of the
 * room's palette), then what stands in it (decorations, creatures, crushers, coins, items), all in playfield cells (column 0-31,
 * row 0-19); `room` turns one into runstop64's room format (`RoomSpec`), whose decorations, creatures and crushers are in screen
 * cells (the playfield starts at column 4, row 3).
 */

/** The palette of a room: a letter for each of up to eight tiles and its colour (the first is code 1, the next code 2...). */
export type Palette = Readonly<Record<string, readonly [WorldTile, colour: number]>>;

/** The playfield being painted. */
export class Grid {
  private readonly cells = Array.from({ length: PLAY_ROWS }, () => Array.from({ length: PLAY_COLS }, () => '.'));
  /** Paint the rectangle (corners inclusive) with a palette letter; '.' empties it. */
  box(c0: number, r0: number, c1: number, r1: number, letter: string): this {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const row = this.cells[r];
      if (row && c >= 0 && c < PLAY_COLS) row[c] = letter;
    }
    return this;
  }
  /** Empty the rectangle. */
  clear(c0: number, r0: number, c1: number, r1: number): this { return this.box(c0, r0, c1, r1, '.'); }
  /** The letter at a cell ('.' where empty or outside). */
  at(c: number, r: number): string { return this.cells[r]?.[c] ?? '.'; }
  /** Rows of letters. */
  rows(): string[] { return this.cells.map((r) => r.join('')); }
}

/** Which way a creature goes: where it starts is the end it walks away from. */
export type Way = 'right' | 'left' | 'up' | 'down';
const WAY: Readonly<Record<Way, 0 | 1 | 3 | 4>> = { right: 0, left: 1, up: 3, down: 4 };

/** A creature in a room: its top left cell (where it starts), which way it goes, its speed (pixels a step) and range (steps). */
export interface Creature { who: WorldCreature; col: number; row: number; way: Way; speed: number; range: number; colour?: number }

export interface MoscowRoom {
  id: number;
  /** Its cell in the exit grid. */
  cell: readonly [row: number, col: number];
  sector: number;
  palette: Palette;
  paint: (g: Grid) => void;
  /**
   * Edge cells shut with a wall because the room beside has a wall there (an open cell that meets a wall is a trap: he walks or jumps out of the room and lands inside it): which edge,
   * the rows (first, last) and the palette letter of the wall. games/montyworld/test/joins.ts holds every join of every region to it.
   */
  shut?: readonly (readonly [edge: 'left' | 'right', first: number, last: number, letter: string])[];
  coins?: readonly (readonly [col: number, row: number])[];
  /** A piece of cake: the sprite's top left cell. */
  cake?: readonly [col: number, row: number];
  /** The cake's sprite pointer, when it is not the game's food (an empanada beside the room's key item). */
  cakeSprite?: number;
  /** A key item: its name, the sprite's top left cell and its pointer in the bank. */
  item?: { name: string; col: number; row: number; sprite: number };
  /** A second key item (no cake then). */
  item2?: { name: string; col: number; row: number; sprite: number };
  decor?: readonly (readonly [WorldDecor | { text: string; colour: number }, col: number, row: number])[];
  creatures?: readonly Creature[];
  /** Mole Crushers: the shaft's top cell, its height, its characters. */
  crushers?: readonly { col: number; row: number; height: number; }[];
  /**
   * A teleport, only where it is a reward seen and understood (LESSONS.md: never a punishment for bad timing): Monty on the Run's beam (its cap's three cells at `col` - 1 to `col` + 1 on row `row`,
   * the beam under it from row `row` + 1, `height` + 1 cells), always open (no colour of its flicker shuts it), and where it sets him down: standing at `col`, `floor` of the room at exit grid cell `to`.
   */
  teleporter?: { col: number; row: number; height: number; to: { cell: readonly [row: number, col: number]; col: number; floor: number } };
}

/** The colour that would shut a teleporter while its flicker shows it (Monty on the Run's are shut one moment in four): one the flicker never takes, so ours are always open. */
const ALWAYS_OPEN = 0xff;

/** The first creature type of Moscow's in the enemy bank (Monty on the Run's are 8-34). */
export const FIRST_CREATURE = 35;
const creatureNames = Object.keys(WORLD_CREATURES);
const decorNames = Object.keys(WORLD_DECOR);

/**
 * A piece's number in the decoration library (what a room's `decor` and a `charAnims` or `floats` entry name it by: data.ts turns the latter into the room's region's
 * numbers, `decorKindIn`, as `buildRooms` turns the rooms').
 */
export function decorIndex(name: WorldDecor): number {
  return decorNames.indexOf(name);
}

/** The first character a room draws a piece in (0 where its room has none of it), whatever its region numbers the piece. */
export function pieceChar(data: MontyData, room: number, name: WorldDecor): number {
  const kind = data.decorKindIn(room, decorIndex(name));
  return kind === undefined ? 0 : decorChars(data, room)[kind] ?? 0;
}

/** A palette letter's code (1-8). */
export function codeOf(palette: Palette, letter: string): number {
  return Object.keys(palette).indexOf(letter) + 1;
}

/** One painted room as a `RoomSpec`. */
export function room(r: MoscowRoom): RoomSpec {
  const letters = Object.keys(r.palette);
  if (letters.length > 8) throw new Error(`room $${r.id.toString(16)}: ${letters.length} tiles, 8 at most`);
  const g = new Grid();
  r.paint(g);
  for (const [edge, first, last, letter] of r.shut ?? []) g.box(edge === 'left' ? 0 : PLAY_COLS - 1, first, edge === 'left' ? 0 : PLAY_COLS - 1, last, letter);
  const map = g.rows().map((row) => [...row].map((c) => (c === '.' ? '.' : String(codeOf(r.palette, c)))).join(''));
  if (map.some((row) => row.includes('0'))) throw new Error(`room $${r.id.toString(16)}: a letter that is not in its palette`);
  const tiles = letters.map((l) => worldTileIndex(r.palette[l]?.[0] ?? 'snowGround'));
  const colours = letters.map((l) => r.palette[l]?.[1] ?? 1);
  return {
    id: r.id, row: r.cell[0], col: r.cell[1], sector: r.sector,
    tiles, colours: [...colours, ...Array.from({ length: 8 - colours.length }, () => 0)], map,
    ...(r.coins ? { coins: r.coins } : {}),
    ...(r.cake ? { cake: [r.cake[0] + PLAY_COL, r.cake[1] + PLAY_ROW] as const } : {}),
    ...(r.cakeSprite === undefined ? {} : { cakeSprite: r.cakeSprite }),
    ...(r.item ? { item: { name: r.item.name, col: r.item.col + PLAY_COL, row: r.item.row + PLAY_ROW, sprite: r.item.sprite } } : {}),
    ...(r.item2 ? { item2: { name: r.item2.name, col: r.item2.col + PLAY_COL, row: r.item2.row + PLAY_ROW, sprite: r.item2.sprite } } : {}),
    ...(r.decor ? {
      decor: [...r.decor, ...underFinds(r, g)].map(([d, col, row]) => ({
        col: col + PLAY_COL, row: row + PLAY_ROW,
        type: typeof d === 'string' ? decorNames.indexOf(d) : d,
      })),
    } : {}),
    ...(r.creatures ? {
      enemies: r.creatures.map((c) => ({
        col: c.col + PLAY_COL, row: c.row + PLAY_ROW,
        colour: Math.max(0, enemyColours.indexOf(c.colour ?? WORLD_CREATURES[c.who].colour)),
        dir: WAY[c.way], type: FIRST_CREATURE + creatureNames.indexOf(c.who), speed: c.speed, range: c.range,
      })),
    } : {}),
    ...(r.crushers ? { crushers: r.crushers.map((c) => ({ ...c, col: c.col + PLAY_COL, row: c.row + PLAY_ROW })) } : {}),
    ...(r.teleporter ? {
      teleporter: {
        col: r.teleporter.col - 1 + PLAY_COL, row: r.teleporter.row + PLAY_ROW, height: r.teleporter.height, colour: ALWAYS_OPEN,
        to: { x2: standX2(r.teleporter.to.col), y: standY(r.teleporter.to.floor), mapRow: r.teleporter.to.cell[0], exitCol: r.teleporter.to.cell[1] },
      },
    } : {}),
  };
}

type Placement = readonly [WorldDecor | { text: string; colour: number }, col: number, row: number];

/**
 * The backdrop under the room's coins and finds (Chris: "the blue background has black holes"): a fill kept off a coin's or an item's cells (`fillCells`' keep lists, from before the engine drew a coin
 * over a backdrop and an item in front of one) left those cells black, before and after it was taken. Each such cell, empty in the paint and under no decoration, takes the one-character backdrop that
 * at least two of its four neighbours have (a pass at a time, so an item's 2 x 2 hole closes from its sides); a cell at a backdrop's edge (one neighbour) is left alone.
 */
function underFinds(r: MoscowRoom, g: Grid): Placement[] {
  const holes: (readonly [number, number])[] = [...(r.coins ?? [])];
  for (const it of [r.item, r.item2]) if (it) holes.push([it.col, it.row], [it.col + 1, it.row], [it.col, it.row + 1], [it.col + 1, it.row + 1]);
  const covered = new Set<number>(), fill = new Map<number, WorldDecor>();
  const key = (c: number, row: number) => row * 64 + c + SCREEN_MARGIN;
  for (const [d, col, row] of r.decor ?? []) {
    if (typeof d !== 'string') continue;
    const { w, h } = WORLD_DECOR[d];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) covered.add(key(col + x, row + y));
    if (w === 1 && h === 1 && backdrops.has(d)) fill.set(key(col, row), d);
  }
  const added: Placement[] = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const [c, row] of holes) {
      if (covered.has(key(c, row)) || g.at(c, row) !== '.') continue;
      const near = [[c - 1, row], [c + 1, row], [c, row - 1], [c, row + 1]].flatMap(([nc = 0, nr = 0]) => { const d = fill.get(key(nc, nr)); return d ? [d] : []; });
      const piece = near.find((d) => near.filter((e) => e === d).length >= 2);
      if (!piece) continue;
      covered.add(key(c, row)); fill.set(key(c, row), piece); added.push([piece, c, row]);
    }
  }
  return added;
}

/** The decorations used as backdrops (`fillCells`): the engine keeps them under the room's coins and shows them where a cell is cleared. */
const backdrops = new Set<WorldDecor>();
export const isBackdrop = (name: string): boolean => [...backdrops].some((b) => b === name);
/** A decoration of several cells drawn as a backdrop (Lapa's arches behind the street): kept under a coin in it, shown where a cell of it is cleared. Returns the piece. */
export function asBackdrop<T extends WorldDecor>(piece: T): T {
  backdrops.add(piece);
  return piece;
}

/**
 * A one-character decoration stamped on every cell of a rectangle (columns c0-c1, rows r0-r1) that the room's paint leaves empty, except the `keep` cells (a coin, an
 * item, a pulse's cells): a backdrop (a sky's bands, a sea, a wall seen behind) at the cost of one character however many are placed.
 */
export function fillCells(paint: (g: Grid) => void, keep: readonly (readonly [col: number, row: number])[], [c0, r0, c1, r1]: readonly [number, number, number, number], piece: WorldDecor): (readonly [WorldDecor, col: number, row: number])[] {
  return fillWhere(paint, keep, (col, row) => col >= c0 && col <= c1 && row >= r0 && row <= r1, piece);
}

/**
 * `fillCells` over a shape rather than a rectangle: the one-character backdrop on every empty cell where `inside(col, row)` holds (a slope under its ridge line, a cliff's silhouette over the sea). The
 * screen's margin columns either side take the edge cell's answer.
 */
export function fillWhere(paint: (g: Grid) => void, keep: readonly (readonly [col: number, row: number])[], inside: (col: number, row: number) => boolean, piece: WorldDecor): (readonly [WorldDecor, col: number, row: number])[] {
  backdrops.add(piece);
  const g = new Grid();
  paint(g);
  const cells: (readonly [WorldDecor, col: number, row: number])[] = [];
  for (let r = 0; r < PLAY_ROWS; r++) for (let c = -SCREEN_MARGIN; c < PLAY_COLS + SCREEN_MARGIN; c++) {
    const at = Math.max(0, Math.min(PLAY_COLS - 1, c));
    if (inside(at, r) && g.at(at, r) === '.' && !keep.some(([kc, kr]) => kc === at && kr === r)) cells.push([piece, c, r]);
  }
  return cells;
}
