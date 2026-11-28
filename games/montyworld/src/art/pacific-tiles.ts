/**
 * The Pacific's tiles for Monty Mole: World Tour (region 5): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's
 * style as Moscow's and Siberia's are: one bright ink on black in solid shapes cut with black lines (plates, planks, stones, sand,
 * rock, ribs), never a checker or a dither. The cargo ship's, Hawaii's beaches, fishponds, road and jungle, the reef's and the volcano's.
 * Every name starts `pac` so no region's piece can take another's.
 */
import { tile } from './tiles';

export const PACIFIC_TILES = {
  // ---- the cargo ship
  /** The hull's steel plates, a seam along the foot and rivets down the plates. Solid. */
  pacHullPlate: tile('pacHullPlate', 1, 2, [
    '########',
    '#.####.#',
    '########',
    '........',
    '########',
    '#.####.#',
    '########',
    '........',
  ]),
  /** The deck's non-slip plate: a bright edge and rows of raised bars. A floor. */
  pacDeckPlate: tile('pacDeckPlate', 2, 12, [
    '########',
    '########',
    '.##.##.#',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A shipping container's corrugated side: a frame round vertical ribs. Solid. */
  pacContainer: tile('pacContainer', 1, 8, [
    '########',
    '#.#.#.##',
    '#.#.#.##',
    '#.#.#.##',
    '#.#.#.##',
    '#.#.#.##',
    '#.#.#.##',
    '########',
  ]),
  /** Steel grating of the engine room: a bright edge over a row of slots. A floor. */
  pacGrating: tile('pacGrating', 2, 11, [
    '########',
    '#.#.#.#.',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A ship's steel ladder: two rails and rungs. A rope (he climbs it). */
  pacSteelLadder: tile('pacSteelLadder', 3, 12, [
    '#......#',
    '#......#',
    '########',
    '#......#',
    '#......#',
    '########',
    '#......#',
    '#......#',
  ]),
  /** Water: waves with a dark trough (a flooded hold, the harbour, the surf). Deadly. */
  pacWaves: tile('pacWaves', 4, 6, [
    '.##..##.',
    '########',
    '#..##..#',
    '########',
    '##.##.##',
    '########',
    '########',
    '########',
  ]),
  /** Calm water, the surf gone flat: a ripple along the top over the sea's blue. Not a floor and harmless: he drops through it into the sea (Waikiki's surf with the snorkel). */
  pacSeaCalm: tile('pacSeaCalm', 0, 14, [
    '........',
    '.##...##',
    '#..###..',
    '........',
    '..#...#.',
    '........',
    '#...#...',
    '........',
  ]),
  /** A wooden crate: its frame and a brace across. Solid. */
  pacCrate: tile('pacCrate', 1, 9, [
    '########',
    '##....##',
    '#.#..#.#',
    '#..##..#',
    '#..##..#',
    '#.#..#.#',
    '##....##',
    '########',
  ]),

  // ---- Hawaii's shore
  /** Beach sand: a dune's crest along the top, then ripples in packed rows. Solid. */
  pacSand: tile('pacSand', 1, 7, [
    '.####...',
    '########',
    '........',
    '######.#',
    '........',
    '.#####.#',
    '........',
    '###.####',
  ]),
  /** Boardwalk and pier planks: the boards in rows, each its joints. A floor. */
  pacBoardwalk: tile('pacBoardwalk', 2, 9, [
    '########',
    '........',
    '.####.##',
    '.####.##',
    '........',
    '####.##.',
    '####.##.',
    '........',
  ]),
  /** Black basalt: cooled lava in blocks with wandering joints. Solid. */
  pacBasalt: tile('pacBasalt', 1, 11, [
    '###.####',
    '###.####',
    '##..###.',
    '#..#.##.',
    '#.####.#',
    '..####..',
    '####.###',
    '####.###',
  ]),
  /** Black sand at Hana's shore: grains in rows with a dune's lip. Solid. */
  pacBlackSand: tile('pacBlackSand', 1, 12, [
    '..###...',
    '########',
    '#.##.###',
    '........',
    '###.####',
    '.######.',
    '........',
    '##.###.#',
  ]),
  /** A stalk of bamboo: nodes with their rings. A rope (he climbs it). */
  pacBamboo: tile('pacBamboo', 3, 13, [
    '..####..',
    '...##...',
    '...##...',
    '...##...',
    '..####..',
    '...##...',
    '...##...',
    '...##...',
  ]),

  // ---- under the sea
  /** The reef's rock: lumpy and pitted. Solid. */
  pacReefRock: tile('pacReefRock', 1, 11, [
    '.######.',
    '########',
    '##.#####',
    '########',
    '#####.##',
    '########',
    '#.######',
    '.######.',
  ]),
  /** Coral: branching fingers rising from a base. Solid. */
  pacCoral: tile('pacCoral', 1, 10, [
    '#..#..#.',
    '#..#..#.',
    '#.##.##.',
    '.###.##.',
    '.######.',
    '########',
    '########',
    '########',
  ]),

  // ---- the volcano
  /** Cooled lava crust, cracked: slabs with a crack cut through them. Solid. */
  pacCrust: tile('pacCrust', 1, 12, [
    '###.####',
    '##..####',
    '#..##.##',
    '..####.#',
    '####..##',
    '###.#.##',
    '##.####.',
    '#.######',
  ]),
  /** Molten lava: waves with dark troughs, always moving up its basin. Deadly. */
  pacMagma: tile('pacMagma', 4, 2, [
    '########',
    '#.##.###',
    '########',
    '###.##.#',
    '########',
    '########',
    '#.####.#',
    '########',
  ]),

  // ---- the luau's flames and the Road to Hana's car
  /** A torch's flame at full height: a column of fire, wavy tongues with black cuts, two cells of it stacked over each other (one cell on the foot, one on the head). Passable (the strike's own danger is the engine's `pulses`). */
  pacFlame: tile('pacFlame', 0, 2, [
    '.#...#..',
    '.##.###.',
    '.######.',
    '###.####',
    '.######.',
    '.###.##.',
    '..###.#.',
    '.##.###.',
  ]),
  /** A torch's warning flame: a small flame low in the foot's cell, the head's cell empty. Passable. */
  pacFlameWarn: tile('pacFlameWarn', 0, 7, [
    '........',
    '........',
    '........',
    '..#..#..',
    '.###.##.',
    '.######.',
    '.######.',
    '########',
  ]),
} as const;

export type PacificTile = keyof typeof PACIFIC_TILES;
