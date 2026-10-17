/**
 * A Z80 disassembler (the C64 one, tools/re/disasm.mjs, is 6502). Documented and undocumented opcodes, one line each:
 *
 * The command line is zxdis.ts. Output lines are `ADDR  BYTES  TEXT`, with jump and call targets in hex.
 */
const R = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'];
const RP = ['BC', 'DE', 'HL', 'SP'];
const RP2 = ['BC', 'DE', 'HL', 'AF'];
const CC = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'];
const ALU = ['ADD A,', 'ADC A,', 'SUB ', 'SBC A,', 'AND ', 'XOR ', 'OR ', 'CP '];
const ROT = ['RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SLL', 'SRL'];
const IM = ['0', '0', '1', '2', '0', '0', '1', '2'];

export interface Line { readonly addr: number; readonly length: number; readonly text: string }

const hex = (n: number, digits: number) => '$' + n.toString(16).toUpperCase().padStart(digits, '0');

/** Disassemble the instruction at `addr`, reading bytes with `read`. */
export function disassembleOne(read: (addr: number) => number, addr: number): Line {
  let at = addr;
  const u8 = () => read(at++ & 0xffff);
  const u16 = () => { const lo = u8(); return lo | (u8() << 8); };
  const s8 = () => { const v = u8(); return v < 128 ? v : v - 256; };
  let index: 'IX' | 'IY' | null = null;
  let op = u8();
  while (op === 0xdd || op === 0xfd) { index = op === 0xdd ? 'IX' : 'IY'; op = u8(); }
  const hl = index ?? 'HL';
  /** a register operand; with an index prefix H and L are its halves, and (HL) is (IX+d) read after the opcode */
  let disp: number | null = null;
  const reg = (i: number, real = false) => {
    if (i === 6) {
      if (!index) return '(HL)';
      if (disp === null) disp = s8();
      return `(${index}${disp < 0 ? '-' : '+'}${hex(Math.abs(disp), 2)})`;
    }
    if (index && !real && i === 4) return index + 'H';
    if (index && !real && i === 5) return index + 'L';
    return R[i];
  };
  const rel = () => { const d = s8(); return hex((at + d) & 0xffff, 4); };
  let text: string;

  if (op === 0xed) {
    const e = u8(), y = (e >> 3) & 7, z = e & 7, p = y >> 1;
    if ((e >> 6) === 1) {
      switch (z) {
        case 0: text = y === 6 ? 'IN (C)' : `IN ${R[y]},(C)`; break;
        case 1: text = y === 6 ? 'OUT (C),0' : `OUT (C),${R[y]}`; break;
        case 2: text = y & 1 ? `ADC HL,${RP[p]}` : `SBC HL,${RP[p]}`; break;
        case 3: { const n = u16(); text = y & 1 ? `LD ${RP[p]},(${hex(n, 4)})` : `LD (${hex(n, 4)}),${RP[p]}`; break; }
        case 4: text = 'NEG'; break;
        case 5: text = y === 1 ? 'RETI' : 'RETN'; break;
        case 6: text = `IM ${IM[y]}`; break;
        default: text = ['LD I,A', 'LD R,A', 'LD A,I', 'LD A,R', 'RRD', 'RLD', 'NOP', 'NOP'][y];
      }
    } else if ((e >> 6) === 2 && y >= 4 && z < 4) {
      text = [['LDI', 'CPI', 'INI', 'OUTI'], ['LDD', 'CPD', 'IND', 'OUTD'], ['LDIR', 'CPIR', 'INIR', 'OTIR'], ['LDDR', 'CPDR', 'INDR', 'OTDR']][y - 4][z];
    } else text = `DEFB $ED,${hex(e, 2)}`;
  } else if (op === 0xcb) {
    let c: number;
    if (index) { disp = s8(); c = u8(); } else c = u8();
    const x = c >> 6, y = (c >> 3) & 7, z = c & 7;
    const operand = index ? reg(6) : R[z];
    const copy = index && z !== 6 ? `,${R[z]}` : ''; // (the undocumented result copy into a register)
    text = x === 0 ? `${ROT[y]} ${operand}${copy}` : `${['BIT', 'RES', 'SET'][x - 1]} ${y},${operand}${x === 1 ? '' : copy}`;
  } else {
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7, p = y >> 1, q = y & 1;
    const rp = (i: number) => (i === 2 ? hl : RP[i]);
    if (x === 0) {
      switch (z) {
        case 0:
          if (y === 0) text = 'NOP'; else if (y === 1) text = "EX AF,AF'";
          else if (y === 2) text = `DJNZ ${rel()}`; else if (y === 3) text = `JR ${rel()}`; else text = `JR ${CC[y - 4]},${rel()}`;
          break;
        case 1: text = q ? `ADD ${hl},${rp(p)}` : `LD ${rp(p)},${hex(u16(), 4)}`; break;
        case 2:
          switch (y) {
            case 0: text = 'LD (BC),A'; break;
            case 1: text = 'LD A,(BC)'; break;
            case 2: text = 'LD (DE),A'; break;
            case 3: text = 'LD A,(DE)'; break;
            case 4: text = `LD (${hex(u16(), 4)}),${hl}`; break;
            case 5: text = `LD ${hl},(${hex(u16(), 4)})`; break;
            case 6: text = `LD (${hex(u16(), 4)}),A`; break;
            default: text = `LD A,(${hex(u16(), 4)})`;
          }
          break;
        case 3: text = `${q ? 'DEC' : 'INC'} ${rp(p)}`; break;
        case 4: text = `INC ${reg(y)}`; break;
        case 5: text = `DEC ${reg(y)}`; break;
        case 6: { const r = reg(y); text = `LD ${r},${hex(u8(), 2)}`; break; }
        default: text = ['RLCA', 'RRCA', 'RLA', 'RRA', 'DAA', 'CPL', 'SCF', 'CCF'][y];
      }
    } else if (x === 1) {
      if (op === 0x76) text = 'HALT';
      else if (y === 6 || z === 6) { const d = reg(y === 6 ? 6 : z, true); text = y === 6 ? `LD ${d},${R[z]}` : `LD ${R[y]},${d}`; } else text = `LD ${reg(y)},${reg(z)}`;
    } else if (x === 2) {
      text = `${ALU[y]}${reg(z)}`;
    } else {
      switch (z) {
        case 0: text = `RET ${CC[y]}`; break;
        case 1:
          if (!q) text = `POP ${p === 2 ? hl : RP2[p]}`;
          else text = ['RET', 'EXX', `JP (${hl})`, `LD SP,${hl}`][p];
          break;
        case 2: text = `JP ${CC[y]},${hex(u16(), 4)}`; break;
        case 3:
          switch (y) {
            case 0: text = `JP ${hex(u16(), 4)}`; break;
            case 2: text = `OUT (${hex(u8(), 2)}),A`; break;
            case 3: text = `IN A,(${hex(u8(), 2)})`; break;
            case 4: text = `EX (SP),${hl}`; break;
            case 5: text = 'EX DE,HL'; break;
            case 6: text = 'DI'; break;
            default: text = 'EI'; // (y = 1 is the CB prefix, taken before)
          }
          break;
        case 4: text = `CALL ${CC[y]},${hex(u16(), 4)}`; break;
        case 5: text = q ? `CALL ${hex(u16(), 4)}` : `PUSH ${p === 2 ? hl : RP2[p]}`; break;
        case 6: text = `${ALU[y]}${hex(u8(), 2)}`; break;
        default: text = `RST ${hex(y * 8, 2)}`;
      }
    }
  }
  return { addr, length: (at - addr) & 0xffff, text };
}

/** Disassemble from `from` up to (not including) `to`. */
export function disassemble(read: (addr: number) => number, from: number, to: number, data: readonly (readonly [number, number])[] = []): Line[] {
  const lines: Line[] = [];
  let a = from;
  while (a < to) {
    const range = data.find(([lo, hi]) => a >= lo && a < hi);
    if (range) {
      const end = Math.min(range[1], a + 8);
      const bytes: string[] = [];
      for (let i = a; i < end; i++) bytes.push(hex(read(i), 2));
      lines.push({ addr: a, length: end - a, text: `DEFB ${bytes.join(',')}` });
      a = end;
      continue;
    }
    const line = disassembleOne(read, a);
    lines.push(line);
    a += line.length;
  }
  return lines;
}

/** `ADDR  BYTES  TEXT` for a line. */
export function formatLine(read: (addr: number) => number, line: Line): string {
  const bytes: string[] = [];
  for (let i = 0; i < line.length; i++) bytes.push(read(line.addr + i).toString(16).toUpperCase().padStart(2, '0'));
  return `${line.addr.toString(16).toUpperCase().padStart(4, '0')}  ${bytes.join(' ').padEnd(11)} ${line.text}`;
}
