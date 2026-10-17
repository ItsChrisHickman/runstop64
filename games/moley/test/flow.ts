/**
 * The whole game's flow against the original, frame by frame (test/flow-core.ts says how): from the credits page, through a jump key
 * and the start of a game; to the pass in which the last delivery is made (the Christmas card and its scroller, any key, the
 * credits page again, a second game); and to the pass in which the last life is lost (the death pictures, GAME OVER, the credits
 * page, a second game). The passes before the last are played by a bot or a random player on the original, in lockstep with the rebuilt
 * game (test/lockstep-core.ts); the flow takes over at the start of the last pass.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/flow.ts [scenarios: boot ending ending-held over over-hazard over-bot]
 *   nice -n 15 node tools/test.mjs games/moley/test/flow.ts game      the whole game played by the bot to the ending
 */
import { check, finish } from '../../../games/shared/test/check';
import { bootedSpectrum, readRom, readTape, typeLoad } from '../../../tools/zx/boot';
import { MoleyFlow } from '../src/flow';
import { mulberry } from './lockstep-core';
import { Player } from './players';
import { RandomPlayer } from './random-player';
import { atStart, compare, Counts, drive, either, type End, follow, holding, idle, noKeys, Queue, reach, Recorder, type Script, type Span } from './flow-core';

const STATES = 'games/moley/build';
const wanted = process.argv.slice(2);
const want = (name: string): boolean => (wanted.length === 0 ? name !== 'game' : wanted.includes(name));
const total = new Counts();

function report(label: string, counts: Counts, spans: readonly Span[]): void {
  const phases = [...counts.byPhase].map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`   ${label}: ${counts.total} frames compared (${phases}): ${counts.same} same, ${counts.apart} a frame apart, ${counts.torn} torn, ${counts.transition} in a screen being drawn, ${counts.different} different; ${spans.length} steps`);
  console.log(`     where: ${[...counts.where].map(([k, n]) => `${k} ${n}`).join(', ')}`);
  for (const line of counts.odd) console.log(`     ${line}`);
  total.add(counts);
}

// ---- from the credits page ----------------------------------------------------------------------------------------------

if (want('boot')) {
  const m = bootedSpectrum(readRom());
  m.tape = readTape('games/moley/build/moley.tap');
  const rec = new Recorder(m, [0xa0ce, 0xa0da, 0xa0fb, 0x822f], 2000);
  typeLoad(m);
  // run to the credits page, then hold the jump key while it looks for a joystick (it is not read), press it again once the text runs
  // (the program enters the credits page at another point of the frame than a restart does: its wait ends a frame sooner, so the
  // flow starts a frame before the 4 it takes to unpack)
  for (let f = 0; f < 400 && rec.frames(0xa0da).length === 0; f++) rec.record(1, noKeys);
  const unpacked = rec.frames(0xa0da)[0];
  const credits = unpacked - 5;
  const script: Script = either(holding('SPACE', credits + 10, credits + 30), holding('SPACE', credits + 100, credits + 103));
  rec.record(260, script);
  const detected = rec.frames(0xa0fb)[0], started = rec.frames(0x822f);
  console.log(`   boot: the credits page unpacked at frame ${unpacked}, the scroller from +${detected - unpacked}; the first pass ${started[0] - (credits + 100)} frames after the jump key`);
  const queue = new Queue(rec.reads);
  const flow = new MoleyFlow(queue);
  const spans = drive(flow, credits, rec.last, script);
  report('boot', compare(rec, spans, 'boot', unpacked), spans);
  check(`boot: the flow took the random bytes the original read (${queue.over} too many asked)`, queue.over === 0);
}

// ---- to the pass in which the game ends ---------------------------------------------------------------------------------

/** Run the original on after its last pass with a script, and the flow beside it, and compare. */
function after(label: string, e: End, script: Script, frames: number): void {
  const { spans, queue } = follow(e, script, frames);
  const counts = compare(e.rec, spans, label);
  const at = (pc: number): string => e.rec.frames(pc).map((f) => f - e.p0).join(',');
  const next = e.rec.frames(0x822f).filter((f) => f > e.end).slice(0, 3).map((f) => f - e.p0).join(',');
  console.log(`   ${label}: the last pass began at frame ${e.p0}; ${e.outcome === 'ended' ? 'the card' : 'GAME OVER'} at +${at(e.outcome === 'ended' ? 0x82da : 0x8292)}, restart +${at(0x81bc)}, unpacked +${at(0xa0da)}, scroller +${at(0xa0fb)}, the next game's first passes +${next}`);
  report(label, counts, spans);
  check(`${label}: the lockstep run before the last pass had ${e.tally.mismatches} differences, and the rebuilt last pass came out ${e.outcome} as the original's did`, e.tally.mismatches === 0);
  check(`${label}: the flow took the random bytes the original read (${queue.over} too many asked)`, queue.over === 0);
}

if (want('ending')) {
  const e = reach('room 5 to the ending', `${STATES}/room5.state`, atStart(0x28, 0x70), new Player(), 8000);
  check('a bot played room 5 to the ending', e !== null && e.outcome === 'ended');
  if (e !== null) {
    const t = e.end;
    // the card runs; a key that is not the jump key takes it to the credits page, which waits, runs, and starts a second game
    after('the ending, then a second game', e, either(holding('Z', t + 150, t + 153), holding('SPACE', t + 150 + 48 + 40, t + 150 + 48 + 43)), 340);
  }
}

if (want('ending-held')) {
  const e = reach('room 5 to the ending (a key held)', `${STATES}/room5.state`, atStart(0x28, 0x70), new Player(), 8000);
  check('a bot played room 5 to the ending, a key held through the card', e !== null && e.outcome === 'ended');
  if (e !== null) {
    const t = e.end;
    // a key held from the last pass is waited out before the text runs; then the jump key held through the credits page's wait starts a game as the text starts
    after('the ending with a key held', e, either(holding('O', t, t + 40), holding('SPACE', t + 100, t + 100 + 200)), 330);
  }
}

if (want('game')) {
  const e = reach('the whole game to the ending', `${STATES}/play.state`, atStart(0x04, 0x64), new Player(), 14000);
  check('a bot played the whole game to the ending', e !== null && e.outcome === 'ended');
  if (e !== null) {
    const t = e.end;
    after('the whole game, the ending, then a second game', e, either(holding('Z', t + 150, t + 153), holding('SPACE', t + 150 + 48 + 40, t + 150 + 48 + 43)), 340);
  }
}

if (want('over')) {
  // the gauge runs out with no life left: the dial flashes, the death pictures, the room again, GAME OVER
  const e = reach('time out, no life left', `${STATES}/play.state`, atStart(0x04, 0x64, 0, 3), idle, 5000);
  check('the gauge ran out with no life left: game over', e !== null && e.outcome === 'over');
  if (e !== null) {
    const t = e.end;
    after('game over by time out, then a second game', e, holding('SPACE', t + 100 + 48 + 30, t + 100 + 48 + 33), 270);
  }
}

if (want('over-hazard')) {
  let n = 0;
  for (const room of [3, 1, 4, 0]) {
    const e = reach(`killed in room ${room}`, `${STATES}/room${room}.state`, atStart(room === 3 ? 0x18 : 0x04, room === 3 ? 8 : 0x78, 0, 0x7f), new RandomPlayer(mulberry(40 + room)), 3000);
    if (e === null || e.outcome !== 'over') { console.log(`   room ${room}: no game over in 3000 passes`); continue; }
    n++;
    const t = e.end;
    // the jump key held through the death and the credits page's wait: the game starts as the text does
    after(`game over in room ${room}, the jump key held`, e, holding('SPACE', t + 60, t + 100 + 48 + 20), 230);
  }
  check(`random players with no life to spare were killed in ${n} rooms`, n >= 2);
}

if (want('over-bot')) {
  // the bot plays rooms 0 and 1 and into room 2 with no life to spare, and falls into the pit
  const e = reach('the bot with no life to spare', `${STATES}/play.state`, atStart(0x04, 0x64, 0), new Player(), 14000);
  check('the bot with no life to spare ended the game', e !== null && e.outcome === 'over');
  if (e !== null) {
    const t = e.end;
    after('game over in room 2 after a game the bot played, then a second game', e, holding('SPACE', t + 100 + 48 + 30, t + 100 + 48 + 33), 270);
  }
}

console.log(`   in all: ${total.total} frames the original showed: ${total.same} the flow's frame, ${total.apart} a frame apart, ${total.torn} torn, ${total.transition} while a screen was drawn, ${total.different} different`);
check(`every frame the original showed is the flow's frame, a frame apart, or torn between them (${total.different} of ${total.total} are not)`, total.different === 0);
finish();
