/**
 * The things lying about the rooms and the four Monty can carry.
 *
 * The item list ($6D7B, 236 entries) says which room holds what and in which cell; a room shows the first
 * four of its entries not yet collected, each as 2 x 2 characters ($694F). Touching the top left of one
 * ($6A65) does what its *type* says ($6AB1): most types are score, money or progress, a few have other
 * effects (a life, a random bonus, death), and the rest are carried: up to four at a time,
 * handed over later in the rooms that want them (`take`, from the room scripts and the enemies).
 *
 * ENHANCED's "carry anything" (`unlimited`): no limit on what he carries, so a pickup is never refused. A plane ticket takes no hand
 * (it is a count, `tickets`); the four boxes show the four things picked up last that he still holds, and the rest wait in the
 * `pack` to come back into a box as one is handed over. `take` looks everywhere, the boxes first. The original's four hands are
 * `carried` and are all the original ever has; with the pack and the tickets empty, nothing here differs from it.
 */
import { TABLES } from './data';
import type { Game } from './game';
import { COLS } from './room';
import { State } from './tiles';

/** The item type of a plane ticket: the flight takes one ($758F, `Game.boarding`). */
export const TICKET = 0;

/** The characters the four slots' top left corners are ($2F + 4 x slot). */
const SLOT_CODES = [0x2f, 0x33, 0x37, 0x3b] as const;
const SLOTS = 4;

/** What a type does when touched ($6AB1). */
const Effect = {
  Carry: 0, Leaf: 1, Points: 2, MoneyByType: 3, ScoreByType: 4, Life: 5, Bonus: 6, ForceEnemy: 7, Intro: 8, Lucky: 9, Death: 10,
} as const;
type Effect = (typeof Effect)[keyof typeof Effect];

const EFFECT_OF_TYPE: readonly Effect[] = [
  Effect.Carry, Effect.Leaf, Effect.Points, Effect.Carry, Effect.Carry, Effect.Carry, Effect.ScoreByType, Effect.Carry,
  Effect.Intro, Effect.Lucky, Effect.Carry, Effect.Carry, Effect.Carry, Effect.Life, Effect.MoneyByType, Effect.ForceEnemy,
  Effect.Bonus, Effect.Life, Effect.Carry, Effect.Carry, Effect.MoneyByType, Effect.Death, Effect.Carry, Effect.MoneyByType,
  Effect.MoneyByType, Effect.MoneyByType, Effect.ScoreByType, Effect.Life, Effect.ScoreByType, Effect.ScoreByType, Effect.ScoreByType, Effect.ScoreByType,
];

/** An item that is no prize: room 2's death trap ($6B2D), which a map's count of what is left leaves out. */
export const isTrap = (e: { readonly room: number; readonly type: number }): boolean => e.room === 2 && EFFECT_OF_TYPE[e.type] === Effect.Death;

/**
 * A change of the boxes the carried items are shown in (stage 4: the panel draws them as the game does, when it
 * changes them). `type` null: the box is emptied. `colourSlot`: whose colours the box is drawn in ($6D6B: the
 * slot of the item picked up, or, for an item handed to him, the box's own number: the game uses what the table holds).
 */
export interface BoxEvent {
  readonly hand: number;
  readonly type: number | null;
  readonly colourSlot: number;
  /** A thing coming into a box from the pack is drawn in its own colours (its slot is long gone). */
  readonly colours?: readonly number[];
}

/** A carried thing waiting out of the boxes, and when it was picked up (later is higher). */
export interface Held {
  readonly type: number;
  readonly stamp: number;
}

/** An item type's four colours ($6D6B: what its slot held when it was lying in a room). */
export const coloursOfType = (type: number): number[] => Array.from(TABLES.itemColours.subarray(type * 4, type * 4 + 4));

/** One line of what he carries: a type, how many (the tickets are counted) and when it was picked up (0: not known). */
export interface Carried {
  readonly type: number;
  readonly count: number;
  readonly stamp: number;
}

export class Items {
  /** Told of every change of a box, if the panel wants to know. */
  onBox: ((event: BoxEvent) => void) | null = null;
  /** Bit 7 of each list entry's room byte: collected. */
  readonly collected: boolean[] = TABLES.items.map(() => false);
  /** $6947-$694A: the types carried, $FF for an empty hand. */
  readonly carried: number[] = [0xff, 0xff, 0xff, 0xff];
  /** $693B-$693E: the type of each of the room's four slots (0 when empty, or once picked up). */
  readonly slotType: number[] = [0, 0, 0, 0];
  /** $693F-$6946: the list entry each slot shows (-1: none). */
  readonly slotEntry: number[] = [-1, -1, -1, -1];
  /** $694E: the slot just touched. */
  touched = 0;
  /** ENHANCED's carry anything is on (the front end's assist, via the game). */
  unlimited: () => boolean = () => false;
  /** ENHANCED: plane tickets, which take no hand. */
  tickets = 0;
  /** ENHANCED: what he carries beyond the four boxes, oldest first. */
  readonly pack: Held[] = [];
  /** When the thing in each box was picked up (0: before anything was kept: a save from before, a scene's). */
  readonly stamps: number[] = [0, 0, 0, 0];
  /** The last pick-up's number. */
  serial = 0;

  /** $694F: put the first four uncollected items of the room into its cells. */
  place(room: number, cells: Uint8Array): void {
    this.slotType.fill(0);
    this.slotEntry.fill(-1);
    let slot = 0;
    for (let i = 0; i < TABLES.items.length && slot < SLOTS; i++) {
      const e = TABLES.items[i];
      if (!e || e.room !== room || this.collected[i]) continue;
      this.slotType[slot] = e.type;
      this.slotEntry[slot] = i;
      const c = SLOT_CODES[slot] ?? 0;
      cells[e.cell] = c;
      cells[e.cell + 1] = c + 2;
      cells[e.cell + COLS] = c + 1;
      cells[e.cell + COLS + 1] = c + 3;
      slot++;
    }
  }

  /**
   * $6CB9: is `type` in his hands? If so it is handed over (the box is emptied). Beyond the original's hands: a ticket counted,
   * or a thing in the pack (the latest picked up) is found too; a box emptied is filled from the pack, the latest first.
   */
  take(type: number): boolean {
    if (type === TICKET && this.tickets > 0) {
      this.tickets--;
      return true;
    }
    const at = this.carried.indexOf(type);
    if (at < 0) return this.takeFromPack(type);
    this.carried[at] = 0xff;
    this.stamps[at] = 0;
    const back = this.latestInPack();
    const next = back < 0 ? undefined : this.pack.splice(back, 1)[0];
    if (!next) {
      this.onBox?.({ hand: at, type: null, colourSlot: 0 });
      return true;
    }
    this.carried[at] = next.type;
    this.stamps[at] = next.stamp;
    this.onBox?.({ hand: at, type: next.type, colourSlot: at, colours: coloursOfType(next.type) });
    return true;
  }

  /** Is `type` in his hands (or, in ENHANCED, counted or in the pack)? Nothing is taken. */
  has(type: number): boolean {
    return (type === TICKET && this.tickets > 0) || this.carried.includes(type) || this.pack.some((h) => h.type === type);
  }

  private latestInPack(): number {
    let best = -1;
    this.pack.forEach((h, i) => { if (best < 0 || h.stamp >= (this.pack[best]?.stamp ?? 0)) best = i; });
    return best;
  }

  private takeFromPack(type: number): boolean {
    let at = -1;
    this.pack.forEach((h, i) => { if (h.type === type && (at < 0 || h.stamp >= (this.pack[at]?.stamp ?? 0))) at = i; });
    if (at < 0) return false;
    this.pack.splice(at, 1);
    return true;
  }

  /** $6BBC: put a type into the first empty hand, if there is one (ENHANCED: always). */
  give(type: number): void {
    const at = this.carried.indexOf(0xff);
    if (at < 0 && !this.unlimited()) return;
    this.add(type, at < 0 ? 0 : at);
  }

  /**
   * ENHANCED's pick-up, and `give`'s: a ticket is counted, anything else goes into the first empty box; with none, the box of
   * the thing picked up longest ago goes to the pack and the new thing takes its place.
   */
  private add(type: number, colourSlot: number): void {
    if (type === TICKET && this.unlimited()) {
      this.tickets++;
      return;
    }
    let hand = this.carried.indexOf(0xff);
    if (hand < 0) {
      hand = this.stamps.indexOf(Math.min(...this.stamps));
      this.pack.push({ type: this.carried[hand] ?? TICKET, stamp: this.stamps[hand] ?? 0 });
    }
    this.carried[hand] = type;
    this.stamps[hand] = ++this.serial;
    this.onBox?.({ hand, type, colourSlot });
  }

  /** Everything he carries, the latest picked up first, with the tickets (counted) last. */
  list(): Carried[] {
    const things: Carried[] = [
      ...this.carried.flatMap((type, hand) => (type === 0xff ? [] : [{ type, count: 1, stamp: this.stamps[hand] ?? 0 }])),
      ...this.pack.map((h) => ({ type: h.type, count: 1, stamp: h.stamp })),
    ].sort((a, b) => b.stamp - a.stamp);
    const tickets = things.filter((t) => t.type === TICKET);
    const rest = things.filter((t) => t.type !== TICKET);
    const count = this.tickets + tickets.length;
    return count > 0 ? [...rest, { type: TICKET, count, stamp: 0 }] : rest;
  }

  /** $6A65: is Monty touching an item? Then do what it does. */
  pickup(g: Game): void {
    const px = (g.monty.x + 3) & 0xff, py = (g.monty.y + 2) & 0xff;
    const slot = SLOT_CODES.findIndex((c) => c === g.world.look(px, py).code);
    if (slot < 0) return;
    this.touched = slot;
    const cell = (py >> 3) * COLS + (px >> 3);
    const type = this.slotType[slot] ?? 0;
    switch (EFFECT_OF_TYPE[type]) {
      case Effect.Carry: return this.carry(g, slot, cell, type);
      case Effect.Leaf: // $6B22: the yellow leaf of the first room, 75 points and nothing else. (The commercial game's hidden cheat
        // typed as MONTY before loading turns it into a shield; this copy is a crack whose $6B22 reads the stray byte $0143 for it, so
        // it is always on there. The port is the game without the cheat: no shield, in either mode.)
        g.score.add(0x4b);
        break;
      case Effect.Points: // $6AF1
        g.score.add(0x23);
        g.progress = (g.progress + 1) & 0xff;
        g.money.add(0x32);
        g.sound.effect(0x46);
        break;
      case Effect.MoneyByType: // $6B03: money 8 x the type
        g.progress = (g.progress + 1) & 0xff;
        g.money.add(type << 3);
        break;
      case Effect.ScoreByType: // $6B13: score 4 x the type
        g.progress = (g.progress + 1) & 0xff;
        g.score.add(type << 2);
        break;
      case Effect.Life: // $6B9F (no limit here: the progress bar's gift stops at 12)
        g.lives = (g.lives + 1) & 0xff;
        g.sound.effect(0x4a);
        break;
      case Effect.Bonus: // $6B42: a random 1-15, four helpings
        g.bonus = this.randomBelow(g, 0x0f);
        g.bonusFlag = 0xaa;
        for (let i = 0; i < 4; i++) g.score.add(0x67);
        g.sound.effect(0x4a);
        break;
      case Effect.Lucky: // $6B64: a random 1-31, six helpings
        g.bonus = this.randomBelow(g, 0x1f);
        g.bonusFlag = 0xff;
        for (let i = 0; i < 6; i++) g.score.add(0xad);
        g.sound.effect(0x4a);
        break;
      case Effect.ForceEnemy: // $6B86: the third enemy's picture is changed
        g.enemies.setFrame(2, 0xa3);
        break;
      case Effect.Intro: // $6B8C: the walk-in state (the ending's or the title's)
        g.progress = (g.progress + 1) & 0xff;
        g.monty.state = State.Intro;
        g.score.add(0xbf);
        g.sound.tune(6); // (not asked about the flag: $6B9B)
        break;
      case Effect.Death: // $6B2D: room 2's is a trap
        if (g.world.room === 2) g.monty.state = State.Dying;
        else {
          g.progress = (g.progress + 1) & 0xff;
          g.score.add(0xb1);
        }
        break;
      default: throw new Error(`item type ${type}`);
    }
    this.collect(g, slot, cell);
  }

  /** $6D04: the item is gone from the room (its entry is marked, its four cells emptied). */
  private collect(g: Game, slot: number, cell: number): void {
    const entry = this.slotEntry[slot] ?? -1;
    if (entry >= 0) this.collected[entry] = true;
    const cells = g.world.cells;
    cells[cell] = 0;
    cells[cell + 1] = 0;
    cells[cell + COLS] = 0;
    cells[cell + COLS + 1] = 0;
  }

  /** A random number from 1 to `mask`, asked for until it isn't 0 ($6B42, $6B64). */
  private randomBelow(g: Game, mask: number): number {
    for (;;) {
      const r = g.rng.next() & mask;
      if (r !== 0) return r;
    }
  }

  /** $6BAA: a carried item goes into the first empty hand; with none free it stays where it is (ENHANCED: it is always taken). */
  private carry(g: Game, slot: number, cell: number, type: number): void {
    const free = this.carried.indexOf(0xff);
    if (free < 0 && !this.unlimited()) return;
    g.sound.effect(0x46);
    this.slotType[slot] = 0;
    this.collect(g, slot, cell);
    this.add(type, slot);
  }
}
