import type { Host } from 'c64kit';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import * as engine from './gen/engine';
import { ACTION, ACTIONS } from './actions';
import { endingStats, entombedEnding, won } from './ending';
import { entombedMap } from './map';
import { hintSpots } from './hint-spots';
import { entombedCombat, entombedControls } from './combat';
import stateUrl from '../assets/entombed-title.state?url';

/**
 * Entombed — a translated port: the original 1985 code translated routine by
 * routine to TypeScript (src/gen, see re/README.md), running on c64kit's model
 * of the C64's chips with no 6502 underneath. It starts from the game's memory
 * as it stands at the title screen (see build/README.md), so there's no loading.
 */
export { info } from './info';

/** The joystick keys stay the joystick; P and Esc pause, as in the other games here. */
const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];

export function run(host: Host) {
  return runNative(host, {
    id: 'entombed',
    // ENTER CONTINUE between the title's last two lines (its black, as its own lines are: on light green)
    strip: { y: 148, colour: 0 },
    state: stateUrl,
    port,
    room: (ram) => (ram[0x37f7] << 24) | (ram[0x321c] << 16) | (ram[0x217e] << 8) | ram[0x217f],
    titleWaits: [0x98bf],
    vitals: {
      fullHealth: (ram, colour) => {
        // the five ankhs (and their colours), and the tomb's air
        ram[0x323d] = 0; ram[0x323e] = 0; ram[0x323f] = 1; ram[0x6d2b] = 0;
        colour.fill(1, 0x385, 0x38a);
        ram[0x37f6] = 0; ram[0x37b3] = 0;
        ram.set([0x31, 0x3a, 0x3a], 0x077f);
      },
      health: {
        max: 5,
        get: (ram) => 5 - ram[0x323d],
        set: (ram, colour, v) => {
          const lost = 5 - v; // ankhs fade from the left
          ram[0x323d] = lost; ram[0x323f] = 1; ram[0x6d2b] = 0;
          colour.fill(0, 0x385, 0x385 + lost);
          colour.fill(1, 0x385 + lost, 0x38a);
        },
      },
    },
    map: entombedMap,
    // Z jump, X whip, C torch: straight to the action (the original only cycles through them)
    actions: {
      keys: { KeyZ: ACTION.jump, KeyX: ACTION.whip, KeyC: ACTION.torch },
      also: 'fire',
      set: ACTIONS.set, // $0F19 shows the action's name
    },
    // in a chamber: the places where something can be done and hasn't been yet (re/hints)
    hints: hintSpots,
    // the fights (src/combat.ts): effects and sounds, the combat assists; and the 8-way controls
    combat: entombedCombat,
    controls: entombedControls,
    // Touch: the stick, USE (the current action), straight to an action, and RUN (added for `run`).
    touch: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'WHIP', key: 'KeyX' }, { label: 'TORCH', key: 'KeyC' }] },
    run: { player: engine.r_1864 }, // hold Shift to run: player control runs twice a frame
    // the reward for winning (ENHANCED): a montage of the tomb's chambers, the parade, THE END (src/ending.ts)
    ending: { spec: entombedEnding, won, stats: endingStats },
    reserved: [...JOYSTICK_KEYS, ...['KeyC']],
    remap: { KeyP: 'F7', Escape: 'F7', KeyR: 'F1' },
    // The title's key instructions, for this keyboard (same lengths as the originals).
    text: {
      0x98e3: 'PRESS P   TO PAUSE GAME', // was 'PRESS F7  TO PAUSE GAME'
      0x98fa: ' PRESS ENTER TO CHANGE ACTION ', // was 'ANY OTHER KEY TO CHANGE ACTION'
      0x9918: ' PRESS SPACE OR FIRE TO START', // was 'PUSH JOYSTICK BUTTON TO START'
      0x9935: 'PRESS R      TO RESTART', // was 'PRESS F1     TO RESTART'
    },
  });

}
