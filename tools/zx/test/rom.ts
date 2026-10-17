/**
 * The Spectrum model running the real 48K ROM (fetched into games/moley/build/48.rom: see its README): the ROM
 * boots to its copyright line, the frame interrupt arrives once per frame (the ROM counts it in FRAMES), and the
 * keyboard works through the ROM's own scanning (J typed at the prompt makes the LOAD keyword).
 *
 *   nice -n 15 node tools/test.mjs tools/zx/test/rom.ts [rom-file]
 */
import { check, finish } from '../../../games/shared/test/check';
import { readRom, tap } from '../boot';
import { screenIndexes } from '../screen';
import { Spectrum } from '../spectrum';

const rom = readRom(process.argv[2]);
const m = new Spectrum(rom);
const FRAMES = 0x5c78, E_LINE = 0x5c59;

m.run(100);
const f0 = m.mem[FRAMES] | (m.mem[FRAMES + 1] << 8);
m.run(70);
const f1 = m.mem[FRAMES] | (m.mem[FRAMES + 1] << 8);
check(`the ROM counts one interrupt per frame (70 frames, FRAMES +70; was +${f1 - f0})`, f1 - f0 === 70);

m.run(10);
const px = screenIndexes(m.mem, false);
const lit = (y0: number, y1: number) => px.slice(y0 * 256, y1 * 256).filter((v) => v !== px[0]).length;
check('the copyright line is at the bottom of the screen, the rest of it blank', lit(176, 192) > 100 && lit(0, 176) === 0);
check('the screen is black ink on white paper, border white', m.mem[0x5800] === 0x38 && m.border === 7);

const eLine = () => m.mem[E_LINE] | (m.mem[E_LINE + 1] << 8);
check('nothing typed yet: the edit line is empty', m.mem[eLine()] === 0x0d || m.mem[eLine()] === 0x80);
tap(m, ['J']);
check('J pressed through the ROM keyboard scan: the LOAD keyword (token $EF) is in the edit line', m.mem[eLine()] === 0xef);

finish();
