/**
 * Rob Hubbard's music driver as Monty on the Run has it, read and written as data.
 *
 * The game plays its music through Hubbard's own 6502 player, from the .sid (HVSC) the tune came in: the player runs
 * unchanged and everything that makes the tune is data in the same image. This module knows where that data is and what it
 * means, so a region's version of the tune is made by editing the data, never the player (so the tempo, the timing and the
 * sound effects are Hubbard's, by construction). What was read from the player's code (disassembled in the HVSC image):
 *
 * - `SONG_TABLE`: six bytes a song, the low bytes of the three voices' sequences, then their high bytes. Song 0 is the in-game tune.
 * - A voice's sequence is a list of pattern numbers, `$FF` loops it, `$FE` stops it.
 * - `PATTERN_LO`/`PATTERN_HI`: the address of each pattern. A pattern is a list of notes ending in `$FF`: a head byte (bits 0-4
 *   the length minus one in ticks, bit 5 "hold" (no gate-off before the next note), bit 6 a rest, bit 7 "a byte follows"), then,
 *   if bit 7: an instrument number (below `$80`) or a slide (`$80` and up), then the note (an index into the frequency table
 *   at `$8400`, one semitone a step, 12 an octave). A rest has no further bytes.
 * - `INSTRUMENTS`: eight bytes an instrument: pulse width (low, high), control (waveform and gate), attack/decay, sustain/release,
 *   vibrato depth (0 none), pulse sweep (step in the top three bits, delay in the low five), effects (bit 0 and 1 pitch drops, bit 2 arpeggio).
 * - One tick is two frames (the byte at `$84EC`), the same for every tune: nothing here touches it.
 */

/** Where the .sid's code and data load, and where in the file that starts (the PSID header, then the two load address bytes). */
const LOAD_ADDRESS = 0x8000;
const DATA_OFFSET = 0x7e;
const SONG_TABLE = 0x856c;
const PATTERN_LO = 0x857e;
const PATTERN_HI = 0x85cb;
export const PATTERN_COUNT = PATTERN_HI - PATTERN_LO;
const INSTRUMENTS = 0x93b4;
export const INSTRUMENT_COUNT = (0x9454 - INSTRUMENTS) / 8;
const INSTRUMENT_SIZE = 8;
/** The notes the frequency table has ($8400 to $84BF). A "note" above them reads the player's own variables as a pitch (the intro's G#8 is such a trick): not a note of the tune. */
export const FREQUENCY_NOTES = 0x60;
const SEQUENCE_LOOPS = 0xff;
const SEQUENCE_STOPS = 0xfe;
const PATTERN_END = 0xff;
const FLAG_HOLD = 0x20;
const FLAG_REST = 0x40;
const FLAG_EXTRA = 0x80;
/** The waveform bit for noise in an instrument's control byte (the drums, the snare, the crash). */
const WAVE_NOISE = 0x80;
/** An instrument's effects bits for a pitch that falls (every frame, or every other). */
const PITCH_FALLS = 0x03;

/** What a pattern's extra byte (head bit 7) is: an instrument change, or a slide of the pitch. */
export type Prefix = { readonly kind: 'instrument'; readonly instrument: number } | { readonly kind: 'slide'; readonly value: number };

/** One step of a pattern. */
export interface PatternEvent {
  /** Length in ticks (1 to 32). */
  readonly ticks: number;
  /** No gate-off before the next note. */
  readonly hold: boolean;
  readonly prefix: Prefix | null;
  /** The note (frequency table index), or null for a rest. */
  readonly note: number | null;
}

/** An instrument's eight bytes by name. */
export interface Instrument {
  /** Pulse width, 12 bits. */
  pulseWidth: number;
  /** Waveform and gate ($41 pulse, $81 noise, $11 triangle, $21 sawtooth). */
  control: number;
  attackDecay: number;
  sustainRelease: number;
  vibrato: number;
  pulseSweep: number;
  effects: number;
}

export type InstrumentChange = Partial<Instrument>;

/** A song's three voices: the pattern numbers each plays in turn. */
export type Voices = readonly [readonly number[], readonly number[], readonly number[]];

/** A .sid image of the tune, a private copy to read and edit. */
export class TuneImage {
  /** The whole file: it grows when a pattern is added after the driver's data. */
  private bytes: Uint8Array;

  constructor(file: Uint8Array) {
    const magic = String.fromCharCode(...file.subarray(0, 4));
    if (magic !== 'PSID') throw new Error('the tune is not a PSID file');
    if (file[6] !== 0 || file[7] !== 0x7c || file[8] !== 0 || file[9] !== 0 || file[0x7c] !== (LOAD_ADDRESS & 0xff) || file[0x7d] !== LOAD_ADDRESS >> 8) {
      throw new Error('the tune is not the Monty on the Run image this module reads');
    }
    this.bytes = Uint8Array.from(file);
  }

  /** The file as it is now. */
  file(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }

  private offset(address: number): number {
    const at = address - LOAD_ADDRESS + DATA_OFFSET;
    if (address < LOAD_ADDRESS || at >= this.bytes.length) throw new Error(`address $${address.toString(16)} is outside the tune`);
    return at;
  }

  u8(address: number): number {
    const value = this.bytes[this.offset(address)];
    if (value === undefined) throw new Error(`address $${address.toString(16)} is outside the tune`);
    return value;
  }

  set8(address: number, value: number): void {
    this.offset(address);
    this.bytes[this.offset(address)] = value;
  }

  private u16(lo: number, hi: number): number {
    return this.u8(lo) | (this.u8(hi) << 8);
  }

  /** The address after the last byte of the tune. */
  end(): number {
    return LOAD_ADDRESS + this.bytes.length - DATA_OFFSET;
  }

  /** Add bytes after the end of the tune (the driver's own data is all below it), and say where they went. */
  append(data: readonly number[]): number {
    const at = this.end();
    const grown = new Uint8Array(this.bytes.length + data.length);
    grown.set(this.bytes);
    grown.set(data, this.bytes.length);
    this.bytes = grown;
    return at;
  }

  // ---- songs and patterns ----------------------------------------------------------------------

  /** The pattern numbers each voice of a song plays, from its start to the loop (or stop) mark. */
  voices(song: number): Voices {
    const at = SONG_TABLE + song * 6;
    const voice = (v: number) => {
      const out: number[] = [];
      for (let a = this.u16(at + v, at + 3 + v); ; a++) {
        const n = this.u8(a);
        if (n === SEQUENCE_LOOPS || n === SEQUENCE_STOPS) return out;
        out.push(n);
      }
    };
    return [voice(0), voice(1), voice(2)];
  }

  patternAddress(pattern: number): number {
    if (pattern < 0 || pattern >= PATTERN_COUNT) throw new Error(`there is no pattern ${pattern}`);
    return this.u16(PATTERN_LO + pattern, PATTERN_HI + pattern);
  }

  /** A pattern's steps, and the number of bytes it takes up to its end mark (included). */
  readPattern(pattern: number): { events: PatternEvent[]; size: number } {
    const start = this.patternAddress(pattern);
    const events: PatternEvent[] = [];
    let a = start;
    for (let head = this.u8(a++); head !== PATTERN_END; head = this.u8(a++)) {
      const ticks = (head & 0x1f) + 1;
      const hold = (head & FLAG_HOLD) !== 0;
      if (head & FLAG_REST) {
        events.push({ ticks, hold, prefix: null, note: null });
        continue;
      }
      let prefix: Prefix | null = null;
      if (head & FLAG_EXTRA) {
        const extra = this.u8(a++);
        prefix = extra & 0x80 ? { kind: 'slide', value: extra } : { kind: 'instrument', instrument: extra };
      }
      events.push({ ticks, hold, prefix, note: this.u8(a++) });
    }
    return { events, size: a - start };
  }

  /** Point a pattern at new steps, in place if they fit where it was, else after the end of the tune. */
  writePattern(pattern: number, events: readonly PatternEvent[]): void {
    const bytes = encodePattern(events);
    const { size } = this.readPattern(pattern);
    let at = this.patternAddress(pattern);
    if (bytes.length > size) at = this.append(bytes);
    else bytes.forEach((b, i) => this.set8(at + i, b));
    this.set8(PATTERN_LO + pattern, at & 0xff);
    this.set8(PATTERN_HI + pattern, at >> 8);
  }

  // ---- instruments -----------------------------------------------------------------------------

  private instrumentAddress(n: number): number {
    if (n < 0 || n >= INSTRUMENT_COUNT) throw new Error(`there is no instrument ${n}`);
    return INSTRUMENTS + n * INSTRUMENT_SIZE;
  }

  readInstrument(n: number): Instrument {
    const a = this.instrumentAddress(n);
    return {
      pulseWidth: this.u8(a) | (this.u8(a + 1) << 8), control: this.u8(a + 2), attackDecay: this.u8(a + 3), sustainRelease: this.u8(a + 4),
      vibrato: this.u8(a + 5), pulseSweep: this.u8(a + 6), effects: this.u8(a + 7),
    };
  }

  writeInstrument(n: number, i: Instrument): void {
    const a = this.instrumentAddress(n);
    [i.pulseWidth & 0xff, (i.pulseWidth >> 8) & 0x0f, i.control, i.attackDecay, i.sustainRelease, i.vibrato, i.pulseSweep, i.effects].forEach((b, k) => this.set8(a + k, b));
  }

  /**
   * Whether an instrument is a drum or an effect: made of noise, or with its pitch falling as it sounds (effects bits 0 and 1, the
   * toms and the bell's fall). Its "note" is where the sound starts, not a note of the tune, and the length of the fall follows it.
   */
  isPercussion(n: number): boolean {
    const i = this.readInstrument(n);
    return (i.control & WAVE_NOISE) !== 0 || (i.effects & PITCH_FALLS) !== 0;
  }
}

/** A pattern's steps as the driver reads them. */
export function encodePattern(events: readonly PatternEvent[]): number[] {
  const out: number[] = [];
  for (const e of events) {
    if (e.ticks < 1 || e.ticks > 32) throw new Error(`a note of ${e.ticks} ticks`);
    const rest = e.note === null;
    out.push((e.ticks - 1) | (e.hold ? FLAG_HOLD : 0) | (rest ? FLAG_REST : 0) | (!rest && e.prefix ? FLAG_EXTRA : 0));
    if (e.note === null) continue;
    if (e.prefix) out.push(e.prefix.kind === 'instrument' ? e.prefix.instrument : e.prefix.value);
    out.push(e.note);
  }
  out.push(PATTERN_END);
  return out;
}

/** The ticks a pattern lasts. */
export const patternTicks = (events: readonly PatternEvent[]) => events.reduce((sum, e) => sum + e.ticks, 0);

/** Each voice's notes, the instrument sounding at each, as the song plays them. */
export interface Played {
  readonly pattern: number;
  readonly index: number;
  readonly instrument: number;
}

/** Every (pattern, step) a song's voices play, with the instrument that voice has at that step (an instrument holds until changed). */
export function playedSteps(image: TuneImage, song: number): { voice: number; step: Played }[] {
  const out: { voice: number; step: Played }[] = [];
  image.voices(song).forEach((patterns, voice) => {
    let instrument = 0;
    for (const pattern of patterns) {
      image.readPattern(pattern).events.forEach((e, index) => {
        if (e.prefix?.kind === 'instrument') instrument = e.prefix.instrument;
        out.push({ voice, step: { pattern, index, instrument } });
      });
    }
  });
  return out;
}
