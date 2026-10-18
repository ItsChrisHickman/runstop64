import * as THREE from 'three';
import { placePoint, type PictureLayout } from './layout';

/**
 * Effects drawn over the C64 picture (not part of it): a drift of stardust around each marked
 * place, e.g. where something in the game can be done. Tiny specks rise and twinkle, a couple
 * of brighter stars bloom now and then, over a barely-there glow. Places are in C64 screen
 * pixels; the effects animate by themselves (time only: no state to keep between frames).
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
const TINTS = [0xfff6e0, 0xffe7a0, 0xfff2c8, 0xcff6ff];

/** A repeatable random number in [0, 1) for a seed. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

interface Item { glow: THREE.Mesh; specks: THREE.Mesh[]; stars: THREE.Mesh[] }

export class Sparkles {
  private readonly group = new THREE.Group();
  private readonly quad = new THREE.PlaneGeometry(1, 1);
  private readonly dotTex = softDot();
  private readonly starTex = starTexture();
  private items: Item[] = [];
  private markers: Marker[] = [];

  constructor(scene: THREE.Scene) {
    this.group.position.z = 90;
    scene.add(this.group);
  }

  /** The places to mark (none: nothing shown). */
  set(markers: Marker[]) { this.markers = markers; }

  /** Place and animate the effects (`t` in milliseconds), where the picture's `layout` shows their places. */
  update(t: number, layout: PictureLayout | null = null) {
    while (this.items.length < this.markers.length) this.items.push(this.make());
    const s = t / 1000;
    this.items.forEach((it, i) => {
      const marker = this.markers[i];
      const m = marker === undefined ? undefined : placePoint(layout, marker.x, marker.y);
      const grow = marker?.size ?? 1, gain = marker?.gain ?? 1;
      it.glow.visible = !!m;
      it.specks.forEach((p) => (p.visible = !!m));
      it.stars.forEach((p) => (p.visible = !!m));
      if (!m) return;
      // the faintest warm glow, breathing slowly
      const breath = 0.5 + 0.5 * Math.sin(s * 1.3 + i);
      it.glow.position.set(m.x, -m.y, -1);
      it.glow.scale.setScalar((20 + 4 * breath) * grow);
      setOpacity(it.glow, Math.min(1, (0.1 + 0.06 * breath) * gain));
      // specks: each lives a while, rising and swaying, then comes back somewhere new nearby
      it.specks.forEach((p, k) => {
        const seed = i * 101 + k * 7.3;
        const life = 1.6 + hash(seed) * 1.4;
        const clock = s + hash(seed + 1) * life;
        const round = Math.floor(clock / life), age = (clock % life) / life;
        const r = Math.sqrt(hash(seed + round * 3.1)) * 10 * grow, a = hash(seed + round * 5.7) * Math.PI * 2;
        const sway = Math.sin(s * 2 + k) * 1.2;
        p.position.set(m.x + Math.cos(a) * r + sway * grow, -(m.y + Math.sin(a) * r * 0.7) + age * 7 * grow, 0);
        const twinkle = 0.55 + 0.45 * Math.sin(s * (7 + hash(seed + 2) * 6) + k);
        setOpacity(p, Math.min(1, Math.sin(Math.PI * age) * twinkle * gain));
        p.scale.setScalar((1.2 + hash(seed + 3) * 1.4) * grow);
      });
      // a couple of brighter stars, each blooming for a moment now and then
      it.stars.forEach((p, k) => {
        const seed = i * 53 + k * 19.7;
        const period = 2.2 + hash(seed) * 1.6;
        const clock = s + hash(seed + 1) * period;
        const round = Math.floor(clock / period), age = (clock % period) / period;
        const bloom = age < 0.35 ? Math.sin((age / 0.35) * Math.PI) : 0;
        const r = (3 + hash(seed + round) * 8) * grow, a = hash(seed + round * 2.3) * Math.PI * 2;
        p.position.set(m.x + Math.cos(a) * r, -(m.y + Math.sin(a) * r * 0.7), 1);
        p.scale.setScalar((1 + 6.5 * bloom) * grow);
        p.rotation.z = s * 0.8 + k;
        setOpacity(p, bloom);
      });
    });
  }

  private make(): Item {
    const add = (mesh: THREE.Mesh) => { mesh.renderOrder = 10; this.group.add(mesh); return mesh; };
    const mat = (map: THREE.Texture, color: number) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    return {
      glow: add(new THREE.Mesh(this.quad, mat(this.dotTex, 0xffd890))),
      specks: Array.from({ length: SPECKS }, (_, k) => add(new THREE.Mesh(this.quad, mat(this.dotTex, TINTS[k % TINTS.length])))),
      stars: Array.from({ length: STARS }, () => add(new THREE.Mesh(this.quad, mat(this.starTex, 0xffffff)))),
    };
  }
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
