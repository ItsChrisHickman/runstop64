/**
 * The montage's clock (games/shared/ending/timeline.ts), pure: a place's credit lines, then its visitors' names, take turns in the
 * band (a name never between two lines), every turn fits in its place, the visitors cross the picture while their names are up, and the cast is shared out over the places.
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
  check('a place\'s credit lines come first, in order, then its names', tl.beats.map((b) => `${b.kind[0]}${b.index}`).join(' ') === 'c0 c1 c2 n0 n1');
  // (a sentence typed over two lines is never broken by a name: every place shape, every count of visitors)
  const shapes = [{ credits: lines, frames: 0 }, { credits: lines, frames: 1000 }, { credits: ['A', 'B'], frames: 300, bandFrom: 40 }, { credits: ['ONLY'], frames: 200 }];
  const broken = shapes.flatMap((shape) => [0, 1, 2, 5].flatMap((n) => {
    const beats = timelineOf(shape, n).beats;
    const lastLine = beats.reduce((at, b, i) => (b.kind === 'credit' ? i : at), -1);
    return beats.some((b, i) => b.kind === 'name' && i < lastLine) ? [`${shape.credits.length} lines, ${n} names`] : [];
  }));
  check(`no name falls between two lines of the same place's credits${broken.length ? ` (${broken.join('; ')})` : ''}`, broken.length === 0);
  check('the turns follow one another with no gap, from the start', tl.beats.every((b, i) => b.from === (i === 0 ? 0 : must(tl.beats[i - 1], 'beat').from + must(tl.beats[i - 1], 'beat').len)));
  check(`a place lasts as long as its turns need (${tl.length}), not less than it declares`, tl.length === 3 * CREDIT.slot + 2 * NAME.slot);
  const long = timelineOf({ credits: lines, frames: 1000 }, 2);
  check('time to spare is the lines\' (held longer), the names stay a walk long, and the parade ends the place', long.length === 1000 && long.beats.filter((b) => b.kind === 'name').every((b) => b.len === NAME.slot) && long.beats.reduce((n, b) => n + b.len, 0) === 1000);
  const late = timelineOf({ credits: lines, frames: 0, bandFrom: 130 }, 1);
  check('a band occupied at first (bandFrom) has its turns after that', must(late.beats[0], 'beat').from === 130 && late.length === 130 + 3 * CREDIT.slot + NAME.slot);
  check('no credits and no visitors: just the time declared', timelineOf({ frames: 250 }, 0).length === 250 && timelineOf({ frames: 250 }, 0).beats.length === 0);
}

// ---- what the band says
{
  const tl = timelineOf({ credits: lines, frames: 0 }, 2);
  const credit = must(tl.beats[0], 'beat'), name = must(tl.beats.find((b) => b.kind === 'name'), 'name');
  check('a credit line types on a letter a frame', bandAt(tl, credit.from + 2, lines, names)?.text === 'ON' && bandAt(tl, credit.from, lines, names)?.text === '');
  check('and goes a moment before the next turn', bandAt(tl, credit.from + credit.len - 1, lines, names) === null);
  check('a name is whole from its first frame to its last (the walk\'s)', bandAt(tl, name.from, lines, names)?.text === 'THE RAT' && bandAt(tl, name.from + name.len - 1, lines, names)?.text === 'THE RAT');
  check('a name and a credit line are never up together: the turns never overlap, and a moment of nothing is between a line and a name', tl.beats.every((x, i) => { const next = tl.beats[i + 1]; return !next || (x.from + x.len <= next.from && (x.kind === next.kind || bandAt(tl, x.from + x.len - 1, lines, names) === null)); }));
  check('every frame of a place is one turn\'s or between turns', Array.from({ length: tl.length }, (_, t) => bandAt(tl, t, lines, names)).every((x) => x === null || x.beat.len > 0));
}

// ---- the visitors
{
  const tl = timelineOf({ credits: lines, frames: 0 }, 3);
  const beats = tl.beats.filter((b) => b.kind === 'name');
  const width = 24;
  beats.forEach((beat, i) => {
    const walk = walkOf(beat);
    check(`visitor ${i} crosses the whole picture within its turn (${walk.to - walk.from} frames), alone`, walk.from === beat.from && walk.to === beat.from + beat.len && walk.to <= tl.length && visitorLeft(walk, walk.from, width) === -width && (visitorLeft(walk, walk.to - 1, width) ?? 0) >= 300);
    const lefts = Array.from({ length: walk.to - walk.from }, (_, k) => visitorLeft(walk, walk.from + k, width) ?? NaN);
    check(`visitor ${i} only ever goes forward, and is off the walk outside it`, lefts.every((x, k) => k === 0 || x >= (lefts[k - 1] ?? 0)) && visitorLeft(walk, walk.from - 1, width) === null && visitorLeft(walk, walk.to, width) === null);
  });
  // (one at a time: at no frame of the place are two visitors on the picture, and each is named all the while it is)
  const walks = beats.map((b) => walkOf(b));
  const clash = Array.from({ length: tl.length }, (_, t) => t).filter((t) => walks.filter((w) => { const x = visitorLeft(w, t, width); return x !== null && x + width > 0 && x < 320; }).length > 1);
  check(`never two visitors on the picture at once (${clash.length} frames with two)`, clash.length === 0);
  check('a walk lasts about 2.5 seconds', beats.every((b) => b.len >= 120 && b.len <= 130));
  check('each walk begins as the one before ends', walks.every((w, i) => i === 0 || w.from === (walks[i - 1]?.to ?? -1)));
  check('a name stands under its visitor, and never outside the span the band can hold', [-50, 0, 100, 250, 400].every((left) => { const x = nameLeft(left, 7, 8, 38); return x >= 8 && x + 7 * 8 <= 8 + 38 * 8; }));
  check('a name in a narrower band (31 letters from x 40) stays in it', [-50, 0, 100, 250, 400].every((left) => { const x = nameLeft(left, 12, 40, 31); return x >= 40 && x + 12 * 8 <= 40 + 31 * 8; }));
}

// ---- the cast, shared out
{
  const places = [{ credits: ['A'], frames: 400 }, { credits: ['A'], frames: 100 }, { frames: 300 }, { credits: ['A', 'B'], frames: 100 }, { credits: ['A'], frames: 200, visitors: false as const }];
  const shares = sharesOf(places, 8);
  check(`the whole cast goes to the last place with credits that takes visitors (${shares.join(' ')} of 8)`, shares.join(' ') === '0 0 0 8 0');
  check('nowhere to put them: none placed', sharesOf([{ frames: 100 }], 5).every((n) => n === 0));
  // (a parade over the last lines' place and the places after it that say so, as many walks as fit in each one's limit, the rest to the last)
  const trail = [{ credits: ['A'], frames: 0, limit: 800 }, { credits: ['A', 'B', 'C', 'D'], frames: 0, limit: 600 }, { frames: 0, limit: 300, visitors: true as const }, { frames: 0, limit: 600, visitors: true as const }, { frames: 0, visitors: false as const }];
  check(`the last place with lines takes the walks that fit after them, the places after it that say so the rest, one place never past its limit but the last (${sharesOf(trail, 8).join(' ')})`, sharesOf(trail, 8).join(' ') === '0 1 2 5 0' && sharesOf(trail, 3).join(' ') === '0 1 2 0 0');
  check('a place after the last line with no word for it takes none', sharesOf([{ credits: ['A'], frames: 0 }, { frames: 0, limit: 900 }], 4).join(' ') === '4 0');
}

finish();
