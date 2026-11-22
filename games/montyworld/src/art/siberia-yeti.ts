/**
 * The yeti of Yeti or Not, a big creature in the way China's New Year dragon is: four sprites moving as one (dragons.ts, `rigid` pieces), 48 x 42 pixels, three times Monty's height
 * across. A shaggy beast seen from the front, a big face with a heavy brow and fangs, arms hanging to huge hands, drawn solid with the fur cut into it as black lines. The head and
 * shoulders are two pictures (the top left and top right); the body below them has two strides, the left leg down and the right leg down with the arms swinging the other way, each two
 * pictures (the bottom left and right): six blocks in all, taken in turn as it walks.
 */
import { spriteBlock } from './pixels';
import { limb, Raster } from './raster';

const W = 48, H = 42, HALF = 21;

/** The whole figure with its legs and arms in stride `stride` (0: the left leg down, 1: the right). */
function figure(stride: 0 | 1): Raster {
  const r = new Raster(W, H);
  const lDown = stride === 0, left = lDown ? 41 : 37, right = lDown ? 37 : 41;
  // the legs, then the feet (broad, toes to the front): two, with the dark between them
  r.rect(12, 28, 21, left - 2); r.rect(9, left - 3, 22, left);
  r.rect(27, 28, 36, right - 2); r.rect(26, right - 3, 39, right);
  r.rect(15, left - 8, 16, left - 8, false); r.rect(32, right - 8, 33, right - 8, false); // a seam in each shin
  // the body: a great hunched mass, ragged where it hangs over the legs
  r.ellipse(24, 21, 16, 11.5);
  for (let x = 10; x <= 36; x += 4) r.triangle(x, 29, x + 4, 29, x + 2, 34);
  // the arms hang outside it: shoulder to elbow the same, then the forearm swinging, and the hands, huge
  limb(r, 6, 15, 4, 24, 6); limb(r, 42, 15, 44, 24, 6);
  limb(r, 4, 24, lDown ? 3 : 5, lDown ? 34 : 30, 6); limb(r, 44, 24, lDown ? 43 : 45, lDown ? 30 : 34, 6);
  r.disc(lDown ? 3.5 : 5.5, lDown ? 36 : 32, 4.4); r.disc(lDown ? 43.5 : 45.5, lDown ? 32 : 36, 4.4);
  // the head: smaller than the shoulders, a crest of fur and two small horns
  r.ellipse(24, 8, 10.5, 8.5);
  r.triangle(14, 3, 15, 0, 19, 5); r.triangle(34, 3, 33, 0, 29, 5);
  for (const x of [20, 24, 28]) r.triangle(x - 1.5, 3, x, 0, x + 1.5, 3);
  // the face cut into it: heavy brow, two deep eyes with a glint, a flat nose, a mouth open on fangs
  r.line(15, 5, 22, 7.5, false); r.line(15, 6, 22, 8.5, false); r.line(33, 5, 26, 7.5, false); r.line(33, 6, 26, 8.5, false);
  r.ellipse(19.5, 10, 3, 2.6, false); r.ellipse(28.5, 10, 3, 2.6, false);
  r.rect(19, 10, 20, 11); r.rect(28, 10, 29, 11);
  r.rect(22, 11, 25, 13, false);
  r.rect(17, 15, 31, 17, false);
  for (const x of [18, 21, 24, 27, 30]) r.triangle(x, 15, x + 2, 15, x + 1, 18.5);
  for (const x of [19.5, 25.5]) r.triangle(x, 17, x + 2, 17, x + 1, 14);
  // the fur: strokes cut across the body, shoulders to hem
  for (let y = 20; y <= 31; y += 4) for (let x = 12 + ((y / 4) % 2) * 3; x <= 34; x += 6) r.line(x, y, x + 2, y + 2.5, false);
  r.rect(23, 22, 24, 30, false); // the line down the middle of the chest
  return r;
}

/** The quarter of a figure's picture at (`x0`, `y0`): a sprite block. */
function quarter(name: string, r: Raster, x0: number, y0: number): Uint8Array {
  const rows = r.rows();
  return spriteBlock(name, Array.from({ length: HALF }, (_, y) => (rows[y0 + y] ?? '').slice(x0, x0 + 24)));
}

const top = figure(0), step = [figure(0), figure(1)] as const;

/** The six pictures: the top left and right, then the bottom left and right of each stride. */
export const YETI_PICTURES = {
  topLeft: quarter('yeti top left', top, 0, 0),
  topRight: quarter('yeti top right', top, 24, 0),
  bottomLeft: [quarter('yeti bottom left 0', step[0], 0, HALF), quarter('yeti bottom left 1', step[1], 0, HALF)],
  bottomRight: [quarter('yeti bottom right 0', step[0], 24, HALF), quarter('yeti bottom right 1', step[1], 24, HALF)],
} as const;

/** The yeti's colour: orange fur, against the cave's light blue rock and its white snow (never white on snow). */
export const YETI_COLOUR = 8;
