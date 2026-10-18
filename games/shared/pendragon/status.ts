/**
 * The lettering of the Pendragon games' status panel (Karnath, Entombed, Blackwyche: one engine): the
 * messages on its line are drawn from the game's table with 64 taken off each character, so letters
 * are screen codes 1-26; the digits 1-9 are $31-$39, 0 is $3A, and a colon $3B. It has no full stop,
 * comma or apostrophe: what is said in it is written without them (narrate.ts cleans a text to this).
 */
export function pendragonCode(ch: string): number | null {
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 64;
  if (ch >= '1' && ch <= '9') return ch.charCodeAt(0);
  if (ch === '0') return 0x3a;
  if (ch === ':') return 0x3b;
  return null;
}
