/**
 * Monty in every costume, at 1x and 4x (all 36 of his pictures: the walk, the rope, the somersault), beside his plain pictures. Pictures only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/costume-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { CHULLO_COLOUR, chulloWorn } from '../src/art/andes-hat';
import { COUNT, FIRST } from '../src/art/costume';
import { HAT_COLOUR, RICE_HAT_COLOUR, riceHatWorn, ushankaWorn } from '../src/art/hat';
import { HOOD_COLOUR, hoodWorn } from '../src/art/japan-hood';
import { LEI_COLOUR, leiWorn } from '../src/art/pacific-lei';
import { headdressWorn, RIO_HAT_COLOUR } from '../src/art/rio-hat';
import type { HatVariant } from './hat-sheet-kit';
import { Canvas, label } from './preview-kit';
import { drawMonty } from './room-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: costume-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const VARIANTS: readonly HatVariant[] = [
  { label: 'PLAIN', colour: 1 },
  { label: 'USHANKA', worn: ushankaWorn(bankImage), colour: HAT_COLOUR },
  { label: 'RICE HAT', worn: riceHatWorn(bankImage), colour: RICE_HAT_COLOUR },
  { label: 'NINJA HOOD', worn: hoodWorn(bankImage), colour: HOOD_COLOUR },
  { label: 'LEI', worn: leiWorn(bankImage), colour: LEI_COLOUR },
  { label: 'CHULLO', worn: chulloWorn(bankImage), colour: CHULLO_COLOUR },
  { label: 'HEADDRESS', worn: headdressWorn(bankImage), colour: RIO_HAT_COLOUR },
];

const cell = 28, rowH = 38, PER = 12;
for (const v of VARIANTS) {
  // one image a costume: the 36 pictures in three rows (walk and rope, somersault left, somersault right)
  const cv = new Canvas(PER * cell + 4, 3 * rowH + 14);
  label(cv, v.label, 2, 1, 11);
  for (let i = 0; i < COUNT; i++) drawMonty(cv, FIRST + i, 2 + (i % PER) * cell + 2, 12 + Math.floor(i / PER) * rowH, v.worn, v.colour);
  const file = v.label.toLowerCase().replaceAll(' ', '-');
  cv.png(path.join(out, `${file}-1x.png`), 1);
  cv.png(path.join(out, `${file}-4x.png`), 4);
}
console.log('ok');
