/**
 * Siberia's creatures for Monty Mole: World Tour (region 2), in Monty on the Run's formats and Moscow's manner (creatures.ts): bold
 * cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows,
 * fangs, seams), a big face with an expression, an animation that reads. A reindeer, a ticket
 * inspector, a coal-faced miner, a yeti and a bat. No dither.
 */
import { lay, pair } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';

// ---- the reindeer: brown, a great rack of antlers, a big face with a black nose

/** A reindeer trotting to the left, its long face turned out at us under a great rack of antlers. */
function reindeer(): NewCreature {
  const frame = (a: number, nod: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 9, 11, 8.5 + a, 15, 2); limb(s, 14, 11, 14 - a, 15, 2); });
    r.ellipse(11.5, 10.5, 4.5, 3); // the body
    r.rect(15, 8, 15, 9); // the tail
    lay(r, (s) => { limb(s, 3.5, 12, 3 - a, 15, 2); limb(s, 7.5, 12, 7.5 + a, 15, 2); });
    r.ellipse(5, 7.5 + nod, 4.2, 4.6); // the long face
    r.ellipse(5, 11 + nod, 2.4, 2.2); // the muzzle
    lay(r, (s) => { // the antlers: a beam each side, each with its tines
      s.line(2, 4 + nod, 0.5, 0); s.line(1.2, 2, 3.5, 1); s.line(1.6, 3, 0, 2.6);
      s.line(8, 4 + nod, 9.5, 0); s.line(9.2, 2, 6.8, 1); s.line(8.8, 3, 11.2, 2.6);
      s.line(7, 3.5, 13, 3.6);
    });
    r.cut(['##', '##'], 2, 6 + nod); r.cut(['##', '##'], 7, 6 + nod); // the eyes
    r.rect(3, 6 + nod, 3, 6 + nod); r.rect(8, 6 + nod, 8, 6 + nod);
    r.cut(['###', '###'], 4, 10 + nod); // the black nose
    r.cut(['#'], 5, 13 + nod); // the mouth
    return r.rows();
  };
  const left = [frame(1.5, 0), frame(0, 1), frame(-1.5, 0), frame(0, 1)];
  return pair('reindeer', left, 9);
}

// ---- the ticket inspector: a peaked cap, a stern face with a black moustache, a long coat, the punch in his raised hand

/** The inspector's legs, rows 14 and 15, in four steps. */
const INSPECTOR_STEPS: readonly (readonly [string, string])[] = [
  ['....###..###....', '....###..###....'],
  ['...###....###...', '...###....###...'],
  ['....###..###....', '...###....###...'],
  ['...###....###...', '....###..###....'],
];

/** A ticket inspector marching, drawn row by row: the cap, the face, the coat; his punch hand up at the right. */
function inspector(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = INSPECTOR_STEPS[step] ?? INSPECTOR_STEPS[0] ?? ['', ''];
    return [
      '....########....',
      '....##.##.##....',
      '...##########...',
      '.##############.',
      '....########....',
      '....#..##..#....',
      '....########....',
      '....#......#....',
      '....########....',
      '................',
      '...##########.#.',
      '...####..#####.#',
      '...##.#..#.####.',
      '...####..####...',
      a, b,
    ];
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('inspector', left, 5);
}

// ---- the miner: an orange helmet with its lamp, a face black with coal and two white eyes, a lit grin, a pickaxe over the shoulder

/** The miner's legs, rows 14 and 15, in four steps. */
const MINER_STEPS = INSPECTOR_STEPS;

/** A coal-faced miner marching, drawn row by row: the face is dark (coal) with only its eyes and teeth lit; the pickaxe over his right shoulder. */
function miner(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = MINER_STEPS[step] ?? MINER_STEPS[0] ?? ['', ''];
    const body = [
      '.....####.......',
      '....######.####.',
      '...########.####',
      '..##########.##.',
      '..#........#.#..',
      '..#.##..##.#.#..',
      '..#.##..##.#.#..',
      '..#........#.#..',
      '..#.#.##.#.#.#..',
      '..#..####..#.#..',
      '...########..#..',
      '..##########.#..',
      '..####.##.####..',
      '..##########....',
    ];
    return [...body, a, b];
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('miner', left, 8);
}

// ---- the yeti: huge, white and shaggy, a black face with lit eyes and fangs

/** The yeti's feet, rows 14 and 15, in two steps. */
const YETI_STEPS: readonly (readonly [string, string])[] = [
  ['.....##..##.....', '....###..###....'],
  ['....##....##....', '...###....###...'],
];

/** A yeti stomping to the left, drawn row by row: the head with its dark face and fangs, the arms out, the shag in gaps. */
function yeti(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = YETI_STEPS[step & 1] ?? YETI_STEPS[0] ?? ['', ''];
    const arms = step & 1 ? ['################', '###.########.###', '##..######..####'.slice(0, 16)] : ['.##############.', '###.########.###', '###..######..###'];
    return [
      '................',
      '.....######.....',
      '...##########...',
      '..############..',
      '..##........##..',
      '..##.##..##.##..',
      '..##........##..',
      '..##.#.##.#.##..',
      '...##########...',
      ...arms,
      '.##...####...##.',
      '.##..######..##.',
      a, b,
    ].slice(0, 16);
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('yeti', left, 1);
}

// ---- the bat: wings spread and flapping, a face with two ears and a pair of fangs

/** A bat flapping, seen front on: the wings down, level, up, level; their edges scalloped. */
function bat(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => {
      const tip = [11, 6, 1, 6][wing] ?? 6;
      s.triangle(6, 6, 0, tip, 1, tip + 5);
      s.triangle(6, 6, 1, tip + 5, 6, 12);
      s.triangle(9, 6, 15, tip, 14, tip + 5);
      s.triangle(9, 6, 14, tip + 5, 9, 12);
      s.rect(2, tip + 3, 2, tip + 5, false); s.rect(13, tip + 3, 13, tip + 5, false); // the scallops
    });
    r.ellipse(7.5, 9, 2.6, 4); // the body
    r.disc(7.5, 5, 2.8); // the head
    r.triangle(4.8, 3.6, 4.8, 0, 6.6, 2.6); // the ears
    r.triangle(10.2, 3.6, 10.2, 0, 8.4, 2.6);
    r.rect(6, 4, 6, 4, false); r.rect(9, 4, 9, 4, false); // the eyes
    r.rect(6, 6, 9, 6, false); r.rect(6, 7, 6, 7); r.rect(9, 7, 9, 7); // the mouth, fangs
    return r.rows();
  };
  const frames = [0, 1, 2, 3].map(frame);
  return pair('bat', frames, 4, true);
}

export const SIBERIA_CREATURES = {
  reindeer: reindeer(),
  inspector: inspector(),
  miner: miner(),
  yeti: yeti(),
  bat: bat(),
} as const satisfies Record<string, NewCreature>;

export type SiberiaCreature = keyof typeof SIBERIA_CREATURES;
