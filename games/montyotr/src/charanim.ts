import { decorChars } from './decor-chars';
import { PLAY_COL } from '../../shared/monty/screen';
import type { Game } from './game';
import type { CharRef } from './montydata';

/**
 * Animated characters (a game's `charAnims`): a room's own characters, or a decoration's, change picture as the room runs, as Monty on
 * the Run's water and lava do (`animateTheme`) and the escalator's treads do, but for any character and in two ways:
 * - `scroll`: rings of characters whose pictures slide sideways `px` pixels every `every` steps, the pixels leaving one end of a ring
 *   coming back at the other (a strip of landscape going by a window, the sleepers under a train);
 * - `cycle`: characters that take the next of a list of pictures every `every` steps (a wheel's spokes).
 * A step is every other frame, as the theme character's; an animation with a `fromCol` runs only while Monty is that far along the room (one without runs from the moment the room loads, whatever he does or wherever he stands, even half off its edge as he comes in). A room is loaded with its characters as the tables have them, so the animation
 * begins from the same picture each time.
 */

/** An animation with its characters found (the characters' numbers in the screen's charset). */
export type LiveAnim =
  | { kind: 'scroll'; rings: readonly (readonly number[])[]; dx: 1 | -1; px: number; every: number; fromCol: number | null }
  | { kind: 'cycle'; chars: readonly number[]; frames: readonly Uint8Array[]; every: number; fromCol: number | null };

/** A room is loaded (its decorations drawn): its animations, their characters found. */
export function charAnimInit(g: Game) {
  g.charTick = 0;
  const mine = g.data.charAnims.filter((a) => a.room === g.roomId);
  if (!mine.length) { g.charAnims = []; return; }
  const first = decorChars(g.data, g.roomId);
  /** A character reference's number in the charset; throws for a decoration that is not in the room (the data's mistake). */
  const find = (ref: CharRef): number => {
    if (typeof ref === 'number') return ref;
    const at = first[ref.decor] ?? 0;
    if (!at) throw new Error(`room $${g.roomId.toString(16)}: an animation of decoration ${ref.decor} that it does not have`);
    return at + ref.cell;
  };
  g.charAnims = mine.map((a): LiveAnim => (a.kind === 'scroll'
    ? { kind: 'scroll', rings: a.rings.map((r) => r.map(find)), dx: a.dx, px: a.px, every: a.every, fromCol: a.fromCol ?? null }
    : { kind: 'cycle', chars: a.chars.map(find), frames: a.frames, every: a.every, fromCol: a.fromCol ?? null }));
}

/** Slide a ring of characters `px` pixels left (`dx` -1) or right (1): each row of pixels, the ring's characters side by side, rotated. */
function slide(mem: Uint8Array, ring: readonly number[], dx: 1 | -1, px: number) {
  const n = ring.length;
  const at = (i: number, y: number) => (ring[i] ?? 0) * 8 + y;
  for (let y = 0; y < 8; y++) {
    for (let k = 0; k < px; k++) {
      if (dx < 0) {
        const wrap = (mem[at(0, y)] ?? 0) >> 7;
        for (let i = 0; i < n; i++) {
          const next = i + 1 < n ? (mem[at(i + 1, y)] ?? 0) >> 7 : wrap;
          mem[at(i, y)] = (((mem[at(i, y)] ?? 0) << 1) | next) & 0xff;
        }
      } else {
        const wrap = (mem[at(n - 1, y)] ?? 0) & 1;
        for (let i = n - 1; i >= 0; i--) {
          const prev = i > 0 ? (mem[at(i - 1, y)] ?? 0) & 1 : wrap;
          mem[at(i, y)] = (((mem[at(i, y)] ?? 0) >> 1) | (prev << 7)) & 0xff;
        }
      }
    }
  }
}

/** One step (every other frame): each animation of the room that is due moves on. */
export function animateChars(g: Game) {
  if (!g.charAnims.length) return;
  g.charTick++;
  for (const a of g.charAnims) {
    if (g.charTick % a.every !== 0 || a.fromCol !== null && g.montyCol - PLAY_COL < a.fromCol) continue;
    if (a.kind === 'scroll') {
      for (const ring of a.rings) slide(g.mem, ring, a.dx, a.px);
    } else {
      const frame = a.frames[(g.charTick / a.every) % a.frames.length];
      if (frame) a.chars.forEach((chr, i) => g.mem.set(frame.subarray(i * 8, i * 8 + 8), chr * 8));
    }
  }
}
