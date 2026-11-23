/**
 * The procession, pure: the reward show's parade in the spirit of Super Mario World's (the idea, not its art or layout). After the
 * last credit line the creatures come on as troupes, one troupe at a time, in the order of the journey: a troupe marches in from
 * the left in step, its members spaced out in a line, each in its own walk (the frames the engine showed); it halts with its
 * middle a little left of the picture's middle; each member in turn, left to right, does a small move of its own (a hop, a turn
 * about, a bow), and its name comes up as it does and stays while the troupe is there (so the names read in the order the
 * marchers stand); then the troupe marches off to the right and the next comes on. The hero comes last, dancing (a figure the
 * game gives), and a game may send one more behind him as the gag (squashed flat, wobbling along). They walk on a plain ground
 * of their own (`show.ts` draws it), never over the place's busy picture.
 *
 * This file is the clock and the formation; `show.ts` draws them.
 */

/** How the procession moves (picture pixels, frames at 50 a second). */
export const MARCH = {
  /** Pixels a frame the troupe marches at: a walk, not a run. */
  speed: 3,
  /** Pixels between one member's left edge and the next's. */
  gap: 34,
  /** Where the middle of a halted troupe stands: a little left of the picture's middle. */
  halt: 136,
  /** Frames each member's move takes (its name comes up as it begins). */
  move: 32,
  /** Frames the troupe stands after the last move, all its names up, before it marches off. */
  hold: 24,
  /** Frames a troupe stands at the least (a lone member too: time to read its name). */
  stand: 100,
  /** Frames the hero dances. */
  dance: 160,
  /** At most this many in a troupe (their names go two to a row, two rows). */
  most: 4,
} as const;

/** How tall a member is in its bow, and the gag all the way (of its height). */
export const BOW = 0.7, FLAT = 0.35;

/** Letters a name may have: half the picture's 40 columns, less a column of space. */
export const NAME_LETTERS = 19;

/** A member's move when its turn comes: a hop, a turn about (it faces the other way a moment), a bow; the hero's dance; the gag's flat wobble (all the way; its name comes up after the others'). */
export type Move = 'hop' | 'turn' | 'bow' | 'dance' | 'flat';
const MOVES = ['hop', 'turn', 'bow'] as const;

/** What the clock needs of a troupe: each member's width and move, in the line's order from the left (the last is in front, at the right, as they march right). */
export interface TroupeShape { members: readonly { width: number; move: Move }[] }

/** A member at one moment: its left edge, how far its feet are lifted (pixels up), whether it faces the other way, how tall it is (1: as it is), and whether it is dancing (and how far into its move it is). */
export interface Stance { left: number; lift: number; mirror: boolean; squash: number; dancing: boolean; moveAt: number }

/** The moves of an ordinary troupe: round hop, turn, bow, each troupe starting one further on. */
export function movesFor(troupe: number, n: number): Move[] {
  return Array.from({ length: n }, (_, k) => MOVES[(troupe + k) % MOVES.length] ?? 'hop');
}

/** How long a member's move is (the gag has none: it wobbles all the way). */
const moveFrames = (m: Move): number => (m === 'flat' ? 0 : m === 'dance' ? MARCH.dance : MARCH.move);

/** The parts of a troupe's turn: in (marching to the halt), the moves one after another (left to right, the gag's last), the hold, out (marching off). Positions are the front member's left edge. */
export function phasesOf(t: TroupeShape) {
  const n = t.members.length;
  const offsets = t.members.map((_, k) => -(n - 1 - k) * MARCH.gap);
  const lead = t.members[n - 1]?.width ?? 0, rear = offsets[0] ?? 0;
  // (the front where the line's middle is at the halt; in from where the whole line is off the left, out until the rear is off the right)
  const halt = Math.round(MARCH.halt - (lead + rear) / 2);
  const start = -lead, end = 320 - rear;
  const inFrames = Math.ceil((halt - start) / MARCH.speed);
  const flat = (k: number) => (t.members[k]?.move === 'flat' ? 1 : 0);
  const order = [...t.members.keys()].sort((a, b) => flat(a) - flat(b) || a - b);
  const moves = t.members.map((m) => moveFrames(m.move));
  const begins: number[] = moves.map(() => 0);
  let at = 0;
  for (const k of order) { begins[k] = at; at += moves[k] ?? 0; }
  const standing = Math.max(MARCH.stand, at + MARCH.hold);
  const outFrames = Math.ceil((end - halt) / MARCH.speed);
  return { start, halt, end, inFrames, moves, begins, order, standing, outFrames, length: inFrames + standing + outFrames, offsets };
}

/** A troupe at frame `t` of its turn: where each member is and what it is doing, and the members named so far in the order their names came up (each as its move begins; they stay). */
export function troupeAt(shape: TroupeShape, t: number): { stances: Stance[]; named: number[] } {
  const p = phasesOf(shape);
  const stand = t - p.inFrames;
  const front = stand < 0 ? p.start + t * MARCH.speed : stand < p.standing ? p.halt : Math.min(p.end, p.halt + (stand - p.standing) * MARCH.speed);
  const named = stand < 0 ? [] : p.order.filter((k) => (p.begins[k] ?? 0) <= stand);
  const stances = shape.members.map((m, k): Stance => {
    const left = Math.round(front + (p.offsets[k] ?? 0));
    const into = stand - (p.begins[k] ?? 0), len = p.moves[k] ?? 0;
    const base: Stance = { left, lift: 0, mirror: false, squash: 1, dancing: false, moveAt: into };
    // (the gag: flat all the way, wobbling a pixel or two either way)
    if (m.move === 'flat') return { ...base, squash: FLAT, left: left + Math.round(Math.sin(t / 3) * 2) };
    if (stand < 0 || into < 0 || into >= len) return base;
    const s = into / len;
    switch (m.move) {
      case 'hop': return { ...base, lift: Math.round(Math.max(0, Math.sin(s * Math.PI * 2)) * 8) };
      case 'turn': return { ...base, mirror: s > 0.2 && s < 0.8 };
      case 'bow': return { ...base, squash: s > 0.25 && s < 0.75 ? BOW : 1 };
      case 'dance': return { ...base, dancing: true };
    }
  });
  return { stances, named };
}

/** The whole procession: when each troupe's turn begins and how long it is (one after another), and the frames it all takes. */
export function processionOf(troupes: readonly TroupeShape[]): { turns: { from: number; length: number }[]; length: number } {
  let at = 0;
  const turns = troupes.map((t) => { const length = phasesOf(t).length; const turn = { from: at, length }; at += length; return turn; });
  return { turns, length: at };
}

/** Where the `n`th name to come up in a troupe goes: two to a row (the left half, the right half), two rows. */
export function nameSpot(n: number, rows: readonly [number, number]): { x: number; row: number } {
  return { x: n % 2 === 0 ? 8 : 168, row: n < 2 ? rows[0] : rows[1] };
}
