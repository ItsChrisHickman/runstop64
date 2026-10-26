import * as THREE from 'three';
import { placePoint, type PictureLayout } from './layout';

/**
 * Effects drawn over the C64 picture (not part of it): a drift of stardust around each marked
 * place, e.g. where something in the game can be done. Tiny specks rise and twinkle, a couple
 * of brighter stars bloom now and then, over a barely-there glow, its colour going between
 * yellow and white. A place that comes up is flown to first, like a fairy: from the nearer side
 * of the screen (or from where its stardust was, if it moves on), floating and bobbing, a trail
 * of glitter behind, and settles into the stardust there. Places are in C64 screen pixels.
 */
export interface Marker {
  x: number;
  y: number;
  /** How wide the stardust spreads and how big its specks and stars are, 1 (the default) for the C64's dark pictures; more where the art is bright and busy. */
  size?: number;
  /** How strong the glow and the specks are, 1 (the default) for dark pictures; more over bright colours, where adding light shows less. */
  gain?: number;
}

const SPECKS = 22;
const STARS = 2;
/** Speck colours: warm white, pale gold, a touch of pale cyan. */
const TINTS = [0xfff6e0, 0xffe7a0, 0xfff2c8, 0xcff6ff].map((c) => new THREE.Color(c));
/** The glow's colours, which it goes between: yellow and white. */
const YELLOW = new THREE.Color(0xffd84a), WHITE = new THREE.Color(0xffffff);
/** A flight: this long (seconds) and more the farther it goes (seconds a screen's width); then this long settling into the stardust. */
const FLIGHT = 1.1, FLIGHT_A_WIDTH = 0.9, SETTLE = 0.6;
/** A place that moves farther than this (pixels) in one update is a new one, flown to from where the stardust was. */
const JUMP = 40;
/** A place gone for less than this (ms) and back where it was is still settled there (a pause, a held frame). */
const GONE = 1500;
/** The glitter behind a flight: each speck this far back (seconds) along the way. */
const TRAIL = 0.045;

/** A repeatable random number in [0, 1) for a seed. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Point { x: number; y: number }
/** Where a place's stardust is flown to from, and when (ms); `at` is the place as last marked (screen pixels), `gone` since when it is not (ms). */
interface Flight { from: Point; start: number; seconds: number; at: Point; gone: number | null }
interface Item { glow: THREE.Mesh; specks: THREE.Mesh[]; stars: THREE.Mesh[]; flight: Flight | null }

export class Sparkles {
  private readonly group = new THREE.Group();
  private readonly quad = new THREE.PlaneGeometry(1, 1);
  private readonly dotTex = softDot();
  private readonly starTex = starTexture();
  private readonly colour = new THREE.Color();
  private items: Item[] = [];
  private markers: Marker[] = [];
  /** The places set are shown as already arrived, at the next update (a still). */
  private settled = false;

  constructor(scene: THREE.Scene) {
    this.group.position.z = 90;
    scene.add(this.group);
  }

  /** The places to mark (none: nothing shown). */
  set(markers: Marker[]) { this.markers = markers; }

  /** The places set are there already, with no flight to them (a still of the stardust). */
  settle() { this.settled = true; }

  /** Place and animate the effects (`t` in milliseconds), where the picture's `layout` shows their places. */
  update(t: number, layout: PictureLayout | null = null) {
    while (this.items.length < this.markers.length) this.items.push(this.make());
    const s = t / 1000;
    this.items.forEach((it, i) => {
      const marker = this.markers[i];
      const m = marker === undefined ? undefined : placePoint(layout, marker.x, marker.y);
      const visible = !!m;
      it.glow.visible = visible;
      it.specks.forEach((p) => (p.visible = visible));
      it.stars.forEach((p) => (p.visible = visible));
      if (!m) { if (it.flight && it.flight.gone === null) it.flight.gone = t; return; }
      const grow = marker?.size ?? 1, gain = marker?.gain ?? 1;
      const flight = this.flightTo(it, i, m, t);
      // how far along the flight is (0 just set off, 1 there) and how settled (0 flying, 1 the stardust)
      const age = (t - flight.start) / 1000;
      const arrived = age >= flight.seconds;
      const settle = clamp01((age - flight.seconds) / SETTLE);
      const fly = 1 - settle;
      const at = (back: number) => flightPoint(flight, m, age - back, i);
      const fairy = at(0);
      // the glow's colour, going between yellow and white
      const shade = 0.5 + 0.5 * Math.sin(s * 2.2 + i * 1.7);
      this.colour.copy(YELLOW).lerp(WHITE, shade);
      // the faintest glow, breathing slowly; in flight, a small bright one round the fairy
      const breath = 0.5 + 0.5 * Math.sin(s * 1.3 + i);
      it.glow.position.set(lerp(fairy.x, m.x, settle), -lerp(fairy.y, m.y, settle), -1);
      it.glow.scale.setScalar(lerp(12, 20 + 4 * breath, settle) * grow);
      setColour(it.glow, this.colour);
      setOpacity(it.glow, Math.min(1, lerp(0.45, 0.1 + 0.06 * breath, settle) * gain));
      // specks: each lives a while, rising and swaying, then comes back somewhere new nearby; in flight, the glitter behind
      it.specks.forEach((p, k) => {
        const seed = i * 101 + k * 7.3;
        const life = 1.6 + hash(seed) * 1.4;
        const clock = s + hash(seed + 1) * life;
        const round = Math.floor(clock / life), lived = (clock % life) / life;
        const r = Math.sqrt(hash(seed + round * 3.1)) * 10 * grow, a = hash(seed + round * 5.7) * Math.PI * 2;
        const sway = Math.sin(s * 2 + k) * 1.2;
        const twinkle = 0.55 + 0.45 * Math.sin(s * (7 + hash(seed + 2) * 6) + k);
        const dust = { x: m.x + Math.cos(a) * r + sway * grow, y: m.y + Math.sin(a) * r * 0.7 - lived * 7 * grow };
        const back = (k + 1) * TRAIL, behind = at(back);
        const fall = (k + 1) * 0.35 * grow, drift = Math.sin(s * 5 + k * 1.3) * 0.8 * grow;
        const glitter = { x: behind.x + drift, y: behind.y + fall };
        const trailing = age - back >= 0 && !(arrived && age - back >= flight.seconds) ? (1 - k / SPECKS) * twinkle : 0;
        p.position.set(lerp(glitter.x, dust.x, settle), -lerp(glitter.y, dust.y, settle), 0);
        setOpacity(p, Math.min(1, lerp(trailing, Math.sin(Math.PI * lived) * twinkle, settle) * gain));
        p.scale.setScalar(lerp(1 + (1 - k / SPECKS) * 1.4, 1.2 + hash(seed + 3) * 1.4, settle) * grow);
        setColour(p, TINTS[k % TINTS.length], this.colour, 0.45);
      });
      // a couple of brighter stars, each blooming for a moment now and then; in flight, the first is the fairy
      it.stars.forEach((p, k) => {
        const seed = i * 53 + k * 19.7;
        const period = 2.2 + hash(seed) * 1.6;
        const clock = s + hash(seed + 1) * period;
        const round = Math.floor(clock / period), lived = (clock % period) / period;
        const bloom = lived < 0.35 ? Math.sin((lived / 0.35) * Math.PI) : 0;
        const r = (3 + hash(seed + round) * 8) * grow, a = hash(seed + round * 2.3) * Math.PI * 2;
        const star = { x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r * 0.7 };
        const core = k === 0 ? 1 : 0, glint = 5.5 + Math.sin(s * 11) * 1.5;
        p.position.set(lerp(fairy.x, star.x, settle), -lerp(fairy.y, star.y, settle), 1);
        p.scale.setScalar(lerp(glint * core, 1 + 6.5 * bloom, settle) * grow);
        p.rotation.z = s * (0.8 + 2.4 * fly) + k;
        setColour(p, WHITE);
        setOpacity(p, lerp(core, bloom, settle));
      });
    });
    this.settled = false;
  }

  /** The flight to item `i`'s place `m` (screen pixels, as laid out), begun now if the place is new, has moved on, or was gone a while. */
  private flightTo(it: Item, i: number, m: Point, t: number): Flight {
    const was = it.flight, here = was && (was.gone === null || t - was.gone < GONE) ? was : null;
    if (here && Math.hypot(m.x - here.at.x, m.y - here.at.y) <= JUMP) {
      here.at = m; here.gone = null;
      return here;
    }
    let from: Point;
    if (this.settled) from = m;
    else if (here) from = here.at; // (moved on: from where the stardust was)
    else from = { x: m.x < 160 ? -14 : 334, y: Math.max(6, m.y - 18 - hash(i * 7 + t) * 30) };
    const seconds = this.settled ? 0 : FLIGHT + (Math.hypot(m.x - from.x, m.y - from.y) / 320) * FLIGHT_A_WIDTH;
    const flight = { from, start: this.settled ? t - SETTLE * 1000 : t, seconds, at: m, gone: null };
    it.flight = flight;
    return flight;
  }

  private make(): Item {
    const add = (mesh: THREE.Mesh) => { mesh.renderOrder = 10; this.group.add(mesh); return mesh; };
    const mat = (map: THREE.Texture, color: THREE.Color) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    return {
      glow: add(new THREE.Mesh(this.quad, mat(this.dotTex, YELLOW))),
      specks: Array.from({ length: SPECKS }, (_, k) => add(new THREE.Mesh(this.quad, mat(this.dotTex, TINTS[k % TINTS.length])))),
      stars: Array.from({ length: STARS }, () => add(new THREE.Mesh(this.quad, mat(this.starTex, WHITE)))),
      flight: null,
    };
  }
}

/**
 * Where a flight is `age` seconds after it set off: eased from where it came from to the place `to`, floating up
 * over the way and bobbing as it goes, the float and bob nothing at either end; before it set off, where it came
 * from; after, the place.
 */
function flightPoint(f: Flight, to: Point, age: number, i: number): Point {
  if (f.seconds <= 0 || age >= f.seconds) return to;
  const u = clamp01(age / f.seconds), p = 0.5 - 0.5 * Math.cos(Math.PI * u);
  const lift = Math.sin(Math.PI * u);
  const bob = Math.sin(age * Math.PI * 2 * 1.2 + i) * 9, weave = Math.sin(age * Math.PI * 2 * 0.8 + i * 2) * 6;
  return { x: lerp(f.from.x, to.x, p) + weave * lift, y: lerp(f.from.y, to.y, p) - 16 * lift + bob * lift };
}

/** A mesh's material colour (the meshes here each have one MeshBasicMaterial): `colour`, or that much (0-1) of the way to `toward`. */
function setColour(mesh: THREE.Mesh, colour: THREE.Color, toward?: THREE.Color, much = 0) {
  const m = mesh.material;
  if (!(m instanceof THREE.MeshBasicMaterial)) return;
  m.color.copy(colour);
  if (toward) m.color.lerp(toward, much);
}

/** A mesh's material opacity (the meshes here each have one MeshBasicMaterial). */
function setOpacity(mesh: THREE.Mesh, opacity: number) {
  const m = mesh.material;
  if (m instanceof THREE.MeshBasicMaterial) m.opacity = opacity;
}

/** A soft round dot, fading out from the middle (specks, and stretched, the glow). */
function softDot() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2), v = Math.max(0, 1 - d) ** 2.2;
    const o = (y * n + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = v * 255;
  }
  return texture(data, n);
}

/** A four-pointed star with a soft core. */
function starTexture() {
  const n = 32, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = Math.abs(x - n / 2 + 0.5) / (n / 2), dy = Math.abs(y - n / 2 + 0.5) / (n / 2);
    const v = Math.max(0, 1 - Math.sqrt(dx * dy) * 6 - (dx + dy) * 0.6) + Math.max(0, 1 - Math.hypot(dx, dy) * 3) * 0.6;
    const o = (y * n + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = Math.min(255, v * 255);
  }
  return texture(data, n);
}

function texture(data: Uint8Array, n: number) {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
