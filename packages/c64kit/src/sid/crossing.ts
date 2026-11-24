import { isNumber, isNumbers, isRecord } from '../json';

/**
 * Crossing from one version of a tune to another while it plays, in step: the song carries on from where it is and only the
 * version changes. The versions are the same song (the same patterns, timing and order) with other data, so a C64 player does
 * this by swapping its tables at a boundary of the song; here the new version's player is run (silently) up to the boundary and
 * takes over there. The SID's master volume (the 4-bit volume of $D418, how C64 games faded) dips over the beat before the
 * boundary and swells back over the beat after, so the change is covered. All the numbers are in a `CrossingPlan`, data of the game.
 */
export interface CrossingPlan {
  /** The frames (calls of the player, 50 a second) the song lasts before its loop begins again from frame 0. */
  readonly loopFrames: number;
  /** The frames of the loop at which a phrase begins (sorted, each below `loopFrames`): where the song naturally turns. */
  readonly phrases: readonly number[];
  /** The frames of the loop at which a bar begins: used when the next phrase is further than `maxWaitFrames` away. */
  readonly bars: readonly number[];
  /** The longest wait for a phrase, in frames; past it the next bar is the boundary. */
  readonly maxWaitFrames: number;
  /** Frames the volume falls over before the boundary, and rises over after it (0: no dip, a plain cut). */
  readonly fadeOutFrames: number;
  readonly fadeInFrames: number;
}

/** How many frames of the new version's player run for every frame of the playing one while catching up to the boundary. */
export const CATCH_UP_RATE = 60;

export function isCrossingPlan(d: unknown): d is CrossingPlan {
  return isRecord(d) && isNumber(d.loopFrames) && isNumbers(d.phrases) && isNumbers(d.bars) && isNumber(d.maxWaitFrames)
    && isNumber(d.fadeOutFrames) && isNumber(d.fadeInFrames);
}

/** The frames before a boundary at `target` (of the loop) that a crossing needs from the request: the fade, and the new player's catch-up. */
function leadFrames(plan: CrossingPlan, target: number): number {
  return plan.fadeOutFrames + Math.ceil(target / CATCH_UP_RATE) + 2;
}

/** The first of `starts` (frames of the loop) at least `lead(start)` frames after `now` (a frame count since the song began), as a frame count. */
function firstAfter(plan: CrossingPlan, starts: readonly number[], now: number, within: number): number | null {
  const lap = Math.floor(now / plan.loopFrames);
  for (let l = lap; l <= lap + 1; l++) {
    for (const s of starts) {
      const at = l * plan.loopFrames + s;
      if (at - now >= leadFrames(plan, s) && at - now <= within) return at;
    }
  }
  return null;
}

/**
 * The frame (counted from the song's start) at which a crossing asked for at frame `now` takes place: the next phrase, unless
 * that is more than `maxWaitFrames` away, then the next bar.
 */
export function pickBoundary(plan: CrossingPlan, now: number): number {
  const phrase = firstAfter(plan, plan.phrases, now, plan.maxWaitFrames);
  if (phrase !== null) return phrase;
  const bar = firstAfter(plan, plan.bars, now, Infinity);
  if (bar !== null) return bar;
  throw new Error('the crossing plan has no boundary');
}

/** The master volume's gain one frame on, moving from `gain` toward `want` (1 or 0) at the plan's fade speed. */
export function moveGain(plan: CrossingPlan, gain: number, want: 0 | 1): number {
  const frames = want === 0 ? plan.fadeOutFrames : plan.fadeInFrames;
  if (frames <= 0) return want;
  return want === 0 ? Math.max(0, gain - 1 / frames) : Math.min(1, gain + 1 / frames);
}
