/**
 * The Pacific's map as a picture: the four rooms as boxes on the exit grid (columns 17-19, rows 2-3, Japan's port beside them), each with its name, the joins drawn between them (a line with a letter:
 * W walk, L ladder, SWIM the open sea, and what a gate wants: SNORKEL, PARACHUTE), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-map.ts <out-file.png>
 */
import { PAC, PACIFIC_SECTORS } from '../src/pacific';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: THE PACIFIC (COLUMNS 17-19)', firstCol: 17, cols: 3, rows: 4,
  cells: { [PAC.ship]: [17, 2], [PAC.waikiki]: [18, 2], [PAC.hana]: [18, 3], [PAC.hilo]: [19, 3] },
  firstSector: PAC.ship, sectors: PACIFIC_SECTORS, stub: { row: 2, words: ['JAPAN', 'SAYONARA'] }, deadEnds: [],
  joins: [
    [-1, PAC.ship, 'W', true, 0], [PAC.ship, PAC.waikiki, 'W', true, 0], [PAC.waikiki, PAC.hana, 'SWIM SNORKEL', true, 0], [PAC.hana, PAC.hilo, 'SWIM', true, 0],
  ],
  legend: 'W WALK  SWIM THE OPEN SEA  SNORKEL: WHAT THE WAY WANTS  (WITH THE PARACHUTE, HILO\'S BIPLANE FLIES HIM TO THE ANDES)',
});
