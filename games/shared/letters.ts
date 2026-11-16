/**
 * Names (and codes) on a touch screen, for every game whose screens ask for typed letters (a
 * high score's name, initials, a teleport's code): picked with the touch controls the game
 * already has, the C64 way, and typed into the game's own entry with the keys a keyboard would.
 *
 * - The stick's up and down change the letter under the cursor (held, they run on: the next
 *   letter, the one before);
 * - the main button (JUMP, FIRE) or right puts it in and moves on (the next starts at the same
 *   letter);
 * - left rubs out the last letter put in, to change it;
 * - RETURN (the RET key every game's touch controls have) puts the name in, the letter under
 *   the cursor with it.
 *
 * The letter under the cursor is the game's to draw, over its own cursor (`NamePicker.pending`,
 * `drawPending`): a letter is typed into the game's entry only when it's put in (one key a letter,
 * as a keyboard would type it), so an entry that waits after each key doesn't fall behind the
 * stick, and one that ends by itself on its last letter ends when that's chosen. Nothing of the
 * game's entry changes, and only the touch layer's presses are the picker's (Input.touchTyped):
 * the keyboard's still go to the game as typed, exactly as without it.
 */
import type { BitmapFont, Surface } from 'c64kit';


/**
 * What a game asking for a name declares: the characters the stick goes through, how many
 * the entry takes, and its main touch button (its label for the on-screen line, and the key it
 * presses).
 */
export interface NameSpec {
  /** The characters, in the order the stick goes through them (the first is where a name starts). */
  alphabet: string;
  /** The most characters the game's entry takes. */
  max: number;
  /** The main touch button's label (JUMP, FIRE) and the key it presses. */
  button: { label: string; key: string };
}

/** A key for the game's own entry: a character (one), or RETURN or DEL. */
export type NameKey = string;
export const RETURN = 'Enter', DEL = 'Backspace';

const REPEAT_AFTER = 14, REPEAT_EVERY = 4;
const UP = 'ArrowUp', DOWN = 'ArrowDown', LEFT = 'ArrowLeft', RIGHT = 'ArrowRight';

/** What NamePicker reads of c64kit's Input. */
interface NameInput { readonly typed: readonly string[]; readonly touchTyped: readonly string[]; readonly down: ReadonlySet<string> }

export class NamePicker {
  /** The letters put in (indexes into the alphabet), and the one under the cursor (-1: none, the name is full). */
  private name: number[] = [];
  private cur = -1;
  private started = false;
  private held: string | null = null;
  private heldFor = 0;

  constructor(readonly spec: NameSpec) {}

  /** The name is in (or the screen went): the next one starts afresh. */
  reset() { this.name = []; this.cur = -1; this.started = false; this.held = null; }

  /** The line naming our touch controls, for the screen asking (letters only, up to 34). */
  get hint() { return `UP/DOWN LETTER  ${this.spec.button.label} NEXT  RET DONE`; }

  /** The letter under the cursor, for the game to draw there; null when there's none (the name is full). */
  get pending(): string | null { return this.started && this.cur >= 0 ? this.spec.alphabet[this.cur] : null; }

  /** The letters put in so far (for tests). */
  get letters() { return this.name.map((i) => this.spec.alphabet[i]).join(''); }

  /**
   * A frame of the screen asking, on a touch screen: the keys for the game's entry from the touch
   * controls (the first frame shows the first letter), and the rest typed this frame, by
   * KeyboardEvent.code, for the game to read as it always has (the keyboard's, and touch keys
   * that aren't the picker's, such as RET: the letter under the cursor is typed before it).
   */
  frame(input: NameInput): { keys: NameKey[]; typed: string[] } {
    const keys: NameKey[] = [];
    const mine = new Set([UP, DOWN, LEFT, RIGHT, this.spec.button.key]);
    const touch = [...input.touchTyped];
    const typed: string[] = [];
    for (const code of input.typed) {
      const i = touch.indexOf(code);
      const fromTouch = i >= 0;
      if (fromTouch) touch.splice(i, 1);
      if (fromTouch && mine.has(code)) continue;
      if (fromTouch && code === RETURN && this.cur >= 0) {
        // (RET: the letter under the cursor goes in first)
        keys.push(this.spec.alphabet[this.cur], RETURN);
        this.cur = -1;
        continue;
      }
      typed.push(code);
    }
    const presses = input.touchTyped.filter((c) => mine.has(c));
    if (!this.started) {
      this.started = true;
      this.cur = 0;
    }
    for (const code of presses) {
      this.press(code, keys);
      if (code === UP || code === DOWN) { this.held = code; this.heldFor = 0; }
    }
    // up or down held: the letters run on
    if (this.held && !presses.includes(this.held)) {
      if (!input.down.has(this.held)) this.held = null;
      else if (++this.heldFor >= REPEAT_AFTER && (this.heldFor - REPEAT_AFTER) % REPEAT_EVERY === 0) this.press(this.held, keys);
    }
    return { keys, typed };
  }

  private press(code: string, keys: NameKey[]) {
    const n = this.spec.alphabet.length;
    if (code === UP || code === DOWN) {
      if (this.cur >= 0) this.cur = (this.cur + (code === UP ? 1 : n - 1)) % n; // (none: the name is full)
    } else if (code === LEFT) {
      const last = this.name.pop();
      if (last === undefined) return; // (nothing to rub out: the first letter stays, to change)
      keys.push(DEL);
      this.cur = last;
    } else if (this.cur >= 0) {
      // the main button (or right): this letter in, the next one starts at it
      keys.push(this.spec.alphabet[this.cur]);
      this.name.push(this.cur);
      this.cur = this.name.length < this.spec.max ? this.cur : -1;
    }
  }
}

/**
 * The letter under the cursor, drawn in its character cell at (x, y), in `ink`: the cell cleared
 * to `paper` first (the screen's own background), the game's cursor or placeholder there (a dot,
 * a dash) making way for the letter, as it would for a letter typed.
 */
export function drawPending(s: Surface, font: BitmapFont, ch: string, x: number, y: number, ink: number, paper: number) {
  s.fillRect(x, y, 8, 8, paper);
  font.draw(s, ch, x, y, ink);
}

/**
 * Keys for a game that reads a keyboard as it is (a C64's matrix, scanned by its own code): one
 * at a time, each held a few frames and then let go a few, so the game's scan sees each once, in order.
 */
export class KeyPacer {
  private queue: NameKey[] = [];
  private t = 0;
  constructor(private readonly hold = 3, private readonly gap = 3) {}
  push(keys: readonly NameKey[]) { this.queue.push(...keys); }
  clear() { this.queue = []; this.t = 0; }
  get busy() { return this.queue.length > 0; }
  /** The key down this frame, or null. */
  next(): NameKey | null {
    const k = this.queue[0];
    if (k === undefined) return null;
    const t = this.t++;
    if (t + 1 >= this.hold + this.gap) { this.queue.shift(); this.t = 0; }
    return t < this.hold ? k : null;
  }
}
