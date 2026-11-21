/**
 * Preview sheets of China's art (sheet-kit.ts): the tiles, the decorations, the creatures and items, the dragon's pieces. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-sheets.ts <out-dir>
 */
import { CHINA_CREATURES } from '../src/art/china-creatures';
import { CHINA_DECOR } from '../src/art/china-decor';
import { DRAGON_PICTURES } from '../src/art/china-dragon';
import { CHINA_ITEMS } from '../src/art/china-items';
import { CHINA_TILES } from '../src/art/china-tiles';
import { writeSheets } from './sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: china-sheets.ts <out-dir>');
writeSheets(out, {
  title: 'CHINA', tiles: CHINA_TILES, decor: CHINA_DECOR, creatures: CHINA_CREATURES,
  sprites: { ...CHINA_ITEMS, ...Object.fromEntries(Object.entries(DRAGON_PICTURES).map(([name, block]) => [name, { block, colour: 2 }])) },
});
