import { PORT_CREDITS, type EndingCharacter, type EndingScene, type EndingSpec } from '../../shared/native/ending';
import { itemsFound, ITEMS } from './items';
import { ACTION } from './actions';
import { STATUS } from './guided';
import { placeName, PLACE_NAMES } from './names';
import { CABINS, HALLS } from './ship';
import { enterRoom } from './travel';
import { shipSeen, TOTAL, type BlackwycheFound } from './map';
import { screenText } from '../../shared/native/pause';

/**
 * The ending's places and cast for Blackwyche (games/shared/native/ending.ts has the show). Every place
 * is a room of the game, entered the game's own way on a new game's memory, so the things the game keeps
 * there are where they belong and its creatures move as they always did. Pendragon is told only where
 * to go and what to strike; the captions are the map's own names for the places (names.ts).
 */

/** The game has been won: the captain freed and the end under way ($342C is 2 in the captain's cabin, room $0C). */
export const won = (ram: Uint8Array) => ram[0x341c] === 0x0c && ram[0x342c] === 2;

/** The map's name for the place a room is (a hall's or a cabin's). */
function captionOf(room: number): string {
  const cab = CABINS.find((c) => c.room === room), hall = HALLS.find((h) => h.room === room);
  if (cab) return PLACE_NAMES[`C${cab.deck}.${cab.part}.${cab.door}`] ?? placeName(`C${cab.deck}`);
  if (hall) return placeName(`H${hall.deck}.${hall.part}`);
  return '';
}

/** A scene in a room, with the credit lines over it (their sources: games/blackwyche/re/credits.md). */
const scene = (room: number, credits: readonly string[], steps: EndingScene['steps'], frames = 300): EndingScene => ({ caption: captionOf(room), enter: (ram) => enterRoom(ram, room), steps, frames, credits });
const room = (n: number) => (ram: Uint8Array) => enterRoom(ram, n);

/** Along a hall, a jump or two on the way. */
const RUN: EndingScene['steps'] = [{ walk: [80, 164] }, { jump: 2 }, { walk: [250, 164] }];
/** At a creature, sword out. */
const strike = (n: number): EndingScene['steps'] => [{ strike: n, from: 'right', reach: 28, frames: 200 }];

const SCENES: readonly EndingScene[] = [
  // the game and its makers (the first piece of the chart, on the shelf: struck, it falls)
  scene(0x04, ['BLACKWYCHE', 'ULTIMATE PLAY THE GAME, 1985', 'FOR THE COMMODORE 64'], [{ walk: [150, 146] }, { strike: 6, from: 'right', reach: 24, dy: 19 }]),
  // (the rat on the long table, and a jump along the hall)
  scene(0x13, ['DESIGNED BY DAVE AND BOB THOMAS', 'CODE BY DAVE THOMAS', 'GRAPHICS BY BOB THOMAS'], [{ walk: [60, 164] }, { jump: 2 }, { walk: [300, 164] }]),
  // (the skull hall: what comes at him is struck)
  scene(0x0e, ['A.C.G. ASHBY COMPUTERS AND GRAPHICS', 'PENDRAGON 1: THE STAFF OF KARNATH', 'PENDRAGON 2: ENTOMBED'], [{ strike: 4, from: 'right', reach: 28 }]),
  // (the pearl in its oyster: with the seaweed in hand it is his for the taking)
  scene(0x14, ['PENDRAGON 3: BLACKWYCHE', 'PENDRAGON 4: DRAGON SKULLE', 'STARRING SIR ARTHUR PENDRAGON'], RUN, 260),
  // facts, in the rooms of the creatures
  scene(0x1b, ['INSPIRED BY HMS VICTORY, PORTSMOUTH', 'THE BROTHERS PHOTOGRAPHED THE SHIP'], strike(0)),
  scene(0x19, ['BOB WAS A MINISTRY OF DEFENCE', 'TECHNICAL ILLUSTRATOR'], strike(4)),
  scene(0x1a, ['MADE IN THEIR PARENTS ATTIC', 'ULTIMATE ORDERED A WHOLE SERIES'], RUN),
  scene(0x12, ['PENDRAGON IS THE BLACK PRINCE', 'FROM JACK THE GIANT KILLER', 'COMMODORE USER: BEST OF THE SERIES', 'SIR ARTHUR AND THE BLACKWYCHE ARE', 'IN SEA OF THIEVES BY RARE'], strike(4)),
  // (the spider hangs down into the band under the picture, where the credits stand: this scene has none)
  scene(0x1e, [], strike(0)),
  // this copy, and this port
  scene(0x0e, ['A KILOBYTE WAS MISSING FROM THIS COPY', 'FOUND BY CHECKING EVERY ROOM', 'TITLE LINE RESTORED: A.C.G. 1985'], [{ walk: [60, 164] }, { jump: 1 }, { walk: [280, 164] }]),
  scene(0x13, PORT_CREDITS, [{ walk: [300, 164] }, { jump: 2 }, { walk: [60, 164] }]),
  // the captain: the blow that frees him (the game's own end follows it, so the show stops short of it)
  scene(0x0c, ['THANKS FOR PLAYING'], [{ strike: 4, from: 'right', reach: 34, dy: 25 }], 240),
];

const CAST: readonly EndingCharacter[] = [
  { name: 'THE RAT', enter: room(0x13), sprites: [4] },
  { name: 'THE IMP', enter: room(0x0e), sprites: [4] },
  { name: 'THE SKELETON', enter: room(0x1b), sprites: [0, 1] },
  { name: 'THE JELLYFISH', enter: room(0x19), sprites: [4] },
  { name: 'THE SPIKED BALL', enter: room(0x1a), sprites: [0] },
  { name: 'THE GUARD', enter: room(0x12), sprites: [4] },
  { name: 'THE OYSTER', enter: room(0x14), sprites: [6] },
  { name: 'THE SPIDER', enter: room(0x1e), sprites: [0] },
  { name: 'SIR ARTHUR PENDRAGON', enter: room(0x13), sprites: [2], steps: [{ walk: [300, 164] }] },
];

export const blackwycheEnding: EndingSpec = {
  title: 'BLACKWYCHE',
  scenes: SCENES,
  cast: CAST,
  status: STATUS,
  hero: 2,
  // the magic sword in hand, and the seaweed (the oyster gives up its pearl to it)
  arm: (ram) => { ram[0x342b] = 1; ram[0x9d68] = 1; },
  action: ACTION,
  keepAlive: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; },
};

/** The lines under THE END, from the game's memory and the map's record: what he found, where he has been, how long it took (the panel's own clock). */
export function endingStats(ram: Uint8Array, found: BlackwycheFound): string[] {
  const clock = /TIME (\d\d:\d\d)/.exec(screenText(ram, 23, 0, 40));
  return [`THINGS FOUND ${itemsFound(ram)} OF ${ITEMS.length}`, `PLACES SEEN ${shipSeen(found)} OF ${TOTAL}`, ...(clock ? [`TIME ${clock[1]}`] : [])];
}
