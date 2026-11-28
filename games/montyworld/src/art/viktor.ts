/**
 * VIKTOR VOLE, the Russian operative, Monty's mirror and the one agent on his trail round the world (docs/dosvidaniya-plan.md, "The pursuer"): every picture of him in one place, so redrawing him is an art swap here and
 * nowhere else. A vole Monty's size but sleeker: a tall fur hat with a star, a long snout with a little moustache under its tip, a black greatcoat to the knees (drawn as the coat's edges, collar, belt and two
 * rows of buttons in his ink: the coat itself is the black between), boots. One ink, white, so he reads on Rio's black and apart from Monty's light grey. In Monty on the Run's formats: creature frames of
 * 16 x 16 facing left (mirrored for right), and 24 x 21 sprite blocks for the squash (Monty on the Run's four-way split). The star is cut into the hat (one ink: a red star would need a sprite of its own over him).
 *
 * Users: the agent creature (rio-creatures.ts `agent`: the pursuer's walk), the cameos' frames (`VIKTOR_CAMEO`: two steps, a look after Monty, a look down), the squash (`VIKTOR_SPLIT`), the procession's and the
 * credits' name (`VIKTOR_NAME`).
 */
import { creatureBank, mirrored, spriteBlock } from './pixels';
import type { NewCreature } from './types';

/** His name, as the procession and the credits give it. */
export const VIKTOR_NAME = 'VIKTOR VOLE';
/** His ink (white). */
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
/** Looking down over an edge: the hat and head bent forward and down a row, the snout pointing down at the drop. */
const LOOK_DOWN = figure(['................', ...HEAD.slice(0, 7), '##..########....', '...#####.##.....'].slice(0, 10), BOOTS.stand, ARM_FORWARD, false);

/** The pursuer's walk (the agent creature): four frames each way. */
export const VIKTOR_WALK: NewCreature = { frames: creatureBank('viktor', WALK, WALK.map(mirrored)), copy: false, colour: VIKTOR_INK };

/** The cameos' frames, a creature bank of eight (cameos.ts `CAMEO_FRAME`): going left two steps, the look, the look down; then the same going right. */
const CAMEO_LEFT = [WALK[1] ?? LOOK, WALK[3] ?? LOOK, LOOK, LOOK_DOWN];
export const VIKTOR_CAMEO: Uint8Array = creatureBank('viktor cameo', CAMEO_LEFT, CAMEO_LEFT.map(mirrored));

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

/** The frames as text (for a sheet or a test): the walk, the look, the look down. */
export const VIKTOR_ROWS = { walk: WALK, look: LOOK, lookDown: LOOK_DOWN } as const;
