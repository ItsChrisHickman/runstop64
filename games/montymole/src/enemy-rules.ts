/**
 * The rules of the six things a room has that move (`$8751`, every pass), apart from how they are drawn: the records, a patrol's legs, a relay
 * waking the next, a chaser aiming. Wanted: Monty Mole (src/enemies.ts, which draws them on the Spectrum's screen) and the remix
 * (games/montymoleremix, which draws them as Monty on the Run's creatures) both run these; what a step *looks like* is each one's hook.
 *
 * A record is 20 bytes (`$C596`, copied from the room when it is entered):
 *
 *   +0 state   0 patrols, 1 chases, 3 is none; anything else (the data uses 2) is a relay, below
 *   +1 +2, +3 +4, +5 +6, +7 +8   the frame sets for direction 0, 1, 2, 3 (each four frames of 32 bytes), as addresses
 *   +9 colour of its cells   +A its link: the record a relay wakes, and a chaser's strength   +B direction (0 up, 1 down, 2 left, 3 right)
 *   +C +D x, y   +E the length of its leg in passes   +F the animation counter   +10 passes left in the leg   +11 its step in pixels
 *
 * A patrol goes `+E` passes one way, turns and goes `+E` back (0 and 1 are a pair, 2 and 3 the other), changing its frame set. A relay does the
 * same from its start, and on the last pass of its leg it goes (state 3, its steps and place put back where they began) and wakes the record
 * it links to (state 2): the chains of the data time the pickets and the falling things. A chaser aims at Monty when a random byte is above its
 * strength and turns round at a wall.
 */
import type { Random } from './random';

export const ENEMY_COUNT = 6;
export const RECORD_SIZE = 20;

export const EnemyState = { patrol: 0, chase: 1, relay: 2, none: 3 } as const;

const wrap = (n: number): number => n & 0xff;

export class Enemy {
  state = 3;
  /** the frame sets for directions 0-3 (+1 to +8) */
  readonly sets = [0, 0, 0, 0];
  colour = 0;
  link = 0;
  dir = 0;
  x = 0;
  y = 0;
  legs = 0;
  counter = 0;
  left = 0;
  step = 0;
  /** +12, +13: never used */
  readonly spare = [0, 0];

  /** Read the 20 bytes of a record. */
  fromBytes(b: readonly number[], at = 0): void {
    const w = (i: number): number => (b[at + i] ?? 0) | ((b[at + i + 1] ?? 0) << 8);
    this.state = b[at] ?? 0;
    for (let k = 0; k < 4; k++) this.sets[k] = w(1 + 2 * k);
    this.colour = b[at + 9] ?? 0; this.link = b[at + 10] ?? 0; this.dir = b[at + 11] ?? 0;
    this.x = b[at + 12] ?? 0; this.y = b[at + 13] ?? 0; this.legs = b[at + 14] ?? 0; this.counter = b[at + 15] ?? 0;
    this.left = b[at + 16] ?? 0; this.step = b[at + 17] ?? 0;
    this.spare[0] = b[at + 18] ?? 0; this.spare[1] = b[at + 19] ?? 0;
  }

  /** The record as the original's bytes. */
  toBytes(): number[] {
    const out = [this.state];
    for (const s of this.sets) out.push(s & 255, s >> 8);
    out.push(this.colour, this.link, this.dir, this.x, this.y, this.legs, this.counter, this.left, this.step, ...this.spare);
    return out;
  }
}

/** What the enemies need of Monty. */
export interface Target {
  readonly x: number;
  readonly y: number;
}

/** What a game says to the rules: what a step looks like, and what the way ahead of a chaser is. */
export interface EnemyHooks {
  /** A record took a step (a patrol or a relay still on its leg): it is where it now is; it was at (`oldX`, `oldY`). */
  moved(e: Enemy, oldX: number, oldY: number): void;
  /** `$88F4`: whether there is anything on the way ahead of a chaser. */
  blocked(e: Enemy): boolean;
  readonly target: Target;
  readonly random: Random;
}

/** `$8751`: every record once. */
export function passEnemies(list: readonly Enemy[], hooks: EnemyHooks): void {
  for (const e of list) one(list, e, hooks);
}

function one(list: readonly Enemy[], e: Enemy, hooks: EnemyHooks): void {
  if (e.state === EnemyState.patrol) { move(e, hooks); return; }
  if (e.state === EnemyState.chase) { chase(e, hooks); return; }
  if (e.state === EnemyState.none) return; // $8964
  // a relay (`$8969`): on the last pass of its leg it goes and wakes the next
  if (wrap(e.left - 1) !== 0) { move(e, hooks); return; }
  e.left = e.legs;
  e.state = EnemyState.none;
  const next = list[e.link];
  if (next !== undefined) next.state = EnemyState.relay; // (the link is a record number; a larger one would write over what follows the records)
  const back = wrap(e.step * wrap(e.legs - 1)); // $8998: the distance its leg took it (the `DJNZ` runs 256 times for a leg of 1: B = 0, then 255 more, and `E - 1` is the byte)
  if (e.dir === 0) e.y = wrap(e.y - back);
  else if (e.dir === 1) e.y = wrap(e.y + back);
  else if (e.dir === 2) e.x = wrap(e.x + back);
  else if (e.dir === 3) e.x = wrap(e.x - back);
}

/** `$887D`: a chaser: aims at Monty when its strength is below the random byte, turns round at a wall, then steps. */
function chase(e: Enemy, hooks: EnemyHooks): void {
  const monty = hooks.target;
  const byte = hooks.random.byte(); // $FD9B: C is its low byte
  if (e.link < byte) { // $8885: CP C, JR NC: a strength at least the byte leaves it as it was
    let dx: number;
    if (monty.x >= e.x) { dx = monty.x - e.x; e.dir = 3; } else { dx = e.x - monty.x; e.dir = 2; }
    let dy: number, vertical: number;
    if (monty.y >= e.y) { dy = monty.y - e.y; vertical = 0; } else { dy = e.y - monty.y; vertical = 1; }
    e.counter = vertical; // ($0F is the animation counter: the code keeps the vertical direction there)
    if (dy >= dx) e.dir = vertical;
  }
  if (hooks.blocked(e)) { // $88D0: the way ahead; a wall turns it round
    e.dir = e.dir === 0 ? 1 : e.dir === 1 ? 0 : e.dir === 2 ? 3 : 2;
  }
  move(e, hooks);
}

/** `$8762`: a step: the place, the leg counted, the frame set (and the turn at the leg's end), the animation counter. */
function move(e: Enemy, hooks: EnemyHooks): void {
  const oldX = e.x, oldY = e.y;
  let left: number;
  switch (e.dir) {
    case 0:
      e.y = wrap(e.y + e.step);
      left = wrap(e.left - 1);
      if (left === 0) { e.dir = 1; left = e.legs; }
      break;
    case 1:
      e.y = wrap(e.y - e.step);
      left = wrap(e.left - 1);
      if (left === 0) { e.dir = 0; left = e.legs; }
      break;
    case 2:
      e.x = wrap(e.x - e.step);
      left = wrap(e.left - 1);
      if (left === 0) { e.dir = 3; left = e.legs; }
      break;
    default:
      e.x = wrap(e.x + e.step);
      left = wrap(e.left - 1);
      if (left === 0) { e.dir = 2; left = e.legs; }
  }
  e.left = left;
  e.counter = (e.counter + 1) & 7;
  hooks.moved(e, oldX, oldY);
}
