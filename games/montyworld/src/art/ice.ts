/**
 * The icicle's pictures (sprites 1 and 2 in the rooms that have them): hanging from its eave, half grown, just growing back, and
 * breaking on the floor. Each is a 16 x 16 picture in the top left of a sprite block with the icicle in its left 8 columns (the
 * sprite is placed on the icicle's column); the eave is the top row.
 */
import { itemBlock } from './pixels';

const BLANK = '.'.repeat(16);
const pad = (rows: readonly string[]): readonly string[] => [...rows, ...Array.from({ length: 16 - rows.length }, () => '')].map((r) => (r + BLANK).slice(0, 16));

const FULL = pad([
  '########',
  '.######.',
  '.#.####.',
  '.#.####.',
  '..#.##..',
  '..#.##..',
  '..####..',
  '..####..',
  '...##...',
  '...##...',
  '...##...',
  '...##...',
  '....#...',
  '....#...',
  '....#...',
  '....#...',
]);

export const ICICLE_FULL = itemBlock('icicle', FULL);
export const ICICLE_HALF = itemBlock('icicle half', pad(FULL.slice(0, 9).map((r, i) => (i === 8 ? '...#....' : r))));
export const ICICLE_SMALL = itemBlock('icicle small', pad(['########', '.######.', '..####..', '...##...', '....#...']));
export const ICICLE_SHARDS = itemBlock('icicle shards', pad([
  '', '', '', '', '', '', '', '', '', '', '',
  '.#....#.',
  '.#.##.#.',
  '##.##.##',
  '########',
  '#.#..#.#',
]));
