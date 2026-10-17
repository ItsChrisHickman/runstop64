import workletUrl from './worklet.ts?worker&url';
import { isFromAyWorklet, type ToAyWorklet } from './messages';

/**
 * Main-thread handle for AY music (the counterpart of `SidPlayer`): browsers only allow audio after a user gesture, so call
 * `unlock()` from a key or tap (`AudioKeys` does). It makes the audio context, an audio worklet that plays the tune (tune.ts) on
 * the audio clock, and a master gain. A game's own short sounds (a beeper effect) are made at the context's sample rate with
 * `addSample` and played with `playSample` through the same master gain, so muting and holding cover them too.
 * `muted` and `hold` act on the master gain; holding also pauses the tune where it is.
 */
export class AyPlayer {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private master: GainNode | null = null;
  private ready: Promise<void> | null = null;
  private wanted = false;
  private pending: { data: Uint8Array; stepRate: number } | null = null;
  private readonly samples: AudioBuffer[] = [];
  muted = false;
  private held = false;

  /** Create the audio graph. Must run inside a user gesture. */
  unlock(): Promise<void> {
    if (this.ready) {
      void this.ctx?.resume();
      return this.ready;
    }
    const ctx = (this.ctx = new AudioContext());
    this.ready = (async () => {
      await ctx.audioWorklet.addModule(workletUrl);
      const master = (this.master = ctx.createGain());
      master.connect(ctx.destination);
      const node = (this.node = new AudioWorkletNode(ctx, 'ay-processor', { outputChannelCount: [2] }));
      node.port.onmessage = (e: MessageEvent<unknown>) => {
        if (isFromAyWorklet(e.data)) console.error('AY:', e.data.message);
      };
      node.connect(master);
      this.applyGain();
      if (this.pending) this.tune(this.pending.data, this.pending.stepRate);
      this.sendPlay();
    })();
    void ctx.resume();
    return this.ready;
  }

  get unlocked() { return !!this.ready; }

  /** The sample rate of the audio (0 until the audio is unlocked): the rate to make `addSample`'s samples at. */
  get sampleRate(): number { return this.ctx?.sampleRate ?? 0; }

  /** The audio clock in seconds (0 until unlocked): `playSample` times are on it. */
  get now(): number { return this.ctx?.currentTime ?? 0; }

  /** Give the tune: the bytes of a stream (tune.ts) and its steps a second. It plays when `play(true)` is also asked and the audio is ready. */
  tune(data: Uint8Array, stepRate: number): void {
    this.pending = { data, stepRate };
    if (!this.node) return;
    const copy = data.slice().buffer;
    this.send({ type: 'tune', data: copy, stepRate }, [copy]);
  }

  /** Start or stop the music (it begins where it was stopped, or from the start the first time). */
  play(on: boolean): void {
    this.wanted = on;
    this.sendPlay();
  }

  /** A short sound (mono samples at `sampleRate`, times `gain`) kept to play again: its number, or -1 before the audio is unlocked. */
  addSample(samples: Float32Array, gain: number): number {
    if (!this.ctx) return -1;
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) data[i] = (samples[i] ?? 0) * gain;
    this.samples.push(buffer);
    return this.samples.length - 1;
  }

  /** Play a sample from `addSample` at audio time `at` (`now` or later). */
  playSample(sample: number, at: number): void {
    const buffer = this.samples[sample];
    const ctx = this.ctx;
    const master = this.master;
    if (!buffer || !ctx || !master || this.muted || this.held) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start(Math.max(at, ctx.currentTime));
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyGain();
    return this.muted;
  }

  /** Hold the sound while the game is stopped (a pause screen), and let it go on when the game does. */
  hold(on: boolean): void {
    if (on === this.held) return;
    this.held = on;
    this.applyGain();
    this.sendPlay();
  }

  private sendPlay(): void {
    this.send({ type: 'play', on: this.wanted && !this.held });
  }

  private send(m: ToAyWorklet, transfer: Transferable[] = []): void {
    this.node?.port.postMessage(m, transfer);
  }

  private applyGain(): void {
    if (this.master) this.master.gain.value = this.muted || this.held ? 0 : 1;
  }
}
