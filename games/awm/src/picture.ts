/**
 * The picture of Auf Wiedersehen Monty: what the original's main loop draws, in its two phases, and the
 * frame the VIC makes of it (screen.ts). It follows a `Game` and is what c64kit draws: it has the `ram` and
 * the `capture` of a C64 (`C64View` in the browser, `renderPixels` in the checks).
 *
 * The main loop ($5469) alternates two phases a frame, so the game runs at 25 Hz and draws at 50:
 *
 *   phase B (logic, `beginB` then the game's `logic` then `endB`): the lift is drawn ($83EE), the sprite
 *     registers are set from the entity records as the last logic step left them ($5C81), then the logic
 *     runs and the places it changed on the screen (an item taken, a tile burnt, the score, the lives) follow
 *     (a new room is drawn when the game enters it, `onRoom`, as $5581 does: before the rest of that step, in
 *     which he may take an item at his way in, which then keeps its colour in the cells);
 *   phase A (`frameA`): the lift again, the animated tiles ($5818) and the five sprite pictures from the
 *     records the logic made ($66CA), into the buffer that is not shown (two buffers, swapped every step).
 *
 * So the sprites seen in the two frames of a step are the records of the step before it, and the screen
 * shows the step's own changes. What the game draws by diffing the cells it keeps ($5297 puts a changed
 * cell on the screen) the picture finds by comparing its own copy; the panel's routines are called when
 * what they draw changes (the counters, the lives), or told by the game (the boxes, the progress picture).
 */
import { hexBytes } from 'c64kit';
import type { FrameCapture } from 'c64kit';
import { SLOT_COLOURS_HEX } from './data/awm-data';
import { ROOMS, SPRITE_FRAMES, TABLES } from './data';
import { PROGRESS_STAGES, type Game } from './game';
import { FLIGHT_ROOM, type Flight } from './flight';
import type { BoxEvent } from './items';
import type { Lift } from './lifts';
import { clearBox, clearScreen, drawBanner, drawBox, drawLabels, drawLives, drawProgress, itemGlyphs, printHigh, printMoney, printScore } from './panel';
import { COLS, drawCells, ROWS } from './room';
import { animateTiles, CHARSET_AT, EntityRegisters, type EntityRecord, FIRST_COL, SPRITE_BUFFERS, Screen, SCREEN_AT, SCREEN_COLS } from './screen';
import { putSpriteImage } from './sprites';
import type { TitleCarry } from './title';
import { BURNING_CODE } from './tiles';

/** The item characters. */
const ITEM_CHARS = 0x2f;
/** What a counter at zero is: nothing is printed for it until it changes (the screen starts with the digits' places blank). */
const ZERO = '0,0,0,0,0';
/** The burning tile's character ($3F: its picture is Monty's `burnPicture`). */
const BURN_CHAR = 0x3f;
/** $D015 as the first IRQ finds it ($4049): only the side columns' sprites after a room is drawn, all of them once the main loop has run again. */
const SPRITES_ALL = 0xff;
const SPRITES_SIDES = 0xc0;
/** The lift's characters: $20-$22 the body, $23-$25 and $26-$28 the two ends ($84E4's pieces in the set). */
const LIFT_BODY = 0x20;
const LIFT_ENDS = [0x23, 0x26] as const;
const LIFT_COLOURS = [1, 3, 6] as const;

/** The VIC's picture of one entity sprite is at `buffer + 64 x entity`: Monty (0, shown by sprites 0 and 1) and the enemies. */
const ENTITIES = 5;

/** What a box of the panel shows: the item's type and the colours it was drawn in (a save keeps them to draw it again). */
export interface Hand {
  type: number;
  colours: number[];
}

export class Picture {
  readonly screen = new Screen();
  /** The four boxes as drawn now. */
  readonly hands: (Hand | null)[] = [null, null, null, null];
  /** The last frame the VIC made, as c64kit's renderers read it. */
  capture: FrameCapture;
  /** The 16K the VIC reads (c64kit's `ram`). */
  get ram(): Uint8Array {
    return this.screen.ram;
  }

  /** $4037: counts the logic steps; its low bit says which of the two sprite buffers is drawn into and which is shown. */
  private beat = 0;
  /** $4007: 1 after phase A, 0 after phase B (the loop flips it at the start of each pass). */
  private toggle = 0;
  private buildAt: number = SPRITE_BUFFERS[0];
  private pointerBase = 0xe8;
  /** $4049: what the first IRQ of the next frame puts into $D015. */
  private enable = SPRITES_SIDES;
  /** What it put there at the start of this frame. */
  private frameEnable = SPRITES_SIDES;
  private readonly entities = new EntityRegisters();

  /** The room on the screen, and the cells it was drawn from (a changed cell is drawn again). */
  private room = -1;
  private readonly cells = new Uint8Array(COLS * ROWS);
  /** What the counters and the lives show. */
  private shownScore = ZERO;
  private shownMoney = ZERO;
  private shownLives = -1;
  /** $6D6B: the colours of the room's four item slots (and of the boxes), kept from room to room. */
  private readonly slotColours = hexBytes(SLOT_COLOURS_HEX);

  /**
   * `carry` is what a title left: the loop's toggle and sprite buffers go on (the new game clears the beat, $5B39 clears
   * $402A-$4065); `high` the high score, printed with the labels ($656D ends in $82C3).
   */
  constructor(private readonly game: Game, carry?: TitleCarry, high?: readonly number[]) {
    if (carry) {
      this.toggle = carry.toggle;
      this.buildAt = carry.buildAt;
      this.pointerBase = carry.pointerBase;
    }
    this.capture = this.screen.capture(this.entities, this.frameEnable);
    this.newGame();
    if (high) printHigh(this.screen, high);
    game.items.onBox = (e) => this.box(e);
    game.onProgress = (stage) => drawProgress(this.screen, 2 - stage);
    game.onRoom = () => this.enterRoom();
  }

  // ---- the game starts ($5B39 on) ----------------------------------------------------------------

  /** The screen as a game begins in the room: the panel, its labels and counters, and the room itself. */
  private newGame(): void {
    const { screen } = this;
    screen.ram.set(TABLES.charset, CHARSET_AT);
    clearScreen(screen);
    drawLabels(screen);
    this.shownScore = this.shownMoney = ZERO;
    this.counters();
    this.lives();
    this.enterRoom();
    this.capture = screen.capture(this.entities, this.frameEnable);
  }

  // ---- a room ($5581 on) -------------------------------------------------------------------------

  /** The room Monty is in, drawn: its banner, the characters of its tiles and items, and its cells. */
  private enterRoom(): void {
    const { screen, game } = this;
    const number = game.world.room;
    const room = ROOMS[number];
    if (!room) throw new Error(`no room ${number}`);
    this.room = number;
    this.enable = SPRITES_SIDES;
    drawBanner(screen, number);
    const entries = game.items.slotEntry.flatMap((entry) => {
      const item = entry >= 0 ? TABLES.items[entry] : undefined;
      return item ? [item] : [];
    });
    const drawn = drawCells(room, TABLES, game.world.cells, entries);
    // the tiles' characters (1-15), and the items' ($2F + 4 x slot) with their colours
    screen.ram.set(drawn.chars.subarray(0, 16 * 8), CHARSET_AT);
    game.items.slotEntry.forEach((entry, slot) => {
      const item = entry >= 0 ? TABLES.items[entry] : undefined;
      if (!item) return;
      screen.ram.set(itemGlyphs(item.type), CHARSET_AT + (ITEM_CHARS + 4 * slot) * 8);
      this.slotColours.set(TABLES.itemColours.subarray(item.type * 4, item.type * 4 + 4), slot * 4);
    });
    for (let i = 0; i < COLS * ROWS; i++) {
      screen.put(FIRST_COL + (i % COLS), Math.floor(i / COLS), drawn.codes[i] ?? 0, drawn.colours[i] ?? 0);
    }
    this.cells.set(game.world.cells);
  }

  /** The cells that changed since they were drawn: an item taken ($6CEF), a tile alight or gone ($5297). */
  private changedCells(): void {
    const { screen } = this;
    const cells = this.game.world.cells;
    for (let i = 0; i < cells.length; i++) {
      const now = cells[i] ?? 0, was = this.cells[i] ?? 0;
      if (now === was) continue;
      this.cells[i] = now;
      const col = FIRST_COL + (i % COLS), row = Math.floor(i / COLS);
      if (now === BURNING_CODE) screen.put(col, row, BURN_CHAR);
      else if (now === 0) {
        // (a taken item keeps its colour, whatever else goes has the colour put to nothing)
        const item = was >= ITEM_CHARS && was < BURN_CHAR;
        screen.put(col, row, 0, item ? undefined : 0);
      } else throw new Error(`a cell becomes $${now.toString(16)}`);
    }
  }

  // ---- the panel ---------------------------------------------------------------------------------

  private counters(): void {
    const { screen, game } = this;
    const score = game.score.digits.join(','), money = game.money.digits.join(',');
    if (score !== this.shownScore) { printScore(screen, game.score.digits); this.shownScore = score; }
    if (money !== this.shownMoney) { printMoney(screen, game.money.digits); this.shownMoney = money; }
  }

  private lives(): void {
    if (this.game.lives === this.shownLives) return;
    drawLives(this.screen, this.game.lives);
    this.shownLives = this.game.lives;
  }

  /** For a check that sets the lives behind the game's back (as it does the original's): the faces stay as they are. */
  assumeLives(lives: number): void {
    this.shownLives = lives;
  }

  /** The same for the counters: the score and money digits on the panel stay as they are (a check that sets them behind the game's back). */
  assumeCounters(): void {
    this.shownScore = this.game.score.digits.join(',');
    this.shownMoney = this.game.money.digits.join(',');
  }

  /** $6C0E, $6CDD: a box filled or emptied. */
  private box(e: BoxEvent, drawnIn?: readonly number[]): void {
    if (e.type === null) {
      this.hands[e.hand] = null;
      return clearBox(this.screen, e.hand);
    }
    const colours = drawnIn ? [...drawnIn] : Array.from(this.slotColours.subarray(e.colourSlot * 4, e.colourSlot * 4 + 4));
    this.hands[e.hand] = { type: e.type, colours };
    drawBox(this.screen, e.hand, e.type, colours);
  }

  // ---- the flight ($758F) ------------------------------------------------------------------------

  /** He boards: the banner says where he is ($65A3, with the number of room $4F: IN FLIGHT) over the room's. */
  takeOff(): void {
    drawBanner(this.screen, FLIGHT_ROOM);
  }

  /** A frame of the flight: the panel as it stands (a plane shot down is points), under the sky. */
  flightCapture(flight: Flight): FrameCapture {
    this.counters();
    return flight.capture(this.screen);
  }

  /** A game put back from a save: the boxes as they were, and the parts of the way out's picture its progress has grown. */
  restorePanel(hands: readonly (Hand | null)[]): void {
    hands.forEach((hand, i) => {
      if (hand) this.box({ hand: i, type: hand.type, colourSlot: 0 }, hand.colours);
    });
    PROGRESS_STAGES.forEach((stage, i) => {
      if (this.game.progress >= stage) drawProgress(this.screen, 2 - i);
    });
    this.capture = this.finish();
  }

  // ---- the lift ($83EE) --------------------------------------------------------------------------

  /** The lift drawn after it moved: its room's characters cleared, then the body down from its hook and the end. */
  private drawLift(lift: Lift): void {
    const site = lift.site;
    if (!site) return;
    const { screen } = this;
    const hook = lift.pointer - SCREEN_AT;
    const put = (row: number, col: number, code: number): void => {
      screen.ram[SCREEN_AT + hook + row * SCREEN_COLS + col] = code;
    };
    for (let row = 0; row < site.height >> 1; row++) {
      for (let col = 0; col < 3; col++) {
        put(row, col, 0);
        screen.colour[hook + row * SCREEN_COLS + col] = LIFT_COLOURS[col] ?? 0;
      }
    }
    let rows = lift.drawnLength >> 1;
    let row = 0;
    if (rows > 1) {
      for (rows--; rows > 0; rows--, row++) for (let col = 0; col < 3; col++) put(row, col, LIFT_BODY + col);
    }
    // (a lift shorter than a character is always the first end: the game jumps over the choice)
    const end = lift.drawnLength >> 1 === 0 ? LIFT_ENDS[0] : LIFT_ENDS[lift.phase & 1] ?? LIFT_ENDS[0];
    for (let col = 0; col < 3; col++) put(row, col, end + col);
  }

  // ---- the animated tiles ($5818) ----------------------------------------------------------------

  /** Once a logic step the pictures of the room's animated tiles ($D2-$DB) turn or scroll in the character set. */
  private animateTiles(): void {
    animateTiles(this.screen, ROOMS[this.room]?.names ?? []);
  }

  // ---- the sprites -------------------------------------------------------------------------------

  /** $5C81: the entity records into the VIC's registers (Monty is drawn by sprites 0 and 1, the second a black outline one pixel on). */
  private latch(): void {
    const { game } = this;
    const m = game.monty;
    const records: EntityRecord[] = [{ x: m.x, y: m.y, colour: 0 }];
    for (let e = 0; e < ENTITIES - 1; e++) records.push({ x: game.enemies.x(e), y: game.enemies.y(e), colour: game.enemies.colour(e) });
    this.entities.latch(records, this.pointerBase);
    this.enable = SPRITES_ALL;
  }

  /** $66CA: the entity records' pictures into the buffer the next step shows (the 16 x 16 frame into 2 of the 3 bytes of 16 rows). */
  private buildImages(): void {
    const { game, screen } = this;
    for (let k = 0; k < ENTITIES; k++) {
      const frame = k === 0 ? game.monty.frame : game.enemies.frame(k - 1);
      // (the frames are drawn facing left: one that faces right is mirrored)
      const mirrored = !(k === 0 ? game.monty.faceLeft : game.enemies.facesLeft(k - 1));
      putSpriteImage(screen.ram, this.buildAt + 64 * k, SPRITE_FRAMES, frame, mirrored);
    }
  }

  // ---- what play leaves for what follows ---------------------------------------------------------

  /** $D027-$D02A as the last frame left them: the closing screen's loop steps these colours on from here. */
  get spriteColours(): number[] {
    return [0, 1, 2, 3].map((n) => this.entities.colour[n] ?? 0);
  }

  /** What the title picks up from the main loop: the loop's toggle, the beat and the sprite buffers' state (and the buffer at $3A00 itself: `ram`). */
  get titleCarry(): TitleCarry {
    return { toggle: this.toggle, beat: this.beat, buildAt: this.buildAt, pointerBase: this.pointerBase, buffer: this.screen.ram.slice(SPRITE_BUFFERS[1], SPRITE_BUFFERS[1] + 0x200) };
  }

  /** Whether the main loop's next pass is the drawing phase (A): it flips the toggle first, and a set toggle is A. */
  get nextIsA(): boolean {
    return this.toggle === 0;
  }

  // ---- the main loop's two phases ----------------------------------------------------------------

  /** Phase A ($5473): the lift (`moved`: it moved in this phase), the animated tiles and the sprite pictures. Returns the frame the VIC makes. */
  frameA(moved: boolean): FrameCapture {
    this.frameEnable = this.enable;
    this.toggle = 1;
    if (moved) this.drawLift(this.game.lift);
    this.animateTiles();
    this.buildImages();
    return this.finish();
  }

  /** The start of phase B ($54AE on, before the logic): the lift, the buffers swapped, the sprite registers. `capture` is then the frame as the beam would see it before the logic changed anything. */
  beginB(moved: boolean): void {
    this.frameEnable = this.enable;
    this.toggle = 0;
    if (moved) this.drawLift(this.game.lift);
    this.swapBuffers((this.beat + 1) & 0xff);
    this.latch();
    this.finish();
  }

  /** A picture taken up where the main loop is (`beat`: $4037 after its last logic phase began), with the sprites all on and the lift drawn. */
  resume(beat: number): void {
    this.swapBuffers(beat & 0xff);
    this.enable = this.frameEnable = SPRITES_ALL;
    // (a lift that has moved is on the screen as it last moved)
    this.drawLift(this.game.lift);
  }

  /** $54B1: the beat counted on; an odd one has the game draw into the buffer at $0200 and show the one at $3A00. */
  private swapBuffers(beat: number): void {
    this.beat = beat;
    const odd = (beat & 1) === 1;
    this.buildAt = odd ? SPRITE_BUFFERS[0] : SPRITE_BUFFERS[1];
    this.pointerBase = odd ? 0xe8 : 0x08;
  }

  /** The end of phase B: what the logic step changed on the screen, and the frame the VIC makes. */
  endB(): FrameCapture {
    const { game, screen } = this;
    this.changedCells();
    this.counters();
    this.lives();
    screen.ram.set(game.monty.burnPicture, CHARSET_AT + BURN_CHAR * 8);
    return this.finish();
  }

  private finish(): FrameCapture {
    this.capture = this.screen.capture(this.entities, this.frameEnable);
    return this.capture;
  }
}
