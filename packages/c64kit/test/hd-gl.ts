/**
 * The HD view's Three.js layer (src/hd/layer.ts) and the renderer's HD path (src/renderer.ts), run
 * for real on a recording stand-in for WebGL 2 (test/gl-stub.ts: there's no browser or GPU here):
 * what reaches the GL is checked, as far as can be without one.
 *
 * - The shaders, as Three.js puts them together, pass the stand-in's checks (GLSL ES 3.00 as far as
 *   it goes: test/gl-stub.ts), and link.
 * - The hand-offs: the scene drawn into the full-size float target (with its depth), only in the
 *   band; bloom and the softened copy at half size; no pass reading the target it draws into; the
 *   composite onto the canvas in the picture's viewport and the band's scissor (device pixels), reading
 *   the targets it should; the C64's picture drawn above and below, the rows meeting the band's
 *   exactly; the C64 view (no room) exactly as before the HD view: one picture, the overlay.
 * - The fallbacks: a GL that can't draw into half floats gets byte targets; a shader that doesn't
 *   compile, or a draw that throws, gives the C64's picture that frame and from then on (the HD view
 *   `available` no more).
 *
 * - The sprites (`checkHdSprites`): the game's frame through C64View, as the browser draws it, each
 *   billboard's texture exactly the sprite's C64 pixels (its image, size and expansion), and one
 *   reaching past the band's edge exactly where the C64 has it.
 *
 * Each game's test/hd.ts runs it on its own rooms: `checkHdGl(check, room, sprites)`, `checkHdSprites`.
 */
import { PixelRenderer, type SpriteHandle } from '../src/renderer';
import { bandRows } from '../src/hd/layer';
import { HdModel, LOOK, cameraMatrix, project, spritesFromCapture, type HdRoom, type HdSprite } from '../src/hd/scene';
import { C64View } from '../src/c64/view';
import type { C64 } from '../src/c64/machine';
import { capturedSprites } from '../src/c64/picture';
import { C64_PALETTE } from '../src/palette';
import { placeBox, type PictureLayout } from '../src/layout';
import { Surface, TRANSPARENT } from '../src/surface';
import { GlStub, type GlDraw, type GlTexture, type StubOptions } from './gl-stub';

/** The browser's parts the renderer touches, for Node. */
export function useBrowser() {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: class { observe() {} disconnect() {} }, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: { devicePixelRatio: 1 }, configurable: true, writable: true });
}

/** A canvas laid out w × h CSS pixels whose GL is the stand-in. */
export function stubCanvas(stub: GlStub, w: number, h: number): HTMLCanvasElement {
  const canvas = {
    width: 300, height: 150, clientWidth: w, clientHeight: h, style: {},
    addEventListener() {}, removeEventListener() {},
    getContext: (type: string) => (type === 'webgl2' ? stub.context : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
  };
  if (!isCanvas(canvas)) throw new Error('not a canvas');
  return canvas;
}
/** (The one adapter: a canvas is what has a canvas's size and getContext, checked here, as the renderer uses no more of one.) */
function isCanvas(c: object): c is HTMLCanvasElement {
  return 'getContext' in c && typeof c.getContext === 'function' && 'width' in c && typeof c.width === 'number' && 'clientWidth' in c && typeof c.clientWidth === 'number';
}

type Check = (what: string, ok: boolean) => void;
const has = (d: GlDraw, uniform: string) => d.program.uniforms.some((u) => u.name === uniform);
const same = (a: number[] | null, b: number[]) => !!a && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

/** A renderer on the stand-in, showing this room and these sprites. */
function setUp(room: HdRoom | null, sprites: HdSprite[], w: number, h: number, options: StubOptions = {}) {
  useBrowser();
  const stub = new GlStub(w, h, options);
  const r = new PixelRenderer(stubCanvas(stub, w, h));
  for (const s of sprites) {
    const handle = r.createSprite(), surface = new Surface(s.w, s.h);
    surface.pixels.set(s.pixels);
    Object.assign(handle, { surface, x: s.x, y: s.y, n: s.n, visible: true });
  }
  r.hd.room = room;
  return { stub, r };
}

/** Draw a frame (console.error kept, not shown), returning what was said there. */
function frame(stub: GlStub, r: PixelRenderer) {
  stub.reset();
  const said: string[] = [], error = console.error;
  console.error = (...a: unknown[]) => { said.push(a.map(String).join(' ')); };
  try { r.render(); } finally { console.error = error; }
  return said;
}

/**
 * A clock on the renderer's JavaScript (the stand-in GL does nothing): `draw(room)` draws a frame with this
 * room (null: the C64's picture) and gives the ms it took on the main thread.
 */
export function layerClock(sprites: HdSprite[], first: HdRoom | null = null) {
  const { stub, r } = setUp(first, sprites, 1000, 700);
  frame(stub, r);
  return (room: HdRoom | null) => {
    r.hd.room = room;
    const t = performance.now();
    frame(stub, r);
    return performance.now() - t;
  };
}

/**
 * How long the renderer takes (ms, its JavaScript: the stand-in GL does nothing) to draw each of these
 * rooms in turn, a frame each: what a room built again, painted again or moved costs the layer.
 */
export function frameTimes(rooms: HdRoom[], sprites: HdSprite[]) {
  const draw = layerClock(sprites, rooms[0] ?? null);
  return rooms.map(draw);
}

export function checkHdGl(check: Check, name: string, room: HdRoom, sprites: HdSprite[]) {
  // (a desktop window: a whole-number scale, the picture off the canvas's corner; a phone: a fractional
  // one; a phone's device pixels: more than the scene is drawn at, scaled up by the composite)
  for (const [w, h] of [[1000, 700], [700, 390], [2340, 1080]]) {
    const { stub, r } = setUp(room, sprites, w, h);
    frame(stub, r);
    frame(stub, r); // (the second frame: everything made, as every frame after)
    const failed = stub.programs.filter((p) => !p.linked);
    check(`${name} GL ${w}×${h}: ${stub.programs.length} programs compile and link (as far as the stand-in checks)${failed.map((p) => `\n${p.log}`).join('')}`, stub.programs.length > 0 && !failed.length);
    check(`${name} GL ${w}×${h}: no draw reads what it draws into, none without a program${stub.problems.map((p) => `\n  ${p}`).join('')}`, !stub.problems.length);
    const draws = stub.draws;
    const composite = draws.find((d) => has(d, 'uBand'));
    if (!composite) { check(`${name} GL ${w}×${h}: the composite drawn`, false); continue; }
    const [vx, vy, vw, vh] = composite.viewport, rows = bandRows(room.band, vh);
    const bandBox = [vx, vy + vh - rows.bottom, vw, rows.bottom - rows.top];
    // the scene: into a float target with its depth, the picture's size up to 600 lines (layer.ts INTERNAL), in the band
    const k = Math.min(1, 600 / vh), iw = Math.round(vw * k), ih = Math.round(vh * k), irows = bandRows(room.band, ih);
    const scene = draws.filter((d) => has(d, 'uCamera')), target = scene[0]?.framebuffer;
    const surface = scene.find((d) => has(d, 'uGlow'));
    check(`${name} GL ${w}×${h}: the scene drawn into one half-float target with its depth (${target?.colour?.format} ${target?.colour?.w}×${target?.colour?.h} for a picture ${vw}×${vh}, depth ${target?.depth?.format}), viewport and scissor its own, the band's rows`,
      !!target && target.colour?.format === 'RGBA16F' && target.colour.w === iw && target.colour.h === ih && ih <= 600 && !!target.depth
      && scene.every((d) => d.framebuffer === target && same(d.viewport, [0, 0, iw, ih]) && same(d.scissor, [0, ih - irows.bottom, iw, irows.bottom - irows.top])));
    check(`${name} GL ${w}×${h}: the room's surface depth-tested and written, all of it (a quad drawn ${surface?.instances} times)`, !!surface && surface.depthTest && surface.depthMask && surface.count === 6 && surface.instances === room.surface.count);
    check(`${name} GL ${w}×${h}: shadows and particles blended over it, not hiding what's behind`, scene.filter((d) => has(d, 'uAlpha') || has(d, 'uUnit')).every((d) => d.blend && !d.depthMask && d.depthTest));
    // behind the room, first: the C64's picture and what's seen past the room, neither tested against nor written to the depth
    const backdrop = draws.find((d) => has(d, 'uBackdrop')), open = backdrop?.samples.get('uOpen'), pic = backdrop?.samples.get('uPicture');
    check(`${name} GL ${w}×${h}: the C64's picture behind the room, in the scene's target before the room (${pic?.w}×${pic?.h}, what's seen past the room ${open?.w}×${open?.h})`,
      !!backdrop && backdrop.framebuffer === target && draws.indexOf(backdrop) < draws.indexOf(scene[0]) && !backdrop.depthTest && !backdrop.depthMask
      && pic?.w === 320 && pic.h === 200 && open?.w === 320 && open.h === room.band.h);
    const targetClear = stub.clears.find((c) => c.framebuffer === target);
    check(`${name} GL ${w}×${h}: the target cleared whole (colour and depth) before`, !!targetClear && targetClear.scissor === null && targetClear.colour && targetClear.depth);
    // the passes, at half size, then the composite reading them
    const passes = draws.filter((d) => has(d, 'uSrc'));
    const half = passes.every((d) => d.framebuffer !== null && d.framebuffer !== target && d.framebuffer.colour?.w === iw >> 1 && same(d.viewport, [0, 0, iw >> 1, ih >> 1]) && d.scissor === null);
    check(`${name} GL ${w}×${h}: bloom, the softened copy and the shafts (${passes.length} passes) at half size, each into its own target`, passes.length === 10 && half);
    const bright = passes.find((d) => has(d, 'uThreshold')) ?? passes[0], rays = passes.find((d) => has(d, 'uRays')), s = composite.samples;
    // sprites never softened: the softened copy (the first pass, the scene copied at half size) is taken
    // of the room before the sprites standing in it are drawn into the scene, and blurred from that
    const copy = passes[0], standing = scene.filter((d) => has(d, 'uFlat') && d.values.get('uFlat') === 0);
    const roomDraws = scene.filter((d) => !standing.includes(d));
    check(`${name} GL ${w}×${h}: the softened copy taken of the room before its ${standing.length} sprites standing are drawn (no sprite smeared by the depth of field or the tilt-shift)`,
      copy.samples.get('uSrc') === target?.colour && roomDraws.every((d) => draws.indexOf(d) < draws.indexOf(copy)) && standing.every((d) => draws.indexOf(d) > draws.indexOf(copy) && d.framebuffer === target)
      && s.get('uSoft') === copy.framebuffer?.colour);
    check(`${name} GL ${w}×${h}: the bright passes read the scene, the shafts what's brightest`, has(bright, 'uThreshold') && passes.filter((d) => has(d, 'uThreshold')).every((d) => d.samples.get('uSrc') === target?.colour)
      && !!rays && rays.samples.get('uSrc') === passes[passes.indexOf(rays) - 1].framebuffer?.colour);
    check(`${name} GL ${w}×${h}: the composite onto the canvas in the picture's viewport (${composite.viewport}) and the band's scissor (${composite.scissor}), not blended (the band all the HD view's)`,
      composite.framebuffer === null && same(composite.scissor, bandBox) && !composite.depthTest && !composite.blend);
    check(`${name} GL ${w}×${h}: the composite reads the scene, its depth, the bloom, the softened copy and the shafts`,
      s.get('uSharp') === target?.colour && s.get('uDepth') === target?.depth && s.get('uBloom') === bright.framebuffer?.colour && !!s.get('uSoft') && s.get('uSoft') !== s.get('uBloom')
      && s.get('uRays') === rays?.framebuffer?.colour);
    // the C64's picture first (in the band without the sprites: under the room), then the scene, the passes, the composite
    const c64 = draws.slice(0, draws.indexOf(backdrop ?? scene[0])).filter((d) => d.framebuffer === null);
    const order = c64.length > 0 && draws.indexOf(scene[scene.length - 1]) < draws.indexOf(bright) && draws.indexOf(passes[passes.length - 1]) < draws.indexOf(composite) && composite === draws[draws.length - 1 - draws.slice(draws.indexOf(composite) + 1).length];
    check(`${name} GL ${w}×${h}: in order: the C64's picture, the scene, the passes, the composite`, order);
    const canvasClears = stub.clears.filter((c) => c.framebuffer === null && same(c.scissor, bandBox));
    check(`${name} GL ${w}×${h}: the composite over the C64's picture in the band, not cleared away (${canvasClears.length} clear of the band, before it's drawn)`,
      canvasClears.length === 1 && stub.clears.indexOf(canvasClears[0]) < stub.clears.findIndex((c) => c.framebuffer === target));
    const covered = new Array<number>(vh).fill(0);
    const boxes = new Set(c64.map((d) => String(d.scissor)));
    for (const b of boxes) { const [, y, , hh] = b.split(',').map(Number); for (let k = y; k < y + hh; k++) covered[vy + vh - 1 - k]++; }
    check(`${name} GL ${w}×${h}: the C64's picture in the band and above and below it (${[...boxes].join(' / ')}), every row of the picture drawn once`,
      c64.every((d) => same(d.viewport, [vx, vy, vw, vh])) && covered.every((n) => n === 1));
    // the hurt shake moves the band as it moves the C64's picture
    {
      stub.reset();
      r.hd.render(r.gl, 1000, sprites, null, { x: vx, y: vy, w: vw, h: vh }, { x: 2, y: 1 });
      const c = stub.draws.find((d) => has(d, 'uBand')), unit = vh / 200;
      check(`${name} GL ${w}×${h}: a shake moves the band's picture (${c?.viewport}), the band's scissor stays`, !!c && same(c.viewport, [vx + Math.round(2 * unit), vy - Math.round(unit), vw, vh]) && same(c.scissor, bandBox));
    }
    if (w !== 1000) continue;
    // the C64 view: as it was (one picture in the viewport, then the overlay), nothing of the HD view's
    r.hd.room = null;
    frame(stub, r);
    check(`${name} GL: the C64 view: only the picture, onto the canvas in its viewport (${stub.draws.length} draws)`,
      stub.draws.length > 0 && stub.draws.every((d) => d.framebuffer === null && same(d.viewport, [vx, vy, vw, vh]) && same(d.scissor, [vx, vy, vw, vh]) && !has(d, 'uCamera') && !has(d, 'uSrc') && !has(d, 'uBand')));
  }
  // a GL that can't draw into half floats: bytes
  {
    const { stub, r } = setUp(room, sprites, 1000, 700, { noFloatTargets: true });
    frame(stub, r);
    const said = frame(stub, r), target = stub.draws.find((d) => has(d, 'uCamera'))?.framebuffer;
    check(`${name} GL, no float targets: byte targets (${target?.colour?.format}), the HD view drawn`, target?.colour?.format === 'RGBA8' && r.hd.available && !said.length && stub.draws.some((d) => has(d, 'uBand')));
  }
  // a shader that doesn't compile, a draw that throws: the C64's picture, that frame and after
  for (const [what, options] of [['a shader that does not compile', { breakShader: /uDepthToZ/ }], ['a draw that throws', { throwOnDraw: 'uThreshold' }]] satisfies [string, StubOptions][]) {
    const { stub, r } = setUp(room, sprites, 1000, 700, options);
    const said = frame(stub, r);
    // (after the HD view's last draw, into its targets or the composite: the C64's picture drawn again, whole)
    const hdLast = stub.draws.reduce((k, d, i) => (d.framebuffer !== null || has(d, 'uBand') ? i : k), -1);
    const last = stub.draws.slice(hdLast + 1).filter((d) => d.framebuffer === null);
    const view = last[0]?.viewport ?? [];
    const whole = last.length > 0 && last.every((d) => same(d.scissor, view) && same(d.viewport, view));
    const after = frame(stub, r);
    check(`${name} GL, ${what}: said so ("${said.map((l) => l.split('\n')[1]).join(' | ')}"), the C64's picture over the whole picture that frame and after, the HD view not available`,
      said.length === 1 && whole && !r.hd.available && !after.length && stub.draws.length > 0 && stub.draws.every((d) => d.framebuffer === null && !has(d, 'uCamera') && !has(d, 'uBand')));
  }
}

/** A renderer that keeps the sprite handles it gives out (C64View's), to look at what it was given. */
class KeepingRenderer extends PixelRenderer {
  readonly handles: SpriteHandle[] = [];
  createSprite(z?: number) {
    const h = super.createSprite(z);
    this.handles.push(h);
    return h;
  }
}

/**
 * The sprites as the HD view draws them, from a frame of the game (`m`) through C64View and the
 * renderer as the browser has them: C64View's sprites are the C64's (capturedSprites, what the C64
 * stills draw: the same pixels, size and expansion, and place); each billboard drawn is given exactly its sprite's
 * C64 pixels as its texture (the image the GL is given, read top down, in the C64's colours, clear
 * where the sprite is; a sprite set behind the characters without the pixels they hide), one texture
 * for each sprite the room shows; and a sprite reaching past the band's edge (the C64's picture draws
 * the rest of it there) is where the C64 has it, its corners within 0.01 px of its C64 box.
 */
export function checkHdSprites(check: Check, name: string, m: Pick<C64, 'ram' | 'capture'>, room: HdRoom, layout: PictureLayout | null = null) {
  useBrowser();
  const stub = new GlStub(1000, 700), r = new KeepingRenderer(stubCanvas(stub, 1000, 700));
  r.layout = layout;
  const view = new C64View(r, m);
  view.update();
  r.hd.room = room;
  stub.reset();
  view.render(0);
  const c64 = capturedSprites(m.capture).map((s) => ({ ...s, ...placeBox(layout, s) })), shown = r.handles.filter((h) => h.visible);
  check(`${name}: C64View's sprites are the C64's, where the C64 has them (${c64.length}: ${c64.map((s) => `${s.n} ${s.w}×${s.h}`).join(', ')})`,
    shown.length === c64.length && c64.every((s, i) => { const h = shown[i].surface; return !!h && shown[i].n === s.n && shown[i].x === s.x && shown[i].y === s.y && h.width === s.w && h.height === s.h && h.pixels.every((v, k) => v === s.pixels[k]); }));
  // (the room's sprites as the model has them from the capture: each one's image as the C64 shows it)
  const scene = new HdModel().frame(1000, room, spritesFromCapture(m.capture, layout), r.screen.pixels);
  const want = scene.billboards.map((b) => b.sprite), drawn = stub.draws.filter((d) => has(d, 'uMap') && has(d, 'uFlat')).map((d) => d.samples.get('uMap') ?? null);
  const image = (t: GlTexture | null) => {
    if (!t?.upload) return null;
    const { data, flipY } = t.upload, out: number[] = [];
    for (let y = 0; y < t.h; y++) {
      const row = flipY ? y : t.h - 1 - y;
      out.push(...data.subarray(row * t.w * 4, (row + 1) * t.w * 4));
    }
    return { w: t.w, h: t.h, rgba: out };
  };
  const isSprite = (img: ReturnType<typeof image>, s: HdSprite) => !!img && img.w === s.w && img.h === s.h && img.rgba.every((v, k) => {
    const p = s.pixels[k >> 2], c = C64_PALETTE[p & 15];
    return v === [c >> 16, (c >> 8) & 255, c & 255, p === TRANSPARENT ? 0 : 255][k & 3];
  });
  const left = [...want], wrong: string[] = [];
  for (const t of drawn) {
    const img = image(t), i = left.findIndex((s) => isSprite(img, s));
    if (i < 0) wrong.push(img ? `${img.w}×${img.h}` : 'none'); else left.splice(i, 1);
  }
  check(`${name}: each billboard's texture is its sprite's C64 pixels, same image and size (${drawn.length} drawn for the ${want.length} sprites in the room${wrong.length ? `; not a sprite's: ${wrong.join(', ')}` : ''})`,
    drawn.length === want.length && !left.length && !wrong.length);
  // (where the camera puts each billboard's corners, against the sprite's box on the C64's picture)
  const { band } = room, m4 = cameraMatrix(room, LOOK.camera.slope, LOOK.camera.tilt, LOOK.camera.zoom);
  const outside = (s: HdSprite) => s.pixels.some((v, k) => { const y = s.y + Math.floor(k / s.w); return v !== TRANSPARENT && (y < band.y || y >= band.y + band.h); });
  const crossing = scene.billboards.filter((b) => outside(b.sprite));
  let off = 0;
  for (const b of crossing) {
    const a = project(m4, b.x, b.y, b.z), z = project(m4, b.x + b.w, b.y - b.h, b.z);
    off = Math.max(off, Math.abs(a.x - b.sprite.x), Math.abs(a.y - b.sprite.y), Math.abs(z.x - b.sprite.x - b.sprite.w), Math.abs(z.y - b.sprite.y - b.sprite.h));
  }
  check(`${name}: ${crossing.length} sprite${crossing.length === 1 ? '' : 's'} reaching past the band's edge where the C64 has ${crossing.length === 1 ? 'it' : 'them'} (corners within ${off.toFixed(4)} px)`, off < 0.01);
}
