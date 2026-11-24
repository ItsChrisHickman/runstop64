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

// ---- the carnival parade ----------------------------------------------------------------------------------------

/**
 * The parade style (Do Svidaniya Monty's, after Rio's carnival): the whole cast in one long procession moving left to right across the
 * picture without a break: leaders at its head (the finale's samba troupe), then each group in the journey's order behind a banner with
 * its name, the marchers in single file with a bounce in their step on the samba beat, each named as its middle passes the reviewing
 * point (the names of the group passing stay up, two to a row, as the troupes' do), and the gag at the tail: he walks on alone until
 * `crushAt`, stops, and a Mole Crusher slams down on him (`drop`), he goes as the engine's death under a crusher goes (`crush`: its own
 * frames, one a frame), the crusher goes back up (`rise`) and the watchers at the side cheer (`cheer`). Then THE END.
 */
export const PARADE = {
  /** Pixels a frame the column moves: a samba walk. */
  speed: 1.5,
  /** From one marcher's left edge to the next's. */
  gap: 30,
  /** Between a banner and its group's first marcher behind it. */
  bannerGap: 12,
  /** Between a group's last marcher and the next banner behind it (or the gag). */
  groupGap: 28,
  /** A marcher's name comes up as its middle passes this column. */
  review: 160,
  /** Frames of a samba beat, and the bounce on it (pixels up). */
  beat: 24,
  bounce: 3,
  /** Where the gag stops (his left edge), the frames he stands, the crusher's drop, the frames of his death if the game does not say (its own: the four-way split's), the rise and the cheer. */
  crushAt: 186,
  stop: 40,
  drop: 10,
  crush: 50,
  rise: 30,
  cheer: 70,
} as const;

/** What marches: a leader (no name), a group's banner, a group's marcher, or the gag at the tail. */
export type UnitKind = 'leader' | 'banner' | 'member' | 'gag';
/** A unit of the column: what it is, its width, and the group it belongs to (a banner's and its marchers'; -1 for the leaders and the gag). */
export interface ParadeUnit { kind: UnitKind; width: number; group: number }
/** The column's units, and how many frames the gag's death takes (default `PARADE.crush`). */
export interface ParadeShape { units: readonly ParadeUnit[]; crush?: number }

/** The gag's part: marching with the column, standing, the crusher coming down, the crusher death, the crusher going up, the watchers cheering. */
export type GagPhase = 'march' | 'stop' | 'drop' | 'crush' | 'rise' | 'cheer';
export const GAG_PHASES = ['stop', 'drop', 'crush', 'rise', 'cheer'] as const;

/** How far behind the head each unit marches (pixels), from the gaps between kinds. */
function offsetsOf(units: readonly ParadeUnit[]): number[] {
  const out: number[] = [];
  units.forEach((u, k) => {
    const prev = units[k - 1];
    if (!prev) { out.push(0); return; }
    // (the column moves right: a unit's left edge is its own width and a gap behind the left edge of the one in front)
    const space = u.kind === 'banner' || u.kind === 'gag' ? u.width + PARADE.groupGap : prev.kind === 'banner' ? u.width + PARADE.bannerGap : Math.max(PARADE.gap, u.width + 6);
    out.push((out[k - 1] ?? 0) + space);
  });
  return out;
}

/** The parade's clock: each unit's place behind the head, the frame the gag reaches `crushAt` (with no gag, the frame the last unit is off the right), when each of his phases begins, and the whole length. */
export function paradeOf(shape: ParadeShape) {
  const { units } = shape;
  const offsets = offsetsOf(units);
  const start = -(units[0]?.width ?? 0);
  const last = units.length - 1;
  const gag = units[last]?.kind === 'gag' ? last : -1;
  const reach = Math.ceil(((gag >= 0 ? PARADE.crushAt : 320) + (offsets[last] ?? 0) - start) / PARADE.speed);
  const phases: Record<GagPhase, number> = { march: 0, stop: reach, drop: reach, crush: reach, rise: reach, cheer: reach };
  let at = reach;
  for (const q of GAG_PHASES) { phases[q] = at; at += gag >= 0 ? (q === 'crush' ? shape.crush ?? PARADE.crush : PARADE[q]) : 0; }
  return { offsets, start, gag, phases, length: at };
}

/** The parade at frame `t`: each unit's left edge and lift, the group passing (the last whose banner's middle has passed the reviewing point) and its marchers named so far (each as its middle passes), and the gag's phase and how far into it. */
export function paradeAt(shape: ParadeShape, t: number) {
  const p = paradeOf(shape), { units } = shape;
  const head = p.start + t * PARADE.speed;
  const lefts = units.map((_, k) => {
    const left = Math.round(head - (p.offsets[k] ?? 0));
    return k === p.gag ? Math.min(left, PARADE.crushAt) : left;
  });
  // (a samba bounce: every marcher on the beat, each a half beat after the one in front)
  const lifts = units.map((u, k) => (u.kind === 'member' || u.kind === 'leader' ? Math.round(Math.abs(Math.sin(((t + k * (PARADE.beat / 2)) * Math.PI) / PARADE.beat)) * PARADE.bounce) : 0));
  const past = (k: number) => (lefts[k] ?? 0) + (units[k]?.width ?? 0) / 2 >= PARADE.review;
  let group = -1;
  units.forEach((u, k) => { if (u.kind === 'banner' && past(k)) group = u.group; });
  const named = units.flatMap((u, k) => (u.kind === 'member' && u.group === group && past(k) ? [k] : []));
  let phase: GagPhase = 'march';
  for (const q of GAG_PHASES) if (p.gag >= 0 && t >= p.phases[q]) phase = q;
  return { lefts, lifts, group, named, gag: { phase, at: t - p.phases[phase] } };
}
