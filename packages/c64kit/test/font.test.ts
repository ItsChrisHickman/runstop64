/**
 * The bitmap font (src/font.ts), headless: glyphs by letter and case, charset lookups that skip empty and solid cells,
 * drawn glyphs that never replace existing ones unless asked, and where drawn and centred text lands.
 *
 *   node tools/test.mjs packages/c64kit/test/font.test.ts
 */
import { BitmapFont, KIT_GLYPHS } from '../src/font';
import { Surface, TRANSPARENT } from '../src/surface';
import { check, finish } from '../../../games/shared/test/check';

const font = new BitmapFont().addDrawn({ A: ['#.......', ...Array<string>(7).fill('........')], B: ['########', ...Array<string>(7).fill('........')] });
const column = (s: Surface, x: number, y = 0) => s.pixels[y * s.width + x];

check('glyph: a letter in either case is the same glyph', font.glyph('a') === font.glyph('A') && font.glyph('A')?.[0] === 0x80);
check('glyph: a character with none is undefined', font.glyph('Q') === undefined);

{
  const kept = new BitmapFont().addDrawn({ A: ['#.......', ...Array<string>(7).fill('........')] }).addDrawn({ A: Array<string>(8).fill('########') });
  check('addDrawn: an existing glyph is kept', kept.glyph('A')?.[0] === 0x80);
  const replaced = new BitmapFont().addDrawn({ A: ['#.......', ...Array<string>(7).fill('........')] }).addDrawn({ A: Array<string>(8).fill('########') }, true);
  check('addDrawn: replace: true takes the new one', replaced.glyph('A')?.[0] === 0xff);
}

{
  // a charset of 4 cells: 0 empty, 1 a letter, 2 solid, 3 a letter again
  const charset = new Uint8Array(32);
  charset.set([0x18, 0x24, 0x42, 0x7e, 0x42, 0x42, 0x42, 0x00], 8);
  charset.fill(0xff, 16, 24);
  charset.set([0x7c, 0x42, 0x7c, 0x42, 0x42, 0x42, 0x7c, 0x00], 24);
  const f = new BitmapFont().addFromCharsetMapped(charset, 'ABC D', (ascii) => (ascii === 65 ? 1 : ascii === 66 ? 3 : ascii === 67 ? 2 : 0));
  check('charset: a letter cell is taken (as its eight bytes)', f.glyph('A')?.join() === '24,36,66,126,66,66,66,0' && f.glyph('B')?.[0] === 0x7c);
  check('charset: a solid cell is not a letter, and an empty cell is not either', f.glyph('C') === undefined && f.glyph('D') === undefined);
  check('charset: a space is a glyph even though its cell is empty', f.glyph(' ')?.every((b) => b === 0) === true);
}

{
  const s = new Surface(32, 8);
  const end = font.draw(s, 'AB?', 4, 0, 3);
  check('draw: returns the x after the last character, also for one with no glyph', end === 4 + 24);
  check('draw: each character in its own cell, in the colour', column(s, 4) === 3 && column(s, 5) === TRANSPARENT && column(s, 12) === 3 && column(s, 19) === 3 && column(s, 20) === TRANSPARENT);
  check('draw: a character with no glyph leaves its cell alone', Array.from({ length: 8 }, (_, i) => column(s, 20 + i)).every((p) => p === TRANSPARENT));
}

{
  const s = new Surface(40, 8);
  font.drawCentred(s, 'AB', 0, 2);
  const first = s.pixels.findIndex((p) => p !== TRANSPARENT);
  check('drawCentred: starts at floor((width - 8 * length) / 2)', first === Math.floor((40 - 16) / 2));
  const odd = new Surface(41, 8);
  font.drawCentred(odd, 'A', 0, 2);
  check('drawCentred: rounds down on an odd margin', odd.pixels.findIndex((p) => p !== TRANSPARENT) === Math.floor((41 - 8) / 2));
}

check('the kit glyphs are 8 rows of 8 columns each', Object.values(KIT_GLYPHS).every((rows) => rows.length === 8 && rows.every((r) => r.length === 8)));

finish();
