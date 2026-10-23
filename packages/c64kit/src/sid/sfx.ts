/**
 * Sound effects for overlays (combat effects), made the way a C64 game makes them: short
 * programs of SID register writes, one step per 50 Hz frame, played on a SID of their own
 * (a second chip in the audio worklet, mixed with the game's), so they sound like the
 * machine and never touch the game's own sound.
 *
 * Each effect is a list of voice programs; a program's writes use the voice's own register
 * numbers (0-1 frequency, 2-3 pulse width, 4 control, 5 attack/decay, 6 sustain/release),
 * and the worklet puts each on a free voice.
 */
export const SFX_NAMES = ['kill', 'hit', 'hurt'] as const;
export type SfxName = (typeof SFX_NAMES)[number];
export const isSfxName = (v: unknown): v is SfxName => SFX_NAMES.some((n) => n === v);

/** One voice's program: per frame, [register, value] writes. */
export type VoiceProgram = [number, number][][];

/** SID frequency register value for a pitch in Hz (PAL clock). */
const f = (hz: number) => Math.max(0, Math.min(0xffff, Math.round((hz * 16777216) / 985248)));
const freq = (hz: number): [number, number][] => [[0, f(hz) & 0xff], [1, f(hz) >> 8]];

/** A pitch sweep: `frames` steps from `from` to `to` Hz (exponential), gate on, then off at `release`. */
function sweep(opts: { wave: number; from: number; to: number; frames: number; ad: number; sr: number; pw?: number; release: number; wobble?: number }): VoiceProgram {
  const out: VoiceProgram = [];
  for (let i = 0; i < opts.frames; i++) {
    const k = opts.frames > 1 ? i / (opts.frames - 1) : 0;
    let hz = opts.from * Math.pow(opts.to / opts.from, k);
    if (opts.wobble) hz *= 1 + opts.wobble * (i % 2 ? 1 : -1);
    const w: [number, number][] = [...freq(hz)];
    if (i === 0) {
      w.push([2, (opts.pw ?? 0x800) & 0xff], [3, (opts.pw ?? 0x800) >> 8], [5, opts.ad], [6, opts.sr]);
      w.push([4, opts.wave | 0x08], [4, opts.wave | 1]); // (test bit: start the oscillator from zero, then gate)
    }
    if (i === opts.release) w.push([4, opts.wave]);
    out.push(w);
  }
  if (opts.release >= opts.frames) out.push([[4, opts.wave]]);
  return out;
}

const NOISE = 0x80, PULSE = 0x40, SAW = 0x20, TRI = 0x10;

export const SFX: Record<SfxName, VoiceProgram[]> = {
  // An enemy destroyed: a crunch of noise falling in pitch, and a square "pop" dropping under it.
  kill: [
    sweep({ wave: NOISE, from: 1400, to: 300, frames: 14, ad: 0x08, sr: 0x05, release: 3 }),
    sweep({ wave: PULSE, from: 900, to: 70, frames: 10, ad: 0x06, sr: 0x04, pw: 0x600, release: 2 }),
  ],
  // A blow that lands: a short, bright click.
  hit: [sweep({ wave: NOISE, from: 1800, to: 700, frames: 6, ad: 0x06, sr: 0x03, release: 2 })],
  // The player hurt: a low, wobbling buzz sliding down.
  hurt: [
    sweep({ wave: SAW, from: 300, to: 110, frames: 14, ad: 0x08, sr: 0x06, release: 5, wobble: 0.06 }),
    sweep({ wave: TRI, from: 150, to: 55, frames: 14, ad: 0x08, sr: 0x06, release: 5 }),
  ],
};

/**
 * Plays effects on a SID of their own: `start` an effect (its programs go on the voices that
 * are free, or the oldest), then call `frame` 50 times a second to apply the next step.
 */
export class SfxSequencer {
  private voices: { prog: VoiceProgram; step: number; started: number }[] = [];
  private count = 0;

  constructor(private readonly write: (reg: number, value: number) => void) {
    write(0x18, 0x0f); // volume full, no filter
  }

  get busy() { return this.voices.some((v) => v && v.step < v.prog.length); }

  start(name: SfxName) {
    for (const prog of SFX[name] ?? []) {
      // a free voice, else the one that started longest ago
      let n = [0, 1, 2].find((i) => !this.voices[i] || this.voices[i].step >= this.voices[i].prog.length);
      if (n === undefined) n = [0, 1, 2].reduce((a, b) => (this.voices[a].started <= this.voices[b].started ? a : b));
      this.voices[n] = { prog, step: 0, started: this.count++ };
    }
  }

  /** One frame (1/50 s): each voice's next writes. */
  frame() {
    this.voices.forEach((v, n) => {
      if (!v || v.step >= v.prog.length) return;
      for (const [reg, value] of v.prog[v.step]) this.write(n * 7 + reg, value);
      v.step++;
    });
  }
}
