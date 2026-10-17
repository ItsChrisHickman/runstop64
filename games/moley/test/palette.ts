/**
 * The Spectrum to C64 colour mapping (src/palette.ts) against the game's own colours: the table is the best one-to-one choice
 * by CIELAB distance, and in every attribute table of the game (the six rooms, the card, the HUD panel) no ink and paper used
 * together in a cell merge into one C64 colour, and each pair keeps enough lightness difference to read.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/palette.ts
 */
import { C64_PALETTE } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { ZX_PALETTE } from '../../../tools/zx/screen';
import { ROOM_COUNT } from '../src/data';
import { cellInk, cellPaper, roomPicture } from '../src/picture';
import { SPECTRUM_PALETTE, SPECTRUM_TO_C64, deriveMapping, lab, lightnessGap } from '../src/palette';

/** The least CIELAB lightness difference (dL, 0-100) an ink and paper used together may keep: the C64's own blue on black is 26. */
const MIN_CONTRAST = 20;

check('the Spectrum palette is the one the model draws', SPECTRUM_PALETTE.every((c, i) => c === ZX_PALETTE[i]));
check('the table has 16 entries, each a C64 colour', SPECTRUM_TO_C64.length === 16 && SPECTRUM_TO_C64.every((c) => c >= 0 && c < 16));
check('the 15 different Spectrum colours map to 15 different C64 colours', new Set(SPECTRUM_TO_C64).size === 15);
check('bright black is black', SPECTRUM_TO_C64[8] === SPECTRUM_TO_C64[0]);

const NAMES = ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'];
const spectrum = (i: number) => NAMES[i & 7] + (i & 8 ? '+' : '');

/**
 * What a picture really puts side by side: a cell with some pixels of each shows its ink and its paper together (a pair that must
 * be told apart); a cell all of one or the other shows only that colour. Cells whose pixels are all paper or all ink need no contrast.
 */
const pairs = new Map<number, string>(); // lower * 16 + higher (Spectrum indexes) -> the first picture that uses it
const cells = new Array<number>(16).fill(0); // how many cells show each Spectrum colour
let mixed = 0;
for (let room = 0; room < ROOM_COUNT; room++) {
  const { bits, attrs } = roomPicture(room);
  for (let cell = 0; cell < 768; cell++) {
    let ones = 0;
    for (let line = 0; line < 8; line++) { let b = bits[((cell >> 5) * 8 + line) * 32 + (cell & 31)]; while (b) { ones += b & 1; b >>= 1; } }
    const ink = cellInk(attrs[cell]), paper = cellPaper(attrs[cell]);
    if (ones < 64) cells[paper]++;
    if (ones > 0) cells[ink]++;
    if (ones === 0 || ones === 64 || ink === paper) continue;
    mixed++;
    const key = Math.min(ink, paper) * 16 + Math.max(ink, paper);
    if (!pairs.has(key)) pairs.set(key, `room ${room}`);
  }
}
const derived = deriveMapping([...pairs.keys()].map((k) => [k >> 4, k & 15]), MIN_CONTRAST, cells);
if (derived?.join() !== SPECTRUM_TO_C64.join()) console.log(`   deriveMapping gives ${derived?.join(', ')}`);
check('the table is the nearest-colour mapping that keeps the pairs the game uses apart', derived?.join() === SPECTRUM_TO_C64.join());
let min = Infinity, minPair = '';
const failing: string[] = [];
for (const [key, where] of pairs) {
  const a = key >> 4, b = key & 15, ca = SPECTRUM_TO_C64[a], cb = SPECTRUM_TO_C64[b];
  const gap = lightnessGap(C64_PALETTE[ca], C64_PALETTE[cb]);
  const name = `${spectrum(a)}/${spectrum(b)} (${where})`;
  if (ca === cb) failing.push(`${name} merge`);
  else if (gap < MIN_CONTRAST) failing.push(`${name} dL ${gap.toFixed(1)}`);
  if (gap < min) { min = gap; minPair = name; }
}
console.log(`   pairs shown together, and the first room that has each: ${[...pairs].map(([k, w]) => `${spectrum(k >> 4)}/${spectrum(k & 15)} ${w}`).join(", ")}`);
console.log(`   ${pairs.size} different ink/paper pairs shown together in ${mixed} cells; least lightness difference ${min.toFixed(1)} (${minPair})`);
console.log(`   L of the C64 colours: ${C64_PALETTE.map((c) => lab(c)[0].toFixed(0)).join(' ')}`);
for (const f of failing) console.log(`   fails: ${f}`);
check(`no ink/paper pair used in a cell merges, and every pair has dL of at least ${MIN_CONTRAST}`, failing.length === 0);

finish();
