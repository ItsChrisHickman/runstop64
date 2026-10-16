// Recursive-descent 6502 disassembler for studying a game's RAM image.
//
//   node tools/re/disasm.mjs <ram.bin> <labels.json> [--cov cov.bin] [--from a --to b] > listing.asm
//
// labels.json: { "entry": ["24a8", ...],
//                "labels": { "24a8": "Irq" | { "name": "Irq", "comment": "...", "data": 16 } } }
// "data": N marks N bytes at that address as data (and stops code-flow there).
// --cov: a 64K map of executed addresses (1 = executed), used as extra entry points.
import fs from 'node:fs';

const [ramPath, labelsPath, ...rest] = process.argv.slice(2);
const arg = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
const mem = fs.readFileSync(ramPath);
const cfg = labelsPath && fs.existsSync(labelsPath) ? JSON.parse(fs.readFileSync(labelsPath, 'utf8')) : { entry: [], labels: {} };
const FROM = parseInt(arg('from', '0400'), 16), TO = parseInt(arg('to', 'ffff'), 16);

const OPS = {};
const def = (s) => { for (const e of s.trim().split(/\s+/)) { const [o, m, n] = e.split(':'); OPS[parseInt(o, 16)] = [m, n]; } };
def(`00:brk:imp 01:ora:izx 05:ora:zp 06:asl:zp 08:php:imp 09:ora:imm 0a:asl:acc 0d:ora:abs 0e:asl:abs 10:bpl:rel 11:ora:izy 15:ora:zpx 16:asl:zpx 18:clc:imp 19:ora:aby 1d:ora:abx 1e:asl:abx
20:jsr:abs 21:and:izx 24:bit:zp 25:and:zp 26:rol:zp 28:plp:imp 29:and:imm 2a:rol:acc 2c:bit:abs 2d:and:abs 2e:rol:abs 30:bmi:rel 31:and:izy 35:and:zpx 36:rol:zpx 38:sec:imp 39:and:aby 3d:and:abx 3e:rol:abx
40:rti:imp 41:eor:izx 45:eor:zp 46:lsr:zp 48:pha:imp 49:eor:imm 4a:lsr:acc 4c:jmp:abs 4d:eor:abs 4e:lsr:abs 50:bvc:rel 51:eor:izy 55:eor:zpx 56:lsr:zpx 58:cli:imp 59:eor:aby 5d:eor:abx 5e:lsr:abx
60:rts:imp 61:adc:izx 65:adc:zp 66:ror:zp 68:pla:imp 69:adc:imm 6a:ror:acc 6c:jmp:ind 6d:adc:abs 6e:ror:abs 70:bvs:rel 71:adc:izy 75:adc:zpx 76:ror:zpx 78:sei:imp 79:adc:aby 7d:adc:abx 7e:ror:abx
81:sta:izx 84:sty:zp 85:sta:zp 86:stx:zp 88:dey:imp 8a:txa:imp 8c:sty:abs 8d:sta:abs 8e:stx:abs 90:bcc:rel 91:sta:izy 94:sty:zpx 95:sta:zpx 96:stx:zpy 98:tya:imp 99:sta:aby 9a:txs:imp 9d:sta:abx
a0:ldy:imm a1:lda:izx a2:ldx:imm a4:ldy:zp a5:lda:zp a6:ldx:zp a8:tay:imp a9:lda:imm aa:tax:imp ac:ldy:abs ad:lda:abs ae:ldx:abs b0:bcs:rel b1:lda:izy b4:ldy:zpx b5:lda:zpx b6:ldx:zpy b8:clv:imp b9:lda:aby ba:tsx:imp bc:ldy:abx bd:lda:abx be:ldx:aby
c0:cpy:imm c1:cmp:izx c4:cpy:zp c5:cmp:zp c6:dec:zp c8:iny:imp c9:cmp:imm ca:dex:imp cc:cpy:abs cd:cmp:abs ce:dec:abs d0:bne:rel d1:cmp:izy d5:cmp:zpx d6:dec:zpx d8:cld:imp d9:cmp:aby dd:cmp:abx de:dec:abx
e0:cpx:imm e1:sbc:izx e4:cpx:zp e5:sbc:zp e6:inc:zp e8:inx:imp e9:sbc:imm ea:nop:imp ec:cpx:abs ed:sbc:abs ee:inc:abs f0:beq:rel f1:sbc:izy f5:sbc:zpx f6:inc:zpx f8:sed:imp f9:sbc:aby fd:sbc:abx fe:inc:abx`);
const LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, izx: 2, izy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3 };
const h2 = (v) => v.toString(16).padStart(2, '0');
const h4 = (v) => v.toString(16).padStart(4, '0');

const labels = new Map(), comments = new Map(), dataLen = new Map();
for (const [a, v] of Object.entries(cfg.labels ?? {})) {
  const addr = parseInt(a, 16);
  if (typeof v === 'string') labels.set(addr, v);
  else { if (v.name) labels.set(addr, v.name); if (v.comment) comments.set(addr, v.comment); if (v.data) dataLen.set(addr, v.data); }
}
const isData = new Uint8Array(65536);
for (const [a, n] of dataLen) isData.fill(1, a, a + n);

const code = new Uint8Array(65536); // 1 = instruction start, 2 = operand byte
const xref = new Map(); // target -> Set of sources
const addXref = (t, s) => { if (!xref.has(t)) xref.set(t, new Set()); xref.get(t).add(s); };
const queue = (cfg.entry ?? []).map((a) => parseInt(a, 16));
if (arg('cov')) { const cov = fs.readFileSync(arg('cov')); for (let a = FROM; a <= TO; a++) if (cov[a]) queue.push(a); }
const inRange = (a) => a >= FROM && a <= TO;
while (queue.length) {
  let pc = queue.pop();
  while (inRange(pc) && !code[pc] && !isData[pc]) {
    const op = OPS[mem[pc]];
    if (!op) break; // not an instruction: stop
    const [m, mode] = op, len = LEN[mode];
    for (let i = 0; i < len; i++) if (code[pc + i] === 1 && i) break;
    code[pc] = 1; for (let i = 1; i < len; i++) code[pc + i] = 2;
    const w = mem[pc + 1] | (mem[pc + 2] << 8);
    if (mode === 'rel') { const t = (pc + 2 + ((mem[pc + 1] << 24) >> 24)) & 0xffff; addXref(t, pc); queue.push(t); }
    if (m === 'jsr' || (m === 'jmp' && mode === 'abs')) { addXref(w, pc); queue.push(w); }
    if (mode === 'abs' || mode === 'abx' || mode === 'aby' || mode === 'ind') if (m !== 'jsr' && m !== 'jmp') addXref(w, pc);
    if (['rts', 'rti', 'brk'].includes(m) || m === 'jmp') break;
    pc += len;
  }
}

// Auto labels for referenced addresses.
const name = (a) => labels.get(a) ?? (code[a] === 1 ? `L${h4(a)}` : null);
const ref = (a, w = 4) => {
  if (labels.has(a)) return labels.get(a);
  if (code[a] === 1 && xref.has(a)) return `L${h4(a)}`;
  for (let d = 1; d <= 3; d++) if (labels.has(a - d)) return `${labels.get(a - d)}+${d}`;
  return `$${w === 2 ? h2(a) : h4(a)}`;
};

const out = [];
let a = FROM;
while (a <= TO) {
  if (comments.has(a)) for (const c of comments.get(a).split('\n')) out.push(`; ${c}`);
  if (code[a] === 1) {
    const [m, mode] = OPS[mem[a]], len = LEN[mode];
    const b1 = mem[a + 1], w = b1 | (mem[a + 2] << 8);
    const zp = (v) => labels.get(v) ?? `$${h2(v)}`;
    const arg = { imp: '', acc: 'a', imm: `#$${h2(b1)}`, zp: zp(b1), zpx: `${zp(b1)},x`, zpy: `${zp(b1)},y`, izx: `(${zp(b1)},x)`, izy: `(${zp(b1)}),y`, rel: ref((a + 2 + ((b1 << 24) >> 24)) & 0xffff), abs: ref(w), abx: `${ref(w)},x`, aby: `${ref(w)},y`, ind: `(${ref(w)})` }[mode];
    const lab = (labels.has(a) || xref.has(a)) ? name(a) : null;
    if (lab) {
      if (['rts', 'jmp', 'rti'].includes(out.at(-1)?.split(/\s+/)[3])) out.push('');
      const from = [...(xref.get(a) ?? [])].filter((s) => Math.abs(s - a) > 0x40).slice(0, 6).map(h4);
      out.push(`${lab}:${from.length ? `                                ; from ${from.join(' ')}` : ''}`);
    }
    const bytes = Array.from(mem.subarray(a, a + len), h2).join(' ');
    out.push(`  ${h4(a)}  ${bytes.padEnd(9)}  ${m} ${arg}`);
    a += len;
  } else {
    // Data: runs until the next code/label, 16 per line.
    let b = a + 1;
    while (b <= TO && code[b] !== 1 && !labels.has(b) && !comments.has(b) && b - a < 16) b++;
    if (labels.has(a)) out.push(`${labels.get(a)}:`);
    else if (xref.has(a)) out.push(`D${h4(a)}:`);
    const bytes = Array.from(mem.subarray(a, b));
    const txt = bytes.map((c) => (c >= 0x20 && c < 0x60 ? String.fromCharCode(c) : '.')).join('');
    out.push(`  ${h4(a)}  .byte ${bytes.map(h2).join(' ').padEnd(47)} ; ${txt}`);
    a = b;
  }
}
// Collapse long runs of identical data lines.
const final = [];
for (let i = 0; i < out.length; i++) {
  const m = out[i].match(/^  ([0-9a-f]{4})  \.byte ((?:[0-9a-f]{2} ?){16})/);
  if (m && /^(\S\S)( \1){15}/.test(m[2].trim())) {
    let j = i;
    while (j + 1 < out.length && out[j + 1].includes(`.byte ${m[2].trim()}`)) j++;
    if (j > i) { final.push(`  ${m[1]}  .fill ${(j - i + 1) * 16}, $${m[2].slice(0, 2)}`); i = j; continue; }
  }
  final.push(out[i]);
}
console.log(final.join('\n'));
if (arg('codemap')) fs.writeFileSync(arg('codemap'), code);
const n = code.reduce((s, c) => s + (c === 1), 0);
console.error(`${n} instructions`);
