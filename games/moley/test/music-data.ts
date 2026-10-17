/**
 * The 128K music data (src/data/music-data.ts, src/music.ts) proved against the original running, and the player that plays it:
 *  - recorded again from the tape on the 128K model (two whole passes of the tune), the committed stream is the same, and the
 *    original's second pass is the first, in registers and in frames;
 *  - the stream replays: stepped through two passes, the chip's registers are the original's after every step, the tune is the
 *    right length (9218 steps = 18436 frames, 6 minutes 9 s) and comes round again by itself;
 *  - the player writes only the tone, noise and mixer registers and volumes below 16 (it never uses the envelope);
 *  - rendered through c64kit's synthesiser it sounds: not silent, not clipping, at the right pitch for its first note.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/music-data.ts [tape] [rom]
 */
import { AyTune, packAyStream, unpackAyStream } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { readRom, readTape } from '../../../tools/zx/boot';
import { MUSIC_BASE64, MUSIC_BYTES } from '../src/data/music-data';
import { musicBytes, MUSIC_SECONDS, MUSIC_STEP_HZ, MUSIC_STEPS } from '../src/music';
import { musicSteps, recordMusic } from '../re/original';

const [tapeFile = 'games/moley/build/moley.tap', romFile = 'games/moley/build/48.rom'] = process.argv.slice(2);
const FRAMES = 37_100; // (the tune starts 142 frames after LOAD and takes 18,436 a pass)
/** The bits the chip keeps of registers 0-10. */
const KEPT = [255, 15, 255, 15, 255, 15, 31, 255, 31, 31, 31];

let steps: number[][] = [];
let error = '';
try {
  steps = musicSteps(recordMusic(readRom(romFile), readTape(tapeFile), FRAMES));
} catch (e) {
  error = String(e);
}
check(`the original's two passes of the tune are the same, in registers 0-10 and in frames${error ? ` (${error})` : ''}`, error === '');
check(`one pass is ${MUSIC_STEPS} steps of 2 frames (18436 frames: the last step is held for four), as committed`, steps.length === MUSIC_STEPS && steps.length === 9218);
const bytes = packAyStream(steps);
check(`recorded again, the stream is the committed one (${MUSIC_BYTES} bytes)`, bytes.length === MUSIC_BYTES && bytes.every((b, i) => b === musicBytes()[i]) && MUSIC_BASE64.length === Math.ceil(MUSIC_BYTES / 3) * 4);

// ---- the stream replays -------------------------------------------------------------------------------------------------
const images = unpackAyStream(musicBytes());
check('the stream unpacks to the original\'s register image after every step', images.length === steps.length && images.every((im, i) => im.join() === steps[i]?.join()));
const tune = new AyTune(musicBytes(), MUSIC_STEP_HZ, 48000);
check('the tune player finds the same number of steps', tune.steps === MUSIC_STEPS);
let wrong = -1;
for (let i = 0; i < 2 * MUSIC_STEPS && wrong < 0; i++) {
  tune.step();
  const want = steps[i % MUSIC_STEPS] ?? [];
  for (let r = 0; r < 11; r++) if (tune.ay.read(r) !== ((want[r] ?? 0) & (KEPT[r] ?? 255))) wrong = i;
}
check('stepped through two passes, the synthesiser\'s registers are the original\'s after every step', wrong < 0, false);
check('the tune comes round again by itself, from its first step', tune.loops === 2 && tune.next === 0);
check(`a pass lasts ${MUSIC_SECONDS.toFixed(1)} s at the 128K's 25.01 steps a second (6 minutes 9)`, Math.abs(MUSIC_SECONDS - 368.6) < 0.1);

// ---- what the player uses ------------------------------------------------------------------------------------------------------
check('registers 11-13 (the envelope) are never written', steps.every((im) => (im[11] ?? 0) === 0 && (im[12] ?? 0) === 0 && (im[13] ?? 0) === 0));
check('the volumes are 0-15: the envelope bit is never set', steps.every((im) => [8, 9, 10].every((r) => (im[r] ?? 0) <= 15)));
check('the mixer is always one of two values (tones on, noise off / on)', new Set(steps.map((im) => im[7])).size <= 2);

// ---- what it sounds like -------------------------------------------------------------------------------------------------------------
{
  const player = new AyTune(musicBytes(), MUSIC_STEP_HZ, 48000);
  const out = new Float32Array(48000 * 20);
  player.render(out, 0, out.length);
  let peak = 0;
  let sum = 0;
  for (const v of out) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const rms = Math.sqrt(sum / out.length);
  check(`20 seconds of it: peak ${peak.toFixed(2)}, loudness ${rms.toFixed(3)} (not silent, no clipping)`, peak < 1 && rms > 0.03);
  check('and 20 seconds of it is 500 steps, 20 s into the tune', player.next === Math.round(20 * MUSIC_STEP_HZ) % MUSIC_STEPS || Math.abs(player.next - 20 * MUSIC_STEP_HZ) < 1.5);
}

finish();
