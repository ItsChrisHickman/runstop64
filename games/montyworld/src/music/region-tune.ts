import { patternTicks, songNotes, TuneImage, type InstrumentChange, type PatternEvent, type SongNote } from './hubbard';

/**
 * A region's version of Monty on the Run's tune (docs/dosvidaniya-plan.md): the same tune played by Hubbard's own driver, made
 * from the original .sid by changing its data (hubbard.ts), never the player and never the timing:
 *
 * - **a scale**: which scale degrees move, by how many semitones (every pitched note of the tune: the lead and the bass, not
 *   the drums, whose "notes" are the pitch of noise). The introduction is never bent (it is Hubbard's, note for note), and a
 *   lead note is bent only where the result is consonant with the bass under it (`consonant`): no minor second, major seventh
 *   or tritone against it, else it keeps Hubbard's note;
 * - **scoops**: a lead note approached from below may slide up into its pitch (Hubbard's own slide, a byte in the pattern's data);
 * - **instruments**: new settings for the instruments the lead plays (and any other), by number;
 * - **breaks**: a phrase of another tune (a folk tune) in place of one pattern, of the same length in ticks;
 * - **fills**: a short phrase of the region's own in the silence that ends a pattern (the rest the lead already has), the pattern's notes before it Hubbard's (bent as the scale says).
 *
 * Every pattern keeps the ticks of every note, so the rhythm and the tempo are Hubbard's whatever the region. A region is a
 * `RegionTune` value (moscow.ts) and `retune` makes the .sid for it.
 */

/** The semitones above the tonic that a pitch class sits at, 0 to 11 (so 12 entries in a scale's `shift`). */
export const SCALE_DEGREES = 12;

export interface RegionTune {
  /** What the version is called (a tune and an id in the front end). */
  readonly id: string;
  /** The tune's tonic as a pitch class (0 = C, 7 = G; Monty on the Run's tune is in G minor). */
  readonly tonic: number;
  /** For each semitone above the tonic (0 to 11), how many semitones a lead note on it moves (0 stays), where it is consonant with the bass. */
  readonly shift: readonly number[];
  /** The same for the bass and the other voices, moved always (the scale of the accompaniment); `shift` if not given. */
  readonly bassShift?: readonly number[];
  /** Slides into notes: lead notes of `minTicks` to `maxTicks` ticks, approached from below, start up to `below` semitones under their pitch and slide up to it by the end of the note. */
  readonly scoop?: { readonly minTicks: number; readonly maxTicks: number; readonly below: number };
  /** Instruments to change, by their number in the driver's table (what is not named stays as Hubbard has it). */
  readonly instruments: readonly { readonly instrument: number; readonly set: InstrumentChange }[];
  /** A pattern (of the in-game song) given other notes of the same length in ticks, played as written (the scale does not move them). */
  readonly breaks: readonly { readonly pattern: number; readonly events: readonly PatternEvent[] }[];
  /** A pattern's closing rest given notes of the region's own (a call at the end of a phrase): the events' ticks add up to the rest's, so the pattern keeps its length. The notes before it are the scale's as ever. */
  readonly fills?: readonly { readonly pattern: number; readonly events: readonly PatternEvent[] }[];
  /**
   * Keep the version exactly as it was approved: every pitched note of every voice (the introduction's too) moved by `shift`, with no consonance gate, no scoop and the bass moved as the
   * lead is. Moscow's, which Chris loved as it was before the gate existed (test/music.ts holds it to the bytes it had).
   */
  readonly asApproved?: boolean;
}

/** The song the game plays while the player plays (Music.Init 0). */
export const GAME_SONG = 0;

/** The song's voices: voice 0 plays the lead; voice 2 the bass line (voice 1 mostly the drums). */
export const LEAD_VOICE = 0;
export const BASS_VOICE = 2;
/** The instruments the lead sets when the tune proper begins (the introduction before it plays others). */
const MAIN_INSTRUMENTS: readonly number[] = [0, 4, 5, 15];
/** The slide's byte is its speed, in frequency units a frame, below this flag. */
const SLIDE_FLAG = 0x80;
const SLIDE_MAX_SPEED = 0x7f;

/** The intervals (in semitones, mod 12) that clash: the minor second, the tritone and the major seventh. */
const DISSONANT: readonly number[] = [1, 6, 11];

/** Whether two notes sound consonant together: not a minor second, a tritone or a major seventh apart, in any octave. */
export function consonant(a: number, b: number): boolean {
  return !DISSONANT.includes(Math.abs(a - b) % SCALE_DEGREES);
}

/**
 * The patterns that make up the introduction, and that stay Hubbard's: those the lead plays before the tune proper (the first
 * pattern with a main instrument), and any pattern, in any voice, that starts while the lead is playing one of those (the
 * introduction comes round again after the first part, with its own bass).
 */
export function introPatterns(notes: readonly (readonly SongNote[])[]): Set<number> {
  const lead = notes[LEAD_VOICE] ?? [];
  const mainStarts = lead.find((n) => MAIN_INSTRUMENTS.includes(n.instrument))?.start ?? 0;
  const own = new Set(lead.filter((n) => n.start < mainStarts).map((n) => n.pattern));
  const during = lead.filter((n) => own.has(n.pattern));
  const out = new Set<number>(own);
  for (const voice of notes) for (const n of voice) if (n.index === 0 && during.some((d) => n.start >= d.start && n.start < d.start + d.ticks)) out.add(n.pattern);
  return out;
}


const NOTE_NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note's number in the driver's frequency table: `noteNumber('G4')` is 55, `'Bb5'` and `'F#3'` take a flat or sharp. */
export function noteNumber(name: string): number {
  const m = /^([A-G])([b#]?)(\d)$/.exec(name);
  const letter = m?.[1];
  const base = letter === undefined ? undefined : NOTE_NAMES[letter];
  if (!m || base === undefined) throw new Error(`not a note: ${name}`);
  return 12 * Number(m[3]) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** A melody for a break: each note's name and its length in ticks (the name "-" is a rest), all on one instrument (set on the first note). */
export function melody(instrument: number, notes: readonly (readonly [name: string, ticks: number])[]): PatternEvent[] {
  let first = true;
  return notes.map(([name, ticks]) => {
    if (name === '-') return { ticks, hold: false, prefix: null, note: null };
    const prefix: PatternEvent['prefix'] = first ? { kind: 'instrument', instrument } : null;
    first = false;
    return { ticks, hold: false, prefix, note: noteNumber(name) };
  });
}

/** A drum for a groove: the driver's instrument, the pitch of its noise or thud, and how many steps it lasts (the steps after it, written as rests, are part of it). */
export type Hit = readonly [instrument: number, note: number, steps?: number];

/**
 * A drum pattern from a string of steps (`stepTicks` long each, 2 ticks a sixteenth at the tune's tempo): a letter is a hit from `hits`,
 * a dot a rest. The pattern keeps the length of the one it replaces (`breaks`), so the tempo is Hubbard's; only where the drums fall is the region's.
 */
export function groove(steps: string, hits: Readonly<Record<string, Hit>>, stepTicks = 2): PatternEvent[] {
  const chars = Array.from(steps.replace(/ /g, ''));
  const out: PatternEvent[] = [];
  let instrument = -1, rest = 0;
  const flush = () => {
    for (; rest > 0; rest -= MAX_EVENT_TICKS) out.push({ ticks: Math.min(rest, MAX_EVENT_TICKS), hold: false, prefix: null, note: null });
    rest = 0;
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? '.';
    if (ch === '.') { rest += stepTicks; continue; }
    const hit = hits[ch];
    if (!hit) throw new Error(`no drum for "${ch}"`);
    const length = hit[2] ?? 1;
    if (chars.slice(i + 1, i + length).some((c) => c !== '.')) throw new Error(`the hit "${ch}" lasts ${length} steps and something follows it`);
    flush();
    out.push({ ticks: length * stepTicks, hold: false, prefix: hit[0] === instrument ? null : { kind: 'instrument', instrument: hit[0] }, note: hit[1] });
    instrument = hit[0];
    i += length - 1;
  }
  flush();
  return out;
}

/** The most ticks a step of a pattern can last. */
const MAX_EVENT_TICKS = 32;

/** Where a note goes under a scale. */
export function bend(note: number, tune: Pick<RegionTune, 'tonic' | 'shift'>, shift: readonly number[] = tune.shift): number {
  return note + (shift[(((note - tune.tonic) % SCALE_DEGREES) + SCALE_DEGREES) % SCALE_DEGREES] ?? 0);
}

/**
 * The tune's .sid for a region: `original` unchanged, a copy edited. Throws if the tune's data is not what the transform
 * assumes (a step that is a drum under one voice and a note under another, a break of another length).
 */
export function retune(original: Uint8Array, tune: RegionTune, song = GAME_SONG): Uint8Array {
  if (tune.asApproved) return retuneAsApproved(original, tune, song);
  if (tune.shift.length !== SCALE_DEGREES || (tune.bassShift && tune.bassShift.length !== SCALE_DEGREES)) throw new Error(`a scale has ${SCALE_DEGREES} degrees`);
  const image = new TuneImage(original);
  const notes = songNotes(image, song);
  const bassShift = tune.bassShift ?? tune.shift;

  // which steps are notes of the tune: those not made of noise, by the instrument sounding at each (every voice that plays the step)
  const pitched = new Map<string, boolean>();
  const occurrences = new Map<string, SongNote[]>();
  const voicesOf = new Map<number, Set<number>>();
  for (const voice of notes) {
    for (const n of voice) {
      const key = `${n.pattern}:${n.index}`;
      if (pitched.get(key) === !n.pitched && n.note !== null && n.note < 0x60) throw new Error(`pattern ${n.pattern} step ${n.index} is a drum under one voice and a note under another`);
      pitched.set(key, n.pitched);
      occurrences.set(key, [...(occurrences.get(key) ?? []), n]);
      voicesOf.set(n.pattern, (voicesOf.get(n.pattern) ?? new Set<number>()).add(n.voice));
    }
  }
  const used = new Set(voicesOf.keys());
  const intro = introPatterns(notes);
  const broken = new Set(tune.breaks.map((b) => b.pattern));
  // a pattern any voice but the lead plays is the accompaniment's (moved always, by its scale); the lead's own are bent where consonant
  const accompaniment = (pattern: number) => [...(voicesOf.get(pattern) ?? [])].some((v) => v !== LEAD_VOICE);
  const lead = (notes[LEAD_VOICE] ?? []).filter((n) => n.pitched && !intro.has(n.pattern) && !broken.has(n.pattern) && !accompaniment(n.pattern));
  const bass = (notes[BASS_VOICE] ?? []).filter((n) => n.pitched);
  const underNote = (o: SongNote) => bass.filter((b) => b.start < o.start + o.ticks && b.start + b.ticks > o.start);

  // The bass steps moved to the accompaniment's scale, all but those in `kept` (given back to Hubbard's where a lead note would clash with them, below).
  const kept = new Set<string>();
  const bassNow = (n: SongNote): number | null => (n.note !== null && n.pitched && !intro.has(n.pattern) && !kept.has(`${n.pattern}:${n.index}`) ? bend(n.note, tune, bassShift) : n.note);
  /** A lead step's note: the bend where it is consonant with the bass under it at every tick the step is played, else Hubbard's. */
  const leadNote = (pattern: number, index: number, note: number): number => {
    const bent = bend(note, tune);
    const under = (occurrences.get(`${pattern}:${index}`) ?? []).flatMap(underNote);
    return under.every((b) => { const now = bassNow(b); return now === null || consonant(bent, now); }) ? bent : note;
  };
  // A lead note left on Hubbard's pitch can clash with a bass note that was moved (where Hubbard's pair did not): that bass note goes back to Hubbard's, and the lead is decided again.
  for (let again = true; again;) {
    again = false;
    for (const o of lead) {
      if (o.note === null) continue;
      const chosen = leadNote(o.pattern, o.index, o.note);
      for (const b of underNote(o)) {
        const now = bassNow(b);
        if (now === null || b.note === null || consonant(chosen, now) || !consonant(o.note, b.note) || now === b.note) continue;
        kept.add(`${b.pattern}:${b.index}`);
        again = true;
      }
    }
  }

  for (const pattern of used) {
    if (broken.has(pattern) || intro.has(pattern)) continue;
    const { events } = image.readPattern(pattern);
    const isAccompaniment = accompaniment(pattern);
    const bendable = (e: PatternEvent, index: number): number | null => {
      if (e.note === null || pitched.get(`${pattern}:${index}`) !== true) return null;
      if (isAccompaniment) return kept.has(`${pattern}:${index}`) ? e.note : bend(e.note, tune, bassShift);
      return leadNote(pattern, index, e.note);
    };
    const moved = events.map((e, index): PatternEvent => { const note = bendable(e, index); return note === null ? e : { ...e, note }; });
    const scooped = isAccompaniment ? moved : scoop(image, tune, moved, (i) => pitched.get(`${pattern}:${i}`) === true);
    if (scooped.some((e, i) => e.note !== events[i]?.note || e.prefix !== events[i]?.prefix)) image.writePattern(pattern, scooped);
  }

  for (const { pattern, events } of tune.breaks) {
    if (!used.has(pattern)) throw new Error(`pattern ${pattern} is not in song ${song}`);
    const was = patternTicks(image.readPattern(pattern).events);
    if (patternTicks(events) !== was) throw new Error(`the break for pattern ${pattern} lasts ${patternTicks(events)} ticks, the pattern ${was}`);
    image.writePattern(pattern, events);
  }

  for (const { pattern, events } of tune.fills ?? []) {
    if (!used.has(pattern) || broken.has(pattern) || intro.has(pattern)) throw new Error(`pattern ${pattern} cannot take a fill`);
    const now = image.readPattern(pattern).events;
    const rest = now[now.length - 1];
    if (!rest || rest.note !== null || rest.prefix !== null || rest.hold || rest.ticks !== patternTicks(events)) throw new Error(`pattern ${pattern} does not end in a rest of ${patternTicks(events)} ticks`);
    image.writePattern(pattern, [...now.slice(0, -1), ...events]);
  }

  for (const { instrument, set } of tune.instruments) {
    image.writeInstrument(instrument, { ...image.readInstrument(instrument), ...set });
  }
  return image.file();
}

/**
 * A pattern's lead notes that slide up into their pitch, if the region scoops: a note of the right length with no other prefix, not
 * tied, approached from a lower note, starts at the lower of that note and `below` semitones under its pitch and rises at the speed
 * that reaches its pitch on the last frame of the note (the driver adds the slide's byte to the frequency every frame).
 */
function scoop(image: TuneImage, tune: RegionTune, events: readonly PatternEvent[], isNote: (index: number) => boolean): PatternEvent[] {
  const spec = tune.scoop;
  if (!spec) return [...events];
  return events.map((e, i): PatternEvent => {
    const prev = events[i - 1];
    if (e.note === null || e.prefix !== null || e.hold || !isNote(i) || e.ticks < spec.minTicks || e.ticks > spec.maxTicks) return e;
    if (!prev || prev.note === null || !isNote(i - 1) || prev.note >= e.note) return e;
    const from = Math.max(prev.note, e.note - spec.below);
    const speed = Math.round((image.frequency(e.note) - image.frequency(from)) / (2 * e.ticks - 1));
    if (speed < 1 || speed > SLIDE_MAX_SPEED) return e;
    return { ...e, prefix: { kind: 'slide', value: SLIDE_FLAG | speed }, note: from };
  });
}

/** `asApproved` versions: the scale moves every pitched note of the song, the introduction's and the bass's included, wherever it lands. */
function retuneAsApproved(original: Uint8Array, tune: RegionTune, song: number): Uint8Array {
  if (tune.shift.length !== SCALE_DEGREES) throw new Error(`a scale has ${SCALE_DEGREES} degrees`);
  const image = new TuneImage(original);
  const notes = songNotes(image, song);
  const pitched = new Map<string, boolean>();
  for (const n of notes.flat()) {
    const key = `${n.pattern}:${n.index}`;
    if (pitched.get(key) === !n.pitched && n.note !== null && n.note < 0x60) throw new Error(`pattern ${n.pattern} step ${n.index} is a drum under one voice and a note under another`);
    pitched.set(key, n.pitched);
  }
  const used = new Set(notes.flat().map((n) => n.pattern));
  const broken = new Set(tune.breaks.map((b) => b.pattern));
  for (const pattern of used) {
    if (broken.has(pattern)) continue;
    const { events } = image.readPattern(pattern);
    const moved = events.map((e, index): PatternEvent => (e.note !== null && pitched.get(`${pattern}:${index}`) === true ? { ...e, note: bend(e.note, tune) } : e));
    if (moved.some((e, i) => e.note !== events[i]?.note)) image.writePattern(pattern, moved);
  }
  for (const { pattern, events } of tune.breaks) {
    if (!used.has(pattern)) throw new Error(`pattern ${pattern} is not in song ${song}`);
    const was = patternTicks(image.readPattern(pattern).events);
    if (patternTicks(events) !== was) throw new Error(`the break for pattern ${pattern} lasts ${patternTicks(events)} ticks, the pattern ${was}`);
    image.writePattern(pattern, events);
  }
  for (const { instrument, set } of tune.instruments) image.writeInstrument(instrument, { ...image.readInstrument(instrument), ...set });
  return image.file();
}
