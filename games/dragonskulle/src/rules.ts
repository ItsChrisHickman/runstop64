/**
 * Rules of the game that nothing in it explains, as the code keeps them (re/README.md, "Rules the game
 * never explains"; proved by re/rules/check.ts): what counts towards a bridge, a dragon, the cloak. Read by
 * the hints (src/hints.ts), the pause screen's side panel (src/map.ts) and the cloak's icon (src/main.ts).
 */

/**
 * A river screen's bridge: its tiles ($62) are floor only while $72C0 is 0, and the setup of the screen
 * sets it to 1. Stones thrown at the wizard walking along the far bank count in `counter` (one a kill, from either
 * side of the screen); at `need` the count becomes $FF, the creatures go and $72C0 is cleared. The block at $6000
 * serves rooms 3 and 4 (room 4 is two screens, the bridge at 13,6 and the plain river at 5,6: kills in both count),
 * the one at $CD50 room 5.
 */
export interface Bridge { readonly room: number; readonly counter: number; readonly need: number }
export const BRIDGES: readonly Bridge[] = [
  { room: 3, counter: 0x343a, need: 10 },
  { room: 4, counter: 0x343b, need: 15 },
  { room: 5, counter: 0x343c, need: 20 },
];
/** The count a finished bridge holds. */
export const BRIDGE_OPEN = 0xff;

/** How many kills a bridge still wants in this room, or null (not a river screen, or its bridge is open). */
export function wizardsLeft(ram: Uint8Array): number | null {
  const b = BRIDGES.find((x) => x.room === ram[0x341c]);
  if (!b || ram[b.counter] === BRIDGE_OPEN) return null;
  return Math.max(0, b.need - ram[b.counter]);
}

/**
 * A dragon's screen (block $D870, rooms 6-9; one dragon each, its own flag kept for good): ten stones thrown
 * facing up on its head count in $676F (reset on each coming in); the tenth starts its death, which ends 240
 * frames later by setting the flag and opening the way up ($3441).
 */
export interface DragonRoom { readonly room: number; readonly flag: number }
export const DRAGONS: readonly DragonRoom[] = [
  { room: 6, flag: 0x72b0 }, { room: 7, flag: 0x72b1 }, { room: 8, flag: 0x72b2 }, { room: 9, flag: 0x72b3 },
];
export const DRAGON_HITS = 10, HITS = 0x676f;

/** The hits a living dragon here still wants (counting this visit's), or null (not a dragon's screen, or it is dead). */
export function hitsLeft(ram: Uint8Array): number | null {
  const d = DRAGONS.find((x) => x.room === ram[0x341c]);
  if (!d || ram[d.flag] === 1) return null;
  return Math.max(0, DRAGON_HITS - ram[HITS]);
}

/**
 * The cloak: $3417 is 1 while it is on (2 for its last frame), $124B:$124A count its frames up to 3 x 256
 * (he is drawn hi-res and every block's hurt checks are skipped, so nothing hurts him; no stones while it is on).
 * It is gone at the end: $3430 and $3417 are cleared.
 */
export const CLOAK_FRAMES = 3 * 256;
/** A PAL frame's rate: the 985,248 Hz clock over a frame's 19,656 cycles, 50.125 a second. */
export const FRAMES_A_SECOND = 985248 / 19656;
/** The fraction of the cloak still to run (1 just put on, 0 at its end), or null while it is not on. */
export function cloakLeft(ram: Uint8Array): number | null {
  const on = ram[0x3417];
  if (on !== 1 && on !== 2) return null;
  return on === 2 ? 0 : Math.max(0, 1 - (ram[0x124b] * 256 + ram[0x124a]) / CLOAK_FRAMES);
}
