/**
 * The New Year dragon's pieces for Monty Mole: World Tour (region 3): a head (mouth open and shut, going left and right), a body piece and a tail, each a
 * 24 x 21 hires sprite block (the mechanism, dragons.ts, strings them along a path). Bold shapes with the detail cut into them as black lines, as the creatures.
 */
import { mirrored, spriteBlock } from './pixels';
import { limb, Raster } from './raster';

const W = 24, H = 21;

/** The head going left: a great square snout with its mouth open on fangs, a flaring nostril, a big round eye under a heavy brow, horns and a mane of spikes. */
function headRows(open: boolean): readonly string[] {
  const r = new Raster(W, H);
  r.rect(0, 6, 12, open ? 11 : 13); // the upper jaw's snout
  r.rect(0, open ? 15 : 13, 11, open ? 19 : 14); // the lower jaw
  if (open) r.rect(1, 12, 12, 14, false); // the mouth
  r.ellipse(14, 12, 7.5, 8.2); // the brow and cheek
  r.triangle(10, 4, 17, 0, 15, 6); r.triangle(15, 4, 22, 1, 20, 7); // the horns
  for (const [x, y] of [[20, 8], [22, 12], [22, 16], [20, 19]] as const) r.triangle(x, y - 2, x + 2, y, x, y + 2); // the mane
  r.rect(2, 7, 3, 8, false); // the nostril
  r.ellipse(11, 8, 2.8, 2.6, false); r.rect(10, 8, 11, 9); // the eye, a pupil
  r.line(7, 4, 13, 6, false); // the heavy brow's line
  if (open) for (const x of [2, 5, 8]) { r.rect(x, 11, x, 12); r.rect(x + 1, 14, x + 1, 15); } // the fangs
  r.line(0, 5, 0, 1); r.line(1, 4, 0, 0); // a whisker
  return r.rows();
}

/** A body piece: a fat rounded stretch of the dragon with scales cut in it in rows, a ridge of spikes along the top, two claws below. */
function bodyRows(): readonly string[] {
  const r = new Raster(W, H);
  r.ellipse(11.5, 11, 11.5, 7.2); // the body
  for (const x of [3, 8, 13, 18]) r.triangle(x, 4, x + 2, 0, x + 4, 4); // the spikes along its back
  for (const [x, y] of [[5, 8], [10, 8], [15, 8], [8, 12], [13, 12], [18, 12], [5, 15], [10, 15], [15, 15]] as const) { r.rect(x - 1, y, x + 2, y, false); r.rect(x - 1, y + 1, x - 1, y + 1, false); r.rect(x + 2, y + 1, x + 2, y + 1, false); } // the scales
  r.rect(5, 18, 7, 20); r.rect(15, 18, 17, 20); r.rect(5, 20, 6, 20, false); r.rect(16, 20, 17, 20, false); // the claws
  return r.rows();
}

/** The tail: the body tapering to a point that curls up into a tuft of flame-like hair. */
function tailRows(): readonly string[] {
  const r = new Raster(W, H);
  r.ellipse(8, 12, 8, 6.2);
  r.triangle(12, 9, 22, 11, 12, 15); // the taper
  limb(r, 19, 11, 22, 5, 2); // the curl up
  for (const [x, y] of [[18, 5], [21, 2], [23, 7]] as const) r.triangle(x, y + 3, x + 1, y - 2, x + 2, y + 3); // the tuft of flame
  for (const [x, y] of [[3, 9], [7, 9], [5, 13], [9, 13]] as const) { r.rect(x, y, x + 2, y, false); r.set(x, y + 1, false); r.set(x + 2, y + 1, false); } // the scales
  return r.rows();
}

export const DRAGON_PICTURES = {
  headLeftOpen: spriteBlock('dragon head left open', headRows(true)),
  headLeftShut: spriteBlock('dragon head left shut', headRows(false)),
  headRightOpen: spriteBlock('dragon head right open', mirrored(headRows(true))),
  headRightShut: spriteBlock('dragon head right shut', mirrored(headRows(false))),
  body: spriteBlock('dragon body', bodyRows()),
  tailLeft: spriteBlock('dragon tail', tailRows()),
  tailRight: spriteBlock('dragon tail right', mirrored(tailRows())),
} as const;
