/**
 * ENHANCED's controls: fire and jump on buttons of their own (hero.ts). Each is checked by its
 * trace against the original's own move from the same moment: the port with the original's
 * one button (ORIGINAL, which the lockstep checks against the original running) beside the
 * port with two (ENHANCED), the same frames, and the hero's place, animation and direction
 * compared frame by frame. And walking, fire: every frame shown checked against its animation's
 * script, with and without a stone still out.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/controls.ts [out-dir: walk-fire strips, PNG]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState } from 'c64kit';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { Game } from '../src/game';
import { V } from '../src/vars';
import { check, finish } from '../../shared/test/check';

const load = (file: string, two: boolean) => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(file))));
  m.collisionsPerLine = true;
  const g = new Game(m, true);
  g.enhanced = two;
  return g;
};
const FOOT = 'games/antiriad/test/original.state', ARMOUR = 'games/antiriad/test/armour.state';
const stick = (s: string) => 0x1f & ~((s.includes('U') ? 1 : 0) | (s.includes('D') ? 2 : 0) | (s.includes('L') ? 4 : 0) | (s.includes('R') ? 8 : 0) | (s.includes('F') ? 16 : 0));

/** Play a plan ("L:30,LJ:5": stick letters, J the jump button) and keep the hero's state each frame. */
function play(g: Game, plan: string) {
  const trace: string[] = [];
  for (const step of plan.split(',')) {
    const [what, n] = step.split(':');
    for (let i = 0; i < Number(n); i++) {
      g.m.joy1 = 0x1f; g.m.joy2 = stick(what);
      if (what.includes('J')) g.jumpButton = 1 | (g.jumpButton & 2) | (i === 0 ? 2 : 0); // (pressed: as the front end sets it)
      else g.jumpButton &= 2;
      g.tick();
      const r = g.ram;
      trace.push(`x${r[0x0200] + ((r[V.spriteXHigh] & 1) << 8)} y${r[0x0201]} a${r[V.anim].toString(16)} d${r[V.dir]} j${r[V.jumping]} s${r[V.anim + 2].toString(16)}`);
    }
  }
  return trace;
}
const firstDiff = (a: string[], b: string[]) => a.findIndex((v, i) => v !== b[i]);
const jumped = (t: string[]) => t.some((s) => / j128 /.test(s));
const thrown = (t: string[]) => t.some((s) => / sbc$/.test(s));

// Out of the armour: walking left, the original's one button jumps; with two, the jump button
// makes the same jump (the same frames), and fire doesn't jump.
const walkJumpO = play(load(FOOT, false), 'L:30,LF:60,-:40');
const walkJumpE = play(load(FOOT, true), 'L:30,LJ:60,-:40');
check(`walking, the original's button jumps (${jumped(walkJumpO)})`, jumped(walkJumpO));
check(`ENHANCED: walking, jump makes the original's walking jump, frame for frame (first different: ${firstDiff(walkJumpO, walkJumpE)})`, firstDiff(walkJumpO, walkJumpE) < 0);
const walkFire = play(load(FOOT, true), 'L:30,LF:60,-:40');
check('ENHANCED: walking, fire doesn\'t jump', !jumped(walkFire));
check('ENHANCED: walking, fire stops him and throws a stone', thrown(walkFire) && walkFire.some((s) => / aa2 /.test(s)));

// Standing: the original's up jumps straight up; the jump button makes the same jump.
const standUpO = play(load(FOOT, false), 'R:2,-:18,U:40,-:40');
const standJumpE = play(load(FOOT, true), 'R:2,-:18,J:40,-:40');
check(`standing, up jumps (${jumped(standUpO)})`, jumped(standUpO));
check(`ENHANCED: standing, jump makes the original's standing jump (first different: ${firstDiff(standUpO, standJumpE)})`, firstDiff(standUpO, standJumpE) < 0);
const standUpE = play(load(FOOT, true), 'R:2,-:18,U:40,-:40');
check(`ENHANCED: standing, up still jumps the same (first different: ${firstDiff(standUpO, standUpE)})`, firstDiff(standUpO, standUpE) < 0);
// standing, fire throws in both
const standFireO = play(load(FOOT, false), 'R:2,-:18,F:30,-:40'), standFireE = play(load(FOOT, true), 'R:2,-:18,F:30,-:40');
check(`ENHANCED: standing, fire throws as the original's does (first different: ${firstDiff(standFireO, standFireE)})`, thrown(standFireO) && firstDiff(standFireO, standFireE) < 0);
// a jump that way from standing: up and left (the original stops and jumps straight up)
const x0 = (t: string[]) => Number(/x(\d+)/.exec(t[19])?.[1]);
const xMin = (t: string[]) => Math.min(...t.map((s) => Number(/x(\d+)/.exec(s)?.[1])));
const diagO = play(load(FOOT, false), 'R:2,-:18,UL:14,-:60'), diagE = play(load(FOOT, true), 'R:2,-:18,UL:14,-:60');
check(`ORIGINAL: up and left from standing jumps straight up (x ${x0(diagO)} -> lowest ${xMin(diagO)})`, jumped(diagO) && xMin(diagO) === x0(diagO));
check(`ENHANCED: up and left from standing jumps to the left (x ${x0(diagE)} -> ${xMin(diagE)})`, jumped(diagE) && xMin(diagE) < x0(diagE) - 8);
// a quick tap, let go before the joystick's next read, still jumps
const tapE = play(load(FOOT, true), 'R:2,-:18,J:1,-:60');
check('ENHANCED: a tap of jump between the joystick\'s reads (every 7th frame) still jumps', jumped(tapE));
// ORIGINAL ignores the jump button
const ignored = load(FOOT, false);
const tapO = play(ignored, 'R:2,-:18,J:20,-:40');
check('ORIGINAL: no jump button (the original has one button)', !jumped(tapO));

// In the armour: jump lifts it as up does (takes off, climbs), frame for frame; fire fires as ever.
const upO = play(load(ARMOUR, false), '-:10,U:80,-:40'), upE = play(load(ARMOUR, true), '-:10,J:80,-:40');
const yMin = (t: string[]) => Math.min(...t.map((s) => Number(/ y(\d+)/.exec(s)?.[1])));
check(`in the armour, up takes off and climbs (y down to ${yMin(upO)})`, yMin(upO) < 60);
check(`ENHANCED: in the armour, jump does the same (first different: ${firstDiff(upO, upE)})`, firstDiff(upO, upE) < 0);
const beamO = play(load(ARMOUR, false), '-:10,U:30,R:30,RF:30,-:20'), beamE = play(load(ARMOUR, true), '-:10,U:30,R:30,RF:30,-:20');
check(`ENHANCED: in the armour, fire fires the Pulsar Beam as the original's (first different: ${firstDiff(beamO, beamE)})`, beamO.some((s) => / sbf$/.test(s)) && firstDiff(beamO, beamE) < 0);

// ---- walking, fire: the frames shown, one by one --------------------------------------------------
// He stops and throws: every frame shown is one of its animation's own (its script's: top and legs),
// the animations walking, standing and throwing only, and the throw from its start the original's
// own standing throw, frame for frame. With his stone still out there's no throw: he walks on. (It
// was: put in the stance without starting it, its one-frame script ran on from the walk's place into
// the scripts after it: the legs' frame for his top, a crouch, a turn.) With an out-dir, the frames
// round the moment as a PNG strip each, to look at.
const ANIMATIONS = 0xfca6;
/** The frames an animation's script shows (to its first command). */
function framesOf(g: Game, anim: number) {
  const script = g.word(ANIMATIONS + ((anim << 1) & 0xff)), out = new Set<number>();
  for (let pos = 2; g.ram[(script + pos) & 0xffff] >= 0x10; pos++) out.add(g.ram[(script + pos) & 0xffff]);
  return out;
}
const DATA = load(FOOT, false); // (the scripts: the game's data)
const WALK_FIRE_ANIMS = [0x80, 0x82, 0x84, 0x86, 0xa2, 0xa4, 0xb8, 0xba];
interface Shown { anim: number; legs: number; top: number; bottom: number; x: number; stone: boolean }
const shown = (g: Game): Shown => {
  const r = g.ram;
  return { anim: r[V.anim], legs: r[V.anim + 1], top: r[V.frame], bottom: r[V.frame + 1], x: r[0x0200] + ((r[V.spriteXHigh] & 1) << 8), stone: !!(r[V.anim + 2] & 0x80) };
};
const outDir = process.argv[2];
/** The hero's square (48 x 42 pixels round his sprites) from each frame's picture, side by side. */
function strip(name: string, pictures: { px: Uint8Array; x: number; y: number }[]) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const w = 48, h = 42, W = w * pictures.length, out = new Uint8Array(W * h);
  pictures.forEach(({ px, x, y }, i) => {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const X = x - 24 - 12 + xx, Y = y - 50 - 0 + yy;
      out[yy * W + i * w + xx] = xx === 0 ? 11 : X >= 0 && X < 320 && Y >= 0 && Y < 200 ? px[Y * 320 + X] : 0;
    }
  });
  rgbPng(path.join(outDir, `${name}.png`), indicesToRgb(out), W, h, 3);
}
/**
 * A long floor to walk on: Tal out of the armour (the armour's snapshot, powered up), walked left
 * into room $3E to its wall (x 78), facing left; from there right is floor for 200 pixels.
 */
const FLOOR = (() => {
  const g = load(ARMOUR, false);
  play(g, '-:400,L:10,-:100,L:200,-:20');
  if (g.ram[V.room] !== 0x3e || g.ram[V.inSuit] & 0x80 || g.ram[V.anim] !== 0x84) throw new Error(`not on the floor in room $3E: room ${g.ram[V.room].toString(16)} anim ${g.ram[V.anim].toString(16)}`);
  g.flushShapes();
  return g.m.saveState();
})();
const onFloor = (enhanced: boolean) => { const m = new C64Machine(); m.loadState(FLOOR); m.collisionsPerLine = true; const g = new Game(m, true); g.enhanced = enhanced; return g; };
/** Play a plan, keeping what's shown from its step `from` on (and its pictures, for a strip). */
function shownFrom(g: Game, plan: string, from: number, pictures = 0) {
  const seq: Shown[] = [], pics: { px: Uint8Array; x: number; y: number }[] = [];
  for (const [k, step] of plan.split(',').entries()) {
    const [what, n] = step.split(':');
    for (let i = 0; i < Number(n); i++) {
      g.m.joy1 = 0x1f; g.m.joy2 = stick(what === '-' ? '' : what);
      g.tick();
      if (k < from) continue;
      seq.push(shown(g));
      if (pics.length < pictures) pics.push({ px: renderPixels(g.m), x: shown(g).x, y: g.ram[0x0201] });
    }
  }
  return { seq, pics };
}
const key = (s: Shown) => `${s.anim.toString(16)}:${s.top.toString(16)}/${s.bottom.toString(16)}`;
/** The throw: from its first frame, its 24 (the throw, $A4, then the stone let go, $BA). */
const throwOf = (seq: Shown[]) => { const at = seq.findIndex((s) => s.anim === 0xa4); return at < 0 ? '' : seq.slice(at, at + 24).map(key).join(' '); };
// the original's own throw, standing (ORIGINAL: walking, let go, he stops; then fire)
const originalThrow = throwOf(shownFrom(onFloor(false), 'R:2,-:12,R:10,-:20,F:40', 4).seq);
/** Every frame shown is its animation's own (top and legs), and the animation one of walking, standing, throwing. */
function ownFrames(seq: Shown[], what: string) {
  const s = seq.find((t) => !(WALK_FIRE_ANIMS.includes(t.anim) && t.legs === t.anim + 1 && framesOf(DATA, t.anim).has(t.top) && framesOf(DATA, t.legs).has(t.bottom)));
  if (s) console.log(`  ${what}: animation ${s.anim.toString(16)}/${s.legs.toString(16)} showing ${s.top.toString(16)}/${s.bottom.toString(16)}`);
  return !s;
}
const shotsAt = (walk: number) => !!outDir && (walk === 6 || walk === 15);
let runs = 0, ok = 0, sameThrow = 0;
// walked 1-32 frames (all 8 of the walk's frames, 4 frames each), turned to face right first
for (let walk = 1; walk <= 32; walk++) {
  const lead = 'R:14,-:6'; // (two reads of the joystick: turned to face right)
  const { seq, pics } = shownFrom(onFloor(true), `${lead},R:${walk},RF:40`, 2, shotsAt(walk) ? walk + 24 : 0);
  if (shotsAt(walk)) strip(`walk-fire-${walk}`, pics.slice(Math.max(0, walk - 6)));
  runs++;
  if (ownFrames(seq, `walk ${walk}`)) ok++;
  if (throwOf(seq) === originalThrow) sameThrow++;
}
check(`ENHANCED: walking, fire: every frame shown is its animation's own (walking, standing, throwing), walks of 1-32 frames: ${ok}/${runs}`, ok === runs);
check(`ENHANCED: walking, fire: the throw is the original's standing throw, frame for frame (${sameThrow}/${runs}; ${originalThrow.split(' ').length} frames)`, sameThrow === runs && originalThrow.split(' ').length === 24);
// With his stone still out (thrown standing in the first room, where it stays out a long while, and
// walking 1-16 frames, short of the ledge): fire throws nothing, he walks on.
let stoneRuns = 0, stoneOk = 0, walkedOn = 0;
for (let walk = 1; walk <= 16; walk++) {
  const { seq, pics } = shownFrom(load(FOOT, true), `R:2,-:20,F:10,-:14,R:${walk},RF:10`, 4, shotsAt(walk) ? walk + 10 : 0);
  if (shotsAt(walk)) strip(`walk-fire-stone-out-${walk}`, pics.slice(Math.max(0, walk - 6)));
  stoneRuns++;
  if (ownFrames(seq, `walk ${walk}, the stone out`) && seq.every((s) => s.stone)) stoneOk++;
  const firing = seq.slice(walk);
  if (firing.every((s) => s.anim === 0x82 || s.anim === 0x86) && firing[firing.length - 1].x >= firing[0].x + 4) walkedOn++;
  else console.log(`  walk ${walk}, the stone out: ${firing.map(key).join(' ')}`);
}
check(`ENHANCED: walking, fire with his stone still out: every frame shown its animation's own (${stoneOk}/${stoneRuns})`, stoneOk === stoneRuns);
check(`ENHANCED: walking, fire with his stone still out: no throw, he walks on (${walkedOn}/${stoneRuns})`, walkedOn === stoneRuns);

finish();
