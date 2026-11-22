/**
 * Mount Fuji's snow for Monty Mole: World Tour (region 4): the cap is a solid white (the tile `jpSnow`), and these one-character decorations finish it: the jagged lower edge
 * of the snow, the streaks running down the slopes from it, and the blue flanks' 45 degree edges. One character each, so a room can stamp as many as it likes. Every name starts `jp`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A one character decoration drawn from rows of text ('#' lit). */
function one(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
}

export const JAPAN_FUJI = {
  /** The snow's lower edge, three ways: white above, teeth pointing down over the slope. */
  jpSnowEdgeA: one('jpSnowEdgeA', ['########', '########', '########', '.#######', '.#.#####', '....##.#', '....#...', '........'], 1),
  jpSnowEdgeB: one('jpSnowEdgeB', ['########', '########', '########', '#####.##', '##.###.#', '#...##..', '#....#..', '........'], 1),
  jpSnowEdgeC: one('jpSnowEdgeC', ['########', '########', '########', '######.#', '.#.####.', '.....##.', '......#.', '........'], 1),
  /** A streak of snow running down the slope, two ways. */
  jpSnowStreakA: one('jpSnowStreakA', ['..#..#..', '..#..#..', '..#..#..', '.##..#..', '.#...#..', '.#...#..', '.#...##.', '.#....#.'], 1),
  jpSnowStreakB: one('jpSnowStreakB', ['#...#...', '#...#...', '##..#...', '.#..##..', '.#...#..', '.#...#..', '.....#..', '.....#..'], 1),
  /** The mountain's flanks: rock below a diagonal, on the left and on the right. */
  jpFlankL: one('jpFlankL', ['.......#', '......##', '.....###', '....####', '...#####', '..######', '.#######', '########'], 6),
  jpFlankR: one('jpFlankR', ['#.......', '##......', '###.....', '####....', '#####...', '######..', '#######.', '########'], 6),
} as const satisfies Record<string, NewDecor>;
