/**
 * China's tiles for Monty Mole: World Tour (region 3): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's style as Moscow's and
 * Siberia's are: one bright ink on black in solid shapes cut with black lines (big grey bricks, glazed roof tiles, lacquered red, porcelain), never a
 * checker or a dither. The Great Wall's and the hutong's, the market's, the Forbidden City's, the firecrackers' and the willow pattern's.
 */
import { tile } from './tiles';
import type { NewTile } from './types';

export const CHINA_TILES = {
  /** The Great Wall's big grey blocks, staggered. Solid. */
  greatBrick: tile('greatBrick', 1, 12, [
    '#####.##',
    '#####.##',
    '#####.##',
    '........',
    '##.#####',
    '##.#####',
    '##.#####',
    '........',
  ]),
  /** The wall's paved top: slabs with a joint, the top row whole. Solid. */
  wallPave: tile('wallPave', 1, 15, [
    '########',
    '........',
    '####.###',
    '####.###',
    '........',
    '###.####',
    '###.####',
    '........',
  ]),
  /** A battlement's tooth along the wall's top, drawn on the cell above the walk. Passable. */
  merlon: tile('merlon', 0, 15, [
    '.######.',
    '.######.',
    '.######.',
    '.######.',
    '.#.##.#.',
    '.######.',
    '........',
    '........',
  ]),
  /** Turf on the hill: blades along the top, soil under. Solid. */
  hillTurf: tile('hillTurf', 1, 5, [
    '#.#..#.#',
    '########',
    '########',
    '........',
    '.####.##',
    '........',
    '###.####',
    '........',
  ]),
  /** The hill's earth, with its pebbles. Solid. */
  hillEarth: tile('hillEarth', 1, 9, [
    '##.#####',
    '#...####',
    '####.###',
    '####...#',
    '.####.##',
    '##..####',
    '##..#.##',
    '###.####',
  ]),
  /** A stone step, a slab set in the wall's flank. A floor. */
  stoneStep: tile('stoneStep', 2, 15, [
    '########',
    '########',
    '#.##.##.',
    '.#....#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The hutong's small grey bricks in courses. Solid. */
  hutongBrick: tile('hutongBrick', 1, 11, [
    '##.##.##',
    '##.##.##',
    '........',
    '#.##.##.',
    '#.##.##.',
    '........',
    '##.##.##',
    '##.##.##',
  ]),
  /** A wooden shelf on brackets. A floor. */
  shelf: tile('shelf', 2, 9, [
    '########',
    '########',
    '..#..#..',
    '..#..#..',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A firecracker hung on its cord: a red tube, two bands, the fuse at its top. Passable until it goes off. */
  cracker: tile('cracker', 0, 2, [
    '...#....',
    '.######.',
    '.#.##.#.',
    '.######.',
    '.######.',
    '.#.##.#.',
    '.######.',
    '...##...',
  ]),
  /** The fuse alight: a spark and its sparkles. Passable (it is the warning). */
  crackerSpark: tile('crackerSpark', 0, 1, [
    '..#.#...',
    '...#..#.',
    '.#.#.#..',
    '..###...',
    '.#.#.##.',
    '...#....',
    '..#.#...',
    '........',
  ]),
  /** The bang: a star of flame. Deadly while it is shown (pulses.ts), passable. */
  crackerBang: tile('crackerBang', 0, 7, [
    '#..#..#.',
    '.#.#.#..',
    '..###...',
    '#######.',
    '..###...',
    '.#.#.#..',
    '#..#..#.',
    '...#....',
  ]),
  /** A red lacquered beam: the string of crackers hangs from it. Solid. */
  redBeam: tile('redBeam', 1, 2, [
    '########',
    '########',
    '#.#..#.#',
    '########',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A bolted trapdoor: boards, two iron bands, a ring. Solid until the key. */
  trapdoor: tile('trapdoor', 1, 9, [
    '########',
    '#.#..#.#',
    '########',
    '#..##..#',
    '#..##..#',
    '########',
    '#.#..#.#',
    '########',
  ]),
  /** A glazed roof tile: rows of the curved tiles with their ribs. A floor. */
  roofTile: tile('roofTile', 2, 7, [
    '########',
    '##.##.##',
    '#.#..#.#',
    '.#....#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A red eave under the roof's edge, a lip along it. A floor. */
  redEave: tile('redEave', 2, 2, [
    '########',
    '########',
    '#.#.#.#.',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The palace's red wall: panels with a rail across. Solid. */
  redWall: tile('redWall', 1, 2, [
    '###.###.',
    '###.###.',
    '###.###.',
    '........',
    '###.###.',
    '###.###.',
    '###.###.',
    '........',
  ]),
  /** The gate's doors: red lacquer with its rows of gold studs. Solid until the hat. */
  gateDoor: tile('gateDoor', 1, 2, [
    '########',
    '##.##.##',
    '########',
    '########',
    '##.##.##',
    '########',
    '########',
    '##.##.##',
  ]),
  /** The plate's border: a lattice of diamonds with a dot in each, the band that rings the plate. Solid. */
  blueBank: tile('blueBank', 1, 14, [
    '#......#',
    '.#....#.',
    '..#..#..',
    '...##...',
    '...##...',
    '..#..#..',
    '.#....#.',
    '#......#',
  ]),
  /** The plate's river: curling waves in rows. Deadly. */
  blueWave: tile('blueWave', 4, 6, [
    '.##..##.',
    '#..##..#',
    '........',
    '##..##..',
    '..##..##',
    '........',
    '.##..##.',
    '#..##..#',
  ]),
  /** A stepping stone, round and white. Solid. */
  stoneRound: tile('stoneRound', 1, 1, [
    '..####..',
    '.######.',
    '########',
    '###.####',
    '########',
    '####.###',
    '.######.',
    '..####..',
  ]),
  /** The arched bridge's deck and rail, high over the river. Passable (it is a picture; he cannot stand on it). */
  bridgeDeck: tile('bridgeDeck', 0, 14, [
    '#..#..#.',
    '########',
    '########',
    '#.####.#',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A figure's arm reaching down, both arms side by side in a column of two. Deadly while it reaches (pulses.ts), passable. */
  arm: tile('arm', 0, 1, [
    '.######.',
    '.#.####.',
    '.#.####.',
    '.######.',
    '.####.#.',
    '.####.#.',
    '.######.',
    '.######.',
  ]),
  /** The hand at its end, fingers spread. Deadly with the arm. */
  hand: tile('hand', 0, 1, [
    '.######.',
    '..####..',
    '.######.',
    '.######.',
    '#.#.#.#.',
    '#.#.#.#.',
    '#.#.#.#.',
    '..#..#..',
  ]),
  /** A quay's boards laid along it, with the nails. Solid. */
  dock: tile('dock', 1, 9, [
    '########',
    '#.######',
    '########',
    '........',
    '####.###',
    '####.###',
    '........',
    '########',
  ]),
  /** A junk's hull: planks and a batten. Solid. */
  junkHull: tile('junkHull', 1, 2, [
    '########',
    '#.######',
    '########',
    '########',
    '###.####',
    '########',
    '........',
    '########',
  ]),
  /** A bamboo raft: canes lashed together, the knots showing. A floor. */
  raft: tile('raft', 2, 13, [
    '########',
    '##.##.##',
    '########',
    '##.##.##',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The garden's bank: the plate's hatched earth, curved strokes in rows. Solid. */
  plateBank: tile('plateBank', 1, 14, [
    '#..##..#',
    '.##..##.',
    '........',
    '##..##..',
    '..##..##',
    '........',
    '#..##..#',
    '.##..##.',
  ]),
  /** The wall's stone with an arrow slit cut in it: two courses of block, a dark slit down them. Solid. */
  brickSlit: tile('brickSlit', 1, 12, [
    '#####.##',
    '##..#.##',
    '##..#.##',
    '........',
    '##..####',
    '##..####',
    '##..####',
    '........',
  ]),
  /** Grey roof tiles in rows, each a curve with its rib, for a gallery's roof and a hutong's. Solid. */
  roofSlate: tile('roofSlate', 1, 11, [
    '########',
    '#.##.##.',
    '.#..#..#',
    '........',
    '########',
    '.##.##.#',
    '#..#..#.',
    '........',
  ]),
  /** A tower's inner wall: dark grey brick in courses, behind him. Passable. */
  backBrick: tile('backBrick', 0, 11, [
    '##.##.##',
    '##.##.##',
    '........',
    '#.##.##.',
    '#.##.##.',
    '........',
    '##.##.##',
    '##.##.##',
  ]),
} as const satisfies Record<string, NewTile>;

export type ChinaTile = keyof typeof CHINA_TILES;
