import { PORT_CREDITS } from '../../shared/ending/credits';
import { type EndingCharacter, type EndingScene, type EndingSpec, type EndingStep, type Way as Dir } from '../../shared/ending/machine-reel';
import { itemsFound, TOTAL } from './items';
import { MANSION } from './mansion';
import type { Jsw2Found } from './map';
import { WAYS, type Input } from './ending-ways';

/**
 * The ending's places and cast for Jet Set Willy II (games/shared/ending/ has the show). Every place is a room of the mansion
 * on a new game's memory, entered the game's own way (the way down from the room before: `$816C`, `$8063` as map travel does it), so its
 * guardians, ropes and conveyors are where the game has them, and Willy is steered by the joystick alone along a way found by playing
 * (re/ending/route.ts: Go-Explore from where he lands in the room, for the way that takes the room's items and runs about it without a
 * life lost; src/ending-ways.ts is what it wrote, and test/ending.ts walks each from the show's own start). The sources of the credit
 * lines: games/jsw2/re/credits.md.
 */

/** Lives are the bits of $8096 (a death shifts one out): the show keeps all eight. */
const LIVES = 0x8096;

/**
 * The room the game's own end comes to: room 136, "THE BEGINNING OF THE END", off the Bathroom's right exit, which nothing else leads to.
 * (re/README.md, "The ending".)
 */
export const END_ROOM = 136;

/** Frames of the game's own end shown in its last room before the reward begins (it stops there for good: its last screen is a loop). */
export const END_HOLD = 300;

/**
 * What the game itself treats as the end: Willy on the bed (the conveyor, tile type 3) in the Masters Bedroom with NEED items taken
 * ($8131/$8132, BCD: 160) makes the room's handler ($7315) jump through $01E0 to $7387, which puts him to bed and sleepwalks him through the
 * Top Landing and on to the Bathroom and room 136 (about 1,900 frames), where it loops for good. So the game is won when it has brought
 * him to that room: the reward begins END_HOLD frames after (`after` in main.ts), the game's own end seen first, not on coming into the
 * bedroom. Only that sequence leads to room 136.
 */
export const won = (ram: Uint8Array): boolean => ram[0x13] === END_ROOM;

/** Into a room the game's own way: the way down from the room he is in leads there, and he is at the bottom of it (what map travel does). */
export const room = (n: number) => (ram: Uint8Array): boolean => {
  if (!MANSION[n]) return false;
  ram[0x816c] = n;
  ram[0x8063] = 0xa2;
  return true;
};

/**
 * Put on his spot once the room is there: where the game notes he came in (`$82A8`...) and where he is, as map travel does it
 * (src/map.ts `observe`), not falling, and a fall begun before forgotten.
 */
export const stand = (n: number, [x, hi, y]: readonly [number, number, number]) => (ram: Uint8Array): void => {
  ram[0x8062] = ram[0x82a8] = ram[0x82c0] = ram[0x82d9] = x;
  ram[0x8063] = ram[0x82a9] = y;
  ram[0x8072] = (ram[0x8072] & 0xfe) | hi;
  ram[0x82c8] = ram[0x82ac] = ram[0x82da] = hi;
  ram[0x82e4] = 0; ram[0x8292] = 0; ram[0x835d] = 0; ram[0x82d7] = 0;
  ram[0x8306] = 1;
  ram[0x7aba] = x; ram[0x7abb] = hi; ram[0x7abc] = y; ram[0x7abd] = n;
};

const WAY: Record<Input, readonly Dir[]> = { none: [], left: ['left'], right: ['right'], fire: [], 'fire+left': ['left'], 'fire+right': ['right'] };
/** A way as the show's steps: each input held for its frames. */
const stepsOf = (path: readonly (readonly [Input, number])[]): EndingStep[] =>
  path.map(([input, frames]) => ({ press: WAY[input], frames, ...(input.startsWith('fire') ? { fire: true } : {}) }));

/** The panel's lines for time and rooms visited are put away (the band for the credits, rows 20 and 21 of the screen; the room's name and the items count stay). */
const SCREEN = 0x400, BLANK = 0x20, HUD_ROWS = [20, 21] as const;
const tidy = (ram: Uint8Array): void => {
  for (const row of HUD_ROWS) ram.fill(BLANK, SCREEN + row * 40, SCREEN + row * 40 + 40);
};

/**
 * A scene: a room, the way found for it, its credit lines. It lasts as long as its credit lines and visitors take (the show's
 * timeline), never longer than the way: a way found for the room is safe over every frame of it, so one cut short is too, but Willy left
 * standing at the end of a shorter one is at the guardians' mercy (the test checks each scene is no longer than its way).
 */
const scene = (n: number, credits: readonly string[]): EndingScene => {
  const way = WAYS[n];
  return { enter: room(n), ...(way ? { settle: stand(n, way.spot) } : {}), steps: way ? stepsOf(way.path) : [], frames: 0, credits };
};

/*
 * The credits are in three parts, as Super Mario World's: the makers, true facts, then the port (shared/ending/credits.ts `PORT_CREDITS`, in the
 * last scene). Sources of every line: re/credits.md. A line is at most 38 letters, upper case, in the game's own lettering (no apostrophes).
 */
const PLAN: readonly (readonly [number, readonly string[]])[] = [
  // Butlers Pantry: fifteen jars taken
  [68, ['JET SET WILLY II: THE FINAL FRONTIER', 'SOFTWARE PROJECTS, 1985', 'C64 VERSION BY JOHN DARNELL', 'AND STEVE BIRTLES']],
  // The Off Licence: thirteen bottles
  [1, ['AFTER JET SET WILLY, BY MATTHEW SMITH', 'THE BEST SELLING HOME GAME OF 1984', 'WILLY TIDIES UP AFTER A HUGE PARTY']],
  [20, ['IT BEGAN AS THE AMSTRAD JET SET WILLY', 'BY DERRICK ROWSON AND STEVE WETHERILL', 'ROWSONS SCREEN COMPRESSION LEFT', 'ENOUGH MEMORY FOR NEW ROOMS']],
  [85, ['THE ZOO WAS WHAT PEOPLE CALLED THE', 'PROGRAMMING OFFICES AT SOFTWARE', 'PROJECTS, IN THE BEAR BRAND COMPLEX', 'AND THE CAMEL IS WETHERILLS OWN']],
  [82, ['THE BIRDS ARE WONGA THE BUDGIE,', 'MARC WILDINGS CODING ALTER EGO']],
  [104, ['FOOT ROOM: A NOD TO MANIC MINER', 'LOONY JET SET: A NOD TO JET PAC', 'EGGOIDS: A NOD TO LUNAR JET MAN', 'MACARONI TED: A NOD TO TECHNICIAN TED']],
  [136, ['THE SPECTRUM HAS 175 ITEMS, NEEDS 150', 'THIS VERSION HAS 178 AND NEEDS 160']],
  [34, [...PORT_CREDITS, 'THANKS FOR PLAYING']],
];
/** The room of each scene, in order. */
export const SCENE_ROOMS: readonly number[] = PLAN.map(([n]) => n);
const SCENES: readonly EndingScene[] = PLAN.map(([n, credits]) => scene(n, credits));

const at = (name: string, n: number, sprites: readonly number[], frames = 200): EndingCharacter => {
  const way = WAYS[n];
  return { name, enter: room(n), ...(way ? { settle: stand(n, way.spot) } : {}), sprites, steps: way ? stepsOf(way.path) : [], frames };
};
/** The visitors: the mansion's guardians (the game names none but Maria, in its story, and the camel, which its author names: the others are named for what they look like), Willy last. */
const CAST: readonly EndingCharacter[] = [
  at('THE TOP HAT MAN', 68, [1]),
  at('THE MOON', 1, [1]),
  at('THE GOGGLE FACE', 20, [1]),
  at('THE RABBIT', 20, [3]),
  at('THE COMPASSES', 42, [1]),
  at('THE WINDMILL', 42, [2]),
  at('THE CAMEL', 85, [3]),
  at('MARIA', 34, [1]),
];

export const jsw2Ending: EndingSpec = {
  title: 'JET SET WILLY II',
  scenes: SCENES,
  cast: CAST,
  creditRow: 160,
  hero: 0,
  joyPort: 2,
  arm: () => {},
  keepAlive: (ram) => { ram[LIVES] = 0xff; },
  tidy,
};

/** The lines under THE END: the items taken, the rooms seen, the time on the game's clock (hours, minutes, seconds in BCD at $82A1). */
export function endingStats(ram: Uint8Array, found: Jsw2Found): string[] {
  const hex = (b: number) => b.toString(16).padStart(2, '0');
  return [`ITEMS ${itemsFound(ram)} OF ${TOTAL}`, `ROOMS ${found.rooms.length} OF ${Object.keys(MANSION).length}`, `TIME ${hex(ram[0x82a1])}:${hex(ram[0x82a2])}:${hex(ram[0x82a3])}`];
}
