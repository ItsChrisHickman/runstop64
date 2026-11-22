/**
 * Japan's map as a picture: the eleven rooms as boxes on the exit grid (columns 12-16, rows 0-2, China's junk beside them), each with its name, the joins drawn between them
 * (a line with a letter: W walk, R rope both ways, and what a gate wants: DARUMA, FISH FOOD, HOOD), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-map.ts <out-file.png>
 */
import { JAPAN_SECTORS, JP } from '../src/japan';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: japan-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: JAPAN (COLUMNS 12-16)', firstCol: 12, cols: 5, rows: 3,
  cells: {
    [JP.mole]: [15, 0], [JP.hideout]: [16, 0],
    [JP.harbour]: [12, 1], [JP.street]: [13, 1], [JP.crossing]: [14, 1], [JP.garden]: [15, 1], [JP.hall]: [16, 1],
    [JP.parlour]: [13, 2], [JP.platform]: [14, 2], [JP.fuji]: [15, 2], [JP.port]: [16, 2],
  },
  firstSector: JP.harbour, sectors: JAPAN_SECTORS, stub: { row: 1, words: ['CHINA', 'JUNK FOOD'] }, deadEnds: [JP.hideout, JP.mole, JP.parlour],
  joins: [
    [-1, JP.harbour, 'W', true, 0], [JP.harbour, JP.street, 'LO', false, 9], [JP.harbour, JP.street, 'HI', true, -9], [JP.street, JP.crossing, 'LO', false, 9], [JP.street, JP.crossing, 'HI', true, -9],
    [JP.street, JP.parlour, 'R', false, 0], [JP.parlour, JP.platform, 'W', true, 0], [JP.crossing, JP.platform, 'R', true, 0], [JP.platform, JP.fuji, 'W DARUMA', true, 0],
    [JP.fuji, JP.garden, 'R', true, 0], [JP.garden, JP.mole, 'R FISH FOOD', true, 0], [JP.garden, JP.hall, 'W FISH FOOD', true, 0], [JP.hall, JP.hideout, 'R', false, 0], [JP.hall, JP.port, 'R HOOD', true, 0],
  ],
  legend: 'W WALK (LO LOW AND HI HIGH: TWO WALKS)  R ROPE BOTH WAYS  DARUMA FISH FOOD HOOD: WHAT THE WAY WANTS  (THE LAST MOLE: THE HOOD)',
});
