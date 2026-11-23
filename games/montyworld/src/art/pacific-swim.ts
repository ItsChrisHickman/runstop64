/**
 * Monty swimming (the Pacific's reefs): a crawl. The body is horizontal, the head up and forward in the snorkel mask with its tube standing up behind it, the arms and the legs alternating, a few bubbles
 * trailing and rising; four pictures going each way (a cycle). Hires sprite blocks as his own pictures (a 16 x 16 picture in the block's top left, where his collision box is), put into the swim rooms'
 * blocks while one is loaded (`roomBlocks`, data.ts). The lei he wears there is a sprite over him as in every picture of his, with a picture of its own on the head of each (a crown above the mask).
 */
import { LEI } from './pacific-lei';
import { itemBlock, mirrored } from './pixels';
import { Raster } from './raster';

/** One frame of the crawl: where each arm and leg ends (shoulder and hip are fixed), and the bubbles. Pixels in the 16 x 16 picture, swimming right. */
interface Stroke { near: readonly [number, number]; far: readonly [number, number]; kick: readonly [number, number]; kick2: readonly [number, number]; bubbles: readonly (readonly [number, number])[] }
const STROKES: readonly Stroke[] = [
  { near: [14, 12], far: [4, 14], kick: [0, 8], kick2: [1, 13], bubbles: [[1, 5], [3, 3]] }, // the near arm reaching, the far arm pulling back; legs apart
  { near: [10, 15], far: [13, 12], kick: [0, 10], kick2: [0, 12], bubbles: [[2, 4], [0, 2]] }, // the near arm pulling down, the far arm reaching
  { near: [4, 14], far: [14, 12], kick: [1, 13], kick2: [0, 8], bubbles: [[3, 4], [1, 2]] }, // the arms changed over, the legs changed over
  { near: [13, 12], far: [10, 15], kick: [0, 12], kick2: [0, 10], bubbles: [[2, 5], [4, 3]] },
];

/** The swimmer facing right: torso, head with its mask and the snorkel's tube, the limbs of the stroke, the bubbles. */
function swimmer(s: Stroke): Raster {
  const r = new Raster(16, 16);
  r.ellipse(6.5, 9, 5.2, 2.9); // the torso
  r.disc(12, 7.5, 2.9); // the head, up and forward
  r.rect(14, 9, 15, 10); // the snout
  r.rect(12, 6, 14, 7, false); r.set(13, 6); // the mask's glass, a glint
  r.line(10, 5, 9, 1); r.line(9, 5, 8, 1); r.rect(7, 1, 9, 1); // the snorkel's tube up behind the mask, its curl
  r.line(8, 6, 8, 12, false); // a seam between head and body
  r.line(9, 10, s.near[0], s.near[1]); r.line(9, 11, s.near[0], s.near[1] + 1); // the near arm
  r.line(8, 9, s.far[0], s.far[1], false); r.line(8, 10, s.far[0], s.far[1]); r.line(8, 11, s.far[0], s.far[1] + 1); // the far arm (a black line over the body to set it off)
  r.line(2, 9, s.kick[0], s.kick[1]); r.line(2, 10, s.kick[0], s.kick[1] + 1); // the legs
  r.line(3, 11, s.kick2[0], s.kick2[1]);
  for (const [x, y] of s.bubbles) r.set(x, y);
  return r;
}

const RIGHT = STROKES.map((s) => swimmer(s).rows());
export const SWIM_RIGHT: readonly (readonly string[])[] = RIGHT;
export const SWIM_LEFT: readonly (readonly string[])[] = RIGHT.map(mirrored);

/** A picture's sprite block. */
export const swimBlock = (name: string, rows: readonly string[]): Uint8Array => itemBlock(name, rows);

/** The lei as a crown above the mask: its own sprite picture (a 16 x 16 block), the same going each way but mirrored. */
function crown(left: boolean): readonly string[] {
  const r = new Raster(16, 16);
  r.stamp(LEI, left ? 1 : 5, 0);
  return r.rows();
}
export const SWIM_CROWN = { left: crown(true), right: crown(false) } as const;
