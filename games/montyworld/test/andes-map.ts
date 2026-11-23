/**
 * The Andes and the Amazon's map as a picture: the eight rooms as boxes on the exit grid (columns 30-32, rows 2-6 drawn as 0-4, the plane's hold beside them), each with its name, the joins drawn between them (a line with
 * a letter: W walk, R rope both ways, DROP one way down, and what a gate wants: PARACHUTE, PANPIPES, MACHETE), the dead ends marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-map.ts <out-file.png>
 */
import { AND } from '../src/andes';
import { drawRegionMap } from './map-kit';

/** Each room's name on the map (the Amazon's four share THE AMAZON in the game: here each says which it is). */
const NAMES: Readonly<Record<number, string>> = {
  [AND.jump]: 'JUMP FOR JOY', [AND.gorge]: 'CONDOR COUNTRY', [AND.terraces]: 'NO PROBLLAMA', [AND.picchu]: 'MACHU PICCHU',
  [AND.canopy]: 'THE RAINFOREST: THE CANOPY', [AND.kapok]: 'THE RAINFOREST: THE KAPOK', [AND.sandbar]: 'THE RAINFOREST: THE RIVER', [AND.roots]: 'THE RAINFOREST: THE ROOTS',
};

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-map.ts <out-file.png>');

drawRegionMap(out, {
  title: 'DO SVIDANIYA MONTY: THE ANDES AND THE AMAZON (COLUMNS 30-32, ROWS 2-6)', firstCol: 30, cols: 3, rows: 5,
  cells: {
    [AND.jump]: [30, 0], [AND.gorge]: [30, 1], [AND.terraces]: [30, 2], [AND.picchu]: [31, 2],
    [AND.canopy]: [31, 3], [AND.kapok]: [32, 3], [AND.sandbar]: [31, 4], [AND.roots]: [32, 4],
  },
  firstSector: AND.jump, sectors: Array.from({ length: 12 }, (_, i) => ({ col: 0, text: NAMES[AND.jump + i] ?? '' })), stub: { row: 0, words: ['THE PACIFIC', 'THE HOLD'] }, deadEnds: [AND.picchu],
  joins: [
    [-1, AND.jump, 'W PARACHUTE', true, 0], [AND.jump, AND.gorge, 'DROP', true, 0], [AND.gorge, AND.terraces, 'DROP', true, 0],
    [AND.terraces, AND.picchu, 'W LO', true, 9], [AND.picchu, AND.terraces, 'W HI', false, -9],
    [AND.picchu, AND.canopy, 'R PANPIPES', true, 0], [AND.canopy, AND.sandbar, 'R / DROP', true, 0], [AND.sandbar, AND.roots, 'W VINES', true, 0],
    [AND.canopy, AND.kapok, 'W WALKWAY', true, 0], [AND.kapok, AND.roots, 'DROP HOLLOW', true, 0],
  ],
  legend: 'W WALK (HI, LO: TWO WALKS)  R ROPE  DROP ONE WAY DOWN  PARACHUTE PANPIPES MACHETE: WHAT THE WAY WANTS  MACHETE: THE TANGLE ON THE WAY TO RIO  MACHU PICCHU: THE INTIHUATANA A DEAD END',
});
