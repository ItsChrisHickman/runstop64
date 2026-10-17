/**
 * A headless ZX Spectrum 48K: the Z80 (z80.ts), 16K ROM and 48K RAM, the ULA (screen at $4000, border, keyboard,
 * beeper), the 50 Hz frame interrupt, a Kempston joystick, and a tape loaded by trapping the ROM's loader.
 *
 * An optional 128K mode (`ram128`) pages eight 16K banks in at $C000 through port $7FFD and logs writes to the AY chip
 * (ports $FFFD and $BFFD), enough to run a game's own 128K music player and keep what it writes; there is no 128K
 * ROM, and a 128K machine cannot be saved in a snapshot (tools/zx/snapshot.ts refuses).
 *
 * Not modelled, on purpose: memory and I/O contention (instructions take their uncontended T-states), the floating
 * bus (an unattached port reads $FF), a tape that is played as pulses. The screen is read from memory at the end
 * of each frame (see screen.ts), so a game that races the beam shows what it left, not what the beam saw.
 *
 * Tools only: nothing in the browser bundle imports tools/zx.
 */
import { Z80, type Bus } from './z80';
import { parityOk, type TapeBlock } from './tape';

/** T-states in a frame (the 48K ULA: 224 per line, 312 lines). */
export const FRAME_T = 69888;
/** How long the ULA holds the interrupt line low, in T-states from the start of the frame. */
export const INT_T = 32;
/** The ROM's LD-BYTES entry and the address it returns through (SA/LD-RET). */
const LD_BYTES = 0x0556, LD_RETURN = 0x053f;

/** One write to an AY register: when it happened and what. */
export interface AyWrite {
  readonly frame: number;
  readonly t: number;
  readonly reg: number;
  readonly value: number;
}

/** One write to the ULA port that changed the speaker (bit 4), when it happened. */
export interface BeeperWrite {
  /** frames run before this one (the machine's `frame` when the write happened) */
  readonly frame: number;
  /** T-states into that frame */
  readonly t: number;
  /** the speaker level (bit 4 of the byte written) */
  readonly level: 0 | 1;
}

/** The keyboard: eight half-rows of five keys, in the order of the address lines A8 to A15, key 0 first. */
export const KEY_ROWS: readonly (readonly string[])[] = [
  ['CAPS', 'Z', 'X', 'C', 'V'],
  ['A', 'S', 'D', 'F', 'G'],
  ['Q', 'W', 'E', 'R', 'T'],
  ['1', '2', '3', '4', '5'],
  ['0', '9', '8', '7', '6'],
  ['P', 'O', 'I', 'U', 'Y'],
  ['ENTER', 'L', 'K', 'J', 'H'],
  ['SPACE', 'SYMBOL', 'M', 'N', 'B'],
];

/** Kempston joystick bits (port $1F). */
export const KEMPSTON = { right: 1, left: 2, down: 4, up: 8, fire: 16 } as const;

/** The Kempston bit for a direction name (right, left, down, up, fire). */
export function joystickBit(name: string): number {
  switch (name) {
    case 'right': return KEMPSTON.right;
    case 'left': return KEMPSTON.left;
    case 'down': return KEMPSTON.down;
    case 'up': return KEMPSTON.up;
    case 'fire': return KEMPSTON.fire;
    default: throw new Error(`no joystick direction ${name}`);
  }
}

/** Press or release a key, or a joystick direction written KEMPSTON:left, on a machine. */
export function press(m: Spectrum, key: string, down: boolean) {
  if (key.startsWith('KEMPSTON:')) {
    m.kempstonPlugged = true;
    const bit = joystickBit(key.slice(9));
    if (down) m.kempston |= bit; else m.kempston &= ~bit;
  } else m.setKey(key, down);
}

/** Where a key is: its half-row and bit. */
export function keyPosition(name: string): { row: number; bit: number } | null {
  for (let row = 0; row < 8; row++) {
    const bit = KEY_ROWS[row].indexOf(name);
    if (bit >= 0) return { row, bit };
  }
  return null;
}

export class Spectrum implements Bus {
  readonly mem = new Uint8Array(65536);
  readonly cpu = new Z80(this);
  /** the border colour, 0 to 7 */
  border = 7;
  /** frames run so far */
  frame = 0;
  /** the speaker level now */
  speaker: 0 | 1 = 0;
  /** every change of the speaker since the log was last cleared (the caller clears it) */
  beeper: BeeperWrite[] = [];
  /** the keys: bits 0 to 4 of each half-row, 0 = pressed */
  readonly keys = new Uint8Array(8).fill(0x1f);
  /** the Kempston joystick, if one is plugged in (without one port $1F floats to $FF) */
  kempstonPlugged = false;
  kempston = 0;
  /** the tape in the player and the next block to load; the ROM loader is trapped and takes blocks from here */
  tape: readonly TapeBlock[] = [];
  tapeAt = 0;
  /** blocks the loader took, for the log (a header's name, a data block's length) */
  readonly loaded: string[] = [];
  /** called with the PC before each instruction, if set (a probe watching for an address) */
  onStep: ((pc: number) => void) | null = null;
  private interrupted = false;
  /** 128K mode: the eight 16K banks (the one paged in at $C000 lives in `mem`, its slot here is stale), which one, and the AY chip */
  readonly banks: Uint8Array[] | null;
  bank = 0;
  readonly ayRegs = new Uint8Array(16);
  ayReg = 0;
  /** every write to an AY register since the log was last cleared (the caller clears it) */
  ay: AyWrite[] = [];

  constructor(rom: Uint8Array, ram128 = false) {
    if (rom.length !== 0x4000) throw new Error(`the 48K ROM is 16384 bytes, not ${rom.length}`);
    this.mem.set(rom, 0);
    this.banks = ram128 ? Array.from({ length: 8 }, () => new Uint8Array(0x4000)) : null;
    this.cpu.reset();
  }

  /** Page a bank in at $C000 (128K mode). */
  private page(bank: number) {
    if (!this.banks || bank === this.bank) return;
    this.banks[this.bank].set(this.mem.subarray(0xc000));
    this.mem.set(this.banks[bank], 0xc000);
    this.bank = bank;
  }

  // ---- the bus -------------------------------------------------------------------------------------

  read(addr: number) { return this.mem[addr]; }

  write(addr: number, value: number) {
    if (addr >= 0x4000) this.mem[addr] = value;
  }

  in(port: number): number {
    let v = 0xff;
    if ((port & 1) === 0) { // the ULA: the keyboard half-rows whose address line is low
      let keys = 0x1f;
      for (let row = 0; row < 8; row++) if (!(port & (0x100 << row))) keys &= this.keys[row];
      v = 0xa0 | keys; // (bits 5 and 7 are 1; bit 6, the tape's EAR, reads 0: no tape signal)
    }
    if ((port & 0xe0) === 0 && this.kempstonPlugged) v &= this.kempston; // (the joystick answers where A5 is low)
    if (this.banks && (port & 0xc002) === 0xc000) v = this.ayRegs[this.ayReg]; // (reading the selected AY register)
    return v;
  }

  out(port: number, value: number, t: number) {
    if (this.banks) {
      if ((port & 0x8002) === 0) { this.page(value & 7); return; } // $7FFD: the bank at $C000 (ROM, shadow screen and lock ignored)
      if ((port & 0xc002) === 0xc000) { this.ayReg = value & 15; return; } // $FFFD: AY register select
      if ((port & 0xc002) === 0x8000) { // $BFFD: AY register write
        this.ayRegs[this.ayReg] = value;
        const late = t >= FRAME_T;
        this.ay.push({ frame: this.frame + (late ? 1 : 0), t: late ? t - FRAME_T : t, reg: this.ayReg, value });
        return;
      }
    }
    if ((port & 1) !== 0) return;
    this.border = value & 7;
    const level = (value >> 4) & 1 ? 1 : 0;
    if (level !== this.speaker) {
      this.speaker = level;
      // (a write in the last instruction of a frame belongs to the next one)
      const late = t >= FRAME_T;
      this.beeper.push({ frame: this.frame + (late ? 1 : 0), t: late ? t - FRAME_T : t, level });
    }
  }

  // ---- keys and joystick ---------------------------------------------------------------------------

  /** Press or release a key by its name in KEY_ROWS (a name that is not a key throws). */
  setKey(name: string, down: boolean) {
    const pos = keyPosition(name);
    if (!pos) throw new Error(`no such key: ${name}`);
    if (down) this.keys[pos.row] &= ~(1 << pos.bit); else this.keys[pos.row] |= 1 << pos.bit;
  }

  releaseAll() {
    this.keys.fill(0x1f);
    this.kempston = 0;
  }

  // ---- running -------------------------------------------------------------------------------------

  /** Run one frame: from the interrupt to the next. */
  runFrame() {
    const cpu = this.cpu;
    this.interrupted = false;
    while (cpu.t < FRAME_T) {
      if (cpu.t < INT_T && !this.interrupted && cpu.interrupt()) this.interrupted = true;
      if (cpu.pc === LD_BYTES && this.tape.length > 0) this.trapLoader();
      if (this.onStep) this.onStep(cpu.pc);
      cpu.step();
    }
    cpu.t -= FRAME_T;
    this.frame++;
  }

  /** Run `n` frames. */
  run(n: number) {
    for (let i = 0; i < n; i++) this.runFrame();
  }

  /** Whether the flash attribute shows inverted now (it toggles every 16 frames). */
  get flashPhase(): boolean { return (this.frame & 16) !== 0; }

  // ---- the tape ------------------------------------------------------------------------------------

  /**
   * The ROM's LD-BYTES (A = the flag byte wanted, carry = load or verify, DE = length, IX = where) done at once:
   * the next block of the tape whose flag matches is copied, and the routine's exit taken (its return address is
   * $053F, SA/LD-RET, which restores the border and enables interrupts) with the carry set for success.
   */
  private trapLoader() {
    const cpu = this.cpu, regs = cpu.regs;
    const flag = regs[7], load = (regs[6] & 1) !== 0;
    let ok = false;
    while (this.tapeAt < this.tape.length) {
      const block = this.tape[this.tapeAt++];
      if (block.kind !== 'standard') continue;
      if (block.bytes[0] !== flag) continue; // (the real loader hears the pilot of the next block)
      const len = cpu.de, payload = block.bytes.subarray(1, block.bytes.length - 1);
      const at = cpu.ix;
      if (load) for (let i = 0; i < Math.min(len, payload.length); i++) this.write((at + i) & 0xffff, payload[i]);
      ok = payload.length === len && parityOk(block.bytes);
      if (ok) { cpu.ix = (at + len) & 0xffff; cpu.de = 0; }
      this.loaded.push(block.bytes.length === 19 && flag === 0 ? `header ${String.fromCharCode(...block.bytes.subarray(2, 12))}` : `${len} bytes at ${at}`);
      break;
    }
    regs[6] = ok ? (regs[6] | 1) : (regs[6] & ~1);
    cpu.iff1 = cpu.iff2 = false;
    cpu.pc = LD_RETURN;
  }
}
