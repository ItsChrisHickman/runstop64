/**
 * A small MOS 6502 emulator — enough to run C64 music players (PSID files).
 *
 * All documented opcodes are implemented. Undocumented opcodes are treated as
 * NOPs of the right length, which is fine for the players we care about.
 * Memory is a flat 64K array; writes are reported through `onWrite` so the
 * host can map I/O (e.g. SID registers at $D400).
 */

const MODES = ['imp', 'acc', 'imm', 'zp', 'zpx', 'zpy', 'abs', 'abx', 'aby', 'ind', 'izx', 'izy', 'rel'] as const;
type Mode = (typeof MODES)[number];
const isMode = (m: string): m is Mode => MODES.some((x) => x === m);

const C = 0x01, Z = 0x02, I = 0x04, D = 0x08, B = 0x10, U = 0x20, V = 0x40, N = 0x80;

// [mnemonic, mode, base cycles] indexed by opcode.
const OPS: Array<[string, Mode, number]> = new Array(256);

function def(list: string) {
  for (const entry of list.trim().split(/\s+/)) {
    const [hex, name, mode, cycles] = entry.split(':');
    if (!isMode(mode)) throw new Error(`cpu6502: bad addressing mode in ${entry}`);
    OPS[parseInt(hex, 16)] = [name, mode, Number(cycles)];
  }
}

def(`
  69:ADC:imm:2 65:ADC:zp:3 75:ADC:zpx:4 6D:ADC:abs:4 7D:ADC:abx:4 79:ADC:aby:4 61:ADC:izx:6 71:ADC:izy:5
  29:AND:imm:2 25:AND:zp:3 35:AND:zpx:4 2D:AND:abs:4 3D:AND:abx:4 39:AND:aby:4 21:AND:izx:6 31:AND:izy:5
  0A:ASL:acc:2 06:ASL:zp:5 16:ASL:zpx:6 0E:ASL:abs:6 1E:ASL:abx:7
  90:BCC:rel:2 B0:BCS:rel:2 F0:BEQ:rel:2 30:BMI:rel:2 D0:BNE:rel:2 10:BPL:rel:2 50:BVC:rel:2 70:BVS:rel:2
  24:BIT:zp:3 2C:BIT:abs:4 00:BRK:imp:7
  18:CLC:imp:2 D8:CLD:imp:2 58:CLI:imp:2 B8:CLV:imp:2
  C9:CMP:imm:2 C5:CMP:zp:3 D5:CMP:zpx:4 CD:CMP:abs:4 DD:CMP:abx:4 D9:CMP:aby:4 C1:CMP:izx:6 D1:CMP:izy:5
  E0:CPX:imm:2 E4:CPX:zp:3 EC:CPX:abs:4 C0:CPY:imm:2 C4:CPY:zp:3 CC:CPY:abs:4
  C6:DEC:zp:5 D6:DEC:zpx:6 CE:DEC:abs:6 DE:DEC:abx:7 CA:DEX:imp:2 88:DEY:imp:2
  49:EOR:imm:2 45:EOR:zp:3 55:EOR:zpx:4 4D:EOR:abs:4 5D:EOR:abx:4 59:EOR:aby:4 41:EOR:izx:6 51:EOR:izy:5
  E6:INC:zp:5 F6:INC:zpx:6 EE:INC:abs:6 FE:INC:abx:7 E8:INX:imp:2 C8:INY:imp:2
  4C:JMP:abs:3 6C:JMP:ind:5 20:JSR:abs:6
  A9:LDA:imm:2 A5:LDA:zp:3 B5:LDA:zpx:4 AD:LDA:abs:4 BD:LDA:abx:4 B9:LDA:aby:4 A1:LDA:izx:6 B1:LDA:izy:5
  A2:LDX:imm:2 A6:LDX:zp:3 B6:LDX:zpy:4 AE:LDX:abs:4 BE:LDX:aby:4
  A0:LDY:imm:2 A4:LDY:zp:3 B4:LDY:zpx:4 AC:LDY:abs:4 BC:LDY:abx:4
  4A:LSR:acc:2 46:LSR:zp:5 56:LSR:zpx:6 4E:LSR:abs:6 5E:LSR:abx:7 EA:NOP:imp:2
  09:ORA:imm:2 05:ORA:zp:3 15:ORA:zpx:4 0D:ORA:abs:4 1D:ORA:abx:4 19:ORA:aby:4 01:ORA:izx:6 11:ORA:izy:5
  48:PHA:imp:3 08:PHP:imp:3 68:PLA:imp:4 28:PLP:imp:4
  2A:ROL:acc:2 26:ROL:zp:5 36:ROL:zpx:6 2E:ROL:abs:6 3E:ROL:abx:7
  6A:ROR:acc:2 66:ROR:zp:5 76:ROR:zpx:6 6E:ROR:abs:6 7E:ROR:abx:7
  40:RTI:imp:6 60:RTS:imp:6
  E9:SBC:imm:2 E5:SBC:zp:3 F5:SBC:zpx:4 ED:SBC:abs:4 FD:SBC:abx:4 F9:SBC:aby:4 E1:SBC:izx:6 F1:SBC:izy:5
  38:SEC:imp:2 F8:SED:imp:2 78:SEI:imp:2
  85:STA:zp:3 95:STA:zpx:4 8D:STA:abs:4 9D:STA:abx:5 99:STA:aby:5 81:STA:izx:6 91:STA:izy:6
  86:STX:zp:3 96:STX:zpy:4 8E:STX:abs:4 84:STY:zp:3 94:STY:zpx:4 8C:STY:abs:4
  AA:TAX:imp:2 A8:TAY:imp:2 BA:TSX:imp:2 8A:TXA:imp:2 9A:TXS:imp:2 98:TYA:imp:2
`);

// The stable undocumented opcodes games and crackers rely on.
def(`
  07:SLO:zp:5 17:SLO:zpx:6 0F:SLO:abs:6 1F:SLO:abx:7 1B:SLO:aby:7 03:SLO:izx:8 13:SLO:izy:8
  27:RLA:zp:5 37:RLA:zpx:6 2F:RLA:abs:6 3F:RLA:abx:7 3B:RLA:aby:7 23:RLA:izx:8 33:RLA:izy:8
  47:SRE:zp:5 57:SRE:zpx:6 4F:SRE:abs:6 5F:SRE:abx:7 5B:SRE:aby:7 43:SRE:izx:8 53:SRE:izy:8
  67:RRA:zp:5 77:RRA:zpx:6 6F:RRA:abs:6 7F:RRA:abx:7 7B:RRA:aby:7 63:RRA:izx:8 73:RRA:izy:8
  87:SAX:zp:3 97:SAX:zpy:4 8F:SAX:abs:4 83:SAX:izx:6
  A7:LAX:zp:3 B7:LAX:zpy:4 AF:LAX:abs:4 BF:LAX:aby:4 A3:LAX:izx:6 B3:LAX:izy:5 AB:LAX:imm:2
  C7:DCP:zp:5 D7:DCP:zpx:6 CF:DCP:abs:6 DF:DCP:abx:7 DB:DCP:aby:7 C3:DCP:izx:8 D3:DCP:izy:8
  E7:ISC:zp:5 F7:ISC:zpx:6 EF:ISC:abs:6 FF:ISC:abx:7 FB:ISC:aby:7 E3:ISC:izx:8 F3:ISC:izy:8
  0B:ANC:imm:2 2B:ANC:imm:2 4B:ALR:imm:2 6B:ARR:imm:2 CB:SBX:imm:2 EB:SBC:imm:2
  1A:NOP:imp:2 3A:NOP:imp:2 5A:NOP:imp:2 7A:NOP:imp:2 DA:NOP:imp:2 FA:NOP:imp:2
  80:NOP:imm:2 82:NOP:imm:2 89:NOP:imm:2 C2:NOP:imm:2 E2:NOP:imm:2
  04:NOP:zp:3 44:NOP:zp:3 64:NOP:zp:3 14:NOP:zpx:4 34:NOP:zpx:4 54:NOP:zpx:4 74:NOP:zpx:4 D4:NOP:zpx:4 F4:NOP:zpx:4
  0C:NOP:abs:4 1C:NOP:abx:4 3C:NOP:abx:4 5C:NOP:abx:4 7C:NOP:abx:4 DC:NOP:abx:4 FC:NOP:abx:4
`);

// Anything left (JAM/KIL and unstable oddities): NOPs with a plausible operand length.
for (let op = 0; op < 256; op++) {
  if (OPS[op]) continue;
  const low = op & 0x1f;
  const mode: Mode =
    low === 0x0c || low === 0x1c || low === 0x0e || low === 0x1e || low === 0x0f || low === 0x1f ||
    low === 0x1b || low === 0x19 ? 'abs'
      : low === 0x02 || low === 0x12 || low === 0x1a || low === 0x0a ? 'imp'
        : 'zp';
  OPS[op] = ['NOP', mode, 2];
}

export class Cpu6502 {
  mem = new Uint8Array(0x10000);
  a = 0; x = 0; y = 0; sp = 0xff; p = U | I; pc = 0;
  cycles = 0;
  /** Called after every memory write, for I/O mapping. */
  onWrite: (addr: number, value: number) => void = () => {};
  /** Optional read hook for I/O; return undefined to fall through to RAM. */
  onRead: (addr: number) => number | undefined = () => undefined;
  /** Fetch opcodes and operands through `onRead` too (for ROM overlays); off for speed in music players. */
  readCode = false;

  private fetch(addr: number) {
    return this.readCode ? this.read(addr) : this.mem[addr & 0xffff];
  }

  /** Take a maskable interrupt (if not masked): push PC and P, jump through $FFFE. */
  irq(): boolean {
    if (this.p & I) return false;
    this.interrupt(0xfffe);
    return true;
  }

  /** Take a non-maskable interrupt: push PC and P, jump through $FFFA. */
  nmi() {
    this.interrupt(0xfffa);
  }

  private interrupt(vector: number) {
    this.push(this.pc >> 8);
    this.push(this.pc);
    this.push((this.p | U) & ~B);
    this.p |= I;
    this.pc = this.read16(vector);
    this.cycles += 7;
  }

  read(addr: number): number {
    const io = this.onRead(addr);
    return io === undefined ? this.mem[addr & 0xffff] : io & 0xff;
  }

  write(addr: number, value: number) {
    addr &= 0xffff;
    value &= 0xff;
    this.mem[addr] = value;
    this.onWrite(addr, value);
  }

  private read16(addr: number) {
    return this.read(addr) | (this.read((addr + 1) & 0xffff) << 8);
  }

  private push(v: number) {
    this.mem[0x100 | this.sp] = v & 0xff;
    this.sp = (this.sp - 1) & 0xff;
  }

  private pull() {
    this.sp = (this.sp + 1) & 0xff;
    return this.mem[0x100 | this.sp];
  }

  private nz(v: number) {
    this.p = (this.p & ~(N | Z)) | (v & N) | (v === 0 ? Z : 0);
    return v;
  }

  /**
   * Call a subroutine (JSR-style) and run until it returns.
   * Returns the number of cycles used. Gives up after `maxCycles`.
   */
  call(addr: number, a = 0, x = 0, y = 0, maxCycles = 2_000_000): number {
    this.a = a & 0xff;
    this.x = x & 0xff;
    this.y = y & 0xff;
    // Return address is $0000 - 1; RTS will land on $0000, our sentinel.
    const startSp = this.sp;
    this.push(0xff);
    this.push(0xff);
    this.pc = addr;
    const start = this.cycles;
    while (this.cycles - start < maxCycles) {
      this.step();
      if (this.pc === 0x0000 && this.sp === startSp) break;
      // Players that end with RTI or jump into a busy loop are rare; bail on BRK.
      if (this.pc === 0xffff) break;
    }
    return this.cycles - start;
  }

  /** Execute one instruction. */
  step() {
    const op = this.fetch(this.pc);
    const [name, mode, base] = OPS[op];
    this.pc = (this.pc + 1) & 0xffff;
    let cycles = base;
    let addr = 0;

    switch (mode) {
      case 'imm': addr = this.pc; this.pc = (this.pc + 1) & 0xffff; break;
      case 'zp': addr = this.fetch(this.pc); this.pc = (this.pc + 1) & 0xffff; break;
      case 'zpx': addr = (this.fetch(this.pc) + this.x) & 0xff; this.pc = (this.pc + 1) & 0xffff; break;
      case 'zpy': addr = (this.fetch(this.pc) + this.y) & 0xff; this.pc = (this.pc + 1) & 0xffff; break;
      case 'abs': addr = this.read16(this.pc); this.pc = (this.pc + 2) & 0xffff; break;
      case 'abx': {
        const b = this.read16(this.pc);
        addr = (b + this.x) & 0xffff;
        if ((b & 0xff00) !== (addr & 0xff00) && name !== 'STA') cycles += isRmw(name) ? 0 : 1;
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case 'aby': {
        const b = this.read16(this.pc);
        addr = (b + this.y) & 0xffff;
        if ((b & 0xff00) !== (addr & 0xff00) && name !== 'STA') cycles += 1;
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case 'ind': {
        const ptr = this.read16(this.pc);
        // 6502 bug: the high byte wraps within the page.
        addr = this.read(ptr) | (this.read((ptr & 0xff00) | ((ptr + 1) & 0xff)) << 8);
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case 'izx': {
        const zp = (this.fetch(this.pc) + this.x) & 0xff;
        addr = this.mem[zp] | (this.mem[(zp + 1) & 0xff] << 8);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }
      case 'izy': {
        const zp = this.fetch(this.pc);
        const b = this.mem[zp] | (this.mem[(zp + 1) & 0xff] << 8);
        addr = (b + this.y) & 0xffff;
        if ((b & 0xff00) !== (addr & 0xff00) && name !== 'STA') cycles += 1;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }
      case 'rel': addr = this.pc + 1 + ((this.fetch(this.pc) << 24) >> 24); this.pc = (this.pc + 1) & 0xffff; break;
    }

    const branch = (cond: boolean) => {
      if (!cond) return;
      cycles += (this.pc & 0xff00) !== (addr & 0xff00) ? 2 : 1;
      this.pc = addr & 0xffff;
    };
    const rmw = (fn: (v: number) => number) => {
      if (mode === 'acc') this.a = fn(this.a);
      else this.write(addr, fn(this.read(addr)));
    };
    const compare = (reg: number) => {
      const v = this.read(addr);
      const r = reg - v;
      this.p = (this.p & ~C) | (r >= 0 ? C : 0);
      this.nz(r & 0xff);
    };

    switch (name) {
      case 'ADC': this.adc(this.read(addr)); break;
      case 'SBC': this.sbc(this.read(addr)); break;
      case 'AND': this.a = this.nz(this.a & this.read(addr)); break;
      case 'ORA': this.a = this.nz(this.a | this.read(addr)); break;
      case 'EOR': this.a = this.nz(this.a ^ this.read(addr)); break;
      case 'ASL': rmw(v => { this.p = (this.p & ~C) | (v >> 7); return this.nz((v << 1) & 0xff); }); break;
      case 'LSR': rmw(v => { this.p = (this.p & ~C) | (v & 1); return this.nz(v >> 1); }); break;
      case 'ROL': rmw(v => { const c = this.p & C; this.p = (this.p & ~C) | (v >> 7); return this.nz(((v << 1) | c) & 0xff); }); break;
      case 'ROR': rmw(v => { const c = this.p & C; this.p = (this.p & ~C) | (v & 1); return this.nz((v >> 1) | (c << 7)); }); break;
      case 'BCC': branch(!(this.p & C)); break;
      case 'BCS': branch(!!(this.p & C)); break;
      case 'BEQ': branch(!!(this.p & Z)); break;
      case 'BNE': branch(!(this.p & Z)); break;
      case 'BMI': branch(!!(this.p & N)); break;
      case 'BPL': branch(!(this.p & N)); break;
      case 'BVC': branch(!(this.p & V)); break;
      case 'BVS': branch(!!(this.p & V)); break;
      case 'BIT': {
        const v = this.read(addr);
        this.p = (this.p & ~(N | V | Z)) | (v & (N | V)) | ((this.a & v) === 0 ? Z : 0);
        break;
      }
      case 'BRK':
        // Treat BRK as "stop" — music players never rely on it.
        this.pc = 0xffff;
        break;
      case 'CLC': this.p &= ~C; break;
      case 'CLD': this.p &= ~D; break;
      case 'CLI': this.p &= ~I; break;
      case 'CLV': this.p &= ~V; break;
      case 'SEC': this.p |= C; break;
      case 'SED': this.p |= D; break;
      case 'SEI': this.p |= I; break;
      case 'CMP': compare(this.a); break;
      case 'CPX': compare(this.x); break;
      case 'CPY': compare(this.y); break;
      case 'DEC': this.write(addr, this.nz((this.read(addr) - 1) & 0xff)); break;
      case 'INC': this.write(addr, this.nz((this.read(addr) + 1) & 0xff)); break;
      case 'DEX': this.x = this.nz((this.x - 1) & 0xff); break;
      case 'DEY': this.y = this.nz((this.y - 1) & 0xff); break;
      case 'INX': this.x = this.nz((this.x + 1) & 0xff); break;
      case 'INY': this.y = this.nz((this.y + 1) & 0xff); break;
      case 'JMP': this.pc = addr; break;
      case 'JSR': {
        const ret = (this.pc - 1) & 0xffff;
        this.push(ret >> 8);
        this.push(ret);
        this.pc = addr;
        break;
      }
      case 'RTS': this.pc = ((this.pull() | (this.pull() << 8)) + 1) & 0xffff; break;
      case 'RTI':
        this.p = (this.pull() | U) & ~B;
        this.pc = this.pull() | (this.pull() << 8);
        break;
      case 'LDA': this.a = this.nz(this.read(addr)); break;
      case 'LDX': this.x = this.nz(this.read(addr)); break;
      case 'LDY': this.y = this.nz(this.read(addr)); break;
      case 'STA': this.write(addr, this.a); break;
      case 'STX': this.write(addr, this.x); break;
      case 'STY': this.write(addr, this.y); break;
      case 'PHA': this.push(this.a); break;
      case 'PHP': this.push(this.p | B | U); break;
      case 'PLA': this.a = this.nz(this.pull()); break;
      case 'PLP': this.p = (this.pull() | U) & ~B; break;
      case 'TAX': this.x = this.nz(this.a); break;
      case 'TAY': this.y = this.nz(this.a); break;
      case 'TSX': this.x = this.nz(this.sp); break;
      case 'TXA': this.a = this.nz(this.x); break;
      case 'TXS': this.sp = this.x; break;
      case 'TYA': this.a = this.nz(this.y); break;
      case 'NOP': break;
      // ---- undocumented ----
      case 'SLO': { const v = this.read(addr); this.p = (this.p & ~C) | (v >> 7); const r = (v << 1) & 0xff; this.write(addr, r); this.a = this.nz(this.a | r); break; }
      case 'RLA': { const v = this.read(addr); const c = this.p & C; this.p = (this.p & ~C) | (v >> 7); const r = ((v << 1) | c) & 0xff; this.write(addr, r); this.a = this.nz(this.a & r); break; }
      case 'SRE': { const v = this.read(addr); this.p = (this.p & ~C) | (v & 1); const r = v >> 1; this.write(addr, r); this.a = this.nz(this.a ^ r); break; }
      case 'RRA': { const v = this.read(addr); const c = this.p & C; this.p = (this.p & ~C) | (v & 1); const r = (v >> 1) | (c << 7); this.write(addr, r); this.adc(r); break; }
      case 'SAX': this.write(addr, this.a & this.x); break;
      case 'LAX': this.a = this.x = this.nz(this.read(addr)); break;
      case 'DCP': { const r = (this.read(addr) - 1) & 0xff; this.write(addr, r); const d = this.a - r; this.p = (this.p & ~C) | (d >= 0 ? C : 0); this.nz(d & 0xff); break; }
      case 'ISC': { const r = (this.read(addr) + 1) & 0xff; this.write(addr, r); this.sbc(r); break; }
      case 'ANC': this.a = this.nz(this.a & this.read(addr)); this.p = (this.p & ~C) | (this.a >> 7); break;
      case 'ALR': { const v = this.a & this.read(addr); this.p = (this.p & ~C) | (v & 1); this.a = this.nz(v >> 1); break; }
      case 'ARR': {
        const v = this.a & this.read(addr);
        this.a = this.nz((v >> 1) | ((this.p & C) << 7));
        this.p = (this.p & ~(C | V)) | ((this.a >> 6) & 1 ? C : 0) | ((((this.a >> 6) ^ (this.a >> 5)) & 1) ? V : 0);
        break;
      }
      case 'SBX': { const d = (this.a & this.x) - this.read(addr); this.p = (this.p & ~C) | (d >= 0 ? C : 0); this.x = this.nz(d & 0xff); break; }
    }

    this.cycles += cycles;
  }

  private adc(v: number) {
    const c = this.p & C;
    if (this.p & D) {
      let lo = (this.a & 0x0f) + (v & 0x0f) + c;
      let hi = (this.a & 0xf0) + (v & 0xf0);
      if (lo > 9) { lo += 6; hi += 0x10; }
      const bin = (this.a + v + c) & 0xff;
      this.p &= ~(C | Z | N | V);
      if (bin === 0) this.p |= Z;
      if (hi & 0x80) this.p |= N;
      if (~(this.a ^ v) & (this.a ^ hi) & 0x80) this.p |= V;
      if (hi > 0x90) hi += 0x60;
      if (hi > 0xff) this.p |= C;
      this.a = (hi & 0xf0) | (lo & 0x0f);
      return;
    }
    const r = this.a + v + c;
    this.p = (this.p & ~(C | V)) | (r > 0xff ? C : 0) | ((~(this.a ^ v) & (this.a ^ r) & 0x80) ? V : 0);
    this.a = this.nz(r & 0xff);
  }

  private sbc(v: number) {
    if (this.p & D) {
      const c = this.p & C ? 0 : 1;
      const bin = this.a - v - c;
      let lo = (this.a & 0x0f) - (v & 0x0f) - c;
      let hi = (this.a & 0xf0) - (v & 0xf0);
      if (lo & 0x10) { lo -= 6; hi -= 0x10; }
      if (hi & 0x100) hi -= 0x60;
      this.p = (this.p & ~(C | V)) | (bin >= 0 ? C : 0) | (((this.a ^ v) & (this.a ^ bin) & 0x80) ? V : 0);
      this.nz(bin & 0xff);
      this.a = (hi & 0xf0) | (lo & 0x0f);
      return;
    }
    this.adc(v ^ 0xff);
  }
}

function isRmw(name: string) {
  return name === 'ASL' || name === 'LSR' || name === 'ROL' || name === 'ROR' || name === 'INC' || name === 'DEC' ||
    name === 'SLO' || name === 'RLA' || name === 'SRE' || name === 'RRA' || name === 'DCP' || name === 'ISC';
}
