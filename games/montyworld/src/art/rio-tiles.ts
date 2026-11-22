/**
 * Rio's tiles for Monty Mole: World Tour (region 7): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's style as the
 * earlier regions' are: one bright ink on black in solid shapes cut with black lines, never a checker or a dither. Copacabana's wave
 * pavement and sand, the sea, Sugarloaf's granite and its cable, the favela's plaster and tiles, Lapa's limestone arches, the quay and
 * pier, the churrascaria's floor, bricks and cloth, and the carnival's street, floats and risers. (A ladder, a rope and the jungle's
 * foliage are the earlier regions': woodLadder, vine and jungleLeaf in andes-tiles.ts.)
 */
import { tile } from './tiles';

export const RIO_TILES = {
  /** The promenade's wave mosaic, Copacabana's: white stone with the black wave running through it. A floor. */
  wavePavement: tile('wavePavement', 2, 1, [
    '########',
    '##.##.##',
    '#..##..#',
    '.#....#.',
    '..#..#..',
    '#..##..#',
    '##.##.##',
    '########',
  ]),
  /** Sand: a dune's top edge, then the packed grains in bands. Solid. */
  sand: tile('sand', 1, 7, [
    '.##..##.',
    '########',
    '########',
    '#.######',
    '########',
    '########',
    '###.####',
    '########',
  ]),
  /** The sea: rows of white-capped swell, he passes through (the beach's, not deadly). Nothing. */
  seaSwell: tile('seaSwell', 0, 14, [
    '........',
    '.##..##.',
    '#..##..#',
    '........',
    '........',
    '##..##..',
    '..##..##',
    '........',
  ]),
  /** The bay's water under the cable car: swell with its foam, deadly. Deadly. */
  bayWater: tile('bayWater', 4, 6, [
    '........',
    '.##..##.',
    '#..##..#',
    '........',
    '..##..##',
    '##..##..',
    '........',
    '.##..##.',
  ]),
  /** Sugarloaf's granite: smooth grey rock with its long streaks and fissures. Solid. */
  granite: tile('granite', 1, 12, [
    '########',
    '##.#####',
    '###.####',
    '########',
    '#####.##',
    '####.###',
    '########',
    '###.####',
  ]),
  /** A ledge of granite on the hill's side. A floor. */
  graniteLedge: tile('graniteLedge', 2, 12, [
    '########',
    '########',
    '.######.',
    '..####..',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The cable, its lower half of a pair: a steel line climbing one pixel for every two across, from the cell's bottom left to a little over half way up (the pair climbs one row across two cells; `cableHigh` carries on). Nothing. */
  cableLow: tile('cableLow', 0, 15, [
    '........',
    '........',
    '........',
    '........',
    '......##',
    '....####',
    '..####..',
    '####....',
  ]),
  /** The cable, its upper half: carries on from `cableLow`'s end to the cell's top right, where the next pair's low half (a row up) takes it. Nothing. */
  cableHigh: tile('cableHigh', 0, 15, [
    '......##',
    '....####',
    '..####..',
    '####....',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A station's floor: steel grating with its slots. A floor. */
  stationFloor: tile('stationFloor', 2, 15, [
    '########',
    '#.#.#.#.',
    '########',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The street of the parade: bright paving with the streamers' lines painted along it. Solid. */
  paradeStreet: tile('paradeStreet', 1, 10, [
    '########',
    '#.######',
    '########',
    '###.####',
    '########',
    '######.#',
    '########',
    '#.######',
  ]),
  /** A float's deck: planks edged with a sequined fringe. A floor. */
  floatDeck: tile('floatDeck', 2, 7, [
    '########',
    '#.#.#.#.',
    '########',
    '.#.#.#.#',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The bateria's riser: stepped staging in blocks. Solid. */
  riser: tile('riser', 1, 14, [
    '########',
    '#......#',
    '#.####.#',
    '#.####.#',
    '#.####.#',
    '#.####.#',
    '#......#',
    '########',
  ]),
  /** A crowd paradeBarrier: steel posts and two rails, he passes through. Nothing. */
  paradeBarrier: tile('paradeBarrier', 0, 12, [
    '#.#.#.#.',
    '########',
    '#.#.#.#.',
    '#.#.#.#.',
    '########',
    '#.#.#.#.',
    '#.#.#.#.',
    '#.#.#.#.',
  ]),
  /** The churrascaria's floor: big tiles with their grout. A floor. */
  restTile: tile('restTile', 2, 2, [
    '########',
    '#......#',
    '#.####.#',
    '#.####.#',
    '#.####.#',
    '#......#',
    '########',
    '........',
  ]),
  /** The churrascaria's walls: red brick in courses. Solid. */
  restBrick: tile('restBrick', 1, 2, [
    '#####.##',
    '#####.##',
    '........',
    '##.#####',
    '##.#####',
    '........',
    '#####.##',
    '#####.##',
  ]),
  /** A table top, cloth to its edge, the hang below it. A floor. */
  tableTop: tile('tableTop', 2, 1, [
    '########',
    '########',
    '#.##.##.',
    '#.##.##.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** A palm's crown, its left frond: a long leaf drooping to the left from the knot at the right edge. Nothing. */
  palmLeft: tile('palmLeft', 0, 5, [
    '....####',
    '..###...',
    '.#..###.',
    '#.....##',
    '#.......',
    '........',
    '........',
    '........',
  ]),
  /** A palm's crown, the knot with the fronds going up and a pair of coconuts under it. Nothing. */
  palmKnot: tile('palmKnot', 0, 5, [
    '#..##..#',
    '.######.',
    '..####..',
    '..#.##..',
    '...##...',
    '..#..#..',
    '........',
    '........',
  ]),
  /** A palm's crown, its right frond (the left's mirror). Nothing. */
  palmRight: tile('palmRight', 0, 5, [
    '####....',
    '...###..',
    '.###..#.',
    '##.....#',
    '.......#',
    '........',
    '........',
    '........',
  ]),
  /** A palm's trunk: a slim column ringed with black lines. Nothing. */
  palmTrunk: tile('palmTrunk', 0, 9, [
    '...###..',
    '...###..',
    '...#.#..',
    '...###..',
    '...###..',
    '...#.#..',
    '...###..',
    '...###..',
  ]),
  /** A wine barrel: staves and two hoops. Solid. */
  barrel: tile('barrel', 1, 9, [
    '.######.',
    '########',
    '........',
    '########',
    '########',
    '........',
    '########',
    '.######.',
  ]),
  /** The favela's plaster: a flat wall with a crack, a houses' colour of its own. Solid. */
  plaster: tile('plaster', 1, 14, [
    '########',
    '########',
    '#####.##',
    '####.###',
    '########',
    '########',
    '##.#####',
    '########',
  ]),
  /** Terracotta roof tiles in rows. A floor. */
  favelaTile: tile('favelaTile', 2, 2, [
    '########',
    '#.#.#.#.',
    '########',
    '.#.#.#.#',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** Lapa's limestone: dressed white blocks. Solid. */
  limestone: tile('limestone', 1, 1, [
    '#######.',
    '#######.',
    '........',
    '.#######',
    '.#######',
    '........',
    '#######.',
    '#######.',
  ]),
  /** The aqueduct's top: the tram line, two rails on sleepers. A floor. */
  aqueductTop: tile('aqueductTop', 2, 1, [
    '########',
    '........',
    '########',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The Redeemer's pedestal: pale stone blocks. Solid. */
  pedestal: tile('pedestal', 1, 15, [
    '#######.',
    '#######.',
    '#######.',
    '........',
    '.#######',
    '.#######',
    '.#######',
    '........',
  ]),
  /** The quay: granite setts laid in rows. Solid. */
  quayStone: tile('quayStone', 1, 12, [
    '###.###.',
    '###.###.',
    '###.###.',
    '........',
    '.###.###',
    '.###.###',
    '.###.###',
    '........',
  ]),
  /** The pier's planks, boards along it. A floor. */
  pierPlanks: tile('pierPlanks', 2, 9, [
    '########',
    '#.####.#',
    '########',
    '........',
    '#......#',
    '#......#',
    '........',
    '........',
  ]),
} as const;

export type RioTile = keyof typeof RIO_TILES;
