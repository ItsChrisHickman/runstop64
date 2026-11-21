import { enemyColours } from '../../montyotr/src/data';
import type { RoomSpec } from '../../shared/monty/rooms';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS } from '../../shared/monty/screen';
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
  coins?: readonly (readonly [col: number, row: number])[];
  /** A piece of cake: the sprite's top left cell. */
  cake?: readonly [col: number, row: number];
  /** A key item: its name, the sprite's top left cell and its pointer in the bank. */
  item?: { name: string; col: number; row: number; sprite: number };
  decor?: readonly (readonly [WorldDecor | { text: string; colour: number }, col: number, row: number])[];
  creatures?: readonly Creature[];
  /** Mole Crushers: the shaft's top cell, its height, its characters. */
  crushers?: readonly { col: number; row: number; height: number; chr: 0x10 | 0x22 }[];
}

/** The first creature type of Moscow's in the enemy bank (Monty on the Run's are 8-34). */
export const FIRST_CREATURE = 35;
const creatureNames = Object.keys(WORLD_CREATURES);
const decorNames = Object.keys(WORLD_DECOR);

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
  const map = g.rows().map((row) => [...row].map((c) => (c === '.' ? '.' : String(codeOf(r.palette, c)))).join(''));
  if (map.some((row) => row.includes('0'))) throw new Error(`room $${r.id.toString(16)}: a letter that is not in its palette`);
  const tiles = letters.map((l) => worldTileIndex(r.palette[l]?.[0] ?? 'snowGround'));
  const colours = letters.map((l) => r.palette[l]?.[1] ?? 1);
  return {
    id: r.id, row: r.cell[0], col: r.cell[1], sector: r.sector,
    tiles, colours: [...colours, ...Array.from({ length: 8 - colours.length }, () => 0)], map,
    ...(r.coins ? { coins: r.coins } : {}),
    ...(r.cake ? { cake: [r.cake[0] + PLAY_COL, r.cake[1] + PLAY_ROW] as const } : {}),
    ...(r.item ? { item: { name: r.item.name, col: r.item.col + PLAY_COL, row: r.item.row + PLAY_ROW, sprite: r.item.sprite } } : {}),
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
