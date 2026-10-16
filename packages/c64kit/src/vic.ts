import { Smoothed } from './loop';
import type { Renderer, SpriteHandle } from './renderer';
import { Surface, TRANSPARENT } from './surface';

/**
 * A virtual VIC-II: the memory and registers a C64 game drives, without the
 * hardware's limits. Game code ported from 6502 writes here exactly as the
 * original wrote to the real chip (screen RAM, colour RAM, character RAM,
 * sprite registers), and VicView draws it natively.
 *
 * `bank` models the 16K the VIC sees. Character and screen RAM live inside it
 * at configurable offsets; sprite pointer P reads 64 bytes at P*64.
 */
export interface SpriteRegs {
  x: number; // VIC X (0-511)
  y: number; // VIC Y
  ptr: number;
  colour: number;
}

export class Vic {
  readonly bank = new Uint8Array(0x4000);
  readonly colour = new Uint8Array(1024); // 1000 used; slack for games that write past row 24
  charOffset = 0x0000;
  screenOffset = 0x0800;
  readonly sprites: SpriteRegs[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, ptr: 0, colour: 0 }));
  enable = 0;
  multicolour = 0;
  priority = 0; // bit set: sprite is drawn behind character pixels
  expandX = 0;
  expandY = 0;
  mc1 = 0; // $D025
  mc2 = 0; // $D026
  border = 0;
  background = 0;
  /**
   * Hi-res bitmap mode: 8000 bytes of bitmap at `bitmapOffset`; each 8×8 cell's
   * screen byte gives its colours (set pixels: high nibble; clear: low nibble).
   */
  bitmap = false;
  bitmapOffset = 0x2000;

  get screen() {
    return this.bank.subarray(this.screenOffset, this.screenOffset + 1000);
  }

  get chars() {
    return this.bank.subarray(this.charOffset, this.charOffset + 2048);
  }

  glyph(code: number) {
    const o = this.charOffset + (code & 0xff) * 8;
    return this.bank.subarray(o, o + 8);
  }

  spriteData(ptr: number) {
    return this.bank.subarray((ptr & 0xff) * 64, (ptr & 0xff) * 64 + 64);
  }
}

/** Decode one sprite (hi-res or multicolour, optionally expanded) into `out`. */
export function decodeSprite(
  bytes: ArrayLike<number>, colour: number, mc: boolean, mc1: number, mc2: number, ex: boolean, ey: boolean, out: Surface,
) {
  out.pixels.fill(TRANSPARENT);
  const sx = ex ? 2 : 1, sy = ey ? 2 : 1;
  const plot = (x: number, y: number, c: number) => {
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) out.pixels[(y * sy + j) * out.width + x * sx + i] = c;
  };
  for (let row = 0; row < 21; row++) {
    for (let b = 0; b < 3; b++) {
      const v = bytes[row * 3 + b];
      if (!v) continue;
      if (mc) {
        for (let pair = 0; pair < 4; pair++) {
          const bits = (v >> (6 - pair * 2)) & 3;
          if (!bits) continue;
          const c = bits === 1 ? mc1 : bits === 2 ? colour : mc2;
          plot(b * 8 + pair * 2, row, c);
          plot(b * 8 + pair * 2 + 1, row, c);
        }
      } else {
        for (let bit = 0; bit < 8; bit++) if (v & (0x80 >> bit)) plot(b * 8 + bit, row, colour);
      }
    }
  }
  out.version++;
}

/**
 * Draws a Vic through a Renderer: characters into the screen surface
 * (transparent where a char pixel is off, so behind-priority sprites show
 * through), the background colour beneath, and the 8 sprites as smooth quads.
 */
export class VicView {
  private handles: SpriteHandle[];
  private smooth = Array.from({ length: 8 }, () => new Smoothed());
  private surfaces: Surface[][];
  private last = Array.from({ length: 8 }, () => ({ x: 0, y: 0, on: false }));
  /** Sprites currently drawn (surface + integer screen position), for collision tests. */
  private drawn: ({ s: Surface; x: number; y: number } | null)[] = new Array(8).fill(null);
  /** The cells' background colours, in bitmap mode. */
  private backdrop: Surface | null = null;

  constructor(readonly renderer: Renderer, readonly vic: Vic) {
    this.handles = Array.from({ length: 8 }, (_, i) => renderer.createSprite(10 - i));
    this.surfaces = Array.from({ length: 8 }, () => [new Surface(24, 21), new Surface(48, 21), new Surface(24, 42), new Surface(48, 42)]);
  }

  /** Forget smoothing history (call after a room change or teleport). */
  resetSmoothing() {
    for (const l of this.last) l.on = false;
  }

  /** Capture the VIC state for this tick: redraw the char screen and latch sprites. */
  update() {
    const v = this.vic;
    const s = this.renderer.screen;
    s.pixels.fill(TRANSPARENT);
    const screen = v.screen;
    if (v.bitmap) {
      // Set pixels on the screen surface; each cell's own background in the backdrop,
      // behind behind-priority sprites (as the VIC draws them).
      const back = (this.backdrop ??= new Surface(320, 200, 0));
      for (let i = 0; i < 1000; i++) {
        const c = screen[i], x = (i % 40) * 8, y = Math.floor(i / 40) * 8;
        s.drawChar(v.bank.subarray(v.bitmapOffset + i * 8, v.bitmapOffset + i * 8 + 8), x, y, c >> 4);
        back.fillRect(x, y, 8, 8, c & 15);
      }
      back.version++;
      this.renderer.backdrop = back;
    } else {
      for (let i = 0; i < 1000; i++) {
        const code = screen[i];
        const g = v.glyph(code);
        if (g[0] | g[1] | g[2] | g[3] | g[4] | g[5] | g[6] | g[7]) {
          s.drawChar(g, (i % 40) * 8, Math.floor(i / 40) * 8, v.colour[i] & 15);
        }
      }
      if (this.backdrop && this.renderer.backdrop === this.backdrop) this.renderer.backdrop = null;
    }
    s.version++;
    this.renderer.background = v.background;
    this.renderer.border = v.border;

    for (let n = 0; n < 8; n++) {
      const on = !!(v.enable & (1 << n));
      const h = this.handles[n];
      h.visible = on;
      if (!on) {
        this.last[n].on = false;
        this.drawn[n] = null;
        continue;
      }
      const r = v.sprites[n];
      const ex = !!(v.expandX & (1 << n)), ey = !!(v.expandY & (1 << n));
      const surf = this.surfaces[n][(ex ? 1 : 0) + (ey ? 2 : 0)];
      decodeSprite(v.spriteData(r.ptr), r.colour & 15, !!(v.multicolour & (1 << n)), v.mc1 & 15, v.mc2 & 15, ex, ey, surf);
      h.surface = surf;
      h.z = v.priority & (1 << n) ? -10 - n * 0.1 : 10 - n;
      // PAL sprite X runs 0-503; higher values wrap to just left of 0.
      const x = (r.x >= 504 ? r.x - 504 : r.x) - 24, y = r.y - 50;
      const l = this.last[n];
      // Jumps (teleports, re-use of a sprite for something else) don't glide.
      if (!l.on || Math.abs(x - l.x) > 12 || Math.abs(y - l.y) > 12) this.smooth[n].reset(x, y);
      else this.smooth[n].push(x, y);
      l.x = x; l.y = y; l.on = true;
      this.drawn[n] = { s: surf, x, y };
    }
  }

  /**
   * Sprite-sprite collision bits, like reading $D01E after this frame was drawn.
   * `ignore`: sprites (a bit each) that collide with nothing, as if not there.
   */
  collisions(ignore = 0): number {
    let bits = 0;
    for (let a = 0; a < 8; a++) {
      const A = this.drawn[a];
      if (!A || ignore & (1 << a)) continue;
      for (let b = a + 1; b < 8; b++) {
        const B = this.drawn[b];
        if (!B || ignore & (1 << b)) continue;
        if (overlap(A.s, A.x, A.y, B.s, B.x, B.y)) bits |= (1 << a) | (1 << b);
      }
    }
    return bits;
  }

  /** Position sprites for this display frame and draw. */
  render(alpha: number) {
    for (let n = 0; n < 8; n++) {
      const p = this.smooth[n].at(alpha, this.renderer.snap);
      this.handles[n].x = p.x;
      this.handles[n].y = p.y;
    }
    this.renderer.render();
  }
}

function overlap(a: Surface, ax: number, ay: number, b: Surface, bx: number, by: number) {
  const x0 = Math.max(ax, bx), x1 = Math.min(ax + a.width, bx + b.width);
  const y0 = Math.max(ay, by), y1 = Math.min(ay + a.height, by + b.height);
  if (x0 >= x1 || y0 >= y1) return false;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (a.pixels[(y - ay) * a.width + (x - ax)] !== TRANSPARENT && b.pixels[(y - by) * b.width + (x - bx)] !== TRANSPARENT) return true;
    }
  }
  return false;
}
