/**
 * The Spectrum model (tools/zx/spectrum.ts) without the ROM file: a blank ROM and small programs poked into RAM
 * check the frame timing, the ports (keyboard half-rows, Kempston, border and beeper with their T-states), the tape
 * trap, the tape formats, the screen's layout and colours, and the snapshot.
 *
 *   nice -n 15 node tools/test.mjs tools/zx/test/machine.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { rowAddress, screenIndexes, SCREEN_H, withBorder } from '../screen';
import { packState, unpackState } from '../snapshot';
import { FRAME_T, INT_T, KEMPSTON, press, Spectrum } from '../spectrum';
import { headerOf, parseTap, parseTzx, type DataBlock, type TapeBlock } from '../tape';

/** A ROM of zeros except for `bytes` at `at` (a handler at $0038, a HALT at the loader's exit...). */
function romWith(at?: number, bytes: readonly number[] = []) {
  const rom = new Uint8Array(0x4000);
  if (at !== undefined) rom.set(bytes, at);
  return rom;
}
const blank = (rom: Uint8Array = romWith()) => new Spectrum(rom);

function poke(m: Spectrum, at: number, bytes: readonly number[]) {
  bytes.forEach((b, i) => { m.mem[at + i] = b; });
}

// ---- frames and the interrupt ----------------------------------------------------------------------------

{
  // IM 1 handler at $0038 counting frames at $9000; the main program HALTs
  const m = blank(romWith(0x38, [0x21, 0x00, 0x90, 0x34, 0xfb, 0xc9])); // LD HL,$9000 ; INC (HL) ; EI ; RET
  poke(m, 0x8000, [0xed, 0x56, 0xfb, 0x76, 0x18, 0xfd]); // IM 1 ; EI ; HALT ; JR $-1 (back to HALT)
  m.cpu.pc = 0x8000;
  m.run(10);
  check('10 frames take 10 interrupts (IM 1, HALT loop)', m.mem[0x9000] === 10);
  check('each frame is 69888 T-states: the counter stays within an instruction of the start', m.cpu.t >= 0 && m.cpu.t < 40);
  check('the interrupt is taken within its first 32 T-states', INT_T === 32 && FRAME_T === 69888);
}
{
  // DI: no interrupts; the handler would set $9001, the main loop counts at $9000
  const m = blank(romWith(0x38, [0x3e, 1, 0x32, 0x01, 0x90, 0xfb, 0xc9])); // LD A,1 ; LD ($9001),A ; EI ; RET
  poke(m, 0x8000, [0xed, 0x56, 0xf3, 0x21, 0x00, 0x90, 0x34, 0x18, 0xfd]); // IM 1 ; DI ; LD HL,$9000 ; INC (HL) ; JR $-1
  m.cpu.pc = 0x8000;
  m.run(2);
  check('with interrupts disabled the handler never runs, and the frames still come', m.mem[0x9001] === 0 && m.frame === 2 && m.mem[0x9000] !== 0);
}

// ---- ports -----------------------------------------------------------------------------------------------

{
  const m = blank();
  check('no key pressed: the keyboard reads $BF-ish with all five bits set', (m.in(0x00fe) & 0x1f) === 0x1f && (m.in(0xfefe) & 0x1f) === 0x1f);
  press(m, 'Z', true);
  check('Z pressed: half-row $FEFE bit 1 low, others high', (m.in(0xfefe) & 0x1f) === 0x1d && (m.in(0x7ffe) & 0x1f) === 0x1f);
  press(m, 'SPACE', true);
  check('SPACE: $7FFE bit 0 low', (m.in(0x7ffe) & 0x1f) === 0x1e);
  check('reading with two half-rows selected ANDs them (port $7EFE: rows 0 and 7)', (m.in(0x7efe) & 0x1f) === (0x1d & 0x1e));
  check('reading with no half-row selected ($FFFE) sees nothing', (m.in(0xfffe) & 0x1f) === 0x1f);
  press(m, 'Z', false);
  check('released again', (m.in(0xfefe) & 0x1f) === 0x1f);
  check('an unattached port floats high ($FF)', m.in(0x1f) === 0xff && m.in(0x7ffd) === 0xff);
  press(m, 'KEMPSTON:left', true);
  press(m, 'KEMPSTON:fire', true);
  check('Kempston joystick: left and fire read on port $1F', m.in(0x1f) === (KEMPSTON.left | KEMPSTON.fire));
  press(m, 'KEMPSTON:left', false);
  check('Kempston: left released', m.in(0x1f) === KEMPSTON.fire);
  check('(Kempston bits 5 to 7 read 0, which is how a game tells it is there)', (m.in(0x1f) & 0xe0) === 0);
}
{
  // border and speaker: toggle bit 4 with known loops and read the T-states of the two kinds of write
  const m = blank();
  poke(m, 0x8000, [
    0xf3, // DI
    0x3e, 0x12, 0xd3, 0xfe, // LD A,$12 ; OUT ($FE),A  (border 2, speaker 1)
    0x06, 0x0a, 0x10, 0xfe, // LD B,10 ; DJNZ $
    0xaf, 0xd3, 0xfe, // XOR A ; OUT ($FE),A
    0x06, 0x0a, 0x10, 0xfe, // LD B,10 ; DJNZ $
    0x18, 0xef, // JR back to LD A,$12
  ]);
  m.cpu.pc = 0x8000;
  m.run(1);
  check('OUT to the ULA sets the border', m.border === 2 || m.border === 0);
  const log = m.beeper.slice(0, 7);
  check('the beeper log has one entry per speaker change, alternating 1 0 1 0', log.length === 7 && log.every((b, i) => b.level === (i % 2 === 0 ? 1 : 0)));
  const gaps = log.slice(1).map((b, i) => b.t - log[i].t);
  // LD A,n (7) + the rest of OUT after its write (4) ... measured by hand from the program: 147 (1 to 0), 162 (0 to 1)
  check('the T-states between writes match the instruction timings (147 and 162)', gaps[0] === 147 && gaps[1] === 162 && gaps[2] === 147);
  check('border colour follows the last write (bits 0-2)', (() => { m.out(0x00fe, 5, 0); return m.border === 5; })());
  check('a port with bit 0 set is not the ULA', (() => { m.out(0x00ff, 3, 0); return m.border === 5; })());
}

// ---- 128K mode: paging at $C000 and the AY chip -------------------------------------------------------

{
  const m = new Spectrum(romWith(), true);
  m.mem[0xc000] = 11; // bank 0 (the power-on bank)
  m.out(0x7ffd, 1, 0);
  const fresh = m.mem[0xc000];
  m.mem[0xc000] = 22;
  m.out(0x7ffd, 0, 0);
  const back = m.mem[0xc000];
  m.out(0x7ffd, 1, 0);
  check('128K: $7FFD pages a bank in at $C000, each bank keeps its own bytes', fresh === 0 && back === 11 && m.mem[0xc000] === 22);
  m.mem[0x8000] = 5;
  m.out(0x7ffd, 6, 0);
  check('128K: the memory below $C000 is not paged', m.mem[0x8000] === 5);
  m.out(0xfffd, 7, 0);
  m.out(0xbffd, 0x38, 100);
  m.out(0xfffd, 9, 0);
  m.out(0xbffd, 0x0f, FRAME_T + 4);
  check('128K: AY writes are logged with the register, the value, and the frame and T-state (a late write counts for the next frame)',
    m.ay.length === 2 && m.ay[0].reg === 7 && m.ay[0].value === 0x38 && m.ay[0].t === 100 && m.ay[1].reg === 9 && m.ay[1].frame === 1 && m.ay[1].t === 4);
  m.out(0xfffd, 7, 0);
  check('128K: the selected AY register reads back on $FFFD', m.in(0xfffd) === 0x38);
  const m48 = blank();
  m48.out(0x7ffd, 1, 0);
  m48.out(0xfffd, 7, 0);
  m48.out(0xbffd, 1, 0);
  check('48K: $7FFD and the AY ports do nothing', m48.banks === null && m48.ay.length === 0 && m48.border === 7);
}

// ---- tape: formats and the loader trap ------------------------------------------------------------------

function block(flag: number, payload: readonly number[]): number[] {
  const bytes = [flag, ...payload];
  let x = 0;
  for (const b of bytes) x ^= b;
  return [...bytes, x];
}
function tap(...blocks: number[][]): Uint8Array {
  return Uint8Array.from(blocks.flatMap((b) => [b.length & 255, b.length >> 8, ...b]));
}
const header = block(0, [3, ...[...'abcdefghij'].map((c) => c.charCodeAt(0)), 4, 0, 0x00, 0x90, 0, 0]); // CODE "abcdefghij" 4 bytes at $9000
const data = block(0xff, [1, 2, 3, 4]);
{
  const blocks = parseTap(tap(header, data));
  check('.tap: two blocks', blocks.length === 2 && blocks[0].bytes.length === 19 && blocks[1].bytes.length === 6);
  const h = headerOf(blocks[0].bytes);
  check('.tap: the header block reads back (type, name, length, address)', h !== null && h.type === 3 && h.name === 'abcdefghij' && h.length === 4 && h.param1 === 0x9000);
  check('.tap: a cut-short file is refused', (() => { try { parseTap(Uint8Array.from([5, 0, 1, 2])); return false; } catch { return true; } })());
}
{
  // a .tzx with a standard block (0x10), a text (0x30), a turbo block (0x11), a pause (0x20)
  const std = [0x10, 0xe8, 0x03, data.length & 255, 0, ...data];
  const turbo = [0x11, 0x78, 0x08, 0x9b, 0x08, 0xb0, 0x08, 0x5a, 0x08, 0xdf, 0x08, 0x10, 0x00, 8, 0x00, 0x00, 0x04, 0x00, 0x00, 1, 2, 3, 4];
  const bytes = Uint8Array.from([...[...'ZXTape!'].map((c) => c.charCodeAt(0)), 0x1a, 1, 20, ...std, 0x30, 2, 0x68, 0x69, ...turbo, 0x20, 0x10, 0x00]);
  const blocks: TapeBlock[] = parseTzx(bytes);
  check('.tzx: a standard block, a text, a turbo block and a pause', blocks.length === 4 && blocks[0].kind === 'standard' && blocks[1].kind === 'other' && blocks[2].kind === 'turbo' && blocks[3].kind === 'other');
  const std0: DataBlock | undefined = blocks[0].kind === 'standard' ? blocks[0] : undefined;
  check('.tzx: the standard block carries the same bytes as the .tap', std0 !== undefined && std0.bytes.length === data.length && std0.bytes[1] === 1);
  const turbo2 = blocks[2];
  check('.tzx: the turbo block keeps its bytes and bit timings', turbo2.kind === 'turbo' && turbo2.bytes.length === 4 && turbo2.zero === 0x85a && turbo2.one === 0x8df);
  check('.tzx: a file without the signature is refused', (() => { try { parseTzx(Uint8Array.from([1, 2, 3])); return false; } catch { return true; } })());
}
{
  // LD-BYTES at $0556 trapped: A = flag (FF), carry = load, DE = 4, IX = $9000; the header block (flag 0) is passed over
  const m = blank(romWith(0x053f, [0x76])); // (the loader's exit: a HALT to stop at)
  m.tape = parseTap(tap(header, data));
  const regs = m.cpu.regs;
  regs[7] = 0xff; regs[6] = 1; m.cpu.de = 4; m.cpu.ix = 0x9000;
  m.cpu.pc = 0x0556; m.cpu.sp = 0xf000;
  m.runFrame();
  check('loader trap: the block lands at IX', m.mem[0x9000] === 1 && m.mem[0x9003] === 4);
  check('loader trap: carry set, DE = 0, IX moved on, returned through $053F with interrupts off', (regs[6] & 1) === 1 && m.cpu.de === 0 && m.cpu.ix === 0x9004);
  check('loader trap: the tape is used up and the loaded list says what came', m.tapeAt === 2 && m.loaded.length === 1 && m.loaded[0] === '4 bytes at 36864');
  // a block of the wrong length is a tape error (carry clear)
  const bad = blank();
  bad.tape = parseTap(tap(data));
  bad.cpu.regs[7] = 0xff; bad.cpu.regs[6] = 1; bad.cpu.de = 5; bad.cpu.ix = 0x9000; bad.cpu.pc = 0x0556; bad.cpu.sp = 0xf000;
  bad.runFrame();
  check('loader trap: a length that does not match fails with carry clear', (bad.cpu.regs[6] & 1) === 0);
}

// ---- the screen ---------------------------------------------------------------------------------------

{
  const seen = new Set<number>();
  let ok = true;
  for (let y = 0; y < SCREEN_H; y++) for (let x = 0; x < 32; x++) {
    const a = rowAddress(y) + x;
    if (a < 0x4000 || a >= 0x5800 || seen.has(a)) ok = false;
    seen.add(a);
  }
  check('the 192 rows map to the 6144 bitmap bytes, each once', ok && seen.size === 6144);
  check('row addresses: 0 -> $4000, 1 -> $4100, 8 -> $4020, 64 -> $4800, 191 -> $57E0', rowAddress(0) === 0x4000 && rowAddress(1) === 0x4100 && rowAddress(8) === 0x4020 && rowAddress(64) === 0x4800 && rowAddress(191) === 0x57e0);
  const mem = new Uint8Array(65536);
  mem[0x4000] = 0x80; // top-left pixel set
  mem[0x5800] = 0x00 | (2 << 0) | (5 << 3); // ink red, paper cyan
  mem[0x5801] = 0x40 | 7; // bright white ink on black
  mem[0x4001] = 0xff;
  mem[0x5802] = 0x80 | (1 << 0) | (6 << 3); // flash: ink blue, paper yellow
  mem[0x4002] = 0xff;
  const px = screenIndexes(mem, false), flashed = screenIndexes(mem, true);
  check('colours: ink red on paper cyan, bright white, flash swaps ink and paper', px[0] === 2 && px[1] === 5 && px[8] === 15 && px[16] === 1 && flashed[16] === 6);
  const framed = withBorder(px, 3, 32, 24);
  check('the border surrounds the picture in its colour', framed.w === 320 && framed.h === 240 && framed.px[0] === 3 && framed.px[24 * 320 + 32] === px[0]);
}

// ---- the snapshot ---------------------------------------------------------------------------------------

{
  const handler = romWith(0x38, [0x21, 0x00, 0x90, 0x34, 0xfb, 0xc9]);
  const a = blank(handler);
  poke(a, 0x8000, [0xed, 0x56, 0xfb, 0x76, 0x3e, 0x10, 0xd3, 0xfe, 0xaf, 0xd3, 0xfe, 0x18, 0xf6]);
  a.cpu.pc = 0x8000;
  a.run(7);
  press(a, 'Q', true);
  const bytes = packState(a);
  const b = blank(handler);
  unpackState(b, bytes);
  check('snapshot: unpacked bytes pack to the same bytes', packState(b).every((v, i) => v === bytes[i]) && packState(b).length === bytes.length);
  a.run(20); b.run(20);
  const x = packState(a), y = packState(b);
  check('snapshot: both machines run on identically for 20 frames', x.length === y.length && x.every((v, i) => v === y[i]));
  check('snapshot: refuses what is not one', (() => { try { unpackState(blank(), Uint8Array.from([1, 2, 3])); return false; } catch { return true; } })());
}

finish();
