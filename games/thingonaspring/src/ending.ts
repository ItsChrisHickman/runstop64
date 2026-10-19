import { PORT_CREDITS, type EndingCharacter, type EndingScene, type EndingSpec, type EndingStep, type Way } from '../../shared/native/ending';
import { piecesTaken, type ThingFound } from './map';
import { enter } from './travel';

/**
 * The ending's places and cast for Thing on a Spring (games/shared/native/ending.ts has the show). Every place is a screen of the
 * toy factory entered the game's own way (src/travel.ts) on a new game's memory, so its creatures, belts and springs are where the
 * game has them, and Thing is steered by the joystick alone. What he presses in each is a way found by playing: re/ways.json (Go-Explore
 * from every screen's two ends: the inputs that took him from one screen into the next, from the screen's start as travel makes it),
 * each checked to take him through from the show's own start by the test. The sources of the credit lines:
 * games/thingonaspring/re/credits.md.
 */

/** The oil ($8F, 0-255). */
const OIL = 0x8f, FULL_OIL = 0xff;

/** The game has been won: the goblin touched at his stop ($CD is 2, $59EB; the game's own end follows). */
export const won = (ram: Uint8Array) => ram[0xcd] === 2;

/** Into a screen of the factory the game's own way (src/travel.ts), at its left end or right. */
export const screen = (level: number, n: number, side: 'L' | 'R' = 'L', before?: (ram: Uint8Array) => void) => (ram: Uint8Array): boolean => {
  before?.(ram);
  enter(ram, level, n, side);
  return true;
};

/** The joystick, as re/ways.json and re/play.ts name it, and a path of it: what is held, for how many frames. */
type Input = 'none' | 'left' | 'right' | 'up' | 'down' | 'fire' | 'fire+left' | 'fire+right' | 'fire+up';
type Path = readonly (readonly [Input, number])[];
const WAYS: readonly Way[] = ['up', 'down', 'left', 'right'];
const steps = (path: Path): EndingStep[] => path.map(([input, frames]) => {
  const parts = input === 'none' ? [] : input.split('+');
  return { press: WAYS.filter((w) => parts.includes(w)), frames, ...(parts.includes('fire') ? { fire: true } : {}) };
});

// The ways (re/ways.json: "from>to:end", the screen he starts at, and what he does to cross into the next).
/** Level II, screen 7 from its left end: back into the room before, taking the jigsaw piece that lies in it ($3A5, bit 7). */
const PIECE: Path = [['none', 1], ['fire+left', 49], ['left', 55], ['fire+right', 24], ['left', 77]];
/** Level I, screen 4 from its left end: along the room, taking the oil can on the way ($3B0, bit 7). */
const OIL_CAN: Path = [['none', 1], ['fire+up', 48], ['fire+right', 52], ['right', 46], ['left', 29], ['right', 30], ['fire+left', 24], ['fire+right', 53], ['right', 19], ['fire+left', 31], ['fire+right', 43], ['fire+left', 58], ['fire', 39], ['left', 22]];
/** The same, stopped short of the way into the next screen (it comes at frame 478): he stays in the room. */
const OIL_CAN_ROOM: Path = OIL_CAN.slice(0, 13);
const ROOM_I_5: Path = [['none', 1], ['left', 27], ['fire+left', 56], ['down', 28], ['fire+left', 21], ['left', 6], ['fire+right', 42], ['left', 19], ['fire+left', 30], ['fire+up', 9], ['fire+right', 11], ['right', 21], ['fire+right', 31], ['left', 34], ['right', 47], ['up', 7]];
const ROOM_I_3: Path = [['none', 1], ['left', 15], ['fire+right', 37], ['left', 5], ['fire+right', 50], ['left', 17], ['fire+left', 40], ['left', 24], ['fire+left', 42], ['fire+right', 57], ['right', 51], ['none', 68], ['right', 22]];
/** Level II, screen 4 from its right end, along the room: stopped short of the way into the next screen (it comes at frame 358). */
const ROOM_II_4: Path = [['none', 1], ['left', 13], ['fire+right', 10], ['fire+left', 46], ['right', 61], ['fire+right', 32], ['fire+left', 76], ['left', 17], ['right', 27], ['fire+up', 43], ['right', 25]];
const ROOM_III_7: Path = [['none', 1], ['fire+left', 17], ['left', 4], ['fire+left', 53], ['left', 18], ['none', 36], ['fire+up', 48], ['fire+right', 8], ['none', 6], ['fire+right', 50], ['right', 52]];
/** Level IV, screen 6 from its left end, along the room: stopped short of the way into the next screen (it comes at frame 95: he goes on a little after the last press). */
const ROOM_IV_6: Path = [['none', 1], ['fire+up', 45], ['down', 27], ['left', 4]];
/** Level III, screen 4 from its left end: the same, short of frame 124. */
const ROOM_III_4: Path = [['none', 1], ['fire+right', 26], ['fire+left', 47], ['left', 40]];
const ROOM_IV_5: Path = [['none', 1], ['fire+left', 14], ['left', 29], ['up', 7], ['right', 19], ['up', 40], ['left', 15], ['fire+right', 20], ['left', 5], ['fire+left', 44], ['left', 49], ['right', 6], ['fire+left', 5]];

/** A scene: where, what he does (a path of the joystick), how long it is shown (the credits' slots make it longer), and where the credits begin. */
const scene = (credits: readonly string[] | undefined, enterScene: EndingScene['enter'], path: Path, frames = 360, creditsFrom = 40): EndingScene => ({
  credits, enter: enterScene, steps: steps(path), frames, creditsFrom,
});

/** Bouncing on the spot (the straight-up bounce and a rest), `n` times: Thing in a room with the credits going. */
const bounces = (n: number): Path => Array.from({ length: n }, (): Path => [['fire+up', 30], ['none', 24]]).flat();

/*
 * The credits stand in the picture's last two text rows, which the rooms leave plain (their own background colour: `plainBand`); the
 * corridors have pipe fixtures there, so the scenes with credits are in rooms, or start in a corridor and have the lines begin once
 * he is in the room (`creditsFrom`). The corridors run through have none.
 */
const SCENES: readonly EndingScene[] = [
  // a corridor of level I, run through (to the room beyond)
  scene(undefined, screen(0, 5, 'R'), ROOM_I_5, 390),
  // a room of level I, along it and the oil can taken on the way
  scene(['THING ON A SPRING', 'GREMLIN GRAPHICS, 1985', 'FOR THE COMMODORE 64 AND AMSTRAD CPC', 'WRITTEN BY JASON PERKINS', 'AND ANTHONY CLARKE'], screen(0, 4, 'L'), [...OIL_CAN_ROOM, ...bounces(3)], 640),
  scene(undefined, screen(0, 3, 'R'), ROOM_I_3, 430),
  // a jigsaw piece, taken (the first moments are in the corridor)
  scene(['GRAPHICS BY MARK ROGERS', 'MUSIC BY ROB HUBBARD', 'THE FIRST GAME TUNE HE EVER MADE', 'THING LOOKS LIKE ZEBEDEE FROM', 'THE MAGIC ROUNDABOUT'], screen(1, 7, 'L'), [...PIECE, ...bounces(5)], 740, 130),
  scene(['NINE JIGSAW PIECES TO FIND', 'FIVE SWITCHES TO WORK THE FACTORY', 'FOUR LEVELS AND SIXTEEN ROOMS', 'ZZAP 64, AUGUST 1985: 93 PERCENT', 'AND A SIZZLER'], screen(1, 4, 'R'), [...ROOM_II_4, ...bounces(5)], 640),
  scene(undefined, screen(3, 5, 'L'), ROOM_IV_5, 254),
  scene(['THE SOUND IS UNBELIEVABLE, WORDS FAIL', 'SAID JULIAN RIGNALL', 'THING BECAME A REGULAR IN THE', 'MARGINS OF ZZAP 64, WITH ROCKFORD'], screen(2, 4, 'L'), [...ROOM_III_4, ...bounces(6)], 520),
  scene(['YOUR 64: THE SCREENS ARE VERY BASIC', 'BUT STILL GREAT FUN', 'THE SEQUEL, THING BOUNCES BACK,', 'CAME IN 1987'], screen(3, 6, 'L'), [...ROOM_IV_6, ...bounces(6)], 520),
  // the sea level's first room, Thing bouncing on the spot
  scene(['GREMLIN GRAPHICS WAS FOUNDED IN 1984', 'IN SHEFFIELD, BY IAN STEWART', 'AND KEVIN NORBURN', 'THE ONLY COPIES HAD CRACKERS NAMES', 'IN THE SCROLLER AND HIGH SCORES'], screen(1, 2, 'L'), bounces(12), 640),
  // the goblin's room, with every piece found: his stop is at the far end of it
  scene([...PORT_CREDITS, 'THANKS FOR PLAYING'], screen(3, 8, 'L', (ram) => { ram[0xcc] = 0; }), [['right', 400], ['fire+right', 120]], 640),
];
/** A character in a place: the sprites that make it up there, and the way he goes while its frames are recorded (so the creatures come into view). */
const at = (name: string, enterScene: EndingScene['enter'], path: Path, sprites: readonly number[], frames = 200): EndingCharacter => ({ name, enter: enterScene, sprites, steps: steps(path), frames });

const CAST: readonly EndingCharacter[] = [
  at('THE SAUCER', screen(0, 5, 'R'), ROOM_I_5, [1]),
  at('THE OIL CAN', screen(0, 4, 'L'), OIL_CAN, [7], 60),
  at('THE JIGSAW PIECE', screen(1, 7, 'L'), PIECE, [7], 200),
  at('THE PROPELLER', screen(2, 7, 'R'), ROOM_III_7, [1]),
  at('THE CRYSTAL', screen(3, 5, 'L'), ROOM_IV_5, [1]),
  at('THE ROBOT', screen(1, 7, 'L'), PIECE, [1]),
  at('THING', screen(0, 5, 'R'), ROOM_I_5, [0]),
];

export const thingEnding: EndingSpec = {
  title: 'THING ON A SPRING',
  scenes: SCENES,
  cast: CAST,
  creditRow: 192,
  plainBand: true,
  hero: 0,
  arm: () => {},
  keepAlive: (ram) => { ram[OIL] = FULL_OIL; },
};

/** The lines under THE END: the pieces found, the oil left, the screens seen. */
export function endingStats(ram: Uint8Array, found: ThingFound): string[] {
  return [`PIECES FOUND ${piecesTaken(ram)} OF 9`, `OIL LEFT ${Math.round((ram[OIL] * 100) / FULL_OIL)} PERCENT`, `SCREENS SEEN ${Object.keys(found.screens).length} OF 32`];
}
