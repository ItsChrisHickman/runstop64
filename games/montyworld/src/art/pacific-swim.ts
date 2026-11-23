/**
 * Monty swimming (the Pacific's reefs): a horizontal body with the snorkel mask on, a stroke of the arms and a kick of the legs, three pictures going each way (glide, pull, push; the stroke cycles
 * glide, pull, glide, push). They are hires sprite blocks as his own pictures are (a 16 x 16 picture in the block's top left, where his collision box is), put into the swim rooms' blocks while one is loaded
 * (`roomBlocks`, data.ts). The lei he wears there is a sprite over him as in every picture of his, with a picture of its own on the head of each (a crown above the mask).
 */
import { LEI } from './pacific-lei';
import { itemBlock, mirrored } from './pixels';
import { Raster } from './raster';

/** One stroke's limbs: the arm (shoulder to hand) and the leg (hip to foot), pixels in the 16 x 16 picture, swimming right. */
const STROKES = [
  { arm: [8, 9, 14, 9], leg: [2, 10, 0, 11] }, // glide: the arm reaching forward, the leg trailing
  { arm: [8, 9, 6, 12], leg: [2, 10, 0, 8] }, // pull: the arm sweeping down and back, the foot kicking up
  { arm: [8, 9, 8, 12], leg: [2, 10, 1, 13] }, // push: the arm at his side, the foot kicking down
] as const;

/** The swimmer facing right, a stroke of the limbs on a body that is the same in all: the torso, the head with its mask and the snorkel's tube, a tail. */
function swimmer(stroke: (typeof STROKES)[number]): Raster {
  const r = new Raster(16, 16);
  r.ellipse(5.5, 9.5, 5.4, 3.6); // the torso
  r.disc(11.5, 8.5, 3.3); // the head
  r.rect(14, 9, 15, 10); // the snout
  r.rect(0, 8, 1, 9); // the tail
  r.rect(12, 7, 14, 8, false); r.set(13, 7); // the mask's glass: dark with a glint
  r.line(9, 6, 9, 2); r.line(10, 6, 10, 2); r.rect(7, 1, 10, 1); r.line(8, 2, 8, 2); // the snorkel's tube up from the mask's strap
  r.line(8, 9, 8, 12, false); // the neck: a dark seam between head and body
  const [ax, ay, bx, by] = stroke.arm, [lx, ly, mx, my] = stroke.leg;
  r.line(ax, ay + 2, bx, by + 2); r.line(ax, ay + 3, bx, by + 3);
  r.line(lx, ly + 1, mx, my + 1); r.line(lx, ly + 2, mx, my + 2);
  return r;
}

/** The pictures going right, then (mirrored in the 16 pixels) going left: pull, glide, push, glide. */
const RIGHT = STROKES.map((s) => swimmer(s).rows());
export const SWIM_RIGHT: readonly (readonly string[])[] = RIGHT;
export const SWIM_LEFT: readonly (readonly string[])[] = RIGHT.map(mirrored);

/** The stroke's cycle as the three pictures' order in a pointer list (a glide between each stroke). */
export const SWIM_ORDER = [0, 1, 0, 2] as const;

/** A picture's sprite block. */
export const swimBlock = (name: string, rows: readonly string[]): Uint8Array => itemBlock(name, rows);

/** The lei as a crown above the mask: its own sprite picture (a 16 x 16 block), the same going each way but mirrored (its rows put on the head's top). */
function crown(left: boolean): readonly string[] {
  const r = new Raster(16, 16);
  const x0 = left ? 1 : 5;
  r.stamp(LEI, x0, 1);
  return r.rows();
}
export const SWIM_CROWN = { left: crown(true), right: crown(false) } as const;
