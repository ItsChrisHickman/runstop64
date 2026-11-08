import type { Game } from './game';
import { Screen, cellAt } from './screen';
import { rom } from './data';

/**
 * ENHANCED's bag (`Game.bag`): BLOB carries any number of things, and picking up never drops or swaps one. The original's four places
 * ($D9-$DC, `Game.carried`) are the panel's slots: they hold the four latest things, the newest first; the older ones are in
 * `Game.stash` (newest first too), and the panel shows how many with "+n". Everything here is called only with the bag on, so the
 * original's four places and its code are as they were with it off.
 */

/** A place of `carried` holding something ($80 and up: nothing, or a piece put back in the core). */
export const live = (c: number) => !(c & 0x80);

/** Everything BLOB carries, newest first: the panel's places, then the stash. */
export const all = (g: Game): number[] => [...g.carried.filter(live), ...g.stash];

/** Everything BLOB carries as the game in this mode counts it: the bag's, or (ORIGINAL) the four places'. */
export const held = (g: Game): number[] => (g.bag() ? all(g) : g.carried.filter(live));

/** Lay a list (newest first) out again: the four newest in the panel's places, the rest in the stash. */
export function settle(g: Game, list: readonly number[]) {
  for (let i = 0; i < g.carried.length; i++) g.carried[i] = list[i] ?? 0x80;
  g.stash.splice(0, g.stash.length, ...list.slice(g.carried.length));
}

/** A thing picked up: the newest, and the oldest of the four goes to the stash. */
export const add = (g: Game, graphic: number) => settle(g, [graphic, ...all(g)]);

/** One of this thing is given up (a piece goes into the core): the ones behind it come forward. */
export function remove(g: Game, graphic: number): boolean {
  const list = all(g), i = list.indexOf(graphic);
  if (i < 0) return false;
  list.splice(i, 1);
  settle(g, list);
  return true;
}

/** A thing carried is swapped for another (a Cheops trade), in its place. */
export function swap(g: Game, graphic: number, other: number) {
  const list = all(g), i = list.indexOf(graphic);
  if (i < 0) list.unshift(other); else list[i] = other;
  settle(g, list);
}

// ---- the panel: "+n" for what the four places don't show ------------------------------------------------------------------

/** Where "+n" goes: three cells of the panel's row 4, over the track between its two arrows (what was there comes back when it goes). */
export const MORE = { col: 31, row: 4, cells: 3 } as const;

/** The game's lettering has no plus: this one is drawn in its style (the digits' strokes). */
const PLUS = [0x00, 0x18, 0x18, 0x7e, 0x7e, 0x18, 0x18, 0x00] as const;
/** The digits of the game's lettering ($39B1: '0' is at $C9CC + $20). */
const digit = (d: number) => 0xc9cc + 0x20 + d * 8;

/**
 * $2B5A, then: the count of what the four places don't show, "+n", over the panel's track between the arrows; gone (the track
 * as it was) when there is nothing more. Draws only when the count changed, so it is as cheap as the panel's slots.
 */
export function drawMore(g: Game) {
  const n = g.bag() ? Math.min(g.stash.length, 99) : 0;
  if (n === g.moreShown) return;
  const s = g.scr, cells = Array.from({ length: MORE.cells }, (_, i) => cellAt(MORE.col, MORE.row) + i);
  if (n === 0) {
    cells.forEach((cell, i) => {
      const at = i * 9, bm = Screen.bitmapAt(cell);
      for (let y = 0; y < 8; y++) s.bank[(bm + y) & 0x3fff] = g.moreBehind[at + y] ?? 0;
      s.setColour(cell, g.moreBehind[at + 8] ?? 0);
    });
    g.moreBehind.length = 0;
    g.moreShown = 0;
    return;
  }
  if (g.moreShown === 0) {
    g.moreBehind.length = 0;
    for (const cell of cells) {
      const bm = Screen.bitmapAt(cell);
      for (let y = 0; y < 8; y++) g.moreBehind.push(s.bank[(bm + y) & 0x3fff]);
      g.moreBehind.push(s.colour(cell));
    }
  }
  // (the text black on the track's cyan: the cell's two colours the other way round, as the arrows are drawn)
  const glyphs: (readonly number[])[] = [PLUS, ...String(n).split('').map((d) => Array.from({ length: 8 }, (_, y) => rom(digit(Number(d)) + y)))];
  cells.forEach((cell, i) => {
    const bm = Screen.bitmapAt(cell), g8 = glyphs[i] ?? [0, 0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < 8; y++) s.bank[(bm + y) & 0x3fff] = g8[y];
    const was = g.moreBehind[i * 9 + 8];
    s.setColour(cell, ((was & 0x0f) << 4) | (was >> 4));
  });
  g.moreShown = n;
}
