/**
 * Rooms played to their ends, in lockstep with the original: a bot (test/players.ts, test/bot.ts) plays, the original runs its keys,
 * and every pass of the rebuilt game is compared with it (test/lockstep-core.ts). Room 2 (the platform built by rewriting the map, the
 * puzzle, the prize) and room 5 (the carrying and delivering that ends the game) are the two the notes called least understood;
 * then the whole game from the first room to the ending; and the bot with no life to spare, which is killed in room 2 (the fall into the
 * pit after the platform is built) and ends the game: the game over compared like every other pass.
 *
 * The bot's keys are replayed from test/demos (test/demos.ts says why). `live` plans them again with the bot, as the slow set does;
 * `record` plans them and writes the demos.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/playthrough.ts [2] [5] [game] [over] [live|record]
 */
import { check, finish } from '../../../games/shared/test/check';
import { A, type Driver, Run, Tally } from './lockstep-core';
import { type DemoName, Recording, replayOf, writeDemo } from './demos';
import { Player } from './players';

const STATES = 'games/moley/build';

/** Report one run: what was compared and what differed. */
function report(name: string, tally: Tally, player: Player | null): void {
  console.log(`   ${name}: ${tally.passes} passes compared, ${tally.deaths} deaths, ${tally.randoms} random numbers fed, effects ${[...tally.sounds].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k} x${n}`).join(' ')}${player ? `; ${player.stats}` : ''}`);
  if (player) console.log(`   ${player.log.join('; ')}`);
  for (const f of tally.first) console.log(`   ${f.label} pass ${f.pass} room ${f.room} keys ${f.keys.toString(2).padStart(5, '0')}: ${f.what.join('; ')}`);
  if (tally.strayRestarts.length > 0) console.log(`   ${tally.strayRestarts.join('; ')}`);
}

const mode = process.argv.slice(2).includes('record') ? 'record' : process.argv.slice(2).includes('live') ? 'live' : 'replay';

/** Who plays a scenario: the recorded keys, or the bot (written down when recording). */
function playerFor(name: DemoName): { driver: Driver; bot: Player | null; done(): void } {
  if (mode === 'replay') return { driver: replayOf(name), bot: null, done() { /* nothing to keep */ } };
  const bot = new Player();
  if (mode === 'live') return { driver: bot, bot, done() { /* nothing to keep */ } };
  const recording = new Recording(bot);
  return { driver: recording, bot, done() { writeDemo(name, recording.keys); console.log(`   recorded ${name}: ${recording.keys.length} passes`); } };
}

/** Put Monty at a room's start with a full gauge and five lives. */
const atStart = (x: number, y: number) => (mem: Uint8Array): void => {
  mem[A.x] = x; mem[A.y] = y; mem[A.state] = 0; mem[A.phase] = 0; mem[A.gauge] = 0x7f; mem[A.lives] = 5;
};

function room2(): void {
  const tally = new Tally();
  const player = playerFor('room2');
  const run = new Run(tally, `${STATES}/room2.state`, 'room 2', false, atStart(0x04, 0x68));
  run.play(player.driver, 6000, (g) => g.room !== 2);
  player.done();
  report('room 2', tally, player.bot);
  check(`room 2 played to its end: the puzzle, the prize (+400), the way out to room 3; ${tally.passes} passes, all equal to the original`, run.game.room === 3 && tally.mismatches === 0 && run.game.score >= 400);
}

function room5(): void {
  const tally = new Tally();
  const player = playerFor('room5');
  const run = new Run(tally, `${STATES}/room5.state`, 'room 5', false, atStart(0x28, 0x70));
  run.play(player.driver, 8000);
  player.done();
  report('room 5', tally, player.bot);
  check(`room 5 played to its end: four newspapers carried from the pile to the NEWS shop, the last giving +1000 and the ending; ${tally.passes} passes, all equal to the original`, run.last === 'ended' && tally.endings === 1 && tally.mismatches === 0 && run.game.score >= 1000);
}

function wholeGame(): void {
  const tally = new Tally();
  const player = playerFor('game');
  const run = new Run(tally, `${STATES}/play.state`, 'the whole game', false, atStart(0x04, 0x64));
  run.play(player.driver, 14000);
  player.done();
  report('the whole game', tally, player.bot);
  check(`the whole game played from the first room to the ending; ${tally.passes} passes, all equal to the original`, run.last === 'ended' && tally.endings === 1 && tally.mismatches === 0);
}

function gameOver(): void {
  const tally = new Tally();
  const player = playerFor('over');
  const run = new Run(tally, `${STATES}/play.state`, 'no life to spare', false, (mem) => {
    atStart(0x04, 0x64)(mem);
    mem[A.lives] = 0;
  });
  run.play(player.driver, 14000);
  player.done();
  report('the whole game with no life to spare', tally, player.bot);
  check(`the bot with no life to spare was killed and the game was over; ${tally.passes} passes, all equal to the original`, run.last === 'over' && tally.gameOvers === 1 && tally.mismatches === 0 && run.game.lives < 0);
}

const wanted = process.argv.slice(2).filter((a) => a !== 'live' && a !== 'record');
if (wanted.length === 0 || wanted.includes('2')) room2();
if (wanted.length === 0 || wanted.includes('5')) room5();
if (wanted.length === 0 || wanted.includes('game')) wholeGame();
if (wanted.length === 0 || wanted.includes('over')) gameOver();
finish();
