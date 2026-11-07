/**
 * The original boots on the headless Spectrum with no patches, and its first moments are what re/README.md says:
 * the tape loads through the ROM's loader (the BASIC loader, the 100-byte CODE block, the game block), the title picture
 * is up with its tune, a key leads to the options menu, key 1 (keyboard) and key 0 (play) start a game: three lives, no
 * score, Monty in the opening scene. In room 0 the main loop runs every second frame (25 passes a second) and the interrupt
 * routine every frame.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/boot.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { bootedSpectrum, readRom, readTape, typeLoad } from '../../../tools/zx/boot';
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import { BUILD, ROM_FILE, machineFrom } from './original';

const tape = readTape(`${BUILD}/montymole.tap`);
const m: Spectrum = bootedSpectrum(readRom(ROM_FILE));
m.tape = tape;
let started = false, tuneLoop = false;
m.onStep = (pc) => { if (pc === 0xd290) started = true; else if (pc === 0xd2a1) tuneLoop = true; };
typeLoad(m);

/** Run to `frame`, holding the keys in `holds` over their frames. */
function runTo(frame: number, holds: readonly { keys: readonly string[]; from: number; to: number }[] = []) {
  while (m.frame < frame) {
    m.releaseAll();
    for (const h of holds) if (m.frame >= h.from && m.frame <= h.to) for (const k of h.keys) press(m, k, true);
    m.runFrame();
  }
}
const holds = [
  { keys: ['SPACE'], from: 1000, to: 1010 },
  { keys: ['1'], from: 1500, to: 1510 },
  { keys: ['0'], from: 1700, to: 1710 },
];

// ---- loading
runTo(600, holds);
check('the tape loads in five calls of the ROM loader: two headers, the BASIC, the loader, the game', m.loaded.length === 5, true);
check('the game block is 49152 bytes at 16384', m.loaded[4] === '49152 bytes at 16384');
check('the loader block is 100 bytes at 60000', m.loaded[3] === '100 bytes at 60000');
const block = tape.at(-1);
check('the last block of the tape is the headerless game block', block !== undefined && block.kind === 'standard' && block.bytes[0] === 0x71);
if (block?.kind === 'standard') {
  const picture = block.bytes.subarray(1, 1 + 6912);
  check('the title picture on the screen is the first 6912 bytes of the game block', picture.every((v, i) => m.mem[0x4000 + i] === v));
}
m.onStep = null;
check('the game starts at $D290 (the loader returns to an address the game block put on the stack)', started);
check('the title runs its tune loop ($D2A1: the next note of the table at $D5B9)', tuneLoop);

// ---- the options menu
runTo(1300, holds);
const text = (at: number, codes: readonly number[]) => codes.every((c, i) => m.mem[at + i] === c);
check('the options menu text is in memory ("OPTIONS" in the game\'s own letters at $826B)', text(0x826b, [0x0f, 0x10, 0x14, 0x09, 0x0f, 0x0e]));
check('the picture changed to the menu (black paper in the first attribute rows)', m.mem[0x5800] === 0 && m.mem[0x4000] === 0);

// ---- a game
runTo(1900, holds);
check('a game is running in pseudo-room 44 ($2C), the opening scene', m.mem[0x9649] === 0x2c);
check('three lives', m.mem[0x964a] === 3);
check('score 00000', [0x9217, 0x9218, 0x9219, 0x921a, 0x921b].every((a) => m.mem[a] === 0));
check('Monty at x $D8, y $4F', m.mem[0x5c7b] === 0xd8 && m.mem[0x5c7c] === 0x4f);
check('the keyboard is the chosen control ($82A3 = 1)', m.mem[0x82a3] === 1);

// ---- the main loop's rate, from the saved state in room 0 (made by build/README.md)
const r = machineFrom(`${BUILD}/room0.state`);
r.cpu.iff1 = true;
r.cpu.iff2 = true;
const MAIN_LOOP = 0x943c, INTERRUPT_ROUTINE = 0x8f9f;
let passes = 0, interrupts = 0;
r.onStep = (pc) => { if (pc === MAIN_LOOP) passes++; else if (pc === INTERRUPT_ROUTINE) interrupts++; };
r.run(500);
check(`in room 0 the interrupt routine runs every frame (${interrupts} in 500)`, interrupts === 500);
check(`and the main loop every second frame, 25 passes a second (${passes} in 500)`, passes >= 247 && passes <= 250);

finish();
