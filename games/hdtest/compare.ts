/**
 * The HD GPU test page's numbers (hdtest.html), plain arithmetic on pixels, no GL: the WebGL canvas
 * read back, sampled where the software renderer's picture has its pixels, set against that picture.
 * Everything is over the room's band (outside it both show the C64's picture as it is).
 */
import { bandRows } from '../../packages/c64kit/src/hd/layer';

/** An RGBA picture, rows top down (a 2D canvas's ImageData, or the GL's read back turned the right way up). */
export interface Rgba { data: Uint8Array | Uint8ClampedArray; w: number; h: number }

/** Where the 320×200 picture is on the GL canvas, in its device pixels from its top left (x, y), a C64 pixel `scale` across. */
export interface PictureView { x: number; y: number; scale: number }

/**
 * The GL's read back (`readPixels`: rows bottom up, the canvas's w × h) sampled at each pixel of a
 * w × h picture of the 320×200 picture (as the software renderer drew it): at each of its pixels'
 * middles, where `view` puts that point on the canvas.
 */
export function sampleCanvas(gl: Rgba, view: PictureView, w: number, h: number): Rgba {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const cy = ((y + 0.5) * 200) / h, dy = Math.floor(view.y + cy * view.scale), row = gl.h - 1 - Math.min(gl.h - 1, Math.max(0, dy));
    for (let x = 0; x < w; x++) {
      const cx = ((x + 0.5) * 320) / w, dx = Math.min(gl.w - 1, Math.max(0, Math.floor(view.x + cx * view.scale)));
      const i = (row * gl.w + dx) * 4, o = (y * w + x) * 4;
      out[o] = gl.data[i]; out[o + 1] = gl.data[i + 1]; out[o + 2] = gl.data[i + 2]; out[o + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** Luminance (0..1) of a pixel of sRGB bytes, as the tests measure it. */
const luma = (d: Uint8Array | Uint8ClampedArray, i: number) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

export interface Brightness { mean: number; p50: number; p95: number; p99: number; bright: number }

/** How bright a picture's band is: its mean luminance, the median and the brightest 5% and 1% (where the bloom shows), and the share over 0.8. */
export function brightness(p: Rgba, band: { y: number; h: number }): Brightness {
  const { top, bottom } = bandRows(band, p.h), v: number[] = [];
  for (let y = top; y < bottom; y++) for (let x = 0; x < p.w; x++) v.push(luma(p.data, (y * p.w + x) * 4));
  if (!v.length) return { mean: 0, p50: 0, p95: 0, p99: 0, bright: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / v.length, bright = v.filter((l) => l > 0.8).length / v.length;
  v.sort((a, b) => a - b);
  const at = (q: number) => v[Math.min(v.length - 1, Math.floor(v.length * q))];
  return { mean, p50: at(0.5), p95: at(0.95), p99: at(0.99), bright };
}

/**
 * How far the GL's picture is from the software one over the band (the same size: `sampleCanvas`'s):
 * the mean absolute difference in luminance and the mean signed one (GL minus software: below 0, the GL
 * darker), and per channel; and a heat map `w` wide (the band's shape): each cell the mean signed
 * difference there, red where the GL is brighter, blue where darker, full at `full`.
 */
export function difference(gl: Rgba, sw: Rgba, band: { y: number; h: number }, w = 320, full = 0.25) {
  if (gl.w !== sw.w || gl.h !== sw.h) throw new Error(`pictures of different sizes (${gl.w}×${gl.h}, ${sw.w}×${sw.h})`);
  const { top, bottom } = bandRows(band, sw.h), h = Math.max(1, Math.round((w * (bottom - top)) / sw.w));
  const sum = new Float64Array(w * h), n = new Float64Array(w * h), channel = [0, 0, 0];
  let abs = 0, signed = 0, count = 0;
  for (let y = top; y < bottom; y++) for (let x = 0; x < sw.w; x++) {
    const i = (y * sw.w + x) * 4, d = luma(gl.data, i) - luma(sw.data, i);
    abs += Math.abs(d); signed += d; count++;
    for (let c = 0; c < 3; c++) channel[c] += (gl.data[i + c] - sw.data[i + c]) / 255;
    const cell = Math.min(h - 1, Math.floor(((y - top) * h) / (bottom - top))) * w + Math.min(w - 1, Math.floor((x * w) / sw.w));
    sum[cell] += d; n[cell]++;
  }
  const heat = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const d = n[i] ? sum[i] / n[i] : 0, k = Math.min(1, Math.abs(d) / full) * 255;
    heat[i * 4] = d > 0 ? k : 0; heat[i * 4 + 1] = k * 0.35; heat[i * 4 + 2] = d < 0 ? k : 0; heat[i * 4 + 3] = 255;
  }
  const c = Math.max(1, count);
  return { abs: abs / c, signed: signed / c, rgb: channel.map((v) => v / c), heat: { data: heat, w, h } };
}

/** Frame times (ms): the mean, the 95th percentile and the worst. */
export function timings(ms: number[]) {
  if (!ms.length) return { mean: 0, p95: 0, worst: 0 };
  const s = [...ms].sort((a, b) => a - b);
  return { mean: ms.reduce((a, b) => a + b, 0) / ms.length, p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], worst: s[s.length - 1] };
}
