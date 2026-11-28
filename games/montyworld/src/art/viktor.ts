/**
 * VIKTOR VOLE, the Russian operative, Monty's mirror and the one agent on his trail round the world (docs/dosvidaniya-plan.md, "The pursuer"): every picture of him in one place, so redrawing him is an art swap here and
 * nowhere else. A vole Monty's size but sleeker: a tall fur hat with a star, a long snout with a little moustache under its tip, a black greatcoat to the knees (drawn as the coat's edges, collar, belt and two
 * rows of buttons in his ink: the coat itself is the black between), boots. These hires pictures are in one ink, white (the squash, the HUD's face, the shadow's shape); in play he walks in colour, multicolour (`VIKTOR_WALK`, `VIKTOR_CAMEO`, below). In Monty on the Run's formats: creature frames of
 * 16 x 16 facing left (mirrored for right), and 24 x 21 sprite blocks for the squash (Monty on the Run's four-way split). The star is cut into the hat (one ink: a red star would need a sprite of its own over him).
 *
 * Users: the agent creature (rio-creatures.ts `agent`: the pursuer's walk), the cameos' frames (`VIKTOR_CAMEO`: two steps, a look after Monty, a fist shaken after him), the squash (`VIKTOR_SPLIT`), the procession's and the
 * credits' name (`VIKTOR_NAME`).
 */
import { creatureBank, mcCreatureBank, mirrored, spriteBlock } from './pixels';
import type { NewCreature } from './types';

/** His name, as the procession and the credits give it. */
export const VIKTOR_NAME = 'VIKTOR VOLE';
/** His ink (white): the hires pictures' (the squash's heads keep Monty's own colours). */
export const VIKTOR_INK = 1;

/** The hat and the head, facing left (rows 0-9): the fur hat with its star cut in, the eye, the long snout, the moustache under its tip. */
const HEAD = [
  '...#########....', // 0 the hat's crown
  '...####.####....', // 1 the star's top point
  '...###...###....', // 2 its arms
  '...###.#.###....', // 3 its two feet
  '..###########...', // 4 the hat's fur band
  '....########....', // 5 the brow
  '...###.#####....', // 6 the eye
  '############....', // 7 the snout, its nose at the tip
  '##....######....', // 8 the moustache (the black under the nose)
  '..######.##.....', // 9 the jaw, the mouth
] as const;

/** The greatcoat (rows 10-14): the collar, an edge, two rows of buttons, the belt, the hem flaring. */
const COAT = [
  '...##########...', // 10 the collar
  '...#.#..#...#...', // 11
  '...##########...', // 12 the belt
  '...#.#..#...#...', // 13
  '..############..', // 14 the hem
] as const;

/** A frame from rows: the head (moved down a row for the look down), the coat, the boots, and an arm. */
function figure(head: readonly string[], boots: string, arm: readonly (readonly [number, number])[], tail: boolean): string[] {
  const rows = [...head, ...COAT, boots].map((r) => [...r]);
  for (const [x, y] of arm) { const row = rows[y]; if (row) row[x] = '#'; }
  if (tail) for (const [x, y] of [[13, 13], [14, 14]] as const) { const row = rows[y]; if (row) row[x] = '#'; }
  return rows.map((r) => r.join(''));
}

/** The arm hanging at his side, swung forward, and raised to the hat's brim (shading his eyes as he looks after Monty). */
const ARM_DOWN = [[2, 11], [2, 12], [2, 13]] as const;
const ARM_FORWARD = [[2, 11], [1, 12], [1, 13]] as const;
const ARM_UP = [[2, 10], [2, 9], [1, 8], [1, 5], [0, 5], [1, 6]] as const;

/** The boots: together, apart (a stride), crossing. */
const BOOTS = { stand: '....##...##.....', stride: '...##.....##....', cross: '.....##.##......' } as const;

/** The four frames of his walk going left: stand, stride with the coat's tail flapping, stand, cross. */
const WALK = [
  figure(HEAD, BOOTS.stand, ARM_DOWN, false),
  figure(HEAD, BOOTS.stride, ARM_FORWARD, true),
  figure(HEAD, BOOTS.stand, ARM_DOWN, false),
  figure(HEAD, BOOTS.cross, ARM_FORWARD, true),
];

/** Looking after Monty, a hand shading his eyes. */
const LOOK = figure(HEAD, BOOTS.stand, ARM_UP, false);
/** Shaking his fist after Monty (the chase stopped short: cameos.ts `CameoStop`): the arm raised past his snout, the fist over the hat's brim; in turn with the look, the hand at the brim. */
const ARM_FIST = [[2, 10], [2, 9], [1, 6], [1, 5], [1, 4], [1, 3], [0, 2], [1, 2], [0, 1], [1, 1], [0, 0], [1, 0]] as const;
const FIST = figure(HEAD, BOOTS.stride, ARM_FIST, false);

/** The cameos' hires frames (going left two steps, the look, the fist): what his shadow is cut from. */
const CAMEO_LEFT = [WALK[1] ?? LOOK, WALK[3] ?? LOOK, LOOK, FIST];

/**
 * In play he is drawn in colour, as the title draws him (title-viktor.ts: a grey fur hat, his orange fur, the dark greatcoat), in the C64's sprite multicolour: a pixel two wide, in three colours,
 * the sprite's own and the two every multicolour sprite shares (Chris, 2026-11-27: in game he was "solid white and looks nothing like he does on the title screen"). The coat is the title's black made
 * dark grey, so it reads on the rooms' black and still reads as a dark coat; the red star on the hat is cut in as one of the coat's pixels (a fourth colour would need a sprite
 * of its own). 'a' his fur (the first shared colour), 'b' the coat (the sprite's own), 'c' the hat (the second). 16 pixels of 16 as the hires pictures, in the title's proportions: the hat rows
 * 0-3, the face 4-7, the coat 8-14, the boots 15.
 */
export const VIKTOR_MC = { fur: 8, hat: 12 } as const;
/** His coat (the sprite's own colour, the cameos' and the agent creature's). */
export const VIKTOR_COAT = 11;
/** The two shared colours for the engine (MontyData.spriteMulticolours: 'a' and 'c'). */
export const VIKTOR_MULTICOLOURS = { mc1: VIKTOR_MC.fur, mc2: VIKTOR_MC.hat } as const;

/** The hat and the head, facing left (rows 0-7, in the title's proportions: the hat four rows, the face four): the fur hat with the star cut in, its band; the brow, the eye, the long snout with the nose at its tip, the moustache under it. */
const MC_HEAD = [
  '.ccccc..', // 0 the hat's crown
  '.ccbcc..', // 1 the star
  '.ccccc..', // 2
  '.cccccc.', // 3 the fur band
  '..aaaa..', // 4 the brow
  '.aabaa..', // 5 the eye
  'baaaaa..', // 6 the snout, its nose at the tip
  'b..aaa..', // 7 the moustache, the jaw
] as const;
/** The greatcoat (rows 8-14), plain as the title's: the collar at the neck, the coat to the knees. */
const MC_COAT = [
  '..bbbb..', // 8 the collar
  '.bbbbbb.', // 9
  '.bbbbbb.', // 10
  '.bbbbbb.', // 11
  '.bbbbbb.', // 12
  '.bbbbbb.', // 13
  '.bbbbbb.', // 14 the hem
] as const;
/** The boots (the coat's colour, as the title's legs are): together, apart, crossing. */
const MC_BOOTS = { stand: '..b.bb..', stride: '.bb..b..', cross: '..bbb...' } as const;
type McPixel = readonly [x: number, y: number, c: 'a' | 'b' | 'c'];
/** The arm (a sleeve, his hand in his fur's colour): at his side, swung forward, raised to shade his eyes, and raised past the hat in a fist. */
const MC_ARM = {
  down: [[0, 9, 'b'], [0, 10, 'b'], [0, 11, 'b'], [0, 12, 'a']],
  forward: [[0, 9, 'b'], [0, 10, 'b'], [0, 11, 'a']],
  up: [[0, 9, 'b'], [0, 8, 'b'], [0, 4, 'a'], [1, 4, 'a']],
  fist: [[0, 9, 'b'], [0, 8, 'b'], [0, 5, 'b'], [0, 4, 'b'], [0, 3, 'b'], [0, 2, 'b'], [0, 1, 'a'], [0, 0, 'a']],
} as const satisfies Record<string, readonly McPixel[]>;
/** A multicolour frame: the head, the coat, the boots, an arm, and the coat's tail flapping in a stride. */
function mcFigure(boots: string, arm: readonly McPixel[], tail: boolean): string[] {
  const rows = [...MC_HEAD, ...MC_COAT, boots].map((r) => [...r]);
  for (const [x, y, c] of [...arm, ...(tail ? [[7, 13, 'b'], [7, 14, 'b']] as const : [])]) { const row = rows[y]; if (row) row[x] = c; }
  return rows.map((r) => r.join(''));
}
const MC_WALK = [
  mcFigure(MC_BOOTS.stand, MC_ARM.down, false),
  mcFigure(MC_BOOTS.stride, MC_ARM.forward, true),
  mcFigure(MC_BOOTS.stand, MC_ARM.down, false),
  mcFigure(MC_BOOTS.cross, MC_ARM.forward, true),
];
const MC_LOOK = mcFigure(MC_BOOTS.stand, MC_ARM.up, false);
const MC_FIST = mcFigure(MC_BOOTS.stride, MC_ARM.fist, false);

/** The pursuer's walk (the agent creature): four frames each way, multicolour. */
export const VIKTOR_WALK: NewCreature = { frames: mcCreatureBank('viktor', MC_WALK, MC_WALK.map(mirrored)), copy: false, colour: VIKTOR_COAT, multicolour: true };

/** The cameos' frames, a creature bank of eight (cameos.ts `walkOn`): going left two steps, the look, the fist; then the same going right; multicolour, on a sprite in the coat's colour. */
const MC_CAMEO_LEFT = [MC_WALK[1] ?? MC_LOOK, MC_WALK[3] ?? MC_LOOK, MC_LOOK, MC_FIST];
export const VIKTOR_CAMEO: Uint8Array = mcCreatureBank('viktor cameo', MC_CAMEO_LEFT, MC_CAMEO_LEFT.map(mirrored));

/** A picture's shape filled: every row lit from its first lit pixel to its last (a shadow, a silhouette). */
const filled = (rows: readonly string[]): string[] => rows.map((r) => {
  const a = r.indexOf('#'), b = r.lastIndexOf('#');
  return a < 0 ? r : '.'.repeat(a) + '#'.repeat(b - a + 1) + '.'.repeat(r.length - 1 - b);
});

/** His shadow on a paper screen (Japan's THE LAST MOLE: cameos.ts with these frames): the walk's and the look's shapes filled, the same bank layout as `VIKTOR_CAMEO`. */
const SHADOW_LEFT = CAMEO_LEFT.map(filled);
export const VIKTOR_SHADOW: Uint8Array = creatureBank('viktor shadow', SHADOW_LEFT, SHADOW_LEFT.map(mirrored));

/**
 * His face for the HUD (the head's rows 0-9 facing left, 16 wide): `lit` as he is, `silhouette` the head's shape filled (drawn dark while he is away, lit when he is due), `flat` squashed to a few rows
 * (an escape).
 */
export const VIKTOR_FACE = {
  lit: HEAD,
  silhouette: filled(HEAD),
  flat: ['................', '................', '................', '................', '................', '..###########...', '############....', '##.#.#.######...', '..##########....', '................'],
} as const;

/**
 * Squashed by a Mole Crusher he goes as Monty does in Monty on the Run (scripts.ts `death4Split`): four of his heads fly apart, back, on, up and down, each in four pictures in turn. Monty's own are four
 * heads too (the bank's $7E-$8D: facing left, facing right, the snout down, the snout up; the four pictures of each a small wobble), so these are Viktor's head drawn the same way, one for one: the
 * head as it is, its snout dipped, its hat lifted off it a row, the snout dipped again. 24 x 21 blocks, sixteen, in that order (pursuers.ts `split`; the ending's parade reuses them).
 */
function splitPictures(): Uint8Array[] {
  const wobble = (k: number): string[] => {
    const rows = HEAD.map((r) => [...r]);
    if (k === 1 || k === 3) { const nose = rows[7], under = rows[8]; if (nose && under) { nose[0] = '.'; under[0] = '#'; } } // the snout dipped
    if (k === 2) return ['................', ...HEAD.slice(0, 4), '................', ...HEAD.slice(5, 9)]; // the hat lifted a row
    return rows.map((r) => r.join(''));
  };
  const at = (pic: readonly string[], x: number, y: number) => {
    const out = Array.from({ length: 21 }, () => [...'.'.repeat(24)]);
    pic.forEach((r, j) => [...r].forEach((ch, i) => { const row = out[y + j]; if (row && ch === '#') row[x + i] = '#'; }));
    return out.map((r) => r.join(''));
  };
  /** The head turned a quarter: its snout (the left) pointing down, or up. */
  const turned = (pic: readonly string[], snoutDown: boolean): string[] => Array.from({ length: 16 }, (_, y) => Array.from({ length: pic.length }, (_, x) => {
    const src = snoutDown ? pic[x]?.[15 - y] : pic[pic.length - 1 - x]?.[y];
    return src === '#' ? '#' : '.';
  }).join(''));
  const k4 = [0, 1, 2, 3].map(wobble);
  return [
    ...k4.map((p, k) => spriteBlock(`viktor split back ${k}`, at(p, 0, 2))),
    ...k4.map((p, k) => spriteBlock(`viktor split on ${k}`, at(mirrored(p), 0, 2))),
    ...k4.map((p, k) => spriteBlock(`viktor split up ${k}`, at(turned(p, true), 4, 0))),
    ...k4.map((p, k) => spriteBlock(`viktor split down ${k}`, at(turned(p, false), 4, 0))),
  ];
}
export const VIKTOR_SPLIT: readonly Uint8Array[] = splitPictures();

/** The frames as text (for a sheet or a test): the walk, the look, the fist (hires: his shadow's and the HUD's shapes), and the multicolour ones he is drawn in. */
export const VIKTOR_ROWS = { walk: WALK, look: LOOK, fist: FIST, mc: { walk: MC_WALK, look: MC_LOOK, fist: MC_FIST } } as const;
