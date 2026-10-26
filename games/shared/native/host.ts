import { C64 as Machine, PAL_FRAME_CYCLES, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { bind, cpu, flags, setFlags, type Gen } from './cpu';

/**
 * A native port's runtime: a game's own logic, translated to TypeScript by
 * tools/re/to-ts.mjs, running on c64kit's model of the C64's chips (VIC-II
 * with its raster splits, SID, CIA) with no 6502 doing the work. Each tick is
 * one PAL frame: the main loop runs its frame of logic at the raster line it
 * waited for, as on the C64, and the raster interrupt (the game's handler,
 * translated) splits the screen at its lines.
 *
 * Code that runs from swapped-in blocks (overlays) comes in versions, each
 * translated separately; a call into an overlay picks the version whose code
 * bytes are loaded. Anything not translated runs on the 6502 core as a safety
 * net (calling back into native routines where it can), so a version no test
 * reached still plays.
 */
export interface Translated {
  [name: string]: unknown;
}

/** One translated version of code that gets swapped into a region. */
export interface OverlayVersion {
  module: Translated;
  /** Per entry address: the code bytes its translation came from ([address, hex] runs). */
  code: Record<string, [number, string][]>;
}

export interface PortConfig {
  /** Translated engine routines (exports named r_XXXX). */
  engine: Translated;
  /** The game's restart entry (a generator), where a title snapshot starts. */
  restart: () => Gen;
  /** The main loop (a generator whose first act is its frame wait), and the return address its wait call pushes. */
  mainLoop: () => Gen;
  mainLoopReturn: number;
  /** Address of the main loop's wait call (what `yield` reports there). */
  mainLoopWait: number;
  /** The routine that waits for the next frame (a busy wait for `logicLine`); calls to it are frame waits. */
  waitRoutine: number;
  /** Raster line the main loop waits for (the frame's logic runs there). */
  logicLine: number;
  /**
   * 'raster' (default): the game's main loop waits for a raster line each frame.
   * 'cycles': the game times itself by counting (delay loops; translated with
   * countCycles), so time passes as its code runs, and interrupts arrive meanwhile.
   */
  timing?: 'raster' | 'cycles';
  /**
   * Start a title snapshot on the original code (emulated) until it reaches this address,
   * then carry on natively from `mainLoop` (for titles that are awkward to start natively).
   */
  bootstrapUntil?: number;
  /**
   * The interrupt handler (given the machine, e.g. to read the vector it goes through).
   * With 'cycles' timing it may be a generator: a handler that waits as it works.
   */
  irq: (m: Machine) => void | Gen;
  /** Overlay regions: [first, last] address and the known versions. */
  overlays: { lo: number; hi: number; versions: OverlayVersion[] }[];
  /** Addresses of KERNAL routines translated code jumps to (handled here). */
  kernal?: Record<number, (m: Machine) => void>;
}

/** A translated routine (one that waits for frames is a generator). */
export type Routine = () => void | Gen;
export const isRoutine = (f: unknown): f is Routine => typeof f === 'function';

/** The translated routine at `addr` in a module (its export r_XXXX), if there is one. */
export function routineAt(module: Translated, addr: number): Routine | undefined {
  const fn = module[`r_${addr.toString(16).padStart(4, '0')}`];
  return isRoutine(fn) ? fn : undefined;
}

/** The translation of the routine at `addr` in whichever overlay version is loaded, if any. */
export function findOverlayRoutine(versions: OverlayVersion[], ram: Uint8Array, addr: number): Routine | null {
  const name = `r_${addr.toString(16).padStart(4, '0')}`;
  for (const v of versions) {
    const runs = v.code[name];
    if (!runs) continue;
    let ok = true;
    for (const [start, hex] of runs) {
      for (let i = 0; i < hex.length && ok; i += 2) if (ram[start + i / 2] !== parseInt(hex.slice(i, i + 2), 16)) ok = false;
      if (!ok) break;
    }
    const fn = v.module[name];
    if (ok && isRoutine(fn)) return fn;
  }
  return null;
}

const BOOTED = new Error('reached the main loop');

/** The plain (non-generator) translated routines of an engine, by address: the same for every host of that port, so found once. */
const PLAIN_ROUTINES = new WeakMap<PortConfig['engine'], ReadonlyMap<number, () => void>>();
function plainRoutines(engine: PortConfig['engine']): ReadonlyMap<number, () => void> {
  const known = PLAIN_ROUTINES.get(engine);
  if (known) return known;
  const found = new Map<number, () => void>();
  for (const [name, fn] of Object.entries(engine)) {
    const addr = name.match(/^r_([0-9a-f]{4})$/)?.[1];
    if (!addr || !isRoutine(fn) || fn.constructor.name === 'GeneratorFunction') continue;
    found.set(parseInt(addr, 16), fn);
  }
  PLAIN_ROUTINES.set(engine, found);
  return found;
}

export class NativeHost {
  readonly m = new Machine();
  private main: Gen;
  /** Where the game's code last waited for a frame. */
  lastWait = 0;
  /** Called at each frame wait (a call of the wait routine), with its address: for tests. */
  onWait?: (site: number) => void;
  /**
   * Reads and writes the translated code makes through the C64's memory map (`rd`/`wr`: the
   * I/O chips, and anything that may be them): seen as they happen, e.g. the collision
   * registers as the game reads them; the value returned is what's read or written.
   */
  onRead?: (addr: number, value: number) => number;
  onWrite?: (addr: number, value: number) => number;
  /**
   * Hooks: an instruction listed under "hooks" in its translation's config is about to run
   * (`pc`), with the registers (`cpu`) and memory as they are there. For noting moments
   * (an enemy destroyed, the player hurt); an assist may change registers or memory here.
   */
  onHook?: (pc: number) => void;
  /** Skips: a routine listed under "skips" in its translation's config is entered; true makes the call return at once (a moment's grace: the death isn't carried out). */
  onSkip?: (pc: number) => boolean;
  /**
   * Calls that ran on the 6502 because no translation matched (address → count); and calls into a
   * version that waits for frames from where nothing can wait (they didn't run).
   */
  readonly fallbacks = new Map<number, number>();
  private readonly patched: ReadonlyMap<number, () => void>;
  /** Time owed to the main program (cycles it has run, or a delay it's in), not yet let pass (cycle-timed games). */
  private readonly mainTime = { pending: 0 };
  private readonly bus: Parameters<typeof bind>[0];

  constructor(private readonly port: PortConfig, state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    const m = this.m;
    m.loadState(state);
    m.cpu.p |= 0x04;
    this.bus = {
      ram: m.ram,
      read: (a: number) => { const v = m.cpu.read(a); return this.onRead ? this.onRead(a, v) : v; },
      write: (a: number, v: number) => { if (this.onWrite) v = this.onWrite(a, v); m.cpu.write(a, v); },
      call: (a: number) => this.call(a),
      callGen: (a: number) => this.callGen(a),
      routine: (a: number) => routineAt(port.engine, a),
      hook: (pc: number) => this.onHook?.(pc),
      skip: (pc: number) => this.onSkip?.(pc) ?? false,
    };
    bind(this.bus);
    // For the safety net: the 6502 calls native routines where they exist.
    this.patched = plainRoutines(port.engine);
    if (from === 'mainLoop' && m.cpu.pc !== port.mainLoopWait) {
      // A snapshot of the original, inside the main loop's wait: drop the wait call's return address.
      const sp = m.cpu.sp, ret = m.ram[0x100 | ((sp + 1) & 0xff)] | (m.ram[0x100 | ((sp + 2) & 0xff)] << 8);
      if (ret === port.mainLoopReturn) m.cpu.sp = (sp + 2) & 0xff;
    }
    // The translated code's registers start as the snapshot's (code after a frame wait may rely on X).
    cpu.a = m.cpu.a; cpu.x = m.cpu.x; cpu.y = m.cpu.y; cpu.sp = m.cpu.sp; setFlags(m.cpu.p);
    if (from === 'mainLoop') {
      this.main = port.mainLoop();
      this.main.next(); // up to its wait
      this.waiting = true;
      // (cycle-timed games: the time still owed to the wait it's in, as saved; else what just ran)
      this.mainTime.pending += state.native?.pending ?? cpu.cy;
      cpu.cy = 0;
      // interrupts enabled as saved (saves from before this was kept were all taken with them on)
      cpu.i = state.native?.i ?? 0;
    } else if (port.bootstrapUntil !== undefined) {
      // the title runs on the original code until it reaches the main loop
      m.cpu.p = state.cpu.p;
      this.booting = true;
      this.main = port.mainLoop(); // (started when the original gets there)
      m.patches.set(port.bootstrapUntil, () => { throw BOOTED; });
    } else {
      this.main = port.restart();
      cpu.i = 0;
    }
    this.regs = { ...cpu };
  }

  /** Running the original code until it reaches `bootstrapUntil`. */
  private booting = false;

  private boot() {
    const m = this.m;
    m.sidWrites = [];
    try {
      m.runFrame();
      return;
    } catch (e) {
      if (e !== BOOTED) throw e;
    }
    // The original has reached the main loop: from here on, it's native.
    m.patches.clear();
    this.booting = false;
    bind(this.bus);
    cpu.a = m.cpu.a; cpu.x = m.cpu.x; cpu.y = m.cpu.y; cpu.sp = m.cpu.sp; setFlags(m.cpu.p);
    cpu.i = (m.cpu.p >> 2) & 1;
    m.cpu.p |= 0x04;
    this.regs = { ...cpu };
  }

  /** Run a translated routine between frames (e.g. to redraw part of the status line), keeping the game's registers. */
  callNative(fn: () => void) {
    bind(this.bus);
    Object.assign(cpu, this.regs);
    fn();
    cpu.cy = 0;
    Object.assign(cpu, this.regs);
  }

  /** Start from a snapshot this host saved at its main loop's wait (see `save`). */
  static resume(port: PortConfig, state: MachineState) {
    return new NativeHost(port, state, 'mainLoop');
  }

  /** The machine state, at a frame boundary in the main loop's wait (resume with `NativeHost.resume`). */
  save(): MachineState | null {
    if (this.lastWait !== this.port.mainLoopWait || this.handler) return null;
    const c = this.m.cpu;
    c.a = cpu.a; c.x = cpu.x; c.y = cpu.y; c.sp = cpu.sp;
    c.p = (c.p & 0x3c) | (flags() & 0xc3);
    c.pc = this.port.mainLoopWait; // marks a native save (see the constructor)
    return { ...this.m.saveState(), native: { pending: this.mainTime.pending, i: cpu.i } };
  }

  /** Waiting for the main loop's raster line (set when the main loop waits). */
  private waiting = false;

  /**
   * One frame of raster time. The game's code runs where it ran on the C64: the
   * main loop's frame of logic at its raster line; a loop polling the hardware
   * (a raster line, the fire button) sees time pass as it did: each pass of it
   * takes its cycles.
   */
  tick() {
    if (this.booting) return this.boot();
    if (this.port.timing === 'cycles') return this.tickCycles();
    const m = this.m;
    // (the translated code's memory and registers are this game's, even if another host ran meanwhile)
    bind(this.bus);
    Object.assign(cpu, this.regs);
    m.sidWrites = [];
    let frameDone = false;
    const advance = (cycles: number) => { if (m.advance(cycles, () => this.irq())) frameDone = true; };
    while (!frameDone) {
      if (this.waiting) {
        const now = m.cycleInFrame, target = this.port.logicLine * 63;
        const until = target > now ? target - now : PAL_FRAME_CYCLES - now; // to the line, or to the frame's end
        advance(until);
        if (!frameDone) this.waiting = false; // reached the line: run the logic
        continue;
      }
      const r = this.main.next();
      if (r.done) { this.main = this.port.restart(); continue; }
      const site = r.value & 0xffff;
      this.lastWait = site;
      if (this.isMainWait(site)) { this.waiting = true; this.onWait?.(site); }
      else advance(r.value >>> 16 || 63); // a polling loop: one pass of it takes this many cycles
    }
    this.regs = { ...cpu };
  }

  private regs = { ...cpu };


  /** An interrupt handler that's running (it may wait, as the game's main program does). */
  private handler: { gen: Gen; pending: number; interrupted: typeof cpu } | null = null;
  /** For tests (trace.ts): the main program's generator, and whether an interrupt handler is running. */
  get mainProgram(): Gen { return this.main; }
  get inHandler() { return !!this.handler; }
  private irqRequested = false;

  /**
   * One frame for a game that times itself: its code runs and its cycles pass; a raster
   * interrupt suspends the main program and runs the handler (which may itself wait)
   * until it returns.
   */
  private tickCycles() {
    const m = this.m;
    bind(this.bus);
    Object.assign(cpu, this.regs);
    m.sidWrites = [];
    let frameDone = false;
    let spins = 0;
    while (!frameDone) {
      if (++spins > 5_000_000) throw new Error(`native host: no progress (handler ${!!this.handler}, main pending ${this.mainTime.pending}, line ${m.line}, wait $${this.lastWait.toString(16)})`);
      // An interrupt arrives (not while one's being handled, nor while the program has them
      // disabled: then it waits, as the VIC-II keeps asking): suspend the main program.
      if (this.irqRequested && !this.handler && !cpu.i) {
        this.irqRequested = false;
        const interrupted = { ...cpu };
        cpu.i = 1;
        const r = this.port.irq(m);
        if (r) this.handler = { gen: r, pending: cpu.cy, interrupted };
        else { this.mainTime.pending += cpu.cy; Object.assign(cpu, interrupted); }
        cpu.cy = 0;
        continue;
      }
      const ctx: { pending: number } = this.handler ?? this.mainTime;
      if (ctx.pending > 0) {
        // let time pass, a raster line at most, so interrupts arrive on time
        const step = Math.min(ctx.pending, 63, PAL_FRAME_CYCLES - m.cycleInFrame);
        if (m.advance(step, () => { this.irqRequested = true; })) frameDone = true;
        ctx.pending -= step;
        continue;
      }
      if (this.handler) {
        const r = this.handler.gen.next();
        if (r.done) { this.mainTime.pending += cpu.cy; cpu.cy = 0; Object.assign(cpu, this.handler.interrupted); this.handler = null; continue; }
        this.handler.pending += cpu.cy + (r.value >>> 16) || 1;
        cpu.cy = 0;
        continue;
      }
      const r = this.main.next();
      if (r.done) { this.main = this.port.restart(); continue; }
      const site = r.value & 0xffff;
      this.lastWait = site;
      this.mainTime.pending += cpu.cy + (r.value >>> 16) || 1;
      cpu.cy = 0;
      if (site === this.port.mainLoopWait) this.onWait?.(site); // (a save here owes the whole wait)
    }
    this.regs = { ...cpu };
  }

  /** A yield at a call of the wait routine (otherwise it's a polling loop). */
  private isMainWait(site: number) {
    const r = this.m.ram;
    return r[site] === 0x20 && (r[site + 1] | (r[site + 2] << 8)) === this.port.waitRoutine;
  }

  /** The raster interrupt: the game's handler, with registers kept as the KERNAL's entry and exit did. */
  private irq() {
    const { a, x, y, nz, c, v } = cpu;
    this.port.irq(this.m);
    Object.assign(cpu, { a, x, y, nz, c, v });
  }

  /** Calls out of translated code: into an overlay, the KERNAL, or (safety net) the 6502. */
  private call(addr: number) {
    const k = this.port.kernal?.[addr];
    if (k) return k(this.m);
    for (const o of this.port.overlays) {
      if (addr < o.lo || addr > o.hi) continue;
      const fn = this.overlayRoutine(o.versions, addr);
      if (!fn) continue;
      // (a version that waits for frames, called where nothing can wait: it can't run here, and
      // nothing would show it; noted with the fallbacks: list the call under "callsMayWait")
      if (fn()) this.fallbacks.set(addr, (this.fallbacks.get(addr) ?? 0) + 1);
      return;
    }
    this.fallback(addr);
  }

  /** A call that may wait (into swapped-in code with a version that waits): that version's frames, else as `call`. */
  private callGen(addr: number): Gen | void {
    for (const o of this.port.overlays) {
      if (addr < o.lo || addr > o.hi) continue;
      const fn = this.overlayRoutine(o.versions, addr);
      if (fn) return fn();
    }
    return this.call(addr);
  }

  private overlayRoutine(versions: OverlayVersion[], addr: number) {
    return findOverlayRoutine(versions, this.m.ram, addr);
  }

  /** Run untranslated code on the 6502 (native routines stand in for the ones it calls). */
  private fallback(addr: number) {
    const m = this.m, c = m.cpu;
    this.fallbacks.set(addr, (this.fallbacks.get(addr) ?? 0) + 1);
    c.a = cpu.a; c.x = cpu.x; c.y = cpu.y; c.sp = cpu.sp;
    c.p = (c.p & 0x3c) | (flags() & 0xc3) | 0x04;
    for (const [a, fn] of this.patched) m.patches.set(a, () => {
      cpu.a = c.a; cpu.x = c.x; cpu.y = c.y; cpu.sp = c.sp; setFlags(c.p);
      fn();
      c.a = cpu.a; c.x = cpu.x; c.y = cpu.y; c.sp = cpu.sp; c.p = (c.p & 0x3c) | (flags() & 0xc3);
    });
    try { m.call(addr); } finally { m.patches.clear(); }
    cpu.a = c.a; cpu.x = c.x; cpu.y = c.y; cpu.sp = c.sp; setFlags(c.p);
  }
}
