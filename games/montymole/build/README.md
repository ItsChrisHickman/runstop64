# Wanted: Monty Mole: where the data comes from

The original is the **ZX Spectrum 48K** game (Gremlin Graphics, 29 July 1984; written by Peter M. Harrap). The C64 version
(Antony Crowther's, a different game that scrolls) is not what this port is made from.

The tape is the one on World of Spectrum,
[software id 0005617](https://worldofspectrum.org/software?id=0005617). Two files, the same game, byte for byte
in the code that loads:

| File | From | MD5 |
|---|---|---|
| `MONTY.TAP` (49411 bytes), in `Wanted-MontyMole.tap.zip` (26255 bytes, `3ecbbba4aef62ebafef1b68a1239833e`) | `https://www.worldofspectrum.org//pub/sinclair/games/w/Wanted-MontyMole.tap.zip` | `b0e0ce98a04c2372e679698f25fd56e1` |
| `Wanted - Monty Mole.tzx` (49476 bytes), in `Wanted-MontyMole.tzx.zip` (23108 bytes, `cd779c2379b1a920e3beeaccfb9dec67`), World of Spectrum's "Perfect TZX" original release | `https://www.worldofspectrum.org//pub/sinclair/games/w/Wanted-MontyMole.tzx.zip` | `3e8eb3d8f7d0d208d7eb65ae25f89ee5` |

(The zips also hold a screenshot and `MONTY.POK`, the pokes: infinite lives, no crushers, fall from any height,
invincibility. They are not used; they are useful as a cross-check of the game's routines, `re/README.md`.)

Both boot on `tools/zx`'s model with no patches and give identical memory (checked at the options menu and in play). It is the
original release: no trainer or crack menu, no cracker's intro; the only difference between the two files is that the TZX's
last block has ten more bytes after the data (so its parity byte is not where the ROM loader looks: our model's trap only
takes a block whose length and parity are right, so the **TAP is the one to use**; the loader ignores the carry, which is why
the TZX loads too). The tape has six blocks: a BASIC loader ("MONTY", 105 bytes: `CLEAR 24575`, colours, `LOAD "" CODE`, `RANDOMIZE USR 60000`),
a 100-byte CODE block "MOLE" at `$EA60`, and one headerless block (flag `$71`) of 49152 bytes loaded at `$4000`: the whole game,
with the title picture as its screen. The loader at `$EA60` is the only copy protection: it decrypts its own tail with the
R register and checks `$5C6B` (set by the BASIC line's `POKE 23659,0`) before it loads the game; the game block itself
is not encrypted. It then `RET`s into an address the game block has placed on the stack (`$5FE8` holds `$D290`), which is where the game
starts. Other copies tried: archive.org has only `.z80` snapshots of this game
(`zx_Wanted_Monty_Mole_1984_Gremlin_Graphics_Software`, MD5 `c5a70bab3456054e82c8482767829ae6`, and `..._a`, a cracked one) and a
Universal Tape Archive TAP set (`uta_Wanted_Monty_Mole_1984_Gremlin_Graphics_1707`); neither was needed. (archive.org's
`Monty_Mole_1984_Gremlin_*_cr_*.d64` files are the **C64** game, cracked: not this.)

**Nothing from the original is committed**: not the tape, not the 48K ROM, not the snapshots or dumps. Everything in this
directory except this file is ignored (`games/montymole/.gitignore`). What is committed is the data the port needs, extracted as
TypeScript (`src/data/rooms-data.ts` from `re/rooms.ts`). The originals live in `games/montymole/build/` of the main
checkout; a fresh clone makes them as below.

```bash
cd games/montymole/build
D=$(mktemp -d)                                   # downloads are data: look at them as bytes only
curl -L -o $D/m.zip "https://www.worldofspectrum.org//pub/sinclair/games/w/Wanted-MontyMole.tap.zip"
unzip -p $D/m.zip MONTY.TAP > montymole.tap
md5sum montymole.tap                             # b0e0ce98a04c2372e679698f25fd56e1
curl -L -o $D/z.zip "https://www.worldofspectrum.org//pub/sinclair/games/w/Wanted-MontyMole.tzx.zip"
unzip -p $D/z.zip "Wanted - Monty Mole.tzx" > montymole.tzx
md5sum montymole.tzx                             # 3e8eb3d8f7d0d208d7eb65ae25f89ee5
cp ../../moley/build/48.rom 48.rom               # the 48K ROM (Amstrad's, never committed); or fetch it as games/moley/build/README.md says
md5sum 48.rom                                    # 4c42a2f075212361c3117015b107ff68
cd ../../..
```

Then the images, the model and the states (every run `nice -n 15`; the model runs a frame in a few milliseconds):

```bash
# code.ram: the game block as the pristine 64K image (what the disassembler reads); loader.ram: the 100-byte loader
nice -n 15 node tools/test.mjs games/montymole/re/image.ts games/montymole/build/montymole.tap games/montymole/build
npx esbuild tools/zx/zxprobe.ts --bundle --platform=node --format=esm --outfile=/tmp/zxprobe.mjs
npx esbuild tools/zx/zxdis.ts --bundle --platform=node --format=esm --outfile=/tmp/zxdis.mjs
# loading.state: the title picture and tune (frame 600); title.state: the options menu (frame 1300; SPACE at 1000-1010 leaves the picture)
# play.state: key 1 (keyboard) at 1500, key 0 (play) at 1700: frame 1900 is the opening scene (pseudo-room 44, Monty at x $D8)
nice -n 15 node /tmp/zxprobe.mjs games/montymole/build/montymole.tap /tmp/montymole --rom games/montymole/build/48.rom --frames 1900 \
  --hold SPACE@1000-1010 --hold 1@1500-1510 --hold 0@1700-1710 \
  --save-state 600:games/montymole/build/loading.state --save-state 1300:games/montymole/build/title.state --save-state 1900:games/montymole/build/play.state \
  --dump 600:games/montymole/build/loading.ram --dump 1300:games/montymole/build/title.ram --dump 1900:games/montymole/build/play.ram --snap 600,1300,1900
# room0.state: the game in room 0 as it is after the opening scene (the bucket taken, the coal and the enemies live), 60 frames in
F=$(python3 -c "d=open('games/montymole/build/play.ram','rb').read();print(','.join('%x=%x'%(0x964d+i,d[0x964d+i]|0x80) for i in range(64)))")
nice -n 15 node tools/test.mjs games/montymole/re/poke.ts games/montymole/build/play.state 60 \
  --poke "9649=0,5c7b=18,5c7c=27,964b=18,964c=27,9bbe=2,9bd2=2,$F" --pc 940c --save games/montymole/build/room0.state
```

`*.state` are our own snapshot format (`tools/zx/snapshot.ts`, "ZXS1"); `*.ram` are flat 64K dumps (ROM included) for
`tools/zx/zxdis.ts`. The ROM is read through `ZX_ROM` or `games/montymole/build/48.rom` (the checks name it, `test/original.ts`).

The checks and what they compare are listed in `re/README.md`. Example runs:

```bash
nice -n 15 node tools/test.mjs games/montymole/test/rooms.ts [out-dir]    # the 21 rooms: the game's drawing against the data (PNGs of both into out-dir)
nice -n 15 node tools/test.mjs games/montymole/test/boot.ts               # the tape loads, the title, the options, a game starts
```
