import type { Game } from './game';
import { V } from './vars';

/**
 * ENHANCED: Tal carries the recharge cells he picks up and uses them at will (added for runstop64,
 * Chris, 2026-10-15). The original carries one ($A7 bit 7; "ALREADY CARRYING RECHARGE CELL"), used
 * up the moment he is in the armour, so an armour out of energy strands him unless he happens to
 * hold one. Here every cell he crouches over is his (each once: the game marks the room's as taken
 * as ever), the count is kept, and C in the armour fills it from one; stepping into the armour
 * with a cell fills it too, as the original does. The original's $A7 is never set in ENHANCED, so
 * its own use of it never fires.
 *
 * The count is kept in memory the original's code used ($81C0: the port doesn't need it, as the
 * new messages at $8000 and plus.ts's at $8100), so a save (a machine snapshot) carries it. It is 0
 * in the game's image, and a new game clears it (game.ts `init`).
 */
export const CELLS = 0x81c0;
/** The armour's energy is full at this ($1F; New Game+ holds it a little above). */
const FULL = 0x1f;
/** More than the game has anywhere; the count never wraps. */
const MOST = 99;

/** The message the panel scrolls on picking one up (a number after the original's run to $15 and plus.ts's $16), and its words. */
const CELL_MESSAGE = 0x17;
const TEXT = 0x81c8;
const WORDS = 'RECHARGE CELL STORED           ';

export const cellCount = (ram: Uint8Array) => ram[CELLS];

/** The message's words in memory (a new game, and every load, so a save from before has them). */
export function writeCells(ram: Uint8Array) {
  ram.set([...WORDS].map((c) => c.charCodeAt(0)), TEXT);
  ram[TEXT + WORDS.length] = 1; ram[TEXT + WORDS.length + 1] = 0;
}

/** Where the cell message's words are, if `n` is it. */
export const cellMessageAt = (n: number) => ((n & 0x7f) === CELL_MESSAGE ? TEXT : -1);

/** ENHANCED: a cell picked up (collisions.ts, in place of the original's one). */
export function storeCell(g: Game) {
  const { ram } = g;
  if (ram[CELLS] < MOST) ram[CELLS]++;
  g.say(0x80 | CELL_MESSAGE);
}

/** Fill the armour from a cell if it isn't full and he has one. Returns whether it did. */
export function refuel(g: Game) {
  const { ram } = g;
  if (!ram[CELLS] || ram[V.suitEnergy] >= FULL || ram[0x92] < 0x20) return false; // ($92: the first power-up, fades.ts, not done yet)
  ram[CELLS]--;
  ram[V.suitEnergy] = FULL;
  ram[V.request + 1] = 0x93; // (the original's sound for it)
  return true;
}

/** Each frame: the key (main.ts sets `cellAsked`), in the armour and playing. */
export function cellsFrame(g: Game) {
  const asked = g.cellAsked;
  g.cellAsked = false;
  if (!asked || !g.enhanced || !g.playing || !(g.ram[V.inSuit] & 0x80) || !(g.ram[V.panelOn] & 0x80)) return;
  refuel(g);
}
