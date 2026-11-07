/**
 * The game's logic so far: the room loop (`$940C`, `$943C`) with Monty, the coal and the room's object in it. One `pass` is one trip round
 * the main loop, 25 a second: the coal is taken or drawn (`$935C`, `$95B3`), a touch is looked for (`$9298`), the input is read (`$82A6`),
 * Monty moves (`$89D4`), the object is taken (`$927E`) and the exits are looked at (`$9452`). A death or an exit enters a room again
 * (`$940C`: the room drawn, the loop restarted), in the same pass. The things that move, the enemies, the crusher and the floor, are the
 * next parts of stage 3 (re/README.md, Plan), so no room has them yet.
 */
import { Coal } from './coal';
import { DEATH_SPRITE, PICKUP } from './data';
import { ROOMS } from './data/rooms-data';
import { Field } from './field';
import { KEYBOARD, readInput, type Ports } from './input';
import { Flag, Monty, type Terrain } from './monty';
import { RoomObject } from './object';
import type { RoomData } from './room';
import { Score } from './score';
import { blit } from './sprite';
import { StateReader, StateWriter, type Stateful } from '../../shared/state';

export const START_LIVES = 3;
/** The room number the game puts in `$9649` for the ending and for the opening scene. */
export const ENDING_ROOM = 21, OPENING_ROOM = 0x2c;
/** Where a room's edges lead: x 0 and `$F0`, y below `$21` and from `$AF` (`$9452`). */
const LEFT_EDGE = 0, RIGHT_EDGE = 0xf0, BOTTOM_EDGE = 0x21, TOP_EDGE = 0xaf;
/** Room 16 puts Monty into room 17 if he comes into it lower than this (`$96D9`), at the place the scene leaves him. */
const PIT_ROOM = 16, PIT_Y = 0x41, PIT_ARRIVAL = { x: 0xc0, y: 0xa1 } as const;

/** What a pass leaves the game in. `opening` and `ending` are the scenes the game leaves its room loop for. */
export type Outcome = 'playing' | 'gameOver' | 'ending' | 'opening';
const OUTCOMES: readonly Outcome[] = ['playing', 'gameOver', 'ending', 'opening'];

/** A call of the ROM's BEEPER: the cycles (less one) and the pitch. */
export interface Beep { readonly de: number; readonly hl: number }

/** The terrain Monty's physics reads: the field's buffers and the room's own numbers. */
class World implements Terrain {
  room: RoomData = roomOf(0);
  constructor(private readonly field: Field) {}
  get attrs(): Uint8Array { return this.field.attrs; }
  get screen(): Uint8Array { return this.field.screen; }
  get picture(): Uint8Array { return this.field.picture; }
  get classes(): readonly number[] { return this.room.classes; }
  get climbBase(): number { return this.room.spriteBase; }
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
  /** the input byte the last pass ran with, as `$82A6` made it (for the tests) */
  inputRead = 0;

  constructor() {
    this.monty = new Monty(this.world, (de, hl) => { this.beeps.push({ de, hl }); });
  }

  /** The current room's data. */
  get current(): RoomData { return this.world.room; }

  /** Take `room` as the one he is in without drawing it (a saved game, a test putting the game where the original is). */
  adopt(room: number): void {
    this.room = room;
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
  private enter(): void {
    for (;;) {
      if (this.room === ENDING_ROOM) { this.outcome = 'ending'; return; }
      if (this.room === OPENING_ROOM) { this.outcome = 'opening'; return; }
      const room = roomOf(this.room);
      this.world.room = room;
      this.field.drawRoom(room); // $9551: $FDD5, $C62A
      this.object.enter(room); // ($94C3 copied the record)
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

  // ---- one pass ($943C) ----------------------------------------------------------------------------------------------

  /** One trip round the main loop with the ports as they are. */
  pass(ports: Ports): Outcome {
    if (this.outcome !== 'playing') return this.outcome;
    this.inputRead = -1;
    this.exitedTo = null;
    const room = this.world.room;
    const taken = this.coal.collect(this.field, room, this.monty.x, this.monty.y, this.score); // $9440: $935C
    if (taken !== null) {
      this.beeps.push(PICKUP);
      this.field.printScore(this.score.digits);
    }
    this.coal.draw(this.field, room); // $9443: $95B3
    if (this.monty.touched()) { // $9446: $9298
      if (this.monty.flags & Flag.tool) throw new Error('touching a thing with a tool in hand is stage 3 of the plan (re/README.md)');
      this.die();
      return this.outcome;
    }
    this.monty.input = this.inputRead = readInput(this.control, ports, this.monty.input); // $9449: $82A6
    const ending = this.monty.pass(); // $944C
    if (this.monty.overrun) { // (the original goes on to read past the end of the jump table, draws him off the screen and writes over its own memory)
      this.divergence = 'a jump read past the end of its table: the original crashes, the rebuilt game ends the jump';
      this.monty.overrun = false;
    }
    if (ending === 'dead') { this.die(); return this.outcome; }
    if (this.object.isAt(this.monty.x, this.monty.y)) { // $944F: $927E
      this.monty.flags |= Flag.tool;
      this.beeps.push(PICKUP);
      this.object.take(this.field);
    }
    const { x, y } = this.monty; // $9452
    if (x === LEFT_EDGE || x === RIGHT_EDGE || y < BOTTOM_EDGE || y >= TOP_EDGE) this.leave();
    return this.outcome;
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
    this.monty.load(r);
  }
}
