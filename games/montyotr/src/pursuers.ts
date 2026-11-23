import type { Game } from './game';
import type { CellBox, PursuerSpec } from './montydata';

/**
 * Pursuers (a game's `pursuers`: Do Svidaniya Monty's agent in the Sambadrome): a creature of the room that walks Monty's own path a few seconds behind him, as Spy vs Spy's spies do. Each frame (after Monty's move) where Monty is and
 * which way he faces goes into a ring of `delay` frames; once Monty has left the box he came in by (`calm`), the creature is put where Monty was `delay` frames before, facing as he did, its walk turning only while it moves. So
 * he never turns back without meeting it, and standing still lets it catch up. It is a creature on its sprite (4 + its slot), so touching it is death by the hardware's collision as any creature's; the patrol code leaves it
 * alone (`driven`). It starts again with the room (a death restarts the room as he came in). Once its `until` item is taken it is gone. Squashed (`squashPursuer`, levers.ts), it lies flat where it was and its hat pops off.
 */

/** Frames the squashed hat flies for, and its first speed up (pixels a frame; gravity a quarter of a pixel a frame). */
const HAT_FRAMES = 90, HAT_LIFT = 4;

/** A pursuer of the room: its place in the data's list, the ring of Monty's places (x2, y, facing: three numbers each) and how many were written, whether it has woken, where it is drawn, the steps of its walk, and its squash (frames since, 0 none) with the hat's flight. */
export interface PursuerState {
  index: number; ring: number[]; written: number; awake: boolean; x2: number; y: number; facing: number; walk: number;
  squashed: number; hatY: number; hatV: number;
}

/** Whether the cell of Monty's top left is inside a box of playfield cells (his column and row as the engine counts them, less the playfield's margin). */
const inBox = (g: Game, b: CellBox) => {
  const col = g.montyCol - 4, row = g.montyRow - 3;
  return col >= b.col0 && col <= b.col1 && row >= b.row0 && row <= b.row1;
};

/** A room is loaded (after its creatures are set up): its pursuer asleep, out of sight, the ring empty; gone for good once its `until` is taken. */
export function pursuerInit(g: Game) {
  g.pursuers = g.data.pursuers.flatMap((e, index): PursuerState[] => {
    if (e.room !== g.roomId) return [];
    const man = g.enemies[e.slot];
    if (man) { man.driven = true; man.x = 0xff; }
    if (g.siCollected[e.until]) return [];
    return [{ index, ring: Array.from({ length: e.delay * 3 }, () => 0), written: 0, awake: false, x2: 0, y: 0, facing: 1, walk: 0, squashed: 0, hatY: 0, hatV: 0 }];
  });
}

/** The pursuer's sprite (4 + its slot). */
const spriteOf = (e: PursuerSpec) => 4 + e.slot;

/** Whether a pursuer is in sight and walking (where it is, for the lever's head). */
export function pursuerAt(g: Game): { x2: number; y: number } | null {
  const p = g.pursuers.find((s) => s.awake && !s.squashed && s.written > (g.data.pursuers[s.index]?.delay ?? 0));
  return p ? { x2: p.x2, y: p.y } : null;
}

/** The head came down on it: it lies flat where it is, its hat flies off. */
export function squashPursuer(g: Game) {
  for (const p of g.pursuers) if (p.awake && !p.squashed) { p.squashed = 1; p.hatY = p.y - 6; p.hatV = -HAT_LIFT; }
}

/** One frame (after Monty's move): Monty's place into the ring, and the pursuer where he was `delay` frames ago, or flat, or not yet in sight. */
export function pursuerUpdate(g: Game) {
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (!e) continue;
    const n = spriteOf(e), man = g.enemies[e.slot];
    if (p.squashed) {
      p.squashed++;
      g.sx[n] = p.x2; g.sy[n] = (p.y + 1) & 0xff; g.sptr[n] = e.flat; g.enable |= 1 << n;
      if (man) g.scol[n] = man.colour;
      if (p.squashed < HAT_FRAMES) {
        p.hatV += 0.25; p.hatY += p.hatV;
        g.sx[e.hatSprite] = (p.x2 + 2) & 0xff; g.sy[e.hatSprite] = Math.max(0, Math.min(255, Math.round(p.hatY))); g.sptr[e.hatSprite] = e.hat; g.scol[e.hatSprite] = g.scol[n] ?? 1;
        g.enable |= 1 << e.hatSprite;
      }
      continue;
    }
    if (g.actionCounter || g.freeze) continue;
    const at = (p.written % e.delay) * 3;
    if (p.written >= e.delay) {
      // where Monty was `delay` frames ago: the oldest place in the ring, about to be written over
      const x2 = p.ring[at] ?? 0, y = p.ring[at + 1] ?? 0, facing = p.ring[at + 2] ?? 1;
      if (x2 !== p.x2 || y !== p.y) p.walk++;
      p.x2 = x2; p.y = y; p.facing = facing;
    }
    p.ring[at] = g.x2; p.ring[at + 1] = g.y; p.ring[at + 2] = g.facing;
    p.written++;
    if (!p.awake && !inBox(g, e.calm)) p.awake = true;
    if (!p.awake || p.written <= e.delay || !man) { g.enable &= ~(1 << n) & 0xff; continue; }
    man.x = p.x2; man.y = (p.y + 1) & 0xff;
    g.sx[n] = p.x2; g.sy[n] = man.y; g.scol[n] = man.colour;
    g.sptr[n] = 0x30 + e.slot * 8 + (p.facing & 0x80 ? 0 : 4) + ((p.walk >> 2) & 3);
    g.enable |= 1 << n;
  }
}

/** The sprite of the squashed hat, as the collision check's mask (it is no part of what kills him). */
export function pursuerSprites(g: Game): number {
  let mask = 0;
  for (const p of g.pursuers) { const e = g.data.pursuers[p.index]; if (e && p.squashed) mask |= (1 << e.hatSprite) | (1 << spriteOf(e)); }
  return mask;
}
