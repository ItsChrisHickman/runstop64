/**
 * Siberia's creatures for Monty Mole: World Tour (region 2), in Monty on the Run's formats and Moscow's manner (creatures.ts): bold
 * cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows,
 * fangs, seams), a big face with an expression, an animation that reads. A wolf, an owl, a reindeer, a ticket
 * inspector, a coal-faced miner, a yeti, a bat and a Baikal seal. No dither.
 */
import { lay, pair } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';

// ---- the wolf: grey, a big snarling face with ears up and fangs, loping

/** A wolf loping to the left, its great head turned out at us: slanting eyes, a black nose, the jaws apart on their fangs. */
function wolf(): NewCreature {
  const frame = (a: number, open: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 9, 11, 8 + a, 15, 2); limb(s, 13, 11, 13 - a, 15, 2); }); // the back legs
    r.ellipse(11.5, 10, 4.6, 3.3); // the body
    limb(r, 15, 8, 15.5, 5, 2); // the tail, up
    r.disc(6, 6.5, 5.2); // the head
    r.triangle(1, 4, 1.5, 0, 5, 2.6); // the ears
    r.triangle(7, 2.6, 10.5, 0, 11, 4.4);
    r.rect(2, 8, 10, 12); // the jaw, under the cheeks
    r.cut(['##.', '.##'], 2, 4); r.cut(['.##', '##.'], 7, 4); // the slanting eyes
    r.rect(3, 5, 3, 5); r.rect(8, 5, 8, 5); // the eyes' glints
    r.cut(['###', '###'], 5, 7); // the nose, black
    r.cut(open ? ['#########', '#########'] : ['#########'], 2, open ? 10 : 11); // the mouth
    r.stamp(open ? ['#.#.#.#.#'] : ['#.#.#.#'], open ? 2 : 3, open ? 10 : 11); // the fangs
    lay(r, (s) => { limb(s, 3, 12, 2 - a, 15, 2); limb(s, 8, 12, 8 + a, 15, 2); }); // the front legs
    return r.rows();
  };
  const left = [frame(1.5, true), frame(0, false), frame(-1.5, true), frame(0, false)];
  return pair('wolf', left, 12);
}

// ---- the owl: round, a lit face with two huge ringed eyes, ear tufts, flying

/** An owl in flight, seen front on: the wings up, level, down, level. */
function owl(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { // the wings, one each side
      const y = [1, 5, 10, 5][wing] ?? 5;
      s.triangle(4, 7, 0, y, 4, 12);
      s.triangle(11, 7, 15, y, 11, 12);
    });
    r.ellipse(7.5, 9, 4.3, 5.7); // the body
    r.triangle(3.3, 3.5, 3.2, 0, 5.5, 3); // the ear tufts
    r.triangle(11.7, 3.5, 11.8, 0, 9.5, 3);
    r.disc(5.4, 5.8, 2.6); r.disc(9.6, 5.8, 2.6); // the face's two discs
    r.cut(['.###.', '#####', '#####', '#####', '.###.'].map((x) => x), 3, 3.5); // (the dark rings of the eyes, filled below)
    r.cut(['.###.', '#####', '#####', '#####', '.###.'], 8, 3.5);
    r.rect(4, 5, 5, 6); r.rect(9, 5, 10, 6); // the pupils, lit
    r.triangle(6.6, 7.4, 8.4, 7.4, 7.5, 9.2, true); // the beak
    r.cut(['#.#.#'], 5, 11); r.cut(['#.#.#'], 5, 13); // the breast feathers, in rows
    r.cut(['#..#'], 5, 15);
    return r.rows();
  };
  const frames = [0, 1, 2, 3].map(frame);
  return pair('owl', frames, 7, true);
}

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

// ---- the nerpa: the Baikal seal, a big round face with huge eyes and whiskers, flippers out, shuffling over the ice

/** A Baikal seal shuffling over the ice, facing us: a round head with great dark eyes, a snout with whiskers, flippers out, the body arching. */
function nerpa(): NewCreature {
  const frame = (arch: number, flip: number) => {
    const r = new Raster(16, 16);
    r.ellipse(7.5, 11.5 - arch * 0.4, 6.3, 4.2 + arch * 0.3); // the round body
    lay(r, (s) => { s.triangle(1, 11, 0, 14 + flip, 4, 14); s.triangle(14, 11, 15, 14 - flip, 11, 14); }); // the flippers
    r.disc(7.5, 6, 5.5); // the big round head
    r.cut(['.##.', '####', '####', '.##.'], 3, 3); r.cut(['.##.', '####', '####', '.##.'], 9, 3); // the great eyes
    r.rect(4, 4, 4, 4); r.rect(10, 4, 10, 4); // their glints
    r.cut(['##'], 7, 7); // the nose
    r.cut(['#.#'], 6, 9); // the mouth
    for (const y of [7, 8]) { r.rect(0, y, 1, y, false); r.rect(14, y, 15, y, false); } // (the whiskers are the head's edge, shaved)
    r.cut(['#####'], 5, 13 + (arch ? 1 : 0)); // the belly's line
    return r.rows();
  };
  const left = [frame(0, 0), frame(1, 1), frame(0, 0), frame(1, -1)];
  return pair('nerpa', left, 15);
}

export const SIBERIA_CREATURES = {
  wolf: wolf(),
  owl: owl(),
  reindeer: reindeer(),
  inspector: inspector(),
  miner: miner(),
  yeti: yeti(),
  bat: bat(),
  nerpa: nerpa(),
} as const satisfies Record<string, NewCreature>;

export type SiberiaCreature = keyof typeof SIBERIA_CREATURES;
