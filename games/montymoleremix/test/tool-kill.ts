/**
 * The tool kills the creature it touches, and the creature never touches him again: room 11 (ROOM 12 on the map), the fish at the top left that bars
 * the way up (`TOOL_TARGET`), against Wanted running on the headless Spectrum.
 *
 * The fish sits on a ledge a step above the floor to its right, so walking left stops at the step, short of it; the way is a jump left into it.
 *
 * - **The original** (`games/montymole/test/lockstep-core.ts`): Wanted set down in room 11 just right of the fish, on the floor under its ledge, with the
 *   tool in hand, walking left and jumping left, in lockstep with the faithful game: no difference; walking, the step stops him (tool kept, fish there);
 *   jumping, the tool is spent, the fish is gone (state 3) and he is alive on its ledge.
 * - **The remix, the same**: set down at the same place with the tool, jumping (and walking) left from 16 moments of the fish's animation, in ORIGINAL and
 *   in ENHANCED: every jump spends the tool on the fish, the fish leaves the picture and he lives; walking stops at the step.
 * - **The remix, played**: from the way into the room at the left, the passability bot takes the tool and then makes for the way up; from each of
 *   the last frames before the touch on that way, Monty walks or jumps left into the fish. Every touch spends the tool on the fish, and none kills
 *   him. (A creature the tool took stayed in the frame drawn after its death, whose collisions the next frame read: he died one frame after
 *   killing it, every jump from the set-down place.)
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/tool-kill.ts
 */
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import { check, finish } from '../../shared/test/check';
import type { MontyInput } from '../../shared/monty/body';
import { EnemyState } from '../../montymole/src/enemy-rules';
import { A, Run, Tally, type Driver } from '../../montymole/test/lockstep-core';
import { VIC_LEFT, VIC_TOP, WANTED_TOP } from '../src/coords';
import { ARRIVE_LEFT_X2, RemixGame } from '../src/game';
import { arrive, factsOf, RoomMap, search, sticksOf } from './bot';
import { copyPlay } from './bot-copy';
import { NONE, step, type Play } from './harness';

const ROOM = 11;
const FISH = 0;
/** Just right of the fish (x 40, y 167, its tail end a line above his head), standing on the ledge it guards. */
const AT = { x: 56, y: 159 } as const;
const STATE = 'games/montymole/build/room0.state';
const LEFT: MontyInput = { ...NONE, left: true };
const JUMP_LEFT: MontyInput = { ...NONE, left: true, fire: true };

// ---- the original -------------------------------------------------------------------------------------------------------------

/** Holds O (left) on the original's keyboard, with SPACE (jump) on the first pass when asked. */
class HoldLeft implements Driver {
  private passes = 0;
  constructor(private readonly jump: boolean) {}
  choose(m: Spectrum): void {
    press(m, 'O', true);
    press(m, 'SPACE', this.jump && this.passes === 0);
    this.passes++;
  }
}

function place(m: Spectrum): void {
  const mem = m.mem;
  const w = (a: number, v: number): void => { mem[a] = v & 255; };
  w(A.room, ROOM); w(A.x, AT.x); w(A.y, AT.y); w(A.arrival, AT.x); w(A.arrival + 1, AT.y);
  w(A.input, 4); w(A.flags, 8); w(A.flags2, 0); w(A.fallen, 0); w(A.jumpDir, 0); w(A.jumpCount, 0);
  w(A.arc, 0x869c); w(A.arc + 1, 0x86); w(A.pitch, 0xfa); w(A.pitch + 1, 0);
  m.cpu.pc = 0x940c;
  m.cpu.halted = false;
}

for (const jump of [false, true]) {
  const tally = new Tally();
  const what = jump ? 'jumping' : 'walking';
  const r = new Run(tally, STATE, `tool into the fish, ${what}`, 1, false, place, { coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true });
  const lives = r.m.mem[A.lives] ?? 0;
  if (process.env.TRACE_FISH !== undefined) r.hooks.passEnd = (o, mem) => { console.log(`   ${what} pass ${r.passes} ${o}: x ${mem[A.x]} y ${mem[A.y]} flags ${mem[A.flags]?.toString(16)} fish ${mem[A.enemies]} ${mem[A.enemies + 12]},${mem[A.enemies + 13]}`); };
  r.play(new HoldLeft(jump), 30);
  const mem = r.m.mem;
  for (const m of tally.first) console.log(`   pass ${m.pass}: ${m.what.join('; ')}`);
  check(`the original, ${what} left into room ${ROOM}'s fish with the tool: the faithful game in lockstep, ${tally.passes} passes, no difference`, tally.passes >= 25 && tally.mismatches === 0);
  const state = `flags ${mem[A.flags]?.toString(16)}, fish state ${mem[A.enemies + 20 * FISH]}, lives ${mem[A.lives]} of ${lives}, room ${mem[A.room]}`;
  const alive = mem[A.lives] === lives && mem[A.room] === ROOM && r.game.lastDeath === null;
  if (jump) check(`the original, jumping: the tool is spent, the fish is gone, he is alive on its ledge (${state})`, ((mem[A.flags] ?? 0) & 8) === 0 && mem[A.enemies + 20 * FISH] === EnemyState.none && alive);
  else check(`the original, walking: the ledge's step stops him short of the fish, the tool kept, the fish there, he alive (${state})`, ((mem[A.flags] ?? 0) & 8) !== 0 && mem[A.enemies + 20 * FISH] !== EnemyState.none && alive);
}

// ---- the remix -------------------------------------------------------------------------------------------------------------

interface Touch { readonly used: boolean; readonly died: boolean; readonly fishGone: boolean }

/** Monty holding a stick (jump on the first frame) for a while: whether the tool was spent, he died after, and the fish has left the picture. */
function into(p: Play, stick: MontyInput, frames = 90): Touch {
  let used = false, died = false;
  for (let f = 0; f < frames && p.g.roomId === ROOM; f++) {
    const had = p.g.carrying;
    step(p, f === 0 ? stick : { ...stick, fire: false });
    if (had && !p.g.carrying) used = true;
    if (p.g.actionCounter !== 0) { died = true; break; }
  }
  const fish = p.g.creatures[FISH];
  return { used, died, fishGone: fish !== undefined && fish.state === EnemyState.none && (p.g.vic.enable & 0b10) === 0 };
}

function summary(list: readonly Touch[]): string {
  return `${list.filter((t) => t.used).length} touches of ${list.length}, ${list.filter((t) => t.died).length} deaths`;
}

for (const enhanced of [false, true]) {
  const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';
  const walks: Touch[] = [], jumps: Touch[] = [];
  for (let wait = 0; wait < 16; wait++) {
    for (const stick of [LEFT, JUMP_LEFT]) {
      const g = new RemixGame();
      g.assist = { lives: enhanced, loops: enhanced };
      g.start(false);
      const px = VIC_LEFT + AT.x;
      g.travelTo(ROOM, px >> 1, VIC_TOP + WANTED_TOP - AT.y);
      g.stepGate = px & 1;
      const p: Play = { g, col: 0 };
      for (let i = 0; i < 20 && (i === 0 || g.freeze || g.script); i++) step(p, NONE);
      g.tool = null;
      g.carrying = true;
      for (let i = 0; i < wait; i++) step(p, NONE);
      (stick.fire ? jumps : walks).push(into(p, stick));
    }
  }
  check(`the remix (${mode}), set down as the original was, jumping left into the fish from 16 moments: ${summary(jumps)}; each a kill, the fish gone, no death`,
    jumps.every((t) => t.used && !t.died && t.fishGone));
  check(`the remix (${mode}), walking left as the original does: the ledge's step stops him short of the fish (${summary(walks)}), the tool kept, no death`,
    walks.every((t) => !t.used && !t.died));
}

/** Monty at the left of the room on a row, as the way in from room 10 puts him. */
function seed(row: number, enhanced: boolean): Play | null {
  const g = new RemixGame();
  g.assist = { lives: enhanced, loops: enhanced };
  g.start(false);
  g.travelTo(ROOM, ARRIVE_LEFT_X2, 50 + (3 + row) * 8);
  const p: Play = { g, col: 0 };
  for (let i = 0; i < 20 && (i === 0 || g.freeze || g.script); i++) g.frame(0);
  return g.roomId === ROOM ? arrive(p, ROOM) : null;
}

for (const enhanced of [false, true]) {
  const mode = enhanced ? 'ENHANCED' : 'ORIGINAL';
  const s = seed(13, enhanced);
  if (s === null) { check(`the remix (${mode}): a way into room ${ROOM} at the left`, false); continue; }
  const map = new RoomMap(factsOf(s.g));
  map.addStart(s.g);
  map.explore();
  const tool = search(s, map, { kind: 'tool' }, 6000);
  if (!('play' in tool)) { check(`the remix (${mode}): the bot takes room ${ROOM}'s tool`, false); continue; }
  const up = search(tool.play, map, { kind: 'exit', direction: 'up' }, 12000);
  if (!('play' in up)) { check(`the remix (${mode}): the bot finds the way up with the tool`, false); continue; }
  const sticks = sticksOf(tool.play, up.steps);
  // the frame of the way at which the tool is spent
  const replay = copyPlay(tool.play);
  let at = -1;
  sticks.forEach((stick, f) => { const had = replay.g.carrying; step(replay, stick); if (at < 0 && had && !replay.g.carrying) at = f; });
  check(`the remix (${mode}): the bot's way up from the tool spends it on the fish (frame ${at}) and goes up`, at >= 0 && replay.g.roomId === up.play.g.roomId && replay.g.roomId !== ROOM);
  const touches: Touch[] = [];
  for (let from = Math.max(0, at - 40); from <= at; from++) {
    for (const stick of [LEFT, JUMP_LEFT]) {
      const p = copyPlay(tool.play);
      for (let f = 0; f < from; f++) step(p, sticks[f] ?? NONE);
      if (p.g.carrying) touches.push(into(p, stick));
    }
  }
  const used = touches.filter((t) => t.used);
  check(`the remix (${mode}), played: the tool taken, then walking or jumping left into the fish from the last 40 frames of the way: ${summary(touches)}; every touch a kill and no death after it`,
    used.length >= 10 && used.every((t) => !t.died && t.fishGone));
}

finish();
