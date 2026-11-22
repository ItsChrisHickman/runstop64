/**
 * Moscow's version of Monty on the Run's tune (games/montyworld/src/music): made from the original .sid by changing the data
 * Hubbard's own driver plays. Checked:
 *
 * - the data's reading is exact (every pattern read and written back is the same bytes), and an identity version is the file;
 * - the notes moved are exactly those on the scale's degrees that move, by the amount it says, and no drum, no sound effect and
 *   no other song is touched;
 * - every note of every voice keeps its length, so the rhythm and the tempo are Hubbard's: the driver's code, its frequency table
 *   and its tempo byte are the same bytes, and the driver run on both writes the same gates on every frame of the whole loop
 *   (the break's voice aside, where the folk phrase has its own rhythm over the same 256 ticks);
 * - the instruments changed are the lead's, and the rest of the table is the original's;
 * - the break is Korobeiniki in D minor over the same length; Monty on the Run itself has no version and plays the file as it is;
 * - the world gives Moscow's rooms the Moscow version, and rooms beyond the region the original's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music.ts
 */
import fs from 'node:fs';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { MOTR } from '../../montyotr/src/motr';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { encodePattern, INSTRUMENT_COUNT, patternTicks, PATTERN_COUNT, TuneImage } from '../src/music/hubbard';
import { MOSCOW } from '../src/music/moscow';
import { GAME_SONG, noteNumber, retune, SCALE_DEGREES, type RegionTune } from '../src/music/region-tune';
import { tuneForRoom } from '../src/music/regions';
import { checkNotes } from './music-kit';

const original = Uint8Array.from(fs.readFileSync('games/montyotr/assets/monty_on_the_run.sid'));
const before = Uint8Array.from(original);
const moscow = retune(original, MOSCOW);
const a = new TuneImage(original);
const b = new TuneImage(moscow);
const equal = <T>(x: ArrayLike<T>, y: ArrayLike<T>) => x.length === y.length && Array.from(x).every((v, i) => v === y[i]);

// ---- reading the driver's data -------------------------------------------------------------------
{
  let exact = 0;
  for (let p = 0; p < PATTERN_COUNT; p++) {
    const { events, size } = a.readPattern(p);
    const raw = Array.from({ length: size }, (_, i) => a.u8(a.patternAddress(p) + i));
    if (equal(encodePattern(events), raw)) exact++;
  }
  check(`all ${PATTERN_COUNT} patterns read and written back are the same bytes (${exact})`, exact === PATTERN_COUNT);
  const identity: RegionTune = { id: 'identity', tonic: 7, shift: new Array(SCALE_DEGREES).fill(0), instruments: [], breaks: [] };
  check('a version with nothing to change is the file, byte for byte', equal(retune(original, identity), original));
  check('making a version leaves the original\'s bytes as they were', equal(original, before));
  const voices = a.voices(GAME_SONG);
  check(`the in-game song's three voices: ${voices.map((v) => v.length).join(', ')} patterns`, voices.every((v) => v.length > 0));
  check('note names: G4 is 55, Bb5 is 70, F#3 is 42', noteNumber('G4') === 55 && noteNumber('Bb5') === 70 && noteNumber('F#3') === 42);
}

// ---- what moved ----------------------------------------------------------------------------------
const song = GAME_SONG;
const used = new Set(a.voices(song).flat());
{
  // the notes: the introduction untouched, a lead note bent only where consonant with the bass (music-kit.ts), the break aside
  checkNotes({
    name: 'Moscow', tune: MOSCOW, moved: '1,4,6,9',
    scale: { text: 'lands on the minor scale\'s own note (A, Bb, C or Eb)', ok: (degree) => [2, 3, 5, 8].includes(degree) },
  }, a, b);
}

// ---- tempo and rhythm are Hubbard's --------------------------------------------------------------
{
  const totals = (img: TuneImage) => img.voices(song).map((patterns) => patterns.reduce((sum, p) => sum + patternTicks(img.readPattern(p).events), 0));
  check(`each voice lasts the same ticks (${totals(a).join(', ')}) and plays the same patterns in the same order`, equal(totals(a), totals(b)) && JSON.stringify(a.voices(song)) === JSON.stringify(b.voices(song)));
  let same = true;
  for (let addr = 0x8000; addr < 0x8566; addr++) if (a.u8(addr) !== b.u8(addr)) same = false; // the driver's code, the frequency table, its variables and the tempo ($84EC)
  for (let addr = 0x9454; addr < 0x95c0; addr++) if (a.u8(addr) !== b.u8(addr)) same = false; // the sound effects, the song entry points
  check('the driver\'s code, frequency table, variables, tempo and sound effects are the same bytes ($8000-$8565, $9454-$95BF)', same);
  const songTable = Array.from({ length: 18 }, (_, i) => a.u8(0x856c + i));
  check('the song table is the same (every song starts where it did)', equal(songTable, Array.from({ length: 18 }, (_, i) => b.u8(0x856c + i))));

  // the other songs (the death, the ending) share no pattern with the game's song, and read the same
  const others = [1, 2].flatMap((s) => a.voices(s).flat());
  const shared = others.filter((p) => used.has(p));
  check(`every pattern of the other songs (the death, the ending) reads as it was (${new Set(shared).size} shared with the game's song, none of them moved)`, others.every((p) => equal(encodePattern(a.readPattern(p).events), encodePattern(b.readPattern(p).events))));

  // the driver run on both: the gate of each voice, every frame of the loop
  const frames = (totals(a)[0] ?? 0) * 2;
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
  const g0 = gates(original), g1 = gates(moscow);
  const first = MOSCOW.breaks[0];
  // (the break is in voice 0: its frames are the pattern's, from where voice 0 reaches it)
  const voice0 = a.voices(song)[0] ?? [];
  const breakFrom = first ? 2 * voice0.slice(0, voice0.indexOf(first.pattern)).reduce((sum, p) => sum + patternTicks(a.readPattern(p).events), 0) : 0;
  const breakTo = first ? breakFrom + 2 * patternTicks(first.events) : 0;
  const outside = (list: string[]) => list.filter((e) => { const f = Number(e.split(':')[0]); return f < breakFrom || f >= breakTo; });
  check(`bass and drums: every gate on and off on every frame of the loop is the same (${g0[1]?.length} and ${g0[2]?.length} gate writes over ${frames} frames)`, equal(g0[1] ?? [], g1[1] ?? []) && equal(g0[2] ?? [], g1[2] ?? []));
  check(`the lead: the same gates on every frame outside the break (${outside(g0[0] ?? []).length} writes)`, equal(outside(g0[0] ?? []), outside(g1[0] ?? [])));
}

// ---- the instruments -----------------------------------------------------------------------------
{
  const changed = Array.from({ length: INSTRUMENT_COUNT }, (_, i) => i).filter((i) => JSON.stringify(a.readInstrument(i)) !== JSON.stringify(b.readInstrument(i)));
  const wanted = MOSCOW.instruments.map((i) => i.instrument).sort((x, y) => x - y);
  check(`the instruments changed are the lead's (${changed.join(', ')}) and no other of the ${INSTRUMENT_COUNT}`, changed.join() === wanted.join());
  const lead = b.readInstrument(0);
  check('the lead is plucked: a pulse wave, no attack, a decay to a quiet sustain, no vibrato, no pulse sweep', lead.control === 0x41 && lead.attackDecay >> 4 === 0 && (lead.attackDecay & 15) > 0 && (lead.sustainRelease >> 4) > 0 && (lead.sustainRelease >> 4) < 8 && lead.vibrato === 0 && lead.pulseSweep === 0);
  check('the waveform of every instrument is the original\'s (the drums stay noise)', Array.from({ length: INSTRUMENT_COUNT }, (_, i) => i).every((i) => a.readInstrument(i).control === b.readInstrument(i).control));
}

// ---- the break -----------------------------------------------------------------------------------
{
  const first = MOSCOW.breaks[0];
  const events = first ? b.readPattern(first.pattern).events : [];
  const was = first ? a.readPattern(first.pattern).events : [];
  check(`the break takes ${patternTicks(was)} ticks, as the pattern did (${patternTicks(events)})`, !!first && patternTicks(events) === patternTicks(was) && patternTicks(events) === 256);
  const pcs = new Set(events.map((e) => ((e.note ?? 0) + 12) % 12));
  const dMinor = [2, 4, 5, 7, 9, 10, 0];
  check('the break is in D natural minor (D E F G A Bb C), eight bars of 32 ticks (37 notes)', [...pcs].every((p) => dMinor.includes(p)) && events.length === 37);
  check('it opens Korobeiniki: A5 E5 F5 G5 F5 E5 D5, the lead\'s first instrument set on the first note', events.slice(0, 7).map((e) => e.note).join() === ['A5', 'E5', 'F5', 'G5', 'F5', 'E5', 'D5'].map(noteNumber).join() && events[0]?.prefix?.kind === 'instrument');
  check('the break pattern is in the song only once, in the lead voice, and no other voice plays it', a.voices(song).flat().filter((p) => p === first?.pattern).length === 1 && (a.voices(song)[0] ?? []).includes(first?.pattern ?? -1));
}

// ---- the game ------------------------------------------------------------------------------------
{
  const rooms = [0, 1, 2];
  check('Monty on the Run has no version of its tune: it plays the file as it is', MOTR.music.tuneFor === undefined);
  check('Do Svidaniya Monty\'s Moscow rooms ask for the Moscow version', rooms.every((id) => WORLD.music.tuneFor?.(id)?.id === 'moscow'));
  const made = WORLD.music.tuneFor?.(0)?.make(original);
  check('and its bytes are the version\'s', !!made && equal(made, moscow));
  const grid = { image: Uint8Array.from([0, 1, 0xff, 2]), cols: 2 };
  check('a room beyond the last region (column 30) or on no cell has the original', tuneForRoom({ image: new Uint8Array(20).map((_, i) => (i === 30 ? 5 : 0xff)), cols: 40 }, 5) === null && tuneForRoom(grid, 9) === null);
  check('the world\'s data is otherwise Monty on the Run\'s music (the same driver entry points)', WORLD.music.init === MOTR.music.init && WORLD.music.stop === MOTR.music.stop && WORLD.music.playSfx === MOTR.music.playSfx);
}

finish();
