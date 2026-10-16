import { HINTS } from './hints';

/**
 * The hints (part of ENHANCED): sparkles on what moves the game on and hasn't been done yet, on
 * the screen he's on (HINTS, src/hints.ts: each shows until its byte has its done value, and while
 * what it needs holds). Each is on a sprite the game draws: where the VIC-II has it, while it's
 * shown and on the screen.
 */
export function hintSpots(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const h of HINTS) {
    if (h.room !== ram[0x341c] || ram[h.until[0]] === h.until[1] || !(h.when ?? []).every(([a, v]) => ram[a] === v)) continue;
    const n = h.sprite, bit = 1 << n;
    if (!(vic[0x15] & bit)) continue;
    // the middle of the sprite (24 x 21, doubled where it's expanded), on the screen's pixels
    const w = vic[0x1d] & bit ? 48 : 24, ht = vic[0x17] & bit ? 42 : 21;
    const x = (vic[n * 2] | (vic[0x10] & bit ? 256 : 0)) - 24 + (w >> 1), y = vic[n * 2 + 1] - 50 + (ht >> 1);
    if (x >= 0 && x < 320 && y >= 0 && y < 200) out.push({ x, y });
  }
  return out;
}
