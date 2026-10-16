/**
 * Jet Set Willy II's guardians as drawn (Chris: "they jerk erratically after each animation: the
 * spaceman, Macaroni Ted"). The game moves a figure inside its sprite: a new image every four frames,
 * each drawn 2 pixels further on, then the sprite 8 pixels on with the first image again. The renderer
 * glides sprites between the game's frames (c64kit's C64View, loop.ts Smoothed), and it glided that
 * 8-pixel step while the image had already gone back: the figure went back, then forward, every cycle.
 *
 * - the original (its 6502 code on c64kit's C64) and the port: Macaroni Ted's sprites the same, frame
 *   for frame (the motion is the game's own; the jerk was ours);
 * - drawn as the browser draws it (the real C64View, at alphas between the game's frames, at 60 and
 *   144 a second): his figure (its leftmost lit pixel) only ever goes the way he walks, never back,
 *   and never more than an image's step at once (its leftmost pixel: up to 4); Willy walking too;
 * - a sprite moving every frame still glides (the smoothing kept for those).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/sprites.ts
 */
import fs from 'node:fs';
import { PixelRenderer } from 'c64kit';
import { C64, unpackState, type SpriteCapture } from '../../../packages/c64kit/src/c64/machine';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { check, finish } from '../../shared/test/check';

const title = unpackState(new Uint8Array(fs.readFileSync('games/jsw2/assets/jsw2-title.state')));

const MACARONI_TED = 63;
/** A new game (fire to start), then left from the bathroom through room 64 into Macaroni Ted (the route's way), where he stops. */
const stick = (f: number, room: number) => (f >= 80 && f < 83 ? 0x0f : f >= 320 && room !== MACARONI_TED ? 0x1b : 0x1f);
const guardians = (sprites: SpriteCapture[]) => sprites.filter((s) => s.n !== 0 && s.y < 186).map((s) => `${s.n}:${s.x},${s.y}:${[...s.data.slice(0, 63)].join('.')}`).join(' ');

// ---- the original and the port, frame for frame ----
{
  // (into the room the game's own way, as travel does: the way down leads there; the two are steered
  // alike, the joystick only to start, so they keep in step: input mid-play reaches the 6502 a scan
  // later or earlier)
  const into = (ram: Uint8Array, f: number, state: { going: boolean }) => {
    if (f >= 320 && !state.going) { state.going = true; ram[0x816c] = MACARONI_TED; ram[0x8063] = 0xa2; ram[0x82e4] = ram[0x8292] = ram[0x835d] = 0; }
  };
  const orig = new C64(), oState = { going: false };
  orig.loadState(title);
  orig.hooks.set(0xea31, () => 'continue');
  let f = 0;
  const step = orig.cpu.step.bind(orig.cpu);
  orig.cpu.step = () => { if (orig.cpu.pc === 0x4bae) into(orig.ram, f, oState); return step(); };
  const g = new NativeHost(port, title), gState = { going: false };
  g.onWait = (site) => { if (site === 0x4bae) into(g.m.ram, f, gState); };
  let same = 0, seen = 0;
  for (f = 0; f < 600; f++) {
    orig.joy1 = g.m.joy1 = 0x1f; orig.joy2 = g.m.joy2 = f >= 80 && f < 83 ? 0x0f : 0x1f;
    orig.runFrame(); g.tick();
    if (f < 400) continue;
    seen++;
    if (guardians(orig.capture.sprites) === guardians(g.m.capture.sprites)) same++;
  }
  check(`Macaroni Ted's sprites, the original and the port: the same, frame for frame (${same} of ${seen})`, same === seen && orig.ram[0x13] === MACARONI_TED);
}

/**
 * The room as the browser draws it: the real C64View over the port, its sprites rendered at a
 * display's alphas between the game's frames (FixedLoop: 50 game frames a second). For sprite `n`,
 * the leftmost lit pixel's x on each frame drawn.
 */
function drawn(n: number, hz: number, start: (ram: Uint8Array, f: number) => boolean, frames: number) {
  const g = new NativeHost(port, title);
  let f = 0;
  for (; !start(g.m.ram, f); f++) { g.m.joy1 = 0x1f; g.m.joy2 = stick(f, g.m.ram[0x13]); g.tick(); }
  const from = f;
  const renderer = new PixelRenderer(), view = new C64View(renderer, g.m);
  const lefts: number[] = [];
  let acc = 0;
  for (let shown = 0; f < from + frames; shown++) {
    acc += 1000 / hz;
    while (acc >= 20) { acc -= 20; g.m.joy1 = 0x1f; g.m.joy2 = stick(f, g.m.ram[0x13]); g.tick(); f++; view.update(); }
    view.render(acc / 20);
    const h = renderer.sprites.find((s) => s.visible && s.n === n && s.surface && s.y < 136);
    const sp = h?.surface;
    if (!h || !sp) continue;
    let left = Infinity;
    for (let y = 0; y < sp.height; y++) for (let x = 0; x < sp.width; x++) if (sp.pixels[y * sp.width + x] !== TRANSPARENT) left = Math.min(left, x);
    if (left < Infinity) lefts.push(h.x + left);
  }
  return lefts;
}
/** How the figure moves from one frame drawn to the next: the moves the other way (back), and the biggest. */
function moves(lefts: number[], dir: -1 | 1) {
  let back = 0, most = 0, went = 0;
  for (let i = 1; i < lefts.length; i++) {
    const d = (lefts[i] - lefts[i - 1]) * dir;
    if (d < -0.01) back++;
    most = Math.max(most, Math.abs(d));
    went += d;
  }
  return { back, most, went };
}
for (const hz of [60, 144]) {
  // (from a moment after Willy comes in and stands: Ted walks left, 16 frames a cycle of four images)
  let inTed = -1;
  const ted = moves(drawn(1, hz, (ram, f) => { if (inTed < 0 && ram[0x13] === MACARONI_TED) inTed = f; return inTed >= 0 && f >= inTed + 15; }, 60), -1);
  check(`${hz} a second: Macaroni Ted's figure only goes the way he walks (back ${ted.back} times; at most ${ted.most.toFixed(2)} px a frame drawn; ${ted.went.toFixed(0)} px in all)`, ted.back === 0 && ted.most <= 4.01 && ted.went > 20);
}
// Willy walking left through the bathroom
const willy = moves(drawn(0, 60, (_, f) => f >= 330, 100), -1);
check(`Willy walking: his figure only goes the way he walks (back ${willy.back} times; at most ${willy.most.toFixed(2)} px a frame drawn; ${willy.went.toFixed(0)} px)`, willy.back === 0 && willy.most <= 4.01 && willy.went > 20);

// ---- a sprite moving every frame still glides ----
{
  const m = new C64(), renderer = new PixelRenderer(), view = new C64View(renderer, m);
  const xs: number[] = [];
  for (let f = 0; f < 10; f++) {
    const data = new Uint8Array(64).fill(f % 2 ? 0xff : 0x0f); // (its image changing as it goes, too)
    m.capture.sprites = [{ n: 3, x: 100 + 3 * f, y: 100, data, colour: 1, multicolour: false, expandX: false, expandY: false, behind: false, mc1: 0, mc2: 0 }];
    view.update();
    for (const a of [0, 0.5]) { view.render(a); xs.push(renderer.sprites[0].x); }
  }
  const steps = xs.slice(8).map((x, i) => x - xs[7 + i]);
  check(`a sprite moving every frame (3 px, a new image each frame) glides: 1.5 px each half frame (${steps.map((s) => s.toFixed(1)).join(' ')})`, steps.every((s) => Math.abs(s - 1.5) < 0.01));
}

finish();
