// Build the fuzz image (one routine per instruction form), translate it, bundle and run fuzz.ts.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const dir = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync('/tmp/to-ts-fuzz-');
const mem = new Uint8Array(0x10000);
// Every documented opcode with an operand that hits the test area.
const ops = `00:brk:imp 01:ora:izx 05:ora:zp 06:asl:zp 08:php:imp 09:ora:imm 0a:asl:acc 0d:ora:abs 0e:asl:abs 10:bpl:rel 11:ora:izy 15:ora:zpx 16:asl:zpx 18:clc:imp 19:ora:aby 1d:ora:abx 1e:asl:abx
20:jsr:abs 21:and:izx 24:bit:zp 25:and:zp 26:rol:zp 28:plp:imp 29:and:imm 2a:rol:acc 2c:bit:abs 2d:and:abs 2e:rol:abs 30:bmi:rel 31:and:izy 35:and:zpx 36:rol:zpx 38:sec:imp 39:and:aby 3d:and:abx 3e:rol:abx
40:rti:imp 41:eor:izx 45:eor:zp 46:lsr:zp 48:pha:imp 49:eor:imm 4a:lsr:acc 4c:jmp:abs 4d:eor:abs 4e:lsr:abs 50:bvc:rel 51:eor:izy 55:eor:zpx 56:lsr:zpx 58:cli:imp 59:eor:aby 5d:eor:abx 5e:lsr:abx
60:rts:imp 61:adc:izx 65:adc:zp 66:ror:zp 68:pla:imp 69:adc:imm 6a:ror:acc 6c:jmp:ind 6d:adc:abs 6e:ror:abs 70:bvs:rel 71:adc:izy 75:adc:zpx 76:ror:zpx 78:sei:imp 79:adc:aby 7d:adc:abx 7e:ror:abx
81:sta:izx 84:sty:zp 85:sta:zp 86:stx:zp 88:dey:imp 8a:txa:imp 8c:sty:abs 8d:sta:abs 8e:stx:abs 90:bcc:rel 91:sta:izy 94:sty:zpx 95:sta:zpx 96:stx:zpy 98:tya:imp 99:sta:aby 9a:txs:imp 9d:sta:abx
a0:ldy:imm a1:lda:izx a2:ldx:imm a4:ldy:zp a5:lda:zp a6:ldx:zp a8:tay:imp a9:lda:imm aa:tax:imp ac:ldy:abs ad:lda:abs ae:ldx:abs b0:bcs:rel b1:lda:izy b4:ldy:zpx b5:lda:zpx b6:ldx:zpy b8:clv:imp b9:lda:aby ba:tsx:imp bc:ldy:abx bd:lda:abx be:ldx:aby
c0:cpy:imm c1:cmp:izx c4:cpy:zp c5:cmp:zp c6:dec:zp c8:iny:imp c9:cmp:imm ca:dex:imp cc:cpy:abs cd:cmp:abs ce:dec:abs d0:bne:rel d1:cmp:izy d5:cmp:zpx d6:dec:zpx d8:cld:imp d9:cmp:aby dd:cmp:abx de:dec:abx
e0:cpx:imm e1:sbc:izx e4:cpx:zp e5:sbc:zp e6:inc:zp e8:inx:imp e9:sbc:imm ea:nop:imp ec:cpx:abs ed:sbc:abs ee:inc:abs f0:beq:rel f1:sbc:izy f5:sbc:zpx f6:inc:zpx f8:sed:imp f9:sbc:aby fd:sbc:abx fe:inc:abx`
  .trim().split(/\s+/).map((e) => e.split(':')).filter(([, m]) => !['brk', 'rti', 'rts', 'jsr', 'jmp', 'txs', 'cli', 'sei', 'sed', 'pla', 'plp', 'php', 'pha'].includes(m));
const operand = { imp: [], acc: [], imm: [0x5a], zp: [0x84], zpx: [0x84], zpy: [0x84], izx: [0x10], izy: [0x80], abs: [0x10, 0x30], abx: [0x10, 0x30], aby: [0x10, 0x30], rel: [0x03] };
const entries = [], desc = {};
let at = 0x1000;
// Return path: RTS to $fff0 (the fuzz harness stops the 6502 there).
for (const [op, m, mode] of ops) {
  const code = [parseInt(op, 16), ...operand[mode]];
  // branches: taken → lda #$22, not taken → lda #$11 (so the path shows in A; flags restored by plp-free loads)
  if (mode === 'rel') code.push(0xa2, 0x11, 0x60, 0xa2, 0x22, 0x60); // ldx #$11 rts / ldx #$22 rts
  else code.push(0x60);
  mem.set(code, at);
  entries.push(at.toString(16));
  desc[`r_${at.toString(16).padStart(4, '0')}`] = `${m} ${mode}`;
  at += 16;
}
// A routine that sets decimal mode, so the translation handles it (and the random states may have D set).
mem.set([0xf8, 0x60], at); entries.push(at.toString(16)); at += 16;
// Push the return address $fff0-1 for the 6502 run: done in the harness via sp/stack.
mem[0x1fe] = 0xef; mem[0x1ff] = 0xff; // RTS from sp=$fd pops $ffef → $fff0
fs.writeFileSync(path.join(tmp, 'img.bin'), mem);
fs.writeFileSync(path.join(tmp, 'cfg.json'), JSON.stringify({ image: 'img.bin', entries, range: ['1000', '1fff'], out: 'gen.ts', runtime: path.resolve(dir, '../../../games/shared/native/cpu'), countCycles: true }));
execFileSync('node', [path.join(dir, '..', 'to-ts.mjs'), path.join(tmp, 'cfg.json')], { stdio: 'inherit' });
const genSrc = fs.readFileSync(path.join(tmp, 'gen.ts'), 'utf8');
fs.writeFileSync(path.join(tmp, 'gen.ts'), genSrc +
  `\nexport const CASES = ${JSON.stringify(entries.map((e) => ({ addr: parseInt(e, 16), name: `r_${e.padStart(4, '0')}` })))};\n` +
  `export const DESC = ${JSON.stringify(desc)};\n` +
  `export const IMAGE = new Uint8Array(${JSON.stringify(Array.from(mem.subarray(0, 0x2000)))}.concat(new Array(0xe000).fill(0)));\n` +
  `export const ROUTINES = { ${entries.map((e) => `r_${e.padStart(4, '0')}`).join(', ')} };\n`);
// the entry: fuzz.ts (type-checked with the tests) run over the generated routines
fs.writeFileSync(path.join(tmp, 'main.ts'), `import * as gen from './gen';\nimport { fuzz } from ${JSON.stringify(path.join(dir, 'fuzz'))};\nfuzz(gen);\n`);
execFileSync('npx', ['esbuild', path.join(tmp, 'main.ts'), '--bundle', '--platform=node', '--format=esm', `--outfile=${path.join(tmp, 'fuzz.mjs')}`, '--log-level=warning'], { stdio: 'inherit' });
execFileSync('node', [path.join(tmp, 'fuzz.mjs')], { stdio: 'inherit' });
