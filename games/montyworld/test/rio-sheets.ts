/**
 * Preview sheets of Rio's art (pre-production): tiles, decorations, creatures (4x, and the first four large at 8x), items, the sun
 * and the skewer's poses. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-sheets.ts <out-dir>
 */
import { RIO_CREATURES } from '../src/art/rio-creatures';
import { RIO_DECOR } from '../src/art/rio-decor';
import { RIO_SPRITES } from '../src/art/rio-items';
import { RIO_TILES } from '../src/art/rio-tiles';
import { writeSheets } from './sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-sheets.ts <out-dir>');
writeSheets(out, { title: 'RIO', tiles: RIO_TILES, decor: RIO_DECOR, creatures: RIO_CREATURES, sprites: RIO_SPRITES });
console.log('ok');
