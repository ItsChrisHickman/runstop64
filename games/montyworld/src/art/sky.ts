/**
 * The flight's pieces (docs/dosvidaniya-flight.md): the yellow mail biplane Monty flies from Hilo, the birds of the first leg (a V of gulls, the frigatebird, the albatross), Viktor's red plane, the
 * sky's bands (far wisps, low cloud, the sea) that slide by as Auf Wiedersehen Monty's do, Kilauea's cone and plume, the storm front, its lightning, the gusts' streaks and the waterspout, the Andes'
 * peaks, and the HUD's tally (Viktor's face and the star). Monty on the Run's manner: one ink, solid shapes cut with black lines, no dither; what is behind him dark and plain. Names start `sky`.
 */
import { VIKTOR_FACE } from './viktor';
import { characters, creatureBank, itemBlock, mirrored, spriteBlock } from './pixels';
import { Raster } from './raster';
import { decor } from './decorations';
import { tile } from './tiles';
import type { NewCreature, NewDecor } from './types';

// ---- the biplane (sprite 2 over Monty: 24 x 21, Monty's picture under it from column 4, row 4) ----------------------------------------------

/**
 * The mail biplane, level, flying east: the top wing over his head on struts behind and ahead of him, the fuselage over his legs (its black lines the cockpit's rim, the mail hatch and the cowl), the
 * lower wing under it, the wheels, the tail fin at the left and the propeller's blur at the nose.
 */
const PLANE_LEVEL = [
  '...###################..',
  '..#####################.',
  '...#.................#..',
  '...#.................#..',
  '...#.................#..',
  '...#.................#..',
  '...#.................#..',
  '##.#.................#..',
  '###..................#..',
  '###..................#.#',
  '####.................#.#',
  '#####................#.#',
  '#######################.',
  '#.....#################.',
  '########.....######.##.#',
  '.###################.#.#',
  '...################.##.#',
  '.....############.......',
  '...##############.......',
  '..........#...#.........',
  '.........###.###........',
];

/** The plane with its nose `dy` rows up (climbing, -1) or down (diving, 1): what is ahead of the cockpit moves one way, the tail the other. */
function tilted(rows: readonly string[], dy: number): string[] {
  const at = (x: number, y: number) => rows[y]?.[x] ?? '.';
  return rows.map((row, y) => [...row].map((_, x) => (x >= 15 ? at(x, y + dy) : x <= 5 ? at(x, y - dy) : at(x, y))).join(''));
}

/** The wreck after Viktor clips it: the tail gone, a jagged break, the top wing hanging. */
const PLANE_WRECK = PLANE_LEVEL.map((row, y) => [...row].map((ch, x) => (x <= 6 + (y % 3) ? '.' : y < 2 && x > 18 ? '.' : ch)).join(''));

/**
 * Viktor's plane: the same mail-plane build as Monty's (top and lower wings, struts, fuselage, tail, propeller), flown east on his tail, in Soviet red, with him in the cockpit facing the way he flies: his
 * tall fur hat with the red star on it, his eye, the long snout and moustache (VIKTOR_FACE: the HUD's face, his own head) in white. The propeller turns through four pictures. Two sprites, one ink each:
 * the plane's (the creature's own sprite, 4) is the plane and the star's pixels, in red (`VIKTOR_PLANE_INK`); under it on sprite 6 (`VIKTOR_HEAD_PICTURE`, drawn below sprite 4 by the VIC's priority) his
 * head in white (`VIKTOR_HEAD_INK`), so the star shows red on the white hat and the fuselage hides him from the chest down.
 */
const VIKTOR_AT = { x: 5, y: 3 } as const;
const VIKTOR_HEAD = mirrored(VIKTOR_FACE.lit);
/** The star's pixels: the holes in his hat's crown (rows 1-3 of his head), filled red by the plane's sprite over his head. */
function viktorStar(r: Raster) {
  VIKTOR_HEAD.slice(1, 4).forEach((row, j) => {
    const first = row.indexOf('#'), last = row.lastIndexOf('#');
    for (let i = first; i <= last; i++) if (row[i] === '.') r.set(VIKTOR_AT.x + i, VIKTOR_AT.y + 1 + j);
  });
}
function viktorBiplane(prop: number): string[] {
  const r = new Raster(24, 21);
  r.stamp(PLANE_LEVEL.map((row, y) => (y >= 9 && y <= 16 ? `${row.slice(0, 23)}.` : row)), 0, 0); // (his propeller is his own: below)
  viktorStar(r);
  for (let y = 9; y <= 16; y++) if ((y + prop) % 4 !== 0) r.set(23, y); // the propeller's blur, a gap going round
  return r.rows();
}
/** His head in the cockpit, the star's holes filled (the plane's red covers them). */
const VIKTOR_HEAD_ROWS = (() => {
  const r = new Raster(24, 21);
  r.stamp(VIKTOR_HEAD, VIKTOR_AT.x, VIKTOR_AT.y);
  viktorStar(r);
  return r.rows();
})();
export const VIKTOR_PLANE_PICTURES: readonly Uint8Array[] = [0, 1, 2, 3].map((k) => spriteBlock(`sky viktor biplane ${k}`, viktorBiplane(k)));
export const VIKTOR_HEAD_PICTURE: Uint8Array = spriteBlock('sky viktor head', VIKTOR_HEAD_ROWS);
/** His head's white, in the red plane. */
export const VIKTOR_HEAD_INK = 1;

export const PLANE_PICTURES = {
  level: spriteBlock('sky plane level', PLANE_LEVEL),
  climb: spriteBlock('sky plane climb', tilted(PLANE_LEVEL, 1)),
  dive: spriteBlock('sky plane dive', tilted(PLANE_LEVEL, -1)),
  wreck: spriteBlock('sky plane wreck', PLANE_WRECK),
} as const;
/** The mail plane's yellow. */
export const PLANE_COLOUR = 7;

// ---- the birds (rollers: 16 x 16 in an item's block, four pictures as they fly) ----------------------------------------------------------

/** One gull: wings up, level, down. */
const GULL = {
  up: ['#...#', '.#.#.', '..#..'],
  level: ['.....', '##.##', '..#..'],
  down: ['..#..', '.#.#.', '#...#'],
} as const;

/** A V of three gulls flying west (the lead at the left), wings as `pose`, the two behind a beat apart. */
function gullV(lead: keyof typeof GULL, rest: keyof typeof GULL): string[] {
  const r = new Raster(16, 16);
  r.stamp(GULL[lead], 1, 7);
  r.stamp(GULL[rest], 9, 2);
  r.stamp(GULL[rest], 10, 12);
  return r.rows();
}
const GULL_V = [gullV('up', 'level'), gullV('level', 'down'), gullV('down', 'level'), gullV('level', 'up')];

/** The frigatebird: long angled wings, a hooked bill, the forked tail; the red pouch under its throat is what shows on the black (its ink is red). Gliding, flapping. */
const FRIGATE_GLIDE = [
  '................',
  '................',
  '..........#.....',
  '.........##.....',
  '........###.....',
  '.......###......',
  '.###..####......',
  '#####.#####.##..',
  '.##########.###.',
  '...#######.....#',
  '....####........',
  '.....###........',
  '......##........',
  '.......#........',
  '................',
  '................',
];
const FRIGATE_FLAP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.###............',
  '#####.......##..',
  '.##########.###.',
  '...########....#',
  '.....######.....',
  '......#####.....',
  '.......####.....',
  '........###.....',
  '.........##.....',
  '................',
];
const FRIGATE = [FRIGATE_GLIDE, FRIGATE_GLIDE, FRIGATE_FLAP, FRIGATE_FLAP];

/** The albatross: the longest wings of any bird, held stiff, a slow glide (its wingtips dip and rise). */
const albatross = (tip: number): string[] => {
  const r = new Raster(16, 16);
  r.rect(0, 7 + tip, 2, 7 + tip); r.rect(3, 7, 12, 7); r.rect(13, 7 - tip, 15, 7 - tip); // the wings, tip to tip
  r.rect(5, 6, 9, 8); r.rect(4, 7, 4, 8); r.rect(2, 6, 3, 6); // the body, the head and its bill (west)
  r.rect(10, 8, 11, 9);
  return r.rows();
};
const ALBATROSS = [albatross(0), albatross(1), albatross(0), albatross(-1)];

export const BIRD_PICTURES = {
  gull: GULL_V.map((rows, i) => itemBlock(`sky gulls ${i}`, rows)),
  frigate: FRIGATE.map((rows, i) => itemBlock(`sky frigatebird ${i}`, rows)),
  albatross: ALBATROSS.map((rows, i) => itemBlock(`sky albatross ${i}`, rows)),
} as const;
/** Their inks: the gulls white, the frigatebird's red pouch, the albatross pale grey (it is that grey-white). */
export const BIRD_COLOURS = { gull: 1, frigate: 2, albatross: 15 } as const;

// ---- Viktor's red plane (the pursuer: a creature, slot 0) ----------------------------------------------------------------------------

/**
 * (The creature in L3's slot 0, which the pursuer drives: its chase is drawn in VIKTOR_PLANE_PICTURES, a full biplane; these small pictures stay as the slot's own.)
 * His plane flying east: a fighter, solid, its panels and the cockpit's rim cut in black lines, the tail fin at the back, his tall fur hat in the cockpit, the wing under it, the propeller turning, in
 * the plane's red (`VIKTOR_PLANE_INK`): one ink, as every sprite.
 */
const viktorPlane = (prop: number): string[] => {
  const p = (row: number) => (prop === row % 4 ? '#' : '.');
  return [
    '................',
    '................',
    '................',
    '.#..............',
    '.##......###....',
    '.###.....###....',
    '.####...#####...',
    '.#############.' + p(0),
    '.#.###########.' + p(1),
    '..##.##########' + p(2),
    '...###########.' + p(3),
    '.....#########.' + p(0),
    '....###########.',
    '................',
    '................',
    '................',
  ];
};
/** His plane's ink: Soviet red (grey made him and the plane one colour; red shows on the black sky, the storm's grey and the peaks' brown). */
export const VIKTOR_PLANE_INK = 2;
const VIKTOR_PLANE_RIGHT = [0, 1, 2, 3].map(viktorPlane);
export const SKY_CREATURES = {
  /** Viktor's red plane (L3's pursuer). */
  viktorPlane: { frames: creatureBank('viktor plane', VIKTOR_PLANE_RIGHT.map(mirrored), VIKTOR_PLANE_RIGHT), copy: false, colour: VIKTOR_PLANE_INK } satisfies NewCreature,
} as const;

// ---- tiles (the room's characters 1-8: what the mechanisms draw, and the sea) -------------------------------------------------------------

export const SKY_TILES = {
  /** The sea's crest under the plane: a line of breaking waves. Nothing (out of his reach: the leg's box keeps him over it). */
  skyCrest: tile('skyCrest', 0, 14, ['........', '..##....', '.#..#...', '#....###', '........', '###.....', '...#####', '........']),
  /** The sea: long swells (they slide by). Nothing. */
  skySea: tile('skySea', 0, 6, ['########', '###..###', '########', '.#######', '########', '#####..#', '########', '########']),
  /** Kilauea's ash: a dark billow. Nothing (the plume's own sweep is the danger: tunnels.ts). */
  skyAsh: tile('skyAsh', 0, 11, ['.######.', '########', '###.####', '########', '#####.##', '########', '.####.##', '..####..']),
  /** The plume's edge: a lighter puff. */
  skyPuff: tile('skyPuff', 0, 12, ['..####..', '.######.', '########', '###..###', '########', '.######.', '..####..', '........']),
  /** The crater's glow at the plume's foot. */
  skyGlow: tile('skyGlow', 0, 2, ['#.#..#.#', '.##.###.', '########', '########', '###.####', '########', '#.######', '########']),
  /** The volcano's cone of black rock. */
  skyCone: tile('skyCone', 0, 9, ['########', '#.######', '####.###', '########', '##.#####', '######.#', '########', '###.####']),
  /** The storm front: heavy grey cloud. Nothing (he flies under it). */
  skyStorm: tile('skyStorm', 0, 11, ['.##..##.', '########', '########', '###.####', '########', '########', '.######.', '#.#..#.#']),
  /** The storm cloud lit by the coming bolt (the warning flickers it). */
  skyStormLit: tile('skyStormLit', 0, 1, ['.##..##.', '########', '########', '###.####', '########', '########', '.######.', '#.#..#.#']),
  /** A bolt of lightning, a jag down the cell. Nothing (the pulse's live phase is the death). */
  skyBolt: tile('skyBolt', 0, 7, ['...##...', '..##....', '.##.....', '..####..', '....##..', '...##...', '..##....', '...##...']),
  /** A gust's streaks: short lines blown up the sky. Nothing (a harmless pulse shows them). */
  skyStreak: tile('skyStreak', 0, 14, ['.#......', '.#...#..', '.....#..', '..#.....', '..#...#.', '......#.', '.#......', '.#......']),
  /** The waterspout's funnel: a twisting column of spray. */
  skySpout: tile('skySpout', 0, 3, ['.##.##..', '..####..', '.####...', '..###.#.', '.#.###..', '..####..', '...###..', '..##.##.']),
  /** The Andes' rock (scenery that rises along the bottom, harmless). */
  skyPeak: tile('skyPeak', 0, 9, ['########', '####.###', '########', '##.#####', '########', '#####.##', '########', '#.######']),
  /** Their snow. */
  skySnow: tile('skySnow', 0, 1, ['########', '########', '.######.', '########', '##.#####', '########', '########', '#####.##']),
} as const;

// ---- the bands: strips 12 characters wide, laid three times across the picture and slid by (charAnims scroll rings) ------------------------

/** The far wisps: thin streaks of high cloud. */
function farWisps(): Raster {
  const r = new Raster(96, 8);
  for (const [x, y, w] of [[2, 3, 18], [26, 5, 10], [44, 2, 22], [72, 4, 14], [88, 6, 6]] as const) { r.rect(x, y, x + w - 1, y); r.rect(x + 3, y + 1, x + w - 5, y + 1); }
  return r;
}
/** The low cloud over the sea: rounded heaps, a black line along their bellies. */
function lowCloud(): Raster {
  const r = new Raster(96, 16);
  r.rect(0, 11, 95, 15); // the bank's body, all along
  for (const [cx, w, h] of [[8, 16, 6], [28, 12, 4], [52, 22, 8], [78, 14, 5], [92, 10, 3]] as const) { r.ellipse(cx, 11, w / 2, h); r.ellipse(cx + w / 3, 12, w / 4, h - 1); }
  for (const [x, w] of [[3, 10], [40, 16], [70, 12]] as const) r.rect(x, 13, x + w - 1, 13, false); // black lines in the bank: its folds
  return r;
}

export const SKY_DECOR = {
  /** The far band's wisps (dark blue: the slowest band, far off). */
  skyWisps: decor('skyWisps', 12, 1, farWisps(), 6),
  /** The near band's low cloud (blue: it goes by faster). */
  skyLowCloud: decor('skyLowCloud', 12, 2, lowCloud(), 6),
  /** The mail biplane parked on Hilo's apron, waiting for him: the flying picture, its cockpit empty, its wheels on the cells' bottom row (3 x 3 characters, the plane's yellow). */
  skyBiplane: decor('skyBiplane', 3, 3, parked(), PLANE_COLOUR),
} satisfies Record<string, NewDecor>;

/** The level plane's picture in a 24 x 24 raster, three rows down so its wheels stand on the bottom row. */
function parked(): Raster {
  const r = new Raster(24, 24);
  r.stamp(PLANE_LEVEL, 0, 24 - PLANE_LEVEL.length);
  return r;
}

// ---- the HUD's tally: Viktor's face (four characters) and the star ------------------------------------------------------------------------

/** His face (the HUD's: VIKTOR_FACE's silhouette, ten rows) in a 16 x 16 square, three rows down. */
const FACE = ['................', '................', '................', ...VIKTOR_FACE.silhouette, '................', '................', '................'];
/** The four characters of his face, top left, top right, bottom left, bottom right. */
export const TALLY_FACE: Uint8Array = characters('tally face', FACE, 2, 2);
/** A five-pointed star (Spy vs Spy's score), one character. */
export const TALLY_STAR: Uint8Array = characters('tally star', ['...#....', '...#....', '#######.', '.#####..', '..###...', '.##.##..', '.#...#..', '........'], 1, 1);
