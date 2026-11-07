/**
 * The original, running on the headless Spectrum, for the checks: its files (gitignored, build/README.md) and a way to
 * call one of its routines on a machine put into a saved state.
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';

export const BUILD = 'games/montymole/build';
export const ROM_FILE = `${BUILD}/48.rom`;
export const PLAY_STATE = `${BUILD}/play.state`;
export const CODE_IMAGE = `${BUILD}/code.ram`;

/** Where the original's room-table, picture buffer and attribute buffer are (re/README.md, "Memory map"). */
export const ADDR = {
  roomNumber: 0x9649,
  copyRoom: 0x94c3,
  drawRoom: 0xfdd5,
  /** the picture buffer: the screen as the game keeps it behind its sprites; the room is drawn here */
  picture: 0xd260,
  /** the attribute buffer, 768 bytes; the room starts at row 2 */
  attrs: 0xcf54,
  /** the original's own `HALT` in its main loop: a routine called with this return address stops there */
  haltAt: 0xff5b,
} as const;

/** A machine in the saved state `file`, with interrupts off (the original's own interrupt animates the picture). */
export function machineFrom(file: string = PLAY_STATE): Spectrum {
  const m = new Spectrum(readRom(ROM_FILE));
  unpackState(m, new Uint8Array(fs.readFileSync(file)));
  m.cpu.iff1 = false;
  m.cpu.iff2 = false;
  return m;
}

/**
 * Run the routine at `address` (with `a` in A) until it returns; the machine is left as the routine leaves it.
 * Throws if it has not returned within `frames` frames.
 */
export function call(m: Spectrum, address: number, a = 0, frames = 20): void {
  const cpu = m.cpu;
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = ADDR.haltAt & 255;
  m.mem[cpu.sp + 1] = ADDR.haltAt >> 8;
  cpu.regs[7] = a;
  cpu.pc = address;
  cpu.halted = false;
  let done = false;
  m.onStep = (pc) => { if (pc === ADDR.haltAt) done = true; };
  // (once it has returned the machine sits on the main loop's HALT with interrupts off until the frame ends)
  for (let f = 0; f < frames && !done; f++) m.runFrame();
  m.onStep = null;
  if (!done) throw new Error(`the routine at $${address.toString(16)} did not return in ${frames} frames`);
}
