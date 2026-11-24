/**
 * THE FLIGHT, Hilo to the Andes (sky.ts, docs/dosvidaniya-flight.md), played headless in EASY and in HARD (the game's two modes: the lives alone differ):
 * - on Hilo's apron, the parachute taken, into the yellow mail biplane: the first leg, and the map's cell is the leg's own;
 * - the three legs flown by a bot (a depth-first search over the game's own frames that keeps him alive, heading for each leg's coins), each leg handing on to the next where he is, and the bail-out
 *   into JUMP FOR JOY's top under the canopy, alive;
 * - Viktor wins the round (the find), and the tally reads Monty 2 v Viktor 1 with the train and the ship won, its stars in the winners' colours;
 * - a death in a leg starts that leg again as he came in (never the leg before), its clock from nought; in HARD it costs a life;
 * - a save made in the second leg carries on in the second leg;
 * - Viktor touches him if he keeps still against the box's edge (death), and a flock that meets Viktor's plane knocks him back along the trail.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/flight.ts [easy|hard]
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game, Input as Stick } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { rollerAt } from '../../montyotr/src/rollers';
import { restore, snapshot } from '../../montyotr/src/save';
import { score } from '../../montyotr/src/tally';
import { copy, frame, NONE, settled, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { newGame } from '../../shared/monty/test/bot';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { AND } from '../src/andes';
import { ROUNDS, WORLD } from '../src/data';
import { PAC } from '../src/pacific';
import { FLY } from '../src/sky';
import { itemIndex, standY } from './route';

const only = process.argv[2];

/** A game in a mode: EASY (unlimited lives) or HARD (five), every help on as in play. */
function game(mode: 'easy' | 'hard'): State {
  const s = newGame(WORLD, mode === 'easy');
  s.g.assist = { ...s.g.assist, lives: mode === 'easy', respawn: true, hints: true };
  return s;
}

/** What he holds in the plane: still, the four ways, and climbing or diving while going forward or back. */
const STICKS: readonly Stick[] = [
  NONE, { ...NONE, up: true }, { ...NONE, down: true }, { ...NONE, left: true }, { ...NONE, right: true },
  { ...NONE, up: true, right: true }, { ...NONE, up: true, left: true }, { ...NONE, down: true, right: true }, { ...NONE, down: true, left: true },
];
const STEP = 4, LOOK = 40;
const dying = (g: Game) => g.actionCounter !== 0 || g.script !== null;

/** Hold a stick `frames` frames on a copy; whether he is still alive. */
function survives(s: State, stick: Stick, frames: number): boolean {
  const t: State = { g: copy(s.g), col: s.col };
  for (let f = 0; f < frames; f++) { frame(t, stick); if (dying(t.g)) return false; if (!settled(t.g) || t.g.planeBail >= 0) return true; }
  return true;
}

/** Where he wants to be in a leg now: its coins while they are there (the rooms' own cells: sky.ts), else the middle of the sky. */
const COINS: Readonly<Record<number, readonly (readonly [col: number, row: number])[]>> = { [FLY.mail]: [[24, 2]], [FLY.storm]: [[16, 14], [9, 7], [23, 5]] };
function target(g: Game): readonly [col: number, row: number] {
  for (const [c, r] of COINS[g.roomId] ?? []) {
    const coin = g.entities.find((e) => e.at === SCREEN + (r + 3) * ROW + c + 4);
    if (coin && coin.index >= 0 && !g.coinCollected[coin.index]) return [c, r - 1];
  }
  return [14, g.roomId === FLY.storm ? 12 : 6];
}

/**
 * Fly from where he is until the room is `until` (settled there), searching depth first: at each step of four frames the sticks are tried nearest-the-target first, a stick kept only if he lives through it
 * and then lives on `LOOK` frames holding some stick; a dead end goes back a step. Returns the state there, or null.
 */
function flyTo(start: State, until: number, budget = 60000): { s: State; tries: number } | null {
  let deepest = 0;
  const seen = new Set<string>(); // (where he was at which moment of the leg: a place tried once is not tried again)
  const stack: { s: State; tried: number; order: readonly Stick[] }[] = [];
  const order = (s: State): readonly Stick[] => {
    const [tc, tr] = target(s.g), col = s.g.montyCol - 4, row = s.g.montyRow - 3;
    const score = (k: Stick) => Math.abs(col + (k.right ? 1 : k.left ? -1 : 0) - tc) + Math.abs(row + (k.down ? 1 : k.up ? -1 : 0.3) - tr);
    return [...STICKS].sort((a, b) => score(a) - score(b));
  };
  stack.push({ s: start, tried: 0, order: order(start) });
  let tries = 0;
  while (stack.length && tries < budget) {
    const top = stack[stack.length - 1];
    if (!top) break;
    if (top.s.g.roomId === until && settled(top.s.g)) return { s: top.s, tries };
    if (top.tried >= top.order.length) { stack.pop(); continue; }
    const stick = top.order[top.tried++] ?? NONE;
    tries++;
    const t: State = { g: copy(top.s.g), col: top.s.col };
    let ok = true;
    for (let f = 0; f < STEP && ok; f++) { frame(t, stick); ok = !dying(t.g); }
    for (let n = 0; ok && n < 300 && !settled(t.g) && t.g.roomId !== until; n++) { frame(t, NONE); ok = !dying(t.g); } // (a room's change, the bail-out: played through)
    while (ok && t.g.planeBail >= 0 && !t.g.roomExit) { frame(t, NONE); ok = !dying(t.g); }
    for (let n = 0; ok && n < 300 && !settled(t.g); n++) frame(t, NONE);
    if (!ok) continue;
    const key = `${t.g.roomId},${t.g.planeTime},${t.g.planeBail},${t.g.x2 >> 1},${t.g.y >> 1},${t.g.pursuers.map((p) => `${p.lag},${p.x2 >> 1},${p.y >> 1}`).join()},${t.g.coinCollected.join('')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (t.g.roomId !== until && !STICKS.some((k) => survives(t, k, LOOK))) continue;
    stack.push({ s: t, tried: 0, order: order(t) });
    if (t.g.planeTime > deepest) deepest = t.g.planeTime;
  }
  console.log(`  (no way into room ${until}: ${tries} steps tried, as far as ${deepest} frames into room ${start.g.roomId}'s leg)`);
  return null;
}

/** `<mode> leg <n>`: only fly that leg (2 or 3) from the middle of its left side, to look at one leg quickly. */
const oneLeg = process.argv[3] === 'leg' ? Number(process.argv[4]) : 0;
if (oneLeg) {
  const s = game(only === 'hard' ? 'hard' : 'easy');
  const room = oneLeg === 2 ? FLY.storm : FLY.tail;
  enterRoom(s.g, room, 0x0c + (6 + 4) * 4, 0x32 + (8 + 3) * 8);
  for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE);
  const done = flyTo(s, oneLeg === 2 ? FLY.tail : AND.jump);
  check(`leg ${oneLeg} flown alive (${done ? `${done.tries} steps tried` : 'no way found'})`, done !== null);
}
for (const mode of oneLeg ? [] : ['easy', 'hard'] as const) {
  if (only !== undefined && only !== mode) continue;
  const s0 = game(mode);
  const g0 = s0.g;
  // the Pacific done (every find before the Andes'), the lei on, the train and the ship won, the parachute taken: on Hilo's apron, east of the biplane
  const andes = new Set<number>([...Object.values(AND), ...Object.values(FLY)]);
  for (let i = 0; i < g0.siCollected.length; i++) if (!andes.has(g0.data.specialItems[i * 4] ?? 0)) g0.siCollected[i] = 0x81;
  g0.siCollected[ROUNDS.plane] = 0;
  wear(g0, itemIndex(g0, PAC.waikiki, 1));
  enterRoom(g0, PAC.hilo, 0x0c + (9 + 4) * 4, standY(5));
  g0.enemies = []; g0.enable &= 0x0f; g0.vic.enable &= 0x0f; // (the nene out of the way: the boarding is what is checked here)
  for (let n = 0; n < 200 && !settled(g0); n++) frame(s0, NONE);

  // into the biplane: the first leg
  for (let n = 0; n < 200 && g0.roomId === PAC.hilo; n++) frame(s0, { ...NONE, left: true });
  for (let n = 0; n < 200 && !settled(g0); n++) frame(s0, NONE);
  for (let n = 0; n < 2; n++) frame(s0, NONE);
  check(`${mode}: into the biplane on Hilo's apron he is in the first leg (room ${g0.roomId}), its map cell [${g0.mapRow},${g0.exitCol}] the leg's own [0,20]`,
    g0.roomId === FLY.mail && g0.mapRow === 0 && g0.exitCol === 20);
  check(`${mode}: in the plane, the plane is drawn over him (sprite 2, out of the collision check) and he sits in it`, g0.planeShown && (g0.uncounted & 0x04) !== 0 && g0.frameIndex === 0x54);

  // a death in the second leg starts the second leg again, as he came in (and in HARD costs a life)
  {
    const t: State = { g: copy(g0), col: s0.col };
    enterRoom(t.g, FLY.storm, 0x0c + (5 + 4) * 4, 0x32 + (8 + 3) * 8);
    for (let n = 0; n < 200 && !settled(t.g); n++) frame(t, NONE);
    const entry = { x2: t.g.x2, y: t.g.y }, lives = t.g.lives;
    for (let n = 0; n < 60; n++) frame(t, NONE); // (let the clock run)
    let died = false;
    for (let n = 0; n < 400 && !died; n++) { frame(t, { ...NONE, up: true }); died = dying(t.g); } // up into the bolts' column at col 5
    for (let n = 0; n < 600 && (dying(t.g) || !settled(t.g)); n++) frame(t, NONE);
    check(`${mode}: a death in the second leg (flown up into a bolt: ${died}) starts the second leg again (room ${t.g.roomId}), where he came in (${t.g.x2 === entry.x2 && t.g.y === entry.y}), its clock from nought (${t.g.planeTime} frames), ${mode === 'hard' ? `a life gone (${lives} to ${t.g.lives})` : 'no life counted'}`,
      died && t.g.roomId === FLY.storm && t.g.x2 === entry.x2 && t.g.y === entry.y && t.g.planeTime < 20 && (mode === 'hard' ? t.g.lives === lives - 1 : true));
  }

  // fly the three legs
  let s: State = s0;
  const legs: [number, string][] = [[FLY.storm, 'the first leg into the second'], [FLY.tail, 'the second into the third'], [AND.jump, 'the third, Viktor\'s clip and the bail-out into JUMP FOR JOY']];
  let flown = true;
  for (const [until, what] of legs) {
    const from = s.g.roomId;
    const done = flyTo(s, until);
    check(`${mode}: the bot flies ${what} alive (${done ? `${done.tries} steps tried` : 'no way found'})`, done !== null);
    if (!done) { flown = false; break; }
    if (until !== AND.jump) check(`${mode}: the leg hands on where he is (the next leg's entry is the place he left room ${from} by: x2 ${done.s.g.entry.x2}, y ${done.s.g.entry.y}), its clock from nought`, done.s.g.planeTime < STEP + 2);
    s = done.s;
  }
  if (flown) {
    const g = s.g;
    frame(s, NONE);
    check(`${mode}: he comes into JUMP FOR JOY at its top under the canopy (y ${g.y}, the map's cell [${g.mapRow},${g.exitCol}]), alive`, g.roomId === AND.jump && g.y <= 0x50 && g.mapRow === 2 && g.exitCol === 20 && g.canopyShown);
    const tally = score(g.data, g.siCollected);
    const stars = [17, 18, 19].map((c) => (g.col[c] ?? 0) & 15);
    check(`${mode}: Viktor won the plane (the find taken), so the tally reads Monty ${tally.hero} v Viktor ${tally.villain} into Rio, its stars Monty's, Monty's and Viktor's (colours ${stars.join(', ')})`,
      !!g.siCollected[ROUNDS.plane] && tally.hero === 2 && tally.villain === 1 && stars[0] === 8 && stars[1] === 8 && stars[2] === 1);
    // a death in JUMP FOR JOY starts it again in the air where he came in (a flight room: he does not stand there)
    const t: State = { g: copy(g), col: s.col };
    const entry = { x2: t.g.entry.x2, y: t.g.entry.y };
    t.g.actionCounter = 1;
    for (let n = 0; n < 600 && (dying(t.g) || !settled(t.g)); n++) frame(t, NONE);
    check(`${mode}: a death in JUMP FOR JOY starts it again in the air at the top where he dropped in (${t.g.x2},${t.g.y} vs ${entry.x2},${entry.y})`, t.g.roomId === AND.jump && t.g.x2 === entry.x2 && t.g.y === entry.y);
  }

  // a save in the second leg carries on in the second leg
  {
    const t: State = { g: copy(g0), col: s0.col };
    enterRoom(t.g, FLY.storm, 0x0c + (10 + 4) * 4, 0x32 + (12 + 3) * 8);
    for (let n = 0; n < 200 && !settled(t.g); n++) frame(t, NONE);
    const save = snapshot(t.g);
    const r = game(mode);
    restore(r.g, save);
    for (let n = 0; n < 200 && !settled(r.g); n++) frame(r, NONE);
    frame(r, NONE);
    check(`${mode}: a save made in the second leg carries on in the second leg (room ${r.g.roomId}, x2 ${r.g.x2}, y ${r.g.y}), in the plane, its clock from nought`, r.g.roomId === FLY.storm && r.g.x2 === save.x2 && Math.abs(r.g.y - save.y) <= 2 && r.g.planeShown && r.g.planeTime < 5);
  }

  // Viktor: he catches a Monty who keeps still (the box's bottom edge), and a flock that meets him knocks him back
  {
    const t: State = { g: copy(g0), col: s0.col };
    enterRoom(t.g, FLY.tail, 0x0c + (20 + 4) * 4, 0x32 + (10 + 3) * 8);
    for (let n = 0; n < 200 && !settled(t.g); n++) frame(t, NONE);
    let caught = -1;
    for (let n = 0; n < 400 && caught < 0; n++) { frame(t, { ...NONE, down: true }); if (dying(t.g)) caught = n; }
    check(`${mode}: Viktor reaches a Monty who keeps still against the box's edge, and his touch is death (after ${caught} frames: about his 150 frames' lag)`, caught > 100 && caught < 260);

    const k: State = { g: copy(g0), col: s0.col };
    enterRoom(k.g, FLY.tail, 0x0c + (12 + 4) * 4, 0x32 + (5 + 3) * 8);
    for (let n = 0; n < 200 && !settled(k.g); n++) frame(k, NONE);
    for (let n = 0; n < 160; n++) frame(k, { ...NONE, right: true, up: n % 2 === 0 }); // (wake him: flying on east and level keeps Monty ahead of him, before the first flock)
    const p = k.g.pursuers[0], roller = k.g.rollers.find((r) => WORLD.rollers[r.index]?.start === 200), e = roller ? WORLD.rollers[roller.index] : undefined;
    let knocked = false;
    if (p && e && roller && !dying(k.g)) {
      roller.t = e.start + 136; // (the flock at the picture's left, far behind Monty)
      const at = rollerAt(e, roller.t + 1);
      const lag = p.lag;
      if (at) for (let i = 0; i < p.ring.length; i += 3) { p.ring[i] = Math.round(at.x / 2); p.ring[i + 1] = Math.round(at.y) - 1; } // (his trail laid through the flock)
      frame(k, NONE);
      knocked = p.back > lag;
    }
    check(`${mode}: a flock that meets Viktor's plane knocks him back along his trail (his lag to fall back to grows by the setback)`, knocked);
  }
}
finish();
