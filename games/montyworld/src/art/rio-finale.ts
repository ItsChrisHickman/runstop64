/**
 * The finale's pictures (finale.ts): Copacabana in close-up, every actor in expanded sprites (twice as wide and tall, as the VIC can) so
 * each beat reads at 1x. The deckchair (a multicolour sprite: striped canvas on a wooden frame, side view, facing west, where the troupe comes from),
 * the acai bowl (multicolour: a wooden bowl heaped with purple acai, banana slices on top) and its berries (a hires sprite in front of it, one
 * eaten at each spoonful), the bowl scraped empty, Monty's own pictures sitting in the chair (his arm to the bowl, up, to his mouth, and
 * chewing with his eyes shut happy) with the spoon in his hand (a white sprite of its own) and dancing (arms up one way and the other); and the beach umbrella over the chair (a
 * decoration: red and white panels, its pole down to the sand).
 *
 * The chair and Monty share a frame of reference: his seated pictures are drawn where the chair's seat is in its block, so both sprites
 * stand at the same place. Colours are the finale's: wood and bowl brown (the sprites' first shared colour), canvas and banana white
 * (the second), the canvas's other stripes red and the acai purple (each sprite's own).
 */
import { decor } from './decorations';
import { mcBlock, mirrored, spriteBlock } from './pixels';
import { limb, over, Raster } from './raster';
import type { NewDecor } from './types';

/** The finale's shared sprite colours: the wood and the bowl (01), the canvas's white stripes and the banana (11). */
export const FINALE_MC = { wood: 9, white: 1 } as const;
/** The sprites' own colours: the canvas's red stripes, the acai, the berries, Monty (the engine's). */
export const FINALE_COLOURS = { canvas: 2, acai: 4, berries: 2, spoon: 1 } as const;

/** The deckchair from the side, drawn facing right (mirrored to face west): the canvas slung from the top of the back down to the seat in red and white bands, the wooden back rail behind it, the front bar, the crossed legs. */
const CHAIR: readonly string[] = [
  'a...........',
  'abb.........',
  'abbb........',
  '.accc.......',
  '.accc.......',
  '..abbb......',
  '..abbb......',
  '...accc.....',
  '...accc.....',
  '....abbb....',
  '....abbb....',
  '.....accc.aa',
  '.....acccca.',
  '......abbba.',
  '......aaaaa.',
  '......a...a.',
  '......aa.aa.',
  '.......aaa..',
  '.......aaa..',
  '......aa.aa.',
  '.....aa...aa',
];

/** The acai bowl, full: banana slices on the purple heap (the gaps in it are where the berries sprite shows), the brown bowl under it. At the top left of its block. */
const BOWL_FULL: readonly string[] = [
  '.c.c........',
  'b.bbb.......',
  'bbb.b.......',
  'aaaaa.......',
  'aaaaa.......',
  '.aaa........',
  ...Array.from({ length: 15 }, () => '............'),
];
/** The bowl scraped clean: its rim, the dark inside, a smear of acai. */
const BOWL_EMPTY: readonly string[] = [
  '............',
  '............',
  'a...a.......',
  'abbba.......',
  'aaaaa.......',
  '.aaa........',
  ...Array.from({ length: 15 }, () => '............'),
];

/** The berries in the bowl's gaps (hires, so two pixels a gap): three, then two, then one as he eats them. */
function berries(n: number): Uint8Array {
  const r = new Raster(24, 21);
  // (the gaps in the heap: between the banana slices on top, and one on each side lower down)
  const at = [[4, 0, 5, 0], [2, 1, 3, 1], [6, 2, 7, 2]] as const;
  at.slice(0, n).forEach(([x0, y0, x1, y1]) => r.rect(x0, y0, x1, y1));
  return spriteBlock(`berries ${n}`, r.rows());
}

// ---- Monty

/** Each spoonful's pose: the spoon in the bowl, on its way up, in his mouth, and chewing (the spoon down). */
type Spoon = 'dip' | 'up' | 'mouth' | 'chew';
/** Where his hand is in each pose (drawn facing right, mirrored after). */
const HAND = { dip: [17, 10], up: [17, 7], mouth: [17, 9], chew: [16, 12] } as const;

/** Monty's head facing right with its eye, snout and mouth (his eyes shut and smiling when he is happy, his mouth open for the spoon), on `r` with its top at `y0` and its back at `x0`. */
function head(r: Raster, x0: number, y0: number, look: 'open' | 'happy' | 'gape') {
  const h = new Raster(24, 21);
  h.disc(x0 + 4, y0 + 4, 4); // the head
  h.set(x0 + 3, y0 - 1); h.set(x0 + 5, y0 - 1); h.set(x0 + 4, y0 - 1); // the tuft
  h.ellipse(x0 + 8.5, y0 + 5, 2.6, 1.8); // the snout
  h.disc(x0 + 10.5, y0 + 4.3, 1.3); // the nose
  if (look === 'happy') { h.set(x0 + 5, y0 + 3, false); h.set(x0 + 6, y0 + 2, false); h.set(x0 + 7, y0 + 3, false); }
  else { h.rect(x0 + 5, y0 + 2, x0 + 7, y0 + 3, false); h.set(x0 + 6, y0 + 3); } // the eye, its pupil looking ahead
  if (look === 'gape') h.ellipse(x0 + 7.5, y0 + 7, 1.6, 1.1, false); // the mouth open
  else h.line(x0 + 6, y0 + 7, x0 + 9, y0 + 6.5, false); // the smile
  over(r, h);
}

/**
 * Monty sitting in the deckchair (in the chair's frame: his back against the canvas, his seat in its sling, his legs out over the front
 * bar), holding the bowl (its own sprite, in front of his lap) with the spoon in his other hand: in the bowl, on its way up, in his mouth,
 * then down while he chews with his eyes shut.
 */
function seated(spoon: Spoon): Uint8Array {
  const r = new Raster(24, 21);
  r.ellipse(12, 11, 4.5, 4); // the body
  const legs = new Raster(24, 21);
  legs.rect(15, 11, 20, 13); legs.ellipse(21.5, 10.5, 1.5, 3); // the legs out over the bar, the feet up
  over(r, legs);
  head(r, 6, 2, spoon === 'mouth' ? 'gape' : spoon === 'chew' ? 'happy' : 'open');
  // the arm (outlined, so it reads over him); the spoon in his hand is a sprite of its own, white (`spoonAt`)
  const arm = new Raster(24, 21);
  const [hx, hy] = HAND[spoon];
  limb(arm, 12, 10, hx, hy, 2);
  over(r, arm);
  return spriteBlock(`monty seated ${spoon}`, mirrored(r.rows()));
}

/** The spoon in his hand, in his seated picture's frame (a sprite over him and the bowl, in white): dipped in the acai, held up full, in his mouth. */
function spoonAt(pose: 'dip' | 'up' | 'mouth'): Uint8Array {
  const r = new Raster(24, 21);
  const [hx, hy] = HAND[pose];
  if (pose === 'dip') { r.line(hx, hy - 1, hx + 3, hy + 2); r.rect(hx + 3, hy + 1, hx + 4, hy + 2); } // into the heap
  if (pose === 'up') { r.line(hx, hy, hx + 2, hy - 3); r.rect(hx + 2, hy - 5, hx + 3, hy - 4); } // held up, full
  if (pose === 'mouth') { r.line(hx, hy, hx - 2, hy); r.rect(hx - 4, hy - 1, hx - 3, hy); } // into his open mouth
  return spriteBlock(`spoon ${pose}`, mirrored(r.rows()));
}

/** Monty dancing, standing (feet on the block's row 15, as his walk's are): arms up to one side, then the other, a knee up. Drawn facing right, mirrored to face the troupe. */
function dancing(side: 'left' | 'right'): Uint8Array {
  const r = new Raster(24, 21);
  r.ellipse(7.5, 10, 4.5, 4); // the body
  const legs = new Raster(24, 21);
  if (side === 'left') { legs.rect(4, 13, 5, 15); legs.rect(3, 15, 6, 15); legs.rect(9, 12, 11, 13); legs.rect(11, 12, 12, 14); } // standing on one foot, the other knee up
  else { legs.rect(9, 13, 10, 15); legs.rect(8, 15, 12, 15); legs.rect(3, 12, 5, 13); legs.rect(2, 12, 3, 14); }
  over(r, legs);
  head(r, 2, 1, 'happy');
  const arms = new Raster(24, 21);
  if (side === 'left') { limb(arms, 4, 9, 1, 3, 2); limb(arms, 11, 9, 14, 6, 2); }
  else { limb(arms, 4, 9, 1, 12, 2); limb(arms, 11, 9, 14, 2, 2); }
  over(r, arms);
  return spriteBlock(`monty dancing ${side}`, mirrored(r.rows()));
}

/** The blocks of the finale, by name (finale.ts puts them at its pointers; the data loads them with the beach). */
export const FINALE_PICTURES = {
  chair: mcBlock('deckchair', mirrored(CHAIR)),
  bowlFull: mcBlock('acai bowl', BOWL_FULL),
  bowlEmpty: mcBlock('acai bowl empty', BOWL_EMPTY),
  berries3: berries(3),
  berries2: berries(2),
  berries1: berries(1),
  spoonDip: spoonAt('dip'),
  spoonUp: spoonAt('up'),
  spoonMouth: spoonAt('mouth'),
  sitDip: seated('dip'),
  sitUp: seated('up'),
  sitMouth: seated('mouth'),
  sitChew: seated('chew'),
  danceLeft: dancing('left'),
  danceRight: dancing('right'),
} as const;
export type FinalePicture = keyof typeof FINALE_PICTURES;

/** His head on the seated and dancing pictures (facing left): the column of its middle and its top row (the tuft), where the headdress's crest goes. */
export const FINALE_HEADS = { seated: { cx: 13, top: 1 }, dancing: { cx: 17, top: 0 } } as const;
/** Where the bowl's block goes from his seated picture's (pixels): held on his lap in front of him. */
export const BOWL_ON_LAP = { x: 2, y: 10 } as const;

// ---- the umbrella

/** A beach umbrella's canopy from the side: a low dome with a scalloped hem and a finial, its panels red and white in turn (a colour a character). 8 x 2 characters. */
function umbrella(): NewDecor {
  const r = new Raster(64, 16);
  r.ellipse(31.5, 15, 31, 13); // the dome
  r.rect(0, 15, 63, 15, false);
  for (let x = 0; x < 64; x += 8) r.ellipse(x + 3.5, 15.5, 3, 1.5, false); // the scallops
  r.rect(31, 0, 32, 2); // the finial
  for (let x = 8; x < 64; x += 8) r.line(x, 4, x, 12, false); // the seams
  return decor('rioUmbrella', 8, 2, r, ['21212121', '21212121']);
}

/** Its pole: a white pole from the canopy down to the sand, 1 x 6 characters (it stands on the promenade under the canopy at row 11). */
function umbrellaPole(): NewDecor {
  const r = new Raster(8, 48);
  r.rect(6, 0, 7, 47);
  return decor('rioPole', 1, 6, r, 1);
}

export const FINALE_DECOR = { rioUmbrella: umbrella(), rioPole: umbrellaPole() } as const;
