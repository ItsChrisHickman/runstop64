/**
 * The Pacific's map as a picture: the twenty rooms as boxes on the exit grid (columns 17-29, rows 1-2, Japan's port beside them), each with its name, the joins drawn between them
 * (a line with a letter: W walk, R rope both ways, SWIM the open sea, and what a gate wants: CUTTERS, SNORKEL, LEI), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-map.ts <out-file.png>
 */
import { PAC, PACIFIC_EXTRA_SECTORS, PACIFIC_SECTORS } from '../src/pacific';

/** The sectors by room id from the stern's (38) on: the first seventeen, a blank stretch (the Andes' and Rio's), and the second pass's three at 78-80. */
const SECTORS = Array.from({ length: 43 }, (_, i) => (i < 17 ? PACIFIC_SECTORS[i] : i >= 40 ? PACIFIC_EXTRA_SECTORS[i - 40] : undefined) ?? { col: 0, text: '' });
import { drawRegionMap } from './map-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: THE PACIFIC (COLUMNS 17-29)', firstCol: 17, cols: 13, rows: 3,
  cells: {
    [PAC.diamond]: [20, 0], [PAC.lookout]: [21, 0], [PAC.feast]: [20, 1], [PAC.lei]: [21, 1], [PAC.whale]: [23, 1], [PAC.road]: [24, 1], [PAC.hana]: [25, 1],
    [PAC.stern]: [17, 2], [PAC.box]: [18, 2], [PAC.pier]: [19, 2], [PAC.surf]: [20, 2], [PAC.clam]: [21, 2], [PAC.mole]: [22, 2], [PAC.kelp]: [23, 2], [PAC.cave]: [24, 2],
    [PAC.fish]: [25, 2], [PAC.coffee]: [26, 2], [PAC.mauna]: [27, 2], [PAC.hilo]: [28, 2], [PAC.hold]: [29, 2],
  },
  firstSector: PAC.stern, sectors: SECTORS, stub: { row: 2, words: ['JAPAN', 'SAYONARA'] }, deadEnds: [PAC.lookout, PAC.cave],
  joins: [
    [-1, PAC.stern, 'W', true, 0], [PAC.stern, PAC.box, 'DECK', false, 9], [PAC.stern, PAC.box, 'HOLD', true, -9], [PAC.box, PAC.pier, 'W CUTTERS', true, 0],
    [PAC.pier, PAC.surf, 'LO', true, 9], [PAC.pier, PAC.surf, 'HI', false, -9], [PAC.surf, PAC.feast, 'R', true, 0], [PAC.feast, PAC.lei, 'W', true, 0], [PAC.feast, PAC.diamond, 'R', false, 0], [PAC.diamond, PAC.lookout, 'W', false, 0], [PAC.lei, PAC.clam, 'R SNORKEL', true, 0],
    [PAC.clam, PAC.mole, 'SWIM', true, 0], [PAC.mole, PAC.kelp, 'SWIM', true, 0], [PAC.kelp, PAC.cave, 'SWIM', false, 0], [PAC.kelp, PAC.whale, 'R', true, 0],
    [PAC.whale, PAC.road, 'W', true, 0], [PAC.road, PAC.cave, 'R', false, 0], [PAC.road, PAC.hana, 'W', true, 0], [PAC.hana, PAC.fish, 'SWIM SNORKEL', true, 0],
    [PAC.fish, PAC.coffee, 'SWIM', true, 0], [PAC.coffee, PAC.mauna, 'LO', true, 9], [PAC.coffee, PAC.mauna, 'HI', false, -9], [PAC.mauna, PAC.hilo, 'W', true, 0], [PAC.hilo, PAC.hold, 'LIFT LEI', true, 0],
  ],
  legend: 'W WALK (LO LOW AND HI HIGH: TWO WALKS)  R ROPE BOTH WAYS  SWIM THE OPEN SEA  CUTTERS SNORKEL LEI: WHAT THE WAY WANTS  (THE LOOKOUT AND THE SEA CAVE: DEAD ENDS)',
});
