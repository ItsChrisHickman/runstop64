/**
 * Rio's items and moving parts for Monty Mole: World Tour (region 7): the crank, the headdress and the straw hat (the
 * costume's picture as an item), the churrasco skewer (the food in place of the cupcake), the acai bowl (the treasure of the finale), the
 * agent squashed flat and his hat, the can of guarana (the run: Rio's rush downhill), and the gaucho's swinging skewer in its four poses each way. Hires sprite
 * blocks as the earlier regions' items are: a solid shape with the detail cut into it.
 */
import { itemBlock, mirrored, spriteBlock } from './pixels';
import { HEADDRESS_HAT, RIO_HAT_COLOUR, STRAW_HAT } from './rio-hat';
import { over, Raster } from './raster';
import type { NewItem } from './types';

const pad16 = (rows: readonly string[]): readonly string[] => [...rows, ...Array.from({ length: 16 - rows.length }, () => '.'.repeat(16))];

/** The crank: the carnival float crew's winch handle (left on the floats' stage), an iron arm bent twice with a wooden grip at one end and the square socket that fits a winch at the other. */
function crank(): NewItem {
  const r = new Raster(16, 16);
  r.rect(1, 1, 5, 5); r.rect(2, 2, 4, 4, false); // the socket
  r.rect(4, 3, 11, 4); // the arm
  r.rect(10, 3, 11, 12); // its bend down
  r.rect(9, 10, 14, 15); r.rect(10, 11, 13, 14, false); r.rect(11, 11, 12, 14); // the wooden grip
  return { block: itemBlock('crank', r.rows()), colour: 8 };
}

/** The headdress as an item: the picture it is worn as. */
const headdressItem = (): NewItem => ({ block: itemBlock('headdress', pad16(HEADDRESS_HAT)), colour: RIO_HAT_COLOUR });
/** The straw hat as an item. */
const strawItem = (): NewItem => ({ block: itemBlock('straw hat', pad16(STRAW_HAT)), colour: RIO_HAT_COLOUR });

/** A churrasco skewer: chunks of meat, onion and pepper threaded on a steel rod, slanting up to the right, the rod bare at both ends. */
function skewer(): NewItem {
  const r = new Raster(16, 16);
  r.line(0, 15, 15, 0); r.line(1, 15, 15, 1); // the rod (two pixels thick)
  for (const [cx, cy, rad] of [[4, 11, 2.7], [7.5, 8, 2.9], [11, 5, 2.7]] as const) {
    const chunk = new Raster(16, 16); chunk.disc(cx, cy, rad); over(r, chunk);
    r.cut(['#'], cx - 1, cy - 1); // a juicy gleam
  }
  r.rect(13, 1, 15, 3, false); r.line(13, 3, 15, 1);
  return { block: itemBlock('skewer', r.rows()), colour: 2 };
}

/** The acai bowl: a deep purple bowl heaped with sliced banana, berries and granola, a spoon standing in it. */
function acaiBowl(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 8, 7, 4); // the heap, round on top
  r.rect(0, 9, 15, 10);
  r.ellipse(7.5, 9, 7.6, 1.4, false); // the rim's line
  r.ellipse(7.5, 12, 7.2, 3.6); r.rect(0, 9, 15, 11, false); r.rect(1, 10, 14, 12); // the bowl's belly
  r.rect(4, 15, 11, 15); // the foot
  for (const [x, y] of [[3, 6], [7, 5], [11, 6]] as const) { r.cut(['.##.', '#..#', '#..#', '.##.'], x - 1, y - 1); } // banana slices, rings on the heap
  r.cut(['##'], 5, 8); r.cut(['##'], 9, 8); // berries
  r.line(12, 0, 9, 7); r.line(13, 0, 10, 7); // the spoon
  r.rect(9, 8, 10, 9, false);
  return { block: itemBlock('acaiBowl', r.rows()), colour: 4 };
}

/** A can of guarana, Brazil's own soda (the berry of the Amazon's guarana vine on its green can): the rim and ring-pull, the label's band, the berry's eye on it. Drunk at the Redeemer, it puts Monty truly on the run. */
function guarana(): NewItem {
  const r = new Raster(16, 16);
  r.rect(4, 1, 11, 15); r.rect(5, 0, 10, 0); r.rect(5, 16, 10, 16); // the can, its rounded rims
  r.rect(4, 2, 11, 2, false); r.rect(7, 0, 8, 0, false); // the rim's groove, the ring-pull's gap
  r.rect(4, 5, 11, 5, false); r.rect(4, 12, 11, 12, false); // the label's band
  r.disc(7.5, 8.5, 2.6); r.rect(6, 7, 9, 10, false); r.rect(7, 8, 8, 9); // the berry, split open: its dark seed's eye
  r.rect(13, 3, 13, 4); r.rect(14, 6, 14, 7); // a fizz of bubbles
  return { block: itemBlock('guarana', r.rows()), colour: 5 };
}

export const RIO_ITEMS = {
  crank: crank(),
  guarana: guarana(),
  headdress: headdressItem(),
  strawHat: strawItem(),
  skewer: skewer(),
  acaiBowl: acaiBowl(),
} as const satisfies Record<string, NewItem>;

export type RioItem = keyof typeof RIO_ITEMS;

// ---- the gaucho's swinging skewer

/** A skewer pose: the sprite block, and where it goes from the gaucho's sprite (its top left): the block's pivot lands on his raised hand. */
export interface SkewerPose { readonly block: Uint8Array; readonly dx: number; readonly dy: number; /** The boxes of its inked pixels (strips of `STRIP` rows, each the ink's extent), from the block's top left: what kills. */ readonly hit: readonly { x: number; y: number; w: number; h: number }[] }

/** The gaucho's raised hand, in his 16 x 16 picture facing left (x, y), and facing right (mirrored). */
const HAND_LEFT = { x: 1, y: 5 } as const;
const HAND_RIGHT = { x: 14, y: 5 } as const;
/** The four poses, from his hand: pointing down, forward and low, straight forward, forward and up: the angle above horizontal (degrees, forward is left) and where the hand is in the block. */
const POSES = [
  { deg: -80, px: 22, py: 0, len: 19 },
  { deg: -45, px: 22, py: 1, len: 21 },
  { deg: 0, px: 22, py: 10, len: 22 },
  { deg: 45, px: 22, py: 20, len: 22 },
] as const;

/** One pose as rows of a 24 x 21 block, skewer going left from the hand: a rod with chunks of meat and a point. */
function poseRows(deg: number, px: number, py: number, len: number): string[] {
  const r = new Raster(24, 21);
  const a = (deg * Math.PI) / 180, dx = -Math.cos(a), dy = -Math.sin(a);
  const at = (t: number) => [px + dx * t, py + dy * t] as const;
  const [x1, y1] = at(len);
  r.line(px, py, x1, y1);
  const [x2, y2] = at(len - 1); r.line(px, py + 1, x2, y2 + 1);
  for (const t of [6, 11, 16]) {
    const [cx, cy] = at(t);
    const chunk = new Raster(24, 21); chunk.disc(cx, cy, 2.6); over(r, chunk);
  }
  r.disc(px, py, 1.5);
  return r.rows();
}

/** The kill boxes of a sprite block: the inked pixels' extent in each strip of this many rows (a diagonal is a staircase of small boxes, not its whole corner). */
const STRIP = 3;
function hitBoxes(block: Uint8Array): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let y = 0; y < 21; y += STRIP) {
    let lo = 24, hi = -1;
    for (let r = y; r < Math.min(21, y + STRIP); r++) for (let x = 0; x < 24; x++) if (((block[r * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) !== 0) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    if (hi >= lo) out.push({ x: lo, y, w: hi - lo + 1, h: Math.min(STRIP, 21 - y) });
  }
  return out;
}

/** The poses facing left, and mirrored for facing right. */
const pose = (rows: readonly string[], dx: number, dy: number): SkewerPose => { const block = spriteBlock('skewer pose', rows); return { block, dx, dy, hit: hitBoxes(block) }; };
export const SKEWER_POSES: { readonly left: readonly SkewerPose[]; readonly right: readonly SkewerPose[] } = {
  left: POSES.map((p) => pose(poseRows(p.deg, p.px, p.py, p.len), HAND_LEFT.x - p.px, HAND_LEFT.y - p.py)),
  right: POSES.map((p) => pose(mirrored(poseRows(p.deg, p.px, p.py, p.len)), HAND_RIGHT.x - (23 - p.px), HAND_RIGHT.y - p.py)),
};
export const SKEWER_COLOUR = 8;

/** Every sprite of the region as a list for the preview sheets. */
export const RIO_SPRITES: Readonly<Record<string, NewItem>> = {
  ...RIO_ITEMS,
  skewerDown: { block: SKEWER_POSES.left[0]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerLow: { block: SKEWER_POSES.left[1]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerFwd: { block: SKEWER_POSES.left[2]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerUp: { block: SKEWER_POSES.left[3]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
};
