import { wearing, type Worn } from './costume';
import { limb, Raster } from './raster';

/**
 * Rio's costume, in two proposals (docs/dosvidaniya-rio.md: the choice is Chris's): the carnival headdress, a fan of plumes round a
 * sequined band, and a straw hat. Each is a sprite of its own over Monty (costume.ts), its top middle HAT_RISE rows above his head.
 */

/** The headdress: eleven plumes fanned out from the band, the middle ones longest, the band's sequins cut in it. 16 wide. */
function headdress(): readonly string[] {
  const r = new Raster(16, 14);
  for (let k = -5; k <= 5; k++) {
    const a = (k * 15 * Math.PI) / 180, len = 11 - Math.abs(k) * 0.7;
    limb(r, 7.5, 11, 7.5 + Math.sin(a) * len, 11 - Math.cos(a) * len, 2);
  }
  for (const k of [-4, -2, 0, 2, 4]) { // a dark line along every other plume, so they read apart
    const a = (k * 15 * Math.PI) / 180;
    r.line(7.5 + Math.sin(a) * 3, 11 - Math.cos(a) * 3, 7.5 + Math.sin(a) * 8, 11 - Math.cos(a) * 8, false);
  }
  r.rect(2, 10, 13, 13); // the band
  for (let x = 3; x < 13; x += 2) r.set(x, 11, false); // the sequins
  return r.rows();
}
export const HEADDRESS_HAT: readonly string[] = headdress();

/** The straw hat: a round crown with its band and bow over a wide flat brim. 16 wide. */
export const STRAW_HAT: readonly string[] = [
  '.....######.....',
  '....########....',
  '...##########...',
  '...##########...',
  '...##.####.##...',
  '..############..',
  '################',
  '.##############.',
  '..############..',
];

/** How far the crown stands above the top of his head, in pixels. */
export const HEADDRESS_RISE = 6;
export const STRAW_RISE = 3;

/** The colour they are drawn in: gold. */
export const RIO_HAT_COLOUR = 7;

/** Monty's pictures in each hat, and the hat as a sprite, for each of his sprite pointers. */
export const headdressWorn = (bank: Uint8Array): Worn => wearing(bank, HEADDRESS_HAT, HEADDRESS_RISE);
export const strawWorn = (bank: Uint8Array): Worn => wearing(bank, STRAW_HAT, STRAW_RISE);
