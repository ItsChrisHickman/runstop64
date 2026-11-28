/**
 * The ice cave at Mount Fuji's foot (GONE WITH THE WIND, japan.ts; the real Narusawa Ice Cave and Fugaku Wind Cave are lava tubes there), in Japan's creatures' manner (japan-creatures.ts): bold
 * 16 x 16 figures in one bright ink, the detail cut in as black lines. The yuki-onna, the snow woman of Japan's snowy mountains, is the cave's danger: a pale woman in a white kimono with long hair,
 * no feet, drifting. The tengu, the long-nosed mountain goblin with a crow's wings and a feather fan, who in the legends whisks people away, is no danger: he hovers by the gust at the cave's end
 * fanning the wind into it (drawn in the room's characters, a colour each), and the gust carries Monty up and back onto the mountain. Every name starts `jp`.
 */
import { pair } from './creature-kit';
import { decor } from './decorations';
import { four } from './japan-bold';
import { characters } from './pixels';
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

// ---- the tengu: the long-nosed mountain goblin with a crow's wings and a feather fan, hovering beside the gust's beam and fanning the wind into it (Chris, 2026-11-26: the cameo that flew in and
// stood read as Viktor). Drawn in the room's own characters, 3 x 3, a colour a character (as no sprite could be: one ink): his crow's wings dark grey either side, white hair under a little cap, the red
// face with its very long nose pointing at the beam, a purple robe, the yellow feather fan. Two pictures, the wings up and the fan raised, the wings down and the fan swept: a cycle (japan.ts TENGU_ANIM).

/** A picture of 3 x 3 characters from its nine 8 x 8 cells (row by row). */
const cells3 = (c: readonly (readonly string[])[]): string[] => [0, 1, 2].flatMap((cr) => Array.from({ length: 8 }, (_, y) => [0, 1, 2].map((cc) => c[cr * 3 + cc]?.[y] ?? '........').join('')));
const HAIR = ['..####..', '.#....#.', '.#....#.', '########', '########', '#.####.#', '##.##.##', '########'];
const NOSE = ['........', '........', '........', '..######', '########', '...#####', '........', '........'];
const FACE = ['.######.', '########', '#..#####', '##.#####', '########', '########', '.######.', '..####..'];
const ROBE = ['.######.', '########', '########', '#.######', '########', '.######.', '.##..##.', '.##..##.'];
const EMPTY = Array.from({ length: 8 }, () => '........');
/** Wings up, the fan raised; wings down, the fan swept down. */
const TENGU_PICTURES = [
  cells3([
    ['#.......', '##......', '.##..#..', '.###.##.', '..######', '..######', '...#####', '....####'], HAIR, ['.......#', '......##', '..#..##.', '.##.###.', '######..', '######..', '#####...', '####....'],
    NOSE, FACE, ['####....', '#####...', '######..', '######..', '#####...', '####....', '###.....', '##......'],
    ['.####...', '######..', '######..', '######..', '.####...', '...#....', '...#....', '...#....'], ROBE, ['#.......', '##......', '.#......', ...EMPTY.slice(3)],
  ]),
  cells3([
    [...EMPTY.slice(5), '....####', '..######', '.#######'], HAIR, [...EMPTY.slice(5), '####....', '######..', '#######.'],
    NOSE, FACE, ['######..', '#######.', '########', '#######.', '######..', '#####.#.', '####..##', '###....#'],
    ['...#....', '...#....', '.####...', '######..', '######..', '######..', '######..', '.####...'], ROBE, ['##..#...', '#....#..', '.#....#.', ...EMPTY.slice(3)],
  ]),
] as const;
/** The tengu's colours, a character each: the wings dark grey, the hair white, the nose and face red, the fan yellow, the robe purple. */
const TENGU_COLOURS = ['B1B', '22B', '74B'] as const;
export const TENGU_FRAMES: readonly Uint8Array[] = TENGU_PICTURES.map((rows, k) => characters(`tengu ${k}`, rows, 3, 3));
const tenguPiece = (): NewDecor => {
  const r = new Raster(24, 24);
  r.stamp(TENGU_PICTURES[0], 0, 0);
  return decor('jpTengu', 3, 3, r, TENGU_COLOURS);
};

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

/**
 * The beam's top (Monty on the Run's teleporter cap, its characters $35-$37: the game's only teleporter is the gust, so its glyphs are the gust's): a mouth of wind under the tube's roof, the
 * streaks curling out of it either side and down into the beam.
 */
const CAP_ROWS = [
  ['..######', '.#......', '#..#####', '#.#.....', '#.#..###', '.#..#...', '...#..#.', '..#..#..'],
  ['########', '........', '########', '........', '.######.', '........', '..####..', '........'],
  ['######..', '......#.', '#####..#', '.....#.#', '###..#.#', '...#..#.', '.#..#...', '..#..#..'],
] as const;
export const GUST_CAP: readonly { chr: number; bytes: Uint8Array }[] = CAP_ROWS.map((rows, i) => ({ chr: 0x35 + i, bytes: characters(`gust cap ${i}`, rows, 1, 1) }));
/** The colours the beam and its top flicker through (Monty on the Run's are green and purple): the wind's, white and icy blues. */
export const GUST_COLOURS = Uint8Array.of(1, 3, 14, 3);

export const JAPAN_CAVE_DECOR = {
  jpGust: gustPiece(),
  jpTengu: tenguPiece(),
} as const satisfies Record<string, NewDecor>;
