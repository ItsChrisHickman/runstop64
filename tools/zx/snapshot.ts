/**
 * Our own snapshot format for the headless Spectrum: the whole machine except the ROM (which is the 48K ROM the
 * machine was made with) and the tape, as bytes. The state files in games/moley/build/ are in this format.
 *
 *   "ZXS1", then 16-bit little-endian words for the CPU, the frame counter, the border/speaker/keys/tape position,
 *   then the 49152 bytes of RAM.
 */
import type { Spectrum } from './spectrum';
import type { Z80State } from './z80';

const MAGIC = 'ZXS1';
const RAM_START = 0x4000;

/** Pack the machine into bytes. */
export function packState(m: Spectrum): Uint8Array {
  if (m.banks) throw new Error('a 128K machine cannot be saved: the snapshot format is 48K');
  const s = m.cpu.state();
  const words: number[] = [
    ...s.regs, ...s.alt, s.ix, s.iy, s.sp, s.pc, s.i, s.r, s.wz, s.im, s.q,
    (s.iff1 ? 1 : 0) | (s.iff2 ? 2 : 0) | (s.halted ? 4 : 0) | (s.noInt ? 8 : 0),
    m.cpu.t & 0xffff, m.cpu.t >>> 16, m.frame & 0xffff, m.frame >>> 16, m.border, m.speaker, m.tapeAt, m.kempston, ...m.keys,
  ];
  const out = new Uint8Array(MAGIC.length + words.length * 2 + (65536 - RAM_START));
  for (let i = 0; i < MAGIC.length; i++) out[i] = MAGIC.charCodeAt(i);
  const view = new DataView(out.buffer);
  words.forEach((w, i) => view.setUint16(MAGIC.length + i * 2, w, true));
  out.set(m.mem.subarray(RAM_START), MAGIC.length + words.length * 2);
  return out;
}

/** Number of words packState writes before the RAM. */
const WORDS = 8 + 8 + 9 + 1 + 2 + 2 + 4 + 8;

/** Put a snapshot into a machine (which has the ROM already). */
export function unpackState(m: Spectrum, bytes: Uint8Array): void {
  const head = String.fromCharCode(...bytes.subarray(0, MAGIC.length));
  if (head !== MAGIC) throw new Error('not a ZXS1 snapshot');
  const expect = MAGIC.length + WORDS * 2 + (65536 - RAM_START);
  if (bytes.length !== expect) throw new Error(`a ZXS1 snapshot is ${expect} bytes, this is ${bytes.length}`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w: number[] = [];
  for (let i = 0; i < WORDS; i++) w.push(view.getUint16(MAGIC.length + i * 2, true));
  let k = 0;
  const take = (n: number) => { const part = w.slice(k, k + n); k += n; return part; };
  const regs = take(8), alt = take(8);
  const [ix, iy, sp, pc, i, r, wz, im, q] = take(9);
  const [flags] = take(1);
  const [tLo, tHi, fLo, fHi] = take(4);
  const [border, speaker, tapeAt, kempston] = take(4);
  const keys = take(8);
  const state: Z80State = {
    regs, alt, ix, iy, sp, pc, i, r, wz, im, q,
    iff1: (flags & 1) !== 0, iff2: (flags & 2) !== 0, halted: (flags & 4) !== 0, noInt: (flags & 8) !== 0,
  };
  m.cpu.setState(state);
  m.cpu.t = tLo | (tHi << 16);
  m.frame = fLo | (fHi << 16);
  m.border = border;
  m.speaker = speaker ? 1 : 0;
  m.tapeAt = tapeAt;
  m.kempston = kempston;
  m.keys.set(keys);
  m.mem.set(bytes.subarray(MAGIC.length + WORDS * 2), RAM_START);
}
