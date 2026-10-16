/**
 * Autosave check: play a native game, save at a main-loop frame boundary,
 * resume a second copy from the packed save, and keep both going with the same
 * input: they must stay identical.
 *
 * Saves are taken two ways: between frames, and the way the front end's autosave
 * takes them (play.ts: at the main loop's wait, inside the frame, where a game that
 * times itself may have had an interrupt handler under way when the last frame ended).
 * Resuming the second kind, the rest of the frame runs first, with the frame's input.
 *
 *   node /tmp/resume.mjs <game> [frames-before-save] [frames-after]
 */
import fs from 'node:fs';
import { packState, unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../host';
import { GAMES, setJoy } from './games';

const [gameId, beforeArg = '600', afterArg = '1500'] = process.argv.slice(2);
const game = GAMES[gameId];
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
let failed = false;
// the joystick, a frame each (random but repeatable)
const inputs: number[] = [];
{
  let seed = 9, joy = 0x1f;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let f = 0; f < 100_000; f++) {
    if (f % 25 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8, 16]) if (rnd() < 0.3) joy &= ~b; }
    inputs.push(f < 40 ? (f >= 30 ? 0x0f : 0x1f) : joy);
  }
}

const port = game.port;
if (!port) throw new Error(`${gameId}: not a native port`);

function check(how: 'between frames' | 'at the wait', before: number) {
  if (!port) return;
  const a = new NativeHost(port, title);
  const input = (f: number) => inputs[f];
  const saves: MachineState[] = [];
  let f = 0;
  if (how === 'at the wait') a.onWait = (site) => { if (f >= before && !saves.length && site === port.mainLoopWait) { const s = a.save(); if (s) saves.push(s); } };
  for (; !saves.length; f++) { setJoy(a.m, game, input(f)); a.tick(); if (how === 'between frames' && f >= before) { const s = a.save(); if (s) saves.push(s); } }
  a.onWait = undefined;
  const packed = packState(saves[0]);
  const b = NativeHost.resume(port, unpackState(packed));
  // (at the wait: that frame's rest, with its input)
  if (how === 'at the wait') { setJoy(b.m, game, input(f - 1)); b.tick(); }
  for (let n = 0; n < Number(afterArg); n++, f++) {
    const j = input(f);
    setJoy(a.m, game, j); setJoy(b.m, game, j);
    a.tick(); b.tick();
    for (let k = 0; k < 0x10000; k++) if ((k < 0x100 || k >= 0x200) && a.m.ram[k] !== b.m.ram[k]) {
      console.log(`${gameId} (saved ${how}): DIVERGED ${n} frames after resuming, at $${k.toString(16)}: ${a.m.ram[k]} vs ${b.m.ram[k]} (waits: $${a.lastWait.toString(16)} / $${b.lastWait.toString(16)}; fallbacks ${[...a.fallbacks]} / ${[...b.fallbacks]})`);
      failed = true;
      return;
    }
  }
  console.log(`${gameId}: saved ${how} at frame ${before} (${packed.length} bytes), resumed copy identical for ${afterArg} frames`);
}
check('between frames', Number(beforeArg));
// (several points: an interrupt handler may or may not be under way as a frame ends)
for (const at of [Number(beforeArg), Number(beforeArg) + 1, Number(beforeArg) + 7, Number(beforeArg) + 13]) check('at the wait', at);
if (failed) process.exit(1);
