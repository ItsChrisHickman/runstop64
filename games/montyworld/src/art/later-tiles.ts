/**
 * Tiles made for rooms added to a region after it shipped (later-sectors.ts: the bonus rooms off the path, 2026-11-25). They come last in the tile library (art/world.ts),
 * after every region's, so no shipped tile's number moves. Each is drawn in its region's manner (one bright ink on black, solid shapes cut with black lines).
 */
import { tile } from './tiles';
import type { NewTile } from './types';

export const LATER_TILES = {
  /** A pine bough heavy with snow (Siberia's taiga): a lumpy load of snow on a thin branch. A floor: the load slides off under him if he stands (`TAIGA_BOUGHS`). */
  boughSnow: tile('boughSnow', 2, 1, [
    '.##.###.',
    '########',
    '########',
    '.######.',
    '########',
    '..#..#..',
    '........',
    '........',
  ]),
  /** The same as the load starts to slide: the snow broken into clumps. A floor. */
  boughSlide: tile('boughSlide', 2, 1, [
    '.#...##.',
    '##.#.###',
    '#.###.##',
    '.#.##.#.',
    '########',
    '..#..#..',
    '........',
    '........',
  ]),
  /** The last of it falling: a few clumps over the bare branch. A floor (for a moment). */
  boughBare: tile('boughBare', 2, 1, [
    '........',
    '.#....#.',
    '...#....',
    '#.....#.',
    '########',
    '..#..#..',
    '........',
    '........',
  ]),
  /** A Houhai pleasure boat's gunwale (Beijing): the painted rail over the hull's planks. A floor: the boat carries him (floats.ts). */
  boatHull: tile('boatHull', 2, 2, [
    '########',
    '#.#.#.#.',
    '########',
    '........',
    '########',
    '########',
    '.######.',
    '..####..',
  ]),
} as const satisfies Record<string, NewTile>;
