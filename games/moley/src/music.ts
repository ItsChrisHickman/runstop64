/**
 * The 128K music as the game's player made it: the AY register stream (data/music-data.ts, recorded from the original on the 128K
 * model by re/record-music.ts, delta-coded) and the rate at which its steps come. One tune, Ben Daglish's, about 6 minutes; the
 * stream is one whole pass, ending in the step that starts the tune again, and loops from its start.
 */
import { FRAME_HZ_128K } from 'c64kit';
import { MUSIC_BASE64, MUSIC_STEPS } from './data/music-data';

/** The stream's bytes (`packAyStream`, c64kit). */
export function musicBytes(): Uint8Array {
  const binary = atob(MUSIC_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The player runs on every second interrupt of the 128K's 50.02 Hz: 25.01 steps a second. */
export const MUSIC_STEP_HZ = FRAME_HZ_128K / 2;

export { MUSIC_STEPS };
/** How long one pass of the tune lasts, in seconds. */
export const MUSIC_SECONDS = MUSIC_STEPS / MUSIC_STEP_HZ;
