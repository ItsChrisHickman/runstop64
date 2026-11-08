/**
 * What the ports of ZX Spectrum games share (Moley Christmas, Wanted: Monty Mole): the Spectrum's 16 colours, the colours of our own screens in them, the picture's size and
 * place in the renderer's 320 x 200 surface, and how a screen (a 6144-byte bitmap in the Spectrum's interleaved layout, 768 attribute bytes) becomes colour indexes.
 *
 * A colour index is `bright * 8 + colour` (0 black, 1 blue, 2 red, 3 magenta, 4 green, 5 cyan, 6 yellow, 7 white); bright black is black.
 */
import type { PauseColours } from './native/pause';

/** The Spectrum's colours as 0xRRGGBB (the values the ULA is usually drawn with: 0xD7 normal, 0xFF bright). */
export const SPECTRUM_PALETTE: readonly number[] = [
  0x000000, 0x0000d7, 0xd70000, 0xd700d7, 0x00d700, 0x00d7d7, 0xd7d700, 0xd7d7d7,
  0x000000, 0x0000ff, 0xff0000, 0xff00ff, 0x00ff00, 0x00ffff, 0xffff00, 0xffffff,
];

/**
 * The colours of our own screens (the pause screen, the map, the continue panels) as indexes of the palette: only the Spectrum's own, bright and normal.
 */
export const SPECTRUM = {
  black: 0,
  /** blue: the dark of a screen not seen, the dividers */
  dim: 1,
  /** white: ordinary text */
  text: 7,
  /** bright blue, bright green, bright cyan, bright yellow, bright white */
  blue: 9,
  good: 12,
  cyan: 13,
  yellow: 14,
  white: 15,
} as const;

/** The pause screen's and the panels' colours. */
export const PAUSE_COLOURS: PauseColours = {
  black: SPECTRUM.black,
  yellow: SPECTRUM.yellow,
  white: SPECTRUM.white,
  lgrey: SPECTRUM.text,
  dgrey: SPECTRUM.dim,
  grey: SPECTRUM.dim,
  cyan: SPECTRUM.cyan,
  lgreen: SPECTRUM.good,
};

export const PICTURE_WIDTH = 256;
export const PICTURE_HEIGHT = 192;
export const SURFACE_WIDTH = 320, SURFACE_HEIGHT = 200;
/** Where the Spectrum's picture sits in the surface (the border all round it). */
export const PICTURE_LEFT = (SURFACE_WIDTH - PICTURE_WIDTH) / 2, PICTURE_TOP = (SURFACE_HEIGHT - PICTURE_HEIGHT) / 2;

/** The offset in the bitmap of the first byte of pixel row `y` (counted from the top). */
export function rowOffset(y: number): number {
  return ((y & 0xc0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2);
}

/** The Spectrum colour index (0-15) of a cell's ink and of its paper, bright included. */
export function cellInk(attr: number): number { return (attr & 7) | ((attr >> 3) & 8); }
export function cellPaper(attr: number): number { return ((attr >> 3) & 7) | ((attr >> 3) & 8); }

/** A bitmap and its attributes as colour indexes, 256 x 192 (`flash`: the flashing cells inverted). */
export function pixelsOf(bits: Uint8Array, attrs: Uint8Array, out: Uint8Array, flash: boolean): Uint8Array {
  for (let y = 0; y < PICTURE_HEIGHT; y++) {
    const row = rowOffset(y), attrRow = (y >> 3) * 32;
    for (let col = 0; col < 32; col++) {
      const b = bits[row + col] ?? 0, attr = attrs[attrRow + col] ?? 0;
      let ink = cellInk(attr), paper = cellPaper(attr);
      if (flash && (attr & 0x80) !== 0) [ink, paper] = [paper, ink];
      for (let k = 0; k < 8; k++) out[y * PICTURE_WIDTH + col * 8 + k] = (b & (0x80 >> k)) !== 0 ? ink : paper;
    }
  }
  return out;
}

/** The 256 x 192 picture put in the middle of a 320 x 200 surface of the border colour. */
export function centre(picture: Uint8Array, border: number, out: Uint8Array): Uint8Array {
  out.fill(border);
  for (let y = 0; y < PICTURE_HEIGHT; y++) out.set(picture.subarray(y * PICTURE_WIDTH, (y + 1) * PICTURE_WIDTH), (y + PICTURE_TOP) * SURFACE_WIDTH + PICTURE_LEFT);
  return out;
}
