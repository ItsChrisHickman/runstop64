/**
 * Monty's costumes: his own 36 pictures (the walk, the rope, the somersault, both ways: pointers $50-$73 in the bank) with a thing
 * worn drawn on, by ONE rule for every costume.
 *
 * His head is found in each picture, not guessed from the sprite's box. On an upright picture the head is the top rows of the figure
 * (HEAD_ROWS of them: the hair and the ears), its columns the lit span of those rows; his face (his eyes) is the band of rows just
 * below (EYES_FROM to EYES_TO, counted from the top of the figure). Each somersault picture is Monty turned round some angle, found by
 * laying the upright picture over it (the angle with the most pixels in common); the head and face are the upright ones turned the
 * same angle.
 *
 * A hat is small: about the width of his head and at most MAX_HAT_ROWS rows tall, its lowest row on the lower hair of the head
 * (never lower than the row above the eyes), so his eyes, face and body show. In a somersault it turns with the head. A neck piece
 * (the lei) is a small garland just under the face. The thing is a picture like the rest of the art (rows of text, '#' lit); it is a
 * sprite of its own over Monty (his figure is one ink, the thing is another colour), and his own picture is cleared only under the
 * thing's own pixels.
 */
import { picture } from './pixels';
import type { CostumeBlocks } from './types';

/** The pictures' size: a hires sprite block, 24 x 21. */
const W = 24, H = 21;
/** Where Monty's pictures are: the walk left and right (4 each), the rope (4), the somersault left and right (12 each). */
export const FIRST = 0x50, UPRIGHT = 12, COUNT = 36;
/** The upright picture each somersault is matched to: the walk's first step, left (jump left) or right (jump right). */
const BASE_LEFT = 0x50, BASE_RIGHT = 0x54;

/** The head is the top this many rows of the figure; the eyes (his face) are the rows EYES_FROM to EYES_TO counted from its top row. */
export const HEAD_ROWS = 4, EYES_FROM = 3, EYES_TO = 5;
/** A hat's most rows, and how far past the head's columns (each side) it may reach. */
export const MAX_HAT_ROWS = 6, HEAD_SLACK = 2;
/** A neck piece's most rows. */
export const MAX_NECK_ROWS = 5;

/** Where a thing is worn: on the head (above the eyes) or round the neck (below them). */
export type Site = 'head' | 'neck';

type Pixels = boolean[][];
interface Point { x: number; y: number }

function unpack(bank: Uint8Array, ptr: number): Pixels {
  return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => ((bank[ptr * 64 + y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) !== 0));
}

function pack(px: Pixels): Uint8Array {
  const out = new Uint8Array(63);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[y]?.[x]) out[y * 3 + (x >> 3)] = (out[y * 3 + (x >> 3)] ?? 0) | (0x80 >> (x & 7));
  return out;
}

const lit = (px: Pixels, x: number, y: number) => px[y]?.[x] === true;

/** The lit pixels' centre. */
function centre(px: Pixels): Point {
  let n = 0, sx = 0, sy = 0;
  px.forEach((row, y) => row.forEach((on, x) => { if (on) { n++; sx += x; sy += y; } }));
  return { x: sx / n, y: sy / n };
}

/** An upright picture's head: its top row and the lit columns' span over its top HEAD_ROWS rows. */
export interface Head { readonly top: number; readonly left: number; readonly right: number }

function headOf(px: Pixels): Head {
  const top = px.findIndex((row) => row.some((on) => on));
  let left = W, right = -1;
  for (let y = top; y < top + HEAD_ROWS; y++) px[y]?.forEach((on, x) => { if (on) { left = Math.min(left, x); right = Math.max(right, x); } });
  return { top, left, right };
}

/** `px` turned `angle` about `from` and moved to `to`, as a lookup: the pixel that lands on (x, y) is where it was. */
function turned(angle: number, from: Point, to: Point) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return (x: number, y: number): Point => {
    const dx = x - to.x, dy = y - to.y;
    return { x: from.x + dx * c + dy * s, y: from.y - dx * s + dy * c };
  };
}

/** The angle (a degree at a time) that lays the upright picture best over this one. */
function angleOf(base: Pixels, px: Pixels): number {
  const c0 = centre(base), c1 = centre(px);
  let best = 0, bestScore = -1;
  for (let deg = 0; deg < 360; deg++) {
    const back = turned((deg * Math.PI) / 180, c0, c1);
    let both = 0, either = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = back(x, y), a = lit(base, Math.round(p.x), Math.round(p.y)), b = lit(px, x, y);
      if (a && b) both++;
      if (a || b) either++;
    }
    if (both / either > bestScore) { bestScore = both / either; best = deg; }
  }
  return (best * Math.PI) / 180;
}

/** One of Monty's pictures with where his head and face are: `upright` maps a pixel of this picture to the upright picture it is turned from. */
export interface Frame {
  readonly ptr: number;
  readonly px: readonly (readonly boolean[])[];
  /** The upright picture's head (the same for a picture and the upright one it is turned from). */
  readonly head: Head;
  /** Where a pixel of this picture is on the upright picture (the identity for the upright ones). */
  readonly upright: (x: number, y: number) => Point;
  /** The picture's lit pixels that are his eyes, his face. */
  readonly eyes: readonly Point[];
}

const frameCache = new WeakMap<Uint8Array, readonly Frame[]>();

/** All 36 of Monty's pictures in `bank`, with their heads found (once for each bank). */
export function montyFrames(bank: Uint8Array): readonly Frame[] {
  const cached = frameCache.get(bank);
  if (cached) return cached;
  const pictures = Array.from({ length: COUNT }, (_, i) => unpack(bank, FIRST + i));
  const frames = pictures.map((px, i): Frame => {
    const ptr = FIRST + i;
    const base = pictures[(i < UPRIGHT ? ptr : ptr < 0x68 ? BASE_LEFT : BASE_RIGHT) - FIRST] ?? px;
    const head = headOf(base);
    const upright = i < UPRIGHT ? (x: number, y: number): Point => ({ x, y }) : turned(angleOf(base, px), centre(base), centre(px));
    const eyes: Point[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!lit(px, x, y)) continue;
      const p = upright(x, y), row = Math.round(p.y) - head.top;
      if (row >= EYES_FROM && row <= EYES_TO && Math.round(p.x) >= head.left && Math.round(p.x) <= head.right) eyes.push({ x, y });
    }
    return { ptr, px, head, upright, eyes };
  });
  frameCache.set(bank, frames);
  return frames;
}

/** A worn thing as a sprite of its own: Monty's pointer it goes with, its 63-byte block, and where the block sits from his sprite. */
export interface Overlay { readonly ptr: number; readonly block: Uint8Array; readonly dx: number; readonly dy: number }

/** What wearing a thing makes: Monty's pictures with the thing's own pixels cleared, and the thing itself. */
export interface Worn { readonly site: Site; readonly monty: CostumeBlocks; readonly hat: readonly Overlay[] }

/**
 * Monty with a thing on: for all 36 pictures of `bank` (63 bytes each, by pointer), his picture with the thing's own pixels cleared, and the
 * thing as a picture of its own to be shown over him in a colour of its own. `art` is rows of text ('#' lit) centred on the head's columns;
 * `rise` is the row of `art` that lies on the top row of his figure (a hat: its lower rows are his hair; a neck piece: a negative number,
 * its top row that many rows below his top row).
 */
export function wearing(bank: Uint8Array, art: readonly string[], site: Site, rise: number): Worn {
  const rows = picture('worn', art, art[0]?.length ?? 0, art.length);
  const aw = rows[0]?.length ?? 0;
  const artAt = (x: number, y: number) => rows[Math.round(y)]?.[Math.round(x)] === '#';
  const monty: { ptr: number; block: Uint8Array }[] = [];
  const over: Overlay[] = [];
  for (const f of montyFrames(bank)) {
    const cx = (f.head.left + f.head.right) / 2;
    // for a pixel of this picture's plane (it may be outside the 24 x 21), where it is on the art
    const onArt = (x: number, y: number): Point => { const p = f.upright(x, y); return { x: p.x - cx + (aw - 1) / 2, y: p.y - f.head.top + rise }; };
    const inside = (x: number, y: number) => { const p = onArt(x, y); return artAt(p.x, p.y); };
    const seen = new Set(f.eyes.map((e) => e.y * W + e.x));
    const next: Pixels = f.px.map((row) => [...row]);
    const lits: Point[] = [];
    for (let y = -16; y < H + 16; y++) for (let x = -16; x < W + 16; x++) {
      if (!inside(x, y) || seen.has(y * W + x)) continue; // his eyes are never covered
      lits.push({ x, y });
      const row = next[y];
      if (row && x >= 0 && x < W) row[x] = false;
    }
    monty.push({ ptr: f.ptr, block: pack(next) });
    // the thing's own pixels, wherever they fall round the picture: its block starts at the top left of what is lit
    const dx = Math.floor(Math.min(...lits.map((p) => p.x)) / 2) * 2, dy = Math.min(...lits.map((p) => p.y));
    if (Math.max(...lits.map((p) => p.x)) - dx >= W || Math.max(...lits.map((p) => p.y)) - dy >= H) throw new Error(`the thing worn does not fit a sprite on picture $${f.ptr.toString(16)}`);
    const block = new Uint8Array(63);
    for (const p of lits) { const x = p.x - dx, y = p.y - dy; block[y * 3 + (x >> 3)] = (block[y * 3 + (x >> 3)] ?? 0) | (0x80 >> (x & 7)); }
    over.push({ ptr: f.ptr, block, dx, dy });
  }
  return { site, monty, hat: over };
}

/** An overlay's lit pixels, in the picture's plane. */
export function overlayPixels(o: Overlay): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((o.block[y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) out.push({ x: x + o.dx, y: y + o.dy });
  return out;
}
