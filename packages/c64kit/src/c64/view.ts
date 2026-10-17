import { Smoothed } from '../loop';
import type { Renderer, SpriteHandle } from '../renderer';
import { Surface } from '../surface';
import { decodeSprite } from '../vic';
import { layOut, placeBox } from '../layout';
import type { C64 } from './machine';
import { decodePicture, emptyPicture } from './picture';

/**
 * What the frame just made was, for a game whose logic does not step every frame (Auf Wiedersehen Monty: one step in two):
 * `fresh` when the game's step happened in it (the sprites moved then), and `frames` how many frames that step lasts, itself
 * included. The sprites then glide across the whole step instead of gliding in the frame of the step and holding in the
 * others. A game that moves them every frame is `EVERY_FRAME`.
 */
export interface ViewStep {
  readonly fresh: boolean;
  readonly frames: number;
}
export const EVERY_FRAME: ViewStep = { fresh: true, frames: 1 };

/**
 * Draws a C64's frame capture natively: each text row with the colours and
 * scroll it had when the VIC fetched it (so raster splits work), multicolour
 * and bitmap modes (picture.ts: the characters in front of sprites set behind
 * on the screen, the background on the backdrop), and every sprite occurrence
 * (so multiplexed sprites all show, with no flicker), moving smoothly between frames.
 */
export class C64View {
  private handles: SpriteHandle[] = [];
  private surfaces: Surface[][] = [];
  /** Each sprite occurrence's smoothing: where it was last frame, whether it stood still then, its image then. */
  private smooth = new Map<string, { s: Smoothed; x: number; y: number; seen: number; still: boolean; data: Uint8Array }>();
  private keys: string[] = [];
  /** Steps seen (a frame that is not a step does not count). */
  private frame = 0;
  /** The step the last update was in: its length in frames, and the frames of it gone. */
  private span = 1;
  private into = 0;
  /** The picture as decoded at the last update (the HD view builds its rooms from it: decoded once a frame). */
  readonly picture = emptyPicture();
  readonly backdrop = new Surface(320, 200, 0);

  constructor(readonly renderer: Renderer, readonly m: Pick<C64, 'ram' | 'capture'>) {
    renderer.backdrop = this.backdrop;
  }

  update(step: ViewStep = EVERY_FRAME) {
    const { m, renderer } = this;
    const cap = m.capture;
    const fg = renderer.screen.pixels, bg = this.backdrop.pixels;
    const pic = decodePicture(m.ram, cap, this.picture);
    fg.set(pic.fore);
    bg.set(pic.back);
    // The picture laid out as the front end shows it (renderer.layout: layout.ts), if it moves parts.
    const layout = renderer.layout;
    if (layout) layOut(layout, fg, bg, m.ram, cap);
    renderer.screen.version++;
    this.backdrop.version++;
    renderer.border = cap.border;

    // Sprites: one handle per occurrence; smoothing follows each sprite number's k-th use.
    if (step.fresh) { this.frame++; this.into = 0; this.span = step.frames; }
    else this.into++;
    const count = new Array<number>(8).fill(0);
    this.keys = [];
    cap.sprites.forEach((s, i) => {
      while (this.handles.length <= i) {
        this.handles.push(renderer.createSprite(1));
        this.surfaces.push([new Surface(24, 21), new Surface(48, 21), new Surface(24, 42), new Surface(48, 42)]);
      }
      const h = this.handles[i];
      const surf = this.surfaces[i][(s.expandX ? 1 : 0) + (s.expandY ? 2 : 0)];
      decodeSprite(s.data, s.colour, s.multicolour, s.mc1, s.mc2, s.expandX, s.expandY, surf);
      h.surface = surf;
      h.visible = true;
      h.n = s.n;
      h.z = s.behind ? -10 - s.n * 0.1 - count[s.n] * 0.01 : 10 - s.n - count[s.n] * 0.01;
      const key = `${s.n}:${count[s.n]++}`;
      this.keys[i] = key;
      // (with a layout: moved with the part of the picture its middle is in)
      const { x, y } = placeBox(layout, { x: (s.x >= 504 ? s.x - 504 : s.x) - 24, y: s.y - 50, w: surf.width, h: surf.height });
      let e = this.smooth.get(key);
      // (a sprite new to the view starts where it is: never seen, not seen the frame before the first)
      if (!e) { e = { s: new Smoothed(), x, y, seen: -1, still: true, data: new Uint8Array(64) }; this.smooth.set(key, e); }
      // (a frame between steps leaves the smoothing as the step made it, a new sprite starting where it is: the render glides on)
      if (!step.fresh) {
        if (e.seen < 0) { e.s.reset(x, y); e.data.set(s.data.subarray(0, 64)); e.seen = this.frame; }
        return;
      }
      const moved = x !== e.x || y !== e.y;
      // A step that moves the box with a new image, after a frame standing still, is drawn where the
      // game puts it: games that move a figure inside its sprite (JSW2's guardians: a new image every
      // few frames, each drawn 2 pixels on, then the box 8 pixels on with the first again) would
      // otherwise have the new image glide in from the old place: back, then forward, every cycle.
      const animStep = moved && e.still && !sameBytes(s.data, e.data);
      if (e.seen !== this.frame - 1 || Math.abs(x - e.x) > 12 || Math.abs(y - e.y) > 12 || animStep) e.s.reset(x, y);
      else e.s.push(x, y);
      e.still = !moved; e.data.set(s.data.subarray(0, 64));
      e.x = x; e.y = y; e.seen = this.frame;
    });
    for (let i = cap.sprites.length; i < this.handles.length; i++) this.handles[i].visible = false;
  }

  render(alpha: number) {
    for (let i = 0; i < this.keys.length; i++) {
      const e = this.smooth.get(this.keys[i]);
      if (!e) continue;
      const p = e.s.at(Math.min(1, (this.into + alpha) / this.span), this.renderer.snap);
      this.handles[i].x = p.x;
      this.handles[i].y = p.y;
    }
    this.renderer.render();
  }

  dispose() {
    for (const h of this.handles) h.visible = false;
    this.renderer.backdrop = null;
  }
}

/** Whether a sprite's image is the one kept (its first 63 bytes: the 64th is padding). */
function sameBytes(a: Uint8Array, b: Uint8Array) {
  for (let i = 0; i < 63; i++) if (a[i] !== b[i]) return false;
  return true;
}
