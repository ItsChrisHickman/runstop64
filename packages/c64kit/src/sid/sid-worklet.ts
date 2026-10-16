/// <reference lib="webworker" />
// AudioWorklet processor: runs a SID tune entirely on the audio thread,
// independent of the game's frame rate.
import { parsePsid, SidTune } from './psid';
import { Sid, PAL_CLOCK } from './sid';
import { isToWorklet, type FromWorklet } from './messages';
import { SfxSequencer, type SfxName } from './sfx';

const FRAME_CYCLES = 19656;

declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

/**
 * Overlay sound effects (sfx.ts) on a second SID of their own, mixed in with the game's: its
 * steps go at 50 Hz on the audio clock, and it's only run while an effect sounds.
 */
class SfxPlayer {
  readonly sid = new Sid(sampleRate, PAL_CLOCK);
  private readonly seq = new SfxSequencer((r, v) => this.sid.write(r, v));
  private readonly samplesPerFrame = sampleRate / 50;
  private toFrame = 0;
  /** Samples still to run after the last step (the release dies away). */
  private tail = 0;
  private buf = new Float32Array(128);

  start(name: SfxName) {
    this.seq.start(name);
    this.tail = sampleRate; // (a second: the longest release)
  }

  /** Mix into `out` (adds). */
  mix(out: Float32Array, gain: number) {
    if (this.tail <= 0 && !this.seq.busy) return;
    if (this.buf.length < out.length) this.buf = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) {
      if (--this.toFrame <= 0) {
        this.toFrame += this.samplesPerFrame;
        this.seq.frame();
      }
      this.sid.render(this.buf, i, 1);
      out[i] += this.buf[i] * gain;
    }
    if (!this.seq.busy) this.tail -= out.length;
  }
}

/**
 * Stream mode: a game running elsewhere sends each frame's SID register
 * writes (cycle << 16 | reg << 8 | value). They're played back on the audio
 * clock a couple of frames behind, so timing jitter on the game side doesn't
 * reach the speakers.
 */
class SidStream {
  readonly sid = new Sid(sampleRate, PAL_CLOCK);
  private frames: Uint32Array[] = [];
  private current: Uint32Array | null = null;
  private idx = 0;
  private cycle = 0; // position within the current frame
  private readonly cyclesPerSample = PAL_CLOCK / sampleRate;
  private started = false;

  push(w: Uint32Array) {
    this.frames.push(w);
    // Running far behind (tab was hidden): jump ahead, applying what we skip.
    while (this.frames.length > 8) {
      const f = this.frames.shift();
      if (f) for (const v of f) this.sid.write((v >> 8) & 0x1f, v & 0xff);
    }
  }

  render(out: Float32Array) {
    if (!this.started) {
      if (this.frames.length < 3) { out.fill(0); return; }
      this.started = true;
    }
    for (let i = 0; i < out.length; i++) {
      if (!this.current) {
        this.current = this.frames.shift() ?? null;
        this.idx = 0;
        this.cycle = 0;
      }
      const cur = this.current;
      if (cur) {
        while (this.idx < cur.length && cur[this.idx] >>> 16 <= this.cycle) {
          const v = cur[this.idx++];
          this.sid.write((v >> 8) & 0x1f, v & 0xff);
        }
        this.cycle += this.cyclesPerSample;
        if (this.cycle >= FRAME_CYCLES) {
          while (this.idx < cur.length) { const v = cur[this.idx++]; this.sid.write((v >> 8) & 0x1f, v & 0xff); }
          this.current = null;
        }
      }
      // Starved (game paused or slow): keep sounding the current registers.
      this.sid.render(out, i, 1);
    }
  }
}

class SidProcessor extends AudioWorkletProcessor {
  private tune: SidTune | null = null;
  private stream: SidStream | null = null;
  private playing = false;
  private volume = 0.8;
  private sfx: SfxPlayer | null = null;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<unknown>) => {
      const m = e.data;
      if (!isToWorklet(m)) return;
      try {
        if (m.type === 'load') {
          this.tune = new SidTune(parsePsid(m.data), sampleRate);
          this.tune.start(m.song);
          this.playing = true;
        } else if (m.type === 'song' && this.tune) {
          this.tune.start(m.song);
          this.playing = true;
        } else if (m.type === 'stop') {
          this.playing = false;
        } else if (m.type === 'volume') {
          this.volume = m.value;
        } else if (m.type === 'stream') {
          this.stream = new SidStream();
          this.tune = null;
          this.playing = true;
        } else if (m.type === 'frame' && this.stream) {
          this.stream.push(m.writes);
        } else if (m.type === 'sfx') {
          (this.sfx ??= new SfxPlayer()).start(m.name);
        } else if (m.type === 'call' && this.tune) {
          // Run one of the tune's own routines (e.g. a game's "play SFX" entry).
          this.tune.cpu.call(m.addr, m.a ?? 0, m.x ?? 0, m.y ?? 0);
          this.playing = true;
        }
      } catch (err) {
        const msg: FromWorklet = { type: 'error', message: String(err) };
        this.port.postMessage(msg);
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const left = out[0];
    if (this.playing && this.stream) {
      this.stream.render(left);
      for (let i = 0; i < left.length; i++) left[i] *= this.volume;
    } else if (this.playing && this.tune) {
      this.tune.render(left);
      for (let i = 0; i < left.length; i++) left[i] *= this.volume;
    } else {
      left.fill(0);
    }
    this.sfx?.mix(left, this.volume);
    for (let c = 1; c < out.length; c++) out[c].set(left);
    return true;
  }
}

registerProcessor('sid-processor', SidProcessor);
