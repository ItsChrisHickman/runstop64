/**
 * Monty on the ground while he moves vertically, as the browser draws him: the real C64View over the Program, rendered at
 * several alphas in every frame of seeded random play (walking, jumping, falling, climbing the stairs and slopes of the
 * start room and the next ones). In every drawn frame where the game's state says he is on the ground (free, slipping,
 * slow, stuck) the row of his feet is the row the game put them in (the original's picture has them there): none low
 * while he climbs, none sunk into the floor or floating for a frame after a landing. The display smoothing used to draw
 * the vertical position as an average of the last three ticks, 2 to 6 px behind the terrain; only the horizontal glides.
 * Also reported (VERBOSE=1): the worst drawn offsets, and the vertical step of the drawn picture in the air.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/ground-vertical.ts
 */
import { PixelRenderer } from 'c64kit';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { Stick } from '../src/input';
import { Program } from '../src/program';
import { State } from '../src/tiles';
import { check, finish } from '../../shared/test/check';

const program = new Program();
program.unlimitedLives = () => true; // (the random play dies often: it goes on from where he starts again)
const renderer = new PixelRenderer();
const view = new C64View(renderer, program);
const frame = (stick: number) => { program.frame({ stick, f1: false, f7: false, fly: false }); view.update(program.viewStep); };
for (let i = 0; i < 120; i++) frame(0);
frame(Stick.Fire);
for (let i = 0; i < 60; i++) frame(0);
const game = program.game;
if (!game) throw new Error('the game did not start');

/** Monty is sprite 0 (his black outline sprite 1, a pixel on). */
const MONTY = 0;
/** The display frames drawn in each game frame (alpha: how far into the step), as at 120 Hz and more. */
const ALPHAS = [0, 0.25, 0.5, 0.75, 1] as const;
const ON_GROUND: readonly number[] = [State.Free, State.Slip, State.Slow, State.Stuck];

let seed = 11;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed >> 8; };
const MOVES = [0, Stick.Left, Stick.Right, Stick.Right, Stick.Left, Stick.Right | Stick.Fire, Stick.Left | Stick.Fire, Stick.Fire, Stick.Up, Stick.Down, Stick.Up | Stick.Right, Stick.Down | Stick.Left] as const;

let ground = 0, groundMoving = 0, landings = 0, falls = 0, jumps = 0, wrong = 0, first = '';
let worstY = 0, worstX = 0;
let skip = 0, stick = 0, prevCapY = NaN, before = game.monty.state, lastDrawn = NaN, stutter = 0, airFrames = 0;
const steps = new Map<number, number>();
const frames = Number(process.env.FRAMES ?? 5000);
for (let f = 0; f < frames; f++) {
  if (f % 7 === 0) stick = MOVES[rnd() % MOVES.length] ?? 0;
  const y0 = game.monty.y, room0 = game.world.room;
  frame(stick);
  const m = game.monty, now = m.state;
  if (before === State.Fall && ON_GROUND.includes(now)) landings++;
  if (before !== State.Fall && now === State.Fall) falls++;
  if (before !== State.Jump && now === State.Jump) jumps++;
  before = now;
  const cap = program.capture.sprites.find((s) => s.n === MONTY);
  // (a room change or a restart after a death is a teleport: the view puts him there at the next step, not between)
  const teleport = !cap || game.world.room !== room0 || Math.abs(cap.y - prevCapY) > 12;
  prevCapY = cap ? cap.y : NaN;
  if (!cap || teleport) { lastDrawn = NaN; skip = 2; continue; }
  if (skip > 0) { skip--; lastDrawn = NaN; continue; }
  for (const a of ALPHAS) {
    view.render(a);
    const h = renderer.sprites.find((s) => s.visible && s.n === MONTY);
    if (!h) continue;
    const dy = h.y - (cap.y - 50), dx = h.x - ((cap.x >= 504 ? cap.x - 504 : cap.x) - 24);
    if (ON_GROUND.includes(now)) {
      ground++;
      if (m.y !== y0) groundMoving++;
      worstY = Math.max(worstY, Math.abs(dy));
      worstX = Math.max(worstX, Math.abs(dx));
      // (his feet's row: the lowest row of the picture the sprite carries, where the sprite is drawn)
      const surf = h.surface;
      let last = -1;
      if (surf) for (let y = surf.height - 1; y >= 0 && last < 0; y--) if (surf.pixels.subarray(y * surf.width, (y + 1) * surf.width).some((v) => v !== TRANSPARENT)) last = y;
      const drawnFeet = Math.round(h.y) + last, gameFeet = cap.y - 50 + last;
      if (drawnFeet !== gameFeet || dy !== 0) { wrong++; if (!first) first = `frame ${f} alpha ${a}: state ${now}, feet row drawn ${drawnFeet}, the game's ${gameFeet} (y off by ${dy.toFixed(2)})`; }
    } else if (now === State.Fall || now === State.Jump) {
      // (in the air: the step of the drawn picture from one display frame to the next)
      if (!Number.isNaN(lastDrawn)) {
        const d = Math.round(h.y) - lastDrawn;
        steps.set(d, (steps.get(d) ?? 0) + 1);
        airFrames++;
        if (d === 0) stutter++;
      }
    }
    lastDrawn = Math.round(h.y);
  }
}
if (process.env.VERBOSE) {
  console.log(`worst vertical offset on the ground ${worstY}, horizontal ${worstX}; ${stutter} of ${airFrames} display frames in the air held the row`);
  console.log(`steps of the drawn row in the air: ${[...steps].sort((a, b) => a[0] - b[0]).map(([d, n]) => `${d}:${n}`).join(' ')}`);
}
check(`random play covered jumps (${jumps}), falls (${falls}) and landings (${landings})`, jumps >= 5 && falls >= 3 && landings >= 5);
check(`and ${groundMoving} display frames on the ground while his height changed (stairs, slopes, landing), of ${ground}`, groundMoving >= 5);
check(`on the ground his feet are drawn on the row the game puts them in, in every frame (${wrong} not${first ? `: ${first}` : ''})`, wrong === 0);
finish();
