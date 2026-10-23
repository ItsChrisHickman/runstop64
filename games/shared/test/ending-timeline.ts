/**
 * The montage's clock (games/shared/ending/timeline.ts), pure: credit lines and visitors' names take turns in the band, every turn
 * fits in its place, the visitors cross the picture while their names are up, and the cast is shared out over the places.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/ending-timeline.ts
 */
import { CREDIT } from '../ending/credits';
import { NAME, bandAt, nameLeft, sharesOf, timelineOf, visitorLeft, walkOf } from '../ending/timeline';
import { check, finish } from './check';
import { must } from './must';

const lines = ['ONE', 'TWO', 'THREE'];
const names = ['THE RAT', 'THE IMP'];

// ---- the turns of a place
{
  const tl = timelineOf({ credits: lines, frames: 100 }, 2);
  check('credit lines and names alternate, a line first', tl.beats.map((b) => `${b.kind[0]}${b.index}`).join(' ') === 'c0 n0 c1 n1 c2');
  check('the turns follow one another with no gap, from the start', tl.beats.every((b, i) => b.from === (i === 0 ? 0 : must(tl.beats[i - 1], 'beat').from + must(tl.beats[i - 1], 'beat').len)));
  check(`a place lasts as long as its turns need (${tl.length}), not less than it declares`, tl.length === 3 * CREDIT.slot + 2 * NAME.slot);
  const long = timelineOf({ credits: lines, frames: 1000 }, 2);
  check('time to spare is the lines\' (held longer), the names stay as short as they are', long.length === 1000 && long.beats.filter((b) => b.kind === 'name').every((b) => b.len === NAME.slot) && long.beats.reduce((n, b) => n + b.len, 0) === 1000);
  const late = timelineOf({ credits: lines, frames: 0, bandFrom: 130 }, 1);
  check('a band occupied at first (bandFrom) has its turns after that', must(late.beats[0], 'beat').from === 130 && late.length === 130 + 3 * CREDIT.slot + NAME.slot);
  check('no credits and no visitors: just the time declared', timelineOf({ frames: 250 }, 0).length === 250 && timelineOf({ frames: 250 }, 0).beats.length === 0);
}

// ---- what the band says
{
  const tl = timelineOf({ credits: lines, frames: 0 }, 2);
  const credit = must(tl.beats[0], 'beat'), name = must(tl.beats[1], 'beat');
  check('a credit line types on a letter a frame', bandAt(tl, credit.from + 2, lines, names)?.text === 'ON' && bandAt(tl, credit.from, lines, names)?.text === '');
  check('and goes a moment before the next turn', bandAt(tl, credit.from + credit.len - 1, lines, names) === null);
  check('a name is whole from its first frame, and goes a moment before its turn ends', bandAt(tl, name.from, lines, names)?.text === 'THE RAT' && bandAt(tl, name.from + name.len - 1, lines, names) === null);
  check('every frame of a place is one turn\'s or between turns', Array.from({ length: tl.length }, (_, t) => bandAt(tl, t, lines, names)).every((x) => x === null || x.beat.len > 0));
}

// ---- the visitors
{
  const tl = timelineOf({ credits: lines, frames: 0 }, 2);
  const beats = tl.beats.filter((b) => b.kind === 'name');
  beats.forEach((beat, i) => {
    const walk = walkOf(beat, tl.length), width = 24;
    check(`visitor ${i} walks across the whole picture within the place, its name's turn in the middle of it`, walk.from >= 0 && walk.to <= tl.length && walk.from <= beat.from && walk.to >= beat.from + beat.len - 1 && visitorLeft(walk, walk.from, width) === -width && (visitorLeft(walk, walk.to - 1, width) ?? 0) >= 300);
    const lefts = Array.from({ length: walk.to - walk.from }, (_, k) => visitorLeft(walk, walk.from + k, width) ?? NaN);
    check(`visitor ${i} only ever goes forward, and is off the walk outside it`, lefts.every((x, k) => k === 0 || x >= (lefts[k - 1] ?? 0)) && visitorLeft(walk, walk.from - 1, width) === null && visitorLeft(walk, walk.to, width) === null);
  });
  check('a name stands under its visitor, and never outside the span the band can hold', [-50, 0, 100, 250, 400].every((left) => { const x = nameLeft(left, 7, 8, 38); return x >= 8 && x + 7 * 8 <= 8 + 38 * 8; }));
  check('a name in a narrower band (31 letters from x 40) stays in it', [-50, 0, 100, 250, 400].every((left) => { const x = nameLeft(left, 12, 40, 31); return x >= 40 && x + 12 * 8 <= 40 + 31 * 8; }));
}

// ---- the cast, shared out
{
  const places = [{ credits: ['A'], frames: 400 }, { credits: ['A'], frames: 100 }, { frames: 300 }, { credits: ['A', 'B'], frames: 100, visitors: false as const }, { credits: ['A'], frames: 200 }];
  const shares = sharesOf(places, 8);
  check(`every visitor has a place (${shares.join(' ')} of 8)`, shares.reduce((a, b) => a + b, 0) === 8);
  check('none for a place with no credits or one that says none', shares[2] === 0 && shares[3] === 0);
  check('the extra ones go to the places with the most spare time', must(shares[0], 'share') >= must(shares[1], 'share') && must(shares[0], 'share') >= must(shares[4], 'share'));
  check('nowhere to put them: none placed', sharesOf([{ frames: 100 }], 5).every((n) => n === 0));
}

finish();
