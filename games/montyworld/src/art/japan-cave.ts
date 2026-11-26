/**
 * The ice cave at Mount Fuji's foot (GONE WITH THE WIND, japan.ts; the real Narusawa Ice Cave and Fugaku Wind Cave are lava tubes there), in Japan's creatures' manner (japan-creatures.ts): bold
 * 16 x 16 figures in one bright ink, the detail cut in as black lines. The yuki-onna, the snow woman of Japan's snowy mountains, is the cave's danger: a pale woman in a white kimono with long hair,
 * no feet, drifting. The tengu, the long-nosed mountain goblin with a crow's wings and a feather fan, who in the legends whisks people away, is no danger: he flies in to the gust at the cave's end
 * and beckons with his fan (a cameo: cameos.ts, his frames as a creature's eight), and the gust carries Monty up to the summit. Every name starts `jp`.
 */
import { pair } from './creature-kit';
import { decor } from './decorations';
import { four } from './japan-bold';
import { characters, creatureBank, mirrored } from './pixels';
import { Raster } from './raster';
import type { NewCreature, NewDecor } from './types';

// ---- the yuki-onna: long hair round a pale face (eyes shut), a white kimono with its crossed collar and sash, a sleeve reaching out, her hem fraying into wisps of snow where her feet should be

/** The yuki-onna going left: her head and kimono, the hem's wisps drifting a pixel a picture. */
const YUKI_BODY = [
  '......#####.....',
  '.....#######....',
  '....#.....###...',
  '....#.#.#.####..',
  '....#.....####..',
  '....#..#..####..',
  '.....#...#####..',
  '......#######...',
  '..###.##.###....',
  '.##.##..##.##...',
  '##...#.##..###..',
  '#....######.##..',
  '.....#.##.####..',
  '....######.####.',
] as const;
const YUKI_HEM = ['...##.#.###.###.', '..#..#..#..#..#.'] as const;
function yukiOnna(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    r.stamp(YUKI_BODY, 0, 0);
    r.stamp(YUKI_HEM, [0, 1, 0, -1][t] ?? 0, 14); // the wisps, swaying as she drifts
    return r.rows();
  };
  return pair('jpYukiOnna', four(frame), 1);
}

export const JAPAN_CAVE_CREATURES = {
  jpYukiOnna: yukiOnna(),
} as const satisfies Record<string, NewCreature>;

// ---- the tengu: a red face with a very long nose and a fierce brow, a little black cap, a robe, a crow's wings at his back; standing, he holds out his feather fan

/** The tengu standing, facing left: cap, head, the long nose, the folded wing's tip behind him, the fan held out low in front, the robe and the geta. */
const TENGU_STAND = [
  '..........##....',
  '........######..',
  '.......#..#####.',
  '.......#.######.',
  '###########.###.',
  '.##########.###.',
  '........######.#',
  '.........####.##',
  '.......#########',
  '.###..##########',
  '#####.#.#######.',
  '#####..#######..',
  '.###...#######..',
  '..#...########..',
  '.....#########..',
  '.....##.#..##...',
] as const;
/** Picture `pose` of the tengu facing left: 0 and 1 flying (the fan put away, the wings beating up and down), 2 standing with his fan held out (he beckons: the gust), 3 the same. */
function tengu(pose: number): string[] {
  const r = new Raster(16, 16);
  r.stamp(TENGU_STAND, 0, 0);
  if (pose < 2) {
    r.rect(0, 9, 5, 13, false); // the fan put away
    r.rect(13, 6, 15, 8, false);
    if (pose === 0) r.triangle(11, 8, 15, 0, 15, 7); else r.triangle(11, 9, 15, 15, 15, 9); // the wing beating up, and down
    r.line(11, 8, 11, 12, false); // its edge against the robe
  }
  return r.rows();
}
const TENGU_LEFT = [0, 1, 2, 3].map(tengu);
/** The tengu's eight pictures (the cameo's: two flying, the beckon and again, going left; their mirrors going right), in a creature's bank layout. */
export const TENGU_CAMEO: Uint8Array = creatureBank('tengu cameo', TENGU_LEFT, TENGU_LEFT.map(mirrored));
/** His ink: red, the tengu's face. */
export const TENGU_INK = 2;

// ---- the gust: the wind rising round the tengu's beam (Monty on the Run's teleporter), streaks curling upwards, one character stamped down either side of it and turned by a cycle (japan.ts GUST_ANIM)

/** The gust's picture `k` of four: two streaks curling up, `k` quarters of the way round their rise (two pixels a step: the wind going up). */
function gustRows(k: number): string[] {
  const base = ['#.......', '.#...#..', '..#...#.', '..#...#.', '.#....#.', '#....#..', '#...#...', '.#.#....'];
  return base.map((_, y) => base[(y + 2 * k) % 8] ?? '........');
}
export const GUST_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((k) => characters(`gust ${k}`, gustRows(k), 1, 1));
const gustPiece = (): NewDecor => {
  const r = new Raster(8, 8);
  r.stamp(gustRows(0), 0, 0);
  return decor('jpGust', 1, 1, r, 1);
};

export const JAPAN_CAVE_DECOR = {
  jpGust: gustPiece(),
} as const satisfies Record<string, NewDecor>;
