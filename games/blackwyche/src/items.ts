/**
 * What Pendragon has collected in Blackwyche, read from the game's own memory (re/README.md,
 * "Things to find"). The game shows only the last thing found (on the status line) and keeps
 * no list: each room's block sets a found flag when its thing is taken, and puts the thing's
 * number in $342F for the status line, which names it from the table at $9C38 (14 letters
 * each, in ASCII). The flags are $9D60-$9D79 (1 taken; 2 where the game goes on to use it:
 * the mirror $9D73, the water $9D75); the magic sword's is $342B.
 *
 * 24 things, 20 names: four pieces of map and two lots of doubloons. This lists them in
 * the order of the game's names, with where each one's flag is (test/items.ts checks each
 * against the code of the rooms that give it).
 */

/** Where the game keeps its table of the things' names, and how long each is. */
export const NAMES_AT = 0x9c38, NAME_LENGTH = 14;

/** A thing to find: which of the game's names it has (0-based), where its found flag is, and the room that gives it ($341C). */
export interface Item { name: number; flag: number; room: number }

export const ITEMS: readonly Item[] = [
  { name: 0, flag: 0x342b, room: 0x02 }, // the magic sword
  { name: 1, flag: 0x9d61, room: 0x15 }, { name: 2, flag: 0x9d62, room: 0x10 }, { name: 3, flag: 0x9d63, room: 0x16 }, // the bell, the book, the candle
  { name: 4, flag: 0x9d60, room: 0x03 }, // the gunpowder
  // the four pieces of map
  { name: 5, flag: 0x9d64, room: 0x04 }, { name: 5, flag: 0x9d65, room: 0x11 }, { name: 5, flag: 0x9d66, room: 0x12 }, { name: 5, flag: 0x9d79, room: 0x17 },
  { name: 6, flag: 0x9d67, room: 0x0f }, { name: 7, flag: 0x9d68, room: 0x05 }, { name: 8, flag: 0x9d69, room: 0x14 }, // the key, the seaweed, the pearl
  { name: 9, flag: 0x9d6a, room: 0x06 }, { name: 9, flag: 0x9d6c, room: 0x1e }, // the doubloons (two lots)
  { name: 10, flag: 0x9d6d, room: 0x0e }, { name: 11, flag: 0x9d6e, room: 0x13 }, { name: 12, flag: 0x9d6f, room: 0x07 }, // the skull, the crossbones, the anchor
  { name: 13, flag: 0x9d70, room: 0x0a }, { name: 14, flag: 0x9d71, room: 0x0d }, { name: 15, flag: 0x9d72, room: 0x0b }, // the telescope, the sextant, the compass
  { name: 16, flag: 0x9d73, room: 0x08 }, { name: 17, flag: 0x9d74, room: 0x09 }, // the mirror, the comb
  { name: 18, flag: 0x9d75, room: 0x1f }, { name: 19, flag: 0x9d76, room: 0x20 }, // the water, the bucket
];

/** The game's name for a thing ("A SMALL MIRROR"), as the status line says it. */
export function gameName(ram: Uint8Array, name: number) {
  let t = '';
  for (let i = 0; i < NAME_LENGTH; i++) t += String.fromCharCode(ram[NAMES_AT + name * NAME_LENGTH + i]);
  return t.trim();
}

/** The name for the pause screen: the game's, without its "A" or "SOME" ("SMALL MIRROR"). */
export const shortName = (ram: Uint8Array, name: number) => gameName(ram, name).replace(/^(A|SOME) /, '');

/** How a thing stands: not found, taken, or taken and used (where the game goes on to use it). */
export type Held = 'no' | 'have' | 'used';
export const held = (ram: Uint8Array, item: Item): Held => (ram[item.flag] === 0 ? 'no' : ram[item.flag] === 2 ? 'used' : 'have');

/** How many of the things have been found. */
export const itemsFound = (ram: Uint8Array) => ITEMS.filter((i) => held(ram, i) !== 'no').length;

/** The things a room gives, and how many of them are still to find. */
export function roomThings(ram: Uint8Array, room: number) {
  const here = ITEMS.filter((i) => i.room === room);
  return { all: here.length, left: here.filter((i) => held(ram, i) === 'no').length };
}
