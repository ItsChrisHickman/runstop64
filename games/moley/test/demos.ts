/**
 * The bot's games, recorded: the keys the bot (test/players.ts) pressed in each scenario, one character a pass (a key set is
 * 0-31, so one base-32 digit), in test/demos/<name>.keys. Planning is most of what playing a game with the bot costs (a map of
 * every place Monty can be, a search on copies of the game, every pass), and five tests play the same scenarios; they replay the
 * keys instead. The game is the rebuild of a fixed original, so the keys stay good; a replay that does not reach the end of its
 * scenario fails that test's own check (the ending, the game over), and `playthrough.ts record` and `hints.ts record` make them
 * again. The bot itself is run, live, by the slow set (`playthrough.ts live`, `hints.ts live`, `picture.ts` with bots 2, `flow.ts game`).
 *
 * Scenarios: room2, room5, game, over (lockstep runs from the original's states, test/playthrough.ts: the same keys wherever they are
 * played in lockstep) and hints (the rebuilt game alone with its own random numbers, test/hints.ts).
 */
import fs from 'node:fs';
import type { Spectrum } from '../../../tools/zx/spectrum';
import type { Game } from '../src/game';
import { pressKeys } from './bot';
import type { Driver } from './lockstep-core';

export type DemoName = 'room2' | 'room5' | 'game' | 'over' | 'hints';

const file = (name: DemoName): string => `games/moley/test/demos/${name}.keys`;

/** A recorded game's keys, from its file. */
export function readDemo(name: DemoName): number[] {
  const text = fs.readFileSync(file(name), 'utf8').trim();
  return [...text].map((c) => {
    const key = parseInt(c, 32);
    if (Number.isNaN(key)) throw new Error(`${file(name)}: "${c}" is not a key set`);
    return key;
  });
}

export function writeDemo(name: DemoName, keys: readonly number[]): void {
  fs.writeFileSync(file(name), `${keys.map((k) => k.toString(32)).join('')}\n`);
}

/** Presses a recorded game's keys, a pass at a time (nothing once they are over). */
export class Replay implements Driver {
  private at = 0;
  constructor(private readonly recorded: readonly number[]) {}
  /** the keys of the next pass */
  next(): number { return this.recorded[this.at++] ?? 0; }
  choose(m: Spectrum): void { pressKeys(m, this.next()); }
}

export const replayOf = (name: DemoName): Replay => new Replay(readDemo(name));

/** Presses what `bot` would and notes it (to record a scenario). */
export class Recording implements Driver {
  readonly keys: number[] = [];
  constructor(private readonly bot: { keys(g: Game): number }) {}
  choose(m: Spectrum, g: Game): void {
    const keys = this.bot.keys(g);
    this.keys.push(keys);
    pressKeys(m, keys);
  }
}
