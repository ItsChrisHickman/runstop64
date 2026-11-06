/**
 * The drawing basics, headless: Surface clipping and its version counter, the bit and hex helpers the games' data
 * tables use, the CSS colours, and how many lines of a gauge are emptied at a level.
 *
 *   node tools/test.mjs packages/c64kit/test/surface.test.ts
 */
import { C64_PALETTE, cssColour } from '../src/palette';
import { hexBytes, reverseBits, Surface, TRANSPARENT } from '../src/surface';
import { emptiedLines } from '../src/layout';
import { check, finish } from '../../../games/shared/test/check';

/** The surface's pixels as rows of text: `.` transparent, else the colour as a hex digit. */
const rows = (s: Surface) => Array.from({ length: s.height }, (_, y) => Array.from(s.pixels.slice(y * s.width, (y + 1) * s.width), (c) => (c === TRANSPARENT ? '.' : c.toString(16))).join(''));

{
  const s = new Surface(4, 3);
  for (const [x, y] of [[-1, 0], [4, 0], [0, -1], [0, 3], [-1, -1], [4, 3]]) s.set(x, y, 5);
  check('set: a point outside any edge draws nothing, and wraps nowhere', rows(s).join() === '....,....,....' && s.version === 0);
  s.set(3, 2, 7);
  check('set: the last point draws, and the version moves', rows(s)[2] === '...7' && s.version === 1);
}

{
  const s = new Surface(4, 3);
  s.fillRect(-2, -1, 4, 3, 5);
  check('fillRect: clipped at the top and left', rows(s).join() === '55..,55..,....');
  const t = new Surface(4, 3);
  t.fillRect(2, 1, 10, 10, 6);
  check('fillRect: clipped at the bottom and right', rows(t).join() === '....,..66,..66');
  const u = new Surface(4, 3);
  u.fillRect(1, 1, 0, 0, 3);
  check('fillRect: an empty rectangle draws nothing, but counts as a change', rows(u).join() === '....,....,....' && u.version === 1);
}

{
  const glyph = [0x80, 0x01, 0, 0, 0, 0, 0, 0xff];
  const s = new Surface(8, 8);
  s.drawChar(glyph, 0, 0, 2);
  check('drawChar: set bits are the colour, the rest left as it was', rows(s)[0] === '2.......' && rows(s)[1] === '.......2' && rows(s)[7] === '22222222' && rows(s)[2] === '........');
  const b = new Surface(8, 8, 9);
  b.drawChar(glyph, 0, 0, 2, 1);
  check('drawChar: with a background the off bits take it', rows(b)[0] === '21111111' && rows(b)[2] === '11111111' && rows(b)[1] === '11111112');
  const c = new Surface(8, 8, 9);
  c.drawChar(glyph, 0, 0, 2, TRANSPARENT);
  check('drawChar: a transparent background leaves what was there', rows(c)[0] === '29999999');
  const clipped = new Surface(4, 2);
  clipped.drawChar([0xff, 0, 0xf0, 0x0f, 0, 0, 0, 0xff], -4, -1, 3);
  check('drawChar: clipped at the left and top without wrapping onto the row above', rows(clipped).join() === '....,....');
  const right = new Surface(4, 2);
  right.drawChar([0x0f, 0, 0, 0, 0, 0, 0, 0], 0, 0, 3);
  check('drawChar: clipped at the right without wrapping onto the row below', rows(right).join() === '....,....');
  const v = new Surface(8, 8);
  const before = v.version;
  v.drawChar(glyph, 100, 100, 1);
  check('drawChar: off the surface draws nothing and the version still moves', rows(v).every((r) => r === '........') && v.version === before + 1);
}

{
  const s = new Surface(2, 2);
  s.clear(4);
  check('clear: fills and bumps the version', rows(s).join() === '44,44' && s.version === 1);
  s.clear();
  check('clear: with no colour makes it transparent', rows(s).join() === '..,..' && s.version === 2);
}

const REVERSED: [number, number][] = [[0b10110000, 0b00001101], [0, 0], [0xff, 0xff], [1, 0x80], [0x80, 1], [0x0f, 0xf0]];
for (const [b, want] of REVERSED) check(`reverseBits(${b.toString(2).padStart(8, '0')}) = ${want.toString(2).padStart(8, '0')}`, reverseBits(b) === want);
check('reverseBits twice is the byte again', Array.from({ length: 256 }, (_, i) => i).every((i) => reverseBits(reverseBits(i)) === i));

check('hexBytes: digits to bytes', hexBytes('00ff10aB').join() === '0,255,16,171');
check('hexBytes: nothing is no bytes', hexBytes('').length === 0);

check('cssColour: every index is its palette colour as #rrggbb', C64_PALETTE.every((c, i) => /^#[0-9a-f]{6}$/.test(cssColour(i)) && parseInt(cssColour(i).slice(1), 16) === c));
check('cssColour: indexes above 15 use the low four bits', cssColour(16 + 3) === cssColour(3));

const GAUGE: [number, number, number][] = [
  [1, 10, 0], [2, 10, 0], [0, 10, 10], [-1, 10, 10], [0.5, 10, 5], [0.01, 10, 9], [0.99, 10, 1], [0.5, 1, 0], [0, 1, 1], [0.99, 1, 0],
];
for (const [level, h, want] of GAUGE) check(`emptiedLines(${level}, ${h}) = ${want}`, emptiedLines(level, h) === want);

finish();
