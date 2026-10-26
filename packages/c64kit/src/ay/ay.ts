/**
 * The General Instrument AY-3-8912 (the 128K Spectrum's sound chip; the 8910 and the 8913 are the same without pins): three square
 * tone channels, one noise generator, one envelope, a mixer and a logarithmic 4-bit volume per channel. Chip emulation only: a
 * tune (tune.ts) or a game drives it with `write(register, value)` and takes samples with `render`.
 *
 * What it does, from the data sheet and measurements on the real chip:
 * - The chip's clock is divided by 8 (a "tick", `AY_TICK_HZ` = 221.7 kHz at the 128K's clock). A tone channel flips its output
 *   every `period` ticks (12 bits, registers 0/1, 2/3, 4/5; 0 counts as 1), so the note is `clock / (16 * period)` Hz.
 * - Noise is a 17-bit shift register with feedback `bit0 XOR bit3` into bit 16 (period 131071, started at 1), shifted every
 *   `2 * period` ticks (5 bits, register 6; 0 counts as 1): `clock / (16 * period)` shifts a second.
 * - The mixer (register 7, a set bit turns a source OFF: bits 0-2 tone A-C, bits 3-5 noise A-C): a channel is high when
 *   (tone high or tone off) and (noise high or noise off), so both off holds the channel high at its volume.
 * - The volume (registers 8-10): bits 0-3 the level, bit 4 takes the envelope's level instead. `AY_LEVELS` are the chip's measured
 *   (not linear) output voltages, 15 = 1.
 * - The envelope (registers 11/12 the period, 13 the shape): 16 steps, one every `2 * period` ticks (a ramp is `256 * period`
 *   clocks); writing register 13 starts it again. Shape bits: 3 continue, 2 attack (start low and rise), 1 alternate, 0 hold. With
 *   continue off the level is 0 after the first ramp.
 *
 * `render` integrates the output over each sample (a box filter over the 221.7 kHz ticks, the partial ticks at the edges weighted)
 * and then AC-couples it like the real output (a one-pole high pass at 20 Hz: a held level does not sit on the speaker). The three
 * channels are mixed equally, scaled so that all three at full volume are 1.
 */
export const AY_CLOCK_128K = 1_773_400;

/** The output level of each volume 0-15 (relative to 15 = 1). */
export const AY_LEVELS: readonly number[] = [
  0, 0.0099, 0.0144, 0.0211, 0.0307, 0.0455, 0.0645, 0.1074, 0.1266, 0.205, 0.2922, 0.3728, 0.4986, 0.6353, 0.8056, 1,
];

/** The register numbers by name. */
const AyReg = { mixer: 7, noise: 6, envelopeLow: 11, envelopeHigh: 12, shape: 13 } as const;
export const AY_REGISTERS = 14;
/** The bits each register keeps (the high byte of a period is 4 bits, the noise period 5, a volume 5). */
const KEEP: readonly number[] = [255, 15, 255, 15, 255, 15, 31, 255, 31, 31, 31, 255, 255, 15];

export class Ay {
  private readonly regs = new Uint8Array(AY_REGISTERS);
  private readonly toneCount = [0, 0, 0];
  private readonly toneHigh = [false, false, false];
  private noiseCount = 0;
  private lfsr = 1;
  private envCount = 0;
  private envStep = 15;
  private envAttack = 0;
  private envHolding = false;
  /** the envelope's level 0-15 now */
  envLevel = 15;

  private readonly ticksPerSample: number;
  private level = 0;
  private tickLeft = 0;
  private dcIn = 0;
  private dcOut = 0;
  private readonly dcKeep: number;

  constructor(readonly sampleRate: number, readonly clock = AY_CLOCK_128K) {
    this.ticksPerSample = clock / 8 / sampleRate;
    this.dcKeep = 1 - (2 * Math.PI * 20) / sampleRate;
    this.startEnvelope();
    this.level = this.mix();
  }

  /** A register write (0-13; writes above 13 are ignored). The bits the chip does not keep are dropped. */
  write(reg: number, value: number): void {
    const keep = KEEP[reg];
    if (keep === undefined) return;
    this.regs[reg] = value & keep;
    if (reg === AyReg.shape) this.startEnvelope();
  }

  /** The value a register holds (after the bits the chip keeps). */
  read(reg: number): number { return this.regs[reg] ?? 0; }

  /** The tone period of channel 0-2 as the chip counts it (0 counts as 1). */
  tonePeriod(ch: number): number { return Math.max(1, ((this.read(ch * 2 + 1)) << 8) | this.read(ch * 2)); }
  noisePeriod(): number { return Math.max(1, this.read(AyReg.noise)); }
  envelopePeriod(): number { return Math.max(1, (this.read(AyReg.envelopeHigh) << 8) | this.read(AyReg.envelopeLow)); }
  /** The tone generator of channel 0-2 (before the mixer) and the noise generator. */
  toneOut(ch: number): boolean { return this.toneHigh[ch] === true; }
  noiseOut(): boolean { return (this.lfsr & 1) === 1; }
  /** The 17-bit noise register. */
  get noiseRegister(): number { return this.lfsr; }

  private startEnvelope(): void {
    const shape = this.read(AyReg.shape);
    this.envAttack = (shape & 4) !== 0 ? 15 : 0;
    this.envStep = 15;
    this.envHolding = false;
    this.envCount = 0;
    this.envLevel = this.envStep ^ this.envAttack;
  }

  /** One tick (clock / 8): the tone, noise and envelope counters. */
  tick(): void {
    for (let ch = 0; ch < 3; ch++) {
      if (++this.toneCount[ch] >= this.tonePeriod(ch)) {
        this.toneCount[ch] = 0;
        this.toneHigh[ch] = !this.toneHigh[ch];
      }
    }
    if (++this.noiseCount >= 2 * this.noisePeriod()) {
      this.noiseCount = 0;
      const feedback = (this.lfsr ^ (this.lfsr >> 3)) & 1;
      this.lfsr = (this.lfsr >> 1) | (feedback << 16);
    }
    if (!this.envHolding && ++this.envCount >= 2 * this.envelopePeriod()) {
      this.envCount = 0;
      this.stepEnvelope();
    }
  }

  private stepEnvelope(): void {
    const shape = this.read(AyReg.shape);
    if (--this.envStep < 0) {
      if ((shape & 8) === 0) {
        // (continue off: one ramp, then silence)
        this.envHolding = true;
        this.envStep = 0;
        this.envAttack = 0;
      } else {
        if ((shape & 2) !== 0) this.envAttack ^= 15;
        if ((shape & 1) !== 0) {
          this.envHolding = true;
          this.envStep = 0;
        } else {
          this.envStep = 15;
        }
      }
    }
    this.envLevel = (this.envStep ^ this.envAttack) & 15;
  }

  /** The level of channel 0-2 now (the volume looked up in `AY_LEVELS`, 0 to 1). */
  channelLevel(ch: number): number {
    const mixer = this.read(AyReg.mixer);
    const tone = this.toneOut(ch) || (mixer & (1 << ch)) !== 0;
    const noise = this.noiseOut() || (mixer & (8 << ch)) !== 0;
    if (!(tone && noise)) return 0;
    const volume = this.read(8 + ch);
    return AY_LEVELS[(volume & 16) !== 0 ? this.envLevel : volume & 15] ?? 0;
  }

  /** The three channels mixed, 0 to 1 (all three at full volume). */
  mix(): number { return (this.channelLevel(0) + this.channelLevel(1) + this.channelLevel(2)) / 3; }

  /** Fill `out[offset .. offset + count)` with the chip's sound, AC-coupled (see the top). The chip keeps its place between calls. */
  render(out: Float32Array, offset: number, count: number): void {
    for (let i = 0; i < count; i++) out[offset + i] = this.couple(this.integrate());
  }

  /** The mean of the output over the next sample (no AC coupling): the box filter, `render` without the high pass. */
  integrate(): number {
    let remaining = this.ticksPerSample;
    let sum = 0;
    while (remaining > 1e-9) {
      if (this.tickLeft <= 1e-9) {
        this.tick();
        this.level = this.mix();
        this.tickLeft = 1;
      }
      const take = Math.min(this.tickLeft, remaining);
      sum += this.level * take;
      this.tickLeft -= take;
      remaining -= take;
    }
    return sum / this.ticksPerSample;
  }

  private couple(x: number): number {
    const y = x - this.dcIn + this.dcKeep * this.dcOut;
    this.dcIn = x;
    this.dcOut = y;
    return y;
  }
}
