import { SPLIT_FIRST, splitDeath, type SplitStage } from '../../shared/monty/deaths';
import { cameoDue, inBox, walkOn } from './cameos';
import type { Game } from './game';
import type { PursuerSpec } from './montydata';
import { pulseLiveOver } from './pulses';
import { rollerMeets } from './rollers';

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
 *
 * The chase is felt (Chris, 2026-11-27: "I didn't fully feel the sense that he was pursuing me"): an `announce`d pursuer's coming into sight is a seen cause, the room's name flashing and a sting as he
 * steps in where Monty came in (the trail's start: the door Monty came by, a moment behind him), and again as he is knocked off (the escape's moment); and while he is in sight (`pursuerChasing`) a game
 * with a chase tune plays it (session.ts, `music.chase`), its room's own again once he is gone. All of it again after every death in the room, as the room starts again.
 */

/** Frames the room's name flashes for in an intro, and how long each flash is. */
const FLASH_FRAMES = 96, FLASH = 8;

/** A pursuer of the room: its place in the data's list, the ring of Monty's places (x2, y, facing: three numbers each) and how many were written, whether it has woken, where it is drawn, the steps of its walk, its
 * intro's frames (-1: none or over), and how it went (`gone`: knocked off, split) with the frames since and where it was then. */
export interface PursuerState {
  index: number; ring: number[]; written: number; awake: boolean; x2: number; y: number; facing: number; walk: number; intro: number;
  gone: 'no' | 'knocked' | 'split'; t: number; gx: number; gy: number;
  /** How many frames behind Monty he is now (the data's `delay`, less what he has closed: `close`), the lag a knock sends him back to (`setback`), and the frames until a knock can take him again. */
  lag: number; back: number; shaken: number;
  /** Frames since an announced moment began (his coming into sight, his knock: the name flashing), -1: none; and whether he has come into sight in this go at the room. */
  cue: number; seen: boolean;
}

/** Frames a knocked-back pursuer cannot be knocked again (one flock is one knock), and how many frames of lag he loses a frame as he falls back along the trail. */
const SHAKEN_FRAMES = 30, FALL_BACK = 3;

/** A room is loaded (after its creatures are set up): its pursuer asleep, out of sight, the ring empty; gone for good once its `until` is taken. */
export function pursuerInit(g: Game) {
  g.pursuers = g.data.pursuers.flatMap((e, index): PursuerState[] => {
    if (e.room !== g.roomId) return [];
    const man = g.enemies[e.slot];
    if (man) { man.driven = true; man.x = 0xff; }
    if (g.siCollected[e.until]) return [];
    return [{ index, ring: Array.from({ length: e.delay * 3 }, () => 0), written: 0, awake: false, x2: 0, y: 0, facing: 1, walk: 0, intro: e.intro ? 0 : -1, gone: 'no', t: 0, gx: 0, gy: 0, lag: e.delay, back: e.delay, shaken: 0, cue: -1, seen: false }];
  });
}

/** The pursuer's sprite (4 + its slot). */
const spriteOf = (e: PursuerSpec) => 4 + e.slot;
/** The creature slot of a sprite a split borrows (-1: not a creature's). */
const slotOfSprite = (n: number) => (n >= 4 ? n - 4 : -1);

/** Whether a pursuer is in sight and walking (where it is, for the lever's head). */
export function pursuerAt(g: Game): { x2: number; y: number } | null {
  const p = g.pursuers.find((s) => s.awake && s.gone === 'no' && s.written > s.lag);
  return p ? { x2: p.x2, y: p.y } : null;
}

/**
 * He is escaped, and how he goes. Squashed, the find is taken at once (the room's effects read it: the Sambadrome's bars lift). Knocked off, he goes at once but the find waits for Monty to leave
 * the room alive (`pendingFinds`, taken or dropped by `settlePendingFinds` as the next room loads): a death in the room before that restarts it with him chasing again, so a death never counts as an
 * escape (Chris, 2026-11-25: chased on the ship after two deaths, not after the third, which had come after an unseen knock).
 */
function escape(g: Game, p: PursuerState, e: PursuerSpec, how: 'knocked' | 'split') {
  p.gone = how; p.t = 0; p.gx = p.x2; p.gy = p.y;
  if (e.announce) p.cue = 0;
  if (how === 'split') g.siCollected[e.until] = 0x81;
  else if (!g.pendingFinds.includes(e.until)) g.pendingFinds.push(e.until);
  g.sfx(how === 'split' ? g.data.eventSfx[0] ?? g.data.sfx.item : g.data.sfx.jump);
}

/** A room is being left for room `next`: the escapes waiting on it are taken if he leaves for another room (alive), dropped if the same room loads again (a death's restart). */
export function settlePendingFinds(g: Game, next: number) {
  if (next !== g.roomId) for (const find of g.pendingFinds) g.siCollected[find] = 0x81;
  g.pendingFinds = [];
}

/** The head came down on him: the four-way split. */
export function squashPursuer(g: Game) {
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (e?.split && p.awake && p.gone === 'no') escape(g, p, e, 'split');
  }
}

/**
 * The four-way split (shared/monty/deaths.ts `splitDeath`, Monty on the Run's own, the one owner of it) `p.t` frames in, on the pursuer's four sprites: played on a stage of its own from where he was and read
 * back (its sprites 2, 3, 0 and 1 are the pieces going back, on, up and down; its pictures, from `SPLIT_FIRST`, index his sixteen). Replayed from the start each frame (fifty steps at most), so the state is
 * plain numbers a copy of the game can take. True while a piece is still in sight.
 */
function splitFrame(g: Game, p: PursuerState, e: PursuerSpec): boolean {
  const s = e.split;
  if (!s) return false;
  const stage: SplitStage = { sx: new Uint8Array(8), sy: new Uint8Array(8), sptr: new Uint8Array(8), scol: new Uint8Array(8), enable: 0, multicolour: 0, x2: p.gx, y: p.gy }; // (where he was, as the game gives Monty's)
  const steps = splitDeath(stage);
  for (let n = 0; n < p.t; n++) if (steps.next().done) { stage.enable = 0; break; }
  let shown = false;
  s.sprites.forEach((sprite, k) => {
    const from = [2, 3, 0, 1][k] ?? 0;
    if (!(stage.enable & (1 << from))) { g.enable &= ~(1 << sprite) & 0xff; return; }
    g.sx[sprite] = stage.sx[from] ?? 0; g.sy[sprite] = stage.sy[from] ?? 0; g.sptr[sprite] = s.pictures[(stage.sptr[from] ?? SPLIT_FIRST) - SPLIT_FIRST] ?? 0; g.scol[sprite] = stage.scol[from] ?? 1;
    g.enable |= 1 << sprite;
    shown = true;
  });
  return shown;
}

/** One frame (after Monty's move): Monty's place into the ring, and the pursuer where he was `delay` frames ago, or going, or not yet in sight. */
export function pursuerUpdate(g: Game) {
  for (const p of g.pursuers) {
    const e = g.data.pursuers[p.index];
    if (!e) continue;
    const n = spriteOf(e), man = g.enemies[e.slot];
    if (p.cue >= 0 && !g.actionCounter && !g.freeze) { flashName(g, p.cue); p.cue = p.cue < FLASH_FRAMES ? p.cue + 1 : -1; }
    if (p.gone !== 'no') {
      if (g.actionCounter || g.freeze) continue;
      p.t++;
      if (p.gone === 'split') {
        const borrowed = e.split?.sprites.map(slotOfSprite).filter((s) => s >= 0 && s !== e.slot) ?? [];
        const shown = splitFrame(g, p, e);
        for (const s of borrowed) { const other = g.enemies[s]; if (other) other.driven = shown; }
        if (!shown) { p.gone = 'no'; drop(g, p); }
      } else {
        // knocked: flung up and back the way he came (over the side), falling as he goes, out of the picture
        const y = p.gy - 3 * p.t + Math.floor((p.t * p.t) / 16), x = p.gx + (p.facing & 0x80 ? 3 : -3) * p.t;
        g.sx[n] = Math.min(0xff, Math.max(0, x)); g.sy[n] = Math.min(0xff, Math.max(0, y)); g.sptr[n] = 0x30 + e.slot * 8 + (p.facing & 0x80 ? 0 : 4) + ((p.t >> 2) & 3);
        if (man) g.scol[n] = man.colour;
        if (y >= 0xf8 || x <= 0 || x >= 0xb0) { g.enable &= ~(1 << n) & 0xff; drop(g, p); }
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
    if (p.awake) closeIn(p, e);
    const at = (p.written % e.delay) * 3;
    if (p.written >= p.lag) {
      // where Monty was `lag` frames ago (`delay`, unless he closes in: the oldest place in the ring, about to be written over)
      const from = ((p.written - p.lag) % e.delay) * 3;
      const x2 = p.ring[from] ?? 0, y = p.ring[from + 1] ?? 0, facing = p.ring[from + 2] ?? 1;
      if (x2 !== p.x2 || y !== p.y) p.walk++;
      p.x2 = x2; p.y = y; p.facing = facing;
    }
    p.ring[at] = g.x2; p.ring[at + 1] = g.y; p.ring[at + 2] = g.facing;
    p.written++;
    if (!p.awake && (e.wake ? inBox(g, e.wake) : e.calm ? !inBox(g, e.calm) : true)) p.awake = true;
    if (!p.awake || p.written <= p.lag || !man) { if (p.intro < 0) g.enable &= ~(1 << n) & 0xff; if (e.look?.over) g.enable &= ~(1 << e.look.over.sprite) & 0xff; continue; }
    if (e.announce && !p.seen) { p.seen = true; p.cue = 0; g.sfx(g.data.sfx.warp); } // (he steps in: the room's name flashes, the sting)
    man.x = p.x2; man.y = (p.y + 1) & 0xff;
    g.scol[n] = man.colour;
    drawChase(g, e, p.x2, man.y, p.facing, p.walk);
    if (p.shaken > 0) p.shaken--;
    else if (knocked(g, e, p.x2, man.y)) {
      const setback = e.knockedBy?.setback;
      if (setback === undefined) escape(g, p, e, 'knocked');
      else { p.back = Math.min(e.delay, p.lag + setback); p.shaken = SHAKEN_FRAMES; g.sfx(g.data.sfx.jump); }
    }
  }
}

/** He is gone from the room: out of its list, the name's flash (if one is going) ended in its own colour. */
function drop(g: Game, p: PursuerState) {
  if (p.cue >= 0) flashName(g, FLASH_FRAMES);
  g.pursuers = g.pursuers.filter((q) => q !== p);
}

/** His lag a frame on: falling back along the trail after a knock (a few frames of lag a frame, so he is seen to drop back), else closing in a frame every `close.every` frames. */
function closeIn(p: PursuerState, e: PursuerSpec) {
  if (p.lag < p.back) { p.lag = Math.min(p.back, p.lag + FALL_BACK); return; }
  if (e.close && p.written % e.close.every === 0 && p.lag > e.close.least) p.lag--;
  p.back = p.lag;
}

/** His chase picture at (x2, y) (where Monty was): his creature slot's walk, or his own `look` (its pictures in turn, its offset, the second sprite on him); his sprite (and the second) shown. */
export function drawChase(g: Game, e: PursuerSpec, x2: number, y: number, facing: number, walk: number) {
  const n = spriteOf(e), look = e.look;
  g.sx[n] = (x2 + (look?.dx ?? 0)) & 0xff; g.sy[n] = (y + (look?.dy ?? 0)) & 0xff;
  g.sptr[n] = look ? look.frames[((walk >> 2) & 0xff) % look.frames.length] ?? 0 : 0x30 + e.slot * 8 + (facing & 0x80 ? 0 : 4) + ((walk >> 2) & 3);
  g.enable |= 1 << n;
  const over = look?.over;
  if (!over) return;
  g.sx[over.sprite] = g.sx[n] ?? 0; g.sy[over.sprite] = g.sy[n] ?? 0; g.sptr[over.sprite] = over.ptr; g.scol[over.sprite] = over.colour;
  g.enable |= 1 << over.sprite;
}

/** Whether something of the room his `knockedBy` names meets him: a creature whose picture meets his (the sprites' boxes, 16 by 16), or a tunnel's mouth sweeping over the cells he is in (as it takes Monty off a roof). */
function knocked(g: Game, e: PursuerSpec, x2: number, y: number): boolean {
  const k = e.knockedBy;
  if (!k) return false;
  for (const slot of k.creatures ?? []) {
    const other = g.enemies[slot];
    if (other && other.x !== 0xff && Math.abs(other.x - x2) < 7 && Math.abs(other.y - y) < 14) return true;
  }
  if (k.rollers && rollerMeets(g, x2 * 2 + 2, y + 2, 12, 12)) return true;
  if (k.pulses && pulseLiveOver(g, x2 * 2 + 2, y + 2, 12, 12)) return true;
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

/** Whether a pursuer is after Monty in sight: what a chase tune plays for (session.ts). */
export const pursuerChasing = (g: Game): boolean => pursuerAt(g) !== null;

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
    if (e.look?.over) mask |= 1 << e.look.over.sprite;
  }
  return mask;
}
