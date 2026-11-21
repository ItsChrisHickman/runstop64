/**
 * Mock Moscow rooms drawn with the new art, in Monty on the Run's own terms (32 x 20 playfield, 8 tile codes a room with a colour
 * each, decorations from character $9B up, enemies at their cells, its score row and place name) so the art can be judged in
 * place. Not the game's rooms: a way to look. Pictures go to the folder given.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/art-rooms.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { COIN_CHAR } from '../../shared/monty/screen';
import { MOSCOW_CREATURES, MOSCOW_ITEMS, type MoscowCreature, type MoscowItem } from '../src/art/creatures';
import { MOSCOW_DECOR, type MoscowDecor } from '../src/art/decorations';
import { MOSCOW_TILES, type MoscowTile } from '../src/art/tiles';
import { Canvas, Screen } from './preview-kit';

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

function draw(room: MockRoom, file: string) {
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
  for (const [c, r] of room.coins) s.put(4 + c, 3 + r, COIN_CHAR, 7);
  s.hud(1200, 5, room.name, room.nameCol);
  const cv = new Canvas();
  s.draw(cv);
  for (const [name, col, row, frame, colour] of room.creatures) {
    const c = MOSCOW_CREATURES[name];
    cv.enemyFrame(c.frames, frame * 32, (4 + col) * 8, (3 + row) * 8, colour ?? c.colour);
  }
  for (const [name, col, row] of room.items) {
    const it = MOSCOW_ITEMS[name];
    cv.spriteBlock(it.block, (4 + col) * 8, (3 + row) * 8, it.colour);
  }
  cv.png(path.join(out, file), 3);
  console.log(`${room.name}: ${next - 0x9b} decoration characters of 101, ${room.codes.length} tile codes of 8`);
}

// ---- Red Square: Saint Basil's on the cobbles, the end of the Kremlin wall at the left, snow on the ledges
{
  const g = new Grid();
  g.fill(0, 0, 31, 0, '8');
  g.fill(22, 1, 25, 1, '7'); // icicles under the ceiling
  g.fill(0, 18, 5, 18, '1'); g.fill(26, 18, 31, 18, '1'); g.fill(6, 18, 25, 18, '2');
  g.fill(0, 19, 5, 19, '8'); g.fill(26, 19, 31, 19, '8'); g.fill(6, 19, 25, 19, '2');
  g.fill(0, 12, 5, 12, '4'); g.fill(0, 13, 5, 17, '3'); // the wall: battlements over brick
  g.fill(0, 7, 5, 7, '5'); g.fill(22, 7, 28, 7, '5');
  draw({
    name: 'RED SQUARE', nameCol: 10,
    codes: [['snowGround', 1], ['cobbles', 12], ['kremlinBrick', 2], ['battlement', 2], ['snowLedge', 3], ['ironLadder', 7], ['icicles', 3], ['snowFill', 15]],
    grid: g,
    decor: [['stBasils', 8, 10], ['lampStreet', 6, 14], ['lampStreet', 19, 14], ['firTree', 23, 15], ['firTree', 27, 15], ['domeSmall', 1, 9], ['redStar', 24, 5]],
    coins: [[3, 5], [20, 12]],
    creatures: [['matryoshka', 20, 16, 1], ['guard', 26, 14, 1]],
    items: [['metroToken', 27, 5]],
  }, 'room-red-square.png');
}

// ---- The Kremlin wall: its battlements over brick, Spasskaya Tower, domes behind
{
  const g = new Grid();
  g.fill(0, 0, 31, 0, '8');
  g.fill(0, 18, 31, 18, '1'); g.fill(0, 19, 31, 19, '8');
  g.fill(0, 11, 21, 11, '4'); g.fill(0, 12, 21, 17, '3');
  g.fill(22, 11, 22, 17, '6');
  g.fill(24, 8, 30, 8, '5');
  draw({
    name: 'THE KREMLIN', nameCol: 10,
    codes: [['snowGround', 1], ['snowFill', 15], ['kremlinBrick', 2], ['battlement', 2], ['snowLedge', 3], ['ironLadder', 7], ['icicles', 3], ['cobbles', 12]],
    grid: g,
    decor: [['spasskaya', 24, 10], ['domeLarge', 2, 6], ['domeMedium', 9, 7], ['domeSmall', 16, 8], ['redStar', 19, 9], ['lampDouble', 28, 14]],
    coins: [[12, 9], [27, 6]],
    creatures: [['guard', 13, 9, 1], ['matryoshka', 26, 16, 1], ['pigeon', 8, 3, 0]],
    items: [['ushanka', 27, 5]],
  }, 'room-kremlin.png');
}

// ---- The metro: a platform each side of the track, an escalator up to the concourse
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '1'); g.fill(0, 2, 1, 19, '1'); g.fill(30, 2, 31, 19, '1');
  g.fill(2, 14, 10, 14, '2'); g.fill(2, 15, 10, 19, '1');
  g.fill(21, 14, 29, 14, '2'); g.fill(21, 15, 29, 19, '1');
  g.fill(11, 19, 20, 19, '1'); g.fill(11, 18, 20, 18, '3'); // the track: the live rail
  g.fill(2, 8, 16, 8, '6'); // the concourse
  g.fill(19, 9, 20, 13, '4'); // the escalator
  g.fill(13, 2, 13, 7, '5'); g.fill(24, 2, 24, 7, '5');
  g.fill(21, 8, 29, 8, '6');
  g.fill(17, 8, 18, 8, '6');
  draw({
    name: 'THE METRO', nameCol: 11,
    codes: [['metroTile', 15], ['platformEdge', 7], ['thirdRail', 2], ['escalator', 12], ['pillar', 15], ['girder', 12], ['arcadeFloor', 14], ['ironLadder', 7]],
    grid: g,
    decor: [['metroSign', 3, 11], ['stationClock', 6, 11], ['chandelier', 8, 2], ['chandelier', 17, 2], ['metroSign', 26, 11], ['lampDouble', 22, 10]],
    coins: [[6, 7], [14, 13]],
    creatures: [['guard', 24, 12, 1], ['pigeon', 12, 9, 0]],
    items: [['metroToken', 9, 6]],
  }, 'room-metro.png');
}

// ---- The GUM arcade: arches along the floor, a balcony, the roof's girders
{
  const g = new Grid();
  g.fill(0, 18, 31, 19, '1');
  g.fill(0, 0, 2, 17, '4'); g.fill(29, 0, 31, 17, '4');
  g.fill(3, 1, 28, 1, '3');
  g.fill(3, 9, 12, 9, '3'); g.fill(19, 9, 28, 9, '3');
  g.fill(13, 9, 13, 17, '5');
  g.fill(16, 2, 16, 8, '2');
  g.fill(24, 4, 28, 4, '6');
  draw({
    name: 'GUM ARCADE', nameCol: 10,
    codes: [['arcadeFloor', 15], ['pillar', 15], ['girder', 12], ['kremlinBrick', 2], ['ironLadder', 7], ['snowLedge', 3], ['battlement', 10], ['cobbles', 12]],
    grid: g,
    decor: [['gumArch', 4, 14], ['gumArch', 8, 14], ['gumArch', 17, 14], ['firTree', 24, 15], ['chandelier', 8, 2], ['chandelier', 22, 2], ['lampDouble', 14, 5]],
    coins: [[6, 8], [26, 3]],
    creatures: [['bear', 22, 16, 1], ['pigeon', 6, 4, 1], ['matryoshka', 20, 7, 2]],
    items: [['ushanka', 10, 7]],
  }, 'room-gum.png');
}
