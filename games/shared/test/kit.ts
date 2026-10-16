// c64kit for headless front-end tests: the real input, fonts, surfaces and VIC model,
// with a renderer that draws nowhere and a SID player that remembers what it was asked.
export * from '../../../packages/c64kit/src/json';
export * from '../../../packages/c64kit/src/palette';
export * from '../../../packages/c64kit/src/font';
export * from '../../../packages/c64kit/src/input';
export * from '../../../packages/c64kit/src/surface';
export * from '../../../packages/c64kit/src/vic';
export { C64 as C64Machine, packState, unpackState, PAL_FRAME_CYCLES } from '../../../packages/c64kit/src/c64/machine';
export type { MachineState, FrameCapture, SidWrite } from '../../../packages/c64kit/src/c64/machine';
export { C64_KEYS } from '../../../packages/c64kit/src/c64/keyboard';
export * from '../../../packages/c64kit/src/effects';
export * from '../../../packages/c64kit/src/hd/scene';
export * from '../../../packages/c64kit/src/hd/oblique';
export * from '../../../packages/c64kit/src/pendragon/room';
/** (No worker under Node: rooms are built on the main thread, as the browser does without one.) */
export function hdRefresher(): null { return null; }
export * from '../../../packages/c64kit/src/layout';
import type { PictureLayout } from '../../../packages/c64kit/src/layout';
import type { C64View as RealC64View } from '../../../packages/c64kit/src/c64/view';
import type { C64, SidWrite } from '../../../packages/c64kit/src/c64/machine';
import { EffectsModel } from '../../../packages/c64kit/src/effects';
import type { Marker } from '../../../packages/c64kit/src/overlay';
import { decodePicture, emptyPicture } from '../../../packages/c64kit/src/c64/picture';
import type { HdRoom } from '../../../packages/c64kit/src/hd/scene';
import type { Renderer, SpriteHandle } from '../../../packages/c64kit/src/renderer';
import type { SidPlayer as RealSidPlayer } from '../../../packages/c64kit/src/sid/player';
import type { SfxName } from '../../../packages/c64kit/src/sid/sfx';
import { Surface, TRANSPARENT } from '../../../packages/c64kit/src/surface';
export type { Renderer, SpriteHandle } from '../../../packages/c64kit/src/renderer';
export type { Host, PointerTarget } from '../../../packages/c64kit/src/host';
export type { Marker } from '../../../packages/c64kit/src/overlay';
export type { SfxName } from '../../../packages/c64kit/src/sid/sfx';

/**
 * The renderer, drawing nowhere: the screen surface is real (tests read its pixels), and the
 * sprites it was given are kept, so `picture()` can put them together as the real one shows them.
 */
export class PixelRenderer implements Renderer {
  readonly screen = new Surface(320, 200, 0);
  border = 0; background = 0; snap = false; frame = { x: 0, y: 0 };
  backdrop: Surface | null = null;
  layout: PictureLayout | null = null;
  area: { x: number; y: number; w: number; h: number } | null = null;
  clientToLocal: ((clientX: number, clientY: number) => { x: number; y: number }) | null = null;
  /** The sparkles set for the frame, in screen pixels (tests read them; nothing is drawn). */
  sparkles: { markers: Marker[]; set(markers: Marker[]): void; update(): void } = { markers: [], set(markers) { this.markers = markers; }, update() {} };
  /** The effects' model is the real one (tests can read what's showing); nothing is drawn. */
  effects = { model: new EffectsModel(), enabled: true, update() { return { x: 0, y: 0 }; } };
  /** The HD view's room as the game set it (tests draw it with packages/c64kit/test/hd-raster.ts); nothing is drawn. */
  hd: { room: HdRoom | null; available: boolean } = { room: null, available: true };
  borderBands: number[] | null = null;
  /** The sprites made (VicView makes one per VIC sprite). */
  readonly sprites: SpriteHandle[] = [];
  createSprite(z = 1): SpriteHandle {
    const h: SpriteHandle = { surface: null, x: 0, y: 0, visible: false, z };
    this.sprites.push(h);
    return h;
  }
  /**
   * The picture as the real renderer shows it, as C64 colour indexes (320 × 200): the screen
   * (its clear pixels the background colour), the sprites in their order (z), those behind
   * the characters (z < 0) only where the screen is clear.
   */
  picture(): Uint8Array {
    const W = 320, H = 200, s = this.screen.pixels, out = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = s[i] === TRANSPARENT ? this.background & 15 : s[i];
    for (const h of [...this.sprites].sort((a, b) => a.z - b.z)) {
      const sp = h.surface;
      if (!h.visible || !sp) continue;
      for (let y = 0; y < sp.height; y++) for (let x = 0; x < sp.width; x++) {
        const v = sp.pixels[y * sp.width + x], X = Math.round(h.x) + x, Y = Math.round(h.y) + y;
        if (v === TRANSPARENT || X < 0 || Y < 0 || X >= W || Y >= H) continue;
        if (h.z < 0 && s[Y * W + X] !== TRANSPARENT) continue;
        out[Y * W + X] = v;
      }
    }
    return out;
  }
  hideSprites() { for (const h of this.sprites) h.visible = false; }
  render() {}
  toScreen(_clientX: number, _clientY: number) { return { x: 0, y: 0 }; }
  toScreenLocal(_x: number, _y: number) { return { x: 0, y: 0 }; }
}

export const sidLog: { song: number[]; calls: number[][]; frames: number; writes: number; last: SidWrite[]; sfx: SfxName[] } = { song: [], calls: [], frames: 0, writes: 0, last: [], sfx: [] };
/** The SID player, remembering what it was asked (sidLog) and playing nothing. */
export class SidPlayer implements Pick<RealSidPlayer, 'unlocked' | 'muted' | 'unlock' | 'play' | 'call' | 'stop' | 'toggleMute' | 'hold' | 'startStream' | 'pushFrame' | 'sfx'> {
  readonly unlocked = true; muted = false;
  constructor(public url = '') {}
  unlock() { return Promise.resolve(); }
  async play(song: number) { sidLog.song.push(song); }
  call(addr: number, a = 0, x = 0, y = 0) { sidLog.calls.push([addr, a, x, y]); }
  stop() {}
  toggleMute() { this.muted = !this.muted; return this.muted; }
  hold(_on: boolean) {}
  startStream() { return Promise.resolve(); }
  pushFrame(w: SidWrite[] = []) { sidLog.frames++; sidLog.writes += w.length; sidLog.last = w; }
  sfx(name: SfxName) { sidLog.sfx.push(name); }
}

/**
 * The machine's picture drawn nowhere (C64View's stand-in): the screen is cleared each frame as
 * the real one's is (the front end's panels are drawn over it), the picture itself is left out
 * (tests draw it with tools/probe/render.ts's renderPixels, laid out by `renderer.layout`).
 */
export class C64View implements Pick<RealC64View, 'backdrop' | 'picture' | 'update' | 'render' | 'dispose'> {
  readonly backdrop = new Surface(320, 200, 0);
  private readonly decoded = emptyPicture();
  /** (The picture decoded as the real one has it, when asked for: the HD view's rooms are built from it.) */
  get picture() { return decodePicture(this.m.ram, this.m.capture, this.decoded); }
  constructor(readonly renderer: Renderer, readonly m: Pick<C64, 'ram' | 'capture'>) {}
  update() { this.renderer.screen.pixels.fill(TRANSPARENT); this.renderer.screen.version++; }
  render(_alpha: number) {}
  dispose() {}
}
