/**
 * Runs the Z80 CPU (tools/zx/z80.ts) against zexdoc or zexall (Frank Cringle's / J.G. Harston's instruction
 * exerciser: every instruction over a spread of register and flag values, CRC of the result against a real
 * Z80's). The .com file is CP/M, so a flat 64K machine with a stand-in BDOS: a call to $0005 prints (C = 2:
 * the character in E, C = 9: the string at DE ending in '$'), a jump to 0 ends.
 *
 *   nice -n 15 node tools/test.mjs tools/zx/test/zex.ts games/moley/build/zexdoc.com [seconds]
 *
 * `seconds` stops the run (an incomplete run fails, saying how far it got). zexdoc takes 67 tests and about 8.5 billion T-states.
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { Z80, type Bus } from '../z80';

const [file, secondsArg = '540'] = process.argv.slice(2);
if (!file) throw new Error('usage: zex.ts <zexdoc.com | zexall.com> [seconds]');

const mem = new Uint8Array(65536);
const image = fs.readFileSync(file);
mem.set(image, 0x100);
mem[0] = 0xc7; // RST 0 never happens; $0000 is trapped by address
mem[5] = 0xc9; // RET (the BDOS entry, trapped by address)

const bus: Bus = {
  read: (a) => mem[a],
  write: (a, v) => { mem[a] = v; },
  in: () => 0xff,
  out: () => undefined,
};
const cpu = new Z80(bus);
cpu.reset();
cpu.pc = 0x100;
cpu.sp = 0xf000;

let line = '';
const lines: string[] = [];
function print(ch: string) {
  if (ch === '\n') { lines.push(line); console.log(line); line = ''; } else if (ch !== '\r') line += ch;
}

const limit = Date.now() + Number(secondsArg) * 1000;
let done = false, tstates = 0, steps = 0;
while (!done) {
  if (cpu.pc === 5) {
    const c = cpu.regs[1];
    if (c === 2) print(String.fromCharCode(cpu.regs[3]));
    else if (c === 9) {
      for (let a = cpu.de; mem[a] !== 0x24; a = (a + 1) & 0xffff) print(String.fromCharCode(mem[a]));
    }
  } else if (cpu.pc === 0) { done = true; break; }
  tstates += cpu.step();
  if ((++steps & 0xfffff) === 0) {
    cpu.t = 0;
    if (Date.now() > limit) break;
  }
}
if (line) lines.push(line);

const results = lines.filter((l) => /OK$|ERROR/.test(l.trim()) || /CRC/.test(l));
const bad = lines.filter((l) => /ERROR/.test(l) || /expected/.test(l));
const oks = lines.filter((l) => /OK$/.test(l.trim()));
console.log(`${oks.length} tests OK, ${bad.length} wrong lines, ${(tstates / 1e9).toFixed(2)} billion T-states, ${results.length} result lines`);
check(`${file} ran to the end`, done);
check(`${file}: no test failed`, bad.length === 0);
finish();
