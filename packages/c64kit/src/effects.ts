import { C64_PALETTE } from './palette';

/**
 * Combat effects drawn over the C64 picture (never into it): what a game reports (an enemy
 * destroyed, the player hurt, a swing of a weapon) becomes a short burst of light and pixels.
 *
 * This is the model: plain numbers, no Three.js, so it can be tested headless and drawn by
 * anything. `drawables(t)` lists what to draw at time `t` (milliseconds), in C64 screen pixels
 * (320x200, y down); `effects-layer.ts` draws them with Three.js, and the tests rasterise the
 * same list into PNGs.
 *
 * Everything is in the C64's own palette and its pixel sizes (a particle is a C64 pixel, or
 * two wide where the sprite it came from is multicolour), so it looks like it belongs.
 */

/** A sprite's shape: which of its pixels are lit, and their colours (C64 colour indices). */
export interface SpriteImage {
  /** Top left on the screen (C64 pixels). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Per pixel: a C64 colour index, or -1 where the sprite is transparent (row-major, w * h). */
  pixels: Int8Array;
  /** The sprite's pixels are two wide (multicolour): its particles are too. */
  wide?: boolean;
}

/** One thing to draw. Colours are 0xRRGGBB; alpha 0..1; `add`: additive (light), else normal blending. */
export type Drawable =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; color: number; alpha: number; add: boolean }
  | { kind: 'image'; image: SpriteImage; x: number; y: number; scale: number; color: number; alpha: number; add: boolean; id: number }
  | { kind: 'glow'; x: number; y: number; r: number; color: number; alpha: number }
  | { kind: 'ring'; x: number; y: number; r: number; color: number; alpha: number }
  | { kind: 'edge'; color: number; alpha: number; width: number }
  | { kind: 'frame'; x: number; y: number; w: number; h: number; grow: number; color: number; alpha: number };

interface Particle { x: number; y: number; vx: number; vy: number; w: number; h: number; color: number; born: number; life: number; spark: boolean }
interface Flash { image: SpriteImage; born: number; id: number; color: number }
interface Ring { x: number; y: number; born: number; color: number }
interface Ghost { image: SpriteImage; born: number; id: number; color: number }
interface Timed { born: number }

/** How long each effect lasts (ms). */
export const DURATIONS = { ring: 280, flash: 220, ghost: 160, hurt: 360, shake: 260, pulse: 450, particleMin: 380, particleMax: 820 };

/** A small, seedable random generator (effects are the same each run: testable). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
}

export class EffectsModel {
  private particles: Particle[] = [];
  private flashes: Flash[] = [];
  private rings: Ring[] = [];
  private ghosts: Ghost[] = [];
  private hurts: Timed[] = [];
  private pulses: (Timed & { x: number; y: number; w: number; h: number; color: number })[] = [];
  private glows: { x: number; y: number; r: number }[] = [];
  private nextId = 1;
  private random: () => number;
  /** At most this many particles alive (old ones go first). */
  maxParticles = 600;

  constructor(seed = 64) {
    this.random = rng(seed);
  }

  /** Nothing showing (e.g. the game went to its title, or effects were turned off). */
  clear() {
    this.particles = []; this.flashes = []; this.rings = []; this.ghosts = []; this.hurts = []; this.pulses = []; this.glows = [];
  }

  /** Whether anything is still animating at `t` (the glows set each frame aside). */
  busy(t: number) {
    return this.particles.some((p) => t < p.born + p.life) || this.flashes.some((f) => t < f.born + DURATIONS.flash) || this.rings.some((r) => t < r.born + DURATIONS.ring)
      || this.ghosts.some((g) => t < g.born + DURATIONS.ghost) || this.hurts.some((h) => t < h.born + Math.max(DURATIONS.hurt, DURATIONS.shake))
      || this.pulses.some((p) => t < p.born + DURATIONS.pulse);
  }

  /**
   * An enemy destroyed: its sprite flashes white and breaks into pixels of its own colours,
   * thrown outward from where the blow came from (`from`, optional: else from its middle).
   */
  destroy(t: number, image: SpriteImage, from?: { x: number; y: number }) {
    const lit: number[] = [], count = new Array<number>(16).fill(0);
    for (let i = 0; i < image.pixels.length; i++) if (image.pixels[i] >= 0) { lit.push(i); count[image.pixels[i] & 15]++; }
    // a pale sprite (white, light grey, yellow) flashes yellow, else white; the ring takes its
    // most colourful colour (or yellow)
    const main = count.indexOf(Math.max(...count)), pale = [1, 15, 7, 13].includes(main);
    const vivid = [2, 4, 5, 6, 8, 10, 14, 3].map((c) => [c, count[c]] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
    this.flashes.push({ image, born: t, id: this.nextId++, color: pale ? 0xfff27a : 0xffffff });
    if (!lit.length) return;
    const cx = image.x + image.w / 2, cy = image.y + image.h / 2;
    this.rings.push({ x: cx, y: cy, born: t, color: vivid !== undefined && !pale ? C64_PALETTE[vivid] : 0xfff27a });
    const ox = from?.x ?? cx, oy = from?.y ?? cy;
    const pw = image.wide ? 2 : 1;
    const n = Math.min(90, Math.max(32, lit.length >> 1));
    for (let k = 0; k < n; k++) {
      const i = lit[Math.floor(this.random() * lit.length)];
      const px = image.x + (i % image.w), py = image.y + Math.floor(i / image.w);
      // away from the blow, and out from the middle, with a little upward kick
      let dx = px - ox, dy = py - oy;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const sp = 40 + this.random() * 90; // pixels per second
      const a = (this.random() - 0.5) * 1.2;
      const vx = (dx * Math.cos(a) - dy * Math.sin(a)) * sp, vy = (dx * Math.sin(a) + dy * Math.cos(a)) * sp - 30;
      const chunk = this.random() < 0.3; // (some bigger bits)
      this.addParticle({ x: px, y: py, vx, vy, w: chunk ? 2 : pw, h: chunk ? 2 : 1, color: C64_PALETTE[image.pixels[i] & 15], born: t, life: DURATIONS.particleMin + this.random() * (DURATIONS.particleMax - DURATIONS.particleMin), spark: false });
    }
    // sparks from the middle (yellow among them, so a white enemy's show too)
    for (let k = 0; k < 14; k++) {
      const a = this.random() * Math.PI * 2, sp = 60 + this.random() * 90;
      this.addParticle({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, w: 1, h: 1, color: k % 3 === 0 ? 0xfff27a : 0xffffff, born: t, life: 220 + this.random() * 200, spark: true });
    }
  }

  /** A blow that landed but didn't destroy (a few sparks where it hit). */
  hit(t: number, x: number, y: number, color = 0xffffff) {
    for (let k = 0; k < 8; k++) {
      const a = this.random() * Math.PI * 2, sp = 40 + this.random() * 60;
      this.addParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 15, w: 1, h: 1, color, born: t, life: 160 + this.random() * 160, spark: true });
    }
  }

  /** The weapon as it is this frame (whip, sword, spell): it leaves a fading trail of itself. */
  trail(t: number, image: SpriteImage, color = 0xbfe8ff) {
    this.ghosts.push({ image, born: t, id: this.nextId++, color });
  }

  /** The player hurt: a red flash at the edges of the picture and a small shake. */
  hurt(t: number) {
    this.hurts.push({ born: t });
  }

  /** Draw the eye to part of the picture (e.g. the health shown in the status line). */
  pulse(t: number, box: { x: number; y: number; w: number; h: number }, color = 0xff4040) {
    this.pulses.push({ ...box, born: t, color });
  }

  /** Faint glows under things (e.g. enemies closing in), as they are now (set every frame). */
  setGlows(glows: { x: number; y: number; r: number }[]) {
    this.glows = glows;
  }

  /** How far to shift the picture now (a decaying shake after a hurt), in C64 pixels. */
  shake(t: number) {
    let x = 0, y = 0;
    for (const h of this.hurts) {
      const age = t - h.born;
      if (age < 0 || age >= DURATIONS.shake) continue;
      const k = 1 - age / DURATIONS.shake, amp = 2.2 * k * k;
      x += Math.sin(age / 11 + h.born) * amp;
      y += Math.cos(age / 13 + h.born * 0.7) * amp * 0.6;
    }
    return { x, y };
  }

  /** Where each particle is at `t` (for tests). */
  particlesAt(t: number) {
    return this.particles.filter((p) => t >= p.born && t < p.born + p.life).map((p) => {
      const s = (t - p.born) / 1000;
      return { x: p.x + p.vx * s, y: p.y + p.vy * s + (p.spark ? 40 : 160) * s * s, alpha: 1 - (t - p.born) / p.life, color: p.color, w: p.w, h: p.h };
    });
  }

  /** What to draw at `t`, back to front. Old effects are dropped. */
  drawables(t: number): Drawable[] {
    this.expire(t);
    const out: Drawable[] = [];
    for (const g of this.glows) out.push({ kind: 'glow', x: g.x, y: g.y, r: g.r, color: 0xff5030, alpha: 0.22 });
    for (const g of this.ghosts) {
      const k = (t - g.born) / DURATIONS.ghost;
      if (k < 0 || k >= 1) continue;
      out.push({ kind: 'image', image: g.image, x: g.image.x, y: g.image.y, scale: 1, color: g.color, alpha: 0.55 * (1 - k), add: true, id: g.id });
    }
    for (const r of this.rings) {
      const k = (t - r.born) / DURATIONS.ring;
      if (k < 0 || k >= 1) continue;
      out.push({ kind: 'ring', x: r.x, y: r.y, r: 4 + 22 * Math.sqrt(k), color: r.color, alpha: 0.9 * (1 - k) });
    }
    for (const f of this.flashes) {
      const age = t - f.born;
      if (age < 0 || age >= DURATIONS.flash) continue;
      // full white for the first frames, then fading as it swells a little
      const k = age / DURATIONS.flash, alpha = age < 70 ? 1 : 1 - (age - 70) / (DURATIONS.flash - 70);
      const scale = 1 + 0.25 * k;
      const w = f.image.w * scale, h = f.image.h * scale;
      out.push({ kind: 'image', image: f.image, x: f.image.x + f.image.w / 2 - w / 2, y: f.image.y + f.image.h / 2 - h / 2, scale, color: f.color, alpha, add: false, id: f.id });
    }
    for (const p of this.particlesAt(t)) out.push({ kind: 'rect', x: p.x, y: p.y, w: p.w, h: p.h, color: p.color, alpha: Math.min(1, p.alpha * 1.4), add: false });
    for (const p of this.pulses) {
      const k = (t - p.born) / DURATIONS.pulse;
      if (k < 0 || k >= 1) continue;
      const beat = Math.abs(Math.sin(k * Math.PI * 2)); // twice
      out.push({ kind: 'frame', x: p.x, y: p.y, w: p.w, h: p.h, grow: 1 + 2 * beat, color: p.color, alpha: 0.9 * (1 - k) * (0.4 + 0.6 * beat) });
    }
    for (const h of this.hurts) {
      const k = (t - h.born) / DURATIONS.hurt;
      if (k < 0 || k >= 1) continue;
      out.push({ kind: 'edge', color: 0xff2020, alpha: 0.55 * (1 - k) * (1 - k), width: 22 });
    }
    return out;
  }

  private addParticle(p: Particle) {
    this.particles.push(p);
    if (this.particles.length > this.maxParticles) this.particles.splice(0, this.particles.length - this.maxParticles);
  }

  private expire(t: number) {
    if (this.particles.length) this.particles = this.particles.filter((p) => t < p.born + p.life);
    if (this.flashes.length) this.flashes = this.flashes.filter((f) => t < f.born + DURATIONS.flash);
    if (this.rings.length) this.rings = this.rings.filter((r) => t < r.born + DURATIONS.ring);
    if (this.ghosts.length) this.ghosts = this.ghosts.filter((g) => t < g.born + DURATIONS.ghost);
    if (this.hurts.length) this.hurts = this.hurts.filter((h) => t < h.born + Math.max(DURATIONS.hurt, DURATIONS.shake));
    if (this.pulses.length) this.pulses = this.pulses.filter((p) => t < p.born + DURATIONS.pulse);
  }
}

/**
 * A sprite as the VIC drew it (from a frame capture: its 63 bytes, colours and modes) as a
 * SpriteImage at its place on the screen.
 */
export function spriteImage(s: { x: number; y: number; data: ArrayLike<number>; colour: number; multicolour: boolean; expandX: boolean; expandY: boolean; mc1: number; mc2: number }): SpriteImage {
  const sx = s.expandX ? 2 : 1, sy = s.expandY ? 2 : 1, w = 24 * sx, h = 21 * sy;
  const pixels = new Int8Array(w * h).fill(-1);
  for (let r = 0; r < 21; r++) for (let b = 0; b < 3; b++) {
    const v = s.data[r * 3 + b];
    if (!v) continue;
    for (let i = 0; i < 8; i++) {
      let c = -1;
      if (s.multicolour) { const p = (v >> (6 - (i & 6))) & 3; if (p) c = [0, s.mc1, s.colour, s.mc2][p] & 15; }
      else if (v & (0x80 >> i)) c = s.colour & 15;
      if (c < 0) continue;
      for (let j = 0; j < sy; j++) for (let k = 0; k < sx; k++) pixels[(r * sy + j) * w + (b * 8 + i) * sx + k] = c;
    }
  }
  // (PAL sprite x runs 0-503; higher values are just left of the screen)
  const x = (s.x >= 504 ? s.x - 504 : s.x) - 24, y = s.y - 50;
  return { x, y, w, h, pixels, wide: s.multicolour || s.expandX };
}

/** The middle of a sprite image's lit pixels (where it "is"), or its box's middle if none. */
export function imageCentre(img: SpriteImage) {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < img.pixels.length; i++) if (img.pixels[i] >= 0) { sx += i % img.w; sy += Math.floor(i / img.w); n++; }
  return n ? { x: img.x + sx / n, y: img.y + sy / n } : { x: img.x + img.w / 2, y: img.y + img.h / 2 };
}
