import workletUrl from './sid-worklet.ts?worker&url';
import { isFromWorklet, type ToWorklet } from './messages';
import type { SfxName } from './sfx';

/**
 * Main-thread handle for SID playback. Browsers only allow audio after a user
 * gesture, so call `unlock()` from a key/click handler before `play()`.
 */
export class SidPlayer {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private ready: Promise<void> | null = null;
  private tune: ArrayBuffer | null = null;
  private loadedSong = 0;
  muted = false;
  /** Silent while the game is stopped (a pause screen): the SID would hold its last notes. */
  private held = false;

  /** `url` is a .sid tune to play; leave it empty to stream register writes from a running game instead. */
  constructor(private url = '') {}
  private streaming = false;

  /** Create the audio graph. Must run inside a user gesture. */
  unlock(): Promise<void> {
    if (this.ready) {
      void this.ctx?.resume();
      return this.ready;
    }
    const ctx = (this.ctx = new AudioContext());
    this.ready = (async () => {
      const [, data] = await Promise.all([
        ctx.audioWorklet.addModule(workletUrl),
        this.url ? fetch(this.url).then((r) => r.arrayBuffer()) : Promise.resolve(new ArrayBuffer(0)),
      ]);
      this.tune = data;
      this.node = new AudioWorkletNode(ctx, 'sid-processor', { outputChannelCount: [2] });
      this.node.port.onmessage = (e: MessageEvent<unknown>) => {
        if (isFromWorklet(e.data)) console.error('SID:', e.data.message);
      };
      this.node.connect(ctx.destination);
    })();
    void ctx.resume();
    return this.ready;
  }

  get unlocked() {
    return !!this.ready;
  }

  async play(song: number) {
    if (!this.ready) return;
    await this.ready;
    if (!this.node || !this.tune) return;
    if (!this.loadedSong) {
      this.send({ type: 'load', data: this.tune.slice(0), song });
    } else {
      this.send({ type: 'song', song });
    }
    this.loadedSong = song;
    this.applyVolume();
  }

  /**
   * Call a 6502 routine inside the loaded tune (A/X/Y set), e.g. a game's
   * sound-effect entry point. Ignored until audio is unlocked and loaded.
   */
  call(addr: number, a = 0, x = 0, y = 0) {
    if (!this.loadedSong) return;
    this.send({ type: 'call', addr, a, x, y });
  }

  /** Start stream mode (no tune): then send each frame's SID writes with pushFrame. */
  async startStream() {
    if (!this.ready) return;
    await this.ready;
    this.send({ type: 'stream' });
    this.streaming = true;
    this.applyVolume();
  }

  /** One frame's SID writes from an emulated C64 (cycle offsets within the frame). */
  pushFrame(writes: { cycle: number; reg: number; value: number }[]) {
    if (!this.streaming || !this.node) return;
    const packed = new Uint32Array(writes.length);
    writes.forEach((w, i) => (packed[i] = (Math.min(w.cycle, 0xffff) << 16) | ((w.reg & 0x1f) << 8) | (w.value & 0xff)));
    this.send({ type: 'frame', writes: packed }, [packed.buffer]);
  }

  /** A sound effect (sfx.ts) on the overlay SID, mixed with the game's own sound. */
  sfx(name: SfxName) {
    if (!this.node || this.muted || this.held) return;
    this.send({ type: 'sfx', name });
  }

  stop() {
    this.send({ type: 'stop' });
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolume();
    return this.muted;
  }

  /** Hold the sound while the game is stopped, and let it go on when the game does. */
  hold(on: boolean) {
    if (on === this.held) return;
    this.held = on;
    this.applyVolume();
  }

  private send(m: ToWorklet, transfer: Transferable[] = []) {
    this.node?.port.postMessage(m, transfer);
  }

  private applyVolume() {
    this.send({ type: 'volume', value: this.muted || this.held ? 0 : 0.8 });
  }
}
