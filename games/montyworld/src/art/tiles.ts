/**
 * Moscow's tiles for Monty Mole: World Tour: 8 x 8 hires characters for a room's codes 1-8, each with the collision class it
 * takes in Monty on the Run's rules (types.ts) and the colour it is meant to be shown in. All new, made in Monty on the Run's
 * style: one bright ink on black in crisp repeating patterns of solid 1-pixel lines (a brick's mortar, a row of cobbles, ribs), never a checker
 * or a dither, as its white bricks, green grass rows and cyan columns are.
 *
 * Written as pictures ('#' lit, '.' dark; pixels.ts). Their library indexes follow the original's 121 (`MOTR_TILE_COUNT`), in
 * the order of `MOSCOW_TILE_LIST`.
 */
import { bandTiles } from './escalator';
import { characters } from './pixels';
import type { Colour, NewTile, TileClass } from './types';

/** How many tiles the original's library has: the first new tile is this index. */
export const MOTR_TILE_COUNT = 121;

export function tile(name: string, cls: TileClass, colour: Colour, rows: readonly string[]): NewTile {
  return { chr: characters(`tile ${name}`, rows, 1, 1), cls, colour };
}

const DOWN = bandTiles('down'), UP = bandTiles('up');

export const MOSCOW_TILES = {
  /** Snow-covered ground: a drift along the top, then rows of packed snow with their breaks. Solid. */
  snowGround: tile('snowGround', 1, 1, [
    '..##..#.',
    '########',
    '########',
    '........',
    '.####.##',
    '........',
    '###.####',
    '........',
  ]),
  /** Packed snow to fill under the drifts: rows with their breaks. Solid. */
  snowFill: tile('snowFill', 1, 1, [
    '#####.##',
    '........',
    '.##.####',
    '........',
    '####.###',
    '........',
    '##.#####',
    '........',
  ]),
  /** Red Square's cobbles: rows of stones, each course half a stone along from the one above. Solid. */
  cobbles: tile('cobbles', 1, 12, [
    '###.###.',
    '###.###.',
    '###.###.',
    '........',
    '#.###.##',
    '#.###.##',
    '#.###.##',
    '........',
  ]),
  /** The Kremlin wall's red brick: courses with the joints staggered. Solid. */
  kremlinBrick: tile('kremlinBrick', 1, 2, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** The wall's top with its swallowtail battlements (a notch in each, a gap between). Solid. */
  battlement: tile('battlement', 1, 2, [
    '##...##.',
    '###.###.',
    '#######.',
    '#######.',
    '........',
    '###.####',
    '###.####',
    '........',
  ]),
  /** A ceiling of snow crust and slabs: wide courses broken by a joint, a line between. Solid. */
  snowCrust: tile('snowCrust', 1, 1, [
    '########',
    '########',
    '########',
    '........',
    '.#######',
    '.#######',
    '.#######',
    '........',
  ]),
  /** The metro's glossy wall tiles: squares with a gleam cut in each corner. Solid. */
  metroTile: tile('metroTile', 1, 15, [
    '###.###.',
    '#.#.#.#.',
    '###.###.',
    '........',
    '###.###.',
    '#.#.#.#.',
    '###.###.',
    '........',
  ]),
  /** The GUM arcade's chequered marble: slabs set corner to corner. Solid. */
  arcadeFloor: tile('arcadeFloor', 1, 15, [
    '####.###',
    '####.###',
    '####.###',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** A fluted pillar for the arcade and the metro's halls: broad ribs and the grooves between. Solid. */
  pillar: tile('pillar', 1, 15, [
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
  ]),
  /** A vault of the metro's roof: ribs running down, a band along the bottom. Solid. */
  vault: tile('vault', 1, 15, [
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '##.##.##',
    '........',
    '########',
    '########',
  ]),
  /** A ledge with snow heaped on it and icicles under it. A floor. */
  snowLedge: tile('snowLedge', 2, 3, [
    '.##..##.',
    '########',
    '########',
    '#.##.#.#',
    '..#...#.',
    '........',
    '........',
    '........',
  ]),
  /** The metro platform's edge: a yellow safety strip along it. A floor. */
  platformEdge: tile('platformEdge', 2, 7, [
    '########',
    '##.##.##',
    '########',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** An iron girder for the arcade's roof and the station's gantries: chords with a lattice between. A floor. */
  girder: tile('girder', 2, 12, [
    '########',
    '##.##.##',
    '#.#..#.#',
    '########',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** An iron ladder (rails and rungs). A rope. */
  ironLadder: tile('ironLadder', 3, 7, [
    '##....##',
    '########',
    '##....##',
    '##....##',
    '##....##',
    '########',
    '##....##',
    '##....##',
  ]),
  /** Icicles hanging from an eave. Deadly. */
  icicles: tile('icicles', 4, 3, [
    '########',
    '.##..##.',
    '.##..##.',
    '..#...#.',
    '..#...#.',
    '..#...#.',
    '........',
    '........',
  ]),
  /** The live rail beside a metro track, its sparks jumping. Deadly. */
  thirdRail: tile('thirdRail', 4, 2, [
    '..#..#..',
    '.#.##.#.',
    '#..#..#.',
    '########',
    '.#.##.#.',
    '########',
    '#..##..#',
    '........',
  ]),
  /** A ceiling's ragged lower edge: the crust, then snow dripping and running to points. Solid. */
  snowDrip: tile('snowDrip', 1, 1, [
    '########',
    '########',
    '#.####.#',
    '..#..##.',
    '..#...#.',
    '.......#',
    '........',
    '........',
  ]),
  /** Rough boulders, irregular and chunky, for the underground and a rubble wall. Solid. */
  rock: tile('rock', 1, 12, [
    '.####.##',
    '######.#',
    '#.####.#',
    '###..###',
    '.####.##',
    '##.####.',
    '###.####',
    '.##..##.',
  ]),
  /** Weathered boards on end, a gap between each: a kiosk, a fence, a cabin. Solid. */
  planks: tile('planks', 1, 9, [
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
    '###.###.',
  ]),
  /** A wooden crate, braced across both ways: luggage, barrels, a stack at the station. Solid. */
  crate: tile('crate', 1, 8, [
    '########',
    '##....##',
    '#.#..#.#',
    '#..##..#',
    '#..##..#',
    '#.#..#.#',
    '##....##',
    '########',
  ]),
  /** A railway carriage's side: the rail, a window, the rail. Solid. */
  trainSide: tile('trainSide', 1, 5, [
    '########',
    '########',
    '#.####.#',
    '#.####.#',
    '#.####.#',
    '########',
    '########',
    '........',
  ]),
  /** An iron grating: a lattice over the dark. A floor. */
  grating: tile('grating', 2, 11, [
    '########',
    '#.#.#.#.',
    '########',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The turnstile's bars, upright, close together. Solid until the token pays (the room says which cells). */
  turnstile: tile('turnstile', 1, 7, [
    '##..##..',
    '##..##..',
    '##..##..',
    '##..##..',
    '##..##..',
    '##..##..',
    '##..##..',
    '##..##..',
  ]),
  /** A gilded balcony of a dome, for a ledge on the cathedral's roofs: solid bands with black seams (no dither). A floor. */
  domeScale: tile('domeScale', 2, 5, [
    '########',
    '########',
    '########',
    '........',
    '###.####',
    '###.####',
    '###.####',
    '........',
  ]),
  /** A rope hanging with its knots. A rope. */
  rope: tile('rope', 3, 13, [
    '...##...',
    '...##...',
    '..####..',
    '...##...',
    '...##...',
    '..####..',
    '...##...',
    '...##...',
  ]),
  /** A shop's striped awning: the stripes, scalloped along its edge. A floor. */
  awning: tile('awning', 2, 2, [
    '########',
    '##.##.##',
    '#.#..#.#',
    '#......#',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The metro's down escalator (a band going down to the right: escalator.ts): its handrail, its treads (steps that run along it) and its body. Passable: he is carried over them. */
  escalatorDownRail: DOWN.rail,
  escalatorDownTread: DOWN.tread,
  escalatorDownBody: DOWN.body,
  /** The up escalator: the same band going up to the right. */
  escalatorUpRail: UP.rail,
  escalatorUpTread: UP.tread,
  escalatorUpBody: UP.body,
} as const satisfies Record<string, NewTile>;

export type MoscowTile = keyof typeof MOSCOW_TILES;

/** The new tiles in library order. */
export const MOSCOW_TILE_LIST: readonly NewTile[] = Object.values(MOSCOW_TILES);

/** A tile's index in the library (the original's, then these). */
export function moscowTileIndex(name: MoscowTile): number {
  return MOTR_TILE_COUNT + Object.keys(MOSCOW_TILES).indexOf(name);
}
