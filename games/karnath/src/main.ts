import { obliqueRooms, type Host } from 'c64kit';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import * as engine from './gen/engine';
import { karnathMap } from './map';
import { repairStripX } from './travel';
import { karnathCombat, karnathControls } from './combat';
import { karnathHd } from './hd';
import { Guide } from './guide';
import { hintSpots } from './hints';
import stateUrl from '../assets/karnath-title.state?url';

/**
 * The Staff of Karnath — a translated port: the original 1984 code translated
 * routine by routine to TypeScript (src/gen, see re/README.md), on the shared
 * native runtime. It starts from the game's memory as it stands at the title
 * screen (see build/README.md), so there's no loading.
 */
export { info } from './info';

const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];

export function run(host: Host) {
  // the hints (ENHANCED): the pieces and the way to the obelisk told on the status line and marked with sparkles (src/guide.ts, src/hints.ts)
  const guide = new Guide();
  return runNative(host, {
    id: 'karnath',
    // ENTER CONTINUE under the title's last line, above its border
    strip: { y: 176 },
    state: stateUrl,
    port,
    room: (ram) => ram[0x3235],
    titleWaits: [0x6c85],
    vitals: {
      fullHealth: (ram) => {
        ram[0x6ffe] = 100; ram[0x322e] = 0; // energy, and damage still to take
        ram.set([0x31, 0x3a, 0x3a], 0x07dc); // "100" on the status line
      },
    },
    map: karnathMap,
    repair: repairStripX, // (saves made after a travel before it set his place along the strip)
    assists: [{ id: 'hints', long: 'HINTS (STORY, SPARKLES)', apply: (ram, on) => guide.frame(ram, on) }],
    hints: hintSpots,
    hintsWith: 'hints',
    // the fights (src/combat.ts): effects and sounds, the combat assists; and the 8-way controls
    combat: karnathCombat,
    controls: karnathControls,
    // 1-9 and 0: straight to that spell (the original only cycles through its ten); Space casts
    actions: {
      keys: { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7, Digit8: 8, Digit9: 9, Digit0: 10 },
      also: 'select',
      set: (ram, n, call) => { ram[0x322c] = n; call(engine.r_150e); }, // $150E shows the spell's name
      // Enter (or any other key) moves on to the next spell, a press a spell: the original changes it only once a key has been
      // down for 16 frames in all ($236F, $1BFB), which a tap is not (it took five or six)
      next: { order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], get: (ram) => ram[0x322c] },
    },
    // Touch: the stick, CAST, SPELL (the next one, as Enter does), and RUN (added for `run`).
    touch: { stick: '8', buttons: [{ label: 'CAST', key: 'Space', size: 'big' }, { label: 'SPELL', key: 'Enter' }] },
    run: { player: engine.r_1956 }, // hold Shift to run: player control runs twice a frame
    // the HD view (the shell's C64/HD switch): the room rebuilt in 3D from its characters, lit (src/hd.ts)
    hd: obliqueRooms(karnathHd),
    reserved: [...JOYSTICK_KEYS, ...['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0']],
    remap: { KeyP: 'F7', Escape: 'F7', KeyR: 'F1' },
    // The title's key instructions, for this keyboard (same lengths as the originals).
    text: {
      0x6d8b: 'PRESS P  TO PAUSE GAME', // was 'PRESS F7 TO PAUSE GAME'
      0x6da1: ' PRESS ENTER TO CHANGE SPELL ', // was 'ANY OTHER KEY TO CHANGE SPELL'
      0x6dbe: ' PRESS SPACE OR FIRE TO START', // was 'PUSH JOYSTICK BUTTON TO START'
      0x6df1: 'PRESS R  TO RESTART', // was 'PRESS F1 TO RESTART'
    },
  });

}
