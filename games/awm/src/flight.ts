/**
 * The flight: what the Commodore key opens ($758F, which the notes of the first stages took for a shop). Standing at a
 * plane (the two enemy records showing frames $D0 and $D1, which touching harms nothing) with a ticket (an item of type 0)
 * in his hands, he boards: the ticket is taken, the screen becomes a sky of clouds with his plane and another, and when the
 * time is up (the clock $80A0/$80A1 from $08CA runs out after 1995 frames, 40 seconds) he comes down at the plane of the place the table at $753F names. If the other
 * plane is behind him with its nose at his tail for 60 frames ($3C) he crashes and loses a life, where he started from.
 *
 * It is run entirely by raster interrupts of its own ($77FC), seven stages down every frame, while the main loop waits for
 * $809F. Like the play IRQ's (screen.ts) this module is the interrupt chain and what it draws, nothing else:
 *
 *   stage 0, line 0     the colours, the screen mode, the sprites' places and pictures (the clouds' sprites 0, 1, 6, 7, his
 *                       plane 2 and 3, the other plane 4 and 5), the top band's scroll ($3A);
 *   stage 1, line $20   the top band (rows 0-6) steps its scroll by 2 pixels and, every fourth frame, shifts a character;
 *   stage 2, line $6A   the middle band's scroll ($3B) and the clouds' sprites moved to the lower places;
 *   stage 3, line $90   no scroll for the lower band (rows 12-17); stage 4, line $96: the middle band moves 3 pixels;
 *   stage 5, line $B4   the lower band shifts a whole character every frame (8 pixels);
 *   stage 6, line $C1   the panel's screen back, then the game: his controls, the other plane's path, the planes touching,
 *                       the clock and the music.
 *
 * What stays in the machine from one flight to the next, because nothing sets it when a flight begins (the clouds, where
 * the planes were, the last pictures), is `SkyState`; the game keeps it between flights (and a save keeps it).
 */
import type { FrameCapture } from 'c64kit';
import { FLIGHT_HEX, FLIGHT_PATHS_HEX, FLIGHT_TO_HEX } from './data/awm-data';
import { fromHex } from './data';
import { Dir } from './input';
import { SCREEN_AT, SCREEN_COLS, type Screen } from './screen';

// ---- the flight's memory, in the bank of the VIC ($C000-$FFFF) ------------------------------------------------------------

/** The bank the flight uses ($DD00 = 0): the character set at $D000, the sprite pictures after it, the sky's rows at $C000. */
const BANK = 0xc000;
const DATA_AT = 0xd000;
const MAP_AT = 0xdd00;
const COLS = 40;
const SKY_ROWS = 18;
/** The sprite pointers ($C3F8-$C3FF: the screen's last 8 bytes). */
const POINTERS = BANK + 0x3f8;

/** The VIC's first picture line, and the lines of the interrupts' stages ($7865 on). */
const FIRST_LINE = 0x33;
const LINES = 312;
/** The top band: rows 0-6 shift in stage 1; the middle band rows 7-11 in stage 4; the lower band rows 12-17 in stage 5. */
const TOP_ROWS = 7;
const MIDDLE_ROWS = 12;
/** Stage 0's border and background colours ($0E: light blue sky), the multicolours ($D022, $D023), and the panel's. */
const SKY = 0x0e;
const CLOUD_LIGHT = 0x0f;
const CLOUD_DARK = 0x0c;
const PANEL_BACKGROUND = 0;
/** The colour RAM the flight fills its rows with ($09: multicolour, white). */
const CLOUD_COLOUR = 9;
/** The raster line the border goes black on (stage 6's $D020, written at the end of line $C2 or the start of $C3: the game's timing varies by a cycle). */
const BORDER_BLACK_LINE = 0xc2;
/** The line stage 6 changes the screen mode on: its text row is the first the panel's mode ($D018 = $1F) shows. */
const PANEL_ROW = 18;

/** The sprites: 0 and 1 and 6 and 7 are clouds (expanded sideways), 2 and 3 his plane, 4 and 5 the other. */
const SPRITE_COLOURS = [0x0f, 0x0f, 5, 5, 8, 8, 0x0f, 0x0f] as const;
const CLOUD_SPRITES: readonly number[] = [0, 1, 6, 7];
const SPRITE_HEIGHT = 21;
const MULTICOLOUR_1 = 1;
const MULTICOLOUR_2 = 0x0b;
/** Where the sprites are put, each frame, from the memory's numbers ($38 and $32 are the VIC's offsets of the screen's corner). */
const X_OFFSET = 0x38;
const Y_OFFSET = 0x32;
/** The clouds' sprites: first place (stage 0), the lines they are put at, and the lower place (stage 2). */
const CLOUD_Y_FIRST = [0x46, 0x46, 0, 0, 0, 0, 0x4e, 0x32] as const;
const CLOUD_Y_LOWER = [0xa0, 0xa0, 0, 0, 0, 0, 0x7f, 0x8c] as const;
/** The sprites' x range: the VIC's coordinates are 0-503 and wrap there. */
const X_RANGE = 504;

/** The pointers (pictures $D800 + 64 x) set when a flight begins: the clouds'; the planes' ($60-$6B) and the explosion's ($70-$73) come as they lean and burn. */
const CLOUD_POINTERS = [0x6c, 0x6d, 0, 0, 0, 0, 0x6e, 0x6f] as const;
const ENEMY_PICTURE = 0x66;
const EXPLOSION_PICTURE = 0x6e;
const PLAYER_PICTURE = 0x60;

// ---- the numbers of the game ------------------------------------------------------------------------------------------------

/** $7862: what his plane can take, in frames of the other's nose at its tail. */
const PLANE_LIFE = 0x3c;
/** $7863: what the other plane can take, in frames of his nose at its tail. */
const ENEMY_LIFE = 0x14;
/** $80A0/$80A1: the clock's start; its high byte counting down to 0 ends the flight, 1995 frames on. */
const FLIGHT_FRAMES = 0x08ca;
/** What a plane shot down is worth ($81FA: 100). */
const KILL_POINTS = 0x64;
/** The sound of a hit ($48). */
const HIT_SOUND = 0x48;

/** The nose of a plane is $1E pixels from its left; the distances that count as touching ($7EF1, $7F03). */
const NOSE = 0x1e;
const TOUCH_X = 4;
const TOUCH_Y = 0x0c;

/** A path of the other plane: where it starts, and the legs it flies ($7709). */
interface Path {
  readonly x: number;
  readonly y: number;
  /** `kind` 1-4 (see `fly`), `speed` signed, for `count` frames. */
  readonly legs: readonly { readonly kind: number; readonly speed: number; readonly count: number }[];
}

/** The four paths, from the table of pointers and the bytes it points into. */
const PATHS: readonly Path[] = (() => {
  const bytes = fromHex(FLIGHT_PATHS_HEX);
  const base = 0x7709;
  return [0, 1, 2, 3].map((i): Path => {
    let at = (bytes[2 * i] ?? 0) + ((bytes[2 * i + 1] ?? 0) << 8) - base;
    const x = bytes[at] ?? 0, y = bytes[at + 1] ?? 0;
    at += 2;
    const legs: { kind: number; speed: number; count: number }[] = [];
    while ((bytes[at] ?? 0) !== 0) {
      legs.push({ kind: bytes[at] ?? 0, speed: bytes[at + 1] ?? 0, count: bytes[at + 2] ?? 0 });
      at += 3;
    }
    return { x, y, legs };
  });
})();

/** The room number the banner says IN FLIGHT for ($4F: the game prints its banner as for a room). */
export const FLIGHT_ROOM = 0x4f;

/** Where a plane flies to, from each room ($753F): the room it comes down in, or $FF. */
const FLIGHT_TO = fromHex(FLIGHT_TO_HEX);

/** The room a plane in `room` flies to, if it flies anywhere. */
export function destination(room: number): number | null {
  const to = FLIGHT_TO[room] ?? 0xff;
  return to === 0xff ? null : to;
}

/** The memory the VIC reads of the flight: the character set, the sprite pictures and the map of the sky ($D000-$DFCF). */
const DATA = fromHex(FLIGHT_HEX);

// ---- what stays between flights -----------------------------------------------------------------------------------------------

/** What stays in the machine from one flight to the next, as plain numbers (a save keeps it so). */
export interface SkyState {
  /** $784D, $784F, $7851, $7853 and $7855, $7857, $7859, $785B: the clouds' sprites' x, upper then lower, 0-503. */
  clouds: number[];
  /** $785D and $785E: the counters that slow the upper and the lower pair's second cloud. */
  slow: number[];
  /** $785F: counts the frames to the next picture of the planes (4 to 1). */
  tick: number;
  /** $3B: the middle band's scroll. */
  scrollB: number;
  /** $7860, $7861: the other plane's place. */
  enemy: number[];
  /** $809C, $809D: his plane's place. */
  player: number[];
  /** $809E: how far his plane leans (0, 1, 2, then 1 again; bit 7 set on the way back). */
  lean: number;
  /** $4063: the other plane's explosion, 0 for none, then 1, 2, 3. */
  explosion: number;
  /** $4065: $48 while a hit's sound has been asked for. */
  hit: number;
  /** $C3FA-$C3FD: the pointers of his plane's two sprites and the other plane's. */
  pointers: number[];
}

/** The values the program file has: the first flight of a session starts from them. */
export const FRESH_SKY: SkyState = {
  clouds: [0xc8, 0xf8, 0x1c8, 0x30, 0x64, 0x94, 0x119, 0x149],
  slow: [0, 0],
  tick: 4,
  scrollB: 0,
  enemy: [0x32, 0x32],
  player: [0x50, 0x50],
  lean: 0,
  explosion: 0,
  hit: 0,
  pointers: [0, 0, 0, 0],
};

/** The memory as a copy of a state (the game's own, which the flights change in place). */
export function copySky(s: SkyState): SkyState {
  return {
    clouds: [...s.clouds], slow: [...s.slow], tick: s.tick, scrollB: s.scrollB, enemy: [...s.enemy], player: [...s.player],
    lean: s.lean, explosion: s.explosion, hit: s.hit, pointers: [...s.pointers],
  };
}

/** Whether numbers are a state the flight can have been left in (a save is checked by this). */
export function isSky(s: SkyState): boolean {
  const byte = (n: number): boolean => Number.isInteger(n) && n >= 0 && n < 256;
  return s.clouds.length === 8 && s.clouds.every((c) => Number.isInteger(c) && c >= 0 && c < X_RANGE) && s.slow.length === 2 && s.slow.every(byte)
    && byte(s.tick) && byte(s.scrollB) && s.enemy.length === 2 && s.enemy.every(byte) && s.player.length === 2 && s.player.every(byte)
    && byte(s.lean) && s.explosion >= 0 && s.explosion <= 3 && byte(s.hit) && s.pointers.length === 4 && s.pointers.every(byte);
}

// ---- the flight ------------------------------------------------------------------------------------------------------------

/** What a flight asks of the game around it. */
interface FlightHost {
  /** The game's random number ($51F7). */
  random(): number;
  /** The title's sound choice ($4066 is set): the hits' sound is asked for, and the voices cut, only then. */
  effectsOn(): boolean;
  effect(n: number): void;
  silence(voice: number): void;
  /** A plane shot down: its points go to the score and are printed ($81FA). */
  kill(points: number): void;
}

/** One of the VIC's sprite registers' states: where each sprite is put (the lines are the sprites' first). */
interface Placing {
  readonly x: number[];
  readonly y: number[];
}

/** The sprites 0 and 1 and 6 and 7 each have a place in the upper half and one in the lower. */
const placing = (): Placing => ({ x: new Array<number>(8).fill(0), y: new Array<number>(8).fill(0) });

const wrap = (p: number, by: number): number => (p - by + X_RANGE) % X_RANGE;

export class Flight {
  /** The 64K the VIC reads from, in the machine's addresses: the play screen's bank 0 below, the flight's bank at $C000. */
  readonly ram = new Uint8Array(0x10000);
  /** $7864: he was shot down. */
  crashed = false;
  /** $809F: the flight is over (the frame it is set in is the last). */
  over = false;
  /** Frames flown so far. */
  frames = 0;
  /** $4033: the controls as the last frame read them (the flight keeps them where Monty keeps his own). */
  input = 0;

  /** $3A: the top band's scroll, 6, 4, 2, 0. */
  private scrollA = 0;
  /** $7862, $7863: what is left of the two planes' lives. */
  private life = PLANE_LIFE;
  private enemyLife = 0;
  /** $80A0 and $80A1: the clock, counting down in two bytes. */
  private clockLow = FLIGHT_FRAMES & 0xff;
  private clockHigh = FLIGHT_FRAMES >> 8;
  /** The other plane's path: $8074 (a path is on), $3C/$3D and $3E (the path and where in it), $8071-$8073 (the leg: kind, frames left, speed). */
  private pathOn = false;
  private path: Path = PATHS[0];
  private leg = 0;
  private legKind = 0;
  private legFrames = 0;
  private legSpeed = 0;
  /** The sprites' places: the first (stage 0) and the lower for the clouds (stage 2). */
  private readonly first = placing();
  private readonly lower = placing();
  /** The rows' $D016 (the scroll) in the top band, the middle band, and the rows after. */
  private scrollTop = 0;
  private scrollMiddle = 0;
  /** The sky's rows as the VIC has them at their lines. */
  private rows = new Uint8Array(COLS * SKY_ROWS);

  /** `play` is the 16K of the play screen's bank (the panel's characters stay as they are). */
  constructor(private readonly memory: SkyState, private readonly host: FlightHost, play: Uint8Array) {
    this.ram.set(play.subarray(0, 0x4000));
    this.ram.set(DATA, DATA_AT);
    // ($8111: the sky's map copied to the screen)
    this.ram.copyWithin(BANK, MAP_AT, MAP_AT + COLS * SKY_ROWS);
    // ($8147 on: the sprites' pointers of the clouds)
    CLOUD_POINTERS.forEach((p, n) => { if (p) this.ram[POINTERS + n] = p; });
    this.ram[POINTERS + 2] = memory.pointers[0] ?? 0;
    this.ram[POINTERS + 3] = memory.pointers[1] ?? 0;
    this.ram[POINTERS + 4] = memory.pointers[2] ?? 0;
    this.ram[POINTERS + 5] = memory.pointers[3] ?? 0;
    // (the first interrupt of the flight is stage 0 alone, in a frame of its own: the main loop's set-up then writes the raster
    // line the next interrupt comes at over the one stage 0 chose, so the frame after it begins with stage 1. That first frame
    // is a sky and some garbage; the rebuild goes straight to the next.)
    this.stage0();
  }

  /** What the flight keeps in its own variables, by the names of the checks (test/flight.ts compares them with the original's bytes). */
  get variables(): Readonly<Record<'scrollA' | 'life' | 'enemyLife' | 'crashed' | 'over' | 'clock' | 'path', number>> {
    return {
      scrollA: this.scrollA, life: this.life, enemyLife: this.enemyLife, crashed: this.crashed ? 1 : 0, over: this.over ? 1 : 0,
      clock: (this.clockHigh << 8) | this.clockLow, path: this.pathOn ? (this.legKind << 16) | (this.legFrames << 8) | this.legSpeed : 0,
    };
  }

  // ---- one frame: the seven stages ---------------------------------------------------------------------------------------

  /**
   * One frame of the flight, with `controls` (`Dir` bits, the game's own: scrambled by a bonus as the game has it) as they are when
   * stage 6 reads them. The frame's picture is `capture`.
   */
  step(controls: number): void {
    if (this.frames > 0) this.stage0();
    this.stage1();
    this.stage2();
    this.stage3();
    this.stage4();
    this.stage5();
    this.stage6(controls);
    this.frames++;
  }

  /** $7865: the colours and the modes, the clouds along, the planes' pictures and all the sprites' places. */
  private stage0(): void {
    const m = this.memory;
    const [a, b, c, d] = [0, 1, 2, 3] as const;
    // the upper clouds: the first two move a pixel a frame, the second pair two frames in three (counters $785D)
    m.clouds[a] = wrap(m.clouds[a] ?? 0, 1);
    m.clouds[b] = wrap(m.clouds[b] ?? 0, 1);
    this.slowPair(0, c, d);
    this.scrollTop = this.scrollA;
    const { first } = this;
    first.x[0] = m.clouds[a] ?? 0; first.x[1] = m.clouds[b] ?? 0; first.x[6] = m.clouds[c] ?? 0; first.x[7] = m.clouds[d] ?? 0;
    CLOUD_SPRITES.forEach((n) => { first.y[n] = CLOUD_Y_FIRST[n] ?? 0; });
    // the other plane: two sprites 24 pixels apart, a plane 48 wide
    const [ex, ey] = [m.enemy[0] ?? 0, m.enemy[1] ?? 0];
    first.x[4] = ex + X_OFFSET;
    first.x[5] = ex + 0x50;
    first.y[4] = first.y[5] = (ey + Y_OFFSET) & 0xff;
    // the pictures: the enemy's (or its explosion's) every fourth frame
    if (m.tick === 4) {
      if (m.explosion !== 0) {
        if (m.explosion === 3) {
          this.pathOn = false;
          m.explosion = 0;
        } else {
          const picture = EXPLOSION_PICTURE + 2 * m.explosion;
          m.explosion++;
          this.pointers(2, picture);
        }
      } else {
        this.pointers(2, ENEMY_PICTURE + 2 * (m.lean & 7));
      }
    }
    // his plane
    first.x[2] = ((m.player[0] ?? 0) + X_OFFSET) & 0xff;
    first.x[3] = ((m.player[0] ?? 0) + X_OFFSET + 0x18) & 0xff;
    first.y[2] = first.y[3] = ((m.player[1] ?? 0) + Y_OFFSET) & 0xff;
    // and his plane's picture, as it leans, every fourth frame
    m.tick = (m.tick - 1) & 0xff;
    if (m.tick === 0) {
      m.tick = 4;
      this.lean();
    }
  }

  /** The pair of clouds that move two frames in three: counter `slow` ($785D, $785E) as the game decrements it, then the pixel (`dec`, `beq`, `bpl`). */
  private slowPair(slow: number, upper: number, lower: number): void {
    const m = this.memory;
    const n = ((m.slow[slow] ?? 0) - 1) & 0xff;
    m.slow[slow] = n;
    if (n !== 0 && (n & 0x80) === 0) return;
    if (n !== 0) {
      m.slow[slow] = 2;
      m.clouds[upper] = wrap(m.clouds[upper] ?? 0, 1);
    }
    m.clouds[lower] = wrap(m.clouds[lower] ?? 0, 1);
  }

  /** $79C9: his plane's lean: up 0, 1, 2 then back down; the picture is two sprites, 2 characters on. */
  private lean(): void {
    const m = this.memory;
    if ((m.lean & 0x80) === 0) {
      m.lean = (m.lean + 1) & 0xff;
      if (m.lean === 2) m.lean |= 0x80;
    } else {
      m.lean = (m.lean - 1) & 0xff;
      if (m.lean === 0x80) m.lean = 0;
    }
    this.pointers(0, PLAYER_PICTURE + ((m.lean << 1) & 0xff));
  }

  /** The pointers of a plane's two sprites: `at` 0 his, 2 the other's (the memory's pointers and the screen's bytes). */
  private pointers(at: number, picture: number): void {
    this.memory.pointers[at] = picture;
    this.memory.pointers[at + 1] = (picture + 1) & 0xff;
    this.ram[POINTERS + 2 + at] = picture;
    this.ram[POINTERS + 3 + at] = (picture + 1) & 0xff;
  }

  /** $7A02: the top band: its scroll steps 2 pixels, and when it is 4 the band shifts a character. */
  private stage1(): void {
    this.scrollA -= 2;
    if (this.scrollA < 0) {
      this.scrollA = 6;
      return;
    }
    if (this.scrollA === 4) this.shift(0, TOP_ROWS);
  }

  /** $7D50: the middle band's scroll and the clouds' sprites to the lower places. */
  private stage2(): void {
    const m = this.memory;
    this.scrollMiddle = m.scrollB;
    const e = 4, f = 5, g = 6, h = 7;
    m.clouds[e] = wrap(m.clouds[e] ?? 0, 2);
    m.clouds[f] = wrap(m.clouds[f] ?? 0, 2);
    this.slowPair(1, g, h);
    const { lower, first } = this;
    for (let n = 0; n < 8; n++) { lower.x[n] = first.x[n] ?? 0; lower.y[n] = first.y[n] ?? 0; }
    lower.x[0] = m.clouds[e] ?? 0; lower.x[1] = m.clouds[f] ?? 0; lower.x[6] = m.clouds[g] ?? 0; lower.x[7] = m.clouds[h] ?? 0;
    CLOUD_SPRITES.forEach((n) => { lower.y[n] = CLOUD_Y_LOWER[n] ?? 0; });
  }

  /** $7D46: the rows after the middle band have no scroll; the rows as the VIC will fetch them. */
  private stage3(): void {
    this.rows = this.ram.slice(BANK, BANK + COLS * SKY_ROWS);
  }

  /** $7B1F: the middle band's scroll moves 3 pixels a frame, a character shift where it wraps. */
  private stage4(): void {
    const m = this.memory;
    m.scrollB = (m.scrollB - 3) & 0xff;
    if (m.scrollB & 0x80) {
      m.scrollB = (m.scrollB + 8) & 0xff;
      this.shift(TOP_ROWS, MIDDLE_ROWS);
    }
  }

  /** $7C3A: the lower band shifts a character every frame. */
  private stage5(): void {
    this.shift(MIDDLE_ROWS, SKY_ROWS);
  }

  /** A band's rows shifted a character left, the first coming round at the end. */
  private shift(from: number, to: number): void {
    for (let row = from; row < to; row++) {
      const at = BANK + row * COLS;
      const first = this.ram[at] ?? 0;
      this.ram.copyWithin(at, at + 1, at + COLS);
      this.ram[at + COLS - 1] = first;
    }
  }

  // ---- stage 6: the game ($7E25) ---------------------------------------------------------------------------------------------

  private stage6(controls: number): void {
    this.steer(controls);
    this.fly();
    this.touch();
    // ($7E57: the clock: the flight is over when the high byte has counted down)
    this.clockLow = (this.clockLow - 1) & 0xff;
    if (this.clockLow === 0xff) {
      this.clockHigh = (this.clockHigh - 1) & 0xff;
      if (this.clockHigh === 0) this.over = true;
    }
  }

  /** $7E76: his plane: right 3, left 2, up 2, down 2, and drifting back 1 when neither left nor right. */
  private steer(controls: number): void {
    this.input = controls;
    const m = this.memory;
    let x = m.player[0] ?? 0, y = m.player[1] ?? 0;
    if (controls & Dir.Right) {
      const to = (x + 3) & 0xff;
      if ((to & 0x80) === 0) x = to;
    }
    if (controls & Dir.Left) {
      const to = (x - 2) & 0xff;
      if (to >= 8) x = to;
    }
    if (controls & Dir.Up) {
      const to = (y - 2) & 0xff;
      if (to >= 8) y = to;
    }
    if (controls & Dir.Down) {
      const to = (y + 2) & 0xff;
      if (to < 0x78) y = to;
    }
    if ((controls & (Dir.Right | Dir.Left)) === 0) {
      const to = (x - 1) & 0xff;
      if (to >= 8) x = to;
    }
    m.player[0] = x;
    m.player[1] = y;
  }

  /** $7F8B: the other plane flies its path: a new one (picked at random from the four, from a corner) when the last is done. */
  private fly(): void {
    const m = this.memory;
    if (!this.pathOn) {
      this.enemyLife = ENEMY_LIFE;
      this.path = PATHS[this.host.random() & 3];
      m.enemy[0] = this.path.x;
      m.enemy[1] = this.path.y;
      this.leg = 0;
      this.legKind = this.legFrames = this.legSpeed = 0;
    }
    if (this.legKind === 0) {
      const leg = this.path.legs[this.leg];
      this.legKind = leg ? leg.kind : 0;
      this.pathOn = this.legKind !== 0;
      if (!leg) return;
      this.legSpeed = leg.speed;
      this.legFrames = leg.count;
      this.leg++;
    }
    const speed = this.legSpeed;
    let x = m.enemy[0] ?? 0, y = m.enemy[1] ?? 0;
    // (x moves unless it would come to rest within the 8 before 0 or at 0; y unless it would go negative)
    const moveX = (): void => {
      const to = (x + speed) & 0xff;
      if (((to + 8) & 0xff) >= 9) x = to;
    };
    switch (this.legKind) {
      case 1:
        moveX();
        if (((y + speed) & 0x80) === 0) y = (y + speed) & 0xff;
        break;
      case 2:
        moveX();
        break;
      case 3:
        moveX();
        if (((y - speed) & 0x80) === 0) y = (y - speed) & 0xff;
        break;
      default:
        if (((y - speed) & 0x80) === 0) y = (y - speed) & 0xff;
        break;
    }
    m.enemy[0] = x;
    m.enemy[1] = y;
    this.legFrames = (this.legFrames - 1) & 0xff;
    if (this.legFrames === 0) this.legKind = 0;
  }

  /** The distance of two places the way the game measures it: a byte's difference taken as a signed byte, then without its sign ($7EE6-$7EF1). */
  private static apart(a: number, b: number): number {
    const d = (a - b) & 0xff;
    return d & 0x80 ? (256 - d) & 0xff : d;
  }

  /** $7EDA: his nose at the other's tail (it is hit), the other's nose at his tail (he is), or neither. */
  private touch(): void {
    const m = this.memory;
    if (m.explosion !== 0) return;
    const [px, py] = [m.player[0] ?? 0, m.player[1] ?? 0], [ex, ey] = [m.enemy[0] ?? 0, m.enemy[1] ?? 0];
    if (Flight.apart(px + NOSE, ex) < TOUCH_X && Flight.apart(py, ey) < TOUCH_Y) {
      this.sound();
      this.enemyLife = (this.enemyLife - 1) & 0xff;
      if (this.enemyLife === 0) {
        m.explosion = 1;
        this.host.kill(KILL_POINTS);
      }
    } else if (Flight.apart(ex + NOSE, px) < TOUCH_X && Flight.apart(ey, py) < TOUCH_Y) {
      this.sound();
      this.life = (this.life - 1) & 0xff;
      if (this.life === 0) {
        this.crashed = true;
        this.over = true;
        this.quiet();
      }
    } else {
      this.quiet();
    }
  }

  /** A hit's sound, asked for once while it lasts ($4065 says it has been). */
  private sound(): void {
    const m = this.memory;
    if (m.hit !== 0) return;
    m.hit = HIT_SOUND;
    this.host.effect(HIT_SOUND);
  }

  /** The effect voices cut ($C7E3 for voices 0 and 1), when the effects are the sound chosen. */
  private quiet(): void {
    if (!this.host.effectsOn()) return;
    this.memory.hit = 0;
    this.host.silence(0);
    this.host.silence(1);
  }

  // ---- the picture -----------------------------------------------------------------------------------------------------------

  /**
   * The frame the VIC made: the sky's 18 rows from the flight's bank with the three bands' scrolls, then the play screen's rows
   * (`screen`: the panel, as the game left it) with the mode of the panel from the row after the sky.
   */
  capture(screen: Screen): FrameCapture {
    const rows: FrameCapture['rows'] = [];
    const sky = (row: number): number => (row < TOP_ROWS + 1 ? 0x10 | this.scrollTop : row < MIDDLE_ROWS ? 0x10 | this.scrollMiddle : 0x10);
    for (let row = 0; row < SKY_ROWS; row++) {
      rows.push({
        codes: this.rows.slice(row * COLS, (row + 1) * COLS), colours: new Uint8Array(COLS).fill(CLOUD_COLOUR),
        d011: 0x1b, d016: sky(row), d018: 4, bank: BANK, bg: [SKY, CLOUD_LIGHT, CLOUD_DARK, 1], line: FIRST_LINE + 8 * row,
      });
    }
    for (let row = PANEL_ROW; row < 25; row++) {
      rows.push({
        codes: screen.ram.slice(SCREEN_AT + row * SCREEN_COLS, SCREEN_AT + (row + 1) * SCREEN_COLS),
        colours: screen.colour.slice(row * SCREEN_COLS, (row + 1) * SCREEN_COLS),
        d011: 0x1b, d016: row === PANEL_ROW ? 0x10 : 8, d018: 0x1f, bank: 0,
        bg: [row === PANEL_ROW ? SKY : PANEL_BACKGROUND, CLOUD_LIGHT, CLOUD_DARK, 1], line: FIRST_LINE + 8 * row,
      });
    }
    const borderLines = new Uint8Array(LINES);
    borderLines.fill(SKY, 1, BORDER_BLACK_LINE);
    return { rows, sprites: this.sprites(), border: 0, borderLines };
  }

  /** The sprites as the VIC starts them down the frame: each at the line its y says, with the registers as the stage before it left them. */
  private sprites(): FrameCapture['sprites'] {
    const starts: { n: number; y: number; set: Placing }[] = [];
    for (let n = 0; n < 8; n++) starts.push({ n, y: this.first.y[n] ?? 0, set: this.first });
    for (const n of CLOUD_SPRITES) {
      // (a sprite is started again only when it has finished: the lower place is far enough down for all four)
      if ((this.lower.y[n] ?? 0) >= (this.first.y[n] ?? 0) + SPRITE_HEIGHT) starts.push({ n, y: this.lower.y[n] ?? 0, set: this.lower });
    }
    starts.sort((a, b) => a.y - b.y || a.n - b.n);
    return starts.map(({ n, y, set }) => {
      const x = set.x[n] ?? 0;
      const at = BANK + (this.ram[POINTERS + n] ?? 0) * 64;
      return {
        n, x: x & 0x1ff, y, data: this.ram.slice(at, at + 64), colour: SPRITE_COLOURS[n] ?? 0, multicolour: true,
        expandX: CLOUD_SPRITES.includes(n), expandY: false, behind: true, mc1: MULTICOLOUR_1, mc2: MULTICOLOUR_2,
      };
    });
  }
}
