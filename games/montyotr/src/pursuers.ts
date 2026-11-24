import { cameoDue, inBox, walkOn } from './cameos';
import type { Game } from './game';
import type { PursuerSpec } from './montydata';

/**
 * Pursuers (a game's `pursuers`: Do Svidaniya Monty's Viktor Vole on the cargo ship and in the Sambadrome): a creature of the room that walks Monty's own path a few seconds behind him, as Spy vs Spy's
 * spies do. Each frame (after Monty's move) where Monty is and which way he faces goes into a ring of `delay` frames; once Monty has left the box he came in by (`calm`), the creature is put where Monty was
 * `delay` frames before, facing as he did, its walk turning only while it moves. So he never turns back without meeting it, and standing still lets it catch up. It is a creature on its sprite (4 + its
 * slot), so touching it is death by the hardware's collision as any creature's; the patrol code leaves it alone (`driven`). It starts again with the room (a death restarts the room as he came in).
 *
 * How he is escaped (then the `until` find is taken, and he is gone from the room for good): knocked off the picture by a creature of the room whose picture meets his (`knockedBy`: the ship's crate; he
 * tumbles away and down), or squashed by the room's lever's head (`squashPursuer`, levers.ts), when he goes as Monty goes under a Mole Crusher: the four-way split, Monty on the Run's own
 * (scripts.ts `death4Split`: the same paths, pace, pictures in turn and sound), on four sprites of the room (one of another creature's is borrowed: that creature waits, out of sight, till the pieces are
 * gone). An `intro` walks him on at the far side as Monty comes in, the room's name flashing, and off again before the chase.
 */

/** Frames the room's name flashes for in an intro, and how long each flash is. */
const FLASH_FRAMES = 96, FLASH = 8;

/** A pursuer of the room: its place in the data's list, the ring of Monty's places (x2, y, facing: three numbers each) and how many were written, whether it has woken, where it is drawn, the steps of its walk, its
 * intro's frames (-1: none or over), and how it went (`gone`: knocked off, split) with the frames since and where it was then. */
export interface PursuerState {
  index: number; ring: number[]; written: number; awake: boolean; x2: number; y: number; facing: number; walk: number; intro: number;
  gone: 'no' | 'knocked' | 'split'; t: number; gx: number; gy: number;
}

/** A room is loaded (after its creatures are set up): its pursuer asleep, out of sight, the ring empty; gone for good once its `until` is taken. */
export function pursuerInit(g: Game) {
  g.pursuers = g.data.pursuers.flatMap((e, index): PursuerState[] => {
    if (e.room !== g.roomId) return [];
    const man = g.enemies[e.slot];
    if (man) { man.driven = true; man.x = 0xff; }
    if (g.siCollected[e.until]) return [];
    return [{ index, ring: Array.from({ length: e.delay * 3 }, () => 0), written: 0, awake: false, x2: 0, y: 0, facing: 1, walk: 0, intro: e.intro ? 0 : -1, gone: 'no', t: 0, gx: 0, gy: 0 }];
  });
}

/** The pursuer's sprite (4 + its slot). */
const spriteOf = (e: PursuerSpec) => 4 + e.slot;
/** The creature slot of a sprite a split borrows (-1: not a creature's). */
const slotOfSprite = (n: number) => (n >= 4 ? n - 4 : -1);

/** Whether a pursuer is in sight and walking (where it is, for the lever's head). */
export function pursuerAt(g: Game): { x2: number; y: number } | null {
  const p = g.pursuers.find((s) => s.awake && s.gone === 'no' && s.written > (g.data.pursuers[s.index]?.delay ?? 0));
  return p ? { x2: p.x2, y: p.y } : null;
}

/** He is escaped: the find taken (the room's effects read it), and how he goes. */
function escape(g: Game, p: PursuerState, e: PursuerSpec, how: 'knocked' | 'split') {
  p.gone = how; p.t = 0; p.gx = p.x2; p.gy = p.y;
  g.siCollected[e.until] = 0x81;
  g.sfx(how === 'split' ? g.data.eventSfx[0] ?? g.data.sfx.item : g.data.sfx.jump);
}

/** The head came down on him: the four-way split. */
export function squashPursuer(g: Game) {
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (e?.split && p.awake && p.gone === 'no') escape(g, p, e, 'split');
  }
}

/** The four-way split, Monty on the Run's own (scripts.ts `death4Split`) frame for frame: going back, on, up and down from where he was, three units a frame, each piece's four pictures in turn. True while a piece is still in sight. */
function splitFrame(g: Game, p: PursuerState, e: PursuerSpec): boolean {
  const s = e.split;
  if (!s) return false;
  const n = p.t;
  const [back, on, up, down] = s.sprites;
  const x = (n & 7) >> 1;
  const places: readonly (readonly [sprite: number, x2: number, y: number, first: number])[] = [
    [back, p.gx - 8 - 3 * n, p.gy, 0], [on, p.gx + 8 + 3 * n, p.gy, 4], [up, p.gx, p.gy - 16 - 3 * n, 8], [down, p.gx, p.gy + 16 + 3 * n, 12],
  ];
  let shown = false;
  for (const [sprite, x2, y, first] of places) {
    const off = x2 < 0 || x2 >= 0xa0 || y < 0 || y > 0xff;
    if (off) { g.enable &= ~(1 << sprite) & 0xff; continue; }
    g.sx[sprite] = x2; g.sy[sprite] = y; g.sptr[sprite] = s.pictures[first + x] ?? 0; g.scol[sprite] = 1;
    g.enable |= 1 << sprite;
    shown = true;
  }
  return shown;
}

/** One frame (after Monty's move): Monty's place into the ring, and the pursuer where he was `delay` frames ago, or going, or not yet in sight. */
export function pursuerUpdate(g: Game) {
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (!e) continue;
    const n = spriteOf(e), man = g.enemies[e.slot];
    if (p.gone !== 'no') {
      if (g.actionCounter || g.freeze) continue;
      p.t++;
      if (p.gone === 'split') {
        const borrowed = e.split?.sprites.map(slotOfSprite).filter((s) => s >= 0 && s !== e.slot) ?? [];
        const shown = splitFrame(g, p, e);
        for (const s of borrowed) { const other = g.enemies[s]; if (other) other.driven = shown; }
        if (!shown) { p.gone = 'no'; g.pursuers = g.pursuers.filter((q) => q !== p); }
      } else {
        // knocked: flung up and back the way he came (over the side), falling as he goes, out of the picture
        const y = p.gy - 3 * p.t + Math.floor((p.t * p.t) / 16), x = p.gx + (p.facing & 0x80 ? 3 : -3) * p.t;
        g.sx[n] = Math.min(0xff, Math.max(0, x)); g.sy[n] = Math.min(0xff, Math.max(0, y)); g.sptr[n] = 0x30 + e.slot * 8 + (p.facing & 0x80 ? 0 : 4) + ((p.t >> 2) & 3);
        if (man) g.scol[n] = man.colour;
        if (y >= 0xf8 || x <= 0 || x >= 0xb0) { g.enable &= ~(1 << n) & 0xff; g.pursuers = g.pursuers.filter((q) => q !== p); }
        else g.enable |= 1 << n;
      }
      continue;
    }
    if (g.actionCounter || g.freeze) continue;
    // the intro: he walks on at the far side and off again, the room's name flashing
    if (p.intro >= 0 && e.intro) {
      const at = walkOn(e.intro, p.intro, g.x2);
      flashName(g, p.intro);
      p.intro = at ? p.intro + 1 : -1;
      if (at && p.written <= e.delay) {
        // (his walk's pictures: a stride for each of the walk-on's two steps, standing for its look)
        const sub = at.picture & 3;
        g.sx[n] = at.x2; g.sy[n] = at.y; g.sptr[n] = 0x30 + e.slot * 8 + (at.picture & 4) + (sub < 2 ? 1 + sub * 2 : 0);
        if (man) g.scol[n] = man.colour;
        g.enable |= 1 << n;
      }
    }
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
    if (!p.awake || p.written <= e.delay || !man) { if (p.intro < 0) g.enable &= ~(1 << n) & 0xff; continue; }
    man.x = p.x2; man.y = (p.y + 1) & 0xff;
    g.sx[n] = p.x2; g.sy[n] = man.y; g.scol[n] = man.colour;
    g.sptr[n] = 0x30 + e.slot * 8 + (p.facing & 0x80 ? 0 : 4) + ((p.walk >> 2) & 3);
    g.enable |= 1 << n;
    if (knocked(g, e, p.x2, man.y)) escape(g, p, e, 'knocked');
  }
}

/** Whether something of the room his `knockedBy` names meets him: a creature whose picture meets his (the sprites' boxes, 16 by 16), or a tunnel's mouth sweeping over the cells he is in (as it takes Monty off a roof). */
function knocked(g: Game, e: PursuerSpec, x2: number, y: number): boolean {
  const k = e.knockedBy;
  if (!k) return false;
  for (const slot of k.creatures ?? []) {
    const other = g.enemies[slot];
    if (other && other.x !== 0xff && Math.abs(other.x - x2) < 7 && Math.abs(other.y - y) < 14) return true;
  }
  if (!k.tunnels) return false;
  const col = (x2 - 0x0c) / 4 - 4, row = Math.floor((y - 1 - 0x32) / 8) - 3; // (his top left cell, as Monty's: two wide, two tall)
  return g.tunnels.some((t) => t.state === 'sweep' && !t.spec.harmless && col + 2 > t.left && col < t.left + t.spec.cols && row + 1 >= t.spec.top && row <= t.spec.bottom);
}

/** The room's name row flashing (its colour between white and red) for the first frames of an intro. */
function flashName(g: Game, t: number) {
  if (t > FLASH_FRAMES) return;
  const ink = t === FLASH_FRAMES || ((t / FLASH) | 0) % 2 === 0 ? 1 : 2;
  for (let c = 4; c < 36; c++) g.col[24 * 40 + c] = ink;
}

/** Whether a pursuer of the room is still to be escaped. */
export const pursuerDue = (g: Game): boolean => g.pursuers.some((p) => p.gone === 'no');

/**
 * What a HUD shows of the game's pursuers (Do Svidaniya Monty's top-centre tally: Monty's face, a star for each escape, Viktor's face lit while he is due): for each of the data's pursuers in its order, whether
 * he has been escaped; and whether he is in this room or about to be (a pursuer still to escape, a cameo on its way or on show).
 */
export function encounterState(g: Game): { escaped: readonly boolean[]; due: boolean } {
  return { escaped: g.data.pursuers.map((e) => !!g.siCollected[e.until]), due: pursuerDue(g) || cameoDue(g) };
}

/** The sprites of a pursuer that is going (the pieces, the tumble), as the collision check's mask (they are no part of what kills him). */
export function pursuerSprites(g: Game): number {
  let mask = 0;
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (!e) continue;
    if (p.gone === 'split') for (const s of e.split?.sprites ?? []) mask |= 1 << s;
    if (p.gone === 'knocked' || p.intro >= 0) mask |= 1 << spriteOf(e);
  }
  return mask;
}
