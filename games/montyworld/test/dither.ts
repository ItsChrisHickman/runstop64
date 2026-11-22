/**
 * No checkerboard-dithered tiles (Chris: the yellow platforms of ONION DOME SWEET DOME): Monty on the Run's art is solid shapes with black-line
 * detail. A tile (or decoration character) with several rows of alternating pixels ($55 or $AA, or lit and dark by turns across rows) is dithered.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/dither.ts
 */
import { check, finish } from '../../shared/test/check';
import { WORLD_TILES } from '../src/art/world';

const ones = (n: number) => { let c = 0; for (let b = n & 0xff; b; b >>= 1) c += b & 1; return c; };
/**
 * Whether a character is busy both ways, as a checkerboard or a scale pattern is (many changes along its rows and between them): stripes and
 * seams change one way only.
 */
function dithered(rows: ArrayLike<number>): boolean {
  let across = 0, down = 0;
  for (let i = 0; i < 8; i++) {
    const b = rows[i] ?? 0;
    across += ones((b ^ (b >> 1)) & 0x7f);
    if (i < 7) down += ones(b ^ (rows[i + 1] ?? 0));
  }
  return across >= 24 && down >= 24;
}

/** Busy tiles from before this check, to be looked at by eye (Chris's rule is solid shapes with black-line detail); a new one fails. */
const TO_REVIEW = new Set(['metroTile', 'thirdRail', 'crate', 'wheel', 'coalSeam', 'crackerSpark', 'crackerBang', 'blueBank', 'jpCrate', 'jpPachinko', 'pacCrate', 'pacChainGate', 'porthole', 'wavePavement']);
const bad: string[] = [];
let review = 0;
for (const [name, t] of Object.entries(WORLD_TILES)) if (dithered(t.chr)) { if (TO_REVIEW.has(name)) review++; else bad.push(`tile ${name}`); }
for (const b of bad) console.log(b);
console.log(`${review} older busy tiles still to look at`);
check(`no tile is dithered but those to review (${bad.length} are); ONION DOME's domeScale is solid bands now`, bad.length === 0);
finish();
