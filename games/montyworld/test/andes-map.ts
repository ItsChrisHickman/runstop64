/**
 * The Andes and the Amazon's map as a picture: the twelve rooms as boxes on the exit grid (columns 30-33, rows 2-7 drawn as 0-5, the plane's hold beside them), each with its name, the joins drawn between them (a line with
 * a letter: W walk, R rope both ways, DROP one way down, and what a gate wants: PARACHUTE, PANPIPES, MACHETE, CHULLO), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-map.ts <out-file.png>
 */
import { AND, ANDES_SECTORS } from '../src/andes';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: THE ANDES AND THE AMAZON (COLUMNS 30-33, ROWS 2-7)', firstCol: 30, cols: 4, rows: 6,
  cells: {
    [AND.jump]: [30, 0], [AND.thin]: [30, 1], [AND.condor]: [30, 2], [AND.llama]: [30, 3], [AND.rock]: [31, 3], [AND.market]: [32, 3], [AND.mist]: [33, 3],
    [AND.cloud]: [30, 4], [AND.tunnel]: [31, 4], [AND.boat]: [30, 5], [AND.river]: [31, 5], [AND.bank]: [32, 5],
  },
  firstSector: AND.jump, sectors: ANDES_SECTORS, stub: { row: 0, words: ['THE PACIFIC', 'THE HOLD'] }, deadEnds: [AND.mist],
  joins: [
    [-1, AND.jump, 'W PARACHUTE', true, 0], [AND.jump, AND.thin, 'DROP', true, 0], [AND.thin, AND.condor, 'DROP', true, 0], [AND.condor, AND.llama, 'DROP', true, 0],
    [AND.llama, AND.rock, 'W HI', true, -9], [AND.llama, AND.rock, 'W LO', true, 9], [AND.rock, AND.market, 'W STEPS', true, 0], [AND.market, AND.mist, 'W', true, 0],
    [AND.rock, AND.tunnel, 'R PANPIPES', true, 0], [AND.tunnel, AND.cloud, 'W LO', true, 9], [AND.tunnel, AND.cloud, 'W HI', false, -9], [AND.cloud, AND.boat, 'R MACHETE', true, 0], [AND.boat, AND.river, 'W CHULLO', true, 0],
    [AND.river, AND.bank, 'W VINES', true, 0],
  ],
  legend: 'W WALK (HI, LO: TWO WALKS)  R ROPE  DROP ONE WAY DOWN  PARACHUTE PANPIPES MACHETE CHULLO: WHAT THE WAY WANTS  MIST OPPORTUNITY: A DEAD END',
});
