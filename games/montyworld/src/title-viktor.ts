/**
 * Viktor Vole of the KGB on the title's map: Monty's mirror (a vole Monty's size, sleeker, in a black greatcoat and a fur hat with a red star, a
 * little moustache), tiny, walking east a few steps behind Monty along the dotted route. He is four hires sprites one over the other, a colour
 * each (the C64's sprites have one colour apiece in hires; the multicolour ones share the screen's two), drawn here as pictures of letters:
 * k black (coat, boots, eye, moustache, nose), r the red star, h the grey fur hat, f his own brown fur.
 */

/** One layer of the figure: the letter it is drawn with, its sprite colour (the C64's palette) and its sprite's number on the title (in front of the next). */
export interface ViktorLayer { readonly key: 'k' | 'r' | 'h' | 'f'; readonly colour: number; readonly sprite: number }
export const VIKTOR_LAYERS: readonly ViktorLayer[] = [
  { key: 'k', colour: 0, sprite: 2 },
  { key: 'r', colour: 2, sprite: 3 },
  { key: 'h', colour: 12, sprite: 4 },
  { key: 'f', colour: 9, sprite: 5 },
];

/** The figure above the legs: 16 pixels wide, 18 rows (in a sprite's 24 x 21 it stands 4 pixels in, its feet on the last row). */
const BODY: readonly string[] = [
  '....hhhhhhh.....',
  '...hhhhhhrrh....',
  '...hhhhhhrrh....',
  '...hhhhhhhhhh...',
  '..hhhhhhhhhhhh..',
  '...ffffffff.....',
  '...ffkfffffffk..',
  '...fffffffkkkk..',
  '....ffffff......',
  '...kkkkkkkk.....',
  '..kkkkkkkkkk....',
  '..kkkkkkkkkkk...',
  '..kkkkkkkkkkk...',
  '..kkkkkkkkkkk...',
  '..kkkkkkkkkkk...',
  '..kkkkkkkkkkkk..',
  '..kkkkkkkkkkkk..',
  '..kkkkkkkkkkkk..',
];
/** His two paces: legs apart, legs together. */
const LEGS: readonly (readonly string[])[] = [
  ['...kkk...kkk....', '...kkk...kkkk...', '..kkkk...kkkk...'],
  ['....kkkkkk......', '....kkkkkk......', '....kkkkkkk.....'],
];
export const VIKTOR_POSES = LEGS.length;

/** The sprite block (24 x 21 pixels, 3 bytes a row) of one layer in one pose. */
export function viktorBlock(layer: ViktorLayer, pose: number): Uint8Array {
  const rows = [...BODY, ...(LEGS[pose % LEGS.length] ?? [])];
  const out = new Uint8Array(64);
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== layer.key) return;
      const px = x + 4;
      out[y * 3 + (px >> 3)] = (out[y * 3 + (px >> 3)] ?? 0) | (0x80 >> (px & 7));
    });
  });
  return out;
}
