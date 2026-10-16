import { Cpu6502 } from './cpu6502';
import { Sid, PAL_CLOCK } from './sid';

/** Parsed PSID/RSID header plus the C64 program it carries. */
export interface PsidFile {
  name: string;
  author: string;
  released: string;
  songs: number;
  startSong: number;
  loadAddress: number;
  initAddress: number;
  playAddress: number;
  /** Bit per song (0 = vertical blank 50Hz, 1 = CIA timer). */
  speed: number;
  pal: boolean;
  data: Uint8Array;
}

export function parsePsid(buf: ArrayBuffer): PsidFile {
  const b = new Uint8Array(buf);
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== 'PSID' && magic !== 'RSID') throw new Error('not a SID file');
  const w = (o: number) => (b[o] << 8) | b[o + 1];
  const str = (o: number) => {
    let s = '';
    for (let i = o; i < o + 32 && b[i]; i++) s += String.fromCharCode(b[i]);
    return s;
  };
  const version = w(4);
  const dataOffset = w(6);
  let load = w(8);
  let data = b.subarray(dataOffset);
  if (load === 0) {
    load = data[0] | (data[1] << 8);
    data = data.subarray(2);
  }
  const flags = version >= 2 ? w(0x76) : 0;
  return {
    name: str(0x16),
    author: str(0x36),
    released: str(0x56),
    songs: w(0x0e),
    startSong: w(0x10),
    loadAddress: load,
    initAddress: w(0x0a) || load,
    playAddress: w(0x0c),
    speed: (b[0x12] << 24) | (b[0x13] << 16) | (b[0x14] << 8) | b[0x15],
    // Video standard bits 2-3: 01 = PAL, 10 = NTSC; default PAL.
    pal: ((flags >> 2) & 3) !== 2,
    data: new Uint8Array(data),
  };
}

const PAL_FRAME_CYCLES = 19656; // 312 lines × 63 cycles
const NTSC_FRAME_CYCLES = 17095; // 263 × 65

/**
 * Runs a PSID tune: a 6502 executing the tune's own player code, with SID
 * register writes routed to the SID emulation. Lives in the audio thread.
 */
export class SidTune {
  readonly cpu = new Cpu6502();
  readonly sid: Sid;
  private samplesPerCall: number;
  private untilCall = 0;
  private playAddr = 0;

  constructor(readonly file: PsidFile, readonly sampleRate: number) {
    this.sid = new Sid(sampleRate, PAL_CLOCK);
    this.cpu.onWrite = (addr, v) => {
      if (addr >= 0xd400 && addr <= 0xd7ff) this.sid.write(addr & 0x1f, v);
    };
    this.cpu.onRead = (addr) => (addr >= 0xd41b && addr <= 0xd41c ? this.sid.read(addr & 0x1f) : undefined);
    this.samplesPerCall = 0;
  }

  /** Initialise a song (1-based). */
  start(song = this.file.startSong) {
    const f = this.file;
    const cpu = this.cpu;
    cpu.mem.fill(0);
    cpu.mem.set(f.data, f.loadAddress);
    cpu.sp = 0xff;
    // A minimal "VIC/CIA present" setup: no KERNAL, I/O visible.
    cpu.mem[0x01] = 0x37;
    for (let r = 0; r < 0x19; r++) this.sid.write(r, 0);
    cpu.call(f.initAddress, (song - 1) & 0xff);

    const useCia = (f.speed >>> Math.min(song - 1, 31)) & 1;
    let cyclesPerCall = f.pal ? PAL_FRAME_CYCLES : NTSC_FRAME_CYCLES;
    if (useCia) {
      // Tunes using CIA timing set the timer in init; read it back.
      const timer = cpu.mem[0xdc04] | (cpu.mem[0xdc05] << 8);
      if (timer) cyclesPerCall = timer;
    }
    this.samplesPerCall = (cyclesPerCall / PAL_CLOCK) * this.sampleRate;
    this.untilCall = 0;
    // play=0 means the tune installed its own IRQ handler; use the vector it set.
    this.playAddr = f.playAddress || (cpu.mem[0x0314] | (cpu.mem[0x0315] << 8));
  }

  render(out: Float32Array) {
    let i = 0;
    while (i < out.length) {
      if (this.untilCall <= 0) {
        if (this.playAddr) this.cpu.call(this.playAddr);
        this.untilCall += this.samplesPerCall;
      }
      const n = Math.min(out.length - i, Math.ceil(this.untilCall));
      this.sid.render(out, i, n);
      i += n;
      this.untilCall -= n;
    }
  }
}
