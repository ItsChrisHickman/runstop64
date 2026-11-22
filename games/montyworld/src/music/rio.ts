import type { RegionTune } from './region-tune';

/**
 * Rio's version of Monty on the Run's tune: a samba feel by instruments, and the minor tune lifted to its major, the carnival's lift. Hubbard's tune is in G minor with chromatic colour; here every note that is not in
 * G major moves up a semitone onto one that is (the minor third Bb up to B, the minor sixth Eb up to E, the minor seventh F up to F#, the flat second G# up to A, the tritone C# up to D); the notes of G major stay. The tempo,
 * the melody's steps and every duration are Hubbard's. The lead is a cavaquinho (a bright narrow pulse with a short decay and a quick vibrato, jangling), the runs an agogo's bell (a short high tick), the stabs, drums and bass
 * Hubbard's. No tune is quoted (the Girl from Ipanema is not in the public domain).
 */

/** Semitones above G: the minor ones up a semitone. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, +1, 0] as const;

const CAVAQUINHO = { pulseWidth: 0x0300, control: 0x41, attackDecay: 0x05, sustainRelease: 0x54, vibrato: 3, pulseSweep: 0 } as const;
const AGOGO = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x03, sustainRelease: 0x21, vibrato: 0, pulseSweep: 0 } as const;

export const RIO: RegionTune = {
  id: 'rio',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    { instrument: 0, set: CAVAQUINHO }, { instrument: 15, set: CAVAQUINHO },
    { instrument: 4, set: AGOGO }, { instrument: 5, set: AGOGO },
  ],
  breaks: [],
};
