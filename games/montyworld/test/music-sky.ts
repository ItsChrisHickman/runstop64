/**
 * THE FLIGHT's music, through the session (music/regions.ts, games/montyotr/src/session.ts): the sky plays Auf Wiedersehen Monty's main
 * theme (tune 0, song 1 of that game's .sid: the one asset both games share), a deliberate exception to the one song (Chris, 2026-11-24).
 * - Coming into the sky starts the theme from its beginning, from its own .sid, with no crossing; none of the game's own sound effects
 *   (routines of Hubbard's .sid) is called while it plays.
 * - A death in the sky, and the restart in the same leg, leave it playing (nothing is loaded again).
 * - Into the Andes: Hubbard's song again, the Andes' version, loaded clean (no crossing).
 * - Continuing from a save made in the sky plays the theme.
 * - With the sound effects chosen (M), the sky keeps Hubbard's .sid loaded for them; music back on starts the theme again.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-sky.ts
 */
import { Input, PixelRenderer, sidLog } from 'c64kit';
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

// a death in the leg and its restart: the theme plays on
const loads = sidLog.loads.length;
g().actionCounter = 1;
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
