/**
 * The credits page's picture, proved: the game unpacks it with `$A500` (from `$A564`: 768 attribute bytes, bit 7 of each
 * saying that a cell has a bitmap, and 8 bytes of bitmap per such cell in a second stream after the attributes), and the
 * screen it leaves (read when the unpacker returns, `$A0DA`) is compared with one made here from the same bytes. Also the
 * scroller's text and the controls it announces.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/title.ts [tape] [rom]
 */
import { check, finish } from '../../../games/shared/test/check';
import { bootedSpectrum, readRom, readTape, ROM_FILE, typeLoad } from '../../../tools/zx/boot';
import { rowAddress } from '../../../tools/zx/screen';

const [tapeFile = 'games/moley/build/moley.tap', romFile = ROM_FILE] = process.argv.slice(2);
const m = bootedSpectrum(readRom(romFile));
m.tape = readTape(tapeFile);

const PICTURE = 0xa564, UNPACKED = 0xa0da;
let shot: Uint8Array | null = null;
m.onStep = (pc) => { if (pc === UNPACKED && shot === null) shot = m.mem.slice(0x4000, 0x5b00); };
typeLoad(m);
m.run(300);
if (shot === null) throw new Error('the credits page was not unpacked');

// our own unpacking of the same data
const want = new Uint8Array(6144 + 768);
let bitmap = PICTURE + 768;
for (let cell = 0; cell < 768; cell++) {
  const a = m.mem[PICTURE + cell];
  want[6144 + cell] = a & 0x7f;
  if (a & 0x80) {
    const row = cell >> 5, col = cell & 31;
    for (let line = 0; line < 8; line++) want[rowAddress(row * 8 + line) - 0x4000 + col] = m.mem[bitmap++];
  }
}
let bad = 0;
for (let i = 0; i < 6144 + 768; i++) if (shot[i] !== want[i]) bad++;
check(`the credits picture the game unpacks is the one made from the data (${bad} bytes differ)`, bad === 0);
console.log(`   the picture's data runs $${PICTURE.toString(16)}-$${(bitmap - 1).toString(16)}: ${(bitmap - PICTURE)} bytes, ${(bitmap - PICTURE - 768) / 8} cells with a bitmap`);

const textAt = 0xa111;
let end = textAt;
while (m.mem[end] !== 0) end++;
const text = String.fromCharCode(...m.mem.subarray(textAt, end));
check('the scroller announces Z left, X right, O up, K down, SPACE jump and the joysticks', /Z-left,X right,O up,K down,SPACE jump/.test(text) && /Sinclair and Kempston JOYSTICKS/.test(text) && end === 0xa276);

finish();
