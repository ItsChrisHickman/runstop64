/**
 * Siberia's tiles for Monty Mole: World Tour (region 2): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's
 * style as Moscow's are: one bright ink on black in solid shapes cut with black lines (planks, bark, logs, rock, coal), never a
 * checker or a dither. The train's, the pines', the mine's, the lake's ice and the village's.
 */
import { tile } from './tiles';
import type { NewTile } from './types';

export const SIBERIA_TILES = {
  /** A carriage's floor: boards with their joints. Solid. */
  carFloor: tile('carFloor', 1, 9, [
    '########',
    '........',
    '###.####',
    '###.####',
    '........',
    '####.###',
    '####.###',
    '........',
  ]),
  /** The wheels under a carriage: a row of spoked wheels on the rail. Solid. */
  bogie: tile('bogie', 1, 11, [
    '.######.',
    '########',
    '###..###',
    '##.##.##',
    '##.##.##',
    '###..###',
    '########',
    '########',
  ]),
  /** A heap of coal: rounded lumps with their gaps. Solid. */
  coal: tile('coal', 1, 12, [
    '..##..#.',
    '.####.##',
    '.####.##',
    '#.##.###',
    '####.###',
    '#####.##',
    '.####.#.',
    '..##..#.',
  ]),
  /** A pine's trunk: bark in vertical strips with the knots between. Solid. */
  pineBark: tile('pineBark', 1, 9, [
    '#.#.##.#',
    '#.#.##.#',
    '#.#..#.#',
    '#.##.#.#',
    '..##.#.#',
    '#.##.#..',
    '#.#..#.#',
    '#.#.##.#',
  ]),
  /** The mine's rock: blocks of granite, hewn, their joints staggered. Solid. */
  mineRock: tile('mineRock', 1, 12, [
    '####.###',
    '####.###',
    '####.###',
    '........',
    '##.#####',
    '##.#####',
    '##.#####',
    '........',
  ]),
  /** A pit prop's timber: a plank on its edge with a nail at each end. A floor. */
  timber: tile('timber', 2, 8, [
    '########',
    '#.####.#',
    '########',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A mine's rail: the iron on its sleepers. A floor. */
  mineRail: tile('mineRail', 2, 11, [
    '########',
    '.#....#.',
    '.#....#.',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A pine bough with snow on it, the needles hanging in a fringe. A floor. */
  snowBough: tile('snowBough', 2, 5, [
    '########',
    '########',
    '#.##.##.',
    '.#.#..#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The lake's ice: glassy, a gleam cut across it. Solid. */
  iceSheet: tile('iceSheet', 1, 14, [
    '########',
    '#.######',
    '##.#####',
    '########',
    '########',
    '######.#',
    '#######.',
    '########',
  ]),
  /** The ice cracking: a black crack zigzagging through it. Solid. */
  iceCrack: tile('iceCrack', 1, 14, [
    '########',
    '###.####',
    '##.#####',
    '###.####',
    '####.###',
    '###.####',
    '##.#####',
    '########',
  ]),
  /** The ice about to go: the crack wide open, a plate on either side tipping. Solid. */
  iceWide: tile('iceWide', 1, 14, [
    '###..###',
    '##..####',
    '#..#####',
    '##..####',
    '###..###',
    '##..####',
    '#..#####',
    '##..####',
  ]),
  /** The lake under the ice: black water, its waves in rows. Deadly. */
  lakeWater: tile('lakeWater', 4, 6, [
    '.##..##.',
    '#..##..#',
    '........',
    '.##..##.',
    '#..##..#',
    '........',
    '.##..##.',
    '#..##..#',
  ]),
  /** A cabin's logs: round-ended, laid in courses. Solid. */
  logWall: tile('logWall', 1, 9, [
    '.######.',
    '########',
    '#.####.#',
    '.######.',
    '.######.',
    '#.####.#',
    '########',
    '.######.',
  ]),
  /** The border's boom gate: red and white stripes at a slant. Solid. */
  barrier: tile('barrier', 1, 2, [
    '##..##..',
    '#..##..#',
    '..##..##',
    '.##..##.',
    '##..##..',
    '#..##..#',
    '..##..##',
    '.##..##.',
  ]),
  /** The tunnel mouth's granite: dressed granite in courses. Passable (the portal kills, it does not block). */
  tunnelFace: tile('tunnelFace', 0, 12, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
} as const satisfies Record<string, NewTile>;

export type SiberiaTile = keyof typeof SIBERIA_TILES;
