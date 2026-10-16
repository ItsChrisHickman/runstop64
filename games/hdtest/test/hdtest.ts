/**
 * The HD GPU test page (games/hdtest.html), headless as far as it goes without a GPU:
 *
 * - the committed fixtures read back (inflated, decoded) to what was written, byte for byte; and their
 *   software PNGs what the software renderer makes of the fixture as read (written again here, the
 *   same bytes): the page compares the GPU with exactly that;
 * - the numbers (compare.ts): a canvas holding the software picture somewhere on it, as the GL's read
 *   back has it (rows bottom up), sampled back to the software picture's pixels, nothing apart; a
 *   darker one, darker by as much, the heat map blue;
 * - the GL part (gl.ts) on the stand-in WebGL 2 (packages/c64kit/test/gl-stub.ts) under the real
 *   Three.js: the game's renderer drawing the fixture by its HD path (the composite drawn, no failure,
 *   half-float targets), the picture's place on the canvas as the renderer drew it (the composite's
 *   viewport), the fixture's time reaching the layer (the same time, the same lights; another, not), 120
 *   frames animated and timed, the GL's description; a GL without float targets (bytes, said so), and
 *   one whose shader won't compile (the failure, said so).
 *
 *   nice -n 15 node tools/test.mjs games/hdtest/test/hdtest.ts
 */
import fs from 'node:fs';
import { decodeFixture, encodeFixture, inflateFixture, type HdFixture } from '../fixture';
import { brightness, difference, sampleCanvas, type PictureView, type Rgba } from '../compare';
import { FixtureView, glInfo } from '../gl';
import { HdModel } from '../../../packages/c64kit/src/hd/scene';
import { rasteriseHd } from '../../../packages/c64kit/test/hd-raster';
import { stubCanvas, useBrowser } from '../../../packages/c64kit/test/hd-gl';
import { GlStub, type StubOptions } from '../../../packages/c64kit/test/gl-stub';
import { joinLayers, rgbPng } from '../../../tools/probe/render';

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const dir = 'games/blackwyche/test/fixtures', tmp = `/tmp/hdtest-${Date.now()}`;
fs.mkdirSync(tmp, { recursive: true });
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const toBytes = (rgb: Float32Array, w: number, h: number): Rgba => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(rgb[i * 3 + c] * 255))); data[i * 4 + 3] = 255; }
  return { data, w, h };
};
/** The GL part: a stand-in canvas w × h with the fixture drawn on it. */
const onStub = (f: HdFixture, w: number, h: number, options: StubOptions = {}) => {
  useBrowser();
  const stub = new GlStub(w, h, options), view = new FixtureView(stubCanvas(stub, w, h), f);
  return { stub, view };
};

for (const name of ['cabin', 'deck']) {
  const file = new Uint8Array(fs.readFileSync(`${dir}/${name}.hd.bin`)), raw = await inflateFixture(file), f = decodeFixture(raw);
  check(`${name}: the fixture read back (${(file.length / 1024).toFixed(0)} KB: ${f.room.surface.count} quads, ${f.sprites.length} sprites, ${f.room.lights.length} lights, t ${f.t}, ${f.view.w}×${f.view.h}), written again the same size, read and written again the same bytes`,
    f.name === name && encodeFixture(f).length === raw.length && same(encodeFixture(decodeFixture(encodeFixture(f))), encodeFixture(f)) && f.room.surface.count > 1000 && f.view.w === 960 && f.view.h === 600);
  check(`${name}: an uncompressed one read as it is`, same(await inflateFixture(raw), raw));
  // the software picture of the fixture as read: the committed PNG, byte for byte
  const S = f.view.w / 320, sw = rasteriseHd(new HdModel().frame(f.t, f.room, f.sprites, f.front), f.picture, joinLayers(f.front, f.back), S);
  rgbPng(`${tmp}/${name}.sw.png`, sw.rgb, sw.W, sw.H, 1);
  check(`${name}: its PNG is the software renderer's picture of it (${sw.W}×${sw.H})`, same(new Uint8Array(fs.readFileSync(`${tmp}/${name}.sw.png`)), new Uint8Array(fs.readFileSync(`${dir}/${name}.sw.png`))));

  // the numbers: the software picture on a canvas, read back as the GL does (rows bottom up), sampled back
  const ref = toBytes(sw.rgb, sw.W, sw.H), band = f.room.band;
  const put = (view: PictureView, W: number, H: number, k = 1): Rgba => {
    const data = new Uint8Array(W * H * 4);
    for (let row = 0; row < H; row++) for (let x = 0; x < W; x++) {
      const y = H - 1 - row, cx = (x + 0.5 - view.x) / view.scale, cy = (y + 0.5 - view.y) / view.scale;
      if (cx < 0 || cy < 0 || cx >= 320 || cy >= 200) continue;
      const i = (Math.floor((cy * sw.H) / 200) * sw.W + Math.floor((cx * sw.W) / 320)) * 4, o = (row * W + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.round(ref.data[i + c] * k);
      data[o + 3] = 255;
    }
    return { data, w: W, h: H };
  };
  for (const [W, H, view] of [[1080, 700, { x: 0, y: 12.5, scale: 3.375 }], [962, 601, { x: 1, y: 0, scale: 3 }]] satisfies [number, number, PictureView][]) {
    const back = sampleCanvas(put(view, W, H), view, sw.W, sw.H), d = difference(back, ref, band), a = brightness(back, band), b = brightness(ref, band);
    check(`${name}: the software picture on a ${W}×${H} canvas (×${view.scale}), sampled back: ${d.abs.toFixed(4)} apart, mean ${a.mean.toFixed(3)} against ${b.mean.toFixed(3)}, p99 ${a.p99.toFixed(3)} / ${b.p99.toFixed(3)}`,
      d.abs < 0.01 && Math.abs(a.mean - b.mean) < 0.005 && Math.abs(a.p99 - b.p99) < 0.02);
  }
  {
    const view = { x: 0, y: 0, scale: 3 }, dark = sampleCanvas(put(view, 960, 600, 0.5), view, sw.W, sw.H), d = difference(dark, ref, band), b = brightness(ref, band);
    let red = 0, blue = 0;
    for (let i = 0; i < d.heat.w * d.heat.h; i++) { red += d.heat.data[i * 4]; blue += d.heat.data[i * 4 + 2]; }
    check(`${name}: half as bright: darker by ${(-d.signed).toFixed(3)} (|d| ${d.abs.toFixed(3)}, the picture's mean ${b.mean.toFixed(3)}), the heat map ${d.heat.w}×${d.heat.h} blue`, d.signed < -0.1 && Math.abs(d.abs + d.signed) < 1e-9 && blue > 0 && red === 0 && d.heat.w === 320);
  }

  // the GL part, on the stand-in: a phone's canvas
  const { stub, view: v } = onStub(f, 1080, 675);
  const { pixels, view } = v.capture();
  const composite = stub.draws.find((d) => d.program.uniforms.some((u) => u.name === 'uBand'));
  const [vx, vy, vw, vh] = composite?.viewport ?? [];
  check(`${name} GL: drawn by the renderer's HD path (${stub.draws.length} draws, the composite's viewport ${composite?.viewport}), no failure, ${v.renderer.hd.precision} targets`,
    !!composite && v.renderer.hd.failure === null && v.renderer.hd.precision === 'half float' && !stub.problems.length);
  check(`${name} GL: read back ${pixels.w}×${pixels.h}, the picture at (${view.x}, ${view.y}) ×${view.scale.toFixed(4)} where the composite drew it`,
    pixels.w === 1080 && pixels.h === 675 && Math.abs(view.x - vx) < 0.01 && Math.abs(view.y - (675 - vy - vh)) < 0.01 && Math.abs(view.scale - vw / 320) < 1e-6);
  const lights = () => JSON.stringify(stub.draws.find((d) => d.program.uniforms.some((u) => u.name === 'uGlow'))?.values.get('uLightPos'));
  const at = lights();
  stub.reset(); v.draw(f.t + 500);
  const later = lights();
  stub.reset(); v.capture();
  check(`${name} GL: drawn at the fixture's time (the same lights again${f.room.lights.length ? ', others half a second on' : ''})`, at !== undefined && at === lights() && (!f.room.lights.length || later !== at));
  const anim = await v.animate(120, (step) => setTimeout(() => step(performance.now()), 0), 10);
  check(`${name} GL: 120 frames animated and timed (js ${anim.js.mean.toFixed(1)} ms a frame), 10 waited for`, anim.frames === 120 && anim.between.worst > 0 && v.renderer.hd.failure === null);
  if (name === 'cabin') console.log(`     the GL as described: ${JSON.stringify(glInfo(v.renderer))}`);

  const bytes = onStub(f, 1080, 675, { noFloatTargets: true });
  bytes.view.capture(); bytes.view.capture();
  check(`${name} GL without float targets: ${bytes.view.renderer.hd.precision} targets, drawn`, bytes.view.renderer.hd.precision === 'byte' && bytes.view.renderer.hd.failure === null);
  const broken = onStub(f, 1080, 675, { breakShader: /uDepthToZ/ }), error = console.error;
  console.error = () => {};
  try { broken.view.capture(); } finally { console.error = error; }
  const why = broken.view.renderer.hd.failure;
  check(`${name} GL with a shader that won't compile: the failure reported ("${why?.split('\n')[0]}")`, why !== null && why.includes('did not compile'));
}

console.log(failures ? `${failures} FAILED` : 'all ok');
process.exit(failures ? 1 : 0);
