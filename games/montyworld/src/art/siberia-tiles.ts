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
  /** The tunnel portal's dressed stone (the arch's ring, in courses). Passable (the portal kills, it does not block). */
  tunnelFace: tile('tunnelFace', 0, 15, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** The tunnel's brick lining: clean courses of brick, running bond, black mortar. Nothing (a picture: the tunnel's mass kills, it does not block). */
  tunnelBrick: tile('tunnelBrick', 0, 2, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** A big pine's trunk with a branch stub each side: bark in strips and a knot. A rope's class (he climbs it). */
  pineTrunk: tile('pineTrunk', 3, 9, [
    '.#.##.#.',
    '.#.##.#.',
    '##.##.##',
    '.#.##.#.',
    '.#.#..#.',
    '.#.##.#.',
    '##.##.##',
    '.#.##.#.',
  ]),
  /** A locomotive's boiler: plates with a band of rivets and a black seam between. Solid. */
  boilerPlate: tile('boilerPlate', 1, 5, [
    '########',
    '#.#.#.##',
    '########',
    '........',
    '########',
    '#.#.#.##',
    '########',
    '........',
  ]),
  /** The frozen waterfall: streaks of ice running down in different widths, the gaps between them dark. Solid. */
  iceFall: tile('iceFall', 1, 3, [
    '.###.##.',
    '.###.##.',
    '.##..##.',
    '.##.###.',
    '##..###.',
    '##.####.',
    '.##.###.',
    '.##..##.',
  ]),
  /** A mine cart's bed: the plank under the ore, its wheel under it on the rail. A floor (the cart carries him). */
  cartDeck: tile('cartDeck', 2, 8, [
    '########',
    '########',
    '#.####.#',
    '.######.',
    '..####..',
    '.#.##.#.',
    '.#.##.#.',
    '########',
  ]),
} as const satisfies Record<string, NewTile>;

export type SiberiaTile = keyof typeof SIBERIA_TILES;
