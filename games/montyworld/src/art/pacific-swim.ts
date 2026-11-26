/**
 * Monty swimming (the Pacific's reefs): a crawl, made from his own picture so it reads as him. His whole head is cut from his first step east in the sprite bank (Monty on the Run's
 * `bankImage`: the tuft, the big mop of hair, his eye, his snout and his chin, untouched), held up out of the water at the front as he swims, the same head as on land; under and behind it his body lies
 * flat in the water, solid with black lines as his walking pictures are, the arms pulling in turn (reaching ahead under his chin, or pulling back: a black line on his body) and his feet
 * kicking in turn at the back; the snorkel's tube standing up behind his head. (2026-11-25, Chris on the first crawl, drawn from shapes: "it does not at all look like Monty. It looks like
 * a gray puppy dog".) Four pictures going each way (a cycle). Hires sprite blocks as his own
 * pictures (a 16 x 16 picture in the block's top left, where his collision box is), put into the swim rooms' blocks while one is loaded (`roomBlocks`, data.ts). The lei he wears there is a
 * sprite over him as in every picture of his, with a picture of its own on the head (a crown on his hair, set on it as `wearing` sets it on his walking pictures).
 */
import { LEI, LEI_RISE } from './pacific-lei';
import { montyFrames } from './costume';
import { itemBlock, mirrored } from './pixels';
import { Raster } from './raster';

type Point = readonly [number, number];

/** The picture his head is cut from: his first step east. */
const HEAD_FROM = 0x54;
/** His head is the top this many rows of that picture (the tuft, the mop, his eye, snout and chin); below is his body, drawn lying. */
const HEAD_CUT = 11;
/** How far down the 16 x 16 picture his head's top is (the tuft on the top row, as on his walking picture). */
const HEAD_TOP = 0;
/** The column of the tip of his snout. */
const SNOUT = 15;

/** An arm's place in the stroke: reaching ahead under his chin, or pulling under him (a black line on his body). */
type Arm = 'ahead' | 'pull';
/** One frame of the crawl, swimming east: each arm's place and each foot's height at the back. The far arm reaches lower, under the near one. */
interface Stroke { near: Arm; far: Arm; kick: number; kick2: number }
const STROKES: readonly Stroke[] = [
  { near: 'ahead', far: 'pull', kick: 11, kick2: 15 },
  { near: 'ahead', far: 'ahead', kick: 13, kick2: 13 },
  { near: 'pull', far: 'ahead', kick: 15, kick2: 11 },
  { near: 'ahead', far: 'ahead', kick: 13, kick2: 13 },
];
/** Each arm's shoulder, and where its hand ends in each place. */
const ARMS = {
  near: { shoulder: [10, 12], hand: { ahead: [15, 12], pull: [5, 14] } },
  far: { shoulder: [9, 14], hand: { ahead: [14, 14], pull: [4, 13] } },
} as const satisfies Record<'near' | 'far', { shoulder: Point; hand: Record<Arm, Point> }>;

interface Head { readonly rows: readonly string[]; readonly top: number; readonly left: number; readonly right: number }

/** His head as rows of the 16 x 16 picture (east, his snout on the picture's right edge, its top HEAD_TOP rows down), and the columns of the top of his head (where the crown sits). */
function headOf(bank: Uint8Array): Head {
  const f = montyFrames(bank).find((m) => m.ptr === HEAD_FROM);
  if (!f) throw new Error('swim: Monty\'s first step east is not in the bank');
  const lit: Point[] = [];
  for (let y = f.head.top; y < f.head.top + HEAD_CUT; y++) f.px[y]?.forEach((on, x) => { if (on) lit.push([x, y - f.head.top]); });
  const dx = SNOUT - Math.max(...lit.map(([x]) => x));
  const r = new Raster(16, 16);
  for (const [x, y] of lit) r.set(x + dx, y + HEAD_TOP);
  return { rows: r.rows(), top: HEAD_TOP, left: f.head.left + dx, right: f.head.right + dx };
}

/** Each row's span of the head from its first lit pixel to its last: its silhouette, cleared under it so what is behind does not fill his face's black lines. */
const silhouette = (rows: readonly string[]): string[] => rows.map((row) => {
  const a = row.indexOf('#'), b = row.lastIndexOf('#');
  return a < 0 ? '.'.repeat(row.length) : `${'.'.repeat(a)}${'#'.repeat(b - a + 1)}${'.'.repeat(row.length - b - 1)}`;
});

/** An arm from its shoulder: two pixels thick, set off from what is round it by black lines above and below. */
function arm(r: Raster, which: keyof typeof ARMS, place: Arm) {
  const [sx, sy] = ARMS[which].shoulder, [hx, hy] = ARMS[which].hand[place];
  if (place === 'pull') { r.line(sx, sy, hx, hy, false); return; } // (under the water, on his body: his arm's black line, as on his walking pictures)
  r.line(sx, sy - 1, hx, hy - 1, false); r.line(sx, sy + 2, hx, hy + 2, false);
  r.line(sx, sy, hx, hy); r.line(sx, sy + 1, hx, hy + 1);
}

/** A leg from the hip to a foot at the back, the foot a little block (his walking pictures' feet). */
function leg(r: Raster, y: number) {
  r.line(3, 13, 1, y); r.line(3, 12, 1, y - 1); r.rect(0, y - 1, 1, y);
}

/** The swimmer facing east: his legs, his body flat in the water, the snorkel's tube, his head, the arms. */
function swimmer(head: Head, s: Stroke): Raster {
  const r = new Raster(16, 16);
  leg(r, s.kick2);
  r.line(2, 12, 0, s.kick - 2, false); r.line(2, 14, 0, s.kick + 1, false); // (black lines to set the near leg off the far one)
  leg(r, s.kick);
  r.ellipse(6.5, 12.8, 5, 2.4); // his body, round as his walking pictures are
  // the snorkel's tube: up behind his head, its mouth turned back
  const tube = head.left - 2;
  r.line(tube, 1, tube, 5); r.set(tube - 1, 1);
  // his head over all of it, a black line round its back so it stands off his body and the arm going over
  const shape = silhouette(head.rows);
  shape.forEach((row, y) => { const a = row.indexOf('#'); if (a > 0 && y > HEAD_TOP + 3) r.set(a - 1, y, false); });
  r.cut(shape, 0, 0);
  r.stamp(head.rows, 0, 0);
  arm(r, 'far', s.far);
  arm(r, 'near', s.near);
  return r;
}

/** His four pictures each way, made from `bank` (his own head in each), as rows. */
export function swimPictures(bank: Uint8Array): { readonly left: readonly (readonly string[])[]; readonly right: readonly (readonly string[])[] } {
  const head = headOf(bank);
  const right = STROKES.map((s) => swimmer(head, s).rows());
  return { right, left: right.map(mirrored) };
}

/** A picture's sprite block. */
export const swimBlock = (name: string, rows: readonly string[]): Uint8Array => itemBlock(name, rows);

/**
 * The lei as a crown on his hair: its own sprite picture (a 16 x 16 block, the crown at its top), set on the head as on his walking pictures (`LEI_RISE` rows of it above the top of his head,
 * so `dy` rows from his sprite's top), mirrored going west.
 */
export function swimCrown(bank: Uint8Array): { readonly left: readonly string[]; readonly right: readonly string[]; readonly dy: number } {
  const h = headOf(bank);
  const r = new Raster(16, 16);
  const w = LEI[0]?.length ?? 0;
  r.stamp(LEI, Math.round((h.left + h.right) / 2 - (w - 1) / 2), 0);
  const right = r.rows();
  return { right, left: mirrored(right), dy: h.top - LEI_RISE };
}
