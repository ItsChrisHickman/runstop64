/**
 * Auf Wiedersehen Monty's save: what is needed to carry on from the start of a room (taken as Monty comes into it,
 * with him standing where he came in). Storing it, ENTER CONTINUE and CONTINUE? are the shared ContinueFlow's
 * (games/shared/continue.ts, games/shared/saves.ts); this is what goes into a save and how a game is put back from one.
 *
 * What the room itself holds (the cells, the enemies, the lift) is not kept: entering a room sets them, as the game does;
 * the items taken and carried, the counters, the random numbers and the animation clock are.
 */
import type { SaveCodec } from '../../shared/continue';
import { isBoolean, isNumber, isNumbers, isRecord } from '../../shared/guards';
import { ROOMS } from './data';
import { Game, NEW_GAME_LIVES } from './game';
import type { Hand } from './picture';

export interface AwmSave {
  v: 1;
  room: number;
  /** Where he came in: $4040-$4044. */
  entry: { x: number; y: number; state: number; step: number };
  faceLeft: boolean;
  frame: number;
  counters: { walkPhase: number; walkFrame: number; walkToggle: number; climbPhase: number; slowToggle: number };
  burnPicture: number[];
  rng: { index: number; sum: number };
  clock: { phase: number; frame: number; flip: number; toggle: number };
  /** The list entries taken ($6D7B, bit 7 of the room byte), and the four hands ($6947). */
  taken: number[];
  carried: number[];
  /** The boxes as they were drawn: the item's type and colours, or null for an empty hand. */
  hands: (Hand | null)[];
  score: number[];
  money: number[];
  lives: number;
  progress: number;
  shield: number;
  bonus: number;
  bonusFlag: number;
  helped: number;
  quest: number;
  /** The title's choice ($4066) and the room tune playing ($4064). */
  soundFlag: number;
  tune: number;
}

export function snapshot(game: Game, hands: readonly (Hand | null)[]): AwmSave {
  const m = game.monty;
  return {
    v: 1,
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
  };
}

/** A game as the save has it: in its room, Monty where he came in. `lost`: after losing the last life, a new game's lives and score from nothing. */
export function restore(save: AwmSave, lost = false): Game {
  const game = new Game(save.room, { carry: { rngIndex: save.rng.index, rngSum: save.rng.sum, clock: save.clock, counters: save.counters } });
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

const isEntry = (v: unknown): v is AwmSave['entry'] => isRecord(v) && isNumber(v.x) && isNumber(v.y) && isNumber(v.state) && isNumber(v.step);
const isCounters = (v: unknown): v is AwmSave['counters'] =>
  isRecord(v) && isNumber(v.walkPhase) && isNumber(v.walkFrame) && isNumber(v.walkToggle) && isNumber(v.climbPhase) && isNumber(v.slowToggle);
const isClock = (v: unknown): v is AwmSave['clock'] => isRecord(v) && isNumber(v.phase) && isNumber(v.frame) && isNumber(v.flip) && isNumber(v.toggle);
const isHand = (v: unknown): v is Hand | null => v === null || (isRecord(v) && isNumber(v.type) && isNumbers(v.colours));

/** A save read back (from JSON in storage), checked: null if it isn't one. */
export function parseSave(v: unknown): AwmSave | null {
  if (!isRecord(v) || v.v !== 1) return null;
  const { room, entry, faceLeft, frame, counters, burnPicture, rng, clock, taken, carried, hands, score, money } = v;
  const { lives, progress, shield, bonus, bonusFlag, helped, quest, soundFlag, tune } = v;
  if (!isNumber(room) || !isEntry(entry) || !isBoolean(faceLeft) || !isNumber(frame) || !isCounters(counters) || !isNumbers(burnPicture)) return null;
  if (!isRecord(rng) || !isNumber(rng.index) || !isNumber(rng.sum) || !isClock(clock)) return null;
  if (!isNumbers(taken) || !isNumbers(carried) || !Array.isArray(hands) || !hands.every(isHand) || !isNumbers(score) || !isNumbers(money)) return null;
  if (!isNumber(lives) || !isNumber(progress) || !isNumber(shield) || !isNumber(bonus) || !isNumber(bonusFlag) || !isNumber(helped) || !isNumber(quest) || !isNumber(soundFlag) || !isNumber(tune)) return null;
  if (!ROOMS[room] || burnPicture.length !== 8 || carried.length !== 4 || hands.length !== 4 || score.length !== 5 || money.length !== 5) return null;
  return { v: 1, room, entry, faceLeft, frame, counters, burnPicture, rng: { index: rng.index, sum: rng.sum }, clock, taken, carried, hands, score, money, lives, progress, shield, bonus, bonusFlag, helped, quest, soundFlag, tune };
}

/** Saves as bytes: their JSON. */
export const CODEC: SaveCodec<AwmSave> = {
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b) => {
    const s = parseSave(JSON.parse(String.fromCharCode(...b)));
    if (!s) throw new Error('not an Auf Wiedersehen Monty save');
    return s;
  },
};
