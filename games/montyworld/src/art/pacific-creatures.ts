/**
 * The Pacific's creatures for Monty Mole: World Tour (region 5), in Monty on the Run's formats and Moscow's and Siberia's manner:
 * bold cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes,
 * brows, teeth, shells), a big face with an expression, an animation that reads. The captain's parrot, a shark's fin, a crab, a turtle,
 * a moray eel, a manta ray, a tiki mask, a hula dancer, a surfer, a bouncing coconut, an airport guard and a lava blob. No dither.
 */
import { creatureBank, mirrored, shifted } from './pixels';
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

// ---- the crab: red, facing us, claws raised, eyes on stalks, scuttling sideways

/** A beach crab, front on: two raised claws that snap, eyes on stalks, six legs. */
function crab(): NewCreature {
  const frame = (a: number, snap: boolean) => {
    const r = new Raster(16, 16);
    r.ellipse(7.5, 10, 5.8, 3.6); // the body
    lay(r, (s) => { for (let k = 0; k < 3; k++) { limb(s, 3 - k, 11 + k * 0.4, 0 + a * (k % 2 ? 1 : -1), 13 + k * 1, 1); limb(s, 12 + k, 11 + k * 0.4, 15 - a * (k % 2 ? 1 : -1), 13 + k * 1, 1); } });
    lay(r, (s) => { // the claws up
      limb(s, 3, 8, 1, 4, 2); limb(s, 12, 8, 14, 4, 2);
      s.disc(1.6, 2.4, 2.8); s.disc(13.4, 2.4, 2.8);
    });
    r.cut(snap ? ['#', '#', '#'] : ['#'], 1, 1); r.cut(snap ? ['#', '#', '#'] : ['#'], 14, 1); // the claws' gape
    r.rect(5, 5, 5, 7); r.rect(10, 5, 10, 7); r.disc(5, 4.4, 1.4); r.disc(10, 4.4, 1.4); // eye stalks and eyes
    r.set(5, 4, false); r.set(10, 4, false);
    r.cut(['#####'], 5, 10); r.rect(5, 9, 5, 9); r.rect(9, 9, 9, 9); // a wide grin
    return r.rows();
  };
  return pair('pacCrab', [frame(-1, true), frame(0, false), frame(1, true), frame(0, false)], 2, true);
}

// ---- the tiki: a carved mask head, brown, with huge eyes and tusks, bobbing

/** A floating tiki head: a flat brow, great round eyes, a wide nose, the mouth open with tusks, bobbing as it goes. */
function tiki(): NewCreature {
  const frame = (bob: number, wide: boolean) => {
    const r = new Raster(16, 16);
    r.rect(1, 1 + bob, 14, 14 + bob);
    r.rect(0, 3 + bob, 15, 4 + bob); r.rect(2, 0 + bob, 13, 0 + bob); // the brow ridge
    r.cut(['.##.', '####', '####', '.##.'], 2, 5 + bob); r.cut(['.##.', '####', '####', '.##.'], 10, 5 + bob); // the eyes
    r.rect(4, 6 + bob, 5, 7 + bob); r.rect(11, 6 + bob, 12, 7 + bob); // the pupils
    r.cut(['#.#'], 6, 9 + bob); r.rect(7, 7 + bob, 8, 9 + bob); // the nose
    r.cut(wide ? ['########', '########'] : ['########'], 4, 11 + bob);
    r.rect(5, 11 + bob, 5, 12 + bob); r.rect(10, 11 + bob, 10, 12 + bob); // the tusks
    r.rect(0, 15, 1, 15 - 0); r.rect(14, 15, 15, 15);
    r.rect(3, 15, 12, 15, false);
    return r.rows();
  };
  return pair('pacTiki', [frame(0, true), frame(1, false), frame(0, true), frame(-1, false)].map((rows) => rows), 9, true);
}

// ---- the hula dancer: a grass skirt swaying, a flower in the hair, a lei, arms out

/** A hula dancer facing us: a skirt of grass that swings, her arms waving over her head, a flower in her hair, a smile. */
function hula(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.disc(7.5, 3.4, 3.4); // the head
    r.rect(3, 1, 12, 2); r.rect(11, 0, 13, 2); // her hair and the flower
    r.cut(['#'], 12, 1); r.cut(['#.#'], 6, 3); r.rect(6, 3, 6, 3); r.rect(9, 3, 9, 3); r.cut(['###'], 6, 5); r.rect(7, 5, 8, 5);
    lay(r, (s) => { limb(s, 5, 8, 1 + sway, 3 - sway, 2); limb(s, 10, 8, 14 + sway, 3 + sway, 2); }); // arms
    r.rect(5, 7, 10, 11); r.rect(5, 8, 10, 8, false); r.rect(6, 9, 6, 9, false); r.rect(9, 9, 9, 9, false); // the body with its lei in rows
    for (let x = 3; x < 13; x++) { // the skirt
      const len = 4 + ((x + sway + 4) % 3 === 0 ? 1 : 0);
      r.rect(x + sway, 11, x + sway, 11 + len);
    }
    for (const x of [4, 7, 10]) r.rect(x + sway, 12, x + sway, 15, false);
    r.rect(5, 15, 6, 15); r.rect(9, 15, 10, 15);
    return r.rows();
  };
  return pair('pacHula', [frame(-1), frame(0), frame(1), frame(0)], 13, true);
}

// ---- the coconut: a hairy brown ball with three eyes-and-mouth holes, bouncing, squashing

/** A coconut with a face, bouncing: round and tall in the air, squashed flat at the bottom. */
function coconut(): NewCreature {
  const frame = (h: number, squash: number) => {
    const r = new Raster(16, 16);
    const ry = 6.5 - squash, cy = 15 - ry - h;
    r.ellipse(7.5, cy, 7, ry);
    for (const [x, dy] of [[2, -ry + 1], [5, -ry], [10, -ry], [13, -ry + 1]] as const) r.rect(x, Math.round(cy + dy) - 1, x, Math.round(cy + dy)); // the husk's hairs
    r.cut(['##', '##'], 4, Math.round(cy - 2)); r.cut(['##', '##'], 9, Math.round(cy - 2)); // eyes
    r.rect(5, Math.round(cy - 2), 5, Math.round(cy - 2)); r.rect(10, Math.round(cy - 2), 10, Math.round(cy - 2));
    r.cut(['.####.', '######'].slice(0, squash ? 1 : 2), 5, Math.round(cy + 1)); // the mouth
    r.rect(1, 15 - 0, 14, 15, squash > 0); r.rect(0, 15, 15, 15, false);
    return r.rows();
  };
  return pair('pacCoconut', [frame(4, 0), frame(2, 0), frame(0, 2), frame(2, 0)], 9, true);
}

// ---- the magma blob: a bubble of lava with an angry face, flames on its top, hopping

/** A blob of lava hopping: a fat ball with flames licking from it, glaring eyes and a jagged mouth. */
function magma(): NewCreature {
  const frame = (hop: number, flame: number) => {
    const r = new Raster(16, 16);
    const cy = 10 - hop;
    r.ellipse(7.5, cy, 7, 5.2 + (hop ? 0.8 : -0.4));
    r.triangle(3, cy - 3, 4, 0 + flame, 7, cy - 4); r.triangle(6, cy - 4, 8, 0 + (1 - flame) * 2, 10, cy - 4); r.triangle(9, cy - 4, 12, 1 + flame, 12.5, cy - 2); // flames
    r.cut(['##.', '.##'], 3, Math.round(cy - 3)); r.cut(['.##', '##.'], 9, Math.round(cy - 3)); // slanted eyes
    r.rect(4, Math.round(cy - 2), 5, Math.round(cy - 2)); r.rect(10, Math.round(cy - 2), 11, Math.round(cy - 2));
    r.cut(['#.#.#.#'], 4, Math.round(cy + 1)); r.cut(['#######'], 4, Math.round(cy + 2));
    r.rect(0, 15, 15, 15, hop === 0); // it sits in a puddle
    return r.rows();
  };
  return pair('pacMagma', [frame(0, 0), frame(3, 1), frame(4, 2), frame(2, 1)], 8, true);
}

// ---- the turtle: green, a domed shell in plates, a big head with a kind eye, flippers rowing

/** A green turtle swimming to the left: the shell's plates, a head out on its neck, a flipper rowing under, one behind. */
function turtle(): NewCreature {
  const frame = (row: number) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { s.triangle(11, 11, 15, 12 + (row % 2), 12, 14); }); // the hind flipper
    r.ellipse(9.5, 8, 6, 5); r.rect(3, 12, 15, 12); // the dome of the shell, flat under
    r.rect(3, 12, 15, 12, false);
    r.rect(5, 12, 14, 12); // the rim
    r.rect(8, 4, 8, 11, false); r.rect(12, 4, 12, 11, false); r.rect(5, 8, 15, 8, false); // the plates' seams
    r.triangle(15, 10, 15.5, 11, 13, 11); // the tail
    lay(r, (s) => { s.triangle(5, 12, 12 - row * 1.5, 15, 9, 12); s.triangle(4, 11, 7, 15 - (row === 2 ? 1 : 0), 8, 12); }); // the front flippers rowing
    r.disc(3.2, 6.5, 3.2); r.rect(3, 8, 6, 10); // the head and neck
    r.cut(['##', '##'], 2, 4.5); r.rect(2, 5, 2, 5); // the eye
    r.rect(0, 7, 2, 7, false); r.set(0, 8, true); // the mouth's smile
    return r.rows();
  };
  return pair('pacTurtle', [0, 1, 2, 3].map(frame), 5);
}

// ---- the captain's parrot: a macaw seen front on, a great hooked beak, rings round its eyes, a crest, wings beating

/** A parrot in flight, front on: wings up, level, down, level; a big round head with a ringed eye each side and a hooked beak between. */
function parrot(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    const y = [0, 5, 10, 5][wing] ?? 5;
    lay(r, (s) => { s.triangle(5, 9, 0, y, 3, y + 6); s.triangle(10, 9, 15, y, 12, y + 6); s.triangle(5, 9, 3, y + 6, 6, 14); s.triangle(10, 9, 12, y + 6, 9, 14); }); // the wings
    lay(r, (s) => { s.rect(6, 12, 9, 15); s.rect(7, 13, 8, 15, false); s.rect(7, 15, 8, 15, true); }); // the tail
    r.ellipse(7.5, 10, 3.4, 4.5); // the body
    r.disc(7.5, 5.2, 5); // the head
    r.triangle(4, 1, 7, -2, 8, 1); r.triangle(8, 1, 11, -1, 11, 2); // the crest
    r.cut(['.##.', '####', '####', '.##.'], 2, 3); r.cut(['.##.', '####', '####', '.##.'], 10, 3); // the eyes' rings
    r.rect(3, 4, 3, 5); r.rect(12, 4, 12, 5); // the pupils
    r.rect(6, 4, 9, 9); r.rect(7, 10, 8, 11); // the beak, hooked and long
    r.rect(6, 7, 9, 7, false); r.rect(7, 5, 8, 5, false); // its seam, its nostril
    return r.rows();
  };
  return pair('pacParrot', [0, 1, 2, 3].map(frame), 2, true);
}

// ---- the shark: grey, side on, a wedge of a snout, an eye, a grin of teeth, a fin and a tail that swings

/** A shark swimming to the left: a dorsal fin up, a big eye, the jaws opening on their teeth, a forked tail that swings. */
function sharkFin(): NewCreature {
  const frame = (swing: number, open: boolean) => {
    const r = new Raster(16, 16);
    r.ellipse(7.5, 9, 7.2, 4.2); // the body
    r.triangle(0, 10, 4, 5, 6, 11); // the snout
    r.triangle(6, 6, 9, 0, 12, 6); // the dorsal fin
    r.triangle(8, 6, 10, 2, 11, 6, false);
    lay(r, (s) => { s.triangle(12, 9, 15, 3 + swing * 2, 15, 8); s.triangle(12, 9, 15, 10, 15, 15 - swing * 2); }); // the tail's two lobes
    r.cut(['##', '##'], 3, 6); r.set(3, 6, true); // the eye
    r.cut(open ? ['######', '######'] : ['######'], 0, open ? 10 : 11); // the mouth
    r.stamp(open ? ['#.#.#.'] : ['#.#.#.'], 0, open ? 9 : 10); // the teeth
    if (open) r.stamp(['.#.#.#'], 0, 12);
    return r.rows();
  };
  return pair('pacSharkFin', [frame(0, true), frame(1, false), frame(2, true), frame(1, false)], 12);
}

// ---- the eel: a moray, a great head with its jaws open on rows of teeth, a thick body waving

/** A moray swimming to the left: a big head with a ringed eye, the jaws snapping on their teeth, a thick body that waves. */
function eel(): NewCreature {
  const frame = (ph: number, open: boolean) => {
    const r = new Raster(16, 16);
    for (let x = 7; x < 16; x++) {
      const y = 9 + 2.4 * Math.sin((x - ph * 2.2) / 1.9);
      r.rect(x, Math.round(y - 2.5), x, Math.round(y + 2.5));
    }
    r.ellipse(5, 8, 5.6, 5); // the head
    r.cut(open ? ['######', '######', '######'] : ['######'], 0, open ? 9 : 10); // the jaws
    r.stamp(['#.#.#.'], 0, open ? 8 : 9); // upper teeth
    if (open) r.stamp(['.#.#.#'], 0, 12);
    r.cut(['###', '###', '###'], 4, 3); r.rect(5, 4, 5, 4); // the eye
    return r.rows();
  };
  return pair('pacEel', [frame(0, true), frame(1, false), frame(2, true), frame(3, false)], 13);
}

// ---- the manta: a broad pair of wings flapping, two horns, eyes and a mouth at the front, a long tail

/** A manta ray flapping, front on like the bat: wings down, level, up, level; a body with two horns, two big eyes and a wide mouth, a long tail. */
function manta(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    const tip = [11, 6, 1, 6][wing] ?? 6;
    lay(r, (s) => { s.triangle(5, 5, 0, tip, 1, tip + 5); s.triangle(5, 5, 1, tip + 5, 6, 12); s.triangle(10, 5, 15, tip, 14, tip + 5); s.triangle(10, 5, 14, tip + 5, 9, 12); }); // the wings
    r.ellipse(7.5, 8, 4.4, 5.6); // the body
    lay(r, (s) => { s.triangle(3.4, 0, 3.4, 4, 5.8, 4); s.triangle(11.6, 0, 11.6, 4, 9.2, 4); }); // the horns
    r.rect(7, 12, 8, 15); // the tail
    r.cut(['##', '##'], 4, 5); r.cut(['##', '##'], 9, 5); r.rect(5, 5, 5, 5); r.rect(10, 5, 10, 5); // the eyes
    r.cut(['#####'], 5, 9); r.cut(['#..#'], 5.5, 11); // the mouth
    r.rect(2, tip + 3, 2, tip + 5, false); r.rect(13, tip + 3, 13, tip + 5, false);
    return r.rows();
  };
  return pair('pacManta', [0, 1, 2, 3].map(frame), 14, true);
}

// ---- the surfer: front on, riding his board, spiky hair, sunglasses, a wide grin, one arm up hanging loose

/** The surfer's first pose, row by row: his right arm up in a wave, the other down, the board under his feet. */
const SURFER: readonly string[] = [
  '....#.#..#.#..#.',
  '...##########.##',
  '...##########.#.',
  '...#..####..#.#.',
  '...#..####..###.',
  '...##########.#.',
  '....#......#.#..',
  '.....######..#..',
  '..############..',
  '.##.#.####.#.##.',
  '.##.########.##.',
  '.#..##....##..#.',
  '....##....##....',
  '....##....##....',
  '.##############.',
  '..############..',
];

function surfer(): NewCreature {
  const waveLeft = mirrored(SURFER);
  const left = [SURFER, shifted(waveLeft, 1), SURFER, shifted(waveLeft, 1)];
  return pair('pacSurfer', left, 8);
}

/** The guard's legs, four rows a step. */
const GUARD_STEPS: readonly (readonly [string, string, string, string])[] = [
  ['...####..####...', '...####..####...', '...###....###...', '..####....####..'],
  ['....########....', '....###..###....', '....###..###....', '...####..####...'],
  ['...####..####...', '...###....###...', '...###....###...', '..####....####..'],
  ['....########....', '....###..###....', '....###..###....', '...####..####...'],
];

/** An airport guard marching, drawn row by row: the peaked cap, black sunglasses, a flowered shirt, a wand held out at the right. */
function guard(): NewCreature {
  const frame = (step: number) => {
    const legs = GUARD_STEPS[step] ?? GUARD_STEPS[0] ?? ['', '', '', ''];
    return [
      '....########....',
      '...##########...',
      '.##############.',
      '....########....',
      '....#..##..#....',
      '....########....',
      '.....#....#.....',
      '.....######.....',
      '..############.#',
      '.##.#.####.#.###',
      '.####.#..#.####.',
      '.#.##########.#.',
      ...legs,
    ];
  };
  return pair('pacGuard', [0, 1, 2, 3].map(frame), 7);
}

// ---- the swinging cargo: a crate on a chain from a trolley, with a scowl, swaying

/** A crate swinging on its chain: a hook ring and links at the top, a strapped crate with a scowling face, swaying a pixel either way. */
function swingCrate(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.rect(6 + sway, 0, 9 + sway, 1); r.rect(7 + sway, 0, 8 + sway, 1, false); // the hook's ring
    r.rect(7 + sway, 2, 8 + sway, 4); r.rect(7 + sway, 3, 7 + sway, 3, false); // links
    r.rect(1, 5, 14, 15); // the crate
    r.cut(['##############'], 1, 8); // a strap
    r.cut(['##', '##'], 3, 6); r.cut(['##', '##'], 11, 6); r.rect(4, 7, 4, 7); r.rect(11, 7, 11, 7); // eyes
    r.cut(['##########'], 3, 10); r.rect(4, 10, 4, 11); r.rect(7, 10, 7, 11); r.rect(10, 10, 10, 11); // the scowl's teeth
    r.rect(1, 13, 14, 13, false); // a plank line
    return r.rows();
  };
  return pair('pacSwingCrate', [frame(-1), frame(0), frame(1), frame(0)], 9, true);
}

export const PACIFIC_CREATURES = {
  pacParrot: parrot(),
  pacSharkFin: sharkFin(),
  pacCrab: crab(),
  pacTurtle: turtle(),
  pacEel: eel(),
  pacManta: manta(),
  pacTiki: tiki(),
  pacHula: hula(),
  pacSurfer: surfer(),
  pacCoconut: coconut(),
  pacGuard: guard(),
  pacMagma: magma(),
  pacSwingCrate: swingCrate(),
} as const satisfies Record<string, NewCreature>;

export type PacificCreature = keyof typeof PACIFIC_CREATURES;
