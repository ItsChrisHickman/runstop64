/**
 * The tape as two pristine 64K images: the loader (the CODE block "MOLE", 100 bytes at 60000) and the game (the
 * headerless block the loader reads, 49152 bytes at 16384, screen included). The running game overwrites the loader
 * and changes its own data, so the disassembler reads these. Also lists the tape's blocks.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/re/image.ts games/montymole/build/montymole.tzx games/montymole/build
 *
 * writes <dir>/loader.ram and <dir>/code.ram.
 */
import fs from 'node:fs';
import path from 'node:path';
import { headerOf, parityOk, parseTap, parseTzx, type TapeBlock } from '../../../tools/zx/tape';

const [tapeFile, outDir] = process.argv.slice(2);
if (!tapeFile || !outDir) throw new Error('usage: image.ts <tape .tap|.tzx> <out dir>');
const file = new Uint8Array(fs.readFileSync(tapeFile));
const blocks: readonly TapeBlock[] = tapeFile.toLowerCase().endsWith('.tzx') ? parseTzx(file) : parseTap(file);

const loader = new Uint8Array(65536);
const code = new Uint8Array(65536);
let start = -1;
let headed = false;
blocks.forEach((b, i) => {
  if (b.kind !== 'standard') {
    console.log(`block ${i}: ${b.kind}`);
    return;
  }
  const h = headerOf(b.bytes);
  if (h) {
    console.log(`block ${i}: header type ${h.type} "${h.name.trim()}" length ${h.length} params ${h.param1} ${h.param2}`);
    start = h.type === 3 ? h.param1 : -1;
    headed = true;
    return;
  }
  const payload = b.bytes.subarray(1, b.bytes.length - 1);
  console.log(`block ${i}: data, flag ${b.bytes[0]}, ${payload.length} payload bytes, parity ${parityOk(b.bytes) ? 'ok' : 'WRONG'}`);
  if (headed && start >= 0) {
    loader.set(payload, start);
    console.log(`  code placed at ${start} (loader.ram)`);
  } else if (!headed && b.bytes[0] === 0x71) {
    // the headerless block the loader reads: 49152 bytes from 16384 (the TZX copy has ten more bytes after them)
    code.set(payload.subarray(0, 49152), 16384);
    console.log(`  game placed at 16384, ${payload.length - 49152} bytes after it unused (code.ram)`);
  }
  headed = false;
});
fs.writeFileSync(path.join(outDir, 'loader.ram'), loader);
fs.writeFileSync(path.join(outDir, 'code.ram'), code);
