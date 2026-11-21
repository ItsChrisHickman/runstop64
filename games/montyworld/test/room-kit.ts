/**
 * Mock rooms drawn with a region's new art, in Monty on the Run's own terms (32 x 20 playfield, 8 tile codes a room with a colour each,
 * decorations from character $9B up, creatures at their cells, its score row and place name) so the art can be judged in place. Not the
 * game's rooms (the pre-production has none): a way to look. The same for every region; `art-rooms.ts` is the Moscow one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { COIN_CHAR } from '../../shared/monty/screen';
import type { NewCreature, NewDecor, NewItem, NewTile } from '../src/art/types';
import type { Worn } from '../src/art/costume';
import { Canvas, drawMotrRoom, Screen } from './preview-kit';

export interface RoomArt {
  readonly tiles: Readonly<Record<string, NewTile>>;
  readonly decor: Readonly<Record<string, NewDecor>>;
  readonly creatures: Readonly<Record<string, NewCreature>>;
  readonly sprites: Readonly<Record<string, NewItem>>;
}

/** The room's 32 x 20 cells, painted with rectangles of a tile code. */
export class Grid {
  private readonly cells = Array.from({ length: 20 }, () => Array.from({ length: 32 }, () => '.'));
  fill(c0: number, r0: number, c1: number, r1: number, code: string) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const row = this.cells[r]; if (row) row[c] = code; }
  }
  has(c: number, r: number) { return (this.cells[r]?.[c] ?? '.') !== '.'; }
  rows(): string[] { return this.cells.map((r) => r.join('')); }
}

/** Where a thing goes: a cell, or a pixel in the playfield (a sprite that is not on the grid: a canopy, a vine). */
export type At = { readonly col: number; readonly row: number } | { readonly x: number; readonly y: number };

export interface MockRoom {
  readonly name: string;
  readonly nameCol: number;
  /** the tile for codes 1-8 and its colour (the tile's own unless given) */
  readonly codes: readonly (readonly [string, number?])[];
  readonly grid: Grid;
  readonly decor: readonly (readonly [string, col: number, row: number, colour?: number])[];
  readonly coins: readonly (readonly [number, number])[];
  readonly creatures: readonly (readonly [string, col: number, row: number, frame: number, colour?: number])[];
  /** Items and other sprite blocks (at a cell's top left, or a playfield pixel), and Monty's pictures by pointer. */
  readonly items: readonly (readonly [string | NewItem, At])[];
  readonly monty?: readonly { readonly ptr: number; readonly at: At; readonly worn?: Worn; readonly hat?: number }[];
}

const cellX = (a: At) => ('col' in a ? (4 + a.col) * 8 : 32 + a.x);
const cellY = (a: At) => ('row' in a ? (3 + a.row) * 8 : 24 + a.y);

/** Paint a room onto the canvas, its top left at ox. Returns the decoration characters it takes. */
export function paint(room: MockRoom, art: RoomArt, cv: Canvas, ox: number): number {
  if (room.codes.length > 8) throw new Error(`${room.name}: more than 8 tile codes`);
  const need = (what: string, rec: Readonly<Record<string, unknown>>, k: string) => { if (!(k in rec)) throw new Error(`${room.name}: no ${what} named ${k}`); };
  const s = new Screen();
  s.tiles(room.codes.map(([t]) => { need('tile', art.tiles, t); return art.tiles[t]?.chr ?? new Uint8Array(8); }));
  s.playfield(room.grid.rows(), room.codes.map(([t, c]) => c ?? art.tiles[t]?.colour ?? 1));
  let next = 0x9b;
  const first = new Map<string, number>(); // a type's characters are shared by every place it is used in the room
  for (const [piece, col, row, tint] of room.decor) {
    need('decoration', art.decor, piece);
    const d = art.decor[piece];
    if (d === undefined) continue;
    for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
      if (room.grid.has(col + c, row + r)) throw new Error(`${room.name}: ${piece} sits on a tile at ${col + c},${row + r}`);
    }
    const colour = tint ?? d.colour;
    const at = first.get(piece);
    if (at === undefined) {
      first.set(piece, next);
      next = s.decor(d.chr, d.w, d.h, colour, 4 + col, 3 + row, next);
    } else {
      for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
        s.put(4 + col + c, 3 + row + r, at + r * d.w + c, typeof colour === 'number' ? colour : colour[r * d.w + c] ?? 1);
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
    need('creature', art.creatures, name);
    const c = art.creatures[name];
    if (c) cv.enemyFrame(c.frames, frame * 32, ox + (4 + col) * 8, (3 + row) * 8, colour ?? c.colour);
  }
  for (const [what, at] of room.items) {
    if (typeof what !== 'string') { cv.spriteBlock(what.block, ox + cellX(at), cellY(at), what.colour); continue; }
    need('sprite', art.sprites, what);
    const it = art.sprites[what];
    if (it) cv.spriteBlock(it.block, ox + cellX(at), cellY(at), it.colour);
  }
  for (const m of room.monty ?? []) {
    const x = ox + cellX(m.at), y = cellY(m.at);
    drawMonty(cv, m.ptr, x, y, m.worn, m.hat);
  }
  return next - 0x9b;
}

/** Monty's picture `ptr` at x, y (white, as he is in the game's pictures), in a costume if given. */
export function drawMonty(cv: Canvas, ptr: number, x: number, y: number, worn?: Worn, hatColour = 1) {
  const own = worn?.monty.find((m) => m.ptr === ptr)?.block ?? bankImage.subarray(ptr * 64, ptr * 64 + 63);
  cv.spriteBlock(own, x, y, 1);
  const over = worn?.hat.find((h) => h.ptr === ptr);
  if (over) cv.spriteBlock(over.block, x + over.dx, y + over.dy, hatColour);
}

/** Write a room alone, and beside one of Monty on the Run's rooms (the room's own at the left, the original's at the right). */
export function write(out: string, art: RoomArt, room: MockRoom, file: string, motr: number) {
  fs.mkdirSync(out, { recursive: true });
  const alone = new Canvas();
  const chars = paint(room, art, alone, 0);
  alone.png(path.join(out, `room-${file}.png`), 3);
  const both = new Canvas(648, 200);
  paint(room, art, both, 0);
  drawMotrRoom(both, motr, 328, 0);
  both.png(path.join(out, `compare-${file}.png`), 3);
  console.log(`${room.name}: ${chars} decoration characters of 101, ${room.codes.length} tile codes of 8`);
}
