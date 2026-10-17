/// <reference lib="webworker" />
// AudioWorklet processor: plays a recorded AY tune (tune.ts) entirely on the audio thread, independent of the game's frame rate.
import { AyTune } from './tune';
import { isToAyWorklet, type FromAyWorklet } from './messages';

declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

class AyProcessor extends AudioWorkletProcessor {
  private tune: AyTune | null = null;
  private playing = false;
  private volume = 0.8;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<unknown>) => {
      const m = e.data;
      if (!isToAyWorklet(m)) return;
      try {
        if (m.type === 'tune') this.tune = new AyTune(new Uint8Array(m.data), m.stepRate, sampleRate);
        else if (m.type === 'play') this.playing = m.on;
        else this.volume = m.value;
      } catch (err) {
        const msg: FromAyWorklet = { type: 'error', message: String(err) };
        this.port.postMessage(msg);
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const out = outputs[0];
    const left = out?.[0];
    if (!out || !left) return true;
    if (this.playing && this.tune) {
      this.tune.render(left, 0, left.length);
      for (let i = 0; i < left.length; i++) left[i] *= this.volume;
    } else {
      left.fill(0);
    }
    for (let c = 1; c < out.length; c++) out[c]?.set(left);
    return true;
  }
}

registerProcessor('ay-processor', AyProcessor);
