import { Ay, AY_CLOCK_128K, AY_REGISTERS } from './ay';

/**
 * A tune recorded as the AY's register image after each step of the game's player (a player that runs every n-th interrupt), coded
 * as changes: per step a mask byte (bits 0-6: registers 0-6 changed; bit 7: a second mask byte follows) and, if bit 7 is set, a
 * second (bits 0-6: registers 7-13), then the new value of each changed register in order. A step with no change is one zero byte.
 * The first step is coded in full (every register), so a tune that loops can start again from any state; the stream as a whole
 * loops from its start.
 */
export function packAyStream(images: readonly (readonly number[])[]): Uint8Array {
  const out: number[] = [];
  let before: readonly number[] = new Array<number>(AY_REGISTERS).fill(0);
  images.forEach((image, step) => {
    let mask = 0;
    for (let r = 0; r < AY_REGISTERS; r++) if (step === 0 || image[r] !== before[r]) mask |= 1 << r;
    const low = mask & 0x7f;
    const high = mask >> 7;
    out.push(high !== 0 ? low | 0x80 : low);
    if (high !== 0) out.push(high);
    for (let r = 0; r < AY_REGISTERS; r++) if ((mask & (1 << r)) !== 0) out.push(image[r] ?? 0);
    before = image;
  });
  return Uint8Array.from(out);
}

/** The register writes of the step that starts at `at` in a stream: `[register, value]` pairs; `next` is where the next step starts. */
export function readAyStep(bytes: Uint8Array, at: number): { writes: [number, number][]; next: number } {
  let pos = at;
  const first = bytes[pos++];
  if (first === undefined) throw new Error('AY stream: no step at the end');
  let mask = first & 0x7f;
  if ((first & 0x80) !== 0) {
    const second = bytes[pos++];
    if (second === undefined) throw new Error('AY stream: cut short');
    mask |= (second & 0x7f) << 7;
  }
  const writes: [number, number][] = [];
  for (let r = 0; r < AY_REGISTERS; r++) {
    if ((mask & (1 << r)) === 0) continue;
    const value = bytes[pos++];
    if (value === undefined) throw new Error('AY stream: cut short');
    writes.push([r, value]);
  }
  return { writes, next: pos };
}

/** Every step's register image (14 values), from a stream. */
export function unpackAyStream(bytes: Uint8Array): number[][] {
  const images: number[][] = [];
  let state = new Array<number>(AY_REGISTERS).fill(0);
  for (let at = 0; at < bytes.length;) {
    const step = readAyStep(bytes, at);
    state = state.slice();
    for (const [r, v] of step.writes) state[r] = v;
    images.push(state);
    at = step.next;
  }
  return images;
}

/** The 128K Spectrum's frame rate (the 3.5469 MHz clock over 70908 T-states a frame): 50.02 Hz; a player on every 2nd interrupt steps at half. */
export const FRAME_HZ_128K = 3_546_900 / 70_908;

/**
 * A tune playing on a chip: the stream's steps are applied at `stepRate` a second on the sample clock and the stream loops from its
 * start (as the original's player does when it reaches the end of its tune). Used by the audio worklet (worklet.ts), the offline
 * renderer and the tests, so all hear the same thing.
 */
export class AyTune {
  readonly ay: Ay;
  /** the number of steps in one pass of the tune */
  readonly steps: number;
  /** the step to apply next (0 to steps - 1) and the number of times the tune has come back to its start */
  next = 0;
  loops = 0;
  private at = 0;
  private untilStep = 0;
  private readonly samplesPerStep: number;
  /** playing paused (render makes silence and keeps the place) */
  paused = false;

  constructor(private readonly bytes: Uint8Array, stepRate: number, sampleRate: number, clock = AY_CLOCK_128K) {
    this.ay = new Ay(sampleRate, clock);
    this.samplesPerStep = sampleRate / stepRate;
    let steps = 0;
    for (let pos = 0; pos < bytes.length; steps++) pos = readAyStep(bytes, pos).next;
    if (steps === 0) throw new Error('AY stream: no steps');
    this.steps = steps;
  }

  /** Apply the next step's writes. */
  step(): void {
    const { writes, next } = readAyStep(this.bytes, this.at);
    for (const [r, v] of writes) this.ay.write(r, v);
    this.at = next;
    if (++this.next >= this.steps) {
      this.next = 0;
      this.at = 0;
      this.loops++;
    }
  }

  /** Samples for `count` frames from `offset`: the steps come at their rate, in between the chip is run. */
  render(out: Float32Array, offset: number, count: number): void {
    if (this.paused) { out.fill(0, offset, offset + count); return; }
    let done = 0;
    while (done < count) {
      if (this.untilStep <= 0) {
        this.step();
        this.untilStep += this.samplesPerStep;
      }
      const run = Math.min(count - done, Math.ceil(this.untilStep));
      this.ay.render(out, offset + done, run);
      this.untilStep -= run;
      done += run;
    }
  }
}
