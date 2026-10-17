/**
 * Renders Moley Christmas's sound to WAV files to listen to: each beeper effect (as the game plays it: the same samples,
 * `effectSamples`), and the AY music (the game's own `AyTune`): the first 20 seconds, and 20 seconds from the middle of the tune.
 * Prints each file's length, peak and loudness.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/render-sound.ts [out-dir] [sample-rate]
 */
import fs from 'node:fs';
import { AyTune } from 'c64kit';
import { wavBytes } from '../../../tools/wav';
import { effectSamples, EFFECT_IDS } from '../src/beeper';
import { musicBytes, MUSIC_SECONDS, MUSIC_STEP_HZ } from '../src/music';

const [dir = '/tmp/claude-0/-root/0f9120bc-8590-4340-8ed6-b1e28bd22f4e/scratchpad/moley-sound', rateArg = '48000'] = process.argv.slice(2);
const rate = Number(rateArg);
fs.mkdirSync(dir, { recursive: true });
const NAMES: Record<number, string> = { 0: 'death', 1: 'time-out-noise', 2: 'pickup', 3: 'energy-hit', 5: 'mechanism' };
/** The effects' loudness in the game (sound.ts `EFFECT_GAIN`), so the files sound as they balance against the music. */
const EFFECT_GAIN = 0.3;

function save(name: string, samples: Float32Array): void {
  let peak = 0;
  let sum = 0;
  for (const s of samples) { peak = Math.max(peak, Math.abs(s)); sum += s * s; }
  fs.writeFileSync(`${dir}/${name}.wav`, wavBytes(samples, rate));
  console.log(`${name}.wav: ${(samples.length / rate).toFixed(2)} s, peak ${peak.toFixed(2)}, rms ${Math.sqrt(sum / samples.length).toFixed(3)}`);
}

for (const id of EFFECT_IDS) {
  const samples = effectSamples(id, rate);
  if (samples === null) continue;
  save(`effect-${id}-${NAMES[id] ?? 'effect'}`, samples.map((s) => s * EFFECT_GAIN));
}

const tune = new AyTune(musicBytes(), MUSIC_STEP_HZ, rate);
const chunk = (seconds: number) => { const out = new Float32Array(Math.round(seconds * rate)); tune.render(out, 0, out.length); return out; };
save('music-start-20s', chunk(20));
chunk(MUSIC_SECONDS / 2 - 20); // (on to the middle of the tune)
save('music-middle-20s', chunk(20));
console.log(`the tune: ${tune.steps} steps, ${MUSIC_SECONDS.toFixed(1)} s a pass`);
