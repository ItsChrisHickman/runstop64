import { CREDIT } from './credits';

/**
 * The montage's clock, pure: what the empty band says at each frame of a place, and where each visitor of the cast stands. The band
 * is one row of the picture the game leaves empty, so a place's credit lines and its visitors' names take turns in it: all the
 * place's lines first, one after another, then the names of its visitors, each as the visitor passes the middle of the picture. A
 * name never comes between two lines, so a sentence typed over two lines is never broken by one (the names are drawn in a colour of
 * their own, too: `show.ts`). Each visitor walks across the place and is named for a moment as it passes the middle.
 */

/** Frames a visitor's name is shown, a moment it is off at the end, and the frames its walk lasts either side of that. */
export const NAME = { slot: 40, gap: 6, lead: 40 } as const;

/** One turn of the band: a credit line (its index) or a visitor's name (its index among this place's visitors). */
interface Beat { kind: 'credit' | 'name'; index: number; from: number; len: number }

/** What a place declares of its time: its lines, how long it runs at least and the frame its band is empty from. */
interface PlaceShape { credits?: readonly string[]; frames: number; bandFrom?: number; visitors?: false }

export interface Timeline { length: number; beats: readonly Beat[] }

/**
 * A place's turns: its credit lines, then its visitors' names. It runs as long as it declares, or longer if its turns need it; spare
 * time is the lines' (held longer), less a moment after the last name, where there is time for it, for its visitor to walk off.
 */
export function timelineOf(place: PlaceShape, visitors: number, slot: number = CREDIT.slot, nameSlot: number = NAME.slot): Timeline {
  const lines = place.credits?.length ?? 0;
  const turns: Pick<Beat, 'kind' | 'index'>[] = [
    ...Array.from({ length: lines }, (_, index) => ({ kind: 'credit' as const, index })),
    ...Array.from({ length: visitors }, (_, index) => ({ kind: 'name' as const, index })),
  ];
  const base = turns.reduce((n, t) => n + (t.kind === 'credit' ? slot : nameSlot), 0);
  const first = place.bandFrom ?? 0;
  const tail = visitors > 0 ? NAME.lead : 0;
  const spare = lines > 0 ? Math.max(0, place.frames - first - base - tail) : 0;
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
  if (into >= beat.len - NAME.gap) return null;
  const name = names[beat.index];
  return name === undefined ? null : { text: name, beat };
}

/** The frames a visitor is on its way, about its name's turn. */
export interface Walk { from: number; to: number }

export function walkOf(beat: Beat, length: number): Walk {
  const from = Math.max(0, beat.from - NAME.lead);
  return { from, to: Math.max(from + 30, Math.min(length, beat.from + beat.len + NAME.lead)) };
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
 * How many of `n` visitors each place takes (none for a place with no credits: its band is not empty, nor for one that says `visitors: false`): spread evenly, the extra ones
 * to the places with the most spare time.
 */
export function sharesOf(places: readonly PlaceShape[], n: number, slot: number = CREDIT.slot, nameSlot: number = NAME.slot): number[] {
  const eligible = places.flatMap((p, i) => ((p.credits?.length ?? 0) > 0 && p.visitors !== false ? [i] : []));
  const out = places.map(() => 0);
  if (eligible.length === 0) return out;
  const base = Math.floor(n / eligible.length);
  for (const i of eligible) out[i] = base;
  const spare = (i: number) => {
    const p = places[i];
    return p ? p.frames - (p.bandFrom ?? 0) - (p.credits?.length ?? 0) * slot - base * nameSlot : 0;
  };
  const order = [...eligible].sort((a, b) => spare(b) - spare(a) || a - b);
  for (let k = 0; k < n - base * eligible.length; k++) {
    const i = order[k];
    if (i !== undefined) out[i]++;
  }
  return out;
}
