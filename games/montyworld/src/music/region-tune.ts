import { FREQUENCY_NOTES, patternTicks, playedSteps, TuneImage, type InstrumentChange, type PatternEvent } from './hubbard';

/**
 * A region's version of Monty on the Run's tune (docs/dosvidaniya-plan.md): the same tune played by Hubbard's own driver, made
 * from the original .sid by changing its data (hubbard.ts), never the player and never the timing:
 *
 * - **a scale**: which scale degrees move, by how many semitones (every pitched note of the tune: the lead and the bass, not
 *   the drums, whose "notes" are the pitch of noise);
 * - **instruments**: new settings for the instruments the lead plays (and any other), by number;
 * - **breaks**: a phrase of another tune (a folk tune) in place of one pattern, of the same length in ticks.
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
  /** For each semitone above the tonic (0 to 11), how many semitones a note on it moves (0 stays). */
  readonly shift: readonly number[];
  /** Instruments to change, by their number in the driver's table (what is not named stays as Hubbard has it). */
  readonly instruments: readonly { readonly instrument: number; readonly set: InstrumentChange }[];
  /** A pattern (of the in-game song) given other notes of the same length in ticks, played as written (the scale does not move them). */
  readonly breaks: readonly { readonly pattern: number; readonly events: readonly PatternEvent[] }[];
}

/** The song the game plays while the player plays (Music.Init 0). */
export const GAME_SONG = 0;

const NOTE_NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note's number in the driver's frequency table: `noteNumber('G4')` is 55, `'Bb5'` and `'F#3'` take a flat or sharp. */
export function noteNumber(name: string): number {
  const m = /^([A-G])([b#]?)(\d)$/.exec(name);
  const letter = m?.[1];
  const base = letter === undefined ? undefined : NOTE_NAMES[letter];
  if (!m || base === undefined) throw new Error(`not a note: ${name}`);
  return 12 * Number(m[3]) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** A melody for a break: each note's name and its length in ticks, all on one instrument (set on the first note). */
export function melody(instrument: number, notes: readonly (readonly [name: string, ticks: number])[]): PatternEvent[] {
  return notes.map(([name, ticks], i) => ({
    ticks, hold: false, prefix: i === 0 ? { kind: 'instrument', instrument } : null, note: noteNumber(name),
  }));
}

/** Where a note goes under a scale. */
export function bend(note: number, tune: Pick<RegionTune, 'tonic' | 'shift'>): number {
  return note + (tune.shift[(((note - tune.tonic) % SCALE_DEGREES) + SCALE_DEGREES) % SCALE_DEGREES] ?? 0);
}

/**
 * The tune's .sid for a region: `original` unchanged, a copy edited. Throws if the tune's data is not what the transform
 * assumes (a step that is a drum under one voice and a note under another, a break of another length).
 */
export function retune(original: Uint8Array, tune: RegionTune, song = GAME_SONG): Uint8Array {
  if (tune.shift.length !== SCALE_DEGREES) throw new Error(`a scale has ${SCALE_DEGREES} degrees`);
  const image = new TuneImage(original);

  // which steps are notes of the tune: those not made of noise, by the instrument sounding at each (every voice that plays the step)
  const pitched = new Map<string, boolean>();
  for (const { step } of playedSteps(image, song)) {
    const key = `${step.pattern}:${step.index}`;
    const isNote = !image.isPercussion(step.instrument);
    if (pitched.get(key) === !isNote) throw new Error(`pattern ${step.pattern} step ${step.index} is a drum under one voice and a note under another`);
    pitched.set(key, isNote);
  }
  const used = new Set(image.voices(song).flat());

  const broken = new Set(tune.breaks.map((b) => b.pattern));
  for (const pattern of used) {
    if (broken.has(pattern)) continue;
    const { events } = image.readPattern(pattern);
    const moved = events.map((e, index): PatternEvent => (e.note !== null && e.note < FREQUENCY_NOTES && pitched.get(`${pattern}:${index}`) === true ? { ...e, note: bend(e.note, tune) } : e));
    if (moved.some((e, i) => e.note !== events[i]?.note)) image.writePattern(pattern, moved);
  }

  for (const { pattern, events } of tune.breaks) {
    if (!used.has(pattern)) throw new Error(`pattern ${pattern} is not in song ${song}`);
    const was = patternTicks(image.readPattern(pattern).events);
    if (patternTicks(events) !== was) throw new Error(`the break for pattern ${pattern} lasts ${patternTicks(events)} ticks, the pattern ${was}`);
    image.writePattern(pattern, events);
  }

  for (const { instrument, set } of tune.instruments) {
    image.writeInstrument(instrument, { ...image.readInstrument(instrument), ...set });
  }
  return image.file();
}
