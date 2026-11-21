/**
 * Siberia's map as a picture: the nine rooms as boxes on the exit grid (columns 4-7, rows 0-2, Moscow's station beside them), each with
 * its name, the joins drawn between them (a line with a letter: W walk, R rope both ways, U under the roof by a gangway), the
 * dead end marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-map.ts <out-file.png>
 */
import { SIB, SIBERIA_SECTORS } from '../src/siberia';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: SIBERIA (COLUMNS 4-7)', firstCol: 4, cols: 4, rows: 3,
  cells: {
    [SIB.yeti]: [4, 0], [SIB.pines]: [5, 0], [SIB.mine]: [6, 0], [SIB.shaft]: [7, 0],
    [SIB.gravy]: [4, 1], [SIB.sleeper]: [5, 1], [SIB.coal]: [6, 1], [SIB.lake]: [7, 1], [SIB.border]: [7, 2],
  },
  firstSector: SIB.gravy, sectors: SIBERIA_SECTORS, stub: { row: 1, words: ['MOSCOW', 'SIBERIA YOU', 'LATER'] }, deadEnds: [SIB.yeti],
  joins: [
    [-1, SIB.gravy, 'W', true, 0], [SIB.gravy, SIB.sleeper, 'W', true, -9], [SIB.gravy, SIB.sleeper, 'U', false, 9],
    [SIB.sleeper, SIB.coal, 'W', true, -9], [SIB.sleeper, SIB.coal, 'U', true, 9], [SIB.sleeper, SIB.pines, 'R', true, 0],
    [SIB.coal, SIB.mine, 'R', false, 0],
    [SIB.pines, SIB.yeti, 'W', false, 0], [SIB.pines, SIB.mine, 'W', true, 0], [SIB.mine, SIB.shaft, 'W', true, 0], [SIB.shaft, SIB.lake, 'R', true, 0], [SIB.lake, SIB.border, 'R', true, 0],
  ],
  legend: 'W WALK ON THE ROOF  U UNDER THE ROOF (GANGWAY)  R ROPE',
});
