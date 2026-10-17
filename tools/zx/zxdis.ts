/**
 * Disassembles a 64K dump (zxprobe --dump) from an address to an address:
 *
 *   npx esbuild tools/zx/zxdis.ts --bundle --platform=node --format=esm --outfile=/tmp/zxdis.mjs
 *   node /tmp/zxdis.mjs games/moley/build/play.ram 0x8000 0x8100
 *   node /tmp/zxdis.mjs games/moley/build/play.ram 0x8000 0x8100 --data 0x9000-0x9040   # that range as DEFB bytes
 *   node /tmp/zxdis.mjs games/moley/build/play.ram 0x8000 0xA000 --map games/moley/build/coverage.map   # only what ran
 */
import fs from 'node:fs';
import { disassemble, disassembleOne, formatLine } from './disasm';

const [file, fromArg, toArg, ...rest] = process.argv.slice(2);
if (!file || !fromArg || !toArg) throw new Error('usage: zxdis.ts <64K dump> <from> <to> [--data a-b]...');
const mem = new Uint8Array(fs.readFileSync(file));
const data: [number, number][] = [];
rest.forEach((a, i) => {
  if (a !== '--data') return;
  const m = /^(\w+)-(\w+)$/.exec(rest[i + 1] ?? '');
  if (m) data.push([Number(m[1]), Number(m[2])]);
});
const read = (a: number) => mem[a & 0xffff];
const mapAt = rest.indexOf('--map');
if (mapAt >= 0) {
  // only the instructions the coverage map saw start (profile.ts); a gap in what ran is shown as "..."
  const map = new Uint8Array(fs.readFileSync(rest[mapAt + 1] ?? ''));
  let gap = false;
  for (let a = Number(fromArg); a < Number(toArg); a++) {
    if (map[a] !== 2) { if (map[a] === 0 && !gap) { console.log('      ...'); gap = true; } continue; }
    gap = false;
    console.log(formatLine(read, disassembleOne(read, a)));
  }
} else for (const line of disassemble(read, Number(fromArg), Number(toArg), data)) console.log(formatLine(read, line));
