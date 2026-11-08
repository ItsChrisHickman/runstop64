/**
 * Monty's death against the original, with its own interrupts and the whole death tune (nothing patched out): Monty is put in room 0 at a place and the original is sent to its
 * death routine (`$946E`). From the screen it has drawn (the death picture where he died, `$8D7F`, kept as the picture, `$D254`) the rebuilt `DeathScene` is run beside it, one
 * interrupt a frame: the screen's bytes are compared with the original's every frame while the picture rises, and the frames the whole death takes (to the original's `$940C`,
 * where the room is entered again) with `scene.frames`.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/death.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { DeathScene, SHAKE_DONE, SHAKE_FRESH } from '../src/death';
import { A } from './lockstep-core';
import { machineFrom } from './original';

const STATE = 'games/montymole/build/room0.state';
const DRAWN = 0x8d9f, REENTER = 0x940c;
let compared = 0, wrongFrames = 0, runs = 0;
const durations: string[] = [];

function die(x: number, y: number, counter: number): void {
  const m = machineFrom(STATE);
  m.cpu.iff1 = true; m.cpu.iff2 = true;
  m.mem[A.x] = x; m.mem[A.y] = y; m.mem[0x9179] = counter;
  m.cpu.pc = 0x946e; m.cpu.halted = false;
  const held: { scene: DeathScene | null } = { scene: null };
  let frame = 0, ended = -1, differing = 0, begun = -1;
  m.onStep = (pc) => {
    if (pc === DRAWN && held.scene === null) {
      begun = frame; // the death picture is drawn and kept: the scene starts from this screen
      held.scene = new DeathScene({ picture: m.mem.slice(A.picture, A.picture + 6144), screen: m.mem.slice(A.screen, A.screen + 6144), attrs: m.mem.slice(A.attrs, A.attrs + 768), coalMask: m.mem.slice(A.attrBuffer, A.attrBuffer + 768) }, x, y, counter);
    }
    if (pc === REENTER && ended < 0) ended = frame;
  };
  for (frame = 0; frame < 1500 && ended < 0; frame++) {
    m.runFrame();
    const scene = held.scene;
    if (scene === null || ended >= 0) continue;
    if (frame > begun) scene.interrupt(); // (the frame the picture is drawn in has had no interrupt since: the next has the first)
    const screen = m.mem.subarray(A.screen, A.screen + 6144);
    let same = true;
    for (let i = 0; i < 6144 && same; i++) if (screen[i] !== scene.field.screen[i]) same = false;
    compared++;
    if (!same) differing++;
  }
  runs++;
  wrongFrames += differing;
  const scene = held.scene;
  if (scene === null) { check(`the death at x ${x} y ${y}: the original reached its death picture`, false); return; }
  const frames = scene.frames;
  const original = ended - begun;
  durations.push(`y ${y}: original ${original}, rebuilt ${frames}`);
  check(`the death at x ${x} y ${y} (counter ${counter}): the whole death takes the original ${original} frames and the rebuilt scene ${frames} (within 15: the interrupt routine inside the notes costs what the picture it draws costs, and where the loop ends is at a note)`, Math.abs(original - frames) <= 15);
}

for (const [x, y] of [[24, 0x27], [100, 0x50], [150, 0x7a], [200, 0xa0], [60, 0xb4]] as const) die(x, y, SHAKE_FRESH);
die(60, 0x50, SHAKE_DONE);
console.log(`   ${runs} deaths, ${compared} frames compared; ${durations.join('; ')}`);
check(`the screen while the picture rises equals the original's in every frame (${wrongFrames} of ${compared} frames differ)`, wrongFrames === 0 && compared > 500);
finish();
