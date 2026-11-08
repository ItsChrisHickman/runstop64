/**
 * Wanted: Monty Mole's save: the game as it stands at the start of a room (taken as Monty comes into one, after a death too, so the lives lost stay lost). Storing it,
 * ENTER CONTINUE and CONTINUE? are the shared ContinueFlow's (games/shared/continue.ts, saves.ts); this is what goes into a save and how a game is put back from one.
 *
 * It is the game's own state (`Game.save`: every number the game keeps: Monty, the coal flags, the enemies, the lives, the score, the generator, the opening scene's variables,
 * the record of the last room): about 450 numbers. The picture is made again by entering the room (`Game.enter`: the room drawn, the things of it from the room table,
 * the coal that is left), which is what the original does at the start of every room.
 */
import { readsFormat, type SaveCodec } from '../../shared/continue';
import { readJson, S } from '../../shared/guards';
import { StateReader, StateWriter } from '../../shared/state';
import { ROOM_COUNT } from './map';
import { Game, START_LIVES } from './game';

const save = S.object({
  v: S.literal(1),
  /** the room, the lives and the score, for the save manager (they are in `numbers` too) */
  room: S.number,
  lives: S.number,
  score: S.number,
  /** `Game.save`'s numbers */
  numbers: S.numbers,
});
export type MontySave = S.Infer<typeof save>;

/** What a game's numbers are (every part writes the same number of them). */
const STATE_LENGTH = (() => { const w = new StateWriter(); new Game().save(w); return w.numbers.length; })();

/** A save read back (from JSON in storage), checked: it is one of this game's and a game can be made from it. */
export const MontySave = S.refine(save, (s) => Number.isInteger(s.room) && s.room >= 0 && s.room < ROOM_COUNT && s.numbers.length === STATE_LENGTH && s.numbers.every(Number.isInteger));

/** The game as a save. */
export function snapshotOf(game: Game): MontySave {
  const w = new StateWriter();
  game.save(w);
  return { v: 1, room: game.room, lives: game.lives, score: game.score.value, numbers: w.numbers };
}

/**
 * A game as the save has it, at the start of its room. `lost`: after losing the last life, a new game's lives (the room, the coal taken and the score stay: finishing or dying
 * never wipes progress). The room is entered (drawn) and the control is the keyboard's (the one our keys are made into).
 */
export function restoreGame(s: MontySave, lost: boolean): Game {
  const game = new Game();
  game.load(new StateReader(s.numbers));
  if (lost) game.lives = START_LIVES;
  game.enter();
  return game;
}

/** Saves as bytes: their JSON (format 1). */
export const CODEC: SaveCodec<MontySave> = {
  format: 1,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, format) => {
    readsFormat('Wanted: Monty Mole', format, 1);
    const v = readJson(String.fromCharCode(...b));
    if (!MontySave(v)) throw new Error('not a Wanted: Monty Mole save');
    return v;
  },
};
