// A moment's grace (games/shared/grace.ts), checked the same way in every translated port with
// combat (the Pendragon games): a game continued from a save taken shortly before a creature hurts
// him; the same fight twice from there, once with the grace cleared (the control: he is hurt) and
// once as the front end leaves it (he is not, for its whole length), then the fight goes on: he is
// hurt again. Random play with the weapon, seeded, so both runs are the same until the first hurt.
import { packState } from 'c64kit';
import type { runNative } from '../native/play';
import type { Input } from 'c64kit';
import { GRACE_FRAMES } from '../grace';
import { must } from './must';

type Program = ReturnType<typeof runNative>;

/** A launched game: the program, its input, and the frames driven. */
export interface Session { p: Program; input: Input; tick(n?: number): void; press(code: string) : void }
/** Launches the game (fresh storage), with a save (base64, as `packState` gives it) to continue from if given. */
export type Launch = (save?: string) => Promise<Session>;

const ARROWS = ['', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Random play with the weapon for `frames` (or until `stop`): the frames of each hurt that started; `each` every 10 frames. */
function randomPlay(s: Session, seed: number, frames: number, fire: string[], stop = false, each?: () => void) {
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let held: string[] = [];
  const hurts: number[] = [];
  for (let f = 0; f < frames; f++) {
    if (rnd() < 1 / 12) {
      for (const k of held) s.input.keyUp(k);
      held = [ARROWS[Math.floor(rnd() * 5)], rnd() < 0.5 ? fire[Math.floor(rnd() * fire.length)] : ''].filter(Boolean);
      for (const k of held) s.input.keyDown(k);
    }
    s.tick(1);
    if (each && f % 10 === 0) each();
    if (must(s.p.combat, 'the combat runtime').events.some((e) => e.kind === 'hurt')) { hurts.push(f); if (stop) break; }
  }
  for (const k of held) s.input.keyUp(k);
  return hurts;
}

/** A save (base64) from about 50 frames before the first hurt of some random play after the grace has run out. */
function saveBeforeAHurt(s: Session, fire: string[]) {
  s.tick(GRACE_FRAMES + 5);
  const taken: string[] = [];
  const hurts = randomPlay(s, 99, 8000, fire, true, () => {
    const st = s.p.host?.save();
    if (st) { taken.push(Buffer.from(packState(st)).toString('base64')); if (taken.length > 5) taken.shift(); }
  });
  if (!hurts.length || !taken.length) throw new Error('no fight found');
  return must(taken[0], 'a save');
}

/**
 * The control and the graced run over seeds until a fight from the save hurts him within the
 * grace's length with the grace cleared; then the same fight graced must not, and carried on
 * past the grace must hurt him again.
 */
export async function checkFightGrace(label: string, launch: Launch, check: (what: string, ok: boolean) => void, fire: string[], seeds = 40, from?: string) {
  await checkFightFrom(label, launch, check, fire, saveBeforeAHurt(await launch(from), fire), seeds);
}

/** The same, from a save the game's test has found to be a moment before a fight. */
export async function checkFightFrom(label: string, launch: Launch, check: (what: string, ok: boolean) => void, fire: string[], save: string, seeds = 40) {
  for (let seed = 1; seed <= seeds; seed++) {
    const c = await launch(save);
    c.p.grace.clear();
    const control = randomPlay(c, seed, GRACE_FRAMES, fire);
    if (!control.length) continue;
    const g = await launch(save);
    const graceAtStart = g.p.grace.left || GRACE_FRAMES;
    const graced = randomPlay(g, seed, GRACE_FRAMES + 900, fire);
    const inGrace = graced.filter((f) => f < GRACE_FRAMES - 1), after = graced.filter((f) => f >= GRACE_FRAMES);
    check(`${label}: continuing from a save a moment before a hurt starts the grace (seed ${seed})`, graceAtStart > 0);
    check(`${label}: the fight hurts him at frame ${control[0]} with the grace cleared, not once in the grace's ${GRACE_FRAMES} frames with it (${inGrace.length} hurts)`, inGrace.length === 0);
    check(`${label}: after the grace he is hurt again (${after.length} hurts in the 900 frames on, the first at frame ${after[0] ?? 'never'})`, after.length > 0);
    return;
  }
  check(`${label}: a fight from the save that hurts him within ${GRACE_FRAMES} frames (${seeds} seeds tried)`, false);
}
