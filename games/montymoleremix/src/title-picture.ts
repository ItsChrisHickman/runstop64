import { bankImage } from '../../montyotr/src/data';
import { FRAME } from '../../shared/monty/frames';
import { LIBRARY, libraryRows } from './retile';

/**
 * The picture on the title's poster: Wanted in a panel of the high-scores box, 16 characters by 6 (128 x 48 pixels), in the C64's hires colours, one
 * to a character as the box's characters are: the pit head with its two wheels and its shed on the earth, Monty standing by it (his own picture in
 * Monty on the Run, the walk to the left) and a bucket with two lumps of coal (the lump is Wanted's own character, flickering in the colours
 * as it does in the rooms: `COAL`). Drawn here, a pixel at a time, from lines and the library's earth, so that it is read as the pictures
 * of Monty on the Run's rooms are: flat colour on black.
 */
export const PICTURE_COLS = 16, PICTURE_ROWS = 6;
const W = PICTURE_COLS * 8, H = PICTURE_ROWS * 8;

/** A character of the picture: its eight rows of pixels and its colour. */
export interface PictureChar { readonly rows: Uint8Array; readonly colour: number }
/** The picture's cells, row by row: a character, or `COAL` where a lump of coal stands. */
export type PictureCell = PictureChar | 'coal';

const WHITE = 1, RED = 2, CYAN = 3, PURPLE = 4, BLUE = 6, YELLOW = 7, GREY = 15;

/** A canvas of pixels, each with the colour it was drawn in. */
class Canvas {
  private readonly on = new Uint8Array(W * H);
  private readonly colour = new Uint8Array(W * H);

  plot(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.on[y * W + x] = 1;
    this.colour[y * W + x] = c;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let x = x0, y = y0; ;) {
      this.plot(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  fill(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.plot(x + i, y + j, c);
  }

  circle(cx: number, cy: number, r: number, c: number): void {
    for (let a = 0; a < 64; a++) this.plot(Math.round(cx + r * Math.cos((a * Math.PI) / 32)), Math.round(cy + r * Math.sin((a * Math.PI) / 32)), c);
  }

  /** The characters: each cell is its pixels in the colour most of them were drawn in. */
  cells(): PictureChar[][] {
    const out: PictureChar[][] = [];
    for (let row = 0; row < PICTURE_ROWS; row++) {
      const line: PictureChar[] = [];
      for (let col = 0; col < PICTURE_COLS; col++) {
        const rows = new Uint8Array(8);
        const votes = new Map<number, number>();
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const at = (row * 8 + y) * W + col * 8 + x;
            if (this.on[at] === 0) continue;
            rows[y] = (rows[y] ?? 0) | (0x80 >> x);
            const c = this.colour[at] ?? 1;
            votes.set(c, (votes.get(c) ?? 0) + 1);
          }
        }
        const best = [...votes].sort((a, b) => b[1] - a[1])[0];
        line.push({ rows, colour: best?.[0] ?? 0 });
      }
      out.push(line);
    }
    return out;
  }
}

/** Monty's walk to the left, as the game's sprite memory has it (24 x 21, a bit a pixel: he is hires), put on the canvas with his feet at `foot`. */
function monty(c: Canvas, left: number, foot: number): void {
  const base = (FRAME.walkLeft + 1) * 64;
  const rowsOf = (y: number): number[] => [0, 1, 2].map((b) => bankImage[base + y * 3 + b] ?? 0);
  let last = 20;
  while (last > 0 && rowsOf(last).every((b) => b === 0)) last--;
  for (let y = 0; y <= last; y++) {
    rowsOf(y).forEach((bits, b) => {
      for (let x = 0; x < 8; x++) if ((bits & (0x80 >> x)) !== 0) c.plot(left + b * 8 + x, foot - last + y, GREY);
    });
  }
}

function draw(): PictureChar[][] {
  const c = new Canvas();
  const ground = 40;
  // the earth, in Monty on the Run's hatched rock, red, the whole width
  const rock = libraryRows(LIBRARY.rock);
  for (let y = ground; y < H; y++) for (let x = 0; x < W; x++) if (((rock[y & 7] ?? 0) & (0x80 >> (x & 7))) !== 0) c.plot(x, y, RED);
  c.line(0, ground - 1, W - 1, ground - 1, YELLOW);
  // the pit head: two legs to the top, braces, the winding wheel with its spokes, the two ropes, the cage and the counterweight
  const top = { x: 27, y: 12 };
  c.line(6, ground - 2, top.x, top.y, WHITE);
  c.line(7, ground - 2, top.x + 1, top.y, WHITE);
  c.line(48, ground - 2, top.x, top.y, WHITE);
  c.line(47, ground - 2, top.x - 1, top.y, WHITE);
  for (const y of [22, 30, 36]) {
    const half = Math.round(((y - top.y) * 21) / (ground - 2 - top.y));
    c.line(top.x - half, y, top.x + half, y, WHITE);
  }
  c.circle(top.x, 9, 6, WHITE);
  c.circle(top.x, 9, 5, WHITE);
  c.line(top.x - 6, 9, top.x + 6, 9, WHITE);
  c.line(top.x, 3, top.x, 15, WHITE);
  c.line(top.x - 4, 5, top.x + 4, 13, WHITE);
  c.line(top.x + 4, 5, top.x - 4, 13, WHITE);
  c.line(21, 10, 21, 27, CYAN);
  c.fill(17, 27, 9, 8, CYAN);
  c.line(33, 10, 33, 22, CYAN);
  c.fill(31, 22, 5, 5, CYAN);
  // the winding shed beside it: walls, a pitched roof, a door
  c.fill(54, 28, 18, 11, BLUE);
  c.line(52, 28, 63, 19, PURPLE);
  c.line(63, 19, 74, 28, PURPLE);
  c.line(52, 28, 74, 28, PURPLE);
  c.fill(60, 31, 5, 8, WHITE);
  // Monty, standing by the shed's side, looking back at the pit head
  monty(c, 80, ground - 1);
  // the bucket: its rim and its sides; the coal above it is the lump
  c.line(106, 32, 121, 32, WHITE);
  c.line(106, 32, 109, ground - 1, WHITE);
  c.line(121, 32, 118, ground - 1, WHITE);
  c.line(109, ground - 1, 118, ground - 1, WHITE);
  c.line(108, 36, 119, 36, WHITE);
  // the sun, low on the right, in the box's one warm colour
  c.circle(116, 12, 5, YELLOW);
  c.circle(116, 12, 2, YELLOW);
  return c.cells();
}

/** The picture's cells: a character each, the lumps of coal over the bucket as `coal`. */
export const POSTER_PICTURE: readonly (readonly PictureCell[])[] = (() => {
  const cells = draw();
  return cells.map((line, row): PictureCell[] => line.map((cell, col): PictureCell => (row === 3 && (col === 13 || col === 14) ? 'coal' : cell)));
})();
