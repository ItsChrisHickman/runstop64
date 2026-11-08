/**
 * The sound (src/sound.ts) with the audio stood in by games/shared/test/kit.ts (it remembers what it was asked): the first key unlocks and makes the tunes and the beeps; the title
 * tune plays while the title is up, again when it is over, and stops when the title goes; the effects queue one after another; the death tune plays with a death and is cut
 * where it ends. And the title tune's length against the original: the original runs its tune (`$D29D`) on the model, the frames from the picture to the tune's end are
 * compared with the samples' length (the notes' beeper timing and the rests' frames).
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/sound.ts
 */
import { AyPlayer } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { ayClock, ayLog } from '../../../games/shared/test/kit';
import { togglesLength } from 'c64kit';
import { beeperToggles } from '../src/beeper';
import { TITLE_TUNE, type Note } from '../src/data';
import { MontySound } from '../src/sound';
import { machineFrom } from './original';

const out = new AyPlayer();
const sound = new MontySound(out);
sound.title(true);
check('nothing is played before the audio is unlocked', ayLog.played.length === 0 && !sound.unlocked);
await sound.unlock();
check(`unlocked: the title and death tunes are made (${ayLog.samples.length} samples)`, sound.unlocked && ayLog.samples.length === 2);
const rate = out.sampleRate;
const titleSeconds = (ayLog.samples[0]?.length ?? 0) / rate;
ayClock.now = 1;
sound.title(true);
check('the title tune plays', ayLog.played.length === 1 && ayLog.played[0]?.at === 1);
ayClock.now = 2;
sound.title(true);
check('and is not started again while it sounds', ayLog.played.length === 1);
ayClock.now = 1 + titleSeconds + 0.1;
sound.title(true);
check(`and again when it is over (${titleSeconds.toFixed(1)} s)`, ayLog.played.length === 2);
sound.title(false);
check('stopped when the title goes', ayLog.stopped === 1);
const played = ayLog.played.length;
ayClock.now = 100;
sound.beeps([{ de: 1, hl: 0xfa }, { de: 1, hl: 0xfb }, { de: 2, hl: 0x066a }]);
const beeps = ayLog.played.slice(played);
check(`three beeps are played one after another (${beeps.map((b) => b.at.toFixed(5)).join(', ')})`, beeps.length === 3 && beeps[0]?.at === 100 && (beeps[1]?.at ?? 0) > (beeps[0]?.at ?? 0) && (beeps[2]?.at ?? 0) > (beeps[1]?.at ?? 0));
const list = [{ de: 1, hl: 0xfa }];
sound.beeps(list);
check('the list of beeps is emptied', list.length === 0);
const before = ayLog.played.length;
sound.death(true);
sound.death(true);
check('the death tune plays once', ayLog.played.length === before + 1);
const stopped = ayLog.stopped;
sound.death(false);
check('and is cut where the death ends', ayLog.stopped === stopped + 1);

// the title tune's length against the original's: the state is saved part way through the tune, so the frames from a note it plays to the tune's end ($D2D5) are compared
// with the notes' own lengths (BEEPER's timing) and the rests' frames, from the same note of the table
{
  const m = machineFrom('games/montymole/build/loading.state');
  m.cpu.iff1 = true; m.cpu.iff2 = true;
  const calls: { de: number; hl: number; frame: number }[] = [];
  let end = -1;
  m.onStep = (pc) => {
    if (pc === 0x03b5 && calls.length < 8) calls.push({ de: m.cpu.de, hl: m.cpu.hl, frame: m.frame });
    if (pc === 0xd2d5 && end < 0) end = m.frame;
  };
  for (let f = 0; f < 6000 && end < 0; f++) m.runFrame();
  // (the table's place of the first eight notes the game plays: the notes in order, the rests between left out)
  const sounding = TITLE_TUNE.map((n, i) => ({ n, i })).filter((r) => r.n.hl !== 0);
  const place = sounding.findIndex((_, k) => calls.every((c, j) => sounding[k + j]?.n.de === c.de && sounding[k + j]?.n.hl === c.hl));
  const from = place < 0 ? -1 : (sounding[place]?.i ?? -1);
  const at = calls[0];
  const frames = (notes: readonly Note[]): number => notes.reduce((t, n) => t + (n.hl === 0 ? (n.de & 255 || 256) : togglesLength(beeperToggles(n.de, n.hl)) / 69888), 0);
  const expected = from < 0 ? 0 : frames(TITLE_TUNE.slice(from));
  const measured = at === undefined ? 0 : end - at.frame;
  console.log(`   the rest of the title tune from the note it was at (record ${from}): the original takes ${measured} frames, the notes' lengths add up to ${expected.toFixed(0)}`);
  check(`the title tune's notes and rests add up to the original's time (${measured} frames, ${expected.toFixed(0)}: within 1 %)`, from >= 0 && measured > 1000 && Math.abs(measured - expected) <= measured * 0.01);
}
finish();
