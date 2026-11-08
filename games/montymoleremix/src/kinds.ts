/**
 * Which creature stands for each of Wanted's. A Wanted creature is four frames of 16 x 16 at an address (`SPRITE_BASE + 128 * kind`);
 * Monty on the Run has a bank of types of eight frames (frames 0-3 one way, 4-7 the other). Each of Wanted's 42 kinds is paired by hand
 * with the Monty on the Run creature that fits the room it lives in (what it is, and the sector: the mine, the pipes and water, the
 * caverns, the pit, the fire, the castle). Four animals that nothing in Monty on the Run's bank is (the duck, the dog, the squirrel and the
 * chess horse of the castle) keep Wanted's own frames, drawn in C64 colours the way the others are (`own`).
 */
import { SPRITE_BASE } from '../../montymole/src/data';

/** Monty on the Run's creature types (`enemyBank(type)`: 8 on), by what they are. */
const T = {
  boot: 8, mound: 9, eyeStalk: 10, knight: 11, mushroom: 12, smiley: 13, clock: 14, lamp: 16, hairy: 17, faceBox: 18, dish: 19, wasp: 20,
  oval: 21, ghost: 22, jelly: 23, kettle: 24, scarab: 25, cone: 26, hand: 27, cog: 29, spider: 30, fish: 31, plane: 32,
} as const;

/** What a Wanted kind is drawn as: a Monty on the Run type, or its own frames. */
export type Look = { readonly type: number } | { readonly own: true };
const as = (type: number): Look => ({ type });
const OWN: Look = { own: true };

/** Wanted's kinds (the address of a set of four frames) and what each is drawn as, with where Wanted has it. */
const LOOKS = new Map<number, Look>([
  [0x6000, as(T.kettle)], // a pot: the castle
  [0x6080, as(T.knight)], // a man: the pit head and the castle
  [0x6100, OWN], // a duck: the pit head
  [0x6180, OWN], // a dog: the pit head
  [0x6200, OWN], // a squirrel: the pit head
  [0x6380, as(T.cone)], // a bell: the mine
  [0x6400, as(T.lamp)], // a candle that walks: the mine
  [0x6480, as(T.hairy)], // a fence that spins into a diamond: the caverns
  [0x6500, as(T.dish)], // a rolling disc
  [0x6580, OWN], // a chess horse: the castle
  [0x6600, as(T.faceBox)], // a head: the castle
  [0x6680, as(T.kettle)], // a bottle: the castle
  [0x6700, as(T.kettle)], // a spray: the pit head and the castle
  [0x6780, as(T.eyeStalk)], // a balloon
  [0x6800, as(T.spider)], // a chomper: the mine
  [0x6880, as(T.mound)], // a chomper: the mine
  [0x6900, as(T.cog)], // a spiked ring
  [0x6980, as(T.smiley)], // a grinning ball
  [0x6a00, as(T.fish)], // a swimmer: the water rooms
  [0x6a80, as(T.faceBox)], // a sad face
  [0x6b80, as(T.ghost)],
  [0x6c00, as(T.ghost)],
  [0x6c80, as(T.jelly)], // a winged blob: the castle
  [0x6d00, as(T.wasp)], // a flier
  [0x6d80, as(T.scarab)], // an imp: the fire
  [0x6e00, as(T.oval)], // blobs
  [0x6e80, as(T.spider)], // bugs
  [0x6f00, as(T.wasp)], // what flies: the pickets
  [0x6f80, OWN], // the ferries: flat slabs that fly, the rooms' lakes are crossed by standing on them (`isFerry`), so what is drawn is what holds him
  [0x7000, as(T.plane)], // a pennant: the caverns
  [0x7080, as(T.fish)],
  [0x7100, as(T.fish)],
  [0x7180, as(T.ghost)],
  [0x7200, as(T.jelly)],
  [0x7280, as(T.hand)], // hooks and claws: the pipes
  [0x7300, as(T.wasp)], // a bat
  [0x7380, as(T.hand)],
  [0x7400, as(T.hand)],
  [0x7480, as(T.ghost)],
  [0x7600, as(T.spider)], // a hanging insect: the fire
  [0x7680, as(T.boot)], // legs: the pit
  [0x7700, as(T.cone)], // a flame: the pit
]);

/**
 * The kinds of creature that hold Monty up. In Wanted anything drawn under his feet holds him (the original reads the screen's bytes under
 * them), so a creature with pixels on its top row is a place to stand; the one the rooms need is the flat slab that flies along the pipe and
 * castle caverns' lakes (rooms 12 to 16), which is how a lake is crossed. These are drawn as Wanted draws them, so that the picture is what holds him.
 */
const FERRIES: ReadonlySet<number> = new Set([0x6f80]);
export const isFerry = (set: number): boolean => FERRIES.has(set);

/** The first frame address past Wanted's creatures (`$7780` is the blank frame). */
const END = 0x7780;

/** What the Wanted creature whose frames are at `set` is drawn as; null for a frame set that is blank or none. */
export function lookOfSet(set: number): Look | null {
  if (set < SPRITE_BASE || set >= END) return null;
  return LOOKS.get(set) ?? OWN;
}

/** Every kind the table names (the tests check it against the kinds the rooms use). */
export const NAMED_KINDS: readonly number[] = [...LOOKS.keys()];
