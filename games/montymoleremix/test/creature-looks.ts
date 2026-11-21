/**
 * A creature is one look going either way. The remix draws Wanted's creatures as Monty on the Run's (or its own frames); a creature has four frames
 * for going up and left and four for going down and right, and each must be the same picture as the others (the same, or turned round), never a
 * different one: the knight, the hand and the plane (whose second four are a tow banner) used to change into another creature when they turned.
 * For every creature of every room, the frames of each direction are compared. With an out-dir: a strip of every creature both ways.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/creature-looks.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { check, finish } from '../../shared/test/check';
import { creaturePtr } from '../src/game';
import { newGame } from './harness';

const out = process.argv[2];
const g = newGame().g;

/** A creature's frame as rows of 16 pixels (a row of the sprite is three bytes, the first two used). */
const rowsOf = (slot: number, frame: number): string[] => {
  const base = (creaturePtr(slot) + frame) * 64;
  return Array.from({ length: 16 }, (_, r) => ((g.mem[base + r * 3] ?? 0) * 256 + (g.mem[base + r * 3 + 1] ?? 0)).toString(2).padStart(16, '0'));
};
const turned = (rows: readonly string[]): string[] => rows.map((r) => [...r].reverse().join(''));
const same = (a: readonly string[], b: readonly string[]): boolean => a.every((r, i) => r === b[i]);

const bad: string[] = [];
let creatures = 0, mirrored = 0;
const strip: string[][][] = [];
for (const [room] of ROOMS.entries()) {
  g.roomId = room;
  g.loadRoom();
  g.creatures.forEach((_, slot) => {
    if (g.creatureType[slot] === null) return;
    creatures++;
    let how: 'same' | 'mirror' | null = null;
    for (let f = 0; f < 4; f++) {
      const going = rowsOf(slot, f), coming = rowsOf(slot, 4 + f);
      const now = same(going, coming) ? 'same' : same(turned(going), coming) ? 'mirror' : null;
      if (now === null || (how !== null && how !== now && now !== 'same')) { bad.push(`room ${room} creature ${slot} frame ${f}: going and coming are not one look`); break; }
      if (now === 'mirror') how = 'mirror';
    }
    if (how === 'mirror') mirrored++;
    const frames = [0, 1, 2, 3, 4, 5, 6, 7].map((f) => rowsOf(slot, f));
    if (!strip.some((s) => s.every((rows, f) => same(rows, frames[f] ?? [])))) strip.push(frames); // (each look once)
  });
}
check(`every creature of the ${ROOMS.length} rooms (${creatures}, ${mirrored} drawn turned round, the rest the same picture) is one look both ways${bad.length ? `: ${bad.slice(0, 5).join('; ')}` : ''}`, creatures > 60 && bad.length === 0);

if (out !== undefined) {
  fs.mkdirSync(out, { recursive: true });
  const W = 8 * 18, H = 17;
  const px = new Uint8Array(W * H * strip.length);
  strip.forEach((frames, n) => frames.forEach((rows, f) => rows.forEach((row, r) => [...row].forEach((c, x) => { if (c === '1') px[(n * H + r) * W + f * 18 + x] = f < 4 ? 1 : 7; }))));
  indicesPng(path.join(out, 'creatures-both-ways.png'), px, W, H * strip.length, 3);
}
finish();
