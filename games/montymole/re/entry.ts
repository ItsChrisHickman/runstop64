/**
 * How the tape starts the game: types LOAD "", and every time the ROM's loader (LD-BYTES, $0556; the model's trap returns to LD-RET, $053F) is called says what it
 * was asked for; dumps the 64K when it is called the n-th time (the loader decrypts itself before the last call), and
 * lists the first jumps (SHORT=1 leaves the last block off the tape) the program makes after its last load.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/re/entry.ts games/montymole/build/montymole.tap 5 /tmp/loader-decrypted.ram
 */
import fs from 'node:fs';
import { bootedSpectrum, readRom, readTape, typeLoad } from '../../../tools/zx/boot';

const [tapeFile, nthArg = '5', dumpFile] = process.argv.slice(2);
if (!tapeFile) throw new Error('usage: entry.ts <tape> [n] [dump file]');
const m = bootedSpectrum(readRom('games/montymole/build/48.rom'));
const tape = readTape(tapeFile);
// the tape without its last block: the loader's third call finds nothing, and its decrypted code is still in memory
m.tape = process.env.SHORT ? tape.slice(0, -1) : tape;
let calls = 0;
let last = -1;
const jumps: string[] = [];
const seen = new Set<string>();
let prev = -1;
let entered = false;
m.onStep = (pc) => {
  if (pc === 0x053f) { // LD-RET: the trap returns here after each call
    calls++;
    console.log(`LD-BYTES #${calls} done: ${m.loaded.join('; ')}`);
    if (dumpFile && calls === Number(nthArg)) fs.writeFileSync(dumpFile, m.mem);
    last = m.frame;
  }
  if (calls >= Number(nthArg) && pc >= 0x6000 && !entered) {
    entered = true;
    console.log(`first code run outside the ROM and the screen after the last load: $${pc.toString(16)}, SP $${m.cpu.sp.toString(16)}`);
  }
  // after the last load: where does the code go? (taken branches outside the ROM)
  if (calls >= Number(nthArg) && pc >= 0x4000 && jumps.length < 40 && prev >= 0 && (pc < prev || pc > prev + 4) && !seen.has(`${prev}-${pc}`)) {
    seen.add(`${prev}-${pc}`);
    jumps.push(`${prev.toString(16)}->${pc.toString(16)}`);
  }
  prev = pc >= 0x4000 ? pc : -1;
};
typeLoad(m); // (after the hook: the load starts within it)
while (m.frame < 1100) m.runFrame();
console.log('first branches after the last load:', jumps.join(' '));
console.log(`last load at frame ${last}`);
