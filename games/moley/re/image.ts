/**
 * The tape's code block as the game's pristine 64K image (zeros below it): what the disassembler reads when the
 * running game has changed its own data. Also lists the tape's blocks.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/image.ts games/moley/build/moley.tap games/moley/build/code.ram
 */
import fs from 'node:fs';
import { headerOf, parseTap } from '../../../tools/zx/tape';

const [tapFile, outFile] = process.argv.slice(2);
if (!tapFile || !outFile) throw new Error('usage: image.ts <tap> <out 64K image>');
const blocks = parseTap(new Uint8Array(fs.readFileSync(tapFile)));
const image = new Uint8Array(65536);
let start = -1;
blocks.forEach((b, i) => {
  const h = headerOf(b.bytes);
  if (h) {
    console.log(`block ${i}: header type ${h.type} "${h.name.trim()}" length ${h.length} params ${h.param1} ${h.param2}`);
    start = h.type === 3 ? h.param1 : -1;
  } else {
    console.log(`block ${i}: data, ${b.bytes.length - 2} bytes, flag ${b.bytes[0]}`);
    if (start >= 0) { image.set(b.bytes.subarray(1, b.bytes.length - 1), start); console.log(`  placed at ${start.toString(16)}`); }
  }
});
fs.writeFileSync(outFile, image);
