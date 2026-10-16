# c64probe

Boots a C64 game far enough to study it, using c64kit's 6502 core plus a
minimal C64 around it: memory banking, a KERNAL/BASIC stand-in (screen and
I/O init, LOAD, serial-bus reads served from a .d64, RUN → SYS, reset into a
cartridge), VIC raster and CIA timer interrupts, joystick and keyboard.

It then renders what the VIC shows (hi-res, multicolour and bitmap modes,
sprites), the charset and every sprite in the bank as PNGs, and writes a
report: interrupt entry points, hot code addresses, KERNAL calls, and VIC
register writes by raster line (to see screen splits).

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
node /tmp/probe.mjs game.prg out/ --disk game.d64 --frames 2000 \
  --snap 700,1500 --fire 1000,1300 --hold right@1400-1800,left@1900-2300
```

Not an emulator: no cycle accuracy, no real disk drive, no sound output. It
exists to find a game's data and code for porting, and to run the original
as a reference.
