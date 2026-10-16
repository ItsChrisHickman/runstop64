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
import stateUrl from '../assets/blackwyche-title.state?url';

/**
 * Blackwyche — a translated port: the original 1985 code translated routine by
 * routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime. It starts from the game's memory as it stands at the title screen
 * (see build/README.md), so there's no loading.
 */
export const info = {
  title: 'Blackwyche',
  progress: 'Your progress is saved each time Pendragon enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Blackwyche">Blackwyche</a> (1985): Sir Arthur Pendragon is trapped aboard a
    haunted galleon and must free the soul of its captain. The third of the Pendragon adventures, after
    <a href="https://en.wikipedia.org/wiki/The_Staff_of_Karnath">The Staff of Karnath</a> and
    <a href="https://en.wikipedia.org/wiki/Entombed_(video_game)">Entombed</a>. All credit belongs to its creators:</p>
    <ul>
      <li>Created and designed by Dave Thomas and Bob Thomas</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Ultimate_Play_the_Game">Ultimate Play the Game</a>
        (Ashby Computers &amp; Graphics), 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, so it plays exactly as it did in 1985.
    The title screen's copyright line is restored (this copy had a cracker's name in it).</p>
    <p>Controls: arrows (or WASD) move, hold Shift to run &middot; Space (or pad A) uses the current action, or straight to one: Z jump, X sword &middot;
    Enter (or any other key) changes the action &middot; P or Esc pauses, with a map &middot;
    R (or F1) restarts &middot; M mutes</p>
    <p>Added for runstop64: progress is saved each time you enter a room (coming back carries on where you were; T on the pause screen goes to the title), and
    after losing you can continue from the last screen you came onto, with full health. P (or the gear) shows a map of where you've
    been. Fights get effects over the picture and sounds of their own (enemies destroyed burst into pixels, a hurt flashes
    red), and there are optional assists (O on the pause screen): 8-way controls, safe for a moment after a hit,
    knockback, hit-stop, full health at the start of each room, and GUIDED (Pendragon says what he makes of things on the status line, in the game's own lettering, and sparkles mark what he can take now), and trapdoors that stay open once they've given way. The C64/HD button (bottom right; on a phone beside PAUSE; or H) switches to the HD view
    (a first version): the same game as a lit 3D scene built from its own picture. The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/blackwyche/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

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
      health: {
        max: 100,
        get: (ram) => ram[0x9d77],
        set: (ram, _colour, v) => {
          ram[0x9d77] = v;
          ram.set([...String(v).padStart(3, '0')].map((d) => (d === '0' ? 0x3a : 0x30 + Number(d))), 0x07a2);
        },
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
      set: (ram, n, call) => { ram[0x3415] = n; call(engine.r_0f32); }, // $0F32 shows the action's name
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
