# Moley Christmas: where the data comes from

The original is the Your Sinclair cover-tape release, **ZX Spectrum only** (Gremlin Graphics / Your Sinclair, 1987; Shaun
Hollingworth, Peter Harrap, Chris Kerry, with Teque Software Development; the credits page names Paul Jackson for the game
concept, P. Harrap for graphics and Benn Daglish for the 128K music). The tape is the one on World of Spectrum,
[software id 0003243](https://worldofspectrum.org/software?id=0003243), `MoleyChristmas.tap.zip`, which holds
`Moley Christmas.tap` (MD5 `c162e2e1a5df1df8f91127c4f16e1ce2`, 41521 bytes; the zip is `d4af95edb1c4fd9be9e42979792179f5`).
Four blocks: a BASIC loader ("Monty Free", 511 bytes, with a greeting to YS readers in its REMs) and one CODE block
`montycode`, 40960 bytes loaded at `$6000`, started by `RANDOMIZE USR 33024` (`$8100`). It loads with the ROM's own loader
(no turbo loader), so the model traps the ROM's `LD-BYTES` and hands the blocks over.
(archive.org has only a `.z80` snapshot of it, `zx_Moley_Christmas_1987_Gremlin_Graphics_Software_Your_Sinclair`, MD5
`3a40c5f27fb88a7f36553d75e059d732`; not used.)

**Nothing from the original is committed**: not the tape, not the 48K ROM, not the snapshots or dumps. Everything in this
directory except this file is ignored (`games/moley/.gitignore`). The originals live in `games/moley/build/` of the main
checkout; a fresh clone makes them as below.

The headless Spectrum (`tools/zx`) needs the 48K ROM, which is Amstrad's and is fetched here, never committed. It comes
from the Fuse emulator's source tree (`roms/48.rom`, 16384 bytes, MD5 `4c42a2f075212361c3117015b107ff68`; JSSpeccy 3's
`static/roms/48.rom` is the same file). The Z80 exerciser suites (`zexdoc.com`, `zexall.com`, 8704 bytes each, MD5
`be3691b6b910d2c2e05e194cd529e45c` and `4a32f2a6691b3da5213d7688dda59822`) come from the z80emu project's `testfiles`.

```bash
cd games/moley/build
D=$(mktemp -d)                                   # downloads are data: look at them as bytes only
curl -L -o $D/m.zip "https://www.worldofspectrum.org//pub/sinclair/games/m/MoleyChristmas.tap.zip"
md5sum $D/m.zip                                  # d4af95edb1c4fd9be9e42979792179f5
unzip -p $D/m.zip "Moley Christmas.tap" > moley.tap
md5sum moley.tap                                 # c162e2e1a5df1df8f91127c4f16e1ce2
curl -L -o 48.rom "https://raw.githubusercontent.com/fuse-emulator/fuse/master/roms/48.rom"
md5sum 48.rom                                    # 4c42a2f075212361c3117015b107ff68
curl -L -o zexdoc.com "https://raw.githubusercontent.com/anotherlin/z80emu/master/testfiles/zexdoc.com"
curl -L -o zexall.com "https://raw.githubusercontent.com/anotherlin/z80emu/master/testfiles/zexall.com"
cd ../../..
```

Then the model, the states and the dumps (every run `nice -n 15`; the model runs about 200 million T-states a second, so a
frame is a few milliseconds):

```bash
npx esbuild tools/zx/zxprobe.ts --bundle --platform=node --format=esm --outfile=/tmp/zxprobe.mjs
npx esbuild tools/zx/zxdis.ts --bundle --platform=node --format=esm --outfile=/tmp/zxdis.mjs
# LOAD "" is typed by the probe; the credits page (with its scroller) is up by frame ~700, waiting for a jump key.
# title.state: the credits page at frame 1500.  play.state: SPACE at 1600-1604 starts a game; frame 1700 is Monty in room 0.
nice -n 15 node /tmp/zxprobe.mjs games/moley/build/moley.tap /tmp/moley --frames 1700 --hold SPACE@1600-1604 \
  --save-state 1500:games/moley/build/title.state --save-state 1700:games/moley/build/play.state \
  --dump 1500:games/moley/build/title.ram --dump 1700:games/moley/build/play.ram --snap 1500,1700
# code.ram: the tape's code block as the game's pristine 64K image (what the disassembler reads)
nice -n 15 node tools/test.mjs games/moley/re/image.ts games/moley/build/moley.tap games/moley/build/code.ram
```

The game in each room, for watching its script (`room0.state` to `room6.state`; `room5-arrive.state` enters room 5 the way the game does):

```bash
STATES=games/moley/build nice -n 15 node tools/test.mjs games/moley/re/shots.ts games/moley/build/play.state /tmp/moley-rooms 0,1,2,3,4,5,6 30
cp games/moley/build/room5.state /tmp/r5.state    # (the plain room 5 first: the next line overwrites it)
AT=9c37 STATES=games/moley/build nice -n 15 node tools/test.mjs games/moley/re/shots.ts games/moley/build/play.state /tmp/moley-r5 5 40
mv games/moley/build/room5.state games/moley/build/room5-arrive.state && cp /tmp/r5.state games/moley/build/room5.state
```

`*.state` are our own snapshot format (`tools/zx/snapshot.ts`, "ZXS1": CPU, ULA, frame counter, keys, the 48K of RAM, no ROM);
`*.ram` are flat 64K dumps (ROM included) for `tools/zx/zxdis.ts`. `coverage.map` is what `re/profile.ts` has seen run
(`MAP=games/moley/build/coverage.map`; `zxdis.ts ... --map` lists only that code).

The checks and what they compare are listed in `re/README.md`. Example runs:

```bash
nice -n 15 node tools/test.mjs tools/zx/test/cpu.ts                       # no files: T-states, flags, interrupts, lengths
nice -n 15 node tools/test.mjs tools/zx/test/machine.ts                   # no files: ports, tape, screen, snapshot
nice -n 15 node tools/test.mjs tools/zx/test/rom.ts                       # needs 48.rom
nice -n 15 node tools/test.mjs tools/zx/test/zex.ts games/moley/build/zexdoc.com   # about 8 minutes; zexall.com the same
nice -n 15 node tools/test.mjs games/moley/test/boot.ts                   # needs the tape and the ROM
```
