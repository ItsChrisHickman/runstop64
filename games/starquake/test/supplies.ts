/**
 * Starquake: ENHANCED keeps the platforms ($D4) and the laser charge ($D5) full (energy is full each room), and the bars drawn
 * full; ORIGINAL spends them as the game does.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/supplies.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const g = p.game;

tick(60 + 6 * 50);
tap('Space'); tick(30); tap('Space'); tick(100);
check('in play, ENHANCED (the default)', p.state.mode === 'play' && p.state.enhanced);

/** Fire a few shots and ask for platforms with the bars low. */
function spend() {
  g.platformsLeft = 0x20; g.charge = 0x20; g.panelDirty |= 6;
  for (let i = 0; i < 3; i++) {
    input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(25);
    input.keyDown('ArrowDown'); tick(3); input.keyUp('ArrowDown'); tick(10);
  }
  tick(5);
}
spend();
check(`ENHANCED: platforms and laser stay full (${g.platformsLeft}, ${g.charge})`, g.platformsLeft === 0x78 && g.charge === 0x78);
check('...and the bars are drawn (nothing left to redraw)', (g.panelDirty & 6) === 0);

tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(60);
check('E: ORIGINAL', p.state.enhanced === false);
spend();
check(`ORIGINAL: they are spent (${g.platformsLeft}, ${g.charge})`, g.platformsLeft < 0x20 && g.charge < 0x20);
finish();
