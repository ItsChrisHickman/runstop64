import { rom } from './data';
import type { Game } from './game';
import * as Screens from './screens';
import { typeCode } from './specials';

/**
 * The high score table, the "core of heroes" ($3534-$35E4): seven entries
 * (initials, score, adventure score), kept as the original keeps them: the
 * lines of its table screen ($3DB4), 25 bytes each from $3DC6.
 */
const FROM = 0x3db4, TO = 0x3e76;
const FIRST = 0x3dc6 - FROM; // the first entry's line (colour, column, row, "1. ", initials...)
const STRIDE = 0x19;

/** The table, fresh (as the game has it at the start). */
export const freshTable = () => Uint8Array.from({ length: TO - FROM }, (_, i) => rom(FROM + i));

/**
 * $3534: where a score (its first five digits, as ASCII) would go in the
 * table: the entry's offset, or -1 if it's not high enough.
 */
export function place(table: Uint8Array, score: string): number {
  let x = 0;
  for (let n = 7; n > 0; n--, x += STRIDE) {
    for (let i = 0; i < 5; i++) {
      const d = (table[FIRST + 0x0c + x + i] - score.charCodeAt(i)) & 0xff;
      if (d & 0x80) return x; // (lower than the new score)
      if (d) break; // (higher: the next entry)
      if (i === 4) return x; // (equal: the new one goes above)
    }
  }
  return -1;
}

/**
 * $3574-$35B1: a hero: the screen asking for initials (typed, five letters),
 * the entries below moved down, the new one put in. As in the original, only
 * the first five digits of the score are copied (the sixth stays the old
 * entry's), and the adventure score's line ending with them.
 */
export function* enter(g: Game, table: Uint8Array, at: number, score: string, adventure: string): Generator<void, void, void> {
  Screens.clear(g);
  g.sound.silence();
  Screens.framed(g, 0x3cbb, 0x40);
  const initials = yield* typeCode(g, rom(0x3d22), rom(0x3d23), true);
  insert(table, at, initials, score, adventure);
}

/** $359A-$35CB: the entries below `at` each one down, and the new one in. */
export function insert(table: Uint8Array, at: number, initials: number[], score: string, adventure: string) {
  // from the space before the initials: 20 bytes each
  const below = 7 - at / STRIDE;
  let x = 5 * STRIDE;
  for (let k = below - 1; k > 0; k--) {
    for (let y = 0; y < 0x14; y++) table[FIRST + x + 5 + STRIDE + y] = table[FIRST + x + 5 + y];
    x -= STRIDE;
  }
  for (let y = 0; y < 5; y++) {
    table[FIRST + at + 6 + y] = initials[y];
    table[FIRST + at + 0x14 + y] = (adventure + '\0').charCodeAt(y) & 0xff;
    table[FIRST + at + 0x0c + y] = score.charCodeAt(y);
  }
}

/** $35CD: the table on its screen. */
export function show(g: Game, table: Uint8Array) {
  Screens.clear(g);
  g.colour = 0x50;
  let at = 0;
  for (;;) {
    const colour = table[at];
    if (!colour) break;
    let text = '';
    let p = at + 3;
    while (table[p]) text += String.fromCharCode(table[p++]);
    Screens.printText(g, colour, table[at + 1], table[at + 2], text);
    at = p + 1;
  }
  Screens.framed(g, 0, 0x50);
}
