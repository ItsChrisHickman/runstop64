/**
 * The Great Wall's scenery, as the Wall is seen from the side where it snakes over the hills: its crenellated parapet, the dressed blocks of its face (a repeating
 * 1 x 1 piece, so a wall of any shape costs one character), the arched bays of its foot, the green and brown mountains behind it, a tower's window on the next
 * ridge, stars and a moon for the night. Solid ink with the detail cut into it as black lines, hatched with lines, never a dither.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A battlement along the walkway: a dressed merlon and a crenel's low parapet to each two characters. 2 x 1 characters. */
function crenels(): NewDecor {
  const r = new Raster(16, 8);
  r.rect(0, 0, 8, 7); r.rect(9, 4, 15, 7); // the merlon and the low parapet
  r.rect(15, 4, 15, 7, false); r.rect(0, 3, 8, 3, false); r.rect(4, 0, 4, 2, false); r.rect(2, 4, 2, 6, false); r.rect(6, 4, 6, 6, false); // the joints
  r.rect(9, 5, 15, 5, false); r.rect(12, 6, 12, 7, false);
  return decor('crenels', 2, 1, r, 15);
}

/** One block of the wall's face: two courses of dressed stone, the joints staggered, so it runs on either side. 1 x 1 characters. */
function wallCell(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 7);
  r.rect(0, 3, 7, 3, false); r.rect(0, 7, 7, 7, false); r.rect(5, 0, 5, 2, false); r.rect(2, 4, 2, 6, false);
  return decor('wallCell', 1, 1, r, 12);
}

/** An arched bay in the foot of the wall: a round-headed opening between piers, the block courses round it, a keystone. 6 x 3 characters. */
function arcadeBay(): NewDecor {
  const r = new Raster(48, 24);
  r.rect(0, 0, 47, 23);
  for (let y = 3; y < 24; y += 4) r.rect(0, y, 47, y, false);
  for (let y = 0; y < 24; y += 4) for (let x = (y / 4) % 2 ? 3 : 7; x < 48; x += 8) r.rect(x, y, x, y + 2, false);
  r.ellipse(23.5, 11, 14, 11, false); r.rect(9.5, 11, 37.5, 23, false); // the opening
  r.ring(23.5, 11, 15.5); r.rect(8, 11, 8, 23); r.rect(39, 11, 39, 23); // the dressed arch ring, the jambs
  r.rect(22, 0, 25, 2, false); // the keystone's seat
  return decor('arcadeBay', 6, 3, r, 12);
}

/** A ridge: its outline (two lines thick) over control points [x, y] by linear steps, the hill under it hatched with slanting lines. */
function ridge(name: string, w: number, h: number, pts: readonly (readonly [number, number])[], colour: number, hatch = 4): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const at = (x: number): number => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a && b && x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
    return h * 8;
  };
  for (let x = 0; x < w * 8; x++) {
    const y = Math.round(at(x));
    r.set(x, y); r.set(x, y + 1);
    for (let yy = y + 3; yy < h * 8; yy++) if ((x + yy) % hatch === 0) r.set(x, yy);
  }
  return decor(name, w, h, r, colour);
}

/** A far brown mountain range, peaks with steep sides. 6 x 4 characters. */
const peakBrown = (): NewDecor => ridge('peakBrown', 6, 4, [[0, 31], [8, 20], [14, 24], [24, 3], [30, 12], [34, 9], [42, 22], [47, 28]], 9, 3);
/** Near green hills, round-topped, a ridge line of turf. 6 x 3 characters. */
const hillGreen = (): NewDecor => ridge('hillGreen', 6, 3, [[0, 23], [6, 14], [12, 9], [20, 8], [28, 13], [34, 9], [40, 12], [47, 20]], 5, 3);
/** The same range in the dark of night. 6 x 3 characters. */
const peakNight = (): NewDecor => ridge('peakNight', 6, 3, [[0, 23], [8, 13], [14, 17], [24, 2], [30, 9], [36, 6], [42, 16], [47, 21]], 6, 3);
/** A low green hill. 4 x 2 characters. */
const hillLow = (): NewDecor => ridge('hillLow', 4, 2, [[0, 15], [6, 9], [14, 5], [22, 8], [31, 15]], 5, 3);

/** A window in a tower, giving on the Wall climbing the next ridge to a small tower: the stone frame in grey, the view in green. 5 x 4 characters. */
function wallWindow(): NewDecor {
  const r = new Raster(40, 32);
  const view = new Raster(40, 32);
  // the frame: a stone surround with a round head
  r.rect(0, 0, 39, 31);
  r.ellipse(19.5, 12, 14, 11, false); r.rect(5.5, 12, 33.5, 31, false);
  // the view: a ridge climbing right, the Wall along it with its crenels, a small tower on the crest
  for (let x = 6; x <= 33; x++) {
    const y = Math.round(27 - (x - 6) * 0.45 + Math.sin(x / 3) * 1.2);
    view.set(x, y); view.set(x, y + 1);
    if (x % 4 === 0) view.rect(x, y + 3, x, 30); // slope hatching
    if (x > 8 && x < 25) { view.set(x, y - 3); if (x % 3 !== 0) view.set(x, y - 4); } // the wall's line and its crenels
  }
  view.rect(24, 6, 30, 12); view.rect(23, 5, 31, 5); view.rect(25, 8, 26, 9, false); view.rect(28, 8, 29, 9, false); // the tower
  for (let y = 0; y < 32; y++) for (let x = 0; x < 40; x++) if (view.get(x, y) && !r.get(x, y)) r.set(x, y);
  // frame rows grey, view green: row by row colours (the view is in the middle characters)
  return decor('wallWindow', 5, 4, r, ['CCCCC', 'C555C', 'C555C', 'CCCCC']);
}

/** A star. 1 x 1 characters. */
function star(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(3, 3, 4, 4); r.set(3, 1); r.set(3, 6); r.set(1, 3); r.set(6, 3);
  return decor('star', 1, 1, r, 1);
}

/** The moon, a crescent. 2 x 2 characters. */
function moon(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(8, 8, 6.5);
  const cut = new Raster(16, 16); cut.disc(11, 6.5, 5.5);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (cut.get(x, y)) r.set(x, y, false);
  return decor('moon', 2, 2, r, 7);
}

export const WALL_DECOR = { crenels: crenels(), wallCell: wallCell(), arcadeBay: arcadeBay(), peakBrown: peakBrown(), hillGreen: hillGreen(), hillLow: hillLow(), peakNight: peakNight(), wallWindow: wallWindow(), star: star(), moon: moon() } as const satisfies Record<string, NewDecor>;
