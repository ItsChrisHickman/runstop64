/**
 * A MOS 6581 SID approximation.
 *
 * Oscillators and envelopes are clocked every C64 cycle (like the real chip),
 * so pulse-width sweeps, hard sync, ring mod and ADSR timing behave correctly.
 * The output is box-filtered down to the audio sample rate and run through a
 * state-variable filter modelled loosely on the 6581's curve. It is not reSID,
 * but it's close enough that Hubbard sounds like Hubbard.
 */

export const PAL_CLOCK = 985_248;

// Cycles per envelope step for each 4-bit rate value (from the SID datasheet / reSID).
const RATE_PERIOD = [9, 32, 63, 95, 149, 220, 267, 313, 392, 977, 1954, 3126, 3907, 11720, 19532, 31251];

const enum Env { Attack, DecaySustain, Release }

class Voice {
  freq = 0;
  pw = 0;
  control = 0;
  attackDecay = 0;
  sustainRelease = 0;

  acc = 0; // 24-bit phase accumulator
  noise = 0x7ffff8; // 23-bit LFSR
  prevBit19 = 0;
  msbRising = false;

  env = 0; // 0..255
  envState = Env.Release;
  rateCounter = 0;
  expCounter = 0;
  expPeriod = 1;
  holdZero = true;

  sync: Voice | null = null; // the voice that syncs/ring-mods this one

  setControl(v: number) {
    const gateOn = (v & 1) && !(this.control & 1);
    const gateOff = !(v & 1) && (this.control & 1);
    if (gateOn) { this.envState = Env.Attack; this.holdZero = false; }
    else if (gateOff) this.envState = Env.Release;
    if (v & 0x08) { this.acc = 0; this.noise = 0x7ffff8; }
    this.control = v;
  }

  clockOsc() {
    if (this.control & 0x08) return; // test bit holds the oscillator
    const prev = this.acc;
    this.acc = (this.acc + this.freq) & 0xffffff;
    this.msbRising = !(prev & 0x800000) && !!(this.acc & 0x800000);
    const bit19 = (this.acc >> 19) & 1;
    if (bit19 && !this.prevBit19) {
      const bit = ((this.noise >> 22) ^ (this.noise >> 17)) & 1;
      this.noise = ((this.noise << 1) | bit) & 0x7fffff;
    }
    this.prevBit19 = bit19;
  }

  clockEnv() {
    const rate = this.envState === Env.Attack ? this.attackDecay >> 4
      : this.envState === Env.DecaySustain ? this.attackDecay & 0x0f
        : this.sustainRelease & 0x0f;
    if (++this.rateCounter < RATE_PERIOD[rate]) return;
    this.rateCounter = 0;

    if (this.envState === Env.Attack) {
      this.env = (this.env + 1) & 0xff;
      if (this.env === 0xff) { this.envState = Env.DecaySustain; this.expPeriod = 1; }
      this.expCounter = 0;
      return;
    }
    if (++this.expCounter < this.expPeriod) return;
    this.expCounter = 0;
    if (this.holdZero) return;

    if (this.envState === Env.DecaySustain) {
      if (this.env !== (this.sustainRelease >> 4) * 0x11) this.env = (this.env - 1) & 0xff;
    } else {
      this.env = (this.env - 1) & 0xff;
    }
    // Exponential decay approximation: step period grows as the level falls.
    switch (this.env) {
      case 0xff: this.expPeriod = 1; break;
      case 0x5d: this.expPeriod = 2; break;
      case 0x36: this.expPeriod = 4; break;
      case 0x1a: this.expPeriod = 8; break;
      case 0x0e: this.expPeriod = 16; break;
      case 0x06: this.expPeriod = 30; break;
      case 0x00: this.expPeriod = 1; this.holdZero = true; break;
    }
  }

  /** 12-bit waveform output (0..4095), or -1 if no waveform selected. */
  wave(): number {
    const wf = this.control >> 4;
    if (!wf) return -1;
    const acc = this.acc;
    let out = 0xfff;
    if (wf & 1) {
      // Triangle; ring mod XORs with the modulating voice's MSB.
      let msb = acc & 0x800000;
      if ((this.control & 0x04) && this.sync) msb ^= this.sync.acc & 0x800000;
      out &= ((msb ? ~acc : acc) >> 11) & 0xfff;
    }
    if (wf & 2) out &= acc >> 12;
    if (wf & 4) out &= (this.control & 0x08) || (acc >> 12) >= this.pw ? 0xfff : 0;
    if (wf & 8) {
      const n = this.noise;
      out &= ((n >> 9) & 0x800) | ((n >> 8) & 0x400) | ((n >> 5) & 0x200) | ((n >> 3) & 0x100) |
        ((n >> 2) & 0x080) | ((n << 1) & 0x040) | ((n << 3) & 0x020) | ((n << 4) & 0x010);
    }
    return out;
  }
}

export class Sid {
  readonly voices = [new Voice(), new Voice(), new Voice()];
  regs = new Uint8Array(32);

  private cutoff = 0;
  private resonance = 0;
  private filterRoute = 0;
  private modeVol = 0;

  private cyclesPerSample: number;
  private cycleFrac = 0;
  // State-variable filter memory
  private lp = 0;
  private bp = 0;
  // DC blocker
  private dcIn = 0;
  private dcOut = 0;

  constructor(private sampleRate: number, clock = PAL_CLOCK) {
    const [v1, v2, v3] = this.voices;
    v1.sync = v3; v2.sync = v1; v3.sync = v2;
    this.cyclesPerSample = clock / sampleRate;
  }

  write(reg: number, v: number) {
    reg &= 0x1f;
    this.regs[reg] = v;
    if (reg < 21) {
      const voice = this.voices[Math.floor(reg / 7)];
      switch (reg % 7) {
        case 0: voice.freq = (voice.freq & 0xff00) | v; break;
        case 1: voice.freq = (voice.freq & 0x00ff) | (v << 8); break;
        case 2: voice.pw = (voice.pw & 0xf00) | v; break;
        case 3: voice.pw = (voice.pw & 0x0ff) | ((v & 0x0f) << 8); break;
        case 4: voice.setControl(v); break;
        case 5: voice.attackDecay = v; break;
        case 6: voice.sustainRelease = v; break;
      }
      return;
    }
    switch (reg) {
      case 0x15: this.cutoff = (this.cutoff & 0x7f8) | (v & 7); break;
      case 0x16: this.cutoff = (this.cutoff & 7) | (v << 3); break;
      case 0x17: this.resonance = v >> 4; this.filterRoute = v & 0x0f; break;
      case 0x18: this.modeVol = v; break;
    }
  }

  read(reg: number): number {
    reg &= 0x1f;
    if (reg === 0x1b) return Math.max(0, this.voices[2].wave()) >> 4;
    if (reg === 0x1c) return this.voices[2].env;
    return 0;
  }

  /** Render `out.length` samples into `out` (float -1..1). */
  render(out: Float32Array, offset = 0, count = out.length - offset) {
    const voices = this.voices;
    const [v1, v2, v3] = voices;
    const acc = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      this.cycleFrac += this.cyclesPerSample;
      let n = Math.floor(this.cycleFrac);
      this.cycleFrac -= n;
      acc[0] = acc[1] = acc[2] = 0;
      const steps = n;
      while (n-- > 0) {
        v1.clockOsc(); v2.clockOsc(); v3.clockOsc();
        // Hard sync: reset when the sync source's MSB rises.
        if ((v1.control & 0x02) && v3.msbRising) v1.acc = 0;
        if ((v2.control & 0x02) && v1.msbRising) v2.acc = 0;
        if ((v3.control & 0x02) && v2.msbRising) v3.acc = 0;
        v1.clockEnv(); v2.clockEnv(); v3.clockEnv();
        for (let k = 0; k < 3; k++) {
          const v = voices[k];
          const w = v.wave();
          // Waveform 0..4095 centred, scaled by envelope; silent voices contribute DC 0.
          acc[k] += w < 0 ? 0 : (w - 2048) * v.env;
        }
      }
      const scale = steps ? 1 / (steps * 2048 * 255) : 0;
      const s1 = acc[0] * scale, s2 = acc[1] * scale, s3 = acc[2] * scale;

      let filtered = 0, direct = 0;
      if (this.filterRoute & 1) filtered += s1; else direct += s1;
      if (this.filterRoute & 2) filtered += s2; else direct += s2;
      if (this.filterRoute & 4) filtered += s3; else if (!(this.modeVol & 0x80)) direct += s3;

      // Chamberlin state-variable filter, cutoff curve roughly like a 6581.
      const x = this.cutoff / 2047;
      const fc = 220 + 11000 * x * x + 3000 * x;
      const f = Math.min(2 * Math.sin(Math.PI * Math.min(fc, this.sampleRate / 6) / this.sampleRate), 1.4);
      const q = 1.0 - this.resonance * 0.055;
      const hp = filtered - this.lp - q * this.bp;
      this.bp += f * hp;
      this.lp += f * this.bp;
      let fout = 0;
      if (this.modeVol & 0x10) fout += this.lp;
      if (this.modeVol & 0x20) fout += this.bp;
      if (this.modeVol & 0x40) fout += hp;

      const vol = (this.modeVol & 0x0f) / 15;
      let s = (direct + fout) * vol * 0.22;
      // Remove DC so volume-register writes don't thump.
      const y = s - this.dcIn + 0.995 * this.dcOut;
      this.dcIn = s; this.dcOut = y; s = y;
      out[offset + i] = s;
    }
  }
}
