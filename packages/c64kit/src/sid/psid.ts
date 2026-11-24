import { Cpu6502 } from './cpu6502';
import { Sid, PAL_CLOCK } from './sid';
import { CATCH_UP_RATE, moveGain, pickBoundary, type CrossingPlan } from './crossing';

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

/** A crossing waiting for its boundary: the new version, its player running toward the boundary, and the registers it has set. */
interface Crossing {
  readonly file: PsidFile;
  readonly plan: CrossingPlan;
  /** The frame (from the song's start) of the boundary, and the new version's frame (within its loop) that is. */
  readonly target: number;
  readonly into: number;
  readonly cpu: Cpu6502;
  /** The calls of the new player so far. */
  frames: number;
  readonly regs: Uint8Array;
}

/** Whether two files are the same tune, byte for byte. */
function sameTune(a: PsidFile, b: PsidFile): boolean {
  return a.loadAddress === b.loadAddress && a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);
}

/**
 * Runs a PSID tune: a 6502 executing the tune's own player code, with SID
 * register writes routed to the SID emulation. Lives in the audio thread.
 */
export class SidTune {
  /** The 6502 playing the tune: replaced by the new version's when a crossing takes place. */
  cpu = new Cpu6502();
  readonly sid: Sid;
  private samplesPerCall: number;
  private untilCall = 0;
  private playAddr = 0;
  private song = 1;
  /** Calls of the player so far (frames at 50 Hz), from the song's start. */
  frames = 0;
  /** Every register write the player makes (before a crossing's volume), with the frame it was made in: for tests. */
  onWrite: ((frame: number, reg: number, value: number) => void) | null = null;
  /** The volume the player last set ($D418), and the share of it that sounds (a crossing's dip). */
  private volume = 0x0f;
  private gain = 1;
  private crossing: Crossing | null = null;

  constructor(public file: PsidFile, readonly sampleRate: number) {
    this.sid = new Sid(sampleRate, PAL_CLOCK);
    this.wire(this.cpu);
    this.samplesPerCall = 0;
  }

  private wire(cpu: Cpu6502) {
    cpu.onWrite = (addr, v) => {
      if (addr < 0xd400 || addr > 0xd7ff) return;
      const reg = addr & 0x1f;
      this.onWrite?.(this.frames, reg, v);
      if (reg === 0x18) { this.volume = v; this.writeVolume(); } else this.sid.write(reg, v);
    };
    cpu.onRead = (addr) => (addr >= 0xd41b && addr <= 0xd41c ? this.sid.read(addr & 0x1f) : undefined);
  }

  /** The master volume as the player set it, with a crossing's dip on it. */
  private writeVolume() {
    this.sid.write(0x18, (this.volume & 0xf0) | Math.round((this.volume & 0x0f) * this.gain));
  }

  /** Load a version of the tune into a machine and run its init for a song (1-based). */
  private boot(cpu: Cpu6502, file: PsidFile, song: number) {
    cpu.mem.fill(0);
    cpu.mem.set(file.data, file.loadAddress);
    cpu.sp = 0xff;
    // A minimal "VIC/CIA present" setup: no KERNAL, I/O visible.
    cpu.mem[0x01] = 0x37;
    cpu.call(file.initAddress, (song - 1) & 0xff);
  }

  /** Initialise a song (1-based). */
  start(song = this.file.startSong) {
    const f = this.file;
    const cpu = this.cpu;
    this.crossing = null;
    this.gain = 1;
    this.frames = 0;
    this.song = song;
    for (let r = 0; r < 0x19; r++) this.sid.write(r, 0);
    this.boot(cpu, f, song);

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

  /**
   * Go over to another version of the tune (the same song with other data) in step: the song carries on from its place and the
   * version changes at the next boundary of `plan`, with the volume dipping over the fade before it and swelling over the one
   * after. The new version's player runs silently on a machine of its own, ahead of the playing one, to the boundary's place in
   * the loop, then takes over. Asked again before the boundary it chooses again; asked for the version already playing it cancels.
   */
  crossTo(file: PsidFile, plan: CrossingPlan) {
    if (sameTune(file, this.file)) { this.crossing = null; return; }
    if (this.crossing && sameTune(file, this.crossing.file)) return;
    const target = pickBoundary(plan, this.frames);
    const cpu = new Cpu6502();
    const crossing: Crossing = { file, plan, target, into: target % plan.loopFrames, cpu, frames: 0, regs: new Uint8Array(0x19) };
    cpu.onWrite = (addr, v) => { if (addr >= 0xd400 && addr <= 0xd418) crossing.regs[addr & 0x1f] = v; };
    this.boot(cpu, file, this.song);
    this.crossing = crossing;
  }

  /** The crossing's work for one frame, before the player is called: the new version catching up, the dip, the swap. */
  private crossStep() {
    const c = this.crossing;
    if (!c) {
      if (this.gain < 1) { this.gain = 1; this.writeVolume(); }
      return;
    }
    // (the new player runs a slice of its way each frame, so no frame is long)
    const run = Math.min(c.into - c.frames, CATCH_UP_RATE);
    for (let i = 0; i < run; i++) { c.cpu.call(this.playAddr); c.frames++; }
    let want: 0 | 1 = 1;
    if (this.frames >= c.target) {
      if (c.frames !== c.into) throw new Error('the new version is not at the boundary in time');
      for (let r = 0; r < 0x18; r++) this.sid.write(r, c.regs[r] ?? 0);
      this.cpu = c.cpu;
      this.wire(this.cpu);
      this.file = c.file;
      this.crossing = null;
    } else if (this.frames >= c.target - c.plan.fadeOutFrames) {
      want = 0;
    }
    this.gain = moveGain(c.plan, this.gain, want);
    this.writeVolume();
  }

  render(out: Float32Array) {
    let i = 0;
    while (i < out.length) {
      if (this.untilCall <= 0) {
        this.crossStep();
        if (this.playAddr) this.cpu.call(this.playAddr);
        this.frames++;
        this.untilCall += this.samplesPerCall;
      }
      const n = Math.min(out.length - i, Math.ceil(this.untilCall));
      this.sid.render(out, i, n);
      i += n;
      this.untilCall -= n;
    }
  }
}
