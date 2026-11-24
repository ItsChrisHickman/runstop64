import workletUrl from './sid-worklet.ts?worker&url';
import { isFromWorklet, type ToWorklet } from './messages';
import type { SfxName } from './sfx';
import type { CrossingPlan } from './crossing';

/**
 * Main-thread handle for SID playback. Browsers only allow audio after a user
 * gesture, so call `unlock()` from a key/click handler before `play()`.
 */
export class SidPlayer {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private ready: Promise<void> | null = null;
  private tune: ArrayBuffer | null = null;
  /** The version of the tune to play (null: the file as it is): makes the bytes to load from the file's. */
  private version: ((original: Uint8Array) => Uint8Array) | null = null;
  private loadedSong = 0;
  /**
   * Another .sid playing in place of the file (`useFile`: its url and song), or null. Its routines are not the file's, so `call`
   * does nothing while it plays; `useTune` goes back to the file. Each url is fetched once.
   */
  private other: { url: string; song: number } | null = null;
  private readonly others = new Map<string, Promise<ArrayBuffer>>();
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
    const first = !this.loadedSong;
    this.loadedSong = song;
    if (this.other) {
      if (first) await this.loadOther();
      return;
    }
    if (first) {
      this.send({ type: 'load', data: this.tuneData(this.tune), song });
    } else {
      this.send({ type: 'song', song });
    }
    this.applyVolume();
  }

  /**
   * Play another .sid altogether in place of the file, song `song` from its start (Do Svidaniya Monty's flight plays Auf
   * Wiedersehen Monty's theme), until `useTune` goes back to the file. Remembered if the audio is not up yet.
   */
  useFile(url: string, song: number) {
    this.other = { url, song };
    void this.loadOther();
  }

  /** Loads the other .sid once it is fetched, if it is still the one asked for (the player may have moved on meanwhile). */
  private async loadOther() {
    const other = this.other;
    if (!other || !this.node || !this.loadedSong) return;
    let data: ArrayBuffer;
    try {
      data = await this.fetchOther(other.url);
    } catch (err) {
      console.error('SID: could not load', other.url, err);
      if (this.other === other) this.useTune(this.version);
      return;
    }
    if (this.other !== other) return;
    this.send({ type: 'load', data: data.slice(0), song: other.song });
    this.applyVolume();
  }

  private fetchOther(url: string): Promise<ArrayBuffer> {
    let bytes = this.others.get(url);
    if (!bytes) {
      bytes = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))));
      this.others.set(url, bytes);
    }
    return bytes;
  }

  /** The bytes to load: the file's, or the version's made from them (always a copy: it is handed to the worklet). */
  private tuneData(original: ArrayBuffer): ArrayBuffer {
    const bytes = this.version ? this.version(new Uint8Array(original)) : new Uint8Array(original);
    const copy = new ArrayBuffer(bytes.length);
    new Uint8Array(copy).set(bytes);
    return copy;
  }

  /**
   * Play another version of the loaded tune (made from its bytes by `make`, or the file as it is with null), from the start of
   * the song it was playing, or, given a `crossing` (the plan, made from the original's bytes), carrying on from where the song is and changing at the plan's next boundary
   * (crossing.ts). Remembered if the audio is not up yet. A version is the tune's data changed, the player the same.
   */
  useTune(make: ((original: Uint8Array) => Uint8Array) | null, crossing?: (original: Uint8Array) => CrossingPlan) {
    this.version = make;
    const fromOther = this.other !== null;
    this.other = null;
    if (!this.node || !this.tune || !this.loadedSong) return;
    if (crossing && !fromOther) this.send({ type: 'cross', data: this.tuneData(this.tune), plan: crossing(new Uint8Array(this.tune)) });
    else this.send({ type: 'load', data: this.tuneData(this.tune), song: this.loadedSong });
    this.applyVolume();
  }

  /**
   * Call a 6502 routine inside the loaded tune (A/X/Y set), e.g. a game's
   * sound-effect entry point. Ignored until audio is unlocked and loaded.
   */
  call(addr: number, a = 0, x = 0, y = 0) {
    if (!this.loadedSong || this.other) return; // (another .sid's memory is not the file's: its routines are elsewhere)
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
