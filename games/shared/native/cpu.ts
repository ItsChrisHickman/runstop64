/**
 * The state the translated Entombed code runs on: 6502 registers and flags, and
 * the C64's memory. Translated routines (src/gen) read and write these exactly
 * as the original instructions did.
 *
 * `bind` connects it to a memory bus: either c64kit's C64 machine (while
 * routines are patched into the running original, to check them against it),
 * or the native runtime.
 */
export interface Bus {
  ram: Uint8Array;
  /** Read with the C64's memory map (I/O, ROM banking). */
  read(addr: number): number;
  write(addr: number, value: number): void;
  /** Run a routine that hasn't been translated (as JSR would). */
  call(addr: number): void;
  /** Run a routine that may wait for frames (in swapped-in code): its translation's frames, if it's a version that waits. */
  callGen?(addr: number): Gen | void;
  /** The translation of the routine at this address, if there is one (for JMP through a vector). */
  routine?(addr: number): (() => void | Gen) | undefined;
  /** Hooks (instructions the translation config lists under "hooks") report reaching them here. */
  hook?(pc: number): void;
  /** Skips (routine entries the config lists under "skips") ask here whether to return at once. */
  skip?(pc: number): boolean;
}

/**
 * A routine that waits for frames: it yields the address of each wait (for a
 * polling loop, with the cycles one pass of it takes in the high 16 bits).
 */
export type Gen = Generator<number, void, void>;

/**
 * Registers. `nz` holds the last result that set Z and N (Z: its low byte is 0, N: bit 7);
 * BIT and PLP can set both N and Z at once, which is 0x100. `c` and `v` are 0 or 1.
 */
// (i: interrupts disabled, set by SEI, CLI and PLP only; unwind: calls still to return through, after a
// routine discarded its return address: see tools/re)
export interface Registers {
  a: number; x: number; y: number; sp: number; nz: number; c: number; v: number; d: number; i: number; cy: number; unwind: number;
  tr?: (pc: number) => void;
  hk?: (pc: number) => void;
  sk?: (pc: number) => boolean;
}
export const cpu: Registers = { a: 0, x: 0, y: 0, sp: 0xff, nz: 1, c: 0, v: 0, d: 0, i: 0, cy: 0, unwind: 0 };
// For tests: code translated with TRACE=1 reports each instruction here (kept out of register saves).
Object.defineProperty(cpu, 'tr', { value: undefined, writable: true, enumerable: false });
// Hooks ("hooks" in a translation's config): the bus's, reporting moments the front end reacts to (kept out of register saves too).
Object.defineProperty(cpu, 'hk', { value: undefined, writable: true, enumerable: false });
Object.defineProperty(cpu, 'sk', { value: undefined, writable: true, enumerable: false });

export let ram = new Uint8Array(0x10000);
let bus: Bus;

export function bind(b: Bus) {
  bus = b;
  ram = b.ram;
  cpu.hk = b.hook;
  cpu.sk = b.skip;
}

export const rd = (addr: number) => bus.read(addr);
export const wr = (addr: number, value: number) => bus.write(addr, value & 0xff);
/** A 16-bit pointer in zero page. */
export const ptr = (zp: number) => ram[zp] | (ram[(zp + 1) & 0xff] << 8);

export function push(v: number) {
  ram[0x100 | cpu.sp] = v & 0xff;
  cpu.sp = (cpu.sp - 1) & 0xff;
}
export function pop() {
  cpu.sp = (cpu.sp + 1) & 0xff;
  return ram[0x100 | cpu.sp];
}

/** The status register as PHP pushes it. */
export function flags() {
  return (cpu.nz & 0x180 ? 0x80 : 0) | ((cpu.nz & 0xff) === 0 ? 0x02 : 0) | cpu.c | (cpu.v << 6) | (cpu.d << 3) | (cpu.i << 2) | 0x30;
}
export function setFlags(p: number) {
  cpu.nz = p & 0x02 ? (p & 0x80) << 1 : (p & 0x80) | 1;
  cpu.c = p & 1;
  cpu.v = (p >> 6) & 1;
  cpu.d = (p >> 3) & 1;
}

/** ADC in decimal mode (as c64kit's 6502 does it, NMOS flags included). */
export function adcD(v: number) {
  const a = cpu.a, c = cpu.c;
  let lo = (a & 0x0f) + (v & 0x0f) + c;
  let hi = (a & 0xf0) + (v & 0xf0);
  if (lo > 9) { lo += 6; hi += 0x10; }
  const bin = (a + v + c) & 0xff;
  cpu.nz = bin === 0 ? (hi & 0x80 ? 0x100 : 0) : (hi & 0x80) | 1;
  cpu.v = ~(a ^ v) & (a ^ hi) & 0x80 ? 1 : 0;
  if (hi > 0x90) hi += 0x60;
  cpu.c = hi > 0xff ? 1 : 0;
  cpu.a = (hi & 0xf0) | (lo & 0x0f);
}

/** SBC in decimal mode. */
export function sbcD(v: number) {
  const a = cpu.a, c = cpu.c ? 0 : 1;
  const bin = a - v - c;
  let lo = (a & 0x0f) - (v & 0x0f) - c;
  let hi = (a & 0xf0) - (v & 0xf0);
  if (lo & 0x10) { lo -= 6; hi -= 0x10; }
  if (hi & 0x100) hi -= 0x60;
  cpu.c = bin >= 0 ? 1 : 0;
  cpu.v = (a ^ v) & (a ^ bin) & 0x80 ? 1 : 0;
  cpu.nz = bin & 0xff;
  cpu.a = (hi & 0xf0) | (lo & 0x0f);
}

export function call(addr: number) {
  bus.call(addr);
}

/** JSR to code outside the translation that may wait for frames (`callsMayWait`): the version loaded waits, or is called. */
export function* callGen(addr: number): Gen {
  const r = bus.callGen ? bus.callGen(addr) : bus.call(addr);
  if (r) yield* r;
}

/** JMP (vector), from a routine that doesn't wait: the translation if there is one (and it doesn't wait either), else the 6502. */
export function jump(addr: number) {
  const fn = bus.routine?.(addr);
  if (fn && fn.constructor.name !== 'GeneratorFunction') fn();
  else bus.call(addr);
}

/** JMP (vector), from a routine that may wait. */
export function* jumpGen(addr: number): Gen {
  const fn = bus.routine?.(addr);
  if (!fn) { bus.call(addr); return; }
  const r = fn();
  if (r) yield* r;
}
