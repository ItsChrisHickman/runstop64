import * as THREE from 'three';
import { C64_PALETTE } from '../palette';
import { TRANSPARENT } from '../surface';
import { HdModel, MAX_LIGHTS, type HdRoom, type HdScene, type HdSprite } from './scene';

/**
 * Draws the HD view's model (scene.ts) with Three.js: a thin mapping of the HdScene, step for step
 * what the tests' software renderer (packages/c64kit/test/hd-raster.ts) does, with the same formulas:
 *
 * - behind everything, the C64's own picture (`backdrop`): dimmed where the room leaves a gap, as it is
 *   where it's what's seen past the room (a sky: the surface's `open`, as a texture);
 * - the room: one instanced quad a pixel, each with its place, normal, colour, glow and occlusion
 *   (rebuilt when the room changes), lit by the shader's `surfaceLight` (scene.ts `surfaceLight`:
 *   `irradiance`, the floors' glints, the haze further back); billboards: a quad each with the
 *   sprite's pixels (lying on the floor for a patch of it, lit as the floor; else as scene.ts
 *   `spriteLight`);
 * - shadows (dark ellipses lying on the floor) and particles (soft dots, added);
 * - into a render target whose alpha says where light may spread (what's drawn in a colour: not black,
 *   not a sprite standing); then at half size bloom, a softened copy and light shafts (what's
 *   brightest, smeared out from the lights), and a composite: depth of field by depth and the
 *   tilt-shift round his line, bloom and shafts, all only where light may spread; vignette, exposure,
 *   the tone curve, to sRGB; drawn in the room's band of the picture.
 *
 * The camera is the model's matrix as it is (world -> clip): no Three.js camera maths.
 *
 * The budget, for a mid-range phone at 60 frames a second (16.7 ms a frame):
 * - JavaScript a frame drawn: the model's frame and this layer's, under 1 ms here (about 4 ms on a
 *   phone); a room built again costs an upload of its arrays, no building per vertex.
 * - The game's frames (50 a second): the room kept or moved for a scroll, about 0.3 ms here (the
 *   picture compared, already decoded by C64View); a room built again for a scroll off the main thread
 *   (about 11 ms here); coming into another room too (the C64's picture stays till it's back: games/shared/test/hd.ts
 *   `checkHdEntry`), the layer's part a few ms.
 * - The GPU: the scene at most INTERNAL lines high (960×600 for a full picture: the band about 960×410),
 *   one draw of the room's 35-50 thousand quads, at most MAX_LIGHTS lights a pixel; at half that size
 *   bloom, the softened copy and the shafts (SHAFTS samples towards each of at most 3 lights); the
 *   composite once over the band at the device's pixels.
 */
/** The scene target's alpha where the room is drawn black (test/hd-raster.ts ROOM_BLACK): softened only among colours. */
const ROOM_BLACK = '0.25';

const LIGHTING = `
  #define MAX_LIGHTS ${MAX_LIGHTS}
  uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uKey; uniform vec3 uTowards;
  uniform int uLightCount;
  uniform vec3 uLightPos[MAX_LIGHTS]; uniform vec3 uLightColour[MAX_LIGHTS]; uniform float uLightRange[MAX_LIGHTS];
  float falloff(float d, float range) {
    float r = d / range;
    if (r >= 1.0) return 0.0;
    float w = 1.0 - r * r;
    return w * w / (1.0 + 8.0 * r * r);
  }
  vec3 irradiance(vec3 p, vec3 n, float ao) {
    vec3 e = (mix(uGround, uSky, n.y * 0.5 + 0.5) + uKey * max(0.0, dot(n, uTowards))) * ao;
    float lit = 0.6 + 0.4 * ao;
    for (int i = 0; i < MAX_LIGHTS; i++) {
      if (i >= uLightCount) break;
      vec3 d = uLightPos[i] - p;
      float l = max(length(d), 1e-3);
      e += uLightColour[i] * falloff(l, uLightRange[i]) * max(0.0, dot(n, d / l)) * lit;
    }
    return e;
  }
`;

/** The room's surface: one quad (its corners ±1, ±1) drawn once per picture pixel, each with its own middle, half-edges, normal, colour, glow and occlusion. */
const surfaceVertex = `
  attribute vec3 centre; attribute vec3 edgeU; attribute vec3 edgeV; attribute vec3 facing; attribute vec3 colour; attribute vec3 glow; attribute float occlusion;
  uniform mat4 uCamera; uniform float uShift;
  varying vec3 vPos; varying vec3 vNormal; varying vec3 vColour; varying vec3 vGlow; varying float vAo;
  void main() {
    vec3 p = centre + position.x * edgeU + position.y * edgeV + vec3(uShift, 0.0, 0.0);
    vPos = p; vNormal = facing; vColour = colour; vGlow = glow; vAo = occlusion;
    gl_Position = uCamera * vec4(p, 1.0);
  }`;
/** (scene.ts surfaceLight: uGloss is gloss, shine; uHaze near, far, how much) */
const surfaceFragment = `
  ${LIGHTING}
  uniform float uGlow; uniform vec2 uGloss; uniform vec3 uEye; uniform vec3 uHaze; uniform vec3 uTint;
  varying vec3 vPos; varying vec3 vNormal; varying vec3 vColour; varying vec3 vGlow; varying float vAo;
  void main() {
    vec3 n = normalize(vNormal), c = vColour * irradiance(vPos, n, vAo);
    float drawn = max(vColour.r, max(vColour.g, vColour.b));
    if (n.y > 0.9) {
      float dark = min(1.0, 6.0 * drawn);
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        vec3 d = uLightPos[i] - vPos;
        float l = max(length(d), 1e-3);
        c += uLightColour[i] * falloff(l, uLightRange[i]) * pow(max(0.0, dot(n, normalize(d / l + uEye))), uGloss.y) * uGloss.x * dark;
      }
    }
    float k = clamp((vPos.z - uHaze.x) / (uHaze.y - uHaze.x), 0.0, 1.0) * uHaze.z, lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(c, lum * uTint, k) * (1.0 - 0.4 * k);
    // (alpha: light may spread here, over what's drawn in a colour; a quarter: the room drawn black)
    gl_FragColor = vec4(c + vGlow * uGlow, drawn > 0.0 ? 1.0 : ${ROOM_BLACK});
  }`;

const billboardVertex = `
  uniform mat4 uCamera;
  varying vec3 vPos; varying vec2 vUv;
  void main() {
    vec4 p = modelMatrix * vec4(position, 1.0);
    vPos = p.xyz; vUv = uv;
    gl_Position = uCamera * p;
  }`;
const billboardFragment = `
  ${LIGHTING}
  uniform sampler2D uMap; uniform vec3 uSprites; // (scene.ts spriteLight: self, tint, most)
  uniform float uFlat; // (1: a patch of the floor lying on it, lit as the floor)
  varying vec3 vPos; varying vec2 vUv;
  vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
  void main() {
    vec4 t = texture2D(uMap, vUv);
    if (t.a < 0.5) discard;
    vec3 c = linear(t.rgb);
    if (uFlat > 0.5) { gl_FragColor = vec4(c * irradiance(vPos, vec3(0.0, 1.0, 0.0), 1.0), max(c.r, max(c.g, c.b)) > 0.0 ? 1.0 : ${ROOM_BLACK}); return; }
    vec3 e = irradiance(vPos, vec3(0.0, 0.0, -1.0), 1.0);
    float y = max(1e-4, dot(e, vec3(0.2126, 0.7152, 0.0722)));
    // (alpha 0: a sprite standing, which the light spreading round it doesn't wash over)
    gl_FragColor = vec4(c * min(uSprites.z, y + uSprites.x) * (1.0 + (e / y - 1.0) * uSprites.y), 0.0);
  }`;

/** Behind everything: the C64's picture (where the room leaves a gap, dimmed; what's seen past the room as it is). */
const backdropVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
const backdropFragment = `
  uniform sampler2D uPicture; uniform sampler2D uOpen; uniform vec3 uOpenAt; // (the band's pixels: its shift, top and height in picture pixels)
  uniform float uBackdrop;
  varying vec2 vUv;
  vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
  void main() {
    vec3 c = linear(texture2D(uPicture, vUv).rgb);
    vec2 o = vec2((floor(vUv.x * 320.0) - uOpenAt.x) / 320.0, ((1.0 - vUv.y) * 200.0 - uOpenAt.y) / uOpenAt.z);
    float open = o.x >= 0.0 && o.x < 1.0 && o.y >= 0.0 && o.y < 1.0 ? texture2D(uOpen, o).r : 0.0;
    gl_FragColor = vec4(c * mix(uBackdrop, 1.0, open), max(c.r, max(c.g, c.b)) > 0.0 ? 1.0 : 0.0);
  }`;

const shadowVertex = `
  uniform mat4 uCamera;
  varying vec2 vUv;
  void main() { vUv = uv * 2.0 - 1.0; gl_Position = uCamera * modelMatrix * vec4(position, 1.0); }`;
const shadowFragment = `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() { float r = length(vUv); if (r >= 1.0) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha * (1.0 - r * r)); }`;

const particleVertex = `
  attribute vec3 colour; attribute float size;
  uniform mat4 uCamera; uniform float uUnit;
  varying vec3 vColour;
  void main() {
    vColour = colour;
    gl_Position = uCamera * vec4(position, 1.0);
    gl_PointSize = 2.0 * size * uUnit / gl_Position.w;
  }`;
const particleFragment = `
  varying vec3 vColour;
  void main() {
    float d = length(gl_PointCoord * 2.0 - 1.0);
    if (d >= 1.0) discard;
    gl_FragColor = vec4(vColour * (1.0 - d) * (1.0 - d), 1.0);
  }`;

const passVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const brightFragment = `
  uniform sampler2D uSrc; uniform float uThreshold; varying vec2 vUv;
  void main() { gl_FragColor = vec4(max(texture2D(uSrc, vUv).rgb - uThreshold, 0.0), 1.0); }`;
/** A gaussian blur along one direction (colour and alpha: where light may spread, softened too): 13 taps a third of a sigma apart. */
const blurFragment = `
  uniform sampler2D uSrc; uniform vec2 uStep; varying vec2 vUv;
  void main() {
    vec4 a = vec4(0.0); float sum = 0.0;
    for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 18.0); a += texture2D(uSrc, vUv + uStep * float(i)).rgba * w; sum += w; }
    gl_FragColor = a / sum;
  }`;
/** How many samples along a shaft (test/hd-raster.ts SHAFT_SAMPLES), and how soft what they're smeared from (SHAFT_SOFT: sigma, half-size pixels). */
const SHAFTS = 24, SHAFT_SOFT = 3;
/** Light shafts (test/hd-raster.ts `shafts`): what's brightest, along the way towards each light (uv; z: how strong), fading. */
const raysFragment = `
  uniform sampler2D uSrc; uniform vec3 uRays[3]; uniform int uRayCount; uniform float uLength; varying vec2 vUv;
  void main() {
    vec3 a = vec3(0.0);
    for (int r = 0; r < 3; r++) {
      if (r >= uRayCount) break;
      vec3 s = vec3(0.0);
      for (int j = 0; j < ${SHAFTS}; j++) {
        float t = float(j) / ${SHAFTS}.0;
        s += texture2D(uSrc, vUv + (uRays[r].xy - vUv) * t * uLength).rgb * (1.0 - t);
      }
      a += s * uRays[r].z / ${SHAFTS}.0;
    }
    gl_FragColor = vec4(a, 1.0);
  }`;
const compositeFragment = `
  uniform sampler2D uSharp; uniform sampler2D uSoft; uniform sampler2D uBloom; uniform sampler2D uRays; uniform sampler2D uDepth;
  uniform vec4 uDepthToZ; // (za, zb, 1/D, c): ndc z = (za z + zb) / (z / D + c)
  uniform float uFocus; uniform float uRange; uniform vec4 uTiltShift; // (his line, the band's height in picture pixels, sharp, ramp)
  uniform float uStrength; uniform float uRaysStrength; uniform float uVignette; uniform float uExposure;
  uniform vec2 uBand; // the band's bottom and top, as uv.y
  varying vec2 vUv;
  float tonemap(float v) { return v <= 0.8 ? v : 0.8 + 0.2 * (1.0 - exp(-(v - 0.8) / 0.2)); }
  float srgb(float c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055; }
  void main() {
    float n = texture2D(uDepth, vUv).x * 2.0 - 1.0;
    float z = n >= 1.0 ? 1e4 : (uDepthToZ.y - n * uDepthToZ.w) / (n * uDepthToZ.z - uDepthToZ.x);
    vec4 sharp = texture2D(uSharp, vUv), soft = texture2D(uSoft, vUv);
    // (out of focus by depth, or above or below his line; only where light may spread, or the room drawn
    // black among colours: test/hd-raster.ts softens)
    float air = step(0.75, sharp.a), room = step(0.1, sharp.a) * (1.0 - air), t = clamp((soft.a - 0.5) / 0.3, 0.0, 1.0);
    float byLine = clamp((abs((1.0 - vUv.y) * 200.0 - uTiltShift.x) / uTiltShift.y - uTiltShift.z) / uTiltShift.w, 0.0, 1.0);
    float f = max(min(1.0, abs(z - uFocus) / uRange), byLine) * max(air, room * t * t * (3.0 - 2.0 * t));
    vec2 e = vec2((vUv.x - 0.5) * 2.0, ((vUv.y - uBand.x) / (uBand.y - uBand.x) - 0.5) * 2.0);
    float vig = 1.0 - uVignette * min(1.0, dot(e, e) * 0.5);
    vec3 c = (mix(sharp.rgb, soft.rgb, f) + air * (texture2D(uBloom, vUv).rgb * uStrength + texture2D(uRays, vUv).rgb * uRaysStrength)) * vig * uExposure;
    gl_FragColor = vec4(srgb(tonemap(c.r)), srgb(tonemap(c.g)), srgb(tonemap(c.b)), 1.0);
  }`;

/**
 * The most lines the scene and its passes are drawn at (three times the C64's 200): a phone's
 * picture, a thousand device pixels high and more, is drawn at this and scaled up by the composite.
 */
const INTERNAL = 600;

/** The scene's layers: the room (and what lies on it), and the sprites standing in it, drawn after the softened copy is taken. */
const ROOM = 0, STANDING = 1;

/** At most this many particles drawn. */
const MAX_PARTICLES = 1024;

/** A sprite's pixels as an RGBA texture (sRGB bytes, decoded in the shader), made again when they change. */
interface SpriteTexture { tex: THREE.DataTexture; version: number }

/**
 * The C64's picture as the renderer has it: `front` the characters (TRANSPARENT where the background
 * shows), `back` the background behind them (null: all `background`), and a number that changes when
 * either does.
 */
export interface HdPicture { front: Uint8Array; back: Uint8Array | null; background: number; version: number }

/** The rows of the picture's viewport (device pixels from its top, `vh` high) the room's band takes: one rounding for the HD view and the C64's picture round it. */
export function bandRows(band: { y: number; h: number }, vh: number) {
  return { top: Math.round((band.y * vh) / 200), bottom: Math.round(((band.y + band.h) * vh) / 200) };
}

/** The render targets: the scene (with its depth); at half its size bloom (a, b: b also every blur's go-between), the softened copy, and the shafts (what they're from, and them). */
interface Targets { w: number; h: number; sharp: THREE.WebGLRenderTarget; a: THREE.WebGLRenderTarget; b: THREE.WebGLRenderTarget; soft: THREE.WebGLRenderTarget; from: THREE.WebGLRenderTarget; rays: THREE.WebGLRenderTarget }

export class HdLayer {
  readonly model = new HdModel();
  /**
   * The room to draw (the game sets it each frame while the HD view is on and play is showing), or
   * null: the picture as the C64 drew it.
   */
  room: HdRoom | null = null;
  /**
   * Why this GL can't draw the HD view, or null while it can: set for the rest of the session once a
   * shader of it failed to compile or link, or drawing it threw. The C64's picture is drawn instead
   * (and the front end turns its switch back to C64).
   */
  failure: string | null = null;
  get available() { return this.failure === null; }
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly cameraMatrix = new THREE.Matrix4();
  private readonly lighting = {
    uSky: { value: new THREE.Vector3() }, uGround: { value: new THREE.Vector3() }, uKey: { value: new THREE.Vector3() }, uTowards: { value: new THREE.Vector3() }, uLightCount: { value: 0 },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    uLightColour: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    uLightRange: { value: new Array<number>(MAX_LIGHTS).fill(1) },
    uCamera: { value: this.cameraMatrix }, uGlow: { value: 1 }, uSprites: { value: new THREE.Vector3() },
  };
  /** How far the surface is moved for a scroll (the room's shift as drawn), and how the surfaces take the light. */
  private readonly surfaceUniforms = {
    uShift: { value: 0 }, uGloss: { value: new THREE.Vector2() }, uEye: { value: new THREE.Vector3() }, uHaze: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3() },
  };
  /**
   * The room's surface: one quad drawn once per pixel (instanced), the surface's own arrays its
   * attributes as they are (no copying or building per vertex: a new room costs an upload, no more).
   */
  private readonly surface = new THREE.Mesh(new THREE.InstancedBufferGeometry(), new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: surfaceFragment, uniforms: { ...this.lighting, ...this.surfaceUniforms }, side: THREE.DoubleSide }));
  /** The places and the colours the surface's geometry was made from (rooms sharing them share it). */
  private built: Float32Array | null = null;
  private painted: Float32Array | null = null;
  /** Behind the room: the C64's picture (made again when it changes), and what's seen past the room (the surface's `open`, white where it is, made with the geometry). */
  private readonly picture = new THREE.DataTexture(new Uint8Array(320 * 200 * 4), 320, 200, THREE.RGBAFormat);
  private pictureVersion = -1;
  private open: THREE.DataTexture | null = null;
  private readonly backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: backdropVertex, fragmentShader: backdropFragment, depthTest: false, depthWrite: false,
    uniforms: { uPicture: { value: this.picture }, uOpen: { value: null }, uOpenAt: { value: new THREE.Vector3() }, uBackdrop: { value: 0 } },
  }));
  private readonly quad = new THREE.PlaneGeometry(1, 1);
  private readonly billboards: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private readonly shadows: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private readonly textures = new WeakMap<Uint8Array, SpriteTexture>();
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly particles = { pos: new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3), colour: new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3), size: new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1) };
  private readonly unit = { value: 1 };
  private targets: Targets | null = null;
  /** What the targets hold: half floats (light brighter than white kept for the bloom) where the GL can draw into them, else bytes. */
  private targetType: THREE.TextureDataType = THREE.HalfFloatType;
  /** What the render targets hold (as far as drawn yet): 'half float', or 'byte' where the GL couldn't draw into half floats. */
  get precision() { return this.targetType === THREE.HalfFloatType ? 'half float' : 'byte'; }
  private readonly pass = { scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mesh: new THREE.Mesh(new THREE.PlaneGeometry(2, 2)) };
  private readonly bright = new THREE.ShaderMaterial({ vertexShader: passVertex, fragmentShader: brightFragment, uniforms: { uSrc: { value: null }, uThreshold: { value: 1 } }, depthTest: false, depthWrite: false });
  private readonly blurMat = new THREE.ShaderMaterial({ vertexShader: passVertex, fragmentShader: blurFragment, uniforms: { uSrc: { value: null }, uStep: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  private readonly raysMat = new THREE.ShaderMaterial({
    vertexShader: passVertex, fragmentShader: raysFragment, depthTest: false, depthWrite: false,
    uniforms: { uSrc: { value: null }, uRays: { value: Array.from({ length: 3 }, () => new THREE.Vector3()) }, uRayCount: { value: 0 }, uLength: { value: 0 } },
  });
  private readonly composite = new THREE.ShaderMaterial({
    vertexShader: passVertex, fragmentShader: compositeFragment, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    uniforms: {
      uSharp: { value: null }, uSoft: { value: null }, uBloom: { value: null }, uRays: { value: null }, uDepth: { value: null }, uDepthToZ: { value: new THREE.Vector4() },
      uFocus: { value: 0 }, uRange: { value: 1 }, uTiltShift: { value: new THREE.Vector4() }, uStrength: { value: 0 }, uRaysStrength: { value: 0 },
      uVignette: { value: 0 }, uExposure: { value: 1 }, uBand: { value: new THREE.Vector2(0, 1) },
    },
  });

  constructor() {
    this.camera.matrixAutoUpdate = false;
    this.surface.frustumCulled = false;
    this.scene.add(this.surface);
    this.picture.magFilter = this.picture.minFilter = THREE.NearestFilter;
    this.picture.generateMipmaps = false;
    this.backdrop.frustumCulled = false;
    this.backdrop.renderOrder = -10;
    this.scene.add(this.backdrop);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.particles.pos.setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('colour', this.particles.colour.setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', this.particles.size.setUsage(THREE.DynamicDrawUsage));
    // (added: light, only where light may spread, the target's alpha, which is left as it is)
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: particleVertex, fragmentShader: particleFragment, uniforms: { uCamera: this.lighting.uCamera, uUnit: this.unit },
      transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.DstAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.scene.add(this.points);
    this.pass.mesh.frustumCulled = false;
    this.pass.scene.add(this.pass.mesh);
  }

  /**
   * Draw the room at time `t` (ms) with these sprites (`picture`: the C64's picture as the renderer
   * has it: behind the room, and its characters in front of sprites set behind them, HdModel.frame's),
   * into the picture's viewport (device pixels: x, y from the bottom left, w × h for the 320×200
   * picture), only in the room's band, moved by `shake` (C64 pixels, as a hurt shakes the picture).
   * Returns whether it was drawn: false (and `failure` set from then on) if the GL couldn't (a shader
   * that didn't compile or link, or a throw), and the caller draws the C64's picture there instead.
   * Leaves the renderer drawing to the canvas, with the picture's viewport, the band's scissor and the
   * scissor test on.
   */
  render(gl: THREE.WebGLRenderer, t: number, sprites: HdSprite[], picture: HdPicture | null, view: { x: number; y: number; w: number; h: number }, shake = { x: 0, y: 0 }): boolean {
    const room = this.room;
    if (!room || this.failure !== null) return false;
    // (Three.js reports a program that didn't compile or link here, in the render that first uses it)
    const before = gl.debug.onShaderError;
    let failure: string | null = null;
    gl.debug.onShaderError = (ctx, program, vs, fs) => {
      failure = ['a shader of the HD view did not compile or link', ctx.getProgramInfoLog(program), ctx.getShaderInfoLog(vs), ctx.getShaderInfoLog(fs)].map((l) => l?.trim() ?? '').filter((l) => l).join('\n');
    };
    try {
      this.draw(gl, t, room, sprites, picture, view, shake);
    } catch (e) {
      failure ??= e instanceof Error ? e.stack ?? e.message : String(e);
    } finally {
      gl.debug.onShaderError = before;
    }
    if (failure === null) return true;
    this.failure = failure;
    gl.setRenderTarget(null);
    console.error(`HD view: not available here, the C64 view instead.\n${failure}`);
    return false;
  }

  private draw(gl: THREE.WebGLRenderer, t: number, room: HdRoom, sprites: HdSprite[], picture: HdPicture | null, view: { x: number; y: number; w: number; h: number }, shake: { x: number; y: number }) {
    const scene = this.model.frame(t, room, sprites, picture?.front ?? null);
    this.build(room);
    this.paintPicture(picture);
    this.setLighting(scene);
    this.cameraMatrix.fromArray(scene.camera.matrix);
    this.place(scene);
    const post = scene.post, b = this.backdrop.material.uniforms;
    b.uOpen.value = this.open; b.uOpenAt.value.set(room.shift, room.band.y, room.band.h); b.uBackdrop.value = post.backdrop;
    // the scene and its passes at most INTERNAL lines high (a phone's device pixels are far more than
    // the picture needs: the composite scales it up), the band in them (rows from the bottom, as GL counts them)
    const k = Math.min(1, INTERNAL / view.h), iw = Math.max(1, Math.round(view.w * k)), ih = Math.max(1, Math.round(view.h * k));
    this.unit.value = ih / 200;
    const tg = this.targetsFor(gl, iw, ih);
    const rows = bandRows(room.band, ih), band = { y: ih - rows.bottom, h: rows.bottom - rows.top };
    // the scene, into the sharp target: all of it cleared (the passes read round the band), drawn only
    // in the band (what's outside it isn't part of the room). A target's own viewport and scissor (in
    // its pixels) are taken up when it's set as the target.
    tg.sharp.scissorTest = false;
    gl.setRenderTarget(tg.sharp);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    tg.sharp.scissor.set(0, band.y, iw, band.h);
    tg.sharp.scissorTest = true;
    // the room (everything but the sprites standing in it: layer ROOM); then, at half size, the softened
    // copy for the depth of field and the tilt-shift taken of it, so no sprite is ever smeared, nor
    // smeared round itself; then the sprites standing (layer STANDING) into the same target, depth-tested
    gl.setRenderTarget(tg.sharp);
    this.camera.layers.set(ROOM);
    gl.render(this.scene, this.camera);
    const unitHalf = this.unit.value / 2;
    this.blurMat.uniforms.uStep.value.set(0, 0);
    this.run(gl, this.blurMat, tg.sharp.texture, tg.soft); // (a copy, at half size)
    gl.setRenderTarget(tg.sharp);
    this.camera.layers.set(STANDING);
    const clears = gl.autoClear;
    gl.autoClear = false;
    gl.render(this.scene, this.camera);
    gl.autoClear = clears;
    this.camera.layers.set(ROOM);
    // at half size: bloom (the bright part, blurred), the softened copy blurred, and the shafts (what's
    // brightest, softened, smeared out from the lights)
    this.bright.uniforms.uThreshold.value = post.bloom.threshold;
    this.run(gl, this.bright, tg.sharp.texture, tg.a);
    this.blur(gl, tg.a, tg.b, post.bloom.radius * unitHalf);
    this.blur(gl, tg.soft, tg.b, post.dof.blur * unitHalf);
    this.bright.uniforms.uThreshold.value = post.rays.threshold;
    this.run(gl, this.bright, tg.sharp.texture, tg.from);
    this.blur(gl, tg.from, tg.b, SHAFT_SOFT);
    const r = this.raysMat.uniforms;
    scene.rays.forEach((ray, i) => r.uRays.value[i].set(ray.x / 320, 1 - ray.y / 200, ray.k));
    r.uRayCount.value = Math.min(3, scene.rays.length); r.uLength.value = post.rays.length;
    this.run(gl, this.raysMat, tg.from.texture, tg.rays);
    // the composite, onto the canvas in the band (moved with a shake, as the C64's picture is)
    const m = scene.camera.matrix, u = this.composite.uniforms;
    u.uSharp.value = tg.sharp.texture; u.uSoft.value = tg.soft.texture; u.uBloom.value = tg.a.texture; u.uRays.value = tg.rays.texture; u.uDepth.value = tg.sharp.depthTexture;
    u.uDepthToZ.value.set(m[10], m[14], m[11], m[15]);
    u.uFocus.value = scene.camera.focus; u.uRange.value = post.dof.range;
    u.uTiltShift.value.set(scene.camera.line, room.band.h, post.dof.sharp, post.dof.ramp);
    u.uStrength.value = post.bloom.strength; u.uRaysStrength.value = post.rays.strength;
    u.uVignette.value = post.vignette; u.uExposure.value = post.exposure;
    u.uBand.value.set(band.y / ih, (band.y + band.h) / ih);
    // (the canvas's viewport and scissor are set in CSS pixels, times the pixel ratio: ours are device pixels)
    const ratio = gl.getPixelRatio(), unit = view.h / 200, sx = Math.round(shake.x * unit), sy = Math.round(shake.y * unit);
    const shown = bandRows(room.band, view.h), dy = view.h - shown.bottom, dh = shown.bottom - shown.top;
    gl.setRenderTarget(null);
    gl.setViewport((view.x + sx) / ratio, (view.y - sy) / ratio, view.w / ratio, view.h / ratio);
    gl.setScissor(view.x / ratio, (view.y + dy) / ratio, view.w / ratio, dh / ratio);
    gl.setScissorTest(true);
    // (over the C64's picture the renderer drew there: not cleared)
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    this.pass.mesh.material = this.composite;
    gl.render(this.pass.scene, this.pass.camera);
    gl.autoClear = autoClear;
    gl.setViewport(view.x / ratio, view.y / ratio, view.w / ratio, view.h / ratio);
  }

  /**
   * The room's surface as one instanced mesh: the surface's arrays its per-quad attributes. Made
   * again only for new places; new colours (flames animating) put in; a shift moves it.
   */
  private build(room: HdRoom) {
    this.surfaceUniforms.uShift.value = room.shift;
    const s = room.surface, n = s.count;
    if (this.built !== s.centre) {
      this.built = s.centre;
      this.painted = null;
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.setAttribute('centre', new THREE.InstancedBufferAttribute(s.centre, 3));
      geo.setAttribute('edgeU', new THREE.InstancedBufferAttribute(s.u, 3));
      geo.setAttribute('edgeV', new THREE.InstancedBufferAttribute(s.v, 3));
      geo.setAttribute('facing', new THREE.InstancedBufferAttribute(s.normal, 3));
      geo.setAttribute('occlusion', new THREE.InstancedBufferAttribute(s.occlusion, 1));
      geo.setAttribute('colour', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('glow', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geo.instanceCount = n;
      this.surface.geometry.dispose();
      this.surface.geometry = geo;
      const h = s.open.length / 320, open = new Uint8Array(s.open.length * 4);
      for (let i = 0; i < s.open.length; i++) if (s.open[i]) open.fill(255, i * 4, i * 4 + 4);
      this.open?.dispose();
      this.open = new THREE.DataTexture(open, 320, h, THREE.RGBAFormat);
      this.open.magFilter = this.open.minFilter = THREE.NearestFilter;
      this.open.generateMipmaps = false;
      this.open.needsUpdate = true;
    }
    if (this.painted === s.colour) return;
    this.painted = s.colour;
    // (copied into the geometry's own: the GL's buffer filled again, not made again)
    const col = this.surface.geometry.getAttribute('colour'), glo = this.surface.geometry.getAttribute('glow');
    if (col instanceof THREE.BufferAttribute) { col.set(s.colour); col.needsUpdate = true; }
    if (glo instanceof THREE.BufferAttribute) { glo.set(s.glow); glo.needsUpdate = true; }
  }

  /** The C64's picture as a texture (rows bottom up, as textures go), made again when it changes. */
  private paintPicture(p: HdPicture | null) {
    const version = p ? p.version : -2;
    if (version === this.pictureVersion) return;
    this.pictureVersion = version;
    const data = this.picture.image.data;
    if (!(data instanceof Uint8Array)) return;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
      const i = y * 320 + x, f = p ? p.front[i] : 0, v = !p ? 0 : f !== TRANSPARENT ? f : p.back ? p.back[i] : p.background;
      const c = C64_PALETTE[v & 15], o = ((199 - y) * 320 + x) * 4;
      data[o] = c >> 16; data[o + 1] = (c >> 8) & 255; data[o + 2] = c & 255; data[o + 3] = 255;
    }
    this.picture.needsUpdate = true;
  }

  private setLighting(scene: HdScene) {
    const l = this.lighting, s = this.surfaceUniforms, look = scene.surfaces;
    const a = scene.ambient;
    l.uSky.value.set(...a.sky); l.uGround.value.set(...a.ground); l.uKey.value.set(...a.key); l.uTowards.value.set(...a.towards);
    l.uLightCount.value = scene.lights.length;
    l.uGlow.value = scene.glow;
    l.uSprites.value.set(scene.sprites.self, scene.sprites.tint, scene.sprites.most);
    scene.lights.forEach((light, i) => {
      l.uLightPos.value[i].set(light.x, light.y, light.z);
      l.uLightColour.value[i].set(light.colour[0] * light.intensity, light.colour[1] * light.intensity, light.colour[2] * light.intensity);
      l.uLightRange.value[i] = light.range;
    });
    s.uGloss.value.set(look.gloss, look.shine); s.uEye.value.set(...look.eye); s.uHaze.value.set(look.near, look.far, look.haze); s.uTint.value.set(...look.tint);
  }

  /** The billboards, shadows and particles where the scene has them. */
  private place(scene: HdScene) {
    scene.billboards.forEach((b, i) => {
      const m = this.mesh(this.billboards, i, billboardVertex, billboardFragment, { uMap: { value: null }, uFlat: { value: 0 } }, 1, false);
      m.material.uniforms.uMap.value = this.texture(b.sprite);
      m.material.uniforms.uFlat.value = b.flat ? 1 : 0;
      m.visible = true;
      m.layers.set(b.flat ? ROOM : STANDING);
      m.matrixAutoUpdate = !b.flat;
      if (!b.flat) {
        m.position.set(b.x + b.w / 2, b.y - b.h / 2, b.z);
        m.scale.set(b.w, b.h, 1);
        m.rotation.set(0, 0, 0);
        return;
      }
      // (lying on the floor: across along x, its top row furthest back, each row a step nearer and a step right)
      m.matrix.set(b.w, -b.h, 0, b.x + b.w / 2 + b.h / 2, 0, 0, 1, b.y, 0, b.h, 0, b.z - b.h / 2, 0, 0, 0, 1);
      m.matrixWorldNeedsUpdate = true;
    });
    for (let i = scene.billboards.length; i < this.billboards.length; i++) this.billboards[i].visible = false;
    scene.shadows.forEach((s, i) => {
      const m = this.mesh(this.shadows, i, shadowVertex, shadowFragment, { uAlpha: { value: 0 } }, 2, true);
      m.material.uniforms.uAlpha.value = s.alpha;
      m.position.set(s.x, s.y, s.z);
      m.rotation.set(-Math.PI / 2, 0, 0); // (the quad lies on the floor)
      m.scale.set(s.rx * 2, s.rz * 2, 1);
      m.visible = true;
    });
    for (let i = scene.shadows.length; i < this.shadows.length; i++) this.shadows[i].visible = false;
    const { pos, colour, size } = this.particles, n = Math.min(MAX_PARTICLES, scene.particles.length);
    for (let i = 0; i < n; i++) {
      const p = scene.particles[i];
      pos.setXYZ(i, p.x, p.y, p.z); colour.setXYZ(i, p.colour[0], p.colour[1], p.colour[2]); size.setX(i, p.size);
    }
    pos.needsUpdate = colour.needsUpdate = size.needsUpdate = true;
    this.points.geometry.setDrawRange(0, n);
  }

  /**
   * The i-th of a list of quads (made as needed: `blend`, drawn over what's there without hiding what's
   * behind, and leaving where light may spread, the target's alpha, as it is).
   */
  private mesh(list: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[], i: number, vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, order: number, blend: boolean) {
    while (list.length <= i) {
      const m = new THREE.Mesh(this.quad, new THREE.ShaderMaterial({
        vertexShader, fragmentShader, uniforms: { ...this.lighting, ...uniforms }, side: THREE.DoubleSide, transparent: blend, depthWrite: !blend,
        ...(blend ? { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } : {}),
      }));
      m.frustumCulled = false;
      m.renderOrder = order;
      this.scene.add(m);
      list.push(m);
    }
    return list[i];
  }

  /** A sprite's pixels as a texture (rows bottom up, as textures go), made again when they change. */
  private texture(s: HdSprite) {
    let e = this.textures.get(s.pixels);
    if (!e || e.tex.image.width !== s.w || e.tex.image.height !== s.h) {
      e?.tex.dispose();
      const tex = new THREE.DataTexture(new Uint8Array(s.w * s.h * 4), s.w, s.h, THREE.RGBAFormat);
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      e = { tex, version: -1 };
      this.textures.set(s.pixels, e);
    }
    if (e.version !== s.version || e.version < 0) {
      const data = e.tex.image.data;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const v = s.pixels[y * s.w + x], o = ((s.h - 1 - y) * s.w + x) * 4, c = C64_PALETTE[v & 15];
        data[o] = c >> 16; data[o + 1] = (c >> 8) & 255; data[o + 2] = c & 255; data[o + 3] = v === TRANSPARENT ? 0 : 255;
      }
      e.tex.needsUpdate = true;
      e.version = s.version;
    }
    return e.tex;
  }

  /**
   * The targets for a w × h picture: half floats if the GL can draw into them (WebGL 2 needs
   * EXT_color_buffer_float or _half_float for that; Three.js turns them on where they exist), else
   * bytes (the light clamped at white: a duller bloom, the same picture otherwise).
   */
  private targetsFor(gl: THREE.WebGLRenderer, w: number, h: number): Targets {
    if (this.targets && this.targets.w === w && this.targets.h === h) return this.targets;
    for (;;) {
      this.dropTargets();
      const opts = { type: this.targetType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };
      const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), half = () => new THREE.WebGLRenderTarget(hw, hh, opts);
      const tg: Targets = {
        w, h,
        sharp: new THREE.WebGLRenderTarget(w, h, { type: this.targetType, depthTexture: new THREE.DepthTexture(w, h) }),
        a: half(), b: half(), soft: half(), from: half(), rays: half(),
      };
      this.targets = tg;
      // (setting a target makes its framebuffer, bound: the GL says whether it can draw into it)
      const ctx = gl.getContext();
      const complete = [tg.sharp, tg.a].every((t) => { gl.setRenderTarget(t); return ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) === ctx.FRAMEBUFFER_COMPLETE; });
      if (complete) return tg;
      if (this.targetType === THREE.UnsignedByteType) throw new Error('the GL cannot draw into the HD view\'s render targets');
      this.targetType = THREE.UnsignedByteType;
    }
  }

  private dropTargets() {
    if (this.targets) for (const t of [this.targets.sharp, this.targets.a, this.targets.b, this.targets.soft, this.targets.from, this.targets.rays]) t.dispose();
    this.targets = null;
  }

  /** A full-screen pass of `material` (reading `src`) into `target`. */
  private run(gl: THREE.WebGLRenderer, material: THREE.ShaderMaterial, src: THREE.Texture, target: THREE.WebGLRenderTarget) {
    material.uniforms.uSrc.value = src;
    this.pass.mesh.material = material;
    gl.setRenderTarget(target);
    gl.render(this.pass.scene, this.pass.camera);
  }

  /** A gaussian blur (sigma in `src`'s pixels) of `src`, back into `src` (through `tmp`). */
  private blur(gl: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, tmp: THREE.WebGLRenderTarget, sigma: number) {
    const step = sigma / 3, uStep = this.blurMat.uniforms.uStep.value;
    uStep.set(step / src.width, 0);
    this.run(gl, this.blurMat, src.texture, tmp);
    uStep.set(0, step / src.height);
    this.run(gl, this.blurMat, tmp.texture, src);
  }
}
