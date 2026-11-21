/**
 * Monty in a costume, close up and at 4x: one row for each variant (his own pictures first, then each costume), his walk both ways, the
 * rope and the somersault (pointers $50-$73 of the bank, drawn as the engine draws them: the costume's own picture of him and the hat as
 * a sprite over it). Pictures only: nothing is checked. The same for every region (the Andes' chullo, Rio's two).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Worn } from '../src/art/costume';
import { Canvas, label } from './preview-kit';
import { drawMonty } from './room-kit';

/** The pictures shown: the walk left and right, the rope, and the somersault at four angles each way. */
const POINTERS = [0x50, 0x51, 0x54, 0x55, 0x58, 0x59, 0x5c, 0x5f, 0x62, 0x65, 0x68, 0x6b, 0x6e, 0x71] as const;

export interface HatVariant { readonly label: string; readonly worn?: Worn; readonly colour: number }

export function writeHatSheet(out: string, file: string, variants: readonly HatVariant[]) {
  fs.mkdirSync(out, { recursive: true });
  const cell = 34, rowH = 44;
  const cv = new Canvas(POINTERS.length * cell + 4, variants.length * rowH + 4);
  variants.forEach((v, r) => {
    label(cv, v.label, 2, r * rowH + 1, 11);
    POINTERS.forEach((ptr, i) => drawMonty(cv, ptr, 2 + i * cell + 4, r * rowH + 14, v.worn, v.colour));
  });
  cv.png(path.join(out, file), 4);
}
