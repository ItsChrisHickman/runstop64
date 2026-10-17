/**
 * The whole game's logic: one `pass` is the original's main loop (`$822B`), 25 a second: count, drain the gauge when it is due,
 * Monty's move, the room's script, the check for the end and the items. Lives, score, the room, the entity table, the items and the
 * scripts' own state are kept here; nothing is drawn (the picture is stage 4).
 *
 * The scripts are written against `Stage` (stage.ts) and run as the original runs them, including how they end: a death or a
 * way out abandons the script (the original resets the stack and jumps to the room's restart routine, `$9592`), the room is
 * entered again, and the script runs again from the top in the same pass (`$9238`), which is why a pass may run two scripts.
 */
import { BLANK_FRAME, MAP_COLUMNS, ROOM_COUNT, ROOM_SIZE, mapMemory, roomAttrs } from './data';
import { ScriptClock } from './cycle';
import { drainsOnPass, Gauge } from './gauge';
import { Items, ITEM_SCORE } from './items';
import { Monty, State, type Outside } from './monty';
import type { Random } from './random';
import { StateReader, StateWriter } from './state';
import { Room0 } from './rooms/room0';
import { Room1 } from './rooms/room1';
import { Room2 } from './rooms/room2';
import { Room3 } from './rooms/room3';
import { Room4 } from './rooms/room4';
import { Room5 } from './rooms/room5';
import type { RoomScript } from './rooms/script';
import { Abandon, Entity, ENTITY_COUNT, type Death, type Sprite, type Stage, type WritableTiles } from './stage';

export const START_LIVES = 5;
/** A new game puts Monty in room 0, above the floor (`$8211`), and he falls to it. */
export const GAME_START = { x: 0x04, y: 0x64 } as const;

/** What the room's restart routine does (`$926E` points at them): where Monty goes, what the pocket box shows, whether his state is cleared. */
interface Arrival {
  readonly x: number;
  readonly y: number;
  readonly pocket?: number;
  readonly clearState?: boolean;
}
/** The restart routines of rooms 0-5, which are also where each exit leads (`$936A`, `$935C`, `$9556`, `$96EB`, `$9C1C`, `$9C37`). */
export const ARRIVALS: readonly Arrival[] = [
  { x: 0x04, y: 0x78 },
  { x: 0x04, y: 0x78 },
  { x: 0x04, y: 0x68, pocket: 0x6f },
  { x: 0x18, y: 0x08, pocket: 0x24, clearState: true },
  { x: 0xee, y: 0x78, pocket: BLANK_FRAME, clearState: true },
  { x: 0x28, y: 0x70, clearState: true },
];

/** The room's tile map in the original's memory layout (`$8103`): a lookup is `memory[base + (y >> 3) * 32 + (x >> 3)]`. */
export class RoomTiles implements WritableTiles {
  /** the maps then the attribute tables ($6000-$80FF); room 2 rewrites its map as it plays */
  readonly memory = mapMemory();
  base = 0;

  enter(room: number): void {
    if (room < 0 || room >= ROOM_COUNT) throw new Error(`no room ${room}`);
    this.base = room * ROOM_SIZE;
  }

  /** Below the room's last row a lookup runs on into what follows, as the original's does. */
  at(x: number, y: number): number {
    return this.memory[this.base + ((y & 0xff) >> 3) * MAP_COLUMNS + ((x & 0xff) >> 3)];
  }
}

/** Everything the game keeps, copied out: what a save holds, and what a planner returns to after trying a move. */
export interface GameSnapshot {
  readonly numbers: readonly number[];
  /** the maps and attribute tables ($6000-$80FF): room 2 rewrites its map */
  readonly map: Uint8Array;
  /** the room's attributes as shown */
  readonly attrs: Uint8Array;
}

/**
 * What the picture needs to hear as the game goes, at the moment it happens (the original draws as it goes, and what it draws
 * depends on the state then: the map as the room is entered, Monty's place as he dies). The display (display.ts) is the one listener.
 */
export interface Observer {
  /** a new game begins: the screen is cleared and the panel put up, before room 0 is entered (`$81BC`) */
  newGame(): void;
  /** a room has just been entered (`$854A`): its tiles are drawn, the gauge is full */
  roomEntered(): void;
  /** the arrival routine puts the item box up at once (`$878A`: rooms 2, 3 and 4) */
  pocketShown(): void;
  /** the gauge ran out: the panel flashes before the death (`$A2D1`) */
  timedOut(): void;
  /** Monty died, a life is gone (`$9592`, `$95C8`) */
  died(kind: Death): void;
  /** cells are to be drawn again from the map (a script's `SET 0` on their counters: the conveyors, the pistons) */
  redraw(first: number, count: number): void;
  /** an item's cell is cleared (`$86AB`) */
  itemTaken(cell: number): void;
  /** the pass's picture is drawn (`$87C4`, then the conveyors turn) */
  drawn(): void;
}

/** How a pass ended: the game goes on, lives ran out (game over), or the last delivery was made (the ending). */
export type Outcome = 'playing' | 'over' | 'ended';

export class Game implements Stage, Outside {
  readonly tiles = new RoomTiles();
  /** the room's attributes as shown, rows 0-17 */
  readonly attrs = new Uint8Array(ROOM_SIZE);
  readonly monty = new Monty(this);
  /** entities 1-7, the room's own things (`$8125`-`$8140`); Monty is entity 0 */
  private readonly things: readonly Entity[] = Array.from({ length: ENTITY_COUNT - 1 }, () => new Entity());
  readonly entities: readonly Sprite[] = [this.monty, ...this.things];
  readonly gauge = new Gauge();
  readonly clock = new ScriptClock();
  readonly items = new Items();
  readonly rooms = { r0: new Room0(), r1: new Room1(), r2: new Room2(), r3: new Room3(), r4: new Room4(), r5: new Room5() } as const;
  lives = START_LIVES;
  score = 0;
  highScore = 0;
  /** the pass counter (`$A2A0`, a byte) */
  counter = 0;
  /** the HUD pocket box's picture (a sprite frame) */
  pocket = BLANK_FRAME;
  /** the beeper effects asked for during the last pass, in order */
  readonly sounds: number[] = [];
  /** the room was entered during this pass (`$8108`) */
  first = false;
  /** who hears of the picture's moments (the display), if anyone */
  observer: Observer | null = null;
  private current = 0;
  /** the last delivery has been made: the ending follows this pass (`$A2A1`) */
  ended = false;

  /** `start` false leaves the game unstarted, for a flow that starts it (`newGame`) when the credits page is left. */
  constructor(readonly rng: Random, start = true) {
    if (start) this.newGame();
  }

  // ---- what Monty and the scripts ask of the world -----------------------------------------------

  get room(): number { return this.current; }
  get scriptFrame(): number { return this.clock.cycle.frame; }
  get partnerX(): number { return this.entities[2].x; }
  get itemsLeft(): number { return this.items.left; }

  sound(effect: number): void { this.sounds.push(effect); }
  drain(): void { this.gauge.drain(); }
  redraw(first: number, count: number): void { this.observer?.redraw(first, count); }
  addScore(points: number): void { this.score = (this.score + points) >>> 0; }
  setPocket(frame: number): void { this.pocket = frame; }
  finish(): void { this.ended = true; }

  setMontyState(state: number): void {
    this.monty.state = state;
    this.monty.phase = 0;
  }

  /** Set the room and its map without entering it (restoring a saved game; the lockstep test, which takes the rest from the original). */
  setRoom(room: number): void {
    this.current = room;
    this.tiles.enter(room);
  }

  die(kind: Death): never { throw new Abandon(this.current, kind); }
  leave(room: number): never { throw new Abandon(room, null); }

  // ---- rooms, new games ---------------------------------------------------------------------------

  /** Enter a room (`$854A`): its map and attributes, a full gauge, the entity table cleared, the items found, the scripts told it is new. */
  enterRoom(room: number): void {
    this.current = room;
    this.tiles.enter(room);
    if (room === 6) return; // (the card is drawn over the screen and nothing more: stage 5)
    for (const e of this.things) e.reset();
    this.first = true;
    this.gauge.refill();
    this.attrs.set(roomAttrs(room));
    this.items.scan(this.tiles, this.attrs, this.rng);
    this.observer?.roomEntered();
  }

  /** A new game (`$81BC`): the high score is kept, the score cleared, five lives, room 0, Monty above the floor. */
  newGame(): void {
    if (this.score > this.highScore) this.highScore = this.score;
    this.score = 0;
    this.lives = START_LIVES;
    this.pocket = BLANK_FRAME;
    this.ended = false;
    this.observer?.newGame();
    this.monty.state = State.walking;
    this.monty.phase = 0;
    this.monty.jumpKeys = 0;
    this.monty.ropeDown = 0;
    this.enterRoom(0);
    this.monty.x = GAME_START.x;
    this.monty.y = GAME_START.y;
  }

  /** Enter a room the way its restart routine does, after a death or by an exit (`$936A`-`$9C37`). */
  private arrive(room: number): void {
    const a = ARRIVALS[room];
    if (a === undefined) throw new Error(`room ${room} has no arrival`);
    if (a.pocket !== undefined) {
      this.setPocket(a.pocket);
      this.observer?.pocketShown();
    }
    if (a.clearState === true) this.setMontyState(State.walking);
    this.monty.x = a.x;
    this.monty.y = a.y;
    this.enterRoom(room);
  }

  /** The death (`$9592`, `$95C8`): a life less and a sound; the full one also shows Monty's three death pictures, ending on none. */
  private applyDeath(kind: Death): void {
    this.sound(kind === 'normal' ? 0 : 1);
    this.lives--;
    if (kind === 'normal') this.monty.frame = BLANK_FRAME;
    this.monty.state = State.walking;
    this.monty.phase = 0;
    this.observer?.died(kind);
  }

  // ---- saving ----------------------------------------------------------------------------------------------

  snapshot(): GameSnapshot {
    const w = new StateWriter();
    w.put(this.lives, this.score, this.highScore, this.counter, this.pocket, this.current);
    w.flag(this.first);
    w.flag(this.ended);
    this.monty.save(w);
    this.gauge.save(w);
    this.clock.save(w);
    for (const e of this.things) w.put(e.x, e.y, e.frame, e.flags);
    this.items.save(w);
    for (const room of this.scripts()) room.save(w);
    return { numbers: w.numbers, map: this.tiles.memory.slice(), attrs: this.attrs.slice() };
  }

  restore(s: GameSnapshot): void {
    const r = new StateReader(s.numbers);
    this.lives = r.get(); this.score = r.get(); this.highScore = r.get(); this.counter = r.get(); this.pocket = r.get();
    this.setRoom(r.get());
    this.first = r.flag();
    this.ended = r.flag();
    this.monty.load(r);
    this.gauge.load(r);
    this.clock.load(r);
    for (const e of this.things) { e.x = r.get(); e.y = r.get(); e.frame = r.get(); e.flags = r.get(); }
    this.items.load(r);
    for (const room of this.scripts()) room.load(r);
    this.tiles.memory.set(s.map);
    this.attrs.set(s.attrs);
  }

  /** The six scripts in room order. */
  private scripts(): readonly RoomScript[] {
    const r = this.rooms;
    return [r.r0, r.r1, r.r2, r.r3, r.r4, r.r5];
  }

  // ---- a pass -----------------------------------------------------------------------------------------------

  private script(room: number): RoomScript {
    const script = this.scripts()[room];
    if (script === undefined) throw new Error(`room ${room} has no script`);
    return script;
  }

  /**
   * The scripts' part of the pass (`$9234`): step their animation, kill Monty if the gauge is empty, run the room's script. When
   * the script ends the pass early the room is started again and its script runs from the top.
   */
  private runScripts(): void {
    for (;;) {
      try {
        this.clock.step();
        if (this.gauge.empty) {
          this.observer?.timedOut();
          this.die('normal');
        }
        this.script(this.current).run(this);
        return;
      } catch (e) {
        if (!(e instanceof Abandon)) throw e;
        if (e.death !== null) this.applyDeath(e.death);
        this.arrive(e.room);
      }
    }
  }

  /** One logic pass with the keys `keys` (`readKeys`, input.ts). */
  pass(keys: number): Outcome {
    this.sounds.length = 0;
    this.counter = (this.counter + 1) & 0xff;
    if (drainsOnPass(this.current, this.counter, this.rooms.r2.holdsGauge)) this.gauge.drain();
    this.monty.pass(keys);
    this.runScripts();
    if (this.ended) return 'ended';
    if (this.lives < 0) return 'over';
    this.items.collect(this.monty, this.tiles, this.attrs, (cell) => {
      this.addScore(ITEM_SCORE);
      this.sound(2);
      this.observer?.itemTaken(cell);
    });
    this.observer?.drawn();
    this.first = false;
    return 'playing';
  }
}
