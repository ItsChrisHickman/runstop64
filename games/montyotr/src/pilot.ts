import type { Input } from './game';

/**
 * Monty driven by input like a player: a route is what the stick does, a run at a time, written out as text
 * (`'>24 J>8 .30'`: right for 24 frames, jump right for 8, nothing for 30). The show's scenes carry theirs, found by
 * a search over the game's own frames (`re/routes.ts`) and replayed through the game's own input, so he runs, jumps and
 * climbs as he does in play.
 */
const STICKS = {
  '<': { left: true, right: false, up: false, down: false, fire: false },
  '>': { left: false, right: true, up: false, down: false, fire: false },
  '^': { left: false, right: false, up: true, down: false, fire: false },
  v: { left: false, right: false, up: false, down: true, fire: false },
  '.': { left: false, right: false, up: false, down: false, fire: false },
  J: { left: false, right: false, up: false, down: false, fire: true },
  'J<': { left: true, right: false, up: false, down: false, fire: true },
  'J>': { left: false, right: true, up: false, down: false, fire: true },
  '^>': { left: false, right: true, up: true, down: false, fire: false },
  '^<': { left: true, right: false, up: true, down: false, fire: false },
  'v>': { left: false, right: true, up: false, down: true, fire: false },
  'v<': { left: true, right: false, up: false, down: true, fire: false },
} as const satisfies Record<string, Input>;

export type Move = keyof typeof STICKS;

/** Every stick a route may use (the search's actions). */
export const MOVES = Object.keys(STICKS).filter(isMove);

export function isMove(s: string): s is Move {
  return Object.hasOwn(STICKS, s);
}

export function stickOf(move: Move): Input {
  return { ...STICKS[move] };
}

/** One run of a route: a stick held for some frames. */
export interface Run { move: Move; frames: number }

/** A route as text, read (a bad token is a mistake in the scene's data: it throws). */
export function parseRoute(text: string): Run[] {
  return text.split(/\s+/).filter((t) => t).map((token) => {
    const m = /^([^0-9]+)([0-9]+)$/.exec(token);
    if (!m || !isMove(m[1])) throw new Error(`route: bad run '${token}'`);
    return { move: m[1], frames: Number(m[2]) };
  });
}

/** Runs as text: the same stick in a row put together. */
export function routeText(moves: readonly Move[]): string {
  const runs: Run[] = [];
  for (const move of moves) {
    const last = runs[runs.length - 1];
    if (last && last.move === move) last.frames++; else runs.push({ move, frames: 1 });
  }
  return runs.map((r) => `${r.move}${r.frames}`).join(' ');
}

/** The stick for each frame of a route, and nothing once it is over. */
export class Pilot {
  private readonly runs: Run[];
  private run = 0;
  private spent = 0;
  constructor(route: string) { this.runs = parseRoute(route); }

  get done() { return this.run >= this.runs.length; }

  /** The frames the whole route takes. */
  get length() { return this.runs.reduce((n, r) => n + r.frames, 0); }

  /** The stick for this frame. */
  next(): Input {
    const r = this.runs[this.run];
    if (!r) return stickOf('.');
    const stick = stickOf(r.move);
    if (++this.spent >= r.frames) { this.run++; this.spent = 0; }
    return stick;
  }
}
