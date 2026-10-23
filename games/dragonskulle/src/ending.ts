import { rd } from '../../shared/native/cpu';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { type EndingCharacter, type EndingScene, type EndingSpec, type EndingStep } from '../../shared/ending/machine-reel';
import type { StatusLine } from '../../shared/native/narrate';
import { pendragonCode } from '../../shared/pendragon/status';
import { ACTION, ACTIONS } from './actions';
import { COLUMNS, ROWS, TABLE, type DragonskulleFound } from './map';
import { BRIDGE_OPEN, BRIDGES, DRAGONS } from './rules';
import { LOCATION, go } from './travel';

/**
 * The ending's places and cast for Dragonskulle (games/shared/ending/ has the show). Every place is a screen of the
 * island, entered the game's own way (src/travel.ts) on a new game's memory, so what the game keeps there is where it belongs and its
 * creatures move as they always did; Pendragon is told only where to go and what to use. The captions are plain names for the
 * places (the game and its map name none; they are what re/README.md calls them).
 */

/** The game has been won: the skull's last hit made it go ($6000 of the final room sets $342B to $FF, and the main loop runs the end from it). */
export const won = (ram: Uint8Array) => ram[0x342b] === 0xff;

/** The panel's line the caption goes on: row 22 of the status panel, 23 columns before the faces (23 on): its lettering is the Pendragon engine's. */
export const STATUS: StatusLine = {
  at: 0x400 + 22 * 40,
  width: 23,
  busy: () => false,
  code: pendragonCode,
  blank: 0x00,
  restore: () => {},
};

/** A new game's score and lives mean nothing in the show: the rest of the panel (the second and third rows, the faces) is put away so the band under the caption is empty. */
function tidy(ram: Uint8Array) {
  ram.fill(0, 0x400 + 22 * 40 + 23, 0x400 + 22 * 40 + 40);
  ram.fill(0, 0x400 + 23 * 40, 0x400 + 25 * 40);
}

/** Where he comes into a screen from below, as src/travel.ts has it, with the rest of where he is (the scroll's column, which way he faces) as it stands. */
function cell(x: number, y: number, before?: (ram: Uint8Array) => void) {
  return (ram: Uint8Array): boolean => {
    before?.(ram);
    const at = [...LOCATION.map((a) => ram[a]), rd(0xd010) & 4 ? 1 : 0];
    at[0] = x; at[1] = y; at[3] = 0x70; at[4] = 0x99;
    return go(ram, at);
  };
}

const SHOVEL = 0x342f, CLOAK = 0x3430;
/** Things he has in hand for a scene. */
const have = (...addresses: number[]) => (ram: Uint8Array) => { for (const a of addresses) ram[a] = 1; };

const scene = (caption: string, credits: readonly string[], enter: EndingScene['enter'], steps: readonly EndingStep[], frames = 260): EndingScene => ({ caption, credits, enter, steps, frames });

const SCENES: readonly EndingScene[] = [
  // where he lands: the spot in the sand he digs four times for the cloak (his y above $9A, touching the spot, the game's own count)
  scene('THE BEACH', ['DRAGONSKULLE', 'ULTIMATE PLAY THE GAME, JANUARY 1986'], cell(1, 0, (ram) => { ram[SHOVEL] = 1; ram[0x342b] = 0; }), [{ walk: [160, 152] }, { use: ACTION.shovel, times: 6, gap: 20 }, { wait: 40 }]),
  // the shovel in its room, between the ants: a stone thrown facing up from below it (the stone must meet it, re/README.md "The shovel")
  scene('THE SHOVEL', ['CREATED BY DAVE AND BOB THOMAS', 'CODE BY DAVE, GRAPHICS BY BOB THOMAS'], cell(4, 2), [{ walk: [132, 138] }, { use: ACTION.stone, face: 'up', gap: 60 }, { wait: 200 }]),
  // a stretch of the caves: along it, a jump over what is in the way
  scene('THE CAVES', ['A.C.G. ASHBY COMPUTERS AND GRAPHICS', 'THE FOURTH AND LAST PENDRAGON GAME', 'STARRING SIR ARTHUR PENDRAGON'], cell(1, 3), [{ walk: [240, 150] }, { jump: 2 }, { walk: [100, 150] }]),
  // the river, its bridge open (the count of wizards killed made $FF), crossed
  scene('THE RIVER', ['AN ISLAND LOOSELY BASED ON', 'SKULL ISLAND FROM KING KONG'], cell(4, 6, (ram) => { ram[0x343a] = BRIDGE_OPEN; }), [{ go: 'up', frames: 10 }, { walk: [149, 154] }, { go: 'up', frames: 95 }, { jump: 1 }, { go: 'down', frames: 95 }]),
  // the dragon: ten stones thrown facing up on its head
  scene('THE DRAGON', ['THE KARNATH ENGINE WAS RECODED FOR', 'ENTOMBED THEN USED IN THIS GAME TOO'], cell(4, 5), [{ walk: [150, 163] }, { use: ACTION.stone, face: 'up', times: 9, gap: 4 }], 450),
  // a grave, dug on
  scene('THE GRAVES', ['ULTIMATE ALLOWED NO CREDITS SO', 'DAVE SNEAKED THEIR INITIALS IN', 'THE LAST SCREEN: DT AND RET 1985'], cell(5, 4, have(SHOVEL)), [{ walk: [97, 116] }, { use: ACTION.shovel, times: 6, gap: 20 }], 370),
  // the falling rocks, under the cloak
  scene('THE FALLING ROCKS', ['THE THEME TUNE SOUNDS LIKE BUGGY BOY', 'ON C64 WHICH DAVE AND BOB ALSO MADE'], cell(3, 2, have(CLOAK)), [{ use: ACTION.cloak }, { go: 'up', frames: 30 }, { go: 'right', frames: 60 }, { go: 'left', frames: 120 }, { go: 'right', frames: 60 }]),
  // the eyes, stones thrown at each side
  scene('THE EYES', ['IT GOT DREADFUL REVIEWS BUT', 'THE STAMPERS AND THE BROTHERS BOTH', 'THOUGHT IT THE BEST OF THE FOUR'], cell(12, 8), [{ use: ACTION.stone, face: 'left', times: 2, gap: 50 }, { use: ACTION.stone, face: 'right', times: 2, gap: 50 }]),
  // the plank over the water
  scene('THE LAKE', ['NUMBER 10 IN THE UK, FEBRUARY 1986', ...PORT_CREDITS], cell(2, 1), [{ go: 'right', frames: 40 }, { jump: 1 }, { go: 'left', frames: 80 }, { jump: 1 }]),
  // the gas
  scene('THE GAS', [], cell(5, 14, have(CLOAK)), [{ use: ACTION.cloak }, { go: 'right', frames: 40 }, { go: 'left', frames: 90 }, { go: 'right', frames: 40 }]),
  // the skull, stopped short of its last hit (the game's own end follows that)
  scene('THE SKULL', ['THANKS FOR PLAYING'], cell(9, 23), [{ use: ACTION.stone, face: 'up', times: 4, gap: 4 }], 260),
];

const CAST: readonly EndingCharacter[] = [
  { name: 'THE ANT', enter: cell(4, 2), sprites: [4] },
  { name: 'THE WIZARD', enter: cell(4, 6), sprites: [5], frames: 600 },
  { name: 'THE FLOATING SKULL', enter: cell(4, 6), sprites: [1], frames: 220 },
  { name: 'THE DRAGON', enter: cell(4, 5), sprites: [1, 4, 5, 6, 7] },
  { name: 'THE EYE', enter: cell(12, 8), sprites: [0] },
  { name: 'THE GAS', enter: cell(5, 14), sprites: [0] },
  { name: 'THE SKULL OF SOULS', enter: cell(9, 23), sprites: [5] },
];

export const dragonskulleEnding: EndingSpec = {
  title: 'DRAGONSKULLE',
  scenes: SCENES,
  cast: CAST,
  status: STATUS,
  creditRow: 12,
  creditX: 7,
  fourWays: true,
  tidy,
  hero: 2,
  arm: () => {},
  action: ACTIONS,
  keepAlive: (ram) => { ram[0x1248] = 0; ram[0x123e] = 0x14; ram[0x3432] = 0; },
};

/** The lines under THE END: the score as the panel shows it, the lives left, the dragons and bridges, the screens seen. */
export function endingStats(ram: Uint8Array, found: DragonskulleFound): string[] {
  // (the panel's digits: $31-$39, and $3A for 0)
  const score = Array.from({ length: 6 }, (_, i) => { const c = ram[0x400 + 22 * 40 + 13 + i]; return c >= 0x31 && c <= 0x39 ? String.fromCharCode(c) : '0'; }).join('');
  let screens = 0;
  for (let i = 0; i < COLUMNS * ROWS; i++) if (ram[TABLE + i]) screens++;
  return [
    `SCORE ${score}`,
    `LIVES LEFT ${5 - Math.floor(ram[0x1248] / 3)} OF 5`,
    `DRAGONS SLAIN ${DRAGONS.filter((d) => ram[d.flag] === 1).length} OF ${DRAGONS.length}`,
    `BRIDGES OPENED ${BRIDGES.filter((b) => ram[b.counter] === BRIDGE_OPEN).length} OF ${BRIDGES.length}`,
    `SCREENS SEEN ${found.cells.length} OF ${screens}`,
  ];
}
