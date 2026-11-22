/**
 * Preview sheets of Siberia's art (sheet-kit.ts): the tiles, the decorations, the creatures and items, and the mine cart. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-sheets.ts <out-dir>
 */
import { SIBERIA_CREATURES } from '../src/art/siberia-creatures';
import { SIBERIA_DECOR } from '../src/art/siberia-decor';
import { SIBERIA_ITEMS } from '../src/art/siberia-items';
import { SIBERIA_TILES } from '../src/art/siberia-tiles';
import { writeSheets } from './sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-sheets.ts <out-dir>');
writeSheets(out, {
  title: 'SIBERIA', tiles: SIBERIA_TILES, decor: SIBERIA_DECOR, creatures: SIBERIA_CREATURES,
  sprites: { ...SIBERIA_ITEMS },
});
