/**
 * The game's state and its logic step (stage 3): the world, Monty, the enemies, the lift, the items and
 * the score, with the main loop's logic step round them ($54AE on):
 *
 *   the lift moves twice (the main loop draws in both its phases: $83EE),
 *   Monty ($46AD), the flight ($758F: boarded with a key, flight.ts), the enemies ($5ED0), the pickup
 *   ($6A65), enemies touching him ($5D00), the lift ($8558), the room scripts ($7682), the progress bar
 *   ($54E1), then the lives and deaths ($5510).
 *
 * What the original keeps at fixed addresses is kept here as fields with those addresses in the comments.
 */
import { NO_ROOM, RANDOM, ROOMS, TABLES, WORLD_GRID } from './data';
import { Digits } from './digits';
import { type AnimClock, Enemies, HIDDEN, isPlane, PLANE_FRAMES } from './enemies';
import { copySky, destination, FRESH_SKY, Flight, type SkyState } from './flight';
import { Items, TICKET } from './items';
import { Lift } from './lifts';
import { type Counters, Monty, type MontyHost } from './monty';
import { Random } from './rng';
import { TITLE_ROOM, tuneForRoom } from './sound';
import { SoundLog } from './soundlog';
import { State } from './tiles';
import { World } from './world';

/** A new game's lives byte ($4061): bit 7 set while playing, the rest the lives left. */
export const NEW_GAME_LIVES = 0x86;

/** The room whose first visit with the last delivery made ends the game ($4D). */
const FINAL_ROOM = 0x4d;
/** Progress at which the last delivery is made ($C3). */
const FINAL_PROGRESS = 0xc3;

/** The progress values at which the picture of the way out grows a part ($41, $82, $C3). */
export const PROGRESS_STAGES = [0x41, 0x82, 0xc3];

/** Logic steps (25 a second) on his feet in a room before the way he came in counts as somewhere safe to start again (ENHANCED: two seconds). */
export const SAFE_STEPS = 50;

/** The states a hit puts him in: a grace (the front end's) keeps him out of them. */
const HURT_STATES: readonly number[] = [State.Zap, State.Fire, State.Dying, State.Knocked];

/** Where he came into a room, and in what state: what a death starts him from again ($4040-$4044), and what the map travels to. */
export interface Entry {
  readonly room: number;
  readonly x: number;
  readonly y: number;
  readonly state: number;
  readonly step: number;
}

/** A delivery: the room that wants an item, what it pays and how it counts. */
interface Delivery {
  readonly room: number;
  readonly type: number;
  /** `[amount, times]` added to the money. */
  readonly pay: readonly [number, number];
}

/** $55BF-$5618: the four rooms where handing over the right item pays out. */
const DELIVERIES: readonly Delivery[] = [
  { room: 0x16, type: 0x0b, pay: [0x12, 1] },
  { room: 0x2c, type: 0x0c, pay: [0xfa, 4] },
  { room: 0x3e, type: 0x07, pay: [0xfa, 3] },
  { room: 0x0b, type: 0x04, pay: [0x64, 3] },
];

/**
 * $4ACA, one step of the walk-in (state $11): he faces right, walks right, back left, then stands; the title's two
 * moles do it over and over. Returns true on the step that ends it (the caller then frees him).
 */
export function walkInStep(m: Monty): boolean {
  m.step = (m.step + 1) & 0xff;
  const t = m.step >> 1;
  if (t < 0x2e) {
    if (t === 0x0a) m.faceLeft = false;
  } else if (t < 0x36) {
    m.x = (m.x + 2) & 0xff;
    m.faceLeft = true;
  } else if (t < 0x3e) {
    m.x = (m.x - 2) & 0xff;
    m.faceLeft = false;
  } else if (t === 0x6c) return true;
  return false;
}

/** What carries over from one game to the next in the original's memory (random numbers, the enemies' animation clock, his walk's counters). */
export interface GameCarry {
  readonly rngIndex: number;
  readonly rngSum: number;
  readonly clock: AnimClock;
  readonly counters: Counters;
  /** What the flights leave in the machine (a new game clears only the explosion and the hit's sound). */
  readonly sky: SkyState;
}

/** The program's own values for the first game ($5224 = $DF, $5225 = 4, the clock's toggle clear, as the file has them). */
export const FIRST_GAME: GameCarry = {
  rngIndex: 0xdf, rngSum: 0x04,
  clock: { phase: 0, frame: 0, flip: 0, toggle: 0 },
  counters: { walkPhase: 0, walkFrame: 0, walkToggle: 0, climbPhase: 5, slowToggle: 0 },
  sky: FRESH_SKY,
};

/** The states a plane's boarding is refused in: dying, knocked, and the walk-in ($7598). */
const NO_BOARDING: readonly number[] = [State.Dying, State.Knocked, State.Intro];

export class Game implements MontyHost {
  readonly world: World;
  readonly rng: Random;
  readonly monty: Monty;
  readonly enemies: Enemies;
  readonly lift: Lift;
  readonly items = new Items();
  /** What the flights leave in the machine ($784D-$785F, $3B, $7860-$7861, $809C-$809E, $4063, $4065, $C3FA-$C3FD). */
  readonly sky: SkyState;
  /** The room he is flying to, from the step he boarded in until `land` (the rest of that step waits for the flight, as in the original). */
  boarded: number | null = null;
  private pending: { readonly state: number; readonly step: number; readonly entered: number | null } | null = null;
  readonly score = new Digits();
  readonly money = new Digits();
  /** $4061: lives in the low 7 bits, bit 7 set while he plays; clear when the last one is gone. */
  lives = NEW_GAME_LIVES;
  /** $405D: the jobs done (items delivered, tickets...); at $41, $82 and $C3 the bar grows and a life is given. */
  progress = 0;
  /** $402D: the progress last looked at by the main loop. */
  progressSeen = 0;
  /** $405E: not zero while the shield lasts (enemies cannot hurt him). */
  shield = 0;
  /** $405B, $405C: the last random bonus, and how many steps are left in which the controls are scrambled by it ($61DA). */
  bonus = 0;
  bonusFlag = 0;
  /** $4062: how many times he has paid the toll-keeper (frame $1C). */
  helped = 0;
  /** $4060: set when he carried item 5 into room $1B. */
  quest = 0;
  /** $5DF6: he touched an enemy showing frame $80 this step. */
  contact80 = false;
  /** What the logic asked of the sound drivers (soundlog.ts). */
  readonly sound = new SoundLog();
  /** $4066: the title's choice (0 "MUSIC ON", set "EFFECTS ON"); the rooms' tunes start, and the effects are asked for, only when it is set. */
  soundFlag = 0;
  /** $4064: the room tune playing. */
  tune = 0;
  /** $402A: the ending has been reached. */
  ended = false;
  /** Told when the progress reaches a part of the picture (0, 1, 2: $41, $82, $C3), for the panel (stage 4). */
  onProgress: ((stage: number) => void) | null = null;
  /** Told when a room has been entered and loaded, for the picture, which draws it as $5581 does: before what the rest of the step does in it (an item taken on arrival). */
  onRoom: (() => void) | null = null;
  /**
   * The front end's, not the original's (both off for the original's rules, as the lockstep has them):
   * `graceActive` says a moment's grace is on (nothing hurts him: games/shared/grace.ts), `safeRespawn` is ENHANCED's
   * "no death loops".
   */
  graceActive: () => boolean = () => false;
  safeRespawn: () => boolean = () => false;
  /** Logic steps on his feet since he came into this room, and the last entry that had `SAFE_STEPS` of them. */
  private stepsFree = 0;
  safeEntry: Entry | null = null;

  /**
   * `parts` swaps the enemies' or the lifts' tables for others, to take them out of a test; `carry` is what the program
   * had when the game began (`FIRST_GAME` for the first, the last game's `carryOver()` after that).
   */
  constructor(room: number, parts: { enemies?: Enemies; lift?: Lift; carry?: GameCarry } = {}) {
    this.enemies = parts.enemies ?? new Enemies();
    this.lift = parts.lift ?? new Lift();
    this.world = new World(ROOMS, WORLD_GRID, NO_ROOM, room);
    this.rng = new Random(RANDOM);
    this.monty = new Monty(this.world, this.rng, TABLES.tileGfx, this);
    const { carry } = parts;
    this.sky = copySky(carry ? carry.sky : FRESH_SKY);
    if (carry) {
      this.rng.index = carry.rngIndex;
      this.rng.sum = carry.rngSum;
      Object.assign(this.enemies.clock, carry.clock);
      Object.assign(this.monty.counters, carry.counters);
    }
    this.load(room);
  }

  /** What a game leaves for the next one: the variables a new game does not clear ($5B39 clears $402A-$4065 and little else). */
  carryOver(): GameCarry {
    // ($5B39: a new game clears $402A-$4065, the flights' explosion and hit sound among them)
    return {
      rngIndex: this.rng.index, rngSum: this.rng.sum, clock: { ...this.enemies.clock }, counters: { ...this.monty.counters },
      sky: { ...copySky(this.sky), explosion: 0, hit: 0 },
    };
  }

  get gameOver(): boolean {
    return (this.lives & 0x80) === 0;
  }

  // ---- rooms ($5581) --------------------------------------------------------------------------

  /** The room's cells, enemies, lift and items afresh (a game put back from a save: the items taken are known first). */
  reload(): void {
    this.load(this.world.room);
  }

  /** The room's cells, enemies, lift and items. */
  private load(room: number): void {
    this.world.enter(room);
    this.enemies.load(room);
    this.lift.enter(room);
    this.items.place(room, this.world.cells);
  }

  /** Monty has gone through an exit: what $5581 does before it loads the room, then the room. */
  enterRoom(room: number): void {
    const m = this.monty;
    this.stepsFree = 0;
    const tune = tuneForRoom(room, this.soundFlag, this.tune);
    if (tune !== null) {
      this.tune = tune;
      this.sound.tune(tune);
    }
    if (room === FINAL_ROOM && this.progress === FINAL_PROGRESS) {
      // the last room, with everything delivered: he walks in on his own to the ending
      m.x = 0x90;
      m.y = 0x40;
      m.state = State.Ending;
      m.faceLeft = false;
    }
    // (room $1C: coming in pushed, the 7 pixels he is lifted by)
    if (room === 0x1c && m.state === State.Pushed) m.y = (m.y - 7) & 0xff;
    const delivery = DELIVERIES.find((d) => d.room === room);
    if (delivery && this.items.take(delivery.type)) {
      this.progress = (this.progress + 1) & 0xff;
      for (let i = 0; i < delivery.pay[1]; i++) this.money.add(delivery.pay[0]);
      this.sound.effect(0x4a);
    }
    this.load(room);
    this.onRoom?.();
  }

  // ---- states the scripts drive ($4BA5, $4ACA, $4A6F) ----------------------------------------

  scripted(): void {
    const m = this.monty;
    if (m.state === State.Script10) this.slideAway();
    else if (m.state === State.Intro) this.walkIn();
    else this.ending();
  }

  /** $4BA5: carried down to the floor, then lost to room $1B (which costs a life: the death flag is set). */
  private slideAway(): void {
    const m = this.monty;
    if (m.y < 0x70) {
      m.y = (m.y + 2) & 0xff;
      return;
    }
    if (m.slide === 0) this.sound.effect(0x42); // ($4BB4)
    m.slide = (m.slide + 1) & 0xff;
    if (m.slide !== 0x18) return;
    m.dead = 0x1b;
    m.x = m.entryX = 0xc0;
    m.y = m.entryY = 0x6a;
    m.state = m.entryState = 0;
    m.step = m.entryStep = 0;
    m.frame = 0;
    this.world.room = 0x1b;
    this.world.locate();
    this.enterRoom(0x1b);
    this.stepsFree = SAFE_STEPS; // (the loss to room $1B is the story's, not a death to be spared)
  }

  /** $4ACA: the walk-in: face right, walk right, back left, then stand (the title's and the pickup's). */
  private walkIn(): void {
    const m = this.monty;
    if (!walkInStep(m)) return;
    // ($4B0A: the title's tune goes on again, unless the flag is set or this is the title's room)
    if (this.soundFlag === 0 && this.world.room !== TITLE_ROOM) this.sound.tune(0);
    m.state = State.Free;
    m.step = 0;
  }

  /** $4A6F: the ending: two figures come to stand beside him, and after 256 steps the game is won. */
  private ending(): void {
    const m = this.monty;
    const e = this.enemies;
    e.setX(0, m.x + 0x10);
    e.setX(1, m.x + 0x10);
    e.setY(0, m.y);
    e.setY(1, m.y - 0x10);
    e.setFrame(0, 0xd6);
    e.setFrame(1, 0xd5);
    e.bytes[2] = 1;
    e.bytes[13 + 2] = 1;
    const speed = (e.bytes[9] ?? 0) & 0x7f;
    e.bytes[9] = speed;
    e.bytes[13 + 9] = speed;
    m.step = (m.step + 1) & 0xff;
    if (m.step === 0) this.ended = true;
  }

  // ---- one logic step ($54AE) -------------------------------------------------------------------

  /**
   * One logic step with the controls in `input` (`Dir` bits; `key`: the key that boards a plane is down): the lift moves in the
   * drawing phase before and in the logic phase ($83EE runs in both), then the logic. Returns the room he entered, if he did.
   */
  step(input: number, key = false): number | null {
    this.lift.tick(this.rng);
    this.lift.tick(this.rng);
    return this.logic(input, key);
  }

  /** $61DA: while a bonus lasts, the controls are scrambled by it (the random number is XORed into them; each look at them counts it down). */
  scramble(input: number): number {
    if (this.bonusFlag === 0) return input;
    this.bonusFlag = (this.bonusFlag - 1) & 0xff;
    return input ^ this.bonus;
  }

  /**
   * The logic phase after its lift's move ($54B1 on). Returns the room he entered, if he did. If he boards a plane in it
   * (`boarded`) the step stops there, as the original's does for the whole of the flight, and goes on when `land` is called.
   */
  logic(input: number, key = false): number | null {
    const m = this.monty;
    const { state, step } = m;
    const entered = m.advance(this.scramble(input));
    const to = this.boarding(key);
    if (to !== null) {
      this.boarded = to;
      this.pending = { state, step, entered };
      return null;
    }
    return this.after(state, step, entered);
  }

  /**
   * $758F: standing at a plane (the two enemy records showing $D0 and $D1, which touching harms nothing) with the Commodore key
   * down and a ticket in his hands, the ticket is taken and he flies to where the table says. A room with no such place takes
   * the ticket all the same. Returns the room he flies to.
   */
  private boarding(key: boolean): number | null {
    const m = this.monty, e = this.enemies;
    const touching = [0, 1, 2, 3].some((slot) => Math.abs(m.x - e.x(slot)) < 12 && Math.abs(m.y - e.y(slot)) < 12 && isPlane(e.frame(slot)));
    if (!touching || NO_BOARDING.includes(m.state) || !key || !this.items.take(TICKET)) return null;
    return destination(this.world.room);
  }

  /** The flight he has boarded, to be flown a frame at a time over `play`, the 16K the play screen's VIC bank holds (the panel stays as it is). */
  startFlight(play: Uint8Array): Flight {
    return new Flight(this.sky, {
      random: () => this.rng.next(),
      effectsOn: () => this.soundFlag !== 0,
      effect: (n) => this.sound.effect(n),
      silence: (voice) => this.sound.silence(voice),
      kill: (points) => this.score.add(points),
    }, play);
  }

  /**
   * The flight is over: he comes down at the plane of the place it flew to, or, shot down, goes back to where he boarded, hurt
   * (the death is handled as any other, at the end of the step), as $75F5 on does; then the step he boarded in goes on, in the room
   * he is in now. Returns the room he entered, as `logic` does.
   */
  land(flight: Flight): number | null {
    const { pending, boarded } = this;
    if (pending === null || boarded === null) throw new Error('no flight to come down from');
    this.pending = null;
    this.boarded = null;
    const m = this.monty;
    const crashed = flight.crashed;
    m.input = flight.input; // ($7E79 stores the controls where Monty's own are kept: they stay there)
    if (crashed) m.dead = 1;
    else this.world.room = boarded;
    this.world.locate();
    this.enterRoom(this.world.room);
    // (a crash is the flight's, not a death the safe start is to spare him)
    if (crashed) this.stepsFree = SAFE_STEPS;
    // ($7610: he stands at the first plane the room shows, and a death starts him there again)
    const plane = [0, 1, 2, 3].find((slot) => this.enemies.frame(slot) === PLANE_FRAMES[0]);
    if (plane !== undefined) {
      m.x = m.entryX = this.enemies.x(plane);
      m.y = m.entryY = this.enemies.y(plane);
    }
    return this.after(pending.state, pending.step, pending.entered);
  }

  /** What he is doing, if he is flying: the rest of the step is waiting. */
  get flying(): boolean {
    return this.boarded !== null;
  }

  /** Leave a flight behind without landing (the map's travel, back to room start): the step it stopped is dropped. */
  abandonFlight(): void {
    this.boarded = null;
    this.pending = null;
  }

  /** The rest of the logic step, after Monty ($5ED0 on) and, if he boarded, the flight. */
  private after(state: number, step: number, entered: number | null): number | null {
    const m = this.monty;
    this.enemies.step(this.rng);
    this.items.pickup(this);
    this.touch();
    if (this.lift.catches(m)) this.knock();
    this.scripts();
    this.watchProgress();
    // (a moment's grace: whatever hurt him this step did not, he is as he was)
    if (this.graceActive() && HURT_STATES.includes(m.state) && !HURT_STATES.includes(state)) {
      m.state = state;
      m.step = step;
    }
    // $5510: a finished death takes a life (a shield saves it) and puts him back where he came into the room ($5538)
    if (m.dead !== 0) {
      const safe = this.safeEntry;
      if (this.safeRespawn() && this.stepsFree < SAFE_STEPS && safe !== null) this.placeAt(safe);
      else m.respawn();
      if (this.shield === 0) this.lives = (this.lives - 1) & 0xff;
    } else if (m.state === State.Free && ++this.stepsFree === SAFE_STEPS) {
      this.safeEntry = { room: this.world.room, x: m.entryX, y: m.entryY, state: m.entryState, step: m.entryStep };
    }
    return entered;
  }

  /**
   * Put him at a place he came into a room (the map's travel, ENHANCED's safe respawn): as if he had come through the exit
   * there, the game's own way (the room loaded, its tune, a delivery made), and a death starts him there again.
   */
  placeAt(at: Entry): void {
    const m = this.monty;
    m.x = m.prevX = m.entryX = at.x;
    m.y = m.prevY = m.entryY = at.y;
    m.state = m.entryState = at.state;
    m.step = m.entryStep = at.step;
    m.dead = 0;
    m.blocked = 0;
    m.burn = 0;
    m.slide = 0;
    this.world.room = at.room;
    this.world.locate();
    this.enterRoom(at.room);
  }

  /** Where he came into the room he is in. */
  get entry(): Entry {
    const m = this.monty;
    return { room: this.world.room, x: m.entryX, y: m.entryY, state: m.entryState, step: m.entryStep };
  }

  /** $5D67: something hurt him: falling, jumping, climbing or on a tube it kills him; standing it knocks him back; hurt already, nothing. */
  private knock(): void {
    const m = this.monty;
    let state: number = State.Knocked;
    switch (m.state) {
      case State.Fall: case State.Jump: case State.Spring: case State.Tube: state = State.Dying; break;
      case State.Dying: case State.Knocked: return;
      default: break;
    }
    m.state = state;
    m.step = 0;
  }

  /** $5D00: enemies touching him. Several of the cases end the whole check (the original `rts`es). */
  private touch(): void {
    this.contact80 = false;
    const m = this.monty, e = this.enemies;
    for (let slot = 0; slot < 4; slot++) {
      if (Math.abs(m.x - e.x(slot)) >= 12 || Math.abs(m.y - e.y(slot)) >= 12) continue;
      const frame = e.frame(slot);
      if (frame === HIDDEN || isPlane(frame)) return;
      if (frame === 0x80) {
        this.contact80 = true;
        return;
      }
      if (frame === 0x58 || frame === 0x59) {
        // room 5: the thing he was after; elsewhere just something that hurts
        if (this.world.room !== 5 || !this.items.take(0x0a)) return this.hurt();
        e.setFrame(slot, HIDDEN);
        e.setKind(slot, 0);
        this.items.give(0x13);
        this.progress = (this.progress + 1) & 0xff;
        return this.pay(0x43);
      }
      if (frame >= 0x55 && frame < 0x58) {
        if (!this.items.take(0x13)) continue;
        this.progress = (this.progress + 1) & 0xff;
        return this.pay(6);
      }
      if (frame === 0x1c) {
        if (this.items.take(3)) {
          this.helped = (this.helped + 1) & 0xff;
          this.progress = (this.progress + 1) & 0xff;
          return this.pay(0x37);
        }
        if (this.helped === 0) m.state = State.Forced;
        return;
      }
      return this.hurt();
    }
  }

  /** $5DF7: 100 a time into the money. */
  private pay(times: number): void {
    for (let i = 0; i < times; i++) this.money.add(0x64);
  }

  /** $5D61: an enemy hurts him, unless the shield is up. */
  private hurt(): void {
    if (this.shield === 0) this.knock();
  }

  /** $7682: the three rooms of the pushing scene. */
  private scripts(): void {
    const m = this.monty, room = this.world.room;
    if (room === 0x1b) {
      if (!this.contact80) return;
      if (this.items.take(5)) this.quest = (this.quest + 1) & 0xff;
      m.state = State.Pushed;
      this.enemies.setFrame(3, HIDDEN);
      m.x = this.enemies.x(3);
      m.y = this.enemies.y(3);
      m.frame = 0x81;
      this.sound.effect(0x48);
    } else if (room === 0x1c) {
      if (m.x < 0x80) m.slide = 0;
      else if (m.state === State.Pushed && this.quest === 0) {
        this.sound.silence(0);
        this.sound.silence(1);
        m.state = State.Script10;
      }
    } else if (room === 0x1d) {
      if (m.state !== State.Pushed) return;
      this.sound.silence(0);
      this.sound.silence(1);
      m.x = 0x18;
      m.y = 0x20;
      m.state = State.Free;
    }
  }

  /** $54E1: when the progress passes $41, $82 or $C3 the bar grows, and he gets a life (to 12). */
  private watchProgress(): void {
    if (this.progress === this.progressSeen) return;
    this.progressSeen = this.progress;
    const stage = PROGRESS_STAGES.indexOf(this.progress);
    if (stage < 0) return;
    this.onProgress?.(stage);
    if (this.lives !== 0x8c) this.lives = (this.lives + 1) & 0xff;
  }
}
