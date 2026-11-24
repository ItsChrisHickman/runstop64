/**
 * Siberia's map as a picture: the six rooms as boxes on the exit grid (columns 4-7, rows 0-2, Moscow's station beside them), each with its name, the joins drawn
 * between them (a line with a letter: W walk on the roof, U under the roof by a gangway, R rope or ladder both ways), the dead end marked, and the critical path in
 * yellow. Not a check.
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
    [SIB.yeti]: [5, 0],
    [SIB.gravy]: [4, 1], [SIB.sleeper]: [5, 1], [SIB.coal]: [6, 1], [SIB.mine]: [7, 1], [SIB.border]: [7, 2],
  },
  firstSector: SIB.gravy, sectors: SIBERIA_SECTORS, stub: { row: 1, words: ['MOSCOW', 'SIBERIA YOU', 'LATER'] }, deadEnds: [SIB.yeti],
  joins: [
    [-1, SIB.gravy, 'W', true, 0], [SIB.gravy, SIB.sleeper, 'W', true, -9], [SIB.gravy, SIB.sleeper, 'U', true, 9],
    [SIB.sleeper, SIB.yeti, 'R', true, 0], [SIB.sleeper, SIB.coal, 'U', true, 9],
    [SIB.coal, SIB.mine, 'W', true, -9], [SIB.mine, SIB.border, 'R', true, 0],
  ],
  legend: 'W WALK ON THE ROOF  U UNDER THE ROOF (GANGWAY)  R ROPE OR LADDER',
});
