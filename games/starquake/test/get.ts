/**
 * Starquake's GET (Z, and the touch GET button, which presses Z): ORIGINAL's Z is the game's up, as it was, and picking up is up on foot
 * only. ENHANCED: Z is GET alone, which picks up on foot and on the hover pad, where up still rises; up on foot still picks up too.
 * GET on nothing puts nothing down. The touch letter screens take GET as the stick's up.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/get.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { GET_KEY, joyBits, TOUCH } from '../src/controls';
import { Game } from '../src/game';
import * as Flow from '../src/flow';
import * as Items from '../src/items';
import * as Blob from '../src/blob';
import { drawRoom } from '../src/room';
import { run } from '../src/main';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

const UP = 0xfe, NONE = 0xff;
const SEAL = 0x09; // a piece's graphic, to be picked up

// ---- the keys ----
check('the touch GET button presses Z, the key GET has', TOUCH.buttons.some((b) => b.label === 'GET' && b.key === GET_KEY && GET_KEY === 'KeyZ'));
const idle = { left: false, right: false, up: false, down: false, fire: false };
check('ORIGINAL: Z is up', joyBits(idle, new Set([GET_KEY]), false, false) === 0x7e);
check('ENHANCED: Z is not up', joyBits(idle, new Set([GET_KEY]), false, false, true) === 0x7f);
check('ENHANCED: the arrow up is up', joyBits({ ...idle, up: true }, new Set(), false, false, true) === 0x7e);

// ---- the game: a thing under BLOB, on foot and on the pad ----
/** BLOB in a room with a thing at his feet, riding or not. */
function setUp(riding: boolean) {
  const g = new Game();
  Flow.newGame(g, 424242);
  g.room = 8; drawRoom(g);
  Blob.place(g, 0, 21, 16);
  g.riding = riding ? 0x80 : 0;
  Items.show(g, SEAL, g.col, g.row);
  g.carried.fill(0x80);
  g.input = riding ? NONE : 0xfd; // (standing, the frame's fall attempt leaves down low)
  return g;
}
{
  const g = setUp(true);
  Items.touch(g);
  check('riding the pad: nothing is picked up by itself', g.carried[0] === 0x80);
  g.input = UP; g.inputPickup = 0xff;
  Items.touch(g);
  check('ORIGINAL: up on the pad does not pick up (it rises)', g.carried[0] === 0x80);
}
{
  const g = setUp(true);
  g.getPress = true;
  const p = Items.touch(g);
  check(`ENHANCED: GET on the pad picks it up (${g.carried[0]})`, g.carried[0] === SEAL && p === SEAL);
}
{
  const g = setUp(true);
  g.getPress = true;
  g.carried[0] = 0x0f;
  g.shown.forEach((s) => { s.graphic = 0xff; });
  g.lo.fill(0, 0x80);
  Items.touch(g);
  check('ENHANCED: GET on nothing puts nothing down', g.carried[0] === 0x0f);
}
{
  const g = setUp(true);
  const row = g.row;
  Blob.tick(g, UP);
  check(`ENHANCED: up on the pad still rises (row ${row} -> ${g.row}, sub ${g.sub})`, g.row < row || g.sub !== 0);
}
{
  const g = setUp(false);
  g.input = 0xfc; g.inputPickup = 0xff; // up, newly, standing
  Items.touch(g);
  check('on foot, up still picks up (both modes)', g.carried[0] === SEAL);
  const h = setUp(false);
  h.getPress = true;
  Items.touch(h);
  check('ENHANCED: on foot GET picks up too', h.carried[0] === SEAL);
}

// ---- the front end: Z in each mode ----
useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const g = p.game;
tick(60 + 6 * 50);
tap('Space'); tick(30); tap('Space'); tick(100);
check('in play, ENHANCED', p.state.mode === 'play' && p.state.enhanced);
/** A thing at BLOB's feet, Z pressed. */
function pressZ() {
  g.carried.fill(0x80);
  Items.show(g, SEAL, g.col, g.row);
  input.keyDown(GET_KEY); tick(3); input.keyUp(GET_KEY); tick(3);
  return g.carried.includes(SEAL);
}
check('ENHANCED, in the game: Z picks it up', pressZ());
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(60);
check('ORIGINAL', p.state.enhanced === false);
check('ORIGINAL, in the game: Z is up, which picks up on foot as before', pressZ());
finish();
