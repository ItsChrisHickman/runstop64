/**
 * Moscow's tiles for Monty Mole: World Tour: 8 x 8 hires characters for a room's codes 1-8, each with the collision class it
 * takes in Monty on the Run's rules (types.ts) and the colour it is meant to be shown in. All new, made in Monty on the Run's
 * style: one ink on black, chunky, textured the way its own ground, brick and ledges are.
 *
 * Written as pictures ('#' lit, '.' dark; pixels.ts). Their library indexes follow the original's 121 (`MOTR_TILE_COUNT`), in
 * the order of `MOSCOW_TILE_LIST`.
 */
import { characters } from './pixels';
import type { Colour, NewTile, TileClass } from './types';

/** How many tiles the original's library has: the first new tile is this index. */
export const MOTR_TILE_COUNT = 121;

function tile(name: string, cls: TileClass, colour: Colour, rows: readonly string[]): NewTile {
  return { chr: characters(`tile ${name}`, rows, 1, 1), cls, colour };
}

export const MOSCOW_TILES = {
  /** Snow-covered ground: drifts along the top, packed snow below. Solid. */
  snowGround: tile('snowGround', 1, 1, [
    '..#...#.',
    '.#####.#',
    '########',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
  ]),
  /** Packed snow to fill under the drifts. Solid. */
  snowFill: tile('snowFill', 1, 1, [
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
  ]),
  /** Red Square's cobbles, in staggered rows. Solid. */
  cobbles: tile('cobbles', 1, 12, [
    '.##..##.',
    '###..###',
    '###..###',
    '.##..##.',
    '#..##..#',
    '#.####.#',
    '#.####.#',
    '#..##..#',
  ]),
  /** The Kremlin wall's red brick. Solid. */
  kremlinBrick: tile('kremlinBrick', 1, 2, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** The wall's top with its swallowtail battlements (a notch in each, a gap between). Solid. */
  battlement: tile('battlement', 1, 2, [
    '##...##.',
    '###.###.',
    '#######.',
    '#######.',
    '#######.',
    '########',
    '########',
    '########',
  ]),
  /** The metro's glossy wall tiles. Solid. */
  metroTile: tile('metroTile', 1, 15, [
    '###.###.',
    '#.#.#.#.',
    '###.###.',
    '........',
    '###.###.',
    '#.#.#.#.',
    '###.###.',
    '........',
  ]),
  /** The GUM arcade's chequered marble. Solid. */
  arcadeFloor: tile('arcadeFloor', 1, 15, [
    '####....',
    '####....',
    '####....',
    '####....',
    '....####',
    '....####',
    '....####',
    '....####',
  ]),
  /** A fluted pillar for the arcade and the metro's halls. Solid. */
  pillar: tile('pillar', 1, 15, [
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
  ]),
  /** A ledge with snow heaped on it and icicles under it. A floor. */
  snowLedge: tile('snowLedge', 2, 3, [
    '.#...#..',
    '#####.##',
    '########',
    '#.##.#.#',
    '..#...#.',
    '........',
    '........',
    '........',
  ]),
  /** The metro platform's edge: the warning strip along it. A floor. */
  platformEdge: tile('platformEdge', 2, 7, [
    '########',
    '##..##..',
    '.##..##.',
    '..##..##',
    '########',
    '........',
    '........',
    '........',
  ]),
  /** An iron girder for the arcade's roof and the station's gantries. A floor. */
  girder: tile('girder', 2, 12, [
    '########',
    '#.#..#.#',
    '.#.##.#.',
    '########',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The metro's escalator: handrails and the steps going by. He rides it up and down like a rope. A rope. */
  escalator: tile('escalator', 3, 15, [
    '#.####.#',
    '#.#..#.#',
    '#.####.#',
    '#......#',
    '#.####.#',
    '#.#..#.#',
    '#.####.#',
    '#......#',
  ]),
  /** An iron ladder (rails and rungs). A rope. */
  ironLadder: tile('ironLadder', 3, 7, [
    '#......#',
    '########',
    '#......#',
    '#......#',
    '#......#',
    '########',
    '#......#',
    '#......#',
  ]),
  /** Icicles hanging from an eave. Deadly. */
  icicles: tile('icicles', 4, 3, [
    '########',
    '.##..##.',
    '.##..##.',
    '..#...#.',
    '..#...#.',
    '..#...#.',
    '........',
    '........',
  ]),
  /** The live rail beside a metro track, its sparks jumping. Deadly. */
  thirdRail: tile('thirdRail', 4, 2, [
    '..#..#..',
    '.#.##.#.',
    '#..#..#.',
    '########',
    '.#.##.#.',
    '########',
    '#..##..#',
    '........',
  ]),
} as const satisfies Record<string, NewTile>;

export type MoscowTile = keyof typeof MOSCOW_TILES;

/** The new tiles in library order. */
export const MOSCOW_TILE_LIST: readonly NewTile[] = Object.values(MOSCOW_TILES);

/** A tile's index in the library (the original's, then these). */
export function moscowTileIndex(name: MoscowTile): number {
  return MOTR_TILE_COUNT + Object.keys(MOSCOW_TILES).indexOf(name);
}
