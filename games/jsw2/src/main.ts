import type { Host } from 'c64kit';
import { ram } from '../../shared/native/cpu';
import { runNative, type RunSpec } from '../../shared/native/play';
import { JOYSTICK_KEYS } from '../../shared/native/features';
import { AIR_JUMP, gentleTouch, hintSpots, RopeGrip } from './easy';
import { END_HOLD, endingStats, jsw2Ending, won } from './ending';
import { footing, jsw2Map } from './map';
import { port } from './native';
import stateUrl from '../assets/jsw2-title.state?url';

/**
 * Jet Set Willy II — a translated port: the original 1985 Commodore 64 code translated
 * routine by routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime. It starts from the game's memory as it stands at the title screen (see
 * build/README.md), so there's no loading.
 */
export { info } from './info';

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
/** Frames of grace on coming into a room (ENHANCED): two seconds. */
const ENTRY_GRACE = 100;

const FALL_LIMIT = { address: 0x5466, original: 0x28, enhanced: 0xff } as const;

/** The joystick keys stay the joystick (they'd be C64 keys too otherwise). */
/** The title screen's raster interrupts (in play they're $78CD and $7940). */
const TITLE_IRQS = [0x4ace, 0x4a18];

export function run(host: Host) {
  const ropes = new RopeGrip();
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
    vitals: {
      // Lives are the bits of $8096 (eight Willies in the HUD; each loss shifts one out).
      fullHealth: (ram) => { ram[0x8096] = 0xff; },
      lives: (ram) => { ram[0x8096] = 0xff; },
      // (ENHANCED: eight lives that never run out: the game is a lot easier, QOL.md)
      infinite: true,
    },
    // No death loops: Willy comes into rooms in mid-air (falling into Hades from the dustbins' floor), and
    // a death in a fall from another room starts him again where the fall began (over the hole, where he
    // dies again at once): saves wait for his feet (as travel's spots do) and a second lived; ENHANCED starts him from the last one.
    safe: { steady: footing, lives: { get: (ram) => ram[0x8096], set: (ram, n) => { ram[0x8096] = n; } } },
    // A moment's grace after a resume: the death routine ($51C7, called from every collision and fall that kills him) returns
    // at once (re/engine.json "skips"), so no life goes and he isn't started again.
    grace: { skip: [0x51c7] },
    map: jsw2Map,
    // Falls (ENHANCED): landing never kills (FALL_LIMIT).
    assists: [
      { id: 'falls', long: 'LANDINGS SAFE', apply: (ram, on) => { ram[FALL_LIMIT.address] = on ? FALL_LIMIT.enhanced : FALL_LIMIT.original; } },
      // Ropes (easy.ts): taken hold of at once, never fallen off, the jump off from anywhere on them.
      { id: 'ropes', long: 'ROPES HOLD', apply: (ram, on, _found, m) => ropes.apply(ram, on, m) },
      // A guardian or nasty must overlap him a good deal to kill (easy.ts).
      { id: 'gentle', long: 'GENTLE TOUCH', apply: (_ram, on, _found, m) => gentleTouch(m, on) },
    ],
    // A second jump in the air, once per airtime (easy.ts).
    airJump: AIR_JUMP,
    // A short grace on coming into a room and after a life is lost (ENHANCED).
    entryGrace: ENTRY_GRACE,
    // Sparkles on the items still in the room and, with 160 taken, on the bed (ENHANCED).
    hints: (ram) => hintSpots(ram),
    // Running (ENHANCED, Shift held): Willy alone goes faster (RUN).
    run: RUN,
    // The reward for winning (ENHANCED): once the game's own end (to bed with 160 items, then the sleepwalk to room 136) has played and
    // sat in its last room a while, as it never goes back to the title: a montage of rooms, the creatures walking through it, THE END (src/ending.ts).
    ending: { spec: jsw2Ending, won, stats: endingStats, after: END_HOLD },
    // The crack's vector for the room handler's end ($01E0, JMP ($01E0) at $7323) goes by its own check to $7387: the game's own end.
    repair: (ram) => { ram[0x1e0] = 0x87; ram[0x1e1] = 0x73; },
    // The title scroller's key list, with running (build/patch.json has the same, for a snapshot made again;
    // this puts it in the one made before it: the same length).
    text: { 0x7d03: 'KEYS  :  ARROWS OR WASD...MOVE.  SPACE...JUMP, AGAIN IN THE AIR.  SHIFT...RUN (THOSE TWO IN ENHANCED).  P OR ESC...PAUSE AND MAP.  F3...MUSIC.  M...MUTE........' },
    // Touch: left and right (Willy has no up or down), a big JUMP, and RUN (added for `run`: on or off).
    touch: { stick: 'lr', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
    font: 'kit', // (the title's charset is the game's own lettering, not a font in C64 order)
    // F1 is the original's pause (a blank wait): the pause screen replaces it.
    reserved: ['F1', ...JOYSTICK_KEYS],
  });
}
