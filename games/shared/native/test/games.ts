/**
 * What the native-port test tools need to know about each game: its title
 * snapshot, the main loop's frame wait, its overlay regions, and (for
 * exploration) what counts as a distinct cell and place, plus cheats that keep
 * Pendragon alive.
 */
import type { C64 } from '../../../../packages/c64kit/src/c64/machine';
import type { PortConfig } from '../host';
import { port as entombed } from '../../../entombed/src/native';
import { port as blackwyche } from '../../../blackwyche/src/native';
import { port as dragonskulle } from '../../../dragonskulle/src/native';
import { port as karnath } from '../../../karnath/src/native';
import { port as thingonaspring } from '../../../thingonaspring/src/native';
import { port as jsw2 } from '../../../jsw2/src/native';

/** Joystick input, on the port(s) the game reads. */
export function setJoy(m: { joy1: number; joy2: number }, game: { joyPort?: 1 | 2 }, j: number) {
  m.joy1 = game.joyPort === 2 ? 0x1f : j;
  m.joy2 = game.joyPort === 1 ? 0x1f : j;
}

export interface GameTest {
  title: string;
  /** The wait routine (first and last address) and the return address its call from the main loop pushes. */
  waitRoutine: [number, number];
  mainLoopReturn: number;
  /** Address of the main loop's wait call (pass boundary for lockstep). */
  mainLoopWait: number;
  /** Regions code gets swapped into: [first, last]. */
  overlays: [number, number][];
  cell(m: C64): string;
  place(m: C64): string;
  /** Frames the fire button is held on the title to start (default 30 to 34). */
  start?: [number, number];
  /** Input changes at each keyboard scan (SCNKEY) instead of each frame wait: for games that time themselves. */
  inputAtScan?: boolean;
  /** The joystick port the game reads, if only one (the other's lines are keyboard keys to it). */
  joyPort?: 1 | 2;
  cheat?(m: C64): void;
  valid?(m: C64): boolean;
  /** The native port. */
  port: PortConfig;
  /** The native start from the title snapshot waits frames setting the title up (the original's snapshot was taken after them): lockstep doesn't count them. */
  titleSetupWaits?: boolean;
  /** Memory lockstep doesn't compare: [first, last] (e.g. the title tune's place, as the native title starts its tune again). */
  ignore?: [number, number][];
  /** Exploring: pick the current action now and then (`r` random in 0-1), for games whose actions change with keys held longer than exploring holds them. */
  act?(m: C64, r: number): void;
  /** Interrupt handlers (entered by interrupt, not JSR: not patched in for checks). */
  interrupts?: number[];
}

/** A coarse fingerprint of the playfield (every 7th character of rows 3-20): tells rooms apart. */
const screenPrint = (m: C64) => {
  let h = 0;
  for (let a = 0x400 + 3 * 40; a < 0x400 + 21 * 40; a += 7) h = (h * 31 + m.ram[a]) >>> 0;
  return h.toString(36);
};
const sig = (m: C64, lo: number) => Array.from(m.ram.subarray(lo, lo + 3), (b) => b.toString(16)).join('');
/** Pendragon is sprite 2 in all three games. */
const player = (m: C64) => `${(m.vic[4] | ((m.vic[0x10] & 4) << 6)) >> 4},${m.vic[5] >> 4}`;

export const GAMES: Record<string, GameTest> = {
  entombed: {
    port: entombed,
    title: 'games/entombed/assets/entombed-title.state',
    waitRoutine: [0x2098, 0x20a6],
    mainLoopReturn: 0x1816,
    mainLoopWait: 0x1814,
    overlays: [[0x6000, 0x66ff]],
    cell: (m) => { const r = m.ram; return [r[0x37f7], r[0x321c], r[0x217e], r[0x217f], r[0x2181], r[0x321f] >> 4, r[0x3220] >> 4].join(','); },
    place: (m) => `floor${m.ram[0x37f7]}-room${m.ram[0x321c]}-${m.ram[0x217e]}.${m.ram[0x217f]}`,
    cheat: (m) => { m.ram[0x37f6] = 0; m.ram[0x323e] = 0; m.ram[0x323d] = 0; },
    valid: (m) => m.ram[0x37f7] >= 1 && m.ram[0x37f7] <= 7,
  },
  blackwyche: {
    port: blackwyche,
    title: 'games/blackwyche/assets/blackwyche-title.state',
    waitRoutine: [0x1e8b, 0x1e99],
    mainLoopReturn: 0x15e2,
    mainLoopWait: 0x15e0,
    overlays: [[0x6000, 0x66ff]],
    ignore: [[0x9a8b, 0x9a94]], // (the title tune's player: where it was when the game started)
    cell: (m) => `${sig(m, 0x6000)}/${screenPrint(m)}/${player(m)}`,
    place: (m) => `${sig(m, 0x6000)}-${screenPrint(m)}`,
  },
  dragonskulle: {
    port: dragonskulle,
    title: 'games/dragonskulle/assets/dragonskulle-title.state',
    waitRoutine: [0x1fa5, 0x1fb3],
    mainLoopReturn: 0x166f,
    mainLoopWait: 0x166d,
    overlays: [[0x6000, 0x6bff]],
    // the island's screens: column $20A8, row $20A9 of the table at $6E20 (and the room block $341C)
    cell: (m) => `${m.ram[0x20a8]},${m.ram[0x20a9]}/${m.ram[0x341c]}/${player(m)}/${m.ram[0x342f]}${m.ram[0x3430]}`,
    place: (m) => `x${m.ram[0x20a8]}-y${m.ram[0x20a9]}-r${m.ram[0x341c]}`,
    // energy: the faces lost ($1248, 3 a face), what's left of the face going ($123E), damage to take ($3432)
    // the action ($12EB: 0 dig, 1 magic, 3 fireball, 4 jump; 2 pauses): jump or fireball mostly, what's been found sometimes
    act: (m, r) => { const a = [4, 4, 4, 3, 3, 0, 1][Math.floor(r * 7)]; if (a > 1 || m.ram[0x342f + a]) m.ram[0x12eb] = a; },
    cheat: (m) => { m.ram[0x1248] = 0; m.ram[0x123e] = 0x14; m.ram[0x3432] = 0; },
    titleSetupWaits: true,
    ignore: [[0x9ad6, 0x9ae8]], // (the title tune's player: where it was when the game started)
  },
  karnath: {
    port: karnath,
    title: 'games/karnath/assets/karnath-title.state',
    waitRoutine: [0x219c, 0x21aa],
    mainLoopReturn: 0x18d1,
    mainLoopWait: 0x18cf,
    overlays: [[0x6000, 0x68ff], [0xc000, 0xcfff]],
    cell: (m) => `${sig(m, 0x6000)}${sig(m, 0xc000)}/${screenPrint(m)}/${player(m)}`,
    place: (m) => `${sig(m, 0x6000)}${sig(m, 0xc000)}-${screenPrint(m)}`,
  },
  thingonaspring: {
    port: thingonaspring,
    interrupts: [0x42b0, 0x7254],
    title: 'games/thingonaspring/assets/toas-title.state',
    waitRoutine: [0x41bb, 0x41c7],
    mainLoopReturn: 0x4379,
    mainLoopWait: 0x4377,
    overlays: [],
    cell: (m) => `${m.ram[0x5e]},${m.ram[0x5f]}/${player(m)}`,
    place: (m) => `room${m.ram[0x5e]}.${m.ram[0x5f]}`,
  },
  jsw2: {
    port: jsw2,
    interrupts: [0x4ace, 0x4a18, 0x78cd, 0x7940, 0x8409, 0x4af2], // (and $8409, the tail they jump to; $4AF2, the new game, is jumped to and never returns)
    title: 'games/jsw2/assets/jsw2-title.state',
    waitRoutine: [0x4e95, 0x4eae],
    mainLoopReturn: -1,
    mainLoopWait: 0x4bae,
    overlays: [],
    cell: (m) => `${m.ram[0x8000]}/${player(m)}`,
    place: (m) => `room${m.ram[0x8000]}`,
    inputAtScan: true,
    joyPort: 2, // port 1's lines are F1 (pause) and F3 (music) to it
    start: [40, 44], // its title misses a press held from frame 29 (the original too)
  },
};
// Entombed with no room translations: every call into room code takes the 6502 safety net.
GAMES['entombed-fallback'] = { ...GAMES.entombed, port: { ...entombed, overlays: [{ lo: 0x6000, hi: 0x66ff, versions: [] }] } };
