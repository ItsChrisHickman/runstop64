import { Colour, type SlotLine } from './panel';
import { placeName } from './wants';

/**
 * ENHANCED's item hints, on the panel's bottom row right of the money: a room or creature that wants a thing used to take it
 * without a word, so when something worked it felt like luck. Now a thing picked up that something wants says where it goes
 * (FOR MONACO), a room that wants a thing he is not carrying says so with the thing's picture (WANTED HERE:), and a handover
 * says what it paid (DELIVERED: +1000). `Game` says what happened (`onHint`); the picture shows it for a few seconds
 * (`HintClock`), then the slot goes back to the ticket count or the SPACE: FLY prompt.
 */
export type Hint =
  | { readonly kind: 'for'; readonly room: number }
  | { readonly kind: 'wanted'; readonly type: number }
  | { readonly kind: 'delivered'; readonly pay: number };

/** How long a hint stays: logic steps, 25 a second (4 seconds). */
export const HINT_STEPS = 100;
/** A handover is not pushed off by the next hint until it has been up this long (2 seconds): the next waits its turn. */
const HOLD_STEPS = 50;

/** What the slot shows for a hint, in the game's lettering. */
export function hintLine(h: Hint): SlotLine {
  switch (h.kind) {
    case 'for': return { text: `FOR ${placeName(h.room)}`, ink: Colour.White };
    case 'wanted': return { text: 'WANTED HERE:', ink: Colour.White, item: h.type };
    case 'delivered': return { text: h.pay > 0 ? `DELIVERED: +${h.pay}` : 'DELIVERED', ink: Colour.Yellow };
  }
}

/** The hint now on show and how long it has left; a new one takes its place, but a handover is shown for its while first. */
export class HintClock {
  private shown: { readonly hint: Hint; left: number } | null = null;
  private waiting: Hint | null = null;
  /** Increases with every new hint on show (the panel redraws on a change). */
  serial = 0;

  /** Something has happened that the player should be told. */
  show(hint: Hint): void {
    const now = this.shown;
    if (now !== null && now.hint.kind === 'delivered' && HINT_STEPS - now.left < HOLD_STEPS) this.waiting = hint;
    else this.put(hint);
  }

  /** One logic step. */
  step(): void {
    const now = this.shown;
    if (now === null) return;
    if (--now.left > 0 && !(this.waiting !== null && HINT_STEPS - now.left >= HOLD_STEPS)) return;
    const next = this.waiting;
    this.waiting = null;
    if (next !== null) this.put(next);
    else {
      this.shown = null;
      this.serial++;
    }
  }

  /** The hint on show, if any. */
  get current(): Hint | null {
    return this.shown?.hint ?? null;
  }

  private put(hint: Hint): void {
    this.shown = { hint, left: HINT_STEPS };
    this.waiting = null;
    this.serial++;
  }
}
