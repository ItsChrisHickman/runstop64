/**
 * Palettes (src/palette.ts, surface.ts): the default is the C64's and every surface comes out byte for byte as it did before palettes
 * existed; another palette (the Spectrum's, for Moley Christmas) changes only what the indexes mean.
 *
 *   node tools/test.mjs packages/c64kit/test/palette.test.ts
 */
import { C64_COLOURS, C64_PALETTE, C64_RGBA, makePalette } from '../src/palette';
import { Surface, TRANSPARENT } from '../src/surface';
import { check, finish } from '../../../games/shared/test/check';

/** The conversion as it was before palettes: the C64 table packed little-endian RGBA. */
const old = (c: number): number => (0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)) >>> 0;

check('the default palette is the C64 table, packed as it always was', C64_COLOURS.rgb === C64_PALETTE && C64_COLOURS.rgba === C64_RGBA && C64_PALETTE.every((c, i) => C64_RGBA[i] === old(c)));

const s = new Surface(16, 2, 0);
for (let i = 0; i < 16; i++) s.pixels[i] = i;
for (let i = 16; i < 31; i++) s.pixels[i] = (i * 7) & 0xff; // (indexes above 15 use the low four bits, as before)
s.pixels[31] = TRANSPARENT;
check('a new surface has the C64 palette', s.palette === C64_COLOURS);
const before = new Uint8Array(16 * 2 * 4);
s.toRGBA(before);
const view = new Uint32Array(before.buffer);
check('its RGBA is what the C64-only code produced (transparent stays alpha 0)', Array.from({ length: 32 }, (_, i) => (i === 31 ? view[i] === 0 : view[i] === old(C64_PALETTE[s.pixels[i] & 15]))).every(Boolean));

const grey = makePalette(Array.from({ length: 16 }, (_, i) => i * 0x111111));
s.palette = grey;
const after = new Uint8Array(16 * 2 * 4);
s.toRGBA(after);
const view2 = new Uint32Array(after.buffer);
check('another palette changes what the indexes mean, the pixels untouched', view2[5] === old(0x555555) && view2[5] !== view[5] && s.pixels[5] === 5 && view2[31] === 0);
let threw = false;
try { makePalette([0, 1]); } catch { threw = true; }
check('a palette has 16 colours', threw);
finish();
