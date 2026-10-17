/**
 * The 128K music, on a model with 128K paging and an AY chip (the game's own test finds the RAM, copies its player into bank 1 at
 * `$C000`, and its interrupt calls it): the player writes AY registers 0-10 every second frame (25 Hz), never touches the
 * envelope registers, and the 48K game never writes to the AY ports at all.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/music.ts [tape] [rom]
 */
import { check, finish } from '../../../games/shared/test/check';
import { bootedSpectrum, readRom, readTape, ROM_FILE, typeLoad } from '../../../tools/zx/boot';

const [tapeFile = 'games/moley/build/moley.tap', romFile = ROM_FILE] = process.argv.slice(2);
const rom = readRom(romFile);
const tape = readTape(tapeFile);

function run(ram128: boolean) {
  const m = bootedSpectrum(rom, ram128);
  m.tape = tape;
  typeLoad(m);
  m.ay.length = 0;
  m.run(1200);
  return m;
}

const m = run(true);
check('with 128K RAM the game finds it (flag $8112 set) and the music plays', m.mem[0x8112] !== 0 && m.ay.length > 1000);
const frames = [...new Set(m.ay.map((w) => w.frame))];
const gaps = frames.slice(1).map((f, i) => f - frames[i]);
check('the player runs every second frame: 25 times a second', gaps.length > 400 && gaps.filter((g) => g === 2).length >= gaps.length - 2);
const regs = new Set(m.ay.map((w) => w.reg));
check('it writes the tone, mixer and volume registers (0-5, 7-10; the noise period 6 comes later) and never the envelope (11-13)', [...regs].every((r) => r <= 10) && [0, 1, 2, 3, 4, 5, 7, 8, 9, 10].every((r) => regs.has(r)));
check('the mixer (register 7) is written with bit 7 set and bit 6 clear (the value the player uses for the port directions), every time', m.ay.filter((w) => w.reg === 7).every((w) => (w.value & 0xc0) === 0x80));

const m48 = run(false);
check('on a 48K machine ($8112 = 0) there is no music at all (the paging and AY ports are never written)', m48.mem[0x8112] === 0 && m48.ay.length === 0);

finish();
