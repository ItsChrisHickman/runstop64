/**
 * A gate's picture of what it wants (LESSONS.md: "A gate shows what it wants before he has it"): the key item's own drawing in 2 x 2 characters, placed over the gate as a decoration and blinking
 * (a `charAnims` cycle: shown three steps, gone one) until he uses the item there and the gate's room effect clears it. The one owner of the picture and its blink: every region's gates (Japan's
 * shutter, pond and door; the Andes' llama, captain and tangle) take them from here, drawn from the same rows as the item's sprite.
 */
import { characters } from './pixels';
import type { Colour, NewDecor } from './types';

/** The gate's picture: the item's 16 x 16 rows as a 2 x 2 decoration in one ink. */
export const wantedPicture = (name: string, rows: readonly string[], ink: Colour): NewDecor => ({ w: 2, h: 2, chr: characters(name, rows, 2, 2), colour: ink });

/** Its blink, a frame a step: shown three steps, gone one (the characters emptied). */
export function wantedBlink(name: string, rows: readonly string[]): readonly Uint8Array[] {
  const on = characters(name, rows, 2, 2);
  return [on, on, on, new Uint8Array(on.length)];
}
