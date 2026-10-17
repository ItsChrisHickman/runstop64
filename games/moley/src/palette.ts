/**
 * The Spectrum's 16 colours. A colour index is `bright * 8 + colour` (0 black, 1 blue, 2 red, 3 magenta, 4 green, 5 cyan,
 * 6 yellow, 7 white); bright black is black. Both modes use them: a C64-style palette was tried and dropped (it dulled the game).
 */

/** The Spectrum's colours as 0xRRGGBB (the values the ULA is usually drawn with: 0xD7 normal, 0xFF bright). */
export const SPECTRUM_PALETTE: readonly number[] = [
  0x000000, 0x0000d7, 0xd70000, 0xd700d7, 0x00d700, 0x00d7d7, 0xd7d700, 0xd7d7d7,
  0x000000, 0x0000ff, 0xff0000, 0xff00ff, 0x00ff00, 0x00ffff, 0xffff00, 0xffffff,
];
