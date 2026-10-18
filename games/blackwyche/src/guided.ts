import { Narrator, type StatusLine } from '../../shared/native/narrate';
import { spriteSpot } from '../../shared/native/spots';
import { pendragonCode as code } from '../../shared/pendragon/status';
import { CABINS, HALLS } from './ship';
import { LINES, type Say } from './guided-lines';

/**
 * GUIDED, an ENHANCED assist of Blackwyche: the puzzles told, not hidden. Pendragon says what he
 * makes of things in the first person on the game's status line (the line that says SEARCHING FOR
 * THE CAPTAINS SOUL, in the game's own lettering: games/shared/native/narrate.ts; the words are
 * in src/guided-lines.ts), and sparkles mark what he can take now, exactly where its sprite is
 * (the shared hints: play.ts `hints`), on a creature or a guard when it is his move.
 *
 * What the game itself asks for (checked against each room's block, re/README.md "Things to
 * find"): THINGS below. Nothing here touches what the game does: it only reads memory, and
 * writes the status line's text.
 */

// ---- what the game keeps (re/README.md, src/items.ts) ----

/** The found flags ($9D60-$9D79: 1 taken, the mirror 2 once used) and the magic sword's. */
export const FLAG = {
  gunpowder: 0x9d60, bell: 0x9d61, book: 0x9d62, candle: 0x9d63,
  piece1: 0x9d64, piece2: 0x9d65, piece3: 0x9d66, piece4: 0x9d79,
  key: 0x9d67, seaweed: 0x9d68, pearl: 0x9d69, doubloons1: 0x9d6a, doubloons2: 0x9d6c,
  skull: 0x9d6d, crossbones: 0x9d6e, anchor: 0x9d6f,
  telescope: 0x9d70, sextant: 0x9d71, compass: 0x9d72,
  mirror: 0x9d73, comb: 0x9d74, water: 0x9d75, bucket: 0x9d76,
  sword: 0x342b,
};
const FLAGS = Object.values(FLAG);

const has = (ram: Uint8Array, flag: number) => ram[flag] !== 0;
const all = (ram: Uint8Array, ...flags: number[]) => flags.every((f) => ram[f] !== 0);
const PIECES = [FLAG.piece1, FLAG.piece2, FLAG.piece3, FLAG.piece4];
const TOOLS = [FLAG.telescope, FLAG.sextant, FLAG.compass];
const RITE = [FLAG.bell, FLAG.book, FLAG.candle];
const count = (ram: Uint8Array, flags: number[]) => flags.filter((f) => ram[f] !== 0).length;

/** The room he is in ($341C), 0 on a deck (a hall or a cabin sets $342E). */
export const roomOf = (ram: Uint8Array) => (ram[0x342e] ? ram[0x341c] : 0);
/** The game's collision register as the room's code kept it this frame ($3414), for two sprites. */
const touching = (ram: Uint8Array, a: number, b: number) => (ram[0x3414] & ((1 << a) | (1 << b))) === ((1 << a) | (1 << b));

/**
 * A thing to get: where, whether it is his, what the game asks of him first (`ready`: checked
 * against the room's code), and which sprites to mark when it is there to take (read only while
 * he is in its room: the room's own variables are in memory then).
 */
interface Thing {
  /** Its name in LINES.next.things. */
  id: string;
  room: number;
  taken(ram: Uint8Array): boolean;
  ready(ram: Uint8Array): boolean;
  /** The VIC sprites to mark (none: nothing to mark, only to say). */
  sprites(ram: Uint8Array): number[];
}

const thing = (id: string, room: number, flag: number, sprite: number | number[], ready: (ram: Uint8Array) => boolean = () => true): Thing => ({
  id, room, taken: (ram) => has(ram, flag), ready, sprites: () => (typeof sprite === 'number' ? [sprite] : sprite),
});

/**
 * Everything to get, in the order to suggest it (a thing's prerequisites come before it). Where the
 * sprite is, from each room's block ($6003 sets them up): the sword, seaweed and the water's bucket
 * lie at the front of their cabins; the guard's rite wants bell, book and candle, the chart in
 * the hall the three tools, the key the skull and crossbones, the book the key, the pearl the
 * seaweed, the comb the anchor, the water the bucket, the sirens' piece the comb and the mirror
 * used, the captain the four pieces.
 */
export const THINGS: readonly Thing[] = [
  thing('sword', 2, FLAG.sword, 0),
  // the shelf's piece: the sword strikes it ($638F in room 4 goes to 1 and it falls)
  thing('shelf', 4, FLAG.piece1, 6, (r) => has(r, FLAG.sword)),
  thing('telescope', 0x0a, FLAG.telescope, 4), // (jump into it: $61BA wants $3427 = 1)
  thing('sextant', 0x0d, FLAG.sextant, 4),
  thing('compass', 0x0b, FLAG.compass, 7),
  thing('chart', 0x11, FLAG.piece2, 4, (r) => all(r, ...TOOLS)),
  thing('bell', 0x15, FLAG.bell, 4, (r) => has(r, FLAG.sword)),
  thing('seaweed', 5, FLAG.seaweed, 0),
  thing('pearl', 0x14, FLAG.pearl, 4, (r) => has(r, FLAG.seaweed)),
  thing('skull', 0x0e, FLAG.skull, 6),
  thing('crossbones', 0x13, FLAG.crossbones, 6),
  thing('key', 0x0f, FLAG.key, 6, (r) => all(r, FLAG.skull, FLAG.crossbones)),
  thing('book', 0x10, FLAG.book, 4, (r) => has(r, FLAG.key)), // (the game doesn't ask for the bell: a NOP where it would, $60D0)
  thing('candle', 0x16, FLAG.candle, 4),
  {
    // the guard: struck sixteen frames of contact with the rite complete ($631C reaches $FF), then the piece
    id: 'guard', room: 0x12, taken: (r) => has(r, FLAG.piece3), ready: (r) => all(r, ...RITE),
    sprites: (r) => (r[0x631c] === 0xff ? [6] : [4]),
  },
  thing('gunpowder', 3, FLAG.gunpowder, 1),
  {
    // the anchor: the cannon (sprite 0) touched with the powder in hand fires ($6252 goes to 2), the chest blows ($6255 to 2), then the anchor is his
    id: 'anchor', room: 7, taken: (r) => has(r, FLAG.anchor), ready: (r) => has(r, FLAG.gunpowder),
    sprites: (r) => (r[0x6255] === 2 ? [1] : r[0x6252] === 2 ? [] : [0]),
  },
  thing('comb', 9, FLAG.comb, 4, (r) => has(r, FLAG.anchor)),
  thing('mirror', 8, FLAG.mirror, 4, (r) => has(r, FLAG.sword)),
  // the mirror taken must stay 128 frames in its room to be used ($9D73 goes to 2)
  { id: 'mirrorWait', room: 8, taken: (r) => r[FLAG.mirror] === 2, ready: (r) => r[FLAG.mirror] === 1, sprites: () => [] },
  // the sirens: both of them and the chart piece touched at once, the comb in hand and the mirror used ($3414 = $54)
  thing('sirens', 0x17, FLAG.piece4, [4, 6], (r) => has(r, FLAG.comb) && r[FLAG.mirror] === 2),
  // the captain: one blow of the sword with the four pieces found (the door opens: $1289)
  { id: 'captain', room: 0x0c, taken: (r) => r[0x342c] === 2, ready: (r) => has(r, FLAG.sword) && all(r, ...PIECES), sprites: () => [4] },
  // (not for any puzzle: the doubloons give his strength back; the bucket and the water put out a fire)
  thing('doubloons', 6, FLAG.doubloons1, 1),
  thing('doubloons', 0x1e, FLAG.doubloons2, 1),
  thing('bucket', 0x20, FLAG.bucket, 1),
  thing('water', 0x1f, FLAG.water, 4, (r) => has(r, FLAG.bucket)),
];

/** The deck a room is on (its cabin's or hall's). */
export function deckOf(room: number) {
  return CABINS.find((c) => c.room === room)?.deck ?? HALLS.find((h) => h.room === room)?.deck ?? 0;
}

/** What he can get now in this room (not taken, and what the game wants of him first in hand). */
export const hereNow = (ram: Uint8Array) => THINGS.filter((t) => t.room === roomOf(ram) && !t.taken(ram) && t.ready(ram));

/** The next thing to get from anywhere: the first of THINGS he can get now (null: nothing left). */
export function nextThing(ram: Uint8Array) {
  return THINGS.find((t) => !t.taken(ram) && t.ready(ram)) ?? null;
}

// ---- where the sparkles go ----

// (the middle of a sprite's pixels: games/shared/native/spots.ts, shared with The Staff of Karnath's hints)
export { spriteSpot };

/** The sparkles (play.ts `hints`): on what he can take now in this room, where its sprite is. */
export function guidedSpots(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  for (const t of hereNow(ram)) {
    for (const n of t.sprites(ram)) {
      const s = spriteSpot(ram, vic, n);
      if (s) spots.push(s);
    }
  }
  return spots;
}

// ---- the status line ----

/**
 * Where the game keeps its own message ($0773, 32 characters: SEARCHING FOR THE CAPTAINS SOUL, drawn
 * from the table at $6D0B, $3418 saying which). A thing found puts "YOU HAVE FOUND ..." there for 160
 * frames ($3419 counts them, $341A is the timer), and the sword not yet found a message of its own
 * for 48 ($1515): `busy`. Setting $3418 to 1 has the game draw its own line again.
 */
export const STATUS: StatusLine = {
  at: 0x0773,
  width: 32,
  busy: (ram) => ram[0x3419] !== 0 || ram[0x3418] !== 0 || ram[0x1515] !== 0,
  code,
  blank: 0x20,
  restore: (ram) => { ram[0x3418] = 1; },
};

// ---- what he says, and when ----

/** What's noted of the game each frame, to see what changed. */
interface Snap {
  room: number;
  flags: number[];
  /** A trapdoor is giving way ($342A). */
  falling: boolean;
  /** The shelf piece struck ($638F in room 4's block). */
  struck: boolean;
  /** The captain's end under way ($633B in room $C's block). */
  ending: boolean;
}

function snapshot(ram: Uint8Array): Snap {
  const room = roomOf(ram);
  return {
    room, flags: FLAGS.map((f) => ram[f]),
    falling: ram[0x342a] !== 0,
    struck: room === 4 && ram[0x638f] >= 1,
    ending: room === 0x0c && ram[0x633b] >= 1,
  };
}

/** Frames with no new line after which he names what to do next (about 20 seconds). */
export const IDLE_FRAMES = 1000;
/** Frames before the same thing said by touching it is said again. */
const AGAIN_FRAMES = 700;

export class Guide {
  readonly narrator = new Narrator(STATUS);
  private ram: Uint8Array | null = null;
  private prev: Snap | null = null;
  private frames = 0;
  private said = new Map<string, number>();
  private doorSeen = false;

  /** One frame of play (call after the game's frame): `on` while GUIDED is on and the game is being played. */
  frame(ram: Uint8Array, on: boolean) {
    if (!on) { this.narrator.frame(ram, false); this.prev = null; return; }
    this.frames++;
    const now = snapshot(ram);
    if (!this.prev || this.ram !== ram) {
      // a new game, a save continued, back to the room start: begin again here
      this.ram = ram; this.said.clear(); this.doorSeen = false;
      this.narrator.reset(ram);
      this.begin(ram, now);
    } else {
      this.changes(ram, this.prev, now);
      this.touches(ram, now);
      this.deck(ram);
    }
    this.prev = now;
    this.idle(ram, now);
    this.narrator.frame(ram, true);
  }

  private say(texts: Say, ram?: Uint8Array, room?: number) {
    this.narrator.say(texts, ram && room !== undefined ? () => roomOf(ram) === room : undefined);
  }

  /** Say it unless it was said lately (`key`: what it is about). */
  private sayAgain(key: string, texts: Say, ram: Uint8Array, room: number) {
    const last = this.said.get(key);
    if (last !== undefined && this.frames - last < AGAIN_FRAMES) return;
    this.said.set(key, this.frames);
    this.say(texts, ram, room);
  }

  /** The first frame seen: the story's start (on deck 1, nothing found yet), and where he is. */
  private begin(ram: Uint8Array, now: Snap) {
    if (now.room === 0 && ram[0x9d78] === 1 && FLAGS.every((f) => ram[f] === 0)) this.say(LINES.start);
    if (now.room) this.enter(ram, now.room);
  }

  /** Coming into a room: what it holds, if it holds anything yet to do (said while he's still there and it is still to do). */
  private enter(ram: Uint8Array, room: number) {
    const rite = all(ram, ...RITE);
    const hint = (texts: Say, over: () => boolean) => this.narrator.say(texts, () => roomOf(ram) === room && !over());
    const gone = (...flags: number[]) => () => all(ram, ...flags);
    switch (room) {
      case 2: if (!has(ram, FLAG.sword)) hint(LINES.sword.room, gone(FLAG.sword)); break;
      case 4: if (!has(ram, FLAG.piece1)) hint(LINES.shelf.room, gone(FLAG.piece1)); break;
      case 7: if (!has(ram, FLAG.anchor)) hint(has(ram, FLAG.gunpowder) ? LINES.cannon.loaded : LINES.cannon.without, gone(FLAG.anchor)); break;
      case 8: if (!has(ram, FLAG.mirror)) hint(LINES.mirror.room, gone(FLAG.mirror)); break;
      case 0x0e: if (!has(ram, FLAG.pearl)) hint(LINES.drain, gone(FLAG.pearl)); break;
      case 0x0f: if (!has(ram, FLAG.key) && !all(ram, FLAG.skull, FLAG.crossbones)) hint(LINES.keyRoom, gone(FLAG.skull, FLAG.crossbones)); break;
      case 0x11: if (!has(ram, FLAG.piece2) && !all(ram, ...TOOLS)) this.sayAgain('chart', LINES.chart.without, ram, room); break;
      case 0x12: if (!has(ram, FLAG.piece3)) { if (rite) hint(LINES.guard.ready, gone(FLAG.piece3)); else this.sayAgain('guard', LINES.guard.refuse, ram, room); } break;
      case 0x15: if (!has(ram, FLAG.bell)) hint(LINES.bell.room, gone(FLAG.bell)); break;
      case 0x17: if (!has(ram, FLAG.piece4)) hint(has(ram, FLAG.comb) && ram[FLAG.mirror] === 2 ? LINES.sirens.ready : LINES.sirens.without, gone(FLAG.piece4)); break;
      case 0x0c: if (ram[0x342c] !== 2) hint(LINES.captain.room, () => ram[0x633b] >= 1); break;
      default: break;
    }
  }

  /** What changed since the last frame: rooms entered, things taken. */
  private changes(ram: Uint8Array, prev: Snap, now: Snap) {
    if (now.room && now.room !== prev.room) this.enter(ram, now.room);
    if (now.falling && !prev.falling) this.narrator.sayNow(LINES.trapdoor);
    if (now.struck && !prev.struck) this.narrator.sayNow(LINES.shelf.struck);
    if (now.ending && !prev.ending) this.narrator.sayNow(LINES.captain.end);
    FLAGS.forEach((flag, i) => {
      const was = prev.flags[i], is = now.flags[i];
      if (was !== is && is !== 0) this.took(ram, flag, was);
    });
  }

  /** A found flag went up (`was`: what it was). */
  private took(ram: Uint8Array, flag: number, was: number) {
    const F = FLAG, L = LINES;
    const pieces = count(ram, PIECES);
    const piece = (done?: Say) => {
      if (done) this.say(done);
      this.say(pieces >= 4 ? L.chartWhole : pieces === 3 ? L.pieceRemain[1] : pieces === 2 ? L.pieceRemain[2] : L.pieceRemain[3]);
    };
    const rite = all(ram, ...RITE);
    switch (flag) {
      case F.sword: this.say(L.sword.taken); break;
      case F.bell: this.say(rite ? L.riteComplete : L.bell.taken); break;
      case F.book: this.say(rite ? L.riteComplete : has(ram, F.bell) ? L.book.nowCandle : L.book.needsBell); break;
      case F.candle: this.say(rite ? L.riteComplete : !has(ram, F.bell) && !has(ram, F.book) ? L.candle.early : !has(ram, F.bell) ? L.candle.needsBell : L.candle.needsBook); break;
      case F.piece1: piece(); break;
      case F.piece2: piece(L.chart.done); break;
      case F.piece3: piece(L.guard.done); break;
      case F.piece4: piece(L.sirens.done); break;
      case F.telescope: case F.sextant: case F.compass: {
        const n = count(ram, TOOLS);
        const name = flag === F.telescope ? L.tool.telescope : flag === F.sextant ? L.tool.sextant : L.tool.compass;
        this.say(`${name}. ${n >= 3 ? L.toolCount[3] : n === 2 ? L.toolCount[2] : L.toolCount[1]}`);
        break;
      }
      case F.comb:
        this.say(L.comb);
        if (ram[F.mirror] === 2) this.say(L.sirens.ready);
        break;
      case F.mirror:
        if (was === 0) this.say(L.mirror.found);
        else {
          this.say(L.mirror.used);
          if (has(ram, F.comb)) this.say(L.sirens.ready);
        }
        break;
      case F.gunpowder: this.say(L.gunpowder); break;
      case F.seaweed: this.say(L.seaweed); break;
      case F.pearl: this.say(L.pearl); break;
      case F.skull: this.say(has(ram, F.crossbones) ? L.skull.both : L.skull.taken); break;
      case F.crossbones: this.say(has(ram, F.skull) ? L.crossbones.both : L.crossbones.taken); break;
      case F.key: this.say(L.key); break;
      case F.anchor: this.say(L.anchor); break;
      default: break; // (doubloons, the bucket, the water: nothing to say)
    }
  }

  /** What he touches in the room (the game's collision register for the frame, $3414). */
  private touches(ram: Uint8Array, now: Snap) {
    const room = now.room;
    if (!room) return;
    if (room === 0x10 && !has(ram, FLAG.key) && !has(ram, FLAG.book) && touching(ram, 2, 4)) this.sayAgain('book', LINES.book.locked, ram, room);
    if (room === 0x11 && !has(ram, FLAG.piece2) && !all(ram, ...TOOLS) && touching(ram, 2, 4)) this.sayAgain('chart', LINES.chart.without, ram, room);
    if (room === 0x14 && !has(ram, FLAG.seaweed) && !has(ram, FLAG.pearl) && touching(ram, 2, 6) && ram[0x3420] < 0x9a) this.sayAgain('oyster', LINES.oyster, ram, room);
    if (room === 0x12 && !has(ram, FLAG.piece3) && !all(ram, ...RITE) && touching(ram, 2, 4)) this.sayAgain('guard', LINES.guard.refuse, ram, room);
  }

  /** On deck 5, in sight of where the captain's door will be while it is wall. */
  private deck(ram: Uint8Array) {
    if (this.doorSeen || ram[0x342e] !== 0 || ram[0x9d78] !== 5 || ram[0x1ecd] !== 0) return;
    if (count(ram, PIECES) >= 4 || ram[0x6e8c] === 0x73) return; // (open, or about to be: the game puts the door there ($1289) as he goes on)
    if (ram[0x1f87] !== 1 && ram[0x1f88] !== 1) return;
    this.doorSeen = true;
    this.say(LINES.doorSeen);
  }

  /** Nothing said for a while, nothing here to do: what to do next. */
  private idle(ram: Uint8Array, now: Snap) {
    if (this.narrator.idle < IDLE_FRAMES || this.narrator.busy) return;
    if (now.room && hereNow(ram).some((t) => t.sprites(ram).length > 0)) return; // (the sparkles are showing him)
    const next = nextThing(ram);
    if (!next) return;
    const name = LINES.next.things[next.id];
    if (name === undefined) return;
    const deck = deckOf(next.room);
    this.narrator.say(`${LINES.next.prefix} ${name} ${deck ? `${LINES.next.deck} ${deck}` : ''}`.trim());
  }
}
