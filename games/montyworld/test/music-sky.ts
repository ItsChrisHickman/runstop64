/**
 * THE FLIGHT's music, through the session (music/regions.ts, games/montyotr/src/session.ts): the sky plays Auf Wiedersehen Monty's main
 * theme (tune 0, song 1 of that game's .sid: the one asset both games share), a deliberate exception to the one song (Chris, 2026-11-24).
 * - Coming into the sky starts the theme from its beginning, from its own .sid, with no crossing; none of the game's own sound effects
 *   (routines of Hubbard's .sid) is called while it plays: they are the kit's (sfx.ts, `music.overOther`), on the overlay SID over
 *   the theme: the frigatebird's screech, a coin, a death; their SID writes are made, and the theme plays on after them.
 * - A death in the sky, and the restart in the same leg, leave it playing (nothing is loaded again).
 * - Into the Andes: Hubbard's song again, the Andes' version, loaded clean (no crossing).
 * - Continuing from a save made in the sky plays the theme.
 * - With the sound effects chosen (M), the sky keeps Hubbard's .sid loaded for them; music back on starts the theme again.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-sky.ts
 */
import { Input, PixelRenderer, sidLog, type SfxName } from 'c64kit';
import { SfxSequencer } from '../../../packages/c64kit/src/sid/sfx';
import { montyMap } from '../../montyotr/src/map';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { AND } from '../src/andes';
import { WORLD } from '../src/data';
import { run } from '../src/main';
import { AWM_THEME } from '../src/music/regions';
import { FLY } from '../src/sky';

useMemoryStorage();
const input = new Input(nowhere);
const launch = () => run({ renderer: new PixelRenderer(), input, canvas: nowhere });
let p = launch();
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const theme = 'file' in AWM_THEME ? AWM_THEME.file : null;
const sfxCalls = () => sidLog.calls.filter(([addr]) => addr === WORLD.music.playSfx).length;

tick(5);
tap('Space');
tick(80);
const g = () => p.game;
check(`play begins (room ${g().roomId})`, p.state.mode === 'play' && g().roomId === 0);

/** Travel to a room (the pause map's way: every room on the grid marked found first). */
function travel(room: number) {
  const at = g().data.exitGrid.image.indexOf(room);
  p.state.found.rooms[room] = [0x40, 0x80, Math.floor(at / g().data.exitGrid.cols), at % g().data.exitGrid.cols];
  if (!montyMap.go(String(room), g(), p.state.found)) throw new Error(`no travel to ${room}`);
  for (let n = 0; n < 300 && (g().roomId !== room || g().freeze); n++) tick();
}

// into the sky
const before = sidLog.loads.length;
travel(FLY.mail);
check(`into the sky: Auf Wiedersehen Monty's theme from its own .sid, song ${theme?.song} (loads since: ${sidLog.loads.slice(before).join(', ')})`,
  g().roomId === FLY.mail && sidLog.loads.slice(before).join() === 'file' && sidLog.files.at(-1)?.url === theme?.url && sidLog.files.at(-1)?.song === 1);
const calls = sfxCalls();
tick(600);
check(`in the sky none of Hubbard's .sid's sound effects is called while the theme plays (${sfxCalls() - calls} calls)`, sfxCalls() === calls);

/** The SID writes a kit effect makes on the overlay SID (the worklet's sequencer, frame by frame until it is done). */
function effectWrites(name: SfxName) {
  let writes = 0;
  const seq = new SfxSequencer(() => { writes++; });
  seq.start(name);
  for (let n = 0; n < 100 && seq.busy; n++) seq.frame();
  return writes;
}
/** After `act`, the kit's effect `name` over the theme, its writes made, nothing loaded and none of Hubbard's routines called; and the theme still the last thing loaded. */
function overTheme(what: string, name: SfxName, act: () => void) {
  const fx = sidLog.sfx.length, loads = sidLog.loads.length, hubbard = sfxCalls();
  act();
  const played = sidLog.sfx.slice(fx);
  check(`${what}: the kit's ${name} over the theme (${played.join(', ') || 'none'}; ${effectWrites(name)} SID writes), the theme plays on (loads ${sidLog.loads.length - loads}, last ${sidLog.loads.at(-1)}; Hubbard's calls ${sfxCalls() - hubbard})`,
    played.includes(name) && effectWrites(name) > 0 && sidLog.loads.length === loads && sidLog.loads.at(-1) === 'file' && sfxCalls() === hubbard);
}

// the frigatebird coming in: its screech (its roller's clock put a frame before its pass: a death on the way restarts the leg's clock)
overTheme('the frigatebird coming in', 'screech', () => {
  const r = g().rollers.find((q) => g().data.rollers[q.index]?.sound !== undefined), e = r && g().data.rollers[r.index];
  if (r && e) { r.t = e.start - 1; tick(); }
});

// a coin: the plane flown onto L1's (its cell, 24 across and 2 down, as the leg's box reckons Monty's place)
overTheme('a coin taken in the sky', 'coin', () => {
  const score = g().score;
  for (let n = 0; n < 8 && g().score === score; n++) { g().x2 = 0x0c + (24 + 4) * 4; g().y = 0x32 + (2 + 3) * 8 - 8; tick(); }
});

// a death in the leg and its restart: the theme plays on
const loads = sidLog.loads.length;
overTheme('a death in the sky', 'kill', () => { g().actionCounter = 1; tick(); });
for (let n = 0; n < 600 && (g().actionCounter !== 0 || g().script !== null || g().freeze); n++) tick();
tick(20);
check(`a death in the first leg starts it again (room ${g().roomId}) and the theme plays on: nothing loaded again (${sidLog.loads.length - loads})`, g().roomId === FLY.mail && sidLog.loads.length === loads);

// the sound effects chosen in the sky: Hubbard's .sid for them; the music back on: the theme from its start
tap('KeyM');
check(`M in the sky: the sound effects, from Hubbard's .sid (${sidLog.loads.at(-1)})`, sidLog.loads.at(-1) === 'tune');
tap('KeyM');
check(`M again: the theme from its start (${sidLog.loads.at(-1)})`, sidLog.loads.at(-1) === 'file');

// on into the Andes: Hubbard's song, the Andes' version, no crossing
travel(AND.jump);
check(`into the Andes: Hubbard's song again, the Andes' version (${WORLD.music.tuneFor?.(AND.jump)?.id}), loaded clean, no crossing (${sidLog.loads.at(-1)}, crossing ${sidLog.crossings.at(-1)})`,
  g().roomId === AND.jump && sidLog.loads.at(-1) === 'tune' && sidLog.tunes.at(-1) !== null && sidLog.crossings.at(-1) === false);

// a save made in the sky: continuing from it plays the theme
travel(FLY.storm);
tick(20);
p = launch();
const fromSave = sidLog.loads.length;
continueFromTitle(p, input, tick);
tick(20);
check(`continuing from a save made in the sky (room ${g().roomId}) plays the theme (loads: ${sidLog.loads.slice(fromSave).join(', ')})`, g().roomId === FLY.storm && sidLog.loads.at(-1) === 'file' && sidLog.files.at(-1)?.song === 1);

finish();
