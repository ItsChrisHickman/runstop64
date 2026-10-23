import { PORT_CREDITS } from '../../shared/ending/credits';
import { type EndingCharacter, type EndingScene, type EndingSpec, type EndingStep } from '../../shared/ending/machine-reel';
import { clean } from '../../shared/native/narrate';
import { screenText, statusNumber } from '../../shared/native/pause';
import { ACTIONS, SPELL } from './actions';
import { STATUS } from './guide';
import { DESTROYED, KEPT, PIECES } from './hints';
import { ROOMS, type KarnathFound } from './map';
import { PLACES } from './places';
import { go } from './travel';

/**
 * The ending's places and cast for The Staff of Karnath (games/shared/ending/ has the show). Every place is a room of the
 * castle entered the game's own way (src/travel.ts: a change of level to where he first came into the room, noted by walking the
 * recorded routes: src/places.ts) on a new game's memory, so what the game keeps there is where it belongs and its creatures move as
 * they always did; Pendragon is told only where to go and which spell to cast. The game names each room itself, on the line above its
 * message (the names of its own list, $0E2E).
 */

/** The port's credit lines as the panel can say them (its lettering has no brackets). */
export const PORT_LINES = PORT_CREDITS.map((l) => clean(l, STATUS));

/** The game has been won: the staff destroyed ($6FFF is $11, and $12 as the game restarts: $6FA9). */
export const won = (ram: Uint8Array) => ram[KEPT.count] >= DESTROYED;

const scene = (place: string, credits: readonly string[], steps: readonly EndingStep[], before?: (ram: Uint8Array) => void, frames = 250): EndingScene => ({
  credits,
  steps,
  frames,
  enter: (ram) => {
    before?.(ram);
    const to = PLACES[place];
    return to !== undefined && go(ram, [...to]);
  },
});

/** A piece carried and some already laid ($322F, the count $6FFF: what the game keeps, re/README.md "How the game is won"). */
const carrying = (laid: number) => (ram: Uint8Array) => { ram[KEPT.carrying] = 1; ram[KEPT.count] = laid; };

const SCENES: readonly EndingScene[] = [
  // the knights of the lower guard room: FORTHRIN, the spell that works on most things, at their legs (sprites 5 and 7, which they come on with)
  scene('0/3', ['THE STAFF OF KARNATH', 'ULTIMATE DECEMBER 1984'], [{ walk: [100, 158] }, { use: SPELL.forthrin, face: 'right', times: 6, gap: 25 }], undefined, 420),
  // along the armoury and on into the guard room, and back
  scene('0/2', ['DAVE AND BOB THOMAS', 'CODE DAVE AND GRAPHICS BOB'], [{ go: 'right', frames: 140 }, { go: 'left', frames: 140 }]),
  // the ghost of the servants' quarters comes in from the left
  scene('0/5', ['ASHBY COMPUTERS AND GRAPHICS', 'THE FIRST PENDRAGON GAME'], [{ use: SPELL.forthrin, face: 'left', times: 6, gap: 20 }]),
  // the great hall, its length run
  scene('0/6', ['INSPIRED BY THE FILM', 'JACK THE GIANT KILLER', 'INFLUENCED BY H P LOVECRAFT'], [{ go: 'left', frames: 180 }, { go: 'right', frames: 180 }], undefined, 250),
  scene('255/24', ['THE IDEA: A CASTLE SEEN LIKE', 'LOOKING INTO A DOLLS HOUSE'], [{ go: 'right', frames: 120 }, { go: 'left', frames: 120 }]),
  scene('1/21', ['IT SOLD OVER 40000 COPIES', 'AS MANY AS ITS 3 SEQUELS'], [{ go: 'left', frames: 120 }, { go: 'right', frames: 120 }]),
  scene('1/19', ['THE FIRST ULTIMATE GAME MADE', 'WITHOUT THE STAMPERS', 'ZZAP: 7TH BEST IN ISSUE ONE'], [{ go: 'left', frames: 140 }, { go: 'right', frames: 140 }]),
  scene('254/25', ['PERSONAL COMPUTER GAMES GAVE', 'IT NINE OUT OF TEN', 'TWO SCHOOLBOYS WON A TROPHY'], [{ go: 'left', frames: 150 }, { go: 'right', frames: 150 }]),
  // the obelisk: a piece carried and nine laid, BARACATA at it deposits the tenth
  scene('254/obelisk', ['SEVENTEEN PIECES ARE HIDDEN', 'BUT YOU NEED ONLY SIXTEEN', ...PORT_LINES], [{ go: 'up', frames: 80 }, { use: SPELL.baracata, face: 'right' }, { wait: 300 }], carrying(9), 250),
  // the sixteenth: the staff in its shrine, MENHIR in hand (the one spell that destroys it: the game's own end follows that, so the show stops short of it)
  scene('254/obelisk', ['ONLY MENHIR CAN DESTROY IT', 'ANY OTHER SPELL KILLS YOU', 'THANKS FOR PLAYING'], [{ go: 'up', frames: 80 }, { use: SPELL.baracata, face: 'right' }, { wait: 100 }, { use: SPELL.menhir, face: 'right', times: 0 }, { wait: 300 }], carrying(15), 300),
];

/** A character in a place: the sprites that make it up there. */
const at = (place: string, name: string, sprites: readonly number[], frames?: number): EndingCharacter => ({ name, sprites, frames, enter: (ram) => { const to = PLACES[place]; return to !== undefined && go(ram, [...to]); } });

const CAST: readonly EndingCharacter[] = [
  at('0/3', 'THE KNIGHT', [4, 5]),
  at('0/1', 'THE GHOUL', [0]),
  at('0/5', 'THE GHOST', [5], 300),
  at('1/19', 'THE SPIDER', [4], 300),
  at('1/20', 'THE HOODED FIGURE', [1], 300),
  at('255/24', 'THE GOBLIN', [6]),
];

export const karnathEnding: EndingSpec = {
  title: 'THE STAFF OF KARNATH',
  scenes: SCENES,
  cast: CAST,
  status: STATUS,
  creditLine: STATUS,
  // (the title is silent: its tune is the one the castle plays)
  tune: 'game',
  hero: 2,
  arm: () => {},
  action: ACTIONS,
  keepAlive: (ram) => { ram[0x6ffe] = 100; ram[0x322e] = 0; },
};

/** The lines under THE END: the pieces laid, the rooms he came into, the energy left and the castle's clock (the panel's own digits). */
export function endingStats(ram: Uint8Array, found: KarnathFound): string[] {
  const clock = `${screenText(ram, 24, 5, 5)} ${screenText(ram, 24, 11, 2)}`.trim();
  return [`PIECES LAID ${Math.min(ram[KEPT.count], PIECES)} OF ${PIECES}`, `ROOMS SEEN ${found.castle.rooms.length} OF ${ROOMS}`, `ENERGY LEFT ${statusNumber(ram, 0x07dc)} PERCENT`, ...(clock.length > 3 ? [`CLOCK ${clock}`] : [])];
}
