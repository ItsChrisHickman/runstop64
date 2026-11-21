/**
 * The costumes, one rule for all (art/costume.ts): for every one of Monty's 36 pictures and every costume, a hat stays on his head (its
 * pixels never cover his eyes, stay within his head's columns plus a pixel or two, lie above his eyes, and are at most MAX_HAT_ROWS rows
 * tall) and the lei sits below his eyes; his own picture is cleared only under the thing's own pixels; Monty on the Run's bank is untouched.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/costume.ts
 */
import { bankImage } from '../../montyotr/src/data';
import { check, finish } from '../../shared/test/check';
import { CHULLO_WORN, chulloWorn } from '../src/art/andes-hat';
import {
  COUNT, EYES_FROM, EYES_TO, FIRST, HEAD_SLACK, MAX_HAT_ROWS, MAX_NECK_ROWS, montyFrames, overlayPixels, type Worn,
} from '../src/art/costume';
import { riceHatWorn, ushankaWorn } from '../src/art/hat';
import { hoodWorn } from '../src/art/japan-hood';
import { leiWorn } from '../src/art/pacific-lei';
import { headdressWorn } from '../src/art/rio-hat';

const before = bankImage.slice();
const COSTUMES: readonly { name: string; worn: Worn }[] = [
  { name: 'ushanka', worn: ushankaWorn(bankImage) },
  { name: 'rice hat', worn: riceHatWorn(bankImage) },
  { name: 'ninja hood', worn: hoodWorn(bankImage) },
  { name: 'lei', worn: leiWorn(bankImage) },
  { name: 'chullo', worn: chulloWorn(bankImage) },
  { name: 'headdress', worn: headdressWorn(bankImage) },
];
const frames = montyFrames(bankImage);
check(`Monty has ${COUNT} pictures from $${FIRST.toString(16)}`, frames.length === COUNT);
check('a worn picture is small enough to be worn (the chullo is no more than 10 wide and 6 tall)', CHULLO_WORN.length <= MAX_HAT_ROWS && CHULLO_WORN.every((r) => r.length <= 10));

const bit = (block: Uint8Array, x: number, y: number) => ((block[y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) !== 0;

for (const { name, worn } of COSTUMES) {
  let eyesCovered = 0, outsideColumns = 0, wrongRows = 0, tooTall = 0, clearedElsewhere = 0, eyesLost = 0, empty = 0, count = 0;
  for (const f of frames) {
    count++;
    const o = worn.hat.find((h) => h.ptr === f.ptr);
    const m = worn.monty.find((h) => h.ptr === f.ptr);
    if (!o || !m) { empty++; continue; }
    const px = overlayPixels(o);
    const eyes = new Set(f.eyes.map((e) => e.y * 64 + e.x));
    const rows: number[] = [];
    const thing = new Set(px.map((p) => p.y * 64 + p.x));
    for (const p of px) {
      if (eyes.has(p.y * 64 + p.x)) eyesCovered++;
      const u = f.upright(p.x, p.y), row = Math.round(u.y) - f.head.top;
      rows.push(row);
      if (Math.round(u.x) < f.head.left - HEAD_SLACK || Math.round(u.x) > f.head.right + HEAD_SLACK) outsideColumns++;
      if (worn.site === 'head' ? row >= EYES_FROM : row <= EYES_TO) wrongRows++;
    }
    if (rows.length === 0) { empty++; continue; }
    const tall = Math.max(...rows) - Math.min(...rows) + 1;
    if (tall > (worn.site === 'head' ? MAX_HAT_ROWS : MAX_NECK_ROWS)) tooTall++;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 24; x++) {
      const was = f.px[y]?.[x] === true, now = bit(m.block, x, y);
      if (was && !now && !thing.has(y * 64 + x)) clearedElsewhere++;
      if (now && !was) clearedElsewhere++;
    }
    for (const e of f.eyes) if (!bit(m.block, e.x, e.y)) eyesLost++;
  }
  check(`${name}: a hat or garland for each of his ${count} pictures`, empty === 0);
  check(`${name}: never covers his eyes`, eyesCovered === 0);
  check(`${name}: within his head's columns plus ${HEAD_SLACK}`, outsideColumns === 0);
  check(`${name}: ${worn.site === 'head' ? 'above his eyes' : 'below his eyes'}`, wrongRows === 0);
  check(`${name}: at most ${worn.site === 'head' ? MAX_HAT_ROWS : MAX_NECK_ROWS} rows tall`, tooTall === 0);
  check(`${name}: his picture is cleared only under the thing's own pixels, and his eyes stay`, clearedElsewhere === 0 && eyesLost === 0);
}
check('Monty on the Run\'s bank is not changed by any costume', bankImage.every((v, i) => v === before[i]));
finish();
