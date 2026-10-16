/**
 * The closing screen: GAME, then OVER, in big letters over the picture frozen where it was. It is the one routine
 * ($3540) the game goes to when the last life is lost and when the ending's flag is set; both end in it.
 *
 * What the original does: four sprites (expanded sideways, multicolour) at x $5A, $8C, $BE, $F0, y $64 hold the letters
 * of a word, and the program sits in a loop that steps the four colour registers of those sprites, one up and one down by
 * turns, 29 cycles an iteration, 131072 iterations a word. The raster interrupt chain of play goes on (the side columns'
 * eagles and pillars, the panel's mode) but the main loop does not: the room does not move, nothing animates. A word is
 * on for about 4.4 seconds (221 frames).
 *
 * The colours are an animation of the machine's speed, not a design: the loop runs through about 594 iterations a frame
 * (the interrupts take the rest), so a colour changes about twice a raster line, and each letter shows stripes. The
 * original's exact phase depends on the cycles the music driver takes in each interrupt, so here the stripes run at the
 * average speed: each line of a letter has the colour the registers would hold at that line.
 */
import type { FrameCapture } from 'c64kit';
import { bigLetter } from './scroller';
import { EntityRegisters, Screen } from './screen';

/** The frames a word is shown: 131072 iterations at about 594 a frame. */
export const WORD_FRAMES = 221;
export const WORDS = ['GAME', 'OVER'] as const;
/** What the loop gets through in a frame (the original's: 592-597, the interrupts take the rest of the frame's 19656 cycles). */
const ITERATIONS_PER_FRAME = 594;
const LINES = 312;
/** The sprites' places ($3601 on): x $5A, $8C, $BE, $F0, all at y $64. */
const LETTER_X = [0x5a, 0x8c, 0xbe, 0xf0] as const;
const LETTER_Y = 0x64;
/** The letters' sprite buffers: the first word at $0200, the second at $0300 (pointers $08-$0B and $0C-$0F). */
const BUFFER = [0x0200, 0x0300] as const;
const FIRST_POINTER = [0x08, 0x0c] as const;
const SPRITE_ROWS = 21;
const ROW_BYTES = 3;
/** The sprites' multicolour ($D01C = $FF) and sideways expansion ($D01D = $3F) as the interrupt chain leaves them. */
const LOOK = { multicolour: 0x3f, expandX: 0x3f } as const;
const ALL_ON = 0xff;
/** The character the letters' pictures are kept under: a big letter's sprite pointer is its character + $A4. */
const POINTER_OFFSET = 0xa4;

export class Closing {
  private readonly screen = new Screen();
  private readonly entities = new EntityRegisters();
  private frame = 0;

  /** `frozen` is the picture the main loop left; `colours` the colour registers of sprites 0-3 as it left them. */
  constructor(frozen: Screen, private readonly colours: readonly number[]) {
    this.screen.ram.set(frozen.ram);
    this.screen.colour.set(frozen.colour);
    // ($3558: the letters' pictures into the sprite buffers; the E of GAME is also the E of OVER)
    WORDS.forEach((word, w) => {
      for (let k = 0; k < 4; k++) {
        this.screen.ram.set(bigLetter(word.charCodeAt(k) + POINTER_OFFSET), (BUFFER[w] ?? 0) + 64 * k);
      }
    });
    LETTER_X.forEach((x, k) => {
      this.entities.x[k] = x;
      this.entities.y[k] = LETTER_Y;
    });
  }

  /** The 16K the VIC reads (c64kit's `ram`): the frozen picture's characters, with the letters' buffers. */
  get ram(): Uint8Array {
    return this.screen.ram;
  }

  /** Frames shown so far. */
  get frames(): number {
    return this.frame;
  }

  /** The next frame of the closing screen, or null when both words have had their time (the high score is then settled and the title begins). */
  next(): FrameCapture | null {
    const f = this.frame;
    if (f >= 2 * WORD_FRAMES) return null;
    this.frame++;
    const word = f < WORD_FRAMES ? 0 : 1;
    for (let k = 0; k < 4; k++) this.entities.pointer[k] = (FIRST_POINTER[word] ?? 0) + k;
    const base = this.screen.capture(this.entities, ALL_ON, LOOK);
    return { ...base, sprites: base.sprites.flatMap((s) => (s.n < 4 ? this.stripes(s, f) : [s])) };
  }

  /** A letter's sprite cut into its 21 rows, each with the colour the register has at its line. */
  private stripes(s: FrameCapture['sprites'][number], frame: number): FrameCapture['sprites'] {
    const rows: FrameCapture['sprites'] = [];
    for (let r = 0; r < SPRITE_ROWS; r++) {
      const data = new Uint8Array(64);
      data.set(s.data.subarray(r * ROW_BYTES, (r + 1) * ROW_BYTES));
      rows.push({ ...s, y: s.y + r, data, colour: this.colourAt(s.n, frame * ITERATIONS_PER_FRAME + Math.floor(((s.y + r) * ITERATIONS_PER_FRAME) / LINES)) });
    }
    return rows;
  }

  /** $D027 + n after `iterations` of the loop: the even sprites' registers count up, the odd ones' down (`inc $D027`, `dec $D028`, `inc $D029`, `dec $D02A`). */
  private colourAt(n: number, iterations: number): number {
    return ((this.colours[n] ?? 0) + (n % 2 === 0 ? iterations : -iterations)) & 15;
  }
}
