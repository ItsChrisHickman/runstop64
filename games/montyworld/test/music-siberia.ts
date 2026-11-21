/**
 * Siberia's version of Monty on the Run's tune (games/montyworld/src/music/siberia.ts), made from the original .sid by a scale and
 * instruments only: the notes moved are exactly the degrees the scale names, every note keeps its length (so the tempo and rhythm are
 * Hubbard's: the driver, tempo byte and every gate on every frame of the loop are the original's), the instruments changed are the lead's
 * and it is piped (a triangle), the other regions' rooms keep their own version, and Siberia's rooms ask for this one.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-siberia.ts
 */
import fs from 'node:fs';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { FREQUENCY_NOTES, INSTRUMENT_COUNT, patternTicks, playedSteps, TuneImage } from '../src/music/hubbard';
import { bend, GAME_SONG, retune } from '../src/music/region-tune';
import { SIBERIA } from '../src/music/siberia';
import { SIB } from '../src/siberia';

const original = Uint8Array.from(fs.readFileSync('games/montyotr/assets/monty_on_the_run.sid'));
const made = retune(original, SIBERIA);
const a = new TuneImage(original), b = new TuneImage(made);
const equal = <T>(x: ArrayLike<T>, y: ArrayLike<T>) => x.length === y.length && Array.from(x).every((v, i) => v === y[i]);
const song = GAME_SONG;
const used = new Set(a.voices(song).flat());

{
  const moved = SIBERIA.shift.map((s, i) => (s === 0 ? -1 : i)).filter((i) => i >= 0).join();
  check('Siberia\'s scale moves four degrees of G minor to G Dorian (G#, B, C# and the minor sixth), the rest stay', moved === '1,4,6,8');
  const pitched = new Map<string, boolean>();
  for (const { step } of playedSteps(a, song)) pitched.set(`${step.pattern}:${step.index}`, !a.isPercussion(step.instrument));
  let notes = 0, wrong = 0, lengths = 0, changed = 0;
  for (const p of used) {
    const was = a.readPattern(p).events, now = b.readPattern(p).events;
    was.forEach((w, i) => {
      const n = now[i];
      if (!n) { lengths++; return; }
      if (w.ticks !== n.ticks || w.hold !== n.hold || (w.note === null) !== (n.note === null)) lengths++;
      if (w.note === null || n.note === null) return;
      notes++;
      const expect = pitched.get(`${p}:${i}`) === true && w.note < FREQUENCY_NOTES ? bend(w.note, SIBERIA) : w.note;
      if (n.note !== expect) wrong++;
      if (n.note !== w.note) changed++;
    });
  }
  check(`${notes} notes: ${changed} moved, every one by the scale (${wrong} wrong), none changed in length, hold or rest (${lengths})`, changed > 0 && wrong === 0 && lengths === 0);
  const sixths = Array.from(used).flatMap((p) => b.readPattern(p).events.filter((e, i) => e.note !== null && e.note < FREQUENCY_NOTES && pitched.get(`${p}:${i}`) === true && (((e.note - 7) % 12) + 12) % 12 === 8));
  check('in the version no note is left on the minor sixth (Dorian: the sixth is the major one)', sixths.length === 0);
}
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
  check(`every gate of every voice on every frame of the loop is the original's: the same tempo (${frames} frames)`, [0, 1, 2].every((v) => equal(g0[v] ?? [], g1[v] ?? [])));
}
{
  const changed = Array.from({ length: INSTRUMENT_COUNT }, (_, i) => i).filter((i) => JSON.stringify(a.readInstrument(i)) !== JSON.stringify(b.readInstrument(i)));
  check(`the instruments changed are the lead's (${changed.join(', ')}) and no other`, changed.join() === SIBERIA.instruments.map((i) => i.instrument).sort((x, y) => x - y).join());
  const lead = b.readInstrument(0);
  check('the lead is a pipe: a triangle wave with a soft attack, a held sustain, no vibrato', lead.control === 0x11 && lead.attackDecay >> 4 > 0 && lead.sustainRelease >> 4 >= 8 && lead.vibrato === 0);
}
{
  check('Siberia\'s rooms ask for its version, Moscow\'s for Moscow\'s', [SIB.gravy, SIB.yeti, SIB.border].every((id) => WORLD.music.tuneFor?.(id)?.id === 'siberia') && WORLD.music.tuneFor?.(0)?.id === 'moscow');
  check('and its bytes are the version\'s', equal(WORLD.music.tuneFor?.(SIB.mine)?.make(original) ?? new Uint8Array(0), made));
}
finish();
