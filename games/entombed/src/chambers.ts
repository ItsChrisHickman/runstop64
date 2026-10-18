import * as engine from './gen/engine';
import { entombedMap, maze } from './map';

/**
 * Going into a chamber of the tomb the game's own way, from anywhere (the ending's places: games/entombed/src/ending.ts; the way
 * each was found is `re/hints/chambers.ts`, which tries every place on every floor against the game's own door code).
 *
 * A chamber is entered by a door from the corridors (the game's $26EC: he is walking up into it, $2365 = 3, so the next frame does
 * not take the exit he is standing on; $10D2 picks the chamber by the floor and the place) or down the stairs from the floor above
 * ($2719 takes the floor down one and $1496 puts him at the foot of the stairs and picks the chamber): the chambers the stairs lead
 * to (3, 5, 7, 12, 15, 17) have no door on any corridor.
 */
type Entry = { floor: number; x: number; y: number } | { stairsFrom: number };

const ENTRIES: Record<number, Entry> = {
  1: { floor: 1, x: 3, y: 0 }, 2: { floor: 1, x: 4, y: 1 }, 3: { stairsFrom: 2 }, 4: { floor: 2, x: 7, y: 0 }, 5: { stairsFrom: 5 },
  6: { floor: 2, x: 5, y: 4 }, 7: { stairsFrom: 6 }, 8: { floor: 6, x: 13, y: 0 }, 9: { floor: 4, x: 8, y: 0 }, 10: { floor: 3, x: 0, y: 1 },
  11: { floor: 4, x: 5, y: 2 }, 12: { stairsFrom: 7 }, 13: { floor: 4, x: 5, y: 3 }, 14: { floor: 7, x: 5, y: 0 }, 15: { stairsFrom: 4 },
  16: { floor: 5, x: 0, y: 2 }, 17: { stairsFrom: 3 }, 18: { floor: 6, x: 3, y: 0 }, 19: { floor: 5, x: 0, y: 0 }, 20: { floor: 6, x: 0, y: 0 },
  21: { floor: 6, x: 5, y: 0 }, 22: { floor: 6, x: 9, y: 0 }, 23: { floor: 5, x: 5, y: 0 }, 24: { floor: 7, x: 5, y: 1 }, 25: { floor: 7, x: 1, y: 0 },
};

/** The corridors' block's first jump: at $6000 while he is in the corridors (else in a chamber). */
const CORRIDORS = 0x60f8;
const inCorridor = (ram: Uint8Array) => (ram[0x6001] | (ram[0x6002] << 8)) === CORRIDORS;

/** A junction on a floor to put him at first (the first in reading order). */
function junctionOn(ram: Uint8Array, floor: number): string | null {
  const M = maze(ram, floor);
  for (let y = 0; y < M.F.h; y++) for (let x = 0; x < M.F.w; x++) if (M.junction(x, y)) return `${floor}:${x},${y}`;
  return null;
}

/** Put him in the corridors on a floor (the map's own way: out of the chamber he is in, as the game leaves it). */
export function enterCorridor(ram: Uint8Array, floor: number): boolean {
  const at = junctionOn(ram, floor);
  if (at === null) return false;
  entombedMap.go(at, ram, entombedMap.found.empty());
  return inCorridor(ram) && ram[0x37f7] === floor;
}

/** Put him in chamber `n`, a new game's memory made ready to go in (call it at the main loop's wait). False if the game did not take him there. */
export function enterChamber(ram: Uint8Array, n: number): boolean {
  const e = ENTRIES[n];
  if (!e) return false;
  if (!enterCorridor(ram, 'stairsFrom' in e ? e.stairsFrom : e.floor)) return false;
  ram[0x3231] = 1;
  engine.r_c1a1(); // (screen off)
  if ('stairsFrom' in e) {
    ram[0x37f7]--;
    engine.r_1496();
  } else {
    ram[0x217e] = e.x; ram[0x217f] = e.y; ram[0x2365] = 3;
    engine.r_10d2();
  }
  engine.r_c1c9(); // (screen on)
  return !inCorridor(ram) && ram[0x321c] === n;
}
