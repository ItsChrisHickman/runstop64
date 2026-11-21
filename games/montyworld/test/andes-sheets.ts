/**
 * Preview sheets of the Andes' and the Amazon's art (pre-production): tiles, decorations, creatures (4x, and the first four large at
 * 8x), items, the canopy, the boulder and the vines. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-sheets.ts <out-dir>
 */
import { ANDES_CREATURES } from '../src/art/andes-creatures';
import { ANDES_DECOR } from '../src/art/andes-decor';
import { ANDES_SPRITES } from '../src/art/andes-items';
import { ANDES_TILES } from '../src/art/andes-tiles';
import { writeSheets } from './sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-sheets.ts <out-dir>');
writeSheets(out, { title: 'ANDES', tiles: ANDES_TILES, decor: ANDES_DECOR, creatures: ANDES_CREATURES, sprites: ANDES_SPRITES });
console.log('ok');
