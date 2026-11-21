/**
 * A small drawing surface for the art that is built up from shapes (domes, towers, clock faces) rather than typed row by row. It
 * draws in 1-bit pixels and gives its rows as text for `characters()` (pixels.ts), so a picture made here is read like any other.
 */
export class Raster {
  private readonly px: boolean[][];
  constructor(readonly w: number, readonly h: number) {
    this.px = Array.from({ length: h }, () => Array.from({ length: w }, () => false));
  }
  set(x: number, y: number, on = true) {
    const row = this.px[Math.round(y)], col = Math.round(x);
    if (row !== undefined && col >= 0 && col < this.w) row[col] = on;
  }
  get(x: number, y: number) { return this.px[y]?.[x] ?? false; }
  /** A filled rectangle (corners inclusive). */
  rect(x0: number, y0: number, x1: number, y1: number, on = true) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, on);
  }
  /** A rectangle's outline. */
  frame(x0: number, y0: number, x1: number, y1: number) {
    this.rect(x0, y0, x1, y0); this.rect(x0, y1, x1, y1); this.rect(x0, y0, x0, y1); this.rect(x1, y0, x1, y1);
  }
  /** A straight line. */
  line(x0: number, y0: number, x1: number, y1: number, on = true) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, on);
  }
  /** A circle's outline, `thick` pixels, centre in pixel units (a half for an even width). */
  ring(cx: number, cy: number, r: number, thick = 1) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r + 0.5 && d > r + 0.5 - thick) this.set(x, y);
    }
  }
  disc(cx: number, cy: number, r: number) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (Math.hypot(x - cx, y - cy) <= r + 0.5) this.set(x, y);
  }
  /** A filled triangle. */
  triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, on = true) {
    const side = (ax: number, ay: number, bx: number, by: number, px: number, py: number) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const a = side(x0, y0, x1, y1, x, y), b = side(x1, y1, x2, y2, x, y), c = side(x2, y2, x0, y0, x, y);
      if ((a >= 0 && b >= 0 && c >= 0) || (a <= 0 && b <= 0 && c <= 0)) this.set(x, y, on);
    }
  }
  /** A filled ellipse. */
  ellipse(cx: number, cy: number, rx: number, ry: number, on = true) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, on);
  }
  /** Draw `rows` ('#' lit) with its top left at x, y (dark pixels leave what is there). */
  stamp(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') this.set(x + i, y + j); }));
  }
  /** Clear where `rows` is lit. */
  cut(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') this.set(x + i, y + j, false); }));
  }
  rows(): string[] { return this.px.map((r) => r.map((on) => (on ? '#' : '.')).join('')); }
}

/** An onion dome's look: how its inside is filled. */
export type Hatch = 'stripes' | 'spiral' | 'diamond' | 'scales' | 'plain';

/**
 * Ink for the inside of a dome at pixel (i across from its left edge of `w`, j down from its top), by style: the stripes and
 * diamonds spread from the middle so the dome is the same either side; the spiral turns one way, as the cathedral's do.
 */
function hatched(style: Hatch, i: number, j: number, w: number): boolean {
  const d = Math.floor(Math.abs(i - (w - 1) / 2));
  switch (style) {
    case 'stripes': return d % 3 !== 2;
    case 'spiral': return (i + j) % 4 < 3;
    case 'diamond': return (d + j) % 4 !== 0;
    case 'scales': return !(j % 4 === 3 && (d + (j >> 2) * 2) % 4 < 2);
    case 'plain': return true;
  }
}

/**
 * An onion dome: the point and a small cross at the top, the bulb widest about two thirds down, the neck narrower, the inside
 * hatched; `top` is the cross's top row, `cx` the middle column (the dome is symmetric about the gap between cx - 1 and cx for
 * an even `width`). Returns the row under its neck.
 */
export function onionDome(r: Raster, cx: number, top: number, width: number, bulbRows: number, style: Hatch, cross = true): number {
  const widest = Math.round(bulbRows * 0.62);
  let y = top;
  if (cross) {
    r.rect(cx - 2, y + 1, cx + 1, y + 1); // arm
    r.rect(cx - 1, y, cx, y + 3); // post
    y += 4;
  }
  const neck = Math.max(2, Math.round(width * 0.52 / 2) * 2);
  for (let j = 0; j < bulbRows; j++) {
    let w: number;
    if (j <= widest) w = 2 + (width - 2) * Math.sin((Math.PI / 2) * (j / widest)) ** 0.8;
    else w = width - (width - neck) * ((j - widest) / (bulbRows - 1 - widest)) ** 1.4;
    w = Math.max(2, Math.round(w / 2) * 2);
    const left = cx - w / 2;
    for (let i = 0; i < w; i++) {
      const edge = i === 0 || i === w - 1 || j === bulbRows - 1;
      r.set(left + i, y + j, edge || hatched(style, i, j, w));
    }
  }
  return y + bulbRows;
}

/** A line `t` pixels thick (drawn as that many lines side by side). */
export function stroke(r: Raster, x0: number, y0: number, x1: number, y1: number, t = 2) {
  for (let k = 0; k < t; k++) r.line(x0 + k - (t - 1) / 2, y0, x1 + k - (t - 1) / 2, y1);
}

/** Lay `shape` over `r`, a one pixel black moat round it so it stands out from the solid body under it. */
export function over(r: Raster, shape: Raster) {
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (!shape.get(x, y) && (shape.get(x - 1, y) || shape.get(x + 1, y) || shape.get(x, y - 1) || shape.get(x, y + 1))) r.set(x, y, false);
  }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (shape.get(x, y)) r.set(x, y);
}

/** A thick limb: a line `t` pixels thick. */
export function limb(r: Raster, x0: number, y0: number, x1: number, y1: number, t: number) {
  for (let k = 0; k < t; k++) for (let j = 0; j < t; j++) r.line(x0 + k - (t - 1) / 2, y0 + j - (t - 1) / 2, x1 + k - (t - 1) / 2, y1 + j - (t - 1) / 2);
}
