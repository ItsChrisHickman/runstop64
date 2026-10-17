/**
 * The 16 C64 colours (Pepto's "colodore" measurements), as 0xRRGGBB.
 * Indices match the VIC-II colour codes used in original game data.
 */
export const C64_PALETTE = [
  0x000000, // 0 black
  0xffffff, // 1 white
  0x813338, // 2 red
  0x75cec8, // 3 cyan
  0x8e3c97, // 4 purple
  0x56ac4d, // 5 green
  0x2e2c9b, // 6 blue
  0xedf171, // 7 yellow
  0x8e5029, // 8 orange
  0x553800, // 9 brown
  0xc46c71, // 10 light red
  0x4a4a4a, // 11 dark grey
  0x7b7b7b, // 12 grey
  0xa9ff9f, // 13 light green
  0x706deb, // 14 light blue
  0xb2b2b2, // 15 light grey
] as const;

export const enum C64 {
  Black, White, Red, Cyan, Purple, Green, Blue, Yellow,
  Orange, Brown, LightRed, DarkGrey, Grey, LightGreen, LightBlue, LightGrey,
}

/** Palette as packed little-endian RGBA (for writing straight into a Uint32Array over RGBA bytes). */
export const C64_RGBA = new Uint32Array(
  C64_PALETTE.map((c) => 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)),
);

export function cssColour(index: number): string {
  return '#' + C64_PALETTE[index & 15].toString(16).padStart(6, '0');
}

/**
 * A palette a surface and the renderer draw with: 16 colours as 0xRRGGBB and packed RGBA. The default is the C64's; a game on
 * another machine (Moley Christmas, the ZX Spectrum) gives its own to the renderer and to the surfaces it makes.
 */
export interface Palette {
  readonly rgb: readonly number[];
  readonly rgba: Uint32Array;
}

export function makePalette(rgb: readonly number[]): Palette {
  if (rgb.length !== 16) throw new Error(`a palette has 16 colours, not ${rgb.length}`);
  return { rgb, rgba: new Uint32Array(rgb.map((c) => 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff))) };
}

/** The C64's colours as a palette: what every surface and renderer uses unless told otherwise. */
export const C64_COLOURS: Palette = { rgb: C64_PALETTE, rgba: C64_RGBA };
