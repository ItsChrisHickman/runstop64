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

/** A WWII pillbox on the crater rim: a low hump of concrete with its dark firing slit. 3 x 2 characters. */
function pillbox(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(12, 15, 11.5, 11); r.rect(0, 15, 23, 15); // the hump
  r.rect(5, 8, 18, 10, false); // the slit
  r.rect(3, 13, 20, 13, false); // the seam of its footing
  return decor('pacPillbox', 3, 2, r, 12);
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

export const PACIFIC_SCENERY_TILES = {
  /** Diamond Head's tuff: beds of cemented ash, its layers dipping down the slope, cracked. Solid. */
  pacTuff: tile('pacTuff', 1, 8, [
    '##.#####',
    '#..###.#',
    '####..##',
    '.######.',
    '###.##..',
    '#.######',
    '####..##',
    '##.####.',
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
} as const;

export const PACIFIC_SCENERY_DECOR = {
  pacTuffFill: fill('pacTuffFill', FLUTES, 9),
  pacScrubFill: fill('pacScrubFill', SCRUB, 5),
  pacCliffFill: fill('pacCliffFill', FLUTES, 5),
  pacJungleFill: fill('pacJungleFill', JUNGLE, 5),
  pacLavaFill: fill('pacLavaFill', LAVA, 11),
  pacCinderFill: fill('pacCinderFill', CINDER, 2),
  pacCloudFill: fill('pacCloudFill', CLOUD, 15),
  pacSkyDay: fill('pacSkyDay', DAY, 14),
  pacCaveTuff: caveMouth('pacCaveTuff', 9, FLUTES),
  pacCaveCinder: caveMouth('pacCaveCinder', 2, CINDER),
  pacPillbox: pillbox(),
  pacSkyline: skyline(),
  pacCliffFall: cliffFall(),
} as const satisfies Record<string, NewDecor>;
