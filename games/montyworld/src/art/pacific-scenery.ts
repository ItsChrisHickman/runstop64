/**
 * Hawaii's scenery (Chris, 2026-11-25: "Diamond Head does not look at all like climbing the top of an inactive volcano. It's nature. It has ledges, it has caves"; "I really want you to think about
 * representing these islands properly"): the backdrops that make each room read as its real place at a glance, and the landmarks in them. The backdrops are one character each, laid over a room's empty
 * cells in shapes (`fillWhere`, layout.ts: a coin is drawn over them, a cleared cell goes back to them): Diamond Head's eroded tuff and its kiawe scrub, the green fluted sea cliffs of Molokai and Maui's
 * jungle, the lava fields of the Big Island, Mauna Kea's red cinder and the cloud sea under its summit. Backdrops are darker than anything solid and have no hard top edge, so none reads as a floor
 * (LESSONS.md, "How it looks"). Names start `pac`, as the rest of the Pacific's; they come after every other piece (world.ts), so nothing shipped moves.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import { tile } from './tiles';
import type { NewDecor } from './types';

/** One backdrop character from its rows, in one colour. */
function fill(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
}

/** The fluting of an old volcanic cone or a sea cliff: steep gullies worn down the slope, ridges between them (it tiles down and across). */
const FLUTES = [
  '#.###.##',
  '#.###.##',
  '##.##.##',
  '##.###.#',
  '##.###.#',
  '#.####.#',
  '#.###.##',
  '#.###.##',
] as const;

/** Kiawe scrub and dry grass on a slope: tufts, the gaps between bushes. */
const SCRUB = [
  '..#.....',
  '.###..#.',
  '#####.##',
  '.#.#####',
  '....#.#.',
  '#.......',
  '##..#.##',
  '###.####',
] as const;

/** Rainforest: leaves over leaves, the black between the fronds. */
const JUNGLE = [
  '.###.##.',
  '#####..#',
  '##.#####',
  '#...###.',
  '.#####.#',
  '###..###',
  '##.####.',
  '#.##.#..',
] as const;

/** Pahoehoe: the old lava's ropy folds and their cracks. */
const LAVA = [
  '##...###',
  '#.###.##',
  '.#####..',
  '#######.',
  '###..###',
  '##.##.##',
  '.######.',
  '########',
] as const;

/** Cinder: a cone's loose red scoria, stones and the gaps between. */
const CINDER = [
  '###.####',
  '##..##.#',
  '########',
  '#.####..',
  '########',
  '###.##.#',
  '.#..####',
  '########',
] as const;

/** The sea of cloud under a summit: soft billows, a line along each. */
const CLOUD = [
  '..####..',
  '.######.',
  '########',
  '###..###',
  '########',
  '##....##',
  '########',
  '########',
] as const;

/** A clear day's sky: fine light lines with the gaps of a high haze between them. */
const DAY = [
  '########',
  '........',
  '........',
  '###.####',
  '........',
  '........',
  '........',
  '........',
] as const;

/** Kaihalulu's lagoon: the turquoise water inside the lava wall, light rippling on it. */
const LAGOON = [
  '########',
  '###..###',
  '########',
  '########',
  '#..#####',
  '########',
  '#####..#',
  '########',
] as const;

/** The natural wall of black lava rock across Kaihalulu's mouth: jagged tops, the surf breaking white on them (drawn in the rock's ink: the spray is the gaps). */
const LAVA_WALL = [
  '.#...#..',
  '###.###.',
  '########',
  '#.######',
  '########',
  '###.####',
  '########',
  '########',
] as const;

// ---- the landmarks

/** `pattern` tiled over a whole raster: a backdrop's own character, for a piece laid over that backdrop in its colour (one ink a character, so a piece over a backdrop carries it behind itself). */
function tiled(w: number, h: number, pattern: readonly string[]): Raster {
  const r = new Raster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (pattern[y % 8]?.[x % 8] === '#') r.set(x, y);
  return r;
}

/** A cave in a cliff of tuff or cinder: the rock's own texture (`rock`, its backdrop's) round a dark, ragged round mouth (laid over a backdrop of the same rock). 4 x 3 characters, in the rock's colour. */
function caveMouth(name: string, colour: number, rock: readonly string[]): NewDecor {
  const r = new Raster(32, 24);
  r.stamp(tiled(32, 24, rock).rows(), 0, 0);
  r.ellipse(16, 17, 12, 13, false); r.rect(4, 17, 28, 23, false); // the mouth
  for (const [x, y] of [[6, 12], [25, 11], [9, 7], [22, 7], [16, 5]] as const) r.rect(x, y, x + 1, y + 1); // its ragged lip
  r.rect(2, 22, 6, 23); r.rect(26, 21, 30, 23); // rocks fallen at its foot
  return decor(name, 4, 3, r, colour);
}

/** Waikiki's hotels far off along the shore, seen from the summit: towers of window lines over the beach. 6 x 2 characters. */
function skyline(): NewDecor {
  const r = new Raster(48, 16);
  for (const [x, w, top] of [[1, 4, 6], [6, 3, 3], [10, 5, 1], [16, 3, 5], [20, 4, 2], [25, 6, 4], [32, 3, 0], [36, 5, 3], [42, 4, 6]] as const) {
    r.rect(x, top, x + w - 1, 13);
    for (let y = top + 1; y < 13; y += 2) r.rect(x, y, x + w - 1, y, false);
  }
  r.rect(0, 14, 47, 15); // the beach
  return decor('pacSkyline', 6, 2, r, 15);
}

/** A thin waterfall down a sea cliff, as on Molokai's north shore: a white thread falling to the sea. 1 x 3 characters. */
function cliffFall(): NewDecor {
  const r = new Raster(8, 24);
  for (let y = 0; y < 24; y++) r.rect(3 + (y % 6 < 3 ? 0 : 1), y, 4 + (y % 6 < 3 ? 0 : 1), y);
  for (const y of [5, 12, 19]) r.rect(3, y, 5, y, false);
  r.rect(1, 22, 6, 23);
  return decor('pacCliffFall', 1, 3, r, 1);
}


/** Diamond Head Lighthouse at the foot of the cone on the coast: the white tower, its red lantern room and the keeper's house beside it. 2 x 4 characters. */
function lighthouse(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(5, 0, 10, 1); r.rect(4, 2, 11, 7); r.rect(5, 4, 10, 5, false); // the lantern's cap, the lantern room and its glass
  r.rect(3, 8, 12, 8); // the gallery
  for (let y = 9; y < 30; y++) { const s = Math.floor((y - 9) / 7); r.rect(5 - s, y, 10 + s, y); } // the tower, wider down
  r.rect(7, 13, 8, 15, false); r.rect(7, 21, 8, 23, false); // its windows
  r.rect(0, 30, 15, 31); // the rock it stands on
  return decor('pacLighthouse', 2, 4, r, ['22', '11', '11', '11']);
}

/** A kiawe tree standing in the scrub (laid over the scrub's backdrop, its texture round it): a flat, spreading crown of feathery leaves, the crooked trunk dark against the bush. 3 x 2 characters, in the scrub's green. */
function kiawe(): NewDecor {
  const r = tiled(24, 16, SCRUB);
  r.rect(0, 0, 23, 7, false); // the sky between the crown's leaves
  for (const [x, y, w] of [[3, 1, 6], [9, 0, 8], [16, 2, 6], [1, 3, 22], [4, 5, 16]] as const) r.rect(x, y, x + w - 1, y + 1);
  for (const x of [2, 7, 12, 17, 21]) r.set(x, 4, false);
  r.rect(10, 7, 13, 15, false); r.rect(7, 7, 9, 9, false); r.rect(14, 7, 16, 9, false); // the trunk and its forks, dark
  r.rect(11, 8, 12, 15); r.rect(8, 7, 8, 8); r.rect(15, 7, 15, 8); // ... with their bark
  return decor('pacKiawe', 3, 2, r, 5);
}

/** One of the tunnel's lamps on the rock: a caged bulb on its bracket, its glow round it. */
function tunnelLamp(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(3, 0, 4, 1); r.rect(2, 2, 5, 5); r.rect(3, 3, 4, 4, false); r.rect(3, 6, 4, 6);
  r.set(0, 3); r.set(7, 3); r.set(1, 6); r.set(6, 6); r.set(1, 0); r.set(6, 0);
  return decor('pacTunnelLamp', 1, 1, r, 7);
}

/** An ironwood (casuarina) on Ka'uiki Head's cinder: a tall, thin trunk and drooping tiers of wispy needles, the tree that sheds its needles on the trail down to Kaihalulu. 2 x 3 characters. */
function ironwood(): NewDecor {
  const r = new Raster(16, 24);
  // the leaning trunk and its bare limbs, then wispy drooping clumps of needles hung off them, uneven, the sky through them
  for (let y = 9; y < 24; y++) r.rect(7 + (y < 16 ? 1 : 0), y, 8 + (y < 16 ? 1 : 0), y);
  r.line(8, 12, 3, 6); r.line(9, 10, 13, 4); r.line(8, 9, 7, 1);
  for (const [cx, cy, w] of [[3, 4, 5], [13, 2, 5], [7, 0, 4], [11, 8, 4], [2, 10, 4]] as const) {
    r.rect(cx - (w >> 1), cy, cx + (w >> 1), cy + 1);
    for (let x = cx - (w >> 1); x <= cx + (w >> 1); x += 2) r.rect(x, cy + 2, x, cy + 3 + ((x + cy) % 3)); // the needles hanging in strands
  }
  r.rect(5, 23, 10, 23); // its foot
  return decor('pacIronwood', 2, 3, r, ['55', '55', '99']);
}

/** A banyan on Hilo's bayfront (Banyan Drive's): a broad, low crown and the curtain of aerial roots dropping from its boughs into trunks of their own. 4 x 4 characters. */
function banyan(): NewDecor {
  const r = new Raster(32, 32);
  r.ellipse(16, 8, 15.5, 8); r.rect(0, 8, 31, 12);
  for (const [x, y] of [[5, 3], [12, 2], [20, 4], [26, 6], [9, 9], [17, 8], [24, 10]] as const) r.rect(x, y, x + 1, y, false); // light through the leaves
  r.rect(13, 13, 18, 31); r.rect(11, 29, 20, 31); // the trunk
  for (const x of [3, 6, 9, 22, 25, 28]) r.rect(x, 13, x, 31); // the aerial roots
  r.rect(2, 30, 29, 31);
  return decor('pacBanyan', 4, 4, r, ['5555', '5555', '9999', '9999']);
}

export const PACIFIC_SCENERY_TILES = {
  /** Diamond Head's tuff in the sun: the cone's own fluting (its gullies worn down the rock, as the slope's backdrop has them), brighter than the slope behind, cracked. Solid. */
  pacTuff: tile('pacTuff', 1, 8, [
    '#.###.##',
    '#.###.##',
    '##.##.##',
    '##.###.#',
    '#..###.#',
    '#.####.#',
    '#.##.###',
    '##.#.###',
  ]),
  /** The crater trail's path: its paved edge and the stones under it. A floor. */
  pacTrail: tile('pacTrail', 2, 15, [
    '########',
    '########',
    '#.##.##.',
    '........',
    '.#..#...',
    '........',
    '........',
    '........',
  ]),
  /** The trail's steep concrete stairs (the tunnel's flight, the switchback's, the Fire Control Station's spiral): treads one over another and the handrail beside them. A rope: he climbs it. */
  pacStairs: tile('pacStairs', 3, 15, [
    '#......#',
    '#####..#',
    '#.......',
    '#..#####',
    '#......#',
    '#####..#',
    '#.......',
    '#..#####',
  ]),
  /** The Fire Control Station's concrete with one of its observation slits, dark across it. Solid. */
  pacSlitWall: tile('pacSlitWall', 1, 12, [
    '##.#####',
    '########',
    '#......#',
    '#......#',
    '########',
    '###.####',
    '########',
    '#.######',
  ]),
} as const;

export const PACIFIC_SCENERY_DECOR = {
  pacTuffFill: fill('pacTuffFill', FLUTES, 9),
  pacScrubFill: fill('pacScrubFill', SCRUB, 5),
  pacCliffFill: fill('pacCliffFill', FLUTES, 5),
  pacJungleFill: fill('pacJungleFill', JUNGLE, 5),
  pacLavaFill: fill('pacLavaFill', LAVA, 11),
  pacCinderFill: fill('pacCinderFill', CINDER, 2),
  pacCloudFill: fill('pacCloudFill', CLOUD, 1),
  pacSkyDay: fill('pacSkyDay', DAY, 14),
  pacCaveTuff: caveMouth('pacCaveTuff', 9, FLUTES),
  pacCaveCinder: caveMouth('pacCaveCinder', 2, CINDER),
  pacSkyline: skyline(),
  pacCliffFall: cliffFall(),
  pacLighthouse: lighthouse(),
  pacIronwood: ironwood(),
  pacBanyan: banyan(),
  pacLagoonFill: fill('pacLagoonFill', LAGOON, 3),
  pacLavaWallFill: fill('pacLavaWallFill', LAVA_WALL, 11),
  pacKiawe: kiawe(),
  pacTunnelLamp: tunnelLamp(),
} as const satisfies Record<string, NewDecor>;
