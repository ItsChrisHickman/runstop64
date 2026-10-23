import { C64View, Surface, TRANSPARENT, type Renderer } from 'c64kit';
import { captureShot, recordFigure, recordPictures, type Figure, type SpriteShot } from '../../shared/ending/figures';
import { arrive, fromState, type Bases } from './stage';
import type { Game } from './game';
import { rowAt } from './rooms';
import { roomSpriteList } from './setup';
import { V } from './vars';
import type { Base } from './ending-scenes';

/**
 * The cast that walks through the montage, as the engine draws it: each creature as the game shows it going its way, recorded in the first room it
 * appears in (Tal not there to be met: his sprites off), frame by frame, so the visitors show the game's own frames at the pace
 * it showed them. Most are sprites ($C0-$DB: the list at $CA16 of each room); three (the monkeys in the trees, the dragons'
 * heads, the machine gunners) the game draws with characters, animated by changing the characters' shapes ($06BC), so they are
 * recorded from the picture, cell by cell.
 */

/** Frames a creature is recorded for (after a moment for it to appear): more than its animation takes round. */
const RECORDED = 80, SETTLE = 40;

/** The cast, in order: sprites by animation number ($C0-$DB), pictures by the animation of characters ($06BC). Tal is not in it: he is in every place, on foot or in the armour. */
export type Member =
  | { name: string; sprites: readonly number[] }
  | { name: string; chars: number; room: number };

/** Names the C64-Wiki gives (the monkey, the dragon, the gunman, the acid drop, the energy barrier, the teleporter, the recharge cell, the four parts); where it gives none, ours, plain: what it is or looks like. */
export const CAST: readonly Member[] = [
  { name: 'SAUCER', sprites: [0xc7] },
  { name: 'BROWN MUTANT', sprites: [0xcb] },
  { name: 'PURPLE MUTANT', sprites: [0xcd] },
  { name: 'BLUE ORB', sprites: [0xd0] },
  { name: 'ACID DROP', sprites: [0xd4] },
  { name: 'BAT', sprites: [0xd7] },
  { name: 'SPIDER', sprites: [0xd9] },
  { name: 'GREEN BUG', sprites: [0xda] },
  { name: 'MONKEY', chars: 0x00, room: 0x2a },
  { name: 'DRAGON', chars: 0x03, room: 0x05 },
  { name: 'GUNMAN', chars: 0x09, room: 0x1e },
  { name: 'ENERGY BARRIER', sprites: [0xc9, 0xca] },
  { name: 'TELEPORTER', sprites: [0xd3] },
  { name: 'RECHARGE CELL', sprites: [0xc6] },
  { name: 'PULSAR BEAM', sprites: [0xc2] },
  { name: 'PARTICLE NEGATOR', sprites: [0xc3] },
  { name: 'GRAVITY DISPLACER', sprites: [0xc4] },
  { name: 'IMPLOSION MINE', sprites: [0xc5] },
];

/** The states the places begin from. */
const BASES: readonly Base[] = ['new', 'suited', 'worn'];

/** A creature of the sprite list: the room it first appears in, and its sprite there. */
export function firstSeen(g: Game, anim: number): { room: number; sprite: number } | null {
  for (let room = 0; room < 69; room++) {
    const found = roomSpriteList(g, room).find((s) => s.anim === anim);
    if (found) return { room, sprite: found.sprite };
  }
  return null;
}

/** A game in a room with Tal's sprites off (nothing he can meet; the creature goes its way). */
function emptyRoom(bases: Bases, room: number): Game {
  const g = fromState(bases.get('new'));
  arrive(g, { room, x: 0x40, y: 0x30 });
  return g;
}

/** One frame of a game left to itself, Tal's sprites off. */
function idleFrame(g: Game) {
  g.ram[V.spriteEnable] &= 0xfc;
  g.m.joy1 = 0x1f; g.m.joy2 = 0x1f; g.m.keys = [];
  g.tick();
}

/** The sprites of the creature (by animation number) as the game shows them. */
function recordSprites(bases: Bases, name: string, anims: readonly number[]): Figure | null {
  const probe = fromState(bases.get('new'));
  const seen = anims.map((a) => firstSeen(probe, a));
  const first = seen[0];
  if (!first || seen.some((s) => !s || s.room !== first.room)) return null;
  const sprites = seen.map((s) => (s ? s.sprite : 0));
  const g = emptyRoom(bases, first.room);
  const moments: SpriteShot[][] = [];
  for (let f = 0; f < SETTLE + RECORDED; f++) {
    idleFrame(g);
    if (f < SETTLE || g.ram[V.room] !== first.room) continue;
    // (there to be seen: running, not appearing, not blowing up)
    if (!sprites.every((n) => g.ram[V.anim + n] & 0x80 && !(g.ram[V.dying + n] & 0x80) && !(g.ram[V.appearing + n] & 0x80))) continue;
    const shots = g.m.capture.sprites.filter((s) => sprites.includes(s.n)).map(captureShot);
    if (shots.length === sprites.length) moments.push(shots);
  }
  return recordFigure(name, moments);
}

/** The characters a character animation changes the shapes of ($06BC): their codes. */
function animChars(g: Game, anim: number): { lo: number; hi: number } {
  const p = g.word(0x06bc + ((anim << 1) & 0xff));
  const to = g.ram[p + 4] | (g.ram[p + 5] << 8), count = g.ram[p + 2];
  const lo = (to - 0x7800) >> 3;
  return { lo, hi: lo + count - 1 };
}

/** A creature the game draws with characters, cropped from the picture (only the cells whose shapes the animation changes: the tree it hangs from stays out). */
function recordChars(renderer: Renderer, bases: Bases, name: string, anim: number, room: number): Figure | null {
  const g = emptyRoom(bases, room);
  const view = new C64View(renderer, g.m);
  const { lo, hi } = animChars(g, anim);
  const pictures: (Surface | null)[] = [];
  for (let f = 0; f < SETTLE + RECORDED; f++) {
    idleFrame(g);
    if (f < SETTLE || g.ram[V.room] !== room) continue;
    view.update();
    const { fore, back } = view.picture;
    const cells: { row: number; col: number }[] = [];
    for (let row = 0; row < 16; row++) for (let col = 0; col < 40; col++) {
      const code = g.ram[rowAt(g, row) + col];
      if (code >= lo && code <= hi) cells.push({ row, col });
    }
    if (!cells.length) { pictures.push(null); continue; }
    const row0 = Math.min(...cells.map((c) => c.row)), col0 = Math.min(...cells.map((c) => c.col));
    const rows = Math.max(...cells.map((c) => c.row)) - row0 + 1, cols = Math.max(...cells.map((c) => c.col)) - col0 + 1;
    const flat = new Surface(cols * 8, rows * 8, TRANSPARENT);
    for (const { row, col } of cells) {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const at = (row * 8 + y) * 320 + col * 8 + x;
        const c = fore[at] === TRANSPARENT ? back[at] : fore[at];
        // (the background is no part of it)
        if (c !== 0) flat.pixels[((row - row0) * 8 + y) * flat.width + (col - col0) * 8 + x] = c;
      }
    }
    pictures.push(flat);
  }
  view.dispose();
  return recordPictures(name, pictures);
}

/**
 * The cast's figures, each made when asked for (the show makes them in one go as it begins, in its black first moment: the
 * states the places begin from are made then too, so no place has to make one as it opens).
 */
export function antiriadCast(renderer: Renderer, bases: Bases): (() => Figure | null)[] {
  return CAST.map((m, i) => (): Figure | null => {
    if (i === 0) for (const base of BASES) bases.get(base);
    if ('sprites' in m) return recordSprites(bases, m.name, m.sprites);
    return recordChars(renderer, bases, m.name, m.chars, m.room);
  });
}
