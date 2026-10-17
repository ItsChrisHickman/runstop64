/**
 * A player for the whole game: what to do in each room, as goals for the bot (test/bot.ts).
 *
 *   rooms 0, 1, 4: take every item, then go where the exit will be and wait for it;
 *   room 2: stand on the one spot that starts the puzzle, wait on the platform out of everything's way, take the prize;
 *   room 3: along each lane to its right end;
 *   room 5: fly to the pile, take a newspaper, fly to the shop, four times.
 *
 * The goals depend only on the game's state, so a death (the room starts again) needs no special care.
 */
import type { Spectrum } from '../../../tools/zx/spectrum';
import type { Game } from '../src/game';
import { touching } from '../src/primitives';
import { type Goal, Walker } from './bot';
import type { Driver } from './lockstep-core';

/** The pit in room 2's floor kills whoever falls into it (`$95F1`). */
const inPit = (x: number, y: number): boolean => x >= 0x5e && x < 0xa8 && y >= 0x70;

/** Whether two points are less than 8 pixels apart both ways (an item is taken). */
const near = (ax: number, ay: number, bx: number, by: number): boolean => Math.abs(ax - bx) < 8 && Math.abs(ay - by) < 8;

const laneOf = (y: number): number => (y < 9 ? 0 : y < 0x41 ? 1 : 2);

/** A place for Monty, wherever he stands there (the goals' regions are written as rectangles). */
const box = (x0: number, x1: number, y0: number, y1: number, hold: boolean, extra: Partial<Goal> = {}): Goal => ({
  region: (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1,
  hold,
  ...extra,
});

export class Player implements Driver {
  /** what happened, in words, for the report */
  readonly log: string[] = [];
  private readonly walker = new Walker(() => this.goal(), 400, true, 50);
  private g: Game | null = null;
  private readonly cache = new Map<string, Goal>();
  private lives = 5;
  private previous = '';
  private room = -1;
  private carrying = 0;
  private items = -1;
  /** the passes spent, by room, for the report */
  readonly passesIn = new Map<number, number>();

  private cached(key: string, make: () => Goal): Goal {
    const found = this.cache.get(key);
    if (found !== undefined) return found;
    const made = make();
    this.cache.set(key, made);
    return made;
  }

  /** Take any item that is left (the nearest, by the way the bot measures). */
  private itemGoal(g: Game): Goal {
    const left = g.items.records.filter((r) => r.cell >= 0);
    return this.cached(`items ${g.room} ${left.map((r) => r.cell).join(',')}`, () => ({
      region: (x, y) => left.some((r) => near(r.x, r.y, x, y) || near(r.x, r.y, x + 8, y) || near(r.x, r.y, x, y + 8) || near(r.x, r.y, x + 8, y + 8)),
      forbidden: g.room === 2 ? inPit : undefined,
    }));
  }

  private goal(): Goal | null {
    const g = this.g;
    if (g === null) return null;
    const m = g.monty;
    switch (g.room) {
      case 0: return g.items.left > 0 ? this.itemGoal(g) : this.cached('exit0', () => box(0xc9, 0xe7, 0x68, 0x80, true));
      case 1: return g.items.left > 0 ? this.itemGoal(g) : this.cached('exit1', () => box(0xd8, 0xee, 0x30, 0x40, true));
      case 2: {
        if (g.rooms.r2.puzzle === 0) return this.cached('spot', () => ({ region: (x, y) => x === 0x2e && y === 0x38, forbidden: inPit }));
        if (g.entities[5].frame !== 0x24) return this.cached('platform', () => box(0xa0, 0xb8, 0x50, 0x50, true, { forbidden: inPit }));
        return this.cached('prize', () => ({
          region: (x, y) => x >= 0xcd && y >= 0x51 && y <= 0x7f,
          done: (sim) => touching(sim.monty, sim.entities[4]) || touching(sim.monty, sim.entities[5]),
          forbidden: inPit,
        }));
      }
      case 3: {
        const lane = laneOf(m.y);
        return this.cached(`lane ${lane}`, () => ({
          region: (x, y) => x >= 0xec && laneOf(y) === lane,
          done: (sim) => laneOf(sim.monty.y) === lane + 1, // (leaving to the left goes back a lane)
        }));
      }
      case 4: return g.items.left > 0 ? this.itemGoal(g) : this.cached('exit4', () => box(0xa9, 0xc7, 0x21, 0x3f, true));
      case 5: return g.rooms.r5.carrying === 0
        ? this.cached('pile', () => ({ region: (x, y) => x < 0x20 && y >= 0x61, done: (sim) => touching(sim.monty, sim.entities[6]) }))
        : this.cached('shop', () => ({ region: (x, y) => x >= 0xc1 && y <= 0x36, done: (sim) => touching(sim.monty, sim.entities[7]) }));
      default: return null;
    }
  }

  choose(m: Spectrum, g: Game): void {
    this.g = g;
    this.passesIn.set(g.room, (this.passesIn.get(g.room) ?? 0) + 1);
    if (g.lives < this.lives) this.log.push(`pass ${g.counter}: died in room ${g.room} (lives ${g.lives}); before: ${this.previous}`);
    this.previous = `m ${g.monty.x},${g.monty.y} st${g.monty.state}/${g.monty.phase} gauge ${g.gauge.value} ents ${g.entities.slice(1).map((e) => `${e.x},${e.y},${e.frame.toString(16)}`).join(' ')}`;
    this.lives = g.lives;
    if (g.room !== this.room) { this.log.push(`entered room ${g.room} (score ${g.score}, lives ${g.lives})`); this.room = g.room; this.items = -1; }
    if (g.items.left !== this.items) { if (this.items >= 0) this.log.push(`  items left ${g.items.left}`); this.items = g.items.left; }
    if (g.room === 5 && g.rooms.r5.carrying !== this.carrying) { this.log.push(`  ${g.rooms.r5.carrying !== 0 ? 'took a paper' : 'delivered'}`); this.carrying = g.rooms.r5.carrying; }
    this.walker.choose(m, g);
  }

  get stats(): string { return `searches ${this.walker.plans}, waited ${this.walker.waited}, no way found ${this.walker.stuck}`; }
}
