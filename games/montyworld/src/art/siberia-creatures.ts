/**
 * Siberia's creatures for Monty Mole: World Tour (region 2), in Monty on the Run's formats and Moscow's manner (creatures.ts): bold
 * cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows,
 * fangs, seams), a big face with an expression, an animation that reads. A wolf, a bear on all fours, an owl, a reindeer, a ticket
 * inspector, a coal-faced miner, a yeti, a bat and a Baikal seal. No dither.
 */
import { creatureBank, mirrored } from './pixels';
import { limb, over, Raster } from './raster';
import type { NewCreature } from './types';

/** A shape on its own raster, laid over `r` with a black moat round it (raster.ts `over`). */
function lay(r: Raster, draw: (s: Raster) => void) {
  const s = new Raster(16, 16);
  draw(s);
  over(r, s);
}

/** The four frames of a creature that goes left, and its mirror for going right. */
function pair(name: string, left: readonly (readonly string[])[], colour: number, copy = false): NewCreature {
  return { frames: creatureBank(name, left, left.map(mirrored)), copy, colour };
}

// ---- the wolf: grey, ears up, a long snout and a snarl, running

/** A wolf running to the left: the four legs in their strides (front pair, back pair), the jaws opening as it goes. */
function wolf(): NewCreature {
  const frame = (front: number, back: number, open: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 5.5, 10, 4 - front, 15, 2); limb(s, 7.5, 10, 8 + front, 15, 2); }); // the front legs
    lay(r, (s) => { limb(s, 11, 10, 10 - back, 15, 2); limb(s, 12.5, 10, 14 + back, 15, 2); }); // the back legs
    r.ellipse(9, 8.5, 5.6, 3.4); // the body
    limb(r, 13, 6.5, 15, 3, 2); // the tail, up
    r.disc(4, 6, 3); // the head
    r.triangle(0, 8, 3, 5.2, 4.5, 8.6); // the snout
    r.triangle(2.6, 4, 3.5, 0.5, 5.4, 3.6); // the ears
    r.triangle(5.2, 3.6, 6.4, 0.8, 7.4, 4.4);
    r.cut(['##', '.#'], 3, 5); // the eye, a slanting slit
    if (open) { r.cut(['######'], 0, 9); r.stamp(['#.#.#'], 1, 9); } // the jaws apart, the fangs
    else r.cut(['####'], 0, 8);
    r.cut(['#'], 0, 7); // the nostril
    r.cut(['.##.', '#..#'], 7, 7); // the shoulder's fur
    return r.rows();
  };
  const left = [frame(1.5, -1.5, true), frame(0, 0, false), frame(-1.5, 1.5, true), frame(0, 0, false)];
  return pair('wolf', left, 12);
}

// ---- the bear: brown, on all fours, the hump of his shoulders, a roar

/** A brown bear lumbering to the left on all fours: a big head with a dark muzzle, a hump, the legs in their strides. */
function brownBear(): NewCreature {
  const frame = (a: number, roar: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 5, 10, 4 + a, 15, 3); limb(s, 8, 10, 8 - a, 15, 3); });
    lay(r, (s) => { limb(s, 12, 10, 12 - a, 15, 3); limb(s, 14, 10, 14 + a, 15, 3); });
    r.ellipse(9.5, 8, 6, 4.3); // the body
    r.disc(6, 4.6, 2.6); // the hump
    lay(r, (s) => s.ellipse(4, 8, 3.9, 3.7)); // the head
    r.disc(6, 4.4, 1.2); // an ear, over the hump
    r.cut(['###'], 2, 7); // the brow: a black line
    r.rect(3, 8, 4, 8, false); // the eye
    r.cut(['####'], 0, 10); // the muzzle, a black band
    r.rect(0, 9, 1, 9); // the nose, lit
    if (roar) { r.cut(['#####', '#####'], 0, 12); r.stamp(['#.#.#'], 0, 12); } else r.cut(['####'], 0, 12);
    return r.rows();
  };
  const left = [frame(-1, true), frame(0, false), frame(1, true), frame(0, false)];
  return pair('brownBear', left, 9);
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

// ---- the reindeer: walking, a great rack of antlers, a lit nose

/** A reindeer walking to the left. */
function reindeer(): NewCreature {
  const frame = (a: number, nod: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 5.5, 10, 4.5 + a, 15, 2); limb(s, 8, 10, 8.5 - a, 15, 2); });
    lay(r, (s) => { limb(s, 11, 10, 10 - a, 15, 2); limb(s, 13, 10, 13.5 + a, 15, 2); });
    r.ellipse(10, 9, 5.3, 3.2); // the body
    limb(r, 6.5, 8, 4.5, 4 + nod, 3); // the neck, up
    r.ellipse(3.5, 5 + nod, 2.6, 2.1); // the head
    r.triangle(0, 7 + nod, 2, 4.8 + nod, 3, 7.6 + nod); // the muzzle
    lay(r, (s) => { // the antlers: a tall beam and its tines, a second behind
      s.line(5.5, 4 + nod, 7, 0); s.line(7, 0, 9, 0);
      s.line(6.2, 2.6 + nod, 3.6, 0); s.line(6.8, 1.4 + nod, 5, 0);
      s.line(7.5, 1, 10, 3);
    });
    r.cut(['#'], 3, 4 + nod); // the eye
    r.rect(0, 6 + nod, 0, 6 + nod, false); r.rect(1, 6 + nod, 1, 6 + nod); // the nose
    r.cut(['##'], 13, 7); // a seam in the flank
    r.rect(15, 7, 15, 8); // the tail
    return r.rows();
  };
  const left = [frame(1.5, 0), frame(0, 1), frame(-1.5, 0), frame(0, 1)];
  return pair('reindeer', left, 15);
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

// ---- the miner: a yellow helmet with its lamp, a face black with coal and two white eyes, a lit grin, a pickaxe over the shoulder

/** The miner's legs, rows 14 and 15, in four steps. */
const MINER_STEPS = INSPECTOR_STEPS;

/** A coal-faced miner marching, drawn row by row: the pickaxe over his right shoulder. */
function miner(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = MINER_STEPS[step] ?? MINER_STEPS[0] ?? ['', ''];
    const body = [
      '....######......',
      '...########.####',
      '..###.#######.##',
      '..############..',
      '.##############.',
      '...#........#...',
      '...#.##..##.#...',
      '...#.##..##.#...',
      '...#..####..#...',
      '..############..',
      '..############..',
      '.......##.......',
      '..############..',
      '..############..',
    ];
    // the handle runs down the right side from the head of the pick
    const rows = body.map((row, i) => (i >= 3 && i <= 12 ? `${row.slice(0, 14)}#${row.slice(15)}` : row));
    return [...rows, a, b];
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('miner', left, 7);
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

// ---- the nerpa: the Baikal seal, round and glossy, whiskered, shuffling over the ice

/** A Baikal seal shuffling to the left: the body arching, the tail flippers lifting. */
function nerpa(): NewCreature {
  const frame = (arch: number, flip: number) => {
    const r = new Raster(16, 16);
    r.ellipse(10.2, 10.6 - arch * 0.5, 5.8, 4 + arch * 0.3); // the long round body
    r.disc(5.4, 7.6, 3.4); // the head, in one with the body
    r.triangle(13, 9, 15.8, 8 + flip, 15.8, 12 + flip); // the tail flippers
    r.triangle(6.5, 12, 10.5, 12, 7.5 + flip, 15.5); // the front flipper, pushing
    r.rect(4, 6, 5, 7, false); // the eye, black
    r.rect(3, 6, 3, 6, false);
    r.cut(['#####'], 3, 11); // the mouth's line
    r.cut(['######'], 7, 11 + arch); // the belly's line
    r.cut(['##', '.##'], 9, 8); // a gleam on the back
    for (const y of [8, 9, 10]) r.rect(0, y, 1, y); // the whiskers, lit dashes
    return r.rows();
  };
  const left = [frame(0, 0), frame(1, 1), frame(0, 0), frame(1, -1)];
  return pair('nerpa', left, 12);
}

export const SIBERIA_CREATURES = {
  wolf: wolf(),
  brownBear: brownBear(),
  owl: owl(),
  reindeer: reindeer(),
  inspector: inspector(),
  miner: miner(),
  yeti: yeti(),
  bat: bat(),
  nerpa: nerpa(),
} as const satisfies Record<string, NewCreature>;

export type SiberiaCreature = keyof typeof SIBERIA_CREATURES;
