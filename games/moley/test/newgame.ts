/**
 * A new game, against the original: the state the game starts from after the credits page (a jump key), and the state of a second
 * game after a first has been played to its ending (the high score kept, the maps and the scripts' variables as the first game left
 * them: the original does not set them up again, and neither does the rebuilt game).
 *
 * The random bytes the original reads on the way (the colours of the first room's items) are fed to the rebuilt game's new game.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/newgame.ts
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { press, Spectrum } from '../../../tools/zx/spectrum';
import { Game } from '../src/game';
import type { Random } from '../src/random';
import { A, differences, PASS_START, Run, Tally } from './lockstep-core';
import { replayOf } from './demos';

const STATES = 'games/moley/build';

/** The bytes the original reads, in order, handed out one at a time. */
class Bytes implements Random {
  private at = 0;
  constructor(private readonly bytes: readonly number[]) {}
  byte(): number { return this.bytes[this.at++] ?? 0; }
}

/**
 * Press the jump key on `m` until the original gets to the first pass of a game, noting the random bytes it reads on the way.
 * Returns them, or null if no game started.
 */
function startGame(m: Spectrum): number[] | null {
  const read: number[] = [];
  let waiting = false;
  class FirstPass {} // thrown to stop the machine at that instruction, before it runs
  m.onStep = (pc) => {
    if (waiting) { read.push(m.cpu.regs[7]); waiting = false; }
    if (pc === 0x861a || pc === 0x9ece) waiting = true;
    if (pc === PASS_START) throw new FirstPass();
  };
  try {
    for (let f = 0; f < 3000; f++) {
      m.releaseAll();
      press(m, 'SPACE', f % 40 < 4); // (the ending and the credits page each wait for a key: a few presses)
      m.runFrame();
    }
  } catch (e) {
    if (e instanceof FirstPass) return read;
    throw e;
  } finally {
    m.onStep = null;
  }
  console.log(`   no game started: pc ${m.cpu.pc.toString(16)} frame ${m.frame}`);
  return null;
}

const rom = readRom();

// ---- from the credits page ---------------------------------------------------------------------------------------

{
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(`${STATES}/title.state`)));
  const read = startGame(m);
  const game = read === null ? null : new Game(new Bytes(read));
  const bad = game === null ? ['no game started'] : differences(game, m.mem);
  check(`a new game from the credits page: the rebuilt game's first state equals the original's (${bad.slice(0, 3).join('; ') || 'no differences'}; ${read?.length ?? 0} random bytes read)`, bad.length === 0);
}

// ---- a second game, after the first has been played to its ending ------------------------------------------------

{
  const tally = new Tally();
  const run = new Run(tally, `${STATES}/play.state`, 'the first game', false, (mem) => {
    mem[A.x] = 0x04; mem[A.y] = 0x64; mem[A.state] = 0; mem[A.phase] = 0; mem[A.gauge] = 0x7f; mem[A.lives] = 5;
  });
  run.play(replayOf('game'), 14000); // (the bot's recorded game: test/demos.ts)
  check(`the first game played to its ending (${tally.passes} passes, ${tally.mismatches} differences), score ${run.game.score}`, run.last === 'ended' && tally.mismatches === 0);
  const read = startGame(run.m);
  const game = run.game;
  const before = game.score;
  if (read === null) check('a second game started', false);
  else {
    run.fed.start(); // (the original keeps its memory between games, so the first game's object is the one that starts again, with the bytes the original read)
    run.fed.queue.push(...read);
    game.newGame();
    const bad = differences(game, run.m.mem);
    check(`a second game after the ending: the rebuilt newGame() equals the original's start (${bad.slice(0, 4).join('; ') || 'no differences'}); the high score is the first game's ${before}`, bad.length === 0 && game.highScore === before);
  }
}
finish();
