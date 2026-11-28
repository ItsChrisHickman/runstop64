/**
 * Viktor Vole round the world (docs/dosvidaniya-reset.md, "Viktor Vole"), headless, in ORIGINAL and ENHANCED:
 * - SPY VERSUS MOLE (the Sambadrome): he walks on at the far side as Monty comes in, the room's name flashing, and off; then the puzzle. Walking under the float's head and pulling the lever, at any moment
 *   after, squashes him whenever the head reaches him under it (never through him); standing under the head first, so that he stands there too, and pulling as he does, squashes him (the four-way
 *   split, the bars lift) with Monty alive. An early pull misses and the head is ready again; standing under it as it falls kills Monty; kept moving, he never reaches Monty.
 * - The train's roof and the cargo ship: behind him on his path; Monty sheltering in the closet as the mountain comes (Viktor, on the roof, is swept off), ducking under the crane's crate as it rises (Viktor
 *   walks into it coming down and is knocked overboard), a way found from several arrival timings; escaped, he is gone from the room for good (a save keeps it).
 * - The cameos: each plays when Monty comes in from its border's room (and not after a death there), shows Viktor on a sprite that is no part of the collision check (he never dies of it); THE LAST
 *   MOLE's shadow only once the hood is taken, and only once, and is gone. A border cameo waits while Monty is by the edge he came in by and starts once he is well away: Viktor runs on after him, only
 *   ever toward him (Chris: "he is trying to chase Monty and can't reach him yet... not that he is running away"), is stopped at the brink and stays there, and he stays at least BORDER_CLEAR cells from
 *   Monty all through it: never near enough that he could have caught him (Chris on OPEN ARMS: "he could have just got me").
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/viktor.ts [out-dir] [--room <rooms>]   (--room: only the parts in those rooms: the Sambadrome, the train, the ship, a cameo's room or the room before it)
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { shaftOver, underHead } from '../../montyotr/src/levers';
import { encounterState, pursuerChasing, tuneWanted } from '../../montyotr/src/pursuers';
import { copy, frame, NONE, type State } from '../../montyotr/test/play';
import type { Input as Stick } from '../../montyotr/src/game';
import { check, finish } from '../../shared/test/check';
import fs from 'node:fs';
import { contactSheet, shot } from './shots-kit';
import { must } from '../../shared/test/must';
import { ACTIONS, hold, newGame, play } from '../../shared/monty/test/bot';
import { restore, snapshot } from '../../montyotr/src/save';
import { search } from './search';
import { WORLD } from '../src/data';
import { RIO_ROOM as R } from '../src/rio';
import { JP } from '../src/japan';
import { PAC } from '../src/pacific';
import { CLOSET, SIB } from '../src/siberia';
import { colOf, dead, LEFT, RIGHT, rowText } from './mech-kit';
import { itemIndex, standY } from './route';
import type { CameoSpec } from '../../montyotr/src/montydata';
import { cellsApart, colX2 } from '../../montyotr/src/cameos';
import { CHI } from '../src/china';
import { ROOM } from '../src/moscow';
import { BORDER_CLEAR } from '../src/viktor';
import { SCOPE } from './scope';

/** Pictures of the moments, as strips (`[out-dir]`): name, then the frames. */
const out = process.argv.slice(2).find((a) => !a.startsWith('--'));
const strips = new Map<string, Uint8Array[]>();
const snap = (name: string, g: Game) => { if (out) strips.set(name, [...(strips.get(name) ?? []), shot(g)]); };

const lever = must(WORLD.levers[0], 'the Sambadrome\'s lever');
const agent = must(WORLD.pursuers.find((p) => p.room === R.drum), 'Viktor in the Sambadrome');
const CRANK = [R.float, 0] as const;

/** A new game in the Sambadrome on the avenue at a column, the crank fitted, the creatures in; came in from the carnival. */
function avenue(col: number, enhanced: boolean): State {
  const s = newGame(WORLD, enhanced);
  s.g.siCollected[itemIndex(s.g, ...CRANK)] = 0x81;
  s.g.siCollected[lever.armed] = 0x81;
  enterRoom(s.g, R.drum, 0x0c + (col + 4) * 4, standY(18));
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
  return s;
}
const viktor = (g: Game) => g.pursuers.find((p) => g.data.pursuers[p.index]?.room === g.roomId);
const squashed = (g: Game) => !!g.siCollected[lever.done];
/** Walk one way until his column is `col` (or the frames run out); false if he died. */
function walkTo(s: State, col: number, limit = 200): boolean {
  for (let f = 0; f < limit && colOf(s.g) !== col; f++) { frame(s, colOf(s.g) < col ? RIGHT : LEFT); if (dead(s.g)) return false; }
  return !dead(s.g);
}
function wait(s: State, frames: number, stick: Stick = NONE): boolean {
  for (let f = 0; f < frames; f++) { frame(s, stick); if (dead(s.g)) return false; }
  return true;
}
/** Step into the lever (from beside it, west), and back out a step. */
function pull(s: State): boolean {
  for (let f = 0; f < 12 && !s.g.leverLatch; f++) { frame(s, RIGHT); if (dead(s.g)) return false; }
  const was = s.g.leverLatch;
  for (let f = 0; f < 12 && s.g.leverLatch; f++) frame(s, LEFT);
  return was;
}

SCOPE.section([R.drum], 'SPY VERSUS MOLE', () => { for (const enhanced of [false, true]) {
  const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';

  // ---- the moment: the name, and Viktor at the far side
  {
    const s = newGame(WORLD, enhanced);
    s.g.siCollected[itemIndex(s.g, ...CRANK)] = 0x81;
    enterRoom(s.g, R.drum, 0x0c + (0 + 4) * 4, standY(8));
    const inks = new Set<number>();
    let seenFar = false, gone = false;
    for (let f = 0; f < 200; f++) {
      frame(s, NONE);
      if (!enhanced && [16, 40, 64].includes(f)) snap('1-showdown-intro', s.g);
      inks.add(s.g.col[24 * 40 + 12] ?? 0);
      const on = ((s.g.vic.enable >> (4 + agent.slot)) & 1) === 1, x = s.g.vic.sprites[4 + agent.slot]?.x ?? 0;
      if (on && x >= 2 * (0x0c + (28 + 4) * 4)) seenFar = true;
      if (seenFar && !on) gone = true;
    }
    check(`${mode}: coming into SPY VERSUS MOLE (its name: ${rowText(s.g)}), Viktor walks on at the far side and off again (${seenFar}, ${gone}) while the name flashes (${[...inks].join(',')}), and Monty on the ledge is alive`,
      rowText(s.g) === 'SPY VERSUS MOLE' && seenFar && gone && inks.size >= 2 && !dead(s.g));
  }

  // ---- the head never passes through him: walk under it to the lever and pull at any moment after; whenever the falling head reaches him under it, he is
  // squashed (Chris, 2026-11-24: it passed through him when he had walked in after the pull, about half of all pulls)
  {
    const through: number[] = [];
    let tried = 0, reached = 0;
    const shafts = new Set<number>(); // the shafts he was squashed under (Chris: "only the second crusher actually affects him")
    for (let w = 0; w <= 160; w += 4) {
      const s = avenue(13, enhanced);
      if (!walkTo(s, 21)) continue;
      if (!wait(s, w)) continue;
      tried++;
      const show = !enhanced && w === 64;
      pull(s);
      let landedOn = false, shaft = -1;
      for (let f = 0; f < 160 && !squashed(s.g); f++) {
        const before = viktor(s.g);
        shaft = before ? shaftOver(s.g, before.x2, before.y + 1) : -1;
        frame(s, NONE);
        if (show && [10, 40, 62, 70].includes(f)) snap('2-showdown-timed-pull', s.g);
        const v = viktor(s.g), pd = s.g.pd;
        if (v && pd.state === 1 && underHead(s.g, v.x2, v.y + 1) && ((pd.spriteY[0] + pd.position) & 0xff) >= v.y + 4) landedOn = true;
      }
      if (squashed(s.g) && shaft >= 0) shafts.add(shaft);
      if (landedOn) reached++;
      if (landedOn && !squashed(s.g)) through.push(w);
    }
    check(`${mode}: pulled at ${tried} moments after walking to the lever, the head reached Viktor under it ${reached} times and squashed him every time${through.length ? ` (passed through him after waits of ${through.join(', ')})` : ''}, under both shafts (${[...shafts].sort().join(', ')})`,
      through.length === 0 && reached >= 3 && tried >= 15 && shafts.has(0) && shafts.has(1));
  }

  // ---- the puzzle solved: stand under the head, so that he will; go to the lever; pull as he stops under it
  for (const stand of [60, 80, 100]) {
    const s = avenue(13, enhanced);
    let ok = walkTo(s, 17) && wait(s, stand) && walkTo(s, 21);
    let pulledAt = -1;
    for (let f = 0; ok && f < 200 && pulledAt < 0; f++) {
      const p = viktor(s.g);
      const was = p ? p.x2 : -1;
      ok = wait(s, 1);
      const now = viktor(s.g);
      if (now && now.x2 === was && underHead(s.g, now.x2, now.y + 1) && now.written > agent.delay) { ok = ok && pull(s); pulledAt = f; }
    }
    const show = !enhanced && stand === 80;
    for (let f = 0; ok && f < 120 && !squashed(s.g); f++) { ok = wait(s, 1); if (show && [2, 26].includes(f)) snap('3-showdown-solved', s.g); }
    // he goes in the four-way split, and the bars lift
    let pieces = 0;
    for (let f = 0; ok && f < 40; f++) { ok = wait(s, 1); if (show && [3, 12].includes(f)) snap('3-showdown-solved', s.g); pieces = Math.max(pieces, [6, 1, 2, 5].filter((n) => ((s.g.vic.enable >> n) & 1) === 1 && (s.g.vic.sprites[n]?.ptr ?? 0) >= 0x48 && (s.g.vic.sprites[n]?.ptr ?? 0) <= 0xaa).length); }
    check(`${mode}: standing under the head ${stand} frames, then at the lever pulling as Viktor stops under it (frame ${pulledAt}): he is squashed (the four-way split: ${pieces} pieces), Monty alive`, ok && squashed(s.g) && pieces === 4 && !dead(s.g));
    const st = encounterState(s.g);
    check(`${mode}: the HUD's state has him escaped in the Sambadrome and no longer due`, st.escaped[WORLD.pursuers.indexOf(agent)] === true && !st.due);
  }

  // ---- an early pull misses, and the head is ready again; under it when it falls, Monty dies
  {
    const s = avenue(21, enhanced);
    pull(s);
    let fell = false;
    for (let f = 0; f < 120; f++) { frame(s, NONE); if (s.g.pd.state === 1) fell = true; }
    const ready = s.g.pd.state === 0 && !s.g.hold.pull;
    check(`${mode}: pulled with Viktor far off, the head shudders, drops on no one and is up and ready again`, fell && ready && !squashed(s.g) && !dead(s.g));
    const u = avenue(21, enhanced);
    pull(u);
    walkTo(u, 17);
    let died = false;
    for (let f = 0; f < 80 && !died; f++) { frame(u, NONE); if (dead(u.g)) died = true; }
    check(`${mode}: pulling the lever and standing under the head, Monty is crushed`, died);
  }

  // ---- fair: he is always `delay` frames behind on Monty's path, so only standing still that long lets him catch up (the lever unfitted: the walk east steps into it,
  // and a fitted one would drop the head on him as he follows)
  {
    const unfitted = (s: State) => { s.g.siCollected[lever.armed] = 0; return s; };
    const a = unfitted(avenue(13, enhanced));
    const short = walkTo(a, 26) && wait(a, agent.delay - 20);
    const b = unfitted(avenue(13, enhanced));
    const long = walkTo(b, 26) && wait(b, agent.delay + 40);
    check(`${mode}: on the move, or standing still for less than his ${agent.delay} frames behind, Viktor never reaches Monty; standing longer, he does`, short && !long);
  }
}});

// ---- the two escapes on the way: the train's roof, the cargo ship ------------------------------------------
/** An escape: the room, where Monty comes in, where the bot is aimed, what the proof says, and the strip's name. */
const ESCAPES = [
  { room: SIB.sleeper, at: { col: 0, floor: 9 }, aim: { col: CLOSET.hatch, row: 11 }, what: 'shelter in the closet as the mountain comes so that Viktor, behind him on the roof, is swept off it', strip: '4-train-escape', chaseStrip: '4-train-chase' },
  { room: PAC.ship, at: { col: 0, floor: 13 }, aim: { col: 27, row: 12 }, what: 'duck under the crane crate so that Viktor, following, is knocked overboard', strip: '5-ship-escape', chaseStrip: '5-ship-chase' },
] as const;
for (const esc of ESCAPES) SCOPE.section([esc.room], `the escape in room ${esc.room}`, () => {
  const chase = must(WORLD.pursuers.find((p) => p.room === esc.room), `Viktor in room ${esc.room}`);
  /** Escaped in this room: knocked off, the find waiting for him to leave the room alive (`pendingFinds`), or taken. */
  const gone = (g: Game) => !!g.siCollected[chase.until] || g.pendingFinds.includes(chase.until);
  /** Another room to leave for (the one before it: the dining car, Japan's port). */
  const away = esc.room === PAC.ship ? JP.port : SIB.gravy;
  for (const enhanced of [false, true]) {
    const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';
    for (const delay of [0, 23, 51, 90]) {
      const s = newGame(WORLD, enhanced);
      enterRoom(s.g, esc.room, 0x0c + (esc.at.col + 4) * 4, standY(esc.at.floor)); // (in at the edge he comes by: the dining car's roof, Japan's gangway)
      for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
      for (let n = 0; n < delay; n++) frame(s, NONE);
      // a way to escape him from this arrival (a search over the game's own frames: the proof there is one)
      const goal = (g: Game) => gone(g) && g.roomId === esc.room && !g.falling && !g.montyAction;
      const aim = [{ room: esc.room, ...esc.aim }];
      const found = search(s, goal, aim, 200000, 1.5) ?? search(s, goal, aim, 600000, 3);
      const end = found ? play(s, found.route) : null;
      if (found && !enhanced && delay === 51 && out) {
        // the strip: the route's last steps, Viktor caught by the hazard and flung off
        const pics: Uint8Array[] = [];
        for (const back of [10, 6, 3, 1, 0]) { const r = play(s, found.route.slice(0, Math.max(0, found.route.length - back))); if (r) pics.push(shot(r.g)); }
        const r = play(s, found.route);
        for (let f = 0; r && f < 24; f++) { frame(r, NONE); if (f === 10 || f === 23) pics.push(shot(r.g)); }
        strips.set(esc.strip, pics);
      }
      check(`${mode}, in ${delay} frames before he moves (room ${esc.room}): there is a way to ${esc.what} (${found ? found.nodes : 'no way'}), and the chase's tune is over`, !!end && gone(end.g) && !dead(end.g) && !pursuerChasing(end.g));
      if (found) {
        // the chase as played on that way, a frame at a time: he steps in at the door Monty came by (the music cutting to the chase), follows, and is knocked off (the name flashing green, after he is out of the picture too)
        const r: State = { g: copy(s.g), col: s.col };
        const n = 4 + chase.slot, room = WORLD.music.tuneFor?.(esc.room) ?? null;
        let first = -1, firstCol = -1, f = 0, cut = false, green = -1, knockedAt = -1;
        const pics: Uint8Array[] = [];
        const look = () => {
          f++;
          const on = ((r.g.vic.enable >> n) & 1) === 1;
          if (on && first < 0) { first = f; firstCol = ((((r.g.sx[n] ?? 0) - 0x0c) & 0xff) >> 2) - 4; cut = tuneWanted(r.g, room).cut; }
          if (knockedAt < 0 && gone(r.g)) knockedAt = f;
          if (knockedAt >= 0 && (r.g.col[24 * 40 + 12] ?? 0) === 5) green = f;
          if (!enhanced && delay === 51 && out && first >= 0 && [0, 20, 45, 70].includes(f - first)) pics.push(shot(r.g));
        };
        for (const [name, frames] of found.route) { const stick = ACTIONS.find(([a]) => a === name)?.[1] ?? NONE; for (let i = 0; i < frames; i++) { hold(r, stick, 1); look(); } }
        for (let i = 0; i < 120; i++) { hold(r, NONE, 1); look(); }
        if (pics.length) strips.set(esc.chaseStrip, pics);
        check(`${mode}, ${delay} frames: on that way he steps in at the edge Monty came by (frame ${first}, col ${firstCol}) and the tune cuts to the chase (${cut}); knocked off at frame ${knockedAt}, the name flashes green till ${green}, and he is gone from the room's list`,
          first >= 0 && firstCol <= esc.at.col + 2 && cut && green > knockedAt + 40 && r.g.pursuers.length === 0 && !tuneWanted(r.g, room).cut);
      }
      if (end) {
        // knocked off, then a death in the room (the room again from itself): the escape is not taken, and he chases again
        const died = copy(end.g);
        died.respawn(true);
        for (let n = 0; n < 20 && (n === 0 || died.freeze || died.script); n++) died.frame(0);
        check(`${mode}: knocked off, then a death in room ${esc.room} before leaving it: he is back after the restart, the escape not counted`, died.roomId === esc.room && died.pursuers.length === 1 && !died.siCollected[chase.until] && encounterState(died).escaped[WORLD.pursuers.indexOf(chase)] === false);
        // knocked off, then out of the room alive: gone from it for good (a save and the room again)
        enterRoom(end.g, away, 0x0c + (28 + 4) * 4, standY(esc.at.floor));
        check(`${mode}: knocked off, then out of room ${esc.room} alive: the escape is taken`, !!end.g.siCollected[chase.until] && end.g.pendingFinds.length === 0);
        const again = newGame(WORLD, enhanced);
        restore(again.g, snapshot(end.g));
        enterRoom(again.g, esc.room, 0x0c + (esc.at.col + 4) * 4, standY(esc.at.floor));
        check(`${mode}: escaped, he is not in room ${esc.room} again (through a save)`, again.g.pursuers.length === 0 && encounterState(again.g).escaped[WORLD.pursuers.indexOf(chase)] === true);
      }
    }
  }
});

// ---- the chases felt (Chris, 2026-11-27: "I didn't fully feel the sense that he was pursuing me") --------------------------------
/**
 * On the train's roof and the cargo ship his coming is a seen cause: he steps in at the edge Monty came in by, a moment behind him, as the room's name flashes and the sting plays, and the tune turns to the
 * chase (`pursuerChasing`, which the session plays `music.chase` for); the same again after every death in the room (three in a row), never a silent skip. Monty is kept from dying of anything but the
 * restarts here (the room's creatures and the mountain are the escapes' tests above, not this one): he waits where he is put, past the box that wakes Viktor, and is never caught.
 */
/** Put Monty at a place in the room he is in, as if he had walked there (the room not loaded again, so its cameos keep their state). */
const placeAt = (g: Game, p: { col: number; floor: number }) => { g.x2 = 0x0c + (p.col + 4) * 4; g.y = standY(p.floor); };
const ARRIVALS = [
  { room: SIB.sleeper, at: { col: 0, floor: 9 }, wake: { col: 5, floor: 9 }, wait: { col: CLOSET.hatch, floor: CLOSET.floor }, strip: '7-train-arrival' }, // (up on the roof wakes him; he waits in the closet)
  { room: PAC.ship, at: { col: 0, floor: 13 }, wake: { col: 14, floor: 9 }, wait: { col: 14, floor: 9 }, strip: '8-ship-arrival' }, // (off the landing wakes him; he waits on the deck)
] as const;
for (const arr of ARRIVALS) SCOPE.section([arr.room], `the chase's arrival in room ${arr.room}`, () => {
  const chase = must(WORLD.pursuers.find((p) => p.room === arr.room), `Viktor in room ${arr.room}`);
  const n = 4 + chase.slot;
  for (const enhanced of [false, true]) {
    const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';
    const s = newGame(WORLD, enhanced);
    let stings = 0;
    const sound = s.g.sound;
    s.g.sound = { ...sound, sfx: (id, only) => { if (id === WORLD.sfx.warp) stings++; sound.sfx(id, only); } };
    enterRoom(s.g, arr.room, 0x0c + (arr.at.col + 4) * 4, standY(arr.at.floor));
    const goes: string[] = [];
    let fair = true;
    for (let go = 0; go < 4; go++) {
      if (go > 0) { s.g.respawn(true); for (let f = 0; f < 200 && (f === 0 || s.g.freeze || s.g.script); f++) frame(s, NONE); } // (a death in the room: it starts again as he came in)
      else for (let f = 0; f < 200 && (s.g.freeze || s.g.script); f++) frame(s, NONE);
      const was = stings;
      s.g.graceActive = () => true;
      for (let f = 0; f < 8; f++) frame(s, NONE);
      for (let f = 0; f < 4; f++) { placeAt(s.g, arr.wake); frame(s, NONE); }
      let firstAt = -1, firstCol = -1, chasing = false;
      const inks = new Set<number>();
      for (let f = 0; f < chase.delay + 60 && s.g.roomId === arr.room; f++) {
        placeAt(s.g, arr.wait);
        frame(s, NONE);
        const on = ((s.g.vic.enable >> n) & 1) === 1;
        if (on && firstAt < 0) { firstAt = f; firstCol = ((((s.g.sx[n] ?? 0) - 0x0c) & 0xff) >> 2) - 4; }
        if (firstAt >= 0) { inks.add(s.g.col[24 * 40 + 12] ?? 0); if (tuneWanted(s.g, WORLD.music.tuneFor?.(arr.room) ?? null).cut) chasing = true; }
        if (!enhanced && go === 0 && firstAt >= 0 && [0, 12, 30].includes(f - firstAt)) snap(arr.strip, s.g);
      }
      const ok = firstAt >= 0 && firstCol <= arr.at.col + 2 && inks.has(2) && chasing && stings > was && !dead(s.g);
      if (!ok) fair = false;
      goes.push(`${go === 0 ? 'in' : `death ${go}`}: seen at frame ${firstAt}, col ${firstCol}, name inks ${[...inks].join('/')}, chase ${chasing}, sting ${stings > was}`);
    }
    check(`${mode}: in room ${arr.room} Viktor steps in at the edge Monty came by a moment behind him, the name flashing, the sting and the chase's tune, and again after each of three deaths (${goes.join('; ')})`, fair);
  }
});

// ---- the cameos -------------------------------------------------------------------------------------
/**
 * Where Monty comes in for each border cameo (the floor at the edge he came in by) and where he is when it starts: the column just past its box (the box is the near side of the room, and the cameo starts
 * as he leaves it), on the floor he stands on there. He stands there all through: the nearest he is to Viktor unless he turns back on purpose. (Moscow's: he comes in high over the platform and the drop
 * takes him out of the box.)
 */
const FLOORS: ReadonlyMap<number, { entry: number; past: number }> = new Map([
  [CHI.wall, { entry: 17, past: 17 }], // in on the road; in the tunnel under the Great Wall
  [JP.harbour, { entry: 17, past: 11 }], // in on the junk's deck; up the market's stair of crates, across the inlet
  [R.arms, { entry: 8, past: 14 }], // in along the canopy; on the forest floor past the Redeemer's pedestal, at the east ladder
]);
const floorsOf = (c: CameoSpec, i: number) => must(FLOORS.get(c.room), `the floors Monty is on as cameo ${i + 1} waits and starts (FLOORS)`);
const pastOf = (c: CameoSpec, i: number) => c.after !== undefined ? { col: 1, floor: 14 } // (the moon's room: by the shrine where the hood is)
  : c.room === ROOM.station ? { col: 16, floor: 3 } : { col: c.when.col1 + 1, floor: floorsOf(c, i).past };
const viktorOn = (g: Game, c: CameoSpec) => ((g.vic.enable >> c.sprite) & 1) === 1 && (g.vic.sprites[c.sprite]?.ptr ?? 0) >= c.first && (g.vic.sprites[c.sprite]?.ptr ?? 0) < c.first + 8;
/** Cells between Viktor's sprite and Monty, the larger of across and down (cameos.ts's own measure). */
const apart = (g: Game, c: CameoSpec) => cellsApart(g, g.sx[c.sprite] ?? 0, g.sy[c.sprite] ?? 0);
// the worn costume is drawn on sprite 7 (game.ts `placeOverlay`, every frame he wears one: the ushanka from Siberia to the rice hat, then the rest), so a cameo there would be written over by it
const onHat = WORLD.cameos.filter((c) => c.sprite === 7).map((c) => c.room);
check(`no cameo is on sprite 7, the worn costume's (${onHat.length ? `rooms ${onHat.join()}` : 'none is'})`, onHat.length === 0);
for (const enhanced of [false, true]) {
  const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';
  WORLD.cameos.forEach((c, i) => {
    const from = c.from?.[0] ?? c.room;
    const after = c.after;
    SCOPE.section([c.room, from], `cameo ${i + 1} (room ${c.room})`, () => {
      const s = newGame(WORLD, enhanced);
      const m = c.move;
      // in from the border's room, at the edge he came by (or dropping in, for Moscow's gorge; by the shrine where the hood is, for the moon)
      enterRoom(s.g, from, 0x0c + (4 + 4) * 4, standY(18));
      const past = pastOf(c, i);
      const walksOn = after === undefined && c.room !== ROOM.station;
      const entry = walksOn ? { col: 1, floor: floorsOf(c, i).entry } : past;
      enterRoom(s.g, c.room, 0x0c + (entry.col + 4) * 4, standY(entry.floor));
      for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
      // at the edge he came in by, it waits
      for (let f = 0; f < 40 && walksOn; f++) frame(s, NONE);
      const waited = !walksOn || (s.g.cameos.length > 0 && s.g.cameos.every((k) => !k.begun));
      if (walksOn) placeAt(s.g, past);
      s.g.graceActive = () => true; // (the room's creatures are not what is looked at: whether the cameo plays, and is out of the collision check)
      let shown = 0, masked = true, alive = true, lastOn = -1, nearest = 99, backward = 0, lastX = -1;
      const toward = Math.sign(m.at.col - m.from);
      for (let f = 0; f < 600 && s.g.roomId === c.room; f++) {
        if (after !== undefined && f === 30) s.g.siCollected[after] = 0x81;
        frame(s, NONE);
        if (dead(s.g)) { alive = false; break; }
        const on = viktorOn(s.g, c);
        if (on) {
          shown++; lastOn = f; nearest = Math.min(nearest, apart(s.g, c)); if (!((s.g.uncounted >> c.sprite) & 1)) masked = false;
          const x = s.g.sx[c.sprite] ?? 0;
          if (lastX >= 0 && Math.sign(x - lastX) === -toward) backward++;
          lastX = x;
        }
        if (!enhanced && on && shown === m.hold / 2 + 20) snap('6-cameos', s.g);
      }
      if (m.pose === 'fist') {
        // a chase stopped short: he runs on toward Monty, never back, and is still at the brink when the frames run out (until Monty leaves the room)
        const atBrink = viktorOn(s.g, c) && (s.g.sx[c.sprite] ?? 0) === colX2(m.at.col);
        check(`${mode}: cameo ${i + 1} (room ${c.room}, from ${from}) waits while Monty is by the edge he came in by, then Viktor runs on after him (${backward} frames of going back), is stopped at the brink (column ${m.at.col}) and stays there, shown ${shown} frames, on a sprite no part of the collision check`,
          waited && backward === 0 && atBrink && lastOn === 599 && masked && alive);
        // Monty goes back to him (OPEN ARMS's coin under the canopy, its west arm's snack, the liana back up): Viktor is gone before Monty is ever within BORDER_CLEAR of him, never stood beside him
        let near = 99, goneAt = -1;
        const steps = 40;
        for (let f = 0; f <= steps && s.g.roomId === c.room; f++) {
          placeAt(s.g, { col: Math.round(past.col + (m.at.col - past.col) * f / steps), floor: Math.round(past.floor + (m.at.row - past.floor) * f / steps) });
          frame(s, NONE); frame(s, NONE); // (a frame for the placing to take, then the one measured)
          if (viktorOn(s.g, c)) near = Math.min(near, apart(s.g, c)); else if (goneAt < 0) goneAt = f;
        }
        check(`${mode}: cameo ${i + 1}: Monty coming back to the brink, Viktor is gone (step ${goneAt} of ${steps}) before Monty is within ${BORDER_CLEAR} cells of him (nearest while shown ${near})`, goneAt >= 0 && near >= BORDER_CLEAR);
      } else {
        const over = s.g.roomId !== c.room || s.g.cameos.every((k) => k.done);
        check(`${mode}: cameo ${i + 1} (room ${c.room}, from ${from}) waits while Monty is by the edge he came in by, then plays for ${shown} frames and is gone (last seen frame ${lastOn}), on a sprite no part of the collision check`, waited && shown >= Math.min(m.hold, 40) && over && masked && alive);
      }
      if (after === undefined) check(`${mode}: cameo ${i + 1}: Viktor is clearly too late, never near enough to have caught Monty: never within ${BORDER_CLEAR} cells of him (nearest ${nearest})`, nearest >= BORDER_CLEAR);
      // a death there (the room again from itself) does not play it again; a once-only one never again
      const again = { g: s.g, col: s.col };
      enterRoom(again.g, c.room, 0x0c + (entry.col + 4) * 4, standY(entry.floor));
      if (walksOn) placeAt(again.g, past);
      let twice = 0;
      for (let f = 0; f < 400 && again.g.roomId === c.room; f++) { if (after !== undefined && f === 30) again.g.siCollected[after] = 0x81; frame(again, NONE); if (viktorOn(again.g, c)) twice++; }
      check(`${mode}: cameo ${i + 1} does not play again on coming into the room from itself (a death)`, twice === 0);
    });
  });
}

if (out) {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, pics] of strips) contactSheet(out, `${name}.png`, pics);
}
SCOPE.report();
finish();
