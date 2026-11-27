import { mcBlock, spriteBlock } from './pixels';

/**
 * THE FULL MONTY's pictures (full-monty.ts: Do Svidaniya Monty's best ending, at 100%; Chris, 2026-11-25): Monty seen from the front (his own pictures are side
 * views, and his rope pictures his back), bare as he always is, then with the speedo and the sunglasses snapped on (sprites of their own over him: the speedo red,
 * the glasses black), flexing for the camera, from behind walking away up the beach (the speedo from behind), and lying back on his towel; the beach's crowd: a
 * sunbather in a bikini and one in trunks on their towels, a volleyball game and its ball. Monty's are hires, in his colour, his figure's pixels in the game's
 * manner (solid, the details cut out in black); the crowd's multicolour (a pixel two wide): their towel or net the sprite's own colour (`b`), skin the first
 * shared colour (`a`), the bikini, trunks and hair the second (`c`). Every picture stands on its block's row `FEET` (its lowest lit row is FEET - 1).
 */

/** The row under every standing picture's feet (the finale's `put` takes a figure's height: this). */
export const FULL_FEET = 17;
/** The row under the lying pictures (towels, the sunbathers, Monty lying back). */
export const LYING_FEET = 21;

/** Rows padded to a block: `rows` (each at most 24 wide) with their last row on `feet - 1`, the rest dark. */
function block(rows: readonly string[], feet: number): string[] {
  const out = Array.from({ length: 21 }, () => '.'.repeat(24));
  rows.forEach((r, i) => { out[feet - rows.length + i] = r.padEnd(24, '.'); });
  return out;
}
const hires = (name: string, rows: readonly string[], feet = FULL_FEET) => spriteBlock(name, block(rows, feet));
const multi = (name: string, rows: readonly string[]) => mcBlock(name, Array.from({ length: 21 }, (_, i) => (rows[i - (LYING_FEET - rows.length)] ?? '').padEnd(12, '.')));

// ---- Monty from the front: his head (the tuft, the ears' round, the eyes, the nose between them), his chest and arms, his legs

const HEAD = [
  '.....#.#.....',
  '....#####....',
  '..#########..',
  '.###########.',
  '.###.###.###.',
  '.###.###.###.',
  '.###.....###.',
  '.###.###.###.',
  '..##.....##..',
];
const FRONT = [
  ...HEAD,
  '...#######...',
  '..#########..',
  '.##.#####.##.',
  '.##.#####.##.',
  '.##.#####.##.',
  '..#.#####.#..',
  '...##...##...',
  '..###...###..',
];
/** The double-biceps pose: fists up beside his head, elbows out. */
const POSE = [
  ...HEAD.slice(0, 4).map((r) => `....${r}....`),
  ...HEAD.slice(4).map((r) => `.##.${r}.##.`),
  '.######.#####.######.',
  '..####..#####..####..',
  '......#########......',
  '......#########......',
  '......#########......',
  '.......#######.......',
  '.......##...##.......',
  '......###...###......',
];
/** From behind, walking away: the back of his head and his back (as his rope pictures), a stride each way. */
const BACK_TOP = [
  '.....#.#.....',
  '....#####....',
  '..#########..',
  '.###########.',
  '.###########.',
  '.###########.',
  '.###########.',
  '..#########..',
  '...#######...',
  '..#########..',
];
const BACK = [
  [...BACK_TOP, '.##.#####.##.', '.##.#####.##.', '..#.#####.##.', '...#######.#.', '...##...##...', '..###....#...'],
  [...BACK_TOP, '.##.#####.##.', '.##.#####.##.', '.##.#####.#..', '.#.#######...', '...##...##...', '...#....###..'],
] as const;
/** Lying back on the towel (side on, his head at the left, his snout up, a hand behind his head, his feet crossed at the right). */
const LYING = [
  '...##...................',
  '..####.....#####........',
  '.######.##########......',
  '.###.##############.##..',
  '..####.############.###.',
  '...##...##########..##..',
];

// ---- what he snaps on

/** The speedo on each picture (over him, red): front, the pose, from behind (the cheeky shot: the cleft a gap in it), lying. */
const SPEEDO_FRONT = ['....#####....', '.....###.....'];
const SPEEDO_POSE = ['.......#######.......', '........#####........'];
const SPEEDO_BACK = ['....#####....', '....##.##....', '.....#.#.....'];
const SPEEDO_LYING = ['..............###.......', '.............####.......'];
/** The sunglasses (over him, black): front, the pose, lying. */
const SHADES_FRONT = ['..#########..', '..###...###..'];
const SHADES_LYING = ['...###..................', '..####..................'];

// ---- the crowd (multicolour: two pixels a letter)

const BIKINI = [
  '.cc.........',
  'cccaa.......',
  'caaaa.......',
  '.aaa..cc....',
  '..aaaacccaaa',
  '..aaaaccaaaa',
  'bbbbbbbbbbbb',
  '.bbbbbbbbbb.',
];
/**
 * A sunbather in trunks lying on his towel under a beach umbrella (the canopy the sprite's own colour in broad stripes of the second shared colour, its pole the
 * second, his towel the sprite's own colour): his head at the left with his hair, his arm behind it, the trunks, his knees up.
 */
const UMBRELLA = [
  '....bccb....',
  '..bbbccbbb..',
  '.bbcbccbcbb.',
  'bbcbbccbbcbb',
  'bcbbbccbbbcb',
  'b.b..c...b.b',
  '.....c......',
  '.....c......',
  '.....c......',
  '.....c...a..',
  '.cc..c..a.a.',
  'caa..c.a...a',
  'aaaaaaaccaa.',
  '.aaaaaacc...',
  'bbbbbbbbbbbb',
  '.bbbbbbbbbb.',
];
const TOWEL = ['bbbbbbbbbbbb', '.bbbbbbbbbb.'];
/**
 * Two players either side of the net (the net the sprite's own colour, side on: its tape on its post), seen side on: the left one up on his toes with his hands
 * up to the ball, the right one crouched ready with his arms out; skin the first shared colour, hair and trunks the second.
 */
const VOLLEY = [
  '...a........',
  '...a........',
  '..a..bb.....',
  '.cc...b.....',
  '.aa...b..cc.',
  '.aaa..b..aa.',
  '.aa...baaaa.',
  '.aa...b..aaa',
  '.cc...b..aa.',
  '.cc...b..cc.',
  '.a.a..b..cc.',
  '.a.a..b.a..a',
  '.a..a.b.a..a',
  '.a..a.ba...a',
];
const BALL = ['.##.', '####', '####', '.##.'];
/** A glint off the glasses as he poses (white). */
const GLINT = ['..#..', '.###.', '#####', '.###.', '..#..'];

/** The pictures by name (full-monty.ts puts them in blocks as the sequence begins). */
export const FULL_MONTY_PICTURES = {
  front: hires('monty front', FRONT),
  pose: hires('monty pose', POSE),
  backA: hires('monty back a', BACK[0]),
  backB: hires('monty back b', BACK[1]),
  lying: hires('monty lying', LYING, LYING_FEET),
  speedoFront: hires('speedo front', [...SPEEDO_FRONT, '', ''], FULL_FEET),
  speedoPose: hires('speedo pose', [...SPEEDO_POSE, '', ''], FULL_FEET),
  speedoBack: hires('speedo back', [...SPEEDO_BACK, '', ''], FULL_FEET),
  speedoLying: hires('speedo lying', [...SPEEDO_LYING, '', ''], LYING_FEET),
  shadesFront: hires('shades front', [...SHADES_FRONT, ...Array.from({ length: 11 }, () => '')], FULL_FEET),
  shadesLying: hires('shades lying', [...SHADES_LYING, '', ''], LYING_FEET),
  bikini: multi('bikini', BIKINI),
  umbrella: multi('umbrella', UMBRELLA),
  towel: multi('towel', TOWEL),
  volley: multi('volleyball', VOLLEY),
  ball: hires('ball', BALL, 4),
  glint: hires('glint', GLINT, 5),
} as const;
export type FullMontyPicture = keyof typeof FULL_MONTY_PICTURES;

/** The pose's shades: the front's, moved over by the pose's four columns of arm. */
export const POSE_SHADES_DX = 4;
/** The crowd's colours: the shared ones (skin, and the bikini's, trunks' and hair's) and each sprite's own (its towel, the net). */
export const CROWD_MC = { skin: 10, cloth: 7 } as const;
export const CROWD_COLOURS = { bikiniTowel: 3, umbrella: 14, montyTowel: 1, net: 1, ball: 1, speedo: 2, shades: 0, glint: 1 } as const;
