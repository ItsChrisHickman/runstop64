/**
 * Rio's map as a picture: the seven rooms as boxes on the exit grid (columns 33-38, rows 6-7 drawn as 0-1, the Amazon's last bank beside them), each with its name, the joins drawn between them (a line with a letter: W walk,
 * L ladder, TRAM, CABLE the car, DROP one way, and what a gate wants: CRANK, SQUASH), the dead end marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-map.ts <out-file.png>
 */
import { RIO_ROOM as R, RIO_SECTORS } from '../src/rio';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: RIO (COLUMNS 33-38, ROWS 6-7)', firstCol: 33, cols: 6, rows: 2,
  cells: { [R.steak]: [35, 0], [R.arms]: [33, 1], [R.colour]: [34, 1], [R.lap]: [35, 1], [R.sugar]: [36, 1], [R.drum]: [37, 1], [R.bust]: [38, 1] },
  firstSector: 67, sectors: RIO_SECTORS, stub: { row: 1, words: ['THE AMAZON', 'THE LAST BANK'] }, deadEnds: [R.steak],
  joins: [
    [-1, R.arms, 'W', true, 0], [R.arms, R.colour, 'W', true, 0], [R.colour, R.lap, 'W', true, 0], [R.lap, R.sugar, 'W STREET', true, 0], [R.sugar, R.lap, 'W TRACK', true, 1],
    [R.lap, R.steak, 'L TRAM', true, 0], [R.sugar, R.drum, 'CABLE CRANK', true, 0], [R.drum, R.bust, 'W SQUASH', true, 0],
  ],
  legend: 'W WALK  L LADDER  TRAM OVER THE GAP  CABLE THE CAR  CRANK SQUASH: WHAT THE WAY WANTS  STEAK YOUR CLAIM: A DEAD END (THE CRANK)  RIO OR BUST: THE END',
});
