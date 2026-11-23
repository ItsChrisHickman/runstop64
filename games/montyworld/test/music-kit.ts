/**
 * What a region's version of Monty on the Run's tune is checked against (its test, music-siberia.ts and music-china.ts, give the region's own numbers): made from
 * the original .sid by a scale and instruments only, so the notes moved are exactly the degrees the scale names, every note keeps its length (the tempo and rhythm
 * are Hubbard's: the driver, tempo byte and every gate on every frame of the loop are the original's), the instruments changed are the lead's, and the region's rooms
 * ask for this version and no other's.
 */
import fs from 'node:fs';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { check } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { INSTRUMENT_COUNT, patternTicks, songNotes, TuneImage, type Instrument, type SongNote } from '../src/music/hubbard';
import { bend, BASS_VOICE, consonant, GAME_SONG, introPatterns, LEAD_VOICE, retune, type RegionTune } from '../src/music/region-tune';

export interface TuneChecks {
  name: string;
  tune: RegionTune;
  /** The degrees (semitones above G) the scale moves, as the comma-joined list. */
  moved: string;
  /** How many (break note, bass note) pairs of a rewritten lead phrase may clash (0 unless a phrase was approved as it is). */
  breakClashes?: number;
  /** What every bent note must land on, and how that reads after "every bent note". */
  scale: { text: string; ok: (degree: number) => boolean };
  /** What its lead instrument must be like, and how that reads. */
  lead: { text: string; ok: (lead: Instrument) => boolean };
  /** The rooms that ask for this version, and a room of another region that asks for another. */
  rooms: readonly number[];
  others: readonly (readonly [room: number, version: string])[];
  /** A room of this region whose tune's bytes are checked against the version made here. */
  sample: number;
}

const equal = <T>(x: ArrayLike<T>, y: ArrayLike<T>) => x.length === y.length && Array.from(x).every((v, i) => v === y[i]);

export type NoteChecks = Pick<TuneChecks, 'name' | 'tune' | 'moved' | 'scale' | 'breakClashes'>;

/** The notes of a version `b` against the original `a`: the introduction untouched, every other note the original's or its bend, every length kept, and consonance with the bass. */
export function checkNotes(c: NoteChecks, a: TuneImage, b: TuneImage) {
  const song = GAME_SONG;
  const was = songNotes(a, song), now = songNotes(b, song);
  const intro = introPatterns(was);
  const breaks = new Set(c.tune.breaks.map((x) => x.pattern));
  /** Where a fill starts in its pattern: the steps from there on are the region's own (the rest it replaces was no note of Hubbard's). */
  const fillFrom = new Map((c.tune.fills ?? []).map((f) => [f.pattern, a.readPattern(f.pattern).events.length - 1] as const));
  const bassShift = c.tune.bassShift ?? c.tune.shift;
  const voicesOf = new Map<number, Set<number>>();
  for (const voice of was) for (const n of voice) voicesOf.set(n.pattern, (voicesOf.get(n.pattern) ?? new Set<number>()).add(n.voice));
  const accompaniment = (pattern: number) => [...(voicesOf.get(pattern) ?? [])].some((v) => v !== LEAD_VOICE);
  {
    const moved = c.tune.shift.map((s, i) => (s === 0 ? -1 : i)).filter((i) => i >= 0).join();
    check(`${c.name}'s lead scale moves the degrees ${moved} of G minor, the rest stay`, moved === c.moved);

    // the introduction is Hubbard's, note for note, in every voice
    const introSteps = was.flat().filter((n) => intro.has(n.pattern) && n.note !== null);
    const introChanged = [...intro].filter((p) => JSON.stringify(a.readPattern(p).events) !== JSON.stringify(b.readPattern(p).events));
    check(`the introduction (${intro.size} patterns, ${introSteps.length} notes) is Hubbard's untouched: no note changed (${introChanged.length} patterns differ)`, intro.size > 0 && introChanged.length === 0);

    // every other pitched step: the original, or its bend (the lead's by its scale, the rest by the bass's), a lead note also as a slide up into it
    let steps = 0, bent = 0, wrong = 0, lengths = 0, off = 0, slides = 0, slideWrong = 0;
    const seen = new Set<string>();
    for (const n of was.flat()) {
      if (intro.has(n.pattern) || breaks.has(n.pattern) || n.index >= (fillFrom.get(n.pattern) ?? Infinity)) continue;
      const key = `${n.pattern}:${n.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const w = a.readPattern(n.pattern).events[n.index], m = b.readPattern(n.pattern).events[n.index];
      if (!w || !m) { lengths++; continue; }
      if (w.ticks !== m.ticks || w.hold !== m.hold || (w.note === null) !== (m.note === null)) lengths++;
      if (w.note === null || m.note === null) continue;
      if (!n.pitched) { if (m.note !== w.note) wrong++; continue; }
      steps++;
      const shift = accompaniment(n.pattern) ? bassShift : c.tune.shift;
      const bendTo = bend(w.note, c.tune, shift);
      if (m.prefix?.kind === 'slide' && w.prefix?.kind !== 'slide') {
        slides++;
        const from = m.note, speed = m.prefix.value % 128;
        const target = [w.note, bendTo].find((t) => from < t && Math.abs(a.frequency(from) + speed * (2 * m.ticks - 1) - a.frequency(t)) <= 2 * m.ticks);
        if (accompaniment(n.pattern) || target === undefined || !c.tune.scoop) slideWrong++;
        else if (target !== w.note) { bent++; if (!c.scale.ok((((target - 7) % 12) + 12) % 12)) off++; }
        continue;
      }
      if (JSON.stringify(w.prefix) !== JSON.stringify(m.prefix)) lengths++;
      if (m.note !== w.note && m.note !== bendTo) wrong++;
      if (m.note !== w.note) { bent++; if (!c.scale.ok((((m.note - 7) % 12) + 12) % 12)) off++; }
    }
    check(`${steps} notes outside the introduction: ${bent} bent (each to its scale's note: ${wrong} wrong), ${slides} slid into (${slideWrong} wrong), none changed in length, hold or rest (${lengths})`, bent > 0 && wrong === 0 && slideWrong === 0 && lengths === 0 && (c.tune.scoop !== undefined || slides === 0));
    check(`every bent note ${c.scale.text} (${off} off)`, off === 0);

    // consonance: each lead note's pitch (a slide's end) against every bass note sounding under it
    const bass = now[BASS_VOICE]?.filter((n) => n.pitched) ?? [];
    const bassWas = was[BASS_VOICE]?.filter((n) => n.pitched) ?? [];
    const target = (n: SongNote, image: TuneImage): number | null => {
      const e = image.readPattern(n.pattern).events[n.index];
      if (!e || e.note === null) return null;
      if (e.prefix?.kind !== 'slide' || a.readPattern(n.pattern).events[n.index]?.prefix?.kind === 'slide') return e.note;
      return Array.from({ length: 96 }, (_, k) => k).find((k) => Math.abs(image.frequency(e.note ?? 0) + (e.prefix?.kind === 'slide' ? e.prefix.value % 128 : 0) * (2 * e.ticks - 1) - image.frequency(k)) <= 2 * e.ticks && k > (e.note ?? 0)) ?? null;
    };
    const clashes = (lead: readonly SongNote[], basses: readonly SongNote[], image: TuneImage) => {
      const out = new Set<string>();
      for (const n of lead) {
        if (!n.pitched || intro.has(n.pattern) || breaks.has(n.pattern) || accompaniment(n.pattern)) continue;
        const t = target(n, image);
        if (t === null) continue;
        for (const x of basses) {
          const xt = target(x, image);
          if (xt !== null && x.start < n.start + n.ticks && x.start + x.ticks > n.start && !consonant(t, xt)) out.add(`${n.start}:${x.start}`);
        }
      }
      return out;
    };
    const before = clashes(was[LEAD_VOICE] ?? [], bassWas, a), after = clashes(now[LEAD_VOICE] ?? [], bass, b);
    const added = [...after].filter((k) => !before.has(k));
    check(`consonant with the bass: no minor second, major seventh or tritone under a lead note that the version did not already have in Hubbard's (${before.size} in his, ${after.size} in the version, ${added.length} new)`, added.length === 0);
    // a phrase written into the lead (a break) against the bass under it
    const phrase = (now[LEAD_VOICE] ?? []).filter((n) => breaks.has(n.pattern) && n.pitched);
    const phraseClashes = phrase.filter((n) => n.note !== null && bass.some((x) => x.start < n.start + n.ticks && x.start + x.ticks > n.start && x.note !== null && !consonant(n.note ?? 0, x.note))).length;
    if (phrase.length > 0) check(`the lead's written phrase (${phrase.length} notes) is consonant with the bass under it (${phraseClashes} clashing, ${c.breakClashes ?? 0} allowed)`, phraseClashes <= (c.breakClashes ?? 0));
    const bentStarts = new Set((was[LEAD_VOICE] ?? []).filter((n) => n.pitched && !intro.has(n.pattern) && !breaks.has(n.pattern) && !accompaniment(n.pattern) && target(n, b) !== n.note).map((n) => n.start));
    const clashedBends = [...after].filter((k) => bentStarts.has(Number(k.split(':')[0]))).length;
    check(`and none of the ${bentStarts.size} lead notes the version bent or slid is among the clashes (${clashedBends})`, clashedBends === 0);
  }
}

export function checkTune(c: TuneChecks) {
  const original = Uint8Array.from(fs.readFileSync('games/montyotr/assets/monty_on_the_run.sid'));
  const made = retune(original, c.tune);
  const a = new TuneImage(original), b = new TuneImage(made);
  const song = GAME_SONG;
  checkNotes(c, a, b);
  {
    let same = true;
    for (let addr = 0x8000; addr < 0x8566; addr++) if (a.u8(addr) !== b.u8(addr)) same = false;
    for (let addr = 0x9454; addr < 0x95c0; addr++) if (a.u8(addr) !== b.u8(addr)) same = false;
    check('the driver, frequency table, tempo and sound effects are the same bytes', same);
    const frames = (a.voices(song)[0] ?? []).reduce((sum, p) => sum + patternTicks(a.readPattern(p).events), 0) * 2;
    const gates = (file: Uint8Array) => {
      const tune = new SidTune(parsePsid(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), 44100);
      tune.start(GAME_SONG + 1);
      let frame = 0;
      const out: string[][] = [[], [], []];
      tune.cpu.onWrite = (addr, value) => {
        const voice = addr === 0xd404 ? 0 : addr === 0xd40b ? 1 : addr === 0xd412 ? 2 : -1;
        if (voice >= 0) out[voice]?.push(`${frame}:${value & 1}`);
      };
      for (; frame < frames; frame++) tune.cpu.call(tune.file.playAddress);
      return out;
    };
    const g0 = gates(original), g1 = gates(made);
    // (a rewritten pattern, a drum groove or a phrase, has its own rhythm over the same ticks: its frames are left out)
    const rewrittenPatterns = [...c.tune.breaks, ...(c.tune.fills ?? [])];
    const rewritten = songNotes(a, song).map((voice) => voice.filter((n) => n.index === 0 && rewrittenPatterns.some((x) => x.pattern === n.pattern)).map((n) => [2 * n.start, 2 * (n.start + patternTicks(a.readPattern(n.pattern).events))] as const));
    const outside = (list: readonly string[], v: number) => list.filter((e) => { const f = Number(e.split(':')[0]); return !(rewritten[v] ?? []).some(([from, to]) => f >= from && f < to); });
    check(`every gate of every voice on every frame of the loop is the original's outside the ${rewrittenPatterns.length} rewritten patterns: the same tempo (${frames} frames)`, [0, 1, 2].every((v) => equal(outside(g0[v] ?? [], v), outside(g1[v] ?? [], v))));
    const same1 = rewrittenPatterns.every((x) => patternTicks(b.readPattern(x.pattern).events) === patternTicks(a.readPattern(x.pattern).events));
    check('and every rewritten pattern lasts the ticks it did', same1);
  }
  {
    const changed = Array.from({ length: INSTRUMENT_COUNT }, (_, i) => i).filter((i) => JSON.stringify(a.readInstrument(i)) !== JSON.stringify(b.readInstrument(i)));
    check(`the instruments changed are the lead's (${changed.join(', ')}) and no other`, changed.join() === c.tune.instruments.map((i) => i.instrument).sort((x, y) => x - y).join());
    check(`the lead is ${c.lead.text}`, c.lead.ok(b.readInstrument(0)));
  }
  {
    check(`${c.name}'s rooms ask for its version, the others' for theirs`, c.rooms.every((id) => WORLD.music.tuneFor?.(id)?.id === c.tune.id) && c.others.every(([room, id]) => WORLD.music.tuneFor?.(room)?.id === id));
    check('and its bytes are the version\'s', equal(WORLD.music.tuneFor?.(c.sample)?.make(original) ?? new Uint8Array(0), made));
  }
}
