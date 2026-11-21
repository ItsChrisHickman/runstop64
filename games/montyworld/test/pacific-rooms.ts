/**
 * Mock Pacific rooms drawn with the new art, in Monty on the Run's own terms (32 x 20 playfield, 8 tile codes a room with a colour
 * each, decorations from character $9B up, creatures at their cells, its score row and place name) so the art and the places can be
 * judged in place. Not the game's rooms: a way to look (the design is docs/dosvidaniya-pacific.md). Each is written alone and beside one
 * of Monty on the Run's own rooms at the same scale (`compare-*.png`).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-rooms.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { COIN_CHAR } from '../../shared/monty/screen';
import { PACIFIC_CREATURES, type PacificCreature } from '../src/art/pacific-creatures';
import { PACIFIC_DECOR, type PacificDecor } from '../src/art/pacific-decor';
import { PACIFIC_ITEMS, type PacificItem } from '../src/art/pacific-items';
import { PACIFIC_TILES, type PacificTile } from '../src/art/pacific-tiles';
import { Canvas, drawMotrRoom, Screen } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: pacific-rooms.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

/** The room's 32 x 20 cells, painted with rectangles of a tile code. */
class Grid {
  private readonly cells = Array.from({ length: 20 }, () => Array.from({ length: 32 }, () => '.'));
  fill(c0: number, r0: number, c1: number, r1: number, code: string) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const row = this.cells[r]; if (row) row[c] = code; }
  }
  has(c: number, r: number) { return (this.cells[r]?.[c] ?? '.') !== '.'; }
  rows(): string[] { return this.cells.map((r) => r.join('')); }
}

interface MockRoom {
  readonly name: string;
  readonly nameCol: number;
  /** the tile for codes 1-8 and its colour */
  readonly codes: readonly (readonly [PacificTile, number])[];
  readonly grid: Grid;
  readonly decor: readonly (readonly [PacificDecor, col: number, row: number, colour?: number])[];
  readonly coins: readonly (readonly [number, number])[];
  readonly creatures: readonly (readonly [PacificCreature, col: number, row: number, frame: number, colour?: number])[];
  readonly items: readonly (readonly [PacificItem, col: number, row: number])[];
}

/** Paint a room onto the canvas, its top left at ox. Returns the decoration characters it takes. */
function paint(room: MockRoom, cv: Canvas, ox: number): number {
  if (room.codes.length > 8) throw new Error(`${room.name}: more than 8 tile codes`);
  const s = new Screen();
  s.tiles(room.codes.map(([t]) => PACIFIC_TILES[t].chr));
  s.playfield(room.grid.rows(), room.codes.map(([, c]) => c));
  let next = 0x9b;
  const first = new Map<string, number>(); // a type's characters are shared by every place it is used in the room
  for (const [piece, col, row, colour] of room.decor) {
    const d = PACIFIC_DECOR[piece];
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      if (room.grid.has(col + c, row + r)) console.log(`${room.name}: ${piece} sits on a tile at ${col + c},${row + r}`);
    }
    const ink = (n: number) => colour ?? (typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
    const at = first.get(piece);
    if (at === undefined) {
      first.set(piece, next);
      next = s.decor(d.chr, d.w, d.h, colour ?? d.colour, 4 + col, 3 + row, next);
    } else {
      for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) s.put(4 + col + c, 3 + row + r, at + r * d.w + c, ink(r * d.w + c));
    }
  }
  if (next > 0x100) throw new Error(`${room.name}: decorations take ${next - 0x9b} characters, 101 at most`);
  for (const [c, r] of room.coins) {
    if (room.grid.has(c, r)) console.log(`${room.name}: a coin in a tile at ${c},${r}`);
    s.put(4 + c, 3 + r, COIN_CHAR, 7);
  }
  s.hud(1200, 5, room.name, room.nameCol);
  s.draw(cv, ox, 0);
  for (const [name, col, row, frame, colour] of room.creatures) {
    const c = PACIFIC_CREATURES[name];
    cv.enemyFrame(c.frames, frame * 32, ox + (4 + col) * 8, (3 + row) * 8, colour ?? c.colour);
  }
  for (const [name, col, row] of room.items) {
    const it = PACIFIC_ITEMS[name];
    cv.spriteBlock(it.block, ox + (4 + col) * 8, (3 + row) * 8, it.colour);
  }
  return next - 0x9b;
}

/** Write a room alone, and beside one of Monty on the Run's rooms (the room's own at the left, the original's at the right). */
function write(room: MockRoom, file: string, motr: number) {
  const alone = new Canvas();
  const chars = paint(room, alone, 0);
  alone.png(path.join(out, `room-${file}.png`), 3);
  const both = new Canvas(648, 200);
  paint(room, both, 0);
  drawMotrRoom(both, motr, 328, 0);
  both.png(path.join(out, `compare-${file}.png`), 3);
  console.log(`${room.name}: ${chars} decoration characters of 101, ${room.codes.length} tile codes of 8`);
}

// ---- STERN WARNING: the ship's stern in section: the funnel and bridge on the deck, the engine room in the hull, the sea at the waterline
{
  const g = new Grid();
  g.fill(0, 18, 31, 19, '8'); // the sea
  g.fill(0, 7, 1, 14, '1'); g.fill(30, 7, 31, 14, '1'); // the hull's sides
  g.fill(1, 15, 30, 15, '1'); g.fill(2, 16, 29, 16, '1'); g.fill(4, 17, 27, 17, '1'); // the hull's belly, round to the keel
  g.fill(1, 8, 30, 8, '2'); g.fill(21, 8, 23, 8, '.'); // the main deck, its hatch
  g.fill(22, 9, 22, 14, '5'); // the ladder down the hatch
  g.fill(2, 14, 14, 14, '3'); g.fill(18, 14, 29, 14, '3'); // the engine room's grating
  g.fill(15, 14, 17, 14, '.'); // a gap: the bilge
  g.fill(2, 9, 29, 9, '4'); // a steam pipe along the roof of the engine room
  g.fill(3, 12, 5, 12, '3'); // a ledge for the cutters
  g.fill(26, 12, 28, 13, '7'); // a crate
  g.fill(0, 6, 0, 6, '1');
  write({
    name: 'STERN WARNING', nameCol: 9,
    codes: [['pacHullPlate', 2], ['pacDeckPlate', 12], ['pacGrating', 11], ['pacPipe', 11], ['pacSteelLadder', 12], ['pacHullPlate', 14], ['pacCrate', 9], ['pacWaves', 6]],
    grid: g,
    decor: [['pacFunnel', 5, 4], ['pacBridge', 12, 5], ['pacLifeRing', 26, 6], ['pacAnchor', 2, 6], ['pacEngineBlock', 7, 11], ['pacEngineBlock', 18, 11, 8], ['pacGauge', 14, 12], ['pacPorthole', 28, 10, 14]],
    coins: [[10, 7], [24, 12], [9, 10]],
    creatures: [['pacParrot', 20, 4, 1]],
    items: [['pacCutters', 3, 10]],
  }, 'stern-warning', 12);
}

// ---- BOX CLEVER: the bow in section: containers stacked on the deck, a flooded hold with a shark, a crane, the bow's rake at the right
{
  const g = new Grid();
  g.fill(0, 18, 31, 19, '8'); // the sea
  g.fill(0, 9, 1, 14, '1'); g.fill(29, 9, 30, 12, '1'); g.fill(30, 9, 31, 11, '1'); g.fill(31, 5, 31, 8, '1'); // hull sides, the bow's rake
  g.fill(1, 15, 28, 15, '1'); g.fill(3, 16, 27, 16, '1'); g.fill(6, 17, 24, 17, '1'); g.fill(29, 13, 30, 13, '1'); g.fill(28, 14, 29, 14, '1');
  g.fill(1, 9, 28, 9, '2'); g.fill(8, 9, 10, 9, '.'); // the deck, a hatch
  g.fill(9, 10, 9, 14, '5'); // its ladder
  g.fill(3, 5, 7, 8, '3'); g.fill(3, 3, 5, 4, '4'); g.fill(12, 6, 18, 8, '4'); g.fill(12, 3, 16, 5, '3'); // containers on the deck
  g.fill(21, 7, 26, 8, '3'); g.fill(22, 5, 25, 6, '4'); // more
  g.fill(1, 12, 6, 14, '3'); // the hold's cargo: a stack to climb
  g.fill(12, 14, 27, 14, '8'); // bilge water
  g.fill(14, 12, 17, 12, '2'); g.fill(21, 11, 24, 11, '2'); // gantries over it
  g.fill(19, 10, 19, 11, '6'); // the crane's chain
  write({
    name: 'BOX CLEVER', nameCol: 10,
    codes: [['pacHullPlate', 2], ['pacDeckPlate', 12], ['pacContainer', 8], ['pacContainer', 5], ['pacSteelLadder', 12], ['pacChain', 15], ['pacContainerDoor', 14], ['pacWaves', 6]],
    grid: g,
    decor: [['pacCrane', 19, 3], ['pacLifeRing', 29, 7], ['pacPorthole', 14, 10, 14], ['pacPorthole', 22, 10, 14]],
    coins: [[13, 11], [19, 9], [24, 4], [3, 11]],
    creatures: [['pacSharkFin', 18, 13, 0], ['pacCoconut', 12, 4, 0]],
    items: [['pacMusubi', 2, 10]],
  }, 'box-clever', 20);
}

// ---- SURF AND TURF: Waikiki, a beach in front of the hotels and Diamond Head, the snorkel shop, a cliff rope up to the luau
{
  const g = new Grid();
  g.fill(0, 16, 22, 16, '1'); g.fill(0, 17, 22, 19, '2'); // the beach
  g.fill(23, 16, 31, 19, '3'); // the sea: deadly surf (open sea with the snorkel)
  g.fill(0, 0, 18, 1, '8'); g.fill(22, 0, 31, 1, '8'); // the cliff's ceiling, a gap for the rope
  g.fill(2, 10, 9, 10, '6'); g.fill(10, 10, 10, 15, '5'); // the shop's loft and the ladder
  g.fill(20, 2, 20, 9, '5'); g.fill(19, 10, 21, 10, '6'); // the cliff rope and its ledge
  g.fill(24, 9, 31, 9, '8'); // a rock shelf over the sea
  write({
    name: 'SURF AND TURF', nameCol: 9,
    codes: [['pacSand', 7], ['pacSandFill', 7], ['pacWaves', 6], ['pacThatch', 9], ['pacBamboo', 13], ['pacBoardwalk', 9], ['pacSnow', 1], ['pacWallStone', 12]],
    grid: g,
    decor: [['pacDiamondHead', 12, 11], ['pacHotel', 24, 3], ['pacSnorkelShop', 2, 11], ['pacPalm', 14, 10], ['pacSurfboards', 11, 14]],
    coins: [[5, 8], [12, 8], [18, 14], [27, 7]],
    creatures: [['pacSurfer', 25, 14, 0], ['pacHula', 17, 14, 0]],
    items: [['pacSnorkel', 5, 8]],
  }, 'surf-and-turf', 4);
}

// ---- LEI OF THE LAND: the luau: a stage of boards, tiki torches whose flames take turns, a roast pig, hula dancers, the lei on the stage
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '4'); g.fill(0, 2, 31, 2, '3'); // the thatch roof of the long house
  g.fill(0, 3, 1, 17, '5'); g.fill(30, 3, 31, 17, '5'); // the posts
  g.fill(0, 18, 31, 19, '1'); g.fill(0, 17, 31, 17, '1');
  g.fill(4, 13, 11, 13, '2'); g.fill(20, 13, 27, 13, '2'); // the stage's boards
  g.fill(12, 17, 19, 17, '.'); g.fill(12, 18, 19, 19, '6'); // the fire pit
  g.fill(14, 9, 17, 9, '2');
  g.fill(7, 8, 8, 8, '2');
  write({
    name: 'LEI OF THE LAND', nameCol: 9,
    codes: [['pacSand', 7], ['pacBoardwalk', 9], ['pacThatch', 9], ['pacWallStone', 12], ['pacBamboo', 13], ['pacMagmaCrest', 8], ['pacBoardwalk', 9], ['pacSandFill', 7]],
    grid: g,
    decor: [['pacTikiTorch', 3, 14], ['pacTikiTorch', 12, 14], ['pacTikiTorch', 19, 14], ['pacTikiTorch', 28, 14], ['pacTotem', 22, 10], ['pacRoastPig', 13, 15], ['pacPalm', 7, 8], ['pacHibiscus', 25, 11, 13], ['pacTotem', 5, 10]],
    coins: [[6, 11], [15, 7], [23, 11]],
    creatures: [['pacHula', 8, 11, 0], ['pacHula', 24, 11, 1], ['pacTiki', 15, 11, 0]],
    items: [['pacLei', 15, 6]],
  }, 'lei-of-the-land', 19);
}

// ---- KELP WANTED: the reef between Molokai and Maui, under the surface, the sea cliffs of Molokai behind
{
  const g = new Grid();
  g.fill(0, 0, 31, 0, '1'); // the surface line
  g.fill(0, 1, 31, 18, '2'); // the sea's body
  g.fill(0, 17, 31, 19, '3'); g.fill(0, 17, 31, 17, '4'); // the seabed
  g.fill(8, 13, 12, 16, '5'); g.fill(9, 12, 11, 12, '5'); g.fill(20, 10, 25, 16, '5'); g.fill(21, 9, 24, 9, '5'); // reef rock
  g.fill(14, 15, 17, 16, '6'); g.fill(27, 14, 30, 16, '6'); // coral
  g.fill(2, 11, 6, 11, '7'); g.fill(0, 8, 3, 8, '7');
  write({
    name: 'KELP WANTED', nameCol: 10,
    codes: [['pacSeaSurface', 14], ['pacSea', 6], ['pacSand', 8], ['pacSandFill', 8], ['pacReefRock', 11], ['pacCoral', 10], ['pacReefRock', 12], ['pacSea', 6]],
    grid: g,
    decor: [['pacSeaCliff', 0, 1, 5], ['pacSeaCliffB', 4, 1, 13], ['pacKelp', 7, 14], ['pacKelp', 13, 14], ['pacKelp', 26, 14], ['pacSeaFan', 16, 13], ['pacBubbles', 18, 6], ['pacBubbles', 5, 9], ['pacSeaFan', 28, 11]],
    coins: [[11, 10], [22, 7], [3, 6], [29, 12], [16, 11]],
    creatures: [['pacTurtle', 14, 5, 0], ['pacEel', 9, 11, 0], ['pacManta', 24, 3, 1]],
    items: [],
  }, 'kelp-wanted', 7);
}

// ---- MAUNA KEA-OS: the climb up a volcano, lava rising in the basin below, snow on the top, black ledges
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '1'); g.fill(0, 2, 4, 5, '1'); g.fill(27, 2, 31, 4, '1'); // the snow at the top
  g.fill(0, 6, 1, 19, '4'); g.fill(30, 6, 31, 19, '4'); // the crater walls
  g.fill(2, 18, 29, 19, '3'); g.fill(2, 18, 29, 18, '2'); // the lava in the basin
  g.fill(2, 15, 6, 15, '4'); g.fill(9, 13, 13, 13, '5'); g.fill(16, 15, 20, 15, '5'); g.fill(24, 12, 28, 12, '5'); // ledges
  g.fill(18, 9, 22, 9, '4'); g.fill(8, 9, 12, 9, '5'); g.fill(2, 6, 6, 6, '4'); g.fill(26, 8, 29, 8, '4'); g.fill(14, 5, 18, 5, '1');
  g.fill(7, 6, 7, 8, '6'); // a vine up
  g.fill(23, 10, 23, 15, '6');
  write({
    name: 'MAUNA KEA-OS', nameCol: 10,
    codes: [['pacSnow', 1], ['pacMagmaCrest', 7], ['pacMagma', 8], ['pacBasalt', 11], ['pacCrust', 12], ['pacBamboo', 5], ['pacCrust', 9], ['pacBasalt', 11]],
    grid: g,
    decor: [['pacMaunaKea', 12, 1], ['pacLavaFountain', 4, 14], ['pacLavaFountain', 26, 14], ['pacLavaRocks', 14, 17], ['pacLavaRocks', 22, 17]],
    coins: [[4, 13], [11, 11], [18, 13], [26, 10], [5, 4]],
    creatures: [['pacMagma', 17, 7, 1], ['pacCoconut', 11, 12, 0]],
    items: [],
  }, 'mauna-kea-os', 31);
}

// ---- HILO GOODBYE: the apron: the cargo plane (tail fin at the left, nose at the right), the loader lift, the control tower, the guard
{
  const g = new Grid();
  g.fill(0, 18, 31, 19, '1'); // the apron
  g.fill(0, 0, 31, 1, '2'); g.fill(0, 2, 1, 16, '2'); g.fill(30, 2, 31, 16, '2'); // the terminal's edge

  g.fill(12, 3, 18, 3, '5');
  write({
    name: 'HILO GOODBYE', nameCol: 9,
    codes: [['pacRoad', 11], ['pacFuselage', 12], ['pacBridgeDeck', 12], ['pacSteelLadder', 12], ['pacSand', 7], ['pacWallStone', 12], ['pacSnow', 1], ['pacCrate', 9]],
    grid: g,
    decor: [['pacCargoPlane', 8, 13], ['pacControlTower', 2, 12], ['pacLoader', 25, 15], ['pacPallet', 5, 16]],
    coins: [[6, 12], [15, 11], [24, 11]],
    creatures: [['pacGuard', 22, 16, 0]],
    items: [['pacMusubi', 5, 12]],
  }, 'hilo-goodbye', 40);
}

// ---- HOLD YOUR HORSES: the cargo plane's hold: the curved ribs of the fuselage overhead, a roller floor, nets, pallets, swinging crates
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '1'); g.fill(0, 2, 3, 3, '1'); g.fill(28, 2, 31, 3, '1'); g.fill(0, 4, 1, 5, '1'); g.fill(30, 4, 31, 5, '1'); // the curve of the barrel, from the ribs and the skin
  g.fill(0, 6, 1, 15, '1'); g.fill(30, 6, 31, 15, '1');
  g.fill(0, 16, 31, 16, '2'); g.fill(0, 17, 31, 19, '1'); // the hold's floor (rollers) and the belly
  g.fill(6, 6, 6, 15, '3'); g.fill(14, 4, 14, 15, '3'); g.fill(22, 4, 22, 15, '3'); // the ribs, which are the nets' posts
  g.fill(8, 5, 12, 12, '4'); g.fill(16, 5, 20, 12, '4'); // cargo nets over pallets: climbed
  g.fill(3, 12, 5, 12, '5'); g.fill(24, 11, 28, 11, '5');
  g.fill(3, 13, 5, 16, '6'); // a crate stack
  g.fill(24, 12, 29, 16, '6');
  write({
    name: 'HOLD YOUR HORSES', nameCol: 8,
    codes: [['pacFuselage', 12], ['pacHoldFloor', 15], ['pacRib', 12], ['pacNet', 13], ['pacCrate', 9], ['pacCrate', 8], ['pacSteelLadder', 12], ['pacChain', 15]],
    grid: g,
    decor: [['pacJumpLamp', 28, 6], ['pacPallet', 8, 14], ['pacPallet', 16, 14], ['pacStrap', 10, 2], ['pacStrap', 18, 2], ['pacPorthole', 2, 8, 14]],
    coins: [[7, 3], [15, 3], [23, 8]],
    creatures: [['pacParrot', 12, 3, 2]],
    items: [['pacParachute', 26, 8]],
  }, 'hold-your-horses', 48);
}
