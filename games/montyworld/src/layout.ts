import { enemyColours } from '../../montyotr/src/data';
import type { RoomSpec } from '../../shared/monty/rooms';
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
}

/** The first creature type of Moscow's in the enemy bank (Monty on the Run's are 8-34). */
export const FIRST_CREATURE = 35;
const creatureNames = Object.keys(WORLD_CREATURES);
const decorNames = Object.keys(WORLD_DECOR);

/** A decoration's type number (its place in the game's decoration list: what a `charAnims` entry names it by). */
export function decorIndex(name: WorldDecor): number {
  return decorNames.indexOf(name);
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
      decor: r.decor.map(([d, col, row]) => ({
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
  };
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
  backdrops.add(piece);
  const g = new Grid();
  paint(g);
  const cells: (readonly [WorldDecor, col: number, row: number])[] = [];
  // a backdrop that reaches the playfield's edge goes on to the screen's: the margin columns the picture shows either side (SCREEN_MARGIN of them) are as empty as the edge cell beside them
  const from = c0 <= 0 ? -SCREEN_MARGIN : c0, to = c1 >= PLAY_COLS - 1 ? PLAY_COLS - 1 + SCREEN_MARGIN : c1;
  for (let r = r0; r <= r1; r++) for (let c = from; c <= to; c++) {
    const at = Math.max(0, Math.min(PLAY_COLS - 1, c));
    if (g.at(at, r) === '.' && !keep.some(([kc, kr]) => kc === at && kr === r)) cells.push([piece, c, r]);
  }
  return cells;
}
