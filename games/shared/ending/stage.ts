import { Surface, TRANSPARENT, type Rect } from 'c64kit';

/**
 * The stage of a place: the part of the 320 x 200 picture the game really shows of the room (the VIC's border covers the first 7
 * columns of pixels and the last 9 in 38-column mode, and a game's frame art and panel are not the room). The cast walks in on it
 * and out of it: whatever of a creature lies outside is cut off, as the border cuts a game's own sprites.
 */
export type Stage = Rect;

/** No frame: the whole picture. */
export const WHOLE: Stage = { x: 0, y: 0, w: 320, h: 200 };

/** A part of a picture, as it is drawn: a surface and where its top left goes. */
export interface Cut { surface: Surface; x: number; y: number }

/**
 * The part of `src` (drawn with its top left at x, y) that lies on the stage, or null if none does. A part wholly on it is itself;
 * one that is half out is cut into `spare` (made, or made again if it is not the size, and handed back for the next frame).
 */
export function cutTo(src: Surface, x: number, y: number, stage: Stage, spare: Surface | null): { cut: Cut | null; spare: Surface | null } {
  const left = Math.max(0, stage.x - x), top = Math.max(0, stage.y - y);
  const right = Math.min(src.width, stage.x + stage.w - x), bottom = Math.min(src.height, stage.y + stage.h - y);
  if (right <= left || bottom <= top) return { cut: null, spare };
  if (left === 0 && top === 0 && right === src.width && bottom === src.height) return { cut: { surface: src, x, y }, spare };
  const w = right - left, h = bottom - top;
  const into = spare && spare.width === w && spare.height === h ? spare : new Surface(w, h, TRANSPARENT);
  into.palette = src.palette;
  for (let row = 0; row < h; row++) into.pixels.set(src.pixels.subarray((top + row) * src.width + left, (top + row) * src.width + right), row * w);
  into.version++;
  return { cut: { surface: into, x: x + left, y: y + top }, spare: into };
}
