/**
 * Hawaii's map as a picture: the twenty-two rooms as boxes on the exit grid (columns 17-23, rows 0-4, Japan's port beside them), each with its name, the joins drawn between them (a line with a letter:
 * W walk, R rope, SWIM the open sea, DROP one way down, and what a gate wants: SNORKEL), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-map.ts <out-file.png>
 */
import { LATER_SECTORS } from '../src/later-sectors';
import { PAC, PACIFIC_SECTORS } from '../src/pacific';
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: HAWAII (COLUMNS 17-23)', firstCol: 17, cols: 7, rows: 5,
  cells: {
    [PAC.ship]: [17, 2], [PAC.waikiki]: [18, 2], [PAC.luau]: [18, 1], [PAC.diamond]: [19, 1], [PAC.lookout]: [19, 0], [PAC.clam]: [18, 3], [PAC.kelp]: [19, 3], [PAC.lahaina]: [19, 2], [PAC.road]: [20, 2],
    [PAC.cave]: [20, 3], [PAC.hana]: [21, 2], [PAC.fish]: [21, 3], [PAC.kona]: [22, 3], [PAC.kea]: [22, 2], [PAC.summit]: [22, 1], [PAC.falls]: [23, 2], [PAC.hilo]: [23, 3], [PAC.loa]: [22, 4], [PAC.coffee]: [23, 4],
    [PAC.beach]: [17, 1], [PAC.waiau]: [21, 1], [PAC.ridge]: [23, 1],
  },
  firstSector: PAC.ship, sectors: [...PACIFIC_SECTORS, ...Array.from({ length: 82 - 55 }, () => ({ col: 0, text: '' })), ...LATER_SECTORS], stub: { row: 2, words: ['JAPAN', 'SAYONARA'] }, deadEnds: [PAC.lookout, PAC.summit, PAC.beach, PAC.waiau, PAC.ridge],
  joins: [
    [-1, PAC.ship, 'W', true, 0], [PAC.ship, PAC.waikiki, 'W', true, 0], [PAC.waikiki, PAC.luau, 'R', true, 0], [PAC.luau, PAC.diamond, 'W', true, 0], [PAC.diamond, PAC.lookout, 'R', true, 0],
    [PAC.waikiki, PAC.clam, 'SWIM SNORKEL', true, 0], [PAC.clam, PAC.kelp, 'SWIM', true, 0], [PAC.kelp, PAC.lahaina, 'R', true, 0], [PAC.kelp, PAC.cave, 'SWIM', false, 0], [PAC.lahaina, PAC.road, 'W', true, 0],
    [PAC.road, PAC.cave, 'R', false, 0], [PAC.road, PAC.hana, 'W', true, 0], [PAC.hana, PAC.fish, 'R', true, 0], [PAC.fish, PAC.kona, 'W TURTLES', true, 0], [PAC.kona, PAC.hilo, 'W', true, 0],
    [PAC.kona, PAC.kea, 'R', true, 0], [PAC.kea, PAC.summit, 'R', true, 0], [PAC.kea, PAC.falls, 'W', true, 0], [PAC.falls, PAC.hilo, 'DROP', true, 0],
    [PAC.kona, PAC.loa, 'R', true, 0], [PAC.loa, PAC.coffee, 'W', true, 0], [PAC.coffee, PAC.hilo, 'R', true, 0],
    [PAC.luau, PAC.beach, 'W', false, 0], [PAC.summit, PAC.waiau, 'W', false, 0], [PAC.summit, PAC.ridge, 'W', false, 0],
  ],
  legend: 'W WALK  R ROPE  SWIM THE OPEN SEA  DROP ONE WAY  (WITH THE PARACHUTE AND THE COFFEE, HILO\'S BIPLANE FLIES HIM TO THE ANDES)',
});
