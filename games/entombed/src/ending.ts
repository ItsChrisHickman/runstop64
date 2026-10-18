import { PORT_CREDITS, type EndingCharacter, type EndingScene, type EndingSpec, type EndingStep } from '../../shared/native/ending';
import type { StatusLine } from '../../shared/native/narrate';
import { screenText } from '../../shared/native/pause';
import { pendragonCode } from '../../shared/pendragon/status';
import { ACTION, ACTIONS } from './actions';
import { enterChamber, enterCorridor } from './chambers';
import { progress, type EntombedFound } from './map';

/**
 * The ending's places and cast for Entombed (games/shared/native/ending.ts has the show). Every place is a chamber or a corridor of the
 * tomb, entered the game's own way (src/chambers.ts) on a new game's memory, so what the game keeps there is where it belongs and its
 * creatures move as they always did. Pendragon is told only what to press: the steps of the chambers' puzzles were found by playing each
 * on the game itself (re/ending/route.ts: a search over the moves the show's Director has, until the puzzle's own byte says it is done),
 * so what he does there is what the puzzle takes. The sources of the credit lines: games/entombed/re/credits.md.
 */

/** The game has been won: he walked out of the way out in chamber 1 ($3230 is 2; the game's own "congratulations" follows). */
export const won = (ram: Uint8Array) => ram[0x3230] === 2;

/** The game's message line (row 2: 28 characters from column 6, drawn from its table; its own lettering: letters are screen codes 1-26). */
export const STATUS: StatusLine = {
  at: 0x400 + 2 * 40 + 6,
  width: 28,
  busy: () => false,
  code: pendragonCode,
  blank: 0x20,
  restore: (ram) => { ram[0x3218] = 1; },
};

/** The game's own messages ("YOU HAVE READ..."), drawn on the whole bar, leave their ends on either side of the caption: put away (the caption goes over the rest). */
function tidy(ram: Uint8Array) {
  const row = 0x400 + 2 * 40;
  ram.fill(0x20, row + 1, row + 6);
  ram.fill(0x20, row + 34, row + 39);
}

/** What he carries (the game's flags, $322A-$322F: the bowl of fruit, the book of the dead, the whip, the torch; $3230 the way out). */
const FLAG = { fruit: 0x322a, book: 0x322c, whip: 0x322e, torch: 0x322f, wayOut: 0x3230 } as const;
const carrying = (...flags: number[]) => (ram: Uint8Array) => { for (const f of flags) ram[f] = 1; };

/** Into chamber `n` with `before` done first (what the game would have in hand by then). */
const chamber = (n: number, before?: (ram: Uint8Array) => void) => (ram: Uint8Array): boolean => { before?.(ram); return enterChamber(ram, n); };
const corridor = (floor: number, before?: (ram: Uint8Array) => void) => (ram: Uint8Array): boolean => { before?.(ram); return enterCorridor(ram, floor); };

const scene = (caption: string, credits: readonly string[], enter: EndingScene['enter'], steps: readonly EndingStep[], frames = 360): EndingScene => ({ caption, credits, enter, steps, frames });

/** A stroke of the whip facing a way, `times` times. */
const whip = (times: number, face: 'up' | 'left' | 'right' | 'down' = 'up'): EndingStep => ({ use: ACTION.whip, face, times, gap: 14 });

const SCENES: readonly EndingScene[] = [
  // the first chamber, where a game begins: along it, the mummy that bars the way out standing at the left
  scene('CHAMBER 1: WHERE IT BEGINS', ['ENTOMBED', 'ULTIMATE PLAY THE GAME, 1985', 'FOR THE COMMODORE 64'], chamber(1), [{ press: ['up'], frames: 14 }, { press: ['left'], frames: 110 }, { press: ['right'], frames: 150 }, { press: ['left'], frames: 60 }]),
  // the corridors, run along with the whip in hand
  scene('THE CORRIDORS', ['CREATED AND DESIGNED BY', 'DAVE AND BOB THOMAS', 'CODE BY DAVE THOMAS', 'GRAPHICS BY BOB THOMAS'], corridor(1, carrying(FLAG.whip)), [{ press: ['right'], frames: 150 }, whip(3, 'right'), { press: ['right'], frames: 150 }], 480),
  // the five bells, each whipped in its turn (the scarabs along the wall: the torch comes down)
  scene('CHAMBER 16: THE FIVE BELLS', ['A.C.G. ASHBY COMPUTERS AND GRAPHICS', 'THE SECOND OF THE PENDRAGON GAMES', 'STARRING SIR ARTHUR PENDRAGON', 'IN A TOMB UNDER THE GREAT SPHINX', 'SEVEN FLOORS DEEP'], chamber(16, carrying(FLAG.whip)), [
    { press: ['up'], frames: 4 },
    { press: ['left'], frames: 102 },
    { use: ACTION.whip, face: 'up', times: 1, gap: 20 },
    { press: ['right'], frames: 120 },
    { use: ACTION.whip, face: 'left', times: 1, gap: 20 },
    { press: ['left'], frames: 30 },
    { use: ACTION.whip, face: 'right', times: 1, gap: 20 },
    { press: ['right'], frames: 72 },
    { press: ['up'], frames: 30 },
    { use: ACTION.whip, face: 'left', times: 1, gap: 20 },
    { press: ['left'], frames: 42 },
    { use: ACTION.whip, face: 'up', times: 1, gap: 20 },
  ], 720),
  // the statue before the stairs' gate: whipped from its left until it gives (the gate's way is shut by it until it has gone)
  scene('CHAMBER 17: THE STATUE', ['TIM AND CHRIS STAMPER OF ULTIMATE', 'WERE NOT INVOLVED IN ITS MAKING', 'DAVE THOMAS RECODED THE KARNATH ENGINE', 'TO ALLOW A MUCH BIGGER AREA', 'ENTOMBED TOOK THE LONGEST TO CREATE'], chamber(17, carrying(FLAG.whip)), [{ press: ['left'], frames: 34 }, ...Array.from({ length: 8 }, (): EndingStep[] => [{ use: ACTION.whip, face: 'up', times: 1, gap: 20 }, { wait: 7 }]).flat()], 600),
  // the pots, whipped until they give (the statue's clue is behind them)
  scene('CHAMBER 8: THE POTS', ['ZZAP 64 COUNTED 175 SCREENS', 'PUZZLES WITH LOGICAL AND SOMETIMES', 'SPECTACULAR SOLUTIONS', 'ZZAP 64 GAVE IT 93 PERCENT', 'AND A GOLD MEDAL'], chamber(8, carrying(FLAG.whip)), [
    { press: ['up'], frames: 30 }, { press: ['right'], frames: 30 }, { press: ['up'], frames: 12 }, { press: ['right'], frames: 30 }, whip(10),
  ], 600),
  // the bowl of fruit: the two creatures come for it, and where they meet the book of the dead is his
  scene('CHAMBER 9: THE BOOK', ['COMPUTER AND VIDEO GAMES CALLED THE', 'GRAPHICS EXCELLENT AND SAW', 'A RESEMBLANCE TO INDIANA JONES', 'POPULAR COMPUTING WEEKLY CALLED IT', 'A MUST FOR ANY ADVENTURERS COLLECTION'], chamber(9, carrying(FLAG.fruit)), [
    { press: ['up'], frames: 60 }, { wait: 7 }, { press: ['left'], frames: 30 }, { wait: 7 }, { press: ['right'], frames: 12 }, { wait: 7 }, { press: ['up'], frames: 30 }, { wait: 120 },
  ], 600),
  // the cobra in its casket: with the book in hand, a touch and it goes
  scene('CHAMBER 12: THE COBRA', ['KILL A CROW AND IT DROPS AN ANKH', 'THE ANCIENT SYMBOL OF LIFE', 'PENDRAGON IS THE BLACK PRINCE', 'FROM JACK THE GIANT KILLER'], chamber(12, carrying(FLAG.book)), [
    { press: ['left'], frames: 4 }, { press: ['down'], frames: 12 }, { press: ['left'], frames: 30 }, { press: ['down'], frames: 30 }, { press: ['left'], frames: 30 }, { press: ['down'], frames: 30 }, { press: ['left'], frames: 30 }, { press: ['up'], frames: 94 }, { wait: 60 },
  ], 480),
  // a dark chamber, and the torch: a flash that shows its shapes (the room itself stays black, as the game has it)
  scene('CHAMBER 22: THE TORCH', ['BEFORE THIS, DAVE THOMAS MADE GAMES', 'FOR THE ATARI 400: WARLOK WON HIM', '5000 POUNDS FROM CALISTO SOFTWARE', 'THE ONLY COPIES HAD A CRACKERS NAME', 'IN THE TITLE: A.C.G. 1985 IS BACK'], chamber(22, carrying(FLAG.torch)), [
    { use: ACTION.torch, times: 2, gap: 50 }, { press: ['up'], frames: 16 }, { press: ['left'], frames: 50 }, { use: ACTION.torch, times: 3, gap: 50 }, { press: ['right'], frames: 90 }, { use: ACTION.torch, times: 3, gap: 50 },
  ], 600),
  // the bird's chamber: it drops stones, and he leaps for them
  scene('CHAMBER 11: THE BIRD', PORT_CREDITS, chamber(11), [{ press: ['right'], frames: 30 }, { jump: 3 }, { press: ['left'], frames: 60 }, { jump: 3 }, { press: ['right'], frames: 40 }], 480),
  // the way out, open (the ball is in the river): he runs for it, and the show stops short of the door (walking out is the game's own end)
  scene('CHAMBER 1: THE WAY OUT', ['THANKS FOR PLAYING'], chamber(1, (ram) => { ram[FLAG.wayOut] = 1; ram[0x1609] = 0x79; }), [{ press: ['up'], frames: 30 }, { press: ['left'], frames: 132 }, { wait: 100 }], 360),
];

/** A character in a place: the sprites that make it up there. */
const at = (name: string, enter: EndingScene['enter'], sprites: readonly number[], frames?: number): EndingCharacter => ({ name, enter, sprites, frames });

const CAST: readonly EndingCharacter[] = [
  at('THE MUMMY', chamber(1), [0, 1]),
  at('THE COBRA', chamber(12), [7]),
  at('THE SPIDER', chamber(3), [6]),
  at('THE BIRD', chamber(11), [0], 300),
  at('THE SCORPION', chamber(13), [4], 300),
  at('THE LIZARD', chamber(14), [0], 300),
  at('THE SPIRIT', chamber(9), [4], 300),
  at('THE BOULDER', chamber(2), [5], 200),
  { ...at('SIR ARTHUR PENDRAGON', chamber(1), [2]), steps: [{ press: ['up'], frames: 14 }, { press: ['right'], frames: 150 }] },
];

export const entombedEnding: EndingSpec = {
  title: 'ENTOMBED',
  scenes: SCENES,
  cast: CAST,
  status: STATUS,
  creditRow: 167,
  fourWays: true,
  // (it has no music, title or game: what is heard is each place's own sound, the whip and the bells)
  tune: 'effects',
  tidy,
  hero: 2,
  // (what he holds is each scene's: the whip and the torch are found in the tomb)
  arm: () => {},
  action: ACTIONS,
  keepAlive: (ram) => { ram[0x37f6] = 0; ram[0x323d] = 0; },
};

/** The lines under THE END: the chambers found, the junctions seen, the air left and the time (the panel's own clock). */
export function endingStats(ram: Uint8Array, found: EntombedFound): string[] {
  const { chambers, seen, junctions } = progress(ram, found);
  const clock = /TIME\s+(\d+:\d\d)/.exec(screenText(ram, 22, 0, 40));
  return [`CHAMBERS ENTERED ${chambers} OF 25`, `JUNCTIONS SEEN ${seen} OF ${junctions}`, `AIR LEFT ${100 - ram[0x37f6]} PERCENT`, ...(clock ? [`TIME ${clock[1]}`] : [])];
}

void PORT_CREDITS; void FLAG.fruit; void FLAG.book; void FLAG.torch; void FLAG.wayOut;
