import { CREDIT } from './credits';

/**
 * The montage's clock, pure: what the empty band says at each frame of a place, and where each visitor of the cast stands. The band
 * is one row of the picture the game leaves empty, so a place's credit lines and its visitors' names take turns in it: all the
 * place's lines first, one after another, then the parade: the visitors one at a time (Super Mario World's way), each crossing the
 * whole picture alone while its name stands under it, the next coming on only once it has gone off. The parade comes after every
 * credit line of the show (`sharesOf`: the last place with a band takes the whole cast), so a name never comes between two lines
 * and a sentence typed over two lines is never broken by one (the names are drawn in a colour of their own, too: `show.ts`).
 */

/** Frames a visitor's walk lasts: it crosses the picture (2.5 seconds) and is named all the while. One at a time: the next walk begins as this one ends. */
export const NAME = { slot: 125 } as const;

/** One turn of the band: a credit line (its index) or a visitor's name (its index among this place's visitors). */
interface Beat { kind: 'credit' | 'name'; index: number; from: number; len: number }

/** What a place declares of its time: its lines, how long it runs at least and the frame its band is empty from. */
interface PlaceShape { credits?: readonly string[]; frames: number; bandFrom?: number; visitors?: boolean; limit?: number }

export interface Timeline { length: number; beats: readonly Beat[] }

/**
 * A place's turns: its credit lines, then its visitors' names, one walk each. It runs as long as it declares, or longer if its turns
 * need it; spare time is the lines' (held longer).
 */
export function timelineOf(place: PlaceShape, visitors: number, slot: number = CREDIT.slot, nameSlot: number = NAME.slot): Timeline {
  const lines = place.credits?.length ?? 0;
  const turns: Pick<Beat, 'kind' | 'index'>[] = [
    ...Array.from({ length: lines }, (_, index) => ({ kind: 'credit' as const, index })),
    ...Array.from({ length: visitors }, (_, index) => ({ kind: 'name' as const, index })),
  ];
  const base = turns.reduce((n, t) => n + (t.kind === 'credit' ? slot : nameSlot), 0);
  const first = place.bandFrom ?? 0;
    const spare = lines > 0 ? Math.max(0, place.frames - first - base) : 0;
  let at = first, given = 0, seen = 0;
  const beats = turns.map((t): Beat => {
    let len = t.kind === 'credit' ? slot : nameSlot;
    if (t.kind === 'credit') {
      seen++;
      const share = seen === lines ? spare - given : Math.floor(spare / lines);
      given += share;
      len += share;
    }
    const beat: Beat = { ...t, from: at, len };
    at += len;
    return beat;
  });
  return { length: Math.max(place.frames, at), beats };
}

/** What the band says at frame `t` of a place: the text and whose turn it is (a credit line typed on, or a whole name), or null between turns. */
export function bandAt(tl: Timeline, t: number, lines: readonly string[], names: readonly string[], gap: number = CREDIT.gap): { text: string; beat: Beat } | null {
  const beat = tl.beats.find((b) => t >= b.from && t < b.from + b.len);
  if (!beat) return null;
  const into = t - beat.from;
  if (beat.kind === 'credit') {
    if (into >= beat.len - gap) return null;
    const line = lines[beat.index];
    return line === undefined ? null : { text: line.slice(0, into), beat };
  }
  const name = names[beat.index];
  return name === undefined ? null : { text: name, beat };
}

/** The frames a visitor is on its way: exactly its turn, so only one is ever on the picture. */
export interface Walk { from: number; to: number }

export function walkOf(beat: Beat): Walk {
  return { from: beat.from, to: beat.from + beat.len };
}

/** The left edge of a visitor `width` wide at frame `t` (it comes in off the left and goes out off the right), or null off its walk. */
export function visitorLeft(walk: Walk, t: number, width: number): number | null {
  if (t < walk.from || t >= walk.to) return null;
  return Math.round(-width + ((t - walk.from) / (walk.to - walk.from)) * (320 + width));
}

/** Where a name stands in the band: under the visitor, kept inside the span the band's text may use (`x` and `span` letters from it). */
export function nameLeft(left: number, letters: number, x: number, span: number): number {
  return Math.max(x, Math.min(left, x + 8 * (span - letters)));
}

/**
 * How many of `n` visitors each place takes. The parade comes after every credit line, so it is in the last place that has a line
 * and in the places after it that say `visitors: true` (their band is empty though they have no lines): never in one that says
 * `visitors: false` (something the game does there wants the picture to itself). Each takes as many walks as fit in what it can
 * run (`limit`, frames: a place whose hero has only so long a way; none: as many as are left) after its own lines; what does not
 * fit anywhere goes to the last of them.
 */
export function sharesOf(places: readonly PlaceShape[], n: number, slot: number = CREDIT.slot): number[] {
  const out = places.map(() => 0);
  const last = places.reduce((at, p, i) => ((p.credits ?? []).some((l) => l !== '') && p.visitors !== false ? i : at), -1);
  if (last < 0) return out;
  const takers = places.flatMap((p, i) => (i === last || (i > last && p.visitors === true) ? [i] : []));
  let left = n;
  for (const i of takers) {
    const p = places[i];
    if (!p) continue;
    const room = p.limit === undefined ? left : Math.max(0, Math.floor((p.limit - (p.bandFrom ?? 0) - (p.credits?.length ?? 0) * slot) / NAME.slot));
    const take = Math.min(left, room);
    out[i] = take;
    left -= take;
  }
  const end = takers[takers.length - 1];
  if (end !== undefined) out[end] = (out[end] ?? 0) + left;
  return out;
}
