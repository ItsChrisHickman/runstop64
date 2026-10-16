import type { Host } from 'c64kit';
import { ram } from '../../shared/native/cpu';
import { runNative, type RunSpec } from '../../shared/native/play';
import { footing, jsw2Map } from './map';
import { port } from './native';
import stateUrl from '../assets/jsw2-title.state?url';

/**
 * Jet Set Willy II — a translated port: the original 1985 Commodore 64 code translated
 * routine by routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime. It starts from the game's memory as it stands at the title screen (see
 * build/README.md), so there's no loading.
 */
export const info = {
  title: 'Jet Set Willy II',
  progress: 'Your progress is saved each time Willy enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Jet_Set_Willy_II">Jet Set Willy II: The Final Frontier</a> (1985): Miner Willy's
    mansion, bigger than ever, from the cellars to the rocket on the roof. Collect every item. All credit belongs to its creators:</p>
    <ul>
      <li><a href="https://en.wikipedia.org/wiki/Jet_Set_Willy">Jet Set Willy</a> created by <a href="https://en.wikipedia.org/wiki/Matthew_Smith_(games_programmer)">Matthew Smith</a></li>
      <li>Jet Set Willy II (ZX Spectrum): Derrick P. Rowson and Steve Wetherill</li>
      <li>Commodore 64 version: John Darnell and Steve Birtles</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Software_Projects">Software Projects</a>, 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, cycle for cycle (the game times
    itself by counting, and draws its screen in raster interrupts).</p>
    <p>Controls: arrows (or WASD) move &middot; Space (or Z, X, pad A) jumps &middot; joysticks and gamepads work &middot;
    P or Esc pauses (with a map) &middot; F3 music on or off &middot; M mutes &middot; in ENHANCED, hold Shift (on a phone: RUN) to run</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen): hold Shift and Willy runs: his own steps come
    twice as often (his jumps the same jumps, only quicker), while the guardians, ropes and music keep their pace;
    a death never starts Willy again into the same death; and a long fall ends in an ordinary landing (guardians and nasties still hurt).</p>
    <p>Added for runstop64: progress is saved each time you enter a room (coming back carries on where you were; T on the pause screen goes to the title), and
    after losing you can continue from the last room you entered, with all your lives. The pause screen has a map
    of the whole mansion, lit as you explore it, and travel back to rooms you've been in.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

/**
 * Running (ENHANCED, Shift held): Willy alone goes faster. He takes a step (walks, jumps, falls, looks
 * for floor and what he's met, is carried by a conveyor) each time his countdown ($8207) runs out,
 * counted off once a pass of the main loop and set again from the room's speed ($81FF, 4; one less in
 * a jump): a count more off a pass brings his own step on, in its own place in the pass (twice as often
 * walking, a jump half as fast again). His steps are the game's own, so a jump is the same jump; the
 * guardians, ropes and conveyors keep their pace. Not on a rope ($835D): his climb goes with its swing.
 * And not while a collision that kills waits for his step ($8304, the sprites' collisions read every
 * other pass, judged as his step does at $5405): coming into a room it holds the last room's for a pass
 * or two (down the toilet, the drain's first pass), and a step brought on then dies of it; the game's
 * own step comes after it's read again.
 */
export const RUN: RunSpec = {
  player: () => {
    const c = ram[0x8304], deadly = (c & 1) !== 0 && (ram[0x8173] !== 0x0c || (c & 0xf8) !== 0);
    if (ram[0x8207] > 1 && !ram[0x835d] && !deadly) ram[0x8207]--;
  },
  enhanced: true,
};

/**
 * The fall that kills: landing ($5465, `cmp #$28`) compares the fall counter ($82D7, two a step) with
 * 40 and calls the death routine at 40 or more. The operand is read from the code's own byte ($5466,
 * `smcOperand` in re/engine.json); ORIGINAL keeps 40. ENHANCED sets it to $FF, which the counter
 * (always even) never reaches: a long fall ends in an ordinary landing. What he lands on is
 * judged by the game's own collisions as ever, so a fall onto a guardian, nasty or Hades' skull
 * still kills (that is the thing, not the fall).
 */
const FALL_LIMIT = { address: 0x5466, original: 0x28, enhanced: 0xff } as const;

/** The joystick keys stay the joystick (they'd be C64 keys too otherwise). */
const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];
/** The title screen's raster interrupts (in play they're $78CD and $7940). */
const TITLE_IRQS = [0x4ace, 0x4a18];

export function run(host: Host) {
  return runNative(host, {
    id: 'jsw2',
    // ENTER CONTINUE on the black between the scroller's banner and the credits line
    strip: { y: 174 },
    state: stateUrl,
    port,
    room: (ram) => ram[0x13],
    titleWaits: (ram) => TITLE_IRQS.includes(ram[0x314] | (ram[0x315] << 8)),
    // The game reads the joystick in port 2: port 1's lines are F1 (its pause) and F3 (music) to it.
    joyPort: 2,
    // Lives are the bits of $8096 (eight Willies in the HUD; each loss shifts one out).
    fullHealth: (ram) => { ram[0x8096] = 0xff; },
    lives: (ram) => { ram[0x8096] = 0xff; },
    // No death loops: Willy comes into rooms in mid-air (falling into Hades from the dustbins' floor), and
    // a death in a fall from another room starts him again where the fall began (over the hole, where he
    // dies again at once): saves wait for his feet (as travel's spots do) and a second lived; ENHANCED starts him from the last one.
    safe: { steady: footing, lives: { get: (ram) => ram[0x8096], set: (ram, n) => { ram[0x8096] = n; } } },
    // A moment's grace after a resume: the death routine ($51C7, called from every collision and fall that kills him) returns
    // at once (re/engine.json "skips"), so no life goes and he isn't started again.
    grace: { skip: [0x51c7] },
    map: jsw2Map,
    // Falls (ENHANCED): landing never kills (FALL_LIMIT).
    assists: [{ id: 'falls', long: 'LANDINGS SAFE', apply: (ram, on) => { ram[FALL_LIMIT.address] = on ? FALL_LIMIT.enhanced : FALL_LIMIT.original; } }],
    // Running (ENHANCED, Shift held): Willy alone goes faster (RUN).
    run: RUN,
    // The title scroller's key list, with running (build/patch.json has the same, for a snapshot made again;
    // this puts it in the one made before it: the same length).
    text: { 0x7d03: 'KEYS  :  ARROWS OR WASD...MOVE.  SPACE...JUMP.  SHIFT...RUN IN ENHANCED.  P OR ESC...PAUSE AND MAP.  F3...MUSIC ON/OFF.  M...MUTE.  JOYSTICKS AND PADS WORK.....' },
    // Touch: left and right (Willy has no up or down), a big JUMP, and RUN (added for `run`: on or off).
    touch: { stick: 'lr', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
    font: 'kit', // (the title's charset is the game's own lettering, not a font in C64 order)
    // F1 is the original's pause (a blank wait): the pause screen replaces it.
    reserved: ['F1', ...JOYSTICK_KEYS],
  });
}
