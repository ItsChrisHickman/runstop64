/**
 * Draws an HdScene in software, the way hd/layer.ts draws it with Three.js: for tests, to look at
 * the HD view as PNGs without a browser. The same steps, the same formulas:
 *
 * - the room's quads and the billboards (each sprite pixel a quad facing the viewer), depth-tested,
 *   each lit by `irradiance` (the layer's shader) plus its own glow (a sprite by `spriteLight`);
 * - the shadows (darkening what's under them), then the particles (added, as round soft dots);
 * - after: bloom (what's brighter than the threshold, blurred and added, but not over sprites), depth of field (blurred
 *   by how far from the focus), the edges darkened, exposure, to sRGB;
 * - outside the room's band, the C64's picture as it was; in it, where nothing of the room was drawn
 *   (a gap the tilt or the swing shows), the picture dimmed (the layer draws the room over it), or
 *   as it was where it's what's seen past the room (`open`: a sky): the picture without the sprites,
 *   as the layer's backdrop is (the renderer's screen), so no sprite shows there but its billboard.
 */
import { irradiance, project, spriteLight, surfaceLight, type HdScene, type Rgb } from '../src/hd/scene';
import { TRANSPARENT } from '../src/surface';
import { C64_PALETTE } from '../src/palette';

/**
 * `picture`: the C64's picture (320×200 colour indexes) with its sprites, for outside the band; `behind`:
 * the same without them, behind the room (the layer's backdrop). Returns RGB (0..1 floats) at S times the
 * size (S may be fractional: a phone's picture, 2.65 times the C64's).
 */
export function rasteriseHd(scene: HdScene, picture: Uint8Array, behind: Uint8Array, S = 3) {
  const W = Math.round(320 * S), H = Math.round(200 * S), { band } = scene.room;
  const y0 = Math.round(band.y * S), y1 = Math.round((band.y + band.h) * S);
  const col = new Float32Array(W * H * 3), depth = new Float32Array(W * H).fill(Infinity), wz = new Float32Array(W * H).fill(1e4);
  // (which sprite each pixel shows, or -1: the room or nothing; which of the band's pixels the room's quad there shows, or -1)
  const owner = new Int16Array(W * H).fill(-1), source = new Int32Array(W * H).fill(-1), index = new Uint8Array(W * H);
  // (and which billboard, which of its sprite's pixels, or -1)
  const board = new Int16Array(W * H).fill(-1), pixel = new Int32Array(W * H).fill(-1);
  const m = scene.camera.matrix;

  /** A quad (middle c, half-edges u, v) filled with a colour where it's nearest. */
  const quad = (cx: number, cy: number, cz: number, ux: number, uy: number, uz: number, vx: number, vy: number, vz: number, rgb: Rgb, who = -1, from = -1, colour = 0, b = -1, at = -1, spreads = 0) => {
    const p = [project(m, cx - ux - vx, cy - uy - vy, cz - uz - vz), project(m, cx + ux - vx, cy + uy - vy, cz + uz - vz), project(m, cx + ux + vx, cy + uy + vy, cz + uz + vz), project(m, cx - ux + vx, cy - uy + vy, cz - uz + vz)];
    const d = project(m, cx, cy, cz).depth;
    const xs = p.map((q) => q.x * S), ys = p.map((q) => q.y * S);
    const xa = Math.max(0, Math.floor(Math.min(...xs))), xb = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    const ya = Math.max(y0, Math.floor(Math.min(...ys))), yb = Math.min(y1 - 1, Math.ceil(Math.max(...ys)));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      if (!inside(xs, ys, x + 0.5, y + 0.5)) continue;
      const i = y * W + x;
      if (d >= depth[i]) continue;
      depth[i] = d; wz[i] = cz; owner[i] = who; source[i] = from; index[i] = colour; board[i] = b; pixel[i] = at; air[i] = spreads;
      col[i * 3] = rgb[0]; col[i * 3 + 1] = rgb[1]; col[i * 3 + 2] = rgb[2];
    }
  };
  const irr: Rgb = [0, 0, 0], lit: Rgb = [0, 0, 0];
  // (where light may spread through the air, bloom and shafts: over what the game draws in a colour, not black, nor a sprite standing)
  const air = new Uint8Array(W * H);
  // the room
  const s = scene.room.surface;
  for (let c = 0; c < s.count; c++) {
    const o = c * 3, x = s.centre[o] + scene.room.shift, y = s.centre[o + 1], z = s.centre[o + 2];
    surfaceLight(scene, [s.colour[o], s.colour[o + 1], s.colour[o + 2]], s.occlusion[c], x, y, z, s.normal[o], s.normal[o + 1], s.normal[o + 2], lit);
    const g = scene.glow, rgb: Rgb = [lit[0] + s.glow[o] * g, lit[1] + s.glow[o + 1] * g, lit[2] + s.glow[o + 2] * g];
    quad(x, y, z, s.u[o], s.u[o + 1], s.u[o + 2], s.v[o], s.v[o + 1], s.v[o + 2], rgb, -1, s.source[c], 0, -1, -1, Math.max(s.colour[o], s.colour[o + 1], s.colour[o + 2]) > 0 ? 1 : 0);
  }
  // the billboards: lit as quads facing the viewer (the layer's billboard shader); a patch of the floor
  // lying on it, lit as the floor (with the room: the sprites standing are drawn after the softened
  // copy is taken, `standing`)
  const sprites = (standing: boolean) => { for (const [bi, b] of scene.billboards.entries()) {
    if (!b.flat !== standing) continue;
    const sp = b.sprite;
    for (let py = 0; py < sp.h; py++) for (let px = 0; px < sp.w; px++) {
      const v = sp.pixels[py * sp.w + px];
      if (v === TRANSPARENT) continue;
      const c = linear(v), fx = (px + 0.5) * (b.w / sp.w), fy = (py + 0.5) * (b.h / sp.h);
      if (b.flat) {
        const x = b.x + fx + fy, y = b.y, z = b.z - fy, k = irradiance(scene, x, y, z, 0, 1, 0, irr);
        quad(x, y, z, 0.5 * (b.w / sp.w), 0, 0, -0.5 * (b.h / sp.h), 0, 0.5 * (b.h / sp.h), [c[0] * k[0], c[1] * k[1], c[2] * k[2]], sp.n, -1, v & 15, bi, py * sp.w + px, Math.max(...c) > 0 ? 1 : 0);
        continue;
      }
      const x = b.x + fx, y = b.y - fy, z = b.z;
      const k = spriteLight(scene.sprites, irradiance(scene, x, y, z, 0, 0, -1, irr));
      quad(x, y, z, 0.5 * (b.w / sp.w), 0, 0, 0, 0.5 * (b.h / sp.h), 0, [c[0] * k[0], c[1] * k[1], c[2] * k[2]], sp.n, -1, v & 15, bi, py * sp.w + px);
    }
  } };
  sprites(false);
  // shadows: ellipses lying on the floor, darkening what's there (fading to their edge)
  for (const sh of scene.shadows) {
    const n = 12;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const fx = (a + 0.5) / n * 2 - 1, fz = (b + 0.5) / n * 2 - 1, r = Math.hypot(fx, fz);
      if (r >= 1) continue;
      const k = sh.alpha * (1 - r * r);
      const p = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([du, dv]) => project(m, sh.x + (fx + du / n) * sh.rx, sh.y, sh.z + (fz + dv / n) * sh.rz));
      const xs = p.map((q) => q.x * S), ys = p.map((q) => q.y * S), d = project(m, sh.x + fx * sh.rx, sh.y, sh.z + fz * sh.rz).depth;
      for (let y = Math.max(y0, Math.floor(Math.min(...ys))); y <= Math.min(y1 - 1, Math.ceil(Math.max(...ys))); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.ceil(Math.max(...xs))); x++) {
          const i = y * W + x;
          if (!inside(xs, ys, x + 0.5, y + 0.5) || d > depth[i] + 0.002) continue;
          for (let q = 0; q < 3; q++) col[i * 3 + q] *= 1 - k;
        }
      }
    }
  }
  // behind the room (the layer's backdrop, drawn first): the C64's picture, where nothing of the room
  // was drawn dimmed (a gap the camera opens), as it is where it's what's seen past the room (a sky);
  // as far away as can be, light spreading over it where it's drawn in a colour
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (depth[i] !== Infinity) continue;
    const px = Math.floor(x / S), py = Math.floor(y / S), ox = Math.floor(px - scene.room.shift), at = (py - band.y) * 320 + ox;
    const open = ox >= 0 && ox < 320 && s.open[at] === 1, c = linear(behind[py * 320 + px]), k = open ? 1 : scene.post.backdrop;
    col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
    air[i] = Math.max(...c) > 0 ? 1 : 0;
  }
  // particles: soft round dots, added, behind what's nearer, only where light may spread (the layer
  // blends them by the target's alpha)
  for (const pt of scene.particles) {
    const p = project(m, pt.x, pt.y, pt.z), r = (pt.size * S) / p.w;
    for (let y = Math.max(y0, Math.floor(p.y * S - r)); y <= Math.min(y1 - 1, Math.ceil(p.y * S + r)); y++) {
      for (let x = Math.max(0, Math.floor(p.x * S - r)); x <= Math.min(W - 1, Math.ceil(p.x * S + r)); x++) {
        const i = y * W + x, d = Math.hypot(x + 0.5 - p.x * S, y + 0.5 - p.y * S) / Math.max(0.5, r);
        if (d >= 1 || p.depth > depth[i]) continue;
        const k = (1 - d) * (1 - d);
        for (let q = 0; q < 3; q++) col[i * 3 + q] += pt.colour[q] * k * air[i];
      }
    }
  }
  const post = scene.post;
  // (the room drawn black: no light spreads over it, but softened among colours)
  let covered = depth.map((d) => (d === Infinity ? 0 : 1));
  const roomBlack = (i: number) => !air[i] && covered[i] === 1 && (owner[i] < 0 || scene.billboards[board[i]].flat === true);
  // the softened copy for the depth of field and the tilt-shift, taken before the sprites standing in
  // the room are drawn (the layer's): no sprite is ever smeared, nor smeared round itself; and its
  // alpha, the layer's: how much of what's round a pixel light can spread over, the room drawn black a
  // quarter (the scene target's alpha); a thin black line among colours is softened with them, inside
  // a black area nothing is
  const soft = blur(col, W, H, post.dof.blur * S), mask = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) mask[i * 3] = air[i] ? 1 : roomBlack(i) ? ROOM_BLACK : 0;
  const softAir = blur(mask, W, H, post.dof.blur * S);
  // the sprites standing in the room, over it (nearer than what's there)
  sprites(true);
  covered = depth.map((d) => (d === Infinity ? 0 : 1));
  // after: bloom, depth of field, vignette, exposure (the layer's composite shader)
  const bright = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let q = 0; q < 3; q++) bright[i * 3 + q] = Math.max(0, col[i * 3 + q] - post.bloom.threshold);
  const bloom = blur(bright, W, H, post.bloom.radius * S);
  // light shafts: what's brightest (the flames), at half size, smeared out from each light (the layer's rays passes)
  const hw = W >> 1, hh = H >> 1, half = new Float32Array(hw * hh * 3);
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) for (let q = 0; q < 3; q++) {
    const a = ((y * 2) * W + x * 2) * 3 + q;
    half[(y * hw + x) * 3 + q] = Math.max(0, (col[a] + col[a + 3] + col[a + W * 3] + col[a + W * 3 + 3]) / 4 - post.rays.threshold);
  }
  const rays = shafts(blur(half, hw, hh, SHAFT_SOFT), hw, hh,scene.rays.map((r) => ({ x: r.x / 320, y: r.y / 200, k: r.k })), post.rays.length);
  const out = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // (outside the band, the C64's picture)
    if (y < y0 || y >= y1) {
      const c = C64_PALETTE[picture[Math.floor(y / S) * 320 + Math.floor(x / S)] & 15];
      out[i * 3] = (c >> 16) / 255; out[i * 3 + 1] = ((c >> 8) & 255) / 255; out[i * 3 + 2] = (c & 255) / 255;
      continue;
    }
    // (blur, bloom and shafts only over what the game draws in a colour, where light can spread: the
    // layer's scene target's alpha; not over a sprite standing, and black stays black)
    const f = focus(post, wz[i], y / S, scene.camera, band.h) * softens(air[i], softAir[i * 3], roomBlack(i));
    const ex = (x / W - 0.5) * 2, ey = ((y - y0) / (y1 - y0) - 0.5) * 2, vig = 1 - post.vignette * Math.min(1, (ex * ex + ey * ey) * 0.5);
    const h = (Math.min(hh - 1, y >> 1) * hw + Math.min(hw - 1, x >> 1)) * 3;
    for (let q = 0; q < 3; q++) {
      const v = (col[i * 3 + q] * (1 - f) + soft[i * 3 + q] * f + air[i] * (bloom[i * 3 + q] * post.bloom.strength + rays[h + q] * post.rays.strength)) * vig * post.exposure;
      out[i * 3 + q] = toSrgb(tonemap(v));
    }
  }
  // (by pixel: `covered`, whether something of the room was drawn there; `sprite`, which sprite, or -1,
  // and `index` its pixel's colour, `board` which billboard and `pixel` which of its sprite's pixels;
  // `source`, the pixel of the band (as it was built: surface.source) the room's quad there shows, or -1)
  return { rgb: out, W, H, covered, sprite: owner, index, board, pixel, source };
}

/** How out of focus a pixel is (0..1, the layer's composite): by its depth from the focus, or (the tilt-shift) by how far above or below the focus line it is. */
export function focus(post: HdScene['post'], z: number, y: number, camera: HdScene['camera'], bandH: number) {
  const d = post.dof, byDepth = Math.min(1, Math.abs(z - camera.focus) / d.range);
  const byLine = Math.min(1, Math.max(0, (Math.abs(y - camera.line) / bandH - d.sharp) / d.ramp));
  return Math.max(byDepth, byLine);
}

/**
 * How much of the softened copy a pixel takes, out of focus (the layer's composite): all over a colour;
 * the room drawn black (`room`) only among colours (`round`: the softened air round it: a thin line);
 * none behind the room, nor a sprite standing.
 */
export const ROOM_BLACK = 0.25;
export function softens(air: number, round: number, room: boolean) {
  if (air >= 1) return 1;
  if (!room) return 0;
  const t = Math.min(1, Math.max(0, (round - 0.5) / 0.3));
  return t * t * (3 - 2 * t);
}

/** How many samples along a shaft (the layer's rays pass), and how soft what they're smeared from (sigma, the half-size picture's pixels: no copies of it along the way). */
export const SHAFT_SAMPLES = 24, SHAFT_SOFT = 3;

/**
 * Light shafts (the layer's rays pass): for each pixel of `src` (RGB, w × h), each light (uv: x right,
 * y down) adds what's bright along the way towards it, out to `length` of the way, fading.
 */
export function shafts(src: Float32Array, w: number, h: number, lights: { x: number; y: number; k: number }[], length: number) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w, v = (y + 0.5) / h, o = (y * w + x) * 3;
    for (const l of lights) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < SHAFT_SAMPLES; j++) {
        const t = (j / SHAFT_SAMPLES) * length, fade = 1 - j / SHAFT_SAMPLES;
        const sx = Math.min(w - 1, Math.max(0, Math.floor((u + (l.x - u) * t) * w))), sy = Math.min(h - 1, Math.max(0, Math.floor((v + (l.y - v) * t) * h)));
        const p = (sy * w + sx) * 3;
        r += src[p] * fade; g += src[p + 1] * fade; b += src[p + 2] * fade;
      }
      const k = l.k / SHAFT_SAMPLES;
      out[o] += r * k; out[o + 1] += g * k; out[o + 2] += b * k;
    }
  }
  return out;
}

/** The tone curve (the layer's): linear to 1, then easing off so lights don't clip hard. */
export function tonemap(v: number) { return v <= 0.8 ? v : 0.8 + 0.2 * (1 - Math.exp(-(v - 0.8) / 0.2)); }
function toSrgb(c: number) { return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055; }
function linear(index: number): Rgb {
  const c = C64_PALETTE[index & 15], f = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return [f(c >> 16), f((c >> 8) & 255), f(c & 255)];
}

/** Whether (x, y) is inside a convex quad (either winding). */
function inside(xs: number[], ys: number[], x: number, y: number) {
  let pos = false, neg = false;
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) & 3, c = (xs[j] - xs[k]) * (y - ys[k]) - (ys[j] - ys[k]) * (x - xs[k]);
    if (c > 0) pos = true; else if (c < 0) neg = true;
  }
  return !(pos && neg);
}

/** A gaussian blur (sigma in pixels), separable. */
export function blur(src: Float32Array, W: number, H: number, sigma: number) {
  if (sigma < 0.3) return src.slice();
  const r = Math.ceil(sigma * 2.5), k: number[] = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); sum += v; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let q = 0; q < 3; q++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += src[(y * W + Math.min(W - 1, Math.max(0, x + i))) * 3 + q] * k[i + r];
    tmp[(y * W + x) * 3 + q] = a;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let q = 0; q < 3; q++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += tmp[(Math.min(H - 1, Math.max(0, y + i)) * W + x) * 3 + q] * k[i + r];
    out[(y * W + x) * 3 + q] = a;
  }
  return out;
}
