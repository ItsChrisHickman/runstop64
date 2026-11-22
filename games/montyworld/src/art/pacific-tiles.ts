/**
 * The Pacific's tiles for Monty Mole: World Tour (region 5): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's
 * style as Moscow's and Siberia's are: one bright ink on black in solid shapes cut with black lines (plates, planks, stones, sand,
 * rock, ribs), never a checker or a dither. The cargo ship's, Hawaii's beaches, fishponds, road and jungle, the reef's, the volcano's,
 * the airport's and the cargo plane's. Every name starts `pac` so no region's piece can take another's.
 */
import { tile } from './tiles';

export const PACIFIC_TILES = {
  // ---- the cargo ship
  /** The hull's steel plates, a seam along the foot and rivets down the plates. Solid. */
  pacHullPlate: tile('pacHullPlate', 1, 2, [
    '########',
    '#.######',
    '########',
    '########',
    '######.#',
    '########',
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
  /** A container's door end: the frame and the two locking bars with their handles. Solid. */
  pacContainerDoor: tile('pacContainerDoor', 1, 8, [
    '########',
    '#.#..#.#',
    '#.#..#.#',
    '########',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
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
  /** A fat steam pipe along the engine room: the tube with a highlight cut along it. Solid. */
  pacPipe: tile('pacPipe', 1, 3, [
    '........',
    '.######.',
    '########',
    '#.######',
    '########',
    '########',
    '.######.',
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
  /** A crane's chain: links, one over the next. A rope. */
  pacChain: tile('pacChain', 3, 15, [
    '...##...',
    '..#..#..',
    '..#..#..',
    '...##...',
    '...##...',
    '..#..#..',
    '..#..#..',
    '...##...',
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
  /** Sand to fill under the crest. Solid. */
  pacSandFill: tile('pacSandFill', 1, 7, [
    '#####.##',
    '........',
    '.##.####',
    '........',
    '####.###',
    '........',
    '##.#####',
    '........',
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
  /** A dry-stacked fishpond wall: rounded lava stones, the courses offset, black gaps between them. Solid. */
  pacWallStone: tile('pacWallStone', 1, 12, [
    '.##..##.',
    '########',
    '########',
    '.##..##.',
    '#..##..#',
    '########',
    '########',
    '#..##..#',
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
  /** Thatch for a hut's roof: straw laid in slanting rows. A floor. */
  pacThatch: tile('pacThatch', 2, 9, [
    '########',
    '#.##.##.',
    '########',
    '.##.##.#',
    '########',
    '........',
    '........',
    '........',
  ]),
  /** Jungle earth with grass along its top and roots below. Solid. */
  pacTurf: tile('pacTurf', 1, 5, [
    '#.#.#.##',
    '########',
    '#.######',
    '########',
    '........',
    '###.####',
    '###.####',
    '........',
  ]),
  /** Red earth under the turf. Solid. */
  pacSoil: tile('pacSoil', 1, 2, [
    '###.####',
    '###.####',
    '........',
    '.#####.#',
    '.#####.#',
    '........',
    '####.###',
    '####.###',
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
  /** The one-lane bridge's deck: a kerb and the road over concrete. A floor. */
  pacBridgeDeck: tile('pacBridgeDeck', 2, 12, [
    '########',
    '########',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** Asphalt: the road's top with its centre dashes, packed rows under. Solid. */
  pacRoad: tile('pacRoad', 1, 11, [
    '########',
    '########',
    '........',
    '##..##..',
    '........',
    '########',
    '########',
    '........',
  ]),

  // ---- under the sea
  /** Open water: a wave's line here and there. Nothing (it is the room's sea). */
  pacSea: tile('pacSea', 0, 6, [
    '........',
    '........',
    '.##.....',
    '...##...',
    '........',
    '........',
    '.....##.',
    '..##....',
  ]),
  /** The sea's surface: a row of wave crests. Nothing. */
  pacSeaSurface: tile('pacSeaSurface', 0, 14, [
    '..##..##',
    '.#..##..',
    '#.......',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
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
  /** Snow on Mauna Kea's top: a drift along the crest and packed rows. Solid. */
  pacSnow: tile('pacSnow', 1, 1, [
    '..##..#.',
    '########',
    '########',
    '........',
    '.####.##',
    '........',
    '###.####',
    '........',
  ]),
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
  pacMagma: tile('pacMagma', 4, 8, [
    '########',
    '#.##.###',
    '########',
    '###.##.#',
    '########',
    '########',
    '#.####.#',
    '########',
  ]),
  /** Lava's surface: the crest with bubbles breaking. Deadly. */
  pacMagmaCrest: tile('pacMagmaCrest', 4, 7, [
    '.#..#...',
    '#.##.##.',
    '########',
    '#.####.#',
    '########',
    '########',
    '##.##.##',
    '########',
  ]),

  // ---- the airport and the cargo plane
  /** The cargo plane's skin seen from inside: panels, their seam and a row of rivets. Solid. */
  pacFuselage: tile('pacFuselage', 1, 15, [
    '########',
    '#.#.#.#.',
    '########',
    '########',
    '###..###',
    '###..###',
    '########',
    '########',
  ]),
  /** The hold's floor: a roller track along its top, plate under. A floor. */
  pacHoldFloor: tile('pacHoldFloor', 2, 15, [
    '########',
    '#.##.##.',
    '########',
    '........',
    '.######.',
    '........',
    '........',
    '........',
  ]),
  /** A frame of the fuselage: a rib, in a vertical bar with its flange. Solid. */
  pacRib: tile('pacRib', 1, 12, [
    '..####..',
    '..####..',
    '..####..',
    '.######.',
    '.######.',
    '..####..',
    '..####..',
    '..####..',
  ]),
  /** A cargo net: ropes crossed in a square mesh. A rope (he climbs it). */
  pacNet: tile('pacNet', 3, 13, [
    '########',
    '#...#...',
    '#...#...',
    '#...#...',
    '########',
    '#...#...',
    '#...#...',
    '#...#...',
  ]),
  /** A chain across a ramp: two posts and heavy links, the gate the bolt cutters cut. Solid. */
  pacChainGate: tile('pacChainGate', 1, 15, [
    '##....##',
    '#.####.#',
    '##....##',
    '#.####.#',
    '##....##',
    '#.####.#',
    '##....##',
    '#.####.#',
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
  /** A torch at rest: a few embers glowing in a bowl of coals, low (safe to walk through). Passable. */
  pacEmber: tile('pacEmber', 0, 7, [
    '........',
    '........',
    '........',
    '........',
    '........',
    '..#..#..',
    '.##.###.',
    '########',
  ]),
  /** A red rental car's cabin: a roof over two windows with a pillar between. Passable (the car is a picture the road's strike draws). */
  pacCarCab: tile('pacCarCab', 0, 2, [
    '........',
    '..####..',
    '.######.',
    '##.##.##',
    '##.##.##',
    '########',
    '########',
    '########',
  ]),
  /** A rental car's body: a door line, a handle, a bumper, a wheel arch cut into the foot. Passable. */
  pacCarBody: tile('pacCarBody', 0, 2, [
    '########',
    '########',
    '##.##.##',
    '########',
    '########',
    '###..###',
    '##.##.##',
    '.##..##.',
  ]),
} as const;

export type PacificTile = keyof typeof PACIFIC_TILES;
