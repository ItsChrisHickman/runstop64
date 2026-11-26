/**
 * The Andes and the Amazon's map as a picture: the thirteen rooms as boxes on the exit grid (columns 25-28, rows 2-7 drawn as 0-5, the plane beside them), each with its name, the joins drawn between them (a line with
 * a letter: W walk, R rope both ways, DROP one way down, and what a gate wants: PARACHUTE, PANPIPES, MACHETE), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-map.ts <out-file.png>
 */
import { AND } from '../src/andes';
import { drawRegionMap } from './map-kit';

/** Each room's name on the map (as the game shows them). */
const NAMES: Readonly<Record<number, string>> = {
  [AND.jump]: 'JUMP FOR JOY', [AND.thin]: 'OUT OF THIN AIR', [AND.gorge]: 'CONDOR COUNTRY', [AND.terraces]: 'NO PROBLLAMA', [AND.picchu]: 'MACHU PICCHU', [AND.bridge]: 'THE INCA BRIDGE',
  [AND.canopy]: 'THE CANOPY', [AND.cloud]: 'CLOUD NINE', [AND.kapok]: 'BRANCHING OUT', [AND.vine]: 'VINE AND DANDY', [AND.sandbar]: 'UP THE CREEK', [AND.roots]: 'THE ROOTS', [AND.boat]: 'THE RIVER QUEEN',
};

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: THE ANDES AND THE AMAZON (COLUMNS 25-28, ROWS 2-7)', firstCol: 25, cols: 4, rows: 6,
  cells: {
    [AND.jump]: [25, 0], [AND.thin]: [25, 1], [AND.gorge]: [25, 2], [AND.terraces]: [25, 3], [AND.picchu]: [26, 3], [AND.bridge]: [27, 3],
    [AND.cloud]: [25, 4], [AND.canopy]: [26, 4], [AND.kapok]: [27, 4], [AND.vine]: [25, 5], [AND.sandbar]: [26, 5], [AND.roots]: [27, 5], [AND.boat]: [28, 5],
  },
  firstSector: AND.jump, sectors: Array.from({ length: AND.vine - AND.jump + 1 }, (_, i) => ({ col: 0, text: NAMES[AND.jump + i] ?? '' })), stub: { row: 0, words: ['THE FLIGHT', 'FROM HILO'] }, deadEnds: [AND.bridge, AND.boat],
  joins: [
    [-1, AND.jump, 'BAIL OUT', true, 0], [AND.jump, AND.thin, 'DROP', true, 0], [AND.thin, AND.gorge, 'DROP', true, 0], [AND.gorge, AND.terraces, 'DROP', true, 0],
    [AND.terraces, AND.picchu, 'W LO', true, 9], [AND.picchu, AND.terraces, 'W HI', false, -9], [AND.picchu, AND.bridge, 'W TOP', false, 0],
    [AND.picchu, AND.canopy, 'R PANPIPES', true, 0], [AND.canopy, AND.cloud, 'R LATTICE', true, 0], [AND.cloud, AND.vine, 'R', true, 0], [AND.vine, AND.sandbar, 'W VINES', true, 0],
    [AND.sandbar, AND.roots, 'W VINE', true, 0], [AND.roots, AND.kapok, 'R', true, 0], [AND.roots, AND.boat, 'W CHULLO', false, 0],
  ],
  legend: 'W WALK  R ROPE  DROP ONE WAY DOWN  PANPIPES CHULLO: WHAT THE WAY WANTS  MACHETE (ABOARD THE BOAT): THE TANGLE ON THE KAPOK, THE WAY TO RIO  DEAD ENDS: THE INCA BRIDGE, THE RIVER QUEEN',
});
