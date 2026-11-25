/**
 * Mount Fuji's snow for Monty Mole: World Tour (region 4): the cap is a solid white (the tile `jpSnow`), and these one-character decorations finish it: the jagged lower edge
 * of the snow, the streaks running down the slopes from it, and the blue flanks' 45 degree edges. One character each, so a room can stamp as many as it likes. Every name starts `jp`.
 */
import { decor } from './decorations';
import { itemBlock } from './pixels';
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

/**
 * Mount Fuji's snowball (a roller, as the Andes' boulder), four rolling pictures (16 x 16, an item's block): a round ball of snow, its lower right shaded by two curved black lines (no dither), and three
 * clumps of packed snow on its face, each a short dark underside, a quarter turn on from the last picture as it rolls.
 */
function snowballFrame(turn: number): string[] {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7.4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 6, y - 6);
    if (x + y > 16 && (Math.abs(d - 7.4) < 0.5 || Math.abs(d - 9.2) < 0.5)) r.set(x, y, false); // the shading: two arcs round the lower right
  }
  for (let k = 0; k < 3; k++) {
    const a = ((k * 120 + 20 + turn * 30) * Math.PI) / 180;
    r.cut(['##'], Math.round(6.5 + Math.cos(a) * 3.8), Math.round(7.5 + Math.sin(a) * 3.8)); // a clump's dark underside, turning with the ball
  }
  return r.rows();
}
export const SNOWBALL_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((t) => itemBlock(`snowball ${t}`, snowballFrame(t)));
