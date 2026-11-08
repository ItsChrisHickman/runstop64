import { readsFormat, type SaveCodec } from '../../shared/continue';
import { readJson, S } from '../../shared/guards';
import { COAL_COUNT } from '../../montymole/src/data';
import type { RemixGame } from './game';

/**
 * The remix's save: what is needed to carry on from the start of a room (taken as Monty comes into it): the room, where he came into it, the
 * lives and the score, and the 64 coal flags (which pieces are taken; the count the gates read is theirs). Storing it, ENTER CONTINUE and
 * CONTINUE? are the shared ContinueFlow's (games/shared/continue.ts, games/shared/saves.ts); this is what goes into a save and how a game is
 * started again from one.
 */
export const RemixSave = S.object({
  v: S.literal(1),
  room: S.number,
  x2: S.number, y: S.number, facing: S.number,
  lives: S.number, score: S.number,
  coal: S.numbers,
});
export type RemixSave = S.Infer<typeof RemixSave>;

export function snapshot(g: RemixGame): RemixSave {
  return { v: 1, room: g.roomId, x2: g.entry.x2, y: g.entry.y, facing: g.entry.facing, lives: g.lives, score: g.score, coal: [...g.coal.flags] };
}

/** Start a game from a save (instead of a plain `g.start()`): the room loads on the first frame, Monty where he came into it. */
export function restore(g: RemixGame, data: RemixSave): void {
  g.start();
  g.lives = Math.max(1, data.lives);
  g.score = data.score;
  g.hiScore = Math.max(g.hiScore, g.score);
  data.coal.slice(0, COAL_COUNT).forEach((f, id) => { g.coal.flags[id] = f; });
  g.addScore(0); // (the score row)
  g.travelTo(data.room, data.x2, data.y, data.facing);
}

/** A save read back (from JSON in storage), checked: null if it isn't one. */
export const parseSave = (v: unknown): RemixSave | null => (RemixSave(v) ? v : null);

/** Saves as bytes: their JSON. */
export const CODEC: SaveCodec<RemixSave> = {
  format: 1,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, format) => {
    readsFormat('Wanted: Monty Mole Remix', format, 1);
    const s = parseSave(readJson(String.fromCharCode(...b)));
    if (!s) throw new Error('not a Wanted: Monty Mole Remix save');
    return s;
  },
};
