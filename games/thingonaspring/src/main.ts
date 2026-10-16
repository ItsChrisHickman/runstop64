import type { Host } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import { makeEnhanced } from './assists';
import { hintSpots } from './hint-spots';
import { makeMap } from './map';
import stateUrl from '../assets/toas-title.state?url';

/**
 * Thing on a Spring — a translated port: the original 1985 code translated routine
 * by routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime, with the game's own SID music. It starts from the game's memory as
 * it stands at the title screen (see build/README.md), so there's no loading.
 */
export const info = {
  title: 'Thing on a Spring',
  progress: 'Your progress is saved each time Thing enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Thing_on_a_Spring">Thing on a Spring</a> (1985): guide Thing, bouncing on his
    spring, through the toy factory, find the jigsaw pieces and stop the evil goblin. All credit belongs to its creators:</p>
    <ul>
      <li>Programming: Jason Perkins and Anthony Clarke</li>
      <li>Graphics: Mark Rogers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a> &mdash; his very first game tune</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64. The game times itself by counting
    (and does much of its work in raster interrupts), so its timing is kept to within a raster line.
    The high-score table and title scroller credit the creators (the only surviving copies had crackers' names in them).</p>
    <p>Controls: arrows (or WASD) move &middot; Space (or Z, X, pad A) for fire &middot; P or Esc pauses (with the map) &middot; 
    joysticks and gamepads work &middot; M mutes</p>
    <p>Added for runstop64: P (or the gear) pauses with a map of the factory: the screens you've been in, the pieces,
    oil cans and switches you've seen, how many pieces you've found, and travel back to any screen you've been in.
    Progress is saved each time you enter a screen (coming back carries on where you were; T on the pause screen goes to the title), and after the oil runs out
    you can continue from the last screen you entered.</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen): steer in the air, a moment's grace for
    a late or early bounce, help onto ledges you just catch, gentler falls, oil that lasts twice as long (and at least
    half on continuing), and sparkles on what moves the game on. The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/thingonaspring/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

/** The name entry's loop waiting for a key, and RETURN having put the name in (hooks: re/engine.json). */
const NAME_LOOP = 0x7aae, NAME_DONE = 0x7b04;

/** The joystick keys stay the joystick (the game takes the joystick as well as its keys). */
const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];

export function run(host: Host) {
  const enhanced = makeEnhanced();
  let options: Readonly<Record<string, boolean>> = {};
  const all = () => true, none = () => false;
  /** The high score's name is being typed (hooks at $7AAE, its loop, and $7B04, RETURN taken: re/engine.json). */
  let naming = false;
  return runNative(host, {
    id: 'thingonaspring',
    // the title has no empty row: ENTER CONTINUE alone, under the key selection (FIRE: SPACE starts a game)
    strip: { y: 172, x: 243, short: true },
    state: stateUrl,
    port,
    room: (ram) => ram[0x5e] | (ram[0x5f] << 8), // Thing's position on the factory map
    // the title's raster interrupt; not while a high score's name is typed under it (its RETURN is the
    // name's, not ENTER CONTINUE's)
    titleWaits: (ram) => (ram[0xfffe] | (ram[0xffff] << 8)) === 0x7254 && !naming,
    // The pause screen's map of the factory, with travel back to screens been in (map.ts, travel.ts).
    map: makeMap(),
    onAssists: (a) => { options = a; },
    // ENHANCED (assists.ts): kinder movement, oil that lasts, cheaper deaths, and hints (sparkles).
    assists: [{
      id: 'enhanced', long: 'ENHANCED', default: true,
      apply: (ram, on) => enhanced.afterFrame(ram, on ? all : none),
    }],
    hints: hintSpots,
    hintsWith: 'enhanced',
    onHook: (pc, ram) => {
      if (pc === NAME_LOOP) naming = true;
      else if (pc === NAME_DONE) naming = false;
      enhanced.hook(pc, ram, options.enhanced ? all : none);
    },
    // A high score's name ($7A21: ten letters, RETURN puts it in, DEL rubs out) on a touch screen:
    // picked with the stick, JUMP, RET (games/shared/letters.ts); the line naming them goes under the table.
    names: {
      spec: { alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. ', max: 10, button: { label: 'JUMP', key: 'Space' } },
      asking: (_ram, wait) => naming && wait !== port.mainLoopWait,
      cursor: (ram) => ({ col: ram[0xae], row: ram[0xaf] }), // (where it prints its * cursor: $7AB5)
      hintY: 177,
    },
    // A moment's grace after a resume: no oil is taken ($56E0, where the game is about to take some: as the slow drain
    // leaves it, A the oil as it is, carry set), so a creature, a live wire or a ceiling costs nothing for its 3 seconds.
    grace: { hook: (pc, ram) => { if (pc === 0x56e0) { cpu.a = ram[0x8f]; cpu.c = 1; } } },
    fullHealth: (ram, _colour, on) => enhanced.onContinue(ram, on.enhanced ? all : none),
    // (R would open the original's key-redefining screen, which lists C64 keys: not on this keyboard.)
    reserved: ['KeyR', ...JOYSTICK_KEYS],
    // Touch: the stick (Thing goes up and down too), and fire: his jump (with a direction, the big one).
    touch: { stick: '8', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
  });
}
