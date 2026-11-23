/**
 * The Andes' and the Amazon's creatures for Monty Mole: World Tour (region 6), in Monty on the Run's formats and the earlier regions'
 * manner: bold cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps,
 * a big face with an expression, no dither. A condor, two llamas (one winking, one spitting), a guinea pig, a cave bat, a jaguar, a
 * toucan, a sloth, an anaconda, a piranha and a pink river dolphin. The macaw of the riverboat is the toucan's
 * picture in red (a colour record, `colour` on the room's enemy).
 */
import { capsule, lay, pair, sym } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';

// ---- the condor: white, wide, a bare head with a hooked beak over a ruff, wheeling

const CONDOR_UP = [
  '#....###', '##..####', '##..#.##', '###.####', '####.#.#', '#####.##', '########', '########',
  '.#######', '..######', '...#####', '....####', '.....###', '.....###', '......##', '.....#.#',
] as const;
const CONDOR_LEVEL = [
  '........', '.....###', '....####', '....#.##', '....####', '.....#.#', '..######', '########',
  '########', '#.######', '#.#.####', '..#..###', '.....###', '.....###', '......##', '.....#.#',
] as const;
const CONDOR_DOWN = [
  '.....###', '....####', '....#.##', '....####', '.....#.#', '..######', '.#######', '.#######',
  '#.######', '#.######', '##.#####', '##..####', '###..###', '#.#..###', '#....###', '.....#.#',
] as const;

/** A condor in flight seen front on: the great wings up, level, down, level, their ends fingered; a ruff round a bare head with its eyes and hooked beak cut in, a short tail. White, to stand off the grey rock. */
function condor(): NewCreature {
  return pair('condor', [CONDOR_UP, CONDOR_LEVEL, CONDOR_DOWN, CONDOR_LEVEL].map(sym), 15, true);
}

// ---- the llama: woolly, a long neck, banana ears, a big silly face; it winks (Jeff Minter's)

/** How a llama's face is: its ears, its eye and its mouth. */
interface LlamaFace { readonly ears: 'up' | 'back'; readonly eye: 'open' | 'wink' | 'scowl'; readonly mouth: 'shut' | 'chew' | 'spit' }

/** A llama walking to the left, its long neck up and its face turned out at us (leg swing `a`). */
function sideLlama(a: number, face: LlamaFace): string[] {
  const r = new Raster(16, 16);
  lay(r, (s) => { limb(s, 10, 11, 9.5 + a, 15, 2); limb(s, 13.5, 11, 13.5 - a, 15, 2); }); // the back legs
  r.ellipse(11, 10, 4.8, 3.6); // the woolly body
  for (const [x, y] of [[9, 8], [12, 8], [10, 11], [13, 11]] as const) r.set(x, y, false); // the wool's tufts
  r.rect(15, 8, 15, 9); // the tail
  lay(r, (s) => { limb(s, 5.5, 12, 5 - a, 15, 2); limb(s, 8.5, 12, 8.5 + a, 15, 2); }); // the front legs
  limb(r, 6, 9, 5, 4.5, 3); // the neck
  r.ellipse(4.5, 3.8, 3.2, 3.2); // the head
  r.ellipse(3.4, 6.6, 2.4, 1.8); // the muzzle
  if (face.ears === 'up') lay(r, (s) => { s.triangle(3, 1.4, 2.5, -1, 4.5, 0.6); s.triangle(6.4, 1.4, 7.5, -1, 8.3, 1.4); });
  else lay(r, (s) => { s.triangle(5.5, 1.8, 9.5, 2.6, 6.4, 0.2); s.triangle(7, 3, 11, 3.6, 7.6, 1.6); });
  if (face.eye === 'open') r.cut(['##', '##'], 3, 3);
  else if (face.eye === 'wink') { r.cut(['###'], 2, 4); r.cut(['##', '##'], 6, 3); }
  else { r.cut(['##', '##'], 3, 3); r.cut(['###'], 2, 2); }
  r.cut(['#'], 1.5, 6); // the nostril
  if (face.mouth === 'chew') r.cut(['####', '#..#'], 2, 8);
  else if (face.mouth === 'spit') { r.cut(['####', '####'], 1, 8); r.rect(0, 11, 1, 12); r.set(0, 14); }
  else r.cut(['####'], 2, 8);
  return r.rows();
}

function llama(): NewCreature {
  const f = (eye: LlamaFace['eye'], mouth: LlamaFace['mouth']): LlamaFace => ({ ears: 'up', eye, mouth });
  return pair('llama', [sideLlama(1.5, f('open', 'shut')), sideLlama(0, f('wink', 'shut')), sideLlama(-1.5, f('open', 'chew')), sideLlama(0, f('wink', 'chew'))], 15, false);
}

/**
 * The spitting llama: orange-brown, in profile like the others but with its neck stretched out low and forward over its shoulders, ears laid back, a scowl, a glob flying from its mouth (a different animal on the page from the winking
 * llamas' upright, woolly ones).
 */
function spitterFrame(a: number, spit: boolean): string[] {
  const r = new Raster(16, 16);
  lay(r, (s) => { limb(s, 10, 11, 9.5 + a, 15, 2); limb(s, 13.5, 11, 13.5 - a, 15, 2); }); // the back legs
  r.ellipse(11, 10, 4.8, 3.2); // the body, lower and leaner
  r.rect(15, 9, 15, 10); // the tail
  lay(r, (s) => { limb(s, 6.5, 11, 6 - a, 15, 2); limb(s, 9, 11, 9 + a, 15, 2); }); // the front legs
  limb(r, 7.5, 9, 3.5, 6.5, 3); // the neck, stretched forward and down
  r.ellipse(3, 6.5, 3, 2.6); // the head, thrust out
  lay(r, (s) => { s.triangle(5, 5, 9, 4, 6.5, 2.6); s.triangle(4, 4.4, 8, 3.2, 5, 1.6); }); // the ears, laid back along the neck
  r.cut(['##', '.#'], 2, 5); // the scowling eye
  r.cut(['#'], 0, 7); // the nostril
  r.cut(spit ? ['###'] : ['##'], 0, 8);
  if (spit) { r.disc(-1, 9.5, 0.8); r.rect(0, 10, 1, 11); r.set(0, 13); } // the glob
  return r.rows();
}

function spitter(): NewCreature {
  return pair('spitter', [spitterFrame(1, false), spitterFrame(0, true), spitterFrame(-1, false), spitterFrame(0, true)], 8, false);
}

// ---- the guinea pig (cuy): a round bright chunk with a big face

/** A guinea pig scurrying, seen front on: a round body, a blunt face with two big eyes and long front teeth, patches, tiny feet. */
function cuy(): NewCreature {
  const frame = (hop: number, step: number) => {
    const r = new Raster(16, 16);
    const y = hop;
    r.ellipse(7.5, 9 + y, 7.2, 5.6); // the round body
    r.disc(3, 3.6 + y, 1.7); r.disc(12, 3.6 + y, 1.7); // the ears
    r.cut(['##', '##'], 4, 5 + y); r.cut(['##', '##'], 10, 5 + y); // the big eyes
    r.rect(4, 6 + y, 4, 6 + y); r.rect(11, 6 + y, 11, 6 + y);
    r.cut(['..', '##'], 7, 8 + y); r.cut(['#'], 7, 9 + y); // the nose
    r.rect(6, 10 + y, 9, 11 + y, false); r.rect(7, 10 + y, 8, 11 + y); r.rect(7, 11 + y, 7, 11 + y, false); // the buck teeth
    r.cut(['###', '#..', '###'], 1, 8 + y); r.cut(['###', '..#', '###'], 12, 8 + y); // the patches
    const f = step ? 1 : 0;
    r.rect(3 + f, 14, 5 + f, 15); r.rect(10 - f, 14, 12 - f, 15); // the feet
    return r.rows();
  };
  return pair('cuy', [frame(0, 0), frame(-1, 1), frame(0, 0), frame(-1, 1)], 8, true);
}

// ---- the jaguar: yellow with black rosettes, a big grinning face

/** A jaguar padding to the left, its great face turned out at us: round ears, slit eyes, a wide grin of fangs, rosettes cut into the coat. */
function jaguar(): NewCreature {
  const frame = (a: number, grin: boolean) => {
    const r = new Raster(16, 16);
    lay(r, (s) => { limb(s, 9, 11, 8 + a, 15, 2); limb(s, 13, 11, 13 - a, 15, 2); });
    r.ellipse(11.5, 10, 4.7, 3.2); // the body
    limb(r, 15, 8, 15.5, 4, 2); r.set(15, 3); // the tail, curled up
    r.cut(['##', '#.'], 10, 8); r.cut(['##', '#.'], 13, 10); r.cut(['#.', '##'], 8, 10); // rosettes
    lay(r, (s) => { limb(s, 3, 12, 2 - a, 15, 2); limb(s, 8, 12, 8 + a, 15, 2); });
    r.disc(6, 6.5, 5.2); // the head
    r.disc(1.6, 2.2, 1.8); r.disc(10.4, 2.2, 1.8); // the round ears
    r.rect(2, 9, 10, 12); // the jaw
    r.cut(['##.', '.##'], 2, 4); r.cut(['.##', '##.'], 7, 4); // slit eyes
    r.rect(3, 5, 3, 5); r.rect(8, 5, 8, 5);
    r.cut(['##'], 5, 7); // the nose
    r.cut(grin ? ['#########', '#########'] : ['#########'], 2, grin ? 10 : 11);
    r.stamp(grin ? ['#.#.#.#.#'] : ['#.#.#.#'], grin ? 2 : 3, grin ? 10 : 11);
    r.cut(['#'], 1, 7); r.cut(['#'], 10, 7); // the spots on the cheeks
    return r.rows();
  };
  return pair('jaguar', [frame(1.5, true), frame(0, false), frame(-1.5, true), frame(0, false)], 7);
}

// ---- the toucan: a black-ringed eye and a great banana beak with its tip, orange

/** A toucan's body, tail and head, drawn in rows (facing left): the enormous beak out of the left, down-curved, its tip cut off by a line; a round head with a ringed eye; `legs` are the last rows. */
const TOUCAN = [
  '................',
  '.......####.....',
  '......######....',
  '#####.##.####...',
  '#########.####..',
  '#########.#####.',
  '.########.######',
  '..#.......######',
  '...##########.##',
  '.....########..#',
  '......######....',
  '.......####.##..',
] as const;

/** A toucan perched or flying: the beak's line cut along it, the wings (up, level, down) over the body. */
function toucan(): NewCreature {
  const frame = (w: number): string[] => {
    const r = new Raster(16, 16);
    r.stamp(TOUCAN, 0, 0);
    r.cut(['#######'], 0, 5); // the beak's line
    r.cut(['##'], 4, 3); // the beak's tip, cut off
    r.cut(['.##.', '#..#', '#..#', '.##.'], 6, 2); // (the eye's ring, cut)
    r.rect(7, 3, 8, 4); // the eye, lit in the ring
    const y = [0, 4, 8, 4][w] ?? 4;
    const wing = new Raster(16, 16);
    wing.triangle(8, 7, 15, 5 + y * 0.5, 14, 11 + y * 0.5);
    over2(r, wing);
    r.rect(7, 12, 9, 15); r.rect(11, 12, 13, 15, false);
    r.rect(9, 12, 10, 14); r.rect(8, 15, 11, 15);
    return r.rows();
  };
  return pair('toucan', [0, 1, 2, 3].map(frame), 1, false);
}

/** `shape` over `r` with its moat. */
function over2(r: Raster, shape: Raster) { lay(r, (s) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (shape.get(x, y)) s.set(x, y); }); }

// ---- the sloth: brown, hanging, a dopey smile in two dark eye patches

/** A sloth hanging from a bough by its long arms, swaying: a pale round face with two dark eye patches and a slow smile. */
function sloth(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.rect(0, 0, 15, 1); // the bough
    limb(r, 3 + sway, 2, 5 + sway, 9, 3); limb(r, 12 + sway, 2, 10 + sway, 9, 3); // the arms up to it
    r.ellipse(7.5 + sway, 12, 5, 3.8); // the shaggy body
    for (const x of [4, 7, 10]) r.rect(x + sway, 13, x + sway, 15, false); // the shag
    lay(r, (s) => s.ellipse(7.5 + sway, 7, 4.6, 3.8)); // the round face
    r.cut(['####', '####'], 4 + sway, 5); r.cut(['####', '####'], 8 + sway, 5); // the eye patches
    r.rect(5 + sway, 5, 5 + sway, 6); r.rect(10 + sway, 5, 10 + sway, 6); // the eyes, lit in them
    r.cut(['##'], 7 + sway, 7); // the nose
    r.cut(['#....#', '.####.'], 5 + sway, 8); // the long smile
    return r.rows();
  };
  return pair('sloth', [frame(-1), frame(0), frame(1), frame(0)], 9, true);
}

// ---- the anaconda: a thick green S, the head reared with a forked tongue

/** An anaconda: a thick body in an S, the head reared at the left with its tongue flicking, a diamond pattern cut along it. */
function anaconda(): NewCreature {
  const frame = (phase: number, tongue: boolean) => {
    const r = new Raster(16, 16);
    const pts: [number, number][] = [];
    for (let x = 15; x >= 3; x--) pts.push([x, 13 + Math.sin((x + phase * 3) / 2.2) * 2]);
    pts.forEach(([x, y], i) => { const p = pts[i + 1]; if (p) limb(r, x, y, p[0], p[1], 4); });
    limb(r, 4, 13, 3, 6, 4); // the neck rising
    r.ellipse(3.5, 4.4, 3.8, 3); // the head
    r.cut(['#', '#'], 2, 3); r.cut(['#', '#'], 5, 3); // the eyes
    r.cut(['##'], 3, 6); // the mouth
    if (tongue) { r.rect(0, 7, 1, 7); r.set(0, 6); r.set(0, 8); }
    for (let x = 14; x > 5; x -= 3) r.cut(['#'], x, 13 + Math.sin((x + phase * 3) / 2.2) * 2); // the pattern
    return r.rows();
  };
  return pair('anaconda', [frame(0, true), frame(1, false), frame(2, true), frame(3, false)], 5);
}

// ---- the piranha: red, a great underbite of teeth (no longer a creature of the rooms: the river's fish leap, as `rollers`)

/** A piranha's body, facing left (12 wide): the eye with its furious brow, the jutting jaw with teeth top and bottom. */
const PIRANHA = [
  '............',
  '.....###....',
  '...#######..',
  '..#########.',
  '.###########',
  '##.#.#######',
  '#..#.#######',
  '#.#.#.######',
  '.....#######',
  '#.#.#.######',
  '###.#.######',
  '..#########.',
  '...#######..',
  '.....###....',
  '............',
  '............',
] as const;
/** The tail's 4 columns beating up, level and down. */
const PIRANHA_TAIL = [
  ['....', '....', '...#', '..##', '.###', '####', '###.', '####', '.###', '..##', '...#', '....', '....', '....', '....', '....'],
  ['....', '....', '....', '...#', '..##', '.###', '####', '###.', '####', '.###', '..##', '...#', '....', '....', '....', '....'],
  ['....', '....', '....', '....', '...#', '..##', '.###', '####', '###.', '####', '.###', '..##', '...#', '....', '....', '....'],
] as const;

/** The piranha's picture, facing left (16 x 16): the river's leaping fish (andes-items.ts) are this turned up and down. */
export const PIRANHA_PICTURE: readonly string[] = PIRANHA.map((row, i) => row + (PIRANHA_TAIL[1]?.[i] ?? '....'));

// ---- the pink river dolphin: a long beak, a smile, leaping

/** A pink river dolphin swimming to the left: a long beak, a bulging forehead, a smile, a small eye, a back fin, a flipper, the flukes beating. */
function dolphin(): NewCreature {
  const frame = (beat: number) => {
    const r = new Raster(16, 16);
    capsule(r, [[3.2, 9, 2], [6.5, 8.2, 3.3], [10.5, 8, 2.5], [13, 7 + beat, 1.2]]); // the body
    r.triangle(13, 7 + beat, 15.5, 3 + beat, 14.6, 8 + beat); r.triangle(13, 7 + beat, 15.5, 11.5 + beat, 14.6, 8 + beat); // the flukes
    r.triangle(6.5, 5.5, 10.5, 6, 9, 1); // the back fin
    limb(r, 0, 10.4, 2.5, 9.8, 2); // the long beak
    r.cut(['####'], 0, 11); // the smile along it
    r.cut(['##', '##'], 3, 6.5); r.rect(3, 7, 3, 7); // the eye, lit
    r.triangle(5.5, 11, 9, 11.5, 6, 15); // the flipper
    return r.rows();
  };
  return pair('dolphin', [frame(0), frame(1), frame(0), frame(-1)], 10);
}

export const ANDES_CREATURES = {
  condor: condor(),
  llama: llama(),
  spitter: spitter(),
  cuy: cuy(),
  jaguar: jaguar(),
  toucan: toucan(),
  sloth: sloth(),
  anaconda: anaconda(),
  dolphin: dolphin(),
} as const satisfies Record<string, NewCreature>;

export type AndesCreature = keyof typeof ANDES_CREATURES;
