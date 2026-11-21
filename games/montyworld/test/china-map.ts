/**
 * China's map as a picture: the nine rooms as boxes on the exit grid (columns 8-11, rows 0-2, Siberia's border village beside them), each with its name, the
 * joins drawn between them (a line with a letter: W walk, R rope both ways, and what a gate wants: KEY, HAT, BAMBOO), the dead ends marked, and the critical path
 * in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-map.ts <out-file.png>
 */
import { CHI, CHINA_SECTORS } from '../src/china';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: china-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: CHINA (COLUMNS 8-11)', firstCol: 8, cols: 4, rows: 3,
  cells: {
    [CHI.top]: [8, 0], [CHI.roofs]: [10, 0], [CHI.willow]: [11, 0],
    [CHI.tower]: [8, 1], [CHI.market]: [9, 1], [CHI.gate]: [10, 1], [CHI.junk]: [11, 1],
    [CHI.wall]: [8, 2], [CHI.alley]: [9, 2],
  },
  firstSector: CHI.wall, sectors: CHINA_SECTORS, stub: { row: 2, words: ['SIBERIA', 'BORDER LINE', 'CASE'] }, deadEnds: [CHI.top, CHI.alley],
  joins: [
    [-1, CHI.wall, 'W', true, 0], [CHI.wall, CHI.alley, 'W', true, 0], [CHI.alley, CHI.market, 'R', false, 0], [CHI.wall, CHI.tower, 'R', true, 0],
    [CHI.tower, CHI.top, 'R KEY', true, 0], [CHI.tower, CHI.market, 'W', true, 0], [CHI.market, CHI.gate, 'W', true, 0],
    [CHI.gate, CHI.roofs, 'R HAT', true, 0], [CHI.roofs, CHI.willow, 'W', true, 0], [CHI.willow, CHI.junk, 'R', true, 0],
  ],
  legend: 'W WALK  R ROPE BOTH WAYS  KEY HAT: WHAT THE WAY WANTS  (J: THE BAMBOO OUT TO THE JUNK)',
});
