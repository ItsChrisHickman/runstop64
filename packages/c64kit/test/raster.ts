/**
 * Draws an EffectsModel's drawables in software, the way effects-layer.ts draws them with
 * Three.js, over a picture: for tests, to look at effects as PNGs without a browser.
 */
import type { Drawable } from '../src/effects';

/**
 * `base`: the picture (320x200 RGB floats, 0..1); returns it at `S` times the size with the
 * effects drawn over it, shifted by `shake` (C64 pixels) as the renderer's camera shifts it.
 */
export function rasterise(base: Float32Array, list: Drawable[], S = 3, shake = { x: 0, y: 0 }) {
  const W = 320 * S, H = 200 * S, out = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / S - shake.x), sy = Math.floor(y / S - shake.y);
    if (sx < 0 || sy < 0 || sx >= 320 || sy >= 200) continue;
    const i = (sy * 320 + sx) * 3, o = (y * W + x) * 3;
    out[o] = base[i]; out[o + 1] = base[i + 1]; out[o + 2] = base[i + 2];
  }
  const rgb = (c: number) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  const blend = (x: number, y: number, c: number[], a: number, add: boolean) => {
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const o = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) out[o + k] = add ? Math.min(1, out[o + k] + c[k] * a) : out[o + k] * (1 - a) + c[k] * a;
  };
  // (in C64 pixels, shifted with the picture)
  const fill = (x: number, y: number, w: number, h: number, c: number[], a: number, add: boolean) => {
    const x0 = Math.round((x + shake.x) * S), y0 = Math.round((y + shake.y) * S), x1 = Math.round((x + w + shake.x) * S), y1 = Math.round((y + h + shake.y) * S);
    for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++) for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) blend(xx, yy, c, a, add);
  };
  for (const d of list) {
    if (d.kind === 'rect') fill(d.x, d.y, d.w, d.h, rgb(d.color), d.alpha, d.add);
    else if (d.kind === 'frame') {
      const g = d.grow, c = rgb(d.color);
      fill(d.x - g, d.y - g, d.w + 2 * g, 1, c, d.alpha, true); fill(d.x - g, d.y + d.h + g - 1, d.w + 2 * g, 1, c, d.alpha, true);
      fill(d.x - g, d.y - g, 1, d.h + 2 * g, c, d.alpha, true); fill(d.x + d.w + g - 1, d.y - g, 1, d.h + 2 * g, c, d.alpha, true);
    } else if (d.kind === 'image') {
      const c = rgb(d.color), img = d.image, s = d.scale;
      for (let py = 0; py < img.h; py++) for (let px = 0; px < img.w; px++) if (img.pixels[py * img.w + px] >= 0) fill(d.x + px * s, d.y + py * s, s, s, c, d.alpha, d.add);
    } else if (d.kind === 'glow') {
      const c = rgb(d.color);
      for (let yy = -d.r; yy <= d.r; yy += 1 / S) for (let xx = -d.r; xx <= d.r; xx += 1 / S) {
        const k = Math.max(0, 1 - Math.hypot(xx, yy) / d.r) ** 2;
        blend(Math.round((d.x + xx + shake.x) * S), Math.round((d.y + yy + shake.y) * S), c, d.alpha * k, true);
      }
    } else if (d.kind === 'ring') {
      const c = rgb(d.color);
      for (let a = 0; a < 360; a += 1.5) { const x = d.x + Math.cos((a * Math.PI) / 180) * d.r, y = d.y + Math.sin((a * Math.PI) / 180) * d.r; fill(x - 0.5, y - 0.5, 1, 1, c, d.alpha, true); }
    } else if (d.kind === 'edge') {
      const c = rgb(d.color);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = x / S, py = y / S, dist = Math.min(px, 320 - px, py, 200 - py);
        blend(x, y, c, d.alpha * Math.pow(Math.max(0, 1 - dist / d.width), 1.6), false);
      }
    }
  }
  return { rgb: out, W, H };
}
