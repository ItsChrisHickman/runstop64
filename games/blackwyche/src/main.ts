import { obliqueRooms, type Host } from 'c64kit';
import { MENDS } from './mends';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import * as engine from './gen/engine';
import { blackwycheMap } from './map';
import { blackwycheCombat, blackwycheControls } from './combat';
import { blackwycheHd } from './hd';
import { Guide, guidedSpots } from './guided';
import { TrapDoors } from './trapdoors';
import { ACTION } from './actions';
import { blackwycheEnding, endingStats, won } from './ending';
import stateUrl from '../assets/blackwyche-title.state?url';

/**
 * Blackwyche — a translated port: the original 1985 code translated routine by
 * routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime. It starts from the game's memory as it stands at the title screen
 * (see build/README.md), so there's no loading.
 */
export { info } from './info';

const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];

export function run(host: Host) {
  // GUIDED (ENHANCED): the puzzles told on the status line and marked with sparkles (src/guided.ts)
  const guide = new Guide();
  const trapdoors = new TrapDoors();
  return runNative(host, {
    id: 'blackwyche',
    // ENTER CONTINUE between the title's last two lines, in its yellow
    strip: { y: 172, colour: 7 },
    state: stateUrl,
    port,
    room: (ram) => ram[0x341c],
    titleWaits: [0x9931, 0x993b, 0x9940],
    vitals: {
      fullHealth: (ram) => {
        ram[0x9d77] = 100; ram[0x3417] = 0; // energy, and damage still to take
        ram.set([0x31, 0x3a, 0x3a], 0x07a2); // "100" on the status line
      },
    },
    map: blackwycheMap,
    // the fights (src/combat.ts): effects and sounds, the combat assists; and the 8-way controls
    combat: blackwycheCombat,
    controls: blackwycheControls,
    // Z jump, X sword: straight to the action (the original only cycles through them)
    actions: {
      keys: { KeyZ: 1, KeyX: 2 },
      also: 'fire',
      set: ACTION.set,
    },
    // Touch: the stick, USE (the current action), straight to an action, and RUN (added for `run`).
    touch: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'SWORD', key: 'KeyX' }] },
    // up a ladder with Up still held: the cabin above has its hole behind him, and the stick walks him back down it
    latch: { busy: (ram) => ram[0x1ec7] !== 0, bits: 3 },
    run: { player: engine.r_163b }, // hold Shift to run: player control runs twice a frame
    // the HD view (the shell's C64/HD switch): the room rebuilt in 3D from its characters, lit (src/hd.ts)
    hd: obliqueRooms(blackwycheHd),
    assists: [
      { id: 'guided', long: 'GUIDED (STORY, SPARKLES)', apply: (ram, on) => guide.frame(ram, on) },
      { id: 'trapdoors', long: 'TRAPDOORS STAY OPEN', apply: (ram, on, found) => trapdoors.frame(ram, on, found.trapdoors) },
    ],
    hints: guidedSpots,
    hintsWith: 'guided',
    // the reward for winning (ENHANCED): a montage, the parade, THE END (src/ending.ts)
    ending: { spec: blackwycheEnding, won, stats: endingStats },
    reserved: JOYSTICK_KEYS,
    remap: { KeyP: 'F7', Escape: 'F7', KeyR: 'F1' },
    // The title's key instructions, for this keyboard (same lengths as the originals).
    text: {
      0x92bb: 'PRESS P   TO PAUSE GAME', // was 'PRESS F7  TO PAUSE GAME'
      0x92d2: ' PRESS ENTER TO CHANGE ACTION ', // was 'ANY OTHER KEY TO CHANGE ACTION'
      0x92f0: ' PRESS SPACE OR FIRE TO START', // was 'PUSH JOYSTICK BUTTON TO START'
      0x930d: 'PRESS R      TO RESTART', // was 'PRESS F1     TO RESTART'
    },
    // The kilobyte the first game image lacked (rooms $C and $D, the end of $17's code: build/README.md),
    mends: MENDS,
  });

}
