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
import { check, finish } from '../../../games/shared/test/check';


// A multicolour sprite (a blob of three colours) at VIC (124, 100): screen (100, 50).
const data = new Uint8Array(63);
for (let r = 3; r < 18; r++) for (let b = 0; b < 3; b++) data[r * 3 + b] = r < 8 ? 0x55 : r < 13 ? 0xaa : 0xff;
const sprite = { x: 124, y: 100, data, colour: 5, multicolour: true, expandX: false, expandY: false, mc1: 2, mc2: 7 };
const img = spriteImage(sprite);

// ---- the sprite image ----
check(`sprite image placed at screen (100,50) 24x21 (got ${img.x},${img.y} ${img.w}x${img.h})`, img.x === 100 && img.y === 50 && img.w === 24 && img.h === 21);
const lit = [...img.pixels].filter((p) => p >= 0);
check(`every pixel of 15 full rows lit (${lit.length})`, lit.length === 15 * 24);
check('multicolour pairs: mc1, colour, mc2', new Set(lit).size === 3 && lit.every((c) => [2, 5, 7].includes(c)));
check('multicolour: wide pixels', !!img.wide);
const ex = spriteImage({ ...sprite, multicolour: false, expandX: true, expandY: true, x: 510 });
check('expanded sprite 48x42; x past 503 is left of the screen', ex.w === 48 && ex.h === 42 && ex.x < 0);
const c = imageCentre(img);
check(`centre of the lit pixels (${c.x},${c.y})`, Math.abs(c.x - 111.5) < 0.01 && Math.abs(c.y - 60) < 0.01);

// ---- destroy: flash and burst ----
{
  const fx = new EffectsModel(7);
  fx.destroy(1000, img, { x: 90, y: 60 });
  const p0 = fx.particlesAt(1000);
  check(`burst: 32-110 particles (${p0.length})`, p0.length >= 32 && p0.length <= 110);
  const sparkWhite = 0xffffff, colours = new Set<number>([2, 5, 7].map((k) => C64_PALETTE[k]));
  check("particles in the sprite's colours (and white and yellow sparks)", p0.every((p) => colours.has(p.color) || p.color === sparkWhite || p.color === 0xfff27a));
  check('particles start on the sprite', p0.filter((p) => colours.has(p.color)).every((p) => p.x >= img.x && p.x < img.x + img.w && p.y >= img.y && p.y < img.y + img.h));
  check('particles are the sprite pixels (2 wide: multicolour), some bigger bits', p0.filter((p) => colours.has(p.color)).every((p) => p.w === 2 && (p.h === 1 || p.h === 2)));
  const meanX = (ps: { x: number }[]) => ps.reduce((s, p) => s + p.x, 0) / ps.length;
  const p2 = fx.particlesAt(1200).filter((p) => colours.has(p.color));
  check('thrown away from the blow (it came from the left: they fly right)', meanX(p2) > meanX(p0.filter((p) => colours.has(p.color))) + 5);
  const spread = (ps: { x: number; y: number }[]) => ps.reduce((s, p) => s + Math.hypot(p.x - c.x, p.y - c.y), 0) / ps.length;
  check('the burst spreads out', spread(p2) > spread(p0) + 8);
  check(`all particles gone after ${DURATIONS.particleMax} ms`, fx.particlesAt(1000 + DURATIONS.particleMax).length === 0);
  const flash = (t: number) => fx.drawables(t).find((d) => d.kind === 'image' && d.color === 0xffffff);
  const f0 = flash(1030);
  check('white flash full at first', !!f0 && f0.alpha === 1);
  check('flash centred on the sprite', !!f0 && f0.kind === 'image' && Math.abs(f0.x + (f0.image.w * f0.scale) / 2 - (img.x + img.w / 2)) < 0.01);
  const f1 = flash(1150);
  check('flash fading', !!f1 && f1.alpha > 0 && f1.alpha < 1);
  check(`flash gone after ${DURATIONS.flash} ms`, !flash(1000 + DURATIONS.flash));
  const ring = (t: number) => fx.drawables(t).find((d) => d.kind === 'ring');
  const r0 = ring(1010);
  check('a ring from the middle', !!r0 && Math.abs(r0.x - (img.x + img.w / 2)) < 0.01);
  check('the ring spreads', (ring(1200)?.r ?? 0) > (ring(1010)?.r ?? 99));
  check(`ring gone after ${DURATIONS.ring} ms`, !ring(1000 + DURATIONS.ring));
  check('nothing left once it all ends', !fx.busy(1000 + DURATIONS.particleMax + 1));
  // a white sprite flashes yellow (white on white wouldn't show)
  const white = spriteImage({ ...sprite, multicolour: false, colour: 1 });
  const fw = new EffectsModel();
  fw.destroy(0, white);
  check('a white sprite flashes yellow', fw.drawables(10).some((d) => d.kind === 'image' && d.color !== 0xffffff));
}

// ---- hurt: red edge and shake ----
{
  const fx = new EffectsModel();
  fx.hurt(500);
  const edge = (t: number) => fx.drawables(t).find((d) => d.kind === 'edge');
  check('red edge flash at once', (edge(510)?.alpha ?? 0) > 0.45);
  check('edge fades', (edge(700)?.alpha ?? 1) < (edge(510)?.alpha ?? 0));
  check(`edge gone after ${DURATIONS.hurt} ms`, !edge(500 + DURATIONS.hurt));
  const fy = new EffectsModel();
  fy.hurt(500);
  let maxShake = 0;
  for (let t = 500; t < 500 + DURATIONS.shake; t += 5) { const s = fy.shake(t); maxShake = Math.max(maxShake, Math.abs(s.x), Math.abs(s.y)); }
  check(`a small shake (at most ${maxShake.toFixed(2)} px)`, maxShake > 0.5 && maxShake <= 2.2);
  const s = fy.shake(500 + DURATIONS.shake);
  check('shake over', s.x === 0 && s.y === 0);
}

// ---- trail, pulse, glows, hit ----
{
  const fx = new EffectsModel();
  fx.trail(0, img);
  check('trail ghost drawn (light)', fx.drawables(10).some((d) => d.kind === 'image' && d.add));
  check(`trail ghost gone after ${DURATIONS.ghost} ms`, !fx.drawables(DURATIONS.ghost).some((d) => d.kind === 'image'));
  fx.pulse(0, { x: 10, y: 180, w: 40, h: 8 });
  check('pulse around the box', fx.drawables(60).some((d) => d.kind === 'frame' && d.x === 10 && d.w === 40));
  check('pulse over', !fx.drawables(DURATIONS.pulse).some((d) => d.kind === 'frame'));
  fx.setGlows([{ x: 50, y: 60, r: 14 }]);
  check('glows as set', fx.drawables(1).filter((d) => d.kind === 'glow').length === 1);
  fx.setGlows([]);
  check('glows cleared', !fx.drawables(2).some((d) => d.kind === 'glow'));
  fx.hit(0, 30, 40);
  const ps = fx.particlesAt(0);
  check('hit sparks where it landed', ps.length === 8 && ps.every((p) => p.x === 30 && p.y === 40));
  fx.clear();
  check('clear', !fx.busy(0) && fx.drawables(0).length === 0);
}

// ---- sprite images: each expansion alone, an empty one ----
{
  const hires = { ...sprite, multicolour: false };
  const base = spriteImage(hires), litCount = (i: SpriteImage) => [...i.pixels].filter((p) => p >= 0).length;
  const x = spriteImage({ ...hires, expandX: true }), y = spriteImage({ ...hires, expandY: true });
  check(`expandX alone: ${x.w}x${x.h}, every lit pixel twice as wide`, x.w === 48 && x.h === 21 && litCount(x) === litCount(base) * 2 && !!x.wide);
  check(`expandY alone: ${y.w}x${y.h}, every lit pixel twice as tall`, y.w === 24 && y.h === 42 && litCount(y) === litCount(base) * 2 && !y.wide);
  check('a sprite at x 510 is drawn where one at x 6 is', spriteImage({ ...hires, x: 510 }).x === spriteImage({ ...hires, x: 6 }).x);
  const empty: SpriteImage = { x: 10, y: 20, w: 24, h: 21, pixels: new Int8Array(24 * 21).fill(-1) };
  const mid = imageCentre(empty);
  check('an empty image is centred on its box', mid.x === 22 && mid.y === 30.5);
}

// ---- destroy: the colours, the cap, the seed, an empty sprite, no direction ----
{
  /** A blob of one colour, or of several in the given proportions (colour: pixel count). */
  const blob = (counts: Record<number, number>): SpriteImage => {
    const pixels = new Int8Array(24 * 21).fill(-1);
    let at = 0;
    for (const [colour, n] of Object.entries(counts)) for (let k = 0; k < n; k++) pixels[at++] = Number(colour);
    return { x: 100, y: 50, w: 24, h: 21, pixels };
  };
  const YELLOW = 0xfff27a, WHITE = 0xffffff;
  // pale sprites (white, yellow, light green, light grey) flash yellow; the others white
  const PALE = [1, 7, 13, 15], VIVID = [2, 3, 4, 5, 6, 8, 10, 14], DULL = [0, 9, 11, 12];
  const looks = (img: SpriteImage) => {
    const fx = new EffectsModel();
    fx.destroy(0, img);
    const ds = fx.drawables(10);
    return { flash: ds.find((d) => d.kind === 'image')?.color, ring: ds.find((d) => d.kind === 'ring')?.color };
  };
  for (const c of PALE) { const l = looks(blob({ [c]: 20 })); check(`colour ${c}: a yellow flash and ring`, l.flash === YELLOW && l.ring === YELLOW); }
  for (const c of VIVID) { const l = looks(blob({ [c]: 20 })); check(`colour ${c}: a white flash and a ring in its colour`, l.flash === WHITE && l.ring === C64_PALETTE[c]); }
  for (const c of DULL) { const l = looks(blob({ [c]: 20 })); check(`colour ${c}: a white flash and a yellow ring`, l.flash === WHITE && l.ring === YELLOW); }
  check('a mixed sprite: the ring takes its most frequent vivid colour', looks(blob({ 2: 6, 5: 9, 6: 3 })).ring === C64_PALETTE[5]);
  check('a mixed sprite with a vivid main colour and a little white is not pale', looks(blob({ 2: 10, 1: 4 })).flash === WHITE);
  const paleMain = looks(blob({ 1: 10, 2: 4 }));
  check('a mostly white sprite with a little red is pale: yellow flash and ring', paleMain.flash === YELLOW && paleMain.ring === YELLOW);

  const none: SpriteImage = { x: 100, y: 50, w: 24, h: 21, pixels: new Int8Array(24 * 21).fill(-1) };
  const fxNone = new EffectsModel();
  fxNone.destroy(0, none);
  check('an empty sprite flashes but bursts nothing', fxNone.particlesAt(10).length === 0 && fxNone.drawables(10).filter((d) => d.kind === 'image').length === 1 && !fxNone.drawables(10).some((d) => d.kind === 'ring'));

  const big = blob({ 5: 24 * 21 });
  const capped = new EffectsModel();
  capped.maxParticles = 50;
  capped.destroy(0, big);
  const kept = capped.particlesAt(0);
  check(`maxParticles: only the newest ${kept.length} stay (50): the closing sparks among them`, kept.length === 50 && kept.filter((p) => p.color === WHITE || p.color === YELLOW).length === 14);

  const burst = (seed: number) => { const fx = new EffectsModel(seed); fx.destroy(0, big); return JSON.stringify(fx.particlesAt(100)); };
  check('the same seed gives the same burst, another seed a different one', burst(5) === burst(5) && burst(5) !== burst(6));

  // with no direction given the particles leave the middle every way: no drift to a side
  const fx = new EffectsModel(3);
  fx.destroy(0, big);
  const p0 = fx.particlesAt(0), p1 = fx.particlesAt(300);
  const mean = (ps: { x: number }[]) => ps.reduce((s, p) => s + p.x, 0) / ps.length;
  const reach = (ps: { x: number; y: number }[]) => ps.reduce((s, p) => s + Math.hypot(p.x - 112, p.y - 60.5), 0) / ps.length;
  check('no blow direction: the burst spreads out from the middle without drifting aside', Math.abs(mean(p1) - mean(p0)) < 4 && reach(p1) > reach(p0) + 8);
}

// ---- busy, for each kind of effect ----
{
  const ends: [string, number, (fx: EffectsModel) => void][] = [
    ['hurt', Math.max(DURATIONS.hurt, DURATIONS.shake), (fx) => fx.hurt(0)],
    ['pulse', DURATIONS.pulse, (fx) => fx.pulse(0, { x: 0, y: 0, w: 8, h: 8 })],
    ['trail', DURATIONS.ghost, (fx) => fx.trail(0, img)],
    ['hit', 0, (fx) => fx.hit(0, 5, 5)],
  ];
  for (const [name, end, start] of ends) {
    const fx = new EffectsModel();
    check(`${name}: not busy before it starts`, !fx.busy(0));
    start(fx);
    if (end > 0) check(`${name}: busy until its end`, fx.busy(1) && fx.busy(end - 1) && !fx.busy(end));
    else check(`${name}: busy while its sparks live`, fx.busy(1) && !fx.busy(DURATIONS.particleMax));
  }
}

// ---- hurt: shakes add up, and none before its time ----
{
  const one = new EffectsModel(), two = new EffectsModel();
  one.hurt(500);
  two.hurt(500); two.hurt(500);
  const a = one.shake(540), b = two.shake(540);
  check('two hurts at once shake twice as much as one', Math.abs(b.x - 2 * a.x) < 1e-9 && Math.abs(b.y - 2 * a.y) < 1e-9 && (a.x !== 0 || a.y !== 0));
  const early = one.shake(400);
  check('a hurt that has not happened yet shakes nothing', early.x === 0 && early.y === 0);
  check('and shows no edge yet', !one.drawables(400).some((d) => d.kind === 'edge'));
}

// ---- the colours a caller can choose, pulses, glows ----
{
  const fx = new EffectsModel();
  fx.hit(0, 1, 2, 0x123456);
  check('hit: sparks in the colour asked for', fx.particlesAt(0).every((p) => p.color === 0x123456));
  fx.trail(0, img, 0x654321);
  check('trail: ghost in the colour asked for', fx.drawables(10).some((d) => d.kind === 'image' && d.color === 0x654321));
  const p = new EffectsModel();
  p.pulse(0, { x: 4, y: 5, w: 6, h: 7 }, 0x00ff00);
  const frame = (t: number) => p.drawables(t).find((d) => d.kind === 'frame');
  const at = (k: number) => frame(DURATIONS.pulse * k);
  check('pulse: frame in the colour asked for, on the box', at(0.25)?.kind === 'frame' && at(0.25)?.color === 0x00ff00 && at(0.25)?.x === 4 && at(0.25)?.h === 7);
  const grow = (k: number) => { const f = at(k); return f?.kind === 'frame' ? f.grow : -1; };
  check(`pulse: swells twice (grow ${grow(0.25)}, ${grow(0.5)}, ${grow(0.75)})`, Math.abs(grow(0.25) - 3) < 1e-9 && Math.abs(grow(0.5) - 1) < 1e-9 && Math.abs(grow(0.75) - 3) < 1e-9);
  const alpha = (k: number) => at(k)?.alpha ?? -1;
  check('pulse: fades out', alpha(0.25) > alpha(0.75));
  fx.setGlows([{ x: 50, y: 60, r: 14 }]);
  const glow = fx.drawables(1).find((d) => d.kind === 'glow');
  check('glow: where it was set, and its size', glow?.kind === 'glow' && glow.x === 50 && glow.y === 60 && glow.r === 14 && glow.alpha > 0);
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
    check(`${name}: sounds, without clipping (peak ${peak.toFixed(3)})`, !nan && peak > 0.02 && peak < 1);
    check(`${name}: lasts ${len} frames (3-50)`, len >= 3 && len <= 50);
    check(`${name}: silent after`, rms.slice(55).every((r) => r < 0.002));
  }
  // voices: a kill takes two, a hurt two more: the oldest is taken over. Each voice's waveform is what its control register was left at.
  const regs = new Uint8Array(32);
  const seq = new SfxSequencer((r, v) => { regs[r] = v; });
  const wave = (voice: number) => regs[voice * 7 + 4] & 0xf0;
  const NOISE = 0x80, PULSE = 0x40, SAW = 0x20, TRI = 0x10;
  seq.start('kill'); seq.frame();
  check('a kill plays noise and a pulse on voices 1 and 2, the third is free', wave(0) === NOISE && wave(1) === PULSE && wave(2) === 0);
  seq.start('hurt'); seq.frame();
  check('a hurt takes the free voice (sawtooth) and the oldest (triangle); the newer kill voice plays on', wave(2) === SAW && wave(0) === TRI && wave(1) === PULSE);
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

finish();
