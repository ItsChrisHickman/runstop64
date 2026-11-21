/**
 * Moscow's creatures and items for Monty Mole: World Tour, in Monty on the Run's formats: a creature is a 16 x 16 hires sprite
 * with 8 frames (0-3 as it goes back, 4-7 as it goes on; a creature that looks the same both ways has the bank's `copy` flag),
 * an item is a hires sprite block of 63 bytes. All new, made in Monty on the Run's manner: bold cartoon characters that fill
 * their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows, teeth, seams), a big
 * face with an expression, and an animation that reads (a mouth opening, a squash, a turn). No dither.
 */
import { creatureBank, itemBlock, mirrored, shifted } from './pixels';
import { babushka, balalaika, cossack, egg, samovarWalker, tram } from './creatures-more';
import { limb, over, Raster } from './raster';
import type { NewCreature, NewItem } from './types';

const BLANK = '.'.repeat(16);

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
  return { frames: creatureBank('matryoshka', frames, frames), copy: true, colour: 7 };
}

// ---- the guard: a tall fur shapka with a star, a lit face with a black moustache, a greatcoat

/** The guard's legs, four steps. */
const STEPS: readonly (readonly [string, string])[] = [
  ['.####......####.', '#####......#####'],
  ['..####....####..', '..####....####..'],
  ['...####..####...', '..####....####..'],
  ['..####....####..', '..####....####..'],
];

/** A guard marching, his arms swinging: four steps. The hat is the tall straight shapka of the Kremlin's guard, not a dome. */
function guard(): NewCreature {
  const body = [
    '...#.#.##.#.#...',
    '...###########..',
    '...####..#####..',
    '...###.##.####..',
    '...###########..',
    '....#########...',
    '....##.##.###...',
    '...###.##.####..',
    '...##........##.',
    '....##########..',
    '.....########...',
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
    r.rect(0, 9 + left, 1, 13 + left); // arms swinging
    r.rect(14, 9 + right, 15, 13 + right);
    const [a, b] = STEPS[step] ?? ['', ''];
    return [...r.rows(), a, b];
  };
  const left = [0, 1, 2, 3].map(frame);
  return { frames: creatureBank('guard', left, left.map(mirrored)), copy: false, colour: 5 };
}

// ---- the pigeon: seen from the side, plump, a beak, a tail, the wing beating

/** A pigeon flying to the left: wing up, half up, down, half up. */
function pigeon(): NewCreature {
  type Pt = readonly [number, number];
  const frame = (tip: Pt, feather: boolean) => {
    const r = new Raster(16, 16);
    r.ellipse(8.5, 9.4, 5.6, 3.7); // the plump body
    r.disc(3.6, 6.2, 2.7); // the head
    r.triangle(0, 7, 2, 5.6, 2, 8.2); // the beak
    r.triangle(12, 8, 15.5, 6.5, 15.5, 12); // the tail
    r.rect(6, 12, 6, 14); r.rect(9, 12, 9, 14); // legs
    r.rect(5, 15, 7, 15); r.rect(8, 15, 10, 15); // feet
    const wing = new Raster(16, 16);
    wing.triangle(5.5, 8, tip[0], tip[1], 12, 8.5);
    wing.triangle(5.5, 8, tip[0], tip[1], 9.5, 11);
    if (feather) wing.line(tip[0], tip[1] + 1, 9, 9, false);
    over(r, wing);
    r.cut(['#'], 3, 5); // the eye
    r.cut(['##'], 6, 12); // a seam under the wing
    return r.rows();
  };
  const left = [frame([11, 0], false), frame([13, 3.5], true), frame([11, 14], false), frame([13, 3.5], true)];
  return { frames: creatureBank('pigeon', left, left.map(mirrored)), copy: false, colour: 1 };
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
  babushka: babushka(),
  cossack: cossack(),
  samovar: samovarWalker(),
  egg: egg(),
  tram: tram(),
  balalaika: balalaika(),
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

/**
 * An ushanka, the fur hat, from the front: a puffy crown with a ragged fur top and the star on it, a thick fur band, the ear flaps
 * hanging down at both sides with fur ends. Drawn row by row: a hat's outline, not a face.
 */
function ushanka(): NewItem {
  const r = new Raster(16, 16);
  r.stamp([
    '................',
    '....#.####.#....',
    '..############..',
    '.##############.',
    '.##############.',
    '.######..######.',
    '.######..######.',
    '################',
    '#.############.#',
    '##.##########.##',
    '###.########.###',
    '###..........###',
    '###..........###',
    '.##..........##.',
    '..#..........#..',
    '................',
  ], 0, 0);
  for (const x of [5, 8, 10]) r.cut(['#'], x, 8 + (x % 2)); // the fur's hairs in the band
  for (const x of [1, 13]) r.cut(['#'], x, 11); // and in the flaps
  r.cut(['..##..', '.####.', '.####.', '..##..'], 5, 3); // a dark patch on the crown for the star
  r.stamp(['.##.'], 6, 4);
  return { block: itemBlock('ushanka', r.rows()), colour: 9 };
}

/**
 * A pirozhok (plural pirozhki), the small baked Russian bun that Moscow's cakes are: a plump oval lying on its side, the crimped
 * seam along the top, a slit and two glazed highlights cut in it. Drawn as the cupcake is (a 16 x 16 hires picture, white).
 */
function pirozhok(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 10.2, 7.4, 4.6); // the bun
  r.rect(2, 13, 13, 14); // its flat underside
  for (let x = 2; x <= 13; x += 2) r.set(x, 5); // the crimped seam standing up along the top
  r.rect(3, 6, 12, 6);
  r.cut(['..####..'], 4, 9); // the slit
  r.cut(['#.', '##'], 3, 8); // a glazed highlight
  r.cut(['.##', '##.'], 10, 11);
  return { block: itemBlock('pirozhok', r.rows()), colour: 1 };
}

export const MOSCOW_ITEMS = {
  metroToken: metroToken(),
  ushanka: ushanka(),
  pirozhok: pirozhok(),
} as const satisfies Record<string, NewItem>;

export type MoscowItem = keyof typeof MOSCOW_ITEMS;
