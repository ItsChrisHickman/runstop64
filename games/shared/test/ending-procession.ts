/**
 * The procession's clock and formation (games/shared/ending/procession.ts), pure: a troupe marches in off the left in a line, halts
 * a little left of the middle, each member does its move in turn while the rest stand (its name coming up as it begins, and
 * staying), then the troupe marches off the right; one troupe after another, about four to seven seconds each; the hero dances,
 * the gag is flat all the way; the names' spots fit the picture.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/ending-procession.ts
 */
import { BOW, FLAT, MARCH, NAME_LETTERS, PARADE, movesFor, nameSpot, paradeAt, paradeOf, phasesOf, processionOf, troupeAt, type Move, type ParadeShape, type ParadeUnit, type TroupeShape } from '../ending/procession';
import { check, finish } from './check';

const troupe = (n: number, width = 24, first = 0): TroupeShape => ({ members: movesFor(first, n).map((move) => ({ width, move })) });

for (const n of [1, 2, 3, 4]) {
  const shape = troupe(n), p = phasesOf(shape);
  const at = (t: number) => troupeAt(shape, t);
  const start = at(0).stances, end = at(p.length - 1).stances;
  check(`${n} in a troupe: they begin off the left and end off the right`, start.every((s) => s.left + 24 <= MARCH.speed) && end.every((s) => s.left >= 320 - MARCH.speed));
  const halted = at(p.inFrames + 1).stances;
  const middle = ((halted[0]?.left ?? 0) + 24 + (halted[halted.length - 1]?.left ?? 0)) / 2;
  check(`${n}: halted with its middle a little left of the picture's (${middle})`, Math.abs(middle - MARCH.halt) <= 1 && middle < 160);
  let order = true, together = 0, overlap = 0, named = 0, namesOk = true, still = true;
  for (let t = 0; t < p.length; t++) {
    const now = at(t);
    const moving = now.stances.filter((s, k) => s.moveAt >= 0 && s.moveAt < (p.moves[k] ?? 0));
    if (moving.length > 1) together++;
    for (let k = 1; k < now.stances.length; k++) if ((now.stances[k]?.left ?? 0) - (now.stances[k - 1]?.left ?? 0) < 24) overlap++;
    if (now.named.length < named || now.named.length > named + 1 || now.named.some((m, i) => m !== i)) namesOk = false;
    named = now.named.length;
    // (a member moves only while the troupe stands)
    const standing = t >= p.inFrames && t < p.inFrames + p.standing;
    if (!standing && now.stances.some((s) => s.lift !== 0 || s.mirror || s.squash !== 1)) still = false;
    if (t < p.inFrames && now.named.length !== 0) order = false;
  }
  check(`${n}: one member moves at a time (${together} frames with two), never closer than its width to the next (${overlap}), only while the troupe stands`, together === 0 && overlap === 0 && still);
  check(`${n}: no name before the halt, then one more as each move begins, left to right (the order they stand in), all up before it marches off`, order && namesOk && at(p.inFrames + p.standing).named.length === n);
  check(`${n}: a troupe's turn is about four to seven seconds (${(p.length / 50).toFixed(1)} s)`, p.length >= 200 && p.length <= 350);
}

// the moves
{
  const shape = troupe(3), p = phasesOf(shape);
  const seen = shape.members.map((m, k) => {
    let lift = 0, mirror = false, squash = 1;
    for (let t = 0; t < p.length; t++) { const s = troupeAt(shape, t).stances[k]; if (!s) continue; lift = Math.max(lift, s.lift); mirror ||= s.mirror; squash = Math.min(squash, s.squash); }
    return { move: m.move, lift, mirror, squash };
  });
  check(`the moves: a hop lifts it (${seen.find((s) => s.move === 'hop')?.lift} px), a turn faces it about, a bow lowers it`, seen.some((s) => s.move === 'hop' && s.lift >= 6 && !s.mirror) && seen.some((s) => s.move === 'turn' && s.mirror && s.lift === 0) && seen.some((s) => s.move === 'bow' && s.squash === BOW));
  check('each troupe starts its moves one further on (not every troupe hops first)', new Set([0, 1, 2].map((i) => movesFor(i, 1)[0])).size === 3);
}

// the hero and the gag
{
  // (the gag behind him, at the left)
  const shape: TroupeShape = { members: [{ width: 24, move: 'flat' satisfies Move }, { width: 24, move: 'dance' }] }, p = phasesOf(shape);
  let dancing = 0, flatAll = true, behind = true;
  for (let t = 0; t < p.length; t++) { const [gag, hero] = troupeAt(shape, t).stances; if (hero?.dancing) dancing++; if (gag?.squash !== FLAT) flatAll = false; if ((gag?.left ?? 0) >= (hero?.left ?? 0)) behind = false; }
  check(`the hero dances (${dancing} frames), the gag is flat all the way, behind him`, dancing === MARCH.dance && flatAll && behind);
  check('the hero is named as his dance begins, the gag as it ends', troupeAt(shape, p.inFrames).named.join() === '1' && troupeAt(shape, p.inFrames + MARCH.dance).named.join() === '1,0');
}

// one troupe after another
{
  const shapes = [troupe(4), troupe(3, 16, 1), troupe(1)];
  const all = processionOf(shapes);
  check('the troupes follow one another, no gap, no overlap', all.turns.every((t, i) => t.from === (i === 0 ? 0 : (all.turns[i - 1]?.from ?? 0) + (all.turns[i - 1]?.length ?? 0))) && all.length === all.turns.reduce((n, t) => n + t.length, 0));
}

// the names' spots
{
  const rows = [183, 192] as const;
  const spots = [0, 1, 2, 3].map((k) => nameSpot(k, rows));
  check('four names, four spots: two to a row, two rows, each with room for a whole name', new Set(spots.map((s) => `${s.x},${s.row}`)).size === 4 && spots.every((s) => s.x + NAME_LETTERS * 8 <= 320) && (spots[1]?.x ?? 0) >= (spots[0]?.x ?? 0) + NAME_LETTERS * 8);
}

// the carnival parade: one column, the groups behind their banners, names as each passes, the gag's end
{
  const member = (group: number, width = 16): ParadeUnit => ({ kind: 'member', width, group });
  const units: ParadeUnit[] = [
    { kind: 'leader', width: 16, group: -1 }, { kind: 'leader', width: 16, group: -1 },
    { kind: 'banner', width: 64, group: 0 }, member(0), member(0, 24), member(0), member(0),
    { kind: 'banner', width: 56, group: 1 }, member(1), member(1),
    { kind: 'banner', width: 40, group: 2 }, member(2, 24),
    { kind: 'gag', width: 16, group: -1 },
  ];
  const shape: ParadeShape = { units, crush: 60 }, p = paradeOf(shape);
  let order = true, apart = true, offAfter = true, bounced = 0, bannersStill = true;
  const named: number[] = [], groups: number[] = [], phases: string[] = [];
  let gagLeft = new Set<number>(), namesOk = true, prevNamed: number[] = [];
  for (let t = 0; t < p.length; t++) {
    const now = paradeAt(shape, t);
    // (the column keeps its order and its spacing: each unit behind the one in front, never touching it)
    for (let k = 1; k < units.length; k++) {
      const a = now.lefts[k - 1] ?? 0, b = now.lefts[k] ?? 0, w = units[k]?.width ?? 0;
      if (b >= a) order = false;
      if (b + w > a && k !== units.length - 1) apart = false;
    }
    if (now.lifts.some((l, k) => l > 0 && units[k]?.kind === 'member')) bounced++;
    if (now.lifts.some((l, k) => l !== 0 && (units[k]?.kind === 'banner' || units[k]?.kind === 'gag'))) bannersStill = false;
    if (groups[groups.length - 1] !== now.group) groups.push(now.group);
    // (names only grow within a group, in the column's order, and start again with the next group)
    const same = now.named.length >= prevNamed.length && prevNamed.every((k, i) => now.named[i] === k);
    if (!same && now.named.length > 1) namesOk = false;
    for (const k of now.named) if (!named.includes(k)) named.push(k);
    prevNamed = now.named;
    if (phases[phases.length - 1] !== now.gag.phase) phases.push(now.gag.phase);
    if (now.gag.phase !== 'march') gagLeft.add(now.lefts[units.length - 1] ?? 0);
    if (now.gag.phase === 'cheer' && units.slice(0, -1).some((_, k) => (now.lefts[k] ?? 0) < 320)) offAfter = false;
  }
  const members = units.flatMap((u, k) => (u.kind === 'member' ? [k] : []));
  check(`the parade keeps its order (${order}) and its spacing (${apart}): no one passes or touches the one in front`, order && apart);
  check(`the marchers bounce on the beat (${bounced} frames), the banners and the gag do not`, bounced > 100 && bannersStill);
  check(`the groups pass in order (${groups.join(' ')}) and every marcher is named once as it passes, in the column's order, the names starting again with each group`, groups.join() === '-1,0,1,2' && named.join() === members.join() && namesOk);
  check(`the gag's end: ${phases.join(', ')}, standing at ${[...gagLeft].join(' ')}, the crusher death as long as the game says (${p.phases.rise - p.phases.crush} frames), the rest of the column gone by the cheer`, phases.join() === 'march,stop,drop,crush,rise,cheer' && gagLeft.size === 1 && gagLeft.has(PARADE.crushAt) && p.phases.rise - p.phases.crush === 60 && offAfter);
  check(`a parade of thirty is a watchable length (${(paradeOf({ units: [...units, ...units.slice(2, -1), ...units.slice(2, -1), ...units.slice(2)] }).length / 50).toFixed(0)} s)`, paradeOf({ units: [...units, ...units.slice(2, -1), ...units.slice(2, -1), ...units.slice(2)] }).length / 50 < 60);
  gagLeft = new Set();
}

finish();
