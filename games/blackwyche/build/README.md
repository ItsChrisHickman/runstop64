# Building the Blackwyche game image

`assets/blackwyche-title.state` is a snapshot of the original game taken at
its title screen, made with `tools/probe` from `Blackwyche_1985_Ultimate.d64`
on archive.org, with `patch.json` applied once it has unpacked itself: that
copy's title says "COPYRIGHT ARMATI 1985", so the original line ("COPYRIGHT
A=C=G= 1985", as in the CCGG copy; `=` is a dot in the game's font) is put
back, in the text and on the screen. That image also lacks $F800-$FBFF (the RAM there is still
the power-on pattern): rooms $C and $D (deck 5's doors 1 and 3, the captain's cabin and the
sextant's), the end of room $17's code (the fourth piece of map) and so the sextant and that
piece. `patch.json` puts the kilobyte back from the CCGG copy
(`Blackwyche_1985_Ultimate_cr_CCGG.d64`, unpacked and started: every other byte of code and data
there is the same as this image's). Checked by `test/rooms.ts`: every room's block runs natively.

```bash
node /tmp/probe.mjs out/BLACK_WYCHE.prg /tmp/blackwyche --disk game.d64 --frames 1320 \
  --patch games/blackwyche/build/patch.json --patch-frame 1250 \
  --save-state 1310:games/blackwyche/assets/blackwyche-title.state
```
