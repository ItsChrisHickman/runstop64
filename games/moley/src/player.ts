/**
 * Monty with what goes with him through a game: lives, the gauge, the room he is in and the pass counter. One `pass` is the
 * start of the original's main loop (`$822B`-`$825B`): count, drain the gauge when it is due, Monty's pass, the scripts'
 * animation step and the check that time is not up (`$9234`-`$9258`). The room scripts that follow (stage 3) are not here.
 */
import { BLANK_FRAME, mapMemory, MAP_COLUMNS, ROOM_COUNT, ROOM_SIZE } from './data';
import { FrameCycle } from './cycle';
import { drainsOnPass, Gauge } from './gauge';
import { Monty, State, type Outside, type Tiles } from './monty';

export const START_LIVES = 5;

/** Where each room puts Monty at the start and after a death (the restart routines `$926E` points at). */
export const ROOM_STARTS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 0x04, y: 0x78 }, { x: 0x04, y: 0x78 }, { x: 0x04, y: 0x68 }, { x: 0x18, y: 0x08 }, { x: 0xee, y: 0x78 }, { x: 0x28, y: 0x70 },
];
/** Where a new game puts him (`$8211`): in room 0, above the floor. */
export const GAME_START = { x: 0x04, y: 0x64 } as const;

/**
 * The room's tile map in the original's memory layout (`$8103`): a lookup is `memory[base + (y >> 3) * 32 + (x >> 3)]`, and
 * below the room's last row it runs on into what follows, as the original's does.
 */
export class RoomTiles implements Tiles {
  /** the maps then the attribute tables ($6000-$80FF); room 2 rewrites its map as it plays */
  readonly memory = mapMemory();
  base = 0;

  enter(room: number): void {
    if (room < 0 || room >= ROOM_COUNT) throw new Error(`no room ${room}`);
    this.base = room * ROOM_SIZE;
  }

  at(x: number, y: number): number {
    return this.memory[this.base + ((y & 0xff) >> 3) * MAP_COLUMNS + ((x & 0xff) >> 3)];
  }
}

export class Player {
  readonly tiles = new RoomTiles();
  readonly world: Outside = { tiles: this.tiles, room: 0, scriptFrame: 0, partnerX: 0 };
  readonly monty = new Monty(this.world);
  readonly gauge = new Gauge();
  /** the scripts' animation (`$9EA0`), stepped once a pass after Monty's */
  readonly scriptCycle = new FrameCycle();
  lives = START_LIVES;
  /** the pass counter (`$A2A0`) */
  counter = 0;
  /** room 2's script holds the gauge while this is set (`$9904`) */
  room2Hold = false;

  constructor() { this.newGame(); }

  get room(): number { return this.world.room; }

  /** Enter a room: its map, a full gauge (`$854A`). Monty stays where he is; whatever enters him places him. */
  enterRoom(room: number): void {
    this.world.room = room;
    this.tiles.enter(room);
    this.gauge.refill();
  }

  /** A new game (`$81BC`): room 0, five lives, Monty above the floor. */
  newGame(): void {
    this.lives = START_LIVES;
    this.enterRoom(0);
    this.monty.x = GAME_START.x;
    this.monty.y = GAME_START.y;
  }

  /** The start of a pass: everything up to the room's script. Returns whether time ran out and he died. */
  pass(keys: number): boolean {
    this.counter = (this.counter + 1) & 0xff;
    if (drainsOnPass(this.room, this.counter, this.room2Hold)) this.gauge.drain();
    this.world.scriptFrame = this.scriptCycle.frame;
    this.monty.pass(keys);
    this.scriptCycle.step();
    if (this.gauge.empty) { this.die(); return true; }
    return false;
  }

  /** Monty dies (`$9592`): a life less, back to the start of the room with a full gauge. Lives below zero end the game: the caller looks. */
  die(): void {
    this.lives--;
    const start = ROOM_STARTS[this.room];
    if (start === undefined) throw new Error(`room ${this.room} has no restart`);
    this.monty.state = State.walking;
    this.monty.phase = 0;
    this.monty.x = start.x;
    this.monty.y = start.y;
    this.monty.frame = BLANK_FRAME; // (the death routine ends with his picture blank)
    this.enterRoom(this.room);
    this.scriptCycle.step(); // (the restart jumps back into the script runner, $9238, which steps the scripts' animation again)
  }
}
