#!/usr/bin/env node
// Builds the original Monty on the Run program ($080E-$FF72) from the
// byte-perfect half of Dave-Agent's reconstruction, without an assembler:
// every instruction there carries its address and bytes in a comment, and the
// data is plain .byte/.text/.word/.fill. Two uses:
//
// - a .prg with a "10 SYS 2064" line, for tools/probe to run as the reference
//   the port is checked against (games/montyotr/test/title.ts);
// - `originalImage()` for tools/extract-motr.mjs, which checks the data it reads
//   from the refactored half against the original's own bytes (the refactored
//   source tidied a few, e.g. two characters of the title's "MONTY" logo).
//
// Nothing of it ships.
//
// Usage: node tools/motr-prg.mjs <path-to-monty-on-the-run> [out.prg]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** KickAssembler's text encodings. */
function encode(s, enc) {
  return [...s].map((ch) => {
    const c = ch.charCodeAt(0);
    if (enc === 'ascii') return c;
    // screencode_mixed: a-z -> 1-26, A-Z -> $41-$5A, @ -> 0, [ £ ] -> $1B-$1D
    if (c >= 0x61 && c <= 0x7a) return c - 0x60;
    if (c >= 0x41 && c <= 0x5a) return c;
    if (ch === '@') return 0;
    if (ch === '[') return 0x1b;
    if (ch === '£') return 0x1c;
    if (ch === ']') return 0x1d;
    return c & 0x7f;
  });
}

/** The items of a directive's operand list. */
const items = (s) => s.split(',').map((t) => t.trim()).filter(Boolean);

/** The original's 64K as it loads ($080E-$FF72 filled), from the byte-perfect source. */
export function originalImage(repo, log = console.log) {
  const dir = path.join(repo, 'byte-perfect/src');
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  const lines = read('motr.asm');

  // Symbols: .label/.const in every file (values are expressions over earlier ones).
  const sym = new Map();
  const evalExpr = (e, strict = true) => {
    const js = e.trim()
      .replace(/\$([0-9a-fA-F]+)/g, (_, h) => String(parseInt(h, 16)))
      .replace(/%([01]+)/g, (_, b) => String(parseInt(b, 2)))
      .replace(/'(.)'/g, (_, c) => String(c.charCodeAt(0)))
      .replace(/[A-Za-z_][\w.]*/g, (name) => {
        if (sym.has(name)) return String(sym.get(name));
        if (!strict) return '0';
        throw new Error(`unknown symbol ${name} in "${e}"`);
      });
    // < low byte, > high byte (prefix)
    return Function(`return (${js.replace(/^<(.*)$/, '($1)&255').replace(/^>(.*)$/, '(($1)>>8)&255')});`)();
  };
  for (const f of ['symbols.asm', 'libs/cpu.asm', 'libs/vic.asm', 'libs/cia.asm', 'libs/sid.asm', 'motr.asm']) {
    const ns = [];
    for (const raw of read(f)) {
      const line = raw.replace(/\/\/.*$/, '');
      let m;
      if ((m = line.match(/^\s*\.namespace\s+(\w+)/))) { ns.push(m[1]); continue; }
      if ((m = line.match(/^\s*\.(?:label|const)\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/))) {
        const v = evalExpr(m[2], false);
        sym.set(m[1], v);
        if (ns.length) sym.set([...ns, m[1]].join('.'), v);
      }
    }
  }

  // Two passes: the first places labels, the second emits.
  let image = new Uint8Array(0), macro = null;
  for (const pass of [1, 2]) {
    image = new Uint8Array(0x10000);
    const written = new Uint8Array(0x10000);
    let pc = 0, enc = 'screencode_mixed', skip = false, mismatches = 0;
    const put = (v) => { image[pc] = v & 0xff; written[pc] = 1; pc++; };
    for (const raw of lines) {
      const code = raw.replace(/\/\/.*$/, '');
      const comment = raw.includes('//') ? raw.slice(raw.indexOf('//')) : '';
      let m;
      // .if (X) { a } else { b }: only the taken branch (JOYSTICK_PORT is 2: the first)
      if (/^\s*\}\s*else\s*\{/.test(code)) { skip = true; continue; }
      if (skip && /^\s*\}\s*$/.test(code)) { skip = false; continue; }
      if (skip) continue;
      if ((m = code.match(/^\s*\.macro\s+(\w+)\s*\(\)\s*\{\s*(.*)\}\s*$/))) { macro = { name: m[1], body: m[2] }; continue; }
      if ((m = code.match(/^\s*\.pc\s*=\s*\$([0-9a-fA-F]+)/))) { pc = parseInt(m[1], 16); continue; }
      if ((m = code.match(/^\s*\.encoding\s+"(\w+)"/))) { enc = m[1]; continue; }
      if ((m = code.match(/^\s*([A-Za-z_]\w*):/))) {
        // a label: at the instruction's address if this line is one, else here
        const at = comment.match(/\[([0-9A-Fa-f]{4}):/);
        sym.set(m[1], at ? parseInt(at[1], 16) : pc);
      }
      const ins = comment.match(/^\/\/\s*\[([0-9A-Fa-f]{4}):((?:[0-9a-f]{2} ?)+)/);
      const body = code.replace(/^\s*[A-Za-z_]\w*:/, '');
      if (ins && /^\s*[a-z]{3}\b/.test(body)) {
        pc = parseInt(ins[1], 16);
        for (const b of ins[2].trim().split(/\s+/)) put(parseInt(b, 16));
        continue;
      }
      let d = body.match(/^\s*(\.byte|\.text|\.word|\.fill)\s+(.+?)\s*$/);
      if (!d && macro && (m = body.match(/^\s*:?(\w+)\(\)/)) && m[1] === macro.name) d = macro.body.match(/^\s*(\.byte)\s+(.+?)\s*$/);
      if (!d) continue;
      // data lines name their address in a comment: check we're there
      const at = comment.match(/^\/\/\s*\[\$?([0-9A-Fa-f]{4})[\]:\s-]/);
      if (pass === 2 && at && parseInt(at[1], 16) !== pc && mismatches++ < 10) log(`address $${pc.toString(16)} vs comment ${at[1]}: ${raw.trim().slice(0, 80)}`);
      const [, op, args] = d;
      if (op === '.byte') for (const t of items(args)) put(pass === 2 ? evalExpr(t) : 0);
      else if (op === '.word') for (const t of items(args)) { const v = pass === 2 ? evalExpr(t) : 0; put(v); put(v >> 8); }
      else if (op === '.text') for (const v of encode(args.match(/"([^"]*)"/)[1], enc)) put(v);
      else if (op === '.fill') { const [n, v] = items(args); const k = evalExpr(n); for (let i = 0; i < k; i++) put(evalExpr(v)); }
    }
    if (pass === 2) {
      let n = 0;
      for (let a = 0x80e; a <= 0xff72; a++) if (written[a]) n++;
      if (n !== 0xff72 - 0x80e + 1 || mismatches) throw new Error(`byte-perfect source: ${n} bytes placed, ${mismatches} address mismatches`);
    }
  }
  return image;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [, , repo, out = '/tmp/motr.prg'] = process.argv;
  if (!repo) {
    console.error('usage: node tools/motr-prg.mjs <path-to-monty-on-the-run> [out.prg]');
    process.exit(1);
  }
  const image = originalImage(repo);
  // "10 SYS 2064" at $0801, then the program from $080E ($0810 is JMP StartUp).
  const stub = [0x0b, 0x08, 0x0a, 0x00, 0x9e, 0x32, 0x30, 0x36, 0x34, 0x00, 0x00, 0x00, 0x00];
  const prg = new Uint8Array(2 + 0xff73 - 0x801);
  prg[0] = 0x01; prg[1] = 0x08;
  prg.set(stub, 2);
  prg.set(image.subarray(0x80e, 0xff73), 2 + 0x80e - 0x801);
  fs.writeFileSync(out, prg);
  console.log(`wrote ${out} (${prg.length} bytes)`);
}
