/**
 * A Zilog Z80, instruction-stepped, for checking a ZX Spectrum game (tools/zx). Documented behaviour and the
 * undocumented that games and test suites rely on: the X and Y flag bits of every instruction, the SLL and
 * IXH/IXL/IYH/IYL opcodes, the DD/FD CB register copies, BIT n,(HL) flags from the hidden WZ register, the
 * block instructions' flags, IN F,(C) and the ED no-ops. Checked by zexdoc/zexall (tools/zx/test/zex.ts).
 *
 * Not covered by zexall, so taken from published research and unchecked here: the X and Y flags and P/H of a block
 * instruction while it repeats (LDIR, CPIR, INIR, OTIR...), and the NMOS quirk of LD A,I/R when an interrupt lands on it.
 *
 * Timing is the documented T-states per instruction (no memory or I/O contention; the Spectrum model counts
 * frames from `t`). SCF/CCF take X and Y from A, and also from F when the previous instruction did not write F
 * (the NMOS part's "Q" register: `q` below is F if the last instruction wrote it, else 0).
 */

/** What the CPU sees of the machine. */
export interface Bus {
  read(addr: number): number;
  write(addr: number, value: number): void;
  /** Input from a port (the full 16-bit address on the bus). */
  in(port: number): number;
  /** Output to a port; `t` is the T-state the write happens at, on the scale of the CPU's `t`. */
  out(port: number, value: number, t: number): void;
}

const S = 0x80, Z = 0x40, Y = 0x20, H = 0x10, X = 0x08, P = 0x04, N = 0x02, C = 0x01;

/** Parity flag (P) of each byte: set when the number of 1 bits is even. */
const PARITY = new Uint8Array(256);
/** S, Z, X, Y and P of each byte value. */
const SZXYP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let bits = 0;
  for (let k = 0; k < 8; k++) bits += (i >> k) & 1;
  PARITY[i] = bits % 2 === 0 ? P : 0;
  SZXYP[i] = (i & (S | Y | X)) | (i === 0 ? Z : 0) | PARITY[i];
}

// register slots in `regs`: slot 6 holds F so that AF is a pair like the others
const B = 0, Cr = 1, D = 2, E = 3, Hr = 4, L = 5, F = 6, A = 7;

/** Everything the CPU is, for a snapshot. */
export interface Z80State {
  readonly regs: readonly number[];
  readonly alt: readonly number[];
  readonly ix: number;
  readonly iy: number;
  readonly sp: number;
  readonly pc: number;
  readonly i: number;
  readonly r: number;
  readonly wz: number;
  readonly iff1: boolean;
  readonly iff2: boolean;
  readonly im: number;
  readonly halted: boolean;
  readonly noInt: boolean;
  readonly q: number;
}

export class Z80 {
  readonly regs = new Uint8Array(8);
  readonly alt = new Uint8Array(8);
  ix = 0;
  iy = 0;
  sp = 0xffff;
  pc = 0;
  i = 0;
  r = 0;
  wz = 0;
  iff1 = false;
  iff2 = false;
  im = 0;
  halted = false;
  /** Interrupts are held off for one instruction after EI. */
  noInt = false;
  /** T-states run since the counter was last cleared (the machine clears it each frame). */
  t = 0;
  /** What the previous instruction left in F, if it wrote F (0 if not): SCF/CCF's X and Y depend on it. */
  private q = 0;
  /** The current instruction has written F. */
  private fw = false;
  private prefix: 0 | 0xdd | 0xfd = 0;
  /** IX or IY, whichever the current prefix selects (written back at the end of the instruction). */
  private xy = 0;

  constructor(private readonly bus: Bus) {}

  // ---- register pairs ------------------------------------------------------------------------------

  get af() { return (this.regs[A] << 8) | this.regs[F]; }
  set af(v: number) { this.regs[A] = v >> 8; this.sf(v & 255); }
  get bc() { return (this.regs[B] << 8) | this.regs[Cr]; }
  set bc(v: number) { this.regs[B] = v >> 8; this.regs[Cr] = v; }
  get de() { return (this.regs[D] << 8) | this.regs[E]; }
  set de(v: number) { this.regs[D] = v >> 8; this.regs[E] = v; }
  get hl() { return (this.regs[Hr] << 8) | this.regs[L]; }
  set hl(v: number) { this.regs[Hr] = v >> 8; this.regs[L] = v; }

  reset() {
    this.regs.fill(0); this.alt.fill(0);
    this.regs[A] = 0xff; this.sf(0xff);
    this.ix = this.iy = 0xffff; this.sp = 0xffff; this.pc = 0; this.i = 0; this.r = 0; this.wz = 0;
    this.iff1 = this.iff2 = false; this.im = 0; this.halted = false; this.noInt = false; this.q = 0;
  }

  state(): Z80State {
    return {
      regs: [...this.regs], alt: [...this.alt], ix: this.ix, iy: this.iy, sp: this.sp, pc: this.pc, i: this.i, r: this.r,
      wz: this.wz, iff1: this.iff1, iff2: this.iff2, im: this.im, halted: this.halted, noInt: this.noInt, q: this.q,
    };
  }

  setState(s: Z80State) {
    this.regs.set(s.regs); this.alt.set(s.alt);
    this.ix = s.ix; this.iy = s.iy; this.sp = s.sp; this.pc = s.pc; this.i = s.i; this.r = s.r; this.wz = s.wz;
    this.iff1 = s.iff1; this.iff2 = s.iff2; this.im = s.im; this.halted = s.halted; this.noInt = s.noInt; this.q = s.q;
  }

  // ---- bus helpers ---------------------------------------------------------------------------------

  private rd(a: number) { return this.bus.read(a & 0xffff); }
  private wr(a: number, v: number) { this.bus.write(a & 0xffff, v & 255); }
  private rd16(a: number) { return this.rd(a) | (this.rd(a + 1) << 8); }
  private wr16(a: number, v: number) { this.wr(a, v); this.wr(a + 1, v >> 8); }
  private fetch() { const v = this.bus.read(this.pc); this.pc = (this.pc + 1) & 0xffff; return v; }
  private fetch16() { const lo = this.fetch(); return lo | (this.fetch() << 8); }
  private push(v: number) { this.sp = (this.sp - 1) & 0xffff; this.wr(this.sp, v >> 8); this.sp = (this.sp - 1) & 0xffff; this.wr(this.sp, v); }
  private pop() { const lo = this.rd(this.sp); this.sp = (this.sp + 1) & 0xffff; const hi = this.rd(this.sp); this.sp = (this.sp + 1) & 0xffff; return lo | (hi << 8); }
  private sf(v: number) { this.regs[F] = v; this.fw = true; }
  private bumpR() { this.r = (this.r & 0x80) | ((this.r + 1) & 0x7f); }

  // ---- the ALU -------------------------------------------------------------------------------------

  private add8(b: number, carry: number) {
    const a = this.regs[A], res = a + b + carry, r8 = res & 255;
    this.sf((r8 & (S | Y | X)) | (r8 === 0 ? Z : 0) | ((a ^ b ^ res) & H) | ((((a ^ r8) & (b ^ r8)) >> 5) & P) | (res >> 8));
    this.regs[A] = r8;
  }

  private sub8(b: number, carry: number, store: boolean) {
    const a = this.regs[A], res = a - b - carry, r8 = res & 255;
    // (for CP, X and Y come from the operand, not the result)
    const xy = store ? r8 & (Y | X) : b & (Y | X);
    this.sf((r8 & S) | xy | (r8 === 0 ? Z : 0) | ((a ^ b ^ res) & H) | ((((a ^ b) & (a ^ r8)) >> 5) & P) | N | ((res >> 8) & 1));
    if (store) this.regs[A] = r8;
  }

  /** ADD, ADC, SUB, SBC, AND, XOR, OR, CP by the opcode's y field. */
  private alu(y: number, b: number) {
    switch (y) {
      case 0: this.add8(b, 0); break;
      case 1: this.add8(b, this.regs[F] & C); break;
      case 2: this.sub8(b, 0, true); break;
      case 3: this.sub8(b, this.regs[F] & C, true); break;
      case 4: this.regs[A] &= b; this.sf(SZXYP[this.regs[A]] | H); break;
      case 5: this.regs[A] ^= b; this.sf(SZXYP[this.regs[A]]); break;
      case 6: this.regs[A] |= b; this.sf(SZXYP[this.regs[A]]); break;
      default: this.sub8(b, 0, false); break;
    }
  }

  private inc8(v: number) {
    const r = (v + 1) & 255;
    this.sf((this.regs[F] & C) | (r & (S | Y | X)) | (r === 0 ? Z : 0) | ((r & 15) === 0 ? H : 0) | (r === 0x80 ? P : 0));
    return r;
  }

  private dec8(v: number) {
    const r = (v - 1) & 255;
    this.sf((this.regs[F] & C) | (r & (S | Y | X)) | (r === 0 ? Z : 0) | ((r & 15) === 15 ? H : 0) | (r === 0x7f ? P : 0) | N);
    return r;
  }

  private add16(a: number, b: number) {
    const res = a + b;
    this.wz = (a + 1) & 0xffff;
    this.sf((this.regs[F] & (S | Z | P)) | ((res >> 8) & (Y | X)) | (((a ^ b ^ res) >> 8) & H) | (res >> 16));
    return res & 0xffff;
  }

  private adc16(b: number, carry: number) {
    const a = this.hl, res = a + b + carry, r16 = res & 0xffff;
    this.wz = (a + 1) & 0xffff;
    this.sf(((r16 >> 8) & (S | Y | X)) | (r16 === 0 ? Z : 0) | (((a ^ b ^ res) >> 8) & H) | ((((a ^ r16) & (b ^ r16)) >> 13) & P) | (res >> 16));
    this.hl = r16;
  }

  private sbc16(b: number, carry: number) {
    const a = this.hl, res = a - b - carry, r16 = res & 0xffff;
    this.wz = (a + 1) & 0xffff;
    this.sf(((r16 >> 8) & (S | Y | X)) | (r16 === 0 ? Z : 0) | (((a ^ b ^ res) >> 8) & H) | ((((a ^ b) & (a ^ r16)) >> 13) & P) | N | ((res >> 16) & 1));
    this.hl = r16;
  }

  private daa() {
    const a = this.regs[A], f = this.regs[F];
    let adj = 0, carry = f & C;
    if ((f & H) || (a & 15) > 9) adj |= 6;
    if (carry || a > 0x99) { adj |= 0x60; carry = C; }
    const r = f & N ? (a - adj) & 255 : (a + adj) & 255;
    const h = f & N ? ((f & H) && (a & 15) < 6 ? H : 0) : ((a & 15) > 9 ? H : 0);
    this.regs[A] = r;
    this.sf(SZXYP[r] | (f & N) | h | carry);
  }

  /** Rotate/shift by the CB opcode's y field; flags S Z X Y P C, N and H clear. */
  private shift(y: number, v: number) {
    let r: number, c: number;
    const fc = this.regs[F] & C;
    switch (y) {
      case 0: c = v >> 7; r = ((v << 1) | c) & 255; break; // RLC
      case 1: c = v & 1; r = (v >> 1) | (c << 7); break; // RRC
      case 2: c = v >> 7; r = ((v << 1) | fc) & 255; break; // RL
      case 3: c = v & 1; r = (v >> 1) | (fc << 7); break; // RR
      case 4: c = v >> 7; r = (v << 1) & 255; break; // SLA
      case 5: c = v & 1; r = (v >> 1) | (v & 0x80); break; // SRA
      case 6: c = v >> 7; r = ((v << 1) | 1) & 255; break; // SLL (undocumented)
      default: c = v & 1; r = v >> 1; break; // SRL
    }
    this.sf(SZXYP[r] | c);
    return r;
  }

  private cond(y: number) {
    const f = this.regs[F];
    switch (y) {
      case 0: return !(f & Z);
      case 1: return !!(f & Z);
      case 2: return !(f & C);
      case 3: return !!(f & C);
      case 4: return !(f & P);
      case 5: return !!(f & P);
      case 6: return !(f & S);
      default: return !!(f & S);
    }
  }

  /** The 16-bit register of the main opcode map's `p` field (3 = SP) with HL replaced by IX/IY under a prefix. */
  private getRp(p: number) {
    switch (p) {
      case 0: return this.bc;
      case 1: return this.de;
      case 2: return this.prefix ? this.xy : this.hl;
      default: return this.sp;
    }
  }

  private setRp(p: number, v: number) {
    switch (p) {
      case 0: this.bc = v; break;
      case 1: this.de = v; break;
      case 2: if (this.prefix) this.xy = v; else this.hl = v; break;
      default: this.sp = v; break;
    }
  }

  /** An 8-bit register by the opcode's field, H and L as IXH/IXL (or IY) under a prefix. Not 6. */
  private getR(i: number) {
    if (this.prefix) {
      if (i === Hr) return this.xy >> 8;
      if (i === L) return this.xy & 255;
    }
    return this.regs[i === 7 ? A : i];
  }

  private setR(i: number, v: number) {
    if (this.prefix) {
      if (i === Hr) { this.xy = (this.xy & 0xff) | (v << 8); return; }
      if (i === L) { this.xy = (this.xy & 0xff00) | v; return; }
    }
    this.regs[i === 7 ? A : i] = v;
  }

  // ---- stepping ------------------------------------------------------------------------------------

  /** Take the maskable interrupt if the CPU will; returns whether it did (and added the T-states). */
  interrupt(): boolean {
    if (!this.iff1 || this.noInt) return false;
    this.halted = false;
    this.iff1 = this.iff2 = false;
    this.bumpR();
    this.push(this.pc);
    if (this.im < 2) { this.pc = 0x38; this.t += 13; } else {
      this.pc = this.rd16((this.i << 8) | 0xff); this.t += 19;
    }
    this.wz = this.pc;
    return true;
  }

  /** Run one instruction; returns its T-states (also added to `t`). */
  step(): number {
    const t0 = this.t;
    this.fw = false;
    this.noInt = false;
    if (this.halted) {
      this.bumpR(); this.t += 4;
      return 4;
    }
    this.prefix = 0;
    this.bumpR();
    let op = this.fetch();
    while (op === 0xdd || op === 0xfd) {
      // (a prefix followed by another prefix is just a 4 T-state no-op for the first)
      if (this.prefix) this.t += 4;
      this.prefix = op;
      this.bumpR();
      op = this.fetch();
    }
    if (this.prefix) {
      this.xy = this.prefix === 0xdd ? this.ix : this.iy;
      this.t += 4;
    }
    if (op === 0xed) {
      this.prefix = 0;
      this.bumpR();
      this.ed(this.fetch());
    } else if (op === 0xcb) {
      this.cb();
    } else {
      this.main(op);
    }
    if (this.prefix === 0xdd) this.ix = this.xy; else if (this.prefix === 0xfd) this.iy = this.xy;
    this.q = this.fw ? this.regs[F] : 0;
    return this.t - t0;
  }

  /** The effective address of (HL), or (IX+d)/(IY+d) after reading d; adds the 8 T-states of the latter. */
  private ea() {
    if (!this.prefix) return this.hl;
    const d = this.fetch();
    this.xy &= 0xffff;
    const a = (this.xy + (d < 128 ? d : d - 256)) & 0xffff;
    this.wz = a;
    this.t += 8;
    return a;
  }

  private main(op: number) {
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7, p = y >> 1, q = y & 1;
    const regs = this.regs;
    switch (x) {
      case 0:
        switch (z) {
          case 0:
            if (y === 0) { this.t += 4; } else if (y === 1) { // EX AF,AF'
              const a = regs[A], f = regs[F];
              regs[A] = this.alt[A]; this.sf(this.alt[F]); this.alt[A] = a; this.alt[F] = f;
              this.t += 4;
            } else {
              const d = this.fetch(); const dd = d < 128 ? d : d - 256;
              if (y === 2) { // DJNZ
                regs[B] = (regs[B] - 1) & 255;
                if (regs[B]) { this.pc = (this.pc + dd) & 0xffff; this.wz = this.pc; this.t += 13; } else this.t += 8;
              } else if (y === 3 || this.cond(y - 4)) { // JR, JR cc
                this.pc = (this.pc + dd) & 0xffff; this.wz = this.pc; this.t += 12;
              } else this.t += 7;
            }
            break;
          case 1:
            if (q === 0) { this.setRp(p, this.fetch16()); this.t += 10; } else {
              const v = this.add16(this.getRp(2), this.getRp(p));
              this.setRp(2, v); this.t += 11;
            }
            break;
          case 2:
            switch (y) {
              case 0: this.wr(this.bc, regs[A]); this.wz = ((this.bc + 1) & 0xff) | (regs[A] << 8); this.t += 7; break;
              case 1: regs[A] = this.rd(this.bc); this.wz = (this.bc + 1) & 0xffff; this.t += 7; break;
              case 2: this.wr(this.de, regs[A]); this.wz = ((this.de + 1) & 0xff) | (regs[A] << 8); this.t += 7; break;
              case 3: regs[A] = this.rd(this.de); this.wz = (this.de + 1) & 0xffff; this.t += 7; break;
              case 4: { const a = this.fetch16(); this.wr16(a, this.getRp(2)); this.wz = (a + 1) & 0xffff; this.t += 16; break; }
              case 5: { const a = this.fetch16(); this.setRp(2, this.rd16(a)); this.wz = (a + 1) & 0xffff; this.t += 16; break; }
              case 6: { const a = this.fetch16(); this.wr(a, regs[A]); this.wz = ((a + 1) & 0xff) | (regs[A] << 8); this.t += 13; break; }
              default: { const a = this.fetch16(); regs[A] = this.rd(a); this.wz = (a + 1) & 0xffff; this.t += 13; break; }
            }
            break;
          case 3:
            this.setRp(p, (this.getRp(p) + (q ? -1 : 1)) & 0xffff); this.t += 6;
            break;
          case 4:
          case 5:
            if (y === 6) {
              const a = this.ea(), v = this.rd(a);
              this.wr(a, z === 4 ? this.inc8(v) : this.dec8(v)); this.t += 11;
            } else {
              const v = this.getR(y);
              this.setR(y, z === 4 ? this.inc8(v) : this.dec8(v)); this.t += 4;
            }
            break;
          case 6:
            if (y === 6) {
              const a = this.ea(), n = this.fetch();
              this.wr(a, n); this.t += this.prefix ? 7 : 10; // (IX+d): 19 in all, the prefix's 4 and ea()'s 8 are counted
            } else { this.setR(y, this.fetch()); this.t += 7; }
            break;
          default:
            this.rot(y);
            break;
        }
        break;
      case 1:
        if (op === 0x76) { this.halted = true; this.t += 4; break; }
        if (y === 6) { const a = this.ea(); this.wr(a, this.regs[z === 7 ? A : z]); this.t += 7; } else if (z === 6) {
          const a = this.ea(); regs[y === 7 ? A : y] = this.rd(a); this.t += 7; // (H and L are the real ones here)
        } else { this.setR(y, this.getR(z)); this.t += 4; }
        break;
      case 2:
        if (z === 6) { const a = this.ea(); this.alu(y, this.rd(a)); this.t += 7; } else { this.alu(y, this.getR(z)); this.t += 4; }
        break;
      default:
        this.xthree(y, z, p, q);
        break;
    }
  }

  /** Opcodes 0x07, 0x0F, ... 0x3F: RLCA, RRCA, RLA, RRA, DAA, CPL, SCF, CCF. */
  private rot(y: number) {
    const regs = this.regs, a = regs[A], f = regs[F];
    this.t += 4;
    switch (y) {
      case 0: { const c = a >> 7; regs[A] = ((a << 1) | c) & 255; this.sf((f & (S | Z | P)) | (regs[A] & (Y | X)) | c); break; }
      case 1: { const c = a & 1; regs[A] = (a >> 1) | (c << 7); this.sf((f & (S | Z | P)) | (regs[A] & (Y | X)) | c); break; }
      case 2: { regs[A] = ((a << 1) | (f & C)) & 255; this.sf((f & (S | Z | P)) | (regs[A] & (Y | X)) | (a >> 7)); break; }
      case 3: { regs[A] = (a >> 1) | ((f & C) << 7); this.sf((f & (S | Z | P)) | (regs[A] & (Y | X)) | (a & 1)); break; }
      case 4: this.daa(); break;
      case 5: regs[A] = a ^ 255; this.sf((f & (S | Z | P | C)) | H | N | (regs[A] & (Y | X))); break;
      case 6: this.sf((f & (S | Z | P)) | (((this.q ^ f) | a) & (Y | X)) | C); break; // SCF
      default: this.sf((f & (S | Z | P)) | (((this.q ^ f) | a) & (Y | X)) | ((f & C) << 4) | (f & C ? 0 : C)); break; // CCF
    }
  }

  private xthree(y: number, z: number, p: number, q: number) {
    const regs = this.regs;
    switch (z) {
      case 0: // RET cc
        if (this.cond(y)) { this.pc = this.pop(); this.wz = this.pc; this.t += 11; } else this.t += 5;
        break;
      case 1:
        if (q === 0) { // POP
          const v = this.pop();
          if (p === 3) this.af = v; else if (p === 2) this.setRp(2, v); else this.setRp(p, v);
          this.t += 10;
        } else switch (p) {
          case 0: this.pc = this.pop(); this.wz = this.pc; this.t += 10; break; // RET
          case 1: { // EXX
            for (let k = 0; k < 6; k++) { const v = regs[k]; regs[k] = this.alt[k]; this.alt[k] = v; }
            this.t += 4; break;
          }
          case 2: this.pc = this.prefix ? this.xy : this.hl; this.t += 4; break; // JP (HL)
          default: this.sp = this.prefix ? this.xy : this.hl; this.t += 6; break; // LD SP,HL
        }
        break;
      case 2: { // JP cc,nn
        const a = this.fetch16(); this.wz = a;
        if (this.cond(y)) this.pc = a;
        this.t += 10;
        break;
      }
      case 3:
        switch (y) {
          case 0: this.pc = this.fetch16(); this.wz = this.pc; this.t += 10; break;
          case 2: { // OUT (n),A
            const n = this.fetch(); const port = (regs[A] << 8) | n;
            this.bus.out(port, regs[A], this.t + 7);
            this.wz = ((n + 1) & 0xff) | (regs[A] << 8); this.t += 11; break;
          }
          case 3: { // IN A,(n)
            const n = this.fetch(); const port = (regs[A] << 8) | n;
            this.wz = (port + 1) & 0xffff;
            regs[A] = this.bus.in(port); this.t += 11; break;
          }
          case 4: { // EX (SP),HL
            const lo = this.rd(this.sp), hi = this.rd(this.sp + 1);
            const cur = this.prefix ? this.xy : this.hl;
            this.wr(this.sp, cur); this.wr(this.sp + 1, cur >> 8);
            this.setRp(2, lo | (hi << 8)); this.wz = lo | (hi << 8); this.t += 19; break;
          }
          case 5: { // EX DE,HL (not affected by a prefix)
            const d = regs[D], e = regs[E]; regs[D] = regs[Hr]; regs[E] = regs[L]; regs[Hr] = d; regs[L] = e; this.t += 4; break;
          }
          case 6: this.iff1 = this.iff2 = false; this.t += 4; break; // DI
          default: this.iff1 = this.iff2 = true; this.noInt = true; this.t += 4; break; // EI
        }
        break;
      case 4: { // CALL cc,nn
        const a = this.fetch16(); this.wz = a;
        if (this.cond(y)) { this.push(this.pc); this.pc = a; this.t += 17; } else this.t += 10;
        break;
      }
      case 5:
        if (q === 0) { // PUSH
          this.push(p === 3 ? this.af : this.getRp(p)); this.t += 11;
        } else if (p === 0) { // CALL nn
          const a = this.fetch16(); this.wz = a; this.push(this.pc); this.pc = a; this.t += 17;
        }
        // (DD, ED, FD are handled before; nothing else has z = 5, q = 1)
        break;
      case 6: this.alu(y, this.fetch()); this.t += 7; break;
      default: // RST
        this.push(this.pc); this.pc = y * 8; this.wz = this.pc; this.t += 11;
        break;
    }
  }

  // ---- CB ------------------------------------------------------------------------------------------

  private cb() {
    const regs = this.regs;
    let a = 0, op: number;
    if (this.prefix) { // DD CB d op: the displacement comes before the opcode (and neither is an M1 fetch)
      const d = this.fetch();
      a = (this.xy + (d < 128 ? d : d - 256)) & 0xffff;
      this.wz = a;
      op = this.fetch();
    } else { this.bumpR(); op = this.fetch(); }
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7;
    if (this.prefix || z === 6) {
      if (!this.prefix) a = this.hl;
      const v = this.rd(a);
      if (x === 1) { // BIT n,(HL) / (IX+d): X and Y come from the high byte of WZ (the address)
        this.sf((regs[F] & C) | H | (v & (1 << y) ? (y === 7 ? S : 0) : Z | P) | ((this.wz >> 8) & (Y | X)));
        this.fw = true;
        this.t += this.prefix ? 16 : 12;
        return;
      }
      const r = x === 0 ? this.shift(y, v) : x === 2 ? v & ~(1 << y) : v | (1 << y);
      this.wr(a, r);
      if (this.prefix && z !== 6) regs[z] = r; // (the undocumented copy into a register, the real H and L too)
      this.t += this.prefix ? 19 : 15;
      return;
    }
    const v = regs[z];
    if (x === 1) {
      this.sf((regs[F] & C) | H | (v & (1 << y) ? (y === 7 ? S : 0) : Z | P) | (v & (Y | X)));
      this.fw = true;
    } else if (x === 0) regs[z] = this.shift(y, v);
    else if (x === 2) regs[z] = v & ~(1 << y);
    else regs[z] = v | (1 << y);
    this.t += 8;
  }

  // ---- ED ------------------------------------------------------------------------------------------

  private ed(op: number) {
    const regs = this.regs;
    const x = op >> 6, y = (op >> 3) & 7, z = op & 7, p = y >> 1, q = y & 1;
    this.t += 4;
    if (x === 1) {
      switch (z) {
        case 0: { // IN r,(C)
          const port = this.bc; const v = this.bus.in(port);
          this.wz = (port + 1) & 0xffff;
          this.sf((regs[F] & C) | SZXYP[v]);
          if (y !== 6) regs[y === 7 ? A : y] = v;
          this.t += 8; break;
        }
        case 1: { // OUT (C),r  (y = 6 outputs 0)
          const port = this.bc;
          this.bus.out(port, y === 6 ? 0 : regs[y === 7 ? A : y], this.t + 8);
          this.wz = (port + 1) & 0xffff; this.t += 8; break;
        }
        case 2:
          if (q === 0) this.sbc16(this.getRp(p), regs[F] & C); else this.adc16(this.getRp(p), regs[F] & C);
          this.t += 11; break;
        case 3: {
          const a = this.fetch16(); this.wz = (a + 1) & 0xffff;
          if (q === 0) this.wr16(a, this.getRp(p)); else this.setRp(p, this.rd16(a));
          this.t += 16; break;
        }
        case 4: { // NEG
          const a = regs[A]; regs[A] = 0; this.sub8(a, 0, true); this.t += 4; break;
        }
        case 5: // RETN / RETI
          this.iff1 = this.iff2; this.pc = this.pop(); this.wz = this.pc; this.t += 10; break;
        case 6: this.im = [0, 0, 1, 2][y & 3]; this.t += 4; break;
        default:
          switch (y) {
            case 0: this.i = regs[A]; this.t += 5; break;
            case 1: this.r = regs[A]; this.t += 5; break;
            case 2: case 3: {
              const v = y === 2 ? this.i : this.r;
              regs[A] = v;
              this.sf((regs[F] & C) | SZXYP[v] & ~P | (this.iff2 ? P : 0)); this.t += 5; break;
            }
            case 4: case 5: { // RRD / RLD
              const m = this.rd(this.hl), a = regs[A];
              let nm: number, na: number;
              if (y === 4) { nm = ((a << 4) | (m >> 4)) & 255; na = (a & 0xf0) | (m & 15); } else {
                nm = ((m << 4) | (a & 15)) & 255; na = (a & 0xf0) | (m >> 4);
              }
              this.wr(this.hl, nm); regs[A] = na; this.sf((regs[F] & C) | SZXYP[na]);
              this.wz = (this.hl + 1) & 0xffff; this.t += 14; break;
            }
            default: this.t += 4; break; // NOP
          }
      }
      return;
    }
    if (x === 2 && z < 4 && y >= 4) { this.block(y, z); return; }
    this.t += 4; // everything else in ED is a no-op of 8 T-states
  }

  /** LDI, CPI, INI, OUTI and their D, R variants: `y` 4..7 (I, D, IR, DR), `z` 0..3 (LD, CP, IN, OUT). */
  private block(y: number, z: number) {
    const regs = this.regs;
    const dir = y & 1 ? -1 : 1, repeat = y >= 6;
    const startPc = (this.pc - 2) & 0xffff;
    let again = false;
    switch (z) {
      case 0: { // LD
        const v = this.rd(this.hl); this.wr(this.de, v);
        this.hl = (this.hl + dir) & 0xffff; this.de = (this.de + dir) & 0xffff;
        const bc = (this.bc - 1) & 0xffff; this.bc = bc;
        const n = (v + regs[A]) & 255;
        this.sf((regs[F] & (S | Z | C)) | (n & X) | ((n << 4) & Y) | (bc ? P : 0));
        again = repeat && bc !== 0;
        this.t += 12;
        break;
      }
      case 1: { // CP
        const v = this.rd(this.hl);
        const a = regs[A], res = (a - v) & 255, hf = (a ^ v ^ res) & H;
        this.hl = (this.hl + dir) & 0xffff;
        const bc = (this.bc - 1) & 0xffff; this.bc = bc;
        const n = (res - (hf ? 1 : 0)) & 255;
        this.sf((regs[F] & C) | (res & S) | (res === 0 ? Z : 0) | hf | N | (n & X) | ((n << 4) & Y) | (bc ? P : 0));
        this.wz = (this.wz + dir) & 0xffff;
        again = repeat && bc !== 0 && res !== 0;
        this.t += 12;
        break;
      }
      case 2: { // IN
        const port = this.bc;
        const v = this.bus.in(port);
        this.wz = (port + dir) & 0xffff;
        this.wr(this.hl, v);
        regs[B] = (regs[B] - 1) & 255;
        this.hl = (this.hl + dir) & 0xffff;
        const k = v + ((regs[Cr] + dir) & 255);
        this.blockIoFlags(v, k);
        again = repeat && regs[B] !== 0;
        this.t += 12;
        break;
      }
      default: { // OUT
        const v = this.rd(this.hl);
        regs[B] = (regs[B] - 1) & 255;
        const port = this.bc;
        this.bus.out(port, v, this.t + 12);
        this.wz = (port + dir) & 0xffff;
        this.hl = (this.hl + dir) & 0xffff;
        const k = v + regs[L];
        this.blockIoFlags(v, k);
        again = repeat && regs[B] !== 0;
        this.t += 12;
        break;
      }
    }
    if (again) {
      this.pc = startPc;
      this.wz = (startPc + 1) & 0xffff;
      this.t += 5;
      // the repeated instruction shows PC's high byte in X and Y
      this.sf((regs[F] & ~(Y | X)) | ((this.pc >> 8) & (Y | X)));
      if (z >= 2) this.repeatIoFlags(this.lastIo); // INIR..OTDR: P and H change while repeating
    }
  }

  private lastIo = 0;

  private blockIoFlags(v: number, k: number) {
    const regs = this.regs, b = regs[B];
    this.lastIo = v;
    this.sf((b & (S | Y | X)) | (b === 0 ? Z : 0) | (v & 0x80 ? N : 0) | (k > 255 ? H | C : 0) | PARITY[((k & 7) ^ b)]);
  }

  /** The extra flag changes of a repeating INIR/INDR/OTIR/OTDR (Patrik Rak's z80test findings). */
  private repeatIoFlags(v: number) {
    const regs = this.regs, b = regs[B], f = regs[F];
    let pf = f & P, hf = f & H;
    if (f & C) {
      if (v & 0x80) { pf ^= PARITY[(b - 1) & 7] ^ P; hf = (b & 15) === 0 ? H : 0; } else { pf ^= PARITY[(b + 1) & 7] ^ P; hf = (b & 15) === 15 ? H : 0; }
    } else pf ^= PARITY[b & 7] ^ P;
    this.sf((f & ~(P | H)) | pf | hf);
  }
}
