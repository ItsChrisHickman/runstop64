/**
 * Moley Christmas's save: the game as it stands at the start of a screen (taken as Monty comes into one, after a death too, so the lives
 * lost stay lost). Storing it, ENTER CONTINUE and CONTINUE? are the shared ContinueFlow's (games/shared/continue.ts, saves.ts); this is
 * what goes into a save and how a game is put back from one.
 *
 * It is the game's own `snapshot()`: every number the game keeps (Monty, the entities, the items, the scripts' variables, lives, score),
 * plus the room's map and attributes, which room 2 rewrites and the item inks change, kept as what differs from the data's own (a few
 * numbers, not 8 K). The random numbers are not kept: a game put back plays on with a new seed. The picture is made again from the game.
 */
import { readsFormat, type SaveCodec } from '../../shared/continue';
import { readJson, S } from '../../shared/guards';
import { mapMemory, roomAttrs } from './data';
import { Game, START_LIVES, type GameSnapshot } from './game';
import { SeededRandom, type Random } from './random';
import { SCREENS } from './map';

const save = S.object({
  v: S.literal(1),
  /** the screen, the lives and the score, for the save manager (they are in `numbers` too) */
  room: S.number,
  lives: S.number,
  score: S.number,
  /** `Game.snapshot().numbers` */
  numbers: S.numbers,
  /** the maps and attribute tables ($6000-$80FF) that differ from the data's own: index, value, index, value... */
  map: S.numbers,
  /** the room's attributes as shown that differ from the room's own: index, value, ... */
  attrs: S.numbers,
});
export type MoleySave = S.Infer<typeof save>;

/** What a snapshot's numbers are in a game (a fresh game's: every part writes the same number of them). */
const SNAPSHOT_LENGTH = new Game(new SeededRandom(0)).snapshot().numbers.length;

/** What differs between two byte arrays of one size, as index, value pairs. */
function differences(base: Uint8Array, now: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < now.length; i++) if (now[i] !== base[i]) out.push(i, now[i]);
  return out;
}

/** Whether pairs are index, value with the indexes under `size` and the values bytes. */
function pairsOf(pairs: readonly number[], size: number): boolean {
  if (pairs.length % 2 !== 0) return false;
  for (let i = 0; i < pairs.length; i += 2) {
    if (!Number.isInteger(pairs[i]) || pairs[i] < 0 || pairs[i] >= size || !Number.isInteger(pairs[i + 1]) || pairs[i + 1] < 0 || pairs[i + 1] > 255) return false;
  }
  return true;
}

function patched(base: Uint8Array, pairs: readonly number[]): Uint8Array {
  const out = base.slice();
  for (let i = 0; i < pairs.length; i += 2) out[pairs[i]] = pairs[i + 1];
  return out;
}

const MEMORY = mapMemory().length;
const ROOM_ATTRS = roomAttrs(0).length;

/** A save read back (from JSON in storage), checked: it is one of this game's and a game can be made from it. */
export const MoleySave = S.refine(save, (s) =>
  Number.isInteger(s.room) && s.room >= 0 && s.room < SCREENS && s.numbers.length === SNAPSHOT_LENGTH && pairsOf(s.map, MEMORY) && pairsOf(s.attrs, ROOM_ATTRS));

/** The game as a save. */
export function snapshotOf(game: Game): MoleySave {
  const s = game.snapshot();
  return {
    v: 1,
    room: game.room,
    lives: game.lives,
    score: game.score,
    numbers: [...s.numbers],
    map: differences(mapMemory(), s.map),
    attrs: differences(roomAttrs(game.room), s.attrs),
  };
}

/**
 * A game as the save has it, at the start of its screen. `highScore`: the best the browser has kept (a save may be older than it). `lost`:
 * after losing the last life, a new game's lives and score from nothing, in the screen he was in.
 */
export function restoreGame(s: MoleySave, rng: Random, highScore: number, lost: boolean): Game {
  const game = new Game(rng, false);
  const snapshot: GameSnapshot = { numbers: s.numbers, map: patched(mapMemory(), s.map), attrs: patched(roomAttrs(s.room), s.attrs) };
  game.restore(snapshot);
  game.highScore = Math.max(game.highScore, highScore);
  if (lost) {
    game.lives = START_LIVES;
    game.score = 0;
  }
  return game;
}

/** Saves as bytes: their JSON (format 1). */
export const CODEC: SaveCodec<MoleySave> = {
  format: 1,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, format) => {
    readsFormat('Moley Christmas', format, 1);
    const v = readJson(String.fromCharCode(...b));
    if (!MoleySave(v)) throw new Error('not a Moley Christmas save');
    return v;
  },
};
