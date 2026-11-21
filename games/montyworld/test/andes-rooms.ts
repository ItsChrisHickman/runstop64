/**
 * Mock rooms of the Andes and the Amazon (pre-production) drawn with the new art in Monty on the Run's own terms, to judge the art in
 * place: F2 (the parachute drop with its updrafts and condors), T2 (Machu Picchu's terraces and rolling boulders), P (the piranha river
 * and its swinging vines) and B (the riverboat). Not the game's rooms: the layouts in docs/dosvidaniya-andes.md are its. Each is written
 * alone and beside one of Monty on the Run's own rooms (`compare-*.png`).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-rooms.ts <out-dir>
 */
import { bankImage } from '../../montyotr/src/data';
import { ANDES_CREATURES } from '../src/art/andes-creatures';
import { ANDES_DECOR } from '../src/art/andes-decor';
import { chulloWorn, CHULLO_COLOUR } from '../src/art/andes-hat';
import { ANDES_SPRITES, VINE_COLOUR, vineSegment } from '../src/art/andes-items';
import { ANDES_TILES } from '../src/art/andes-tiles';
import { Grid, write, type At, type RoomArt } from './room-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-rooms.ts <out-dir>');
const art: RoomArt = { tiles: ANDES_TILES, decor: ANDES_DECOR, creatures: ANDES_CREATURES, sprites: ANDES_SPRITES };
const worn = chulloWorn(bankImage);

/** A vine hanging from a pivot (playfield pixels) at an angle: three segments end to end, each leaning the same way. */
function vine(px: number, py: number, deg: number): readonly (readonly [{ block: Uint8Array; colour: number }, At])[] {
  const a = (deg * Math.PI) / 180;
  return [0, 1, 2].map((i) => [{ block: vineSegment(deg), colour: VINE_COLOUR }, { x: Math.round(px - 11.5 + Math.sin(a) * 20 * i), y: Math.round(py + Math.cos(a) * 20 * i) }] as const);
}

// ---- OUT OF THIN AIR: the flight room: a ridge to float over by its updraft, a spire with an empanada, condors, Monty under his canopy
{
  const g = new Grid();
  g.fill(11, 13, 20, 19, '1'); g.fill(12, 11, 19, 12, '1'); g.fill(14, 9, 17, 10, '1'); g.fill(14, 8, 17, 8, '2'); g.fill(12, 10, 13, 10, '2'); g.fill(18, 10, 19, 10, '2');
  g.fill(2, 16, 7, 19, '1'); g.fill(3, 14, 6, 15, '1'); g.fill(4, 13, 5, 13, '2');
  g.fill(24, 17, 31, 17, '4'); g.fill(24, 18, 31, 19, '1');
  write(out, art, {
    name: 'OUT OF THIN AIR', nameCol: 8,
    codes: [['mountainRock'], ['snowCap'], ['rockLedge'], ['terraceGrass']],
    grid: g,
    decor: [['mountainRange', 21, 14], ['peak', 0, 8], ['updraft', 6, 8], ['updraft', 22, 7], ['cloudBig', 2, 1], ['cloud', 25, 2], ['cloud', 12, 4], ['cloud', 23, 12]],
    coins: [[7, 7], [7, 5], [10, 3], [15, 6], [20, 5], [24, 5], [4, 12]],
    creatures: [['condor', 13, 1, 1], ['condor', 27, 8, 2]],
    items: [['empanada', { col: 4, row: 11 }], ['canopyLevel', { x: 50, y: 34 }]],
    monty: [{ ptr: 0x58, at: { x: 50, y: 52 } }],
  }, 'thin-air', 0x1d);
}

// ---- ROCK AND ROLL: Machu Picchu's terraces stepping down the room, Huayna Picchu behind, boulders on their way down, a winking llama, the chullo
{
  const g = new Grid();
  const steps = [[0, 5, 5], [6, 9, 7], [10, 13, 9], [14, 17, 11], [18, 21, 13], [22, 25, 15], [26, 31, 17]] as const;
  for (const [c0, c1, row] of steps) { g.fill(c0, row, c1, row, '1'); g.fill(c0, row + 1, c1, 19, '2'); }
  write(out, art, {
    name: 'ROCK AND ROLL', nameCol: 9,
    codes: [['terraceGrass'], ['incaWall'], ['woodLadder'], ['tunnelStone']],
    grid: g,
    decor: [['huaynaPicchu', 26, 5], ['incaGate', 0, 1], ['stoneHut', 6, 2], ['intihuatana', 4, 3], ['cloudBig', 14, 1]],
    coins: [[8, 4], [12, 6], [16, 8], [20, 10], [24, 12], [28, 14]],
    creatures: [['llama', 16, 9, 1], ['spitter', 28, 15, 1]],
    items: [['boulder0', { col: 8, row: 5 }], ['boulder2', { col: 19, row: 11 }], ['boulder1', { col: 24, row: 13 }]],
    monty: [{ ptr: 0x54, at: { x: 11 * 8, y: 9 * 8 - 21 }, worn, hat: CHULLO_COLOUR }],
  }, 'rock-and-roll', 0x13);
}

// ---- VINE AND DANDY: the piranha river, three vines swinging, logs between, Monty riding one
{
  const g = new Grid();
  g.fill(0, 0, 31, 3, '1'); g.fill(0, 4, 3, 5, '1'); g.fill(28, 4, 31, 5, '1');
  g.fill(0, 15, 3, 15, '4'); g.fill(0, 16, 3, 19, '2'); g.fill(28, 15, 31, 15, '4'); g.fill(28, 16, 31, 19, '2');
  g.fill(4, 17, 27, 19, '3'); g.fill(13, 16, 15, 16, '4'); g.fill(20, 16, 22, 16, '4');
  const pivot = (col: number) => [col * 8, 4 * 8] as const;
  const [p1x, p1y] = pivot(8), [p2x, p2y] = pivot(16), [p3x, p3y] = pivot(24);
  write(out, art, {
    name: 'VINE AND DANDY', nameCol: 9,
    codes: [['jungleLeaf'], ['mud'], ['riverWater', 6], ['mossGround'], ['vine']],
    grid: g,
    decor: [['giantTree', 0, 9], ['stiltHut', 28, 11], ['hangingVines', 5, 4], ['hangingVines', 26, 4], ['fern', 4, 14, 13], ['cloud', 12, 6, 15]],
    coins: [[10, 9], [14, 13], [21, 13], [26, 10]],
    creatures: [['piranha', 9, 13, 0], ['piranha', 18, 12, 2], ['toucan', 4, 6, 1], ['sloth', 12, 4, 1]],
    items: [...vine(p1x, p1y, -25), ...vine(p2x, p2y, 5), ...vine(p3x, p3y, 38)],
    monty: [{ ptr: 0x58, at: { x: Math.round(p2x + Math.sin(0.087) * 60 - 12), y: Math.round(p2y + 60 - 6) } }],
  }, 'vine-and-dandy', 0x07);
}

// ---- THE RIVER QUEEN: the riverboat in its water: a hull with its portholes, the cargo deck, a ladder to the top deck, the pilot house, funnel and paddle wheel
{
  const g = new Grid();
  g.fill(0, 18, 31, 19, '5'); g.fill(28, 17, 31, 17, '5');
  g.fill(3, 17, 27, 17, '1'); g.fill(2, 15, 27, 16, '1');
  for (const c of [6, 10, 14, 18, 22, 26]) g.fill(c, 16, c, 16, '2');
  g.fill(2, 14, 27, 14, '3');
  g.fill(2, 13, 4, 13, '4'); g.fill(25, 13, 27, 13, '4');
  g.fill(4, 9, 5, 12, '1'); g.fill(26, 9, 27, 12, '1');
  g.fill(4, 8, 26, 8, '3'); g.fill(22, 8, 22, 8, '.'); g.fill(22, 9, 22, 13, '6');
  g.fill(4, 7, 7, 7, '4'); g.fill(13, 7, 17, 7, '4'); g.fill(20, 7, 26, 7, '4');
  write(out, art, {
    name: 'THE RIVER QUEEN', nameCol: 8,
    codes: [['hullPlate'], ['porthole'], ['deckBoards'], ['shipRail'], ['riverWater', 6], ['woodLadder']],
    grid: g,
    decor: [['pilotHouse', 8, 5], ['funnel', 18, 5], ['lifebuoy', 24, 6], ['cargo', 7, 12], ['cargo', 17, 12], ['hammock', 13, 10], ['paddleWheel', 28, 13], ['palm', 0, 8], ['stiltHut', 28, 4], ['cloud', 11, 1, 15], ['cloud', 22, 2, 15]],
    coins: [[12, 12], [24, 5], [10, 3]],
    creatures: [['captain', 20, 12, 0], ['toucan', 14, 4, 1, 2], ['dolphin', 29, 16, 1]],
    items: [],
    monty: [{ ptr: 0x54, at: { x: 13 * 8, y: 14 * 8 - 21 }, worn, hat: CHULLO_COLOUR }],
  }, 'river-queen', 0x30);
}
console.log('ok');
