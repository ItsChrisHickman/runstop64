import { cellMessageAt } from './cells';
import type { Game } from './game';
import { stopMessage } from './panel';
import { V } from './vars';

/**
 * New Game+ (added for runstop64: Chris, 2026-10-15): after the ending, carrying on starts again on
 * the first screen in the armour, all four parts fitted, its energy never running down, the
 * radiation gone (out of the armour it never hurts, and the interlock lets Tal out anywhere), the
 * map as it was. The panel's message window says NEW GAME+ whenever no other message is going by,
 * and its scroller tells what New Game+ is on starting. Landing on the pedestal with the Implosion Mine ends the game again, and carrying
 * on from that starts New Game+ again.
 *
 * It's kept in memory the original's code used ($8100 on: the port doesn't need it, as the new
 * messages at $8000, game.ts `ourKeys`), so a save (a machine snapshot) carries it: a mark, then
 * the panel message. Those bytes are 0 in the game's image.
 */
const MARK = 0x8100, MARK_BYTES = [0x4e, 0x2b]; // ("N+")
const TEXT = 0x8102;
/** The message's number (the original's run to $15), and its words; the scroller's end ($01 $00) after spaces to scroll them out. */
export const PLUS_MESSAGE = 0x16;
const WORDS = 'NEW GAME+ THE OPPRESSORS ARE DEFEATED THE ARMOUR IS YOURS UNLIMITED ENERGY NO RADIATION EXPLORE FREELY           ';
/** The panel character drawn as '+' (one nothing in the panel uses), and its pixels. */
export const PLUS_CHAR = 0xe7;
const PLUS_PIXELS = [0x00, 0x18, 0x18, 0x7e, 0x7e, 0x18, 0x18, 0x00];
/** What the panel's message window shows in New Game+ between messages (its 11 letters). */
const LABEL = ' NEW GAME+ ';
const WINDOW = 0x77a8; // (characters $F5-$FF, panel.ts)

/** Is this game New Game+? */
export const isPlus = (ram: Uint8Array) => ram[MARK] === MARK_BYTES[0] && ram[MARK + 1] === MARK_BYTES[1];

/** Where message n's words are: the original's table, or New Game+'s. */
export function messageAt(g: Game, n: number) {
  if ((n & 0x7f) === PLUS_MESSAGE) return TEXT;
  const cell = cellMessageAt(n);
  return cell >= 0 ? cell : g.word(0xc1aa + ((n << 1) & 0xff));
}

/** The mark, the message and the '+' character in memory (on starting New Game+, and on every load of one). */
function write(ram: Uint8Array) {
  ram.set(MARK_BYTES, MARK);
  const words = [...WORDS].map((c) => c.charCodeAt(0));
  ram.set([...words, 1, 0], TEXT);
  ram.set(PLUS_PIXELS, 0x7000 + PLUS_CHAR * 8);
}

/**
 * From the moment the Implosion Mine was set off (the save made then, main.ts `repairSave`): New
 * Game+, on the first screen. The mine not set off (its countdown and message gone), Tal's life
 * and rejuvenations full, the armour's energy full; then taken to the first screen (the first of
 * the two the original starts in) as travel takes him, the game's own way, arriving in the air.
 */
export function startPlus(g: Game) {
  const { ram } = g;
  write(ram);
  ram[0xb1] = 0; ram[V.timer69] = 0;
  const queued = [...ram.subarray(0x066a, 0x0672)].filter((n) => (n & 0x7f) !== 0x13);
  ram.fill(0, 0x066a, 0x0672); ram.set(queued, 0x066a);
  if ((ram[V.message] & 0x7f) === 0x13) stopMessage(g);
  ram[V.life] = 0x1f; ram[V.deaths] = 0; ram[V.gameOver] = 0;
  ram[V.suitEnergy] = 0x20;
  g.travelTo = { room: ram[0xc5db], x: ram[0xc5dd], y: ram[0xc5df] - 0x18, high: 0 };
  g.say(0x80 | PLUS_MESSAGE);
}

/** A New Game+ save loaded: its mark, message and character as this version has them. */
export function loadPlus(ram: Uint8Array) {
  if (isPlus(ram)) write(ram);
}

/**
 * Each frame of New Game+: the armour's energy full; and while no message is going by, the panel's
 * message window (its scroller's letters) says NEW GAME+, in the panel's own letters. (The
 * radiation is nothing in every room: setup.ts `roomCharAnims`.)
 */
export function plusFrame(g: Game) {
  const { ram } = g;
  if (!isPlus(ram)) return;
  ram[V.suitEnergy] = 0x20;
  if (!(ram[V.panelOn] & 0x80) || ram[V.message] & 0x80 || !g.playing) return;
  for (let i = 0; i < LABEL.length; i++) {
    const c = LABEL.charCodeAt(i), code = c === 0x2b ? PLUS_CHAR : c === 0x20 ? 0 : c + 0x5b;
    ram.copyWithin(WINDOW + i * 8, 0x7000 + code * 8, 0x7008 + code * 8);
  }
}
