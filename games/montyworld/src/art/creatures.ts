/**
 * Moscow's creatures and items for Monty Mole: World Tour, in Monty on the Run's formats: a creature is a 16 x 16 hires sprite
 * with 8 frames (0-3 as it goes back, 4-7 as it goes on; a creature that looks the same both ways has the bank's `copy` flag),
 * an item is a hires sprite block of 63 bytes. All new, made in Monty on the Run's manner: bold cartoon characters that fill
 * their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows, teeth, seams), a big
 * face with an expression, and an animation that reads (a mouth opening, a squash, a turn). No dither.
 */
import { creatureBank, itemBlock, mirrored, shifted } from './pixels';
import { Raster } from './raster';
import type { NewCreature, NewItem } from './types';

const BLANK = '.'.repeat(16);

/** Lay `shape` over `r`, a one pixel black moat round it so it stands out from the solid body under it. */
function over(r: Raster, shape: Raster) {
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (!shape.get(x, y) && (shape.get(x - 1, y) || shape.get(x + 1, y) || shape.get(x, y - 1) || shape.get(x, y + 1))) r.set(x, y, false);
  }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (shape.get(x, y)) r.set(x, y);
}

/** A thick limb: a line `t` pixels thick. */
function limb(r: Raster, x0: number, y0: number, x1: number, y1: number, t: number) {
  for (let k = 0; k < t; k++) for (let j = 0; j < t; j++) r.line(x0 + k - (t - 1) / 2, y0 + j - (t - 1) / 2, x1 + k - (t - 1) / 2, y1 + j - (t - 1) / 2);
}

// ---- the matryoshka: a red doll, a lit face in a black ring, a dark apron with a flower

/** The doll's rows: the head and scarf, the apron. `mouth` gives the face's rows 7 and 8, shut or open. */
function doll(mouth: readonly [string, string]): readonly string[] {
  return [
    '......####......',
    '....########....',
    '...##......##...',
    '..##.######.##..',
    '.##.########.##.',
    '.##.#..##..#.##.',
    '.##.#..##..#.##.',
    `.##.${mouth[0]}.##.`,
    `..##.${mouth[1]}.##..`,
    '..###......###..',
    '.##############.',
    '####...##...####',
    '####..####..####',
    '####...##...####',
    '.##############.',
    '..############..',
  ];
}

/** A matryoshka, hopping: squashes, rises with her mouth open, hangs, lands. */
function matryoshka(): NewCreature {
  const closed = doll(['#.####.#', '#....#']);
  const open = doll(['##....##', '##..##']);
  const squashed = [BLANK, BLANK, ...closed.filter((_, i) => i !== 1 && i !== 13)];
  const frames = [squashed, closed, shifted(open, -1), open];
  return { frames: creatureBank('matryoshka', frames, frames), copy: true, colour: 2 };
}

// ---- the guard: a big fur hat with a star, a lit face with a black moustache, a greatcoat

/** The guard's legs, four steps. */
const STEPS: readonly (readonly [string, string])[] = [
  ['.####......####.', '#####......#####'],
  ['..####....####..', '..####....####..'],
  ['...####..####...', '..####....####..'],
  ['..####....####..', '..####....####..'],
];

/** A guard marching, his arms swinging: four steps. */
function guard(): NewCreature {
  const body = [
    '...##########...',
    '..#####..#####..',
    '.#####....#####.',
    '#######..#######',
    '################',
    '....########....',
    '...##..##..##...',
    '...##..##..##...',
    '...##......##...',
    '....########....',
    '.....######.....',
    '...##########...',
    '...##########...',
    '...##########...',
  ];
  const frame = (step: number) => {
    const r = new Raster(16, 14);
    r.stamp(body, 0, 0);
    r.rect(3, 12, 12, 12, false); // the belt, a black line with a lit buckle
    r.rect(7, 12, 8, 12);
    const left = step & 1, right = (step + 1) & 1;
    r.rect(0, 11 + left, 1, 13 + left); // arms swinging
    r.rect(14, 11 + right, 15, 13 + right);
    const [a, b] = STEPS[step] ?? ['', ''];
    return [...r.rows(), a, b];
  };
  const left = [0, 1, 2, 3].map(frame);
  return { frames: creatureBank('guard', left, left.map(mirrored)), copy: false, colour: 5 };
}

// ---- the pigeon: seen from the front, a round head with eyes and a beak, wings beating either side of a plump body

/** A pigeon, flying at us: wings up, level, down, level. The same going either way. */
function pigeon(): NewCreature {
  type Pt = readonly [number, number];
  /** A wing's four corners (root top, tip top, tip bottom, root bottom) and the black lines between its feathers. */
  const frame = ([a, b, c, d]: readonly [Pt, Pt, Pt, Pt], gaps: readonly (readonly [number, number, number, number])[]) => {
    const r = new Raster(16, 16);
    const wing = new Raster(16, 16);
    wing.triangle(a[0], a[1], b[0], b[1], c[0], c[1]);
    wing.triangle(a[0], a[1], c[0], c[1], d[0], d[1]);
    for (const [x0, y0, x1, y1] of gaps) wing.line(x0, y0, x1, y1, false);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (wing.get(x, y)) wing.set(15 - x, y); // the other wing
    r.ellipse(7.5, 10.2, 4.2, 5.2); // the plump body
    r.disc(7.5, 4.6, 3.6); // the head
    r.rect(6, 14, 6, 15); r.rect(9, 14, 9, 15); // feet
    r.rect(5, 15, 6, 15); r.rect(9, 15, 10, 15);
    over(r, wing);
    r.cut(['#..#', '#..#'], 5, 3); // the eyes, big
    r.cut(['.##.', '.##.'], 6, 6); // the beak, a dark wedge
    r.cut(['##', '##', '##', '##'], 7, 11); // a seam down the breast
    return r.rows();
  };
  const frames = [
    frame([[5, 8], [2, 0], [0, 5], [5, 13]], []),
    frame([[5, 8], [0, 6], [0, 11], [5, 13]], [[0, 9, 4, 10]]),
    frame([[5, 8], [0, 11], [2, 15], [5, 13]], []),
    frame([[5, 8], [0, 8], [0, 13], [5, 13]], [[0, 11, 4, 12]]),
  ];
  return { frames: creatureBank('pigeon', frames, frames), copy: true, colour: 15 };
}

// ---- the snowball: a furious face rolling round a solid ball

/** One look of the snowball, its face turned `turn` round (0 to 3 quarter turns) and squashed on the odd ones. */
function snowball(turn: number): readonly string[] {
  const r = new Raster(16, 16);
  const squash = turn % 2 === 1;
  if (squash) r.ellipse(7.5, 8.5, 7.9, 6.9);
  else r.disc(7.5, 7.5, 7.5);
  const dx = [0, 2, 0, -2][turn] ?? 0; // the face goes round with the ball
  const dy = squash ? 1 : 0;
  const x = 3 + dx, y = 3 + dy;
  r.cut(['##...', '.##..'], x, y); // the brows, slanting in
  r.cut(['...##', '..##.'], x + 5, y);
  r.cut(['##..##', '##..##'], x + 1, y + 3); // the eyes
  r.cut(['.########.', '##########', '##########', '.########.'], x, y + 6); // the mouth, gaping
  r.stamp(['#.#.#.#.'], x + 1, y + 6); // the teeth
  r.stamp(['.#.#.#.#'], x + 1, y + 9);
  return r.rows();
}

/** A rolling snowball. */
function snowballs(): NewCreature {
  const frames = [0, 1, 2, 3].map(snowball);
  return { frames: creatureBank('snowball', frames, [...frames].reverse().map(mirrored)), copy: false, colour: 1 };
}

// ---- the bear: solid, a big face, dancing the squat dance

/** Where the bear's hands and feet go (x, y), left then right, how far down he sits, and whether his mouth is open. */
interface Pose {
  readonly hands: readonly [readonly [number, number], readonly [number, number]];
  readonly feet: readonly [readonly [number, number], readonly [number, number]];
  readonly sink: number;
  readonly open: boolean;
}

/** A dancing bear, black eyes, a black muzzle with a lit nose and a mouth that opens as he whoops. */
function bear(): NewCreature {
  const draw = (p: Pose) => {
    const r = new Raster(16, 16);
    const y = p.sink;
    const limbs = [
      { from: [5, 10 + y], to: p.hands[0] }, { from: [10, 10 + y], to: p.hands[1] },
      { from: [6, 13 + y], to: p.feet[0] }, { from: [9, 13 + y], to: p.feet[1] },
    ] as const;
    for (const { from, to } of limbs) {
      const shape = new Raster(16, 16);
      limb(shape, from[0], from[1], to[0], to[1], 3);
      over(r, shape);
    }
    const trunk = new Raster(16, 16);
    trunk.ellipse(7.5, 11.8 + y, 3.9, 3.3);
    over(r, trunk);
    const head = new Raster(16, 16);
    head.ellipse(7.5, 4.6 + y, 4.9, 4.1);
    head.disc(3.4, 1.6 + y, 1.8); // the ears
    head.disc(11.6, 1.6 + y, 1.8);
    over(r, head);
    r.cut(['#'], 3, 1 + y); r.cut(['#'], 12, 1 + y); // a dark dot in each ear
    r.cut(['##..##', '##..##'], 5, 3 + y); // the eyes
    r.cut(['.####.', '######', '######', '.####.'], 5, 5 + y); // the muzzle, a black patch
    r.rect(7, 5 + y, 8, 5 + y); // the nose, lit
    if (p.open) r.rect(7, 7 + y, 8, 8 + y); // the mouth, open and lit
    else { r.set(6, 7 + y); r.set(9, 7 + y); r.rect(7, 8 + y, 8, 8 + y); }
    return r.rows();
  };
  const frames = [
    draw({ hands: [[1, 7], [14, 7]], feet: [[5, 15], [10, 15]], sink: 0, open: true }),
    draw({ hands: [[1, 7], [15, 12]], feet: [[1, 13], [10, 15]], sink: 0, open: false }),
    draw({ hands: [[1, 12], [14, 12]], feet: [[2, 15], [13, 15]], sink: 1, open: true }),
    draw({ hands: [[0.5, 12], [14, 7]], feet: [[5, 15], [14, 13]], sink: 0, open: false }),
  ];
  return { frames: creatureBank('bear', frames, frames.map(mirrored)), copy: false, colour: 9 };
}

export const MOSCOW_CREATURES = {
  matryoshka: matryoshka(),
  guard: guard(),
  pigeon: pigeon(),
  snowball: snowballs(),
  bear: bear(),
} as const satisfies Record<string, NewCreature>;

export type MoscowCreature = keyof typeof MOSCOW_CREATURES;

/** A metro token: a solid brass disc with a rim line cut in it and the metro's M cut out of it, bold. */
function metroToken(): NewItem {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7.5);
  const rim = new Raster(16, 16);
  rim.ring(7.5, 7.5, 6.2, 1);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rim.get(x, y)) r.set(x, y, false);
  r.cut([
    '##.....##',
    '###...###',
    '####.####',
    '##.###.##',
    '##..#..##',
    '##.....##',
    '##.....##',
  ], 3, 4);
  return { block: itemBlock('metroToken', r.rows()), colour: 7 };
}

/** An ushanka, the fur hat: a solid crown with a star cut in it, a fur band, the ear flaps hanging at the sides. */
function ushanka(): NewItem {
  const r = new Raster(16, 16);
  r.stamp([
    '................',
    '.....######.....',
    '...##########...',
    '..############..',
    '.######..######.',
    '.#####....#####.',
    '.######..######.',
    '.##############.',
    '................',
    '################',
    '################',
    '#####......#####',
    '#####......#####',
    '.####......####.',
    '..###......###..',
    '................',
  ], 0, 0);
  r.cut(['#', '#', '#'], 2, 11); // the flaps' folds
  r.cut(['#', '#', '#'], 13, 11);
  r.rect(7, 5, 8, 5); // the star's lit middle in its dark patch
  return { block: itemBlock('ushanka', r.rows()), colour: 9 };
}

export const MOSCOW_ITEMS = {
  metroToken: metroToken(),
  ushanka: ushanka(),
} as const satisfies Record<string, NewItem>;

export type MoscowItem = keyof typeof MOSCOW_ITEMS;
