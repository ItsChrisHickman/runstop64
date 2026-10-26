/**
 * The hint sparkles' flight (packages/c64kit/src/overlay.ts `Sparkles`): a place that comes up is flown to from the
 * nearer side of the screen, gets there, and is then the stardust it always was; a place that moves a little is
 * followed, not flown to again; one that moves on is flown to from where it was; a still (`settle`) has no flight.
 * There is no GPU here: the real `Sparkles` runs on a Three.js scene of its own and its meshes are read.
 * With an out-dir, a sheet of the flight's frames (the meshes drawn as additive dots) is written there.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/sparkle-flight.ts [out-dir]
 */
import path from 'node:path';
import * as THREE from 'three';
import { Sparkles } from '../../../packages/c64kit/src/overlay';
import { writePng } from '../../../tools/png';
import { check, finish } from './check';


interface Seen { x: number; y: number; opacity: number; scale: number; colour: number; star: boolean }
/** The visible meshes, in screen pixels (y down). */
function meshes(scene: THREE.Scene): Seen[] {
  const out: Seen[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible || !(o.material instanceof THREE.MeshBasicMaterial)) return;
    out.push({ x: o.position.x, y: -o.position.y, opacity: o.material.opacity, scale: o.scale.x, colour: o.material.color.getHex(), star: o.position.z === 1 });
  });
  return out;
}
/** The brightest star's place: in flight, the fairy. */
const fairy = (seen: Seen[]) => seen.filter((m) => m.star).reduce((a, b) => (b.opacity * b.scale > a.opacity * a.scale ? b : a));

const place = { x: 220, y: 120 };

// a new place: flown to from the right side (it is right of the middle), there by the flight's end
{
  const scene = new THREE.Scene(), sp = new Sparkles(scene);
  sp.set([place]);
  sp.update(10_000);
  const start = fairy(meshes(scene));
  check(`a new place's fairy sets off past the right side (x ${start.x.toFixed(1)})`, start.x > 320);
  const ys: number[] = [];
  for (let t = 10_000; t <= 11_200; t += 50) { sp.update(t); ys.push(fairy(meshes(scene)).y); }
  const steps = ys.slice(1).map((y, k) => y - (ys[k] ?? y));
  check('it floats up and down on the way (bobbing)', steps.some((d) => d > 0.3) && steps.some((d) => d < -0.3));
  sp.update(14_000);
  const dust = meshes(scene).filter((m) => !m.star && m.opacity > 0);
  const far = Math.max(...dust.map((m) => Math.hypot(m.x - place.x, m.y - place.y)));
  check(`once there it is the stardust round the place (farthest speck ${far.toFixed(1)} px)`, far < 24);
  // the stardust is the same as a still's at the same moment: the flight leaves nothing behind
  const still = new THREE.Scene(), sp2 = new Sparkles(still);
  sp2.set([place]); sp2.settle(); sp2.update(14_000);
  const a = meshes(scene), b = meshes(still);
  const same = a.length === b.length && a.every((m, k) => { const n = b[k]; return !!n && Math.abs(m.x - n.x) < 1e-6 && Math.abs(m.y - n.y) < 1e-6 && Math.abs(m.opacity - n.opacity) < 1e-6; });
  check('settled, it is exactly the stardust a still shows', same);
  // the glow's colour goes between yellow and white
  const glows: number[] = [];
  for (let t = 14_000; t < 17_000; t += 100) { sp.update(t); const g = meshes(scene).find((m) => m.scale > 15); if (g) glows.push(g.colour & 0xff); }
  check(`the glow goes between yellow and white (blue ${Math.min(...glows)}-${Math.max(...glows)})`, Math.min(...glows) < 0x70 && Math.max(...glows) > 0xf0);
  // a place that moves a little (a sprite walking) is followed, not flown to again
  sp.set([{ x: place.x + 3, y: place.y }]); sp.update(17_020);
  const glow = meshes(scene).find((m) => m.scale > 15);
  check('a place moved a little is followed, still settled', !!glow && Math.abs(glow.x - (place.x + 3)) < 1e-6);
  // one that moves on is flown to from where it was
  sp.set([{ x: 60, y: 60 }]); sp.update(17_040);
  const off = fairy(meshes(scene));
  check(`a place moved on is flown to from where it was (${off.x.toFixed(1)}, ${off.y.toFixed(1)})`, Math.hypot(off.x - (place.x + 3), off.y - place.y) < 3);
  // gone a moment (a pause) and back where it was: still there, no flight
  sp.set([]); sp.update(20_000); sp.set([{ x: 60, y: 60 }]); sp.update(20_500);
  const back = meshes(scene).find((m) => m.scale > 15);
  check('gone a moment and back, it is still settled there', !!back && Math.abs(back.x - 60) < 1e-6);
}
// a place on the left is flown to from the left side
{
  const scene = new THREE.Scene(), sp = new Sparkles(scene);
  sp.set([{ x: 40, y: 150 }]); sp.update(0);
  check('a place left of the middle is flown to from the left side', fairy(meshes(scene)).x < 0);
}

// the sheet: the flight frame by frame over grey, part of the screen at 3x, the meshes drawn as the renderer's additive blending would
const outDir = process.argv[2];
if (outDir) {
  const S = 3, X0 = 120, Y0 = 40, W = 220 * S, H = 120 * S, frames = [100, 250, 400, 550, 700, 850, 1000, 1150, 1300, 1450, 1600, 1800, 2000, 2300, 3000];
  const cols = 3, rows = Math.ceil(frames.length / cols), wide = W * cols;
  const sheet = new Float32Array(wide * H * rows * 3).fill(40);
  const scene = new THREE.Scene(), sp = new Sparkles(scene);
  sp.set([place]);
  let t = 0;
  frames.forEach((ms, f) => {
    for (; t <= ms; t += 16) sp.update(t);
    const ox = (f % cols) * W, oy = Math.floor(f / cols) * H;
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible || !(o.material instanceof THREE.MeshBasicMaterial) || !(o.material.map instanceof THREE.DataTexture)) return;
      const mat = o.material, map = o.material.map, data = map.image.data, n = map.image.width, size = o.scale.x * S;
      const cx = (o.position.x - X0) * S, cy = (-o.position.y - Y0) * S, cos = Math.cos(o.rotation.z), sin = Math.sin(o.rotation.z);
      const c = mat.color, rgb = [c.r * 255, c.g * 255, c.b * 255], reach = Math.ceil(size * 0.75);
      for (let y = Math.max(0, Math.floor(cy - reach)); y < Math.min(H, cy + reach); y++) for (let x = Math.max(0, Math.floor(cx - reach)); x < Math.min(W, cx + reach); x++) {
        const u = (x + 0.5 - cx) / size, v = (y + 0.5 - cy) / size;
        const tx = Math.floor((u * cos + v * sin + 0.5) * n), ty = Math.floor((-u * sin + v * cos + 0.5) * n);
        if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
        const a = ((data[(ty * n + tx) * 4 + 3] ?? 0) / 255) * mat.opacity, k = ((oy + y) * wide + ox + x) * 3;
        for (let ch = 0; ch < 3; ch++) sheet[k + ch] = (sheet[k + ch] ?? 0) + (rgb[ch] ?? 0) * a;
      }
    });
    // the place: a dim cross
    for (let d = -6; d <= 6; d++) for (const [x, y] of [[(place.x - X0) * S + d, (place.y - Y0) * S], [(place.x - X0) * S, (place.y - Y0) * S + d]]) {
      const k = ((oy + (y ?? 0)) * wide + ox + (x ?? 0)) * 3; sheet[k] = Math.max(sheet[k] ?? 0, 120);
    }
  });
  // (a PNG's rows each start with a filter byte, 0: none)
  const raw = Buffer.alloc((wide * 3 + 1) * H * rows);
  for (let y = 0; y < H * rows; y++) for (let x = 0; x < wide * 3; x++) raw[y * (wide * 3 + 1) + 1 + x] = Math.min(255, Math.round(sheet[y * wide * 3 + x] ?? 0));
  const file = path.join(outDir, 'sparkle-flight.png');
  writePng(file, raw, wide, H * rows);
  console.log(`wrote ${file}`);
}

finish();
