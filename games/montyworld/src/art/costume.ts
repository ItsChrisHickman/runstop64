/**
 * Monty's costumes: his own 36 pictures (the walk, the rope, the somersault, both ways: pointers $50-$73 in the bank) with a hat
 * drawn on. The upright pictures take the hat on the top of the head; each somersault picture is Monty turned round some angle,
 * which is found by laying the upright picture over it (the angle with the most pixels in common), and the hat turned the same
 * angle on the same head. The hat is a picture like the rest of the art (rows of text); where it covers the head a black line
 * is left round it, so it reads on a figure of one ink.
 */
import { picture } from './pixels';
import type { CostumeBlocks } from './types';

/** The pictures' size: a hires sprite block, 24 x 21. */
const W = 24, H = 21;
/** Where Monty's pictures are: the walk left and right (4 each), the rope (4), the somersault left and right (12 each). */
const FIRST = 0x50, UPRIGHT = 12, COUNT = 36;
/** The upright picture each somersault is matched to: the walk's first step, left (jump left) or right (jump right). */
const BASE_LEFT = 0x50, BASE_RIGHT = 0x54;

type Pixels = boolean[][];

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
function centre(px: Pixels): { x: number; y: number } {
  let n = 0, sx = 0, sy = 0;
  px.forEach((row, y) => row.forEach((on, x) => { if (on) { n++; sx += x; sy += y; } }));
  return { x: sx / n, y: sy / n };
}

/** Where the hat sits on an upright picture: the top row of the figure, and the middle of its first three rows. */
function crown(px: Pixels): { x: number; y: number } {
  const top = px.findIndex((row) => row.some((on) => on));
  let n = 0, sx = 0;
  for (let y = top; y < top + 3; y++) px[y]?.forEach((on, x) => { if (on) { n++; sx += x; } });
  return { x: sx / n, y: top };
}

/** `px` turned `angle` about `from` and moved to `to`, as a lookup: the pixel that lands on (x, y) is where it was. */
function turned(angle: number, from: { x: number; y: number }, to: { x: number; y: number }) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return (x: number, y: number) => {
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

/**
 * Monty with a hat on: all 36 pictures of `bank` (63 bytes each, by pointer), `hat` a picture (rows of text, '#' lit) whose top
 * middle sits on the top of his head.
 */
export function wearing(bank: Uint8Array, hat: readonly string[]): CostumeBlocks {
  const rows = picture('hat', hat, hat[0]?.length ?? 0, hat.length);
  const hw = rows[0]?.length ?? 0;
  const hatAt = (x: number, y: number) => rows[Math.round(y)]?.[Math.round(x)] === '#';
  const pictures = Array.from({ length: COUNT }, (_, i) => unpack(bank, FIRST + i));
  const base = (ptr: number) => pictures[ptr - FIRST] ?? [];
  const out: { ptr: number; block: Uint8Array }[] = [];
  pictures.forEach((px, i) => {
    const ptr = FIRST + i;
    // for a pixel of this picture, where it is on the hat
    let onHat: (x: number, y: number) => { x: number; y: number };
    if (i < UPRIGHT) {
      const head = crown(px);
      onHat = (x, y) => ({ x: x - head.x + (hw - 1) / 2, y: y - head.y });
    } else {
      const upright = ptr < 0x68 ? BASE_LEFT : BASE_RIGHT;
      const b = base(upright), head = crown(b);
      const back = turned(angleOf(b, px), centre(b), centre(px));
      onHat = (x, y) => { const p = back(x, y); return { x: p.x - head.x + (hw - 1) / 2, y: p.y - head.y }; };
    }
    const inside = (x: number, y: number) => { const p = onHat(x, y); return hatAt(p.x, p.y); };
    const next: Pixels = px.map((row) => [...row]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const row = next[y];
      if (!row) continue;
      if (inside(x, y)) row[x] = true;
      else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) row[x] = false; // a black line round the hat
    }
    out.push({ ptr, block: pack(next) });
  });
  return out;
}
