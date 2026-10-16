/**
 * What Pendragon says on the status line in ENHANCED's GUIDED assist (src/guided.ts: which line when;
 * games/shared/native/narrate.ts: how it is shown). Every word of it is here, keyed by what happened,
 * so the wording can change without touching the logic.
 *
 * The game's lettering is A-Z, 0-9, a space and a colon: no apostrophe (CAPTAINS, NAVIGATORS, HAVENT,
 * as the game itself writes them), no comma (left out where it was), no full stop. A full stop ends a
 * sentence: sentences that fit the line together (32 letters) are shown together with a gap between,
 * the others one after the other; a line longer than the line is shown in parts, cut at its words.
 * A list is said one after the other.
 *
 * Chris's draft text is the first part; the second part is lines for things that serve a puzzle and
 * weren't in the draft (checked against the rooms' code: src/guided.ts says what each does), kept
 * short so they can be changed or dropped.
 */

/** A line, or lines said one after the other. */
export type Say = string | readonly string[];

export interface Lines {
  start: Say;
  /** On deck 5, where the captain's door will be, while it is still wall. */
  doorSeen: Say;
  /** A piece of the chart taken: how many are still to find ... */
  pieceRemain: Record<1 | 2 | 3, Say>;
  /** ... and the last: the chart is whole. */
  chartWhole: Say;
  /** The sword (deck 1). */
  sword: { room: Say; taken: Say };
  /** The rite: bell, book and candle (the guard's piece). */
  bell: { room: Say; taken: Say };
  book: {
    /** Touching the book without the key. */
    locked: Say;
    /** Taken, with the bell in hand and the candle still to find. */
    nowCandle: Say;
    /** Taken before the bell (the game doesn't ask for it first). */
    needsBell: Say;
  };
  candle: {
    /** Taken before the bell and the book. */
    early: Say;
    needsBell: Say;
    needsBook: Say;
  };
  /** The third of the three taken. */
  riteComplete: Say;
  guard: { refuse: Say; ready: Say; done: Say };
  /** The navigator's tools (the chart in the hall on deck 4). */
  chart: { without: Say; done: Say };
  /** The tool taken ... */
  tool: { telescope: string; sextant: string; compass: string };
  /** ... and, by how many of the three he has now, what it means. */
  toolCount: Record<1 | 2 | 3, string>;
  /** The sirens (comb and mirror). */
  sirens: { without: Say; ready: Say; done: Say };
  comb: Say;
  mirror: { room: Say; found: Say; used: Say };
  /** The chart on the shelf (deck 1). */
  shelf: { room: Say; struck: Say };
  captain: { room: Say; end: Say };
  /** A trapdoor gives way. */
  trapdoor: Say;
  // ---- not in the draft: the other things that serve a puzzle ----
  gunpowder: Say;
  cannon: { without: Say; loaded: Say };
  anchor: Say;
  seaweed: Say;
  oyster: Say;
  pearl: Say;
  drain: Say;
  skull: { taken: Say; both: Say };
  crossbones: { taken: Say; both: Say };
  keyRoom: Say;
  key: Say;
  /** When there is nothing to do here: the next thing he can get. */
  next: { prefix: string; deck: string; things: Record<string, string> };
}

export const LINES: Lines = {
  start: ['THE CAPTAINS SOUL IS BOUND TO THIS SHIP', 'HIS CABIN IS SEALED. I MUST FIND THE WAY IN'],
  doorSeen: 'A SEALED DOOR. FOUR MARKS UPON IT',
  pieceRemain: { 3: 'ONE PIECE OF THE CHART. THREE REMAIN', 2: 'ONE PIECE OF THE CHART. TWO REMAIN', 1: 'ONE PIECE OF THE CHART. ONE REMAINS' },
  chartWhole: 'THE CHART IS WHOLE. THE DOOR STANDS OPEN',

  sword: { room: 'A BLADE GLEAMS IN THE DARK', taken: 'AN ENCHANTED SWORD. IT CUTS WHAT STEEL CANNOT' },

  bell: { room: 'SOMETHING RINGS FAINTLY WITHIN THE WALL', taken: 'A BELL. WITH BOOK AND CANDLE IT CAN LAY A SPIRIT TO REST' },
  book: {
    locked: 'THE BOOK IS LOCKED AWAY',
    nowCandle: 'THE BOOK OF THE RITE. NOW THE CANDLE',
    needsBell: 'THE BOOK OF THE RITE. THE RITE BEGINS WITH THE BELL',
  },
  candle: {
    early: 'A CANDLE. THE RITE NEEDS BELL AND BOOK',
    needsBell: 'A CANDLE. THE RITE NEEDS THE BELL',
    needsBook: 'A CANDLE. THE RITE NEEDS THE BOOK',
  },
  riteComplete: 'BELL, BOOK AND CANDLE. THE RITE IS COMPLETE',
  guard: {
    refuse: 'STEEL ALONE WILL NOT LAY THIS ONE TO REST',
    ready: 'NOW. STRIKE IT DOWN',
    done: 'IT IS AT PEACE. THE CHART PIECE IS MINE',
  },

  chart: { without: 'A CHART I CANNOT READ. I NEED A NAVIGATORS TOOLS', done: 'THE CHART GIVES UP ITS SECRET' },
  tool: { telescope: 'A TELESCOPE', sextant: 'A SEXTANT', compass: 'A COMPASS' },
  toolCount: { 1: 'A NAVIGATOR WOULD NEED MORE', 2: 'ONE MORE TOOL', 3: 'NOW I CAN READ THE CHART' },

  sirens: { without: 'THE SIRENS GUARD IT. THEY WANT SOMETHING', ready: 'COMB AND MIRROR. GO TO THEM', done: 'VANITY WINS. THEY LET THE CHART FALL' },
  comb: 'A COMB. FIT FOR A SIRENS HAIR',
  mirror: { room: 'SOMETHING GLINTS AMONG THE SACKS', found: 'A MIRROR. LET IT CATCH THE LIGHT', used: 'THERE. NOW IT SHINES' },

  shelf: { room: 'SOMETHING IS TUCKED AWAY ON THAT SHELF', struck: 'IT FALLS' },

  captain: { room: ['CAVENDISH. BOUND BY THE SKULL', 'ONE CLEAN BLOW WILL FREE HIM'], end: 'REST NOW, CAPTAIN' },
  trapdoor: 'THE BOARDS GAVE WAY BENEATH ME',

  gunpowder: 'GUNPOWDER. A CANNON WOULD WANT IT',
  cannon: { without: 'A CANNON. IT WANTS POWDER', loaded: 'POWDER FOR THE CANNON. TOUCH IT TO FIRE' },
  anchor: 'AN ANCHOR. IT MAY HOOK SOMETHING OUT OF REACH',
  seaweed: 'SEAWEED. SOMETHING IN A SHELL WANTS IT',
  oyster: 'THE OYSTER CLOSES. IT WANTS SEAWEED',
  pearl: 'A PEARL. IT MAY PROTECT ME',
  drain: 'THIS PLACE DRAINS MY STRENGTH',
  skull: { taken: 'A SKULL. IT WANTS ITS CROSSBONES', both: 'SKULL AND CROSSBONES. NOW THE KEY' },
  crossbones: { taken: 'CROSSBONES. THEY WANT A SKULL', both: 'SKULL AND CROSSBONES. NOW THE KEY' },
  keyRoom: 'SOMETHING GUARDS THE KEY',
  key: 'A KEY. NOW THE BOOK CAN BE FREED',

  next: {
    prefix: 'NEXT:',
    deck: 'DECK',
    things: {
      sword: 'THE SWORD',
      shelf: 'THE CHART ON THE SHELF',
      telescope: 'THE TELESCOPE',
      sextant: 'THE SEXTANT',
      compass: 'THE COMPASS',
      chart: 'THE CHART TO READ',
      bell: 'THE BELL',
      seaweed: 'SEAWEED',
      pearl: 'THE PEARL',
      skull: 'THE SKULL',
      crossbones: 'THE CROSSBONES',
      key: 'THE KEY',
      book: 'THE BOOK',
      candle: 'THE CANDLE',
      guard: 'THE GUARDED CHART',
      gunpowder: 'GUNPOWDER',
      anchor: 'THE ANCHOR',
      comb: 'THE COMB',
      mirror: 'THE MIRROR',
      mirrorWait: 'WAIT WITH THE MIRROR',
      sirens: 'THE SIRENS CHART',
      captain: 'THE CAPTAINS CABIN',
      doubloons: 'DOUBLOONS',
      bucket: 'THE BUCKET',
      water: 'WATER',
    },
  },
};
