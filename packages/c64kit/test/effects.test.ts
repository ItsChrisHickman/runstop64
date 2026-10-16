/**
 * The combat effects (src/effects.ts) and their sounds (src/sid/sfx.ts), headless:
 * where and how long each effect shows, and that each sound sounds and stops.
 *
 *   npm run test:effects            (EFFECTS_PNG=<dir> also renders frames of each effect to look at)
 */
import fs from 'node:fs';
import { DURATIONS, EffectsModel, imageCentre, spriteImage, type SpriteImage } from '../src/effects';
import { C64_PALETTE } from '../src/palette';
import { PAL_CLOCK, Sid } from '../src/sid/sid';
import { SFX_NAMES, SfxSequencer } from '../src/sid/sfx';
import { rasterise } from './raster';
import { rgbPng } from '../../../tools/probe/render';

let failed = 0, passed = 0;
const check = (ok: boolean, what: string) => { if (ok) passed++; else { failed++; console.log(`FAIL ${what}`); } };

// A multicolour sprite (a blob of three colours) at VIC (124, 100): screen (100, 50).
const data = new Uint8Array(63);
for (let r = 3; r < 18; r++) for (let b = 0; b < 3; b++) data[r * 3 + b] = r < 8 ? 0x55 : r < 13 ? 0xaa : 0xff;
const sprite = { x: 124, y: 100, data, colour: 5, multicolour: true, expandX: false, expandY: false, mc1: 2, mc2: 7 };
const img = spriteImage(sprite);

// ---- the sprite image ----
check(img.x === 100 && img.y === 50 && img.w === 24 && img.h === 21, `sprite image placed at screen (100,50) 24x21 (got ${img.x},${img.y} ${img.w}x${img.h})`);
const lit = [...img.pixels].filter((p) => p >= 0);
check(lit.length === 15 * 24, `every pixel of 15 full rows lit (${lit.length})`);
check(new Set(lit).size === 3 && lit.every((c) => [2, 5, 7].includes(c)), 'multicolour pairs: mc1, colour, mc2');
check(!!img.wide, 'multicolour: wide pixels');
const ex = spriteImage({ ...sprite, multicolour: false, expandX: true, expandY: true, x: 510 });
check(ex.w === 48 && ex.h === 42 && ex.x === 510 - 504 - 24, 'expanded sprite 48x42; x past 503 wraps to the left');
const c = imageCentre(img);
check(Math.abs(c.x - 111.5) < 0.01 && Math.abs(c.y - 60) < 0.01, `centre of the lit pixels (${c.x},${c.y})`);

// ---- destroy: flash and burst ----
{
  const fx = new EffectsModel(7);
  fx.destroy(1000, img, { x: 90, y: 60 });
  const p0 = fx.particlesAt(1000);
  check(p0.length >= 32 && p0.length <= 110, `burst: 32-110 particles (${p0.length})`);
  const sparkWhite = 0xffffff, colours = new Set<number>([2, 5, 7].map((k) => C64_PALETTE[k]));
  check(p0.every((p) => colours.has(p.color) || p.color === sparkWhite || p.color === 0xfff27a), "particles in the sprite's colours (and white and yellow sparks)");
  check(p0.filter((p) => colours.has(p.color)).every((p) => p.x >= img.x && p.x < img.x + img.w && p.y >= img.y && p.y < img.y + img.h), 'particles start on the sprite');
  check(p0.filter((p) => colours.has(p.color)).every((p) => p.w === 2 && (p.h === 1 || p.h === 2)), 'particles are the sprite pixels (2 wide: multicolour), some bigger bits');
  const meanX = (ps: { x: number }[]) => ps.reduce((s, p) => s + p.x, 0) / ps.length;
  const p2 = fx.particlesAt(1200).filter((p) => colours.has(p.color));
  check(meanX(p2) > meanX(p0.filter((p) => colours.has(p.color))) + 5, 'thrown away from the blow (it came from the left: they fly right)');
  const spread = (ps: { x: number; y: number }[]) => ps.reduce((s, p) => s + Math.hypot(p.x - c.x, p.y - c.y), 0) / ps.length;
  check(spread(p2) > spread(p0) + 8, 'the burst spreads out');
  check(fx.particlesAt(1000 + DURATIONS.particleMax).length === 0, `all particles gone after ${DURATIONS.particleMax} ms`);
  const flash = (t: number) => fx.drawables(t).find((d) => d.kind === 'image' && d.color === 0xffffff);
  const f0 = flash(1030);
  check(!!f0 && f0.alpha === 1, 'white flash full at first');
  check(!!f0 && f0.kind === 'image' && Math.abs(f0.x + (f0.image.w * f0.scale) / 2 - (img.x + img.w / 2)) < 0.01, 'flash centred on the sprite');
  const f1 = flash(1150);
  check(!!f1 && f1.alpha > 0 && f1.alpha < 1, 'flash fading');
  check(!flash(1000 + DURATIONS.flash), `flash gone after ${DURATIONS.flash} ms`);
  const ring = (t: number) => fx.drawables(t).find((d) => d.kind === 'ring');
  const r0 = ring(1010);
  check(!!r0 && Math.abs(r0.x - (img.x + img.w / 2)) < 0.01, 'a ring from the middle');
  check((ring(1200)?.r ?? 0) > (ring(1010)?.r ?? 99), 'the ring spreads');
  check(!ring(1000 + DURATIONS.ring), `ring gone after ${DURATIONS.ring} ms`);
  check(!fx.busy(1000 + DURATIONS.particleMax + 1), 'nothing left once it all ends');
  // a white sprite flashes yellow (white on white wouldn't show)
  const white = spriteImage({ ...sprite, multicolour: false, colour: 1 });
  const fw = new EffectsModel();
  fw.destroy(0, white);
  check(fw.drawables(10).some((d) => d.kind === 'image' && d.color !== 0xffffff), 'a white sprite flashes yellow');
}

// ---- hurt: red edge and shake ----
{
  const fx = new EffectsModel();
  fx.hurt(500);
  const edge = (t: number) => fx.drawables(t).find((d) => d.kind === 'edge');
  check((edge(510)?.alpha ?? 0) > 0.45, 'red edge flash at once');
  check((edge(700)?.alpha ?? 1) < (edge(510)?.alpha ?? 0), 'edge fades');
  check(!edge(500 + DURATIONS.hurt), `edge gone after ${DURATIONS.hurt} ms`);
  const fy = new EffectsModel();
  fy.hurt(500);
  let maxShake = 0;
  for (let t = 500; t < 500 + DURATIONS.shake; t += 5) { const s = fy.shake(t); maxShake = Math.max(maxShake, Math.abs(s.x), Math.abs(s.y)); }
  check(maxShake > 0.5 && maxShake <= 2.2, `a small shake (at most ${maxShake.toFixed(2)} px)`);
  const s = fy.shake(500 + DURATIONS.shake);
  check(s.x === 0 && s.y === 0, 'shake over');
}

// ---- trail, pulse, glows, hit ----
{
  const fx = new EffectsModel();
  fx.trail(0, img);
  check(fx.drawables(10).some((d) => d.kind === 'image' && d.add), 'trail ghost drawn (light)');
  check(!fx.drawables(DURATIONS.ghost).some((d) => d.kind === 'image'), `trail ghost gone after ${DURATIONS.ghost} ms`);
  fx.pulse(0, { x: 10, y: 180, w: 40, h: 8 });
  check(fx.drawables(60).some((d) => d.kind === 'frame' && d.x === 10 && d.w === 40), 'pulse around the box');
  check(!fx.drawables(DURATIONS.pulse).some((d) => d.kind === 'frame'), 'pulse over');
  fx.setGlows([{ x: 50, y: 60, r: 14 }]);
  check(fx.drawables(1).filter((d) => d.kind === 'glow').length === 1, 'glows as set');
  fx.setGlows([]);
  check(!fx.drawables(2).some((d) => d.kind === 'glow'), 'glows cleared');
  fx.hit(0, 30, 40);
  const ps = fx.particlesAt(0);
  check(ps.length === 8 && ps.every((p) => p.x === 30 && p.y === 40), 'hit sparks where it landed');
  fx.clear();
  check(!fx.busy(0) && fx.drawables(0).length === 0, 'clear');
}

// ---- sounds ----
{
  const rate = 44100;
  for (const name of SFX_NAMES) {
    const sid = new Sid(rate, PAL_CLOCK);
    const seq = new SfxSequencer((r, v) => sid.write(r, v));
    seq.start(name);
    const frame = new Float32Array(rate / 50);
    const rms: number[] = [];
    let peak = 0, nan = false;
    for (let f = 0; f < 75; f++) { // a second and a half
      seq.frame();
      sid.render(frame);
      let s = 0;
      for (const v of frame) { if (Number.isNaN(v)) nan = true; s += v * v; peak = Math.max(peak, Math.abs(v)); }
      rms.push(Math.sqrt(s / frame.length));
    }
    const loud = rms.map((r, i) => (r > 0.004 ? i : -1)).filter((i) => i >= 0);
    const len = loud.length ? loud[loud.length - 1] + 1 : 0;
    check(!nan && peak > 0.02 && peak < 1, `${name}: sounds, without clipping (peak ${peak.toFixed(3)})`);
    check(len >= 3 && len <= 50, `${name}: lasts ${len} frames (3-50)`);
    check(rms.slice(55).every((r) => r < 0.002), `${name}: silent after`);
  }
  // voices: a kill takes two, a hurt two more: the oldest is taken over
  const writes: number[] = [];
  const seq = new SfxSequencer((r) => writes.push(r));
  seq.start('kill'); seq.frame();
  const k = new Set(writes.filter((r) => r < 21).map((r) => Math.floor(r / 7)));
  check(k.size === 2 && k.has(0) && k.has(1), 'a kill on voices 1 and 2');
  writes.length = 0;
  seq.start('hurt'); seq.frame();
  const firsts = writes.filter((r) => r % 7 === 5).map((r) => Math.floor(r / 7)); // (attack/decay: a program's first step)
  check(firsts.length === 2 && firsts.includes(2) && firsts.includes(0), `a hurt on the free voice and the oldest (${firsts})`);
}

// ---- pictures (to look at) ----
const dir = process.env.EFFECTS_PNG;
if (dir) {
  fs.mkdirSync(dir, { recursive: true });
  const base = new Float32Array(320 * 200 * 3);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) { const o = (y * 320 + x) * 3, v = ((x >> 4) + (y >> 4)) & 1 ? 0.25 : 0.2; base[o] = v; base[o + 1] = v * 0.8; base[o + 2] = v * 0.5; }
  const draw = (im: SpriteImage) => { for (let i = 0; i < im.pixels.length; i++) if (im.pixels[i] >= 0) { const x = im.x + (i % im.w), y = im.y + Math.floor(i / im.w), cc = C64_PALETTE[im.pixels[i]], o = (y * 320 + x) * 3; base[o] = (cc >> 16) / 255; base[o + 1] = ((cc >> 8) & 255) / 255; base[o + 2] = (cc & 255) / 255; } };
  const fx = new EffectsModel(3);
  for (const t of [0, 40, 100, 200, 350, 600]) {
    if (t === 0) { draw(img); fx.destroy(0, img, { x: 90, y: 60 }); fx.hurt(0); fx.pulse(0, { x: 40, y: 182, w: 64, h: 8 }); fx.setGlows([{ x: 220, y: 120, r: 16 }]); }
    const pic = rasterise(t === 0 ? base : new Float32Array(base.length).fill(0.2), fx.drawables(t), 3, fx.shake(t));
    rgbPng(`${dir}/effects-${String(t).padStart(3, '0')}.png`, pic.rgb, pic.W, pic.H, 1);
  }
  console.log(`pictures in ${dir}`);
}

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
