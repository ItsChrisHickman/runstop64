/**
 * The Willow Pattern room's pictures: the game's bridge scene (a long arched bridge across the room, three giants in big hats crouched on its parapet reaching down,
 * the river below with its stepping stones, clouds and doves) drawn in the plate's look (blue line-work on the black screen, white where it reads): the great drooping
 * willow, the pagoda and its round-crowned trees, the boat, the two kissing birds, the zigzag fence. Solid ink with the detail cut into it, never a dither.
 */
import { swept } from './china-city';
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** The great weeping willow: a trunk leaning up and right from the bank, a few boughs arching over from its crown, long thin strands falling from them to the ground, a leaf notched on each now and then. 5 x 6 characters. */
function willowTree(): NewDecor {
  const r = new Raster(40, 48);
  for (let k = 0; k < 4; k++) r.line(9 + k, 47, 11 + k, 34); // the trunk
  for (let k = 0; k < 3; k++) r.line(11 + k, 34, 15 + k, 15);
  r.rect(12, 45, 12, 47, false); r.rect(13, 38, 13, 40, false); // splits in the bark
  r.line(7, 47, 9, 44); r.line(13, 47, 16, 45); // the roots spreading
  const top = { x: 16, y: 14 };
  const bough = (xe: number, ye: number, lift: number, every: number, from: number) => {
    const n = 40;
    const at = (i: number) => ({ x: top.x + (xe - top.x) * (i / n), y: top.y + (ye - top.y) * (i / n) - lift * 4 * (i / n) * (1 - i / n) });
    for (let i = 0; i <= n; i++) { const p = at(i); r.set(p.x, p.y); r.set(p.x, p.y + 1); }
    for (let i = from; i <= n; i += every) { // a strand: a thin line falling in a slow sway, notched with a leaf
      const p = at(i);
      for (let j = 2; p.y + j < 47; j++) {
        const sx = p.x + Math.sin(j / 7 + i * 0.7) * 1.2;
        r.set(sx, p.y + j);
        if (j % 6 === 3) r.set(sx + (i % 2 ? 1 : -1), p.y + j + 1);
      }
    }
  };
  bough(0, 22, 9, 5, 3); bough(10, 8, 6, 7, 4); bough(34, 20, 10, 5, 3); bough(39, 36, 7, 8, 8);
  return decor('willowTree', 5, 6, r, 14);
}

/** An orchard tree of the plate: a crown of round tufts, each a ring round a dot, on a short trunk. 2 x 2 characters. */
function roundTree(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(7, 12, 8, 15);
  for (const [cx, cy, rad] of [[8, 3.6, 3.6], [4, 7.4, 3.3], [12, 7.4, 3.3], [8, 9, 2.8]] as const) { r.disc(cx, cy, rad); r.ellipse(cx, cy, rad - 1.7, rad - 1.7, false); r.set(cx, cy); }
  return decor('roundTree', 2, 2, r, ['EE', 'EE']);
}

/** The tower of the plate's teahouse: three tiers of swept roofs over storeys with their windows, a spire and ball on top, a step at its foot. 3 x 6 characters. */
function pagoda(): NewDecor {
  const r = new Raster(24, 48);
  r.rect(11, 0, 12, 4); r.disc(11.5, 3, 1.6); r.rect(10, 5, 13, 5); // the spire and its ball
  const tiers = [{ y: 6, x0: 6, x1: 17 }, { y: 20, x0: 2, x1: 21 }, { y: 34, x0: 0, x1: 23 }];
  tiers.forEach(({ y, x0, x1 }, k) => {
    swept(r, x0, x1, y, y + 5, 3, false); // the roof, its eaves curling up at the corners
    r.rect(x0 + 2, y + 7, x1 - 2, y + 12); // the storey
    r.rect(x0 + 2, y + 7, x1 - 2, y + 7, false); // the shadow under the eave
    const windows = k === 0 ? [10] : k === 1 ? [7, 13] : [5, 10, 15];
    for (const x of windows) { r.rect(x, y + 9, x + 2, y + 12, false); r.rect(x + 1, y + 9, x + 1, y + 12); } // a window and its post
  });
  r.rect(3, 46, 20, 47);
  return decor('pagoda', 3, 6, r, 14);
}

/** The stone bridge's bay drawn into `r` with its top at `y0`: a coping, a parapet of dressed blocks over courses of stone, the wall pierced by a round arch with its voussoirs. 32 x 16 pixels. */
function bay(r: Raster, y0: number) {
  const at = (x0: number, y: number, x1: number, y1 = y) => r.rect(x0, y0 + y, x1, y0 + y1, false);
  r.rect(0, y0, 31, y0 + 15);
  at(0, 2, 31); // under the coping
  at(0, 5, 31); for (const x of [8, 24]) at(x, 3, x, 4); for (const x of [0, 16]) at(x, 6, x, 7); // the parapet's courses and joints
  for (let y = 8; y < 16; y++) for (let x = 0; x < 32; x++) if (((x - 15.5) / 11.5) ** 2 + ((y - 15.5) / 7.5) ** 2 <= 1) r.set(x, y0 + y, false); // the arch
  at(5, 15, 26);
  at(0, 11, 2); at(29, 12, 31); // a course in each pier
}

/** One bay of the long stone bridge: a round arch under a parapet of dressed blocks. 4 x 2 characters. */
function archBridge(): NewDecor {
  const r = new Raster(32, 16);
  bay(r, 0);
  return decor('archBridge', 4, 2, r, ['FFFF', 'CCCC']);
}

/**
 * A giant crouched on the bridge, in front of one of its bays: a great straw hat (woven in rays and rings) over a green face with glaring eyes and a wide mouth, the
 * shoulders of a robe on the parapet, two sleeves hanging down over the arch (where the arms reach on from, below). The bay's piers show either side. 4 x 5 characters.
 * Hat gold, face green, robe light blue, the bridge grey.
 */
function crouchFigure(): NewDecor {
  const r = new Raster(32, 40);
  bay(r, 24); // the bridge behind: parapet row and arch row
  r.rect(8, 24, 23, 39, false); // (the giant in front of the bay's middle)
  r.triangle(15.5, 0, 0, 13, 31, 13); r.rect(0, 12, 31, 14); // the hat, wide as a roof
  for (const x of [3, 8, 12.5, 15.5, 18.5, 23, 28]) r.line(15.5, 2, x, 11, false); // the rays of its weave
  r.rect(11, 5, 20, 5, false); r.rect(7, 8, 24, 8, false); r.rect(3, 11, 28, 11, false); // the rings
  r.set(0, 14, false); r.set(31, 14, false); for (let x = 2; x < 30; x += 3) r.set(x, 14, false); // its ragged brim
  r.rect(10, 16, 21, 22); r.rect(11, 23, 20, 23); // the face, the chin
  r.rect(11, 18, 14, 19, false); r.rect(17, 18, 20, 19, false); r.rect(13, 18, 13, 19); r.rect(18, 18, 18, 19); // the eyes, a pupil in each
  r.line(10, 17, 14, 18, false); r.line(21, 17, 17, 18, false); // frowning brows
  r.rect(12, 21, 19, 21, false); r.set(12, 20, false); r.set(19, 20, false); // a wide mouth, its corners down
  for (const x of [14, 16, 18]) r.set(x, 22, false); // the teeth
  [[10, 21], [9, 22], [8, 23], [8, 23], [8, 23], [8, 23], [8, 23], [8, 23]].forEach(([x0, x1], j) => r.rect(x0 ?? 8, 24 + j, x1 ?? 23, 24 + j)); // the shoulders
  r.line(11, 24, 15, 28, false); r.line(20, 24, 16, 28, false); // the robe's collar, crossing
  r.rect(8, 32, 23, 39); // the sleeves hanging over the arch
  r.rect(15, 31, 16, 39, false); r.rect(8, 31, 8, 31, false); r.rect(23, 31, 23, 31, false); r.rect(8, 32, 8, 39, false); r.rect(23, 32, 23, 39, false); // outlined in black, two
  r.rect(9, 35, 14, 35, false); r.rect(17, 35, 22, 35, false); // the sleeves' creases
  return decor('crouchFigure', 4, 5, r, ['7777', '7777', '0550', 'FEEF', 'CEEC']);
}

/** Puffy cloud of the sky: three lobes, a level base, strata cut in. 3 x 2 characters. */
function cloud(): NewDecor {
  const r = new Raster(24, 16);
  for (const [cx, cy, rad] of [[6, 10, 4.5], [11, 7, 5.5], [17, 9, 5.5]] as const) r.disc(cx, cy, rad);
  r.rect(2, 11, 21, 13);
  r.rect(3, 12, 9, 12, false); r.rect(12, 10, 19, 10, false); r.rect(8, 8, 12, 8, false);
  return decor('cloud', 3, 2, r, 1);
}

/** The two birds of the plate, beak to beak: each a great wing raised over a slim body, a fanned tail, a head and beak. 5 x 2 characters. */
function kissingDoves(): NewDecor {
  const r = new Raster(40, 16);
  const bird = (flip: boolean) => {
    const f = (x: number) => (flip ? 39 - x : x);
    r.ellipse(f(10), 11.5, 6.5, 3.2); // the body
    r.triangle(f(5), 10.5, f(0), 8, f(1), 14); // the tail
    r.disc(f(16.5), 9.5, 2.7); // the head
    r.triangle(f(18.6), 8.6, f(18.6), 10.6, f(20), 9.6); // the beak
    r.triangle(f(6), 9, f(14), 9, f(4), 0); // the wing, swept up and back
    r.line(f(8), 8, f(6), 3, false); // a feather
    r.line(f(5), 10.5, f(14), 10.5, false); // the wing's root, black against the body
    r.set(f(16.5), 9, false); // the eye
  };
  bird(false); bird(true);
  return decor('kissingDoves', 5, 2, r, 1);
}

/** A sampan far off on the water, its boatman under a woven awning, a pole. 3 x 1 characters. */
function plateBoat(): NewDecor {
  const r = new Raster(24, 8);
  r.ellipse(9, 2.5, 5, 2.4); r.rect(5, 3, 13, 3); // the awning
  r.rect(7, 3, 7, 3, false); r.rect(11, 3, 11, 3, false);
  r.line(20, 0, 17, 7); // the pole
  r.triangle(1, 4, 22, 4, 18, 7); r.rect(1, 4, 22, 4); r.rect(5, 6, 16, 6, false);
  return decor('plateBoat', 3, 1, r, 1);
}

/** A zigzag fence: two rails going up and down on their posts. 2 x 1 characters. */
function plateFence(): NewDecor {
  const r = new Raster(16, 8);
  for (let x = 0; x < 16; x++) { const y = Math.abs(((x + 2) % 8) - 4) + 1; r.set(x, y); r.set(x, y + 1); }
  r.rect(0, 0, 0, 7); r.rect(8, 0, 8, 7);
  return decor('plateFence', 2, 1, r, 1);
}

export const PLATE_DECOR = { willowTree: willowTree(), roundTree: roundTree(), pagoda: pagoda(), archBridge: archBridge(), crouchFigure: crouchFigure(), cloud: cloud(), kissingDoves: kissingDoves(), plateBoat: plateBoat(), plateFence: plateFence() } as const satisfies Record<string, NewDecor>;
