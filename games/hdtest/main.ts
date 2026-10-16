import deckFixture from '../blackwyche/test/fixtures/deck.hd.bin?url';
import deckPng from '../blackwyche/test/fixtures/deck.sw.png?url';
import cabinFixture from '../blackwyche/test/fixtures/cabin.hd.bin?url';
import cabinPng from '../blackwyche/test/fixtures/cabin.sw.png?url';
import { decodeFixture, inflateFixture, type HdFixture } from './fixture';
import { brightness, difference, sampleCanvas, type Rgba } from './compare';
import { canDrawInto, FixtureView, glInfo } from './gl';

/**
 * The HD GPU test page (hdtest.html; not linked from the loader): what the HD view really draws on
 * this device's GPU. For each fixture (two frames of Blackwyche's HD view: games/hdtest/fixture.ts,
 * written by games/blackwyche/test/hd-fixtures.ts) the game's renderer draws it with WebGL (its HD
 * path, the real HdLayer), with the software renderer's picture of the same frame under it, and the
 * numbers: how bright each is over the room's band, how far apart, a heat map of where, frame times;
 * above them what the GL is. Made to be read in one phone screenshot.
 */
const FIXTURES = [
  { name: 'cabin', fixture: cabinFixture, png: cabinPng },
  { name: 'deck', fixture: deckFixture, png: deckPng },
];

const found = document.getElementById('out');
if (!found) throw new Error('hdtest.html has no #out');
const out: HTMLElement = found;

/** A new element, in `parent`. */
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  parent.append(e);
  return e;
}
const f3 = (v: number) => v.toFixed(3).replace(/^(-?)0\./, '$1.');
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const ms = (t: { mean: number; p95: number; worst: number }) => `${t.mean.toFixed(1)}/${t.p95.toFixed(1)}/${t.worst.toFixed(0)}`;

const info = el(out, 'pre', 'info', 'GL: …');

/** The software renderer's PNG as pixels (and shown in `img`). */
async function loadPng(img: HTMLImageElement, url: string): Promise<Rgba> {
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas to read the PNG with');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { data: d.data, w: d.width, h: d.height };
}

async function loadFixture(url: string): Promise<HdFixture> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return decodeFixture(await inflateFixture(new Uint8Array(await res.arrayBuffer())));
}

const views: FixtureView[] = [];

async function run(f: (typeof FIXTURES)[number]) {
  const sec = el(out, 'section');
  const head = el(sec, 'h2', '', f.name);
  const pair = el(sec, 'div', 'pair');
  // (the GL's canvas: 960×600 device pixels or a pixel or two more, the scene drawn at the size the
  // software one is, as on a phone in landscape (layer.ts INTERNAL); shown scaled down to fit)
  const glBox = el(pair, 'figure'), wrap = el(glBox, 'div', 'glwrap'), canvas = el(wrap, 'canvas');
  const dpr = window.devicePixelRatio || 1, cw = Math.ceil(960 / dpr), ch = Math.ceil(600 / dpr);
  canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
  const fit = () => { canvas.style.transform = `scale(${wrap.clientWidth / cw})`; };
  new ResizeObserver(fit).observe(wrap);
  fit();
  el(glBox, 'figcaption', '', 'GPU: HdLayer');
  const swBox = el(pair, 'figure'), img = el(swBox, 'img', 'pic');
  img.alt = `${f.name}: the software renderer`;
  el(swBox, 'figcaption', '', 'software (stills)');
  const lower = el(sec, 'div', 'pair');
  const heatBox = el(lower, 'figure'), heat = el(heatBox, 'canvas', 'heat');
  el(heatBox, 'figcaption', '', 'GPU−SW luma: red GPU brighter, blue darker (full at .25)');
  const nums = el(lower, 'pre', 'nums', '…');
  try {
    const [fixture, sw] = await Promise.all([loadFixture(f.fixture), loadPng(img, f.png)]);
    head.textContent = `${f.name}: t=${fixture.t}, ${fixture.room.surface.count} quads, ${fixture.sprites.length} sprites, ${fixture.room.lights.length} lights`;
    const v = new FixtureView(canvas, fixture);
    views.push(v);
    if (views.length === 1) showInfo(v);
    v.capture();
    const anim = await v.animate(120, (step) => requestAnimationFrame(step));
    // the fixture's own frame, last (what the canvas shows, the numbers are of)
    const { pixels, view } = v.capture();
    const gl = sampleCanvas(pixels, view, sw.w, sw.h), band = fixture.room.band;
    const a = brightness(gl, band), b = brightness(sw, band), d = difference(gl, sw, band);
    heat.width = d.heat.w; heat.height = d.heat.h;
    heat.getContext('2d')?.putImageData(new ImageData(d.heat.data, d.heat.w, d.heat.h), 0, 0);
    const failure = v.renderer.hd.failure;
    nums.textContent = [
      '       GPU   SW',
      `mean  ${f3(a.mean)} ${f3(b.mean)}`,
      `p50   ${f3(a.p50)} ${f3(b.p50)}`,
      `p95   ${f3(a.p95)} ${f3(b.p95)}`,
      `p99   ${f3(a.p99)} ${f3(b.p99)}`,
      `>0.8  ${pct(a.bright).padStart(4)} ${pct(b.bright)}`,
      `|d| ${f3(d.abs)}  d ${f3(d.signed)}`,
      `dRGB ${d.rgb.map(f3).join(' ')}`,
      `frame ${ms(anim.between)}`,
      `js ${ms(anim.js)} gpu ${ms(anim.gpu)}`,
      `(ms mean/p95/max, ${anim.frames} fr)`,
      `targets ${v.renderer.hd.precision}`,
      `view ${pixels.w}×${pixels.h} ×${view.scale.toFixed(2)}`,
      failure ? `HD FAILED: ${failure.slice(0, 300)}` : 'HD drawn, no failure',
    ].join('\n');
    if (failure) nums.classList.add('bad');
    // (a canvas resized is cleared: the frame drawn again)
    new ResizeObserver(() => v.draw()).observe(canvas);
  } catch (e) {
    nums.textContent = `ERROR: ${e instanceof Error ? e.stack ?? e.message : String(e)}`;
    nums.classList.add('bad');
  }
}

function showInfo(v: FixtureView) {
  const g = glInfo(v.renderer);
  const probe = document.createElement('canvas').getContext('webgl2');
  const can = (fmt: 'RGBA16F' | 'RGBA32F') => (probe ? (canDrawInto(probe, fmt) ? 'yes' : 'NO') : '?');
  const ext = Object.entries(g.extensions).map(([k, on]) => `${k.replace(/^(EXT|OES)_/, '')} ${on ? 'yes' : 'NO'}`).join(', ');
  info.textContent = [
    `${g.renderer} | ${g.vendor}${g.unmasked ? '' : ' (masked)'}`,
    `${g.version}, ${g.glsl}; WebGL2 ${g.webgl2 ? 'yes' : 'NO'}, highp ${g.highp} bits`,
    `dpr ${window.devicePixelRatio}, max texture ${g.maxTexture}, ${window.innerWidth}×${window.innerHeight} CSS px`,
    `render targets: half float ${can('RGBA16F')}, float ${can('RGBA32F')}; ${ext}`,
    navigator.userAgent,
  ].join('\n');
}

// (one after another: one GL drawing at a time, its frame times its own)
void (async () => { for (const f of FIXTURES) await run(f); })();
