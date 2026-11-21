/**
 * Siberia's tiles for Monty Mole: World Tour (region 2): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's
 * style as Moscow's are: one bright ink on black in solid shapes cut with black lines (planks, bark, logs, rock, coal), never a
 * checker or a dither. The train's, the pines', the mine's, the lake's ice and the village's.
 */
import { characters } from './pixels';
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
  /** The wheel under a carriage: the rim, the hub and four spokes (a cross; `WHEEL_FRAMES` turns it to a saltire). Solid. */
  wheel: tile('wheel', 1, 2, [
    '..####..',
    '.#.##.#.',
    '#..##..#',
    '########',
    '########',
    '#..##..#',
    '.#.##.#.',
    '..####..',
  ]),
  /** The rail on its sleepers seen from the side: the iron's head along the top, a sleeper and a gap of ballast every 8 pixels (it is made to slide sideways). Solid. */
  rail: tile('rail', 1, 12, [
    '########',
    '########',
    '.####...',
    '.####...',
    '.####...',
    '.####...',
    '........',
    '#...#.#.',
  ]),
  /** A carriage's roof: the walkway along the top and the plate's thickness curving away under it, in scallops. A floor. */
  roofDeck: tile('roofDeck', 2, 12, [
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
    '........',
    '........',
  ]),
  /** The far wall of a carriage seen from inside: its cladding in ribs. Nothing (a picture behind him). */
  carWall: tile('carWall', 0, 5, [
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
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
  /** The mine's rock: rough granite boulders, their joints wandering, a crack or two cut through. Solid. */
  mineRock: tile('mineRock', 1, 12, [
    '###.####',
    '##..####',
    '##.##.##',
    '#..##.##',
    '...#..##',
    '####.###',
    '###..#.#',
    '###.##..',
  ]),
  /** Rock with a seam of coal through it: black lumps in a lit band. Solid. */
  coalSeam: tile('coalSeam', 1, 11, [
    '##.####.',
    '#..###..',
    '.##..##.',
    '####..##',
    '#.####.#',
    '..####..',
    '##.##.##',
    '###..###',
  ]),
  /** A ledge felt but not seen in the dark: its edge in dots, nothing there to stand on. */
  ledgeGhost: tile('ledgeGhost', 0, 11, [
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
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
  /** The lake under the ice: black water, a wave in a row of crests. Deadly. */
  lakeWater: tile('lakeWater', 4, 6, [
    '........',
    '.#..#...',
    '#.##.#..',
    '........',
    '........',
    '..#..#..',
    '.#.##.#.',
    '........',
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
  /** The border's boom gate: a pole in red and white bands across the cell (the block of cells is one gate, bar over bar). Solid. */
  barrier: tile('barrier', 1, 2, [
    '........',
    '........',
    '##..##..',
    '##..##..',
    '..##..##',
    '..##..##',
    '........',
    '........',
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

/** The wheel's other picture: the spokes turned to a saltire (a character, as a tile's bytes). */
export const WHEEL_FRAMES: readonly Uint8Array[] = [
  SIBERIA_TILES.wheel.chr,
  characters('wheel turned', [
    '..####..',
    '.##..##.',
    '#.#..#.#',
    '#..##..#',
    '#..##..#',
    '#.#..#.#',
    '.##..##.',
    '..####..',
  ], 1, 1),
];

export type SiberiaTile = keyof typeof SIBERIA_TILES;
