/**
 * The sea serpent (the sea cave's big creature, like China's New Year dragon): a head (mouth open and shut, going left and right), a body piece and a tail, each a 24 x 21 hires sprite block that
 * the mechanism (dragons.ts) strings along a path. They are put into the blocks China's dragon has in China while the cave is loaded (`roomBlocks`, data.ts). Bold shapes with the detail cut in as black lines.
 */
import { mirrored, spriteBlock } from './pixels';
import { Raster } from './raster';

const W = 24, H = 21;

/** The serpent's head going left: a long snout with a toothed jaw, a crest of fins swept back, a round eye under a brow, gill slits. */
function head(open: boolean): readonly string[] {
  const r = new Raster(W, H);
  r.ellipse(12, 11, 11, 7); // the head
  r.rect(0, 8, 8, open ? 11 : 13); r.rect(0, open ? 15 : 13, 8, open ? 17 : 14); // the snout, the jaw
  if (open) {
    r.rect(1, 12, 9, 14, false);
    for (const x of [2, 4, 6]) { r.rect(x, 11, x, 12); r.rect(x + 1, 14, x + 1, 15); } // the teeth
  }
  r.triangle(10, 5, 17, 0, 16, 6); r.triangle(15, 5, 23, 2, 20, 8); r.triangle(18, 8, 23, 7, 21, 12); // the crest of fins
  r.ellipse(11, 8, 2.6, 2.4, false); r.rect(10, 8, 11, 9); // the eye
  r.line(7, 6, 13, 7, false); // the brow
  r.rect(15, 11, 15, 15, false); r.rect(17, 11, 17, 15, false); // the gill slits
  r.rect(2, 9, 2, 9, false); // the nostril
  return r.rows();
}

/** A body piece: a fat length of the serpent, scales in rows, a fin up its back and a fin below. */
function body(): readonly string[] {
  const r = new Raster(W, H);
  r.ellipse(11.5, 11, 11.5, 6.4);
  r.triangle(5, 5, 9, 0, 13, 5); r.triangle(11, 5, 16, 1, 20, 5); // the dorsal fin
  r.triangle(6, 17, 10, 20, 14, 16); // the fin below
  for (const [x, y] of [[4, 8], [9, 8], [14, 8], [6, 12], [11, 12], [16, 12], [4, 15], [9, 15]] as const) { r.rect(x, y, x + 3, y, false); r.set(x, y + 1, false); r.set(x + 3, y + 1, false); } // the scales
  return r.rows();
}

/** The tail going left (its tip pointing right): the body tapering to a broad fluke. */
function tail(): readonly string[] {
  const r = new Raster(W, H);
  r.ellipse(7, 11, 7, 5.6);
  r.triangle(10, 9, 18, 11, 10, 13); // the taper
  r.triangle(17, 11, 23, 3, 22, 10); r.triangle(17, 11, 23, 19, 22, 12); // the fluke
  for (const [x, y] of [[2, 9], [6, 9], [4, 13], [8, 13]] as const) { r.rect(x, y, x + 2, y, false); r.set(x, y + 1, false); r.set(x + 2, y + 1, false); } // the scales
  return r.rows();
}

export const SERPENT_PICTURES = {
  headLeftOpen: spriteBlock('serpent head left open', head(true)),
  headLeftShut: spriteBlock('serpent head left shut', head(false)),
  headRightOpen: spriteBlock('serpent head right open', mirrored(head(true))),
  headRightShut: spriteBlock('serpent head right shut', mirrored(head(false))),
  body: spriteBlock('serpent body', body()),
  tailLeft: spriteBlock('serpent tail left', tail()),
  tailRight: spriteBlock('serpent tail right', mirrored(tail())),
} as const;
