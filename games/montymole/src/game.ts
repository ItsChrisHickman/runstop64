/**
 * The game's logic so far: the room loop (`$940C`, `$943C`) with Monty, the coal and the room's object in it. One `pass` is one trip round
 * the main loop, 25 a second: the coal is taken or drawn (`$935C`, `$95B3`), a touch is looked for (`$9298`), the input is read (`$82A6`),
 * Monty moves (`$89D4`), the object is taken (`$927E`) and the exits are looked at (`$9452`). A death or an exit enters a room again
 * (`$940C`: the room drawn, the loop restarted), in the same pass. The things that move, the enemies, the crusher and the floor, are the
 * next parts of stage 3 (re/README.md, Plan), so no room has them yet.
 */
import { Chain } from './chain';
import { Coal, STILL_THERE } from './coal';
import { turnConveyors } from './conveyors';
import { Crusher } from './crusher';
import { DEATH_SPRITE, PICKUP, THUD } from './data';
import { BLANK, Enemies, EnemyState } from './enemies';
import { ROOMS } from './data/rooms-data';
import { Field } from './field';
import { Floor } from './floor';
import { Gates } from './gates';
import { Opening } from './opening';
import { KEYBOARD, readInput, type Ports } from './input';
import { Flag, Monty, type Terrain } from './monty';
import { RoomObject } from './object';
import { Random } from './random';
import type { RoomData } from './room';
import { Score } from './score';
import { blit } from './sprite';
import { StateReader, StateWriter, type Stateful } from '../../shared/state';

export const START_LIVES = 3;
/** The room number the game puts in `$9649` for the ending and for the opening scene. */
export const ENDING_ROOM = 21, OPENING_ROOM = 0x2c;
/** Where a room's edges lead: x 0 and `$F0`, y below `$21` and from `$AF` (`$9452`). */
const LEFT_EDGE = 0, RIGHT_EDGE = 0xf0, BOTTOM_EDGE = 0x21, TOP_EDGE = 0xaf;
/** The scene: where Monty starts (`$CD5E`), the x that gives the gift (`$CDA7`) and the x that leaves it (`$CDAF`), and where room 0 takes him in (`$CDB8`). */
const OPENING_START = { x: 0xd8, y: 0x4f } as const, OPENING_GIFT_X = 0x40, OPENING_EXIT_X = 0xe0, ROOM0_ARRIVAL = { x: 0x18, y: 0x27 } as const;
/** Room 16 puts Monty into room 17 if he comes into it lower than this (`$96D9`), at the place the scene leaves him. */
const PIT_ROOM = 16, PIT_Y = 0x41, PIT_ARRIVAL = { x: 0xc0, y: 0xa1 } as const;

/** What a pass leaves the game in. `opening` and `ending` are the scenes the game leaves its room loop for. */
export type Outcome = 'playing' | 'gameOver' | 'ending' | 'opening';
const OUTCOMES: readonly Outcome[] = ['playing', 'gameOver', 'ending', 'opening'];

/** A call of the ROM's BEEPER: the cycles (less one) and the pitch. */
export interface Beep { readonly de: number; readonly hl: number }

/** The opening scene sets the deadly class to its water's colour (`$CD93`: `$C51B`) in the record of the room he was last in, which stays in `$C42A` until the next room is copied. */
const WATER_CLASS = 0x75;

/**
 * The terrain Monty's physics reads: the field's buffers and the room's own numbers, the record `$C42A` holds. That is the last room entered, and the opening scene
 * (which copies no record) walks Monty over what the last room left, with the water's colour in the deadly class.
 */
class World implements Terrain {
  private current: RoomData = roomOf(0);
  private classesNow: readonly number[] = this.current.classes;
  private watery = false;
  constructor(private readonly field: Field) {}
  get room(): RoomData { return this.current; }
  /** A room's record is copied: its classes are the room's own. */
  set room(room: RoomData) {
    this.current = room;
    this.watery = false;
    this.classesNow = room.classes;
  }
  /** The opening scene has put its water's colour in the record. */
  makeWatery(): void {
    this.watery = true;
    const [floor = 0, , rope = 0, fourth = 0] = this.current.classes;
    this.classesNow = [floor, WATER_CLASS, rope, fourth];
  }
  get isWatery(): boolean { return this.watery; }
  get attrs(): Uint8Array { return this.field.attrs; }
  get screen(): Uint8Array { return this.field.screen; }
  get picture(): Uint8Array { return this.field.picture; }
  get classes(): readonly number[] { return this.classesNow; }
  get climbBase(): number { return this.current.spriteBase; }
}

function roomOf(id: number): RoomData {
  const room = ROOMS[id];
  if (room === undefined) throw new Error(`no room ${id}`);
  return room;
}

export class Game implements Stateful {
  readonly field = new Field();
  private readonly world = new World(this.field);
  readonly monty: Monty;
  /** the room (`$9649`), the lives (`$964A`) and the place he comes into the room at (`$964B`, `$964C`) */
  room = 0;
  lives = START_LIVES;
  arrivalX = 0;
  arrivalY = 0;
  readonly score = new Score();
  readonly coal = new Coal();
  readonly enemies = new Enemies();
  readonly crusher = new Crusher();
  readonly floor = new Floor();
  readonly gates = new Gates();
  readonly chain = new Chain();
  /** the opening scene's things (`$CD32` on) */
  readonly opening = new Opening();
  /**
   * Each room's six enemy records as the room table (`$9A2A`) has them: a visit copies them (`$94C3`), so a death or a way out puts the room's enemies back. The
   * only writes the game makes to the table are the opening scene's, to the states of room 0's third and fourth (re/README.md).
   */
  readonly enemySource: number[][][] = ROOMS.map((r) => r.enemies.map((e) => [...e]));
  /** the generator `$FD9B` (the seed `$5C76`) */
  readonly random = new Random();
  /** the room's object as this visit found it (`$C524`) */
  readonly object = new RoomObject();
  /** the control chosen on the menu (`$82A3`) */
  control: number = KEYBOARD;
  /** the beeper calls made so far (a front end empties it) */
  readonly beeps: Beep[] = [];
  outcome: Outcome = 'playing';
  /** the room the pass's way out led to, before any scene took him on from it (for the tests); null if the pass had none */
  exitedTo: number | null = null;
  /** where the rebuilt game does something other than the original, because the original does something no one wants (set once, for the tests) */
  divergence: string | null = null;
  /** what the last death was from (for the tests) */
  lastDeath: 'crusher' | 'touch' | 'cell' | null = null;
  /** the input byte the last pass ran with, as `$82A6` made it (for the tests) */
  inputRead = 0;

  constructor() {
    this.monty = new Monty(this.world, (de, hl) => { this.beeps.push({ de, hl }); });
  }

  /** The current room's data. */
  get current(): RoomData { return this.world.room; }

  /** Take `room` as the one he is in without drawing it (a saved game, a test putting the game where the original is). */
  adopt(room: number, recordOnly = false): void {
    if (!recordOnly) this.room = room;
    if (room < ROOMS.length) this.world.room = roomOf(room);
  }

  // ---- entering a room ($940C) ---------------------------------------------------------------------------------------

  /** Put Monty in `room` at (x, y), as the opening scene and the exits do (the room is entered at once). */
  place(room: number, x: number, y: number): void {
    this.room = room;
    this.monty.x = x;
    this.monty.y = y;
    this.arrivalX = x;
    this.arrivalY = y;
    this.enter();
  }

  /** `$940C`: the loop's start for the room in `room`: the ending and the opening are scenes of their own; the others are drawn. */
  enter(): void {
    for (;;) {
      if (this.room === ENDING_ROOM) { this.outcome = 'ending'; return; }
      if (this.room === OPENING_ROOM) { this.beginOpening(); return; }
      const room = roomOf(this.room);
      this.world.room = room;
      this.field.drawRoom(room); // $9551: $FDD5, $C62A
      this.object.enter(room); // ($94C3 copied the record)
      this.enemies.enter(this.enemySource[this.room] ?? room.enemies);
      this.crusher.enter(room);
      this.floor.enter(room);
      this.object.draw(this.field); // $952F
      this.coal.draw(this.field, room); // $95B3
      this.field.printScore(this.score.digits); // $91E8
      this.field.printLives(this.lives); // $949E
      this.field.keep(); // $D254
      if (this.room !== PIT_ROOM || this.monty.y >= PIT_Y) return;
      // $96E1: the pit: the scene lifts him into the castle (room 17), his jump state as it was but the fall and the jump's count cleared
      this.monty.x = PIT_ARRIVAL.x;
      this.monty.y = PIT_ARRIVAL.y;
      this.arrivalX = PIT_ARRIVAL.x;
      this.arrivalY = PIT_ARRIVAL.y;
      this.room = 17;
      this.monty.fallen = 0;
      this.monty.jumpCount = 0;
    }
  }

  // ---- a new game ($F7D6) and the opening scene ($CD41) ----------------------------------------------------------------

  /**
   * `$F7D6`: a new game after the options menu: the jump and the fall and his flags cleared, the gates closed, three lives, no score, the opening scene's room, the jump
   * arc at its start and the screen cleared; then the room loop (`$940C`) begins the scene. Everything else stays as the last game (or the tape) left it: his picture and
   * his facing, the coal, the opening's own variables, the enemies' states, the last room's record.
   */
  newGame(): void {
    const m = this.monty;
    m.jumpDir = 0;
    m.jumpCount = 0;
    m.fallen = 0;
    m.flags = 0;
    m.flags2 = 0;
    m.arc = 0;
    this.gates.flags = 0;
    this.lives = START_LIVES;
    this.score.reset();
    this.room = OPENING_ROOM;
    this.field.screen.fill(0);
    this.field.attrs.fill(0);
    this.outcome = 'playing';
    this.enter();
  }

  /**
   * `$CD41`: the scene begins (every time the room loop finds the room number `$2C`: a new game, a death in it, a way out of room 0 to the left): the coal is not there
   * and room 0's third and fourth enemies are gone (they are made relays when he passes the pot), Monty is at the right (`$D8`, `$4F`), the picture is drawn and the
   * scene's water is the deadly colour.
   */
  private beginOpening(): void {
    for (let i = 0; i < this.coal.flags.length; i++) this.coal.flags[i] = (this.coal.flags[i] ?? 0) & ~STILL_THERE;
    this.setRoom0Relays(EnemyState.none);
    this.opening.begin();
    this.monty.x = OPENING_START.x;
    this.monty.y = OPENING_START.y;
    this.field.drawOpening();
    this.field.printScore(this.score.digits);
    this.field.printLives(this.lives);
    this.field.keep();
    this.world.makeWatery();
  }

  /** The states of room 0's third and fourth enemies in the room table (`$9BBE`, `$9BD2`): the scene's only writes to it. */
  private setRoom0Relays(state: number): void {
    for (const e of [2, 3]) {
      const record = this.enemySource[0]?.[e];
      if (record !== undefined) record[0] = state;
    }
  }

  /**
   * One trip round the opening's loop (`$CD98`): the interrupt routine's work, the wait's (`$FF5B`: the animation), the touch test, the input and Monty's routine; passing
   * x `$40` gives the scene's gift (`$CDC4`: the coal is there and the enemies of room 0 wake) and x `$E0` is the way out into room 0 (`$CDB5`). One interrupt a pass, as
   * the loop is about a frame long (test/opening.ts).
   */
  private openingPass(ports: Ports): Outcome {
    const m = this.monty;
    this.inputRead = -1;
    this.exitedTo = null;
    this.opening.interrupt(this.field);
    this.opening.animate(this.field);
    if (m.touched()) {
      if (!(m.flags & Flag.tool)) { this.lastDeath = 'touch'; this.die(); return this.outcome; }
      this.useTool();
    }
    m.input = this.inputRead = readInput(this.control, ports, m.input);
    const ending = m.pass();
    this.noteOutsides();
    if (ending === 'dead') { this.lastDeath = 'cell'; this.die(); return this.outcome; }
    if (m.x === OPENING_GIFT_X && this.opening.passed(this.field)) {
      for (let i = 0; i < this.coal.flags.length; i++) this.coal.flags[i] = (this.coal.flags[i] ?? 0) | STILL_THERE;
      this.setRoom0Relays(EnemyState.relay);
    }
    if (m.x === OPENING_EXIT_X) {
      this.room = 0;
      m.x = ROOM0_ARRIVAL.x;
      m.y = ROOM0_ARRIVAL.y;
      this.arrivalX = m.x;
      this.arrivalY = m.y;
      this.exitedTo = 0;
      this.enter();
    }
    return this.outcome;
  }

  // ---- one pass ($943C) ----------------------------------------------------------------------------------------------

  /** One trip round the main loop with the ports as they are. */
  pass(ports: Ports): Outcome {
    if (this.outcome !== 'playing') return this.outcome;
    if (this.room === OPENING_ROOM) return this.openingPass(ports);
    this.inputRead = -1;
    this.exitedTo = null;
    const room = this.world.room;
    if (this.interrupt() === 'dead') { this.lastDeath = 'crusher'; this.die(); return this.outcome; } // the interrupt that ended the HALT
    this.enemies.pass(this.field, this.monty, this.random); // $943D: $8751
    const taken = this.coal.collect(this.field, room, this.monty.x, this.monty.y, this.score); // $9440: $935C
    if (taken !== null) {
      this.beeps.push(PICKUP);
      this.field.printScore(this.score.digits);
    }
    this.coal.draw(this.field, room); // $9443: $95B3
    if (this.monty.touched()) { // $9446: $9298
      if (!(this.monty.flags & Flag.tool)) { this.lastDeath = 'touch'; this.die(); return this.outcome; } // $92DF
      this.useTool();
    }
    this.monty.input = this.inputRead = readInput(this.control, ports, this.monty.input); // $9449: $82A6
    if (this.interrupt() === 'dead') { this.lastDeath = 'crusher'; this.die(); return this.outcome; } // the second interrupt of the pass, here (re/README.md, "The two clocks")
    if (this.enemies.outside) {
      this.divergence = 'an enemy looked at a row off the screen: the original reads memory past its row table';
      this.enemies.outside = false;
    }
    const ending = this.monty.pass(); // $944C
    this.noteOutsides();
    if (ending === 'dead') { this.lastDeath = 'cell'; this.die(); return this.outcome; }
    if (this.object.isAt(this.monty.x, this.monty.y)) { // $944F: $927E
      this.monty.flags |= Flag.tool;
      this.beeps.push(PICKUP);
      this.object.take(this.field);
    }
    const { x, y } = this.monty; // $9452
    if (x === LEFT_EDGE || x === RIGHT_EDGE || y < BOTTOM_EDGE || y >= TOP_EDGE) this.leave();
    return this.room === OPENING_ROOM ? 'opening' : this.outcome; // (the pass that took him into the opening scene)
  }

  /** Where Monty's pass did what the original does with memory past its tables, the rebuilt game does something plainer and says so (for the tests). */
  private noteOutsides(): void {
    const m = this.monty;
    if (m.overrun) { // (the original goes on to read past the end of the jump table, draws him off the screen and writes over its own memory)
      this.divergence = 'a jump read past the end of its table: the original crashes, the rebuilt game ends the jump';
      m.overrun = false;
    }
    if (m.outside) {
      this.divergence = 'he fell below the bottom of the screen: the original looks up the row there past the end of its row table';
      m.outside = false;
    }
  }

  /**
   * `$92DF`: a touch with a tool in hand: the tool is used up (bit 3 of the flags, the beep), the enemy he is touching (`$9327`: the first, in the order of the
   * records, that is not gone and is within 15 pixels of him both ways) is turned into the blank picture in the room's blank colour and all the enemies move
   * once more, so that it is drawn over with nothing; then it is gone (state 3).
   */
  private useTool(): void {
    const m = this.monty;
    m.flags &= ~Flag.tool;
    this.beeps.push(PICKUP);
    const touched = this.enemies.list.find((e) => e.state !== EnemyState.none && ((Math.abs(m.x - e.x) & 0xf0) === 0) && ((Math.abs(m.y - e.y) & 0xf0) === 0));
    if (touched !== undefined) {
      touched.sets.fill(BLANK);
      touched.colour = this.world.room.tiles[0]?.attr ?? 0;
    }
    this.enemies.pass(this.field, m, this.random); // $931D: CALL $8751
    if (touched !== undefined) touched.state = EnemyState.none;
  }

  /**
   * The interrupt routine (`$8F9F`, 50 Hz): room 17's animation, the retractable floor, the gates that open with the coal, the crusher and the conveyors. The
   * original runs it twice in a pass, once as the HALT ends and once somewhere inside the pass; the rebuilt game runs it before the pass and before Monty's routine.
   * A death in it (the crusher on Monty) abandons the pass wherever it is.
   */
  private interrupt(): 'alive' | 'dead' {
    const room = this.world.room;
    if (this.room === 17) this.chain.step(this.field, this.object.frame); // $8FA7: $90BD
    this.floor.step(this.field); // $8FC1: $F7C7: $8F31
    this.gates.run(this.field, room, this.coal.taken); // $F64D, $F6A6
    const crushed = this.crusher.step(this.field, this.random); // $8FC4: $8DCD
    if (crushed.dead) return 'dead';
    if (crushed.thud) this.beeps.push(THUD);
    turnConveyors(this.field, this.room); // $8FC7
    return 'alive';
  }

  /** The way out (`$94D9`): a tool is lost, the room beside is where the edge leads, Monty comes in at the far side. */
  private leave(): void {
    const m = this.monty;
    const exits = this.world.room.exits;
    m.flags &= ~Flag.tool;
    if (m.x === LEFT_EDGE) { this.room = exits.left; m.x = 0xee; } else if (m.x === RIGHT_EDGE) { this.room = exits.right; m.x = 2; } else if (m.y >= TOP_EDGE) { this.room = exits.up; m.y = 0x23; } else { this.room = exits.down; m.y = 0xad; }
    this.exitedTo = this.room;
    this.arrivalX = m.x;
    this.arrivalY = m.y;
    this.enter();
  }

  /** A death (`$946E`): his picture where he died, a life gone; with none left it is game over, else back to where he came into the room. */
  private die(): void {
    const m = this.monty;
    if (this.room === OPENING_ROOM) this.divergence = 'he died in the opening scene: the original freezes for the whole death tune (the scene\'s interrupt routine does not run the death animation that ends the tune early)';
    blit(this.field.screen, this.field.picture, DEATH_SPRITE, m.x, m.y); // $8D7F draws it and `$D254` keeps the screen as the picture
    this.field.picture.set(this.field.screen);
    this.lives = (this.lives - 1) & 0xff;
    if (this.lives === 0) { this.outcome = 'gameOver'; return; }
    m.x = this.arrivalX;
    m.y = this.arrivalY;
    m.fallen = 0;
    m.flags = 0;
    m.flags2 = 0;
    m.arc = 0;
    m.jumpDir = 0;
    m.jumpCount = 0;
    this.enter();
  }

  // ---- state ---------------------------------------------------------------------------------------------------------------

  save(w: StateWriter): void {
    w.put(this.room, this.lives, this.arrivalX, this.arrivalY, this.control, OUTCOMES.indexOf(this.outcome));
    this.score.save(w);
    this.coal.save(w);
    this.object.save(w);
    this.enemies.save(w);
    this.crusher.save(w);
    this.floor.save(w);
    this.gates.save(w);
    this.chain.save(w);
    this.opening.save(w);
    this.random.save(w);
    this.monty.save(w);
  }

  load(r: StateReader): void {
    this.room = r.get(); this.lives = r.get(); this.arrivalX = r.get(); this.arrivalY = r.get(); this.control = r.get();
    const outcome = OUTCOMES[r.get()];
    if (outcome === undefined) throw new Error('the saved outcome is not one');
    this.outcome = outcome;
    this.score.load(r);
    this.coal.load(r);
    this.object.load(r);
    this.enemies.load(r);
    this.crusher.load(r);
    this.floor.load(r);
    this.gates.load(r);
    this.chain.load(r);
    this.opening.load(r);
    this.random.load(r);
    this.monty.load(r);
  }
}
