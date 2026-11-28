/**
 * Viktor Vole, the Russian operative, on the title's map: Monty's mirror (a vole Monty's size, sleeker, in a black greatcoat and a fur hat with a red star, a
 * little moustache), tiny, walking east a few steps behind Monty along the dotted route. He is four hires sprites one over the other, a colour
 * each (the C64's sprites have one colour apiece in hires; the multicolour ones share the screen's two), drawn here as pictures of letters:
 * k black (coat, boots, eye, moustache, nose), r the red star, h the grey fur hat, f his own orange fur. He also lies flat (tripped).
 */

/** One layer of the figure: the letter it is drawn with, its sprite colour (the C64's palette) and its sprite's number on the title (in front of the next). */
export interface ViktorLayer { readonly key: 'k' | 'r' | 'h' | 'f'; readonly colour: number; readonly sprite: number }
export const VIKTOR_LAYERS: readonly ViktorLayer[] = [
  { key: 'k', colour: 0, sprite: 2 },
  { key: 'r', colour: 2, sprite: 3 },
  { key: 'h', colour: 12, sprite: 4 },
  { key: 'f', colour: 8, sprite: 5 },
];

/** The figure above the legs: 11 pixels wide, 15 rows (Monty on the map is 13 wide and 17 tall with his hat; Viktor is his size, but sleeker). */
const BODY: readonly string[] = [
  '..hhhhhh...',
  '.hhhhrrhh..',
  '.hhhhrrhh..',
  '.hhhhhhhhh.',
  '..ffffff...',
  '..fkffffff.',
  '..ffffkkkk.',
  '...kkkkk...',
  '..kkkkkkk..',
  '..kkkkkkkk.',
  '..kkkkkkkk.',
  '..kkkkkkkk.',
  '..kkkkkkkk.',
  '..kkkkkkkk.',
  '..kkkkkkkk.',
];
/** His two paces: legs apart, legs together. */
const LEGS: readonly (readonly string[])[] = [
  ['..kk...kk..', '.kkk...kkk.'],
  ['...kkkkk...', '...kkkkkk..'],
];
/** Rows from the top of his block to his feet's soles (the figure is 17 rows tall). */
export const VIKTOR_HEIGHT = BODY.length + 2;
export const VIKTOR_POSES = LEGS.length;

/** A sprite block (24 x 21 pixels, 3 bytes a row) with the pixels `lit` gives for the layer's letter. */
function block(layer: ViktorLayer, rows: readonly string[], lit: (x: number, y: number) => readonly [number, number]): Uint8Array {
  const out = new Uint8Array(64);
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== layer.key) return;
      const [px, py] = lit(x, y);
      out[py * 3 + (px >> 3)] = (out[py * 3 + (px >> 3)] ?? 0) | (0x80 >> (px & 7));
    });
  });
  return out;
}

/** The sprite block of one layer in one pose, standing. */
export function viktorBlock(layer: ViktorLayer, pose: number): Uint8Array {
  return block(layer, [...BODY, ...(LEGS[pose % LEGS.length] ?? [])], (x, y) => [x + 6, y]);
}

/** One layer of him lying flat on his face, head to the east (fallen forward), his soles' row the standing figure's. */
export function viktorFallenBlock(layer: ViktorLayer): Uint8Array {
  const rows = [...BODY, ...(LEGS[1] ?? [])];
  return block(layer, rows, (x, y) => [3 + (rows.length - 1 - y), VIKTOR_HEIGHT - 11 + x]);
}
