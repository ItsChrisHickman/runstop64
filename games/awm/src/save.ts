/**
 * Auf Wiedersehen Monty's save: what is needed to carry on from the start of a room (taken as Monty comes into it,
 * with him standing where he came in). Storing it, ENTER CONTINUE and CONTINUE? are the shared ContinueFlow's
 * (games/shared/continue.ts, games/shared/saves.ts); this is what goes into a save and how a game is put back from one.
 *
 * What the room itself holds (the cells, the enemies, the lift) is not kept: entering a room sets them, as the game does;
 * the items taken and carried, the counters, the random numbers and the animation clock are.
 */
import { readsFormat, type SaveCodec } from '../../shared/continue';
import { readJson, S } from '../../shared/guards';
import { ROOMS } from './data';
import { copySky, FRESH_SKY, isSky } from './flight';
import { Game, NEW_GAME_LIVES } from './game';
import type { Hand } from './picture';

const hand = S.nullable(S.object({ type: S.number, colours: S.numbers }));
/** What the flights leave in the machine ($784D-$785F ...: flight.ts `SkyState`). */
const sky = S.refine(S.object({
  clouds: S.numbers, slow: S.numbers, tick: S.number, scrollB: S.number, enemy: S.numbers, player: S.numbers,
  lean: S.number, explosion: S.number, hit: S.number, pointers: S.numbers,
}), isSky);
/** What a save holds besides its version and what the flights keep (format 1 saves have the same and no `flight`). */
const fields = {
  room: S.number,
  /** Where he came in: $4040-$4044. */
  entry: S.object({ x: S.number, y: S.number, state: S.number, step: S.number }),
  faceLeft: S.boolean,
  frame: S.number,
  counters: S.object({ walkPhase: S.number, walkFrame: S.number, walkToggle: S.number, climbPhase: S.number, slowToggle: S.number }),
  burnPicture: S.numbers,
  rng: S.object({ index: S.number, sum: S.number }),
  clock: S.object({ phase: S.number, frame: S.number, flip: S.number, toggle: S.number }),
  /** The list entries taken ($6D7B, bit 7 of the room byte), and the four hands ($6947). */
  taken: S.numbers,
  carried: S.numbers,
  /** The boxes as they were drawn: the item's type and colours, or null for an empty hand. */
  hands: S.array(hand),
  score: S.numbers,
  money: S.numbers,
  lives: S.number,
  progress: S.number,
  shield: S.number,
  bonus: S.number,
  bonusFlag: S.number,
  helped: S.number,
  quest: S.number,
  /** The title's choice ($4066) and the room tune playing ($4064). */
  soundFlag: S.number,
  tune: S.number,
};
const sound = (s: { room: number; burnPicture: number[]; carried: number[]; hands: unknown[]; score: number[]; money: number[] }): boolean =>
  !!ROOMS[s.room] && s.burnPicture.length === 8 && s.carried.length === 4 && s.hands.length === 4 && s.score.length === 5 && s.money.length === 5;
/** Format 1, as players have it: before the flight (a plane with a ticket) kept anything. */
const AwmSaveV1 = S.refine(S.object({ v: S.literal(1), ...fields }), sound);
export const AwmSave = S.refine(S.object({ v: S.literal(2), ...fields, flight: sky }), sound);
export type AwmSave = S.Infer<typeof AwmSave>;

export function snapshot(game: Game, hands: readonly (Hand | null)[]): AwmSave {
  const m = game.monty;
  return {
    v: 2,
    room: game.world.room,
    entry: { x: m.entryX, y: m.entryY, state: m.entryState, step: m.entryStep },
    faceLeft: m.faceLeft,
    frame: m.frame,
    counters: { ...m.counters },
    burnPicture: [...m.burnPicture],
    rng: { index: game.rng.index, sum: game.rng.sum },
    clock: { ...game.enemies.clock },
    taken: game.items.collected.flatMap((c, i) => (c ? [i] : [])),
    carried: [...game.items.carried],
    hands: hands.map((h) => (h ? { type: h.type, colours: [...h.colours] } : null)),
    score: [...game.score.digits],
    money: [...game.money.digits],
    lives: game.lives,
    progress: game.progress,
    shield: game.shield,
    bonus: game.bonus,
    bonusFlag: game.bonusFlag,
    helped: game.helped,
    quest: game.quest,
    soundFlag: game.soundFlag,
    tune: game.tune,
    flight: copySky(game.sky),
  };
}

/** A game as the save has it: in its room, Monty where he came in. `lost`: after losing the last life, a new game's lives and score from nothing. */
export function restore(save: AwmSave, lost = false): Game {
  const game = new Game(save.room, { carry: { rngIndex: save.rng.index, rngSum: save.rng.sum, clock: save.clock, counters: save.counters, sky: save.flight } });
  const m = game.monty;
  m.x = m.prevX = m.entryX = save.entry.x;
  m.y = m.prevY = m.entryY = save.entry.y;
  m.state = m.entryState = save.entry.state;
  m.step = m.entryStep = save.entry.step;
  m.faceLeft = save.faceLeft;
  m.frame = save.frame;
  m.burnPicture.set(save.burnPicture);
  for (const i of save.taken) if (i < game.items.collected.length) game.items.collected[i] = true;
  save.carried.forEach((t, i) => { game.items.carried[i] = t; });
  game.score.digits.splice(0, 5, ...save.score);
  game.money.digits.splice(0, 5, ...save.money);
  game.lives = save.lives;
  game.progress = game.progressSeen = save.progress;
  game.shield = save.shield;
  game.bonus = save.bonus;
  game.bonusFlag = save.bonusFlag;
  game.helped = save.helped;
  game.quest = save.quest;
  game.soundFlag = save.soundFlag;
  game.tune = save.tune;
  if (lost) {
    game.lives = NEW_GAME_LIVES;
    game.score.digits.fill(0);
  }
  game.reload();
  return game;
}

/** A save read back (from JSON in storage), checked: null if it isn't one. */
export const parseSave = (v: unknown): AwmSave | null => (AwmSave(v) ? v : null);

/** A format 1 save in the latest: the flights had left nothing in the machine (the program's own values). */
const upgrade = (old: S.Infer<typeof AwmSaveV1>): AwmSave => ({ ...old, v: 2, flight: copySky(FRESH_SKY) });

/** Saves as bytes: their JSON (format 2: with what the flights keep; format 1 is read, as a game that has not flown). */
export const CODEC: SaveCodec<AwmSave> = {
  format: 2,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, format) => {
    readsFormat('Auf Wiedersehen Monty', format, 1, 2);
    const v = readJson(String.fromCharCode(...b));
    if (format === 1) {
      if (!AwmSaveV1(v)) throw new Error('not an Auf Wiedersehen Monty save');
      return upgrade(v);
    }
    const s = parseSave(v);
    if (!s) throw new Error('not an Auf Wiedersehen Monty save');
    return s;
  },
};
