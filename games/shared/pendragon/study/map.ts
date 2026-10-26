/**
 * Pendragon's pictures in the four games, by what he is doing, and the Dragonskulle picture each would become. Numbers are the
 * pictures' numbers in `collect.ts`'s output (first seen first; the defaults: 150 bursts of 900 frames, Entombed's 53 starts and 3000
 * frames; `atlas.ts` draws them numbered). Facings: R, L, U (up the screen), D.
 */

import { DIRS, type Dir } from '../figure';
export { DIRS, type Dir };
type ByDir = Record<Dir, number[]>;

interface PendragonSet {
  game: string;
  /** His own colour and the two he shares (colour registers) as the game sets them. */
  colours: [number, number, number];
  stand: Record<Dir, number>;
  /** The walk, one step (two frames) at a time, round once: the stand picture shows twice in it (a step each side). */
  walk: ByDir;
  /** A jump: two pictures a way (take-off, then the held one). */
  jump?: ByDir;
  /** What he strikes or throws with, a way, and what it is. */
  strike?: { what: string; frames: ByDir };
  /** Digging (every way the same). */
  dig?: number[];
  /** Pictures that are not a pose: his death, the dark room, a cloak. */
  other: { what: string; ids: number[] }[];
}

export const KARNATH: PendragonSet = {
  game: 'karnath', colours: [7, 10, 6],
  stand: { R: 34, L: 8, U: 2, D: 43 },
  walk: {
    R: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 55, 56, 34, 57, 58, 59, 60],
    L: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 8, 26, 27, 28, 29],
    U: [3, 0, 2, 16, 17, 18, 19, 20, 21, 2, 22, 23, 24, 25],
    D: [41, 42, 43, 44, 45, 46, 47, 48, 49, 43, 50, 51, 52, 53],
  },
  strike: { what: 'casting (the arm raised, held while the spell flies)', frames: { R: [40], L: [54], U: [1], D: [61] } },
  other: [{ what: 'his death: a slit, 1-2 pixels wide, in all sixteen colours', ids: Array.from({ length: 255 }, (_, i) => 62 + i) }],
};

export const ENTOMBED: PendragonSet = {
  game: 'entombed', colours: [7, 10, 6],
  stand: { R: 0, L: 11, U: 39, D: 28 },
  walk: {
    R: [14, 15, 16, 0, 22, 23, 24, 69, 70, 71, 0, 72, 73, 74, 117],
    L: [6, 7, 18, 11, 19, 20, 21, 80, 81, 82, 11, 83, 84, 85, 86],
    U: [37, 38, 39, 40, 41, 42, 51, 52, 39, 53, 54, 55, 56],
    D: [26, 27, 28, 29, 30, 31, 89, 90, 28, 91, 92, 93, 34],
  },
  jump: { R: [1, 2], L: [10, 12], U: [59, 60], D: [47, 48] },
  strike: { what: 'the whip (two pictures: out, held)', frames: { R: [3, 4], L: [8, 9], U: [43, 44], D: [32, 33] } },
  other: [
    { what: 'his death: a ghost rising, yellow', ids: [106, 107] },
    { what: 'a dark chamber: he is drawn black but for his face and hands (own colour 0)', ids: [169, 170, 171, 172, 173, 174, 175, 176] },
  ],
};

export const BLACKWYCHE: PendragonSet = {
  game: 'blackwyche', colours: [10, 12, 0],
  stand: { R: 12, L: 27, U: 1, D: 5 },
  walk: {
    R: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 12, 19, 20, 21, 22],
    L: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 27, 34, 39, 40, 41],
    U: [37, 0, 1, 52, 53, 54, 55, 56, 1, 57, 58, 59, 60],
    D: [3, 4, 5, 6, 7, 64, 65, 66, 5, 67, 68, 72, 73],
  },
  jump: { R: [77, 78], L: [75, 76], U: [121, 122], D: [88, 89] },
  strike: { what: 'the sword (arms up, then out; sprite 3 draws the blade)', frames: { R: [43, 44, 45, 46], L: [105, 106, 107, 108, 109], U: [112, 113, 114, 115], D: [90, 91, 92, 118] } },
  other: [],
};

export const DRAGONSKULLE: PendragonSet = {
  game: 'dragonskulle', colours: [10, 5, 0],
  stand: { R: 35, L: 20, U: 2, D: 6 },
  walk: {
    R: [32, 33, 34, 35, 43, 44, 45, 46, 47, 48, 35, 49, 50, 51, 52],
    L: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 20, 27, 28, 29, 30],
    U: [37, 1, 2, 39, 54, 55, 56, 57, 2, 58, 59, 60, 61],
    D: [4, 5, 6, 7, 8, 9, 10, 11, 6, 12, 13, 14, 15],
  },
  jump: { R: [88, 89], L: [84, 85], U: [80, 81], D: [111, 112] },
  strike: { what: 'throwing the stone (the arm out, three pictures)', frames: { R: [65, 66, 67], L: [107, 108, 109], U: [72, 73, 74], D: [101, 102, 103] } },
  dig: [114, 115, 116],
  other: [],
};

export const SETS: Record<string, PendragonSet> = { karnath: KARNATH, entombed: ENTOMBED, blackwyche: BLACKWYCHE, dragonskulle: DRAGONSKULLE };

/** One picture of the original and what stands in for it: a Dragonskulle picture, and whether that is a new picture still to draw (the stand-in is the nearest he has). */
interface Swap { dir: Dir; role: string; ds: number; newFrame: boolean }

/** The walk's pictures cut at its stand pictures: runs of steps. */
function runs(cycle: readonly number[], stand: number): number[][] {
  const out: number[][] = [[]];
  for (const id of cycle) { if (id === stand) out.push([]); else out[out.length - 1].push(id); }
  return out.filter((r) => r.length > 0);
}

/** Where `id` is in a list, as a position among `n` in the other. */
const scaled = (k: number, n: number, m: number) => Math.min(m - 1, Math.floor((k * m) / n));

/** The Dragonskulle picture each picture of `from` becomes (by what he is doing and the way he faces); the pictures with no counterpart are not in it. */
export function swapsFor(from: PendragonSet, to: PendragonSet = DRAGONSKULLE): Map<number, Swap> {
  const out = new Map<number, Swap>();
  for (const d of DIRS) {
    out.set(from.stand[d], { dir: d, role: 'stand', ds: to.stand[d], newFrame: false });
    // walking: each run of steps to the other's run (the same number of runs; they differ in length in Karnath)
    const a = runs(from.walk[d], from.stand[d]), b = runs(to.walk[d], to.stand[d]);
    a.forEach((run, ri) => {
      const target = b[Math.min(ri, b.length - 1)];
      run.forEach((id, k) => { if (!out.has(id)) out.set(id, { dir: d, role: `walk ${ri + 1}.${k + 1}`, ds: target[scaled(k, run.length, target.length)], newFrame: false }); });
    });
    from.jump?.[d].forEach((id, k) => out.set(id, { dir: d, role: 'jump', ds: must(to.jump)[d][Math.min(k, 1)], newFrame: false }));
    const s = from.strike?.frames[d], t = to.strike?.frames[d];
    if (s && t) s.forEach((id, k) => out.set(id, { dir: d, role: `strike ${k + 1}/${s.length}`, ds: t[scaled(k, s.length, t.length)], newFrame: true }));
  }
  return out;
}

function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error('missing picture set');
  return v;
}
