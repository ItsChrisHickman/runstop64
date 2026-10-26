/**
 * Stills of the sparkles over Moley Christmas's pictures (test/hints.ts writes them when given an out-dir). There is no GPU here, so the
 * real `Sparkles` of c64kit (packages/c64kit/src/overlay.ts) runs on a Three.js scene of its own, exactly as the renderer runs it, and
 * its meshes (where each speck and star is, how big, what colour, how opaque, which texture) are drawn into the picture the way the
 * renderer's additive blending would: each pixel adds the texture's alpha times the mesh's colour and opacity.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { PixelRenderer } from 'c64kit';
import { Sparkles } from '../../../packages/c64kit/src/overlay';
import { writePng } from '../../../tools/png';
import { Display } from '../src/display';
import { Game } from '../src/game';
import { hintsOf, PRIZE_LAST } from '../src/hints';
import { SeededRandom } from '../src/random';
import { SPECTRUM_PALETTE } from '../src/palette';
import { MoleyView, SURFACE_HEIGHT, SURFACE_WIDTH } from '../src/view';

/** Pixels of the still for each of the picture's. */
const SCALE = 4;

/** From `from` ms on, the first moment (within 6 s) a star is at its fullest, so a still shows the effect at its best: the sparkles' time is the page's clock, a still can pick any. */
function brightest(sparkles: Sparkles, scene: THREE.Scene, from: number): number {
  let best = from, most = -1;
  for (let ms = from; ms < from + 6000; ms += 40) {
    sparkles.update(ms);
    let total = 0;
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible || !(o.material instanceof THREE.MeshBasicMaterial) || o.scale.x > 15) return;
      total += o.material.opacity * o.scale.x * o.scale.x;
    });
    if (total > most) { most = total; best = ms; }
  }
  return best;
}

/** The picture of the game (ENHANCED's look), with the sparkles as they are at `ms`, as RGB at SCALE times the size. */
export function stillWithSparkles(display: Display, ms: number): Buffer {
  const game = display.game;
  const renderer = new PixelRenderer();
  const view = new MoleyView(renderer, display, 'enhanced');
  renderer.snap = true;
  view.update();
  view.render(0);
  const hints = hintsOf(game);
  view.sparkle(hints);
  const indexes = renderer.picture();
  const W = SURFACE_WIDTH * SCALE, H = SURFACE_HEIGHT * SCALE;
  const rgb = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = SPECTRUM_PALETTE[indexes[Math.floor(y / SCALE) * SURFACE_WIDTH + Math.floor(x / SCALE)]] ?? 0;
      const o = (y * W + x) * 3;
      rgb[o] = c >> 16; rgb[o + 1] = (c >> 8) & 255; rgb[o + 2] = c & 255;
    }
  }
  const scene = new THREE.Scene();
  const sparkles = new Sparkles(scene);
  sparkles.set(renderer.sparkles.markers);
  sparkles.settle();
  sparkles.update(brightest(sparkles, scene, ms));
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    const material = object.material;
    if (!(material instanceof THREE.MeshBasicMaterial) || !(material.map instanceof THREE.DataTexture)) return;
    const data = material.map.image.data;
    const n = material.map.image.width;
    const size = object.scale.x, centre = { x: object.position.x * SCALE, y: -object.position.y * SCALE };
    const turn = object.rotation.z, cos = Math.cos(turn), sin = Math.sin(turn);
    const colour = material.color.getHex();
    const tint = [colour >> 16, (colour >> 8) & 255, colour & 255];
    const reach = Math.ceil(size * SCALE * 0.75);
    for (let y = Math.max(0, Math.floor(centre.y - reach)); y < Math.min(H, Math.ceil(centre.y + reach)); y++) {
      for (let x = Math.max(0, Math.floor(centre.x - reach)); x < Math.min(W, Math.ceil(centre.x + reach)); x++) {
        const u = (x + 0.5 - centre.x) / (size * SCALE), v = (y + 0.5 - centre.y) / (size * SCALE);
        const tx = Math.floor((u * cos + v * sin + 0.5) * n), ty = Math.floor((-u * sin + v * cos + 0.5) * n);
        if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
        const alpha = ((data[(ty * n + tx) * 4 + 3] ?? 0) / 255) * material.opacity;
        if (alpha <= 0) continue;
        const o = (y * W + x) * 3;
        for (let k = 0; k < 3; k++) rgb[o + k] = Math.min(255, rgb[o + k] + (tint[k] ?? 0) * alpha);
      }
    }
  });
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.round(rgb[y * W * 3 + x] ?? 0);
  return raw;
}

/** Write a still to `dir/name.png`. */
export function writeStill(dir: string, name: string, display: Display, ms = 2300): void {
  fs.mkdirSync(dir, { recursive: true });
  writePng(path.join(dir, `${name}.png`), stillWithSparkles(display, ms), SURFACE_WIDTH * SCALE, SURFACE_HEIGHT * SCALE);
}

/** A game at a room's start with its picture drawn, `tweak` applied, then some passes with Monty parked out of the way. */
function scene(room: number, tweak: (g: Game) => void, passes: number, park: { x: number; y: number }): Display {
  const game = new Game(new SeededRandom(5));
  const display = new Display(game);
  display.hud();
  game.travel(room);
  game.pass(0);
  tweak(game);
  for (let i = 0; i < passes; i++) {
    game.gauge.refill();
    game.monty.x = park.x; game.monty.y = park.y; game.monty.state = 0; game.monty.phase = 0;
    game.pass(0);
  }
  return display;
}

/** The stills: each room's sparkles, and two where there are none (what kills, and an exit while an item is left). Returns how many. */
export function writeStills(dir: string): number {
  const corner = { x: 0x04, y: 0x78 }, high = { x: 0xa0, y: 0x50 };
  const prize = (second: number) => (g: Game): void => {
    g.rooms.r2.puzzle = 1;
    const [first, half] = [g.entities[4], g.entities[5]];
    first.x = 0xdc; first.y = 0x70; first.frame = PRIZE_LAST;
    half.x = 0xdc; half.y = 0x60; half.frame = second;
  };
  const stills: [string, Display][] = [
    ['room0-exit', scene(0, (g) => { g.items.left = 0; g.entities[6].x = 0xd8; g.entities[6].y = 0x50; }, 1, corner)],
    ['room0-items-left-no-sparkle', scene(0, (g) => { g.entities[6].x = 0xd8; g.entities[6].y = 0x50; }, 1, corner)],
    ['room1-exit', scene(1, (g) => { g.items.left = 0; g.rooms.r1.stage = 0x63; }, 70, { x: 0xee, y: 0x78 })],
    ['room2-spot', scene(2, () => {}, 3, corner)],
    ['room2-prize-last-picture', scene(2, prize(PRIZE_LAST), 1, high)],
    ['room2-prize-kills-no-sparkle', scene(2, prize(0x23), 1, high)],
    ['room3-lane-end', scene(3, () => {}, 2, { x: 0x18, y: 0x08 })],
    ['room3-past-the-car', scene(3, (g) => { g.rooms.r3.sleep = 60; }, 2, { x: 0x40, y: 0x78 })],
    ['room4-exit-open', scene(4, (g) => { g.items.left = 0; }, 262, { x: 0xee, y: 0x78 })],
    ['room5-pile', scene(5, () => {}, 2, { x: 0x60, y: 0x40 })],
    ['room5-shop', scene(5, (g) => { g.rooms.r5.carrying = 1; }, 2, { x: 0x60, y: 0x40 })],
  ];
  for (const [name, display] of stills) writeStill(dir, name, display);
  return stills.length;
}
