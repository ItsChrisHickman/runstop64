/**
 * The sound of Auf Wiedersehen Monty: the original's own music and effect drivers, played from a .sid built by
 * tools/extract-awm-sid.mjs (kept out of git, like all of the original's code and data: games/awm/build/).
 * This module is the entry points of that file and the numbers the game asks for.
 */

/** The .sid's songs (1-based): 1-13 are the tunes 0-12 of the game's own player ($E409), 14 the game with its effects. */
export const SOUND = {
  tunes: 13,
  effectsSong: 14,
  /** The glue's `sfx` entry (A = a sound number $40-$4C, the game's $85A6) and the music's stop ($E40C). */
  request: 0xcc21,
  stop: 0xe40c,
  /** The music driver's tune ($E409, A = the tune) and the effect driver's silence for a voice ($C7E3, A = the voice). */
  tune: 0xe409,
  silence: 0xc7e3,
  /** Every sound number the game's effect driver has (the voice table of $85BD: 13 of them). */
  effects: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c],
} as const;

/** $85EA: the tune of each room (0: the one playing goes on). */
const ROOM_TUNES: readonly number[] = [
  12, 0, 12, 0, 0, 11, 3, 4, 4, 2, 0, 3, 3, 4, 4, 2, 2, 2, 2, 0, 3, 5, 4, 2, 2, 0, 0, 5, 5, 5, 2, 2, 2, 9, 9, 9, 5, 4, 10, 10, 10, 10, 2, 2, 0, 9, 9, 9, 9,
  4, 10, 10, 10, 10, 9, 9, 4, 4, 10, 10, 10, 9, 9, 7, 7, 10, 10, 10, 9, 9, 8, 8, 1, 9, 9, 8, 8, 1, 8, 0,
];

/** The room the title is drawn as ($63): it has no tune. */
export const TITLE_ROOM = 0x63;

/** $85CD: the tune a room starts, if the sound flag $4066 is set and it isn't the one playing; null for none. */
export function tuneForRoom(room: number, flag: number, playing: number): number | null {
  if (flag === 0 || room === TITLE_ROOM) return null;
  const tune = ROOM_TUNES[room] ?? 0;
  return tune === 0 || tune === playing ? null : tune;
}
