/**
 * Rio's map as a picture: the eleven rooms as boxes on the exit grid (columns 33-39, rows 6-7 drawn as 0-1, the Amazon's last bank beside them), each with its name, the joins drawn between them (a line with a letter: W walk, R rope both ways,
 * CABLE the car, and what a gate wants: KEY, HEADDRESS), the dead end marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-map.ts <out-file.png>
 */
import { RIO_ROOM as R, RIO_SECTORS } from '../src/rio';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: RIO (COLUMNS 33-39, ROWS 6-7)', firstCol: 33, cols: 7, rows: 2,
  cells: {
    [R.steak]: [33, 0], [R.sugar]: [34, 0], [R.loaf]: [35, 0], [R.arms]: [36, 0], [R.monkey]: [37, 0],
    [R.quay]: [33, 1], [R.lap]: [34, 1], [R.colour]: [36, 1], [R.drum]: [37, 1], [R.float]: [38, 1], [R.bust]: [39, 1],
  },
  firstSector: R.quay, sectors: RIO_SECTORS, stub: { row: 1, words: ['THE AMAZON', 'THE LAST BANK'] }, deadEnds: [R.steak],
  joins: [
    [-1, R.quay, 'W', true, 0], [R.quay, R.lap, 'W', true, 0], [R.lap, R.sugar, 'R', true, 0], [R.sugar, R.steak, 'W HEADDRESS', true, 0], [R.sugar, R.loaf, 'CABLE KEY', true, 0],
    [R.loaf, R.arms, 'W', true, 0], [R.arms, R.colour, 'R', true, 0], [R.arms, R.monkey, 'W', false, 0], [R.monkey, R.drum, 'R', false, 0], [R.colour, R.drum, 'W', true, 0],
    [R.drum, R.float, 'W HEADDRESS', true, 0], [R.float, R.bust, 'W FLOATS', true, 0],
  ],
  legend: 'W WALK  R ROPE  CABLE THE CAR  KEY HEADDRESS: WHAT THE WAY WANTS  STEAK YOUR CLAIM: A DEAD END (THE HEADDRESS)  RIO OR BUST: THE END',
});
