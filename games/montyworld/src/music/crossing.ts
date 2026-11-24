import type { CrossingPlan } from 'c64kit';
import { TuneImage, songNotes } from './hubbard';
import { GAME_SONG, LEAD_VOICE } from './region-tune';

/**
 * Going from one region's version of the tune to another's while Monty plays (docs/dosvidaniya-plan.md): every version is Hubbard's
 * same song (the same patterns, order and timing; `test/music.ts` holds each to it), so the song carries on and only the version
 * changes, at the next phrase of the lead's order list (the start of one of its patterns after a pattern of two bars or more), or, if
 * that is more than `MAX_WAIT_SECONDS` away, at the next bar. The SID's master volume dips over the beat before and swells over the
 * beat after (`FADE_FRAMES`). The numbers are all here.
 */

/** The player is called 50 times a second, and a tick (the unit of a pattern) is two calls. */
const FRAMES_PER_TICK = 2;
const FRAMES_PER_SECOND = 50;
/** A bar: 32 ticks (sixteenths are two ticks, four beats a bar). */
const BAR_TICKS = 32;
/** A beat is eight ticks: the length of a fade. */
const BEAT_TICKS = 8;
const FADE_FRAMES = BEAT_TICKS * FRAMES_PER_TICK;
/** How long to wait for a phrase before taking the next bar. */
const MAX_WAIT_SECONDS = 4;
/** A pattern this short (in ticks) is a fragment of a phrase, not one that ends one. */
const SHORT_PATTERN_TICKS = 2 * BAR_TICKS;

/**
 * How a crossing sounds: `dip` is the one the game plays (the phrase boundary, the volume dipping and swelling); `phrase` (the
 * boundary, no dip) and `cut` (the next bar, no dip) are for comparing, by the render of the crossing (`test/music-wav.ts`).
 */
export type CrossingStyle = 'dip' | 'phrase' | 'cut';
export const DEFAULT_CROSSING: CrossingStyle = 'dip';

/** The plan for crossing the song of `original` (the .sid as Hubbard made it). */
export function crossingPlan(original: Uint8Array, style: CrossingStyle = DEFAULT_CROSSING): CrossingPlan {
  const image = new TuneImage(original);
  const lead = songNotes(image, GAME_SONG)[LEAD_VOICE] ?? [];
  const loopTicks = lead.reduce((sum, n) => sum + n.ticks, 0);
  // a phrase begins where a pattern of the lead's order list starts after a pattern of two bars or more (the loop's end counts before the first)
  const starts = lead.filter((n) => n.index === 0).map((n) => n.start);
  const phraseTicks = starts.filter((_, i) => (i === 0 ? loopTicks - (starts[starts.length - 1] ?? 0) : (starts[i] ?? 0) - (starts[i - 1] ?? 0)) >= SHORT_PATTERN_TICKS);
  const bars: number[] = [];
  for (let t = 0; t < loopTicks; t += BAR_TICKS) bars.push(t * FRAMES_PER_TICK);
  const dip = style === 'dip';
  return {
    loopFrames: loopTicks * FRAMES_PER_TICK,
    phrases: style === 'cut' ? bars : phraseTicks.map((t) => t * FRAMES_PER_TICK),
    bars,
    maxWaitFrames: MAX_WAIT_SECONDS * FRAMES_PER_SECOND,
    fadeOutFrames: dip ? FADE_FRAMES : 0,
    fadeInFrames: dip ? FADE_FRAMES : 0,
  };
}
