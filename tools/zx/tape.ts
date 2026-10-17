/**
 * ZX Spectrum tape images, as bytes: .tap (length-prefixed blocks) and .tzx (typed blocks). A file is data,
 * never code: this only reads lengths and copies bytes out, checking every length against the file.
 */

/** A block of the ROM's own format: a flag byte, the payload, a parity byte (what `LD-BYTES` loads). */
export interface DataBlock {
  readonly kind: 'standard';
  /** flag + payload + parity, as on tape */
  readonly bytes: Uint8Array;
}

/** A block with its own timings (a turbo or pure-data block): the ROM loader cannot load it; its bytes are kept. */
export interface TurboBlock {
  readonly kind: 'turbo';
  readonly bytes: Uint8Array;
  /** T-states per pulse of a zero bit and of a one bit */
  readonly zero: number;
  readonly one: number;
}

/** Any other block (tone, pauses, texts...): kept by its TZX id, since only the data matter for loading. */
export interface OtherBlock {
  readonly kind: 'other';
  readonly id: number;
}

export type TapeBlock = DataBlock | TurboBlock | OtherBlock;

/** The 17-byte header block's fields (flag 0, 19 bytes with flag and parity). */
export interface TapeHeader {
  /** 0 program, 1 number array, 2 character array, 3 code */
  readonly type: number;
  readonly name: string;
  readonly length: number;
  readonly param1: number;
  readonly param2: number;
}

/** Read a .tap file: blocks of a two-byte length (little endian) and that many bytes. */
export function parseTap(file: Uint8Array): DataBlock[] {
  const blocks: DataBlock[] = [];
  let at = 0;
  while (at < file.length) {
    if (at + 2 > file.length) throw new Error(`.tap: a block length is cut short at ${at}`);
    const n = file[at] | (file[at + 1] << 8);
    at += 2;
    if (at + n > file.length) throw new Error(`.tap: a block of ${n} bytes at ${at} runs past the end`);
    blocks.push({ kind: 'standard', bytes: file.slice(at, at + n) });
    at += n;
  }
  return blocks;
}

const TZX_MAGIC = 'ZXTape!';

/** Read a .tzx file's blocks (the ones that carry data are kept; control blocks are listed as `other`). */
export function parseTzx(file: Uint8Array): TapeBlock[] {
  const text = String.fromCharCode(...file.subarray(0, TZX_MAGIC.length));
  if (text !== TZX_MAGIC || file[7] !== 0x1a) throw new Error('.tzx: no ZXTape! signature');
  const blocks: TapeBlock[] = [];
  const u8 = (at: number) => { if (at >= file.length) throw new Error(`.tzx: read past the end at ${at}`); return file[at]; };
  const u16 = (at: number) => u8(at) | (u8(at + 1) << 8);
  const u24 = (at: number) => u16(at) | (u8(at + 2) << 16);
  const u32 = (at: number) => u24(at) + u8(at + 3) * 0x1000000;
  const take = (at: number, n: number) => {
    if (at + n > file.length) throw new Error(`.tzx: ${n} bytes at ${at} run past the end`);
    return file.slice(at, at + n);
  };
  let at = 10; // (magic 8, version 2)
  while (at < file.length) {
    const id = u8(at++);
    switch (id) {
      case 0x10: { const n = u16(at + 2); blocks.push({ kind: 'standard', bytes: take(at + 4, n) }); at += 4 + n; break; }
      case 0x11: {
        const n = u24(at + 15);
        blocks.push({ kind: 'turbo', bytes: take(at + 18, n), zero: u16(at + 6), one: u16(at + 8) });
        at += 18 + n; break;
      }
      case 0x12: blocks.push({ kind: 'other', id }); at += 4; break;
      case 0x13: blocks.push({ kind: 'other', id }); at += 1 + 2 * u8(at); break;
      case 0x14: {
        const n = u24(at + 7);
        blocks.push({ kind: 'turbo', bytes: take(at + 10, n), zero: u16(at), one: u16(at + 2) });
        at += 10 + n; break;
      }
      case 0x15: blocks.push({ kind: 'other', id }); at += 8 + u24(at + 5); break;
      case 0x18: case 0x19: blocks.push({ kind: 'other', id }); at += 4 + u32(at); break;
      case 0x20: case 0x23: case 0x24: blocks.push({ kind: 'other', id }); at += 2; break;
      case 0x21: blocks.push({ kind: 'other', id }); at += 1 + u8(at); break;
      case 0x22: case 0x25: case 0x27: blocks.push({ kind: 'other', id }); break;
      case 0x26: blocks.push({ kind: 'other', id }); at += 2 + 2 * u16(at); break;
      case 0x28: blocks.push({ kind: 'other', id }); at += 2 + u16(at); break;
      case 0x2a: blocks.push({ kind: 'other', id }); at += 4; break;
      case 0x2b: blocks.push({ kind: 'other', id }); at += 5; break;
      case 0x30: blocks.push({ kind: 'other', id }); at += 1 + u8(at); break;
      case 0x31: blocks.push({ kind: 'other', id }); at += 2 + u8(at + 1); break;
      case 0x32: blocks.push({ kind: 'other', id }); at += 2 + u16(at); break;
      case 0x33: blocks.push({ kind: 'other', id }); at += 1 + 3 * u8(at); break;
      case 0x35: blocks.push({ kind: 'other', id }); at += 20 + u32(at + 16); break;
      case 0x5a: blocks.push({ kind: 'other', id }); at += 9; break;
      default: throw new Error(`.tzx: unknown block 0x${id.toString(16)} at ${at - 1}`);
    }
  }
  return blocks;
}

/** A header block's fields, or null if `bytes` is not a 19-byte header. */
export function headerOf(bytes: Uint8Array): TapeHeader | null {
  if (bytes.length !== 19 || bytes[0] !== 0) return null;
  return {
    type: bytes[1],
    name: String.fromCharCode(...bytes.subarray(2, 12)),
    length: bytes[12] | (bytes[13] << 8),
    param1: bytes[14] | (bytes[15] << 8),
    param2: bytes[16] | (bytes[17] << 8),
  };
}

/** Whether the parity (XOR) byte of a block is right. */
export function parityOk(bytes: Uint8Array): boolean {
  let x = 0;
  for (const b of bytes) x ^= b;
  return x === 0;
}
