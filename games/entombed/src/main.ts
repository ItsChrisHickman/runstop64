import { obliqueRooms, type Host } from 'c64kit';
import { runNative } from '../../shared/native/play';
import { port } from './native';
import * as engine from './gen/engine';
import { entombedMap } from './map';
import { hintSpots } from './hint-spots';
import { entombedCombat, entombedControls } from './combat';
import { entombedHd } from './hd';
import stateUrl from '../assets/entombed-title.state?url';

/**
 * Entombed — a translated port: the original 1985 code translated routine by
 * routine to TypeScript (src/gen, see re/README.md), running on c64kit's model
 * of the C64's chips with no 6502 underneath. It starts from the game's memory
 * as it stands at the title screen (see build/README.md), so there's no loading.
 */
export const info = {
  title: 'Entombed',
  progress: 'Your progress is saved each time Pendragon enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Entombed_(video_game)">Entombed</a> (1985): Sir Arthur Pendragon is trapped
    inside the Great Sphinx and must find his way out of the tomb's seven floors before the air runs out. The second
    of the Pendragon adventures, after <a href="https://en.wikipedia.org/wiki/The_Staff_of_Karnath">The Staff of Karnath</a>
    and before <a href="https://en.wikipedia.org/wiki/Blackwyche">Blackwyche</a>. All credit belongs to its creators:</p>
    <ul>
      <li>Created and designed by Dave Thomas and Bob Thomas</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Ultimate_Play_the_Game">Ultimate Play the Game</a>
        (Ashby Computers &amp; Graphics), 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, so it plays exactly as it did in 1985.
    The title screen's copyright line is restored (the only surviving copies had a cracker's name in it).</p>
    <p>Controls: arrows (or WASD) move, hold Shift to run &middot; Space (or pad A) uses the current action, or straight to one: Z jump, X whip, C torch &middot;
    Enter (or any other key) changes the action &middot; P or Esc pauses, with a map &middot;
    R (or F1) restarts &middot; M mutes</p>
    <p>Added for runstop64: progress is saved each time you enter a room (coming back carries on where you were; T on the pause screen goes to the title), and
    after losing you can continue from the last screen you came onto, with full health. P (or the gear) shows a map of where you've
    been. Fights get effects over the picture and sounds of their own (enemies destroyed burst into pixels, a hurt flashes
    red), and there are optional assists (O on the pause screen): 8-way controls, safe for a moment after a hit,
    knockback, hit-stop, full health at the start of each room. The C64/HD button (bottom right; on a phone beside PAUSE; or H) switches to the HD view
    (a first version): the same game as a lit 3D room built from its own picture. The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/entombed/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

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
      keys: { KeyZ: 1, KeyX: 2, KeyC: 3 },
      also: 'fire',
      set: (ram, n, call) => { ram[0x3215] = n; call(engine.r_0f19); }, // $0F19 shows the action's name
    },
    // in a chamber: the places where something can be done and hasn't been yet (re/hints)
    hints: hintSpots,
    // the fights (src/combat.ts): effects and sounds, the combat assists; and the 8-way controls
    combat: entombedCombat,
    controls: entombedControls,
    // Touch: the stick, USE (the current action), straight to an action, and RUN (added for `run`).
    touch: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'WHIP', key: 'KeyX' }, { label: 'TORCH', key: 'KeyC' }] },
    run: { player: engine.r_1864 }, // hold Shift to run: player control runs twice a frame
    // the HD view (the shell's C64/HD switch): the room rebuilt in 3D from its characters, lit (src/hd.ts)
    hd: obliqueRooms(entombedHd),
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
