/**
 * The Willow Pattern room's pictures: the game's bridge scene (a long arched bridge across the room, three giants in big hats crouched on its parapet reaching down,
 * the river below with its stepping stones, clouds and doves) drawn in the plate's look (blue line-work on the black screen, white where it reads): the great drooping
 * willow, the pagoda and its round-crowned trees, the boat, the two kissing birds, the zigzag fence. Solid ink with the detail cut into it, never a dither.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** The willow's crown: a thick trunk bending up and right, thin boughs arching out over the water, strands of leaf hanging from them in curtains. 6 x 5 characters. */
function willowTree(): NewDecor {
  const r = new Raster(48, 40);
  for (let k = 0; k < 4; k++) r.line(6 + k, 39, 10 + k, 26); // the trunk, thick
  for (let k = 0; k < 4; k++) r.line(10 + k, 26, 14 + k, 12);
  r.rect(8, 33, 8, 38, false); r.rect(11, 26, 11, 29, false); // splits in the bark
  const top = { x: 15, y: 11 };
  const bough = (xe: number, ye: number, h: number) => {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      r.set(top.x + (xe - top.x) * t, top.y + (ye - top.y) * t - h * 4 * t * (1 - t));
    }
    for (let i = 14; i <= 48; i += 4) { // the hanging strands, each with its leaves
      const t = i / 48;
      const x = top.x + (xe - top.x) * t, y0 = top.y + (ye - top.y) * t - h * 4 * t * (1 - t);
      const len = 7 + ((i * 7) % 11);
      for (let j = 0; j < len && y0 + j < 39; j++) {
        const sx = x + Math.sin(j / 4 + i) * 1.2;
        r.set(sx, y0 + j);
        if (j % 3 === 2) { r.set(sx - 1, y0 + j); r.set(sx + 1, y0 + j - 1); }
      }
    }
  };
  bough(1, 20, 6); bough(8, 27, 12); bough(27, 23, 13); bough(38, 27, 12); bough(47, 25, 7);
  return decor('willowTree', 6, 5, r, 14);
}

/** The willow's strands carried on down past the steps (under the crown). 2 x 3 characters. */
function willowCurtain(): NewDecor {
  const r = new Raster(16, 24);
  for (let x = 1; x < 16; x += 3) { const len = 5 + ((x * 7) % 15); for (let j = 0; j < len; j++) { const sx = x + Math.sin(j / 4 + x) * 1.2; r.set(sx, j); if (j % 3 === 2) { r.set(sx - 1, j); r.set(sx + 1, j - 1); } } }
  return decor('willowCurtain', 2, 3, r, 14);
}

/** A round-crowned tree of the plate's orchard: balls of leaf, each a ring with a dot, piled on a short trunk. 2 x 2 characters. */
function roundTree(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(7, 11, 8, 15);
  for (const [cx, cy, rad] of [[8, 3.6, 3.6], [4, 7.4, 3.3], [12, 7.4, 3.3], [8, 9, 2.8]] as const) { r.disc(cx, cy, rad); r.ellipse(cx, cy, rad - 1.7, rad - 1.7, false); r.set(cx, cy); }
  return decor('roundTree', 2, 2, r, ['EE', 'EE']);
}

/** The teahouse: three tiers of swept roofs on latticed storeys, a spire. 4 x 6 characters. */
function pagoda(): NewDecor {
  const r = new Raster(32, 48);
  r.rect(15, 0, 16, 4); r.ellipse(15.5, 5, 2, 1.6); // the spire and its ball
  [{ y: 6, w: 6 }, { y: 20, w: 9 }, { y: 34, w: 13 }].forEach(({ y, w }) => {
    r.triangle(16 - w - 1, y + 6, 16, y, 16 + w, y + 6); // the roof, its eaves curling up at the corners
    r.rect(16 - w - 2, y + 6, 16 + w + 1, y + 7);
    r.line(16 - w - 3, y + 4, 16 - w - 2, y + 6); r.line(16 + w + 2, y + 6, 16 + w + 3, y + 4);
    r.rect(16 - w + 1, y + 8, 16 + w - 1, y + 13); // the storey
    for (let x = 16 - w + 2; x <= 16 + w - 3; x += 3) r.rect(x, y + 9, x + 1, y + 12, false); // its windows
    r.rect(16 - w + 2, y + 2, 16 + w - 2, y + 2, false); // roof tile line
  });
  r.rect(4, 46, 27, 47);
  return decor('pagoda', 4, 6, r, 14);
}

/** One bay of the long stone bridge: a coping and parapet of dressed blocks, under it the wall pierced by a round arch. 4 x 2 characters. */
function archBridge(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(0, 0, 31, 15);
  r.rect(0, 4, 31, 4, false); // under the coping
  for (const x of [5, 13, 21, 29]) r.rect(x, 0, x, 3, false); // the parapet's blocks
  r.rect(0, 7, 0, 7, false);
  r.ellipse(15.5, 12.5, 10, 9, false); r.rect(5.5, 12, 25.5, 15, false); // the arch
  r.ring(15.5, 12.5, 11.4);
  r.rect(0, 15, 31, 15, false);
  r.rect(15, 5, 16, 6, false); // the keystone's joint
  return decor('archBridge', 4, 2, r, ['1111', 'EEEE']);
}

/** A giant crouched on the parapet in a great pointed hat, his green face under its brim, his sleeve reaching down the bridge's face. 3 x 2 characters. */
function crouchFigure(): NewDecor {
  const r = new Raster(24, 16);
  r.triangle(11, 0, 1, 9, 21, 9); r.rect(0, 8, 23, 9); // the hat and its brim
  for (const y of [3, 5, 7]) r.rect(5, y, 17, y, false); // its weave
  r.rect(11, 0, 11, 2, false);
  r.rect(8, 10, 15, 15); r.cut(['#..#'], 10, 11); r.cut(['####'], 10, 13); // the face under it: eyes, mouth
  r.rect(2, 13, 7, 15); r.rect(16, 13, 18, 15); // the hunched shoulders
  r.rect(19, 10, 23, 15); r.rect(20, 12, 22, 12, false); // the sleeve reaching down
  return decor('crouchFigure', 3, 2, r, ['111', '151']);
}

/** Puffy cloud of the sky: three lobes, a level base, strata cut in. 3 x 2 characters. */
function cloud(): NewDecor {
  const r = new Raster(24, 16);
  for (const [cx, cy, rad] of [[6, 10, 4.5], [11, 7, 5.5], [17, 9, 5.5]] as const) r.disc(cx, cy, rad);
  r.rect(2, 11, 21, 13);
  r.rect(3, 12, 9, 12, false); r.rect(12, 10, 19, 10, false); r.rect(8, 8, 12, 8, false);
  return decor('cloud', 3, 2, r, 1);
}

/** The two birds of the plate, beak to beak, wings swept up. 6 x 2 characters. */
function kissingDoves(): NewDecor {
  const r = new Raster(48, 16);
  const bird = (flip: boolean) => {
    const f = (x: number) => (flip ? 47 - x : x);
    r.ellipse(f(11), 10, 6, 2.8); // the body
    r.triangle(f(6), 9, f(0), 14, f(1), 8); // the tail
    r.disc(f(19), 7.5, 3); // the head
    r.triangle(f(21.5), 6.6, f(21.5), 8.6, f(23.5), 7.6); // the beak
    r.triangle(f(6), 8, f(15), 8, f(8), 0); // the wing, swept up
    r.cut(['#'], f(18.5), 6.5);
    r.line(f(9), 6, f(9), 3, false); r.line(f(11), 7, f(11), 4, false); // the feathers
  };
  bird(false); bird(true);
  return decor('kissingDoves', 6, 2, r, 1);
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

export const PLATE_DECOR = { willowTree: willowTree(), willowCurtain: willowCurtain(), roundTree: roundTree(), pagoda: pagoda(), archBridge: archBridge(), crouchFigure: crouchFigure(), cloud: cloud(), kissingDoves: kissingDoves(), plateBoat: plateBoat(), plateFence: plateFence() } as const satisfies Record<string, NewDecor>;
