/**
 * The humpback breaching in Lahaina's harbour (Chris, 2026-11-26, WHALE OF A TIME: "nothing really going on... nothing to do with the whale"): a full sprite block each (24 x 21, hires), three pictures as it
 * goes along its arc out of the water and back (a leap's `spread`): rising nose up, level at the top with its long pectoral fin out, and diving nose down with its flukes thrown up behind. Drawn along a spine
 * at the picture's angle (discs of the body's girth from the tail stock to the knobbly head), the throat's pleats, the eye and the mouth cut in black, the fin's long white blade the humpback is known by.
 */
import { spriteBlock } from './pixels';
import { Raster } from './raster';

/** The whale with its spine at `degrees` (0: level, head to the east; up is positive), `flukes` how far its tail fans out. */
function whale(degrees: number, flukes: number): string[] {
  const r = new Raster(24, 21);
  const a = (degrees * Math.PI) / 180;
  const ux = Math.cos(a), uy = -Math.sin(a); // along the spine, toward the head
  const px = Math.sin(a), py = Math.cos(a); // across it, toward the belly
  const at = (s: number, d: number): readonly [number, number] => [11.5 + ux * s + px * d, 10 + uy * s + py * d];
  const girth = (s: number) => (s > 5 ? 3.6 - (s - 5) * 0.3 : s > -3 ? 4.2 : Math.max(0.9, 4.2 - (-3 - s) * 0.5));
  for (let s = -10; s <= 10; s += 0.5) { const [x, y] = at(s, 0.5); r.disc(x, y, girth(s)); }
  const [tx, ty] = at(-10.5, 0), [ax, ay] = at(-12.5, -flukes), [bx, by] = at(-12.5, flukes);
  r.triangle(tx, ty, ax, ay, bx, by); // the flukes
  // the pectoral fin, long, swept back from the shoulder along the belly
  for (const d of [0, 1]) { const [sx, sy] = at(3, 3 + d), [ex, ey] = at(-6, 7.5 + d); r.line(sx, sy, ex, ey); }
  const [ex, ey] = at(6.5, 0.2); r.set(ex, ey, false); // the eye
  const [m0x, m0y] = at(10, 1.6), [m1x, m1y] = at(4.5, 1.8); r.line(m0x, m0y, m1x, m1y, false); // the mouth
  for (let s = -1; s <= 7; s += 2) { const [gx, gy] = at(s, 3.4); r.set(gx, gy, false); } // the throat's pleats
  return r.rows();
}

/** Rising, level at the top, diving: the leap's three pictures in order. */
export const WHALE_PICTURES: readonly (readonly string[])[] = [whale(45, 3), whale(0, 4), whale(-55, 5)];
export const WHALE_BLOCKS: readonly Uint8Array[] = WHALE_PICTURES.map((rows, i) => spriteBlock(`whale ${i}`, rows));
