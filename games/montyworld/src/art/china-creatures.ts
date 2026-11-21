/**
 * China's creatures for Monty Mole: World Tour (region 3), in Monty on the Run's formats and Moscow's and Siberia's manner: bold cartoon figures that
 * fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows, fangs, seams), a big face with an
 * expression, an animation that reads. A panda, a kite, a monk on a pogo stick, a caged cricket, a baker on his bicycle, a terracotta warrior, a paper
 * lantern with a face, a stone lion come alive, an imperial guard, a carp and a dove. No dither.
 */
import { lay, pair } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';

// ---- the panda: white, a big round face with black eye patches, ringed ears, a black band round the shoulders, chewing

/** A panda lumbering to the left, its round face turned out at us: ringed ears, black patches round its eyes, a black nose, chewing. */
function panda(): NewCreature {
  const frame = (a: number, chew: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 10, 11, 9 + a, 15, 3); limb(s, 14, 11, 14 - a, 15, 3); }); // the back legs
    r.ellipse(11, 10, 5, 4); // the body
    r.rect(8, 7, 8, 14, false); // the black band across the shoulders
    lay(r, (s) => { limb(s, 3, 12, 2 - a, 15, 3); limb(s, 7, 12, 7 + a, 15, 3); }); // the front legs
    r.disc(6, 6.5, 5.5); // the head
    for (const x of [1.6, 10.4]) { r.disc(x, 1.8, 2); r.disc(x, 1.8, 0.7); r.ellipse(x, 1.8, 0.6, 0.6, false); } // the ears, ringed
    r.cut(['.###', '####', '.###'], 1.6, 4); r.cut(['###.', '####', '###.'], 8, 4); // the patches
    r.rect(3, 5, 3, 5); r.rect(9, 5, 9, 5); // the eyes, lit in them
    r.cut(['###'], 5, 8); // the nose
    r.cut(chew ? ['#.#', '.#.'] : ['#.#'], 5, 10); // the mouth
    return r.rows();
  };
  const left = [frame(1, true), frame(0, false), frame(-1, true), frame(0, false)];
  return pair('panda', left, 1);
}

// ---- the kite: a red diamond of four panels in its frame of sticks, two eyes, a tail of bows, sailing

/** A kite in the wind: a diamond whose sticks make a cross over four dark panels, two lit eyes in the lower ones, a tail of bows that swings. */
function kite(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.triangle(7.5, 0, 0, 5.5, 7.5, 11); r.triangle(7.5, 0, 15, 5.5, 7.5, 11); // the diamond
    r.triangle(6.7, 2.6, 2.6, 5, 6.7, 5, false); r.triangle(8.3, 2.6, 12.4, 5, 8.3, 5, false); // the upper panels, dark between the sticks
    r.triangle(2.8, 6.2, 6.7, 6.2, 6.7, 9, false); r.triangle(12.2, 6.2, 8.3, 6.2, 8.3, 9, false); // the lower panels
    r.rect(4, 6, 5, 7); r.rect(10, 6, 11, 7); // the eyes, lit in the lower panels
    // the tail: a string down with two bows on it
    const x = (y: number) => 7.5 + Math.sin(y * 0.9 + sway * 1.6) * 2;
    for (let y = 11; y < 16; y++) r.set(x(y), y);
    for (const y of [12, 14]) r.rect(Math.round(x(y)) - 2, y, Math.round(x(y)) + 2, y);
    return r.rows();
  };
  const frames = [0, 1, 2, 3].map(frame);
  return pair('kite', frames, 10, true);
}

// ---- the monk: a bald round head, a big smile, an orange robe, bouncing on a pogo stick

/** A monk bouncing on a pogo stick, seen front on: a round head with its eyes shut and a wide smile, the robe a bell, his sleeves out for balance, the spring squashing and stretching. */
function monk(): NewCreature {
  const frame = (squash: number) => {
    const r = new Raster(16, 16);
    const b = squash; // how far down he sits
    r.rect(7, 12 + b, 8, 15); // the post
    for (let y = 12 + b; y < 15; y++) { r.set(6, y); r.set(9, y); } // the spring
    r.rect(4, 15, 11, 15); // the foot
    r.triangle(7.5, 6.5 + b, 2, 12.5 + b, 13, 12.5 + b); // the robe, a bell
    r.rect(4, 11 + b, 11, 11 + b, false); // the sash
    lay(r, (s) => { s.line(4, 8 + b, 0.5, 5 + b); s.line(11, 8 + b, 14.5, 5 + b); s.rect(0, 4 + b, 1, 5 + b); s.rect(14, 4 + b, 15, 5 + b); }); // the sleeves and hands, out and up
    r.disc(7.5, 3.4 + b, 3.4); // the head
    r.cut(['##'], 4.5, 2.6 + b); r.cut(['##'], 9.5, 2.6 + b); // the eyes, shut with joy
    r.cut(['#.....#', '.#####.'], 4.5, 4.4 + b); // the smile
    return r.rows();
  };
  const frames = [frame(0), frame(1), frame(2), frame(1)];
  return pair('monk', frames, 8, true);
}

// ---- the cricket in its basket: a great round head with huge eyes and feelers over the rim of a bamboo cage, hopping

/** A cricket in a bamboo cage: its big round head over the rim with two huge eyes and long feelers, the cage's slatted body under it; it hops. */
function cricket(): NewCreature {
  const frame = (hop: number, feelers: boolean) => {
    const r = new Raster(16, 16);
    const y = 1 + hop;
    r.disc(7.5, y + 5, 4.4); // the head
    r.cut(['##', '##'], 4, y + 3.5); r.cut(['##', '##'], 9, y + 3.5); // the eyes
    r.rect(4, y + 4, 4, y + 4); r.rect(10, y + 4, 10, y + 4); // their glints
    r.cut(['#.#'], 6.5, y + 7.5); // the mouth
    if (feelers) { r.line(5, y + 1, 2, y - 1); r.line(10, y + 1, 13, y - 1); } else { r.line(5, y + 1, 3, y); r.line(10, y + 1, 12, y); }
    r.rect(1, y + 8, 14, y + 9); // the rim
    r.rect(2, y + 10, 13, y + 14); for (const x of [4, 7, 10]) r.rect(x, y + 10, x, y + 14, false); // the slats
    r.rect(1, y + 14, 14, y + 15);
    return r.rows();
  };
  const frames = [frame(1, true), frame(0, false), frame(-1, true), frame(0, false)];
  return pair('cricket', frames, 13, true);
}

// ---- the baker on his bicycle: a conical straw hat, a grin, a basket of buns, the wheels turning

/** A bicycle with a rider in a conical straw hat, going left: the wheels turn (spokes), the rider pedals. */
function bicycle(): NewCreature {
  const frame = (turn: number) => {
    const r = new Raster(16, 16);
    for (const cx of [3.5, 12.5]) { // the wheels: rings, the spokes turning
      r.ring(cx, 11.5, 3.5, 1);
      const a = (turn * Math.PI) / 4;
      for (const k of [0, 1]) r.line(cx - Math.cos(a + k * 1.57) * 2.6, 11.5 - Math.sin(a + k * 1.57) * 2.6, cx + Math.cos(a + k * 1.57) * 2.6, 11.5 + Math.sin(a + k * 1.57) * 2.6);
    }
    lay(r, (s) => { s.line(3.5, 11.5, 7.5, 8); s.line(7.5, 8, 12.5, 11.5); s.line(7.5, 8, 10, 8); s.line(10, 8, 12.5, 11.5); s.line(7.5, 8, 7.5, 5.5); }); // the frame
    r.rect(1, 3, 3, 4); // the handlebar's basket, buns in it
    r.rect(0, 2, 3, 2);
    lay(r, (s) => { s.rect(7, 6, 10, 9); s.rect(8, 10 + (turn & 1), 8, 11); }); // the rider's body and leg
    r.disc(7.5, 3, 2.2); // the head
    r.triangle(7.5, -1.5, 3, 3.6, 12, 3.6); // the straw hat's cone
    r.cut(['.#.#.'], 5.5, 2); // the eyes
    r.cut(['###'], 6.5, 4.4); // the grin
    return r.rows();
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('bicycle', left, 7);
}

// ---- the terracotta warrior: a topknot, a stern face, plated armour, a halberd, marching in step

/** The warrior's legs, rows 14 and 15, in four steps. */
const WARRIOR_STEPS: readonly (readonly [string, string])[] = [
  ['...###....###...', '..####....####..'],
  ['....###..###....', '...####..####...'],
  ['...###....###...', '..####....####..'],
  ['....###..###....', '...####..####...'],
];

/** A terracotta soldier marching, drawn row by row: the topknot, the stern brow, the coat of overlapping plates, a halberd at his side. */
function warrior(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = WARRIOR_STEPS[step] ?? WARRIOR_STEPS[0] ?? ['', ''];
    return [
      '......###.....#.',
      '.....####....##.',
      '....######...#..',
      '....#.##.#...#..',
      '....#....#...#..',
      '....#.##.#...#..',
      '....######...#..',
      '...##########.#.',
      '..############..',
      '..#.#.#.#.#.##..',
      '..############..',
      '..#.#.#.#.#.#...',
      '..############..',
      '...##......##...',
      a, b,
    ];
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('warrior', left, 8);
}

// ---- the paper lantern: a red barrel with gold caps, a face lit inside, a tassel, bobbing

/** A red paper lantern with a face: a barrel with ribs and two caps, eyes and a grin cut in it, a tassel that sways. */
function lantern(): NewCreature {
  const frame = (sway: number, grin: boolean) => {
    const r = new Raster(16, 16);
    r.rect(7, 0, 8, 1); // the hook
    r.rect(4, 2, 11, 3); // the top cap
    r.ellipse(7.5, 8, 6.2, 4.4); // the barrel
    r.rect(4, 12, 11, 13); // the bottom cap
    for (const x of [3, 12]) r.cut(['#', '#', '#', '#', '#', '#'], x, 5); // the ribs
    r.cut(['##', '##'], 4, 6); r.cut(['##', '##'], 9, 6); // the eyes
    r.rect(4, 7, 4, 7); r.rect(10, 7, 10, 7);
    r.cut(grin ? ['#.....#', '.#####.'] : ['.#####.'], 4, 9);
    // the tassel
    r.rect(7 + sway, 14, 8 + sway, 15);
    return r.rows();
  };
  const frames = [frame(0, true), frame(1, false), frame(0, true), frame(-1, false)];
  return pair('lantern', frames, 10, true);
}

// ---- the lion: a stone guardian, a great mane of curls round a fierce face, fangs, padding forward

/** A stone lion coming to life: a mane of curls all round a broad face (round eyes, a flat nose, an open mouth full of teeth), two great paws padding. */
function lion(): NewCreature {
  const frame = (a: number, roar: boolean) => {
    const r = new Raster(16, 16);
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; r.disc(7.5 + Math.cos(t) * 5.6, 7 + Math.sin(t) * 5.2, 2); } // the mane's curls
    r.disc(7.5, 7, 4.9); // the face
    r.cut(['##', '##'], 4, 4); r.cut(['##', '##'], 9.5, 4); // the eyes
    r.rect(4, 5, 4, 5); r.rect(10, 5, 10, 5); // their glints
    r.cut(['.#.', '###'], 6.5, 7); // the flat nose
    r.cut(roar ? ['#######', '#######'] : ['#######'], 4, roar ? 10 : 10); // the mouth
    r.stamp(roar ? ['#.#.#.#'] : ['#.#.#.#'], 4, roar ? 10 : 10); // the teeth
    lay(r, (s) => { s.rect(2, 13 + (a > 0 ? 0 : 1), 5, 15); s.rect(10, 13 + (a > 0 ? 1 : 0), 13, 15); }); // the paws
    return r.rows();
  };
  const left = [frame(1, true), frame(0, false), frame(-1, true), frame(0, false)];
  return pair('lion', left, 7);
}

// ---- the guard: a pointed hat with a red tassel, a fierce moustache, lamellar armour, a long spear with a banner

/** The guard's feet, rows 14 and 15, in four steps. */
const GUARD_STEPS = WARRIOR_STEPS;

/** An imperial guard marching, drawn row by row: the pointed hat and its tassel, the moustache, the armour's bands, the spear's blade at the top with its banner. */
function imperialGuard(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = GUARD_STEPS[step] ?? GUARD_STEPS[0] ?? ['', ''];
    return [
      '.....#.......#..',
      '....###.....###.',
      '...#####.....#..',
      '..#######....#.#',
      '...#.##.#....###',
      '...##..##....#..',
      '...######....#..',
      '..##.##.##...#..',
      '..############..',
      '..##.#.##.#.##..',
      '..############..',
      '..##.#.##.#.##..',
      '..############..',
      '...##......##...',
      a, b,
    ];
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('imperialGuard', left, 2);
}

// ---- the carp: a fat orange koi, a big round eye, whiskers, a fanning tail, swimming

/** A koi carp swimming to the left: a fat body with its scales, a great eye and open mouth, barbels, a tail that fans. */
function carp(): NewCreature {
  const frame = (tail: number, gulp: boolean) => {
    const r = new Raster(16, 16);
    r.ellipse(7, 8, 6.5, 4.6); // the body
    r.triangle(12, 8, 15.5, 8 - 3 - tail, 15.5, 8 + 3 + tail); // the tail
    r.triangle(6, 4, 10, 4, 9, 1); // the dorsal fin
    r.triangle(6, 12, 9, 12, 8, 15); // the belly fin
    r.ellipse(3.4, 6.8, 1.9, 1.9, false); r.rect(3, 7, 3, 7); // the eye, ringed dark with its glint
    r.cut(gulp ? ['##', '##'] : ['##'], 0, 9); // the mouth
    r.cut(['#', '#'], 1, 11); // the barbel
    for (const [x, y] of [[6, 7], [8, 9], [10, 7], [7, 10], [9, 5], [5, 5]] as const) r.cut(['.#', '#.'], x, y); // the scales
    return r.rows();
  };
  const left = [frame(0, true), frame(1, false), frame(0, true), frame(-1, false)];
  return pair('carp', left, 8);
}

// ---- the dove: white, a round head and a big eye, wings beating

/** A white dove flapping to the left: a round head with a black eye and a short beak, a plump body, a fanned tail, the great wing up, level, down, level. */
function dove(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    const tip = [0, 4, 11, 4][wing] ?? 4; // where the wing's tip is
    lay(r, (s) => { s.triangle(7, 8, 13, tip, 10, 9); s.triangle(5, 8, 11, tip + 1, 8, 10); }); // the wing, two pinions
    r.ellipse(8.5, 9.5, 5.2, 3.4); // the body
    r.triangle(12, 8.5, 15.5, 7, 15.5, 12); r.triangle(12, 10, 15.5, 11, 15.5, 14); // the tail, fanned
    r.disc(3.8, 7, 3); // the head
    r.triangle(0, 7.5, 1.5, 6, 1.5, 9); // the beak
    r.cut(['#'], 3, 6); r.cut(['#'], 3, 5); // the eye
    r.cut(['###'], 6, 9); // a feather's line
    return r.rows();
  };
  const left = [0, 1, 2, 3].map(frame);
  return pair('dove', left, 1);
}

export const CHINA_CREATURES = {
  panda: panda(),
  kite: kite(),
  monk: monk(),
  cricket: cricket(),
  bicycle: bicycle(),
  warrior: warrior(),
  lantern: lantern(),
  lion: lion(),
  imperialGuard: imperialGuard(),
  carp: carp(),
  dove: dove(),
} as const satisfies Record<string, NewCreature>;

export type ChinaCreature = keyof typeof CHINA_CREATURES;
