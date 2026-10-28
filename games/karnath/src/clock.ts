/**
 * The castle's clock (ENHANCED: no midnight). The game's clock ($1548, a game minute every 2,880 frames) is the status
 * panel's own digits, 06:00 PM at a new game, and at 12 ($07C6 reaches the digit 2, checked at $15B6) $6FFD is 1: he
 * is lost, about 5.8 hours of play in. Saves keep the clock, so a game played on over days gets there, and a save taken
 * at the last minute loses on every continue. In ENHANCED the clock stops at 11:59 PM instead: at the hook just before
 * the check, an hour of 12 is put back to 11:59 with the minute's count begun again, so midnight never comes and a save
 * already past it plays on. A digit is its screen code: 1-9 are $31-$39, 0 is $3A; $07C7 is the colon.
 */

/** The hook where the clock has counted its minute and midnight is checked next (re/engine.json). */
export const MIDNIGHT_CHECK = 0x15b6;

/** 11:59 on the panel: the hour's digits, the colon, the minutes' ($07C5-$07C9). */
const LAST_MINUTE = [0x31, 0x31, 0x3b, 0x35, 0x39];

/** At `MIDNIGHT_CHECK`, in ENHANCED: an hour of 12 back to 11:59 (and the frames of its minute from none), so he is not lost. */
export function holdBeforeMidnight(ram: Uint8Array) {
  if (ram[0x07c5] !== 0x31 || ram[0x07c6] !== 0x32) return;
  ram.set(LAST_MINUTE, 0x07c5);
  ram[0x3236] = 0; ram[0x3237] = 0;
}
