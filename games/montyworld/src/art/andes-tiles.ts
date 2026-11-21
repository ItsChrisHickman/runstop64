/**
 * The Andes' and the Amazon's tiles for Monty Mole: World Tour (region 6): 8 x 8 hires characters for a room's codes 1-8, in Monty on
 * the Run's style as Moscow's and Siberia's are: one bright ink on black in solid shapes cut with black lines (dressed stone, thatch,
 * planks, leaves, hull plates), never a checker or a dither. The Inca terraces', the mountain's, the village's, the cloud forest's, the
 * river's and the riverboat's.
 */
import { tile } from './tiles';

export const ANDES_TILES = {
  /** Inca masonry: tight courses of dressed blocks, their joints broken. Solid. */
  incaWall: tile('incaWall', 1, 12, [
    '###.####',
    '###.####',
    '###.####',
    '........',
    '##.#####',
    '##.#####',
    '##.#####',
    '........',
  ]),
  /** A terrace's grass lip along the top of a stone wall: tufts, then the stone's first courses. Solid. */
  terraceGrass: tile('terraceGrass', 1, 13, [
    '.#.#..#.',
    '########',
    '########',
    '###.####',
    '###.####',
    '........',
    '##.#####',
    '##.#####',
  ]),
  /** A terrace's stone floor to walk on: a flat slab with its edge. A floor. */
  terraceSlab: tile('terraceSlab', 2, 12, [
    '########',
    '########',
    '#.######',
    '.#######',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** Mountain rock: grey strata broken by long diagonal cracks. Solid. */
  mountainRock: tile('mountainRock', 1, 11, [
    '####..##',
    '###..###',
    '##..####',
    '########',
    '#.######',
    '##.#####',
    '###.####',
    '####.###',
  ]),
  /** Snow on a peak: a rounded drift with its breaks. Solid. */
  snowCap: tile('snowCap', 1, 1, [
    '..###...',
    '.#####..',
    '########',
    '########',
    '##.#####',
    '########',
    '#####.##',
    '########',
  ]),
  /** A ledge of rock to land on or stand on, its underside in teeth. A floor. */
  rockLedge: tile('rockLedge', 2, 12, [
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
    '........',
    '........',
  ]),
  /** The rope bridge's planks, the ropes hanging at its sides. A floor. */
  plankBridge: tile('plankBridge', 2, 9, [
    '########',
    '##.##.##',
    '########',
    '.#....#.',
    '.#....#.',
    '........',
    '........',
    '........',
  ]),
  /** A wooden ladder: two rails and the rungs. Climbable. */
  woodLadder: tile('woodLadder', 3, 9, [
    '#......#',
    '########',
    '#......#',
    '#......#',
    '########',
    '#......#',
    '#......#',
    '########',
  ]),
  /** A hanging vine: a thick stem with a leaf each side in turn. Climbable. */
  vine: tile('vine', 3, 5, [
    '...##...',
    '..###...',
    '.####...',
    '...##...',
    '...###..',
    '...####.',
    '...##...',
    '...##...',
  ]),
  /** The canopy's foliage: big leaves with their veins cut. Solid. */
  jungleLeaf: tile('jungleLeaf', 1, 5, [
    '..####..',
    '.######.',
    '########',
    '###..###',
    '..####..',
    '.######.',
    '########',
    '###..###',
  ]),
  /** The cloud forest's floor: moss over wet stone. Solid. */
  mossGround: tile('mossGround', 1, 13, [
    '.#.##.#.',
    '########',
    '########',
    '########',
    '##.##.##',
    '########',
    '########',
    '#.######',
  ]),
  /** The riverbank's mud: slick bands with a puddle's gleam cut in. Solid. */
  mud: tile('mud', 1, 9, [
    '########',
    '#.####.#',
    '########',
    '###..###',
    '########',
    '.######.',
    '########',
    '##.##.##',
  ]),
  /** The river: brown water with its ripples, deadly. */
  riverWater: tile('riverWater', 4, 6, [
    '........',
    '.##..##.',
    '#..##..#',
    '........',
    '..##..##',
    '##..##..',
    '........',
    '.##..##.',
  ]),
  /** The riverboat's hull plating: white strakes with the rivets cut in. Solid. */
  hullPlate: tile('hullPlate', 1, 1, [
    '########',
    '#.#.#.#.',
    '########',
    '........',
    '########',
    '.#.#.#.#',
    '########',
    '........',
  ]),
  /** A porthole in the hull: a ring on the plating. Solid. */
  porthole: tile('porthole', 1, 1, [
    '########',
    '##....##',
    '#.####.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.####.#',
    '##....##',
    '########',
  ]),
  /** The deck's boards, with the seams. A floor. */
  deckBoards: tile('deckBoards', 2, 9, [
    '########',
    '#.#####.',
    '########',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A ship's rail: posts and a top bar, he passes through. Nothing. */
  shipRail: tile('shipRail', 0, 1, [
    '########',
    '.#....#.',
    '.#....#.',
    '.#....#.',
    '.#....#.',
    '.#....#.',
    '........',
    '........',
  ]),
  /** Thatch on a market stall's roof: rows of straw with the overlapping ends. A floor. */
  thatch: tile('thatch', 2, 7, [
    '########',
    '#.##.###',
    '########',
    '##.##.##',
    '.#.##.#.',
    '........',
    '........',
    '........',
  ]),
  /** The village's adobe: sun-baked bricks. Solid. */
  adobe: tile('adobe', 1, 10, [
    '#####.##',
    '#####.##',
    '........',
    '##.#####',
    '##.#####',
    '........',
    '#####.##',
    '#####.##',
  ]),
  /** The Inca tunnel's walls: great fitted blocks in the dark. Solid. */
  tunnelStone: tile('tunnelStone', 1, 11, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '.#######',
    '.#######',
    '.#######',
    '........',
  ]),
  /** The tangle of undergrowth over the jetty's rope: thorny creepers. Solid until the machete. */
  tangle: tile('tangle', 1, 13, [
    '#.#.#.#.',
    '.#####.#',
    '###.###.',
    '#.#####.',
    '.###.###',
    '###.#.##',
    '.#.###.#',
    '#.#.#.#.',
  ]),
  /** Icicles hanging from an overhang of rock: deadly points. Deadly. */
  iceSpikes: tile('iceSpikes', 4, 1, [
    '########',
    '#.####.#',
    '.#.##.#.',
    '.#.##.#.',
    '..#..#..',
    '..#..#..',
    '..#..#..',
    '........',
  ]),
  /** Mist rising from a pit in the cave floor: deadly (it hides the fall). Deadly. */
  mistPit: tile('mistPit', 4, 14, [
    '..###...',
    '.#...#..',
    '#.....#.',
    '........',
    '...###..',
    '..#...#.',
    '.#.....#',
    '........',
  ]),
} as const;

export type AndesTile = keyof typeof ANDES_TILES;
