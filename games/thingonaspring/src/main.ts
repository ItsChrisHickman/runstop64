import type { Host } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import { makeEnhanced } from './assists';
import { hintSpots } from './hint-spots';
import { endingStats, thingEnding, won } from './ending';
import { makeMap } from './map';
import stateUrl from '../assets/toas-title.state?url';

/**
 * Thing on a Spring — a translated port: the original 1985 code translated routine
 * by routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime, with the game's own SID music. It starts from the game's memory as
 * it stands at the title screen (see build/README.md), so there's no loading.
 */
export { info } from './info';

/** The name entry's loop waiting for a key, and RETURN having put the name in (hooks: re/engine.json). */
const NAME_LOOP = 0x7aae, NAME_DONE = 0x7b04;
/** The oil ($8F, 0-255; a refill caps it at $FF) and where the death routine ends, on to the game's end (hook $669F). */
const OIL = 0x8f, FULL_OIL = 0xff, DEATH_PLAYED_OUT = 0x669f;

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
    // ENHANCED (assists.ts): kinder movement and hints (sparkles); the oil running out is a life lost (`vitals` below).
    assists: [{
      id: 'enhanced', long: 'ENHANCED', default: true,
      apply: (ram, on) => enhanced.afterFrame(ram, on ? all : none),
    }],
    hints: hintSpots,
    hintsWith: 'enhanced',
    // the reward for winning (ENHANCED): a montage of the factory's rooms, the parade, THE END (src/ending.ts)
    ending: { spec: thingEnding, won, stats: endingStats },
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
    // A moment's grace after a resume: no oil is taken ($56E0, where the game is about to take some: A the oil as it is,
    // carry set), so a creature, a live wire or a ceiling costs nothing for its 3 seconds.
    grace: { hook: (pc, ram) => { if (pc === 0x56e0) { cpu.a = ram[OIL]; cpu.c = 1; } } },
    // Continuing (CONTINUE? and the rest) starts with the oil full, as the Pendragon games' continue gives full health. In
    // ENHANCED the oil running out is a life lost, not the end: once the death has played out ($669F, re/engine.json) he is
    // put back at the start of the room he died in, at full oil (shared/native/play.ts `lifeEnds`), unlimited.
    vitals: { fullHealth: (ram) => { ram[OIL] = FULL_OIL; }, lifeEnds: DEATH_PLAYED_OUT },
    // (R would open the original's key-redefining screen, which lists C64 keys: not on this keyboard.)
    reserved: ['KeyR', ...JOYSTICK_KEYS],
    // Touch: the stick (Thing goes up and down too), and fire: his jump (with a direction, the big one).
    touch: { stick: '8', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
  });
}
