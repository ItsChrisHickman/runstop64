import type { Drawable } from './effects';
import type { FrameCapture } from './c64/machine';
import { TRANSPARENT } from './surface';

/** A rectangle of the picture (C64 pixels: 320×200, y down). */
export interface Rect { x: number; y: number; w: number; h: number }

/**
 * The picture shown laid out differently from how the machine draws it, declared rather than
 * coded: parts of it moved (a status panel from the bottom to the top, say), places cleared,
 * and labels added in the picture's own lettering. It's how the picture is shown, nothing more:
 * the machine, and the game's logic, never see it (its memory, collisions and timing are the
 * original's). What's drawn over the picture in the machine's coordinates (sprites, the combat
 * effects, the sparkles) goes with the part its middle is in.
 *
 * Moves are of the composed picture, so raster splits, scroll registers and each row's colours
 * are as the VIC drew them (c64kit's C64View, and tools/probe's renderPixels for the tests).
 */
export interface PictureLayout {
  /**
   * Parts drawn elsewhere: each read from the picture as the machine drew it (so two parts can swap
   * places). What's drawn over the picture (sprites, effects, sparkles) goes with the first move whose
   * `over` (or, without one, `from`) holds its middle: a part's `over` can take in more than its pixels
   * (a play area's sprites that reach up over a panel, or into rows the layout leaves out).
   */
  moves: { from: Rect; to: { x: number; y: number }; over?: Rect }[];
  /** Places cleared to a colour before the moves land (where a part moved from and nothing moved to). */
  clear?: (Rect & { colour: number })[];
  /**
   * Text drawn last, in the letters of the charset the picture's character row `font` uses (A-Z its
   * characters 1-26, or as `code` says; a cut-out one the right way round; anything else a gap), 8 pixels a letter: x and
   * y (pixels) are the first letter's cell, the row's fine scroll is added to x (so a label on a
   * multiple of 8 lines up with that row's characters).
   */
  labels?: { text: string; x: number; y: number; colour: number }[];
  /** The character row of the picture (0-24, as the machine draws it) whose charset gives the labels' letters. */
  font?: number;
  /** Which of that charset's characters a label's character is, where it is not A-Z as 1-26 (digits, say; null: a gap). */
  code?: (ch: string) => number | null;
  /** Gauges drawn on what the game draws (before the moves: they go with the part they're in). */
  gauges?: Gauge[];
}

/**
 * A gauge on something the game draws (a face standing for a life, say) for a value the game keeps
 * but doesn't show: the thing's lit pixels empty from the top, to a colour, in proportion to how
 * much is gone, a whole line at a time. Full shows it as the game draws it. Read from the game's
 * memory only.
 */
export interface Gauge {
  /** Where it is in the machine's picture (the lines that empty), or null while it isn't shown. */
  at(ram: Uint8Array): Rect | null;
  /** How full it is, 0 to 1. */
  level(ram: Uint8Array): number;
  /** The colour the emptied lines' lit pixels take. */
  empty: number;
}

/** How many of a gauge's `h` lines are emptied at `level` (whole lines; anything left keeps a line, anything gone empties one). */
export function emptiedLines(level: number, h: number) {
  const l = Math.min(1, Math.max(0, level));
  return l >= 1 ? 0 : l <= 0 ? h : Math.min(h - 1, Math.max(1, Math.round((1 - l) * h)));
}

/** Draw the layout's gauges into a layer (320×200 colour values, as the machine drew it): pixels that aren't `background(y)` are lit. */
function drawGauges(layout: PictureLayout, px: Uint8Array, ram: Uint8Array, background: (y: number) => number) {
  for (const g of layout.gauges ?? []) {
    const r = g.at(ram);
    if (!r) continue;
    const lines = emptiedLines(g.level(ram), r.h);
    for (let y = Math.max(0, r.y); y < Math.min(H, r.y + lines); y++) {
      const bg = background(y);
      for (let x = Math.max(0, r.x); x < Math.min(W, r.x + r.w); x++) if (px[y * W + x] !== bg) px[y * W + x] = g.empty;
    }
  }
}

/** The background colour ($D021 as the row was fetched) on line y of the captured picture (the border's off the rows). */
export function backgroundAt(cap: FrameCapture, y: number) {
  for (let row = 0; row < 25; row++) {
    const r = cap.rows[row];
    if (!r) continue;
    const top = r.line !== undefined ? r.line - 0x33 : row * 8;
    if (y >= top && y < top + 8) return r.bg[0];
  }
  return cap.border;
}

const W = 320, H = 200;

/** Where the layout shows a point of the machine's picture (unchanged outside every move). */
export function placePoint(layout: PictureLayout | null, x: number, y: number): { x: number; y: number } {
  if (layout) for (const { from, to, over = from } of layout.moves) {
    if (x >= over.x && x < over.x + over.w && y >= over.y && y < over.y + over.h) return { x: x - from.x + to.x, y: y - from.y + to.y };
  }
  return { x, y };
}

/** How far the layout moves whatever has its middle at (x, y). */
function shiftAt(layout: PictureLayout | null, x: number, y: number) {
  const p = placePoint(layout, x, y);
  return { dx: p.x - x, dy: p.y - y };
}

/** A box (a sprite, an effect) where the layout shows it: moved with the part its middle is in. */
export function placeBox(layout: PictureLayout | null, b: Rect): Rect {
  const { dx, dy } = shiftAt(layout, b.x + b.w / 2, b.y + b.h / 2);
  return { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
}

/** An effect (effects.ts) where the layout shows it. */
export function placeDrawable(layout: PictureLayout | null, d: Drawable): Drawable {
  if (!layout) return d;
  switch (d.kind) {
    case 'edge': return d;
    case 'image': {
      const b = placeBox(layout, { x: d.x, y: d.y, w: d.image.w * d.scale, h: d.image.h * d.scale });
      return { ...d, x: b.x, y: b.y };
    }
    case 'rect': case 'frame': { const b = placeBox(layout, d); return { ...d, x: b.x, y: b.y }; }
    case 'glow': case 'ring': { const p = placePoint(layout, d.x, d.y); return { ...d, x: p.x, y: p.y }; }
  }
}

/**
 * Lay out one layer of a composed picture (320×200 values, in place): the clears, then the moves.
 * `cleared` gives the value a cleared pixel takes in this layer (a colour, or transparent).
 */
function arrange(layout: PictureLayout, px: Uint8Array, cleared: (colour: number) => number) {
  const src = px.slice();
  for (const c of layout.clear ?? []) {
    const v = cleared(c.colour);
    for (let y = Math.max(0, c.y); y < Math.min(H, c.y + c.h); y++) px.fill(v, y * W + Math.max(0, c.x), y * W + Math.min(W, c.x + c.w));
  }
  for (const { from, to } of layout.moves) {
    for (let y = 0; y < from.h; y++) {
      const sy = from.y + y, dy = to.y + y;
      if (sy < 0 || sy >= H || dy < 0 || dy >= H) continue;
      for (let x = 0; x < from.w; x++) {
        const sx = from.x + x, dx = to.x + x;
        if (sx >= 0 && sx < W && dx >= 0 && dx < W) px[dy * W + dx] = src[sy * W + sx];
      }
    }
  }
}

/**
 * A decoded picture's two layers (c64/picture.ts: what's in front of sprites set behind, TRANSPARENT
 * where nothing, and the background) laid out as shown, in place: the gauges, the clears and moves,
 * the labels (in front). C64View shows them so; tools/probe's renderPixels draws the same.
 */
export function layOut(layout: PictureLayout, fore: Uint8Array, back: Uint8Array, ram: Uint8Array, cap: FrameCapture) {
  drawGauges(layout, fore, ram, () => TRANSPARENT);
  drawGauges(layout, back, ram, (y) => backgroundAt(cap, y));
  arrange(layout, fore, () => TRANSPARENT);
  arrange(layout, back, (c) => c);
  const font = labelFont(layout, ram, cap);
  if (font) drawLabels(layout, fore, font);
}

/** A-Z as characters 1-26 (the C64's screen codes), anything else none. */
function letterCode(ch: string): number | null {
  const c = ch.toUpperCase().charCodeAt(0);
  return c >= 0x41 && c <= 0x5a ? c - 0x40 : null;
}

/** The labels' lettering: the charset the capture's row `layout.font` was drawn with, and that row's fine scroll (none if the row wasn't drawn). */
interface LabelFont { glyph(ch: string): Uint8Array | null; scrollX: number }

/** The labels' lettering, from the frame as the VIC drew it. */
export function labelFont(layout: PictureLayout, ram: Uint8Array, cap: FrameCapture): LabelFont | null {
  const r = cap.rows[layout.font ?? 0];
  if (!r) return null;
  const charAt = r.bank + ((r.d018 >> 1) & 7) * 0x800;
  return {
    scrollX: r.d016 & 7,
    glyph: (ch) => {
      const c = layout.code ? layout.code(ch.toUpperCase()) : letterCode(ch);
      if (c === null) return null;
      const g = ram.subarray(charAt + c * 8, charAt + c * 8 + 8);
      // (a letter kept cut out of a solid cell, its top row all lit, is drawn the right way round)
      return g[0] === 0xff ? g.map((b) => ~b & 0xff) : g;
    },
  };
}

/** Draw the layout's labels into a layer (320×200 colour values) in `font`'s letters, on its row's grid (its fine scroll added). */
export function drawLabels(layout: PictureLayout, px: Uint8Array, font: LabelFont) {
  for (const l of layout.labels ?? []) {
    let x = l.x + font.scrollX;
    for (const ch of l.text) {
      const g = font.glyph(ch);
      if (g) for (let y = 0; y < 8; y++) for (let b = 0; b < 8; b++) {
        const X = x + b, Y = l.y + y;
        if (g[y] & (0x80 >> b) && X >= 0 && X < W && Y >= 0 && Y < H) px[Y * W + X] = l.colour;
      }
      x += 8;
    }
  }
}
