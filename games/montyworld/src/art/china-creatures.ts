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

// ---- the kite: a red diamond with a big face and a tail of bows, sailing

/** A kite in the wind: a diamond with a cross of sticks, two round eyes and a grin, and a tail of bows that swings. */
function kite(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.triangle(7.5, 0, 0, 5, 7.5, 10); r.triangle(7.5, 0, 15, 5, 7.5, 10); // the diamond
    r.cut(['.#.'], 6.5, 1); // (a notch at the top)
    r.cut(['#'], 7.5, 2); r.cut(['#'], 7.5, 8); // the sticks' crossing, shown by two dark pegs
    r.cut(['##', '##'], 4, 3); r.cut(['##', '##'], 9, 3); // the eyes
    r.rect(4, 4, 4, 4); r.rect(10, 4, 10, 4); // their glints
    r.cut(['#.....#', '.#...#.', '..###..'], 4, 6); // the grin
    // the tail: a string down with a bow on it
    const x = (y: number) => 7.5 + Math.sin(y * 0.9 + sway * 1.6) * 2;
    for (let y = 10; y < 16; y++) r.set(x(y), y);
    r.rect(Math.round(x(12)) - 1, 12, Math.round(x(12)) + 1, 12); r.rect(Math.round(x(14)) - 1, 14, Math.round(x(14)) + 1, 14);
    return r.rows();
  };
  const frames = [0, 1, 2, 3].map(frame);
  return pair('kite', frames, 10, true);
}

// ---- the monk: a bald round head, a big smile, an orange robe, bouncing on a pogo stick

/** A monk bouncing on a pogo stick, seen front on: the stick's spring squashes and stretches, the robe flaps. */
function monk(): NewCreature {
  const frame = (squash: number) => {
    const r = new Raster(16, 16);
    const base = squash * 1.5; // how far down the body sits
    // the stick: a post with its spring and foot
    r.rect(7, 11 + base, 8, 12 + base);
    for (let y = 12 + base; y < 15; y++) r.set(y & 1 ? 6 : 9, y);
    r.rect(7, 14, 8, 15); r.rect(5, 15, 10, 15);
    // the robe: a bell, sleeves to the bars
    r.triangle(7.5, 6 + base, 1.5, 12 + base, 13.5, 12 + base);
    lay(r, (s) => { s.line(3, 8 + base, 0, 6 + base); s.line(12, 8 + base, 15, 6 + base); s.line(0, 6 + base, 15, 6 + base); });
    r.disc(7.5, 3.5 + base, 3.2); // the head
    r.cut(['##', '##'], 4, 2.5 + base); r.cut(['##', '##'], 9, 2.5 + base); // the eyes
    r.rect(4, 3 + base, 4, 3 + base); r.rect(10, 3 + base, 10, 3 + base);
    r.cut(['#.....#', '.#####.'], 4, 4.5 + base); // the smile
    r.cut(['..#..', '.###.'], 5, 8 + base); // the robe's lapels
    return r.rows();
  };
  const frames = [frame(0), frame(1), frame(2), frame(1)];
  return pair('monk', frames, 8, true);
}

// ---- the cricket in its cage: a round bamboo cage on a hook, a big cricket inside, jumping

/** A caged cricket: a domed bamboo cage with its bars, a fat cricket inside with two great eyes and feelers poking out the top; it hops. */
function cricket(): NewCreature {
  const frame = (hop: number, feelers: boolean) => {
    const r = new Raster(16, 16);
    const y = 4 + hop;
    r.ellipse(7.5, y + 1, 6.2, 3); // the dome
    r.rect(1, y + 1, 14, y + 9); // the body of the cage
    r.rect(3, y + 3, 12, y + 8, false); // (the bars' spaces)
    for (const x of [4, 7, 10]) r.rect(x, y + 1, x, y + 9); // the bars
    r.rect(1, y + 9, 14, y + 10); // the base
    r.ellipse(7.5, y + 6, 3.6, 2.6); // the cricket inside, a big lit shape
    r.cut(['#', '#'], 5.5, y + 5); r.cut(['#', '#'], 9.5, y + 5); // its eyes
    r.cut(['###'], 6.5, y + 8); // its mouth, a line
    r.rect(7, y - 4, 7, y - 1); // the hook
    r.rect(6, y - 4, 8, y - 4);
    if (feelers) { r.line(5, y - 1, 2, y - 3); r.line(10, y - 1, 13, y - 3); }
    return r.rows();
  };
  const frames = [frame(2, true), frame(0, false), frame(-1, true), frame(0, false)];
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

// ---- the lion: a stone guardian, a great curled mane round a fierce face, fangs, padding forward

/** A stone lion coming to life: a mane of curls round a broad face (round eyes, a flat nose, an open mouth full of teeth), four paws padding. */
function lion(): NewCreature {
  const frame = (a: number, roar: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 9, 11, 8.5 + a, 15, 3); limb(s, 14, 11, 14 - a, 15, 3); }); // the back legs
    r.ellipse(11.5, 10.5, 4.5, 3.4); // the body
    lay(r, (s) => { limb(s, 3, 12, 2.5 - a, 15, 3); limb(s, 7.5, 12, 7.5 + a, 15, 3); }); // the front legs
    // the mane: a ring of curls
    for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; r.disc(6 + Math.cos(t) * 5, 6.5 + Math.sin(t) * 5, 1.6); }
    r.disc(6, 6.5, 4.2); // the face
    r.cut(['##', '##'], 3, 4); r.cut(['##', '##'], 8, 4); // the eyes
    r.rect(3, 5, 3, 5); r.rect(9, 5, 9, 5);
    r.cut(['###'], 5, 7); // the nose
    r.cut(roar ? ['#######', '#######'] : ['#####'], roar ? 2 : 3, roar ? 9 : 9); // the mouth
    r.stamp(roar ? ['#.#.#.#'] : ['#.#.#'], roar ? 2 : 3, roar ? 9 : 9); // the teeth
    return r.rows();
  };
  const left = [frame(1.5, true), frame(0, false), frame(-1.5, true), frame(0, false)];
  return pair('lion', left, 7);
}

// ---- the guard: a helmet with a plume, a fierce moustache, lamellar armour, a halberd

/** The guard's feet, rows 14 and 15, in four steps. */
const GUARD_STEPS = WARRIOR_STEPS;

/** An imperial guard marching, drawn row by row: the plumed helmet, the moustache, the armour's bands, the halberd's blade at the top. */
function imperialGuard(): NewCreature {
  const frame = (step: number) => {
    const [a, b] = GUARD_STEPS[step] ?? GUARD_STEPS[0] ?? ['', ''];
    return [
      '.....##.....###.',
      '....####...#####',
      '...########..##.',
      '...########..#..',
      '...#.#..#.#..#..',
      '...########..#..',
      '...#.####.#..#..',
      '....######...#..',
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

/** A white dove flapping to the left: a round head with a black eye and a beak, a plump body, the wings up, level, down, level. */
function dove(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { // the far wing then the near
      const y = [1, 5, 11, 5][wing] ?? 5;
      s.triangle(8, 8, 15, y, 11, 10);
      s.triangle(7, 8, 13, y + 1, 9, 11);
    });
    r.ellipse(8, 9, 5, 3); // the body
    r.triangle(12, 9, 15.5, 11, 13, 12); // the tail
    r.disc(3.8, 6.8, 2.8); // the head
    r.triangle(0, 7, 2, 6, 2, 8.5); // the beak
    r.cut(['#'], 3, 6); // the eye
    r.cut(['##'], 6, 8);
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
