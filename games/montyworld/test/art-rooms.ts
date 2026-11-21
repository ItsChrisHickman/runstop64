/**
 * Mock Moscow rooms drawn with the new art, in Monty on the Run's own terms (32 x 20 playfield, 8 tile codes a room with a colour
 * each, decorations from character $9B up, enemies at their cells, its score row and place name) so the art can be judged in
 * place. Not the game's rooms: a way to look. Each room is laid out as Monty on the Run's rooms are (walls framing it, a thick
 * textured ceiling, solid masses, platforms and ladders at several heights), and written twice: alone, and beside one of Monty
 * on the Run's own rooms at the same scale (`compare-*.png`).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/art-rooms.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { COIN_CHAR } from '../../shared/monty/screen';
import { MOSCOW_CREATURES, MOSCOW_ITEMS, type MoscowCreature, type MoscowItem } from '../src/art/creatures';
import { MOSCOW_DECOR, type MoscowDecor } from '../src/art/decorations';
import { MOSCOW_TILES, type MoscowTile } from '../src/art/tiles';
import { Canvas, drawMotrRoom, Screen } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: art-rooms.ts <out-dir>');
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
  readonly codes: readonly (readonly [MoscowTile, number])[];
  readonly grid: Grid;
  readonly decor: readonly (readonly [MoscowDecor, col: number, row: number])[];
  readonly coins: readonly (readonly [number, number])[];
  readonly creatures: readonly (readonly [MoscowCreature, col: number, row: number, frame: number, colour?: number])[];
  readonly items: readonly (readonly [MoscowItem, col: number, row: number])[];
}

/** Paint a room onto the canvas, its top left at ox. Returns the decoration characters it takes. */
function paint(room: MockRoom, cv: Canvas, ox: number): number {
  if (room.codes.length > 8) throw new Error(`${room.name}: more than 8 tile codes`);
  const s = new Screen();
  s.tiles(room.codes.map(([t]) => MOSCOW_TILES[t].chr));
  s.playfield(room.grid.rows(), room.codes.map(([, c]) => c));
  let next = 0x9b;
  const first = new Map<MoscowDecor, number>(); // a type's characters are shared by every place it is used in the room
  for (const [piece, col, row] of room.decor) {
    const d = MOSCOW_DECOR[piece];
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      if (room.grid.has(col + c, row + r)) throw new Error(`${room.name}: ${piece} sits on a tile at ${col + c},${row + r}`);
    }
    const at = first.get(piece);
    if (at === undefined) {
      first.set(piece, next);
      next = s.decor(d.chr, d.w, d.h, d.colour, 4 + col, 3 + row, next);
    } else {
      for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
        s.put(4 + col + c, 3 + row + r, at + r * d.w + c, typeof d.colour === 'number' ? d.colour : d.colour[r * d.w + c] ?? 1);
      }
    }
  }
  if (next > 0x100) throw new Error(`${room.name}: decorations take ${next - 0x9b} characters, 101 at most`);
  for (const [c, r] of room.coins) {
    if (room.grid.has(c, r)) throw new Error(`${room.name}: a coin in a tile at ${c},${r}`);
    s.put(4 + c, 3 + r, COIN_CHAR, 7);
  }
  s.hud(1200, 5, room.name, room.nameCol);
  s.draw(cv, ox, 0);
  for (const [name, col, row, frame, colour] of room.creatures) {
    const c = MOSCOW_CREATURES[name];
    cv.enemyFrame(c.frames, frame * 32, ox + (4 + col) * 8, (3 + row) * 8, colour ?? c.colour);
  }
  for (const [name, col, row] of room.items) {
    const it = MOSCOW_ITEMS[name];
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


// ---- Red Square: the Kremlin wall at the left, the GUM facade stepping up at the right, Saint Basil's on the cobbles between
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '6'); g.fill(0, 2, 9, 2, '6'); g.fill(18, 2, 31, 2, '6'); g.fill(24, 3, 31, 3, '6'); g.fill(12, 2, 15, 3, '6'); // a ceiling of snow crust
  g.fill(0, 2, 1, 17, '4'); g.fill(30, 2, 31, 17, '4'); // the frame: a tower each side
  g.fill(2, 2, 5, 4, '4'); // brick hanging from the roof
  g.fill(2, 8, 7, 8, '5'); g.fill(2, 9, 7, 17, '4'); // the wall, battlements on top
  g.fill(24, 14, 29, 14, '5'); g.fill(24, 15, 29, 17, '4'); // the facade steps up
  g.fill(26, 11, 29, 11, '5'); g.fill(26, 12, 29, 13, '4');
  g.fill(28, 8, 29, 8, '5'); g.fill(28, 9, 29, 10, '4');
  g.fill(8, 8, 14, 8, '7'); g.fill(16, 5, 23, 5, '7'); // ledges
  g.fill(8, 9, 8, 17, '8'); g.fill(23, 6, 23, 17, '8'); // ladders
  g.fill(0, 18, 7, 18, '1'); g.fill(24, 18, 31, 18, '1'); g.fill(8, 18, 23, 19, '3'); g.fill(0, 19, 7, 19, '2'); g.fill(24, 19, 31, 19, '2');
  write({
    name: 'RED SQUARE', nameCol: 10,
    codes: [['snowGround', 1], ['snowFill', 1], ['cobbles', 10], ['kremlinBrick', 2], ['battlement', 2], ['snowCrust', 3], ['snowLedge', 3], ['ironLadder', 7]],
    grid: g,
    decor: [['stBasils', 10, 10], ['redStar', 3, 6], ['domeSmall', 6, 5], ['lampStreet', 9, 14], ['lampStreet', 20, 14], ['firTree', 21, 15]],
    coins: [[11, 6], [19, 3], [26, 9]],
    creatures: [['matryoshka', 18, 3, 1], ['guard', 10, 6, 1], ['pigeon', 8, 3, 1], ['snowball', 13, 16, 0]],
    items: [['metroToken', 28, 6]],
  }, 'red-square', 5);
}

// ---- The Kremlin: Spasskaya Tower over the wall with the domes behind, a stair up the right, a ladder up the left
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '5'); g.fill(3, 3, 6, 3, '5'); g.fill(20, 3, 23, 3, '8'); // the ceiling, a lump on it, icicles
  g.fill(0, 3, 2, 17, '3'); g.fill(29, 3, 31, 17, '3'); // the frame
  g.fill(3, 8, 6, 8, '6'); g.fill(3, 13, 6, 13, '6'); // ledges off the left tower
  g.fill(8, 11, 23, 11, '4'); g.fill(8, 12, 23, 17, '3'); g.fill(7, 11, 7, 17, '7'); // the wall, battlements along it, the ladder up its face
  g.fill(24, 14, 28, 14, '4'); g.fill(24, 15, 28, 17, '3'); g.fill(26, 11, 28, 11, '4'); g.fill(26, 12, 28, 13, '3'); // the stair
  g.fill(24, 7, 28, 7, '6'); g.fill(24, 8, 24, 13, '7'); g.fill(17, 6, 22, 6, '6'); // the high ledges
  g.fill(3, 18, 28, 18, '1'); g.fill(0, 19, 31, 19, '2'); g.fill(0, 18, 2, 18, '1'); g.fill(29, 18, 31, 18, '1');
  write({
    name: 'THE KREMLIN', nameCol: 10,
    codes: [['snowGround', 1], ['snowFill', 1], ['kremlinBrick', 2], ['battlement', 2], ['snowCrust', 3], ['snowLedge', 3], ['ironLadder', 7], ['icicles', 3]],
    grid: g,
    decor: [['spasskaya', 14, 3], ['domeLarge', 9, 6], ['domeMedium', 18, 7], ['domeSmall', 21, 8], ['lampDouble', 5, 14]],
    coins: [[4, 6], [19, 4], [10, 4]],
    creatures: [['guard', 12, 9, 1], ['matryoshka', 3, 16, 1], ['pigeon', 25, 4, 1]],
    items: [['ushanka', 26, 5]],
  }, 'kremlin', 14);
}

// ---- The metro: a platform each side of the live rail, escalators up to the concourse and a mezzanine above, vaulted roof
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '2'); // the vaulted roof
  g.fill(0, 3, 1, 19, '1'); g.fill(30, 3, 31, 19, '1'); g.fill(2, 3, 3, 4, '1'); g.fill(28, 3, 29, 4, '1'); // the walls
  g.fill(2, 15, 13, 15, '4'); g.fill(2, 16, 13, 19, '1'); // the left platform
  g.fill(18, 15, 29, 15, '4'); g.fill(18, 16, 29, 19, '1'); // the right platform
  g.fill(14, 19, 17, 19, '1'); g.fill(14, 18, 17, 18, '5'); // the track and its rail
  g.fill(2, 9, 6, 9, '7'); g.fill(9, 9, 13, 9, '7'); g.fill(7, 9, 8, 14, '6'); // the concourse, an escalator through it
  g.fill(18, 9, 22, 9, '7'); g.fill(25, 9, 29, 9, '7'); g.fill(23, 9, 24, 14, '6');
  g.fill(14, 3, 15, 8, '3'); g.fill(17, 3, 18, 8, '3'); g.fill(14, 9, 17, 9, '8'); // pillars down from the roof, a girder between them
  g.fill(5, 5, 10, 5, '4'); g.fill(10, 6, 10, 8, '6'); // the mezzanines
  g.fill(21, 5, 27, 5, '4'); g.fill(21, 6, 21, 8, '6');
  write({
    name: 'THE METRO', nameCol: 11,
    codes: [['metroTile', 3], ['vault', 14], ['pillar', 1], ['platformEdge', 7], ['thirdRail', 2], ['escalatorDownTread', 4], ['arcadeFloor', 1], ['girder', 8]],
    grid: g,
    decor: [['metroSign', 2, 12], ['stationClock', 11, 6], ['chandelier', 11, 3], ['chandelier', 19, 3], ['lampDouble', 11, 11], ['metroSign', 26, 12], ['bench', 4, 13], ['bench', 19, 13], ['poster', 9, 12], ['poster', 28, 12]],
    coins: [[7, 3], [27, 7], [15, 13]],
    creatures: [['guard', 20, 13, 1], ['pigeon', 15, 11, 1], ['bear', 3, 7, 0]],
    items: [['metroToken', 23, 3]],
  }, 'metro', 1);
}

// ---- The GUM arcade: arches along the floor, a balcony each side, ladders to it, a bridge and a tree in the middle
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '8'); // the arcade's ribbed roof
  g.fill(0, 3, 2, 17, '2'); g.fill(29, 3, 31, 17, '2'); // piers
  g.fill(0, 18, 31, 19, '1');
  g.fill(3, 9, 11, 9, '3'); g.fill(20, 9, 28, 9, '3'); g.fill(3, 10, 11, 10, '4'); g.fill(20, 10, 28, 10, '4'); // the balconies
  g.fill(12, 9, 12, 17, '5'); g.fill(19, 9, 19, 17, '5'); // ladders down
  g.fill(4, 5, 10, 5, '7'); g.fill(21, 5, 27, 5, '7'); g.fill(10, 6, 10, 8, '5'); g.fill(21, 6, 21, 8, '5'); // upper ledges
  g.fill(13, 6, 18, 6, '3'); // the bridge
  write({
    name: 'GUM ARCADE', nameCol: 10,
    codes: [['arcadeFloor', 1], ['pillar', 1], ['girder', 8], ['kremlinBrick', 2], ['ironLadder', 7], ['snowLedge', 3], ['platformEdge', 7], ['vault', 14]],
    grid: g,
    decor: [['gumArch', 3, 14], ['gumArch', 7, 14], ['gumArch', 21, 14], ['gumArch', 25, 14], ['firTree', 15, 15], ['chandelier', 15, 3], ['lampDouble', 11, 5], ['lampDouble', 19, 5], ['shopWindow', 4, 11], ['shopWindow', 8, 11], ['shopWindow', 21, 11], ['shopWindow', 25, 11], ['samovar', 8, 7], ['samovar', 27, 7]],
    coins: [[7, 3], [13, 4], [24, 3]],
    creatures: [['bear', 13, 16, 0], ['pigeon', 8, 3, 1], ['matryoshka', 24, 7, 2], ['guard', 5, 7, 1]],
    items: [['ushanka', 25, 3]],
  }, 'gum', 10);
}
