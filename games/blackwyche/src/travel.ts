import { call, rd, wr } from '../../shared/native/cpu';
import * as engine from './gen/engine';
import { HALLS } from './ship';

/**
 * Travel back to a place Pendragon has been (the pause map), the game's own way, anywhere on
 * the ship: the five decks' two long parts, the halls between their ends, and the cabins.
 *
 * Where he is (re/README.md, "The ship"): the deck $9D78 (1-5) and its part $1ECD (0 and 1 the
 * long parts, 2 and 3 the halls); in a hall or cabin $342E is set and $341C is its room; in a
 * cabin $1EE5 is the door he's behind ($10A7 notes it; $1F88 is which of the cabin's screens he's on). Each hall and cabin brings its block of code,
 * which the game swaps into $6000 ($11CD, from where the table at $9D7A keeps it) and the
 * character set ($1082, $3800 <-> $B800); the blocks are kept overlapping, so swaps only undo
 * newest first. The game itself always swaps the old block back out before it swaps the next in
 * (a door out, a ladder, a trapdoor: $11CD twice), so the chain of blocks in is at most one deep;
 * the map keeps it as it watches play (`chain`) and travel undoes it newest first, refusing if
 * the decks' own block doesn't come back. Between deck 1 and the rest the game also swaps the
 * deck pictures ($131F, from $116C/$1182), and sets the deck's colours ($1193).
 *
 * Going: out of where he is as the game leaves it (a cabin by its door, $253F; a hall onto the
 * deck, $2662), the remaining swaps undone newest first, onto the target's deck as the game
 * changes decks; then in, as the game goes in: onto a deck as a game starts ($2A8F the deck's
 * panels, $0D03 drawn, $6003 its creatures), into a hall from the deck's end ($2482: $2A8F,
 * $1082, $148D, $11CD), into a cabin through its door ($2648: $1082, $10A7, $11CD); then his
 * place as it was when he first stood there. Energy, time, the things found ($9D60-$9D79) and
 * everything in the blocks (swapped, never copied) are left as they are.
 */

/** Where he stands and how the strip is scrolled: noted on first standing in a place, put back on going there. */
export const DECK: number[] = [
  0x1f87, 0x1f88, 0x1f82, 0x1531, 0x1532, 0x152f, 0x1530, 0x1533, 0x1534, 0x1535, 0x1536, 0x1537, // the panel, the scroll
  0x1514, 0x1521, 0x1540, 0x1541, 0x1543, 0x1544, 0x1545, 0x1546, 0x1f6e, 0x1f6f, // (his place along it)
  0x216f, 0x2179, 0x341f, 0x3420, 0x3412, 0x3413, // his sprite: x, y, which way
  0x2175, 0x2176, 0x2177, 0x2178, 0x1ebd, 0x3429, 0x153b, 0x153c, 0x1f67, // (which ways he's stopped; where his feet are)
  ...Array.from({ length: 13 }, (_, i) => 0x217a + i), ...Array.from({ length: 22 }, (_, i) => 0x1eea + i), // the steps and frames of the way he's going ($19C3)
];

/** A place on the ship. */
export type Place =
  | { kind: 'deck'; deck: number; part: number }
  | { kind: 'hall'; deck: number; part: number }
  | { kind: 'cabin'; deck: number; part: number; door: number };

/** A place's name on the map (and in what's been found). */
export const placeId = (p: Place) => (p.kind === 'deck' ? `D${p.deck}.${p.part}` : p.kind === 'hall' ? `H${p.deck}.${p.part}` : `C${p.deck}.${p.part}.${p.door}`);

/** Not in the middle of something: playing, not losing, climbing, falling, jumping, striking or going through a door. */
export const settled = (ram: Uint8Array) =>
  ram[0x1519] === 0 && ram[0x342c] === 0 && ram[0x1ec7] === 0 && ram[0x342a] === 0 && ram[0x3427] === 0 && ram[0x1ed0] === 0 && ram[0x151f] === 0;

const jumpAt6000 = (ram: Uint8Array) => (ram[0x6000] === 0x4c ? ram[0x6001] | (ram[0x6002] << 8) : -1);
/** The decks' own block's first jump. */
const DECK_JUMP = 0x60e6;
/** Where the table at $9D7A keeps a room's block. */
const homeOf = (ram: Uint8Array, room: number) => ram[0x9d7a + 2 * (room - 1)] | (ram[0x9d7b + 2 * (room - 1)] << 8);
/** The first jump of a room's block where it's kept (its own code, when it's home). */
const homeJump = (ram: Uint8Array, room: number) => { const h = homeOf(ram, room); return ram[h] === 0x4c ? ram[h + 1] | (ram[h + 2] << 8) : -1; };
/** Rooms with no block of their own ($11CD swaps nothing for them). */
const NO_BLOCK = 0x22;

/** Where he is now (null: between places, or not playing). */
export function where(ram: Uint8Array): Place | null {
  const deck = ram[0x9d78], part = ram[0x1ecd];
  if (deck < 1 || deck > 5 || part > 3) return null;
  if (!ram[0x342e]) return part < 2 ? { kind: 'deck', deck, part } : null;
  if (part >= 2) return HALLS.some((h) => h.deck === deck && h.part === part && h.room === ram[0x341c]) ? { kind: 'hall', deck, part } : null;
  // a cabin: behind the door he came in at, or under or over it ($10A7 notes it; in a cabin $1F88 is the screen he's on).
  // (A way down or up from a cabin with no cabin there, $9DC2 choosing none, keeps the room and its block: $1360.)
  const door = ram[0x1ee5];
  return door < 9 ? { kind: 'cabin', deck, part, door } : null;
}

/** Which place a location is (decks: 0x80 + deck * 4 + part; halls and cabins: their room). */
export function place(ram: Uint8Array) {
  return ram[0x342e] ? ram[0x341c] : 0x80 + ram[0x9d78] * 4 + ram[0x1ecd];
}

/**
 * The chain of blocks swapped in over the decks' own (rooms, oldest first), as play goes:
 * kept by the map each frame from the room he's in. On a deck it's empty.
 */
export function followChain(ram: Uint8Array, chain: number[]) {
  if (!ram[0x342e]) { chain.length = 0; return; }
  const room = ram[0x341c];
  if (chain[chain.length - 1] === room) return;
  // Its block came in over the decks' own (kept now where it's kept: the game swapped the last
  // one out first, as it always does), or over the last one's (kept, still in, under it).
  const overDecks = room === NO_BLOCK ? jumpAt6000(ram) === DECK_JUMP : homeJump(ram, room) === DECK_JUMP;
  if (overDecks) chain.length = 0;
  chain.push(room);
}

/** Where he is, for coming back to: [kind (0 deck, 1 cabin, 2 hall), deck, part, (door, room, picture,) ...DECK, his sprite's high x]; null if not settled. */
export function location(ram: Uint8Array, vic: Uint8Array): number[] | null {
  const p = where(ram);
  if (!p || !settled(ram)) return null;
  const at = [...DECK.map((a) => ram[a]), vic[0x10] & 4];
  return p.kind === 'deck' ? [0, p.deck, p.part, ...at] : p.kind === 'hall' ? [2, p.deck, p.part, ...at] : [1, p.deck, p.part, p.door, ram[0x341c], ram[0x1ecf], ...at];
}

/** What a location says: the place, and his place there. */
function parse(to: number[]): { place: Place; at: number[]; room: number; picture: number } | null {
  const [kind, deck, part] = to;
  if (!(deck >= 1 && deck <= 5)) return null;
  if (kind === 0 && to.length === DECK.length + 4 && part < 2) return { place: { kind: 'deck', deck, part }, at: to.slice(3), room: 0, picture: 0 };
  if (kind === 2 && to.length === DECK.length + 4 && HALLS.some((h) => h.deck === deck && h.part === part)) return { place: { kind: 'hall', deck, part }, at: to.slice(3), room: 0, picture: 0 };
  if (kind === 1 && to.length === DECK.length + 7 && part < 2 && to[3] < 9 && to[4] >= 1 && to[4] <= 0x24) return { place: { kind: 'cabin', deck, part, door: to[3] }, at: to.slice(6), room: to[4], picture: to[5] };
  return null;
}

/**
 * Alive: not losing (energy gone, the death under way). Anything else he may be in the middle of (a jump, a
 * strike, a climb, a fall through a trapdoor) is left with the place: travel starts from there, and he arrives
 * as he did when he was noted, settled.
 */
const alive = (ram: Uint8Array) => ram[0x1519] === 0 && ram[0x342c] === 0;

/** Whether travel can start from here: alive, in a place, with the blocks the chain says are in. */
export function canTravel(ram: Uint8Array, chain: number[] = []) {
  const p = where(ram);
  if (!p || !alive(ram)) return false;
  if (p.kind === 'deck') return jumpAt6000(ram) === DECK_JUMP;
  // the chain the map kept (or, without one, the room he's in alone): the oldest block in it holds the decks' own where it's kept
  const blocks = chain[chain.length - 1] === ram[0x341c] ? chain : [ram[0x341c]];
  const first = blocks.find((r) => r !== NO_BLOCK);
  return first === undefined ? jumpAt6000(ram) === DECK_JUMP : homeJump(ram, first) === DECK_JUMP;
}

/** Out of a cabin onto the deck, as the game leaves one by its door ($253F). */
function leaveCabin(ram: Uint8Array) {
  const x = ram[0x1ee1];
  ram[0x1f8c + x] = ram[0x1ee2]; ram[0x1f8d + x] = ram[0x1ee3]; ram[0x1f8e + x] = ram[0x1ee4];
  ram[0x1f88] = ram[0x1ee5]; ram[0x2170] = 0; ram[0x1f87] = ram[0x1f88];
  engine.r_1289(); engine.r_2add(); engine.r_1082(); engine.r_11cd(); engine.r_1468();
  ram[0x342e] = 0;
  engine.r_12d2(); engine.r_12ff();
  ram[0x216f] = 3; // (walked out, up through the door)
}

/** Out of a hall onto the deck, as the game leaves one at its end ($25F3: part 2 and 3 out to the end of part 0 or 1, then $2662). */
function leaveHall(ram: Uint8Array) {
  ram[0x1ecd] = ram[0x1ecd] === 2 ? 0 : 1; ram[0x1f88] = 8;
  engine.r_1289(); engine.r_2a8f(); engine.r_1082(); engine.r_11cd(); engine.r_12d2(); engine.r_12ff();
  ram[0x342e] = 0;
}

/**
 * Back to the decks' own block, the game's way: out of the place he's in as the game leaves it,
 * then any older swaps undone newest first. False (nothing changed) if that isn't certain.
 */
function toDecks(ram: Uint8Array, chain: number[]): boolean {
  if (!canTravel(ram, chain)) return false;
  const p = where(ram);
  if (!p || p.kind === 'deck') return true;
  const blocks = chain[chain.length - 1] === ram[0x341c] ? chain.slice() : [ram[0x341c]];
  if (p.kind === 'cabin') leaveCabin(ram); else leaveHall(ram);
  for (let i = blocks.length - 2; i >= 0; i--) { ram[0x341c] = blocks[i]; engine.r_11cd(); }
  chain.length = 0;
  return jumpAt6000(ram) === DECK_JUMP;
}

/** As far back as travel goes (the decks' own block in, the cabins and halls left as the game leaves them). For tests. */
export function toDeck(ram: Uint8Array) { const p = where(ram); if (p && p.kind !== 'deck') toDecks(ram, [ram[0x341c]]); }

/** Onto another deck (on a deck, the decks' own block in), as the game changes decks: the deck pictures for deck 1 or the rest ($131F), the colours ($1193). */
function toDeckNumber(ram: Uint8Array, deck: number) {
  if ((ram[0x9d78] === 1) !== (deck === 1)) engine.r_131f();
  ram[0x9d78] = deck;
  engine.r_1193();
}

/** Go to a place saved by `location` (in the main loop, between frames), with the chain the map keeps. False if it can't from here (nothing changed). */
export function go(ram: Uint8Array, to: number[], chain: number[] = []): boolean {
  const t = parse(to);
  if (!t || !canTravel(ram, chain)) return false;
  const here = where(ram);
  if (here && placeId(here) === placeId(t.place) && (t.place.kind === 'cabin' || ram[0x1f88] === t.at[DECK.indexOf(0x1f88)])) return true; // (there already)
  if (!toDecks(ram, chain)) return false;
  // (what he was in the middle of is over: jumping, striking, climbing, falling, a door; as in every place noted)
  for (const a of [0x1ec7, 0x342a, 0x3427, 0x1ed0, 0x151f]) ram[a] = 0;
  toDeckNumber(ram, t.place.deck);
  const put = () => DECK.forEach((a, i) => { ram[a] = t.at[i]; });
  const sprite = () => { wr(0xd004, ram[0x341f]); wr(0xd005, ram[0x3420]); wr(0xd010, (rd(0xd010) & ~4) | (t.at[DECK.length] ? 4 : 0)); };
  const { place: p } = t;
  if (p.kind === 'deck') {
    ram[0x1ecd] = p.part;
    engine.r_2a8f(); // (the part's panels)
    put();
    // drawn as at the start of a game ($0D03), in the deck's colours, the deck's creatures started ($6003)
    engine.r_0d03(); engine.r_1193();
    call(0x6003);
    sprite();
    return true;
  }
  if (p.kind === 'hall') {
    // in from the deck's end, as walking into it does ($2482)
    ram[0x1ecd] = p.part; ram[0x1f88] = t.at[DECK.indexOf(0x1f88)];
    engine.r_1289(); engine.r_2a8f(); engine.r_1082(); engine.r_148d(); engine.r_11cd(); engine.r_12d2();
    put(); sprite();
    return true;
  }
  // a cabin: at its door, and in, as walking into it does ($2648); $10A7 chooses the cabin by the
  // door ($9DC2), and where there's none (under or over a cabin) keeps the room and picture the
  // way down or up left ($1360), as they were
  ram[0x1ecd] = p.part;
  engine.r_2a8f(); // (the part's panels: the door's are kept for coming out)
  ram[0x1f88] = p.door; ram[0x1f87] = p.door;
  ram[0x341c] = t.room; ram[0x1ecf] = t.picture;
  engine.r_1289(); engine.r_1082(); engine.r_10a7(); engine.r_0e16(); engine.r_11cd(); engine.r_12d2();
  ram[0x1521] = 0;
  put(); sprite();
  return true;
}
