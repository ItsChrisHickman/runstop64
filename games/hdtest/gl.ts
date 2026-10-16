import { PixelRenderer } from '../../packages/c64kit/src/renderer';
import { Surface } from '../../packages/c64kit/src/surface';
import type { HdFixture } from './fixture';
import { timings, type PictureView, type Rgba } from './compare';

/**
 * A fixture (fixture.ts) drawn by the game's own renderer on a canvas: PixelRenderer's HD path, as the
 * game has it (its screen the C64's characters, its backdrop the background, a sprite handle for each
 * sprite, `hd.room` the room), at the fixture's time (`clock` fixed), into the canvas's device pixels.
 */
export class FixtureView {
  readonly renderer: PixelRenderer;
  /** The time (ms) the next frame is drawn at. */
  private t: number;

  constructor(canvas: HTMLCanvasElement, readonly fixture: HdFixture) {
    this.t = fixture.t;
    const r = this.renderer = new PixelRenderer(canvas);
    r.clock = () => this.t;
    r.screen.pixels.set(fixture.front);
    r.screen.version++;
    const back = new Surface(320, 200, 0);
    back.pixels.set(fixture.back);
    r.backdrop = back;
    r.background = fixture.background;
    for (const s of fixture.sprites) {
      // (a sprite the game sets behind the characters is drawn under them: z below 0, as C64View does)
      const handle = r.createSprite(s.behind ? -1 : 1), surface = new Surface(s.w, s.h);
      surface.pixels.set(s.pixels);
      handle.surface = surface; handle.x = s.x; handle.y = s.y; handle.n = s.n; handle.visible = true;
    }
    r.hd.room = fixture.room;
  }

  /** Draw a frame at time `t` (ms). */
  draw(t = this.fixture.t) {
    this.t = t;
    this.renderer.render();
  }

  /** Draw the fixture's frame and read the canvas back (rows bottom up, as the GL has them), with where the picture is on it. */
  capture(): { pixels: Rgba; view: PictureView } {
    this.draw();
    const ctx = this.renderer.gl.getContext(), w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight, data = new Uint8Array(w * h * 4);
    // (straight after drawing, before the browser shows it: the drawing buffer still holds the frame)
    ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, data);
    return { pixels: { data, w, h }, view: this.view() };
  }

  /**
   * Where the renderer put the picture on the canvas (device pixels from its top left, its scale):
   * worked back from its own `toScreenLocal` (canvas CSS pixels to the picture's), at two corners.
   */
  view(): PictureView {
    const r = this.renderer, cw = Math.max(1, r.canvas.clientWidth), a = r.toScreenLocal(0, 0), b = r.toScreenLocal(cw, 0);
    const scale = r.canvas.width / (b.x - a.x);
    return { x: -a.x * scale, y: -a.y * scale, scale };
  }

  /**
   * Draw `frames` frames of the fixture animating (its time going on as the display's does), one a
   * display frame (`nextFrame`: requestAnimationFrame): the time between frames (what the player gets:
   * at most the display's rate), and the JavaScript of each `render()`; then `synced` frames each waited
   * for (a pixel read back after each: the GPU's own time a frame, past the display's rate).
   */
  async animate(frames: number, nextFrame: (f: (now: number) => void) => void, synced = 30) {
    const between: number[] = [], js: number[] = [];
    await new Promise<void>((done) => {
      let first = -1, last = -1;
      const step = (now: number) => {
        if (first < 0) first = now;
        if (last >= 0) between.push(now - last);
        last = now;
        const t0 = performance.now();
        this.draw(this.fixture.t + now - first);
        js.push(performance.now() - t0);
        if (js.length >= frames) done(); else nextFrame(step);
      };
      nextFrame(step);
    });
    const ctx = this.renderer.gl.getContext(), pixel = new Uint8Array(4), gpu: number[] = [];
    for (let i = 0; i < synced; i++) {
      const t0 = performance.now();
      this.draw(this.fixture.t + i * 16.7);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
      gpu.push(performance.now() - t0);
    }
    return { between: timings(between), js: timings(js), gpu: timings(gpu), frames: js.length };
  }
}

/** What the GL says it is: the renderer and vendor (unmasked where the browser tells), its version, limits, and the float extensions. */
export function glInfo(r: PixelRenderer) {
  const ctx = r.gl.getContext(), str = (v: unknown) => (typeof v === 'string' ? v : String(v));
  const debug = ctx.getExtension('WEBGL_debug_renderer_info');
  const highp = ctx.getShaderPrecisionFormat(ctx.FRAGMENT_SHADER, ctx.HIGH_FLOAT);
  return {
    renderer: str(debug ? ctx.getParameter(debug.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)),
    vendor: str(debug ? ctx.getParameter(debug.UNMASKED_VENDOR_WEBGL) : ctx.getParameter(ctx.VENDOR)),
    unmasked: !!debug,
    version: str(ctx.getParameter(ctx.VERSION)),
    glsl: str(ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION)),
    webgl2: r.gl.capabilities.isWebGL2,
    maxTexture: r.gl.capabilities.maxTextureSize,
    highp: highp ? highp.precision : 0,
    extensions: Object.fromEntries(['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'OES_texture_float_linear', 'OES_texture_half_float_linear', 'EXT_float_blend'].map((e) => [e, ctx.getSupportedExtensions()?.includes(e) ?? false])),
  };
}

/**
 * Whether a WebGL 2 context can draw into a texture of this format (a framebuffer with it complete):
 * asked of a context of its own (not the renderer's: Three.js keeps track of what's bound in its own).
 */
export function canDrawInto(ctx: WebGL2RenderingContext, format: 'RGBA16F' | 'RGBA32F' | 'RGBA8') {
  ctx.getExtension('EXT_color_buffer_float');
  ctx.getExtension('EXT_color_buffer_half_float');
  const internal = format === 'RGBA16F' ? ctx.RGBA16F : format === 'RGBA32F' ? ctx.RGBA32F : ctx.RGBA8;
  const type = format === 'RGBA16F' ? ctx.HALF_FLOAT : format === 'RGBA32F' ? ctx.FLOAT : ctx.UNSIGNED_BYTE;
  const tex = ctx.createTexture(), fb = ctx.createFramebuffer();
  ctx.bindTexture(ctx.TEXTURE_2D, tex);
  ctx.texImage2D(ctx.TEXTURE_2D, 0, internal, 4, 4, 0, ctx.RGBA, type, null);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, fb);
  ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, tex, 0);
  const ok = ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) === ctx.FRAMEBUFFER_COMPLETE;
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.deleteFramebuffer(fb);
  ctx.deleteTexture(tex);
  return ok;
}
