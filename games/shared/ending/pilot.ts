/**
 * A hero driven by input like a player: a route is what the stick does, a run at a time, written as text
 * (`'>24 J>8 .30'`: right for 24 steps, jump right for 8, nothing for 30; a step is whatever the game's logic step is). The
 * montage's places carry their routes, found by a search over the game's own frames (each game's `re/routes.ts`) and
 * replayed through the game's own input, so the hero runs, jumps and climbs as he does in play.
 *
 * The token is a direction (`<` `>` `^` `v`, the diagonals `^<` `^>` `v<` `v>`, or `.` for the stick at rest), with a `J`
 * in front for the fire button held too (`J` alone: fire with the stick at rest). Games use the ones they need.
 */

/** A stick: four directions and fire, as a game's input reads them. */
export interface Stick { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean }

const REST: Stick = { left: false, right: false, up: false, down: false, fire: false };
const DIRECTIONS = {
  '.': REST,
  '<': { ...REST, left: true },
  '>': { ...REST, right: true },
  '^': { ...REST, up: true },
  v: { ...REST, down: true },
  '^<': { ...REST, up: true, left: true },
  '^>': { ...REST, up: true, right: true },
  'v<': { ...REST, down: true, left: true },
  'v>': { ...REST, down: true, right: true },
} as const satisfies Record<string, Stick>;

type Direction = keyof typeof DIRECTIONS;
/** Every move a route may use: a direction, with or without fire. */
export type Move = Direction | `J${Direction}` | 'J';

const isDirection = (s: string): s is Direction => Object.hasOwn(DIRECTIONS, s);

/** Whether a token is a move. */
export function isMove(token: string): token is Move {
  return token === 'J' || isDirection(token) || (token.startsWith('J') && isDirection(token.slice(1)));
}

/** The stick a move holds. */
export function stickOf(move: Move): Stick {
  if (move === 'J') return { ...REST, fire: true };
  if (isDirection(move)) return { ...DIRECTIONS[move] };
  const d = move.slice(1);
  return { ...(isDirection(d) ? DIRECTIONS[d] : REST), fire: true };
}

/** One run of a route: a move held for some steps. */
export interface Run { move: Move; steps: number }

/** A route as text, read (a bad token is a mistake in the scene's data: it throws). */
export function parseRoute(text: string): Run[] {
  return text.split(/\s+/).filter((t) => t).map((token) => {
    const m = /^([^0-9]+)([0-9]+)$/.exec(token);
    const move = m && isMove(m[1]) ? m[1] : null;
    if (!m || !move) throw new Error(`route: bad run '${token}'`);
    return { move, steps: Number(m[2]) };
  });
}

/** Moves as text: the same move in a row put together. */
export function routeText(moves: readonly Move[]): string {
  const runs: Run[] = [];
  for (const move of moves) {
    const last = runs[runs.length - 1];
    if (last && last.move === move) last.steps++; else runs.push({ move, steps: 1 });
  }
  return runs.map((r) => `${r.move}${r.steps}`).join(' ');
}

/** The stick for each step of a route, and the stick at rest once it is over. */
export class RoutePilot {
  private readonly runs: Run[];
  private run = 0;
  private spent = 0;
  constructor(route: string) { this.runs = parseRoute(route); }

  get done() { return this.run >= this.runs.length; }

  /** The steps the whole route takes. */
  get length() { return this.runs.reduce((n, r) => n + r.steps, 0); }

  /** The move for the step now (without taking it). */
  get now(): Move { return this.runs[this.run]?.move ?? '.'; }

  /** The stick for this step, and on to the next. */
  next(): Stick {
    const r = this.runs[this.run];
    if (!r) return stickOf('.');
    const stick = stickOf(r.move);
    if (++this.spent >= r.steps) { this.run++; this.spent = 0; }
    return stick;
  }
}
