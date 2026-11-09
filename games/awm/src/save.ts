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
  bonus: S.number,
  bonusFlag: S.number,
  helped: S.number,
  quest: S.number,
  /** The title's choice ($4066) and the room tune playing ($4064). */
  soundFlag: S.number,
  tune: S.number,
};
/** What ENHANCED's carry anything adds (format 4): the tickets counted, what he carries beyond the boxes, and when each thing in a box was picked up. */
const carrying = {
  tickets: S.number,
  pack: S.array(S.object({ type: S.number, stamp: S.number })),
  stamps: S.numbers,
};
const sound = (s: { room: number; burnPicture: number[]; carried: number[]; hands: unknown[]; score: number[]; money: number[] }): boolean =>
  !!ROOMS[s.room] && s.burnPicture.length === 8 && s.carried.length === 4 && s.hands.length === 4 && s.score.length === 5 && s.money.length === 5;
const soundCarrying = (s: { stamps: number[]; tickets: number } & Parameters<typeof sound>[0]): boolean => sound(s) && s.stamps.length === 4 && s.tickets >= 0;
/** Saves up to format 2 kept the shield's flag ($405E); the shield is not in the port and so the flag is dropped (the leaf is a plain item). */
const shield = { shield: S.number };
/** Format 1, as players have it: before the flight (a plane with a ticket) kept anything. */
const AwmSaveV1 = S.refine(S.object({ v: S.literal(1), ...fields, ...shield }), sound);
const AwmSaveV2 = S.refine(S.object({ v: S.literal(2), ...fields, ...shield, flight: sky }), sound);
/** Format 3: before carrying anything (the four boxes were all there was). */
const AwmSaveV3 = S.refine(S.object({ v: S.literal(3), ...fields, flight: sky }), sound);
export const AwmSave = S.refine(S.object({ v: S.literal(4), ...fields, ...carrying, flight: sky }), soundCarrying);
export type AwmSave = S.Infer<typeof AwmSave>;

export function snapshot(game: Game, hands: readonly (Hand | null)[]): AwmSave {
  const m = game.monty;
  return {
    v: 4,
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
    tickets: game.items.tickets,
    pack: game.items.pack.map((h) => ({ ...h })),
    stamps: [...game.items.stamps],
    hands: hands.map((h) => (h ? { type: h.type, colours: [...h.colours] } : null)),
    score: [...game.score.digits],
    money: [...game.money.digits],
    lives: game.lives,
    progress: game.progress,
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
  save.stamps.forEach((t, i) => { game.items.stamps[i] = t; });
  game.items.pack.push(...save.pack.map((h) => ({ ...h })));
  game.items.tickets = save.tickets;
  game.items.serial = Math.max(0, ...save.stamps, ...save.pack.map((h) => h.stamp));
  game.score.digits.splice(0, 5, ...save.score);
  game.money.digits.splice(0, 5, ...save.money);
  game.lives = save.lives;
  game.progress = game.progressSeen = save.progress;
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

/** An old save in the latest: the shield flag dropped (a game that had it loads without), the flights as they left it or, in format 1, nothing in the machine (the program's own values). */
const upgrade = ({ shield: _shield, ...rest }: S.Infer<typeof AwmSaveV2>): AwmSave => ({ ...rest, ...nothingMore(), v: 4 });
const upgradeV1 = ({ shield: _shield, ...rest }: S.Infer<typeof AwmSaveV1>): AwmSave => ({ ...rest, ...nothingMore(), v: 4, flight: copySky(FRESH_SKY) });
/** Format 3 had the four boxes only: what they hold is all he carries (a ticket in a box stays there, and is taken from it). */
const upgradeV3 = ({ v: _v, ...rest }: S.Infer<typeof AwmSaveV3>): AwmSave => ({ ...rest, ...nothingMore(), v: 4 });
function nothingMore(): { tickets: number; pack: { type: number; stamp: number }[]; stamps: number[] } {
  return { tickets: 0, pack: [], stamps: [0, 0, 0, 0] };
}

/** Saves as bytes: their JSON (format 4: with what carry anything keeps; formats 1 to 3 are read: 1 as a game that has not flown, 2 and 3 with only the four boxes). */
export const CODEC: SaveCodec<AwmSave> = {
  format: 4,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, format) => {
    readsFormat('Auf Wiedersehen Monty', format, 1, 2, 3, 4);
    const v = readJson(String.fromCharCode(...b));
    if (format === 1) {
      if (!AwmSaveV1(v)) throw new Error('not an Auf Wiedersehen Monty save');
      return upgradeV1(v);
    }
    if (format === 2) {
      if (!AwmSaveV2(v)) throw new Error('not an Auf Wiedersehen Monty save');
      return upgrade(v);
    }
    if (format === 3) {
      if (!AwmSaveV3(v)) throw new Error('not an Auf Wiedersehen Monty save');
      return upgradeV3(v);
    }
    const s = parseSave(v);
    if (!s) throw new Error('not an Auf Wiedersehen Monty save');
    return s;
  },
};
