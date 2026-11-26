/**
 * The waterfalls' motion (the Road to Hana's two cascades and the sea cave's): the cascade is a decoration two characters wide and five tall (pacific-decor.ts `pacWaterfall`: the lip, three rows of streaks, the pool),
 * and these are the pictures its characters take as the room runs (a `charAnims` cycle, charanim.ts): the streaks fall, and the splash at the foot throws up its spray and mist.
 * The streaks repeat every 8 pixels down their three rows (24 pixels), so a roll of them by any number of pixels joins up.
 */
import { characters } from './pixels';
import { Raster } from './raster';

/** The three rows of streaks as pixels (`w` wide, 24 tall) rolled down `k` pixels: a streak every four pixels across, each a bar of five lit pixels in eight, staggered. */
export function streakRows(k: number, w = 16): string[] {
  const r = new Raster(w, 24);
  for (let i = 0; 3 + i * 4 < w - 2; i++) {
    const x = 3 + i * 4, phase = (i * 3) & 7;
    for (let y = 0; y < 24; y++) if (((y + k + phase) & 7) < 5) { r.set(x, y); r.set(x + 1, y); }
  }
  return r.rows();
}

/** The streaks' frames: the six characters (two across, three down: the cascade's cells 2-7) at eight rolls, a roll of 3 pixels a frame. */
export const STREAK_FRAMES: readonly Uint8Array[] = Array.from({ length: 8 }, (_, i) => characters(`falls streaks ${i}`, streakRows((i * 3) & 7), 2, 3));

/** The splash at the foot (the cascade's cells 8 and 9: a row of two characters, 16 by 8 pixels): foam on the pool and spray and mist thrown up, four pictures. */
export function splashRows(frame: number): string[] {
  const r = new Raster(16, 8);
  r.ellipse(4, 6, 4.4, 1.6); r.ellipse(11.5, 6, 4.6, 1.6); r.rect(2, 7, 13, 7); // the foam on the pool
  const drops: readonly (readonly [number, number])[][] = [
    [[2, 3], [7, 2], [12, 3], [5, 0], [10, 1]],
    [[1, 2], [6, 0], [13, 2], [4, 3], [9, 3]],
    [[3, 1], [8, 3], [11, 0], [14, 3], [0, 3]],
    [[2, 0], [7, 3], [12, 1], [5, 2], [10, 0]],
  ];
  for (const [x, y] of drops[frame] ?? []) r.set(x, y);
  return r.rows();
}
export const SPLASH_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((i) => characters(`falls splash ${i}`, splashRows(i), 2, 1));

/** Akaka Falls' plunge is three characters wide (pacific-scenery.ts `pacPlunge`): its streaks, a block of three rows at a time, and its splash, two splashes side by side across its foot. */
export const PLUNGE_COLS = 3;
export function plungeSplashRows(frame: number): string[] {
  const r = new Raster(PLUNGE_COLS * 8, 8);
  r.stamp(splashRows(frame), 0, 0); r.stamp(splashRows((frame + 2) & 3), 8, 0);
  return r.rows();
}
export const PLUNGE_STREAK_FRAMES: readonly Uint8Array[] = Array.from({ length: 8 }, (_, i) => characters(`plunge streaks ${i}`, streakRows((i * 3) & 7, PLUNGE_COLS * 8), PLUNGE_COLS, 3));
export const PLUNGE_SPLASH_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((i) => characters(`plunge splash ${i}`, plungeSplashRows(i), PLUNGE_COLS, 1));

/** A rise of bubbles (the reefs' decoration `pacBubbles`, one character wide and two tall: three rings, small to large), each ring `k` pixels higher and coming round at the foot again: eight pictures, a roll of 2 pixels each. */
export function bubbleRows(k: number): string[] {
  const base = new Raster(8, 16);
  base.ring(4, 12, 1.5, 1); base.ring(3, 7, 2, 1); base.ring(4.5, 2, 2, 1);
  const r = new Raster(8, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (base.get(x, y)) r.set(x, (((y - 2 * k) % 16) + 16) % 16);
  return r.rows();
}
export const BUBBLE_FRAMES: readonly Uint8Array[] = Array.from({ length: 8 }, (_, k) => characters(`bubbles ${k}`, bubbleRows(k), 1, 2));
