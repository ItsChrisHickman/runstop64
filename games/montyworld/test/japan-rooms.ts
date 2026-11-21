/**
 * Mock Japanese rooms drawn with the new art, in Monty on the Run's own terms (32 x 20 playfield, 8 tile codes a room with a colour each,
 * decorations from character $9B up, creatures at their cells, its score row and place name) so the art can be judged in place: the
 * harbour with the junk, the bullet-train platform mid-sweep, the temple garden's koi pond, the castle's gate hall with its paper doors,
 * and THE LAST MOLE. Not the game's rooms: a way to look. Each is written alone and beside one of Monty on the Run's own rooms.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-rooms.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { COIN_CHAR } from '../../shared/monty/screen';
import { JAPAN_CREATURES, type JapanCreature } from '../src/art/japan-creatures';
import { JAPAN_DECOR, type JapanDecor } from '../src/art/japan-decor';
import { JAPAN_ITEMS, type JapanItem } from '../src/art/japan-items';
import { JAPAN_TILES, type JapanTile } from '../src/art/japan-tiles';
import { Canvas, drawMotrRoom, Screen } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: japan-rooms.ts <out-dir>');
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
  readonly codes: readonly (readonly [JapanTile, number])[];
  readonly grid: Grid;
  readonly decor: readonly (readonly [JapanDecor, col: number, row: number])[];
  readonly coins: readonly (readonly [number, number])[];
  readonly creatures: readonly (readonly [JapanCreature, col: number, row: number, frame: number])[];
  readonly items: readonly (readonly [JapanItem, col: number, row: number])[];
}

function paint(room: MockRoom, cv: Canvas, ox: number): number {
  if (room.codes.length > 8) throw new Error(`${room.name}: more than 8 tile codes`);
  const s = new Screen();
  s.tiles(room.codes.map(([t]) => JAPAN_TILES[t].chr));
  s.playfield(room.grid.rows(), room.codes.map(([, c]) => c));
  let next = 0x9b;
  const first = new Map<JapanDecor, number>();
  for (const [piece, col, row] of room.decor) {
    const d = JAPAN_DECOR[piece];
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
  for (const [name, col, row, frame] of room.creatures) {
    const c = JAPAN_CREATURES[name];
    cv.enemyFrame(c.frames, frame * 32, ox + (4 + col) * 8, (3 + row) * 8, c.colour);
  }
  for (const [name, col, row] of room.items) {
    const it = JAPAN_ITEMS[name];
    cv.spriteBlock(it.block, ox + (4 + col) * 8, (3 + row) * 8, it.colour);
  }
  return next - 0x9b;
}

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

// ---- A CATCH OF THE DAY: the junk at the left, the quay with the market, a warehouse roof up the crates, the Great Wave behind
{
  const g = new Grid();
  g.fill(0, 14, 9, 16, '4'); g.fill(0, 17, 31, 19, '3'); // the junk's hull, the water under it
  g.fill(10, 14, 31, 14, '1'); g.fill(10, 15, 31, 17, '2'); g.fill(10, 18, 31, 19, '2'); // the quay
  g.fill(10, 12, 11, 13, '5'); g.fill(12, 10, 13, 13, '5'); g.fill(14, 8, 15, 13, '5'); // crates, a stair
  g.fill(16, 7, 31, 7, '6'); g.fill(16, 8, 31, 9, '7'); // the warehouse roof
  g.fill(31, 0, 31, 3, '2'); g.fill(0, 0, 0, 3, '2');
  write({
    name: 'CATCH OF THE DAY', nameCol: 7,
    codes: [['jpQuay', 9], ['jpPier', 12], ['jpWater', 14], ['jpJunkHull', 2], ['jpCrate', 8], ['jpKawara', 14], ['jpRoofBody', 6], ['jpPipe', 12]],
    grid: g,
    decor: [['jpJunkSail', 1, 6], ['jpWave', 9, 2], ['jpStall', 19, 11], ['jpBarrels', 26, 12], ['jpLantern', 17, 10]],
    coins: [[24, 10], [22, 5], [28, 5]],
    creatures: [['jpCrab', 28, 12, 1], ['jpSushiRoll', 24, 12, 1]],
    items: [['jpSushi', 18, 5]],
  }, 'harbour', 5);
}

// ---- E BULLET POINT: the platform with the train sweeping it, the stairs down to the underpass, the shutter at the right end
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '1'); g.fill(22, 0, 24, 2, '.'); // the tiled roof, a gap for D's rope
  g.fill(0, 3, 1, 13, '1'); g.fill(30, 3, 31, 9, '1'); g.fill(30, 10, 31, 13, '4'); // the walls, the shutter
  g.fill(0, 14, 31, 14, '2'); g.fill(8, 14, 10, 14, '.'); g.fill(19, 14, 21, 14, '.'); // the platform, two stairs' gaps
  g.fill(0, 15, 1, 19, '1'); g.fill(30, 15, 31, 19, '1'); g.fill(2, 17, 29, 19, '3'); // the underpass's floor, its ends
  g.fill(9, 14, 9, 16, '5'); g.fill(20, 14, 20, 16, '5'); g.fill(23, 3, 23, 13, '5'); // the ropes
  g.fill(0, 15, 0, 16, '.'); // the way in from C
  write({
    name: 'BULLET POINT', nameCol: 10,
    codes: [['jpTiled', 14], ['jpPlatform', 7], ['jpSteel', 12], ['jpShutter', 12], ['jpBamboo', 5]],
    grid: g,
    decor: [['jpTrainNose', 4, 8], ['jpTrainCar', 8, 8], ['jpTrainCar', 12, 8], ['jpTrainCar', 16, 8], ['jpBoard', 14, 3], ['jpSignalLamp', 28, 10]],
    coins: [[5, 15], [27, 15]],
    creatures: [['jpLanternGhost', 14, 15, 1]],
    items: [],
  }, 'platform', 1);
}

// ---- G KOI POLLOI: the temple garden: sakura, the temple and its bell, a raked bank, the zig-zag bridge over the pond, the pergola
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '1'); g.fill(28, 0, 30, 2, '.'); g.fill(0, 3, 1, 13, '1');
  g.fill(0, 14, 16, 19, '1'); g.fill(4, 14, 6, 19, '.'); g.fill(27, 14, 31, 19, '1'); g.fill(31, 11, 31, 13, '.');
  g.fill(17, 15, 26, 19, '3'); // the pond
  g.fill(17, 14, 18, 14, '4'); g.fill(20, 13, 21, 13, '4'); g.fill(23, 14, 24, 14, '4'); g.fill(25, 13, 26, 13, '4'); // the zig-zag planks
  g.fill(27, 12, 28, 13, '1'); g.fill(29, 10, 31, 10, '6'); g.fill(29, 0, 29, 9, '7'); g.fill(5, 14, 5, 19, '7'); // the step, the pergola, the ropes
  g.fill(2, 14, 3, 14, '2'); g.fill(7, 14, 15, 14, '2'); // the raked gravel
  write({
    name: 'KOI POLLOI', nameCol: 11,
    codes: [['jpMoss', 5], ['jpGravel', 15], ['jpWater', 14], ['jpPlank', 2], ['jpTrail', 9], ['jpTimber', 9], ['jpBamboo', 5], ['jpEave', 14]],
    grid: g,
    decor: [['jpSakura', 2, 8], ['jpShrine', 8, 11], ['jpBell', 12, 10], ['jpToro', 14, 11], ['jpToro', 27, 9], ['jpPine', 21, 3]],
    coins: [[10, 6], [24, 11]],
    creatures: [['jpKoi', 18, 11, 1], ['jpKoi', 22, 9, 1], ['jpTanuki', 9, 12, 1], ['jpUmbrella', 5, 10, 1]],
    items: [],
  }, 'garden', 14);
}

// ---- I SHOGUN AND ON: the castle's gate hall: plaster walls and timber, three pairs of paper doors (open, shaking, shut), the guard
{
  const g = new Grid();
  g.fill(0, 0, 31, 3, '4'); g.fill(3, 0, 5, 3, '.'); // the timber ceiling, the hole for the rope up
  g.fill(0, 4, 31, 5, '3'); g.fill(0, 12, 31, 13, '3'); // the back wall's bands, behind him
  g.fill(0, 4, 1, 10, '1'); g.fill(30, 4, 31, 13, '1'); // the front walls at the ends (the gate is the left opening)
  g.fill(0, 14, 27, 14, '2'); g.fill(31, 14, 31, 14, '2'); g.fill(0, 15, 31, 19, '1'); g.fill(28, 14, 30, 19, '.'); g.fill(29, 14, 29, 19, '8');
  g.fill(4, 4, 4, 13, '8'); // the rope up (col 4)
  for (const [x, code] of [[8, '7'], [15, '6'], [22, '5']] as const) { g.fill(x, 4, x + 1, 10, '4'); g.fill(x, 11, x + 1, 13, code); } // the doors
  write({
    name: 'SHOGUN AND ON', nameCol: 9,
    codes: [['jpStoneWall', 12], ['jpTatami', 7], ['jpWallBack', 11], ['jpTimber', 9], ['jpShojiShut', 1], ['jpShojiWarn', 7], ['jpShojiOpen', 9], ['jpBamboo', 5]],
    grid: g,
    decor: [['jpScroll', 11, 7], ['jpScroll', 18, 7], ['jpScroll', 25, 7], ['jpLantern', 6, 6], ['jpLantern', 13, 6], ['jpLantern', 20, 6]],
    coins: [[3, 9], [11, 10]],
    creatures: [['jpSamurai', 25, 12, 1], ['jpNinja', 18, 12, 1]],
    items: [],
  }, 'castle', 7);
}

// ---- THE LAST MOLE: moonlit pond, six stepping stones, a bonsai, the stone dragon behind, the shrine with the hood
{
  const g = new Grid();
  g.fill(0, 0, 31, 2, '1'); g.fill(28, 0, 30, 2, '.'); g.fill(0, 3, 0, 13, '1'); g.fill(31, 3, 31, 13, '1');
  g.fill(0, 14, 4, 19, '1'); g.fill(27, 14, 31, 19, '1'); g.fill(28, 14, 30, 19, '.'); g.fill(29, 0, 29, 19, '5');
  g.fill(5, 15, 26, 19, '2'); // the pond
  for (const [c, row] of [[5, 14], [9, 13], [13, 14], [17, 12], [21, 13], [25, 14]] as const) g.fill(c, row, c + 1, row, '3'); // the stones
  write({
    name: 'THE LAST MOLE', nameCol: 9,
    codes: [['jpMoss', 5], ['jpWater', 14], ['jpStone', 12], ['jpTimber', 9], ['jpBamboo', 5]],
    grid: g,
    decor: [['jpMoon', 18, 3], ['jpDragon', 12, 8], ['jpShrine', 1, 11], ['jpBonsai', 5, 12], ['jpToro', 26, 11]],
    coins: [[22, 9]],
    creatures: [['jpKoi', 11, 11, 1], ['jpCrane', 22, 4, 1]],
    items: [['jpHood', 2, 10]],
  }, 'last-mole', 3);
}
