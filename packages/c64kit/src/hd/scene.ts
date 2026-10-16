import { C64_PALETTE } from '../palette';
import type { FrameCapture } from '../c64/machine';
import { TRANSPARENT } from '../surface';
import { capturedSprites, decodePicture, hiddenByCharacters, type DecodedPicture } from '../c64/picture';
import { placeBox, type PictureLayout } from '../layout';
import { Smoothed } from '../loop';
import type { HdWork, HdWorked } from './work';

/**
 * The HD view: the same game, drawn as a lit 3D diorama built from its own picture and data (no
 * drawn art). This is the model: plain numbers, no Three.js, so it can be tested headless and drawn
 * by anything. A builder (oblique.ts for the Pendragon games) turns a frame of the game into an
 * `HdRoom` (its surfaces, its lights); `HdModel.frame` adds what moves (the sprites as lit
 * billboards standing in the room, their shadows, the camera, flickering flames, dust and embers)
 * and returns an `HdScene`: everything to draw, in world units. `layer.ts` draws it with Three.js;
 * the tests draw the same scene in software (packages/c64kit/test/hd-raster.ts) and look at it.
 *
 * World units are C64 pixels: x to the right, y up, z into the picture (away from the viewer).
 * The picture's own projection is the camera at rest, so the room is recognisably the same: the
 * Pendragon games draw x, height and depth "obliquely" (a step into the room is a pixel up and a
 * pixel right). The camera then adds its own tilt and perspective, fixed for the room.
 */
export type Rgb = [number, number, number];

/**
 * The room's surfaces: one small quad per picture pixel, standing where the room puts it (and walls
 * carried on past the picture's edge, where the camera sees further than the C64's picture showed).
 * Rooms whose surfaces have the same `centre` share their places (only their colours differ).
 */
export interface HdSurface {
  count: number;
  /** Per quad (3 numbers each): its middle, its half-edges (u: towards the picture's right, v: towards its top), its normal. */
  centre: Float32Array;
  u: Float32Array;
  v: Float32Array;
  normal: Float32Array;
  /** Per quad: its colour (linear RGB, the C64 palette's), and the light it gives off itself (a flame). */
  colour: Float32Array;
  glow: Float32Array;
  /** Per quad: the picture pixel of the band it shows (its colour), and how much of that colour (less on a wall carried on past the picture). */
  source: Int32Array;
  shade: Float32Array;
  /** Per quad: how much of the light everywhere reaches it (1; less where a wall meets the floor: `irradiance`'s `ao`). */
  occlusion: Float32Array;
  /** Per picture pixel of the band (w × h, row-major from the band's top left): its quad, or -1. */
  cell: Int32Array;
  /** Per picture pixel of the band: whether it's floor (something stands on it). */
  floor: Uint8Array;
  /**
   * Per picture pixel of the band: whether it's what's seen past the room (a sky, a sea): no quad; the
   * C64's picture shows there as it is, unlit, in its own colours.
   */
  open: Uint8Array;
}

/** A light in the room: a flame (embers rise from it), the player's own. */
export interface HdLight { x: number; y: number; z: number; colour: Rgb; intensity: number; range: number; kind: 'flame' | 'player' }

/**
 * A frame of the game as a room: built when the picture changes (reused while it doesn't). The
 * drawing layer makes its geometry again only for new places (`surface.centre`), puts in new colours
 * for new colours, and moves it for a shift.
 */
export interface HdRoom {
  /** The picture's lines the room is drawn in (the rest of the picture is shown as the C64 drew it). */
  band: { y: number; h: number };
  surface: HdSurface;
  /**
   * How far right (world units: picture pixels) the surface is moved: a picture scrolled sideways
   * is the same room moved (built again exactly when it stops, or meanwhile off the main thread:
   * `exact` false till then). Picture pixel x of the band is the surface's pixel x - shift (`cell`,
   * `floor`); lights, pivot and bounds are where they are now. A whole number from the builder; as
   * drawn between the game's frames (HdRooms.at), the scroll as far along as the sprites are.
   */
  shift: number;
  exact: boolean;
  /** The lights the room itself has (flames). */
  lights: HdLight[];
  /** Where the room's floor mostly is. */
  pivot: { x: number; y: number; z: number };
  /**
   * The depth the camera turns about (depth there is drawn as the C64 drew it): the floor's middle
   * as the room was come into, kept while it scrolls and is built again (HdRooms): a camera that
   * stays put for the room.
   */
  eye: number;
  /** Its extent (dust drifts in it). */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** The sprite that's the player (a light goes with him), and sprites drawn with another (a weapon with its holder). */
  player: number | null;
  attached: Record<number, number>;
}

/**
 * A sprite as shown: its picture (C64 colour indexes, TRANSPARENT where clear; `version` bumped when
 * they change) where it is on the screen, and whether it's set behind the characters ($D01B).
 */
export interface HdSprite { n: number; x: number; y: number; w: number; h: number; pixels: Uint8Array; version: number; behind: boolean }

/**
 * A sprite in the room: a quad facing the viewer, top left at (x, y, z), w × h world units (y down the
 * image); or (`flat`) a patch of the floor lying on it at height y, top left at (x, y, z), its rows
 * coming nearer as the picture's go down (a row a step nearer and a step right: where the camera at
 * rest puts the floor's pixels), lit as the floor.
 */
export interface HdBillboard { sprite: HdSprite; x: number; y: number; z: number; w: number; h: number; flat?: boolean }

/** A soft shadow on the floor under something standing there: an ellipse (radii rx along x, rz along z). */
export interface HdShadow { x: number; y: number; z: number; rx: number; rz: number; alpha: number }

/** A glowing point (dust in the light, an ember): drawn additively, `colour` already scaled by its brightness; size in world units. */
export interface HdParticle { x: number; y: number; z: number; size: number; colour: Rgb }

/**
 * The camera: world -> clip space (column-major 4×4); the depth (z) things are sharpest at, and the
 * line across the picture (picture pixels down) the tilt-shift is sharpest along (his middle).
 */
export interface HdCamera { matrix: Float64Array; focus: number; line: number }

/**
 * After the scene is drawn: bloom (what's brighter than `threshold` spreads: a gaussian blur, `radius`
 * its sigma in C64 pixels), depth of field and the tilt-shift, light shafts, a darkened edge, exposure.
 */
export interface HdPost {
  bloom: { threshold: number; strength: number; radius: number };
  /**
   * Out of focus by `|z - focus| / range` (at most 1), and (the tilt-shift: a miniature's look) by how
   * far above or below the focus line a pixel is: sharp within `sharp` of the band's height of it,
   * wholly soft `ramp` further; that much of a copy blurred by `blur` (sigma, C64 pixels).
   */
  dof: { range: number; blur: number; sharp: number; ramp: number };
  /**
   * Light shafts from the scene's `rays`: what's brighter than `threshold` (the flames themselves, not
   * what they light), smeared out from each light across the
   * picture (`length`: the furthest, as a share of the way to the light; `strength`), only over what
   * the game draws (not over black, nor over sprites).
   */
  rays: { threshold: number; strength: number; length: number };
  vignette: number;
  exposure: number;
  /**
   * Where the room leaves a gap (the tilt or the swing showing past what the picture drew: beside a
   * pillar, above a wall), the C64's own picture there, this bright: as if behind the room, in shadow.
   * (What's seen past the room, `open`, shows as it is.)
   */
  backdrop: number;
}

/** Everything to draw for a frame. */
export interface HdScene {
  room: HdRoom;
  billboards: HdBillboard[];
  shadows: HdShadow[];
  lights: HdLight[];
  /**
   * The light everywhere: from above (sky) and below (ground), by the normal; and a soft key light
   * from one way (`towards` it: a unit vector), so floor, walls and side walls each take their own share.
   */
  ambient: { sky: Rgb; ground: Rgb; key: Rgb; towards: [number, number, number] };
  particles: HdParticle[];
  /** How bright the room's own glow (the flames) is now: they flicker. */
  glow: number;
  /** How sprites take the light (`spriteLight`). */
  sprites: SpriteLook;
  /** The room's surfaces: floors' gloss (the lights' glints on them), and the haze further back (`surfaceLight`). */
  surfaces: SurfaceLook;
  /** Where light shafts come from: the brightest lights where the camera puts them (picture pixels), and how strong each. */
  rays: { x: number; y: number; k: number }[];
  camera: HdCamera;
  post: HdPost;
}

/**
 * How sprites take the light, so they keep their C64 colours: the light falling on them (its
 * brightness, luminance) and `self` of their own, at most `most`; tinted by the light's colour only
 * `tint` of the way (white stays white by a flame, a little warm).
 */
export interface SpriteLook { self: number; tint: number; most: number }

/** The light on a sprite's pixel from the light falling there (`irradiance`): what its colour is multiplied by (the layer's billboard shader is this). */
export function spriteLight(look: SpriteLook, e: Rgb, out: Rgb = [0, 0, 0]): Rgb {
  const y = Math.max(1e-4, 0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2]), k = Math.min(look.most, y + look.self);
  for (let i = 0; i < 3; i++) out[i] = k * (1 + (e[i] / y - 1) * look.tint);
  return out;
}

/** At most this many lights (the drawing layer's shader has room for this many). */
export const MAX_LIGHTS = 12;

/** sRGB (0..1) to linear. */
export function toLinear(c: number) { return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
/** A C64 colour as linear RGB. */
export function paletteLinear(index: number): Rgb {
  const c = C64_PALETTE[index & 15];
  return [toLinear((c >> 16) / 255), toLinear(((c >> 8) & 255) / 255), toLinear((c & 255) / 255)];
}

/**
 * The light falling on a point with a normal (linear RGB): the ambient by the normal (`ao` of it: less
 * in a corner, at a wall's foot), and each light by the angle and its distance (a little less in a
 * corner too). The drawing layer's shader (layer.ts, `LIGHTING`) is this.
 */
export function irradiance(scene: Pick<HdScene, 'ambient' | 'lights'>, x: number, y: number, z: number, nx: number, ny: number, nz: number, out: Rgb = [0, 0, 0], ao = 1): Rgb {
  const h = ny * 0.5 + 0.5, { sky, ground, key, towards: t } = scene.ambient, k = Math.max(0, nx * t[0] + ny * t[1] + nz * t[2]);
  out[0] = (ground[0] + (sky[0] - ground[0]) * h + key[0] * k) * ao;
  out[1] = (ground[1] + (sky[1] - ground[1]) * h + key[1] * k) * ao;
  out[2] = (ground[2] + (sky[2] - ground[2]) * h + key[2] * k) * ao;
  const lit = 0.6 + 0.4 * ao;
  for (const l of scene.lights) {
    const dx = l.x - x, dy = l.y - y, dz = l.z - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const k = lightFalloff(d, l.range) * Math.max(0, (nx * dx + ny * dy + nz * dz) / d) * l.intensity * lit;
    out[0] += l.colour[0] * k; out[1] += l.colour[1] * k; out[2] += l.colour[2] * k;
  }
  return out;
}

/**
 * How the room's surfaces take the light, besides `irradiance`: a floor (facing up) glints with each
 * light (`gloss`; the higher `shine`, the smaller the glint) as seen from `eye` (towards the viewer), a
 * dark floor less (none on black); and further back than `near` the room goes into a haze, all of it at
 * `far`: `haze` of the way to its own brightness in `tint` and darker (black stays black: the haze
 * shows nothing the game doesn't draw).
 */
export interface SurfaceLook { gloss: number; shine: number; eye: [number, number, number]; near: number; far: number; haze: number; tint: Rgb }

/** A pixel of the room lit (linear RGB): its colour, occlusion, place and normal. The layer's surface shader is this. */
export function surfaceLight(scene: Pick<HdScene, 'ambient' | 'lights' | 'surfaces'>, colour: Rgb, ao: number, x: number, y: number, z: number, nx: number, ny: number, nz: number, out: Rgb = [0, 0, 0]): Rgb {
  const e = irradiance(scene, x, y, z, nx, ny, nz, out, ao), s = scene.surfaces;
  let r = colour[0] * e[0], g = colour[1] * e[1], b = colour[2] * e[2];
  if (ny > 0.9) {
    const dark = Math.min(1, 6 * Math.max(colour[0], colour[1], colour[2]));
    for (const l of scene.lights) {
      const dx = l.x - x, dy = l.y - y, dz = l.z - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const hx = dx / d + s.eye[0], hy = dy / d + s.eye[1], hz = dz / d + s.eye[2], hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
      const k = lightFalloff(d, l.range) * Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** s.shine * s.gloss * l.intensity * dark;
      r += l.colour[0] * k; g += l.colour[1] * k; b += l.colour[2] * k;
    }
  }
  const k = Math.min(1, Math.max(0, (z - s.near) / (s.far - s.near))) * s.haze, lum = 0.2126 * r + 0.7152 * g + 0.0722 * b, dim = 1 - 0.4 * k;
  out[0] = (r + (lum * s.tint[0] - r) * k) * dim; out[1] = (g + (lum * s.tint[1] - g) * k) * dim; out[2] = (b + (lum * s.tint[2] - b) * k) * dim;
  return out;
}

/** How a light fades with distance: smoothly to nothing at its range (the shader's `falloff`). */
export function lightFalloff(d: number, range: number) {
  const r = d / range;
  if (r >= 1) return 0;
  const w = 1 - r * r;
  return (w * w) / (1 + 8 * r * r);
}

/** A seedable random number generator (the same scene every run: testable). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
}

const rgb = (r: number, g: number, b: number): Rgb => [r, g, b];
const unit = (x: number, y: number, z: number): [number, number, number] => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };

/**
 * The look: the same for every game drawn this way (one opinionated set, no options), after the "HD-2D"
 * remasters: the game's own pixels, crisp and flat, standing in a deep, lit 3D room. Night: a cool,
 * dim light everywhere from one side (moonlight, raking: the room's depth reads in it; more of it out
 * of doors, `outdoors`), warm pools round the flames and him, glints on the floor, the back of the
 * room in a cool haze; sprites in the light that falls on them (`spriteLight`); then heavy bloom, light
 * shafts, a tilt-shift depth of field round him, a dark edge. Colours stay the game's own palette:
 * only how much light falls on them is ours.
 */
export const LOOK = {
  ambient: { sky: rgb(0.15, 0.18, 0.29), ground: rgb(0.06, 0.06, 0.09), key: rgb(0.22, 0.25, 0.38), towards: unit(-0.45, 0.62, -0.64) },
  /** Out of doors (a room that shows a sky): daylight instead, a warm sun raking from one side, the shade cool. */
  outdoors: { sky: rgb(0.36, 0.42, 0.56), ground: rgb(0.16, 0.15, 0.14), key: rgb(0.95, 0.85, 0.66), towards: unit(-0.5, 0.6, -0.62) },
  /** More flames than this share out their light (each the square root of this over how many there are). */
  flames: 3,
  /** Flames: their light (warm, half way to the flame's own colour), and their pixels glowing in their own colour, `glow` times. */
  flame: { colour: rgb(1, 0.6, 0.28), intensity: 1.7, range: 170, out: 16, flicker: 0.12, glow: 3 },
  player: { colour: rgb(1, 0.78, 0.5), intensity: 0.9, range: 130, height: 34, ahead: 16 },
  /** Sprites: their own light added to what falls on them, the light's colour half way, not too bright. */
  sprites: { self: 0.3, tint: 0.55, most: 1.7 } satisfies SpriteLook,
  surfaces: { gloss: 1.6, shine: 14, eye: unit(0, 0.55, -1), near: 30, far: 150, haze: 0.45, tint: rgb(0.55, 0.68, 1) } satisfies SurfaceLook,
  /** The camera: perspective (the larger, the less), how far right and up a step into the room goes (1, 1: as the C64 drew it), zoom. */
  camera: { distance: 230, slope: 1, tilt: 0.55, zoom: 1.15 },
  post: {
    bloom: { threshold: 1.15, strength: 0.6, radius: 6 }, dof: { range: 200, blur: 1, sharp: 0.6, ramp: 0.3 }, rays: { threshold: 1.5, strength: 2.6, length: 0.75 },
    vignette: 0.38, exposure: 1.15, backdrop: 0.3,
  } satisfies HdPost,
  /** At most this many lights cast shafts. */
  rays: 3,
  dust: 140,
  embers: 9,
};

/**
 * Where sprites stand and what moves, from frame to frame: worked out from the time, the room and the
 * sprites as they're shown now. The camera is fixed (the band's): it never moves after the player, so
 * the room and the sprites move together, exactly as the C64's picture has them.
 */
export class HdModel {
  /** Sprites set behind the characters, with what the characters hide taken out: by sprite number and use. */
  private readonly behind = new Map<string, { pixels: Uint8Array; hidden: Uint8Array; version: number }>();

  /**
   * The scene at time `t` (ms) in `room`, with the sprites as they're shown now; `front`: the picture
   * as shown in front of sprites set behind the characters (320×200, TRANSPARENT where they show:
   * decodePicture's `fore`, laid out; the renderer's screen), or null if none are.
   */
  frame(t: number, room: HdRoom, given: HdSprite[], front: Uint8Array | null = null): HdScene {
    const { band } = room, shadows: HdShadow[] = [], sprites = this.inFront(given, front);
    // the camera: the room's, fixed
    const c = LOOK.camera, matrix = cameraMatrix(room, c.slope, c.tilt, c.zoom, c.distance);
    // (a sprite with any of its pixels in the band is in the room; one reaching past the band's edge,
    // where the C64's picture draws the rest of it, stays where the C64 has it: `pinned`)
    const shown = (box: Box | null): box is Box => !!box && box.y < band.y + band.h && box.y + box.h > band.y;
    const crosses = (box: Box) => box.y < band.y || box.y + box.h > band.y + band.h;
    // sprites standing on the floor under their feet; then those stacked on them (a statue of several
    // sprites is one thing); then those in the air, in front of what's behind them; then those drawn
    // with another (the player's weapon)
    const placed: { s: HdSprite; box: Box; b: HdBillboard }[] = [];
    let rest: { s: HdSprite; box: Box }[] = [];
    for (const s of sprites) {
      const box = litBox(s);
      if (!shown(box) || room.attached[s.n] !== undefined) continue;
      if (crosses(box)) { placed.push({ s, box, b: pinned(matrix, s, behind(room, s, box)) }); continue; }
      const g = ground(room, s, box);
      if (!g) rest.push({ s, box });
      else { placed.push({ s, box, b: g.billboard }); if (g.shadow) shadows.push(g.shadow); }
    }
    for (let found = true; found;) {
      found = false;
      rest = rest.filter(({ s, box }) => {
        const under = placed.find((p) => !p.b.flat && box.x < p.box.x + p.box.w && p.box.x < box.x + box.w && Math.abs(box.y + box.h - p.box.y) <= 3);
        if (!under) return true;
        placed.push({ s, box, b: at(room, s, under.b.z) });
        found = true;
        return false;
      });
    }
    for (const { s, box } of rest) placed.push({ s, box, b: at(room, s, behind(room, s, box)) });
    for (const s of sprites) {
      const holder = room.attached[s.n], box = litBox(s);
      if (holder === undefined || !shown(box)) continue;
      const h = placed.find((p) => p.s.n === holder), z = h ? h.b.z - 0.5 : behind(room, s, box);
      placed.push({ s, box, b: crosses(box) || (h && crosses(h.box)) ? pinned(matrix, s, z) : at(room, s, z) });
    }
    // a sprite the camera would put partly outside the frame (the zoom and the perspective push what's near the
    // band's edge out: a ring at the front left corner went off the left) stays where the C64 has it, `pinned`,
    // in the picture whole, without a shadow of its own
    for (const p of placed) {
      const { s, box, b } = p, lo = box.x - s.x, top = box.y - s.y, kx = b.w / s.w, ky = b.h / s.h;
      const out = [[lo, top], [lo + box.w, top], [lo, top + box.h], [lo + box.w, top + box.h]].some(([cx, cy]) => {
        const q = project(matrix, b.x + cx * kx, b.y - cy * ky, b.z);
        return q.x < 0 || q.x > 320 || q.y < band.y || q.y > band.y + band.h;
      });
      if (!out || s.n === room.player || (s.x + lo < 0 || s.x + lo + box.w > 320)) continue;
      p.b = pinned(matrix, s, b.z);
      for (let k = shadows.length - 1; k >= 0; k--) if (Math.abs(shadows[k].z - b.z) < 0.1) shadows.splice(k, 1);
    }
    const billboards = placed.map((p) => p.b);
    // lights: the room's flames, flickering; the player's own
    // (many flames share out their light: a room of candles is lit, not blinding)
    const share = Math.min(1, Math.sqrt(LOOK.flames / Math.max(1, room.lights.length)));
    const lights: HdLight[] = room.lights.map((l, i) => {
      const f = flicker(t / 1000, i);
      return { ...l, intensity: l.intensity * share * (1 + LOOK.flame.flicker * f), x: l.x + f * 0.6, y: l.y + Math.abs(f) * 0.8 };
    });
    // (light falls only on what the game draws: in a room it draws black, his light shows nothing)
    const player = placed.find((p) => p.s.n === room.player)?.b;
    if (player) {
      const p = LOOK.player;
      lights.push({ x: player.x + player.w / 2, y: player.y - player.h + p.height, z: player.z - p.ahead, colour: p.colour, intensity: p.intensity, range: p.range, kind: 'player' });
    }
    lights.splice(MAX_LIGHTS);
    // (the camera focused on him: his depth, and the line across the picture through his middle)
    const focus = player ? player.z : room.pivot.z;
    const line = player ? project(matrix, player.x + player.w / 2, player.y - player.h / 2, player.z).y : room.band.y + room.band.h / 2;
    // out of doors (a sky shows): daylight
    const ambient = outdoors(room) ? LOOK.outdoors : LOOK.ambient;
    // light shafts from the brightest lights, where the camera puts them
    const rays = [...lights].sort((p, q) => q.intensity - p.intensity).slice(0, LOOK.rays).map((l) => {
      const q = project(matrix, l.x, l.y, l.z);
      return { x: q.x, y: q.y, k: l.intensity / LOOK.flame.intensity };
    });
    const scene: HdScene = {
      room, billboards, shadows, lights, particles: [], glow: 1 + 0.2 * flicker(t / 1000, 0.5), sprites: LOOK.sprites, surfaces: LOOK.surfaces, rays,
      ambient, camera: { matrix, focus, line }, post: LOOK.post,
    };
    scene.particles = particles(t / 1000, room, scene);
    return scene;
  }

  /**
   * The sprites as the C64 orders them against the characters: one set behind them shows none of the
   * pixels they hide (`hiddenByCharacters`, where the C64's picture has a character's pixel over it:
   * Entombed's torch flash, round the room's shapes), wherever the camera puts it; the rest stands by
   * depth. (Its pixels kept in a buffer of its own, `version` bumped when they change: drawn from one texture.)
   */
  private inFront(sprites: HdSprite[], front: Uint8Array | null): HdSprite[] {
    if (!front) return sprites;
    const uses = new Map<number, number>();
    return sprites.map((s) => {
      if (!s.behind) return s;
      const k = uses.get(s.n) ?? 0, key = `${s.n}:${k}`;
      uses.set(s.n, k + 1);
      let e = this.behind.get(key);
      if (!e || e.pixels.length !== s.pixels.length) {
        e = { pixels: new Uint8Array(s.pixels.length).fill(TRANSPARENT), hidden: new Uint8Array(s.pixels.length), version: 0 };
        this.behind.set(key, e);
      }
      hiddenByCharacters(s, front, e.hidden);
      let changed = false;
      for (let i = 0; i < s.pixels.length; i++) {
        const v = e.hidden[i] ? TRANSPARENT : s.pixels[i];
        if (e.pixels[i] !== v) { e.pixels[i] = v; changed = true; }
      }
      if (changed) e.version++;
      return { ...s, pixels: e.pixels, version: e.version };
    });
  }
}

/** Whether a room shows a sky (a hundred pixels of what's seen past it, or more): out of doors. */
const skies = new WeakMap<Uint8Array, boolean>();
function outdoors(room: HdRoom) {
  const open = room.surface.open;
  let v = skies.get(open);
  if (v === undefined) {
    let n = 0;
    for (let i = 0; i < open.length && n < 100; i++) n += open[i];
    v = n >= 100;
    skies.set(open, v);
  }
  return v;
}

/** A flame's flicker at time `s` (seconds): -1..1, a few unrelated waves (each flame its own). */
function flicker(s: number, i: number) {
  const p = i * 1.7;
  return 0.5 * Math.sin(s * 9.1 + p) + 0.3 * Math.sin(s * 23.7 + p * 2.3) + 0.2 * Math.sin(s * 4.3 + p * 0.7);
}

interface Box { x: number; y: number; w: number; h: number }

/** Where a sprite's lit pixels are on the screen, or null if it has none. */
function litBox(s: HdSprite): Box | null {
  let x0 = s.w, x1 = -1, y0 = s.h, y1 = -1;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    if (s.pixels[y * s.w + x] === TRANSPARENT) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x: s.x + x0, y: s.y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** How far above a sprite's lowest pixel its footprint reaches (a foot stepping back is drawn higher). */
const FOOT = 6;

/**
 * A sprite's footprint: the columns whose lowest lit pixel is within FOOT rows of its lowest (its feet,
 * both of a stride; not an arm or a cape's hem higher up), their middle and how wide they spread; and
 * its lowest row, where it stands.
 */
function feet(s: HdSprite, box: Box) {
  let sx = 0, n = 0, left = Infinity, right = -Infinity;
  // (its lowest row in the sprite's own pixels: a whole number, wherever between pixels it's drawn)
  const bottom = Math.round(box.y + box.h - 1 - s.y);
  for (let x = 0; x < s.w; x++) {
    let y = bottom;
    while (y >= 0 && s.pixels[y * s.w + x] === TRANSPARENT) y--;
    if (y < 0 || y < bottom - FOOT) continue;
    sx += x; n++; left = Math.min(left, x); right = Math.max(right, x);
  }
  return { x: s.x + sx / n + 0.5, y: s.y + bottom, width: right - left + 1 };
}

/**
 * Whether a sprite is a patch of the floor under it: drawn all in the floor's own colour there (the
 * floor quad's, `c`), so the C64 shows nothing of it but what it covers (Dragonskulle's dig spot, a
 * block of sand over the sand's marks). It lies on the floor, not standing up, and casts no shadow.
 */
function patchOfFloor(s: HdSprite, surface: HdSurface, c: number) {
  let colour = -1;
  for (const v of s.pixels) {
    if (v === TRANSPARENT) continue;
    if (colour < 0) colour = v; else if (v !== colour) return false;
  }
  const want = paletteLinear(colour);
  return colour >= 0 && want.every((v, k) => Math.abs(surface.colour[c * 3 + k] - v) < 1e-3);
}

/**
 * A sprite standing on the floor under its feet (looked for nearest first, a few pixels down or
 * up: feet drawn over the floor's front edge), with its shadow there, under its footprint; or lying on
 * it if it's a patch of it (no shadow); null if there's no floor.
 */
function ground(room: HdRoom, s: HdSprite, box: Box): { billboard: HdBillboard; shadow: HdShadow | null } | null {
  const f = feet(s, box), { surface, band } = room, fx = Math.round(f.x - room.shift);
  if (fx < 0 || fx >= 320) return null;
  for (const dy of [1, 2, 0, 3, -1, 4, -2, 5, -3, 6, -4, -5, -6]) {
    const py = Math.round(f.y) + dy - band.y;
    if (py < 0 || py >= band.h) continue;
    const i = py * 320 + fx, c = surface.cell[i];
    if (c < 0 || !surface.floor[i]) continue;
    const z = surface.centre[c * 3 + 2], y = surface.centre[c * 3 + 1]; // (a shift moves the surface along x only)
    if (patchOfFloor(s, surface, c)) {
      // (its top left on the floor, where the camera at rest puts the picture's pixel there)
      const top = band.y + band.h - y - s.y;
      return { billboard: { sprite: s, x: s.x - top, y: y + 0.2, z: top, w: s.w, h: s.h, flat: true }, shadow: null };
    }
    // (its feet on the floor: where the picture had them is a pixel or two off the floor's pixel found)
    const billboard = { ...at(room, s, z), y: y + (f.y - s.y) + 1 };
    return { billboard, shadow: { x: f.x - z, y: y + 0.3, z, rx: Math.max(4, f.width * 0.6), rz: 4, alpha: 0.75 } };
  }
  return null;
}

/**
 * Where something in the air stands (no floor under its feet: a ghost leaping over the rail, a bird):
 * just in front of everything standing that its pixels are drawn over, as the C64 draws it over them
 * (a ghost over the deck's cannons stood behind them, at the bulwark behind its middle, and went
 * behind the cannons and the cannonballs the C64 shows it in front of); with nothing standing under
 * it, in front of what's behind its middle.
 */
function behind(room: HdRoom, s: HdSprite, box: Box) {
  const { surface, band } = room, shift = Math.round(room.shift);
  let near = Infinity;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    if (s.pixels[y * s.w + x] === TRANSPARENT) continue;
    const X = Math.round(s.x) + x - shift, Y = Math.round(s.y) + y - band.y;
    if (X < 0 || X >= 320 || Y < 0 || Y >= band.h) continue;
    const i = Y * 320 + X, c = surface.cell[i];
    if (c >= 0 && !surface.floor[i] && !surface.open[i]) near = Math.min(near, surface.centre[c * 3 + 2]);
  }
  if (near < Infinity) return near - 1;
  const x = Math.round(box.x + box.w / 2 - room.shift), y = Math.round(box.y + box.h / 2) - band.y;
  const c = y >= 0 && y < band.h && x >= 0 && x < 320 ? surface.cell[y * 320 + x] : -1;
  return c >= 0 ? surface.centre[c * 3 + 2] - 1 : room.pivot.z;
}

/**
 * A sprite as a quad facing the viewer at depth z: where the C64's picture put it, pushed back to z
 * (and a hair further for each sprite number: where sprites stand at one depth, a statue of several,
 * the lower-numbered is in front, as the VIC has them).
 */
function at(room: HdRoom, s: HdSprite, z: number): HdBillboard {
  const base = room.band.y + room.band.h, d = z + s.n * TIE;
  return { sprite: s, x: s.x - d, y: base - s.y - d, z: d, w: s.w, h: s.h };
}
const TIE = 0.01;

/**
 * A sprite reaching past the band's edge, as a quad facing the viewer at depth z (and the hair for
 * its number, as `at`) that the camera puts exactly where the C64's picture has it, at its size: the
 * part of it outside the band is the C64's picture's, drawn there with the sprites, and the two halves
 * of the figure meet (Blackwyche's mermaid over the rail, her head above the sky). (The camera keeps a
 * quad at one depth square to it, cameraMatrix: screen x from x alone, screen y from y alone.)
 */
function pinned(m: Float64Array, s: HdSprite, z: number): HdBillboard {
  const d = z + s.n * TIE, w = m[11] * d + m[15];
  const x = ((s.x / 160 - 1) * w - m[8] * d - m[12]) / m[0], y = ((1 - s.y / 100) * w - m[9] * d - m[13]) / m[5];
  return { sprite: s, x, y, z: d, w: (s.w * w) / (160 * m[0]), h: (s.h * w) / (100 * m[5]) };
}

/**
 * World -> clip space for the room: its band and `eye` (fixed while it's the same room: a camera that
 * never moves after anything). At rest (`slope` 1, `tilt` 1, no perspective, no zoom) it's the C64's own
 * picture: screen x = x + z, screen y = base - y - z. `slope` is how far right a step into the room
 * goes, `tilt` how far up (less: the camera lower), both about the depth `eye` (what's there stays
 * where the C64 drew it); then perspective (things farther away smaller,
 * towards the band's middle, `D` the farther the less), and `zoom` about that middle (so the tilted
 * room still fills the band). Clip x, y map the whole 320×200 picture.
 */
export function cameraMatrix(room: Pick<HdRoom, 'band' | 'eye'>, slope: number, tilt: number, zoom = 1, D: number = LOOK.camera.distance): Float64Array {
  const { band } = room, zr = room.eye, base = band.y + band.h;
  const vx = 160, vy = band.y + band.h / 2;
  const c = 1 - zr / D; // w = z / D + c: 1 at the pivot
  const cx0 = (1 - slope) * zr, cy0 = (tilt - 1) * zr;
  // screen x = vx + zoom (x + slope z + cx0 - vx) / w;  screen y = vy + zoom (base - y - tilt z + cy0 - vy) / w
  // clip x = screen x / 160 * w - w;  clip y = w - screen y / 100 * w
  const xX = zoom / 160, xZ = (vx / D + zoom * slope) / 160 - 1 / D, x1 = (vx * c + zoom * (cx0 - vx)) / 160 - c;
  const yY = zoom / 100, yZ = 1 / D - (vy / D - zoom * tilt) / 100, y1 = c - (vy * c + zoom * (base + cy0 - vy)) / 100;
  // depth: -1 at z = -80, 1 at z = 400 (as w goes: a perspective divide)
  const zn = -80, zf = 400, wn = zn / D + c, wf = zf / D + c;
  const za = (wf + wn) / (zf - zn), zb = -wn - za * zn;
  // (column-major)
  return new Float64Array([
    xX, 0, 0, 0,
    0, yY, 0, 0,
    xZ, yZ, za, 1 / D,
    x1, y1, zb, c,
  ]);
}

/** A world point through the camera: picture pixels (x right, y down: the 320×200 picture) and depth (NDC z). */
export function project(m: Float64Array, x: number, y: number, z: number) {
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cz = m[2] * x + m[6] * y + m[10] * z + m[14], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return { x: (cx / cw + 1) * 160, y: (1 - cy / cw) * 100, depth: cz / cw, w: cw };
}

/**
 * Dust drifting through the room (catching the light where it's lit, and only in front of something
 * the game draws: none against black) and embers rising from each flame: worked out from the time
 * alone (each one's path is fixed by its seed), so nothing is kept.
 */
function particles(s: number, room: HdRoom, scene: HdScene): HdParticle[] {
  const out: HdParticle[] = [];
  const { min, max } = room.bounds, r = rng(1985);
  const irr: Rgb = [0, 0, 0];
  for (let i = 0; i < LOOK.dust; i++) {
    // each mote lives a few seconds (fading in and out), born somewhere new each life, drifting
    // slowly (mostly settling) and wandering on two slow sways, as dust does in still air
    const life = 7 + r() * 7, ph = r() * life, size = 0.7 + r() * 0.9, f1 = 0.25 + r() * 0.35, f2 = 0.6 + r() * 0.5;
    const age = (s + ph) % life, n = Math.floor((s + ph) / life), a = age / life, at = rng(i * 7919 + n * 104729 + 1);
    const x0 = min[0] + (max[0] - min[0]) * at(), y0 = min[1] + (max[1] - min[1]) * at(), z0 = min[2] + (max[2] - min[2]) * at();
    const vx = (at() - 0.5) * 12, vy = -1.5 - at() * 2.5 + (at() < 0.25 ? 4 : 0), w = 4 + at() * 5, q = at() * 6.28;
    const x = x0 + vx * age + Math.sin(s * f1 + q) * w + Math.sin(s * f2 + q * 2) * w * 0.35;
    const y = y0 + vy * age + Math.cos(s * f1 * 0.8 + q) * w * 0.6;
    const z = z0 + Math.sin(s * f2 * 0.7 + q * 3) * w * 0.5;
    irradiance(scene, x, y, z, 0, 0, -1, irr);
    const k = 0.9 * Math.sin(Math.PI * a) * (0.75 + 0.25 * Math.sin(s * 1.7 + q)) * shown(room, x, y, z);
    out.push({ x, y, z, size, colour: [irr[0] * k, irr[1] * k, irr[2] * k] });
  }
  for (const [j, l] of room.lights.entries()) {
    if (l.kind !== 'flame') continue;
    for (let i = 0; i < LOOK.embers; i++) {
      const life = 1.4 + r() * 1.6, ph = r() * life, a = (s + ph) % life / life, drift = (r() - 0.5) * 10;
      const x = l.x + drift * a + Math.sin(s * 3 + i + j) * 1.5, y = l.y + 2 + a * 26, z = l.z + (r() - 0.5) * 4;
      const k = (1 - a) * (1 - a) * 2.6;
      out.push({ x, y, z, size: 0.9 + r() * 0.6, colour: [1 * k, 0.45 * k, 0.12 * k] });
    }
  }
  return out;
}

/**
 * How much of the room the picture shows behind a point (0..1: none where it's black), from the
 * brightest channel of the quad there (where the camera at rest puts the point).
 */
function shown(room: HdRoom, x: number, y: number, z: number) {
  const { band, surface: s } = room;
  const px = Math.floor(x + z - room.shift), py = Math.floor(room.band.y + band.h - y - z) - band.y;
  const c = px >= 0 && px < 320 && py >= 0 && py < band.h ? s.cell[py * 320 + px] : -1;
  return c < 0 ? 0 : Math.min(1, 8 * Math.max(s.colour[c * 3], s.colour[c * 3 + 1], s.colour[c * 3 + 2]));
}

/**
 * A frame capture's sprites as the HD view takes them (the browser takes them from the renderer's,
 * moving smoothly): where the picture shows them (moved with their part of it by a layout, as C64View does).
 */
export function spritesFromCapture(cap: FrameCapture, layout: PictureLayout | null = null): HdSprite[] {
  return capturedSprites(cap).map((s) => ({ ...s, ...placeBox(layout, s), version: 0 }));
}

/** The room moved d further right (its surface, lights, pivot and bounds): the same room, a scroll on. */
export function shiftRoom(room: HdRoom, d: number): HdRoom {
  if (d === 0) return room;
  const move = <P extends { x: number }>(p: P): P => ({ ...p, x: p.x + d });
  return {
    ...room, shift: room.shift + d, lights: room.lights.map(move), pivot: move(room.pivot),
    bounds: { min: [room.bounds.min[0] + d, room.bounds.min[1], room.bounds.min[2]], max: [room.bounds.max[0] + d, room.bounds.max[1], room.bounds.max[2]] },
  };
}

/**
 * What a builder makes of a frame: the room, and how far right the picture moved since the room it
 * was given (`moved`; null: another room, or another picture: the view starts again there).
 */
export interface HdBuilt { room: HdRoom; moved: number | null }

/** How far a room may be moved for a scroll before it's built again: here (`now`), or while it's built off the main thread (`meanwhile`). */
export const REACH = { now: 8, meanwhile: 48 };

/** How a game's rooms are made for the HD view (`obliqueRooms` for the Pendragon games). */
export interface HdBuilder {
  /**
   * The room in this frame. `last` is the room before (null: build from scratch): what's the same
   * may be kept (the same places with new colours, the same room moved by a scroll, no further than
   * `reach`). `layout`: the picture's layout as shown (renderer.layout), which may move the room's
   * part of the picture.
   */
  build(picture: DecodedPicture, last: HdRoom | null, layout: PictureLayout | null, reach: number): HdBuilt;
  /** What building this frame's room takes, as plain data (to build it off the main thread: `buildWork`). */
  work(picture: DecodedPicture, layout: PictureLayout | null): HdWork;
  /** The room built from `work` (where it was built: what came back), ready to be kept, moved and painted as the builder's own. */
  adopt(done: HdWorked): HdRoom;
}

/** Something that builds rooms off the main thread (a worker running `buildWork`), each in its turn. */
export interface HdRefresher { post(work: HdWork): Promise<HdWorked> }

/**
 * A game's rooms for the HD view, made by its builder only when the room's part of the picture
 * changes (its character rows: codes, colours, scroll, colours and charset registers; and the
 * charset they're drawn with). A status line counting down outside the room changes nothing.
 *
 * A scroll moves the room it has (the same room, moved: cheap), and it's built again exactly where
 * the picture is now: with a `refresher` off the main thread while the picture goes on scrolling (a
 * frame of the game never waits for a build), the room that comes back moved on by the scroll since;
 * without one, here, once the picture stops or it's moved REACH.now.
 *
 * And the scroll as drawn (`at`): the game moves the picture a whole pixel or more a frame, at 50 a
 * second; the renderer draws the sprites between the game's frames (loop.ts Smoothed: an even glide,
 * a frame behind), and the room is moved with them, the same way: they never part.
 */
export class HdRooms {
  private last: { key: number; room: HdRoom } | null = null;
  /** How far right the picture has scrolled since this room was come into (the sum of each frame's move), drawn smoothed as the sprites are. */
  private total = 0;
  private readonly scroll = new Smoothed();
  /** Which room this is (counted: one built off the main thread for an earlier room is dropped), and its camera's eye. */
  private scene = 0;
  private eye = 0;
  /** A build off the main thread under way (the scene and scroll of the frame it's of), and one come back. */
  private pending: { scene: number; total: number } | null = null;
  private ready: { scene: number; total: number; room: HdRoom } | null = null;

  constructor(private readonly builder: HdBuilder, private refresher: HdRefresher | null = null) {}

  /**
   * The room in this frame of the game; `picture` the frame's decoded (C64View has it: decoded once a
   * frame), else decoded here if the room's part of the picture changed.
   */
  room(ram: Uint8Array, cap: FrameCapture, layout: PictureLayout | null = null, picture: DecodedPicture | null = null): HdRoom {
    const key = this.key(ram, cap, layout);
    let decoded = picture;
    const pic = () => (decoded ??= decodePicture(ram, cap));
    // a room built off the main thread since: the picture as it was then, moved on by the scroll since
    const ready = this.ready;
    this.ready = null;
    if (ready && this.last && ready.scene === this.scene) {
      const room = shiftRoom(ready.room, this.total - ready.total);
      this.last = { key: this.last.key, room: { ...room, exact: room.shift === 0 } };
    }
    let moved: number | null = 0;
    if (this.last?.key !== key) {
      const built = this.builder.build(pic(), this.last?.room ?? null, layout, this.refresher ? REACH.meanwhile : REACH.now);
      this.last = { key, room: built.room };
      moved = built.moved;
    } else if (!this.last.room.exact && !this.refresher) {
      // (the scroll stopped: built again, exactly, where it is now)
      this.last = { key, room: this.builder.build(pic(), null, layout, 0).room };
    }
    if (moved === null) {
      this.scene++; this.total = 0; this.pending = null;
      this.scroll.reset(0, 0);
      this.eye = this.last.room.eye;
    } else {
      this.total += moved;
      this.scroll.push(this.total, 0);
      // (the camera stays where it was for the room: the same room built again keeps its eye)
      if (this.last.room.eye !== this.eye) this.last = { key: this.last.key, room: { ...this.last.room, eye: this.eye } };
    }
    if (!this.last.room.exact && this.refresher && !this.pending) this.refresh(this.refresher, pic(), layout);
    return this.last.room;
  }

  /**
   * The room as drawn `alpha` (0..1) of the way from one frame of the game to the next: moved by the
   * scroll as far as the sprites have moved (`snap`: the latest frame's, as they are when they snap),
   * or null before there's one.
   */
  at(alpha: number, snap = false): HdRoom | null {
    if (!this.last) return null;
    const room = this.last.room, drawn = this.scrolled(alpha, snap) - (this.total - room.shift);
    return shiftRoom(room, drawn - room.shift);
  }

  /** How far right the picture is drawn scrolled since this room was come into, `alpha` of the way to the next frame (as `at` draws it). */
  scrolled(alpha: number, snap = false) { return this.scroll.at(alpha, snap).x; }

  /** This frame's room built off the main thread, one at a time (if that fails: here from then on). */
  private refresh(refresher: HdRefresher, picture: DecodedPicture, layout: PictureLayout | null) {
    const at = { scene: this.scene, total: this.total };
    this.pending = at;
    refresher.post(this.builder.work(picture, layout)).then((done) => {
      if (this.pending === at) this.pending = null;
      if (at.scene === this.scene) this.ready = { ...at, room: this.builder.adopt(done) };
    }, (e: unknown) => {
      if (this.pending === at) this.pending = null;
      this.refresher = null;
      console.error('HD view: rooms built on the main thread from now on.', e);
    });
  }

  /** The room's part of the picture as a number (FNV-1a): the same while it doesn't change. */
  private key(ram: Uint8Array, cap: FrameCapture, layout: PictureLayout | null) {
    const band = this.last?.room.band ?? { y: 0, h: 200 };
    let key = 0x811c9dc5;
    const mix = (v: number) => { key = Math.imul(key ^ (v & 0xff), 0x01000193); };
    const charsets = new Set<number>();
    cap.rows.forEach((r, row) => {
      const top = r.line !== undefined ? r.line - 0x33 : row * 8;
      if (top + 8 <= band.y || top >= band.y + band.h) return;
      for (const v of [row, top, r.d011, r.d016, r.d018, r.bank >> 8, ...r.bg]) mix(v);
      for (let i = 0; i < 40; i++) { mix(r.codes[i]); mix(r.colours[i]); }
      charsets.add(r.bank + ((r.d018 >> 1) & 7) * 0x800);
    });
    for (const at of charsets) for (let i = 0; i < 0x800; i++) mix(ram[at + i]);
    mix(layoutId(layout));
    return key;
  }
}

/** A number for each layout (0: none), for the rooms' key. */
const layoutIds = new WeakMap<PictureLayout, number>();
let nextLayout = 0;
function layoutId(layout: PictureLayout | null) {
  if (!layout) return 0;
  let id = layoutIds.get(layout);
  if (id === undefined) { id = 1 + (nextLayout++ % 255); layoutIds.set(layout, id); }
  return id;
}
