/**
 * Moscow's creatures and items for Monty Mole: World Tour, in Monty on the Run's formats: a creature is a 16 x 16 hires sprite
 * with 8 frames (0-3 as it goes back, 4-7 as it goes on; a creature that looks the same both ways has the bank's `copy` flag),
 * an item is a hires sprite block of 63 bytes. All new, made in Monty on the Run's style: one ink, chunky, drawn in outline and
 * texture as its boots, knights and smileys are.
 */
import { creatureBank, itemBlock, mirrored, shifted } from './pixels';
import { Raster, stroke } from './raster';
import type { NewCreature, NewItem } from './types';

const BLANK = '.'.repeat(16);

/** Clear every pixel of `r` that `mask` lights, where `where` says so. */
function clearWhere(r: Raster, mask: Raster, where: (x: number, y: number) => boolean) {
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (mask.get(x, y) && where(x, y)) r.set(x, y, false);
}

/** A matryoshka, hopping: a headscarf round a face, a flower on the apron, her hem. Crouches, rises, hangs, lands. */
function matryoshka(): NewCreature {
  const r = new Raster(16, 16);
  r.ellipse(8, 9.5, 6.4, 6.4); // the body, an egg
  r.ellipse(8, 5.5, 5, 4.4); // the head's scarf
  const face = new Raster(16, 16);
  face.ellipse(8, 6, 3.2, 3.1);
  clearWhere(r, face, () => true);
  r.set(6.5, 5); r.set(9.5, 5); r.set(8, 7); // eyes and a mouth
  r.rect(3, 9, 12, 9, false); // the knot of the scarf
  r.rect(7, 9, 8, 9);
  const apron = new Raster(16, 16);
  apron.ellipse(8, 12.5, 3.6, 2.6);
  clearWhere(r, apron, () => true);
  r.stamp(['.#.', '###', '.#.'], 7, 11); // a flower
  r.rect(7, 15, 8, 15, false); // a notch in the hem
  const doll = r.rows();
  const squashed = [BLANK, ...doll.slice(0, 8), ...doll.slice(9), BLANK].slice(0, 16);
  const frames = [squashed, shifted(doll, -1), shifted(doll, -2), shifted(doll, -1)];
  return { frames: creatureBank('matryoshka', frames, frames), copy: true, colour: 2 };
}

/** The guard's legs, four steps. */
const GUARD_LEGS: readonly (readonly [string, string])[] = [
  ['..###....###....', '.####....####...'],
  ['...###..###.....', '..####..####....'],
  ['....######......', '...########.....'],
  ['...###..###.....', '..####..####....'],
];

/** A guard in a fur hat with a star on it, a rifle at his side, walking: four steps. */
function guard(): NewCreature {
  const frame = ([a, b]: readonly [string, string]) => {
    const r = new Raster(16, 16);
    r.ellipse(6.5, 2.4, 5.9, 2.6); // the fur hat
    r.rect(1, 3, 12, 4);
    r.rect(1, 4, 2, 8); // its flaps hang beside the face
    r.rect(11, 4, 12, 8);
    r.rect(6, 1, 7, 2, false); // the star on it, a small hollow
    r.set(6, 1); r.set(7, 2);
    r.rect(3, 5, 10, 7, false); // the face, dark
    r.rect(4, 8, 9, 8, false);
    r.set(5, 6); r.set(8, 6); // eyes
    r.rect(5, 8, 8, 8); // moustache
    r.rect(2, 9, 11, 13); // the greatcoat
    r.rect(4, 10, 4, 13, false); // the sleeves, a dark seam each side of the front
    r.rect(9, 10, 9, 13, false);
    r.rect(6, 10, 7, 10, false); // buttons down the front
    r.rect(6, 12, 7, 12, false);
    r.rect(3, 11, 10, 11, false); // the belt, with its buckle
    r.rect(3, 11, 4, 11); r.rect(9, 11, 10, 11);
    r.rect(14, 2, 14, 13); // the rifle he holds
    r.set(14, 1);
    r.rect(13, 12, 15, 13);
    const rows = r.rows();
    return [...rows.slice(0, 14), a, b];
  };
  const left = GUARD_LEGS.map(frame);
  return { frames: creatureBank('guard', left, left.map(mirrored)), copy: false, colour: 5 };
}

/** A pigeon, flying: wings up, back, down, back. */
function pigeon(): NewCreature {
  const frame = (wing: (r: Raster) => void) => {
    const r = new Raster(16, 16);
    r.ellipse(9, 9, 5, 3); // the plump body
    r.ellipse(6, 7.5, 2.6, 2.6); // the neck
    r.disc(3.5, 6.5, 2.3); // the head
    r.triangle(0.5, 6.5, 2, 5.5, 2, 7.8); // the beak
    r.triangle(13, 8.5, 15.5, 8, 15.5, 11.5); // the tail
    r.rect(8, 12, 8, 13); r.rect(10, 12, 10, 13); // the feet, tucked
    wing(r);
    r.set(3, 6, false); // the eye
    return r.rows();
  };
  const frames = [
    frame((r) => { r.triangle(6, 8, 8, 0, 12, 8); r.triangle(8, 0, 14, 3, 12, 8); }),
    frame((r) => { r.triangle(6, 8, 15, 2, 12, 8); r.triangle(6, 8, 10, 3, 15, 2); }),
    frame((r) => { r.triangle(6, 9, 9, 15, 12, 9); r.triangle(9, 15, 14, 13, 12, 9); }),
    frame((r) => { r.triangle(6, 9, 15, 14, 12, 9); r.triangle(6, 9, 10, 14, 15, 14); }),
  ];
  return { frames: creatureBank('pigeon', frames, frames.map(mirrored)), copy: false, colour: 15 };
}

/** One look of a snowball, its stones and twigs turned `turn` round: a disc, its inside thinned to dither, three dark specks. */
function snowball(turn: number): readonly string[] {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7);
  const inner = new Raster(16, 16);
  inner.disc(7.5, 7.5, 6);
  clearWhere(r, inner, (x, y) => (x + y) % 2 === 1);
  for (let k = 0; k < 3; k++) {
    const a = turn + (k * 2 * Math.PI) / 3;
    const x = Math.round(7.5 + 4 * Math.cos(a)), y = Math.round(7.5 + 4 * Math.sin(a));
    r.rect(x - 1, y - 1, x, y, k === 0); // one of them a lump, two stones
    if (k !== 0) r.rect(x - 1, y - 1, x, y, false);
  }
  return r.rows();
}

/** A snowball, rolling: turns one way going back and the other going on. */
function snowballs(): NewCreature {
  const frames = [0, 1, 2, 3].map((f) => snowball((f * Math.PI) / 6));
  return { frames: creatureBank('snowball', frames, [...frames].reverse()), copy: false, colour: 1 };
}

/** The arm and leg poses of a dancing bear. */
interface Pose {
  /** where each hand goes (x, y), left then right */
  readonly hands: readonly [readonly [number, number], readonly [number, number]];
  /** where each foot goes, left then right */
  readonly feet: readonly [readonly [number, number], readonly [number, number]];
  /** how far down the whole bear sits */
  readonly sink: number;
}

/** A bear dancing the squat dance: arms up, a leg kicked out, a squat, the other leg. */
function bear(): NewCreature {
  const draw = (p: Pose) => {
    const r = new Raster(16, 16);
    const y = p.sink;
    r.disc(4.5, 1.8 + y, 1.7); // ears
    r.disc(11.5, 1.8 + y, 1.7);
    r.disc(8, 4.8 + y, 3.7); // head
    const face = new Raster(16, 16);
    face.ellipse(8, 6.4 + y, 1.9, 1.4);
    clearWhere(r, face, () => true);
    r.set(8, 5.6 + y);
    r.set(6.5, 3.6 + y, false); r.set(9.5, 3.6 + y, false); // eyes
    r.ellipse(8, 11 + y, 5.2, 4.2); // body
    const belly = new Raster(16, 16);
    belly.ellipse(8, 11.4 + y, 2.8, 2.6);
    clearWhere(r, belly, (x, yy) => (x + yy) % 2 === 1);
    for (const [hand, shoulder] of [[p.hands[0], [4, 8 + y]], [p.hands[1], [12, 8 + y]]] as const) stroke(r, shoulder[0], shoulder[1], hand[0], hand[1], 2);
    for (const [foot, hip] of [[p.feet[0], [6, 13 + y]], [p.feet[1], [10, 13 + y]]] as const) stroke(r, hip[0], hip[1], foot[0], foot[1], 3);
    return r.rows();
  };
  const frames = [
    draw({ hands: [[1, 3], [15, 3]], feet: [[6, 15], [10, 15]], sink: 0 }),
    draw({ hands: [[1, 3], [15, 10]], feet: [[1, 13], [10, 15]], sink: 0 }),
    draw({ hands: [[5, 13], [11, 13]], feet: [[2, 15], [14, 15]], sink: 2 }),
    draw({ hands: [[1, 10], [15, 3]], feet: [[6, 15], [15, 13]], sink: 0 }),
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

/** A metro token: a brass disc with its M. */
function metroToken(): NewItem {
  const r = new Raster(16, 16);
  r.ring(7.5, 7.5, 7, 2);
  r.stamp([
    '#.....#',
    '##...##',
    '#.#.#.#',
    '#..#..#',
    '#.....#',
    '#.....#',
  ], 4, 5);
  return { block: itemBlock('metroToken', r.rows()), colour: 7 };
}

/** An ushanka, the fur hat: a furred crown with its badge, the flaps hanging at the sides. */
function ushanka(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(8, 6, 6.4, 5.2); // the crown
  r.ellipse(2.6, 11.5, 2.7, 3.8); // the ear flaps
  r.ellipse(13.4, 11.5, 2.7, 3.8);
  r.rect(2, 8, 13, 10); // the band
  const edge = new Raster(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (r.get(x, y) && (!r.get(x - 1, y) || !r.get(x + 1, y) || !r.get(x, y - 1) || !r.get(x, y + 1))) edge.set(x, y);
  }
  clearWhere(r, edge, (x, y) => (x + y) % 2 === 0); // a ragged edge: fur
  const fur = new Raster(16, 16);
  fur.rect(3, 9, 12, 9);
  fur.ellipse(2.6, 12.5, 1, 1.8);
  fur.ellipse(13.4, 12.5, 1, 1.8);
  clearWhere(r, fur, () => true); // the flaps are lined, the band has its seam
  const badge = new Raster(16, 16);
  badge.rect(6, 4, 9, 7);
  clearWhere(r, badge, () => true); // the badge: a dark patch with a star in it
  r.stamp(['.##.', '####', '.##.'], 6, 4);
  r.rect(7, 7, 8, 7);
  return { block: itemBlock('ushanka', r.rows()), colour: 9 };
}

export const MOSCOW_ITEMS = {
  metroToken: metroToken(),
  ushanka: ushanka(),
} as const satisfies Record<string, NewItem>;

export type MoscowItem = keyof typeof MOSCOW_ITEMS;
