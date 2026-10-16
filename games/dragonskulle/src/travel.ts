import { wr } from '../../shared/native/cpu';
import * as engine from './gen/engine';

/**
 * Travel back to a screen Pendragon has been on (the pause map), the game's own way.
 *
 * The island is a grid of screens: 17 columns by 24 rows of the table at $6E20, each cell
 * the page of the picture drawn there (0: nothing). He's on column $20A8 of row $20A9 (the
 * row's cells are copied to $20AD). Some rows run on as one long place the screen scrolls
 * along (the beach, the corridors); the rest are a screen each. Each screen's code comes in a
 * block the game swaps into $6000 ($1137: the table at $9C02, by the block number $341C that
 * $0EB8 works out for the screen); unlike Blackwyche's, every change of screen swaps the old
 * block back out first and then the new one in, so nothing chains.
 *
 * Going: his place on the screen as he first came onto it is put back, then the screen is
 * changed as walking off an edge changes it ($25A7 and the like: the screen off, $11E5; the
 * old block out and the new screen worked out and drawn, $0EB8; the new block in, $0DAB and
 * $1137; the screen on, $120D). Energy, lives, score, what's been found and done ($3441 the
 * way into the caves, $342F/$3430 the shovel and cloak...) and everything in the blocks are
 * left as they are.
 */

/** Where he is on a screen (noted on first coming onto it, put back on going there). */
export const LOCATION: number[] = [
  0x20a8, 0x20a9, 0x20a7, // the column he's in, the row, the column the scroll starts at
  0x341d, 0x341e, // his sprite's x and y
  0x2292, 0x229c, 0x1281, 0x1282, // the way he faces (and his frames'), where his feet are looked at
  0x1279, 0x127a, 0x127b, 0x127c, 0x1284, // where he is on the screen's map of characters
];

/** In play, standing or walking (not jumping, striking, digging, losing a life). */
export const playing = (ram: Uint8Array) =>
  ram[0x3425] === 0 && ram[0x1fef] === 0 && ram[0x3428] === 0 && ram[0x125f] === 0 && ram[0x1249] === 0;

/** Where he is (the location bytes, and his sprite's high x bit), or null while it's no clean place to come back to. */
export function location(ram: Uint8Array, vic: Uint8Array): number[] | null {
  if (!playing(ram)) return null;
  return [...LOCATION.map((a) => ram[a]), vic[0x10] & 4 ? 1 : 0];
}

/** Go to a place saved by `location` (in the main loop, between frames). False if it can't from here. */
export function go(ram: Uint8Array, to: number[]): boolean {
  if (!playing(ram) || to.length !== LOCATION.length + 1) return false;
  LOCATION.forEach((a, i) => { ram[a] = to[i]; });
  wr(0xd004, ram[0x341d]); wr(0xd005, ram[0x341e]);
  // His sprite's high x bit as he came in; the others' cleared. The game never clears those: a change of
  // screen hides the old screen's sprites (their y at 0, $0FDE) and clears only his bit ($1002), and
  // some blocks place their sprites by the low byte alone (the shovel's room, $EF20: the ants, sprites
  // 4 and 5, and the shovel, 6). Walking in, the bits are what the screen next door left (clear, along
  // the routes); travelling, the screen left could be anywhere, its creatures past x 255 (Pendragon's
  // first screen in the caves, 1,1, does): the ants would be drawn 256 pixels right, off the screen.
  wr(0xd010, to[LOCATION.length] ? 4 : 0);
  // as walking off an edge does (each way but up, which needs it, says the way on is open: $25AA)
  ram[0x3441] = 1;
  engine.r_11e5(); engine.r_0eb8(); engine.r_0dab(); engine.r_1137(); engine.r_120d();
  return true;
}
