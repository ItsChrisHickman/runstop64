import * as THREE from 'three';
import { EffectsLayer } from './effects-layer';
import { bandRows, HdLayer } from './hd/layer';
import type { HdRoom, HdSprite } from './hd/scene';
import type { EffectsModel } from './effects';
import type { ScreenPoint } from './input';
import type { PictureLayout } from './layout';
import { Sparkles, type Marker } from './overlay';
import type { Palette } from './palette';
import { Surface } from './surface';

/**
 * Three.js renderer for a C64-sized screen.
 *
 * - The playfield is a Surface (indexed pixels) shown as a nearest-filtered
 *   texture, scaled by a whole number so pixels stay square and crisp.
 * - Sprites are separate quads with float positions, so they can be drawn
 *   between game ticks (interpolated) for smooth motion at any refresh rate.
 * - The area around the screen is filled with the border colour.
 *
 * Because everything is a Three.js scene, other views (voxels, a CRT in a
 * room, WebXR) can be built from the same Surfaces later.
 */
export interface SpriteHandle {
  surface: Surface | null;
  x: number;
  y: number;
  visible: boolean;
  /** Draw order; higher is in front. */
  z: number;
  /** The machine's sprite number it shows, if it shows one (the HD view tells the player's apart). */
  n?: number;
}

/**
 * What games, the shared front ends and the touch layer use of the renderer: PixelRenderer is
 * one; the headless tests' stand-in (games/shared/test/kit.ts) is another. Code that takes a
 * renderer takes this, so either will do.
 */
export interface Renderer {
  readonly screen: Surface;
  /** What the colour indexes (screen, border, background) mean: the C64's unless set. */
  palette: Palette;
  border: number;
  background: number;
  snap: boolean;
  borderBands: number[] | null;
  frame: ScreenPoint;
  area: { x: number; y: number; w: number; h: number } | null;
  clientToLocal: ((clientX: number, clientY: number) => ScreenPoint) | null;
  backdrop: Surface | null;
  layout: PictureLayout | null;
  readonly sparkles: { set(markers: Marker[]): void };
  readonly effects: { readonly model: EffectsModel; enabled: boolean };
  /**
   * The HD view (hd/): the room to draw lit in 3D, set each frame by the game while it's on; null draws
   * the picture as the C64 did. Not `available` (for the rest of the session) where the GL can't draw it.
   */
  readonly hd: { room: HdRoom | null; readonly available: boolean };
  hideSprites(): void;
  createSprite(z?: number): SpriteHandle;
  toScreen(clientX: number, clientY: number): ScreenPoint;
  toScreenLocal(x: number, y: number): ScreenPoint;
  render(): void;
}

interface TexEntry { tex: THREE.DataTexture; version: number; data: Uint8Array }

export class PixelRenderer implements Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  /** What's drawn over the picture (sparkles, effects): over the HD view too. */
  readonly overlay = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly screen: Surface;
  /** What the colour indexes mean (the screen surface follows it; a sprite's surface has its own `palette`). */
  get palette(): Palette { return this.screen.palette; }
  set palette(p: Palette) { this.screen.palette = p; this.screen.version++; }
  border = 0;
  /** Colour shown wherever the screen surface is transparent ($D021). */
  background = 0;
  /** Round sprite positions to whole C64 pixels (authentic) instead of smooth sub-pixel motion. */
  snap = false;
  /**
   * Horizontal colour bands drawn over the whole border (top to bottom), like a
   * tape/disk turbo loader's raster bars. null = plain border colour.
   */
  borderBands: number[] | null = null;
  /** Border (in C64 pixels) always kept visible around the screen, like a real C64's 32×36. */
  frame = { x: 0, y: 0 };
  /**
   * Where on the canvas the picture goes (CSS px from the canvas's top left), e.g. between
   * on-screen controls on a phone; the border colour still fills the whole canvas. null = all of it.
   */
  area: { x: number; y: number; w: number; h: number } | null = null;
  /**
   * Turns a pointer's client position into the canvas's own CSS px, for a canvas shown turned
   * (the page drawn sideways on a phone). Unset: the canvas is upright where it's laid out.
   */
  clientToLocal: ((clientX: number, clientY: number) => { x: number; y: number }) | null = null;

  private screenEntry: TexEntry;
  private textures = new WeakMap<Surface, TexEntry>();
  private sprites: { handle: SpriteHandle; mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> }[] = [];
  private unitPlane = new THREE.PlaneGeometry(1, 1);
  private view = { x: 0, y: 0, scale: 1 };
  private bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  /**
   * Optional per-pixel background layer (C64 background colours, which can
   * change per raster row) drawn behind behind-priority sprites. When null,
   * `background` fills it with one colour.
   */
  backdrop: Surface | null = null;
  /**
   * The picture laid out differently from how the machine draws it (layout.ts: parts moved, labels
   * added), with the sprites (C64View), the sparkles and the effects moved to match. null: as drawn.
   */
  layout: PictureLayout | null = null;
  /** Effects over the picture (places marked with sparkles). */
  readonly sparkles: Sparkles;
  /** Combat effects over the picture (bursts, flashes, trails, the hurt flash and shake: effects.ts). */
  readonly effects: EffectsLayer;
  /** The HD view: the room lit in 3D (hd/), drawn in its band of the picture instead of the C64's while `hd.room` is set. */
  readonly hd = new HdLayer();
  /** The time (ms) a frame is drawn at (the HD view's flicker, dust, embers; sparkles, effects): the page's clock; the HD test page fixes it. */
  clock: () => number = () => performance.now();

  constructor(readonly canvas: HTMLCanvasElement, readonly width = 320, readonly height = 200) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.gl.setPixelRatio(1); // we size the drawing buffer ourselves in device pixels
    this.camera = new THREE.OrthographicCamera(0, width, 0, -height, -100, 100);
    this.screen = new Surface(width, height, 0);
    this.screenEntry = this.entryFor(this.screen);
    // Layers, back to front: background colour, behind-priority sprites (z<0),
    // the character screen (transparent where pixels are off), other sprites.
    const bgPlane = new THREE.Mesh(this.unitPlane, this.bgMaterial);
    bgPlane.scale.set(width, height, 1);
    bgPlane.position.set(width / 2, -height / 2, -50);
    this.scene.add(bgPlane);
    const screenMesh = new THREE.Mesh(
      this.unitPlane,
      new THREE.MeshBasicMaterial({ map: this.screenEntry.tex, transparent: true, alphaTest: 0.5 }),
    );
    screenMesh.scale.set(width, height, 1);
    screenMesh.position.set(width / 2, -height / 2, 0);
    this.scene.add(screenMesh);
    this.sparkles = new Sparkles(this.overlay);
    this.effects = new EffectsLayer(this.overlay);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    this.resize();
  }

  /** Hide every sprite (e.g. when switching programs). */
  hideSprites() {
    for (const { handle } of this.sprites) handle.visible = false;
  }

  createSprite(z = 1): SpriteHandle {
    const handle: SpriteHandle = { surface: null, x: 0, y: 0, visible: false, z };
    const mesh = new THREE.Mesh(this.unitPlane, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5 }));
    mesh.visible = false;
    this.scene.add(mesh);
    this.sprites.push({ handle, mesh });
    return handle;
  }

  private entryFor(surface: Surface): TexEntry {
    let e = this.textures.get(surface);
    if (!e) {
      const data = new Uint8Array(surface.width * surface.height * 4);
      const tex = new THREE.DataTexture(data, surface.width, surface.height, THREE.RGBAFormat);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      e = { tex, version: -1, data };
      this.textures.set(surface, e);
    }
    if (e.version !== surface.version) {
      surface.toRGBA(e.data);
      e.tex.needsUpdate = true;
      e.version = surface.version;
    }
    return e;
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) this.gl.setSize(w, h, false);
  }

  /** Convert a pointer position (client px) to C64 screen pixels. */
  toScreen(clientX: number, clientY: number) {
    if (this.clientToLocal) {
      const p = this.clientToLocal(clientX, clientY);
      return this.toScreenLocal(p.x, p.y);
    }
    const rect = this.canvas.getBoundingClientRect();
    return this.toScreenLocal(clientX - rect.left, clientY - rect.top);
  }

  /** Convert a position on the canvas (CSS px from its top left, as laid out) to C64 screen pixels. */
  toScreenLocal(x: number, y: number) {
    const dpr = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    const px = x * dpr, py = y * dpr;
    // Viewport y is measured from the bottom in WebGL.
    const top = this.canvas.height - this.view.y - this.height * this.view.scale;
    return { x: (px - this.view.x) / this.view.scale, y: (py - top) / this.view.scale };
  }

  render() {
    this.entryFor(this.screen);
    const now = this.clock();
    this.sparkles.update(now, this.layout);
    // (a hurt shakes the picture a pixel or two: the camera moves the other way)
    const shake = this.effects.update(now, this.layout);
    this.camera.position.set(-shake.x, shake.y, 0);
    for (const { handle, mesh } of this.sprites) {
      mesh.visible = handle.visible && !!handle.surface;
      if (!mesh.visible || !handle.surface) continue;
      const s = handle.surface;
      const tex = this.entryFor(s).tex;
      if (mesh.material.map !== tex) {
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
      }
      const x = this.snap ? Math.round(handle.x) : handle.x;
      const y = this.snap ? Math.round(handle.y) : handle.y;
      mesh.scale.set(s.width, s.height, 1);
      mesh.position.set(x + s.width / 2, -(y + s.height / 2), handle.z);
    }

    // Centred; the border colour fills the rest. A whole-number scale keeps every pixel the
    // same size, unless that would waste much of the screen (phones): then it fills the space,
    // and on a small screen the border kept around the picture is just a thin margin.
    const cw = this.canvas.width, ch = this.canvas.height;
    const k = cw / Math.max(1, this.canvas.clientWidth); // device px per CSS px
    const a = this.area;
    const ax = a ? Math.round(a.x * k) : 0, ay = a ? Math.round(a.y * k) : 0;
    const aw = a ? Math.round(a.w * k) : cw, ah = a ? Math.round(a.h * k) : ch;
    const small = (a ? a.w : this.canvas.clientWidth) < 700 || (a ? a.h : this.canvas.clientHeight) < 500;
    const fx = small ? Math.min(this.frame.x, 4) : this.frame.x, fy = small ? Math.min(this.frame.y, 4) : this.frame.y;
    const fit = Math.min(aw / (this.width + 2 * fx), ah / (this.height + 2 * fy));
    const scale = fit >= 1 && Math.floor(fit) / fit >= (small ? 0.97 : 0.85) ? Math.floor(fit) : fit;
    const vw = Math.round(this.width * scale), vh = Math.round(this.height * scale);
    // (WebGL's viewport y counts from the bottom)
    const vx = ax + Math.floor((aw - vw) / 2), vy = ch - ay - ah + Math.floor((ah - vh) / 2);
    this.view = { x: vx, y: vy, scale };

    if (this.backdrop) {
      const tex = this.entryFor(this.backdrop).tex;
      if (this.bgMaterial.map !== tex) {
        this.bgMaterial.map = tex;
        this.bgMaterial.color.set(0xffffff);
        this.bgMaterial.needsUpdate = true;
      }
    } else {
      if (this.bgMaterial.map) { this.bgMaterial.map = null; this.bgMaterial.needsUpdate = true; }
      this.bgMaterial.color.set(this.palette.rgb[this.background & 15]);
    }
    const border = new THREE.Color(this.palette.rgb[this.border & 15]); // hex is sRGB; three converts
    this.gl.setScissorTest(false);
    this.gl.setClearColor(border, 1);
    this.gl.clear();
    if (this.borderBands?.length) {
      const bands = this.borderBands;
      this.gl.setScissorTest(true);
      for (let i = 0; i < bands.length; i++) {
        const y0 = Math.floor((i * ch) / bands.length), y1 = Math.floor(((i + 1) * ch) / bands.length);
        this.gl.setScissor(0, ch - y1, cw, y1 - y0);
        this.gl.setClearColor(new THREE.Color(this.palette.rgb[bands[i] & 15]), 1);
        this.gl.clear();
      }
      this.gl.setScissorTest(false);
    }
    this.gl.setViewport(vx, vy, vw, vh);
    this.gl.setScissor(vx, vy, vw, vh);
    this.gl.setScissorTest(true);
    const room = this.hd.available ? this.hd.room : null;
    if (room) {
      // the HD view: the C64's picture first, in the room's band without the sprites (the room is drawn
      // over it, showing it dimmed where it leaves a gap), above and below it as it is (a header, a
      // status line); then the room
      const { top, bottom } = bandRows(room.band, vh);
      const shown = this.sprites.filter(({ mesh }) => mesh.visible);
      for (const { mesh } of shown) mesh.visible = false;
      this.gl.setScissor(vx, vy + vh - bottom, vw, bottom - top);
      this.gl.render(this.scene, this.camera);
      for (const { mesh } of shown) mesh.visible = true;
      this.gl.autoClear = false;
      for (const [y0, y1] of [[0, top], [bottom, vh]]) {
        if (y1 <= y0) continue;
        this.gl.setScissor(vx, vy + vh - y1, vw, y1 - y0);
        this.gl.render(this.scene, this.camera);
      }
      this.gl.setScissor(vx, vy, vw, vh);
      const picture = { front: this.screen.pixels, back: this.backdrop?.pixels ?? null, background: this.background, version: this.screen.version + (this.backdrop?.version ?? 0) };
      if (!this.hd.render(this.gl, now, this.hdSprites(), picture, { x: vx, y: vy, w: vw, h: vh }, shake)) {
        // (where the HD view couldn't be drawn: the C64's picture)
        this.gl.setViewport(vx, vy, vw, vh);
        this.gl.setScissor(vx, vy, vw, vh);
        this.gl.setScissorTest(true);
        this.gl.autoClear = true;
        this.gl.render(this.scene, this.camera);
        this.gl.autoClear = false;
      }
    } else {
      this.gl.render(this.scene, this.camera);
      this.gl.autoClear = false;
    }
    this.gl.render(this.overlay, this.camera);
    this.gl.autoClear = true;
  }

  /** The sprites as shown (moving smoothly; those drawn under the screen set behind the characters), for the HD view. */
  private hdSprites(): HdSprite[] {
    const sprites: HdSprite[] = [];
    for (const { handle: h } of this.sprites) {
      if (!h.visible || !h.surface) continue;
      const s = h.surface;
      sprites.push({ n: h.n ?? -1, x: this.snap ? Math.round(h.x) : h.x, y: this.snap ? Math.round(h.y) : h.y, w: s.width, h: s.height, pixels: s.pixels, version: s.version, behind: h.z < 0 });
    }
    return sprites;
  }
}
