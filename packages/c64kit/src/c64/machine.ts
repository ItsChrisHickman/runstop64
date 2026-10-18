import { Cpu6502 } from '../sid/cpu6502';
import { isArrayOf, isBoolean, isNumber, isNumbers, isRecord, isRecordOf, isString, readJson } from '../json';

/**
 * A small C64: the kit's 6502 core plus the parts of the machine a game
 * actually talks to — memory banking, VIC-II registers and raster interrupts,
 * CIA timers, keyboard matrix and joysticks, colour RAM, and a capture of the
 * SID register writes (so a separate SID emulation can play them).
 *
 * It isn't cycle exact: it runs whole instructions and checks raster lines
 * between them. That's enough for most games' logic, and it records, line by
 * line, what the VIC would draw (FrameCapture) so a native renderer can show it.
 */

export const PAL_CYCLES_PER_LINE = 63;
export const PAL_LINES = 312;
export const PAL_FRAME_CYCLES = PAL_CYCLES_PER_LINE * PAL_LINES; // 19656

/** One text row as the VIC fetched it (codes and colours at the row's bad line). */
export interface RowCapture {
  codes: Uint8Array; // 40
  colours: Uint8Array; // 40
  d011: number; d016: number; d018: number; bank: number;
  bg: [number, number, number, number]; // $D021-$D024
  /** The raster line it was fetched on (its first line on the screen: line $33 is the picture's top), if known. */
  line?: number;
}

/** One sprite as the VIC started drawing it (multiplexed sprites appear several times). */
export interface SpriteCapture {
  n: number; x: number; y: number; data: Uint8Array; colour: number;
  multicolour: boolean; expandX: boolean; expandY: boolean; behind: boolean; mc1: number; mc2: number;
}

export interface FrameCapture {
  rows: RowCapture[];
  sprites: SpriteCapture[];
  border: number;
  /** Border colour per raster line (some games split it). */
  borderLines: Uint8Array;
}

export interface SidWrite { cycle: number; reg: number; value: number }

export interface MachineState {
  ram: Uint8Array; colour: Uint8Array; vic: Uint8Array; sid: Uint8Array;
  cpu: { a: number; x: number; y: number; sp: number; p: number; pc: number };
  cia1: { ta: number; latch: number; cra: number; icr: number; mask: number; pra: number; tb: number; latchB: number; crb: number; ddra?: number; prb?: number; ddrb?: number };
  cia2: { pra: number };
  rasterCompare: number;
  cycleInFrame: number;
  /** Latched sprite collisions ($D01E, $D01F), if saved. */
  collisions?: number[];
  /** A native port's own state to resume with (e.g. time still owed to a delay), if any. */
  native?: Record<string, number>;
  /**
   * What the VIC has fetched so far of the frame under way (a state saved part way through a
   * frame: its sprite collisions are worked out from the whole frame), if saved.
   */
  frame?: FrameSoFar;
}

/** The frame under way, as plain JSON (bytes as hex). */
export interface FrameSoFar {
  rows: ({ codes: string; colours: string; d011: number; d016: number; d018: number; bank: number; bg: RowCapture['bg']; line?: number } | null)[];
  sprites: (Omit<SpriteCapture, 'data'> & { data: string })[];
  border: number; borderLines: string;
  spriteStarted: number; lastSpriteY: number[];
}
const toHex = (b: Uint8Array) => Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => Uint8Array.from({ length: h.length >> 1 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16));

/** Shift, Ctrl and C= keys: the KERNAL scan doesn't report them as the pressed key. */
const MODIFIERS = [15, 52, 58, 61];
/** The KERNAL's key decode tables (scan code → PETSCII, unshifted then shifted; 0: none). */
const PETSCII = [
  0x14, 0x0d, 0x1d, 0x88, 0x85, 0x86, 0x87, 0x11, 0x33, 0x57, 0x41, 0x34, 0x5a, 0x53, 0x45, 0,
  0x35, 0x52, 0x44, 0x36, 0x43, 0x46, 0x54, 0x58, 0x37, 0x59, 0x47, 0x38, 0x42, 0x48, 0x55, 0x56,
  0x39, 0x49, 0x4a, 0x30, 0x4d, 0x4b, 0x4f, 0x4e, 0x2b, 0x50, 0x4c, 0x2d, 0x2e, 0x3a, 0x40, 0x2c,
  0x5c, 0x2a, 0x3b, 0x13, 0, 0x3d, 0x5e, 0x2f, 0x31, 0x5f, 0, 0x32, 0x20, 0, 0x51, 0x03,
];
const SHIFTED: Record<number, number> = {
  0x14: 0x94, 0x0d: 0x8d, 0x1d: 0x9d, 0x11: 0x91, 0x88: 0x8c, 0x85: 0x89, 0x86: 0x8a, 0x87: 0x8b, 0x13: 0x93, 0x03: 0x83,
  0x31: 0x21, 0x32: 0x22, 0x33: 0x23, 0x34: 0x24, 0x35: 0x25, 0x36: 0x26, 0x37: 0x27, 0x38: 0x28, 0x39: 0x29,
  0x2c: 0x3c, 0x2e: 0x3e, 0x2f: 0x3f, 0x3a: 0x5b, 0x3b: 0x5d,
};

export class C64 {
  readonly cpu = new Cpu6502();
  readonly ram = this.cpu.mem;
  readonly colour = new Uint8Array(1024);
  readonly vic = new Uint8Array(0x40);
  readonly sid = new Uint8Array(0x20);
  cia1: MachineState['cia1'] = { ta: 0xffff, latch: 0xffff, cra: 0, icr: 0, mask: 0, pra: 0xff, tb: 0xffff, latchB: 0xffff, crb: 0, ddra: 0xff, prb: 0xff, ddrb: 0 };
  cia2 = { pra: 0x03 };
  rasterCompare = 0;
  /** Joystick bits, active low: 1 up, 2 down, 4 left, 8 right, 16 fire. */
  joy1 = 0x1f;
  joy2 = 0x1f;
  /** Keys held, as [row (PA bit), column (PB bit)] in the keyboard matrix. */
  keys: [number, number][] = [];
  /** Native stand-ins for ROM routines, by address (the ROM image there is just RTS). */
  readonly hooks = new Map<number, (m: C64) => void | 'continue'>();
  /** SID writes during the last frame, with cycle offsets from the frame start. */
  sidWrites: SidWrite[] = [];
  /** What the VIC drew in the last completed frame. */
  capture: FrameCapture = emptyCapture();

  /** Latched sprite-sprite ($D01E) and sprite-background ($D01F) collisions; cleared when read. */
  readonly collisions = [0, 0];

  private kernal = new Uint8Array(0x2000).fill(0x60);
  private frameStart = 0;
  private lastLine = -1;
  private building: FrameCapture = emptyCapture();
  private spriteStarted = 0;

  constructor() {
    this.cpu.readCode = true;
    const k = (addr: number, bytes: number[]) => this.kernal.set(bytes, addr - 0xe000);
    k(0xff48, [0x48, 0x8a, 0x48, 0x98, 0x48, 0x6c, 0x14, 0x03]); // IRQ: pha txa pha tya pha jmp ($0314)
    k(0xea31, [0x68, 0xa8, 0x68, 0xaa, 0x68, 0x40]); // pla tay pla tax pla rti
    k(0xea81, [0x68, 0xa8, 0x68, 0xaa, 0x68, 0x40]);
    k(0xfebc, [0x68, 0xa8, 0x68, 0xaa, 0x68, 0x40]);
    k(0xfe43, [0x40]); // NMI: rti
    k(0xfffa, [0x43, 0xfe, 0xe2, 0xfc, 0x48, 0xff]);
    this.ram[0] = 0x2f;
    this.ram[1] = 0x37;
    this.ram[0x0314] = 0x31;
    this.ram[0x0315] = 0xea;
    // The KERNAL's IRQ handler: tick the jiffy clock and scan the keyboard into $CB/$C5
    // (games read the current key there), then the stub restores registers.
    this.hooks.set(0xea31, () => {
      const r = this.ram;
      r[0xa2]++;
      if (r[0xa2] === 0 && ++r[0xa1] === 0x100) r[0xa0]++;
      const code = (k: [number, number]) => k[0] * 8 + k[1];
      const k = this.keys.find((key) => !MODIFIERS.includes(code(key)));
      r[0xc5] = r[0xcb];
      r[0xcb] = k ? code(k) : 64;
      return 'continue';
    });
    // SCNKEY and GETIN, for games that read keys through the KERNAL's keyboard buffer.
    this.hooks.set(0xea87, () => { this.scnkey(); });
    this.hooks.set(0xffe4, () => {
      const c = this.getin();
      this.cpu.a = c;
      this.cpu.p = (this.cpu.p & ~0x83) | (c === 0 ? 0x02 : 0) | (c & 0x80); // Z, N from the key; carry clear
    });
    this.cpu.onRead = (a) => this.read(a);
    this.cpu.onWrite = (a, v) => this.io(a, v);
    const rawWrite = this.cpu.write.bind(this.cpu);
    this.cpu.write = (a: number, v: number) => {
      a &= 0xffff;
      if (a >= 0xd000 && a < 0xe000 && this.ioVisible) {
        const keep = this.ram[a];
        rawWrite(a, v);
        this.ram[a] = keep; // I/O writes don't reach the RAM underneath
      } else {
        rawWrite(a, v);
      }
    };
  }

  // ---- memory map -----------------------------------------------------------------------

  get port() { return this.ram[1] & 7; }
  /**
   * The KERNAL's keyboard scan (SCNKEY, $EA87): the key down now into $CB, and a newly
   * pressed one into the keyboard buffer ($0277, count in $C6). No key repeat.
   */
  scnkey() {
    const r = this.ram;
    const code = (k: [number, number]) => k[0] * 8 + k[1];
    const k = this.keys.find((key) => !MODIFIERS.includes(code(key)));
    const now = k ? code(k) : 64;
    const shift = this.keys.some((key) => code(key) === 15 || code(key) === 52);
    r[0x28d] = shift ? 1 : 0;
    if (now !== 64 && now !== r[0xc5]) {
      const ch = shift ? (SHIFTED[PETSCII[now]] ?? (PETSCII[now] >= 0x41 && PETSCII[now] <= 0x5a ? PETSCII[now] + 0x80 : PETSCII[now])) : PETSCII[now];
      if (ch && r[0xc6] < 10) r[0x277 + r[0xc6]++] = ch;
    }
    r[0xcb] = now;
    r[0xc5] = now;
  }

  /** The KERNAL's GETIN ($FFE4) from the keyboard: the next key in the buffer, or 0. */
  getin() {
    const r = this.ram;
    if (r[0xc6] === 0) return 0;
    const c = r[0x277];
    r.copyWithin(0x277, 0x278, 0x277 + r[0xc6]);
    r[0xc6]--;
    return c;
  }

  get kernalVisible() { return (this.port & 2) !== 0; }
  get basicVisible() { return (this.port & 3) === 3; }
  get ioVisible() { return (this.port & 3) !== 0 && (this.port & 4) !== 0; }
  get cycleInFrame() { return this.cpu.cycles - this.frameStart; }
  get line() { return Math.floor(this.cycleInFrame / PAL_CYCLES_PER_LINE) % PAL_LINES; }
  /** VIC bank base address (from CIA2 port A). */
  get bank() { return (3 - (this.cia2.pra & 3)) * 0x4000; }

  private read(a: number): number | undefined {
    if (a >= 0xe000 && this.kernalVisible) return this.kernal[a - 0xe000];
    if (a < 0xd000 || a >= 0xe000 || !this.ioVisible) return undefined;
    if (a < 0xd400) {
      const r = a & 0x3f;
      const line = this.line;
      if (r === 0x12) return line & 0xff;
      if (r === 0x11) return (this.vic[0x11] & 0x7f) | ((line >> 1) & 0x80);
      if (r === 0x19) return this.vic[0x19] | 0x70;
      if (r === 0x1e || r === 0x1f) { const v = this.collisions[r - 0x1e]; this.collisions[r - 0x1e] = 0; return v; }
      return this.vic[r];
    }
    if (a < 0xd800) {
      const r = a & 0x1f;
      if (r === 0x1b) return (Math.random() * 256) | 0; // voice 3 oscillator: games use it for randomness
      if (r === 0x1c) return 0;
      return 0;
    }
    if (a < 0xdc00) return this.colour[a & 0x3ff] | 0xf0;
    if (a < 0xdd00) {
      const r = a & 0x0f, c = this.cia1;
      // Port A: the keyboard-row outputs (inputs read high), pulled low by joystick 2 and by keys
      // held in columns port B drives low. Port B: the reverse, pulled low by joystick 1.
      if (r === 0x00) return this.portA() & (this.joy2 | 0xe0) & this.keyboardRows();
      if (r === 0x01) return this.portB() & this.keyboardColumns() & (this.joy1 | 0xe0);
      if (r === 0x02) return c.ddra ?? 0xff;
      if (r === 0x03) return c.ddrb ?? 0;
      if (r === 0x04) return c.ta & 0xff;
      if (r === 0x05) return (c.ta >> 8) & 0xff;
      if (r === 0x06) return c.tb & 0xff;
      if (r === 0x07) return (c.tb >> 8) & 0xff;
      if (r === 0x0d) { const v = c.icr; c.icr = 0; return v; }
      if (r === 0x0e) return c.cra;
      if (r === 0x0f) return c.crb;
      return 0;
    }
    if (a < 0xde00) return (a & 0x0f) === 0 ? this.cia2.pra : 0;
    return 0;
  }

  private io(a: number, v: number) {
    if (a < 0xd000 || a >= 0xe000 || !this.ioVisible) return;
    if (a < 0xd400) {
      const r = a & 0x3f;
      if (r === 0x19) this.vic[0x19] &= ~v;
      else this.vic[r] = v;
      if (r === 0x12) this.rasterCompare = (this.rasterCompare & 0x100) | v;
      if (r === 0x11) this.rasterCompare = (this.rasterCompare & 0xff) | ((v & 0x80) << 1);
      if (r === 0x20) this.building.borderLines.fill(v & 15, this.line);
      return;
    }
    if (a < 0xd800) {
      const r = a & 0x1f;
      this.sid[r] = v;
      this.sidWrites.push({ cycle: this.cycleInFrame, reg: r, value: v });
      return;
    }
    if (a < 0xdc00) { this.colour[a & 0x3ff] = v & 15; return; }
    if (a < 0xdd00) {
      const r = a & 0x0f, c = this.cia1;
      if (r === 0x00) c.pra = v;
      if (r === 0x01) c.prb = v;
      if (r === 0x02) c.ddra = v;
      if (r === 0x03) c.ddrb = v;
      if (r === 0x04) c.latch = (c.latch & 0xff00) | v;
      if (r === 0x05) c.latch = (c.latch & 0xff) | (v << 8);
      if (r === 0x06) c.latchB = (c.latchB & 0xff00) | v;
      if (r === 0x07) c.latchB = (c.latchB & 0xff) | (v << 8);
      if (r === 0x0d) c.mask = v & 0x80 ? c.mask | (v & 0x1f) : c.mask & ~(v & 0x1f);
      if (r === 0x0e) { c.cra = v; if (v & 0x10) c.ta = c.latch; }
      if (r === 0x0f) { c.crb = v; if (v & 0x10) c.tb = c.latchB; }
      return;
    }
    if (a < 0xde00 && (a & 0x0f) === 0) this.cia2.pra = v;
  }

  /** What port A drives: outputs as latched, inputs high. */
  private portA() { const c = this.cia1; return (c.pra | ~(c.ddra ?? 0xff)) & 0xff; }
  private portB() { const c = this.cia1; return ((c.prb ?? 0xff) | ~(c.ddrb ?? 0)) & 0xff; }
  /** Keys held in a column port B drives low pull their row low on port A. */
  private keyboardRows() {
    let rows = 0xff;
    const b = this.portB();
    for (const [row, col] of this.keys) if (!(b & (1 << col))) rows &= ~(1 << row);
    return rows;
  }

  private keyboardColumns() {
    let cols = 0xff;
    const a = this.portA();
    for (const [row, col] of this.keys) if (!(a & (1 << row))) cols &= ~(1 << col);
    return cols;
  }

  /** Return from a hooked ROM routine (pop the JSR return address). */
  rts() {
    const cpu = this.cpu;
    cpu.sp = (cpu.sp + 2) & 0xff;
    cpu.pc = ((this.ram[0x100 | ((cpu.sp - 1) & 0xff)] | (this.ram[0x100 | cpu.sp] << 8)) + 1) & 0xffff;
  }

  // ---- running -----------------------------------------------------------------------------

  /**
   * Native replacements for routines in RAM, by address: when the CPU reaches one, the
   * function runs instead and the routine returns (RTS), as if the original had run
   * (unless the function returns 'continue': then the original runs after all).
   */
  readonly patches = new Map<number, (m: C64) => void | 'continue'>();
  private lastCycles = 0;
  /** Driven by `advance` (native code), not `runFrame`. */
  private native = false;

  /** Run one PAL frame (19656 cycles). Returns false if the CPU stopped (BRK/jam). */
  runFrame(): boolean {
    const cpu = this.cpu;
    this.sidWrites = [];
    const end = this.frameStart + PAL_FRAME_CYCLES;
    this.lastCycles = cpu.cycles;
    while (cpu.cycles < end) if (!this.step()) return false;
    this.frameStart = end;
    this.finishFrame();
    return true;
  }

  private finishFrame() {
    if (this.collisionsPerLine) this.drawing = [];
    else this.latchCollisions(this.building);
    this.capture = this.building;
    this.building = emptyCapture();
    this.building.borderLines.fill(this.vic[0x20] & 15);
    this.building.border = this.vic[0x20] & 15;
    this.spriteStarted = 0;
    this.lastLine = -1;
  }

  /** One instruction (or hook), with the timers, raster and interrupts it implies. */
  private step(): boolean {
    const cpu = this.cpu;
    const pc = cpu.pc;
    const patch = this.patches.size ? this.patches.get(pc) : undefined;
    if (patch) {
      // a patch replaces the routine (then returns from it), or declines: 'continue' runs the original
      if (patch(this) !== 'continue') { this.rts(); return true; }
    }
    if (pc >= 0xa000) {
      const hook = this.hooks.get(pc);
      if (hook && ((pc >= 0xe000 && this.kernalVisible) || (pc < 0xc000 && this.basicVisible))) {
        // A hook either replaces the routine (returns from it), or returns 'continue':
        // then it either moved the PC, or the code at the address runs as normal.
        if (hook(this) !== 'continue') { this.rts(); return true; }
        if (cpu.pc !== pc) return true;
      }
    }
    cpu.step();
    if (cpu.pc === 0xffff) return false;
    const dt = cpu.cycles - this.lastCycles;
    this.lastCycles = cpu.cycles;
    this.timers(dt);
    const line = this.line;
    if (line > this.lastLine) this.newLine(line); // (past the frame's end the line wraps to 0: the frame ends first)
    if ((this.vic[0x19] & 0x80) && (this.vic[0x19] & this.vic[0x1a] & 0x0f) && cpu.irq()) this.vic[0x19] &= 0x7f;
    return true;
  }

  /**
   * Native mode: let `cycles` pass without running the 6502 (timers, raster, the frame
   * capture), calling `onIrq` where the CPU would take an interrupt. Returns true if a
   * frame ended (the capture is complete).
   */
  advance(cycles: number, onIrq: () => void): boolean {
    const cpu = this.cpu;
    this.native = true;
    cpu.p |= 0x04; // the CPU itself never takes interrupts in native mode
    let ended = false;
    // Time the 6502 used meanwhile (native code calling original code) may have run past a frame's end.
    while (cpu.cycles >= this.frameStart + PAL_FRAME_CYCLES) {
      this.newLine(PAL_LINES - 1);
      this.frameStart += PAL_FRAME_CYCLES;
      this.finishFrame();
      ended = true;
    }
    if (ended) cycles = Math.max(0, cycles - (cpu.cycles - this.frameStart));
    const end = cpu.cycles + cycles;
    while (cpu.cycles < end) {
      const frameEnd = this.frameStart + PAL_FRAME_CYCLES;
      const lineEnd = this.frameStart + (this.line + 1) * PAL_CYCLES_PER_LINE;
      const to = Math.min(end, lineEnd, frameEnd);
      const dt = to - cpu.cycles;
      cpu.cycles = to;
      this.timers(dt);
      this.lastCycles = cpu.cycles; // (so 6502 code run from onIrq counts only its own time)
      if (cpu.cycles >= frameEnd) {
        this.newLine(PAL_LINES - 1);
        this.frameStart = frameEnd;
        this.finishFrame();
        ended = true;
        continue;
      }
      const line = this.line;
      if (line !== this.lastLine) this.newLine(line);
      const vicIrq = (this.vic[0x19] & 0x80) && (this.vic[0x19] & this.vic[0x1a] & 0x0f);
      const ciaIrq = this.cia1.icr & 0x80 && this.cia1.icr & this.cia1.mask;
      if (vicIrq || ciaIrq) {
        if (vicIrq) this.vic[0x19] &= 0x7f;
        const icr = this.cia1.icr;
        onIrq();
        // (unless the timers fired again meanwhile, e.g. while the handler ran 6502 code: that's another interrupt)
        if (ciaIrq && this.cia1.icr === icr) this.cia1.icr &= 0x7f;
      }
    }
    this.lastCycles = cpu.cycles;
    return ended;
  }

  /** Call a routine in RAM (as JSR would) and run until it returns: for native code calling original code. */
  call(addr: number, maxCycles = Infinity) {
    const cpu = this.cpu;
    const limit = cpu.cycles + maxCycles;
    const sp = cpu.sp;
    const ret = 0xfff0; // a return address no game code uses
    this.lastCycles = cpu.cycles; // (time before the call has been counted already)
    this.ram[0x100 | sp] = (ret - 1) >> 8;
    this.ram[0x100 | ((sp - 1) & 0xff)] = (ret - 1) & 0xff;
    cpu.sp = (sp - 2) & 0xff;
    cpu.pc = addr;
    while (!(cpu.pc === ret && cpu.sp === sp)) {
      if (!this.step()) throw new Error(`CPU stopped in a call to $${addr.toString(16)}`);
      // (a call that runs past the frame's end, from native code between frames: the frame ends there)
      if (cpu.cycles >= this.frameStart + PAL_FRAME_CYCLES && this.native) { this.newLine(PAL_LINES - 1); this.frameStart += PAL_FRAME_CYCLES; this.finishFrame(); }
      if (cpu.cycles > limit) throw new Error(`call to $${addr.toString(16)} ran over ${maxCycles} cycles`);
    }
  }

  private timers(dt: number) {
    const c = this.cia1;
    if (c.cra & 1) {
      c.ta -= dt;
      if (c.ta <= 0) {
        c.ta += c.latch || 0x10000;
        c.icr |= 0x01;
        if (c.mask & 1) { c.icr |= 0x80; this.cpu.irq(); }
      }
    }
    if ((c.crb & 1) && !(c.crb & 0x40)) {
      c.tb -= dt;
      if (c.tb <= 0) {
        c.tb += c.latchB || 0x10000;
        c.icr |= 0x02;
        if (c.mask & 2) { c.icr |= 0x80; this.cpu.irq(); }
      }
    }
  }

  private newLine(line: number) {
    // Lines we skipped (long instructions) still get processed in order.
    for (let l = this.lastLine + 1; l <= line; l++) {
      if (l === this.rasterCompare) {
        this.vic[0x19] |= 0x01;
        if (this.vic[0x1a] & 1) this.vic[0x19] |= 0x80;
      }
      this.captureLine(l);
    }
    this.lastLine = line;
  }

  /** Record what the VIC fetches on this line: a text row at its first line, sprites at their Y. */
  private captureLine(l: number) {
    const v = this.vic;
    const yscroll = v[0x11] & 7;
    if (l >= 0x30 && l < 0xf8 && (l & 7) === yscroll) {
      const row = Math.floor((l - 0x30 - yscroll) / 8);
      if (row >= 0 && row < 25 && !this.building.rows[row]) {
        const screen = this.bank + ((v[0x18] >> 4) & 15) * 0x400 + row * 40;
        this.building.rows[row] = {
          codes: this.ram.slice(screen, screen + 40),
          colours: this.colour.slice(row * 40, row * 40 + 40),
          d011: v[0x11], d016: v[0x16], d018: v[0x18], bank: this.bank,
          bg: [v[0x21] & 15, v[0x22] & 15, v[0x23] & 15, v[0x24] & 15],
          line: l,
        };
      }
    }
    // A sprite starts when the beam reaches its Y; re-arms after it finishes (multiplexing).
    for (let n = 0; n < 8; n++) {
      const bit = 1 << n;
      if (!(v[0x15] & bit)) continue;
      const y = v[n * 2 + 1];
      const height = v[0x17] & bit ? 42 : 21;
      if (this.spriteStarted & bit) {
        if (l >= ((this.lastSpriteY[n] + height) & 0x1ff)) this.spriteStarted &= ~bit;
        continue;
      }
      if (l !== y) continue;
      this.spriteStarted |= bit;
      this.lastSpriteY[n] = l;
      const screen = this.bank + ((v[0x18] >> 4) & 15) * 0x400;
      const ptr = this.ram[screen + 0x3f8 + n];
      const at = this.bank + ptr * 64;
      this.building.sprites.push({
        n, x: v[n * 2] | (((v[0x10] >> n) & 1) << 8), y: l, data: this.ram.slice(at, at + 64),
        colour: v[0x27 + n] & 15, multicolour: !!(v[0x1c] & bit), expandX: !!(v[0x1d] & bit), expandY: !!(v[0x17] & bit),
        behind: !!(v[0x1b] & bit), mc1: v[0x25] & 15, mc2: v[0x26] & 15,
      });
      if (this.collisionsPerLine) { const s = this.building.sprites[this.building.sprites.length - 1]; this.drawing.push({ s, mask: spriteMask(s) }); }
    }
    if (this.collisionsPerLine) this.collideLine(l);
  }
  private lastSpriteY = new Array<number>(8).fill(0);

  /**
   * Sprite collisions line by line, as the VIC finds them while it draws (and raises its
   * interrupt then), rather than all at once at the frame's end. Off by default: games
   * checked against the original with frame-end collisions keep them until checked again.
   */
  collisionsPerLine = false;
  /**
   * How many opaque pixels two sprites must share to count as touching (the VIC's own rule: one). A game
   * can ask for more (a gentler ENHANCED); the frame-end collisions only, not `collisionsPerLine`'s.
   */
  spriteOverlap = 1;
  /** The sprites being drawn this frame (with their opaque pixels), for collisionsPerLine. */
  private drawing: { s: SpriteCapture; mask: SpriteMask }[] = [];

  private collideLine(l: number) {
    const on = this.drawing.filter(({ s, mask }) => l >= s.y && l < s.y + mask.h);
    if (!on.length) return;
    const cap = this.building;
    let ss = 0, sb = 0;
    const sl = l - 0x30, row = sl >= 0 && sl < 200 ? cap.rows[sl >> 3] : undefined;
    for (let i = 0; i < on.length; i++) {
      const { s, mask } = on[i], r = l - s.y, bit = 1 << s.n;
      if (row && !(sb & bit)) {
        const mcm = !!(row.d016 & 0x10), ecm = !!(row.d011 & 0x40);
        const charAt = row.bank + ((row.d018 >> 1) & 7) * 0x800, xs = row.d016 & 7;
        for (let x = 0; x < mask.w; x++) {
          if (!mask.bits[r * mask.w + x]) continue;
          const px = s.x + x - 24 - xs;
          if (px < 0 || px >= 320) continue;
          const c = px >> 3;
          const bits = this.ram[charAt + (ecm ? row.codes[c] & 63 : row.codes[c]) * 8 + (sl & 7)];
          const fg = !ecm && mcm && row.colours[c] & 8 ? ((bits >> (6 - (px & 6))) & 2) !== 0 : (bits & (0x80 >> (px & 7))) !== 0;
          if (fg) { sb |= bit; break; }
        }
      }
      for (let j = i + 1; j < on.length; j++) {
        const b = on[j];
        if (b.s.n === s.n) continue;
        const rb = l - b.s.y;
        const x0 = Math.max(s.x, b.s.x), x1 = Math.min(s.x + mask.w, b.s.x + b.mask.w);
        for (let x = x0; x < x1; x++) {
          if (mask.bits[r * mask.w + x - s.x] && b.mask.bits[rb * b.mask.w + x - b.s.x]) { ss |= bit | (1 << b.s.n); break; }
        }
      }
    }
    if (ss && !this.collisions[0]) this.vic[0x19] |= 0x04;
    if (sb && !this.collisions[1]) this.vic[0x19] |= 0x02;
    if ((ss || sb) && (this.vic[0x19] & this.vic[0x1a] & 0x06)) this.vic[0x19] |= 0x80;
    this.collisions[0] |= ss;
    this.collisions[1] |= sb;
  }

  /** Work out which sprites touched each other or foreground graphics, like the VIC does while drawing. */
  private latchCollisions(cap: FrameCapture) {
    const W = 384, H = 272; // sprite coordinate space covers the borders
    const sprites = cap.sprites.map((s) => ({ s, mask: spriteMask(s) }));
    let ss = 0, sb = 0;
    for (let i = 0; i < sprites.length; i++) {
      const a = sprites[i];
      // sprite-background: any opaque sprite pixel over a foreground char pixel
      if (!(sb & (1 << a.s.n)) && this.touchesForeground(cap, a.s, a.mask)) sb |= 1 << a.s.n;
      for (let j = i + 1; j < sprites.length; j++) {
        const b = sprites[j];
        if (a.s.n === b.s.n) continue;
        if (overlaps(a.s, a.mask, b.s, b.mask, this.spriteOverlap)) ss |= (1 << a.s.n) | (1 << b.s.n);
      }
    }
    void W; void H;
    // The first collision since the register was read raises the VIC's interrupt flag for it
    // (bit 2 sprite-sprite, bit 1 sprite-background), an interrupt if the game enabled it.
    if (ss && !this.collisions[0]) this.vic[0x19] |= 0x04;
    if (sb && !this.collisions[1]) this.vic[0x19] |= 0x02;
    if ((ss || sb) && (this.vic[0x19] & this.vic[0x1a] & 0x06)) this.vic[0x19] |= 0x80;
    this.collisions[0] |= ss;
    this.collisions[1] |= sb;
  }

  private touchesForeground(cap: FrameCapture, s: SpriteCapture, mask: SpriteMask) {
    for (let y = 0; y < mask.h; y++) {
      const sy = s.y + y - 0x30; // screen pixel row
      if (sy < 0 || sy >= 200) continue;
      const row = cap.rows[sy >> 3];
      if (!row) continue;
      const mcm = !!(row.d016 & 0x10), ecm = !!(row.d011 & 0x40);
      const charAt = row.bank + ((row.d018 >> 1) & 7) * 0x800;
      const xs = row.d016 & 7;
      for (let x = 0; x < mask.w; x++) {
        if (!mask.bits[y * mask.w + x]) continue;
        const px = s.x + x - 24 - xs;
        if (px < 0 || px >= 320) continue;
        const c = px >> 3;
        const bits = this.ram[charAt + (ecm ? row.codes[c] & 63 : row.codes[c]) * 8 + (sy & 7)];
        const fg = !ecm && mcm && row.colours[c] & 8 ? ((bits >> (6 - (px & 6))) & 2) !== 0 : (bits & (0x80 >> (px & 7))) !== 0;
        if (fg) return true;
      }
    }
    return false;
  }

  // ---- state -------------------------------------------------------------------------------

  saveState(): MachineState {
    const c = this.cpu;
    return {
      ram: this.ram.slice(), colour: this.colour.slice(), vic: this.vic.slice(), sid: this.sid.slice(),
      cpu: { a: c.a, x: c.x, y: c.y, sp: c.sp, p: c.p, pc: c.pc },
      cia1: { ...this.cia1 }, cia2: { ...this.cia2 }, rasterCompare: this.rasterCompare,
      cycleInFrame: this.cycleInFrame,
      collisions: [...this.collisions],
      frame: this.frameSoFar(),
    };
  }

  private frameSoFar(): FrameSoFar {
    const b = this.building;
    return {
      rows: Array.from(b.rows, (r) => (r ? { ...r, codes: toHex(r.codes), colours: toHex(r.colours), bg: [...r.bg] } : null)),
      sprites: b.sprites.map((sp) => ({ ...sp, data: toHex(sp.data) })),
      border: b.border, borderLines: toHex(b.borderLines),
      spriteStarted: this.spriteStarted, lastSpriteY: [...this.lastSpriteY],
    };
  }

  loadState(s: MachineState) {
    this.ram.set(s.ram);
    this.colour.set(s.colour);
    this.vic.set(s.vic);
    this.sid.set(s.sid);
    Object.assign(this.cpu, s.cpu);
    this.cia1 = { ...s.cia1 };
    this.cia2 = { ...s.cia2 };
    this.rasterCompare = s.rasterCompare;
    this.frameStart = this.cpu.cycles - s.cycleInFrame;
    if (s.collisions) { this.collisions[0] = s.collisions[0]; this.collisions[1] = s.collisions[1]; }
    this.lastLine = this.line - 1;
    if (s.frame) {
      const f = s.frame;
      const rows: RowCapture[] = new Array(25);
      f.rows.forEach((r, i) => { if (r) rows[i] = { ...r, codes: fromHex(r.codes), colours: fromHex(r.colours), bg: [r.bg[0], r.bg[1], r.bg[2], r.bg[3]] }; });
      this.building = {
        rows,
        sprites: f.sprites.map((sp) => ({ ...sp, data: fromHex(sp.data) })),
        border: f.border, borderLines: fromHex(f.borderLines),
      };
      this.spriteStarted = f.spriteStarted;
      this.lastSpriteY = [...f.lastSpriteY];
    }
  }
}

interface SpriteMask { w: number; h: number; bits: Uint8Array }

function spriteMask(s: SpriteCapture): SpriteMask {
  const sx = s.expandX ? 2 : 1, sy = s.expandY ? 2 : 1, w = 24 * sx, h = 21 * sy;
  const bits = new Uint8Array(w * h);
  for (let r = 0; r < 21; r++) for (let b = 0; b < 3; b++) {
    const v = s.data[r * 3 + b];
    if (!v) continue;
    for (let i = 0; i < 8; i++) {
      const on = s.multicolour ? ((v >> (6 - (i & 6))) & 3) !== 0 : (v & (0x80 >> i)) !== 0;
      if (!on) continue;
      for (let j = 0; j < sy; j++) for (let k = 0; k < sx; k++) bits[(r * sy + j) * w + (b * 8 + i) * sx + k] = 1;
    }
  }
  return { w, h, bits };
}

/** Whether two sprites share at least `need` opaque pixels. */
function overlaps(a: SpriteCapture, am: SpriteMask, b: SpriteCapture, bm: SpriteMask, need = 1) {
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + am.w, b.x + bm.w);
  const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + am.h, b.y + bm.h);
  let shared = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (am.bits[(y - a.y) * am.w + (x - a.x)] && bm.bits[(y - b.y) * bm.w + (x - b.x)] && ++shared >= need) return true;
  }
  return false;
}

function emptyCapture(): FrameCapture {
  return { rows: new Array(25), sprites: [], border: 0, borderLines: new Uint8Array(PAL_LINES) };
}

/** Pack a machine state into one binary blob (for shipping a game image or saving progress). */
export function packState(s: MachineState): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify({
    cpu: s.cpu, cia1: s.cia1, cia2: s.cia2, rasterCompare: s.rasterCompare, cycleInFrame: s.cycleInFrame, collisions: s.collisions, native: s.native, frame: s.frame,
  }));
  const out = new Uint8Array(4 + json.length + 0x10000 + 1024 + 0x40 + 0x20);
  new DataView(out.buffer).setUint32(0, json.length, true);
  let o = 4;
  out.set(json, o); o += json.length;
  out.set(s.ram, o); o += 0x10000;
  out.set(s.colour, o); o += 1024;
  out.set(s.vic, o); o += 0x40;
  out.set(s.sid, o);
  return out;
}

/** Every key of `v` named in `keys` holds a number. */
const numbersAt = (v: Record<string, unknown>, keys: readonly string[]) => keys.every((k) => isNumber(v[k]));
/** An optional number: absent, or a number. */
const optionalNumber = (v: unknown) => v === undefined || isNumber(v);

const isCpuState = (v: unknown): v is MachineState['cpu'] => isRecord(v) && numbersAt(v, ['a', 'x', 'y', 'sp', 'p', 'pc']);
const isCia1State = (v: unknown): v is MachineState['cia1'] =>
  isRecord(v) && numbersAt(v, ['ta', 'latch', 'cra', 'icr', 'mask', 'pra', 'tb', 'latchB', 'crb'])
  && optionalNumber(v.ddra) && optionalNumber(v.prb) && optionalNumber(v.ddrb);
const isCia2State = (v: unknown): v is MachineState['cia2'] => isRecord(v) && isNumber(v.pra);
const isBackgrounds = (v: unknown): v is RowCapture['bg'] => isNumbers(v) && v.length === 4;
const isFrameRow = (v: unknown): v is NonNullable<FrameSoFar['rows'][number]> =>
  isRecord(v) && isString(v.codes) && isString(v.colours) && numbersAt(v, ['d011', 'd016', 'd018', 'bank'])
  && isBackgrounds(v.bg) && optionalNumber(v.line);
const isFrameSprite = (v: unknown): v is FrameSoFar['sprites'][number] =>
  isRecord(v) && numbersAt(v, ['n', 'x', 'y', 'colour', 'mc1', 'mc2']) && isString(v.data)
  && isBoolean(v.multicolour) && isBoolean(v.expandX) && isBoolean(v.expandY) && isBoolean(v.behind);
const isFrameSoFar = (v: unknown): v is FrameSoFar =>
  isRecord(v) && Array.isArray(v.rows) && v.rows.every((r) => r === null || isFrameRow(r))
  && isArrayOf(v.sprites, isFrameSprite) && isNumber(v.border) && isString(v.borderLines)
  && isNumber(v.spriteStarted) && isNumbers(v.lastSpriteY);

/** The part of a machine save stored as JSON, checked: what `packState` writes besides the four byte blocks. */
type MachineMeta = Omit<MachineState, 'ram' | 'colour' | 'vic' | 'sid'>;
function parseMeta(v: unknown): MachineMeta {
  if (!isRecord(v)) throw new Error('machine save: header is not an object');
  const { cpu, cia1, cia2, rasterCompare, cycleInFrame, collisions, native, frame } = v;
  if (!isCpuState(cpu)) throw new Error('machine save: bad cpu');
  if (!isCia1State(cia1)) throw new Error('machine save: bad cia1');
  if (!isCia2State(cia2)) throw new Error('machine save: bad cia2');
  if (!isNumber(rasterCompare) || !isNumber(cycleInFrame)) throw new Error('machine save: bad raster or cycle');
  if (collisions !== undefined && !isNumbers(collisions)) throw new Error('machine save: bad collisions');
  if (native !== undefined && !isRecordOf(native, isNumber)) throw new Error('machine save: bad native state');
  if (frame !== undefined && !isFrameSoFar(frame)) throw new Error('machine save: bad frame');
  return { cpu, cia1, cia2, rasterCompare, cycleInFrame, collisions, native, frame };
}

/** Unpack what `packState` wrote, throwing a clear error if the bytes are not a machine save. */
export function unpackState(b: Uint8Array): MachineState {
  if (b.length < 4) throw new Error('machine save: too short');
  const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0, true);
  const blocks = 0x10000 + 1024 + 0x40 + 0x20;
  if (b.length !== 4 + n + blocks) throw new Error(`machine save: ${b.length} bytes, expected ${4 + n + blocks}`);
  const meta = parseMeta(readJson(new TextDecoder().decode(b.subarray(4, 4 + n))));
  let o = 4 + n;
  const take = (len: number) => { const v = b.slice(o, o + len); o += len; return v; };
  return { ...meta, ram: take(0x10000), colour: take(1024), vic: take(0x40), sid: take(0x20) };
}
