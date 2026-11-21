/**
 * Rio's items and moving parts for Monty Mole: World Tour (region 7): the key to the city, the headdress and the straw hat (the
 * costume's picture as an item), the churrasco skewer (the food in place of the cupcake), the acai bowl (the treasure of the finale), the
 * sun that sets over the finale, the cable car's two sprites, and the gaucho's swinging skewer in its four poses each way. Hires sprite
 * blocks as the earlier regions' items are: a solid shape with the detail cut into it.
 */
import { itemBlock, mirrored, spriteBlock } from './pixels';
import { HEADDRESS_HAT, RIO_HAT_COLOUR, STRAW_HAT } from './rio-hat';
import { over, Raster } from './raster';
import type { NewItem } from './types';

const pad16 = (rows: readonly string[]): readonly string[] => [...rows, ...Array.from({ length: 16 - rows.length }, () => '.'.repeat(16))];

/** The key to the city: a big brass key, a ring bow with a clover cut in it, a long shaft and two teeth. */
function cityKey(): NewItem {
  const r = new Raster(16, 16);
  r.disc(4.5, 7.5, 4.6); // the bow
  r.ellipse(4.5, 7.5, 2.3, 2.3, false);
  r.cut(['.#.', '###', '.#.'], 3.5, 6.5);
  r.rect(8, 7, 15, 8); // the shaft
  r.rect(12, 9, 13, 11); r.rect(15, 9, 15, 10); // the teeth
  r.rect(10, 7, 10, 8, false); // a ring on the shaft
  return { block: itemBlock('cityKey', r.rows()), colour: 7 };
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

/** The sun of the finale (a sprite shown expanded to twice its size): a disc with a ring cut in it and a few rays. 24 x 21. */
function sun(): Uint8Array {
  const r = new Raster(24, 21);
  r.disc(11.5, 10, 8);
  r.ellipse(11.5, 10, 5.6, 5.6, false); r.disc(11.5, 10, 4);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + 0.2; r.line(11.5 + Math.cos(a) * 9.5, 10 + Math.sin(a) * 9.5, 11.5 + Math.cos(a) * 11.5, 10 + Math.sin(a) * 10.5); }
  return spriteBlock('sun', r.rows());
}
export const SUN = { block: sun(), colour: 7 } as const;

export const RIO_ITEMS = {
  cityKey: cityKey(),
  headdress: headdressItem(),
  strawHat: strawItem(),
  skewer: skewer(),
  acaiBowl: acaiBowl(),
} as const satisfies Record<string, NewItem>;

export type RioItem = keyof typeof RIO_ITEMS;

// ---- the cable car

/** The car's upper sprite, over Monty's head: the grip's wheel on the cable, the hanger, and the roof's rounded edge. */
function carTop(): Uint8Array {
  const r = new Raster(24, 21);
  r.disc(11.5, 2.5, 2.8); r.rect(11, 2, 12, 3, false); // the wheel on the cable
  r.rect(10, 5, 13, 9); r.rect(11, 6, 12, 8, false); // the hanger
  r.rect(0, 11, 23, 14); r.rect(0, 11, 0, 11, false); r.rect(23, 11, 23, 11, false); // the roof
  r.rect(2, 13, 21, 13, false);
  r.rect(0, 15, 1, 20); r.rect(11, 15, 12, 20); r.rect(22, 15, 23, 20); // the glass's mullions
  return spriteBlock('car top', r.rows());
}

/** The car's lower sprite, in front of Monty's feet: the mullions, a rail at chest height and the floor's plate with its skirt. */
function carBottom(): Uint8Array {
  const r = new Raster(24, 21);
  r.rect(0, 0, 1, 11); r.rect(11, 0, 12, 11); r.rect(22, 0, 23, 11); // the mullions
  r.rect(0, 3, 23, 4); // the rail
  r.rect(0, 12, 23, 16); r.rect(0, 12, 1, 12, false); r.rect(22, 12, 23, 12, false);
  r.rect(2, 14, 21, 14, false); // the plate's groove
  r.rect(3, 17, 20, 19); r.rect(5, 18, 18, 18, false); // the skirt
  return spriteBlock('car bottom', r.rows());
}

export const CABLE_CAR = { top: carTop(), bottom: carBottom(), colour: 1 } as const;

// ---- the gaucho's swinging skewer

/** A skewer pose: the sprite block, and where it goes from the gaucho's sprite (its top left): the block's pivot lands on his raised hand. */
export interface SkewerPose { readonly block: Uint8Array; readonly dx: number; readonly dy: number }

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

/** The poses facing left, and mirrored for facing right. */
export const SKEWER_POSES: { readonly left: readonly SkewerPose[]; readonly right: readonly SkewerPose[] } = {
  left: POSES.map((p) => ({ block: spriteBlock('skewer pose', poseRows(p.deg, p.px, p.py, p.len)), dx: HAND_LEFT.x - p.px, dy: HAND_LEFT.y - p.py })),
  right: POSES.map((p) => ({ block: spriteBlock('skewer pose', mirrored(poseRows(p.deg, p.px, p.py, p.len))), dx: HAND_RIGHT.x - (23 - p.px), dy: HAND_RIGHT.y - p.py })),
};
export const SKEWER_COLOUR = 8;

/** Every sprite of the region as a list for the preview sheets. */
export const RIO_SPRITES: Readonly<Record<string, NewItem>> = {
  ...RIO_ITEMS,
  sun: SUN,
  carTop: { block: CABLE_CAR.top, colour: CABLE_CAR.colour },
  carBottom: { block: CABLE_CAR.bottom, colour: CABLE_CAR.colour },
  skewerDown: { block: SKEWER_POSES.left[0]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerLow: { block: SKEWER_POSES.left[1]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerFwd: { block: SKEWER_POSES.left[2]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
  skewerUp: { block: SKEWER_POSES.left[3]?.block ?? new Uint8Array(63), colour: SKEWER_COLOUR },
};
